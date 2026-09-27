<template>
  <div class="jp-page-wrap">
    <JpSidebar />
    <main class="jp-page-main">
      <div class="editor-container">
        <!-- ===== 顶部工具栏 ===== -->
        <header class="editor-header">
          <div>
            <h1>日语课程编辑器</h1>
            <p class="editor-subtitle">创建、编辑、导出日语课程</p>
          </div>
          <div class="editor-actions">
            <select
              v-model="selectedKey"
              class="editor-input editor-select"
              @change="loadSelectedCourse"
            >
              <option value="" disabled>选择课程…</option>
              <option v-for="opt in courseOptions" :key="opt.key" :value="opt.key">
                {{ opt.label }}
              </option>
            </select>
            <button class="editor-btn" @click="loadSelectedCourse">加载</button>
            <button class="editor-btn" @click="showCreateModal = true">
              ➕ 新建
            </button>
            <label class="editor-btn">
              📂 导入
              <input
                type="file"
                accept=".json"
                style="display: none"
                @change="importJson"
              />
            </label>
            <button
              class="editor-btn primary"
              @click="exportJson"
              :disabled="!course"
            >
              导出 JSON
            </button>
            <button
              class="editor-btn"
              @click="exportCoursePack"
              :disabled="!course"
            >
              📦 导出课程包
            </button>
            <button
              class="editor-btn primary"
              @click="exportAllCourses"
              :disabled="exportingAll"
            >
              {{ exportingAll ? "导出中…" : "📦 导出全部课程" }}
            </button>
          </div>
        </header>

        <!-- ===== 使用说明 ===== -->
        <section class="editor-help">
          <button class="help-toggle" @click="showHelp = !showHelp">
            <span>📖 使用说明：编辑器 + AI 制作自定义课程包</span>
            <span class="help-toggle-arrow">{{ showHelp ? "▲ 收起" : "▼ 展开" }}</span>
          </button>
          <div v-if="showHelp" class="help-body">
            <div class="help-step">
              <h3>① 手动制作</h3>
              <p>
                点「➕ 新建」建课程 → 填中文与日语（日语用空格分隔意群，如「私 は 水 を
                飲みます」）→ 点「→ 生成」自动补全假名 / 罗马字 / 意群 → 确认每句显示「✅
                校验通过」→ 导出。
              </p>
            </div>
            <div class="help-step">
              <h3>② 用 AI 批量生成</h3>
              <p>复制下面提示词发给 AI（Claude / ChatGPT 等），让它按格式生成课程 JSON，再「📂 导入」到编辑器微调：</p>
              <div class="prompt-box">
                <pre>{{ aiPrompt }}</pre>
                <button class="editor-btn small primary" @click="copyPrompt">📋 复制提示词</button>
              </div>
            </div>
            <div class="help-step">
              <h3>③ 导出成课程包，导入 App/网页学习</h3>
              <p>
                编辑完成后点「📦 导出课程包」导出当前这一课，得到一个可直接导入的单文件课程包；
                点「📦 导出全部课程」可把课程页上的全部课程（内置 + 已导入）一次性打包。
                到首页点「导入课程包」选择该文件，即可在网页或 App 里学习。
              </p>
            </div>
          </div>
        </section>

        <!-- ===== 词典状态（不阻塞编辑） ===== -->
        <div v-if="tokenizerError" class="dict-warning">
          <span>⚠️ 词典加载失败：自动「生成假名」不可用，请手动填写假名/罗马字。</span>
          <button class="dict-retry-btn" @click="onRetryTokenizer">重试加载</button>
        </div>
        <div v-else-if="!tokenizerReady" class="dict-loading-note">
          <span class="loading-spinner small"></span>
          <span>词典加载中… 期间可先手动编辑。</span>
        </div>

        <!-- ===== 编辑主体 ===== -->
        <div v-if="course" class="editor-body">
          <section class="editor-section">
            <h2>课程信息</h2>
            <div class="editor-row">
              <label>课程标题：</label>
              <input v-model="course.title" class="editor-input" />
            </div>
            <div class="editor-row">
              <label>课程包 ID：</label>
              <input v-model="course.coursePackId" class="editor-input" />
            </div>
          </section>

          <section class="editor-section">
            <div class="editor-section-header">
              <h2>句子列表（{{ course.statements.length }}）</h2>
              <button class="editor-btn primary" @click="addStatement">
                + 新增句子
              </button>
            </div>

            <div
              v-for="(stmt, index) in course.statements"
              :key="stmt.id"
              class="statement-card"
            >
              <div class="statement-header">
                <span class="statement-num">#{{ index + 1 }}</span>
                <div class="statement-header-actions">
                  <button
                    class="editor-btn small"
                    @click="moveUp(index)"
                    :disabled="index === 0"
                  >
                    ↑
                  </button>
                  <button
                    class="editor-btn small"
                    @click="moveDown(index)"
                    :disabled="index === course.statements.length - 1"
                  >
                    ↓
                  </button>
                  <button
                    class="editor-btn danger small"
                    @click="removeStatement(index)"
                  >
                    删除
                  </button>
                </div>
              </div>

              <div class="editor-row">
                <label>中文：</label>
                <input
                  v-model="stmt.chinese"
                  class="editor-input"
                  placeholder="输入中文意思"
                />
              </div>

              <div class="editor-row">
                <label>日语：</label>
                <input
                  v-model="stmt.japanese"
                  class="editor-input"
                  placeholder="用空格分隔意群，如：私 は 水 を 飲みます"
                  @blur="onJapaneseBlur(stmt)"
                />
                <button class="editor-btn small primary" @click="onJapaneseBlur(stmt)">
                  → 生成
                </button>
              </div>

              <div class="editor-row">
                <label>假名：</label>
                <input
                  v-model="stmt.kana"
                  class="editor-input"
                  placeholder="自动生成，可手动修改（用空格分隔）"
                />
              </div>

              <div class="editor-row">
                <label>罗马字：</label>
                <input
                  v-model="stmt.romaji"
                  class="editor-input"
                  placeholder="自动生成，可手动修改（用空格分隔）"
                />
              </div>

              <div class="tokens-section">
                <div class="tokens-header">
                  <span>意群拆分（{{ stmt.tokens.length }}）</span>
                  <div>
                    <button class="editor-btn small" @click="autoSplitTokens(stmt)">
                      按空格拆分
                    </button>
                    <button class="editor-btn small" @click="addToken(stmt)">
                      + 添加
                    </button>
                  </div>
                </div>
                <div class="tokens-list">
                  <div
                    v-for="(token, ti) in stmt.tokens"
                    :key="ti"
                    class="token-row"
                  >
                    <input
                      v-model="token.text"
                      placeholder="显示（汉字/假名）"
                      class="editor-input small"
                    />
                    <input
                      v-model="token.kana"
                      placeholder="假名"
                      class="editor-input small"
                    />
                    <button
                      class="editor-btn danger small"
                      @click="removeToken(stmt, ti)"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>

              <div
                class="validation"
                :class="{ ok: isStatementValid(stmt), bad: !isStatementValid(stmt) }"
              >
                <span v-if="isStatementValid(stmt)">✅ 数据校验通过</span>
                <span v-else>⚠️ {{ getValidationMessage(stmt) }}</span>
              </div>

              <div class="preview-section">
                <div class="preview-label">预览：</div>
                <div class="preview-chinese">{{ stmt.chinese }}</div>
                <div class="preview-words">
                  <div
                    v-for="(token, ti) in stmt.tokens"
                    :key="ti"
                    class="preview-word"
                  >
                    <div class="preview-word-input">{{ token.kana }}</div>
                    <div class="preview-word-text">{{ token.text }}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- ===== 空状态 ===== -->
        <div v-else class="editor-empty">
          <div class="empty-icon">📝</div>
          <p>从上方下拉选择一个课程点「加载」，或点「➕ 新建」创建新课程</p>
          <p class="hint">支持编辑内置课程、已导入课程，也可新建自定义课程</p>
        </div>
      </div>
    </main>

    <!-- ===== 新建课程弹窗 ===== -->
    <transition name="modal">
      <div v-if="showCreateModal" class="modal-mask" @click.self="closeCreateModal">
        <div class="modal-box">
          <h3>新建课程</h3>
          <div class="modal-row">
            <label>课程 ID：</label>
            <input
              v-model="newCourse.id"
              class="editor-input"
              placeholder="如 jp-03"
            />
          </div>
          <div class="modal-row">
            <label>课程标题：</label>
            <input
              v-model="newCourse.title"
              class="editor-input"
              placeholder="如 第三课"
            />
          </div>
          <div class="modal-row">
            <label>课程包 ID：</label>
            <input
              v-model="newCourse.coursePackId"
              class="editor-input"
              placeholder="如 my-pack"
            />
          </div>
          <div class="modal-actions">
            <button class="editor-btn" @click="closeCreateModal">取消</button>
            <button class="editor-btn primary" @click="createCourse">创建</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from "vue";
