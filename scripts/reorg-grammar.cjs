#!/usr/bin/env node
/*
 * 语法页重构：从语法条词典移除三类条目
 *   1) 数量词（基数词/序数词/常用助数词）→ 挪到指引页「数量词」栏目
 *   2) 变形/接续重复条目（动词变形 + 形容词变形/接续，17 条）→ 指引页「动词/三类谓语句/核心逻辑」已覆盖，去重
 *   3) 敬语（尊他/自谦/郑重，40 条）→ 挪到指引页「尊他·自谦」栏目
 *
 * 被移除的 60 条先导出到 .tmp_proofread/removed-grammar.json 供新建组件使用，
 * 再从源文件过滤写回（复用 fix-round3.cjs 的 serializePoint 格式）。
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "app", "data", "jp-grammar-points.ts");
const OUT = path.join(ROOT, ".tmp_proofread", "removed-grammar.json");

/* ---- 60 条待移除 id ---- */
const numbers = ["n5-013", "n5-014", "n5-015"];
const conjugation = [
  "n5-016", "n5-017", "n5-018", "n5-019", "n5-020", "n5-021", "n5-022",
  "n5-028", "n5-029", "n5-030", "n5-031", "n5-032",
  "n5-033", "n5-034", "n5-035", "n5-036", "n5-037",
];
const keigo = [
  // N4 076~108
  ...[...Array(108 - 76 + 1).keys()].map((i) => `n4-${String(76 + i).padStart(3, "0")}`),
  // N3
  "n3-482", "n3-483", "n3-484",
  // N2
  "n2-347", "n2-348", "n2-349",
  // N1
  "n1-123",
];
const REMOVE = [...numbers, ...conjugation, ...keigo];
const REMOVE_SET = new Set(REMOVE);

function loadPoints() {
  const src = fs.readFileSync(SRC, "utf8");
  const markerIdx = src.indexOf("grammarPoints");
  const eqIdx = src.indexOf("=", markerIdx);
  const startIdx = src.indexOf("[", eqIdx);
  const endIdx = src.lastIndexOf("]");
  const literal = src.slice(startIdx, endIdx + 1);
  return new Function(`return (${literal});`)();
}

function serializePoint(p) {
  const parts = [
    `{ id: ${JSON.stringify(p.id)}, pattern: ${JSON.stringify(p.pattern)}, setsuzoku: ${JSON.stringify(p.setsuzoku)}, meaning: ${JSON.stringify(p.meaning)}, examples: [${p.examples.map((e) => `{ jp: ${JSON.stringify(e.jp)}, zh: ${JSON.stringify(e.zh)} }`).join(", ")}]`,
  ];
  if (p.note !== undefined && p.note !== "") parts.push(`note: ${JSON.stringify(p.note)}`);
  if (p.analysis !== undefined && p.analysis !== "") parts.push(`analysis: ${JSON.stringify(p.analysis)}`);
  parts.push(`level: ${JSON.stringify(p.level)}`);
  return `  ${parts.join(", ")} }`;
}

const points = loadPoints();

const removed = points.filter((p) => REMOVE_SET.has(p.id));
const kept = points.filter((p) => !REMOVE_SET.has(p.id));

// 校验：60 条全部命中
const removedIds = new Set(removed.map((p) => p.id));
const missing = REMOVE.filter((id) => !removedIds.has(id));
if (missing.length) {
  console.error(`[缺失] 未命中的 id：${missing.join(", ")}`);
  process.exit(1);
}

// 导出被移除条目供建组件
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(removed, null, 2), "utf8");

// 过滤写回
const src = fs.readFileSync(SRC, "utf8");
const EOL = src.includes("\r\n") ? "\r\n" : "\n";
const head = src.slice(0, src.indexOf("export const grammarPoints: GrammarPoint[] = [") + "export const grammarPoints: GrammarPoint[] = [".length);
const body = kept.map(serializePoint).join("," + EOL);
const final = head + EOL + body + EOL + "];" + EOL;
fs.writeFileSync(SRC, final, "utf8");

console.log(`原条目数：${points.length}`);
console.log(`移除：${removed.length} 条（数量词 ${numbers.length} + 变形/接续 ${conjugation.length} + 敬语 ${keigo.length}）`);
console.log(`剩余：${kept.length} 条`);
console.log(`已导出被移除条目到：${path.relative(ROOT, OUT)}`);
