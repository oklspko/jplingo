// 内置模型拷贝失败时的表现（独立模块实例，才能命中「只拷一次」那条一次性路径）
// 运行：node tests/offline-tts/run.cjs
import { mockState, pluginState } from "@capacitor/core";
import { fsState } from "@capacitor/filesystem";
import { TTS_MODEL_BYTES, refreshOfflineTtsStatus, useJpTts } from "../../app/composables/jp/useJpTts";

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

async function main() {
  fsState.fullSize = TTS_MODEL_BYTES;
  mockState.native = true;
  mockState.pluginAvailable = true;
  const { supported, installed, bundled, preparingAssets, error } = useJpTts();

  console.log("\n[1] 内置模型拷贝失败（例如存储空间不足）：要有明确报错，且仍能走下载兜底");
  pluginState.ready = false;
  pluginState.bundled = true;
  pluginState.failAssets = true; // 空间不够
  eq("状态检查返回未就绪", await refreshOfflineTtsStatus(), false);
  await new Promise((r) => setTimeout(r, 10));
  check("error 里带上了失败原因", error.value.includes("内置语音准备失败"), error.value);
  check("原因里能看到空间不足", error.value.includes("存储空间不足"), error.value);
  eq("准备状态复位（不会卡在「正在准备」）", preparingAssets.value, false);
  eq("installed 仍是 false", installed.value, false);
  eq("插件可用 → 界面会显示「下载离线语音」兜底", supported.value, true);
  eq("bundled 标记仍在（说明是拷贝失败而不是没内置）", bundled.value, true);

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
