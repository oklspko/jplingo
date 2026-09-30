// 校验已生成的变形课程 JSON（public/courses/jp-transform/*.json）：
//  1) 每课固定 30 题；2) 每条语句 kana/token 非空、同课无重复；
//  3) 每条语句的 japanese/kana 与引擎「实时重算」一致（防止生成脚本与引擎漂移）；
//  4) 谓语句课 8 种变形全覆盖；动词课覆盖 五段/一段/サ変/カ変 全部活用类别 + 全部必修动词（音便/例外）。
// 运行：node tools/jp-transform/verify-courses.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { conjugateVerbForm } from "./conjugate.mjs";
import { conjugateNoun, conjugateAdjI, conjugateAdjNa, PRED_FORMS } from "./predicate.mjs";
import { SEED_VERBS, SEED_NOUNS, SEED_A1, SEED_A2, MANDATORY_VERBS } from "./seeds.mjs";
import { classify } from "./verb-class.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COURSES_DIR = path.resolve(__dirname, "..", "..", "public", "courses", "jp-transform");

const pack = JSON.parse(
  fs.readFileSync(path.join(COURSES_DIR, "course-pack.json"), "utf8"),
);

let pass = 0;
let fail = 0;
function chk(desc, cond) {
  if (cond) pass++;
  else {
    fail++;
    console.log(`  x ${desc}`);
  }
}

function verbClassOf(dict) {
  const v = SEED_VERBS.find((s) => s.dict === dict);
  return classify(dict, v.kana);
}

// ---- 谓语句课：8 种变形全覆盖 + 每条与引擎一致 ----
function checkPredicateCourse(courseId, conjFn, words) {
  const course = JSON.parse(
    fs.readFileSync(path.join(COURSES_DIR, `${courseId}.json`), "utf8"),
  );
  const stmts = course.statements || [];

  chk(`${courseId} 题量=30`, stmts.length === 30);

  // 每条都有 kana 与 token
  const badKana = stmts.filter((s) => !s.kana || !s.tokens?.length || !s.tokens[0].kana);
  chk(`${courseId} 每条都有 kana/token`, badKana.length === 0);

  // 无重复
  const uniq = new Set(stmts.map((s) => s.japanese));
  chk(`${courseId} 无重复`, uniq.size === stmts.length);

  // 引擎重算对照 + 8 种变形覆盖
  const expected = new Map();
  for (const w of words) {
    for (const f of PRED_FORMS) {
      const r = conjFn(w.dict, w.kana, f.key);
      expected.set(r.form, r.kana);
    }
  }
  const labels = new Set();
  for (const s of stmts) {
    chk(`${courseId} 正确变形: ${s.japanese}`, expected.has(s.japanese));
    if (expected.has(s.japanese)) {
      chk(`${courseId} kana 一致: ${s.japanese}`, s.kana === expected.get(s.japanese));
    }
    const m = s.chinese.match(/（(.+?)）$/);
    if (m) labels.add(m[1]);
  }
  for (const f of PRED_FORMS) {
    chk(`${courseId} 覆盖「${f.label}」`, labels.has(f.label));
  }
}

// ---- 动词课：30 题 + 全部活用类别 + 必修动词（音便/例外）+ 引擎一致 ----
function checkVerbCourse(courseId) {
  const course = JSON.parse(
    fs.readFileSync(path.join(COURSES_DIR, `${courseId}.json`), "utf8"),
  );
  const stmts = course.statements || [];
  const formKey = courseId.replace(/^jp-tr-verb-/, "");

  chk(`${courseId} 题量=30`, stmts.length === 30);

  const badKana = stmts.filter((s) => !s.kana || !s.tokens?.length || !s.tokens[0].kana);
  chk(`${courseId} 每条都有 kana/token`, badKana.length === 0);

  const uniq = new Set(stmts.map((s) => s.japanese));
  chk(`${courseId} 无重复`, uniq.size === stmts.length);

  // 引擎重算对照
  const expected = new Map(); // japanese -> verb
  for (const v of SEED_VERBS) {
    const r = conjugateVerbForm(v.dict, v.kana, formKey);
    expected.set(r.japanese, v);
  }
  const classes = new Set();
  for (const s of stmts) {
    chk(`${courseId} 正确变形: ${s.japanese}`, expected.has(s.japanese));
    const v = expected.get(s.japanese);
    if (v) {
      const r = conjugateVerbForm(v.dict, v.kana, formKey);
      chk(`${courseId} kana 一致: ${s.japanese}`, s.kana === r.kana);
      classes.add(verbClassOf(v.dict));
    }
  }

  // 覆盖全部活用类别
  for (const c of ["godan", "ichidan", "suru", "kuru"]) {
    chk(`${courseId} 覆盖「${c}」`, classes.has(c));
  }

  // 必修动词全覆盖（音便 / 行く 例外 / る 结尾五段例外）
  const jpSet = new Set(stmts.map((s) => s.japanese));
  for (const mv of SEED_VERBS.filter((v) => MANDATORY_VERBS.has(v.dict))) {
    const r = conjugateVerbForm(mv.dict, mv.kana, formKey).japanese;
    chk(`${courseId} 含必修「${mv.dict}」(${r})`, jpSet.has(r));
  }
}

// ---- 执行 ----
console.log("== 谓语句课程 ==");
checkPredicateCourse("jp-tr-noun-01", conjugateNoun, SEED_NOUNS);
checkPredicateCourse("jp-tr-adj1-01", conjugateAdjI, SEED_A1);
checkPredicateCourse("jp-tr-adj2-01", conjugateAdjNa, SEED_A2);

console.log("== 动词课程 ==");
for (const id of pack.courses.filter((c) => c.startsWith("jp-tr-verb-"))) {
  checkVerbCourse(id);
}

console.log(`\n==== 课程校验结果: ${pass} 通过 / ${fail} 失败 ====`);
process.exit(fail === 0 ? 0 : 1);
