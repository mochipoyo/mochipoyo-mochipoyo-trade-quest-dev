/* =========================================================
   Core / Tiles : プロシージャル生成の高精細タイルセット（オリジナル）
   ・各タイルは 16×16 の論理ピクセルで描き、Engine.SCALE 倍で表示する
   ・同じ種類でも variants 数だけ模様が変わる（マップ座標のハッシュで選択）
   ・水面・松明・鉱石などは2フレームでアニメーション
   ・Tiles.edge() は隣接判定による縁取り（オートタイル的な表現）
   ・画像ファイルに依存せず、Canvasだけで生成する
   ========================================================= */
(function (root) {
  'use strict';

  var Tiles = { defs: {}, byChar: {}, cache: {}, edgeCache: {} };

  /* ---------- 色ユーティリティ ---------- */
  function hex(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function rgb(a) { return 'rgb(' + a.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))); }).join(',') + ')'; }
  function shade(c, k) { var a = hex(c); return rgb(a.map(function (v) { return v * k; })); }      // k<1 暗く, >1 明るく
  function mix(c1, c2, t) { var a = hex(c1), b = hex(c2); return rgb(a.map(function (v, i) { return v + (b[i] - v) * t; })); }
  function hash(x, y, s) { var h = (x * 374761393 + y * 668265263 + (s || 0) * 1274126177) | 0; h = (h ^ (h >> 13)) * 1274126177; h = h ^ (h >> 16); return ((h >>> 0) % 10000) / 10000; }
  Tiles.hash = hash;

  /* ---------- 16×16 論理ピクセル用の描画API ---------- */
  function painter(ctx, seed) {
    var u = root.Engine.TS / 16; var rs = seed >>> 0;
    var g = {
      rnd: function () { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; },
      px: function (x, y, c) { if (x < 0 || y < 0 || x > 15 || y > 15) return; ctx.fillStyle = c; ctx.fillRect(x * u, y * u, u, u); },
      rect: function (x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x * u, y * u, w * u, h * u); },
      fill: function (c) { ctx.fillStyle = c; ctx.fillRect(0, 0, 16 * u, 16 * u); },
      hline: function (x, y, w, c) { g.rect(x, y, w, 1, c); },
      vline: function (x, y, h, c) { g.rect(x, y, 1, h, c); },
      // 円（塗り）
      tri: function (x0, y0, x1, y1, x2, y2, c) { var minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2); for (var y = Math.floor(minY); y <= Math.ceil(maxY); y++) { var xs = []; [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]].forEach(function (e) { var ax = e[0], ay = e[1], bx = e[2], by = e[3]; if ((y >= Math.min(ay, by)) && (y <= Math.max(ay, by)) && ay !== by) xs.push(ax + (y - ay) * (bx - ax) / (by - ay)); }); if (xs.length >= 2) { var a = Math.round(Math.min.apply(null, xs)), b = Math.round(Math.max.apply(null, xs)); for (var x = a; x <= b; x++) g.px(x, y, c); } } },
      disc: function (cx, cy, r, c) { for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.5) g.px(Math.round(cx + x), Math.round(cy + y), c); },
      // ノイズ散布
      speckle: function (n, colors, x0, y0, x1, y1) { x0 = x0 || 0; y0 = y0 || 0; x1 = x1 === undefined ? 15 : x1; y1 = y1 === undefined ? 15 : y1; for (var i = 0; i < n; i++) { var x = x0 + Math.floor(g.rnd() * (x1 - x0 + 1)), y = y0 + Math.floor(g.rnd() * (y1 - y0 + 1)); g.px(x, y, colors[Math.floor(g.rnd() * colors.length)]); } },
      alpha: function (c, a) { var v = hex(c); return 'rgba(' + v.join(',') + ',' + a + ')'; }
    };
    return g;
  }

  /* ---------- 共通の地形パーツ ---------- */
  var GR = { base: '#4a9a3f', d1: '#3f8a36', d2: '#357a2e', l1: '#58ab48', l2: '#6cbd57', dirt: '#8a6a3a', dirt2: '#a07e48', stone: '#9a9a8a', stone2: '#b8b8a8' };
  function grassBase(g, v) {
    g.fill(v === 3 ? mix(GR.base, GR.d1, 0.4) : GR.base);
    g.speckle(26, [GR.d1, GR.d2, GR.l1], 0, 0, 15, 15);
    // 草の束
    for (var i = 0; i < 5; i++) { var x = Math.floor(g.rnd() * 14), y = 2 + Math.floor(g.rnd() * 12); g.px(x, y, GR.l2); g.px(x + 1, y - 1, GR.l1); g.px(x - 1, y - 1, GR.d2); }
    if (v === 1) { for (var f = 0; f < 3; f++) { var fx = 1 + Math.floor(g.rnd() * 13), fy = 1 + Math.floor(g.rnd() * 13); var fc = ['#ffd24a', '#ff8ab0', '#ffffff', '#9fd0ff'][Math.floor(g.rnd() * 4)]; g.px(fx, fy, fc); g.px(fx + 1, fy, fc); g.px(fx, fy + 1, fc); g.px(fx + 1, fy + 1, fc); g.px(fx + 1, fy + 2, GR.d2); } }
    if (v === 2) { for (var p = 0; p < 3; p++) { var px = 1 + Math.floor(g.rnd() * 12), py = 1 + Math.floor(g.rnd() * 12); g.px(px, py, GR.stone2); g.px(px + 1, py, GR.stone); g.px(px, py + 1, GR.stone); } }
    if (v === 3) { var dx = 3 + Math.floor(g.rnd() * 6), dy = 3 + Math.floor(g.rnd() * 6); g.disc(dx + 2, dy + 2, 3, '#6fa84a'); g.disc(dx + 2, dy + 2, 2, '#86b85a'); g.speckle(5, ['#a8a070', GR.l2], dx, dy, dx + 4, dy + 4); }
  }
  function treeOn(g, base, cx, cy, r, leaf, leafL, leafD, trunk) {
    // 影
    for (var x = -r; x <= r; x++) for (var y = 0; y <= 2; y++) if (Math.abs(x) < r - y + 1) g.px(cx + x + 1, cy + r + y, g.alpha('#000000', 0.25));
    // 幹
    g.rect(cx - 1, cy + r - 3, 2, 5, trunk); g.px(cx - 1, cy + r - 1, shade(trunk, 0.7));
    // 葉（3層）
    g.disc(cx, cy, r, leafD); g.disc(cx - 1, cy - 1, r - 1, leaf); g.disc(cx - 2, cy - 2, r - 3, leafL);
    g.px(cx - 3, cy - 3, '#c9f0a0'); g.px(cx + 1, cy + r - 2, leafD); g.px(cx + 2, cy - 1, leafD); g.px(cx - 2, cy + 1, leaf);
  }

  /* ---------- 定義 ---------- */
  function def(name, o) { o.name = name; Tiles.defs[name] = o; if (o.ch) Tiles.byChar[o.ch] = name; }

  // ===== 草原・自然 =====
  def('grass', { ch: '.', variants: 4, paint: function (g, v) { grassBase(g, v); } });
  def('grass2', { ch: ',', variants: 2, paint: function (g, v) { grassBase(g, 1); } });
  def('tree', { ch: 'f', solid: true, variants: 3, paint: function (g, v) {
    grassBase(g, 0);
    if (v === 2) treeOn(g, 0, 8, 7, 5, '#3f8a36', '#5fb34a', '#2a5a28', '#6a4a2a');          // 丸い木
    else if (v === 1) { treeOn(g, 0, 8, 8, 5, '#2f7a3a', '#4f9f4a', '#1f4a28', '#5a3a1a'); g.rect(6, 1, 4, 3, '#2f7a3a'); g.rect(7, 0, 2, 2, '#4f9f4a'); } // 針葉樹風に高く
    else treeOn(g, 0, 8, 7, 6, '#3a8a3a', '#5aaa4a', '#245a28', '#6a4a2a');
  } });
  def('forest', { ch: 'F', solid: true, variants: 3, paint: function (g, v) {
    g.fill('#1f5a28');
    var cols = ['#2a6e32', '#357f3a', '#1a4a22', '#3f9140'];
    for (var i = 0; i < 9; i++) { var cx = Math.floor(g.rnd() * 16), cy = Math.floor(g.rnd() * 16); g.disc(cx, cy, 2 + Math.floor(g.rnd() * 2), cols[i % 4]); }
    g.speckle(14, ['#4fa048', '#2a6e32', '#163f1c']);
    g.px(3 + v * 4, 2, '#8fd37a'); g.px(10 - v * 2, 9, '#8fd37a');
    if (v === 0) { g.rect(7, 12, 2, 4, '#4a2e1a'); }
  } });
  def('hill', { ch: 'h', variants: 2, paint: function (g, v) { grassBase(g, 0); for (var y = 6; y < 16; y++) for (var x = 0; x < 16; x++) { var d = Math.abs(x - 8) + (y - 11) * 0.8; if (d < 7) g.px(x, y, y < 11 ? GR.l1 : GR.d1); } g.speckle(6, [GR.d2, GR.l2], 2, 7, 13, 14); g.hline(4, 12, 8, GR.d2); } });
  def('mountain', { ch: 'm', solid: true, variants: 3, paint: function (g, v) {
    grassBase(g, 0);
    var R = '#7a7a86', L = '#a3a3ae', D = '#55555f', S = '#f4f6ff';
    // 山の輪郭（三角）
    for (var y = 1; y < 16; y++) { var half = Math.min(8, (y - 1) * 0.65 + 1); for (var x = Math.round(8 - half); x <= Math.round(8 + half); x++) g.px(x, y, x < 8 ? L : R); }
    for (var y2 = 10; y2 < 16; y2++) g.hline(Math.round(8 - Math.min(8, (y2 - 1) * 0.65 + 1)), y2, 3, D);
    g.speckle(10, [D, '#8a8a96', '#6a6a76'], 3, 5, 13, 15);
    if (v !== 2) { for (var sy = 1; sy < 4; sy++) g.hline(Math.round(8 - (sy - 1) * 0.65 - 1), sy, Math.round((sy - 1) * 1.3 + 3), S); g.px(7, 4, S); }
    g.hline(2, 15, 12, '#2f6b2a');
  } });
  def('cliff', { ch: 'c', solid: true, variants: 2, paint: function (g, v) { g.fill('#6a6a76'); for (var y = 0; y < 16; y += 4) for (var x = (y / 4) % 2 * 3; x < 16; x += 6) { g.rect(x, y, 5, 3, '#8a8a96'); g.hline(x, y, 5, '#a3a3ae'); g.vline(x, y, 3, '#9a9aa6'); } g.speckle(10, ['#55555f', '#3a3a44']); g.hline(0, 15, 16, '#3a3a44'); } });
  def('sand', { ch: 's', variants: 3, paint: function (g, v) { g.fill('#e6d39a'); g.speckle(18, ['#d9c285', '#f0dfae', '#cdb378']); for (var i = 0; i < 3; i++) { var y = 2 + i * 5 + Math.floor(g.rnd() * 2); for (var x = 0; x < 16; x++) if ((x + i) % 5 < 3) g.px(x, y + ((x >> 2) & 1), '#d4bd80'); } if (v === 2) { g.rect(10, 9, 3, 2, '#b89a60'); g.px(11, 8, '#c9ac70'); } } });
  def('snow', { ch: 'n', variants: 3, paint: function (g, v) { g.fill('#eef3ff'); g.speckle(14, ['#dde6f8', '#ffffff', '#c9d6f0']); if (v === 1) { g.disc(10, 10, 3, '#d6e2f6'); g.disc(9, 9, 2, '#e8eefc'); } if (v === 2) { g.rect(3, 4, 5, 2, '#cdd9f0'); g.hline(3, 6, 5, '#b9c7e6'); } } });
  def('lava', { ch: 'l', solid: true, anim: true, paint: function (g, v, f) { g.fill('#d8401a'); g.speckle(16, ['#ff7a2a', '#ffb03a', '#a82a10']); for (var i = 0; i < 4; i++) { var y = (i * 4 + f * 2) % 16; g.hline(i * 3, y, 5, '#ff9a3a'); g.px(i * 3 + 2, y + 1, '#ffd24a'); } } });

  // ===== 水 =====
  def('water', { ch: '~', solid: true, anim: true, paint: function (g, v, f) { g.fill('#1f4f9a'); g.speckle(10, ['#1a4488', '#2a5cab']); for (var i = 0; i < 3; i++) { var y = (3 + i * 5 + f * 2) % 16; g.hline((i * 5 + f * 3) % 10, y, 4, '#4f8fe0'); g.px((i * 5 + f * 3) % 10 + 1, y - 1, '#7fb8ff'); } } });
  def('deep', { ch: '0', solid: true, anim: true, paint: function (g, v, f) { g.fill('#122f6a'); g.speckle(8, ['#0f2858', '#183a7a']); for (var i = 0; i < 2; i++) { var y = (5 + i * 7 + f * 2) % 16; g.hline((i * 6 + f * 2) % 11, y, 5, '#2a5aa8'); g.px((i * 6 + f * 2) % 11 + 2, y - 1, '#3f74c4'); } } });   // v5.2: 外海（海流。遠洋航海船のみ）
  def('shallow', { ch: 'w', solid: true, anim: true, paint: function (g, v, f) { g.fill('#3f8ad8'); g.speckle(12, ['#5aa0e8', '#2f76c4', '#8fc8ff']); for (var i = 0; i < 3; i++) { var y = (2 + i * 5 + f * 2) % 16; g.hline((i * 4 + f * 3) % 11, y, 5, '#9fd4ff'); g.px((i * 4 + f * 3) % 11 + 2, y + 1, '#d8f0ff'); } } });
  def('bridge', { ch: 'b', paint: function (g) { g.fill('#3f8ad8'); for (var y = 0; y < 16; y += 2) { g.hline(2, y, 12, y % 4 === 0 ? '#a07040' : '#8a5a30'); g.px(2, y, '#6a4420'); } g.vline(1, 0, 16, '#5a3a1a'); g.vline(14, 0, 16, '#5a3a1a'); g.vline(0, 0, 16, '#c9a06a'); g.vline(15, 0, 16, '#c9a06a'); } });
  def('dock', { ch: 'd', paint: function (g) { g.fill('#2f76c4'); for (var y = 0; y < 16; y += 2) { g.hline(0, y, 16, y % 4 === 0 ? '#a07040' : '#8a5a30'); } g.vline(3, 0, 16, '#6a4420'); g.vline(12, 0, 16, '#6a4420'); g.speckle(4, ['#c9a06a']); } });

  // ===== 道・舗装 =====
  def('road', { ch: 'r', variants: 3, paint: function (g, v) { g.fill('#b89c6a'); g.speckle(22, ['#a98a58', '#c9ad7a', '#8f7446']); g.hline(0, 5 + v, 16, '#a98a58'); g.hline(0, 10 - v, 16, '#a98a58'); g.px(3 + v * 4, 8, '#8a8a7a'); g.px(4 + v * 4, 8, '#a0a090'); g.rect(10 - v * 2, 2, 2, 1, '#8f7446'); } });
  def('stone', { ch: '=', variants: 3, paint: function (g, v) { g.fill('#8e8e9c'); var off = v * 2; for (var y = 0; y < 16; y += 4) for (var x = ((y / 4) % 2) * 3 - off; x < 18; x += 6) { g.rect(x, y, 5, 3, ['#a1a1ae', '#9a9aa8', '#aaaab6'][(x + y) % 3]); g.hline(x, y, 5, '#b6b6c2'); g.vline(x, y, 3, '#b0b0bc'); } g.speckle(8, ['#6f6f7c', '#c4c4ce']); } });
  def('floor_wood', { ch: '_', variants: 2, paint: function (g, v) { g.fill('#a8743f'); for (var y = 0; y < 16; y += 4) { g.hline(0, y, 16, '#7a5027'); g.hline(0, y + 2, 16, '#b9834a'); g.vline(4 + (y / 4 % 2) * 7 + v * 2, y, 4, '#7a5027'); } g.speckle(6, ['#8a6033', '#c08f55']); } });
  def('floor_stone', { ch: ':', variants: 2, paint: function (g, v) { g.fill('#8a8aa0'); for (var y = 0; y < 16; y += 8) for (var x = 0; x < 16; x += 8) { g.rect(x + 1, y + 1, 6, 6, (x + y) % 16 === 0 ? '#9a9ab0' : '#8f8fa6'); g.px(x + 1, y + 1, '#a8a8c0'); } g.speckle(6, ['#6a6a80']); } });
  def('carpet', { ch: 'p', paint: function (g) { g.fill('#a52a3a'); g.rect(1, 1, 14, 14, '#b83344'); g.rect(3, 3, 10, 10, '#a52a3a'); g.rect(0, 0, 16, 1, '#e8c15a'); g.rect(0, 15, 16, 1, '#e8c15a'); g.rect(0, 0, 1, 16, '#e8c15a'); g.rect(15, 0, 1, 16, '#e8c15a'); g.px(7, 7, '#e8c15a'); g.px(8, 8, '#e8c15a'); g.px(8, 7, '#d8a84a'); g.px(7, 8, '#d8a84a'); } });

  // ===== 室内・建物（ASCII用） =====
  function brickWall(g, c1, c2, mortar) { g.fill(c1); for (var y = 0; y < 16; y += 4) { g.hline(0, y, 16, mortar); for (var x = ((y / 4) % 2) * 4; x < 16; x += 8) { g.vline(x, y, 4, mortar); g.rect(x + 1, y + 1, 6, 2, c2); } } }
  def('wall', { ch: '#', solid: true, paint: function (g) { brickWall(g, '#7d7d8e', '#8e8ea0', '#5a5a6a'); g.hline(0, 0, 16, '#a6a6b6'); g.hline(0, 15, 16, '#3f3f4c'); } });
  def('wall_wood', { ch: 'W', solid: true, paint: function (g) { g.fill('#8a5a30'); for (var x = 0; x < 16; x += 4) { g.vline(x, 0, 16, '#5a3a1a'); g.vline(x + 2, 0, 16, '#a07040'); } g.hline(0, 0, 16, '#b98250'); g.hline(0, 15, 16, '#3a2210'); g.px(5, 6, '#5a3a1a'); g.px(13, 10, '#5a3a1a'); } });
  def('castle_wall', { ch: 'C', solid: true, paint: function (g) { brickWall(g, '#a8a8b8', '#bdbdcc', '#6e6e80'); g.hline(0, 15, 16, '#4a4a5a'); } });
  function roofTile(g, c, d, l) { g.fill(c); for (var y = 0; y < 16; y += 4) { g.hline(0, y + 3, 16, d); for (var x = ((y / 4) % 2) * 4; x < 16; x += 8) { g.vline(x, y, 3, d); g.px(x + 1, y, l); } } }
  def('roof_red', { ch: 'R', solid: true, paint: function (g) { roofTile(g, '#b8403f', '#7a2a2a', '#d86a60'); } });
  def('roof_blue', { ch: 'B', solid: true, paint: function (g) { roofTile(g, '#3f6fc9', '#2a4a90', '#7fa0e8'); } });
  def('roof_green', { ch: 'V', solid: true, paint: function (g) { roofTile(g, '#3f9a6a', '#246a48', '#7fc8a0'); } });
  def('door', { ch: 'D', paint: function (g) { brickWall(g, '#7d7d8e', '#8e8ea0', '#5a5a6a'); g.rect(4, 3, 8, 13, '#5a3a1a'); g.rect(5, 4, 6, 11, '#7a4e26'); g.vline(8, 4, 11, '#5a3a1a'); g.rect(4, 2, 8, 1, '#3a2a10'); g.px(10, 9, '#e8c15a'); g.rect(3, 14, 10, 2, '#9a9aa8'); } });
  def('window', { ch: 'o', solid: true, paint: function (g) { brickWall(g, '#7d7d8e', '#8e8ea0', '#5a5a6a'); g.rect(4, 4, 8, 7, '#3a2a10'); g.rect(5, 5, 6, 5, '#8fd0ff'); g.rect(5, 5, 3, 2, '#d8f0ff'); g.vline(8, 5, 5, '#3a2a10'); g.hline(5, 7, 6, '#3a2a10'); g.rect(3, 11, 10, 1, '#5a3a1a'); } });
  def('counter', { ch: 'T', solid: true, paint: function (g) { g.fill('#a8743f'); g.rect(0, 0, 16, 5, '#c9a06a'); g.hline(0, 5, 16, '#7a5027'); g.rect(0, 6, 16, 10, '#8a5a30'); g.rect(2, 8, 5, 6, '#7a4e26'); g.rect(9, 8, 5, 6, '#7a4e26'); g.px(4, 11, '#e8c15a'); g.px(11, 11, '#e8c15a'); } });
  def('table', { ch: 't', solid: true, paint: function (g) { g.fill('#a8743f'); g.rect(2, 3, 12, 6, '#c9a06a'); g.hline(2, 9, 12, '#7a5027'); g.rect(3, 10, 2, 5, '#7a4e26'); g.rect(11, 10, 2, 5, '#7a4e26'); g.rect(6, 4, 3, 3, '#f0f0f8'); g.px(7, 5, '#d8402a'); } });
  def('bed', { ch: 'E', solid: true, paint: function (g) { g.fill('#a8743f'); g.rect(1, 0, 14, 16, '#7a4e26'); g.rect(2, 1, 12, 4, '#f0f0f8'); g.rect(3, 2, 10, 2, '#ffffff'); g.rect(2, 5, 12, 10, '#c94a4a'); g.rect(2, 5, 12, 1, '#a83a3a'); g.hline(3, 9, 10, '#a83a3a'); g.hline(3, 12, 10, '#a83a3a'); } });
  def('bookshelf', { ch: 'K', solid: true, paint: function (g) { g.fill('#6a4420'); g.rect(1, 1, 14, 14, '#8a5a30'); var cols = ['#c94a4a', '#3f6fc9', '#3f9a6a', '#e8c15a', '#8a5ad0', '#f0f0f8']; for (var r = 0; r < 3; r++) { g.hline(1, 1 + r * 5, 14, '#5a3a1a'); for (var i = 0; i < 6; i++) g.rect(2 + i * 2, 2 + r * 5, 2, 3, cols[(i + r) % 6]); } g.hline(1, 15, 14, '#3a2210'); } });
  def('pillar', { ch: 'I', solid: true, paint: function (g) { g.fill('#8a8aa0'); g.rect(4, 0, 8, 16, '#c0c0d0'); g.vline(4, 0, 16, '#e0e0ec'); g.vline(10, 0, 16, '#8a8a9a'); g.rect(3, 0, 10, 2, '#d0d0e0'); g.rect(3, 14, 10, 2, '#a0a0b0'); } });
  def('fountain', { ch: 'Q', solid: true, anim: true, paint: function (g, v, f) { g.fill('#9a9aa8'); g.disc(8, 8, 7, '#b0b0c0'); g.disc(8, 8, 5, '#3f8ad8'); g.disc(8, 8, 2, '#9fd4ff'); g.px(8 - f, 6, '#d8f0ff'); g.px(9 + f, 9, '#d8f0ff'); g.px(6, 10 + f, '#d8f0ff'); g.rect(7, 2 + f, 2, 3, '#d8f0ff'); } });
  def('torch', { ch: 'i', solid: true, anim: true, paint: function (g, v, f) { g.fill('#3d3d4a'); g.speckle(8, ['#2e2e3a', '#4a4a58']); g.rect(7, 8, 2, 7, '#5a3a1a'); g.rect(6, 7, 4, 2, '#8a5a2a'); g.disc(8, 5 - f, 2, '#ff8a2a'); g.disc(8, 4 - f, 1, '#ffd24a'); g.px(8, 2 - f, '#ffe08a'); } });
  def('crystal', { ch: 'X', solid: true, anim: true, paint: function (g, v, f) { g.fill('#8a8aa0'); g.rect(4, 12, 8, 3, '#6a6a80'); g.rect(6, 1, 4, 11, '#5ab0ff'); g.rect(5, 4, 1, 7, '#2f76c4'); g.rect(10, 4, 1, 7, '#2f76c4'); g.rect(7, 0, 2, 2, '#ffffff'); g.rect(7, 3 + f, 1, 4, '#d8f0ff'); } });
  def('sign', { ch: 'S', solid: true, paint: function (g) { grassBase(g, 0); g.rect(2, 3, 12, 7, '#8a5a30'); g.rect(3, 4, 10, 5, '#c9a06a'); g.hline(4, 6, 8, '#5a3a1a'); g.hline(4, 8, 5, '#5a3a1a'); g.rect(7, 10, 2, 5, '#5a3a1a'); } });

  // ===== ダンジョン =====
  // 隠しボスの印（床に刻まれた魔法陣）
  def('boss_mark', { anim: true, paint: function (g, v, f) { g.fill('#3a3a48'); g.speckle(10, ['#33333f', '#44445a']); var c = f ? '#c94a6a' : '#8a2a4a'; g.disc(8, 8, 6, c); g.disc(8, 8, 5, '#3a3a48'); g.disc(8, 8, 3, c); g.disc(8, 8, 2, '#3a3a48'); g.px(8, 2, c); g.px(8, 14, c); g.px(2, 8, c); g.px(14, 8, c); g.px(4, 4, c); g.px(12, 12, c); g.px(12, 4, c); g.px(4, 12, c); } });
  // 学習の石碑（通行可・光る紋様）
  def('learn_rune', { anim: true, paint: function (g, v, f) { g.fill('#3a3a48'); g.speckle(8, ['#33333f', '#44445a']); var c = f ? '#9fe0ff' : '#5ab0ff'; g.rect(5, 3, 6, 10, '#6a6a7a'); g.rect(6, 2, 4, 1, '#8a8a9a'); g.rect(6, 4, 4, 8, '#2a2a3a'); g.px(7, 5, c); g.px(8, 6, c); g.px(7, 7, c); g.px(8, 8, c); g.px(7, 9, c); g.px(8, 10, c); g.hline(4, 13, 8, '#8a8a9a'); g.px(3, 12, c); g.px(12, 12, c); } });
  def('cave_floor', { ch: 'g', variants: 3, paint: function (g, v) { g.fill('#4a4a58'); g.speckle(20, ['#3f3f4c', '#565664', '#434350']); if (v === 1) { g.hline(3, 6, 6, '#35353f'); g.px(9, 7, '#35353f'); } if (v === 2) { g.px(4, 4, '#6a6a7a'); g.px(5, 4, '#7a7a8a'); g.px(11, 11, '#6a6a7a'); } } });
  def('cave_wall', { ch: 'G', solid: true, variants: 2, paint: function (g, v) { g.fill('#2a2a36'); for (var i = 0; i < 7; i++) { var x = Math.floor(g.rnd() * 14), y = 4 + Math.floor(g.rnd() * 10); g.disc(x, y, 2, '#3a3a48'); g.px(x - 1, y - 1, '#4a4a5a'); } g.rect(0, 0, 16, 3, '#5a5a6c'); g.hline(0, 0, 16, '#707084'); g.hline(0, 3, 16, '#1c1c26'); g.speckle(8, ['#1c1c26', '#3a3a48'], 0, 4, 15, 15); } });
  def('moss', { ch: 'M', variants: 2, paint: function (g, v) { grassBase(g, 3); g.disc(5, 5, 3, '#2f6b2a'); g.disc(11, 11, 2, '#2f6b2a'); g.speckle(6, ['#4fa048', '#1f4a22']); } });
  def('stalactite', { ch: 'Y', solid: true, paint: function (g) { g.fill('#4a4a58'); g.speckle(10, ['#3f3f4c', '#565664']); g.rect(6, 0, 4, 2, '#8a8a9a'); g.rect(7, 2, 2, 5, '#7a7a8a'); g.px(7, 7, '#6a6a7a'); g.rect(10, 9, 2, 6, '#8a8a9a'); g.px(11, 7, '#7a7a8a'); g.rect(3, 11, 2, 4, '#8a8a9a'); g.px(3, 10, '#7a7a8a'); } });
  def('puddle', { ch: 'u', anim: true, paint: function (g, v, f) { g.fill('#4a4a58'); g.speckle(8, ['#3f3f4c', '#565664']); g.disc(8, 8, 5, '#2a4a6a'); g.disc(7, 7, 3, '#3a6a9a'); g.px(6 + f, 6, '#8fc8ff'); g.px(10 - f, 10, '#6fa8e0'); } });
  def('ore', { ch: 'k', solid: true, anim: true, paint: function (g, v, f) { g.fill('#2a2a36'); g.rect(0, 0, 16, 3, '#5a5a6c'); g.disc(8, 10, 4, '#3a3a48'); g.rect(6, 8, 2, 3, f ? '#9fe0ff' : '#5ab0ff'); g.rect(9, 9, 2, 2, f ? '#ffd24a' : '#c9a24a'); g.px(7, 7, '#ffffff'); g.px(10, 8, f ? '#ffffff' : '#ffd24a'); } });
  def('root', { ch: 'J', solid: true, paint: function (g) { grassBase(g, 3); g.rect(0, 6, 16, 3, '#5a3a1a'); g.rect(3, 4, 5, 2, '#6a4a2a'); g.rect(9, 9, 5, 3, '#6a4a2a'); g.hline(0, 6, 16, '#7a5a3a'); g.px(12, 5, '#3a2210'); } });
  def('log', { ch: 'N', solid: true, paint: function (g) { grassBase(g, 3); g.rect(1, 6, 14, 5, '#7a4e26'); g.rect(1, 6, 14, 1, '#9a6a3a'); g.rect(1, 10, 14, 1, '#4a2e1a'); g.disc(2, 8, 2, '#c9a06a'); g.disc(2, 8, 1, '#8a5a30'); g.px(6, 8, '#5a3a1a'); g.px(10, 8, '#5a3a1a'); } });
  def('bush', { ch: 'Z', solid: true, paint: function (g) { grassBase(g, 0); g.disc(8, 10, 5, '#2f7a3a'); g.disc(6, 8, 4, '#3f9a4a'); g.disc(10, 8, 3, '#3f9a4a'); g.px(5, 7, '#7fd37a'); g.px(10, 6, '#7fd37a'); g.px(8, 12, '#1f4a22'); } });
  def('stairs_down', { ch: '>', paint: function (g) { g.fill('#4a4a58'); for (var i = 0; i < 4; i++) { g.rect(2 + i * 2, 2 + i * 3, 12 - i * 4, 3, shade('#9a9aa8', 1 - i * 0.2)); g.hline(2 + i * 2, 2 + i * 3, 12 - i * 4, shade('#c0c0d0', 1 - i * 0.2)); } g.rect(6, 11, 4, 4, '#101018'); } });
  def('stairs_up', { ch: '<', paint: function (g) { g.fill('#4a4a58'); for (var i = 0; i < 4; i++) { g.rect(2 + i, 12 - i * 3, 12 - i * 2, 3, shade('#9a9aa8', 0.7 + i * 0.1)); g.hline(2 + i, 12 - i * 3, 12 - i * 2, shade('#c0c0d0', 0.7 + i * 0.1)); } g.rect(6, 0, 4, 3, '#d8d8e8'); } });
  def('chest', { ch: '$', solid: true, paint: function (g) { g.fill('#4a4a58'); g.rect(2, 4, 12, 10, '#8a5a30'); g.rect(2, 4, 12, 4, '#a07040'); g.hline(2, 8, 12, '#5a3a1a'); g.rect(2, 4, 12, 1, '#c9a06a'); g.rect(2, 13, 12, 1, '#3a2210'); g.vline(2, 4, 10, '#c9a24a'); g.vline(13, 4, 10, '#c9a24a'); g.rect(7, 7, 2, 3, '#e8c15a'); g.px(7, 8, '#8a6a2a'); } });
  def('chest_open', { ch: '%', solid: true, paint: function (g) { g.fill('#4a4a58'); g.rect(2, 1, 12, 4, '#a07040'); g.rect(3, 2, 10, 2, '#5a3a1a'); g.rect(2, 7, 12, 7, '#8a5a30'); g.rect(3, 8, 10, 5, '#2a1a0a'); g.vline(2, 7, 7, '#c9a24a'); g.vline(13, 7, 7, '#c9a24a'); g.rect(2, 13, 12, 1, '#3a2210'); } });
  def('door_locked', { ch: 'L', solid: true, paint: function (g) { g.fill('#2a2a36'); g.rect(3, 1, 10, 14, '#5a3a1a'); g.rect(4, 2, 8, 12, '#7a4e26'); g.vline(8, 2, 12, '#5a3a1a'); g.rect(6, 7, 4, 3, '#e8c15a'); g.px(7, 8, '#3a2a10'); g.px(8, 8, '#3a2a10'); g.rect(7, 9, 2, 2, '#c9a24a'); g.rect(2, 0, 12, 1, '#8a8a9a'); } });
  def('gate', { ch: 'U', solid: true, anim: true, paint: function (g, v, f) { g.fill('#2a2a36'); g.rect(2, 0, 12, 16, '#5a3a8a'); g.rect(3, 1, 10, 14, '#2a1a4a'); for (var i = 0; i < 4; i++) { var y = (i * 4 + f * 2) % 14 + 1; g.hline(4, y, 8, '#9a6ad0'); } g.rect(6, 6, 4, 4, '#c0a0ff'); g.px(7, 7, '#ffffff'); g.px(8, 8, '#ffffff'); } });
  def('warp', { ch: '@', anim: true, paint: function (g, v, f) { g.fill('#4a4a58'); g.disc(8, 8, 6, '#5a3a8a'); g.disc(8, 8, 4 - f, '#9a6ad0'); g.disc(8, 8, 2, '#e0d0ff'); g.px(3 + f * 2, 4, '#c0a0ff'); g.px(12 - f, 11, '#c0a0ff'); } });
  def('hole', { ch: 'O', paint: function (g) { g.fill('#4a4a58'); g.speckle(8, ['#3f3f4c']); g.disc(8, 8, 6, '#1a1a24'); g.disc(8, 9, 5, '#0a0a10'); g.px(4, 5, '#5a5a6a'); g.px(12, 5, '#5a5a6a'); } });
  def('lever', { ch: 'v', solid: true, paint: function (g) { g.fill('#4a4a58'); g.rect(4, 10, 8, 4, '#6a6a7a'); g.rect(4, 10, 8, 1, '#8a8a9a'); g.rect(7, 4, 2, 7, '#c0c0d0'); g.disc(8, 3, 2, '#c94a4a'); } });

  // ===== 町の小物 =====
  def('fence', { ch: 'x', solid: true, paint: function (g) { grassBase(g, 0); g.rect(0, 6, 16, 2, '#a07040'); g.rect(0, 11, 16, 2, '#a07040'); g.rect(2, 3, 2, 12, '#8a5a30'); g.rect(12, 3, 2, 12, '#8a5a30'); g.px(2, 3, '#c9a06a'); g.px(12, 3, '#c9a06a'); g.hline(0, 6, 16, '#c9a06a'); } });
  def('lamp', { ch: 'y', solid: true, anim: true, paint: function (g, v, f) { g.fill('#8e8e9c'); g.speckle(8, ['#a1a1ae', '#6f6f7c']); g.rect(7, 5, 2, 10, '#3a3a44'); g.rect(5, 13, 6, 2, '#2a2a34'); g.rect(5, 1, 6, 5, '#3a3a44'); g.rect(6, 2, 4, 3, f ? '#ffe08a' : '#ffd24a'); g.rect(6, 0, 4, 1, '#2a2a34'); } });
  def('well', { ch: 'j', solid: true, paint: function (g) { grassBase(g, 0); g.disc(8, 10, 6, '#7a7a8a'); g.disc(8, 10, 4, '#2a4a6a'); g.disc(8, 10, 2, '#3f8ad8'); g.rect(2, 2, 2, 9, '#8a5a30'); g.rect(12, 2, 2, 9, '#8a5a30'); g.rect(1, 1, 14, 2, '#a83a3a'); g.rect(7, 3, 2, 4, '#5a3a1a'); } });
  def('barrel', { ch: 'q', solid: true, paint: function (g) { g.fill('#8e8e9c'); g.speckle(6, ['#a1a1ae']); g.rect(4, 2, 8, 13, '#8a5a30'); g.rect(5, 2, 6, 13, '#a07040'); g.hline(4, 4, 8, '#3a3a44'); g.hline(4, 11, 8, '#3a3a44'); g.rect(4, 1, 8, 1, '#5a3a1a'); g.vline(7, 3, 11, '#c9a06a'); } });
  def('crate', { ch: 'z', solid: true, paint: function (g) { g.fill('#8e8e9c'); g.speckle(6, ['#a1a1ae']); g.rect(2, 3, 12, 12, '#a07040'); g.rect(2, 3, 12, 1, '#c9a06a'); g.rect(2, 3, 1, 12, '#c9a06a'); g.rect(13, 3, 1, 12, '#5a3a1a'); g.rect(2, 14, 12, 1, '#5a3a1a'); g.hline(3, 8, 10, '#5a3a1a'); g.vline(8, 4, 10, '#5a3a1a'); } });
  def('bench', { ch: 'e', solid: true, paint: function (g) { g.fill('#8e8e9c'); g.speckle(6, ['#a1a1ae']); g.rect(1, 7, 14, 3, '#a07040'); g.rect(1, 7, 14, 1, '#c9a06a'); g.rect(2, 10, 2, 4, '#5a3a1a'); g.rect(12, 10, 2, 4, '#5a3a1a'); g.rect(1, 3, 14, 3, '#a07040'); g.hline(1, 3, 14, '#c9a06a'); } });
  def('flowerbed', { ch: 'a', solid: true, paint: function (g) { grassBase(g, 0); g.rect(1, 1, 14, 14, '#7a4e26'); g.rect(2, 2, 12, 12, '#6a4a2a'); var cols = ['#ff5a5a', '#ffd24a', '#ff8ab0', '#ffffff', '#9fd0ff']; for (var i = 0; i < 8; i++) { var x = 3 + Math.floor(g.rnd() * 10), y = 3 + Math.floor(g.rnd() * 10); g.px(x, y, cols[i % 5]); g.px(x + 1, y, cols[i % 5]); g.px(x, y + 1, '#3f9a3f'); } } });
  def('stall', { ch: 'A', solid: true, paint: function (g) { g.fill('#8e8e9c'); g.speckle(6, ['#a1a1ae']); for (var x = 0; x < 16; x += 4) g.rect(x, 0, 2, 4, '#c94a4a'); for (var x2 = 2; x2 < 16; x2 += 4) g.rect(x2, 0, 2, 4, '#f0f0f8'); g.hline(0, 4, 16, '#8a2a2a'); g.rect(1, 6, 14, 9, '#a07040'); g.rect(2, 7, 4, 3, '#ff5a3a'); g.rect(7, 7, 4, 3, '#ffd24a'); g.rect(11, 8, 3, 2, '#7fd37a'); g.rect(1, 12, 14, 1, '#5a3a1a'); } });
  def('crops', { ch: 'H', paint: function (g) { g.fill('#7a4e26'); for (var y = 0; y < 16; y += 4) { g.hline(0, y, 16, '#5a3a1a'); g.rect(2, y + 1, 2, 2, '#4fa048'); g.rect(6, y + 1, 2, 2, '#4fa048'); g.rect(10, y + 1, 2, 2, '#3f8a36'); g.rect(14, y + 1, 2, 2, '#4fa048'); g.px(3, y, '#7fd37a'); g.px(11, y, '#7fd37a'); } } });
  def('path_stone', { ch: 'P', variants: 2, paint: function (g, v) { grassBase(g, 0); g.disc(4, 4, 3, '#9a9a8a'); g.disc(11, 8, 3, '#b8b8a8'); g.disc(5, 12, 2, '#a8a898'); g.px(3, 3, '#c8c8b8'); g.px(10, 7, '#d0d0c0'); } });
  def('tree_small', { ch: '6', solid: true, paint: function (g) { grassBase(g, 0); treeOn(g, 0, 8, 8, 4, '#3f8a36', '#5fb34a', '#2a5a28', '#6a4a2a'); } });

  // ===== ワールドマップのアイコン =====
  def('ash', { ch: '8', variants: 3, paint: function (g, v) { g.fill(['#6e6a66', '#716d68', '#6a6662'][v % 3]); g.speckle(14, ['#7e7a74', '#5e5a56', '#8a857e']); g.px(3 + v, 5, '#4e4a46'); g.px(11, 9 + v, '#4e4a46'); } });
  def('slag', { ch: '9', solid: true, variants: 2, paint: function (g, v) { g.fill('#6e6a66'); g.speckle(8, ['#7e7a74', '#5e5a56']); g.disc(8, 9, 6, '#3a3634'); g.disc(7, 8, 4, '#4a4642'); g.px(6, 6, '#5a5652'); g.hline(3, 14, 10, '#2a2826'); if (v) g.px(12, 4, '#8a2a1a'); } });
  def('village', { ch: '1', paint: function (g) { grassBase(g, 0); g.rect(3, 8, 10, 7, '#c9b89a'); g.rect(3, 8, 10, 1, '#e0d0b0'); for (var y = 2; y < 8; y++) g.hline(8 - (y - 2) - 1, y, (y - 2) * 2 + 3, '#b8403f'); g.rect(7, 11, 3, 4, '#5a3a1a'); g.rect(4, 10, 2, 2, '#8fd0ff'); g.rect(11, 10, 2, 2, '#8fd0ff'); } });
  def('castle_icon', { ch: '2', paint: function (g) { grassBase(g, 0); g.rect(2, 5, 12, 10, '#c0c0d0'); g.rect(2, 5, 12, 1, '#e0e0ec'); for (var x = 2; x < 14; x += 3) g.rect(x, 2, 2, 3, '#c0c0d0'); g.rect(6, 9, 4, 6, '#3a3a4a'); g.rect(4, 7, 2, 2, '#5a5a6a'); g.rect(10, 7, 2, 2, '#5a5a6a'); g.rect(7, 0, 1, 3, '#8a5a30'); g.rect(8, 0, 3, 2, '#c94a4a'); } });
  def('cave_icon', { ch: '3', paint: function (g) { grassBase(g, 0); g.disc(8, 10, 7, '#6a6a76'); g.disc(8, 9, 6, '#8a8a96'); g.disc(8, 11, 4, '#1a1a24'); g.disc(8, 12, 3, '#0a0a10'); g.hline(1, 15, 14, '#3f8a36'); } });
  def('tower_icon', { ch: '4', paint: function (g) { grassBase(g, 0); g.rect(5, 2, 6, 13, '#b0b0c0'); g.rect(5, 2, 6, 1, '#d0d0e0'); g.rect(4, 1, 8, 1, '#8a8a9a'); for (var x = 4; x < 12; x += 2) g.px(x, 0, '#8a8a9a'); g.rect(7, 10, 2, 5, '#3a3a4a'); g.rect(7, 5, 2, 2, '#8fd0ff'); } });
  def('ship', { ch: '5', paint: function (g) { g.fill('#2f76c4'); g.speckle(8, ['#3f8ad8']); g.rect(2, 10, 12, 4, '#8a5a30'); g.rect(2, 10, 12, 1, '#c9a06a'); g.rect(1, 13, 14, 1, '#5a3a1a'); g.rect(7, 2, 1, 8, '#5a3a1a'); g.rect(8, 3, 5, 6, '#f0f0f8'); g.rect(8, 3, 5, 1, '#d0d0d8'); g.px(12, 1, '#c94a4a'); g.px(13, 1, '#c94a4a'); } });

  /* ---------- 生成 ---------- */
  Tiles.get = function (name, frame, variant) {
    var d = Tiles.defs[name] || Tiles.defs.grass;
    var f = d.anim ? (frame ? 1 : 0) : 0; var v = d.variants ? ((variant || 0) % d.variants) : 0;
    var key = d.name + '#' + f + '#' + v;
    if (Tiles.cache[key]) return Tiles.cache[key];
    var ts = root.Engine.TS; var c = document.createElement('canvas'); c.width = ts; c.height = ts;
    var ctx = c.getContext('2d');
    var seed = 0; for (var i = 0; i < d.name.length; i++) seed = (seed * 31 + d.name.charCodeAt(i)) | 0;
    var g = painter(ctx, seed + v * 7919 + 17);
    d.paint(g, v, f);
    Tiles.cache[key] = c; return c;
  };
  // 隣接境界の縁取り。kind: 'shore'(水面に陸が接する側に白波) / 'shadow'(高い物の下側の影) / 'grassedge'(草と土・舗装の境界)
  // mask: 1=上 2=右 4=下 8=左
  Tiles.edge = function (kind, mask) {
    var key = kind + '#' + mask; if (Tiles.edgeCache[key]) return Tiles.edgeCache[key];
    var ts = root.Engine.TS; var c = document.createElement('canvas'); c.width = ts; c.height = ts; var ctx = c.getContext('2d'); var g = painter(ctx, mask * 131 + kind.length);
    if (kind === 'shore') {
      var foam = 'rgba(220,240,255,0.85)', foam2 = 'rgba(160,210,255,0.6)';
      if (mask & 1) { g.hline(0, 0, 16, foam); g.hline(1, 1, 5, foam2); g.hline(9, 1, 4, foam2); }
      if (mask & 4) { g.hline(0, 15, 16, foam); g.hline(2, 14, 4, foam2); g.hline(10, 14, 5, foam2); }
      if (mask & 8) { g.vline(0, 0, 16, foam); g.vline(1, 2, 4, foam2); g.vline(1, 9, 5, foam2); }
      if (mask & 2) { g.vline(15, 0, 16, foam); g.vline(14, 1, 5, foam2); g.vline(14, 10, 4, foam2); }
    } else if (kind === 'shadow') {
      if (mask & 1) { g.rect(0, 0, 16, 3, 'rgba(0,0,0,0.22)'); g.hline(0, 3, 16, 'rgba(0,0,0,0.1)'); }
      if (mask & 8) { g.rect(0, 0, 3, 16, 'rgba(0,0,0,0.12)'); }
    } else if (kind === 'grassedge') {
      var gcol = 'rgba(74,154,63,0.9)';
      if (mask & 1) { for (var x = 0; x < 16; x++) if ((x % 3) !== 1) g.px(x, 0, gcol); for (var x2 = 0; x2 < 16; x2 += 4) g.px(x2, 1, gcol); }
      if (mask & 4) { for (var x3 = 0; x3 < 16; x3++) if ((x3 % 3) !== 2) g.px(x3, 15, gcol); for (var x4 = 2; x4 < 16; x4 += 4) g.px(x4, 14, gcol); }
      if (mask & 8) { for (var y = 0; y < 16; y++) if ((y % 3) !== 1) g.px(0, y, gcol); for (var y2 = 0; y2 < 16; y2 += 4) g.px(1, y2, gcol); }
      if (mask & 2) { for (var y3 = 0; y3 < 16; y3++) if ((y3 % 3) !== 2) g.px(15, y3, gcol); for (var y4 = 2; y4 < 16; y4 += 4) g.px(14, y4, gcol); }
    }
    Tiles.edgeCache[key] = c; return c;
  };
  Tiles.isSolid = function (name) { var d = Tiles.defs[name]; return !!(d && d.solid); };
  Tiles.has = function (name) { return !!Tiles.defs[name]; };
  Tiles.isWater = function (name) { return name === 'water' || name === 'shallow' || name === 'deep'; };
  Tiles.isTall = function (name) { return name === 'tree' || name === 'forest' || name === 'mountain' || name === 'cliff' || name === 'cave_wall' || name === 'wall' || name === 'wall_wood' || name === 'castle_wall'; };
  Tiles.isGrassy = function (name) { return name === 'grass' || name === 'grass2' || name === 'hill' || name === 'moss'; };
  Tiles.isPaved = function (name) { return name === 'road' || name === 'stone' || name === 'sand' || name === 'crops' || name === 'path_stone'; };
  Tiles.painter = painter; Tiles.shade = shade; Tiles.mix = mix;

  root.Tiles = Tiles;
})(typeof window !== 'undefined' ? window : globalThis);
