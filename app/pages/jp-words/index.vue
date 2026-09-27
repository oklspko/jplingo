<template>
  <div class="jp-page-wrap">
    <JpSidebar />
    <main class="jp-page-main">
      <div class="words-container">
        <header class="me-header">
          <div class="avatar">📖</div>
          <h1>词库</h1>
          <p class="subtitle">高考日语 · N5–N1 词汇总收纳，支持按等级、词性浏览与搜索</p>
        </header>

        <!-- ===== 搜索 ===== -->
        <section class="me-section">
          <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input
              v-model="query"
              type="text"
              placeholder="搜索日语 / 假名 / 释义 / 词性"
              @input="onQuery"
            />
            <button v-if="query" class="clear-btn" @click="query = ''; onQuery()">✕</button>
          </div>

          <div class="level-chips">
            <span class="chip-label">等级</span>
            <button
              class="chip"
              :class="{ active: activeLevel === '' }"
              @click="activeLevel = ''; onQuery()"
            >
              全部
              <span class="chip-count">{{ words.length }}</span>
            </button>
            <button
              v-for="lv in levels"
              :key="lv.id"
              class="chip"
              :class="{ active: activeLevel === lv.id }"
              @click="activeLevel = lv.id; onQuery()"
            >
              {{ lv.label }}
              <span class="chip-count">{{ countByLevel(lv.id) }}</span>
            </button>
          </div>

          <div class="level-chips">
            <span class="chip-label">词性</span>
            <button
              class="chip"
              :class="{ active: activeCategory === '' }"
              @click="activeCategory = ''; onQuery()"
            >
              全部
              <span class="chip-count">{{ words.length }}</span>
            </button>
            <button
              v-for="cat in categories"
              :key="cat"
              class="chip"
              :class="{ active: activeCategory === cat }"
              @click="activeCategory = cat; onQuery()"
            >
              {{ cat }}
              <span class="chip-count">{{ countByCategory(cat) }}</span>
            </button>
          </div>
        </section>

        <!-- ===== 词条列表 ===== -->
        <section class="me-section">
          <div class="list-head">
            <span class="list-title">共 {{ filtered.length }} 词</span>
            <span v-if="filtered.length > visibleCount" class="list-hint">已显示 {{ visibleCount }} 条</span>
          </div>

          <div v-if="loading" class="empty">加载中…</div>
          <div v-else-if="filtered.length === 0" class="empty">
            <div class="empty-icon">🔎</div>
            <p>没有匹配的词条</p>
          </div>
          <div v-else class="word-list">
            <div
              v-for="w in visibleWords"
              :key="`${w.level}-${w.kanji}-${w.kana}`"
              class="word-row"
            >
              <span class="word-jp">{{ w.kanji }}</span>
              <span class="word-kana">{{ w.kana }}</span>
              <span class="word-category">{{ w.category }}</span>
              <span class="word-zh">{{ w.meaning }}</span>
              <span class="word-level">{{ levelLabel(w.level) }}</span>
            </div>
          </div>

          <div v-if="visibleCount < filtered.length" class="load-more">
            <button class="more-btn" @click="visibleCount += PAGE_SIZE">
              加载更多（还剩 {{ filtered.length - visibleCount }} 词）
            </button>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import JpSidebar from "~/components/jp/JpSidebar.vue";

interface DictLevel {
  id: string;
  label: string;
  title: string;
}

interface DictWord {
  level: string;
  kanji: string;
  kana: string;
  meaning: string;
  pos: string;
  category: string;
}

const PAGE_SIZE = 200;

const loading = ref(true);
const levels = ref<DictLevel[]>([]);
const categories = ref<string[]>([]);
const words = ref<DictWord[]>([]);
const query = ref("");
const activeLevel = ref("");
const activeCategory = ref("");
const visibleCount = ref(PAGE_SIZE);

function onQuery() {
  visibleCount.value = PAGE_SIZE;
}

const levelIndex = computed(() => {
  const map: Record<string, string> = {};
  for (const lv of levels.value) map[lv.id] = lv.label;
  return map;
});

function levelLabel(id: string): string {
  return levelIndex.value[id] || id;
}

function countByLevel(id: string): number {
  return words.value.filter((w) => w.level === id).length;
}

function countByCategory(cat: string): number {
  return words.value.filter((w) => w.category === cat).length;
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  let list = words.value;
  if (activeLevel.value) {
    list = list.filter((w) => w.level === activeLevel.value);
  }
  if (activeCategory.value) {
    list = list.filter((w) => w.category === activeCategory.value);
  }
  if (q) {
    list = list.filter(
      (w) =>
        w.kanji.toLowerCase().includes(q) ||
        w.kana.toLowerCase().includes(q) ||
        w.meaning.toLowerCase().includes(q) ||
        w.pos.toLowerCase().includes(q),
    );
  }
  return list;
});

