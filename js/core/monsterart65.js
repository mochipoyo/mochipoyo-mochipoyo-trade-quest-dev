/* =========================================================
   Core / MonsterArt65（v6.5 Phase B）：地域ごとの新しいモンスターのための「新しい種族の形」
   ・色を変えただけの敵にしないため、シルエットから描き分ける（カエル・カメ・クラゲ・騎士・魔導書・砲台・クモ・フクロウ・
     エイ・サボテン・雪だるま・ヒドラ・鐘・鏡・トロッコ・サメ・サラマンダー・結晶・雲ヒツジ・猫・深淵の口・群体ドローン・狐）
   ・同じ種族でも features（武器・兜・模様・尾の数など）で形を変える。phase（0〜3）で待機の動き
   ・既存の MonsterArt.image(art, scale, phase) からそのまま使える（MonsterArt.register で種族を足す）
   ========================================================= */
(function (root) {
  'use strict';
  var MA = root.MonsterArt; if (!MA || !MA.register) return;
  function hex(c) { c = String(c).replace('#', ''); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function rgb(a) { return 'rgb(' + a.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))); }).join(',') + ')'; }
  function shade(c, k) { return rgb(hex(c).map(function (v) { return v * k; })); }
  function lighten(c, k) { return rgb(hex(c).map(function (v) { return v + (255 - v) * k; })); }
  function bob(o, amp) { return Math.round(Math.sin(((o.phase || 0) / 4) * Math.PI * 2) * (amp || 1)); }
  var R = function (name, fn) { MA.register(name, fn); };

  // カエル：しゃがんだ胴・大きな目・のど袋・後ろ足
  R('frog', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.64 + bob(o, 1); g.shadow(cx, N - 3, N * 0.32);
    g.ellipse(cx - N * 0.27, cy + 4, 5, 4, c.dark); g.ellipse(cx + N * 0.27, cy + 4, 5, 4, c.dark); g.rect(cx - N * 0.35, cy + 8, 6, 2, c.dark); g.rect(cx + N * 0.35 - 6, cy + 8, 6, 2, c.dark);
    g.blob(cx, cy, N * 0.3, N * 0.2, c.base, c.dark, c.light); g.ellipse(cx, cy + 5, N * 0.16, 3, o.sac ? c.accent : c.light);
    g.disc(cx - 6, cy - N * 0.18, 4, c.base); g.disc(cx + 6, cy - N * 0.18, 4, c.base); g.disc(cx - 6, cy - N * 0.18, 2, '#ffffff'); g.disc(cx + 6, cy - N * 0.18, 2, '#ffffff'); g.px(cx - 6, cy - N * 0.18, c.eye); g.px(cx + 6, cy - N * 0.18, c.eye);
    g.rect(cx - 6, cy - 1, 12, 1, c.dark); if (o.spots) for (var i = 0; i < 5; i++) g.disc(cx - 8 + i * 4, cy - 3 + (i % 2) * 3, 1, c.accent);
    if (o.tongue) { g.line(cx, cy, cx - 10, cy + 2, '#e05a7a', 1); g.disc(cx - 11, cy + 2, 1, '#e05a7a'); } });
  // カメ：甲羅（模様）・頭・4本の脚。shell: 'acorn'（どんぐり）/'barnacle'（フジツボ）/'lava'（溶岩の割れ目）
  R('turtle', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.58; g.shadow(cx, N - 3, N * 0.36);
    for (var l = 0; l < 4; l++) { var lx = cx - N * 0.28 + l * N * 0.18; g.rect(lx, cy + N * 0.12, 4, 5, c.dark); }
    var hx = cx - N * 0.36 + bob(o, 1), hy = cy + 2; g.blob(hx, hy, 4, 3, c.light, c.dark, '#ffffff'); g.px(hx - 2, hy - 1, c.eye);
    g.blob(cx + 1, cy, N * 0.32, N * 0.22, c.base, c.dark, c.light); g.rect(cx - N * 0.3, cy + N * 0.12, N * 0.62, 2, c.dark);
    var sh = o.shell || 'plain';
    if (sh === 'acorn') { g.ellipse(cx + 1, cy - N * 0.12, N * 0.22, 3, shade(c.base, 0.7)); for (var k = -2; k <= 2; k++) g.px(cx + 1 + k * 4, cy - N * 0.12, c.accent); g.rect(cx, cy - N * 0.22 - 3, 2, 3, c.dark); }
    else if (sh === 'barnacle') { for (var b = 0; b < 6; b++) { var bx = cx - 9 + (b % 3) * 9, by = cy - 5 + Math.floor(b / 3) * 5; g.disc(bx, by, 2, c.accent); g.px(bx, by, c.dark); } }
    else if (sh === 'lava') { g.line(cx - 8, cy - 2, cx - 2, cy - 6, c.accent, 1); g.line(cx - 2, cy - 6, cx + 5, cy - 1, c.accent, 1); g.line(cx + 5, cy - 1, cx + 10, cy - 5, c.accent, 1); g.line(cx - 4, cy + 2, cx + 3, cy + 3, c.accent, 1); for (var s = 0; s < 3; s++) g.px(cx - 6 + s * 7, cy - 9 - (s % 2) * 2 + bob(o, 1), '#ffd24a'); }
    else for (var p = -1; p <= 1; p++) g.rect(cx - 2 + p * 7, cy - 4, 4, 4, c.dark); });
  // クラゲ：半透明の傘・揺れる触手・光る芯
  R('jelly', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.4 + bob(o, 2);
    for (var t = 0; t < 5; t++) { var tx = cx - 8 + t * 4; for (var s = 0; s < 4; s++) g.px(tx + Math.round(Math.sin(s + t + (o.phase || 0)) * 1.5), cy + 6 + s * 3, s % 2 ? c.base : c.light); }
    g.ellipse(cx, cy, N * 0.3, N * 0.2, 'rgba(255,255,255,0.15)'); g.ellipse(cx, cy, N * 0.27, N * 0.17, c.base); g.ellipse(cx - 3, cy - 3, N * 0.12, N * 0.06, c.light);
    g.rect(cx - N * 0.27, cy + 2, N * 0.54, 2, c.dark); g.disc(cx, cy - 1, 2, c.accent); g.px(cx, cy - 2, '#ffffff'); g.rect(cx - 5, cy + 1, 2, 2, c.eye); g.rect(cx + 3, cy + 1, 2, 2, c.eye); });
  // 騎士：兜・胴鎧・盾・武器。weapon: sword/lance/axe/pendulum/claymore、helm: plume/horn/crown/visor、cape
  R('knight', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.55; g.shadow(cx, N - 2, N * 0.3);
    if (o.cape) g.tri(cx - 7, cy - 6, cx + 7, cy - 6, cx + 1, cy + 14, c.accent);
    g.rect(cx - 5, cy + 8, 4, 7, c.dark); g.rect(cx + 1, cy + 8, 4, 7, c.dark); g.rect(cx - 6, cy + 14, 5, 2, c.base); g.rect(cx + 1, cy + 14, 5, 2, c.base);
    g.rect(cx - 7, cy - 4, 14, 13, c.base); g.rect(cx - 7, cy - 4, 14, 2, c.light); g.rect(cx + 5, cy - 4, 2, 13, c.dark); g.rect(cx - 7, cy + 3, 14, 1, c.dark);
    g.rect(cx - 5, cy - 13, 10, 9, c.base); g.rect(cx - 5, cy - 13, 10, 2, c.light); g.rect(cx - 4, cy - 9, 8, 2, '#1a1a22'); g.px(cx - 2, cy - 9, c.eye); g.px(cx + 1, cy - 9, c.eye);
    var hm = o.helm || 'visor';
    if (hm === 'plume') { g.rect(cx - 1, cy - 18, 2, 5, c.accent); g.rect(cx + 1, cy - 19, 4, 2, c.accent); }
    else if (hm === 'horn') { g.line(cx - 5, cy - 12, cx - 9, cy - 18, c.light, 2); g.line(cx + 5, cy - 12, cx + 9, cy - 18, c.light, 2); }
    else if (hm === 'crown') { g.rect(cx - 5, cy - 15, 10, 2, '#e8c15a'); g.px(cx - 4, cy - 17, '#e8c15a'); g.px(cx, cy - 18, '#e8c15a'); g.px(cx + 3, cy - 17, '#e8c15a'); }
    g.rect(cx - 13, cy - 3, 6, 10, c.dark); g.rect(cx - 12, cy - 2, 4, 8, c.accent); g.px(cx - 10, cy + 2, '#ffffff');   // 盾
    var wp = o.weapon || 'sword', sw = bob(o, 1);
    if (wp === 'lance') { g.line(cx + 9, cy + 10, cx + 13, cy - 16, '#c0c0d0', 1); g.tri(cx + 12, cy - 16, cx + 15, cy - 16, cx + 14, cy - 21, '#e8e8f0'); }
    else if (wp === 'axe') { g.line(cx + 9, cy + 8, cx + 11, cy - 10, '#6a4a2a', 2); g.tri(cx + 10, cy - 12, cx + 16, cy - 14, cx + 16, cy - 5, '#c0c0d0'); }
    else if (wp === 'pendulum') { g.line(cx + 10, cy - 14, cx + 10 + sw * 3, cy + 4, '#c9a24a', 1); g.disc(cx + 10 + sw * 3, cy + 6, 3, '#e8c15a'); g.px(cx + 10 + sw * 3, cy + 6, '#ffffff'); }
    else if (wp === 'claymore') { g.rect(cx + 9, cy - 18, 3, 24, '#d0d0e0'); g.rect(cx + 7, cy + 4, 7, 2, c.accent); }
    else { g.rect(cx + 9, cy - 12, 2, 16, '#d0d0e0'); g.rect(cx + 7, cy + 3, 6, 2, c.accent); } });
  // 魔導書：開いた本が浮く・ページ・目または紋章。glyph: 'eye'/'flame'/'seal'
  R('tome', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.5 + bob(o, 2); g.shadow(cx, N - 3, N * 0.22);
    g.tri(cx, cy + 4, cx - 14, cy - 2, cx - 13, cy + 8, c.dark); g.tri(cx, cy + 4, cx + 14, cy - 2, cx + 13, cy + 8, c.dark);
    g.tri(cx, cy + 2, cx - 13, cy - 4, cx - 12, cy + 6, '#f2ead8'); g.tri(cx, cy + 2, cx + 13, cy - 4, cx + 12, cy + 6, '#f2ead8');
    for (var i = 0; i < 3; i++) { g.line(cx - 10, cy - 1 + i * 2, cx - 3, cy + 1 + i * 2, '#9a8a6a', 1); g.line(cx + 3, cy + 1 + i * 2, cx + 10, cy - 1 + i * 2, '#9a8a6a', 1); }
    g.rect(cx - 1, cy - 4, 2, 10, c.base); var gl = o.glyph || 'eye';
    if (gl === 'eye') { g.disc(cx, cy - 9, 4, c.base); g.disc(cx, cy - 9, 2, '#ffffff'); g.px(cx, cy - 9, c.eye); }
    else if (gl === 'flame') { g.tri(cx - 4, cy - 6, cx + 4, cy - 6, cx, cy - 16 - bob(o, 1), c.accent); g.tri(cx - 2, cy - 6, cx + 2, cy - 6, cx, cy - 12, '#ffd24a'); }
    else { g.disc(cx, cy - 10, 4, c.accent); g.disc(cx, cy - 10, 2, c.base); g.px(cx, cy - 10, '#ffffff'); }
    for (var s = 0; s < 3; s++) g.px(cx - 10 + s * 10, cy - 12 - ((s + (o.phase || 0)) % 3) * 2, c.accent); });
  // 砲台：台座・回転する砲身・センサー。kind: 'tax'（硬貨の投入口）/'firewall'（防壁の格子）
  R('turret', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.6; g.shadow(cx, N - 2, N * 0.34);
    g.rect(cx - 12, cy + 4, 24, 8, c.dark); g.rect(cx - 12, cy + 4, 24, 2, c.base); g.rect(cx - 9, cy - 4, 18, 9, c.base); g.rect(cx - 9, cy - 4, 18, 2, c.light);
    var a = bob(o, 2); g.rect(cx - 4, cy - 10, 8, 7, c.light); g.line(cx, cy - 7, cx - 14, cy - 10 + a, c.dark, 3); g.rect(cx - 16, cy - 12 + a, 3, 5, c.dark);
    g.disc(cx + 3, cy - 7, 2, c.accent); g.px(cx + 3, cy - 7, '#ffffff');
    if (o.kind === 'tax') { g.rect(cx - 4, cy, 8, 2, '#1a1a1a'); g.disc(cx + 8, cy + 8, 2, '#e8c15a'); }
    if (o.kind === 'firewall') { for (var i = 0; i < 4; i++) g.rect(cx - 12 + i * 7, cy + 5, 1, 7, c.accent); g.rect(cx - 12, cy + 8, 24, 1, c.accent); } });
  // クモ：丸い胴・8本の脚。mark: 'hourglass'/'circuit'/'sand'
  R('spider', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.6 + bob(o, 1); g.shadow(cx, N - 3, N * 0.34);
    for (var i = 0; i < 4; i++) { var ly = cy - 4 + i * 3; g.line(cx - 4, ly, cx - 10, ly - 4, c.dark, 1); g.line(cx - 10, ly - 4, cx - 14, ly + 5, c.dark, 1); g.line(cx + 4, ly, cx + 10, ly - 4, c.dark, 1); g.line(cx + 10, ly - 4, cx + 14, ly + 5, c.dark, 1); }
    g.blob(cx, cy + 2, N * 0.18, N * 0.16, c.base, c.dark, c.light); g.blob(cx, cy - 5, N * 0.1, N * 0.09, c.base, c.dark, c.light);
    for (var e = 0; e < 4; e++) g.px(cx - 3 + e * 2, cy - 6, c.eye);
    var mk = o.mark; if (mk === 'hourglass') { g.tri(cx - 3, cy - 1, cx + 3, cy - 1, cx, cy + 3, c.accent); g.tri(cx - 3, cy + 7, cx + 3, cy + 7, cx, cy + 3, c.accent); }
    else if (mk === 'circuit') { g.line(cx - 4, cy + 1, cx + 4, cy + 1, c.accent, 1); g.line(cx, cy + 1, cx, cy + 6, c.accent, 1); g.px(cx - 4, cy + 1, '#ffffff'); g.px(cx + 4, cy + 1, '#ffffff'); }
    else if (mk === 'sand') { for (var s = 0; s < 4; s++) g.px(cx - 4 + s * 3, cy + 1 + (s % 2) * 3, c.accent); } });
  // フクロウ：丸い体・大きな目・耳の房。halo（光輪）/ monocle（片眼鏡）
  R('owl', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.56 + bob(o, 1); g.shadow(cx, N - 3, N * 0.24);
    g.ellipse(cx - N * 0.24, cy + 2, 4, 8, c.dark); g.ellipse(cx + N * 0.24, cy + 2, 4, 8, c.dark);
    g.blob(cx, cy + 2, N * 0.22, N * 0.26, c.base, c.dark, c.light); g.ellipse(cx, cy + 6, N * 0.12, N * 0.13, c.light);
    for (var f = 0; f < 3; f++) g.px(cx - 2 + f * 2, cy + 6 + (f % 2), c.dark);
    g.tri(cx - 8, cy - 8, cx - 4, cy - 8, cx - 8, cy - 14, c.dark); g.tri(cx + 4, cy - 8, cx + 8, cy - 8, cx + 8, cy - 14, c.dark);
    g.disc(cx - 4, cy - 4, 3, '#ffffff'); g.disc(cx + 4, cy - 4, 3, '#ffffff'); g.disc(cx - 4, cy - 4, 1, c.eye); g.disc(cx + 4, cy - 4, 1, c.eye); g.tri(cx - 1, cy - 2, cx + 1, cy - 2, cx, cy + 1, c.accent);
    if (o.monocle) { g.line(cx + 1, cy - 7, cx + 7, cy - 7, '#e8c15a', 1); g.line(cx + 7, cy - 7, cx + 7, cy - 1, '#e8c15a', 1); g.line(cx + 1, cy - 1, cx + 7, cy - 1, '#e8c15a', 1); g.line(cx + 7, cy - 1, cx + 9, cy + 6, '#e8c15a', 1); }
    if (o.halo) g.ellipse(cx, cy - 15, 7, 2, c.accent); g.rect(cx - 4, cy + N * 0.26, 2, 2, c.accent); g.rect(cx + 2, cy + N * 0.26, 2, 2, c.accent); });
  // エイ：ひし形の平たい体・長い尾。spark（放電）
  R('ray', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.48 + bob(o, 2); g.shadow(cx, N - 3, N * 0.3);
    var w = N * 0.44, f = bob(o, 2); g.tri(cx - w, cy + f, cx, cy - 7, cx, cy + 6, c.base); g.tri(cx + w, cy + f, cx, cy - 7, cx, cy + 6, c.base);
    g.tri(cx - w, cy + f, cx - 2, cy + 3, cx, cy + 6, c.dark); g.tri(cx + w, cy + f, cx + 2, cy + 3, cx, cy + 6, c.dark);
    g.line(cx, cy + 5, cx + 2, cy + 16, c.dark, 1); g.px(cx + 2, cy + 17, c.accent); g.rect(cx - 4, cy - 3, 2, 2, c.eye); g.rect(cx + 2, cy - 3, 2, 2, c.eye);
    for (var i = 0; i < 4; i++) g.px(cx - 10 + i * 6, cy, c.light);
    if (o.spark) { g.line(cx - w - 2, cy - 4, cx - w + 1, cy - 1, c.accent, 1); g.line(cx + w + 2, cy - 4, cx + w - 1, cy - 1, c.accent, 1); } });
  // サボテン：柱の胴・腕・トゲ・花
  R('cactus', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.55; g.shadow(cx, N - 2, N * 0.24);
    g.rect(cx - 5, cy - 10, 10, 24, c.base); g.rect(cx - 5, cy - 10, 2, 24, c.light); g.rect(cx + 3, cy - 10, 2, 24, c.dark);
    var a = bob(o, 1); g.rect(cx - 12, cy - 2 + a, 7, 4, c.base); g.rect(cx - 12, cy - 9 + a, 4, 9, c.base); g.rect(cx + 5, cy + 1 - a, 7, 4, c.base); g.rect(cx + 9, cy - 6 - a, 4, 9, c.base);
    for (var s = 0; s < 8; s++) { g.px(cx - 6 + (s % 2) * 12, cy - 8 + s * 3, '#f2ead8'); } g.disc(cx, cy - 12, 3, c.accent); g.px(cx, cy - 12, '#ffd24a');
    g.rect(cx - 3, cy - 4, 2, 2, c.eye); g.rect(cx + 1, cy - 4, 2, 2, c.eye); g.rect(cx - 2, cy, 4, 1, c.dark); g.rect(cx - 7, cy + 13, 14, 3, '#c9a870'); });
  // 雪だるま：2段の雪玉・帽子・枝の腕・顔（blank：顔がない＝忘れた顔）
  R('snowman', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.62; g.shadow(cx, N - 2, N * 0.3);
    g.blob(cx, cy + 3, N * 0.24, N * 0.2, c.base, c.dark, '#ffffff'); g.blob(cx, cy - N * 0.2, N * 0.16, N * 0.15, c.base, c.dark, '#ffffff');
    var a = bob(o, 1); g.line(cx - 7, cy - 1, cx - 15, cy - 7 + a, '#6a4a2a', 1); g.line(cx + 7, cy - 1, cx + 15, cy - 7 - a, '#6a4a2a', 1);
    g.rect(cx - 6, cy - N * 0.33 - 2, 12, 2, c.accent); g.rect(cx - 4, cy - N * 0.33 - 7, 8, 5, c.accent);
    if (!o.blank) { g.rect(cx - 3, cy - N * 0.22, 2, 2, c.eye); g.rect(cx + 2, cy - N * 0.22, 2, 2, c.eye); g.tri(cx, cy - N * 0.18, cx, cy - N * 0.15, cx - 4, cy - N * 0.165, '#e8803a'); }
    else { g.line(cx - 4, cy - N * 0.2, cx + 4, cy - N * 0.2, 'rgba(120,140,180,0.6)', 1); }
    for (var b = 0; b < 3; b++) g.px(cx, cy - 2 + b * 4, '#2a2a3a'); });
  // ヒドラ：太い胴から複数の首（heads 2〜4）
  R('hydra', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.66; g.shadow(cx, N - 2, N * 0.38); var n = o.heads || 3;
    g.blob(cx, cy, N * 0.28, N * 0.16, c.base, c.dark, c.light); g.line(cx + N * 0.24, cy + 2, cx + N * 0.38, cy + 6, c.dark, 3);
    for (var i = 0; i < n; i++) { var t = n === 1 ? 0 : i / (n - 1); var hx = cx - N * 0.28 + t * N * 0.56, hy = cy - N * 0.42 + Math.abs(t - 0.5) * 8 + ((i + (o.phase || 0)) % 2); g.line(cx - 4 + t * 8, cy - 4, hx, hy + 3, c.base, 3); g.line(cx - 4 + t * 8, cy - 4, hx, hy + 3, c.dark, 1);
      g.blob(hx, hy, 4, 3, c.base, c.dark, c.light); g.px(hx - 2, hy - 1, c.eye); g.px(hx + 2, hy - 1, c.eye); g.rect(hx - 2, hy + 2, 4, 1, c.dark); g.px(hx, hy - 4, c.accent); } });
  // 鐘：鐘の体・振り子（舌）・目・音の輪
  R('bell', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.5 + bob(o, 1); g.shadow(cx, N - 3, N * 0.26);
    g.rect(cx - 1, cy - 16, 2, 4, c.dark); g.ellipse(cx, cy - 12, 3, 2, c.dark);
    g.tri(cx - 7, cy - 10, cx + 7, cy - 10, cx, cy - 13, c.base); g.rect(cx - 8, cy - 10, 16, 12, c.base); g.tri(cx - 12, cy + 6, cx - 8, cy - 2, cx - 8, cy + 6, c.base); g.tri(cx + 12, cy + 6, cx + 8, cy - 2, cx + 8, cy + 6, c.base);
    g.rect(cx - 12, cy + 4, 24, 3, c.dark); g.rect(cx - 6, cy - 9, 3, 12, c.light); var sw = bob(o, 2); g.disc(cx + sw, cy + 9, 2, c.accent);
    g.disc(cx + 2, cy - 4, 2, '#ffffff'); g.px(cx + 2, cy - 4, c.eye);
    if ((o.phase || 0) % 2) { g.line(cx - 15, cy - 4, cx - 13, cy - 8, c.accent, 1); g.line(cx + 15, cy - 4, cx + 13, cy - 8, c.accent, 1); } });
  // 鏡：枠・映る顔（自分の姿のゆがみ）。frame: 'gold'/'obsidian'/'sand'
  R('mirror', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.5 + bob(o, 1); g.shadow(cx, N - 3, N * 0.22);
    var fr = o.frame === 'obsidian' ? '#2a1a3a' : o.frame === 'sand' ? '#c9a870' : '#c9a24a';
    g.ellipse(cx, cy, N * 0.22, N * 0.3, fr); g.ellipse(cx, cy, N * 0.18, N * 0.26, c.base); g.ellipse(cx - 3, cy - 5, N * 0.06, N * 0.1, c.light);
    g.rect(cx - 4, cy - 2, 2, 2, c.eye); g.rect(cx + 2, cy - 2, 2, 2, c.eye); g.line(cx - 3, cy + 4, cx + 3, cy + 5, c.eye, 1);
    g.rect(cx - 2, cy + N * 0.3, 4, 4, fr); g.rect(cx - 6, cy + N * 0.3 + 4, 12, 2, fr);
    for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + (o.phase || 0) * 0.4; g.px(cx + Math.round(Math.cos(a) * N * 0.34), cy + Math.round(Math.sin(a) * N * 0.38), c.accent); } });
  // トロッコ（ミミック）：車輪・鉄の箱・牙・鎖
  R('cart', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.55; g.shadow(cx, N - 2, N * 0.36);
    g.disc(cx - 8, cy + 10, 3, '#2a2a2a'); g.disc(cx + 8, cy + 10, 3, '#2a2a2a'); g.px(cx - 8, cy + 10, '#9a9aaa'); g.px(cx + 8, cy + 10, '#9a9aaa');
    g.rect(cx - 13, cy - 2, 26, 11, c.base); g.rect(cx - 13, cy - 2, 26, 2, c.light); g.rect(cx - 13, cy + 7, 26, 2, c.dark); g.rect(cx - 11, cy + 2, 2, 2, c.dark); g.rect(cx + 9, cy + 2, 2, 2, c.dark);
    var j = bob(o, 1); g.rect(cx - 12, cy - 6 - j, 24, 4, '#2a1a0a'); for (var t = 0; t < 6; t++) { g.tri(cx - 11 + t * 4, cy - 2, cx - 9 + t * 4, cy - 2, cx - 10 + t * 4, cy - 5, '#ffffff'); }
    for (var o2 = 0; o2 < 4; o2++) g.disc(cx - 8 + o2 * 5, cy - 8 - j, 1, c.accent); g.rect(cx - 4, cy - 8 - j, 2, 2, c.eye); g.rect(cx + 2, cy - 8 - j, 2, 2, c.eye);
    if (o.chain) { for (var k = 0; k < 4; k++) g.rect(cx + 13 + (k % 2), cy + k * 3, 2, 2, '#9a9aaa'); } });
  // サメ：砂（または水）から出た背びれと大きな口
  R('shark', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.6 + bob(o, 1); g.shadow(cx, N - 3, N * 0.36);
    g.blob(cx, cy, N * 0.36, N * 0.15, c.base, c.dark, c.light); g.tri(cx - 2, cy - N * 0.13, cx + 6, cy - N * 0.13, cx + 4, cy - N * 0.13 - 9, c.dark);
    g.tri(cx + N * 0.32, cy, cx + N * 0.46, cy - 7, cx + N * 0.46, cy + 6, c.dark); g.rect(cx - N * 0.34, cy + 1, 10, 3, '#3a0a0a'); for (var t = 0; t < 5; t++) g.px(cx - N * 0.34 + t * 2, cy + 1, '#ffffff');
    g.rect(cx - N * 0.24, cy - 3, 2, 2, c.eye); if (o.sand) { for (var s = 0; s < 7; s++) g.rect(cx - 14 + s * 4, cy + N * 0.13 + (s % 2), 3, 2, '#d8c088'); } });
  // サラマンダー：炎のトサカと尾の火
  R('salamander', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.62; g.shadow(cx, N - 3, N * 0.32);
    g.line(cx + N * 0.24, cy + 1, cx + N * 0.42, cy - 5, c.base, 3); var f = bob(o, 2); g.tri(cx + N * 0.38, cy - 5, cx + N * 0.46, cy - 5, cx + N * 0.43, cy - 13 - f, c.accent); g.px(cx + N * 0.42, cy - 8, '#ffd24a');
    for (var l = 0; l < 2; l++) { var lx = cx - N * 0.18 + l * N * 0.3; g.line(lx, cy + 2, lx - 3, cy + 7, c.dark, 2); g.line(lx + 2, cy + 2, lx + 5, cy + 7, c.dark, 2); }
    g.blob(cx, cy, N * 0.26, N * 0.12, c.base, c.dark, c.light); for (var s = -2; s <= 2; s++) g.tri(cx + s * 4 - 2, cy - N * 0.11, cx + s * 4 + 2, cy - N * 0.11, cx + s * 4, cy - N * 0.11 - 4 - ((s + (o.phase || 0)) % 2) * 2, c.accent);
    var hx = cx - N * 0.3, hy = cy - 2; g.blob(hx, hy, 5, 4, c.base, c.dark, c.light); g.rect(hx - 3, hy - 2, 2, 2, '#ffd24a'); g.px(hx - 2, hy - 2, c.eye); g.rect(hx - 6, hy + 1, 4, 1, c.dark); });
  // 結晶：浮かぶ結晶の群れ・中心の光。facets で形を変える
  R('crystal', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.5 + bob(o, 2); g.shadow(cx, N - 3, N * 0.22);
    var n = o.facets || 3; for (var i = 0; i < n; i++) { var dx = (i - (n - 1) / 2) * 7, h = 10 + (i % 2 ? 4 : 8); g.tri(cx + dx - 4, cy + 4, cx + dx + 4, cy + 4, cx + dx, cy - h, i % 2 ? c.light : c.base); g.tri(cx + dx, cy - h, cx + dx + 4, cy + 4, cx + dx + 1, cy + 4, c.dark); g.tri(cx + dx - 4, cy + 4, cx + dx + 4, cy + 4, cx + dx, cy + 9, c.dark); }
    g.disc(cx, cy - 2, 2, c.accent); g.px(cx, cy - 3, '#ffffff');
    for (var s = 0; s < 4; s++) { var a = s * Math.PI / 2 + (o.phase || 0) * 0.5; g.px(cx + Math.round(Math.cos(a) * 14), cy + Math.round(Math.sin(a) * 9), c.accent); } });
  // 雲ヒツジ：もこもこの雲の体・巻き角・細い脚
  R('ram', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.56 + bob(o, 1); g.shadow(cx, N - 3, N * 0.3);
    for (var l = 0; l < 4; l++) g.rect(cx - 9 + l * 6, cy + 7, 2, 7, c.dark);
    for (var p = 0; p < 7; p++) g.disc(cx - 10 + (p % 4) * 6 + (p > 3 ? 3 : 0), cy - 2 + (p > 3 ? 5 : 0), 5, p % 2 ? c.base : c.light);
    var hx = cx - 12, hy = cy - 4; g.blob(hx, hy, 4, 4, c.dark, shade(c.dark, 0.7), c.base); g.px(hx - 1, hy - 1, c.eye);
    g.line(hx + 1, hy - 4, hx + 6, hy - 7, c.accent, 2); g.line(hx + 6, hy - 7, hx + 6, hy - 2, c.accent, 2);
    if (o.bolt) { g.line(cx + 4, cy - 12, cx + 1, cy - 8, '#ffd24a', 1); g.line(cx + 1, cy - 8, cx + 4, cy - 8, '#ffd24a', 1); g.line(cx + 4, cy - 8, cx + 1, cy - 4, '#ffd24a', 1); } });
  // 猫：しなやかな体・しっぽ・耳。glitch（体の一部がずれたブロック）
  R('cat', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.6; g.shadow(cx, N - 3, N * 0.28);
    var tw = bob(o, 2); g.line(cx + 9, cy + 2, cx + 14, cy - 6 + tw, c.base, 2); g.blob(cx + 1, cy + 2, N * 0.24, N * 0.13, c.base, c.dark, c.light);
    for (var l = 0; l < 4; l++) g.rect(cx - 7 + l * 5, cy + 5, 2, 6, l % 2 ? c.base : c.dark);
    var hx = cx - 8, hy = cy - 5; g.blob(hx, hy, 6, 5, c.base, c.dark, c.light); g.tri(hx - 6, hy - 3, hx - 3, hy - 4, hx - 5, hy - 10, c.base); g.tri(hx + 2, hy - 4, hx + 5, hy - 3, hx + 4, hy - 10, c.base);
    g.rect(hx - 3, hy - 1, 2, 2, c.eye); g.rect(hx + 1, hy - 1, 2, 2, c.eye); g.px(hx - 1, hy + 2, c.accent);
    if (o.glitch) { var sh = (o.phase || 0) % 2 ? 2 : -2; g.rect(cx - 2 + sh, cy - 1, 6, 2, c.accent); g.rect(cx + 4 - sh, cy + 4, 4, 1, '#ffffff'); g.rect(hx - 6 + sh, hy + 1, 3, 1, c.accent); } });
  // 深淵の口：大きく裂けた口と牙・目が並ぶ
  R('maw', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.55; g.shadow(cx, N - 2, N * 0.38);
    g.blob(cx, cy, N * 0.38, N * 0.3, c.base, c.dark, c.light); var op = 4 + bob(o, 2);
    g.ellipse(cx, cy + 3, N * 0.28, op, '#12040a'); for (var t = 0; t < 7; t++) { g.tri(cx - N * 0.26 + t * 5, cy + 3 - op, cx - N * 0.26 + t * 5 + 3, cy + 3 - op, cx - N * 0.26 + t * 5 + 1, cy + 7 - op, '#f2ead8'); g.tri(cx - N * 0.24 + t * 5, cy + 3 + op, cx - N * 0.24 + t * 5 + 3, cy + 3 + op, cx - N * 0.24 + t * 5 + 1, cy - 1 + op, '#f2ead8'); }
    for (var e = 0; e < 5; e++) { g.disc(cx - 10 + e * 5, cy - N * 0.18 - (e % 2) * 2, 1, c.accent); } g.rect(cx - 1, cy - N * 0.26, 2, 2, c.eye); });
  // 群体ドローン：小さな機械が3〜5機で隊列
  R('swarm', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.5; g.shadow(cx, N - 3, N * 0.34);
    var n = o.count || 4; for (var i = 0; i < n; i++) { var a = (i / n) * Math.PI * 2 + (o.phase || 0) * 0.4; var x = cx + Math.round(Math.cos(a) * 9), y = cy + Math.round(Math.sin(a) * 6);
      g.rect(x - 3, y - 2, 6, 4, c.base); g.rect(x - 3, y - 2, 6, 1, c.light); g.px(x, y, c.eye); g.rect(x - 5, y - 3, 2, 1, c.dark); g.rect(x + 3, y - 3, 2, 1, c.dark); }
    g.disc(cx, cy, 2, c.accent); g.px(cx, cy, '#ffffff'); });
  // 狐：尾の数（tails）で格が変わる。冷気の息
  R('fox', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.6; g.shadow(cx, N - 3, N * 0.3); var n = o.tails || 3;
    for (var i = 0; i < n; i++) { var a = -0.9 + i * (1.6 / Math.max(1, n - 1)) + bob(o, 1) * 0.05; g.line(cx + 8, cy, cx + 8 + Math.round(Math.cos(a) * 12), cy - 4 + Math.round(Math.sin(a) * 9), c.light, 3); g.px(cx + 8 + Math.round(Math.cos(a) * 13), cy - 4 + Math.round(Math.sin(a) * 10), c.accent); }
    g.blob(cx, cy + 1, N * 0.22, N * 0.12, c.base, c.dark, c.light); for (var l = 0; l < 4; l++) g.rect(cx - 6 + l * 4, cy + 4, 2, 6, c.dark);
    var hx = cx - 9, hy = cy - 5; g.blob(hx, hy, 5, 4, c.base, c.dark, c.light); g.tri(hx - 4, hy - 2, hx - 1, hy - 3, hx - 3, hy - 9, c.base); g.tri(hx + 1, hy - 3, hx + 4, hy - 2, hx + 3, hy - 9, c.base); g.tri(hx - 9, hy + 1, hx - 4, hy - 1, hx - 4, hy + 2, c.light);
    g.rect(hx - 2, hy - 1, 2, 1, c.eye); g.rect(hx + 1, hy - 1, 2, 1, c.eye); if (o.breath) for (var b = 0; b < 3; b++) g.px(hx - 11 - b * 2, hy + 1 - b, c.accent); });
})(typeof window !== 'undefined' ? window : globalThis);
