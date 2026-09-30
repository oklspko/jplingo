const fs = require('fs');
const file = process.argv[2];
const outPath = process.argv[3];
const data = fs.readFileSync(file, 'utf8');
function richText(pXml) {
  let s = '';
  const runs = pXml.match(/<w:r\b[\s\S]*?<\/w:r>|<w:br[^>]*\/>|<w:tab[^>]*\/>/g) || [];
  for (const r of runs) {
    if (/<w:br[^>]*\/>/.test(r)) { s += '\n'; continue; }
    if (/<w:tab[^>]*\/>/.test(r)) { s += '\t'; continue; }
    const t = r.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
    for (const x of t) s += x.replace(/<w:t[^>]*>|<\/w:t>/g, '');
  }
  return s;
}
const body = data.match(/<w:body>([\s\S]*)<\/w:body>/)[1];
const blocks = body.match(/<w:p\b[\s\S]*?<\/w:p>|<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
const lines = [];
for (const b of blocks) {
  if (b.startsWith('<w:p')) {
    lines.push(richText(b));
  } else {
    const rows = b.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || [];
    for (const r of rows) {
      const cells = r.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) || [];
      const cellTexts = cells.map(c => {
        const ps = c.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
        return ps.map(richText).join(' ').replace(/\s+/g, ' ').trim();
      });
      lines.push('| ' + cellTexts.join(' | ') + ' |');
    }
    lines.push('---TABLE-END---');
  }
}
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('wrote', lines.length, 'lines to', outPath);
