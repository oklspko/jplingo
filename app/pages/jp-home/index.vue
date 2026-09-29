<template>
  <div class="jp-page-wrap">
    <JpSidebar />
    <main class="jp-page-main">
      <div class="home-container">
        <header class="home-header">
          <h1>jp-lingo</h1>
          <p class="subtitle">用连词成句的方式学习日语</p>
          <div class="beginner-tip">
            <span class="tip-icon">💡</span>
            <span class="tip-text">
              不会日语输入法？从 <strong>五十音</strong> 开始，边练边熟悉罗马字输入
            </span>
          </div>
          <div class="home-actions">
            <button class="action-btn action-btn--primary" @click="openImport">
              <svg class="action-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 4v11" /><path d="m7 11 5 5 5-5" /><path d="M4 19a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1z" />
              </svg>导入课程包
            </button>
            <button class="action-btn" @click="createFolder">
              <svg class="action-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" /><path d="M12 10v6M9 13h6" />
              </svg>新建文件夹
            </button>
            <button class="action-btn" @click="openManage">
              <svg class="action-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /><circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="7" cy="18" r="2" />
              </svg>分组管理
            </button>
          </div>
        </header>

        <main class="home-main">
          <div v-if="loading" class="loading">加载中…</div>

          <template v-else>
            <!-- ===== 其他课程包（五十音 / 句子生长等，保持学习顺序在前）===== -->
            <section
              v-for="pack in nonVocabPacks"
              :key="pack.id"
              class="course-pack"
              :class="{ expanded: isExpanded(pack.id) }"
            >
              <!-- 课程包标题（可点击折叠） -->
              <div
                class="pack-header"
                role="button"
                tabindex="0"
                @click="togglePack(pack.id)"
                @keydown.enter.prevent="togglePack(pack.id)"
                :aria-expanded="isExpanded(pack.id)"
              >
                <div class="pack-header-left">
                  <span class="pack-arrow" :class="{ rotated: isExpanded(pack.id) }">▶</span>
                  <h2>{{ pack.title }}</h2>
                  <span class="pack-level">{{ pack.level }}</span>
                </div>
                <div class="pack-header-right">
                  <div v-if="isImported(pack.id)" class="pack-menu" @click.stop>
                    <button
                      class="pack-icon-btn pack-more"
                      :class="{ 'pack-more-open': openMenuId === pack.id }"
                      title="更多操作"
                      @click="togglePackMenu(pack.id)"
                    >⋯</button>
                    <transition name="menu-fade">
                      <div v-if="openMenuId === pack.id" class="pack-menu-dropdown">
                        <button class="pack-menu-item" @click="renamePack(pack.id); closeAllMenus()">✏️ 重命名</button>
                        <button class="pack-menu-item danger" @click="removePack(pack.id); closeAllMenus()">🗑 删除</button>
                      </div>
                    </transition>
                  </div>
                </div>
              </div>

              <!-- 课程列表（可折叠区域） -->
              <transition name="fold">
                <div v-show="isExpanded(pack.id)" class="course-list-wrapper">
                  <p class="pack-desc">{{ pack.description }}</p>
                  <div class="course-list">
                    <a
                      v-if="isVocabPack(pack.id)"
                      class="course-card mixed-test-card"
                      :href="mixedGameUrl(pack.id)"
                    >
                      <div class="course-title">🎯 无分类测试</div>
                      <div class="course-meta">已掌握 {{ mixedMasteredCount(pack.id) }} 词 · 连续答对 5 次即掌握</div>
                    </a>
                    <a
                      v-for="courseId in pack.courses"
                      :key="courseId"
                      class="course-card"
                      :href="`/jp-study/${pack.id}/${courseId}`"
                    >
                      <div class="course-title">{{ getCourseTitle(pack.id, courseId) }}</div>
                      <div class="course-meta">
                        {{ courseMetaText(pack.id, courseId) }}
                      </div>
                    </a>
                  </div>
                </div>
              </transition>
            </section>

            <!-- ===== 单词课程收纳（高考日语 + N1–N5，放在句子生长之后）===== -->
            <section class="vocab-collection" :class="{ expanded: collectionExpanded }">
              <div
                class="collection-header"
                role="button"
                tabindex="0"
                @click="collectionExpanded = !collectionExpanded"
                @keydown.enter.prevent="collectionExpanded = !collectionExpanded"
                :aria-expanded="collectionExpanded"
              >
                <div class="collection-header-left">
                  <span class="pack-arrow" :class="{ rotated: collectionExpanded }">▶</span>
                  <span class="collection-icon">📚</span>
                  <div class="collection-title-block">
                    <h2>单词课程</h2>
                    <p class="collection-desc">高考日语 · N1–N5 · 共 {{ vocabPacks.length }} 个课程包</p>
                  </div>
                </div>
              </div>

              <transition name="fold">
                <div v-show="collectionExpanded" class="collection-body">
                  <section
                    v-for="pack in vocabPacks"
                    :key="pack.id"
                    class="course-pack"
                    :class="{ expanded: isExpanded(pack.id) }"
                  >
                    <!-- 课程包标题（可点击折叠） -->
                    <div
                      class="pack-header"
                      role="button"
                      tabindex="0"
                      @click="togglePack(pack.id)"
                      @keydown.enter.prevent="togglePack(pack.id)"
                      :aria-expanded="isExpanded(pack.id)"
                    >
                      <div class="pack-header-left">
                        <span class="pack-arrow" :class="{ rotated: isExpanded(pack.id) }">▶</span>
                        <h2>{{ pack.title }}</h2>
                        <span class="pack-level">{{ pack.level }}</span>
                      </div>
                      <div class="pack-header-right">
                        <div v-if="isImported(pack.id)" class="pack-menu" @click.stop>
                          <button
                            class="pack-icon-btn pack-more"
                            :class="{ 'pack-more-open': openMenuId === pack.id }"
                            title="更多操作"
                            @click="togglePackMenu(pack.id)"
                          >⋯</button>
                          <transition name="menu-fade">
                            <div v-if="openMenuId === pack.id" class="pack-menu-dropdown">
                              <button class="pack-menu-item" @click="renamePack(pack.id); closeAllMenus()">✏️ 重命名</button>
                              <button class="pack-menu-item danger" @click="removePack(pack.id); closeAllMenus()">🗑 删除</button>
                            </div>
                          </transition>
                        </div>
                      </div>
                    </div>

                    <!-- 课程列表（可折叠区域） -->
                    <transition name="fold">
                      <div v-show="isExpanded(pack.id)" class="course-list-wrapper">
                        <p class="pack-desc">{{ pack.description }}</p>
                        <div class="course-list">
                          <a
                            v-if="isVocabPack(pack.id)"
                            class="course-card mixed-test-card"
                            :href="mixedGameUrl(pack.id)"
                          >
                            <div class="course-title">🎯 无分类测试</div>
                            <div class="course-meta">已掌握 {{ mixedMasteredCount(pack.id) }} 词 · 连续答对 5 次即掌握</div>
                          </a>
                          <a
                            v-for="courseId in pack.courses"
                            :key="courseId"
                            class="course-card"
                            :href="`/jp-study/${pack.id}/${courseId}`"
                          >
                            <div class="course-title">{{ getCourseTitle(pack.id, courseId) }}</div>
                            <div class="course-meta">
                              {{ courseMetaText(pack.id, courseId) }}
                            </div>
                          </a>
                        </div>
                      </div>
                    </transition>
                  </section>
                </div>
              </transition>
            </section>
          </template>
        </main>
      </div>

      <!-- 导入课程包弹窗 -->
      <div v-if="showImport" class="import-overlay" @click.self="showImport = false">
        <div class="import-modal" role="dialog" aria-modal="true">
          <h3>导入课程包</h3>
          <div class="import-tabs">
            <button :class="{ active: importTab === 'url' }" @click="importTab = 'url'">粘贴 URL</button>
            <button :class="{ active: importTab === 'file' }" @click="importTab = 'file'">选择文件</button>
          </div>

          <div v-if="importTab === 'url'" class="import-field">
            <input
              v-model="importUrl"
              type="text"
              placeholder="https://example.com/course-pack.json"
              @keyup.enter="doImportUrl"
            />
            <button class="import-submit" :disabled="importing" @click="doImportUrl">
              {{ importing ? "导入中…" : "导入" }}
            </button>
          </div>

          <div v-else class="import-field">
            <input
              type="file"
              accept=".json,application/json"
              :disabled="importing"
              @change="doImportFile"
            />
            <p class="import-hint">选择「单文件打包」课程包 JSON</p>
          </div>

          <p v-if="importError" class="import-msg import-error">{{ importError }}</p>
          <p v-if="importOk" class="import-msg import-ok">{{ importOk }}</p>

          <div class="import-footer">
            <a href="https://github.com/oklspko/jplingo/blob/main/docs/course-pack-format.md" target="_blank" class="import-link">课程包格式说明 ↗</a>
            <button class="import-close" @click="showImport = false">关闭</button>
          </div>
        </div>
      </div>

      <!-- 分组管理弹窗 -->
      <div v-if="showManage" class="manage-overlay" @click.self="showManage = false">
        <div class="manage-modal" role="dialog" aria-modal="true">
          <div class="manage-head">
            <h3>🗂 分组管理</h3>
            <button class="manage-close" @click="showManage = false">×</button>
          </div>
          <p class="manage-hint">重命名课程、移动到其他文件夹、按名称排序，都在这里完成。</p>

          <div v-if="importedPacks.length === 0" class="manage-empty">
            还没有导入的课程包，先「📥 导入课程包」或「🗂 新建文件夹」吧。
          </div>

          <div v-for="p in importedPacks" :key="p.id" class="manage-group">
            <div class="manage-group-head">
              <span class="manage-group-icon">📁</span>
              <span class="manage-group-name">{{ p.title }}</span>
              <span class="manage-group-count">{{ p.courses.length }} 课</span>
              <div class="manage-menu" @click.stop>
                <button class="manage-mini manage-more" title="更多操作" @click="toggleManageMenu(p.id)">⋯</button>
                <transition name="menu-fade">
                  <div v-if="openManageMenuId === p.id" class="manage-menu-dropdown">
                    <button class="manage-menu-item" @click="renamePack(p.id); closeAllMenus()">✏️ 重命名文件夹</button>
                    <button class="manage-menu-item" @click="sortPackByName(p.id); closeAllMenus()">🔤 按名称排序</button>
                    <button class="manage-menu-item danger" @click="removePack(p.id); closeAllMenus()">🗑 删除文件夹</button>
                  </div>
                </transition>
              </div>
            </div>
            <div class="manage-course-list">
              <div v-for="cid in p.courses" :key="cid" class="manage-course-row">
                <span class="manage-course-name">{{ courseTitleOf(p.id, cid) }}</span>
                <select
                  class="manage-move"
                  title="移动到文件夹"
                  @change="moveCourseTo(p.id, cid, $event)"
                >
                  <option value="">移动到…</option>
                  <option
                    v-for="tp in importedPacks"
                    :key="tp.id"
                    :value="tp.id"
                    :disabled="tp.id === p.id"
                  >{{ tp.title }}</option>
                </select>
                <div class="manage-menu" @click.stop>
                  <button class="manage-mini manage-more" title="更多操作" @click="toggleManageCourseMenu(`${p.id}/${cid}`)">⋯</button>
                  <transition name="menu-fade">
                    <div v-if="openManageCourseMenuId === `${p.id}/${cid}`" class="manage-menu-dropdown">
                      <button class="manage-menu-item" @click="renameCourse(p.id, cid); closeAllMenus()">✏️ 重命名课程</button>
                      <button class="manage-menu-item danger" @click="deleteCourse(p.id, cid); closeAllMenus()">🗑 删除课程</button>
                    </div>
                  </transition>
                </div>
              </div>
              <div v-if="p.courses.length === 0" class="manage-course-empty">（空文件夹）</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import JpSidebar from "~/components/jp/JpSidebar.vue";
