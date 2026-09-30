// useJpTts.ts 的逻辑测试：用 mock 的 Capacitor 插件把真实代码跑起来
// 运行：node tests/offline-tts/run.cjs
// 说明：下面刻意从 "@capacitor/core" / "@capacitor/filesystem" 这两个说明符 import，
// 才会与 composable 的 import 命中同一份（被 esbuild alias 替换掉的）模块实例。
import { Capacitor, mockState, pluginState, speakHook } from "@capacitor/core";
import { fsState, Directory } from "@capacitor/filesystem";
import {
  TTS_MODEL_BYTES,
  TTS_ARCHIVE_NAME,
  TTS_MODEL_URL_DEFAULT,
  downloadOfflineTtsModel,
  synthesizeOffline,
  deleteOfflineTtsModel,
  refreshOfflineTtsStatus,
  useJpTts,
} from "../../app/composables/jp/useJpTts";
import { apkDownloadCandidates } from "../../app/composables/jp/useJpApkDownload";

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
const callsOf = (prefix: string) => pluginState.calls.filter((c) => c.startsWith(prefix)).length;

async function main() {
  const { supported, installed, error, progress } = useJpTts();
  fsState.fullSize = TTS_MODEL_BYTES;
  const candidates = apkDownloadCandidates(TTS_MODEL_URL_DEFAULT);

  console.log("\n[0] 接线自检");
  check("alias 生效：Capacitor 是我们的 mock", (Capacitor as unknown as { __mock?: boolean }).__mock === true);
  check("alias 生效：Filesystem 是我们的 mock", (Directory.Data as string) === "DATA" && typeof fsState.files.clear === "function");

  console.log("\n[1] 状态探测：一次失败不能把整场会话钉死");
  mockState.native = true;
  mockState.pluginAvailable = true;
  // speak 成功时把 WAV 登记进假文件系统（真实插件会写 cacheDir/tts/<name>.wav）
  speakHook.onResult = (name) => fsState.files.set(`CACHE/tts/${name}`, 48044);

  pluginState.failIsReady = true;
  eq("isReady 抛错时返回 false", await refreshOfflineTtsStatus(), false);
  check(
    "插件可用时 supported 仍是 true（否则「我的」页连下载按钮都不显示）",
    supported.value === true,
    `supported=${supported.value}`,
  );
  pluginState.failIsReady = false;
  pluginState.ready = true;
  const before = callsOf("isReady");
  eq("瞬时失败后自愈：不 force 也能重新探测到已安装", await refreshOfflineTtsStatus(), true);
  check(
    "确实重新探测了 isReady",
    callsOf("isReady") > before,
    `isReady 调用数 ${before} -> ${callsOf("isReady")}`,
  );
  eq("installed 变成 true", installed.value, true);
  pluginState.ready = false;
  eq("force 重查能回到未安装", await refreshOfflineTtsStatus(true), false);

  console.log("\n[2] 没装模型时不该白调原生合成");
  const speakBefore = callsOf("speak:");
  eq("synthesizeOffline 返回 null", await synthesizeOffline("こんにちは"), null);
  eq("speak 一次都没调用", callsOf("speak:") - speakBefore, 0);

  console.log("\n[3] 下载 + 安装：镜像挂了要能自动换下一个");
  pluginState.ready = true;
  fsState.downloads.length = 0;
  fsState.failUrls.add(candidates[0]);
  eq(`候选地址 ${candidates.length} 个（3 镜像 + 官方直连）`, candidates.length, 4);
  check(
    "第 1 个候选是 gh-proxy 镜像",
    candidates[0].startsWith("https://gh-proxy.com/https://github.com/"),
    candidates[0],
  );
  check(
    "最后一个是官方直连",
    candidates[candidates.length - 1] === TTS_MODEL_URL_DEFAULT,
    candidates[candidates.length - 1],
  );
  eq("下载+安装成功", await downloadOfflineTtsModel(), true);
  eq("按顺序试了两个地址（第 1 个失败后换第 2 个）", fsState.downloads, [candidates[0], candidates[1]]);
  check("调用了 installModel", pluginState.calls.includes("installModel"));
  check("装完 installed=true", installed.value === true);
  check("进度到 100%", progress.value === 1, `progress=${progress.value}`);

  console.log("\n[4] 合成与缓存");
  const p1 = await synthesizeOffline("おはよう");
  check("拿到本地 WAV 路径", typeof p1 === "string" && p1.endsWith(".wav"), String(p1));
  const n1 = callsOf("speak:");
  const p2 = await synthesizeOffline("おはよう");
  eq("同一句第二次走缓存（路径一致）", p2, p1);
  eq("第二次没有再调原生合成", callsOf("speak:") - n1, 0);
  if (p1) {
    const name = p1.slice(p1.lastIndexOf("/") + 1);
    fsState.files.delete(`CACHE/tts/${name}`); // 模拟系统清了缓存目录
  }
  await synthesizeOffline("おはよう");
  eq("缓存文件没了会重新合成", callsOf("speak:") - n1, 1);

  console.log("\n[5] 合成失败要把原因写进卡片");
  pluginState.failSpeak = true;
  error.value = "";
  eq("synthesizeOffline 返回 null", await synthesizeOffline("ありがとう"), null);
  check(
    "error 里带上原生报错",
    error.value.includes("合成失败") && error.value.includes("JNI"),
    error.value,
  );
  pluginState.failSpeak = false;

  console.log("\n[6] 截断的下载必须判失败（安卓原生下载不校验 content-length）");
  fsState.downloads.length = 0;
  for (const u of candidates) fsState.truncateTo.set(u, 1024);
  eq("全部截断 -> 安装失败", await downloadOfflineTtsModel(), false);
  check("error 提示文件不完整", error.value.includes("文件不完整"), error.value);
  eq("四个地址都试过了", fsState.downloads.length, candidates.length);
  fsState.truncateTo.clear();
  fsState.truncateTo.set(candidates[0], 1024); // 只有第一个镜像返回残缺文件
  fsState.downloads.length = 0;
  eq("残缺的镜像被跳过，后续地址安装成功", await downloadOfflineTtsModel(), true);
  eq("仍然是从第 1 个开始试", fsState.downloads, [candidates[0], candidates[1]]);
  fsState.truncateTo.clear();

  console.log("\n[7] 删除模型");
  eq("删除成功", await deleteOfflineTtsModel(), true);
  check("调用了原生 release", pluginState.calls.includes("release"));
  check("删除后 installed=false", installed.value === false);
  eq("没模型时合成返回 null", await synthesizeOffline("さようなら"), null);

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
