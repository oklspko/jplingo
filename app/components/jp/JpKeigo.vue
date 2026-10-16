<template>
  <div class="jk">
    <p class="jk-intro">
      敬语分三类：<b>尊他语（尊敬語）</b>抬高对方或话题人物的动作；<b>自谦语（謙譲語）</b>降低己方动作以抬高对方；
      <b>郑重语（丁重語）</b>使表达更郑重、恭敬。日常交流中三者常配合使用。
    </p>

    <section v-for="g in groups" :key="g.category" class="jk-group">
      <h3 class="jk-group-title">
        <span class="jk-group-icon">{{ g.icon }}</span>
        <span>{{ g.category }}</span>
        <span class="jk-group-desc">{{ g.desc }}</span>
      </h3>

      <div v-for="sub in g.subsections" :key="sub.title" class="jk-sub">
        <h4 class="jk-sub-title">{{ sub.title }}</h4>

        <div class="jk-grid">
          <article v-for="e in sub.entries" :key="e.pattern" class="jk-card">
            <div class="jk-card-head">
              <span class="jk-pattern">{{ e.pattern }}</span>
              <span v-if="e.setsuzoku" class="jk-setsuzoku">{{ e.setsuzoku }}</span>
            </div>
            <p class="jk-meaning">{{ e.meaning }}</p>
            <ul class="jk-examples">
              <li v-for="(ex, i) in e.examples" :key="i" class="jk-example">
                <span class="jk-ex-jp">{{ ex.jp }}</span>
                <span v-if="ex.zh" class="jk-ex-zh">{{ ex.zh }}</span>
              </li>
            </ul>
            <p v-if="e.note" class="jk-note">{{ e.note }}</p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useJpGrammarContent } from "~/composables/jp/useJpGrammarContent";

import { keigoGroups as bundledGroups } from "~/data/jp-keigo";

// ===== 语法页内容可热更新：远端 JSON 优先，缺失/未加载时用内置默认（模板无需改动）=====
const grammarContent = useJpGrammarContent();
const groups = computed(() => (grammarContent.value?.keigo as Record<string, unknown>)?.groups ?? bundledGroups);
</script>

<style scoped>
.jk {
  color: #075985;
}

.jk-intro {
  margin: 0 0 28px;
  font-size: 15px;
  line-height: 1.8;
  color: #0369a1;
}

.jk-intro b {
  color: #0284c7;
  font-weight: 700;
}

.jk-group {
  margin-bottom: 40px;
}

.jk-group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  color: #075985;
  font-weight: 700;
  margin: 0 0 16px;
}

.jk-group-icon {
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

.jk-group-desc {
  flex-shrink: 0;
  padding: 3px 12px;
  background: #f5fbff;
  border: 1px solid #e0f2fe;
  color: #7dd3fc;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.jk-sub {
  margin-bottom: 16px;
}

.jk-sub-title {
  font-size: 15px;
  color: #0369a1;
  font-weight: 700;
  margin: 0 0 12px;
  padding-left: 10px;
  border-left: 3px solid #bae6fd;
}

.jk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.jk-card {
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.12);
  transition: all 0.2s;
}

.jk-card:hover {
  border-color: #bae6fd;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(186, 230, 253, 0.25);
}

.jk-card-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #e8f6ff;
}

.jk-pattern {
  font-size: 16px;
  font-weight: 700;
  color: #075985;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.jk-setsuzoku {
  font-size: 12px;
  color: #059669;
  line-height: 1.6;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.jk-meaning {
  margin: 0 0 10px;
  font-size: 14px;
  color: #0369a1;
  line-height: 1.7;
}

.jk-examples {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.jk-example {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 10px;
  border-left: 3px solid #e0f2fe;
}

.jk-ex-jp {
  font-size: 14px;
  color: #0284c7;
  line-height: 1.6;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.jk-ex-zh {
  font-size: 12px;
  color: #7dd3fc;
  line-height: 1.5;
}

.jk-note {
  margin: 10px 0 0;
  padding: 8px 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  font-size: 12px;
  color: #92400e;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .jk-intro {
    font-size: 14px;
  }

  .jk-group {
    margin-bottom: 32px;
  }

  .jk-group-title {
    font-size: 18px;
    flex-wrap: wrap;
  }

  .jk-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