import { toHiragana } from "wanakana";
import JpSidebar from "~/components/jp/JpSidebar.vue";
import { fetchCourse, fetchCoursePacks } from "~/composables/jp/useJpCourses";
import { useJpTokenizer } from "~/composables/jp/useJpTokenizer";
import { splitSegments, kanaToInputRomaji } from "~/composables/jp/useJpRomaji";
import {
  saveOrShareJson,
  buildSingleCoursePack,
  buildAllCoursesPack,
} from "~/composables/jp/useJpExport";
import type { JpCourse, JpCoursePack, JpStatement } from "~/types/jp";

const course = ref<JpCourse | null>(null);

// 课程选择器：列出「内置 + 已导入」的所有课程
const packs = ref<JpCoursePack[]>([]);
const selectedKey = ref("");
interface CourseOption {
  key: string;
  packId: string;
  courseId: string;
  label: string;
}
const courseOptions = ref<CourseOption[]>([]);

// 新建弹窗
const showCreateModal = ref(false);
const newCourse = reactive({
  id: "",
  title: "",
  coursePackId: "my-pack",
});

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

// ===== 加载已有课程 =====
onMounted(loadCourseOptions);

async function loadCourseOptions() {
  try {
    packs.value = await fetchCoursePacks();
    const opts: CourseOption[] = [];
    for (const p of packs.value) {
      for (const cid of p.courses || []) {
        opts.push({
          key: `${p.id}/${cid}`,
          packId: p.id,
          courseId: cid,
          label: `[${p.title}] ${cid}`,
        });
      }
    }
    courseOptions.value = opts;
    if (opts.length && !selectedKey.value) {
      selectedKey.value = opts[0].key;
      await loadSelectedCourse();
    }
  } catch (err) {
    console.error("加载课程列表失败：", err);
  }
}

