/* =========================================================
   Data / v8.1 灰鉱町ヴェルム（verum_town）：鉱山の斜面に段を刻んだ町（港・斜面型）
   ・住む理由：北の鉱山と鉱石工場。坑夫が段ごとに住み、働き、学ぶ
   ・入口から最初に見える物：南の門から、坂道が二つの擁壁を登って北の鉱山の門へ。いちばん上の段に鉱石工場と監督官の館
   ・道：段 0（下）＝坑夫の宿・学び舎・枯れた畑・立坑のやぐら・坑夫の休み処。段 1（中）＝工房の通り（屋外の長い作業台と炉）・労働者の宿舎・配給所
     段 2（上）＝鉱石工場・監督官の館・坑夫の長屋。段どうしは真ん中の坂と、左右の階段でつながる
     地下の集会所へは、工房の作業台の裏から労働者の宿舎へ入る（宿舎の中の階段。中の地図はそのまま）
   ・境界：柵で囲む（斜面型）。出入りは北の門（鉱山側の街道）と南の門
   ・増築地区（旧・東の坑夫通り）の立坑のやぐら・坑夫の長屋・休み処・アトリエは、それぞれの段へ移した
   ・建物の id・中の地図・人・出来事はそのまま（位置だけ）。物語の段階で出入りする人（解放の前後）もそのまま
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 64, H = 40, L1 = 12, L2 = 26, RX = 30;   // L1・L2：段の縁（擁壁）の行。RX：真ん中の坂道（30〜33）
  function rows(canvas) {
    var C = canvas(W, H, '8');
    C.frame(0, 0, W, H, 'x'); C.rect(RX, 0, 4, 1, 'r'); C.rect(RX, H - 1, 4, 1, 'r');
    C.rect(RX, 1, 4, H - 2, 'r');   // 真ん中の坂道（北の門 → 南の門）
    C.rect(2, 9, W - 4, 2, 'r'); C.rect(2, 19, W - 4, 2, 'r'); C.rect(2, 33, W - 4, 2, 'r');   // 段ごとの通り
    // 擁壁・坂・階段
    C.rect(1, L1, W - 2, 1, '|'); C.rect(1, L2, W - 2, 1, '|'); C.rect(RX, L1, 4, 1, ';'); C.rect(RX, L2, 4, 1, ';');
    C.set(13, L1, '/'); C.set(14, L1, '/'); C.set(54, L1, '/'); C.set(55, L1, '/'); C.set(12, L2, '/'); C.set(13, L2, '/'); C.set(48, L2, '/'); C.set(49, L2, '/');
    C.rect(13, 11, 2, 1, 'r'); C.rect(54, 11, 2, 1, 'r'); C.rect(13, 13, 2, 6, 'r'); C.rect(54, 13, 2, 6, 'r'); C.rect(12, 25, 2, 1, 'r'); C.rect(48, 25, 2, 1, 'r'); C.rect(12, 27, 2, 6, 'r'); C.rect(48, 27, 2, 6, 'r');
    // 段 2：鉱山の口（岩と鉱石）
    C.rect(1, 1, 2, 7, 'G'); C.set(3, 1, 'k'); C.set(13, 2, 'k'); C.set(14, 7, 'k'); C.set(24, 2, 'z'); C.set(25, 2, 'q'); C.set(36, 2, 'k'); C.set(60, 2, 'k'); C.set(61, 6, 'z');
    // 段 1：工房の通り（屋外の長い作業台・炉・道具かけ・木箱）
    C.rect(16, 15, 12, 1, 'T'); C.rect(16, 17, 12, 1, 'T'); C.set(28, 14, '('); C.set(15, 14, ')'); C.set(28, 18, 'z'); C.set(15, 18, 'q');
    C.set(45, 14, 'z'); C.set(47, 14, 'q'); C.set(58, 14, 'k'); C.set(60, 16, 'z');
    // 段 0：枯れた畑・学び舎の前の庭
    C.rect(36, 28, 8, 3, 'H'); C.set(26, 29, '6'); C.set(26, 31, 'a'); C.set(3, 36, 'z'); C.set(4, 36, 'q'); C.set(58, 36, '6');
    [[RX - 1, 4], [RX + 4, 4], [RX - 1, 16], [RX + 4, 16], [RX - 1, 30], [RX + 4, 30], [RX - 1, 37], [RX + 4, 37]].forEach(function (p) { C.set(p[0], p[1], 'y'); });
    return C;
  }
  function levels(w, h, rws) { var L = []; for (var y = 0; y < h; y++) { var s = ''; for (var x = 0; x < w; x++) { var c = rws[y].charAt(x); var st = c === '/' || c === ';'; s += y < L1 ? '2' : y === L1 ? (st ? '1' : '2') : y < L2 ? '1' : y === L2 ? (st ? '0' : '1') : '0'; } L.push(s); } return L; }
  R.define('verum_town', {
    version: 1, rows: rows, levels: levels, arrive: [31, 37],
    buildings: {
      factory: { x: 3, y: 2, w: 10, h: 6, doorX: 5 }, a3_verum_row: { x: 16, y: 3, w: 6, h: 4, doorX: 2 },
      overseer: { x: 40, y: 2, w: 10, h: 6, doorSide: 'left', doorY: 3 }, x72_house: { x: 52, y: 2, w: 7, h: 5, doorX: 3 },
      dorm: { x: 4, y: 13, w: 8, h: 6, doorX: 6 }, ration: { x: 36, y: 13, w: 8, h: 5, doorX: 3 }, bread_stall76: { x: 45, y: 16, w: 3, h: 2, doorX: 1 },
      x72_ex0: { x: 57, y: 13, w: 6, h: 5, doorX: 2 },
      inn: { x: 3, y: 27, w: 8, h: 6, doorX: 4 }, school: { x: 16, y: 27, w: 8, h: 5, doorX: 3 },
      x72_tower: { x: 44, y: 27, w: 4, h: 6, doorX: 2 }, x72_hall: { x: 52, y: 28, w: 8, h: 5, doorX: 3 }
    },
    npcs: {
      vt_gate_warden: [29, 2, 'down', 0], vt_house_guard: [38, 7, 'right', 0],
      vt_worker1: [18, 16, 'up', 1], vt_worker1b: [18, 16, 'up', 1], vt_worker2: [24, 16, 'down', 1], vt_worker2b: [24, 16, 'down', 1],
      vt_old: [38, 31, 'up', 0], vt_child: [24, 22, 'down', 2], vt_merchant: [44, 21, 'down', 0], vt_dissent: [36, 21, 'down', 1],
      aunt67_verum_town: [12, 21, 'down', 1], s3121_verum_girl: [28, 21, 'down', 0],
      verumtown_x72_kid: [58, 24, 'left', 1], verumtown_x72_vendor: [48, 21, 'down', 0], verumtown_x72_elder: [58, 21, 'down', 0],
      verum_town_a73_0: [4, 21, 'down', 2], verum_town_a73_1: [26, 11, 'down', 2], verum_town_a73_2: [60, 37, 'left', 2], verum_town_a73_3: [15, 22, 'down', 2],
      verum_town_a73_4: [36, 23, 'down', 1], verum_town_a73_5: [13, 36, 'down', 1], verum_town_a73_6: [26, 36, 'down', 2],
      u73_bardo: [26, 6, 'down', 1], tmaster_bard: [16, 21, 'down', 0], verum_town_bread76: [46, 16, 'down', 0]
    },
    events: [[20, 10, 34, 18], [36, 23, 39, 31], [59, 20, 58, 22]],
    chests: { vt1: [61, 36] },
    points: { sp_verum_town_13_11: [14, 11], sp_verum_town_8_11: [6, 11], opt_024: [60, 3] },
    anchors: [[22, 1, 30, 1], [23, 1, 31, 1], [24, 1, 32, 1], [25, 1, 33, 1], [22, 2, 30, 2], [23, 2, 31, 2], [24, 2, 32, 2], [25, 2, 33, 2], [23, 33, 30, 37], [24, 33, 31, 37], [25, 33, 32, 37], [26, 33, 33, 37], [23, 34, 30, 38], [24, 34, 31, 38], [25, 34, 32, 38], [26, 34, 33, 38]],   // 前の北・南の門の内側 → 新しい門の内側
    warps: [].concat([RX, RX + 1, RX + 2, RX + 3].map(function (x) { return { x: x, y: H - 1, to: 'world_grania', tx: 56, ty: 59 }; }),
      [RX, RX + 1, RX + 2, RX + 3].map(function (x) { return { x: x, y: 0, to: 'world_grania', tx: 56, ty: 57 }; })),
    after: function (def) {
      def.events.forEach(function (e) { if (e.x === 58 && e.y === 22) e.text = ['【工房の通り・東】', '中の段の東に、アトリエと露店。下の段には立坑のやぐらと坑夫の休み処。', '上の段の東の端に坑夫の長屋。']; });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'verumtown_x72_kid') n.talk = say('子ども', ['下の段の立坑のやぐら、てっぺんまで登ったことある？　灰鉱町ヴェルムがぜんぶ見えるんだよ！', '下から見ると大きな建物も、上から見ると小さな四角なんだって。']);
        if (n.id === 'verumtown_x72_elder') n.talk = say('町の古老', ['この斜面も、昔はただの岩場だった。少しずつ段を刻んで、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  R.firstView('verum_town', 'v81_verum_view', { x: RX + 2, y: 2, z: 18, dist: 32, pitch: 34 }, 4000);

  /* ---------- 坑夫の宿（鉱山の宿）：坑道のような梁の柱・壁ぞいの寝台・真ん中の炉・長靴かけ ---------- */
  R.define('verum_inn', {
    version: 1, arrive: [9, 10],
    rows: function (canvas) {
      var C = canvas(18, 12, ':'); C.frame(0, 0, 18, 12, '#'); C.set(9, 11, 'D');
      [1, 3, 5, 7].forEach(function (y) { C.set(1, y, 'E'); C.set(16, y, 'E'); });   // 壁ぞいの寝台（二段寝台のように並ぶ）
      [[4, 3], [13, 3], [4, 8], [15, 8]].forEach(function (p) { C.set(p[0], p[1], 'I'); });   // 坑道の梁の柱
      C.set(8, 5, '('); C.set(9, 5, '('); C.set(7, 4, 'e'); C.set(10, 4, 'e'); C.set(7, 6, 'e'); C.set(10, 6, 'e');   // 真ん中の炉
      C.set(1, 10, ')'); C.set(16, 10, ')'); C.set(2, 10, 'z'); C.set(6, 1, 'k'); C.set(11, 1, 'y'); C.set(15, 1, '<');
      C.set(12, 9, 'T'); C.set(13, 9, 'T');   // 帳場
      return C;
    },
    npcs: { verum_inn_keeper: [13, 8, 'down', 0], verum_inn_guest: [6, 6, 'right', 1] },
    warps: [{ x: 9, y: 11, to: 'verum_town', tx: 7, ty: 28 }, { x: 15, y: 1, to: 'verum_inn_x72_2f', tx: 9, ty: 2 }],
    anchors: [[13, 2, 15, 2]]
  });
})(typeof window !== 'undefined' ? window : globalThis);
