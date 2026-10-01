// 模糊查询工具测试（词库、语法条库共用）
// 运行：node tests/offline-tts/run.cjs
import { fieldScore, fuzzyFilter, fuzzyScore, normalizeJa } from "../../app/utils/jpFuzzy";

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

const words = [
  { kanji: "食べる", kana: "たべる", meaning: "吃", pos: "動詞", level: "N5", category: "动词" },
  { kanji: "飲む", kana: "のむ", meaning: "喝", pos: "動詞", level: "N5", category: "动词" },
  { kanji: "図書館", kana: "としょかん", meaning: "图书馆", pos: "名詞", level: "N4", category: "名词" },
  { kanji: "タベル", kana: "タベル", meaning: "吃（片假名写法）", pos: "動詞", level: "N5", category: "动词" },
];
const fields = (w: (typeof words)[number]) => [w.kanji, w.kana, w.meaning, w.pos, w.level, w.category];
const texts = (list: typeof words) => list.map((w) => w.kanji);

function main() {
  console.log("\n[1] 归一化：片假名↔平假名、全角半角、大小写、空格标点");
  eq("片假名转平假名", normalizeJa("タベル"), "たべる");
  eq("全角字母数字", normalizeJa("Ｎ５"), "n5");
  eq("大写转小写", normalizeJa("N5"), "n5");
  eq("去掉空格与标点", normalizeJa(" たべる ・ を "), "たべるを");
  eq("罗马字转平假名", normalizeJa("taberu"), "たべる");

  console.log("\n[2] 命中等级：完全 > 前缀 > 包含 > 子序列，未命中为 0");
  check("完全相等分最高", fieldScore("たべる", "たべる") > fieldScore("たべるもの", "たべる"));
  check("前缀高于包含", fieldScore("たべる", "たべ") > fieldScore("またべる", "たべ"));
  check("包含高于子序列", fieldScore("またべる", "たべ") > fieldScore("たしかべる", "たべ"));
  check("子序列能命中（食…る）", fieldScore("食べる", "食る") > 0);
  eq("完全无关为 0", fieldScore("たべる", "さんぷる"), 0);

  console.log("\n[3] 假名 / 片假名 / 罗马字 / 汉字 都能搜到同一个词");
  eq("按假名搜", texts(fuzzyFilter(words, "たべる", fields)), ["食べる", "タベル"]);
  eq("按片假名搜（能命中平假名写法）", texts(fuzzyFilter(words, "タベル", fields)), ["食べる", "タベル"]);
  eq("按罗马字搜", texts(fuzzyFilter(words, "taberu", fields)), ["食べる", "タベル"]);
  eq("按汉字子序列搜（食る）", texts(fuzzyFilter(words, "食る", fields)), ["食べる"]);
  eq("按中文释义搜", texts(fuzzyFilter(words, "图书", fields)), ["図書館"]);

  console.log("\n[4] 空格分词：每个词都要命中（可命中不同字段）");
  eq("罗马字+词性", texts(fuzzyFilter(words, "nomu 動詞", fields)), ["飲む"]);
  eq("等级+类别", texts(fuzzyFilter(words, "n4 名词", fields)), ["図書館"]);
  eq("有一个词不命中就排除", texts(fuzzyFilter(words, "たべる 名詞", fields)), []);

  console.log("\n[5] 排序：相关度高的在前，同分保持原顺序");
  {
    const list = [
      { kanji: "またべる", kana: "またべる", meaning: "又吃", pos: "動詞", level: "N3", category: "动词" },
      { kanji: "食べる", kana: "たべる", meaning: "吃", pos: "動詞", level: "N5", category: "动词" },
      { kanji: "たべすぎる", kana: "たべすぎる", meaning: "吃多了", pos: "動詞", level: "N3", category: "动词" },
    ];
    const got = texts(fuzzyFilter(list, "たべる", (w) => [w.kanji, w.kana, w.meaning]));
    eq("完全相等排第一", got[0], "食べる");
  }
  {
    const list = [
      { kanji: "A", kana: "かき", meaning: "a", pos: "x", level: "N5", category: "c" },
      { kanji: "B", kana: "かき", meaning: "b", pos: "x", level: "N5", category: "c" },
    ];
    eq("同分保持原顺序", texts(fuzzyFilter(list, "かき", (w) => [w.kana])), ["A", "B"]);
  }

  console.log("\n[6] 边界：空查询返回原列表、空字段不炸");
  eq("空查询不过滤", texts(fuzzyFilter(words, "   ", fields)), texts(words));
  eq("全空字段得 0", fuzzyScore([undefined, null, ""], "たべる"), 0);
  check("字段里有空值时其它字段照常命中", fuzzyScore([undefined, "たべる"], "たべる") > 0);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n合计 ${results.length} 项，失败 ${failed.length} 项`);
  if (failed.length) {
    console.log("失败项：");
    for (const f of failed) console.log(`  - ${f.name}  ${f.detail ?? ""}`);
    process.exit(1);
  }
}

main();
