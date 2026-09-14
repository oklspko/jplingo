<template>
  <div class="jp-page-wrap">
    <JpSidebar />
    <main class="jp-page-main">
      <div class="guide-container">
        <JpGrammarGuide />

        <div class="kana-divider">
          <span class="kana-divider-line"></span>
          <span class="kana-divider-text">附：日语输入表（罗马字 → 假名）</span>
          <span class="kana-divider-line"></span>
        </div>

        <JpKanaChart />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import JpSidebar from "~/components/jp/JpSidebar.vue";
import JpGrammarGuide from "~/components/jp/JpGrammarGuide.vue";
import JpKanaChart from "~/components/jp/JpKanaChart.vue";
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

.kana-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 8px 0 24px;
}

.kana-divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, #bae6fd, transparent);
}

.kana-divider-text {
  font-size: 13px;
  color: #7dd3fc;
  font-weight: 600;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .guide-container {
    padding: 32px 20px 60px;
  }

  .kana-divider {
    gap: 10px;
  }
}
</style>
