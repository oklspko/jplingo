<template>
  <div class="jk">
    <p class="jk-intro">
      敬语分三类：<b>尊他语（尊敬語）</b>抬高对方或话题人物的动作；<b>自谦语（謙譲語）</b>降低己方动作以抬高对方；
      <b>郑重语（丁重語）</b>使表达更郑重、恭敬。日常交流中三者常配合使用。
    </p>

    <!-- 一级：分组（默认收起） -->
    <section v-for="g in groups" :key="g.category" class="jk-group" :class="{ open: isOpen('g', g.category) }">
      <button class="jk-group-head" :aria-expanded="isOpen('g', g.category)" @click="toggle('g', g.category)">
        <span class="jk-group-icon">{{ g.icon }}</span>
        <span class="jk-group-name">{{ g.category }}</span>
        <span class="jk-group-count">{{ countEntries(g) }} 条</span>
        <span class="jk-chevron">▾</span>
      </button>
      <p v-if="isOpen('g', g.category)" class="jk-group-desc">{{ g.desc }}</p>

      <div v-show="isOpen('g', g.category)" class="jk-group-body">
        <!-- 二级：小节（默认收起） -->
        <div v-for="sub in g.subsections" :key="g.category + '|' + sub.title" class="jk-sub">
          <button
            class="jk-sub-head"
            :aria-expanded="isOpen('s', g.category + '|' + sub.title)"
            @click="toggle('s', g.category + '|' + sub.title)"
          >
            <span class="jk-sub-title">{{ sub.title }}</span>
            <span class="jk-sub-count">{{ sub.entries.length }}</span>
            <span class="jk-chevron jk-chevron--sm">▾</span>
          </button>

          <div v-show="isOpen('s', g.category + '|' + sub.title)" class="jk-sub-body">
            <!-- 特殊动词：表格（按对应词分组），行内可展开看例句与说明 -->
            <template v-if="isVerbTable(sub.title)">
              <div v-for="grp in verbGroups(sub)" :key="grp.key" class="jk-vt-group">
                <div class="jk-vt-group-head">对应：{{ grp.base }}</div>
                <div class="jk-vt">
                  <template v-for="e in grp.entries" :key="e.pattern">
                    <button
                      class="jk-vt-row"
                      :class="{ open: isOpen('e', keyOf(g, sub, e)) }"
                      :aria-expanded="isOpen('e', keyOf(g, sub, e))"
                      @click="toggle('e', keyOf(g, sub, e))"
                    >
                      <span class="jk-vt-word">{{ e.pattern }}</span>
                      <span class="jk-vt-meaning">{{ e.meaning }}</span>
                      <span class="jk-chevron jk-chevron--sm">▾</span>
                    </button>
                    <div v-show="isOpen('e', keyOf(g, sub, e))" class="jk-vt-detail">
                      <ul class="jk-examples">
                        <li v-for="(ex, i) in e.examples" :key="i" class="jk-example">
                          <span class="jk-ex-jp">{{ ex.jp }}</span>
                          <span v-if="ex.zh" class="jk-ex-zh">{{ ex.zh }}</span>
                        </li>
                      </ul>
                      <p v-if="e.note" class="jk-note">{{ e.note }}</p>
                    </div>
                  </template>
                </div>
              </div>
            </template>

            <!-- 其余小节：条目卡片（默认收起，点开看接续/例句/说明） -->
            <template v-else>
              <div v-for="e in sub.entries" :key="e.pattern" class="jk-entry">
                <button
                  class="jk-entry-head"
                  :class="{ open: isOpen('e', keyOf(g, sub, e)) }"
                  :aria-expanded="isOpen('e', keyOf(g, sub, e))"
                  @click="toggle('e', keyOf(g, sub, e))"
                >
                  <span class="jk-pattern">{{ e.pattern }}</span>
                  <span class="jk-chevron jk-chevron--sm">▾</span>
                </button>
                <p class="jk-meaning">{{ e.meaning }}</p>

                <div v-show="isOpen('e', keyOf(g, sub, e))" class="jk-entry-body">
                  <p v-if="e.setsuzoku" class="jk-setsuzoku">{{ e.setsuzoku }}</p>
                  <ul class="jk-examples">
                    <li v-for="(ex, i) in e.examples" :key="i" class="jk-example">
                      <span class="jk-ex-jp">{{ ex.jp }}</span>
                      <span v-if="ex.zh" class="jk-ex-zh">{{ ex.zh }}</span>
                    </li>
                  </ul>
                  <p v-if="e.note" class="jk-note">{{ e.note }}</p>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useJpGrammarContent } from "~/composables/jp/useJpGrammarContent";
