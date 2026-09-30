// 构建标识 + 缓存穿透：给「无内容哈希」的静态 JSON（课程正文、音频 manifest）加 ?v= 版本号。
//
// 背景：这些文件线上会被 EdgeOne Pages 以 `Cache-Control: public, max-age=31536000, immutable`
// 长期缓存，而文件名又固定（如 jp-grow-01.json），一旦内容更新，老访客的浏览器在一年内
// 都不会重新请求 → 永远读到旧课程。给 URL 拼上随部署变化的 buildId，每次部署 URL 唯一，
// 浏览器/CDN 都必须回源，问题根治。
//
// buildId 来源优先级：CI 的 GITHUB_SHA（每次提交唯一）→ package.json 版本号。
let cached: string | undefined;

export function buildId(): string {
  if (cached !== undefined) return cached;
  try {
    cached = (useRuntimeConfig().public.buildId as string) || "";
  } catch {
    cached = "";
  }
  return cached;
}

export function cacheBustUrl(path: string): string {
  const v = buildId();
  return v ? `${path}?v=${encodeURIComponent(v)}` : path;
}
