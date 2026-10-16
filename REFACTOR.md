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
| 6 公共工具层 | ☑ | `2aa6751`（字节格式化）+ `01bc1cb`（本地日期键）+ `3109fc5`（Set 切换 + 假名平移） | 见本表下方「步骤 6 执行记录」：4 个工具函数收口 13 处重复实现，**+95 / −64（净减 31 行）**；两条护栏全绿（9 条路由无差异 + 277 项断言 0 失败，退出码均 0） |
| 7 拆 jp-me | ◐ | `14f6d4d`/`e4846ac`/`5300993`/`fc0d7e2`/`1161c80` | **逻辑部分完成**：script 282 → 88 行，抽出 5 个 `useJpMe*` composable（417 行）；template(1–341) 与 style(625–1540) **逐字节未动**（style 哈希 `7f8c4d74642e7e75` 双方吻合）。两条护栏独立复跑全绿：9 路由无差异 + 278 项 0 失败。**未达成「单文件 ≤300 行」**（页面仍 1346 行 = template 341 + script 88 + style 916）→ 需步骤 7b 拆卡片组件 |
| 8 拆 jp-home | ☑ | `b7c206e`（课程与元数据）+ `231afb0`（Packs 抢救 + 模板护栏）+ `05ff7b3`（其余四组 + 残留清理） | **逻辑抽取完成**：抽出 6 个 `useJpHome*` composable（421 行），页面 1630 → 1434 行；template 与 style 一字未改。三条护栏编排方亲跑全绿：`check-template-bindings` 0 可疑、9 路由渲染快照无差异、自测 **280 项** 0 失败。过程中抓到并修掉两个真问题（详见「步骤 8 执行记录」）|
| 9 拆 jp-editor | ☑ | `9049b1e` | **逻辑抽取完成**：抽出 5 个 `useJpEditor*` composable（520 行），页面 1614 → 1193 行；template/style 一字未改。编排方代码级等价核对 20 个函数：**17 个逐行一致**，2 处仅「依赖注入改名」（`course.value` → `deps.course.value`），`copyPrompt` 留页面（14 行与原版逐行一致）。护栏全绿：模板标识符 0 可疑、9 路由快照无差异（`/jp-editor/` 728 行可见文本）、282 项断言 0 失败 |
| 10 数据与展示分离 | ☑ | `af9d711`（10a 助词/敬语）+ `b830cb5`（10b 其余三个 + 生成器不再解析 .vue） | **数据全部移出组件**：新增 `app/data/jp-particles.ts`(635)/`jp-keigo.ts`(468)/`jp-grammar-tables.ts`(81)，组件侧改为别名 import（变量名不变 → 兜底那行无需改）。行数：JpParticles **830→207**、JpKeigo **684→228**、JpPredicateSentences 340→321、JpVerbGuide 432→400、JpGrammarGuide 514→506。**最强等价证明**：重新生成的 `grammar-reference.json`(43,516B) 与 `grammar-points.json`(749,648B) 与已提交版本**逐字节一致**（sha256 相同）。另：9 路由快照无差异、282 项断言 0 失败、模板标识符 0 可疑、五组件接线检查通过 |
| 11 类型集中 | ☑ | `789d3ff` | **先扫后改**：全 app/ 共 48 个类型声明/26 文件，重名的 3 个实为 import、真正形状重复只有 `GrammarExample`/`KeigoExample` → 说明**类型集中本已存在**（`app/types/jp.ts` 早是域模型中枢）。本步只做两件真事：① 命名统一，修掉步骤 6 引入的畸形别名（`bundledgroups`→`bundledGroups` 等 10 个名字、22 处），检查器同步改成 camelCase 拼接并做反向验证；② 合并重复例句类型为 `JpBilingualExample`。验证：JSON 逐字节一致（类型被擦除）、9 路由快照无差异、282 断言 0 失败、模板标识符 0 可疑 |
| 12 句子生长等价重构 | ☐ | | |
| 13 输入状态机等价重构 | ☐ | | |
| 14 数据热更新等价重构 | ☐ | | |
| 15 发音链等价重构 | ☐ | | |
| 16 性能优化（可选） | ☐ | | |
| 17 全量 diff 复查 | ☐ | | |
| 18 端到端验证 | ☐ | | |
| 19 收口与发版 | ☐ | | |