import {
  fetchCoursePacks,
  fetchCourseMeta,
  sortCoursePacks,
  isVocabPack,
  mixedCourseIdOf,
} from "~/composables/jp/useJpCourses";
import { useJpVocabMemory } from "~/composables/jp/useJpGaokaoMemory";
import {
  importPackFromUrl,
  importPackFromFile,
  removeImportedPack,
  listImportedPacks,
  createImportedPack,
  renameImportedPack,
  removeImportedCourse,
  moveImportedCourse,
  renameImportedCourse,
  sortImportedCoursesByName,
  getImportedCourse,
} from "~/composables/jp/useJpImportedPacks";
import type { JpCoursePack } from "~/types/jp";

interface CourseIndex {
  [key: string]: { title: string; count: number };
}

const coursePacks = ref<JpCoursePack[]>([]);
const courseIndex = ref<CourseIndex>({});
const loading = ref(true);
const importedPackIds = ref<Set<string>>(new Set());
// 已加载过元数据的课程包（避免重复请求）／正在加载中的课程包（用于「加载中…」提示）
const loadedPacks = ref<Set<string>>(new Set());
const loadingPacks = ref<Set<string>>(new Set());

// 单词课程收纳：把 6 个词汇包（高考日语 + N5–N1）归为一组，点开使用
const collectionExpanded = ref(false);
const vocabPacks = computed(() => coursePacks.value.filter((p) => isVocabPack(p.id)));
const nonVocabPacks = computed(() => coursePacks.value.filter((p) => !isVocabPack(p.id)));
// 已导入的课程包（文件夹），供「移动到文件夹」下拉选择
const importedPacks = computed(() => coursePacks.value.filter((p) => importedPackIds.value.has(p.id)));

