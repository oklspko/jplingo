// 从 parsed.txt 生成「高考必背单词」课程包
// 用法: node .tmp_docx/build_vocab.mjs
import fs from "fs";
import * as kuromoji from "@patdx/kuromoji";
import NodeDictionaryLoader from "@patdx/kuromoji/node";

const PACK_ID = "jp-gaokao";
const WORDS_PER_COURSE = 30;
const REPEATS = 3;

// ---- 文档分类（行号区间，1-based，含首尾）。已校正“标题提前/内容溢出”的错位。----
const CATEGORIES = [
  { title: "一类形容词", from: 4, to: 113 },
  { title: "二类形容词", from: 115, to: 222 },
  { title: "动词必考", from: 224, to: 303 },
  { title: "动词高频", from: 305, to: 384 },
  { title: "动词低频", from: 386, to: 542 },
  { title: "副词高频", from: 543, to: 658 },
  { title: "副词低频", from: 660, to: 684 },
  { title: "名词必考", from: 686, to: 769 },
  { title: "名词高频", from: 771, to: 906 },
  { title: "名词低频", from: 908, to: 1423 },
  { title: "接续词", from: 1424, to: 1473 },
  { title: "外来语", from: 1474, to: 1661 },
  { title: "语气词", from: 1662, to: 1668 },
  { title: "量词", from: 1670, to: 1690 },
  { title: "常用会话短句", from: 1692, to: 1729 },
  { title: "常用惯用表达", from: 1731, to: 1819 },
];

// ---- 接续词：无分隔符（“また而且、还有”），用词表前缀匹配 ----
const CONJUNCTIONS = {
  "また": "而且、还有",
  "そして": "然后；而且",
  "それから": "然后；还有",
  "さらに": "再有、更加",
  "それに": "而且、还有",
  "そのうえ": "而且、加上",
  "しかも": "而且；却",
  "なお": "再者、此外",
  "および": "以及、和",
  "しかし": "但是",
  "ところが": "可是",
  "でも": "但是",
  "けれども": "但是",
  "だが": "但是",
  "それなのに": "尽管那样",
  "それが": "可是",
  "だけど": "但是",
  "とはいえ": "尽管那样",
  "とはいうものの": "尽管那样",
  "それで": "因此；后来",
  "すると": "于是；那么",
  "だから": "因此、所以",
  "そこで": "因此；那么",
  "それなら": "那样的话",
  "そのため": "因此、为此",
  "ゆえに": "所以、故而",
  "そうすると": "这样的话",
  "したがって": "因此、从而",
  "そうして": "然后；而且",
  "つまり": "即、就是",
  "例えば": "比如、例如",
  "すなわち": "即、正是",
  "ただし": "但、但是",
  "なぜなら": "为何、何故",
  "というのは": "是因为",
  "要するに": "总之",
  "あるいは": "或者",
  "それも": "还是、或者",
  "一方": "另一方面",
  "または": "或者、要么",
  "逆に": "反过来",
  "もしくは": "或、或者",
  "それでは": "那么、那就",
  "ところで": "欸、话说",
  "ときに": "唉、对了",
  "では": "那么、那",
  "さて": "那么",
  "そもそも": "说起来",
};

// ---- 编号外来语（“173 リーダー”）缺失释义，手动补齐 ----
const NUMBERED_LOANWORD_MEANINGS = {
  "リーダー": "领导者、领袖",
  "リズム": "节奏",
  "ルール": "规则",
  "レジ": "收银台",
  "レストラン": "餐厅",
  "レベル": "水平、级别",
  "レポート": "报告",
  "ローレースカート": "低腰裙",
  "ロッカー": "储物柜",
  "ロビー": "大厅",
  "ロボット": "机器人",
  "ワンピース": "连衣裙",
  "マスク": "口罩",
  "ウイルス": "病毒",
  "コロナウイルス": "新冠病毒",
};

// ---- 文档缺失释义的名词（1323-1350）----
const MISSING_MEANINGS = {
  "花見": "赏花、赏樱",
  "場面": "场面、场景",
  "早起き": "早起",
  "晴": "晴、晴天",
  "範囲": "范围",
  "晩ご飯": "晚饭",
  "判断": "判断",
  "半年": "半年",
  "番号": "号码",
  "東": "东、东方",
  "飛行機": "飞机",
  "美術": "美术",
  "否定": "否定",
  "一つ": "一个、一岁",
  "一人一人": "每个人、一个一个",
  "ひどい目": "倒霉、吃苦头",
  "暇": "空闲、闲暇",
  "秘密": "秘密",
  "費用": "费用",
  "病院": "医院",
  "評価": "评价",
  "表紙": "封面",
  "表情": "表情",
  "評判": "评价、口碑",
  "表面": "表面",
  "昼ご飯": "午饭",
  "昼寝": "午睡",
  "広場": "广场",
};

