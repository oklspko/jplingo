#!/usr/bin/env node
/**
 * 生成课程数据清单 public/data/manifest.json（供 App 数据热更新用）
 *
 * 设计要点：
 *  - **版本 = 内容哈希**（所有文件的 path+sha256 排序后再哈希），因此在 CI 里稳定：
 *    内容没变 → 版本不变（不会因为构建时间/mtime 变化而误判有新数据）。
 *  - **文件级 diff**：App 只下载 sha256 与当前不同的文件，所以日常课程更新只传几百 KB。
 *  - 清单里只列「可以热更新的数据」，即：
 *      courses/**       课程包索引与每一课的 JSON
 *      dict/words.json  词库
 *    不含 audio/（App 走内置离线引擎，音频没进包）与 kuromoji 词典二进制（静态、体积大）。
 *  - 这个文件同时会打进 APK：App 用它知道「我内置的数据是哪一版」，离线也能显示版本。
 *
 * 用法：node scripts/gen-data-manifest.cjs   （package.json 的 pregenerate 钩子会自动调用）
 */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(PUBLIC, "data", "manifest.json");

/** 参与热更新的数据根目录（相对 public/） */
const DATA_DIRS = ["courses"];
/** 额外单列的文件（相对 public/） */
const DATA_FILES = ["dict/words.json"];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function collect() {
  const abs = [];
  for (const d of DATA_DIRS) {
    const full = path.join(PUBLIC, d);
    if (!fs.existsSync(full)) continue;
    abs.push(...walk(full));
  }
  for (const f of DATA_FILES) {
    const full = path.join(PUBLIC, f);
    if (fs.existsSync(full)) abs.push(full);
  }
  return abs
    .map((p) => p.replace(/\\/g, "/"))
    .sort()
    .map((p) => {
      const buf = fs.readFileSync(p);
      return {
        path: path.relative(PUBLIC, p).replace(/\\/g, "/"),
        size: buf.length,
        sha256: sha256(buf),
      };
    });
}

function main() {
  const files = collect();
  if (!files.length) {
    console.error("没有找到可热更新的数据（先跑 pnpm generate 生成 public 内容？）");
    process.exit(1);
  }
  // 版本 = 内容哈希：与构建时间、文件 mtime 无关，内容不变则版本不变
  const fingerprint = sha256(files.map((f) => `${f.path}:${f.sha256}`).join("\n"));
  const manifest = {
    version: `sha256:${fingerprint.slice(0, 32)}`,
    generatedAt: process.env.SOURCE_DATE || new Date().toISOString(),
    base: "https://www.jplingo.cn",
    bytes: files.reduce((sum, f) => sum + f.size, 0),
    files,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const kb = (manifest.bytes / 1024).toFixed(0);
  console.log(`数据清单已写出：${path.relative(ROOT, OUT).replace(/\\/g, "/")}`);
  console.log(`  版本 ${manifest.version}`);
  console.log(`  ${files.length} 个文件，共 ${kb} KB`);
  for (const f of files.slice(0, 5)) console.log(`    ${f.path}  ${(f.size / 1024).toFixed(1)} KB`);
  if (files.length > 5) console.log(`    … 其余 ${files.length - 5} 个`);
}

main();