---

## 步骤 6 执行记录（2026-10-15 实测于 `refactor/structure-safety-net`）

**范围**：只抽「grep 能数出 ≥2～5 处、且语义逐字一致」的代码，全部落在 `app/utils/`（沿用 `jpxxx.ts` 命名）。
`useJpSound` / `useJpTts` / `useJpInput` / `useJpCourses` / `useJpData*` 的**行为一行未改**——
唯一涉及的 `useJpRomaji` 也只被「复用其已导出的纯函数」，实现本身没动。

### 抽取前的 grep 统计（依据）

| # | 重复片段 | 出现处 | 次数 |
|---|---|---|---|
| 1 | `GB/MB/KB` 分档 + `toFixed` 的字节格式化 | `app/utils/jpDataPack.ts:141`、`app/pages/release/index.vue:111` | 2 |
| 2 | `getFullYear/getMonth+1/getDate + padStart(2,"0")` 拼 `YYYY-MM-DD` | `useJpStorage.ts:36`、`:243`、`:255`、`JpCheckinCalendar.vue:46/52`、`:64` | 5 |
| 3 | 拷贝 `Set` → `has` 判定 → `add/delete` → 整体赋值 | `jp-record/index.vue:336/343/350`、`jp-home/index.vue:384` | 4 |
| 4 | 片假名（ァ～ヶ）→ 平假名，码点平移 `0x60` | `jp-grammar/index.vue:185`、`useJpRomaji.ts:185` `katakanaToHiragana` | 2 |

第 1 项的「看似不同」已逐个分支核对：两处差异只在 `bytes < 1024` 分档，而
`release/index.vue` 的唯一调用点有 `if (!apkSizeBytes.value) return "…"` 前置守卫，
可达输入只有 `0`（提前返回）与 `> 1024`（两分支同值）→ 所有可达输入逐字一致。

### 结果

| 提交 | 内容 | 新增工具 | 行数 |
|---|---|---|---|
| `2aa6751` | 字节格式化 | `app/utils/jpFormat.ts`（`formatBytes`） | +24 / −18（7 文件） |
| `01bc1cb` | 本地日期键 | `app/utils/jpDate.ts`（`dayKey` / `todayKey` / `dayKeyOffset`） | +41 / −22（3 文件） |
| `3109fc5` | Set 切换 + 假名平移 | `app/utils/jpCollection.ts`（`toggleSet`） | +30 / −24（4 文件） |
| | **合计** | 4 个工具函数 | app/ 内 **+91 / −63（净 +28 行）** |

> **行数口径要如实记**：调用点净减 **−29 行**（25 增 / 54 删），但新增 3 个工具文件带来 **+57 行**（含函数注释），
> 所以 app/ 总行数从基线 **54 文件 / 19,146 行（含空行）· 17,149（非空行）**
> 变为 **57 文件 / 19,174 · 17,175**（净 +28 / +26）。
> 步骤 6 的目标是**消除重复**（4 处 × 2～5 遍 → 各 1 处），不是压缩总行数；重复确实消失了，总行数因新文件与注释略增，
> 这是符合预期的。后续步骤（7–9 拆巨型页面）才应看到总行数明显下降。

> 抽取中**没有改任何可见文案**，因此**不需要** `--write-baseline`；基线文件本次零改动。

### 验证证据

```bash
cd D:/my-project/jplingo
node scripts/verify-render.cjs --build
#   合计 9 条路由，无差异        （9 条全部 [ok]，退出码 0，含 jp-home/jp-editor/jp-me 三个巨型页面）
JPLINGO_EXPECT_BUILD=1 node tests/offline-tts/run.cjs
#   55+34+10+7+20+14+62+23+42+10 = 277 项断言，失败 0 项，退出码 0
```

日期抽取另用一次性脚本 `node .tmp-date-equivalence.mjs` 做**新旧逐字对照**（跑完即删，未入库）：

```
  [ok] todayKey == 旧 todayStr
  [ok] dayKeyOffset(-1) == 旧 yesterday
  [ok] 日历单元格 420 个月逐格一致     （1990-2035 每月每天，0 处不同）
  [ok] streak 前一天递推 400 天一致
  合计 4 项，失败 0 项
```

### 备注（本次新增的坑与口径）

