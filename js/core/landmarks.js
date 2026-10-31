/* =========================================================
   Core / Landmarks : ワールドマップの町・城・洞窟・塔を「大きな建物の絵」で描く（v5.7）
   ・入口は従来どおり1マス（そのマスに乗ると入る）。絵は入口のマスの下端を基準に、上と左右へ大きく広がる
   ・地域の地面（fallback：草原・砂・雪・灰・闇の大地）で色合いを変える。同じ種類でも場所ごとに屋根の色が変わる
   ・画像ファイルは使わず、Canvas で一度だけ描いてキャッシュする（オリジナルのドット絵）
   ========================================================= */
(function (root) {
  'use strict';

  var Landmarks = { cache: {} };

  function hex(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function rgb(a) { return 'rgb(' + a.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))); }).join(',') + ')'; }
  function shade(c, k) { return rgb(hex(c).map(function (v) { return v * k; })); }
  function mix(c1, c2, t) { var a = hex(c1), b = hex(c2); return rgb(a.map(function (v, i) { return v + (b[i] - v) * t; })); }
  function hstr(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  // 1倍の論理ピクセルで描く小さな描画API
  function painter(w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; var ctx = c.getContext('2d');
    var g = {
      canvas: c, w: w, h: h,
      px: function (x, y, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); },
      rect: function (x, y, ww, hh, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); },
      tri: function (x0, y0, x1, y1, x2, y2, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath(); ctx.fill(); },
      poly: function (pts, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); },
      disc: function (cx, cy, r, col) { for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) g.px(cx + x, cy + y, col); },
      ellipse: function (cx, cy, rx, ry, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); },
      // 円柱（塔）：左が明るく右が暗い
      cyl: function (x, y, ww, hh, light, dark) { for (var i = 0; i < ww; i++) { var t = i / Math.max(1, ww - 1); g.rect(x + i, y, 1, hh, t < 0.25 ? light : t > 0.7 ? dark : mix(light, dark, (t - 0.25) / 0.45 * 0.6)); } },
      // 石積みの目地
      bricks: function (x, y, ww, hh, col, rowH) { rowH = rowH || 3; for (var yy = y + rowH; yy < y + hh; yy += rowH) { g.rect(x, yy, ww, 1, col); var off = ((yy - y) / rowH) % 2 ? 2 : 0; for (var xx = x + off; xx < x + ww; xx += 5) g.rect(xx, yy - rowH + 1, 1, rowH - 1, col); } },
      speckle: function (n, x0, y0, x1, y1, cols, seed) { var s = seed || 7; for (var i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; var x = x0 + s % (x1 - x0); s = (s * 1103515245 + 12345) & 0x7fffffff; var y = y0 + s % (y1 - y0); g.px(x, y, cols[i % cols.length]); } },
      // v6.2 線・光
      line: function (x0, y0, x1, y1, col, wdt) { ctx.strokeStyle = col; ctx.lineWidth = wdt || 1; ctx.beginPath(); ctx.moveTo(x0 + 0.5, y0 + 0.5); ctx.lineTo(x1 + 0.5, y1 + 0.5); ctx.stroke(); },
      ring: function (cx, cy, r, col, wdt) { ctx.strokeStyle = col; ctx.lineWidth = wdt || 1; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); },
      arc: function (cx, cy, r, a0, a1, col, wdt) { ctx.strokeStyle = col; ctx.lineWidth = wdt || 1; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke(); },
      glow: function (cx, cy, r, col) { if (!ctx.createRadialGradient) return; var gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); var c = hex(col); gr.addColorStop(0, 'rgba(' + c.join(',') + ',0.75)'); gr.addColorStop(1, 'rgba(' + c.join(',') + ',0)'); ctx.fillStyle = gr; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); },
      half: function (cx, cy, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.closePath(); ctx.fill(); },
      alpha: function (a, fn) { var o = ctx.globalAlpha; ctx.globalAlpha = a; fn(); ctx.globalAlpha = o; }
    };
    return g;
  }

  // 地域ごとの色
  var THEMES = {
    grass: { stone: '#c4c2cf', stoneL: '#e4e3ec', stoneD: '#8e8c9e', mortar: '#9d9bab', wall: '#f1e4c6', wallD: '#cdb68c', wood: '#7a4a28', roofs: ['#c8463c', '#d8742e', '#3f6fb8', '#b0533a', '#7a5ab0'], tree: '#3f8a36', treeL: '#62ad4a', treeD: '#29602a', rock: '#8c8478', rockL: '#b4ab9c', rockD: '#5e574e', flag: '#e84a4a', win: '#ffd86a' },
    sand: { stone: '#dcc28c', stoneL: '#f2dfb2', stoneD: '#a88a58', mortar: '#b89a66', wall: '#f4e2b4', wallD: '#d0b07a', wood: '#7a5a30', roofs: ['#d07a3a', '#3f8ab8', '#c89a3a', '#b8563a'], tree: '#5a9a3a', treeL: '#7aba4a', treeD: '#3a6a2a', rock: '#b08a5a', rockL: '#d0aa76', rockD: '#7a5a38', flag: '#3a8ad8', win: '#ffd86a' },
    snow: { stone: '#c9d1de', stoneL: '#eef2f8', stoneD: '#8c97aa', mortar: '#a8b2c4', wall: '#ece6da', wallD: '#c4baa8', wood: '#6a4a30', roofs: ['#4a6ab0', '#b84a4a', '#3a8a8a', '#6a5aa8'], snowcap: '#ffffff', tree: '#2f6a4a', treeL: '#4a8a66', treeD: '#1f4a36', rock: '#8a92a0', rockL: '#c4ccd8', rockD: '#5a6272', flag: '#4ab0e8', win: '#ffd86a' },
    ash: { stone: '#8c8490', stoneL: '#b4acb8', stoneD: '#5e5864', mortar: '#6e6874', wall: '#c8b8a2', wallD: '#9a8a76', wood: '#5a3a24', roofs: ['#8a3a2a', '#5a5a7a', '#9a5a2a'], tree: '#4a5a32', treeL: '#6a7a42', treeD: '#2e3a22', rock: '#6a5e58', rockL: '#8e827a', rockD: '#3e3632', flag: '#ff7a3a', win: '#ffb04a' },
    dark: { stone: '#5e5070', stoneL: '#857496', stoneD: '#3a3048', mortar: '#4a3e5a', wall: '#8a7a96', wallD: '#5e5070', wood: '#3a2a2a', roofs: ['#6a2a5a', '#3a2a5a', '#8a2a3a'], tree: '#3a3a4a', treeL: '#5a5a6a', treeD: '#22222e', rock: '#4a4258', rockL: '#6a6078', rockD: '#2a2436', flag: '#c03a5a', win: '#ff5a4a' }
  };
  THEMES.cloud = Object.assign({}, THEMES.grass, { stone: '#d8dcec', stoneL: '#f4f6ff', stoneD: '#9ca4c4', roofs: ['#4a8ad8', '#e8c040', '#d8586a'] });
  function themeFor(fallback, id) {
    if (/demon|dark_castle|maou/.test(id || '')) return THEMES.dark;
    return THEMES[{ sand: 'sand', desert: 'sand', snow: 'snow', ice: 'snow', ash: 'ash', slag: 'ash', lava: 'ash', darkland: 'dark', cloud: 'cloud' }[fallback] || 'grass'];
  }

  /* ---------- 城 ---------- */
  function drawCastle(T, seed) {
    var W = 72, H = 60, g = painter(W, H); var roof = T.roofs[seed % T.roofs.length], roof2 = T.roofs[(seed + 2) % T.roofs.length];
    g.ellipse(36, 56, 35, 4, 'rgba(0,0,0,0.28)');
    // 奥の小塔
    [[15, 22], [49, 22]].forEach(function (p) { g.cyl(p[0], p[1], 8, 18, T.stoneL, T.stoneD); g.tri(p[0] - 1, p[1] + 1, p[0] + 9, p[1] + 1, p[0] + 4, p[1] - 11, roof2); g.tri(p[0] + 4, p[1] - 11, p[0] + 9, p[1] + 1, p[0] + 4, p[1] + 1, shade(roof2, 0.75)); g.rect(p[0] + 3, p[1] + 6, 2, 3, T.win); });
    // 主塔
    g.cyl(24, 15, 24, 28, T.stoneL, T.stoneD); g.bricks(24, 15, 24, 28, T.mortar, 4);
    for (var wx = 27; wx < 46; wx += 6) { g.rect(wx, 21, 2, 3, T.win); g.rect(wx, 29, 2, 3, T.win); g.rect(wx, 20, 2, 1, shade(T.stoneD, 0.8)); }
    g.tri(21, 16, 51, 16, 36, 0, roof); g.tri(36, 0, 51, 16, 36, 16, shade(roof, 0.75)); g.rect(22, 15, 28, 2, shade(roof, 0.6));
    for (var ry = 4; ry < 15; ry += 3) g.rect(36 - (ry * 0.9), ry, (ry * 1.8), 1, shade(roof, 0.88));
    if (T.snowcap) g.tri(30, 6, 42, 6, 36, 0, T.snowcap);
    g.rect(35, -1, 1, 3, T.wood); g.rect(36, -1, 5, 2, T.flag);
    // 城壁と胸壁
    g.rect(8, 36, 56, 19, T.stone); g.rect(8, 36, 56, 2, T.stoneL); g.rect(8, 53, 56, 2, T.stoneD); g.bricks(8, 38, 56, 15, T.mortar, 3);
    for (var mx = 8; mx < 64; mx += 5) { g.rect(mx, 32, 3, 4, T.stone); g.rect(mx, 32, 3, 1, T.stoneL); g.rect(mx + 2, 33, 1, 3, T.stoneD); }
    // 門
    g.rect(30, 43, 12, 12, '#2a2230'); g.disc(36, 43, 6, '#2a2230'); g.rect(30, 43, 12, 1, '#2a2230');
    for (var gx = 31; gx < 42; gx += 2) g.rect(gx, 40, 1, 15, '#5a4a3a'); for (var gy = 44; gy < 55; gy += 3) g.rect(30, gy, 12, 1, '#5a4a3a');
    g.rect(29, 37, 14, 2, T.stoneD); g.rect(34, 34, 4, 4, '#d8b04a'); g.px(35, 35, T.flag); g.px(36, 36, T.flag);
    // 垂れ幕
    [21, 46].forEach(function (bx) { g.rect(bx, 38, 5, 9, T.flag); g.rect(bx, 38, 5, 1, '#d8b04a'); g.tri(bx, 47, bx + 5, 47, bx + 2.5, 49.5, T.flag); g.rect(bx + 2, 41, 1, 3, '#d8b04a'); });
    // 手前の角塔
    [[2, 26], [58, 26]].forEach(function (p, k) {
      g.cyl(p[0], p[1], 12, 29, T.stoneL, T.stoneD); g.bricks(p[0], p[1] + 4, 12, 25, T.mortar, 3);
      for (var m = 0; m < 12; m += 3) g.rect(p[0] + m, p[1] - 2, 2, 3, T.stone);
      g.tri(p[0] - 2, p[1], p[0] + 14, p[1], p[0] + 6, p[1] - 16, roof); g.tri(p[0] + 6, p[1] - 16, p[0] + 14, p[1], p[0] + 6, p[1], shade(roof, 0.75));
      if (T.snowcap) g.tri(p[0] + 2, p[1] - 9, p[0] + 10, p[1] - 9, p[0] + 6, p[1] - 16, T.snowcap);
      g.rect(p[0] + 6, p[1] - 20, 1, 4, T.wood); g.rect(p[0] + 7, p[1] - 20, 4, 2, k ? T.flag : roof2);
      g.rect(p[0] + 4, p[1] + 8, 3, 4, T.win); g.rect(p[0] + 4, p[1] + 18, 3, 4, T.win);
    });
    return g.canvas;
  }

  /* ---------- 町（家並み・教会・柵・木） ---------- */
  function house(g, T, x, base, w, h, rh, roof, opt) {
    opt = opt || {};
    g.rect(x, base - h, w, h, T.wall); g.rect(x + w - 2, base - h, 2, h, T.wallD); g.rect(x, base - 1, w, 1, shade(T.wallD, 0.85));
    if (opt.timber) { g.rect(x, base - h, w, 1, T.wood); g.rect(x + Math.floor(w / 2), base - h, 1, h, T.wood); }
    g.rect(x + Math.floor(w / 2) - 1, base - 4, 2, 4, T.wood); g.rect(x + 2, base - h + 2, 2, 2, T.win); if (w > 9) g.rect(x + w - 5, base - h + 2, 2, 2, T.win);
    var top = base - h; g.tri(x - 2, top + 1, x + w + 2, top + 1, x + w / 2, top - rh, roof); g.tri(x + w / 2, top - rh, x + w + 2, top + 1, x + w / 2, top + 1, shade(roof, 0.75));
    g.rect(x - 2, top, w + 4, 1, shade(roof, 0.6));
    if (T.snowcap) g.tri(x + w / 2 - rh * 0.55, top - rh * 0.45, x + w / 2 + rh * 0.55, top - rh * 0.45, x + w / 2, top - rh, T.snowcap);
    if (opt.chimney) { g.rect(x + w - 4, top - rh + 2, 2, 4, T.stoneD); }
  }
  function tree(g, T, x, y, r) { g.rect(x - 1, y, 2, r, T.wood); g.disc(x, y - 1, r, T.treeD); g.disc(x - 1, y - 2, r - 1, T.tree); g.disc(x - 2, y - 3, Math.max(1, r - 3), T.treeL); }
  function drawTown(T, seed) {
    var W = 88, H = 64, g = painter(W, H); var R = function (k) { return T.roofs[(seed + k) % T.roofs.length]; };
    g.ellipse(44, 60, 43, 4, 'rgba(0,0,0,0.25)');
    tree(g, T, 5, 30, 5); tree(g, T, 83, 28, 5); tree(g, T, 14, 16, 4); tree(g, T, 74, 15, 4); tree(g, T, 26, 10, 3); tree(g, T, 63, 9, 3);
    // 奥の列（教会を中心に）
    house(g, T, 10, 30, 12, 8, 6, R(0), { chimney: true });
    house(g, T, 25, 28, 11, 7, 6, R(1), { timber: true });
    house(g, T, 53, 28, 11, 7, 6, R(3), { chimney: true });
    house(g, T, 67, 30, 12, 8, 6, R(4), { timber: true });
    g.rect(38, 13, 12, 19, T.stoneL); g.rect(47, 13, 3, 19, T.stoneD); g.bricks(38, 16, 12, 16, T.mortar, 4);
    g.tri(36, 14, 52, 14, 44, -4, R(2)); g.tri(44, -4, 52, 14, 44, 14, shade(R(2), 0.75)); if (T.snowcap) g.tri(41, 3, 47, 3, 44, -4, T.snowcap);
    g.rect(43, -6, 1, 3, '#d8b04a'); g.rect(42, -5, 3, 1, '#d8b04a'); g.disc(44, 19, 2, T.win); g.rect(42, 25, 4, 7, T.wood); g.rect(42, 24, 4, 1, shade(T.wood, 1.3));
    // 中の列と広場（噴水）
    house(g, T, 5, 44, 14, 9, 6, R(2), { timber: true });
    house(g, T, 21, 43, 12, 8, 6, R(4));
    house(g, T, 55, 43, 12, 8, 6, R(0), { chimney: true });
    house(g, T, 69, 44, 14, 9, 6, R(1), { timber: true });
    g.ellipse(44, 39, 6, 3, T.stoneD); g.ellipse(44, 38, 5, 2, '#7ab8e8'); g.rect(43, 34, 2, 4, T.stoneL); g.px(44, 33, '#bfe4ff');
    // 町の城壁と門
    var wallY = 46;
    g.rect(1, wallY, 36, 9, T.stone); g.rect(51, wallY, 36, 9, T.stone); g.rect(1, wallY, 36, 1, T.stoneL); g.rect(51, wallY, 36, 1, T.stoneL); g.rect(1, wallY + 8, 36, 1, T.stoneD); g.rect(51, wallY + 8, 36, 1, T.stoneD);
    g.bricks(1, wallY + 1, 36, 7, T.mortar, 3); g.bricks(51, wallY + 1, 36, 7, T.mortar, 3);
    for (var mx = 1; mx < 37; mx += 4) g.rect(mx, wallY - 2, 2, 2, T.stone); for (var mx2 = 52; mx2 < 87; mx2 += 4) g.rect(mx2, wallY - 2, 2, 2, T.stone);
    [[32, 0], [50, 1]].forEach(function (q) { var x = q[0]; g.cyl(x, wallY - 9, 7, 18, T.stoneL, T.stoneD); for (var m = 0; m < 7; m += 3) g.rect(x + m, wallY - 11, 2, 2, T.stone); g.tri(x - 1, wallY - 10, x + 8, wallY - 10, x + 3.5, wallY - 18, R(q[1] + 2)); g.rect(x + 3, wallY - 22, 1, 4, T.wood); g.rect(x + 4, wallY - 22, 3, 2, T.flag); g.rect(x + 2, wallY - 5, 2, 3, T.win); });
    [[1, 0], [80, 1]].forEach(function (q) { var x = q[0]; g.cyl(x, wallY - 5, 7, 14, T.stoneL, T.stoneD); for (var m = 0; m < 7; m += 3) g.rect(x + m, wallY - 7, 2, 2, T.stone); });
    g.rect(39, wallY + 1, 10, 9, '#3a2a20'); g.disc(44, wallY + 1, 4, '#3a2a20'); g.rect(40, wallY + 3, 8, 7, '#6a4a2a'); g.rect(44, wallY + 3, 1, 7, '#3a2a20');
    g.poly([[38, 64], [50, 64], [48, 55], [40, 55]], '#c9a46a'); g.rect(41, 57, 6, 1, '#b08a52');
    tree(g, T, 30, 62, 3); tree(g, T, 58, 62, 3);
    return g.canvas;
  }

  /* ---------- 洞窟・ダンジョン ---------- */
  function drawCave(T, seed) {
    var W = 48, H = 40, g = painter(W, H);
    g.ellipse(24, 37, 23, 3, 'rgba(0,0,0,0.3)');
    [[24, 22, 15], [11, 28, 10], [37, 28, 10], [22, 13, 8], [31, 17, 8]].forEach(function (d) { g.disc(d[0], d[1], d[2], T.rockD); });
    [[23, 21, 14], [10, 27, 9], [36, 28, 9], [21, 12, 7], [30, 16, 7]].forEach(function (d) { g.disc(d[0], d[1], d[2], T.rock); });
    [[19, 16, 7], [8, 24, 5], [27, 10, 4], [33, 22, 4]].forEach(function (d) { g.disc(d[0], d[1], d[2], T.rockL); });
    g.speckle(40, 4, 6, 44, 34, [T.rockD, T.rockL], seed);
    if (T.snowcap) { g.disc(21, 8, 4, T.snowcap); g.disc(29, 11, 3, T.snowcap); } else { g.disc(14, 13, 3, T.tree); g.disc(33, 9, 2, T.tree); g.disc(40, 21, 2, T.treeL); }
    // 入口
    g.ellipse(24, 32, 8, 9, '#140f18'); g.ellipse(24, 33, 6, 7, '#06040a'); g.rect(16, 33, 16, 5, '#06040a');
    g.rect(14, 24, 2, 14, T.wood); g.rect(32, 24, 2, 14, T.wood); g.rect(13, 23, 22, 2, T.wood); g.rect(13, 23, 22, 1, shade(T.wood, 1.3));
    // 松明
    [10, 37].forEach(function (tx) { g.rect(tx, 27, 1, 6, '#5a3a1a'); g.rect(tx - 1, 24, 3, 3, '#ff8a2a'); g.px(tx, 23, '#ffe27a'); g.px(tx, 25, '#ffe27a'); });
    return g.canvas;
  }

  /* ---------- 塔・祭壇 ---------- */
  function drawTower(T, seed) {
    var W = 32, H = 66, g = painter(W, H); var roof = T.roofs[(seed + 1) % T.roofs.length];
    g.ellipse(16, 63, 14, 3, 'rgba(0,0,0,0.3)');
    g.cyl(8, 14, 16, 49, T.stoneL, T.stoneD); g.bricks(8, 14, 16, 49, T.mortar, 4);
    g.rect(6, 10, 20, 5, T.stone); g.rect(6, 10, 20, 1, T.stoneL); g.rect(6, 14, 20, 1, T.stoneD);
    for (var m = 6; m < 26; m += 4) { g.rect(m, 7, 2, 3, T.stone); g.rect(m, 7, 2, 1, T.stoneL); }
    g.tri(9, 8, 23, 8, 16, -4, roof); g.tri(16, -4, 23, 8, 16, 8, shade(roof, 0.75)); if (T.snowcap) g.tri(13, 1, 19, 1, 16, -4, T.snowcap);
    [22, 34, 46].forEach(function (y) { g.rect(15, y, 2, 4, T.win); g.rect(14, y - 1, 4, 1, T.stoneD); });
    g.rect(12, 54, 8, 9, '#2a2230'); g.disc(16, 54, 4, '#2a2230'); g.rect(13, 58, 6, 1, '#5a4a3a');
    g.rect(22, 18, 1, 12, T.wood); g.rect(23, 18, 4, 6, T.flag);
    return g.canvas;
  }

  /* =========================================================
     v6.2 場所ごとの固有デザイン（js/data/designs.js の LOCATION_DESIGNS を組み立てる）
     ・部品（家・塔・城壁・門・木・煙…）を、場所ごとの silhouette（建物の形）で組み合わせる
     ・入口は絵の下中央（＝ワープのマス）。門・洞窟の口・階段などはそこに描く
     ========================================================= */
  function kit(g, T) {
    var K = {};
    K.shadow = function (cx, y, rx) { g.ellipse(cx, y, rx, 4, 'rgba(0,0,0,0.28)'); };
    // 屋根：thatch（茅葺き）/ gable（切妻）/ steep（急な切妻）/ shed（片流れ）/ flat（陸屋根）/ patched（継ぎはぎ）/ broken（崩れ）/ iron（鉄板）/ leaf（葉）/ dome / onion / cone / spire / pyramid / spike / tent
    K.roof = function (style, x, top, w, rh, col, colD, extra) {
      var cx = x + w / 2; colD = colD || shade(col, 0.72);
      if (style === 'thatch') { g.poly([[x - 3, top + 2], [x + w + 3, top + 2], [x + w - 1, top - rh + 2], [cx, top - rh - 1], [x + 1, top - rh + 2]], col); g.poly([[cx, top - rh - 1], [x + w - 1, top - rh + 2], [x + w + 3, top + 2], [cx, top + 2]], colD); for (var i = 0; i < w + 4; i += 2) g.rect(x - 2 + i, top - 1 + (i % 4 ? 0 : 1), 1, 2, shade(col, 0.82)); g.rect(x - 3, top + 2, w + 6, 1, shade(col, 0.6)); return; }
      if (style === 'flat') { g.rect(x - 1, top - 2, w + 2, 3, col); g.rect(x - 1, top - 2, w + 2, 1, shade(col, 1.2)); g.rect(x - 1, top, w + 2, 1, colD); return; }
      if (style === 'shed') { g.poly([[x - 2, top + 1], [x + w + 2, top - rh + 2], [x + w + 2, top + 1]], colD); g.poly([[x - 2, top + 1], [x + w + 2, top - rh + 1], [x + w + 2, top - rh + 3], [x - 2, top + 2]], col); return; }
      if (style === 'iron') { g.rect(x - 1, top - rh / 2, w + 2, rh / 2 + 1, col); for (var r = x; r < x + w; r += 3) g.rect(r, top - rh / 2, 1, rh / 2 + 1, colD); g.rect(x - 1, top - rh / 2, w + 2, 1, shade(col, 1.3)); return; }
      if (style === 'dome' || style === 'onion') { var rr = Math.max(3, Math.floor(w / 2)); g.half(cx, top + 1, rr, col); g.ellipse(cx - rr * 0.35, top - rr * 0.45, rr * 0.3, rr * 0.25, shade(col, 1.25)); if (style === 'onion') { g.tri(cx - rr * 0.5, top - rr + 2, cx + rr * 0.5, top - rr + 2, cx, top - rr - rh * 0.6, col); } g.rect(cx, top - rr - (style === 'onion' ? rh * 0.6 : 0) - 3, 1, 3, extra || '#e8c040'); return; }
      if (style === 'pyramid' || style === 'cone' || style === 'spire' || style === 'spike') { var hh = style === 'spire' ? rh * 1.8 : style === 'spike' ? rh * 2 : rh; var ww = style === 'spike' ? w * 0.7 : w + 2; g.tri(cx - ww / 2, top + 1, cx + ww / 2, top + 1, cx, top - hh, col); g.tri(cx, top - hh, cx + ww / 2, top + 1, cx, top + 1, colD); if (style === 'pyramid') g.rect(cx - ww / 2, top, ww, 1, shade(col, 0.6)); return; }
      if (style === 'tent') { g.tri(x - 1, top + 1, x + w + 1, top + 1, cx, top - rh, col); g.tri(cx, top - rh, x + w + 1, top + 1, cx, top + 1, colD); g.tri(cx - 2, top + 1, cx + 2, top + 1, cx, top - rh * 0.4, '#2a1e18'); return; }
      if (style === 'leaf') { g.ellipse(cx, top - 1, w / 2 + 3, rh / 2 + 1, col); g.ellipse(cx - 2, top - 2, w / 2, rh / 2 - 1, shade(col, 1.25)); return; }
      // gable / steep / patched / broken
      var h2 = style === 'steep' ? rh * 1.5 : rh;
      if (style === 'broken') { g.poly([[x - 2, top + 1], [cx - 2, top - h2], [cx + 1, top - h2 + 3], [x + w * 0.62, top - 1], [x + w + 1, top + 1]], col); return; }
      g.tri(x - 2, top + 1, x + w + 2, top + 1, cx, top - h2, col); g.tri(cx, top - h2, x + w + 2, top + 1, cx, top + 1, colD); g.rect(x - 2, top, w + 4, 1, shade(col, 0.6));
      if (style === 'patched') { g.rect(cx - 3, top - h2 / 2, 4, 2, extra || '#a8743a'); g.rect(cx + 2, top - h2 / 3, 3, 2, shade(extra || '#a8743a', 0.85)); }
      if (T.snowcap || style === 'steep') { if (T.snowcap) g.tri(cx - h2 * 0.5, top - h2 * 0.5, cx + h2 * 0.5, top - h2 * 0.5, cx, top - h2, T.snowcap); }
    };
    // 家（壁＋屋根＋窓＋扉）
    K.house = function (x, base, w, h, M, roofStyle, opt) {
      opt = opt || {}; var wall = opt.wall || M.wall, wallD = opt.wallD || M.wallD;
      g.rect(x, base - h, w, h, wall); g.rect(x + w - 2, base - h, 2, h, wallD); g.rect(x, base - 1, w, 1, shade(wallD, 0.85));
      if (opt.stone) g.bricks(x, base - h, w - 2, h - 1, opt.mortar || M.mortar || shade(wall, 0.8), 3);
      if (opt.timber) { g.rect(x, base - h, w, 1, M.wood || '#6a4426'); g.rect(x + Math.floor(w / 2), base - h, 1, h, M.wood || '#6a4426'); }
      if (!opt.noDoor) { g.rect(x + Math.floor(w / 2) - 1, base - 4, 2, 4, opt.door || M.wood || '#5a3a24'); }
      var win = opt.lit === false ? shade(wall, 0.55) : (opt.win || T.win);
      if (!opt.noWin) { g.rect(x + 2, base - h + 2, 2, 2, win); if (w > 9) g.rect(x + w - 5, base - h + 2, 2, 2, win); }
      K.roof(roofStyle, x, base - h, w, opt.rh || 6, opt.roof || M.roof, opt.roofD || M.roofD, M.patch);
      if (opt.chimney) { g.rect(x + w - 4, base - h - (opt.rh || 6) + 1, 2, 5, opt.chimneyCol || shade(wallD, 0.8)); }
    };
    // 塔：round（円柱）/ 四角。屋根は K.roof の種類＋ crenel（胸壁）
    K.tower = function (x, base, w, h, M, roofStyle, opt) {
      opt = opt || {}; var top = base - h; var light = opt.light || M.wall, dark = opt.dark || M.wallD;
      if (opt.round !== false) g.cyl(x, top, w, h, light, dark); else { g.rect(x, top, w, h, light); g.rect(x + w - 2, top, 2, h, dark); }
      if (opt.bricks) g.bricks(x, top + 2, w, h - 2, opt.mortar || M.mortar || shade(dark, 0.9), 4);
      if (opt.stripes) for (var sy = top + 3; sy < base - 2; sy += 8) g.rect(x, sy, w, 4, opt.stripes);
      if (opt.windows !== false) for (var wy = top + 5; wy < base - 5; wy += opt.winStep || 8) g.rect(x + Math.floor(w / 2) - 1, wy, 2, 3, opt.win || T.win);
      if (roofStyle === 'crenel') { for (var m = 0; m < w; m += 3) g.rect(x + m, top - 2, 2, 3, light); }
      else if (roofStyle && roofStyle !== 'none') K.roof(roofStyle, x, top, w, opt.rh || Math.max(6, w), opt.roof || M.roof, opt.roofD || M.roofD, opt.finial);
      if (opt.flag) { var fx = x + Math.floor(w / 2); var fy = top - (roofStyle === 'spire' ? (opt.rh || w) * 1.8 : (opt.rh || w)) - 4; g.rect(fx, fy, 1, 4, '#5a3a24'); g.rect(fx + 1, fy, 4, 2, opt.flag); }
      return top;
    };
    // 城壁：crenel / palisade（木の杭）/ iron（鉄板・鋲）/ marble / ice / hedge / plain
    K.wall = function (x0, x1, y, h, M, type) {
      var w = x1 - x0;
      if (type === 'palisade') { for (var px = x0; px < x1; px += 2) { g.rect(px, y - 1, 2, h + 1, (px / 2) % 2 ? (M.wood || '#6a4426') : shade(M.wood || '#6a4426', 1.2)); g.px(px, y - 2, shade(M.wood || '#6a4426', 0.8)); } return; }
      if (type === 'hedge') { for (var hx = x0; hx < x1; hx += 4) g.disc(hx + 2, y + 2, 3, (hx / 4) % 2 ? T.tree : T.treeD); return; }
      var col = M.wall, colL = shade(M.wall, 1.12), colD = M.wallD;
      if (type === 'iron') { col = M.wall; colL = M.metal || '#8a8a96'; colD = M.wallD; }
      g.rect(x0, y, w, h, col); g.rect(x0, y, w, 1, colL); g.rect(x0, y + h - 1, w, 1, colD);
      if (type === 'crenel' || type === 'marble' || type === 'plain') g.bricks(x0, y + 1, w, h - 2, M.mortar || shade(col, 0.82), 3);
      if (type === 'iron') { for (var ix = x0 + 1; ix < x1; ix += 5) { g.rect(ix, y + 1, 1, h - 2, colD); g.px(ix + 2, y + 2, M.rivet || '#c8c8d0'); g.px(ix + 2, y + h - 3, M.rivet || '#c8c8d0'); } for (var sx = x0; sx < x1; sx += 4) g.tri(sx, y, sx + 3, y, sx + 1.5, y - 4, colD); return; }
      if (type === 'ice') { for (var ic = x0 + 1; ic < x1; ic += 4) g.tri(ic, y + h, ic + 2, y + h, ic + 1, y + h + 3, M.ice || '#dff4ff'); }
      if (type === 'crenel' || type === 'marble' || type === 'ice') for (var mx = x0; mx < x1; mx += 4) g.rect(mx, y - 2, 2, 2, col);
    };
    // 門：portcullis / arch / wood / iron / demon / temple / none
    K.gate = function (cx, base, w, h, type, M) {
      var x = Math.round(cx - w / 2);
      if (type === 'temple') { for (var st = 0; st < 3; st++) g.rect(x - 3 + st * 1, base - 1 - st * 2, w + 6 - st * 2, 2, shade(M.wall || '#e8e0c8', 1 - st * 0.08)); g.rect(x + 1, base - h - 6, w - 2, h, '#2a2230'); return; }
      g.rect(x, base - h, w, h, '#241c26'); g.disc(cx, base - h, Math.floor(w / 2), '#241c26');
      if (type === 'portcullis' || type === 'iron') { for (var gx = x + 1; gx < x + w; gx += 2) g.rect(gx, base - h - 2, 1, h + 2, type === 'iron' ? '#7a7a88' : '#5a4a3a'); for (var gy = base - h + 1; gy < base; gy += 3) g.rect(x, gy, w, 1, type === 'iron' ? '#7a7a88' : '#5a4a3a'); }
      else if (type === 'wood') { g.rect(x + 1, base - h + 1, w - 2, h - 1, '#6a4a2a'); g.rect(Math.round(cx), base - h + 1, 1, h - 1, '#3a2a20'); }
      else if (type === 'demon') { g.glow(cx, base - h / 2, w * 1.4, M.glow || '#ff2a3a'); g.rect(x + 1, base - h + 1, w - 2, h - 1, M.glow2 || '#8a1a2a'); g.disc(cx, base - h, Math.floor(w / 2) - 1, M.glow2 || '#8a1a2a'); g.rect(Math.round(cx) - 1, base - h - 2, 2, h + 2, M.glow || '#ff2a3a'); }
      else if (type === 'arch') { g.rect(x + 2, base - h + 2, w - 4, h - 2, '#140f18'); }
    };
    K.tree = function (x, y, r, kind) {
      if (kind === 'pine' || kind === 'snowpine') { g.rect(x - 1, y - 1, 2, 3, '#4a3020'); for (var i = 0; i < 3; i++) g.tri(x - r + i, y - i * (r - 1), x + r - i, y - i * (r - 1), x, y - (i + 1) * (r - 1) - 2, i === 2 ? T.treeL : T.treeD); if (kind === 'snowpine') { g.tri(x - 2, y - 2 * (r - 1) - 1, x + 2, y - 2 * (r - 1) - 1, x, y - 3 * (r - 1) - 2, '#ffffff'); g.rect(x - r + 1, y - 1, r * 2 - 2, 1, '#ffffff'); } return; }
      if (kind === 'palm') { g.line(x, y, x + 2, y - r * 2, '#8a6a3a', 2); var tx = x + 2, ty = y - r * 2; [[-r, 2], [r, 2], [-r + 1, -1], [r - 1, -1], [0, -3]].forEach(function (q) { g.line(tx, ty, tx + q[0], ty + q[1], T.tree, 2); }); return; }
      if (kind === 'dead') { g.line(x, y, x, y - r * 2, '#4a3a30', 2); g.line(x, y - r, x - r, y - r * 1.6, '#4a3a30'); g.line(x, y - r * 1.4, x + r, y - r * 2, '#4a3a30'); return; }
      g.rect(x - 1, y, 2, r, '#6a4426'); g.disc(x, y - 1, r, T.treeD); g.disc(x - 1, y - 2, r - 1, T.tree); g.disc(x - 2, y - 3, Math.max(1, r - 3), T.treeL);
    };
    K.smoke = function (x, y, n, col) { for (var i = 0; i < n; i++) g.disc(x + i * 2 + (i % 2), y - i * 4, 2 + Math.min(3, i), col); };
    K.boat = function (x, y, sail) { g.poly([[x, y], [x + 12, y], [x + 10, y + 3], [x + 2, y + 3]], '#7a5530'); g.rect(x + 5, y - 10, 1, 10, '#5a3a24'); g.tri(x + 6, y - 10, x + 6, y - 2, x + 11, y - 3, sail || '#f2ead8'); };
    K.water = function (x0, y0, x1, y1, col) { g.rect(x0, y0, x1 - x0, y1 - y0, col || '#3f7ac8'); for (var wy = y0 + 1; wy < y1; wy += 3) for (var wx = x0 + ((wy / 3) % 2) * 3; wx < x1; wx += 7) g.rect(wx, wy, 3, 1, 'rgba(255,255,255,0.35)'); };
    K.field = function (x, y, w, h, col) { g.rect(x, y, w, h, '#8a6a3a'); for (var fy = y + 1; fy < y + h; fy += 2) g.rect(x, fy, w, 1, col || '#7ab04a'); };
    K.rock = function (cx, cy, r, M) { g.disc(cx, cy, r, M.rockD || T.rockD); g.disc(cx - 1, cy - 1, r - 1, M.rock || T.rock); g.disc(cx - 2, cy - 2, Math.max(1, r - 3), M.rockL || T.rockL); };
    K.crystal = function (x, base, h, col, col2) { g.poly([[x, base], [x + 3, base - h], [x + 6, base]], col); g.poly([[x + 3, base - h], [x + 6, base], [x + 3, base]], col2 || shade(col, 0.75)); g.px(x + 2, base - h + 3, '#ffffff'); };
    K.gear = function (cx, cy, r, col, colD) { for (var a = 0; a < 12; a++) { var an = a * Math.PI / 6; g.rect(cx + Math.cos(an) * r - 1, cy + Math.sin(an) * r - 1, 3, 3, col); } g.disc(cx, cy, r - 1, col); g.disc(cx, cy, Math.max(1, r - 3), colD); g.disc(cx, cy, Math.max(1, Math.floor(r / 3)), col); };
    K.clock = function (cx, cy, r, face, moving, col) { g.disc(cx, cy, r + 1, col || '#3a2a20'); g.disc(cx, cy, r, face); for (var a = 0; a < 12; a++) { var an = a * Math.PI / 6; g.px(cx + Math.cos(an) * (r - 1), cy + Math.sin(an) * (r - 1), '#3a3a4a'); } var hA = moving ? -0.6 : -Math.PI / 2, mA = moving ? 1.2 : -Math.PI / 2 + 0.05; g.line(cx, cy, cx + Math.cos(hA) * (r - 3), cy + Math.sin(hA) * (r - 3), '#2a2a3a'); g.line(cx, cy, cx + Math.cos(mA) * (r - 1), cy + Math.sin(mA) * (r - 1), '#2a2a3a'); };
    K.banner = function (x, y, col, h) { h = h || 8; g.rect(x, y, 4, h, col); g.rect(x, y, 4, 1, '#d8b04a'); g.tri(x, y + h, x + 4, y + h, x + 2, y + h + 2, col); };
    K.cloud = function (cx, cy, s) { [[0, 0, 5], [-6, 1, 4], [6, 1, 4], [-3, -3, 4], [3, -3, 4]].forEach(function (c) { g.disc(cx + c[0] * s, cy + c[1] * s, Math.round(c[2] * s), '#f4f8ff'); }); g.rect(cx - 9 * s, cy + 2 * s, 18 * s, 2, '#d8e2f4'); };
    K.stall = function (x, base, col, col2) { g.rect(x, base - 5, 9, 5, '#7a5a30'); g.rect(x - 1, base - 9, 11, 4, col); for (var i = 0; i < 11; i += 2) g.rect(x - 1 + i, base - 9, 1, 4, col2 || '#f4f0e0'); g.rect(x + 1, base - 4, 7, 1, '#e8c040'); };
    K.tentShape = function (x, base, w, h, col, colD) { g.tri(x, base, x + w, base, x + w / 2, base - h, col); g.tri(x + w / 2, base - h, x + w, base, x + w / 2, base, colD); g.tri(x + w / 2 - 2, base, x + w / 2 + 2, base, x + w / 2, base - h * 0.45, '#2a1e18'); };
    K.fire = function (x, base) { g.rect(x - 3, base - 1, 6, 1, '#5a3a24'); g.tri(x - 2, base - 1, x + 2, base - 1, x, base - 6, '#ff8a2a'); g.tri(x - 1, base - 1, x + 1, base - 1, x, base - 4, '#ffe27a'); g.glow(x, base - 3, 7, '#ff9a3a'); };
    K.columns = function (x0, x1, base, h, n, col, colD) { var step = (x1 - x0) / (n - 1); for (var i = 0; i < n; i++) { var x = Math.round(x0 + i * step); g.rect(x - 1, base - h, 3, h, col); g.rect(x + 1, base - h, 1, h, colD); g.rect(x - 2, base - h - 1, 5, 1, col); g.rect(x - 2, base - 1, 5, 1, colD); } };
    return K;
  }
  // silhouette ごとの組み立て。g：描画、K：部品、M：materials、D：デザイン、T：地域の地面の色、S：物語の状態
  var COMPOSE = {
    farm_village: [88, 62, function (g, K, M, D, T) {
      K.shadow(44, 58, 42); K.field(2, 44, 22, 10, '#a8c84a'); K.field(64, 46, 22, 9, '#d8c24a');
      K.tree(8, 26, 5); K.tree(80, 24, 5); K.tree(30, 14, 4);
      K.house(14, 34, 14, 9, M, 'thatch', { timber: true, rh: 7 }); K.house(34, 30, 16, 10, M, 'thatch', { timber: true, rh: 8, chimney: true }); K.house(56, 35, 13, 9, M, 'thatch', { timber: true, rh: 7 });
      g.rect(40, 38, 6, 4, '#8a8a96'); g.rect(41, 36, 4, 2, '#5a6a8a'); g.rect(39, 32, 1, 6, '#6a4426'); g.rect(46, 32, 1, 6, '#6a4426'); g.rect(38, 31, 10, 2, '#a8823a');   // 井戸
      [[22, 44], [56, 44], [30, 41]].forEach(function (f) { for (var i = 0; i < 6; i += 2) g.px(f[0] + i, f[1], i % 4 ? M.accent : '#f0e04a'); g.rect(f[0], f[1] + 1, 6, 1, '#4a8a3a'); });   // 花壇
      K.wall(2, 36, 50, 3, M, 'palisade'); K.wall(52, 86, 50, 3, M, 'palisade');
      g.rect(75, 36, 1, 8, '#6a4426'); g.rect(72, 38, 7, 1, '#6a4426'); g.disc(75, 35, 2, '#d8b25a');   // かかし
      g.poly([[38, 62], [50, 62], [47, 52], [41, 52]], '#c9a46a');
    }],
    castle_town: [92, 66, function (g, K, M, D, T) {
      K.shadow(46, 62, 45); K.water(4, 58, 88, 63, '#4a86c8');
      K.wall(6, 86, 42, 16, M, 'crenel');
      K.tower(20, 42, 8, 26, M, 'spire', { rh: 7, flag: M.banner }); K.tower(64, 42, 8, 26, M, 'spire', { rh: 7, flag: M.banner });
      K.tower(34, 34, 24, 26, M, 'none', { round: false, bricks: true }); K.roof('spire', 34, 8, 24, 10, M.roof, M.roofD); K.tower(30, 30, 6, 30, M, 'spire', { rh: 6 }); K.tower(56, 30, 6, 30, M, 'spire', { rh: 6 });
      g.disc(46, 22, 4, M.accent); g.rect(45, 19, 2, 6, M.roof); g.rect(43, 21, 6, 2, M.roof);   // 王国の紋章
      K.tower(2, 58, 10, 22, M, 'spire', { rh: 6, bricks: true }); K.tower(80, 58, 10, 22, M, 'spire', { rh: 6, bricks: true });
      K.banner(26, 45, M.banner); K.banner(62, 45, M.banner);
      K.gate(46, 58, 12, 11, 'portcullis', M); g.rect(40, 58, 12, 5, '#9a8a6a');
    }],
    tree_village: [92, 66, function (g, K, M, D, T) {
      K.shadow(46, 62, 44); K.tree(6, 40, 6); K.tree(86, 38, 6); K.tree(14, 22, 5); K.tree(78, 20, 5);
      g.rect(40, 18, 12, 42, '#5a3a22'); g.rect(48, 18, 4, 42, '#3e2614'); g.poly([[36, 60], [56, 60], [52, 52], [40, 52]], '#5a3a22');   // 巨木の幹
      g.disc(46, 14, 18, T.treeD); g.disc(40, 10, 12, T.tree); g.disc(54, 12, 11, T.tree); g.disc(44, 6, 8, T.treeL);
      K.house(26, 32, 11, 7, M, 'leaf', { rh: 6 }); g.rect(25, 32, 14, 2, M.wood); g.rect(27, 34, 1, 10, M.wood); g.rect(36, 34, 1, 10, M.wood);   // 木の上の家
      K.house(58, 28, 11, 7, M, 'leaf', { rh: 6 }); g.rect(57, 28, 14, 2, M.wood); g.rect(60, 30, 1, 14, M.wood); g.rect(68, 30, 1, 14, M.wood);
      g.arc(38, 22, 12, 0.2 * Math.PI, 0.8 * Math.PI, '#c8a46a'); g.arc(52, 22, 10, 0.2 * Math.PI, 0.8 * Math.PI, '#c8a46a');   // 吊り橋
      K.house(10, 54, 12, 8, M, 'leaf', { rh: 5 }); K.house(70, 54, 12, 8, M, 'leaf', { rh: 5 });
      [[30, 40], [62, 36]].forEach(function (l) { g.rect(l[0], l[1], 2, 2, M.accent); g.glow(l[0] + 1, l[1] + 1, 4, '#ffd86a'); });
      g.rect(42, 53, 8, 7, '#2a1a10');
    }],
    port_town: [92, 64, function (g, K, M, D, T, S) {
      K.shadow(46, 50, 44); K.water(0, 50, 92, 64, '#3f7ac8');
      K.tower(76, 48, 9, 34, M, 'cone', { stripes: M.stripe, windows: false, rh: 5, roof: '#3a3a4a' }); g.rect(76, 14, 9, 4, '#3a3a4a'); g.rect(77, 15, 7, 2, '#fff2a0'); g.glow(80, 16, 10, '#fff2a0');   // 灯台
      K.house(4, 46, 22, 10, M, 'gable', { rh: 6, stone: true, noWin: true }); g.rect(10, 40, 8, 6, '#5a3a24');   // 倉庫
      K.house(30, 44, 12, 9, M, 'gable', { rh: 6, timber: true }); K.house(46, 42, 12, 10, M, 'gable', { rh: 7, chimney: true }); K.house(60, 46, 11, 8, M, 'gable', { rh: 5, timber: true });
      K.stall(30, 50, M.stripe); K.stall(46, 50, M.accent);
      g.rect(36, 50, 20, 3, '#8a5a30'); for (var px = 37; px < 56; px += 4) g.rect(px, 53, 1, 5, '#5a3a24');   // 桟橋
      K.boat(12, 54, '#f2ead8'); K.boat(58, 56, M.stripe);
    }],
    industrial_town: [92, 66, function (g, K, M, D, T, S) {
      K.shadow(46, 62, 44);
      var sm = M.smoke; [[14, 6], [30, 4], [62, 4], [78, 7]].forEach(function (c, i) { g.rect(c[0], c[1] + 6, 5, 34 - c[1], M.wall); g.rect(c[0] + 3, c[1] + 6, 2, 34 - c[1], M.wallD); g.rect(c[0] - 1, c[1] + 5, 7, 2, M.metal); K.smoke(c[0] + 2, c[1] + 2, S.liberated ? 2 : 4, sm); });
      K.house(4, 46, 24, 14, M, 'iron', { stone: true, rh: 8, roof: M.roof, noWin: true }); g.rect(10, 38, 12, 4, M.glow); g.glow(16, 40, 10, M.glow);   // 製鉄所
      K.house(32, 44, 14, 10, M, 'gable', { stone: true, rh: 6 }); K.house(50, 44, 12, 10, M, 'gable', { stone: true, rh: 6 }); K.house(66, 46, 20, 12, M, 'iron', { stone: true, rh: 8, noWin: true });
      for (var i = 0; i < 4; i++) g.tri(66 + i * 5, 34, 71 + i * 5, 34, 71 + i * 5, 30, M.roofD);   // のこぎり屋根
      g.rect(0, 58, 92, 1, '#5a4a3a'); g.rect(0, 60, 92, 1, '#5a4a3a'); for (var r = 1; r < 92; r += 3) g.rect(r, 58, 1, 3, '#3a2e26');   // 鉱山鉄道
      g.rect(70, 53, 8, 5, M.metal); g.disc(72, 58, 1, '#2a2a2a'); g.disc(76, 58, 1, '#2a2a2a');
      if (S.banner) K.banner(44, 26, S.banner, 9);
      K.gate(46, 58, 10, 9, 'iron', M);
    }],
    iron_fortress: [92, 68, function (g, K, M, D, T) {
      K.shadow(46, 64, 44);
      [[22, 10], [46, 2], [70, 10]].forEach(function (s) { g.tri(s[0] - 5, 40, s[0] + 5, 40, s[0], s[1], M.roof); g.tri(s[0], s[1], s[0] + 5, 40, s[0], 40, '#0e0e14'); g.px(s[0], s[1] + 6, M.glow); });   // 黒い尖塔
      K.gear(46, 30, 11, M.metal, M.wallD); g.disc(46, 30, 2, M.glow);   // 巨大な歯車
      K.wall(4, 88, 38, 22, M, 'iron');
      K.tower(2, 60, 12, 30, M, 'spike', { round: false, windows: false, light: M.wall, dark: M.wallD, roof: M.roof }); K.tower(78, 60, 12, 30, M, 'spike', { round: false, windows: false, light: M.wall, dark: M.wallD, roof: M.roof });
      [[14, 40], [74, 40]].forEach(function (c) { for (var i = 0; i < 9; i++) g.rect(c[0] + (i % 2), c[1] + i * 2, 2, 1, M.chain); });   // 鎖
      [[10, 44], [80, 44]].forEach(function (l) { g.rect(l[0], l[1], 2, 3, M.glow); g.glow(l[0] + 1, l[1] + 1, 6, M.glow); });
      K.gate(46, 60, 14, 14, 'iron', M);
    }],
    admin_city: [92, 64, function (g, K, M, D, T, S) {
      K.shadow(46, 60, 44);
      K.tower(6, 52, 9, 38, M, 'crenel', { round: false, bricks: true, winStep: 10 }); g.rect(4, 12, 13, 3, M.roof); g.disc(10, 18, 2, M.accent);   // 監視塔（目）
      K.tower(77, 52, 9, 38, M, 'crenel', { round: false, bricks: true, winStep: 10 }); g.rect(75, 12, 13, 3, M.roof); g.disc(81, 18, 2, M.accent);
      g.rect(18, 22, 56, 30, M.wall); g.rect(18, 22, 56, 2, shade(M.wall, 1.15)); g.bricks(18, 24, 56, 26, M.mortar, 4);   // 税務庁舎
      g.poly([[16, 22], [76, 22], [46, 10]], M.roof); g.poly([[46, 10], [76, 22], [46, 22]], M.roofD); g.disc(46, 17, 3, M.accent);
      K.columns(22, 70, 50, 22, 9, shade(M.wall, 1.1), M.wallD);
      g.rect(18, 50, 56, 2, M.wallD); for (var st = 0; st < 3; st++) g.rect(30 - st * 2, 52 + st * 2, 32 + st * 4, 2, shade(M.wall, 0.95 - st * 0.07));
      K.banner(26, 26, S.banner || M.banner, 12); K.banner(62, 26, S.banner || M.banner, 12);
      K.gate(46, 52, 10, 12, 'wood', M);
    }],
    capital: [100, 72, function (g, K, M, D, T, S) {
      K.shadow(50, 68, 49);
      K.wall(2, 98, 46, 22, M, 'marble');
      K.house(6, 40, 16, 12, M, 'flat', { stone: true }); K.house(78, 40, 16, 12, M, 'flat', { stone: true });   // 官庁街
      K.house(22, 36, 14, 10, M, 'gable', { stone: true, rh: 5 }); K.house(64, 36, 14, 10, M, 'gable', { stone: true, rh: 5 });
      g.rect(34, 22, 32, 18, M.wall); g.rect(34, 22, 32, 2, shade(M.wall, 1.1)); K.columns(36, 64, 40, 16, 8, '#ffffff', M.wallD);   // 大宮殿
      g.half(50, 22, 13, M.roof); g.ellipse(45, 14, 4, 3, shade(M.roof, 1.3)); g.rect(49, 4, 2, 6, M.accent); g.disc(50, 4, 1, M.accent);
      [[30, 46], [70, 46]].forEach(function (t) { K.tower(t[0] - 4, t[1], 8, 30, M, 'dome', { rh: 4, roof: M.roof, roofD: M.roofD }); });
      K.tower(0, 66, 10, 24, M, 'crenel', { bricks: true }); K.tower(90, 66, 10, 24, M, 'crenel', { bricks: true });
      K.banner(18, 50, S.banner || M.banner, 9); K.banner(78, 50, S.banner || M.banner, 9);
      K.gate(50, 66, 14, 14, 'portcullis', M); g.rect(43, 66, 14, 6, '#d8d0c0');
    }],
    survivor_village: [88, 62, function (g, K, M, D, T, S) {
      K.shadow(44, 58, 42); K.water(0, 56, 88, 62, '#3f6ab0');
      [[6, 46, 14, 9], [24, 42, 13, 9], [48, 44, 14, 10], [66, 46, 14, 9]].forEach(function (h, i) { K.house(h[0], h[1], h[2], h[3], M, i % 2 ? 'patched' : 'broken', { stone: true, rh: 6, lit: !!S.lit }); });
      g.line(37, 36, 48, 38, '#e8e0d0'); [39, 42, 45].forEach(function (x, i) { g.rect(x, 37, 2, 3, ['#d84a4a', '#4a8ad8', '#f0e04a'][i]); });   // 洗濯物
      [[20, 52], [60, 52], [40, 54]].forEach(function (r) { K.rock(r[0], r[1], 3, { rock: M.wall, rockL: shade(M.wall, 1.2), rockD: M.wallD }); });
      K.tree(82, 34, 4, 'dead'); g.poly([[38, 62], [50, 62], [47, 52], [41, 52]], '#b8a888');
    }],
    ruins: [88, 64, function (g, K, M, D, T) {
      K.shadow(44, 60, 42);
      g.rect(36, 10, 16, 48, M.wall); g.rect(48, 10, 4, 48, M.wallD); g.bricks(36, 12, 16, 44, M.mortar, 4); g.poly([[36, 10], [40, 4], [44, 8], [48, 3], [52, 10]], M.wall);   // 崩れた時計塔
      K.clock(44, 20, 5, '#d8d0b8', false, '#3a3030'); g.line(41, 17, 47, 23, '#3a3030');   // 割れた文字盤
      [[4, 52, 18, 18], [22, 54, 12, 12], [56, 52, 14, 16], [72, 54, 12, 12]].forEach(function (b) { g.rect(b[0], b[1] - b[3], b[2], b[3], M.wall); g.bricks(b[0], b[1] - b[3], b[2], b[3], M.mortar, 3); g.poly([[b[0], b[1] - b[3]], [b[0] + b[2] * 0.3, b[1] - b[3] - 4], [b[0] + b[2] * 0.6, b[1] - b[3] + 2], [b[0] + b[2], b[1] - b[3] - 2], [b[0] + b[2], b[1] - b[3] + 3], [b[0], b[1] - b[3] + 3]], M.wallD); g.rect(b[0] + 3, b[1] - b[3] + 5, 3, 4, '#241c26'); });
      for (var i = 0; i < 8; i++) g.disc(6 + i * 11, 59 - (i % 2), 2, M.wallD);
      [[38, 30], [60, 40], [8, 40]].forEach(function (v) { for (var j = 0; j < 6; j++) g.px(v[0] + (j % 2), v[1] + j, M.moss); });
      K.gate(44, 58, 10, 10, 'arch', M);
    }],
    lighthouse: [40, 74, function (g, K, M, D, T, S) {
      K.shadow(20, 70, 18); K.rock(10, 68, 6, {}); K.rock(30, 68, 6, {});
      K.tower(14, 66, 12, 46, M, 'none', { stripes: M.stripe, windows: false }); g.rect(12, 18, 16, 3, '#3a3a4a'); g.rect(14, 10, 12, 8, '#3a3a4a'); g.rect(15, 11, 10, 6, S.lit ? M.glow : '#6a7a8a');
      K.roof('dome', 14, 10, 12, 4, M.roof, shade(M.roof, 0.7), '#e8c040');
      if (S.lit) { g.glow(20, 14, 18, M.glow); g.alpha(0.35, function () { g.poly([[25, 12], [40, 6], [40, 20]], M.glow); g.poly([[15, 12], [0, 6], [0, 20]], M.glow); }); }
      g.rect(17, 58, 6, 8, '#2a2230'); g.disc(20, 58, 3, '#2a2230');
    }],
    clock_city: [92, 70, function (g, K, M, D, T) {
      K.shadow(46, 66, 44);
      K.house(4, 56, 18, 12, M, 'pyramid', { stone: true, rh: 7 }); K.house(70, 56, 18, 12, M, 'pyramid', { stone: true, rh: 7 });
      [[20, 54], [64, 54]].forEach(function (b) { K.tower(b[0] - 4, b[1], 8, 30, M, 'pyramid', { round: false, bricks: true, rh: 8, windows: false }); g.rect(b[0] - 2, b[1] - 26, 4, 5, '#2a2230'); g.disc(b[0], b[1] - 23, 2, M.accent); });   // 鐘楼
      g.rect(36, 12, 20, 48, M.wall); g.rect(52, 12, 4, 48, M.wallD); g.bricks(36, 14, 20, 44, M.mortar, 4); g.poly([[34, 12], [58, 12], [46, -2]], M.roof); g.poly([[46, -2], [58, 12], [46, 12]], M.roofD);   // 大時計塔
      K.clock(46, 24, 7, M.clock, true, M.accent); K.gear(30, 40, 5, M.accent, M.wallD); K.gear(62, 38, 4, M.accent, M.wallD);
      K.gate(46, 62, 10, 11, 'arch', M); g.rect(38, 60, 16, 3, M.wallD);
    }],
    temple: [80, 60, function (g, K, M, D, T) {
      K.shadow(40, 57, 38);
      for (var st = 0; st < 4; st++) g.rect(6 + st * 3, 56 - st * 3, 68 - st * 6, 3, shade(M.wall, 1 - st * 0.06));
      g.rect(14, 22, 52, 22, M.wallD); K.columns(16, 64, 44, 22, 7, M.wall, M.wallD);
      g.poly([[10, 22], [70, 22], [40, 8]], M.roof); g.poly([[40, 8], [70, 22], [40, 22]], M.roofD); g.rect(10, 22, 60, 2, M.accent);
      g.rect(38, 12, 4, 7, M.accent); g.tri(38, 12, 42, 12, 40, 15, M.glow); g.tri(38, 19, 42, 19, 40, 16, M.glow);   // 砂時計
      g.rect(35, 30, 10, 14, '#2a2230'); g.glow(40, 36, 9, M.glow);
    }],
    portal: [52, 52, function (g, K, M, D, T) {
      K.shadow(26, 49, 24); [[6, 46], [46, 46]].forEach(function (p) { K.rock(p[0], p[1], 4, { rock: M.stone, rockL: M.stoneL, rockD: M.stoneD }); });
      g.ring(26, 26, 18, M.stoneD, 7); g.ring(26, 26, 18, M.stone, 5); g.arc(26, 26, 18, Math.PI * 1.1, Math.PI * 1.6, M.stoneL, 2);
      g.glow(26, 26, 16, M.glow); g.ring(26, 26, 11, M.glow2, 2); g.ring(26, 26, 7, M.glow, 2); g.disc(26, 26, 3, '#ffffff');
      for (var a = 0; a < 8; a++) { var an = a * Math.PI / 4; g.px(26 + Math.cos(an) * 18, 26 + Math.sin(an) * 18, M.glow); }
      g.rect(14, 44, 24, 4, M.stoneD); g.rect(16, 43, 20, 1, M.stoneL);
      if (D.decoration.indexOf('tech_frame') >= 0) { g.rect(2, 4, 4, 42, M.stoneD); g.rect(46, 4, 4, 42, M.stoneD); g.rect(2, 2, 48, 4, M.stoneD); for (var ty = 8; ty < 44; ty += 6) { g.rect(3, ty, 2, 2, M.glow); g.rect(47, ty, 2, 2, M.glow); } }   // 機械の島側：金属の枠と表示灯
      else { g.rect(4, 30, 3, 12, M.stoneD); g.rect(45, 30, 3, 12, M.stoneD); g.px(5, 28, M.glow2); g.px(46, 28, M.glow2); }   // 神殿領側：古い石柱
    }],
    academy: [92, 64, function (g, K, M, D, T) {
      K.shadow(46, 60, 44); g.rect(0, 54, 92, 6, T.tree);
      K.house(6, 48, 24, 14, M, 'gable', { stone: true, rh: 7 }); K.house(62, 48, 24, 14, M, 'gable', { stone: true, rh: 7 });   // 図書館・講堂
      g.rect(34, 24, 24, 24, M.wall); g.rect(54, 24, 4, 24, M.wallD); g.bricks(34, 26, 24, 22, shade(M.wall, 0.85), 4); g.half(46, 24, 11, M.roof); g.rect(44, 13, 6, 3, '#2a2a3a'); g.line(48, 15, 56, 8, '#c8ccd8', 2);   // 天文台＋望遠鏡
      g.glow(46, 18, 10, M.glow);
      [[14, 30], [70, 30]].forEach(function (b) { K.banner(b[0], b[1], M.roof, 8); });
      g.arc(46, 56, 8, Math.PI, 0, M.accent, 2); g.rect(38, 48, 2, 10, M.wallD); g.rect(52, 48, 2, 10, M.wallD);   // アーチの門
      g.rect(40, 50, 12, 8, '#2a2230');
    }],
    future_city: [92, 64, function (g, K, M, D, T) {
      K.shadow(46, 60, 44);
      g.rect(0, 56, 92, 4, M.wallD); for (var gx = 0; gx < 92; gx += 6) g.rect(gx, 56, 1, 4, M.glow);
      [[16, 48, 11], [76, 48, 11], [34, 44, 9], [58, 44, 9]].forEach(function (d) { g.rect(d[0] - d[2], d[1] - 6, d[2] * 2, 6, M.wall); g.half(d[0], d[1] - 6, d[2], M.roof); g.arc(d[0], d[1] - 6, d[2] - 2, Math.PI * 1.15, Math.PI * 1.45, '#ffffff', 1); g.rect(d[0] - d[2], d[1] - 3, d[2] * 2, 1, M.glow); });
      g.rect(42, 6, 8, 46, M.wall); g.rect(48, 6, 2, 46, M.wallD); g.poly([[40, 6], [52, 6], [46, -2]], M.roof); g.disc(46, 10, 3, M.accent); g.disc(46, 10, 1, '#ffffff');   // 監視塔（目）
      for (var cy = 14; cy < 50; cy += 6) { g.rect(43, cy, 1, 4, M.glow); g.rect(48, cy + 2, 1, 4, M.glow); }
      g.line(26, 52, 40, 52, M.glow); g.line(52, 52, 66, 52, M.glow); g.line(10, 52, 10, 58, M.glow);   // 光る回路
      g.rect(42, 50, 8, 8, '#1a2a3a'); g.rect(43, 51, 6, 7, M.glow);
    }],
    uniform_blocks: [88, 60, function (g, K, M, D, T) {
      K.shadow(44, 56, 42);
      for (var r = 0; r < 2; r++) for (var c = 0; c < 6; c++) { var x = 4 + c * 14, base = 34 + r * 18; g.rect(x, base - 12, 11, 12, M.wall); g.rect(x + 9, base - 12, 2, 12, M.wallD); g.rect(x - 1, base - 13, 13, 2, M.roof); g.rect(x + 2, base - 9, 2, 2, M.glow); g.rect(x + 6, base - 9, 2, 2, M.glow); g.rect(x + 4, base - 4, 3, 4, '#3a4a5a'); g.px(x + 1, base - 11, '#3a4a5a'); }
      g.rect(0, 54, 88, 2, M.wallD); g.rect(40, 54, 8, 6, '#c8d0dc');
    }],
    arcane_city: [92, 68, function (g, K, M, D, T) {
      K.shadow(46, 64, 44);
      [[14, 56, 20], [78, 56, 20], [46, 50, 34]].forEach(function (t, i) { K.tower(t[0] - 5, t[1], 10, t[2], M, 'spire', { rh: 8, win: M.glow }); K.crystal(t[0] - 3, t[1] - t[2] - 14, 8, M.crystal, M.crystal2); g.glow(t[0], t[1] - t[2] - 14, 9, M.glow); });
      [[28, 18], [64, 14]].forEach(function (f) { g.poly([[f[0] - 7, f[1] + 4], [f[0] + 7, f[1] + 4], [f[0] + 3, f[1] + 10], [f[0] - 3, f[1] + 10]], '#5a4a5a'); K.house(f[0] - 5, f[1] + 4, 10, 6, M, 'cone', { rh: 5, noDoor: true }); g.glow(f[0], f[1] + 12, 6, M.glow); });   // 浮遊する家
      K.house(4, 60, 16, 10, M, 'gable', { stone: true, rh: 6, win: M.glow }); K.house(72, 60, 16, 10, M, 'gable', { stone: true, rh: 6, win: M.glow });
      [[24, 60], [62, 60], [34, 62]].forEach(function (c) { K.crystal(c[0], c[1], 7, M.crystal2, M.crystal); });
      K.gate(46, 62, 10, 10, 'arch', M); g.glow(46, 58, 8, M.glow);
    }],
    archive_tower: [44, 72, function (g, K, M, D, T) {
      K.shadow(22, 69, 20); g.half(22, 70, 20, T.tree);
      K.tower(10, 66, 24, 50, M, 'pyramid', { round: false, bricks: true, rh: 12, windows: false });
      [24, 34, 44].forEach(function (y) { g.rect(14, y, 4, 6, M.glow); g.rect(26, y, 4, 6, M.glow); g.rect(15, y + 1, 2, 4, '#7a4a3a'); });   // 本の窓
      g.ring(22, 26, 5, M.glow, 2); g.disc(22, 26, 2, M.accent);   // 封印の紋章
      g.rect(17, 56, 10, 10, '#241c26'); g.disc(22, 56, 5, '#241c26'); g.line(17, 56, 27, 66, M.glow); g.line(27, 56, 17, 66, M.glow);
    }],
    bunker: [56, 44, function (g, K, M, D, T) {
      K.shadow(28, 41, 26); K.rock(12, 30, 11, M); K.rock(44, 30, 11, M); K.rock(28, 22, 13, M);
      g.rect(16, 24, 24, 18, M.metal); g.rect(16, 24, 24, 2, shade(M.metal, 1.2)); g.rect(20, 28, 16, 14, '#3a3a46'); g.ring(28, 35, 5, M.metal, 2); g.rect(27, 30, 2, 10, M.metal);   // 金庫扉
      g.rect(10, 34, 6, 2, M.metal); g.rect(40, 30, 8, 2, M.metal); g.rect(46, 30, 2, 10, M.metal);   // 配管
      g.rect(18, 25, 2, 2, M.glow); g.rect(36, 25, 2, 2, M.glow); g.glow(28, 26, 6, M.glow);
      if (D.decoration.indexOf('crystal_core') >= 0) K.crystal(25, 22, 7, '#d8a8ff', '#a87ae8');
    }],
    observatory: [44, 74, function (g, K, M, D, T) {
      K.cloud(22, 68, 1.4); K.tower(13, 64, 18, 44, M, 'none', { round: true, winStep: 10 });
      g.rect(10, 18, 24, 4, M.wallD); g.half(22, 18, 11, M.roof); g.rect(20, 7, 4, 11, '#1a2040'); g.line(22, 12, 36, 2, M.metal, 3);   // ドームと望遠鏡
      [[4, 6], [38, 14], [6, 28], [40, 34]].forEach(function (s) { g.px(s[0], s[1], M.glow); g.px(s[0] - 1, s[1], 'rgba(255,240,160,0.5)'); g.px(s[0] + 1, s[1], 'rgba(255,240,160,0.5)'); });
      g.rect(18, 56, 8, 8, '#2a2230'); g.disc(22, 56, 4, '#2a2230');
    }],
    camp: [80, 54, function (g, K, M, D, T) {
      K.cloud(16, 48, 1.2); K.cloud(64, 48, 1.2); K.shadow(40, 50, 36);
      K.tentShape(6, 44, 20, 16, M.cloth, M.clothD); K.tentShape(54, 44, 20, 16, M.cloth2, shade(M.cloth2, 0.75)); K.tentShape(30, 34, 20, 16, M.cloth, M.clothD);
      K.fire(40, 48); g.rect(30, 46, 4, 2, M.wood); g.rect(46, 46, 4, 2, M.wood);
      g.rect(66, 18, 1, 14, M.wood); g.rect(67, 18, 6, 4, '#4a8ad8');
    }],
    sky_temple: [88, 66, function (g, K, M, D, T) {
      K.cloud(20, 58, 1.6); K.cloud(64, 58, 1.6); K.cloud(44, 62, 1.3);
      for (var st = 0; st < 3; st++) g.rect(18 + st * 2, 54 - st * 2, 52 - st * 4, 2, shade(M.wall, 1 - st * 0.05));
      g.rect(24, 26, 40, 22, M.wallD); K.columns(26, 62, 48, 22, 6, M.wall, M.wallD); g.poly([[20, 26], [68, 26], [44, 12]], M.roof); g.poly([[44, 12], [68, 26], [44, 26]], M.roofD); g.rect(20, 26, 48, 2, M.accent); g.disc(44, 20, 3, M.accent);
      [[8, 30, 16], [78, 24, 14], [14, 10, 10], [74, 6, 10]].forEach(function (p) { g.rect(p[0] - 2, p[1] - p[2], 5, p[2], M.wall); g.rect(p[0] + 1, p[1] - p[2], 2, p[2], M.wallD); g.rect(p[0] - 3, p[1] - p[2] - 1, 7, 2, M.accent); g.ellipse(p[0], p[1] + 3, 4, 1, 'rgba(0,0,0,0.15)'); });   // 浮かぶ石柱
      g.rect(39, 34, 10, 14, '#2a2a40'); g.glow(44, 40, 10, M.glow);
    }],
    war_camp: [88, 58, function (g, K, M, D, T) {
      K.shadow(44, 54, 42);
      K.tentShape(8, 44, 22, 16, M.cloth, M.clothD); K.tentShape(58, 44, 22, 16, M.cloth2, shade(M.cloth2, 0.75)); K.tentShape(34, 36, 20, 15, M.cloth, M.clothD);
      K.wall(2, 36, 46, 8, M, 'palisade'); K.wall(52, 86, 46, 8, M, 'palisade');
      for (var bx = 6; bx < 86; bx += 10) { g.line(bx, 56, bx + 5, 50, M.wood, 2); g.line(bx + 5, 56, bx, 50, M.wood, 2); }   // 拒馬（バリケード）
      K.banner(32, 20, M.banner, 10); K.banner(54, 20, M.banner, 10); g.rect(33, 18, 1, 14, M.wood); g.rect(55, 18, 1, 14, M.wood);
      K.fire(44, 54); g.rect(40, 46, 8, 10, '#2a1e18');
    }],
    void_rift: [64, 48, function (g, K, M, D, T) {
      K.shadow(32, 45, 30); [[10, 34, 8], [54, 34, 8], [32, 26, 10], [20, 40, 5], [46, 40, 5]].forEach(function (r) { K.rock(r[0], r[1], r[2], M); });
      g.poly([[24, 46], [30, 30], [28, 22], [34, 16], [36, 28], [40, 46]], '#0a0610'); g.glow(32, 32, 14, M.glow); g.line(31, 44, 33, 22, M.glow, 2);
      g.alpha(0.5, function () { g.ellipse(32, 40, 26, 6, M.mist); g.ellipse(20, 30, 10, 4, M.mist); });
    }],
    demon_castle: [100, 74, function (g, K, M, D, T) {
      K.shadow(50, 70, 49);
      [[50, 0, 9], [30, 10, 7], [70, 10, 7], [16, 22, 5], [84, 22, 5]].forEach(function (s) { var x = s[0], top = s[1], w = s[2]; g.rect(x - w / 2, top + 14, w, 44 - top, M.wall); g.tri(x - w / 2 - 2, top + 16, x + w / 2 + 2, top + 16, x, top, M.roof); g.tri(x, top, x + w / 2 + 2, top + 16, x, top + 16, M.roofD); g.rect(x - 1, top + 20, 2, 3, M.glow); g.glow(x, top + 21, 4, M.glow); });   // 巨大な尖塔
      K.wall(4, 96, 44, 24, M, 'crenel');
      for (var cx = 8; cx < 96; cx += 12) g.line(cx, 46, cx + 4, 66, M.glow2, 1);   // 赤い亀裂
      g.disc(50, 40, 5, '#d8d0c8'); g.rect(47, 41, 2, 2, '#16121a'); g.rect(51, 41, 2, 2, '#16121a');   // 髑髏の紋章
      K.gate(50, 68, 18, 18, 'demon', M);
      for (var lx = 0; lx < 100; lx += 9) g.rect(lx, 70, 4, 1, M.glow2);
    }],
    desert_city: [92, 66, function (g, K, M, D, T) {
      K.shadow(46, 62, 44); K.tree(6, 48, 5, 'palm'); K.tree(84, 46, 5, 'palm');
      K.wall(4, 88, 44, 14, M, 'plain');
      [[22, 44], [70, 44]].forEach(function (t) { K.tower(t[0] - 4, t[1], 8, 32, M, 'onion', { rh: 8, roof: M.roof, roofD: M.roofD, windows: false }); g.rect(t[0] - 5, t[1] - 22, 10, 2, M.wallD); });   // ミナレット
      g.rect(30, 26, 32, 18, M.wall); g.rect(56, 26, 6, 18, M.wallD); g.half(46, 26, 16, M.roof); g.ellipse(40, 18, 5, 4, shade(M.roof, 1.3)); g.rect(45, 6, 2, 5, M.accent);   // 大ドーム
      for (var a = 32; a < 60; a += 7) { g.arc(a + 3, 40, 3, Math.PI, 0, M.wallD); g.rect(a, 40, 6, 4, '#3a2a20'); }
      K.stall(10, 58, M.cloth); K.stall(72, 58, M.accent);
      g.arc(46, 54, 8, Math.PI, 0, M.wallD, 3); K.gate(46, 58, 12, 10, 'arch', M);
    }],
    bazaar: [88, 56, function (g, K, M, D, T) {
      K.shadow(44, 52, 42); K.tree(6, 40, 5, 'palm'); K.tree(82, 38, 5, 'palm');
      [[10, 38, M.cloth], [30, 34, M.cloth2], [52, 34, M.cloth3], [70, 38, M.cloth]].forEach(function (t) { K.tentShape(t[0], t[1], 16, 14, t[2], shade(t[2], 0.72)); });
      [[18, 48, M.cloth2], [38, 50, M.cloth], [58, 48, M.cloth3]].forEach(function (s) { K.stall(s[0], s[1], s[2]); });
      [[14, 28], [36, 24], [58, 24], [76, 30], [44, 44]].forEach(function (m) { g.rect(m[0], m[1], 3, 4, '#bfe4ff'); g.px(m[0] + 1, m[1] + 1, M.glint); g.px(m[0] + 4, m[1] - 1, M.glint); });   // 鏡のきらめき
      g.poly([[38, 56], [50, 56], [48, 50], [40, 50]], '#e4c48c');
    }],
    sand_canyon: [60, 48, function (g, K, M, D, T) {
      K.shadow(30, 45, 28); K.rock(10, 30, 12, M); K.rock(50, 30, 12, M); K.rock(14, 14, 8, M); K.rock(46, 12, 8, M);
      g.rect(24, 18, 12, 28, '#5a3e26'); g.rect(26, 18, 8, 28, '#2a1e14');
      g.alpha(0.6, function () { g.arc(30, 30, 14, Math.PI * 0.1, Math.PI * 0.9, M.sand, 3); g.arc(30, 22, 10, Math.PI * 1.1, Math.PI * 1.9, M.sand, 2); });
      if (D.decoration.indexOf('bones') >= 0) { g.rect(40, 42, 6, 1, '#f0e8d8'); g.disc(46, 41, 1, '#f0e8d8'); g.rect(8, 40, 5, 1, '#f0e8d8'); g.poly([[18, 18], [22, 8], [38, 8], [42, 18], [38, 18], [36, 12], [24, 12], [22, 18]], M.rockD); }   // 南口：崩れた石のアーチと骨
      else { g.rect(42, 36, 1, 8, '#6a4a2a'); g.rect(40, 35, 7, 3, '#8a6a3a'); g.rect(14, 38, 4, 6, M.rockD); }   // 北口：道標
    }],
    mirage_temple: [80, 68, function (g, K, M, D, T) {
      K.shadow(40, 64, 38);
      for (var st = 0; st < 5; st++) g.rect(8 + st * 5, 62 - st * 6, 64 - st * 10, 6, shade(M.wall, 1 - st * 0.05));   // 階段ピラミッド
      g.rect(34, 6, 12, 30, M.roof); g.rect(42, 6, 4, 30, M.roofD); g.tri(32, 7, 48, 7, 40, -6, M.roof); g.glow(40, 2, 10, M.glow);   // 黄金の塔
      [[18, 50], [58, 50], [26, 44], [50, 44]].forEach(function (h) { g.rect(h[0], h[1], 4, 3, M.accent); });   // 象形文字
      g.alpha(0.35, function () { for (var y = 40; y < 64; y += 3) g.rect(4, y, 72, 1, '#fff4c8'); });   // 蜃気楼
      g.rect(35, 52, 10, 10, '#2a1e14');
    }],
    forge_town: [92, 66, function (g, K, M, D, T) {
      K.shadow(46, 62, 44);
      g.rect(0, 56, 92, 3, M.lava); g.glow(20, 57, 10, M.glow); g.glow(70, 57, 10, M.glow); g.rect(0, 55, 92, 1, '#3a2a26');   // 溶岩の水路
      g.rect(32, 20, 28, 30, M.wall); g.rect(56, 20, 4, 30, M.wallD); g.half(46, 20, 14, M.metal); g.rect(38, 36, 16, 10, M.glow); g.glow(46, 40, 16, M.glow);   // 巨大な炉
      [[10, 4], [24, 8], [72, 6]].forEach(function (c) { g.rect(c[0], c[1] + 6, 5, 40 - c[1], M.metal); g.rect(c[0] + 3, c[1] + 6, 2, 40 - c[1], shade(M.metal, 0.7)); g.tri(c[0] - 1, c[1] + 6, c[0] + 6, c[1] + 6, c[0] + 2.5, c[1] - 2, '#ff8a2a'); g.tri(c[0] + 1, c[1] + 6, c[0] + 4, c[1] + 6, c[0] + 2.5, c[1] + 1, '#ffe27a'); });   // 炎の煙突
      K.house(4, 52, 22, 12, M, 'iron', { stone: true, rh: 8 }); K.house(66, 52, 22, 12, M, 'iron', { stone: true, rh: 8 });
      for (var gx = 4; gx < 26; gx += 5) g.line(gx, 40, gx + 5, 32, M.metal); for (var gx2 = 66; gx2 < 88; gx2 += 5) g.line(gx2, 40, gx2 + 5, 32, M.metal);   // 鉄骨
      K.gate(46, 54, 10, 8, 'iron', M);
    }],
    altar: [56, 50, function (g, K, M, D, T) {
      g.ellipse(28, 44, 27, 6, '#3a2a26'); g.ellipse(28, 44, 20, 3, M.lava); g.glow(28, 44, 16, M.glow);   // 火口
      for (var st = 0; st < 3; st++) g.rect(14 + st * 3, 36 - st * 4, 28 - st * 6, 4, shade(M.stone, 1 - st * 0.08));
      g.rect(22, 18, 12, 8, M.stoneD); K.fire(28, 18); g.line(18, 24, 12, 10, M.stoneL, 2); g.line(38, 24, 44, 10, M.stoneL, 2);   // 祭壇と竜の角
    }],
    vein_cave: [52, 42, function (g, K, M, D, T) {
      K.shadow(26, 39, 24); K.rock(26, 22, 16, M); K.rock(10, 30, 9, M); K.rock(42, 30, 9, M);
      [[16, 14, 22, 28], [34, 12, 30, 26], [8, 26, 14, 34], [44, 24, 40, 34]].forEach(function (v) { g.line(v[0], v[1], v[2], v[3], M.glow, 1); });
      g.glow(26, 32, 12, M.glow); g.ellipse(26, 34, 8, 8, '#140a08'); g.rect(18, 34, 16, 6, '#140a08');
    }],
    snow_port: [92, 64, function (g, K, M, D, T) {
      K.shadow(46, 50, 44); K.water(0, 50, 92, 64, '#5a8ab8'); [[10, 58], [40, 60], [70, 57]].forEach(function (f) { g.ellipse(f[0], f[1], 6, 2, '#dff4ff'); });   // 流氷
      K.tower(76, 48, 9, 32, M, 'cone', { light: M.ice, dark: '#8ab8d8', windows: false, rh: 5, roof: '#6a9ac8' }); g.rect(76, 14, 9, 4, '#4a6a8a'); g.rect(77, 15, 7, 2, M.glow); g.glow(80, 16, 10, M.glow);   // 氷の灯台
      K.house(4, 46, 14, 12, M, 'steep', { timber: true, rh: 7, chimney: true }); K.house(22, 44, 14, 12, M, 'steep', { timber: true, rh: 7 }); K.house(40, 46, 14, 11, M, 'steep', { timber: true, rh: 6, chimney: true }); K.house(58, 46, 12, 10, M, 'steep', { timber: true, rh: 6 });
      for (var ix = 4; ix < 70; ix += 4) g.tri(ix, 34, ix + 2, 34, ix + 1, 37, M.ice);   // つらら
      g.rect(30, 50, 20, 3, '#6a4a2e'); K.boat(52, 54, '#e8f0ff');
    }],
    winter_city: [92, 66, function (g, K, M, D, T) {
      K.shadow(46, 62, 44);
      K.wall(4, 88, 46, 12, M, 'ice');
      K.house(8, 44, 16, 14, M, 'steep', { stone: true, rh: 8 }); K.house(68, 44, 16, 14, M, 'steep', { stone: true, rh: 8 }); K.house(28, 40, 14, 14, M, 'steep', { stone: true, rh: 8 }); K.house(50, 40, 14, 14, M, 'steep', { stone: true, rh: 8 });
      [[24, 26], [64, 22], [46, 14]].forEach(function (c) { K.crystal(c[0], c[1], 10, M.crystal, shade(M.crystal, 0.7)); g.glow(c[0] + 3, c[1] - 5, 8, M.glow); });   // 記憶の結晶
      K.stall(16, 58, '#4a5070', '#d8e4f4'); K.stall(66, 58, '#4a5070', '#d8e4f4');
      K.gate(46, 58, 10, 10, 'arch', M);
    }],
    spirit_forest: [72, 56, function (g, K, M, D, T) {
      K.shadow(36, 52, 34); [[8, 46, 7], [24, 40, 8], [48, 40, 8], [64, 46, 7], [36, 30, 9]].forEach(function (t) { K.tree(t[0], t[1], t[2], 'snowpine'); });
      [[16, 22], [56, 18], [30, 14], [44, 30], [62, 30]].forEach(function (l) { g.disc(l[0], l[1], 1, '#ffffff'); g.glow(l[0], l[1], 5, M.glow); });
      g.rect(32, 44, 8, 8, '#1a2a2a'); g.disc(36, 44, 4, '#1a2a2a');
    }],
    frozen_clock: [56, 78, function (g, K, M, D, T, S) {
      K.shadow(28, 75, 26);
      K.tower(16, 72, 24, 54, M, 'spire', { round: false, bricks: true, rh: 10, windows: false, mortar: '#8aa8c4' });
      K.clock(28, 30, 8, M.clock, !!S.moving, '#4a6a8a'); g.glow(28, 30, 12, M.glow);
      for (var ix = 16; ix < 40; ix += 3) g.tri(ix, 40, ix + 2, 40, ix + 1, 46 + (ix % 2) * 3, M.ice);   // つらら
      g.alpha(0.5, function () { g.rect(14, 44, 28, 28, M.ice); });   // 氷
      g.rect(23, 62, 10, 10, '#1a2a3a'); g.disc(28, 62, 5, '#1a2a3a');
      if (!S.moving) { g.line(18, 22, 24, 20, '#ffffff'); g.line(34, 36, 38, 40, '#ffffff'); }
    }],
    casino_city: [92, 68, function (g, K, M, D, T) {
      K.shadow(46, 64, 44);
      [[14, 60, 30], [78, 60, 30]].forEach(function (t) { K.tower(t[0] - 6, t[1], 12, t[2], M, 'dome', { round: false, win: M.glow, winStep: 6, rh: 5 }); for (var y = t[1] - t[2] + 4; y < t[1] - 2; y += 6) g.rect(t[0] - 6, y, 12, 1, M.neon); });   // 金色の塔
      g.rect(28, 20, 36, 34, M.wall); g.rect(60, 20, 4, 34, M.wallD); g.half(46, 20, 18, M.roof); g.ellipse(40, 12, 5, 4, shade(M.roof, 1.3)); g.rect(45, 0, 2, 4, M.accent);   // 金のドームの大カジノ
      g.disc(46, 30, 7, '#2a1a10'); g.disc(46, 30, 6, M.roof); for (var a = 0; a < 8; a++) { var an = a * Math.PI / 4; g.line(46, 30, 46 + Math.cos(an) * 5, 30 + Math.sin(an) * 5, a % 2 ? '#c83a3a' : '#1a1a1a'); } g.disc(46, 30, 1, '#ffffff');   // ルーレットの看板
      for (var nx = 28; nx < 64; nx += 3) { g.px(nx, 21, nx % 2 ? M.neon : M.accent); g.px(nx, 52, nx % 2 ? M.accent : M.neon); }   // ネオン
      [[32, 42], [56, 42]].forEach(function (w) { g.rect(w[0], w[1], 4, 6, M.glow); });
      g.glow(46, 46, 14, M.glow); g.rect(40, 44, 12, 10, '#1a0a1a'); g.rect(41, 45, 10, 9, M.accent);
      K.stall(4, 64, M.accent, M.roof); K.stall(80, 64, M.neon, M.roof);
    }],
    /* ---- 洞窟・ダンジョン・小さな拠点 ---- */
    forest_arch: [56, 48, function (g, K, M, D, T) {
      K.shadow(28, 45, 26); [[8, 40, 7], [48, 40, 7], [14, 26, 8], [42, 26, 8], [28, 14, 9]].forEach(function (t) { g.disc(t[0], t[1], t[2], M.leaf); g.disc(t[0] - 2, t[1] - 2, t[2] - 3, M.leafL); });
      g.rect(14, 26, 4, 20, M.wood); g.rect(38, 26, 4, 20, M.wood); g.arc(28, 26, 12, Math.PI, 0, M.wood, 3);   // 木のアーチ
      g.ellipse(28, 38, 9, 9, '#0e1a0e'); g.rect(19, 38, 18, 8, '#0e1a0e');
      [[22, 30], [34, 34], [28, 24]].forEach(function (l) { g.glow(l[0], l[1], 3, M.glow); g.px(l[0], l[1], '#ffffff'); });
    }],
    cave: null,   // 従来の洞窟の絵（drawCave）＋固有の色
    mountain_pass: [60, 48, function (g, K, M, D, T) {
      K.shadow(30, 45, 28); g.poly([[0, 44], [12, 10], [24, 30], [30, 44]], M.rock); g.poly([[12, 10], [18, 20], [24, 30], [14, 30]], M.rockL); g.poly([[30, 44], [38, 30], [48, 6], [60, 44]], M.rock); g.poly([[48, 6], [54, 30], [60, 44], [50, 30]], M.rockD);
      g.tri(9, 16, 15, 16, 12, 10, M.snow); g.tri(44, 14, 52, 14, 48, 6, M.snow);
      g.poly([[24, 48], [36, 48], [33, 30], [27, 30]], '#b89a6a');   // 峠道
      g.rect(38, 34, 1, 8, M.wood); g.rect(36, 34, 7, 3, shade(M.wood, 1.3));   // 道標
      if (D.decoration.indexOf('gatepost') >= 0) { g.rect(22, 30, 3, 14, M.wood); g.rect(35, 30, 3, 14, M.wood); g.rect(21, 29, 18, 2, M.wood); }
      if (D.decoration.indexOf('banner') >= 0) K.banner(22, 31, '#7a2a2a', 6);
    }],
    mine: [56, 46, function (g, K, M, D, T) {
      K.shadow(28, 43, 26); K.rock(28, 22, 16, M); K.rock(10, 30, 9, M); K.rock(46, 30, 9, M);
      g.rect(16, 22, 3, 20, M.wood); g.rect(37, 22, 3, 20, M.wood); g.rect(15, 20, 26, 3, M.wood); g.rect(19, 23, 18, 19, '#0e0a0c');   // 坑道口
      g.rect(10, 42, 36, 1, M.metal); g.rect(10, 44, 36, 1, M.metal); for (var r = 11; r < 46; r += 3) g.rect(r, 42, 1, 3, '#3a2e26');   // レール
      g.rect(38, 36, 9, 5, M.metal); g.rect(38, 35, 9, 1, '#8a6a4a'); [[40, 41], [45, 41]].forEach(function (w) { g.disc(w[0], w[1], 1, '#2a2a2a'); });   // トロッコ
      g.glow(28, 32, 8, M.glow); g.rect(24, 25, 2, 3, M.glow);
    }],
    shore_hut: [52, 44, function (g, K, M, D, T, S) {
      K.shadow(26, 36, 24); K.water(0, 36, 52, 44, '#3f6ab0'); g.rect(0, 34, 52, 2, '#d8c890');
      K.house(14, 34, 18, 12, M, 'shed', { rh: 6, timber: true, lit: true }); g.rect(36, 34, 14, 2, M.wood); for (var p = 38; p < 50; p += 4) g.rect(p, 36, 1, 5, '#3a2a1a');
      g.rect(34, 22, 1, 12, M.wood); g.rect(33, 20, 3, 3, S.lit ? M.glow : '#5a5a6a'); if (S.lit) g.glow(34, 21, 8, M.glow);   // 灯り
    }],
    vent_cave: [52, 42, function (g, K, M, D, T) {
      K.shadow(26, 39, 24); K.rock(26, 22, 16, M); K.rock(10, 30, 9, M); K.rock(42, 30, 9, M);
      [[12, 14], [40, 12], [30, 6]].forEach(function (v) { g.rect(v[0] - 1, v[1], 3, 2, '#2a2228'); K.smoke(v[0], v[1] - 2, 3, M.smoke); g.px(v[0], v[1] + 1, M.glow); });
      g.ellipse(26, 33, 8, 8, '#140f14'); g.rect(18, 33, 16, 6, '#140f14');
    }],
    wreck: [60, 48, function (g, K, M, D, T) {
      K.water(0, 30, 60, 48, '#2f5a98'); [[10, 36, 6], [48, 38, 7], [30, 40, 5]].forEach(function (r) { K.rock(r[0], r[1], r[2], M); });
      g.poly([[12, 34], [44, 26], [46, 32], [16, 40]], M.wood); g.poly([[12, 34], [44, 26], [44, 28], [14, 36]], M.woodL);   // 傾いた船体
      g.line(30, 30, 24, 4, M.wood, 2); g.poly([[24, 6], [36, 10], [26, 20]], M.sail); g.line(24, 10, 36, 14, M.wood);   // 折れたマスト
      g.ellipse(30, 40, 7, 3, '#0a1a30');
    }],
    stilt_shacks: [76, 54, function (g, K, M, D, T) {
      K.water(0, 38, 76, 54, '#2f5a98');
      [[6, 34], [30, 30], [54, 34]].forEach(function (h) { for (var s = 0; s < 3; s++) g.rect(h[0] + 2 + s * 6, h[1], 1, 14, M.wood); K.house(h[0], h[1], 16, 9, M, 'shed', { rh: 5, timber: true }); });
      g.rect(20, 36, 12, 2, M.wood); g.rect(44, 36, 12, 2, M.wood);   // 渡り板
      g.rect(38, 4, 1, 22, M.wood); g.rect(39, 4, 10, 7, M.flag); g.disc(44, 7, 2, M.accent); g.px(43, 7, M.flag); g.px(45, 7, M.flag);   // 髑髏の旗
      [[24, 46], [50, 46]].forEach(function (b) { g.rect(b[0], b[1], 4, 4, '#7a5a30'); g.rect(b[0], b[1] + 1, 4, 1, '#5a3a24'); });
    }],
    cape_shrine: [56, 50, function (g, K, M, D, T) {
      K.water(0, 40, 56, 50, '#2f5a98'); K.rock(16, 38, 12, M); K.rock(40, 40, 10, M);
      K.house(18, 30, 16, 10, M, 'gable', { stone: true, rh: 7 }); g.rect(38, 24, 3, 6, M.wallD); g.rect(37, 22, 5, 2, M.wall); g.rect(38, 25, 3, 2, M.glow); g.glow(39, 26, 6, M.glow);   // 石灯籠
    }],
    faded_village: [80, 56, function (g, K, M, D, T) {
      g.alpha(0.55, function () { K.shadow(40, 52, 38); [[8, 44, 14, 9], [28, 40, 14, 10], [50, 44, 14, 9]].forEach(function (h) { K.house(h[0], h[1], h[2], h[3], M, 'gable', { rh: 6, lit: false }); }); K.tree(70, 40, 5, 'dead'); });
      g.alpha(0.35, function () { g.ellipse(40, 46, 38, 8, '#e8e6f0'); });
    }],
    mist_rocks: [56, 46, function (g, K, M, D, T) {
      K.water(0, 34, 56, 46, '#3a5a8a'); K.rock(20, 30, 12, M); K.rock(40, 32, 9, M); g.ellipse(28, 34, 6, 6, '#141c28');
      g.alpha(0.7, function () { g.ellipse(28, 26, 26, 7, M.mist); g.ellipse(18, 36, 14, 4, M.mist); g.ellipse(42, 20, 12, 4, M.mist); });
    }],
    old_city: [76, 60, function (g, K, M, D, T) {
      K.shadow(38, 56, 36);
      [[6, 56, 12, 40], [20, 56, 14, 50], [38, 56, 12, 34], [52, 56, 16, 46]].forEach(function (b, i) { g.rect(b[0], b[1] - b[3], b[2], b[3], M.wall); g.rect(b[0] + b[2] - 2, b[1] - b[3], 2, b[3], M.wallD); for (var y = b[1] - b[3] + 3; y < b[1] - 4; y += 5) for (var x = b[0] + 2; x < b[0] + b[2] - 3; x += 4) g.rect(x, y, 2, 3, (x + y + i) % 3 ? '#2a2e36' : M.glow); g.poly([[b[0], b[1] - b[3]], [b[0] + b[2] * 0.4, b[1] - b[3] - 3], [b[0] + b[2], b[1] - b[3] + 2]], M.wallD); });
      for (var m = 0; m < 6; m++) g.px(24 + m, 20 + m * 2, M.moss);
      g.rect(32, 46, 8, 10, '#1a1e24');
    }],
    factory: [76, 52, function (g, K, M, D, T) {
      K.shadow(38, 48, 36); g.rect(4, 22, 68, 24, M.wall); g.rect(4, 44, 68, 2, M.wallD);
      for (var i = 0; i < 6; i++) { g.poly([[4 + i * 11, 22], [15 + i * 11, 22], [15 + i * 11, 14]], M.roof); g.rect(14 + i * 11, 14, 1, 8, '#bfe4ff'); }   // のこぎり屋根
      g.rect(0, 40, 76, 3, M.metal); for (var c = 2; c < 76; c += 6) g.rect(c, 40, 3, 1, '#4a5060');   // 搬送路
      g.rect(62, 6, 6, 16, M.metal); g.disc(65, 5, 2, M.glow); g.glow(65, 5, 6, M.glow);
      g.rect(32, 30, 12, 14, '#2a2e36'); for (var s = 31; s < 44; s += 3) g.rect(32, s, 12, 1, '#4a5060');
    }]
  };
  // 形ごとの部品の組み立てから、1枚の絵を作る
  function drawDesign(D, T, S) {
    var spec = COMPOSE[D.silhouette]; if (!spec) return null;
    var g = painter(spec[0], spec[1]); var K = kit(g, T);
    var M = D.materials; if (M.rock === undefined && D.silhouette === 'mountain_pass') M.rock = T.rock;
    spec[2](g, K, M, D, T, S || {});
    return g.canvas;
  }
  Landmarks.COMPOSE = COMPOSE; Landmarks.drawDesign = drawDesign;

  var DRAW = { castle_icon: drawCastle, village: drawTown, cave_icon: drawCave, tower_icon: drawTower };
  Landmarks.kinds = Object.keys(DRAW);
  // 絵（論理ピクセル）。v6.2：場所ごとの固有デザイン（LOCATION_DESIGNS）があればそれを組み立てる。キャッシュは場所ごと（id＋物語の進行状態）
  Landmarks.art = function (icon, fallback, id) {
    var T = themeFor(fallback, id); var seed = hstr(id || icon); var LD = root.LocationDesign;
    var des = LD && id ? LD.get(id) : null;
    if (des) {
      var flags = root.State && root.State.data ? root.State.data.flags : {}; var r = LD.resolve(id, flags); var Dz = r.design;
      var key0 = 'loc:' + r.key + ':' + fallback;
      if (!Landmarks.cache[key0]) {
        var St = { lit: !!Dz.lit, moving: !!Dz.moving, banner: Dz.banner, liberated: !!Dz.liberated };
        var img = Dz.silhouette === 'cave' ? drawCave(Object.assign({}, T, { rock: Dz.materials.rock || T.rock, rockL: Dz.materials.rockL || T.rockL, rockD: Dz.materials.rockD || T.rockD, wood: Dz.materials.wood || T.wood }), seed) : drawDesign(Dz, T, St);
        Landmarks.cache[key0] = img || (DRAW[icon] ? DRAW[icon](T, seed) : null);
      }
      return Landmarks.cache[key0];
    }
    if (!DRAW[icon]) return null;
    var key = icon + ':' + (T === THEMES.dark ? 'dark' : fallback) + ':' + (id || icon);   // v6.2 場所ごとに別のキー（違う町に同じ絵が使われないように）
    if (!Landmarks.cache[key]) Landmarks.cache[key] = DRAW[icon](T, seed);
    return Landmarks.cache[key];
  };
  // 物語の進行で見た目が変わったら、古い絵を捨てる（新しいキーで描き直す）
  Landmarks.clearCache = function () { Landmarks.cache = {}; };
  // 画面へ描く：入口のマス (tx,ty) の下端中央が絵の下端中央
  // 入口のまわりの地面から地域の雰囲気を決める（地域全体の fallback が草原でも、闇の大地・雪原なら合わせる）
  var GROUND = { darkland: 'darkland', sand: 'sand', desert: 'sand', snow: 'snow', ice: 'snow', ash: 'ash', slag: 'ash', lava: 'ash', cloud: 'cloud' };
  Landmarks.terrainOf = function (map, L) {
    if (L._lmGround !== undefined) return L._lmGround;
    var count = {}; for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) { var t = GROUND[map.tile(L.x + dx, L.y + dy)]; if (t) count[t] = (count[t] || 0) + 1; }
    var best = null, n = 4; Object.keys(count).forEach(function (k) { if (count[k] > n) { n = count[k]; best = k; } });
    L._lmGround = best || (map.def && map.def.fallback) || 'grass'; return L._lmGround;
  };
  Landmarks.draw = function (ctx, L, fallback, camX, camY) {
    var img = Landmarks.art(L.icon, fallback, L.id); if (!img) return;
    var TS = root.Engine.TS, S = root.Engine.SCALE; var w = img.width * S, h = img.height * S;
    var x = Math.round(L.x * TS + TS / 2 - w / 2 - camX), y = Math.round((L.y + 1) * TS + 2 - h - camY);
    var sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(img, x, y, w, h); ctx.imageSmoothingEnabled = sm;
  };
  // 夜に灯る（町・城の窓あかり）
  Landmarks.glow = function (ctx, L, camX, camY) {
    var des = root.LocationDesign && root.LocationDesign.get(L.id); var gcol = '255,200,110';
    if (des) { var Rz = root.LocationDesign.resolve(L.id, root.State && root.State.data ? root.State.data.flags : {}).design; var gc = Rz.materials.glow; if (!gc) return; var hc = hex(gc); gcol = hc.join(','); }   // v6.2 場所ごとの灯りの色（魔王城は赤、氷の塔は青白…）
    else if (L.icon !== 'village' && L.icon !== 'castle_icon' && L.icon !== 'tower_icon') return;
    var TS = root.Engine.TS; var cx = L.x * TS + TS / 2 - camX, cy = (L.y + 1) * TS - TS * (L.icon === 'castle_icon' ? 1.6 : 1.1) - camY; var r = TS * (L.icon === 'castle_icon' ? 2.6 : 2.0);
    if (!ctx.createRadialGradient) return;
    var grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); grd.addColorStop(0, 'rgba(' + gcol + ',0.32)'); grd.addColorStop(1, 'rgba(' + gcol + ',0)');
    ctx.fillStyle = grd; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  };
  // 入口のマスは地域の地面で塗る（旧来の小さなアイコンが絵のすき間から見えないように）
  Landmarks.groundTile = function (theme) { return { darkland: 'darkland', sand: 'sand', snow: 'snow', ash: 'ash' }[theme] || 'grass'; };
  // 画面内に入りうる範囲（タイル）：絵の大きさぶん余裕を見る
  Landmarks.MARGIN = 4;   // v6.2 固有デザインの絵は最大 100 論理px 幅

  root.Landmarks = Landmarks;
})(typeof window !== 'undefined' ? window : globalThis);
