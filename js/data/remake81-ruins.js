/* =========================================================
   Data / v8.1 廃墟の街（aruna_ruins）：7時42分で止まった時計塔と、地割れで沈んだ南西の一画
   ・住んでいた理由：灰灯島の港の街。時計塔の鐘が時刻を告げ、郵便局が島の手紙を集めていた。災害で街は崩れ、南西の一画は地割れで沈んだ
   ・入口から最初に見える物：南の門から、ひびの入った大通り。その先の割れた広場に落ちた時計、奥に止まったままの時計塔
   ・道：崩れた大通り（門 → 南の通り → 中の通り → 割れた広場 → 時計塔）。南の通りは西で階段を下りて「沈んだ一画」（郵便局跡・灯守りの家）へ。
     中の通りからも階段で沈んだ一画へ下りられる。時計塔の東に崩れた祠。東は焼け跡（空き家・寄り合い所・古道具屋・崩れかけた塔）
   ・崩れた家：屋根が落ち、壁だけ残った家。郵便受けの手紙（拾う）と、子どもの靴（調べる）は崩れた家の前と中
   ・境界：崖（自然の境界）。出入りは南の門
   ・人・出来事・宝箱・調べる所はそのまま（位置だけ）。街の中で魔物が出るのも前と同じ
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 60, H = 30, RX = 28, SX = 37, KX = 21;   // RX：崩れた大通り（28〜31）・SX：崩れた祠・KX：沈んだ一画の東の縁
  var BY = [15, 16, 16, 16, 16, 16, 15, 15, 15, 15, 15, 15, 16, 16, 16, 16, 16, 17, 17, 17, 17, 17];   // 沈んだ一画の北の縁（x = 0〜21）
  var by = function (x) { return BY[Math.max(0, Math.min(KX, x))]; };
  var SHELL = ['WW=WWW', 'W_z__W', 'W____=', 'WW_WWW'];   // 崩れた家（壁だけ残った）
  var SHELL2 = ['WWW=WW', 'W____W', '=_zz_W', 'WWW_WW'];
  function rows(canvas) {
    var C = canvas(W, H, '=');
    C.frame(0, 0, W, H, 'c'); C.rect(RX, H - 1, 4, 1, 'r');
    C.rect(1, 7, W - 2, 2, 'r'); C.rect(1, 13, W - 2, 2, 'r'); C.rect(1, 22, W - 2, 2, 'r');   // 北の通り・中の通り・南の通り
    C.rect(RX, 13, 4, H - 14, 'r');   // 崩れた大通り
    C.rect(22, 7, 16, 6, 'P');   // 割れた広場
    [[24, 8], [27, 11], [33, 9], [35, 12], [23, 12], [30, 18], [29, 25], [31, 20]].forEach(function (p) { C.set(p[0], p[1], '8'); });   // ひび
    // 沈んだ一画の縁（擁壁）と階段
    for (var x = 1; x <= KX; x++) { C.set(x, by(x), '|'); if (x > 1 && by(x) !== by(x - 1)) for (var y = Math.min(by(x), by(x - 1)); y <= Math.max(by(x), by(x - 1)); y++) C.set(x, y, '|'); }
    for (var y2 = by(KX); y2 < H - 1; y2++) C.set(KX, y2, '|');
    C.set(8, 15, '/'); C.set(9, 15, '/'); C.set(KX, 22, '/'); C.set(KX, 23, '/');
    // 崩れた家
    C.stamp(3, 1, SHELL); C.stamp(3, 9, SHELL2); C.stamp(13, 9, SHELL); C.stamp(41, 9, SHELL2); C.stamp(51, 9, SHELL);
    C.stamp(33, 16, ['WW=WWW', 'W____W', 'W_z___', 'WWWW=W']); C.stamp(22, 24, SHELL2); C.stamp(41, 24, SHELL); C.stamp(4, 24, SHELL2);
    // 崩れた祠（時計塔の東）
    C.rect(SX, 3, 1, 4, 'P'); C.set(SX - 1, 2, 'I'); C.set(SX + 1, 2, 'I'); C.set(SX - 1, 1, 'z'); C.set(SX + 1, 4, 'z');
    // 焼け跡と瓦礫の庭
    [[40, 19], [49, 25], [55, 26], [57, 12], [47, 6], [39, 26]].forEach(function (p) { C.set(p[0], p[1], '8'); }); [[48, 13 - 1], [57, 20], [38, 1]].forEach(function (p) { C.set(p[0], p[1], 'z'); });
    C.rect(12, 25, 4, 2, 'a'); C.set(16, 27, 'e');
    [[2, 12], [20, 3], [57, 27], [36, 28], [19, 27]].forEach(function (p) { C.set(p[0], p[1], 'q'); });
    return C;
  }
  function levels(w, h, rws) { var L = []; for (var y = 0; y < h; y++) { var s = ''; for (var x = 0; x < w; x++) { var c = rws[y].charAt(x); s += c === '|' ? '1' : c === '/' ? '0' : (x < KX && y > by(x)) ? '0' : '1'; } L.push(s); } return L; }
  R.define('aruna_ruins', {
    version: 1, rows: rows, levels: levels, arrive: [RX + 1, 27],
    buildings: {
      store: { x: 12, y: 2, w: 8, h: 5, doorX: 3 }, clock: { x: 25, y: 1, w: 10, h: 6, doorX: 4 },
      x72_house: { x: 41, y: 2, w: 7, h: 5, doorX: 3 }, x72_hall: { x: 50, y: 2, w: 8, h: 5, doorX: 3 },
      bread_stall76: { x: 34, y: 10, w: 3, h: 2, doorX: 1 },
      post: { x: 3, y: 17, w: 8, h: 5, doorX: 3 }, a3_ruins_keeper: { x: 13, y: 18, w: 5, h: 4, doorX: 2 },
      x72_ex0: { x: 42, y: 17, w: 7, h: 5, doorX: 3 }, x72_tower: { x: 52, y: 16, w: 6, h: 6, doorX: 2 }
    },
    npcs: {
      ru_shade: [10, 26, 'down', 1], arunaruins_x72_kid: [48, 10, 'down', 1], arunaruins_x72_vendor: [49, 11, 'down', 0], arunaruins_x72_elder: [50, 19, 'down', 0],
      aruna_ruins_a73_0: [10, 11, 'down', 2], aruna_ruins_a73_1: [2, 11 - 1, 'down', 2], aruna_ruins_a73_2: [26, 20, 'down', 2], aruna_ruins_a73_3: [17, 25, 'down', 1],
      u73_riko: [13, 27, 'down', 1], aruna_ruins_bread76: [35, 10, 'down', 0]
    },
    events: [[8, 10, 25, 10], [30, 19, 34, 18], [36, 3, SX, 3], [5, 6, 5, 5], [4, 21, 7, 28], [24, 22, 25, 28], [34, 22, 43, 28], [36, 12, 53, 12], [49, 17, 39, 10]],
    chests: { ar1: [2, 28], ar2: [36, 27] }, points: { sp_aruna_ruins_17_14: [18, 11], sp_aruna_ruins_21_1: [22, 1] },
    warps: [RX, RX + 1, RX + 2, RX + 3].map(function (x) { return { x: x, y: H - 1, to: 'world_islands', tx: 86, ty: 64, name: '島へ' }; })
      .concat([{ x: SX, y: 2, to: 'aruna_underground_1', tx: 1, ty: 1, needFlag: 'iris_joined', name: '崩れた祠（地下施設）' }]),
    anchors: [[36, 4, SX, 4], [18, 28, RX, 28], [19, 28, RX + 1, 28], [20, 28, RX + 2, 28], [21, 28, RX + 3, 28], [18, 27, RX, 27], [19, 27, RX + 1, 27], [20, 27, RX + 2, 27], [21, 27, RX + 3, 27]],
    after: function (def) {
      def.events.forEach(function (e) { if (e.x === 39 && e.y === 10) e.text = ['【東の焼け跡】', '空き家・寄り合い所・古道具屋・崩れかけた塔。焼けた家の壁だけが残っている。', '南西の一画は地割れで沈んだ。南の通りと中の通りから、階段で下りられる。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'arunaruins_x72_kid') n.talk = say('子ども', ['焼け跡の崩れかけた塔、てっぺんまで登ったことある？　廃墟の街がぜんぶ見えるんだよ！', '上から見ると、南西のところだけ、地面が一段さがってるんだって。']);
        if (n.id === 'arunaruins_x72_elder') n.talk = say('町の古老', ['この焼け跡も、昔は家が並んでいた。少しずつ人が戻って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('aruna_ruins', 'v81_ruins_view', { x: RX + 2, y: 3, z: 14, dist: 28, pitch: 36 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
