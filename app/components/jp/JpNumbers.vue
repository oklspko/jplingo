<template>
  <div class="jn">
    <p class="jn-intro">
      数词分三类：<b>基数词</b>（表数量）、<b>序数词</b>（表顺序）、<b>助数词</b>（即量词）。
      基数词一般要借助<b>助数词</b>才能准确表达事物的数量，二者连读时读音会发生变化（促音、浊音）。
    </p>

    <!-- 一、基数词 -->
    <section class="jn-block">
      <h3 class="jn-block-title"><span class="jn-num">1</span>基数词</h3>
      <p class="jn-block-intro">单纯用以计数的数词，表示事物的具体数量。十一以下的基数词有<b>音读</b>和<b>训读</b>两种，十一以上采取音读。</p>

      <h4 class="jn-sub-title">① 十一以下的训读</h4>
      <p class="jn-kun-readings">
        <span v-for="w in kunWords" :key="w" class="jn-kun-chip">{{ w }}</span>
      </p>

      <h4 class="jn-sub-title">② 一百以内的数字音读</h4>
      <div class="jn-grid jn-grid--3">
        <div v-for="r in kazu100" :key="r[0]" class="jn-grid-item">
          <span class="jn-num-ar">{{ r[0] }}</span>
          <span class="jn-reading">{{ r[1] }}</span>
        </div>
      </div>

      <h4 class="jn-sub-title">③ 一百以上的数字音读</h4>
      <div class="jn-grid jn-grid--3">
        <div v-for="r in kazuLarge" :key="r[0]" class="jn-grid-item">
          <span class="jn-num-ar">{{ r[0] }}</span>
          <span class="jn-reading">{{ r[1] }}</span>
        </div>
      </div>

      <h4 class="jn-sub-title">④ 特殊读法</h4>
      <div class="jn-grid jn-grid--3">
        <div v-for="r in kazuSpecial" :key="r[0]" class="jn-grid-item">
          <span class="jn-num-ar">{{ r[0] }}</span>
          <span class="jn-reading">{{ r[1] }}</span>
        </div>
      </div>
    </section>

    <!-- 二、序数词 -->
    <section class="jn-block">
      <h3 class="jn-block-title"><span class="jn-num">2</span>序数词</h3>
      <p class="jn-block-intro">
        序数词表示事物的顺序。一般由基数词前加接头词<b>「第」</b>，或其后加接尾词<b>「番」「目」</b>等构成。
      </p>

      <div class="jn-table-scroll">
        <div class="jn-table jn-table--ordinal">
          <div class="jn-row jn-row-head">
            <span class="jn-cell">构成方式</span>
            <span class="jn-cell">例</span>
            <span class="jn-cell">读音</span>
            <span class="jn-cell">意思</span>
          </div>
          <div v-for="r in ordinalRows" :key="r[1]" class="jn-row">
            <span class="jn-cell jn-cell-key">{{ r[0] }}</span>
            <span class="jn-cell">{{ r[1] }}</span>
            <span class="jn-cell jn-reading">{{ r[2] }}</span>
            <span class="jn-cell">{{ r[3] }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 三、常用助数词 -->
    <section class="jn-block">
      <h3 class="jn-block-title"><span class="jn-num">3</span>常用助数词</h3>
      <p class="jn-block-intro">助数词是表示事物计量名称的数词，也就是中文通常所说的<b>量词</b>。基数词一般借助助数词才能准确地表达事物的数量。</p>

      <h4 class="jn-sub-title">① 基数词与助数词结合的读法</h4>
      <div class="jn-table-scroll">
        <div class="jn-table jn-table--counter">
          <div class="jn-row jn-row-head">
            <span class="jn-cell">数</span>
            <span class="jn-cell">個<span class="jn-cell-sub">圆的、小的东西</span></span>
            <span class="jn-cell">枚<span class="jn-cell-sub">薄片：纸、碟等</span></span>
            <span class="jn-cell">本<span class="jn-cell-sub">细长：笔、伞等</span></span>
            <span class="jn-cell">冊<span class="jn-cell-sub">书本、笔记本</span></span>
            <span class="jn-cell">匹<span class="jn-cell-sub">小动物</span></span>
            <span class="jn-cell">円<span class="jn-cell-sub">金额</span></span>
            <span class="jn-cell">歳<span class="jn-cell-sub">年龄</span></span>
            <span class="jn-cell">番<span class="jn-cell-sub">序号</span></span>
          </div>
          <div v-for="row in counterRows" :key="row[0]" class="jn-row">
            <span class="jn-cell jn-cell-key">{{ row[0] }}</span>
            <span v-for="(c, i) in row.slice(1)" :key="i" class="jn-cell jn-reading">{{ c }}</span>
          </div>
        </div>
      </div>

      <h4 class="jn-sub-title">② 常用助数词表</h4>
      <div class="jn-counter-list">
        <div v-for="c in counterList" :key="c.kanji" class="jn-counter-item">
          <span class="jn-counter-kanji">{{ c.kanji }}</span>
          <span class="jn-counter-meaning">{{ c.meaning }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const kunWords = ["一つ", "二つ", "三つ", "四つ", "五つ", "六つ", "七つ", "八つ", "九つ", "十"];

const kazu100: [string, string][] = [
  ["0", "れい・ぜろ"], ["1", "いち"], ["2", "に"], ["3", "さん"], ["4", "し・よん"],
  ["5", "ご"], ["6", "ろく"], ["7", "し・なな"], ["8", "はち"], ["9", "く・きゅう"],
  ["10", "じゅう"], ["11", "じゅういち"], ["12", "じゅうに"], ["13", "じゅうさん"], ["14", "じゅうよん"],
  ["15", "じゅうご"], ["16", "じゅうろく"], ["17", "じゅうし・なな"], ["18", "じゅうはち"], ["19", "じゅうく・きゅう"],
  ["20", "にじゅう"], ["30", "さんじゅう"], ["40", "よんじゅう"], ["50", "ごじゅう"], ["60", "ろくじゅう"],
  ["70", "ななじゅう"], ["80", "はちじゅう"], ["90", "きゅうじゅう"], ["100", "ひゃく"],
];

const kazuLarge: [string, string][] = [
  ["101", "ひゃくいち"], ["200", "にひゃく"], ["300", "さんびゃく"], ["400", "よんひゃく"],
  ["500", "ごひゃく"], ["600", "ろっぴゃく"], ["700", "ななひゃく"], ["800", "はっぴゃく"], ["900", "きゅうひゃく"],
  ["1,000", "せん"], ["2,000", "にせん"], ["3,000", "さんぜん"], ["4,000", "よんぜん"], ["5,000", "ごせん"],
  ["6,000", "ろくぜん"], ["7,000", "ななぜん"], ["8,000", "はっせん"], ["9,000", "きゅうせん"],
  ["10,000", "いちまん"], ["100,000", "じゅうまん"], ["1,000,000", "ひゃくまん"],
  ["10,000,000", "いっせんまん"], ["100,000,000", "いちおく"],
];

const kazuSpecial: [string, string][] = [
  ["0.1", "れいてんいち"], ["2/3", "さんぶんのに"], ["4%", "よんパーセント"], ["100%", "ひゃくパーセント"],
  ["1,050", "せんごじゅう"], ["2,005", "にせんご"], ["2,055", "にせんごじゅうご"], ["2,500", "にせんごひゃく"],
];

const ordinalRows: [string, string, string, string][] = [
  ["第＋基数（音读）", "第一", "だいいち", "第一"],
  ["第＋基数（音读）", "第二", "だいに", "第二"],
  ["第＋基数（音读）", "第三", "だいさん", "第三"],
  ["第＋基数（音读）", "第五課", "だいごか", "第5课"],
  ["第＋基数（音读）", "第三回", "だいさんかい", "第3次"],
  ["基数＋番", "1番", "いちばん", "1号"],
  ["基数＋番", "2番", "にばん", "2号"],
  ["基数＋目", "一つ目", "ひとつめ", "第一个"],
  ["基数＋目", "第五行目", "だいごぎょうめ", "第5行"],
];

const counterRows: string[][] = [
  ["何", "なんこ", "なんまい", "なんほん", "なんさつ", "なんびき", "なんえん／いくら", "なんさい／いくつ", "なんばん"],
  ["1", "いっこ", "いちまい", "いちほん", "いっさつ", "いっびき", "いちえん", "いっさい", "いちばん"],
  ["2", "にこ", "にまい", "にほん", "にさつ", "にひき", "にえん", "にさい", "にばん"],
  ["3", "さんこ", "さんまい", "さんほん", "さんさつ", "さんびき", "さんえん", "さんさい", "さんばん"],
  ["4", "よんこ", "よんまい", "よんほん", "よんさつ", "よんひき", "よえん", "よんさい", "よんばん"],
  ["5", "ごこ", "ごまい", "ごほん", "ごさつ", "ごひき", "ごえん", "ごさい", "ごばん"],
  ["6", "ろっこ", "ろくまい", "ろくほん", "ろくさつ", "ろっぴき", "ろくえん", "ろくさい", "ろくばん"],
  ["7", "ななこ", "ななまい", "ななほん", "ななさつ", "ななひき", "ななえん", "ななさい", "ななばん"],
  ["8", "はっこ", "はちまい", "はっぽん", "はっさつ", "はっぴき", "はちえん", "はっさい", "はちばん"],
  ["9", "きゅうこ", "きゅうまい", "きゅうほん", "きゅうさつ", "きゅうひき", "きゅうえん", "きゅうさい", "きゅうばん"],
  ["10", "じゅうこ", "じゅうまい", "じゅうほん", "じゅうさつ", "じゅうびき", "じゅうえん", "じゅうさい", "じゅうばん"],
];

const counterList = [
  { kanji: "課", meaning: "课、科——课程、行政科室" },
  { kanji: "階", meaning: "层——楼房层数" },
  { kanji: "回", meaning: "回、次——次数、顺序" },
  { kanji: "級", meaning: "级——级别、等级" },
  { kanji: "個", meaning: "个——方的、圆的等成形物品" },
  { kanji: "冊", meaning: "册、本——书籍或成册纸制品" },
  { kanji: "章", meaning: "章——文章章节" },
  { kanji: "重", meaning: "层、重——重叠数量" },
  { kanji: "畳", meaning: "张、块——日本席子，表房间面积" },
  { kanji: "世帯", meaning: "户——家庭、家族" },
  { kanji: "足", meaning: "双、对——成双物品，如手套、鞋袜" },
  { kanji: "台", meaning: "台、辆、架——机器、车辆等" },
  { kanji: "通", meaning: "封、件——信函、文书" },
  { kanji: "人", meaning: "人——人数" },
  { kanji: "杯", meaning: "杯、碗——杯碗等器皿" },
  { kanji: "箱", meaning: "箱——成箱的东西" },
  { kanji: "番", meaning: "第……、……号——顺序、序列" },
  { kanji: "番地", meaning: "……号——街道编号、地址编码" },
  { kanji: "番号", meaning: "第……个——序数号" },
  { kanji: "匹", meaning: "匹、只——鱼、虫、鸟等小型动物" },
  { kanji: "頁", meaning: "ページ，页——页数" },
  { kanji: "本", meaning: "只、根、条、瓶——细长物品，如笔、树、绳" },
  { kanji: "枚", meaning: "张、片、块、件——薄的扁平物体" },
  { kanji: "目", meaning: "第……——顺序" },
  { kanji: "名", meaning: "名——人数" },
  { kanji: "羽", meaning: "只——鸟类、家禽等" },
];
</script>

<style scoped>
.jn {
  color: #075985;
}

.jn-intro {
  margin: 0 0 28px;
  font-size: 15px;
  line-height: 1.8;
  color: #0369a1;
}

.jn-intro b {
  color: #0284c7;
  font-weight: 700;
}

.jn-block {
  margin-bottom: 40px;
}

.jn-block-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 22px;
  color: #075985;
  font-weight: 700;
  margin: 0 0 16px;
}

.jn-num {
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

.jn-block-intro {
  font-size: 14px;
  color: #5b7a8c;
  margin: 0 0 16px;
  line-height: 1.7;
}

.jn-block-intro b {
  color: #0284c7;
}

.jn-sub-title {
  font-size: 16px;
  color: #0369a1;
  font-weight: 700;
  margin: 20px 0 12px;
}

/* 训读 chips */
.jn-kun-readings {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
}

.jn-kun-chip {
  padding: 6px 14px;
  background: #ffffff;
  border: 1px solid #e0f2fe;
  border-radius: 999px;
  font-size: 15px;
  color: #0284c7;
  font-weight: 600;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

/* 数字网格 */
.jn-grid {
  display: grid;
  gap: 8px;
}

.jn-grid--3 {
  grid-template-columns: repeat(3, 1fr);
}

.jn-grid-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 14px;
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 10px;
}

.jn-num-ar {
  flex-shrink: 0;
  min-width: 64px;
  font-size: 13px;
  font-weight: 700;
  color: #7dd3fc;
  font-family: ui-monospace, "SF Mono", "Consolas", monospace;
}

.jn-reading {
  font-size: 14px;
  color: #0284c7;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

/* 表格 */
.jn-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  margin-bottom: 14px;
}

.jn-table {
  display: flex;
  flex-direction: column;
  border: 1px solid #e8f6ff;
  border-radius: 10px;
  overflow: hidden;
  min-width: 520px;
}

.jn-table--counter {
  min-width: 720px;
}

.jn-row {
  display: grid;
  align-items: stretch;
  border-top: 1px solid #e8f6ff;
}

.jn-row:first-of-type {
  border-top: none;
}

.jn-table--ordinal .jn-row {
  grid-template-columns: 150px 110px 1fr 1fr;
}

.jn-table--counter .jn-row {
  grid-template-columns: 52px repeat(8, 1fr);
}

.jn-row-head {
  background: #f5fbff;
}

.jn-cell {
  padding: 9px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #075985;
  border-right: 1px solid #e8f6ff;
  word-break: break-all;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.jn-cell:last-child {
  border-right: none;
}

.jn-row-head .jn-cell {
  color: #7dd3fc;
  font-weight: 700;
  font-size: 12px;
}

.jn-cell-key {
  font-weight: 700;
  color: #0369a1;
}

.jn-reading.jn-cell {
  color: #0284c7;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.jn-cell-sub {
  font-size: 11px;
  font-weight: 400;
  color: #bae6fd;
}

/* 助数词总表 */
.jn-counter-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.jn-counter-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 10px;
}

.jn-counter-kanji {
  flex-shrink: 0;
  min-width: 40px;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: #0284c7;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.jn-counter-meaning {
  font-size: 12px;
  color: #5b7a8c;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .jn-intro {
    font-size: 14px;
  }

  .jn-block {
    margin-bottom: 32px;
  }

  .jn-block-title {
    font-size: 19px;
  }

  .jn-grid--3 {
    grid-template-columns: repeat(2, 1fr);
  }

  .jn-cell {
    padding: 8px 10px;
    font-size: 12px;
  }

  .jn-counter-list {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
