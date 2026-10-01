import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// 版本号唯一来源：package.json。发布页 / 侧栏 / 关于页统一读取，改版本只需改 package.json。
const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));

export default defineNuxtConfig({
  ssr: false,
  // 纯 SPA，产出静态文件，方便 EdgeOne Pages / 静态托管部署
  nitro: {
    preset: "static",
  },
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      appVersion: pkg.version || "1.0.0",
      // 构建标识：课程/音频这类无内容哈希的静态 JSON 用它做 ?v= 缓存穿透（见 useJpBuildId.ts）
      buildId: process.env.GITHUB_SHA?.slice(0, 8) || process.env.NUXT_PUBLIC_BUILD_ID || pkg.version,
      supabaseUrl: process.env.NUXT_SUPABASE_URL || "",
      supabaseAnonKey: process.env.NUXT_SUPABASE_ANON_KEY || "",
      // 发布页 APK 下载地址，可通过 NUXT_APK_URL 覆盖
      apkUrl:
        process.env.NUXT_APK_URL ||
        "https://github.com/oklspko/jplingo/releases/latest/download/jp-lingo.apk",
      // 离线日语语音模型包（sherpa-onnx Supertonic-3 int8，约 123MB，由 App 首次使用时下载）。
      // 默认官方 GitHub Release；可用 NUXT_TTS_MODEL_URL 覆盖为自托管/镜像地址（如 https://api.jplingo.cn/tts/...）。
      ttsModelUrl:
        process.env.NUXT_TTS_MODEL_URL ||
        "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2",
      // 课程数据热更新的数据源根地址（App 拉 /data/manifest.json 与课程 JSON）。
      // 默认指向网页部署域名：数据随网页一起更新，App 不重装也能拿到新课；
      // 可用 NUXT_PUBLIC_DATA_BASE_URL 换成自托管（如 https://api.jplingo.cn）。
      dataBaseUrl: process.env.NUXT_PUBLIC_DATA_BASE_URL || "https://www.jplingo.cn",
    },
  },
  app: {
    head: {
      title: "jp-lingo · 日语连词成句",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "description", content: "用连词成句的方式学习日语" },
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      ],
    },
  },
  css: ["~/assets/css/globals.css"],
});