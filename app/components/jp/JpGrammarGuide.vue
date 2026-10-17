<template>
  <div class="grammar-guide">
    <p class="gg-lead">一句话记住：语法就是单词的<strong>惯用搭配</strong>，怎么接续取决于<strong>后面跟着什么词</strong>。</p>

    <!-- 一、核心原则 -->
    <section class="gg-section">
      <h2 class="gg-section-title"><span class="gg-num">1</span>核心原则</h2>
      <div class="gg-principles">
        <div class="gg-principle">
          <span class="gg-principle-icon">🔗</span>
          <p>语法就是单词的<strong>惯用搭配</strong>。怎么接续，完全取决于<strong>后面跟着什么词</strong>。</p>
        </div>
        <div class="gg-principle">
          <span class="gg-principle-icon">🧠</span>
          <p>不要死记语法公式，<strong>记单词怎么用</strong>就行。</p>
        </div>
      </div>
    </section>

    <!-- 二、句子基本结构 -->
    <section class="gg-section">
      <h2 class="gg-section-title"><span class="gg-num">2</span>句子基本结构</h2>
      <div class="gg-formula-card">
        <!-- 公式分段显示：太长时按「主题/主/补」「宾/谓/语气词」两组，避免挤在一行 -->
        <div class="gg-formula">
          <div class="gg-formula-seg">
            <span class="gg-chip"><span class="gg-mod-mark">修</span><span class="gg-chip-txt">主题</span><b class="gg-p">は</b></span>
            <span class="gg-plus">＋</span>
            <span class="gg-chip"><span class="gg-mod-mark">修</span><span class="gg-chip-txt">主</span><b class="gg-p">が</b></span>
            <span class="gg-plus">＋</span>
            <span class="gg-chip"><span class="gg-chip-txt">补</span></span>
          </div>
          <div class="gg-formula-seg">
            <span class="gg-chip"><span class="gg-mod-mark">修</span><span class="gg-chip-txt">宾</span><b class="gg-p">を</b></span>
            <span class="gg-plus">＋</span>
            <span class="gg-chip gg-chip-core">
              <span class="gg-mod-mark">修</span>
              <span class="gg-chip-txt">谓</span>
              <span class="gg-chip-sub">（时态·敬简等）</span>
            </span>
            <span class="gg-plus">＋</span>
            <span class="gg-chip"><span class="gg-chip-txt">语气词</span></span>
          </div>
        </div>
      </div>

      <!-- 简写对照：单独一块，逐条列出（不和公式混在一起） -->
      <div class="gg-legend">
        <p class="gg-legend-title">简写对照</p>
        <div class="gg-legend-row">
          <span class="gg-legend-abbr">主题</span>
          <span class="gg-legend-full">主题语</span>
          <span class="gg-legend-desc">句子围绕什么讲；助词「は」</span>
        </div>
        <div class="gg-legend-row">
          <span class="gg-legend-abbr">主</span>
          <span class="gg-legend-full">主语</span>
          <span class="gg-legend-desc">动作的发出者；助词「が」</span>
        </div>
        <div class="gg-legend-row">
          <span class="gg-legend-abbr">补</span>
          <span class="gg-legend-full">补语</span>
          <span class="gg-legend-desc">动作的时间、地点、方式；常用助词「に・で・と・へ」</span>
        </div>
        <div class="gg-legend-row">
          <span class="gg-legend-abbr">宾</span>
          <span class="gg-legend-full">宾语</span>
          <span class="gg-legend-desc">动作的承受者；助词「を」</span>
        </div>
        <div class="gg-legend-row">
          <span class="gg-legend-abbr">谓</span>
          <span class="gg-legend-full">谓语</span>
          <span class="gg-legend-desc">句子的核心（动作、状态、判断），放句末；承载时态（现在/过去）与敬简（敬体 です・ます／简体 だ・る）等变化</span>
        </div>
        <div class="gg-legend-row">
          <span class="gg-legend-abbr">语气词</span>
          <span class="gg-legend-full">终助词</span>
          <span class="gg-legend-desc">表达情感和语气；如「よ・ね・か」</span>
        </div>
        <div class="gg-legend-row">
          <span class="gg-legend-abbr">修</span>
          <span class="gg-legend-full">修饰语</span>
          <span class="gg-legend-desc">修饰名词（定语）或修饰谓语（状语）；主题、主语、宾语、谓语都可以被修饰</span>
        </div>
      </div>

      <!-- 修饰语能修饰谁：主语 / 宾语 / 谓语 都可以 -->
      <div class="gg-mod">
        <p class="gg-mod-title">修饰语可以放在三个位置</p>
        <div class="gg-mod-row">
          <span class="gg-mod-tag">修饰主语</span>
          <span class="gg-mod-ex"><em>元気な</em>学生が来ました。</span>
          <span class="gg-mod-note">定语：ナ形＋な／イ形直接／名词＋の</span>
        </div>
        <div class="gg-mod-row">
          <span class="gg-mod-tag">修饰宾语</span>
          <span class="gg-mod-ex"><em>温かい</em>ご飯を食べます。</span>
          <span class="gg-mod-note">定语：同上，放在名词前</span>
        </div>
        <div class="gg-mod-row">
          <span class="gg-mod-tag">修饰谓语</span>
          <span class="gg-mod-ex"><em>ゆっくり</em>歩きます。<em>毎朝</em>食べます。<em>たくさん</em>食べます。</span>
          <span class="gg-mod-note">状语：副词／イ形→く／ナ形→に／时间词／数量词</span>
        </div>
      </div>
    </section>

    <!-- 三、单词的连接规则（接续） -->
    <section class="gg-section">
      <h2 class="gg-section-title"><span class="gg-num">3</span>单词的连接规则（接续）</h2>
      <p class="gg-section-intro">日语是黏着语，单词后面要加助词提示作用。怎么接，看词性：</p>

      <div class="gg-rules">
        <!-- 1 -->
        <div class="gg-rule">
          <h3 class="gg-rule-title"><span class="gg-rule-num">1</span>形容词修饰其他词</h3>
          <div class="gg-rule-item">
            <span class="gg-tag">A1</span>
            <div class="gg-rule-body">
              <span class="gg-rule-label">一类形容词（词尾是「い」）</span>
              <ul class="gg-list">
                <li>
                  <b>接名词</b>：直接接 → <em>高い</em> 山・<em>おいしい</em> 料理
                </li>
                <li>
                  <b>接形容词（て形）</b>：词尾 <b>い → く</b>，再加 <b>て</b> → 高<b>くて</b> 広い・安<b>くて</b> おいしい
                </li>
                <li>
                  <b>接动词（副词化）</b>：词尾 <b>い → く</b> → <em>早く</em> 起きます・<em>よく</em> 分かります・<em>楽しく</em> 話します
                </li>
              </ul>
              <p class="gg-tip">
                📌 词尾变化就看最后一个假名：高い→高<b>く</b>／早い→早<b>く</b>／楽しい→楽し<b>く</b>／新しい→新し<b>く</b>；
                只有 <b>いい → よく</b> 是特殊（不是「いく」）。
              </p>
            </div>
          </div>
          <div class="gg-rule-item">
            <span class="gg-tag">A2</span>
            <div class="gg-rule-body">
              <span class="gg-rule-label">二类形容词（词尾不是「い」）</span>
              <ul class="gg-list">
                <li>
                  <b>接名词</b>：加 <b>な</b> → <em>静かな</em> 部屋・<em>きれいな</em> 花
                </li>
                <li>
                  <b>接形容词（で形）</b>：加 <b>で</b> → 静か<b>で</b> 広い
                </li>
                <li>
                  <b>接动词（副词化）</b>：加 <b>に</b> → <em>静かに</em> 歩きます・<em>上手に</em> 書きます
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 2 -->
        <div class="gg-rule">
          <h3 class="gg-rule-title"><span class="gg-rule-num">2</span>动词修饰名词</h3>
          <div class="gg-rule-item">
            <div class="gg-rule-body">
              <p>用<b>简体形式</b>直接接名词。</p>
            </div>
          </div>
        </div>

        <!-- 3 -->
        <div class="gg-rule">
          <h3 class="gg-rule-title"><span class="gg-rule-num">3</span>副词和数量词</h3>
          <div class="gg-rule-item">
            <div class="gg-rule-body">
              <p>直接接动词。</p>
            </div>
          </div>
        </div>

        <!-- 4 -->
        <div class="gg-rule">
          <h3 class="gg-rule-title"><span class="gg-rule-num">4</span>单词的合并与转换</h3>
          <div class="gg-rule-item">
            <span class="gg-tag">复合词</span>
            <div class="gg-rule-body">
              <p>动词<b>て形 / た形</b>去<b>ます</b>，可接动词或名词，组成新词。</p>
            </div>
          </div>
          <div class="gg-rule-item">
            <span class="gg-tag">名词化</span>
            <div class="gg-rule-body">
              <p>动词简体 / A1 / A2＋な，加上形式名词（<b>こと、の、もの</b>），就能把词组或句子变成名词，用来做主语或宾语。</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useJpGrammarContent } from "~/composables/jp/useJpGrammarContent";
