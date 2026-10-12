// 构建期脚本的「绝不失败」保证：托管平台（EdgeOne Pages 等）构建失败会保留上一次成功的部署，
// 表现成「代码推上去了、线上却一直不变」，极难排查。所以凡是被构建链调用的脚本，
// 出错时只能警告、必须以 0 退出。
//
// 背景事故：2026-10-03 我把 `node scripts/gen-route-shells.cjs` 挂在 generate 脚本后面，
// 它在找不到输出目录时 process.exit(1)，导致之后每次构建失败、线上一直停在旧版本。
//
// 运行：node tests/offline-tts/run.cjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.JPLINGO_ROOT || process.cwd();
const NODE = process.execPath;

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function check(name: string, ok: boolean, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  [ok]" : "  [FAIL]"} ${name}${detail && !ok ? "  -> " + detail : ""}`);
}

/** 在「坏环境」下跑一个构建期脚本，返回 { code, output } */
function runBroken(script: string, env: Record<string, string> = {}) {
  const res = spawnSync(NODE, [path.join(ROOT, "scripts", script), "Z:/definitely-not-here"], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: 120000,
  });
  return { code: res.status, output: `${res.stdout || ""}${res.stderr || ""}`.trim(), error: res.error };
}

function main() {
  console.log("\n[1] 构建期脚本在坏环境下必须 0 退出（否则托管平台会静默保留旧部署）");
  {
    const r = runBroken("gen-route-shells.cjs");
    check(
      "gen-route-shells.cjs 找不到输出目录 → 退出码 0",
      r.code === 0,
      `退出码 ${r.code}；输出 ${r.output.slice(0, 160)}`,
    );
    check("并且给出了可读的警告", /跳过|不影响构建/.test(r.output), r.output.slice(0, 160));
  }
  {
    // 让清单生成器扫一个不存在的 public 目录 → 它应当警告而不是让构建失败
    const r = runBroken("gen-data-manifest.cjs", { JPLINGO_PUBLIC_DIR: "Z:/definitely-not-here" });
    check(
      "gen-data-manifest.cjs 数据目录不存在 → 退出码 0",
      r.code === 0,
      `退出码 ${r.code}；输出 ${r.output.slice(0, 160)}`,
    );
  }
  {
    const r = runBroken("gen-content-json.cjs");
    check(
      "gen-content-json.cjs 异常时 → 退出码 0",
      r.code === 0,
      `退出码 ${r.code}；输出 ${r.output.slice(0, 160)}`,
    );
  }

  console.log("\n[2] package.json 的构建链里不许再出现会失败的后置步骤");
  {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    const generate = pkg.scripts.generate || "";
    check("generate 脚本只有 nuxt generate（深链路页由 nuxt.config 预渲染负责）", generate.trim() === "nuxt generate", generate);
    check("pregenerate 仍是清单生成（已改为失败不中止）", (pkg.scripts.pregenerate || "").includes("gen-data-manifest"), pkg.scripts.pregenerate);
  }

  console.log("\n[3] 预渲染清单必须同时覆盖「静态页面」和「课程深链路」");
  {
    const cfg = fs.readFileSync(path.join(ROOT, "nuxt.config.ts"), "utf8");
    // 事故：nitro.prerender.routes 只写课程路由，会顶掉 Nuxt 默认的页面发现，
    // 导致 /jp-kana-chart/、/jp-grammar/ 这类静态页在线上 404（静态托管没有 SPA 回退）。
    check(
      "prerender.routes 同时包含 staticRoutes() 与 courseRoutes()",
      /routes:\s*\[[^\]]*staticRoutes\(\)[^\]]*courseRoutes\(\)[^\]]*\]/.test(cfg),
      "nuxt.config.ts 里的 prerender.routes 写法变了",
    );
    check(
      "staticRoutes() 从 app/pages 目录推导（不会漏页面）",
      /resolve\(process\.cwd\(\), "app\/pages"\)/.test(cfg),
      "staticRoutes 的实现看起来不再遍历 app/pages",
    );

    // 有构建产物时做真实核对：每个静态页面都要有 index.html，否则线上就是 404
    const outDir = path.join(ROOT, ".output", "public");
    if (fs.existsSync(outDir)) {
      const pagesDir = path.join(ROOT, "app", "pages");
      const missing: string[] = [];
      const walk = (dir: string, prefix: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.isDirectory()) {
            walk(path.join(dir, entry.name), `${prefix}/${entry.name}`);
          } else if (entry.name.endsWith(".vue") && !entry.name.includes("[")) {
            const route = `${prefix}${entry.name === "index.vue" ? "" : `/${entry.name.replace(/\.vue$/, "")}`}`;
            const file = path.join(outDir, route, "index.html");
            const alt = path.join(outDir, `${route}.html`);
            if (!fs.existsSync(file) && !fs.existsSync(alt) && route !== "/") missing.push(route);
          }
        }
      };
      walk(pagesDir, "");
      check(
        `构建产物里每个静态页面都有 index.html（${missing.length === 0 ? "全部齐" : "缺 " + missing.join(", ")}）`,
        missing.length === 0,
        `缺少：${missing.join(", ")}（线上会 404）`,
      );
      const deep = ["jp-game", "jp-study"].filter((d) => fs.existsSync(path.join(outDir, d)));
      check("课程深链路目录已生成", deep.length === 2, `只有 ${deep.join(",") || "无"}`);
    } else {
      console.log("  [skip] 还没有 .output/public（先跑一次构建，这项会做真实核对）");
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n合计 ${results.length} 项，失败 ${failed.length} 项`);
  if (failed.length) {
    for (const f of failed) console.log(`  - ${f.name}  ${f.detail ?? ""}`);
    process.exit(1);
  }
}

main();