// ---- 词形 OCR 修正（汉字写错，按文档读音还原正确词形）----
const WORD_FIXES = {
  "アイデア・アイデア": "アイデア",
  "コマmercial": "コマーシャル",
  "センタンス": "センテンス",
  "ディープイディー": "ディーブイディー",
  "頭が아がない": "頭が上がらない",
  "危険い": "危ない",
  "狡猾い": "ずるい",
  "追い頂く": "追いつく",
  "抑さえる": "押さえる",
  "收入": "収入",
  "お笑い": "おしゃべり",
  "塩辛い": "しょっぱい",
};

// ---- 文档读音正确但 kuromoji 会误读的同音词/特殊读法（按行号强制指定读音）----
const DOC_KANA = {
  44: "からい",       // 辛い 辣
  131: "ぬるい",      // 温い
  626: "おおぜい",    // 大勢
  690: "うち",        // 家
  696: "かた",        // 方（人）
  728: "ほか",        // 他
  784: "かわ",        // 側
  809: "たび",        // 度
  903: "ふるさと",    // 故郷
  934: "おおぜい",    // 大勢
  969: "かど",        // 角
  1028: "そのあと",   // その後
  1029: "そば",       // 側・傍
  1056: "みんな",     // 皆
  1070: "へん",       // 辺
  1126: "かな",       // 仮名
  1206: "こめ",       // 米
  1337: "ひとりひとり", // 一人一人
  1356: "ふたり",     // 二人
  1675: "さい",       // 歳（量词）
  1682: "しゅ",       // 種（量词）
  1684: "い",         // 位（量词）
  1685: "けん",       // 軒（量词）
  1688: "とう",       // 頭（量词，原“どう”系とう之误）
};

// ---- 文档本身有误（词形/读音/释义），整条覆盖 ----
const LINE_OVERRIDES = {
  170: { word: "かわいい", kana: "かわいい", chinese: "可爱、讨人喜欢" }, // 原“可哀想/可怜”系かわいそう之误
  230: { word: "僅か", kana: "わずか", chinese: "仅仅、稍微、一点点" },     // 原“催か”为错别字
  263: { word: "変える", kana: "かえる", chinese: "改变、更改" },           // 原“変わる”与（他二）かえる 不符
};

const isHeading = (s) => /^【[^】]*】$/.test(s) || /^[一二三四五六七八九十]+、/.test(s);
const KANA_ONLY = /^[ぁ-んァ-ヶー゛゜ゔ・]+$/;
const KANJI_ONLY = /^[\u4e00-\u9fff・]+$/;
const hasKanji = (s) => /[\u4e00-\u9fff]/.test(s);

function splitEntry(raw) {
  let freq = "";
  const fm = raw.match(/^【(高|中|低|必|未)】\s*/);
  if (fm) { freq = fm[1]; raw = raw.slice(fm[0].length).trim(); }
  const nm = raw.match(/^\d+\s+/);
  if (nm) raw = raw.slice(nm[0].length).trim();

  let wordPart = raw;
  let meaningPart = "";

  // 1) 词（…）后跟内容的边界
  const paren = raw.match(/^[^\s（(]+[（(][^）)]*[）)]/);
  if (paren && paren[0].length < raw.length) {
    wordPart = raw.slice(0, paren[0].length).trim();
    meaningPart = raw.slice(paren[0].length);
  } else {
    // 2) 重音边界
    const acc = raw.search(/[①-⑳]/);
    if (acc > 0) {
      wordPart = raw.slice(0, acc).trim();
      meaningPart = raw.slice(acc);
    } else {
      // 3) 空白边界
      const ws = raw.search(/\s{2,}|\s(?=\p{Script=Han})/u);
      if (ws > 0) {
        wordPart = raw.slice(0, ws).trim();
        meaningPart = raw.slice(ws);
      } else {
        // 4) 接续词前缀
        const key = Object.keys(CONJUNCTIONS)
          .sort((a, b) => b.length - a.length)
          .find((k) => raw.startsWith(k));
        if (key) { wordPart = key; meaningPart = CONJUNCTIONS[key]; }
      }
    }
  }

  // 词形中仍带括号时：正常「汉字（假名）」 / 反向「假名（汉字）」
  let word = wordPart;
  let docKana = "";
  const p = wordPart.match(/^([^\s（(]+)\s*[（(]([^）)]*)[）)]$/);
  if (p) {
    const leading = p[1].trim();
    const inside = p[2].trim();
    if (KANA_ONLY.test(inside)) { word = leading; docKana = inside; }
    else if (KANJI_ONLY.test(inside)) { word = inside.split("・")[0]; docKana = leading; }
    else { word = leading; }
  }

  const meaning = meaningPart
    .replace(/[①-⑳]/g, "")
    .replace(/[（(](?:自|他)[一二三四五]?[）)]/g, "")
    .replace(/[。、，；]+$/g, "")
    .trim();

  return { freq, word, docKana, meaning };
}

