import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// 版本号唯一来源：package.json。发布页 / 侧栏 / 关于页统一读取，改版本只需改 package.json。
const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));

// 构建时生成「可热更新的内容 JSON」与「数据清单」。
// 放在 Nuxt 的 build:before 钩子里（而不是只靠 npm 的 pregenerate 钩子）：
// 这样无论用 `pnpm generate`、`nuxt generate`，还是托管平台自己的构建命令，
// 清单都与本次内容一致——App 的数据热更新依赖它。钩子早于 public/ 资源复制，所以能进产物。
async function prepareHotData() {
  try {
    const { main: genContent } = require("./scripts/gen-content-json.cjs") as {
      main: () => Promise<unknown>;
    };
    const { generate } = require("./scripts/gen-data-manifest.cjs") as {
      generate: () => { manifest: { version: string; files: unknown[] } };
    };
    // 先导出语法条 / 语法页内容（public/data/*.json），再生成清单，保证清单覆盖它们
    await genContent();
    const { manifest } = generate();
    console.log(`[data-manifest] ${manifest.version} · ${manifest.files.length} 个文件`);
  } catch (err) {
    console.warn("[data-manifest] 生成失败（不影响构建，但 App 可能拿不到新数据）：", err);
  }
}

/**
 * 动态路由的静态页清单（/jp-game/<pack>/<id> 与 /jp-study/<pack>/<id>）。
 *
 * 为什么需要：项目是 SPA，动态路由没有对应文件时静态托管只能返回 404——
 * 而微信等内置浏览器对非 200 会直接显示错误页（用户看到「打不开」）。
 * 把课程路由交给 Nuxt 预渲染，会为每条路由生成真实的 index.html（200），
 * 而且这一步在 `nuxt generate` 内部完成，不依赖托管平台的构建命令或额外的构建步骤。
 * （EdgeOne 的 rewrites 实测不生效，所以选了这条不依赖托管配置的路。）
 */
function courseRoutes(): string[] {
  try {
    const indexFile = resolve(process.cwd(), "public/courses/course-packs.json");
    const data = JSON.parse(readFileSync(indexFile, "utf8")) as {
      coursePacks?: Array<{ id: string; courses?: string[] }>;
    };
    const routes: string[] = [];
    for (const pack of data.coursePacks || []) {
      for (const courseId of pack.courses || []) {
        if (courseId.endsWith("-all")) continue; // 虚拟课程没有独立页面
        routes.push(`/jp-game/${pack.id}/${courseId}`, `/jp-study/${pack.id}/${courseId}`);
      }
    }
    return routes;
  } catch {
    return [];
  }
}

export default defineNuxtConfig({
  ssr: false,
  // 兼容微信 X5 / QQ 浏览器等偏旧的国产内核：把构建目标降一档，
  // 避免产出它们解析不了的新语法（表现为白屏或直接报错）。
  vite: {
    build: {
      target: ["es2019", "chrome80", "safari13"],
    },
  },
  hooks: {
    "build:before": prepareHotData,
  },
  // 纯 SPA，产出静态文件，方便 EdgeOne Pages / 静态托管部署
  nitro: {
    preset: "static",
    prerender: {
      crawlLinks: false,
      // 为每条课程路由生成静态页（约 900+ 个很小的 HTML），深链路直接 200
      routes: courseRoutes(),
      failOnError: false,
    },
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