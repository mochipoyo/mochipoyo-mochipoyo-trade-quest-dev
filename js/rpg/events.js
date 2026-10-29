/* =========================================================
   RPG / Events : NPC会話・マップイベント用のAPI（ctx）とイベント実行
   ========================================================= */
(function (root) {
  'use strict';

  var State = root.State, Win = root.Win, World = root.World, ITEMS = root.ITEMS, QUESTS = root.QUESTS, ENEMIES = root.ENEMIES;

  var Events = {};

  // クエストの開始・完了（報酬つき）
  Events.questStart = function (id) { var d = State.data; if (!QUESTS[id] || d.quests[id]) return; d.quests[id] = { state: 'active', at: Date.now() }; Win.toast('クエスト受注：' + QUESTS[id].title); };
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
    for (var id in QUESTS) { var q = QUESTS[id]; if (!q.counter) continue; var st = d.quests[id]; if (!st || st.state !== 'active') continue; if ((d.counters[q.counter] || 0) >= q.need) await Events.questComplete(id); }
  };

  Events.ctx = function () {
    var d = State.data;
    return {
      say: function (name, lines) { return Win.message(lines, { name: name }); },
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
        else {
          if (ev.intro) await Win.message(ev.intro);
          var result = await root.BattleUI.start([ev.enemy], { boss: true });
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
