import { ref } from "vue";
import { useJpAuth } from "~/composables/jp/useJpAuth";

/** 手动同步的结果（与 useJpStorage().syncNow 的返回一致） */
type SyncResult = "synced" | "noop" | "error";

/**
 * 「我的」页的账号卡片（从 app/pages/jp-me/index.vue 抽出，逻辑逐字搬移）。
 *
 * 状态所有权：`user` 来自 `useJpAuth()` 的模块级 `currentUser` ref；本 composable 只新增
 * 卡片自己的两个 UI 状态 `syncing`（同步中）与 `syncMsg`（一行结果提示，3 秒后自动清空）。
 *
 * `syncNow` 由页面传入，而不是在这里再调一次 `useJpStorage()`：
 * `useJpStorage()` 每次调用都会新建一个 record ref，再调一次就会同步到「另一个」record 上，
 * 页面上显示的统计不会跟着更新——必须共用页面那一份。
 *
 * 无生命周期副作用：不在内部注册 onMounted（登录状态由 useJpAuth 自己初始化）。
 */
export function useJpMeAccount(syncNow: () => Promise<SyncResult>) {
  const { user, signOut } = useJpAuth();

  const syncing = ref(false);
  const syncMsg = ref("");

  async function onLogout() {
    await signOut();
  }

  async function onSync() {
    if (syncing.value) return;
    syncing.value = true;
    syncMsg.value = "";
    const r = await syncNow();
    syncing.value = false;
    if (r === "synced") syncMsg.value = "✅ 已同步到云端";
    else if (r === "noop") syncMsg.value = "请先登录后再同步";
    else syncMsg.value = "⚠️ 同步失败，请检查网络后重试";
    setTimeout(() => {
      syncMsg.value = "";
    }, 3000);
  }

  return { user, syncing, syncMsg, onLogout, onSync };
}
