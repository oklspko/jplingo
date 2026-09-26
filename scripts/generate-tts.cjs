#!/usr/bin/env node
/*
 * jplingo 语音预生成脚本（讯飞在线语音合成 · HTTP WebAPI）
 *
 * 一次性把所有课程词/句的日语假名读音合成成 MP3，写到 public/audio/，
 * 并生成 public/audio/manifest.json。前端据此播放，手机和网页语音一致。
 *
 * 用法：
 *   node scripts/generate-tts.cjs [--limit N] [--force] [--test "こんにちは"]
 *
 * 密钥通过环境变量或 scripts/.tts.env 提供：
 *   XF_APPID    讯飞应用 AppID
 *   XF_API_KEY  讯飞 APIKey
 *   XF_VOICE    日语发音人 voice_name（讯飞控制台「语音合成→发音人」添加日语发音人后查看）
 *
 * 说明：
 *   - 默认跳过已存在的音频文件，可随时中断后重跑续传（已合成的不再重复收费）。
 *   - --test 只合成一句试听，用于先验证密钥与发音人是否可用，再跑全量。
 *   - 成功响应 Content-Type 为 audio/mpeg；失败返回 JSON（code/desc）。
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const COURSES_DIR = path.join(ROOT, "public", "courses");
const AUDIO_DIR = path.join(ROOT, "public", "audio");

const API_URL = "https://api.xfyun.cn/v1/service/v1/tts";

// ---- 读取配置（环境变量 + scripts/.tts.env）----
function loadEnv() {
  const env = { ...process.env };
  const envFile = path.join(__dirname, ".tts.env");
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].trim();
    }
  }
  return env;
}

const md5 = (s) => crypto.createHash("md5").update(s, "utf8").digest("hex");

function buildHeaders(appid, apiKey, voice) {
  const params = {
    auf: "audio/L16;rate=16000",
    aue: "lame", // 输出 mp3
    voice_name: voice,
    speed: "50", // 语速 0-100，50 为正常
    volume: "50",
    pitch: "50",
    engine_type: "intp65",
    text_type: "text",
  };
  const param = Buffer.from(JSON.stringify(params), "utf8").toString("base64");
  const curTime = String(Math.floor(Date.now() / 1000));
  const checksum = md5(apiKey + curTime + param);
  return {
    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    "X-Appid": appid,
    "X-CurTime": curTime,
    "X-Param": param,
    "X-CheckSum": checksum,
  };
}

async function xfTts(appid, apiKey, voice, text) {
  const headers = buildHeaders(appid, apiKey, voice);
  const body = new URLSearchParams({ text }).toString();
  const res = await fetch(API_URL, { method: "POST", headers, body });
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("audio") || ct.includes("mpeg")) {
    return { ok: true, buf: Buffer.from(await res.arrayBuffer()) };
  }
  const data = await res.json().catch(() => ({}));
  return {
    ok: false,
    code: data.code,
    desc: data.desc || data.message || `HTTP ${res.status}`,
  };
}

// 遍历所有课程，按「去掉空白的 kana」去重，得到需要合成的读音集合
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
  const appid = env.XF_APPID;
  const apiKey = env.XF_API_KEY;
  const voice = env.XF_VOICE;

  // --test "xxx"：先试听一句，验证密钥与发音人
  const testIdx = args.indexOf("--test");
  if (testIdx !== -1) {
    const text = args[testIdx + 1];
    if (!text) {
      console.error('--test 需要跟一段文本，如 node scripts/generate-tts.cjs --test "こんにちは"');
      process.exit(1);
    }
    if (!appid || !apiKey || !voice) {
      console.error("缺少密钥：请先配置 XF_APPID / XF_API_KEY / XF_VOICE");
      process.exit(1);
    }
    console.log(`试听合成：「${text}」（发音人 ${voice}）`);
    const r = await xfTts(appid, apiKey, voice, text);
    if (r.ok) {
      const out = path.join(__dirname, "test.mp3");
      fs.writeFileSync(out, r.buf);
      console.log(`成功，已保存到 scripts/test.mp3（${r.buf.length} 字节）`);
    } else {
      console.error(`失败：code=${r.code} desc=${r.desc}`);
      console.error("提示：11200 表示发音人未授权，请到讯飞控制台添加/启用该日语发音人。");
      process.exit(1);
    }
    return;
  }

  if (!appid || !apiKey || !voice) {
    console.error("缺少配置。请在 scripts/.tts.env 或环境变量里设置：");
    console.error("  XF_APPID / XF_API_KEY / XF_VOICE（讯飞日语发音人 voice_name）");
    console.error('可先跑：node scripts/generate-tts.cjs --test "こんにちは" 验证。');
    process.exit(1);
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
      const r = await xfTts(appid, apiKey, voice, key);
      if (r.ok) {
        fs.writeFileSync(outFile, r.buf);
        manifest[key] = filename;
        ok = true;
      } else if (attempt < 2) {
        await sleep(1200);
      } else {
        failed++;
        console.error(`  ✗ [${i + 1}/${total}] ${key} → code=${r.code} ${r.desc}`);
      }
    }
    if (ok) done++;

    if ((i + 1) % 50 === 0 || i === total - 1) {
      fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
      console.log(`进度 ${i + 1}/${total}：成功 ${done}，跳过 ${skipped}，失败 ${failed}`);
    }

    await sleep(60); // 限流，避免触发频控
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
