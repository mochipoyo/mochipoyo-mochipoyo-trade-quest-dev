/* =========================================================
   Data / v8.1 浮天城アエリアの庭園（aeria_garden_hi・aeria_garden_lo）：傾いた庭園
   ・住む理由：浮力炉で浮かぶ城の、空の庭園。城の傾きで、庭の水が東の低い側に寄っている
   ・入口から最初に見える物：船着き場からの門をくぐると、西の高い芝の段と、段の縁の向こうの東の低い池（傾き）。北に空のあずまや
   ・道：西の高い段（芝・生け垣・あずまや・水門）→ 段の縁の階段 2 か所 → 東の低い段。水門を開けると池の水が雲の海へ落ち、
     水の引いた底に、水没していた回廊への石段が現れる（aeria_garden_lo）
   ・境界：城の壁。出入りは南の門（船着き場へ）と、水の引いたあとの東の石段（回廊へ）
   ・2 つの状態（満水／水の引いた）は前と同じく別の地図。水門の台本が使う座標（水の引いた庭園の 3,9）も同じ場所（水門のとなり）
   ・船着き場（aeria_dock）・星界航行船の接舷の条件は変えていない
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  var W = 25, H = 18, LX = 12;   // LX：段の縁（西が高い段 1・東が低い段 0）
  function rows(hi) {
    return function (canvas) {
      var C = canvas(W, H, ':'); C.frame(0, 0, W, H, 'C'); C.set(6, H - 1, 'D');
      C.rect(1, 1, LX - 1, H - 2, ','); C.rect(1, 9, LX - 1, 1, ':'); C.rect(5, 10, 3, 7, ':');   // 西の高い段（芝）と、水門・門への石の道
      C.rect(LX, 1, 1, H - 2, '|'); C.set(LX, 4, '/'); C.set(LX, 13, '/');   // 段の縁と階段
      C.set(1, 9, 'U'); C.set(2, 9, 'v');   // 水門（1,9）とレバー（2,9）
      [[3, 3], [3, 4], [9, 6], [9, 7], [2, 14], [3, 14]].forEach(function (p) { C.set(p[0], p[1], 'f'); });   // 生け垣
      [[6, 3], [7, 3], [9, 13], [10, 13]].forEach(function (p) { C.set(p[0], p[1], 'a'); }); C.set(4, 2, 'I'); C.set(10, 2, 'I'); C.set(4, 11, 'I'); C.set(10, 11, 'I');
      C.set(7, 5, 'e');
      // 東の低い段：満水なら池、水が引けば石の底と回廊への石段
      C.rect(LX + 1, 1, W - LX - 2, H - 2, ':');
      if (hi) { C.rect(LX + 2, 5, W - LX - 3, 10, '~'); C.rect(LX + 1, 6, 1, 7, '~'); }
      else { C.rect(LX + 2, 5, W - LX - 3, 10, 'P'); C.set(20, 9, '>'); [[15, 6], [22, 13], [17, 12]].forEach(function (p) { C.set(p[0], p[1], 'q'); }); }
      C.set(LX + 2, 2, 'I'); C.set(W - 2, 2, 'I'); C.set(W - 2, 16, 'I');
      return C;
    };
  }
  function levels(w, h, rws) { var L = []; for (var y = 0; y < h; y++) { var s = ''; for (var x = 0; x < w; x++) { var c = rws[y].charAt(x); s += x < LX ? '1' : x === LX ? (c === '/' ? '0' : '1') : '0'; } L.push(s); } return L; }
  function after(hi) {
    return function (def) {
      def.arcades81 = [{ x: 3, y: 1, w: 8, h: 1, kind: 'arcade' }];   // 北の空のあずまや
      if (hi) def.waterSound81 = [{ x: 18, y: 9, r: 9, v: 0.7 }];
    };
  }
  R.define('aeria_garden_hi', {
    version: 1, rows: rows(true), levels: levels, arrive: [6, 16],
    events: [[2, 9, 2, 9], [9, 12, 6, 15]], chests: { ag1: [W - 3, 2] },
    warps: [{ x: 6, y: H - 1, to: 'aeria_dock', tx: 9, ty: 2 }], anchors: [[9, 12, 6, 16], [3, 9, 3, 9]], after: after(true)
  });
  R.define('aeria_garden_lo', {
    version: 1, rows: rows(false), levels: levels, arrive: [6, 16],
    events: [[2, 9, 2, 9], [9, 12, 6, 15]], chests: { ag2: [W - 3, 15] },
    warps: [{ x: 6, y: H - 1, to: 'aeria_dock', tx: 9, ty: 2 }, { x: 20, y: 9, to: 'aeria_corridor', tx: 1, ty: 7 }],
    anchors: [[9, 12, 6, 16], [3, 9, 3, 9], [15, 8, 19, 9]], after: after(false)
  });
})(typeof window !== 'undefined' ? window : globalThis);
