<template>
  <div class="jk">
    <p class="jk-intro">
      敬语分三类：<b>尊他语（尊敬語）</b>抬高对方或话题人物的动作；<b>自谦语（謙譲語）</b>降低己方动作以抬高对方；
      <b>郑重语（丁重語）</b>使表达更郑重、恭敬。日常交流中三者常配合使用。
    </p>

    <section v-for="g in groups" :key="g.category" class="jk-group">
      <h3 class="jk-group-title">
        <span class="jk-group-icon">{{ g.icon }}</span>
        <span>{{ g.category }}</span>
        <span class="jk-group-desc">{{ g.desc }}</span>
      </h3>

      <div v-for="sub in g.subsections" :key="sub.title" class="jk-sub">
        <h4 class="jk-sub-title">{{ sub.title }}</h4>

        <div class="jk-grid">
          <article v-for="e in sub.entries" :key="e.pattern" class="jk-card">
            <div class="jk-card-head">
              <span class="jk-pattern">{{ e.pattern }}</span>
              <span v-if="e.setsuzoku" class="jk-setsuzoku">{{ e.setsuzoku }}</span>
            </div>
            <p class="jk-meaning">{{ e.meaning }}</p>
            <ul class="jk-examples">
              <li v-for="(ex, i) in e.examples" :key="i" class="jk-example">
                <span class="jk-ex-jp">{{ ex.jp }}</span>
                <span v-if="ex.zh" class="jk-ex-zh">{{ ex.zh }}</span>
              </li>
            </ul>
            <p v-if="e.note" class="jk-note">{{ e.note }}</p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
interface KeigoExample {
  jp: string;
  zh: string;
}
interface KeigoEntry {
  pattern: string;
  setsuzoku?: string;
  meaning: string;
  examples: KeigoExample[];
  note?: string;
}
interface KeigoSubsection {
  title: string;
  entries: KeigoEntry[];
}
interface KeigoGroup {
  category: string;
  icon: string;
  desc: string;
  subsections: KeigoSubsection[];
}

