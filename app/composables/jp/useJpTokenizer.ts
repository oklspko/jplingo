import { onMounted, ref } from "vue";
import * as kuromoji from "@patdx/kuromoji";
import { ungzip } from "pako";
import { katakanaToHiragana, kanaToInputRomaji } from "~/composables/jp/useJpRomaji";

// 本地词典目录（public/dict，离线可用，不再依赖 CDN）
const CDN_DICT_BASE = "/dict/";

// gzip 魔数：1f 8b。用于识别数据是否仍是 gzip 压缩态。
// 某些静态托管 / Android WebView 会对 .gz 资源自动做 Content-Encoding: gzip 解压，
// 此时 fetch 拿到的已经是解压后的字节，再解压会报错，需要跳过。
function isGzip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

// Android WebView 不支持 DecompressionStream，改用纯 JS 的 pako 解压 gzip 词典。
// 兼容「服务器已自动解压」与「仍为原始 gzip」两种情况。
async function decompressGzip(data: ArrayBuffer): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(data);
  if (!isGzip(bytes)) return data; // 已被服务器/WebView 自动解压，直接使用
  try {
    const inflated = ungzip(bytes);
    const buf = inflated.buffer;
    return (
      buf.byteLength === inflated.byteLength
        ? buf
        : buf.slice(inflated.byteOffset, inflated.byteOffset + inflated.byteLength)
    ) as ArrayBuffer;
  } catch (err) {
    console.error("词典 gzip 解压失败，退回原始数据：", err);
    return data;
  }
}

const customLoader = {
  async loadArrayBuffer(filename: string): Promise<ArrayBuffer> {
    const url = CDN_DICT_BASE + filename;
    const res = await fetch(url);
    if (!res.ok) throw new Error("词典加载失败：" + url);
    const data = await res.arrayBuffer();
    return filename.endsWith(".gz") ? await decompressGzip(data) : data;
  },
};

interface Segment {
  text: string;
  kana: string;
  romaji: string;
}

// 模块级单例缓存：词典约 18MB（解压后更大），跨页面复用已构建的 tokenizer，
// 避免在「编辑器 ↔ 其他页」来回切换时反复下载、解压、重建，重复进入编辑器即秒开。
let cachedTokenizer: any = null;
let building: Promise<any> | null = null;

async function buildTokenizer(): Promise<any> {
  if (cachedTokenizer) return cachedTokenizer;
  // 复用进行中的构建，避免并发重复下载
  if (!building) {
    building = (async () => {
      const builder = new kuromoji.TokenizerBuilder({ loader: customLoader });
      return await builder.build();
    })();
  }
  try {
    const t = await building;
    cachedTokenizer = t;
    return t;
  } finally {
    building = null;
  }
}

export function useJpTokenizer() {
  const ready = ref(!!cachedTokenizer);
  const error = ref("");
  let tokenizer: any = cachedTokenizer;

  onMounted(async () => {
    if (cachedTokenizer) {
      tokenizer = cachedTokenizer;
      ready.value = true;
      return;
    }
    try {
      tokenizer = await buildTokenizer();
      ready.value = true;
      error.value = "";
    } catch (err) {
      console.error("词典加载失败：", err);
      error.value = (err as Error).message || String(err);
    }
  });

  // 加载失败后手动重试（网络抖动等瞬时失败可恢复）
  async function retry(): Promise<boolean> {
    error.value = "";
    try {
      tokenizer = await buildTokenizer();
      ready.value = true;
      return true;
    } catch (err) {
      console.error("词典重试加载失败：", err);
      error.value = (err as Error).message || String(err);
      return false;
    }
  }

  function analyzeSegment(seg: string): Segment {
    const analysis = tokenizer.tokenize(seg);
    const kana = analysis
      .map((t: any) => katakanaToHiragana(t.reading || t.surface_form))
      .join("");
    return { text: seg, kana, romaji: kanaToInputRomaji(kana) };
  }

  return { ready, error, retry, analyzeSegment };
}
