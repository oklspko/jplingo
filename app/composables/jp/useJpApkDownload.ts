// APK 下载加速：GitHub Release 在国内直连较慢，这里把「官方直连 URL」转成
// 「加速镜像优先、官方直连兜底」的候选列表，供 /release 页与 App 内「立即更新」共用。
// 镜像均为社区公益代理（源仍是官方 GitHub Release 资产），可能调整域名或下线；
// 故始终保留官方直连作为最后兜底，并仅对 github.com 域名叠加镜像（自定义 CDN 不再叠加）。

// GitHub 最新版 APK 直连地址（稳定入口，会 302 到实际资产）
export const GITHUB_APK_LATEST_URL =
  "https://github.com/oklspko/jplingo/releases/latest/download/jp-lingo.apk";

// GitHub 加速镜像前缀（顺序即优先级，可自行增删/替换）。
// 格式：{前缀}{完整 GitHub URL}，例如 https://gh-proxy.com/https://github.com/...
// 2026-10-01 实测（对 tts-models 的 123MB 资产发 Range 请求）：gh-proxy / ghfast / ghproxy.net
// 返回 206 且前 1MB 字节与官方直连完全一致；gh.llkk.cc 已连不上（原第 2 项，换成 ghfast.top）。
export const APK_MIRROR_PREFIXES = [
  "https://gh-proxy.com/",
  "https://ghfast.top/",
  "https://ghproxy.net/",
];

// 离线语音模型（约123MB）走的是同一套镜像前缀：见 useJpTts.ts 的 downloadOfflineTtsModel。

// 直连 URL → 候选下载地址（加速镜像在前，官方直连兜底）。
// 仅对 github.com 域名叠加镜像；自定义 CDN（NUXT_APK_URL 覆盖）原样返回。
export function apkDownloadCandidates(directUrl: string): string[] {
  const url = (directUrl || "").trim();
  if (!url) return [];
  const isGithub = /^https?:\/\/([^/]*\.)?github\.com\//i.test(url);
  if (!isGithub) return [url];
  const mirrors = APK_MIRROR_PREFIXES.map(
    (p) => p.replace(/\/+$/, "") + "/" + url,
  );
  return [...mirrors, url];
}
