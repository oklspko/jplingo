// 句子生长顺序的「直接单元测试」（合成夹具 + 边界情形），补充 spec-growing.ts 的真实数据验证
// 运行：node tests/offline-tts/run.cjs
import {
  buildGrowingOrder,
  splitWordsAndSentences,
  sortSentencesShortToLong,
  buildWordIndex,
  unlearnedWordsIn,
} from "../../app/composables/jp/useJpCourses";

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
const jp = (list: Array<{ japanese: string }>) => list.map((s) => s.japanese);

function main() {
  console.log("\n[1] 空输入 / 全单词 / 全句子");
  {
    eq("空列表 → []", buildGrowingOrder([]), []);
    eq("全单词 → 保持原顺序", jp(buildGrowingOrder([w("b"), w("a"), w("c")])), ["b", "a", "c"]);
    eq(
      "全句子 → 短句在前（稳定）",
      jp(buildGrowingOrder([sent("長い", ["私", "は", "犬", "を", "見る"]), sent("短い", ["私", "は", "見る"])])),
      ["短い", "長い"],
    );
  }

  console.log("\n[2] 词先句后 + 已练词不重复单练 + 孤立词最后");
  {
    const statements = [
      w("私"), w("見る"), w("犬"), w("孤立語"),
      sent("私は見る", ["私", "は", "見る"]),
      sent("私は犬を見る", ["私", "は", "犬", "を", "見る"]),
    ];
    const order = jp(buildGrowingOrder(statements));
    eq(
      "词先句后：短句前先练「私、見る」，长句前补练「犬」，孤立词最后",
      order,
      ["私", "見る", "私は見る", "犬", "私は犬を見る", "孤立語"],
    );
  }

  console.log("\n[3] 助词 / 无匹配 token 永不单练（token 必须精确匹配单词 japanese）");
  {
    const statements = [
      w("私"),
      sent("私は見る", ["私", "は", "見る"]), // 「は」是助词、「見る」无对应单词 → 都不单练
    ];
    eq("只有「私」被单练，助词与无匹配词被跳过", jp(buildGrowingOrder(statements)), ["私", "私は見る"]);
  }

  console.log("\n[4] 同句重复出现的内容词只单练一次（used 去重）");
  {
    const statements = [
      w("猫"),
      sent("猫と猫", ["猫", "と", "猫"]), // 内容词「猫」出现两次，但只单练一次
    ];
    eq("「猫」只单练一次", jp(buildGrowingOrder(statements)), ["猫", "猫と猫"]);
  }

  console.log("\n[5] 一词多句：只在其首次进入句子前单练一次");
  {
    const statements = [
      w("私"), w("犬"),
      sent("私は犬", ["私", "は", "犬"]),
      sent("犬は私", ["犬", "は", "私"]),
    ];
    const order = buildGrowingOrder(statements);
    // 「私」「犬」在第一个短句前就都练过了，第二个句子不再重复单练
    eq("第二个句子前不再重复单练", jp(order), ["私", "犬", "私は犬", "犬は私"]);
  }

  console.log("\n[6] 拆分/排序/索引/抽取 四个纯函数各自正确");
  {
    const { words, sentences } = splitWordsAndSentences([w("a"), sent("a b", ["a", "b"])]);
    eq("splitWordsAndSentences 拆对", [words.length, sentences.length], [1, 1]);

    const sorted = jp(
      sortSentencesShortToLong([
        sent("三", ["1", "2", "3"]),
        sent("一", ["1"]),
        sent("二", ["1", "2"]),
      ]),
    );
    eq("sortSentencesShortToLong 升序稳定", sorted, ["一", "二", "三"]);

    const idx = buildWordIndex([w("犬"), w("猫")]);
    eq("buildWordIndex 精确匹配", idx.get("犬")?.japanese === "犬" && idx.get("豚") === undefined, true);

    const learned = new Set(["私"]);
    const got = jp(unlearnedWordsIn(sent("私は犬", ["私", "は", "犬"]), idx, learned));
    eq("unlearnedWordsIn 跳过已练的「私」、跳过助词、命中「犬」", got, ["犬"]);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n合计 ${results.length} 项，失败 ${failed.length} 项`);
  if (failed.length) {
    for (const f of failed) console.log(`  - ${f.name}  ${f.detail ?? ""}`);
    process.exit(1);
  }
}

main();
