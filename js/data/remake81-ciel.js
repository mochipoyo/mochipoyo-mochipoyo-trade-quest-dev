/* =========================================================
   Data / v8.1 氷港シエル（ciel_port）：雪原から下りてくる坂の港町。上の段に宿と店、下の段に岸壁と三本の桟橋
   ・住む理由：凍らない入り江の港。流氷の切れ目を見張り、船を出す。氷の上で釣りをする人もいる
   ・入口から最初に見える物：北の門（雪原から）をくぐると、坂の下に港と凍った海。正面の大階段の下に岸壁、左の荷車の坂、右の小さな灯台
   ・道：坂の道（門 → 上の通り → 大階段 → 岸壁の通り → 桟橋）。上の通りに宿・道具屋・網元の家・武具店。下の段に港の詰所・船乗りの酒場・小さな灯台
   ・境界：柵（防御型）。陸の出入りは北の門。南は海
   ・人・出来事・宝箱・調べる所はそのまま（位置だけ）。船の名前が刻まれた桟橋の柱は、西から二本めの桟橋
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 56, H = 26, GX = 27, LY = 11, QY = 18;   // GX：坂の道と門（27〜28）・LY：段の縁・QY：岸壁の通り
  function rows(canvas) {
    var C = canvas(W, H, 'n');
    C.frame(0, 0, W, H, 'x'); C.rect(GX, 0, 2, 1, 'r');
    C.rect(1, 6, W - 2, 2, 'r');   // 上の通り
    C.rect(GX, 1, 2, QY, 'r');   // 坂の道
    C.rect(1, LY, W - 2, 1, '|'); C.rect(GX, LY, 2, 1, '/'); C.rect(8, LY, 2, 1, ';'); C.rect(8, 8, 2, 3, 'r');   // 段の縁・大階段・荷車の坂
    C.rect(1, 12, W - 2, 1, 'P'); C.rect(1, QY, W - 2, 2, 'P');   // 擁壁の下の道・岸壁の通り
    C.rect(1, QY + 2, W - 2, H - QY - 3, '~');   // 海
    [6, 19, 40].forEach(function (x) { C.rect(x, QY + 2, 2, 4, 'd'); });   // 桟橋
    // 岸壁の荷揚げ場（クレーンの柱と木箱）
    C.set(30, 14, 'I'); [[31, 15], [32, 15], [31, 16], [25, 16]].forEach(function (p, i) { C.set(p[0], p[1], i % 2 ? 'q' : 'z'); });
    [[GX - 1, 3], [GX + 2, 3], [GX - 1, 9], [GX + 2, 9], [GX - 1, 15], [GX + 2, 15], [5, QY - 1], [47, QY - 1]].forEach(function (p) { C.set(p[0], p[1], 'y'); });
    [[2, 9], [17, 9], [40, 9], [53, 9], [11, 2], [24, 4]].forEach(function (p) { C.set(p[0], p[1], 'f'); });
    return C;
  }
  function levels(w, h, rws) { var L = []; for (var y = 0; y < h; y++) { var s = ''; for (var x = 0; x < w; x++) { var c = rws[y].charAt(x); s += y < LY ? '1' : y === LY ? (c === '/' || c === ';' ? '0' : '1') : '0'; } L.push(s); } return L; }
  R.define('ciel_port', {
    version: 1, rows: rows, levels: levels, arrive: [GX, 2],
    buildings: {
      inn: { x: 3, y: 1, w: 8, h: 5, doorX: 3 }, item: { x: 14, y: 1, w: 8, h: 5, doorX: 3 }, x72_house: { x: 33, y: 1, w: 7, h: 5, doorX: 3 }, weapon: { x: 43, y: 1, w: 8, h: 5, doorX: 3 },
      harbor: { x: 13, y: 13, w: 8, h: 5, doorX: 3 }, bread_stall76: { x: 22, y: 14, w: 3, h: 2, doorX: 1 }, x72_hall: { x: 33, y: 13, w: 8, h: 5, doorX: 3 }, x72_tower: { x: 48, y: 12, w: 6, h: 6, doorX: 2 }
    },
    npcs: {
      ci_sailor: [22, QY, 'down', 0], ci_child: [9, 9, 'down', 1], aunt67_ciel_port: [24, 9, 'down', 1],
      cielport_x72_kid: [44, QY + 1, 'down', 1], cielport_x72_vendor: [43, 15, 'down', 0], cielport_x72_elder: [45, 13, 'down', 0],
      ciel_port_a73_0: [19, 8, 'down', 2], ciel_port_a73_1: [12, 9, 'down', 2], ciel_port_a73_2: [9, 15, 'down', 2], ciel_port_a73_3: [33, 9, 'down', 2], ciel_port_a73_4: [12, 3, 'down', 2], ciel_port_a73_5: [36, 9, 'down', 1],
      u73_tundra: [41, 23, 'down', 0], ciel_port_bread76: [23, 14, 'down', 0]
    },
    events: [[13, 18, 19, 21], [50, 12, 46, QY]],
    chests: { cp1: [31, 2] }, points: { sp_ciel_port_21_2: [23, 2], opt_099: [30, 10] },
    warps: [GX, GX + 1].map(function (x) { return { x: x, y: 0, to: 'world_snow', tx: 58, ty: 93, name: '雪原へ' }; }),
    anchors: [[14, 1, GX, 1], [15, 1, GX + 1, 1], [14, 2, GX, 2], [15, 2, GX + 1, 2]],
    after: function (def) {
      def.events.forEach(function (e) { if (e.x === 46 && e.y === QY) e.text = ['【東の岸壁】', '船乗りの酒場と、岸壁の東の端に小さな灯台。', '上の通りの東に網元の家。いちばん東の桟橋では、氷釣りをする人がいる。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'cielport_x72_kid') n.talk = say('子ども', ['岸壁の小さな灯台、てっぺんまで登ったことある？　氷港シエルがぜんぶ見えるんだよ！', '上から見ると、町が海へ向かって一段さがってるのがわかるんだって。']);
        if (n.id === 'cielport_x72_elder') n.talk = say('町の古老', ['この東の岸壁も、昔はただの氷の浜だった。少しずつ石を積んで、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('ciel_port', 'v81_ciel_view', { x: GX + 1, y: 2, z: 13, dist: 28, pitch: 36 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
