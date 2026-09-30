import { toHiragana, toRomaji } from "wanakana";

function katakanaToHiragana(str) {
  return str.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}
function hiraganaToKatakana(str) {
  return str.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

// === current checkToken ===
function checkToken(raw, tokenKana, tokenText) {
  const trimmed = raw.trim().toLowerCase();
  const hasKana = /[ぁ-ヿ]/.test(trimmed);
  const input = hasKana ? katakanaToHiragana(trimmed) : toHiragana(trimmed);
  const inputNN = hasKana ? input : toHiragana(trimmed.replace(/nn/g, "n'"));
  const targetKana = katakanaToHiragana(tokenKana);
  if (input === targetKana || inputNN === targetKana) return true;
  return input === katakanaToHiragana(tokenText);
}

// === current romajiToKanaForDisplay ===
function romajiToKanaForDisplay(raw, targetKana) {
  const s = raw.toLowerCase();
  if (!s) return "";
  const isKata = targetKana !== katakanaToHiragana(targetKana);
  const target = katakanaToHiragana(targetKana);
  const tail = s.match(/n+$/);
  const tailLen = tail ? tail[0].length : 0;
  const head = tailLen > 0 ? s.slice(0, -tailLen) : s;
  const tailKana = "ん".repeat(Math.ceil(tailLen / 2));
  const headStd = toHiragana(head);
  const headDbl = toHiragana(head.replace(/nn/g, "n'"));
  let headKana = headStd;
  if (target.startsWith(headDbl + tailKana) && !target.startsWith(headStd + tailKana)) {
    headKana = headDbl;
  }
  const out = headKana + tailKana;
  return isKata ? hiraganaToKatakana(out) : out;
}

console.log("=== checkToken: katakana token (manual pack: kana=katakana) ===");
// スマートフォン with kana = "スマートフォン" (katakana), text = "スマートフォン"
for (const inp of ["suma-tofon", "スマートフォン", "すまーとふぉん", "sumato-fon", "sumaatofon"]) {
  console.log(JSON.stringify(inp), "->", checkToken(inp, "スマートフォン", "スマートフォン"));
}

console.log("=== checkToken: katakana token (auto-tokenizer: kana=hiragana) ===");
for (const inp of ["suma-tofon", "スマートフォン", "すまーとふぉん"]) {
  console.log(JSON.stringify(inp), "->", checkToken(inp, "すまーとふぉん", "スマートフォン"));
}

console.log("=== checkToken: スマホ (short) ===");
for (const inp of ["sumaho", "スマホ", "すまほ"]) {
  console.log(JSON.stringify(inp), "->", checkToken(inp, "スマホ", "スマホ"));
}

console.log("=== romajiToKanaForDisplay (katakana target, manual kana=katakana) ===");
console.log("suma-tofon ->", romajiToKanaForDisplay("suma-tofon", "スマートフォン"));
console.log("suma ->", romajiToKanaForDisplay("suma", "スマートフォン"));
console.log("suma- ->", romajiToKanaForDisplay("suma-", "スマートフォン"));
console.log("suma-to ->", romajiToKanaForDisplay("suma-to", "スマートフォン"));
console.log("suma-tofon ->", romajiToKanaForDisplay("suma-tofon", "スマートフォン"));

console.log("=== romajiToKanaForDisplay (hiragana target) ===");
console.log("watashi ->", romajiToKanaForDisplay("watashi", "わたし"));
console.log("nihon ->", romajiToKanaForDisplay("nihon", "にほん"));
console.log("nihonn ->", romajiToKanaForDisplay("nihonn", "にほん"));
console.log("hon ->", romajiToKanaForDisplay("hon", "ほん"));
console.log("konni ->", romajiToKanaForDisplay("konni", "こんにちは"));
console.log("konnichiha ->", romajiToKanaForDisplay("konnichiha", "こんにちは"));
