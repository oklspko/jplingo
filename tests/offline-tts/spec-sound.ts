// useJpSound.speakJapanese 的发音回退链测试（真实代码 + mock 插件/浏览器 API）
// 运行：node tests/offline-tts/run.cjs
//
// 发音链：预生成音频 → 内置离线引擎（装了模型）→ 系统 TTS → 浏览器 TTS
// 这里断言每一级的取舍与顺序，以及播放失败时会不会正确降级。
import { Capacitor, mockState, pluginState, speakHook } from "@capacitor/core";
import { fsState } from "@capacitor/filesystem";
import { TextToSpeech, ttsState } from "@capacitor-community/text-to-speech";
import { speakJapanese, prefetchJapanese } from "../../app/composables/jp/useJpSound";
import {
  TTS_MODEL_BYTES,
  downloadOfflineTtsModel,
  deleteOfflineTtsModel,
} from "../../app/composables/jp/useJpTts";

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function check(name: string, ok: boolean, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  [ok]" : "  [FAIL]"} ${name}${detail && !ok ? "  -> " + detail : ""}`);
}
function eq(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  check(name, a === e, `实际 ${a}，期望 ${e}`);
}

// ---- 全局浏览器 API 桩 ----
const trace: string[] = [];
const audioState = { src: "", playResults: [] as Array<"ok" | "fail"> };

class FakeAudio {
  src = "";
  playbackRate = 1;
  currentTime = 0;
  private listeners: Record<string, Array<() => void>> = {};
  set _src(v: string) {
    this.src = v;
  }
  addEventListener(type: string, fn: () => void) {
    (this.listeners[type] ||= []).push(fn);
  }
  async play() {
    const next = audioState.playResults.shift() ?? "ok";
    trace.push(`audio.play(${this.src})`);
    if (next === "fail") {
      const err = new Error("播放失败");
      (this.listeners["error"] || []).forEach((fn) => fn());
      throw err;
    }
    return undefined;
  }
}

function installGlobals(manifest: Record<string, string>) {
  const g = globalThis as unknown as Record<string, unknown>;
  g.Audio = FakeAudio;
  g.fetch = async (url: string) => {
    trace.push(`fetch(${url})`);
    return {
      ok: true,
      async json() {
        return manifest;
      },
    };
  };
  g.speechSynthesis = {
    getVoices: () => [
      { name: "Microsoft Nanami Online (Natural) - Japanese (Japan)", lang: "ja-JP" },
    ],
    cancel: () => trace.push("webSpeech.cancel"),
    speak: (u: { text: string }) => trace.push(`webSpeech.speak:${u.text}`),
    onvoiceschanged: null,
  };
  g.SpeechSynthesisUtterance = class {
    text: string;
    lang = "ja";
    rate = 1;
    pitch = 1;
    volume = 1;
    constructor(text: string) {
      this.text = text;
    }
  };
}

async function settle(times = 10) {
  for (let i = 0; i < times; i++) await new Promise((r) => setTimeout(r, 0));
}

