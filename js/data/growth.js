/* =========================================================
   Data / Growth : トレーダーランクごとの解放内容（称号・報酬・師匠の特別クエスト・隠し部屋・能力）と学習実績
   ・ランク判定そのものは js/trading.js の TradeEval.rank（判断の質・ヒントなし正解・異なる場面への対応で決まる）
   ・ここでは「到達したら何が起こるか」だけを定義する。報酬・実績はすべて1回限り（二重加算なし）
   ・レア装備や通常のRPG要素はランクで制限しない（隠し部屋は追加の寄り道。メインストーリーには不要）
   ========================================================= */
(function (root) {
  'use strict';

  // index は TradeEval.RANKS の添字（0:F … 6:S）
  var RANK_UNLOCKS = [
    { index: 0, letter: 'F', title: '見習いトレーダー', reward: null, unlocks: [] },
    { index: 1, letter: 'E', title: 'チャート初心者', reward: { gold: 200, item: 'herb', qty: 3 }, quest: 'mq_eye', unlocks: ['師匠の特別クエスト「自分の眼で見よ」'] },
    { index: 2, letter: 'D', title: '波形研究者', reward: { gold: 400, item: 'potion', qty: 2 }, quest: 'mq_env', hiddenRoom: { map: 'lost_forest_shrine', name: '祠の隠し書庫（森の祠の東の扉）' }, unlocks: ['師匠の特別クエスト「環境を読め」', '隠し部屋：祠の隠し書庫'] },
    { index: 3, letter: 'C', title: '環境認識の修行者', reward: { gold: 800, item: 'amulet_mind', qty: 1 }, quest: 'mq_discipline', hiddenRoom: { map: 'oblivion_cave_2', name: '洞窟の隠し工房（忘却の洞窟2階の東の扉）' }, ability: 'higher_tf_eye', unlocks: ['師匠の特別クエスト「規律の証」', '隠し部屋：洞窟の隠し工房', '能力「上位足の眼」'] },
    { index: 4, letter: 'B', title: '規律あるトレーダー', reward: { gold: 1500, item: 'ring_guard', qty: 1 }, quest: 'mq_master', ability: 'stoploss_shield', unlocks: ['師匠の特別クエスト「導師への道」', '能力「損切りシールド」'] },
    { index: 5, letter: 'A', title: '相場分析の達人', reward: { gold: 3000, item: 'elixir', qty: 1 }, ability: 'macd_hidden_strike', quest: 'mq_a', unlocks: ['能力「MACDヒドゥンストライク」', '師匠の特別クエスト「達人の眼」'] },
    { index: 6, letter: 'S', title: '波形の導師', reward: { gold: 5000, item: 'phoenix_feather', qty: 2 }, quest: 'mq_s', unlocks: ['称号「波形の導師」', '師匠の特別クエスト「導師の証」'] }
  ];

  // 学習実績：条件はすべて「記録された判断の質」から判定する（回数だけで取れる実績は最初の1つのみ）
  // check(ctx) … ctx = { d, stats, topics(topicSummary), counters, Learning, uniq }
  var ACHIEVEMENTS = [
    { id: 'first_trial', name: '最初の一歩', desc: 'チャートの試練に初めて挑戦した', reward: { gold: 50 }, check: function (c) { return (c.stats.scoreCount || 0) >= 1; } },
    { id: 'first_nohint', name: '自分の眼', desc: 'ヒントを使わずに正しい判断をした', reward: { gold: 100 }, check: function (c) { return (c.stats.noHintCorrect || 0) >= 1; } },
    { id: 'analysis_full', name: '五つの確認', desc: '上位足・波形・EMA・RCI・MACDの5項目をすべて正しく分析した', reward: { gold: 150, exp: 30 }, check: function (c) { return (c.counters.trial_analysis_full || 0) >= 1; } },
    { id: 'perfect', name: '完璧な判断', desc: '試練で90点以上を取った', reward: { gold: 200, exp: 50 }, check: function (c) { return (c.counters.trial_perfect || 0) >= 1; } },
    { id: 'skip_discipline', name: '見送りの規律', desc: '根拠が揃わない場面を5回正しく見送った', reward: { gold: 200, item: 'calm_water', qty: 2 }, check: function (c) { return (c.stats.correctSkips || 0) >= 5; } },
    { id: 'stoploss_10', name: '損切りの習慣', desc: '損切り位置を10回正しく置いた', reward: { gold: 250, item: 'hi_potion', qty: 2 }, check: function (c) { return (c.counters.trial_sl_ok || 0) >= 10; } },
    { id: 'nohint_10', name: '独り立ち', desc: 'ヒントなしで10回正しい判断をした', reward: { gold: 300, exp: 80 }, check: function (c) { return (c.stats.noHintCorrect || 0) >= 10; } },
    { id: 'variety_7', name: '七つの相場', desc: '異なる7場面で正解した（分析3項目以上）', reward: { gold: 300, exp: 80 }, check: function (c) { return c.uniq >= 7; } },
    { id: 'variety_all', name: '全場面制覇', desc: 'すべての場面で正解した（分析3項目以上）', reward: { gold: 800, item: 'hi_ether', qty: 2 }, check: function (c) { return c.uniq >= (root.Scenarios ? root.Scenarios.ids().length : 14); } },
    { id: 'topic_understood', name: '最初の理解', desc: 'いずれかの分野の習熟度が「理解」になった', reward: { gold: 150 }, check: function (c) { return c.topics.some(function (t) { return t.level === '理解'; }); } },
    { id: 'weak_overcome', name: '苦手克服', desc: '「苦手」だった分野の習熟度を「理解」まで上げた', reward: { gold: 400, exp: 100 }, check: function (c) { var ww = c.d.trade.wasWeak || {}; return c.topics.some(function (t) { return ww[t.key] && t.level === '理解'; }); } },
    { id: 'core_understood', name: '五つの眼', desc: '上位足・波形・EMA・RCI・MACDの5分野すべてが「理解」になった（各分野8回以上挑戦）', reward: { gold: 1000, exp: 200 }, check: function (c) { return ['mtf', 'dow', 'ema', 'rci', 'macd'].every(function (k) { return c.topics.some(function (t) { return t.key === k && t.level === '理解' && t.plays >= 8; }); }); } },
    { id: 'lectures_all', name: '皆伝', desc: '師匠の講義をすべて修了した', reward: { gold: 500, exp: 120 }, check: function (c) { return (root.LECTURES || []).every(function (L) { return c.d.flags[L.id] || (c.d.trade.lectures && c.d.trade.lectures[L.id]); }); } },
    { id: 'stones_all', name: '石碑巡り', desc: '到達できる地域の練習石碑をすべて達成した', reward: { gold: 400, exp: 100 }, check: function (c) { var ev = (root.LEARN_EVENTS || []).filter(function (e) { return !e.required && e.mapId; }); return ev.length > 0 && ev.every(function (e) { return c.Learning.isDone(e.id); }); } },
    { id: 'chapters_reachable', name: '三つの試練', desc: '到達できる章の必修イベントをすべて達成した', reward: { gold: 600, exp: 150 }, check: function (c) { var ev = (root.LEARN_EVENTS || []).filter(function (e) { return e.required && e.mapId; }); return ev.length > 0 && ev.every(function (e) { return c.Learning.isDone(e.id); }); } },
    { id: 'review_5', name: '復習の力', desc: '苦手分野の復習を5回行った', reward: { gold: 200 }, check: function (c) { return (c.d.trade.reviewLog || []).length >= 5; } },
    { id: 'rank_c', name: '環境を読む者', desc: 'トレーダーランクCに到達した', reward: { exp: 150 }, check: function (c) { return (c.d.trade.rankBest || 0) >= 3; } },
    { id: 'rank_s', name: '波形の導師', desc: 'トレーダーランクSに到達した', reward: { exp: 500 }, check: function (c) { return (c.d.trade.rankBest || 0) >= 6; } }
  ];

  root.RANK_UNLOCKS = RANK_UNLOCKS; root.LEARN_ACHIEVEMENTS = ACHIEVEMENTS;
})(typeof window !== 'undefined' ? window : globalThis);
