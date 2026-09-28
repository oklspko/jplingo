#!/usr/bin/env node
/*
 * 语法条接续栏校对（第二轮）：根据校对报告「接续栏校对结果」，
 * 在 round-1（apply-grammar-fixes.cjs）输出之上继续修正。
 *
 * 1) 实质性接续错误（「应为 X」）——整字段覆盖
 * 2) 接续栏混入说明/释义/例句——抽出纯接续，并把释义补进 meaning
 * 3) 格式混乱条目——重写为干净的接续
 * 4) 全局归一化（仅 setsuzoku 字段）：
 *      ASCII "+" → "＋"；词干/語干 → 語幹；辞书形 → 辞書形；
 *      动词→動詞、名词→名、い/な形容词→イ形/ナ形、助词→助詞、
 *      数量词→数量詞、疑问词→疑問詞、各词类→各詞類、形容词→形容詞；
 *      动(非"詞")→動詞（合并 N2/N1 的「動」缩写）；压缩多余空格。
 *
 * 定位方式：按「等级 + 该等级内序号」（第N条 = 该等级内第 N 条，源顺序）。
 * field: s=setsuzoku m=meaning n=note a=analysis p=pattern
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "app", "data", "jp-grammar-points.ts");

const C = [];
const add = (lv, n, field, to) => C.push({ lv, n, field, to });

/* ==================== 实质性 + 格式 + 说明混入 修正清单 ==================== */

/* ---- N5 ---- */
add("N5", 83, "s", "动词「て形」＋ください/动词「ない形」＋ないでください");
add("N5", 84, "s", "动词「て形」＋くださいませんか/动词「ない形」＋ないでくださいませんか");

/* ---- 条目标题（pattern）中的同类错误（round-1 只改了接续/释义，未改标题） ---- */
add("N2", 10, "p", "～がきっかけで/がきっかけになって/をきっかけに(して)/をきっかけとして");
add("N2", 38, "p", "～たいばかりに/ほしいばかりに");
add("N2", 68, "p", "～ところに / ところへ");
add("N2", 109, "p", "～にわたって / にわたり");
add("N1", 40, "p", "～だけましだ");
add("N1", 46, "p", "～たらきりがない/～ばきりがない");
add("N1", 81, "p", "～と言えなくもない");
add("N1", 94, "p", "～とはいうものの / とは言い条");
add("N1", 100, "p", "～ともなく");
add("N1", 136, "p", "～に準じ/に準じ/に準ずる");
add("N1", 160, "p", "～べく");
add("N1", 161, "p", "～べくして");
add("N1", 162, "p", "～べくもない");
add("N1", 185, "p", "～を禁じ得ない");
add("N1", 190, "p", "～を振り出しに");

/* ---- N4 ---- */
add("N4", 50, "s", "Ⅰ类动词：词尾改为「お段」假名＋う/Ⅱ类动词：「ない形」＋よう/Ⅲ类动词：する→しよう、来る→こよう");
add("N4", 91, "p", "おる");
add("N4", 106, "p", "～ておる");
add("N4", 106, "s", "动词「て形」＋おる");

/* ---- N3 ---- */
add("N3", 10, "s", "动词普通形/い形容词辞书形/な形容词词干＋な/名词＋の＋うちは、动词「ない形」＋ない＋うちに");
add("N3", 22, "s", "动词辞书形/い形容词辞书形/な形容词词干＋な/名词＋の＋くせに");
add("N3", 61, "s", "动词「て形」/い形容词词干＋く＋て/な形容词词干＋で＋しかた(が)ない/しょうがない");
add("N3", 69, "s", "人物名词＋に＋动词「て形」＋ほしい、～が动词「て形」＋ほしい");
add("N3", 109, "s", "动词「ば形」＋よかった/动词「ない形」＋なければよかった");
add("N3", 128, "s", "名词＋を＋名词＋とする");

