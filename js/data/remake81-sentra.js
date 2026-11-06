/* =========================================================
   Data / v8.1 王都セントラ（sentra_capital）：丘を三段に刻んだ王都。王宮まで一本の大階段
   ・住む理由：丘の上の王宮。中の段に市と役所、いちばん下の段に、家を取り上げられた人たちのテント村
   ・入口から最初に見える物：南の門をくぐると下の段のテント村。正面にまっすぐ上る王の大階段、その上の上の段に王宮
   ・道：王の大階段（下の段 → 中の段 → 上の段）。荷車は西と東の坂を回る。中の段は市の通り（宿・店・酒場・騎士団・監察官）、上の段は王宮の前庭と貴族の屋敷・公文書館
   ・境界：城壁（防御型）。出入りは南の門。王宮の門は物語の通行証まで閉じたまま（前と同じ）
   ・物語の人（親衛隊・オルド・改革のあとに出る人）・出来事はそのまま（位置だけ）
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 68, H = 40, RX = 32, L1 = 14, L0 = 28;   // RX：王の大階段（32〜35）・L1：上と中の段の縁・L0：中と下の段の縁
  function rows(canvas) {
    var C = canvas(W, H, '=');
    C.frame(0, 0, W, H, 'C'); C.rect(RX, H - 1, 4, 1, 'P');
    C.rect(1, L0 + 1, W - 2, H - L0 - 2, '.');   // 下の段：テント村（草地）
    [[6, 31], [10, 34], [15, 31], [19, 36], [43, 31], [47, 35], [52, 31], [57, 34], [26, 34]].forEach(function (p) { C.set(p[0], p[1], 'A'); });   // テント
    [[8, 36], [13, 37], [40, 36], [55, 37], [24, 31]].forEach(function (p, i) { C.set(p[0], p[1], i % 2 ? 'q' : 'z'); });
    C.rect(RX, 1, 4, H - 2, 'P');   // 王の通り（門 → 大階段 → 王宮）
    C.rect(1, 22, W - 2, 1, 'r');   // 中の段の市の通り
    // 段の縁・王の大階段・荷車の坂
    C.rect(1, L1, W - 2, 1, '|'); C.rect(RX, L1, 4, 1, '/'); C.rect(58, L1, 2, 1, ';'); C.rect(58, 15, 2, 7, 'r');
    C.rect(1, L0, W - 2, 1, '|'); C.rect(RX, L0, 4, 1, '/'); C.rect(8, L0, 2, 1, ';'); C.rect(8, 23, 2, 5, 'r');
    // 上の段：王宮の前庭（花壇・像）
    C.rect(24, 8, 20, 5, 'P'); [[25, 9], [42, 9], [25, 12], [42, 12]].forEach(function (p) { C.set(p[0], p[1], 'a'); }); C.set(28, 11, 'I'); C.set(39, 11, 'I');
    [[RX - 1, 17], [RX + 4, 17], [RX - 1, 25], [RX + 4, 25], [RX - 1, 32], [RX + 4, 32], [RX - 1, 37], [RX + 4, 37]].forEach(function (p) { C.set(p[0], p[1], 'y'); });
    [[3, 3], [13, 2], [64, 10], [2, 33], [65, 30], [62, 12]].forEach(function (p) { C.set(p[0], p[1], '6'); });
    return C;
  }
  function levels(w, h, rws) { var L = []; for (var y = 0; y < h; y++) { var s = ''; for (var x = 0; x < w; x++) { var c = rws[y].charAt(x); var st = c === '/' || c === ';'; s += y < L1 ? '2' : y === L1 ? (st ? '1' : '2') : y < L0 ? '1' : y === L0 ? (st ? '0' : '1') : '0'; } L.push(s); } return L; }
  R.define('sentra_capital', {
    version: 1, rows: rows, levels: levels, arrive: [RX + 1, 36],
    buildings: {
      palace: { x: 28, y: 2, w: 12, h: 6, doorX: 5 }, a3_sentra_noble: { x: 18, y: 3, w: 6, h: 4, doorX: 2 }, x72_hall: { x: 44, y: 2, w: 8, h: 5, doorX: 3 }, x72_house: { x: 54, y: 2, w: 7, h: 5, doorX: 3 },
      inn: { x: 3, y: 16, w: 8, h: 5, doorX: 3 }, item: { x: 13, y: 16, w: 8, h: 5, doorSide: 'right', doorY: 2 }, armor: { x: 22, y: 16, w: 8, h: 5, doorSide: 'right', doorY: 2 },
      tavern: { x: 38, y: 16, w: 8, h: 5, doorSide: 'left', doorY: 2 }, x72_ex1: { x: 48, y: 16, w: 7, h: 5, doorX: 3 }, x72_ex0: { x: 60, y: 16, w: 7, h: 5, doorX: 3 },
      x72_ex2: { x: 1, y: 23, w: 7, h: 5, doorSide: 'right', doorY: 2 }, knights: { x: 13, y: 23, w: 8, h: 5, doorSide: 'right', doorY: 2 }, office: { x: 38, y: 23, w: 8, h: 5, doorSide: 'left', doorY: 2 },
      x72_tower: { x: 50, y: 23, w: 6, h: 5, doorSide: 'right', doorY: 2 }, bread_stall76: { x: 24, y: 24, w: 3, h: 2, doorX: 1 }
    },
    npcs: {
      sc_guard: [31, 9, 'down', 0], sc_noble: [12, 9, 'down', 1], sc_camp_old: [8, 33, 'down', 0], sc_camp_merchant: [44, 33, 'down', 0], sc_ord: [22, 27, 'left', 0],
      sc_after1: [39, 31, 'down', 1], sc_dissent: [24, 33, 'down', 0], sc_family: [13, 33, 'down', 1], aunt67_sentra_capital: [28, 21, 'down', 1],
      sentracapital_x72_kid: [57, 27, 'down', 1], sentracapital_x72_vendor: [54, 22, 'down', 0], sentracapital_x72_elder: [47, 26, 'down', 0],
      sentra_capital_a73_0: [3, 35, 'down', 2], sentra_capital_a73_1: [28, 26, 'down', 2], sentra_capital_a73_2: [50, 10, 'down', 2], sentra_capital_a73_3: [46, 31, 'down', 2], sentra_capital_a73_4: [5, 37, 'down', 1], sentra_capital_a73_5: [50, 35, 'down', 2],
      u73_poire: [42, 10, 'down', 1], tmaster_mirea: [11, 27, 'down', 0], sentra_capital_bread76: [25, 24, 'down', 0]
    },
    events: [[23, 7, RX + 1, 8], [18, 32, 20, 33], [63, 17, 57, 23]],
    chests: { sc1: [62, 36] },
    warps: [RX, RX + 1, RX + 2, RX + 3].map(function (x) { return { x: x, y: H - 1, to: 'world_kalion', tx: 64, ty: 28, name: '王都の外へ' }; }),
    anchors: [[23, 8, RX + 1, 9], [22, 33, RX, 36], [23, 33, RX + 1, 36], [24, 33, RX + 2, 36], [25, 33, RX + 3, 36], [22, 34, RX, 37], [23, 34, RX + 1, 37], [24, 34, RX + 2, 37], [25, 34, RX + 3, 37]],
    after: function (def) {
      def.events.forEach(function (e) {
        if (e.x === 57 && e.y === 23) e.text = ['【中の段・東】', 'パン屋・仕立て屋・記録の塔。荷車の坂を上ると上の段（公文書館・書記官の家）。', '王の大階段の上は王宮の前庭。'];
      });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'sentracapital_x72_kid') n.talk = say('子ども', ['中の段の記録の塔、てっぺんまで登ったことある？　王都セントラがぜんぶ見えるんだよ！', '下から見ると大きな建物も、上から見ると小さな四角なんだって。']);
        if (n.id === 'sentracapital_x72_elder') n.talk = say('町の古老', ['この中の段の東も、昔はただの空き地だった。少しずつ家が建って、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('sentra_capital', 'v81_sentra_view', { x: RX + 2, y: 4, z: 16, dist: 32, pitch: 34 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
