const fs = require("fs");
const c = JSON.parse(fs.readFileSync("public/courses/jp-growing/jp-grow-01.json", "utf8"));
const words = new Set(), sents = [];
for (const s of c.statements) {
  if ((s.tokens || []).length > 1) sents.push(s); else words.add(s.japanese);
}
const missing = new Set();
for (const s of sents) for (const t of s.tokens) if (!words.has(t.text)) missing.add(t.text);
console.log("单句词数:", words.size, "句数:", sents.length);
console.log("未单练token:", [...missing].join(" ") || "(无)");
// growth check: each sentence should add >=0 new content tokens
for (const s of sents) console.log(s.id, s.japanese);
