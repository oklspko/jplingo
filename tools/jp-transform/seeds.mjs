// jp-transform 变形课程词源（N5/N4 高频，含读音）。
// 读音是必需的：动词活用类型必须靠「读音的末尾假名」判定（汉字无法判段），
// 且生成的课程每条语句都要有 kana（假名读音）供发音 / 罗马字提示 / 输入判定使用。

// 五段（一类）：覆盖全部音便与词尾模式
//   く→いて / ぐ→いで / す→して / う・つ・る→って / ぬ・ぶ・む→んで / 行く→って（例外）
//   る 结尾五段（帰る・知る・走る・入る）是上一段/下一段规则的例外，须按汉字白名单判类。
const GODAN = [
  { dict: "書く", kana: "かく", chinese: "写" },
  { dict: "泳ぐ", kana: "およぐ", chinese: "游泳" },
  { dict: "話す", kana: "はなす", chinese: "说" },
  { dict: "買う", kana: "かう", chinese: "买" },
  { dict: "待つ", kana: "まつ", chinese: "等" },
  { dict: "帰る", kana: "かえる", chinese: "回（家）" },
  { dict: "死ぬ", kana: "しぬ", chinese: "死" },
  { dict: "遊ぶ", kana: "あそぶ", chinese: "玩" },
  { dict: "読む", kana: "よむ", chinese: "读" },
  { dict: "行く", kana: "いく", chinese: "去" },
  { dict: "飲む", kana: "のむ", chinese: "喝" },
  { dict: "使う", kana: "つかう", chinese: "使用" },
  { dict: "急ぐ", kana: "いそぐ", chinese: "赶（时间）" },
  { dict: "出す", kana: "だす", chinese: "拿出" },
  { dict: "持つ", kana: "もつ", chinese: "拿" },
  { dict: "呼ぶ", kana: "よぶ", chinese: "叫" },
  { dict: "住む", kana: "すむ", chinese: "住" },
  { dict: "笑う", kana: "わらう", chinese: "笑" },
  { dict: "働く", kana: "はたらく", chinese: "工作" },
  { dict: "歩く", kana: "あるく", chinese: "走路" },
  { dict: "洗う", kana: "あらう", chinese: "洗" },
  { dict: "立つ", kana: "たつ", chinese: "站" },
  { dict: "売る", kana: "うる", chinese: "卖" },
  { dict: "知る", kana: "しる", chinese: "知道" },
  { dict: "走る", kana: "はしる", chinese: "跑" },
  { dict: "入る", kana: "はいる", chinese: "进入" },
];

// 一段（二类）：去 る 直接接续
const ICHIDAN = [
  { dict: "食べる", kana: "たべる", chinese: "吃" },
  { dict: "見る", kana: "みる", chinese: "看" },
  { dict: "起きる", kana: "おきる", chinese: "起床" },
  { dict: "寝る", kana: "ねる", chinese: "睡" },
  { dict: "教える", kana: "おしえる", chinese: "教" },
  { dict: "開ける", kana: "あける", chinese: "打开" },
  { dict: "覚える", kana: "おぼえる", chinese: "记住" },
  { dict: "出かける", kana: "でかける", chinese: "出门" },
];

// サ変（三类）：する 结尾
const SURU = [
  { dict: "する", kana: "する", chinese: "做" },
  { dict: "勉強する", kana: "べんきょうする", chinese: "学习" },
  { dict: "掃除する", kana: "そうじする", chinese: "打扫" },
  { dict: "洗濯する", kana: "せんたくする", chinese: "洗衣服" },
];

// カ変（三类）：来る
const KURU = [{ dict: "来る", kana: "くる", chinese: "来" }];

export const SEED_VERBS = [...GODAN, ...ICHIDAN, ...SURU, ...KURU];

