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
- 做：新增 `.github/workflows/tests.yml`（或复用现有 workflow 加一个 job），步骤为：
  1. `pnpm install --frozen-lockfile`
  2. `pnpm generate`（**必须先构建**，深链路断言依赖产物）
  3. `JPLINGO_EXPECT_BUILD=1 node tests/offline-tts/run.cjs`（带这个变量才会强制核对构建产物，见步骤 1 备注 4）
- 通过标志：把 `refactor/structure-*` 分支 push 到 origin（**只推分支，不推 main**），用 `gh run list` / `gh run watch` 看该 workflow 变绿；本地再故意改坏一个断言确认它变红后改回。
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
- 体积基线（口径见下方可复现脚本）：`git ls-files app` = **54 个文件 / 19,146 行（含空行）/ 17,149 行（非空行）**；
  最大文件：`jp-home` 1634/1458、`jp-editor` 1612/1438、`jp-me` 1539/1345、`jp-game/[coursePackId]/[id]` 1067/946、`JpParticles` 829/802、`jp-record` 825/726、`jp-grammar-points.ts` 692/689、`JpKeigo` 683/651

可复现的重算命令（重构前后都用它对比，别用别的口径）：
```bash
node -e "const{execSync}=require('node:child_process');const fs=require('node:fs');const files=execSync('git ls-files app',{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);let raw=0,nb=0;for(const f of files){const l=fs.readFileSync(f,'utf8').split(/\r?\n/);const b=l.length&&l[l.length-1]===''?l.slice(0,-1):l;raw+=b.length;nb+=b.filter(x=>x.trim()!=='').length}console.log('文件',files.length,'含空行',raw,'非空行',nb)"
```

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
| `app/` 规模 | 上方「可复现的重算命令」 | **54 个文件 / 19,146 行（含空行）/ 17,149 行（非空行）** |
| 三大页面行数 | 同上（含空行/非空行） | `jp-home` 1634/1458、`jp-editor` 1612/1438、`jp-me` 1539/1345 |

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
> 3. **`app/` 行数口径**（已修）：最初那组「53 个文件 / 16.7k 行」是 PowerShell `-Include` 通配符统计出来的——
>    含 `[ ]` 的动态页面路径（`jp-game/[coursePackId]/[id].vue` 等）会被当成通配符过滤掉，行数算法也不同。
>    现已改为上方那段 Node 脚本（`git ls-files app` + 逐文件统计，同时给含空行与非空行两个数），
>    **重构前后一律用同一段脚本对比**。
> 4. **`spec-build-safety` 的假红灯已修**（本步顺带修掉）：
>    深链路目录（`jp-game/`、`jp-study/`）是**未跟踪**的构建产物（静态页产物是 git 跟踪的，清理后仍在），
>    而提交前必做的 `git clean -fdq dist`（`dist` 是本机指向 `.output/public` 的 junction）会把它们删掉，
>    于是「generate 后全绿」与「清理后重跑」互相打架。
>    现改为**显式声明**才强制核对：`JPLINGO_EXPECT_BUILD=1 node tests/offline-tts/run.cjs`；
>    不声明时只打印 `[skip]` 提示。三种情形已实测：清理后未声明 → 跳过全绿；构建后声明 → 强制核对通过；
>    **声明却缺产物 → 报失败**（护栏保留）。CI 里必须「先 generate 再带该变量跑自测」。

### 步骤 4 执行记录（2026-10-12 实测于 `refactor/structure-safety-net`）

新增三个文件：

| 文件 | 作用 |
|---|---|
| `scripts/serve-static.cjs` | 极简本地静态服务（无依赖、端口可配、**SPA 回退到 `200.html` 且状态码 200**） |
| `scripts/verify-render.cjs` | 渲染快照对比脚本（8 条关键路由，只存可见文本 + 元素计数 + 版本标记） |
| `tests/render-baseline/*.txt` + `guards.json` | 基线（8 份，共 110,255 字节）与独立护栏 |
| `scripts/README-render-snapshot.md` | 上述工具的用法与踩坑记录 |
| `.github/workflows/tests.yml` | 新增 `render-snapshot` job（独立于 `offline-tts`，用 `JPLINGO_EDGE` 强制真实浏览器） |

覆盖路由（与本节要求一致）：`/`、`/jp-home/`、`/jp-grammar/`、`/jp-kana-chart/`、
`/jp-words/`、`/jp-me/`、`/jp-game/jp-growing/jp-grow-01`、`/jp-study/jp-growing/jp-grow-01`。

