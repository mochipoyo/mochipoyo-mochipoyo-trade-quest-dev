/* =========================================================
   Data / v8.1 記憶を売る町フロスト（frost_town）：家々が馬蹄（U の字）に並んで風を防ぎ、南だけ開いた中庭に凍った噴水のある町
   ・住む理由：記憶を買い取る記憶市場と、売られた記憶をしまう記憶庫。寒さをしのぐ暖炉の集会所
   ・入口から最初に見える物：南の門から、風よけの林のあいだを曲がる雪道。その先に、三方を家に囲まれた中庭と凍った噴水、奥の正面に記憶市場
   ・道：曲がった雪道（門 → 中庭 → 凍った噴水 → 記憶市場）。中庭を囲む「馬蹄の回廊」（北・西・東の 3 辺。南は開いている）の外側に家が並ぶ：
     北＝宿・記憶市場・道具屋、西＝武器屋・「記憶を売らなかった家」・記憶庫（扉は中庭向き）、東＝防具屋・リクの家・学者の家（扉は中庭向き）
     北の回廊は東へのびて「雪見通り」（見張り塔・暖炉の集会所・漁師の家・凍った池）
   ・前（v8.1 の最初）は横の通り 3 本（第7居住区などと同じ骨組み）だった。風よけに家が中庭を囲む馬蹄の形に変えた
   ・境界：風よけの林（自然の境界）。出入りは南の門
   ・人・出来事・宝箱・調べる所はそのまま（位置だけ）。凍った噴水の出来事は噴水のまま
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 66, H = 36, GX = 29, FX = 29, FY = 19;   // GX：門（29〜30）・FX, FY：凍った噴水（2×2）
  var CX = 30, CY = 20, AX = 10, AY = 6.5;   // 中庭の広場（楕円）
  function rows(canvas) {
    var C = canvas(W, H, 'n');
    C.frame(0, 0, W, H, 'f'); C.rect(GX, H - 1, 2, 1, 'P');
    // 馬蹄の回廊（北・西・東。南は開いている）と、北の回廊から東の雪見通りへ
    C.rect(14, 10, 44, 2, 'r'); C.rect(14, 10, 2, 20, 'r'); C.rect(44, 10, 2, 20, 'r');
    C.rect(56, 3, 2, 28, 'r');   // 雪見通り
    // 中庭の広場と凍った噴水
    for (var y = 12; y < 30; y++) for (var x = 16; x < 44; x++) { var dx = (x + 0.5 - CX) / AX, dy = (y + 0.5 - CY) / AY; if (dx * dx + dy * dy < 1) C.set(x, y, 'P'); }
    C.rect(FX, FY, 2, 2, 'Q');
    // 曲がった雪道（門 → 林のあいだで一度折れて → 中庭）
    C.path([[GX, H - 2], [GX, 31], [GX - 4, 31], [GX - 4, 28], [GX, 28], [GX, 26]], 'P', 2);
    // 凍った池（雪見通りの南）
    for (var py = 24; py < 32; py++) for (var px = 58; px < 65; px++) { var ex = (px + 0.5 - 61.5) / 3.6, ey = (py + 0.5 - 28) / 3.4; if (ex * ex + ey * ey < 1) C.set(px, py, 'w'); }
    // 雪灯り（中庭のまわり・回廊の角・雪見通り）
    [[21, 15], [38, 15], [21, 25], [38, 25], [16, 12], [43, 12], [55, 9], [58, 18], [GX - 1, 33], [GX + 2, 33]].forEach(function (p) { C.set(p[0], p[1], 'y'); });
    // 風よけの林：南の雪道の両わき（道の折れた内側にも）と、中庭の南の角、北の家の裏
    [[18, 31], [20, 33], [22, 32], [24, 34], [33, 32], [35, 34], [37, 31], [39, 33], [41, 32], [28, 33], [31, 30], [23, 29], [17, 28], [42, 28],
      [3, 2], [6, 1], [12, 2], [26, 1], [40, 1], [50, 2], [2, 18], [2, 30], [10, 33], [50, 33], [62, 20], [53, 31]].forEach(function (p) { if (C.get(p[0], p[1]) === 'n') C.set(p[0], p[1], 'f'); });
    // 中庭の腰かけ
    [[24, 18], [35, 18], [26, 23], [33, 23]].forEach(function (p) { C.set(p[0], p[1], 'e'); });
    return C;
  }
  R.define('frost_town', {
    version: 2, rows: rows, arrive: [GX, 33],
    buildings: {
      inn: { x: 16, y: 5, w: 8, h: 5, doorX: 3 }, market: { x: 25, y: 4, w: 10, h: 6, doorX: 4 }, item: { x: 36, y: 5, w: 8, h: 5, doorX: 3 },
      weapon: { x: 6, y: 12, w: 8, h: 5, doorSide: 'right', doorY: 2 }, a3_frost_keeper: { x: 8, y: 18, w: 6, h: 4, doorSide: 'right', doorY: 2 }, vault: { x: 6, y: 23, w: 8, h: 5, doorSide: 'right', doorY: 2 },
      armor: { x: 46, y: 12, w: 8, h: 5, doorSide: 'left', doorY: 2 }, house: { x: 46, y: 18, w: 8, h: 5, doorSide: 'left', doorY: 2 }, x72_ex0: { x: 46, y: 24, w: 7, h: 5, doorSide: 'left', doorY: 2 },
      x72_tower: { x: 58, y: 3, w: 6, h: 6, doorSide: 'left', doorY: 4 }, x72_hall: { x: 58, y: 11, w: 7, h: 5, doorSide: 'left', doorY: 2 }, x72_house: { x: 58, y: 17, w: 7, h: 5, doorSide: 'left', doorY: 2 },
      bread_stall76: { x: 36, y: 22, w: 3, h: 2, doorX: 1 }
    },
    npcs: {
      fr_riku: [32, 16, 'down', 0], fr_yoan: [17, 26, 'down', 1], fr_elder: [18, 13, 'down', 0], fr_gate: [GX - 1, 34, 'right', 0], aunt67_frost_town: [24, 13, 'down', 1],
      frosttown_x72_kid: [55, 26, 'down', 1], frosttown_x72_vendor: [61, 9, 'down', 0], frosttown_x72_elder: [54, 18, 'down', 0],
      frost_town_a73_0: [36, 13, 'down', 2], frost_town_a73_1: [20, 21, 'down', 2], frost_town_a73_2: [44, 32, 'down', 1], frost_town_a73_3: [14, 31, 'down', 1], frost_town_a73_4: [11, 8, 'down', 1],
      u73_yuki: [3, 10, 'down', 1], frost_town_bread76: [37, 22, 'down', 0]
    },
    events: [[20, 15, FX, FY], [51, 16, 55, 12]],
    chests: { ft_c1: [63, 33] }, points: { sp_frost_town_3_12: [3, 14] },
    warps: [GX, GX + 1].map(function (x) { return { x: x, y: H - 1, to: 'world_snow', tx: 82, ty: 55, name: '雪原へ' }; }),
    anchors: [[19, 28, GX, 34], [20, 28, GX + 1, 34], [19, 27, GX, 33], [20, 27, GX + 1, 33]],
    after: function (def) {
      def.events.forEach(function (e) { if (e.x === 55 && e.y === 12) e.text = ['【東の雪見通り】', '北の回廊の東のはし。見張り塔・暖炉の集会所・漁師の家、その南に凍った池。', '町の家は中庭を U の字に囲んで、北と西と東の風をふせいでいる。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'frosttown_x72_kid') n.talk = say('子ども', ['雪見通りの見張り塔、てっぺんまで登ったことある？　記憶を売る町フロストがぜんぶ見えるんだよ！', '上から見ると、家が中庭を馬のひづめみたいに囲んでるの。南だけ開いてて、お日さまが入るんだって。']);
        if (n.id === 'frosttown_x72_elder') n.talk = say('町の古老', ['この雪見通りも、昔はただの空き地だった。少しずつ家が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('frost_town', 'v81_frost_view', { x: FX + 1, y: 3, z: FY + 1, dist: 30, pitch: 40 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
