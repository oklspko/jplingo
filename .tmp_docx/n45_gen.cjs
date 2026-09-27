const fs = require('fs');
const pts = JSON.parse(fs.readFileSync('.tmp_docx/grammar_points_n45.json', 'utf8'));
const ANALYSIS = require('./n45_analysis.cjs');

// ---------- 文本清洗（应用于 setsuzoku / meaning / note / 例句 jp） ----------
const TEXT_FIX = [
  // OCR 错字
  ['けledo', 'けど'],
  ['摄', '撮'],
  ['なさせる', 'なさる'],
  ['入てはいけ', '入ってはいけ'],
  ['洗わないなければ', '洗わなければ'],
  ['磨かなくてははいけ', '磨かなくてはいけ'],
  ['なくてははいけ', 'なくてはいけ'],
  ['たばコ', 'たばこ'],
  ['買に行く', '買いに行く'],
  ['つけましたまま', 'つけたまま'],
  ['聞くると', '聞くと'],
  ['咲ません', '咲きません'],
  ['決めったら', '決めたら'],
  ['どういたまして', 'どういたしまして'],
  // 多字汉字注音（粘连式）
  ['約束やくそく', '約束'],
  ['突然とつぜん', '突然'],
  ['遊園地ゆうえんち', '遊園地'],
  ['仕事しごと', '仕事'],
  ['時間じかん', '時間'],
  ['試験しけん', '試験'],
  // 前缀式注音
  ['きょねんか去年', '去年'],
  ['たなかはかようび火曜日', '火曜日'],
  ['かえお帰りなさい', 'お帰りなさい'],
  ['げんきおかげさまで、元気です', 'おかげさまで、元気です'],
  ['げんきお元気で', 'お元気で'],
  ['ねがお願いします', 'お願いします'],
  ['やすお休みなさい', 'お休みなさい'],
  ['若、いろいろ', '若いうちに、いろいろ'],
];
function cleanText(s) {
  if (!s) return s;
  for (const [a, b] of TEXT_FIX) s = s.split(a).join(b);
  // 括号式注音：漢字(かな) → 漢字
  s = s.replace(/[（(][ぁ-んァ-ヶ]{1,8}[）)]/g, '');
  // 清理括号注音后可能留下的多余空格
  s = s.replace(/\(\s*\)/g, '').replace(/（\s*）/g, '');
  return s;
}

// ---------- pattern 修正 ----------
const PATTERN_FIX = [
  ['何でも/けど/けledo', '～けど'],
  ['～ 中', '～中'],
  ['時間すぎ/まえ', '時間＋すぎ/まえ'],
  ['な形容词十名词', 'な形容词＋名词'],
  ['名词1＋は＋名词2＋だった/ではありません', '名词1＋は＋名词2＋だった/ではなかった'],
  ['お/ご~なさせる', 'お/ご～なさる'],
  ['なぜ / どうして /なんで', 'なぜ / どうして / なんで'],
];
function cleanPattern(p) {
  for (const [a, b] of PATTERN_FIX) if (p === a) return b;
  return p.replace(/~/, '～');
}

// ---------- 例句拆分：处理「日文【真题】中文」无斜杠格式 ----------
function splitJpZh(ex) {
  let jp = ex.jp || '';
  let zh = ex.zh || '';
  if (zh) { jp = cleanText(jp); zh = cleanText(zh); return { jp: jp.trim(), zh: zh.trim() }; }
  jp = cleanText(jp);
  const slash = jp.indexOf('/');
  if (slash > 0) {
    zh = jp.slice(slash + 1);
    jp = jp.slice(0, slash);
  } else {
    // 在「】」后切分中文译文
    const idx = jp.indexOf('】');
    if (idx > 0 && /[一-鿿]/.test(jp.slice(idx + 1))) {
      zh = jp.slice(idx + 1);
      jp = jp.slice(0, idx + 1);
    }
  }
  return { jp: jp.trim(), zh: zh.trim() };
}

// ---------- 分析表查询（模糊匹配） ----------
const normMap = {};
for (const [k, v] of Object.entries(ANALYSIS)) normMap[k.replace(/\s+/g, ' ').trim()] = v;
function lookupAnalysis(pattern) {
  const cands = [pattern];
  for (const sep of ['/', '／']) {
    const idx = pattern.indexOf(sep);
    if (idx > 0) cands.push(pattern.slice(0, idx).trim());
  }
  for (const c of cands) {
    const k = c.replace(/\s+/g, ' ').trim();
    if (normMap[k]) return normMap[k];
  }
  return null;
}

