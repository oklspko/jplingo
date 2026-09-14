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
  return toRomaji(token.kana).toLowerCase();
}

export function checkToken(
  raw: string,
  token: JpToken,
  isSingleKana: boolean,
): boolean {
  const trimmed = raw.trim();
  if (isSingleKana) {
    return trimmed.toLowerCase() === getTokenRomaji(token);
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
