import { computed, ref } from "vue";
import type { Ref } from "vue";
import { isVocabPack, mixedCourseIdOf } from "~/composables/jp/useJpCourses";
import { useJpVocabMemory } from "~/composables/jp/useJpGaokaoMemory";
import type { JpCoursePack } from "~/types/jp";

/**
 * 首页课程包分类与派生（从 app/pages/jp-home/index.vue 抽出，逻辑逐字搬移）。
 *
 * 单一数据源：`coursePacks` / `importedPackIds` 由页面调用一次 `useJpHomeCourses()` 得到后注入，
 * 本 composable 只做 filter/派生，不自己再 `fetchCoursePacks()`。
 */
export function useJpHomePacks(coursePacks: Ref<JpCoursePack[]>, importedPackIds: Ref<Set<string>>) {
  // 单词课程收纳：把 6 个词汇包（高考日语 + N5–N1）归为一组，点开使用
  const collectionExpanded = ref(false);
  const vocabPacks = computed(() => coursePacks.value.filter((p) => isVocabPack(p.id)));
  const nonVocabPacks = computed(() => coursePacks.value.filter((p) => !isVocabPack(p.id)));
  // 已导入的课程包（文件夹），供「移动到文件夹」下拉选择
  const importedPacks = computed(() => coursePacks.value.filter((p) => importedPackIds.value.has(p.id)));

  // 各词汇包「无分类测试」进度（已掌握词数）
  function mixedGameUrl(packId: string) {
    return `/jp-game/${packId}/${mixedCourseIdOf(packId)}`;
  }
  function mixedMasteredCount(packId: string) {
    return useJpVocabMemory(packId).masteredCount();
  }

  function isImported(packId: string): boolean {
    return importedPackIds.value.has(packId);
  }

  return {
    collectionExpanded,
    vocabPacks,
    nonVocabPacks,
    importedPacks,
    mixedGameUrl,
    mixedMasteredCount,
    isImported,
  };
}
