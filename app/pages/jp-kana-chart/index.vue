<template>
  <div class="jp-page-wrap">
    <JpSidebar />
    <main class="jp-page-main">
      <div class="guide-container">
        <header class="page-header">
          <span class="page-badge">📖 内容学习</span>
          <h1 class="page-title">日语连词成句 · 语法学习</h1>
          <p class="page-sub">按顺序学：先会「输入」→ 再会「造句」→ 最后懂「逻辑」</p>
        </header>

        <!-- 一、日语输入法 -->
        <section class="page-section">
          <h2 class="page-section-title">
            <span class="page-num">一</span>
            <span class="page-title-text">日语输入法</span>
            <button class="section-toggle" type="button" @click="openInput = !openInput" :aria-expanded="openInput">
              {{ openInput ? "收起" : "展开" }}
            </button>
          </h2>
          <transition name="fold">
            <div v-show="openInput" class="page-section-body">
              <p class="page-section-intro">输入罗马字 → 打出对应假名，这是打日语的第一步。</p>
              <JpKanaChart />
            </div>
          </transition>
        </section>

        <!-- 二、三类谓语句 -->
        <section class="page-section">
          <h2 class="page-section-title">
            <span class="page-num">二</span>
            <span class="page-title-text">三类谓语句</span>
            <button class="section-toggle" type="button" @click="openPredicate = !openPredicate" :aria-expanded="openPredicate">
              {{ openPredicate ? "收起" : "展开" }}
            </button>
          </h2>
          <transition name="fold">
            <div v-show="openPredicate" class="page-section-body">
              <JpPredicateSentences />
            </div>
          </transition>
        </section>

        <!-- 三、核心逻辑 -->
        <section class="page-section">
          <h2 class="page-section-title">
            <span class="page-num">三</span>
            <span class="page-title-text">核心逻辑</span>
            <button class="section-toggle" type="button" @click="openLogic = !openLogic" :aria-expanded="openLogic">
              {{ openLogic ? "收起" : "展开" }}
            </button>
          </h2>
          <transition name="fold">
            <div v-show="openLogic" class="page-section-body">
              <JpGrammarGuide />
            </div>
          </transition>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import JpSidebar from "~/components/jp/JpSidebar.vue";
import JpGrammarGuide from "~/components/jp/JpGrammarGuide.vue";
import JpPredicateSentences from "~/components/jp/JpPredicateSentences.vue";
import JpKanaChart from "~/components/jp/JpKanaChart.vue";

const openInput = ref(true);
const openPredicate = ref(true);
const openLogic = ref(true);
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

.guide-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 40px 80px;
  font-family: -apple-system, "Segoe UI", "Noto Sans JP", sans-serif;
}

/* ===== 页头 ===== */
.page-header {
  text-align: center;
  padding: 0 0 36px;
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

/* ===== 区块 ===== */
.page-section {
  margin-bottom: 24px;
}

.page-section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 22px;
  color: #075985;
  font-weight: 700;
  margin: 0 0 10px;
}

.page-num {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985;
  border-radius: 10px;
  font-size: 17px;
  font-weight: 700;
}

.page-title-text {
  flex: 1;
}

.section-toggle {
  flex-shrink: 0;
  margin-left: auto;
  padding: 8px 18px;
  border-radius: 10px;
  border: 1px solid #e0f2fe;
  background: #f5fbff;
  color: #0369a1;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;
}

.section-toggle:hover {
  background: #e0f2fe;
  border-color: #bae6fd;
  color: #0284c7;
}

.page-section-intro {
  font-size: 14px;
  color: #5b7a8c;
  margin: 0 0 16px;
  line-height: 1.7;
}

/* 折叠动画 */
.fold-enter-active,
.fold-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.fold-enter-from,
.fold-leave-to {
  opacity: 0;
  max-height: 0;
}

.fold-enter-to,
.fold-leave-from {
  opacity: 1;
  max-height: 4000px;
}

@media (max-width: 768px) {
  .guide-container {
    padding: 32px 20px 60px;
  }

  .page-header {
    padding: 0 0 28px;
  }

  .page-title {
    font-size: 26px;
  }

  .page-sub {
    font-size: 13px;
  }

  .page-section {
    margin-bottom: 18px;
  }

  .page-section-title {
    font-size: 19px;
  }

  .section-toggle {
    padding: 6px 14px;
  }
}
</style>
