// 课程数据热更新测试：纯逻辑（planUpdate 等）+ 引擎（检查/更新/校验失败/回退）
// 运行：node tests/offline-tts/run.cjs
import { mockState } from "@capacitor/core";
import { fsState } from "@capacitor/filesystem";
import {
  base64ToBytes,
  formatBytes,
  normalizeEol,
  planUpdate,
  sha256Hex,
  shortVersion,
  verifyAgainstCache,
  verifySize,
  type DataManifest,
} from "../../app/utils/jpDataPack";
import { fetchDataJson, readAppliedManifest } from "../../app/composables/jp/useJpData";
import {
  applyDataUpdate,
  checkDataUpdate,
  resetDataCache,
} from "../../app/composables/jp/useJpDataUpdate";

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

const BASE = "https://www.jplingo.cn";
const INDEX = "courses/course-packs.json";
const COURSE = "courses/jp-growing/jp-grow-01.json";
const WORDS = "dict/words.json";
const NEW_COURSE = "courses/jp-growing/jp-grow-06.json";

/** 构造清单（文件大小/哈希都按真实内容算，方便验证校验逻辑） */
async function stageRemote(files: Array<[string, string]>, version: string): Promise<DataManifest> {
  const entries = [];
  for (const [path, text] of files) {
    const bytes = new TextEncoder().encode(text);
    fsState.downloadContents.set(`${BASE}/${path}`, text);
    entries.push({ path, size: bytes.length, sha256: await sha256Hex(bytes) });
  }
  const manifest: DataManifest = {
    version,
    generatedAt: "2026-10-01T00:00:00.000Z",
    base: BASE,
    files: entries,
  };
  fsState.downloadContents.set(`${BASE}/data/manifest.json`, JSON.stringify(manifest));
  return manifest;
}

function serveBundled(manifest: DataManifest) {
  (globalThis as Record<string, unknown>).fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => JSON.parse(JSON.stringify(manifest)),
  });
}

function resetFs() {
  fsState.files.clear();
  fsState.contents.clear();
  fsState.downloads.length = 0;
  fsState.failUrls.clear();
  fsState.truncateTo.clear();
  fsState.downloadContents.clear();
}

