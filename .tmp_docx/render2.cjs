const fs = require('fs');
const { PDFParse } = require('pdf-parse');

(async () => {
  const buf = fs.readFileSync('日语蓝宝书N1-N5文法详解.pdf');
  const parser = new PDFParse({ data: buf });
  await parser.load();
  // getScreenshot 返回结构？先探测
  for (const n of [1]) {
    try {
      const r = await parser.getScreenshot(n);
      console.log('getScreenshot('+n+') type:', typeof r, Array.isArray(r) ? 'array len '+r.length : (r && r.constructor && r.constructor.name));
      if (Buffer.isBuffer(r)) {
        fs.writeFileSync(`.tmp_docx/pages/shot-${String(n).padStart(3,'0')}.png`, r);
        console.log('saved buffer', r.length, 'bytes');
      } else if (r && typeof r === 'object') {
        console.log('keys:', Object.keys(r));
        if (r.data) { fs.writeFileSync(`.tmp_docx/pages/shot-${String(n).padStart(3,'0')}.png`, r.data); console.log('saved r.data'); }
      } else {
        console.log('r =', String(r).slice(0,200));
      }
    } catch(e) { console.log('getScreenshot error:', e.message); }
    try {
      const r2 = await parser.getImage(n);
      console.log('getImage('+n+') type:', typeof r2, Array.isArray(r2) ? 'array len '+r2.length : (r2 && r2.constructor && r2.constructor.name));
      if (r2 && r2.data) { fs.writeFileSync(`.tmp_docx/pages/img-${String(n).padStart(3,'0')}.png`, r2.data); console.log('saved img r2.data'); }
    } catch(e) { console.log('getImage error:', e.message); }
  }
})();
