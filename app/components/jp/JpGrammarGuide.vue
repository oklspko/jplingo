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
        <div class="gg-formula">
          <span class="gg-chip"><span class="gg-chip-txt">主题</span><b class="gg-p">は</b></span>
          <span class="gg-plus">＋</span>
          <span class="gg-chip"><span class="gg-chip-txt">主语</span><b class="gg-p">が</b></span>
          <span class="gg-plus">＋</span>
          <span class="gg-chip"><span class="gg-chip-txt">补语</span></span>
          <span class="gg-plus">＋</span>
          <span class="gg-chip"><span class="gg-chip-txt">宾语</span><b class="gg-p">を</b></span>
          <span class="gg-plus">＋</span>
          <span class="gg-chip"><span class="gg-chip-txt">修饰语</span></span>
          <span class="gg-plus">＋</span>
          <span class="gg-chip gg-chip-core"><span class="gg-chip-txt">谓语</span></span>
          <span class="gg-plus">＋</span>
          <span class="gg-chip"><span class="gg-chip-txt">语气词</span></span>
        </div>
      </div>

      <div class="gg-roles">
        <div v-for="role in roles" :key="role.name" class="gg-role">
          <div class="gg-role-name">{{ role.name }}</div>
          <div class="gg-role-desc">{{ role.desc }}</div>
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
              <span class="gg-rule-label">一类形容词</span>
              <p>直接接名词；<b>て形</b>接形容词；<b>い → く</b>接动词。</p>
            </div>
          </div>
          <div class="gg-rule-item">
            <span class="gg-tag">A2</span>
            <div class="gg-rule-body">
              <span class="gg-rule-label">二类形容词</span>
              <p>加<b>な</b>接名词；<b>で形</b>接形容词；加<b>に</b>接动词。</p>
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
const roles = [
  { name: "主题", desc: "句子在围绕什么讲。" },
  { name: "主语", desc: "动作的发出者。" },
  { name: "补语", desc: "动作的时间、地点、方式。" },
  { name: "宾语", desc: "动作的承受者。" },
  { name: "修饰语", desc: "修饰名词（定语）或修饰谓语（状语）。" },
  { name: "谓语", desc: "句子的核心（动作、状态、判断），放在最后。" },
  { name: "语气词", desc: "表达情感和语气。" },
];
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
}

.gg-formula {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: max-content;
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

.gg-p {
  font-size: 20px;
  color: #0284c7;
  font-weight: 700;
  font-family: "Noto Sans JP", sans-serif;
  line-height: 1;
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
  font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
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

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .gg-lead {
    font-size: 14px;
  }

  .gg-section {
    margin-bottom: 32px;
  }

  .gg-section-title {
    font-size: 19px;
  }

  .gg-formula-card {
    padding: 20px 16px;
  }

  .gg-chip {
    padding: 8px 12px;
  }

  .gg-rule {
    padding: 18px;
  }

  .gg-rule-body p {
    font-size: 14px;
  }
}
</style>