import { useJpCollapse } from "~/composables/jp/useJpCollapse";

import { keigoGroups as bundledGroups } from "~/data/jp-keigo";

// ===== 语法页内容可热更新：远端 JSON 优先，缺失/未加载时用内置默认（模板无需改动）=====
const grammarContent = useJpGrammarContent();
const groups = computed(() => (grammarContent.value?.keigo as Record<string, unknown>)?.groups ?? bundledGroups);

// ===== 收纳式折叠：分组 → 小节 → 条目，三级各自记录展开状态（默认全部收起）=====
type OpenLevel = "g" | "s" | "e";
const { isOpen: isOpenKey, toggle: toggleKey } = useJpCollapse();

function isOpen(level: OpenLevel, key: string): boolean {
  return isOpenKey(`${level}:${key}`);
}

function toggle(level: OpenLevel, key: string) {
  toggleKey(`${level}:${key}`);
}

interface SubLike {
  title: string;
  entries: Array<{ pattern: string; meaning: string; note?: string; examples?: Array<{ jp: string; zh?: string }>; setsuzoku?: string }>;
}
interface GroupLike {
  category: string;
  subsections: SubLike[];
}

function countEntries(g: GroupLike): number {
  return g.subsections.reduce((a, s) => a + s.entries.length, 0);
}

function keyOf(g: { category: string }, sub: { title: string }, e: { pattern: string }): string {
  return `${g.category}|${sub.title}|${e.pattern}`;
}

/** 「特殊尊他动词 / 特殊自谦动词」这类小节用表格呈现（单个词一目了然） */
function isVerbTable(title: string): boolean {
  return title.startsWith("特殊");
}

/**
 * 按「对应词」把特殊动词分组，让有关联的放一起。
 * 对应词从现有 note 里解析（如「「いらっしゃる」是「いる」「行く」「来る」的…」），
 * **不改数据**；解析不出来的归到「其他」。同一组对应词排序后作为 key，
 * 因此「いる・行く・来る」与「来る・行く・いる」会落在同一组。
 */
function verbGroups(sub: SubLike): Array<{ key: string; base: string; entries: SubLike["entries"] }> {
  const map = new Map<string, SubLike["entries"]>();
  for (const e of sub.entries) {
    const m = (e.note || "").match(/是((?:「[^」]+」)+)/);
    const bases = m ? [...m[1].matchAll(/「([^」]+)」/g)].map((x) => x[1]) : [];
    const key = bases.length ? bases.slice().sort().join("・") : "其他";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return [...map.entries()].map(([base, entries]) => ({ key: base, base, entries }));
}
</script>

<style scoped>
.jk {
  color: #075985;
}

.jk-intro {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.8;
  color: #0369a1;
}

.jk-intro b {
  color: #0284c7;
  font-weight: 700;
}

/* ===== 一级：分组卡片（默认收起） ===== */
.jk-group {
  margin-bottom: 12px;
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.12);
  overflow: hidden;
}

.jk-group.open {
  border-color: #bae6fd;
}

.jk-group-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 16px;
  background: none;
  border: 0;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.jk-group-icon {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  border-radius: 9px;
  font-size: 15px;
}

.jk-group-name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  color: #075985;
  font-weight: 700;
}

.jk-group-count {
  flex-shrink: 0;
  font-size: 12px;
  color: #7dd3fc;
  font-weight: 600;
}

