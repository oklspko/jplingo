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
        v-for="item in menuItems"
        :key="item.key"
        :href="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </a>
    </nav>

    <div class="sidebar-footer">
      <div v-if="user" class="user-info">
        <span class="user-email">{{ user.email }}</span>
        <button class="logout-btn" @click="onLogout">退出</button>
      </div>
      <div class="version">v1.0.0</div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import JpLogo from "./JpLogo.vue";
import { useJpAuth } from "~/composables/jp/useJpAuth";

const route = useRoute();
const { user, signOut } = useJpAuth();

async function onLogout() {
  await signOut();
  window.location.href = "/login";
}

const menuItems = [
  { key: "me", label: "我的", icon: "👤", path: "/jp-me" },
  { key: "home", label: "课程", icon: "📚", path: "/jp-home" },
  { key: "kana", label: "输入表", icon: "🔤", path: "/jp-kana-chart" },
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
  font-family: -apple-system, "Segoe UI", sans-serif;
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
  font-family: inherit;
  transition: all 0.2s;
  white-space: nowrap;
}

.logout-btn:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
}

/* 移动端：固定侧栏转为顶部导航 */
@media (max-width: 768px) {
  .jp-sidebar {
    position: static;
    width: 100%;
    min-height: 0;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    padding: 10px 12px;
    border-right: none;
    border-bottom: 1px solid #e8f6ff;
    gap: 8px 12px;
  }

  .sidebar-header {
    padding: 0;
    margin-bottom: 0;
    border-bottom: none;
    gap: 8px;
  }

  .title-block h2 { font-size: 15px; }
  .subtitle { display: none; }

  .sidebar-nav {
    flex: 1 1 100%;
    order: 3;
    flex-direction: row;
    padding: 0;
    gap: 6px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .nav-item {
    padding: 7px 12px;
    font-size: 13px;
    gap: 6px;
    white-space: nowrap;
  }

  .nav-icon { font-size: 15px; width: auto; }
  .nav-label { flex: 0 0 auto; }

  .sidebar-footer {
    padding: 0;
    border-top: none;
    margin-left: auto;
  }

  .version { display: none; }
  .user-email { display: none; }
  .logout-btn { padding: 6px 12px; font-size: 12px; }
}
</style>