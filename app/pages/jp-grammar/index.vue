<template>
  <div class="jp-page-wrap">
    <JpSidebar />
    <main class="jp-page-main">
      <div class="grammar-container">
        <header class="page-header">
          <span class="page-badge">📖 内容学习</span>
          <h1 class="page-title">语法条词典</h1>
          <p class="page-sub">按五十音（あいうえお）· 能力考等级（N5–N1）检索语法条 · 点击展开接续与例句</p>
        </header>

        <!-- 筛选区 -->
        <section class="filter-panel">
          <div class="filter-row">
            <span class="filter-label">五十音</span>
            <div class="filter-chips">
              <button
                class="filter-chip"
                :class="{ active: selectedVowel === '全部' }"
                @click="selectedVowel = '全部'"
              >全部</button>
              <button
                v-for="v in VOWELS"
                :key="v.key"
                class="filter-chip"
                :class="{ active: selectedVowel === v.key }"
                @click="selectedVowel = v.key"
              >{{ v.label }}</button>
            </div>
          </div>

          <div class="filter-row">
            <span class="filter-label">等级</span>
            <div class="filter-chips">
              <button
                class="filter-chip"
                :class="{ active: selectedLevel === '全部' }"
                @click="selectedLevel = '全部'"
              >全部</button>
              <button
                v-for="lv in LEVELS"
                :key="lv"
                class="filter-chip filter-chip--level"
                :class="{ active: selectedLevel === lv }"
                @click="selectedLevel = lv"
              >{{ lv }}</button>
            </div>
          </div>

          <div class="filter-row filter-row--search">
            <span class="filter-label">检索</span>
            <input
              v-model="keyword"
              class="filter-search"
              type="search"
              placeholder="输入语法条、接续或释义关键词…"
            />
          </div>
        </section>

        <!-- 结果统计 -->
        <div class="result-bar">
          <span>共 <b>{{ filtered.length }}</b> 条</span>
          <button
            v-if="selectedVowel !== '全部' || selectedLevel !== '全部' || keyword"
            class="result-clear"
            @click="resetFilters"
          >清除筛选</button>
        </div>

        <!-- 语法条列表（按元音分组） -->
        <div v-if="grouped.length" class="groups">
          <section v-for="g in grouped" :key="g.key" class="vowel-group">
            <h2 class="vowel-group-title">
              <span class="vowel-badge">{{ g.label }}</span>
              <span class="vowel-count">{{ g.points.length }} 条</span>
            </h2>

            <div class="point-list">
              <article
                v-for="p in g.points"
                :key="p.id"
                class="point-card"
                :class="{ expanded: expandedId === p.id }"
                @click="toggleCard(p.id)"
              >
                <div class="point-head">
                  <span class="point-pattern">{{ p.pattern }}</span>
                  <span class="point-level" :class="`lv-${p.level.toLowerCase()}`">{{ p.level }}</span>
                  <span class="point-arrow" :class="{ rotated: expandedId === p.id }">▾</span>
                </div>
                <p class="point-meaning">{{ p.meaning }}</p>

                <!-- 第一次展开：接续 + 例句 + 注意 -->
                <div v-show="expandedId === p.id" class="point-detail">
                  <div class="point-setsuzoku">
                    <span class="point-setsuzoku-label">接续</span>
                    <span class="point-setsuzoku-text">{{ p.setsuzoku }}</span>
                  </div>

                  <ul class="point-examples">
                    <li v-for="(ex, i) in p.examples" :key="i" class="point-example-item">
                      <span class="point-example">{{ ex.jp }}</span>
                      <span class="point-translation">{{ ex.zh }}</span>
                    </li>
                  </ul>

                  <p v-if="p.note" class="point-note">{{ p.note }}</p>

                  <!-- 第二次展开：语法解析 -->
                  <button
                    v-if="p.analysis"
                    class="analysis-toggle"
                    :class="{ open: analysisOpen === p.id }"
                    @click.stop="toggleAnalysis(p.id)"
                  >
                    <span>语法解析</span>
                    <span class="analysis-toggle-arrow">{{ analysisOpen === p.id ? '▾' : '▸' }}</span>
                  </button>
                  <p v-show="analysisOpen === p.id" class="point-analysis">{{ p.analysis }}</p>
                </div>
              </article>
            </div>
          </section>
        </div>

        <div v-else class="empty">
          <span class="empty-icon">🔍</span>
          <p>没有匹配的语法条</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import JpSidebar from "~/components/jp/JpSidebar.vue";
import { grammarPoints, type GrammarPoint } from "~/data/jp-grammar-points";

