/* =========================================================
   Core / QuizMonArt：トレードクイズモンスター5体の見た目（その場で描くドット絵。仮の画像）
   ・既存の v6.5 のモンスター（js/core/monsterart65.js）と同じ「コードで描くドット絵」の方法で、96×96 の論理ピクセルに描く（背景は透明、全身が収まる余白つき）
   ・素材の画像（PNG）に差し替えるとき：QUIZ_ART_FILES[ID] にパスを書く（例：'assets/quiz_monsters/quiz_monster_001.png'）。読み込めたら画像を使い、
     読み込めない・指定がないときは、このコードの絵を使う（戦闘・マップのシンボルの両方）。素材の仕様は docs/quiz-monsters-5.md
   ・phase（0〜3）で待機の動き（呼吸・揺れ）
   ========================================================= */
(function (root) {
  'use strict';
  var ART = { cache: {}, imgs: {}, N: 96 };
  root.QUIZ_ART_FILES = root.QUIZ_ART_FILES || {};   // 素材の画像（なければコードの絵）

  function painter(ctx, u, N) {
    var g = {
      px: function (x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= N || y >= N) return; ctx.fillStyle = c; ctx.fillRect(x * u, y * u, u, u); },
      rect: function (x, y, w, h, c) { x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); if (w <= 0 || h <= 0) return; ctx.fillStyle = c; ctx.fillRect(x * u, y * u, w * u, h * u); },
      ellipse: function (cx, cy, rx, ry, c) { for (var y = -Math.ceil(ry); y <= Math.ceil(ry); y++) { var t = 1 - (y * y) / (ry * ry + 0.25); if (t < 0) continue; var w = Math.round(rx * Math.sqrt(t)); g.rect(cx - w, cy + y, w * 2 + 1, 1, c); } },
      disc: function (cx, cy, r, c) { g.ellipse(cx, cy, r, r, c); },
      line: function (x0, y0, x1, y1, c, w) { w = w || 1; var dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy)) || 1; for (var i = 0; i <= n; i++) { var x = x0 + dx * i / n, y = y0 + dy * i / n; g.rect(x - Math.floor(w / 2), y - Math.floor(w / 2), w, w, c); } },
      tri: function (x0, y0, x1, y1, x2, y2, c) { var minY = Math.floor(Math.min(y0, y1, y2)), maxY = Math.ceil(Math.max(y0, y1, y2)); for (var y = minY; y <= maxY; y++) { var xs = []; [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]].forEach(function (e) { if ((y >= e[1] && y <= e[3]) || (y >= e[3] && y <= e[1])) { if (e[1] === e[3]) { xs.push(e[0], e[2]); } else xs.push(e[0] + (y - e[1]) * (e[2] - e[0]) / (e[3] - e[1])); } }); if (xs.length >= 2) { var a = Math.min.apply(null, xs), b = Math.max.apply(null, xs); g.rect(a, y, b - a + 1, 1, c); } } },
      // 陰影つきの楕円（右下に影・左上に光）
      blob: function (cx, cy, rx, ry, base, dark, light) { g.ellipse(cx + 1, cy + 2, rx, ry, dark); g.ellipse(cx, cy, rx, ry, base); g.ellipse(cx - rx * 0.3, cy - ry * 0.35, rx * 0.45, ry * 0.35, light); },
      shadow: function (cx, cy, rx) { g.ellipse(cx, cy, rx, Math.min(3, Math.max(2, rx / 6)), 'rgba(0,0,0,0.30)'); }
    };
    return g;
  }
  function bob(phase, amp) { return Math.round(Math.sin(((phase || 0) / 4) * Math.PI * 2) * (amp || 1)); }

  var DRAW = {};
  // 001 知恵喰いモグラン：知恵を蓄えた奇妙な小型獣（大きな丸眼鏡・巻物を背負う・本をかじる・鼻ひげ）
  DRAW.quiz_monster_001 = function (g, N, ph) {
    var cx = 48, cy = 59 + bob(ph, 1); g.shadow(cx, 87, 26);
    // 背中の巻物の束
    g.rect(cx + 6, cy - 34, 30, 10, '#6a4a2a'); g.rect(cx + 8, cy - 33, 26, 8, '#f2ead8'); g.rect(cx + 8, cy - 33, 26, 2, '#ffffff'); g.disc(cx + 8, cy - 29, 5, '#e8c15a'); g.disc(cx + 34, cy - 29, 5, '#e8c15a');
    g.rect(cx + 12, cy - 42, 22, 9, '#5a3a8a'); g.rect(cx + 13, cy - 41, 20, 2, '#8a6ac0'); g.disc(cx + 12, cy - 38, 4, '#c94a4a'); g.disc(cx + 34, cy - 38, 4, '#c94a4a');
    // 足・爪
    g.ellipse(cx - 16, cy + 22, 9, 5, '#5a3a1a'); g.ellipse(cx + 16, cy + 22, 9, 5, '#5a3a1a'); for (var k = 0; k < 3; k++) { g.rect(cx - 24 + k * 4, cy + 25, 2, 3, '#f2ead8'); g.rect(cx + 10 + k * 4, cy + 25, 2, 3, '#f2ead8'); }
    // 体（丸い毛皮）
    g.blob(cx, cy, 30, 25, '#8a5a3a', '#5a3a1a', '#b88a5a'); g.ellipse(cx, cy + 8, 18, 14, '#d8b890');
    for (var f = 0; f < 7; f++) g.line(cx - 26 + f * 8, cy - 22 + (f % 2) * 3, cx - 24 + f * 8, cy - 26 + (f % 2) * 3, '#5a3a1a', 1);   // 毛並み
    // 頭
    var hx = cx - 4, hy = cy - 24; g.blob(hx, hy, 22, 17, '#9a6a4a', '#5a3a1a', '#c89a6a');
    g.ellipse(hx - 16, hy - 12, 6, 6, '#5a3a1a'); g.ellipse(hx - 16, hy - 12, 3, 3, '#e8a0a0'); g.ellipse(hx + 14, hy - 13, 6, 6, '#5a3a1a'); g.ellipse(hx + 14, hy - 13, 3, 3, '#e8a0a0');   // 耳
    // 大きな丸眼鏡
    g.disc(hx - 9, hy - 2, 8, '#2a2a3a'); g.disc(hx + 9, hy - 2, 8, '#2a2a3a'); g.disc(hx - 9, hy - 2, 6, '#cfe8ff'); g.disc(hx + 9, hy - 2, 6, '#cfe8ff'); g.rect(hx - 2, hy - 3, 4, 2, '#2a2a3a');
    g.disc(hx - 9, hy - 1, 3, '#1a1a2a'); g.disc(hx + 9, hy - 1, 3, '#1a1a2a'); g.px(hx - 10, hy - 3, '#ffffff'); g.px(hx + 8, hy - 3, '#ffffff'); g.rect(hx - 14, hy - 6, 3, 1, '#ffffff'); g.rect(hx + 4, hy - 6, 3, 1, '#ffffff');
    // 鼻・ひげ・歯
    g.ellipse(hx, hy + 8, 5, 4, '#e86a8a'); g.px(hx - 1, hy + 6, '#ffb0c0'); g.line(hx - 6, hy + 8, hx - 18, hy + 6, '#3a2a1a'); g.line(hx - 6, hy + 10, hx - 18, hy + 12, '#3a2a1a'); g.line(hx + 6, hy + 8, hx + 18, hy + 6, '#3a2a1a'); g.line(hx + 6, hy + 10, hx + 18, hy + 12, '#3a2a1a');
    g.rect(hx - 3, hy + 12, 6, 4, '#ffffff'); g.rect(hx, hy + 12, 1, 4, '#c0c0c0');
    // 前足でかじる本（ページに「R」「%」の模様）
    var bx = cx - 26, by = cy + 2 + bob(ph, 1); g.rect(bx, by, 22, 16, '#2a5a8a'); g.rect(bx + 2, by + 1, 18, 14, '#f2ead8'); g.rect(bx + 10, by + 1, 2, 14, '#c9b8a0');
    g.rect(bx + 4, by + 4, 4, 1, '#3a3a5a'); g.rect(bx + 4, by + 7, 5, 1, '#3a3a5a'); g.rect(bx + 14, by + 4, 4, 1, '#3a3a5a'); g.rect(bx + 14, by + 7, 3, 1, '#3a3a5a'); g.tri(bx + 18, by, bx + 22, by, bx + 22, by + 5, 'rgba(0,0,0,0)');
    g.ellipse(bx + 2, by + 9, 5, 4, '#8a5a3a'); g.ellipse(bx + 21, by + 9, 5, 4, '#8a5a3a');   // 前足
    for (var cr = 0; cr < 3; cr++) g.px(bx + 22 - cr, by - 1 - cr, '#f2ead8');   // かじり跡のかけら
  };
  // 002 騙しの幻獣ミラグ：複数の幻影を持つ神秘的な魔獣（狐のような体・尾が三本・左右に半透明の幻影・浮かぶ鏡のかけら）
  function miragBody(g, cx, cy, a, ph) {
    var base = 'rgba(138,122,208,' + a + ')', dark = 'rgba(74,58,138,' + a + ')', light = 'rgba(208,192,255,' + a + ')', mane = 'rgba(240,232,255,' + a + ')';
    for (var t = 0; t < 3; t++) { var tx = cx + 14 + t * 3, ty = cy + 4 - t * 8 + bob(ph + t, 2); g.tri(cx + 10, cy + 6, tx + 10, ty - 14, tx + 6, ty + 10, dark); g.tri(cx + 10, cy + 4, tx + 9, ty - 13, tx + 5, ty + 6, base); g.disc(tx + 9, ty - 12, 3, light); }
    g.rect(cx - 14, cy + 12, 5, 14, dark); g.rect(cx + 6, cy + 12, 5, 14, dark); g.rect(cx - 6, cy + 12, 5, 12, base); g.rect(cx + 12, cy + 12, 5, 12, base);
    g.blob(cx, cy + 4, 22, 13, base, dark, light);
    var hx = cx - 18, hy = cy - 10; g.blob(hx, hy, 13, 11, base, dark, light);
    g.tri(hx - 12, hy - 6, hx - 7, hy - 26, hx - 1, hy - 8, dark); g.tri(hx - 10, hy - 7, hx - 7, hy - 22, hx - 3, hy - 8, light);
    g.tri(hx + 2, hy - 8, hx + 9, hy - 27, hx + 12, hy - 6, dark); g.tri(hx + 4, hy - 8, hx + 9, hy - 23, hx + 10, hy - 7, light);
    g.tri(hx - 14, hy + 2, hx - 26, hy + 5, hx - 14, hy + 8, base); g.px(hx - 25, hy + 5, dark);
    g.ellipse(hx + 8, hy + 6, 6, 5, mane);
    return { hx: hx, hy: hy };
  }
  DRAW.quiz_monster_002 = function (g, N, ph) {
    var cx = 54, cy = 56 + bob(ph, 2); g.shadow(cx, 86, 24);
    // 左右の幻影（半透明）
    miragBody(g, cx - 6, cy - 10 + bob(ph + 1, 2), 0.16, ph + 1); miragBody(g, cx + 4, cy - 6 + bob(ph + 2, 2), 0.13, ph + 2);
    var h = miragBody(g, cx, cy, 1, ph);
    // 目（三つ目・妖しく光る）
    g.disc(h.hx - 5, h.hy - 1, 2, '#ffe24a'); g.disc(h.hx + 4, h.hy - 1, 2, '#ffe24a'); g.px(h.hx - 5, h.hy - 1, '#1a1a2a'); g.px(h.hx + 4, h.hy - 1, '#1a1a2a');
    g.ellipse(h.hx, h.hy - 7, 2, 3, '#ff7fd0'); g.px(h.hx, h.hy - 7, '#ffffff');
    // 浮かぶ鏡のかけら
    var sh = [[12, 14], [74, 12], [8, 66], [76, 70]]; sh.forEach(function (p, i) { var y = p[1] + bob(ph + i, 3); g.tri(p[0], y, p[0] + 6, y - 5, p[0] + 9, y + 4, '#cfe8ff'); g.tri(p[0] + 1, y, p[0] + 6, y - 3, p[0] + 7, y + 2, '#ffffff'); });
  };
  // 003 黄金強奪鬼ガルゾ：黄金を背負う巨大な強奪鬼（角・牙・背中の金貨袋・こぼれる金貨・鎖）
  DRAW.quiz_monster_003 = function (g, N, ph) {
    var cx = 46, cy = 55 + bob(ph, 1); g.shadow(cx, 87, 32);
    // 背中の金貨袋（大きい）
    g.blob(cx + 16, cy - 22, 24, 22, '#c9a24a', '#8a6a2a', '#f2d88a'); g.rect(cx + 6, cy - 44, 20, 6, '#8a6a2a'); g.ellipse(cx + 16, cy - 46, 8, 4, '#c9a24a');
    for (var c = 0; c < 7; c++) { var x = cx + 2 + (c * 7) % 28, y = cy - 46 + (c % 3) * 2; g.disc(x, y, 3, '#ffd24a'); g.px(x - 1, y - 1, '#fff6c8'); }
    g.rect(cx + 8, cy - 26, 16, 3, '#e8c15a'); g.rect(cx + 14, cy - 30, 4, 10, '#e8c15a');   // 袋の「＄」のような紋
    // 脚
    g.rect(cx - 18, cy + 14, 12, 18, '#6a2a2a'); g.rect(cx + 4, cy + 14, 12, 18, '#6a2a2a'); g.rect(cx - 20, cy + 28, 16, 5, '#3a1a1a'); g.rect(cx + 2, cy + 28, 16, 5, '#3a1a1a');
    // 胴（筋骨隆々）・腰布
    g.blob(cx - 2, cy, 26, 22, '#b04a3a', '#6a2a2a', '#d8786a'); g.rect(cx - 24, cy + 10, 44, 8, '#4a3a2a'); g.rect(cx - 24, cy + 10, 44, 2, '#6a5a3a'); g.rect(cx - 6, cy + 9, 8, 10, '#e8c15a');
    g.line(cx - 14, cy - 8, cx - 4, cy - 4, '#6a2a2a'); g.line(cx + 2, cy - 4, cx + 12, cy - 8, '#6a2a2a');
    // 腕：片手に金貨をつかむ
    g.ellipse(cx - 28, cy - 2, 8, 14, '#b04a3a'); g.disc(cx - 30, cy + 12, 7, '#b04a3a'); g.disc(cx - 30, cy + 12, 4, '#ffd24a'); g.px(cx - 31, cy + 11, '#fff6c8');
    g.ellipse(cx + 22, cy + 2, 7, 12, '#9a3a2a');
    // 頭：角・牙・眉
    var hx = cx - 4, hy = cy - 26; g.blob(hx, hy, 16, 14, '#b04a3a', '#6a2a2a', '#d8786a');
    g.tri(hx - 14, hy - 6, hx - 22, hy - 21, hx - 8, hy - 10, '#f2ead8'); g.tri(hx + 10, hy - 10, hx + 20, hy - 22, hx + 14, hy - 6, '#f2ead8');
    g.rect(hx - 10, hy - 6, 8, 2, '#3a1a1a'); g.rect(hx + 2, hy - 6, 8, 2, '#3a1a1a'); g.disc(hx - 6, hy - 2, 2, '#ffe24a'); g.disc(hx + 6, hy - 2, 2, '#ffe24a'); g.px(hx - 6, hy - 2, '#1a1a1a'); g.px(hx + 6, hy - 2, '#1a1a1a');
    g.rect(hx - 8, hy + 5, 16, 4, '#3a1a1a'); g.tri(hx - 7, hy + 5, hx - 4, hy + 5, hx - 6, hy + 1, '#ffffff'); g.tri(hx + 4, hy + 5, hx + 7, hy + 5, hx + 6, hy + 1, '#ffffff'); g.rect(hx - 3, hy + 8, 6, 1, '#ffffff');
    // 鎖とこぼれる金貨
    for (var l = 0; l < 5; l++) g.ellipse(cx + 22 + l * 3, cy + 16 + l * 3, 2, 1, '#9aa0b0');
    var fall = [[cx + 34, cy + 4], [cx + 30, cy + 16], [cx + 38, cy + 22]]; fall.forEach(function (p, i) { var y = p[1] + ((ph + i) % 4) * 2; g.disc(p[0], y, 3, '#ffd24a'); g.px(p[0] - 1, y - 1, '#fff6c8'); });
  };
  // 004 波形の魔眼ゼルキス：波形模様と巨大な魔眼を持つ怪物（浮かぶ大きな目玉・体を走る波形の線・触手）
  DRAW.quiz_monster_004 = function (g, N, ph) {
    var cx = 48, cy = 44 + bob(ph, 2); g.shadow(cx, 88, 20);
    // 触手
    for (var t = 0; t < 6; t++) { var x0 = cx - 20 + t * 8; for (var s = 0; s < 6; s++) { var x = x0 + Math.round(Math.sin(s * 0.7 + t + (ph || 0)) * 3), y = cy + 22 + s * 4; g.disc(x, y, Math.max(1, 3 - Math.floor(s / 2)), s % 2 ? '#2a4a8a' : '#3a5aa0'); } }
    // 体（大きな球）
    g.blob(cx, cy, 30, 28, '#2a3a6a', '#141d3a', '#4a6ab0');
    // 波形の模様（ジグザグの線が体を走る）
    var w1 = [[-26, 4], [-18, -6], [-10, 2], [-2, -10], [6, -2], [14, -14], [22, -6], [27, -10]], w2 = [[-24, 14], [-14, 8], [-6, 16], [4, 6], [12, 12], [22, 4]];
    for (var i = 0; i < w1.length - 1; i++) g.line(cx + w1[i][0], cy + w1[i][1] + 10, cx + w1[i + 1][0], cy + w1[i + 1][1] + 10, '#5ab0ff', 1);
    for (var j = 0; j < w2.length - 1; j++) g.line(cx + w2[j][0], cy + w2[j][1] + 6, cx + w2[j + 1][0], cy + w2[j + 1][1] + 6, '#ff7fd0', 1);
    // 巨大な魔眼
    g.ellipse(cx, cy - 6, 20, 14, '#f2ead8'); g.ellipse(cx, cy - 6, 20, 2, 'rgba(0,0,0,0.12)');
    var lx = bob(ph, 2); g.disc(cx + lx, cy - 6, 11, '#c94aff'); g.disc(cx + lx, cy - 6, 8, '#7a1ab0'); g.ellipse(cx + lx, cy - 6, 2, 7, '#0a0a14');
    g.disc(cx + lx - 4, cy - 10, 2, '#ffffff'); g.px(cx + lx + 4, cy - 2, '#ffffff');
    g.rect(cx - 20, cy - 21, 40, 3, '#141d3a'); g.rect(cx - 20, cy + 7, 40, 2, '#141d3a');   // まぶた
    // 頭の上の小さな目と角
    [-18, 0, 18].forEach(function (dx, k) { g.tri(cx + dx - 3, cy - 26, cx + dx + 3, cy - 26, cx + dx, cy - 32 - (k === 1 ? 3 : 0), '#4a6ab0'); });
    g.disc(cx - 26, cy - 14, 3, '#f2ead8'); g.px(cx - 26, cy - 14, '#c94aff'); g.disc(cx + 26, cy - 16, 3, '#f2ead8'); g.px(cx + 26, cy - 16, '#c94aff');
  };
  // 005 相場審判獣アルカディア：古代神殿の守護獣（獅子とグリフォンを思わせる体・翼・額の宝石・背の天秤・神殿の柱の装飾）
  DRAW.quiz_monster_005 = function (g, N, ph) {
    var cx = 48, cy = 55 + bob(ph, 1); g.shadow(cx, 87, 32);
    // 後光
    g.ellipse(cx - 18, cy - 22, 22, 22, 'rgba(255,246,200,0.10)'); g.ellipse(cx - 18, cy - 22, 19, 19, 'rgba(255,246,200,0.10)');
    // 翼
    g.tri(cx + 4, cy - 14, cx + 40, cy - 44 + bob(ph, 2), cx + 36, cy + 4, '#c9b890'); g.tri(cx + 6, cy - 10, cx + 37, cy - 38 + bob(ph, 2), cx + 31, cy, '#f2ead8');
    for (var f = 0; f < 4; f++) g.line(cx + 13 + f * 6, cy - 6, cx + 23 + f * 4, cy - 30 + f * 4 + bob(ph, 2), '#c9b890');
    // 体（獅子）
    g.rect(cx - 22, cy + 10, 9, 22, '#c9a86a'); g.rect(cx + 8, cy + 10, 9, 22, '#c9a86a'); g.rect(cx - 24, cy + 28, 13, 5, '#8a6a3a'); g.rect(cx + 6, cy + 28, 13, 5, '#8a6a3a');
    g.blob(cx - 4, cy + 4, 28, 16, '#e0c890', '#a88a4a', '#f2e2b0');
    g.tri(cx + 22, cy + 2, cx + 34, cy + 20, cx + 26, cy + 22, '#c9a86a'); g.disc(cx + 33, cy + 21, 4, '#8a6a3a');   // 尾
    // 胸の神殿の装飾（柱のような帯）
    g.rect(cx - 16, cy - 4, 20, 4, '#e8c15a'); for (var p = 0; p < 4; p++) g.rect(cx - 15 + p * 5, cy, 2, 10, '#fff6c8');
    // たてがみと頭
    var hx = cx - 18, hy = cy - 20; g.disc(hx, hy, 17, '#b88a4a'); for (var m = 0; m < 10; m++) { var a = m / 10 * Math.PI * 2; g.disc(hx + Math.cos(a) * 15, hy + Math.sin(a) * 15, 4, '#a07a3a'); }
    g.blob(hx, hy + 2, 11, 10, '#f2e2b0', '#c9a86a', '#fff6e0');
    g.disc(hx - 4, hy, 2, '#3a5ab0'); g.disc(hx + 4, hy, 2, '#3a5ab0'); g.px(hx - 4, hy - 1, '#ffffff'); g.px(hx + 4, hy - 1, '#ffffff');
    g.tri(hx - 3, hy + 5, hx + 3, hy + 5, hx, hy + 8, '#8a5a3a'); g.rect(hx - 4, hy + 9, 8, 1, '#8a5a3a');
    g.tri(hx - 3, hy - 9, hx + 3, hy - 9, hx, hy - 14, '#5ab0ff'); g.px(hx, hy - 11, '#ffffff');   // 額の宝石
    g.rect(hx - 9, hy - 18, 18, 3, '#e8c15a'); g.px(hx - 9, hy - 20, '#e8c15a'); g.px(hx, hy - 21, '#e8c15a'); g.px(hx + 8, hy - 20, '#e8c15a');   // 冠
    // 背の天秤（左右が揺れる）
    var sx = cx + 2, sy = cy - 30, tilt = bob(ph, 2); g.rect(sx - 1, sy, 2, 14, '#e8c15a'); g.line(sx - 14, sy + 2 + tilt, sx + 14, sy + 2 - tilt, '#e8c15a');
    g.line(sx - 14, sy + 2 + tilt, sx - 14, sy + 8 + tilt, '#c9a24a'); g.line(sx + 14, sy + 2 - tilt, sx + 14, sy + 8 - tilt, '#c9a24a');
    g.ellipse(sx - 14, sy + 9 + tilt, 5, 2, '#e8c15a'); g.ellipse(sx + 14, sy + 9 - tilt, 5, 2, '#e8c15a'); g.disc(sx, sy - 1, 2, '#fff6c8');
  };

  // 画像（canvas）を返す。素材の画像が読み込めていればそれを使う
  ART.image = function (id, scale, phase) {
    scale = scale || 2; phase = phase || 0;
    var file = root.QUIZ_ART_FILES[id]; if (file) { var im = ART.imgs[id]; if (!im && root.Image) { im = ART.imgs[id] = new root.Image(); im.onerror = function () { im.failed = true; }; im.src = file; } if (im && im.complete && im.naturalWidth && !im.failed) return im; }
    var key = id + '#' + scale + '#' + phase; if (ART.cache[key]) return ART.cache[key];
    var fn = DRAW[id]; if (!fn || !root.document) return null;
    var N = ART.N; var c = root.document.createElement('canvas'); c.width = N * scale; c.height = N * scale; var ctx = c.getContext('2d'); if (!ctx) return null;
    try { fn(painter(ctx, scale, N), N, phase); } catch (e) { if (root.console) console.warn('QuizMonArt', id, e); }
    ART.cache[key] = c; return c;
  };
  ART.has = function (id) { return !!DRAW[id]; };
  ART.ids = function () { return Object.keys(DRAW); };
  root.QuizMonArt = ART;
})(typeof window !== 'undefined' ? window : globalThis);
