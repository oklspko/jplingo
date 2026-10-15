/**
 * 集合工具纯函数
 *
 * `Set` 在 Vue 里更新不会触发响应式（必须整体换引用），所以「切换集合里的某个 key」
 * 每次都得写一遍「拷贝 → has 判定 → add/delete → 赋值」。
 * 原先 `jp-record` 三处（分组 / 课程包 / 记录包折叠）+ `jp-home` 一处（课程包展开）
 * 各写了一遍结构完全相同的 5 行。
 */

/**
 * 返回一个新的 Set：key 已存在则移除，否则加入。
 * 一律返回新引用（即使内容没变也不 mutate 入参），可直接赋给 ref 触发更新。
 */
export function toggleSet<T>(set: Set<T>, key: T): Set<T> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}
