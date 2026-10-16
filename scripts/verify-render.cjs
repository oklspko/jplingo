#!/usr/bin/env node
/**
 * 渲染快照对比（REFACTOR.md 步骤 4）
 *
 * 做什么：
 *   1. 复用/构建 `.output/public`（`npx nuxi generate`，可用 --no-build 复用现有产物）；
 *   2. 起本地静态服务（scripts/serve-static.cjs，SPA 回退到 200.html）；
 *   3. 对关键路由用无头浏览器取「渲染后的 DOM」，只留 **可见文本 + 元素计数 + 版本标记**；
 *   4. 与基线 `tests/render-baseline/*.txt` 逐行对比，输出差异，退出码 1 表示有差异。
 *
 * 为什么不用 `--dump-dom` 直接拿文本（本机实测记录，2026-10-12）：
 *   本机 Edge 155/154 的 `--headless=new --dump-dom` 无论重定向到文件还是管道都输出 **0 字节**
 *   （`--screenshot=xx.png` 同参数却能正常出图 2740 字节，说明渲染引擎本身是好的）。
 *   所以脚本默认走同等的 **CDP 通道**（`--remote-debugging-port` 实测可用：
 *   `{"Browser":"Edg/155.0.4283.45"}`），由我们自己在页面里执行 `Runtime.evaluate` 取 DOM。
 *   这不是放宽标准：DOM 仍然是真实无头浏览器渲染 + 前端路由跑完之后的 DOM。
 *   若 CDP 也不可用（端口连不上），自动退化为 **静态检查**（见 scripts/README 与文件末尾
 *   DEGRADED 段落），并把「降级原因」原样打印出来，绝不静默通过。
 *
 * 用法：
 *   node scripts/verify-render.cjs                     # 复用 .output/public，与基线对比
 *   node scripts/verify-render.cjs --build             # 先 nuxi generate 再对比
 *   node scripts/verify-render.cjs --write-baseline    # 重建基线（默认要求同时 --build）
 *   node scripts/verify-render.cjs --only jp-home      # 只跑匹配的路由（子串匹配）
 *   node scripts/verify-render.cjs --port 4199         # 换端口（默认从 4180 起找空位）
 *   node scripts/verify-render.cjs --edge "<path>"     # 指定浏览器可执行文件
 *   node scripts/verify-render.cjs --json              # 额外输出机器可读结果
 */
const { spawn, spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, ".output", "public");
const BASELINE_DIR = path.join(ROOT, "tests", "render-baseline");
const GUARDS_FILE = path.join(BASELINE_DIR, "guards.json");
const VIEWPORT = { width: 390, height: 844 };
const NAV_TIMEOUT_MS = 45000;
const SETTLE_TIMEOUT_MS = 20000;

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/microsoft-edge",
  "/usr/bin/google-chrome",
];

/** 关键路由（REFACTOR.md 步骤 4 的 8 条 + 步骤 5 补入 jp-editor） */
const ROUTES = [
  "/",
  "/jp-home/",
  "/jp-editor/",
  "/jp-grammar/",
  "/jp-kana-chart/",
  "/jp-words/",
  "/jp-me/",
  "/jp-game/jp-growing/jp-grow-01",
  "/jp-study/jp-growing/jp-grow-01",
];

/**
 * 易变文本的**确定性归一化**（不是「忽略」）：
 * 同一台机器两次抓取必须逐行一致，否则基线与「改坏了」无法区分。
 * 这里把「时间戳 / 耗时 / 体积 / 加载中状态」折成固定占位符，其余文本一律逐字对比。
 */
