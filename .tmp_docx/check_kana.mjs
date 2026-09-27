import fs from "fs";
import * as kuromoji from "@patdx/kuromoji";
import NodeDictionaryLoader from "@patdx/kuromoji/node";
const hasKanji = (s) => /[\u4e00-\u9fff]/.test(s);
const KANA_ONLY = /^[ぁ-んァ-ヶー゛゜ゔ・]+$/;
const KANJI_ONLY = /^[\u4e00-\u9fff・]+$/;
const katakanaToHiragana = (str) => str.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

function splitEntry(raw) {
  let freq = ""; const fm = raw.match(/^【(高|中|低|必|未)】\s*/);
  if (fm) { freq = fm[1]; raw = raw.slice(fm[0].length).trim(); }
  const nm = raw.match(/^\d+\s+/); if (nm) raw = raw.slice(nm[0].length).trim();
  let wordPart = raw, meaningPart = "";
  const paren = raw.match(/^[^\s（(]+[（(][^）)]*[）)]/);
  if (paren && paren[0].length < raw.length) { wordPart = raw.slice(0, paren[0].length).trim(); meaningPart = raw.slice(paren[0].length); }
  else { const acc = raw.search(/[①-⑳]/); if (acc > 0) { wordPart = raw.slice(0, acc).trim(); meaningPart = raw.slice(acc); } else { const ws = raw.search(/\s{2,}|\s(?=\p{Script=Han})/u); if (ws > 0) { wordPart = raw.slice(0, ws).trim(); meaningPart = raw.slice(ws); } } }
  let word = wordPart, docKana = "";
  const p = wordPart.match(/^([^\s（(]+)\s*[（(]([^）)]*)[）)]$/);
  if (p) { const leading = p[1].trim(), inside = p[2].trim(); if (KANA_ONLY.test(inside)) { word = leading; docKana = inside; } else if (KANJI_ONLY.test(inside)) { word = inside.split("・")[0]; docKana = leading; } else { word = leading; } }
  return { freq, word, docKana, meaning: meaningPart };
}

const tokenizer = await new kuromoji.TokenizerBuilder({ loader: new NodeDictionaryLoader({ dic_path: "node_modules/@patdx/kuromoji/dict/" }) }).build();
const lines = fs.readFileSync(".tmp_docx/parsed.txt", "utf8").split("\n");

let mismatches = 0;
for (let ln = 1; ln <= lines.length; ln++) {
  const rawLine = lines[ln-1]; if (!rawLine) continue;
  const raw = rawLine.replace(/^\[P:\]\s*/, "").trim();
  if (!raw || /^【[^】]*】$/.test(raw) || /^[一二三四五六七八九十]+、/.test(raw)) continue;
  const e = splitEntry(raw);
  if (!e.word || hasKanji(e.word) === false) continue; // 纯假名词无需对比
  const doc = e.docKana ? katakanaToHiragana(e.docKana) : "";
  const toks = tokenizer.tokenize(e.word);
  const kuro = katakanaToHiragana(toks.map(t => t.reading || t.surface_form).join(""));
  if (doc && kuro && doc !== kuro && !hasKanji(kuro)) {
    mismatches++;
    console.log(`L${ln}\t${e.word}\t[doc]${doc}\t[kuro]${kuro}`);
  }
}
console.log(`\n共 ${mismatches} 处 docKana 与 kuromoji 不一致`);
