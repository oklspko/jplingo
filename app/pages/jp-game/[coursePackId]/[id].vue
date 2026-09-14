<template>
  <div class="jp-game-wrap">
    <div class="jp-game-container">
      <JpTopbar
        :course-title="courseTitle"
        :course-pack-id="coursePackId"
        :current-index="currentIndex"
        :total="statements.length"
        :progress-percent="progressPercent"
        :show-romaji="showRomajiHint"
        :show-kana="showKanaHint"
        :formatted-time="formattedTime"
        :has-prev="hasPrevCourse"
        :has-next="hasNextCourse"
        @toggle-romaji="showRomajiHint = !showRomajiHint"
        @toggle-kana="showKanaHint = !showKanaHint"
        @prev="gotoPrevCourse"
        @next="gotoNextCourse"
      />

      <main v-if="currentStatement" class="jp-main">
        <div class="jp-chinese">{{ currentStatement.chinese }}</div>

        <JpHints
          :romaji="currentStatement.romaji"
          :kana="currentStatement.kana"
          :show-romaji="showRomajiHint"
          :show-kana="showKanaHint"
        />

        <transition name="pop">
          <div v-if="showSpaceHint && showSpaceHintCard" class="space-hint">
            <div class="space-hint-icon">⌨️</div>
            <div class="space-hint-text">
              输入完一个假名后按
              <span class="key">空格</span>
              跳到下一空
            </div>
            <button class="space-hint-close" @click="dismissSpaceHint" title="不再提示">×</button>
          </div>
        </transition>

        <div class="jp-input-area" @click="focusInput">
          <div class="jp-words">
            <div
              v-for="(word, i) in words"
              :key="i"
              class="jp-word"
              :class="wordClass(i)"
              :style="{ minWidth: wordWidth(word) + 'ch' }"
            >
              <div class="jp-word-input">{{ word.userInput }}</div>
              <div v-if="word.incorrect" class="jp-word-answer">{{ word.text }}</div>
            </div>
          </div>
          <input
            ref="inputRef"
            :value="rawInput"
            class="jp-hidden-input"
            type="text"
            autocapitalize="off"
            autocorrect="off"
            autocomplete="off"
            spellcheck="false"
            @keydown="handleKeydown"
            @compositionstart="isComposing = true"
            @compositionend="isComposing = false"
            @input="onInput"
          />
        </div>

        <div class="jp-result-slot">
          <transition name="pop">
            <div v-if="result" class="jp-result" :class="result">
              <span v-if="result === 'correct'">✅ 正确！按 <kbd>空格</kbd> 进入下一句</span>
              <span v-else>❌ 错误，按 <kbd>空格</kbd> 跳到错误处修改</span>
              <p v-if="!isSingleKana" class="jp-answer">
                <ruby v-for="(t, i) in currentStatement.tokens" :key="i">
                  {{ t.text }}<rt>{{ t.kana }}</rt>
                </ruby>
              </p>
              <p v-else class="jp-answer-romaji">{{ currentStatement.romaji }}</p>
            </div>
          </transition>
        </div>

        <div class="jp-actions">
          <button class="jp-btn primary" @click="submitAnswer">
            提交<span class="shortcut">↵</span>
          </button>
          <button class="jp-btn" @click="playAudio">🔊 发音</button>
          <button class="jp-btn" @click="showAnswer = !showAnswer">
            {{ showAnswer ? "隐藏答案" : "显示答案" }}
            <span class="shortcut">Ctrl ;</span>
          </button>
          <button class="jp-btn" @click="reset">重置</button>
          <button
            v-if="result === 'correct' && !isLastQuestion"
            class="jp-btn next"
            @click="next"
          >
            下一题 →<span class="shortcut">↵</span>
          </button>
          <button
            v-if="isLastQuestion && result === 'correct'"
            class="jp-btn next"
            @click="showCompleteModal = true"
          >
            完成课程 🎉
          </button>
        </div>

        <transition name="pop">
          <div v-if="showAnswer" class="jp-answer-tip">
            <template v-if="!isSingleKana">
              <ruby v-for="(t, i) in currentStatement.tokens" :key="i">
                {{ t.text }}<rt>{{ t.kana }}</rt>
              </ruby>
            </template>
            <template v-else>
              <span class="tip-romaji">{{ currentStatement.romaji }}</span>
            </template>
          </div>
        </transition>
      </main>

      <div v-else class="jp-loading">加载中…</div>
    </div>

    <JpCompleteModal
      :show="showCompleteModal"
      :motivation="randomMotivation"
      :formatted-time="formattedTime"
      :has-next="hasNextCourse"
      @next="gotoNextCourse"
      @home="goHome"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { toHiragana } from "wanakana";
