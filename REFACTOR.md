# jplingo 重构执行步骤（逐步执行用）

> 目标：**功能与界面完全不变**的前提下，优化代码结构与算法逻辑。
> 使用方式：从上往下逐步做，**每一步做完必须通过该步的验证**再进下一步；任何一步验证不过就回滚（`git revert` 或 `git checkout -- <file>`），不要带着红灯继续。
> 配套不变量清单见 `jplingo/CLAUDE.md`（句子生长四条原则、输入状态机、数据热更新、发音回退链等）——**重构就是不许碰这些行为，只改实现方式**。

---

## 0. 分工总览（什么时候用哪个模型）

| 阶段 | 内容 | 建议模型 | 理由 |
|---|---|---|---|
| ① 准备与安全网 | 基线记录、自测进 CI、渲染快照对比、页面回归测试 | **Flash** | 机械、可验证、无需深推理 |
| ② 结构重构 | 拆巨型页面、数据与展示分离、类型集中、抽公共层 | **Flash 执行 + Pro 审查每步 diff** | 改动量大但模式固定；审查只需看 diff |
| ③ 算法等价重构 | 句子生长顺序、输入状态机、数据热更新、发音回退链、性能 | **Pro** | 隐性不变量多，等价性推理是主要风险 |
| ④ 终审与收口 | 全量 diff 复查、端到端验证、发版、更新文档 | **Pro** | 只在这时做整体判断 |

**只切一次模型的话：切 Pro，但只在 ③④ 用它。** ①② 用 Pro 是浪费额度。

---

## 阶段 ① 准备与安全网（Flash）

### 步骤 1：记录重构前基线
- 做：记录当前版本号、提交、自测通过数、线上版本标记。
- 命令：
  ```bash
  cd jplingo
  node -e "console.log(require('./package.json').version)"
  git rev-parse --short HEAD
  node tests/offline-tts/run.cjs | Select-String '合计'   # 期望：各 spec 0 失败（当前 278 项）
  curl.exe -s "https://www.jplingo.cn/index.html?cb=1" | Select-String -Pattern '1\.2\.\d+'
  ```
- 通过标志：版本号、提交号、断言总数写进本文件末尾的「基线」小节。
- 禁止：这一步不要改任何代码。

### 步骤 2：开重构分支
- 做：`git switch -c refactor/structure-<日期>`；此后所有改动只提交到这个分支。
- 通过标志：`git status` 干净、分支正确。
- 注意：提交信息用中文；`dist/` 是 junction 且被跟踪，**提交前必须** `git checkout HEAD -- dist; git clean -fdq dist`，**永远不要 `git add dist`**。

### 步骤 3：自测纳入 CI
- 做：在 `.github/workflows/build-apk.yml` 之外新增一个轻量 job（或在现有 job 里加一步）：`node tests/offline-tts/run.cjs`，失败即红。
- 通过标志：故意改坏一个断言 → CI 变红 → 改回 → CI 变绿。
- 为什么先做：现在 278 项断言**不进 CI**，重构时没人拦你，这是最大风险。

### 步骤 4：渲染快照对比脚本
- 做：新增 `scripts/verify-render.cjs`：
  1. `nuxt generate`（或复用现有 `.output/public`）；
  2. 起本地静态服务（SPA 回退到 `200.html`）；
  3. 对关键路由用无头浏览器 dump DOM：`/`、`/jp-home/`、`/jp-grammar/`、`/jp-kana-chart/`、`/jp-words/`、`/jp-me/`、`/jp-game/jp-growing/jp-grow-01`、`/jp-study/jp-growing/jp-grow-01`；
  4. 与基线（`tests/render-baseline/*.txt`，只存**可见文本 + 元素计数 + 版本标记**，别存整份 DOM）对比，输出差异。
- 命令（Windows 无头浏览器路径）：
  ```
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --no-sandbox --user-data-dir=<独立目录> --window-size=390,844 --dump-dom --virtual-time-budget=18000 <url>
  ```
  注意：**每次用全新的 `--user-data-dir`**，否则会因 profile 被占用而输出 0 字节；若浏览器不可用，退化为「静态检查」：拉取页面 chunk，断言关键文案（如 `作谓语句`）存在、且不存在此前踩过的未定义标识符。
- 通过标志：脚本对基线输出「无差异」；**故意改一处文案 → 脚本必须报差异**（证明它真能拦住）。

