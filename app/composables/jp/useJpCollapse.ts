import { ref } from "vue";

/**
 * 收纳式折叠的通用状态（语法页各板块共用）。
 *
 * 约定：默认**全部收起**，点一次展开、再点一次收起。
 * 多级折叠用「层级前缀」拼出唯一 key，例如：
 * - 分组：`g:${category}`
 * - 小节：`s:${category}|${title}`
 * - 条目：`e:${category}|${title}|${pattern}`
 *
 * 用「换一个新 Set」的方式触发 Vue 响应式（Set 的原地增删不会被 reactive 追踪到）。
 */
export function useJpCollapse() {
  const open = ref<Set<string>>(new Set());

  function isOpen(key: string): boolean {
    return open.value.has(key);
  }

  function toggle(key: string) {
    const next = new Set(open.value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    open.value = next;
  }

  return { isOpen, toggle };
}
