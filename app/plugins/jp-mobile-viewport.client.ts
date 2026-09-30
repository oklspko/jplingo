// 移动端布局限制：App 内（以及手机浏览器）把视口宽度钉在 768 以内，
// 避免老旧系统/平板命中了桌面样式（固定侧栏 + margin-left: 220px 会把手机上的正文挤成乱码）。
// 逻辑在 app/utils/jpViewport.ts，带单测（tests/offline-tts/spec-viewport.ts）。
import { forceMobileViewport } from "~/utils/jpViewport";

export default defineNuxtPlugin(() => {
  forceMobileViewport();
});
