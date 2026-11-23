<template>
  <div class="jp-page-wrap">
    <JpSidebar />
    <main class="jp-page-main">
      <div class="record-container">
        <header class="me-header">
          <div class="avatar">📋</div>
          <h1>记录</h1>
          <p class="subtitle">已学课程 · 已学记录</p>
        </header>

        <!-- ===== 总览 ===== -->
        <section class="me-section">
          <div class="overview">
            <div class="overview-item">
              <span class="ov-label">单词</span>
              <span class="ov-value">{{ wordCount }}</span>
            </div>
            <div class="overview-item">
              <span class="ov-label">句子</span>
              <span class="ov-value">{{ sentenceCount }}</span>
            </div>
            <div class="overview-item">
              <span class="ov-label">假名</span>
              <span class="ov-value">{{ kanaCount }}</span>
            </div>
            <div class="overview-item">
              <span class="ov-label">课程</span>
              <span class="ov-value">{{ courseList.length }}</span>
            </div>
          </div>
        </section>

        <!-- ===== 已学课程 ===== -->
        <section class="me-section">
          <h2>📚 已学课程</h2>

          <div v-if="loading" class="empty">加载中…</div>
          <div v-else-if="courseList.length === 0" class="empty">
            <div class="empty-icon">📭</div>
            <p>还没有学过课程，去「课程」页开始学习吧</p>
          </div>
          <div v-else class="course-groups">
            <div v-for="g in courseGroups" :key="g.packId" class="course-pack-group">
              <button class="pack-group-head" @click="toggleCoursePack(g.packId)">
                <span class="pack-group-arrow" :class="{ open: openCoursePacks.has(g.packId) }">▶</span>
                <span class="pack-group-icon">📁</span>
                <span class="pack-group-title">{{ g.packTitle }}</span>
                <span class="pack-group-count">{{ g.courses.length }} 课</span>
              </button>
              <div v-if="openCoursePacks.has(g.packId)" class="course-list">
                <div v-for="c in g.courses" :key="c.id" class="course-card">
                  <div class="course-head">
                    <div class="course-title">{{ c.title }}</div>
                    <span class="badge" :class="c.completed ? 'done' : 'doing'">
                      {{ c.completed ? "已完成" : "进行中" }}
                    </span>
                  </div>
                  <div class="course-meta">
                    {{ c.learned }} / {{ c.total }} 题 · 掌握 {{ c.mastered }}
                  </div>
                  <div class="progress">
                    <div class="progress-fill" :style="{ width: pct(c) + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== 已学记录 ===== -->
        <section class="me-section">
          <h2>📋 已学记录</h2>

          <div class="tabs">
            <button
              v-for="t in tabs"
              :key="t.key"
              class="tab"
              :class="{ active: activeTab === t.key }"
              @click="activeTab = t.key"
            >
              {{ t.label }}
              <span class="tab-count">{{ countByKind(t.key) }}</span>
            </button>
          </div>

          <div v-if="loading" class="empty">加载中…</div>
          <div v-else-if="activePackGroups.length === 0" class="empty">
            <div class="empty-icon">🗂️</div>
            <p>该分类下还没有记录</p>
          </div>
          <div v-else class="item-packs">
            <div v-for="p in activePackGroups" :key="p.packId" class="item-pack">
              <button class="item-pack-head" @click="toggleRecordPack(p.packId)">
                <span class="pack-group-arrow" :class="{ open: openRecordPacks.has(p.packId) }">▶</span>
                <span class="pack-group-icon">📁</span>
                <span class="pack-group-title">{{ p.packTitle }}</span>
                <span class="pack-group-count">{{ p.courses.length }} 课</span>
              </button>
              <div v-if="openRecordPacks.has(p.packId)" class="item-groups">
                <div v-for="g in p.courses" :key="g.courseId" class="item-group">
                  <button class="group-head" @click="toggleGroup(g.courseId)">
                    <span class="group-arrow" :class="{ open: openGroups.has(g.courseId) }">▶</span>
                    <span class="group-title">{{ g.courseTitle }}</span>
                    <span class="group-count">{{ g.items.length }} 项</span>
                  </button>
                  <div v-if="openGroups.has(g.courseId)" class="group-body">
                    <div v-for="it in g.items" :key="it.key" class="item-row">
                      <span class="item-jp">{{ it.japanese }}</span>
                      <span class="item-kana">{{ it.kana }}</span>
                      <span class="item-zh">{{ it.chinese }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import JpSidebar from "~/components/jp/JpSidebar.vue";
import { useJpStorage } from "~/composables/jp/useJpStorage";
import {
  fetchCoursePacks,
  fetchCourse,
  classifyKind,
  isVocabPack,
  mixedCourseIdOf,
  isMixedCourse,
  type LearnedKind,
} from "~/composables/jp/useJpCourses";
import type { JpCourse, JpCoursePack } from "~/types/jp";
import { toggleSet } from "~/utils/jpCollection";

const { record } = useJpStorage();

const KIND_LABELS: Record<LearnedKind, string> = {
  word: "单词",
  sentence: "句子",
  kana: "假名",
};
const tabs = (Object.keys(KIND_LABELS) as LearnedKind[]).map((key) => ({
  key,
  label: KIND_LABELS[key],
}));

interface CourseRow {
  id: string;
  title: string;
  packId: string;
  packTitle: string;
  total: number;
  learned: number;
  mastered: number;
  completed: boolean;
}
interface ItemRow {
  key: string;
  courseId: string;
  courseTitle: string;
  packId: string;
  packTitle: string;
  japanese: string;
  kana: string;
  chinese: string;
  kind: LearnedKind;
}

const loading = ref(true);
const courseList = ref<CourseRow[]>([]);
const items = ref<ItemRow[]>([]);
const activeTab = ref<LearnedKind>("word");
const openGroups = ref<Set<string>>(new Set());
const openCoursePacks = ref<Set<string>>(new Set());
const openRecordPacks = ref<Set<string>>(new Set());

// 模块级缓存：同一页面加载内跨 load() 复用
let packsCache: JpCoursePack[] | null = null;
const courseCache = new Map<string, JpCourse>();

async function getPacks(): Promise<JpCoursePack[]> {
  if (!packsCache) packsCache = await fetchCoursePacks();
  return packsCache;
}

async function getCourse(packId: string, courseId: string): Promise<JpCourse | null> {
  if (courseCache.has(courseId)) return courseCache.get(courseId)!;
  try {
    const course = await fetchCourse(packId, courseId);
    courseCache.set(courseId, course);
    return course;
  } catch {
    return null;
  }
}

async function load() {
  loading.value = true;
  try {
    await doLoad();
  } catch (err) {
    console.error("加载学习记录失败：", err);
  } finally {
    loading.value = false;
  }
}

async function doLoad() {
  const packs = await getPacks();

  const packOfCourse = new Map<string, string>();
  const packTitleMap = new Map<string, string>();
  for (const p of packs) {
    packTitleMap.set(p.id, p.title || p.id);
    for (const cid of p.courses || []) packOfCourse.set(cid, p.id);
    // 词汇包还有虚拟的「无分类测试」课程（id = <pack>-all，不在 p.courses 里）。
    // 不登记它，记录页就会把它的记录整批丢掉。
    if (isVocabPack(p.id)) packOfCourse.set(mixedCourseIdOf(p.id), p.id);
  }

  // 兜底：课程 id → 课程包的映射不能只依赖 p.courses（热更新缓存里的 course-packs.json
  // 可能与课程文件不同步，导致老课/新课取不到 packId 而被 `continue` 静默丢弃）。
  // 这里按「课程包 id 作为前缀」再匹一次：jp-n5-01 / jp-n5-all → jp-n5，jp-gaokao-07 → jp-gaokao。
  const packIdsByLen = packs.map((p) => p.id).sort((a, b) => b.length - a.length);
  function inferPackId(cid: string): string | undefined {
    const mapped = packOfCourse.get(cid);
    if (mapped && packTitleMap.has(mapped)) return mapped;
    for (const pid of packIdsByLen) {
      if (cid === pid || cid.startsWith(`${pid}-`)) return pid;
    }
    return mapped;
  }

  const studiedSet = new Set(record.value.studiedStatements);
  const masteredSet = new Set(record.value.masteredStatements);
  const completedSet = new Set(record.value.completedCourses);

  const rows: CourseRow[] = [];
  const itemRows: ItemRow[] = [];

  for (const cid of record.value.studiedCourses) {
    // 去重必须是**每门课**独立：词汇课按「每词循环 N 遍」设计，同一课内同一 japanese 会有多个 id。
    // 早期这里用的是全局 set，结果「无分类测试」先把词全占了，分类课程的词一条都登记不上
    // （表现就是：已学记录里只有无分类的词，分类单词课做完不显示）。
    const seenItemKeys = new Set<string>();

    const packId = inferPackId(cid);
    // 无分类测试（虚拟课程 <pack>-all）
    const mixed = !!packId && isMixedCourse(packId, cid);
    if (!packId) {
      // 前缀也推不出来（课程包已被删除/改名）：仍然把记录显示出来，用课程 id 当标题。
      rows.push({
        id: cid,
        title: cid,
        packId: "unknown",
        packTitle: "其他课程",
        total: 0,
        learned: 0,
        mastered: 0,
        completed: completedSet.has(cid),
      });
      continue;
    }
    const packTitle = packTitleMap.get(packId) || packId;
    const course = await getCourse(packId, cid);

    // 记录里属于这门课的 key（cid/xxx）
    const prefix = `${cid}/`;
    const keysOfCourse = record.value.studiedStatements.filter((k) => k.startsWith(prefix));
    const masteredKeysOfCourse = record.value.masteredStatements.filter((k) => k.startsWith(prefix));

    if (!course) {
      // 课程数据暂时取不到（离线缺包/缓存损坏）：课程行照常显示，词数用记录条数兜底，
      // 并把记录里的词也列出来，避免「做过却什么都没有」。
      for (const key of keysOfCourse) {
        const sid = key.slice(prefix.length);
        if (!sid) continue;
        if (mixed && !sid.includes("#")) continue;   // 无分类旧格式的歧义 id（01/02…），别当词显示
        const dedupKey = `word|${sid}`;
        if (seenItemKeys.has(dedupKey)) continue;
        seenItemKeys.add(dedupKey);
        itemRows.push({
          key: `${cid}|${dedupKey}`,
          courseId: cid,
          courseTitle: cid,
          packId,
          packTitle,
          japanese: sid,
          kana: "",
          chinese: "（课程数据缺失，仅显示记录）",
          kind: "word",
        });
      }
      rows.push({
        id: cid,
        title: cid,
        packId,
        packTitle,
        total: keysOfCourse.length,
        learned: keysOfCourse.length,
        mastered: masteredKeysOfCourse.length,
        completed: completedSet.has(cid),
      });
      continue;
    }

    let learned = 0;
    let mastered = 0;
    const matched = new Set<string>();
    for (const stmt of course.statements || []) {
      const key = `${cid}/${stmt.id}`;
      // 兼容旧数据：无分类测试早期把 japanese 当语句 id 写进记录，这里一并认
      const legacyKey = `${cid}/${stmt.japanese}`;
      const studied = studiedSet.has(key) || studiedSet.has(legacyKey);
      const masteredNow = masteredSet.has(key) || masteredSet.has(legacyKey);
      if (studied) {
        learned++;
        matched.add(stmt.id);
        matched.add(stmt.japanese);
        const kind = classifyKind(course.coursePackId, cid, (stmt.tokens || []).length);
        const dedupKey = `${kind}|${stmt.japanese}`;
        if (!seenItemKeys.has(dedupKey)) {
          seenItemKeys.add(dedupKey);
          itemRows.push({
            key: `${cid}|${dedupKey}`,
            courseId: cid,
            courseTitle: course.title || cid,
            packId,
            packTitle,
            japanese: stmt.japanese,
            kana: stmt.kana,
            chinese: stmt.chinese,
            kind,
          });
        }
      }
      if (masteredNow) mastered++;
    }

    // 兜底：记录里有、但当前课程数据里找不到的 key（数据版本不一致 / 旧 id）也显示出来，
    // 否则用户会看到「明明做过却什么都没有」。
    for (const key of keysOfCourse) {
      const sid = key.slice(prefix.length);
      if (!sid || matched.has(sid)) continue;
      // 无分类旧格式（jp-n5-all/01）有歧义：一个 id 对应几十个不同的词，无法确定是哪个，
      // 宁可不当成「词」显示，也不要把整个词库塞进已学记录。
      if (mixed && !sid.includes("#")) continue;
      const dedupKey = `word|${sid}`;
      if (seenItemKeys.has(dedupKey)) continue;
      seenItemKeys.add(dedupKey);
      itemRows.push({
        key: `${cid}|${dedupKey}`,
        courseId: cid,
        courseTitle: course.title || cid,
        packId,
        packTitle,
        japanese: sid,
        kana: "",
        chinese: "（该词在当前课程数据中未找到）",
        kind: "word",
      });
    }

    rows.push({
      id: cid,
      title: course.title || cid,
      packId,
      packTitle,
      total: (course.statements || []).length,
      learned,
      mastered,
      completed: completedSet.has(cid),
    });
  }

  courseList.value = rows;
  items.value = itemRows;
}

const recordSig = computed(
  () =>
    `${record.value.studiedCourses.join(",")}|${record.value.studiedStatements.join(",")}|${record.value.completedCourses.join(",")}|${record.value.masteredStatements.join(",")}`,
);
watch(recordSig, () => load(), { immediate: true });

// 概览计数：同一个词可能出现在多门课里，这里按「类型 + 日语原文」去重后再数
function countByKind(kind: LearnedKind) {
  const seen = new Set<string>();
  for (const i of items.value) {
    if (i.kind === kind) seen.add(i.japanese);
  }
  return seen.size;
}

const wordCount = computed(() => countByKind("word"));
const sentenceCount = computed(() => countByKind("sentence"));
const kanaCount = computed(() => countByKind("kana"));

const activeItems = computed(() => items.value.filter((i) => i.kind === activeTab.value));

const courseGroups = computed(() => {
  const groups: { packId: string; packTitle: string; courses: CourseRow[] }[] = [];
  const seen = new Map<string, number>();
  for (const c of courseList.value) {
    let idx = seen.get(c.packId);
    if (idx === undefined) {
      idx = groups.length;
      seen.set(c.packId, idx);
      groups.push({ packId: c.packId, packTitle: c.packTitle, courses: [] });
    }
    groups[idx].courses.push(c);
  }
  return groups;
});

// 已学记录按「课程包 → 课程」归纳
const activePackGroups = computed(() => {
  const packs: {
    packId: string;
    packTitle: string;
    courses: { courseId: string; courseTitle: string; items: ItemRow[] }[];
  }[] = [];
  const seen = new Map<string, number>();
  for (const it of activeItems.value) {
    let idx = seen.get(it.packId);
    if (idx === undefined) {
      idx = packs.length;
      seen.set(it.packId, idx);
      packs.push({ packId: it.packId, packTitle: it.packTitle, courses: [] });
    }
    const pack = packs[idx];
    let course = pack.courses.find((c) => c.courseId === it.courseId);
    if (!course) {
      course = { courseId: it.courseId, courseTitle: it.courseTitle, items: [] };
      pack.courses.push(course);
    }
    course.items.push(it);
  }
  return packs;
});

function toggleGroup(courseId: string) {
  openGroups.value = toggleSet(openGroups.value, courseId);
}

function toggleCoursePack(packId: string) {
  openCoursePacks.value = toggleSet(openCoursePacks.value, packId);
}

function toggleRecordPack(packId: string) {
  openRecordPacks.value = toggleSet(openRecordPacks.value, packId);
}

function pct(c: CourseRow) {
  if (c.total <= 0) return 0;
  return Math.min(100, Math.round((c.learned / c.total) * 100));
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

.record-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 60px 40px 80px;
  font-family: -apple-system, "Segoe UI", "Noto Sans JP", sans-serif;
}

.me-header {
  text-align: center;
  padding: 32px 0 48px;
}

.avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  margin: 0 auto 20px;
  box-shadow: 0 8px 24px rgba(186, 230, 253, 0.5);
}

