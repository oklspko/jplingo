<template>
  <div class="jp-particles">
    <p class="jp-particles-intro">
      助词是日语里「贴在单词后面、提示它和谓语是什么关系」的小词。按作用分五类：
      <b>格助词</b>（成分与谓语的关系）、<b>取り立て助词</b>（强调 / 限定）、
      <b>接续助词</b>（连接句子或成分）、<b>终助词</b>（句末语气）、<b>并列助词</b>（列举）。
    </p>

    <section
      v-for="group in groups"
      :key="group.category"
      class="jp-particles-group"
    >
      <h3 class="jp-particles-group-title">
        <span class="jp-particles-group-icon">{{ group.icon }}</span>
        <span>{{ group.category }}</span>
        <span class="jp-particles-group-tag">{{ group.desc }}</span>
      </h3>

      <div class="jp-particles-grid">
        <article v-for="p in group.particles" :key="p.p" class="jp-particle-card">
          <div class="jp-particle-head">
            <span class="jp-particle-kana">{{ p.p }}</span>
            <span class="jp-particle-name">{{ p.name }}</span>
          </div>
          <ul class="jp-particle-usages">
            <li v-for="(u, i) in p.usages" :key="i" class="jp-particle-usage">
              <span class="jp-particle-usage-label">{{ u.usage }}</span>
              <span class="jp-particle-example">{{ u.example }}</span>
              <span class="jp-particle-translation">{{ u.translation }}</span>
            </li>
          </ul>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
interface Usage {
  usage: string;
  example: string;
  translation: string;
}
interface Particle {
  p: string;
  name: string;
  usages: Usage[];
}
interface ParticleGroup {
  icon: string;
  category: string;
  desc: string;
  particles: Particle[];
}