// ---------- 组装 N4/N5 条目 ----------
const rows = [];
const counters = { N4: 0, N5: 0 };
let missingAnalysis = [];
for (const p of pts) {
  if (p.level !== 'N4' && p.level !== 'N5') continue;
  const pattern = cleanPattern(p.pattern);
  const examples = p.examples.slice(0, 3).map(splitJpZh).filter(e => e.jp);
  // 概念类条目（基数词/序数词等）无例句但说明完整，保留；仅当说明也空时才丢弃
  if (examples.length === 0 && !p.meaning.trim()) continue;
  counters[p.level]++;
  const id = `${p.level.toLowerCase()}-${String(counters[p.level]).padStart(3, '0')}`;
  const analysis = lookupAnalysis(pattern);
  if (!analysis) missingAnalysis.push(`${p.level} ${pattern}`);
  const note = cleanText(p.note || '').trim();
  rows.push({
    id, pattern,
    setsuzoku: cleanText(p.setsuzoku || '').trim(),
    meaning: cleanText(p.meaning || '').trim(),
    examples,
    note: note || undefined,
    analysis: analysis || `（待解析）${cleanText(p.meaning)}`,
    level: p.level,
  });
}

// ---------- 寒暄用语（固定表达，无接续） ----------
const GREET = [
  ['ありがとうございます。', '谢谢。'],
  ['いいえ、かまいません。', '没关系。'],
  ['いただきます。', '我开始吃饭了；我收下了。'],
  ['いってきます。', '我出去了。'],
  ['行ってらっしゃい。', '您走好。'],
  ['いらっしゃいませ。', '欢迎光临。'],
  ['お帰りなさい。', '您回来了。'],
  ['おかげさまで、元気です。', '托您的福，我很好。'],
  ['お元気で。', '多保重。'],
  ['お願いします。', '拜托了。'],
  ['おはようございます。', '早上好。'],
  ['お休みなさい。', '晚安。'],
  ['かしこまりました。', '我知道了。'],
  ['ごちそうさまでした。', '多谢款待。'],
  ['こちらこそ。', '哪里哪里。'],
  ['ごめんなさい。', '对不起。'],
  ['こんにちは。', '你好。'],
  ['こんばんは。', '晚上好。'],
  ['さようなら。', '再见。'],
  ['失礼します。', '再见。'],
  ['すみません。', '对不起；请问……'],
  ['ただいま。', '我回来了。'],
  ['では、また（あした）。', '回头见（明天见）。'],
  ['どういたしまして。', '不用谢。'],
  ['どうぞよろしく。', '请多关照。'],
  ['はじめまして。', '初次见面。'],
  ['ひさしぶりです。', '好久不见。'],
  ['わかりました。', '明白了。'],
];
for (const [jp, zh] of GREET) {
  counters.N5++;
  rows.push({
    id: `n5-${String(counters.N5).padStart(3, '0')}`,
    pattern: jp,
    setsuzoku: '',
    meaning: zh,
    examples: [{ jp, zh }],
    analysis: `拆解：固定寒暄表达，整体记忆，无接续变化。①位置：独立使用或句首。②语气：${zh}`,
    level: 'N5',
  });
}

// ---------- 追加进数据文件 ----------
const esc = (s) => JSON.stringify(s);
const file = 'app/data/jp-grammar-points.ts';
let src = fs.readFileSync(file, 'utf8');
// 去掉末尾的 "];" 及换行
const endIdx = src.lastIndexOf('];');
if (endIdx < 0) { console.error('未找到数组结尾'); process.exit(1); }
const head = src.slice(0, endIdx);

let body = '';
for (const r of rows) {
  body += '  { id: ' + esc(r.id) + ', pattern: ' + esc(r.pattern) + ', setsuzoku: ' + esc(r.setsuzoku) + ', meaning: ' + esc(r.meaning) + ', examples: [';
  body += r.examples.map(e => `{ jp: ${esc(e.jp)}, zh: ${esc(e.zh)} }`).join(', ');
  body += ']';
  if (r.note) body += ', note: ' + esc(r.note);
  body += ', analysis: ' + esc(r.analysis);
  body += ', level: ' + esc(r.level) + ' },\n';
}
fs.writeFileSync(file, head + body + '];\n', 'utf8');

console.log('追加 N4/N5 条目:', rows.length, '（N4=' + rows.filter(r => r.level === 'N4').length + ', N5=' + rows.filter(r => r.level === 'N5').length + '）');
console.log('缺失分析:', missingAnalysis.length, missingAnalysis.length ? missingAnalysis.join(' | ') : '(无)');
