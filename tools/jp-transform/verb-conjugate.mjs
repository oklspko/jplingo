// 动词变形规则（11 种）— 基于活用类型，正确处理音便
import { classify, stemOf } from "./verb-class.mjs";
import { toDan, toMizen, info } from "./kana.mjs";
import { toRomaji } from "./romaji.mjs";

// 五段动词 词尾假名 -> 音便形（て/た 用）
function teOnbin(tailKana) {
  // う -> って（う 在五十音中属 わ行，特殊处理）
  if (tailKana === "う") return "って";
  const i = info(tailKana);
  if (!i) return null;
  switch (i.row) {
    case "k": return "いて";
    case "g": return "いで";
    case "s": return "して";
    case "t": case "r": return "って";
    case "n": case "b": case "m": return "んで";
    default: return null;
  }
}

// サ変词干：从 dict/kana 里剥掉结尾的 する
function suruStems(dict, kana) {
  const kanji = /する$/.test(dict) ? dict.slice(0, -2) : dict;
  const k = /する$/.test(kana) ? kana.slice(0, -2) : kana;
  return { kanji, kana: k };
}

/**
 * 动词变形。
 * @returns {{form:string, kana:string, romaji:string, ok:boolean}}
 */
export function conjugateVerb(dict, kana, formKey) {
  const k = (kana || dict || "").trim();
  const type = classify(dict, k);
  const { kanji: ks, kana: kk } = stemOf(dict, k, type);

  const tailKana = k.slice(-1);
  const tailKanji = dict.slice(-1);

  let kanji = "", kanaOut = "";

  switch (formKey) {
    case "masu": {
      if (type === "godan") {
        const t = toDan(tailKana, 1) || tailKanji;
        kanji = ks + t + "ます"; kanaOut = kk + (toDan(tailKana, 1) || "") + "ます";
      } else if (type === "ichidan") {
        kanji = ks + "ます"; kanaOut = kk + "ます";
      } else if (type === "suru") {
        const s = suruStems(dict, k);
        kanji = s.kanji + "します"; kanaOut = s.kana + "します";
      } else {
        kanji = "来ます"; kanaOut = "きます";
      }
      break;
    }
    case "nai": {
      if (type === "godan") {
        const t = toMizen(tailKana) || tailKanji;
        kanji = ks + t + "ない"; kanaOut = kk + (toMizen(tailKana) || "") + "ない";
      } else if (type === "ichidan") {
        kanji = ks + "ない"; kanaOut = kk + "ない";
      } else if (type === "suru") {
        const s = suruStems(dict, k);
        kanji = s.kanji + "しない"; kanaOut = s.kana + "しない";
      } else {
        kanji = "来ない"; kanaOut = "こない";
      }
      break;
    }
    case "te": {
      if (type === "godan") {
        let t;
        if (tailKana === "く" && k === "いく") t = "って";
        else if (tailKana === "く") t = "いて";
        else if (tailKana === "ぐ") t = "いで";
        else t = teOnbin(tailKana);
        kanji = ks + t; kanaOut = kk + t;
      } else if (type === "ichidan") {
        kanji = ks + "て"; kanaOut = kk + "て";
      } else if (type === "suru") {
        const s = suruStems(dict, k);
        kanji = s.kanji + "して"; kanaOut = s.kana + "して";
      } else {
        kanji = "来て"; kanaOut = "きて";
      }
      break;
    }
    case "ta": {
      const te = conjugateVerb(dict, k, "te");
      kanji = te.form.replace(/て$/, "た").replace(/で$/, "だ");
      kanaOut = te.kana.replace(/て$/, "た").replace(/で$/, "だ");
      break;
    }
    case "ba": {
      if (type === "godan") {
        const t = toDan(tailKana, 3) || tailKanji;
        kanji = ks + t + "ば"; kanaOut = kk + (toDan(tailKana, 3) || "") + "ば";
      } else if (type === "ichidan") {
        kanji = ks + "れば"; kanaOut = kk + "れば";
      } else if (type === "suru") {
        const s = suruStems(dict, k);
        kanji = s.kanji + "すれば"; kanaOut = s.kana + "すれば";
      } else {
        kanji = "来れば"; kanaOut = "くれば";
      }
      break;
    }
    case "volitional": {
      if (type === "godan") {
        const t = toDan(tailKana, 4) || tailKanji;
        kanji = ks + t + "う"; kanaOut = kk + (toDan(tailKana, 4) || "") + "う";
      } else if (type === "ichidan") {
        kanji = ks + "よう"; kanaOut = kk + "よう";
      } else if (type === "suru") {
        const s = suruStems(dict, k);
        kanji = s.kanji + "しよう"; kanaOut = s.kana + "しよう";
      } else {
        kanji = "来よう"; kanaOut = "こよう";
      }
      break;
    }
    case "potential": {
      if (type === "godan") {
        const t = toDan(tailKana, 3) || tailKanji;
        kanji = ks + t + "る"; kanaOut = kk + (toDan(tailKana, 3) || "") + "る";
      } else if (type === "ichidan") {
        kanji = ks + "られる"; kanaOut = kk + "られる";
      } else if (type === "suru") {
        const s = suruStems(dict, k);
        kanji = s.kanji + "できる"; kanaOut = s.kana + "できる";
      } else {
        kanji = "来られる"; kanaOut = "こられる";
      }
      break;
    }
    case "passive": {
      if (type === "godan") {
        const t = toMizen(tailKana) || tailKanji;
        kanji = ks + t + "れる"; kanaOut = kk + (toMizen(tailKana) || "") + "れる";
      } else if (type === "ichidan") {
        kanji = ks + "られる"; kanaOut = kk + "られる";
      } else if (type === "suru") {
        const s = suruStems(dict, k);
        kanji = s.kanji + "される"; kanaOut = s.kana + "される";
      } else {
        kanji = "来られる"; kanaOut = "こられる";
      }
      break;
    }
    case "causative": {
      if (type === "godan") {
        const t = toMizen(tailKana) || tailKanji;
        kanji = ks + t + "せる"; kanaOut = kk + (toMizen(tailKana) || "") + "せる";
      } else if (type === "ichidan") {
        kanji = ks + "させる"; kanaOut = kk + "させる";
      } else if (type === "suru") {
        const s = suruStems(dict, k);
        kanji = s.kanji + "させる"; kanaOut = s.kana + "させる";
      } else {
        kanji = "来させる"; kanaOut = "こさせる";
      }
      break;
    }
    case "imperative": {
      if (type === "godan") {
        const t = toDan(tailKana, 3) || tailKanji;
        kanji = ks + t; kanaOut = kk + (toDan(tailKana, 3) || "");
      } else if (type === "ichidan") {
        kanji = ks + "ろ"; kanaOut = kk + "ろ";
      } else if (type === "suru") {
        const s = suruStems(dict, k);
        kanji = s.kanji + "しろ"; kanaOut = s.kana + "しろ";
      } else {
        kanji = "来い"; kanaOut = "こい";
      }
      break;
    }
    default:
      kanji = dict; kanaOut = k;
  }

  return { form: kanji, kana: kanaOut, romaji: toRomaji(kanaOut), ok: !!kanji };
}

export const VERB_FORMS = [
  "masu", "nai", "te", "ta", "ba", "volitional",
  "potential", "passive", "causative", "imperative",
];
