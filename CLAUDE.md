# jplingo（日语学习 App）

Nuxt 3 日语学习应用：连词成句 + 语法词典 + 答题练习 + 离线安卓 App。自托管后端 api.jplingo.cn，GitHub 仓库 oklspko/jplingo。

## 必须保持的两条核心逻辑
1. **句子生长（jp-growing）短句在前长句在后 + 词先句后 + 一课一句话**：句子按 **token 数升序**出题（同长度的保持数据原顺序，稳定排序），实现于 `buildGrowingOrder` 里对句子的排序；**词先句后**：写句子前先练该句用到的、尚未单练过的内容词（按句中出现顺序），已练词不重复单练，助词只随句子出现不单练，孤词最后学。**课程形态**：一课只围绕一句话，从「主谓短句」逐词添加、生长成至少 20 个词汇的大长句——中间每一步都是一句语法成立、且是前一句扩充的句子；句子里的内容词 `tokens[].text` 必须与单词的 `japanese` 完全一致——动词形式也要等于该动词单词的形式：原形课程全程原形，敬语课程就把动词单词直接设成ます/ました形（句子动词用ます形、单词却存食べる会导致 token 对不上、学习页/答案显示与 romaji 音频不一致），助词（を/で/は/に/と/の/な/へ 等）只作句内 token、不设独立单词。**课程文件里句子也按长度升序排列**（与运行时一致，便于阅读）。生成/校验用 `node scripts/build-grow.cjs --lesson 02|03 [--write]`（自带五条不变量 + 短句在前自检，重排已有课程时会比对内容一致性）。更新/新增课程必须保持以上原则。
2. **答题输入判定是状态机**：`app/composables/jp/useJpInput.ts`（对齐 `earthworm-main` 的 question.ts）。incorrect 只在提交时标记，禁止实时推导；输入层不拦截，空格只跳下一个空、最后一个空才触发提交。改判定时沿用 Input/Fix/Fix_Input 状态机，勿回退到派生 computed 推导 incorrect。

## 语法数据管道
- 数据 `app/data/jp-grammar-points.ts`；解析脚本在 `.tmp_docx/`（n45_extract → parse → analysis → gen）。
- 蓝宝书 docx 假名注音泄漏清洗：单汉字+纯平假名→丢后者；纯假名+相同下一段(≤4字)→丢后者；括号式/粘连式/前缀式靠 TEXT_FIX 白名单。
- 已知缺口：N4 源文件 1–21 号缺失；N1–N3 旧数据仍有注音未清理。

## 后端（自托管 Supabase）
- native postgres:15-alpine + GoTrue v2.132.3 + PostgREST + Caddy。
- search_path 必须不带引号：`ALTER ROLE postgres SET search_path TO auth, public`。
- 迁移 20221208132122 在 native postgres 必失败（uuid=text），手动 `INSERT INTO auth.schema_migrations (version) VALUES (...)` 跳过。
- CORS：GoTrue 自带 ACAO:*，Caddy 别再 header（会变 `*, *`）。
- 根治方向：重建时换官方 supabase/postgres 镜像。

## 构建
- 本机无 Android 工具链：APK 走 GitHub Actions `.github/workflows/build-apk.yml`（push main 产 artifact，打 v* 标签发 Release `jp-lingo.apk`）。本地别跑 gradlew。
- Web 侧验证：`npm run build` 或 `npx nuxi typecheck`。
- 注意 `dist/` 在本机是指向 `.output/public` 的 junction（且被 git 跟踪）：跑完本地构建会有几千个 dist 变更，**提交前别 `git add dist`**，`git checkout HEAD -- dist` + `git clean -fd dist` 还原即可（CI 用 `webDir: .output/public`，不吃 dist）。

