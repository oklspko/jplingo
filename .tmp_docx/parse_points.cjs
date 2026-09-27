const fs = require('fs');
const lines = fs.readFileSync('.tmp_docx/grammar_book/parsed.txt', 'utf8').split('\n');

// 等级追踪
function levelFromHeading(s) {
  if (/N1/.test(s)) return 'N1';
  if (/N2/.test(s)) return 'N2';
  if (/N3/.test(s)) return 'N3';
  return null;
}

// 字段标签：日文+中文，含 1/2 序号变体
const FIELD = /^(接続|接续|説明|说明|例文|注意)\s*([12])?\s*[|：:・]?\s*(.*)$/;
// 运行页眉/噪音行
const NOISE = /^(N[1-5]\s*文法|敬\s*語|敬語|新日本语能力考试|新日语能力考试|考试科目|语言知识|文法读解|听解|文字·词汇|文字・词汇|【注】|[◇○◆]|1\s*\||2\s*\||3\s*\||\d+\s*\|)/;

let curLevel = 'N1';
let points = [];
let cur = null; // 当前语法条

function newPoint(pattern, num) {
  return { level: curLevel, pattern, setsuzoku: [], meaning: [], examples: [], note: [] };
}

for (let i = 0; i < lines.length; i++) {
  const raw = lines[i];
  // 等级标题
  const hm = raw.match(/\[Heading1\]\s*(.+)/);
  if (hm) {
    const lv = levelFromHeading(hm[1]);
    if (lv) curLevel = lv;
    continue;
  }
  const line = raw.trim();
  if (!line) continue;
  if (NOISE.test(line)) continue;

  // 编号语法条标题： "N. ～pattern"
  const numMatch = line.match(/^(\d+)\.\s+(.+)$/);
  if (numMatch) {
    if (cur) points.push(cur);
    cur = newPoint(numMatch[2].trim(), numMatch[1]);
    continue;
  }

  if (!cur) continue;

  // 字段标签
  const fm = line.match(FIELD);
  if (fm) {
    const key = fm[1];
    const suffix = fm[2] || '';
    const val = (fm[3] || '').trim();
    if (key === '接続' || key === '接续') cur.setsuzoku.push(val);
    else if (key === '説明' || key === '说明') cur.meaning.push(val);
    else if (key === '例文') cur.examples.push(val);
    else if (key === '注意') cur.note.push(val);
    continue;
  }

  // 续行：追加到最后一个字段
  if (cur.setsuzoku.length > cur.meaning.length) cur.setsuzoku[cur.setsuzoku.length-1] += line;
  else if (cur.meaning.length > 0 && cur.examples.length === 0) cur.meaning[cur.meaning.length-1] += line;
  else if (cur.examples.length > 0 && cur.note.length === 0) cur.examples[cur.examples.length-1] += line;
  else if (cur.note.length > 0) cur.note[cur.note.length-1] += line;
  else cur.setsuzoku.push(line);
}
if (cur) points.push(cur);

// 例文拆分：△/Δ 分隔，每个 "日文/中文"
function splitExamples(arr) {
  const out = [];
  for (const chunk of arr) {
    const parts = chunk.split(/[△Δ]/).map(s => s.trim()).filter(Boolean);
    for (const p of parts) {
      // 去掉行首 "例文" 残留
      let seg = p.replace(/^例文\s*[|：:・]?\s*/, '');
      // 日/中 分隔：取第一个 "/"
      const idx = seg.indexOf('/');
      if (idx > 0) {
        const jp = seg.slice(0, idx).trim();
        const zh = seg.slice(idx + 1).trim();
        if (jp) out.push({ jp, zh });
      } else if (seg) {
        out.push({ jp: seg, zh: '' });
      }
    }
  }
  return out;
}

const result = points.map(p => {
  const examples = splitExamples(p.examples);
  return {
    level: p.level,
    pattern: p.pattern.replace(/\s+/g, ' ').trim(),
    setsuzoku: p.setsuzoku.join(' ').replace(/\s+/g, ' ').trim(),
    meaning: p.meaning.join(' ').replace(/\s+/g, ' ').trim(),
    examples,
    note: p.note.join(' ').replace(/\s+/g, ' ').trim(),
  };
}).filter(p => p.pattern && p.pattern.length > 1 && !/^[｜|]/.test(p.pattern));

fs.writeFileSync('.tmp_docx/grammar_points.json', JSON.stringify(result, null, 1), 'utf8');
// 统计
const byLevel = {};
for (const p of result) byLevel[p.level] = (byLevel[p.level] || 0) + 1;
console.log('总条数:', result.length);
console.log('分级:', JSON.stringify(byLevel));
console.log('例文数分布: 0例=' + result.filter(p=>p.examples.length===0).length + ' 1例=' + result.filter(p=>p.examples.length===1).length + ' 2例=' + result.filter(p=>p.examples.length===2).length + ' 3+例=' + result.filter(p=>p.examples.length>=3).length);
console.log('--- 前3条样例 ---');
for (const p of result.slice(0, 3)) console.log(JSON.stringify(p, null, 1));
