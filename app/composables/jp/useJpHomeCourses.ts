import { ref } from "vue";
import type { Ref } from "vue";
import {
  fetchCoursePacks,
  fetchCourseMeta,
  sortCoursePacks,
} from "~/composables/jp/useJpCourses";
import { listImportedPacks, getImportedCourse } from "~/composables/jp/useJpImportedPacks";
import type { JpCoursePack } from "~/types/jp";

interface CourseIndex {
  [key: string]: { title: string; count: number };
}

/**
 * 首页课程包列表 + 课程元数据索引（从 app/pages/jp-home/index.vue 抽出，逻辑逐字搬移）。
 *
 * 单一数据源：`coursePacks` / `courseIndex` 只在本 composable 里持有，页面调用一次后把返回值
 * 作为参数注入其它 composable（导入 / 分组管理只接收 `loadAll`，不自己再 `fetchCoursePacks()`）。
 *
 * 参数 `expandedPacks`：展开状态归 `useJpHomeUiState` 所有，但 `loadAll()` 需要「只给当前已展开的包
 * 加载元数据」，所以由页面把同一个 ref 传进来——**仍是同一份状态**，页面不新建第二份。
 */
export function useJpHomeCourses(expandedPacks: Ref<Set<string>>) {
  const coursePacks = ref<JpCoursePack[]>([]);
  const courseIndex = ref<CourseIndex>({});
  const loading = ref(true);
  const importedPackIds = ref<Set<string>>(new Set());
  // 已加载过元数据的课程包（避免重复请求）／正在加载中的课程包（用于「加载中…」提示）
  const loadedPacks = ref<Set<string>>(new Set());
  const loadingPacks = ref<Set<string>>(new Set());

  // 并发上限：一次最多同时请求的课程数，避免展开大包时瞬间发出上百个请求
  const META_CONCURRENCY = 6;

  async function mapConcurrent<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let i = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    });
    await Promise.all(workers);
    return out;
  }

  // 加载某个课程包下所有课程的标题+题数（并行、带并发上限，结果合并进 courseIndex）
  async function loadPackMeta(packId: string) {
    if (loadedPacks.value.has(packId) || loadingPacks.value.has(packId)) return;
    const pack = coursePacks.value.find((p) => p.id === packId);
    if (!pack || pack.courses.length === 0) return;

    loadingPacks.value = new Set([...loadingPacks.value, packId]);
    try {
      const metas = await mapConcurrent(pack.courses, META_CONCURRENCY, (courseId) =>
        fetchCourseMeta(packId, courseId).then((meta) => ({ courseId, meta })),
      );
      const next = { ...courseIndex.value };
      for (const { courseId, meta } of metas) {
        next[`${packId}/${courseId}`] = meta;
      }
      courseIndex.value = next;
      loadedPacks.value = new Set([...loadedPacks.value, packId]);
    } finally {
      const s = new Set(loadingPacks.value);
      s.delete(packId);
      loadingPacks.value = s;
    }
  }

  async function loadAll() {
    loading.value = true;
    try {
      const packs = sortCoursePacks(await fetchCoursePacks());
      coursePacks.value = packs;
      importedPackIds.value = new Set(listImportedPacks().map((p) => p.id));

      // 默认全部折叠，由用户自行展开

      // 课程元数据按需加载：只请求当前已展开的课程包，其余在展开时再加载
      courseIndex.value = {};
      loadedPacks.value = new Set();
      loadingPacks.value = new Set();
      await Promise.all([...expandedPacks.value].map(loadPackMeta));
    } catch (err) {
      console.error("加载课程失败：", err);
    } finally {
      loading.value = false;
    }
  }

  function getCourseTitle(packId: string, courseId: string) {
    return courseIndex.value[`${packId}/${courseId}`]?.title || courseId;
  }

  function courseMetaText(packId: string, courseId: string): string {
    const meta = courseIndex.value[`${packId}/${courseId}`];
    if (meta) return `${meta.count} 题`;
    return loadingPacks.value.has(packId) ? "加载中…" : "0 题";
  }

  function courseTitleOf(packId: string, courseId: string): string {
    return getImportedCourse(packId, courseId)?.title || courseId;
  }

  return {
    coursePacks,
    courseIndex,
    loading,
    importedPackIds,
    loadedPacks,
    loadingPacks,
    loadAll,
    loadPackMeta,
    getCourseTitle,
    courseMetaText,
    courseTitleOf,
  };
}
