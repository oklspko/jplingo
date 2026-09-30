const fs = require("fs");
const src = fs.readFileSync("app/data/jp-grammar-points.ts", "utf8");
const m = src.indexOf("grammarPoints");
const e = src.indexOf("=", m);
const s = src.indexOf("[", e);
const en = src.lastIndexOf("]");
const pts = new Function("return (" + src.slice(s, en + 1) + ");")();
const want = process.argv.slice(2);
for (const id of want) {
  const p = pts.find((x) => x.id === id);
  if (!p) { console.log("====" + id + " NOT FOUND"); continue; }
  console.log("=====" + id + " pattern=" + p.pattern);
  console.log("s:", JSON.stringify(p.setsuzoku));
  console.log("m:", JSON.stringify(p.meaning));
  (p.examples || []).forEach((x, i) => console.log("  ex" + i + " jp:", JSON.stringify(x.jp), "\n      zh:", JSON.stringify(x.zh)));
  console.log("n:", JSON.stringify(p.note));
  console.log("a:", JSON.stringify(p.analysis));
}
