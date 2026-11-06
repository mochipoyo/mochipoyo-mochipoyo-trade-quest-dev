/* =========================================================
   Data / v8.1 演算都市ノード（node_city）：すべてが格子に並び、計算機の列が中枢へ続く都市
   ・住む理由：オラクル中枢が人の暮らしを計算する。配給・居住・登録が決まった区画に並ぶ
   ・入口から最初に見える物：南の門から白い基板のような通り。両わきに計算機の列が北へ並び、突き当たりにオラクル中枢
   ・道：中枢通り（門 → 3 本の横の通り → 中枢）。横の通りの両側に同じ形の区画（登録所・学校・配給所・休息区画・居住ユニット・装備配給所）
     東は工区（観測塔・技師の家・整備工場・学者の家・花屋）。南の通りのいちばん東の行き止まりに、識別票のない家
   ・境界：城壁（防御型）。出入りは南の門
   ・改革のあとに開く自由市場は、南の通りの東（工区の手前）
   ・人（監視ドローン・改革のあとに出る人）・出来事・宝箱・調べる所はそのまま（位置だけ）
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 64, H = 32, RX = 30;
  function rows(canvas) {
    var C = canvas(W, H, '=');
    C.frame(0, 0, W, H, 'C'); C.rect(RX, H - 1, 4, 1, ':');
    [7, 17, 27].forEach(function (y) { C.rect(1, y, W - 2, 2, ':'); });   // 横の通り（白い基板の床）
    C.rect(RX, 7, 4, H - 8, ':'); C.rect(25, 7, 2, 21, ':'); C.rect(37, 7, 2, 21, ':');   // 中枢通りと縦の小路
    [10, 12, 14, 21, 23, 25].forEach(function (y) { C.set(RX - 1, y, '?'); C.set(RX + 4, y, '?'); });   // 計算機の列
    C.set(RX - 1, 16, '?');   // 電光掲示
    C.path([[RX + 1, 9], [RX + 1, H - 2]], '-'); C.path([[RX + 2, 9], [RX + 2, H - 2]], '-'); [8, 18, 28].forEach(function (y) { C.path([[2, y], [W - 3, y]], '-'); });   // 光る配線（基板の線）
    // 東の工区の行き止まり（識別票のない家の前の小さな花）
    [[57, 26], [62, 21], [56, 21]].forEach(function (p) { C.set(p[0], p[1], 'a'); });
    [[2, 13], [61, 13], [2, 29], [45, 29], [12, 3]].forEach(function (p) { C.set(p[0], p[1], '6'); });
    return C;
  }
  R.define('node_city', {
    version: 1, rows: rows, arrive: [RX + 1, 29],
    buildings: {
      registry: { x: 3, y: 2, w: 8, h: 5, doorX: 3 }, school: { x: 15, y: 2, w: 8, h: 5, doorX: 3 }, core: { x: 27, y: 1, w: 10, h: 6, doorX: 4 },
      x72_tower: { x: 41, y: 1, w: 6, h: 6, doorX: 2 }, x72_house: { x: 50, y: 2, w: 7, h: 5, doorX: 3 },
      ration: { x: 3, y: 12, w: 8, h: 5, doorX: 3 }, inn: { x: 15, y: 12, w: 8, h: 5, doorX: 3 }, x72_hall: { x: 41, y: 12, w: 8, h: 5, doorX: 3 }, armor: { x: 53, y: 12, w: 8, h: 5, doorX: 3 },
      house: { x: 3, y: 22, w: 8, h: 5, doorX: 3 }, x72_ex0: { x: 15, y: 22, w: 7, h: 5, doorX: 3 }, x72_ex1: { x: 41, y: 22, w: 7, h: 5, doorX: 3 }, market: { x: 49, y: 22, w: 8, h: 5, doorX: 3 }, a3_node_family: { x: 58, y: 22, w: 4, h: 4, doorX: 1 }
    },
    npcs: {
      nc_drone: [31, 15, 'down', 2], nc_resident: [24, 9, 'down', 1], nc_defender: [12, 19, 'down', 1], nc_noa: [8, 9, 'down', 0],
      nc_free1: [27, 24, 'down', 2], nc_job2: [36, 19, 'down', 0], nc_job3: [13, 24, 'down', 1], aunt67_node_city: [20, 10, 'down', 1], s3121_nc_robot: [27, 14, 'down', 0],
      nodecity_x72_kid: [52, 19, 'down', 1], nodecity_x72_vendor: [48, 9, 'down', 0], nodecity_x72_elder: [45, 19, 'down', 0],
      node_city_a73_0: [36, 10, 'down', 2], node_city_a73_1: [36, 20, 'down', 2], node_city_a73_2: [41, 20, 'down', 2], node_city_a73_3: [8, 20, 'down', 1],
      u73_bit: [60, 19, 'down', 0], tmaster_raizen: [21, 19, 'down', 0]
    },
    events: [[14, 9, RX - 1, 16], [52, 13, 46, 9]],
    chests: { nc1: [61, 29] }, points: { sp_node_city_35_21: [36, 22], opt_060: [13, 1] },
    warps: [RX, RX + 1, RX + 2, RX + 3].map(function (x) { return { x: x, y: H - 1, to: 'world_machine', tx: 82, ty: 60, name: '都市の外へ' }; }),
    anchors: [[18, 27, RX, 29], [19, 27, RX + 1, 29], [20, 27, RX + 2, 29], [21, 27, RX + 3, 29], [18, 28, RX, 30], [19, 28, RX + 1, 30], [20, 28, RX + 2, 30], [21, 28, RX + 3, 30]],
    after: function (def) {
      def.events.forEach(function (e) { if (e.x === 46 && e.y === 9) e.text = ['【東の工区】', '観測塔・技師の家・整備工場・学者の家・花屋。', '南の通りのいちばん東の行き止まりにも、一軒。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'nodecity_x72_kid') n.talk = say('子ども', ['工区の観測塔、てっぺんまで登ったことある？　演算都市ノードがぜんぶ見えるんだよ！', '上から見ると、町ぜんぶが方眼紙みたいなんだって。']);
        if (n.id === 'nodecity_x72_elder') n.talk = say('町の古老', ['この工区も、昔はただの空き地だった。少しずつ工場が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('node_city', 'v81_node_view', { x: RX + 2, y: 3, z: 15, dist: 30, pitch: 38 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
