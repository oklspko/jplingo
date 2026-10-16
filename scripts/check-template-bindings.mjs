#!/usr/bin/env node
/**
 * 静态检查：`<script setup>` 里模板用到的标识符，是否真的在 setup 作用域里。
 *
 * 为什么需要：Vue 的模板编译**不做类型检查**，`<script setup>` 里漏了 import / 漏了定义时，
 * 模板里的标识符会静默退化成 `_ctx.xxx`（组件实例查找）→ 运行时 undefined → 报错或整块不渲染，
 * 而 `pnpm generate` / vite 构建**不会报错**。
 *
 * 真实事故（2026-10-16，重构步骤 8）：把 `isVocabPack` 移进 composable 时，页面里删掉了它的 import，
 * 但模板里还有两处 `v-if="isVocabPack(pack.id)"` —— 构建全绿，运行时才炸；
 * 而该页面的渲染快照只抓到加载态（35 行文本），也可能漏掉。
 *
 * 判定方法：用 @vue/compiler-sfc 编译模板（带 compileScript 产出的 bindingMetadata）：
 *   - 在 setup 作用域里的标识符 → 生成 `$setup.xxx` 或直接标识符（正常）
 *   - **不在** setup 作用域里的标识符 → 生成 `_ctx.xxx`（可疑，几乎都是漏定义）
 * 排除白名单（`$event`、`$props`、`$slots` 等模板内建，以及 kebab-case 组件标签）。
 *
 * 用法：node scripts/check-template-bindings.mjs        # 全量扫 app/**\/*.vue
 *       node scripts/check-template-bindings.mjs <file> # 只查一个文件
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT =
  process.env.JPLINGO_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(ROOT, "package.json"));
const sfc = require("@vue/compiler-sfc");

/** 模板内建 / 运行时注入的名字，出现 `_ctx.X` 也属正常 */
const ALLOW = new Set([
  "$event",
  "$props",
  "$slots",
  "$attrs",
  "$emit",
  "$refs",
  "$el",
  "$data",
  "$options",
  "$forceUpdate",
  "$nextTick",
  "$root",
  "$parent",
  "$setup",
  "undefined",
]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".vue")) out.push(p);
  }
  return out;
}

function checkFile(file) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const { descriptor, errors } = sfc.parse(source, { filename: rel });
  if (errors.length || !descriptor.template) return { rel, skipped: true, problems: [] };
  if (!descriptor.scriptSetup) return { rel, skipped: true, problems: [] };

  let bindings = {};
  try {
    bindings = sfc.compileScript(descriptor, { id: "check" }).bindings || {};
  } catch {
    // compileScript 失败（语法问题等）交给构建去报，这里跳过
    return { rel, skipped: true, problems: [] };
  }

  let code = "";
  try {
    code = sfc.compileTemplate({
      source: descriptor.template.content,
      filename: rel,
      id: "check",
      scoped: false,
      compilerOptions: { bindingMetadata: bindings },
    }).code;
  } catch {
    return { rel, skipped: true, problems: [] };
  }

  // 收集所有 _ctx.xxx 的读取点，并记录它出现在生成的哪一行附近
  const problems = [];
  const seen = new Set();
  code.split("\n").forEach((line) => {
    for (const m of line.matchAll(/_ctx\.([A-Za-z_$][\w$]*)/g)) {
      const name = m[1];
      if (ALLOW.has(name) || seen.has(name)) continue;
      seen.add(name);
      problems.push(name);
    }
  });
  return { rel, skipped: false, problems };
}

/** 扫描若干 .vue 文件，返回 { scanned, problems: [{rel, names}] } */
export function check(filesArg) {
  const files = filesArg && filesArg.length ? filesArg.map((a) => path.resolve(ROOT, a)) : walk(path.join(ROOT, "app"));
  let scanned = 0;
  const problems = [];
  for (const f of files) {
    const r = checkFile(f);
    if (r.skipped) continue;
    scanned++;
    if (r.problems.length) problems.push({ rel: r.rel, names: r.problems });
  }
  return { scanned, problems };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const { scanned, problems } = check(process.argv.slice(2));
  for (const p of problems) {
    console.error(`  [FAIL] ${p.rel} 模板里引用了不在 setup 作用域的标识符：${p.names.join(", ")}`);
  }
  console.log(`\n扫描 ${scanned} 个含 <script setup> 的 .vue 文件，可疑文件 ${problems.length} 个`);
  if (problems.length) {
    console.error(
      "提示：这些标识符会在运行时变成 undefined（构建不报错）。要么补 import/定义，要么从 composable 返回值里解构出来。",
    );
    process.exit(1);
  }
  console.log("[check-template-bindings] 全部模板标识符都在 setup 作用域内 ✓");
}
