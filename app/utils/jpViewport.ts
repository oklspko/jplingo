/**
 * 原生 App（以及手机浏览器）里强制走移动端布局。
 *
 * 背景：全站样式是「移动优先 + @media (max-width: 768px) 覆盖」，桌面样式会显示
 * 固定 220px 侧栏 + `.jp-page-main { margin-left: 220px }`。如果运行环境的视口宽度报得比 768 大
 * （老旧系统的 WebView 默认按 980px 排版、平板、或系统「显示大小」调大），就会命中桌面样式：
 * 手机窄屏上正文被侧栏挤成每行一两个字，看起来像乱码。
 *
 * 做法：把 viewport 的宽度钉在 768 以内，并按「屏宽 / 768」等比放大，保证仍然铺满全屏。
 * 只改视口宽度，不动任何 CSS，所以各页面的移动端规则照旧生效。
 */

export const MOBILE_MAX_WIDTH = 768;

interface ViewportWindow {
  location?: { hostname?: string };
  innerWidth?: number;
  screen?: { width?: number };
  navigator?: { userAgent?: string; maxTouchPoints?: number };
}

interface ViewportDocument {
  querySelector(selector: string): { setAttribute(name: string, value: string): void } | null;
}

/** 手机/平板 UA。含 QQ、微信（X5/WKWebView）、UC、夸克等国产内核，它们不一定带 Mobile 字样 */
const MOBILE_UA =
  /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|MicroMessenger|QQBrowser|MQQBrowser|QBWebView|Weibo|UCBrowser|Quark|AlipayClient|baiduboxapp|baidubrowser|SogouMobileBrowser|XWEB|X5/i;
/** 屏幕物理宽度到这个值以内，就当手机/竖屏平板处理（比 UA 更可靠：UA 可能被改、可能认不出来） */
const SMALL_SCREEN = 900;

/**
 * 判断是不是「小屏设备」：UA 命中，或屏幕（screen.width）本身就窄。
 * 用 screen.width 而不是 innerWidth，是因为 innerWidth 会受当前 viewport 设置影响（可能正好是 980）。
 */
function isSmallScreen(win: ViewportWindow): boolean {
  if (MOBILE_UA.test(win.navigator?.userAgent || "")) return true;
  const sw = win.screen?.width || 0;
  if (sw > 0 && sw <= SMALL_SCREEN) return true;
  // 触屏设备再多一层兜底：没有鼠标且支持多点触控，基本就是手机/平板
  const touch = win.navigator?.maxTouchPoints || 0;
  return touch > 1 && sw > 0 && sw <= 1366;
}

/** 返回是否改写了 viewport */
export function forceMobileViewport(
  win: ViewportWindow = globalThis as unknown as ViewportWindow,
  doc: ViewportDocument = (globalThis as unknown as { document: ViewportDocument }).document,
): boolean {
  try {
    const host = win.location?.hostname || "";
    // Capacitor 原生端从 https://localhost 提供页面；手机浏览器按 UA/屏宽判断。
    // 桌面浏览器（UA 不是手机、屏幕也宽）不动，避免影响电脑上的正常布局。
    const isNative = host === "localhost" || host === "127.0.0.1";
    if (!isNative && !isSmallScreen(win)) return false;

    const width = win.innerWidth || 0;
    if (width > 0 && width <= MOBILE_MAX_WIDTH) return false; // 本来就是手机宽度，不必动

    const meta = doc?.querySelector('meta[name="viewport"]');
    if (!meta) return false;

    const scale = width > MOBILE_MAX_WIDTH ? width / MOBILE_MAX_WIDTH : 1;
    meta.setAttribute(
      "content",
      `width=${MOBILE_MAX_WIDTH}, initial-scale=${scale.toFixed(3)}, maximum-scale=${scale.toFixed(3)}`,
    );
    return true;
  } catch {
    return false;
  }
}
