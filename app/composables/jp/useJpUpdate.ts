import { ref } from "vue";

// 版本更新检查：拉取 GitHub Releases 最新 tag，与当前 appVersion 对比。
// appVersion 来自 nuxt.config 的 runtimeConfig.public.appVersion（唯一来源是 package.json），
// 因此发新版本 = 改 package.json 版本号 + 打 v* 标签（由 CI 发布 jp-lingo.apk）。
// 原生 App 点「立即更新」会在系统浏览器打开 APK 下载地址，让用户下载安装。

const REPO_API =
  "https://api.github.com/repos/oklspko/jplingo/releases/latest";
const DEFAULT_APK_URL =
  "https://github.com/oklspko/jplingo/releases/latest/download/jp-lingo.apk";

function stripV(v: string): string {
  return v.replace(/^v/i, "");
}

// 把 "1.0.4" / "v1.0.4" 之类解析成数字段，非数字段（如 "beta"）当作 0
function parseVersion(v: string): number[] {
  return stripV(v)
    .split(/[.\-]/)
    .filter((s) => s !== "")
    .map((s) => {
      const n = parseInt(s, 10);
      return Number.isNaN(n) ? 0 : n;
    });
}

// 返回 >0 表示 a 比 b 新，<0 表示 a 比 b 旧，0 相同
function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

export function useJpUpdate(currentVersion: string) {
  const checking = ref(false);
  const checked = ref(false);
  const hasUpdate = ref(false);
  const latestVersion = ref("");
  const apkUrl = ref(DEFAULT_APK_URL);
  const errorMsg = ref("");

  async function checkUpdate() {
    if (checking.value) return;
    checking.value = true;
    errorMsg.value = "";
    try {
      const res = await fetch(REPO_API, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (res.status === 404) {
        // 仓库尚无任何 Release
        checked.value = true;
        hasUpdate.value = false;
        latestVersion.value = "";
        return;
      }
      if (!res.ok) throw new Error(`检查更新失败（HTTP ${res.status}）`);
      const data = await res.json();
      const tag = String(data.tag_name || "");
      latestVersion.value = stripV(tag);
      hasUpdate.value = compareVersions(tag, currentVersion) > 0;

      // 优先用最新 Release 里真实的 .apk 资产地址（避免固定命名失效）
      const apkAsset = (data.assets || []).find((a: any) =>
        String(a.name || "").endsWith(".apk"),
      );
      if (apkAsset?.browser_download_url) {
        apkUrl.value = apkAsset.browser_download_url;
      }
      checked.value = true;
    } catch (err) {
      errorMsg.value = (err as Error).message || "检查更新失败";
      checked.value = true;
    } finally {
      checking.value = false;
    }
  }

  // 原生 App 点「立即更新」：用 _system 在系统浏览器打开 APK 下载页
  function openDownload() {
    window.open(apkUrl.value, "_system");
  }

  return {
    checking,
    checked,
    hasUpdate,
    latestVersion,
    apkUrl,
    errorMsg,
    checkUpdate,
    openDownload,
  };
}
