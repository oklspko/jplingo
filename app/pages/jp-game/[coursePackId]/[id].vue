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
              输入完一个意群后按
              <span class="key">空格</span>
              跳到下一空
            </div>
            <button class="space-hint-close" @click="dismissSpaceHint" title="不再提示">×</button>
          </div>
        </transition>

        <div class="jp-input-area" @click="focusInput">
          <div class="jp-words">
            <div
              v-for="(word, i) in userInputWords"
              :key="i"
              class="jp-word"
              :class="wordClass(word)"
              :style="{ minWidth: wordWidth(word) + 'ch' }"
            >
              <div class="jp-word-input">{{ displayFor(word) }}</div>
              <div v-if="word.incorrect" class="jp-word-answer">{{ word.text }}</div>
            </div>
          </div>
          <input
            ref="inputRef"
            :value="inputValue"
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
              <span v-if="result === 'correct'" class="jp-result-status">✅ 正确！按 <kbd>空格</kbd> 进入下一句</span>
              <span v-else class="jp-result-status">❌ 错误，按 <kbd>空格</kbd> 跳到错误处修改</span>
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
          <button v-if="isMixed" class="jp-btn" @click="resetMixedMemory">🔄 重置记忆</button>
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

      <div v-else-if="allMastered" class="jp-all-mastered">
        <div class="all-mastered-icon">🎉</div>
        <h2 class="all-mastered-title">全部词汇已掌握！</h2>
        <p class="all-mastered-desc">连续答对 5 次的词会从测试中移除，当前词库已全部掌握。</p>
        <button class="jp-btn primary" @click="resetMixedMemory">🔄 重新开始（清空记忆）</button>
      </div>

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
  calcWordWidth,
  romajiToKanaForDisplay,
  kanaToInputRomaji,
} from "~/composables/jp/useJpRomaji";
import { useJpInput } from "~/composables/jp/useJpInput";
import { useJpGlobalKeyboard } from "~/composables/jp/useJpKeyboard";
import {
  fetchCoursePacks,
  fetchCourse,
  buildPracticeOrder,
  shuffle,
  isMixedCourse,
} from "~/composables/jp/useJpCourses";
import { useJpVocabMemory, GAOKAO_MASTER_THRESHOLD } from "~/composables/jp/useJpGaokaoMemory";
import type { JpStatement } from "~/types/jp";

const route = useRoute();
const statements = ref<JpStatement[]>([]);
const currentIndex = ref(0);
const result = ref<"" | "correct" | "wrong">("");
const isComposing = ref(false);
const inputRef = ref<HTMLInputElement>();
const showAnswer = ref(false);
const showCompleteModal = ref(false);
const showRomajiHint = ref(true);
const showKanaHint = ref(false);
const courseTitle = ref("");
const showSpaceHint = ref(true);
const hadWrongAttempt = ref(false);
const allMastered = ref(false);

const vocabMemory = useJpVocabMemory(route.params.coursePackId as string);

const coursePackId = computed(() => route.params.coursePackId as string);
const courseId = computed(() => route.params.id as string);
const isSingleKana = computed(() => isSingleKanaCourseId(courseId.value));
const isMixed = computed(
  () => isMixedCourse(coursePackId.value, courseId.value),
);

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
const { recordStatement, recordMastered, recordCourseCompleted, addStudyTime } = useJpStorage();

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

function handleBeforeUnload() {
  flushStudyTime();
  saveResume();
}

const currentStatement = computed(() => statements.value[currentIndex.value]);

// ===== 输入状态机（对齐 earthworm-main 的 question.ts）：incorrect 只在提交时一次性标记 =====
function setInputCursorPosition(position: number) {
  inputRef.value?.setSelectionRange(position, position);
}
function getInputCursorPosition() {
  return inputRef.value?.selectionStart ?? 0;
}

