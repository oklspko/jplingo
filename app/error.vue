<template>
  <div class="err-wrap">
    <div class="err-card">
      <div class="err-icon">{{ isNotFound ? "🔍" : "😵" }}</div>
      <h1 class="err-title">{{ isNotFound ? "页面不存在" : "页面出错了" }}</h1>
      <p class="err-sub">
        {{
          isNotFound
            ? "链接可能已经失效，或者课程数据还没同步。"
            : "遇到了一个意外错误，可以重试或先回首页继续学习。"
        }}
      </p>

      <div class="err-actions">
        <button class="err-btn err-btn--primary" @click="goHome">回首页</button>
        <button class="err-btn" @click="reload">重新加载</button>
      </div>

      <details v-if="error?.message" class="err-detail">
        <summary>技术细节（反馈问题时可用）</summary>
        <p class="err-status">HTTP {{ error?.statusCode || 500 }}</p>
        <p class="err-message">{{ error?.message }}</p>
        <p v-if="appVersion" class="err-status">App 版本 {{ appVersion }}</p>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

// Nuxt 的错误页：任何页面级错误（含运行时异常）都落到这里。
// 之前的默认错误页在微信/QQ 内置浏览器里就是一句干巴巴的 500，
// 用户既看不懂也没法继续；这里给出中文说明 + 「回首页 / 重新加载」两个出口。
const props = defineProps<{ error?: { statusCode?: number; message?: string } }>();

const isNotFound = computed(() => (props.error?.statusCode || 500) === 404);
const config = useRuntimeConfig();
const appVersion = computed(() => String(config.public.appVersion || ""));

function goHome() {
  clearError({ redirect: "/jp-home" });
}

function reload() {
  if (typeof window !== "undefined") window.location.reload();
}
</script>

<style scoped>
.err-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, #f8fcff 0%, #f5fbff 40%, #fbfeff 100%);
  color: #075985;
}

.err-card {
  width: 100%;
  max-width: 420px;
  padding: 28px 24px;
  background: #fff;
  border: 1px solid #e0f2fe;
  border-radius: 18px;
  box-shadow: 0 6px 24px rgba(186, 230, 253, 0.28);
  text-align: center;
}

.err-icon {
  font-size: 44px;
  line-height: 1;
  margin-bottom: 10px;
}

.err-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
}

.err-sub {
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.7;
  color: #64748b;
}

.err-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.err-btn {
  min-height: 44px;
  padding: 0 20px;
  border: 1px solid #e0f2fe;
  border-radius: 13px;
  background: #f5fbff;
  color: #0369a1;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.15s, background 0.2s;
}

.err-btn:active {
  transform: translateY(1px) scale(0.99);
}

.err-btn--primary {
  border: none;
  background: linear-gradient(135deg, #38bdf8 0%, #0369a1 100%);
  color: #fff;
  box-shadow: 0 6px 16px rgba(2, 132, 199, 0.28);
}

.err-detail {
  margin-top: 18px;
  text-align: left;
  font-size: 12px;
  color: #94a3b8;
}

.err-detail summary {
  cursor: pointer;
  color: #0284c7;
}

.err-status,
.err-message {
  margin: 6px 0 0;
  word-break: break-all;
  line-height: 1.6;
}
</style>
