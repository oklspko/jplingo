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

  /**
   * 注销账号（《个人信息保护法》要求的账号注销途径）。
   *
   * 实现方式：**申请制**——本地数据立即清除并退出登录；账号与云端学习记录通过邮件申请删除，
   * 运营者在 15 个工作日内处理（与《隐私政策》第六条承诺一致）。
   * 之所以不做成自助删除：账号认证由自托管 Supabase/GoTrue 负责，客户端没有删除用户的权限，
   * 擅自调后端会造成「本地已退出、云端还在」的假注销。
   */
  async function onDeleteAccount() {
    const email = user.value?.email || "（当前未登录）";
    const ok = confirm(
      "注销账号后，账号与云端同步的学习记录将被删除且不可恢复。\n\n" +
        "· 本机数据会立即清除并退出登录\n" +
        "· 账号数据将在 15 个工作日内删除\n\n" +
        `将用邮件提交注销申请（账号：${email}），并打开你的邮件客户端。是否继续？`,
    );
    if (!ok) return;

    const subject = encodeURIComponent("注销账号申请 - jp-lingo");
    const body = encodeURIComponent(
      `申请注销 jp-lingo 账号\n账号：${email}\n申请时间：${new Date().toLocaleString()}\n\n（发送后请保留本邮件作为凭证，我们将在 15 个工作日内处理）`,
    );
    try {
      window.location.href = `mailto:1661769641@qq.com?subject=${subject}&body=${body}`;
    } catch {
      /* 没有邮件客户端时忽略，下面仍会清除本地数据 */
    }

    // 清除本应用的本地数据（只清 jp- 前缀的键，避免误删其他站点数据）
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("jp-")) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* 隐私模式等场景可能不可用，忽略 */
    }

    await signOut();
    alert("注销申请已提交：本机数据已清除。请在你的邮箱里发送那封草稿邮件以完成申请（15 个工作日内处理）。");
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

  return { user, syncing, syncMsg, onLogout, onDeleteAccount, onSync };
}
