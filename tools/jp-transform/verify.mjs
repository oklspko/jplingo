// 对拍自测：每个词的每种变形对照期望值
import { conjugateVerb, conjugateNoun, conjugateAdjI, conjugateAdjNa } from "./index.mjs";

let pass = 0, fail = 0;
function chk(desc, got, want) {
  if (got === want) { pass++; }
  else { fail++; console.log(`  x ${desc}\n     得到: ${got}\n     期望: ${want}`); }
}

console.log("== 动词 五段 ==");
chk("書く て", conjugateVerb("書く", "かく", "te").form, "書いて");
chk("泳ぐ て", conjugateVerb("泳ぐ", "およぐ", "te").form, "泳いで");
chk("話す て", conjugateVerb("話す", "はなす", "te").form, "話して");
chk("待つ て", conjugateVerb("待つ", "まつ", "te").form, "待って");
chk("死ぬ て", conjugateVerb("死ぬ", "しぬ", "te").form, "死んで");
chk("遊ぶ て", conjugateVerb("遊ぶ", "あそぶ", "te").form, "遊んで");
chk("読む て", conjugateVerb("読む", "よむ", "te").form, "読んで");
chk("買う て", conjugateVerb("買う", "かう", "te").form, "買って");
chk("行く て 例外", conjugateVerb("行く", "いく", "te").form, "行って");
chk("書く た", conjugateVerb("書く", "かく", "ta").form, "書いた");
chk("読む た", conjugateVerb("読む", "よむ", "ta").form, "読んだ");
chk("書く ます", conjugateVerb("書く", "かく", "masu").form, "書きます");
chk("書く ない", conjugateVerb("書く", "かく", "nai").form, "書かない");
chk("買う ば", conjugateVerb("買う", "かう", "ba").form, "買えば");
chk("買う 意志", conjugateVerb("買う", "かう", "volitional").form, "買おう");
chk("書く 可能", conjugateVerb("書く", "かく", "potential").form, "書ける");
chk("書く 被动", conjugateVerb("書く", "かく", "passive").form, "書かれる");
chk("書く 使役", conjugateVerb("書く", "かく", "causative").form, "書かせる");
chk("書く 命令", conjugateVerb("書く", "かく", "imperative").form, "書け");

console.log("== 动词 一段（上次 bug）==");
chk("食べる て", conjugateVerb("食べる", "たべる", "te").form, "食べて");
chk("見る て", conjugateVerb("見る", "みる", "te").form, "見て");
chk("寝る て", conjugateVerb("寝る", "ねる", "te").form, "寝て");
chk("見る ます", conjugateVerb("見る", "みる", "masu").form, "見ます");
chk("寝る ない", conjugateVerb("寝る", "ねる", "nai").form, "寝ない");
chk("見る 可能", conjugateVerb("見る", "みる", "potential").form, "見られる");
chk("食べる 使役", conjugateVerb("食べる", "たべる", "causative").form, "食べさせる");

console.log("== 动词 サ変・カ変 ==");
chk("する て", conjugateVerb("する", "する", "te").form, "して");
chk("する ない", conjugateVerb("する", "する", "nai").form, "しない");
chk("する 可能", conjugateVerb("する", "する", "potential").form, "できる");
chk("勉強する ます", conjugateVerb("勉強する", "べんきょうする", "masu").form, "勉強します");
chk("来る て", conjugateVerb("来る", "くる", "te").form, "来て");
chk("来る ます", conjugateVerb("来る", "くる", "masu").form, "来ます");
chk("来る ない", conjugateVerb("来る", "くる", "nai").form, "来ない");
chk("来る 命令", conjugateVerb("来る", "くる", "imperative").form, "来い");

console.log("== 动词 う→わ 未然形（上次 bug：買う→買あない）==");
chk("買う ない", conjugateVerb("買う", "かう", "nai").form, "買わない");
chk("買う 被动", conjugateVerb("買う", "かう", "passive").form, "買われる");
chk("買う 使役", conjugateVerb("買う", "かう", "causative").form, "買わせる");
chk("使う ない", conjugateVerb("使う", "つかう", "nai").form, "使わない");
chk("笑う ない", conjugateVerb("笑う", "わらう", "nai").form, "笑わない");

console.log("== 动词 五段る例外（帰る/知る 等，须按汉字判类）==");
chk("帰る ます", conjugateVerb("帰る", "かえる", "masu").form, "帰ります");
chk("帰る て", conjugateVerb("帰る", "かえる", "te").form, "帰って");
chk("帰る ない", conjugateVerb("帰る", "かえる", "nai").form, "帰らない");
chk("知る ます", conjugateVerb("知る", "しる", "masu").form, "知ります");
chk("知る て", conjugateVerb("知る", "しる", "te").form, "知って");
chk("変える ます 一段(勿误判)", conjugateVerb("変える", "かえる", "masu").form, "変えます");
chk("見る ます 一段", conjugateVerb("見る", "みる", "masu").form, "見ます");

console.log("== kana / romaji ==");
chk("読む て kana", conjugateVerb("読む", "よむ", "te").kana, "よんで");
chk("行く て kana", conjugateVerb("行く", "いく", "te").kana, "いって");
chk("書く て romaji", conjugateVerb("書く", "かく", "te").romaji, "kaite");

console.log("== 名词谓语句 ==");
chk("先生 简现在肯", conjugateNoun("先生", "せんせい", "plain_pres_aff").form, "先生だ");
chk("先生 简现在否", conjugateNoun("先生", "せんせい", "plain_pres_neg").form, "先生ではない");
chk("先生 简过去肯", conjugateNoun("先生", "せんせい", "plain_past_aff").form, "先生だった");
chk("先生 简过去否", conjugateNoun("先生", "せんせい", "plain_past_neg").form, "先生ではなかった");
chk("先生 敬现在否", conjugateNoun("先生", "せんせい", "polite_pres_neg").form, "先生ではありません");
chk("先生 敬过去否", conjugateNoun("先生", "せんせい", "polite_past_neg").form, "先生ではありませんでした");

console.log("== い形容词谓语句 ==");
chk("高い 简现在肯", conjugateAdjI("高い", "たかい", "plain_pres_aff").form, "高い");
chk("高い 简现在否", conjugateAdjI("高い", "たかい", "plain_pres_neg").form, "高くない");
chk("高い 简过去肯", conjugateAdjI("高い", "たかい", "plain_past_aff").form, "高かった");
chk("高い 简过去否", conjugateAdjI("高い", "たかい", "plain_past_neg").form, "高くなかった");
chk("安い 敬现在否", conjugateAdjI("安い", "やすい", "polite_pres_neg").form, "安くないです");

console.log("== な形容词谓语句 ==");
chk("静か 简现在肯", conjugateAdjNa("静か", "しずか", "plain_pres_aff").form, "静かだ");
chk("静か 简现在否", conjugateAdjNa("静か", "しずか", "plain_pres_neg").form, "静かではない");
chk("静か 简过去肯", conjugateAdjNa("静か", "しずか", "plain_past_aff").form, "静かだった");
chk("元気 简过去否", conjugateAdjNa("元気", "げんき", "plain_past_neg").form, "元気ではなかった");
chk("静か 敬过去肯", conjugateAdjNa("静か", "しずか", "polite_past_aff").form, "静かでした");

console.log(`\n==== 结果: ${pass} 通过 / ${fail} 失败 ====`);
process.exit(fail === 0 ? 0 : 1);
