<template>
  <div class="jp-hints-row">
    <transition name="pop">
      <div v-if="showRomaji && romaji" class="jp-hint-box romaji-box">
        <span class="hint-label">罗马音</span>
        <span class="hint-value">{{ romaji }}</span>
      </div>
    </transition>

    <transition name="pop">
      <div v-if="showKana && kana" class="jp-hint-box kana-box">
        <span class="hint-label">假名</span>
        <span class="hint-value kana-value">{{ kana }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  romaji: string;
  kana: string;
  showRomaji: boolean;
  showKana: boolean;
}>();
</script>

<style scoped>
.jp-hints-row {
  display: flex; gap: 12px; flex-wrap: wrap;
  justify-content: center; min-height: 56px; align-items: center; width: 100%;
}

.jp-hint-box {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 10px 20px; border-radius: 14px; max-width: 100%;
}

.romaji-box { background: linear-gradient(135deg, #f5fbff 0%, #e8f6ff 100%); border: 2px dashed #bae6fd; }
.kana-box { background: linear-gradient(135deg, #fff5fb 0%, #fce7f3 100%); border: 2px dashed #fbcfe8; }

.hint-label {
  font-size: 12px; font-weight: 500;
  font-family: -apple-system, "Segoe UI", sans-serif; white-space: nowrap;
}

.romaji-box .hint-label { color: #7dd3fc; }
.kana-box .hint-label { color: #f9a8d4; }

.hint-value {
  font-size: clamp(16px, 2vw, 24px); font-weight: 600;
  letter-spacing: 1px;
  font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
  word-break: break-all;
}

.romaji-box .hint-value { color: #0284c7; }

.kana-value {
  font-family: "Noto Sans JP", sans-serif !important;
  color: #9d174d; letter-spacing: 3px;
}

.pop-enter-active { animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.pop-leave-active { transition: opacity 0.15s; }
.pop-leave-to { opacity: 0; }
@keyframes popIn {
  0% { opacity: 0; transform: scale(0.9) translateY(-8px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

@media (max-width: 768px) {
  .jp-hints-row { gap: 8px; min-height: auto; }
  .jp-hint-box { padding: 8px 14px; gap: 6px; }
  .hint-label { font-size: 11px; }
}

@media (max-width: 480px) {
  .hint-value { font-size: 16px; }
  .kana-value { letter-spacing: 2px; }
}
</style>