// 各词汇包「无分类测试」进度（已掌握词数）
function mixedGameUrl(packId: string) {
  return `/jp-game/${packId}/${mixedCourseIdOf(packId)}`;
}
function mixedMasteredCount(packId: string) {
  return useJpVocabMemory(packId).masteredCount();
}

// 导入弹窗状态
const showImport = ref(false);
const importTab = ref<"url" | "file">("url");
const importUrl = ref("");
const importing = ref(false);
const importError = ref("");
const importOk = ref("");

// 展开状态：默认第一个展开
const expandedPacks = ref<Set<string>>(new Set());

function isExpanded(packId: string): boolean {
  return expandedPacks.value.has(packId);
}

function togglePack(packId: string) {
  const newSet = new Set(expandedPacks.value);
  if (newSet.has(packId)) {
    newSet.delete(packId);
  } else {
    newSet.add(packId);
    loadPackMeta(packId); // 展开时按需加载该包课程标题/题数
  }
  expandedPacks.value = newSet;
}

// 并发上限：一次最多同时请求的课程数，避免展开大包时瞬间发出上百个请求
const META_CONCURRENCY = 6;

async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

// 加载某个课程包下所有课程的标题+题数（并行、带并发上限，结果合并进 courseIndex）
async function loadPackMeta(packId: string) {
  if (loadedPacks.value.has(packId) || loadingPacks.value.has(packId)) return;
  const pack = coursePacks.value.find((p) => p.id === packId);
  if (!pack || pack.courses.length === 0) return;

  loadingPacks.value = new Set([...loadingPacks.value, packId]);
  try {
    const metas = await mapConcurrent(pack.courses, META_CONCURRENCY, (courseId) =>
      fetchCourseMeta(packId, courseId).then((meta) => ({ courseId, meta })),
    );
    const next = { ...courseIndex.value };
    for (const { courseId, meta } of metas) {
      next[`${packId}/${courseId}`] = meta;
    }
    courseIndex.value = next;
    loadedPacks.value = new Set([...loadedPacks.value, packId]);
  } finally {
    const s = new Set(loadingPacks.value);
    s.delete(packId);
    loadingPacks.value = s;
  }
}