/* ---- N2 实质性/格式 ---- */
add("N2", 6, "s", "動ます形＋得る/動ます形＋得ない");
add("N2", 44, "s", "動詞辞書形・た形/名＋の＋ついでに");
add("N2", 63, "s", "動た形＋(か)と思うと/(か)と思ったら");
add("N2", 81, "s", "動詞辞書形/名＋にあたって/にあたり");
add("N2", 103, "p", "～につけ");
add("N2", 103, "s", "動詞辞書形/名＋につけ、動詞辞書形/名＋につけ＋動詞辞書形/名＋につけ");
add("N2", 114, "p", "～のもとで/のもとに");
add("N2", 114, "s", "名＋のもとで/のもとに、名＋の名のもとに");
add("N2", 148, "s", "動使役形＋て形＋いただけますか");
add("N2", 149, "s", "動使役形＋て形＋やっていただけませんか");

/* ---- N2 说明混入 ---- */
add("N2", 13, "s", "動詞辞書形・た形/名＋かと思えば、動詞辞書形＋かといえば");
add("N2", 13, "m", "表示逆接，“原以为……却……”。 表示并列，“既……又……”。");
add("N2", 14, "s", "動詞辞書形＋か＋動ない形－ない＋かのうちに");
add("N2", 14, "m", "表示两件事情几乎同时发生，“刚……就……”、“还没……就……”。");
add("N2", 15, "s", "動ます形＋かねる/動ます形＋かねない");
add("N2", 15, "m", "表示“很难……”、“难以……”，多用于书面语，礼貌委婉地拒绝。 表示可能，“有可能……”。");
add("N2", 64, "s", "文の普通形/名＋とか/とかいうことだ/とかいう話だ/とかで");
add("N2", 69, "s", "動詞辞書形・た形・ている形＋ところを、動た形・ている形＋ところを見ると");

/* ---- N1 实质性/格式 ---- */
add("N1", 46, "s", "動ば形＋きりがない/動たら形＋たらきりがない");
add("N1", 100, "s", "動詞辞書形＋ともなく/ともなしに");
add("N1", 56, "s", "動詞辞書形/た形＋(の/ん)/名＋ではあるまいし/じゃあるまいし");
add("N1", 57, "s", "動て形/イ形～くて/ナ形～で/名～で＋てはかなわない");
add("N1", 62, "s", "動て形/イ形～くて/名・ナ形～で＋も差し支えない");
add("N1", 67, "s", "動て形/イ形～くて/名・ナ形～で＋もともとだ");
add("N1", 68, "s", "名/ナ形語幹＋でも何でもない/イ形－く＋もなんともない");
add("N1", 69, "s", "動て形/イ形－くて/ナ形・名－で＋も始まらない");
add("N1", 82, "s", "動詞辞書形/イ形/ナ形語幹/名＋といったら(ありは)しない、イ形/ナ形語幹/名＋ったらない/ったらありやしない");
add("N1", 83, "s", "これ＋といって＋～ない");
add("N1", 86, "s", "名＋だ/動普通形/イ形/ナ形＋(か)と思いきや");
add("N1", 126, "s", "名/文の普通形＋か＋にかかっている");
add("N1", 132, "s", "動詞辞書形/イ形/ナ形語幹(である)/名(である)＋に越したことはない");
add("N1", 145, "s", "動・イ形・ナ形の名詞修飾形＋の/名（であるの）＋にひきかえ/にひきかえて");
add("N1", 146, "s", "動詞辞書形/イ形/ナ形語幹/名＋にもほどがある");
add("N1", 147, "s", "動・イ形・ナ形の名詞修飾形＋の/名＋にも増して");
add("N1", 153, "s", "動ば形/イ形ければ/ナ形であれば/ならば＋こそ");
add("N1", 155, "s", "名＋の/動た形＋弾み");
add("N1", 158, "s", "動詞辞書形＋羽目になる/羽目に陥る");
add("N1", 165, "s", "動詞辞書形/た形＋までだ/までのことだ");
add("N1", 171, "s", "動た形＋(の)/名＋も同然だ/も同然の");
add("N1", 176, "s", "名＋の/動詞辞書形・た形＋矢先に");
add("N1", 178, "s", "動普通形/イ形/ナ形語幹(である)/名(である)＋(が)ゆえ(に)/ゆえの");
add("N1", 199, "s", "動普通形/イ形/ナ形語幹＋な/名＋んだって/んですって");

