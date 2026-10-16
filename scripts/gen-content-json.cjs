#!/usr/bin/env node
/**
 * 构建时把「内容型」数据导出成可热更新的 JSON（public/data/*.json）：
 *
 *   1. data/grammar-points.json   ← app/data/jp-grammar-points.ts（语法条库，664 条）
 *   2. data/grammar-reference.json ← 语法页五个组件里的表格/清单数据
 *      （谓语句表格、动词变形表、接续规则角色、助词一览、敬语一览）
 *
 * 为什么要导出：App 里的语法内容是 TS/Vue 模块，编进 JS 包，改一条语法点就得发新版；
 * 导出成 JSON 后纳入数据热更新（见 useJpDataUpdate），改语法内容不用重装。
 * 组件里仍保留同样的默认值，JSON 缺失/加载失败就回退内置，永不空白。
 *
 * 用法：node scripts/gen-content-json.cjs   （nuxt.config.ts 会在每次构建时调用）
 */
const esbuild = require("esbuild");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "data");

/** 用 esbuild 把 TS/Vue 里的数据块打成临时 ESM 再取出来 */
async function loadModule(entrySource, name) {
  // 注意：临时文件写在项目内（node_modules/.cache），不要用系统 %TEMP%——
  // 某些环境（含本机沙箱策略、部分 CI）对系统临时目录写入受限。
  const cacheDir = path.join(ROOT, "node_modules", ".cache");
  fs.mkdirSync(cacheDir, { recursive: true });
  const tmp = path.join(cacheDir, `jplingo-content-${name}.mjs`);
  const result = await esbuild.build({
    stdin: { contents: entrySource, resolveDir: ROOT, loader: "ts" },
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: tmp,
    logLevel: "silent",
    external: ["vue", "@capacitor/*", "wanakana", "pako", "@patdx/kuromoji"],
  });
  if (result.errors?.length) throw new Error(result.errors.map((e) => e.text).join("; "));
  const mod = await import(`file://${tmp.replace(/\\/g, "/")}?t=${Date.now()}`);
  fs.unlinkSync(tmp);
  return mod;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1) 语法条库
  const grammarMod = await loadModule(
    `import { grammarPoints } from "./app/data/jp-grammar-points";\nexport { grammarPoints };`,
    "grammar",
  );
  const grammarPoints = grammarMod.grammarPoints;
  fs.writeFileSync(
    path.join(OUT_DIR, "grammar-points.json"),
    JSON.stringify({ points: grammarPoints }, null, 0) + "\n",
    "utf8",
  );
  console.log(`[content] data/grammar-points.json · ${grammarPoints.length} 条`);

  // 2) 语法页的表格/清单数据
  //
  // 步骤 10 之后，这些数组已全部搬到 app/data/ 下（数据与展示分离），
  // 所以这里直接 import 数据模块即可 —— 不再从 .vue 文件里做文本抽取
  // （那种做法脆：解析失败只会在运行时暴露，而且组件一改动就会静默失配）。
  const tables = await loadModule(`export * from "./app/data/jp-grammar-tables";`, "tables");
  const particles = await loadModule(
    `import { particleGroups } from "./app/data/jp-particles";\nexport const groups = particleGroups;`,
    "particles",
  );
  const keigo = await loadModule(
    `import { keigoGroups } from "./app/data/jp-keigo";\nexport const groups = keigoGroups;`,
    "keigo",
  );

  // 数据来源统一为 app/data/*.ts；键名沿用原来的结构，保持生成的 JSON 完全一致
  const reference = {
    predicates: {
      nounRows: tables.nounRows,
      a1PlainRows: tables.a1PlainRows,
      a1KeigoRows: tables.a1KeigoRows,
      verbRows: tables.verbRows,
    },
    verbGuide: {
      basicForms: tables.basicForms,
      advancedForms: tables.advancedForms,
      onbinRows: tables.onbinRows,
      teFormRows: tables.teFormRows,
    },
    guide: { roles: tables.roles },
    particles: { groups: particles.groups },
    keigo: { groups: keigo.groups },
  };

  fs.writeFileSync(
    path.join(OUT_DIR, "grammar-reference.json"),
    JSON.stringify(reference, null, 0) + "\n",
    "utf8",
  );
  const sizeKb = (fs.statSync(path.join(OUT_DIR, "grammar-reference.json")).size / 1024).toFixed(1);
  console.log(
    `[content] data/grammar-reference.json · ${sizeKb} KB` +
      `（谓语句 ${Object.keys(reference.predicates).length} 组、变形表 ${Object.keys(reference.verbGuide).length} 组` +
      `${reference.particles ? "、含助词" : ""}${reference.keigo ? "、含敬语" : ""}）`,
  );

  return reference;
}

module.exports = { main };

if (require.main === module) {
  // 构建期脚本，不能因为内容导出失败就让构建失败（原因同 gen-data-manifest.cjs）。
  main().catch((err) => {
    console.warn("[content] 跳过生成（不影响构建，语法内容会退回内置版本）：", err.message);
  });
}
