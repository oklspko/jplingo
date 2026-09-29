<template>
  <div class="jp-page-wrap">
    <JpSidebar />
    <main class="jp-page-main">
      <div class="release-container">
        <header class="release-header">
          <div class="release-icon">📱</div>
          <h1>jp-lingo 安卓 App</h1>
          <p class="subtitle">离线也能学的日语连词成句</p>
          <div class="version-badge">v{{ appVersion }}</div>
        </header>

        <section class="release-features">
          <h2>✨ 功能亮点</h2>
          <div class="feature-grid">
            <div class="feature-card">
              <div class="feature-icon">📴</div>
              <div class="feature-title">完全离线</div>
              <div class="feature-desc">无需登录、无需联网，学习记录保存在本地</div>
            </div>
            <div class="feature-card">
              <div class="feature-icon">📚</div>
              <div class="feature-title">开放课程包</div>
              <div class="feature-desc">内置高考日语课程，还可导入外部课程包</div>
            </div>
            <div class="feature-card">
              <div class="feature-icon">🔊</div>
              <div class="feature-title">真人发音</div>
              <div class="feature-desc">全量预生成语音，离线也能正常播放</div>
            </div>
            <div class="feature-card">
              <div class="feature-icon">🧠</div>
              <div class="feature-title">记忆曲线</div>
              <div class="feature-desc">按遗忘曲线分块复习，学得更牢</div>
            </div>
          </div>
        </section>

        <section class="release-download">
          <h2>⬇️ 下载安装</h2>
          <a
            class="download-btn"
            :href="mirrorApkUrl"
            target="_blank"
            rel="noopener"
          >
            <span class="download-icon">🤖</span>
            下载 Android APK{{ hasMirror ? "（加速）" : "" }}
          </a>
          <a
            v-if="hasMirror"
            class="download-direct"
            :href="directApkUrl"
            target="_blank"
            rel="noopener"
          >
            加速下载失败？改用 GitHub 官方直连
          </a>
          <p class="download-hint">安装包约 95MB，含全部音频与词典</p>
        </section>

        <section class="release-install">
          <h2>🛠 安装步骤</h2>
          <ol class="install-steps">
            <li>点击上方按钮下载 APK 文件</li>
            <li>打开下载的 APK，若提示「未知来源」，在系统设置中允许本次安装</li>
            <li>安装完成后打开 App，即可离线学习</li>
          </ol>
          <p class="install-note">
            首次安装未上架应用商店，系统可能提示安全风险，属正常现象（本项目开源，代码见
            <a href="https://github.com/oklspko/jplingo" target="_blank" rel="noopener">GitHub</a>）。
          </p>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { Capacitor } from "@capacitor/core";
import JpSidebar from "~/components/jp/JpSidebar.vue";
import { apkDownloadCandidates } from "~/composables/jp/useJpApkDownload";

const config = useRuntimeConfig();
const directApkUrl = config.public.apkUrl as string;
const appVersion = config.public.appVersion as string;

// 加速镜像优先，官方直连兜底；自定义 CDN（非 github.com）时无镜像，仅一个候选
const _candidates = apkDownloadCandidates(directApkUrl);
const mirrorApkUrl = _candidates[0] || directApkUrl;
const hasMirror = _candidates.length > 1;

// 原生 App 内不再展示下载页，直接回主页
onMounted(() => {
  if (Capacitor.isNativePlatform()) {
    navigateTo("/jp-home", { replace: true });
  }
});
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

.release-container {
  max-width: 760px;
  margin: 0 auto;
  padding: 60px 40px 80px;
  font-family: -apple-system, "Segoe UI", "Noto Sans JP", sans-serif;
}

.release-header {
  text-align: center;
  padding: 32px 0 40px;
}

.release-icon {
  font-size: 56px;
  margin-bottom: 16px;
}

.release-header h1 {
  font-size: 32px;
  margin: 0;
  color: #075985;
  font-weight: 600;
  letter-spacing: 1px;
}

.subtitle {
  color: #7dd3fc;
  font-size: 15px;
  margin: 10px 0 16px;
}

.version-badge {
  display: inline-block;
  padding: 4px 16px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985;
  font-size: 13px;
  border-radius: 20px;
  font-weight: 600;
}

.release-features,
.release-download,
.release-install {
  margin-bottom: 40px;
}

h2 {
  font-size: 20px;
  color: #075985;
  margin-bottom: 20px;
  font-weight: 600;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.feature-card {
  padding: 24px 20px;
  background: #fff;
  border: 1px solid #e8f6ff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.15);
}

.feature-icon {
  font-size: 28px;
  margin-bottom: 10px;
}

.feature-title {
  font-size: 16px;
  font-weight: 600;
  color: #075985;
  margin-bottom: 6px;
}

.feature-desc {
  font-size: 13px;
  color: #7dd3fc;
  line-height: 1.6;
}

.download-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 18px 32px;
  border-radius: 16px;
  background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 8px 24px rgba(2, 132, 199, 0.35);
  transition: all 0.25s;
}

.download-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(2, 132, 199, 0.45);
}

.download-icon {
  font-size: 24px;
}

.download-direct {
  display: block;
  text-align: center;
  color: #0284c7;
  font-size: 14px;
  text-decoration: none;
  margin-top: 16px;
}

.download-direct:hover {
  text-decoration: underline;
}

.download-hint {
  text-align: center;
  color: #7dd3fc;
  font-size: 13px;
  margin: 14px 0 0;
}

.install-steps {
  padding-left: 20px;
  color: #5b7a8c;
  font-size: 15px;
  line-height: 2;
}

.install-note {
  font-size: 13px;
  color: #7dd3fc;
  line-height: 1.6;
  margin-top: 12px;
}

.install-note a {
  color: #0284c7;
  text-decoration: none;
}

.install-note a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .release-container {
    padding: 40px 20px 60px;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .release-header h1 {
    font-size: 26px;
  }
}
</style>
