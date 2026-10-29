/* =========================================================
   RPG / Growth : トレーダーランクの到達処理（称号・報酬・クエスト・隠し部屋・能力の解放）、学習実績、
                  苦手な判断の記録、復習履歴
   ・ランクの計算は TradeEval.rank。ここは「最高到達ランク（rankBest）」を記録し、初到達時に1回だけ報酬を出す
   ・ランクが一時的に下がっても称号・解放済みの内容は失わない（練習で下がるのを恐れないため）
   ・実績は条件を満たした瞬間に1回だけ解除。報酬の二重加算なし
   ========================================================= */
(function (root) {
  'use strict';
  var Growth = {};
  function D() { return root.State.data; }
  function T() { var t = D().trade; t.achievements = t.achievements || {}; t.mistakes = t.mistakes || {}; t.reviewLog = t.reviewLog || []; t.wasWeak = t.wasWeak || {}; if (t.rankBest === undefined) t.rankBest = 0; return t; }

  Growth.unlockFor = function (idx) { return root.RANK_UNLOCKS[Math.max(0, Math.min(root.RANK_UNLOCKS.length - 1, idx))]; };
  Growth.rankBest = function () { return T().rankBest || 0; };
  Growth.title = function () { return Growth.unlockFor(Growth.rankBest()).title; };
  Growth.rankReached = function (idx) { return Growth.rankBest() >= idx; };
  Growth.questAvailable = function (q) { return !q || !q.rank || Growth.rankReached(q.rank); };
  Growth.hiddenRoomOpen = function (mapId) { return root.RANK_UNLOCKS.some(function (u) { return u.hiddenRoom && u.hiddenRoom.map === mapId && Growth.rankReached(u.index); }); };
  Growth.rankIndexOfLetter = function (letter) { for (var i = 0; i < root.RANK_UNLOCKS.length; i++) if (root.RANK_UNLOCKS[i].letter === letter) return i; return 0; };

  // 試練の採点直後に呼ぶ（trade.js）。クエスト用カウンター・苦手な判断・復習履歴を記録
  Growth.afterTrial = function (ev, opts) {
    var d = D(), t = T(); var C = d.counters; var hinted = ev.hintLevel > 0;
    function inc(k) { C[k] = (C[k] || 0) + 1; }
    if (ev.actionOk && !hinted) inc('trial_nohint_ok');
    if (ev.correct === 'skip' && ev.actionOk) inc('trial_skip_ok');
    if (ev.analysisOk === ev.analysisTotal) inc('trial_analysis_full');
    if (ev.topics && ev.topics.mtf && ev.topics.mtf.ok) inc('trial_mtf_ok');
    C.trial_unique = Object.keys(d.trade.stats.uniqueCorrect || {}).length;
    // 苦手な判断：ルール違反と、分析で間違えた項目を種類ごとに数える
    (ev.violations || []).forEach(function (v) { t.mistakes[v] = (t.mistakes[v] || 0) + 1; });
    (ev.items || []).forEach(function (it) { if (!it.ok && it.topic && it.topic !== 'action' && it.topic !== 'reason') { var k = it.name + 'の見誤り'; t.mistakes[k] = (t.mistakes[k] || 0) + 1; } });
    // 復習履歴（苦手分野の復習から出題されたときだけ）
    if (opts && opts.review) { t.reviewLog.push({ topic: opts.review, score: ev.score, ok: !!ev.actionOk, at: Date.now() }); if (t.reviewLog.length > 30) t.reviewLog.shift(); var tp = d.trade.topics && d.trade.topics[opts.review]; if (tp) tp.reviews = (tp.reviews || 0) + 1; }
    // 「苦手」だった分野を記録（あとで「理解」になれば実績「苦手克服」）
    root.TradeEval.topicSummary(d.trade).forEach(function (s) { if (s.level === '苦手') t.wasWeak[s.key] = true; });
  };
  Growth.topMistakes = function (n) { var m = T().mistakes; return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, n || 3); };

  // ランク到達・実績の判定（試練・学習イベント・講義のあとに呼ぶ）。戻り値：解放した内容の配列
  Growth.check = async function (announce) {
    var d = D(), t = T(); var Win = root.Win, State = root.State, ITEMS = root.ITEMS; var out = [];
    var r = root.TradeEval.rank(d.trade);
    while (t.rankBest < r.index) {
      t.rankBest++; var u = Growth.unlockFor(t.rankBest); var lines = ['トレーダーランクが ' + u.letter + ' に上がった！ 称号「' + u.title + '」を得た。'];
      if (u.reward) { if (u.reward.gold) { d.gold += u.reward.gold; lines.push(u.reward.gold + 'G を受け取った'); } if (u.reward.item && ITEMS[u.reward.item]) { State.addItem(u.reward.item, u.reward.qty || 1); lines.push(ITEMS[u.reward.item].name + (u.reward.qty > 1 ? '×' + u.reward.qty : '') + ' を受け取った'); } }
      if (u.ability && !(d.trade.abilities && d.trade.abilities[u.ability])) { d.trade.abilities = d.trade.abilities || {}; d.trade.abilities[u.ability] = true; if (root.Learning) root.Learning.applyAbilities(); var ab = root.LEARN_ABILITIES[u.ability]; lines.push('能力「' + ab.name + '」を習得！ ' + ab.desc); }
      (u.unlocks || []).forEach(function (s) { if (s.indexOf('能力') !== 0 && s.indexOf('称号') !== 0) lines.push('解放：' + s); });
      if (u.quest && root.QUESTS[u.quest]) lines.push('師匠ハケイから特別クエストを受けられる（修行場／メニューの「トレード修行」）');
      out.push({ type: 'rank', unlock: u });
      if (announce !== false) { if (root.Audio) root.Audio.playJingle('levelup'); await Win.message(lines, { name: '師匠ハケイ' }); }
    }
    var ctx = { d: d, stats: d.trade.stats, topics: root.TradeEval.topicSummary(d.trade), counters: d.counters, Learning: root.Learning, uniq: Object.keys(d.trade.stats.uniqueCorrect || {}).length };
    for (var i = 0; i < root.LEARN_ACHIEVEMENTS.length; i++) {
      var a = root.LEARN_ACHIEVEMENTS[i]; if (t.achievements[a.id]) continue; var okA = false; try { okA = !!a.check(ctx); } catch (e) { okA = false; }
      if (!okA) continue;
      t.achievements[a.id] = Date.now(); var ls = ['学習実績「' + a.name + '」を達成！ ' + a.desc];
      var rw = a.reward || {};
      if (rw.gold) { d.gold += rw.gold; ls.push(rw.gold + 'G を得た'); }
      if (rw.exp) { State.partyActors().forEach(function (x) { root.Actors.gainExp(x, rw.exp); }); ls.push('経験値 ' + rw.exp + ' を得た'); }
      if (rw.item && ITEMS[rw.item]) { State.addItem(rw.item, rw.qty || 1); ls.push(ITEMS[rw.item].name + (rw.qty > 1 ? '×' + rw.qty : '') + ' を得た'); }
      out.push({ type: 'achievement', ach: a });
      if (announce !== false) { if (root.Audio) root.Audio.sfx('chest'); await Win.message(ls); }
    }
    if (root.Events && root.Events.checkCounterQuests) await root.Events.checkCounterQuests();   // 師匠の特別クエスト・学習クエストの達成判定（どの入口から試練を受けても進む）
    if (out.length) { if (root.World && root.World.updateHud) root.World.updateHud(); State.autosave(); }
    return out;
  };
  Growth.achievementList = function () { var t = T(); return root.LEARN_ACHIEVEMENTS.map(function (a) { return { def: a, done: !!t.achievements[a.id], at: t.achievements[a.id] || 0 }; }); };

  root.Growth = Growth;
})(typeof window !== 'undefined' ? window : globalThis);
