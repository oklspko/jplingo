/**
 * 变形练习课程生成脚本
 * ------------------------------------------------------------
 * 设计原则：
 * 1) 不预建变形词表——规则统一在 tools/jp-transform/（独立变形规则库，含自测），
 *    生成时对「真实词（含读音）」实时套规则变形，变形结果一并产出假名读音。
 * 2) 词源为 N5/N4 高频词（tools/jp-transform/seeds.mjs），不重复。
 * 3) 三类谓语句（名词 / 一类形容词 / 二类形容词）各一门课：
 *    8 种变形（敬简体 × 肯否 × 时态）全部覆盖，词循环补足 30 题，同课词不重复。
 * 4) 动词「不按活用类别分课」，只按「变形种类」分课（10 门）：
 *    同一课内混合 五段/一段/サ変/カ変，让学习者自行区分活用类型。
 *    每课 30 题由「必修动词（覆盖全部音便与活用类别）」+ 其余词补足，保证全覆盖。
 *
 * 运行：node scripts/gen-transform-courses.mjs
 * 输出：public/courses/jp-transform/*.json（课程 + course-pack.json）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  conjugateNoun,
  conjugateAdjI,
  conjugateAdjNa,
  PRED_FORMS,
} from "../tools/jp-transform/predicate.mjs";
import { toRomaji } from "../tools/jp-transform/romaji.mjs";
import { conjugateVerbForm } from "../tools/jp-transform/conjugate.mjs";
import {
  SEED_VERBS,
  SEED_NOUNS,
  SEED_A1,
  SEED_A2,
  VERB_FORMS,
  MANDATORY_VERBS,
} from "../tools/jp-transform/seeds.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "courses", "jp-transform");

const PACK_ID = "jp-transform";
const PER_COURSE = 30; // 每课题量

// ============================================================
// 工具
// ============================================================
function stmt(id, chinese, japanese, kana) {
  return {
    id: String(id).padStart(2, "0"),
    chinese,
    japanese,
    kana,
    romaji: toRomaji(kana),
    tokens: [{ text: japanese, kana }],
  };
}

// 打乱数组（可复现种子）
function shuffle(arr, seed) {
  const a = [...arr];
  let s = seed || 12345;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// 三类谓语句课程：8 种变形全覆盖 + 词循环补足 30 题
// ============================================================
function buildPredicateCourse(words, conjFn, id, title, order) {
  const nForms = PRED_FORMS.length; // 8
  const statements = [];
  const pool = shuffle(words, 777);
  let wi = 0;

  // 第一步：用不同词确保 8 种变形各出现一次
  for (let f = 0; f < nForms; f++) {
    const w = pool[wi % pool.length];
    wi++;
    const r = conjFn(w.dict, w.kana, PRED_FORMS[f].key);
    statements.push(
      stmt(statements.length + 1, `${w.chinese}（${PRED_FORMS[f].label}）`, r.form, r.kana),
    );
  }

  // 第二步：词、变形继续循环补足 30 题（同课内词+变形组合不重复）
  const seen = new Set(statements.map((s) => s.japanese));
  let f = 0;
  while (statements.length < PER_COURSE) {
    const w = pool[wi % pool.length];
    const r = conjFn(w.dict, w.kana, PRED_FORMS[f % nForms].key);
    if (!seen.has(r.form)) {
      seen.add(r.form);
      statements.push(
        stmt(statements.length + 1, `${w.chinese}（${PRED_FORMS[f % nForms].label}）`, r.form, r.kana),
      );
    }
    wi++;
    f++;
  }

  return { id, coursePackId: PACK_ID, title, order, statements };
}

// ============================================================
// 动词课程：必修动词（覆盖全部活用类别 + 音便）在前，其余词补足 30 题
// ============================================================
function buildVerbCourse(form, order) {
  const mandatory = shuffle(
    SEED_VERBS.filter((v) => MANDATORY_VERBS.has(v.dict)),
    100 + order,
  );
  const rest = shuffle(
    SEED_VERBS.filter((v) => !MANDATORY_VERBS.has(v.dict)),
    200 + order,
  );
  const picked = [...mandatory, ...rest];

  const statements = [];
  for (let i = 0; i < PER_COURSE; i++) {
    const v = picked[i];
    const r = conjugateVerbForm(v.dict, v.kana, form.key);
    statements.push(stmt(i + 1, `${v.chinese}（${form.label}）`, r.japanese, r.kana));
  }

  return {
    id: `jp-tr-verb-${form.key}`,
    coursePackId: PACK_ID,
    title: `动词变形 · ${form.label}`,
    order,
    statements,
  };
}

// ============================================================
// 生成
// ============================================================
const courses = [];
courses.push(buildPredicateCourse(SEED_NOUNS, conjugateNoun, "jp-tr-noun-01", "名词谓语句变形", 1));
courses.push(buildPredicateCourse(SEED_A1, conjugateAdjI, "jp-tr-adj1-01", "一类形容词谓语句变形", 2));
courses.push(buildPredicateCourse(SEED_A2, conjugateAdjNa, "jp-tr-adj2-01", "二类形容词谓语句变形", 3));

let verbOrder = 10;
for (const form of VERB_FORMS) {
  courses.push(buildVerbCourse(form, verbOrder++));
}

// ============================================================
// 写出文件
// ============================================================
fs.mkdirSync(OUT_DIR, { recursive: true });

const courseIds = [];
for (const c of courses) {
  fs.writeFileSync(
    path.join(OUT_DIR, `${c.id}.json`),
    JSON.stringify(c, null, 2),
    "utf8",
  );
  courseIds.push(c.id);
}

const pack = {
  id: PACK_ID,
  title: "变形练习",
  language: "ja",
  level: "入门",
  description:
    "三类谓语句（名词 / 一类形容词 / 二类形容词）与动词变形专项。动词按变形种类分课，混合各类活用，自行区分。每课 30 题。",
  courses: courseIds,
};
fs.writeFileSync(
  path.join(OUT_DIR, "course-pack.json"),
  JSON.stringify(pack, null, 2),
  "utf8",
);

console.log(`✅ 生成 ${courses.length} 门变形课程 → ${OUT_DIR}`);
console.log(`   每课题量：${PER_COURSE}`);
console.log(`   课程：${courseIds.join(", ")}`);
