const fs = require('fs');
const data = fs.readFileSync('.tmp_docx/n45/word/document.xml', 'utf8');

function paraText(pXml) {
  let txt = '';
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:br\s*\/>|<w:tab\s*\/>/g;
  let m;
  while ((m = re.exec(pXml)) !== null) {
    if (m[1] !== undefined) txt += m[1];
    else if (m[0].startsWith('<w:br')) txt += '\n';
    else if (m[0].startsWith('<w:tab')) txt += '\t';
  }
  return txt;
}
function paraStyle(pXml) {
  const m = pXml.match(/<w:pStyle\s+w:val="([^"]+)"/);
  return m ? m[1] : '';
}

const body = data.match(/<w:body>([\s\S]*)<\/w:body>/)[1];
const paras = body.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
let lines = [];
for (const p of paras) {
  const style = paraStyle(p);
  const t = paraText(p);
  lines.push((style ? `[${style}] ` : '') + t);
}

// —— 去注音泄漏：源 docx 把每个字拆成独立段落，汉字后紧跟其假名注音、假名则重复一遍 ——
// 规则1：单个汉字 + 纯平假名 → 后者是注音，丢弃
// 规则2：纯假名段落 + 完全相同（≤4字）的下一个段落 → 后者是重复注音，丢弃
const drop = new Set();
const bare = (s) => s.replace(/^\[[^\]]*\]\s*/, '').replace(/^[△Δ]\s*/, '').trim();
for (let i = 0; i < lines.length - 1; i++) {
  const a = bare(lines[i]);
  const b = bare(lines[i + 1]);
  if (!b) continue;
  if (/^[一-鿿]$/.test(a) && /^[ぁ-ん]+$/.test(b)) drop.add(i + 1);
  else if (a && a === b && /^[ぁ-んァ-ヶ]+$/.test(a) && a.length <= 4) drop.add(i + 1);
}
const cleaned = lines.filter((_, i) => !drop.has(i));

const full = cleaned.join('\n');
fs.writeFileSync('.tmp_docx/n45/parsed.txt', full, 'utf8');
console.log('段落数:', paras.length, ' 丢弃注音段落:', drop.size, ' 剩余:', cleaned.length);
