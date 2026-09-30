import { ref } from "vue";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import type { ProgressStatus } from "@capacitor/filesystem";
import { apkDownloadCandidates } from "./useJpApkDownload";

/* ============================================================
   离线日语发音引擎（sherpa-onnx + Supertonic-3 int8）—— 前端封装

   原生侧：android/app/src/main/java/com/jplingo/app/JpTtsPlugin.java
   （Capacitor 插件名 JpTts，已在 MainActivity 注册）

   - 运行时（libonnxruntime.so 等）随 APK 打包；语言模型约 123MB 不打进 APK，
     由用户在「我的」页点按钮下载 → installModel() 解压到 filesDir/tts-ja（解压一次，之后永久离线可用）
   - 下载走 @capacitor/filesystem 的原生下载（不经 WebView，无 CORS 限制），带进度事件；
     地址默认官方 GitHub Release，并叠加「加速镜像」（与 APK 下载共用同一套前缀），
     也可由页面传入 NUXT_TTS_MODEL_URL 覆盖为自托管地址（如 https://api.jplingo.cn/tts/xxx.tar.bz2）
   - 状态放在模块级：下载中切页/返回不丢进度；工具函数可直接在非 setup 语境调用
     （发音链 useJpSound 就是这么用的）
   ============================================================ */

// 模型包落在 Directory.Data（= Android filesDir），与原生插件读取的目录一致
export const TTS_ARCHIVE_NAME = "tts-model.tar.bz2";
export const TTS_MODEL_DIR = "tts-ja";
// sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2 的精确大小
// （2026-10-01 实测：官方直连与 gh-proxy 镜像下载均为该字节数，sha256 = 82fa96f9…c427，
//   与 GitHub Release API 的 digest 一致；解压后 145,325,056 B）
export const TTS_MODEL_BYTES = 128774318;
// 试听文本（纯假名，避免依赖模型对汉字的处理）
export const TTS_TEST_TEXT = "こんにちは、にほんごのおんせいです。";
// 语者（Supertonic-3 日语共 10 个语者，0–9）
export const TTS_DEFAULT_SID = 0;

export const TTS_MODEL_URL_DEFAULT =
  "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2";

interface JpTtsPlugin {
  isReady(): Promise<{ ready: boolean; modelDir: string }>;
  installModel(options: { archive?: string }): Promise<{ ok: boolean; files: number }>;
  prepare(): Promise<{ ok: boolean }>;
  speak(options: { text: string; speed?: number; sid?: number }): Promise<{ path: string }>;
  release(): Promise<void>;
}

const JpTts = registerPlugin<JpTtsPlugin>("JpTts");

// 模块级单例状态：切页/返回时下载进度不丢
const supported = ref(false);
const installed = ref(false);
const downloading = ref(false);
const installing = ref(false);
const progress = ref(0);
const receivedBytes = ref(0);
const error = ref("");

let statusChecked = false;
let statusPromise: Promise<boolean> | null = null;
let preparePromise: Promise<void> | null = null;

function describe(err: unknown): string {
  if (!err) return "未知错误";
  const e = err as { message?: string; errorMessage?: string };
  return e.message || e.errorMessage || String(err);
}

// 只有「装了带 JpTts 插件的 Android APK」才可用；网页端 / 旧版 APK 一律当作不可用
function detectSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!Capacitor.isNativePlatform()) return false;
  if (Capacitor.getPlatform() !== "android") return false;
  try {
    return Capacitor.isPluginAvailable("JpTts");
  } catch {
    return false;
  }
}

function onProgress(p: ProgressStatus) {
  receivedBytes.value = p.bytes || 0;
  progress.value = Math.min(0.999, receivedBytes.value / TTS_MODEL_BYTES);
}

async function removeArchive(): Promise<void> {
  try {
    await Filesystem.deleteFile({ path: TTS_ARCHIVE_NAME, directory: Directory.Data });
  } catch {
    /* 不存在就算了 */
  }
}