7. **自测项数应以实跑为准：277，不是 278。** 逐条数各 spec 的 `[ok]` 行与各 `合计` 行相加都是
   **277**（55+34+10+7+20+14+62+23+42+10），本次改动前后一致。步骤 1/3/5 记录里的「278」来自
   更早的统计口径（`spec-grammar-wiring.ts` 只打印标题行、其 1 项断言靠
   `script(check-grammar-wiring)` 的返回值体现，容易被重复计数）。**判断回归看「失败 0 项 + 退出码 0」，不要盯总数。**
8. **别用 PowerShell 直接改带中文的文件**：`Set-Content -Encoding UTF8` 会**加 BOM**
   （`EF BB BF`），`git diff` 会把首行整行报成改动。清理姿势：
   `[System.IO.File]::WriteAllText($p, $txt, (New-Object System.Text.UTF8Encoding($false)))`。
   本项目 `app/**` 未声明 `eol=lf`，本机 `core.autocrlf=true` 下 `git add` 会有
   「LF will be replaced by CRLF」警告——**属既有配置、不是本次引入**（`.gitattributes` 只覆盖
   `tests/render-baseline/**` 与 `public/{courses,dict,data}/**`）。
9. **抽 `formatBytes` 时不要留 `export { formatBytes } from "~/utils/jpDataPack"` 这种 re-export**：
   `release/index.vue` 是公开页，经 `jpDataPack` 转手会把整个数据热更新模块（含 crypto/清单逻辑）
   拉进该页 chunk；改直连 import 更干净。同理，给 `tests/offline-tts/run.cjs` 的 `alias` 补新路径是
   **harness 必需**（它只映射显式列出的 `~/...`），漏了会在 `spec-datapack` 打包期报
   `ERR_MODULE_NOT_FOUND`。

---


## 步骤 8 执行记录（2026-10-16）与「代理不可信、必须验收」的教训

**结果**：`jp-home/index.vue` 的脚本逻辑抽成 6 个 composable（421 行），页面 1630 → 1434 行，template/style 一字未改。
三条护栏全绿（`check-template-bindings` 0 可疑 / 9 路由快照无差异 / 280 项断言 0 失败）。

| composable | 行数 | 内容 |
|---|---|---|
| `useJpHomeCourses.ts` | 107 | coursePacks / courseIndex / loadAll / loadPackMeta / mapConcurrent / getCourseTitle / courseMetaText / courseTitleOf |
| `useJpHomeImport.ts` | 86 | 导入弹窗（URL / 文件）与删除课程包 |
| `useJpHomeManage.ts` | 82 | 分组管理：重命名/移动/排序/删除课程、重命名/新建文件夹 |
| `useJpHomeUiState.ts` | 70 | 折叠状态、三处「⋯」菜单、`closeAllMenus()` |
| `useJpHomeTip.ts` | 40 | 新手提示条与「不再显示」本地记忆 |
| `useJpHomePacks.ts` | 36 | 词汇包收纳、分类派生、已导入文件夹 |

单一数据源设计：`expandedPacks` / `tipConfirmOpen` 由页面各建一份、同一个 ref 注入相关 composable；
`loadPackMeta` / `loadAll` / `courseTitleOf` 依赖注入（避免 composable 互相循环依赖）；`packTitles` 用 getter 而非快照。

### ⚠️ 两个「代理留下的真问题」（都由编排方验收时抓到，说明护栏有效）

1. **模板漏 import**（构建抓不到）：`isVocabPack` 被移进 composable 后页面删掉了 import，
   但模板里还有两处 `v-if="isVocabPack(pack.id)"` → 运行时 undefined，**vite 构建全绿**。
   → 修复：恢复 import 并加注释；**并新增通用护栏 `scripts/check-template-bindings.mjs`**（编译模板，凡出现 `_ctx.xxx` 即报错），
   已接入自测。反向验证：注释掉该 import → 精确报出；全项目 27 个文件扫描 0 可疑。
2. **抽取残留**：页面 `onMounted` 里还留着新手提示的 localStorage 判断（已移进 `useJpHomeTip`），两处都跑。
   幂等所以不改行为，但属没抽干净 → 已删除页面那三行并注明归属。

### 教训：执行代理不可信，验收必须靠护栏 + 人工