.jk-chevron {
  flex-shrink: 0;
  color: #7dd3fc;
  font-size: 13px;
  transition: transform 0.2s;
}

.jk-group-head[aria-expanded="true"] .jk-chevron,
.jk-sub-head[aria-expanded="true"] .jk-chevron,
.jk-entry-head.open .jk-chevron,
.jk-vt-row.open .jk-chevron {
  transform: rotate(180deg);
}

.jk-group-desc {
  margin: 0 16px 10px;
  padding: 5px 12px;
  background: #f5fbff;
  border: 1px solid #e0f2fe;
  color: #0369a1;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
}

.jk-group-body {
  padding: 0 12px 12px;
}

/* ===== 二级：小节（默认收起） ===== */
.jk-sub {
  margin-top: 8px;
  border: 1px solid #eef8ff;
  border-radius: 12px;
  background: #fbfeff;
  overflow: hidden;
}

.jk-sub-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: none;
  border: 0;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.jk-sub-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #0369a1;
  font-weight: 700;
}

.jk-sub-count {
  flex-shrink: 0;
  min-width: 20px;
  padding: 1px 7px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #0284c7;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}

.jk-sub-body {
  padding: 0 10px 10px;
}

/* ===== 三级：条目（默认收起，点开看接续/例句/说明） ===== */
.jk-entry {
  margin-top: 8px;
  padding: 10px 12px;
  border: 1px solid #eef8ff;
  border-radius: 10px;
  background: #ffffff;
}

.jk-entry-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 0;
  background: none;
  border: 0;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.jk-entry-head .jk-pattern {
  flex: 1;
  min-width: 0;
}

.jk-entry-body {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e8f6ff;
}

/* ===== 特殊动词：表格（按对应词分组，每行可展开） ===== */
.jk-vt-group {
  margin-top: 8px;
}

.jk-vt-group-head {
  margin-bottom: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 700;
  color: #0284c7;
  background: #eef8ff;
  border-radius: 6px;
}

.jk-vt {
  border: 1px solid #eef8ff;
  border-radius: 10px;
  overflow: hidden;
  background: #ffffff;
}

.jk-vt-row {
  display: grid;
  grid-template-columns: 128px 1fr 14px;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  background: none;
  border: 0;
  border-top: 1px solid #f2faff;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}

.jk-vt-row:first-child {
  border-top: 0;
}

.jk-vt-row.open {
  background: #f7fcff;
}

.jk-vt-word {
  font-size: 14px;
  font-weight: 700;
  color: #075985;
  word-break: break-word;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.jk-vt-meaning {
  font-size: 12px;
  color: #0369a1;
  line-height: 1.5;
  word-break: break-word;
}

.jk-vt-detail {
  padding: 4px 10px 10px;
  background: #f7fcff;
  border-top: 1px dashed #e0f2fe;
}

/* ===== 通用文本 ===== */
.jk-pattern {
  font-size: 15px;
  font-weight: 700;
  color: #075985;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.jk-setsuzoku {
  font-size: 12px;
  color: #059669;
  line-height: 1.6;
  margin: 0 0 8px;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.jk-meaning {
  margin: 4px 0 0;
  font-size: 13px;
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

/* ===== 移动端 ===== */
@media (max-width: 768px) {
  .jk-intro {
    font-size: 13px;
    margin-bottom: 12px;
  }

  .jk-group {
    margin-bottom: 10px;
  }

  .jk-group-head {
    padding: 12px 13px;
  }

  .jk-group-name {
    font-size: 14px;
  }

  .jk-group-body {
    padding: 0 8px 8px;
  }

  .jk-sub-body {
    padding: 0 8px 8px;
  }

  .jk-entry {
    padding: 9px 10px;
  }

  .jk-vt-row {
    grid-template-columns: 96px 1fr 12px;
    gap: 6px;
    padding: 8px;
  }

  .jk-vt-word {
    font-size: 13px;
  }

  .jk-vt-meaning {
    font-size: 12px;
  }
}
</style>