### 步骤 5：给三个巨型页面补最小回归测试
- 做：`jp-home`(1450 行)、`jp-editor`(1438 行)、`jp-me`(1341 行) 各写一条「结构存在性」断言（关键区块/按钮/文案存在、数量和关键 id 不变），并入 `tests/` 或 `verify-render.cjs`。
- 通过标志：这三条断言在重构前是绿的（它们将成为拆页面时的护栏）。

---

## 阶段 ② 结构重构（Flash 执行，Pro 审 diff）

> 每一步都固定四连：**改 → 跑 `node tests/offline-tts/run.cjs` → 跑 `node scripts/verify-render.cjs` → 小步提交**。

### 步骤 6：抽公共工具层（先做零风险的）
- 做：把重复的日期/大小格式化、播放/发音入口、文案常量、`try/catch + 回退` 样板抽到 `app/utils/`。
- 禁止：不要动 `useJpSound` 的回退顺序、不要动 `useJpTts` 的探测与缓存语义。
- 通过标志：自测 + 快照全绿；重复代码块数量下降（用 diff 行数说明）。

### 步骤 7：拆 `jp-me/index.vue`（1341 行）
- 做：按卡片拆成组件（离线发音卡片、课程数据卡片、账号卡片…），逻辑进 `app/composables/jp/useJpMe*.ts`，页面只负责编排。
- 禁止：卡片文案、开关默认值、进度条行为、以及「启动静默检查数据更新但不自动下载」的语义。
- 通过标志：单文件 ≤ 300 行；步骤 5 的 `jp-me` 断言全绿。
- 建议：拆完让 Pro 只审这一条的 diff，重点看「有没有顺手改了交互」。

### 步骤 8：拆 `jp-home/index.vue`（1450 行）
- 做：同上；课程列表渲染、导入课程包、文件夹/分组管理各自成组件。
- 禁止：`getPracticeCount()` 口径、课程包索引读取路径、离线回退（缓存→内置）行为。
- 通过标志：同步骤 7。

### 步骤 9：拆 `jp-editor/index.vue`（1438 行）
- 做：同上；编辑态与预览态拆分，课程数据编辑逻辑进 composable。
- 禁止：导出 JSON 的字段顺序/格式、`--force` 类内容变更守卫的语义（若前端涉及）。
- 通过标志：同步骤 7；导出的课程文件与重构前**逐字节一致**（用 `git diff --stat public/courses` 验证为空）。

### 步骤 10：数据与展示分离
- 做：`JpParticles`(799)/`JpKeigo`(650)/`JpGrammarGuide`(451) 里的大数组移到 `app/data/*.ts`（或直接消费已导出的 `public/data/grammar-reference.json`），组件只留渲染。
- 禁止：**必须保留内置兜底**（远端 JSON 拿不到时用内置数据，永不空白）；`useJpGrammarContent` 的显式 import 不能删（删了就是整页 500，见 `scripts/check-grammar-wiring.mjs`）。
- 通过标志：`node scripts/check-grammar-wiring.mjs` 通过；快照对比 `/jp-kana-chart/` 无差异；单文件行数明显下降。

### 步骤 11：类型集中与命名统一
- 做：散落的 interface/type 收进 `app/types/`，命名统一（组件 `Jp*`、composable `useJp*`、工具 `jpxxx.ts`）。
- 禁止：不要重命名会影响**运行时字符串**的东西（路由名、localStorage key、缓存文件名如 `jp-data/_applied.json`、插件名 `JpTts`）。
- 通过标志：`npx nuxi typecheck` 通过；自测 + 快照全绿。

---

## 阶段 ③ 算法等价重构（Pro）

> 原则：**先补用例，再改实现**；每一步都要能回答「为什么新旧等价」。

### 步骤 12：`buildGrowingOrder`（句子生长顺序）
- 先补用例：短句在前长句在后（含同长度稳定）、词先句后、已练词不重复单练、助词不单练、孤词最后、一课一句话。
- 再重构：只允许等价变形（提取纯函数、消除副作用、合并重复遍历）。
- 验证：`node tests/offline-tts/run.cjs` 的 `spec-growing` 必须逐条通过（它直接读 `public/courses/jp-growing/*.json` 校验真实课程）。
- 禁止：改变出题顺序的任何一位（这是产品的核心逻辑）。

### 步骤 13：`useJpInput` 输入判定状态机
- 先补用例：Input/Fix/Fix_Input 迁移、incorrect 仅在提交时标记、空格跳下一个空、最后一个空才提交。
- 再重构：保持状态机形状，别退回派生 computed 推导。
- 验证：新用例 + 现有 `spec` 全绿。

