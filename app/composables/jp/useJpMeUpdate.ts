import { onMounted } from "vue";
import { useJpUpdate } from "~/composables/jp/useJpUpdate";

/**
 * 「我的」页的「🔄 版本更新」卡片（从 app/pages/jp-me/index.vue 抽出，逻辑逐字搬移）。
 *
 * `checking/checked/hasUpdate/latestVersion/errorMsg/directApkUrl` 全部来自 `useJpUpdate(appVersion)`，
 * 这里只加两个按钮的包装（onCheckUpdate / onUpdateNow），不另存一份状态。
 *
 * 生命周期：内部注册 onMounted —— 进入「我的」页自动检测一次更新（与拆分前页面 onMounted 的
 * `checkUpdate()` 同一时机）；用户也可点「检查更新」手动再查。「立即更新」= `openDownload()`，
 * 即在系统浏览器打开 APK 下载地址，行为未变。
 *
 * 注意注册顺序：页面在本 composable 之后才调用 useJpMeTts()，因此挂载时仍是
 * 「先 checkUpdate()、再 refreshOfflineTtsStatus()」，与拆分前一致。
 */
export function useJpMeUpdate(appVersion: string) {
  const {
    checking,
    checked,
    hasUpdate,
    latestVersion,
    errorMsg,
    directApkUrl,
    checkUpdate,
    openDownload,
  } = useJpUpdate(appVersion);

  onMounted(() => {
    checkUpdate();
  });

  function onCheckUpdate() {
    checkUpdate();
  }

  function onUpdateNow() {
    openDownload();
  }

  return {
    checking,
    checked,
    hasUpdate,
    latestVersion,
    errorMsg,
    directApkUrl,
    onCheckUpdate,
    onUpdateNow,
  };
}
