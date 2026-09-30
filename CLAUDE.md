# jplingo（日语学习 App）

Nuxt 3 日语学习应用：连词成句 + 语法词典 + 答题练习 + 离线安卓 App。自托管后端 api.jplingo.cn，GitHub 仓库 oklspko/jplingo。

## 必须保持的两条核心逻辑
1. **句子生长（jp-growing）词先句后 + 一课一句话**：写句子前先练该句用到的、尚未单练过的内容词（按句中出现顺序），已练词不重复单练，助词只随句子出现不单练，孤词最后学。实现在 `app/composables/jp/useJpCourses.ts` 的 `buildGrowingOrder`。**课程形态**：一课只围绕一句话，从「主谓短句」逐词添加、生长成至少 20 个词汇的大长句——中间每一步都是一句语法成立、且是前一句扩充的句子；长句动词须保持原形（不能用 て形/ます形，否则 token 匹配不上），句子里的内容词 `tokens[].text` 必须与单词的 `japanese` 完全一致，助词（を/で/は/に/と/の/な/へ 等）只作句内 token、不设独立单词。更新/新增课程必须保持此原则。
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
