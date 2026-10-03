#!/usr/bin/env node
/**
 * 检查语法页五个组件的「热更新兜底」接线是否安全。
 *
 * 背景：这些组件把数据数组改名成 bundledX，再用同名的 computed 兜底：
 *     const bundledGroups = [...];
 *     const groups = computed(() => remote ?? bundledGroups);
 * 两个真实踩过的坑（都会让整页 500，但构建不报错）：
 *   1. 忘了显式 import useJpGrammarContent —— 运行时 "useJpGrammarContent is not defined"
 *      （本项目对 composables/jp/* 一律显式 import，不能依赖自动导入）
 *   2. computed 声明位置在使用处之后 —— ReferenceError: Cannot access 'x' before initialization
 *
 * 用法：node scripts/check-grammar-wiring.mjs   （也作为 tests/offline-tts/spec-grammar-wiring.ts 的一部分运行）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 项目根目录：优先用环境变量（自测 harness 会把打包后的代码放在 node_modules/.cache 下运行，
// 那时 import.meta.url 指向缓存目录，必须靠 JPLINGO_ROOT 指回项目根）
const ROOT =
  process.env.JPLINGO_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** 每个组件里需要检查的数组名（文件里一定存在 bundled<名>） */
const NAMES = {
  "app/components/jp/JpPredicateSentences.vue": ["nounRows", "a1PlainRows", "a1KeigoRows", "verbRows"],
  "app/components/jp/JpVerbGuide.vue": ["basicForms", "advancedForms", "onbinRows", "teFormRows"],
  "app/components/jp/JpGrammarGuide.vue": ["roles"],
  "app/components/jp/JpParticles.vue": ["groups"],
  "app/components/jp/JpKeigo.vue": ["groups"],
};

const IMPORT = 'import { useJpGrammarContent } from "~/composables/jp/useJpGrammarContent";';

export function check() {
  const problems = [];
  for (const rel of Object.keys(NAMES)) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) {
      problems.push(`${rel} 不存在`);
      continue;
    }
    const lines = fs.readFileSync(file, "utf8").split("\n");
    if (!lines.some((l) => l.includes(IMPORT))) {
      problems.push(`${rel}: 缺少 useJpGrammarContent 的显式 import（运行时会 500）`);
    }
    const scriptStart = lines.findIndex((l) => l.includes("<script"));
    for (const name of NAMES[rel]) {
      const computedAt = lines.findIndex((l) => l.startsWith(`const ${name} = computed(`));
      if (computedAt < 0) {
        problems.push(`${rel}: 找不到 const ${name} = computed(...)`);
        continue;
      }
      if (!lines.some((l) => l.startsWith(`const bundled${name}`))) {
        problems.push(`${rel}: 找不到 const bundled${name}`);
      }
      // computed 声明之前（script 内）不能引用这个名字，否则运行时 TDZ 报错
      for (let i = scriptStart + 1; i < computedAt; i++) {
        const line = lines[i];
        if (line.includes(`bundled${name}`)) continue;
        const used = new RegExp(`(^|[^.\\w$])${name}\\s*[.\\[()]`).test(line);
        if (used) {
          problems.push(
            `${rel}: ${name} 在第 ${i + 1} 行就被引用，而 computed 到第 ${computedAt + 1} 行才声明（运行时 TDZ 报错）`,
          );
        }
      }
    }
  }
  if (problems.length) {
    console.error("[grammar-wiring] 发现问题：");
    for (const p of problems) console.error("  - " + p);
    return false;
  }
  console.log("[grammar-wiring] 五个语法组件接线正常（显式 import + computed 早于引用）");
  return true;
}

// 直接执行时以退出码反馈
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(check() ? 0 : 1);
}
