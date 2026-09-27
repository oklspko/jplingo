const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require(path.resolve(__dirname, '../node_modules/.pnpm/@napi-rs+canvas@0.1.80/node_modules/@napi-rs/canvas/index.js'));

(async () => {
  const dir = path.resolve(__dirname, 'pages');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
  for (const f of files) {
    const img = await loadImage(path.join(dir, f));
    const c = createCanvas(img.width, img.height);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, img.width, img.height);
    ctx.drawImage(img, 0, 0);
    const jpg = c.toBuffer('image/jpeg', 85);
    const out = path.join(dir, f.replace('.png', '.jpg'));
    fs.writeFileSync(out, jpg);
    console.log(f, '->', jpg.length, 'bytes');
  }
})();
