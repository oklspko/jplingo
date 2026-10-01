#!/usr/bin/env node
/**
 * 「句子生长」课程生成 / 校验器（第二课、第三课…）
 *
 * 用法：
 *   node scripts/build-grow.cjs --lesson 02            # 只校验 + 预览（不落盘）
 *   node scripts/build-grow.cjs --lesson 02 --write    # 写出 public/courses/jp-growing/jp-grow-02.json
 *   node scripts/build-grow.cjs --lesson 03 --write
 *   node scripts/build-grow.cjs --reorder 01 --write   # 只把已有课程的句子重排成「短句在前」（内容必须一模一样）
 *
 * 课程结构（与 buildGrowingOrder 的新规则一致）：
 *   - 单词在前（id 从 01 起），句子在后；句子按「短句在前、长句在后」写入文件
 *     （运行时也会再按 token 数稳定排序，文件顺序只是为了自解释）
 *   - 每条：{id, chinese, japanese, kana, romaji, tokens:[{text,kana}]}
 *
 * 落盘前自检（核心逻辑，2026-10-01 起含自然度条款）：
 *   1) 词先句后（模拟 buildGrowingOrder：句子按长度升序后逐句抽词）
 *   2) 已练词不重复单练
 *   3) 助词只随句子出现、不作为单词
 *   4) 句内内容词形式与单词表精确一致（动词形式必须一致）
 *   5) 主生长链每一步 = 前一句 + 1～2 个新内容词（不加长度硬指标，句子自然优先）
 *   6) 全句「と」最多 3 个（并列与「和某人一起」合计；超了就拆句或去掉堆叠）
 *   7) 同一句内不重复同一个内容词
 * 另外：重排已有课程时会比对「句子集合」是否与旧文件完全一致，防止顺手改坏内容。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "public/courses/jp-growing");
const PARTICLES = new Set("をでにはとものなへがよりからまでて".split(""));

// ===== 第二课：图书馆读书 =====
const LESSON_02 = {
  id: "jp-grow-02",
  title: "图书馆读书",
  order: 2,
  words: [
    ["私", "わたし", "watashi", "我"],
    ["本", "ほん", "hon", "书"],
    ["読みます", "よみます", "yomimasu", "读"],
    ["日本語", "にほんご", "nihongo", "日语"],
    ["図書館", "としょかん", "toshokan", "图书馆"],
    ["毎週", "まいしゅう", "maishuu", "每周"],
    ["土曜日", "どようび", "doyoubi", "星期六"],
    ["静か", "しずか", "shizuka", "安静"],
    ["新しい", "あたらしい", "atarashii", "新的"],
    ["雑誌", "ざっし", "zasshi", "杂志"],
    ["面白い", "おもしろい", "omoshiroi", "有趣的"],
    ["友達", "ともだち", "tomodachi", "朋友"],
    ["一緒に", "いっしょに", "issho ni", "一起"],
    ["新聞", "しんぶん", "shinbun", "报纸"],
    ["ゆっくり", "ゆっくり", "yukkuri", "慢慢地"],
    ["日曜日", "にちようび", "nichiyoubi", "星期日"],
    ["明るい", "あかるい", "akarui", "明亮的"],
    ["部屋", "へや", "heya", "房间"],
    ["音楽", "おんがく", "ongaku", "音乐"],
    ["聞きます", "ききます", "kikimasu", "听"],
    ["昨日", "きのう", "kinou", "昨天"],
    ["公園", "こうえん", "kouen", "公园"],
    ["写真", "しゃしん", "shashin", "照片"],
    ["撮りました", "とりました", "torimashita", "拍了（照）"],
    ["明日", "あした", "ashita", "明天"],
    ["勉強します", "べんきょうします", "benkyou shimasu", "学习"],
    ["毎朝", "まいあさ", "maiasa", "每天早上"],
    ["毎晩", "まいばん", "maiban", "每天晚上"],
    ["読みました", "よみました", "yomimashita", "读了"],
    ["コーヒー", "こーひー", "koohii", "咖啡"],
    ["飲みます", "のみます", "nomimasu", "喝"],
  ],
  chain: [
    ["私は本を読みます", "我读书。"],
    ["私は日本語の本を読みます", "我读日语书。"],
    ["私は図書館で日本語の本を読みます", "我在图书馆读日语书。"],
    ["私は毎週図書館で日本語の本を読みます", "我每周在图书馆读日语书。"],
    ["私は毎週土曜日に図書館で日本語の本を読みます", "我每周六在图书馆读日语书。"],
    ["私は毎週土曜日に静かな図書館で日本語の本を読みます", "我每周六在安静的图书馆读日语书。"],
    ["私は毎週土曜日に静かな図書館で新しい日本語の本を読みます", "我每周六在安静的图书馆读新的日语书。"],
    ["私は毎週土曜日に静かな図書館で新しい日本語の本と雑誌を読みます", "我每周六在安静的图书馆读新的日语书和杂志。"],
    ["私は毎週土曜日に静かな図書館で新しい日本語の本と面白い雑誌を読みます", "我每周六在安静的图书馆读新的日语书和有趣的杂志。"],
    ["私は毎週土曜日に静かな図書館で友達と新しい日本語の本と面白い雑誌を読みます", "我每周六在安静的图书馆和朋友读新的日语书和有趣的杂志。"],
    ["私は毎週土曜日に静かな図書館で友達と一緒に新しい日本語の本と面白い雑誌を読みます", "我每周六在安静的图书馆和朋友一起读新的日语书和有趣的杂志。"],
    ["私は毎週土曜日に静かな図書館で友達と一緒に新しい日本語の本と面白い雑誌をゆっくり読みます", "我每周六在安静的图书馆和朋友一起慢慢读新的日语书和有趣的杂志。"],
  ],
  extra: [
    ["私は毎週日曜日に明るい部屋で音楽を聞きます", "我每周日在明亮的房间里听音乐。"],
    ["明日私は図書館で日本語を勉強します", "明天我在图书馆学日语。"],
    ["昨日私は友達と公園で写真を撮りました", "昨天我和朋友在公园拍了照片。"],
    ["私は毎朝新聞を読みます", "我每天早上读报纸。"],
    ["私は毎晩コーヒーを飲みます", "我每天晚上喝咖啡。"],
    ["昨日私は図書館で本を読みました", "昨天我在图书馆读了书。"],
    ["私は毎朝コーヒーを飲みます", "我每天早上喝咖啡。"],
  ],
};

// ===== 第三课：超市购物 =====
const LESSON_03 = {
  id: "jp-grow-03",
  title: "超市购物",
  order: 3,
  words: [
    ["私", "わたし", "watashi", "我"],
    ["友達", "ともだち", "tomodachi", "朋友"],
    ["家", "いえ", "ie", "家"],
    ["近い", "ちかい", "chikai", "近的"],
    ["新しい", "あたらしい", "atarashii", "新的"],
    ["スーパー", "すーぱー", "suupaa", "超市"],
    ["新鮮", "しんせん", "shinsen", "新鲜"],
    ["安い", "やすい", "yasui", "便宜"],
    ["野菜", "やさい", "yasai", "蔬菜"],
    ["甘い", "あまい", "amai", "甜的"],
    ["果物", "くだもの", "kudamono", "水果"],
    ["魚", "さかな", "sakana", "鱼"],
    ["肉", "にく", "niku", "肉"],
    ["卵", "たまご", "tamago", "蛋"],
    ["たくさん", "たくさん", "takusan", "很多"],
    ["買います", "かいます", "kaimasu", "买"],
    ["今日", "きょう", "kyou", "今天"],
    ["昨日", "きのう", "kinou", "昨天"],
    ["買いました", "かいました", "kaimashita", "买了"],
    ["明日", "あした", "ashita", "明天"],
    ["朝", "あさ", "asa", "早上"],
    ["九時", "くじ", "kuji", "九点"],
    ["開きます", "あきます", "akimasu", "开门、营业"],
    ["お金", "おかね", "okane", "钱"],
    ["払います", "はらいます", "haraimasu", "支付"],
    ["財布", "さいふ", "saifu", "钱包"],
    ["入れます", "いれます", "iremasu", "放入"],
    ["料理", "りょうり", "ryouri", "菜、饭菜"],
    ["作ります", "つくります", "tsukurimasu", "做"],
    ["帰ります", "かえります", "kaerimasu", "回家"],
    ["店員", "てんいん", "tenin", "店员"],
    ["袋", "ふくろ", "fukuro", "袋子"],
    ["毎晩", "まいばん", "maiban", "每天晚上"],
    ["食べます", "たべます", "tabemasu", "吃"],
  ],
  chain: [
    ["私は野菜を買います", "我买蔬菜。"],
    ["私はスーパーで野菜を買います", "我在超市买蔬菜。"],
    ["私は近いスーパーで野菜を買います", "我在附近的超市买蔬菜。"],
    ["私は家に近いスーパーで野菜を買います", "我在离家近的超市买蔬菜。"],
    ["今日私は家に近いスーパーで野菜を買います", "今天我在离家近的超市买蔬菜。"],
    ["今日私は家に近いスーパーで新鮮な野菜を買います", "今天我在离家近的超市买新鲜的蔬菜。"],
    ["今日私は家に近いスーパーで新鮮な野菜と果物を買います", "今天我在离家近的超市买新鲜的蔬菜和水果。"],
    ["今日私は家に近いスーパーで新鮮な野菜と甘い果物を買います", "今天我在离家近的超市买新鲜的蔬菜和甜的水果。"],
    ["今日私は家に近いスーパーで新鮮な野菜と甘い果物と魚を買います", "今天我在离家近的超市买新鲜的蔬菜、甜的水果和鱼。"],
    ["今日私は友達と家に近いスーパーで新鮮な野菜と甘い果物と魚を買います", "今天我和朋友在离家近的超市买新鲜的蔬菜、甜的水果和鱼。"],
    ["今日私は友達と家に近いスーパーで新鮮な野菜と甘い果物と安い魚を買います", "今天我和朋友在离家近的超市买新鲜的蔬菜、甜的水果和便宜的鱼。"],
    ["今日私は友達と家に近いスーパーで新鮮な野菜と甘い果物と安い魚をたくさん買います", "今天我和朋友在离家近的超市买了很多新鲜的蔬菜、甜的水果和便宜的鱼。"],
  ],
  extra: [
    ["昨日私はスーパーで魚と肉を買いました", "昨天我在超市买了鱼和肉。"],
    ["明日私は新しいスーパーで卵を買います", "明天我在新超市买鸡蛋。"],
    ["スーパーは朝九時に開きます", "超市早上九点开门。"],
    ["私はお金を払います", "我付钱。"],
    ["私は財布にお金を入れます", "我把钱放进钱包。"],
    ["私は家で料理を作ります", "我在家做菜。"],
    ["私は毎晩料理を食べます", "我每天晚上吃（自己做的）菜。"],
    ["店員は袋に野菜を入れます", "店员把蔬菜装进袋子。"],
    ["私は家に帰ります", "我回家。"],
  ],
};

// ===== 第四课：餐厅吃饭 =====
const LESSON_04 = {
  id: "jp-grow-04",
  title: "餐厅吃饭",
  order: 4,
  words: [
    ["私", "わたし", "watashi", "我"],
    ["友達", "ともだち", "tomodachi", "朋友"],
    ["駅", "えき", "eki", "车站"],
    ["レストラン", "れすとらん", "resutoran", "餐厅"],
    ["新しい", "あたらしい", "atarashii", "新的"],
    ["日本", "にほん", "nihon", "日本"],
    ["料理", "りょうり", "ryouri", "菜、饭菜"],
    ["おいしい", "おいしい", "oishii", "好吃的"],
    ["魚", "さかな", "sakana", "鱼"],
    ["天ぷら", "てんぷら", "tenpura", "天妇罗"],
    ["寿司", "すし", "sushi", "寿司"],
    ["食べます", "たべます", "tabemasu", "吃"],
    ["食べました", "たべました", "tabemashita", "吃了"],
    ["今日", "きょう", "kyou", "今天"],
    ["昨日", "きのう", "kinou", "昨天"],
    ["明日", "あした", "ashita", "明天"],
    ["夜", "よる", "yoru", "晚上"],
    ["七時", "しちじ", "shichiji", "七点"],
    ["店", "みせ", "mise", "店"],
    ["定食", "ていしょく", "teishoku", "套餐"],
    ["熱い", "あつい", "atsui", "热的"],
    ["冷たい", "つめたい", "tsumetai", "冰的"],
    ["飲み物", "のみもの", "nomimono", "饮料"],
    ["飲みます", "のみます", "nomimasu", "喝"],
    ["店員", "てんいん", "tenin", "店员"],
    ["注文します", "ちゅうもんします", "chuumon shimasu", "点餐"],
    ["待ちます", "まちます", "machimasu", "等"],
    ["来ます", "きます", "kimasu", "来"],
    ["広い", "ひろい", "hiroi", "宽敞的"],
    ["静か", "しずか", "shizuka", "安静"],
  ],
  chain: [
    ["私は料理を食べます", "我吃菜。"],
    ["私はレストランで料理を食べます", "我在餐厅吃菜。"],
    ["私は駅のレストランで料理を食べます", "我在车站的餐厅吃菜。"],
    ["私は駅の新しいレストランで料理を食べます", "我在车站那家新餐厅吃菜。"],
    ["私は駅の新しいレストランで日本の料理を食べます", "我在车站那家新餐厅吃日本菜。"],
    ["私は駅の新しいレストランでおいしい日本の料理を食べます", "我在车站那家新餐厅吃好吃的日本菜。"],
    ["今日私は駅の新しいレストランでおいしい日本の料理を食べます", "今天我在车站那家新餐厅吃好吃的日本菜。"],
    ["今日私は友達と駅の新しいレストランでおいしい日本の料理を食べます", "今天我和朋友在车站那家新餐厅吃好吃的日本菜。"],
    ["今日私は友達と駅の新しいレストランでおいしい日本の料理と魚を食べます", "今天我和朋友在车站那家新餐厅吃好吃的日本菜和鱼。"],
    ["今日私は友達と駅の新しいレストランでおいしい日本の料理と魚と天ぷらを食べます", "今天我和朋友在车站那家新餐厅吃好吃的日本菜、鱼和天妇罗。"],
    ["今日私は友達と駅の新しいレストランで七時においしい日本の料理と魚と天ぷらを食べます", "今天我和朋友七点在车站那家新餐厅吃好吃的日本菜、鱼和天妇罗。"],
    ["今日私は友達と駅の新しいレストランで夜七時においしい日本の料理と魚と天ぷらを食べます", "今天我和朋友晚上七点在车站那家新餐厅吃好吃的日本菜、鱼和天妇罗。"],
  ],
  extra: [
    ["昨日私は店で寿司を食べました", "昨天我在店里吃了寿司。"],
    ["明日私は駅のレストランで定食を食べます", "明天我在车站的餐厅吃套餐。"],
    ["私は店で店員を待ちます", "我在店里等店员。"],
    ["明日店員が店に来ます", "明天店员来店里。"],
    ["私は熱い飲み物を飲みます", "我喝热饮。"],
    ["私は冷たい飲み物を飲みます", "我喝冰饮。"],
    ["私は店員に注文します", "我向店员点餐。"],
    ["私は駅の広い店で定食を食べます", "我在车站那家宽敞的店里吃套餐。"],
    ["私は静かな店で飲み物を飲みます", "我在安静的店里喝饮料。"],
  ],
};

// ===== 第五课：打扫房间 =====
const LESSON_05 = {
  id: "jp-grow-05",
  title: "打扫房间",
  order: 5,
  words: [
    ["私", "わたし", "watashi", "我"],
    ["家族", "かぞく", "kazoku", "家人"],
    ["妹", "いもうと", "imouto", "妹妹"],
    ["父", "ちち", "chichi", "父亲"],
    ["部屋", "へや", "heya", "房间"],
    ["台所", "だいどころ", "daidokoro", "厨房"],
    ["お風呂", "おふろ", "ofuro", "浴室"],
    ["窓", "まど", "mado", "窗户"],
    ["玄関", "げんかん", "genkan", "玄关"],
    ["庭", "にわ", "niwa", "院子"],
    ["大きい", "おおきい", "ookii", "大的"],
    ["毎週", "まいしゅう", "maishuu", "每周"],
    ["土曜日", "どようび", "doyoubi", "星期六"],
    ["朝", "あさ", "asa", "早上"],
    ["二時間", "にじかん", "nijikan", "两小时"],
    ["掃除します", "そうじします", "souji shimasu", "打扫"],
    ["掃除しました", "そうじしました", "souji shimashita", "打扫了"],
    ["洗濯します", "せんたくします", "sentaku shimasu", "洗衣服"],
    ["皿", "さら", "sara", "盘子"],
    ["洗います", "あらいます", "araimasu", "洗"],
    ["ゴミ", "ごみ", "gomi", "垃圾"],
    ["捨てます", "すてます", "sutemasu", "扔掉"],
    ["手伝います", "てつだいます", "tetsudaimasu", "帮忙"],
    ["綺麗", "きれい", "kirei", "干净、漂亮"],
    ["なりました", "なりました", "narimashita", "变成了"],
    ["全部", "ぜんぶ", "zenbu", "全部"],
    ["昨日", "きのう", "kinou", "昨天"],
    ["明日", "あした", "ashita", "明天"],
    ["毎日", "まいにち", "mainichi", "每天"],
    ["今日", "きょう", "kyou", "今天"],
    ["料理", "りょうり", "ryouri", "菜、饭菜"],
    ["作ります", "つくります", "tsukurimasu", "做"],
  ],
  chain: [
    ["私は部屋を掃除します", "我打扫房间。"],
    ["私は土曜日に部屋を掃除します", "我星期六打扫房间。"],
    ["私は毎週土曜日に部屋を掃除します", "我每周六打扫房间。"],
    ["私は毎週土曜日に大きい部屋を掃除します", "我每周六打扫大房间。"],
    ["私は毎週土曜日に大きい部屋と台所を掃除します", "我每周六打扫大房间和厨房。"],
    ["私は毎週土曜日に大きい部屋と台所とお風呂を掃除します", "我每周六打扫大房间、厨房和浴室。"],
    ["私は毎週土曜日の朝に大きい部屋と台所とお風呂を掃除します", "我每周六早上打扫大房间、厨房和浴室。"],
    ["私は毎週土曜日の朝に家族と大きい部屋と台所とお風呂を掃除します", "我每周六早上和家人一起打扫大房间、厨房和浴室。"],
    ["私は毎週土曜日の朝に家族と大きい部屋と台所とお風呂を二時間掃除します", "我每周六早上和家人一起花两小时打扫大房间、厨房和浴室。"],
  ],
  extra: [
    ["妹は私を手伝います", "妹妹帮我。"],
    ["今日私は庭を掃除します", "今天我打扫院子。"],
    ["私は窓と玄関を掃除します", "我打扫窗户和玄关。"],
    ["昨日私は部屋を掃除しました", "昨天我打扫了房间。"],
    ["明日私は妹と洗濯します", "明天我和妹妹洗衣服。"],
    ["私は皿を洗います", "我洗盘子。"],
    ["私は毎日ゴミを捨てます", "我每天扔垃圾。"],
    ["部屋は綺麗になりました", "房间变干净了。"],
    ["父は料理を作ります", "父亲做菜。"],
    ["私は部屋を全部掃除します", "我把房间全部打扫一遍。"],
  ],
};

// ===== 第一课：早餐（由导出脚本整理，后续改动请直接改这里）=====
const LESSON_01 = {
  id: "jp-grow-01",
  title: "早餐",
  order: 1,
  words: [
    ["私", "わたし", "watashi", "我"],
    ["ご飯", "ごはん", "gohan", "米饭"],
    ["食べます", "たべます", "tabemasu", "吃"],
    ["パン", "ぱん", "pan", "面包"],
    ["卵", "たまご", "tamago", "鸡蛋"],
    ["毎朝", "まいあさ", "maiasa", "每天早上"],
    ["七時", "しちじ", "shichiji", "七点"],
    ["台所", "だいどころ", "daidokoro", "厨房"],
    ["食堂", "しょくどう", "shokudou", "餐厅"],
    ["明るい", "あかるい", "akarui", "明亮"],
    ["温かい", "あたたかい", "atatakai", "温热"],
    ["家族", "かぞく", "kazoku", "家人"],
    ["一緒に", "いっしょに", "isshoni", "一起"],
    ["味噌汁", "みそしる", "misoshiru", "味噌汤"],
    ["大好き", "だいすき", "daisuki", "非常喜欢"],
    ["おいしい", "おいしい", "oishii", "好吃"],
    ["ゆっくり", "ゆっくり", "yukkuri", "慢慢地"],
    ["毎晩", "まいばん", "maiban", "每天晚上"],
    ["八時", "はちじ", "hachiji", "八点"],
    ["家", "いえ", "ie", "家"],
    ["牛乳", "ぎゅうにゅう", "gyuunyuu", "牛奶"],
    ["飲みます", "のみます", "nomimasu", "喝"],
    ["今朝", "けさ", "kesa", "今天早上"],
    ["静か", "しずか", "shizuka", "安静"],
    ["冷たい", "つめたい", "tsumetai", "凉"],
    ["お茶", "おちゃ", "ocha", "茶"],
    ["昨日", "きのう", "kinou", "昨天"],
    ["食べました", "たべました", "tabemashita", "吃了"],
    ["飲みました", "のみました", "nomimashita", "喝了"],
  ],
  chain: [
    ["私はご飯を食べます", "我吃米饭。"],
    ["私は毎朝ご飯を食べます", "我每天早上吃米饭。"],
    ["私は毎朝七時にご飯を食べます", "我每天早上七点吃米饭。"],
    ["私は毎朝七時に台所でご飯を食べます", "我每天早上七点在厨房吃米饭。"],
    ["私は毎朝七時に明るい台所でご飯を食べます", "我每天早上七点在明亮的厨房吃米饭。"],
    ["私は毎朝七時に明るい台所で温かいご飯を食べます", "我每天早上七点在明亮的厨房吃温热的米饭。"],
    ["私は毎朝七時に明るい台所で家族と温かいご飯を食べます", "我每天早上七点在明亮的厨房和家人吃温热的米饭。"],
    ["私は毎朝七時に明るい台所で家族と一緒に温かいご飯を食べます", "我每天早上七点在明亮的厨房和家人一起吃温热的米饭。"],
    ["私は毎朝七時に明るい台所で家族と一緒に温かいご飯と味噌汁を食べます", "我每天早上七点在明亮的厨房和家人一起吃温热的米饭和味噌汤。"],
    ["私は毎朝七時に明るい台所で大好きな家族と一緒に温かいご飯と味噌汁を食べます", "我每天早上七点在明亮的厨房和最喜欢的家人一起吃温热的米饭和味噌汤。"],
    ["私は毎朝七時に明るい台所で大好きな家族と一緒に温かいご飯とおいしい味噌汁を食べます", "我每天早上七点在明亮的厨房和最喜欢的家人一起吃温热的米饭和好喝的味噌汤。"],
  ],
  extra: [
    ["私はパンを食べます", "我吃面包。"],
    ["私は卵を食べます", "我吃鸡蛋。"],
    ["私は毎朝七時に食堂でご飯を食べます", "我每天早上七点在餐厅吃米饭。"],
    ["昨日私は明るい台所で温かいご飯を食べました", "昨天我在明亮的厨房吃了温热的米饭。"],
    ["私は毎晩八時に家で温かい牛乳を飲みます", "我每天晚上八点在家喝温牛奶。"],
    ["今朝私は静かな食堂で冷たいお茶をゆっくり飲みました", "今天早上我在安静的食堂慢慢喝了冰茶。"],
    ["昨日私は静かな食堂で温かいお茶を飲みました", "昨天我在安静的餐厅喝了温茶。"],
  ],
};

// ===== 第六课：每天学习（形容词修饰动词：楽しく／早く）=====
const LESSON_06 = {
  id: "jp-grow-06",
  title: "每天学习",
  order: 6,
  words: [
    ["私", "わたし", "watashi", "我"],
    ["毎日", "まいにち", "mainichi", "每天"],
    ["日本語", "にほんご", "nihongo", "日语"],
    ["漢字", "かんじ", "kanji", "汉字"],
    ["単語", "たんご", "tango", "单词"],
    ["勉強します", "べんきょうします", "benkyou shimasu", "学习"],
    ["楽しい", "たのしい", "tanoshii", "快乐的"],
    ["楽しく", "たのしく", "tanoshiku", "快乐地（修饰动词）"],
    ["早い", "はやい", "hayai", "早的"],
    ["早く", "はやく", "hayaku", "早（修饰动词）"],
    ["起きます", "おきます", "okimasu", "起床"],
    ["寝ます", "ねます", "nemasu", "睡觉"],
    ["夜", "よる", "yoru", "晚上"],
    ["十一時", "じゅういちじ", "juuichiji", "十一点"],
    ["毎朝", "まいあさ", "maiasa", "每天早上"],
    ["コーヒー", "こーひー", "koohii", "咖啡"],
    ["飲みます", "のみます", "nomimasu", "喝"],
    ["図書館", "としょかん", "toshokan", "图书馆"],
    ["新しい", "あたらしい", "atarashii", "新的"],
    ["本", "ほん", "hon", "书"],
    ["読みます", "よみます", "yomimasu", "读"],
    ["一時間", "いちじかん", "ichijikan", "一小时"],
    ["時間", "じかん", "jikan", "时间"],
    ["友達", "ともだち", "tomodachi", "朋友"],
    ["先生", "せんせい", "sensei", "老师"],
    ["質問します", "しつもんします", "shitsumon shimasu", "提问"],
    ["静か", "しずか", "shizuka", "安静"],
    ["上手", "じょうず", "jouzu", "擅长"],
    ["話します", "はなします", "hanashimasu", "说"],
    ["覚えます", "おぼえます", "oboemasu", "记住"],
    ["辞書", "じしょ", "jisho", "词典"],
    ["引きます", "ひきます", "hikimasu", "查（词典）"],
  ],
  chain: [
    ["私は勉強します", "我学习。"],
    ["私は日本語を勉強します", "我学日语。"],
    ["私は毎日日本語を勉強します", "我每天学日语。"],
    ["私は毎日楽しく日本語を勉強します", "我每天快乐地学日语。"],
    ["私は毎日一時間楽しく日本語を勉強します", "我每天快乐地学一小时日语。"],
    ["私は毎日図書館で一時間楽しく日本語を勉強します", "我每天在图书馆快乐地学一小时日语。"],
    ["私は毎日友達と図書館で一時間楽しく日本語を勉強します", "我每天和朋友在图书馆快乐地学一小时日语。"],
    ["私は毎日友達と図書館で一時間楽しく日本語と漢字を勉強します", "我每天和朋友在图书馆快乐地学一小时日语和汉字。"],
    [
      "私は毎日友達と新しい図書館で一時間楽しく日本語と漢字を勉強します",
      "我每天和朋友在新的图书馆快乐地学一小时日语和汉字。",
    ],
    [
      "私は毎日友達と新しい図書館で一時間楽しく日本語と漢字と単語を勉強します",
      "我每天和朋友在新的图书馆快乐地学一小时日语、汉字和单词。",
    ],
  ],
  extra: [
    ["私は毎朝早く起きます", "我每天早上很早起床。"],
    ["私は夜十一時に寝ます", "我晚上十一点睡觉。"],
    ["私は毎朝コーヒーを飲みます", "我每天早上喝咖啡。"],
    ["私は早い時間に起きます", "我在很早的时间起床。"],
    ["私は楽しい本を読みます", "我读有趣的书。"],
    ["私は静かに本を読みます", "我安静地读书。"],
    ["私は上手に日本語を話します", "我日语说得很好。"],
    ["私は先生に質問します", "我向老师提问。"],
    ["私は辞書で単語を引きます", "我用词典查单词。"],
    ["私は単語を覚えます", "我记单词。"],
  ],
};

// ===== 第七课：我的房间（多个形容词连用修饰同一个名词）=====
const LESSON_07 = {
  id: "jp-grow-07",
  title: "我的房间",
  order: 7,
  words: [
    ["私", "わたし", "watashi", "我"],
    ["部屋", "へや", "heya", "房间"],
    ["机", "つくえ", "tsukue", "桌子"],
    ["椅子", "いす", "isu", "椅子"],
    ["本棚", "ほんだな", "hondana", "书架"],
    ["ベッド", "べっど", "beddo", "床"],
    ["窓", "まど", "mado", "窗户"],
    ["時計", "とけい", "tokei", "钟表"],
    ["テレビ", "てれび", "terebi", "电视"],
    ["花", "はな", "hana", "花"],
    ["山", "やま", "yama", "山"],
    ["広い", "ひろい", "hiroi", "宽敞的"],
    ["広く", "ひろく", "hiroku", "宽敞（连用形）"],
    ["明るい", "あかるい", "akarui", "明亮的"],
    ["静か", "しずか", "shizuka", "安静"],
    ["新しい", "あたらしい", "atarashii", "新的"],
    ["古い", "ふるい", "furui", "旧的"],
    ["きれい", "きれい", "kirei", "漂亮、干净"],
    ["大きい", "おおきい", "ookii", "大的"],
    ["あります", "あります", "arimasu", "有（无生命）"],
    ["住みます", "すみます", "sumimasu", "住"],
    ["買います", "かいます", "kaimasu", "买"],
    ["見えます", "みえます", "miemasu", "看得见"],
    ["好き", "すき", "suki", "喜欢"],
    ["本", "ほん", "hon", "书"],
    ["読みます", "よみます", "yomimasu", "读"],
    ["静かに", "しずかに", "shizuka ni", "安静地"],
    ["テーブル", "てーぶる", "teeburu", "桌子（餐桌）"],
    ["ランプ", "らんぷ", "ranpu", "台灯"],
    ["カーテン", "かーてん", "kaaten", "窗帘"],
  ],
  chain: [
    ["机があります", "有桌子。"],
    ["部屋に机があります", "房间里有桌子。"],
    ["私の部屋に机があります", "我的房间里有桌子。"],
    ["私の広い部屋に机があります", "我宽敞的房间里有桌子。"],
    ["私の広くて明るい部屋に机があります", "我又宽敞又明亮的房间里有桌子。"],
    ["私の広くて明るい部屋に新しい机があります", "我又宽敞又明亮的房间里有新桌子。"],
    ["私の広くて明るい部屋に新しい机と椅子があります", "我又宽敞又明亮的房间里有新桌子和椅子。"],
    ["私の広くて明るい部屋に新しい机と椅子と本棚があります", "我又宽敞又明亮的房间里有新桌子、椅子和书架。"],
    [
      "私の広くて明るい部屋に新しい机と椅子と本棚とベッドがあります",
      "我又宽敞又明亮的房间里有新桌子、椅子、书架和床。",
    ],
    [
      "私の静かで広くて明るい部屋に新しい机と椅子と本棚とベッドがあります",
      "我安静、宽敞又明亮的房间里有新桌子、椅子、书架和床。",
    ],
  ],
  extra: [
    ["部屋に大きい窓があります", "房间里有大窗户。"],
    ["部屋に古い時計があります", "房间里有旧钟表。"],
    ["部屋に新しいテレビがあります", "房间里有新电视。"],
    ["私はきれいな花を買います", "我买漂亮的花。"],
    ["私は広い部屋に住みます", "我住在宽敞的房间里。"],
    ["私は静かな部屋で本を読みます", "我在安静的房间里读书。"],
    ["窓から山が見えます", "从窗户看得见山。"],
    ["私は静かに本を読みます", "我安静地读书。"],
    ["部屋に新しいテーブルとランプがあります", "房间里有新桌子和台灯。"],
    ["部屋にきれいなカーテンがあります", "房间里有漂亮的窗帘。"],
    ["私は好きな本を読みます", "我读喜欢的书。"],
  ],
};

// ===== 第八课：周末的公园（形容词叠加修饰名词 + 形容词修饰动词）=====
const LESSON_08 = {
  id: "jp-grow-08",
  title: "周末的公园",
  order: 8,
  words: [
    ["私", "わたし", "watashi", "我"],
    ["公園", "こうえん", "kouen", "公园"],
    ["歩きます", "あるきます", "arukimasu", "走"],
    ["走ります", "はしります", "hashirimasu", "跑"],
    ["広い", "ひろい", "hiroi", "宽敞的"],
    ["広く", "ひろく", "hiroku", "宽敞（连用形）"],
    ["静か", "しずか", "shizuka", "安静"],
    ["きれい", "きれい", "kirei", "漂亮、干净"],
    ["楽しく", "たのしく", "tanoshiku", "快乐地（修饰动词）"],
    ["毎週", "まいしゅう", "maishuu", "每周"],
    ["友達", "ともだち", "tomodachi", "朋友"],
    ["一時間", "いちじかん", "ichijikan", "一小时"],
    ["天気", "てんき", "tenki", "天气"],
    ["いい", "いい", "ii", "好的"],
    ["日", "ひ", "hi", "日子"],
    ["寒い", "さむい", "samui", "冷的"],
    ["暖かい", "あたたかい", "atatakai", "暖和的"],
    ["暖かく", "あたたかく", "atatakaku", "暖和（连用形）"],
    ["春", "はる", "haru", "春天"],
    ["木", "き", "ki", "树"],
    ["花", "はな", "hana", "花"],
    ["大きい", "おおきい", "ookii", "大的"],
    ["あります", "あります", "arimasu", "有（无生命）"],
    ["鳥", "とり", "tori", "鸟"],
    ["鳴きます", "なきます", "nakimasu", "叫、鸣"],
    ["子供", "こども", "kodomo", "小孩"],
    ["遊びます", "あそびます", "asobimasu", "玩"],
    ["写真", "しゃしん", "shashin", "照片"],
    ["撮ります", "とります", "torimasu", "拍"],
    ["ベンチ", "べんち", "benchi", "长椅"],
    ["座ります", "すわります", "suwarimasu", "坐"],
    ["水", "みず", "mizu", "水"],
    ["飲みます", "のみます", "nomimasu", "喝"],
  ],
  chain: [
    ["私は歩きます", "我走路。"],
    ["私は公園を歩きます", "我在公园里走。"],
    ["私は広い公園を歩きます", "我在宽敞的公园里走。"],
    ["私は広くてきれいな公園を歩きます", "我在又宽敞又漂亮的公园里走。"],
    ["私は広くてきれいな公園を楽しく歩きます", "我在又宽敞又漂亮的公园里愉快地走。"],
    ["私は毎週広くてきれいな公園を楽しく歩きます", "我每周在又宽敞又漂亮的公园里愉快地走。"],
    ["私は毎週友達と広くてきれいな公園を楽しく歩きます", "我每周和朋友在又宽敞又漂亮的公园里愉快地走。"],
    [
      "私は毎週友達と広くてきれいな公園を一時間楽しく歩きます",
      "我每周和朋友在又宽敞又漂亮的公园里愉快地走一小时。",
    ],
    [
      "私は毎週友達と静かで広くてきれいな公園を一時間楽しく歩きます",
      "我每周和朋友在安静、宽敞又漂亮的公园里愉快地走一小时。",
    ],
  ],
  extra: [
    ["私は毎週広い公園を走ります", "我每周在宽敞的公园里跑。"],
    ["暖かい日に公園を歩きます", "暖和的日子在公园里走。"],
    ["天気のいい日に公園を歩きます", "天气好的日子在公园里走。"],
    ["春は暖かくてきれいな花があります", "春天暖和，还有漂亮的花。"],
    ["公園に大きい木があります", "公园里有大树。"],
    ["鳥がきれいに鳴きます", "鸟儿好听地叫。"],
    ["子供が公園で楽しく遊びます", "小孩在公园里快乐地玩。"],
    ["友達と写真を撮ります", "和朋友拍照。"],
    ["私はベンチに座ります", "我坐在长椅上。"],
    ["私は水を飲みます", "我喝水。"],
    ["寒い日は公園を走ります", "冷的日子在公园跑步。"],
  ],
};

const LESSONS = {
  "01": LESSON_01,
  "02": LESSON_02,
  "03": LESSON_03,
  "04": LESSON_04,
  "05": LESSON_05,
  "06": LESSON_06,
  "07": LESSON_07,
  "08": LESSON_08,
};

/** 贪心最长匹配切 token：单词表优先，其余单字必须是助词 */
function tokenize(sentence, kanaOf) {
  const tokens = [];
  let i = 0;
  while (i < sentence.length) {
    let hit = null;
    for (const [ja, kana] of kanaOf) {
      if (sentence.startsWith(ja, i) && (!hit || ja.length > hit[0].length)) hit = [ja, kana];
    }
    if (hit) {
      tokens.push({ text: hit[0], kana: hit[1] });
      i += hit[0].length;
      continue;
    }
    const ch = sentence[i];
    if (!PARTICLES.has(ch)) {
      throw new Error(`「${sentence}」第 ${i + 1} 个字「${ch}」既不在单词表，也不是助词`);
    }
    tokens.push({ text: ch, kana: ch });
    i += 1;
  }
  return tokens;
}

