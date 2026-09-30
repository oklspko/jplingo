import { Capacitor } from "@capacitor/core";
import { cacheBustUrl } from "~/composables/jp/useJpBuildId";

let audioCtx: AudioContext | null = null;
let lastTypingTime = 0;

function ensureAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
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
   日语发音 —— 优先播放预生成的讯飞音频，未生成时退回浏览器 TTS
   ============================================================ */

// 音频静态目录。若以后把音频挪到自托管服务器，改这里即可（如 https://api.jplingo.cn/audio）
const AUDIO_BASE = "/audio";

let manifest: Record<string, string> | null = null;
let manifestPromise: Promise<Record<string, string> | null> | null = null;
let audioEl: HTMLAudioElement | null = null;

// 懒加载 public/audio/manifest.json（kana → 文件名），失败返回 null
function loadManifest(): Promise<Record<string, string> | null> {
  if (manifest) return Promise.resolve(manifest);
  if (!manifestPromise) {
    manifestPromise = fetch(cacheBustUrl(`${AUDIO_BASE}/manifest.json`))
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((m) => {
        manifest = m && typeof m === "object" ? (m as Record<string, string>) : null;
        return manifest;
      });
  }
  return manifestPromise;
}

// 与生成脚本保持一致：去掉所有空白后的假名串作为查表键
function normalizeKey(text: string): string {
  return text.replace(/\s+/g, "");
}

function ensureAudioEl(): HTMLAudioElement {
  if (!audioEl) audioEl = new Audio();
  return audioEl;
}

/* ---- 兜底：浏览器自带 TTS ---- */

// 优先级列表：越靠前越优先
const PREFERRED_VOICES = [
  "Microsoft Nanami Online (Natural) - Japanese (Japan)",
  "Microsoft Keita Online (Natural) - Japanese (Japan)",
  "Microsoft Aoi Online (Natural) - Japanese (Japan)",
  "Microsoft Daichi Online (Natural) - Japanese (Japan)",
  "Microsoft Mayu Online (Natural) - Japanese (Japan)",
  "Microsoft Shiori Online (Natural) - Japanese (Japan)",
  "Microsoft Ichiro Online (Natural) - Japanese (Japan)",
  "Microsoft Nanami Online",
  "Microsoft Keita Online",
  "Microsoft Aoi Online",
  "Google 日本語",
  "Google Japanese",
  "Kyoko",
  "Otoya",
  "Hattori",
];

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickBestJapaneseVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const jaVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("ja"));
  if (jaVoices.length === 0) return null;

  for (const name of PREFERRED_VOICES) {
    const match = jaVoices.find((v) => v.name === name || v.name.includes(name));
    if (match) {
      cachedVoice = match;
      return match;
    }
  }

  const natural = jaVoices.find(
    (v) =>
      v.name.toLowerCase().includes("natural") ||
      v.name.toLowerCase().includes("online"),
  );
  if (natural) {
    cachedVoice = natural;
    return natural;
  }

  cachedVoice = jaVoices[0];
  return cachedVoice;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickBestJapaneseVoice();
  };
}

function speakViaWebSpeech(text: string, rate: number) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  speechSynthesis.cancel();

  const utt = new SpeechSynthesisUtterance(text);
  const voice = pickBestJapaneseVoice();
  if (voice) {
    utt.voice = voice;
    utt.lang = voice.lang;
  } else {
    utt.lang = "ja-JP";
  }

  utt.rate = rate;
  utt.pitch = 1.0;
  utt.volume = 1.0;
  speechSynthesis.speak(utt);
}

/**
 * 原生端兜底：Capacitor WebView 里 speechSynthesis 往往拿不到日语语音，
 * 改用系统 TTS（@capacitor-community/text-to-speech）。返回是否成功发声。
 */
async function speakViaNativeTts(text: string, rate: number): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
    const check = await TextToSpeech.isLanguageSupported({ lang: "ja-JP" });
    if (!check?.supported) return false;
    await TextToSpeech.stop();
    await TextToSpeech.speak({
      text,
      lang: "ja-JP",
      rate,
      pitch: 1.0,
      volume: 1.0,
      category: "playback",
    });
    return true;
  } catch {
    return false;
  }
}

/** 兜底发声：原生系统 TTS 优先（APK），其次浏览器 TTS（网页） */
function speakFallback(text: string, rate: number) {
  speakViaNativeTts(text, rate).then((ok) => {
    if (!ok) speakViaWebSpeech(text, rate);
  });
}

/**
 * 日语发音
 * 优先级：预生成音频（音质最好、可离线）→ 系统 TTS（原生 App）→ 浏览器 TTS（网页）
 * @param text 要发音的文本（假名或句子）
 * @param rate 语速（音频按 playbackRate 播放；TTS 走自身语速参数）
 */
export function speakJapanese(text: string, rate = 1.0) {
  if (!text) return;
  if (typeof window === "undefined") return;

  const key = normalizeKey(text);
  loadManifest()
    .then(() => {
      const file = manifest?.[key];
      if (file) {
        const el = ensureAudioEl();
        el.src = `${AUDIO_BASE}/${file}`;
        el.playbackRate = rate;
        el.currentTime = 0;
        el.addEventListener("error", () => speakFallback(text, rate), { once: true });
        el.play().catch(() => speakFallback(text, rate));
      } else {
        speakFallback(text, rate);
      }
    })
    .catch(() => speakFallback(text, rate));
}

/**
 * 获取当前使用的语音名称（用于诊断）
 */
export function getCurrentVoiceName(): string {
  const v = pickBestJapaneseVoice();
  return v ? v.name : "(未找到日语语音)";
}
