import { onMounted, ref } from "vue";
import * as kuromoji from "@patdx/kuromoji";
import { toRomaji } from "wanakana";
import { ungzip } from "pako";
import { katakanaToHiragana } from "~/composables/jp/useJpRomaji";

// 本地词典目录（public/dict，离线可用，不再依赖 CDN）
const CDN_DICT_BASE = "/dict/";

// Android WebView 不支持 DecompressionStream，改用纯 JS 的 pako 解压 gzip 词典，
// 保证离线 App 内分词词典能正常加载。
async function decompressGzip(data: ArrayBuffer): Promise<ArrayBuffer> {
  const inflated = ungzip(new Uint8Array(data));
  const buf = inflated.buffer;
  return (
    buf.byteLength === inflated.byteLength
      ? buf
      : buf.slice(inflated.byteOffset, inflated.byteOffset + inflated.byteLength)
  ) as ArrayBuffer;
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

export function useJpTokenizer() {
  const ready = ref(false);
  let tokenizer: any = null;

  onMounted(async () => {
    try {
      const builder = new kuromoji.TokenizerBuilder({ loader: customLoader });
      tokenizer = await builder.build();
      ready.value = true;
    } catch (err) {
      console.error("词典加载失败：", err);
      alert("词典加载失败：" + (err as Error).message);
    }
  });

  function analyzeSegment(seg: string): Segment {
    const analysis = tokenizer.tokenize(seg);
    const kana = analysis
      .map((t: any) => katakanaToHiragana(t.reading || t.surface_form))
      .join("");
    return { text: seg, kana, romaji: toRomaji(kana) };
  }

  return { ready, analyzeSegment };
}
