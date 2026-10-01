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

/** 从 .vue 文件里抽出 `const NAME ... = [ ... ];` 数据块，拼成可执行 TS。
 * 组件里的内置默认值可能被命名为 `bundledNAME`（远端 JSON 覆盖时用），两种都认。 */
function extractBlocks(vueFile, names) {
  const src = fs.readFileSync(path.join(ROOT, vueFile), "utf8");
  const lines = src.split("\n");
  const parts = [];
  for (const name of names) {
    const start = lines.findIndex(
      (l) => l.startsWith("const " + name) || l.startsWith("const bundled" + name),
    );
    if (start < 0) throw new Error(vueFile + " 里找不到 " + name);
    // 数据块的结尾是行首的 "];"
    let end = start;
    while (end < lines.length && !/^\];?\s*$/.test(lines[end])) end++;
    if (end >= lines.length) throw new Error(name + " 没找到结尾的 ];");
    const body = lines.slice(start, end + 1).join("\n");
    const eq = body.indexOf("=");
    const value = body.slice(eq + 1).trim().replace(/;$/, "");
    parts.push("export const " + name + " = " + value + ";");
  }
  return parts.join("\n\n");
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

  // 2) 语法页各组件的表格/清单数据
  const predicates = await loadModule(
    extractBlocks("app/components/jp/JpPredicateSentences.vue", [
      "nounRows",
      "a1PlainRows",
      "a1KeigoRows",
      "verbRows",
    ]),
    "predicates",
  );
  const verbGuide = await loadModule(
    extractBlocks("app/components/jp/JpVerbGuide.vue", [
      "basicForms",
      "advancedForms",
      "onbinRows",
      "teFormRows",
    ]),
    "verbguide",
  );
  const guide = await loadModule(
    extractBlocks("app/components/jp/JpGrammarGuide.vue", ["roles"]),
    "guide",
  );
  const particleKeys = ["groups"];
  const keigoKeys = ["groups"];
  const particles = await loadModule(extractBlocks("app/components/jp/JpParticles.vue", particleKeys), "particles");
  const keigo = await loadModule(extractBlocks("app/components/jp/JpKeigo.vue", keigoKeys), "keigo");

  // 助词/敬语组件里的变量名都是 groups，导出后分别放在各自键下
  const reference = {
    predicates: {
      nounRows: predicates.nounRows,
      a1PlainRows: predicates.a1PlainRows,
      a1KeigoRows: predicates.a1KeigoRows,
      verbRows: predicates.verbRows,
    },
    verbGuide: {
      basicForms: verbGuide.basicForms,
      advancedForms: verbGuide.advancedForms,
      onbinRows: verbGuide.onbinRows,
      teFormRows: verbGuide.teFormRows,
    },
    guide: { roles: guide.roles },
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
  main().catch((err) => {
    console.error("[content] 生成失败：", err.message);
    process.exit(1);
  });
}
