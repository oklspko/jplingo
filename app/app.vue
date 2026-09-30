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
      >赣ICP备2026023858号</a>
      <span class="beian-sep">|</span>
      <a
        class="beian-link beian-gongan"
        href="https://beian.mps.gov.cn/#/query/webSearch?code=36072202000346"
        target="_blank"
        rel="noreferrer"
      >
        <img
          class="beian-icon"
          src="/beian.png"
          alt="公安备案图标"
        />
        赣公网安备36072202000346号
      </a>
    </p>
  </footer>
</template>

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