本步先后用了两个子代理：**第一个中途失败（无收尾消息）**、**第二个卡死**（0 个 node 进程却残留 155 个 headless 浏览器，6.5 分钟无文件变动）。
两次都是编排方从半成品里接手：先查自洽性（模板标识符、悬空引用）→ 跑三条护栏 → 清理残留 → 提交。
**结论：步骤 9 起，每个子代理交付后必须先跑 `check-template-bindings.mjs` + 渲染快照 + 自测，再人工抽查 diff，才允许提交。**

### 第三个问题：CI 红灯（属步骤 3 同类坑的复现）

推分支后 CI 报 `Cannot find module '@vue/compiler-sfc'` —— 新写的 `check-template-bindings.mjs` 依赖它，
而它只是 Nuxt/Vue 的**传递依赖**：本机 `node_modules` 是扁平（npm 式）布局能解析，CI 的 pnpm 隔离链接下解析不到。
（步骤 3 的 esbuild 就是这么翻车的，**同一个坑踩了两次**。）

- 修复：把 `@vue/compiler-sfc@3.5.42`（与 lockfile 已解析版本一致）加进 `devDependencies`；
  lockfile 改动经核对良性（只多该包 importer 声明 + pnpm 规范了一条 ioredis peer 签名，**无版本升级**）。
- **新增护栏 `tests/offline-tts/spec-explicit-deps.ts`**：扫描 `scripts/` 与 `tests/` 里的裸包引用，
  凡不在 `package.json` 的 deps/devDeps 中即报错（排除 Node 内建、相对路径、`~` 别名、注释内示例）。
  反向验证：临时移除 `@vue/compiler-sfc` → 精确报出 1 处、无误报。
- 自测现共 **282 项断言**；CI（`tests` workflow）已绿。

---

## 步骤 7 执行记录（2026-10-15）与 7b 交接点

**先纠正一个统计口径**：`jp-me/index.vue` 拆分前的真实构成是 **template 341 + script 282 + style 916 = 1539 行**（不是我最初报告的「script 约 1200 行」——那是我误把 SFC 里第一个 `</template>`（嵌套模板）当成模板结束位置导致的误读）。

### 已完成：逻辑抽到 composables（template / style 一字未动）

| 提交 | composable | 抽出内容 | 行数 |
|---|---|---|---|
| `14f6d4d` | `useJpMeStats.ts` | streak / todayMinutes / totalDuration / showResetModal / confirmReset / doReset | 42 |
| `e4846ac` | `useJpMeTts.ts` | 离线发音：标题·描述·配色·进度文案 / 试听·下载·删除 / 语者·步数切换 | 166 |
| `5300993` | `useJpMeDataUpdate.ts` | 课程数据：版本行·进度·卡片配色 / 立即更新·恢复内置 | 114 |
| `fc0d7e2` | `useJpMeUpdate.ts` | App 更新：检查更新 / 立即更新 | 51 |
| `1161c80` | `useJpMeAccount.ts` | 账号：user / 退出登录 / 立即同步 / syncing / syncMsg | 44 |

结果：**script 282 → 88 行**，页面 1539 → 1346 行；`git diff --stat 49aff75..HEAD` = 6 files, +482 / −259。

**独立复核（编排方亲自做，不采信执行者自述）**：
- `git diff -U0` 的全部 hunk 都落在旧行 344–448（script 段）→ template(1–341)、style(625–1540) 无任何 +/− ✓
- style 段 sha256 前后一致 `7f8c4d74642e7e75` ✓；template 段一致 ✓
- 两条护栏**由编排方重跑**：`verify-render.cjs --build` = 9/9 无差异（exit 0）；`JPLINGO_EXPECT_BUILD=1 run.cjs` = 278 项 0 失败（exit 0）✓

**执行者主动上报、留待 Pro 复核的点**：
1. 为保持「先 `checkUpdate()` 再 `refreshTtsStatus()`」的原挂载顺序，页面把 `useJpMeUpdate(appVersion)` 挪到 `useJpMeTts()` 之前（两者不共享状态；中间提交里顺序还是反的，只有最终 `1161c80` 与原顺序一致）。
2. `showResetModal` 由页面本地 `ref` 变为 composable 返回后解构（SETUP_REF → SETUP_MAYBE_REF）——执行者用 `@vue/compiler-sfc` 实证写入仍编译为 `.value = false`、读取为 `_unref(...)`；**这类改动渲染快照抓不到，需要 Pro 看源码 diff 确认**。
3. 单一数据源：`record/resetRecord/syncNow` 只由页面调一次 `useJpStorage()` 再注入两个 composable（若各自再调一次会新建 record ref，「立即同步」就会与页面显示分家）——这条约束已满足，但**后续步骤不要破坏它**。

