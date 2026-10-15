/**
 * 展示层格式化纯函数（零副作用、不依赖 Nuxt 运行时）
 *
 * 这里只放「同一段格式化逻辑在多处各写一遍」的东西。
 * `useJpDataUpdate` 下载进度、`release` 页安装包体积、`jp-me` 数据卡片
 * 原先各自实现了一份字节格式化（2026-10-15 grep 统计见 REFACTOR.md 步骤 6）。
 */

/** 字节数展示：1.2 MB / 345 KB；0 或负值显示 0 KB */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 KB";
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}
