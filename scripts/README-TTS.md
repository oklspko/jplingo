# jplingo 语音方案（讯飞 TTS 预生成）部署说明

解决两个问题：**手机没有语音**、**网页语音生硬**。方案是把全部课程词/句的日语读音**预先用讯飞合成成 MP3**，随前端一起作为静态文件发布，前端直接播放 MP3（手机/网页一致，不再依赖设备自带的 TTS 语音）。

## 原理

- 脚本 `scripts/generate-tts.cjs` 遍历 `public/courses/**/*.json`，把每条 `kana`（去空白后）合成 MP3，写入 `public/audio/`，并生成 `public/audio/manifest.json`（`kana → 文件名` 映射）。
- 前端 `useJpSound.ts` 的 `speakJapanese` 优先按 `kana` 查 manifest 播放 `/audio/*.mp3`；查不到（音频还没生成/缺失）时自动退回浏览器 `speechSynthesis` 兜底。

## 一、准备讯飞账号（一次性）

1. 打开 [讯飞开放平台](https://www.xfyun.cn/)，注册/登录，创建「语音合成」应用，得到同一应用下的三个值：
   - **AppID**
   - **APIKey**
   - **APISecret**（WebSocket 流式接口鉴权签名用）
2. 在控制台「语音合成 → 发音人」里**添加日语发音人**（日语属于小语种，需手动添加）。添加后记录它的 `voice_name` 参数值。
   - 未添加就调用会报 `11200`（未授权发音人）。
3. 建议先到「在线体验发音人」页面试听，确认该日语发音人音色是否满意。

## 二、配置密钥

在 `scripts/.tts.env`（新建，已被 .gitignore 忽略，请勿提交密钥到公开仓库）写入：

```ini
XF_APPID=你的AppID
XF_API_KEY=你的APIKey
XF_API_SECRET=你的APISecret
XF_VOICE=日语发音人的voice_name
```

> 也可用环境变量 `XF_APPID` / `XF_API_KEY` / `XF_API_SECRET` / `XF_VOICE` 传入。

## 三、先试听一句，验证可用

```bash
node scripts/generate-tts.cjs --test "こんにちは"
```

成功会生成 `scripts/test.mp3`，能正常播放即密钥与发音人 OK。失败会打印 `code/desc`，按提示排查（11200 → 添加/启用日语发音人）。

## 四、全量生成

```bash
node scripts/generate-tts.cjs
```

- 约 2300 条唯一读音，输出到 `public/audio/`（总计约 15~25 MB）。
- 支持**续传**：中断后重跑会跳过已存在的文件，已合成的不重复调用（省钱）。
- 想小范围试跑：`node scripts/generate-tts.cjs --limit 20`。
- 想强制重合成：加 `--force`。
- 有少量失败项时，再跑一次即可补上。

## 五、构建并部署

```bash
npm run build
```

`public/audio/` 会被 Nuxt 一并复制到 `.output/public/audio/`，随静态站一起发布。

- **EdgeOne Pages（推荐）**：照常提交部署即可，`/audio/*.mp3` 与 `/audio/manifest.json` 自动上线。约 20~30 MB 的静态资源，EdgeOne 直接托管无压力。
- **若不想把这批音频提交进 git 仓库**（体积/仓库体积顾虑），可选把 `public/audio/` 里的 mp3 放到自托管服务器，用 Caddy 静态托管，并把 `useJpSound.ts` 里的 `AUDIO_BASE` 改为 `https://api.jplingo.cn/audio`（Caddy 需加 CORS 头）。默认路径 `/audio` 最简单，先按默认跑通即可。

## 六、验证

1. 手机浏览器打开练习页，点「🔊 发音」应能出声（之前是静音）。
2. 网页端发音应为讯飞自然音，不再是生硬机械音。
3. 若某条没声音，打开控制台看 `/audio/manifest.json` 是否 404（说明没生成/没部署），确认后兜底逻辑会自动退回浏览器 TTS，不影响其它功能。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| `11200` 未授权发音人 | 控制台「语音合成→发音人」添加日语发音人 |
| `10114` / 参数错误 | 检查 `XF_VOICE` 是否与控制台发音人参数完全一致 |
| `HMAC signature does not match` | APISecret 填错，或 AppID/APIKey/APISecret 不是同一应用下的，回控制台重新核对复制 |
| 返回的不是音频而是 JSON | 看 `code/desc`；多为密钥错误或发音人未授权 |
| 手机仍无声 | 确认 mp3 已部署；部分浏览器首次播放需用户手势，点一下「🔊 发音」再试 |
