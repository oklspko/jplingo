<template>
  <NuxtPage />
  <footer class="site-footer">
    <p class="footer-feedback">
      📮 意见反馈：
      <a class="beian-link" href="mailto:1661769641@qq.com">1661769641@qq.com</a>
    </p>
    <p class="footer-beian">
      <a
        class="beian-link"
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
      >{{ icpLabel }}</a>
      <span class="beian-sep">|</span>
      <a
        class="beian-link beian-gongan"
        :href="`https://beian.mps.gov.cn/#/query/webSearch?code=${gonganCode}`"
        target="_blank"
        rel="noreferrer"
      >
        <img
          class="beian-icon"
          src="/beian.png"
          alt="公安备案图标"
        />
        {{ gonganLabel }}
      </a>
    </p>
  </footer>
</template>

<script setup lang="ts">
import { Capacitor } from "@capacitor/core";

// —— 备案展示（两种手续、两套编号，不能混用）——
// ① ICP 备案（工信部/通管局）：网站备案号与 App 备案号不同，App 用的是带字母后缀的「-2A」；
//    依据《关于开展移动互联网应用程序备案工作的通知》，App 应在显著位置标明其 APP 备案号。
// ② 公安联网备案（公安机关，beian.mps.gov.cn）：与 ICP 备案是两套独立手续，
//    且**同一主体项下不同网站/App 的公安备案号各自独立**——也就是说网站那个
//    赣公网安备36072202000346号 不能直接当作 App 的公安备案号。
const ICP_SITE = "赣ICP备2026023858号"; // 网站（www.jplingo.cn）
const ICP_APP = "赣ICP备2026023858号-2A"; // 安卓 App
const GONGAN_WEB = { code: "36072202000346", label: "赣公网安备36072202000346号" };
// 在 beian.mps.gov.cn 以同一主体新增「APP」备案项后，把拿到的编号填在这里，
// App 内会优先展示它（网站仍展示上面那个），编号不同不冲突。
const GONGAN_APP: { code: string; label: string } | null = null;

const isApp = computed(() => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
});

const icpLabel = computed(() => (isApp.value ? ICP_APP : ICP_SITE));
const gongan = computed(() => (isApp.value && GONGAN_APP ? GONGAN_APP : GONGAN_WEB));
const gonganCode = computed(() => gongan.value.code);
const gonganLabel = computed(() => gongan.value.label);
</script>

<style scoped>
.site-footer {
  padding: 20px 16px;
  text-align: center;
  background: #f8fcff;
  border-top: 1px solid #e8f6ff;
}

.beian-link {
  font-size: 12px;
  color: #7dd3fc;
  text-decoration: none;
  transition: color 0.2s;
}

.beian-link:hover {
  color: #0284c7;
}

.footer-feedback {
  margin: 0 0 8px;
  font-size: 12px;
  color: #7dd3fc;
}

.footer-beian {
  margin: 0;
  font-size: 12px;
  color: #7dd3fc;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.beian-sep {
  font-size: 12px;
  color: #bae6fd;
}

/* 公安备案：图标与文字水平居中对齐 */
.beian-gongan {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.beian-icon {
  width: 16px;
  height: 16px;
  display: block;
  flex-shrink: 0;
}

/* 移动端：底部固定 Tab 栏会盖住页脚，留出底部空间让备案号/意见反馈可完整显示 */
@media (max-width: 768px) {
  .site-footer {
    padding-bottom: calc(76px + env(safe-area-inset-bottom));
  }
}
</style>
