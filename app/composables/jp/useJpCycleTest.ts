import type { JpStatement } from "~/types/jp";

/**
 * 单词「循环测试」规则（无分类测试 + 分类单词课共用）：
 * · 同一词**连续答对 3 次**才算通过，通过时才写入学习记录（避免「做一遍就全存进去」）。
 * · 中途答错则连续计数清零，并**自动追加 5 次重复**。
 * · 追加重现的位置固定在**当前题之后 5–7 个词**，不会紧接着又出现。
 * · 追加批数有上限（默认 2 批 10 次），防止极端情况下题目无限增长。
 */
export const CYCLE_PASS_STREAK = 3;
export const CYCLE_EXTRA_BATCH = 5;
export const CYCLE_GAP_MIN = 5;
export const CYCLE_GAP_MAX = 7;
export const CYCLE_MAX_EXTRA_BATCHES = 2;

/** 同一个词的判定键（按日语原文，同一词的不同 id 视为同一个词） */
export function cycleWordKey(s: JpStatement): string {
  return s.japanese;
}

/**
 * 从 fromIndex 之后按 5–7 的间隔插入 count 份副本。
 * 返回新的当前索引（副本插在当前题之后，当前题不动）。
 */
export function insertSpacedCopies<T>(
  arr: T[],
  fromIndex: number,
  item: T,
  count: number,
  rand: () => number = Math.random,
): number {
  const span = CYCLE_GAP_MAX - CYCLE_GAP_MIN + 1;
  let pos = fromIndex;
  for (let i = 0; i < count; i++) {
    const gap = CYCLE_GAP_MIN + Math.floor(rand() * span);
    pos = Math.min(arr.length, pos + gap);
    arr.splice(pos, 0, item);
    pos += 1;
  }
  return pos;
}

/** 删除 fromIndex 之后该词的所有副本（通过后不再考） */
export function dropFutureCopies<T extends { japanese: string }>(
  arr: T[],
  fromIndex: number,
  japanese: string,
): number {
  let removed = 0;
  for (let i = arr.length - 1; i > fromIndex; i--) {
    if (arr[i].japanese === japanese) {
      arr.splice(i, 1);
      removed++;
    }
  }
  return removed;
}

/**
 * 循环测试的初始队列：每个词只出现一次（同词多 id 去重）。
 * shuffle=true 用于「无分类测试」——跨课打乱，避免同一课的词扎堆。
 */
export function buildCycleQueue(
  statements: JpStatement[],
  shuffleFn: <T>(a: T[]) => T[],
  shuffle = false,
): JpStatement[] {
  const seen = new Set<string>();
  const uniq: JpStatement[] = [];
  for (const s of statements) {
    if (seen.has(s.japanese)) continue;
    seen.add(s.japanese);
    uniq.push(s);
  }
  return shuffle ? shuffleFn(uniq) : uniq;
}
