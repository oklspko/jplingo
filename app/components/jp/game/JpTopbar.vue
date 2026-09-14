<template>
  <header class="jp-topbar">
    <div class="topbar-left">
      <a href="/jp-home" class="home-btn" title="返回主页">
        <span class="home-icon">🏠</span>
        <span class="home-label">主页</span>
      </a>
      <div class="course-info">
        <div class="course-title">{{ courseTitle }}</div>
        <div class="course-pack">{{ coursePackId }}</div>
      </div>
    </div>

    <div class="topbar-center">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <div class="progress-text">
        <span class="progress-current">{{ currentIndex + 1 }}</span>
        <span class="progress-sep">/</span>
        <span class="progress-total">{{ total }}</span>
        <span class="progress-percent">({{ Math.round(progressPercent) }}%)</span>
      </div>
    </div>

    <div class="topbar-right">
      <button
        class="hint-toggle"
        :class="{ active: showRomaji }"
        @click="$emit('toggle-romaji')"
        title="罗马音提示 (Ctrl+R)"
      >
        <span class="hint-toggle-icon">💡</span>
        <span class="hint-toggle-text">罗马音</span>
      </button>

      <button
        class="hint-toggle kana-toggle"
        :class="{ active: showKana }"
        @click="$emit('toggle-kana')"
        title="假名提示 (Ctrl+K)"
      >
        <span class="hint-toggle-icon">あ</span>
        <span class="hint-toggle-text">假名</span>
      </button>

      <div class="timer">
        <span class="timer-icon">⏱</span>
        <span class="timer-text">{{ formattedTime }}</span>
      </div>

      <div class="course-nav">
        <button class="nav-btn" :disabled="!hasPrev" @click="$emit('prev')" title="上一课">←</button>
        <button class="nav-btn" :disabled="!hasNext" @click="$emit('next')" title="下一课">→</button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  courseTitle: string;
  coursePackId: string;
  currentIndex: number;
  total: number;
  progressPercent: number;
  showRomaji: boolean;
  showKana: boolean;
  formattedTime: string;
  hasPrev: boolean;
  hasNext: boolean;
}>();

defineEmits<{
  (e: "toggle-romaji"): void;
  (e: "toggle-kana"): void;
  (e: "prev"): void;
  (e: "next"): void;
}>();
</script>

<style scoped>
.jp-topbar {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #ffffff 0%, #fbfeff 100%);
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(186, 230, 253, 0.12);
  margin-bottom: 40px;
  box-sizing: border-box;
  border: 1px solid rgba(224, 242, 254, 0.8);
  flex-wrap: wrap;
}

.topbar-left { display: flex; align-items: center; gap: 12px; min-width: 0; flex-shrink: 0; }

.home-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985; text-decoration: none; border-radius: 12px;
  font-size: 14px; font-weight: 500; transition: all 0.2s;
  white-space: nowrap; box-shadow: 0 4px 12px rgba(186, 230, 253, 0.3);
  flex-shrink: 0;
}

.home-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(186, 230, 253, 0.45);
  background: linear-gradient(135deg, #bae6fd 0%, #7dd3fc 100%);
}

.home-icon { font-size: 15px; }
.course-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.course-title {
  font-size: 15px; font-weight: 600; color: #075985;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;
}
.course-pack { font-size: 11px; color: #7dd3fc; white-space: nowrap; }

.topbar-center {
  flex: 1; max-width: 500px;
  display: flex; flex-direction: column; gap: 6px; min-width: 180px;
}

.progress-bar {
  width: 100%; height: 12px; background: #e8f6ff;
  border-radius: 10px; overflow: hidden; position: relative;
}

.progress-fill {
  height: 100%; background: linear-gradient(90deg, #bae6fd 0%, #7dd3fc 100%);
  border-radius: 10px; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 12px rgba(186, 230, 253, 0.5);
}

.progress-text {
  display: flex; align-items: baseline; justify-content: center; gap: 3px;
  font-size: 12px; color: #0369a1; font-weight: 600;
}

.progress-current { font-size: 15px; color: #0284c7; }
.progress-sep { color: #7dd3fc; margin: 0 2px; }
.progress-total { color: #7dd3fc; }
.progress-percent { margin-left: 6px; color: #7dd3fc; font-weight: 500; }

.topbar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

.hint-toggle {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 9px 13px; background: #fff;
  border: 2px solid #e0f2fe; border-radius: 12px;
  color: #7dd3fc; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.2s; font-family: inherit;
  white-space: nowrap; flex-shrink: 0;
}

.hint-toggle:hover { border-color: #bae6fd; background: #f5fbff; transform: translateY(-1px); }

.hint-toggle.active {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985; border-color: transparent;
  box-shadow: 0 4px 12px rgba(186, 230, 253, 0.4);
}

.hint-toggle-icon { font-size: 13px; }
.hint-toggle-text { font-size: 12px; }

.kana-toggle .hint-toggle-icon {
  font-family: "Noto Sans JP", sans-serif; font-weight: 700; font-size: 15px;
}

.kana-toggle.active {
  background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
  color: #9d174d; box-shadow: 0 4px 12px rgba(251, 207, 232, 0.4);
}

.timer {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 9px 13px;
  background: linear-gradient(135deg, #f5fbff 0%, #e8f6ff 100%);
  border-radius: 12px; color: #0369a1; font-weight: 600; font-size: 14px;
  font-variant-numeric: tabular-nums; border: 1px solid #e0f2fe;
  flex-shrink: 0;
}

.timer-icon { font-size: 13px; }
.timer-text { min-width: 46px; text-align: center; }

.course-nav { display: flex; gap: 5px; flex-shrink: 0; }

.nav-btn {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #e0f2fe; background: #fff; color: #0284c7;
  border-radius: 10px; font-size: 16px; font-weight: 600;
  cursor: pointer; transition: all 0.2s; flex-shrink: 0;
}

.nav-btn:hover:not(:disabled) {
  background: #f5fbff; border-color: #bae6fd; transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(186, 230, 253, 0.3);
}

.nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }

@media (max-width: 768px) {
  .jp-topbar { padding: 12px 14px; gap: 10px; margin-bottom: 24px; border-radius: 16px; }
  .home-label { display: none; }
  .home-icon { font-size: 16px; }
  .course-title { max-width: 100px; font-size: 13px; }
  .course-pack { font-size: 10px; }
  .topbar-center { order: 3; flex: 1 0 100%; max-width: 100%; }
  .hint-toggle { padding: 8px 10px; }
  .hint-toggle-text { display: none; }
  .hint-toggle-icon { font-size: 15px; }
  .kana-toggle .hint-toggle-icon { font-size: 17px; }
  .timer { padding: 8px 10px; font-size: 13px; }
  .timer-text { min-width: 42px; }
  .nav-btn { width: 34px; height: 34px; font-size: 15px; }
}

@media (max-width: 480px) { .timer-icon { display: none; } }
</style>