### 步骤 14：数据热更新读取/校验路径
- 先补用例：缓存优先、坏数据回退内置、只下 sha256 变化文件、索引最后写、截断中止、失败保留旧版本、**按缓存内容复核不再重复提示**。
- 再重构：提取纯函数（`planUpdate`/`verifyAgainstCache` 风格）。
- 验证：`spec-datapack` 全绿；并本地演练一次「旧基线 → 线上清单」的更新计划（下载文件数与大小应与线上实际一致）。

### 步骤 15：发音回退链与预加载顺序
- 先补用例：四级回退顺序、预生成音频缺失时不重复合成、学习页按序预加载、游戏页提前加载保留。
- 再重构：只动组织方式，不动优先级与去重/串行语义。
- 验证：`spec-sound` / `spec-preload` 全绿。

### 步骤 16（可选）：性能优化
- 前提：**先测再改**（记录重构前后的耗时/次数），没有数据不改。
- 方向：大数组过滤/computed 的重复全量扫描、模糊查询的分词结果缓存、发音文本的 md5/缓存复用、课程数据的一次性解析 + 复用。
- 验证：优化前后**结果一致**（快照 + 自测）+ 耗时数据改善。

---

## 阶段 ④ 终审与收口（Pro）

### 步骤 17：全量 diff 复查
- 做：`git diff main...refactor/structure-<日期> --stat` 通读，逐条对照 `CLAUDE.md` 的不变量清单，专挑「行为可能变了」的地方。
- 通过标志：diff 里每一处行为改动都能说出理由，否则回滚该处。

### 步骤 18：端到端验证
- 本地：`node tests/offline-tts/run.cjs` + `node scripts/verify-render.cjs` + `npx nuxi typecheck` + `pnpm generate` 全绿。
- 线上：合并到 `main` 后等 EdgeOne 自动部署（**构建必须不失败**，退一步用 `scripts/gen-*` 是否 0 退出判断），确认线上版本标记更新、关键页面 200。
- App：打 tag `vX.Y.Z` → CI 出 APK → 抽包核对（版本号、`assets/public` 页面数、数据剔除状态是否符合预期）。

### 步骤 19：收口
- 更新 `CLAUDE.md`（结构变化后的路径说明）与本文件「进度记录」小节；
- 发版说明写清楚：本次为**等价重构**，行为与界面不变（列出验证证据）。

---

## 基线（重构前填写）

- 版本号：`1.2.38`
- 提交：`1ac6d75`
- 自测：`node tests/offline-tts/run.cjs` → 11 个 spec，合计 **278 项断言，0 失败**
- 线上版本标记：`1.2.38`（部署正常）
- 体积基线：`app/` 53 个文件 / 16.7k 行；最大页面 `jp-home` 1450、`jp-editor` 1438、`jp-me` 1341

### 步骤 1 复核记录（2026-10-12 实测于 `refactor/structure-safety-net`）

原始基线数字已在上方保留，下面是用命令实测到的复核结果，后续步骤一律以本小节为准。

| 项目 | 命令 | 实测结果 |
|---|---|---|
| 版本号 | `node -e "console.log(require('./package.json').version)"` | `1.2.38` |
| 提交 | `git rev-parse --short HEAD` | `1ac6d75`（与基线一致，源码未变） |
| 自测 spec 数 | `node tests/offline-tts/run.cjs` | **11 个 spec**（spec / spec-sound / spec-bundled / spec-bundled-fail / spec-viewport / spec-preload / spec-growing / spec-fuzzy / spec-datapack / spec-grammar-wiring / spec-build-safety） |
| 自测断言数 | 同上 | **278 项断言，0 失败**（各 spec 明细：55 + 34 + 10 + 7 + 20 + 14 + 62 + 23 + 42 + 10，另 spec-grammar-wiring 为 1 项接线自检） |
| 线上版本标记 | `curl.exe -s "https://www.jplingo.cn/index.html?cb=1" \| Select-String -Pattern '1\.2\.\d+'` | `appVersion:"1.2.38"` / `buildId:"1.2.38"`（与本地一致） |
| 构建产物 | `npx nuxi generate` | `Prerendered 933 routes`，退出码 0；`.output/public` 含 `jp-game/`、`jp-study/` 深链路目录（920 条课程路由 + 静态页） |
| `app/` 规模 | `git ls-files app` + 逐文件行数 | **54 个文件 / 15,520 行**（与基线写的「53 个文件 / 16.7k 行」有出入，见下方备注） |
| 三大页面行数 | 逐文件统计 | `jp-home` 1450、`jp-editor` 1438、`jp-me` 1341（与基线**完全一致**，可换算成三页合计 4229 行） |

