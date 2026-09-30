import type { JpCourse, JpCoursePack, JpStatement } from "~/types/jp";
import { isSingleKanaCourseId } from "~/composables/jp/useJpRomaji";
import {
  getImportedPacks,
  getImportedCourse,
} from "~/composables/jp/useJpImportedPacks";
import { cacheBustUrl } from "~/composables/jp/useJpBuildId";

const PACK_PRIORITY = ["jp-kana", "jp-basic-01"];

// 词汇课程包（高考 + N5–N1）：均支持「无分类测试」虚拟课程
export const VOCAB_PACK_IDS = ["jp-gaokao", "jp-n5", "jp-n4", "jp-n3", "jp-n2", "jp-n1"];
export const GAOKAO_PACK_ID = "jp-gaokao";
export const GAOKAO_MIXED_COURSE_ID = "jp-gaokao-all"; // 兼容旧引用

export function isVocabPack(packId: string): boolean {
  return VOCAB_PACK_IDS.includes(packId);
}

// 无分类测试的虚拟课程 id：不存在对应 JSON，进入练习时动态聚合该包全部词库
export function mixedCourseIdOf(packId: string): string {
  return `${packId}-all`;
}

export function isMixedCourse(packId: string, courseId: string): boolean {
  return isVocabPack(packId) && courseId === mixedCourseIdOf(packId);
}

export type LearnedKind = "word" | "sentence" | "kana";

// 词句分类：单个词=单词，多个词=句子。
// 五十音包内特殊处理：单字课（清音/浊音/拗音）=假名；
// 练习测试课里一个词拆成多个意群（多个 token）仍应算「单词」而非「句子」。
export function classifyKind(
  packId: string,
  courseId: string,
  tokensCount = 1,
): LearnedKind {
  if (packId === "jp-kana") {
    return isSingleKanaCourseId(courseId) ? "kana" : "word";
  }
  return tokensCount > 1 ? "sentence" : "word";
}

export async function fetchCoursePacks(): Promise<JpCoursePack[]> {
  const res = await fetch(cacheBustUrl("/courses/course-packs.json"));
  const data = await res.json();
  const builtin = (data.coursePacks || []) as JpCoursePack[];
  // 合并「内置 + 导入」两个来源，导入的包排在后面
  return [...builtin, ...getImportedPacks()];
}

export async function fetchCourse(
  packId: string,
  courseId: string,
): Promise<JpCourse> {
  // 导入的课程优先命中（离线导入的课程不会出现在 /courses 目录下）
  const imported = getImportedCourse(packId, courseId);
  if (imported) return imported;

  // 无分类测试：动态聚合该词汇包全部词库（按原文去重）
  if (isMixedCourse(packId, courseId)) {
    return {
      id: courseId,
      coursePackId: packId,
      title: "无分类测试",
      order: 0,
      statements: await fetchMixedStatements(packId),
    };
  }

  const res = await fetch(cacheBustUrl(`/courses/${packId}/${courseId}.json`));
  if (!res.ok) throw new Error(`课程不存在：${courseId}`);
  return (await res.json()) as JpCourse;
}

// 聚合某词汇包全部课程语句（跨课去重，保持首次出现顺序）
export async function fetchMixedStatements(packId: string): Promise<JpStatement[]> {
  const packs = await fetchCoursePacks();
  const pack = packs.find((p) => p.id === packId);
  const courseIds = (pack?.courses || []).filter(
    (id) => id !== mixedCourseIdOf(packId),
  );
  const all: JpStatement[] = [];
  for (const id of courseIds) {
    try {
      const course = await fetchCourse(packId, id);
      all.push(...(course.statements || []));
    } catch {
      // 单个课程加载失败时跳过，不阻断整体测试
    }
  }
  return dedupeStatements(all);
}

export async function fetchCourseMeta(
  packId: string,
  courseId: string,
): Promise<{ title: string; count: number }> {
  try {
    const course = await fetchCourse(packId, courseId);
    return {
      title: course.title || courseId,
      count: getPracticeCount(course.coursePackId || packId, course.statements || []),
    };
  } catch {
    return { title: courseId, count: 0 };
  }
}

export function sortCoursePacks(packs: JpCoursePack[]): JpCoursePack[] {
  return [...packs].sort((a, b) => {
    const ai = PACK_PRIORITY.indexOf(a.id);
    const bi = PACK_PRIORITY.indexOf(b.id);
    const aRank = ai === -1 ? 999 : ai;
    const bRank = bi === -1 ? 999 : bi;
    return aRank - bRank;
  });
}

