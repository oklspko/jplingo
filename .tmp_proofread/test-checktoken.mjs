import { toHiragana, toRomaji } from "wanakana";

function katakanaToHiragana(str) {
  return str.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

// replicate checkToken (non-single-kana)
function checkToken(raw, tokenKana, tokenText) {
  const trimmed = raw.trim().toLowerCase();
  const hasKana = /[ぁ-ヿ]/.test(trimmed);
  const input = hasKana ? katakanaToHiragana(trimmed) : toHiragana(trimmed);
  const inputNN = hasKana ? input : toHiragana(trimmed.replace(/nn/g, "n'"));
  const targetKana = katakanaToHiragana(tokenKana);
  if (input === targetKana || inputNN === targetKana) return true;
  return input === katakanaToHiragana(tokenText);
}

// OLD (reference / 句乐部) checkToken for comparison
function checkTokenOld(raw, tokenKana, tokenText) {
  const trimmed = raw.trim().toLowerCase();
  const input = toHiragana(trimmed);
  if (input === tokenKana) return true;
  return input === toHiragana(tokenText);
}

const cases = [
  // [input, token.kana, token.text, expected]
  ["watashi", "わたし", "私", true],
  ["kanji", "かんじ", "漢字", true],
  ["honni", "ほんい", "本位", true],
  ["hon'i", "ほんい", "本位", true],
  ["gakkou", "がっこう", "学校", true],
  ["suma-tofon", "スマートフォン", "スマートフォン", true],
  ["スマートフォン", "スマートフォン", "スマートフォン", true],
  ["sumahon", "スマホ", "スマホ", true],
  ["tabete", "たべて", "食べて", true],
  ["ookii", "おおきい", "大きい", true],
  ["kaeru", "かえる", "帰る", true],
  ["kimashita", "きました", "来ました", true],
  ["onna", "おんな", "女", true],
  ["hon", "ほん", "本", true],
  ["honn", "ほん", "本", true],
  ["nihon", "にほん", "日本", true],
  ["nihonn", "にほん", "日本", true],
  ["konban", "こんばん", "今晩", true],
  ["shinbun", "しんぶん", "新聞", true],
  ["sinbun", "しんぶん", "新聞", true],
  ["kitte", "きって", "切手", true],
  ["chiisai", "ちいさい", "小さい", true],
  ["pa-ti-", "パーティー", "パーティー", true],
  // wrong inputs should be false
  ["watasi", "わたし", "私", false],
  ["sumafon", "スマートフォン", "スマートフォン", false],
];

let fail = 0;
for (const [inp, kana, text, exp] of cases) {
  const got = checkToken(inp, kana, text);
  const ok = got === exp;
  if (!ok) {
    fail++;
    console.log("FAIL", JSON.stringify(inp), "kana=", JSON.stringify(kana), "expected", exp, "got", got);
  } else {
    console.log("ok  ", JSON.stringify(inp), "->", got);
  }
}
console.log("---- fails:", fail, "/", cases.length);
