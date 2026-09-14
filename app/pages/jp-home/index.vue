<template>
  <div class="jp-page-wrap">
    <JpSidebar />
    <main class="jp-page-main">
      <div class="home-container">
        <header class="home-header">
          <h1>jp-lingo</h1>
          <p class="subtitle">用连词成句的方式学习日语</p>
          <div class="beginner-tip">
            <span class="tip-icon">💡</span>
            <span class="tip-text">
              不会日语输入法？从 <strong>五十音</strong> 开始，边练边熟悉罗马字输入
            </span>
          </div>
        </header>

        <main class="home-main">
          <div v-if="loading" class="loading">加载中…</div>

          <template v-else>
            <section
              v-for="(pack, index) in coursePacks"
              :key="pack.id"
              class="course-pack"
              :class="{ expanded: isExpanded(pack.id) }"
            >
              <!-- 课程包标题（可点击折叠） -->
              <button
                class="pack-header"
                @click="togglePack(pack.id)"
                :aria-expanded="isExpanded(pack.id)"
              >
                <div class="pack-header-left">
                  <span class="pack-arrow" :class="{ rotated: isExpanded(pack.id) }">▶</span>
                  <h2>{{ pack.title }}</h2>
                  <span class="pack-level">{{ pack.level }}</span>
                </div>
                <div class="pack-header-right">
                  <span class="pack-count">{{ pack.courses.length }} 课</span>
                </div>
              </button>

              <!-- 课程列表（可折叠区域） -->
              <transition name="fold">
                <div v-show="isExpanded(pack.id)" class="course-list-wrapper">
                  <p class="pack-desc">{{ pack.description }}</p>
                  <div class="course-list">
                    <a
                      v-for="courseId in pack.courses"
                      :key="courseId"
                      class="course-card"
                      :href="`/jp-game/${pack.id}/${courseId}`"
                    >
                      <div class="course-title">{{ getCourseTitle(pack.id, courseId) }}</div>
                      <div class="course-meta">
                        {{ getCourseCount(pack.id, courseId) }} 题
                      </div>
                    </a>
                  </div>
                </div>
              </transition>
            </section>
          </template>
        </main>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import JpSidebar from "~/components/jp/JpSidebar.vue";
import {
  fetchCoursePacks,
  fetchCourseMeta,
  sortCoursePacks,
} from "~/composables/jp/useJpCourses";
import type { JpCoursePack } from "~/types/jp";

interface CourseIndex {
  [key: string]: { title: string; count: number };
}

const coursePacks = ref<JpCoursePack[]>([]);
const courseIndex = ref<CourseIndex>({});
const loading = ref(true);

// 展开状态：默认第一个展开
const expandedPacks = ref<Set<string>>(new Set());

function isExpanded(packId: string): boolean {
  return expandedPacks.value.has(packId);
}

function togglePack(packId: string) {
  const newSet = new Set(expandedPacks.value);
  if (newSet.has(packId)) {
    newSet.delete(packId);
  } else {
    newSet.add(packId);
  }
  expandedPacks.value = newSet;
}

onMounted(async () => {
  try {
    const packs = sortCoursePacks(await fetchCoursePacks());
    coursePacks.value = packs;

    // 默认展开第一个（排序后是五十音）
    if (coursePacks.value.length > 0) {
      expandedPacks.value = new Set([coursePacks.value[0].id]);
    }

    for (const pack of coursePacks.value) {
      for (const courseId of pack.courses) {
        courseIndex.value[`${pack.id}/${courseId}`] = await fetchCourseMeta(
          pack.id,
          courseId,
        );
      }
    }
  } catch (err) {
    console.error("加载课程失败：", err);
  } finally {
    loading.value = false;
  }
});

function getCourseTitle(packId: string, courseId: string) {
  return courseIndex.value[`${packId}/${courseId}`]?.title || courseId;
}

function getCourseCount(packId: string, courseId: string) {
  return courseIndex.value[`${packId}/${courseId}`]?.count || 0;
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

.home-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 60px 40px;
  font-family: -apple-system, "Segoe UI", "Noto Sans JP", sans-serif;
}

.home-header {
  text-align: center;
  padding: 40px 0 48px;
}