async function main() {
  (globalThis as Record<string, unknown>).useRuntimeConfig = () => ({
    public: { dataBaseUrl: BASE, buildId: "test" },
  });
  mockState.native = true;
  mockState.pluginAvailable = true;

  console.log("\n[1] 纯逻辑：版本相同不更新；只下变化的文件；索引排最后");
  {
    const bundled: DataManifest = {
      version: "sha256:v1",
      files: [
        { path: INDEX, size: 10, sha256: "h1" },
        { path: COURSE, size: 20, sha256: "h2" },
      ],
    };
    eq("版本相同 → 无更新", planUpdate(bundled, null, bundled).hasUpdate, false);

    const remote: DataManifest = {
      version: "sha256:v2",
      files: [
        { path: INDEX, size: 11, sha256: "h1b" },
        { path: COURSE, size: 20, sha256: "h2" },
        { path: NEW_COURSE, size: 30, sha256: "h6" },
      ],
    };
    const plan = planUpdate(bundled, null, remote);
    eq("检测到更新", plan.hasUpdate, true);
    eq("只下变化+新增", plan.download.map((f) => f.path), [NEW_COURSE, INDEX]);
    eq("索引排最后（先下课程再切索引）", plan.download.at(-1)?.path, INDEX);
    eq("下载字节数", plan.downloadBytes, 41);

    const applied: DataManifest = { version: "sha256:v2", files: remote.files };
    const remote3: DataManifest = {
      version: "sha256:v3",
      files: [{ path: INDEX, size: 11, sha256: "h1b" }],
    };
    const plan3 = planUpdate(bundled, applied, remote3);
    eq("已应用清单优先于内置（不再重下没变的课）", plan3.download, []);
    eq("远端删掉的文件要清理", plan3.remove, [COURSE, NEW_COURSE]);
    eq("当前版本取已应用版本", plan3.currentVersion, "sha256:v2");
  }

  console.log("\n[2] 工具函数");
  eq("verifySize 相等通过", verifySize(100, 100), true);
  eq("verifySize 截断失败", verifySize(80, 100), false);
  eq("verifySize 0 字节失败", verifySize(0, 0), false);
  eq("formatBytes MB", formatBytes(6738 * 1024), "6.6 MB");
  eq("shortVersion 取前 8 位", shortVersion("sha256:7647996444fd3e58aa"), "76479964");
  eq("shortVersion 空值", shortVersion(""), "—");
  eq("base64 还原字节", Array.from(base64ToBytes(btoa("ai"))), [97, 105]);
  eq(
    "sha256 空串是已知常量",
    await sha256Hex(new Uint8Array()),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  eq(
    "CRLF 与 LF 归一化后哈希相同（不受开发机 core.autocrlf 影响）",
    await sha256Hex(new TextEncoder().encode('{\r\n  "a": 1\r\n}\r\n')),
    await sha256Hex(new TextEncoder().encode('{\n  "a": 1\n}\n')),
  );
  eq(
    "normalizeEol 只丢 CR、长度正确",
    Array.from(normalizeEol(new TextEncoder().encode("a\r\nb\r\n"))),
    [97, 10, 98, 10],
  );

  console.log("\n[3] 引擎：内置与远端一致 → 不更新");
  {
    resetFs();
    const v1 = await stageRemote(
      [
        [INDEX, '{"coursePacks":[1]}'],
        [COURSE, '{"id":"jp-grow-01"}'],
        [WORDS, '{"words":[1,2,3]}'],
      ],
      "sha256:v1",
    );
    serveBundled(v1);
    const plan = await checkDataUpdate();
    eq("无更新", plan?.hasUpdate, false);
    // 只下载了清单本身，没有任何数据文件
    const downloads = fsState.downloads.map((u) => u.replace(`${BASE}/`, ""));
    eq("只取了清单，没下任何数据文件", downloads, ["data/manifest.json"]);
  }

  console.log("\n[4] 引擎：新增一课 → 只下新课和索引，并写入 _applied.json");
  {
    resetFs();
    const v1 = await stageRemote(
      [
        [INDEX, '{"coursePacks":[1]}'],
        [COURSE, '{"id":"jp-grow-01"}'],
        [WORDS, '{"words":[1,2,3]}'],
      ],
      "sha256:v1",
    );
    serveBundled(v1);
    const v2 = await stageRemote(
      [
        [INDEX, '{"coursePacks":[1,6]}'],
        [COURSE, '{"id":"jp-grow-01"}'],
        [WORDS, '{"words":[1,2,3]}'],
        [NEW_COURSE, '{"id":"jp-grow-06"}'],
      ],
      "sha256:v2",
    );

    const plan = await checkDataUpdate();
    eq("检测到新数据", plan?.hasUpdate, true);
    eq("待下载文件", plan?.download.map((f) => f.path), [NEW_COURSE, INDEX]);
    eq("更新成功", await applyDataUpdate(plan), true);

    const downloaded = fsState.downloads.map((u) => u.replace(`${BASE}/`, ""));
    check("下过新课", downloaded.includes(NEW_COURSE));
    check("下过索引", downloaded.includes(INDEX));
    check("没重下没变的课", !downloaded.includes(COURSE));
    check("没重下没变的词库", !downloaded.includes(WORDS));
    eq("_applied.json 记录了新版本", (await readAppliedManifest())?.version, "sha256:v2");
    eq("缓存里能读到新课内容", await fetchDataJson(NEW_COURSE), { id: "jp-grow-06" });
    void v2;
  }

  console.log("\n[5] 引擎：文件被截断 → 中止更新并保留旧数据");
  {
    resetFs();
    const v1 = await stageRemote(
      [
        [INDEX, '{"coursePacks":[1]}'],
        [COURSE, '{"id":"jp-grow-01"}'],
      ],
      "sha256:v1",
    );
    serveBundled(v1);
    const v2 = await stageRemote(
      [
        [INDEX, '{"coursePacks":[1,6]}'],
        [COURSE, '{"id":"jp-grow-01"}'],
        [NEW_COURSE, '{"id":"jp-grow-06"}'],
      ],
      "sha256:v2",
    );
    fsState.truncateTo.set(`${BASE}/${NEW_COURSE}`, 5); // 只下到 5 字节

    const plan = await checkDataUpdate();
    eq("更新失败", await applyDataUpdate(plan), false);
    eq("失败时不写版本号（继续用旧数据/内置）", await readAppliedManifest(), null);
    void v2;
  }

  console.log("\n[6] 读取层：缓存优先；没有缓存回退内置资源");
  {
    resetFs();
    fsState.contents.set("DATA/jp-data/courses/x.json", '{"from":"cache"}');
    fsState.files.set("DATA/jp-data/courses/x.json", 16);
    let fetched = false;
    (globalThis as Record<string, unknown>).fetch = async () => {
      fetched = true;
      return { ok: true, status: 200, json: async () => ({ from: "bundled" }) };
    };
    eq("有缓存时用缓存", await fetchDataJson("courses/x.json"), { from: "cache" });
    eq("不发起网络请求", fetched, false);

    resetFs();
    eq("没有缓存时回退内置资源", await fetchDataJson("courses/x.json"), { from: "bundled" });
    eq("发起了网络请求", fetched, true);
  }

  console.log("\n[7] 恢复内置数据");
  {
    resetFs();
    fsState.contents.set("DATA/jp-data/_applied.json", '{"version":"sha256:v2","files":[{}]}');
    fsState.files.set("DATA/jp-data/_applied.json", 10);
    check("先确认缓存存在", (await readAppliedManifest()) !== null);
    await resetDataCache();
    eq("缓存已清空", await readAppliedManifest(), null);
  }

  console.log("\n[8] 更新记录丢失时不再反复提示：按缓存实际内容复核");
  {
    resetFs();
    // 内置清单是旧的，远端是新版；但缓存里其实已经存着新版内容（模拟记录文件丢失）
    const bundled: DataManifest = {
      version: "sha256:old",
      files: [{ path: COURSE, size: 5, sha256: "old-hash" }],
    };
    const newText = '{"v":2}';
    const newBytes = new TextEncoder().encode(newText);
    const remote: DataManifest = {
      version: "sha256:new",
      files: [{ path: COURSE, size: newBytes.length, sha256: await sha256Hex(newBytes) }],
    };
    const plan = planUpdate(bundled, null, remote);
    eq("按内置基线看：需要更新", plan.hasUpdate, true);

    const verified = await verifyAgainstCache(plan, async (p) =>
      p === COURSE ? newBytes : null,
    );
    eq("按缓存内容复核后：无需更新", verified.hasUpdate, false);
    eq("待下载清空", verified.download.length, 0);

    const notCached = await verifyAgainstCache(plan, async () => null);
    eq("缓存里没有该文件时仍然要下载", notCached.hasUpdate, true);

    // 版本号不同但内容一样（只改了生成时间）也算「无需更新」
    const sameContent: DataManifest = { ...remote, version: "sha256:another" };
    const samePlan = planUpdate(bundled, null, sameContent);
    const afterCheck = await verifyAgainstCache(samePlan, async () => newBytes);
    eq("内容一致就不提示更新（哪怕版本号不同）", afterCheck.hasUpdate, false);
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
