import { Capacitor } from "@capacitor/core";
import { cacheBustUrl } from "~/composables/jp/useJpBuildId";
import {
  offlineTtsInstalled,
  refreshOfflineTtsStatus,
  synthesizeOffline,
} from "~/composables/jp/useJpTts";

let audioCtx: AudioContext | null = null;
let lastTypingTime = 0;

function ensureAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

/* ============ 打字音效 ============ */
export function playTypingSound() {
  const now = Date.now();
  if (now - lastTypingTime < 22) return;
  lastTypingTime = now;
  try {
    const ctx = ensureAudioCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.025);
    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.035);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(4800, t);
    gain2.gain.setValueAtTime(0.14, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.02);
  } catch {}
}

/* ============ 跳错音效 ============ */
export function playJumpSound() {
  try {
    const ctx = ensureAudioCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1600, t);
    osc.frequency.exponentialRampToValueAtTime(2400, t + 0.08);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  } catch {}
}

/* ============ 成功音效 ============ */
export function playSuccessSound() {
  try {
    const ctx = ensureAudioCtx();
    const t = ctx.currentTime;
    [1500, 2200].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = t + i * 0.07;
      gain.gain.setValueAtTime(0.38, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    });
  } catch {}
}

/* ============ 错误音效 ============ */
export function playErrorSound() {
  try {
    const ctx = ensureAudioCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.15);
    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  } catch {}
}

/* ============================================================
   日语发音 —— 优先播放预生成的讯飞音频；
   没有音频时依次退回：内置离线引擎（装了模型）→ 系统 TTS → 浏览器 TTS
   ============================================================ */

// 音频静态目录。若以后把音频挪到自托管服务器，改这里即可（如 https://api.jplingo.cn/audio）
const AUDIO_BASE = "/audio";

let manifest: Record<string, string> | null = null;
let manifestPromise: Promise<Record<string, string> | null> | null = null;
let audioEl: HTMLAudioElement | null = null;

// 懒加载 public/audio/manifest.json（kana → 文件名），失败返回 null
function loadManifest(): Promise<Record<string, string> | null> {
  if (manifest) return Promise.resolve(manifest);
  if (!manifestPromise) {
    manifestPromise = fetch(cacheBustUrl(`${AUDIO_BASE}/manifest.json`))
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((m) => {
        manifest = m && typeof m === "object" ? (m as Record<string, string>) : null;
        return manifest;
      });
  }
  return manifestPromise;
}

// 与生成脚本保持一致：去掉所有空白后的假名串作为查表键
function normalizeKey(text: string): string {
  return text.replace(/\s+/g, "");
}

function ensureAudioEl(): HTMLAudioElement {
  if (!audioEl) audioEl = new Audio();
  return audioEl;
}

/* ---- 兜底：浏览器自带 TTS ---- */

// 优先级列表：越靠前越优先
const PREFERRED_VOICES = [
  "Microsoft Nanami Online (Natural) - Japanese (Japan)",
  "Microsoft Keita Online (Natural) - Japanese (Japan)",
  "Microsoft Aoi Online (Natural) - Japanese (Japan)",
  "Microsoft Daichi Online (Natural) - Japanese (Japan)",
  "Microsoft Mayu Online (Natural) - Japanese (Japan)",
  "Microsoft Shiori Online (Natural) - Japanese (Japan)",
  "Microsoft Ichiro Online (Natural) - Japanese (Japan)",
  "Microsoft Nanami Online",
  "Microsoft Keita Online",
  "Microsoft Aoi Online",
  "Google 日本語",
  "Google Japanese",
  "Kyoko",
  "Otoya",
  "Hattori",
];

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickBestJapaneseVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const jaVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("ja"));
  if (jaVoices.length === 0) return null;

  for (const name of PREFERRED_VOICES) {
    const match = jaVoices.find((v) => v.name === name || v.name.includes(name));
    if (match) {
      cachedVoice = match;
      return match;
    }
  }

  const natural = jaVoices.find(
    (v) =>
      v.name.toLowerCase().includes("natural") ||
      v.name.toLowerCase().includes("online"),
  );
  if (natural) {
    cachedVoice = natural;
    return natural;
  }

  cachedVoice = jaVoices[0];
  return cachedVoice;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickBestJapaneseVoice();
  };
}

