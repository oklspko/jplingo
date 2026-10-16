import { computed, ref } from "vue";
import type { Ref } from "vue";
import { calcStreak, type StudyRecord } from "~/composables/jp/useJpStorage";

/**
 * 「我的」页的学习统计与「重置学习记录」（从 app/pages/jp-me/index.vue 抽出）。
 *
 * 单一数据源：学习记录 ref 由页面调用一次 `useJpStorage()` 得到，本 composable 只**接收**它，
 * 不自己再调一次 `useJpStorage()`（那会造出第二个 record ref，页面显示与云端同步就分家了）。
 *
 * 无生命周期副作用：返回的都是派生值/普通方法，页面直接拿去给模板用。
 */
export function useJpMeStats(record: Ref<StudyRecord>, resetRecord: () => void) {
  /** 连续打卡天数（口径见 useJpStorage.calcStreak） */
  const streak = computed(() => calcStreak(record.value.days));

  /** 今日学习分钟数（向下取整） */
  const todayMinutes = computed(() => Math.floor(record.value.todaySeconds / 60));

  /** 总学习时长文案：不足 1 小时显示「N 分」，否则「Nh Mm」 */
  const totalDuration = computed(() => {
    const s = record.value.totalSeconds;
    if (s < 3600) return `${Math.floor(s / 60)} 分`;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h${m}m`;
  });

  /** 重置确认弹窗的显隐（模板里用 `showResetModal = false` 直接赋值，所以必须是 ref） */
  const showResetModal = ref(false);

  function confirmReset() {
    showResetModal.value = true;
  }

  function doReset() {
    resetRecord();
    showResetModal.value = false;
  }

  return { streak, todayMinutes, totalDuration, showResetModal, confirmReset, doReset };
}
