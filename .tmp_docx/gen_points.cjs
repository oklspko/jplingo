const fs = require('fs');
const pts = JSON.parse(fs.readFileSync('.tmp_docx/grammar_points.json', 'utf8'));

const FIX = [
  ['動詞書形', '動詞辞書形'], ['動書形', '動辞書形'], ['書形', '辞書形'],
  ['意向形', '意志形'], ['いにかん', 'いかん'], ['更改', '変更'],
  ['選ばなかった', '選ばれなかった'], ['取かもしれない', '取るかもしれない'],
  ['交通事故的原因', '交通事故の原因'], ['さんさん悩んだ', 'さんざん悩んだ'],
  ['おいそうだ', 'おいしそうだ'], ['辞辞書形', '辞書形'], ['目にに入った', '目に入った'],
];
function clean(s) { for (const [a,b] of FIX) s = s.split(a).join(b); return s; }

// 语法解析 v1：前接 + 位置 + 作用
function analysisOf(p) {
  const pat = clean(p.pattern);
  const pos = /(だ|です|か|ね|よ|わ|ぞ|な|とも|もの|こと|はず|わけ|に違いない|かもしれない|そうだ|ようだ|らしい|まい|だろう|でしょう|ましょう|ください|ばかりだ|次第だ)$/.test(pat)
    ? '句末（收束全句）' : '句中（连接前后项）';
  return `前接「${clean(p.setsuzoku)}」，位于${pos}，${clean(p.meaning).replace(/[。，．]$/, '')}。`;
}

const LEVELS = ['N1', 'N2', 'N3'];
const rows = [];
let idx = 0;
for (const lv of LEVELS) {
  for (const p of pts.filter(x => x.level === lv)) {
    idx++;
    const examples = p.examples.slice(0, 3).map(e => ({ jp: clean(e.jp), zh: clean(e.zh) }));
    if (examples.length === 0) continue;
    const note = clean(p.note || '').trim();
    rows.push({
      id: `${lv.toLowerCase()}-${String(idx).padStart(3, '0')}`,
      pattern: clean(p.pattern),
      setsuzoku: clean(p.setsuzoku),
      meaning: clean(p.meaning),
      examples,
      note: note || undefined,
      analysis: analysisOf(p),
      level: lv,
    });
  }
}

const esc = (s) => JSON.stringify(s);
let out = '';
out += 'export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";\n\n';
out += 'export interface GrammarExample {\n  /** 例句（日文） */\n  jp: string;\n  /** 例句翻译 */\n  zh: string;\n}\n\n';
out += 'export interface GrammarPoint {\n  id: string;\n  /** 语法条表达形式，首字为平假名，用于五十音排序 */\n  pattern: string;\n  /** 接续：前接什么词形 */\n  setsuzoku: string;\n  /** 中文释义 */\n  meaning: string;\n  /** 例句（最多 3 条） */\n  examples: GrammarExample[];\n  /** 补充说明（可选） */\n  note?: string;\n  /** 语法解析：修饰谁、连接谁、句中位置 */\n  analysis?: string;\n  level: JlptLevel;\n}\n\n';
out += 'export const grammarPoints: GrammarPoint[] = [\n';
for (const r of rows) {
  out += '  { id: ' + esc(r.id) + ', pattern: ' + esc(r.pattern) + ', setsuzoku: ' + esc(r.setsuzoku) + ', meaning: ' + esc(r.meaning) + ', examples: [';
  out += r.examples.map(e => `{ jp: ${esc(e.jp)}, zh: ${esc(e.zh)} }`).join(', ');
  out += ']';
  if (r.note) out += ', note: ' + esc(r.note);
  out += ', analysis: ' + esc(r.analysis);
  out += ', level: ' + esc(r.level) + ' },\n';
}
out += '];\n';
fs.writeFileSync('app/data/jp-grammar-points.ts', out, 'utf8');
console.log('生成', rows.length, '条，文件', (out.length/1024).toFixed(0), 'KB');
