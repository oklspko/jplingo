<template>
  <div class="ps">
    <p class="ps-intro">
      三类谓语句按<b>谓语词性</b>分：名词谓语句、形容词谓语句、动词谓语句。
      记号：<b>A1</b> = 一类形容词（い形容词）；<b>A2</b> = 二类形容词（な形容词 / 形容动词），接续与名词基本相同。
    </p>

    <!-- 笔记 ① A2 / 名词作谓语（接续相同） -->
    <div class="ps-card">
      <h3 class="ps-title"><span class="ps-num">1</span>A2 / 名词作谓语<span class="ps-tag">接续相同</span></h3>

      <div class="ps-table-scroll">
        <div class="ps-table ps-table--4">
          <div class="ps-row ps-row-head">
            <span class="ps-cell">简体 / 敬体</span>
            <span class="ps-cell">时态</span>
            <span class="ps-cell">肯定形式</span>
            <span class="ps-cell ps-cell-neg">否定形式</span>
          </div>
          <div v-for="(r, i) in nounRows" :key="i" class="ps-row">
            <span class="ps-cell ps-cell-key">{{ r[0] }}</span>
            <span class="ps-cell">{{ r[1] }}</span>
            <span class="ps-cell">{{ r[2] }}</span>
            <span class="ps-cell ps-cell-neg">{{ r[3] }}</span>
          </div>
        </div>
      </div>

      <p class="ps-example">例：学生 → 学生だ / 学生です；きれい（A2）→ きれいだ / きれいです</p>

      <div class="ps-notes">
        <p>💬 口语简化：把 <b>では</b> 换成 <b>じゃ</b>（じゃない・じゃありません）。</p>
        <p>📌 A2（形容动词）接续规则多与名词相同，且 A2 以词干形式出现（不带 だ），可视作有部分名词词性（不严谨）。</p>
      </div>
    </div>

    <!-- 笔记 ② A1 作谓语句 -->
    <div class="ps-card">
      <h3 class="ps-title"><span class="ps-num">2</span>A1 作谓语句<span class="ps-tag">い形容词</span></h3>

      <div class="ps-table-scroll">
        <div class="ps-table ps-table--4">
          <div class="ps-row ps-row-head">
            <span class="ps-cell">形态</span>
            <span class="ps-cell">时态</span>
            <span class="ps-cell">肯定</span>
            <span class="ps-cell ps-cell-neg">否定</span>
          </div>
          <div v-for="(r, i) in a1PlainRows" :key="i" class="ps-row">
            <span class="ps-cell ps-cell-key">{{ r[0] }}</span>
            <span class="ps-cell">{{ r[1] }}</span>
            <span class="ps-cell">{{ r[2] }}</span>
            <span class="ps-cell ps-cell-neg">{{ r[3] }}</span>
          </div>
        </div>
      </div>

      <p class="ps-keigo-hint">敬体形式为：<b>简体 ＋ です</b>。</p>

      <div class="ps-table-scroll">
        <div class="ps-table ps-table--3">
          <div class="ps-row ps-row-head">
            <span class="ps-cell">敬体</span>
            <span class="ps-cell">肯定</span>
            <span class="ps-cell ps-cell-neg">否定</span>
          </div>
          <div v-for="(r, i) in a1KeigoRows" :key="i" class="ps-row">
            <span class="ps-cell ps-cell-key">{{ r[0] }}</span>
            <span class="ps-cell">{{ r[1] }}</span>
            <span class="ps-cell ps-cell-neg">{{ r[2] }}</span>
          </div>
        </div>
      </div>

      <div class="ps-notes">
        <p>📌 <b>いい（好）的变形要用「よい」</b>：「いい」只有「现在肯定」这一形，其余活用全部来自「よい」——否定 <b>よく</b>ない／过去 <b>よかっ</b>た／过去否定 <b>よく</b>なかった／て形 <b>よく</b>て；敬体 いいです → <b>よくないです</b>。复合词同理：かっこいい → かっこ<b>よく</b>ない（✗ かっこいくない）。</p>
        <p>📌 <b>两个「以 い 结尾、其实是 A2（な形容词）」的词：きれい、嫌い</b>——接名词要加 <b>な</b>（きれい<b>な</b>花・嫌い<b>な</b>食べ物）；否定和过去按名词那套（きれい<b>じゃない</b>／きれい<b>だった</b>・嫌い<b>じゃない</b>／嫌い<b>だった</b>）；✗ 不能说「きれい<b>く</b>ない」「嫌い<b>かっ</b>た」。</p>
      </div>
    </div>

    <!-- 笔记 ③ 动词谓语句 -->
    <div class="ps-card">
      <h3 class="ps-title"><span class="ps-num">3</span>动词谓语句<span class="ps-tag">動詞</span></h3>

      <div class="ps-table-scroll">
        <div class="ps-table ps-table--4">
          <div class="ps-row ps-row-head">
            <span class="ps-cell">简体 / 敬体</span>
            <span class="ps-cell">时态</span>
            <span class="ps-cell">肯定</span>
            <span class="ps-cell ps-cell-neg">否定</span>
          </div>
          <div v-for="(r, i) in verbRows" :key="i" class="ps-row">
            <span class="ps-cell ps-cell-key">{{ r[0] }}</span>
            <span class="ps-cell">{{ r[1] }}</span>
            <span class="ps-cell">{{ r[2] }}</span>
            <span class="ps-cell ps-cell-neg">{{ r[3] }}</span>
          </div>
        </div>
      </div>

      <p class="ps-example">例：食べる → 食べない / 食べた / 食べます</p>

      <div class="ps-notes">
        <p>📌 ない 对应否定，た 对应过去。先否定再过去：ない（一类形容词）→ なかった。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useJpGrammarContent } from "~/composables/jp/useJpGrammarContent";
