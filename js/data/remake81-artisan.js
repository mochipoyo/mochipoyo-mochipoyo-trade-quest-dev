/* =========================================================
   Data / v8.1 リヴェル城下・職人通り（rivel_artisan）：城下町の東門から、ゆるく曲がる職人通りが古井戸の広場と水路の橋へ続く
   ・住む理由：城下町の職人たち（鍛冶・機織り・薬草）が集まった通り。水路の水で東の菜園を育てる
   ・入口から最初に見える物：西の門（城下町から）をくぐると、ゆるく曲がる職人通り。北に機織りの家と鍛冶屋の工房、その先に古井戸の広場
   ・道：職人通り（西の門 → 鍛冶屋の前 → 古井戸の広場 → 水路の橋 → 東の新市街）。北の家並みの裏に、表通りより近い細い路地
     広場の南の道は南西の庭園と、水路の南の橋（倉庫・菜園の南）へ。水路の東が菜園、さらに東が新市街（騎士の家・見張りの塔・仕立て屋・騎士の詰所）
   ・境界：城壁（防御型）。出入りは西の門（城下町へ）。城の地下の古井戸の道も前と同じ
   ・人・出来事（古井戸・いなくなった猫・案内板）・宝箱・調べる所はそのまま（位置だけ）
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 66, H = 32, PX = 27, PY = 14, KX = 38;   // PX, PY：古井戸の広場・KX：水路（38〜39）
  function rows(canvas) {
    var C = canvas(W, H, '.');
    C.frame(0, 0, W, H, 'C'); C.rect(0, 15, 1, 2, 'r');
    // 古井戸の広場
    for (var y = 8; y < 21; y++) for (var x = 20; x < 36; x++) { var d = Math.sqrt((x + 0.5 - PX - 0.5) * (x + 0.5 - PX - 0.5) + (y + 0.5 - PY - 0.5) * (y + 0.5 - PY - 0.5)); if (d < 5.2) C.set(x, y, '='); }
    C.path([[1, 15], [11, 15], [11, 13], [23, 13]], 'r', 2);   // 職人通り（ゆるく曲がる）
    C.rect(32, 15, W - 33, 2, 'r');   // 広場から橋・新市街へ
    C.path([[6, 14], [6, 7], [12, 7], [12, 4], [24, 4], [24, 9]], 'P');   // 裏の路地
    C.path([[PX, 19], [PX, 25], [KX + 3, 25]], 'r', 2);   // 広場の南の道 → 南の橋
    C.set(PX + 1, PY + 1, 'j');   // 古井戸
    // 水路と橋
    C.rect(KX, 1, 2, H - 2, '~'); C.rect(KX, 15, 2, 2, 'b'); C.rect(KX, 25, 2, 2, 'b'); C.rect(KX, 4, 2, 1, 'b');
    // 菜園（水路の東）
    C.rect(41, 2, 9, 4, 'H'); C.rect(41, 8, 9, 5, 'H'); C.rect(41, 19, 8, 4, 'H'); C.rect(KX + 2, 1, 1, H - 2, ',');
    // 南西の庭園
    C.rect(2, 22, 10, 8, ','); [[3, 23], [6, 23], [9, 23], [3, 27], [6, 27], [9, 27]].forEach(function (p) { C.rect(p[0], p[1], 2, 1, 'a'); }); C.set(7, 25, 'e'); C.set(4, 25, 'e'); C.set(12, 22, 'f'); C.set(12, 29, 'f');
    // 鍛冶屋の前の作業場
    C.set(22, 8, 'T'); C.set(22, 10, 'z'); C.set(13, 10, 'q');
    // 新市街の広場と屋台
    C.rect(51, 9, 13, 10, 'P'); C.set(57, 12, 'j'); [[52, 13], [55, 13], [52, 18], [61, 18]].forEach(function (p) { C.set(p[0], p[1], 'A'); });
    [[PX - 3, 9], [PX + 7, 9], [PX - 3, 19], [PX + 5, 19], [10, 17], [36, 14], [52, 17], [63, 14]].forEach(function (p) { C.set(p[0], p[1], 'y'); });
    [[3, 19], [17, 2], [33, 3], [45, 15], [47, 29], [35, 29]].forEach(function (p) { C.set(p[0], p[1], '6'); });
    return C;
  }
  R.define('rivel_artisan', {
    version: 1, rows: rows, arrive: [1, 15],
    buildings: {
      ra_h1: { x: 2, y: 3, w: 5, h: 4, doorX: 2 }, ra_h2: { x: 2, y: 9, w: 4, h: 4, doorX: 1 }, ra_weaver: { x: 7, y: 8, w: 7, h: 4, doorX: 2 }, ra_smith: { x: 15, y: 6, w: 7, h: 5, doorX: 3 },
      bread_stall76: { x: 31, y: 10, w: 3, h: 2, doorX: 1 },
      ra_herbal: { x: 14, y: 19, w: 6, h: 4, doorX: 2 }, ra_h3: { x: 18, y: 26, w: 5, h: 3, doorX: 2 }, ra_h4: { x: 30, y: 27, w: 6, h: 3, doorX: 2 },
      x72_house: { x: 51, y: 2, w: 7, h: 5, doorX: 3 }, x72_tower: { x: 59, y: 2, w: 6, h: 6, doorX: 2 },
      x72_ex0: { x: 49, y: 20, w: 7, h: 5, doorX: 3 }, x72_hall: { x: 57, y: 20, w: 8, h: 5, doorX: 3 }
    },
    npcs: {
      ra_kid: [26, 18, 'down', 1], ra_farmer: [46, 14, 'left', 1], ra_gardener: [8, 25, 'down', 1], ra_bridge: [37, 17, 'right', 0], ra_apprentice: [21, 12, 'right', 0], ra_alley: [6, 10, 'down', 1],
      aunt67_rivel_artisan: [24, 17, 'down', 1], rivelartisan_x72_kid: [56, 17, 'down', 1], rivelartisan_x72_vendor: [59, 11, 'down', 0], rivelartisan_x72_elder: [62, 16, 'down', 0],
      rivel_artisan_a73_0: [54, 26, 'down', 2], rivel_artisan_a73_1: [5, 18, 'down', 2], rivel_artisan_a73_2: [31, 17, 'down', 2], rivel_artisan_a73_3: [25, 11, 'down', 2],
      rivel_artisan_a73_4: [44, 7, 'down', 1], rivel_artisan_a73_5: [44, 17, 'down', 1], rivel_artisan_a73_6: [44, 24, 'down', 2], rivel_artisan_a73_7: [44, 1, 'down', 2],
      u73_gante: [19, 17, 'down', 0], rivel_artisan_bread76: [32, 10, 'down', 0]
    },
    events: [[28, 19, PX + 1, PY + 1], [24, 15, 22, 15], [37, 13, 44, 12], [47, 16, 51, 14]],
    chests: { ra1: [42, 30], ra2: [2, 30] }, points: { sp_rivel_artisan_42_1: [41, 1], sp_rivel_artisan_3_29: [3, 30] },
    keepWarp: function (w) { return w.to === 'rivel_town'; },   // 西の門（城下町へ）は前と同じ位置
    anchors: [[1, 15, 1, 15], [1, 16, 1, 16], [29, 19, PX + 2, PY + 1]],
    after: function (def) {
      def.waterSound81 = [{ x: 38, y: 6, r: 5, v: 0.7 }, { x: 38, y: 15, r: 6 }, { x: 38, y: 25, r: 5, v: 0.7 }];   // 水路の水音（js/ui/ambient81.js）
      def.events.forEach(function (e) {
        if (e.x === 22 && e.y === 15) e.text = ['案内板：「職人通り——北：機織りの家・鍛冶屋の工房（裏に細い路地）　南西：庭園　南：倉庫」', '「東：水路の橋の向こうに菜園と新市街　広場の古井戸は立ち入り禁止」'];
        if (e.x === 51 && e.y === 14) e.text = ['【東の新市街】', '騎士の家・見張りの塔・仕立て屋・騎士の詰所。広場にもう一つの井戸と屋台。'];
      });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'rivelartisan_x72_kid') n.talk = say('子ども', ['新市街の見張りの塔、てっぺんまで登ったことある？　職人通りがぜんぶ見えるんだよ！', '上から見ると、職人通りがへびみたいに曲がってるんだって。']);
        if (n.id === 'rivelartisan_x72_elder') n.talk = say('町の古老', ['この新市街も、昔はただの空き地だった。少しずつ家が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('rivel_artisan', 'v81_artisan_view', { x: 20, y: 1, z: 13, dist: 26, pitch: 38 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