/* ---- N1 说明混入 ---- */
add("N1", 24, "s", "動詞辞書形・た形(が)/名＋の＋ごとき/ごとし、名＋ごとき");
add("N1", 71, "s", "名A＋と＋名B＋と（が）相まって/名A＋が＋名B＋と相まって/名B＋も相まって");
add("N1", 71, "m", "表示附加关系，两个因素相互作用，使得状态和效果更加明显。“A和B相辅相成、相互作用，(使得)……(更加)”。");
add("N1", 72, "s", "動普通形/イ形/ナ形語幹/名＋とあって");
add("N1", 72, "m", "表示因果关系。“因为……”、“由于……”。");
add("N1", 73, "s", "動辞書形/名＋とあっては");
add("N1", 73, "m", "表示假设，用来描述某种特别的情况，“若是……的话，就会……”。");
add("N1", 109, "s", "名＋なしに/なしには/なしでは、名/動詞辞書形＋こと＋なしに");
add("N1", 119, "s", "動詞辞書形/名＋に至って/に至る/に至っては/に至っても");
add("N1", 123, "s", "動詞辞書形/名＋に(は)及ばない");
add("N1", 134, "s", "名＋にして/名＋にしてはじめて/名＋にして～ない");
add("N1", 138, "s", "動詞辞書形/名＋にたえる、動詞辞書形/名＋にたえない");
add("N1", 159, "s", "動詞辞書形＋べからず/動詞辞書形＋べからざる＋名");
add("N1", 192, "s", "名＋をもって/もちまして");

/* ==================== 应用逻辑 ==================== */

function loadPoints() {
  const src = fs.readFileSync(SRC, "utf8");
  const markerIdx = src.indexOf("grammarPoints");
  const eqIdx = src.indexOf("=", markerIdx);
  const startIdx = src.indexOf("[", eqIdx);
  const endIdx = src.lastIndexOf("]");
  const literal = src.slice(startIdx, endIdx + 1);
  return new Function(`return (${literal});`)();
}

const FIELD_KEY = { s: "setsuzoku", m: "meaning", n: "note", a: "analysis", p: "pattern" };

const points = loadPoints();
const byLevel = {};
for (const p of points) (byLevel[p.level] ||= []).push(p);

const results = { ok: [], missing: [] };

for (const c of C) {
  const list = byLevel[c.lv];
  const p = list && list[c.n - 1];
  if (!p) { results.missing.push(`${c.lv}第${c.n}条 条目不存在`); continue; }
  const key = FIELD_KEY[c.field];
  p[key] = c.to;
  results.ok.push(`${c.lv}第${c.n}条 ${c.field} [${p.id}]`);
}

/* ==================== 全局归一化（仅 setsuzoku） ==================== */
function normalizeSetsuzoku(s) {
  let t = String(s);
  // 保护「動1/動2/動3」类缩写，避免被「動→動詞」误改
  t = t.replace(/動1/g, "\u0001A\u0001").replace(/動2/g, "\u0001B\u0001").replace(/動3/g, "\u0001C\u0001");

  // 术语统一（中文 → 日文）
  t = t.replace(/名词修饰形/g, "名詞修飾形").replace(/名词修飾形/g, "名詞修飾形");
  t = t.replace(/な形容词词干/g, "ナ形語幹").replace(/い形容词词干/g, "イ形語幹");
  t = t.replace(/な形容词辞书形/g, "ナ形辞書形").replace(/い形容词辞书形/g, "イ形辞書形");
  t = t.replace(/な形容词普通形/g, "ナ形普通形").replace(/い形容词普通形/g, "イ形普通形");
  t = t.replace(/な形容詞/g, "ナ形").replace(/い形容詞/g, "イ形");
  t = t.replace(/na形容词/g, "ナ形").replace(/i形容词/g, "イ形");
  t = t.replace(/な形容词/g, "ナ形").replace(/い形容词/g, "イ形");
  t = t.replace(/动词/g, "動詞").replace(/名词/g, "名");
  t = t.replace(/数量词/g, "数量詞").replace(/疑问词/g, "疑問詞");
  t = t.replace(/各词类/g, "各詞類").replace(/助词/g, "助詞").replace(/形容词/g, "形容詞");
  t = t.replace(/词干/g, "語幹").replace(/語干/g, "語幹").replace(/辞书形/g, "辞書形");

  // N2/N1 的「動」缩写 → 「動詞」（仅当后面不是「詞」，避免误伤 動詞/自動詞/他動詞）
  t = t.replace(/動(?!詞)/g, "動詞");

  // 连接符统一为全角「＋」
  t = t.replace(/\+/g, "＋");

  // 恢复保护占位
  t = t.replace(/\u0001A\u0001/g, "動1").replace(/\u0001B\u0001/g, "動2").replace(/\u0001C\u0001/g, "動3");

  // 压缩多余空格
  t = t.replace(/ {2,}/g, " ").replace(/[ \t]+/g, " ").trim();
  return t;
}

