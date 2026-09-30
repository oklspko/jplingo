// 动词活用类型判定：五段 / 一段 / サ変 / カ変
import { info, isIE } from "./kana.mjs";

// 五段 る 结尾动词（上一段/下一段规则的反例），必须按「辞书形（汉字）」白名单判定。
// 不能按读音判定：练る(ねる,五段) 与 寝る(ねる,一段)、帰る(かえる,五段) 与 変える(かえる,一段)
// 读音完全相同，只能靠汉字区分。
const GODAN_RU = new Set([
  "帰る", "入る", "走る", "切る", "知る", "要る", "滑る", "減る", "蹴る",
  "焦る", "茂る", "照る", "握る", "捻る", "練る", "参る", "喋る", "限る",
  "陥る", "覆る", "裏切る", "翻る", "湿る", "放る", "漲る",
]);

/**
 * 判定动词活用类型。
 * @param {string} dict 辞书形（含汉字，可纯假名）
 * @param {string} kana 读音（平假名，必需）
 * @returns {"godan"|"ichidan"|"suru"|"kuru"}
 */
export function classify(dict, kana) {
  const k = (kana || dict || "").trim();
  // カ変
  if (k === "くる" || k === "来る" || k.endsWith("くる") && k.length <= 3 && k.includes("来")) {
    if (k === "くる" || k === "来る") return "kuru";
  }
  // サ変
  if (k === "する" || k.endsWith("する")) return "suru";

  // 五段 る 结尾动词（白名单，按汉字区分）
  if (GODAN_RU.has(dict)) return "godan";

  const last = k.slice(-1);
  if (last !== "る") return "godan";

  // る 结尾：看前一个假名
  const prev = k.slice(-2, -1);
  if (prev && isIE(prev)) return "ichidan"; // い段/え段 → 一段
  return "godan"; // あ段/う段/お段 → 五段
}

/** 取词干：一段去る；五段取到最后一个假名前；suru/kuru 特殊 */
export function stemOf(dict, kana, type) {
  if (type === "ichidan") {
    return { kanji: dict.slice(0, -1), kana: kana.slice(0, -1) };
  }
  if (type === "godan") {
    return { kanji: dict.slice(0, -1), kana: kana.slice(0, -1) };
  }
  return { kanji: dict, kana };
}