| 项目 | 命令 | 实测结果 |
|---|---|---|
| 构建 | `npx nuxi generate` | `Prerendered 933 routes`，`Generated public .output/public`，退出码 0 |
| 抓取 | `node scripts/verify-render.cjs --write-baseline` | 8 条路由全部抓到：35 / 35 / 2696 / 40 / 1247 / 117 / 24 / 547 行可见文本 |
| 基线确定性（关键） | 连续两遍 `--write-baseline` 后逐文件比对 SHA256 | **8 个 `.txt` 全部 IDENTICAL**（见下方原始输出） |
| 通过标志（无差异） | `node scripts/verify-render.cjs` | `合计 8 条路由，无差异`，退出码 0（连跑 3 次均 0） |
| **故意改坏 → 报差异** | 把 `app/pages/jp-home/index.vue:8` 的副标题改成 `【快照测试】用连词成句的方式学习日语` → `npx nuxi generate` → `node scripts/verify-render.cjs` | `[FAIL] / 与基线有差异` / `[FAIL] /jp-home/ 与基线有差异`，两处都精确指到 `line 10: - 用连词成句的方式学习日语 / + 【快照测试】用连词成句的方式学习日语`；`合计 8 条路由，差异/问题 2 条`，**退出码 1** |
| 改回 → 恢复全绿 | `git checkout HEAD -- app/pages/jp-home/index.vue`（`git status --short -- app/` 为空）→ `npx nuxi generate` → 重跑 | `[ok]` ×8，`合计 8 条路由，无差异`，退出码 0 |
| 自测未受影响 | `JPLINGO_EXPECT_BUILD=1 node tests/offline-tts/run.cjs` | 11 个 spec **278 项断言 0 失败**，退出码 0 |
| 降级路径演练 A | `JPLINGO_EDGE=C:\Windows\System32\cmd.exe node scripts/verify-render.cjs --only jp-home` | 静态检查 1 条通过，但脚本判 `[FAIL] 浏览器存在但渲染快照取不到 → 按失败退出`，**退出码 2** |
| 降级路径演练 B | 同上 + `--allow-degraded` | 打印降级原因后静态检查全绿，退出码 0（降级必须显式声明） |
| 降级路径演练 C | 在 `guards.json` 里给 `/jp-home/` 加一条不存在的必备文案后跑降级 | `[FAIL] /jp-home/ -> 产物 chunk 中找不到文案「这条文案不存在」`，退出码 1（静态检查真的会红） |

原始输出（基线确定性 + 改坏/改回）：

```
=== 两遍基线逐字节比较 ===
jp-game__jp-growing__jp-grow-01.txt                  IDENTICAL
jp-grammar.txt                                       IDENTICAL
jp-home.txt                                          IDENTICAL
jp-kana-chart.txt                                    IDENTICAL
jp-me.txt                                            IDENTICAL
jp-study__jp-growing__jp-grow-01.txt                 IDENTICAL
jp-words.txt                                         IDENTICAL
root.txt                                             IDENTICAL

### 重跑快照脚本（期望：报差异，退出码 1）
[5/5] 与基线对比（D:\my-project\jplingo\tests\render-baseline）
  [FAIL] / 与基线有差异：
        line 10:
    - 用连词成句的方式学习日语
    + 【快照测试】用连词成句的方式学习日语
  [FAIL] /jp-home/ 与基线有差异：
        line 10:
    - 用连词成句的方式学习日语
    + 【快照测试】用连词成句的方式学习日语
  [ok] /jp-grammar/ 无差异（2696 行可见文本）
  ...
合计 8 条路由，差异/问题 2 条
SNAPSHOT_EXIT=1

### 改回原样 → 重新构建 → 再跑快照
  [ok] / 无差异（35 行可见文本）
  [ok] /jp-home/ 无差异（35 行可见文本）
  ...
合计 8 条路由，无差异
SNAPSHOT_EXIT=0
```

> **备注（步骤 4 发现，留给后续步骤）**
> 7. **本机 `--dump-dom` 输出 0 字节（重要偏差）**：Edge 155/154 的
>    `--headless=new --dump-dom` 无论管道还是重定向到文件都是 0 字节，同参数 `--screenshot` 能出图，
>    说明渲染引擎正常、只是 dump 通道在本机不可用。改为**同等的 CDP 通道**
>    （`--remote-debugging-port` → `Runtime.evaluate` 取 DOM），口径没有放宽；
>    根因未查明（疑似本机 Edge 策略/沙箱），后续若有人修好 dump-dom 也不影响现有基线。
> 8. **`--write-baseline` 必须「先构建再写」**：产物与源码不一致时写出来的基线就是错的，
>    所以重建基线的正确姿势是 `--build --write-baseline`（脚本默认要求显式 `--write-baseline` 才会写）。
> 9. **降级不能静默变绿**：最初实现里「浏览器起不来」也会走静态检查并以 0 退出，
>    等于给重构开了一个假绿灯。现已改为：浏览器存在却取不到渲染结果 → **退出码 2**；
>    确实要接受降级必须显式 `--allow-degraded`（CI 用 `JPLINGO_EDGE` 强制要真浏览器）。
> 10. **异步卡片会让快照抖**：只等「文本不变」不够——`/jp-me/` 的「检查更新」卡片
>     会因 GitHub Releases 接口快慢而出现/不出现，实测 5 次里 3 次报差异。
>     现改为**等网络空闲 + 文本稳定**双条件，并把该卡片归一化成 `<更新检查>`。

