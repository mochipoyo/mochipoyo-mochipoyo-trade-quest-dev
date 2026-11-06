/* =========================================================
   Data / v8.1 鐘都テンプス（tempus_city）：鐘の回廊が鐘楼へ続き、鐘楼の前は日時計の広場
   ・住む理由：都の時を告げる鐘楼と、時計職人たち。時間を預かる時間銀行
   ・入口から最初に見える物：南の門から、屋根のある「鐘の回廊」がまっすぐ北へ。その先の日時計の広場（床に時刻の線）と鐘楼
   ・道：鐘の回廊（門 → 日時計の広場 → 鐘楼）。西に宿と道具屋、鐘楼の影が映る噴水の小広場。東に武具店・防具店、さらに東の「歯車通り」に時計塔と工房
   ・境界：柵（防御型）。出入りは南の門
   ・人・出来事・宝箱・調べる所はそのまま（位置だけ）。噴水の出来事（鐘楼の影）も噴水のそばのまま
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 64, H = 32, RX = 30, SX = 31, SY = 11;
  function rows(canvas) {
    var C = canvas(W, H, '=');
    C.frame(0, 0, W, H, 'x'); C.rect(RX, H - 1, 4, 1, 'P');
    C.rect(1, 7, W - 2, 2, 'r'); C.rect(1, 26, W - 2, 2, 'r');   // 北の通り・南の通り
    C.rect(RX, 13, 4, H - 14, 'P');   // 鐘の回廊の床
    for (var y = 7; y < 16; y++) for (var x = 25; x < 39; x++) { var d = Math.sqrt((x - SX - 0.5) * (x - SX - 0.5) + (y - SY - 0.5) * (y - SY - 0.5)); if (d < 4.6) C.set(x, y, 'P'); }
    // 日時計：真ん中の針（柱）と、床の時刻の線（8 方向）
    [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]].forEach(function (v) { for (var k = 2; k <= 4; k++) { var x = SX + v[0] * k, y = SY + v[1] * k; if (Math.abs(v[0]) + Math.abs(v[1]) === 2 && k > 3) continue; C.set(x, y, '-'); } });
    C.set(SX, SY, 'I');
    // 西の噴水の小広場（鐘楼の影が映る）
    C.rect(14, 19, 11, 6, 'P'); C.rect(17, 21, 2, 2, 'Q'); C.set(15, 20, 'e'); C.set(23, 23, 'e'); C.set(15, 23, 'a'); C.set(23, 20, 'a');
    // 東の歯車通り：縦の小路と歯車の台（計器）
    C.rect(45, 9, 2, 17, 'r'); [[44, 12], [44, 17], [44, 22], [47, 14], [47, 20]].forEach(function (p) { C.set(p[0], p[1], '?'); });
    [[RX - 1, 16], [RX + 4, 16], [RX - 1, 21], [RX + 4, 21], [RX - 1, 29], [RX + 4, 29]].forEach(function (p) { C.set(p[0], p[1], 'y'); });
    [[2, 10], [61, 4], [60, 20], [2, 29], [61, 29], [12, 18]].forEach(function (p) { C.set(p[0], p[1], '6'); });
    return C;
  }
  R.define('tempus_city', {
    version: 1, rows: rows, arrive: [RX + 1, 28],
    buildings: {
      bank: { x: 3, y: 2, w: 10, h: 5, doorX: 4 }, a3_tempus_clock: { x: 15, y: 3, w: 4, h: 4, doorX: 1 }, bell: { x: 26, y: 1, w: 11, h: 6, doorX: 5 },
      church: { x: 41, y: 2, w: 9, h: 5, doorX: 4 }, x72_hall: { x: 52, y: 2, w: 8, h: 5, doorX: 3 },
      inn: { x: 3, y: 12, w: 8, h: 5, doorX: 3 }, x72_house: { x: 14, y: 12, w: 7, h: 5, doorX: 3 }, bread_stall76: { x: 25, y: 18, w: 3, h: 2, doorX: 1 },
      item: { x: 3, y: 20, w: 8, h: 5, doorX: 3 },
      weapon: { x: 36, y: 13, w: 8, h: 5, doorSide: 'left', doorY: 2 }, armor: { x: 36, y: 20, w: 8, h: 5, doorSide: 'left', doorY: 2 },
      x72_tower: { x: 49, y: 12, w: 6, h: 6, doorSide: 'left', doorY: 3 }, x72_ex0: { x: 49, y: 20, w: 7, h: 5, doorSide: 'left', doorY: 2 }
    },
    npcs: {
      tc_gate: [29, 28, 'right', 0], tc_victim: [8, 9, 'down', 1], tc_woman: [37, 10, 'down', 1], tc_child: [21, 24, 'down', 2], tc_after: [13, 24, 'down', 1], tc_waveold: [26, 16, 'down', 0],
      aunt67_tempus_city: [20, 21, 'down', 1], s3121_tc_wave: [27, 12, 'down', 0], tempuscity_x72_kid: [56, 19, 'down', 1], tempuscity_x72_vendor: [57, 10, 'down', 0], tempuscity_x72_elder: [48, 25, 'down', 0],
      tempus_city_a73_0: [59, 13, 'down', 2], tempus_city_a73_1: [12, 21, 'down', 2], tempus_city_a73_2: [40, 19, 'down', 1], tempus_city_a73_3: [61, 9, 'down', 2],
      u73_chikuta: [38, 25, 'down', 1], tmaster_chrono: [28, 9, 'down', 0], tempus_city_bread76: [26, 18, 'down', 0]
    },
    events: [[16, 22, 17, 21], [48, 13, 45, 8]],
    chests: { tc1: [61, 29] }, points: { sp_tempus_city_36_12: [38, 11], sp_tempus_city_8_2: [10, 9], opt_045: [5, 18] },
    warps: [RX, RX + 1, RX + 2, RX + 3].map(function (x) { return { x: x, y: H - 1, to: 'world_tempus', tx: 58, ty: 64, name: '町の外へ' }; }),
    anchors: [[18, 27, RX, 28], [19, 27, RX + 1, 28], [20, 27, RX + 2, 28], [21, 27, RX + 3, 28], [18, 28, RX, 29], [19, 28, RX + 1, 29], [20, 28, RX + 2, 29], [21, 28, RX + 3, 29]],
    after: function (def) {
      def.waterSound81 = [{ x: 17, y: 21, r: 5, v: 0.6 }];   // 噴水の水音（js/ui/ambient81.js）
      def.arcades81 = [{ x: RX, y: 16, w: 4, h: 10, kind: 'arcade' }];   // 鐘の回廊
      def.events.forEach(function (e) { if (e.x === 45 && e.y === 8) e.text = ['【歯車通り】', '東の小路に、歯車の台・小さな時計塔・画家のアトリエ。', '北の通りの東に時計工房。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'tempuscity_x72_kid') n.talk = say('子ども', ['歯車通りの小さな時計塔、てっぺんまで登ったことある？　鐘都テンプスがぜんぶ見えるんだよ！', '日時計の線が、上から見ると星の形なんだって。']);
        if (n.id === 'tempuscity_x72_elder') n.talk = say('町の古老', ['この歯車通りも、昔はただの空き地だった。少しずつ工房が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('tempus_city', 'v81_tempus_view', { x: RX + 2, y: 3, z: 14, dist: 28, pitch: 36 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
