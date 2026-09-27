const fs = require('fs');
let lines = fs.readFileSync('.tmp_docx/n45/parsed.txt', 'utf8').split('\n');

// —— 预处理：合并「N.」+「pattern」分行 ——
let merged = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (/^\d+\.$/.test(l) && i + 1 < lines.length) {
    const next = lines[i + 1].trim();
    if (next && !/^(接続|接续|説明|说明|例文|注意)/.test(next)) { merged.push(`${l} ${next}`); i++; continue; }
  }
  merged.push(lines[i]);
}
lines = merged;

const FIELD = /^(接続|接续|説明|说明|例文|注意)\s*([12])?\s*[|：:・]?\s*(.*)$/;
const NOISE = /^(N[1-5]\s*文法|敬\s*語|敬語|新日本语能力考试|新日语能力考试|考试科目|语言知识|文法读解|听解|文字·词汇|文字・词汇|【注】|[◇○◆]|1\s*\||2\s*\||3\s*\||\d+\s*\|)/;

let curLevel = 'N5';
let points = [];
let greetings = [];
let cur = null;
let curField = null;   // 'setsuzoku' | 'meaning' | 'examples' | 'note'
let inGreeting = false;

function newPoint(pattern) {
  return { level: curLevel, pattern, setsuzoku: [], meaning: [], examples: [], note: [] };
}
function pushVal(val) {
  if (!cur || !curField) return;
  const v = val.trim();
  if (curField === 'setsuzoku') { if (v) cur.setsuzoku.push(v); }
  else if (curField === 'meaning') { if (v) cur.meaning.push(v); }
  else if (curField === 'examples') { if (v) cur.examples.push(v); }
  else if (curField === 'note') { if (v) cur.note.push(v); }
}
function appendVal(val) {
  if (!cur || !curField) return;
  const v = val.trim();
  if (!v) return;
  if (curField === 'setsuzoku') {
    if (cur.setsuzoku.length === 0) cur.setsuzoku.push(v);
    else cur.setsuzoku[cur.setsuzoku.length - 1] += v;
  } else if (curField === 'meaning') {
    if (cur.meaning.length === 0) cur.meaning.push(v);
    else cur.meaning[cur.meaning.length - 1] += v;
  } else if (curField === 'examples') {
    if (cur.examples.length === 0) cur.examples.push(v);
    else cur.examples[cur.examples.length - 1] += v;
  } else if (curField === 'note') {
    if (cur.note.length === 0) cur.note.push(v);
    else cur.note[cur.note.length - 1] += v;
  }
}

for (const raw of lines) {
  const hm = raw.match(/\[Heading1\]\s*(.+)/);
  if (hm) {
    if (/第一部分|N4/.test(hm[1])) curLevel = 'N4';
    else if (/第二部分|N5/.test(hm[1])) curLevel = 'N5';
    continue;
  }
  const h2 = raw.match(/\[Heading2\]\s*(.+)/);
  if (h2) {
    inGreeting = /寒暄|あいさつ|挨拶/.test(h2[1]);
    if (inGreeting && cur) { points.push(cur); cur = null; curField = null; }
    continue;
  }
  const line = raw.trim();
  if (!line) continue;
  if (NOISE.test(line)) continue;

  if (inGreeting) { greetings.push(line); continue; }

  const numMatch = line.match(/^(\d+)\.\s+(.+)$/);
  if (numMatch) {
    if (cur) points.push(cur);
    cur = newPoint(numMatch[2].trim());
    curField = null;
    continue;
  }

  if (!cur) continue;

  const fm = line.match(FIELD);
  if (fm) {
    const key = fm[1];
    const val = (fm[3] || '').trim();
    if (key === '接続' || key === '接续') curField = 'setsuzoku';
    else if (key === '説明' || key === '说明') curField = 'meaning';
    else if (key === '例文') curField = 'examples';
    else if (key === '注意') curField = 'note';
    if (val) pushVal(val);
    continue;
  }

  appendVal(line);
}
if (cur) points.push(cur);

// 例文拆分
function splitExamples(arr) {
  const out = [];
  for (const chunk of arr) {
    const parts = chunk.split(/[△Δ]/).map(s => s.trim()).filter(Boolean);
    for (const p of parts) {
      let seg = p.replace(/^例文\s*[|：:・]?\s*/, '');
      const idx = seg.indexOf('/');
      if (idx > 0) {
        const jp = seg.slice(0, idx).trim();
        const zh = seg.slice(idx + 1).trim();
        if (jp) out.push({ jp, zh });
      } else if (seg) out.push({ jp: seg, zh: '' });
    }
  }
  return out;
}

const result = points.map(p => ({
  level: p.level,
  pattern: p.pattern.replace(/\s+/g, ' ').trim(),
  setsuzoku: p.setsuzoku.join(' ').replace(/\s+/g, ' ').trim(),
  meaning: p.meaning.join(' ').replace(/\s+/g, ' ').trim(),
  examples: splitExamples(p.examples),
  note: p.note.join(' ').replace(/\s+/g, ' ').trim(),
})).filter(p => p.pattern && p.pattern.length > 1 && !/^[｜|]/.test(p.pattern));

fs.writeFileSync('.tmp_docx/grammar_points_n45.json', JSON.stringify(result, null, 1), 'utf8');

const byLevel = {};
for (const p of result) byLevel[p.level] = (byLevel[p.level] || 0) + 1;
console.log('语法条总数:', result.length, '分级:', JSON.stringify(byLevel));
console.log('寒暄用语条数:', greetings.length);
console.log('例文分布: 0例=' + result.filter(p => p.examples.length === 0).length + ' 1例=' + result.filter(p => p.examples.length === 1).length + ' 2例=' + result.filter(p => p.examples.length === 2).length + ' 3+例=' + result.filter(p => p.examples.length >= 3).length);
console.log('无接续条数:', result.filter(p => !p.setsuzoku).length);
console.log('--- N4 第1条 ---');
console.log(JSON.stringify(result.find(x => x.level === 'N4'), null, 1));
console.log('--- N5 第1条 ---');
console.log(JSON.stringify(result.find(x => x.level === 'N5'), null, 1));
console.log('--- 无接续的 pattern 前 10 条 ---');
console.log(result.filter(p => !p.setsuzoku).slice(0, 10).map(p => p.level + ' ' + p.pattern).join('\n'));
