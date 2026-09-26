<template>
  <div class="jp-page-wrap">
    <JpSidebar />
    <main class="jp-page-main">
      <div class="study-container">
        <header class="study-header">
          <a href="/jp-home" class="study-back">← 课程列表</a>
          <div class="study-head-row">
            <div class="study-head-text">
              <span v-if="packTitle" class="study-pack">{{ packTitle }}</span>
              <h1 class="study-title">{{ courseTitle || "课程" }}</h1>
            </div>
            <a class="study-enter" :href="gameUrl">进入练习 →</a>
          </div>
          <p class="study-meta">
            学习 {{ uniqueStatements.length }} 项 · 练习 {{ statements.length }} 题
          </p>
        </header>

        <div v-if="loading" class="study-loading">加载中…</div>

        <template v-else>
          <div v-if="statements.length === 0" class="study-empty">暂无学习内容</div>

          <template v-else>
            <nav class="study-nav">
              <a v-if="hasPrev" class="study-nav-link" :href="prevUrl">← 上一课</a>
              <span v-else class="study-nav-link disabled">← 上一课</span>
              <a v-if="hasNext" class="study-nav-link" :href="nextUrl">下一课 →</a>
              <span v-else class="study-nav-link disabled">下一课 →</span>
            </nav>

            <div class="study-list">
              <div v-for="(stmt, i) in uniqueStatements" :key="stmt.id" class="study-card">
                <span class="study-index">{{ i + 1 }}</span>
                <div class="study-body">
                  <div class="study-jp">
                    <template v-if="stmt.japanese !== stmt.kana">
                      <ruby v-for="(t, ti) in stmt.tokens" :key="ti">
                        {{ t.text }}<rt>{{ t.kana }}</rt>
                      </ruby>
                    </template>
                    <template v-else>{{ stmt.japanese }}</template>
                  </div>
                  <div class="study-romaji">{{ stmt.romaji }}</div>
                  <div v-if="!isSingleKana" class="study-zh">{{ stmt.chinese }}</div>
                </div>
              </div>
            </div>

            <div class="study-footer">
              <a class="study-enter" :href="gameUrl">进入练习 →</a>
            </div>
          </template>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import JpSidebar from "~/components/jp/JpSidebar.vue";
import { fetchCoursePacks, fetchCourse } from "~/composables/jp/useJpCourses";
import { isSingleKanaCourseId } from "~/composables/jp/useJpRomaji";
import type { JpStatement } from "~/types/jp";

const route = useRoute();

const coursePackId = computed(() => route.params.coursePackId as string);
const courseId = computed(() => route.params.id as string);
const isSingleKana = computed(() => isSingleKanaCourseId(courseId.value));

const statements = ref<JpStatement[]>([]);
const courseTitle = ref("");
const packTitle = ref("");
const loading = ref(true);

const allCourses = ref<string[]>([]);
const courseIndex = ref(-1);
const hasPrev = computed(() => courseIndex.value > 0);
const hasNext = computed(
  () => courseIndex.value >= 0 && courseIndex.value < allCourses.value.length - 1,
);

const prevUrl = computed(
  () => `/jp-study/${coursePackId.value}/${allCourses.value[courseIndex.value - 1]}`,
);
const nextUrl = computed(
  () => `/jp-study/${coursePackId.value}/${allCourses.value[courseIndex.value + 1]}`,
);
const gameUrl = computed(() => `/jp-game/${coursePackId.value}/${courseId.value}`);

// 高考单词课同一词循环 3 遍，学习页按词去重展示
const uniqueStatements = computed<JpStatement[]>(() => {
  const seen = new Set<string>();
  const out: JpStatement[] = [];
  for (const s of statements.value) {
    if (!seen.has(s.japanese)) {
      seen.add(s.japanese);
      out.push(s);
    }
  }
  return out;
});

onMounted(async () => {
  const packId = coursePackId.value;
  const id = courseId.value;
  try {
    const packs = await fetchCoursePacks();
    const pack = packs.find((p) => p.id === packId);
    if (pack) {
      packTitle.value = pack.title;
      allCourses.value = pack.courses || [];
      courseIndex.value = allCourses.value.indexOf(id);
    }
  } catch {}
  try {
    const data = await fetchCourse(packId, id);
    statements.value = data.statements || [];
    courseTitle.value = data.title || id;
  } catch (err) {
    console.error("加载课程失败：", err);
  } finally {
    loading.value = false;
  }
});
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

