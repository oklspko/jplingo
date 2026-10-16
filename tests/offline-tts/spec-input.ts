// 输入判定状态机的直接测试（useJpInput.ts），对齐 earthworm 的 Input/Fix/Fix_Input 语义。
// 关键不变量：incorrect 只在 submit 时一次性标记，修复过程中保持不变（不实时推导）。
// 运行：node tests/offline-tts/run.cjs
import { useJpInput } from "../../app/composables/jp/useJpInput";

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

const TOKENS = [
  { text: "私", kana: "わたし" },
  { text: "は", kana: "は" },
  { text: "犬", kana: "いぬ" },
];

function makeInput() {
  let cursor = 0;
  const fixCalls: string[] = [];
  const machine = useJpInput({
    tokens: () => TOKENS,
    isSingleKana: () => false,
    setInputCursorPosition: (p) => {
      cursor = p;
    },
    getInputCursorPosition: () => cursor,
    fixCallback: () => fixCalls.push("fix"),
  });
  return { machine, fixCalls };
}

async function main() {
  console.log("\n[1] 初始化：每个 token 一个词槽，第一个是活动词");
  {
    const { machine } = makeInput();
    machine.initialize();
    eq("3 个词槽", machine.userInputWords.length, 3);
    eq("第一个词活动", machine.userInputWords[0].isActive, true);
    eq("其余不活动", machine.userInputWords.slice(1).every((w) => !w.isActive), true);
  }

  console.log("\n[2] 提交正确 → correctCallback + 回到 Input + 清空输入");
  {
    const { machine } = makeInput();
    machine.initialize();
    let correct = 0;
    let wrong = 0;
    machine.setInputValue("わたし は いぬ");
    machine.submitAnswer(
      () => correct++,
      () => wrong++,
    );
    eq("correct 回调触发", correct, 1);
    eq("wrong 回调未触发", wrong, 0);
    eq("输入串被清空", machine.inputValue.value, "");
    eq("仍在 Input 模式", machine.isFixMode(), false);
  }

  console.log("\n[3] 提交错误 → wrongCallback + 进入 Fix + 只标错错词");
  {
    const { machine } = makeInput();
    machine.initialize();
    let correct = 0;
    let wrong = 0;
    machine.setInputValue("わたし は ねこ"); // 第三词应为 いぬ
    machine.submitAnswer(
      () => correct++,
      () => wrong++,
    );
    eq("wrong 回调触发", wrong, 1);
    eq("进入 Fix 模式", machine.isFixMode(), true);
    eq("前两词没错", [machine.userInputWords[0].incorrect, machine.userInputWords[1].incorrect], [false, false]);
    eq("第三词标错", machine.userInputWords[2].incorrect, true);
  }

  console.log("\n[4] incorrect 只在提交时标记：修复中改对也不实时清除（状态机 vs 实时推导）");
  {
    const { machine } = makeInput();
    machine.initialize();
    machine.setInputValue("わたし は ねこ"); // 第三词应为 いぬ
    machine.submitAnswer();
    // 修复过程中把错词改成正确的：incorrect 必须仍为 true（不会被实时重算）
    machine.userInputWords[2].userInput = "いぬ";
    eq("改对后 incorrect 仍保持（直到下次提交）", machine.userInputWords[2].incorrect, true);
    // 进入修复：Fix → Fix_Input，第一个错词（词 2）被清空
    await machine.fixFirstIncorrectWord();
    eq("进入 Fix_Input", machine.isFixInputMode(), true);
    // 重新输入正确词，再提交（Fix_Input 模式下 submitAnswer 才允许；Fix 模式下它是 no-op）
    machine.userInputWords[2].userInput = "いぬ";
    let correct = 0;
    machine.submitAnswer(() => correct++);
    eq("重新提交后判定为正确", correct, 1);
    eq("退出 Fix", machine.isFixMode(), false);
  }

  console.log("\n[5] Fix → 进入 Fix_Input 并清空第一个错词（fixFirstIncorrectWord 是异步的）");
  {
    const { machine, fixCalls } = makeInput();
    machine.initialize();
    machine.setInputValue("ねこ は いぬ"); // 第一词错（应为 わたし）
    machine.submitAnswer();
    await machine.fixFirstIncorrectWord();
    eq("进入 Fix_Input", machine.isFixInputMode(), true);
    eq("第一个错词被清空", machine.userInputWords[0].userInput, "");
    eq("触发 fix 跳转音", fixCalls.length, 1);
  }

  console.log("\n[6] Fix_Input：空格跳到下一个错词；最后一个错词空格 = 重新提交");
  {
    const { machine } = makeInput();
    machine.initialize();
    machine.setInputValue("ねこ は ねこ"); // 第一、三词错
    machine.submitAnswer();
    machine.fixFirstIncorrectWord(); // 清空词 0
    let submitCount = 0;
    const consumed = machine.handleSpace(() => submitCount++); // 当前不是最后一个错词 → 跳到词 2
    eq("跳到下一个错词（空格被消费）", consumed, true);
    eq("词 2 被清空", machine.userInputWords[2].userInput, "");
    eq("还没重新提交", submitCount, 0);
    // 现在词 2 是最后一个错词，再按空格 = 重新提交
    machine.handleSpace(() => submitCount++);
    eq("最后一个错词空格 → 重新提交", submitCount, 1);
  }

  console.log("\n[7] Fix_Input：当前错词为空时退格 → 回到上一个错词");
  {
    const { machine } = makeInput();
    machine.initialize();
    machine.setInputValue("ねこ は ねこ");
    machine.submitAnswer();
    machine.fixFirstIncorrectWord(); // 清空词 0
    machine.handleSpace(() => {}); // 跳到词 2 并清空
    machine.handleKeyboardInput(
      { code: "Backspace", preventDefault() {} } as KeyboardEvent,
      () => {},
    );
    eq("退格后回到词 0（当前编辑词 id 回到 0）", machine.currentEditWordId(), 0);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n合计 ${results.length} 项，失败 ${failed.length} 项`);
  if (failed.length) {
    for (const f of failed) console.log(`  - ${f.name}  ${f.detail ?? ""}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("测试自身异常：", err);
  process.exit(2);
});
