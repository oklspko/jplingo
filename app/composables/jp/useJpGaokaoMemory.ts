// 「无分类测试」的自动识别记忆（高考 + N5–N1 每个词汇包各一份）。
//
// 两条判定**同时保留**，任一满足即算「已掌握」，已掌握的词不再出现在无分类测试里：
//   ① 连续答对 5 次（原有规则，memory 里存的就是连续正确次数，答错清零）；
//   ② 通过一次循环测试（连续答对 3 次）——循环测试是辅助功能，通过即记入 passed 集合。
// 全部单词都掌握后再次进入无分类测试，会先询问是否重置；重置后从头开始。
import { ref, type Ref } from "vue";

const STORAGE_PREFIX = "jp-vocab-mixed-memory:";
const PASSED_PREFIX = "jp-vocab-mixed-passed:";
// 高考词库沿用旧 key，兼容既有用户的已掌握进度
const LEGACY_GAOKAO_KEY = "jp-gaokao-mixed-memory";
const LEGACY_GAOKAO_PASSED_KEY = "jp-gaokao-mixed-passed";
/** 连续答对多少次算已掌握（原有规则，保留） */
export const GAOKAO_MASTER_THRESHOLD = 5;

type MemoryMap = Record<string, number>;
type PassedMap = Record<string, boolean>;

interface Store {
  memory: Ref<MemoryMap>;
  passed: Ref<PassedMap>;
  loaded: boolean;
}

const stores = new Map<string, Store>();

function keyOf(packId: string): string {
  return packId === "jp-gaokao" ? LEGACY_GAOKAO_KEY : `${STORAGE_PREFIX}${packId}`;
}

function passedKeyOf(packId: string): string {
  return packId === "jp-gaokao" ? LEGACY_GAOKAO_PASSED_KEY : `${PASSED_PREFIX}${packId}`;
}

function getStore(packId: string): Store {
  const key = keyOf(packId);
  let store = stores.get(key);
  if (!store) {
    store = { memory: ref<MemoryMap>({}), passed: ref<PassedMap>({}), loaded: false };
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

function loadPassed(key: string): PassedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as PassedMap) : {};
  } catch {
    return {};
  }
}

function saveMemory(key: string, map: MemoryMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(map));
}

function savePassed(key: string, map: PassedMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(map));
}

export function useJpVocabMemory(packId: string) {
  const key = keyOf(packId);
  const pkey = passedKeyOf(packId);
  const store = getStore(packId);
  const memory = store.memory;
  const passed = store.passed;

  function ensureLoaded() {
    if (store.loaded) return;
    store.loaded = true;
    memory.value = loadMemory(key);
    passed.value = loadPassed(pkey);
  }

  /** 连续答对次数（答错清零） */
  function count(japanese: string): number {
    ensureLoaded();
    return memory.value[japanese] ?? 0;
  }

  /** 规则①：连续答对 5 次 */
  function isMastered(japanese: string): boolean {
    return count(japanese) >= GAOKAO_MASTER_THRESHOLD;
  }

  /** 规则②：通过过一次循环测试（连续答对 3 次） */
  function isPassed(japanese: string): boolean {
    ensureLoaded();
    return passed.value[japanese] === true;
  }

  /** 「已掌握」= 满足任一规则。无分类测试只考 not isKnown 的词。 */
  function isKnown(japanese: string): boolean {
    return isMastered(japanese) || isPassed(japanese);
  }

  function masteredCount(): number {
    ensureLoaded();
    let n = 0;
    for (const k in memory.value) {
      if ((memory.value[k] ?? 0) >= GAOKAO_MASTER_THRESHOLD) n++;
    }
    return n;
  }

  function passedCount(): number {
    ensureLoaded();
    let n = 0;
    for (const k in passed.value) {
      if (passed.value[k]) n++;
    }
    return n;
  }

  /** 已掌握总数（两条规则取并集，不重复计） */
  function knownCount(): number {
    ensureLoaded();
    const seen = new Set<string>();
    for (const k in memory.value) {
      if ((memory.value[k] ?? 0) >= GAOKAO_MASTER_THRESHOLD) seen.add(k);
    }
    for (const k in passed.value) {
      if (passed.value[k]) seen.add(k);
    }
    return seen.size;
  }

  // 答对：连续次数 +1，返回最新次数（达到阈值即视为已掌握）
  function recordCorrect(japanese: string): number {
    ensureLoaded();
    const next = (memory.value[japanese] ?? 0) + 1;
    memory.value[japanese] = next;
    saveMemory(key, memory.value);
    return next;
  }

  // 答错：连续次数清零，同时取消「循环测试通过」标记（要重新连对才算掌握）
  function recordWrong(japanese: string): number {
    ensureLoaded();
    memory.value[japanese] = 0;
    saveMemory(key, memory.value);
    if (passed.value[japanese]) {
      delete passed.value[japanese];
      savePassed(pkey, passed.value);
    }
    return 0;
  }

  // 循环测试通过（连对 3 次）：记入 passed，同时把计数补到阈值以免重复判定
  function markPassed(japanese: string): void {
    ensureLoaded();
    if (!passed.value[japanese]) {
      passed.value[japanese] = true;
      savePassed(pkey, passed.value);
    }
  }

  function clearPassed(japanese: string): void {
    ensureLoaded();
    if (passed.value[japanese]) {
      delete passed.value[japanese];
      savePassed(pkey, passed.value);
    }
  }

  /** 重置记忆（两条规则一起清空），用于「全部掌握后重新测试」 */
  function resetAll() {
    ensureLoaded();
    memory.value = {};
    passed.value = {};
    saveMemory(key, memory.value);
    savePassed(pkey, passed.value);
  }

  return {
    count,
    isMastered,
    isPassed,
    isKnown,
    masteredCount,
    passedCount,
    knownCount,
    recordCorrect,
    recordWrong,
    markPassed,
    clearPassed,
    resetAll,
  };
}

// 兼容旧调用（高考词库）
export function useJpGaokaoMemory() {
  return useJpVocabMemory("jp-gaokao");
}