let changed = 0;
for (const p of points) {
  if (p.setsuzoku && p.setsuzoku.trim() !== "") {
    const n = normalizeSetsuzoku(p.setsuzoku);
    if (n !== p.setsuzoku) { p.setsuzoku = n; changed++; }
  }
}

/* ==================== 序列化写回 ==================== */
function serializePoint(p) {
  const parts = [
    `{ id: ${JSON.stringify(p.id)}, pattern: ${JSON.stringify(p.pattern)}, setsuzoku: ${JSON.stringify(p.setsuzoku)}, meaning: ${JSON.stringify(p.meaning)}, examples: [${p.examples.map((e) => `{ jp: ${JSON.stringify(e.jp)}, zh: ${JSON.stringify(e.zh)} }`).join(", ")}]`,
  ];
  if (p.note !== undefined && p.note !== "") parts.push(`note: ${JSON.stringify(p.note)}`);
  if (p.analysis !== undefined && p.analysis !== "") parts.push(`analysis: ${JSON.stringify(p.analysis)}`);
  parts.push(`level: ${JSON.stringify(p.level)}`);
  return `  ${parts.join(", ")} }`;
}

const src = fs.readFileSync(SRC, "utf8");
const EOL = src.includes("\r\n") ? "\r\n" : "\n";
const head = src.slice(0, src.indexOf("export const grammarPoints: GrammarPoint[] = [") + "export const grammarPoints: GrammarPoint[] = [".length);
const body = points.map(serializePoint).join("," + EOL);

/* 残留错字（note/analysis/examples 中的同类误写）全局替换 —— 精确子串，无歧义 */
const GLOBAL = [
  ["ベク", "べく"],
  ["言い余", "言い条"],
  ["ほしし", "ほしい"],
  ["禁じ不得い", "禁じ得ない"],
  ["にわた里", "にわたり"],
  ["だけました", "だけましだ"],
  ["を振り出に", "を振り出しに"],
  ["に準備する", "に準ずる"],
  ["に準備", "に準じ"],
  ["と言えばなおない", "と言えなくもない"],
  ["ともにに", "ともなしに"],
];
let final = head + EOL + body + EOL + "];" + EOL;
for (const [a, b] of GLOBAL) final = final.split(a).join(b);
fs.writeFileSync(SRC, final, "utf8");

/* ==================== 报告 ==================== */
const empty = [];
for (const p of points) {
  if (!p.setsuzoku || p.setsuzoku.trim() === "") empty.push(`${p.level}#${p.id} ${p.pattern}`);
}

console.log(`\n=== 接续栏第二轮修正结果 ===`);
console.log(`显式修正：${results.ok.length} 条`);
if (results.missing.length) {
  console.log(`未命中：${results.missing.length} 条`);
  for (const m of results.missing) console.log("  " + m);
}
console.log(`归一化改动条目数：${changed}`);
console.log(`总条目数：${points.length}`);
console.log(`\n=== 仍为空的接续栏（${empty.length} 条，需对照原书补齐，本脚本不臆造）===`);
for (const e of empty) console.log("  " + e);
