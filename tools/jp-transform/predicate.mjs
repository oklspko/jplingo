// 三类谓语句变形：名词句 / い形容词句 / な形容词句（8 种：敬简体 × 肯否 × 时态）
import { toRomaji } from "./romaji.mjs";

export const PRED_FORMS = [
  { key: "plain_pres_aff", label: "简体·现在·肯定" },
  { key: "plain_pres_neg", label: "简体·现在·否定" },
  { key: "plain_past_aff", label: "简体·过去·肯定" },
  { key: "plain_past_neg", label: "简体·过去·否定" },
  { key: "polite_pres_aff", label: "敬体·现在·肯定" },
  { key: "polite_pres_neg", label: "敬体·现在·否定" },
  { key: "polite_past_aff", label: "敬体·过去·肯定" },
  { key: "polite_past_neg", label: "敬体·过去·否定" },
];

// ---------- 名词谓语句 ----------
export function conjugateNoun(noun, kana, key) {
  // 名词：先生だ / 学校ではない / 雨だった / 本ではなかった ...
  const base = kana || noun;
  let kanji, kanaOut;
  switch (key) {
    case "plain_pres_aff": kanji = `${noun}だ`; kanaOut = `${base}だ`; break;
    case "plain_pres_neg": kanji = `${noun}ではない`; kanaOut = `${base}ではない`; break;
    case "plain_past_aff": kanji = `${noun}だった`; kanaOut = `${base}だった`; break;
    case "plain_past_neg": kanji = `${noun}ではなかった`; kanaOut = `${base}ではなかった`; break;
    case "polite_pres_aff": kanji = `${noun}です`; kanaOut = `${base}です`; break;
    case "polite_pres_neg": kanji = `${noun}ではありません`; kanaOut = `${base}ではありません`; break;
    case "polite_past_aff": kanji = `${noun}でした`; kanaOut = `${base}でした`; break;
    case "polite_past_neg": kanji = `${noun}ではありませんでした`; kanaOut = `${base}ではありませんでした`; break;
    default: kanji = noun; kanaOut = base;
  }
  return { form: kanji, kana: kanaOut, romaji: toRomaji(kanaOut), ok: true };
}

// ---------- い形容词谓语句 ----------
export function conjugateAdjI(adj, kana, key) {
  const base = kana || adj;
  const stem = adj.slice(0, -1);      // 去 い
  const stemKana = base.slice(0, -1);
  let kanji, kanaOut;
  switch (key) {
    case "plain_pres_aff": kanji = adj; kanaOut = base; break;
    case "plain_pres_neg": kanji = `${stem}くない`; kanaOut = `${stemKana}くない`; break;
    case "plain_past_aff": kanji = `${stem}かった`; kanaOut = `${stemKana}かった`; break;
    case "plain_past_neg": kanji = `${stem}くなかった`; kanaOut = `${stemKana}くなかった`; break;
    case "polite_pres_aff": kanji = `${adj}です`; kanaOut = `${base}です`; break;
    case "polite_pres_neg": kanji = `${stem}くないです`; kanaOut = `${stemKana}くないです`; break;
    case "polite_past_aff": kanji = `${stem}かったです`; kanaOut = `${stemKana}かったです`; break;
    case "polite_past_neg": kanji = `${stem}くなかったです`; kanaOut = `${stemKana}くなかったです`; break;
    default: kanji = adj; kanaOut = base;
  }
  return { form: kanji, kana: kanaOut, romaji: toRomaji(kanaOut), ok: true };
}

// ---------- な形容词谓语句 ----------
export function conjugateAdjNa(adj, kana, key) {
  const base = kana || adj;
  let kanji, kanaOut;
  switch (key) {
    case "plain_pres_aff": kanji = `${adj}だ`; kanaOut = `${base}だ`; break;
    case "plain_pres_neg": kanji = `${adj}ではない`; kanaOut = `${base}ではない`; break;
    case "plain_past_aff": kanji = `${adj}だった`; kanaOut = `${base}だった`; break;
    case "plain_past_neg": kanji = `${adj}ではなかった`; kanaOut = `${base}ではなかった`; break;
    case "polite_pres_aff": kanji = `${adj}です`; kanaOut = `${base}です`; break;
    case "polite_pres_neg": kanji = `${adj}ではありません`; kanaOut = `${base}ではありません`; break;
    case "polite_past_aff": kanji = `${adj}でした`; kanaOut = `${base}でした`; break;
    case "polite_past_neg": kanji = `${adj}ではありませんでした`; kanaOut = `${base}ではありませんでした`; break;
    default: kanji = adj; kanaOut = base;
  }
  return { form: kanji, kana: kanaOut, romaji: toRomaji(kanaOut), ok: true };
}
