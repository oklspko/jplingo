// 测试用 mock：@capacitor/core（经 esbuild --alias 替换）
// 注意：测试脚本必须通过 "@capacitor/core" 这个说明符来 import 本文件，
// 否则 esbuild 会把它解析成另一份模块实例，state 就对不上了。
export const mockState = {
  native: true,
  platform: "android",
  pluginAvailable: true,
};

export const pluginState = {
  ready: false,
  calls: [] as string[],
  failIsReady: false,
  failSpeak: false,
  failInstall: false,
  prepareShouldFail: false,
};

// speak 成功后回调（spec 用它把 WAV 登记进假文件系统，好让合成缓存命中）
export const speakHook: { onResult: null | ((name: string) => void) } = { onResult: null };

export const Capacitor = {
  __mock: true,
  isNativePlatform: () => mockState.native,
  getPlatform: () => mockState.platform,
  isPluginAvailable: (_name: string) => mockState.pluginAvailable,
  convertFileSrc: (p: string) => `https://localhost/_capacitor_file_${p}`,
};

export const fakePlugin = {
  async isReady() {
    pluginState.calls.push("isReady");
    if (pluginState.failIsReady) throw new Error("bridge not ready");
    return { ready: pluginState.ready, modelDir: "/data/data/com.jplingo.app/files/tts-ja" };
  },
  async installModel(_o: { archive?: string }) {
    pluginState.calls.push("installModel");
    if (pluginState.failInstall) throw new Error("bz2 解压失败");
    pluginState.ready = true;
    return { ok: true, files: 7 };
  },
  async prepare() {
    pluginState.calls.push("prepare");
    if (pluginState.prepareShouldFail) throw new Error("模型未安装");
    return { ok: true };
  },
  async speak(o: { text: string }) {
    pluginState.calls.push(`speak:${o.text}`);
    if (pluginState.failSpeak) throw new Error("JNI: 模型未加载");
    // 真实插件把 WAV 写进 cacheDir/tts/<md5(text|sid|speed)>.wav
    const name = `${o.text.length}-${o.text.charCodeAt(0)}.wav`;
    speakHook.onResult?.(name);
    return { path: `/data/data/com.jplingo.app/cache/tts/${name}` };
  },
  async release() {
    pluginState.calls.push("release");
    pluginState.ready = false;
  },
};

export const registerPlugin = (_name: string) => fakePlugin;
