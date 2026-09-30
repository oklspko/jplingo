#!/usr/bin/env node
/*
 * jplingo 语音预生成脚本（讯飞在线语音合成 · 流式 WebSocket v2）
 *
 * 一次性把所有课程词/句的日语假名读音合成成 MP3，写到 public/audio/，
 * 并生成 public/audio/manifest.json。前端据此播放，手机和网页语音一致。
 *
 * 用法：
 *   node scripts/generate-tts.cjs [--limit N] [--force] [--pack jp-growing] [--test "こんにちは"]
 *
 * 密钥通过环境变量或 scripts/.tts.env 提供：
 *   XF_APPID      讯飞应用 AppID
 *   XF_API_KEY    讯飞 APIKey
 *   XF_API_SECRET 讯飞 APISecret（v2 鉴权签名用）
 *   XF_VOICE      日语发音人 vcn（控制台「语音合成→发音人」添加日语发音人后查看）
 *
 * 说明：
 *   - 默认跳过已存在的音频文件，可随时中断后重跑续传（已合成的不再重复收费）。
 *   - --test 只合成一句试听，用于先验证密钥与发音人是否可用，再跑全量。
 *   - 成功时拼接所有二进制音频帧；失败返回 JSON（code/message）。
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const COURSES_DIR = path.join(ROOT, "public", "courses");
const AUDIO_DIR = path.join(ROOT, "public", "audio");

const WS_HOST = "tts-api.xfyun.cn";
const WS_PATH = "/v2/tts";

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

// ---- 鉴权：HMAC-SHA256，拼进 WebSocket URL 查询串 ----
function buildWsUrl(apiKey, apiSecret) {
  const date = new Date().toUTCString(); // RFC1123，如 Thu, 01 Aug 2019 01:53:21 GMT
  const signatureOrigin = `host: ${WS_HOST}\ndate: ${date}\nGET ${WS_PATH} HTTP/1.1`;
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(signatureOrigin)
    .digest("base64");
  const authorizationOrigin =
    `api_key="${apiKey}", algorithm="hmac-sha256", ` +
    `headers="host date request-line", signature="${signature}"`;
  const authorization = Buffer.from(authorizationOrigin, "utf8").toString("base64");
  return (
    `wss://${WS_HOST}${WS_PATH}` +
    `?authorization=${encodeURIComponent(authorization)}` +
    `&date=${encodeURIComponent(date)}` +
    `&host=${WS_HOST}`
  );
}

// 文本编码：小语种（日语）用 UTF-16LE（带 BOM），回退 UTF-8
function encodeText(text, tte) {
  if (tte === "unicode") {
    const body = Buffer.from(text, "utf16le");
    return Buffer.concat([Buffer.from([0xff, 0xfe]), body]).toString("base64");
  }
  return Buffer.from(text, "utf8").toString("base64");
}

function xfTtsOnce(appid, apiKey, apiSecret, voice, text, tte) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(buildWsUrl(apiKey, apiSecret));
    ws.binaryType = "arraybuffer";
    const chunks = [];
    let settled = false;

    const cleanup = () => {
      try {
        ws.close();
      } catch {}
    };
    const finish = (err, buf) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (err) reject(err);
      else resolve(buf);
    };

    ws.onopen = () => {
      const req = {
        common: { app_id: appid },
        business: {
          aue: "lame", // mp3
          sfl: 1,
          auf: "audio/L16;rate=16000",
          vcn: voice,
          speed: 50,
          volume: 50,
          pitch: 50,
          tte,
          ent: "mtts", // 小语种（日语）合成引擎；中文才用 intp65
        },
        data: { status: 2, text: encodeText(text, tte) },
      };
      ws.send(JSON.stringify(req));
    };

    ws.onmessage = (ev) => {
      const data = ev.data;
      if (typeof data === "string") {
        let msg;
        try {
          msg = JSON.parse(data);
        } catch {
          return;
        }
        if (msg.code !== 0) {
          finish(new Error(`XF_ERROR ${msg.code}: ${msg.message || ""}`), null);
          return;
        }
        if (msg.data && msg.data.audio) {
          chunks.push(Buffer.from(msg.data.audio, "base64"));
        }
        if (msg.data && msg.data.status === 2) {
          finish(null, Buffer.concat(chunks));
        }
      } else if (data instanceof ArrayBuffer) {
        chunks.push(Buffer.from(data));
      } else if (Buffer.isBuffer(data)) {
        chunks.push(data);
      } else if (data && typeof data.arrayBuffer === "function") {
        data.arrayBuffer().then((ab) => chunks.push(Buffer.from(ab)));
      }
    };

    ws.onerror = () => finish(new Error("WS 连接错误"), null);
    ws.onclose = () => {
      if (settled) return;
      // 部分情况服务端不显式发 status=2 直接关闭，有音频就收下
      if (chunks.length > 0) finish(null, Buffer.concat(chunks));
      else finish(new Error("连接提前关闭"), null);
    };

    setTimeout(() => {
      if (!settled) finish(new Error("合成超时"), null);
    }, 15000);
  });
}

async function xfTts(appid, apiKey, apiSecret, voice, text) {
  let lastErr = null;
  for (const tte of ["unicode", "UTF8"]) {
    try {
      const buf = await xfTtsOnce(appid, apiKey, apiSecret, voice, text, tte);
      return { ok: true, buf };
    } catch (e) {
      lastErr = e;
    }
  }
  return { ok: false, desc: lastErr ? lastErr.message : "未知错误" };
}

// 遍历课程，按「去掉空白的 kana」去重，得到需要合成的读音集合
// onlyPack 非空时只处理该课程包（如 --pack jp-growing），便于只补新增课程的读音
function collectKeys(onlyPack = null) {
  const packsFile = path.join(COURSES_DIR, "course-packs.json");
  const packs = JSON.parse(fs.readFileSync(packsFile, "utf8")).coursePacks || [];
  const keys = new Set();
  for (const pack of packs) {
    if (onlyPack && pack.id !== onlyPack) continue;
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
  const apiSecret = env.XF_API_SECRET;
  const voice = env.XF_VOICE;

  const missing = !appid || !apiKey || !apiSecret || !voice;

  // --test "xxx"：先试听一句，验证密钥与发音人
  const testIdx = args.indexOf("--test");
  if (testIdx !== -1) {
    const text = args[testIdx + 1];
    if (!text) {
      console.error('--test 需要跟一段文本，如 node scripts/generate-tts.cjs --test "こんにちは"');
      process.exit(1);
    }
    if (missing) {
      console.error("缺少密钥：请先配置 XF_APPID / XF_API_KEY / XF_API_SECRET / XF_VOICE");
      process.exit(1);
    }
    console.log(`试听合成：「${text}」（发音人 ${voice}）`);
    const r = await xfTts(appid, apiKey, apiSecret, voice, text);
    if (r.ok) {
      const out = path.join(__dirname, "test.mp3");
      fs.writeFileSync(out, r.buf);
      console.log(`成功，已保存到 scripts/test.mp3（${r.buf.length} 字节）`);
    } else {
      console.error(`失败：${r.desc}`);
      console.error("提示：11200 表示发音人未授权，请到讯飞控制台添加/启用该日语发音人。");
      process.exit(1);
    }
    return;
  }

  if (missing) {
    console.error("缺少配置。请在 scripts/.tts.env 或环境变量里设置：");
    console.error("  XF_APPID / XF_API_KEY / XF_API_SECRET / XF_VOICE（讯飞日语发音人 vcn）");
    console.error('可先跑：node scripts/generate-tts.cjs --test "こんにちは" 验证。');
    process.exit(1);
  }

  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;
  const force = args.includes("--force");
  // --pack <课程包 id>：只补某个课程包（如 --pack jp-growing），便于课程更新后增量补音频
  const packIdx = args.indexOf("--pack");
  const onlyPack = packIdx !== -1 ? args[packIdx + 1] : null;

  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const keys = collectKeys(onlyPack);
  console.log(
    onlyPack
      ? `课程包 ${onlyPack}：共 ${keys.length} 条唯一读音（已存在的会自动跳过）。`
      : `共 ${keys.length} 条唯一读音需要合成。`,
  );

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
      const r = await xfTts(appid, apiKey, apiSecret, voice, key);
      if (r.ok) {
        fs.writeFileSync(outFile, r.buf);
        manifest[key] = filename;
        ok = true;
      } else if (attempt < 2) {
        await sleep(1200);
      } else {
        failed++;
        console.error(`  ✗ [${i + 1}/${total}] ${key} → ${r.desc}`);
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
