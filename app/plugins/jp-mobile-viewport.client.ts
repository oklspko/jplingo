// 移动端布局限制：App 内（以及手机浏览器）把视口宽度钉在 768 以内，
// 避免老旧系统/平板/国产内核（微信 X5、QQ 浏览器）命中了桌面样式
// （固定侧栏 + margin-left: 220px 会把手机上的正文挤成乱码）。
// 逻辑在 app/utils/jpViewport.ts，带单测（tests/offline-tts/spec-viewport.ts）。
import { forceMobileViewport } from "~/utils/jpViewport";

export default defineNuxtPlugin(() => {
  const apply = () => forceMobileViewport();

  apply();
  // 微信/QQ 内核有时会在页面加载后自己调整 viewport，或首帧还没定下视口宽度：
  // 补几次延迟重试 + 监听尺寸变化，确保最终落在移动端布局上。
  for (const delay of [120, 400, 1200]) {
    setTimeout(apply, delay);
  }
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", apply);
});
