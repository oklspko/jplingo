import { ref } from "vue";
import {
  createImportedPack,
  renameImportedPack,
  removeImportedCourse,
  moveImportedCourse,
  renameImportedCourse,
  sortImportedCoursesByName,
} from "~/composables/jp/useJpImportedPacks";

/**
 * 首页「分组管理」弹窗与文件夹/课程管理（从 app/pages/jp-home/index.vue 抽出，逻辑逐字搬移）。
 *
 * 页面注入的三项（都只传现值/函数，不新建第二份状态）：
 * - `packTitles`：课程包 id → 标题，取 `coursePacks` 的当前快照（`renamePack` 里 `prompt` 的默认值用）；
 * - `loadAll`：任何一次改动后都要重新拉课程包列表；
 * - `courseTitleOf`：来自 `useJpHomeCourses`（原页面里同名函数读的是 `courseIndex` 之外的导入课程表）。
 */
export function useJpHomeManage(
  packTitles: () => Array<{ id: string; title: string }>,
  loadAll: () => Promise<void>,
  courseTitleOf: (packId: string, courseId: string) => string,
) {
  // ===== 分组管理（仅导入的课程包） =====
  const showManage = ref(false);

  function openManage() {
    showManage.value = true;
  }

  async function renameCourse(packId: string, courseId: string) {
    const name = prompt("重命名课程：", courseTitleOf(packId, courseId));
    if (!name) return;
    renameImportedCourse(packId, courseId, name);
    await loadAll();
  }

  async function sortPackByName(packId: string) {
    sortImportedCoursesByName(packId);
    await loadAll();
  }

  async function moveCourseTo(packId: string, courseId: string, event: Event) {
    const sel = event.target as HTMLSelectElement;
    const toPackId = sel.value;
    if (!toPackId) return;
    moveImportedCourse(courseId, packId, toPackId);
    await loadAll();
  }

  async function deleteCourse(packId: string, courseId: string) {
    if (!confirm(`确定删除课程「${courseTitleOf(packId, courseId)}」？`)) return;
    removeImportedCourse(packId, courseId);
    await loadAll();
  }

  async function renamePack(packId: string) {
    const p = packTitles().find((x) => x.id === packId);
    const name = prompt("重命名文件夹：", p?.title || packId);
    if (!name) return;
    renameImportedPack(packId, name);
    await loadAll();
  }

  async function createFolder() {
    const name = prompt("新建文件夹名称：", "新建文件夹");
    if (!name) return;
    createImportedPack(name);
    await loadAll();
  }

  return {
    showManage,
    openManage,
    renameCourse,
    sortPackByName,
    moveCourseTo,
    deleteCourse,
    renamePack,
    createFolder,
  };
}