function loadSelectedCourse() {
  if (!selectedKey.value) return;
  const idx = selectedKey.value.indexOf("/");
  const packId = selectedKey.value.slice(0, idx);
  const courseId = selectedKey.value.slice(idx + 1);
  loadCourse(packId, courseId);
}

async function loadCourse(packId: string, courseId: string) {
  try {
    course.value = await fetchCourse(packId, courseId);
  } catch (err) {
    alert("加载失败：" + (err as Error).message);
    course.value = null;
  }
}

// ===== 新建课程 =====
function closeCreateModal() {
  showCreateModal.value = false;
}

function createCourse() {
  if (!newCourse.id || !newCourse.title) {
    alert("请填写课程 ID 和标题");
    return;
  }

  const packId = newCourse.coursePackId || "my-pack";
  course.value = {
    id: newCourse.id,
    coursePackId: packId,
    title: newCourse.title,
    order: 1,
    statements: [],
  };

  // 同步到选择器
  const key = `${packId}/${newCourse.id}`;
  if (!courseOptions.value.some((o) => o.key === key)) {
    courseOptions.value.push({
      key,
      packId,
      courseId: newCourse.id,
      label: `[${packId}] ${newCourse.id}`,
    });
  }
  selectedKey.value = key;

  // 自动加一条空句子
  addStatement();

  // 关闭弹窗，重置表单
  showCreateModal.value = false;
  newCourse.id = "";
  newCourse.title = "";
  newCourse.coursePackId = "my-pack";

  nextTick(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ===== 导入 JSON =====
// 同时支持「单课 JSON」和「单文件课程包 JSON」（取第一课编辑，其余可分别导入）
async function importJson(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    let courseData: any;
    let note = "";
    if (data && data.courses && typeof data.courses === "object") {
      const keys = Object.keys(data.courses);
      if (keys.length === 0) {
        alert("课程包内没有课程");
        return;
      }
      courseData = data.courses[keys[0]];
      if (keys.length > 1) {
        note = `（课程包共 ${keys.length} 课，已载入第 1 课，其余可分别导入）`;
      }
    } else {
      courseData = data;
    }

    if (!courseData?.id || !Array.isArray(courseData.statements)) {
      alert("JSON 格式不对：缺少 id 或 statements");
      return;
    }

    course.value = courseData;
    const importedPackId = courseData.coursePackId || "my-pack";
    const key = `${importedPackId}/${courseData.id}`;
    if (!courseOptions.value.some((o) => o.key === key)) {
      courseOptions.value.push({
        key,
        packId: importedPackId,
        courseId: courseData.id,
        label: `[${importedPackId}] ${courseData.id}`,
      });
    }
    selectedKey.value = key;

    alert("导入成功！" + note);
  } catch (err) {
    alert("导入失败：" + (err as Error).message);
  } finally {
    // 清空 file input，允许重复导入同一个文件
    input.value = "";
  }
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

// ===== 导出 =====
const exportingAll = ref(false);

async function exportJson() {
  if (!course.value) return;
  await saveOrShareJson(course.value, `${course.value.id}.json`);
}

// 把当前单课包装成「单文件课程包」，可直接在首页「导入课程包」导入
async function exportCoursePack() {
  if (!course.value) return;
  const pack = buildSingleCoursePack(course.value);
  const packId = course.value.coursePackId || "my-pack";
  await saveOrShareJson(pack, `${packId}.json`);
}

// 导出课程页上的全部课程（内置 + 已导入）
async function exportAllCourses() {
  if (exportingAll.value) return;
  exportingAll.value = true;
  try {
    const pack = await buildAllCoursesPack();
    await saveOrShareJson(pack, "jplingo-all-courses.json");
  } catch (err) {
    alert("导出失败：" + (err as Error).message);
  } finally {
    exportingAll.value = false;
  }
}

// ===== 复制 AI 提示词 =====
async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(aiPrompt);
    alert("已复制提示词，去粘贴给 AI 吧");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = aiPrompt;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    alert("已复制提示词");
  }
}
</script>