const VOLATILE_RULES = [
  [/[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9:.+\-Z]*/g, "<TS>"],
  // 练习页的计时器（00:01 → 00:02）与任何 mm:ss / hh:mm:ss 计时：两次抓取必然不同，
  // 不折掉就会把「页面没变」误判成差异（2026-10-15 CI 与本机各踩一次）。
  [/\b[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?\b/g, "<TIME>"],
  [/[0-9]+(?:\.[0-9]+)?\s*(?:毫秒|秒|分钟|小时)/g, "<DUR>"],
  [/[0-9]+(?:\.[0-9]+)?\s*(?:B|KB|MB|GB|TB|字节)/g, "<SIZE>"],
  [/[0-9]+\s*字\s*\/\s*<DUR>/g, "<SYNTH>"],
  [/(?:正在|加载中|检查中)[^，。；\n]{0,12}(?:…|\.\.\.)?/g, "<BUSY>"],
  [/上次[^\n]{0,24}/g, "<LAST>"],
  [/最新版本[^\n]{0,24}/g, "<LATEST>"],
  [/当前版本\s*v[0-9][0-9.]*/g, "当前版本 v<VERSION>"],
  // 通用版本串（页脚「jp-lingo v1.2.38」这类）：发版升版本号必然改到可见文本，
  // 不折掉就等于「发版即红灯」（2026-10-16 v1.2.38→1.2.39 实测踩到：
  // 当时只排除了头部 appVersion 行，漏了页面正文里的版本串）。
  // 放在「当前版本」规则之后，两者都折成 v<VERSION>，新旧基线与新抓取一致。
  [/\bv[0-9]+\.[0-9]+\.[0-9]+\b/g, "v<VERSION>"],
  // 「检查更新」卡片要等 GitHub Releases 接口返回（本地网络时快时慢），
  // 快 → 多出「已是<LATEST>/检查更新」，慢 → 只有「📱 下载 Android App」。
  // 两种终态都折成同一个占位符，避免把网络抖动误判成「页面改坏了」。
  [/已是<LATEST>\s*检查更新/g, "<更新检查>"],
  [/检查更新/g, "<更新检查>"],
  [/发现新版本[^\n]{0,24}/g, "<更新检查>"],
];

// ---------------------------------------------------------------------------
// 通用小工具
// ---------------------------------------------------------------------------
function log(msg) {
  console.log(msg);
}
function parseArgs(argv) {
  const o = {
    build: false,
    write: false,
    only: null,
    port: 0,
    edge: null,
    json: false,
    keepOut: false,
    allowDegraded: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--build") o.build = true;
    else if (a === "--no-build") o.build = false;
    else if (a === "--write-baseline" || a === "--update-baseline") o.write = true;
    else if (a === "--only") o.only = argv[++i];
    else if (a === "--port") o.port = Number(argv[++i]);
    else if (a === "--edge") o.edge = argv[++i];
    else if (a === "--json") o.json = true;
    else if (a === "--keep-out") o.keepOut = true;
    else if (a === "--allow-degraded") o.allowDegraded = true;
    else if (a === "--help" || a === "-h") o.help = true;
  }
  return o;
}

function findEdge(explicit) {
  // 优先级：--edge 命令行 > JPLINGO_EDGE 环境变量 > 内置候选路径
  const list = [explicit, process.env.JPLINGO_EDGE, ...EDGE_CANDIDATES].filter(Boolean);
  const seen = new Set();
  for (const p of list) {
    if (seen.has(p)) continue;
    seen.add(p);
    try {
      if (fs.statSync(p).isFile()) return p;
    } catch {
      /* 继续找下一个 */
    }
  }
  return null;
}

function fileForRoute(route) {
  const clean = route.replace(/^\/|\/$/g, "");
  if (clean === "") return "root";
  return clean.replace(/[\\/]/g, "__");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function httpGet(url, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// 1) 构建
// ---------------------------------------------------------------------------
function runBuild() {
  log("\n[1/5] 构建（npx nuxi generate）…");
  const t0 = Date.now();
  const res = spawnSync("npx", ["nuxi", "generate"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    timeout: 30 * 60 * 1000,
  });
  if (res.status !== 0) {
    console.error(`[verify-render] 构建失败（退出码 ${res.status}），终止。`);
    process.exit(2);
  }
  const out = path.join(OUT_DIR, "200.html");
  if (!fs.existsSync(out)) {
    console.error(`[verify-render] 构建结束但找不到 ${out}`);
    process.exit(2);
  }
  log(`      构建完成，用时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

function checkArtifacts() {
  const needed = [path.join(OUT_DIR, "200.html"), path.join(OUT_DIR, "index.html")];
  const missing = needed.filter((f) => !fs.existsSync(f));
  if (missing.length) {
    console.error(
      `[verify-render] 缺少构建产物：${missing.join(", ")}\n` +
        "              先跑一次构建：node scripts/verify-render.cjs --build",
    );
    process.exit(2);
  }
  const chunks = fs.existsSync(path.join(OUT_DIR, "_nuxt"))
    ? fs.readdirSync(path.join(OUT_DIR, "_nuxt")).filter((f) => f.endsWith(".js"))
    : [];
  if (!chunks.length) {
    console.error("[verify-render] .output/public/_nuxt 下没有 JS chunk，产物不完整。");
    process.exit(2);
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// 2) 静态服务
// ---------------------------------------------------------------------------
async function startServer(preferredPort) {
  const { createServer } = require("./serve-static.cjs");
  const ports = preferredPort
    ? [preferredPort]
    : Array.from({ length: 20 }, (_, i) => 4180 + i);
  for (const port of ports) {
    const server = createServer(OUT_DIR);
    const ok = await new Promise((resolve) => {
      const onErr = () => resolve(false);
      server.once("error", onErr);
      server.listen(port, "127.0.0.1", () => {
        server.removeListener("error", onErr);
        resolve(true);
      });
    });
    if (ok) {
      return { server, port, url: `http://127.0.0.1:${port}` };
    }
    server.close();
  }
  console.error("[verify-render] 4180–4199 端口都占用了，用 --port 指定一个空端口。");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// 3) 无头浏览器：CDP 通道
// ---------------------------------------------------------------------------
/** 极简 WebSocket 客户端（node 内置 crypto/net，不引第三方依赖） */
class MiniWs {
  constructor(url) {
    const u = new URL(url);
    this.url = url;
    this.socket = net.connect(Number(u.port), u.hostname);
    this.buffer = Buffer.alloc(0);
    this.handlers = new Map();
    this.nextId = 1;
    this.pending = new Map();
    this.ready = false;
    this._onMessage = () => {};
    this.socket.on("data", (chunk) => {
      if (process.env.JPLINGO_RENDER_DEBUG) console.log(`[ws-debug] 收到 ${chunk.length} 字节`);
      this.buffer = Buffer.concat([this.buffer, chunk]);
      if (!this.ready) this._handshake();
      else this._drain();
    });
    this.socket.on("connect", () => {
      if (process.env.JPLINGO_RENDER_DEBUG) console.log(`[ws-debug] TCP 已连接 ${u.host}`);
      this._sendHandshake(u);
    });
    this.socket.on("error", (err) => this._fail(err));
  }
  _fail(err) {
    for (const { reject } of this.pending.values()) reject(err);
    this.pending.clear();
    if (this._onError) this._onError(err);
  }
  _sendHandshake(u) {
    const key = crypto.randomBytes(16).toString("base64");
    this.socket.write(
      [
        `GET ${u.pathname}${u.search} HTTP/1.1`,
        `Host: ${u.host}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Key: ${key}`,
        "Sec-WebSocket-Version: 13",
        "",
        "",
      ].join("\r\n"),
    );
  }
  _handshake() {
    const text = this.buffer.toString("latin1");
    const end = text.indexOf("\r\n\r\n");
    if (end < 0) return;
    const head = text.slice(0, end);
    this.buffer = this.buffer.slice(Buffer.byteLength(head, "latin1") + 4);
    if (process.env.JPLINGO_RENDER_DEBUG) console.log(`[ws-debug] 握手响应：${head.split("\r\n")[0]}`);
    if (!/^HTTP\/1\.1 101/.test(head)) {
      this._fail(new Error(`WebSocket 握手失败：${head.split("\r\n")[0]}`));
      return;
    }
    this.ready = true;
    this._drain();
    if (this._onOpen) this._onOpen();
  }
  _drain() {
    for (;;) {
      if (this.buffer.length < 2) return;
      const b0 = this.buffer[0];
      const b1 = this.buffer[1];
      const fin = (b0 & 0x80) !== 0;
      const opcode = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f;
      let offset = 2;
      if (len === 126) {
        if (this.buffer.length < 4) return;
        len = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (len === 127) {
        if (this.buffer.length < 10) return;
        len = Number(this.buffer.readBigUInt64BE(2));
        offset = 10;
      }
      const maskLen = masked ? 4 : 0;
      if (this.buffer.length < offset + maskLen + len) return;
      let payload = this.buffer.subarray(offset + maskLen, offset + maskLen + len);
      if (masked) {
        const mask = this.buffer.subarray(offset, offset + 4);
        payload = Buffer.from(payload.map((byte, i) => byte ^ mask[i % 4]));
      }
      this.buffer = this.buffer.subarray(offset + maskLen + len);
      if (opcode === 0x8) {
        this.socket.end();
        this._fail(new Error("WebSocket 被对端关闭"));
        return;
      }
      if (opcode === 0x9) {
        this._sendFrame(payload, 0xa);
        continue;
      }
      if (opcode === 0x1 || opcode === 0x0) {
        const msg = payload.toString("utf8");
        if (fin) this._onMessage(msg);
      }
    }
  }
  _sendFrame(payload, opcode = 0x1) {
    const mask = crypto.randomBytes(4);
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.alloc(2);
      header[1] = 0x80 | len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[1] = 0x80 | 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    header[0] = 0x80 | opcode;
    const masked = Buffer.from(payload.map((byte, i) => byte ^ mask[i % 4]));
    this.socket.write(Buffer.concat([header, mask, masked]));
  }
  send(method, params = {}) {
    const id = this.nextId++;
    const msg = JSON.stringify({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this._sendFrame(Buffer.from(msg, "utf8"));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP ${method} 超时`));
        }
      }, NAV_TIMEOUT_MS).unref();
    });
  }
  close() {
    try {
      this._sendFrame(Buffer.alloc(0), 0x8);
    } catch {
      /* ignore */
    }
    setTimeout(() => this.socket.destroy(), 100).unref();
  }
}

/** 页面里执行的取数脚本（与静态解析同一套口径） */
const EXTRACT_FN = `(() => {
  const norm = (s) => String(s || '').replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim();
  const tagCounts = {};
  const ids = {};
  let visibleNodes = 0;
  const pieces = [];
  const walk = (el) => {
    if (!el || el.nodeType !== 1) return;
    const tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'template' || tag === 'noscript') return;
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    if (el.id) ids['#' + el.id] = (ids['#' + el.id] || 0) + 1;
    const role = el.getAttribute('role');
    if (role) { const k = '[role=' + role + ']'; ids[k] = (ids[k] || 0) + 1; }
    let hidden = false;
    try {
      const cs = getComputedStyle(el);
      hidden = cs.display === 'none' || cs.visibility === 'hidden';
    } catch (e) { hidden = false; }
    if (!hidden) {
      for (const child of el.childNodes) {
        if (child.nodeType === 3) {
          const t = norm(child.nodeValue);
          if (t) { pieces.push(t); visibleNodes++; }
        } else if (child.nodeType === 1) {
          walk(child);
        }
      }
    }
  };
  if (document.body) walk(document.body);
  return {
    url: location.href,
    title: document.title,
    readyState: document.readyState,
    htmlBytes: document.documentElement ? document.documentElement.outerHTML.length : 0,
    tagCounts, ids, visibleNodes, pieces,
  };
})()`;

async function launchBrowser(edgePath, profileDir, preferredPort) {
  // 调试端口可能与别的进程/上一次残留的浏览器冲突（实测：端口被占时新的 msedge 会
  // 「启动即退出，退出码 0」，很容易被误判成「浏览器不可用」），所以在端口段里轮询。
  const candidates = [preferredPort, ...Array.from({ length: 20 }, (_, i) => 9410 + i)].filter(
    (p, i, arr) => p > 0 && arr.indexOf(p) === i,
  );
  let lastError = null;
  for (const port of candidates) {
    try {
      return await launchBrowserOn(edgePath, profileDir, port);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("找不到可用的调试端口");
}

async function launchBrowserOn(edgePath, profileDir, port) {
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-first-run",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-sync",
    "--hide-scrollbars",
    "--mute-audio",
    `--user-data-dir=${profileDir}`,
    `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    `--remote-debugging-port=${port}`,
    "about:blank",
  ];
  const child = spawn(edgePath, args, { stdio: "ignore", windowsHide: true });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const res = await httpGet(`http://127.0.0.1:${port}/json/version`, 2000);
      if (res.status === 200) return { child, port, version: JSON.parse(res.body) };
    } catch {
      /* 还没起来 */
    }
    if (child.exitCode !== null) {
      killTree(child);
      throw new Error(`浏览器在 :${port} 启动即退出（退出码 ${child.exitCode}）`);
    }
    await sleep(300);
  }
  killTree(child);
  throw new Error(`等待 CDP 端口 :${port} 超时（30s）`);
}

function killTree(child) {
  if (!child || child.pid == null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }
}

/** 打开一个可复用的页面 target，返回连好的 MiniWs */
async function openPage(cdpPort) {
  const list = await cdpJson(cdpPort, "/json/list");
  let target = Array.isArray(list) ? list.find((t) => t.type === "page") : null;
  if (!target) {
    target = await cdpJson(cdpPort, "/json/new?about:blank", "PUT");
  }
  if (!target || !target.webSocketDebuggerUrl) throw new Error("拿不到页面调试地址（CDP /json/new 失败）");
  const page = new MiniWs(target.webSocketDebuggerUrl);
  page._onMessage = (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.id && page.pending.has(msg.id)) {
      const { resolve, reject } = page.pending.get(msg.id);
      page.pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message || "CDP 错误"));
      else resolve(msg.result);
      return;
    }
    if (msg.method && page._onEvent) page._onEvent(msg);
  };
  page._onEvent = (msg) => {
    if (page._netHandler) page._netHandler(msg);
  };
  await new Promise((resolve, reject) => {
    page._onOpen = resolve;
    page._onError = reject;
    setTimeout(() => reject(new Error("页面 WebSocket 连接超时")), 15000).unref();
  });
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Network.enable");
  page.pendingRequests = 0;
  page.requestsSeen = 0;
  page._netHandler = (m) => {
    if (m.method === "Network.requestWillBeSent") {
      page.pendingRequests++;
      page.requestsSeen++;
    } else if (m.method === "Network.loadingFinished" || m.method === "Network.loadingFailed") {
      page.pendingRequests = Math.max(0, page.pendingRequests - 1);
    }
  };
  return page;
}

