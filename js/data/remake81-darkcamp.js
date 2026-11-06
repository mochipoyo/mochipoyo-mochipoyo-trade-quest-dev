/* =========================================================
   Data / v8.1 虚無の荒野の前線基地（dark_camp）：杭の柵で囲み、旗の立つ練兵場を中心に天幕が並ぶ陣
   ・住む理由：荒野へ出る義勇兵の前線。寝る・食べる・武器をそろえる・作戦を決める
   ・入口から最初に見える物：南の門から陣の道。正面に旗の立つ練兵場、その奥（北）に作戦室
   ・道：陣の道（門 → 東西の通り → 練兵場 → 北の通り → 作戦室）。北の通りに野戦宿舎・補給所・兵士の宿舎・物見やぐら、
     東西の通りの西に武器庫。南西の外れに外れの天幕と記憶の墓標。南東に馬の囲い
   ・境界：杭の柵（防御型）。出入りは南の門
   ・人・出来事（記憶の墓標・繰り返しの碑）・宝箱・調べる所はそのまま（位置だけ）
   ・地球の世界の転送門（region78-orbis.js が足す結晶の柱と技師）は南西の外れ。このファイルは region78-orbis.js のあとに読む
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 48, H = 24, RX = 22;
  function rows(canvas) {
    var C = canvas(W, H, '+');
    C.frame(0, 0, W, H, 'x'); C.rect(RX, H - 1, 4, 1, 'r');
    C.rect(1, 6, W - 2, 2, 'r'); C.rect(1, 15, W - 2, 2, 'r');   // 北の通り・東西の通り
    C.rect(RX, 6, 4, H - 7, 'r');   // 陣の道
    C.rect(16, 8, 16, 6, 'P'); C.set(RX + 1, 10, 'I');   // 練兵場と旗の柱
    // 炊事場（野戦宿舎の前）
    C.set(9, 9, 'T'); C.set(8, 9, 'q'); C.set(11, 9, 'z');
    // 補給の木箱
    [[13, 9], [14, 10], [33, 9], [34, 9]].forEach(function (p, i) { C.set(p[0], p[1], i % 2 ? 'q' : 'z'); });
    // 馬の囲い（南東）
    C.frame(35, 18, 9, 5, 'x'); C.set(39, 18, '+');
    [[RX - 1, 19], [RX + 4, 19], [RX - 1, 8], [RX + 4, 8], [15, 13], [32, 13]].forEach(function (p) { C.set(p[0], p[1], 'y'); });
    [[2, 9], [45, 9], [30, 21], [17, 21]].forEach(function (p) { C.set(p[0], p[1], '6'); });
    return C;
  }
  R.define('dark_camp', {
    version: 1, rows: rows, arrive: [RX + 1, 21],
    buildings: {
      inn: { x: 3, y: 2, w: 7, h: 4, doorX: 3 }, shop: { x: 11, y: 2, w: 7, h: 4, doorX: 3 }, x72_hall: { x: 20, y: 1, w: 8, h: 5, doorX: 3 },
      x72_house: { x: 30, y: 1, w: 7, h: 5, doorX: 3 }, x72_tower: { x: 40, y: 1, w: 6, h: 6, doorX: 2 },
      armory: { x: 3, y: 11, w: 7, h: 4, doorX: 3 }, bread_stall76: { x: 32, y: 13, w: 3, h: 2, doorX: 1 },
      hald: { x: 3, y: 18, w: 7, h: 4, doorX: 3 }
    },
    npcs: {
      dc_captain: [RX, 9, 'down', 0], dc_soldier: [8, 8, 'down', 1], dc_miner: [14, 12, 'down', 1], dc_tech: [28, 18, 'down', 0], aunt67_dark_camp: [18, 12, 'down', 1],
      darkcamp_x72_kid: [37, 11, 'down', 1], darkcamp_x72_vendor: [40, 9, 'down', 0], darkcamp_x72_elder: [43, 12, 'down', 0],
      dark_camp_a73_0: [28, 11, 'down', 2], dark_camp_a73_1: [12, 13, 'down', 2], dark_camp_a73_2: [38, 20, 'down', 1], dark_camp_a73_3: [41, 20, 'down', 1],
      dc_gatetech: [14, 20, 'down', 0], u73_grill: [10, 8, 'down', 0], dark_camp_bread76: [33, 13, 'down', 0]
    },
    events: [[5, 16, 1, 20], [14, 10, 20, 19], [31, 10, 37, 8], [5, 17, 12, 19]],
    chests: { dc1: [46, 22] }, points: { sp_dark_camp_23_1: [19, 1], sp_dark_camp_6_1: [10, 1], opt_081: [28, 1] },
    warps: [RX, RX + 1, RX + 2, RX + 3].map(function (x) { return { x: x, y: H - 1, to: 'world_dark', tx: 80, ty: 96, name: '荒野へ' }; }),
    anchors: [[6, 16, 12, 20], [12, 18, RX, 22], [13, 18, RX + 1, 22], [14, 18, RX + 2, 22], [15, 18, RX + 3, 22], [12, 17, RX, 21], [13, 17, RX + 1, 21], [14, 17, RX + 2, 21], [15, 17, RX + 3, 21]],
    after: function (def) {
      def.events.forEach(function (e) { if (e.x === 37 && e.y === 8) e.text = ['【東の陣地】', '北の通りの東に兵士の宿舎と物見やぐら。南東に馬の囲い。', '練兵場の北は作戦室。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'darkcamp_x72_kid') n.talk = say('子ども', ['東の物見やぐら、てっぺんまで登ったことある？　前線基地がぜんぶ見えるんだよ！', '上から見ると、天幕がぜんぶ練兵場の旗のほうを向いてるんだって。']);
        if (n.id === 'darkcamp_x72_elder') n.talk = say('町の古老', ['この東の陣地も、昔はただの荒れ地だった。少しずつ天幕が増えて、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('dark_camp', 'v81_darkcamp_view', { x: RX + 2, y: 2, z: 11, dist: 24, pitch: 38 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
