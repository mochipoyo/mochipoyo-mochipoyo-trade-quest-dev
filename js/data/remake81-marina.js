/* =========================================================
   Data / v8.1 港町マリナ（harbor_town）：埠頭を見下ろす高台の町（港・斜面型）
   ・住む理由：入り江の埠頭と、西の浜の船着き場。網と魚と荷を扱う人の町
   ・入口から最初に見える物：北の街道から入ると、高台の通り（高い生活道）の先に海。坂を下りた正面に長い桟橋と修理中の船
   ・道：高台（段 1）に、埠頭と平行に東西の「高い生活道」。宿屋・道具屋・網元の家・酒場は高台。酒場は段の縁に建ち、窓の下が埠頭
     高台と埠頭（段 0）は、真ん中の坂（街道の続き）と、西・東の階段でつながる。埠頭には市場・倉庫・網を干す荷役場・船乗りの酒場・漁師の家
   ・境界：北・東・西の陸は開いている（外周から外へ。北の街道の出口はワープ）。南は海で、桟橋の先へは出られない
     乗船地点は西の浜の先（浜の西の端から「船着き場」へ。自分の船が泊まっている所）。陸の出口と分けて立て札で示す
   ・増築地区（旧・東の桟橋通り）の灯台・網元の家・船乗りの酒場は、防波堤の先・高台・埠頭の東へ移した
   ・建物の id・中の地図・人・出来事はそのまま（位置だけ）。座標は js/rpg/remake81.js が旧座標から写す
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 76, H = 40, LY = 16;   // LY：段の縁（擁壁）の行。上が高台（段 1）、下が埠頭（段 0）
  function rows(canvas) {
    var C = canvas(W, H, '.');
    /* ---------- 海・浜・埠頭（段 0） ---------- */
    C.rect(0, 26, W, H - 26, '~'); C.rect(0, 26, W, 2, 'w'); C.rect(0, 17, W, 9, '=');
    C.rect(0, 23, 12, 5, 's'); C.rect(0, 28, 9, 2, 'w');   // 西の浜（船着き場への道）
    C.rect(0, 24, 3, 4, 'd');   // 浜の西の端の板敷き（船着き場へ）
    C.rect(36, 24, 4, 11, 'd'); C.rect(40, 32, 11, 1, 'd');   // 長い桟橋と、船の横の板敷き
    C.rect(14, 26, 2, 6, 'd'); C.rect(56, 26, 2, 5, 'd');   // 小さな釣り桟橋
    C.rect(72, 26, 2, 12, 'd'); C.rect(63, 37, 11, 1, 'd'); C.rect(63, 30, 8, 7, '=');   // 防波堤と灯台の岩場
    C.rect(41, 28, 10, 4, '~');   // 船の場所
    // 市場の露店・荷役場（網を干す柵・木箱・樽）
    [16, 19, 22].forEach(function (x) { C.set(x, 21, 'A'); });
    C.rect(47, 18, 6, 1, 'x'); C.rect(47, 20, 6, 1, 'x'); [[54, 18], [55, 18], [56, 20], [58, 19], [59, 21], [54, 21]].forEach(function (p, i) { C.set(p[0], p[1], i % 2 ? 'q' : 'z'); });
    C.set(60, 24, 'y'); C.set(35, 24, 'y'); C.set(40, 24, 'y'); C.set(13, 24, 'y'); C.set(47, 25, 'e'); C.set(25, 24, 'e');
    /* ---------- 段の縁（擁壁）・階段・坂 ---------- */
    C.rect(0, LY, W, 1, '|'); C.set(12, LY, '/'); C.set(13, LY, '/'); C.set(42, LY, '/'); C.set(43, LY, '/'); C.rect(36, LY, 4, 1, ';');
    /* ---------- 高台（段 1） ---------- */
    C.rect(36, 0, 4, LY, '=');   // 北の街道（坂まで）
    C.rect(1, 9, W - 2, 2, '=');   // 高い生活道（埠頭と平行）
    C.rect(12, 11, 2, 5, '='); C.rect(42, 11, 2, 5, '=');   // 階段への小道
    // 見晴らしの庭（段の縁のベンチと灯）・裏の菜園と豚の囲い
    C.rect(15, 11, 20, 5, ','); [17, 21, 25, 29, 33].forEach(function (x) { C.set(x, 15, 'e'); }); C.set(19, 12, 'y'); C.set(31, 12, 'y'); C.set(24, 12, 'a'); C.set(25, 12, 'a');
    C.frame(2, 11, 8, 5, 'x'); C.rect(3, 12, 6, 3, ','); C.set(5, 11, ','); C.set(3, 12, 'H'); C.set(4, 12, 'H');
    C.rect(55, 11, 19, 5, ','); C.set(58, 13, '6'); C.set(66, 12, '6'); C.set(71, 14, '6'); C.set(62, 15, 'e'); C.set(68, 15, 'e');
    // 北の木立・庭
    [[1, 1], [2, 2], [45, 1], [47, 3], [50, 2], [64, 1], [66, 3], [69, 1], [72, 2], [73, 5], [70, 6], [14, 2], [33, 1]].forEach(function (p) { C.set(p[0], p[1], 'f'); });
    C.set(41, 4, 'a'); C.set(42, 4, 'a'); C.set(52, 6, 'a'); C.set(35, 3, 'y'); C.set(40, 7, 'y');
    return C;
  }
  function levels(w, h, rws) { var L = []; for (var y = 0; y < h; y++) { var s = ''; for (var x = 0; x < w; x++) { var c = rws[y].charAt(x); s += y < LY ? '1' : y > LY ? '0' : (c === '/' || c === ';') ? '0' : '1'; } L.push(s); } return L; }
  R.define('harbor_town', {
    version: 1, rows: rows, levels: levels, arrive: [37, 6],
    buildings: {
      inn: { x: 4, y: 3, w: 10, h: 6, doorX: 5 }, a3_harbor_net: { x: 16, y: 5, w: 6, h: 4, doorX: 2 }, item: { x: 23, y: 3, w: 12, h: 6, doorX: 5 },
      x72_house: { x: 56, y: 4, w: 7, h: 5, doorX: 3 },
      tavern: { x: 44, y: 11, w: 10, h: 5, doorSide: 'left', doorY: 2 },   // 段の縁に建つ酒場（窓の下が埠頭）
      house: { x: 2, y: 17, w: 8, h: 6, doorX: 3 }, warehouse: { x: 28, y: 17, w: 8, h: 6, doorX: 3 }, x72_hall: { x: 63, y: 18, w: 8, h: 5, doorX: 3 },
      bread_stall76: { x: 25, y: 20, w: 3, h: 2, doorX: 1 },
      ship: { x: 41, y: 28, w: 10, h: 4, doorX: 4 }, x72_tower: { x: 64, y: 30, w: 6, h: 6, doorX: 2 }
    },
    npcs: {
      sailor: [38, 27, 'down', 0], harbor_fisher: [15, 25, 'down', 2], harbor_vendor: [17, 22, 'up', 0], harbor_guard: [35, 2, 'down', 0],
      harbor_nagi: [39, 29, 'left', 0], harbor_shipwright: [43, 32, 'up', 0], aunt67_harbor_town: [28, 11, 'down', 1], s3121_harbor_board: [33, 23, 'down', 0],
      harbortown_x72_kid: [70, 33, 'left', 0], harbortown_x72_vendor: [57, 23, 'down', 0], harbortown_x72_elder: [62, 23, 'right', 0],
      harbor_town_a73_0: [30, 11, 'down', 2], harbor_town_a73_1: [48, 9, 'down', 2], harbor_town_a73_2: [6, 26, 'down', 2], harbor_town_a73_3: [26, 19, 'down', 2],
      harbor_town_a73_4: [60, 12, 'down', 2], harbor_town_a73_5: [6, 13, 'down', 2], harbor_town_a73_6: [7, 14, 'down', 2], harbor_town_a73_7: [4, 14, 'down', 1],
      u73_drif: [46, 25, 'down', 0], u73_sheri: [8, 25, 'left', 1], tmaster_seiran: [27, 13, 'down', 0], harbor_bread76: [26, 20, 'down', 0]
    },
    events: [[4, 24, 35, 5], [55, 21, 61, 23]],
    chests: { harbor1: [59, 17] },
    points: { opt_003: [11, 13] },
    warps: [].concat(
      [0, 1].map(function (y) { return [36, 37, 38, 39].map(function (x) { return { x: x, y: y, to: 'world', tx: 22, ty: 71 }; }); }).reduce(function (a, b) { return a.concat(b); }, []),
      [24, 25, 26, 27].map(function (y) { return { x: 0, y: y, to: 'world', tx: 19, ty: 73, name: '船着き場へ' }; })),
    anchors: [[24, 2, 36, 5], [25, 2, 37, 5], [26, 2, 38, 5], [27, 2, 39, 5], [24, 3, 36, 6], [25, 3, 37, 6], [26, 3, 38, 6], [27, 3, 39, 6]],   // 前の北の門の内側の道 → 新しい北の街道（古いセーブ・物語で置く位置）
    edgeExits: [{ side: 'top', range: [0, 35] }, { side: 'top', range: [40, W - 1] }, { side: 'left', range: [0, LY - 1] }, { side: 'left', range: [LY + 1, 23] }, { side: 'right', range: [0, LY - 1] }, { side: 'right', range: [LY + 1, 25] }],
    after: function (def) {
      def.events.forEach(function (e) {
        if (e.x === 35 && e.y === 5) e.text = ['【立て札】港町マリナ\n高台の通り：宿屋・道具屋・網元の家・酒場（埠頭を見下ろす）\n坂と階段を下りた埠頭：市場・倉庫・荷役場・船乗りの酒場・漁師の家・長い桟橋と修理中の船\n西の浜の先：船着き場（自分の船が泊まっている所）\n陸の出口：北の街道（ポヨ村へ）'];
        if (e.x === 61 && e.y === 23) e.text = ['【荷役場と東の波止場】', '網を干す柵と、積み下ろしを待つ木箱。荷役場の東に船乗りの酒場。', '防波堤の先に小さな灯台がある。'];
      });
      // 船着き場へ：行き先は港の登録（Harbors の marina の land。地球の世界でも 2D 版でも、その世界の船着き場のマス）をそのまま使う
      // 船着き場へ：行き先は港の登録（Harbors の marina の land）。ワープの行き先は旧座標（World が今の世界の座標に直す）なので、
      // 地球の世界では「直すと land になる旧座標」を近くから探して使う（2D 版は land そのまま）。ほかのワープと同じ扱い（raw にしない）
      var cache = null; var oldLand = function () {
        if (cache) return cache; var h = root.Harbors && root.Harbors.get('marina'); var L = h ? h.land : { x: 19, y: 73 }; var MR = root.MapRemake;
        if (!MR || !MR.maps || !MR.maps.world) return { x: L.x, y: L.y };   /* 2D 版（世界の座標の直しなし）：land そのまま（覚えておかない） */
        for (var r = 0; r <= 14 && !cache; r++) for (var dy = -r; dy <= r && !cache; dy++) for (var dx = -r; dx <= r && !cache; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; var p = MR.pos('world', 19 + dx, 73 + dy); if (p.x === L.x && p.y === L.y) cache = { x: 19 + dx, y: 73 + dy }; }
        return cache || { x: 19, y: 73 }; };
      def.warps.forEach(function (q) { if (q.name !== '船着き場へ') return; q.face = 'left'; q.edgeSkip = true;
        Object.defineProperty(q, 'tx', { configurable: true, enumerable: true, get: function () { return oldLand().x; } });
        Object.defineProperty(q, 'ty', { configurable: true, enumerable: true, get: function () { return oldLand().y; } }); });
      def.events.push({ x: 4, y: 23, type: 'inspect', solid: true, v81: true, text: ['【船着き場】', 'この先、浜の西の端から船着き場へ。自分の船は、港の西の海に泊めてある。', '（浜から海へ向かって進めば乗れる。陸の出口は北の街道）'] });
      var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
      def.npcs.forEach(function (n) {
        if (n.id === 'harbortown_x72_kid') n.talk = say('子ども', ['防波堤の先の小さな灯台、てっぺんまで登ったことある？　港町マリナがぜんぶ見えるんだよ！', '下から見ると大きな建物も、上から見ると小さな四角なんだって。']);
        if (n.id === 'harbortown_x72_elder') n.talk = say('町の古老', ['この荷役場も、昔はただの砂浜だった。少しずつ板を敷いて、今の形になった。', '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']);
      });
    }
  });
  /* ---------- マリナの宿屋：船室のような小部屋（北）・魚の長机の食堂・海側の窓（南）・入口の帳場 ---------- */
  R.define('harbor_inn', {
    version: 1, arrive: [9, 10],
    rows: function (canvas) {
      var C = canvas(18, 12, '_'); C.frame(0, 0, 18, 12, '#'); C.set(9, 11, 'D');
      [4, 8, 12].forEach(function (x) { C.rect(x, 1, 1, 2, 'W'); });   // 船室の仕切り（板壁）
      [1, 5, 9].forEach(function (x) { C.set(x, 1, 'E'); C.set(x + 2, 1, 'q'); }); C.set(13, 1, 'E');
      C.set(15, 1, '<'); C.set(16, 1, '{');
      C.rect(3, 6, 8, 1, 'T'); C.rect(3, 5, 8, 1, 'e'); C.rect(3, 7, 8, 1, 'e');   // 魚の長机と長いす
      C.set(1, 5, 'y'); C.set(16, 5, 'q'); C.set(16, 6, 'q'); C.set(16, 8, 'x'); C.set(1, 8, 'x');   // 灯・樽・干した網
      C.rect(2, 11, 4, 1, 'o'); C.rect(12, 11, 4, 1, 'o');   // 海側の窓
      C.set(13, 8, 'T'); C.set(14, 8, 'T');   // 帳場
      return C;
    },
    npcs: { harbor_inn_keeper: [14, 7, 'down', 0], harbor_inn_guest: [6, 9, 'up', 1] },
    warps: [{ x: 9, y: 11, to: 'harbor_town', tx: 8, ty: 7 }, { x: 15, y: 1, to: 'harbor_inn_x72_2f', tx: 9, ty: 2 }],
    anchors: [[13, 2, 15, 2]]
  });

  // 初めて港町に入ったとき（3D）：北の街道から、高台の通りの先の海と長い桟橋・修理中の船へ
  R.firstView('harbor_town', 'v81_marina_view', { x: 38, y: 0, z: 24, dist: 30, pitch: 32 }, 4000);
})(typeof window !== 'undefined' ? window : globalThis);