function speakViaWebSpeech(text: string, rate: number) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  speechSynthesis.cancel();

  const utt = new SpeechSynthesisUtterance(text);
  const voice = pickBestJapaneseVoice();
  if (voice) {
    utt.voice = voice;
    utt.lang = voice.lang;
  } else {
    utt.lang = "ja-JP";
  }

  utt.rate = rate;
  utt.pitch = 1.0;
  utt.volume = 1.0;
  speechSynthesis.speak(utt);
}

/**
 * 原生端兜底：Capacitor WebView 里 speechSynthesis 往往拿不到日语语音，
 * 改用系统 TTS（@capacitor-community/text-to-speech）。返回是否成功发声。
 *
 * 注意：安卓端 setLanguage() 的返回值被插件忽略，系统缺日语语音数据时
 * speak() 会「静默无声」而不是报错，所以这里先探测语言可用性：
 * ja-JP 不可用则退到 ja，两者都不可用就引导用户安装语音数据。
 */
let ttsInstallPrompted = false;

async function promptTtsInstallOnce(tts: {
  openInstall: () => Promise<void>;
}): Promise<void> {
  if (ttsInstallPrompted) return;
  ttsInstallPrompted = true;
  try {
    console.warn(
      "[jplingo] 系统 TTS 缺少日语语音：已尝试打开语音数据安装界面（也可在 系统设置 → 文字转语音 → 安装日语数据）。",
    );
    await tts.openInstall();
  } catch {
    /* 仅 Android 有效，其它平台忽略 */
  }
}

async function speakViaNativeTts(text: string, rate: number): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { TextToSpeech } = await import("@capacitor-community/text-to-speech");

    let lang = "ja-JP";
    try {
      const jaJp = await TextToSpeech.isLanguageSupported({ lang: "ja-JP" });
      if (!jaJp?.supported) {
        const ja = await TextToSpeech.isLanguageSupported({ lang: "ja" });
        if (ja?.supported) {
          lang = "ja";
        } else {
          await promptTtsInstallOnce(TextToSpeech);
          return false;
        }
      }
    } catch {
      /* 探测失败（引擎未初始化等）时直接尝试合成 */
    }

    await TextToSpeech.stop();
    await TextToSpeech.speak({
      text,
      lang,
      rate,
      pitch: 1.0,
      volume: 1.0,
      category: "playback",
    });
    return true;
  } catch (err) {
    console.warn("[jplingo] 系统 TTS 合成失败：", err);
    return false;
  }
}

/**
 * 内置离线引擎（sherpa-onnx + Supertonic-3）：合成到本地 WAV 再播放。
 * 只有装了模型（「我的」页下载）才会真正发声，否则立刻返回 false 交给系统 TTS。
 * 导出给「我的」页试听用。
 */
export async function speakOfflineNow(text: string, rate = 1.0): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const path = await synthesizeOffline(text, rate);
  if (!path) return false;
  try {
    const el = ensureAudioEl();
    // 本地 WAV 走 Capacitor 的 file:// 转换地址；语速已在合成时生效，不再二次变速
    el.src = Capacitor.convertFileSrc(path);
    el.playbackRate = 1;
    el.currentTime = 0;
    await el.play();
    return true;
  } catch (err) {
    console.warn("[jplingo] 离线语音播放失败：", err);
    return false;
  }
}

/** 兜底发声：离线引擎（装了模型才有）→ 原生系统 TTS（APK）→ 浏览器 TTS（网页） */
async function speakFallback(text: string, rate: number): Promise<SpeakSource> {
  if (await speakOfflineNow(text, rate)) return "offline";
  if (await speakViaNativeTts(text, rate)) return "system-tts";
  speakViaWebSpeech(text, rate);
  return "web-speech";
}

