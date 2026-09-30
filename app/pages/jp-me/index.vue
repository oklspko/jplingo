<template>
  <div class="jp-page-wrap">
    <JpSidebar />
    <main class="jp-page-main">
      <div class="me-container">
        <header class="me-header">
          <div class="avatar">👤</div>
          <h1>我的</h1>
          <p class="subtitle">学习数据</p>
        </header>

        <!-- ===== 账号 / 登录 ===== -->
        <section class="me-section me-account">
          <div v-if="user" class="account-card">
            <div class="account-info">
              <div class="account-label">已登录</div>
              <div class="account-email">{{ user.email }}</div>
              <div v-if="syncMsg" class="account-sync-status">{{ syncMsg }}</div>
            </div>
            <div class="account-actions">
              <button class="account-btn account-btn--sync" :disabled="syncing" @click="onSync">
                {{ syncing ? "同步中…" : "立即同步" }}
              </button>
              <button class="account-btn account-btn--logout" @click="onLogout">退出登录</button>
            </div>
          </div>
          <a v-else href="/login" class="account-card">
            <div class="account-info">
              <div class="account-label">未登录</div>
              <div class="account-email">登录后学习记录云端同步、换设备不丢</div>
            </div>
            <span class="account-btn">登录 / 注册</span>
          </a>
        </section>

        <!-- ===== 更多入口 ===== -->
        <section class="me-section">
          <h2>🧭 更多入口</h2>
          <div class="links-grid">
            <a href="/jp-words" class="link-card">
              <span class="link-icon">🗂️</span>
              <span class="link-text">
                <span class="link-label">词库</span>
                <span class="link-desc">单词检索 · 按等级词性浏览</span>
              </span>
              <span class="link-arrow">→</span>
            </a>
            <a href="/jp-editor" class="link-card">
              <span class="link-icon">✏️</span>
              <span class="link-text">
                <span class="link-label">编辑器</span>
                <span class="link-desc">课程制作 · 自定义课程包</span>
              </span>
              <span class="link-arrow">→</span>
            </a>
            <a href="/jp-grammar" class="link-card">
              <span class="link-icon">🔎</span>
              <span class="link-text">
                <span class="link-label">语法条词典</span>
                <span class="link-desc">按五十音 · N5–N1 检索语法条</span>
              </span>
              <span class="link-arrow">→</span>
            </a>
          </div>
        </section>

        <!-- ===== 离线发音（安卓端） ===== -->
        <section class="me-section">
          <h2>🔊 离线发音</h2>
          <div class="tts-card">
            <div class="tts-info">
              <div class="tts-title">{{ ttsTitle }}</div>
              <div class="tts-desc">{{ ttsDesc }}</div>
              <div v-if="ttsTryMsg" class="tts-msg">{{ ttsTryMsg }}</div>
              <div v-if="ttsError" class="tts-msg tts-msg--err">{{ ttsError }}</div>
              <div v-if="ttsDownloading || ttsInstalling" class="tts-progress">
                <div class="tts-progress-bar" :style="{ width: ttsProgressWidth }"></div>
              </div>
              <div v-if="ttsDownloading" class="tts-progress-text">{{ ttsProgressText }}</div>
              <div v-else-if="ttsInstalling" class="tts-progress-text">
                解压中…（约 123MB，请保持 App 在前台）
              </div>
            </div>
            <div class="tts-actions">
              <button
                v-if="ttsSupported && !ttsInstalled"
                class="tts-btn tts-btn--go"
                :disabled="ttsDownloading || ttsInstalling"
                @click="onDownloadTts"
              >
                {{ ttsDownloading || ttsInstalling ? "处理中…" : "下载离线语音" }}
              </button>
              <template v-else-if="ttsInstalled">
                <button class="tts-btn" :disabled="ttsTrying" @click="onTryTts">
                  {{ ttsTrying ? "合成中…" : "试听" }}
                </button>
                <button
                  class="tts-btn tts-btn--danger"
                  :disabled="ttsDownloading || ttsInstalling"
                  @click="onDeleteTts"
                >
                  删除
                </button>
              </template>
            </div>
          </div>
        </section>

        <!-- ===== 学习统计 ===== -->
        <section class="me-section">
          <h2>📊 学习统计</h2>

          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-icon">🔥</span>
              <span class="stat-body">
                <span class="stat-value">{{ streak }}<span class="stat-unit">天</span></span>
                <span class="stat-label">连续打卡</span>
              </span>
            </div>

            <div class="stat-card highlight">
              <span class="stat-icon">📅</span>
              <span class="stat-body">
                <span class="stat-value">{{ todayMinutes }}<span class="stat-unit">分</span></span>
                <span class="stat-label">今日学习</span>
              </span>
            </div>

            <div class="stat-card">
              <span class="stat-icon">📚</span>
              <span class="stat-body">
                <span class="stat-value">{{ record.courseCount }}</span>
                <span class="stat-label">已学课程</span>
              </span>
            </div>

            <div class="stat-card">
              <span class="stat-icon">✏️</span>
              <span class="stat-body">
                <span class="stat-value">{{ record.statementCount }}</span>
                <span class="stat-label">已学句子</span>
              </span>
            </div>

            <div class="stat-card">
              <span class="stat-icon">⭐</span>
              <span class="stat-body">
                <span class="stat-value">{{ record.masteredCount }}</span>
                <span class="stat-label">已掌握</span>
              </span>
            </div>

            <div class="stat-card">
              <span class="stat-icon">⏱</span>
              <span class="stat-body">
                <span class="stat-value">{{ totalDuration }}</span>
                <span class="stat-label">总学习时长</span>
              </span>
            </div>
          </div>

          <div class="daily-info">
            <div class="daily-item">
              <span class="daily-label">今日已学</span>
              <span class="daily-value">{{ record.todayStatements }} 句</span>
            </div>
            <div class="daily-item">
              <span class="daily-label">累计打卡</span>
              <span class="daily-value">{{ record.days.length }} 天</span>
            </div>
            <div class="daily-item">
              <span class="daily-label">已完成</span>
              <span class="daily-value">{{ record.completedCourses.length }} 课</span>
            </div>
          </div>
        </section>

        <!-- ===== 打卡日历 ===== -->
        <section class="me-section">
          <h2>📅 打卡日历</h2>
          <JpCheckinCalendar :days="record.days" />
        </section>

        <!-- ===== 数据管理 ===== -->
        <section class="me-section">
          <h2>⚙️ 数据管理</h2>
          <div class="danger-card">
            <div class="danger-info">
              <div class="danger-title">重置学习记录</div>
              <div class="danger-desc">清空所有学习统计，此操作不可恢复</div>
            </div>
            <button class="danger-btn" @click="confirmReset">重置</button>
          </div>
        </section>

        <!-- ===== 版本更新 ===== -->
        <section class="me-section">
          <h2>🔄 版本更新</h2>
          <div class="update-card">
            <div class="update-info">
              <div class="update-current">当前版本 v{{ appVersion }}</div>
              <div v-if="checking" class="update-msg">检查中…</div>
              <div v-else-if="hasUpdate" class="update-msg update-msg--new">
                发现新版本 v{{ latestVersion }}
              </div>
              <div v-else-if="checked" class="update-msg">已是最新版本 ✅</div>
              <div v-if="errorMsg" class="update-msg update-msg--err">{{ errorMsg }}</div>
            </div>
            <div class="update-actions">
              <button
                class="update-btn"
                :disabled="checking"
                @click="onCheckUpdate"
              >
                {{ checking ? "检查中…" : "检查更新" }}
              </button>
              <button
                v-if="hasUpdate"
                class="update-btn update-btn--go"
                @click="onUpdateNow"
              >
                立即更新
              </button>
            </div>
            <a
              v-if="hasUpdate"
              class="update-direct"
              :href="directApkUrl"
              target="_blank"
              rel="noopener"
            >
              加速下载失败？GitHub 直连
            </a>
          </div>
        </section>

        <!-- ===== 关于 ===== -->
        <section class="me-section me-about">
          <a v-if="!isNative" href="/release" class="about-link">📱 下载 Android App</a>
          <div class="about-version">jp-lingo v{{ appVersion }}</div>
        </section>
      </div>
    </main>

    <!-- 重置确认弹窗 -->
    <transition name="modal">
      <div v-if="showResetModal" class="modal-mask" @click.self="showResetModal = false">
        <div class="modal-box">
          <div class="modal-icon">⚠️</div>
          <h3>确认重置？</h3>
          <p>将清空所有学习记录（课程数、句子数、时长、打卡等），操作不可恢复。</p>
          <div class="modal-actions">
            <button class="modal-btn cancel" @click="showResetModal = false">取消</button>
            <button class="modal-btn danger" @click="doReset">确认重置</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Capacitor } from "@capacitor/core";
