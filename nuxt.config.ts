export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_SUPABASE_URL || "",
      supabaseAnonKey: process.env.NUXT_SUPABASE_ANON_KEY || "",
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