import { roles as bundledRoles } from "~/data/jp-grammar-tables";

// ===== 语法页内容可热更新：远端 JSON 优先，缺失/未加载时用内置默认（模板无需改动）=====
const grammarContent = useJpGrammarContent();
const roles = computed(() => (grammarContent.value?.guide as Record<string, unknown>)?.roles ?? bundledRoles);
</script>

<style scoped>
.grammar-guide {
  color: #075985;
}

/* ===== 引言 ===== */
.gg-lead {
  margin: 0 0 28px;
  font-size: 15px;
  line-height: 1.8;
  color: #0369a1;
}

.gg-lead strong {
  color: #0284c7;
  font-weight: 700;
}

/* ===== 区块 ===== */
.gg-section {
  margin-bottom: 44px;
}

/* 形容词接续的具体说明 */
.gg-list {
  margin: 6px 0 0;
  padding-left: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  line-height: 1.75;
  color: #0369a1;
}

.gg-list li {
  position: relative;
  padding-left: 16px;
}

.gg-list li::before {
  content: "・";
  position: absolute;
  left: 2px;
  color: #7dd3fc;
  font-weight: 700;
}

.gg-list b {
  color: #075985;
  font-weight: 700;
}

.gg-list em {
  font-style: normal;
  font-weight: 700;
  color: #0284c7;
  background: #f0f9ff;
  border-radius: 6px;
  padding: 1px 6px;
  margin: 0 1px;
}

