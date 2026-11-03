/* =========================================================
   SeaTreasure（v7.0）：海の底に落ちている拾い物（船で通りかかったときに拾える）
   ・帆船・遠洋航海船に乗っているとき、拾い物のマスか、その上下左右・斜めのマスを通ると自動で引き上げる（飛空艇では拾えない）
   ・拾ったかどうかは State.data.flags['sea_' + id]（旧セーブはフラグがないだけ＝まだ拾っていない）
   ・場所：船で行ける各地方の海（外周につながる最大の海）の、陸から3〜9マス離れた沖。docs/tools/v70/seaspots.js で選び、seareach.js で船が届くことを確かめた
   ・カリオン・ゼロメア・暗黒大陸の海には船の海路がない（飛空艇だけ）ので置かない
   ・2D 版：水面のきらめき（ゆっくり点滅）。3D 版：水の下の光と泡（three-src/src/world/MapScene3D.js の updateSeaTreasure）
   ========================================================= */
(function (root) {
  'use strict';
  var SeaTreasure = {};
  // [id, 地方, x, y, 見つけた物の様子, 中身]
  var L = [
    ['w1', 'world', 63, 7, '貝殻のついた小瓶', { item: 'potion', qty: 3 }],
    ['w2', 'world', 99, 11, '沈んだ漁船の木箱', { item: 'ether', qty: 2 }],
    ['w3', 'world', 135, 15, '海藻にからまった革袋', { gold: 300 }],
    ['w4', 'world', 75, 44, '沈んだ木箱', { item: 'hi_potion', qty: 1 }],
    ['g1', 'world_grania', 54, 6, '鉱石運びの船の積み荷', { item: 'hi_potion', qty: 2 }],
    ['g2', 'world_grania', 117, 13, '沈んだ木箱', { item: 'ether', qty: 3 }],
    ['g3', 'world_grania', 129, 50, '錆びた小さな金庫', { gold: 800 }],
    ['g7', 'world_grania', 123, 85, '鉱石運びの船の木箱', { item: 'hi_potion', qty: 3 }],
    ['i1', 'world_islands', 147, 52, '嵐で沈んだ交易船の宝箱', { item: 'elixir', qty: 1 }],
    ['i2', 'world_islands', 102, 47, '灯台の補給船の木箱', { item: 'hi_ether', qty: 2 }],
    ['i3', 'world_islands', 39, 40, '海藻にからまった革袋', { gold: 2000 }],
    ['i4', 'world_islands', 96, 82, '貝殻のついた薬瓶', { item: 'phoenix_feather', qty: 1 }],
    ['t1', 'world_tempus', 117, 13, '止まった懐中時計の入った箱', { item: 'phoenix_feather', qty: 1 }],
    ['t2', 'world_tempus', 90, 10, '沈んだ木箱', { item: 'hi_ether', qty: 2 }],
    ['t3', 'world_tempus', 21, 38, '古い硬貨の袋', { gold: 2500 }],
    ['t4', 'world_tempus', 150, 88, '止まった砂時計の入った箱', { item: 'mystic_water', qty: 1 }],
    ['g4', 'world_magicka', 90, 10, '魔導船の積み荷', { item: 'spirit_drop', qty: 1 }],
    ['g5', 'world_magicka', 147, 52, '封のされた薬箱', { item: 'phoenix_feather', qty: 2 }],
    ['g6', 'world_magicka', 21, 38, '学院の印のある袋', { gold: 3500 }],
    ['g8', 'world_magicka', 141, 87, '魔導船の木箱', { item: 'elixir', qty: 1 }],
    ['s1', 'world_desert', 126, 14, '砂漠の隊商が落とした水筒', { item: 'spirit_drop', qty: 1 }],
    ['s2', 'world_desert', 99, 11, '海藻にからまった革袋', { gold: 2000 }],
    ['s3', 'world_desert', 8, 16, '貝殻のついた小瓶', { item: 'hi_ether', qty: 2 }],
    ['r1', 'world_dragon', 99, 11, '竜の鱗の刺さった木箱', { item: 'elixir', qty: 1 }],
    ['r2', 'world_dragon', 147, 52, '焦げた宝箱', { item: 'phoenix_feather', qty: 1 }],
    ['r3', 'world_dragon', 84, 45, '沈んだ硬貨の袋', { gold: 3000 }],
    ['n1', 'world_snow', 9, 108, '氷に閉じこめられた小箱', { item: 'hot_milk', qty: 3 }],
    ['n2', 'world_snow', 37, 107, '沈んだ漁船の木箱', { item: 'spirit_drop', qty: 1 }],
    ['n3', 'world_snow', 65, 106, '凍った革袋', { gold: 2000 }]
  ];
  SeaTreasure.LIST = L.map(function (a) { return { id: a[0], map: a[1], x: a[2], y: a[3], what: a[4], loot: a[5] }; });
  function D() { return root.State && root.State.data; }
  SeaTreasure.flag = function (t) { return 'sea_' + t.id; };
  SeaTreasure.taken = function (t, d) { d = d || D(); return !!(d && d.flags && d.flags[SeaTreasure.flag(t)]); };
  SeaTreasure.on = function (mapId, d) { return SeaTreasure.LIST.filter(function (t) { return t.map === mapId && !SeaTreasure.taken(t, d); }); };
  // 船（帆船・遠洋航海船）に乗っているか。飛空艇は拾えない
  SeaTreasure.byShip = function (d) { d = d || D(); if (!d || !d.aboard) return false; var V = root.Vehicle; return !(V && V.flies && V.flies(d.aboard)); };
  SeaTreasure.lootText = function (t) { var lo = t.loot; if (lo.gold) return lo.gold + 'G'; var it = root.ITEMS && root.ITEMS[lo.item]; return (it ? it.name : lo.item) + (lo.qty > 1 ? '×' + lo.qty : ''); };
  SeaTreasure.give = function (t) {
    var d = D(); if (!d || SeaTreasure.taken(t, d)) return false; var lo = t.loot;
    if (lo.gold) d.gold = (d.gold || 0) + lo.gold; else if (root.State.addItem) root.State.addItem(lo.item, lo.qty || 1);
    d.flags[SeaTreasure.flag(t)] = true; return true;
  };
  // 1歩ごと（World.onStep の乗船中の処理から）：船で拾い物の近く（となりのマスまで）を通ったら引き上げる。引き上げたら true
  SeaTreasure.afterStep = function (m, p) {
    var d = D(); if (!m || !p || !SeaTreasure.byShip(d)) return false;
    var hit = null; SeaTreasure.on(m.id, d).some(function (t) { if (Math.abs(t.x - p.x) <= 1 && Math.abs(t.y - p.y) <= 1) { hit = t; return true; } return false; });
    if (!hit) return false;
    SeaTreasure.give(hit);
    var W = root.World; if (W) W.busy = true;
    var done = function () { if (W) { W.busy = false; if (W.updateHud) W.updateHud(); } };
    if (root.Audio && root.Audio.sfx) { try { root.Audio.sfx('chest'); } catch (e) { /* 音が鳴らなくても続ける */ } }
    var pr = root.Win && root.Win.message ? root.Win.message(['海の底で、何かが光っている……。', hit.what + 'を引き上げた！', SeaTreasure.lootText(hit) + 'を手に入れた！']) : null;
    if (pr && pr.then) pr.then(done, done); else done();
    return true;
  };
  SeaTreasure.count = function (d) { var n = 0; SeaTreasure.LIST.forEach(function (t) { if (SeaTreasure.taken(t, d)) n++; }); return { taken: n, total: SeaTreasure.LIST.length }; };

  /* ---------- 2D 版：水面のきらめき（画面の中にあるものだけ） ---------- */
  SeaTreasure.draw2D = function (ctx, m, cam, TS) {
    if (!ctx || !m) return; var list = SeaTreasure.on(m.id); if (!list.length) return; var now = Date.now(); var Wc = ctx.canvas.width, Hc = ctx.canvas.height;
    list.forEach(function (t, i) {
      var sx = (t.x + 0.5) * TS - cam.x, sy = (t.y + 0.5) * TS - cam.y; if (sx < -TS || sy < -TS || sx > Wc + TS || sy > Hc + TS) return;
      var k = 0.5 + 0.5 * Math.sin(now / 300 + i * 1.7); ctx.save();
      ctx.globalAlpha = 0.25 + 0.3 * k; ctx.fillStyle = '#bff4ff'; ctx.beginPath(); ctx.ellipse(sx, sy, TS * 0.36, TS * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.55 + 0.45 * k; ctx.fillStyle = '#ffffff'; var r = TS * (0.08 + 0.1 * k);
      ctx.beginPath(); ctx.moveTo(sx, sy - r * 2); ctx.lineTo(sx + r * 0.5, sy - r * 0.5); ctx.lineTo(sx + r * 2, sy); ctx.lineTo(sx + r * 0.5, sy + r * 0.5); ctx.lineTo(sx, sy + r * 2); ctx.lineTo(sx - r * 0.5, sy + r * 0.5); ctx.lineTo(sx - r * 2, sy); ctx.lineTo(sx - r * 0.5, sy - r * 0.5); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
  };

  root.SeaTreasure = SeaTreasure;
})(typeof window !== 'undefined' ? window : globalThis);