const input = useJpInput({
  tokens: () => currentStatement.value?.tokens || [],
  isSingleKana: () => isSingleKana.value,
  setInputCursorPosition,
  getInputCursorPosition,
  fixCallback: () => playJumpSound(),
});
// 模板里不能用嵌套 ref（input.inputValue 不会自动解包，会变成 "[object Object]"），
// 拆到顶层供模板自动解包；input 本身仍保留给脚本里的方法调用（initialize/setInputValue 等）。
const { inputValue, userInputWords } = input;

const progressPercent = computed(() => {
  if (statements.value.length === 0) return 0;
  return ((currentIndex.value + 1) / statements.value.length) * 100;
});

// 展示用：单假名课程直接显示原始罗马字，普通课程把罗马字转成假名
function displayFor(word: { userInput: string; kana: string }): string {
  return isSingleKana.value
    ? word.userInput
    : romajiToKanaForDisplay(word.userInput, word.kana);
}

// 词块样式：wrong 态下，正确词「锁定」，当前修复词「editing」，其余错误词红
function wordClass(word: { incorrect: boolean; isActive: boolean }) {
  if (result.value !== "wrong") return "";
  if (!word.incorrect) return "locked";
  if (word.isActive) return "incorrect editing";
  return "incorrect";
}

function wordWidth(word: { kana: string }) {
  return calcWordWidth(word.kana, isSingleKana.value);
}

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

// ===== 练习进度续学：退出时记录当前词，重进时恢复到该词 =====
const RESUME_KEY = "jp-study-resume";
const courseCompleted = ref(false);

function resumeKey() {
  return `${coursePackId.value}/${courseId.value}`;
}

function saveResume() {
  if (courseCompleted.value) return; // 已完成课程不再续学
  const stmt = currentStatement.value;
  if (!stmt) return;
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[resumeKey()] = { japanese: stmt.japanese, index: currentIndex.value };
    localStorage.setItem(RESUME_KEY, JSON.stringify(map));
  } catch {}
}

function clearResume() {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return;
    const map = JSON.parse(raw);
    delete map[resumeKey()];
    localStorage.setItem(RESUME_KEY, JSON.stringify(map));
  } catch {}
}

function loadResume(): { japanese: string; index: number } | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    return JSON.parse(raw)[resumeKey()] || null;
  } catch {
    return null;
  }
}

// 由退出时记录的「词 + 索引」恢复当前题号。练习顺序可能因随机复习/无分类打乱而
// 变化，故先按索引对号，对不上再按词文本查找；词已被掌握移除时回退到最近位置。
function restoreIndex(): number {
  const r = loadResume();
  const n = statements.value.length;
  if (!r || n === 0) return 0;
  if (statements.value[r.index]?.japanese === r.japanese) return r.index;
  for (let i = r.index; i < n; i++) {
    if (statements.value[i].japanese === r.japanese) return i;
  }
  for (let i = 0; i < r.index; i++) {
    if (statements.value[i].japanese === r.japanese) return i;
  }
  return Math.min(r.index, n - 1);
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
  window.addEventListener("beforeunload", handleBeforeUnload);
});

onUnmounted(() => {
  flushStudyTime();
  saveResume();
  if (timeHeartbeat) clearInterval(timeHeartbeat);
  window.removeEventListener("beforeunload", handleBeforeUnload);
});

watch(showRomajiHint, (v) => localStorage.setItem("jp-romaji-hint", v ? "true" : "false"));
watch(showKanaHint, (v) => localStorage.setItem("jp-kana-hint", v ? "true" : "false"));

function resetInput() {
  input.initialize();
  result.value = "";
  showAnswer.value = false;
  hadWrongAttempt.value = false;
}