/** 用 CDP 抓一条路由的渲染后 DOM；失败返回 { error } */
async function captureRoute(page, baseUrl, route) {
  const target = new URL(route, baseUrl).href;
  try {
    let loadedResolve;
    const loaded = new Promise((resolve) => {
      loadedResolve = resolve;
    });
    const routeHandler = (m) => {
      if (m.method === "Page.loadEventFired") loadedResolve(true);
    };
    const netHandler = page._netHandler;
    page._onEvent = (m) => {
      routeHandler(m);
      netHandler(m);
    };
    page.pendingRequests = 0;
    page.requestsSeen = 0;
    const timer = setTimeout(() => loadedResolve(false), NAV_TIMEOUT_MS);
    timer.unref();
    await page.send("Page.navigate", { url: target });
    await loaded;
    clearTimeout(timer);

    // SPA：等前端路由把内容渲染出来（可见文本连续两次不再变化，最多 20s）
    const deadline = Date.now() + SETTLE_TIMEOUT_MS;
    let last = "";
    let stable = 0;
    let quiet = 0;
    while (Date.now() < deadline) {
      const probe = await page.send("Runtime.evaluate", {
        expression: `document.body ? document.body.innerText.replace(/\\s+/g,' ').trim().length : -1`,
        returnByValue: true,
      });
      const now = String(probe.result && probe.result.value);
      if (now === last && Number(now) > 40) stable++;
      else stable = 0;
      last = now;
      // 网络也空下来了才算稳定（「检查更新」这类卡片要等接口回来才定稿）
      if ((page.pendingRequests || 0) === 0) quiet++;
      else quiet = 0;
      if (stable >= 2 && quiet >= 3) break;
      await sleep(500);
    }
    const r = await page.send("Runtime.evaluate", {
      expression: EXTRACT_FN,
      returnByValue: true,
      awaitPromise: false,
    });
    if (!r || !r.result || !r.result.value) throw new Error("页面取数失败（无返回值）");
    return { data: r.result.value };
  } catch (err) {
    return { error: err.message };
  }
}