/**
 * 发音实际走了哪条路。
 * - audio：预生成音频（最好）
 * - offline：内置离线引擎
 * - system-tts：系统 TTS（安卓缺日语音色时会「静默无声」）
 * - web-speech：浏览器 TTS（WebView 里通常拿不到日语语音）
 * - none：过期回退（用户已经点了别的句子）
 */
export type SpeakSource = "audio" | "offline" | "system-tts" | "web-speech" | "none";

/**
 * 该不该建议用户去下载内置语音：原生端 + 没装模型 + 这一句没能靠音频/离线引擎出声。
 * 安卓缺日语音色时系统 TTS 不报错也不出声，用户只会觉得「点了没反应」，所以必须给提示。
 */
export function shouldSuggestOfflineEngine(source: SpeakSource): boolean {
  if (offlineTtsInstalled.value) return false;
  if (!Capacitor.isNativePlatform()) return false;
  return source === "system-tts" || source === "web-speech" || source === "none";
}

// 原生端启动时探一次离线引擎状态：装了模型就顺手预热，首次发音不必等模型加载
if (typeof window !== "undefined") {
  try {
    if (Capacitor.isNativePlatform()) refreshOfflineTtsStatus().catch(() => {});
  } catch {
    /* 桥未就绪时忽略，发音时会再探一次 */
  }
}

/**
 * 预合成：考点在于「内置引擎合成一句要几秒」（实测桌面 RTF≈0.32，手机更慢），
 * 如果等用户点发音才合成，长句会有好几秒静默。这里在切到下一题时就先把下一句合成好，
 * 等真要播放时直接命中缓存。
 *
 * 有预生成音频的句子不需要合成（mp3 是静态文件），没装模型时 synthesizeOffline 内部会直接返回。
 */
export function prefetchJapanese(text: string) {
  if (!text) return;
  if (typeof window === "undefined") return;
  if (!Capacitor.isNativePlatform()) return;
  loadManifest()
    .then(() => {
      if (manifest?.[normalizeKey(text)]) return;
      synthesizeOffline(text);
    })
    .catch(() => {});
}

// 每次发音一个序号：过期的回退（例如上一句的错误回调）不再发声，也避免
// mp3 播放失败时「error 事件 + play() 拒绝」两条回退路径各合成一遍
let speakToken = 0;

/**
 * 日语发音
 * 优先级：预生成音频（音质最好）→ 内置离线引擎（离线、无需系统日语音色）
 *        → 系统 TTS（原生 App）→ 浏览器 TTS（网页）
 * @param text 要发音的文本（假名或句子）
 * @param rate 语速（音频按 playbackRate 播放；TTS 走自身语速参数）
 * @returns 实际走的哪条路（调用方可据此决定是否提示去下载内置语音）
 */
export function speakJapanese(text: string, rate = 1.0): Promise<SpeakSource> {
  if (!text) return Promise.resolve("none");
  if (typeof window === "undefined") return Promise.resolve("none");

  const token = ++speakToken;
  return new Promise<SpeakSource>((resolve) => {
    let handled = false;
    const fallbackOnce = async () => {
      if (handled) return;
      handled = true;
      // 过期回退（用户已经点了别的句子）不再发声
      if (token !== speakToken) {
        resolve("none");
        return;
      }
      resolve(await speakFallback(text, rate));
    };

    const key = normalizeKey(text);
    loadManifest()
      .then(() => {
        const file = manifest?.[key];
        if (file) {
          const el = ensureAudioEl();
          el.src = `${AUDIO_BASE}/${file}`;
          el.playbackRate = rate;
          el.currentTime = 0;
          el.addEventListener("error", fallbackOnce, { once: true });
          el.play().then(() => resolve("audio")).catch(fallbackOnce);
        } else {
          fallbackOnce();
        }
      })
      .catch(fallbackOnce);
  });
}

/**
 * 获取当前使用的语音名称（用于诊断）
 */
export function getCurrentVoiceName(): string {
  const v = pickBestJapaneseVoice();
  return v ? v.name : "(未找到日语语音)";
}