.gg-tip {
  margin: 10px 0 0;
  padding: 10px 12px;
  background: #f5fbff;
  border-left: 3px solid #7dd3fc;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.75;
  color: #0369a1;
}

.gg-section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 22px;
  color: #075985;
  font-weight: 700;
  margin: 0 0 20px;
}

.gg-num {
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

/* ===== 核心原则 ===== */
.gg-principles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.gg-principle {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.15);
}

.gg-principle-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.gg-principle p {
  margin: 0;
  font-size: 15px;
  line-height: 1.8;
  color: #0369a1;
}

.gg-principle strong {
  color: #0284c7;
  font-weight: 700;
}

/* ===== 句子结构公式 ===== */
.gg-formula-card {
  padding: 28px 24px;
  background: linear-gradient(135deg, #f5fbff 0%, #e8f6ff 100%);
  border: 1px solid #e0f2fe;
  border-radius: 16px;
  margin-bottom: 20px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
}

.gg-formula {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

/* 公式分段：每段自己换行，段与段之间上下排列，避免整行挤在一起 */
.gg-formula-seg {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.gg-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 16px;
  background: #ffffff;
  border: 2px solid #bae6fd;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(186, 230, 253, 0.3);
}

.gg-chip-core {
  border-color: #38bdf8;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
}

.gg-chip-txt {
  font-size: 13px;
  color: #7dd3fc;
  font-weight: 600;
}

.gg-chip-core .gg-chip-txt {
  color: #0369a1;
}

/* 「修」标记：表示这一格可以被修饰语修饰（主题 / 主语 / 宾语 / 谓语） */
.gg-mod-mark {
  display: inline-block;
  padding: 0 4px;
  border-radius: 4px;
  background: #fef3c7;
  color: #b45309;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.5;
}

.gg-p {
  font-size: 20px;
  color: #0284c7;
  font-weight: 700;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Hiragino Sans GB", "Noto Sans JP", sans-serif;
  line-height: 1;
}

/* 多个助词并列时字号略小（补语：に・で・と） */
.gg-p--multi {
  font-size: 13px;
  line-height: 1.3;
}

/* ===== 简写对照（独立一块，逐条列出） ===== */
.gg-legend {
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px solid #e0f2fe;
  border-radius: 12px;
  background: #ffffff;
}

.gg-legend-title {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: #0369a1;
}

.gg-legend-row {
  display: grid;
  grid-template-columns: 56px 64px 1fr;
  align-items: baseline;
  gap: 10px;
  padding: 7px 0;
  border-top: 1px dashed #eef8ff;
}

.gg-legend-row:first-of-type {
  border-top: 0;
}

.gg-legend-abbr {
  font-size: 13px;
  font-weight: 700;
  color: #075985;
}

.gg-legend-full {
  font-size: 12px;
  font-weight: 600;
  color: #0284c7;
}

.gg-legend-desc {
  font-size: 12px;
  color: #5b7a8c;
  line-height: 1.6;
}

/* 谓語格子里的括注（时态·敬简等） */
.gg-chip-sub {
  font-size: 10px;
  line-height: 1.4;
  color: #0369a1;
  white-space: nowrap;
}

.gg-plus {
  color: #bae6fd;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}

/* ===== 成分说明 ===== */
.gg-roles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.gg-role {
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 12px;
  transition: all 0.2s;
}

.gg-role:hover {
  border-color: #bae6fd;
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(186, 230, 253, 0.25);
}

.gg-role-name {
  font-size: 15px;
  font-weight: 700;
  color: #075985;
  margin-bottom: 4px;
}

.gg-role-desc {
  font-size: 13px;
  color: #5b7a8c;
  line-height: 1.6;
}

/* ===== 接续规则 ===== */
.gg-section-intro {
  font-size: 14px;
  color: #5b7a8c;
  margin: 0 0 20px;
  line-height: 1.7;
}

.gg-rules {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.gg-rule {
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 16px;
  padding: 22px 24px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.12);
}

.gg-rule-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  color: #075985;
  font-weight: 700;
  margin: 0 0 16px;
}

.gg-rule-num {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #e0f2fe;
  color: #0284c7;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
}

.gg-rule-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 0;
  border-top: 1px dashed #e8f6ff;
}

.gg-rule-item:first-of-type {
  border-top: none;
  padding-top: 0;
}

.gg-tag {
  flex-shrink: 0;
  min-width: 58px;
  text-align: center;
  padding: 5px 12px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985;
  font-size: 13px;
  font-weight: 700;
  border-radius: 8px;
  font-family: ui-monospace, "SF Mono", "Consolas", "Courier New", monospace;
}

.gg-rule-body {
  flex: 1;
}

.gg-rule-label {
  display: block;
  font-size: 13px;
  color: #7dd3fc;
  font-weight: 600;
  margin-bottom: 3px;
}

.gg-rule-body p {
  margin: 0;
  font-size: 15px;
  color: #0369a1;
  line-height: 1.8;
}

.gg-rule-body b {
  color: #0284c7;
  font-weight: 700;
}

/* ===== 单词 → 句子的堆叠示例 ===== */
.gg-stack {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed #bae6fd;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gg-stack-title {
  margin: 0 0 2px;
  font-size: 12px;
  color: #7dd3fc;
  font-weight: 600;
}

.gg-stack-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 14px;
  line-height: 1.55;
  color: #075985;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.gg-stack-row > b {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: #e0f2fe;
  color: #0284c7;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
}