import JpSidebar from "~/components/jp/JpSidebar.vue";
import JpCheckinCalendar from "~/components/jp/JpCheckinCalendar.vue";
import { useJpAuth } from "~/composables/jp/useJpAuth";
import { useJpUpdate } from "~/composables/jp/useJpUpdate";
import {
  useJpStorage,
  calcStreak,
} from "~/composables/jp/useJpStorage";
import {
  useJpTts,
  ttsPercent,
  TTS_MODEL_BYTES,
  TTS_TEST_TEXT,
} from "~/composables/jp/useJpTts";
import { speakOfflineNow } from "~/composables/jp/useJpSound";

const { record, resetRecord, syncNow } = useJpStorage();
const { user, signOut } = useJpAuth();
const isNative = Capacitor.isNativePlatform();
const runtimeConfig = useRuntimeConfig();
const appVersion = runtimeConfig.public.appVersion;

/* ---------- 离线发音引擎（sherpa-onnx 内置 TTS） ---------- */
const {
  supported: ttsSupported,
  installed: ttsInstalled,
  downloading: ttsDownloading,
  installing: ttsInstalling,
  progress: ttsProgress,
  receivedBytes: ttsReceivedBytes,
  error: ttsError,
  refreshStatus: refreshTtsStatus,
  downloadModel: downloadTtsModel,
  deleteModel: deleteTtsModel,
} = useJpTts();

