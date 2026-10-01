// 句子生长的核心规则测试（短句在前长句在后 + 五条不变量），跑的是真实 useJpCourses 代码
// 运行：node tests/offline-tts/run.cjs
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildGrowingOrder, buildPracticeOrder, dedupeStatements } from "../../app/composables/jp/useJpCourses";

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function check(name: string, ok: boolean, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  [ok]" : "  [FAIL]"} ${name}${detail && !ok ? "  -> " + detail : ""}`);
}
function eq(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  check(name, a === e, `实际 ${a}，期望 ${e}`);
}

const PARTICLES = new Set("をでにはとものなへがよりからまで".split(""));

function w(text: string, kana = text) {
  return { id: text, chinese: text, japanese: text, kana, romaji: text, tokens: [{ text, kana }] };
}
function sent(japanese: string, tokens: string[]) {
  return {
    id: japanese,
    chinese: japanese,
    japanese,
    kana: japanese,
    romaji: japanese,
    tokens: tokens.map((t) => ({ text: t, kana: t })),
  };
}

const isSentence = (s: { tokens?: unknown[] }) => (s.tokens || []).length > 1;
const lengths = (list: Array<{ tokens?: unknown[] }>) =>
  list.filter(isSentence).map((s) => (s.tokens || []).length);

function verifyInvariants(order: Array<{ japanese: string; tokens?: Array<{ text: string }> }>, wordSet: Set<string>) {
  const learned = new Set<string>();
  const problems: string[] = [];
  for (const st of order) {
    const toks = st.tokens || [];
    if (toks.length > 1) {
      for (const t of toks) {
        if (PARTICLES.has(t.text)) continue;
        if (!wordSet.has(t.text)) continue; // 无对应单词的 token 不会被单练（如助词）
        if (!learned.has(t.text)) problems.push(`${st.japanese} 用到未单练的 ${t.text}`);
      }
    } else {
      if (learned.has(st.japanese)) problems.push(`${st.japanese} 被单练两次`);
      learned.add(st.japanese);
    }
  }
  return problems;
}

async function main() {
  console.log("\n[1] 合成数据：句子按 token 数升序，短句在前长句在后");
  {
    // 故意打乱数据顺序：长句在最前、短句在最后
    const statements = [
      sent("私は毎朝七時に明るい台所で家族と一緒に温かいご飯を食べます", [
        "私", "は", "毎朝", "七時", "に", "明るい", "台所", "で", "家族", "と", "一緒に", "温かい", "ご飯", "を", "食べます",
      ]),
      w("私"),
      w("毎朝"),
      w("七時"),
      w("明るい"),
      w("台所"),
      w("家族"),
      w("一緒に"),
      w("温かい"),
      w("ご飯"),
      w("食べます"),
      sent("私はご飯を食べます", ["私", "は", "ご飯", "を", "食べます"]),
      sent("私は温かいご飯を食べます", ["私", "は", "温かい", "ご飯", "を", "食べます"]),
    ];
    const order = buildGrowingOrder(statements);
    const lens = lengths(order);
    eq("句子长度序列升序", lens, [...lens].sort((a, b) => a - b));
    eq("最短的句子最先出", order.find(isSentence)?.japanese, "私はご飯を食べます");
    eq("最长的句子最后出", order.filter(isSentence).at(-1)?.japanese, "私は毎朝七時に明るい台所で家族と一緒に温かいご飯を食べます");
    const wordSet = new Set(statements.filter((s) => !isSentence(s)).map((s) => s.japanese));
    eq("五条不变量无违反", verifyInvariants(order as never, wordSet), []);
  }

  console.log("\n[2] 同长度的句子保持数据原顺序（稳定排序）");
  {
    const statements = [
      w("私"),
      w("犬"),
      w("猫"),
      w("好き"),
      sent("私は犬が好き", ["私", "は", "犬", "が", "好き"]),
      sent("私は猫が好き", ["私", "は", "猫", "が", "好き"]),
      sent("私は好き", ["私", "は", "好き"]),
    ];
    const order = buildGrowingOrder(statements);
    const sents = order.filter(isSentence).map((s) => s.japanese);
    eq("同长度按原顺序", sents, ["私は好き", "私は犬が好き", "私は猫が好き"]);
  }

  console.log("\n[3] 真实课程：两课都要满足「短句在前长句在后」且不变量成立");
  {
    const dir = join(process.env.JPLINGO_ROOT || process.cwd(), "public/courses/jp-growing");
    const files = readdirSync(dir).filter((f) => f.startsWith("jp-grow-") && f.endsWith(".json"));
    check("找到生长课文件", files.length >= 2, files.join(", "));
    for (const f of files.sort()) {
      const course = JSON.parse(readFileSync(join(dir, f), "utf8"));
      const order = buildPracticeOrder("jp-growing", course.statements);
      const lens = lengths(order as never);
      const ok = lens.every((v, i) => i === 0 || v >= lens[i - 1]);
      check(`${f} 出题顺序句子长度升序（${lens[0]} → ${lens.at(-1)} token）`, ok, JSON.stringify(lens));
      // 文件里也要短句在前（与运行时一致，便于阅读；用 --reorder 修正）
      const fileLens = lengths(
        (course.statements as Array<{ tokens?: unknown[] }>).filter(isSentence) as never,
      );
      const fileOk = fileLens.every((v, i) => i === 0 || v >= fileLens[i - 1]);
      check(`${f} 文件里句子也是短句在前（${fileLens[0]} → ${fileLens.at(-1)} token）`, fileOk, JSON.stringify(fileLens));
      const wordSet = new Set(
        dedupeStatements(course.statements)
          .filter((s: { tokens?: unknown[] }) => !isSentence(s))
          .map((s: { japanese: string }) => s.japanese),
      );
      eq(`${f} 五条不变量无违反`, verifyInvariants(order as never, wordSet as Set<string>), []);

      // 自然度条款：全句「と」≤3、同句不重复内容词（长度不设指标，自然优先）
      const sents = (course.statements as Array<{ japanese: string; tokens: Array<{ text: string }> }>).filter(
        (s: { tokens?: unknown[] }) => (s.tokens || []).length > 1,
      );
      const overTo = sents
        .map((s: { japanese: string; tokens: Array<{ text: string }> }) => ({
          ja: s.japanese,
          n: s.tokens.filter((t) => t.text === "と").length,
        }))
        .filter((x: { n: number }) => x.n > 3);
      eq(`jp-grow ${f} 「と」最多 3 个`, overTo, []);
      const dupWords = sents
        .filter((s: { tokens: Array<{ text: string }> }) => {
          const cs = s.tokens.filter((t) => !PARTICLES.has(t.text)).map((t) => t.text);
          return cs.length !== new Set(cs).size;
        })
        .map((s: { japanese: string }) => s.japanese);
      eq(`${f} 同句不重复内容词`, dupWords, []);
      eq(`${f} 题数 = 数据条数`, order.length, course.statements.length);
      const terminator = order.filter(isSentence).at(-1) as { tokens?: unknown[] };
      check(
        `${f} 终句就是最长的句子（${(terminator.tokens || []).length} token）`,
        (terminator.tokens || []).length === Math.max(...lens),
        `${(terminator.tokens || []).length} vs ${Math.max(...lens)}`,
      );
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n合计 ${results.length} 项，失败 ${failed.length} 项`);
  if (failed.length) {
    console.log("失败项：");
    for (const f of failed) console.log(`  - ${f.name}  ${f.detail ?? ""}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("测试自身异常：", err);
  process.exit(2);
});
