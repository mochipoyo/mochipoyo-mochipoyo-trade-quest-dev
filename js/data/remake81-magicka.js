/* =========================================================
   Data / v8.1 魔導都マクディア（magicka_city）：王宮から光る「魔導の筋」が広がる都
   ・住む理由：魔導王宮と王立学院。地面に走る魔導の筋（光る真鍮の線）と、都を横切る魔導の運河
   ・入口から最初に見える物：南の門をくぐると、床の光る筋が北へまっすぐ延び、運河の橋の先の広場で宙に止まる噴水、その奥に王宮
   ・道：星の道（門 → 運河の橋 → 噴水の広場 → 王宮）。広場から北西の筋は学院と職人の家へ、北東の筋は教会・魔導士の家・魔導の塔へ
     運河の南は店の通り（武具・魔導具・酒場・防具・宿・仕立て屋）
   ・境界：城壁（防御型）。出入りは南の門
   ・人・出来事・宝箱・調べる所はそのまま（位置だけ）。広場の魔導噴水の出来事もそのまま
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 66, H = 36, RX = 31, CX = 32, CY = 18;
  function rows(canvas) {
    var C = canvas(W, H, '=');
    C.frame(0, 0, W, H, 'C'); C.rect(RX, H - 1, 4, 1, 'P');
    C.rect(1, 7, W - 2, 2, 'r'); C.rect(1, 30, W - 2, 2, 'r');   // 北の通り・南の店の通り
    C.rect(RX, 9, 4, H - 10, 'P');   // 星の道
    for (var y = 12; y < 25; y++) for (var x = 24; x < 41; x++) { var d = Math.sqrt((x - CX - 0.5) * (x - CX - 0.5) + (y - CY - 0.5) * (y - CY - 0.5)); if (d < 4.8) C.set(x, y, 'P'); }
    C.path([[RX - 2, 15], [13, 9]], 'r', 2); C.path([[RX + 6, 15], [52, 9]], 'r', 2);   // 北西・北東の筋の道
    C.path([[CX, 9], [CX, H - 2]], '-'); C.path([[RX - 2, 15], [13, 9]], '-'); C.path([[RX + 6, 15], [52, 9]], '-');   // 光る魔導の筋
    C.rect(CX, CY, 2, 2, 'Q');   // 宙に止まる噴水
    C.rect(1, 24, W - 2, 1, '~'); C.rect(RX, 24, 4, 1, 'b'); C.rect(12, 24, 2, 1, 'b'); C.rect(52, 24, 2, 1, 'b');   // 魔導の運河と橋
    [[RX - 1, 11], [RX + 4, 11], [RX - 1, 27], [RX + 4, 27], [RX - 1, 33], [RX + 4, 33]].forEach(function (p) { C.set(p[0], p[1], 'y'); });
    [[2, 17], [24, 10], [44, 21], [63, 20], [2, 33], [63, 33], [22, 21]].forEach(function (p) { C.set(p[0], p[1], '6'); }); [[26, 22], [38, 14], [27, 14]].forEach(function (p) { C.set(p[0], p[1], 'a'); });
    return C;
  }
  R.define('magicka_city', {
    version: 1, rows: rows, arrive: [CX, 32],
    buildings: {
      academy: { x: 4, y: 2, w: 10, h: 5, doorX: 4 }, a3_magicka_crafter: { x: 16, y: 3, w: 5, h: 4, doorX: 2 }, palace: { x: 28, y: 1, w: 10, h: 6, doorX: 4 },
      church: { x: 44, y: 2, w: 10, h: 5, doorX: 4 }, x72_house: { x: 56, y: 2, w: 7, h: 5, doorX: 3 },
      x72_hall: { x: 3, y: 11, w: 8, h: 5, doorX: 3 }, x72_tower: { x: 57, y: 11, w: 6, h: 6, doorX: 2 }, bread_stall76: { x: 38, y: 21, w: 3, h: 2, doorX: 1 },
      weapon: { x: 2, y: 25, w: 8, h: 5, doorX: 3 }, item: { x: 12, y: 25, w: 8, h: 5, doorX: 3 }, tavern: { x: 20, y: 25, w: 10, h: 5, doorX: 4 },
      armor: { x: 36, y: 25, w: 8, h: 5, doorX: 3 }, inn: { x: 46, y: 25, w: 8, h: 5, doorX: 3 }, x72_ex0: { x: 56, y: 25, w: 7, h: 5, doorX: 3 }
    },
    npcs: {
      mc_gate: [29, 33, 'right', 0], mc_student: [10, 9, 'down', 1], mc_merchant: [36, 20, 'down', 1], mc_old: [40, 33, 'down', 0], aunt67_magicka_city: [27, 19, 'down', 1], s3121_mc_visitor: [29, 21, 'down', 0],
      magickacity_x72_kid: [55, 18, 'down', 1], magickacity_x72_vendor: [54, 15, 'down', 0], magickacity_x72_elder: [50, 19, 'down', 0],
      magicka_city_a73_0: [57, 33, 'down', 2], magicka_city_a73_1: [15, 9, 'down', 2], magicka_city_a73_2: [45, 9, 'down', 2], magicka_city_a73_3: [25, 9, 'down', 2], magicka_city_a73_4: [18, 20, 'down', 1], magicka_city_a73_5: [26, 33, 'down', 2],
      u73_fizz: [4, 33, 'down', 1], tmaster_arzen: [44, 33, 'down', 0], magicka_city_bread76: [39, 21, 'down', 0]
    },
    events: [[21, 14, CX, CY], [52, 14, 47, 16]],
    chests: { mc1: [63, 34] }, points: { sp_magicka_city_19_21: [19, 21], sp_magicka_city_9_12: [13, 13], opt_072: [4, 20] },
    warps: [RX, RX + 1, RX + 2, RX + 3].map(function (x) { return { x: x, y: H - 1, to: 'world_magicka', tx: 80, ty: 60, name: '都の外へ' }; }),
    anchors: [[20, 29, RX, 32], [21, 29, RX + 1, 32], [22, 29, RX + 2, 32], [23, 29, RX + 3, 32], [20, 30, RX, 33], [21, 30, RX + 1, 33], [22, 30, RX + 2, 33], [23, 30, RX + 3, 33]],
    after: function (def) {
      def.events.forEach(function (e) { if (e.x === 47 && e.y === 16) e.text = ['【北東の魔導の筋】', '広場から北東へ光る筋をたどると、魔導教会・魔導士の家・魔導の塔。', '北西の筋は王立学院と魔導具職人の家、書庫へ。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'magickacity_x72_kid') n.talk = say('子ども', ['北東の魔導の塔、てっぺんまで登ったことある？　魔導都マクディアがぜんぶ見えるんだよ！', '光る筋が、ぜんぶ王宮へ集まってるのが見えるんだって。']);
        if (n.id === 'magickacity_x72_elder') n.talk = say('町の古老', ['この北東の筋のあたりも、昔はただの空き地だった。少しずつ家が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('magicka_city', 'v81_magicka_view', { x: CX + 1, y: 3, z: 15, dist: 30, pitch: 36 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
