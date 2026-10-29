/* =========================================================
   Core / MonsterArt : 種族ごとのプロシージャル描画によるモンスタースプライト（オリジナル）
   enemies.js の art:{ family, size, c:{base,dark,light,eye,accent}, ...features } から
   シルエット・陰影・表情・部位（角・翼・尾・爪など）を描く。パレット差し替えだけに頼らない。
   ========================================================= */
(function (root) {
  'use strict';

  var MonsterArt = { cache: {} };

  function hex(c) { c = c.replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function rgb(a) { return 'rgb(' + a.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))); }).join(',') + ')'; }
  function shade(c, k) { return rgb(hex(c).map(function (v) { return v * k; })); }
  function lighten(c, k) { return rgb(hex(c).map(function (v) { return v + (255 - v) * k; })); }

  function painter(ctx, u, N) {
    var g = {
      px: function (x, y, c) { if (x < 0 || y < 0 || x >= N || y >= N) return; ctx.fillStyle = c; ctx.fillRect(Math.round(x) * u, Math.round(y) * u, u, u); },
      rect: function (x, y, w, h, c) { for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) g.px(x + xx, y + yy, c); },
      disc: function (cx, cy, r, c) { for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) g.px(cx + x, cy + y, c); },
      ellipse: function (cx, cy, rx, ry, c) { for (var y = -ry; y <= ry; y++) for (var x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.1) + (y * y) / (ry * ry + 0.1) <= 1.05) g.px(cx + x, cy + y, c); },
      line: function (x0, y0, x1, y1, c, w) { w = w || 1; var dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy)) || 1; for (var i = 0; i <= n; i++) { var x = x0 + dx * i / n, y = y0 + dy * i / n; for (var k = 0; k < w; k++) g.px(x + (dx === 0 ? k : 0), y + (dx !== 0 ? k : 0), c); } },
      tri: function (x0, y0, x1, y1, x2, y2, c) { var minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2); for (var y = minY; y <= maxY; y++) { var xs = []; [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]].forEach(function (e) { var a = e[0], b = e[1], c2 = e[2], d = e[3]; if ((y >= b && y <= d) || (y >= d && y <= b)) { if (d === b) { xs.push(a); xs.push(c2); } else xs.push(a + (c2 - a) * (y - b) / (d - b)); } }); if (xs.length < 2) continue; var l = Math.min.apply(null, xs), r = Math.max.apply(null, xs); for (var x = Math.round(l); x <= Math.round(r); x++) g.px(x, y, c); } },
      // 陰影つきの楕円（左上ハイライト・右下シャドウ）
      blob: function (cx, cy, rx, ry, base, dark, light) { g.ellipse(cx + 1, cy + 1, rx, ry, dark); g.ellipse(cx, cy, rx, ry, base); g.ellipse(cx - Math.round(rx * 0.35), cy - Math.round(ry * 0.35), Math.round(rx * 0.35), Math.round(ry * 0.3), light); },
      eyes: function (cx, cy, gap, eye, pupil, angry) { g.rect(cx - gap - 1, cy, 2, 2, eye); g.rect(cx + gap, cy, 2, 2, eye); g.px(cx - gap, cy, pupil); g.px(cx + gap + 1, cy, pupil); if (angry) { g.px(cx - gap - 1, cy - 1, pupil); g.px(cx + gap + 1, cy - 1, pupil); } },
      mouth: function (cx, cy, w, c, teeth) { g.rect(cx - Math.floor(w / 2), cy, w, 1, c); if (teeth) for (var i = 0; i < w; i += 2) g.px(cx - Math.floor(w / 2) + i, cy + 1, '#ffffff'); },
      shadow: function (cx, cy, rx) { g.ellipse(cx, cy, rx, Math.max(1, Math.round(rx / 3)), 'rgba(0,0,0,0.28)'); }
    };
    return g;
  }

  /* ---------- 種族別の描画 ---------- */
  var F = {};
  // スライム
  F.slime = function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.62; var r = N * 0.36; g.shadow(cx, N - 3, r);
    g.blob(cx, cy, r, r * 0.78, c.base, c.dark, c.light); if (o.drip) { g.rect(cx - r + 2, cy + r * 0.6, 2, 3, c.base); g.rect(cx + r - 3, cy + r * 0.5, 2, 4, c.base); }
    if (o.metal) { g.rect(cx - r * 0.5, cy - r * 0.5, 3, 1, '#ffffff'); g.rect(cx + r * 0.2, cy + 1, 4, 1, c.dark); }
    g.eyes(cx, cy - 2, 3, '#ffffff', c.eye, o.angry); g.mouth(cx, cy + 3, o.big ? 7 : 5, c.dark, o.teeth);
    if (o.crown) { g.rect(cx - 4, cy - r - 2, 8, 3, '#e8c15a'); g.px(cx - 4, cy - r - 4, '#e8c15a'); g.px(cx, cy - r - 5, '#e8c15a'); g.px(cx + 3, cy - r - 4, '#e8c15a'); g.px(cx, cy - r - 1, '#c94a4a'); }
    if (o.spikes) for (var i = -2; i <= 2; i++) g.tri(cx + i * 4 - 1, cy - r + 1, cx + i * 4 + 1, cy - r + 1, cx + i * 4, cy - r - 4, c.dark);
    if (o.core) { g.disc(cx, cy + 1, 2, c.accent); g.px(cx, cy, '#ffffff'); } };
  // 獣（四足）
  F.beast = function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.6; var bl = N * 0.34, bh = N * 0.2; g.shadow(cx, N - 3, bl);
    if (o.wings) { g.tri(cx - 2, cy - bh, cx - bl - 4, cy - bh - 9, cx - bl + 2, cy - bh + 1, c.dark); g.tri(cx + 2, cy - bh, cx + bl + 4, cy - bh - 9, cx + bl - 2, cy - bh + 1, c.dark); }
    g.line(cx + bl - 2, cy - 1, cx + bl + 5, cy - 7, c.dark, 2); // 尾
    g.blob(cx, cy, bl, bh, c.base, c.dark, c.light);
    for (var i = 0; i < 4; i++) { var lx = cx - bl + 3 + i * (bl * 2 - 6) / 3; g.rect(lx, cy + bh - 2, 2, 5, i % 2 ? c.base : c.dark); g.rect(lx, cy + bh + 3, 2, 1, c.dark); }
    if (o.stripes) for (var s = -2; s <= 2; s++) g.rect(cx + s * 4, cy - bh + 1, 1, bh, c.dark);
    var hx = cx - bl + 2, hy = cy - bh * 0.4; g.blob(hx, hy, bh + 1, bh, c.base, c.dark, c.light);
    g.tri(hx - 4, hy - bh + 1, hx - 1, hy - bh + 1, hx - 3, hy - bh - 4, c.dark); g.tri(hx + 1, hy - bh + 1, hx + 4, hy - bh + 1, hx + 3, hy - bh - 4, c.dark); // 耳
    if (o.horns) { g.line(hx - 3, hy - bh, hx - 6, hy - bh - 5, c.accent, 1); g.line(hx + 3, hy - bh, hx + 6, hy - bh - 5, c.accent, 1); }
    g.rect(hx - 3, hy - 1, 2, 2, '#ffffff'); g.px(hx - 2, hy - 1, c.eye); g.rect(hx + 1, hy - 1, 2, 2, '#ffffff'); g.px(hx + 2, hy - 1, c.eye);
    g.rect(hx - bh, hy + 1, 3, 2, c.dark); g.px(hx - bh, hy + 3, '#ffffff'); g.px(hx - bh + 2, hy + 3, '#ffffff'); if (o.tusks) { g.rect(hx - bh - 1, hy + 2, 1, 3, '#ffffff'); } };
  // 鳥
  F.bird = function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.55; g.shadow(cx, N - 3, N * 0.25);
    var ws = N * 0.45; g.tri(cx - 3, cy - 2, cx - ws, cy - 10, cx - ws + 2, cy + 2, c.dark); g.tri(cx + 3, cy - 2, cx + ws, cy - 10, cx + ws - 2, cy + 2, c.dark);
    g.tri(cx - 3, cy - 3, cx - ws + 2, cy - 9, cx - ws + 4, cy, c.base); g.tri(cx + 3, cy - 3, cx + ws - 2, cy - 9, cx + ws - 4, cy, c.base);
    g.blob(cx, cy + 1, N * 0.17, N * 0.2, c.base, c.dark, c.light);
    g.tri(cx - 2, cy + N * 0.2, cx + 2, cy + N * 0.2, cx, cy + N * 0.3, c.dark);
    var hy = cy - N * 0.22; g.blob(cx, hy, N * 0.11, N * 0.11, c.base, c.dark, c.light);
    g.tri(cx - 1, hy + 1, cx + 1, hy + 1, cx, hy + 5, c.accent); g.rect(cx - 3, hy - 1, 2, 2, '#ffffff'); g.px(cx - 2, hy - 1, c.eye); g.rect(cx + 1, hy - 1, 2, 2, '#ffffff'); g.px(cx + 2, hy - 1, c.eye);
    if (o.crest) { g.tri(cx - 2, hy - 3, cx + 2, hy - 3, cx, hy - 8, c.accent); }
    g.rect(cx - 4, cy + N * 0.2, 1, 3, c.accent); g.rect(cx + 3, cy + N * 0.2, 1, 3, c.accent); };
  // 昆虫
  F.insect = function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.6; g.shadow(cx, N - 3, N * 0.3);
    if (o.wings) { g.ellipse(cx - 6, cy - 6, 6, 3, 'rgba(220,240,255,0.7)'); g.ellipse(cx + 6, cy - 6, 6, 3, 'rgba(220,240,255,0.7)'); }
    for (var i = 0; i < 3; i++) { var ly = cy - 3 + i * 3; g.line(cx - 3, ly, cx - 9, ly + 3, c.dark); g.line(cx + 3, ly, cx + 9, ly + 3, c.dark); }
    g.blob(cx, cy + 3, N * 0.2, N * 0.16, c.base, c.dark, c.light); if (o.shell) { g.line(cx, cy - 2, cx, cy + 8, c.dark); g.ellipse(cx, cy + 3, N * 0.2, N * 0.16, 'rgba(255,255,255,0)'); }
    if (o.striped) for (var s = -1; s <= 1; s++) g.rect(cx - 5, cy + 2 + s * 3, 10, 1, c.accent);
    g.blob(cx, cy - 5, N * 0.14, N * 0.11, c.base, c.dark, c.light);
    g.line(cx - 2, cy - 8, cx - 5, cy - 13, c.dark); g.line(cx + 2, cy - 8, cx + 5, cy - 13, c.dark);
    g.rect(cx - 4, cy - 6, 2, 2, c.eye); g.rect(cx + 2, cy - 6, 2, 2, c.eye); if (o.mandibles) { g.px(cx - 3, cy - 2, '#ffffff'); g.px(cx + 2, cy - 2, '#ffffff'); }
    if (o.stinger) g.tri(cx - 1, cy + 8, cx + 1, cy + 8, cx, cy + 12, c.accent); };
  // 植物・キノコ
  F.plant = function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.6; g.shadow(cx, N - 3, N * 0.3);
    if (o.mushroom) { g.rect(cx - 4, cy, 8, N * 0.3, c.light); g.rect(cx + 2, cy, 2, N * 0.3, shade(c.light, 0.8)); g.blob(cx, cy - 2, N * 0.38, N * 0.22, c.base, c.dark, c.light); for (var i = 0; i < 4; i++) g.disc(cx - 8 + i * 5, cy - 4 + (i % 2) * 3, 1, c.accent); g.eyes(cx, cy + 3, 3, '#ffffff', c.eye, o.angry); g.mouth(cx, cy + 7, 5, c.dark, o.teeth); }
    else { g.rect(cx - 2, cy - 2, 4, N * 0.3, '#3f8a36'); for (var l = 0; l < 3; l++) { g.ellipse(cx - 8 + l * 8, cy + 6 + (l % 2) * 2, 5, 2, '#4fa048'); } for (var v = 0; v < 4; v++) g.line(cx, cy, cx + (v - 1.5) * 8, cy - 10 - (v % 2) * 3, '#2f7a3a', 1);
      g.blob(cx, cy - 6, N * 0.26, N * 0.2, c.base, c.dark, c.light); g.rect(cx - 6, cy - 4, 12, 3, c.dark); for (var t = 0; t < 6; t++) g.px(cx - 5 + t * 2, cy - 2, '#ffffff'); g.rect(cx - 4, cy - 10, 2, 2, c.eye); g.rect(cx + 2, cy - 10, 2, 2, c.eye); if (o.petals) for (var p = 0; p < 6; p++) g.disc(cx + Math.round(Math.cos(p) * N * 0.3), cy - 6 + Math.round(Math.sin(p) * N * 0.22), 2, c.accent); } };
  // 水棲
  F.aquatic = function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.58; g.shadow(cx, N - 3, N * 0.3);
    if (o.crab) { for (var i = 0; i < 3; i++) { g.line(cx - 6, cy + i * 2, cx - 11, cy + 4 + i * 2, c.dark); g.line(cx + 6, cy + i * 2, cx + 11, cy + 4 + i * 2, c.dark); } g.blob(cx, cy, N * 0.3, N * 0.18, c.base, c.dark, c.light); g.blob(cx - N * 0.36, cy - 4, 4, 3, c.base, c.dark, c.light); g.blob(cx + N * 0.36, cy - 4, 4, 3, c.base, c.dark, c.light); g.rect(cx - N * 0.42, cy - 5, 2, 1, c.dark); g.rect(cx + N * 0.36 + 2, cy - 5, 2, 1, c.dark); g.rect(cx - 3, cy - 4, 1, 3, c.eye); g.rect(cx + 2, cy - 4, 1, 3, c.eye); g.px(cx - 3, cy - 5, '#ffffff'); g.px(cx + 2, cy - 5, '#ffffff'); }
    else if (o.octopus) { g.blob(cx, cy - 3, N * 0.26, N * 0.26, c.base, c.dark, c.light); for (var t = 0; t < 6; t++) { var tx = cx - 10 + t * 4; g.line(tx, cy + 3, tx + ((t % 2) ? 2 : -2), cy + 10, c.base, 2); g.px(tx + ((t % 2) ? 2 : -2), cy + 10, c.light); } g.eyes(cx, cy - 4, 3, '#ffffff', c.eye, o.angry); }
    else { g.tri(cx + 8, cy, cx + 13, cy - 6, cx + 13, cy + 6, c.dark); g.blob(cx, cy, N * 0.32, N * 0.17, c.base, c.dark, c.light); g.tri(cx - 2, cy - 4, cx + 4, cy - 4, cx + 1, cy - 9, c.accent); g.tri(cx - 1, cy + 3, cx + 3, cy + 3, cx + 1, cy + 7, c.accent); g.rect(cx - 8, cy - 2, 2, 2, '#ffffff'); g.px(cx - 7, cy - 2, c.eye); g.rect(cx - 10, cy + 1, 3, 1, c.dark); for (var s = 0; s < 4; s++) g.px(cx - 2 + s * 3, cy + 1, c.light); } };
  // 爬虫類（トカゲ・ヘビ・ドラゴン）
  F.reptile = function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.6; g.shadow(cx, N - 3, N * 0.3);
    if (o.snake) { var sz = N >= 40 ? 1.5 : 1; var pts = [[cx + 10, cy + 7], [cx + 4, cy + 3], [cx - 3, cy + 7], [cx - 9, cy + 2], [cx - 5, cy - 5], [cx + 3, cy - 2]]; for (var i = 0; i < pts.length - 1; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c.dark, Math.round(7 * sz)); for (var i2 = 0; i2 < pts.length - 1; i2++) g.line(pts[i2][0], pts[i2][1] - 1, pts[i2 + 1][0], pts[i2 + 1][1] - 1, c.base, Math.round(5 * sz)); for (var i3 = 0; i3 < pts.length - 1; i3++) g.line(pts[i3][0], pts[i3][1] - 2, pts[i3 + 1][0], pts[i3 + 1][1] - 2, c.light, 1); g.blob(cx + 7, cy - 5, Math.round(6 * sz), Math.round(4 * sz), c.base, c.dark, c.light); g.rect(cx + 8, cy - 6, 2, 2, c.eye); g.px(cx + 9, cy - 6, '#fff'); g.line(cx + 13, cy - 4, cx + 16, cy - 4, '#ff3a3a'); g.px(cx + 16, cy - 5, '#ff3a3a'); g.px(cx + 16, cy - 3, '#ff3a3a'); for (var d = 0; d < 5; d++) { g.px(pts[d][0], pts[d][1] - 1, c.accent); g.px(pts[d][0] + 1, pts[d][1], c.accent); } }
    else if (o.dragon) { var bl = N * 0.3; g.tri(cx - 4, cy - 4, cx - bl - 8, cy - 16, cx - bl - 2, cy + 2, c.accent); g.tri(cx + 4, cy - 4, cx + bl + 8, cy - 16, cx + bl + 2, cy + 2, c.accent); g.tri(cx - 5, cy - 3, cx - bl - 6, cy - 13, cx - bl, cy + 1, c.dark); g.tri(cx + 5, cy - 3, cx + bl + 6, cy - 13, cx + bl, cy + 1, c.dark);
      g.line(cx + bl - 2, cy + 2, cx + bl + 8, cy + 9, c.dark, 2); g.tri(cx + bl + 7, cy + 8, cx + bl + 11, cy + 7, cx + bl + 9, cy + 12, c.accent); g.blob(cx, cy + 1, bl, N * 0.2, c.base, c.dark, c.light); for (var s2 = -2; s2 <= 2; s2++) g.rect(cx + s2 * 4, cy - N * 0.2 - 1, 2, 2, c.accent);
      for (var l = 0; l < 2; l++) { var lx = cx - bl + 4 + l * (bl * 2 - 10); g.rect(lx, cy + N * 0.2 - 2, 4, 5, c.dark); g.px(lx - 1, cy + N * 0.2 + 3, '#ffffff'); g.px(lx + 4, cy + N * 0.2 + 3, '#ffffff'); }
      var hx = cx - bl + 1, hy = cy - N * 0.18; g.blob(hx, hy, N * 0.17, N * 0.13, c.base, c.dark, c.light); g.line(hx - 2, hy - N * 0.13, hx - 6, hy - N * 0.13 - 6, c.accent, 2); g.line(hx + 2, hy - N * 0.13, hx + 5, hy - N * 0.13 - 5, c.accent, 1); g.rect(hx - 4, hy - 2, 2, 2, '#ffffff'); g.px(hx - 3, hy - 2, c.eye); g.rect(hx - N * 0.17 - 2, hy + 1, 4, 3, c.dark); g.px(hx - N * 0.17 - 1, hy + 4, '#ffffff'); g.px(hx - N * 0.17 + 1, hy + 4, '#ffffff'); }
    else { var bl2 = N * 0.32; g.line(cx + bl2 - 2, cy, cx + bl2 + 8, cy - 4, c.dark, 2); g.blob(cx, cy, bl2, N * 0.14, c.base, c.dark, c.light); for (var s3 = -2; s3 <= 2; s3++) g.px(cx + s3 * 3, cy - N * 0.14, c.accent); for (var i2 = 0; i2 < 2; i2++) { g.line(cx - bl2 + 4 + i2 * (bl2 * 2 - 8), cy + 2, cx - bl2 + 1 + i2 * (bl2 * 2 - 2), cy + 7, c.dark, 2); } var hx2 = cx - bl2 + 1, hy2 = cy - 2; g.blob(hx2, hy2, N * 0.14, N * 0.1, c.base, c.dark, c.light); g.rect(hx2 - 3, hy2 - 2, 2, 2, '#ffffff'); g.px(hx2 - 2, hy2 - 2, c.eye); if (o.frill) g.tri(hx2 - 6, hy2 - 2, hx2 + 2, hy2 - 8, hx2 + 4, hy2 - 1, c.accent); } };
  // アンデッド
  F.undead = function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.55;
    if (o.ghost) { g.ellipse(cx, cy, N * 0.26, N * 0.3, c.base); g.ellipse(cx - 3, cy - 6, N * 0.12, N * 0.1, c.light); for (var t = 0; t < 4; t++) g.tri(cx - 10 + t * 6, cy + 8, cx - 4 + t * 6, cy + 8, cx - 7 + t * 6, cy + 14 + (t % 2) * 2, c.base); g.rect(cx - 5, cy - 3, 3, 4, c.eye); g.rect(cx + 2, cy - 3, 3, 4, c.eye); g.ellipse(cx, cy + 4, 2, 3, c.dark); g.line(cx - 12, cy - 2, cx - 7, cy + 2, c.base, 2); g.line(cx + 12, cy - 2, cx + 7, cy + 2, c.base, 2); if (o.crownish) { g.rect(cx - 4, cy - N * 0.3 - 2, 8, 2, c.accent); } }
    else if (o.zombie) { g.shadow(cx, N - 3, N * 0.25); g.rect(cx - 6, cy - 2, 12, 12, c.base); g.rect(cx - 6, cy - 2, 4, 12, c.dark); g.rect(cx - 9, cy, 3, 8, c.base); g.rect(cx + 6, cy - 3, 3, 10, c.light); g.rect(cx - 5, cy + 10, 4, 6, c.dark); g.rect(cx + 1, cy + 10, 4, 6, c.base); g.blob(cx, cy - 8, 6, 6, c.base, c.dark, c.light); g.rect(cx - 4, cy - 9, 2, 2, c.eye); g.rect(cx + 2, cy - 10, 2, 2, c.eye); g.rect(cx - 2, cy - 5, 5, 1, c.dark); g.px(cx + 3, cy - 12, c.dark); }
    else { g.shadow(cx, N - 3, N * 0.25); var b = c.base; g.rect(cx - 1, cy - 2, 2, 10, b); for (var r = 0; r < 4; r++) { g.rect(cx - 6, cy + r * 2, 12, 1, b); } g.rect(cx - 9, cy, 3, 1, b); g.rect(cx - 10, cy + 1, 2, 7, b); g.rect(cx + 6, cy, 3, 1, b); g.rect(cx + 8, cy + 1, 2, 7, b); g.rect(cx - 5, cy + 9, 3, 7, b); g.rect(cx + 2, cy + 9, 3, 7, b); g.rect(cx - 6, cy + 16, 4, 1, b); g.rect(cx + 2, cy + 16, 4, 1, b); g.blob(cx, cy - 8, 6, 6, b, c.dark, c.light); g.rect(cx - 4, cy - 9, 3, 3, c.eye); g.rect(cx + 1, cy - 9, 3, 3, c.eye); g.rect(cx - 3, cy - 4, 6, 2, c.dark); for (var tt = 0; tt < 3; tt++) g.px(cx - 2 + tt * 2, cy - 4, '#ffffff'); if (o.weapon) { g.rect(cx + 9, cy - 8, 1, 14, '#8a5a30'); g.tri(cx + 7, cy - 8, cx + 12, cy - 8, cx + 9, cy - 13, '#c0c0d0'); } } };
  // 悪魔
  F.demon = function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.52; g.shadow(cx, N - 3, N * 0.28);
    g.tri(cx - 4, cy - 2, cx - 16, cy - 14, cx - 12, cy + 4, c.dark); g.tri(cx + 4, cy - 2, cx + 16, cy - 14, cx + 12, cy + 4, c.dark); g.tri(cx - 5, cy - 1, cx - 14, cy - 11, cx - 11, cy + 2, c.accent); g.tri(cx + 5, cy - 1, cx + 14, cy - 11, cx + 11, cy + 2, c.accent);
    g.line(cx + 4, cy + 8, cx + 10, cy + 13, c.base, 2); g.tri(cx + 9, cy + 12, cx + 13, cy + 11, cx + 12, cy + 15, c.base);
    g.blob(cx, cy + 3, 7, 8, c.base, c.dark, c.light); g.rect(cx - 9, cy, 3, 8, c.base); g.rect(cx + 6, cy, 3, 8, c.base); g.rect(cx - 5, cy + 10, 4, 6, c.dark); g.rect(cx + 1, cy + 10, 4, 6, c.dark); g.px(cx - 10, cy + 8, '#ffffff'); g.px(cx + 8, cy + 8, '#ffffff');
    g.blob(cx, cy - 7, 6, 6, c.base, c.dark, c.light); g.line(cx - 4, cy - 11, cx - 7, cy - 17, c.accent, 2); g.line(cx + 4, cy - 11, cx + 7, cy - 17, c.accent, 2); g.rect(cx - 4, cy - 8, 2, 2, c.eye); g.rect(cx + 2, cy - 8, 2, 2, c.eye); g.px(cx - 4, cy - 9, c.eye); g.px(cx + 3, cy - 9, c.eye); g.rect(cx - 2, cy - 4, 5, 1, c.dark); g.px(cx - 2, cy - 3, '#ffffff'); g.px(cx + 2, cy - 3, '#ffffff');
    if (o.trident) { g.rect(cx + 10, cy - 12, 1, 24, '#5a3a1a'); g.rect(cx + 8, cy - 14, 5, 1, '#c0c0d0'); g.rect(cx + 8, cy - 16, 1, 3, '#c0c0d0'); g.rect(cx + 10, cy - 17, 1, 4, '#c0c0d0'); g.rect(cx + 12, cy - 16, 1, 3, '#c0c0d0'); } };
  // ゴーレム
  F.golem = function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.55; g.shadow(cx, N - 2, N * 0.34);
    g.rect(cx - 9, cy - 4, 18, 14, c.base); g.rect(cx - 9, cy - 4, 18, 2, c.light); g.rect(cx - 9, cy + 8, 18, 2, c.dark); g.rect(cx + 7, cy - 4, 2, 14, c.dark);
    g.rect(cx - 15, cy - 2, 6, 12, c.base); g.rect(cx - 15, cy - 2, 6, 2, c.light); g.rect(cx - 15, cy + 8, 6, 3, c.dark); g.rect(cx + 9, cy - 2, 6, 12, c.base); g.rect(cx + 9, cy - 2, 6, 2, c.light); g.rect(cx + 9, cy + 8, 6, 3, c.dark);
    g.rect(cx - 8, cy + 10, 6, 6, c.dark); g.rect(cx + 2, cy + 10, 6, 6, c.dark); g.rect(cx - 8, cy + 10, 6, 1, c.base); g.rect(cx + 2, cy + 10, 6, 1, c.base);
    g.rect(cx - 5, cy - 11, 10, 8, c.base); g.rect(cx - 5, cy - 11, 10, 1, c.light); g.rect(cx - 3, cy - 8, 2, 2, c.eye); g.rect(cx + 1, cy - 8, 2, 2, c.eye); g.rect(cx - 2, cy - 5, 4, 1, c.dark);
    for (var i = 0; i < 5; i++) g.px(cx - 7 + i * 3, cy + (i % 2) * 3, c.dark); if (o.rune) { g.rect(cx - 2, cy - 1, 4, 4, c.accent); g.px(cx - 1, cy, '#ffffff'); } if (o.gem) { g.disc(cx, cy + 2, 2, c.accent); } };
  // 精霊
  F.spirit = function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.5;
    for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3 + (o.phase || 0); g.disc(cx + Math.round(Math.cos(a) * N * 0.3), cy + Math.round(Math.sin(a) * N * 0.3), 2, c.accent); }
    g.ellipse(cx, cy, N * 0.2, N * 0.24, c.dark); g.ellipse(cx, cy - 1, N * 0.15, N * 0.19, c.base); g.ellipse(cx - 1, cy - 3, N * 0.07, N * 0.08, c.light); g.px(cx, cy - 2, '#ffffff');
    g.tri(cx - 5, cy - 4, cx - 2, cy - 4, cx - 4, cy - N * 0.24 - 4, c.base); g.tri(cx + 2, cy - 4, cx + 5, cy - 4, cx + 4, cy - N * 0.24 - 4, c.base); g.tri(cx - 1, cy - 6, cx + 1, cy - 6, cx, cy - N * 0.24 - 7, c.light);
    g.rect(cx - 4, cy, 2, 2, c.eye); g.rect(cx + 2, cy, 2, 2, c.eye); };
  // 魔法生物（目玉・ミミック）
  F.magical = function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.55;
    if (o.mimic) { g.shadow(cx, N - 3, N * 0.3); g.rect(cx - 10, cy - 2, 20, 12, '#8a5a30'); g.rect(cx - 10, cy - 2, 20, 1, '#c9a06a'); g.rect(cx - 10, cy - 10, 20, 8, '#a07040'); g.rect(cx - 10, cy - 10, 20, 1, '#c9a06a'); g.rect(cx - 10, cy - 2, 20, 3, '#2a1a0a'); for (var t = 0; t < 9; t++) { g.px(cx - 9 + t * 2, cy - 2, '#ffffff'); g.px(cx - 8 + t * 2, cy, '#ffffff'); } g.rect(cx - 2, cy + 2, 4, 6, '#c94a4a'); g.rect(cx - 7, cy - 7, 3, 3, c.eye); g.rect(cx + 4, cy - 7, 3, 3, c.eye); g.rect(cx - 9, cy - 2, 2, 8, '#e8c15a'); g.rect(cx + 7, cy - 2, 2, 8, '#e8c15a'); }
    else { g.ellipse(cx - 10, cy - 2, 6, 3, c.dark); g.ellipse(cx + 10, cy - 2, 6, 3, c.dark); g.blob(cx, cy, N * 0.24, N * 0.24, c.base, c.dark, c.light); g.disc(cx, cy, N * 0.14, '#ffffff'); g.disc(cx + 1, cy, N * 0.08, c.accent); g.disc(cx + 1, cy, 2, c.eye); g.px(cx - 1, cy - 2, '#ffffff'); for (var k = 0; k < 4; k++) g.line(cx - 6 + k * 4, cy + N * 0.22, cx - 8 + k * 5, cy + N * 0.22 + 6, c.base, 1); } };
  // 機械
  F.machine = function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.55; g.shadow(cx, N - 2, N * 0.3);
    g.rect(cx - 10, cy - 6, 20, 14, c.base); g.rect(cx - 10, cy - 6, 20, 2, c.light); g.rect(cx - 10, cy + 6, 20, 2, c.dark); g.rect(cx + 8, cy - 6, 2, 14, c.dark);
    g.disc(cx - 6, cy + 1, 3, c.dark); g.disc(cx - 6, cy + 1, 1, c.light); g.rect(cx + 2, cy - 3, 6, 6, c.dark); g.disc(cx + 5, cy, 2, c.accent); g.px(cx + 4, cy - 1, '#ffffff');
    g.rect(cx - 13, cy - 2, 3, 8, c.dark); g.rect(cx + 10, cy - 2, 3, 8, c.dark); g.rect(cx - 7, cy + 8, 5, 6, c.dark); g.rect(cx + 2, cy + 8, 5, 6, c.dark); g.rect(cx - 8, cy + 14, 7, 2, c.base); g.rect(cx + 1, cy + 14, 7, 2, c.base);
    g.rect(cx - 2, cy - 12, 4, 6, c.light); g.rect(cx - 1, cy - 14, 2, 2, c.accent); if (o.antenna) { g.rect(cx + 6, cy - 12, 1, 6, c.dark); g.px(cx + 6, cy - 13, c.accent); } };
  // 相場の魔物（ローソク足・牛・熊・グラフの霊）
  F.market = function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.55;
    if (o.candle) { g.shadow(cx, N - 3, N * 0.26); g.rect(cx - 1, cy - 16, 2, 6, c.dark); g.rect(cx - 7, cy - 10, 14, 20, c.base); g.rect(cx - 7, cy - 10, 14, 1, c.light); g.rect(cx + 5, cy - 10, 2, 20, c.dark); g.rect(cx - 1, cy + 10, 2, 5, c.dark); g.rect(cx - 5, cy - 6, 3, 3, c.eye); g.rect(cx + 2, cy - 6, 3, 3, c.eye); g.rect(cx - 4, cy, 8, 2, c.dark); for (var t = 0; t < 4; t++) g.px(cx - 3 + t * 2, cy, '#ffffff'); g.rect(cx - 11, cy - 2, 4, 2, c.base); g.rect(cx + 7, cy - 2, 4, 2, c.base); }
    else if (o.bull) { g.shadow(cx, N - 3, N * 0.32); g.blob(cx, cy + 2, N * 0.34, N * 0.22, c.base, c.dark, c.light); for (var l = 0; l < 4; l++) g.rect(cx - 11 + l * 7, cy + 8, 3, 6, l % 2 ? c.base : c.dark); var hx = cx - N * 0.3, hy = cy - 4; g.blob(hx, hy, 7, 6, c.base, c.dark, c.light); g.line(hx - 5, hy - 5, hx - 10, hy - 11, c.accent, 2); g.line(hx + 4, hy - 5, hx + 9, hy - 11, c.accent, 2); g.rect(hx - 3, hy - 2, 2, 2, c.eye); g.rect(hx + 1, hy - 2, 2, 2, c.eye); g.rect(hx - 6, hy + 2, 5, 3, c.dark); g.px(hx - 5, hy + 3, '#ffd24a'); g.px(hx - 3, hy + 3, '#ffd24a'); g.line(cx + 10, cy, cx + 15, cy - 8, '#4cc38a', 2); }
    else if (o.bear) { g.shadow(cx, N - 3, N * 0.3); g.blob(cx, cy + 2, N * 0.3, N * 0.26, c.base, c.dark, c.light); g.rect(cx - 12, cy - 2, 4, 10, c.base); g.rect(cx + 8, cy - 2, 4, 10, c.base); g.rect(cx - 8, cy + 12, 6, 5, c.dark); g.rect(cx + 2, cy + 12, 6, 5, c.dark); g.blob(cx, cy - 9, 7, 6, c.base, c.dark, c.light); g.disc(cx - 6, cy - 13, 2, c.base); g.disc(cx + 6, cy - 13, 2, c.base); g.rect(cx - 4, cy - 10, 2, 2, c.eye); g.rect(cx + 2, cy - 10, 2, 2, c.eye); g.rect(cx - 2, cy - 7, 4, 2, c.dark); g.line(cx + 10, cy - 6, cx + 15, cy + 2, '#e5484d', 2); }
    else { g.ellipse(cx, cy, N * 0.3, N * 0.3, c.dark); g.ellipse(cx, cy - 1, N * 0.26, N * 0.26, c.base); var pts = [[cx - 10, cy + 4], [cx - 6, cy - 2], [cx - 2, cy + 2], [cx + 2, cy - 6], [cx + 6, cy - 1], [cx + 10, cy - 8]]; for (var i = 0; i < pts.length - 1; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c.accent, 1); g.rect(cx - 6, cy - 4, 3, 3, c.eye); g.rect(cx + 3, cy - 4, 3, 3, c.eye); for (var w = 0; w < 4; w++) g.tri(cx - 10 + w * 6, cy + 10, cx - 4 + w * 6, cy + 10, cx - 7 + w * 6, cy + 15, c.base); } };

  /* ---------- 生成 ---------- */
  // size: 'small'(28) 'normal'(32) 'big'(40) 'boss'(48) の論理ピクセル。scale 倍で描画
  var SIZES = { small: 28, normal: 32, big: 40, boss: 48 };
  MonsterArt.image = function (art, scale, phase) {
    phase = phase || 0; var key = JSON.stringify(art) + '#' + scale + '#' + phase;
    if (MonsterArt.cache[key]) return MonsterArt.cache[key];
    var N = SIZES[art.size || 'normal'] || 32;
    var c = document.createElement('canvas'); c.width = N * scale; c.height = N * scale;
    var ctx = c.getContext('2d'); var g = painter(ctx, scale, N);
    var col = art.c || {}; var base = col.base || '#5ab0ff';
    var o = Object.assign({}, art, { c: { base: base, dark: col.dark || shade(base, 0.6), light: col.light || lighten(base, 0.4), eye: col.eye || '#1a1a2a', accent: col.accent || '#e8c15a' }, phase: phase });
    var fn = F[art.family] || F.slime;
    fn(g, N, o);
    MonsterArt.cache[key] = c; return c;
  };
  MonsterArt.families = Object.keys(F);
  MonsterArt.sizeOf = function (art) { return SIZES[(art && art.size) || 'normal'] || 32; };

  root.MonsterArt = MonsterArt;
})(typeof window !== 'undefined' ? window : globalThis);
