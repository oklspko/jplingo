import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { computed, ref } from "vue";
import {
  APPLIED_FILE,
  DATA_DIR,
  fetchBundledManifest,
  readAppliedManifest,
  readCachedBytes,
} from "~/composables/jp/useJpData";
import {
  base64ToBytes,
  formatBytes,
  normalizeEol,
  planUpdate,
  sha256Hex,
  shortVersion,
  type DataManifest,
  type UpdatePlan,
  verifyAgainstCache,
  verifySize,
} from "~/utils/jpDataPack";

/**
 * 课程数据热更新。
 *
 * 流程：下载远端 manifest → 与「已应用清单 / 内置清单」比对 → 只下载变化的文件
 *      → 校验 size（必做）+ sha256（≤ 8MB 的文件）→ 写入 Directory.Data/jp-data/
 *      → 最后写 _applied.json（索引课程包文件也排在最后，避免切到还没下完的课）。
 *
 * 原生端全程用 `Filesystem.downloadFile`（原生 HTTP），因此**不受 CORS 限制**——
 * 这点很关键：www.jplingo.cn 不返回 Access-Control-Allow-Origin，WebView 里 fetch 会被拦。
 *
 * 任何一步失败都保留旧数据与旧版本号，读取层会继续用缓存或内置数据。
 */

const LS_VERSION = "jp-data-version";
const LS_CHECKED_AT = "jp-data-checked-at";

/** 单文件做 sha256 校验的大小上限（更大的只校验 size，避免把几十 MB 读进内存） */
const HASH_LIMIT = 8 * 1024 * 1024;

export const dataUpdating = ref(false);
export const dataChecking = ref(false);
export const dataProgress = ref({ done: 0, total: 0, bytes: 0, bytesTotal: 0 });
export const dataError = ref("");
export const dataInfo = ref("");
export const hasDataUpdate = ref(false);
export const remoteVersion = ref("");
export const remoteGeneratedAt = ref("");
export const pendingBytes = ref(0);
export const currentVersion = ref("");
export const lastCheckedAt = ref("");

function remoteBase(): string {
  const config = useRuntimeConfig();
  return String(config.public.dataBaseUrl || "").replace(/\/+$/, "");
}

export function remoteManifestUrl(): string {
  const base = remoteBase();
  return base ? `${base}/data/manifest.json` : "/data/manifest.json";
}

function rememberCheck() {
  const now = new Date().toISOString();
  lastCheckedAt.value = now;
  try {
    localStorage.setItem(LS_CHECKED_AT, now);
  } catch {
    /* 忽略隐私模式等异常 */
  }
}

function rememberVersion(version: string) {
  currentVersion.value = version;
  try {
    localStorage.setItem(LS_VERSION, version);
  } catch {
    /* 忽略 */
  }
}

/** 记录「已应用到哪一版」：写 _applied.json（供下次比对文件集）+ localStorage（快、抗读失败） */
async function rememberApplied(manifest: DataManifest): Promise<void> {
  rememberVersion(manifest.version);
  try {
    await ensureDir(DATA_DIR);
    await Filesystem.writeFile({
      path: APPLIED_FILE,
      directory: Directory.Data,
      data: JSON.stringify(manifest),
      recursive: true,
    });
  } catch (err) {
    // 写不进去也不影响使用：下次检查会用缓存内容逐文件复核，不会再重复提示
    console.warn("[jp-data] 写入更新记录失败：", err);
  }
}

/** 确保目录存在。
 * Capacitor 的 `downloadFile` **没有 recursive 选项、也不会创建父目录**
 * （插件源码里只有显式 mkdir 会 mkdirs），所以首次运行时直接往 `jp-data/...` 下载必定失败。
 */
async function ensureDir(path: string): Promise<void> {
  try {
    await Filesystem.mkdir({ path, directory: Directory.Data, recursive: true });
  } catch {
    // 已存在（或并发创建）时插件会抛错，忽略即可
  }
}

function parentDir(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? DATA_DIR : `${DATA_DIR}/${path.slice(0, i)}`;
}

