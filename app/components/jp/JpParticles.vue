<template>
  <div class="jp-particles">
    <p class="jp-particles-intro">
      助词是没有词形变化、不能单独使用的附属词，接在词后表明该词在句中的作用、增添意义，或连接词与词、句与句。
      按作用分六类：<b>格助词</b>、<b>提示助词</b>、<b>并列助词</b>、<b>副助词</b>、<b>接续助词</b>、<b>终助词</b>。
      同一助词常兼属多类（如「と」既是格助词，又是并列、接续助词）。
    </p>

    <section
      v-for="group in groups"
      :key="group.category"
      class="jp-particles-group"
    >
      <h3
        class="jp-particles-group-title"
        role="button"
        tabindex="0"
        :aria-expanded="isOpen('g:' + group.category)"
        @click="toggle('g:' + group.category)"
        @keydown.enter.prevent="toggle('g:' + group.category)"
        @keydown.space.prevent="toggle('g:' + group.category)"
      >
        <span class="jp-particles-group-icon">{{ group.icon }}</span>
        <span>{{ group.category }}</span>
        <span class="jp-particles-group-tag">{{ group.desc }}</span>
        <span class="jp-chevron">▾</span>
      </h3>

      <div v-show="isOpen('g:' + group.category)" class="jp-particles-grid">
        <article v-for="p in group.particles" :key="p.p" class="jp-particle-card">
          <div
            class="jp-particle-head"
            role="button"
            tabindex="0"
            :aria-expanded="isOpen('p:' + group.category + '|' + p.p)"
            @click="toggle('p:' + group.category + '|' + p.p)"
            @keydown.enter.prevent="toggle('p:' + group.category + '|' + p.p)"
            @keydown.space.prevent="toggle('p:' + group.category + '|' + p.p)"
          >
            <span class="jp-particle-kana">{{ p.p }}</span>
            <span class="jp-particle-name">{{ p.name }}</span>
            <span class="jp-chevron jp-chevron--sm">▾</span>
          </div>
          <ul v-show="isOpen('p:' + group.category + '|' + p.p)" class="jp-particle-usages">
            <li v-for="(u, i) in p.usages" :key="i" class="jp-particle-usage">
              <span class="jp-particle-usage-label">{{ u.usage }}</span>
              <span class="jp-particle-example">{{ u.example }}</span>
              <span class="jp-particle-translation">{{ u.translation }}</span>
            </li>
          </ul>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useJpGrammarContent } from "~/composables/jp/useJpGrammarContent";
import { useJpCollapse } from "~/composables/jp/useJpCollapse";
import { particleGroups as bundledGroups } from "~/data/jp-particles";

// ===== 语法页内容可热更新：远端 JSON 优先，缺失/未加载时用内置默认（模板无需改动）=====
const grammarContent = useJpGrammarContent();
const groups = computed(() => (grammarContent.value?.particles as Record<string, unknown>)?.groups ?? bundledGroups);

// ===== 收纳式折叠：分组 + 单个助词，默认全部收起 =====
const { isOpen, toggle } = useJpCollapse();
</script>

<style scoped>
.jp-particles {
  color: #075985;
}

.jp-particles-intro {
  margin: 0 0 28px;
  font-size: 15px;
  line-height: 1.8;
  color: #0369a1;
}

.jp-particles-intro b {
  color: #0284c7;
  font-weight: 700;
}

/* 分组 */
.jp-particles-group {
  margin-bottom: 36px;
}

.jp-particles-group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 19px;
  color: #075985;
  font-weight: 700;
  margin: 0 0 16px;
}

.jp-particles-group-icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  border-radius: 10px;
  font-size: 17px;
}

.jp-particles-group-tag {
  flex-shrink: 0;
  padding: 3px 12px;
  background: #f5fbff;
  border: 1px solid #e0f2fe;
  color: #7dd3fc;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

/* 卡片网格 */
.jp-particles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.jp-particle-card {
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.12);
  transition: all 0.2s;
}

.jp-particle-card:hover {
  border-color: #bae6fd;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(186, 230, 253, 0.25);
}

.jp-particle-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #e8f6ff;
}

.jp-particle-kana {
  flex-shrink: 0;
  min-width: 34px;
  text-align: center;
  padding: 4px 10px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985;
  font-size: 20px;
  font-weight: 700;
  border-radius: 8px;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.jp-particle-name {
  font-size: 14px;
  font-weight: 600;
  color: #0369a1;
}

.jp-particle-usages {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.jp-particle-usage {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.jp-particle-usage-label {
  font-size: 13px;
  font-weight: 600;
  color: #075985;
}

.jp-particle-example {
  font-size: 14px;
  color: #0284c7;
  line-height: 1.6;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.jp-particle-translation {
  font-size: 12px;
  color: #7dd3fc;
  line-height: 1.5;
}

/* ===== 收纳式折叠 ===== */
.jp-particles-group-title {
  cursor: pointer;
  user-select: none;
}

.jp-chevron {
  flex-shrink: 0;
  margin-left: auto;
  color: #7dd3fc;
  font-size: 13px;
  transition: transform 0.2s;
}

.jp-chevron--sm {
  font-size: 12px;
}

.jp-particles-group-title[aria-expanded="true"] .jp-chevron,
.jp-particle-head[aria-expanded="true"] .jp-chevron {
  transform: rotate(180deg);
}

.jp-particle-head {
  cursor: pointer;
  user-select: none;
}

@media (max-width: 768px) {
  .jp-particles-intro {
    font-size: 14px;
  }

  .jp-particles-group {
    margin-bottom: 30px;
  }

  .jp-particles-group-title {
    font-size: 15px;
    flex-wrap: wrap;
  }

  .jp-particles-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
