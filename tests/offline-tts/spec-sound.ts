// useJpSound.speakJapanese 的发音回退链测试（真实代码 + mock 插件/浏览器 API）
// 运行：node tests/offline-tts/run.cjs
//
// 发音链：预生成音频 → 内置离线引擎（装了模型）→ 系统 TTS → 浏览器 TTS
// 这里不仅断言各级是否被调用，还断言 speakJapanese 返回的「实际走了哪条路」，
// 以及据此给出的「去下载内置语音」提示判定。
import { Capacitor, mockState, pluginState, speakHook } from "@capacitor/core";
import { fsState } from "@capacitor/filesystem";
import { TextToSpeech, ttsState } from "@capacitor-community/text-to-speech";
import {
  shouldSuggestOfflineEngine,
  speakJapanese,
  prefetchJapanese,
} from "../../app/composables/jp/useJpSound";
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
const audioState = { playResults: [] as Array<"ok" | "fail"> };

class FakeAudio {
  src = "";
  playbackRate = 1;
  currentTime = 0;
  private listeners: Record<string, Array<() => void>> = {};
  addEventListener(type: string, fn: () => void) {
    (this.listeners[type] ||= []).push(fn);
  }
  async play() {
    const next = audioState.playResults.shift() ?? "ok";
    trace.push(`audio.play(${this.src})`);
    if (next === "fail") {
      // 真实浏览器里 play() 失败既会 reject 也会触发 error 事件（两条回退路径）
      (this.listeners["error"] || []).forEach((fn) => fn());
      throw new Error("播放失败");
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

async function settle(times = 16) {
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
  eq("返回 audio（走了预生成音频）", await speakJapanese("こんにちは"), "audio");
  await settle();
  check("播放了 /audio/abc123.mp3", trace.includes("audio.play(/audio/abc123.mp3)"), trace.join(" | "));
  eq("没调内置离线引擎 speak", pluginState.calls.filter((c) => c.startsWith("speak:")).length, 0);
  eq("没调系统 TTS", ttsState.calls.filter((c) => c.startsWith("speak:")).length, 0);
  eq("没走浏览器 TTS", trace.filter((t) => t.startsWith("webSpeech.speak")).length, 0);
  eq("有音频不提示装内置语音", shouldSuggestOfflineEngine("audio"), false);

  console.log("\n[2] 没有音频 + 装了模型：走内置离线引擎");
  pluginState.ready = true;
  await downloadOfflineTtsModel(); // 让 installed=true（走真实的下载+安装流程）
  trace.length = 0;
  pluginState.calls.length = 0;
  ttsState.calls.length = 0;
  audioState.playResults = ["ok"];
  eq("返回 offline", await speakJapanese("ありがとう"), "offline");
  await settle();
  eq("调了内置离线引擎合成一次", pluginState.calls.filter((c) => c.startsWith("speak:")).length, 1);
  check(
    "播放的是 convertFileSrc 后的本地 WAV",
    trace.some((t) => t.startsWith("audio.play(https://localhost/_capacitor_file_") && t.endsWith(".wav)")),
    trace.join(" | "),
  );
  eq("没调系统 TTS", ttsState.calls.filter((c) => c.startsWith("speak:")).length, 0);
  eq("装了模型就不再提示", shouldSuggestOfflineEngine("offline"), false);

  console.log("\n[3] 没音频 + 没装模型：退到系统 TTS，并给出「去装内置语音」提示");
  await deleteOfflineTtsModel(); // installed=false
  trace.length = 0;
  pluginState.calls.length = 0;
  ttsState.calls.length = 0;
  audioState.playResults = ["ok"];
  eq("返回 system-tts", await speakJapanese("さようなら"), "system-tts");
  await settle();
  eq("内置引擎一次都没调（没模型就不白调原生）", pluginState.calls.filter((c) => c.startsWith("speak:")).length, 0);
  check(
    "系统 TTS 接到日语",
    ttsState.calls.some((c) => c.startsWith("speak:ja-JP:さようなら")),
    ttsState.calls.join(" | "),
  );
  eq("此时要提示用户去下载内置语音", shouldSuggestOfflineEngine("system-tts"), true);

  console.log("\n[4] 系统 TTS 也失败：最后退到浏览器 TTS");
  trace.length = 0;
  ttsState.calls.length = 0;
  ttsState.failSpeak = true;
  audioState.playResults = ["ok"];
  eq("返回 web-speech", await speakJapanese("おやすみ"), "web-speech");
  await settle();
  eq("系统 TTS 抛错", ttsState.calls.filter((c) => c.startsWith("speak:")).length, 1);
  check(
    "浏览器 TTS 兜底发声",
    trace.some((t) => t.startsWith("webSpeech.speak:おやすみ")),
    trace.join(" | "),
  );
  ttsState.failSpeak = false;

  console.log("\n[5] 预生成音频播不出来：降级到内置离线引擎（且只合成一遍）");
  pluginState.ready = true;
  await downloadOfflineTtsModel();
  trace.length = 0;
  pluginState.calls.length = 0;
  ttsState.calls.length = 0;
  audioState.playResults = ["fail", "ok"]; // mp3 播放失败 → 后面的 WAV 成功
  eq("返回 offline（降级成功）", await speakJapanese("こんにちは"), "offline");
  await settle();
  check(
    "mp3 播失败后仍发出声音",
    trace.some((t) => t.startsWith("audio.play(https://localhost/_capacitor_file_")),
    trace.join(" | "),
  );
  eq("同一个只合成一遍（error 事件 + play 拒绝只算一次）", pluginState.calls.filter((c) => c.startsWith("speak:")).length, 1);
  eq("没退到系统 TTS（离线引擎已够）", ttsState.calls.filter((c) => c.startsWith("speak:")).length, 0);

  console.log("\n[6] 网页端（非原生）：不应调用任何原生插件、也不提示");
  mockState.native = false;
  trace.length = 0;
  pluginState.calls.length = 0;
  ttsState.calls.length = 0;
  audioState.playResults = ["ok"];
  eq("返回 web-speech", await speakJapanese("こんばんは"), "web-speech");
  await settle();
  eq("没调内置引擎", pluginState.calls.filter((c) => c.startsWith("speak:")).length, 0);
  eq("没调系统 TTS", ttsState.calls.filter((c) => c.startsWith("speak:")).length, 0);
  check(
    "走浏览器 TTS",
    trace.some((t) => t.startsWith("webSpeech.speak:こんばんは")),
    trace.join(" | "),
  );
  eq("网页端不提示（浏览器自带语音是正常的）", shouldSuggestOfflineEngine("web-speech"), false);
  mockState.native = true;

  console.log("\n[7] 预合成下一题（避免长句等 8-15 秒才出声）");
  pluginState.ready = true;
  await downloadOfflineTtsModel();
  trace.length = 0;
  pluginState.calls.length = 0;
  audioState.playResults = ["ok"];
  prefetchJapanese("いただきます"); // 没有预生成音频、也没合成过 → 提前合成
  prefetchJapanese("こんにちは"); // 清单里有 mp3 → 不该浪费算力
  await settle();
  eq("只对没音频的那句做了预合成", pluginState.calls.filter((c) => c.startsWith("speak:")).length, 1);
  eq("预合成不播放", trace.filter((t) => t.startsWith("audio.play")).length, 0);
  trace.length = 0;
  pluginState.calls.length = 0;
  eq("播放时命中预合成缓存，返回 offline", await speakJapanese("いただきます"), "offline");
  eq("不再调原生合成", pluginState.calls.filter((c) => c.startsWith("speak:")).length, 0);
  check(
    "直接播出预合成的 WAV",
    trace.some((t) => t.startsWith("audio.play(https://localhost/_capacitor_file_")),
    trace.join(" | "),
  );

  console.log("\n[8] 连点两次发音：先点的那个回退作废（不能两句都出声）");
  pluginState.ready = true;
  // 必须在同一个同步块里连点：只要让出一次微任务，第一次回退就已经落地了
  const first = speakJapanese("いちばんめ");
  const second = speakJapanese("にばんめ");
  const [r1, r2] = await Promise.all([first, second]);
  eq("先点的返回 none（被作废）", r1, "none");
  eq("后点的正常走离线引擎", r2, "offline");

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
