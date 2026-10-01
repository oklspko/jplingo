import { Capacitor } from "@capacitor/core";
import { checkDataUpdate } from "~/composables/jp/useJpDataUpdate";

/**
 * App 启动时静默检查一次课程数据更新（只在原生端，网页端每次请求本来就是最新的）。
 *
 * 只检查、不自动下载：有更新时在「我的 → 课程数据」卡片上提示，由用户点「立即更新」。
 * 这样不会在用户打开 App 时占带宽，也不会因为后台下载失败打扰学习。
 */
export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return;
  // 等首屏渲染完再检查，避免和启动时的语音模型拷贝抢带宽/CPU
  setTimeout(() => {
    checkDataUpdate().catch(() => {
      /* 静默失败：离线或未配置数据地址都不该影响使用 */
    });
  }, 4000);
});
