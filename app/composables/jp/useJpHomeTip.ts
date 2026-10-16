import { onMounted, ref } from "vue";
import type { Ref } from "vue";

/**
 * 首页新手提示条（从 app/pages/jp-home/index.vue 抽出，逻辑逐字搬移）。
 *
 * `tipConfirmOpen` 改由页面与 `useJpHomeUiState` 共享：原页面里 `closeAllMenus()` 末尾有一行
 * `tipConfirmOpen.value = false`（点任意处都要收起这个确认框），而「关菜单」归 `useJpHomeUiState`。
 * 为保持**单一数据源**，页面把同一个 ref 传进两个 composable，任一方都不复制第二份。
 */
export function useJpHomeTip(tipConfirmOpen: Ref<boolean>) {
  // ===== 新手提示条：可关闭 × + 「是否不再显示」询问 =====
  const showBeginnerTip = ref(true);

  function toggleTipConfirm() {
    tipConfirmOpen.value = !tipConfirmOpen.value;
  }
  function dismissTipForever() {
    showBeginnerTip.value = false;
    tipConfirmOpen.value = false;
    localStorage.setItem("jp-beginner-tip-dismissed", "true");
  }
  function dismissTipOnce() {
    showBeginnerTip.value = false;
    tipConfirmOpen.value = false;
  }

  onMounted(() => {
    if (localStorage.getItem("jp-beginner-tip-dismissed") === "true") {
      showBeginnerTip.value = false;
    }
  });

  return {
    showBeginnerTip,
    toggleTipConfirm,
    dismissTipForever,
    dismissTipOnce,
  };
}
