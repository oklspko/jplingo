# jp-lingo · 日语连词成句

用「连词成句」的方式学习日语的交互式 Web 应用：给出中文，按空格分隔意群，用罗马字输入日语（五十音课练假名），逐词校验并朗读。

技术栈：Nuxt 4 + Vue 3（`ssr: false`）、TypeScript、wanakana（罗马字/假名转换）、@patdx/kuromoji（分词）、浏览器 TTS（发音）。

## 快速开始

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # 生产构建
pnpm preview    # 预览生产构建
```

## 部署（线上登录）

应用是纯 SPA（`ssr: false`），生产构建后即可静态/无服务器托管；登录用 Supabase 邮箱密码认证。下面以 Vercel 为例，Netlify / Cloudflare Pages 同理。

### 1. 准备环境变量

复制 `.env.example` 为 `.env`，填入 Supabase 项目信息（`.env` 已被 `.gitignore` 忽略，勿提交）：

```bash
cp .env.example .env
```

```ini
NUXT_SUPABASE_URL=https://your-project.supabase.co
NUXT_SUPABASE_ANON_KEY=your-anon-key
```

### 2. 配置 Supabase

1. 在 Supabase 新建项目，记下 **Project Settings → API** 里的 URL 与 anon key（填入上面 `.env`）。
2. 建表：在 SQL Editor 执行 `supabase/migrations/0001_study_records.sql`（`study_records` 表 + RLS 行级安全策略，按用户隔离学习记录）。
3. 关闭邮箱确认（注册即登录）：**Authentication → Sign In / Up → Email → 关闭 "Confirm email"**。
4. 确认 anon key 的 **Allowed domains** 未限制（留空或含 `*`），否则线上登录会 401。

### 3. 本地验证

```bash
pnpm build      # 生产构建
pnpm preview    # 本地预览，确认 /login、/jp-home 等深链可直接访问
```

### 4. 部署到 Vercel

1. 把代码推到 GitHub 默认分支（main）。
2. Vercel → **Add New → Project** → 导入该仓库，框架自动识别为 Nuxt（构建命令 `nuxt build`）。
3. **Environment Variables** 加两个（公开值）：
   - `NUXT_SUPABASE_URL` → `https://your-project.supabase.co`
   - `NUXT_SUPABASE_ANON_KEY` → `your-anon-key`
4. **Deploy**，拿到 `https://xxx.vercel.app` 后注册账号即可进入学习页。

### 常见问题

- **线上打开 500**：确认部署的是包含鉴权修复（`app/middleware/auth.global.ts` 显式导入 `useJpAuth`）的代码。
- **登录 401**：检查 anon key 的 **Allowed domains** 是否把生产域名排除在外。

## 目录结构

```
app/
  app.vue                        # 根组件（仅渲染 NuxtPage）
  assets/css/globals.css         # 全局样式（滚动条、视图过渡）
  types/jp.ts                    # 领域类型（JpToken/JpStatement/JpCourse/JpCoursePack）
  composables/jp/
    useJpCourses.ts              # 课程数据拉取与排序（fetchCoursePacks / fetchCourse / fetchCourseMeta / sortCoursePacks）
    useJpTokenizer.ts            # kuromoji 词典加载与分词（useJpTokenizer）
    useJpRomaji.ts               # 纯函数：假名/罗马字判定、转换、拆分（isSingleKanaCourseId / checkToken / katakanaToHiragana / splitSegments 等）
    useJpSound.ts                # 打字/判定音效 + 日语 TTS
    useJpKeyboard.ts             # 全局快捷键（Ctrl+R/K/;）
    useJpStorage.ts              # 学习记录（localStorage）
    useJpTimer.ts                # 学习计时
  components/jp/
    JpLogo.vue / JpSidebar.vue   # 侧边栏外壳
    game/JpTopbar.vue            # 游戏顶栏（进度、提示开关、计时、课程导航）
    game/JpHints.vue             # 罗马音/假名提示条
    game/JpCompleteModal.vue     # 课程完成弹窗
  pages/
    index.vue                    # 重定向到 /jp-home
    jp-home/index.vue            # 课程列表
    jp-game/[coursePackId]/[id].vue   # 连词成句游戏
    jp-editor/index.vue          # 课程编辑器
    jp-me/index.vue              # 学习统计
public/courses/                  # 课程数据（静态 JSON）
```

## 课程数据格式

### 课程包索引 `public/courses/course-packs.json`

```json
{
  "coursePacks": [
    {
      "id": "jp-kana",
      "title": "五十音",
      "language": "ja",
      "level": "入门",
      "description": "从清音到拗音，系统掌握日语五十音输入",
      "courses": ["jp-kana-01", "jp-kana-02"]
    }
  ]
}
```

### 课程文件 `public/courses/<coursePackId>/<courseId>.json`

```json
{
  "id": "jp-01",
  "coursePackId": "jp-basic-01",
  "title": "第一课",
  "order": 1,
  "statements": [
    {
      "id": "jp-01-01",
      "chinese": "我喝水",
      "japanese": "私 は 水 を 飲みます",
      "kana": "わたし は みず を のみます",
      "romaji": "watashi ha mizu wo nomimasu",
      "tokens": [
        { "text": "私", "kana": "わたし" },
        { "text": "は", "kana": "は" }
      ]
    }
  ]
}
```

字段说明：

- `japanese` / `kana` / `romaji`：用**空格**分隔意群，三者意群数量与顺序一致。
- `tokens`：每个意群一个 `{ text, kana }`，`text` 为展示用（汉字/假名），`kana` 为判定用假名。
- 五十音课（`jp-kana-*`）每个 statement 只有一个 token，游戏会以「罗马字输入」模式判定。

## 编辑器

`/jp-editor` 可加载/新建/导入/导出课程 JSON。在「日语」输入框用空格分隔意群后点「→ 生成」，会调用 kuromoji 分词自动生成假名、罗马字与 tokens（可手动微调）。导出后放入 `public/courses/<coursePackId>/` 并在 `course-packs.json` 登记即可上线。

## 可测试的纯函数

以下纯函数无副作用、无浏览器依赖，适合做单元测试的切入点：

- `useJpRomaji.ts`：`isSingleKanaCourseId` / `getTokenRomaji` / `checkToken` / `calcWordWidth` / `katakanaToHiragana` / `splitSegments`
- `useJpCourses.ts`：`sortCoursePacks`
- `useJpStorage.ts`：`calcStreak` / `formatDuration`