const bundledgroups: KeigoGroup[] = [
  {
    category: "尊他语（尊敬語）",
    icon: "👑",
    desc: "抬高对方或话题人物的动作",
    subsections: [
      {
        title: "核心句型",
        entries: [
          {
            pattern: "お/ご～になる",
            setsuzoku: "お＋Ⅰ・Ⅱ类動詞「ます形」＋になる／ご＋Ⅲ类動詞語幹＋になる",
            meaning: "对动作主体的尊敬。",
            examples: [
              { jp: "先生はもうお帰りになりました。【2007年真题】", zh: "老师已经回去了。" },
              { jp: "ここでお待ちになってください。【1996年真题】", zh: "请在此稍等。" },
            ],
            note: "相比「れる/られる」敬意程度更高。词干只有一个假名的Ⅱ类动词以及「来る」不能用于本句型。",
          },
          {
            pattern: "お/ご～です",
            setsuzoku: "お＋Ⅰ・Ⅱ类動詞「ます形」＋です／お/ご＋Ⅲ类動詞語幹・名＋です",
            meaning: "尊他语的固定表达形式。",
            examples: [
              { jp: "社長がお呼びです。", zh: "社长叫您（去一趟）。" },
              { jp: "部長、お帰りですか。", zh: "部长，您这就要回去了吗？" },
              { jp: "田中教授は午後の会議にご欠席ですか。", zh: "田中教授不出席下午的会议吗？" },
            ],
            note: "用法比较受限制，常用于一些固定的用法。",
          },
          {
            pattern: "お/ご～になる",
            setsuzoku: "お＋Ⅰ・Ⅱ类動詞「ます形」＋になる／ご＋Ⅲ类動詞語幹＋になる",
            meaning: "“您能够……；您可以……”，尊他语「お/ご～になる」的可能形。",
            examples: [
              { jp: "グリーン車だとゆっくりお座りになります。", zh: "坐指定席的话能够更宽敞一些。" },
              { jp: "市民図書館は祝日でも通常どおりにご利用になります。", zh: "市民图书馆在节假日也照常开放。" },
            ],
          },
          {
            pattern: "お/ご～なさる",
            setsuzoku: "お＋Ⅰ・Ⅱ类動詞「ます形」＋なさる／ご＋Ⅲ类動詞語幹＋なさる",
            meaning: "用法比「お/ご～になる」陈旧。",
            examples: [
              { jp: "部長は新企画についてお話しなさいました。", zh: "部长讨论了新的企划。" },
              { jp: "事前にご予約なさったほうがいいと思います。", zh: "我认为最好事先预约好。" },
            ],
            note: "「お帰りなさい(您回来了)/お休みなさい(晚安)」为固定表达。此用法较受限制，常用于「お取引なさる/お勉強なさる/ご連絡なさる/ご出席なさる」等。",
          },
          {
            pattern: "お/ご～ください",
            setsuzoku: "お＋Ⅰ・Ⅱ类動詞「ます形」＋ください／ご＋Ⅲ类動詞語幹＋ください",
            meaning: "请求别人做某事的尊敬说法。",
            examples: [
              { jp: "では、お元気で。ご両親にもどうぞよろしくお伝えください。【2009年真题】", zh: "那么，祝您身体健康，请代我向您父母问好。" },
              { jp: "皆さん、どうぞお座りください。【2004年真题】", zh: "大家请坐。" },
            ],
            note: "表达的语意与「～てください」一样，但是敬意程度更高。词干只有一个假名的Ⅱ类动词以及「来る」不能用于本句型。",
          },
          {
            pattern: "敬语助动词「れる/られる」",
            setsuzoku: "Ⅰ类動詞「ない形」＋れる／Ⅱ类動詞「ない形」＋られる／Ⅲ类動詞：する→される、来る→来られる",
            meaning: "尊敬用语的固定表达形式。",
            examples: [
              { jp: "佐藤さんは何時に帰られましたか。【2003年真题】", zh: "佐藤几点回来的？" },
              { jp: "部長は来週アメリカに行くそうです。", zh: "据说部长下周去美国出差。" },
            ],
            note: "「～れる/られる」是尊敬程度比较低的尊他语。",
          },
          {
            pattern: "お/ご～願えませんか",
            setsuzoku: "お＋動1・動2「ます形」／ご＋動3語幹＋願えませんか",
            meaning: "礼貌地请求对方做某事。",
            examples: [
              { jp: "お忙しいところ申し訳ありませんが、何とかお引き受け願えませんか。【2007年真题】", zh: "在您百忙之中实在不好意思，无论如何能否请您接受呢？" },
              { jp: "この資料の翻訳にご協力願えませんか。", zh: "请您帮忙翻译一下这份资料好吗？" },
              { jp: "電話があったことをお伝え願えませんか。", zh: "请您转告他我打过电话来好吗？" },
            ],
            note: "除了「～願う」之外，还有「～願えないでしょうか」、「～願えませんか」等多种形式。",
          },
        ],
      },
      {
        title: "特殊尊他动词",
        entries: [
          {
            pattern: "いらっしゃる",
            meaning: "“在……”、“去……”、“来……”。",
            examples: [
              { jp: "どなたか質問のある方はいらっしゃいませんか。【2007年真题】", zh: "哪位要提问吗？" },
              { jp: "先生は今週の土曜日はずっと研究室にいらっしゃるそうです。【2005年真题】", zh: "老师这周六好像一直都会在研究室里。" },
            ],
            note: "「いらっしゃる」是「いる」「行く」「来る」的特殊敬语格式。",
          },
          {
            pattern: "おっしゃる",
            meaning: "“说……”。",
            examples: [
              { jp: "意見がある方は、おっしゃってください。【2004年真题】", zh: "有意见的请说出来。" },
              { jp: "お名前はなんとおっしゃいますか。", zh: "您怎么称呼？" },
            ],
            note: "「おっしゃる」是「言う」的特殊敬语格式。",
          },
          {
            pattern: "召し上がる",
            meaning: "“吃……”、“喝……”。",
            examples: [
              { jp: "どうぞ、温かいうちにお召し上がりください。", zh: "请趁热吃。" },
              { jp: "どうぞケーキを召し上がってください。", zh: "请尝尝蛋糕。" },
            ],
            note: "「召し上がる」是「食べる」「飲む」的特殊敬语格式。",
          },
          {
            pattern: "ご覧になる",
            meaning: "“看……”。",
            examples: [
              { jp: "中川さんが描いた絵をご覧になりましたか。【2001年真题】", zh: "您看了中川画的画了吗？" },
              { jp: "新聞、もうご覧になりましたか。", zh: "您看了报纸了吗？" },
            ],
            note: "「ご覧になる」是「見る」的特殊敬语格式。",
          },
          {
            pattern: "ご存知です",
            meaning: "“知道……”。",
            examples: [
              { jp: "先生は山下さんの住所をご存知ですか。【2008年真题】", zh: "老师知道山下住哪儿吗？" },
              { jp: "あの方をご存知ですか。【2003年真题】", zh: "您认识那位吗？" },
            ],
            note: "「ご存知です」是「知っている」的特殊敬语格式。",
          },
          {
            pattern: "おいでになる",
            meaning: "“来……”、“去……”、“在……”。",
            examples: [
              { jp: "ゴールデンウィークはどこかへおいでになりますか。", zh: "黄金周您要去哪里玩吗？" },
              { jp: "先生は教室においでになりますか。", zh: "老师在教室里吗？" },
            ],
            note: "「おいでになる」是「来る」「行く」「いる」的尊他语。",
          },
          {
            pattern: "お越しになる",
            meaning: "“来……”。",
            examples: [
              { jp: "鈴木さんは日本からお越しになりました。", zh: "铃木来自日本。" },
              { jp: "奥様も一緒にお越しになりましたか。", zh: "尊夫人也一同来了吗？" },
            ],
            note: "「お越しになる」是「来る」的尊他语。",
          },
          {
            pattern: "見える/お見えになる",
            meaning: "“来了……”。",
            examples: [
              { jp: "お客様がお見えになりました。", zh: "客人来了。" },
              { jp: "部長がお見えになりました。", zh: "部长来了。" },
            ],
            note: "「見える/お見えになる」是「来る」的特殊敬语格式。",
          },
          {
            pattern: "召す",
            meaning: "“吃……”、“喝……”、“穿……”。",
            examples: [
              { jp: "朝ご飯をお召しになりましたか。", zh: "您吃过早饭了吗？" },
              { jp: "梅酒をお召しになってください。", zh: "请喝梅酒。" },
              { jp: "奥様、素敵なお着物をお召しになってますね。", zh: "夫人，您穿的和服真漂亮。" },
            ],
            note: "「召す」是「食べる」「飲む」「着る」的尊他语。",
          },
          {
            pattern: "ご覧ください",
            meaning: "“请看……”。",
            examples: [
              { jp: "添付ファイルをご覧ください。", zh: "请看附件。" },
              { jp: "詳しくはこちらをご覧ください。", zh: "具体事宜请看此处。" },
            ],
            note: "「ご覧ください」是「見る」的特殊敬语格式。",
          },
        ],
      },
      {
        title: "其他尊他表达",
        entries: [
          {
            pattern: "～ていらっしゃる/ておいでになる",
            setsuzoku: "動詞「て形」／イ形語幹＋く＋て／ナ形語幹＋で／名＋で",
            meaning: "是「～です/である/ている/てくる/ていく」等句型的尊他语表达方式。",
            examples: [
              { jp: "今、ほかの学生と話していらっしゃいますから、少々待ってください。【2010年7月真题】", zh: "（老师）现在正和别的学生谈话，请稍等一下。" },
            ],
          },
          {
            pattern: "～におかれましては",
            setsuzoku: "名＋におかれましては",
            meaning: "提示前项的人或事，“关于……”、“至于……”。",
            examples: [
              { jp: "先生におかれましては、お変わりなくお過ごしのことを存じます。", zh: "老师一切都好。" },
              { jp: "貴社におかれましては益々ご清栄のこととお慶び申し上げます。", zh: "恭贺贵公司生意兴隆。" },
              { jp: "皆様におかれましてはますますご健勝のことと心よりお慶び申し上げます。", zh: "祝愿大家身体健康。" },
            ],
            note: "①前面多用身份、地位比较高的人名或对方所属机构的尊称（如「貴社」），主要用于问候其健康、经营状况等场合。②是比较郑重的书面用语，多用于书信、商务往来。③与「～といたしましては」（自谦）相对。",
          },
        ],
      },
    ],
  },
  {
    category: "自谦语（謙譲語）",
    icon: "🙇",
    desc: "降低己方动作，抬高对方",
    subsections: [
      {
        title: "核心句型",
        entries: [
          {
            pattern: "お/ご～する",
            setsuzoku: "お＋Ⅰ・Ⅱ类動詞「ます形」＋する／ご＋Ⅲ类動詞語幹＋する",
            meaning: "表示动作主体的自谦。",
            examples: [
              { jp: "先生、わたしがその荷物をもちします。【2009年真题】", zh: "老师，我来拿那件行李吧。" },
              { jp: "わたしがビデオを先生にお返しします。【2008年真题】", zh: "我把录像带还给老师。" },
            ],
            note: "「お/ご～する」是「～する」的自谦表达，表示自己做某事。词干只有一个假名的Ⅱ类动词以及「来る」不能用于本句型。",
          },
          {
            pattern: "お/ご～いたす",
            setsuzoku: "お＋Ⅰ・Ⅱ类動詞「ます形」＋いたす／ご＋Ⅲ类動詞語幹＋いたす",
            meaning: "表示动作主体的自谦。",
            examples: [
              { jp: "チケットは後でお渡しいたします。【2009年真题】", zh: "票我等下给您。" },
              { jp: "その仕事についてはわたしからご説明いたします。【2007年真题】", zh: "有关那份工作（的详细情况）由我来进行说明。" },
            ],
            note: "「お/ご～いたす」的自谦程度比「お/ご～する」更高，「いたす」为「する」的自谦表达。",
          },
          {
            pattern: "お/ご～申し上げます",
            setsuzoku: "お＋動1・動2「ます形」／ご＋動3語幹＋申し上げます",
            meaning: "比「お/ご～する/いたします」更谦恭的表达方式。",
            examples: [
              { jp: "このたびは、私どもの商品発送ミスにより、お客様に大変ご迷惑をおかけしましたことを深くお詫び申し上げます。申し訳ございませんでした。【2010年12月真题】", zh: "这次由于我们的商品发送错误，给顾客带来了很大的麻烦，在此深表歉意。实在对不起。" },
              { jp: "お願い申し上げます。", zh: "拜托了。" },
              { jp: "大変ご迷惑をおかけしたことをお詫び申し上げます。", zh: "给您添麻烦了，真是很抱歉。" },
            ],
            note: "使用范围比较小，常见「お願い申し上げます」、「お詫び申し上げます」等固定用法。",
          },
          {
            pattern: "～(さ)せていただけますか",
            setsuzoku: "動詞使役形＋て形＋いただけますか",
            meaning: "“能否允许我……”、“请让我……”，表示请求上级或长辈允许自己做某事。",
            examples: [
              { jp: "田中です。先日お話があったスピーチの件なんですが、ぜひわたしにやらせていただけますか。【2010年7月真题】", zh: "我是田中。有关前些天提及的演讲一事，能否让我来做呢？" },
              { jp: "申し訳ありませんが、来週の火曜日休ませていただけますか。", zh: "不好意思，下周二能否让我休息？" },
              { jp: "課長、今度のプロジェクトに参加させていただけますか。", zh: "课长，能否让我参加这次的项目？" },
            ],
            note: "表示委婉的请求，自谦语的固定表达方式。",
          },
        ],
      },
      {
        title: "特殊自谦动词",
        entries: [
          {
            pattern: "いたす",
            meaning: "“做……”。",
            examples: [
              { jp: "ご指示どおりにいたします。", zh: "按照您的指示去办。" },
              { jp: "いかがいたしましょうか。", zh: "如何办好呢？" },
            ],
            note: "「いたす」是「する」的自谦语。",
          },
          {
            pattern: "おる",
            meaning: "“在……”。",
            examples: [
              { jp: "5時までに会社におります。", zh: "我会一直在公司待到五点。" },
              { jp: "日本に何年もおりました。", zh: "在日本待了很多年。" },
            ],
            note: "「おる」是「いる」的自谦表达。",
          },
          {
            pattern: "参る",
            meaning: "“来……”、“去……”。",
            examples: [
              { jp: "每年必ずおじいさんのお墓に参る。", zh: "每年都要去给爷爷扫墓。" },
              { jp: "明日、先生のお宅に参ります。", zh: "明天去老师家拜访。" },
            ],
            note: "「参る」是「行く」「来る」的特殊自谦表达。",
          },
          {
            pattern: "申す",
            meaning: "“说……”。",
            examples: [
              { jp: "私は、中川と申します。【2004年真题】", zh: "我叫中川。" },
              { jp: "父がこのように申しております。", zh: "我父亲说了这样的话。" },
            ],
            note: "「申す」是「言う」的特殊自谦表达。",
          },
          {
            pattern: "申し上げます",
            meaning: "“致以……”。",
            examples: [
              { jp: "心よりお詫び申し上げます。", zh: "诚心诚意向您致以歉意。" },
              { jp: "一言お礼を申し上げます。", zh: "向您致以诚挚的谢意。" },
            ],
            note: "「申し上げます」的自谦程度比「申す」高。",
          },
          {
            pattern: "存じている",
            meaning: "“知道……”。",
            examples: [
              { jp: "社長の電話番号は存じています。", zh: "我知道社长的电话号码。" },
              { jp: "わたしは先生のご住所を存じています。", zh: "我知道老师住在哪儿。" },
            ],
            note: "「存じている」是「知っている」的自谦语。",
          },
          {
            pattern: "存じあげる",
            meaning: "“知道……”。",
            examples: [
              { jp: "お名前はよく存じ上げております。", zh: "久仰大名。" },
              { jp: "ますますご活躍のことと存じ上げます。", zh: "一直听说您很活跃。" },
            ],
            note: "「存じ上げる」是「知っている」的自谦语。",
          },
          {
            pattern: "お目にかかる",
            meaning: "“见到……”。",
            examples: [
              { jp: "わたしもこのパーティーで先生にお目にかかれるとは思いませんでした。【2011年12月真题】", zh: "我也没想到在这个派对上能碰到老师。" },
            ],
            note: "「お目にかかる」是「会う」的特殊自谦表达。",
          },
          {
            pattern: "拝見する",
            meaning: "“看……”。",
            examples: [
              { jp: "「どうぞご覧ください。」「では、拝見します。」", zh: "“请过目。”“好的，那我就看了。”" },
              { jp: "あなたのお姿を拝見しました。", zh: "我看到您了。" },
            ],
            note: "「拝見する」是「見る」的特殊自谦表达。",
          },
          {
            pattern: "拝借する",
            meaning: "“借……”。",
            examples: [
              { jp: "先生の辞書を拝借してもよろしいですか。", zh: "老师可以把辞典借给我吗？" },
              { jp: "お知恵を拝借したいです。", zh: "我想请您帮我出个主意。" },
            ],
            note: "「拝借する」是「借りる」的自谦语。",
          },
          {
            pattern: "うかがう",
            meaning: "“问……”、“造访……”。",
            examples: [
              { jp: "授業の後、先生の研究室にうかがってもよろしいでしょうか。【2011年7月真题】", zh: "下课后，去您的研究室可以吗？" },
              { jp: "この件についてご意見をうかがいます。", zh: "关于这件事想听听您的意见。" },
            ],
            note: "「うかがう」是「行く」「来る」「聞く」「尋ねる」「訪ねる」「訪問する」的特殊自谦表达。",
          },
          {
            pattern: "承る",
            meaning: "“接受……”、“听……”。",
            examples: [
              { jp: "先生のご意見を承りました。", zh: "听取了老师的意见。" },
              { jp: "上司の命令を承らなければなりません。", zh: "必须服从上级的命令。" },
            ],
            note: "「承る」是「受ける」「聞く」的自谦语。",
          },
          {
            pattern: "あがる",
            meaning: "“吃……”、“喝……”。",
            examples: [
              { jp: "先生は毎日お魚を召し上がりますか。", zh: "老师每天都吃鱼吗？" },
              { jp: "新しい課長はどのくらいお酒を召し上がりますか。", zh: "新科长喝多少酒？" },
            ],
            note: "「あがる」是「食べる」「飲む」的自谦语（与「頂く」同类，降低己方「吃/喝」）。",
          },
          {
            pattern: "ご覧いただく",
            meaning: "“让……看……”。",
            examples: [
              { jp: "この絵をご覧いただき、ありがとうございます。", zh: "非常感谢您看了这幅画。" },
              { jp: "書いた報告を先生にご覧いただきました。", zh: "写好的报告让老师看了。" },
            ],
            note: "「ご覧いただく」是「見てもらう」的自谦语。",
          },
        ],
      },
      {
        title: "～ておる",
        entries: [
          {
            pattern: "～ておる",
            setsuzoku: "動詞「て形」＋おる",
            meaning: "“正在……”。",
            examples: [
              { jp: "荷物はわたしがお持ちしております。", zh: "行李由我来拿。" },
              { jp: "今、上海に住んでおります。", zh: "我现在住在上海。" },
              { jp: "ただいま、外出しております。", zh: "我现在外出了。" },
            ],
            note: "「～ておる」是「～ている」的自谦表达。",
          },
        ],
      },
    ],
  },
  {
    category: "郑重语（丁重語）",
    icon: "🎩",
    desc: "使表达更郑重、恭敬",
    subsections: [
      {
        title: "郑重语",
        entries: [
          {
            pattern: "ございます",
            meaning: "「ございます」是「ある」的礼貌语。",
            examples: [
              { jp: "ネクタイ売り場は2階にございます。【2004年真题】", zh: "领带的柜台在二楼。" },
              { jp: "何か質問がございませんか。", zh: "有什么疑问吗？" },
            ],
            note: "「～ございます」比「～ある」语气更恭敬也更客气，其否定形式是「～ございません」。",
          },
          {
            pattern: "～でございます",
            meaning: "「～でございます」是「～だ/です/である」的礼貌语。",
            examples: [
              { jp: "こちらのカメラは新製品でございます。", zh: "这个照相机是新产品。" },
              { jp: "お待たせいたしました、天ぷらうどんでございます。", zh: "让您久等了。这是天妇罗乌冬面。" },
            ],
            note: "「～でございます」比「～です/である」语气更恭敬也更客气，其否定形式是「～ございません」。",
          },
        ],
      },
    ],
  },
];