### 交接点：步骤 7b（未做）

页面的 1346 行里 **style 占 916 行（68%）**，template 341 行。要达成步骤 7 的「单文件 ≤ 300 行」，必须把每张卡片拆成
`app/components/jp/JpMe*Card.vue`（**template + 对应 style 一起搬走**），页面只留编排。
风险与护栏：CSS 搬到子组件（`scoped` 保持）→ 渲染快照比对可见文本仍有效，但**样式层变化快照抓不到**，
所以 7b 必须人工看「有没有元素被漏搬 / 样式作用域变化」，建议 7b 做完先由 Pro 审 diff 再合并。

---

## 步骤 11 Pro 审查记录（2026-10-16，deepseek-v4-pro）

**结论：可接受。** 纯改名 + 纯类型合并，无运行时字符串变动。

| 核对点 | 结论 |
|---|---|
| 改名 | `bundled<小写>` → `bundled<Upper>` 仅发生在 5 个组件的 import 别名与 computed 兜底表达式里，语义未变；检查器 `check-grammar-wiring.mjs` 同步按 camelCase 拼名，反测（注释 import → 报错）通过 |
| 类型合并 | `GrammarExample`/`KeigoExample` → `app/types/jp.ts` 的 `JpBilingualExample`（形状 `{jp,zh}` 一致、grep 确认无外部引用、用 `import type` 引入会被擦除） |
| 运行时字符串 | 逐行 grep 无 localStorage key / 路由名 / `jp-data/_applied.json` / 插件名 `JpTts` 的改动 |
| 生成物 | `grammar-reference.json` / `grammar-points.json` 与改动前逐字节一致（类型被擦除） |

---

## 步骤 10 Pro 审查记录（2026-10-16，deepseek-v4-pro）

**结论：可接受（含一处已修复的护栏回归）。**

| 核对点 | 结论 |
|---|---|
| 最强等价证据 | 独立重跑 `gen-content-json.cjs`，`grammar-reference.json`(43,516B) / `grammar-points.json`(749,648B) 与改动前（222d9ee）**逐字节一致**（sha256 `84d09c07…` / `0674a173…`）✓ |
| 改动范围 | 仅 5 个组件 + 3 个新 `app/data/*.ts` + 3 个脚本/测试，**未误碰** `useJpExport` / `useJpCourses` / `useJpData` ✓ |
| 组件接线 | 5 个组件均改为别名 import（`particleGroups as bundledgroups` 等），组件内变量名与兜底表达式（`?? bundledgroups`）逐字未变 ✓ |
| 生成器重构 | `gen-content-json.cjs` 改为 import 数据模块、`extractBlocks()` 删除；`reference` 的键名与顺序（predicates/verbGuide/guide/particles/keigo）未变 ✓ |

**审查中发现并修复的一个护栏回归（重要）**：
步骤 10 改 `check-grammar-wiring.mjs` 时，把「缺 import」判定弄成了 `l.includes(IMPORT)` 子串匹配——
把 import 注释成 `// import { useJpGrammarContent }…` 后该行**仍包含**这个子串 → 检查失效，反测抓不到「缺 import」。
已修为 `l.trim().startsWith(...)` 行首锚定，并对 bundled import 同样收紧。三向反测全过：
注释 useJpGrammarContent import → 报「运行时会 500」；注释 bundled import → 报「找不到内置兜底数据」；正常 → 通过。

> 备注（假红灯，非回归）：审阅中途一次 `JPLINGO_EXPECT_BUILD=1` 自测报了 1 失败，是 `git clean -fdq dist`
> 删了构建产物导致「深链路目录已生成」找不到目录；重建后 10/10 通过、exit 0。

---

## 步骤 9 Pro 审查记录（2026-10-16，deepseek-v4-pro）