.home-header h1 {
  font-size: 42px;
  margin: 0 0 12px;
  color: #075985;
  letter-spacing: 3px;
  font-weight: 600;
}

.subtitle {
  color: #7dd3fc;
  font-size: 15px;
  margin: 0 0 24px;
}

/* 新手提示条 */
.beginner-tip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #fffef5 0%, #fef3c7 100%);
  border: 2px dashed #fbbf24;
  border-radius: 14px;
  max-width: 100%;
  animation: tipPulse 2s ease-in-out infinite;
}

@keyframes tipPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(251, 191, 36, 0); }
}

.tip-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.tip-text {
  font-size: 14px;
  color: #78350f;
  line-height: 1.6;
}

.tip-text strong {
  color: #92400e;
  font-weight: 700;
  padding: 1px 6px;
  background: #fde68a;
  border-radius: 5px;
}

@media (max-width: 768px) {
  .beginner-tip {
    padding: 10px 14px;
    gap: 8px;
  }
  .tip-icon { font-size: 16px; }
  .tip-text { font-size: 12px; }
}

.home-main {
  min-height: 200px;
}

.loading {
  text-align: center;
  color: #7dd3fc;
  padding: 80px 0;
  font-size: 16px;
}

/* ===== 课程包 ===== */
.course-pack {
  margin-bottom: 20px;
  border: 1px solid #e8f6ff;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.15);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.course-pack.expanded {
  box-shadow: 0 8px 32px rgba(125, 211, 252, 0.25);
  border-color: #bae6fd;
}

/* 标题栏 */
.pack-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.2s;
}

.pack-header:hover {
  background: #f5fbff;
}

.course-pack.expanded .pack-header {
  background: linear-gradient(135deg, #ffffff 0%, #f5fbff 100%);
  border-bottom: 1px solid #e8f6ff;
}

.pack-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
}

/* 箭头 */
.pack-arrow {
  display: inline-block;
  font-size: 12px;
  color: #7dd3fc;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
  flex-shrink: 0;
}

.pack-arrow.rotated {
  transform: rotate(90deg);
  color: #0284c7;
}

.pack-header h2 {
  font-size: 22px;
  margin: 0;
  color: #075985;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pack-level {
  display: inline-block;
  padding: 3px 12px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985;
  font-size: 12px;
  border-radius: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.pack-header-right {
  flex-shrink: 0;
}

.pack-count {
  font-size: 13px;
  color: #7dd3fc;
  padding: 4px 12px;
  background: #f5fbff;
  border-radius: 10px;
  font-weight: 500;
}

/* ===== 折叠区域 ===== */
.course-list-wrapper {
  padding: 20px 24px 24px;
}

.pack-desc {
  color: #7dd3fc;
  font-size: 14px;
  margin: 0 0 20px;
  line-height: 1.6;
}

.course-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.course-card {
  display: block;
  padding: 20px;
  border: 1px solid #e8f6ff;
  border-radius: 12px;
  background: #f8fcff;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  color: inherit;
}

.course-card:hover {
  border-color: #bae6fd;
  background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(125, 211, 252, 0.25);
}

.course-title {
  font-size: 17px;
  color: #075985;
  font-weight: 600;
  margin-bottom: 8px;
}

.course-meta {
  font-size: 13px;
  color: #7dd3fc;
}

/* ===== 折叠动画 ===== */
.fold-enter-active,
.fold-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.fold-enter-from,
.fold-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.fold-enter-to,
.fold-leave-from {
  opacity: 1;
  max-height: 2000px;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .home-container {
    padding: 40px 20px;
  }

  .home-header h1 {
    font-size: 32px;
  }

  .pack-header {
    padding: 16px 18px;
  }

  .pack-header h2 {
    font-size: 18px;
  }

  .pack-level {
    font-size: 11px;
    padding: 2px 8px;
  }

  .pack-count {
    font-size: 12px;
    padding: 3px 8px;
  }

  .course-list-wrapper {
    padding: 16px 18px 20px;
  }

  .course-list {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .course-card {
    padding: 16px;
  }

  .course-title {
    font-size: 16px;
  }
}
</style>