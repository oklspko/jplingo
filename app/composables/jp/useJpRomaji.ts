import { toHiragana, toRomaji } from "wanakana";
import type { JpToken } from "~/types/jp";

export function isSingleKanaCourseId(courseId: string): boolean {
  return (
    courseId === "jp-kana-01" ||
    courseId === "jp-kana-02" ||
    courseId === "jp-kana-03"
  );
}

// ===== 假名 → 输入法罗马字（IME 拼写，而非 Hepburn 展示写法）=====
// wanakana 的 toRomaji 输出的是展示写法：づ→zu、ぢ→ji、っ+ち→tchi、ぁ→a、
// ん+元音 有时丢撇号，这些照着输入都打不出正确假名。这里内置一套完整的
// 「假名 → 输入法罗马字」映射，保证提示里的罗马字能被 toHiragana 原样还原。
//
// 单字覆盖（其余标准假名交给 toRomaji，它对这些是正确的）：
const KANA_ROMAJI_ONE: Record<string, string> = {
  "づ": "du", "ぢ": "di",
  "ぁ": "xa", "ぃ": "xi", "ぅ": "xu", "ぇ": "xe", "ぉ": "xo",
  "ゃ": "xya", "ゅ": "xyu", "ょ": "xyo",
};

// 双字序列：拗音 + 外来语组合（toRomaji 对外来语组合输出错误，须显式覆盖）
const KANA_ROMAJI_TWO: Record<string, string> = {
  // 拗音
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
  // 外来语组合
  "ふぁ": "fa", "ふぃ": "fi", "ふぇ": "fe", "ふぉ": "fo",
  "てぃ": "thi", "でぃ": "dhi",
  "うぃ": "wi", "うぇ": "we", "うぉ": "who",
  "ゔぁ": "va", "ゔぃ": "vi", "ゔぇ": "ve", "ゔぉ": "vo",
  "いぇ": "ye",
  "くぁ": "kwa", "くぃ": "qwi", "くぇ": "kwe", "くぉ": "kwo",
  "つぁ": "tsa", "つぃ": "tsi", "つぇ": "tse", "つぉ": "tso",
  "とぅ": "twu", "どぅ": "dwu",
};