**结论：可接受。** 5 个 composable 为逐字搬移，单一数据源 / 生命周期 / 监听清理 / 导出字段顺序均保持。

| 核对点 | 证据 |
|---|---|
| 单一数据源 | `course` 由页面建一份（L367）注入全部 5 个 composable；`packs`/`courseOptions`/`selectedKey`/`groupOpen` 归 picker 持有，注入 create/import；页面无第二处 `fetchCoursePacks()`/`fetchCourse()` |
| 挂载顺序 | `useJpEditorStatements`（内部注册 tokenizer 的 onMounted）先于 `useJpEditorPicker`（`onMounted(loadCourseOptions)`）调用 → 与拆分前同序（页面注释已写明） |
| 监听清理 | `onMounted(addEventListener)` + `onBeforeUnmount(removeEventListener)` 与拆分前（49aff75 L449–450）完全一致，**不是新增的泄漏修复** |
| 导出字段顺序 | `useJpEditorExport` 只做薄封装，JSON 组装全在 `useJpExport`（该文件**未改动**）→ 字段顺序/格式天然保持 |
| 课程切换重置 | `selectCourse → loadSelectedCourse → loadCourse`（fetchCourse + catch→alert+`course=null`）；`loadCourseOptions → refreshCourseOptions`（拉包重建选项、无自动选中副作用）均原样 |
| 代码级等价 | 20 个函数：17 个逐行一致、2 个仅 `course.value`→`deps.course.value`（依赖注入改名）、`copyPrompt` 留页面（14 行逐行一致）；`nextTick` 原在 `createCourse` 内、随函数搬走，页面无残留 import |
| 改动范围 | `git diff --stat` 仅 5 个新 composable + `jp-editor/index.vue`，未误碰 `useJpExport`/`useJpTokenizer` 等 |

---

## 步骤 8 Pro 审查记录（2026-10-16，deepseek-v4-pro）

**结论：可接受。** 6 个 composable 均为逐字搬移，单一数据源 / 异步时序 / 事件处理均未变；两处已修的已知问题修得正确。

| 核对点 | 证据 |
|---|---|
| `mapConcurrent` / `loadPackMeta` / `loadAll` / `getCourseTitle` / `courseMetaText` / `courseTitleOf` | 与拆分前（49aff75）**逐字一致**（含 `META_CONCURRENCY=6`、worker 循环、`loadPackMeta` 的 `finally` 清理、`loadAll` 的「先 sort 后按需加载已展开包」顺序） |
| `useJpHomeImport` / `useJpHomeManage` / `useJpHomeTip` / `useJpHomeUiState` / `useJpHomePacks` | prompt/confirm 文案、错误兜底、localStorage key（`jp-beginner-tip-dismissed`）逐字一致 |
| 单一数据源 | `expandedPacks`/`tipConfirmOpen` 各由页面建一份、以 ref 注入；`loadAll`/`loadPackMeta`/`courseTitleOf` 依赖注入；`packTitles` 用 getter（`() => coursePacks.value…`）读最新值而非快照；无第二处 `fetchCoursePacks()` |
| 异步时序 | `doImportUrl`/`doImportFile`/`removePack`/`renameCourse`/`sortPackByName`/`moveCourseTo`/`deleteCourse`/`renamePack`/`createFolder` 均 `await loadAll()`；`togglePack` 展开时 `onToggleExpand`(=loadPackMeta) 不 await，与拆分前一致 |
| 事件处理 | `document click → closeAllMenus`（onMounted 注册 + onUnmounted 移除）；`closeAllMenus` 清三个菜单 id + `tipConfirmOpen`（共享 ref）；菜单 toggle 逻辑（`=== id ? "" : id`）不变 |
| 已知修复 | ① `isVocabPack` 已恢复 import（模板 L93/L182 仍用）；② 页面 onMounted 里重复的 localStorage 判断已删（归 `useJpHomeTip` 所有） |

**一处无影响的顺序变化**（如实记录）：原页面 onMounted 顺序是「loadAll → (addEventListener + localStorage 判断)」，
现在因为 `useJpHomeTip` 在 setup 阶段先注册了它的 onMounted，localStorage 判断**先于** loadAll 执行。
三者互相独立（提示条显隐、课程数据加载、点击监听之间无依赖），且同步 setup 阶段不可能发生点击，故无可观察影响。

---

