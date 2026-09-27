// 「无分类测试」的自动识别记忆（高考 + N5–N1 每个词汇包各一份）。
// 记录每个词「连续答对次数」：连续答对 5 次即视为已掌握，之后不再出现在测试里；
// 一旦答错则连续次数清零，需要重新连对 5 次。
import { ref, type Ref } from "vue";

const STORAGE_PREFIX = "jp-vocab-mixed-memory:";
// 高考词库沿用旧 key，兼容既有用户的已掌握进度
const LEGACY_GAOKAO_KEY = "jp-gaokao-mixed-memory";
export const GAOKAO_MASTER_THRESHOLD = 5;

type MemoryMap = Record<string, number>;

interface Store {
  memory: Ref<MemoryMap>;
  loaded: boolean;
}

const stores = new Map<string, Store>();

function keyOf(packId: string): string {
  return packId === "jp-gaokao" ? LEGACY_GAOKAO_KEY : `${STORAGE_PREFIX}${packId}`;
}

function getStore(packId: string): Store {
  const key = keyOf(packId);
  let store = stores.get(key);
  if (!store) {
    store = { memory: ref<MemoryMap>({}), loaded: false };
    stores.set(key, store);
  }
  return store;
}

function loadMemory(key: string): MemoryMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as MemoryMap) : {};
  } catch {
    return {};
  }
}

function saveMemory(key: string, map: MemoryMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(map));
}

export function useJpVocabMemory(packId: string) {
  const key = keyOf(packId);
  const store = getStore(packId);
  const memory = store.memory;

  function ensureLoaded() {
    if (store.loaded) return;
    store.loaded = true;
    memory.value = loadMemory(key);
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
    saveMemory(key, memory.value);
    return next;
  }

  // 答错：连续次数清零
  function recordWrong(japanese: string): number {
    ensureLoaded();
    memory.value[japanese] = 0;
    saveMemory(key, memory.value);
    return 0;
  }

  function resetAll() {
    ensureLoaded();
    memory.value = {};
    saveMemory(key, memory.value);
  }

  return { count, isMastered, masteredCount, recordCorrect, recordWrong, resetAll };
}

// 兼容旧调用（高考词库）
export function useJpGaokaoMemory() {
  return useJpVocabMemory("jp-gaokao");
}
