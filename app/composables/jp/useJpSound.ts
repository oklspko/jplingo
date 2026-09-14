let audioCtx: AudioContext | null = null;
let lastTypingTime = 0;

function ensureAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

/* ============ 移动端音频解锁 ============ */
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    ensureAudioCtx();
  } catch {}
  // 预热 speechSynthesis（iOS 首次需要用户手势才会初始化）
  try {
    if (window.speechSynthesis) {
      const warm = new SpeechSynthesisUtterance(" ");
      warm.volume = 0;
      speechSynthesis.speak(warm);
    }
  } catch {}
}

if (typeof window !== "undefined") {
  const unlock = () => unlockAudio();
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

/* ============ 打字音效 ============ */
export function playTypingSound() {
  const now = Date.now();
  if (now - lastTypingTime < 22) return;
  lastTypingTime = now;
  try {
    const ctx = ensureAudioCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.025);
    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.035);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(4800, t);
    gain2.gain.setValueAtTime(0.14, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.02);
  } catch {}
}

/* ============ 跳错音效 ============ */
export function playJumpSound() {
  try {
    const ctx = ensureAudioCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1600, t);
    osc.frequency.exponentialRampToValueAtTime(2400, t + 0.08);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  } catch {}
}

/* ============ 成功音效 ============ */
export function playSuccessSound() {
  try {
    const ctx = ensureAudioCtx();
    const t = ctx.currentTime;
    [1500, 2200].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = t + i * 0.07;
      gain.gain.setValueAtTime(0.38, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    });
  } catch {}
}

/* ============ 错误音效 ============ */
export function playErrorSound() {
  try {
    const ctx = ensureAudioCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.15);
    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  } catch {}
}

/* ============================================================
   日语 TTS —— 自动选择最高质量的语音
   ============================================================ */

// 优先级列表：越靠前越优先
const PREFERRED_VOICES = [
  // 微软云端 Natural 语音（Edge 浏览器，音质最好）
  "Microsoft Nanami Online (Natural) - Japanese (Japan)",
  "Microsoft Keita Online (Natural) - Japanese (Japan)",
  "Microsoft Aoi Online (Natural) - Japanese (Japan)",
  "Microsoft Daichi Online (Natural) - Japanese (Japan)",
  "Microsoft Mayu Online (Natural) - Japanese (Japan)",
  "Microsoft Shiori Online (Natural) - Japanese (Japan)",
  "Microsoft Ichiro Online (Natural) - Japanese (Japan)",
  // 微软云端（旧命名）
  "Microsoft Nanami Online",
  "Microsoft Keita Online",
  "Microsoft Aoi Online",
  // Google 日语
  "Google 日本語",
  "Google Japanese",
  // macOS / iOS
  "Kyoko",
  "Otoya",
  "Hattori",
];

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

/**
 * 选一个最佳日语语音
 */
function pickBestJapaneseVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  voicesLoaded = true;
  const jaVoices = voices.filter((v) =>
    v.lang.toLowerCase().startsWith("ja"),
  );

  if (jaVoices.length === 0) return null;

  // 1. 白名单精确匹配
  for (const name of PREFERRED_VOICES) {
    const match = jaVoices.find(
      (v) => v.name === name || v.name.includes(name),
    );
    if (match) {
      cachedVoice = match;
      console.log("[jp-lingo] 使用语音：", match.name);
      return match;
    }
  }

  // 2. 名字里带 Natural / Online（云端高质量）
  const natural = jaVoices.find(
    (v) =>
      v.name.toLowerCase().includes("natural") ||
      v.name.toLowerCase().includes("online"),
  );
  if (natural) {
    cachedVoice = natural;
    console.log("[jp-lingo] 使用语音（Natural/Online）：", natural.name);
    return natural;
  }

  // 3. 退到第一个日语语音
  cachedVoice = jaVoices[0];
  console.log("[jp-lingo] 使用语音（降级）：", jaVoices[0].name);
  return cachedVoice;
}

// 页面加载时预加载 voices
if (typeof window !== "undefined" && window.speechSynthesis) {
  // 先加载一次（部分浏览器首次为空）
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickBestJapaneseVoice();
  };
}

/**
 * 日语发音
 * @param text 要发音的文本（假名或句子）
 * @param rate 语速（0.5 ~ 2.0，默认 0.9）
 */
export function speakJapanese(text: string, rate = 0.9) {
  if (!text) return;
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  unlockAudio();

  const utt = new SpeechSynthesisUtterance(text);
  const voice = pickBestJapaneseVoice();

  if (voice) {
    utt.voice = voice;
    utt.lang = voice.lang;
  } else {
    utt.lang = "ja-JP";
  }

  utt.rate = rate;      // 语速
  utt.pitch = 1.0;      // 音调
  utt.volume = 1.0;     // 音量

  try {
    speechSynthesis.cancel();
    // iOS Safari 在 cancel 后立即 speak 可能被吞掉，延时一小段时间再播
    setTimeout(() => {
      try { speechSynthesis.speak(utt); } catch {}
    }, 60);
  } catch {
    try { speechSynthesis.speak(utt); } catch {}
  }
}

/**
 * 获取当前使用的语音名称（用于诊断）
 */
export function getCurrentVoiceName(): string {
  const v = pickBestJapaneseVoice();
  return v ? v.name : "(未找到日语语音)";
}