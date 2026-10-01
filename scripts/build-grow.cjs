#!/usr/bin/env node
/**
 * 「句子生长」课程生成 / 校验器（第二课、第三课…）
 *
 * 用法：
 *   node scripts/build-grow.cjs --lesson 02            # 只校验 + 预览（不落盘）
 *   node scripts/build-grow.cjs --lesson 02 --write    # 写出 public/courses/jp-growing/jp-grow-02.json
 *   node scripts/build-grow.cjs --lesson 03 --write
 *
 * 课程结构（与 buildGrowingOrder 的新规则一致）：
 *   - 单词在前（id 从 01 起），句子在后；句子按「短句在前、长句在后」写入文件
 *     （运行时也会再按 token 数稳定排序，文件顺序只是为了自解释）
 *   - 每条：{id, chinese, japanese, kana, romaji, tokens:[{text,kana}]}
 *
 * 落盘前自检五条不变量：
 *   1) 词先句后（模拟 buildGrowingOrder：句子按长度升序后逐句抽词）
 *   2) 已练词不重复单练
 *   3) 助词只随句子出现、不作为单词
 *   4) 句内内容词形式与单词表精确一致（动词形式必须一致）
 *   5) 主生长链每一步 = 前一句 + 恰好一个新内容词，终句 ≥15 个内容词
 * 另外：重排已有课程时会比对「句子集合」是否与旧文件完全一致，防止顺手改坏内容。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "public/courses/jp-growing");
const PARTICLES = new Set("をでにはとものなへがよりからまで".split(""));

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
    [
      "私は毎週土曜日に静かな図書館で新しい日本語の本と雑誌を読みます",
      "我每周六在安静的图书馆读新的日语书和杂志。",
    ],
    [
      "私は毎週土曜日に静かな図書館で新しい日本語の本と面白い雑誌を読みます",
      "我每周六在安静的图书馆读新的日语书和有趣的杂志。",
    ],
    [
      "私は毎週土曜日に静かな図書館で友達と新しい日本語の本と面白い雑誌を読みます",
      "我每周六在安静的图书馆和朋友读新的日语书和有趣的杂志。",
    ],
    [
      "私は毎週土曜日に静かな図書館で友達と一緒に新しい日本語の本と面白い雑誌を読みます",
      "我每周六在安静的图书馆和朋友一起读新的日语书和有趣的杂志。",
    ],
    [
      "私は毎週土曜日に静かな図書館で友達と一緒に新しい日本語の本と面白い雑誌と新聞を読みます",
      "我每周六在安静的图书馆和朋友一起读新的日语书、有趣的杂志和报纸。",
    ],
    [
      "私は毎週土曜日に静かな図書館で友達と一緒に新しい日本語の本と面白い雑誌と新聞をゆっくり読みます",
      "我每周六在安静的图书馆和朋友一起慢慢地读新的日语书、有趣的杂志和报纸。",
    ],
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
    ["今日私は家に近いスーパーで野菜と果物を買います", "今天我在离家近的超市买蔬菜和水果。"],
    [
      "今日私は家に近いスーパーで新鮮な野菜と果物を買います",
      "今天我在离家近的超市买新鲜的蔬菜和水果。",
    ],
    [
      "今日私は家に近いスーパーで新鮮で安い野菜と果物を買います",
      "今天我在离家近的超市买又新鲜又便宜的蔬菜和水果。",
    ],
    [
      "今日私は家に近いスーパーで新鮮で安い野菜と甘い果物を買います",
      "今天我在离家近的超市买又新鲜又便宜的蔬菜和甜的水果。",
    ],
    [
      "今日私は家に近いスーパーで新鮮で安い野菜と甘い果物と魚を買います",
      "今天我在离家近的超市买又新鲜又便宜的蔬菜、甜的水果和鱼。",
    ],
    [
      "今日私は家に近いスーパーで新鮮で安い野菜と甘い果物と魚と肉を買います",
      "今天我在离家近的超市买又新鲜又便宜的蔬菜、甜的水果、鱼和肉。",
    ],
    [
      "今日私は家に近いスーパーで新鮮で安い野菜と甘い果物と魚と肉と卵を買います",
      "今天我在离家近的超市买又新鲜又便宜的蔬菜、甜的水果、鱼、肉和蛋。",
    ],
    [
      "今日私は家に近い新しいスーパーで新鮮で安い野菜と甘い果物と魚と肉と卵を買います",
      "今天我在离家近的新超市买又新鲜又便宜的蔬菜、甜的水果、鱼、肉和蛋。",
    ],
    [
      "今日私は家に近い新しいスーパーで新鮮で安い野菜と甘い果物と魚と肉と卵をたくさん買います",
      "今天我在离家近的新超市买了很多又新鲜又便宜的蔬菜、甜的水果、鱼、肉和蛋。",
    ],
  ],
  extra: [
    ["昨日私はスーパーで魚を買いました", "昨天我在超市买了鱼。"],
    ["明日私はスーパーで果物を買います", "明天我在超市买水果。"],
    ["スーパーは朝九時に開きます", "超市早上九点开门。"],
    ["私はお金を払います", "我付钱。"],
    ["私は財布にお金を入れます", "我把钱放进钱包。"],
    ["私は家で料理を作ります", "我在家做菜。"],
    ["私は毎晩料理を食べます", "我每天晚上吃（自己做的）菜。"],
    ["店員は袋に野菜を入れます", "店员把蔬菜装进袋子。"],
    ["私は家に帰ります", "我回家。"],
  ],
};

const LESSONS = { "02": LESSON_02, "03": LESSON_03 };

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

  for (const w of lesson.words) {
    if (PARTICLES.has(w[0])) problems.push(`助词「${w[0]}」不该作为单词`);
  }
  for (const st of built.sentences) {
    for (const t of st.tokens) {
      if (!PARTICLES.has(t.text) && !wordSet.has(t.text)) {
        problems.push(`「${st.japanese}」的内容词「${t.text}」不在单词表`);
      }
    }
    if (!st.kana || !st.romaji || !st.chinese) problems.push(`「${st.japanese}」缺 kana/romaji/chinese`);
  }

  // 主链：每步恰好新增一个内容词
  let prev = 0;
  for (const st of built.chainStatements) {
    const count = contentWords(st).length;
    if (prev && count !== prev + 1) {
      problems.push(`主链「${st.japanese}」新增了 ${count - prev} 个内容词（应恰好 1）`);
    }
    if (count <= prev) problems.push(`主链「${st.japanese}」内容词数没增加`);
    prev = count;
  }
  if (prev < 15) problems.push(`主链终句内容词只有 ${prev} 个（要求 ≥15）`);

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
    if (!same) {
      console.error(`\n内容发生变化（拒绝覆盖 ${path.basename(out)}）：只允许重排顺序`);
      process.exit(1);
    }
    console.log(`\n  与现有 ${path.basename(out)} 内容一致（仅顺序可能不同）`);
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
