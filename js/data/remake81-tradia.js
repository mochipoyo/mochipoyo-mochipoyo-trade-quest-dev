/* =========================================================
   Data / v8.1 相場都市トレディア（tradia）：相場の情報で暮らす取引街
   ・住む理由：証券市場と、相場の値を映す掲示機。値を読んで売り買いする人の町
   ・入口から最初に見える物：南の門から北へまっすぐの「相場通り」。両わきに光る掲示機が並び、突き当たりに証券市場と大きな情報板 2 枚
   ・道：相場通り（門 → 証券市場の広場）。途中で西の「闘技場通り」（闘技場・ギルド・空への塔の広場）と東の「テック街」（研究所・研究室・工房の小路）に分かれる
     広場の西は富豪の屋敷と銀行、東は財団本部とレバレッジ取引所。南西の角は酒場の裏の路地（破産した人たちの溜まり場）
   ・建物でできること：情報板（相場の表）・証券市場・闘技場・ギルド・研究所・銀行・宿・店。空への塔からエレベーターで空の区画（トレディア・スカイ）へ
   ・境界：柵（防御型）。出入りは南の門と空への塔のエレベーター
   ・増築地区（旧・東のテック街）の建物は、東の工房の小路へ並べ直した。空の区画（tradia_sky）は v7.1 の専用設計のまま
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 72, H = 44, AX = 34;   // AX：相場通りの西の端（34〜37）
  function rows(canvas) {
    var C = canvas(W, H, '=');
    C.frame(0, 0, W, H, 'x'); C.rect(AX, H - 1, 4, 1, 'P');
    C.rect(AX, 14, 4, H - 15, 'P');   // 相場通り
    [17, 23, 29, 35].forEach(function (y) { C.set(AX - 1, y, '?'); C.set(AX + 4, y, '?'); });   // 光る掲示機（相場の値）
    [20, 26, 32, 38].forEach(function (y) { C.set(AX - 1, y, 'y'); C.set(AX + 4, y, 'y'); });
    C.rect(22, 8, 28, 6, 'P'); C.set(32, 9, '?'); C.set(39, 9, '?');   // 証券市場の広場と大きな情報板 2 枚
    [[24, 12], [47, 12]].forEach(function (p) { C.set(p[0], p[1], 'a'); C.set(p[0] + 1, p[1], 'a'); }); C.set(27, 11, 'e'); C.set(44, 11, 'e');
    C.rect(2, 21, AX - 2, 2, 'r'); C.rect(AX + 4, 21, W - AX - 6, 2, 'r');   // 闘技場通り・テック街
    // 空への塔の広場（西）
    C.rect(14, 27, 12, 5, 'P'); C.set(14, 31, 'y'); C.set(25, 31, 'y'); C.set(23, 29, 'e');
    // 酒場の裏の路地（南西）：木箱・樽・草
    C.rect(2, 32, 12, 10, ','); [[3, 33], [12, 33], [6, 39], [11, 40], [2, 37]].forEach(function (p, i) { C.set(p[0], p[1], i % 2 ? 'q' : 'z'); }); C.rect(3, 31, 10, 1, '=');
    // テック街の工房の小路（東）
    C.rect(47, 23, 2, H - 24, 'r'); C.rect(56, 23, 2, 13, 'r'); C.set(67, 24, '?'); C.set(66, 24, 'z');
    // 門の内側の小さな広場と木
    C.rect(28, 39, 16, 4, 'P'); [[26, 41], [45, 41], [2, 15], [69, 14], [29, 24], [42, 27]].forEach(function (p) { C.set(p[0], p[1], '6'); });
    return C;
  }
  R.define('tradia', {
    version: 1, rows: rows, arrive: [AX + 1, 39],
    buildings: {
      td_exchange: { x: 26, y: 2, w: 20, h: 6, doorX: 9 }, td_mansion: { x: 13, y: 2, w: 10, h: 6, doorX: 4 }, td_bank: { x: 2, y: 2, w: 8, h: 5, doorX: 3 },
      td_foundation: { x: 48, y: 3, w: 8, h: 5, doorX: 3 }, td_levex: { x: 58, y: 2, w: 11, h: 6, doorX: 5 },
      td_house1: { x: 3, y: 9, w: 5, h: 4, doorX: 2 }, td_house2: { x: 9, y: 9, w: 5, h: 4, doorX: 2 },
      td_arena: { x: 3, y: 15, w: 11, h: 6, doorX: 5 }, td_guild: { x: 16, y: 15, w: 7, h: 5, doorX: 3 },
      td_sky_elevator: { x: 17, y: 25, w: 3, h: 2, doorX: 1 }, td_tavern: { x: 3, y: 25, w: 8, h: 5, doorX: 3 }, td_house3: { x: 2, y: 37, w: 5, h: 4, doorX: 2 },
      td_item: { x: 25, y: 28, w: 8, h: 5, doorSide: 'right', doorY: 2 }, td_weapon: { x: 25, y: 35, w: 8, h: 5, doorSide: 'right', doorY: 2 },
      td_inn: { x: 39, y: 28, w: 8, h: 5, doorSide: 'left', doorY: 2 }, td_armor: { x: 39, y: 35, w: 8, h: 5, doorSide: 'left', doorY: 2 },
      td_lab: { x: 40, y: 15, w: 7, h: 5, doorX: 3 }, x72_hall: { x: 49, y: 15, w: 8, h: 5, doorX: 3 }, x72_house: { x: 59, y: 15, w: 7, h: 5, doorX: 3 },
      x72_ex0: { x: 49, y: 24, w: 7, h: 5, doorSide: 'left', doorY: 2 }, x72_ex1: { x: 49, y: 31, w: 7, h: 5, doorSide: 'left', doorY: 2 }, x72_ex4: { x: 49, y: 38, w: 7, h: 5, doorSide: 'left', doorY: 2 },
      x72_ex2: { x: 58, y: 24, w: 7, h: 5, doorSide: 'left', doorY: 2 }, x72_ex3: { x: 58, y: 31, w: 7, h: 5, doorSide: 'left', doorY: 2 },
      x72_tower: { x: 64, y: 36, w: 6, h: 6, doorX: 2 }
    },
    npcs: {
      td_guide: [31, 40, 'down', 0], td_crier: [30, 11, 'down', 1], td_investor: [41, 12, 'down', 1], td_child: [20, 30, 'down', 1], td_merchant: [39, 24, 'down', 1],
      td_galva: [5, 35, 'right', 0], td_bankrupt1: [3, 34, 'down', 0], td_bankrupt2: [9, 38, 'left', 0], td_bankrupt3: [11, 35, 'left', 0],
      aunt67_tradia: [21, 12, 'down', 1], td_elevator_staff: [20, 27, 'left', 0],
      tradia_x72_kid: [60, 23, 'down', 1], tradia_x72_vendor: [66, 22, 'down', 0], tradia_x72_elder: [52, 23, 'down', 0],
      tradia_a73_0: [45, 24, 'down', 2], tradia_a73_1: [36, 12, 'down', 2], tradia_a73_2: [24, 24, 'down', 2], tradia_a73_3: [20, 13, 'down', 2], tradia_a73_4: [7, 40, 'down', 2], tradia_a73_5: [4, 41, 'down', 2],
      u73_genius: [44, 23, 'down', 1], u73_packet: [40, 33, 'down', 1]
    },
    events: [[25, 37, 32, 41], [19, 8, 32, 9], [29, 8, 39, 9], [14, 36, 16, 29], [61, 18, 40, 23]],
    chests: { td1: [68, 26], td2: [12, 41] },
    warps: [].concat([AX, AX + 1, AX + 2, AX + 3].map(function (x) { return { x: x, y: H - 1, to: 'world_magicka', tx: 60, ty: 81, name: '町の外へ' }; }),
      [{ x: 18, y: 26, to: 'tradia_sky', tx: 19, ty: 19, name: '空の区画へ', ride: 'up', ask: 'エレベーターに乗って、空の区画へ行きますか？' }]),
    anchors: [[16, 36, 18, 27], [16, 37, 18, 28], [22, 37, AX, 39], [23, 37, AX + 1, 39], [24, 37, AX + 2, 39], [25, 37, AX + 3, 39], [22, 38, AX, 40], [23, 38, AX + 1, 40], [24, 38, AX + 2, 40], [25, 38, AX + 3, 40]],
    after: function (def) {
      def.events.forEach(function (e) {
        if (e.x === 32 && e.y === 41) e.text = ['【案内板】相場都市トレディア\n北：相場通りの突き当たりに証券市場と情報板（相場の表）。広場の西に富豪の屋敷・銀行、東に財団本部・レバレッジ取引所\n西：闘技場通り（闘技場・ギルド）と、空への塔（エレベーターで空の区画へ）・酒場\n東：テック街（相場研究所・研究室・工房の小路・展望塔）\n相場通りの両わき：道具屋・武器店・宿屋・防具店'];
        if (e.x === 40 && e.y === 23) e.text = ['【テック街】', '相場研究所とトレーダーの研究室。南の工房の小路に、パン屋・古道具屋・花屋・画家のアトリエ・学者の家。', '小路のいちばん奥に展望塔。'];
      });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'tradia_x72_kid') n.talk = say('子ども', ['工房の小路の奥の展望塔、てっぺんまで登ったことある？　相場都市トレディアがぜんぶ見えるんだよ！', '下から見ると大きな建物も、上から見ると小さな四角なんだって。']);
        if (n.id === 'tradia_x72_elder') n.talk = say('町の古老', ['このテック街も、昔はただの空き地だった。少しずつ家が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('tradia', 'v81_tradia_view', { x: AX + 2, y: 3, z: 14, dist: 30, pitch: 34 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
