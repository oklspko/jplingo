// 动词变形（10 种基础形）——供生成脚本与校验脚本共用。
// 时态（过去）与肯否（否定）已在三类谓语句课程中覆盖，动词课只按基础变形种类分课，
// 每种基础形直接由 verb-conjugate 引擎产出，无派生形。
import { conjugateVerb } from "./verb-conjugate.mjs";
import { toRomaji } from "./romaji.mjs";
import { VERB_FORMS } from "./seeds.mjs";

/**
 * 按课程变形类型对动词变形。
 * @param {string} dict 辞书形（含汉字）
 * @param {string} kana 读音（平假名）
 * @param {string} formKey VERB_FORMS 中的 key（masu/nai/te/ta/ba/ishi/kanou/ukemi/shieki/meirei）
 * @returns {{japanese:string, kana:string, romaji:string}}
 */
export function conjugateVerbForm(dict, kana, formKey) {
  const form = VERB_FORMS.find((f) => f.key === formKey);
  if (!form) throw new Error(`未知动词变形类型：${formKey}`);

  const base = conjugateVerb(dict, kana, form.engine);
  return { japanese: base.form, kana: base.kana, romaji: toRomaji(base.kana) };
}
