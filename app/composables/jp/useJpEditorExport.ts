import { ref } from "vue";
import type { Ref } from "vue";
import {
  saveOrShareJson,
  buildSingleCoursePack,
  buildAllCoursesPack,
} from "~/composables/jp/useJpExport";
import type { JpCourse } from "~/types/jp";

/**
 * 课程编辑器（jp-editor）的导出（从 app/pages/jp-editor/index.vue 抽出，逻辑逐字搬移）。
 *
 * ⚠️ 导出格式不许动：`buildSingleCoursePack` / `buildAllCoursesPack` 的字段顺序与格式
 * 由 `~/composables/jp/useJpExport` 决定，本 composable 只负责调用与文件名，
 * **不要**在这里做任何 JSON 组装。
 *
 * 单一数据源：`exportingAll` 只在本 composable 里持有；`course` 由页面注入。
 */
export function useJpEditorExport(course: Ref<JpCourse | null>) {
  // ===== 导出 =====
  const exportingAll = ref(false);

  async function exportJson() {
    if (!course.value) return;
    await saveOrShareJson(course.value, `${course.value.id}.json`);
  }

  // 把当前单课包装成「单文件课程包」，可直接在首页「导入课程包」导入
  async function exportCoursePack() {
    if (!course.value) return;
    const pack = buildSingleCoursePack(course.value);
    const packId = course.value.coursePackId || "my-pack";
    await saveOrShareJson(pack, `${packId}.json`);
  }

  // 导出课程页上的全部课程（内置 + 已导入）
  async function exportAllCourses() {
    if (exportingAll.value) return;
    exportingAll.value = true;
    try {
      const pack = await buildAllCoursesPack();
      await saveOrShareJson(pack, "jplingo-all-courses.json");
    } catch (err) {
      alert("导出失败：" + (err as Error).message);
    } finally {
      exportingAll.value = false;
    }
  }

  return { exportingAll, exportJson, exportCoursePack, exportAllCourses };
}
