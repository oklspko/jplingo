// 学习页「按顺序提前预加载整课语音」的行为测试
// 运行：node tests/offline-tts/run.cjs
import { mockState, pluginState, speakHook } from "@capacitor/core";
import { fsState } from "@capacitor/filesystem";
import {
  TTS_MODEL_BYTES,
  downloadOfflineTtsModel,
} from "../../app/composables/jp/useJpTts";
import {
  cancelJapanesePreload,
  preloadJapaneseInOrder,
  preloadProgress,
} from "../../app/composables/jp/useJpSound";

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

/** 取本次预加载实际合成过的文本（按调用顺序） */
function spoken(filter: string[] = []) {
  return pluginState.calls
    .filter((c) => c.startsWith("speak:"))
    .map((c) => c.slice("speak:".length))
    .filter((t) => !filter.length || filter.includes(t));
}
function reset() {
  pluginState.calls.length = 0;
  pluginState.maxConcurrent = 0;
  pluginState.active = 0;
}

async function main() {
  fsState.fullSize = TTS_MODEL_BYTES;
  mockState.native = true;
  mockState.pluginAvailable = true;
  speakHook.onResult = (name) => fsState.files.set(`CACHE/tts/${name}`, 48044);

  // 预生成音频清单：只有「きょう」有 mp3（网页端/旧数据会出现这种）
  const g = globalThis as unknown as Record<string, unknown>;
  g.Audio = class {
    src = "";
    playbackRate = 1;
    currentTime = 0;
    addEventListener() {}
    async play() {
      return undefined;
    }
  };
  g.fetch = async () => ({
    ok: true,
    json: async () => ({ きょう: "abc.mp3" }),
  });

  // 先让离线引擎就绪（模拟已装好模型）
  pluginState.ready = true;
  await downloadOfflineTtsModel();

  console.log("\n[1] 按传入顺序逐句预合成（不能乱序、不能并发）");
  reset();
  await preloadJapaneseInOrder(["あさ", "ひる", "よる"]);
  eq("顺序与传入一致", spoken(["あさ", "ひる", "よる"]), ["あさ", "ひる", "よる"]);
  eq("全程只跑一个原生合成", pluginState.maxConcurrent, 1);
  eq("进度打满", preloadProgress.value, { done: 3, total: 3 });

  console.log("\n[2] 跳过有预生成音频的、并去重");
  reset();
  await preloadJapaneseInOrder(["きょう", "きた", "きた", "ばん"]);
  eq("有 mp3 的「きょう」不合成", spoken(["きょう"]), []);
  eq("重复项只合成一次", spoken(["きた"]), ["きた"]);
  eq("其余照常", spoken(["ばん"]), ["ばん"]);
  eq("总数按去重后算", preloadProgress.value, { done: 2, total: 2 });

  console.log("\n[3] 已经合成过的直接命中缓存（不重复调原生）");
  reset();
  await preloadJapaneseInOrder(["あさ", "ひる", "よる", "ゆうがた"]);
  eq("只有新的一句调了原生", spoken(["あさ", "ひる", "よる", "ゆうがた"]), ["ゆうがた"]);

  console.log("\n[4] 退出/换课时可取消：中途停下，不再继续烧 CPU");
  reset();
  const long = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"];
  const running = preloadJapaneseInOrder(long);
  await new Promise((r) => setTimeout(r, 12)); // 让它跑前几句（mock 每句 5ms）
  cancelJapanesePreload();
  await running;
  const done = spoken(long).length;
  check("取消后没有把整课跑完", done < long.length, `已合成 ${done}/${long.length}`);
  eq("进度被清空", preloadProgress.value, { done: 0, total: 0 });

  console.log("\n[5] 再次调用会接管上一轮（换课场景）");
  reset();
  const first = preloadJapaneseInOrder(["b1", "b2", "b3", "b4"]);
  const second = preloadJapaneseInOrder(["c1", "c2"]);
  await Promise.all([first, second]);
  check("旧列表停在中途", spoken(["b1", "b2", "b3", "b4"]).length < 4, JSON.stringify(spoken(["b1", "b2", "b3", "b4"])));
  eq("新列表跑完", spoken(["c1", "c2"]), ["c1", "c2"]);

  console.log("\n[6] 网页端不做预加载（浏览器有系统语音，且没有原生合成）");
  mockState.native = false;
  reset();
  await preloadJapaneseInOrder(["d1", "d2"]);
  eq("一次原生合成都没调", spoken(["d1", "d2"]), []);
  eq("进度保持空", preloadProgress.value, { done: 0, total: 0 });
  mockState.native = true;

  const failed = results.filter((r) => !r.ok);
  console.log(`\n合计 ${results.length} 项，失败 ${failed.length} 项`);
  if (failed.length) {
    console.log("失败项：");
    for (const f of failed) console.log(`  - ${f.name}  ${f.detail ?? ""}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("测试自身异常：", err);
  process.exit(2);
});
