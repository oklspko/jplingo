// 移动端布局限制：视口宽度被钉在 768 以内，桌面/老旧 WebView 不再命中电脑布局
// 运行：node tests/offline-tts/run.cjs
import { MOBILE_MAX_WIDTH, forceMobileViewport } from "../../app/utils/jpViewport";

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function check(name: string, ok: boolean, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "  [ok]" : "  [FAIL]"} ${name}${detail && !ok ? "  -> " + detail : ""}`);
}
function eq(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  check(name, a === e, `实际 ${a}，期望 ${e}`);
}

/** 造一个带 viewport meta 的假 document，记录写入了什么 */
function fakeDoc(hasMeta = true) {
  const state = { content: "width=device-width, initial-scale=1", writes: 0 };
  const doc = {
    querySelector: (sel: string) => {
      if (!hasMeta || sel !== 'meta[name="viewport"]') return null;
      return {
        setAttribute: (_n: string, v: string) => {
          state.content = v;
          state.writes++;
        },
      };
    },
  };
  return { doc, state };
}

function win(
  hostname: string,
  innerWidth: number,
  userAgent = "Mozilla/5.0 (Linux; Android 13)",
  screenWidth = 0,
  maxTouchPoints = 0,
) {
  return { location: { hostname }, innerWidth, screen: { width: screenWidth }, navigator: { userAgent, maxTouchPoints } };
}

async function main() {
  console.log("\n[1] 桌面浏览器：完全不动（不能影响电脑上的正常布局）");
  {
    const { doc, state } = fakeDoc();
    const changed = forceMobileViewport(
      win("jplingo.cn", 1440, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120"),
      doc,
    );
    eq("返回 false（没改）", changed, false);
    check("viewport 保持原样", state.content === "width=device-width, initial-scale=1", state.content);
  }

  console.log("\n[2] App 内已经是手机宽度：不动（绝大多数手机的情况）");
  {
    const { doc, state } = fakeDoc();
    eq("返回 false", forceMobileViewport(win("localhost", 393), doc), false);
    eq("没写入 meta", state.writes, 0);
  }

  console.log("\n[3] App 内视口报得比 768 大（老旧 WebView 默认 980 / 平板）：钉到 768");
  {
    const { doc, state } = fakeDoc();
    eq("返回 true（改写了）", forceMobileViewport(win("localhost", 980), doc), true);
    eq(
      "viewport 变成 768 宽 + 等比放大",
      state.content,
      `width=${MOBILE_MAX_WIDTH}, initial-scale=1.276, maximum-scale=1.276`,
    );
    check("放大后仍铺满屏幕（768×1.276≈980）", Math.abs(768 * 1.276 - 980) < 1, state.content);
  }
  {
    const { doc, state } = fakeDoc();
    eq("平板 1280 也一样处理", forceMobileViewport(win("localhost", 1280), doc), true);
    check("scale 随屏宽等比", state.content.includes("1.667"), state.content);
  }

  console.log("\n[4] 手机浏览器（非 App）也兜住：老浏览器按 980 排版时同样钉到 768");
  {
    const { doc } = fakeDoc();
    eq("安卓手机 UA + 980 视口 → 改写", forceMobileViewport(win("jp-lingo.pages.dev", 980), doc), true);
  }
  {
    const { doc, state } = fakeDoc();
    const changed = forceMobileViewport(win("example.com", 980, "Mozilla/5.0 (Macintosh; Intel Mac OS X)"), doc);
    eq("非手机 UA 不动", changed, false);
    eq("meta 没被改", state.writes, 0);
  }

  console.log("\n[5] 边界与容错");
  {
    const { doc } = fakeDoc();
    eq("正好 768：不折腾", forceMobileViewport(win("localhost", 768), doc), false);
  }
  {
    const { doc } = fakeDoc();
    eq("769：改（桌面规则的门槛）", forceMobileViewport(win("localhost", 769), doc), true);
  }
  {
    const { doc } = fakeDoc(false);
    eq("页面里没有 viewport meta：安全返回 false", forceMobileViewport(win("localhost", 980), doc), false);
  }
  {
    const broken = {
      querySelector() {
        throw new Error("boom");
      },
    };
    eq("异常被吞掉，不拖垮启动", forceMobileViewport(win("localhost", 980), broken), false);
  }

  console.log("\n[6] 国产内核 / UA 认不出来也要兜住（微信 X5、QQ、UC…，或靠 screen.width）");
  {
    const { doc } = fakeDoc();
    const wx = win(
      "www.jplingo.cn",
      980,
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.44",
    );
    eq("微信（980 视口）→ 改写", forceMobileViewport(wx, doc), true);
  }
  {
    const { doc } = fakeDoc();
    const qq = win(
      "www.jplingo.cn",
      980,
      "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/107 Mobile Safari/537.36 MQQBrowser/6.2",
    );
    eq("QQ 浏览器（980 视口）→ 改写", forceMobileViewport(qq, doc), true);
  }
  {
    const { doc } = fakeDoc();
    // UA 完全认不出来（自定义内核），但屏幕就是 390 → 按手机处理
    const weird = win("www.jplingo.cn", 980, "SomeCustomKernel/1.0", 390, 5);
    eq("UA 认不出但 screen.width=390 → 改写", forceMobileViewport(weird, doc), true);
  }
  {
    const { doc } = fakeDoc();
    // 真桌面：屏宽 1920 且无触控 → 不动
    const desktop = win("www.jplingo.cn", 1440, "SomeCustomKernel/1.0", 1920, 0);
    eq("宽屏无触控（认不出 UA）→ 不动", forceMobileViewport(desktop, doc), false);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n合计 ${results.length} 项，失败 ${failed.length} 项`);
  if (failed.length) {
    console.log("失败项：");
    for (const f of failed) console.log(`  - ${f.name}  ${f.detail ?? ""}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("测试自身异常：", err);
  process.exit(2);
});