const visibleWords = computed(() => filtered.value.slice(0, visibleCount.value));

async function load() {
  loading.value = true;
  try {
    const res = await fetch("/dict/words.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    levels.value = (data.levels || []) as DictLevel[];
    categories.value = (data.categories || []) as string[];
    words.value = (data.words || []) as DictWord[];
  } catch (err) {
    console.error("加载词库失败：", err);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.jp-page-wrap {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fcff 0%, #f5fbff 40%, #fbfeff 100%);
}
.jp-page-main {
  margin-left: 220px;
  min-height: 100vh;
}
@media (max-width: 768px) {
  .jp-page-main {
    margin-left: 0;
  }
}

.words-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 60px 40px 80px;
  font-family: -apple-system, "Segoe UI", "Noto Sans JP", sans-serif;
}

.me-header {
  text-align: center;
  padding: 32px 0 48px;
}

.avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  margin: 0 auto 20px;
  box-shadow: 0 8px 24px rgba(186, 230, 253, 0.5);
}

.me-header h1 {
  font-size: 32px;
  margin: 0;
  color: #075985;
  font-weight: 600;
  letter-spacing: 2px;
}

.subtitle {
  color: #7dd3fc;
  font-size: 14px;
  margin: 10px 0 0;
}

.me-section {
  margin-bottom: 32px;
}

/* 搜索框 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 14px;
  padding: 0 16px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.15);
  transition: all 0.2s;
}

.search-bar:focus-within {
  border-color: #7dd3fc;
  box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.2);
}

.search-icon {
  font-size: 16px;
  color: #7dd3fc;
}

.search-bar input {
  flex: 1;
  padding: 14px 0;
  border: none;
  outline: none;
  font-size: 15px;
  color: #075985;
  font-family: inherit;
  background: transparent;
}

.search-bar input::placeholder {
  color: #bae6fd;
}

.clear-btn {
  border: none;
  background: #f0f9ff;
  color: #5b7a8c;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}

/* 筛选 chips */
.level-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.chip-label {
  font-size: 13px;
  color: #7dd3fc;
  font-weight: 600;
  margin-right: 4px;
}

.chip {
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid #e0f2fe;
  background: #ffffff;
  color: #5b7a8c;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.chip:hover {
  background: #f5fbff;
  color: #0284c7;
}

.chip.active {
  background: linear-gradient(135deg, #e8f6ff 0%, #d4efff 100%);
  color: #075985;
  font-weight: 600;
  border-color: #bae6fd;
  box-shadow: 0 2px 12px rgba(125, 211, 252, 0.25);
}

.chip-count {
  margin-left: 6px;
  font-size: 12px;
  color: #7dd3fc;
}

.chip.active .chip-count {
  color: #0284c7;
}

/* 列表 */
.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.list-title {
  font-size: 14px;
  color: #5b7a8c;
  font-weight: 600;
}

.list-hint {
  font-size: 12px;
  color: #7dd3fc;
}

.empty {
  text-align: center;
  padding: 40px 20px;
  background: #ffffff;
  border: 1px dashed #e0f2fe;
  border-radius: 16px;
  color: #7dd3fc;
  font-size: 14px;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 10px;
}

.word-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.word-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 12px 16px;
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(186, 230, 253, 0.12);
  transition: all 0.15s;
}

.word-row:hover {
  border-color: #bae6fd;
  box-shadow: 0 4px 16px rgba(125, 211, 252, 0.2);
}

.word-jp {
  font-size: 16px;
  font-weight: 600;
  color: #075985;
  font-family: "Noto Sans JP", sans-serif;
  flex-shrink: 0;
  min-width: 0;
}

.word-kana {
  font-size: 12px;
  color: #38bdf8;
  flex-shrink: 0;
}

.word-category {
  font-size: 11px;
  color: #059669;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 2px 8px;
  border-radius: 8px;
  flex-shrink: 0;
}

.word-zh {
  font-size: 13px;
  color: #5b7a8c;
  margin-left: auto;
  text-align: right;
  line-height: 1.5;
}

.word-level {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #0284c7;
  background: #e0f2fe;
  padding: 2px 8px;
  border-radius: 8px;
}

/* 加载更多 */
.load-more {
  text-align: center;
  margin-top: 16px;
}

.more-btn {
  padding: 10px 24px;
  border: 1px solid #bae6fd;
  border-radius: 12px;
  background: #ffffff;
  color: #0284c7;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.more-btn:hover {
  background: #f0f9ff;
  box-shadow: 0 4px 16px rgba(125, 211, 252, 0.25);
}

/* 响应式 */
@media (max-width: 768px) {
  .words-container {
    padding: 40px 20px 60px;
  }

  .word-jp {
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .word-row {
    flex-wrap: wrap;
    gap: 6px 10px;
  }

  .word-zh {
    margin-left: 0;
    text-align: left;
    width: 100%;
  }
}
</style>
