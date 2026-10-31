/* =========================================================
   RPG / Ooparts (v6.1) : オーパーツ収集のゲームロジック（画面は js/ui/ooparts.js）
   ・一覧は root.OOPARTS（js/data/ooparts.js）。取得状態は State.data.ooparts = { found: { id: {n, map, at} }, rewards: { 10: true, ... } }
   ・Ooparts.collect(id) は、まだ持っていない遺物だけを記録する（同じ遺物は二度と取れない）
   ・「取得できる数（total）」は、実際に配置・入手手段がある遺物だけを数える（未配置のものは取得可能として扱わない）
   ・古代遺物収集家（リヴェル城下町の冒険者ギルド）への報告で、10/25/50/75/100個の報酬を各1回だけ受け取れる
   ========================================================= */
(function (root) {
  'use strict';
  var Ooparts = {};
  // 収集の報酬（装備）。どれも通常の装備として使える
  function eq(id, o) { root.ITEMS[id] = Object.assign({ id: id, price: 0 }, o); if (root.ITEM_LIST && root.ITEM_LIST.indexOf(id) < 0) root.ITEM_LIST.push(id); }
  eq('explorer_ring', { name: '探索者の指輪', cat: 'armor', type: 'acc', def: 2, agi: 4, fx: { sight: 2 }, desc: '素早さ+4。ダンジョンのミニマップで見える範囲+2。10個の遺物を見つけた探索者の証' });
  eq('ancient_shield', { name: '古代文明の盾', cat: 'armor', type: 'shield', def: 24, mdef: 10, desc: '魔法防御+10。波の文字が刻まれた盾。古代の者たちの「釣り合い」の思想が込められている' });
  eq('starseer_staff', { name: '星読みの杖', cat: 'weapon', type: 'staff', atk: 16, mag: 26, mp: 30, fx: { supportBoost: 1.5 }, desc: '魔力+26・最大MP+30。補助魔法を使った次のターン、攻撃魔法が1.5倍。星を読んだ古代の者たちの杖' });
  eq('spacetime_armor', { name: '時空の鎧', cat: 'armor', type: 'heavy', def: 42, agi: 3, fx: { lowHpDef: { below: 0.5, mult: 0.3 } }, desc: '素早さ+3。HPが50%以下のとき防御力+30%。時の回廊の敷石と同じ金属でできた鎧' });
  eq('archeion_blade', { name: '伝説剣アルケイオン', cat: 'weapon', type: 'sword', atk: 62, element: 'light', fx: { critUp: 0.08 }, desc: '失われた文明の伝説武器。光属性・会心の一撃の確率+8%。100の遺物が示した「測りすぎるな」という警告を刃に刻む' });
  Ooparts.REWARDS = [{ n: 10, item: 'explorer_ring' }, { n: 25, item: 'ancient_shield' }, { n: 50, item: 'starseer_staff' }, { n: 75, item: 'spacetime_armor' }, { n: 100, item: 'archeion_blade' }];

  function S() { var d = root.State.data; if (!d.ooparts) d.ooparts = { found: {}, rewards: {} }; d.ooparts.found = d.ooparts.found || {}; d.ooparts.rewards = d.ooparts.rewards || {}; return d.ooparts; }
  Ooparts.state = S;
  Ooparts.list = function () { return (root.OOPARTS || []).slice().sort(function (a, b) { return a.no - b.no; }); };
  var byId = null; Ooparts.get = function (id) { if (!byId) { byId = {}; (root.OOPARTS || []).forEach(function (e) { byId[e.id] = e; }); } return byId[id] || null; };
  // 実際に入手手段があるか（配置済みの探索ポイント・存在するクエスト・イベント）
  Ooparts.placed = function (e) {
    if (!e) return false;
    if (e.source === 'search') { var p = root.Search && root.Search.points[e.point]; return !!(p && root.MAP_DEFS[p.map]); }
    if (e.source === 'quest') return !!(root.QUESTS && root.QUESTS[e.quest]);
    return e.source === 'event';
  };
  Ooparts.total = function () { return Ooparts.list().filter(Ooparts.placed).length; };
  Ooparts.has = function (id) { return !!S().found[id]; };
  Ooparts.count = function () { var f = S().found; return Ooparts.list().filter(function (e) { return f[e.id]; }).length; };
  Ooparts.nextReward = function () { var r = S().rewards; for (var i = 0; i < Ooparts.REWARDS.length; i++) { var R = Ooparts.REWARDS[i]; if (!r[R.n] && R.n <= Ooparts.total()) return R; } return null; };
  Ooparts.claimable = function () { var c = Ooparts.count(), r = S().rewards; return Ooparts.REWARDS.filter(function (R) { return c >= R.n && !r[R.n]; }); };
  // 報酬を1段階受け取る（二重には受け取れない）
  Ooparts.claim = function (n) { var s = S(); var R = Ooparts.REWARDS.filter(function (x) { return x.n === n; })[0]; if (!R || s.rewards[n] || Ooparts.count() < n) return false; s.rewards[n] = true; root.State.addItem(R.item, 1); return R; };
  // 遺物を手に入れる。lines は先に出すメッセージ。持っていなければ記録してメッセージを出し true
  Ooparts.collect = async function (id, lines) {
    var e = Ooparts.get(id); if (!e) return false; var s = S(); if (s.found[id]) return false;
    var W = root.World; s.found[id] = { n: Ooparts.count() + 1, map: W && W.map ? W.map.id : null, at: Date.now() };
    root.State.count('ooparts_found');
    var c = Ooparts.count(), t = Ooparts.total(); var out = (lines || []).slice();
    out.push('オーパーツ「' + e.name + '」を見つけた！（' + c + '/' + t + '）', e.desc);
    var nx = Ooparts.claimable(); if (nx.length) out.push('リヴェル城下町の冒険者ギルドにいる古代遺物収集家に見せると、報酬がもらえそうだ。');
    if (root.Audio) root.Audio.sfx('chest'); if (W && W.updateHud) W.updateHud();
    await root.Win.message(out); root.State.autosave();
    return true;
  };
  root.Ooparts = Ooparts;
})(typeof window !== 'undefined' ? window : globalThis);
