/* =========================================================
   Data / v8.1 娯楽都市ラックスベル（luxbell）：グランカジノを島のように囲む、楕円の「鈴の遊歩道」の町
   ・住む理由：グランカジノと、遊びに来る人を迎える宿・食堂・劇場
   ・入口から最初に見える物：南の門から、両わきに屋台と灯りの並ぶ短い大通り。その先に噴水、噴水の向こうに楕円の遊歩道に囲まれたグランカジノ
   ・道：大通り（門 → 噴水）→ 楕円の遊歩道（カジノのまわりを一周）。遊歩道の外側に店が並ぶ：
     北＝サイコロ職人の家・カジノ研究棟・踊り子の家・小さな劇場、西＝金の鈴亭・雑貨店、東＝食堂・古道具屋、南東の角に展望タワー
     遊歩道の内側はカジノの庭（花壇・腰かけ）
   ・前（v8.1 の最初）は横の通り 3 本と縦の大通りの格子だった。カジノを真ん中にした楕円の一周に変えた
   ・境界：生け垣（見せる境界）。出入りは南の門
   ・人・出来事・宝箱・調べる所はそのまま（位置だけ）
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 64, H = 40, RX = 30, CX = 31.5, CY = 18, AX = 17, AY = 10;   // 楕円の遊歩道（中心・半径）
  var ell = function (x, y) { const dx = (x + 0.5 - CX) / AX, dy = (y + 0.5 - CY) / AY; return Math.sqrt(dx * dx + dy * dy); };
  function rows(canvas) {
    var C = canvas(W, H, '=');
    C.frame(0, 0, W, H, 'f'); C.rect(RX, H - 1, 4, 1, 'P');
    for (var y = 1; y < H - 1; y++) for (var x = 1; x < W - 1; x++) { var e = ell(x, y); if (e < 0.86) C.set(x, y, ','); else if (e < 1.0) C.set(x, y, 'P'); }   // カジノの庭・遊歩道
    C.rect(RX, 27, 4, H - 28, 'r');   // 大通り
    C.rect(RX, 22, 4, 6, 'P'); C.rect(RX + 1, 24, 2, 2, 'Q');   // 噴水の前庭
    // 遊歩道から外の店への小道
    C.rect(1, 17, 15, 2, 'r'); C.rect(48, 17, W - 49, 2, 'r'); C.rect(17, 3, 2, 6, 'r'); C.rect(45, 3, 2, 6, 'r');
    // 遊歩道の灯り（楕円の外側に等間隔）と庭の花壇・腰かけ
    for (var k = 0; k < 20; k++) { var a = k / 20 * Math.PI * 2; var lx = Math.round(CX - 0.5 + Math.cos(a) * AX * 1.07), ly = Math.round(CY - 0.5 + Math.sin(a) * AY * 1.1); if (lx > 0 && ly > 0 && lx < W - 1 && ly < H - 1 && C.get(lx, ly) === '=') C.set(lx, ly, 'y'); }
    [[19, 12], [44, 12], [19, 24], [44, 24]].forEach(function (p) { C.rect(p[0], p[1], 2, 1, 'a'); }); [[21, 18], [42, 18], [26, 23], [37, 23]].forEach(function (p) { C.set(p[0], p[1], 'e'); });
    // 大通りの屋台
    [[RX - 2, 30], [RX - 2, 34], [RX + 5, 30], [RX + 5, 34]].forEach(function (p) { C.set(p[0], p[1], 'A'); });
    [[2, 2], [62, 2], [2, 37], [12, 37], [24, 37], [45, 30]].forEach(function (p) { C.set(p[0], p[1], '6'); });
    return C;
  }
  R.define('luxbell', {
    version: 2, rows: rows, arrive: [RX + 1, 37],
    buildings: {
      lx_casino: { x: 23, y: 13, w: 18, h: 8, doorX: 8 },
      a3_luxbell_dice: { x: 8, y: 4, w: 6, h: 4, doorX: 2 }, lx_labs: { x: 20, y: 2, w: 8, h: 5, doorX: 3 }, x72_house: { x: 36, y: 2, w: 7, h: 5, doorX: 3 }, x72_hall: { x: 49, y: 3, w: 8, h: 5, doorX: 3 },
      lx_inn: { x: 2, y: 10, w: 8, h: 5, doorX: 3 }, lx_item: { x: 2, y: 21, w: 8, h: 5, doorSide: 'right', doorY: 2 },
      lx_dining: { x: 54, y: 10, w: 8, h: 5, doorX: 3 }, x72_ex0: { x: 55, y: 21, w: 7, h: 5, doorSide: 'left', doorY: 2 },
      x72_tower: { x: 50, y: 31, w: 6, h: 6, doorX: 2 }, bread_stall76: { x: RX + 6, y: 31, w: 3, h: 2, doorX: 1 }
    },
    npcs: {
      lx_guide: [RX - 1, 37, 'right', 0], lx_exgambler: [20, 20, 'down', 1], lx_child: [43, 25, 'down', 1], lx_merchant: [12, 18, 'down', 1], aunt67_luxbell: [31, 10, 'down', 1],
      luxbell_x72_kid: [47, 9, 'down', 1], luxbell_x72_vendor: [51, 19, 'down', 0], luxbell_x72_elder: [58, 29, 'down', 0],
      luxbell_a73_0: [45, 29, 'down', 2], luxbell_a73_1: [33, 26, 'down', 2], luxbell_a73_2: [24, 35, 'down', 1], luxbell_a73_3: [6, 30, 'down', 2],
      u73_zero: [38, 35, 'down', 0], luxbell_bread76: [RX + 7, 31, 'down', 0]
    },
    events: [[21, 26, RX + 4, 37], [49, 13, 50, 15]],
    chests: { lx1: [61, 38] }, points: { opt_032: [13, 2], opt_034: [44, 21] },
    warps: [RX, RX + 1, RX + 2, RX + 3].map(function (x) { return { x: x, y: H - 1, to: 'world_kalion', tx: 96, ty: 81, name: '町の外へ' }; }),
    anchors: [[18, 28, RX, 38], [19, 28, RX + 1, 38], [20, 28, RX + 2, 38], [21, 28, RX + 3, 38], [18, 27, RX, 37], [19, 27, RX + 1, 37], [20, 27, RX + 2, 37], [21, 27, RX + 3, 37]],
    after: function (def) {
      def.waterSound81 = [{ x: RX + 1, y: 24, r: 6, v: 0.7 }];   // 噴水の水音（js/ui/ambient81.js）
      def.events.forEach(function (e) {
        if (e.x === RX + 4 && e.y === 37) e.text = ['案内板：「娯楽都市ラックスベル——噴水の先の楕円の遊歩道を、ぐるっと一周」', '「北：カジノ研究棟・踊り子の家・劇場　西：金の鈴亭・雑貨店　東：食堂・古道具屋」', '「南東の角：展望タワー」'];
        if (e.x === 50 && e.y === 15) e.text = ['【東の歓楽通り】', '遊歩道の東から外へ。食堂と古道具屋。北の小道の先に小さな劇場、南東に展望タワー。'];
      });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'luxbell_x72_kid') n.talk = say('子ども', ['南東の展望タワー、てっぺんまで登ったことある？　娯楽都市ラックスベルがぜんぶ見えるんだよ！', '上から見ると、遊歩道がカジノのまわりに大きな卵の形を描いてるんだって。']);
        if (n.id === 'luxbell_x72_elder') n.talk = say('町の古老', ['この東側も、昔はただの空き地だった。少しずつ店が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('luxbell', 'v81_luxbell_view', { x: 32, y: 2, z: 18, dist: 32, pitch: 44 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
