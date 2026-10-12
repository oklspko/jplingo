#!/usr/bin/env node
/**
 * 为动态路由生成静态外壳页，让深链路在任意静态托管上都能 200 打开。
 *
 * 背景：项目是 SPA（ssr: false）。`/jp-home`、`/jp-grammar` 这类路由已被 Nuxt 预渲染成
 * 独立 index.html ✓，但动态路由 `/jp-game/[coursePackId]/[id]`、`/jp-study/...`（分享某节课的链接）
 * 没有对应文件，静态托管只能返回 404 —— 而微信等内置浏览器对非 200 会直接显示错误页，
 * 用户看到的就是「打不开/500」。EdgeOne 的 rewrites（edgeone.json）实测不生效，所以这里自己造文件。
 *
 * 做法：读 public/courses 下的课程清单，为每门课把构建产物里的 200.html（Nuxt 的 SPA 外壳）
 * 复制成 `<route>/index.html`。静态托管会优先命中真实文件 → 返回 200 + 外壳，
 * 前端路由再按 URL 渲染对应页面。纯文件复制，不增加构建时间。
 *
 * 用法：node scripts/gen-route-shells.cjs [输出目录]   （默认 .output/public）
 *       CI 与本地构建都会通过 nuxt.config 的 prrender:done 钩子自动执行。
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SOURCES = path.join(ROOT, "public", "courses");

/** 需要兜底的动态路由前缀（分享链接会用到的） */
const ROUTE_PREFIXES = ["jp-game", "jp-study"];

function coursePairs() {
  const indexFile = path.join(SOURCES, "course-packs.json");
  if (!fs.existsSync(indexFile)) return [];
  const data = JSON.parse(fs.readFileSync(indexFile, "utf8"));
  const pairs = [];
  for (const pack of data.coursePacks || []) {
    const packId = pack.id;
    for (const courseId of pack.courses || []) {
      // 虚拟课程（无分类测试）没有独立文件，跳过
      if (courseId.endsWith("-all")) continue;
      pairs.push([packId, courseId]);
    }
  }
  return pairs;
}

function main(outDir = process.argv[2] || path.join(ROOT, ".output", "public")) {
  // 这是构建期的辅助步骤，**任何情况下都不能让构建失败**：
  // 托管平台（EdgeOne Pages 等）构建失败时会保留上一次成功的部署，
  // 表现成「推了代码但线上一直不变」，极难排查。所以这里只警告、不退出非零。
  try {
    if (!fs.existsSync(outDir)) {
      console.warn(`[route-shells] 跳过：找不到输出目录 ${outDir}`);
      return 0;
    }
    // Nuxt 的 SPA 外壳：200.html（不带预渲染数据，加载后由前端路由接管）
    const shellCandidates = ["200.html", "index.html"].map((f) => path.join(outDir, f));
    const shell = shellCandidates.find((f) => fs.existsSync(f));
    if (!shell) {
      console.warn("[route-shells] 跳过：找不到 200.html / index.html");
      return 0;
    }
    const html = fs.readFileSync(shell);

    const pairs = coursePairs();
    let created = 0;
    for (const [packId, courseId] of pairs) {
      for (const prefix of ROUTE_PREFIXES) {
        const dir = path.join(outDir, prefix, packId, courseId);
        const file = path.join(dir, "index.html");
        if (fs.existsSync(file)) continue;
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, html);
        created++;
      }
    }
    console.log(
      `[route-shells] 用 ${path.basename(shell)} 生成 ${created} 个深链路外壳页` +
        `（${pairs.length} 门课 × ${ROUTE_PREFIXES.length} 个路由）`,
    );
    return created;
  } catch (err) {
    console.warn("[route-shells] 生成失败（不影响构建，深链路可能回退为 404）：", err);
    return 0;
  }
}

module.exports = { main, coursePairs, ROUTE_PREFIXES };

if (require.main === module) main();