// ===== 语法页内容可热更新：远端 JSON 优先，缺失/未加载时用内置默认（模板无需改动）=====
const grammarContent = useJpGrammarContent();
const groups = computed(() => (grammarContent.value?.keigo as Record<string, unknown>)?.groups ?? bundledgroups);
</script>

<style scoped>
.jk {
  color: #075985;
}

.jk-intro {
  margin: 0 0 28px;
  font-size: 15px;
  line-height: 1.8;
  color: #0369a1;
}

.jk-intro b {
  color: #0284c7;
  font-weight: 700;
}

.jk-group {
  margin-bottom: 40px;
}

.jk-group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  color: #075985;
  font-weight: 700;
  margin: 0 0 16px;
}

.jk-group-icon {
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

.jk-group-desc {
  flex-shrink: 0;
  padding: 3px 12px;
  background: #f5fbff;
  border: 1px solid #e0f2fe;
  color: #7dd3fc;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.jk-sub {
  margin-bottom: 16px;
}

.jk-sub-title {
  font-size: 15px;
  color: #0369a1;
  font-weight: 700;
  margin: 0 0 12px;
  padding-left: 10px;
  border-left: 3px solid #bae6fd;
}

.jk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.jk-card {
  background: #ffffff;
  border: 1px solid #e8f6ff;
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow: 0 2px 12px rgba(186, 230, 253, 0.12);
  transition: all 0.2s;
}

.jk-card:hover {
  border-color: #bae6fd;
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(186, 230, 253, 0.25);
}

.jk-card-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #e8f6ff;
}

.jk-pattern {
  font-size: 16px;
  font-weight: 700;
  color: #075985;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.jk-setsuzoku {
  font-size: 12px;
  color: #059669;
  line-height: 1.6;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.jk-meaning {
  margin: 0 0 10px;
  font-size: 14px;
  color: #0369a1;
  line-height: 1.7;
}

.jk-examples {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.jk-example {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 10px;
  border-left: 3px solid #e0f2fe;
}

.jk-ex-jp {
  font-size: 14px;
  color: #0284c7;
  line-height: 1.6;
  font-family: "Yu Gothic UI", "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.jk-ex-zh {
  font-size: 12px;
  color: #7dd3fc;
  line-height: 1.5;
}

.jk-note {
  margin: 10px 0 0;
  padding: 8px 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  font-size: 12px;
  color: #92400e;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .jk-intro {
    font-size: 14px;
  }

  .jk-group {
    margin-bottom: 32px;
  }

  .jk-group-title {
    font-size: 18px;
    flex-wrap: wrap;
  }

  .jk-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
