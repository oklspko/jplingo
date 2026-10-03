// 语法页五个组件的「热更新兜底接线」检查（缺 import 或 computed 声明晚于使用都会让整页 500）
// 运行：node tests/offline-tts/run.cjs
import { check } from "../../scripts/check-grammar-wiring.mjs";

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function check_(name: string, ok: boolean, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  [ok]" : "  [FAIL]"} ${name}${detail && !ok ? "  -> " + detail : ""}`);
}

function main() {
  console.log("\n[1] 语法组件接线：显式 import + computed 在引用之前声明");
  // check() 内部会打印具体问题；这里把它接进统一的自测结果
  const savedError = console.error;
  const messages: string[] = [];
  console.error = (...args: unknown[]) => messages.push(args.join(" "));
  const ok = check();
  console.error = savedError;
  check_("五个语法组件接线正常", ok, messages.join(" | "));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n合计 ${results.length} 项，失败 ${failed.length} 项`);
  if (failed.length) {
    for (const f of failed) console.log(`  - ${f.name}  ${f.detail ?? ""}`);
    process.exit(1);
  }
}

main();