const VOWELS = [
  { key: "あ", label: "あ段" },
  { key: "い", label: "い段" },
  { key: "う", label: "う段" },
  { key: "え", label: "え段" },
  { key: "お", label: "お段" },
] as const;
type VowelKey = (typeof VOWELS)[number]["key"];

const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

const selectedVowel = ref<VowelKey | "全部">("全部");
const selectedLevel = ref<string>("全部");
const keyword = ref("");
const expandedId = ref<string | null>(null);
const analysisOpen = ref<string | null>(null);

function toggleCard(id: string) {
  if (expandedId.value === id) {
    expandedId.value = null;
    analysisOpen.value = null;
  } else {
    expandedId.value = id;
    analysisOpen.value = null;
  }
}

function toggleAnalysis(id: string) {
  analysisOpen.value = analysisOpen.value === id ? null : id;
}

function toHiragana(ch: string): string {
  const code = ch.charCodeAt(0);
  // 片假名 → 平假名（ァ～ヶ 区间整体平移）
  if (code >= 0x30a1 && code <= 0x30f6) return String.fromCharCode(code - 0x60);
  return ch;
}

/** 取语法条首个假名，归入五段（あいうえお）。 */
function vowelOf(text: string): VowelKey {
  const first = text.replace(/^[～~\s・]+/, "").charAt(0);
  const kana = toHiragana(first);
  if ("あかがさざただなはばぱまやらわ".includes(kana)) return "あ";
  if ("いきぎしじちにひびぴみり".includes(kana)) return "い";
  if ("うくぐすずつづぬふぶぷむゆる".includes(kana)) return "う";
  if ("えけげせぜてでねへべぺめれ".includes(kana)) return "え";
  if ("おこごそぞとどのほぼぽもよろを".includes(kana)) return "お";
  return "あ"; // ん 及未知首字归入あ段
}

const filtered = computed(() => {
  const kw = keyword.value.trim();
  return grammarPoints.filter((p) => {
    if (selectedVowel.value !== "全部" && vowelOf(p.pattern) !== selectedVowel.value) return false;
    if (selectedLevel.value !== "全部" && p.level !== selectedLevel.value) return false;
    if (kw && !`${p.pattern} ${p.meaning} ${p.setsuzoku} ${p.examples.map(e => e.jp).join(" ")}`.includes(kw)) return false;
    return true;
  });
});

const grouped = computed(() => {
  const buckets: Record<VowelKey, GrammarPoint[]> = { あ: [], い: [], う: [], え: [], お: [] };
  for (const p of filtered.value) buckets[vowelOf(p.pattern)].push(p);
  return VOWELS.map((v) => ({ ...v, points: buckets[v.key] })).filter((g) => g.points.length > 0);
});

function resetFilters() {
  selectedVowel.value = "全部";
  selectedLevel.value = "全部";
  keyword.value = "";
}
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

.grammar-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 40px 80px;
  font-family: inherit;
}

/* ===== 页头 ===== */
.page-header {
  text-align: center;
  padding: 0 0 28px;
}

.page-badge {
  display: inline-block;
  padding: 6px 16px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985;
  font-size: 13px;
  font-weight: 600;
  border-radius: 999px;
  margin-bottom: 16px;
}

.page-title {
  font-size: clamp(26px, 4vw, 40px);
  margin: 0 0 12px;
  color: #075985;
  font-weight: 700;
  letter-spacing: 1px;
}

.page-sub {
  color: #7dd3fc;
  font-size: 15px;
  margin: 0;
  line-height: 1.7;
}

/* ===== 筛选区 ===== */
.filter-panel {
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.12);
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 10px 0;
}

.filter-row + .filter-row {
  border-top: 1px dashed #e8f6ff;
}

.filter-label {
  flex-shrink: 0;
  width: 52px;
  padding-top: 7px;
  font-size: 13px;
  font-weight: 700;
  color: #7dd3fc;
}

.filter-chips {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  padding: 6px 14px;
  border: 1px solid #e0f2fe;
  border-radius: 999px;
  background: #f5fbff;
  color: #0369a1;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  white-space: nowrap;
}

.filter-chip:hover {
  border-color: #bae6fd;
  background: #e0f2fe;
}

.filter-chip.active {
  background: linear-gradient(135deg, #7dd3fc 0%, #0284c7 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 3px 10px rgba(2, 132, 199, 0.3);
}

.filter-chip--level {
  font-family: ui-monospace, "SF Mono", "Consolas", monospace;
}

.filter-search {
  flex: 1;
  padding: 8px 14px;
  border: 1px solid #e0f2fe;
  border-radius: 10px;
  font-size: 14px;
  color: #075985;
  background: #fbfeff;
  outline: none;
  transition: all 0.15s;
  font-family: inherit;
}

.filter-search:focus {
  border-color: #7dd3fc;
  box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.2);
}

