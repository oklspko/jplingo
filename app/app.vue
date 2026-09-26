<template>
  <NuxtPage />
  <footer class="site-footer">
    <p class="footer-feedback">
      📮 意见反馈：
      <a class="beian-link" href="mailto:1661769641@qq.com">1661769641@qq.com</a>
    </p>
    <a
      class="beian-link"
      href="https://beian.miit.gov.cn/"
      target="_blank"
      rel="noopener noreferrer"
    >赣ICP备2026023858号</a>
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
</style>
