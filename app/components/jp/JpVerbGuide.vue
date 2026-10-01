<template>
  <div class="vg">
    <p class="vg-intro">
      动词是句子的核心。按<b>活用方式</b>分三类（词表里用 <b>一 / 二 / 三</b> 标记）；按<b>是否带宾语</b>分自动词 / 他动词（词表里用 <b>自 / 他</b> 标记）。
    </p>

    <!-- 一、动词分类 -->
    <section class="vg-block">
      <h3 class="vg-block-title"><span class="vg-num">1</span>动词分类</h3>

      <h4 class="vg-sub-title">按活用方式（三类）</h4>
      <div class="vg-classes">
        <div class="vg-class">
          <div class="vg-class-name">一类动词（五段动词）</div>
          <p class="vg-class-desc">词尾在 <b>う段</b>；ます形去ます后末尾落在 <b>い段</b>。<span class="vg-ex">書く→書き・飲む→飲み・話す→話し</span></p>
        </div>
        <div class="vg-class">
          <div class="vg-class-name">二类动词（一段动词）</div>
          <p class="vg-class-desc">词尾是 <b>る</b>，且 る 前一个音在 <b>い段</b>（上一段）或 <b>え段</b>（下一段）。<span class="vg-ex">見る・食べる</span></p>
        </div>
        <div class="vg-class">
          <div class="vg-class-name">三类动词（サ変・カ変）</div>
          <p class="vg-class-desc"><b>する</b>、<b>来る</b>，以及「名词＋する」。<span class="vg-ex">勉強する・来る</span></p>
        </div>
      </div>

      <h4 class="vg-sub-title">按及物性（自动词 / 他动词）</h4>
      <div class="vg-classes vg-classes--2">
        <div class="vg-class">
          <div class="vg-class-name">自动词（自）</div>
          <p class="vg-class-desc">不带宾语：<b>主语 ＋ が ＋ 自动词</b>。<span class="vg-ex">ドアが開く</span></p>
        </div>
        <div class="vg-class">
          <div class="vg-class-name">他动词（他）</div>
          <p class="vg-class-desc">带宾语：<b>宾语 ＋ を ＋ 他动词</b>。<span class="vg-ex">ドアを開ける</span></p>
        </div>
      </div>
      <p class="vg-note">📌 有的动词自他两用，如 <b>開く</b>。词表里的 <b>自一 / 他二 / 自他三</b>，正是「自他 ＋ 一/二/三类」的组合。</p>
    </section>

    <!-- 二、动词变形 -->
    <section class="vg-block">
      <h3 class="vg-block-title"><span class="vg-num">2</span>动词变形（活用）</h3>
      <p class="vg-block-intro">示例动词：<b>書く</b>（一类）· <b>食べる</b>（二类）· <b>する / 来る</b>（三类）。</p>

      <h4 class="vg-sub-title">基础变形</h4>
      <div class="vg-table-scroll">
        <div class="vg-table">
          <div class="vg-row vg-row-head">
            <span class="vg-cell">变形形式</span>
            <span class="vg-cell">一类（五段）</span>
            <span class="vg-cell">二类（一段）</span>
            <span class="vg-cell">三类（サ変・カ変）</span>
          </div>
          <div v-for="f in basicForms" :key="f.name" class="vg-row">
            <span class="vg-cell vg-cell-key">{{ f.name }}</span>
            <span class="vg-cell">{{ f.c1 }}</span>
            <span class="vg-cell">{{ f.c2 }}</span>
            <span class="vg-cell">{{ f.c3 }}</span>
          </div>
        </div>
      </div>

      <h4 class="vg-sub-title">进阶变形</h4>
      <div class="vg-table-scroll">
        <div class="vg-table">
          <div class="vg-row vg-row-head">
            <span class="vg-cell">变形形式</span>
            <span class="vg-cell">一类（五段）</span>
            <span class="vg-cell">二类（一段）</span>
            <span class="vg-cell">三类（サ変・カ変）</span>
          </div>
          <div v-for="f in advancedForms" :key="f.name" class="vg-row">
            <span class="vg-cell vg-cell-key">{{ f.name }}</span>
            <span class="vg-cell">{{ f.c1 }}</span>
            <span class="vg-cell">{{ f.c2 }}</span>
            <span class="vg-cell">{{ f.c3 }}</span>
          </div>
        </div>
      </div>

      <!-- 来る 的读音会变（只保留注音提醒，不铺长表格） -->
      <div class="vg-pattern">
        <h4 class="vg-sub-title">📌 特别提醒：「来る」变形后读音会变</h4>
        <p class="vg-block-intro">
          同一个「来」在不同变形里读 <b>き / こ / く</b>，所以要连假名一起记：
        </p>
        <p class="vg-kuru-kana">
          来ます＝<b>きます</b>　来ない＝<b>こない</b>　来て＝<b>きて</b>　来た＝<b>きた</b>　来れば＝<b>くれば</b>　
          来よう＝<b>こよう</b>　来られる＝<b>こられる</b>　来させる＝<b>こさせる</b>　来い＝<b>こい</b>
        </p>
        <p class="vg-block-intro">对比：「する」的读音不变（します／しない／すれば…）。</p>
      </div>

      <!-- て形/た形 音便 -->
      <div class="vg-onbin">
        <h4 class="vg-sub-title">📌 一类动词 て形 / た形 音便速查</h4>
        <div class="vg-table-scroll">
          <div class="vg-table vg-table--3">
            <div class="vg-row vg-row-head">
              <span class="vg-cell">词尾</span>
              <span class="vg-cell">て形 / た形</span>
              <span class="vg-cell">例</span>
            </div>
            <div v-for="r in onbinRows" :key="r.tail" class="vg-row">
              <span class="vg-cell vg-cell-key">{{ r.tail }}</span>
              <span class="vg-cell">{{ r.form }}</span>
              <span class="vg-cell">{{ r.example }}</span>
            </div>
          </div>
        </div>
        <p class="vg-note">特殊：<b>行く → 行って</b>（いって，唯一不规则）。た形 只是把 て→た、で→だ（例：書く→書いた）。</p>
      </div>

      <!-- 名词·形容词的て形 -->
      <div class="vg-onbin">
        <h4 class="vg-sub-title">📌 名词・形容词的て形（で形）</h4>
        <p class="vg-block-intro">「て形」不只是动词有：名词和二类形容词用 <b>で形</b>（即 だ→で），一类形容词把词尾 <b>い → く＋て</b>。用途与动词て形一致——并列、中顿、原因。</p>
        <div class="vg-table-scroll">
          <div class="vg-table vg-table--3">
            <div class="vg-row vg-row-head">
              <span class="vg-cell">词类</span>
              <span class="vg-cell">变形规则</span>
              <span class="vg-cell">例</span>
            </div>
            <div v-for="r in teFormRows" :key="r.type" class="vg-row">
              <span class="vg-cell vg-cell-key">{{ r.type }}</span>
              <span class="vg-cell">{{ r.rule }}</span>
              <span class="vg-cell">{{ r.example }}</span>
            </div>
          </div>
        </div>
        <p class="vg-note">例：<b>安くて</b>おいしい（又便宜又好吃）・<b>きれいで</b>静かだ（又漂亮又安静）・<b>学生で</b>、二十歳です（是学生，二十岁）。</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