// 每课必修动词（保证覆盖）：跨全部活用类别 + 全部音便模式 + 行く 例外 + る 结尾五段例外。
// 键为 dict（汉字），因为同读音可能对应不同活用类型（帰る/変える、練る/寝る）。
export const MANDATORY_VERBS = new Set([
  "書く", "行く", "泳ぐ", "話す", "買う", "待つ", "帰る", "知る",
  "死ぬ", "遊ぶ", "読む", // 五段（覆盖全部音便 / 词尾）
  "食べる", "見る", // 一段（含单汉字 見る）
  "する", "勉強する", // サ変
  "来る", // カ変
]);

// 三类谓语句词源
export const SEED_NOUNS = [
  { dict: "学生", kana: "がくせい", chinese: "学生" },
  { dict: "先生", kana: "せんせい", chinese: "老师" },
  { dict: "日本人", kana: "にほんじん", chinese: "日本人" },
  { dict: "学校", kana: "がっこう", chinese: "学校" },
  { dict: "本", kana: "ほん", chinese: "书" },
  { dict: "友達", kana: "ともだち", chinese: "朋友" },
  { dict: "会社員", kana: "かいしゃいん", chinese: "公司职员" },
  { dict: "医者", kana: "いしゃ", chinese: "医生" },
  { dict: "天気", kana: "てんき", chinese: "天气" },
  { dict: "雨", kana: "あめ", chinese: "雨" },
];

// 一类形容词（い形容词）——排除不规则 いい（用 よい 变形，需单独记忆）
export const SEED_A1 = [
  { dict: "高い", kana: "たかい", chinese: "高 / 贵" },
  { dict: "安い", kana: "やすい", chinese: "便宜" },
  { dict: "おいしい", kana: "おいしい", chinese: "好吃" },
  { dict: "大きい", kana: "おおきい", chinese: "大" },
  { dict: "面白い", kana: "おもしろい", chinese: "有趣" },
  { dict: "忙しい", kana: "いそがしい", chinese: "忙" },
  { dict: "小さい", kana: "ちいさい", chinese: "小" },
  { dict: "寒い", kana: "さむい", chinese: "冷" },
  { dict: "暑い", kana: "あつい", chinese: "热" },
  { dict: "新しい", kana: "あたらしい", chinese: "新" },
];

// 二类形容词（な形容词 / 形容动词）——接续与名词相同，词干形式（不带 だ）
export const SEED_A2 = [
  { dict: "きれい", kana: "きれい", chinese: "漂亮 / 干净" },
  { dict: "静か", kana: "しずか", chinese: "安静" },
  { dict: "便利", kana: "べんり", chinese: "方便" },
  { dict: "元気", kana: "げんき", chinese: "精神好" },
  { dict: "有名", kana: "ゆうめい", chinese: "有名" },
  { dict: "賑やか", kana: "にぎやか", chinese: "热闹" },
  { dict: "親切", kana: "しんせつ", chinese: "亲切" },
  { dict: "大切", kana: "たいせつ", chinese: "重要" },
  { dict: "上手", kana: "じょうず", chinese: "擅长" },
  { dict: "暇", kana: "ひま", chinese: "空闲" },
];

// 动词变形课程清单（10 门）：engine 对应 verb-conjugate 的 formKey。
// 时态（过去）与肯否（否定）已在三类谓语句课程中覆盖，这里只列基础变形种类，
// 不再单列 ません / ました / ませんでした / なかった 等派生形。
export const VERB_FORMS = [
  { key: "masu", engine: "masu", label: "ます形" },
  { key: "nai", engine: "nai", label: "ない形" },
  { key: "te", engine: "te", label: "て形" },
  { key: "ta", engine: "ta", label: "た形" },
  { key: "ba", engine: "ba", label: "ば形" },
  { key: "ishi", engine: "volitional", label: "意志形" },
  { key: "kanou", engine: "potential", label: "可能形" },
  { key: "ukemi", engine: "passive", label: "被动形" },
  { key: "shieki", engine: "causative", label: "使役形" },
  { key: "meirei", engine: "imperative", label: "命令形" },
];
