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
  // 并发检测：真实插件里是同一个 OfflineTts 实例，并发合成既不安全、也会抢同一个输出文件
  active: 0,
  maxConcurrent: 0,
  // 最后一次 speak 的入参（验证 sid/steps 有没有透传到原生）
  lastSpeakArgs: null as null | { text: string; sid?: number; steps?: number; speed?: number },
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
  async speak(o: { text: string; sid?: number; steps?: number; speed?: number }) {
    pluginState.calls.push(`speak:${o.text}`);
    pluginState.lastSpeakArgs = { text: o.text, sid: o.sid, steps: o.steps, speed: o.speed };
    pluginState.active++;
    pluginState.maxConcurrent = Math.max(pluginState.maxConcurrent, pluginState.active);
    try {
      // 留一个窗口，好让「并发进入」在测试里真的能被观察到
      await new Promise((r) => setTimeout(r, 5));
      if (pluginState.failSpeak) throw new Error("JNI: 模型未加载");
      // 真实插件把 WAV 写进 cacheDir/tts/<md5(text|sid|speed)>.wav
      const name = `${o.text.length}-${o.text.charCodeAt(0)}.wav`;
      speakHook.onResult?.(name);
      return { path: `/data/data/com.jplingo.app/cache/tts/${name}` };
    } finally {
      pluginState.active--;
    }
  },
  async release() {
    pluginState.calls.push("release");
    pluginState.ready = false;
  },
};

export const registerPlugin = (_name: string) => fakePlugin;
