const fs = require('fs');
const data = fs.readFileSync('.tmp_docx/grammar_book/word/document.xml', 'utf8');

function paraText(pXml) {
  // 连接所有 <w:t>，处理 <w:br/> 和 <w:tab/>
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
  const m = pXml.match(/<w:pStyle w:val="([^"]+)"/);
  return m ? m[1] : '';
}
// 只处理段落（忽略表格复杂结构，先看段落）
const body = data.match(/<w:body>([\s\S]*)<\/w:body>/)[1];
const paras = body.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
let out = [];
for (const p of paras) {
  const style = paraStyle(p);
  const t = paraText(p);
  out.push((style ? `[${style}] ` : '') + t);
}
const full = out.join('\n');
fs.writeFileSync('.tmp_docx/grammar_book/parsed.txt', full, 'utf8');
console.log('段落数:', paras.length, ' 字符数:', full.length);
// 打印前 120 行看结构
console.log(full.split('\n').slice(0, 120).join('\n'));