/** 预热：加载模型（首次约数百毫秒～数秒），失败不影响后续发音 */
export function warmUpOfflineTts(): Promise<void> {
  if (!installed.value) return Promise.resolve();
  if (preparePromise) return preparePromise;
  preparePromise = JpTts.prepare()
    .then(() => undefined)
    .catch((err) => {
      console.warn("[jplingo] 离线语音预热失败：", err);
    });
  return preparePromise;
}

/** 查询插件/模型状态（幂等，结果缓存；force=true 强制重查） */
export function refreshOfflineTtsStatus(force = false): Promise<boolean> {
  if (!detectSupported()) {
    supported.value = false;
    installed.value = false;
    statusChecked = true;
    return Promise.resolve(false);
  }
  supported.value = true;
  if (!force && statusPromise) return statusPromise;
  statusPromise = (async () => {
    try {
      const r = await JpTts.isReady();
      installed.value = !!r?.ready;
      statusChecked = true;
    } catch (err) {
      console.warn("[jplingo] 离线语音状态检查失败：", err);
      // 探测失败（桥还没就绪、瞬时异常）绝不能缓存：
      // 否则 statusChecked 变 true + supported 变 false 会把整场会话钉死在「不支持/未安装」，
      // 「我的」页连下载按钮都不显示，用户就永远装不上模型 → 一直没声音。
      installed.value = false;
      statusChecked = false;
      statusPromise = null;
      return false;
    }
    if (installed.value) warmUpOfflineTts();
    return installed.value;
  })();
  return statusPromise;
}

// 已合成过的音频：(sid|语速|文本) → cacheDir/tts 下的绝对路径。
// 原生侧按 md5(text|sid|speed) 命名并写进 cacheDir/tts，重复发音直接复用，省掉几秒合成。
const audioCache = new Map<string, string>();

// 原生合成必须串行：JpTtsPlugin 里是同一个 OfflineTts 实例，并发调用既不安全，
// 也会让同一句话的两个线程去写同一个 md5 文件。release() 也走这条队列，避免合成中途释放。
let nativeQueue: Promise<unknown> = Promise.resolve();
function serializeNative<T>(fn: () => Promise<T>): Promise<T> {
  const run = nativeQueue.then(fn, fn);
  nativeQueue = run.catch(() => undefined);
  return run;
}

/** 是否正在原生合成（「试听」/发音按钮可以据此显示「合成中…」） */
export const synthesizing = ref(0);

/** 上一次原生合成的耗时（真机上唯一能拿到的性能数据，用来决定 num_steps 等参数） */
export const lastSynth = ref<{ text: string; ms: number } | null>(null);

// 同一句正在合成中的任务：并发请求共用一次原生合成。
// 真实场景：mp3 播放失败时 error 事件与 play() 拒绝会各触发一次回退，同一句会被请求两次。
const inflight = new Map<string, Promise<string | null>>();

/**
 * 合成一句话，返回本地 WAV 绝对路径（失败返回 null）。
 * 作为发音链里「预生成音频」之后的兜底，见 useJpSound.speakJapanese。
 */
export async function synthesizeOffline(
  text: string,
  rate = 1.0,
  sid = TTS_DEFAULT_SID,
): Promise<string | null> {
  if (!text) return null;
  const ready = statusChecked ? installed.value : await refreshOfflineTtsStatus();
  if (!ready) return null;

  const key = `${sid}|${rate}|${text}`;
  const cached = audioCache.get(key);
  if (cached) {
    // 系统可能清过缓存目录，命中也要确认文件还在
    const name = cached.slice(cached.lastIndexOf("/") + 1);
    try {
      await Filesystem.stat({ path: `tts/${name}`, directory: Directory.Cache });
      return cached;
    } catch {
      audioCache.delete(key);
    }
  }

  const running = inflight.get(key);
  if (running) return running;

  const task = (async () => {
    synthesizing.value++;
    try {
      const r = await serializeNative(async () => {
        const t0 = Date.now();
        const res = await JpTts.speak({ text, speed: rate, sid });
        // 只统计原生合成本身（不含排队等待），手机上诊断用
        lastSynth.value = { text, ms: Date.now() - t0 };
        return res;
      });
      const path = r?.path || null;
      if (path) audioCache.set(key, path);
      return path;
    } catch (err) {
      console.warn("[jplingo] 离线合成失败：", err);
      // 手机上没有控制台，「我的」页那张卡片是唯一能看到原生报错的地方
      error.value = `合成失败：${describe(err)}`;
      return null;
    } finally {
      synthesizing.value--;
      inflight.delete(key);
    }
  })();
  inflight.set(key, task);
  return task;
}

