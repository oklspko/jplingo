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

export function kanaToInputRomaji(kana: string): string {
  // 先归一：片假名 → 平假名（保留长音符 ー）。下面的映射表键为平假名，
  // 且 っ/ん 的判定也按平假名处理，必须先归一，否则片假名（フォ・ッ・ン等）会拼错。
  const src = katakanaToHiragana(kana);
  // 长音符 ー 直接用减号 - 输入（ka- → かー），无需记忆双元音展开；
  // 促音 っ 仍用「双写辅音」（かって → katte）。
  let result = "";
  for (let i = 0; i < src.length; ) {
    const ch = src[i];
    if (ch === " ") {
      result += " ";
      i++;
      continue;
    }
    if (ch === "ー") {
      result += "-";
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
  const kana = katakanaToHiragana(token.kana);
  return [primary, ...(ROMAJI_ALIASES[kana] || [])];
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
  // 输入可能是罗马字（suma-tofon）或直接输入的假名原文（スマートフォン）。
  // 直接原文时用 katakanaToHiragana 保留长音符 ー；罗马字时用 toHiragana（- → ー）。
  const hasKana = /[ぁ-ヿ]/.test(trimmed);
  const input = hasKana ? katakanaToHiragana(trimmed) : toHiragana(trimmed);
  const inputNN = hasKana ? input : toHiragana(trimmed.replace(/nn/g, "n'"));
  // 目标假名统一归一到「平假名 + 保留长音符 ー」再比较。
  // 片假名词（スマートフォン）的 kana/text 是片假名，且 wanakana 的 toHiragana 会把
  // 片假名里的 ー 展开成前一元音（スマート→すまあ），与罗马字输入的 -→ー 不一致，
  // 导致无论怎么输入都判错。这里用 katakanaToHiragana 保留 ー，两者才对齐。
  const targetKana = katakanaToHiragana(token.kana);
  if (input === targetKana || inputNN === targetKana) return true;
  // 双写 n（nn）作为「ん」的输入习惯：honni → ほんい、honn → ほん。
  // 允许直接输入原文形（汉字/片假名）：面白い → 面白い、パン → パン。
  return input === katakanaToHiragana(token.text);
}

// 练习输入框的实时显示：把罗马字转成假名，并正确处理「ん」的歧义。
// - nn 双写等价于 ん：honn → ほん、honni → ほんい（与 checkToken 的判定保持一致）
// - 结尾单独一个 n 是「待定 n」（后面可能接元音拼成 な/に…，也可能就此确认成 ん），
//   显示为拉丁 n 提示尚未确定，避免「输入 hon 显示 ほん，再输入 i 却变成 ほに」的误导。
export function romajiToKanaForDisplay(raw: string, targetKana: string): string {
  const s = raw.toLowerCase();
  if (!s) return "";
  // 目标是片假名时，显示也输出片假名（输入 suma-tofon 显示 スマートフォン，而非平假名）
  const isKata = targetKana !== katakanaToHiragana(targetKana);
  const target = katakanaToHiragana(targetKana);

  // 结尾连续 n：n 默认显示 ん；连打 nn 即确认一个 ん，nnn → んん……（每两个 n 折成一个 ん）。
  // 中间再接元音时，这个 n 会变成 な/に/ぬ/ね/の（由 toHiragana 处理）。
  const tail = s.match(/n+$/);
  const tailLen = tail ? tail[0].length : 0;
  const head = tailLen > 0 ? s.slice(0, -tailLen) : s;
  const tailKana = "ん".repeat(Math.ceil(tailLen / 2));

  // head 部分：标准转换；若目标更符合 nn→ん 双写解读（如 ほんい ← honni），改用双写
  const headStd = toHiragana(head);
  const headDbl = toHiragana(head.replace(/nn/g, "n'"));
  let headKana = headStd;
  if (target.startsWith(headDbl + tailKana) && !target.startsWith(headStd + tailKana)) {
    headKana = headDbl;
  }

  const out = headKana + tailKana;
  return isKata ? hiraganaToKatakana(out) : out;
}

export function calcWordWidth(kana: string, isSingleKana: boolean): number {
  if (isSingleKana) {
    const target = toRomaji(kana).toLowerCase();
    return Math.max(target.length + 3, 6);
  }
  return Math.max(kana.length * 2 + 1, 3);
}

export function katakanaToHiragana(str: string): string {
  // 只转换片假名字母（ァ〜ヶ），排除 ー(长音)・(中点)等与平假名共享的符号，
  // 否则 ー 会被错减成 ゜。长音符 ー 在日文中不分平/片，应原样保留。
  return str.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}

export function hiraganaToKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60),
  );
}

export function splitSegments(input: string): string[] {
  return input.split(/\s+/).filter(Boolean);
}