/** 下载远端 manifest：原生走 Filesystem（不受 CORS），网页直接 fetch */
async function fetchRemoteManifest(): Promise<{ manifest?: DataManifest; error?: string }> {
  const url = remoteManifestUrl();
  if (!Capacitor.isNativePlatform()) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return { error: `清单返回 HTTP ${res.status}` };
      return { manifest: (await res.json()) as DataManifest };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
  const target = `${DATA_DIR}/_remote-manifest.json`;
  try {
    await ensureDir(DATA_DIR); // ← 关键：先建目录，否则 downloadFile 必失败
    await Filesystem.downloadFile({ url, path: target, directory: Directory.Data });
    const res = await Filesystem.readFile({ path: target, directory: Directory.Data });
    if (typeof res.data !== "string") return { error: "清单文件读取为空" };
    const parsed = JSON.parse(new TextDecoder().decode(base64ToBytes(res.data))) as DataManifest;
    if (!parsed?.files?.length) return { error: "清单内容异常（没有文件列表）" };
    return { manifest: parsed };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/** 只检查，不下载 */
export async function checkDataUpdate(force = false): Promise<UpdatePlan | null> {
  if (!Capacitor.isNativePlatform()) return null; // 网页每次都是最新的，不需要
  if (dataChecking.value || dataUpdating.value) return null;
  if (!remoteBase()) {
    dataInfo.value = "未配置数据地址（NUXT_PUBLIC_DATA_BASE_URL），App 使用内置数据";
    return null;
  }
  dataChecking.value = true;
  dataError.value = "";
  try {
    const [bundled, applied] = await Promise.all([fetchBundledManifest(), readAppliedManifest()]);
    // 展示用版本：已应用记录 → localStorage → 内置
    currentVersion.value =
      applied?.version ||
      (typeof localStorage !== "undefined" ? localStorage.getItem(LS_VERSION) : null) ||
      bundled?.version ||
      "";
    const remote = await fetchRemoteManifest();
    if (!remote.manifest) {
      // 把真实原因显示出来（首次运行最常见的失败是「父目录不存在」与「网络/域名不可达」）
      dataError.value = `无法获取数据清单：${remote.error || "未知原因"}`;
      dataInfo.value = "";
      return null;
    }
    const manifest = remote.manifest;
    let plan = planUpdate(bundled, applied, manifest);
    // 关键：用本地缓存的实际内容复核一遍——已经下过且与远端一致的文件不再算「待更新」。
    // 这样即使版本记录丢了，也不会反复提示同一个更新。
    plan = await verifyAgainstCache(plan, (p) => readCachedBytes(p));
    hasDataUpdate.value = plan.hasUpdate;
    remoteVersion.value = manifest.version;
    remoteGeneratedAt.value = manifest.generatedAt || "";
    pendingBytes.value = plan.downloadBytes;
    if (!plan.hasUpdate) {
      // 内容已与远端一致：把版本记录补齐（下次检查就不用再逐个核对哈希了）
      if (currentVersion.value !== manifest.version) await rememberApplied(manifest);
      dataInfo.value = `已是最新（${shortVersion(manifest.version)}）`;
    } else {
      dataInfo.value = `发现新数据：${shortVersion(manifest.version)}（需下载 ${formatBytes(plan.downloadBytes)}，${plan.download.length} 个文件）`;
    }
    rememberCheck();
    return plan;
  } finally {
    dataChecking.value = false;
  }
}

async function downloadOne(file: DataManifest["files"][number], base: string): Promise<void> {
  const url = `${base}/${file.path}`;
  const target = `${DATA_DIR}/${file.path}`;
  // 先建父目录：downloadFile 不会创建目录，缺目录会直接失败
  await ensureDir(parentDir(file.path));
  await Filesystem.downloadFile({ url, path: target, directory: Directory.Data });
  // 安卓 downloadFile 不校验 content-length（读多少写多少，截断也算成功），所以必须自查。
  // 校验值统一按「LF 归一化后」计算（见 jpDataPack.normalizeEol），因此不依赖部署环境的换行符；
  // 数据文件都远小于 HASH_LIMIT，可以整个读进来校验大小 + sha256。
  if (file.size <= HASH_LIMIT) {
    const res = await Filesystem.readFile({ path: target, directory: Directory.Data });
    if (typeof res.data !== "string") throw new Error(`${file.path} 读取失败`);
    const bytes = normalizeEol(base64ToBytes(res.data));
    if (!verifySize(bytes.length, file.size)) {
      throw new Error(`${file.path} 下载不完整（${bytes.length}/${file.size} 字节）`);
    }
    const got = await sha256Hex(bytes);
    if (got !== file.sha256) throw new Error(`${file.path} 校验失败（sha256 不符）`);
    return;
  }
  const stat = await Filesystem.stat({ path: target, directory: Directory.Data });
  if (!verifySize(stat.size, file.size)) {
    throw new Error(`${file.path} 下载不完整（${stat.size}/${file.size} 字节）`);
  }
}

/** 执行更新（会先自动检查一次） */
export async function applyDataUpdate(plan?: UpdatePlan | null): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (dataUpdating.value) return false;
  const todo = plan ?? (await checkDataUpdate());
  if (!todo?.hasUpdate) {
    dataInfo.value = "已经是最新数据";
    return false;
  }
  const base = remoteBase();
  if (!base) {
    dataError.value = "未配置数据地址";
    return false;
  }

  dataUpdating.value = true;
  dataError.value = "";
  dataProgress.value = { done: 0, total: todo.download.length, bytes: 0, bytesTotal: todo.downloadBytes };
  try {
    for (const f of todo.download) {
      dataInfo.value = `正在下载 ${f.path}`;
      await downloadOne(f, base);
      dataProgress.value = {
        ...dataProgress.value,
        done: dataProgress.value.done + 1,
        bytes: dataProgress.value.bytes + f.size,
      };
    }
    // 远端删掉的文件，本地缓存一并清理（失败不影响本次更新）
    for (const path of todo.remove) {
      try {
        await Filesystem.deleteFile({ path: `${DATA_DIR}/${path}`, directory: Directory.Data });
      } catch {
        /* 文件本来就不在 */
      }
    }
    // 最后登记版本：此刻缓存已经齐全，读取层可以放心用缓存
    const remote = await fetchRemoteManifest();
    if (remote.manifest) await rememberApplied(remote.manifest);
    else rememberVersion(todo.version);
    hasDataUpdate.value = false;
    dataInfo.value = `数据已更新到 ${shortVersion(todo.version)}（${todo.download.length} 个文件，${formatBytes(todo.downloadBytes)}）`;
    rememberCheck();
    return true;
  } catch (err) {
    dataError.value = `更新失败：${err instanceof Error ? err.message : String(err)}（继续使用原有数据）`;
    return false;
  } finally {
    dataUpdating.value = false;
    dataProgress.value = { done: 0, total: 0, bytes: 0, bytesTotal: 0 };
  }
}

/** 清空热更新缓存，回到 APK 内置数据 */
export async function resetDataCache(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Filesystem.rmdir({ path: DATA_DIR, directory: Directory.Data, recursive: true });
  } catch {
    /* 目录不存在 */
  }
  hasDataUpdate.value = false;
  pendingBytes.value = 0;
  dataInfo.value = "已恢复到 App 内置数据";
  try {
    localStorage.removeItem(LS_VERSION);
  } catch {
    /* 忽略 */
  }
  currentVersion.value = "";
}

/** 供 UI 显示的一行状态 */
export const dataStatusText = computed(() => {
  if (dataError.value) return dataError.value;
  if (dataInfo.value) return dataInfo.value;
  if (!currentVersion.value) return "正在读取数据版本…";
  return hasDataUpdate.value ? "有可用更新" : "已是最新";
});

export function useJpDataUpdate() {
  return {
    dataChecking,
    dataUpdating,
    dataProgress,
    dataError,
    dataInfo,
    hasDataUpdate,
    remoteVersion,
    remoteGeneratedAt,
    pendingBytes,
    currentVersion,
    lastCheckedAt,
    dataStatusText,
    remoteManifestUrl,
    checkDataUpdate,
    applyDataUpdate,
    resetDataCache,
  };
}
