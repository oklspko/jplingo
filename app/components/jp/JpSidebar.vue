<template>
  <aside class="jp-sidebar">
    <a href="/jp-home" class="sidebar-header">
      <JpLogo :size="40" />
      <div class="title-block">
        <h2>jp-lingo</h2>
        <p class="subtitle">日语连词成句</p>
      </div>
    </a>

    <nav class="sidebar-nav">
      <a
        v-for="item in mainTabs"
        :key="item.key"
        :href="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </a>
      <a
        v-if="!isNative"
        href="/release"
        class="nav-item nav-item--release"
        :class="{ active: isActive('/release') }"
      >
        <span class="nav-icon">📱</span>
        <span class="nav-label">下载 App</span>
      </a>
    </nav>

    <div class="sidebar-footer">
      <div v-if="user" class="user-info">
        <span class="user-email">{{ user.email }}</span>
        <button class="logout-btn" @click="onLogout">退出</button>
      </div>
      <a v-else href="/login" class="login-link">登录 / 注册</a>
      <div class="version">v{{ appVersion }}</div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import { Capacitor } from "@capacitor/core";
import JpLogo from "./JpLogo.vue";
import { useJpAuth } from "~/composables/jp/useJpAuth";

const route = useRoute();
const appVersion = useRuntimeConfig().public.appVersion;
const { user, signOut } = useJpAuth();

// 原生 App（Capacitor）内不显示「下载 App」入口
const isNative = Capacitor.isNativePlatform();

async function onLogout() {
  await signOut();
  // 退出后留在当前页继续离线使用，不再强制跳登录
}

const mainTabs = [
  { key: "me", label: "我的", icon: "👤", path: "/jp-me" },
  { key: "home", label: "课程", icon: "📚", path: "/jp-home" },
  { key: "record", label: "记录", icon: "📋", path: "/jp-record" },
  { key: "grammar", label: "语法", icon: "📖", path: "/jp-kana-chart" },
  { key: "words", label: "词库", icon: "🗂️", path: "/jp-words" },
  { key: "editor", label: "编辑器", icon: "✏️", path: "/jp-editor" },
];

function isActive(path: string) {
  return route.path.startsWith(path);
}
</script>

<style scoped>
.jp-sidebar {
  width: 220px;
  min-height: 100vh;
  background: linear-gradient(180deg, #ffffff 0%, #f8fcff 100%);
  border-right: 1px solid #e8f6ff;
  display: flex;
  flex-direction: column;
  padding: 24px 0;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px 20px;
  border-bottom: 1px solid #e8f6ff;
  margin-bottom: 16px;
  text-decoration: none;
  color: inherit;
}

.title-block h2 {
  font-size: 15px;
  margin: 0;
  color: #075985;
  font-weight: 700;
  letter-spacing: 0.5px;
  font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Yu Gothic UI", "Meiryo", "Noto Sans JP", sans-serif;
}

.subtitle {
  font-size: 11px;
  color: #7dd3fc;
  margin: 2px 0 0;
}

.sidebar-nav {
  flex: 1;
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  color: #5b7a8c;
  text-decoration: none;
  font-size: 15px;
}

.nav-item:hover {
  background: #f5fbff;
  color: #0284c7;
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(186, 230, 253, 0.2);
}

.nav-item.active {
  background: linear-gradient(135deg, #e8f6ff 0%, #d4efff 100%);
  color: #075985;
  font-weight: 600;
  box-shadow: 0 2px 12px rgba(125, 211, 252, 0.25);
}

.nav-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.nav-label {
  flex: 1;
}

.sidebar-footer {
  padding: 16px 24px;
  border-top: 1px solid #e8f6ff;
  text-align: center;
}

.version {
  font-size: 11px;
  color: #bae6fd;
}

.user-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.user-email {
  font-size: 11px;
  color: #5b7a8c;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  padding: 4px 10px;
  border: 1px solid #e0f2fe;
  background: #f5fbff;
  color: #0369a1;
  border-radius: 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
}

.login-link {
  display: inline-block;
  margin-bottom: 8px;
  font-size: 12px;
  color: #0284c7;
  text-decoration: none;
  font-weight: 600;
}

.login-link:hover {
  text-decoration: underline;
}

/* 移动端：侧栏转为固定底部 Tab 栏（6 个主入口，无横向滚动） */
@media (max-width: 768px) {
  .jp-sidebar {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    min-height: 0;
    flex-direction: row;
    align-items: stretch;
    padding: 0;
    padding-bottom: env(safe-area-inset-bottom);
    border-right: none;
    border-top: 1px solid #e8f6ff;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 -4px 16px rgba(186, 230, 253, 0.25);
  }

  .sidebar-header { display: none; }

  .sidebar-nav {
    flex: 1;
    flex-direction: row;
    padding: 0;
    gap: 0;
    overflow: visible;
  }

  .nav-item {
    flex: 1;
    flex-direction: column;
    gap: 3px;
    padding: 7px 2px 6px;
    font-size: 11px;
    white-space: nowrap;
    justify-content: center;
    text-align: center;
    border-radius: 0;
  }

  .nav-item:hover {
    background: transparent;
    transform: none;
    box-shadow: none;
  }

  .nav-item.active {
    background: transparent;
    box-shadow: none;
    color: #0284c7;
  }

  .nav-item--release { display: none; }

  .nav-icon { font-size: 20px; width: auto; }
  .nav-label { flex: 0 0 auto; font-size: 11px; line-height: 1; }

  .sidebar-footer { display: none; }
}
</style>