async function loadAll() {
  loading.value = true;
  try {
    const packs = sortCoursePacks(await fetchCoursePacks());
    coursePacks.value = packs;
    importedPackIds.value = new Set(listImportedPacks().map((p) => p.id));

    // 默认全部折叠，由用户自行展开

    // 课程元数据按需加载：只请求当前已展开的课程包，其余在展开时再加载
    courseIndex.value = {};
    loadedPacks.value = new Set();
    loadingPacks.value = new Set();
    await Promise.all([...expandedPacks.value].map(loadPackMeta));
  } catch (err) {
    console.error("加载课程失败：", err);
  } finally {
    loading.value = false;
  }
}

onMounted(loadAll);

function getCourseTitle(packId: string, courseId: string) {
  return courseIndex.value[`${packId}/${courseId}`]?.title || courseId;
}

function courseMetaText(packId: string, courseId: string): string {
  const meta = courseIndex.value[`${packId}/${courseId}`];
  if (meta) return `${meta.count} 题`;
  return loadingPacks.value.has(packId) ? "加载中…" : "0 题";
}

function isImported(packId: string): boolean {
  return importedPackIds.value.has(packId);
}

function openImport() {
  showImport.value = true;
  importError.value = "";
  importOk.value = "";
}

async function doImportUrl() {
  const url = importUrl.value.trim();
  if (!url) {
    importError.value = "请输入课程包 URL";
    return;
  }
  importing.value = true;
  importError.value = "";
  importOk.value = "";
  try {
    const added = await importPackFromUrl(url);
    importOk.value = `已导入：${added.map((p) => p.title).join("、")}`;
    importUrl.value = "";
    await loadAll();
  } catch (err) {
    importError.value = (err as Error).message || "导入失败";
  } finally {
    importing.value = false;
  }
}

