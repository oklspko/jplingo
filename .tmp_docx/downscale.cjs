const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require(path.resolve(__dirname, '../node_modules/.pnpm/@napi-rs+canvas@0.1.80/node_modules/@napi-rs/canvas/index.js'));

(async () => {
  const dir = path.resolve(__dirname, 'pages');
  const img = await loadImage(path.join(dir, 'p001.png'));
  const maxW = 700;
  const scale = maxW / img.width;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  fs.writeFileSync(path.join(dir, 'test_small.jpg'), c.toBuffer('image/jpeg', 90));
  console.log('wrote test_small.jpg', w, 'x', h);
})();
