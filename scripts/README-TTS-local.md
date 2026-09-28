# jplingo 语音方案（自建 Style-Bert-VITS2）部署说明

用**本地开源的 Style-Bert-VITS2** 替代讯飞小语种引擎（mtts）来预生成课程读音。讯飞的日语走 mtts 老引擎、音色机械生硬；Style-Bert-VITS2 是日语开源里最接近真人的方案。产出的 MP3 与 `manifest.json` 和讯飞版**完全一致**，前端 `useJpSound.ts` 无需改动。

## 原理

- `scripts/generate-tts-local.cjs` 遍历 `public/courses/**/*.json`，把每条 `kana`（去空白后）POST 到本地 Style-Bert-VITS2 的 `/voice` 接口，拿到 WAV，用 ffmpeg 转成 MP3 写入 `public/audio/`，并生成 `public/audio/manifest.json`（`kana → 文件名` 映射）。
- 前端 `useJpSound.ts` 优先按 `kana` 查 manifest 播放 `/audio/*.mp3`；查不到自动退回浏览器 TTS 兜底（与现在一致）。

## 一、准备合成环境（一次性）

Style-Bert-VITS2 需要 Python + PyTorch。**建议用 GPU**（合成 10601 句约 30~60 分钟）；纯 CPU 也能跑但约 1~3 秒/句，全量要数小时。任选其一：

### 方案 1：租 GPU（推荐）

autoDL / 矩池云 等平台选一张最便宜的卡（如 2080Ti / 3090，¥1~3/小时），镜像选「PyTorch」即可。

### 方案 2：本地机器

Windows / Linux / WSL 均可，有一块 N 卡最佳；没卡就用 CPU（慢）。

### 安装

```bash
git clone https://github.com/litagin02/Style-Bert-VITS2.git
cd Style-Bert-VITS2
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121   # 有 N 卡；无卡去掉 --index-url
pip install -r requirements.txt
sudo apt install ffmpeg    # 转 MP3 用；Windows 去 ffmpeg.org 下并加进 PATH
```

> GPU 版 torch 的 `--index-url` 按你的 CUDA 版本选（cu118/cu121/cu124），具体见 PyTorch 官网。

## 二、选模型与发音人

1. **下载日语模型**：默认仓库自带 jvnv 系列日语发音人，也常用社区预训练的日语模型（如 HuggingFace 上的 `Style-Bert-VITS2` 日语模型，放到 `model_assets/` 下）。首次运行会自动下载默认模型。
2. **启动 API 服务**（在 Style-Bert-VITS2 目录里）：

   ```bash
   python server_fastapi.py
   # 默认 http://127.0.0.1:5000，可浏览器打开 /docs 看接口
   ```

3. **列出模型与发音人**（回 jplingo 目录）：

   ```bash
   node scripts/generate-tts-local.cjs --list
   ```

   记下要用的 `model_id` 和 `speaker_id`（发音人音色可在 Style-Bert-VITS2 的网页 UI 里先试听确认）。

## 三、配置

在 `scripts/.tts-local.env`（新建，已被 .gitignore 忽略）写入：

```ini
SBV2_URL=http://127.0.0.1:5000
SBV2_MODEL_ID=0
SBV2_SPEAKER_ID=0
SBV2_LENGTH=1.0
```

> `SBV2_LENGTH` 是语速：1.0 正常、>1 变慢、<1 变快。其余可选：`SBV2_SDP_RATIO`（表现力，默认 0.2）、`SBV2_NOISE`、`SBV2_NOISEW`。

## 四、先试听一句，验证可用

```bash
node scripts/generate-tts-local.cjs --test "こんにちは"
```

成功会生成 `scripts/test-local.mp3`，能正常播放、音色满意即可。

## 五、全量生成

```bash
node scripts/generate-tts-local.cjs
```

- 约 10601 条唯一读音，输出到 `public/audio/`。
- 支持**续传**：中断后重跑会跳过已存在的文件（省钱省时）。
- 小范围试跑：`node scripts/generate-tts-local.cjs --limit 20`。
- 换音色后强制重合成：`--force`。
- 有少量失败项时，再跑一次即可补上。

## 六、构建并部署

```bash
npm run build
```

`public/audio/` 会被 Nuxt 一并复制到 `.output/public/audio/`，随静态站一起发布（EdgeOne Pages 直接托管即可），前端零改动。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| `连接失败` | 确认 `server_fastapi.py` 已启动、`SBV2_URL` 端口正确 |
| `HTTP 422` / 返回非音频 | 打开 `{SBV2_URL}/docs` 核对参数名；`model_id`/`speaker_id` 必须是 int，超出范围会报「model_id 不存在」 |
| 文本超长报错 | 默认单次上限 100 字符，改 Style-Bert-VITS2 的 `config.yml` 里 `server.limit` |
| `ffmpeg 转换失败` | 确认 ffmpeg 在 PATH 里（`ffmpeg -version`） |
| 音色不满意 | 换一个发音人（`--list` 看 `speaker_id`），改 `.tts-local.env` 后 `--force` 重跑 |
| 想保留 WAV 不转 MP3 | 脚本暂固定转 MP3；体积上 MP3（48kbps 单声道）比 WAV 小约 10 倍，不建议保留 WAV |
