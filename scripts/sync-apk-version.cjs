// 把 package.json 的版本号同步进 android/app/build.gradle 的 versionCode / versionName。
// 版本唯一来源是 package.json（见 nuxt.config.ts / commit e35fb45），
// CI 打包 APK 前调用本脚本，避免手工维护 versionCode 忘记递增导致无法覆盖安装。
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const parts = String(pkg.version).split(".").map((s) => parseInt(s, 10) || 0);
const major = parts[0] || 0;
const minor = parts[1] || 0;
const patch = parts[2] || 0;
// versionCode 单调递增：1.0.4 -> 10004，1.1.0 -> 10100
const versionCode = major * 10000 + minor * 100 + patch;

const gradlePath = path.join(root, "android", "app", "build.gradle");
let text = fs.readFileSync(gradlePath, "utf8");

const beforeCode = text.match(/versionCode\s+\d+/);
const beforeName = text.match(/versionName\s+"[^"]*"/);

text = text
  .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
  .replace(/versionName\s+"[^"]*"/, `versionName "${pkg.version}"`);

fs.writeFileSync(gradlePath, text);
console.log(
  `APK 版本同步：${beforeCode ? beforeCode[0] : "versionCode ?"} / ${beforeName ? beforeName[0] : "versionName ?"}` +
    ` -> versionCode ${versionCode} / versionName "${pkg.version}"`,
);
