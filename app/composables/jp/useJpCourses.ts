import type { JpCourse, JpCoursePack, JpStatement } from "~/types/jp";
import { isSingleKanaCourseId } from "~/composables/jp/useJpRomaji";
import {
  getImportedPacks,
  getImportedCourse,
} from "~/composables/jp/useJpImportedPacks";

const PACK_PRIORITY = ["jp-kana", "jp-basic-01"];

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
  const res = await fetch("/courses/course-packs.json");
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

  const res = await fetch(`/courses/${packId}/${courseId}.json`);
  if (!res.ok) throw new Error(`课程不存在：${courseId}`);
  return (await res.json()) as JpCourse;
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

function shuffle<T>(arr: T[]): T[] {
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

// 每项内容在整节课里的出现总次数
export function getCourseExposures(packId: string): number {
  if (packId === "jp-gaokao") return 3; // 高考单词：学 1 遍 + 分组循环 + 整体复习
  return 1; // 句子生长/五十音等：每词每句只考 1 遍，不再循环重复
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

// 实际练习题数（含复习循环）
export function getPracticeCount(packId: string, statements: JpStatement[]): number {
  return dedupeStatements(statements).length * getCourseExposures(packId);
}