// ===== 记忆曲线分块复习 =====
// 按「每 chunkSize 个一组：先学新内容 → 紧接着循环复习该组 → 最后整体复习」重排，
// 用短间隔强化贴合遗忘曲线，避免「整课从头到尾学一遍」导致记忆效率差。

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 按 japanese 去重，保持首次出现顺序（高考单词课同词循环 3 遍，先归一到 30 词）
export function dedupeStatements(statements: JpStatement[]): JpStatement[] {
  const seen = new Set<string>();
  const out: JpStatement[] = [];
  for (const s of statements) {
    if (!seen.has(s.japanese)) {
      seen.add(s.japanese);
      out.push(s);
    }
  }
  return out;
}

// 每项内容在整节课里的出现总次数（高考/N5–N1 单词课 3 遍；句子生长走 buildGrowingOrder，不在此计数）
export function getCourseExposures(packId: string): number {
  if (packId === "jp-gaokao") return 3; // 高考单词：学 1 遍 + 分组循环 + 整体复习
  if (/^jp-n[1-5]$/.test(packId)) return 3; // N5–N1 词汇课同样循环 3 遍
  return 1; // 五十音等：每词每句只考 1 遍，不再循环重复
}

export function buildChunkedOrder(
  statements: JpStatement[],
  chunkSize = 6,
  exposures = 3,
): JpStatement[] {
  if (exposures <= 1) return statements;
  const unique = dedupeStatements(statements);
  if (unique.length === 0) return [];

  const chunks: JpStatement[][] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    chunks.push(unique.slice(i, i + chunkSize));
  }

  const out: JpStatement[] = [];
  for (const chunk of chunks) {
    out.push(...chunk); // 学习新内容
    out.push(...shuffle(chunk)); // 立即循环复习该组（短间隔）
  }
  for (let i = 0; i < exposures - 2; i++) {
    out.push(...shuffle(unique)); // 整体复习（长间隔）
  }
  return out;
}

// ===== 句子生长底层逻辑：词先句后，逐句循环 =====
// 「每个词在它第一次进入句子之前先被学习」，而不是把所有单词一次性学完。
// 逐句推进：写某个句子（如 AをB）前，先把该句用到的、尚未单独练过的单词
// （A、B）按句中顺序练一遍，再进入句子；更长的句子（CでAをB）同理先练 C、A、B。
// 已练过的词不再重复单练（避免「同一个词刚练完紧接着又出现」），
// 而是之后在句子里以「出现在句子中」的方式被反复复习，形成词→句→词→句的循环。
export function buildGrowingOrder(
  statements: JpStatement[],
  _chunkSize = 6,
): JpStatement[] {
  const unique = dedupeStatements(statements);
  if (unique.length === 0) return [];

  const words: JpStatement[] = [];
  const sentences: JpStatement[] = [];
  for (const s of unique) {
    if ((s.tokens?.length || 1) > 1) sentences.push(s);
    else words.push(s);
  }

  const wordByText = new Map<string, JpStatement>();
  for (const w of words) wordByText.set(w.japanese, w);

  const learned = new Set<string>(); // 已作为单词单独练过的词
  const out: JpStatement[] = [];

  for (const sentence of sentences) {
    // 本句会用到、且尚未单独练过的单词（按句中出现顺序，同词去重）
    const used: JpStatement[] = [];
    for (const t of sentence.tokens || []) {
      const w = wordByText.get(t.text);
      if (
        w &&
        !learned.has(w.japanese) &&
        !used.some((u) => u.japanese === w.japanese)
      ) {
        used.push(w);
      }
    }
    for (const w of used) {
      out.push(w);
      learned.add(w.japanese);
    }
    out.push(sentence);
  }

  // 没有被任何句子用到的孤立单词，放到最后统一学习
  for (const w of words) {
    if (!learned.has(w.japanese)) out.push(w);
  }

  return out;
}

// 统一练习顺序入口：句子生长走词句循环，高考走分块循环，其余保持数据原序
export function buildPracticeOrder(
  packId: string,
  statements: JpStatement[],
  chunkSize = 6,
): JpStatement[] {
  if (packId === "jp-growing") return buildGrowingOrder(statements, chunkSize);
  return buildChunkedOrder(statements, chunkSize, getCourseExposures(packId));
}

// 实际练习题数（含记忆曲线复习循环）
export function getPracticeCount(packId: string, statements: JpStatement[]): number {
  return buildPracticeOrder(packId, statements).length;
}