## 离线日语 TTS（sherpa-onnx + Supertonic-3，安卓内置发音）
- **模型是内置的（v1.2.18 起）**：CI 把官方包解压成 7 个文件放进 `android/app/src/main/assets/tts-ja/`（约 145MB，`.gitignore` 里排除，不入库），
  App 首次启动调 `installFromAssets()` 一次性拷到 `filesDir/tts-ja`（不联网）。「我的」页那个 123MB 下载入口保留为兜底，装好就不显示。
  `isReady()` 的语义要记牢：**`ready` 只表示 filesDir 里现在就能用**（`initTts()` 只从 filesDir 读模型），`bundled` 只是提示前端去拷贝一次；
  早期把 ready 写成 `downloaded || bundled`，结果新装机报 ready=true 但文件还不在 → 每次合成必失败。
- **预生成音频不再进 APK**：CI 在 `cap sync` 之前 `rm -rf .output/public/audio`（讯飞 mp3，实测占 APK 71.8MB / 10625 个文件）。
  **仓库与网页端仍保留这些 mp3**（`public/audio/` 未删除），网页体验不变；APK 里 0 个音频文件，全靠内置引擎发音。
- 原生插件 `android/app/src/main/java/com/jplingo/app/JpTtsPlugin.java`（Capacitor 名 `JpTts`，`MainActivity` 注册）：
  `isReady` / `installFromAssets`（内置模型拷进 filesDir）/ `installModel`（解压用户下载的 .tar.bz2，兜底路径）/
  `prepare`（预热）/ `speak`（WAV 写到 `cacheDir/tts/<md5(text|sid|speed|steps)>.wav`，回传音频 `duration`）/ `release`。`initTts` 必须保持 `synchronized`。
- 运行时用官方 `sherpa-onnx-1.13.8.aar`（CI 下载 + sha256 校验；`android/app/build.gradle` 里走 flatDir `implementation(name:'sherpa-onnx', ext:'aar')`，
  **必须同时带 `kotlin-stdlib`**，否则运行时 `kotlin/jvm/internal/Intrinsics` 找不到）。v1.13.8 的 API 是 Kotlin setter 风格：
  `new OfflineTts(null, config)`（只有 `(AssetManager, OfflineTtsConfig)` 构造，传 null 走 `newFromFile`）、`setExtra(Map<String,String>)`、
  `generateWithConfig(text, gen)`；master 文档里的 builder / 单参构造 / `OfflineTtsCallback` 都是更新版本，别照抄。
- 模型 `sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2`（128,774,318 B ≈ 123MiB，GitHub Release `tts-models`）：
  `lang=ja`、语者 sid 0–9、采样率 44100（实测；官方文档页写的 24000 已过时）；7 个文件 = duration_predictor / text_encoder / vector_estimator / vocoder 的 `.int8.onnx` + `tts.json` + `unicode_indexer.bin` + `voice.bin`（按顶层目录整体解压，插件会剥掉包内第一层目录）。
- 前端：`app/composables/jp/useJpTts.ts`（插件桥接：内置模型拷贝优先、`@capacitor/filesystem` 原生下载为兜底——镜像优先/官方兜底、进度事件、大小校验 → `installModel`；合成结果按句缓存）；
  发音链在 `app/composables/jp/useJpSound.ts` 的 `speakJapanese`：**预生成音频 → 内置离线引擎 → 系统 TTS → 浏览器 TTS**（APK 里没有 mp3 了，实际是后三级）；
  UI 在「我的」页「离线发音」卡片（内置准备中 / 已就绪（APK 内置）/ 试听 / 语者·步数 / 兜底下载）。
- 兜底下载地址默认官方 Release，可用 `NUXT_TTS_MODEL_URL` 覆盖为自托管（如 `https://api.jplingo.cn/tts/...`，见 DEPLOY.md）。
- 排查：装 APK 后首启会自动把内置语音拷到应用目录（「我的 → 离线发音」会显示「正在准备内置语音…」，需约 170MB 空闲）；装完点「试听」；无声先看该卡片的状态/报错。
- 自测（改发音链或课程顺序后必跑）：`node tests/offline-tts/run.cjs` —— 用 esbuild 把 `tests/offline-tts/` 下的 spec 与 mock 的 Capacitor 插件打包后在 Node 里跑，
  共 154 项断言：`spec`（下载/解压/缓存/并发/状态自愈）、`spec-sound`（四级发音回退）、`spec-bundled` 与 `spec-bundled-fail`（内置模型拷贝成功/失败）、
  `spec-viewport`（强制移动端布局）、`spec-preload`（学习页按序预加载）、`spec-growing`（**短句在前长句在后 + 五条不变量**，直接读 `public/courses/jp-growing/*.json` 校验真实课程）（不进 CI）。
