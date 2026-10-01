#!/usr/bin/env node
/**
 * 打包 APK 前，把「用来验证数据热更新」的那部分数据从产物里剔除。
 *
 * 为什么需要：
 *   APK 自带一份数据（课程/词库/语法）作为离线兜底。如果这次的内容更新也一起打进 APK，
 *   那 App 装完就是最新版，永远显示「已是最新」——数据热更新根本没机会被验证。
 *   所以 APK 只带**上一版**的数据，更新的部分留给在线拉取：
 *   装 App → 「我的 → 课程数据」发现更新 → 点一下 → 新内容到位（不用重装）。
 *
 * 做什么（只动 .output/public，不动仓库里的 public/）：
 *   1. 删掉本次新增/更新的数据文件（默认：句子生长第 6–8 课 + 语法条/语法页 JSON）
 *   2. 把课程包索引里对应课程 id 去掉（否则列表会出现点不开的课）
 *   3. 按剔除后的文件集重新生成 data/manifest.json（App 的「内置版本」= 这个版本）
 *
 * 用法（CI 在 pnpm generate 之后、cap sync 之前调用）：
 *   node scripts/strip-apk-test-data.cjs            # 用内置清单剔除
 *   node scripts/strip-apk-test-data.cjs --list a,b # 自定义要剔除的相对路径
 */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, ".output", "public");

/** 默认剔除：本次用于验证热更新的内容（第 6–8 课与语法 JSON） */
const DEFAULT_STRIP = [
  "courses/jp-growing/jp-grow-06.json",
  "courses/jp-growing/jp-grow-07.json",
  "courses/jp-growing/jp-grow-08.json",
  "data/grammar-points.json",
  "data/grammar-reference.json",
];
/** 需要从索引里摘掉的课程 id（与上面课程文件对应） */
const STRIP_COURSE_IDS = ["jp-grow-06", "jp-grow-07", "jp-grow-08"];

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

function main() {
  if (!fs.existsSync(OUT)) {
    console.error(`找不到 ${path.relative(ROOT, OUT)}，请先执行 pnpm generate`);
    process.exit(1);
  }
  const listArg = argValue("--list");
  const strip = listArg ? listArg.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_STRIP;

  // 1) 删文件
  let removed = 0;
  for (const rel of strip) {
    const full = path.join(OUT, rel);
    if (fs.existsSync(full)) {
      fs.unlinkSync(full);
      removed++;
    }
  }

  // 2) 课程包索引里摘掉对应课程
  const indexFile = path.join(OUT, "courses", "course-packs.json");
  if (fs.existsSync(indexFile) && STRIP_COURSE_IDS.length) {
    const data = JSON.parse(fs.readFileSync(indexFile, "utf8"));
    for (const pack of data.coursePacks || []) {
      if (!Array.isArray(pack.courses)) continue;
      pack.courses = pack.courses.filter((id) => !STRIP_COURSE_IDS.includes(id));
    }
    fs.writeFileSync(indexFile, JSON.stringify(data, null, 2) + "\n", "utf8");
  }

  // 3) 按剔除后的文件集重建清单（版本随之变化 → App 对比线上就能发现更新）
  process.env.JPLINGO_PUBLIC_DIR = OUT;
  const { generate } = require("./gen-data-manifest.cjs");
  const { manifest } = generate();
  console.log(
    `[strip-apk] 已剔除 ${removed} 个数据文件，索引去掉课程 ${STRIP_COURSE_IDS.join(", ")}；` +
      `APK 内置清单版本 ${manifest.version}（${manifest.files.length} 个文件）`,
  );
}

module.exports = { main, DEFAULT_STRIP, STRIP_COURSE_IDS };

if (require.main === module) main();
