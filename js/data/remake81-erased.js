/* =========================================================
   Data / v8.1 地図から消えた村（erased_village）：深い森の奥の空き地。外からまっすぐの道がなく、曲がった隠れ道で入る
   ・住む理由：地図から消された村。見つからないように、森の木を残したまま、空き地に家を寄せて暮らしてきた。記録帳に毎日を書き残す
   ・入口から最初に見える物：南の門から、木のあいだを折れ曲がる隠れ道。抜けると、大きな木を囲む空き地と村長の家
   ・道：隠れ道（門 → 折れ道 → 大きな木の広場）。広場の北の小道は森の出口（北の端）へ。広場から東の小道は焼け跡（空き家・崩れかけた塔）へ
   ・境界：森（自然の境界）。出入りは南の門と北の森の出口
   ・人・出来事・宝箱・調べる所はそのまま（位置だけ）
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 46, H = 22, GX = 8, NX = 15, TX = 16, TY = 10;   // GX：南の門・NX：北の森の出口・TX, TY：大きな木
  function rows(canvas) {
    var C = canvas(W, H, '6');
    C.frame(0, 0, W, H, 'f'); C.rect(GX, H - 1, 2, 1, 'r'); C.rect(NX, 0, 2, 1, 'r');
    for (var y = 1; y < H - 1; y++) for (var x = 1; x < 29; x++) { var dx = (x + 0.5 - TX) / 12.5, dy = (y + 0.5 - TY) / 7.8; if (dx * dx + dy * dy < 1) C.set(x, y, '.'); }   // 村の空き地
    for (var y2 = 1; y2 < H - 1; y2++) for (var x2 = 28; x2 < W - 1; x2++) { var ex = (x2 + 0.5 - 37) / 8.6, ey = (y2 + 0.5 - 9) / 8; if (ex * ex + ey * ey < 1) C.set(x2, y2, '8'); }   // 東の焼け跡
    C.path([[GX, H - 2], [GX, 18], [13, 18], [13, 15]], 'r', 2);   // 隠れ道（折れ道）
    C.path([[13, 14], [TX - 1, 14]], 'P', 2);
    for (var y3 = TY - 3; y3 <= TY + 3; y3++) for (var x3 = TX - 4; x3 <= TX + 5; x3++) { var d = Math.sqrt((x3 + 0.5 - TX - 0.5) * (x3 + 0.5 - TX - 0.5) + (y3 + 0.5 - TY - 0.5) * (y3 + 0.5 - TY - 0.5)); if (d < 3.6 && d >= 1.2) C.set(x3, y3, 'P'); }
    C.rect(TX, TY, 2, 2, '6');   // 大きな木
    [[TX - 2, TY - 2], [TX + 3, TY - 2], [TX - 2, TY + 3], [TX + 3, TY + 3]].forEach(function (p) { C.set(p[0], p[1], 'e'); });
    C.rect(NX, 1, 2, TY - 3, 'P');   // 北の小道（森の出口へ）
    C.rect(TX + 4, 11, 13, 2, 'P');   // 東の小道（焼け跡へ）
    [[30, 9], [44, 9], [35, 17], [42, 15], [33, 2]].forEach(function (p) { C.set(p[0], p[1], '#'); });   // 焼け残った壁
    [[3, 14], [25, 7], [24, 15]].forEach(function (p) { C.set(p[0], p[1], 'a'); });
    return C;
  }
  R.define('erased_village', {
    version: 1, rows: rows, arrive: [GX + 1, 19],
    buildings: {
      ev_elder: { x: 5, y: 3, w: 8, h: 5, doorX: 3 }, ev_house: { x: 20, y: 4, w: 8, h: 5, doorX: 3 }, bread_stall76: { x: 9, y: 12, w: 3, h: 2, doorX: 1 },
      x72_house: { x: 31, y: 3, w: 7, h: 5, doorX: 3 }, x72_tower: { x: 38, y: 4, w: 6, h: 6, doorX: 2 }
    },
    npcs: {
      ev_child: [12, 10, 'down', 2], ev_woman: [20, 12, 'down', 1], aunt67_erased_village: [16, 13, 'down', 0], s3121_ev_survivor: [18, 6, 'down', 0],
      erasedvillage_x72_kid: [34, 13, 'down', 1], erasedvillage_x72_vendor: [40, 13, 'down', 0], erasedvillage_x72_elder: [37, 15, 'down', 0],
      erased_village_a73_0: [33, 9, 'down', 2], erased_village_a73_1: [17, 16, 'down', 2], erased_village_a73_2: [5, 13, 'down', 2], erased_village_a73_3: [42, 12, 'down', 1],
      u73_painter: [5, 10, 'down', 0], erased_village_bread76: [10, 12, 'down', 0]
    },
    events: [[34, 14, 30, 12]],
    chests: { ev1: [22, 15] }, points: { sp_erased_village_5_2: [13, 2], opt_027: [19, 3] },
    warps: [GX, GX + 1].map(function (x) { return { x: x, y: H - 1, to: 'world_kalion', tx: 42, ty: 46, name: '森へ' }; }),
    edgeExits: [{ side: 'top', range: [NX, NX + 1] }],
    anchors: [[11, 17, GX, 19], [12, 17, GX + 1, 19], [11, 18, GX, 20], [12, 18, GX + 1, 20]],
    after: function (def) {
      def.events.forEach(function (e) { if (e.x === 30 && e.y === 12) e.text = ['【東の焼け跡】', '空き地の東の小道の先。焼け残った壁と、空き家・崩れかけた塔。', '大きな木の広場から北の小道をたどると、森の出口。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'erasedvillage_x72_kid') n.talk = say('子ども', ['焼け跡の崩れかけた塔、てっぺんまで登ったことある？　地図から消えた村がぜんぶ見えるんだよ！', '上から見ても、森の木にかくれて、村はほとんど見えないんだって。']);
        if (n.id === 'erasedvillage_x72_elder') n.talk = say('町の古老', ['この焼け跡も、昔は畑だった。少しずつ人が戻って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('erased_village', 'v81_erased_view', { x: TX + 1, y: 1, z: 10, dist: 22, pitch: 42 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