import JpTopbar from "~/components/jp/game/JpTopbar.vue";
import JpHints from "~/components/jp/game/JpHints.vue";
import JpCompleteModal from "~/components/jp/game/JpCompleteModal.vue";
import {
  playTypingSound,
  playJumpSound,
  playSuccessSound,
  playErrorSound,
  speakJapanese,
} from "~/composables/jp/useJpSound";
import { useJpTimer } from "~/composables/jp/useJpTimer";
import { useJpStorage } from "~/composables/jp/useJpStorage";
import {
  isSingleKanaCourseId,
  getTokenRomaji,
  checkToken,
  calcWordWidth,
} from "~/composables/jp/useJpRomaji";
import { useJpGlobalKeyboard } from "~/composables/jp/useJpKeyboard";
import { fetchCoursePacks, fetchCourse } from "~/composables/jp/useJpCourses";
import type { JpStatement } from "~/types/jp";

const route = useRoute();
const statements = ref<JpStatement[]>([]);
const currentIndex = ref(0);
const rawInput = ref("");
const result = ref<"" | "correct" | "wrong">("");
const isComposing = ref(false);
const inputRef = ref<HTMLInputElement>();
const showAnswer = ref(false);
const showCompleteModal = ref(false);
const editingIndex = ref(-1);
const showRomajiHint = ref(true);
const showKanaHint = ref(false);
const courseTitle = ref("");
const showSpaceHint = ref(true);
const hadWrongAttempt = ref(false);

const coursePackId = computed(() => route.params.coursePackId as string);
const courseId = computed(() => route.params.id as string);
const isSingleKana = computed(() => isSingleKanaCourseId(courseId.value));

const showSpaceHintCard = computed(() => {
  const stmt = currentStatement.value;
  if (!stmt) return false;
  if (isSingleKana.value) return false;
  return stmt.tokens.length > 1;
});

const allCourses = ref<string[]>([]);
const courseIndex = ref(-1);
const hasPrevCourse = computed(() => courseIndex.value > 0);
const hasNextCourse = computed(
  () => courseIndex.value >= 0 && courseIndex.value < allCourses.value.length - 1,
);
const isLastQuestion = computed(
  () => currentIndex.value === statements.value.length - 1,
);

const { formattedTime, elapsedSeconds, start: startTimer } = useJpTimer();
const { recordStatement, recordMastered, addStudyTime } = useJpStorage();

// ===== 学习时长上报 =====
let lastFlushedSeconds = 0;
let timeHeartbeat: ReturnType<typeof setInterval> | null = null;
function flushStudyTime() {
  const delta = elapsedSeconds.value - lastFlushedSeconds;
  if (delta > 0) {
    addStudyTime(delta);
    lastFlushedSeconds = elapsedSeconds.value;
  }
}

const currentStatement = computed(() => statements.value[currentIndex.value]);

const progressPercent = computed(() => {
  if (statements.value.length === 0) return 0;
  return ((currentIndex.value + 1) / statements.value.length) * 100;
});

const words = computed(() => {
  const stmt = currentStatement.value;
  if (!stmt) return [];
  const parts = rawInput.value.split(" ");
  return stmt.tokens.map((token, i) => {
    const raw = parts[i] || "";
    if (isSingleKana.value) {
      const target = getTokenRomaji(token);
      return {
        text: token.text, kana: token.kana, userInput: raw,
        incorrect: result.value === "wrong" && raw.trim().toLowerCase() !== target,
      };
    }
    const userInput = toHiragana(raw);
    return {
      text: token.text, kana: token.kana, userInput,
      incorrect: result.value === "wrong" && userInput !== token.kana,
    };
  });
});

const motivations = [
  "素晴らしい！よくできました！",
  "頑張りましたね！次へ進みましょう！",
  "お疲れ様でした！また次回も頑張りましょう！",
  "完璧です！あなたの努力は素晴らしい！",
  "すごい！上達が早いですね！",
  "よくできました！この調子で続けましょう！",
  "お見事です！日本語の達人に一歩近づきました！",
  "やったね！自信を持って次に進みましょう！",
  "最高です！あなたは本当に優秀です！",
  "努力は裏切らない！この調子で頑張って！",
];
const randomMotivation = ref("");
function pickRandomMotivation() {
  randomMotivation.value = motivations[Math.floor(Math.random() * motivations.length)];
}

