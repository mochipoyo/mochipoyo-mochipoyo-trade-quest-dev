/* =========================================================
   Data / v8.1 砂都サハル（sahar_city）：井戸を中心に、弧を描く日陰の回廊と放射状の抜け道
   ・住む理由：北のオアシスから引いた水路と、町の真ん中の深い井戸。水を分ける町
   ・入口から最初に見える物：南の門をくぐると、まっすぐの抜け道の先に、日よけの布を張った円い回廊と、その真ん中の井戸の広場
   ・道：井戸の広場（石畳）→ 木陰の輪 → 円い日陰の回廊（屋根つき）→ 回廊から 4 方向と斜め 3 方向へ抜け道
     北の抜け道はオアシスと祠へ（水路が並んで流れ、給水場＝水番所の前を通る）。北東は天幕の市場、南西は宿と道具屋、南東は隊商の囲い
   ・境界：土の城壁（防御型）。出入りは南の門だけ
   ・増築地区（旧・東の隊商宿通り）の物見やぐら・隊商の家・隊商宿・仕立て屋は、城壁の角・隊商の囲い・天幕の市場へ移した
   ・建物の id・中の地図・人・出来事はそのまま（位置だけ）。座標は js/rpg/remake81.js が旧座標から写す
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 60, H = 44, CX = 30, CY = 22;
  function rows(canvas) {
    var C = canvas(W, H, 's');
    C.frame(0, 0, W, H, 'C'); C.set(29, H - 1, 'P'); C.set(30, H - 1, 'P');
    // オアシス（北）と岸のやし
    for (var y = 1; y < 11; y++) for (var x = 1; x < W - 1; x++) { var e = Math.pow((x - 27.5) / 7.5, 2) + Math.pow((y - 4.5) / 3.3, 2); if (e < 1) C.set(x, y, '~'); }
    [[18, 3], [19, 7], [36, 2], [37, 6], [24, 9], [33, 9]].forEach(function (p) { C.set(p[0], p[1], '6'); });
    // 井戸の広場・木陰の輪・円い回廊
    for (var yy = 1; yy < H - 1; yy++) for (var xx = 1; xx < W - 1; xx++) { var d = Math.sqrt((xx - CX) * (xx - CX) + (yy - CY) * (yy - CY)); if (d < 4.6) C.set(xx, yy, 'P'); else if (d < 6.5) C.set(xx, yy, ','); else if (d < 8.6) C.set(xx, yy, '='); }
    C.set(CX, CY, 'j'); [[CX - 2, CY - 2], [CX + 2, CY - 2], [CX - 2, CY + 2], [CX + 2, CY + 2]].forEach(function (p) { C.set(p[0], p[1], 'e'); });
    [[25, 18], [35, 18], [25, 26], [35, 26], [24, 22], [36, 22], [30, 16], [30, 28]].forEach(function (p) { C.set(p[0], p[1], '6'); });
    // 抜け道（4 方向・斜め 3 方向）。木陰の輪を通るところは石畳
    C.rect(29, 10, 2, 7, 'r'); C.rect(29, 29, 2, H - 30, 'r'); C.rect(2, 21, 20, 2, 'r'); C.rect(38, 21, W - 40, 2, 'r');
    C.rect(29, 15, 2, 3, 'P'); C.rect(29, 27, 2, 3, 'P'); C.rect(23, 21, 3, 2, 'P'); C.rect(35, 21, 3, 2, 'P');
    C.path([[36, 15], [41, 10]], 'r', 2); C.path([[23, 28], [19, 32]], 'r', 2); C.path([[36, 28], [44, 34]], 'r', 2);
    // 水路（オアシス → 給水場の前 → 広場のそば）
    C.rect(31, 10, 1, 6, '~');
    // 北東：天幕の市場（露店の列・通り）
    C.rect(36, 7, W - 38, 2, 'r'); [[44, 11], [47, 11], [44, 15], [47, 15]].forEach(function (p) { C.set(p[0], p[1], 'A'); });
    // 南東：隊商の囲い（柵・水桶）
    C.frame(46, 34, 11, 8, 'x'); C.rect(47, 35, 9, 6, 's'); C.set(46, 37, 's'); C.set(55, 36, 'q'); C.set(48, 40, 'z');
    // 門の内側の小さな広場・灯
    C.rect(25, 39, 10, 4, 'P'); C.set(27, 38, 'y'); C.set(32, 38, 'y'); C.set(28, 33, 'y'); C.set(31, 33, 'y');
    // 西：羊の囲い・物見やぐらの前
    C.frame(2, 10, 6, 5, 'x'); C.rect(3, 11, 4, 3, ','); C.set(4, 14, ',');
    [[9, 39], [13, 41], [52, 24], [57, 18], [3, 30], [22, 38]].forEach(function (p) { C.set(p[0], p[1], '6'); });
    return C;
  }
  R.define('sahar_city', {
    version: 1, rows: rows, arrive: [29, 40],
    buildings: {
      x72_tower: { x: 2, y: 2, w: 6, h: 6, doorX: 2 },
      guild: { x: 10, y: 9, w: 10, h: 6, doorX: 4 },
      a3_sahar_water: { x: 13, y: 16, w: 6, h: 4, doorX: 2 },
      water: { x: 32, y: 9, w: 8, h: 5, doorX: 3 },   // 水番所＝給水場（水路のとなり）
      church: { x: 39, y: 1, w: 8, h: 5, doorX: 3 },   // オアシスの祠
      x72_ex0: { x: 48, y: 2, w: 7, h: 5, doorX: 3 }, weapon: { x: 55, y: 2, w: 4, h: 4, doorX: 1 },
      weapon_stall76: { x: 50, y: 10, w: 4, h: 2, doorX: 1 }, armor_stall76: { x: 50, y: 14, w: 4, h: 2, doorX: 1 }, bread_stall76: { x: 42, y: 17, w: 3, h: 2, doorX: 1 },
      inn: { x: 10, y: 26, w: 8, h: 5, doorSide: 'right', doorY: 2 }, item: { x: 10, y: 33, w: 8, h: 5, doorSide: 'right', doorY: 2 },
      armor: { x: 40, y: 26, w: 4, h: 4, doorX: 1 }, x72_house: { x: 46, y: 26, w: 7, h: 5, doorX: 3 },
      x72_hall: { x: 36, y: 36, w: 8, h: 5, doorSide: 'left', doorY: 2 }
    },
    npcs: {
      sh_gate: [31, 41, 'left', 0], sh_child: [26, 25, 'down', 1], sh_weaver: [45, 13, 'down', 1], sh_old: [27, 20, 'right', 0], aunt67_sahar_city: [35, 22, 'down', 1],
      saharcity_x72_kid: [50, 38, 'down', 1], saharcity_x72_vendor: [42, 13, 'down', 0], saharcity_x72_elder: [45, 31, 'down', 0],
      sahar_city_a73_0: [34, 19, 'down', 2], sahar_city_a73_1: [26, 24, 'down', 2], sahar_city_a73_2: [51, 37, 'down', 1], sahar_city_a73_3: [54, 39, 'down', 1],
      sahar_city_a73_4: [4, 12, 'down', 1], sahar_city_a73_5: [56, 30, 'down', 2], u73_mirage: [56, 9, 'left', 0],
      sahar_weapon_stall76: [51, 10, 'down', 0], sahar_armor_stall76: [51, 14, 'down', 0], sahar_bread76: [43, 17, 'down', 0]
    },
    events: [[18, 24, 26, 8], [47, 12, 45, 33]],
    chests: { sh1: [58, 9] },
    points: { sp_sahar_city_7_20: [6, 24], sp_sahar_city_29_12: [27, 13], opt_085: [33, 20] },
    anchors: [[19, 27, 29, 39], [20, 27, 30, 39], [19, 28, 29, 40], [20, 28, 30, 40]],   // 前の南の門の内側 → 新しい南の門の内側
    warps: [{ x: 29, y: H - 1, to: 'world_desert', tx: 50, ty: 35 }, { x: 30, y: H - 1, to: 'world_desert', tx: 50, ty: 35 }],
    after: function (def) {
      def.events.forEach(function (e) {
        if (e.x === 45 && e.y === 33) e.text = ['【隊商の囲い】', '南の門から入った隊商は、ここでらくだを休ませる。囲いの西に隊商宿、北に隊商の家。'];
      });
      // 水の音：水路・給水場（水番所）の前・井戸・オアシスの岸の近くで聞こえる（js/ui/ambient81.js）
      def.waterSound81 = [{ x: 31, y: 12, r: 8 }, { x: 33, y: 14, r: 7 }, { x: 30, y: 22, r: 5, v: 0.6 }, { x: 27, y: 8, r: 9, v: 0.8 }];
      def.arcades81 = [{ kind: 'ring', cx: CX + 0.5, cy: CY + 0.5, r: 7.5, w: 2, gaps: [0, 90, 180, 270, -49, 139, 45], gapW: 1.5 }];
    }
  });
  // 初めて砂都に入ったとき（3D）：南の門から、抜け道の先の円い回廊と井戸の広場へ
  R.firstView('sahar_city', 'v81_sahar_view', { x: CX, y: 3, z: CY + 4, dist: 26, pitch: 40 }, 4000);

  /* ---------- 砂の宿：中庭（泉とやし）を、柱の回廊と客室が囲む ---------- */
  R.define('sahar_inn', {
    version: 1, arrive: [10, 13],
    rows: function (canvas) {
      var C = canvas(20, 15, ':'); C.frame(0, 0, 20, 15, '#'); C.set(10, 14, 'D');
      C.rect(6, 4, 8, 5, ','); C.rect(9, 6, 2, 2, 'Q'); [[6, 4], [13, 4], [6, 8], [13, 8]].forEach(function (p) { C.set(p[0], p[1], '6'); });
      [[5, 3], [8, 3], [11, 3], [14, 3], [5, 9], [8, 9], [11, 9], [14, 9], [5, 6], [14, 6]].forEach(function (p) { C.set(p[0], p[1], 'I'); });
      [3, 6, 9].forEach(function (y) { C.rect(1, y, 2, 1, '#'); C.rect(17, y, 2, 1, '#'); });   // 客室の仕切り
      [1, 4, 7].forEach(function (y) { C.set(1, y, 'E'); C.set(18, y, 'E'); }); C.set(1, 2, 'p'); C.set(18, 2, 'p'); C.set(1, 5, 'p'); C.set(18, 5, 'p'); C.set(1, 8, 'p'); C.set(18, 8, 'p');
      C.rect(6, 1, 8, 1, 'p'); C.set(15, 1, '<'); C.set(4, 1, '{');
      C.rect(3, 12, 3, 1, 'T'); C.set(14, 12, 'e'); C.set(15, 12, 'e'); C.set(1, 13, 'q'); C.set(18, 13, 'q'); C.rect(1, 10, 18, 1, ':');
      return C;
    },
    npcs: { sahar_inn_keeper: [4, 11, 'down', 0], sahar_inn_guest: [16, 5, 'left', 1] },
    warps: [{ x: 10, y: 14, to: 'sahar_city', tx: 11, ty: 7 }, { x: 15, y: 1, to: 'sahar_inn_x72_2f', tx: 9, ty: 2 }],
    anchors: [[13, 2, 15, 2]]
  });
})(typeof window !== 'undefined' ? window : globalThis);
