/* =========================================================
   Core / MonsterArt76（v7.6）：画像のない敵7体（新しい絵の検品で「保留」のまま、共通の種族の形で描いていた敵）の新しい形
   ・スケルトン＝骨の剣士（丸い盾・錆びた剣・破れたマント・赤く光る目）
   ・ダマシトカゲ＝カメレオン（巻いた尾・色の変わる縞・回る目・長い舌・枝をつかむ足）
   ・反転モグラ＝モグラ（土の山から出る・大きな爪・桃色の鼻・頭の上の「反転」の矢印）
   ・ストーンゴーレム＝積み石の巨人（苔・胸の光る紋・石を重ねた腕）
   ・インプ＝小鬼（大きな頭と角・にやり顔・こうもりの翼・先が矢じりの尾・三つ叉）
   ・ポイズンビートル＝カブトムシ（大きな角・毒の模様の甲羅・したたる毒）
   ・恐怖の影＝頭巾の亡霊（光る目・伸びる手・胸の中で下がっていくローソク足）
   ・MonsterArt.image(art) の新しい種族（register）。どの敵がこの形を使うかは js/data/enemyart76.js
   ・コードで描いた仮の絵（画像素材ではない）。素材の仕様は docs/environment/ENEMY_ART76.md
   ========================================================= */