function dismissSpaceHint() {
  showSpaceHint.value = false;
  localStorage.setItem("jp-space-hint-dismissed", "true");
}

useJpGlobalKeyboard({
  onToggleRomaji: () => (showRomajiHint.value = !showRomajiHint.value),
  onToggleKana: () => (showKanaHint.value = !showKanaHint.value),
  onToggleAnswer: () => (showAnswer.value = !showAnswer.value),
  onCompleteModalKey: (e) => {
    if (!showCompleteModal.value) return false;
    if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); gotoNextCourse(); return true; }
    if (e.code === "Escape") { e.preventDefault(); goHome(); return true; }
    return true;
  },
});

onMounted(async () => {
  await loadCourseData();
  const savedR = localStorage.getItem("jp-romaji-hint");
  if (savedR !== null) showRomajiHint.value = savedR === "true";
  else showRomajiHint.value = !isSingleKana.value;
  const savedK = localStorage.getItem("jp-kana-hint");
  if (savedK !== null) showKanaHint.value = savedK === "true";
  else showKanaHint.value = isSingleKana.value;
  const dismissed = localStorage.getItem("jp-space-hint-dismissed");
  if (dismissed === "true") showSpaceHint.value = false;
  startTimer();
  timeHeartbeat = setInterval(flushStudyTime, 5000);
  window.addEventListener("beforeunload", flushStudyTime);
});

onUnmounted(() => {
  flushStudyTime();
  if (timeHeartbeat) clearInterval(timeHeartbeat);
  window.removeEventListener("beforeunload", flushStudyTime);
});

watch(showRomajiHint, (v) => localStorage.setItem("jp-romaji-hint", v ? "true" : "false"));
watch(showKanaHint, (v) => localStorage.setItem("jp-kana-hint", v ? "true" : "false"));

watch(currentIndex, () => {
  rawInput.value = "";
  result.value = "";
  showAnswer.value = false;
  editingIndex.value = -1;
  hadWrongAttempt.value = false;
  nextTick(() => {
    inputRef.value?.focus();
    setTimeout(() => playAudio(), 200);
  });
});

watch(showCompleteModal, (v) => {
  if (v) inputRef.value?.blur();
  else nextTick(() => inputRef.value?.focus());
});

async function loadCourseData() {
  const packId = coursePackId.value;
  const id = courseId.value;
  try {
    const packs = await fetchCoursePacks();
    const pack = packs.find((p) => p.id === packId);
    if (pack) {
      allCourses.value = pack.courses || [];
      courseIndex.value = allCourses.value.indexOf(id);
    }
  } catch {}
  const data = await fetchCourse(packId, id);
  statements.value = data.statements || [];
  courseTitle.value = data.title || id;
  currentIndex.value = 0;
  nextTick(() => {
    inputRef.value?.focus();
    setTimeout(() => playAudio(), 500);
  });
}

function gotoPrevCourse() {
  if (!hasPrevCourse.value) return;
  const prevId = allCourses.value[courseIndex.value - 1];
  window.location.href = `/jp-game/${coursePackId.value}/${prevId}`;
}

function gotoNextCourse() {
  if (!hasNextCourse.value) { goHome(); return; }
  const nextId = allCourses.value[courseIndex.value + 1];
  window.location.href = `/jp-game/${coursePackId.value}/${nextId}`;
}

function goHome() { window.location.href = "/jp-home"; }

function checkAllCorrect(): boolean {
  const stmt = currentStatement.value;
  if (!stmt) return false;
  const parts = rawInput.value.split(" ");
  if (parts.length !== stmt.tokens.length) return false;
  return stmt.tokens.every((token, i) =>
    checkToken(parts[i] || "", token, isSingleKana.value),
  );
}

function wordClass(i: number) {
  const stmt = currentStatement.value;
  if (!stmt) return "";
  if (editingIndex.value === i && result.value === "wrong") return "incorrect editing";
  if (result.value === "wrong") {
    const parts = rawInput.value.split(" ");
    return checkToken(parts[i] || "", stmt.tokens[i], isSingleKana.value) ? "" : "incorrect";
  }
  return "";
}

function wordWidth(word: any) {
  return calcWordWidth(word.kana, isSingleKana.value);
}

