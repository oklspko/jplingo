#!/usr/bin/env node
/*
 * 语法条导出脚本：把 app/data/jp-grammar-points.ts 里的全部 GrammarPoint
 * 导出成一份 Markdown 校对稿（按等级 N5→N1 分组、逐条展开接续/释义/例句/注意/解析）。
 *
 * 用法：
 *   node scripts/export-grammar.cjs                # 输出 docs/语法条校对稿.md
 *   node scripts/export-grammar.cjs --out x.md     # 自定义输出路径
 *
 * 说明：数组是纯 JS 对象字面量（无注释、无类型断言），直接从源文件切片后
 *       new Function 求值，不依赖构建工具。
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "app", "data", "jp-grammar-points.ts");

const LEVEL_ORDER = ["N5", "N4", "N3", "N2", "N1"];

// 从 .ts 源文件里提取 grammarPoints 数组并求值
function loadPoints() {
  const src = fs.readFileSync(SRC, "utf8");
  const markerIdx = src.indexOf("grammarPoints");
  const eqIdx = src.indexOf("=", markerIdx);
  const startIdx = src.indexOf("[", eqIdx);
  const endIdx = src.lastIndexOf("]");
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error("无法定位 grammarPoints 数组");
  }
  const literal = src.slice(startIdx, endIdx + 1);
  const points = new Function(`return (${literal});`)();
  if (!Array.isArray(points)) throw new Error("求值结果不是数组");
  return points;
}

function mdEscape(s) {
  return String(s ?? "").replace(/\|/g, "\\|");
}

function renderPoint(p, idx) {
  const lines = [];
  lines.push(`### ${idx}. ${p.pattern}`);
  lines.push("");
  lines.push(`- **接续**：${p.setsuzoku}`);
  lines.push(`- **释义**：${p.meaning}`);
  lines.push("");
  lines.push(`- **例句**：`);
  (p.examples || []).forEach((ex, i) => {
    lines.push(`  ${i + 1}. ${ex.jp}`);
    lines.push(`     ${ex.zh}`);
  });
  if (p.note) {
    lines.push("");
    lines.push(`- **注意**：${p.note}`);
  }
  if (p.analysis) {
    lines.push("");
    lines.push(`- **解析**：${p.analysis}`);
  }
  lines.push("");
  return lines.join("\n");
}

function main() {
  const outIdx = process.argv.indexOf("--out");
  const outFile =
    outIdx !== -1
      ? path.resolve(ROOT, process.argv[outIdx + 1])
      : path.join(ROOT, "docs", "语法条校对稿.md");

  const points = loadPoints();

  // 按等级分组，组内保持源文件顺序
  const byLevel = {};
  for (const p of points) {
    (byLevel[p.level] ||= []).push(p);
  }

  const total = points.length;
  const now = new Date().toLocaleString("zh-CN", { hour12: false });

  const out = [];
  out.push("# 日语语法条词典 · 校对稿");
  out.push("");
  out.push(`> 导出时间：${now}　｜　共 **${total}** 条`);
  out.push("");

  out.push("## 统计");
  out.push("");
  out.push("| 等级 | 条数 |");
  out.push("| --- | ---: |");
  for (const lv of LEVEL_ORDER) {
    out.push(`| ${lv} | ${(byLevel[lv] || []).length} |`);
  }
  out.push("");

  out.push("## 目录");
  out.push("");
  for (const lv of LEVEL_ORDER) {
    out.push(`- [${lv}（${(byLevel[lv] || []).length} 条）](#${lv.toLowerCase()})`);
  }
  out.push("");

  for (const lv of LEVEL_ORDER) {
    const list = byLevel[lv] || [];
    out.push(`## ${lv}`);
    out.push("");
    out.push(`> 本等级共 **${list.length}** 条`);
    out.push("");
    list.forEach((p, i) => out.push(renderPoint(p, i + 1)));
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, out.join("\n"), "utf8");
  console.log(`已导出 ${total} 条语法 → ${outFile}`);
  for (const lv of LEVEL_ORDER) {
    console.log(`  ${lv}: ${(byLevel[lv] || []).length} 条`);
  }
}

main();
