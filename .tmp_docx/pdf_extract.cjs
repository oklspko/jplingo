const fs = require('fs');
const { PDFParse } = require('pdf-parse');

(async () => {
  const buf = fs.readFileSync('日语蓝宝书N1-N5文法详解.pdf');
  const parser = new PDFParse({ data: buf });
  const res = await parser.getText();
  console.log('总页数:', res.numpages);
  fs.writeFileSync('.tmp_docx/grammar_book.txt', res.text, 'utf8');
  console.log('文本长度:', res.text.length);
  console.log('--- 前3000字 ---');
  console.log(res.text.slice(0, 3000));
})().catch(e => { console.error(e); process.exit(1); });
