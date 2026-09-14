<template>
  <transition name="modal">
    <div v-if="show" class="complete-mask">
      <div class="complete-modal">
        <div class="complete-icon">🎉</div>
        <div class="complete-title">课程完成！</div>
        <div class="complete-jp">{{ motivation }}</div>
        <div class="complete-stats">
          <span>用时 {{ formattedTime }}</span>
        </div>
        <div class="complete-actions">
          <button v-if="hasNext" class="modal-btn next" @click="$emit('next')">
            下一课 →
            <span class="modal-shortcut">Space / ↵</span>
          </button>
          <button class="modal-btn home" @click="$emit('home')">
            🏠 回主页
            <span class="modal-shortcut">Esc</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  motivation: string;
  formattedTime: string;
  hasNext: boolean;
}>();

defineEmits<{
  (e: "next"): void;
  (e: "home"): void;
}>();
</script>

<style scoped>
.complete-mask {
  position: fixed; inset: 0;
  background: rgba(7, 89, 133, 0.3); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
}

.complete-modal {
  background: linear-gradient(135deg, #ffffff 0%, #f8fcff 100%);
  border-radius: 28px;
  padding: clamp(28px, 4vw, 48px) clamp(28px, 5vw, 56px);
  text-align: center; max-width: 520px; width: 100%; box-sizing: border-box;
  box-shadow: 0 20px 60px rgba(7, 89, 133, 0.2), 0 0 0 1px rgba(224, 242, 254, 0.8);
  animation: modalIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalIn {
  0% { opacity: 0; transform: scale(0.85) translateY(20px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

.complete-icon {
  font-size: clamp(48px, 7vw, 72px); margin-bottom: 16px;
  animation: bounce 0.8s ease infinite alternate;
}
@keyframes bounce { 0% { transform: translateY(0); } 100% { transform: translateY(-8px); } }

.complete-title {
  font-size: clamp(22px, 3vw, 32px); font-weight: 700;
  color: #075985; margin-bottom: 16px; letter-spacing: 2px;
}

.complete-jp {
  font-size: clamp(15px, 2vw, 22px); color: #0284c7;
  font-family: "Noto Sans JP", sans-serif; line-height: 1.6;
  margin-bottom: 16px;
  padding: clamp(12px, 1.5vw, 16px) clamp(16px, 2vw, 24px);
  background: linear-gradient(135deg, #e8f6ff 0%, #d4efff 100%);
  border-radius: 16px; font-weight: 500; word-break: break-word;
}

.complete-stats { font-size: clamp(13px, 1.5vw, 15px); color: #7dd3fc; margin-bottom: 24px; }
.complete-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

.modal-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: clamp(12px, 1.5vw, 16px) clamp(20px, 2.5vw, 32px);
  font-size: clamp(15px, 1.8vw, 18px); font-weight: 600;
  border: none; border-radius: 14px; cursor: pointer;
  transition: all 0.2s; font-family: inherit; white-space: nowrap;
}

.modal-shortcut {
  font-size: 11px; padding: 2px 7px;
  background: rgba(255, 255, 255, 0.35);
  border-radius: 6px; font-family: monospace; font-weight: 500;
}

.modal-btn.home {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985; box-shadow: 0 6px 20px rgba(186, 230, 253, 0.4);
}
.modal-btn.home:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(186, 230, 253, 0.55);
  background: linear-gradient(135deg, #bae6fd 0%, #7dd3fc 100%);
}

.modal-btn.next {
  background: linear-gradient(135deg, #6ee7b7 0%, #34d399 100%);
  color: #fff; box-shadow: 0 6px 20px rgba(52, 211, 153, 0.35);
}
.modal-btn.next:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(52, 211, 153, 0.5);
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.25s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .complete-modal { padding: 28px 20px; border-radius: 20px; }
  .complete-actions { flex-direction: column; }
  .modal-btn { width: 100%; justify-content: center; }
  .modal-shortcut { display: none; }
}
</style>