import { toHiragana } from "wanakana";

/**
 * 日语模糊查询工具（词库、语法条库共用）
 *
 * 目标：像人一样「差不多就能搜到」，而不是只做完全子串匹配。支持
 *   1. 全角/半角、大小写、空格归一
 *   2. 片假名 ↔ 平假名互认（搜「たべる」能命中「タベル」）
 *   3. 罗马字输入（wanakana 转平假名）：搜 taberu / tabemasu 能命中 食べる／食べます
 *   4. 子序列匹配（字符按顺序出现即可）：搜「食る」能命中「食べる」
 *   5. 空格分词 AND：`n5 動詞` 要求每个词都能命中某字段（可命中不同字段）
 *
 * 打分越高越相关；0 表示不匹配。调用方按分数降序、同分保持原顺序即可。
 */

/** 归一化：转平假名、去空格与中点、半角片假名统一、英文小写 */
export function normalizeJa(input: string): string {
  if (!input) return "";
  const raw = String(input).normalize("NFKC").toLowerCase();
  // 罗马字 → 平假名：逐词处理，且只处理「纯拉丁字母且含元音」的词。
  // 否则 N5 / n5 这类等级会被 wanakana 当成「ん5」，搜索等级就废了。
  const converted = raw
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (/^[a-z']+$/.test(token) && /[aeiou]/.test(token)) {
        try {
          return toHiragana(token, { passRomaji: false });
        } catch {
          return token;
        }
      }
      return token;
    })
    .join("");
  let s = converted.normalize("NFKC").toLowerCase();
  // 片假名 → 平假名
  s = s.replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  // 去掉空白、中点、括号等分隔符，避免「りんご を」搜不到「りんご」
  s = s.replace(/[\s・·、。,.\-–—_/\\()[\]{}「」『』【】:：;；!！?？'"’”]/g, "");
  return s;
}

const SCORE = {
  exact: 1000,
  startsWith: 760,
  includes: 620,
  tokensAll: 520,
  subsequence: 380,
};

/** 单个词元对一个字段的得分（0 = 不匹配） */
export function fieldScore(field: string, token: string): number {
  const f = normalizeJa(field);
  const t = normalizeJa(token);
  if (!f || !t) return 0;
  if (f === t) return SCORE.exact;
  if (f.startsWith(t)) return SCORE.startsWith;
  if (f.includes(t)) return SCORE.includes;
  // 子序列：t 的字符按顺序出现在 f 中（允许中间有别的字）
  let i = 0;
  for (let j = 0; j < f.length && i < t.length; j++) {
    if (f[j] === t[i]) i++;
  }
  if (i === t.length) {
    // 越紧凑越相关：按跨度轻微扣分
    const span = f.length - t.length;
    return Math.max(SCORE.subsequence - Math.min(span * 4, 120), 120);
  }
  return 0;
}

/**
 * 对整个查询串打分：空格分词，每个词元都要命中（可命中不同字段），
 * 命中字段得分取最大者，最后求和。
 */
export function fuzzyScore(fields: Array<string | undefined | null>, query: string): number {
  const q = String(query || "").trim();
  if (!q) return 1; // 空查询视为全部命中（分数统一）
  const tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.length) return 1;
  const cleaned = fields.filter((f): f is string => !!f);
  if (!cleaned.length) return 0;

  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const field of cleaned) {
      const s = fieldScore(field, token);
      if (s > best) best = s;
      if (best === SCORE.exact) break;
    }
    if (!best) return 0; // 有一个词元完全没命中 → 整体不匹配
    total += best;
  }
  return total;
}

/**
 * 排序用比较器：分数降序，同分保持原顺序（稳定）。
 * 用法：`list.map((it, i) => ({ it, i, s: fuzzyScore(..., q) })).filter(x => x.s > 0)`
 * 若不关心排序可只用 `fuzzyScore(...) > 0`。
 */
export function byScoreDesc<T extends { s: number; i: number }>(a: T, b: T): number {
  return b.s - a.s || a.i - b.i;
}

/** 便捷函数：过滤 + 按相关度排序（保持同分原顺序） */
export function fuzzyFilter<T>(list: T[], query: string, fieldsOf: (item: T) => Array<string | undefined | null>): T[] {
  const q = String(query || "").trim();
  if (!q) return list;
  const scored = list
    .map((item, i) => ({ item, i, s: fuzzyScore(fieldsOf(item), q) }))
    .filter((x) => x.s > 0);
  scored.sort(byScoreDesc);
  return scored.map((x) => x.item);
}