<style scoped>
.jp-page-wrap {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fcff 0%, #f5fbff 40%, #fbfeff 100%);
}
.jp-page-main {
  margin-left: 220px;
  min-height: 100vh;
}
@media (max-width: 768px) {
  .jp-page-main {
    margin-left: 0;
  }
}

.editor-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 60px 40px;
  font-family: -apple-system, "Segoe UI", "Noto Sans JP", sans-serif;
}

/* 顶部 */
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 24px;
  border-bottom: 1px solid #e8f6ff;
  margin-bottom: 40px;
  gap: 24px;
  flex-wrap: wrap;
}

.editor-header h1 {
  font-size: 28px;
  margin: 0 0 6px;
  color: #075985;
  font-weight: 600;
}

.editor-subtitle {
  font-size: 14px;
  color: #7dd3fc;
  margin: 0;
}

.editor-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

/* 输入框 */
.editor-input {
  padding: 12px 16px;
  border: 2px solid #e8f6ff;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  background: #fff;
  color: #075985;
  transition: all 0.2s;
  font-family: inherit;
}

.editor-input::placeholder {
  color: #bae6fd;
}

.editor-input:focus {
  border-color: #bae6fd;
  box-shadow: 0 0 0 4px rgba(186, 230, 253, 0.2);
}

.editor-input.small {
  width: auto;
  min-width: 120px;
  flex: 1;
}

/* 按钮 */
.editor-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border: 2px solid #e8f6ff;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  color: #0369a1;
  transition: all 0.2s;
  font-family: inherit;
  font-weight: 500;
  white-space: nowrap;
  text-decoration: none;
}

.editor-btn:hover:not(:disabled) {
  background: #f5fbff;
  border-color: #bae6fd;
  color: #0284c7;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(186, 230, 253, 0.25);
}

.editor-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.editor-btn.primary {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(186, 230, 253, 0.4);
}

.editor-btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #bae6fd 0%, #7dd3fc 100%);
  color: #075985;
  box-shadow: 0 6px 16px rgba(186, 230, 253, 0.55);
}

.editor-btn.danger {
  color: #ef4444;
  border-color: #fee2e2;
}

.editor-btn.danger:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.editor-btn.small {
  padding: 6px 12px;
  font-size: 13px;
  margin-left: 4px;
}

/* 区块 */
.editor-section {
  margin-bottom: 48px;
}

.editor-section h2 {
  font-size: 18px;
  margin-bottom: 20px;
  color: #075985;
  font-weight: 600;
}

.editor-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.editor-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.editor-row label {
  min-width: 100px;
  color: #0369a1;
  font-size: 14px;
  font-weight: 500;
}

/* 句子卡片 */
.statement-card {
  border: 1px solid #e8f6ff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.12);
}

.statement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.statement-num {
  font-weight: 700;
  color: #075985;
  font-size: 16px;
}

.statement-header-actions {
  display: flex;
  gap: 6px;
}

