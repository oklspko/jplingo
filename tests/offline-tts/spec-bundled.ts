// APK 内置模型（bundled）流程测试：新装首启自动拷贝，不联网
// 运行：node tests/offline-tts/run.cjs
//
// 这份 spec 单独打包 → 独立模块实例，用来测「首次状态检查时自动拷贝」这条一次性路径。
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
const countOf = (name: string) => pluginState.calls.filter((c) => c === name).length;

async function main() {
  fsState.fullSize = TTS_MODEL_BYTES;
  mockState.native = true;
  mockState.pluginAvailable = true;
  const { supported, installed, bundled, preparingAssets, error } = useJpTts();

  console.log("\n[1] 新装：APK 内置模型、filesDir 里还没有 → 首启自动拷贝");
  pluginState.ready = false; // filesDir 空
  pluginState.bundled = true; // APK 内置齐全
  eq("首次状态检查返回 false（此刻还不能用，拷贝在后台进行）", await refreshOfflineTtsStatus(), false);
  await new Promise((r) => setTimeout(r, 10)); // 等自动拷贝的 promise 收尾
  eq("调了一次 installFromAssets", countOf("installFromAssets"), 1);
  eq("拷贝后 installed=true", installed.value, true);
  eq("再查一次就是 true（模型已落到 filesDir）", await refreshOfflineTtsStatus(), true);
  eq("状态里带 bundled 标记（UI 显示「APK 内置」）", bundled.value, true);
  eq("准备状态已复位", preparingAssets.value, false);
  eq("插件仍可用（下载兜底还在）", supported.value, true);
  eq("没有报错", error.value, "");

  console.log("\n[2] 同一次会话内不重复拷贝（145MB 不该拷两遍）");
  pluginState.ready = false; // 人为制造「又没了」
  await refreshOfflineTtsStatus(true);
  await new Promise((r) => setTimeout(r, 10));
  eq("installFromAssets 仍然只调过一次", countOf("installFromAssets"), 1);
  eq("此时 installed=false（UI 会显示「下载离线语音」兜底）", installed.value, false);

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