async function cdpJson(port, pathname, method = "GET") {
  const res = await fetch(`http://127.0.0.1:${port}${pathname}`, { method });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// ---------------------------------------------------------------------------
// 4) 归一化 / 对比
// ---------------------------------------------------------------------------
function normalizeLines(pieces) {
  const out = [];
  for (const raw of pieces) {
    let s = String(raw).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    if (!s) continue;
    for (const [re, rep] of VOLATILE_RULES) s = s.replace(re, rep);
    s = s.replace(/\s+/g, " ").trim();
    if (!s) continue;
    if (out[out.length - 1] !== s || s.length > 1) out.push(s);
  }
  // 去掉归一化后变成占位符堆叠的空壳行（例如只剩 <BUSY>）
  return out.filter((l) => l.replace(/<[A-Z]+>/g, "").replace(/[\s|·:：]/g, "").length > 0);
}

function fingerprint(data) {
  const tags = Object.entries(data.tagCounts || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  const ids = Object.entries(data.ids || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(" ") || "(none)";
  return { tags, ids };
}

function buildSnapshot(route, data, source, version) {
  const lines = normalizeLines(data.pieces || []);
  const fp = fingerprint(data);
  const header = [
    `# route: ${route}`,
    `# source: ${source}`,
    `# appVersion: ${version}`,
    `# title: ${data.title || ""}`,
    `# visible-nodes: ${data.visibleNodes ?? ""}`,
    `# html-bytes-bucket: ${bucket(data.htmlBytes || 0)}`,
    `# tags: ${fp.tags}`,
    `# ids: ${fp.ids}`,
  ];
  return `${[...header, "# --- visible text ---", ...lines].join("\n")}\n`;
}

function bucket(n) {
  // 只做量级检查（防止「整页渲染成空壳」），避免因 1 字节波动天天报警
  if (n === 0) return "0";
  const p = Math.pow(10, Math.max(0, String(n).length - 2));
  return `~${Math.round(n / p) * p}`;
}

function diffLines(baseText, curText) {
  // 按行拆时容忍 CR：本机 git 的 core.autocrlf=true 会把基线检出成 CRLF，
  // 若不剥掉行尾 \r，每一行都会假报差异（尽管 .gitattributes 已声明 eol=lf，这里再兜一层）。
  const base = baseText.split(/\r?\n/);
  const cur = curText.split(/\r?\n/);
  // 头部元信息里有两个**天生随环境/版本浮动**的字段，不能参与比对，否则必然假红灯：
  //   - html-bytes-bucket：本机 Edge 155 与 CI Chromium 155 渲染体积可差一档（实测 ~6300 vs ~6400）
  //   - appVersion：每次发版都会变，存进基线等于「发版即红灯」
  // 它们仍会写进基线文件（留作人工参考），只是不参与判定。
  const VOLATILE_HEAD = [/^#\s*html-bytes-bucket:/, /^#\s*appVersion:/];
  const isVolatile = (l) => VOLATILE_HEAD.some((re) => re.test(l));
  const head = (arr) => arr.filter((l) => l.startsWith("#") && !isVolatile(l));
  const body = (arr) => arr.filter((l) => !l.startsWith("#"));
  const diffs = [];
  for (const a of head(base)) if (!cur.includes(a)) diffs.push(`- ${a}`);
  for (const b of head(cur)) if (!base.includes(b)) diffs.push(`+ ${b}`);
  const bl = body(base);
  const cl = body(cur);
  const max = Math.max(bl.length, cl.length);
  let shown = 0;
  for (let i = 0; i < max && shown < 40; i++) {
    if (bl[i] !== cl[i]) {
      diffs.push(`  line ${i + 1}:\n    - ${bl[i] ?? "(缺行)"}\n    + ${cl[i] ?? "(多行)"}`);
      shown++;
    }
  }
  if (bl.length !== cl.length) diffs.push(`  行数不同：基线 ${bl.length} 行，当前 ${cl.length} 行`);
  return diffs;
}

// ---------------------------------------------------------------------------
// 5) 静态检查（降级路径）
// ---------------------------------------------------------------------------
/**
 * 仅在浏览器/渲染不可用时使用：直接在构建产物里断言关键文案。
 * 触发条件（任一，且脚本会原样打印原因）：
 *   a) 找不到浏览器可执行文件；
 *   b) CDP 端口连不上（例如浏览器被安全软件拦掉、无头启动即退出）；
 *   c) 抓到的 DOM 里没有 Nuxt 应用挂载结果（#__nuxt 为空）。
 * 覆盖能力明确弱于渲染快照：**只保证「文案在产物里」**，不能发现 CSS/交互/顺序回归。
 */
function staticCheck(routes, version) {
  const chunksDir = path.join(OUT_DIR, "_nuxt");
  const chunkTexts = [];
  for (const f of fs.readdirSync(chunksDir)) {
    if (!f.endsWith(".js")) continue;
    const p = path.join(chunksDir, f);
    if (fs.statSync(p).size > 8 * 1024 * 1024) continue;
    chunkTexts.push({ file: f, text: fs.readFileSync(p, "utf8") });
  }
  const guards = JSON.parse(fs.readFileSync(GUARDS_FILE, "utf8"));
  const results = [];
  for (const route of routes) {
    const cfg = guards[route];
    if (!cfg) {
      results.push({ route, ok: false, detail: "guards.json 里没有这条路由的静态断言" });
      continue;
    }
    const problems = [];
    for (const needle of cfg.mustContain || []) {
      const hit = chunkTexts.find((c) => c.text.includes(needle));
      if (!hit) problems.push(`产物 chunk 中找不到文案「${needle}」`);
    }
    for (const bad of guards._global?.forbiddenArtifacts || []) {
      const hit = chunkTexts.find((c) => c.text.includes(bad));
      if (hit) problems.push(`产物 chunk ${hit.file} 里出现了历史踩坑标识符「${bad}」`);
    }
    results.push({
      route,
      ok: problems.length === 0,
      detail: problems.join("；") || `${(cfg.mustContain || []).length} 条文案齐`,
    });
  }
  void version;
  return results;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      "用法：node scripts/verify-render.cjs [--build] [--write-baseline] [--only <关键字>] [--port N] [--edge <path>] [--json] [--allow-degraded]",
    );
    return 0;
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const version = pkg.version;

  if (args.build) runBuild();
  const chunks = checkArtifacts();
  log(`[2/5] 产物就绪：${OUT_DIR}（${chunks.length} 个 JS chunk）`);

  const routes = args.only ? ROUTES.filter((r) => r.includes(args.only)) : ROUTES;
  if (!routes.length) {
    console.error(`[verify-render] --only ${args.only} 没匹配到任何路由`);
    return 2;
  }

  const { server, port, url } = await startServer(args.port);
  log(`[3/5] 本地静态服务 http://127.0.0.1:${port}（SPA 回退 200.html）`);

  const edgePath = findEdge(args.edge);
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), `jplingo-render-${Date.now()}-`));
  let degraded = null;
  let degradedKind = null;
  let browser = null;
  let page = null;
  const snapshots = new Map();

  try {
    if (!edgePath) {
      degraded = "找不到浏览器可执行文件（msedge/chrome 均不存在）";
      degradedKind = "missing-browser";
    } else {
      try {
        browser = await launchBrowser(edgePath, profileDir, 9400 + (port % 100));
        log(`[4/5] 无头浏览器就绪：${browser.version.Browser}（CDP :${browser.port}，profile ${profileDir}）`);
        page = await openPage(browser.port);
      } catch (err) {
        degraded = `CDP 通道不可用：${err.message}`;
        degradedKind = "browser-unavailable";
      }
    }

    if (!degraded) {
      for (const route of routes) {
        const r = await captureRoute(page, url, route);
        if (r.error) {
          degraded = `路由 ${route} 抓取失败：${r.error}`;
          degradedKind = "browser-unavailable";
          break;
        }
        const data = r.data;
        if (!data.tagCounts || !(data.tagCounts.div || data.tagCounts.main || data.tagCounts.nav)) {
          degraded = `路由 ${route} 的 DOM 里没有应用挂载结果（#__nuxt 为空）`;
          degradedKind = "browser-unavailable";
          break;
        }
        snapshots.set(route, buildSnapshot(route, data, "headless-browser-cdp", version));
        process.stdout.write(`      抓取 ${route} → ${normalizeLines(data.pieces).length} 行可见文本\n`);
      }
    }
  } finally {
    if (page) page.close();
    if (browser) killTree(browser.child);
    if (!args.keepOut) {
      try {
        fs.rmSync(profileDir, { recursive: true, force: true });
      } catch {
        /* profile 可能仍被占用，留着无害 */
      }
    }
    server.close();
  }

  const guards = JSON.parse(fs.readFileSync(GUARDS_FILE, "utf8"));

  // ---- 降级路径 ----
  if (degraded) {
    log(`\n[!] 渲染快照降级为「静态检查」，原因：${degraded}`);
    log("    静态检查只断言「构建产物里存在关键文案 / 不存在历史踩坑标识符」，");
    log("    无法发现 CSS、交互、顺序类回归。");
    const results = staticCheck(routes, version);
    let failed = 0;
    for (const r of results) {
      log(`    ${r.ok ? "[ok]" : "[FAIL]"} ${r.route}${r.ok ? "" : "  -> " + r.detail}`);
      if (!r.ok) failed++;
    }
    log(`\n静态检查：${results.length} 条路由，失败 ${failed} 条`);
    if (failed) return 1;
    // 关键：**浏览器存在却起不来**不能让脚本静默变绿（否则 CI/本地都会误判「快照通过」）。
    // 只有显式 --allow-degraded（或确实没有浏览器）才允许以 0 退出。
    if (degradedKind === "browser-unavailable" && !args.allowDegraded) {
      log("\n[FAIL] 浏览器存在但渲染快照取不到 → 按失败退出（要接受降级请显式加 --allow-degraded）。");
      return 2;
    }
    return 0;
  }

  // ---- 基线写入 / 对比 ----
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
  const writing = args.write || !fs.existsSync(BASELINE_DIR) || fs.readdirSync(BASELINE_DIR).filter((f) => f.endsWith(".txt")).length === 0;
  log(`\n[5/5] ${writing ? "写入基线" : "与基线对比"}（${BASELINE_DIR}）`);

  let problems = 0;
  const jsonOut = [];
  for (const route of routes) {
    const snap = snapshots.get(route);
    if (!snap) {
      log(`  [FAIL] ${route} 没有抓到快照`);
      problems++;
      continue;
    }
    const file = path.join(BASELINE_DIR, `${fileForRoute(route)}.txt`);
    const guard = guards[route] || { mustContain: [], mustNotContain: [] };
    const guardProblems = [];
    for (const needle of guard.mustContain || []) {
      if (!snap.includes(needle)) guardProblems.push(`缺少必备文案「${needle}」`);
    }
    for (const bad of guard.mustNotContain || []) {
      if (snap.includes(bad)) guardProblems.push(`出现了禁止文案「${bad}」`);
    }

    if (writing) {
      fs.writeFileSync(file, snap, "utf8");
      log(
        `  [write] ${route} → ${path.relative(ROOT, file)}（护栏 ${guardProblems.length ? "有 " + guardProblems.length + " 条不满足" : "满足"}）`,
      );
      if (guardProblems.length) {
        log(`          ! ${guardProblems.join("；")}`);
        problems++;
      }
      jsonOut.push({ route, file: path.relative(ROOT, file), wrote: true, guardProblems });
      continue;
    }

    if (!fs.existsSync(file)) {
      log(`  [FAIL] ${route} 基线文件不存在：${path.relative(ROOT, file)}（先跑 --write-baseline）`);
      problems++;
      continue;
    }
    const baseText = fs.readFileSync(file, "utf8");
    const diffs = [...guardProblems.map((p) => `护栏不满足：${p}`), ...diffLines(baseText, snap)];
    if (diffs.length) {
      log(`  [FAIL] ${route} 与基线有差异：`);
      for (const d of diffs) log(`      ${d}`);
      problems++;
    } else {
      log(`  [ok] ${route} 无差异（${baseText.split(/\r?\n/).filter((l) => l && !l.startsWith("#")).length} 行可见文本）`);
    }
    jsonOut.push({ route, file: path.relative(ROOT, file), wrote: false, diffs });
  }

  log(`\n合计 ${routes.length} 条路由，${problems ? `差异/问题 ${problems} 条` : "无差异"}`);
  if (args.json) console.log(JSON.stringify({ writing, problems, routes: jsonOut }, null, 2));
  return problems ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("[verify-render] 意外错误：", err);
    process.exit(2);
  });
