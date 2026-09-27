const fs = require('fs');
const { PDFParse } = require('pdf-parse');

// 用法: node render_png.cjs <startPage> <endPage> [scale]
// 用 first/last 一次性渲染连续范围，page 参数不被支持
const start = parseInt(process.argv[2] || '1', 10);
const end = parseInt(process.argv[3] || start, 10);
const scale = parseFloat(process.argv[4] || '2');

(async () => {
  const buf = fs.readFileSync('日语蓝宝书N1-N5文法详解.pdf');
  const parser = new PDFParse({ data: buf });
  await parser.load();

  const outDir = '.tmp_docx/pages';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const r = await parser.getScreenshot({ first: start, last: end, scale, imageBuffer: true, imageDataUrl: false });
  console.log('got', r.pages.length, 'pages');
  for (const p of r.pages) {
    const u8 = p.data;
    if (!u8 || !u8.length) { console.log(`page ${p.pageNumber}: no data`); continue; }
    const file = `${outDir}/p${String(p.pageNumber).padStart(3, '0')}.png`;
    fs.writeFileSync(file, Buffer.from(u8));
    console.log(`page ${p.pageNumber}: ${file} (${u8.length} bytes, ${p.width}x${p.height})`);
  }
  await parser.destroy();
})();