async function doImportFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  importing.value = true;
  importError.value = "";
  importOk.value = "";
  try {
    const added = await importPackFromFile(file);
    importOk.value = `已导入：${added.map((p) => p.title).join("、")}`;
    await loadAll();
  } catch (err) {
    importError.value = (err as Error).message || "导入失败";
  } finally {
    importing.value = false;
    input.value = "";
  }
}

async function removePack(packId: string) {
  if (!confirm("确定删除该课程包？")) return;
  removeImportedPack(packId);
  await loadAll();
}

// ===== 分组管理（仅导入的课程包） =====
const showManage = ref(false);

function openManage() {
  showManage.value = true;
}

// ===== 三点拓展菜单（首页课程包 / 分组管理） =====
const openMenuId = ref("");
const openManageMenuId = ref("");
const openManageCourseMenuId = ref("");

function togglePackMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? "" : id;
}
function toggleManageMenu(id: string) {
  openManageMenuId.value = openManageMenuId.value === id ? "" : id;
}
function toggleManageCourseMenu(key: string) {
  openManageCourseMenuId.value = openManageCourseMenuId.value === key ? "" : key;
}
function closeAllMenus() {
  openMenuId.value = "";
  openManageMenuId.value = "";
  openManageCourseMenuId.value = "";
}

onMounted(() => document.addEventListener("click", closeAllMenus));
onUnmounted(() => document.removeEventListener("click", closeAllMenus));

function courseTitleOf(packId: string, courseId: string): string {
  return getImportedCourse(packId, courseId)?.title || courseId;
}

async function renameCourse(packId: string, courseId: string) {
  const name = prompt("重命名课程：", courseTitleOf(packId, courseId));
  if (!name) return;
  renameImportedCourse(packId, courseId, name);
  await loadAll();
}

async function sortPackByName(packId: string) {
  sortImportedCoursesByName(packId);
  await loadAll();
}

async function moveCourseTo(packId: string, courseId: string, event: Event) {
  const sel = event.target as HTMLSelectElement;
  const toPackId = sel.value;
  if (!toPackId) return;
  moveImportedCourse(courseId, packId, toPackId);
  await loadAll();
}

async function deleteCourse(packId: string, courseId: string) {
  if (!confirm(`确定删除课程「${courseTitleOf(packId, courseId)}」？`)) return;
  removeImportedCourse(packId, courseId);
  await loadAll();
}

async function renamePack(packId: string) {
  const p = coursePacks.value.find((x) => x.id === packId);
  const name = prompt("重命名文件夹：", p?.title || packId);
  if (!name) return;
  renameImportedPack(packId, name);
  await loadAll();
}

async function createFolder() {
  const name = prompt("新建文件夹名称：", "新建文件夹");
  if (!name) return;
  createImportedPack(name);
  await loadAll();
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

.home-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 60px 40px;
  font-family: -apple-system, "Segoe UI", "Noto Sans JP", sans-serif;
}

