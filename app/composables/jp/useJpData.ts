import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { cacheBustUrl } from "~/composables/jp/useJpBuildId";
import { base64ToBytes, type DataManifest } from "~/utils/jpDataPack";

/**
 * 课程/词库数据的读取层。
 *
 * 优先顺序：**本地热更新缓存（Directory.Data/jp-data）→ APK 内置资源（/xxx.json）**。
 * 这样热更新生效后不用重装；缓存缺失、损坏或读取异常时自动回退到内置数据，
 * 所以「更新失败」最坏情况只是继续用老数据，永远不会白屏。
 *
 * 网页端不需要缓存（每次请求本来就是最新的），直接走网络。
 */

export const DATA_DIR = "jp-data";
export const APPLIED_FILE = `${DATA_DIR}/_applied.json`;

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** 当前内置数据清单（打包进 APK / 网页部署里） */
export async function fetchBundledManifest(): Promise<DataManifest | null> {
  try {
    const res = await fetch(cacheBustUrl("/data/manifest.json"));
    if (!res.ok) return null;
    return (await res.json()) as DataManifest;
  } catch {
    return null;
  }
}

/** 读取热更新缓存里的文本（没有则返回 null） */
export async function readCachedText(path: string): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const res = await Filesystem.readFile({ path: `${DATA_DIR}/${path}`, directory: Directory.Data });
    // 插件在没指定 encoding 时返回 base64 字符串
    if (typeof res.data === "string") {
      return new TextDecoder().decode(base64ToBytes(res.data));
    }
    return null;
  } catch {
    return null;
  }
}

/** 上次热更新应用的清单（没有则 null = 还在用内置数据） */
export async function readAppliedManifest(): Promise<DataManifest | null> {
  const text = await readCachedText("_applied.json");
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as DataManifest;
    return parsed?.files?.length ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 读取一个数据 JSON：缓存优先，失败/缺失回退内置资源。
 * @param path 相对 public/ 的路径，如 `courses/jp-growing/jp-grow-03.json`
 */
export async function fetchDataJson<T>(path: string): Promise<T> {
  const cached = await readCachedText(path);
  if (cached) {
    try {
      return JSON.parse(cached) as T;
    } catch {
      // 缓存坏了就当没有，回退内置（下次热更新会覆盖它）
      console.warn(`[jp-data] 缓存解析失败，回退内置：${path}`);
    }
  }
  const res = await fetch(cacheBustUrl(`/${path}`));
  if (!res.ok) throw new Error(`数据不存在：${path}（HTTP ${res.status}）`);
  return (await res.json()) as T;
}