const ttsModelUrl = String(runtimeConfig.public.ttsModelUrl || "");
const ttsTrying = ref(false);
const ttsTryMsg = ref("");

const ttsTitle = computed(() => {
  if (!ttsSupported.value) return "不可用";
  return ttsInstalled.value ? "已就绪 ✅" : "未安装";
});

const ttsDesc = computed(() => {
  if (!ttsSupported.value) {
    return "仅安卓 App 支持：网页端用浏览器自带语音，装到手机后才有内置离线引擎";
  }
  if (ttsInstalled.value) {
    return "没有预生成音频的词句也能离线发音，不再依赖系统的日语音色";
  }
  return "装一次（约 123MB，建议 WiFi）后，没预生成音频的词句也能发音，全程离线";
});

const ttsProgressWidth = computed(() => `${ttsPercent(ttsProgress.value)}%`);

const ttsProgressText = computed(() => {
  const done = (ttsReceivedBytes.value / 1048576).toFixed(1);
  const total = (TTS_MODEL_BYTES / 1048576).toFixed(0);
  return `${done} / ${total} MB（${ttsPercent(ttsProgress.value)}%）`;
});

async function onDownloadTts() {
  ttsTryMsg.value = "";
  const ok = await downloadTtsModel(ttsModelUrl);
  if (ok) ttsTryMsg.value = "✅ 离线语音已就绪，可以去练了";
}

async function onTryTts() {
  if (ttsTrying.value) return;
  ttsTrying.value = true;
  ttsTryMsg.value = "";
  const ok = await speakOfflineNow(TTS_TEST_TEXT);
  ttsTrying.value = false;
  ttsTryMsg.value = ok
    ? "✅ 已播放（内置离线引擎合成）"
    : "⚠️ 播放失败，可重新下载模型后再试";
}

async function onDeleteTts() {
  ttsTryMsg.value = "";
  const ok = await deleteTtsModel();
  if (ok) ttsTryMsg.value = "已删除离线语音模型（释放约 123MB）";
}

const {
  checking,
  checked,
  hasUpdate,
  latestVersion,
  errorMsg,
  directApkUrl,
  checkUpdate,
  openDownload,
} = useJpUpdate(appVersion);

// 进入页面自动检测一次更新；用户也可点「检查更新」手动再查
onMounted(() => {
  checkUpdate();
  // 离线语音状态（装了模型就顺手预热，首次发音不必等加载）
  refreshTtsStatus();
});

function onCheckUpdate() {
  checkUpdate();
}

function onUpdateNow() {
  openDownload();
}

const syncing = ref(false);
const syncMsg = ref("");

async function onLogout() {
  await signOut();
}

async function onSync() {
  if (syncing.value) return;
  syncing.value = true;
  syncMsg.value = "";
  const r = await syncNow();
  syncing.value = false;
  if (r === "synced") syncMsg.value = "✅ 已同步到云端";
  else if (r === "noop") syncMsg.value = "请先登录后再同步";
  else syncMsg.value = "⚠️ 同步失败，请检查网络后重试";
  setTimeout(() => {
    syncMsg.value = "";
  }, 3000);
}