/* Tokens */
.tokens-section {
  margin-top: 20px;
  padding: 20px;
  background: #f8fcff;
  border-radius: 12px;
  border: 1px dashed #bae6fd;
}

.tokens-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  font-size: 14px;
  color: #0369a1;
  font-weight: 500;
}

.tokens-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.token-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 校验 */
.validation {
  margin-top: 20px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
}

.validation.ok {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  color: #16a34a;
}

.validation.bad {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  color: #dc2626;
}

/* 预览 */
.preview-section {
  margin-top: 20px;
  padding: 20px;
  background: #f8fcff;
  border-radius: 12px;
  border: 1px solid #e8f6ff;
}

.preview-label {
  font-size: 12px;
  color: #7dd3fc;
  margin-bottom: 14px;
  font-weight: 500;
}

.preview-chinese {
  font-size: 22px;
  text-align: center;
  color: #075985;
  margin-bottom: 20px;
  font-weight: 500;
}

.preview-words {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.preview-word {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 10px;
  border-bottom: 2px solid #bae6fd;
  min-height: 50px;
  justify-content: flex-end;
}

.preview-word-input {
  font-size: 22px;
  color: #075985;
}

.preview-word-text {
  font-size: 12px;
  color: #7dd3fc;
  margin-top: 4px;
}

/* 空状态 */
.editor-empty {
  text-align: center;
  padding: 100px 20px;
  color: #7dd3fc;
  font-size: 16px;
}

.editor-empty .hint {
  font-size: 13px;
  color: #bae6fd;
  margin-top: 12px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

/* 加载 */
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e8f6ff;
  border-top-color: #7dd3fc;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== 使用说明 ===== */
.editor-help {
  margin-bottom: 32px;
  border: 1px solid #e8f6ff;
  border-radius: 16px;
  background: #ffffff;
  overflow: hidden;
}

.help-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 16px 20px;
  border: none;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  color: #075985;
  font-family: inherit;
}

.help-toggle-arrow {
  font-size: 13px;
  color: #0369a1;
}

.help-body {
  padding: 8px 20px 20px;
}

.help-step {
  padding: 16px 0;
  border-bottom: 1px dashed #e8f6ff;
}

.help-step:last-child {
  border-bottom: none;
}

.help-step h3 {
  font-size: 15px;
  color: #075985;
  margin: 0 0 8px;
  font-weight: 600;
}

.help-step p {
  font-size: 14px;
  line-height: 1.7;
  color: #0369a1;
  margin: 0;
}

.help-step code {
  background: #f0f9ff;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 13px;
  color: #0284c7;
}

.prompt-box {
  margin-top: 12px;
}

.prompt-box pre {
  margin: 0;
  padding: 16px;
  background: #f8fcff;
  border: 1px solid #e8f6ff;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #075985;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow-y: auto;
  font-family: "SF Mono", "Consolas", monospace;
}

.prompt-box .editor-btn {
  margin-top: 10px;
}

/* ===== 弹窗 ===== */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(7, 89, 133, 0.25);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  background: #ffffff;
  border-radius: 20px;
  padding: 32px 40px;
  width: 90%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(7, 89, 133, 0.2);
  animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalIn {
  0% {
    opacity: 0;
    transform: scale(0.9) translateY(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-box h3 {
  font-size: 22px;
  color: #075985;
  margin: 0 0 24px;
  font-weight: 600;
}

.modal-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.modal-row label {
  min-width: 90px;
  color: #0369a1;
  font-size: 14px;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 28px;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* ===== 课程选择器 ===== */
.editor-select {
  width: auto;
  min-width: 220px;
  max-width: 340px;
  padding: 12px 16px;
  cursor: pointer;
}

/* ===== 词典状态提示 ===== */
.dict-warning {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-bottom: 24px;
  padding: 12px 16px;
  border: 1px solid #fde68a;
  border-radius: 10px;
  background: #fffbeb;
  color: #92400e;
  font-size: 14px;
  line-height: 1.6;
}

.dict-retry-btn {
  padding: 6px 14px;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  background: #fff;
  color: #92400e;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;
}

.dict-retry-btn:hover {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #78350f;
}

.dict-loading-note {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
  padding: 10px 16px;
  border: 1px dashed #bae6fd;
  border-radius: 10px;
  background: #f8fcff;
  color: #0369a1;
  font-size: 13px;
}

.loading-spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
  margin: 0;
  flex-shrink: 0;
}
</style>