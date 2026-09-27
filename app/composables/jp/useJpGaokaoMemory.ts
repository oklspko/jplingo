// 高考「无分类测试」的自动识别记忆。
// 记录每个词「连续答对次数」：连续答对 5 次即视为已掌握，之后不再出现在测试里；
// 一旦答错则连续次数清零，需要重新连对 5 次。
import { ref } from "vue";

const STORAGE_KEY = "jp-gaokao-mixed-memory";
export const GAOKAO_MASTER_THRESHOLD = 5;

type MemoryMap = Record<string, number>;

const memory = ref<MemoryMap>({});
let loaded = false;

function loadMemory(): MemoryMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MemoryMap) : {};
  } catch {
    return {};
  }
}

function saveMemory(map: MemoryMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function useJpGaokaoMemory() {
  function ensureLoaded() {
    if (loaded) return;
    loaded = true;
    memory.value = loadMemory();
  }

  function count(japanese: string): number {
    ensureLoaded();
    return memory.value[japanese] ?? 0;
  }

  function isMastered(japanese: string): boolean {
    return count(japanese) >= GAOKAO_MASTER_THRESHOLD;
  }

  function masteredCount(): number {
    ensureLoaded();
    let n = 0;
    for (const k in memory.value) {
      if ((memory.value[k] ?? 0) >= GAOKAO_MASTER_THRESHOLD) n++;
    }
    return n;
  }

  // 答对：连续次数 +1，返回最新次数（达到阈值即视为已掌握）
  function recordCorrect(japanese: string): number {
    ensureLoaded();
    const next = (memory.value[japanese] ?? 0) + 1;
    memory.value[japanese] = next;
    saveMemory(memory.value);
    return next;
  }

  // 答错：连续次数清零
  function recordWrong(japanese: string): number {
    ensureLoaded();
    memory.value[japanese] = 0;
    saveMemory(memory.value);
    return 0;
  }

  function resetAll() {
    ensureLoaded();
    memory.value = {};
    saveMemory(memory.value);
  }

  return { count, isMastered, masteredCount, recordCorrect, recordWrong, resetAll };
}