.home-header {
  text-align: center;
  padding: 40px 0 48px;
}

.home-header h1 {
  font-size: 42px;
  margin: 0 0 12px;
  color: #075985;
  letter-spacing: 3px;
  font-weight: 600;
}

.subtitle {
  color: #7dd3fc;
  font-size: 15px;
  margin: 0 0 24px;
}

/* 新手提示条 */
.beginner-tip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #fffef5 0%, #fef3c7 100%);
  border: 2px dashed #fbbf24;
  border-radius: 14px;
  max-width: 100%;
  animation: tipPulse 2s ease-in-out infinite;
}

@keyframes tipPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(251, 191, 36, 0); }
}

.tip-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.tip-text {
  font-size: 14px;
  color: #78350f;
  line-height: 1.6;
}

.tip-text strong {
  color: #92400e;
  font-weight: 700;
  padding: 1px 6px;
  background: #fde68a;
  border-radius: 5px;
}

@media (max-width: 768px) {
  .beginner-tip {
    padding: 10px 14px;
    gap: 8px;
  }
  .tip-icon { font-size: 16px; }
  .tip-text { font-size: 12px; }
}

.home-main {
  min-height: 200px;
}

.loading {
  text-align: center;
  color: #7dd3fc;
  padding: 80px 0;
  font-size: 16px;
}

/* ===== 单词课程收纳 ===== */
.vocab-collection {
  margin-bottom: 20px;
  border: 1px solid #bae6fd;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.18);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.vocab-collection.expanded {
  box-shadow: 0 10px 36px rgba(56, 189, 248, 0.28);
  border-color: #7dd3fc;
}

.collection-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px;
  background: linear-gradient(120deg, #e0f2fe 0%, #d4efff 50%, #c7edff 100%);
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.2s;
}

.collection-header:hover {
  background: linear-gradient(120deg, #d4efff 0%, #c7edff 100%);
}

.collection-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
}

.collection-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  box-shadow: 0 6px 18px rgba(2, 132, 199, 0.35);
}

.collection-title-block {
  flex: 1;
  min-width: 0;
}

.collection-title-block h2 {
  font-size: 22px;
  margin: 0;
  color: #075985;
  font-weight: 700;
  letter-spacing: 1px;
}

.collection-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: #0369a1;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collection-body {
  padding: 16px;
  background: #f8fcff;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 768px) {
  .collection-header {
    padding: 16px 18px;
    gap: 10px;
  }
  .collection-icon {
    width: 40px;
    height: 40px;
    font-size: 22px;
    border-radius: 12px;
  }
  .collection-title-block h2 {
    font-size: 18px;
  }
  .collection-desc {
    font-size: 12px;
  }
  .collection-body {
    padding: 10px;
    gap: 10px;
  }
}

/* ===== 课程包 ===== */
.course-pack {
  margin-bottom: 20px;
  border: 1px solid #e8f6ff;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.15);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.course-pack.expanded {
  box-shadow: 0 8px 32px rgba(125, 211, 252, 0.25);
  border-color: #bae6fd;
}

/* 标题栏 */
.pack-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.2s;
}

.pack-header:hover {
  background: #f5fbff;
}

.course-pack.expanded .pack-header {
  background: linear-gradient(135deg, #ffffff 0%, #f5fbff 100%);
  border-bottom: 1px solid #e8f6ff;
}

.pack-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
}

/* 箭头 */
.pack-arrow {
  display: inline-block;
  font-size: 12px;
  color: #7dd3fc;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
  flex-shrink: 0;
}

.pack-arrow.rotated {
  transform: rotate(90deg);
  color: #0284c7;
}

