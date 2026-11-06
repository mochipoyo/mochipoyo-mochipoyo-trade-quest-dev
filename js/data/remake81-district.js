/* =========================================================
   Data / v8.1 第7居住区（scheduled_district）：同じ間隔の灯りと生け垣、時間割の掲示板の広場。一軒だけ列からはみ出した 9 号棟
   ・住む理由：演算都市が決めた予定どおりに暮らす居住区。起床・配給・移動の時刻が掲示板に貼られる
   ・入口から最初に見える物：北の門（演算都市の側。フィールドでは居住区の北から入る）から「朝の通り」。両側に同じ形のユニット、その先の広場の掲示板と噴水、等間隔の灯り
   ・道：朝の通り（門 → 北の通り → 時間割の広場 → 南の通り）。北の通りに居住ユニット 7-1・休息ユニット・配給ユニット・技師の家
     南の通りの東は工区（観測塔・整備工場）。西の端に、列からはみ出して花を植えた 9 号棟
   ・境界：城壁（防御型）。出入りは北の門（前は南の端に門があり、出るとフィールドでは居住区の北に出ていた。向きをそろえた）
   ・人・出来事・宝箱・調べる所はそのまま（位置だけ）。掲示板の出来事は広場の噴水の北
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 54, H = 26, GX = 26;
  function rows(canvas) {
    var C = canvas(W, H, '=');
    C.frame(0, 0, W, H, 'C'); C.rect(GX, 0, 2, 1, 'r');
    C.rect(1, 6, W - 2, 2, 'r'); C.rect(1, 19, W - 2, 2, 'r');   // 北の通り・南の通り
    C.rect(GX, 0, 2, 21, 'r');   // 朝の通り
    C.rect(17, 9, 16, 9, 'P');   // 時間割の広場
    C.rect(21, 13, 2, 2, 'Q'); C.set(31, 12, 'I');   // 噴水と時計の柱
    // 等間隔の灯りと生け垣（どこも同じ形）
    for (var x = 3; x < W - 2; x += 4) { if (x === GX || x === GX + 1) continue; C.set(x, 8, 'y'); C.set(x, 21, 'y'); }
    [[4, 1], [24, 1], [29, 1], [49, 1]].forEach(function (p) { C.set(p[0], p[1], 'f'); });
    // 9 号棟の小さな花壇（ここだけ列からはみ出している）
    C.rect(13, 15, 2, 2, 'a'); C.set(7, 14, 'a'); C.set(12, 13, 'a');
    // 工区の木箱
    [[42, 21], [43, 22], [50, 21], [32, 22]].forEach(function (p, i) { C.set(p[0], p[1], i % 2 ? 'q' : 'z'); });
    return C;
  }
  R.define('scheduled_district', {
    version: 1, rows: rows, arrive: [GX, 2],
    buildings: {
      h1: { x: 8, y: 2, w: 6, h: 4, doorX: 2 }, h2: { x: 16, y: 2, w: 6, h: 4, doorX: 2 }, h3: { x: 32, y: 2, w: 6, h: 4, doorX: 2 }, x72_house: { x: 40, y: 1, w: 7, h: 5, doorX: 3 },
      a3_district_9: { x: 8, y: 15, w: 4, h: 4, doorX: 1 }, x72_tower: { x: 35, y: 13, w: 6, h: 6, doorX: 2 }, x72_hall: { x: 43, y: 14, w: 8, h: 5, doorX: 3 }
    },
    npcs: {
      sd_man: [9, 9, 'down', 1], sd_woman: [30, 9, 'down', 1], sd_child: [16, 22, 'down', 2], aunt67_scheduled_district: [19, 16, 'down', 1],
      scheduleddistrict_x72_kid: [45, 22, 'down', 1], scheduleddistrict_x72_vendor: [46, 10, 'down', 0], scheduleddistrict_x72_elder: [50, 11, 'down', 0],
      scheduled_district_a73_0: [3, 17, 'down', 2], scheduled_district_a73_1: [20, 10, 'down', 2], scheduled_district_a73_2: [11, 23, 'down', 2], scheduled_district_a73_3: [23, 3, 'down', 1],
      u73_rei: [12, 17, 'down', 1]
    },
    events: [[12, 18, 21, 12], [33, 10, 34, 10]],
    chests: { sd1: [52, 24] }, points: { sp_scheduled_district_13_2: [21, 1] },
    warps: [GX, GX + 1].map(function (x) { return { x: x, y: 0, to: 'world_machine', tx: 42, ty: 84, name: '居住区の外へ' }; }),
    anchors: [[14, 22, GX, 1], [15, 22, GX + 1, 1], [14, 21, GX, 2], [15, 21, GX + 1, 2]],
    after: function (def) {
      def.events.forEach(function (e) { if (e.x === 34 && e.y === 10) e.text = ['【東の工区】', '南の通りの東に観測塔と整備工場。北の通りの東に技師の家。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'scheduleddistrict_x72_kid') n.talk = say('子ども', ['工区の観測塔、てっぺんまで登ったことある？　第7居住区がぜんぶ見えるんだよ！', '上から見ると、灯りがぜんぶ同じ間かくなのに、9 号棟だけずれてるんだって。']);
        if (n.id === 'scheduleddistrict_x72_elder') n.talk = say('町の古老', ['この工区も、昔はただの空き地だった。少しずつ工場が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('scheduled_district', 'v81_district_view', { x: GX + 1, y: 1, z: 12, dist: 24, pitch: 40 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