watch(currentIndex, () => {
  saveResume();
  resetInput();
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
  let list = data.statements || [];
  allMastered.value = false;
  if (isMixed.value) {
    // 已掌握（连续答对 5 次）的词不再进入测试；无分类则打乱全部词库
    list = shuffle(list.filter((s) => !vocabMemory.isMastered(s.japanese)));
  }
  statements.value = buildPracticeOrder(packId, list, 6).map((s) => ({
    ...s,
    // 提示用罗马字须是「可输入的」IME 拼写（づ→du、っち→cchi、ん+元音→n' 等），
    // 存储的 romaji 是 Hepburn 展示写法，照着打不出正确假名，故运行时按 kana 重算。
    romaji: kanaToInputRomaji(s.kana),
  }));
  if (isMixed.value && statements.value.length === 0) allMastered.value = true;
  courseTitle.value = data.title || id;
  currentIndex.value = restoreIndex();
  resetInput();
  nextTick(() => {
    inputRef.value?.focus();
    setTimeout(() => playAudio(), 500);
  });
}

function gotoPrevCourse() {
  if (!hasPrevCourse.value) return;
  const prevId = allCourses.value[courseIndex.value - 1];
  window.location.href = `/jp-study/${coursePackId.value}/${prevId}`;
}

function gotoNextCourse() {
  if (!hasNextCourse.value) { goHome(); return; }
  const nextId = allCourses.value[courseIndex.value + 1];
  window.location.href = `/jp-study/${coursePackId.value}/${nextId}`;
}

function goHome() { window.location.href = "/jp-home"; }

function advanceOrComplete() {
  if (isLastQuestion.value) { pickRandomMotivation(); showCompleteModal.value = true; }
  else next();
}

function handleKeydown(e: KeyboardEvent) {
  if (showCompleteModal.value) return;
  if (e.code === "Enter") {
    if (isComposing.value) return;
    e.preventDefault();
    if (result.value === "correct") advanceOrComplete();
    else submitAnswer();
    return;
  }
  if (e.code === "Space" && result.value === "correct") {
    e.preventDefault();
    advanceOrComplete();
    return;
  }
  input.handleKeyboardInput(e, () => submitAnswer());
}

function onInput(e: Event) {
  playTypingSound();
  const el = e.target as HTMLInputElement;
  if (!isComposing.value && el.value.endsWith(" ")) {
    // 手机虚拟键盘按空格常不触发 keydown，这里从 input 事件兜底。
    // 空格被消费（吞掉/修复跳转/提交）时 handleSpace 已更新 inputValue，不再用 DOM 值覆盖。
    const consumed = input.handleSpace(() => submitAnswer());
    if (!consumed) input.setInputValue(el.value);
  } else {
    input.setInputValue(el.value);
  }
}

function onCorrect(stmt: JpStatement) {
  result.value = "correct";
  playSuccessSound(); playAudio();
  if (isMixed.value) {
    recordStatement(courseId.value, stmt.japanese);
    const newCount = vocabMemory.recordCorrect(stmt.japanese);
    if (newCount >= GAOKAO_MASTER_THRESHOLD) {
      recordMastered(courseId.value, stmt.japanese);
      removeFutureCopies(stmt.japanese);
    }
  } else {
    recordStatement(courseId.value, stmt.id);
    if (!hadWrongAttempt.value) recordMastered(courseId.value, stmt.id);
  }
  if (isLastQuestion.value) {
    recordCourseCompleted(courseId.value);
    courseCompleted.value = true;
    clearResume();
    pickRandomMotivation();
    setTimeout(() => (showCompleteModal.value = true), 800);
  }
}

function onWrong(stmt: JpStatement) {
  result.value = "wrong";
  hadWrongAttempt.value = true;
  playErrorSound();
  if (isMixed.value) vocabMemory.recordWrong(stmt.japanese);
}

function submitAnswer() {
  const stmt = currentStatement.value;
  if (!stmt) return;
  input.submitAnswer(
    () => onCorrect(stmt),
    () => onWrong(stmt),
  );
}

function reset() {
  resetInput();
  nextTick(() => inputRef.value?.focus());
}

function focusInput() {
  inputRef.value?.focus();
}

function next() {
  if (currentIndex.value < statements.value.length - 1) currentIndex.value++;
}

// 高考无分类测试：某词连续答对达到阈值后，从当前题之后移除该词的所有后续出现
function removeFutureCopies(japanese: string) {
  const idx = currentIndex.value;
  for (let i = statements.value.length - 1; i > idx; i--) {
    if (statements.value[i].japanese === japanese) statements.value.splice(i, 1);
  }
}

async function resetMixedMemory() {
  vocabMemory.resetAll();
  allMastered.value = false;
  courseCompleted.value = false;
  clearResume();
  await loadCourseData();
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

.jp-word.locked { border-bottom-color: #10b981; color: #059669; }

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
  width: 100%; min-height: 120px;
  display: flex; flex-direction: column;
  justify-content: flex-end; align-items: center;
}

.jp-result {
  padding: clamp(20px, 2.6vw, 30px);
  border-radius: 20px; text-align: center;
  font-weight: 600;
  width: 100%; box-sizing: border-box; word-break: break-word;
  background: #ffffff;
  border: 1px solid #e0f2fe;
  box-shadow: 0 6px 20px rgba(186, 230, 253, 0.16);
}

.jp-result-status {
  display: block;
  font-size: clamp(16px, 2vw, 20px);
  line-height: 1.7;
}

.jp-result.correct { border-color: #a7f3d0; box-shadow: 0 6px 20px rgba(110, 231, 183, 0.22); }
.jp-result.correct .jp-result-status { color: #059669; }

.jp-result.wrong { border-color: #fecaca; box-shadow: 0 6px 20px rgba(252, 165, 165, 0.22); }
.jp-result.wrong .jp-result-status { color: #dc2626; }

.jp-result kbd {
  display: inline-block; padding: 2px 8px; background: #f5fbff;
  border: 1px solid #e0f2fe; border-radius: 6px;
  font-family: ui-monospace, "SF Mono", "Consolas", "Courier New", monospace;
  font-size: 0.8em; font-weight: 600;
  color: #0369a1; margin: 0 4px;
  box-shadow: 0 2px 0 #e0f2fe;
}

.jp-answer {
  font-size: clamp(24px, 3vw, 45px);
  margin: 16px 0 0; padding-top: 14px;
  border-top: 1px dashed #e0f2fe;
  color: #075985;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Hiragino Sans GB", "Noto Sans JP", sans-serif;
  font-weight: 400; word-break: break-word;
}

.jp-answer ruby rt { font-size: 0.45em; color: #38bdf8; }

.jp-answer-romaji {
  font-size: clamp(24px, 3vw, 45px);
  margin: 16px 0 0; padding-top: 14px;
  border-top: 1px dashed #e0f2fe;
  color: #075985;
  font-family: ui-monospace, "SF Mono", "Consolas", "Courier New", monospace;
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
  color: #075985; font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Hiragino Sans GB", "Noto Sans JP", sans-serif;
  width: 100%; box-sizing: border-box; word-break: break-word;
}

.jp-answer-tip ruby rt { font-size: 0.45em; color: #0284c7; }

.tip-romaji {
  font-family: ui-monospace, "SF Mono", "Consolas", "Courier New", monospace;
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

.jp-all-mastered {
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.all-mastered-icon { font-size: 64px; }
.all-mastered-title { font-size: 28px; color: #075985; margin: 0; }
.all-mastered-desc { font-size: 15px; color: #7dd3fc; margin: 0 0 8px; }

@media (max-width: 768px) {
  .jp-game-wrap { padding: 16px 12px 32px; }
  .jp-main { gap: 16px; }
  .jp-chinese { padding: 12px 0 4px; letter-spacing: 2px; }
  .jp-words { gap: 12px; min-height: 70px; }
  .jp-word { padding: 0 5px; border-bottom-width: 3px; }
  .jp-word-answer { font-size: 12px; margin-top: 3px; }
  .jp-result-slot { min-height: 96px; }
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