<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-logo">🗾</div>
      <h1 class="login-title">jp-lingo</h1>
      <p class="login-sub">日语连词成句 · 登录后开始学习</p>

      <div class="login-tabs">
        <button
          type="button"
          class="login-tab"
          :class="{ active: mode === 'login' }"
          @click="switchMode('login')"
        >登录</button>
        <button
          type="button"
          class="login-tab"
          :class="{ active: mode === 'signup' }"
          @click="switchMode('signup')"
        >注册</button>
      </div>

      <form class="login-form" @submit.prevent="onSubmit">
        <input
          v-model="email"
          class="login-input"
          type="email"
          placeholder="邮箱"
          autocomplete="email"
          required
        />
        <input
          v-model="password"
          class="login-input"
          type="password"
          placeholder="密码（至少 6 位）"
          autocomplete="current-password"
          required
          minlength="6"
        />
        <p v-if="error" class="login-error">{{ error }}</p>
        <button class="login-submit" type="submit" :disabled="busy">
          {{ busy ? "处理中…" : mode === "login" ? "登录" : "注册并登录" }}
        </button>
      </form>

      <p class="login-hint">首次使用请先「注册」。学习数据云端保存，换设备登录即可同步。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useJpAuth } from "~/composables/jp/useJpAuth";

const { signIn, signUp } = useJpAuth();

const mode = ref<"login" | "signup">("login");
const email = ref("");
const password = ref("");
const error = ref("");
const busy = ref(false);

function switchMode(m: "login" | "signup") {
  mode.value = m;
  error.value = "";
}

async function onSubmit() {
  error.value = "";
  busy.value = true;
  try {
    if (mode.value === "login") {
      await signIn(email.value.trim(), password.value);
      window.location.href = "/jp-home";
    } else {
      await signUp(email.value.trim(), password.value);
      window.location.href = "/jp-home";
    }
  } catch (e: any) {
    error.value = e?.message || "操作失败，请重试";
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, #f8fcff 0%, #f5fbff 40%, #fbfeff 100%);
  font-family: -apple-system, "Segoe UI", "Noto Sans JP", sans-serif;
  box-sizing: border-box;
}

.login-card {
  width: 100%;
  max-width: 380px;
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(186, 230, 253, 0.3);
  padding: 40px 36px;
  text-align: center;
}

.login-logo {
  font-size: 48px;
  margin-bottom: 8px;
}

.login-title {
  font-size: 28px;
  margin: 0;
  color: #075985;
  font-weight: 700;
  letter-spacing: 2px;
}

.login-sub {
  color: #7dd3fc;
  font-size: 13px;
  margin: 8px 0 24px;
}

.login-tabs {
  display: flex;
  background: #f5fbff;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 24px;
}

.login-tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  border-radius: 9px;
  color: #7dd3fc;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.login-tab.active {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985;
  box-shadow: 0 4px 12px rgba(186, 230, 253, 0.4);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-input {
  padding: 13px 16px;
  border: 1px solid #e0f2fe;
  border-radius: 12px;
  font-size: 14px;
  color: #075985;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: inherit;
  background: #fbfeff;
}

.login-input:focus {
  border-color: #7dd3fc;
  box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.2);
}

.login-error {
  margin: 0;
  font-size: 12px;
  color: #dc2626;
  text-align: left;
}

.login-submit {
  padding: 13px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #bae6fd 0%, #7dd3fc 100%);
  color: #075985;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  box-shadow: 0 6px 18px rgba(125, 211, 252, 0.35);
}

.login-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(125, 211, 252, 0.5);
}

.login-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-hint {
  font-size: 12px;
  color: #7dd3fc;
  line-height: 1.6;
  margin: 20px 0 0;
}
</style>
