#!/usr/bin/env node
/**
 * 离线 TTS 前端逻辑自测（node tests/offline-tts/run.cjs）
 *
 * 为什么要这么跑：useJpTts.ts / useJpSound.ts 的逻辑只在真机上才会执行，本机没有安卓工具链，
 * 所以这里用 esbuild 把它们与 mock 的 Capacitor 插件/浏览器 API 打成 Node 可跑的 bundle，
 * 直接验证「镜像切换 / 完整性校验 / 合成缓存与串行 / 发音回退链 / 状态探测自愈」这些分支。
 *
 * 只依赖 node_modules 里的 esbuild（Nuxt/Vite 的传递依赖），不进 CI：
 * 改过发音链后手动跑一次即可。
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const here = __dirname;
const repoRoot = path.join(here, "..", "..");

let esbuild;
try {
  esbuild = require("esbuild");
} catch {
  console.error("找不到 esbuild（应为 Nuxt/Vite 的传递依赖）。先 pnpm install，再重跑。");
  process.exit(2);
}

// 产物写在 node_modules/.cache 下（系统临时目录在部分环境下不可写）
const cacheDir = path.join(repoRoot, "node_modules", ".cache");
fs.mkdirSync(cacheDir, { recursive: true });

const specs = [
  "spec.ts",
  "spec-sound.ts",
  "spec-bundled.ts",
  "spec-bundled-fail.ts",
  "spec-viewport.ts",
  "spec-preload.ts",
  "spec-growing.ts",
  "spec-fuzzy.ts",
];
const alias = {
  "@capacitor/core": path.join(here, "mocks", "core.ts"),
  "@capacitor/filesystem": path.join(here, "mocks", "filesystem.ts"),
  "@capacitor-community/text-to-speech": path.join(here, "mocks", "text-to-speech.ts"),
  "~/composables/jp/useJpBuildId": path.join(repoRoot, "app", "composables", "jp", "useJpBuildId.ts"),
  "~/composables/jp/useJpTts": path.join(repoRoot, "app", "composables", "jp", "useJpTts.ts"),
  "~/composables/jp/useJpImportedPacks": path.join(
    repoRoot,
    "app",
    "composables",
    "jp",
    "useJpImportedPacks.ts",
  ),
  "~/composables/jp/useJpRomaji": path.join(repoRoot, "app", "composables", "jp", "useJpRomaji.ts"),
};

// Node 里没有 window / localStorage：前者是 detectSupported() 的前置，后者是语者/步数持久化要用
const NODE_BANNER = `
globalThis.window = globalThis;
globalThis.__lsStore = new Map();
globalThis.localStorage = {
  getItem: (k) => (globalThis.__lsStore.has(k) ? globalThis.__lsStore.get(k) : null),
  setItem: (k, v) => globalThis.__lsStore.set(k, String(v)),
  removeItem: (k) => globalThis.__lsStore.delete(k),
  clear: () => globalThis.__lsStore.clear(),
  key: (i) => Array.from(globalThis.__lsStore.keys())[i] ?? null,
  get length() { return globalThis.__lsStore.size; },
};
`;

let failed = 0;
for (const spec of specs) {
  const outfile = path.join(cacheDir, `jplingo-offline-tts-${spec.replace(/\.ts$/, "")}.mjs`);
  console.log(`\n===== ${spec} =====`);
  esbuild.buildSync({
    entryPoints: [path.join(here, spec)],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    banner: { js: NODE_BANNER },
    alias,
    logLevel: "warning",
  });
  const result = spawnSync(process.execPath, [outfile], {
    stdio: "inherit",
    env: { ...process.env, JPLINGO_ROOT: repoRoot },
  });
  if (result.status !== 0) failed++;
  fs.rmSync(outfile, { force: true });
}

process.exit(failed ? 1 : 0);