const groups: ParticleGroup[] = [
  {
    icon: "🔗",
    category: "格助词",
    desc: "提示句子成分与谓语的关系",
    particles: [
      {
        p: "が",
        name: "主语 / 对象",
        usages: [
          { usage: "提示主语", example: "雨が降る。", translation: "下雨。" },
          { usage: "提示能力·愿望的对象", example: "日本語が話せる。", translation: "会说日语。" },
          { usage: "提示好恶的对象", example: "猫が好きだ。", translation: "喜欢猫。" },
        ],
      },
      {
        p: "を",
        name: "宾语 / 经过",
        usages: [
          { usage: "提示宾语", example: "本を読む。", translation: "读书。" },
          { usage: "表示经过·离开", example: "道を歩く。家を出る。", translation: "走路。离家。" },
          { usage: "使役对象", example: "子供を泣かせる。", translation: "把孩子弄哭了。" },
        ],
      },
      {
        p: "に",
        name: "时间·地点·对象",
        usages: [
          { usage: "存在的场所", example: "机の上に本がある。", translation: "桌上有书。" },
          { usage: "时间点", example: "七時に起きる。", translation: "七点起床。" },
          { usage: "目的地·动作对象", example: "学校に行く。友達に会う。", translation: "去学校。见朋友。" },
          { usage: "被动句的施动者", example: "母に叱られた。", translation: "被妈妈批评了。" },
        ],
      },
      {
        p: "で",
        name: "场所·手段",
        usages: [
          { usage: "动作进行的场所", example: "図書館で勉強する。", translation: "在图书馆学习。" },
          { usage: "手段·工具", example: "ペンで書く。", translation: "用笔写。" },
          { usage: "原因", example: "病気で休む。", translation: "因病休息。" },
          { usage: "范围·限定", example: "クラスで一番だ。", translation: "班里第一。" },
        ],
      },
      {
        p: "へ",
        name: "方向",
        usages: [
          { usage: "表示移动方向", example: "駅へ行く。", translation: "去车站。" },
        ],
      },
      {
        p: "と",
        name: "共同·引用",
        usages: [
          { usage: "共同对象", example: "友達と遊ぶ。", translation: "和朋友玩。" },
          { usage: "引用内容", example: "「はい」と言う。", translation: "说「好的」。" },
          { usage: "变化结果", example: "春となる。", translation: "到了春天。" },
        ],
      },
      {
        p: "から",
        name: "起点·原因",
        usages: [
          { usage: "时间·空间起点", example: "九時から始まる。", translation: "九点开始。" },
          { usage: "来源·出处", example: "先生から聞く。", translation: "从老师那儿听说。" },
          { usage: "原因", example: "雨だから行かない。", translation: "因为下雨不去。" },
        ],
      },
      {
        p: "まで",
        name: "终点·极限",
        usages: [
          { usage: "终点", example: "五時まで働く。", translation: "工作到五点。" },
          { usage: "程度极限", example: "ここまで頑張る。", translation: "努力到这一步。" },
        ],
      },
      {
        p: "より",
        name: "比较基准",
        usages: [
          { usage: "比较", example: "私より背が高い。", translation: "比我高。" },
        ],
      },
      {
        p: "の",
        name: "所属·从属",
        usages: [
          { usage: "所属·所有", example: "私の本。", translation: "我的书。" },
          { usage: "同位关系", example: "友達の田中さん。", translation: "朋友田中。" },
          { usage: "从句里的主语", example: "桜の咲く頃。", translation: "樱花开放时。" },
          { usage: "名词化", example: "赤いのがほしい。", translation: "想要红色的。" },
        ],
      },
    ],
  },
  {
    icon: "⭐",
    category: "取り立て助词",
    desc: "强调、限定、对比等语气",
    particles: [
      {
        p: "は",
        name: "主题·对比",
        usages: [
          { usage: "提示主题", example: "私は学生です。", translation: "我是学生。" },
          { usage: "表示对比", example: "酒は飲まない。", translation: "酒（的话）不喝。" },
        ],
      },
      {
        p: "も",
        name: "也·强调",
        usages: [
          { usage: "也 / 都", example: "私も行く。", translation: "我也去。" },
          { usage: "强调数量之多", example: "五時間も待った。", translation: "竟等了五个小时。" },
        ],
      },
      {
        p: "こそ",
        name: "正是",
        usages: [
          { usage: "强调", example: "これこそ欲しい物だ。", translation: "这才是我想要的东西。" },
        ],
      },
      {
        p: "しか～ない",
        name: "只有",
        usages: [
          { usage: "限定·否定", example: "水しか飲まない。", translation: "只喝水。" },
        ],
      },
      {
        p: "だけ",
        name: "只·尽量",
        usages: [
          { usage: "限定", example: "それだけです。", translation: "只有那些。" },
          { usage: "尽量", example: "好きなだけ食べる。", translation: "想吃多少吃多少。" },
        ],
      },
      {
        p: "ばかり",
        name: "光·净是",
        usages: [
          { usage: "限定（净是）", example: "ゲームばかりしている。", translation: "光顾着打游戏。" },
          { usage: "刚刚（た＋ばかり）", example: "今帰ったばかりだ。", translation: "刚刚回来。" },
        ],
      },
      {
        p: "でも",
        name: "举例·极端",
        usages: [
          { usage: "举例", example: "お茶でも飲もう。", translation: "喝点茶什么的吧。" },
          { usage: "极端（连…都）", example: "子供でもできる。", translation: "连小孩都会。" },
        ],
      },
      {
        p: "さえ",
        name: "连…都",
        usages: [
          { usage: "极端", example: "水さえ飲めない。", translation: "连水都喝不了。" },
          { usage: "只要（さえ～ば）", example: "これさえあればいい。", translation: "只要有这个就行。" },
        ],
      },
      {
        p: "など・なんか",
        name: "…之类",
        usages: [
          { usage: "列举（…之类）", example: "本などを買う。", translation: "买书什么的。" },
          { usage: "轻视", example: "彼なんか怖くない。", translation: "他这种人我才不怕。" },
        ],
      },
      {
        p: "ほど",
        name: "程度",
        usages: [
          { usage: "程度", example: "死ぬほど疲れた。", translation: "累得要死。" },
          { usage: "越…越（ば…ほど）", example: "見れば見るほど好きになる。", translation: "越看越喜欢。" },
        ],
      },
      {
        p: "くらい",
        name: "大约·程度",
        usages: [
          { usage: "大约", example: "一時間ぐらい。", translation: "大约一小时。" },
          { usage: "程度", example: "泣きたいくらいだ。", translation: "到了想哭的地步。" },
        ],
      },
      {
        p: "ずつ",
        name: "每…",
        usages: [
          { usage: "等量分配", example: "一人に二つずつ。", translation: "每人两个。" },
        ],
      },
    ],
  },
  {
    icon: "🔀",
    category: "接续助词",
    desc: "连接句子或成分",
    particles: [
      {
        p: "て・で",
        name: "并列·顺序",
        usages: [
          { usage: "顺序·并列", example: "朝起きて、顔を洗う。", translation: "早上起来洗脸。" },
          { usage: "原因", example: "風邪を引いて休んだ。", translation: "感冒了，休息了。" },
          { usage: "方式·伴随", example: "歩いて行く。", translation: "走着去。" },
        ],
      },
      {
        p: "が・けれども",
        name: "转折·铺垫",
        usages: [
          { usage: "转折", example: "高いが、買う。", translation: "虽然贵，但买。" },
          { usage: "铺垫·引出话题", example: "すみませんが、駅はどこですか。", translation: "打扰一下，车站怎么走？" },
        ],
      },
      {
        p: "から",
        name: "原因",
        usages: [
          { usage: "主观原因", example: "雨だから行かない。", translation: "因为下雨不去。" },
        ],
      },
      {
        p: "ので",
        name: "原因（客观）",
        usages: [
          { usage: "客观原因", example: "雨が降ったので中止した。", translation: "因为下雨中止了。" },
        ],
      },
      {
        p: "し",
        name: "并列列举",
        usages: [
          { usage: "列举理由", example: "安いし、おいしい。", translation: "又便宜又好吃。" },
        ],
      },
      {
        p: "たり",
        name: "举例并列",
        usages: [
          { usage: "列举动作", example: "読んだり書いたりする。", translation: "又读又写。" },
        ],
      },
      {
        p: "ながら",
        name: "一边…一边",
        usages: [
          { usage: "同时进行", example: "音楽を聞きながら歩く。", translation: "边听音乐边走。" },
          { usage: "转折（ながらも）", example: "知りながら教えない。", translation: "明明知道却不教。" },
        ],
      },
      {
        p: "のに",
        name: "转折（意外）",
        usages: [
          { usage: "转折·不满", example: "勉強したのに不合格だった。", translation: "明明努力了却不及格。" },
        ],
      },
      {
        p: "ば",
        name: "假定",
        usages: [
          { usage: "假定", example: "雨が降れば中止だ。", translation: "下雨的话就中止。" },
        ],
      },
      {
        p: "と",
        name: "必然·假定",
        usages: [
          { usage: "必然结果", example: "春になると花が咲く。", translation: "一到春天花就开。" },
          { usage: "假定", example: "行かないと遅れる。", translation: "不去的话会迟到。" },
        ],
      },
      {
        p: "ても・でも",
        name: "让步",
        usages: [
          { usage: "即使…也", example: "高くても買う。", translation: "再贵也买。" },
        ],
      },
      {
        p: "たら",
        name: "假定·契机",
        usages: [
          { usage: "假定·契机", example: "帰ったら電話する。", translation: "回去后给你打电话。" },
        ],
      },
      {
        p: "なら",
        name: "假定（前提）",
        usages: [
          { usage: "假定·前提", example: "行くなら早く。", translation: "要去就早点。" },
        ],
      },
    ],
  },
  {
    icon: "💬",
    category: "终助词",
    desc: "句末语气",
    particles: [
      {
        p: "か",
        name: "疑问·反问",
        usages: [
          { usage: "疑问", example: "行きますか。", translation: "去吗？" },
          { usage: "劝诱（ませんか）", example: "行きませんか。", translation: "一起去吧？" },
        ],
      },
      {
        p: "ね",
        name: "确认·同感",
        usages: [
          { usage: "确认·同感", example: "いい天気ですね。", translation: "天气真好啊。" },
        ],
      },
      {
        p: "よ",
        name: "提醒·告知",
        usages: [
          { usage: "提醒·告知", example: "もう時間ですよ。", translation: "已经到时间了哦。" },
        ],
      },
      {
        p: "な・なあ",
        name: "感叹",
        usages: [
          { usage: "感叹", example: "きれいだなあ。", translation: "真漂亮啊。" },
        ],
      },
      {
        p: "ぞ・ぜ",
        name: "强调（男性）",
        usages: [
          { usage: "强调·提醒", example: "行くぞ。", translation: "走喽。" },
        ],
      },
      {
        p: "わ",
        name: "感叹（女性）",
        usages: [
          { usage: "感叹·强调", example: "すごいわ。", translation: "真厉害呀。" },
        ],
      },
      {
        p: "の",
        name: "疑问（柔和）",
        usages: [
          { usage: "柔和疑问", example: "どこへ行くの。", translation: "要去哪儿呀？" },
        ],
      },
    ],
  },
  {
    icon: "📋",
    category: "并列助词",
    desc: "列举事物",
    particles: [
      {
        p: "と",
        name: "全部列举",
        usages: [
          { usage: "穷尽列举", example: "犬と猫を飼う。", translation: "养狗和猫。" },
        ],
      },
      {
        p: "や",
        name: "部分列举",
        usages: [
          { usage: "举例列举", example: "本やノートを買う。", translation: "买书、笔记本等。" },
        ],
      },
      {
        p: "とか",
        name: "举例列举",
        usages: [
          { usage: "举例列举", example: "テニスとかサッカーが好き。", translation: "喜欢网球、足球等。" },
        ],
      },
      {
        p: "なり",
        name: "列举选择",
        usages: [
          { usage: "列举选择", example: "行くなり来るなりしなさい。", translation: "去或来，选一个。" },
        ],
      },
    ],
  },
];
</script>