- 音质与延迟实测（2026-10-01，本机桌面，`scripts/tts-quality-poc.py` 可复现）：采样率 **44100**（文档写的 24000 已过时）、语者 10 个；
  26 字句音频 3.79s / 合成 1.46s（RTF 0.38）；App 里最长的 66 字句音频 11.17s / 合成 3.56s（RTF 0.32，steps=6→2.78s，steps=4→2.00s）。
  → 手机 CPU 更慢，所以切题时会预合成下一句（`prefetchJapanese`），发音按钮在合成期间显示「🔊 合成中…」；
  「我的」页会显示「上次合成：N 字 / X 秒」（`useJpTts` 的 `lastSynth`）——这是真机上唯一能拿到的性能数据，调 num_steps 就靠它。
- APK 级已验证（不用真机就能查的几件事）：
  - 4 个 arm64 `.so` 的 ELF `p_align=16384` 且 zip 偏移 16KB 对齐（`extractNativeLibs` 已显式设置）→ targetSdk 36 的 **16KB 页设备**不会 dlopen 失败；复查工具：`python tests/offline-tts/check-16kb.py <apk>`。
  - 清单里有 `INTERNET` 权限（二进制 `AndroidManifest.xml` 字符串是 **UTF-16LE** 编码，用 ASCII 搜会被误判为「没有」）。
  - Capacitor 的 `PluginCall.resolve/reject` 在**工作线程**调用是安全的：`MessageHandler.sendResponseMessage` 内部 `webView.post(() -> evaluateJavascript(...))` 会回到 UI 线程，所以插件在 `new Thread` 里 resolve 无需自己切线程。
  - 自动播放不会被拦：Capacitor 的 `Bridge` 里设了 `settings.setMediaPlaybackRequiresUserGesture(false)`，所以「合成几秒后再 `play()`」不会因为脱离用户手势窗口而失败。
  - `convertFileSrc` 能播 cacheDir 里的 WAV：`AndroidProtocolHandler.openFile` 只做路径拼接（无目录白名单），且 `WebViewLocalServer.handleLocalRequest` 支持 `Range`（回 206 + `Accept-Ranges`）与按扩展名给 mime。
- 诊断链路（真机上报就靠这几个数）：`useJpTts` 记录 `lastPrepare`（模型加载）/`lastSynth{text, ms, audioSeconds}`（合成耗时与音频时长，原生 `speak` 回传 `duration`），
  `formatSynthInfo()` 拼成「上次合成：N 字 / X 秒 → 音频 Y 秒（RTF Z）」显示在「我的」页；原生侧 0 采样会直接 reject，避免写入几十字节的哑 WAV 被当成「播了但没声」。
- 两条踩过的坑，改代码时别回退：
  1. `isReady()` 探测失败**不能缓存**（早期实现缓存了 `statusPromise` 并把 `supported` 置 false）——桥瞬时异常会让整场会话判定「不支持」，
     「我的」页连下载按钮都不显示，用户永远装不上模型；现在失败即清空缓存 + `statusChecked=false`，下次自动重探。
  2. `@capacitor/filesystem` 的安卓 `downloadFile` **不校验 content-length**（读多少写多少，被截断也算成功），
     所以前端必须把 `stat` 出来的字节数与官方大小（128,774,318）严格比对，不够就换下一个镜像。
  3. 原生 `speak()` 必须**串行 + 同句去重**（同一 OfflineTts 实例并发不安全，两个线程写同一个 md5 输出文件也会互相破坏）；
     `speakJapanese` 用序号作废过期回退，否则 mp3 播放失败时「error 事件 + play() 拒绝」会把同一句合成两遍。
