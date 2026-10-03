<template>
  <div class="jp-particles">
    <p class="jp-particles-intro">
      助词是没有词形变化、不能单独使用的附属词，接在词后表明该词在句中的作用、增添意义，或连接词与词、句与句。
      按作用分六类：<b>格助词</b>、<b>提示助词</b>、<b>并列助词</b>、<b>副助词</b>、<b>接续助词</b>、<b>终助词</b>。
      同一助词常兼属多类（如「と」既是格助词，又是并列、接续助词）。
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
import { useJpGrammarContent } from "~/composables/jp/useJpGrammarContent";
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

const bundledgroups: ParticleGroup[] = [
  {
    icon: "🔗",
    category: "格助词",
    desc: "提示成分与谓语的关系",
    particles: [
      {
        p: "が",
        name: "主语 / 对象",
        usages: [
          { usage: "提示主语（新信息·强调）", example: "誰が来ましたか。→ 田中さんが来ました。", translation: "谁来了？→ 田中来了。" },
          { usage: "描述突然观察到的现象", example: "あ、雨が降っている。", translation: "啊，下起雨来了。" },
          { usage: "定语从句里的主语（可用の替换）", example: "私が（の）作った料理。", translation: "我做的菜。" },
          { usage: "疑问词作主语", example: "誰が行きますか。", translation: "谁去？" },
          { usage: "自然现象 + 自动词", example: "雪が降る。", translation: "下雪。" },
          { usage: "希望·好恶·能力的对象", example: "日本語が話せる。猫が好きだ。", translation: "会说日语。喜欢猫。" },
        ],
      },
      {
        p: "を",
        name: "宾语 / 经过",
        usages: [
          { usage: "他动词的宾语（「把」字句）", example: "本を読む。窓を開ける。", translation: "读书。开窗。" },
          { usage: "移动·经过·离开的场所", example: "道を歩く。空を飛ぶ。家を出る。", translation: "走路。在天上飞。离家。" },
          { usage: "经过的时间", example: "日本で一年を過ごした。", translation: "在日本度过了一年。" },
          { usage: "固定搭配", example: "公園を散歩する。", translation: "在公园散步。" },
        ],
      },
      {
        p: "に",
        name: "时间·地点·对象",
        usages: [
          { usage: "目的地·对象（落点）", example: "学校に行く。友達に会う。", translation: "去学校。见朋友。" },
          { usage: "存在的场所", example: "机の上に本がある。", translation: "桌上有书。" },
          { usage: "动作发生的具体时间", example: "七時に起きる。", translation: "七点起床。" },
          { usage: "被动·授受的动作发起者", example: "母に叱られた。先生に教わる。", translation: "被妈妈批评了。跟老师学。" },
          { usage: "心理感受的原因", example: "騒音に困る。", translation: "为噪音所困扰。" },
          { usage: "评价基准", example: "体にいい。私には難しい。", translation: "对身体好。对我太难。" },
          { usage: "动作频度（一段时间 + 次数）", example: "一日に三回飲む。", translation: "一天喝三次。" },
          { usage: "叠加（N + に + N）", example: "ご飯に味噌汁。", translation: "米饭再加上味噌汤。" },
          { usage: "目的（动词连用形 + に + 移动动词）", example: "映画を見に行く。", translation: "去看电影。" },
          { usage: "用途（～に使う / のに）", example: "包丁は料理に使う。字を書くのに使う。", translation: "菜刀用来做菜。用来写字。" },
        ],
      },
      {
        p: "で",
        name: "场所 / 手段",
        usages: [
          { usage: "动作·事件发生的场所", example: "図書館で勉強する。教室で会議がある。", translation: "在图书馆学习。在教室开会。" },
          { usage: "工具·手段·材料·时间·人数", example: "ペンで書く。紙で作る。一時間でできる。一人で行く。", translation: "用笔写。用纸做。一小时能完成。一个人去。" },
          { usage: "状态（固定搭配）", example: "裸足で歩く。", translation: "光着脚走路。" },
          { usage: "生理·情绪·自然现象的原因", example: "病気で休む。地震で倒れた。", translation: "因病休息。因地震倒塌了。" },
          { usage: "评价的范围", example: "一年で一番暑い時期。", translation: "一年中最热的时候。" },
          { usage: "动作主体（组织·团体）", example: "学校側で調査を行う。", translation: "由校方进行调查。" },
          { usage: "时间界限（到…为止结束）", example: "会議は五時で終わった。", translation: "会议五点结束了。" },
          { usage: "数量合计（打包）", example: "三つで百円。全部で千円。", translation: "三个一百日元。总共一千日元。" },
        ],
      },
      {
        p: "へ",
        name: "方向 / 对象",
        usages: [
          { usage: "动作的方向", example: "北京へ行きます。", translation: "去北京。" },
          { usage: "动作的对象", example: "友達へ電話します。", translation: "给朋友打电话。" },
          { usage: "へ 与 に 的区别", example: "方向用へ/に；到达点只用に。", translation: "駅へ行く（方向）／駅に着く（到达）。" },
        ],
      },
      {
        p: "と",
        name: "引用 / 共同",
        usages: [
          { usage: "引用内容（相当于引号）", example: "「はい」と言う。行こうと思う。", translation: "说「好的」。打算去。" },
          { usage: "共同做某事的对象", example: "友達と遊ぶ。彼と一緒に行く。", translation: "和朋友玩。和他一起去。" },
          { usage: "全部列举（…と…と）", example: "犬と猫とを飼う。", translation: "养狗和猫。" },
          { usage: "一…就（假定·发现）", example: "このボタンを押すと、切符が出る。", translation: "一按这个按钮，票就出来。" },
          { usage: "判断异同的基准", example: "彼と似ている。私と同じだ。", translation: "和他很像。和我一样。" },
          { usage: "接在副词后加强语气", example: "ゆっくりと休む。", translation: "慢慢地休息。" },
        ],
      },
      {
        p: "から",
        name: "起点 / 原因",
        usages: [
          { usage: "起点（从…）", example: "九時から始まる。家から駅まで歩く。", translation: "九点开始。从家走到车站。" },
          { usage: "原材料（肉眼看不到）", example: "米から酒を作る。水は水素と酸素からなる。", translation: "用米酿酒。水由氢和氧构成。" },
          { usage: "原因（小句 + から）", example: "雨だから行かない。", translation: "因为下雨不去。" },
          { usage: "被动句的施动者", example: "先生から叱られた。", translation: "被老师批评了。" },
          { usage: "界限（约…以上）", example: "千円から。", translation: "一千日元起。" },
          { usage: "由前项小事引发后项大事", example: "タバコの火から火事になった。", translation: "由烟头引起了火灾。" },
        ],
      },
      {
        p: "まで",
        name: "终点 / 极端",
        usages: [
          { usage: "终点（到…为止）", example: "五時まで働く。", translation: "工作到五点。" },
          { usage: "极端举例（连…都）", example: "子供まで知っている。", translation: "连小孩都知道。" },
          { usage: "程度（不过、大不了）", example: "言うまでもない。", translation: "自不必说。" },
          { usage: "期限（までに）", example: "五時までに帰る。", translation: "五点之前回来。" },
          { usage: "句尾省略（ったら/ってば）", example: "早くしてったら。", translation: "你快点儿呀（不满）。" },
        ],
      },
      {
        p: "より",
        name: "比较基准",
        usages: [
          { usage: "比较（比…更…）", example: "私より背が高い。", translation: "比我高。" },
          { usage: "时间·空间起点", example: "九時より始まる。東京より大阪へ。", translation: "九点开始。从东京到大阪。" },
          { usage: "限定·强调否定（除…没有）", example: "彼よりほかに適任者はいない。", translation: "除他之外没有合适人选。" },
        ],
      },
      {
        p: "の",
        name: "所属 / 从属",
        usages: [
          { usage: "相当于「的」（N1 の N2）", example: "私の本。", translation: "我的书。" },
          { usage: "代替前面出现过的名词", example: "もっと大きいのがほしい。", translation: "想要更大的。" },
          { usage: "提出疑问或解释说明", example: "どこへ行くの？彼は来ないの。", translation: "去哪儿呀？他不来吗？" },
          { usage: "断定（のだ / のです）", example: "彼は学生なのだ。", translation: "他是学生呀。" },
          { usage: "名词化（形式名词）", example: "子供が生まれるのは喜ばしいことだ。", translation: "孩子出生是件令人高兴的事。" },
          { usage: "定语从句中代替「が」", example: "王さんが（の）好きな食べ物。", translation: "小王喜欢的食物。" },
        ],
      },
    ],
  },
  {
    icon: "⭐",
    category: "提示助词",
    desc: "突出提示、对比、限定",
    particles: [
      {
        p: "は",
        name: "主题 / 对比",
        usages: [
          { usage: "提示主题（大主题与小主语）", example: "私は学生です。象は鼻が長い。", translation: "我是学生。大象鼻子长。" },
          { usage: "强调·对比", example: "酒は飲まない。", translation: "酒（的话）不喝。" },
          { usage: "强调最小限度（起码…）", example: "これくらいはできる。", translation: "这点事还是能做到的。" },
        ],
      },
      {
        p: "も",
        name: "也 / 强调",
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
        p: "でも",
        name: "举例 / 极端",
        usages: [
          { usage: "举例", example: "お茶でも飲もう。", translation: "喝点茶什么的吧。" },
          { usage: "极端（连…都）", example: "子供でもできる。", translation: "连小孩都会。" },
        ],
      },
      {
        p: "さえ",
        name: "连…都 / 只要",
        usages: [
          { usage: "极端", example: "水さえ飲めない。", translation: "连水都喝不了。" },
          { usage: "只要（さえ～ば）", example: "これさえあればいい。", translation: "只要有这个就行。" },
        ],
      },
      {
        p: "だって",
        name: "也（口语）",
        usages: [
          { usage: "也", example: "私だって行きたい。", translation: "我也想去。" },
        ],
      },
      {
        p: "すら",
        name: "连…都（书面）",
        usages: [
          { usage: "极端", example: "名前すら書けない。", translation: "连名字都不会写。" },
        ],
      },
      {
        p: "だに",
        name: "连…都（文语）",
        usages: [
          { usage: "极端", example: "想像だにしない。", translation: "连想都没想到。" },
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
        name: "完全列举",
        usages: [
          { usage: "穷尽列举", example: "犬と猫を飼う。", translation: "养狗和猫。" },
        ],
      },
      {
        p: "や",
        name: "部分列举",
        usages: [
          { usage: "举例列举（暗示还有其他）", example: "本やノートを買う。", translation: "买书、笔记本等。" },
        ],
      },
      {
        p: "とか",
        name: "部分列举（口语）",
        usages: [
          { usage: "举例列举", example: "テニスとかサッカーが好き。", translation: "喜欢网球、足球等。" },
        ],
      },
      {
        p: "なり",
        name: "部分列举",
        usages: [
          { usage: "列举选择", example: "行くなり来るなりしなさい。", translation: "去或来，选一个。" },
        ],
      },
      {
        p: "やら",
        name: "部分列举",
        usages: [
          { usage: "举例列举（含不确定）", example: "犬やら猫やらを飼っている。", translation: "养着狗啊猫啊的。" },
        ],
      },
      {
        p: "だの",
        name: "部分列举（贬义）",
        usages: [
          { usage: "举例列举", example: "勉強だの仕事だのと忙しい。", translation: "又是学习又是工作，很忙。" },
        ],
      },
      {
        p: "か",
        name: "选择并列",
        usages: [
          { usage: "选择（～か～か / ～かどうか）", example: "行くか行かないか決める。", translation: "决定去还是不去。" },
        ],
      },
      {
        p: "に",
        name: "列举添加",
        usages: [
          { usage: "并列添加", example: "ご飯に味噌汁に漬物。", translation: "米饭、味噌汤、酱菜。" },
        ],
      },
      {
        p: "たり",
        name: "动作列举",
        usages: [
          { usage: "举例并列（…たり…たり）", example: "読んだり書いたりする。", translation: "又读又写。" },
        ],
      },
    ],
  },
  {
    icon: "📊",
    category: "副助词",
    desc: "限定、程度、添加等",
    particles: [
      {
        p: "など",
        name: "…之类",
        usages: [
          { usage: "列举（…之类）", example: "本などを買う。", translation: "买书什么的。" },
        ],
      },
      {
        p: "くらい",
        name: "大约 / 程度",
        usages: [
          { usage: "大约", example: "一時間ぐらい。", translation: "大约一小时。" },
          { usage: "程度", example: "泣きたいくらいだ。", translation: "到了想哭的地步。" },
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
        p: "ばかり",
        name: "净是 / 刚刚",
        usages: [
          { usage: "限定（净是）", example: "ゲームばかりしている。", translation: "光顾着打游戏。" },
          { usage: "刚刚（た＋ばかり）", example: "今帰ったばかりだ。", translation: "刚刚回来。" },
        ],
      },
      {
        p: "だけ",
        name: "只 / 尽量",
        usages: [
          { usage: "限定", example: "それだけです。", translation: "只有那些。" },
          { usage: "尽量", example: "好きなだけ食べる。", translation: "想吃多少吃多少。" },
        ],
      },
      {
        p: "のみ",
        name: "只（书面）",
        usages: [
          { usage: "限定", example: "返事は書面のみとする。", translation: "答复仅限书面。" },
        ],
      },
      {
        p: "きり",
        name: "只有 / 自从",
        usages: [
          { usage: "限定（只有）", example: "二人きりで話す。", translation: "两个人单独谈。" },
          { usage: "自从…（た＋きり）", example: "一度会ったきり会っていない。", translation: "见了一面后再没见过。" },
        ],
      },
      {
        p: "ずつ",
        name: "每…",
        usages: [
          { usage: "等量分配", example: "一人に二つずつ。", translation: "每人两个。" },
        ],
      },
      {
        p: "やら",
        name: "不确定列举",
        usages: [
          { usage: "不确定（何やら）", example: "何やら音がする。", translation: "好像有什么声音。" },
        ],
      },
      {
        p: "まで",
        name: "甚至（程度）",
        usages: [
          { usage: "添加极端", example: "子供まで笑った。", translation: "连孩子都笑了。" },
        ],
      },
      {
        p: "から",
        name: "至少（数量）",
        usages: [
          { usage: "数量起点", example: "千円から。", translation: "一千日元起。" },
        ],
      },
      {
        p: "か",
        name: "不确定",
        usages: [
          { usage: "疑问词 + か（不确定）", example: "どこかで会った。", translation: "好像在哪儿见过。" },
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
        p: "が",
        name: "转折 / 铺垫",
        usages: [
          { usage: "转折", example: "高いが、買う。", translation: "虽然贵，但买。" },
          { usage: "顺接·铺垫（有求于人）", example: "すみませんが、駅はどこですか。", translation: "打扰一下，车站怎么走？" },
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
        p: "ても・でも",
        name: "让步",
        usages: [
          { usage: "即使…也", example: "高くても買う。", translation: "再贵也买。" },
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
        p: "て・で",
        name: "并列 / 顺序",
        usages: [
          { usage: "顺序·并列", example: "朝起きて、顔を洗う。", translation: "早上起来洗脸。" },
          { usage: "原因", example: "風邪を引いて休んだ。", translation: "感冒了，休息了。" },
          { usage: "方式·伴随", example: "歩いて行く。", translation: "走着去。" },
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
        name: "必然 / 假定",
        usages: [
          { usage: "必然结果", example: "春になると花が咲く。", translation: "一到春天花就开。" },
          { usage: "假定", example: "行かないと遅れる。", translation: "不去的话会迟到。" },
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
        p: "たら",
        name: "假定 / 契机",
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
      {
        p: "のに",
        name: "转折（意外）",
        usages: [
          { usage: "转折·不满", example: "勉強したのに不合格だった。", translation: "明明努力了却不及格。" },
        ],
      },
      {
        p: "ては・では",
        name: "如果…就（负面）",
        usages: [
          { usage: "假定（后接否定）", example: "そんなに食べては太る。", translation: "那样吃会发胖的。" },
        ],
      },
      {
        p: "ものの",
        name: "虽然…但",
        usages: [
          { usage: "转折（书面）", example: "高いものの、質がいい。", translation: "虽然贵，但质量好。" },
        ],
      },
      {
        p: "たって・だって",
        name: "即使（口语）",
        usages: [
          { usage: "让步", example: "泣いたってだめだ。", translation: "哭也没用。" },
        ],
      },
      {
        p: "とも",
        name: "即使…也（书面）",
        usages: [
          { usage: "让步", example: "少なくとも。", translation: "至少。" },
        ],
      },
      {
        p: "つつ",
        name: "一边…一边（书面）",
        usages: [
          { usage: "同时进行", example: "酒を飲みつつ語る。", translation: "边喝酒边聊。" },
          { usage: "转折（つつも）", example: "悪いと知りつつやめられない。", translation: "明知不好却戒不掉。" },
        ],
      },
      {
        p: "なり",
        name: "一…就",
        usages: [
          { usage: "立即发生", example: "帰るなり寝た。", translation: "一回家就睡了。" },
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
        p: "かしら",
        name: "疑问（女性）",
        usages: [
          { usage: "疑问·自问自答", example: "これでいいかしら。", translation: "这样行吗？" },
        ],
      },
      {
        p: "かな",
        name: "自言自语疑问",
        usages: [
          { usage: "自问·不确定", example: "明日は晴れるかな。", translation: "明天会晴吗。" },
        ],
      },
      {
        p: "ぞ",
        name: "强调（男性）",
        usages: [
          { usage: "强调·提醒", example: "行くぞ。", translation: "走喽。" },
        ],
      },
      {
        p: "な・なあ",
        name: "感叹 / 提醒",
        usages: [
          { usage: "感叹", example: "きれいだなあ。", translation: "真漂亮啊。" },
          { usage: "提醒·忠告（男性化）", example: "気をつけるな。", translation: "小心点啊。" },
        ],
      },
      {
        p: "とも",
        name: "当然",
        usages: [
          { usage: "断然肯定", example: "行くとも。", translation: "当然去。" },
        ],
      },
      {
        p: "わ",
        name: "感叹（女性）",
        usages: [
          { usage: "感叹·确认", example: "すごいわ。", translation: "真厉害呀。" },
          { usage: "わよ（略带提醒）", example: "早く行くわよ。", translation: "快点去啦。" },
        ],
      },
      {
        p: "か",
        name: "疑问 / 感叹",
        usages: [
          { usage: "疑问（升调）", example: "行きますか。", translation: "去吗？" },
          { usage: "感叹·确认（降调）", example: "ああ、そうか。", translation: "啊，原来如此。" },
        ],
      },
      {
        p: "ね",
        name: "确认 / 同感",
        usages: [
          { usage: "确认·同感", example: "いい天気ですね。", translation: "天气真好啊。" },
        ],
      },
      {
        p: "よ",
        name: "提醒 / 告知",
        usages: [
          { usage: "提醒·告知", example: "もう時間ですよ。", translation: "已经到时间了哦。" },
        ],
      },
      {
        p: "さ",
        name: "断定（轻松）",
        usages: [
          { usage: "轻松断定", example: "大丈夫さ。", translation: "没事的啦。" },
        ],
      },
      {
        p: "の",
        name: "疑问（柔和）",
        usages: [
          { usage: "柔和疑问", example: "どこへ行くの。", translation: "要去哪儿呀？" },
        ],
      },
      {
        p: "こと",
        name: "感叹（女性）",
        usages: [
          { usage: "感叹", example: "まあ、きれいなこと。", translation: "哎呀，真漂亮。" },
        ],
      },
      {
        p: "もの",
        name: "理由（撒娇）",
        usages: [
          { usage: "辩解·撒娇", example: "だって好きなんだもの。", translation: "因为人家喜欢嘛。" },
        ],
      },
    ],
  },
];

// ===== 语法页内容可热更新：远端 JSON 优先，缺失/未加载时用内置默认（模板无需改动）=====
const grammarContent = useJpGrammarContent();
const groups = computed(() => (grammarContent.value?.particles as Record<string, unknown>)?.groups ?? bundledgroups);
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