async function main() {
  fsState.fullSize = TTS_MODEL_BYTES;
  mockState.native = true;
  mockState.pluginAvailable = true;
  speakHook.onResult = (name) => fsState.files.set(`CACHE/tts/${name}`, 48044);

  // 预生成音频清单：只有「こんにちは」有 mp3
  installGlobals({ こんにちは: "abc123.mp3" });

  console.log("\n[1] 有预生成音频：只放 mp3，不该动用任何 TTS");
  trace.length = 0;
  pluginState.calls.length = 0;
  ttsState.calls.length = 0;
  audioState.playResults = ["ok"];
  speakJapanese("こんにちは");
  await settle();
  check(
    "播放了 /audio/abc123.mp3",
    trace.includes("audio.play(/audio/abc123.mp3)"),
    trace.join(" | "),
  );
  eq("没调内置离线引擎 speak", pluginState.calls.filter((c) => c.startsWith("speak:")).length, 0);
  eq("没调系统 TTS", ttsState.calls.filter((c) => c.startsWith("speak:")).length, 0);
  eq("没走浏览器 TTS", trace.filter((t) => t.startsWith("webSpeech.speak")).length, 0);

  console.log("\n[2] 没有音频 + 装了模型：走内置离线引擎");
  pluginState.ready = true;
  await downloadOfflineTtsModel(); // 让 installed=true（走真实的下载+安装流程）
  trace.length = 0;
  pluginState.calls.length = 0;
  ttsState.calls.length = 0;
  audioState.playResults = ["ok"];
  speakJapanese("ありがとう");
  await settle();
  eq("调了内置离线引擎合成一次", pluginState.calls.filter((c) => c.startsWith("speak:")).length, 1);
  check(
    "播放的是 convertFileSrc 后的本地 WAV",
    trace.some((t) => t.startsWith("audio.play(https://localhost/_capacitor_file_") && t.endsWith(".wav)")),
    trace.join(" | "),
  );
  eq("没调系统 TTS", ttsState.calls.filter((c) => c.startsWith("speak:")).length, 0);
  eq("没走浏览器 TTS", trace.filter((t) => t.startsWith("webSpeech.speak")).length, 0);

  console.log("\n[3] 没音频 + 没装模型：退到系统 TTS");
  await deleteOfflineTtsModel(); // installed=false
  trace.length = 0;
  pluginState.calls.length = 0;
  ttsState.calls.length = 0;
  audioState.playResults = ["ok"];
  speakJapanese("さようなら");
  await settle();
  eq("内置引擎一次都没调（没模型就不白调原生）", pluginState.calls.filter((c) => c.startsWith("speak:")).length, 0);
  check(
    "系统 TTS 接到日语",
    ttsState.calls.some((c) => c.startsWith("speak:ja-JP:さようなら")),
    ttsState.calls.join(" | "),
  );
  eq("没走浏览器 TTS", trace.filter((t) => t.startsWith("webSpeech.speak")).length, 0);

  console.log("\n[4] 系统 TTS 也失败：最后退到浏览器 TTS");
  trace.length = 0;
  ttsState.calls.length = 0;
  ttsState.failSpeak = true;
  audioState.playResults = ["ok"];
  speakJapanese("おやすみ");
  await settle(16);
  eq("系统 TTS 抛错", ttsState.calls.filter((c) => c.startsWith("speak:")).length, 1);
  check(
    "浏览器 TTS 兜底发声",
    trace.some((t) => t.startsWith("webSpeech.speak:おやすみ")),
    trace.join(" | "),
  );
  ttsState.failSpeak = false;

  console.log("\n[5] 预生成音频播不出来：降级到内置离线引擎");
  pluginState.ready = true;
  await downloadOfflineTtsModel();
  trace.length = 0;
  pluginState.calls.length = 0;
  ttsState.calls.length = 0;
  audioState.playResults = ["fail", "ok"]; // mp3 播放失败 → 后面的 WAV 成功
  speakJapanese("こんにちは");
  await settle(16);
  check(
    "mp3 播失败后仍发出声音",
    trace.some((t) => t.startsWith("audio.play(https://localhost/_capacitor_file_")),
    trace.join(" | "),
  );
  eq("用的是内置引擎", pluginState.calls.filter((c) => c.startsWith("speak:")).length, 1);
  eq("没退到系统 TTS（离线引擎已够）", ttsState.calls.filter((c) => c.startsWith("speak:")).length, 0);

  console.log("\n[6] 网页端（非原生）：不应调用任何原生插件");
  mockState.native = false;
  trace.length = 0;
  pluginState.calls.length = 0;
  ttsState.calls.length = 0;
  audioState.playResults = ["ok"];
  speakJapanese("こんばんは");
  await settle(16);
  eq("没调内置引擎", pluginState.calls.filter((c) => c.startsWith("speak:")).length, 0);
  eq("没调系统 TTS", ttsState.calls.filter((c) => c.startsWith("speak:")).length, 0);
  check(
    "走浏览器 TTS",
    trace.some((t) => t.startsWith("webSpeech.speak:こんばんは")),
    trace.join(" | "),
  );
  mockState.native = true;

  console.log("\n[7] 预合成下一题（避免长句等 8-15 秒才出声）");
  pluginState.ready = true;
  await downloadOfflineTtsModel();
  trace.length = 0;
  pluginState.calls.length = 0;
  audioState.playResults = ["ok"];
  prefetchJapanese("いただきます");       // 没有预生成音频、也没合成过 → 提前合成
  prefetchJapanese("こんにちは");         // 清单里有 mp3 → 不该浪费算力
  await settle(16);
  eq("只对没音频的那句做了预合成", pluginState.calls.filter((c) => c.startsWith("speak:")).length, 1);
  eq("预合成不播放", trace.filter((t) => t.startsWith("audio.play")).length, 0);
  trace.length = 0;
  pluginState.calls.length = 0;
  speakJapanese("いただきます");          // 再播放时应命中缓存，零原生调用
  await settle(16);
  eq("播放时不再调原生（已预合成）", pluginState.calls.filter((c) => c.startsWith("speak:")).length, 0);
  check(
    "直接播出预合成的 WAV",
    trace.some((t) => t.startsWith("audio.play(https://localhost/_capacitor_file_")),
    trace.join(" | "),
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\n合计 ${results.length} 项，失败 ${failed.length} 项`);
  if (failed.length) {
    console.log("失败项：");
    for (const f of failed) console.log(`  - ${f.name}  ${f.detail ?? ""}`);
    process.exit(1);
  }
  void Capacitor;
}

main().catch((err) => {
  console.error("测试自身异常：", err);
  process.exit(2);
});
