# 部署文档

本应用是纯 SPA（Nuxt 4，`ssr: false`），登录用 Supabase 邮箱密码认证。本文档说明从零到一部署上线的完整流程，以 **Vercel** 为例；Netlify / Cloudflare Pages 同理（见「其他平台」）。

## 总览

```
本地开发（.env） ──> GitHub 仓库 ──> Vercel 部署（环境变量）
                     │
        Supabase（数据库 + 认证 + RLS）
```

需要三个账号（都有免费档）：GitHub、Supabase、Vercel。

## 一、配置 Supabase（认证 + 数据）

### 1.1 创建项目

1. 登录 [supabase.com](https://supabase.com) → **New project**，选一个离用户较近的地区。
2. 设置数据库密码并记下（本文档流程用不到，但别丢）。

### 1.2 建表（study_records + RLS）

1. 进入项目 → **SQL Editor** → **New query**。
2. 粘贴并执行 `supabase/migrations/0001_study_records.sql` 的内容。
3. 该迁移创建 `study_records` 表，并配置 RLS（行级安全）：每个用户只能读写自己的学习记录，防止跨用户访问。

### 1.3 关闭邮箱确认（注册即登录）

**Authentication → Sign In / Up → Email → 关闭 "Confirm email"**。

关闭后 `signUp` 直接返回 session，用户注册即登录，无需查收邮件。

### 1.4 确认 anon key 域名未受限

**Project Settings → API** → 找到 `sb_publishable_` 开头的 key → 查看 **Allowed domains**（如有此选项）：

- 留空或含 `*`：任意域名可用（默认，无需改动）。
- 若曾被限制成 localhost，需加入生产域名，否则线上登录会返回 401。

### 1.5 拿到凭据

在 **Project Settings → API** 复制：

- **Project URL** → 用作 `NUXT_SUPABASE_URL`
- **anon / publishable key**（`sb_publishable_` 开头）→ 用作 `NUXT_SUPABASE_ANON_KEY`

## 二、本地配置

```bash
cp .env.example .env
```

编辑 `.env`（已被 `.gitignore` 忽略，**勿提交**）：

```ini
NUXT_SUPABASE_URL=https://your-project.supabase.co
NUXT_SUPABASE_ANON_KEY=sb_publishable_xxx
```

## 三、本地验证

```bash
pnpm install
pnpm build      # 生产构建
pnpm preview    # 本地预览
```

浏览器打开 `http://localhost:3000`，确认：

- `/login` 能正常打开（无 500）
- 注册一个账号能直接进入学习页（注册即登录）
- 直接访问 `/jp-home`、`/jp-me` 等深链不会 404（SPA 回退）

## 四、部署到 Vercel

### 4.1 推代码到 GitHub

```bash
git push origin main
```

### 4.2 Vercel 导入项目

1. 打开 [vercel.com](https://vercel.com)，用 GitHub 登录。
2. **Add New → Project** → 导入该仓库。
3. 框架自动识别为 **Nuxt**，构建命令 `nuxt build`、输出目录无需手动设置。

### 4.3 配置环境变量

Vercel 项目 → **Settings → Environment Variables**，添加两个（都是公开值，不必标 Secret）：

| 名称 | 值 |
| --- | --- |
| `NUXT_SUPABASE_URL` | `https://your-project.supabase.co` |
| `NUXT_SUPABASE_ANON_KEY` | `sb_publishable_xxx` |

保存后点 **Redeploy**（环境变量改动需重新构建才生效）。

### 4.4 部署

点 **Deploy**，等 1~2 分钟，拿到 `https://xxx.vercel.app`。

## 五、生产环境 Supabase 补充配置（可选）

纯邮箱密码登录（关闭邮箱确认后）不强制要求 URL 配置，但如果将来用「忘记密码 / 修改邮箱 / 第三方 OAuth」，需要在 **Authentication → URL Configuration** 设置：

- **Site URL** → `https://xxx.vercel.app`
- **Redirect URLs** → 加 `https://xxx.vercel.app/**`

## 六、测试上线

1. 打开 `https://xxx.vercel.app`，注册新账号 → 应直接进入学习页。
2. 做一节课，去 `/jp-me` 看统计；换一个浏览器（或无痕）登录同一账号，确认学习记录已云同步。
3. 退出后重新登录，数据应一致。

## 更新与重新部署

Vercel 默认连接 GitHub，**push 到 main 会自动触发重新部署**。改代码后：

```bash
git add -A && git commit -m "..." && git push origin main
```

Vercel 会自动构建并上线新版本，无需手动操作。

## 其他平台

Netlify、Cloudflare Pages 同样可部署：导入仓库 → 框架自动识别为 Nuxt → 构建命令 `nuxt build` → 配同样的两个环境变量。Nuxt 的 Nitro 会自动切换对应平台预设，SPA 回退由服务端处理。

若改用纯静态托管（`nuxt generate`，输出 `.output/public`），需手动配置 SPA 回退（把所有路径重写到 `index.html`），否则深链刷新会 404：Netlify 与 Cloudflare Pages 均在站点根目录放一个 `_redirects`，内容为：

```
/*  /index.html  200
```

## 腾讯云 EdgeOne Pages 部署（国内访问推荐）

本项目是纯前端 SPA（`ssr: false`），已配置 `nitro.preset: "static"`，`pnpm generate` 直接产出纯静态文件（`.output/public`），可托管到 EdgeOne Pages。

### 1. 本地构建

```bash
pnpm generate      # 产出 .output/public（静态文件）
```

### 2. 控制台连接 Git 部署（推荐）

1. 打开 EdgeOne Pages 控制台，**连接本 GitHub 仓库**（`oklspko/jplingo`）。
2. 构建配置：
   - 构建命令：`pnpm generate`
   - 输出目录：`.output/public`
3. 环境变量（构建时注入，都是公开值）：
   - `NUXT_SUPABASE_URL` = Supabase Project URL
   - `NUXT_SUPABASE_ANON_KEY` = anon / publishable key（`sb_publishable_` 开头）
4. 点部署，完成后拿到 `https://xxx.edgeone.app`（或绑定自定义域名）。

连接 Git 后，push 到 main 会自动重新部署。

### 3. SPA 回退（深链刷新）

`/jp-home`、`/jp-me`、`/jp-kana-chart` 等静态路由已由 Nuxt 预生成 `index.html`，可直接访问；只有动态路由 `/jp-game/[coursePackId]/[id]`（直接打开某节课链接时）需要 SPA 回退，否则刷新会 404。

按优先级任选其一：

1. 控制台若有「单页应用 / SPA」开关，直接打开即可。
2. 或在项目根目录放 `edgeone.json`：
   ```json
   { "rewrites": [ { "src": "/.*", "dest": "/index.html" } ] }
   ```
   > 说明：EdgeOne 对 `rewrites` 是否覆盖前端路由的说法不一，若无效，需改用 EdgeOne Pages 的 `middleware.js` 中间件做回退，或以其当前控制台为准。

### 4. 备案

若绑定自定义域名且主要受众在大陆，需在腾讯云完成 ICP 备案后再绑定域名。

## 国内访问

`*.vercel.app`、`*.netlify.app`、`*.pages.dev` 在大陆可能慢或不稳定。若主要受众在国内：

1. 先绑定自定义域名（Vercel/Netlify/CF 后台均支持）。
2. 若需大陆稳定访问，可考虑国内云（阿里云/腾讯云的对象存储或云函数托管），需 ICP 备案。

## 离线语音模型自托管（可选，大陆下载更快）

App 首次使用离线发音时，要在手机上拉一个约 123MB 的模型包。默认地址是官方 GitHub
Release（App 会自动叠加 `gh-proxy.com` / `ghfast.top` / `ghproxy.net` 三个加速镜像）。
如果你想更快/更可控，可以放到自己的服务器（例如 `api.jplingo.cn`）再让 App 指过来。

**1. 服务器上放文件**（`self-host/Caddyfile` 所在目录旁建一个 `tts/`，无需改后端代码）：

```bash
mkdir -p /opt/jplingo/tts && cd /opt/jplingo/tts
curl -fL --retry 3 -o sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2 \
  "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2"
# 与官方 Release 的 digest 核对，必须一致
echo "82fa96f91c4ef8abaae3a14a3f4153facf88bed821d1f7331cec2700f432c427  sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2" | sha256sum -c -
```

**2. Caddy 加一条静态路由**（在 `self-host/Caddyfile` 的 `{$DOMAIN}` 块里、`handle` 兜底之前加；
文件名带版本号且内容不变，所以长缓存）：

```caddyfile
    # 离线语音模型包（约123MB）
    handle_path /tts/* {
        root * /srv/tts
        header Cache-Control "public, max-age=31536000, immutable"
        file_server
    }
```

并在 `self-host/docker-compose.yml` 的 caddy 服务上挂载目录（宿主机目录按实际路径改）：

```yaml
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - /opt/jplingo/tts:/srv/tts:ro   # 新增
```

`docker compose up -d` 后自测：`curl -sI https://api.jplingo.cn/tts/sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2 | head -3`。

**3. 让 App 用这个地址**：GitHub 仓库 → Settings → Secrets and variables → Actions →
Variables → 新增 `NUXT_TTS_MODEL_URL` =
`https://api.jplingo.cn/tts/sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2`，
然后重跑一次构建（push 或手动触发 workflow）。CI 会把它注入 `nuxt.config.ts` 的
`runtimeConfig.public.ttsModelUrl`；**变量为空时自动回落到官方 Release + 镜像**，所以随时可以撤回。

## 课程数据热更新（App 不重装也能拿到新课）

App 里的课程/词库数据来自打包资源，所以早期「改课程 = 重新发 APK」。现在改成**数据层热更新**：

**原理**

- `scripts/gen-data-manifest.cjs` 在每次构建前自动运行（`package.json` 的 `pregenerate` 钩子），
  扫描 `public/courses/**` 与 `public/dict/words.json`，生成 `public/data/manifest.json`：
  `{ version: "sha256:<内容哈希>", generatedAt, files: [{ path, size, sha256 }] }`。
  版本是**内容哈希**，所以内容没改时版本不变（CI 里稳定，不会因为构建时间不同而误判）。
- 这个清单同时打进 APK：App 知道自己「内置的数据是哪一版」，离线也能显示版本。
- App 启动 4 秒后静默检查一次 `https://www.jplingo.cn/data/manifest.json`（地址可用 `NUXT_PUBLIC_DATA_BASE_URL` 覆盖）；
  有更新时只在「我的 → 📦 课程数据」卡片上提示，用户点「立即更新」才下载。
- 下载**只取 sha256 变化的文件**（日常改几课就是几百 KB），校验 size + sha256（≤8MB 的文件）后写入
  `Directory.Data/jp-data/`，最后才写 `_applied.json` 与课程包索引（避免切到还没下完的课）。
- 读取顺序：**本地缓存 → APK 内置**。缓存缺失/损坏/更新失败都自动退回内置数据，不会白屏。

**发布流程（新增课程时）**

1. 改 `public/courses/**`，本地跑 `node scripts/build-grow.cjs --lesson 0X --write` 之类。
2. `git push` → EdgeOne 自动重新部署（`pregenerate` 会生成新的 manifest）。
3. 用户打开 App → 「我的 → 课程数据」出现「有新课程数据可更新」→ 点一下就生效，**不用重装 APK**。

**注意事项**

- 原生端用 `Filesystem.downloadFile`（原生 HTTP）拉数据，**不受 CORS 限制**——这点是必须的：
  EdgeOne 目前不对这些 JSON 返回 `Access-Control-Allow-Origin`，WebView 里直接 `fetch` 会被拦。
  如果你想让网页端也能跨域读这些 JSON（例如自建 CDN），需要在托管侧加 `Access-Control-Allow-Origin`。
- 音频（`public/audio/**`）不参与热更新：APK 里本来就没有 mp3，App 走内置离线语音引擎。
- kuromoji 分词词典（`public/dict/*.dat.gz`）也不参与：内容静态、体积大，跟 APK 一起发即可。
- 语法条数据在 `app/data/jp-grammar-points.ts`（TS 模块，编进 JS 包），要热更需先改造成 JSON 资产。
- 想换成自托管数据源：`NUXT_PUBLIC_DATA_BASE_URL=https://api.jplingo.cn`（那把 `/data/*`、`/courses/*`、`/dict/words.json` 放到该域名下即可）。

## 常见问题

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 线上打开 500 | 部署了不含鉴权修复的旧代码（`app/middleware/auth.global.ts` 未显式导入 `useJpAuth`） | 确认部署的是最新 main |
| 登录 401 | anon key 的 Allowed domains 排除了生产域名 | Supabase → API → 放开域名限制 |
| 注册后没直接登录 | 邮箱确认未关闭 | Authentication → Sign In / Up → Email → 关闭 Confirm email |
| 学习记录不同步 | RLS 未建 / migration 没执行 | 在 SQL Editor 执行 `supabase/migrations/0001_study_records.sql` |
| 深链刷新 404 | 纯静态托管未配 SPA 回退 | 加 `_redirects`（见「其他平台」） |
