/* =========================================================
   RPG / Events : NPC会話・マップイベント用のAPI（ctx）とイベント実行
   ========================================================= */
(function (root) {
  'use strict';

  var State = root.State, Win = root.Win, World = root.World, ITEMS = root.ITEMS, QUESTS = root.QUESTS, ENEMIES = root.ENEMIES;

  var Events = {};

  // クエストの開始・完了（報酬つき）
  Events.questStart = function (id) { var d = State.data; if (!QUESTS[id] || d.quests[id]) return; if (root.Growth && !root.Growth.questAvailable(QUESTS[id])) return; d.quests[id] = { state: 'active', at: Date.now() }; Win.toast('クエスト受注：' + QUESTS[id].title); };
  // クエストの条件（counter/need の単一条件、または needs = [[counter, need, label], ...] の複数条件）
  Events.questNeeds = function (q) { return q.needs ? q.needs : (q.counter ? [[q.counter, q.need, '']] : []); };
  Events.questProgress = function (id) { var d = State.data; var q = QUESTS[id]; if (!q) return ''; return Events.questNeeds(q).map(function (n) { return (n[2] ? n[2] + ' ' : '') + Math.min(n[1], d.counters[n[0]] || 0) + '/' + n[1]; }).join('　'); };
  Events.questSatisfied = function (id) { var d = State.data; var q = QUESTS[id]; var needs = Events.questNeeds(q); return needs.length > 0 && needs.every(function (n) { return (d.counters[n[0]] || 0) >= n[1]; }); };
  Events.questComplete = async function (id) {
    var d = State.data; var q = QUESTS[id]; if (!q) return; if (d.quests[id] && d.quests[id].state === 'done') return;
    d.quests[id] = { state: 'done', at: Date.now() };
    var lines = ['クエスト「' + q.title + '」を達成した！'];
    var r = q.reward || {};
    if (r.gold) { d.gold += r.gold; lines.push(r.gold + 'Gを受け取った'); }
    if (r.item) { State.addItem(r.item, 1); lines.push(ITEMS[r.item].name + 'を受け取った'); }
    if (r.exp) { var alive = State.partyActors(); var ups = []; alive.forEach(function (a) { var u = root.Actors.gainExp(a, Math.round(r.exp / alive.length)); if (u.length) ups.push(a.name + 'はレベル' + a.level + 'になった！'); }); lines.push('経験値' + r.exp + 'を得た'); lines = lines.concat(ups); }
    await Win.message(lines);
  };
  // カウンター型クエストの進行チェック
  Events.checkCounterQuests = async function () {
    var d = State.data;
    for (var id in QUESTS) { var q = QUESTS[id]; if (!q.counter && !q.needs) continue; var st = d.quests[id]; if (!st || st.state !== 'active') continue; if (Events.questSatisfied(id)) await Events.questComplete(id); }
  };

  // 会話の立ち絵：NPCのスプライトID → 仲間の名前 → 名前からの推定（確実でないものは出さない）
  Events.portraitFor = function (name, npc) {
    var A = root.Assets; if (!A) return null;
    if (npc && npc.sprite && A.portraitUrl(npc.sprite) && (!name || npc.name === name || !Events._isPartyName(name))) return A.portraitUrl(npc.sprite);
    var cid = Events._companionIdByName(name); if (cid) return A.portraitUrl(cid);
    if (name && root.State.data && root.State.data.hero && name === root.State.data.hero.name) return A.portraitUrlFor(root.State.data.hero);
    var g = A.guessSprite(name); return g ? A.portraitUrl(g) : null;
  };
  Events._companionIdByName = function (name) { var C = root.COMPANIONS || {}; var ids = Object.keys(C); for (var i = 0; i < ids.length; i++) if (C[ids[i]].name === name) return ids[i]; return null; };
  Events._isPartyName = function (name) { return !!Events._companionIdByName(name) || (root.State.data && root.State.data.hero && root.State.data.hero.name === name); };
  Events.ctx = function (npc) {
    var d = State.data;
    return {
      say: function (name, lines) { return Win.message(lines, { name: name, portrait: Events.portraitFor(name, npc) }); },
      msg: function (lines) { return Win.message(lines); },
      choice: function (prompt, options) { return Win.choice(prompt, options); },
      flag: function (k) { return !!d.flags[k]; }, setFlag: function (k, v) { d.flags[k] = v === undefined ? true : v; },
      has: function (id) { return State.hasItem(id); }, give: function (id, q) { State.addItem(id, q || 1); }, take: function (id, q) { State.addItem(id, -(q || 1)); },
      get gold() { return d.gold; }, addGold: function (g) { d.gold += g; },
      hasCompanion: function (id) { return !!d.companions[id]; }, join: function (id) { State.joinCompanion(id); World.applyState(World.map); },
      questStart: Events.questStart, questComplete: Events.questComplete, questActive: function (id) { return d.quests[id] && d.quests[id].state === 'active'; }, questDone: function (id) { return d.quests[id] && d.quests[id].state === 'done'; },
      shop: function (kind, stock) { return root.Services.shop(kind, stock); },
      inn: function (price) { return root.Services.inn(price); },
      church: function () { return root.Services.church(); },
      tavern: function () { return root.Services.tavern(); },
      guild: function () { return root.Services.guild(); },
      bank: function () { return root.Services.bank(); },
      dojo: function (where) { return root.Services.dojo(where); },
      trial: function (scenarios, opts) { return root.TradeUI.trial(scenarios, opts); },
      battle: function (ids, opts) { return root.BattleUI.start(ids, opts); },
      warp: function (map, x, y) { World.enterMap(map, x, y, 'down'); },
      heal: function () { State.partyActors().forEach(root.Actors.fullHeal); World.updateHud(); },
      party: function () { return State.partyActors(); }
    };
  };

  // マップイベントの実行
  Events.run = async function (ev) {
    var d = State.data; World.busy = true;
    try {
      if (ev.type === 'inspect') { await Win.message(ev.text); }
      else if (ev.type === 'board') { await root.Services.questBoard(); }
      else if (ev.type === 'locked') {
        if (d.flags[ev.doneFlag]) { /* 開いている */ }
        else if (State.hasItem(ev.key)) { await Win.message([ITEMS[ev.key].name + 'を使った。扉が開いた！']); d.flags[ev.doneFlag] = true; World.applyState(World.map); if (root.Audio) root.Audio.sfx('door'); }
        else await Win.message(ev.text);
      }
      else if (ev.type === 'rank_door') {   // v4.2: トレーダーランクで開く隠し部屋の扉（最高到達ランクで判定。下がっても閉じない）
        if (d.flags[ev.doneFlag]) { /* 開いている */ }
        else if (root.Growth && root.Growth.rankReached(ev.rank)) { d.flags[ev.doneFlag] = true; World.applyState(World.map); if (root.Audio) root.Audio.sfx('door'); await Win.message(['扉に刻まれた波形の紋章が、あなたの称号「' + root.Growth.title() + '」に応えて光った。', '扉が開いた！']); }
        else await Win.message((ev.text || ['波形の紋章が刻まれた扉だ。']).concat(['トレーダーランク ' + root.RANK_UNLOCKS[ev.rank].letter + '（' + root.RANK_UNLOCKS[ev.rank].title + '）以上の者に開く。今のランク：' + root.TradeEval.rank(d.trade).letter + '（最高到達 ' + root.RANK_UNLOCKS[root.Growth ? root.Growth.rankBest() : 0].letter + '）', 'ランクは判断の質で上がる。メニューの「トレード修行」で条件を確認できる。']));
      }
      else if (ev.type === 'learn') { await root.Learning.run(ev.learnId); World.applyState(World.map); }
      else if (ev.type === 'trial' && ev.learnId) {   // 必修の学習イベント（扉）：教え→試練。合格で扉が開く。達成後は復習できる
        if (d.flags[ev.doneFlag]) { var rr = await Win.choice('扉は開いている。', ['通る', '「' + root.learnEvent(ev.learnId).title + '」を復習する']); if (rr === 1) await root.Learning.run(ev.learnId); }
        else { await Win.message(ev.text); var lr = await root.Learning.run(ev.learnId); if (lr.passed) { d.flags[ev.doneFlag] = true; World.applyState(World.map); if (root.Audio) root.Audio.sfx('door'); await Win.message(['扉がゆっくりと開いた！']); } }
      }
      else if (ev.type === 'trial') {
        if (d.flags[ev.doneFlag]) { await Win.message(['扉は開いている。']); }
        else {
          await Win.message(ev.text);
          var a = await Win.choice('試練に挑みますか？', ['挑む', 'やめておく']);
          if (a === 0) {
            var res = await root.TradeUI.trial(ev.scenarios, { title: 'チャートの試練', minScore: ev.minScore || 60 });
            if (res && res.score >= (ev.minScore || 60)) { d.flags[ev.doneFlag] = true; World.applyState(World.map); if (root.Audio) root.Audio.sfx('door'); await Win.message(['扉がゆっくりと開いた！（評価 ' + res.score + '点）']); }
            else await Win.message(['扉は開かない……（評価 ' + (res ? res.score : 0) + '点。' + (ev.minScore || 60) + '点以上で開く）', 'ヒント：上位足を確認し、根拠が揃わない場面は見送ること。']);
          }
        }
      }
      else if (ev.type === 'boss') {
        if (d.flags[ev.doneFlag]) { await Win.message(['静かだ。魔物の気配はもうない。']); }
        else if (ev.requireFlag && !d.flags[ev.requireFlag]) { await Win.message(ev.lockedText || ['何かの気配がするが、今はまだ姿を見せない。']); }
        else {
          if (ev.intro) await Win.message(ev.intro);
          if (ev.optional) { var go = await Win.choice('強敵の気配がする。戦いますか？', ['戦う', 'やめておく']); if (go !== 0) { World.busy = false; World.updateHud(); return; } }
          var bopts = { boss: true };
          if (root.Learning && root.Learning.hasAbility('dow_eye')) { bopts.exposeFirst = 3; await Win.message(['ダウの眼が魔物の波形を見抜いた！ 最初の3ターン、敵の防御が崩れる。']); }   // 学習能力とボス戦の連動
          var result = await root.BattleUI.start(ev.enemies || [ev.enemy], bopts);
          if (result === 'won') {
            d.flags[ev.doneFlag] = true;
            if (ev.after) await Win.message(ev.after);
            if (ev.reward) { State.addItem(ev.reward.item, ev.reward.qty || 1); await Win.message([ITEMS[ev.reward.item].name + 'を手に入れた！']); }
            if (ev.questComplete) await Events.questComplete(ev.questComplete);
            World.applyState(World.map); State.autosave();
          } else if (result === 'lost') { World.busy = false; await World.gameOver(); return; }
        }
      }
    } catch (e) { root.Engine.onError(e); }
    World.busy = false; World.updateHud(); State.autosave();
  };

  root.Events = Events;
})(typeof window !== 'undefined' ? window : globalThis);
