const fs = require('fs');
const src = fs.readFileSync('app/data/jp-grammar-points.ts', 'utf8');
const markerIdx = src.indexOf('grammarPoints');
const eqIdx = src.indexOf('=', markerIdx);
const startIdx = src.indexOf('[', eqIdx);
const endIdx = src.lastIndexOf(']');
const literal = src.slice(startIdx, endIdx + 1);
const points = new Function(`return (${literal});`)();
const map = {};
for (const p of points) map[p.id] = p;
fs.writeFileSync('.tmp_proofread/points.json', JSON.stringify(points, null, 2), 'utf8');
console.log('dumped', points.length, 'points');
// 打印指定 id 的字段，便于核对
const want = process.argv.slice(2);
for (const id of want) {
  const p = map[id];
  if (!p) { console.log('MISSING', id); continue; }
  console.log('===== ' + id + ' =====');
  console.log('pattern:', JSON.stringify(p.pattern));
  console.log('setsuzoku:', JSON.stringify(p.setsuzoku));
  console.log('meaning:', JSON.stringify(p.meaning));
  p.examples.forEach((e,i)=>console.log(`ex${i}.jp:`, JSON.stringify(e.jp), `  ex${i}.zh:`, JSON.stringify(e.zh)));
  if (p.note) console.log('note:', JSON.stringify(p.note));
  if (p.analysis) console.log('analysis:', JSON.stringify(p.analysis));
}
