/* =========================================================
   RPG / Learning : 学習イベント（必修・任意）の進行、特殊能力の解放、学習進捗
   ・初回は説明つき、復習は短時間。失敗しても ヒント・復習・再挑戦 で必ず進める（2回失敗で合格点50、4回で40）
   ・報酬・能力は1回だけ（二重加算なし）
   ========================================================= */
(function (root) {
  'use strict';
  var Learning = {};
  function D() { return root.State.data; }
  function ev(id) { return root.learnEvent(id); }

  Learning.isDone = function (id) { var e = ev(id); if (!e) return false; if (e.tutorial) return !!D().trade.tutorialDone; return !!D().flags[id]; };
  Learning.status = function (id) { var e = ev(id); if (!e) return 'unknown'; if (Learning.isDone(id)) return 'done'; if (!e.mapId) return 'locked'; return 'open'; };
  Learning.fails = function (id) { var t = D().trade; t.learnFails = t.learnFails || {}; return t.learnFails[id] || 0; };
  Learning.passScore = function (e) { var f = Learning.fails(e.id); var base = e.minScore || 60; return f >= 4 ? Math.min(base, 40) : f >= 2 ? Math.min(base, 50) : base; };

  // 学習イベントを実行（石碑・扉・ボス前から呼ばれる）。戻り値: { passed, score }
  Learning.run = async function (id, opts) {
    opts = opts || {}; var Win = root.Win, State = root.State; var d = D(); var e = ev(id); if (!e) return { passed: false };
    if (e.tutorial) { var okT = await root.Services.tutorial(); return { passed: !!okT, score: okT ? 100 : 0 }; }
    var done = Learning.isDone(id); var first = !done && !(d.trade.learnSeen && d.trade.learnSeen[id]);
    d.trade.learnSeen = d.trade.learnSeen || {}; d.trade.learnSeen[id] = true;
    var pass = Learning.passScore(e);
    if (e.required) {
      if (first) { await Win.message([(e.region ? '【' + e.region + '】' : '') + e.title + '。' + (e.summary || ''), 'まず教えを読み、そのあとチャートで判断する。合格は' + pass + '点以上。失敗しても復習と再挑戦ができる。'], { name: '師匠ハケイ' }); await Learning.showLesson(e); }
      else { var c = await Win.choice(done ? '「' + e.title + '」を復習する？' : '「' + e.title + '」に再挑戦する？（合格 ' + pass + '点以上）', ['挑戦する', '教えを読み返す', 'やめる']); if (c < 0 || c === 2) return { passed: done, score: 0 }; if (c === 1) { await Learning.showLesson(e); var c2 = await Win.choice('挑戦する？', ['挑戦する', 'やめる']); if (c2 !== 0) return { passed: done, score: 0 }; } }
    } else {
      if (first) await Win.message(['【' + e.title + '】石碑に波形が刻まれている。触れると、相場の場面が浮かび上がった。', '（任意の練習。初回のみ報酬。何度でも挑戦できる）']);
      else { var c3 = await Win.choice('石碑の練習に挑む？', ['挑む', 'やめる']); if (c3 !== 0) return { passed: done, score: 0 }; }
    }
    var res = await root.TradeUI.trial(e.scenarios, { title: e.title, minScore: pass, practice: !e.required });
    var score = res ? res.score : 0; var passed = e.required ? score >= pass : score >= 60;
    if (!passed) {
      d.trade.learnFails = d.trade.learnFails || {}; d.trade.learnFails[id] = (d.trade.learnFails[id] || 0) + 1;
      if (e.required) await Win.message(['評価 ' + score + '点。合格の' + pass + '点に届かなかった。', Learning.fails(id) >= 2 ? '次は合格点を' + Learning.passScore(e) + '点に下げる。教えを読み返し、ヒントを使ってもいい。' : '焦らなくていい。「教えを読み返す」か、ヒントを使って再挑戦しよう。', '確認不足の項目は結果画面に出ている。そこを重点的に見直そう。'], { name: '師匠ハケイ' });
      else await Win.message(['評価 ' + score + '点。石碑はまた光を失った。何度でも挑戦できる。']);
      return { passed: false, score: score };
    }
    if (!done) {
      if (e.required) d.flags[id] = true; else d.flags[id] = true;
      var r = e.reward || {}; var lines = [e.required ? '「' + e.title + '」を達成した！（' + score + '点）' : '石碑が輝いた！（' + score + '点）'];
      if (r.exp) { State.partyActors().forEach(function (a) { root.Actors.gainExp(a, r.exp); }); lines.push('経験値 ' + r.exp + ' を得た'); }
      if (r.gold) { d.gold += r.gold; lines.push(r.gold + 'G を得た'); }
      if (r.item) { State.addItem(r.item, 1); lines.push(root.ITEMS[r.item].name + ' を手に入れた'); }
      await Win.message(lines);
      var ab = await Learning.checkUnlocks(true);
      if (e.required && e.next) { var n = ev(e.next); if (n) await Win.message([n.mapId ? '次のおすすめ：第' + n.chapter + '章「' + n.title + '」（' + n.region + '）。' + n.summary : '次の章「' + n.title + '」（' + n.region + '）は、まだ解放されていない地域だ。今は練習とボスで腕を磨こう。'], { name: '師匠ハケイ' }); }
    } else await Win.message([e.required ? '復習の評価 ' + score + '点。' + (score >= 80 ? '見事だ。' : '基本に立ち返って、もう一度。') : '練習の評価 ' + score + '点。']);
    root.World.updateHud(); State.autosave();
    return { passed: true, score: score };
  };
  Learning.showLesson = async function (e) {
    var Win = root.Win; var lines = e.lesson || [];
    for (var i = 0; i < lines.length; i++) await Win.panel('<div class="rw-title">' + Win.esc(e.title) + '　' + (i + 1) + '/' + lines.length + '</div><div class="lesson">' + Win.esc(lines[i]) + '</div><p class="muted small">※学習用の人工チャートで練習します。実際の相場での結果を保証するものではありません。</p>', { closeLabel: i < lines.length - 1 ? '次へ' : '試練へ' });
  };

  // 特殊能力の解放：必修イベント達成 ＋ 分野の理解度（3回以上挑戦し、直近の正解率60%以上）
  Learning.understood = function (topic) { var ts = root.TradeEval.topicSummary(D().trade).filter(function (t) { return t.key === topic; })[0]; return !!(ts && ts.plays >= 3 && ts.recentAcc >= 0.6); };
  Learning.checkUnlocks = async function (announce) {
    var d = D(); var AB = root.LEARN_ABILITIES; d.trade.abilities = d.trade.abilities || {}; var newly = [];
    Object.keys(AB).forEach(function (k) { var a = AB[k]; if (d.trade.abilities[k]) return; if (!Learning.isDone(a.event)) return; if (!Learning.understood(a.topic)) return; d.trade.abilities[k] = true; newly.push(a); });
    if (newly.length) { Learning.applyAbilities(); if (announce !== false) for (var i = 0; i < newly.length; i++) { if (root.Audio) root.Audio.playJingle('levelup'); await root.Win.message(['学習の理解が力になった！ 新しい能力「' + newly[i].name + '」を習得！', newly[i].desc + '（じゅもん・とくぎ から使える）']); } }
    return newly;
  };
  // 主人公の特技に反映（転職しても失わない）
  Learning.applyAbilities = function () { var d = D(); var hero = d.hero; var AB = root.LEARN_ABILITIES; Object.keys(d.trade.abilities || {}).forEach(function (k) { var s = AB[k] && AB[k].skill; if (s && root.SKILLS[s] && hero.skills.indexOf(s) < 0) hero.skills.push(s); }); };
  Learning.hasAbility = function (k) { return !!(D().trade.abilities && D().trade.abilities[k]); };
  // 章ごとの進捗
  Learning.progress = function () {
    return root.LEARN_EVENTS.filter(function (e) { return e.required; }).map(function (e) { var st = Learning.status(e.id); var practices = root.LEARN_EVENTS.filter(function (p) { return !p.required && p.chapter === e.chapter; }); return { event: e, status: st, practices: practices.map(function (p) { return { id: p.id, title: p.title, done: Learning.isDone(p.id) }; }), ability: e.ability ? root.LEARN_ABILITIES[e.ability] : null, abilityOn: e.ability ? Learning.hasAbility(e.ability) : false }; });
  };
  Learning.nextRecommended = function () { var p = Learning.progress(); for (var i = 0; i < p.length; i++) if (p[i].status === 'open') return p[i].event; return null; };

  root.Learning = Learning;
})(typeof window !== 'undefined' ? window : globalThis);