.study-container {
  max-width: 820px;
  margin: 0 auto;
  padding: 48px 28px 80px;
}

/* ===== 头部 ===== */
.study-header {
  margin-bottom: 28px;
}

.study-back {
  display: inline-block;
  font-size: 13px;
  color: #7dd3fc;
  text-decoration: none;
  margin-bottom: 14px;
  transition: color 0.2s;
}

.study-back:hover {
  color: #0284c7;
}

.study-head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.study-pack {
  display: inline-block;
  padding: 3px 12px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985;
  font-size: 12px;
  font-weight: 600;
  border-radius: 10px;
  margin-bottom: 8px;
}

.study-title {
  font-size: 30px;
  margin: 0;
  color: #075985;
  font-weight: 700;
  letter-spacing: 1px;
}

.study-meta {
  margin: 10px 0 0;
  font-size: 13px;
  color: #7dd3fc;
}

/* ===== 进入练习按钮 ===== */
.study-enter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 26px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 14px;
  text-decoration: none;
  color: #075985;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  border: 1px solid transparent;
  box-shadow: 0 8px 28px rgba(186, 230, 253, 0.4);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.study-enter:hover {
  background: linear-gradient(135deg, #bae6fd 0%, #7dd3fc 100%);
  transform: translateY(-2px);
  box-shadow: 0 10px 32px rgba(186, 230, 253, 0.55);
}

.study-loading,
.study-empty {
  text-align: center;
  color: #7dd3fc;
  padding: 80px 0;
  font-size: 15px;
}

/* ===== 上下课导航 ===== */
.study-nav {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.study-nav-link {
  font-size: 14px;
  color: #0369a1;
  text-decoration: none;
  padding: 8px 16px;
  border: 1px solid #e0f2fe;
  border-radius: 10px;
  background: #ffffff;
  transition: all 0.2s;
}

.study-nav-link:hover {
  border-color: #bae6fd;
  color: #0284c7;
  background: #f5fbff;
}

.study-nav-link.disabled {
  color: #bae6fd;
  background: #f8fcff;
  cursor: not-allowed;
}

/* ===== 学习卡片列表 ===== */
.study-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.study-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 18px 20px;
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.12);
  transition: all 0.2s;
}

.study-card:hover {
  border-color: #bae6fd;
  box-shadow: 0 6px 20px rgba(125, 211, 252, 0.22);
  transform: translateY(-1px);
}

.study-index {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985;
  font-size: 13px;
  font-weight: 700;
  border-radius: 9px;
  margin-top: 2px;
}

.study-body {
  flex: 1;
  min-width: 0;
}

.study-jp {
  font-size: 26px;
  color: #075985;
  font-weight: 500;
  line-height: 1.4;
  word-break: break-word;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Hiragino Sans GB", "Noto Sans JP", sans-serif;
}

.study-jp ruby {
  margin-right: 6px;
}

.study-jp ruby rt {
  font-size: 0.42em;
  color: #38bdf8;
  font-weight: 500;
}

.study-romaji {
  margin-top: 6px;
  font-size: 14px;
  color: #7dd3fc;
  font-family: ui-monospace, "SF Mono", "Consolas", "Courier New", monospace;
  letter-spacing: 1px;
}

.study-zh {
  margin-top: 8px;
  font-size: 15px;
  color: #5b7a8c;
  line-height: 1.6;
}

/* ===== 底部 ===== */
.study-footer {
  margin-top: 32px;
  text-align: center;
}

@media (max-width: 768px) {
  .study-container {
    padding: 28px 16px 64px;
  }

  .study-title {
    font-size: 24px;
  }

  .study-enter {
    padding: 11px 20px;
    font-size: 15px;
  }

  .study-card {
    padding: 14px 16px;
    gap: 12px;
  }

  .study-jp {
    font-size: 22px;
  }

  .study-zh {
    font-size: 14px;
  }
}
</style>