function jumpToNextError() {
  const stmt = currentStatement.value;
  if (!stmt || !inputRef.value) return;
  const parts = rawInput.value.split(" ");
  const errorIndices: number[] = [];
  stmt.tokens.forEach((token, i) => {
    if (!checkToken(parts[i] || "", token, isSingleKana.value)) errorIndices.push(i);
  });
  if (errorIndices.length === 0) return;
  let nextIdx: number;
  if (editingIndex.value === -1) nextIdx = errorIndices[0];
  else {
    const after = errorIndices.find((idx) => idx > editingIndex.value);
    nextIdx = after !== undefined ? after : errorIndices[0];
  }
  editingIndex.value = nextIdx;
  let charStart = 0;
  for (let i = 0; i < nextIdx; i++) charStart += (parts[i] || "").length + 1;
  const charEnd = charStart + (parts[nextIdx] || "").length;
  nextTick(() => {
    inputRef.value?.focus();
    inputRef.value?.setSelectionRange(charStart, charEnd);
  });
}

function handleKeydown(e: KeyboardEvent) {
  if (e.code === "Enter") {
    e.preventDefault();
    handleEnter();
  }
}

function handleEnter() {
  if (isComposing.value) return;
  if (showCompleteModal.value) return;

  if (result.value === "correct") {
    if (isLastQuestion.value) { pickRandomMotivation(); showCompleteModal.value = true; }
    else next();
    return;
  }
  if (result.value === "wrong") { submitAnswer(); return; }

  const parts = rawInput.value.split(" ");
  const total = currentStatement.value?.tokens.length || 0;
  const allFilled =
    parts.length >= total && parts.slice(0, total).every((p) => p.trim() !== "");
  if (allFilled) submitAnswer();
}

function handleSpace() {
  if (isComposing.value) return;
  if (showCompleteModal.value) return;

  if (result.value === "correct") {
    if (isLastQuestion.value) { pickRandomMotivation(); showCompleteModal.value = true; }
    else next();
    return;
  }

  if (result.value === "wrong") {
    if (checkAllCorrect()) submitAnswer();
    else { jumpToNextError(); playJumpSound(); }
    return;
  }

  const parts = rawInput.value.split(" ");
  const total = currentStatement.value?.tokens.length || 0;
  const allFilled =
    parts.length >= total && parts.slice(0, total).every((p) => p.trim() !== "");
  if (allFilled) submitAnswer();
  else if (rawInput.value && !rawInput.value.endsWith(" "))
    rawInput.value += " ";
}

function onInput(e: Event) {
  playTypingSound();
  const el = e.target as HTMLInputElement;
  if (!isComposing.value && el.value.endsWith(" ")) {
    // 手机虚拟键盘按空格常不触发 keydown，这里从 input 事件兜底
    rawInput.value = el.value.replace(/ +$/, "");
    handleSpace();
  } else {
    rawInput.value = el.value;
  }
}

function submitAnswer() {
  const stmt = currentStatement.value;
  if (!stmt) return;
  const parts = rawInput.value.split(" ");
  if (parts.length < stmt.tokens.length) {
    result.value = "wrong"; editingIndex.value = -1; playErrorSound(); return;
  }
  if (checkAllCorrect()) {
    result.value = "correct"; editingIndex.value = -1;
    playSuccessSound(); playAudio();
    recordStatement(courseId.value, stmt.id);
    if (!hadWrongAttempt.value) recordMastered(courseId.value, stmt.id);
    if (isLastQuestion.value) {
      pickRandomMotivation();
      setTimeout(() => (showCompleteModal.value = true), 800);
    }
  } else {
    result.value = "wrong"; editingIndex.value = -1; hadWrongAttempt.value = true; playErrorSound();
  }
}

function reset() {
  rawInput.value = "";
  result.value = "";
  showAnswer.value = false;
  editingIndex.value = -1;
  nextTick(() => inputRef.value?.focus());
}

function focusInput() {
  inputRef.value?.focus();
}

function next() {
  if (currentIndex.value < statements.value.length - 1) currentIndex.value++;
}

function playAudio() {
  const stmt = currentStatement.value;
  if (!stmt) return;
  speakJapanese(stmt.kana.replace(/\s+/g, ""));
}
</script>

<style scoped>
.jp-game-wrap {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fcff 0%, #f5fbff 40%, #fbfeff 100%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 20px 60px;
  overflow-x: hidden;
  box-sizing: border-box;
}

