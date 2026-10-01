// 测试用 mock：@capacitor/filesystem（经 esbuild --alias 替换）
// 行为刻意贴近安卓真实实现（见 node_modules/@capacitor/filesystem/android 的
// LegacyFilesystemImplementation.doDownloadInBackground）：流式写文件、不校验 content-length。
export enum Directory {
  Documents = "DOCUMENTS",
  Data = "DATA",
  Library = "LIBRARY",
  Cache = "CACHE",
  External = "EXTERNAL",
  ExternalStorage = "EXTERNAL_STORAGE",
}

export const fsState = {
  files: new Map<string, number>(), // `${directory}/${path}` -> size
  contents: new Map<string, string>(), // `${directory}/${path}` -> 文本内容（热更新数据用）
  downloads: [] as string[],
  failUrls: new Set<string>(),
  truncateTo: new Map<string, number>(),
  /** 按 url 指定下载下来的内容（模拟远端数据文件） */
  downloadContents: new Map<string, string>(),
  fullSize: 0,
  progressListeners: [] as Array<(p: { url: string; bytes: number; contentLength: number }) => void>,
};

function key(directory: string | undefined, path: string) {
  return `${directory ?? "DOCUMENTS"}/${path}`;
}

/** 把字符串按 UTF-8 编码成 base64（模拟原生 readFile 的返回） */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export const Filesystem = {
  __mock: true,
  async downloadFile(o: { url: string; path: string; directory?: string; progress?: boolean }) {
    fsState.downloads.push(o.url);
    if (fsState.failUrls.has(o.url)) throw new Error(`下载失败（HTTP 404）：${o.url}`);
    const content = fsState.downloadContents.get(o.url);
    const size = fsState.truncateTo.get(o.url) ?? (content ? content.length : fsState.fullSize);
    fsState.files.set(key(o.directory, o.path), size);
    if (content !== undefined && !fsState.truncateTo.has(o.url)) {
      fsState.contents.set(key(o.directory, o.path), content);
    }
    for (const l of fsState.progressListeners) {
      l({ url: o.url, bytes: size, contentLength: fsState.fullSize });
    }
    return { path: `/data/data/com.jplingo.app/files/${o.path}` };
  },
  async readFile(o: { path: string; directory?: string }) {
    const k = key(o.directory, o.path);
    const text = fsState.contents.get(k);
    if (text === undefined) throw new Error(`文件不存在：${k}`);
    return { data: toBase64(text) };
  },
  async writeFile(o: { path: string; directory?: string; data: string; encoding?: string }) {
    const k = key(o.directory, o.path);
    fsState.contents.set(k, o.data);
    fsState.files.set(k, o.data.length);
    return { uri: k };
  },
  async mkdir(o: { path: string; directory?: string }) {
    return { uri: key(o.directory, o.path) };
  },
  async stat(o: { path: string; directory?: string }) {
    const k = key(o.directory, o.path);
    if (!fsState.files.has(k)) throw new Error(`文件不存在：${k}`);
    return { size: fsState.files.get(k) as number, uri: k };
  },
  async deleteFile(o: { path: string; directory?: string }) {
    fsState.files.delete(key(o.directory, o.path));
    fsState.contents.delete(key(o.directory, o.path));
  },
  async rmdir(o: { path: string; directory?: string; recursive?: boolean }) {
    const prefix = key(o.directory, o.path);
    for (const k of Array.from(fsState.files.keys())) {
      if (k === prefix || k.startsWith(prefix + "/")) {
        fsState.files.delete(k);
        fsState.contents.delete(k);
      }
    }
  },
  async addListener(
    event: string,
    fn: (p: { url: string; bytes: number; contentLength: number }) => void,
  ) {
    if (event !== "progress") throw new Error(`未知事件：${event}`);
    fsState.progressListeners.push(fn);
    return {
      remove: async () => {
        const i = fsState.progressListeners.indexOf(fn);
        if (i >= 0) fsState.progressListeners.splice(i, 1);
      },
    };
  },
};
