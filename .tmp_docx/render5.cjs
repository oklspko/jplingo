const fs = require('fs');
const { PDFParse } = require('pdf-parse');
(async () => {
  const buf = fs.readFileSync('日语蓝宝书N1-N5文法详解.pdf');
  const parser = new PDFParse({ data: buf });
  await parser.load();
  const r = await parser.getScreenshot({ page: 1, scale: 2, imageBuffer: true, imageDataUrl: false });
  const p = r.pages[0];
  console.log('page[0] keys:', Object.keys(p));
  for (const k of Object.keys(p)) {
    const v = p[k];
    if (Buffer.isBuffer(v)) console.log(' ', k, 'Buffer', v.length);
    else if (typeof v === 'string') console.log(' ', k, 'String', v.slice(0,60));
    else if (v && typeof v === 'object') { console.log(' ', k, 'object', Object.keys(v)); }
    else console.log(' ', k, typeof v, v);
  }
  // 保存所有 Buffer 字段
  for (const k of Object.keys(p)) {
    if (Buffer.isBuffer(p[k])) { fs.writeFileSync(`.tmp_docx/pages/p1-${k}.bin`, p[k]); console.log('saved p1-',k, p[k].length); }
  }
})();
