<template>
  <section class="kana-chart">
    <div class="kana-chart-head">
      <div class="kana-chart-title-wrap">
        <h2 class="kana-chart-title">🗾 日语输入表</h2>
        <p class="kana-chart-sub">平假名 · 片假名对照，输入罗马字打出对应假名</p>
      </div>
      <button class="kana-toggle" @click="open = !open" :aria-expanded="open">
        {{ open ? "收起" : "展开" }}
      </button>
    </div>

    <transition name="fold">
      <div v-show="open" class="kana-chart-body">
        <section v-for="g in groups" :key="g.title" class="kana-group">
          <h3 class="kana-group-title">{{ g.title }}</h3>
          <div class="kana-scroll">
            <div class="kana-table">
              <div v-for="row in g.rows" :key="row.label" class="kana-row">
                <span class="kana-row-label">{{ row.label }}</span>
                <div v-for="k in row.kana" :key="k.kana" class="kana-cell">
                  <div class="kana-chars">
                    <span class="kana-char">{{ k.kana }}</span>
                    <span class="kana-char kana-char--kata">{{ toKatakana(k.kana) }}</span>
                  </div>
                  <span class="kana-romaji">{{ k.romaji }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="kana-tips">
          <span class="kana-tips-title">💡 输入技巧：</span>
          ん 输入 <b>n</b>（后接元音或な行时用 <b>nn</b>）；っ（促音）双写下一辅音，如 <b>kka</b> → っか；
          し / ち / つ / ふ 也可输入 <b>si / ti / tu / hu</b>；を = <b>wo</b>，ぢ = <b>di</b>，づ = <b>du</b>。
        </div>

        <!-- 片假名测试 -->
        <div class="kana-quiz">
          <div class="kana-quiz-head">
            <h3 class="kana-quiz-title">🎯 片假名测试</h3>
            <p class="kana-quiz-sub">看片假名，输入对应罗马字</p>
          </div>

          <div v-if="!quizStarted && !quizDone" class="kana-quiz-start">
            <button class="kana-quiz-btn primary" @click="startQuiz">开始测试</button>
          </div>

          <div v-else-if="quizDone" class="kana-quiz-done">
            <p class="kana-quiz-done-text">🎉 完成！正确 <b>{{ quizScore }}</b> / {{ quizTotal }}</p>
            <button class="kana-quiz-btn primary" @click="startQuiz">再测一次</button>
          </div>

          <div v-else class="kana-quiz-body">
            <div class="kana-quiz-score">
              第 {{ quizIndex + 1 }} 题 · 正确 {{ quizScore }} / {{ quizTotal }}
            </div>
            <div class="kana-quiz-char">{{ currentKata.kata }}</div>
            <input
              v-model="quizInput"
              class="kana-quiz-input"
              type="text"
              placeholder="输入罗马字，如 ka"
              autocapitalize="off"
              autocorrect="off"
              autocomplete="off"
              spellcheck="false"
              @keydown.enter="onQuizEnter"
            />
            <div class="kana-quiz-actions">
              <button class="kana-quiz-btn primary" @click="checkQuiz">检查</button>
              <button v-if="quizResult" class="kana-quiz-btn" @click="nextQuiz">下一题 →</button>
            </div>
            <div v-if="quizResult" class="kana-quiz-feedback" :class="quizResult">
              <span v-if="quizResult === 'correct'">✅ 正确！</span>
              <span v-else>❌ 正确答案：{{ currentKata.romaji }}</span>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

const open = ref(false);

interface KanaCell {
  kana: string;
  romaji: string;
}

interface KanaRow {
  label: string;
  kana: KanaCell[];
}

const seion: KanaRow[] = [
  { label: "あ", kana: [
    { kana: "あ", romaji: "a" }, { kana: "い", romaji: "i" }, { kana: "う", romaji: "u" }, { kana: "え", romaji: "e" }, { kana: "お", romaji: "o" },
  ]},
  { label: "か", kana: [
    { kana: "か", romaji: "ka" }, { kana: "き", romaji: "ki" }, { kana: "く", romaji: "ku" }, { kana: "け", romaji: "ke" }, { kana: "こ", romaji: "ko" },
  ]},
  { label: "さ", kana: [
    { kana: "さ", romaji: "sa" }, { kana: "し", romaji: "shi" }, { kana: "す", romaji: "su" }, { kana: "せ", romaji: "se" }, { kana: "そ", romaji: "so" },
  ]},
  { label: "た", kana: [
    { kana: "た", romaji: "ta" }, { kana: "ち", romaji: "chi" }, { kana: "つ", romaji: "tsu" }, { kana: "て", romaji: "te" }, { kana: "と", romaji: "to" },
  ]},
  { label: "な", kana: [
    { kana: "な", romaji: "na" }, { kana: "に", romaji: "ni" }, { kana: "ぬ", romaji: "nu" }, { kana: "ね", romaji: "ne" }, { kana: "の", romaji: "no" },
  ]},
  { label: "は", kana: [
    { kana: "は", romaji: "ha" }, { kana: "ひ", romaji: "hi" }, { kana: "ふ", romaji: "fu" }, { kana: "へ", romaji: "he" }, { kana: "ほ", romaji: "ho" },
  ]},
  { label: "ま", kana: [
    { kana: "ま", romaji: "ma" }, { kana: "み", romaji: "mi" }, { kana: "む", romaji: "mu" }, { kana: "め", romaji: "me" }, { kana: "も", romaji: "mo" },
  ]},
  { label: "や", kana: [
    { kana: "や", romaji: "ya" }, { kana: "ゆ", romaji: "yu" }, { kana: "よ", romaji: "yo" },
  ]},
  { label: "ら", kana: [
    { kana: "ら", romaji: "ra" }, { kana: "り", romaji: "ri" }, { kana: "る", romaji: "ru" }, { kana: "れ", romaji: "re" }, { kana: "ろ", romaji: "ro" },
  ]},
  { label: "わ", kana: [
    { kana: "わ", romaji: "wa" }, { kana: "を", romaji: "wo" }, { kana: "ん", romaji: "n" },
  ]},
];

const dakuon: KanaRow[] = [
  { label: "が", kana: [
    { kana: "が", romaji: "ga" }, { kana: "ぎ", romaji: "gi" }, { kana: "ぐ", romaji: "gu" }, { kana: "げ", romaji: "ge" }, { kana: "ご", romaji: "go" },
  ]},
  { label: "ざ", kana: [
    { kana: "ざ", romaji: "za" }, { kana: "じ", romaji: "ji" }, { kana: "ず", romaji: "zu" }, { kana: "ぜ", romaji: "ze" }, { kana: "ぞ", romaji: "zo" },
  ]},
  { label: "だ", kana: [
    { kana: "だ", romaji: "da" }, { kana: "ぢ", romaji: "di" }, { kana: "づ", romaji: "du" }, { kana: "で", romaji: "de" }, { kana: "ど", romaji: "do" },
  ]},
  { label: "ば", kana: [
    { kana: "ば", romaji: "ba" }, { kana: "び", romaji: "bi" }, { kana: "ぶ", romaji: "bu" }, { kana: "べ", romaji: "be" }, { kana: "ぼ", romaji: "bo" },
  ]},
  { label: "ぱ", kana: [
    { kana: "ぱ", romaji: "pa" }, { kana: "ぴ", romaji: "pi" }, { kana: "ぷ", romaji: "pu" }, { kana: "ぺ", romaji: "pe" }, { kana: "ぽ", romaji: "po" },
  ]},
];

const yoon: KanaRow[] = [
  { label: "き", kana: [
    { kana: "きゃ", romaji: "kya" }, { kana: "きゅ", romaji: "kyu" }, { kana: "きょ", romaji: "kyo" },
  ]},
  { label: "し", kana: [
    { kana: "しゃ", romaji: "sha" }, { kana: "しゅ", romaji: "shu" }, { kana: "しょ", romaji: "sho" },
  ]},
  { label: "ち", kana: [
    { kana: "ちゃ", romaji: "cha" }, { kana: "ちゅ", romaji: "chu" }, { kana: "ちょ", romaji: "cho" },
  ]},
  { label: "に", kana: [
    { kana: "にゃ", romaji: "nya" }, { kana: "にゅ", romaji: "nyu" }, { kana: "にょ", romaji: "nyo" },
  ]},
  { label: "ひ", kana: [
    { kana: "ひゃ", romaji: "hya" }, { kana: "ひゅ", romaji: "hyu" }, { kana: "ひょ", romaji: "hyo" },
  ]},
  { label: "み", kana: [
    { kana: "みゃ", romaji: "mya" }, { kana: "みゅ", romaji: "myu" }, { kana: "みょ", romaji: "myo" },
  ]},
  { label: "り", kana: [
    { kana: "りゃ", romaji: "rya" }, { kana: "りゅ", romaji: "ryu" }, { kana: "りょ", romaji: "ryo" },
  ]},
  { label: "ぎ", kana: [
    { kana: "ぎゃ", romaji: "gya" }, { kana: "ぎゅ", romaji: "gyu" }, { kana: "ぎょ", romaji: "gyo" },
  ]},
  { label: "じ", kana: [
    { kana: "じゃ", romaji: "ja" }, { kana: "じゅ", romaji: "ju" }, { kana: "じょ", romaji: "jo" },
  ]},
  { label: "び", kana: [
    { kana: "びゃ", romaji: "bya" }, { kana: "びゅ", romaji: "byu" }, { kana: "びょ", romaji: "byo" },
  ]},
  { label: "ぴ", kana: [
    { kana: "ぴゃ", romaji: "pya" }, { kana: "ぴゅ", romaji: "pyu" }, { kana: "ぴょ", romaji: "pyo" },
  ]},
];

// 平假名 → 片假名（Unicode 一字对应，偏移 0x60）
function toKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

const groups: { title: string; rows: KanaRow[] }[] = [
  { title: "清音", rows: seion },
  { title: "浊音・半浊音", rows: dakuon },
  { title: "拗音", rows: yoon },
];

// ===== 片假名测试 =====
interface KataItem {
  kata: string;
  romaji: string;
}

const allKata: KataItem[] = [...seion, ...dakuon, ...yoon].flatMap((row) =>
  row.kana.map((k) => ({ kata: toKatakana(k.kana), romaji: k.romaji })),
);

// 同一发音可接受的罗马字别名（训令式/ヘボン式与 IME 特殊输入）
const QUIZ_ALIASES: Record<string, string[]> = {
  shi: ["si"],
  chi: ["ti"],
  tsu: ["tu"],
  fu: ["hu"],
  n: ["nn"],
  di: ["ji"],
  du: ["zu"],
};

function acceptable(romaji: string): string[] {
  return [romaji, ...(QUIZ_ALIASES[romaji] || [])];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const quizPool = ref<KataItem[]>([]);
const quizIndex = ref(0);
const quizInput = ref("");
const quizResult = ref<"correct" | "wrong" | null>(null);
const quizScore = ref(0);
const quizTotal = ref(0);
const quizStarted = ref(false);
const quizDone = ref(false);

const currentKata = computed(() => quizPool.value[quizIndex.value]);

function startQuiz() {
  quizPool.value = shuffle(allKata);
  quizIndex.value = 0;
  quizInput.value = "";
  quizResult.value = null;
  quizScore.value = 0;
  quizTotal.value = 0;
  quizStarted.value = true;
  quizDone.value = false;
}

function checkQuiz() {
  if (!currentKata.value || quizResult.value) return;
  const ans = quizInput.value.trim().toLowerCase();
  quizTotal.value++;
  if (acceptable(currentKata.value.romaji).includes(ans)) {
    quizResult.value = "correct";
    quizScore.value++;
  } else {
    quizResult.value = "wrong";
  }
}

function nextQuiz() {
  if (quizIndex.value >= quizPool.value.length - 1) {
    quizDone.value = true;
    quizStarted.value = false;
    return;
  }
  quizIndex.value++;
  quizInput.value = "";
  quizResult.value = null;
}

function onQuizEnter() {
  if (quizResult.value) nextQuiz();
  else checkQuiz();
}
</script>

<style scoped>
.kana-chart {
  margin-bottom: 32px;
  border: 1px solid #e8f6ff;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.15);
  overflow: hidden;
}

.kana-chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
}

.kana-chart-title {
  font-size: 20px;
  color: #075985;
  font-weight: 600;
  margin: 0;
}

.kana-chart-sub {
  color: #7dd3fc;
  font-size: 13px;
  margin: 4px 0 0;
}

.kana-toggle {
  padding: 8px 18px;
  border-radius: 10px;
  border: 1px solid #e0f2fe;
  background: #f5fbff;
  color: #0369a1;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;
  flex-shrink: 0;
}

.kana-toggle:hover {
  background: #e0f2fe;
  border-color: #bae6fd;
  color: #0284c7;
}

.kana-chart-body {
  padding: 0 24px 24px;
}

.kana-group {
  margin-bottom: 24px;
}

.kana-group:last-of-type {
  margin-bottom: 20px;
}

.kana-group-title {
  font-size: 15px;
  color: #0369a1;
  margin: 0 0 12px;
  font-weight: 600;
}

.kana-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
}