### 步骤 3 执行记录（2026-10-12 实测于 `refactor/structure-safety-net`）

新增 `.github/workflows/tests.yml`（job `offline-tts`，`push: [main, refactor/structure-*]` + `workflow_dispatch`，`permissions: contents: read`，`timeout-minutes: 30`）：
`pnpm install --frozen-lockfile` → `pnpm generate` → `JPLINGO_EXPECT_BUILD=1 node tests/offline-tts/run.cjs`。

| 项目 | 命令 | 实测结果 |
|---|---|---|
| 首次 push 后的 CI（**红灯，暴露真问题**） | `gh run list --branch refactor/structure-safety-net` | run `38257103046` = `failure`，39s；失败步骤正是自测：`找不到 esbuild（应为 Nuxt/Vite 的传递依赖）。先 pnpm install，再重跑。` 退出码 2 —— install 与 generate 都成功 |
| 根因 | 干净 clone 里 `Test-Path node_modules/esbuild` = `False`（只 `.pnpm/esbuild@0.28.2`） | 本机 `jplingo/node_modules` 是 hoisted（扁平）布局，所以 `require("esbuild")` 能解析到；pnpm 默认**隔离链接**只给直接依赖建顶层 symlink，CI 上 esbuild 是 Nuxt 的传递依赖 → 顶层不存在 → `run.cjs:20-25` 直接 `exit 2` |
| 修复 | `package.json` devDependencies 增加 `"esbuild": "0.28.2"`（与 lockfile 里已解析的 `esbuild@0.28.2` **同版本**） | `pnpm-lock.yaml` 只多 3 行 importer 声明（`specifier`/`version`），**没有新增重复包实例**；干净 clone 重装后 `require.resolve('esbuild')` → `node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/lib/main.js` |
| 干净环境全流程复现（本机 clone，独立目录） | `pnpm install --frozen-lockfile` → `pnpm generate` → `JPLINGO_EXPECT_BUILD=1 node tests/offline-tts/run.cjs` | 安装 37.6s、generate 退出码 0、`.output/public/jp-game` 与 `jp-study` 均 `True`；断言 **278 项 0 失败**（含 `[ok] 课程深链路目录已生成`），退出码 0 |
| 故意改坏 → 必须报错 | 在 clone 里把 `public/courses/jp-growing/jp-grow-01.json` 的两条句子对调（长句挪到最前）后重跑 | `[FAIL] jp-grow-01.json 文件里句子也是短句在前（20 → 5 token）  -> [20,5,5,6,...,19,5]`，`合计 62 项，失败 1 项`，`TESTS_EXIT=1`（CI 步骤会因此变红） |
| 改回 → 恢复全绿 | `git checkout HEAD -- public/courses/jp-growing/jp-grow-01.json` 后重跑 | `git status --short -- public/courses` 为空；`spec-growing` 回到 `合计 62 项，失败 0 项`，全套 **278 项 0 失败**，退出码 0 |

> **备注（步骤 3 发现）**
> 5. **本机自测通过 ≠ CI 能跑**：本机 `node_modules` 是历史遗留的扁平（npm 式）布局，掩盖了
>    「`esbuild` 只是传递依赖」这个事实。凡 CI 要跑的脚本，其 `require()` 的包都必须在本项目
>    `package.json` 里显式声明——本次已按此修正，并把「干净 clone + frozen-lockfile」当作
>    上 CI 前的本地预演（放仓库**外面**的目录做，放仓库里会被 Node 向上解析到主仓库的
>    `node_modules`，验证结果不可信）。
> 6. CI 只读、不部署、不碰 main 发布流程；`main` 上的 push 也会跑同一套自测（作为合并前护栏）。

## 进度记录

