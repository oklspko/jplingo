#!/usr/bin/env node
/**
 * 生成「句子生长」第二课：jp-grow-02.json（图书馆读书）
 *
 * 用法：node scripts/build-grow-02.cjs [--write]
 *   - 不带 --write：只做校验并打印练习顺序预览（不落盘）
 *   - 带 --write：写出 public/courses/jp-growing/jp-grow-02.json
 *
 * 生成前会按 CLAUDE.md 里的五条不变量自检：
 *   1) 词先句后（模拟 buildGrowingOrder，词必须在首次进句前单练）
 *   2) 已练词不重复单练
 *   3) 助词只随句子出现、不作为单词
 *   4) 句内内容词形式与单词表精确一致（动词形式必须一致）
 *   5) 主生长链每一步 = 前一句 + 至少一个新成分，且内容词数严格递增
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public/courses/jp-growing/jp-grow-02.json");

const PARTICLES = new Set("をでにはとものなへがよりからまで".split(""));

// ===== 单词表（japanese / kana / romaji / chinese）=====
const WORDS = [
  ["私", "わたし", "watashi", "我"],
  ["本", "ほん", "hon", "书"],
  ["読みます", "よみます", "yomimasu", "读"],
  ["日本語", "にほんご", "nihongo", "日语"],
  ["図書館", "としょかん", "toshokan", "图书馆"],
  ["毎週", "まいしゅう", "maishuu", "每周"],
  ["土曜日", "どようび", "doyoubi", "星期六"],
  ["静か", "しずか", "shizuka", "安静"],
  ["新しい", "あたらしい", "atarashii", "新的"],
  ["雑誌", "ざっし", "zasshi", "杂志"],
  ["面白い", "おもしろい", "omoshiroi", "有趣的"],
  ["友達", "ともだち", "tomodachi", "朋友"],
  ["一緒に", "いっしょに", "issho ni", "一起"],
  ["新聞", "しんぶん", "shinbun", "报纸"],
  ["ゆっくり", "ゆっくり", "yukkuri", "慢慢地"],
  ["日曜日", "にちようび", "nichiyoubi", "星期日"],
  ["明るい", "あかるい", "akarui", "明亮的"],
  ["部屋", "へや", "heya", "房间"],
  ["音楽", "おんがく", "ongaku", "音乐"],
  ["聞きます", "ききます", "kikimasu", "听"],
  ["昨日", "きのう", "kinou", "昨天"],
  ["公園", "こうえん", "kouen", "公园"],
  ["写真", "しゃしん", "shashin", "照片"],
  ["撮りました", "とりました", "torimashita", "拍了（照）"],
  ["明日", "あした", "ashita", "明天"],
  ["勉強します", "べんきょうします", "benkyou shimasu", "学习"],
  ["毎朝", "まいあさ", "maiasa", "每天早上"],
  ["毎晩", "まいばん", "maiban", "每天晚上"],
  ["読みました", "よみました", "yomimashita", "读了"],
  ["コーヒー", "こーひー", "koohii", "咖啡"],
  ["飲みます", "のみます", "nomimasu", "喝"],
];

// ===== 句子：tokens 用空格分隔的原文（内容词必须与单词表完全一致，助词单独成 token）=====
// 主生长链：每一步 = 前一句 + 一个新成分，内容词数严格递增
const CHAIN = [
  ["私は本を読みます", "我读书。"],
  ["私は日本語の本を読みます", "我读日语书。"],
  ["私は図書館で日本語の本を読みます", "我在图书馆读日语书。"],
  ["私は毎週図書館で日本語の本を読みます", "我每周在图书馆读日语书。"],
  ["私は毎週土曜日に図書館で日本語の本を読みます", "我每周六在图书馆读日语书。"],
  ["私は毎週土曜日に静かな図書館で日本語の本を読みます", "我每周六在安静的图书馆读日语书。"],
  ["私は毎週土曜日に静かな図書館で新しい日本語の本を読みます", "我每周六在安静的图书馆读新的日语书。"],
  [
    "私は毎週土曜日に静かな図書館で新しい日本語の本と雑誌を読みます",
    "我每周六在安静的图书馆读新的日语书和杂志。",
  ],
  [
    "私は毎週土曜日に静かな図書館で新しい日本語の本と面白い雑誌を読みます",
    "我每周六在安静的图书馆读新的日语书和有趣的杂志。",
  ],
  [
    "私は毎週土曜日に静かな図書館で友達と新しい日本語の本と面白い雑誌を読みます",
    "我每周六在安静的图书馆和朋友读新的日语书和有趣的杂志。",
  ],
  [
    "私は毎週土曜日に静かな図書館で友達と一緒に新しい日本語の本と面白い雑誌を読みます",
    "我每周六在安静的图书馆和朋友一起读新的日语书和有趣的杂志。",
  ],
  [
    "私は毎週土曜日に静かな図書館で友達と一緒に新しい日本語の本と面白い雑誌と新聞を読みます",
    "我每周六在安静的图书馆和朋友一起读新的日语书、有趣的杂志和报纸。",
  ],
  [
    "私は毎週土曜日に静かな図書館で友達と一緒に新しい日本語の本と面白い雑誌と新聞をゆっくり読みます",
    "我每周六在安静的图书馆和朋友一起慢慢地读新的日语书、有趣的杂志和报纸。",
  ],
];

// 同类替换 / 时态变化 / 巩固句（引入剩余单词）
const EXTRA = [
  ["私は毎週日曜日に明るい部屋で音楽を聞きます", "我每周日在明亮的房间里听音乐。"],
  ["明日私は図書館で日本語を勉強します", "明天我在图书馆学日语。"],
  ["昨日私は友達と公園で写真を撮りました", "昨天我和朋友在公园拍了照片。"],
  ["私は毎朝新聞を読みます", "我每天早上读报纸。"],
  ["私は毎晩コーヒーを飲みます", "我每天晚上喝咖啡。"],
  ["昨日私は図書館で本を読みました", "昨天我在图书馆读了书。"],
  ["私は毎朝コーヒーを飲みます", "我每天早上喝咖啡。"],
];

const KANA = new Map(WORDS.map(([ja, kana]) => [ja, kana]));

/** 把一句日文切成 token：能匹配到单词表的取单词 kana，其余按助词处理 */
function tokenize(sentence) {
  const tokens = [];
  let i = 0;
  // 贪心最长匹配：单词表里的词优先，剩下的单字按助词处理
  while (i < sentence.length) {
    let matched = null;
    for (const [ja, kana] of KANA) {
      if (sentence.startsWith(ja, i) && (!matched || ja.length > matched[0].length)) {
        matched = [ja, kana];
      }
    }
    if (matched) {
      tokens.push({ text: matched[0], kana: matched[1] });
      i += matched[0].length;
      continue;
    }
    const ch = sentence[i];
    if (!PARTICLES.has(ch)) {
      throw new Error(`「${sentence}」第 ${i + 1} 个字符「${ch}」既不是单词表里的词，也不是助词`);
    }
    tokens.push({ text: ch, kana: ch });
    i += 1;
  }
  return tokens;
}