## 步骤 7 Pro 审查记录（2026-10-16，deepseek-v4-pro）

**结论：可接受。** 逐项核实如下（重点三处风险点，均为代码级证据，非仅快照）：

1. **挂载顺序** ✓：拆分前 `onMounted(() => { checkUpdate(); refreshTtsStatus(); })`；拆分后 `useJpMeUpdate`（onMounted→checkUpdate）在 `useJpMeTts`（onMounted→refreshTtsStatus）**之前**调用，Vue 按注册顺序执行 onMounted → 顺序不变。
2. **`showResetModal` 解构 ref 的模板赋值** ✓：用 `@vue/compiler-sfc` 对比编译产物——拆分前 binding 为 `setup-ref`、拆分后为 `setup-maybe-ref`，但**两者的 `@click.self` / 「取消」生成的赋值表达式逐字一致**（都是 `$setup.showResetModal = false`，走 setup 代理；`proxyRefs` 的 set 会写入 `.value`）。`_cache[14]` vs `_cache[1]` 只是缓存槽位号。→ 解构 ref 前后写入语义零变化。
   > 订正执行者一句话：执行者说「编译为 `showResetModal.value = false`」不精确——实际是 `$setup.showResetModal = false`（与拆分前完全相同），结论不变。
3. **单一数据源** ✓：`useJpStorage` / `useJpAuth` / `useJpTts` / `useJpDataUpdate` / `useJpUpdate` 各自**只被调用一次**；`record/resetRecord/syncNow` 由页面调用一次 `useJpStorage()` 后作为参数注入 `useJpMeStats` / `useJpMeAccount`，二者内部不再调用 `useJpStorage()`。无第二份状态。
4. **逐行等价** ✓：抽查 `ttsTitle` / `ttsDesc` / `ttsProgressWidth` / `ttsCardClass` 与拆分前**逐字一致**；其余块由执行者的 26 块比对 + 两条护栏（9 路由无差异 + 278 项 0 失败，编排方已重跑）兜底。
5. **文案/默认值/进度条/静默检查语义** ✓：`dataSupported = computed(() => Capacitor.isNativePlatform())` 原样；`useJpMeDataUpdate` 无 `onMounted`（静默检查仍在 `app/plugins/jp-data-update.client.ts`）；`dataProgressWidth` 的 `35%/0%`、TTS 的「约 145MB/123MB」等逐字未改。

---

## 步骤 6 Pro 审查记录（2026-10-15，deepseek-v4-pro）

**结论：可接受。** 四个抽取均与重构前语义等价；三个观察点都不可达或有益，不构成回退理由。

| 核对点 | 结论 |
|---|---|
| `formatBytes` 定义（jpFormat.ts vs jpDataPack.ts 旧版） | 逐字一致 ✓（`!bytes \|\| bytes<0 → 0 KB`、GB/MB/KB/B 四档、`toFixed` 位数全部相同） |
| `dayKey` / `todayKey` / `dayKeyOffset`（vs useJpStorage 的 todayStr/昨天 IIFE/循环、JpCheckinCalendar 的 pad/toStr） | 逐字等价 ✓（都读本地时间字段；`dayKeyOffset(-1, new Date(current))` 与旧循环的 `setDate(getDate()-1)` 一致；`new Date(y, m, d)` 因 d 恒为合法日不触发跨月归一化） |
| `toggleSet`（vs jp-record 3 处 + jp-home 1 处的 5 行样板） | 等价 ✓；`jp-home` 的 `loadPackMeta` 副作用保留（旧在 else 分支调用、新在 toggle 后按 `has(packId)` 调用，都在「未展开→展开」时触发一次） |
| `useJpDataUpdate.ts` / `jp-me` / `release` / `spec-datapack` 的 formatBytes 来源 | 全部改从 `~/utils/jpFormat` 导入，无残留、无本地重定义 ✓（grep 复核过） |

三个如实记录的观察点（都「不可达」或「有益」）：

1. **`release/index.vue` 的 `<1KB` 分支语义变了**：旧内联版是 `Math.max(1, Math.round(bytes/1024)) KB`（最小显示 1 KB），
   共享版在 `<1024` 时显示 `N B`。但该调用点有 `if (!apkSizeBytes.value)` 前置守卫，真实 APK ~170MB，
   永远命中 `>=1MB` 分支 → 可达输入逐字一致。共享函数已不再有「最小 1KB」语义，后人复用注意即可。
