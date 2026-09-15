<template>
  <div class="ps">
    <p class="ps-intro">
      日语按「谓语」分成三类：<strong>动词谓语句</strong>、<strong>形容词谓语句</strong>、<strong>名词谓语句</strong>。
      课程里的所有句子都跑不出这三种，记谓语怎么变，就能造句。
    </p>

    <!-- ① 动词谓语句 -->
    <div class="ps-card">
      <h3 class="ps-title"><span class="ps-num">①</span>动词谓语句<span class="ps-jp">動詞述語文</span></h3>
      <p class="ps-desc">谓语是<b>动词</b>，表示动作、行为。动词永远放在句末。</p>

      <div class="ps-formula">
        <span class="ps-chip"><span class="ps-chip-t">主题</span><b class="ps-p">は</b></span>
        <span class="ps-plus">＋</span>
        <span class="ps-chip"><span class="ps-chip-t">地点</span><b class="ps-p">で</b></span>
        <span class="ps-plus">＋</span>
        <span class="ps-chip"><span class="ps-chip-t">宾语</span><b class="ps-p">を</b></span>
        <span class="ps-plus">＋</span>
        <span class="ps-chip ps-chip-core"><span class="ps-chip-t">动词</span></span>
      </div>
      <p class="ps-example">例：私は毎日、家で水を飲む。<span class="ps-example-cn">（我每天在家喝水。）</span></p>

      <div class="ps-table">
        <div class="ps-row ps-row-head">
          <span class="ps-cell ps-cell-form">形式</span>
          <span class="ps-cell ps-cell-jp">例</span>
          <span class="ps-cell ps-cell-note">说明</span>
        </div>
        <div v-for="f in verbForms" :key="f.form" class="ps-row">
          <span class="ps-cell ps-cell-form">{{ f.form }}</span>
          <span class="ps-cell ps-cell-jp">{{ f.jp }}</span>
          <span class="ps-cell ps-cell-note">{{ f.note }}</span>
        </div>
      </div>
    </div>

    <!-- ② 形容词谓语句 -->
    <div class="ps-card">
      <h3 class="ps-title"><span class="ps-num">②</span>形容词谓语句<span class="ps-jp">形容詞述語文</span></h3>
      <p class="ps-desc">谓语是<b>形容词</b>，描述性质、状态。分<b>一类（い）</b>和<b>二类（な）</b>两种。</p>

      <div class="ps-sub">
        <h4 class="ps-sub-title"><span class="ps-sub-tag">A1</span>一类形容词（い 形容词）</h4>
        <p class="ps-desc">例：<b class="ps-keyword">おいしい</b>（好吃）</p>
        <div class="ps-table">
          <div class="ps-row ps-row-head">
            <span class="ps-cell ps-cell-form">形式</span>
            <span class="ps-cell ps-cell-jp">例</span>
            <span class="ps-cell ps-cell-note">说明</span>
          </div>
          <div v-for="f in adjIForms" :key="f.form" class="ps-row">
            <span class="ps-cell ps-cell-form">{{ f.form }}</span>
            <span class="ps-cell ps-cell-jp">{{ f.jp }}</span>
            <span class="ps-cell ps-cell-note">{{ f.note }}</span>
          </div>
        </div>
      </div>

      <div class="ps-sub">
        <h4 class="ps-sub-title"><span class="ps-sub-tag">A2</span>二类形容词（な 形容词）</h4>
        <p class="ps-desc">例：<b class="ps-keyword">きれい</b>（漂亮）</p>
        <div class="ps-table">
          <div class="ps-row ps-row-head">
            <span class="ps-cell ps-cell-form">形式</span>
            <span class="ps-cell ps-cell-jp">例</span>
            <span class="ps-cell ps-cell-note">说明</span>
          </div>
          <div v-for="f in adjNaForms" :key="f.form" class="ps-row">
            <span class="ps-cell ps-cell-form">{{ f.form }}</span>
            <span class="ps-cell ps-cell-jp">{{ f.jp }}</span>
            <span class="ps-cell ps-cell-note">{{ f.note }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ③ 名词谓语句 -->
    <div class="ps-card">
      <h3 class="ps-title"><span class="ps-num">③</span>名词谓语句<span class="ps-jp">名詞述語文</span></h3>
      <p class="ps-desc">谓语是<b>名词</b>，表示判断「A 是 B」。接续看<b>だ / です</b>怎么变。</p>

      <div class="ps-formula">
        <span class="ps-chip"><span class="ps-chip-t">主题</span><b class="ps-p">は</b></span>
        <span class="ps-plus">＋</span>
        <span class="ps-chip ps-chip-core"><span class="ps-chip-t">名词</span><b class="ps-p">だ / です</b></span>
      </div>
      <p class="ps-example">例：私は学生です。<span class="ps-example-cn">（我是学生。）</span></p>

      <div class="ps-table">
        <div class="ps-row ps-row-head">
          <span class="ps-cell ps-cell-form">形式</span>
          <span class="ps-cell ps-cell-jp">例</span>
          <span class="ps-cell ps-cell-note">说明</span>
        </div>
        <div v-for="f in nounForms" :key="f.form" class="ps-row">
          <span class="ps-cell ps-cell-form">{{ f.form }}</span>
          <span class="ps-cell ps-cell-jp">{{ f.jp }}</span>
          <span class="ps-cell ps-cell-note">{{ f.note }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface FormRow {
  form: string;
  jp: string;
  note: string;
}

const verbForms: FormRow[] = [
  { form: "简体（辞书形）", jp: "食べる", note: "词典原形，现在 / 将来" },
  { form: "简体过去（た形）", jp: "食べた・行った", note: "く→いた、む→んだ…" },
  { form: "敬体（ます形）", jp: "食べます", note: "动词去る＋ます" },
  { form: "敬体否定", jp: "食べません", note: "ます→ません" },
  { form: "敬体过去", jp: "食べました", note: "ます→ました" },
];

const adjIForms: FormRow[] = [
  { form: "修饰名词", jp: "おいしいパン", note: "直接接名词" },
  { form: "简体肯定", jp: "パンはおいしい", note: "以 い 结尾" },
  { form: "简体否定", jp: "パンはおいしくない", note: "い→く＋ない" },
  { form: "敬体肯定", jp: "パンはおいしいです", note: "＋です" },
  { form: "敬体否定", jp: "パンはおいしくないです", note: "＋ないです" },
  { form: "敬体过去", jp: "パンはおいしかったです", note: "い→かった" },
  { form: "副词化", jp: "早く起きる", note: "い→く＋动词" },
];

const adjNaForms: FormRow[] = [
  { form: "修饰名词", jp: "きれいな写真", note: "＋な接名词" },
  { form: "简体肯定", jp: "公園はきれいだ", note: "＋だ" },
  { form: "简体否定", jp: "公園はきれいではない", note: "＋ではない" },
  { form: "敬体肯定", jp: "公園はきれいです", note: "＋です" },
  { form: "敬体否定", jp: "公園はきれいではありません", note: "＋ではありません" },
  { form: "敬体过去", jp: "公園はきれいでした", note: "＋でした" },
  { form: "副词化", jp: "静かに歩く", note: "な→に＋动词" },
];

const nounForms: FormRow[] = [
  { form: "简体肯定", jp: "私は学生だ", note: "＋だ" },
  { form: "简体否定", jp: "私は学生ではない", note: "＋ではない" },
  { form: "简体过去", jp: "私は学生だった", note: "だ→だった" },
  { form: "敬体肯定", jp: "私は学生です", note: "＋です" },
  { form: "敬体否定", jp: "私は学生ではありません", note: "＋ではありません" },
  { form: "敬体过去", jp: "私は学生でした", note: "です→でした" },
];
</script>

<style scoped>
.ps {
  color: #075985;
}

.ps-intro {
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.8;
  color: #5b7a8c;
}

.ps-intro strong {
  color: #0284c7;
  font-weight: 700;
}

/* 卡片 */
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
  gap: 10px;
  font-size: 18px;
  color: #075985;
  font-weight: 700;
  margin: 0 0 8px;
}

.ps-num {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985;
  border-radius: 9px;
  font-size: 16px;
  font-weight: 700;
}

.ps-jp {
  font-size: 12px;
  color: #7dd3fc;
  font-weight: 600;
  font-family: "Noto Sans JP", sans-serif;
}

.ps-desc {
  margin: 0 0 14px;
  font-size: 14px;
  line-height: 1.7;
  color: #5b7a8c;
}

.ps-desc b {
  color: #0284c7;
  font-weight: 700;
}

.ps-keyword {
  color: #0284c7;
  font-weight: 700;
  font-family: "Noto Sans JP", sans-serif;
}

/* 结构公式 */
.ps-formula {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
  background: linear-gradient(135deg, #f5fbff 0%, #e8f6ff 100%);
  border: 1px solid #e0f2fe;
  border-radius: 12px;
  margin-bottom: 10px;
}

.ps-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 14px;
  background: #ffffff;
  border: 2px solid #bae6fd;
  border-radius: 10px;
}

.ps-chip-core {
  border-color: #38bdf8;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
}

.ps-chip-t {
  font-size: 12px;
  color: #7dd3fc;
  font-weight: 600;
}

.ps-chip-core .ps-chip-t {
  color: #0369a1;
}

.ps-p {
  font-size: 16px;
  color: #0284c7;
  font-weight: 700;
  font-family: "Noto Sans JP", sans-serif;
  line-height: 1;
}

.ps-plus {
  color: #bae6fd;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

.ps-example {
  margin: 0 0 16px;
  font-size: 14px;
  color: #0369a1;
  line-height: 1.7;
}

.ps-example-cn {
  color: #7dd3fc;
}

/* 形式表 */
.ps-table {
  display: flex;
  flex-direction: column;
  border: 1px solid #e8f6ff;
  border-radius: 10px;
  overflow: hidden;
}

.ps-row {
  display: grid;
  grid-template-columns: 140px 1fr 1.2fr;
  align-items: center;
  border-top: 1px solid #e8f6ff;
}

.ps-row:first-of-type {
  border-top: none;
}

.ps-row-head {
  background: #f5fbff;
}

.ps-cell {
  padding: 9px 14px;
  font-size: 13px;
  line-height: 1.6;
}

.ps-cell-form {
  color: #0369a1;
  font-weight: 600;
  border-right: 1px solid #e8f6ff;
}

.ps-cell-jp {
  color: #075985;
  font-weight: 600;
  font-family: "Noto Sans JP", sans-serif;
  border-right: 1px solid #e8f6ff;
  word-break: break-all;
}

.ps-cell-note {
  color: #5b7a8c;
}

.ps-row-head .ps-cell {
  color: #7dd3fc;
  font-weight: 700;
  font-size: 12px;
}

/* 子标题（形容词两大类） */
.ps-sub {
  margin-top: 16px;
}

.ps-sub + .ps-sub {
  margin-top: 20px;
}

.ps-sub-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #0369a1;
  font-weight: 700;
  margin: 0 0 6px;
}

.ps-sub-tag {
  flex-shrink: 0;
  min-width: 34px;
  text-align: center;
  padding: 3px 8px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
}

@media (max-width: 768px) {
  .ps-card {
    padding: 18px;
  }

  .ps-row {
    grid-template-columns: 100px 1fr;
  }

  .ps-cell-note {
    grid-column: 1 / -1;
    border-top: 1px dashed #e8f6ff;
    color: #7dd3fc;
  }

  .ps-cell-jp {
    border-right: none;
  }

  .ps-formula {
    padding: 12px;
  }
}
</style>