// ---- 罗马字（匹配现有课程：を->wo，ー->叠母音，っ->叠辅音，、->", "，・->空格）----
const KANA2ROMAJI = {
  "あ":"a","い":"i","う":"u","え":"e","お":"o",
  "か":"ka","き":"ki","く":"ku","け":"ke","こ":"ko",
  "さ":"sa","し":"shi","す":"su","せ":"se","そ":"so",
  "た":"ta","ち":"chi","つ":"tsu","て":"te","と":"to",
  "な":"na","に":"ni","ぬ":"nu","ね":"ne","の":"no",
  "は":"ha","ひ":"hi","ふ":"fu","へ":"he","ほ":"ho",
  "ま":"ma","み":"mi","む":"mu","め":"me","も":"mo",
  "や":"ya","ゆ":"yu","よ":"yo",
  "ら":"ra","り":"ri","る":"ru","れ":"re","ろ":"ro",
  "わ":"wa","を":"wo","ん":"n",
  "が":"ga","ぎ":"gi","ぐ":"gu","げ":"ge","ご":"go",
  "ざ":"za","じ":"ji","ず":"zu","ぜ":"ze","ぞ":"zo",
  "だ":"da","ぢ":"ji","づ":"zu","で":"de","ど":"do",
  "ば":"ba","び":"bi","ぶ":"bu","べ":"be","ぼ":"bo",
  "ぱ":"pa","ぴ":"pi","ぷ":"pu","ぺ":"pe","ぽ":"po",
  "きゃ":"kya","きゅ":"kyu","きょ":"kyo",
  "しゃ":"sha","しゅ":"shu","しょ":"sho",
  "ちゃ":"cha","ちゅ":"chu","ちょ":"cho",
  "にゃ":"nya","にゅ":"nyu","にょ":"nyo",
  "ひゃ":"hya","ひゅ":"hyu","ひょ":"hyo",
  "みゃ":"mya","みゅ":"myu","みょ":"myo",
  "りゃ":"rya","りゅ":"ryu","りょ":"ryo",
  "ぎゃ":"gya","ぎゅ":"gyu","ぎょ":"gyo",
  "じゃ":"ja","じゅ":"ju","じょ":"jo",
  "びゃ":"bya","びゅ":"byu","びょ":"byo",
  "ぴゃ":"pya","ぴゅ":"pyu","ぴょ":"pyo",
  "ぁ":"a","ぃ":"i","ぅ":"u","ぇ":"e","ぉ":"o",
  "ゔ":"vu",
};

function moraRomaji(kana, i) {
  const two = kana.slice(i, i + 2);
  if (KANA2ROMAJI[two] !== undefined) return { r: KANA2ROMAJI[two], len: 2 };
  const one = kana[i];
  if (KANA2ROMAJI[one] !== undefined) return { r: KANA2ROMAJI[one], len: 1 };
  return { r: one, len: 1 };
}

function toRomaji(kana) {
  let out = "";
  let i = 0;
  while (i < kana.length) {
    const ch = kana[i];
    if (ch === "ー") {
      const prev = out[out.length - 1];
      if (prev && "aeiou".includes(prev)) out += prev;
      i++;
      continue;
    }
    if (ch === "っ") {
      const next = moraRomaji(kana, i + 1);
      if (next.r && next.r !== "") out += next.r.startsWith("ch") ? "t" : next.r[0];
      i++;
      continue;
    }
    if (ch === "・") { out += " "; i++; continue; }
    if (ch === "、" || ch === "，") { out += ", "; i++; continue; }
    const m = moraRomaji(kana, i);
    out += m.r;
    i += m.len;
  }
  return out;
}

