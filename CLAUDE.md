# jplingo（日语学习 App）

Nuxt 3 日语学习应用：连词成句 + 语法词典 + 答题练习 + 离线安卓 App。自托管后端 api.jplingo.cn，GitHub 仓库 oklspko/jplingo。

## 必须保持的两条核心逻辑
1. **句子生长（jp-growing）词先句后 + 一课一句话**：写句子前先练该句用到的、尚未单练过的内容词（按句中出现顺序），已练词不重复单练，助词只随句子出现不单练，孤词最后学。实现在 `app/composables/jp/useJpCourses.ts` 的 `buildGrowingOrder`。**课程形态**：一课只围绕一句话，从「主谓短句」逐词添加、生长成至少 20 个词汇的大长句——中间每一步都是一句语法成立、且是前一句扩充的句子；句子里的内容词 `tokens[].text` 必须与单词的 `japanese` 完全一致——动词形式也要等于该动词单词的形式：原形课程全程原形，敬语课程就把动词单词直接设成ます/ました形（句子动词用ます形、单词却存食べる会导致 token 对不上、学习页/答案显示与 romaji 音频不一致），助词（を/で/は/に/と/の/な/へ 等）只作句内 token、不设独立单词。更新/新增课程必须保持此原则。
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
- 原生插件 `android/app/src/main/java/com/jplingo/app/JpTtsPlugin.java`（Capacitor 名 `JpTts`，`MainActivity` 注册）：
  `isReady` / `installModel`（把 filesDir 下的 .tar.bz2 解压到 `filesDir/tts-ja`）/ `prepare`（预热）/ `speak`（合成 WAV 到 `cacheDir/tts/<md5(text|sid|speed)>.wav`）/ `release`。`initTts` 必须保持 `synchronized`。
- 运行时用官方 `sherpa-onnx-1.13.8.aar`（CI 下载 + sha256 校验；`android/app/build.gradle` 里走 flatDir `implementation(name:'sherpa-onnx', ext:'aar')`，
  **必须同时带 `kotlin-stdlib`**，否则运行时 `kotlin/jvm/internal/Intrinsics` 找不到）。v1.13.8 的 API 是 Kotlin setter 风格：
  `new OfflineTts(null, config)`（只有 `(AssetManager, OfflineTtsConfig)` 构造，传 null 走 `newFromFile`）、`setExtra(Map<String,String>)`、
  `generateWithConfig(text, gen)`；master 文档里的 builder / 单参构造 / `OfflineTtsCallback` 都是更新版本，别照抄。
- 模型 `sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2`（128,774,318 B ≈ 123MiB，GitHub Release `tts-models`）：
  `lang=ja`、语者 sid 0–9、24kHz；7 个文件 = duration_predictor / text_encoder / vector_estimator / vocoder 的 `.int8.onnx` + `tts.json` + `unicode_indexer.bin` + `voice.bin`（按顶层目录整体解压，插件会剥掉包内第一层目录）。
- 前端：`app/composables/jp/useJpTts.ts`（插件桥接 + `@capacitor/filesystem` 原生下载：镜像优先/官方兜底、进度事件、大小校验 → `installModel`；合成结果按句缓存）；
  发音链在 `app/composables/jp/useJpSound.ts` 的 `speakJapanese`：**预生成音频 → 内置离线引擎 → 系统 TTS → 浏览器 TTS**；
  UI 在「我的」页「离线发音」卡片（下载进度 / 试听 / 删除）。
- 模型地址默认官方 Release，可用 `NUXT_TTS_MODEL_URL` 覆盖为自托管（如 `https://api.jplingo.cn/tts/...`，大陆下载更快）。
- 排查：手机装 APK 后进「我的 → 离线发音 → 下载离线语音（约123MB，建议 WiFi）」，装完点「试听」；无声先看该卡片的状态/报错。
