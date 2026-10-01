import { ref } from "vue";
import { fetchDataJson } from "~/composables/jp/useJpData";

/**
 * 语法页（jp-kana-chart 的各个标签页）里的表格/清单数据。
 *
 * 这些内容原本写死在组件里（编进 JS 包），改一行就得发新版 App。
 * 现在同一份数据也在 `public/data/grammar-reference.json`（构建时由
 * scripts/gen-content-json.cjs 从组件里抽出），App 走数据热更新就能改。
 *
 * 组件里保留完全相同的内置默认值：JSON 缺失、解析失败或还没加载完时用内置值，
 * 所以最坏情况只是回到「跟 App 一起发的旧内容」，不会空白。
 */
export interface JpGrammarReference {
  predicates?: Record<string, unknown>;
  verbGuide?: Record<string, unknown>;
  guide?: Record<string, unknown>;
  particles?: Record<string, unknown>;
  keigo?: Record<string, unknown>;
}

const content = ref<JpGrammarReference | null>(null);
let loading: Promise<void> | null = null;

function load(): Promise<void> {
  if (!loading) {
    loading = fetchDataJson<JpGrammarReference>("data/grammar-reference.json")
      .then((data) => {
        if (data && typeof data === "object") content.value = data;
      })
      .catch(() => {
        // 回退内置内容，不打扰用户
        loading = null;
      });
  }
  return loading;
}

/** 返回响应式内容（加载完成后组件里的 computed 会自动切换到新数据） */
export function useJpGrammarContent() {
  void load();
  return content;
}