(function (root) {
  'use strict';
  var MA = root.MonsterArt; if (!MA || !MA.register) return;
  function bob(o, amp) { return Math.round(Math.sin(((o.phase || 0) / 4) * Math.PI * 2) * (amp || 1)); }
  function R(name, fn) { try { MA.register(name, fn); } catch (e) { /* 二重に読んだとき */ } }

  // スケルトン：骨の剣士
  R('skelknight76', function (g, N, o) { var c = o.c, cx = N / 2, b = bob(o, 1), top = 6 + b; g.shadow(cx, N - 2, N * 0.3);
    var bone = c.base, boneD = c.dark, rust = '#8a5a3a';
    g.tri(cx - 4, top + 10, cx + 9, top + 10, cx + 12, N - 4, '#5a1a24'); g.tri(cx - 4, top + 10, cx + 12, N - 4, cx + 2, N - 5, '#7a2430'); for (var i = 0; i < 4; i++) g.px(cx + 3 + i * 2, N - 5 + (i % 2), '#3a3a4a');   // 破れたマント（背中）
    g.rect(cx - 4, N - 13, 2, 9, bone); g.rect(cx + 2, N - 13, 2, 9, bone); g.disc(cx - 3, N - 9, 1, boneD); g.disc(cx + 3, N - 9, 1, boneD); g.rect(cx - 6, N - 4, 4, 2, bone); g.rect(cx + 2, N - 4, 4, 2, bone);   // 脚
    g.ellipse(cx, N - 14, 5, 2, bone); g.rect(cx - 1, top + 10, 2, N - 24 - top, boneD);   // 骨盤・背骨
    for (var r = 0; r < 4; r++) { var yy = top + 11 + r * 2; g.line(cx - 5 + r * 0.5, yy, cx + 5 - r * 0.5, yy, bone); g.px(cx - 6 + r * 0.5, yy + 1, boneD); g.px(cx + 5 - r * 0.5, yy + 1, boneD); }   // 肋骨
    g.rect(cx - 7, top + 9, 14, 2, bone);   // 肩
    g.disc(cx, top + 3, 6, bone); g.rect(cx - 4, top + 8, 8, 3, bone); for (var t = 0; t < 4; t++) g.px(cx - 3 + t * 2, top + 9, boneD);   // 頭蓋・あご・歯
    g.disc(cx - 2, top + 3, 2, '#1a1418'); g.disc(cx + 3, top + 3, 2, '#1a1418'); g.px(cx - 2, top + 3, c.eye); g.px(cx + 3, top + 3, c.eye); g.px(cx, top + 6, '#1a1418');   // 目の穴・赤い光
    g.rect(cx - 6, top - 3, 12, 2, '#6a6a7a'); g.rect(cx - 4, top - 5, 8, 2, '#8a8a9a'); g.px(cx, top - 6, '#c94a4a');   // 欠けた兜
    var sx = cx - 10, sy = top + 15; g.disc(sx, sy, 6, '#5a4a3a'); g.disc(sx, sy, 5, '#8a6a4a'); g.disc(sx, sy, 2, '#c9a24a'); g.line(sx - 4, sy, sx + 4, sy, '#5a4a3a'); g.line(sx, sy - 4, sx, sy + 4, '#5a4a3a');   // 丸い盾
    g.line(cx + 7, top + 11, cx + 10, top + 16, bone, 2); g.rect(cx + 9, top + 15, 4, 2, '#5a3a1a'); g.rect(cx + 10, top + 1, 2, 14, rust); g.px(cx + 10, top + 4, '#c9b09a'); g.px(cx + 11, top + 8, '#5a3a2a'); g.rect(cx + 8, top + 14, 6, 1, '#c9a24a');   // 腕・錆びた剣
  });
  // ダマシトカゲ：カメレオン
  R('chameleon76', function (g, N, o) { var c = o.c, cx = N / 2 + 2, cy = N * 0.55 + bob(o, 1); g.shadow(cx, N - 3, N * 0.32);
    g.line(4, N - 9, N - 3, N - 11, '#6a4a2a', 2); g.px(10, N - 10, '#4a8a3a'); g.px(30, N - 12, '#4a8a3a');   // 枝
    for (var a = 0; a < 26; a++) { var t = a / 26 * Math.PI * 1.7; var rr = 7 - a * 0.22; g.disc(Math.round(cx - 12 + Math.cos(t + 3.3) * rr), Math.round(cy + 3 + Math.sin(t + 3.3) * rr), a < 10 ? 2 : 1, a % 4 < 2 ? c.base : c.accent); }   // 巻いた尾
    g.blob(cx, cy, 11, 7, c.base, c.dark, c.light);
    var bands = [c.accent, '#5ab0ff', c.light, '#e05a7a']; for (var i = 0; i < 4; i++) g.ellipse(cx - 6 + i * 4, cy, 1, 5, bands[(i + (o.phase || 0)) % 4]);   // 色の変わる縞
    for (var s = 0; s < 6; s++) g.px(cx - 7 + s * 3, cy - 7 - (s % 2), c.dark);   // 背のとげ
    g.blob(cx + 11, cy - 3, 6, 5, c.base, c.dark, c.light); g.tri(cx + 8, cy - 7, cx + 13, cy - 12, cx + 15, cy - 6, c.dark);   // 頭・兜のような冠
    g.disc(cx + 12, cy - 4, 3, c.light); g.disc(cx + 12, cy - 4, 2, c.dark); g.px(cx + 13, cy - 4, c.eye);   // 回る目
    g.line(cx + 16, cy - 1, cx + 22, cy + 1, '#e05a7a', 1); g.disc(cx + 22, cy + 2, 1, '#e05a7a');   // 舌
    for (var f = 0; f < 2; f++) { var fx = cx - 6 + f * 11; g.line(fx, cy + 5, fx - 1, N - 10, c.dark, 2); g.rect(fx - 3, N - 10, 4, 1, c.dark); }   // 足（枝をつかむ）
  });
  // 反転モグラ
  R('mole76', function (g, N, o) { var c = o.c, cx = N / 2, b = bob(o, 1), cy = N * 0.55 + b; g.shadow(cx, N - 3, N * 0.36);
    g.ellipse(cx, N - 7, 15, 5, '#6a4a2a'); g.ellipse(cx, N - 8, 13, 4, '#8a6a42'); for (var i = 0; i < 6; i++) g.px(cx - 11 + i * 4, N - 9 + (i % 2), '#5a3a1a');   // 土の山
    g.blob(cx, cy, 11, 10, c.base, c.dark, c.light); g.ellipse(cx, cy + 4, 7, 4, c.light);   // 体・おなか
    g.ellipse(cx, cy - 2, 3, 2, '#f08aa8'); g.px(cx - 1, cy - 3, '#ffc0d0'); for (var w = 0; w < 3; w++) { g.line(cx - 4, cy - 2 + w, cx - 9, cy - 3 + w * 2, c.dark); g.line(cx + 4, cy - 2 + w, cx + 9, cy - 3 + w * 2, c.dark); }   // 鼻とひげ
    g.px(cx - 4, cy - 6, c.eye); g.px(cx + 4, cy - 6, c.eye);   // 小さな目
    for (var s = -1; s <= 1; s += 2) { var hx = cx + s * 12; g.disc(hx, cy + 3, 4, '#f0c8b0'); for (var k = 0; k < 3; k++) g.line(hx + s * (2 + k), cy + 1 + k * 2, hx + s * (6 + k), cy - 1 + k * 2, '#fff4e8', 1); }   // 大きな爪
    g.rect(cx - 6, cy - 13, 12, 3, '#e8c15a'); g.rect(cx - 7, cy - 10, 14, 1, '#b8913a'); g.disc(cx, cy - 12, 1, '#fff8c0');   // ヘルメット・灯り
    var ax = cx, ay = cy - 19; for (var a = 0; a < 14; a++) { var t = Math.PI * (0.15 + a / 14 * 1.5); g.px(Math.round(ax + Math.cos(t) * 5), Math.round(ay + Math.sin(t) * 3), c.accent); } g.tri(ax + 4, ay - 3, ax + 7, ay - 1, ax + 3, ay + 1, c.accent);   // 「反転」の矢印
  });
  // ストーンゴーレム：積み石の巨人
  R('boulder76', function (g, N, o) { var c = o.c, cx = N / 2, b = bob(o, 1); g.shadow(cx, N - 2, N * 0.38);
    var st = c.base, sd = c.dark, sl = c.light, moss = '#5a8a3a';
    g.blob(cx - 6, N - 6, 4, 3, st, sd, sl); g.blob(cx + 6, N - 6, 4, 3, st, sd, sl);   // 足
    g.blob(cx, N * 0.58 + b, 12, 10, st, sd, sl); g.ellipse(cx - 6, N * 0.5 + b, 3, 1, moss); g.ellipse(cx + 7, N * 0.66 + b, 2, 1, moss);   // 胴（大きな岩）
    var ry = N * 0.56 + b; g.line(cx - 4, ry - 3, cx + 4, ry - 3, c.accent); g.line(cx, ry - 6, cx, ry + 3, c.accent); g.line(cx - 3, ry + 1, cx + 3, ry + 1, c.accent); g.disc(cx, ry - 1, 1, '#ffffff');   // 胸の光る紋
    g.blob(cx, N * 0.24 + b, 6, 5, st, sd, sl); g.rect(cx - 4, N * 0.24 + b, 8, 1, '#1a1a22'); g.px(cx - 2, N * 0.24 + b, c.eye); g.px(cx + 2, N * 0.24 + b, c.eye); g.ellipse(cx + 2, N * 0.16 + b, 2, 1, moss);   // 頭・目の切れ込み
    for (var s = -1; s <= 1; s += 2) { var ax = cx + s * 15; g.blob(ax, N * 0.42 + b, 4, 3, st, sd, sl); g.blob(ax + s, N * 0.56 + b, 3, 3, st, sd, sl); g.blob(ax + s * 2, N * 0.72 + b, 5, 4, st, sd, sl); g.px(ax + s * 2, N * 0.72 + b, sd); }   // 腕（石を重ねた）・拳
  });
  // インプ：小鬼
  R('impish76', function (g, N, o) { var c = o.c, cx = N / 2, b = bob(o, 2), cy = N * 0.42 + b; g.shadow(cx, N - 3, N * 0.24);
    var wing = '#5a1a2a'; for (var s = -1; s <= 1; s += 2) { g.tri(cx + s * 4, cy + 4, cx + s * 17, cy - 8, cx + s * 15, cy + 8, wing); g.line(cx + s * 4, cy + 4, cx + s * 17, cy - 8, '#3a0a1a'); g.px(cx + s * 13, cy + 7, wing); g.px(cx + s * 10, cy + 7, '#3a0a1a'); }   // こうもりの翼
    g.line(cx + 3, cy + 12, cx + 11, cy + 16, c.dark, 1); g.line(cx + 11, cy + 16, cx + 14, cy + 12, c.dark, 1); g.tri(cx + 13, cy + 9, cx + 16, cy + 12, cx + 12, cy + 13, c.dark);   // 尾（矢じり）
    g.blob(cx, cy + 9, 5, 5, c.base, c.dark, c.light); g.rect(cx - 4, cy + 13, 2, 4, c.dark); g.rect(cx + 2, cy + 13, 2, 4, c.dark);   // 体・脚
    g.blob(cx, cy, 8, 7, c.base, c.dark, c.light);   // 大きな頭
    g.tri(cx - 7, cy - 4, cx - 4, cy - 6, cx - 9, cy - 13, c.accent); g.tri(cx + 7, cy - 4, cx + 4, cy - 6, cx + 9, cy - 13, c.accent);   // 角
    g.tri(cx - 8, cy - 1, cx - 13, cy - 4, cx - 8, cy + 2, c.base); g.tri(cx + 8, cy - 1, cx + 13, cy - 4, cx + 8, cy + 2, c.base);   // とがった耳
    g.rect(cx - 5, cy - 2, 3, 2, c.eye); g.rect(cx + 2, cy - 2, 3, 2, c.eye); g.px(cx - 4, cy - 2, '#1a0a0a'); g.px(cx + 3, cy - 2, '#1a0a0a');   // 目
    g.line(cx - 4, cy + 3, cx + 4, cy + 3, '#2a0a0a'); g.px(cx - 4, cy + 2, '#2a0a0a'); g.px(cx + 4, cy + 2, '#2a0a0a'); g.px(cx - 2, cy + 4, '#ffffff'); g.px(cx + 2, cy + 4, '#ffffff');   // にやり顔・牙
    var fx = cx - 9; g.line(fx, cy - 6, fx, N - 4, '#5a3a2a'); g.rect(fx - 2, cy - 8, 5, 1, '#9a9aaa'); g.rect(fx - 2, cy - 11, 1, 3, '#9a9aaa'); g.rect(fx, cy - 12, 1, 4, '#9a9aaa'); g.rect(fx + 2, cy - 11, 1, 3, '#9a9aaa'); g.disc(fx + 1, cy + 7, 1, c.base);   // 三つ叉・手
  });
  // ポイズンビートル：カブトムシ
  R('beetle76', function (g, N, o) { var c = o.c, cx = N / 2, cy = N * 0.58 + bob(o, 1); g.shadow(cx, N - 3, N * 0.36);
    for (var l = 0; l < 3; l++) for (var s = -1; s <= 1; s += 2) { var ly = cy - 1 + l * 4; g.line(cx + s * 9, ly, cx + s * 15, ly + 3, '#2a1a3a'); g.line(cx + s * 15, ly + 3, cx + s * 16, ly + 8, '#2a1a3a'); }   // 6本の脚
    g.blob(cx, cy + 1, 12, 9, c.base, c.dark, c.light); g.line(cx, cy - 7, cx, cy + 9, c.dark);   // 甲羅（左右に割れる線）
    g.disc(cx - 5, cy + 1, 2, c.accent); g.disc(cx + 5, cy + 1, 2, c.accent); g.rect(cx - 6, cy + 4, 3, 1, c.accent); g.rect(cx + 4, cy + 4, 3, 1, c.accent); g.px(cx - 5, cy + 1, '#1a1a1a'); g.px(cx + 5, cy + 1, '#1a1a1a');   // 毒の模様（どくろ）
    g.ellipse(cx - 6, cy - 4, 2, 1, '#ffffff');   // つや
    g.blob(cx, cy - 10, 6, 4, c.dark, '#1a0a2a', c.base); g.px(cx - 3, cy - 10, c.eye); g.px(cx + 3, cy - 10, c.eye);   // 頭・目
    g.line(cx, cy - 12, cx - 1, cy - 20, c.dark, 2); g.line(cx - 1, cy - 20, cx + 3, cy - 24, c.dark, 2); g.line(cx + 1, cy - 19, cx + 4, cy - 19, c.dark);   // 大きな角
    g.line(cx - 3, cy - 13, cx - 8, cy - 18, '#2a1a3a'); g.line(cx + 3, cy - 13, cx + 8, cy - 18, '#2a1a3a');   // 触角
    var dp = (o.phase || 0) % 4; for (var d = 0; d < 3; d++) { var dx = cx - 8 + d * 8, dy = cy + 9 + ((d + dp) % 3) * 2; g.rect(dx, dy, 1, 2, c.accent); g.px(dx, dy + 2, c.accent); }   // したたる毒
  });
  // 恐怖の影：頭巾の亡霊
  R('dread76', function (g, N, o) { var c = o.c, cx = N / 2, b = bob(o, 2), top = 5 + b;
    g.ellipse(cx, N - 3, 9, 2, 'rgba(60,40,120,0.35)');   // 足もとの影
    var robe = c.base, robeD = '#0a0a1a', robeL = '#2a2a52';
    g.tri(cx, top, cx - 13, N - 6, cx + 13, N - 6, robe); g.tri(cx, top + 2, cx - 9, N - 8, cx - 3, N - 8, robeL);   // 衣
    for (var z = 0; z < 7; z++) g.tri(cx - 13 + z * 4, N - 6, cx - 11 + z * 4, N - 2 - (z % 2) * 2, cx - 9 + z * 4, N - 6, robe);   // 破れた裾
    g.disc(cx, top + 6, 6, robe); g.disc(cx, top + 7, 4, robeD); g.rect(cx - 3, top + 6, 2, 1, c.eye); g.rect(cx + 1, top + 6, 2, 1, c.eye);   // 頭巾・光る目
    for (var s = -1; s <= 1; s += 2) { g.line(cx + s * 6, top + 13, cx + s * 15, top + 17, robe, 2); for (var f = 0; f < 3; f++) g.line(cx + s * 15, top + 17, cx + s * (17 + f), top + 15 + f * 2, '#c8c8e8'); }   // 伸びる手・爪
    var px0 = cx - 6, py0 = top + 15; var cs = [[0, 0, 6], [3, 2, 5], [6, 5, 6], [9, 8, 4]]; cs.forEach(function (k, i) { g.rect(px0 + k[0], py0 + k[1], 2, k[2], '#e04a4a'); g.px(px0 + k[0] + 1, py0 + k[1] - 1, '#e04a4a'); });   // 胸の中で下がっていくローソク足
    g.line(px0 - 1, py0 - 2, px0 + 12, py0 + 11, c.accent);   // 下がる線
    for (var w = 0; w < 4; w++) g.px(cx - 12 + w * 8, top + 4 + ((w + (o.phase || 0)) % 3) * 3, c.accent);   // 漂う光
  });
})(typeof window !== 'undefined' ? window : globalThis);