interface VerbForm {
  name: string;
  c1: string;
  c2: string;
  c3: string;
}

// 「来る」的读音会随变形改变（き／こ／く），所以每个形式都标上假名读音
const bundledbasicForms: VerbForm[] = [
  { name: "辞书形（原形）", c1: "～う（書く）", c2: "～る（食べる）", c3: "する／来る（くる）" },
  { name: "ます形", c1: "う段→い段＋ます（書く→書きます）", c2: "去る＋ます（食べる→食べます）", c3: "する→します／来る→来ます（きます）" },
  { name: "ない形", c1: "う段→あ段＋ない（書く→書かない；買う→買わない）", c2: "去る＋ない（食べる→食べない）", c3: "する→しない／来る→来ない（こない）" },
  { name: "て形", c1: "音便（见下表）", c2: "去る＋て（食べる→食べて）", c3: "する→して／来る→来て（きて）" },
  { name: "た形", c1: "音便，て→た・で→だ（書く→書いた）", c2: "去る＋た（食べる→食べた）", c3: "する→した／来る→来た（きた）" },
  { name: "ば形（假定形）", c1: "う段→え段＋ば（書く→書けば）", c2: "去る＋れば（食べる→食べれば）", c3: "する→すれば／来る→来れば（くれば）" },
  { name: "意志形（う/よう形）", c1: "う段→お段＋う（書く→書こう）", c2: "去る＋よう（食べる→食べよう）", c3: "する→しよう／来る→来よう（こよう）" },
];

const bundledadvancedForms: VerbForm[] = [
  { name: "可能形", c1: "う段→え段＋る（書く→書ける）", c2: "去る＋られる（食べる→食べられる）", c3: "する→できる／来る→来られる（こられる）" },
  { name: "被动形（受身形）", c1: "う段→あ段＋れる（書く→書かれる；買う→買われる）", c2: "去る＋られる（食べる→食べられる）", c3: "する→される／来る→来られる（こられる）" },
  { name: "使役形", c1: "う段→あ段＋せる（書く→書かせる）", c2: "去る＋させる（食べる→食べさせる）", c3: "する→させる／来る→来させる（こさせる）" },
  { name: "命令形", c1: "う段→え段（書く→書け）", c2: "去る＋ろ（食べる→食べろ）", c3: "する→しろ／来る→来い（こい）" },
];

const bundledonbinRows = [
  { tail: "く", form: "いて", example: "書く → 書いて" },
  { tail: "ぐ", form: "いで", example: "泳ぐ → 泳いで" },
  { tail: "す", form: "して", example: "話す → 話して" },
  { tail: "う・つ・る", form: "って", example: "買う → 買って" },
  { tail: "ぬ・ぶ・む", form: "んで", example: "読む → 読んで" },
];

