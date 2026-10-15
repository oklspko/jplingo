#!/usr/bin/env node
/**
 * 极简本地静态服务（给 verify-render.cjs 做渲染快照用）。
 *
 * 只做三件事，故意不引任何依赖：
 *   1. 目录与后缀回退：`/jp-home` → `/jp-home/index.html` → `/jp-home.html`；
 *   2. SPA 回退：找不到文件时返回 `200.html`（Nuxt 的 SPA 外壳），保证深链路也是 200——
 *      这是必需的，因为无头浏览器如果拿到 404 就不会执行前端路由；
 *   3. 只读：不做目录列表、不做写入，端口/根目录可配，避免占用冲突。
 *
 * 用法：
 *   node scripts/serve-static.cjs [--port 4180] [--root .output/public]
 *   node scripts/serve-static.cjs --help
 *
 * 为什么不用 `npx serve`：本项目 node_modules 是历史遗留的扁平布局，CI 上是隔离布局，
 * 临时 npx 拉包既慢又不确定（步骤 3 已经踩过「传递依赖在 CI 里不存在」的坑）。
 */
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".map": "application/json; charset=utf-8",
};

function parseArgs(argv) {
  const opts = { port: 4180, root: path.join(ROOT, ".output", "public"), host: "127.0.0.1" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--port" || a === "-p") opts.port = Number(argv[++i]);
    else if (a === "--root" || a === "-r") opts.root = path.resolve(argv[++i]);
    else if (a === "--host") opts.host = argv[++i];
    else if (/^\d+$/.test(a)) opts.port = Number(a);
  }
  if (!fs.existsSync(opts.root)) {
    console.error(`[serve-static] 输出目录不存在：${opts.root}（先跑一次 npx nuxi generate）`);
    process.exit(2);
  }
  return opts;
}

/** 在 root 内安全解析 url path，任何越界（..、绝对盘符）都返回 null */
function safeJoin(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  } catch {
    return null;
  }
  const joined = path.join(root, decoded);
  const rel = path.relative(root, joined);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return joined;
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/** 返回 { file, fallback } 或 null（连 200.html 都没有） */
function resolveFile(root, urlPath) {
  const base = safeJoin(root, urlPath);
  if (base) {
    const candidates = [];
    if (urlPath === "/" || urlPath === "") candidates.push(path.join(root, "index.html"));
    if (isFile(base)) return { file: base, fallback: false };
    if (isFile(`${base}.html`)) return { file: `${base}.html`, fallback: false };
    if (isFile(path.join(base, "index.html"))) {
      return { file: path.join(base, "index.html"), fallback: false };
    }
    void candidates;
  }
  const shell = ["200.html", "index.html"].map((f) => path.join(root, f)).find(isFile);
  return shell ? { file: shell, fallback: true } : null;
}

function createServer(root) {
  return http.createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
      res.end("method not allowed");
      return;
    }
    const urlPath = (req.url || "/").split("?")[0];
    if (urlPath.startsWith("/__health")) {
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      res.end("ok");
      return;
    }
    const hit = resolveFile(root, urlPath);
    if (!hit) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    // SPA 回退必须是 200（页面不能是错误码，否则浏览器不跑前端路由）
    const headers = {
      "content-type": MIME[path.extname(hit.file).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store",
      "x-serve-static": hit.fallback ? "spa-fallback" : "file",
    };
    if (req.method === "HEAD") {
      headers["content-length"] = String(fs.statSync(hit.file).size);
      res.writeHead(200, headers);
      res.end();
      return;
    }
    const stream = fs.createReadStream(hit.file);
    stream.on("error", () => {
      res.destroy();
    });
    res.writeHead(200, headers);
    stream.pipe(res);
  });
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log("用法：node scripts/serve-static.cjs [--port 4180] [--root .output/public] [--host 127.0.0.1]");
    return;
  }
  const server = createServer(opts.root);
  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
      console.error(`[serve-static] 端口 ${opts.port} 已被占用，换一个：--port 4181`);
      process.exit(3);
    }
    console.error("[serve-static] 服务错误：", err);
    process.exit(1);
  });
  server.listen(opts.port, opts.host, () => {
    // 这一行是给 verify-render.cjs 解析用的（它等这一行出现才开始抓页面）
    console.log(`[serve-static] listening http://${opts.host}:${opts.port} <- ${opts.root}`);
  });
  const close = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

module.exports = { createServer, resolveFile, safeJoin, MIME };

if (require.main === module) main();
