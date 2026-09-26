export default defineNuxtConfig({
  ssr: false,
  // 纯 SPA，产出静态文件，方便 EdgeOne Pages / 静态托管部署
  nitro: {
    preset: "static",
  },
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_SUPABASE_URL || "",
      supabaseAnonKey: process.env.NUXT_SUPABASE_ANON_KEY || "",
      // 发布页 APK 下载地址，可通过 NUXT_APK_URL 覆盖
      apkUrl:
        process.env.NUXT_APK_URL ||
        "https://github.com/oklspko/jplingo/releases/latest/download/jp-lingo.apk",
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