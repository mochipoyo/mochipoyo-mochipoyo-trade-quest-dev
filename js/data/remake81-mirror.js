/* =========================================================
   Data / v8.1 鏡の市場（mirror_market）：泉を真ん中に、屋台が左右対称の輪に並ぶ砂漠の市
   ・住む理由：砂漠の隊商が水をくむ泉。水を求めて人が集まり、市ができた。泉の水面に、屋台が逆さに映る
   ・入口から最初に見える物：南の門から、屋台の並ぶ短い通り。その先に泉の広場と、左右対称に並ぶ屋台の輪
   ・道：市の通り（門 → 泉の広場）。広場を東西に横切る隊商の道。西に両替商の家とらくだの囲い、東の「隊商宿通り」に物見やぐらと隊商の家
   ・境界：日干し煉瓦の壁（防御型）。出入りは南の門
   ・人（香辛料・塩・絹の商人ほか）・出来事・宝箱・調べる所はそのまま（位置だけ）。泉の出来事は泉のまま
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 56, H = 24, GX = 27, CX = 27.5, CY = 10;   // 泉の広場は x = 27.5 を軸に左右対称
  var STALLS = [[20, 7], [20, 13], [22, 4], [22, 16], [25, 18], [24, 20]];   // 左半分（右半分は x → 55 − x）
  function rows(canvas) {
    var C = canvas(W, H, 's');
    C.frame(0, 0, W, H, 'C'); C.rect(GX, H - 1, 2, 1, 'P');
    for (var y = 1; y < H - 1; y++) for (var x = 1; x < W - 1; x++) { var d = Math.sqrt((x + 0.5 - CX) * (x + 0.5 - CX) + (y + 0.5 - CY) * (y + 0.5 - CY)); if (d < 6) C.set(x, y, 'P'); }
    C.rect(1, 10, W - 2, 2, 'r'); C.rect(GX, 12, 2, H - 13, 'P');   // 隊商の道・市の通り
    C.rect(26, 8, 4, 2, '~');   // 泉
    STALLS.forEach(function (p) { C.set(p[0], p[1], 'A'); C.set(55 - p[0], p[1], 'A'); });
    [[24, 6], [24, 14]].forEach(function (p) { C.set(p[0], p[1], 'y'); C.set(55 - p[0], p[1], 'y'); });
    C.rect(7, 6, 2, 4, 'r');   // 両替商の家への小道
    C.frame(2, 15, 10, 6, 'x'); C.set(7, 15, 's');   // らくだの囲い
    [[16, 3], [39, 3], [14, 20], [41, 20], [2, 3], [53, 15]].forEach(function (p) { C.set(p[0], p[1], 'f'); });
    [[13, 13], [42, 13], [18, 2], [37, 2]].forEach(function (p, i) { C.set(p[0], p[1], i % 2 ? 'q' : 'z'); });
    return C;
  }
  R.define('mirror_market', {
    version: 1, rows: rows, arrive: [GX, 21],
    buildings: {
      a3_mirror_changer: { x: 5, y: 2, w: 6, h: 4, doorX: 2 }, x72_tower: { x: 40, y: 4, w: 6, h: 6, doorX: 2 }, x72_house: { x: 47, y: 5, w: 7, h: 5, doorX: 3 },
      bread_stall76: { x: 34, y: 19, w: 3, h: 2, doorX: 1 }
    },
    npcs: {
      mm_clerk: [12, 8, 'down', 0], mm_rumor: [20, 15, 'down', 1], mm_omar: [22, 5, 'down', 0], mm_keeper: [27, 3, 'down', 0],
      mm_spice: [23, 16, 'down', 0], mm_salt: [21, 13, 'down', 0], mm_silk: [32, 16, 'down', 0], aunt67_mirror_market: [17, 12, 'down', 1],
      mirrormarket_x72_kid: [46, 13, 'down', 1], mirrormarket_x72_vendor: [44, 14, 'down', 0], mirrormarket_x72_elder: [50, 13, 'down', 0],
      mirror_market_a73_0: [3, 12, 'down', 2], mirror_market_a73_1: [52, 4, 'down', 2], mirror_market_a73_2: [9, 18, 'down', 1], mirror_market_a73_3: [5, 18, 'down', 1],
      mirror_market_a73_4: [15, 18, 'down', 1], mirror_market_a73_5: [36, 17, 'down', 2], u73_negi: [21, 18, 'down', 0], mirror_market_bread76: [35, 19, 'down', 0]
    },
    events: [[15, 10, 27, 9], [48, 9, 38, 12]],
    chests: { mm1: [2, 1] }, points: { opt_087: [33, 1] },
    warps: [GX, GX + 1].map(function (x) { return { x: x, y: H - 1, to: 'world_desert', tx: 86, ty: 35, name: '砂漠へ' }; }),
    anchors: [[15, 20, GX, 22], [16, 20, GX + 1, 22], [15, 19, GX, 21], [16, 19, GX + 1, 21]],
    after: function (def) {
      def.events.forEach(function (e) { if (e.x === 38 && e.y === 12) e.text = ['【東の隊商宿通り】', '隊商の道を東へ。物見やぐらと隊商の家。', '泉の広場の屋台は、泉をはさんで左右おなじ形に並んでいる。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'mirrormarket_x72_kid') n.talk = say('子ども', ['東の物見やぐら、てっぺんまで登ったことある？　鏡の市場がぜんぶ見えるんだよ！', '上から見ると、屋台の輪が泉をはさんで左右おなじ形なんだって。']);
        if (n.id === 'mirrormarket_x72_elder') n.talk = say('町の古老', ['この隊商宿通りも、昔はただの砂地だった。少しずつ隊商が泊まるようになって、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('mirror_market', 'v81_mirror_view', { x: GX + 1, y: 1, z: 10, dist: 24, pitch: 40 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