const isSentence = (s) => (s.tokens || []).length > 1;
const contentWords = (s) => (s.tokens || []).filter((t) => !PARTICLES.has(t.text)).map((t) => t.text);

/** 复刻 buildGrowingOrder（含「短句在前长句在后」的稳定排序） */
function buildGrowingOrder(statements) {
  const seen = new Set();
  const unique = statements.filter((s) => (seen.has(s.japanese) ? false : (seen.add(s.japanese), true)));
  const words = unique.filter((s) => !isSentence(s));
  const ordered = unique
    .filter(isSentence)
    .map((s, index) => ({ s, index, len: s.tokens.length }))
    .sort((a, b) => a.len - b.len || a.index - b.index)
    .map((x) => x.s);
  const wordByText = new Map(words.map((w) => [w.japanese, w]));
  const learned = new Set();
  const out = [];
  for (const sentence of ordered) {
    const used = [];
    for (const t of sentence.tokens) {
      const w = wordByText.get(t.text);
      if (w && !learned.has(w.japanese) && !used.some((u) => u.japanese === w.japanese)) used.push(w);
    }
    for (const w of used) {
      out.push(w);
      learned.add(w.japanese);
    }
    out.push(sentence);
  }
  for (const w of words) if (!learned.has(w.japanese)) out.push(w);
  return out;
}