.pack-header h2 {
  font-size: 22px;
  margin: 0;
  color: #075985;
  font-weight: 600;
  /* 不设 flex:1：避免短标题被拉伸、把等级徽标挤到最右与删除按钮挤成一团。
     仅 min-width:0 允许超长标题在必要时截断，等级徽标紧跟标题。 */
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pack-level {
  display: inline-block;
  padding: 3px 12px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985;
  font-size: 12px;
  border-radius: 10px;
  font-weight: 600;
  flex-shrink: 0;
  white-space: nowrap;
  line-height: 1.4;
}

.pack-header-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ===== 折叠区域 ===== */
.course-list-wrapper {
  padding: 20px 24px 24px;
}

.pack-desc {
  color: #7dd3fc;
  font-size: 14px;
  margin: 0 0 20px;
  line-height: 1.6;
}

.course-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.course-card {
  display: block;
  padding: 20px;
  border: 1px solid #e8f6ff;
  border-radius: 12px;
  background: #f8fcff;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  color: inherit;
}

.course-card:hover {
  border-color: #bae6fd;
  background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(125, 211, 252, 0.25);
}

.course-title {
  font-size: 17px;
  color: #075985;
  font-weight: 600;
  margin-bottom: 8px;
}

.course-meta {
  font-size: 13px;
  color: #0369a1;
  line-height: 1.5;
}

.course-card.mixed-test-card {
  background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%);
  border-color: #fde68a;
}
.course-card.mixed-test-card:hover {
  background: linear-gradient(135deg, #fef9c3 0%, #fde68a 100%);
  border-color: #fbbf24;
}
.course-card.mixed-test-card .course-title {
  color: #854d0e;
}

/* ===== 折叠动画 ===== */
.fold-enter-active,
.fold-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.fold-enter-from,
.fold-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.fold-enter-to,
.fold-leave-from {
  opacity: 1;
  max-height: 2000px;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .home-container {
    padding: 40px 20px;
  }

  .home-header h1 {
    font-size: 32px;
  }

  .pack-header {
    padding: 16px 18px;
  }

  .pack-header h2 {
    font-size: 18px;
  }

  .pack-level {
    font-size: 11px;
    padding: 2px 8px;
  }

  .course-list-wrapper {
    padding: 16px 18px 20px;
  }

  .course-list {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .course-card {
    padding: 16px;
  }

  .course-title {
    font-size: 16px;
  }
}

/* ===== 首页操作按钮 ===== */
.home-actions {
  margin-top: 24px;
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border-radius: 999px;
  border: 1.5px solid #bae6fd;
  background: #ffffff;
  color: #0369a1;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(186, 230, 253, 0.18);
}

.action-btn:hover {
  background: #f0f9ff;
  border-color: #7dd3fc;
  color: #0284c7;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(125, 211, 252, 0.28);
}

.action-ico {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: inline-block;
}

.action-btn--primary {
  background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 6px 16px rgba(2, 132, 199, 0.32);
}

.action-btn--primary:hover {
  background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
  color: #fff;
}

@media (max-width: 768px) {
  .home-actions {
    gap: 6px;
    flex-wrap: nowrap;
  }
  .action-btn {
    flex: 1 1 0;
    min-width: 0;
    padding: 9px 4px;
    font-size: 12px;
    gap: 4px;
    white-space: nowrap;
    justify-content: center;
  }
  .action-ico {
    width: 15px;
    height: 15px;
  }
}

/* ===== 三点拓展菜单 ===== */
.pack-menu,
.manage-menu {
  position: relative;
  display: inline-flex;
}

.pack-icon-btn.pack-more,
.manage-more {
  font-size: 18px;
  line-height: 1;
  font-weight: 700;
}

.pack-icon-btn.pack-more-open {
  background: #f0f9ff;
  border-color: #7dd3fc;
  color: #0284c7;
}

.pack-menu-dropdown,
.manage-menu-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 148px;
  background: #ffffff;
  border: 1px solid #e0f2fe;
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(7, 89, 133, 0.18);
  padding: 5px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pack-menu-item,
.manage-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #0369a1;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}

.pack-menu-item:hover,
.manage-menu-item:hover {
  background: #f0f9ff;
  color: #0284c7;
}

.pack-menu-item.danger,
.manage-menu-item.danger {
  color: #dc2626;
}

.pack-menu-item.danger:hover,
.manage-menu-item.danger:hover {
  background: #fef2f2;
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.pack-icon-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid #e0f2fe;
  border-radius: 8px;
  background: #fff;
  color: #0369a1;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.pack-icon-btn:hover {
  background: #f0f9ff;
  border-color: #bae6fd;
  color: #0284c7;
}

.pack-icon-btn.danger {
  color: #dc2626;
  border-color: #fecaca;
}

.pack-icon-btn.danger:hover {
  background: #fef2f2;
  border-color: #ef4444;
}

/* ===== 分组管理弹窗 ===== */
.manage-overlay {
  position: fixed;
  inset: 0;
  background: rgba(7, 89, 133, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 20px;
}

.manage-modal {
  width: 100%;
  max-width: 640px;
  max-height: 80vh;
  overflow-y: auto;
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(7, 89, 133, 0.3);
}

.manage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.manage-head h3 {
  margin: 0;
  color: #075985;
  font-size: 20px;
}

.manage-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #f0f9ff;
  color: #0369a1;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.manage-hint {
  margin: 0 0 16px;
  font-size: 13px;
  color: #7dd3fc;
  line-height: 1.6;
}

.manage-empty {
  padding: 32px 0;
  text-align: center;
  color: #7dd3fc;
  font-size: 14px;
}

.manage-group {
  border: 1px solid #e8f6ff;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
}

.manage-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f0f9ff;
  flex-wrap: wrap;
}

.manage-group-icon {
  font-size: 16px;
}

.manage-group-name {
  font-size: 15px;
  font-weight: 600;
  color: #075985;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.manage-group-count {
  font-size: 12px;
  color: #0369a1;
  background: #e0f2fe;
  padding: 2px 8px;
  border-radius: 8px;
}

.manage-course-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.manage-course-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid #eef7fd;
  border-radius: 10px;
}

