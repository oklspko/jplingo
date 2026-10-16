import { ref } from "vue";
import {
  importPackFromUrl,
  importPackFromFile,
  removeImportedPack,
} from "~/composables/jp/useJpImportedPacks";

/**
 * 首页「导入课程包」弹窗（从 app/pages/jp-home/index.vue 抽出，逻辑逐字搬移）。
 *
 * `loadAll` 由页面注入（课程包列表归 `useJpHomeCourses` 所有，导入成功后要刷新列表）。
 */
export function useJpHomeImport(loadAll: () => Promise<void>) {
  // 导入弹窗状态
  const showImport = ref(false);
  const importTab = ref<"url" | "file">("url");
  const importUrl = ref("");
  const importing = ref(false);
  const importError = ref("");
  const importOk = ref("");

  function openImport() {
    showImport.value = true;
    importError.value = "";
    importOk.value = "";
  }

  async function doImportUrl() {
    const url = importUrl.value.trim();
    if (!url) {
      importError.value = "请输入课程包 URL";
      return;
    }
    importing.value = true;
    importError.value = "";
    importOk.value = "";
    try {
      const added = await importPackFromUrl(url);
      importOk.value = `已导入：${added.map((p) => p.title).join("、")}`;
      importUrl.value = "";
      await loadAll();
    } catch (err) {
      importError.value = (err as Error).message || "导入失败";
    } finally {
      importing.value = false;
    }
  }

  async function doImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    importing.value = true;
    importError.value = "";
    importOk.value = "";
    try {
      const added = await importPackFromFile(file);
      importOk.value = `已导入：${added.map((p) => p.title).join("、")}`;
      await loadAll();
    } catch (err) {
      importError.value = (err as Error).message || "导入失败";
    } finally {
      importing.value = false;
      input.value = "";
    }
  }

  async function removePack(packId: string) {
    if (!confirm("确定删除该课程包？")) return;
    removeImportedPack(packId);
    await loadAll();
  }

  return {
    showImport,
    importTab,
    importUrl,
    importing,
    importError,
    importOk,
    openImport,
    doImportUrl,
    doImportFile,
    removePack,
  };
}