<style scoped>
.jp-particles {
  color: #075985;
}

.jp-particles-intro {
  margin: 0 0 28px;
  font-size: 15px;
  line-height: 1.8;
  color: #0369a1;
}

.jp-particles-intro b {
  color: #0284c7;
  font-weight: 700;
}

/* 分组 */
.jp-particles-group {
  margin-bottom: 36px;
}

.jp-particles-group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 19px;
  color: #075985;
  font-weight: 700;
  margin: 0 0 16px;
}

.jp-particles-group-icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  border-radius: 10px;
  font-size: 17px;
}

.jp-particles-group-tag {
  flex-shrink: 0;
  padding: 3px 12px;
  background: #f5fbff;
  border: 1px solid #e0f2fe;
  color: #7dd3fc;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

/* 卡片网格 */
.jp-particles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.jp-particle-card {
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.12);
  transition: all 0.2s;
}

.jp-particle-card:hover {
  border-color: #bae6fd;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(186, 230, 253, 0.25);
}

.jp-particle-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #e8f6ff;
}

.jp-particle-kana {
  flex-shrink: 0;
  min-width: 34px;
  text-align: center;
  padding: 4px 10px;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  color: #075985;
  font-size: 20px;
  font-weight: 700;
  border-radius: 8px;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.jp-particle-name {
  font-size: 14px;
  font-weight: 600;
  color: #0369a1;
}

.jp-particle-usages {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.jp-particle-usage {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.jp-particle-usage-label {
  font-size: 13px;
  font-weight: 600;
  color: #075985;
}

.jp-particle-example {
  font-size: 14px;
  color: #0284c7;
  line-height: 1.6;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.jp-particle-translation {
  font-size: 12px;
  color: #7dd3fc;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .jp-particles-intro {
    font-size: 14px;
  }

  .jp-particles-group {
    margin-bottom: 30px;
  }

  .jp-particles-group-title {
    font-size: 17px;
    flex-wrap: wrap;
  }

  .jp-particles-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