.jp-game-container {
  width: 100%;
  max-width: 1600px;
  padding: 0;
  font-family: -apple-system, "Segoe UI", "Noto Sans JP", sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.jp-main {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.jp-chinese {
  text-align: center;
  font-size: clamp(32px, 5vw, 63px);
  color: #075985;
  letter-spacing: clamp(2px, 0.5vw, 6px);
  padding: 16px 0 8px;
  font-weight: 500;
  font-family: "Noto Sans JP", sans-serif;
  line-height: 1.2;
  word-break: break-word;
}

.space-hint {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 40px 12px 20px;
  background: linear-gradient(135deg, #fffef5 0%, #fef3c7 100%);
  border: 2px dashed #fbbf24;
  border-radius: 14px;
  max-width: 100%;
  width: fit-content;
  box-sizing: border-box;
  animation: hintPulse 2s ease-in-out infinite;
}

@keyframes hintPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(251, 191, 36, 0); }
}

.space-hint-icon { font-size: 22px; flex-shrink: 0; }
.space-hint-text { flex: 1; font-size: 14px; color: #78350f; line-height: 1.6; font-weight: 500; }

.space-hint-text .key {
  display: inline-block;
  padding: 2px 8px;
  margin: 0 3px;
  background: #fff;
  border: 1px solid #fbbf24;
  border-radius: 6px;
  font-family: monospace;
  font-weight: 700;
  color: #92400e;
  box-shadow: 0 2px 0 #fbbf24;
  font-size: 13px;
}

.space-hint-close {
  position: absolute;
  top: 8px; right: 10px;
  width: 22px; height: 22px;
  border: none; background: transparent;
  color: #b45309; font-size: 18px; line-height: 1;
  cursor: pointer; border-radius: 50%;
  transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}

.space-hint-close:hover { background: #fde68a; color: #78350f; }

.jp-input-area { position: relative; padding: 12px 0; width: 100%; }
.jp-words { display: flex; flex-wrap: wrap; justify-content: center; gap: clamp(12px, 2vw, 30px); min-height: 90px; }

.jp-word {
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  min-height: clamp(80px, 10vw, 108px);
  padding: 0 8px;
  border-bottom: 4px solid #bae6fd;
  font-size: clamp(28px, 4vw, 48px);
  color: #075985;
  transition: all 0.2s;
  font-family: "Noto Sans JP", "JetBrains Mono", monospace;
  word-break: break-all;
}

.jp-word.incorrect { border-bottom-color: #ef4444; color: #ef4444; }

.jp-word.incorrect.editing {
  border-bottom-color: #f59e0b; border-bottom-width: 5px;
  color: #f59e0b; background: rgba(254, 243, 199, 0.4);
  border-radius: 6px 6px 0 0;
  animation: pulse-edit 1.2s ease-in-out infinite;
}

@keyframes pulse-edit {
  0%, 100% { background: rgba(254, 243, 199, 0.4); }
  50% { background: rgba(254, 243, 199, 0.8); }
}

.jp-word-input { line-height: 1; }
.jp-word-answer { font-size: clamp(12px, 1.5vw, 19px); color: #ef4444; margin-top: 6px; }

.jp-hidden-input {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100%; height: 100%;
  opacity: 0; cursor: text;
  font-size: 16px;
  touch-action: manipulation;
}

.jp-result-slot {
  width: 100%; min-height: 180px;
  display: flex; flex-direction: column;
  justify-content: flex-end; align-items: center;
}

.jp-result {
  padding: clamp(16px, 2vw, 30px);
  border-radius: 24px; text-align: center;
  font-size: clamp(16px, 2vw, 24px); font-weight: 600;
  width: 100%; box-sizing: border-box; word-break: break-word;
}

.jp-result.correct { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); color: #16a34a; }
.jp-result.wrong { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); color: #dc2626; }

.jp-result kbd {
  display: inline-block; padding: 2px 8px; background: #fff;
  border: 1px solid #fecaca; border-radius: 6px;
  font-family: monospace; font-size: 0.85em;
  color: #dc2626; margin: 0 4px;
  box-shadow: 0 2px 0 #fecaca;
}

.jp-result.correct kbd { border-color: #bbf7d0; color: #16a34a; box-shadow: 0 2px 0 #bbf7d0; }

.jp-answer {
  font-size: clamp(24px, 3vw, 45px);
  margin: 14px 0 0; color: #075985;
  font-family: "Noto Sans JP", sans-serif;
  font-weight: 400; word-break: break-word;
}

.jp-answer ruby rt { font-size: 0.45em; color: #38bdf8; }

.jp-answer-romaji {
  font-size: clamp(24px, 3vw, 45px);
  margin: 14px 0 0; color: #075985;
  font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
  font-weight: 600; letter-spacing: 3px; word-break: break-all;
}

.jp-actions {
  display: flex; justify-content: center;
  gap: clamp(8px, 1vw, 18px); flex-wrap: wrap;
  margin-top: clamp(24px, 4vw, 60px); width: 100%;
}

.jp-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: clamp(10px, 1.5vw, 18px) clamp(18px, 2.5vw, 36px);
  font-size: clamp(14px, 1.6vw, 22px); font-weight: 500;
  border: 3px solid #e8f6ff; border-radius: 18px;
  background: #fff; cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  color: #0369a1; font-family: inherit; white-space: nowrap;
}

.jp-btn:hover {
  background: #f5fbff; border-color: #bae6fd; color: #0284c7;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(186, 230, 253, 0.25);
}

.jp-btn:active { transform: translateY(0) scale(0.98); }

.jp-btn.primary {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985; border-color: transparent;
  box-shadow: 0 8px 28px rgba(186, 230, 253, 0.4);
}

.jp-btn.primary:hover {
  background: linear-gradient(135deg, #bae6fd 0%, #7dd3fc 100%);
  box-shadow: 0 10px 32px rgba(186, 230, 253, 0.55);
}

.jp-btn.next {
  background: linear-gradient(135deg, #6ee7b7 0%, #34d399 100%);
  color: #fff; border-color: transparent;
  box-shadow: 0 8px 28px rgba(52, 211, 153, 0.35);
}

.jp-btn.next:hover {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  box-shadow: 0 10px 32px rgba(52, 211, 153, 0.45);
}

.shortcut {
  font-size: clamp(10px, 1vw, 15px);
  padding: 2px 7px; background: rgba(255, 255, 255, 0.5);
  border-radius: 6px; font-family: monospace;
}

.jp-btn:not(.primary):not(.next) .shortcut {
  background: #f0f9ff; color: #7dd3fc;
}

.jp-answer-tip {
  padding: clamp(16px, 2vw, 30px);
  background: linear-gradient(135deg, #f5fbff 0%, #e8f6ff 100%);
  border: 1px solid #e0f2fe; border-radius: 21px;
  text-align: center; font-size: clamp(24px, 3vw, 42px);
  color: #075985; font-family: "Noto Sans JP", sans-serif;
  width: 100%; box-sizing: border-box; word-break: break-word;
}

.jp-answer-tip ruby rt { font-size: 0.45em; color: #0284c7; }

.tip-romaji {
  font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
  font-weight: 600; letter-spacing: 4px; color: #0284c7;
}

.pop-enter-active { animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.pop-leave-active { transition: opacity 0.15s; }
.pop-leave-to { opacity: 0; }

@keyframes popIn {
  0% { opacity: 0; transform: scale(0.9) translateY(-8px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

.jp-loading { text-align: center; color: #999; padding: 60px 0; }

@media (max-width: 768px) {
  .jp-game-wrap { padding: 16px 12px 32px; }
  .jp-main { gap: 16px; }
  .jp-chinese { padding: 12px 0 4px; letter-spacing: 2px; }
  .jp-words { gap: 12px; min-height: 70px; }
  .jp-word { padding: 0 5px; border-bottom-width: 3px; }
  .jp-word-answer { font-size: 12px; margin-top: 3px; }
  .jp-result-slot { min-height: 140px; }
  .jp-result { border-radius: 16px; padding: 16px; }
  .jp-actions { margin-top: 20px; gap: 8px; }
  .jp-btn {
    padding: 10px 16px; font-size: 14px;
    border-radius: 12px; border-width: 2px; gap: 5px;
    flex: 1 1 calc(50% - 4px); justify-content: center;
  }
  .shortcut { display: none; }

  .space-hint { padding: 10px 36px 10px 14px; gap: 8px; }
  .space-hint-icon { font-size: 18px; }
  .space-hint-text { font-size: 12px; }
  .space-hint-text .key { font-size: 11px; padding: 1px 6px; }
}

@media (max-width: 480px) {
  .jp-chinese { font-size: 28px; }
  .jp-word { font-size: 26px; min-height: 64px; }
  .jp-answer-romaji { letter-spacing: 1px; }
  .space-hint-text { font-size: 11px; line-height: 1.5; }
  .space-hint-text .key { margin: 0 1px; }
}
</style>