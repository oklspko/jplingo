import fs from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const file = process.argv[2];
const pageArg = process.argv[3]; // e.g. "2" or "2-12"
const scale = Number(process.argv[4] || 2);

const data = new Uint8Array(fs.readFileSync(file));
const doc = await pdfjsLib.getDocument({ data }).promise;
const total = doc.numPages;

let pages = [];
if (/^\d+$/.test(pageArg)) pages = [Number(pageArg)];
else if (/^(\d+)-(\d+)$/.test(pageArg)) {
  const [a, b] = [Number(RegExp.$1), Number(RegExp.$2)];
  for (let i = a; i <= b; i++) pages.push(i);
}

for (const n of pages) {
  if (n < 1 || n > total) continue;
  const page = await doc.getPage(n);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  const png = canvas.toBuffer('image/png');
  const out = `.tmp_docx/pages/page-${String(n).padStart(3,'0')}.png`;
  fs.mkdirSync('.tmp_docx/pages', { recursive: true });
  fs.writeFileSync(out, png);
  console.log('rendered', out, `${canvas.width}x${canvas.height}`);
}
console.log('总页数:', total);