function katakanaToHiragana(str) {
  return str.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- 主流程 ----
const tokenizer = await new kuromoji.TokenizerBuilder({
  loader: new NodeDictionaryLoader({ dic_path: "node_modules/@patdx/kuromoji/dict/" }),
}).build();

const lines = fs.readFileSync(".tmp_docx/parsed.txt", "utf8").split("\n");

function resolveKana(word, docKana, line) {
  if (DOC_KANA[line]) return DOC_KANA[line];
  if (!hasKanji(word)) return katakanaToHiragana(word);
  const doc = docKana ? katakanaToHiragana(docKana) : "";
  // 词形含「・」= 同一读音的异写（十分・充分 / 早く・速く），直接取文档单一读音
  if (word.includes("・") && doc) return doc;
  const toks = tokenizer.tokenize(word);
  const reading = toks.map((t) => t.reading || t.surface_form).join("");
  const kuro = katakanaToHiragana(reading);
  if (hasKanji(kuro)) return doc || word; // kuromoji 无法读出
  return kuro;
}

const data = [];
const issues = [];

for (const cat of CATEGORIES) {
  for (let ln = cat.from; ln <= cat.to; ln++) {
    const rawLine = lines[ln - 1];
    if (!rawLine) continue;
    const raw = rawLine.replace(/^\[P:\]\s*/, "").trim();
    if (!raw || isHeading(raw)) continue;

    if (LINE_OVERRIDES[ln]) {
      const o = LINE_OVERRIDES[ln];
      data.push({ category: cat.title, word: o.word, kana: o.kana, romaji: toRomaji(o.kana), chinese: o.chinese, freq: "", line: ln, docKana: "" });
      continue;
    }

    let entry = splitEntry(raw);
    if (WORD_FIXES[entry.word]) entry.word = WORD_FIXES[entry.word];
    if (!entry.meaning && NUMBERED_LOANWORD_MEANINGS[entry.word]) entry.meaning = NUMBERED_LOANWORD_MEANINGS[entry.word];
    if (!entry.meaning && MISSING_MEANINGS[entry.word]) entry.meaning = MISSING_MEANINGS[entry.word];

    const kana = resolveKana(entry.word, entry.docKana, ln);
    const romaji = toRomaji(kana);

    data.push({ category: cat.title, word: entry.word, kana, romaji, chinese: entry.meaning, freq: entry.freq, line: ln, docKana: entry.docKana });

    if (!entry.meaning) issues.push(`[无释义] L${ln} ${entry.word}`);
    if (hasKanji(kana)) issues.push(`[kana含汉字] L${ln} ${entry.word} -> "${kana}"`);
  }
}

// ---- 生成课程 ----
const pad = (n) => String(n).padStart(2, "0");
const courses = [];
let order = 0;
const seed = 20260926;

for (const cat of CATEGORIES) {
  const words = data.filter((d) => d.category === cat.title);
  const chunkCount = Math.ceil(words.length / WORDS_PER_COURSE);
  for (let c = 0; c < chunkCount; c++) {
    const chunk = words.slice(c * WORDS_PER_COURSE, (c + 1) * WORDS_PER_COURSE);
    order++;
    const courseId = `${PACK_ID}-${pad(order)}`;
    const rnd = mulberry32(seed + order * 7919);

    const statements = [];
    for (let pass = 0; pass < REPEATS; pass++) {
      for (const w of shuffle(chunk, rnd)) {
        statements.push({
          id: pad(statements.length + 1),
          chinese: w.chinese,
          japanese: w.word,
          kana: w.kana,
          romaji: w.romaji,
          tokens: [{ text: w.word, kana: w.kana }],
        });
      }
    }

    courses.push({ id: courseId, coursePackId: PACK_ID, title: `${cat.title} ${c + 1}`, order, statements });
  }
}

// ---- 写文件 ----
const outDir = `public/courses/${PACK_ID}`;
fs.mkdirSync(outDir, { recursive: true });
for (const course of courses) {
  fs.writeFileSync(`${outDir}/${course.id}.json`, JSON.stringify(course, null, 2) + "\n");
}

const packMeta = {
  id: PACK_ID,
  title: "高考必背单词",
  language: "ja",
  level: "高考",
  description: "依据《日语必考词汇分类整理》按词类整理的必考词汇，一课 30 词、每词循环 3 遍（无序）",
};
fs.writeFileSync(`${outDir}/course-pack.json`, JSON.stringify(packMeta, null, 2) + "\n");

const packsJson = JSON.parse(fs.readFileSync("public/courses/course-packs.json", "utf8"));
const courseIds = courses.map((c) => c.id);
const existing = packsJson.coursePacks.find((p) => p.id === PACK_ID);
if (existing) existing.courses = courseIds;
else packsJson.coursePacks.push({ ...packMeta, courses: courseIds });
fs.writeFileSync("public/courses/course-packs.json", JSON.stringify(packsJson, null, 2) + "\n");

const tsv = [
  "line\tcategory\tfreq\tword\tkana\tromaji\tchinese\tdocKana",
  ...data.map((d) => [d.line, d.category, d.freq, d.word, d.kana, d.romaji, d.chinese, d.docKana].join("\t")),
].join("\n");
fs.writeFileSync(".tmp_docx/review.tsv", tsv);

const byCat = {};
for (const d of data) byCat[d.category] = (byCat[d.category] || 0) + 1;

console.log("=== 分类词数 ===");
for (const cat of CATEGORIES) console.log(`${cat.title}\t${byCat[cat.title] || 0}`);
console.log(`\n总计词条: ${data.length}`);
console.log(`课程数: ${courses.length}`);
console.log(`\n=== 待复核 (${issues.length}) ===`);
for (const it of issues) console.log(it);
