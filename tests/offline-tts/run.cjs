#!/usr/bin/env node
/**
 * 离线 TTS 前端逻辑自测（node tests/offline-tts/run.cjs）
 *
 * 为什么要这么跑：useJpTts.ts 的逻辑只在真机上才会执行，本机没有安卓工具链，
 * 所以这里用 esbuild 把 spec.ts 与 mock 的 Capacitor 插件打成 Node 可跑的 bundle，
 * 直接验证「下载换镜像 / 完整性校验 / 缓存 / 状态探测」这些分支。
 *
 * 只依赖 node_modules 里的 esbuild（Nuxt/Vite 的传递依赖），不进 CI：
 * 改过 useJpTts / useJpSound 的发音链后手动跑一次即可。
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const here = __dirname;
let esbuild;
try {
  esbuild = require("esbuild");
} catch {
  console.error("找不到 esbuild（应为 Nuxt/Vite 的传递依赖）。先 pnpm install，再重跑。");
  process.exit(2);
}

// 产物写在 node_modules/.cache 下（系统临时目录在部分环境下不可写）
const cacheDir = path.join(here, "..", "..", "node_modules", ".cache");
fs.mkdirSync(cacheDir, { recursive: true });
const outfile = path.join(cacheDir, "jplingo-offline-tts-spec.mjs");

esbuild.buildSync({
  entryPoints: [path.join(here, "spec.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile,
  // Node 里没有 window，而 detectSupported() 会先看 typeof window
  banner: { js: "globalThis.window = globalThis;" },
  alias: {
    "@capacitor/core": path.join(here, "mocks", "core.ts"),
    "@capacitor/filesystem": path.join(here, "mocks", "filesystem.ts"),
  },
  logLevel: "warning",
});

const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
fs.rmSync(outfile, { force: true });
process.exit(result.status ?? 1);
