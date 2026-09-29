// 一次性数据修复（统一入口）：从 git HEAD 原始数据出发，一次性把 JLPT/高考/句子生长 课程里
// 「片假名长音 ー 被 toHiragana/toRomaji 展开成双元音」的问题统一修复：
//   1) kana：あぱあと → あぱーと（仅纯片假名词与少量混合词）
//   2) romaji：apaato → apa-to、intaanetto → inta-netto（单词按 kana 重算；句子逐 token 替换，
//      保留助词 は→wa、逗号、促音 っ 双写辅音）
// 幂等，可重复运行。读取 git HEAD 作为原始基线，避免在已部分修复的中间态上叠加出错。
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { toRomaji } = require("wanakana");

// ===== 与 app/composables/jp/useJpRomaji.ts 保持一致 =====
function katakanaToHiragana(str) {
  return str.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}
function hiraganaToKatakana(str) {
  return str.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

const KANA_ROMAJI_TWO = {
  "きゃ": "kya", "きゅ": "kyu", "きょ": "kyo",
  "ぎゃ": "gya", "ぎゅ": "gyu", "ぎょ": "gyo",
  "しゃ": "sha", "しゅ": "shu", "しょ": "sho",
  "じゃ": "ja", "じゅ": "ju", "じょ": "jo",
  "ちゃ": "cha", "ちゅ": "chu", "ちょ": "cho",
  "にゃ": "nya", "にゅ": "nyu", "にょ": "nyo",
  "ひゃ": "hya", "ひゅ": "hyu", "ひょ": "hyo",
  "びゃ": "bya", "びゅ": "byu", "びょ": "byo",
  "ぴゃ": "pya", "ぴゅ": "pyu", "ぴょ": "pyo",
  "みゃ": "mya", "みゅ": "myu", "みょ": "myo",
  "りゃ": "rya", "りゅ": "ryu", "りょ": "ryo",
  "ふぁ": "fa", "ふぃ": "fi", "ふぇ": "fe", "ふぉ": "fo",
  "てぃ": "thi", "でぃ": "dhi",
  "うぃ": "wi", "うぇ": "we", "うぉ": "who",
  "ゔぁ": "va", "ゔぃ": "vi", "ゔぇ": "ve", "ゔぉ": "vo",
  "いぇ": "ye",
  "くぁ": "kwa", "くぃ": "qwi", "くぇ": "kwe", "くぉ": "kwo",
  "つぁ": "tsa", "つぃ": "tsi", "つぇ": "tse", "つぉ": "tso",
  "とぅ": "twu", "どぅ": "dwu",
};

// 展示写法里 ティ 记为 ti（wanakana toRomaji 给 tei）
const DISPLAY_TWO_OVERRIDE = { "てぃ": "ti" };
function displayTwo(two) {
  return DISPLAY_TWO_OVERRIDE[two] ?? toRomaji(hiraganaToKatakana(two));
}
function displayMora(src, i) {
  const two = src.slice(i, i + 2);
  if (KANA_ROMAJI_TWO[two]) return { romaji: displayTwo(two), len: 2 };
  return { romaji: toRomaji(hiraganaToKatakana(src[i])), len: 1 };
}
// 存储 romaji 的展示写法（长音 ー 展开为双元音；促音 っ 双写下一音节辅音首字母）
function displayDoubleVowelRomaji(kana) {
  const src = katakanaToHiragana(kana);
  let out = "";
  for (let i = 0; i < src.length; ) {
    const ch = src[i];
    if (ch === "ー") { out += out.charAt(out.length - 1); i++; continue; }
    if (ch === "っ") {
      if (i + 1 < src.length) out += displayMora(src, i + 1).romaji[0];
      else out += "xtu";
      i++;
      continue;
    }
    const m = displayMora(src, i);
    out += m.romaji;
    i += m.len;
  }
  return out;
}
// 统一后的展示写法（长音 ー 用减号 -）
function displayDashRomaji(kana) {
  const src = katakanaToHiragana(kana);
  let out = "";
  for (let i = 0; i < src.length; ) {
    const ch = src[i];
    if (ch === "ー") { out += "-"; i++; continue; }
    if (ch === "っ") {
      if (i + 1 < src.length) out += displayMora(src, i + 1).romaji[0];
      else out += "xtu";
      i++;
      continue;
    }
    const m = displayMora(src, i);
    out += m.romaji;
    i += m.len;
  }
  return out;
}

function walk(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) out.push(...walk(p));
    else if (f.endsWith(".json")) out.push(p);
  }
  return out;
}

// 从 git HEAD 读取原始内容（作为干净基线）
function readOriginal(relPath) {
  return execFileSync("git", ["show", `HEAD:${relPath}`], { encoding: "utf8" });
}

const PURE_KATA = /^[ァ-ヶー・、。]+$/;
const MIXED_KANA_FIX = { "段ボール": "だんぼーる" };

let kanaFixed = 0;
let romajiFixed = 0;
const files = [];
for (const f of walk("public/courses")) {
  const rel = f.replace(/\\/g, "/");
  let data;
  try {
    data = JSON.parse(readOriginal(rel));
  } catch (e) {
    // 未纳入 git（新文件）则直接读工作区
    data = JSON.parse(fs.readFileSync(f, "utf8"));
  }
  let changed = false;
  for (const s of data.statements || []) {
    const jp = s.japanese || "";
    const kana = s.kana || "";

    // ---- 1) kana：双元音 → ー ----
    if (/ー/.test(jp) && !/ー/.test(kana)) {
      let newKana;
      if (PURE_KATA.test(jp)) newKana = katakanaToHiragana(jp);
      else if (MIXED_KANA_FIX[jp]) newKana = MIXED_KANA_FIX[jp];
      if (newKana) {
        s.kana = newKana;
        for (const t of s.tokens || []) {
          t.kana = PURE_KATA.test(t.text) ? katakanaToHiragana(t.text) : newKana;
        }
        changed = true;
        kanaFixed++;
      }
    }

    // ---- 2) romaji：双元音 → - ----
    const k = s.kana || "";
    if (/ー/.test(k)) {
      const toks = s.tokens || [];
      let r;
      if (toks.length <= 1) {
        r = displayDashRomaji(k);
      } else {
        const romaji = s.romaji || "";
        r = romaji;
        let pos = 0;
        let ok = true;
        for (const t of toks) {
          const oldR = displayDoubleVowelRomaji(t.kana);
          const newR = displayDashRomaji(t.kana);
          if (oldR === newR) continue;
          const idx = r.indexOf(oldR, pos);
          if (idx < 0) { ok = false; break; }
          r = r.slice(0, idx) + newR + r.slice(idx + oldR.length);
          pos = idx + newR.length;
        }
        if (!ok) r = toks.map((t) => displayDashRomaji(t.kana)).join(" ");
      }
      if (r !== s.romaji) {
        s.romaji = r;
        changed = true;
        romajiFixed++;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(f, JSON.stringify(data, null, 2) + "\n", "utf8");
    files.push(f);
  }
}
console.log(`kana 修复 ${kanaFixed} 条，romaji 修复 ${romajiFixed} 条，涉及 ${files.length} 个文件`);
