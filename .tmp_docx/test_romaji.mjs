import { toRomaji, toHiragana } from "wanakana";
const cases = ["たべる","こーひー","ぎゅうにゅう","がっこう","おちゃ","ぱん","かぜをひく","りーだー","ぜったい","つらい","あたたかい","しょうじき","もうしでる","しばらく","さっそく"];
for (const k of cases) {
  console.log(`${k}\t->\t${toRomaji(k)}`);
}
console.log("--- katakana to hiragana ---");
console.log("タベル ->", toHiragana("タベル"));
console.log("コーヒー ->", toHiragana("コーヒー"));
console.log("リーダー ->", toHiragana("リーダー"));
