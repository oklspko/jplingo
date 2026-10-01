/**
 * 数据热更新（Data Pack）纯逻辑层
 *
 * APK 里的 `public/` 资源是「内置数据」，用户不重装就拿不到新课。
 * 这里把「远端清单 vs 本地已应用清单 vs 内置清单」的比对做成纯函数，
 * 由 useJpDataUpdate 负责真正下载与落盘，逻辑本身可独立测试。
 *
 * 约定：
 *  - path 相对 public/（如 `courses/jp-growing/jp-grow-06.json`、`dict/words.json`）
 *  - 版本 = 内容哈希（由 scripts/gen-data-manifest.cjs 生成），所以只能按「相等/不等」比较，
 *    不能按大小比较先后；远端是唯一权威（回滚也会被如实应用）。
 *  - 只下载 sha256 与当前不同的文件 → 日常更新课程只传变化的课。
 */

export interface DataFile {
  /** 相对 public/ 的路径 */
  path: string;
  size: number;
  sha256: string;
}

export interface DataManifest {
  /** 内容哈希版本，形如 sha256:xxxx */
  version: string;
  /** 生成时间（仅用于展示） */
  generatedAt?: string;
  /** 数据根地址（App 端可覆盖） */
  base?: string;
  /** 所有文件总字节（仅用于展示） */
  bytes?: number;
  files: DataFile[];
}

export interface UpdatePlan {
  /** 是否需要更新（版本不同或有增删文件） */
  hasUpdate: boolean;
  /** 目标版本 */
  version: string;
  /** 需要下载的文件（已按「索引最后」排序） */
  download: DataFile[];
  /** 远端已删除、本地缓存需要清掉的文件 */
  remove: string[];
  /** 需要下载的总字节 */
  downloadBytes: number;
  /** 当前生效的版本（已应用过就用它，否则是内置版本） */
  currentVersion: string | null;
}

/** 课程包索引：必须最后写入，避免「索引指向了还没下下来的课」 */
const INDEX_PATHS = new Set(["courses/course-packs.json"]);

export function isIndexFile(path: string): boolean {
  return INDEX_PATHS.has(path);
}

function toMap(manifest: DataManifest | null | undefined): Map<string, DataFile> {
  const map = new Map<string, DataFile>();
  for (const f of manifest?.files || []) map.set(f.path, f);
  return map;
}

/**
 * 生成更新计划。
 * @param bundled App 内置数据清单（来自打包进 APK 的 /data/manifest.json）
 * @param applied 上次热更新后应用的清单（没更新过传 null）
 * @param remote  远端最新清单
 */
export function planUpdate(
  bundled: DataManifest | null,
  applied: DataManifest | null,
  remote: DataManifest,
): UpdatePlan {
  // 当前实际生效的文件 = 已应用的优先，否则回退到内置
  const current = applied?.files?.length ? applied : (bundled as DataManifest);
  const currentMap = toMap(current);
  const remoteMap = toMap(remote);

  const download: DataFile[] = [];
  for (const f of remote.files || []) {
    const old = currentMap.get(f.path);
    if (!old || old.sha256 !== f.sha256) download.push(f);
  }
  // 索引（course-packs.json）最后写：先把所有课程下齐，再切索引
  download.sort((a, b) => Number(isIndexFile(a.path)) - Number(isIndexFile(b.path)));

  const remove: string[] = [];
  for (const path of currentMap.keys()) {
    if (!remoteMap.has(path)) remove.push(path);
  }
  remove.sort();

  const currentVersion = current?.version ?? null;
  // 是否需要更新，只看「有没有文件要下 / 要清」——版本号只用于展示。
  // 这样即使版本记录丢了（换设备、清了缓存、记录文件读不出来），只要本地内容已与远端一致，
  // 就不会反复提示同一个更新。
  const hasUpdate = download.length > 0 || remove.length > 0;

  return {
    hasUpdate,
    version: remote.version,
    download,
    remove,
    downloadBytes: download.reduce((sum, f) => sum + f.size, 0),
    currentVersion,
  };
}

/**
 * 用「本地缓存的实际内容」过滤更新计划：缓存里已经与远端一致的文件不再下载。
 *
 * 为什么需要：更新记录（_applied.json / localStorage）可能丢失或读不出来，
 * 那样 App 会拿内置清单当基线，把已经下过的文件反复「重新更新」。
 * 这里按 sha256 逐个核对候选文件，是最可靠的判据（只核对候选，通常就是几个文件）。
 *
 * @param readCached 读取缓存文件字节（返回 null 表示缓存里没有）
 */
export async function verifyAgainstCache(
  plan: UpdatePlan,
  readCached: (path: string) => Promise<Uint8Array | null>,
): Promise<UpdatePlan> {
  const still: DataFile[] = [];
  let matched = 0;
  for (const f of plan.download) {
    const bytes = await readCached(f.path);
    if (bytes && bytes.length === f.size && (await sha256Hex(bytes)) === f.sha256) {
      matched++;
      continue;
    }
    still.push(f);
  }
  if (!matched) return plan;
  return {
    ...plan,
    download: still,
    downloadBytes: still.reduce((sum, f) => sum + f.size, 0),
    hasUpdate: still.length > 0 || plan.remove.length > 0,
  };
}

/** 字节数展示：1.2 MB / 345 KB */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 KB";
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

/** 版本号缩短显示：sha256:7647996444fd3e58… → 76479964 */
export function shortVersion(version: string | null | undefined): string {
  if (!version) return "—";
  const body = version.includes(":") ? version.split(":")[1] : version;
  return body.slice(0, 8);
}

/** 文件大小校验：安卓 downloadFile 不校验 content-length，被截断也算成功，所以必须自查 */
export function verifySize(actual: number, expected: number): boolean {
  return actual > 0 && actual === expected;
}

/**
 * 换行归一化（CRLF → LF）。
 *
 * 为什么需要：`data/manifest.json` 里的 size/sha256 由 CI（Linux，LF）生成，
 * 而开发机 git 常带 `core.autocrlf=true`（工作区 CRLF）。若不归一化，
 * 同名同内容的 JSON 会因为换行符不同算出不同哈希 → 清单版本不一致、误判「有新数据」。
 * 数据文件全是文本 JSON，统一按 LF 计算，机制就不依赖构建/部署环境。
 */
export function normalizeEol(bytes: Uint8Array): Uint8Array {
  if (bytes.indexOf(13) < 0) return bytes; // 没有 \r 直接返回
  const out = new Uint8Array(bytes.length);
  let n = 0;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 13 && bytes[i + 1] === 10) continue; // 丢弃 CR
    out[n++] = bytes[i];
  }
  return out.slice(0, n);
}

/** sha256（WebView / Node 18+ 都有 crypto.subtle），先做换行归一化 */
export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const buf = normalizeEol(data instanceof Uint8Array ? data : new Uint8Array(data));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buf as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** base64 → 字节（原生 readFile 返回 base64） */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64.replace(/\s/g, ""));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