2. **`jp-grammar` 的 `toHiragana` 改为复用 `katakanaToHiragana`**：转换范围**完全相同**（U+30A1–U+30F6，`-0x60`），
   额外多一步 `.replace(/゜/g, "ー")`（修复历史数据把长音 ー 错存成 ゜ 的 bug）。
   对「取首个假名判五段」的调用点不可达，且该修复有益。
   > 修正：上一轮交接点里写的「覆盖范围更宽（如 ヷ U+30F7）」是**错误**的，已删除——范围一致，差别只在 ゜→ー 修复。
3. 无。

---

## 交接点（2026-10-15 收工：步骤 1–6 完成，等 Pro 审步骤 6 的 diff）

**当前进度：步骤 1–6 全部完成并验证（阶段① 安全网 + 阶段② 第一步）。下一步 = 用 Pro 审步骤 6 的 diff，然后做步骤 7（拆 `jp-me`）。**

| 项 | 状态 |
|---|---|
| 分支 | `refactor/structure-safety-net`（已 push 到 origin；**`main` 未动**：仍 `1ac6d75`） |
| 本分支提交 | `5b15f0d` 基线 → `b785f2a` 口径+假红灯 → `472ebfe` 自测进 CI → `342026f` esbuild 显式依赖 → `09d1c42`/`943f926`/`d0b41bf` 快照脚本+CI job → `13230c7` 步骤 5 → `4b3d2b4` 排除环境相关字段 → `1f3b808` 阶段①记录 → 步骤 6：`2aa6751`/`01bc1cb`/`3109fc5`/`59613fb` |
| 线上/发布 | **没受影响**：`main` 未动，线上仍 1.2.38，Release 仍 v1.2.38 |
| 工作区 | 干净（`dist/` 构建噪声按规则还原，未提交） |
| CI | 该分支 `tests` workflow 绿（最近 `38746449348`）：`offline-tts`（278 断言）+ `render-snapshot`（9 路由） |
| 步骤 6 的独立验证 | 两条护栏实测绿：`verify-render.cjs --build` = 9/9 无差异；`JPLINGO_EXPECT_BUILD=1 run.cjs` = 278 项 0 失败。人工逐字核对 `formatBytes` 纯搬移、`loadPackMeta` 副作用保留 ✓ |

### 下次开工先做这两件事

1. **切 Pro 审步骤 6 的 diff**（阶段②约定：每步 diff 由 Pro 复核一次，只出结论、不改代码）：

```
审查分支 refactor/structure-safety-net 上 1f3b808..HEAD 的改动（步骤 6：抽公共工具层）。
逐文件看 diff，判断是否与重构前语义等价，特别注意：有没有改默认值/文案/副作用/边界处理。
重点核对 app/utils/jpFormat.ts、jpDate.ts、jpCollection.ts 与它们替换掉的旧实现；
以及 app/composables/jp/useJpDataUpdate.ts 的那 1 行改动（formatBytes 来源变了）。

（Pro 审查已于 2026-10-15 完成，结论「可接受」，详见下方「步骤 6 Pro 审查记录」。）
```

2. **然后做步骤 7（拆 `jp-me`，1341 行）**：执行仍用 Flash，做完跑两条护栏（都要绿）+ 提交，再切 Pro 审 diff。

**阶段① 的护栏（重构期间每次提交都该跑）**：

```bash
cd D:/my-project/jplingo
git switch refactor/structure-safety-net && git status --short   # 期望：干净
node scripts/verify-render.cjs --build                          # 9 条关键路由渲染快照对比
JPLINGO_EXPECT_BUILD=1 node tests/offline-tts/run.cjs           # 278 项断言（含构建产物核对）
```


**阶段② 起的分工（需要切换模型时先确认）**：步骤 6–11 由 **Flash 执行**，但**每一步的 diff 建议由 Pro 审查**——
判断「拆页面时有没有顺手改掉行为」，这是阶段②唯一的高风险点。执行前请决定：切到 Pro 同时执行+审查，或保持 Flash 执行、每步结束时切 Pro 审一次。

**续跑步骤 6 的入口**（先确认在分支上、工作区干净）：

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
