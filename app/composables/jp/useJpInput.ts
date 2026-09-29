// 日语连词成句输入判定（状态机），对齐 earthworm-main 的 composables/main/question.ts 判定效果。
// 关键差异（相对旧实现）：每个意群是一个「状态」而不是每次渲染实时推导——
//   - incorrect 只在 submit 时一次性标记，修复过程中保持不变，避免「改对了反而又把后面的词标红」。
//   - Fix → Fix_Input 两段式修复：逐词清除错误并重定位光标，绝不用「选中整词再替换」的脆弱方案。
import { nextTick, reactive, ref } from "vue";
import type { JpToken } from "~/types/jp";
import { checkToken } from "~/composables/jp/useJpRomaji";

export interface JpInputWord {
  text: string; // 汉字/原文（错误时展示的标准答案）
  kana: string; // 假名（目标读音）
  userInput: string; // 用户原始输入（罗马字或直接假名）
  incorrect: boolean; // 上次提交判错（持久，直到下次提交）
  isActive: boolean; // 光标当前所在意群
  start: number; // 该词在 inputValue 中的起始字符位
  end: number; // 结束字符位
  id: number; // token 序号
}

interface JpInputOptions {
  tokens: () => JpToken[];
  isSingleKana: () => boolean;
  setInputCursorPosition: (position: number) => void;
  getInputCursorPosition: () => number;
  inputChangedCallback?: (e: KeyboardEvent) => void;
  fixCallback?: () => void; // 跳转到错误词时触发（播放跳转音）
}

enum Mode {
  Input = "input",
  Fix = "fix",
  Fix_Input = "fix-input",
}

const separator = " ";

