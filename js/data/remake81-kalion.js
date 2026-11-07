/* =========================================================
   Data / v8.1 徴収都市カリオン（kalion_city）：すべての道が税務庁舎へ集まる、上と下に分かれた町
   ・住む理由：税を集める役所の町。上の段に役人と金持ち、下の段に配給で暮らす人たち、南の門のそばに灰の下町
   ・入口から最初に見える物：南の門をくぐると灰の下町。まっすぐの「徴収路」の先に関所の柵と大階段、その上に税務庁舎
   ・道：徴収路（門 → 下の市場通り → 関所と大階段 → 上の役所通り → 税務庁舎の広場と告示板）。下町の西の奥には細い抜け階段
   ・建物でできること：下の段＝配給商店・酒場・武器店・防具店・宿・教会・パン屋ほか、上の段＝税務庁舎・財務局・屋敷・公文書館・記録の塔
   ・境界：柵（防御型）。出入りは南の門だけ
   ・物語の人（兵・エルナと追っ手・改革のあとに出る人）・出来事はそのまま（位置だけ）
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 66, H = 40, RX = 30, LY = 16;   // RX：徴収路（30〜33）・LY：段の縁
  function rows(canvas) {
    var C = canvas(W, H, '=');
    C.frame(0, 0, W, H, 'x'); C.rect(RX, H - 1, 4, 1, 'r');
    C.rect(1, 28, 28, 11, '8');   // 灰の下町
    [[3, 30], [12, 29], [5, 37], [11, 36], [24, 31], [26, 37], [22, 29]].forEach(function (p, i) { C.set(p[0], p[1], i % 2 ? 'q' : 'z'); });
    C.rect(RX, 1, 4, H - 2, 'r');   // 徴収路
    C.rect(1, 25, W - 2, 2, 'r'); C.rect(34, 35, W - 35, 2, 'r'); C.rect(1, 13, W - 2, 2, 'r');   // 下の市場通り・南東の通り・上の役所通り
    // 段の縁・関所の大階段・下町の抜け階段
    C.rect(1, LY, W - 2, 1, '|'); C.rect(RX, LY, 4, 1, '/'); C.set(2, LY, '/'); C.set(2, 15, '=');
    C.set(28, 17, 'T'); C.set(29, 17, 'T'); C.set(34, 17, 'T'); C.set(35, 17, 'T'); C.set(27, 17, 'x'); C.set(36, 17, 'x');   // 関所の台と柵
    // 上の段：税務庁舎の広場と告示板・鐘の柱
    C.rect(24, 7, 16, 6, 'P'); C.set(RX - 3, 9, 'I'); C.set(RX + 6, 9, 'I'); [[25, 11], [38, 11]].forEach(function (p) { C.set(p[0], p[1], 'a'); });
    [[RX - 1, 20], [RX + 4, 20], [RX - 1, 31], [RX + 4, 31], [RX - 1, 4], [RX + 4, 4]].forEach(function (p) { C.set(p[0], p[1], 'y'); });
    [[22, 2], [39, 3], [63, 10], [64, 23], [45, 38], [2, 9]].forEach(function (p) { C.set(p[0], p[1], '6'); });
    return C;
  }
  function levels(w, h, rws) { var L = []; for (var y = 0; y < h; y++) { var s = ''; for (var x = 0; x < w; x++) { var c = rws[y].charAt(x); s += y < LY ? '1' : y === LY ? (c === '/' ? '0' : '1') : '0'; } L.push(s); } return L; }
  R.define('kalion_city', {
    version: 1, rows: rows, levels: levels, arrive: [RX + 1, 36],
    buildings: {
      finance: { x: 3, y: 2, w: 12, h: 6, doorSide: 'right', doorY: 3 }, a3_kalion_estate: { x: 17, y: 3, w: 4, h: 4, doorX: 1 }, tax: { x: 27, y: 2, w: 10, h: 5, doorX: 4 },
      x72_hall: { x: 42, y: 2, w: 8, h: 5, doorX: 3 }, x72_house: { x: 51, y: 2, w: 7, h: 5, doorX: 3 }, x72_tower: { x: 59, y: 2, w: 6, h: 6, doorX: 2 }, x72_ex0: { x: 42, y: 8, w: 7, h: 5, doorX: 3 },
      tavern: { x: 3, y: 19, w: 8, h: 5, doorX: 3 }, item: { x: 12, y: 19, w: 8, h: 5, doorX: 3 }, weapon: { x: 21, y: 19, w: 8, h: 5, doorSide: 'right', doorY: 2 },
      armor: { x: 35, y: 19, w: 8, h: 5, doorSide: 'left', doorY: 2 }, inn: { x: 44, y: 19, w: 8, h: 5, doorX: 3 }, x72_ex1: { x: 53, y: 19, w: 7, h: 5, doorX: 3 },
      bread_stall76: { x: 35, y: 27, w: 3, h: 2, doorX: 1 },
      church: { x: 36, y: 30, w: 8, h: 5, doorX: 3 }, x72_ex2: { x: 46, y: 30, w: 7, h: 5, doorX: 3 }, x72_ex3: { x: 55, y: 30, w: 7, h: 5, doorX: 3 }, x72_ex4: { x: 16, y: 30, w: 7, h: 5, doorX: 3 }
    },
    npcs: {
      kc_gate_soldier: [29, 36, 'right', 0], kc_plaza_soldier: [27, 18, 'down', 1], kc_rich: [20, 10, 'down', 1], kc_poor1: [9, 30, 'down', 1], kc_poor2: [26, 34, 'down', 1],
      kc_chaser: [8, 35, 'left', 0], kc_elna_npc: [6, 35, 'right', 0], kc_klaus: [37, 11, 'down', 0], kc_council: [34, 33, 'down', 0], kc_angry: [36, 12, 'down', 1], kc_newmerchant: [38, 28, 'down', 0],
      kc_doctor: [13, 31, 'down', 0], kc_baker: [39, 27, 'left', 0], aunt67_kalion_city: [19, 11, 'down', 1], s3121_kc_foundation: [25, 27, 'down', 0],
      kalioncity_x72_kid: [60, 10, 'down', 1], kalioncity_x72_vendor: [57, 11, 'down', 0], kalioncity_x72_elder: [50, 11, 'down', 0],
      kalion_city_a73_0: [22, 11, 'down', 2], kalion_city_a73_1: [6, 10, 'down', 2], kalion_city_a73_2: [41, 10, 'down', 2], kalion_city_a73_3: [24, 27, 'down', 2], kalion_city_a73_4: [52, 9, 'down', 1], kalion_city_a73_5: [3, 33, 'down', 2],
      u73_kenta: [26, 18, 'right', 0], kalion_city_bread76: [36, 27, 'down', 0]
    },
    events: [[28, 9, RX + 1, 10], [58, 15, 51, 15]],
    chests: { kc1: [63, 37] }, points: { sp_kalion_city_16_1: [21, 4] },
    warps: [RX, RX + 1, RX + 2, RX + 3].map(function (x) { return { x: x, y: H - 1, to: 'world_kalion', tx: 60, ty: 78, name: '町の外へ' }; }),
    anchors: [[22, 33, RX, 36], [23, 33, RX + 1, 36], [24, 33, RX + 2, 36], [25, 33, RX + 3, 36], [22, 34, RX, 37], [23, 34, RX + 1, 37], [24, 34, RX + 2, 37], [25, 34, RX + 3, 37]],
    after: function (def) {
      def.events.forEach(function (e) {
        if (e.x === 51 && e.y === 15) e.text = ['【上の役所通り・東】', '公文書館・書記官の家・記録の塔、学者の家。', '関所の大階段を上った上の段。下の段の市場通りに、花屋・仕立て屋・パン屋・古道具屋。'];
      });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'kalioncity_x72_kid') n.talk = say('子ども', ['上の段の記録の塔、てっぺんまで登ったことある？　徴収都市カリオンがぜんぶ見えるんだよ！', '下から見ると大きな建物も、上から見ると小さな四角なんだって。']);
        if (n.id === 'kalioncity_x72_elder') n.talk = say('町の古老', ['この上の役所通りも、昔はただの空き地だった。少しずつ役所が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('kalion_city', 'v81_kalion_view', { x: RX + 2, y: 3, z: 16, dist: 30, pitch: 36 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
