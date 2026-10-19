<template>
  <div class="jp-page-wrap">
    <JpSidebar />
    <main class="jp-page-main">
      <div class="doc">
        <header class="doc-head">
          <h1>用户协议</h1>
          <p class="doc-meta">更新日期：2026-10-19　·　生效日期：2026-10-19　·　适用于 jp-lingo（Android）</p>
        </header>

        <p class="doc-lead">
          欢迎使用「jp-lingo」（以下称“本应用”）。本协议是你与本应用运营者 <b>蓝松平</b>（联系方式：
          <a href="mailto:1661769641@qq.com">1661769641@qq.com</a>）之间就使用本应用所订立的协议。
          <b>你开始使用本应用，即表示已阅读并同意本协议全部内容</b>；如不同意，请停止使用。
        </p>

        <section class="doc-sec">
          <h2>一、服务内容</h2>
          <p>本应用是一款日语学习工具，提供连词成句练习、分级词汇与语法学习、发音朗读、学习记录统计等功能，并支持离线使用与内容在线更新。部分功能需要注册账号（电子邮箱 + 密码）。</p>
        </section>

        <section class="doc-sec">
          <h2>二、账号与安全</h2>
          <ol>
            <li>你应使用真实、有效的邮箱注册，并妥善保管账号与密码；因你保管不当造成的损失由你自行承担。</li>
            <li>账号仅限你本人使用，不得出借、转让或售卖。</li>
            <li>如发现账号被他人使用，请立即通过上述邮箱联系我们。</li>
            <li>你可以在「我的」页面注销账号，注销后账号及相关云端学习记录将被删除且不可恢复。</li>
          </ol>
        </section>

        <section class="doc-sec">
          <h2>三、使用规范</h2>
          <p>你在使用本应用时，不得从事下列行为：</p>
          <ol>
            <li>利用本应用制作、复制、发布、传播违法违规信息；</li>
            <li>对本应用进行反向工程、反编译、破解，或干扰、破坏其正常运行；</li>
            <li>通过自动化程序批量抓取本应用内容或服务端数据；</li>
            <li>其他违反法律法规或损害他人合法权益的行为。</li>
          </ol>
          <p class="doc-note">如你违反上述约定，我们有权视情节采取限制功能、中止或终止服务等措施。</p>
        </section>

        <section class="doc-sec">
          <h2>四、知识产权</h2>
          <p>本应用的软件、界面设计、课程内容、词库与语法数据等，其著作权及相关权利归运营者或相应权利人所有。未经书面许可，不得用于商业用途或进行再分发。</p>
          <p>你可以使用本应用导出的课程文件用于个人学习与备份。</p>
        </section>

        <section class="doc-sec">
          <h2>五、服务的变更、中止与终止</h2>
          <ol>
            <li>我们可能因升级、维护或不可抗力等原因，暂停或调整部分服务，并尽可能提前告知。</li>
            <li>本应用为免费提供，我们不承诺服务永不中断或完全无差错；但会尽合理努力保障可用性。</li>
            <li>如你严重违反本协议，我们可终止向你提供服务。</li>
          </ol>
        </section>

        <section class="doc-sec">
          <h2>六、免责声明</h2>
          <ol>
            <li>本应用提供的学习内容仅供参考，不构成任何考试通过或学习效果的保证。</li>
            <li>因网络、设备、系统等非我们可控原因导致的服务中断或数据丢失，我们在法律允许范围内不承担责任；建议你定期使用「导出」功能备份重要课程数据。</li>
          </ol>
        </section>

        <section class="doc-sec">
          <h2>七、协议更新</h2>
          <p>我们可能根据法律法规或业务调整更新本协议，更新后会在应用内公示。若你不同意更新内容，应停止使用本应用；继续使用视为接受更新后的协议。</p>
        </section>

        <section class="doc-sec">
          <h2>八、法律适用与争议解决</h2>
          <p>本协议适用中华人民共和国法律。因本协议产生的争议，双方应友好协商解决；协商不成的，可向运营者所在地有管辖权的人民法院提起诉讼。</p>
        </section>

        <section class="doc-sec">
          <h2>九、联系我们</h2>
          <p>
            运营者：蓝松平<br />
            联系邮箱：<a href="mailto:1661769641@qq.com">1661769641@qq.com</a>
          </p>
        </section>

        <footer class="doc-foot">
          <NuxtLink to="/privacy" class="doc-link">《隐私政策》</NuxtLink>
          <NuxtLink to="/jp-home" class="doc-link">返回首页</NuxtLink>
        </footer>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
useHead({ title: "用户协议 · jp-lingo" });
</script>

<style scoped>
.doc {
  max-width: 820px;
  margin: 0 auto;
  padding: 40px 20px calc(90px + env(safe-area-inset-bottom));
  color: #075985;
  line-height: 1.8;
  font-size: 14px;
}

.doc-head h1 {
  margin: 0 0 8px;
  font-size: 26px;
  color: #075985;
}

.doc-meta {
  margin: 0 0 20px;
  font-size: 12px;
  color: #7dd3fc;
}

.doc-lead {
  margin: 0 0 24px;
  padding: 14px 16px;
  background: #f5fbff;
  border: 1px solid #e0f2fe;
  border-radius: 12px;
}

.doc-sec {
  margin-bottom: 22px;
}

.doc-sec h2 {
  margin: 0 0 8px;
  font-size: 16px;
  color: #0369a1;
}

.doc-sec ol,
.doc-sec ul {
  margin: 0;
  padding-left: 20px;
}

.doc-sec li {
  margin-bottom: 6px;
}

.doc-note {
  margin: 10px 0 0;
  padding: 10px 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  font-size: 13px;
  color: #92400e;
}

.doc-sec a,
.doc-lead a {
  color: #0284c7;
}

.doc-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px dashed #e0f2fe;
}

.doc-link {
  color: #0284c7;
  font-size: 13px;
  text-decoration: none;
}

.doc-link:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .doc {
    padding: 20px 14px calc(90px + env(safe-area-inset-bottom));
    font-size: 13.5px;
  }

  .doc-head h1 {
    font-size: 21px;
  }

  .doc-sec h2 {
    font-size: 15px;
  }
}
</style>
