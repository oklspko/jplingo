<template>
  <div class="jp-page-wrap">
    <JpSidebar />
    <main class="jp-page-main">
      <div class="guide-container">
        <header class="page-header">
          <span class="page-badge">📖 内容学习</span>
          <h1 class="page-title">日语连词成句 · 语法学习</h1>
          <p class="page-sub">按顺序学：先会「输入」→ 再会「造句」→ 再学「动词」→ 会用「助词」→ 最后懂「逻辑」</p>
        </header>

        <!-- 语法条词典入口 -->
        <a href="/jp-grammar" class="grammar-jump-card">
          <span class="gjc-icon">🔎</span>
          <span class="gjc-text">
            <span class="gjc-title">语法条词典</span>
            <span class="gjc-desc">按五十音（あいうえお）· 能力考等级（N5–N1）检索语法条</span>
          </span>
          <span class="gjc-arrow">→</span>
        </a>

        <!-- 一、日语输入法 -->
        <section class="page-section">
          <h2
            class="page-section-title"
            role="button"
            tabindex="0"
            :aria-expanded="openInput"
            @click="openInput = !openInput"
            @keydown.enter.prevent="openInput = !openInput"
            @keydown.space.prevent="openInput = !openInput"
          >
            <span class="page-num">一</span>
            <span class="page-title-text">日语输入法</span>
            <span class="section-toggle">{{ openInput ? "▾ 收起" : "▸ 展开" }}</span>
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
          <h2
            class="page-section-title"
            role="button"
            tabindex="0"
            :aria-expanded="openPredicate"
            @click="openPredicate = !openPredicate"
            @keydown.enter.prevent="openPredicate = !openPredicate"
            @keydown.space.prevent="openPredicate = !openPredicate"
          >
            <span class="page-num">二</span>
            <span class="page-title-text">三类谓语句</span>
            <span class="section-toggle">{{ openPredicate ? "▾ 收起" : "▸ 展开" }}</span>
          </h2>
          <transition name="fold">
            <div v-show="openPredicate" class="page-section-body">
              <JpPredicateSentences />
            </div>
          </transition>
        </section>

        <!-- 三、动词 -->
        <section class="page-section">
          <h2
            class="page-section-title"
            role="button"
            tabindex="0"
            :aria-expanded="openVerb"
            @click="openVerb = !openVerb"
            @keydown.enter.prevent="openVerb = !openVerb"
            @keydown.space.prevent="openVerb = !openVerb"
          >
            <span class="page-num">三</span>
            <span class="page-title-text">动词</span>
            <span class="section-toggle">{{ openVerb ? "▾ 收起" : "▸ 展开" }}</span>
          </h2>
          <transition name="fold">
            <div v-show="openVerb" class="page-section-body">
              <JpVerbGuide />
            </div>
          </transition>
        </section>

        <!-- 四、助词 -->
        <section class="page-section">
          <h2
            class="page-section-title"
            role="button"
            tabindex="0"
            :aria-expanded="openParticles"
            @click="openParticles = !openParticles"
            @keydown.enter.prevent="openParticles = !openParticles"
            @keydown.space.prevent="openParticles = !openParticles"
          >
            <span class="page-num">四</span>
            <span class="page-title-text">助词</span>
            <span class="section-toggle">{{ openParticles ? "▾ 收起" : "▸ 展开" }}</span>
          </h2>
          <transition name="fold">
            <div v-show="openParticles" class="page-section-body">
              <p class="page-section-intro">助词贴在各成分之后，提示它和谓语的关系，是连词成句最关键的一环。</p>
              <JpParticles />
            </div>
          </transition>
        </section>

        <!-- 五、核心逻辑 -->
        <section class="page-section">
          <h2
            class="page-section-title"
            role="button"
            tabindex="0"
            :aria-expanded="openLogic"
            @click="openLogic = !openLogic"
            @keydown.enter.prevent="openLogic = !openLogic"
            @keydown.space.prevent="openLogic = !openLogic"
          >
            <span class="page-num">五</span>
            <span class="page-title-text">核心逻辑</span>
            <span class="section-toggle">{{ openLogic ? "▾ 收起" : "▸ 展开" }}</span>
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
import JpParticles from "~/components/jp/JpParticles.vue";
import JpVerbGuide from "~/components/jp/JpVerbGuide.vue";

const openInput = ref(false);
const openPredicate = ref(false);
const openVerb = ref(false);
const openParticles = ref(false);
const openLogic = ref(false);
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
  font-family: inherit;
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

/* ===== 语法条词典入口卡片 ===== */
.grammar-jump-card {
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 520px;
  margin: 0 auto 8px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
  border: 1px solid #bae6fd;
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 4px 16px rgba(125, 211, 252, 0.2);
  transition: all 0.2s;
}

.grammar-jump-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(125, 211, 252, 0.35);
  border-color: #7dd3fc;
}

.gjc-icon {
  flex-shrink: 0;
  font-size: 26px;
}

.gjc-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gjc-title {
  font-size: 15px;
  font-weight: 700;
  color: #075985;
}

.gjc-desc {
  font-size: 12px;
  color: #7dd3fc;
  line-height: 1.5;
}

.gjc-arrow {
  flex-shrink: 0;
  font-size: 18px;
  color: #7dd3fc;
  transition: transform 0.2s;
}

.grammar-jump-card:hover .gjc-arrow {
  transform: translateX(3px);
  color: #0284c7;
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
  cursor: pointer;
  user-select: none;
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
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;
}

.page-section-title:hover .section-toggle {
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