const streak = computed(() => calcStreak(record.value.days));
const todayMinutes = computed(() => Math.floor(record.value.todaySeconds / 60));
const totalDuration = computed(() => {
  const s = record.value.totalSeconds;
  if (s < 3600) return `${Math.floor(s / 60)} 分`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h${m}m`;
});

const showResetModal = ref(false);

function confirmReset() {
  showResetModal.value = true;
}

function doReset() {
  resetRecord();
  showResetModal.value = false;
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

.me-container {
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

/* 账号卡片 */
.me-account { margin-bottom: 32px; }

.account-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  background: #fff;
  border: 1px solid #e8f6ff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.15);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
}

.account-info { flex: 1; min-width: 0; }

.account-label {
  font-size: 12px;
  color: #7dd3fc;
  margin-bottom: 4px;
}

.account-email {
  font-size: 15px;
  font-weight: 600;
  color: #075985;
  word-break: break-all;
}

.account-btn {
  flex-shrink: 0;
  padding: 9px 16px;
  border: 1px solid #e0f2fe;
  border-radius: 10px;
  background: #f5fbff;
  color: #0369a1;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-family: inherit;
}

.account-btn:hover {
  background: #e0f2fe;
  border-color: #bae6fd;
  color: #0284c7;
}

.account-btn--logout:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
}

.account-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.account-btn--sync:hover {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #059669;
}

.account-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.account-sync-status {
  font-size: 12px;
  color: #059669;
  margin-top: 6px;
}

/* 更多入口 */
.links-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.link-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.15);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
}

.link-card:hover {
  transform: translateY(-3px);
  border-color: #bae6fd;
  box-shadow: 0 8px 24px rgba(125, 211, 252, 0.25);
}

.link-icon {
  font-size: 26px;
  flex-shrink: 0;
}

.link-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.link-label {
  font-size: 15px;
  font-weight: 600;
  color: #075985;
}

.link-desc {
  font-size: 12px;
  color: #7dd3fc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-arrow {
  flex-shrink: 0;
  font-size: 18px;
  color: #7dd3fc;
  transition: transform 0.2s;
}

.link-card:hover .link-arrow {
  transform: translateX(3px);
  color: #0284c7;
}

@media (max-width: 768px) {
  .links-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}

/* 关于 */
.me-about {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.about-link {
  font-size: 14px;
  color: #0284c7;
  text-decoration: none;
  font-weight: 600;
}

.about-link:hover { text-decoration: underline; }

.about-version {
  font-size: 12px;
  color: #bae6fd;
}

/* 版本更新 */
.update-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  background: #fff;
  border: 1px solid #e0f2fe;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.15);
}

.update-info {
  flex: 1;
  min-width: 0;
}

.update-current {
  font-size: 15px;
  font-weight: 600;
  color: #075985;
  margin-bottom: 6px;
}

.update-msg {
  font-size: 13px;
  color: #7dd3fc;
}

.update-msg--new {
  color: #059669;
  font-weight: 600;
}

.update-msg--err {
  color: #dc2626;
}

.update-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.update-btn {
  padding: 10px 20px;
  border: 1px solid #e0f2fe;
  border-radius: 10px;
  background: #f5fbff;
  color: #0369a1;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-family: inherit;
}

.update-btn:hover {
  background: #e0f2fe;
  border-color: #bae6fd;
  color: #0284c7;
}

.update-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.update-btn--go {
  background: linear-gradient(135deg, #7dd3fc 0%, #0284c7 100%);
  border: none;
  color: #fff;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
}

.update-btn--go:hover {
  background: linear-gradient(135deg, #38bdf8 0%, #0369a1 100%);
  color: #fff;
  transform: translateY(-2px);
}

.update-direct {
  flex-basis: 100%;
  font-size: 13px;
  color: #0284c7;
  text-decoration: none;
  text-align: right;
  margin-top: -8px;
}

.update-direct:hover {
  text-decoration: underline;
}

/* 离线发音 */
.tts-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  background: #fff;
  border: 1px solid #e0f2fe;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.15);
}

.tts-info {
  flex: 1;
  min-width: 0;
}

.tts-title {
  font-size: 15px;
  font-weight: 600;
  color: #075985;
  margin-bottom: 6px;
}

.tts-desc {
  font-size: 13px;
  color: #7dd3fc;
  line-height: 1.6;
}

.tts-msg {
  font-size: 12px;
  color: #059669;
  margin-top: 8px;
}

.tts-msg--err {
  color: #dc2626;
}

.tts-progress {
  height: 6px;
  margin-top: 12px;
  background: #e8f6ff;
  border-radius: 999px;
  overflow: hidden;
}

.tts-progress-bar {
  height: 100%;
  background: linear-gradient(135deg, #7dd3fc 0%, #0284c7 100%);
  border-radius: 999px;
  transition: width 0.3s;
}

.tts-progress-text {
  font-size: 12px;
  color: #0284c7;
  margin-top: 6px;
}

.tts-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.tts-btn {
  padding: 10px 20px;
  border: 1px solid #e0f2fe;
  border-radius: 10px;
  background: #f5fbff;
  color: #0369a1;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-family: inherit;
}

.tts-btn:hover {
  background: #e0f2fe;
  border-color: #bae6fd;
  color: #0284c7;
}

.tts-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tts-btn--go {
  background: linear-gradient(135deg, #7dd3fc 0%, #0284c7 100%);
  border: none;
  color: #fff;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
}

.tts-btn--go:hover {
  background: linear-gradient(135deg, #38bdf8 0%, #0369a1 100%);
  color: #fff;
  transform: translateY(-2px);
}

.tts-btn--danger {
  border-color: #fee2e2;
  background: #fff5f5;
  color: #dc2626;
}

.tts-btn--danger:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
}

/* 统计卡片（紧凑横向布局） */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.15);
  transition: all 0.25s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(186, 230, 253, 0.3);
  border-color: #bae6fd;
}

.stat-card.highlight {
  background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
  border-color: #bae6fd;
  box-shadow: 0 4px 16px rgba(125, 211, 252, 0.25);
}

.stat-icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #0284c7;
  line-height: 1.2;
  word-break: break-all;
}

.stat-unit {
  font-size: 12px;
  color: #7dd3fc;
  font-weight: 500;
  margin-left: 2px;
}

.stat-label {
  font-size: 12px;
  color: #7dd3fc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.daily-info {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f5fbff 0%, #e8f6ff 100%);
  border-radius: 14px;
  border: 1px solid #e0f2fe;
}

.daily-item {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
}

.daily-item + .daily-item {
  border-left: 1px solid #bae6fd;
}

.daily-label {
  font-size: 13px;
  color: #7dd3fc;
}

.daily-value {
  font-size: 15px;
  font-weight: 600;
  color: #0284c7;
}

/* 数据管理 */
.danger-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  background: #fff;
  border: 1px solid #fee2e2;
  border-radius: 16px;
}

.danger-info {
  flex: 1;
}

.danger-title {
  font-size: 15px;
  font-weight: 600;
  color: #dc2626;
  margin-bottom: 4px;
}

.danger-desc {
  font-size: 12px;
  color: #fca5a5;
}

.danger-btn {
  padding: 10px 24px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #fca5a5 0%, #ef4444 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  white-space: nowrap;
}

.danger-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(239, 68, 68, 0.45);
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(7, 89, 133, 0.3);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-box {
  background: #fff;
  border-radius: 20px;
  padding: 32px 36px;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(7, 89, 133, 0.2);
}

.modal-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.modal-box h3 {
  font-size: 22px;
  margin: 0 0 12px;
  color: #075985;
}

.modal-box p {
  font-size: 14px;
  color: #7dd3fc;
  line-height: 1.6;
  margin: 0 0 24px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.modal-btn {
  padding: 12px 28px;
  border-radius: 12px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.modal-btn.cancel {
  background: #f0f9ff;
  color: #0369a1;
}

.modal-btn.cancel:hover {
  background: #e0f2fe;
}

.modal-btn.danger {
  background: linear-gradient(135deg, #fca5a5 0%, #ef4444 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.modal-btn.danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(239, 68, 68, 0.45);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .me-container {
    padding: 40px 20px 60px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stat-card {
    padding: 12px 12px;
    gap: 8px;
  }

  .stat-icon {
    font-size: 18px;
  }

  .stat-value {
    font-size: 18px;
  }

  .daily-info {
    flex-direction: column;
    gap: 8px;
  }

  .daily-item + .daily-item {
    border-left: none;
    border-top: 1px solid #bae6fd;
    padding-top: 8px;
  }

  .danger-card {
    flex-direction: column;
    text-align: center;
  }

  .update-card {
    flex-direction: column;
    text-align: center;
  }

  .tts-card {
    flex-direction: column;
    text-align: center;
  }

  .tts-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .update-direct {
    text-align: center;
  }

  .account-card {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .modal-box {
    padding: 24px 20px;
  }
}
</style>