function build(lesson) {
  const kanaOf = new Map(lesson.words.map(([ja, kana]) => [ja, kana]));
  const wordById = new Map(lesson.words.map((w) => [w[0], w]));

  // 句子先建出来（token/kana/romaji 自动推导）
  const sentences = [...lesson.chain, ...lesson.extra].map(([japanese, chinese]) => {
    const tokens = tokenize(japanese, kanaOf);
    const romaji = tokens
      .map((t) => {
        const w = wordById.get(t.text);
        if (w) return w[2];
        if (t.text === "は") return "wa";
        if (t.text === "へ") return "e";
        return t.text;
      })
      .join(" ");
    return {
      chinese,
      japanese,
      kana: tokens.map((t) => t.kana).join(""),
      romaji,
      tokens,
    };
  });

  // 文件顺序：单词（定义顺序）+ 句子（短句在前长句在后，稳定）
  const orderedSentences = sentences
    .map((s, index) => ({ s, index }))
    .sort((a, b) => a.s.tokens.length - b.s.tokens.length || a.index - b.index)
    .map((x) => x.s);

  const statements = [];
  let n = 0;
  const push = (st) => statements.push({ id: String(++n).padStart(2, "0"), ...st });
  for (const [ja, kana, romaji, chinese] of lesson.words) {
    push({ chinese, japanese: ja, kana, romaji, tokens: [{ text: ja, kana }] });
  }
  for (const s of orderedSentences) push(s);

  return { statements, sentences, chainStatements: lesson.chain.map(([ja]) => sentences.find((s) => s.japanese === ja)) };
}

