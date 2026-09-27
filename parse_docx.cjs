const fs = require('fs');
const data = fs.readFileSync('.tmp_docx/word/document.xml', 'utf8');

function paraText(pXml) {
  let txt = '';
  const runs = pXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
  for (const r of runs) txt += r.replace(/<w:t[^>]*>|<\/w:t>/g, '');
  return txt;
}
function paraStyle(pXml) {
  const m = pXml.match(/<w:pStyle w:val="([^"]+)"/);
  return m ? m[1] : '';
}
const body = data.match(/<w:body>([\s\S]*)<\/w:body>/)[1];
const blocks = body.match(/<w:p\b[\s\S]*?<\/w:p>|<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
let out = [];
for (const b of blocks) {
  if (b.startsWith('<w:p')) {
    const style = paraStyle(b);
    const t = paraText(b);
    if (t.trim() || style) out.push(`[P:${style}] ${t}`);
  } else {
    const rows = b.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || [];
    for (const r of rows) {
      const cells = r.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) || [];
      const cellTexts = cells.map(c => {
        const ps = c.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
        return ps.map(paraText).join(' / ').trim();
      });
      out.push('[ROW] ' + cellTexts.join(' ||| '));
    }
    out.push('[TBL-END]');
  }
}
fs.writeFileSync('.tmp_docx/parsed.txt', out.join('\n'), 'utf8');
console.log('块数:', blocks.length, ' 行数:', out.length);