// 取 kana 中第 i 个「音节」（单字或双字序列）对应的输入罗马字。
function moraRomaji(kana: string, i: number): string {
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

// 取单个假名的元音（用于长音符 ー 的展开）。
function kanaVowel(ch: string): string {
  if (ch === "ぁ" || ch === "ゃ") return "a";
  if (ch === "ぃ") return "i";
  if (ch === "ぅ" || ch === "ゅ") return "u";
  if (ch === "ぇ") return "e";
  if (ch === "ぉ" || ch === "ょ") return "o";
  const r = KANA_ROMAJI_ONE[ch] ?? toRomaji(ch);
  return r.length ? r[r.length - 1] : "";
}

// 把长音符 ー 展开为前一个音节的元音：ゆにーく → ゆにいく、かーど → かあど。
// 展开保持长度不变（每个 ー 恰好替换成 1 个元音），因此可按长度映射回原串。
export function expandLongMark(kana: string): string {
  let out = "";
  for (let i = 0; i < kana.length; i++) {
    const ch = kana[i];
    if (ch === "ー") out += i > 0 ? kanaVowel(kana[i - 1]) : "";
    else out += ch;
  }
  return out;
}

export function kanaToInputRomaji(kana: string): string {
  // 长音符先展开成双元音（ゆにーく → ゆにいく），提示即可按双元音输入，
  // 手机键盘无需切符号层；促音 っ 仍用「双写辅音」，与长音的「双写元音」互不干扰。
  const src = expandLongMark(kana);
  let result = "";
  for (let i = 0; i < src.length; ) {
    const ch = src[i];
    if (ch === " ") {
      result += " ";
      i++;
      continue;
    }
    if (ch === "っ") {
      // 促音：双写下一音节的首字母；孤立在末尾时用 xtu。
      if (i + 1 < src.length) result += moraRomaji(src, i + 1)[0];
      else result += "xtu";
      i++;
      continue;
    }
    if (i + 1 < src.length && KANA_ROMAJI_TWO[src.slice(i, i + 2)]) {
      result += KANA_ROMAJI_TWO[src.slice(i, i + 2)];
      i += 2;
      continue;
    }
    result += moraRomaji(src, i);
    i++;
  }
  return result;
}

export function getTokenRomaji(token: JpToken): string {
  return kanaToInputRomaji(token.kana);
}

// 一个假名可能对应多种可接受的罗马字（主形式 + 别名）。
// 别名覆盖训令式与ヘボン式差异，以及 IME 的特殊输入：
//   し/ち/つ/ふ → si/ti/tu/hu；ん → nn；ぢ → ji；づ → zu
const ROMAJI_ALIASES: Record<string, string[]> = {
  "し": ["si"],
  "ち": ["ti"],
  "つ": ["tu"],
  "ふ": ["hu"],
  "ん": ["nn"],
  "ぢ": ["ji"],
  "づ": ["zu"],
};

export function getTokenRomajiAlternatives(token: JpToken): string[] {
  const primary = getTokenRomaji(token);
  return [primary, ...(ROMAJI_ALIASES[token.kana] || [])];
}

export function checkToken(
  raw: string,
  token: JpToken,
  isSingleKana: boolean,
): boolean {
  const trimmed = raw.trim().toLowerCase();
  if (isSingleKana) {
    return getTokenRomajiAlternatives(token).includes(trimmed);
  }
  const input = toHiragana(trimmed);
  const inputNN = toHiragana(trimmed.replace(/nn/g, "n'"));
  if (input === token.kana || inputNN === token.kana) return true;
  // 双写 n（nn）作为「ん」的输入习惯：honni → ほんい、honn → ほん。
  // 标准罗马字里 ん 后接元音需用 n' 分隔（hon'i），但输入法/学习者常用 nn 表示 ん。
  // 长音符：目标含 ー 时，允许按双元音输入（yuniiku → ゆにーく），
  // 与促音的双写辅音（かって → katte）字符集不同，互不冲突。
  if (token.kana.includes("ー")) {
    const expanded = expandLongMark(token.kana);
    if (input === expanded || inputNN === expanded) return true;
  }
  // 允许直接输入原文形（汉字/片假名）：面白い → 面白い、パン → パン
  // toHiragana 会把片假名转成平假名、保留汉字，因此与 token.text 归一后比较即可。
  return input === toHiragana(token.text);
}

// 练习输入框的实时显示：把罗马字转成假名，并正确处理「ん」的歧义。
// - nn 双写等价于 ん：honn → ほん、honni → ほんい（与 checkToken 的判定保持一致）
// - 结尾单独一个 n 是「待定 n」（后面可能接元音拼成 な/に…，也可能就此确认成 ん），
//   显示为拉丁 n 提示尚未确定，避免「输入 hon 显示 ほん，再输入 i 却变成 ほに」的误导。
export function romajiToKanaForDisplay(raw: string, targetKana: string): string {
  const s = raw.toLowerCase();
  if (!s) return "";
  const std = toHiragana(s);
  const dbl = toHiragana(s.replace(/nn/g, "n'"));
  let result = std;
  // 当目标假名更符合 nn 双写解读时（如 ほんい ← honni）优先采用它
  if (targetKana.startsWith(dbl) && !targetKana.startsWith(std)) {
    result = dbl;
  }
  // 长音符：目标含 ー 时，把输入展开成双元音比对，命中后按长度映射回含 ー 的原目标显示
  if (targetKana.includes("ー")) {
    const expanded = expandLongMark(targetKana);
    const base = expanded.startsWith(dbl) && !expanded.startsWith(std) ? dbl : std;
    if (expanded.startsWith(base)) result = targetKana.slice(0, base.length);
  }
  // 结尾单独一个 n 是待定 n，显示为拉丁 n
  if (/(^|[^n])n$/.test(s) && result.endsWith("ん")) {
    result = result.slice(0, -1) + "n";
  }
  return result;
}

export function calcWordWidth(kana: string, isSingleKana: boolean): number {
  if (isSingleKana) {
    const target = toRomaji(kana).toLowerCase();
    return Math.max(target.length + 3, 6);
  }
  return Math.max(kana.length * 2 + 1, 3);
}

export function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30a0-\u30ff]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}

export function splitSegments(input: string): string[] {
  return input.split(/\s+/).filter(Boolean);
}
