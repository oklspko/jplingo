import type { JpCourse, JpCoursePack } from "~/types/jp";

const PACK_PRIORITY = ["jp-kana", "jp-basic-01"];

export async function fetchCoursePacks(): Promise<JpCoursePack[]> {
  const res = await fetch("/courses/course-packs.json");
  const data = await res.json();
  return (data.coursePacks || []) as JpCoursePack[];
}

export async function fetchCourse(
  packId: string,
  courseId: string,
): Promise<JpCourse> {
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
      count: course.statements?.length || 0,
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
