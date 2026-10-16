// 模板标识符静态检查（护栏）：
// `<script setup>` 里漏 import / 漏定义时，模板里的标识符会静默退化成 `_ctx.xxx` → 运行时 undefined，
// 而 vite 构建**不报错**。这是重构抽逻辑时最容易犯、最难被构建抓住的错。
//
// 真实事故（2026-10-16 步骤 8）：把 isVocabPack 移进 composable 时页面删掉了它的 import，
// 但模板里还有两处 `v-if="isVocabPack(pack.id)"`；该页面的渲染快照只抓到加载态（35 行），也可能漏掉。
//
// 运行：node tests/offline-tts/run.cjs
import { check } from "../../scripts/check-template-bindings.mjs";

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function check_(name: string, ok: boolean, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  [ok]" : "  [FAIL]"} ${name}${detail && !ok ? "  -> " + detail : ""}`);
}

function main() {
  console.log("\n[1] 所有 .vue 模板引用的标识符都在 <script setup> 作用域内");
  const { scanned, problems } = check();
  const detail = problems.map((p) => `${p.rel}: ${p.names.join(", ")}`).join(" | ");
  check_(`扫描了 ${scanned} 个文件`, scanned > 0, "没扫到文件，路径可能不对");
  check_("无未定义标识符", problems.length === 0, detail);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n合计 ${results.length} 项，失败 ${failed.length} 项`);
  if (failed.length) {
    for (const f of failed) console.log(`  - ${f.name}  ${f.detail ?? ""}`);
    process.exit(1);
  }
}

main();
