/* =========================================================
   Data / v8.1 鍛冶街イグナス（ignas_town）：火山から流れる溶岩の水路にそって、鍛冶場が一列に並ぶ町
   ・住む理由：溶岩の熱を炉に引ける場所。竜の鍛冶場と鍛冶職人たち、祭りの集会所
   ・入口から最初に見える物：南の門をくぐると、左に湯気の立つ冷やし池。そこから北へ赤く光る溶岩の水路と、北の祭りの集会所
   ・道：炉の道（門 → 火祭りの広場 → 中の通り → 北の通り → 集会所）。水路の西は鍛冶の並び（竜の鍛冶場・鍛冶の工房・職人の家）、
     道の東は町の側（防具店・道具屋・宿・長老の家・火の見やぐら）。水路は北と中の通りの橋で渡る
   ・境界：石の城壁（防御型）。出入りは南の門
   ・人・出来事・宝箱・調べる所はそのまま（位置だけ）。溶岩の水路の出来事は水路のそば
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 60, H = 30, GX = 29, LX = 22;   // GX：炉の道と門（29〜30）・LX：溶岩の水路（22〜23）
  function rows(canvas) {
    var C = canvas(W, H, '8');
    C.frame(0, 0, W, H, 'C'); C.rect(GX, H - 1, 2, 1, 'r');
    C.rect(1, 8, W - 2, 2, 'r'); C.rect(1, 17, W - 2, 2, 'r');   // 北の通り・中の通り
    C.rect(GX, 8, 2, H - 9, 'r');   // 炉の道
    C.rect(LX, 1, 2, 23, 'l');   // 溶岩の水路
    for (var y = 22; y < 29; y++) for (var x = 17; x < 28; x++) { var dx = (x - 22.5) / 3.8, dy = (y - 25.5) / 2.4; if (dx * dx + dy * dy < 1) C.set(x, y, 'w'); }   // 冷やし池
    C.rect(LX, 8, 2, 2, 'b'); C.rect(LX, 17, 2, 2, 'b');   // 水路の橋
    // 鍛冶の並び（水路と炉の道のあいだ）：金床と木箱
    [[26, 11], [26, 14], [26, 20]].forEach(function (p) { C.set(p[0], p[1], 'T'); }); [[27, 11], [25, 14], [27, 21]].forEach(function (p) { C.set(p[0], p[1], 'z'); });
    // 火祭りの広場（南東）
    C.rect(33, 20, 24, 8, 'P'); [[35, 22], [54, 22], [35, 26], [54, 26]].forEach(function (p) { C.set(p[0], p[1], 'I'); });
    [[GX - 1, 12], [GX + 2, 12], [GX - 1, 15], [GX + 2, 15], [GX + 2, 22], [GX + 2, 25], [44, 23], [46, 23]].forEach(function (p) { C.set(p[0], p[1], 'y'); });
    [[2, 20], [9, 26], [13, 22], [40, 1], [58, 11]].forEach(function (p) { C.set(p[0], p[1], 'z'); }); [[5, 23], [57, 18 + 1]].forEach(function (p) { C.set(p[0], p[1], 'q'); });
    return C;
  }
  R.define('ignas_town', {
    version: 1, rows: rows, arrive: [GX, 27],
    buildings: {
      forge: { x: 2, y: 3, w: 9, h: 5, doorX: 4 }, x72_hall: { x: 12, y: 3, w: 8, h: 5, doorX: 3 }, hall: { x: 25, y: 2, w: 10, h: 6, doorX: 5 },
      armor: { x: 36, y: 3, w: 8, h: 5, doorX: 3 }, x72_house: { x: 45, y: 3, w: 7, h: 5, doorX: 3 }, x72_tower: { x: 53, y: 2, w: 6, h: 6, doorX: 2 },
      house1: { x: 3, y: 13, w: 6, h: 4, doorX: 2 }, a3_ignas_smith_home: { x: 12, y: 14, w: 5, h: 3, doorX: 2 },
      item: { x: 34, y: 12, w: 8, h: 5, doorX: 3 }, inn: { x: 44, y: 12, w: 8, h: 5, doorX: 3 }, house2: { x: 53, y: 13, w: 6, h: 4, doorX: 2 },
      bread_stall76: { x: 39, y: 21, w: 3, h: 2, doorX: 1 }
    },
    npcs: {
      ig_gate: [GX - 1, 27, 'right', 0], ig_kid: [9, 11, 'down', 1], ig_smith: [25, 12, 'down', 1], ig_woman: [36, 19, 'down', 1], aunt67_ignas_town: [32, 14, 'down', 1],
      ignastown_x72_kid: [50, 21, 'down', 1], ignastown_x72_vendor: [49, 10, 'down', 0], ignastown_x72_elder: [52, 11, 'down', 0],
      ignas_town_a73_0: [44, 1, 'down', 2], ignas_town_a73_1: [42, 14, 'down', 2], ignas_town_a73_2: [14, 11, 'down', 1], ignas_town_a73_3: [16, 22, 'down', 1], ignas_town_a73_4: [55, 24, 'down', 2],
      u73_homura: [24, 4, 'down', 0], ignas_town_bread76: [40, 21, 'down', 0]
    },
    events: [[16, 14, LX + 1, 13], [47, 15, 25, 10]],
    chests: { ig1: [58, 1] }, points: { sp_ignas_town_27_12: [27, 13], sp_ignas_town_3_12: [2, 11], opt_094: [7, 20] },
    warps: [GX, GX + 1].map(function (x) { return { x: x, y: H - 1, to: 'world_dragon', tx: 30, ty: 63, name: '島へ' }; }),
    anchors: [[17, 24, GX, 28], [18, 24, GX + 1, 28], [17, 23, GX, 27], [18, 23, GX + 1, 27]],
    after: function (def) {
      def.events.forEach(function (e) { if (e.x === 25 && e.y === 10) e.text = ['【鍛冶の並び】', '溶岩の水路の西に、竜の鍛冶場・鍛冶の工房・鍛冶職人の家・鍛冶師の家。', '北の通りの東に、もう一軒の鍛冶師の家と火の見やぐら。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'ignastown_x72_kid') n.talk = say('子ども', ['北の火の見やぐら、てっぺんまで登ったことある？　鍛冶街イグナスがぜんぶ見えるんだよ！', '溶岩の水路が、町のまんなかに赤い線を一本ひいてるんだって。']);
        if (n.id === 'ignastown_x72_elder') n.talk = say('町の古老', ['この町の東も、昔はただの空き地だった。少しずつ家が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('ignas_town', 'v81_ignas_view', { x: GX + 1, y: 3, z: 14, dist: 28, pitch: 36 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
