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
const DATA_FILES = [
  "dict/words.json",
  "data/grammar-points.json", // 语法条库（构建时由 gen-content-json.cjs 从 TS 模块导出）
  "data/grammar-reference.json", // 语法页各标签页的表格/清单数据
];

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

/**
 * 换行归一化（CRLF → LF）后再计算 size/sha256。
 * 数据文件都是文本 JSON；开发机 git 常带 core.autocrlf=true（工作区 CRLF），
 * 而 CI/EdgeOne 是 LF。不归一化的话，同内容的文件会算出不同哈希，
 * 本地生成的清单与线上清单版本不一致（会被误判成「有新数据」）。
 */
function normalized(buf) {
  return buf.includes(13) ? Buffer.from(buf.toString("binary").replace(/\r\n/g, "\n"), "binary") : buf;
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
      const buf = normalized(fs.readFileSync(p));
      return {
        path: path.relative(PUBLIC, p).replace(/\\/g, "/"),
        size: buf.length,
        sha256: sha256(buf),
      };
    });
}

/**
 * 生成清单并落盘（nuxt.config.ts 与命令行都用它）。
 * @returns {{ files: Array<{path:string,size:number,sha256:string}>, manifest: object, out: string }}
 */
function generate() {
  const files = collect();
  if (!files.length) throw new Error("没有找到可热更新的数据（public/courses 不存在？）");
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
  return { files, manifest, out: OUT };
}

function main() {
  const summary = generate();
  const { files, manifest, out } = summary;
  const kb = (manifest.bytes / 1024).toFixed(0);
  console.log(`数据清单已写出：${path.relative(ROOT, out).replace(/\\/g, "/")}`);
  console.log(`  版本 ${manifest.version}`);
  console.log(`  ${files.length} 个文件，共 ${kb} KB`);
  for (const f of files.slice(0, 5)) console.log(`    ${f.path}  ${(f.size / 1024).toFixed(1)} KB`);
  if (files.length > 5) console.log(`    … 其余 ${files.length - 5} 个`);
  return manifest;
}

/** 供 nuxt.config.ts 调用：任何 Nuxt 构建都会重新生成清单，保证线上清单不会过时 */
module.exports = { generate, collect, sha256, normalized, OUT };

if (require.main === module) main();
