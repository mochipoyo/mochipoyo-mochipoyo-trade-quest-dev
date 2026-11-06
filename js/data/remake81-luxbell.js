/* =========================================================
   Data / v8.1 娯楽都市ラックスベル（luxbell）：灯りの並ぶ大通りが、噴水の広場とグランカジノへまっすぐ続く町
   ・住む理由：グランカジノと、遊びに来る人を迎える宿・食堂・劇場
   ・入口から最初に見える物：南の門から、両わきに灯りと花の並ぶ「鈴の大通り」。その先に噴水の広場と、いちばん大きなグランカジノ
   ・道：鈴の大通り（門 → 屋台の通り → 中の通り → 噴水の広場 → カジノ）。北の通りにサイコロ職人の家・カジノ研究棟・踊り子の家・小さな劇場
     中の通りの西に金の鈴亭、東に食堂。東の「歓楽通り」に古道具屋と展望タワー。南の通りの西に雑貨店
   ・境界：生け垣（見せる境界）。出入りは南の門
   ・人・出来事・宝箱・調べる所はそのまま（位置だけ）
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 64, H = 32, RX = 30, SX = 31, SY = 12;
  function rows(canvas) {
    var C = canvas(W, H, '=');
    C.frame(0, 0, W, H, 'f'); C.rect(RX, H - 1, 4, 1, 'P');
    C.rect(1, 9, W - 2, 2, 'r'); C.rect(1, 16, W - 2, 2, 'r'); C.rect(1, 26, W - 2, 2, 'r');   // 北の通り・中の通り・南の通り
    C.rect(RX, 16, 4, H - 17, 'P');   // 鈴の大通り
    for (var y = 9; y < 17; y++) for (var x = 24; x < 40; x++) { var d = Math.sqrt((x - SX - 0.5) * (x - SX - 0.5) + (y - SY - 0.5) * (y - SY - 0.5)); if (d < 4.6) C.set(x, y, 'P'); }
    C.rect(SX, SY, 2, 2, 'Q');   // 噴水
    C.rect(50, 9, 2, 19, 'r');   // 東の歓楽通り
    // 大通りの灯りと花（交互）
    [19, 21, 23, 25, 29].forEach(function (y, i) { var c = i % 2 ? 'a' : 'y'; C.set(RX - 1, y, c); C.set(RX + 4, y, c); });
    [12, 15].forEach(function (y) { C.set(49, y, 'y'); C.set(52, y, 'y'); }); [20, 23].forEach(function (y) { C.set(49, y, 'y'); C.set(52, y, 'y'); });
    // 屋台の通り（遊びの屋台）
    [[22, 20], [25, 20], [22, 23], [25, 23], [37, 20], [40, 20], [37, 23], [40, 23]].forEach(function (p) { C.set(p[0], p[1], 'A'); });
    // 中の通りの西の小さな公園
    C.rect(13, 11, 8, 4, ','); C.set(14, 12, 'e'); C.set(19, 12, 'e'); C.set(16, 13, 'a'); C.set(17, 13, 'a');
    [[2, 2], [11, 2], [22, 3], [42, 3], [62, 14], [2, 29], [45, 29], [12, 29]].forEach(function (p) { C.set(p[0], p[1], '6'); });
    return C;
  }
  R.define('luxbell', {
    version: 1, rows: rows, arrive: [RX + 1, 29],
    buildings: {
      a3_luxbell_dice: { x: 3, y: 5, w: 6, h: 4, doorX: 2 }, lx_labs: { x: 12, y: 4, w: 8, h: 5, doorX: 3 }, lx_casino: { x: 23, y: 1, w: 18, h: 8, doorX: 8 },
      x72_house: { x: 44, y: 4, w: 7, h: 5, doorX: 3 }, x72_hall: { x: 54, y: 4, w: 8, h: 5, doorX: 3 },
      lx_inn: { x: 3, y: 11, w: 8, h: 5, doorX: 3 }, bread_stall76: { x: 37, y: 13, w: 3, h: 2, doorX: 1 }, lx_dining: { x: 40, y: 11, w: 8, h: 5, doorX: 3 }, x72_ex0: { x: 54, y: 11, w: 7, h: 5, doorX: 3 },
      lx_item: { x: 3, y: 21, w: 8, h: 5, doorX: 3 }, x72_tower: { x: 55, y: 20, w: 6, h: 6, doorX: 2 }
    },
    npcs: {
      lx_guide: [29, 28, 'right', 0], lx_exgambler: [27, 19, 'down', 1], lx_child: [17, 19, 'down', 1], lx_merchant: [9, 18, 'down', 1], aunt67_luxbell: [22, 14, 'down', 1],
      luxbell_x72_kid: [53, 18, 'down', 1], luxbell_x72_vendor: [53, 13, 'down', 0], luxbell_x72_elder: [57, 18, 'down', 0],
      luxbell_a73_0: [47, 19, 'down', 2], luxbell_a73_1: [36, 15, 'down', 2], luxbell_a73_2: [24, 29, 'down', 1], luxbell_a73_3: [2, 18, 'down', 2],
      u73_zero: [35, 24, 'down', 0], luxbell_bread76: [38, 13, 'down', 0]
    },
    events: [[21, 26, RX + 4, 28], [49, 13, 49, 18]],
    chests: { lx1: [61, 29] }, points: { opt_032: [13, 2], opt_034: [44, 19] },
    warps: [RX, RX + 1, RX + 2, RX + 3].map(function (x) { return { x: x, y: H - 1, to: 'world_kalion', tx: 96, ty: 81, name: '町の外へ' }; }),
    anchors: [[18, 28, RX, 29], [19, 28, RX + 1, 29], [20, 28, RX + 2, 29], [21, 28, RX + 3, 29], [18, 27, RX, 28], [19, 27, RX + 1, 28], [20, 27, RX + 2, 28], [21, 27, RX + 3, 28]],
    after: function (def) {
      def.waterSound81 = [{ x: 31, y: 12, r: 6, v: 0.7 }];   // 噴水の水音（js/ui/ambient81.js）
      def.events.forEach(function (e) {
        if (e.x === RX + 4 && e.y === 28) e.text = ['案内板：「娯楽都市ラックスベル——まっすぐ北：グランカジノ」', '「中の通りの西：金の鈴亭　東：食堂　北の通りの西：カジノ研究棟」', '「南の通りの西：雑貨店　東の歓楽通り：古道具屋・展望タワー」'];
        if (e.x === 49 && e.y === 18) e.text = ['【東の歓楽通り】', '北の通りに踊り子の家と小さな劇場。中の通りに古道具屋、南に展望タワー。'];
      });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'luxbell_x72_kid') n.talk = say('子ども', ['歓楽通りの展望タワー、てっぺんまで登ったことある？　娯楽都市ラックスベルがぜんぶ見えるんだよ！', '夜は大通りの灯りが、カジノまで一本の線になるんだって。']);
        if (n.id === 'luxbell_x72_elder') n.talk = say('町の古老', ['この歓楽通りも、昔はただの空き地だった。少しずつ店が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('luxbell', 'v81_luxbell_view', { x: RX + 2, y: 4, z: 15, dist: 30, pitch: 36 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
