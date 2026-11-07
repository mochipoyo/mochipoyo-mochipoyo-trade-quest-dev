/* =========================================================
   Data / v8.1 虚無の荒野の前線基地（dark_camp）：荒野（北）へ向けた「鏃（やじり）」の形の陣。先に作戦室、両の翼に天幕、真ん中に旗の立つ練兵場
   ・住む理由：荒野へ出る義勇兵の前線。寝る・食べる・武器をそろえる・作戦を決める
   ・入口から最初に見える物：南の門から、まっすぐ北へのびる陣の道。正面に旗の立つ練兵場、その先の鏃の先に作戦室。
     作戦室の前から左右へ斜めに下る 2 本の「翼の道」が、陣を矢じりの形にくくっている
   ・道：陣の道（門 → 練兵場 → 作戦室の前庭）。前庭から西の翼・東の翼（斜めの道）。
     翼の外（北西）＝補給所・野戦宿舎と炊事場、翼の外（北東）＝兵士の宿舎・物見やぐら。翼の内＝練兵場・武器庫・パンの露店、
     南西の外れに外れの天幕と記憶の墓標、南東に馬の囲い
   ・前（v8.1 の最初）は横の通り 2 本に天幕が並ぶ格子だった。荒野へ向けた鏃の形に変えた
   ・境界：杭の柵（防御型）。出入りは南の門
   ・人・出来事（記憶の墓標・繰り返しの碑）・宝箱・調べる所はそのまま（位置だけ）
   ・地球の世界の転送門（region78-orbis.js が足す結晶の柱と技師）は南西の外れ。このファイルは region78-orbis.js のあとに読む
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 50, H = 30, RX = 23;   // RX：陣の道と門（23〜26）
  var B = {
    x72_hall: { x: 21, y: 1, w: 8, h: 5, doorX: 3 },
    shop: { x: 9, y: 4, w: 7, h: 4, doorSide: 'right', doorY: 3 }, inn: { x: 4, y: 11, w: 7, h: 4, doorSide: 'right', doorY: 2 },
    x72_house: { x: 34, y: 2, w: 7, h: 5, doorX: 3 }, x72_tower: { x: 42, y: 8, w: 6, h: 6, doorSide: 'left', doorY: 4 },
    armory: { x: 13, y: 20, w: 7, h: 4, doorX: 3 }, bread_stall76: { x: 28, y: 19, w: 3, h: 2, doorX: 1 },
    hald: { x: 7, y: 25, w: 7, h: 4, doorSide: 'right', doorY: 1 }
  };
  function rows(canvas) {
    var C = canvas(W, H, '+');
    C.frame(0, 0, W, H, 'x'); C.rect(RX, H - 1, 4, 1, 'r');
    var k;
    for (k = 0; k <= 17; k++) { C.rect(19 - k, 8 + k, 2, 2, 'r'); C.rect(29 + k, 8 + k, 2, 2, 'r'); }   // 西の翼・東の翼（斜めの道）
    C.rect(19, 6, 12, 2, 'P');   // 作戦室の前庭（鏃の先）
    C.rect(RX, 8, 4, H - 9, 'r');   // 陣の道
    C.rect(17, 12, 16, 7, 'P'); C.set(RX + 1, 15, 'I');   // 練兵場と旗の柱
    // 扉の前から、いちばん近い道まで小道を引く（建物をよけて。決まった順に調べるので結果は毎回同じ）
    var block = {}; Object.keys(B).forEach(function (id) { var b = B[id]; for (var j = b.y; j < b.y + b.h; j++) for (var i = b.x; i < b.x + b.w; i++) block[i + ',' + j] = 1; });
    var road = function (t) { return t === 'r' || t === 'P'; };
    Object.keys(B).forEach(function (id) {
      var f = R.door(B[id]).front; if (road(C.get(f.x, f.y))) return;
      var prev = {}; var q = [[f.x, f.y]]; prev[f.x + ',' + f.y] = null; var hit = null;
      while (q.length && !hit) { var p = q.shift(); [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) { if (hit) return; var X = p[0] + d[0], Y = p[1] + d[1], key = X + ',' + Y;
        if (X < 1 || Y < 1 || X >= W - 1 || Y >= H - 1 || key in prev || block[key]) return; var t = C.get(X, Y); prev[key] = p[0] + ',' + p[1];
        if (road(t)) { hit = p[0] + ',' + p[1]; return; } if (t === '+') q.push([X, Y]); }); }
      for (var s = hit; s; s = prev[s]) { var xy = s.split(','); C.set(+xy[0], +xy[1], 'r'); }
    });
    // 炊事場（野戦宿舎の前）・補給の木箱
    C.set(9, 9, 'T'); C.set(10, 9, 'q'); C.set(5, 9, 'z');
    [[16, 10], [15, 11], [33, 10], [34, 11], [21, 20], [21, 22]].forEach(function (p, i) { if (C.get(p[0], p[1]) === '+') C.set(p[0], p[1], i % 2 ? 'q' : 'z'); });
    // 馬の囲い（南東・北が開いている）
    C.frame(33, 23, 9, 5, 'x'); C.set(37, 23, '+');
    // 篝火（陣の道・前庭）と枯れ木
    [[RX - 1, 10], [RX + 4, 10], [RX - 1, 21], [RX + 4, 23], [RX - 1, 26], [RX + 4, 26], [19, 5], [30, 5]].forEach(function (p) { C.set(p[0], p[1], 'y'); });
    [[2, 6], [46, 4], [12, 17], [37, 17], [44, 20], [17, 27]].forEach(function (p) { if (C.get(p[0], p[1]) === '+') C.set(p[0], p[1], '6'); });
    return C;
  }
  R.define('dark_camp', {
    version: 2, rows: rows, arrive: [RX + 1, 27], buildings: B,
    npcs: {
      dc_captain: [22, 9, 'down', 0], dc_soldier: [6, 9, 'down', 1], dc_miner: [13, 13, 'down', 1], dc_tech: [30, 22, 'down', 0], aunt67_dark_camp: [19, 17, 'down', 1],
      darkcamp_x72_kid: [40, 9, 'down', 1], darkcamp_x72_vendor: [39, 15, 'down', 0], darkcamp_x72_elder: [47, 17, 'down', 0],
      dark_camp_a73_0: [27, 11, 'down', 2], dark_camp_a73_1: [8, 17, 'down', 2], dark_camp_a73_2: [36, 25, 'down', 1], dark_camp_a73_3: [39, 25, 'down', 1],
      dc_gatetech: [3, 27, 'down', 0], u73_grill: [8, 10, 'down', 0], dark_camp_bread76: [29, 19, 'down', 0]
    },
    events: [[5, 16, 2, 28], [14, 10, 20, 26], [31, 10, 33, 8], [5, 17, 5, 28]],
    chests: { dc1: [47, 28] }, points: { sp_dark_camp_23_1: [18, 1], sp_dark_camp_6_1: [2, 2], opt_081: [30, 1] },
    warps: [RX, RX + 1, RX + 2, RX + 3].map(function (x) { return { x: x, y: H - 1, to: 'world_dark', tx: 80, ty: 96, name: '荒野へ' }; }),
    anchors: [[6, 16, 4, 27], [12, 18, RX, 28], [13, 18, RX + 1, 28], [14, 18, RX + 2, 28], [15, 18, RX + 3, 28], [12, 17, RX, 27], [13, 17, RX + 1, 27], [14, 17, RX + 2, 27], [15, 17, RX + 3, 27]],
    after: function (def) {
      def.events.forEach(function (e) { if (e.x === 33 && e.y === 8) e.text = ['【東の翼】', '作戦室の前庭から南東へ下る翼の道。外側に兵士の宿舎と物見やぐら。', '翼の内側に練兵場、南東に馬の囲い。陣は荒野へ向けた鏃の形。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'darkcamp_x72_kid') n.talk = say('子ども', ['東の物見やぐら、てっぺんまで登ったことある？　前線基地がぜんぶ見えるんだよ！', '上から見ると、陣が矢じりの形なの。先っぽの作戦室が、荒野のほうを向いてるんだって。']);
        if (n.id === 'darkcamp_x72_elder') n.talk = say('町の古老', ['この東の翼も、昔はただの荒れ地だった。少しずつ天幕が増えて、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('dark_camp', 'v81_darkcamp_view', { x: RX + 2, y: 2, z: 14, dist: 28, pitch: 42 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