.filter-search::placeholder {
  color: #bae6fd;
}

/* ===== 结果统计 ===== */
.result-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 4px 14px;
  font-size: 13px;
  color: #5b7a8c;
}

.result-bar b {
  color: #0284c7;
  font-size: 15px;
}

.result-clear {
  padding: 5px 12px;
  border: 1px solid #e0f2fe;
  border-radius: 8px;
  background: #f5fbff;
  color: #0369a1;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}

.result-clear:hover {
  background: #e0f2fe;
  border-color: #bae6fd;
  color: #0284c7;
}

/* ===== 分组 ===== */
.groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.vowel-group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 12px;
}

.vowel-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  padding: 4px 12px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985;
  font-size: 15px;
  font-weight: 700;
  border-radius: 10px;
}

.vowel-count {
  font-size: 12px;
  color: #7dd3fc;
  font-weight: 600;
}

/* ===== 语法条卡片 ===== */
.point-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.point-card {
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 14px;
  padding: 16px 20px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.12);
  cursor: pointer;
  transition: all 0.2s;
}

.point-card:hover {
  border-color: #bae6fd;
  box-shadow: 0 6px 18px rgba(186, 230, 253, 0.22);
}

.point-card.expanded {
  border-color: #7dd3fc;
  box-shadow: 0 8px 24px rgba(125, 211, 252, 0.25);
}

.point-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.point-pattern {
  flex: 1;
  font-size: 17px;
  font-weight: 700;
  color: #075985;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.point-level {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  font-family: ui-monospace, "SF Mono", "Consolas", monospace;
}

.lv-n5 { background: #e8f6ff; color: #0369a1; }
.lv-n4 { background: #ecfdf5; color: #059669; }
.lv-n3 { background: #fefce8; color: #ca8a04; }
.lv-n2 { background: #fff7ed; color: #ea580c; }
.lv-n1 { background: #fef2f2; color: #dc2626; }

.point-arrow {
  flex-shrink: 0;
  color: #7dd3fc;
  font-size: 14px;
  transition: transform 0.2s;
}

.point-arrow.rotated {
  transform: rotate(180deg);
}

.point-meaning {
  margin: 8px 0 0;
  font-size: 14px;
  color: #0369a1;
  line-height: 1.6;
}

/* ===== 展开详情 ===== */
.point-detail {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e8f6ff;
}

.point-setsuzoku {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.point-setsuzoku-label {
  flex-shrink: 0;
  padding: 1px 8px;
  background: #ecfdf5;
  color: #059669;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.point-setsuzoku-text {
  font-size: 13px;
  color: #0369a1;
  line-height: 1.5;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.point-examples {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.point-example-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 12px;
  border-left: 3px solid #e0f2fe;
}

.point-example {
  font-size: 15px;
  color: #0284c7;
  line-height: 1.7;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.point-translation {
  font-size: 13px;
  color: #7dd3fc;
  line-height: 1.6;
}

.point-note {
  margin: 12px 0 0;
  font-size: 12px;
  color: #5b7a8c;
  line-height: 1.7;
}

/* ===== 语法解析按钮 ===== */
.analysis-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  margin-top: 12px;
  padding: 8px 12px;
  border: 1px solid #fde68a;
  border-radius: 10px;
  background: #fefce8;
  color: #92400e;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.analysis-toggle:hover {
  background: #fef9c3;
  border-color: #fcd34d;
}

.analysis-toggle.open {
  background: #fef9c3;
  border-color: #fcd34d;
}

.analysis-toggle-arrow {
  color: #ca8a04;
  font-size: 13px;
}

.point-analysis {
  margin: 10px 0 0;
  padding: 12px 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  font-size: 13px;
  color: #92400e;
  line-height: 1.7;
}

/* ===== 空状态 ===== */
.empty {
  text-align: center;
  padding: 60px 20px;
  color: #7dd3fc;
}

.empty-icon {
  font-size: 40px;
}

.empty p {
  margin: 12px 0 0;
  font-size: 14px;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .grammar-container {
    padding: 32px 20px 60px;
  }

  .page-title {
    font-size: 26px;
  }

  .page-sub {
    font-size: 13px;
  }

  .filter-panel {
    padding: 16px 18px;
  }

  .filter-row {
    flex-direction: column;
    gap: 8px;
  }

  .filter-label {
    width: auto;
    padding-top: 0;
  }

  .point-pattern {
    font-size: 16px;
  }
}
</style>
