const path = require('path');
const { createWorker } = require('tesseract.js');

(async () => {
  const worker = await createWorker('jpn+chi_sim', 1, {
    logger: m => { if (m.status === 'recognizing text') console.log('  progress', Math.round(m.progress*100)+'%'); }
  });
  const { data } = await worker.recognize(path.resolve(__dirname, 'pages/p002.png'));
  console.log('===== PAGE 2 OCR =====');
  console.log(data.text);
  await worker.terminate();
})();