function validate(lesson, built) {
  const problems = [];
  const wordSet = new Set(lesson.words.map((w) => w[0]));
  const HIRAGANA = /^[ぁ-ゖゝゞー]+$/;
  const ROMAJI = /^[a-z]+( [a-z]+)*$/;
  const KANA_ANY = /[ぁ-ゖァ-ヺー]/;

  for (const w of lesson.words) {
    if (PARTICLES.has(w[0])) problems.push(`助词「${w[0]}」不该作为单词`);
    if (!HIRAGANA.test(w[1])) problems.push(`单词「${w[0]}」的 kana「${w[1]}」含非平假名字符`);
    if (!ROMAJI.test(w[2])) problems.push(`单词「${w[0]}」的 romaji「${w[2]}」格式不对`);
    if (!w[3] || KANA_ANY.test(w[3])) problems.push(`单词「${w[0]}」的中文「${w[3]}」为空或含假名`);
  }
  for (const st of built.sentences) {
    for (const t of st.tokens) {
      if (!PARTICLES.has(t.text) && !wordSet.has(t.text)) {
        problems.push(`「${st.japanese}」的内容词「${t.text}」不在单词表`);
      }
    }
    if (!st.kana || !st.romaji || !st.chinese) problems.push(`「${st.japanese}」缺 kana/romaji/chinese`);
  }

  // 主链：每步 +1～2 个新内容词（不设长度指标，句子自然优先）
  let prev = 0;
  for (const st of built.chainStatements) {
    const count = contentWords(st).length;
    if (prev && count <= prev) {
      problems.push(`主链「${st.japanese}」内容词数没增加（${prev} → ${count}）`);
    }
    if (prev && count - prev > 2) {
      problems.push(`主链「${st.japanese}」一次加了 ${count - prev} 个内容词（应 1～2 个）`);
    }
    prev = count;
  }

  // 自然度条款：全句「と」最多 3 个；同一句内不重复同一个内容词
  for (const st of built.sentences) {
    const toCount = st.tokens.filter((t) => t.text === "と").length;
    if (toCount > 3) {
      problems.push(`「${st.japanese}」用了 ${toCount} 个「と」（最多 3 个）`);
    }
    const words = contentWords(st);
    const dup = words.filter((w, i) => words.indexOf(w) !== i);
    if (dup.length) problems.push(`「${st.japanese}」重复了内容词 ${[...new Set(dup)].join("、")}`);
  }

  // 所有单词都要被句子用到
  const used = new Set();
  for (const st of built.sentences) for (const w of contentWords(st)) used.add(w);
  for (const w of lesson.words) if (!used.has(w[0])) problems.push(`单词「${w[0]}」没有任何句子用到`);

  // 词先句后 / 不重复单练
  const order = buildGrowingOrder(built.statements);
  const learned = new Set();
  for (const st of order) {
    if (isSentence(st)) {
      for (const w of contentWords(st)) {
        if (!learned.has(w)) problems.push(`词先句后被破坏：「${st.japanese}」用到未单练的「${w}」`);
      }
    } else {
      if (learned.has(st.japanese)) problems.push(`单词「${st.japanese}」被单练两次`);
      learned.add(st.japanese);
    }
  }

  // 文件里句子必须短句在前长句在后
  const fileSents = built.statements.filter(isSentence);
  for (let i = 1; i < fileSents.length; i++) {
    if (fileSents[i].tokens.length < fileSents[i - 1].tokens.length) {
      problems.push(`文件里句子长度没有升序：${fileSents[i - 1].japanese} → ${fileSents[i].japanese}`);
      break;
    }
  }

  return { problems, order };
}