const bundlednounRows: string[][] = [
  ["简体", "现在时", "名词 ＋ だ", "名词 ＋ ではない"],
  ["简体", "过去时", "名词 ＋ だった", "名词 ＋ ではなかった"],
  ["敬体", "现在时", "名词 ＋ です", "名词 ＋ ではありません"],
  ["敬体", "过去时", "名词 ＋ でした", "名词 ＋ ではありませんでした"],
];

const bundleda1PlainRows: string[][] = [
  ["A1い（原型）", "现在时", "A1い", "A1い → く ＋ ない"],
  ["A1い → かっ ＋ た", "过去时", "A1かった", "A1い → く ＋ なかった"],
];

const bundleda1KeigoRows: string[][] = [
  ["现在时", "A1い ＋ です", "A1い → く ＋ ないです（＝ A1く ＋ ありません）"],
  ["过去时", "A1い → かっ ＋ た ＋ です", "A1い → く ＋ なかったです（＝ A1く ＋ ありませんでした）"],
];

const bundledverbRows: string[][] = [
  ["简体", "现在时", "动原", "ない形"],
  ["简体", "过去时", "た形", "なかった"],
  ["敬体（ます形）", "现在时", "ます", "ません"],
  ["敬体（ます形）", "过去时", "ました", "ませんでした"],
];

// ===== 语法页内容可热更新：远端 JSON 优先，缺失/未加载时用内置默认（模板无需改动）=====
const grammarContent = useJpGrammarContent();
const nounRows = computed(() => (grammarContent.value?.predicates as Record<string, unknown>)?.nounRows ?? bundlednounRows);
const a1PlainRows = computed(() => (grammarContent.value?.predicates as Record<string, unknown>)?.a1PlainRows ?? bundleda1PlainRows);
const a1KeigoRows = computed(() => (grammarContent.value?.predicates as Record<string, unknown>)?.a1KeigoRows ?? bundleda1KeigoRows);
const verbRows = computed(() => (grammarContent.value?.predicates as Record<string, unknown>)?.verbRows ?? bundledverbRows);
</script>

<style scoped>
.ps {
  color: #075985;
}

.ps-intro {
  margin: 0 0 28px;
  font-size: 15px;
  line-height: 1.8;
  color: #0369a1;
}

.ps-intro b {
  color: #0284c7;
  font-weight: 700;
}

/* 笔记卡片 */
.ps-card {
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 16px;
  padding: 22px 24px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.12);
  margin-bottom: 18px;
}

.ps-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 22px;
  color: #075985;
  font-weight: 700;
  margin: 0 0 14px;
}

.ps-num {
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

.ps-tag {
  flex-shrink: 0;
  padding: 3px 10px;
  background: #f5fbff;
  border: 1px solid #e0f2fe;
  color: #7dd3fc;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

/* 表格 */
.ps-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  margin-bottom: 12px;
}

.ps-table {
  display: flex;
  flex-direction: column;
  border: 1px solid #e8f6ff;
  border-radius: 10px;
  overflow: hidden;
  min-width: 460px;
}

.ps-row {
  display: grid;
  align-items: stretch;
  border-top: 1px solid #e8f6ff;
}

.ps-row:first-of-type {
  border-top: none;
}

.ps-table--4 .ps-row {
  grid-template-columns: 130px 80px 1.2fr 1.2fr;
}

.ps-table--3 .ps-row {
  grid-template-columns: 100px 1fr 1fr;
}

.ps-row-head {
  background: #f5fbff;
}

.ps-cell {
  padding: 9px 14px;
  font-size: 13px;
  line-height: 1.7;
  color: #075985;
  border-right: 1px solid #e8f6ff;
  word-break: break-all;
}

.ps-cell:last-child {
  border-right: none;
}

.ps-row-head .ps-cell {
  color: #7dd3fc;
  font-weight: 700;
  font-size: 12px;
  line-height: 1.5;
}

.ps-cell-key {
  font-weight: 700;
  color: #0369a1;
}

.ps-cell-neg {
  color: #5b7a8c;
}

.ps-row:not(.ps-row-head) .ps-cell-neg {
  background: #fbfeff;
}

/* 例句与备注 */
.ps-example {
  margin: 0 0 12px;
  font-size: 13px;
  color: #0369a1;
  line-height: 1.7;
}

.ps-keigo-hint {
  margin: 2px 0 10px;
  font-size: 13px;
  color: #0369a1;
  line-height: 1.7;
}

.ps-keigo-hint b {
  color: #0284c7;
}

.ps-notes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f5fbff 0%, #e8f6ff 100%);
  border: 1px solid #e0f2fe;
  border-radius: 10px;
}

.ps-notes p {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #0369a1;
}

.ps-notes b {
  color: #0284c7;
  font-weight: 700;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Hiragino Sans GB", "Noto Sans JP", sans-serif;
}

@media (max-width: 768px) {
  .ps-card {
    padding: 18px;
  }

  .ps-title {
    font-size: 19px;
  }

  .ps-table--4 .ps-row {
    grid-template-columns: 100px 64px 1.2fr 1.2fr;
  }

  .ps-cell {
    padding: 8px 10px;
    font-size: 12px;
  }
}
</style>
