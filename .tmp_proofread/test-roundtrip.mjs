import { toHiragana, toRomaji } from "wanakana";

function katakanaToHiragana(str) {
  return str.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

// --- replicate KANA_ROMAJI maps + moraRomaji + kanaToInputRomaji ---
const KANA_ROMAJI_ONE = {
  "づ": "du", "ぢ": "di",
  "ぁ": "xa", "ぃ": "xi", "ぅ": "xu", "ぇ": "xe", "ぉ": "xo",
  "ゃ": "xya", "ゅ": "xyu", "ょ": "xyo",
};
const KANA_ROMAJI_TWO = {
  "きゃ": "kya", "きゅ": "kyu", "きょ": "kyo",
  "ぎゃ": "gya", "ぎゅ": "gyu", "ぎょ": "gyo",
  "しゃ": "sha", "しゅ": "shu", "しょ": "sho",
  "じゃ": "ja", "じゅ": "ju", "じょ": "jo",
  "ちゃ": "cha", "ちゅ": "chu", "ちょ": "cho",
  "にゃ": "nya", "にゅ": "nyu", "にょ": "nyo",
  "ひゃ": "hya", "ひゅ": "hyu", "ひょ": "hyo",
  "びゃ": "bya", "びゅ": "byu", "びょ": "byo",
  "ぴゃ": "pya", "ぴゅ": "pyu", "ぴょ": "pyo",
  "みゃ": "mya", "みゅ": "myu", "みょ": "myo",
  "りゃ": "rya", "りゅ": "ryu", "りょ": "ryo",
  "ふぁ": "fa", "ふぃ": "fi", "ふぇ": "fe", "ふぉ": "fo",
  "てぃ": "thi", "でぃ": "dhi",
  "うぃ": "wi", "うぇ": "we", "うぉ": "who",
  "ゔぁ": "va", "ゔぃ": "vi", "ゔぇ": "ve", "ゔぉ": "vo",
  "いぇ": "ye",
  "くぁ": "kwa", "くぃ": "qwi", "くぇ": "kwe", "くぉ": "kwo",
  "つぁ": "tsa", "つぃ": "tsi", "つぇ": "tse", "つぉ": "tso",
  "とぅ": "twu", "どぅ": "dwu",
};
function moraRomaji(kana, i) {
  const ch = kana[i];
  if (i + 1 < kana.length && KANA_ROMAJI_TWO[kana.slice(i, i + 2)]) {
    return KANA_ROMAJI_TWO[kana.slice(i, i + 2)];
  }
  if (ch === "ん") {
    const nxt = kana[i + 1];
    return nxt && /[あいうえおやゆよ]/.test(nxt) ? "n'" : "n";
  }
  return KANA_ROMAJI_ONE[ch] ?? toRomaji(ch);
}
function kanaToInputRomaji(kana) {
  const src = katakanaToHiragana(kana);
  let result = "";
  for (let i = 0; i < src.length; ) {
    const ch = src[i];
    if (ch === " ") { result += " "; i++; continue; }
    if (ch === "ー") { result += "-"; i++; continue; }
    if (ch === "っ") {
      if (i + 1 < src.length) result += moraRomaji(src, i + 1)[0];
      else result += "xtu";
      i++; continue;
    }
    if (i + 1 < src.length && KANA_ROMAJI_TWO[src.slice(i, i + 2)]) {
      result += KANA_ROMAJI_TWO[src.slice(i, i + 2)];
      i += 2; continue;
    }
    result += moraRomaji(src, i);
    i++;
  }
  return result;
}

const words = [
  "スマートフォン", "スマホ", "パーティー", "コーヒー", "ニュース", "ケーキ",
  "コンピューター", "ティッシュ", "ディズニー", "ウォーター", "ファッション",
  "パソコン", "タクシー", "ホテル", "デパート", "レストラン", "スーパー",
  "わたし", "ほんい", "がっこう", "きって", "しんぶん", "こんばん", "おおきい",
  "ちいさい", "たべて", "かえります", "きました", "すわって", "まって",
];

let fail = 0;
for (const w of words) {
  const hint = kanaToInputRomaji(w);
  const back = toHiragana(hint);
  const target = katakanaToHiragana(w);
  const ok = back === target;
  if (!ok) {
    fail++;
    console.log("FAIL", JSON.stringify(w), "hint=", JSON.stringify(hint), "toHiragana=", JSON.stringify(back), "target=", JSON.stringify(target));
  } else {
    console.log("ok  ", JSON.stringify(w), "hint=", JSON.stringify(hint));
  }
}
console.log("---- fails:", fail, "/", words.length);
