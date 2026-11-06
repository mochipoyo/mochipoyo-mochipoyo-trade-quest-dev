/* =========================================================
   Data / v8.1 ボラティリティア学院（volatilia）：丘の古い観測塔のまわりに、何代もかけて建てた学舎
   ・住む理由：星を読むための古い観測塔（天文観測室）。そのまわりに講義室・図書館・研究棟が足されていった
   ・入口から最初に見える物：南の門をくぐると、低い渡り廊下のアーチ越しに、すぐ正面の観測塔の青銅のドーム。床の子午線（真鍮の線）が門から観測塔まで続き、塔の後ろの北の中庭へも続く
   ・道：塔を囲む中庭から二本。西＝講義室と本館への短い道。東＝大図書館から書庫の回廊を通って観測塔の東の石段へ出る寄り道。どちらも中庭へ戻れる
     研究棟へは、中庭の南東から標本の箱と配管が増えていく側廊を通る。その先に意識研究所と地下実験施設の扉
   ・境界：まわりは石の塀（防御型）。出入りは南の門だけ（門の楼門が遠くからも見える。js/../WallGate3D.js）
   ・紋章：天球の目盛りと観測子午線（学院の徽章。3D の旗・額は共通の部品）。既存の映画の城・校章・寮名・制服などは写さない
   ・建物の id・中の地図・人・出来事はそのまま（位置だけ）。座標は js/rpg/remake81.js が旧座標から写す
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 60, H = 44, AX = 29;   // AX：子午線の列
  function rows(canvas) {
    var C = canvas(W, H, '.');
    C.frame(0, 0, W, H, 'C'); C.set(AX, H - 1, '='); C.set(AX + 1, H - 1, '=');   // 石の塀と南の門
    // 門の広場・渡り廊下（低い屋根。くぐると、すぐ正面に観測塔）
    C.rect(23, 38, 14, 5, '='); C.rect(21, 35, 16, 2, '=');
    // 中庭のまわりの歩廊・観測塔の前の広場
    C.frame(19, 13, 22, 23, '='); C.rect(19, 32, 22, 3, '=');
    // 子午線：門 → 観測塔の扉の前。塔の後ろ（北の中庭）にも続く
    C.rect(AX - 1, 32, 3, H - 33, '='); C.path([[AX, 32], [AX, H - 2]], '-'); C.rect(AX - 1, 14, 3, 10, '='); C.path([[AX, 14], [AX, 23]], '-');
    // 中庭（塔のまわりの芝生）・花壇・ベンチ・灯・小さな木
    C.blob(21, 15, [[0, 0], [1, 0], [0, 1]], 'a'); C.blob(37, 15, [[0, 0], [1, 0], [1, 1]], 'a'); C.blob(21, 29, [[0, 0], [0, 1], [1, 1]], 'a'); C.blob(37, 29, [[1, 0], [0, 1], [1, 1]], 'a');
    C.set(23, 19, 'e'); C.set(35, 19, 'e'); C.set(23, 25, 'e'); C.set(35, 25, 'e'); C.set(20, 14, 'y'); C.set(39, 14, 'y'); C.set(20, 33, 'y'); C.set(39, 33, 'y');
    C.blob(25, 16, [[0, 0], [1, 0]], '6'); C.blob(32, 16, [[0, 0], [1, 0]], '6');
    // 西：講義室と本館への短い道
    C.path([[19, 22], [18, 22], [18, 14], [18, 30], [19, 30]], '='); C.path([[18, 18], [10, 18]], '='); C.path([[18, 28], [10, 28]], '=');
    // 東：大図書館 → 書庫の回廊（西へ、観測塔の東の壁ぎわの石段へ）
    C.path([[40, 22], [48, 22]], '='); C.rect(34, 26, 10, 2, '='); C.rect(43, 22, 2, 5, '='); C.set(34, 26, 'P'); C.set(34, 27, 'P');   /* 回廊の上がり口（敷石） */
    // 南東：研究棟への側廊（標本の箱・配管・計器が両わきに増えていく）
    C.rect(40, 30, 14, 2, '='); C.rect(52, 30, 2, 9, '='); C.rect(44, 38, 14, 2, '=');
    [[41, 29, 'q'], [43, 29, 'z'], [44, 32, 'q'], [46, 29, 'z'], [47, 32, 'z'], [48, 29, '?'], [49, 32, 'q'], [50, 29, '?'], [51, 32, '?']].forEach(function (q) { C.set(q[0], q[1], q[2]); });
    // 北の庭（天文塔・学生寮・下宿・居住区・学者の家）への小道
    C.path([[18, 14], [18, 10], [6, 10]], '='); C.path([[14, 10], [14, 9]], '='); C.path([[AX, 13], [AX, 8], [56, 8]], '='); C.path([[20, 8], [AX, 8]], '='); C.path([[54, 8], [54, 15]], '=');
    C.path([[23, 40], [10, 40], [10, 37]], '='); C.path([[49, 39], [49, 41]], '=');
    // 塀ぞいの木
    [[2, 2], [2, 12], [2, 30], [57, 20], [57, 30], [20, 2], [39, 2], [3, 42], [57, 42]].forEach(function (q) { C.set(q[0], q[1], '6'); });
    C.set(33, 41, 'S');   // 銘板（門の内側）
    return C;
  }
  R.define('volatilia', {
    version: 1, rows: rows, pathChars: '=-',
    buildings: {
      va_obs: { x: 25, y: 24, w: 9, h: 8, doorX: 4, shape76: 'observatory81' },
      va_lecture: { x: 6, y: 13, w: 9, h: 5, doorX: 4 },
      va_main: { x: 6, y: 21, w: 10, h: 7, doorX: 4 },
      va_library: { x: 44, y: 16, w: 10, h: 6, doorX: 4 },
      va_quantum: { x: 41, y: 24, w: 9, h: 5, doorX: 4 },
      va_mind: { x: 41, y: 33, w: 10, h: 5, doorX: 5, shape76: null },
      va_under: { x: 54, y: 34, w: 5, h: 4, doorX: 2 },
      va_ancient: { x: 6, y: 32, w: 9, h: 5, doorX: 4 },
      va_dorm: { x: 50, y: 3, w: 9, h: 5, doorX: 4 },
      a3_vol_lodging: { x: 43, y: 3, w: 5, h: 5, doorX: 2 },
      x72_tower: { x: 3, y: 3, w: 6, h: 6, doorX: 3 },
      x72_house: { x: 11, y: 3, w: 7, h: 6, doorX: 3 },
      x72_hall: { x: 3, y: 37, w: 6, h: 5, doorX: 3, doorSide: 'right', doorY: 3 },
      x72_ex0: { x: 50, y: 40, w: 7, h: 3, doorX: 0, doorSide: 'left', doorY: 1 },
      x72_ex1: { x: 51, y: 10, w: 7, h: 5, doorX: 3 },
      bread_stall76: { x: 21, y: 30, w: 3, h: 2, doorX: 1 }
    },
    npcs: {
      va_gatekeeper: [28, 41, 'down', 0], va_student1: [12, 19, 'down', 1], va_student2: [36, 23, 'down', 1], aunt67_volatilia: [26, 22, 'down', 1],
      tmaster_volte: [36, 21, 'down', 0], u73_repeat: [15, 30, 'down', 1], volatilia_bread76: [22, 30, 'down', 0],
      volatilia_x72_kid: [48, 9, 'right', 1], volatilia_x72_vendor: [55, 16, 'down', 0], volatilia_x72_elder: [42, 8, 'left', 0]
    },
    events: [[22, 30, 33, 41], [48, 14, 50, 9]],
    chests: { va1: [49, 2] },
    points: { opt_056: [20, 3] },
    warps: [AX, AX + 1].map(function (x) { return { x: x, y: H - 1, to: 'world_tempus', tx: 100, ty: 89, name: '学院の外へ' }; }),
    keepWarp: function () { return false; },
    arrive: [AX, H - 3],
    after: function (def) {
      def.events.forEach(function (e) { if (e.v72 || (e.x === 50 && e.y === 9)) e.text = ['【書庫の回廊のそば】', '研究生の下宿・研究者の居住区・学者の家が、北東の塀ぞいに並ぶ。回廊を登ると、観測塔の前の広場へ出る。']; });
      // 3D：渡り廊下（低いアーチの屋根）・書庫の回廊・側廊（js/../Furniture81 ではなく three-src/src/world/Arcade81.js）
      def.arcades81 = [{ x: 21, y: 35, w: 16, h: 2, kind: 'arcade' }, { x: 35, y: 26, w: 9, h: 2, kind: 'cloister' }, { x: 43, y: 22, w: 2, h: 4, kind: 'cloister' }, { x: 40, y: 30, w: 12, h: 2, kind: 'aisle' }];
      def.crests81 = [{ x: AX + 1, y: 35.0, face: 's', kind: 'meridian', h: 3.45, size: 1.1, banner: true }];   // 渡り廊下の上：門から見える学院の徽章（天球の目盛りと子午線）
    }
  });
  /* ---------- 屋内（用途ごとの間取り。小さな画面でも、階段・話す人・調べる物が見える配置） ---------- */
  // 大図書館：壁いっぱいの高い書架が囲む吹き抜け。真ん中の閲覧席はまわりを一周できる。北の記録の机（カウンター越しに司書）。断片の入った書架は四方に散る
  R.define('vol_library', {
    version: 1, arrive: [11, 13],
    rows: function (canvas) {
      var C = canvas(22, 15, '_'); C.frame(0, 0, 22, 15, '#'); C.set(11, 14, 'D');
      C.rect(1, 1, 20, 1, 'K'); C.rect(1, 1, 1, 13, 'K'); C.rect(20, 1, 1, 13, 'K'); C.set(1, 12, '_'); C.set(1, 13, '_'); C.set(20, 12, '_'); C.set(20, 13, '_');
      C.rect(3, 3, 4, 1, 'K'); C.rect(15, 3, 4, 1, 'K'); C.rect(3, 11, 4, 1, 'K'); C.rect(15, 11, 4, 1, 'K');   // 島の書架（通路をつくる）
      C.rect(10, 3, 3, 1, 'T');   // 古い記録を広げた机（司書はカウンターの奥）
      C.rect(7, 5, 8, 5, 'p');   // 吹き抜けの下の敷物（回遊できる閲覧席）
      [[8, 6], [13, 6], [8, 8], [13, 8], [10, 7], [11, 7]].forEach(function (q) { C.set(q[0], q[1], 't'); });
      C.set(3, 7, '{'); C.set(18, 7, '{'); C.set(2, 13, 'q'); C.set(19, 13, 'q');
      return C;
    },
    npcs: { va_librarian: [11, 2, 'down', 0], va_reader: [9, 9, 'right', 0] },
    events: [[3, 3, 4, 3], [13, 5, 16, 3], [15, 1, 19, 1], [6, 6, 10, 7]],   // 断片 1〜3：左の低い棚・右の奥の棚・一番奥の棚の右端（司書の案内のとおり）／統計表：真ん中の机
    warps: [{ x: 11, y: 14, to: 'volatilia', tx: 8, ty: 18 }]
  });
  // 天文観測室：円い床・真ん中の天球儀（調べると目の前で回る）・北の望遠鏡・壁の背景放射の図と記録帳
  R.define('vol_observatory', {
    version: 1, arrive: [9, 13],
    rows: function (canvas) {
      var C = canvas(19, 15, ':'); C.frame(0, 0, 19, 15, '#'); var cx = 9, cy = 7;
      for (var y = 1; y < 14; y++) for (var x = 1; x < 18; x++) { var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy) * 1.25); if (d > 8.3) C.set(x, y, '#'); else if (d < 3.2 && d > 2.2) C.set(x, y, 'p'); }
      C.path([[cx, 3], [cx, 12]], '-'); C.path([[4, cy], [14, cy]], '-');   /* 床の子午線と赤道の真鍮の線（天球儀で交わる） */
      C.set(9, 14, 'D'); C.set(cx, cy, '*');   // 天球儀
      C.set(9, 2, '?'); C.set(8, 2, 'I'); C.set(10, 2, 'I');   // 望遠鏡（台と支柱）
      C.set(4, 3, '}'); C.set(14, 3, 'K'); C.set(3, 10, 't'); C.set(4, 10, 't'); C.set(15, 10, '{');   // 背景放射の図・記録帳の棚・観測日誌の机
      return C;
    },
    npcs: { va_astronomer: [12, 8, 'left', 0] },
    events: [[7, 3, 9, 2], [1, 1, 4, 3], [14, 1, 14, 3], [3, 4, 3, 10]],   // 望遠鏡・背景放射の図・記録帳・観測日誌の机
    warps: [{ x: 9, y: 14, to: 'volatilia', tx: 32, ty: 8 }],
    after: function (def) {
      // 天球儀：調べると目の前で回る（3D）。望遠鏡・図・記録帳を調べたときも少し回る。待たせない（文は 1 行）
      var spin = function (ms) { var fx = root.Remake81Fx = root.Remake81Fx || {}; fx.spinUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + ms; };
      def.events.forEach(function (e) { if (typeof e.run === 'function') { var r0 = e.run; e.run = async function (c, ev) { spin(2500); return r0.call(this, c, ev); }; } });
      def.events.push({ x: 9, y: 7, type: 'script', solid: true, v81: true, run: async function (c) {
        spin(6000); var d = root.State && root.State.data; var first = d && d.flags && !d.flags.v81_armillary; if (d && d.flags) d.flags.v81_armillary = true;
        await c.msg(first ? ['天球儀にふれると、真鍮の輪がゆっくり回りはじめた。', '輪の目盛りは、天の赤道・黄道・子午線。この学院の徽章と同じ形だ。'] : ['天球儀の輪が、また回りはじめた。']);
      } });
    }
  });
  // 講義室：奥の黒板と教壇（カウンター越しに講師）・段になった机の列（真ん中の通路に段）
  R.define('vol_lecture', {
    version: 1, arrive: [8, 11],
    rows: function (canvas) {
      var C = canvas(17, 13, '_'); C.frame(0, 0, 17, 13, '#'); C.set(8, 12, 'D');
      C.rect(5, 1, 7, 1, '}'); C.set(2, 1, 'K'); C.set(3, 1, 'K'); C.set(13, 1, 'K'); C.set(14, 1, 'K'); C.rect(7, 3, 3, 1, 'T');
      C.rect(1, 2, 15, 2, ':'); C.rect(7, 3, 3, 1, 'T');   /* 教壇のまわりは石の床 */
      C.rect(7, 4, 3, 7, 'p');   /* 真ん中の通路（敷物） */
      [5, 7, 9].forEach(function (y) { C.rect(2, y, 5, 1, 't'); C.rect(10, y, 5, 1, 't'); });
      C.set(1, 11, 'z'); C.set(15, 11, '{');
      return C;
    },
    npcs: { va_lecturer: [8, 2, 'down', 0], va_listener: [4, 8, 'up', 0] },
    events: [[5, 1, 3, 1]],
    warps: [{ x: 8, y: 12, to: 'volatilia', tx: 7, ty: 8 }]
  });
  // 量子物理研究室：左右に対になる測定台（計器）。あいだを真鍮の線（もつれの対）が結ぶ。奥に棚
  R.define('vol_quantum', {
    version: 1, arrive: [9, 11],
    rows: function (canvas) {
      var C = canvas(19, 13, '_'); C.frame(0, 0, 19, 13, '#'); C.set(9, 12, 'D');
      C.rect(1, 1, 5, 1, 'K'); C.rect(13, 1, 5, 1, 'K'); C.set(8, 1, '{'); C.set(10, 1, '{');
      C.rect(3, 4, 3, 2, '?'); C.rect(13, 4, 3, 2, '?');   // 対になる測定台
      C.path([[6, 5], [12, 5]], '-');   // 結ぶ線
      C.set(1, 8, 'v'); C.set(17, 8, 'v'); C.set(2, 10, 'z'); C.set(16, 10, 'q'); C.set(5, 9, 't'); C.set(13, 9, 't');
      return C;
    },
    npcs: { va_physicist: [9, 3, 'down', 0], va_qstudent: [15, 8, 'left', 1] },
    events: [[7, 1, 4, 4], [8, 1, 14, 4]],
    warps: [{ x: 9, y: 12, to: 'volatilia', tx: 32, ty: 17 }]
  });
  // 地下実験施設の入口：狭い通路・両わきの封印された装置と柱（低い梁）・わずかな灯り・奥の下り階段（番人）
  R.define('vol_under_gate', {
    version: 1, arrive: [6, 7],
    rows: function (canvas) {
      var C = canvas(14, 9, ':'); C.frame(0, 0, 14, 9, '#'); C.set(6, 8, 'D'); C.set(6, 1, '>');
      [[2, 2], [2, 4], [2, 6], [10, 2], [10, 4], [10, 6]].forEach(function (q) { C.set(q[0], q[1], '?'); C.set(q[0] + 1, q[1], '?'); });
      [[4, 2], [4, 5], [8, 2], [8, 5]].forEach(function (q) { C.set(q[0], q[1], 'I'); });
      C.set(5, 1, 'I'); C.set(7, 1, 'I');   /* 階段の両わきは低い梁の柱：守衛のマスを通らないと下りられない */
      C.set(1, 1, 'z'); C.set(12, 1, 'q'); C.set(4, 7, 'i'); C.set(8, 7, 'i');
      return C;
    },
    npcs: { va_underguard: [6, 2, 'down', 0] },
    warps: [{ x: 6, y: 8, to: 'volatilia', tx: 24, ty: 27 }, { x: 6, y: 1, to: 'vol_under_1', tx: 3, ty: 2 }]
  });
  // 学院長室：扉から奥の大きな机まで敷物の道。両側の書架・小さな天球儀（学院の徽章）・応接の机
  R.define('vol_dean', {
    version: 1, arrive: [7, 9],
    rows: function (canvas) {
      var C = canvas(15, 11, '_'); C.frame(0, 0, 15, 11, '#'); C.set(7, 10, 'D');
      C.rect(1, 1, 13, 1, 'K'); C.rect(5, 3, 5, 1, 'T'); C.rect(6, 4, 3, 6, 'p'); C.set(2, 3, '*'); C.set(12, 3, 'K');
      C.set(2, 7, 't'); C.set(3, 7, 't'); C.set(11, 7, 'K'); C.set(1, 9, 'I'); C.set(13, 9, 'I'); C.set(12, 5, '{');
      return C;
    },
    npcs: { va_dean: [7, 2, 'down', 0], va_secretary: [11, 8, 'left', 0] },
    warps: [{ x: 7, y: 10, to: 'volatilia', tx: 20, ty: 9 }]
  });

  // 意識研究所：奥の仮説の板・真ん中の静かな部屋（敷物と寝椅子）・西の観察席（計器とレバー、ガラスの柱）
  R.define('vol_mind', {
    version: 1, arrive: [8, 10],
    rows: function (canvas) {
      var C = canvas(17, 12, '_'); C.frame(0, 0, 17, 12, '#'); C.set(8, 11, 'D');
      C.rect(6, 1, 5, 1, '}'); C.set(1, 1, 'K'); C.set(2, 1, 'K'); C.set(14, 1, 'K'); C.set(15, 1, 'K');
      C.set(2, 4, '?'); C.set(2, 5, '?'); C.set(2, 6, 'v'); C.set(4, 3, 'I'); C.set(4, 7, 'I');
      C.rect(6, 4, 5, 4, 'p'); C.set(8, 5, 'E');
      C.set(15, 5, '{'); C.set(15, 8, 'z'); C.set(12, 8, 't'); C.set(13, 8, 't');
      return C;
    },
    npcs: { va_mind: [8, 3, 'down', 0] },
    events: [[6, 1, 8, 1]],
    warps: [{ x: 8, y: 11, to: 'volatilia', tx: 20, ty: 18 }]
  });
  // 古代文明研究室：遺跡の地図を貼った壁・長い仕分けの台（奥に研究者）・柵で囲った発掘の砂箱・出土品の棚
  R.define('vol_ancient', {
    version: 1, arrive: [9, 10],
    rows: function (canvas) {
      var C = canvas(18, 12, '_'); C.frame(0, 0, 18, 12, '#'); C.set(9, 11, 'D');
      C.rect(1, 1, 6, 1, 'K'); C.rect(11, 1, 6, 1, 'K'); C.rect(7, 1, 4, 1, '}');
      C.rect(3, 3, 12, 1, 'T');
      C.frame(5, 5, 8, 4, 'x'); C.rect(6, 6, 6, 2, 's'); C.set(8, 6, 'z'); C.set(10, 7, 'q');
      C.set(16, 4, '{'); C.set(16, 5, '{'); C.set(1, 9, 'z'); C.set(1, 10, 'z'); C.set(16, 10, 'q'); C.set(1, 5, '^');
      return C;
    },
    npcs: { va_ancient: [9, 2, 'down', 0], va_astudent: [4, 8, 'right', 0], ev65e_hagen: [14, 7, 'left', 0] },
    warps: [{ x: 9, y: 11, to: 'volatilia', tx: 3, ty: 27 }]
  });

  // 初めて学院に入ったとき（3D）：カメラが門から渡り廊下の上を通って観測塔のドームを映し、4 秒でふだんの追従に戻る（歩くのは止めない。2 回目からはしない）
  (root.MAP_ENTER_HOOKS = root.MAP_ENTER_HOOKS || []).push(function (m) {
    if (!m || m.id !== 'volatilia' || !R.applied.volatilia) return; var d = root.State && root.State.data; if (!d || !d.flags || d.flags.v81_acad_view) return;
    var A3 = root.MTQ3D; if (!A3 || !A3.camera || !A3.camera.setCine || (A3.mode3D && !A3.mode3D())) return;
    var t0 = Date.now(); var iv = setInterval(function () {
      var cur = A3.current && A3.current.map; if (Date.now() - t0 > 20000 || (root.World && root.World.map && root.World.map.id !== 'volatilia')) { clearInterval(iv); return; }
      if (!cur || cur.id !== 'volatilia' || A3.building) return; clearInterval(iv); d.flags.v81_acad_view = true;
      try { A3.camera.setCine({ x: AX + 0.5, y: 5, z: 31, dist: 27, pitch: 30 }); } catch (e) { /* カメラがなくても続ける */ }
      setTimeout(function () { try { A3.camera.setCine(null); } catch (e) { /* なし */ } }, 4000);
    }, 200);
  });
})(typeof window !== 'undefined' ? window : globalThis);
