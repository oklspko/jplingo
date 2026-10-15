/**
 * 「本地日期键」纯函数
 *
 * 学习记录的 `days` / `lastActiveDate` 用的是「本地时区」的 `YYYY-MM-DD`，
 * 打卡日历、连续天数（streak）、今日时长清零三处必须用完全相同的口径，
 * 否则会出现「日历打了卡但连续天数不算」这类错位。
 * 原先这段 `getFullYear/getMonth/getDate + padStart` 在 5 处各写了一遍
 * （useJpStorage 3 处、JpCheckinCalendar 2 处）。
 *
 * 注意：一律读**本地**时间字段（getFullYear/getMonth/getDate），
 * 不要换成 toISOString()（那是 UTC，跨时区会错一天）。
 */

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Date → 本地日期键 `YYYY-MM-DD` */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 今天（本地）的日期键 */
export function todayKey(): string {
  return dayKey(new Date());
}

/** 在某天基础上加减天数后的日期键（默认减 1 天 = 昨天） */
export function dayKeyOffset(days: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}
