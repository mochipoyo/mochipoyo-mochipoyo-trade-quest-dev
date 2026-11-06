/* =========================================================
   Data / v8.1 灰灯島アルナ・生存者の村（aruna_village）：古い桟橋と灯籠の広場から始まった村。東は海に突き出た桟橋通り
   ・住む理由：流れ着いた人たちが、西の古い桟橋のまわりに暮らしはじめた。灯台の灯りが船を呼ぶ
   ・入口から最初に見える物：南の門から北へ一本道。灯籠の広場の先に、宿と島の道具店
   ・道：村の道（門 → 南の通り → 灯籠の広場 → 北の通り）。広場から西の小道は古い桟橋へ。南の通りは東へ続いて「桟橋通り」（網元の家・船乗りの酒場・小さな灯台と二本の桟橋）
   ・境界：西と南東は海、ほかは林（自然の境界）。出入りは南の門
   ・人・出来事・宝箱・調べる所はそのまま（位置だけ）。古い桟橋の出来事は桟橋のまま
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 56, H = 26, GX = 16, PX = 17, PY = 11;
  function rows(canvas) {
    var C = canvas(W, H, '.');
    C.frame(0, 0, W, H, 'f'); C.rect(GX, H - 1, 2, 1, 'r');
    C.rect(1, 1, 2, H - 2, '~'); C.rect(3, 9, 1, 6, 'd');   // 西の海と古い桟橋
    C.rect(32, 22, W - 33, 3, '~'); C.rect(31, 21, W - 32, 1, 'P'); C.rect(38, 21, 2, 4, 'd'); C.rect(48, 21, 2, 4, 'd');   // 南東の海・岸・二本の桟橋
    C.rect(4, 7, 27, 2, 'r'); C.rect(4, 19, W - 5, 2, 'r');   // 北の通り・南の通り（東は桟橋通り）
    C.rect(GX, 7, 2, H - 8, 'r');   // 村の道
    C.rect(4, 11, GX - 4, 2, 'P');   // 古い桟橋への小道
    C.rect(29, 7, 2, 12, 'r');   // 東の小道
    for (var y = 8; y < 16; y++) for (var x = 12; x < 23; x++) { var d = Math.sqrt((x - PX) * (x - PX) + (y - PY - 0.5) * (y - PY - 0.5)); if (d < 3.4) C.set(x, y, 'P'); }
    C.set(PX + 1, PY, 'y'); C.set(PX + 1, PY + 1, 'I');   // 灯籠
    // 網干し場（北東）
    [[36, 6], [38, 6], [40, 6], [36, 10], [38, 10], [40, 10]].forEach(function (p) { C.set(p[0], p[1], 'x'); }); [[44, 9], [45, 9], [47, 11]].forEach(function (p, i) { C.set(p[0], p[1], i % 2 ? 'q' : 'z'); });
    [[GX - 1, 16], [GX + 2, 22], [37, 18], [48, 18], [52, 21]].forEach(function (p) { C.set(p[0], p[1], 'y'); });
    [[13, 2], [28, 1], [53, 7], [53, 12], [5, 23], [10, 24], [24, 24], [24, 1]].forEach(function (p) { C.set(p[0], p[1], '6'); });
    return C;
  }
  R.define('aruna_village', {
    version: 1, rows: rows, arrive: [GX, 23],
    buildings: {
      inn: { x: 5, y: 2, w: 8, h: 5, doorX: 3 }, item: { x: 19, y: 2, w: 8, h: 5, doorX: 3 }, a3_aruna_hut: { x: 32, y: 3, w: 4, h: 4, doorX: 1 },
      bread_stall76: { x: 21, y: 10, w: 3, h: 2, doorX: 1 },
      yorn: { x: 5, y: 14, w: 8, h: 5, doorX: 3 }, iris: { x: 20, y: 14, w: 8, h: 5, doorX: 3 },
      x72_house: { x: 32, y: 14, w: 7, h: 5, doorX: 3 }, x72_hall: { x: 40, y: 14, w: 8, h: 5, doorX: 3 }, x72_tower: { x: 49, y: 13, w: 6, h: 6, doorX: 2 }
    },
    npcs: {
      av_yorn: [6, 10, 'down', 0], av_child: [14, 16, 'down', 2], av_woman: [23, 22, 'down', 1], av_castaway: [9, 22, 'down', 0], av_merchant: [25, 9, 'down', 0], av_sailor: [44, 21, 'down', 1],
      av_clockmaker: [27, 22, 'down', 0], aunt67_aruna_village: [19, 13, 'down', 1],
      arunavillage_x72_kid: [46, 21, 'down', 1], arunavillage_x72_vendor: [41, 21, 'down', 0], arunavillage_x72_elder: [34, 12, 'down', 0],
      aruna_village_a73_0: [22, 9, 'down', 2], aruna_village_a73_1: [44, 4, 'down', 2], aruna_village_a73_2: [42, 8, 'down', 2], aruna_village_a73_3: [36, 8, 'down', 2], aruna_village_a73_4: [38, 12, 'down', 2], aruna_village_a73_5: [47, 6, 'down', 1],
      u73_yot: [31, 23, 'down', 0], tmaster_lione: [10, 9, 'down', 0], aruna_village_bread76: [22, 10, 'down', 0]
    },
    events: [[3, 12, 3, 12], [50, 17, 31, 18]],
    chests: { av1: [28, 24] }, points: { opt_039: [12, 21], opt_041: [24, 12] },
    warps: [GX, GX + 1].map(function (x) { return { x: x, y: H - 1, to: 'world_islands', tx: 46, ty: 64, name: '島へ' }; }),
    anchors: [[13, 22, GX, 24], [14, 22, GX + 1, 24], [13, 21, GX, 23], [14, 21, GX + 1, 23]],
    after: function (def) {
      def.events.forEach(function (e) { if (e.x === 31 && e.y === 18) e.text = ['【東の桟橋通り】', '南の通りを東へ。網元の家・船乗りの酒場・小さな灯台、海へ突き出た二本の桟橋。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'arunavillage_x72_kid') n.talk = say('子ども', ['桟橋通りの小さな灯台、てっぺんまで登ったことある？　灰灯島アルナ・生存者の村がぜんぶ見えるんだよ！', '村は、西の古い桟橋から始まったんだって。']);
        if (n.id === 'arunavillage_x72_elder') n.talk = say('町の古老', ['この桟橋通りも、昔はただの浜だった。少しずつ家が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('aruna_village', 'v81_arunav_view', { x: GX + 1, y: 4, z: 12, dist: 26, pitch: 38 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
