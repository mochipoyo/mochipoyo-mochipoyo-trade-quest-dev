/* =========================================================
   Data / v8.1 鍛冶街イグナス（ignas_town）：火山から下る溶岩の水路と、門から鍛冶場へのぼる炉の道が、町の真ん中で X の字に交わる町
   ・住む理由：溶岩の熱を炉に引ける場所。竜の鍛冶場と鍛冶職人たち、祭りの集会所
   ・入口から最初に見える物：南東の門をくぐると、北西へまっすぐのぼる斜めの炉の道。その先、町の真ん中で赤く光る溶岩の水路を橋で渡る。
     左手に火祭りの広場、遠くに湯気の立つ冷やし池
   ・道：炉の道（南東の門 → 道具屋・宿 → 真ん中の橋 → 鍛冶の工房 → 北西のはしの竜の鍛冶場）。
     水路は北東の取り入れ口（火山の側）から南西の冷やし池へ、炉の道と直角に斜めに流れる。2 本の斜めの線で町は 4 つに分かれる：
     北＝祭りの集会所（橋からまっすぐの参道）、西＝鍛冶の並び（水路の熱を引く鍛冶場・職人の家）、東＝町の側（防具店・道具屋・宿・長老の家・火の見やぐら）、
     南＝火祭りの広場（扇の形）
   ・前（v8.1 の最初）は横の通り 2 本と縦の炉の道の格子だった。斜めの 2 本が交わる X の字に変えた
   ・境界：石の城壁（防御型）。出入りは南東の門
   ・人・出来事・宝箱・調べる所はそのまま（位置だけ）。溶岩の水路の出来事は水路のそば
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 62, H = 36, CX = 30, CY = 17;   // CX, CY：X の交わる所（真ん中の橋）
  // 炉の道：(CX + k, CY + k)（北西 → 南東）の 3×3。溶岩の水路：(CX + k, CY - k)（北東 → 南西）の 2×2
  var road = function (k) { return [CX + k, CY + k]; }, canal = function (k) { return [CX + k, CY - k]; };
  function rows(canvas) {
    var C = canvas(W, H, '8');
    C.frame(0, 0, W, H, 'C');
    var k;
    for (k = -12; k <= 16; k++) { var c = canal(k); C.rect(c[0], c[1], 2, 2, 'l'); }   // 溶岩の水路
    for (var py = 27; py < 35; py++) for (var px = 7; px < 19; px++) { var ex = (px + 0.5 - 13) / 5.5, ey = (py + 0.5 - 31) / 3; if (ex * ex + ey * ey < 1) C.set(px, py, 'w'); }   // 冷やし池（水路の南西のはし）
    C.rect(29, 8, 2, 8, 'r');   // 祭りの集会所への参道（真ん中の橋から北へ）
    C.rect(14, 4, 1, 1, 'r'); C.rect(20, 11, 2, 1, 'r'); C.rect(35, 19, 1, 1, 'r'); C.rect(41, 25, 1, 1, 'r');   // 扉の前から炉の道へ
    // 火祭りの広場（南の扇）：水路と炉の道から 2 マスあけた三角
    for (var y = 23; y < 34; y++) for (var x = 51 - y; x <= y + 9; x++) if (C.get(x, y) === '8') C.set(x, y, 'P');
    for (k = -14; k <= 17; k++) { var r = road(k); for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var X = r[0] + dx, Y = r[1] + dy; if (!C.in(X, Y)) continue; var t = C.get(X, Y); C.set(X, Y, (t === 'l' || t === 'b') ? 'b' : 'r'); } }   // 炉の道（水路の上は橋）。南東のはしは門（城壁の切れ目）
    // 鍛冶の並び（西）：水路のそばの金床と木箱
    [[22, 19], [25, 17], [19, 25], [21, 15]].forEach(function (p) { C.set(p[0], p[1], 'T'); }); [[23, 20], [26, 18], [20, 26], [12, 18], [10, 8]].forEach(function (p) { C.set(p[0], p[1], 'z'); });
    // 火祭りの広場のかがり火
    [[27, 25], [33, 25], [21, 32], [39, 32]].forEach(function (p) { C.set(p[0], p[1], 'I'); });
    // 炉の道の灯り（両わき）・取り入れ口の岩
    [[18, 9], [22, 5], [24, 15], [28, 11], [38, 21], [44, 29], [43, 33], [49, 32]].forEach(function (p) { C.set(p[0], p[1], 'y'); });
    [[49, 1], [48, 3], [51, 2], [42, 4]].forEach(function (p) { if (C.get(p[0], p[1]) === '8') C.set(p[0], p[1], 'q'); });
    [[2, 30], [58, 33], [3, 16], [59, 19], [53, 29], [56, 31]].forEach(function (p) { C.set(p[0], p[1], 'q'); }); [[51, 27], [55, 33], [60, 25]].forEach(function (p) { C.set(p[0], p[1], 'z'); });
    return C;
  }
  R.define('ignas_town', {
    version: 2, rows: rows, arrive: [46, 33],
    buildings: {
      hall: { x: 25, y: 2, w: 10, h: 6, doorX: 4 },
      forge: { x: 5, y: 2, w: 9, h: 5, doorSide: 'right', doorY: 2 }, x72_hall: { x: 12, y: 10, w: 8, h: 5, doorSide: 'right', doorY: 1 },
      house1: { x: 15, y: 19, w: 6, h: 4, doorX: 2 }, a3_ignas_smith_home: { x: 7, y: 21, w: 5, h: 3, doorX: 2 },
      x72_tower: { x: 53, y: 2, w: 6, h: 6, doorX: 2 }, armor: { x: 44, y: 8, w: 8, h: 5, doorX: 3 }, x72_house: { x: 53, y: 11, w: 7, h: 5, doorX: 3 },
      item: { x: 37, y: 16, w: 8, h: 5, doorSide: 'left', doorY: 3 }, inn: { x: 42, y: 23, w: 8, h: 5, doorSide: 'left', doorY: 2 }, house2: { x: 52, y: 20, w: 6, h: 4, doorX: 2 },
      bread_stall76: { x: 32, y: 28, w: 3, h: 2, doorX: 1 }
    },
    npcs: {
      ig_gate: [44, 34, 'right', 0], ig_kid: [9, 11, 'down', 1], ig_smith: [24, 20, 'down', 1], ig_woman: [39, 22, 'down', 1], aunt67_ignas_town: [32, 10, 'down', 1],
      ignastown_x72_kid: [50, 21, 'down', 1], ignastown_x72_vendor: [52, 9, 'down', 0], ignastown_x72_elder: [58, 18, 'down', 0],
      ignas_town_a73_0: [41, 1, 'down', 2], ignas_town_a73_1: [42, 14, 'down', 2], ignas_town_a73_2: [4, 13, 'down', 1], ignas_town_a73_3: [12, 26, 'down', 1], ignas_town_a73_4: [57, 27, 'down', 2],
      u73_homura: [41, 3, 'down', 0], ignas_town_bread76: [33, 28, 'down', 0]
    },
    events: [[16, 14, 34, 13], [47, 15, 19, 9]],
    chests: { ig1: [59, 1] }, points: { sp_ignas_town_27_12: [27, 10], sp_ignas_town_3_12: [2, 11], opt_094: [4, 27] },
    warps: [46, 47, 48].map(function (x) { return { x: x, y: H - 1, to: 'world_dragon', tx: 30, ty: 63, name: '島へ' }; }),
    anchors: [[17, 24, 46, 34], [18, 24, 47, 34], [17, 23, 46, 33], [18, 23, 47, 33]],
    after: function (def) {
      def.events.forEach(function (e) {
        if (e.x === 19 && e.y === 9) e.text = ['【鍛冶の並び】', '炉の道の西。北西のはしに竜の鍛冶場、炉の道ぞいに鍛冶の工房。', '溶岩の水路のそばに、熱を引く鍛冶職人の家と鍛冶師の家。'];
      });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'ignastown_x72_kid') n.talk = say('子ども', ['北東の火の見やぐら、てっぺんまで登ったことある？　鍛冶街イグナスがぜんぶ見えるんだよ！', '上から見ると、赤い水路と炉の道が、町のまんなかで大きな × をかいてるんだって。']);
        if (n.id === 'ignastown_x72_elder') n.talk = say('町の古老', ['この町の東も、昔はただの空き地だった。少しずつ家が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('ignas_town', 'v81_ignas_view', { x: CX + 1, y: 3, z: CY + 1, dist: 32, pitch: 42 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