function build() {
  const statements = [];
  const wordById = new Map(WORDS.map((w, idx) => [w[0], w]));
  let n = 0;
  const nextId = () => String(++n).padStart(2, "0");

  for (const [ja, kana, romaji, chinese] of WORDS) {
    statements.push({
      id: nextId(),
      chinese,
      japanese: ja,
      kana,
      romaji,
      tokens: [{ text: ja, kana }],
    });
  }

  const sentenceStatements = [];
  for (const [japanese, chinese] of [...CHAIN, ...EXTRA]) {
    const tokens = tokenize(japanese);
    const romaji = tokens
      .map((t) => {
        const w = wordById.get(t.text);
        if (w) return w[2];
        // 助词读音：は读 wa、へ读 e，其余同字
        if (t.text === "は") return "wa";
        if (t.text === "へ") return "e";
        return t.text;
      })
      .join(" ");
    const kana = tokens.map((t) => t.kana).join("");
    const st = { id: nextId(), chinese, japanese, kana, romaji, tokens };
    statements.push(st);
    sentenceStatements.push(st);
  }

  return { statements, sentenceStatements };
}

function contentWords(st) {
  return (st.tokens || []).filter((t) => !PARTICLES.has(t.text)).map((t) => t.text);
}

/** 复刻 buildGrowingOrder，用来校验不变量并预览出题顺序 */
function buildGrowingOrder(statements) {
  const seen = new Set();
  const unique = statements.filter((s) => (seen.has(s.japanese) ? false : (seen.add(s.japanese), true)));
  const words = unique.filter((s) => (s.tokens || []).length <= 1);
  const sentences = unique.filter((s) => (s.tokens || []).length > 1);
  const wordByText = new Map(words.map((w) => [w.japanese, w]));
  const learned = new Set();
  const out = [];
  for (const sentence of sentences) {
    const used = [];
    for (const t of sentence.tokens || []) {
      const w = wordByText.get(t.text);
      if (w && !learned.has(w.japanese) && !used.some((u) => u.japanese === w.japanese)) {
        used.push(w);
      }
    }
    for (const w of used) {
      out.push(w);
      learned.add(w.japanese);
    }
    out.push(sentence);
  }
  for (const w of words) if (!learned.has(w.japanese)) out.push(w);
  return out;
}

