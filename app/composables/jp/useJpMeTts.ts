import { computed, onMounted, ref } from "vue";
import {
  useJpTts,
  ttsPercent,
  formatSynthInfo,
  TTS_MODEL_BYTES,
  TTS_TEST_TEXT,
  TTS_DEFAULT_STEPS,
  TTS_SPEAKER_CHOICES,
  TTS_STEP_CHOICES,
} from "~/composables/jp/useJpTts";
import { speakOfflineNow } from "~/composables/jp/useJpSound";

/**
 * 「我的」页的「离线发音」卡片（从 app/pages/jp-me/index.vue 抽出，逻辑逐字搬移）。
 *
 * 状态所有权：`supported/installed/downloading/...` 全部来自 `useJpTts()` 的**模块级单例** ref，
 * 这里不再新建同名 ref（页面也只消费本 composable 的返回值），避免进度/错误两处各存一份。
 * 只在页面级新增两个本卡片自己的 UI 状态：`ttsTrying`（试听中）与 `ttsTryMsg`（一行提示）。
 *
 * 生命周期：内部注册 onMounted —— 进入「我的」页时刷一次离线语音状态（装了模型会顺手预热，
 * 首次发音不必等加载）；与拆分前页面 onMounted 里的 `refreshTtsStatus()` 是同一个时机。
 * 注意注册顺序：页面先调用 useJpMeUpdate()（其 onMounted 发起版本检查）再调用本 composable，
 * 以保持拆分前「先 checkUpdate() 再 refreshTtsStatus()」的调用顺序。
 */
export function useJpMeTts() {
  const {
    supported: ttsSupported,
    installed: ttsInstalled,
    downloading: ttsDownloading,
    installing: ttsInstalling,
    progress: ttsProgress,
    receivedBytes: ttsReceivedBytes,
    error: ttsError,
    lastSynth: ttsLastSynthRaw,
    lastPrepare: ttsLastPrepareRaw,
    bundled: ttsBundled,
    downloaded: ttsDownloaded,
    preparingAssets: ttsPreparing,
    sid: ttsSid,
    steps: ttsSteps,
    setSid: setTtsSid,
    setSteps: setTtsSteps,
    refreshStatus: refreshTtsStatus,
    downloadModel: downloadTtsModel,
    deleteModel: deleteTtsModel,
  } = useJpTts();

  const ttsModelUrl = String(useRuntimeConfig().public.ttsModelUrl || "");
  const ttsTrying = ref(false);
  const ttsTryMsg = ref("");

  const ttsTitle = computed(() => {
    if (!ttsSupported.value) return "不可用";
    if (ttsPreparing.value) return "正在准备内置语音…";
    if (!ttsInstalled.value) return "未安装";
    return ttsBundled.value ? "已就绪（APK 内置）✅" : "已就绪 ✅";
  });

  const ttsDesc = computed(() => {
    if (!ttsSupported.value) {
      return "仅安卓 App 支持：网页端用浏览器自带语音，装到手机后才有内置离线引擎";
    }
    if (ttsPreparing.value) {
      return "首次启动会把 App 内置的语音（约 145MB）复制到应用目录，无需联网，稍等片刻即可";
    }
    if (ttsInstalled.value) {
      if (ttsBundled.value) {
        return "语音已随 App 一起安装：没预生成音频的词句也能离线发音，不用下载、也不用联网";
      }
      return "没有预生成音频的词句也能离线发音，不再依赖系统的日语音色";
    }
    return "App 未内置语音，可手动下载一次（约 123MB，建议 WiFi）";
  });

  const ttsProgressWidth = computed(() => `${ttsPercent(ttsProgress.value)}%`);

  /** 卡片整体配色随状态变化（就绪=绿、准备中=琥珀、不可用=灰） */
  const ttsCardClass = computed(() => {
    if (!ttsSupported.value) return "tts-card--off";
    if (ttsPreparing.value || ttsDownloading.value || ttsInstalling.value) return "tts-card--busy";
    return ttsInstalled.value ? "tts-card--ready" : "tts-card--idle";
  });

  // 真机诊断：把上一次原生合成的耗时/音频长度/RTF 显示出来（手机上唯一能拿到的性能数据）
  const ttsLastSynth = computed(() => {
    const line = formatSynthInfo(ttsLastSynthRaw.value);
    if (!line) return "";
    const prepare = ttsLastPrepareRaw.value;
    return prepare ? `${line}（模型加载 ${(prepare.ms / 1000).toFixed(1)} 秒）` : line;
  });

  const ttsProgressText = computed(() => {
    const done = (ttsReceivedBytes.value / 1048576).toFixed(1);
    const total = (TTS_MODEL_BYTES / 1048576).toFixed(0);
    return `${done} / ${total} MB（${ttsPercent(ttsProgress.value)}%）`;
  });

  async function onDownloadTts() {
    ttsTryMsg.value = "";
    const ok = await downloadTtsModel(ttsModelUrl);
    if (ok) ttsTryMsg.value = "✅ 离线语音已就绪，可以去练了";
  }

  async function onTryTts() {
    if (ttsTrying.value) return;
    ttsTrying.value = true;
    ttsTryMsg.value = "";
    const ok = await speakOfflineNow(TTS_TEST_TEXT);
    ttsTrying.value = false;
    ttsTryMsg.value = ok
      ? "✅ 已播放（内置离线引擎合成）"
      : "⚠️ 播放失败，可重新下载模型后再试";
  }

  async function onDeleteTts() {
    ttsTryMsg.value = "";
    const ok = await deleteTtsModel();
    if (ok) ttsTryMsg.value = "已删除离线语音模型（释放约 123MB）";
  }

  // 语者/步数存 localStorage：用户自己 A/B，不用改代码重新打包
  function onSidChange(e: Event) {
    setTtsSid(Number((e.target as HTMLSelectElement).value));
    ttsTryMsg.value = `已切到 ${ttsSid.value} 号语者，点「试听」听听`;
  }

  function onStepsChange(e: Event) {
    setTtsSteps(Number((e.target as HTMLSelectElement).value));
    ttsTryMsg.value = `已切到 ${ttsSteps.value} 步，点「试听」对比速度与音质`;
  }

  onMounted(() => {
    // 离线语音状态（装了模型就顺手预热，首次发音不必等加载）
    refreshTtsStatus();
  });

  return {
    ttsSupported,
    ttsInstalled,
    ttsDownloading,
    ttsInstalling,
    ttsError,
    ttsBundled,
    ttsDownloaded,
    ttsPreparing,
    ttsSid,
    ttsSteps,
    TTS_SPEAKER_CHOICES,
    TTS_STEP_CHOICES,
    TTS_DEFAULT_STEPS,
    ttsTitle,
    ttsDesc,
    ttsProgressWidth,
    ttsCardClass,
    ttsLastSynth,
    ttsProgressText,
    ttsTrying,
    ttsTryMsg,
    onDownloadTts,
    onTryTts,
    onDeleteTts,
    onSidChange,
    onStepsChange,
  };
}
