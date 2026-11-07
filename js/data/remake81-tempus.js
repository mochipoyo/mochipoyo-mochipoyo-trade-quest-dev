/* =========================================================
   Data / v8.1 鐘都テンプス（tempus_city）：2 つの輪の道が鐘の回廊で結ばれた「∞（8 の字）」の町。北のはしに鐘楼、その前に日時計の広場
   ・住む理由：都の時を告げる鐘楼と、時計職人たち。時間を預かる時間銀行
   ・入口から最初に見える物：南の門から、屋根のある「鐘の回廊」がまっすぐ北へ。回廊の先で左右に 2 つの輪の道が分かれ、
     その奥に日時計の広場（床に時刻の線）と鐘楼
   ・道：鐘の回廊（門 → 8 の字の交わり → 日時計の広場 → 鐘楼）。交わりから左右へ 2 つの輪：
     西の輪（「噴水の輪」）＝真ん中に鐘楼の影が映る噴水。まわりに時間銀行・時計職人の家・宿・道具屋
     東の輪（「歯車の輪」＝歯車通り）＝真ん中に小さな時計塔と歯車の台。まわりに鐘の教会・時計工房・画家のアトリエ
     回廊の南の両わきに武具店・防具店
   ・前（v8.1 の最初）は横の通り 2 本と縦の回廊の格子だった。2 つの輪が回廊で結ばれた 8 の字に変えた
   ・境界：柵（防御型）。出入りは南の門
   ・人・出来事・宝箱・調べる所はそのまま（位置だけ）。噴水の出来事（鐘楼の影）も噴水のそばのまま
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 70, H = 36, RX = 33;   // RX：鐘の回廊と門（33〜36）
  var LOOPS = [[21, 18], [49, 18]];   // 西の輪・東の輪の中心（外の半径 11×8、内の半径 9×6。道の幅 2）
  var SX = 34, SY = 11;   // 日時計の針
  var B = {
    bell: { x: 29, y: 1, w: 11, h: 6, doorX: 5 },
    bank: { x: 2, y: 2, w: 10, h: 5, doorX: 4 }, a3_tempus_clock: { x: 13, y: 3, w: 4, h: 4, doorX: 1 }, x72_house: { x: 18, y: 2, w: 7, h: 5, doorX: 3 },
    church: { x: 42, y: 2, w: 9, h: 5, doorX: 4 }, x72_hall: { x: 53, y: 2, w: 8, h: 5, doorX: 3 },
    inn: { x: 1, y: 16, w: 8, h: 5, doorSide: 'right', doorY: 2 }, item: { x: 12, y: 28, w: 8, h: 5, doorSide: 'right', doorY: 0 },
    x72_ex0: { x: 62, y: 16, w: 7, h: 5, doorSide: 'left', doorY: 2 }, x72_tower: { x: 46, y: 15, w: 6, h: 6, doorX: 2 },
    weapon: { x: 24, y: 28, w: 8, h: 5, doorSide: 'right', doorY: 2 }, armor: { x: 38, y: 28, w: 8, h: 5, doorSide: 'left', doorY: 2 },
    bread_stall76: { x: 17, y: 21, w: 3, h: 2, doorX: 1 }
  };
  function inLoop(x, y, c, ax, ay) { var dx = (x + 0.5 - c[0]) / ax, dy = (y + 0.5 - c[1]) / ay; return dx * dx + dy * dy < 1; }
  function rows(canvas) {
    var C = canvas(W, H, '=');
    C.frame(0, 0, W, H, 'x');
    var x, y;
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) LOOPS.forEach(function (c) { if (inLoop(x, y, c, 11, 8)) C.set(x, y, inLoop(x, y, c, 9, 6) ? ',' : 'r'); });   // 2 つの輪（内側は庭）
    C.rect(RX - 1, 17, 6, 2, 'r');   // 8 の字の交わり（2 つの輪を結ぶ）
    C.rect(RX, 19, 4, H - 19, 'P');   // 鐘の回廊の床（門まで）
    // 日時計の広場（鐘楼の前）：丸い広場と、針（柱）・床の時刻の線（8 方向）
    for (y = 7; y < 17; y++) for (x = 29; x < 41; x++) { var dx = x + 0.5 - (SX + 1), dy = y + 0.5 - (SY + 0.5); if (dx * dx + dy * dy < 4.3 * 4.3) C.set(x, y, 'P'); }
    C.rect(RX, 7, 4, 2, 'P'); C.rect(RX, 15, 4, 2, 'P');   // 鐘楼の扉の前・交わりへ
    [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]].forEach(function (v) { for (var k = 2; k <= 3; k++) C.set(SX + v[0] * k, SY + v[1] * k, '-'); });
    C.set(SX, SY, 'I');
    // 西の輪の庭：噴水・腰かけ・花壇
    C.rect(20, 17, 2, 2, 'Q'); [[15, 18], [26, 18], [18, 14], [24, 22]].forEach(function (p) { C.set(p[0], p[1], 'e'); }); [[14, 15], [27, 15], [14, 21], [24, 14]].forEach(function (p) { C.rect(p[0], p[1], 2, 1, 'a'); });
    // 東の輪の庭（歯車通り）：時計塔のまわりの歯車の台
    [[43, 15], [43, 20], [54, 15], [54, 20], [49, 13]].forEach(function (p) { C.set(p[0], p[1], '?'); });
    // 扉の前から、いちばん近い道まで小道を引く（建物をよけて。決まった順に調べるので結果は毎回同じ）
    var block = {}; Object.keys(B).forEach(function (id) { var b = B[id]; for (var j = b.y; j < b.y + b.h; j++) for (var i = b.x; i < b.x + b.w; i++) block[i + ',' + j] = 1; });
    var road = function (t) { return t === 'r' || t === 'P' || t === ','; };
    Object.keys(B).forEach(function (id) {
      var f = R.door(B[id]).front; if (road(C.get(f.x, f.y))) return;
      var prev = {}; var q = [[f.x, f.y]]; prev[f.x + ',' + f.y] = null; var hit = null;
      while (q.length && !hit) { var p = q.shift(); [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) { if (hit) return; var X = p[0] + d[0], Y = p[1] + d[1], key = X + ',' + Y;
        if (X < 1 || Y < 1 || X >= W - 1 || Y >= H - 1 || key in prev || block[key]) return; var t = C.get(X, Y); prev[key] = p[0] + ',' + p[1];
        if (road(t)) { hit = p[0] + ',' + p[1]; return; } if (t === '=') q.push([X, Y]); }); }
      for (var s = hit; s; s = prev[s]) { var xy = s.split(','); C.set(+xy[0], +xy[1], 'r'); }
    });
    // 回廊の灯り・植え込み
    [[RX - 1, 22], [RX + 4, 22], [RX - 1, 26], [RX + 4, 26], [RX - 1, 33], [RX + 4, 33], [30, 9], [39, 9]].forEach(function (p) { C.set(p[0], p[1], 'y'); });
    [[2, 9], [66, 9], [2, 32], [66, 31], [27, 34], [42, 34], [60, 12], [9, 12]].forEach(function (p) { if (C.get(p[0], p[1]) === '=') C.set(p[0], p[1], '6'); });
    return C;
  }
  R.define('tempus_city', {
    version: 2, rows: rows, arrive: [RX + 1, 33], buildings: B,
    npcs: {
      tc_gate: [RX - 1, 34, 'right', 0], tc_victim: [8, 9, 'down', 1], tc_woman: [38, 13, 'down', 1], tc_child: [23, 21, 'down', 2], tc_after: [13, 25, 'down', 1], tc_waveold: [29, 14, 'down', 0],
      aunt67_tempus_city: [17, 11, 'down', 1], s3121_tc_wave: [32, 13, 'down', 0], tempuscity_x72_kid: [44, 22, 'down', 1], tempuscity_x72_vendor: [58, 9, 'down', 0], tempuscity_x72_elder: [52, 27, 'down', 0],
      tempus_city_a73_0: [62, 12, 'down', 2], tempus_city_a73_1: [4, 23, 'down', 2], tempus_city_a73_2: [40, 24, 'down', 1], tempus_city_a73_3: [64, 9, 'down', 2],
      u73_chikuta: [47, 31, 'down', 1], tmaster_chrono: [36, 9, 'down', 0], tempus_city_bread76: [18, 21, 'down', 0]
    },
    events: [[16, 22, 20, 17], [48, 13, 40, 11]],
    chests: { tc1: [68, 34] }, points: { sp_tempus_city_36_12: [38, 15], sp_tempus_city_8_2: [9, 9], opt_045: [3, 13] },
    warps: [RX, RX + 1, RX + 2, RX + 3].map(function (x) { return { x: x, y: H - 1, to: 'world_tempus', tx: 58, ty: 64, name: '町の外へ' }; }),
    anchors: [[18, 27, RX, 33], [19, 27, RX + 1, 33], [20, 27, RX + 2, 33], [21, 27, RX + 3, 33], [18, 28, RX, 34], [19, 28, RX + 1, 34], [20, 28, RX + 2, 34], [21, 28, RX + 3, 34]],
    after: function (def) {
      def.waterSound81 = [{ x: 20, y: 17, r: 5, v: 0.6 }];   // 噴水の水音（js/ui/ambient81.js）
      def.arcades81 = [{ x: RX, y: 20, w: 4, h: 13, kind: 'arcade' }];   // 鐘の回廊
      def.events.forEach(function (e) { if (e.x === 40 && e.y === 11) e.text = ['【歯車通り（東の輪）】', '輪の真ん中に小さな時計塔と歯車の台。まわりに鐘の教会・時計工房・画家のアトリエ。', '西の輪には噴水。2 つの輪は鐘の回廊で結ばれている。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'tempuscity_x72_kid') n.talk = say('子ども', ['歯車の輪の小さな時計塔、てっぺんまで登ったことある？　鐘都テンプスがぜんぶ見えるんだよ！', '上から見ると、町の道が 8 の字なの。時計の 8 じゃなくて、ずっと回る「無限」の印なんだって。']);
        if (n.id === 'tempuscity_x72_elder') n.talk = say('町の古老', ['この歯車の輪も、昔はただの空き地だった。少しずつ工房が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('tempus_city', 'v81_tempus_view', { x: RX + 2, y: 3, z: 18, dist: 34, pitch: 46 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