function validate(statements, sentenceStatements) {
  const problems = [];
  const wordSet = new Set(WORDS.map((w) => w[0]));

  // 3) 助词不能是单词
  for (const w of WORDS) {
    if (PARTICLES.has(w[0]) || w[0].length === 1 && PARTICLES.has(w[0])) {
      problems.push(`助词「${w[0]}」不该作为单词`);
    }
  }

  // 4) 句内内容词必须精确匹配单词表
  for (const st of sentenceStatements) {
    for (const t of st.tokens) {
      if (!PARTICLES.has(t.text) && !wordSet.has(t.text)) {
        problems.push(`「${st.japanese}」的内容词「${t.text}」不在单词表`);
      }
    }
    if (!st.kana || !st.romaji || !st.chinese) problems.push(`「${st.japanese}」缺 kana/romaji/chinese`);
  }

  // 5) 主生长链：内容词数严格递增，且每步只多一个内容词
  let prev = 0;
  for (const [japanese] of CHAIN) {
    const st = sentenceStatements.find((s) => s.japanese === japanese);
    const count = contentWords(st).length;
    if (count <= prev) problems.push(`生长链「${japanese}」内容词数没有增加（${prev} → ${count}）`);
    if (prev && count !== prev + 1) {
      problems.push(`生长链「${japanese}」一次加了 ${count - prev} 个内容词（应恰好 1 个）`);
    }
    prev = count;
  }
  const lastChain = sentenceStatements.find((s) => s.japanese === CHAIN[CHAIN.length - 1][0]);
  const lastCount = contentWords(lastChain).length;
  if (lastCount < 15) problems.push(`终句内容词只有 ${lastCount} 个（要求 ≥15）`);

  // 所有单词都要在句子里用过（避免出现「孤立词最后学」）
  const used = new Set();
  for (const st of sentenceStatements) for (const w of contentWords(st)) used.add(w);
  for (const w of WORDS) if (!used.has(w[0])) problems.push(`单词「${w[0]}」没有任何句子用到`);

  // 1)(2) 用 buildGrowingOrder 复核词先句后 / 不重复单练
  const order = buildGrowingOrder(statements);
  const learned = new Set();
  for (const st of order) {
    if ((st.tokens || []).length > 1) {
      for (const w of contentWords(st)) {
        if (!learned.has(w)) problems.push(`词先句后被破坏：「${st.japanese}」用到未单练的「${w}」`);
      }
    } else {
      if (learned.has(st.japanese)) problems.push(`单词「${st.japanese}」被单练了两次`);
      learned.add(st.japanese);
    }
  }

  // id 必须连续（01…N）
  const ids = statements.map((s) => s.id);
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] !== String(i + 1).padStart(2, "0")) {
      problems.push(`id 不连续：第 ${i + 1} 个是「${ids[i]}」`);
      break;
    }
  }

  return { problems, order };
}

function main() {
  const { statements, sentenceStatements } = build();
  const { problems, order } = validate(statements, sentenceStatements);

  const words = statements.filter((s) => (s.tokens || []).length <= 1);
  const chainLast = sentenceStatements.find((s) => s.japanese === CHAIN[CHAIN.length - 1][0]);
  console.log(`第二课：${words.length} 单词 + ${sentenceStatements.length} 句子 = ${statements.length} 条`);
  console.log(`主链终句（${contentWords(chainLast).length} 内容词 / ${chainLast.tokens.length} token）：`);
  console.log(`  ${chainLast.japanese}`);
  console.log("\n按算法重排后的前 14 项（练习页实际出题顺序）：");
  order.slice(0, 14).forEach((s, i) => {
    const kind = (s.tokens || []).length > 1 ? "句" : "词";
    console.log(`  ${String(i + 1).padStart(2)}. [${kind}] ${s.japanese}`);
  });

  if (problems.length) {
    console.error("\n校验失败：");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log("\n五条不变量校验：全部通过");

  const course = {
    id: "jp-grow-02",
    coursePackId: "jp-growing",
    title: "图书馆读书",
    order: 2,
    statements,
  };

  if (process.argv.includes("--write")) {
    fs.writeFileSync(OUT, JSON.stringify(course, null, 2) + "\n", "utf8");
    console.log(`\n已写出 ${path.relative(ROOT, OUT)}（${(fs.statSync(OUT).size / 1024).toFixed(1)} KB）`);
    console.log("记得把 \"jp-grow-02\" 加进 public/courses/course-packs.json 的 jp-growing.courses");
  } else {
    console.log("\n（预览模式，未落盘；加 --write 写出文件）");
  }
}

main();
