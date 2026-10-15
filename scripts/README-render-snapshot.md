# scripts/ 里两件与「渲染快照」有关的工具（REFACTOR.md 步骤 4）

## `scripts/serve-static.cjs` — 极简本地静态服务

给渲染快照脚本提供 `http://127.0.0.1:<port>` 的站点（**必须走 http**：SPA 的 ES module
在 `file://` 下会被 CORS 拦掉，页面根本不会渲染）。

- 目录/后缀回退：`/jp-home` → `/jp-home/index.html` → `/jp-home.html`
- **SPA 回退**：找不到文件时返回 `200.html`（Nuxt 的 SPA 外壳）且状态码是 200。
  非 200 时浏览器不会执行前端路由，深链路快照就没意义了。
- 只读、无依赖、端口可配：
  ```bash
  node scripts/serve-static.cjs --port 4180 --root .output/public
  ```
  默认 `4180`；被占用时换端口（`verify-render.cjs` 会在 4180–4199 里自动找空位）。

## `scripts/verify-render.cjs` — 渲染快照对比

```bash
node scripts/verify-render.cjs --build            # 先 nuxi generate，再对比（最完整）
node scripts/verify-render.cjs                    # 复用现有 .output/public，直接对比
node scripts/verify-render.cjs --write-baseline   # 重建基线（会写 tests/render-baseline/*.txt）
node scripts/verify-render.cjs --only jp-home     # 只跑某条路由（调试用）
node scripts/verify-render.cjs --json             # 额外输出机器可读结果
```

覆盖 8 条关键路由：`/`、`/jp-home/`、`/jp-grammar/`、`/jp-kana-chart/`、`/jp-words/`、
`/jp-me/`、`/jp-game/jp-growing/jp-grow-01`、`/jp-study/jp-growing/jp-grow-01`。

每条路由存下来的**只有**：路由、来源、appVersion、`<title>`、可见节点数、HTML 体积量级、
各标签计数、关键 id/role 计数、**归一化后的可见文本逐行**。不存整份 DOM。

### 为什么不用 `--dump-dom`（本机实测记录，2026-10-12）

本机 Edge 155 / 154 的 `--headless=new --dump-dom` **输出 0 字节**，管道和重定向到文件都一样；
同一组参数换成 `--screenshot=xx.png` 却能正常出 2740 字节的 PNG，说明渲染引擎本身没问题。
所以脚本改走**同等的 CDP 通道**：`--remote-debugging-port` 实测可用
（`/json/version` → `{"Browser":"Edg/155.0.4283.45"}`），由脚本在页面里执行
`Runtime.evaluate` 取 DOM。DOM 仍然是「真实无头浏览器 + 前端路由跑完之后」的 DOM，
口径没有放宽。

### 稳定性怎么保证

1. **等网络空闲再取数**：可见文本连续 2 次不变 **且** 在途请求归零 3 次才收工。
   只等文本不变会漏掉异步接口（实测 `/jp-me/` 的「检查更新」卡片会有/没有，两次抓取不一致）。
2. **易变文本确定性归一化**（不是忽略）：时间戳→`<TS>`、耗时→`<DUR>`、体积→`<SIZE>`、
   检查更新卡片→`<更新检查>`。
3. 实测：连续两遍 `--write-baseline` 产出的 8 个基线文件 **SHA256 全部一致**，
   第三遍对比 0 差异（见 REFACTOR.md 步骤 4 执行记录）。

### 故意改坏 → 必须报差异（回归自检）

```bash
# 例：把 jp-home 副标题改一下，构建后再跑，脚本必须报差异且退出码 1
node scripts/verify-render.cjs            # 期望： [FAIL] / 与基线有差异 / 退出码 1
```

### 护栏 `tests/render-baseline/guards.json`

`mustContain` / `mustNotContain` 是**独立于基线文本**的硬断言：重新生成基线也会继续生效，
防止「改了页面顺手重建基线」把回归洗掉。基线文本负责「逐字对比」，护栏负责「底线不丢」。

### 降级路径（浏览器确实不可用时）

触发条件：找不到浏览器可执行文件（`--edge` / `JPLINGO_EDGE` / 内置路径都没有），
或浏览器存在但 CDP 起不来/页面取不到数。

降级后只做**静态检查**：在 `.output/public/_nuxt/*.js` 里断言关键文案存在、
历史踩坑的未定义标识符不存在。覆盖能力**明显弱于**渲染快照（发现不了 CSS/交互/顺序回归），所以：

- **浏览器存在却取不到渲染结果 → 退出码 2（按失败处理）**，避免静默变绿；
- 确实要接受降级，必须显式加 `--allow-degraded`（并在结论里写明降级原因）；
- CI 里通过 `JPLINGO_EDGE=<浏览器路径>` 强制要求真实浏览器。
