import { onMounted, ref } from "vue";
import * as kuromoji from "@patdx/kuromoji";
import { toRomaji } from "wanakana";
import { katakanaToHiragana } from "~/composables/jp/useJpRomaji";

const CDN_DICT_BASE = "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/";

async function decompressGzip(data: ArrayBuffer): Promise<ArrayBuffer> {
  const ds = new DecompressionStream("gzip");
  const stream = new Response(data).body!.pipeThrough(ds);
  return new Response(stream).arrayBuffer();
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