.me-header h1 {
  font-size: 32px;
  margin: 0;
  color: #075985;
  font-weight: 600;
  letter-spacing: 2px;
}

.subtitle {
  color: #7dd3fc;
  font-size: 14px;
  margin: 10px 0 0;
}

.me-section {
  margin-bottom: 48px;
}

.me-section h2 {
  font-size: 20px;
  color: #075985;
  margin-bottom: 20px;
  font-weight: 600;
}

/* 总览 */
.overview {
  display: flex;
  gap: 12px;
}

.overview-item {
  flex: 1;
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 14px;
  padding: 18px 12px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.15);
}

.ov-label {
  display: block;
  font-size: 13px;
  color: #7dd3fc;
  margin-bottom: 6px;
}

.ov-value {
  font-size: 24px;
  font-weight: 700;
  color: #0284c7;
}

/* 空态 */
.empty {
  text-align: center;
  padding: 40px 20px;
  background: #ffffff;
  border: 1px dashed #e0f2fe;
  border-radius: 16px;
  color: #7dd3fc;
  font-size: 14px;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 10px;
}

/* 已学课程 */
.course-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.course-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.course-pack-group {
  border: 1px solid #e8f6ff;
  border-radius: 16px;
  background: #fbfeff;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.12);
}

.pack-group-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 18px;
  background: linear-gradient(120deg, #e0f2fe 0%, #d4efff 100%);
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.pack-group-head:hover {
  background: linear-gradient(120deg, #d4efff 0%, #c7edff 100%);
}

.pack-group-arrow {
  font-size: 12px;
  color: #0284c7;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.pack-group-arrow.open {
  transform: rotate(90deg);
}

.pack-group-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.pack-group-title {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #075985;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pack-group-count {
  font-size: 12px;
  color: #0369a1;
  background: #ffffff;
  padding: 2px 10px;
  border-radius: 999px;
  font-weight: 600;
  flex-shrink: 0;
}

.course-pack-group .course-list {
  padding: 12px;
}

.course-card {
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.15);
  transition: all 0.25s;
}

.course-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(186, 230, 253, 0.3);
  border-color: #bae6fd;
}

