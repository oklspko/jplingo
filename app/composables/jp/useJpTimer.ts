import { computed, onUnmounted, ref } from "vue";

export function useJpTimer() {
  const elapsedSeconds = ref(0);
  let timerHandle: any = null;

  const formattedTime = computed(() => {
    const h = Math.floor(elapsedSeconds.value / 3600);
    const m = Math.floor((elapsedSeconds.value % 3600) / 60);
    const s = elapsedSeconds.value % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  });

  function start() {
    stop();
    timerHandle = setInterval(() => {
      elapsedSeconds.value++;
    }, 1000);
  }

  function stop() {
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
  }

  function reset() {
    elapsedSeconds.value = 0;
  }

  onUnmounted(() => {
    stop();
  });

  return {
    elapsedSeconds,
    formattedTime,
    start,
    stop,
    reset,
  };
}