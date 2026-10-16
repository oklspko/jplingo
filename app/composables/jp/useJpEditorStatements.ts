import { ref } from "vue";
import type { Ref } from "vue";
import { toHiragana } from "wanakana";
import { useJpTokenizer } from "~/composables/jp/useJpTokenizer";
import { splitSegments, kanaToInputRomaji } from "~/composables/jp/useJpRomaji";
import type { JpCourse, JpStatement } from "~/types/jp";

/**
 * 课程编辑器（jp-editor）的句子与分词编辑
 * （从 app/pages/jp-editor/index.vue 抽出，逻辑逐字搬移）。
 *
 * 单一数据源：句子数据本身（`course.statements`）由页面持有的 `course` ref 承载，
 * 本 composable 只**接收**它（不自己 ref 一份课程）；`showHelp` / `aiPrompt` / 词典状态归本 composable。
 */
export function useJpEditorStatements(course: Ref<JpCourse | null>) {
  // 使用说明：默认展开，便于首次使用快速上手
  const showHelp = ref(true);

  // 发给 AI 的生成提示词模板（复制后自行替换 <> 里的占位符）
  const aiPrompt = `请帮我制作一个日语学习课程包，主题是「<在这里填写主题，例如：校园生活>」，适合 <N5/N4> 水平，共 <N> 句话。

请严格按下面的 JSON 格式输出（不要输出任何解释文字，只输出一个合法 JSON）：

{
  "coursePacks": [
    {
      "id": "my-pack",
      "title": "<课程包标题>",
      "language": "ja",
      "level": "N5",
      "description": "<一句话简介>",
      "courses": ["lesson-01"]
    }
  ],
  "courses": {
    "my-pack/lesson-01": {
      "id": "lesson-01",
      "coursePackId": "my-pack",
      "title": "第一课",
      "order": 1,
      "statements": [
        {
          "id": "lesson-01-01",
          "chinese": "我喝水。",
          "japanese": "私 は 水 を 飲みます",
          "kana": "わたし は みず を のみます",
          "romaji": "watashi wa mizu wo nomimasu",
          "tokens": [
            { "text": "私", "kana": "わたし" },
            { "text": "は", "kana": "は" },
            { "text": "水", "kana": "みず" },
            { "text": "を", "kana": "を" },
            { "text": "飲みます", "kana": "のみます" }
          ]
        }
      ]
    }
  }
}

要求：
1. japanese 用空格把整句拆成「意群」，每个意群对应 tokens 里的一个 token。
2. kana、romaji 也用空格与意群一一对应。
3. tokens 中 text 必须与 japanese 的意群完全一致，kana 为该意群的假名。
4. 句子要地道、实用，适合目标水平，避免生僻或超纲表达。
5. 只输出 JSON，不要输出 Markdown 代码块或多余说明。`;

  const {
    ready: tokenizerReady,
    error: tokenizerError,
    retry: retryTokenizer,
    analyzeSegment,
  } = useJpTokenizer();

  async function onRetryTokenizer() {
    await retryTokenizer();
  }

  // ===== 句子操作 =====
  function addStatement() {
    if (!course.value) return;
    const id = `${course.value.id}-${String(course.value.statements.length + 1).padStart(2, "0")}`;
    course.value.statements.push({
      id,
      chinese: "",
      japanese: "",
      kana: "",
      romaji: "",
      tokens: [{ text: "", kana: "" }],
    });
  }

  function removeStatement(index: number) {
    if (!course.value) return;
    if (!confirm("确认删除这句话？")) return;
    course.value.statements.splice(index, 1);
  }

  function moveUp(index: number) {
    if (!course.value || index === 0) return;
    const arr = course.value.statements;
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
  }

  function moveDown(index: number) {
    if (!course.value || index === course.value.statements.length - 1) return;
    const arr = course.value.statements;
    [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
  }

  function addToken(stmt: JpStatement) {
    stmt.tokens.push({ text: "", kana: "" });
  }

  function removeToken(stmt: JpStatement, ti: number) {
    stmt.tokens.splice(ti, 1);
  }

  // ===== 日语生成 =====
  function onJapaneseBlur(stmt: JpStatement) {
    if (!stmt.japanese) return;

    try {
      const segs = splitSegments(stmt.japanese);
      if (tokenizerReady.value) {
        const segments = segs.map((seg) => analyzeSegment(seg));
        stmt.kana = segments.map((s) => s.kana).join(" ");
        stmt.romaji = segments.map((s) => s.romaji).join(" ");
        stmt.tokens = segments.map((s) => ({ text: s.text, kana: s.kana }));
      } else {
        // 词典未就绪：用 wanakana 降级生成（汉字无法自动注音，需手动补假名）
        const kanas = segs.map((seg) => toHiragana(seg));
        stmt.kana = kanas.join(" ");
        stmt.romaji = kanas.map((k) => kanaToInputRomaji(k)).join(" ");
        stmt.tokens = segs.map((seg, i) => ({ text: seg, kana: kanas[i] }));
      }
    } catch (err) {
      console.error("生成失败：", err);
      alert("生成失败：" + (err as Error).message);
    }
  }

  function autoSplitTokens(stmt: JpStatement) {
    if (!stmt.japanese) {
      alert("请先输入日语");
      return;
    }
    onJapaneseBlur(stmt);
  }

  // ===== 校验 =====
  function isStatementValid(stmt: JpStatement) {
    if (!stmt.chinese || !stmt.japanese || !stmt.kana) return false;
    const jpParts = stmt.japanese.split(/\s+/).filter(Boolean);
    const kanaParts = stmt.kana.split(/\s+/).filter(Boolean);
    if (jpParts.length !== kanaParts.length) return false;
    if (jpParts.length !== stmt.tokens.length) return false;
    return stmt.tokens.every(
      (t, i) => t.text === jpParts[i] && t.kana === kanaParts[i],
    );
  }

  function getValidationMessage(stmt: JpStatement) {
    if (!stmt.chinese) return "中文不能为空";
    if (!stmt.japanese) return "日语不能为空";
    if (!stmt.kana) return "假名不能为空";
    const jpParts = stmt.japanese.split(/\s+/).filter(Boolean);
    const kanaParts = stmt.kana.split(/\s+/).filter(Boolean);
    if (jpParts.length !== kanaParts.length) {
      return `日语意群数（${jpParts.length}）与假名意群数（${kanaParts.length}）不一致`;
    }
    if (jpParts.length !== stmt.tokens.length) {
      return `tokens 数量（${stmt.tokens.length}）与意群数（${jpParts.length}）不一致`;
    }
    for (let i = 0; i < jpParts.length; i++) {
      if (stmt.tokens[i].text !== jpParts[i])
        return `第 ${i + 1} 个 token 的日语不匹配`;
      if (stmt.tokens[i].kana !== kanaParts[i])
        return `第 ${i + 1} 个 token 的假名不匹配`;
    }
    return "数据有误";
  }

  return {
    showHelp,
    aiPrompt,
    tokenizerReady,
    tokenizerError,
    onRetryTokenizer,
    addStatement,
    removeStatement,
    moveUp,
    moveDown,
    addToken,
    removeToken,
    onJapaneseBlur,
    autoSplitTokens,
    isStatementValid,
    getValidationMessage,
  };
}
