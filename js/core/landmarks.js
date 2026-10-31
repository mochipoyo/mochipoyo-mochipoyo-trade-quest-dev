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
      speckle: function (n, x0, y0, x1, y1, cols, seed) { var s = seed || 7; for (var i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; var x = x0 + s % (x1 - x0); s = (s * 1103515245 + 12345) & 0x7fffffff; var y = y0 + s % (y1 - y0); g.px(x, y, cols[i % cols.length]); } }
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

  var DRAW = { castle_icon: drawCastle, village: drawTown, cave_icon: drawCave, tower_icon: drawTower };
  Landmarks.kinds = Object.keys(DRAW);
  // 絵（論理ピクセル）。key ごとにキャッシュ
  Landmarks.art = function (icon, fallback, id) {
    if (!DRAW[icon]) return null;
    var T = themeFor(fallback, id); var seed = hstr(id || icon);
    var key = icon + ':' + (T === THEMES.dark ? 'dark' : fallback) + ':' + (seed % 5);
    if (!Landmarks.cache[key]) Landmarks.cache[key] = DRAW[icon](T, seed);
    return Landmarks.cache[key];
  };
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
    if (L.icon !== 'village' && L.icon !== 'castle_icon' && L.icon !== 'tower_icon') return;
    var TS = root.Engine.TS; var cx = L.x * TS + TS / 2 - camX, cy = (L.y + 1) * TS - TS * (L.icon === 'castle_icon' ? 1.6 : 1.1) - camY; var r = TS * (L.icon === 'castle_icon' ? 2.6 : 2.0);
    if (!ctx.createRadialGradient) return;
    var grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); grd.addColorStop(0, 'rgba(255,200,110,0.32)'); grd.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = grd; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  };
  // 入口のマスは地域の地面で塗る（旧来の小さなアイコンが絵のすき間から見えないように）
  Landmarks.groundTile = function (theme) { return { darkland: 'darkland', sand: 'sand', snow: 'snow', ash: 'ash' }[theme] || 'grass'; };
  // 画面内に入りうる範囲（タイル）：絵の大きさぶん余裕を見る
  Landmarks.MARGIN = 3;

  root.Landmarks = Landmarks;
})(typeof window !== 'undefined' ? window : globalThis);
