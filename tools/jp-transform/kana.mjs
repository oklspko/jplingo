// 假名段映射表（完整五十音）— 变形规则的基础
// dan: 0=あ段 1=い段 2=う段 3=え段 4=お段
// row: 词尾所属行（用于五段动词变形的行替换）

export const DAN_NAMES = ["a", "i", "u", "e", "o"];

// 每行： [あ, い, う, え, お]（缺项为 null，如 や行、わ行）
export const ROWS = {
  a: ["あ", "い", "う", "え", "お"],
  k: ["か", "き", "く", "け", "こ"],
  g: ["が", "ぎ", "ぐ", "げ", "ご"],
  s: ["さ", "し", "す", "せ", "そ"],
  t: ["た", "ち", "つ", "て", "と"],
  n: ["な", "に", "ぬ", "ね", "の"],
  h: ["は", "ひ", "ふ", "へ", "ほ"],
  b: ["ば", "び", "ぶ", "べ", "ぼ"],
  m: ["ま", "み", "む", "め", "も"],
  y: ["や", null, "ゆ", null, "よ"],
  r: ["ら", "り", "る", "れ", "ろ"],
  w: ["わ", null, null, null, "を"],
};

// 假名 → { row, dan }
const KANA_INDEX = {};
for (const [row, arr] of Object.entries(ROWS)) {
  arr.forEach((k, dan) => {
    if (k) KANA_INDEX[k] = { row, dan };
  });
}
// 浊音/半浊音归入对应行（が 行 = g，ざ 行 = s 的浊化，だ 行 = t 的浊化）
const DAKUON = {
  が: ["g", 0], ぎ: ["g", 1], ぐ: ["g", 2], げ: ["g", 3], ご: ["g", 4],
  ざ: ["s", 0], じ: ["s", 1], ず: ["s", 2], ぜ: ["s", 3], ぞ: ["s", 4],
  だ: ["t", 0], ぢ: ["t", 1], づ: ["t", 2], で: ["t", 3], ど: ["t", 4],
  ば: ["b", 0], び: ["b", 1], ぶ: ["b", 2], べ: ["b", 3], ぼ: ["b", 4],
  ぱ: ["h", 0], ぴ: ["h", 1], ぷ: ["h", 2], ぺ: ["h", 3], ぽ: ["h", 4],
};
for (const [k, [row, dan]] of Object.entries(DAKUON)) {
  KANA_INDEX[k] = { row, dan };
}

/** 取假名的 {row, dan}；非假名（如汉字）返回 null */
export function info(kana) {
  return KANA_INDEX[kana] || null;
}

/** 把假名变到指定段（同行的目标段）。无法变则返回 null */
export function toDan(kana, targetDan) {
  const i = info(kana);
  if (!i) return null;
  const row = ROWS[i.row];
  if (!row) return null;
  return row[targetDan] || null;
}

/**
 * 五段动词未然形（あ段）。与 toDan(kana, 0) 的唯一差异：
 * う 的未然形是 わ（買う→買わない），而非 あ。toDan 会把 う 归到 あ行，
 * 其「あ段」返回 あ，故这里单独把 う 特判成 わ。
 */
export function toMizen(kana) {
  if (kana === "う") return "わ";
  return toDan(kana, 0);
}

/** 判断假名是否在 い段 或 え段（用于一段动词判定） */
export function isIE(kana) {
  const i = info(kana);
  return !!i && (i.dan === 1 || i.dan === 3);
}

/** 判断假名是否在 あ段 / う段 / お段 */
export function isAUO(kana) {
  const i = info(kana);
  return !!i && (i.dan === 0 || i.dan === 2 || i.dan === 4);
}
