const fs = require('fs');
const { PDFParse } = require('pdf-parse');
(async () => {
  const buf = fs.readFileSync('日语蓝宝书N1-N5文法详解.pdf');
  const parser = new PDFParse({ data: buf });
  await parser.load();
  const r = await parser.getScreenshot({ page: 1, scale: 2, imageBuffer: true });
  console.log('keys:', Object.keys(r));
  console.log('values summary:');
  for (const k of Object.keys(r)) {
    const v = r[k];
    if (Buffer.isBuffer(v)) console.log(' ', k, 'Buffer', v.length, 'bytes');
    else if (Array.isArray(v)) console.log(' ', k, 'Array', v.length);
    else if (typeof v === 'string') console.log(' ', k, 'String', v.slice(0,80));
    else console.log(' ', k, typeof v, v && v.constructor && v.constructor.name);
  }
  // 尝试保存各种 image 字段
  for (const k of ['data','buffer','image','imageBuffer','screenshot','png']) {
    if (r[k] && (Buffer.isBuffer(r[k]) || (r[k].data && Buffer.isBuffer(r[k].data)))) {
      const d = Buffer.isBuffer(r[k]) ? r[k] : r[k].data;
      fs.writeFileSync(`.tmp_docx/pages/p1-${k}.png`, d);
      console.log('saved', k, d.length);
    }
  }
  if (r.pages) console.log('pages field:', JSON.stringify(r.pages).slice(0,300));
})();
