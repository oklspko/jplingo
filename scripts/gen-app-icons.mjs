// 生成安卓 App 图标（鸟居），与网页 favicon.svg / JpLogo.vue 保持一致。
// 纯 JS 光栅化 + PNG 编码，只依赖 pako（已在 dependencies 中），无原生依赖。
// 用法：node scripts/gen-app-icons.mjs
import fs from "fs";
import path from "path";
import { deflate } from "pako";

// ===== PNG 编码 =====
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const idat = Buffer.from(deflate(raw));
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ===== 形状测试（64 坐标空间，与 favicon.svg 一致）=====
function inRect(x, y, x0, y0, w, h) {
  return x >= x0 && x <= x0 + w && y >= y0 && y <= y0 + h;
}

function inRoundedRect(x, y, minX, minY, maxX, maxY, r) {
  if (x < minX || x > maxX || y < minY || y > maxY) return false;
  if (x >= minX + r && x <= maxX - r) return true;
  if (y >= minY + r && y <= maxY - r) return true;
  const cx = x < minX + r ? minX + r : maxX - r;
  const cy = y < minY + r ? minY + r : maxY - r;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function quad(p0, c, p1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const mt = 1 - t;
    pts.push([
      mt * mt * p0[0] + 2 * mt * t * c[0] + t * t * p1[0],
      mt * mt * p0[1] + 2 * mt * t * c[1] + t * t * p1[1],
    ]);
  }
  return pts;
}

// 笠木（顶梁）：M5 15 Q5 10 13 10 L51 10 Q59 10 59 15 L56 20 L8 20 Z
const KASAGI = [
  ...quad([5, 15], [5, 10], [13, 10], 16),
  [51, 10],
  ...quad([51, 10], [59, 10], [59, 15], 16),
  [56, 20],
  [8, 20],
];

function inPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function inTorii(x, y) {
  return (
    inPolygon(x, y, KASAGI) ||
    inRect(x, y, 12, 25, 40, 4) ||
    inRect(x, y, 16, 20, 6, 34) ||
    inRect(x, y, 42, 20, 6, 34)
  );
}

// ===== 颜色 =====
const TORII = [7, 89, 133]; // #075985
const BG_A = [186, 230, 253]; // #bae6fd
const BG_B = [125, 211, 252]; // #7dd3fc

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ===== 采样（64 坐标空间）=====
function sampleFull(x, y) {
  // 完整图标：蓝色渐变圆角底 + 鸟居
  if (inTorii(x, y)) return [...TORII, 255];
  if (inRoundedRect(x, y, 0, 0, 64, 64, 14)) {
    const t = Math.min(1, Math.max(0, (x + y) / 128));
    return [
      Math.round(lerp(BG_A[0], BG_B[0], t)),
      Math.round(lerp(BG_A[1], BG_B[1], t)),
      Math.round(lerp(BG_A[2], BG_B[2], t)),
      255,
    ];
  }
  return [0, 0, 0, 0];
}

// 前景（自适应图标）：透明底 + 鸟居，缩放到安全区（108 视口中的中心 66×66）
const F_SCALE = 66 / 54; // 鸟居宽 54 → 安全区宽 66
function sampleForeground(x108, y108) {
  const x64 = (x108 - 54) / F_SCALE + 32;
  const y64 = (y108 - 54) / F_SCALE + 32;
  return inTorii(x64, y64) ? [...TORII, 255] : [0, 0, 0, 0];
}

// ===== 渲染（带 3×3 超采样抗锯齿）=====
function render(size, viewSize, sampleFn) {
  const SS = 3;
  const rgba = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = ((px + (sx + 0.5) / SS) / size) * viewSize;
          const y = ((py + (sy + 0.5) / SS) / size) * viewSize;
          const c = sampleFn(x, y);
          r += c[0];
          g += c[1];
          b += c[2];
          a += c[3];
        }
      }
      const n = SS * SS;
      const o = (py * size + px) * 4;
      rgba[o] = Math.round(r / n);
      rgba[o + 1] = Math.round(g / n);
      rgba[o + 2] = Math.round(b / n);
      rgba[o + 3] = Math.round(a / n);
    }
  }
  return encodePng(size, size, rgba);
}

// ===== 写出安卓 mipmap 资源 =====
const RES = path.resolve("android/app/src/main/res");
const DENSITIES = [
  ["mdpi", 48],
  ["hdpi", 72],
  ["xhdpi", 96],
  ["xxhdpi", 144],
  ["xxxhdpi", 192],
];

function writeMipmap(dir, filename, buffer) {
  const full = path.join(RES, dir, filename);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, buffer);
}

let written = 0;
for (const [name, size] of DENSITIES) {
  const dir = `mipmap-${name}`;
  const fullIcon = render(size, 64, sampleFull);
  const foreground = render(size, 108, sampleForeground);
  writeMipmap(dir, "ic_launcher.png", fullIcon);
  writeMipmap(dir, "ic_launcher_round.png", fullIcon);
  writeMipmap(dir, "ic_launcher_foreground.png", foreground);
  written += 3;
}
console.log(`已生成 ${written} 个图标文件（5 种密度 × 3 个尺寸）`);

// ===== 生成 favicon.ico（16/32/48，PNG 压缩），与 SVG 保持一致 =====
function encodeIco(frames) {
  const count = frames.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const dirSize = 16;
  let offset = 6 + count * dirSize;
  const dirs = [];
  const datas = [];
  for (const { size, png } of frames) {
    const e = Buffer.alloc(dirSize);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bit count
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    dirs.push(e);
    datas.push(png);
    offset += png.length;
  }
  return Buffer.concat([header, ...dirs, ...datas]);
}

const faviconIco = encodeIco(
  [16, 32, 48].map((s) => ({ size: s, png: render(s, 64, sampleFull) })),
);
fs.writeFileSync(path.resolve("public/favicon.ico"), faviconIco);
console.log("已生成 public/favicon.ico（16/32/48）");
console.log("请同步确认 android/app/src/main/res/values/ic_launcher_background.xml 为蓝色 #7DD3FC");
