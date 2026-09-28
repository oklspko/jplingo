import { ref } from "vue";
import type { JpCourse, JpCoursePack } from "~/types/jp";

// 开放课程包导入：把外部课程包存进 localStorage，完全离线可用。
// 存储结构见 docs/course-pack-format.md，与「内置课程」格式一致，
// 便于 fetchCoursePacks / fetchCourse 无缝合并。

const STORAGE_KEY = "jp-lingo-imported-packs";

export interface ImportedStore {
  packs: JpCoursePack[];
  courses: Record<string, JpCourse>;
}

function emptyStore(): ImportedStore {
  return { packs: [], courses: {} };
}

function loadStore(): ImportedStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const data = JSON.parse(raw) as Partial<ImportedStore>;
    return {
      packs: Array.isArray(data.packs) ? data.packs : [],
      courses: data.courses && typeof data.courses === "object" ? data.courses : {},
    };
  } catch (err) {
    console.error("读取导入课程包失败：", err);
    return emptyStore();
  }
}

const store = ref<ImportedStore | null>(null);

function getStore(): ImportedStore {
  if (!store.value) store.value = loadStore();
  return store.value;
}

function saveStore() {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store.value));
}

function courseKey(packId: string, courseId: string): string {
  return `${packId}/${courseId}`;
}

// 已导入课程包列表（供课程列表合并展示）
export function getImportedPacks(): JpCoursePack[] {
  return getStore().packs;
}

// 查询已导入课程（供 fetchCourse 优先命中）
export function getImportedCourse(packId: string, courseId: string): JpCourse | null {
  return getStore().courses[courseKey(packId, courseId)] ?? null;
}

export function listImportedPacks(): JpCoursePack[] {
  return getImportedPacks();
}

// 合并一批课程包到导入存储：同 id 覆盖旧包，返回本次新增的包
function mergePacks(packs: JpCoursePack[], courses: Record<string, JpCourse>): JpCoursePack[] {
  const s = getStore();
  const added: JpCoursePack[] = [];
  for (const p of packs) {
    if (!p || !p.id) continue;
    const oldIdx = s.packs.findIndex((x) => x.id === p.id);
    if (oldIdx >= 0) {
      const old = s.packs[oldIdx];
      for (const cid of old.courses || []) delete s.courses[courseKey(p.id, cid)];
      s.packs.splice(oldIdx, 1);
    }
    s.packs.push(p);
    added.push(p);
  }
  for (const [key, course] of Object.entries(courses)) {
    s.courses[key] = course;
  }
  saveStore();
  return added;
}

// 从 URL 导入课程包：支持「单文件打包」（含 courses）或「目录索引」（course-packs.json）
export async function importPackFromUrl(url: string): Promise<JpCoursePack[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载课程包失败（HTTP ${res.status}）`);
  const data = await res.json();
  return mergeFromData(data, url);
}

// 从 JSON 文件导入课程包（单文件打包格式）
export async function importPackFromFile(file: File): Promise<JpCoursePack[]> {
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("不是合法的 JSON 文件");
  }
  return mergeFromData(data, null);
}

async function mergeFromData(data: any, sourceUrl: string | null): Promise<JpCoursePack[]> {
  // 单文件打包：已内联所有课程
  if (data && data.courses && typeof data.courses === "object") {
    return mergePacks((data.coursePacks || []) as JpCoursePack[], data.courses);
  }

  // 目录索引：courses 是课程 id 数组，需按目录相对路径逐课拉取
  const packs = (data?.coursePacks || []) as JpCoursePack[];
  if (packs.length === 0) throw new Error("课程包内容为空");
  if (!sourceUrl) throw new Error("该 JSON 只是目录索引，请改用 URL 方式导入");

  const base = sourceUrl.replace(/[^/]*$/, "");
  const courses: Record<string, JpCourse> = {};
  for (const p of packs) {
    for (const courseId of p.courses || []) {
      const url = `${base}${p.id}/${courseId}.json`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`课程下载失败：${courseId}（HTTP ${r.status}）`);
      const course = (await r.json()) as JpCourse;
      courses[courseKey(p.id, courseId)] = course;
    }
  }
  return mergePacks(packs, courses);
}

// 把单个课程并入导入存储：同包追加、同课覆盖，不破坏包内其他课程。返回所属课程包。
export function upsertImportedCourse(course: JpCourse): JpCoursePack {
  const s = getStore();
  const packId = course.coursePackId || "my-pack";
  const courseId = course.id;
  let pack = s.packs.find((p) => p.id === packId);
  if (!pack) {
    pack = {
      id: packId,
      title: course.title || packId,
      language: "ja",
      level: "N5",
      description: "",
      courses: [],
    };
    s.packs.push(pack);
  }
  if (!pack.courses.includes(courseId)) pack.courses.push(courseId);
  s.courses[courseKey(packId, courseId)] = course;
  saveStore();
  return pack;
}

// 导入课程包数据（兼容「单课 JSON」和「单文件课程包 JSON」）到本地存储。
// 供编辑器粘贴/文件导入时直接落库，免去「导出 → 首页再导入」的来回。返回新增/更新的包。
export async function importPackFromData(data: any): Promise<JpCoursePack[]> {
  if (data && data.courses && typeof data.courses === "object") {
    return mergeFromData(data, null);
  }
  const course = data as JpCourse;
  if (!course || !course.id || !Array.isArray(course.statements)) {
    throw new Error("JSON 格式不对：缺少 id 或 statements");
  }
  return [upsertImportedCourse(course)];
}

export function removeImportedPack(packId: string) {
  const s = getStore();
  const pack = s.packs.find((p) => p.id === packId);
  s.packs = s.packs.filter((p) => p.id !== packId);
  if (pack) {
    for (const courseId of pack.courses || []) {
      delete s.courses[courseKey(packId, courseId)];
    }
  }
  saveStore();
}
