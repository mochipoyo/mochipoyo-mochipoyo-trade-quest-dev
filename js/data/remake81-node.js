/* =========================================================
   Data / v8.1 演算都市ノード（node_city）：オラクル中枢を真ん中に、内と外の 2 重の環状路と 4 本の放射路で区切った都市
   ・住む理由：オラクル中枢が人の暮らしを計算する。配給・居住・登録が、中枢からの距離ごとに決まった区画に並ぶ
   ・入口から最初に見える物：南の門から、光る配線の走る白い南の放射路。その先、外の環と内の環をくぐった真ん中にオラクル中枢
   ・道：南の放射路（門 → 外の環 → 内の環 → 中枢）。外と内の環のあいだの 4 つの角に、登録所・学校（北）・配給所・装備配給所（西）・
     休息区画・居住ユニット（東）。南に識別票のない家と、改革のあとに開く自由市場。北の環のあいだは計算機の列（演算の畑）
     東の放射路は外の環の外へ抜けて工区（観測塔・技師の家・整備工場・学者の家・花屋）
   ・前（v8.1 の最初）は横の通り 3 本の格子だった（第7居住区と同じ骨組み）。中枢を中心にした同心の環に変えた
   ・境界：城壁（防御型）。出入りは南の門
   ・人（監視ドローン・改革のあとに出る人）・出来事・宝箱・調べる所はそのまま（位置だけ）
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 74, H = 40, RX = 28;   // RX：南の放射路と門（28〜31）
  var OR = [6, 4, 53, 35], IR = [21, 11, 38, 24];   // 外の環・内の環（x0, y0, x1, y1。幅 2）
  function ring(C, r, c) { C.rect(r[0], r[1], r[2] - r[0] + 1, 2, c); C.rect(r[0], r[3] - 1, r[2] - r[0] + 1, 2, c); C.rect(r[0], r[1], 2, r[3] - r[1] + 1, c); C.rect(r[2] - 1, r[1], 2, r[3] - r[1] + 1, c); }
  function rows(canvas) {
    var C = canvas(W, H, '=');
    C.frame(0, 0, W, H, 'C'); C.rect(RX, H - 1, 4, 1, ':');
    ring(C, OR, ':'); ring(C, IR, ':');
    C.rect(RX, IR[3] + 1, 4, H - IR[3] - 2, ':');   // 南の放射路
    C.rect(29, OR[1] + 2, 2, IR[1] - OR[1] - 2, ':');   // 北の放射路
    C.rect(1, 17, IR[0] - 1, 2, ':'); C.rect(IR[2] + 1, 17, W - IR[2] - 2, 2, ':');   // 西・東の放射路（東は工区へ抜ける）
    // 光る配線：環の真ん中の線と放射路
    C.path([[OR[0] + 1, OR[1] + 1], [OR[2] - 1, OR[1] + 1], [OR[2] - 1, OR[3] - 1], [OR[0] + 1, OR[3] - 1], [OR[0] + 1, OR[1] + 1]], '-');
    C.path([[IR[0] + 1, IR[1] + 1], [IR[2] - 1, IR[1] + 1], [IR[2] - 1, IR[3] - 1], [IR[0] + 1, IR[3] - 1], [IR[0] + 1, IR[1] + 1]], '-');
    C.path([[RX + 1, IR[3]], [RX + 1, H - 2]], '-'); C.path([[1, 17], [IR[0], 17]], '-'); C.path([[IR[2], 18], [W - 2, 18]], '-');
    // 北の環のあいだ：計算機の列（演算の畑）
    for (var y = 7; y <= 9; y += 2) for (var x = 22; x <= 37; x += 2) if (x < 28 || x > 31) C.set(x, y, '?');
    // 内の環の 4 隅の計算機
    [[23, 13], [36, 13], [23, 22], [36, 22]].forEach(function (p) { C.set(p[0], p[1], '?'); });
    [[RX - 1, 27], [RX + 4, 27], [RX - 1, 31], [RX + 4, 31], [IR[0] - 1, 15], [IR[2] + 1, 15]].forEach(function (p) { C.set(p[0], p[1], 'y'); });
    [[2, 3], [2, 30], [55, 37], [72, 15], [44, 37]].forEach(function (p) { C.set(p[0], p[1], '6'); });
    [[69, 34], [70, 35], [57, 34]].forEach(function (p) { C.set(p[0], p[1], 'a'); });
    return C;
  }
  R.define('node_city', {
    version: 2, rows: rows, arrive: [RX + 1, 37],
    buildings: {
      core: { x: 25, y: 15, w: 10, h: 6, doorX: 4 },
      registry: { x: 10, y: 7, w: 8, h: 5, doorX: 3 }, school: { x: 41, y: 7, w: 8, h: 5, doorX: 3 },
      ration: { x: 10, y: 21, w: 8, h: 5, doorX: 3 }, armor: { x: 10, y: 28, w: 8, h: 5, doorX: 3 },
      inn: { x: 41, y: 21, w: 8, h: 5, doorX: 3 }, house: { x: 41, y: 28, w: 8, h: 5, doorX: 3 },
      a3_node_family: { x: 22, y: 27, w: 4, h: 4, doorX: 1 }, market: { x: 33, y: 27, w: 8, h: 5, doorX: 3 },
      x72_tower: { x: 56, y: 7, w: 6, h: 6, doorX: 2 }, x72_house: { x: 64, y: 8, w: 7, h: 5, doorX: 3 },
      x72_hall: { x: 56, y: 22, w: 8, h: 5, doorX: 3 }, x72_ex0: { x: 65, y: 22, w: 7, h: 5, doorX: 3 }, x72_ex1: { x: 60, y: 29, w: 7, h: 5, doorX: 3 }
    },
    npcs: {
      nc_drone: [RX + 1, 22, 'down', 2], nc_resident: [24, 33, 'down', 1], nc_defender: [15, 19, 'down', 1], nc_noa: [12, 13, 'down', 0],
      nc_free1: [32, 34, 'down', 2], nc_job2: [44, 19, 'down', 0], nc_job3: [16, 27, 'down', 1], aunt67_node_city: [25, 4, 'down', 1], s3121_nc_robot: [36, 15, 'down', 0],
      nodecity_x72_kid: [60, 19, 'down', 1], nodecity_x72_vendor: [66, 15, 'down', 0], nodecity_x72_elder: [70, 19, 'down', 0],
      node_city_a73_0: [46, 17, 'down', 2], node_city_a73_1: [19, 30, 'down', 2], node_city_a73_2: [48, 33, 'down', 2], node_city_a73_3: [11, 19, 'down', 1],
      u73_bit: [70, 30, 'down', 0], tmaster_raizen: [23, 18, 'down', 0]
    },
    events: [[14, 9, 27, 22], [52, 13, 55, 16]],
    chests: { nc1: [72, 38] }, points: { sp_node_city_35_21: [36, 30], opt_060: [16, 2] },
    warps: [RX, RX + 1, RX + 2, RX + 3].map(function (x) { return { x: x, y: H - 1, to: 'world_machine', tx: 82, ty: 60, name: '都市の外へ' }; }),
    anchors: [[18, 27, RX, 37], [19, 27, RX + 1, 37], [20, 27, RX + 2, 37], [21, 27, RX + 3, 37], [18, 28, RX, 38], [19, 28, RX + 1, 38], [20, 28, RX + 2, 38], [21, 28, RX + 3, 38]],
    after: function (def) {
      def.events.forEach(function (e) { if (e.x === 55 && e.y === 16) e.text = ['【東の工区】', '東の放射路を外の環の外へ。観測塔・技師の家・整備工場・学者の家・花屋。', '中枢から遠いほど、区画の決まりがゆるい。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'nodecity_x72_kid') n.talk = say('子ども', ['工区の観測塔、てっぺんまで登ったことある？　演算都市ノードがぜんぶ見えるんだよ！', '上から見ると、中枢のまわりに四角い輪が 2 つ、的みたいに重なってるんだって。']);
        if (n.id === 'nodecity_x72_elder') n.talk = say('町の古老', ['この工区も、昔はただの空き地だった。少しずつ工場が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('node_city', 'v81_node_view', { x: 30, y: 2, z: 19, dist: 32, pitch: 44 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
