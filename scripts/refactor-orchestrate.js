/**
 * REFACTOR.md 的自动编排脚本（用作 DSH workflow 工具的 script 正文）。
 *
 * 说明：
 * - workflow 脚本自身**没有文件系统/网络权限**，所有读文件、改代码、跑测试都由子代理完成；
 *   脚本只负责「按步骤串行调度 + 选择模型 + 收集结构化证据 + 失败自动升级 + 阶段闸门」。
 * - 同一批文件不能并行修改，所以步骤**必须串行**（这里不用 parallel）。
 * - 每个子代理的上下文是全新的，所以 prompt 里必须自带：要做什么、不许动什么、怎么验证。
 *
 * 用法（把下面的函数体粘进 workflow 工具的 script，args 传 { branch }）：
 *   workflow({ script: <本文件正文>, meta: {...}, args: { branch: "refactor/structure-auto" } })
 *
 * 安全约定（很重要）：
 *   1. 全程只在 refactor 分支上提交，**绝不 push main**（main 会被 EdgeOne 自动部署上线，必须留人闸门）。
 *   2. 每步必须回报可核对的证据（自测断言数、git 提交号、验证命令输出），不接受「已完成」这种口头结论。
 *   3. 触及核心不变量文件的改动，一律追加一次 Pro 复核。
 */

const BRANCH = args.branch || "refactor/structure-auto";

// 每步返回的结构化结果（schema 只用 type/properties/required/additionalProperties/enum）
const STEP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["step", "status", "commit", "evidence"],
  properties: {
    step: { type: "string" },
    status: { type: "string", enum: ["done", "failed"] },
    commit: { type: "string" },
    evidence: { type: "string" },
  },
};

const VERIFY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ok", "reason"],
  properties: {
    ok: { type: "boolean" },
    reason: { type: "string" },
    risky_files: { type: "string" },
  },
};

const FLASH = { provider: "deepseek", model: "deepseek-v4-flash" };
const PRO = { provider: "deepseek", model: "deepseek-v4-pro" };

/** 必须由 Pro 复核的文件（核心不变量所在） */
const GUARDED = [
  "useJpCourses.ts",
  "useJpInput.ts",
  "useJpData.ts",
  "useJpDataUpdate.ts",
  "useJpSound.ts",
  "useJpTts.ts",
];

function stepBrief(n) {
  return `仓库：D:\\my-project\\jplingo（分支 ${BRANCH}）。
任务：执行 REFACTOR.md 里的「步骤 ${n}」，严格照那一节的「做 / 禁止 / 通过标志」执行。

硬性规则：
1. 只改实现方式，**功能与界面必须完全不变**；不变量清单见 jplingo/CLAUDE.md，一个字都不能违反。
2. 改完必须跑自测并把结果原样带回来：\`node tests/offline-tts/run.cjs\`（要能说出每个 spec 的合计与失败数）。
3. 有构建产物时再跑一次渲染快照脚本（若步骤 4 已建立）；没有就说明原因。
4. 小步提交，提交信息用中文；提交前必须执行：
   \`git checkout HEAD -- dist; git clean -fdq dist\`，**永远不要 git add dist**。
5. 只在本分支提交，**不要 push、不要碰 main**。
6. 返回结构化结果：status=done/failed；commit=短哈希；evidence=验证命令的关键输出（断言数、失败数、关键 diff 统计）。`;
}

const verifyBrief = (n, evidence) => `仓库：D:\\my-project\\jplingo（分支 ${BRANCH}）。
请**独立复核**「步骤 ${n}」是否真的做到了「功能界面不变」：
- 自己去看 git 提交与 diff（不要只信下面的自述）；
- 自己重跑一次自测并核对断言数与失败数；
- 重点检查是否触碰了这些文件：${GUARDED.join("、")}；
- 若触及，逐条对照 CLAUDE.md 的不变量，判断是等价变形还是行为变化。
上报者自述：${evidence}
返回 ok=true 只在「确认无行为变化」时给出；有任何疑点就 ok=false 并写清理由。`;

const results = [];

async function runStep(n, model) {
  phase(`步骤 ${n}`);
  const r = await agent(stepBrief(n), { ...model, label: `步骤 ${n}`, schema: STEP_SCHEMA });
  if (!r || r.status !== "done") {
    log(`步骤 ${n} 执行未通过，停止编排（避免带着红灯往下走）`);
    return { ok: false };
  }
  // 每阶段闸门 + 触及守备文件时强制 Pro 复核
  const needPro = n >= 12 || n === 6 || GUARDED.some((f) => (r.evidence || "").includes(f));
  const v = await agent(verifyBrief(n, r.evidence || ""), {
    ...(needPro ? PRO : FLASH),
    label: `复核 ${n}`,
    schema: VERIFY_SCHEMA,
  });
  results.push({ step: n, ...r, verified: v });
  if (!v || v.ok !== true) {
    log(`步骤 ${n} 复核未通过：${v ? v.reason : "无结论"}`);
    return { ok: false };
  }
  return { ok: true };
}

// ── 阶段 ① 安全网（Flash，必须最先完成，否则后面没有护栏）────────────────
phase("① 安全网");
for (const n of [1, 2, 3, 4, 5]) {
  const out = await runStep(n, FLASH);
  if (!out.ok) return { stoppedAt: n, phase: "①", results };
}

// ── 阶段 ② 结构重构（Flash 执行，Pro 复核）──────────────────────────────
phase("② 结构重构");
for (const n of [6, 7, 8, 9, 10, 11]) {
  const out = await runStep(n, FLASH);
  if (!out.ok) return { stoppedAt: n, phase: "②", results };
}

// ── 阶段 ③ 算法等价重构（Pro 执行 + Pro 复核）──────────────────────────
phase("③ 算法等价重构");
for (const n of [12, 13, 14, 15, 16]) {
  const out = await runStep(n, PRO);
  if (!out.ok) return { stoppedAt: n, phase: "③", results };
}

// ── 阶段 ④ 终审（Pro 判定，人工闸门在脚本之外）──────────────────────────
phase("④ 终审");
const final = await agent(
  `仓库：D:\\my-project\\jplingo（分支 ${BRANCH}）。执行 REFACTOR.md「步骤 17–18」：
1. 全量 diff 复查：git diff main...${BRANCH} --stat，逐条对照 CLAUDE.md 不变量清单；
2. 端到端验证：node tests/offline-tts/run.cjs、npx nuxi typecheck、pnpm generate 全部要绿；
3. **不要 merge 到 main、不要 push、不要打 tag**（合并上线必须由人确认）。
返回：status、commit、evidence（三项验证的关键输出 + diff 统计）。若发现任何行为变化，status=failed 并指出位置。`,
  { ...PRO, label: "终审", schema: STEP_SCHEMA },
);

return {
  branch: BRANCH,
  steps: results.map((r) => ({ step: r.step, commit: r.commit, verified: r.verified?.ok })),
  final,
  note: "全部完成后由人确认再合并 main；合并即触发 EdgeOne 线上部署与 APK 发布。",
};