.gg-stack-row em {
  font-style: normal;
  color: #b45309;
  background: #fffbeb;
  border-radius: 4px;
  padding: 0 3px;
}

/* 第 1 步是基础句，不要「新增」高亮，用浅色小标签标注 */
.gg-stack-row em.gg-base {
  margin-left: 6px;
  background: #e0f2fe;
  color: #0284c7;
  font-size: 11px;
}

/* 每行末尾标注「这一步加的是公式里的哪个成分」 */
.gg-add-tag {
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 4px;
  border: 1px solid #e0f2fe;
  background: #f0f9ff;
  color: #0284c7;
  font-size: 11px;
  font-style: normal;
  white-space: nowrap;
}

.gg-stack-row--full {
  font-weight: 700;
  color: #0369a1;
}

/* ===== 修饰语能修饰谁 ===== */
.gg-mod {
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px dashed #bae6fd;
  border-radius: 12px;
  background: #fbfeff;
}

.gg-mod-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
  color: #0369a1;
}

.gg-mod-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 0;
  border-top: 1px dashed #eef8ff;
}

.gg-mod-row:first-of-type {
  border-top: 0;
}

.gg-mod-tag {
  font-size: 12px;
  font-weight: 700;
  color: #0284c7;
}

.gg-mod-ex {
  font-size: 14px;
  color: #075985;
  line-height: 1.65;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.gg-mod-ex em {
  font-style: normal;
  color: #b45309;
  background: #fffbeb;
  border-radius: 4px;
  padding: 0 3px;
}

.gg-mod-note {
  font-size: 11.5px;
  color: #7dd3fc;
  line-height: 1.5;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .gg-lead {
    font-size: 14px;
  }

  .gg-section {
    margin-bottom: 28px;
  }

  .gg-section-title {
    font-size: 17px;
  }

  /* 公式：手机上允许换行铺开（原来 min-width: max-content + 横向滚动，会被卡片边缘挡住） */
  .gg-formula-card {
    padding: 14px 12px;
    overflow-x: visible;
  }

  .gg-formula {
    min-width: 0;
    flex-wrap: wrap;
    gap: 6px;
  }

  .gg-chip {
    padding: 7px 11px;
  }

  .gg-chip-txt {
    font-size: 12px;
  }

  .gg-p {
    font-size: 17px;
  }

  .gg-stack-row {
    font-size: 13px;
  }

  /* 简写对照：手机上两列（简写 | 全称＋说明） */
  .gg-legend {
    padding: 12px;
  }

  .gg-legend-row {
    grid-template-columns: 46px 1fr;
    gap: 2px 8px;
    padding: 8px 0;
  }

  .gg-legend-desc {
    grid-column: 2;
  }

  .gg-rule {
    padding: 16px;
  }

  .gg-rule-body p {
    font-size: 14px;
  }
}
</style>