> **备注（步骤 1 发现的三处基线偏差，留给后续步骤判断）**
> 1. **`spec-build-safety` 的最后一项断言依赖构建产物**：`node tests/offline-tts/run.cjs` 里的
>    「课程深链路目录已生成」会去查 `.output/public/` 下有没有 `jp-game`、`jp-study` 两个目录
>    （`tests/offline-tts/spec-build-safety.ts:111-112`）。旧构建产物里没有它们（当时 `.output/public`
>    是过期产物，`courses/` 下也缺 `jp-transform`、`jp-n5`~`jp-n1` 等后来新增的课程包），所以本机
>    初次跑自测就报了 1 项失败。**这不是源码问题**：
>    `npx nuxi generate`（`Prerendered 933 routes`，退出码 0）后 `.output/public` 与 `dist/` 下
>    都出现了 `jp-game/`、`jp-study/`，自测立刻变成 **278 项断言 0 失败、退出码 0**。
> 2. **⚠️ 强制性的提交前清理会把这项断言打回红灯（本次最关键的发现）**：
>    `dist` 在本机是指向 `.output/public` 的 junction，而 git 在 `dist/` 下只跟踪了旧的静态文件，
>    **`dist/jp-game`、`dist/jp-study` 是未跟踪的**（实测 `git ls-files dist | grep jp-game` = 0 条）。
>    于是规则要求的 `git checkout HEAD -- dist; git clean -fdq dist` 会把这两个目录当垃圾删掉，
>    结果就是：**「跑 `nuxi generate` → 278/0 全绿」和「执行强制性提交前清理 → 该断言红灯」两者互斥**。
>    实测复现（本次会话原始输出）：
>    - `npx nuxi generate` → `Test-Path dist/jp-game` = `True` → 自测 **退出码 0**（各类合计全 0 失败）
>    - `git checkout HEAD -- dist; git clean -fdq dist` → `Test-Path dist/jp-game` = `False`
>      → `[FAIL] 课程深链路目录已生成 -> 只有 无`，`合计 10 项，失败 1 项`，**退出码 1**
>    → 结论：**判断源码是否健康请以「`nuxi generate` 之后、提交前清理之前」的那次运行为准**；
>    提交后直接重跑自测会看到这 1 项红灯，属**本地 junction 产物被清理**造成，不是代码回归。
>    后续步骤 3（自测搬进 CI）要利用这一点：**CI 里没有 junction，先 build 再跑自测即可稳定全绿**，
>    不要把这个本地假红灯当成真的红线。
> 3. **`app/` 行数口径存疑**：`git ls-files app` 恰好 54 个文件；按「非空行」统计为 15,520 行。
>    基线写的「53 个文件 / 16.7k 行」既对不上文件数也对不上行数，但三大页面行数（1450/1438/1341）与实测**逐字一致**。
>    → 重构前后对比**必须以 15,520 行（54 文件）为基准**，不要沿用 16.7k；差异原因未查（可能是当时用了别的工具或口径）。

## 进度记录

| 步骤 | 状态 | 提交 | 验证结果 |
|---|---|---|---|
| 1 基线记录 | ☑ | 本表下方「步骤 1 复核记录」所在提交 | 版本 1.2.38 / 提交 1ac6d75 / 278 项断言 0 失败（`nuxi generate` 之后测得，退出码 0）/ 线上 1.2.38；提交前清理 `dist` 后该 1 项断言会假红灯，见备注 2 |
| 2 重构分支 | ☐ | | |
| 3 自测进 CI | ☐ | | |
| 4 渲染快照脚本 | ☐ | | |
| 5 巨型页面回归测试 | ☐ | | |
| 6 公共工具层 | ☐ | | |
| 7 拆 jp-me | ☐ | | |
| 8 拆 jp-home | ☐ | | |
| 9 拆 jp-editor | ☐ | | |
| 10 数据与展示分离 | ☐ | | |
| 11 类型集中 | ☐ | | |
| 12 句子生长等价重构 | ☐ | | |
| 13 输入状态机等价重构 | ☐ | | |
| 14 数据热更新等价重构 | ☐ | | |
| 15 发音链等价重构 | ☐ | | |
| 16 性能优化（可选） | ☐ | | |
| 17 全量 diff 复查 | ☐ | | |
| 18 端到端验证 | ☐ | | |
| 19 收口与发版 | ☐ | | |
