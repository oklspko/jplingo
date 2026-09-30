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
  downloads: [] as string[],
  failUrls: new Set<string>(),
  truncateTo: new Map<string, number>(),
  fullSize: 0,
  progressListeners: [] as Array<(p: { url: string; bytes: number; contentLength: number }) => void>,
};

function key(directory: string | undefined, path: string) {
  return `${directory ?? "DOCUMENTS"}/${path}`;
}

export const Filesystem = {
  __mock: true,
  async downloadFile(o: { url: string; path: string; directory?: string; progress?: boolean }) {
    fsState.downloads.push(o.url);
    if (fsState.failUrls.has(o.url)) throw new Error(`下载失败（HTTP 404）：${o.url}`);
    const size = fsState.truncateTo.get(o.url) ?? fsState.fullSize;
    fsState.files.set(key(o.directory, o.path), size);
    for (const l of fsState.progressListeners) {
      l({ url: o.url, bytes: size, contentLength: fsState.fullSize });
    }
    return { path: `/data/data/com.jplingo.app/files/${o.path}` };
  },
  async stat(o: { path: string; directory?: string }) {
    const k = key(o.directory, o.path);
    if (!fsState.files.has(k)) throw new Error(`文件不存在：${k}`);
    return { size: fsState.files.get(k) as number, uri: k };
  },
  async deleteFile(o: { path: string; directory?: string }) {
    fsState.files.delete(key(o.directory, o.path));
  },
  async rmdir(o: { path: string; directory?: string; recursive?: boolean }) {
    const prefix = key(o.directory, o.path);
    for (const k of Array.from(fsState.files.keys())) {
      if (k === prefix || k.startsWith(prefix + "/")) fsState.files.delete(k);
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