export function useJpInput(options: JpInputOptions) {
  const inputValue = ref("");
  const mode = ref<Mode>(Mode.Input);
  const userInputWords = reactive<JpInputWord[]>([]);
  let currentEditWord: JpInputWord | undefined;

  function createWord(token: JpToken, id: number) {
    return reactive<JpInputWord>({
      text: token.text,
      kana: token.kana,
      userInput: "",
      incorrect: false,
      isActive: false,
      start: 0,
      end: 0,
      id,
    });
  }

  function setupUserInputWords() {
    userInputWords.splice(0, userInputWords.length);
    options.tokens().forEach((token, id) => {
      userInputWords.push(createWord(token, id));
    });
    if (userInputWords.length) userInputWords[0].isActive = true;
  }

  function initialize() {
    mode.value = Mode.Input;
    inputValue.value = "";
    currentEditWord = undefined;
    setupUserInputWords();
    updateActiveWord(0);
  }

  // ===== 输入串 ↔ 单词 双向同步 =====
  function setInputValue(val: string) {
    inputValue.value = val;
    resetAllWordUserInput();
    inputSyncUserInputWords();
    updateActiveWord(val ? options.getInputCursorPosition() : 0);
  }

  function userInputWordsSyncInput() {
    inputValue.value = userInputWords.map((w) => w.userInput).join(separator);
  }

  function inputSyncUserInputWords() {
    let position = 0;
    inputValue.value.split(separator).forEach((input, index) => {
      const word = userInputWords[index];
      if (!word) return;
      word.userInput = input;
      word.start = position;
      word.end = position + input.length;
      position += input.length + 1; // 每个词后补一个空格
    });
  }

  function resetAllWordUserInput() {
    userInputWords.forEach((w) => {
      w.userInput = "";
    });
  }

  function resetAllWordActive() {
    userInputWords.forEach((w) => {
      w.isActive = false;
    });
  }

  function updateActiveWord(position: number) {
    resetAllWordActive();
    for (const word of userInputWords) {
      if (position >= word.start && position <= word.end) {
        word.isActive = true;
        break;
      }
    }
  }

  function getActiveWord() {
    return userInputWords.find((w) => w.isActive);
  }

  // ===== 判定 =====
  function isWordComplete(word: JpInputWord): boolean {
    const token = options.tokens()[word.id];
    if (!token) return false;
    return checkToken(word.userInput, token, options.isSingleKana());
  }

  function markIncorrectWord() {
    userInputWords.forEach((word) => {
      word.incorrect = !isWordComplete(word);
    });
  }

  function checkWordCorrect() {
    return userInputWords.every((w) => !w.incorrect);
  }

  function lastWordIsActive() {
    const len = userInputWords.length;
    if (!len) return false;
    return userInputWords[len - 1].isActive;
  }

  // ===== 修复导航 =====
  function findNextIncorrectWord() {
    if (!currentEditWord) return;
    const wordIndex = userInputWords.findIndex((w) => w.id === currentEditWord!.id);
    for (let i = wordIndex + 1; i < userInputWords.length; i++) {
      if (userInputWords[i].incorrect) return userInputWords[i];
    }
  }

  function isLastIncorrectWord() {
    return !findNextIncorrectWord();
  }

  function getFirstIncorrectWord() {
    return userInputWords.find((w) => w.incorrect);
  }

  async function clearNextIncorrectWord(word: JpInputWord) {
    word.userInput = "";
    currentEditWord = word;
    userInputWordsSyncInput();
    await nextTick();
    options.setInputCursorPosition(word.start);
    updateActiveWord(word.start);
  }

  function findPreviousIncorrectWord() {
    if (!currentEditWord) return;
    const wordIndex = userInputWords.findIndex((w) => w.id === currentEditWord!.id);
    for (let i = wordIndex - 1; i >= 0; i--) {
      if (userInputWords[i].incorrect) return userInputWords[i];
    }
  }

  async function activePreviousIncorrectWord() {
    const previous = findPreviousIncorrectWord();
    if (previous) {
      currentEditWord = previous;
      await nextTick();
      updateActiveWord(previous.end);
      options.setInputCursorPosition(previous.end);
    }
  }

  function isEmptyOfCurrentEditWord() {
    return !currentEditWord || currentEditWord.userInput.length <= 0;
  }

  // ===== 提交 =====
  function submitAnswer(correctCallback?: () => void, wrongCallback?: () => void) {
    if (mode.value === Mode.Fix) return; // Fix 模式下不能提交（必须先进修复）
    resetAllWordActive();
    markIncorrectWord();

    if (checkWordCorrect()) {
      mode.value = Mode.Input;
      correctCallback?.();
      inputValue.value = "";
    } else {
      mode.value = Mode.Fix;
      wrongCallback?.();
    }
  }

  async function fixFirstIncorrectWord() {
    if (mode.value === Mode.Fix) {
      mode.value = Mode.Fix_Input;
      await clearNextIncorrectWord(getFirstIncorrectWord()!);
      options.fixCallback?.();
    }
  }

  async function fixNextIncorrectWord() {
    if (mode.value === Mode.Fix_Input) {
      await clearNextIncorrectWord(findNextIncorrectWord()!);
      options.fixCallback?.();
    }
  }

  async function fixIncorrectWord() {
    if (mode.value === Mode.Fix) await fixFirstIncorrectWord();
    else if (mode.value === Mode.Fix_Input) await fixNextIncorrectWord();
  }

  // 空格处理（桌面 keydown 与手机虚拟键盘 onInput 共用）。
  // 返回 true 表示「空格已被消费」（调用方应 preventDefault / 从输入串中剔除）。
  function handleSpace(submit?: () => void): boolean {
    // Fix：任意键进入修复，空格/退格不落字
    if (mode.value === Mode.Fix) {
      fixFirstIncorrectWord();
      return true;
    }
    // Fix_Input：最后一个错误词空格 = 重新提交；否则跳到下一个错误词
    if (mode.value === Mode.Fix_Input) {
      if (isLastIncorrectWord()) {
        submit?.();
        return true;
      }
      fixNextIncorrectWord();
      return true;
    }
    // Input：所有意群都已输入（非空）→ 空格提交；否则中间词仅「拼完整」才放行空格前进
    const allFilled =
      userInputWords.length > 0 && userInputWords.every((w) => w.userInput !== "");
    if (allFilled) {
      submit?.();
      return true;
    }
    const active = getActiveWord();
    if (!active) return true;
    const last = userInputWords[userInputWords.length - 1];
    if (active.id === last.id) return true; // 最后一个词未填完，吞空格
    if (!isWordComplete(active)) return true; // 中间词不完整，吞空格
    return false; // 中间词完整，放行空格（正常前进）
  }

  function handleKeyboardInput(e: KeyboardEvent, submit?: () => void) {
    // 禁止方向键移动光标（避免与逐词定位冲突）
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      e.preventDefault();
      return;
    }

    if (e.code === "Space") {
      if (handleSpace(submit)) e.preventDefault();
      return;
    }

    // Fix 模式下按下任意键（含退格/字母）→ 定位第一个错误词并清空；
    // 字母键不 preventDefault，直接上屏成为该词第一个字符。
    if (mode.value === Mode.Fix) {
      if (e.code === "Backspace") e.preventDefault();
      fixFirstIncorrectWord();
      options.inputChangedCallback?.(e);
      return;
    }

    // Fix_Input 模式下当前词为空时，退格 = 回到上一个错误词
    if (mode.value === Mode.Fix_Input && e.code === "Backspace" && isEmptyOfCurrentEditWord()) {
      e.preventDefault();
      activePreviousIncorrectWord();
      options.inputChangedCallback?.(e);
      return;
    }

    options.inputChangedCallback?.(e);
  }

  return {
    inputValue,
    userInputWords,
    initialize,
    setInputValue,
    submitAnswer,
    handleKeyboardInput,
    handleSpace,
    fixIncorrectWord,
    fixFirstIncorrectWord,
    isFixMode: () => mode.value === Mode.Fix,
    isFixInputMode: () => mode.value === Mode.Fix_Input,
    findWordById: (id: number) => userInputWords.find((w) => w.id === id),
    currentEditWordId: () => currentEditWord?.id,
  };
}
