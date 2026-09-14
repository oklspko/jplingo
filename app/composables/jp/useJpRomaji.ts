import { toHiragana, toRomaji } from "wanakana";
import type { JpToken } from "~/types/jp";

export function isSingleKanaCourseId(courseId: string): boolean {
  return (
    courseId === "jp-kana-01" ||
    courseId === "jp-kana-02" ||
    courseId === "jp-kana-03"
  );
}

export function getTokenRomaji(token: JpToken): string {
  // ぢ / づ 的输入罗马字是 di / du（wanakana 默认按 Hepburn 转成 ji / zu，会与 じ / ず 混淆）
  if (token.kana === "ぢ") return "di";
  if (token.kana === "づ") return "du";
  return toRomaji(token.kana).toLowerCase();
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
  return toHiragana(trimmed) === token.kana;
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