/** 下载模型包并解压安装；返回是否安装成功 */
export async function downloadOfflineTtsModel(url = TTS_MODEL_URL_DEFAULT): Promise<boolean> {
  if (downloading.value) return false;
  if (!detectSupported()) {
    error.value = "当前环境不支持离线语音（仅安卓 App 可用）";
    return false;
  }
  supported.value = true;
  downloading.value = true;
  installing.value = false;
  error.value = "";
  progress.value = 0;
  receivedBytes.value = 0;

  try {
    // 加速镜像在前、官方直连兜底（与 APK 下载共用同一套前缀）
    const candidates = apkDownloadCandidates(url);
    let lastError = "";
    for (const candidate of candidates) {
      try {
        await removeArchive();
        const handle = await Filesystem.addListener("progress", onProgress);
        try {
          await Filesystem.downloadFile({
            url: candidate,
            path: TTS_ARCHIVE_NAME,
            directory: Directory.Data,
            progress: true,
          });
        } finally {
          await handle.remove();
        }
        const stat = await Filesystem.stat({
          path: TTS_ARCHIVE_NAME,
          directory: Directory.Data,
        });
        const size = Number(stat?.size || 0);
        // Capacitor 原生下载只按字节流写文件、不校验 content-length（见
        // @capacitor/filesystem/android 的 doDownloadInBackground），被截断也会「成功」，
        // 所以这里必须自己比对：小于官方字节数一律判失败并换下一个地址。
        if (size < TTS_MODEL_BYTES) {
          throw new Error(`文件不完整（${size} / ${TTS_MODEL_BYTES} 字节）`);
        }
        lastError = "";
        break;
      } catch (err) {
        lastError = describe(err);
        console.warn("[jplingo] 离线语音下载失败，换下一个地址：", candidate, err);
      }
    }
    if (lastError) {
      error.value = `下载失败：${lastError}`;
      await removeArchive();
      return false;
    }

    progress.value = 1;
    installing.value = true;
    await JpTts.installModel({ archive: TTS_ARCHIVE_NAME });
    await refreshOfflineTtsStatus(true);
    if (!installed.value) {
      error.value = "解压后模型文件不完整，请重试";
      return false;
    }
    warmUpOfflineTts();
    return true;
  } catch (err) {
    error.value = `安装失败：${describe(err)}`;
    return false;
  } finally {
    downloading.value = false;
    installing.value = false;
  }
}

/** 删除已下载的模型（释放约 123MB），回到未安装状态 */
export async function deleteOfflineTtsModel(): Promise<boolean> {
  error.value = "";
  try {
    try {
      // 走同一条串行队列：别在合成进行到一半时释放 OfflineTts
      await serializeNative(() => JpTts.release());
    } catch {
      /* 未加载时忽略 */
    }
    try {
      await Filesystem.rmdir({ path: TTS_MODEL_DIR, directory: Directory.Data, recursive: true });
    } catch {
      /* 不存在时忽略 */
    }
    await removeArchive();
    preparePromise = null;
    await refreshOfflineTtsStatus(true);
    return !installed.value;
  } catch (err) {
    error.value = `删除失败：${describe(err)}`;
    return false;
  }
}

/** 供页面使用的响应式状态与方法集合（页面 setup 里调用即可） */
export function useJpTts() {
  return {
    supported,
    installed,
    downloading,
    installing,
    progress,
    receivedBytes,
    error,
    synthesizing,
    lastSynth,
    refreshStatus: refreshOfflineTtsStatus,
    warmUp: warmUpOfflineTts,
    synthesize: synthesizeOffline,
    downloadModel: downloadOfflineTtsModel,
    deleteModel: deleteOfflineTtsModel,
  };
}

/** 下载进度百分比（0–100），供 UI 显示 */
export function ttsPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}
