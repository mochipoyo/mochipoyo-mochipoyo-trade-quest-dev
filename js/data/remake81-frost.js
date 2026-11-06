/* =========================================================
   Data / v8.1 記憶を売る町フロスト（frost_town）：風よけの林に囲まれ、曲がった雪道が凍った噴水と記憶市場へ続く町
   ・住む理由：記憶を買い取る記憶市場と、売られた記憶をしまう記憶庫。寒さをしのぐ暖炉の集会所
   ・入口から最初に見える物：南の門から、風を受けないように曲がった雪道。その先に凍った噴水の広場と、北の記憶市場
   ・道：曲がった雪道（門 → 南の通り → 凍った噴水の広場 → 記憶市場）。北の通りに宿・道具屋・集会所・漁師の家
     中の通りに武器屋・防具屋と「記憶を売らなかった家」。南の通りに記憶庫とリクの家。東の「雪見通り」に学者の家・見張り塔・凍った池
   ・境界：風よけの林（自然の境界）。出入りは南の門
   ・人・出来事・宝箱・調べる所はそのまま（位置だけ）。凍った噴水の出来事は噴水のまま
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 62, H = 32, GX = 29, FX = 24, FY = 11;
  function rows(canvas) {
    var C = canvas(W, H, 'n');
    C.frame(0, 0, W, H, 'f'); C.rect(GX, H - 1, 2, 1, 'P');
    C.rect(1, 7, W - 2, 2, 'r'); C.rect(1, 17, W - 2, 2, 'r'); C.rect(1, 27, W - 2, 2, 'r');   // 北の通り・中の通り・南の通り
    C.path([[GX, H - 2], [GX, 24], [FX + 1, 20], [FX + 1, 16]], 'P', 2);   // 曲がった雪道
    for (var y = 8; y < 17; y++) for (var x = 18; x < 32; x++) { var d = Math.sqrt((x - FX - 0.5) * (x - FX - 0.5) + (y - FY - 0.5) * (y - FY - 0.5)); if (d < 4.4) C.set(x, y, 'P'); }
    C.rect(FX, FY, 2, 2, 'Q');   // 凍った噴水
    C.rect(42, 9, 2, 18, 'r');   // 東の雪見通り
    for (var py = 18; py < 27; py++) for (var px = 50; px < 61; px++) { var dx = (px - 55.5) / 4.4, dy = (py - 22) / 3.4; if (dx * dx + dy * dy < 1) C.set(px, py, 'w'); }   // 凍った池
    [[24, 21], [27, 21], [20, 9], [29, 9], [20, 15], [29, 15], [41, 12], [44, 24]].forEach(function (p) { C.set(p[0], p[1], 'y'); });   // 雪灯り
    // 風よけの林と雪の木
    [[2, 10], [19, 3], [32, 1], [51, 12], [60, 14], [51, 25], [60, 26], [12, 21], [24, 24], [36, 30], [10, 30]].forEach(function (p) { C.set(p[0], p[1], 'f'); });
    C.set(15, 25, 'e'); C.set(36, 10, 'e');
    return C;
  }
  R.define('frost_town', {
    version: 1, rows: rows, arrive: [GX, 29],
    buildings: {
      inn: { x: 3, y: 2, w: 8, h: 5, doorX: 3 }, market: { x: 20, y: 1, w: 10, h: 6, doorX: 4 }, item: { x: 33, y: 2, w: 8, h: 5, doorX: 3 },
      x72_hall: { x: 44, y: 2, w: 8, h: 5, doorX: 3 }, x72_house: { x: 53, y: 2, w: 7, h: 5, doorX: 3 },
      weapon: { x: 3, y: 12, w: 8, h: 5, doorX: 3 }, a3_frost_keeper: { x: 12, y: 13, w: 6, h: 4, doorX: 2 }, bread_stall76: { x: 30, y: 13, w: 3, h: 2, doorX: 1 },
      armor: { x: 33, y: 12, w: 8, h: 5, doorX: 3 }, x72_ex0: { x: 45, y: 12, w: 7, h: 5, doorX: 3 },
      vault: { x: 3, y: 22, w: 8, h: 5, doorX: 3 }, house: { x: 33, y: 22, w: 8, h: 5, doorX: 3 }, x72_tower: { x: 45, y: 21, w: 6, h: 6, doorX: 2 }
    },
    npcs: {
      fr_riku: [28, 16, 'down', 0], fr_yoan: [15, 24, 'down', 1], fr_elder: [11, 9, 'down', 0], fr_gate: [GX - 1, 29, 'right', 0], aunt67_frost_town: [21, 10, 'down', 1],
      frosttown_x72_kid: [50, 19, 'down', 1], frosttown_x72_vendor: [56, 10, 'down', 0], frosttown_x72_elder: [53, 14, 'down', 0],
      frost_town_a73_0: [37, 10, 'down', 2], frost_town_a73_1: [18, 20, 'down', 2], frost_town_a73_2: [40, 30, 'down', 1], frost_town_a73_3: [20, 30, 'down', 1], frost_town_a73_4: [31, 4, 'down', 1],
      u73_yuki: [7, 10, 'down', 1], frost_town_bread76: [31, 13, 'down', 0]
    },
    events: [[20, 15, FX, FY], [51, 16, 41, 10]],
    chests: { ft_c1: [60, 1] }, points: { sp_frost_town_3_12: [2, 11] },
    warps: [GX, GX + 1].map(function (x) { return { x: x, y: H - 1, to: 'world_snow', tx: 82, ty: 55, name: '雪原へ' }; }),
    anchors: [[19, 28, GX, 29], [20, 28, GX + 1, 29], [19, 27, GX, 28], [20, 27, GX + 1, 28]],
    after: function (def) {
      def.events.forEach(function (e) { if (e.x === 41 && e.y === 10) e.text = ['【東の雪見通り】', '北の通りに暖炉の集会所と漁師の家。雪見通りに学者の家と氷の見張り塔、その東に凍った池。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'frosttown_x72_kid') n.talk = say('子ども', ['雪見通りの見張り塔、てっぺんまで登ったことある？　記憶を売る町フロストがぜんぶ見えるんだよ！', '雪道がくねくねしてるのは、風が町に入ってこないようにだって。']);
        if (n.id === 'frosttown_x72_elder') n.talk = say('町の古老', ['この雪見通りも、昔はただの空き地だった。少しずつ家が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('frost_town', 'v81_frost_view', { x: FX + 1, y: 3, z: 15, dist: 28, pitch: 36 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