.manage-course-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #075985;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manage-course-empty {
  padding: 12px;
  text-align: center;
  color: #bae6fd;
  font-size: 13px;
}

.manage-mini {
  flex-shrink: 0;
  padding: 5px 10px;
  border: 1px solid #e0f2fe;
  border-radius: 8px;
  background: #fff;
  color: #0369a1;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.manage-mini:hover {
  background: #f0f9ff;
  border-color: #bae6fd;
  color: #0284c7;
}

.manage-mini.danger {
  color: #dc2626;
  border-color: #fecaca;
}

.manage-mini.danger:hover {
  background: #fef2f2;
  border-color: #ef4444;
}

.manage-move {
  flex-shrink: 0;
  padding: 5px 8px;
  border: 1px solid #e0f2fe;
  border-radius: 8px;
  background: #fff;
  color: #0369a1;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  max-width: 140px;
}

/* 弹窗 */
.import-overlay {
  position: fixed;
  inset: 0;
  background: rgba(7, 89, 133, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.import-modal {
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(7, 89, 133, 0.3);
}

.import-modal h3 {
  margin: 0 0 16px;
  color: #075985;
  font-size: 20px;
}

.import-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.import-tabs button {
  flex: 1;
  padding: 8px;
  border: 1px solid #e8f6ff;
  border-radius: 10px;
  background: #f8fcff;
  color: #5b7a8c;
  font-size: 14px;
  cursor: pointer;
}

.import-tabs button.active {
  background: linear-gradient(135deg, #e8f6ff 0%, #d4efff 100%);
  color: #075985;
  font-weight: 600;
  border-color: #bae6fd;
}

.import-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.import-field input[type="text"] {
  padding: 12px 14px;
  border: 1px solid #e8f6ff;
  border-radius: 10px;
  font-size: 14px;
  color: #075985;
  outline: none;
}

.import-field input[type="text"]:focus {
  border-color: #7dd3fc;
  box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.2);
}

.import-submit {
  padding: 11px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.import-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.import-hint {
  margin: 0;
  font-size: 13px;
  color: #7dd3fc;
}

.import-msg {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.5;
}

.import-error {
  color: #dc2626;
}

.import-ok {
  color: #059669;
}

.import-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
}

.import-link {
  font-size: 13px;
  color: #0284c7;
  text-decoration: none;
}

.import-link:hover {
  text-decoration: underline;
}

.import-close {
  padding: 8px 18px;
  border: 1px solid #e8f6ff;
  border-radius: 10px;
  background: #f8fcff;
  color: #5b7a8c;
  font-size: 14px;
  cursor: pointer;
}
</style>