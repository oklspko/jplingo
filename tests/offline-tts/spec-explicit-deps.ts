// 护栏：scripts/ 与 tests/ 里引用的**裸包名**必须在 package.json 里显式声明。
//
// 为什么需要（同类事故已发生两次，都在 CI 上才暴露）：
//   1. tests 的 harness 用 `require("esbuild")` —— esbuild 只是 Nuxt 的传递依赖，
//      本机 node_modules 是扁平（npm 式）布局所以能解析，CI 上 pnpm 隔离链接 → MODULE_NOT_FOUND。
//   2. 新增的 scripts/check-template-bindings.mjs 用 `require("@vue/compiler-sfc")` —— 同样的问题，CI 再次红灯。
// 规律：**凡 CI 要跑的脚本，它 require 的包都必须在 package.json 里显式声明**（版本与 lockfile 已解析的一致）。
//
// 运行：node tests/offline-tts/run.cjs
import fs from "node:fs";
import path from "node:path";
import { builtinModules } from "node:module";

const ROOT = process.env.JPLINGO_ROOT || process.cwd();

/** Node 内建模块（含显式 node: 前缀）：不算第三方依赖 */
const BUILTINS = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]);

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function check(name: string, ok: boolean, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  [ok]" : "  [FAIL]"} ${name}${detail && !ok ? "  -> " + detail : ""}`);
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(cjs|mjs|js|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** 去掉注释，避免把注释/文档里的示例（如 // require("x")）当成真实依赖 */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * 抽出源码里引用的裸包名（去掉 node: 内建、相对路径、~ 别名）。
 *
 * 必须只认**语句级** import/require：早期版本用 `from\s+"…"` 全局匹配，
 * 把字符串/模板字符串里的文字也当成了依赖（真实误报：check-grammar-wiring.mjs 的提示文案里
 * 含 “import ... as ...”，匹配出一个包名 `),`，让 CI 白红一次）。
 * 现改为逐行状态机：只处理行首是 import/export 的语句（跨行时把续行拼起来），
 * 其余行只认 require(...) / import(...)。这样绝不会看进字符串内部。
 */
function bareImports(code: string): Set<string> {
  const names = new Set<string>();
  const add = (spec: string) => {
    if (!spec || spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("~")) return;
    const parts = spec.split("/");
    const name = spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
    if (BUILTINS.has(name)) return;
    names.add(name);
  };

  const handleStatement = (t: string) => {
    const m = t.match(/\bfrom\s+["']([^"']+)["']/);
    if (m) add(m[1]);
    const sideEffect = t.match(/^(?:import|export)\s+["']([^"']+)["']/);
    if (sideEffect) add(sideEffect[1]);
  };

  let pending = "";
  for (const raw of stripComments(code).split("\n")) {
    const t = raw.trim();
    if (!t) continue;

    if (pending) {
      pending += " " + t;
      if (/["']\s*;?\s*$/.test(t)) {
        handleStatement(pending);
        pending = "";
      }
      continue;
    }

    // 语句级 import/export：单行直接处理，跨行先攒着
    if (/^(import|export)\b/.test(t)) {
      if (/\bfrom\s+["'][^"']+["']/.test(t) || /^(?:import|export)\s+["'][^"']+["']/.test(t)) {
        handleStatement(t);
      } else if (!t.endsWith(";")) {
        pending = t;
      }
    }

    for (const m of raw.matchAll(/(?:^|[^\w$.])require\(\s*["']([^"']+)["']\s*\)/g)) add(m[1]);
    for (const m of raw.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) add(m[1]);
  }
  return names;
}

function main() {
  console.log("\n[1] scripts/ 与 tests/ 引用的裸包都已在 package.json 显式声明");
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const declared = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ]);

  const files = [...walk(path.join(ROOT, "scripts")), ...walk(path.join(ROOT, "tests"))];
  const missing = new Map<string, string[]>();
  let scanned = 0;
  for (const f of files) {
    const code = fs.readFileSync(f, "utf8");
    scanned++;
    for (const name of bareImports(code)) {
      if (declared.has(name)) continue;
      const rel = path.relative(ROOT, f).replace(/\\/g, "/");
      if (!missing.has(name)) missing.set(name, []);
      missing.get(name)!.push(rel);
    }
  }

  check(`扫描了 ${scanned} 个脚本文件`, scanned > 0, "没扫到文件");
  const detail = [...missing.entries()]
    .map(([name, where]) => `${name}（${where.slice(0, 2).join(", ")}${where.length > 2 ? " 等" : ""}）`)
    .join("；");
  check(
    missing.size === 0 ? "无未声明依赖" : `有 ${missing.size} 个未声明依赖`,
    missing.size === 0,
    `${detail} —— 请把它们加进 package.json（版本与 pnpm-lock.yaml 已解析的一致），否则 CI 会 MODULE_NOT_FOUND`,
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\n合计 ${results.length} 项，失败 ${failed.length} 项`);
  if (failed.length) {
    for (const f of failed) console.log(`  - ${f.name}  ${f.detail ?? ""}`);
    process.exit(1);
  }
}

main();
