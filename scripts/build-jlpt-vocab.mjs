// 从 eggrolls/JLPT10k 词库（CC BY-NC 4.0，含中文释义）生成：
//   1) N5–N1 五个能力考课程包（public/courses/jp-n*/），包内按词性分课
//   2) 词库收纳数据（public/dict/words.json，含高考日语 + N5–N1，每词带词性 category）
// 用法：node scripts/build-jlpt-vocab.mjs
//   首次运行会从 GitHub 下载 notes.csv 并缓存到 node_modules/.cache/jlpt-notes.csv
import fs from "node:fs";
import path from "node:path";
import { toRomaji } from "wanakana";

// 片假名 → 平假名，保留长音符 ー（toHiragana 会把 ー 展开成前一元音：アパート→あぱあと）。
// 与 app/composables/jp/useJpRomaji.ts 的 katakanaToHiragana 保持一致。
function katakanaToHiragana(str) {
  return str.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

const CSV_URL =
  "https://raw.githubusercontent.com/5mdld/anki-jlpt-decks/main/deck-source/notes.csv";
const CACHE = "node_modules/.cache/jlpt-notes.csv";
const COURSES_DIR = "public/courses";
const DICT_FILE = "public/dict/words.json";
const WORDS_PER_COURSE = 30;

const JLPT_LEVELS = [
  { id: "jp-n5", label: "N5", title: "N5 词汇", level: "N5", desc: "日语能力考试 N5 核心词汇，按词性分课、一课 30 词、每词循环 3 遍（无序）" },
  { id: "jp-n4", label: "N4", title: "N4 词汇", level: "N4", desc: "日语能力考试 N4 核心词汇，按词性分课、一课 30 词、每词循环 3 遍（无序）" },
  { id: "jp-n3", label: "N3", title: "N3 词汇", level: "N3", desc: "日语能力考试 N3 核心词汇，按词性分课、一课 30 词、每词循环 3 遍（无序）" },
  { id: "jp-n2", label: "N2", title: "N2 词汇", level: "N2", desc: "日语能力考试 N2 核心词汇，按词性分课、一课 30 词、每词循环 3 遍（无序）" },
  { id: "jp-n1", label: "N1", title: "N1 词汇", level: "N1", desc: "日语能力考试 N1 核心词汇，按词性分课、一课 30 词、每词循环 3 遍（无序）" },
];

// 粗分词性（与词库页筛选、课程标题一致），顺序即包内课程顺序
const CATEGORY_ORDER = ["名词", "动词", "形容词", "副词", "其他"];

// 下载（带缓存）
async function loadCsv() {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  if (fs.existsSync(CACHE)) return fs.readFileSync(CACHE, "utf8");
  console.log("下载词库 CSV …", CSV_URL);
  const res = await fetch(CSV_URL, { redirect: "follow" });
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`);
  const text = await res.text();
  fs.writeFileSync(CACHE, text, "utf8");
  return text;
}

// 去掉 HTML 标签、折叠空白
function clean(s) {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// 把 CSV 原始词性（110 种）归并为粗分 5 类：名词/动词/形容词/副词/其他
function classifyPos(pos) {
  const first = (pos || "").split(/[・·]/)[0].trim();
  if (first === "副") return "副词";
  if (/^(名|代)/.test(first)) return "名词";
  if (/^(自動|他動|自他動|動)/.test(first) || first === "補動") return "动词";
  if (first === "イ形" || first === "ナ形" || first === "形動トタル") return "形容词";
  return "其他";
}

// 解析 CSV → { level, kanji, kana, meaning, pos, category }
function parseCsv(text) {
  const words = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const c = line.split("\t");
    if (c.length < 8) continue;
    const m = (c[1] || "").match(/::(\d)-N(\d)/);
    if (!m) continue;
    const level = "N" + m[2];
    const kanji = clean(c[3] || "");
    const rawKana = clean(c[6] || "");
    const meaning = clean(c[7] || "");
    const pos = clean(c[5] || "");
    if (!kanji) continue;
    // 外来语（カタカナ語）的「读音」列是拉丁原词 + 语源标注，读音应取原形
    const isKana = /^[ぁ-んァ-ヶー\s・]+$/.test(rawKana) && rawKana !== "";
    const kana = katakanaToHiragana(isKana ? rawKana : kanji);
    if (!kana || !meaning) continue;
    words.push({ level, kanji, kana, meaning, pos, category: classifyPos(pos) });
  }
  return words;
}

function buildCourse(packId, category, withinIndex, order, stmts) {
  return {
    id: `${packId}-${String(order).padStart(2, "0")}`,
    coursePackId: packId,
    title: `${category} ${withinIndex + 1}`,
    order,
    statements: stmts.map((w, i) => ({
      id: String(i + 1).padStart(2, "0"),
      chinese: w.meaning,
      japanese: w.kanji,
      kana: w.kana,
      romaji: toRomaji(w.kana).toLowerCase(),
      tokens: [{ text: w.kanji, kana: w.kana }],
    })),
  };
}

// 高考词库按课程标题推导粗分词性（一类/二类形容词→形容词；动词→动词；副词→副词；名词→名词；其余→其他）
function gaokaoCategory(title) {
  if (/一类形容词|二类形容词/.test(title)) return "形容词";
  if (/动词/.test(title)) return "动词";
  if (/副词/.test(title)) return "副词";
  if (/名词/.test(title)) return "名词";
  return "其他";
}

// 读取现有高考词库语句（去重），并按课程标题补词性
function loadGaokaoWords() {
  const dir = path.join(COURSES_DIR, "jp-gaokao");
  const seen = new Set();
  const out = [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^jp-gaokao-\d+\.json$/.test(f))
    .sort();
  for (const f of files) {
    const course = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const category = gaokaoCategory(course.title || "");
    for (const s of course.statements || []) {
      if (!s.japanese || seen.has(s.japanese)) continue;
      seen.add(s.japanese);
      out.push({ level: "jp-gaokao", kanji: s.japanese, kana: s.kana, meaning: s.chinese || "", pos: "", category });
    }
  }
  return out;
}

function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

async function main() {
  const csv = await loadCsv();
  const words = parseCsv(csv);
  if (!words.length) throw new Error("未解析到任何词条");
  const byLevel = {};
  for (const w of words) (byLevel[w.level] ||= []).push(w);

  const newPacks = [];
  const dictWords = [];

  for (const meta of JLPT_LEVELS) {
    const list = byLevel[meta.label] || [];
    // 按词性分组（固定顺序）
    const byCat = {};
    for (const w of list) (byCat[w.category] ||= []).push(w);

    const courseIds = [];
    let order = 0;
    const counts = {};
    for (const cat of CATEGORY_ORDER) {
      const catWords = byCat[cat] || [];
      counts[cat] = catWords.length;
      for (let i = 0; i < catWords.length; i += WORDS_PER_COURSE) {
        order += 1;
        const chunk = catWords.slice(i, i + WORDS_PER_COURSE);
        const course = buildCourse(meta.id, cat, i / WORDS_PER_COURSE, order, chunk);
        courseIds.push(course.id);
        writeJson(path.join(COURSES_DIR, meta.id, `${course.id}.json`), course);
      }
    }
    writeJson(path.join(COURSES_DIR, meta.id, "course-pack.json"), {
      id: meta.id,
      title: meta.title,
      language: "ja",
      level: meta.level,
      description: meta.desc,
    });
    newPacks.push({
      id: meta.id,
      title: meta.title,
      language: "ja",
      level: meta.level,
      description: meta.desc,
      courses: courseIds,
    });
    for (const w of list) dictWords.push({ ...w, level: meta.id });
    const catSummary = CATEGORY_ORDER.map((c) => `${c}${counts[c]}`).join(" ");
    console.log(`${meta.label}: ${list.length} 词 / ${courseIds.length} 课 | ${catSummary}`);
  }

  // 词库收纳：高考 + N5–N1
  const gaokaoWords = loadGaokaoWords();
  console.log(`高考日语: ${gaokaoWords.length} 词（复用现有词库）`);
  const allWords = [...gaokaoWords, ...dictWords];
  const levels = [
    { id: "jp-gaokao", label: "高考日语", title: "高考必背单词" },
    ...JLPT_LEVELS.map((m) => ({ id: m.id, label: m.label, title: m.title })),
  ];
  writeJson(DICT_FILE, { levels, categories: CATEGORY_ORDER, words: allWords });
  console.log(`词库收纳：${allWords.length} 词 → ${DICT_FILE}`);

  // 更新顶层 course-packs.json（在高考日语之后插入 N5–N1）
  const topFile = path.join(COURSES_DIR, "course-packs.json");
  const top = JSON.parse(fs.readFileSync(topFile, "utf8"));
  const existing = (top.coursePacks || []).filter(
    (p) => !JLPT_LEVELS.some((m) => m.id === p.id),
  );
  const gaokaoIdx = existing.findIndex((p) => p.id === "jp-gaokao");
  const insertAt = gaokaoIdx >= 0 ? gaokaoIdx + 1 : existing.length;
  existing.splice(insertAt, 0, ...newPacks);
  writeJson(topFile, { coursePacks: existing });
  console.log(`course-packs.json 已更新（共 ${existing.length} 个课程包）`);
}

main().catch((err) => {
  console.error("生成失败：", err);
  process.exit(1);
});
