const fs = require("fs");
const src = fs.readFileSync("app/data/jp-grammar-points.ts", "utf8");
const m = src.indexOf("grammarPoints");
const e = src.indexOf("=", m);
const s = src.indexOf("[", e);
const en = src.lastIndexOf("]");
const pts = new Function("return (" + src.slice(s, en + 1) + ");")();
const by = {};
for (const p of pts) (by[p.level] ||= []).push(p);
const order = ["N5","N4","N3","N2","N1"];
for (const lv of order) {
  const list = by[lv] || [];
  console.log("\n########## " + lv + " (" + list.length + ") ##########");
  list.forEach((p, i) => {
    const pos = i + 1;
    console.log(`\n== ${lv}#${pos} [${p.id}] ${p.pattern}`);
    console.log("  s: " + JSON.stringify(p.setsuzoku));
    console.log("  m: " + JSON.stringify(p.meaning));
    (p.examples||[]).forEach((x,j)=>console.log(`  ex${j}: ` + JSON.stringify(x.jp) + "  ||  " + JSON.stringify(x.zh)));
    console.log("  n: " + JSON.stringify(p.note));
    console.log("  a: " + JSON.stringify(p.analysis));
  });
}
