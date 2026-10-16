import { computed, ref } from "vue";
import type { Ref } from "vue";
import { toggleSet } from "~/utils/jpCollection";
import type { JpCoursePack } from "~/types/jp";

/**
 * 首页折叠状态与三处「⋯」菜单状态（从 app/pages/jp-home/index.vue 抽出，逻辑逐字搬移）。
 *
 * 单一数据源：`expandedPacks` 由页面创建，**同一个 ref** 再传给 `useJpHomeCourses(expandedPacks)`
 * （`loadAll()` 只给当前已展开的包加载元数据），页面不新建第二份。
 *
 * 参数说明：
 * - `onToggleExpand`：展开课程包时要按需加载课程元数据，`loadPackMeta` 归 `useJpHomeCourses` 所有，
 *   直接互相引用会让两个 composable 循环依赖，故由页面把 `loadPackMeta` 注入进来。
 * - `vocabPacks`：`collectionMenuOpen` 要用它（来自 `useJpHomePacks`）。
 * - `tipConfirmOpen`：原 `closeAllMenus()` 末尾有 `tipConfirmOpen.value = false`（点任意处收起
 *   新手提示的确认框），该状态归 `useJpHomeTip` 所有，由页面注入**同一个 ref**，不复制第二份。
 */
export function useJpHomeUiState(
  expandedPacks: Ref<Set<string>>,
  onToggleExpand: (packId: string) => void,
  vocabPacks: Ref<JpCoursePack[]>,
  tipConfirmOpen: Ref<boolean>,
) {
  // ===== 三点拓展菜单（首页课程包 / 分组管理） =====
  const openMenuId = ref("");
  const openManageMenuId = ref("");
  const openManageCourseMenuId = ref("");
  // 词汇收纳里是否有某个课程包菜单展开（用于临时放开收纳容器的 overflow 裁剪）
  const collectionMenuOpen = computed(() => vocabPacks.value.some((p) => openMenuId.value === p.id));

  function isExpanded(packId: string): boolean {
    return expandedPacks.value.has(packId);
  }

  function togglePack(packId: string) {
    expandedPacks.value = toggleSet(expandedPacks.value, packId);
    // 展开时按需加载该包课程标题/题数
    if (expandedPacks.value.has(packId)) onToggleExpand(packId);
  }

  function togglePackMenu(id: string) {
    openMenuId.value = openMenuId.value === id ? "" : id;
  }
  function toggleManageMenu(id: string) {
    openManageMenuId.value = openManageMenuId.value === id ? "" : id;
  }
  function toggleManageCourseMenu(key: string) {
    openManageCourseMenuId.value = openManageCourseMenuId.value === key ? "" : key;
  }
  function closeAllMenus() {
    openMenuId.value = "";
    openManageMenuId.value = "";
    openManageCourseMenuId.value = "";
    tipConfirmOpen.value = false;
  }

  return {
    isExpanded,
    togglePack,
    openMenuId,
    openManageMenuId,
    openManageCourseMenuId,
    collectionMenuOpen,
    togglePackMenu,
    toggleManageMenu,
    toggleManageCourseMenu,
    closeAllMenus,
  };
}
