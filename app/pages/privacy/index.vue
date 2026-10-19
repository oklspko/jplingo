<template>
  <div class="jp-page-wrap">
    <JpSidebar />
    <main class="jp-page-main">
      <div class="doc">
        <header class="doc-head">
          <h1>隐私政策</h1>
          <p class="doc-meta">更新日期：2026-10-19　·　生效日期：2026-10-19　·　适用于 jp-lingo（Android）</p>
        </header>

        <p class="doc-lead">
          本政策说明「jp-lingo」（以下称“本应用”）如何收集、使用、存储与保护你的个人信息。
          运营者为个人开发者 <b>蓝松平</b>，联系方式：<a href="mailto:1661769641@qq.com">1661769641@qq.com</a>。
        </p>

        <section class="doc-sec">
          <h2>一、我们收集的信息</h2>
          <ol>
            <li>
              <b>注册与登录信息</b>：你注册或登录时提供的<b>电子邮箱</b>与<b>密码</b>。密码由服务端以加密（哈希）方式保存，我们无法查看明文。
            </li>
            <li>
              <b>学习记录</b>：课程进度、答题正确率、连续学习天数、收藏与偏好设置等。
              这类数据<b>默认保存在你的设备本地</b>；只有当你主动点击「立即同步」时，才会保存到你本人账号下，用于跨设备恢复进度。
            </li>
            <li>
              <b>网络访问的必要日志</b>：为下载课程、词库、语法数据以及检查版本更新，应用会访问我们的服务器与 GitHub。
              服务器可能记录常规访问日志（IP 地址、访问时间、请求路径），仅用于故障排查与安全防护。
            </li>
            <li>
              <b>设备本地存储</b>：应用会在设备上保存课程数据缓存、学习记录与偏好设置（使用系统本地存储与文件系统）。
            </li>
          </ol>
          <p class="doc-note">
            我们<b>不会</b>收集：位置信息、通讯录、短信、通话记录、相册、相机、麦克风、剪贴板内容、设备唯一标识（如 IMEI）以及任何广告标识。
          </p>
        </section>

        <section class="doc-sec">
          <h2>二、信息的使用目的</h2>
          <ul>
            <li>完成账号注册、登录与身份识别；</li>
            <li>保存与恢复你的学习进度（仅在你主动同步时上传）；</li>
            <li>下载与更新课程、词库、语法等内容；</li>
            <li>排查故障、保障服务安全与稳定。</li>
          </ul>
          <p class="doc-note">
            我们不会将你的个人信息用于广告投放、用户画像，也不会出售、出租给任何第三方。
          </p>
        </section>

        <section class="doc-sec">
          <h2>三、存储地点与期限</h2>
          <ol>
            <li><b>存储地点</b>：账号与同步数据存储于我们自建自管的服务器（api.jplingo.cn）；课程与词库数据存储于 www.jplingo.cn。</li>
            <li><b>存储期限</b>：账号存续期间。你注销账号或请求删除后，我们将在 15 个工作日内删除或匿名化处理相关信息。</li>
          </ol>
        </section>

        <section class="doc-sec">
          <h2>四、共享与第三方服务</h2>
          <p>本应用<b>不接入广告、统计或用户追踪类第三方 SDK</b>。为提供必要功能，我们使用：</p>
          <ol>
            <li><b>账号与数据同步</b>：自托管的 Supabase（GoTrue / PostgREST），仅用于账号认证与学习记录同步；</li>
            <li><b>内容分发</b>：www.jplingo.cn，用于下载课程、词库与语法数据；</li>
            <li><b>版本更新检查</b>：GitHub（github.com），仅在你主动检查更新时访问，不传输个人信息；</li>
            <li><b>离线语音合成</b>：语音模型随安装包内置或由你手动下载，合成过程在设备本地完成，<b>朗读文本不会上传</b>。</li>
          </ol>
          <p class="doc-note">除法律法规要求或经你明确同意外，我们不会向第三方提供你的个人信息。</p>
        </section>

        <section class="doc-sec">
          <h2>五、应用权限说明</h2>
          <p>
            本应用仅申请<b>网络访问（INTERNET）</b>权限，用于内容下载与账号同步；
            <b>不申请</b>相机、麦克风、位置、通讯录、短信、存储读写等敏感权限。
          </p>
        </section>

        <section class="doc-sec">
          <h2>六、你的权利</h2>
          <ol>
            <li><b>查阅与更正</b>：可在「我的」页面查看账号信息，或通过邮箱联系我们更正。</li>
            <li><b>删除本地数据</b>：卸载应用或在系统设置中清除应用数据即可。</li>
            <li>
              <b>注销账号</b>：在「我的」页面底部点击「注销账号」，按提示提交申请；
              我们将在 <b>15 个工作日</b>内删除你的账号与云端学习记录。
            </li>
            <li><b>撤回同意</b>：你可以停止使用并卸载本应用，卸载后本地数据随之删除。</li>
          </ol>
        </section>

        <section class="doc-sec">
          <h2>七、未成年人保护</h2>
          <p>
            本应用为日语学习工具。若你是未满 14 周岁的未成年人，请在监护人陪同下阅读本政策，并在取得监护人同意后使用。
            我们不会主动收集未成年人的额外信息；如监护人发现未成年人未经同意提供了个人信息，可联系我们删除。
          </p>
        </section>

        <section class="doc-sec">
          <h2>八、政策更新</h2>
          <p>本政策如有变更，将在应用内公示；涉及重大变更时，我们会以显著方式提示。继续使用即表示你接受更新后的政策。</p>
        </section>

        <section class="doc-sec">
          <h2>九、联系我们</h2>
          <p>
            运营者：蓝松平<br />
            联系邮箱：<a href="mailto:1661769641@qq.com">1661769641@qq.com</a><br />
            我们会在收到你的请求后 15 个工作日内答复并处理。
          </p>
        </section>

        <footer class="doc-foot">
          <NuxtLink to="/terms" class="doc-link">《用户协议》</NuxtLink>
          <NuxtLink to="/jp-home" class="doc-link">返回首页</NuxtLink>
        </footer>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
useHead({ title: "隐私政策 · jp-lingo" });
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