.course-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.course-title {
  font-size: 16px;
  font-weight: 600;
  color: #075985;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  flex-shrink: 0;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.badge.done {
  background: #dcfce7;
  color: #16a34a;
}

.badge.doing {
  background: #e0f2fe;
  color: #0369a1;
}

.course-meta {
  font-size: 12px;
  color: #7dd3fc;
  margin-bottom: 10px;
}

.progress {
  height: 8px;
  border-radius: 999px;
  background: #f0f9ff;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #38bdf8 0%, #10b981 100%);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 已学记录 */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab {
  padding: 8px 18px;
  border-radius: 999px;
  border: 1px solid #e0f2fe;
  background: #ffffff;
  color: #5b7a8c;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.tab:hover {
  background: #f5fbff;
  color: #0284c7;
}

.tab.active {
  background: linear-gradient(135deg, #e8f6ff 0%, #d4efff 100%);
  color: #075985;
  font-weight: 600;
  border-color: #bae6fd;
  box-shadow: 0 2px 12px rgba(125, 211, 252, 0.25);
}

.tab-count {
  margin-left: 6px;
  font-size: 12px;
  color: #7dd3fc;
}

.tab.active .tab-count {
  color: #0284c7;
}

.item-groups {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item-packs {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.item-pack {
  border: 1px solid #e8f6ff;
  border-radius: 16px;
  background: #fbfeff;
  overflow: hidden;
}

.item-pack-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 18px;
  background: linear-gradient(120deg, #e0f2fe 0%, #d4efff 100%);
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.item-pack-head:hover {
  background: linear-gradient(120deg, #d4efff 0%, #c7edff 100%);
}

.item-pack .item-groups {
  padding: 12px;
}

.item-group {
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.15);
}

.group-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 18px;
  background: #fbfeff;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s;
}

.group-head:hover {
  background: #f5fbff;
}

.group-arrow {
  font-size: 12px;
  color: #7dd3fc;
  transition: transform 0.2s;
}

.group-arrow.open {
  transform: rotate(90deg);
}

.group-title {
  flex: 1;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: #075985;
}

.group-count {
  font-size: 12px;
  color: #7dd3fc;
}

.group-body {
  padding: 4px 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  transition: background 0.15s;
}

.item-row:hover {
  background: #f5fbff;
}

.item-jp {
  font-size: 15px;
  font-weight: 600;
  color: #075985;
  font-family: "Noto Sans JP", sans-serif;
  min-width: 0;
  flex-shrink: 0;
}

.item-kana {
  font-size: 12px;
  color: #38bdf8;
  flex-shrink: 0;
}

.item-zh {
  font-size: 13px;
  color: #5b7a8c;
  margin-left: auto;
  text-align: right;
}

/* 响应式 */
@media (max-width: 768px) {
  .record-container {
    padding: 40px 20px 60px;
  }

  .overview {
    flex-wrap: wrap;
  }

  .overview-item {
    flex: 1 1 40%;
  }

  .item-jp {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .item-row {
    flex-wrap: wrap;
    gap: 6px 10px;
  }

  .item-zh {
    margin-left: 0;
    text-align: left;
    width: 100%;
  }
}
</style>