const bundledteFormRows = [
  { type: "一类形容词（い形）", rule: "い → く ＋ て", example: "高い → 高くて" },
  { type: "二类形容词（な形）", rule: "＋ で", example: "きれい → きれいで" },
  { type: "名词", rule: "＋ で", example: "学生 → 学生で" },
];

// ===== 语法页内容可热更新：远端 JSON 优先，缺失/未加载时用内置默认（模板无需改动）=====
const grammarContent = useJpGrammarContent();
const basicForms = computed(() => (grammarContent.value?.verbGuide as Record<string, unknown>)?.basicForms ?? bundledbasicForms);
const advancedForms = computed(() => (grammarContent.value?.verbGuide as Record<string, unknown>)?.advancedForms ?? bundledadvancedForms);
const onbinRows = computed(() => (grammarContent.value?.verbGuide as Record<string, unknown>)?.onbinRows ?? bundledonbinRows);
const teFormRows = computed(() => (grammarContent.value?.verbGuide as Record<string, unknown>)?.teFormRows ?? bundledteFormRows);
</script>

<style scoped>
.vg {
  color: #075985;
}

.vg-intro {
  margin: 0 0 28px;
  font-size: 15px;
  line-height: 1.8;
  color: #0369a1;
}

.vg-intro b {
  color: #0284c7;
  font-weight: 700;
}

/* ===== 区块 ===== */
.vg-block {
  margin-bottom: 40px;
}

.vg-block-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 22px;
  color: #075985;
  font-weight: 700;
  margin: 0 0 18px;
}

.vg-num {
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

.vg-sub-title {
  font-size: 16px;
  color: #0369a1;
  font-weight: 700;
  margin: 0 0 12px;
}

.vg-block-intro {
  font-size: 14px;
  color: #5b7a8c;
  margin: 0 0 16px;
  line-height: 1.7;
}

.vg-block-intro b {
  color: #0284c7;
}

/* ===== 分类卡片 ===== */
.vg-classes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.vg-classes--2 {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.vg-class {
  padding: 16px 18px;
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.12);
}

.vg-class-name {
  font-size: 15px;
  font-weight: 700;
  color: #075985;
  margin-bottom: 6px;
}

.vg-class-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: #0369a1;
}

.vg-class-desc b {
  color: #0284c7;
}

.vg-ex {
  display: block;
  margin-top: 4px;
  color: #5b7a8c;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Hiragino Sans GB", "Noto Sans JP", sans-serif;
}

/* ===== 变形表格 ===== */
.vg-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  margin-bottom: 14px;
}

.vg-table {
  display: flex;
  flex-direction: column;
  border: 1px solid #e8f6ff;
  border-radius: 10px;
  overflow: hidden;
  min-width: 620px;
}

.vg-table--3 {
  min-width: 460px;
}

/* 特别提醒块（「来る」读音会变） */
.vg-pattern {
  margin-top: 28px;
  padding: 16px 18px 6px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 14px;
}

.vg-pattern .vg-sub-title {
  margin-top: 0;
  color: #b45309;
}

/* 「来る」的注音提醒：一行紧凑列出 */
.vg-kuru-kana {
  margin: 0 0 8px;
  padding: 10px 12px;
  background: #ffffff;
  border-radius: 10px;
  font-size: 14px;
  line-height: 2;
  color: #92400e;
}

.vg-kuru-kana b {
  color: #b45309;
  font-weight: 700;
}

.vg-row {
  display: grid;
  align-items: stretch;
  border-top: 1px solid #e8f6ff;
  grid-template-columns: 120px 1fr 1fr 1fr;
}

.vg-table--3 .vg-row {
  grid-template-columns: 110px 130px 1fr;
}

.vg-row:first-of-type {
  border-top: none;
}

.vg-row-head {
  background: #f5fbff;
}

.vg-cell {
  padding: 9px 14px;
  font-size: 13px;
  line-height: 1.7;
  color: #075985;
  border-right: 1px solid #e8f6ff;
  word-break: break-all;
}

.vg-cell:last-child {
  border-right: none;
}

.vg-row-head .vg-cell {
  color: #7dd3fc;
  font-weight: 700;
  font-size: 12px;
  line-height: 1.5;
}

.vg-cell-key {
  font-weight: 700;
  color: #0369a1;
}

/* ===== 备注 ===== */
.vg-note {
  margin: 0;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f5fbff 0%, #e8f6ff 100%);
  border: 1px solid #e0f2fe;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.7;
  color: #0369a1;
}

.vg-note b {
  color: #0284c7;
  font-weight: 700;
}

@media (max-width: 768px) {
  .vg-intro {
    font-size: 14px;
  }

  .vg-block {
    margin-bottom: 32px;
  }

  .vg-block-title {
    font-size: 19px;
  }

  .vg-class {
    padding: 14px 16px;
  }

  .vg-cell {
    padding: 8px 10px;
    font-size: 12px;
  }
}
</style>