| 步骤 | 状态 | 提交 | 验证结果 |
|---|---|---|---|
| 1 基线记录 | ☑ | 本表下方「步骤 1 复核记录」所在提交 | 版本 1.2.38 / 提交 1ac6d75 / 278 项断言 0 失败（`nuxi generate` 之后测得，退出码 0）/ 线上 1.2.38；提交前清理 `dist` 后该 1 项断言会假红灯，见备注 2 |
| 2 重构分支 | ☑ | `5b15f0d`（REFACTOR.md + scripts/refactor-orchestrate.js 入库） | 分支 `refactor/structure-safety-net`（已 push 到 origin）；`main` 未动（仍 `1ac6d75`），未 merge、未打 tag |
| 3 自测进 CI | ☑ | `472ebfe`（workflow）+ `342026f`（esbuild 显式依赖） | 见上方「步骤 3 执行记录」：分支已 push；首次 CI 红灯暴露 esbuild 传递依赖问题 → 修复后干净环境 278/0；故意改坏 → 失败 1 项退出码 1 → 改回全绿 |
| 4 渲染快照脚本 | ☑ | 见本表下方「步骤 4 执行记录」所在提交 | 8 条关键路由渲染快照全绿（退出码 0）；两遍基线逐字节 IDENTICAL；**故意改坏 jp-home 副标题 → 精确报出 2 条差异 / 退出码 1 → 改回后全绿**；降级路径三种情形实测（浏览器起不来 = 退出码 2，不静默变绿）；自测仍 278/0 |
| 5 巨型页面回归测试 | ☑ | 本次提交（`.gitattributes` + `verify-render.cjs` + `guards.json` + `jp-editor.txt`） | 三个巨型页面全部纳入：`/jp-home/`（8 条必备文案）、`/jp-editor/`（**新增路由 + 357 行基线 / 728 行可见文本**，4 条必备文案）、`/jp-me/`（3 条，剔除原生专属卡片）。**9 条路由全量重跑：全部无差异、退出码 0**；护栏机制实测会报错（此前写错一条「课程数据」→ `[FAIL] … 缺少必备文案「课程数据」`）；故意篡改 `jp-editor.txt` → 精确报出 `line 30: - 课程信息X / + 课程信息`、退出码 1 → 还原后 `[ok]`；严格模式自测 `JPLINGO_EXPECT_BUILD=1` = 278 项 0 失败 |
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

---

## 暂停点与续跑说明（2026-10-12 步骤 4 完成后更新）

**当前进度：步骤 1–4 已完成并验证；下一步是步骤 5（给 jp-home / jp-editor / jp-me 补最小回归测试）。**

| 项 | 状态 |
|---|---|
| 分支 | `refactor/structure-safety-net`（已 push 到 origin，`main` 未动：仍 `1ac6d75`） |
| 本分支提交 | `5b15f0d` 基线入库 → `b785f2a` 基线口径修正 + 假红灯修复 → `472ebfe` 自测进 CI → `342026f` esbuild 显式依赖 → 步骤 4 记录所在提交（快照脚本 + 基线 + CI job） |
| 线上/发布 | **没受影响**：`main` 未动，线上仍 1.2.38，Release 仍 v1.2.38 |
| 工作区 | 干净（本文件所在提交；`dist/` 的构建噪声已按规则还原，未提交） |
| CI | `offline-tts` job 在该分支 **success**（run `38257487220`）；步骤 4 新增 `render-snapshot` job，需 push 后看实际结果 |

**续跑步骤 5 的入口**（先确认在分支上、工作区干净）：

```bash
cd D:/my-project/jplingo
git switch refactor/structure-safety-net      # 若已在则跳过
git status --short                            # 期望：空
git log --oneline -1                          # 期望：步骤 4 的提交
```

步骤 5 的三条「结构存在性」断言可以直接加进 `tests/render-baseline/guards.json`
（走 `scripts/verify-render.cjs` 的护栏，重新生成基线也不会被抹掉），或按需新增 spec；
jp-home 已经有一条现成护栏（`导入课程包` / `新建文件夹` / `分组管理` / `单词课程`）。

**暂停时的注意事项（留给续跑者）**
1. 本机 `dist/` 是指向 `.output/public` 的 junction 且被 git 跟踪 → 每次提交前 `git checkout HEAD -- dist; git clean -fdq dist`，**永不 `git add dist`**。
2. 本机 `node_modules` 是扁平布局，会掩盖「某包只是传递依赖」——凡 CI 要跑的脚本，`require()` 的包必须在 `package.json` 显式声明（步骤 3 的坑）。
   步骤 4 的两个脚本只用 Node 内置模块（`http`/`net`/`crypto`/`fs`……），**不新增任何依赖**，所以没有这个坑。
3. 自测判断口径：构建后带 `JPLINGO_EXPECT_BUILD=1` 跑才是完整强制核对（本地清理过产物时会 `[skip]` 深链路那项，属预期）。
4. 快照判断口径：`node scripts/verify-render.cjs` 必须在 `nuxi generate` **之后**跑（脚本默认复用 `.output/public`）。
   重建基线只有两种合法姿势：`--build --write-baseline`，或先 `nuxi generate` 再 `--write-baseline`；
   任何情况下**不要为了消红而重建基线**，先用 `--only <路由>` 看差异是不是真回归。
5. 本机 `--dump-dom` 输出 0 字节（见步骤 4 备注 7），脚本走 CDP；CI 上用 `JPLINGO_EDGE` 指向 chromium。