.kana-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kana-row {
  display: flex;
  align-items: stretch;
  gap: 6px;
  min-width: 480px;
}

.kana-row-label {
  flex-shrink: 0;
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #7dd3fc;
  font-weight: 700;
  background: #f5fbff;
  border-radius: 10px;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Hiragino Sans GB", "Noto Sans JP", sans-serif;
}

.kana-cell {
  flex: 1 1 0;
  min-width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  border: 1px solid #e8f6ff;
  border-radius: 10px;
  background: #fbfeff;
  transition: all 0.15s;
}

.kana-cell:hover {
  background: #f0f9ff;
  border-color: #bae6fd;
  transform: translateY(-1px);
}

.kana-chars {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.kana-char {
  font-size: 22px;
  color: #075985;
  font-weight: 600;
  line-height: 1.2;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Hiragino Sans GB", "Noto Sans JP", sans-serif;
}

.kana-char--kata {
  color: #7dd3fc;
  font-weight: 500;
}

.kana-romaji {
  font-size: 11px;
  color: #7dd3fc;
  margin-top: 2px;
  font-family: ui-monospace, "SF Mono", "Consolas", "Courier New", monospace;
  letter-spacing: 0.5px;
}

.kana-tips {
  padding: 14px 18px;
  background: linear-gradient(135deg, #f5fbff 0%, #e8f6ff 100%);
  border: 1px solid #e0f2fe;
  border-radius: 12px;
  font-size: 13px;
  color: #0369a1;
  line-height: 1.8;
  margin-bottom: 24px;
}

.kana-tips-title {
  font-weight: 700;
  color: #075985;
}

.kana-tips b {
  font-family: ui-monospace, "SF Mono", "Consolas", "Courier New", monospace;
  color: #0284c7;
  font-weight: 600;
}

/* ===== 片假名测试 ===== */
.kana-quiz {
  padding: 20px 22px;
  background: linear-gradient(135deg, #f5fbff 0%, #e8f6ff 100%);
  border: 1px solid #e0f2fe;
  border-radius: 14px;
}

.kana-quiz-head {
  text-align: center;
  margin-bottom: 18px;
}

.kana-quiz-title {
  font-size: 17px;
  color: #075985;
  font-weight: 700;
  margin: 0;
}

.kana-quiz-sub {
  font-size: 12px;
  color: #7dd3fc;
  margin: 4px 0 0;
}

.kana-quiz-start,
.kana-quiz-done {
  text-align: center;
  padding: 12px 0;
}

.kana-quiz-done-text {
  font-size: 15px;
  color: #0369a1;
  margin: 0 0 12px;
}

.kana-quiz-done-text b {
  color: #0284c7;
}

.kana-quiz-btn {
  padding: 9px 20px;
  border-radius: 10px;
  border: 1px solid #e0f2fe;
  background: #ffffff;
  color: #0369a1;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;
}

.kana-quiz-btn:hover {
  border-color: #bae6fd;
  color: #0284c7;
}

.kana-quiz-btn.primary {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  border-color: #bae6fd;
  color: #075985;
}

.kana-quiz-btn.primary:hover {
  filter: brightness(1.03);
}

.kana-quiz-score {
  text-align: center;
  font-size: 13px;
  color: #5b7a8c;
  margin-bottom: 10px;
}

.kana-quiz-char {
  text-align: center;
  font-size: 56px;
  line-height: 1.2;
  color: #075985;
  font-weight: 600;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Hiragino Sans GB", "Noto Sans JP", sans-serif;
  margin-bottom: 14px;
}

.kana-quiz-input {
  display: block;
  width: 100%;
  max-width: 280px;
  margin: 0 auto 12px;
  padding: 10px 14px;
  border: 1px solid #bae6fd;
  border-radius: 10px;
  font-size: 15px;
  color: #075985;
  text-align: center;
  font-family: ui-monospace, "SF Mono", "Consolas", "Courier New", monospace;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.kana-quiz-input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
}

.kana-quiz-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.kana-quiz-feedback {
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
  font-weight: 600;
}

.kana-quiz-feedback.correct {
  color: #059669;
}

.kana-quiz-feedback.wrong {
  color: #dc2626;
}

/* 折叠动画 */
.fold-enter-active,
.fold-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.fold-enter-from,
.fold-leave-to {
  opacity: 0;
  max-height: 0;
}

.fold-enter-to,
.fold-leave-from {
  opacity: 1;
  max-height: 4000px;
}

@media (max-width: 768px) {
  .kana-chart-head {
    padding: 16px 18px;
  }

  .kana-chart-body {
    padding: 0 18px 18px;
  }

  .kana-char {
    font-size: 19px;
  }

  .kana-romaji {
    font-size: 10px;
  }

  .kana-cell {
    min-width: 52px;
    padding: 6px 3px;
  }

  .kana-quiz-char {
    font-size: 44px;
  }
}
</style>
