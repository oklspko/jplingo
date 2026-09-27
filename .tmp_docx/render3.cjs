const fs = require('fs');
const { PDFParse } = require('pdf-parse');

(async () => {
  const buf = fs.readFileSync('日语蓝宝书N1-N5文法详解.pdf');
  const parser = new PDFParse({ data: buf });
  await parser.load();
  const attempts = [
    { page: 1 },
    { pageNumber: 1 },
    { pageIndex: 0 },
  ];
  for (const a of attempts) {
    try {
      const r = await parser.getScreenshot(a);
      console.log(JSON.stringify(a), '->', typeof r, r && r.constructor && r.constructor.name, Buffer.isBuffer(r) ? r.length : '');
      if (Buffer.isBuffer(r)) { fs.writeFileSync(`.tmp_docx/pages/try-${Object.values(a)[0]}.png`, r); console.log('  saved'); }
    } catch(e) { console.log(JSON.stringify(a), 'err:', e.message.slice(0,80)); }
  }
})();
