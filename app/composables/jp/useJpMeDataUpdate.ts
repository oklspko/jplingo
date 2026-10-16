import { Capacitor } from "@capacitor/core";
import { computed } from "vue";
import { useJpDataUpdate } from "~/composables/jp/useJpDataUpdate";
import { formatBytes } from "~/utils/jpFormat";
import { shortVersion } from "~/utils/jpDataPack";

/**
 * 「我的」页的「📦 课程数据」卡片（从 app/pages/jp-me/index.vue 抽出，逻辑逐字搬移）。
 *
 * 状态所有权：`dataChecking/dataUpdating/dataProgress/dataError/dataInfo/hasDataUpdate/...`
 * 都是 `useJpDataUpdate()` 的**模块级单例** ref，这里只做展示层派生（标题/描述/进度宽度/版本行）
 * 与两个动作，不新建同名 ref。
 *
 * 语义保持不变（见 CLAUDE.md「课程数据热更新」）：
 *   - `dataSupported` 只在原生端为真（网页端数据本来就是最新的，卡片不显示）；
 *   - **只检查、不自动下载**：检查由 `app/plugins/jp-data-update.client.ts` 在启动时静默做，
 *     本卡片上的按钮也是「先检查、确认有更新再下载」，没有任何一处会在进入页面时自动 apply。
 *
 * 无生命周期副作用：不在内部注册 onMounted（本卡片不随页面挂载自动检查）。
 */
export function useJpMeDataUpdate() {
  const dataSupported = computed(() => Capacitor.isNativePlatform());
  const {
    dataChecking,
    dataUpdating,
    dataProgress,
    dataError,
    dataInfo,
    hasDataUpdate,
    pendingBytes,
    remoteVersion,
    currentVersion: dataCurrentVersion,
    lastCheckedAt,
    dataStatusText,
    checkDataUpdate,
    applyDataUpdate,
    resetDataCache,
  } = useJpDataUpdate();

  const dataTitle = computed(() => {
    if (dataUpdating.value) return "正在更新课程数据…";
    if (dataChecking.value) return "正在检查更新…";
    if (hasDataUpdate.value) return "有新课程数据可更新";
    return dataCurrentVersion.value ? "课程数据已就绪" : "使用 App 内置数据";
  });

  const dataDesc = computed(() =>
    hasDataUpdate.value
      ? "更新只下载变化的课程文件，不用重装 App；更新后立即可用"
      : "课程与词库数据可在线更新，装一次 App 就能一直拿到后续新课程",
  );

  const dataPendingText = computed(() => formatBytes(pendingBytes.value));

  /** 诊断行：当前版本 / 远端版本 / 上次检查时间——排查「更新完还提示有更新」这类问题靠它 */
  const dataVersionLine = computed(() => {
    const cur = shortVersion(dataCurrentVersion.value) || "内置";
    const remote = remoteVersion.value ? shortVersion(remoteVersion.value) : "—";
    const checked = lastCheckedAt.value ? new Date(lastCheckedAt.value).toLocaleString() : "尚未检查";
    return `当前数据 ${cur} · 线上 ${remote} · 上次检查 ${checked}`;
  });

  const dataProgressWidth = computed(() => {
    const { done, total } = dataProgress.value;
    if (!total) return dataChecking.value ? "35%" : "0%";
    return `${Math.round((done / total) * 100)}%`;
  });

  const dataProgressText = computed(() => {
    const { done, total, bytes, bytesTotal } = dataProgress.value;
    if (!total) return "";
    return `${done} / ${total} 个文件（${formatBytes(bytes)} / ${formatBytes(bytesTotal)}）`;
  });

  const dataCardClass = computed(() => {
    if (dataError.value && !dataInfo.value) return "tts-card--off";
    if (dataUpdating.value || dataChecking.value) return "tts-card--busy";
    return hasDataUpdate.value ? "tts-card--idle" : "tts-card--ready";
  });

  async function onApplyDataUpdate() {
    if (hasDataUpdate.value) {
      await applyDataUpdate();
      return;
    }
    const plan = await checkDataUpdate();
    if (plan?.hasUpdate) await applyDataUpdate(plan);
  }

  async function onResetData() {
    await resetDataCache();
    await checkDataUpdate();
  }

  return {
    dataSupported,
    dataChecking,
    dataUpdating,
    dataError,
    dataInfo,
    hasDataUpdate,
    dataCurrentVersion,
    dataStatusText,
    dataTitle,
    dataDesc,
    dataPendingText,
    dataVersionLine,
    dataProgressWidth,
    dataProgressText,
    dataCardClass,
    onApplyDataUpdate,
    onResetData,
  };
}