function main() {
  const arg = (name) => {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : null;
  };

  // 模式二：只重排已有课程（内容必须逐条一致，仅把句子按长度升序排列并重编 id）
  const reorderId = arg("--reorder");
  if (reorderId) {
    const file = path.join(DIR, `jp-grow-${reorderId}.json`);
    if (!fs.existsSync(file)) {
      console.error(`找不到 ${file}`);
      process.exit(2);
    }
    const course = JSON.parse(fs.readFileSync(file, "utf8"));
    const words = course.statements.filter((s) => !isSentence(s));
    const sents = course.statements.filter(isSentence);
    const ordered = sents
      .map((s, index) => ({ s, index }))
      .sort((a, b) => a.s.tokens.length - b.s.tokens.length || a.index - b.index)
      .map((x) => x.s);

    let n = 0;
    const statements = [...words, ...ordered].map((s) => ({ ...s, id: String(++n).padStart(2, "0") }));
    const before = course.statements.map((s) => s.japanese).sort();
    const after = statements.map((s) => s.japanese).sort();
    const same = before.length === after.length && before.every((v, i) => v === after[i]);
    const lens = ordered.map((s) => s.tokens.length);
    const ascending = lens.every((v, i) => i === 0 || v >= lens[i - 1]);

    console.log(`jp-grow-${reorderId}：词 ${words.length} / 句 ${sents.length}`);
    console.log(`  句长 ${lens[0]} → ${lens[lens.length - 1]} token，短句在前: ${ascending ? "OK" : "违反"}`);
    console.log(`  内容逐条一致: ${same ? "OK" : "**不一致，拒绝写入**"}`);
    if (!same || !ascending) process.exit(1);
    if (process.argv.includes("--write")) {
      fs.writeFileSync(file, JSON.stringify({ ...course, statements }, null, 2) + "\n", "utf8");
      console.log(`  已重排写出 ${path.basename(file)}`);
    } else {
      console.log("  （预览模式，加 --write 写出）");
    }
    return;
  }

  const key = arg("--lesson") || "02";
  const lesson = LESSONS[key];
  if (!lesson) {
    console.error(`未知课程：${key}（可选 ${Object.keys(LESSONS).join(" / ")}）`);
    process.exit(2);
  }

  const built = build(lesson);
  const { problems, order } = validate(lesson, built);
  const words = built.statements.filter((s) => !isSentence(s));
  const fileSents = built.statements.filter(isSentence);

  console.log(`${lesson.id}「${lesson.title}」：${words.length} 单词 + ${fileSents.length} 句子 = ${built.statements.length} 条`);
  console.log(`  文件里句子长度：${fileSents[0].tokens.length} → ${fileSents[fileSents.length - 1].tokens.length} token（短句在前）`);
  const chainLast = built.chainStatements[built.chainStatements.length - 1];
  console.log(`  主链 ${built.chainStatements.length} 步，终句 ${contentWords(chainLast).length} 内容词 / ${chainLast.tokens.length} token`);
  console.log("\n  按算法出题的前 12 项：");
  order.slice(0, 12).forEach((s, i) => {
    console.log(`    ${String(i + 1).padStart(2)}. [${isSentence(s) ? "句" : "词"}] ${s.japanese}`);
  });

  if (problems.length) {
    console.error("\n校验失败：");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log("\n  五条不变量 + 短句在前：全部通过");

  const out = path.join(DIR, `${lesson.id}.json`);
  if (fs.existsSync(out)) {
    const old = JSON.parse(fs.readFileSync(out, "utf8"));
    const before = old.statements.map((s) => s.japanese).sort();
    const after = built.statements.map((s) => s.japanese).sort();
    const same = before.length === after.length && before.every((v, i) => v === after[i]);
    if (!same && !process.argv.includes("--force")) {
      console.error(`\n内容发生变化（拒绝覆盖 ${path.basename(out)}）：只允许重排顺序，改内容请显式加 --force`);
      process.exit(1);
    }
    console.log(
      same
        ? `\n  与现有 ${path.basename(out)} 内容一致（仅顺序可能不同）`
        : `\n  内容有改动（--force 已确认）：旧 ${before.length} 条 → 新 ${after.length} 条`,
    );
  }

  if (process.argv.includes("--write")) {
    const course = {
      id: lesson.id,
      coursePackId: "jp-growing",
      title: lesson.title,
      order: lesson.order,
      statements: built.statements,
    };
    fs.writeFileSync(out, JSON.stringify(course, null, 2) + "\n", "utf8");
    console.log(`  已写出 ${path.relative(ROOT, out)}（${(fs.statSync(out).size / 1024).toFixed(1)} KB）`);
    console.log(`  记得把 "${lesson.id}" 加进 public/courses/course-packs.json 的 jp-growing.courses`);
  } else {
    console.log("\n  （预览模式，未落盘；加 --write 写出）");
  }
}

main();
