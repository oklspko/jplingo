#!/usr/bin/env node
/*
 * jplingo 语音预生成脚本（自建 Style-Bert-VITS2 本地合成）
 *
 * 一次性把所有课程词/句的日语假名读音用本地 Style-Bert-VITS2 模型合成，
 * 转成 MP3 写到 public/audio/，并生成 public/audio/manifest.json。
 * 产出物与 generate-tts.cjs（讯飞版）完全一致，前端 useJpSound.ts 无需改动。
 *
 * 前置：先在本机/GPU 服务器上把 Style-Bert-VITS2 的 server_fastapi.py 跑起来
 * （默认 http://127.0.0.1:5000），详见同目录 README-TTS-local.md。
 *
 * 用法：
 *   node scripts/generate-tts-local.cjs --list                          # 列出已加载的 model_id / 发音人
 *   node scripts/generate-tts-local.cjs --test "こんにちは"            # 试合成一句
 *   node scripts/generate-tts-local.cjs                                 # 全量生成（断点续传）
 *   node scripts/generate-tts-local.cjs --limit 20                      # 小范围试跑
 *   node scripts/generate-tts-local.cjs --force                          # 强制重合成全部
 *
 * 配置通过环境变量或 scripts/.tts-local.env 提供：
 *   SBV2_URL          Style-Bert-VITS2 服务地址（默认 http://127.0.0.1:5000）
 *   SBV2_MODEL_ID     模型序号，int（先用 --list 查看）
 *   SBV2_SPEAKER_ID   该模型下的发音人序号，int
 *   SBV2_LENGTH       语速（默认 1.0，正常；>1 变慢 <1 变快）
 *   SBV2_SDP_RATIO    SDP/DP 混合比（默认 0.2，控制表现力）
 *   SBV2_NOISE        样本噪声（默认 0.6）
 *   SBV2_NOISEW       噪声长度（默认 0.8）
 *
 * 依赖：Node ≥ 18（原生 fetch）、ffmpeg（WAV 转 MP3 用，需在 PATH 里）。
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const COURSES_DIR = path.join(ROOT, "public", "courses");
const AUDIO_DIR = path.join(ROOT, "public", "audio");

// ---- 读取配置（环境变量 + scripts/.tts-local.env）----
function loadEnv() {
  const env = { ...process.env };
  const envFile = path.join(__dirname, ".tts-local.env");
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].trim();
    }
  }
  return env;
}

const md5 = (s) => crypto.createHash("md5").update(s, "utf8").digest("hex");

function base(baseUrl) {
  return (baseUrl || "http://127.0.0.1:5000").replace(/\/+$/, "");
}

// ---- 列出已加载的模型与发音人，帮助填写 model_id / speaker_id ----
async function listModels(baseUrl) {
  for (const p of ["/models/info", "/models"]) {
    try {
      const res = await fetch(base(baseUrl) + p);
      if (res.ok) {
        console.log(JSON.stringify(await res.json(), null, 2));
        return;
      }
    } catch {}
  }
  console.error("无法读取模型列表。请确认服务已启动，或直接打开 " + base(baseUrl) + "/docs 查看。");
}

// ---- 调 /voice 合成一句，返回 WAV 字节或错误 ----
async function sbv2Tts(opts, text) {
  const body = {
    text,
    model_id: opts.modelId,
    speaker_id: opts.speakerId,
    language: "JP",
    sdp_ratio: opts.sdpRatio,
    noise: opts.noise,
    noisew: opts.noisew,
    length: opts.length,
    line_split: false,
  };

  let res;
  try {
    res = await fetch(base(opts.url) + "/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, desc: "连接失败：" + e.message };
  }

  const contentType = res.headers.get("content-type") || "";
  const buf = Buffer.from(await res.arrayBuffer());

  if (res.ok && contentType.startsWith("audio/")) {
    return { ok: true, buf };
  }

  // 非音频响应 => 错误（JSON 的 error/detail 或纯文本提示）
  let desc = `HTTP ${res.status}`;
  try {
    const j = JSON.parse(buf.toString("utf8"));
    if (j.error) desc = j.error;
    else if (j.detail) desc = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    else desc = JSON.stringify(j);
  } catch {
    desc = buf.toString("utf8").slice(0, 200) || desc;
  }
  return { ok: false, desc };
}

// ---- WAV 转 MP3（单声道 48kbps，控制体积）----
function wavToMp3(wavBuf, outFile) {
  const tmpWav = outFile + ".wav";
  fs.writeFileSync(tmpWav, wavBuf);
  try {
    execFileSync("ffmpeg", ["-y", "-i", tmpWav, "-ac", "1", "-b:a", "48k", outFile], {
      stdio: "ignore",
    });
  } finally {
    try { fs.unlinkSync(tmpWav); } catch {}
  }
}

// 遍历所有课程，按「去掉空白的 kana」去重，得到需要合成的读音集合（与讯飞版一致）
function collectKeys() {
  const packsFile = path.join(COURSES_DIR, "course-packs.json");
  const packs = JSON.parse(fs.readFileSync(packsFile, "utf8")).coursePacks || [];
  const keys = new Set();
  for (const pack of packs) {
    for (const courseId of pack.courses) {
      const file = path.join(COURSES_DIR, pack.id, `${courseId}.json`);
      if (!fs.existsSync(file)) continue;
      const course = JSON.parse(fs.readFileSync(file, "utf8"));
      for (const stmt of course.statements || []) {
        const key = (stmt.kana || "").replace(/\s+/g, "");
        if (key) keys.add(key);
      }
    }
  }
  return [...keys];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2);
  const env = loadEnv();

  const opts = {
    url: env.SBV2_URL || "http://127.0.0.1:5000",
    modelId: parseInt(env.SBV2_MODEL_ID, 10),
    speakerId: parseInt(env.SBV2_SPEAKER_ID, 10),
    length: env.SBV2_LENGTH ? parseFloat(env.SBV2_LENGTH) : 1.0,
    sdpRatio: env.SBV2_SDP_RATIO ? parseFloat(env.SBV2_SDP_RATIO) : 0.2,
    noise: env.SBV2_NOISE ? parseFloat(env.SBV2_NOISE) : 0.6,
    noisew: env.SBV2_NOISEW ? parseFloat(env.SBV2_NOISEW) : 0.8,
  };

  if (args.includes("--list")) {
    await listModels(opts.url);
    return;
  }

  const missing = Number.isNaN(opts.modelId) || Number.isNaN(opts.speakerId);
  if (missing) {
    console.error("缺少 SBV2_MODEL_ID / SBV2_SPEAKER_ID。请先跑 --list 查看已加载的模型与发音人，");
    console.error("然后在 scripts/.tts-local.env 或环境变量里设置。");
    process.exit(1);
  }

  // --test "xxx"：先试听一句，验证模型与发音人
  const testIdx = args.indexOf("--test");
  if (testIdx !== -1) {
    const text = args[testIdx + 1];
    if (!text) {
      console.error('--test 需要跟一段文本，如 node scripts/generate-tts-local.cjs --test "こんにちは"');
      process.exit(1);
    }
    console.log(`试听合成：「${text}」（model_id=${opts.modelId} speaker_id=${opts.speakerId}）`);
    const r = await sbv2Tts(opts, text);
    if (r.ok) {
      const out = path.join(__dirname, "test-local.mp3");
      wavToMp3(r.buf, out);
      console.log(`成功，已保存到 scripts/test-local.mp3（${r.buf.length} 字节 WAV）`);
    } else {
      console.error(`失败：${r.desc}`);
      process.exit(1);
    }
    return;
  }

  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;
  const force = args.includes("--force");

  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const keys = collectKeys();
  console.log(`共 ${keys.length} 条唯一读音需要合成。`);

  // 续传：已存在的音频跳过
  const manifest = {};
  const manifestFile = path.join(AUDIO_DIR, "manifest.json");
  if (fs.existsSync(manifestFile)) {
    Object.assign(manifest, JSON.parse(fs.readFileSync(manifestFile, "utf8")));
  }

  let done = 0;
  let skipped = 0;
  let failed = 0;

  const total = Math.min(keys.length, limit === Infinity ? keys.length : limit);
  for (let i = 0; i < keys.length && i < limit; i++) {
    const key = keys[i];
    const filename = `${md5(key)}.mp3`;
    const outFile = path.join(AUDIO_DIR, filename);

    if (!force && fs.existsSync(outFile)) {
      manifest[key] = filename;
      skipped++;
      continue;
    }

    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      const r = await sbv2Tts(opts, key);
      if (r.ok) {
        try {
          wavToMp3(r.buf, outFile);
          manifest[key] = filename;
          ok = true;
        } catch (e) {
          console.error(`  ✗ [${i + 1}/${total}] ${key} → ffmpeg 转换失败：${e.message}`);
          break;
        }
      } else if (attempt < 2) {
        await sleep(800);
      } else {
        failed++;
        console.error(`  ✗ [${i + 1}/${total}] ${key} → ${r.desc}`);
      }
    }
    if (ok) done++;

    if ((i + 1) % 100 === 0 || i === total - 1) {
      fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
      console.log(`进度 ${i + 1}/${total}：成功 ${done}，跳过 ${skipped}，失败 ${failed}`);
    }

    await sleep(30); // 轻度限流，给推理进程喘息
  }

  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  console.log(`\n完成。成功 ${done}，跳过 ${skipped}，失败 ${failed}。`);
  console.log(`音频目录：${AUDIO_DIR}`);
  console.log(`清单文件：${manifestFile}`);
  if (failed > 0) console.log("有失败项，重跑一次即可续传（已成功的会自动跳过）。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
