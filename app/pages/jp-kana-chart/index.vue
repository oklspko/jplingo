<template>
  <div class="jp-page-wrap">
    <JpSidebar />
    <main class="jp-page-main">
      <div class="kana-container">
        <JpKanaChart />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import JpSidebar from "~/components/jp/JpSidebar.vue";
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

.kana-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 40px 80px;
  font-family: -apple-system, "Segoe UI", "Noto Sans JP", sans-serif;
}

@media (max-width: 768px) {
  .kana-container {
    padding: 40px 20px 60px;
  }
}
</style>
