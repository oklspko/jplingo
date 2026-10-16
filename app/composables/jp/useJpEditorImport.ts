import { ref } from "vue";
import type { Ref } from "vue";
import { importPackFromData } from "~/composables/jp/useJpImportedPacks";
import type { JpCourse } from "~/types/jp";

/**
 * 课程编辑器（jp-editor）的课程导入：文件导入 + 粘贴导入
 * （从 app/pages/jp-editor/index.vue 抽出，逻辑逐字搬移）。
 *
 * 单一数据源：`showPasteModal` / `pasteText` / `pasteError` 只在本 composable 里持有。
 * `refreshCourseOptions`（归 `useJpEditorPicker`）与 `loadCourse` 由页面注入，
 * 本 composable **不自己** `fetchCoursePacks()` / `fetchCourse()`，避免出现第二份课程列表。
 */
export function useJpEditorImport(deps: {
  course: Ref<JpCourse | null>;
  selectedKey: Ref<string>;
  refreshCourseOptions: () => Promise<void>;
  loadCourse: (packId: string, courseId: string) => Promise<void>;
}) {
  // ===== 导入 JSON =====
  // 同时支持「单课 JSON」和「单文件课程包 JSON」（取第一课编辑，其余可分别导入）。
  // 文件导入与粘贴导入共用：先持久化到本地导入存储（课程页面立刻可见），再载入编辑器。

  // 解析课程 JSON：容忍 AI 输出常见的 ```json ... ``` 代码块包裹
  function parseCourseJson(text: string): any {
    let t = text.trim();
    const fence = t.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
    if (fence) t = fence[1].trim();
    return JSON.parse(t);
  }

  // 从导入数据中取出要编辑的课程（单课或课程包第一课）；不合法则抛错
  function extractCourseData(data: any): { courseData: JpCourse; note: string } {
    let courseData: any;
    let note = "";
    if (data && data.courses && typeof data.courses === "object") {
      const keys = Object.keys(data.courses);
      if (keys.length === 0) throw new Error("课程包内没有课程");
      courseData = data.courses[keys[0]];
      if (keys.length > 1) {
        note = `课程包共 ${keys.length} 课，已载入第 1 课，其余可分别导入`;
      }
    } else {
      courseData = data;
    }

    if (!courseData?.id || !Array.isArray(courseData.statements)) {
      throw new Error("JSON 格式不对：缺少 id 或 statements");
    }
    return { courseData, note };
  }

  // 导入并载入：先写入本地存储（课程页面立刻可见），再刷新选择器并载入编辑器
  async function doImport(data: any): Promise<string> {
    const { courseData, note } = extractCourseData(data);
    await importPackFromData(data);
    deps.course.value = courseData;
    await deps.refreshCourseOptions();
    deps.selectedKey.value = `${courseData.coursePackId || "my-pack"}/${courseData.id}`;
    return note;
  }

  async function importJson(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const data = parseCourseJson(await file.text());
      const note = await doImport(data);
      alert("导入成功！已加入课程页面，可直接学习。" + (note ? `（${note}）` : ""));
    } catch (err) {
      alert("导入失败：" + (err as Error).message);
    } finally {
      // 清空 file input，允许重复导入同一个文件
      input.value = "";
    }
  }

  // ===== 粘贴导入 =====
  const showPasteModal = ref(false);
  const pasteText = ref("");
  const pasteError = ref("");

  function openPasteModal() {
    pasteText.value = "";
    pasteError.value = "";
    showPasteModal.value = true;
  }

  function closePasteModal() {
    showPasteModal.value = false;
  }

  async function doPasteImport() {
    const text = pasteText.value.trim();
    if (!text) {
      pasteError.value = "请先粘贴课程 JSON 代码";
      return;
    }

    let data: any;
    try {
      data = parseCourseJson(text);
    } catch (err) {
      pasteError.value = "不是合法的 JSON：" + (err as Error).message;
      return;
    }

    try {
      const note = await doImport(data);
      showPasteModal.value = false;
      pasteText.value = "";
      alert("导入成功！已加入课程页面，可直接学习。" + (note ? `（${note}）` : ""));
    } catch (err) {
      pasteError.value = (err as Error).message || "导入失败";
    }
  }

  return {
    parseCourseJson,
    extractCourseData,
    doImport,
    importJson,
    showPasteModal,
    pasteText,
    pasteError,
    openPasteModal,
    closePasteModal,
    doPasteImport,
  };
}
