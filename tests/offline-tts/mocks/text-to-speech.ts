// 测试用 mock：@capacitor-community/text-to-speech（系统 TTS）
// 行为贴近安卓：setLanguage 返回值被忽略，缺日语数据时 speak() 静默无声（不报错）。
export const ttsState = {
  calls: [] as string[],
  jaJpSupported: true,
  jaSupported: true,
  failSpeak: false,
  failProbe: false,
};

export const TextToSpeech = {
  async isLanguageSupported(o: { lang: string }) {
    ttsState.calls.push(`isLanguageSupported:${o.lang}`);
    if (ttsState.failProbe) throw new Error("引擎未初始化");
    return { supported: o.lang === "ja-JP" ? ttsState.jaJpSupported : ttsState.jaSupported };
  },
  async stop() {
    ttsState.calls.push("stop");
  },
  async speak(o: { text: string; lang?: string }) {
    ttsState.calls.push(`speak:${o.lang}:${o.text}`);
    if (ttsState.failSpeak) throw new Error("系统 TTS 合成失败");
  },
  async openInstall() {
    ttsState.calls.push("openInstall");
  },
};
