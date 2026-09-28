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
    const existing = s.packs.find((x) => x.id === p.id);
    if (existing) {
      // 同 id 合并：追加新课程（去重），不删除已有课程，避免多次导入同一包时丢课
      const ids = new Set(existing.courses || []);
      for (const cid of p.courses || []) ids.add(cid);
      existing.courses = [...ids];
      if (p.title) existing.title = p.title;
      if (p.description) existing.description = p.description;
      if (p.level) existing.level = p.level;
      if (p.language) existing.language = p.language;
      added.push(existing);
    } else {
      s.packs.push(p);
      added.push(p);
    }
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

// 新建一个空的导入课程包（文件夹）
export function createImportedPack(title: string): JpCoursePack {
  const s = getStore();
  const pack: JpCoursePack = {
    id: "my-pack-" + Date.now().toString(36),
    title: title || "新建文件夹",
    language: "ja",
    level: "N5",
    description: "",
    courses: [],
  };
  s.packs.push(pack);
  saveStore();
  return pack;
}

// 重命名导入课程包（文件夹）
export function renameImportedPack(packId: string, title: string) {
  const s = getStore();
  const p = s.packs.find((x) => x.id === packId);
  if (p) {
    p.title = title;
    saveStore();
  }
}

// 删除导入课程包里的单个课程
export function removeImportedCourse(packId: string, courseId: string) {
  const s = getStore();
  const p = s.packs.find((x) => x.id === packId);
  if (p) p.courses = (p.courses || []).filter((c) => c !== courseId);
  delete s.courses[courseKey(packId, courseId)];
  saveStore();
}

// 把课程从某个导入包移动到另一个导入包（目标不存在则新建文件夹）
export function moveImportedCourse(courseId: string, fromPackId: string, toPackId: string): JpCoursePack {
  const s = getStore();
  const fromKey = courseKey(fromPackId, courseId);
  const course = s.courses[fromKey];
  if (!course) throw new Error("课程不存在");

  const from = s.packs.find((x) => x.id === fromPackId);
  if (from) from.courses = (from.courses || []).filter((c) => c !== courseId);

  let to = s.packs.find((x) => x.id === toPackId);
  if (!to) {
    to = { id: toPackId, title: toPackId, language: "ja", level: "N5", description: "", courses: [] };
    s.packs.push(to);
  }
  if (!(to.courses || []).includes(courseId)) to.courses = [...(to.courses || []), courseId];

  delete s.courses[fromKey];
  course.coursePackId = toPackId;
  s.courses[courseKey(toPackId, courseId)] = course;
  saveStore();
  return to;
}

// 在某个导入包内上移/下移课程（delta 为 -1 或 1）
export function moveImportedCourseInPack(packId: string, courseId: string, delta: -1 | 1) {
  const s = getStore();
  const p = s.packs.find((x) => x.id === packId);
  if (!p) return;
  const arr = [...(p.courses || [])];
  const i = arr.indexOf(courseId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  p.courses = arr;
  saveStore();
}

// 重命名导入课程包里的单个课程
export function renameImportedCourse(packId: string, courseId: string, title: string) {
  const s = getStore();
  const c = s.courses[courseKey(packId, courseId)];
  if (c) {
    c.title = title;
    saveStore();
  }
}

// 按课程名排序某个导入课程包内的课程
export function sortImportedCoursesByName(packId: string) {
  const s = getStore();
  const p = s.packs.find((x) => x.id === packId);
  if (!p) return;
  p.courses = [...(p.courses || [])].sort((a, b) => {
    const ta = s.courses[courseKey(packId, a)]?.title || a;
    const tb = s.courses[courseKey(packId, b)]?.title || b;
    return ta.localeCompare(tb, "ja");
  });
  saveStore();
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
