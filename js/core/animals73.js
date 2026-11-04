/* =========================================================
   Core / v7.3 動物の絵（2D）：犬・猫・にわとり・牛・羊・豚・馬・らくだ
   ・町や城を歩く動物（NPC の sprite が 'animal_種類' または 'animal_種類_色'）を、16×16 のドット絵で描く（オリジナルの絵）
   ・向き：下（正面）・上（背中）・右（横。左は左右反転）、それぞれ足を動かす2コマ
   ・js/core/map.js の drawChar から呼ぶ（人と同じく足元に影）。3D は three-src/src/entities/Animal3D.js
   ========================================================= */
(function (root) {
  'use strict';
  var EYE = '#1b1b2a';
  // 色：B 体・L 明るい所（胸・口元）・D 濃い所（耳・足・模様）
  var COLORS = {
    dog: { B: '#a0683a', L: '#ecd0a8', D: '#5a3a1e', N: '#1b1b1b' },
    dog_w: { B: '#f2ebe0', L: '#ffffff', D: '#c89a68', N: '#1b1b1b' },
    dog_k: { B: '#34302e', L: '#c8a070', D: '#1a1616', N: '#0a0a0a' },
    dog_s: { B: '#d89048', L: '#fff4e4', D: '#b06a2a', N: '#1b1b1b' },
    cat: { B: '#e8963a', L: '#fbe2bc', D: '#b0601e', N: '#e87a8a', E: '#3a8a3a' },
    cat_k: { B: '#2a2834', L: '#3e3c4a', D: '#141218', N: '#c86a7a', E: '#e8d040' },
    cat_g: { B: '#9a9aa8', L: '#e4e4ec', D: '#5a5a68', N: '#e88a9a', E: '#4a8ad8' },
    cat_w: { B: '#f4f0ea', L: '#ffffff', D: '#d0c8bc', N: '#f0a0b0', E: '#d8a030' },
    chicken: { B: '#f4f0e6', L: '#ffffff', D: '#c8c0b0', R: '#e03a2a', Y: '#f0b830' },
    chicken_b: { B: '#a8642e', L: '#d89858', D: '#6a3a18', R: '#e03a2a', Y: '#f0b830' },
    cow: { B: '#f4f0e8', L: '#f0b8bc', D: '#2a2626', N: '#d88890' },
    cow_b: { B: '#8a5230', L: '#e8b8a8', D: '#5a3018', N: '#c87878' },
    sheep: { B: '#f0ece0', L: '#ffffff', D: '#d4ccb8', F: '#2e2a26' },
    sheep_k: { B: '#4a4440', L: '#6a625a', D: '#38322e', F: '#1a1614' },
    pig: { B: '#f0a8b0', L: '#f8c8cc', D: '#c87080', N: '#a85060' },
    horse: { B: '#8a5430', L: '#c89870', D: '#3a2414', N: '#2a1a10' },
    horse_w: { B: '#ece8e0', L: '#ffffff', D: '#a8a090', N: '#6a6058' },
    horse_k: { B: '#2e2622', L: '#5a4a40', D: '#141010', N: '#0a0808' },
    camel: { B: '#d8b070', L: '#ecd0a0', D: '#a07840', N: '#6a4a28' }
  };
  var NAMES = { dog: '犬', cat: '猫', chicken: 'にわとり', cow: '牛', sheep: '羊', pig: '豚', horse: '馬', camel: 'らくだ' };
  // 小さい動物はマスの中に、大きい動物（牛・馬・らくだ）は人と同じく少し上にはみ出して描く
  var BIG = { cow: 1, horse: 1, camel: 1 };

  function parse(sprite) {
    var m = /^animal_([a-z]+)(?:_([a-z]))?$/.exec(sprite || ''); if (!m || !NAMES[m[1]]) return null;
    var key = m[1] + (m[2] ? '_' + m[2] : ''); return { kind: m[1], key: COLORS[key] ? key : m[1], pal: COLORS[key] || COLORS[m[1]] };
  }

  // ---- 描く（16×16 の格子。R(x,y,w,h,色)） ----
  function sideOf(kind, f, R, P, px) {
    // 足：xs＝[後ろ足（奥）, 後ろ足（手前）, 前足（奥）, 前足（手前）]。2コマ目は外の足を開き、内の足を少し上げる
    var lg = function (xs, y, len) { xs.forEach(function (x, i) { var dx = f ? (i === 0 ? -1 : i === 3 ? 1 : 0) : 0; var lift = f && (i === 1 || i === 2) ? 1 : 0; R(x + dx, y, 1, len - lift, i % 2 ? P.B : P.D); }); };
    switch (kind) {
      case 'dog':
        lg([5, 6, 10, 11], 12, 3);
        R(4, 8, 8, 4, P.B); R(5, 11, 6, 1, P.L); R(11, 5, 4, 4, P.B); R(14, 7, 2, 2, P.L); px(15, 7, P.N); px(13, 6, EYE); R(11, 4, 2, 3, P.D);
        if (f) { R(2, 6, 2, 1, P.B); R(3, 7, 1, 1, P.B); } else { R(2, 5, 1, 2, P.B); R(3, 7, 1, 1, P.B); }
        break;
      case 'cat':
        lg([6, 7, 10, 11], 12, 3);
        R(5, 9, 7, 3, P.B); R(6, 11, 5, 1, P.L); R(11, 6, 4, 4, P.B); R(13, 8, 2, 1, P.L); px(11, 5, P.B); px(14, 5, P.B); px(11, 4, P.D); px(14, 4, P.D); px(13, 7, P.E || EYE); px(15, 8, P.N);
        R(7, 9, 1, 2, P.D); R(9, 9, 1, 2, P.D);   // しま
        if (f) { R(3, 4, 1, 6, P.B); R(4, 9, 1, 1, P.B); px(2, 4, P.D); } else { R(4, 5, 1, 5, P.B); px(3, 4, P.B); px(3, 3, P.D); }
        break;
      case 'chicken':
        R(7 + (f ? -1 : 0), 12, 1, 2, P.Y); R(9 + (f ? 1 : 0), 12, 1, 2, P.Y); R(6 + (f ? -1 : 0), 14, 2, 1, P.Y); R(9 + (f ? 1 : 0), 14, 2, 1, P.Y);
        R(5, 8, 6, 4, P.B); R(3, 6, 3, 3, P.D); R(4, 5, 1, 1, P.D); R(10, 5, 3, 4, P.B); R(10, 4, 2, 1, P.R); px(11, 3, P.R); px(13, 6, P.Y); px(12, 8, P.R); px(11, 6, EYE); R(6, 9, 3, 2, P.D);
        break;
      case 'cow':
        lg([3, 5, 10, 12], 11, 4);
        R(2, 6, 11, 5, P.B); R(12, 4, 4, 4, P.B); R(14, 6, 2, 2, P.L); px(15, 6, P.N); px(13, 5, EYE); px(11, 5, P.D); px(12, 3, '#e8e0c8'); px(14, 3, '#e8e0c8');
        R(4, 7, 2, 2, P.D); R(8, 8, 2, 2, P.D); R(10, 6, 1, 2, P.D); R(6, 11, 2, 1, P.L); R(1, 6, 1, 4, P.D); px(1, 10, P.D);
        break;
      case 'sheep':
        lg([4, 6, 9, 11], 11, 4);
        R(3, 6, 9, 5, P.B); R(4, 5, 2, 1, P.B); R(7, 5, 2, 1, P.B); R(10, 5, 1, 1, P.B); R(4, 10, 7, 1, P.D); R(12, 6, 3, 3, P.F); px(11, 6, P.F); px(13, 7, '#f0f0f0'); R(2, 7, 1, 2, P.B);
        break;
      case 'pig':
        lg([4, 6, 10, 12], 12, 2);
        R(3, 8, 10, 4, P.B); R(4, 11, 8, 1, P.L); R(12, 7, 3, 4, P.B); R(15, 9, 1, 2, P.N); R(12, 6, 2, 1, P.D); px(13, 8, EYE); px(2, 8, P.D); px(1, 9, P.D); px(2, 10, P.D);
        break;
      case 'horse':
        lg([4, 5, 10, 11], 10, 5);
        R(3, 6, 9, 4, P.B); R(11, 3, 2, 4, P.B); R(12, 1, 3, 3, P.B); R(15, 2, 1, 2, P.L); px(15, 3, P.N); px(13, 2, EYE); px(12, 0, P.D); R(10, 1, 2, 5, P.D); R(1, 6, 2, 1, P.D); R(1, 7, 1, 5 - (f ? 1 : 0), P.D); R(4, 9, 7, 1, P.L);
        break;
      case 'camel':
        lg([3, 5, 9, 11], 10, 5);
        R(2, 6, 10, 4, P.B); R(5, 4, 4, 2, P.B); R(6, 3, 2, 1, P.B); R(11, 5, 2, 2, P.B); R(12, 2, 2, 4, P.B); R(13, 1, 3, 2, P.B); px(15, 2, P.N); px(14, 1, EYE); R(3, 9, 8, 1, P.D); px(1, 7, P.D); px(1, 8, P.D);
        break;
    }
  }
  function frontOf(kind, f, back, R, P, px) {
    var legs = function (xs, y, len) { xs.forEach(function (x, i) { R(x, y, 1, len - ((f ? i % 2 === 0 : i % 2 === 1) && xs.length <= 2 ? 1 : (f && i % 2 === 0 ? 1 : 0)), P.D); }); };   // 2コマ目は足を交互に上げる
    switch (kind) {
      case 'dog':
        legs([6, 9], 13, 2); R(5, 8, 6, 5, P.B); if (!back) R(6, 9, 4, 3, P.L);
        R(5, 3, 6, 5, P.B); R(4, 3, 2, 3, P.D); R(10, 3, 2, 3, P.D);
        if (back) { R(7, 7, 2, 1, P.D); R(7, 9 - (f ? 1 : 0), 2, 2, P.B); px(7, 8 - (f ? 1 : 0), P.L); } else { px(6, 5, EYE); px(9, 5, EYE); R(7, 6, 2, 2, P.L); R(7, 6, 2, 1, P.N); }
        break;
      case 'cat':
        legs([6, 9], 13, 2); R(5, 9, 6, 4, P.B); if (!back) R(6, 10, 4, 2, P.L);
        R(5, 5, 6, 4, P.B); px(5, 4, P.B); px(10, 4, P.B); px(5, 3, P.D); px(10, 3, P.D);
        if (back) { R(7, 6, 2, 1, P.D); R(10, 7 + (f ? 1 : 0), 1, 5, P.B); px(11, 6 + (f ? 1 : 0), P.D); } else { px(6, 6, P.E || EYE); px(9, 6, P.E || EYE); R(7, 7, 2, 1, P.L); px(7, 7, P.N); px(8, 7, P.N); }
        break;
      case 'chicken':
        R(7, 13, 1, 2 - (f ? 1 : 0), P.Y); R(8, 13, 1, 2 - (f ? 0 : 1), P.Y);
        R(5, 7, 6, 6, P.B); R(4, 8, 1, 3, P.D); R(11, 8, 1, 3, P.D); R(6, 3, 4, 4, P.B); R(7, 2, 2, 1, P.R); px(7, 1, P.R);
        if (back) { R(6, 6, 4, 3, P.D); R(7, 5, 2, 1, P.D); } else { px(6, 4, EYE); px(9, 4, EYE); R(7, 5, 2, 1, P.Y); R(7, 6, 2, 1, P.R); }
        break;
      case 'cow':
        legs([4, 6, 9, 11], 12, 3); R(3, 6, 10, 6, P.B); R(4, 8, 2, 2, P.D); R(10, 7, 2, 2, P.D);
        if (back) { R(5, 3, 6, 4, P.B); R(7, 4, 2, 1, P.D); R(7, 9, 2, 3 + (f ? 0 : 1), P.D); px(4, 2, '#e8e0c8'); px(11, 2, '#e8e0c8'); }
        else { R(5, 3, 6, 6, P.B); R(6, 7, 4, 2, P.L); px(6, 8, P.N); px(9, 8, P.N); px(6, 5, EYE); px(9, 5, EYE); R(3, 4, 2, 1, P.D); R(11, 4, 2, 1, P.D); px(4, 2, '#e8e0c8'); px(11, 2, '#e8e0c8'); R(7, 3, 2, 1, P.D); }
        break;
      case 'sheep':
        legs([5, 10], 12, 3); R(3, 6, 10, 6, P.B); R(4, 5, 8, 1, P.B); R(3, 11, 10, 1, P.D);
        if (back) { R(6, 3, 4, 3, P.B); R(7, 9, 2, 2, P.L); } else { R(6, 4, 4, 5, P.F); R(4, 5, 2, 1, P.F); R(10, 5, 2, 1, P.F); px(6, 6, '#f0f0f0'); px(9, 6, '#f0f0f0'); R(6, 3, 4, 1, P.B); }
        break;
      case 'pig':
        legs([5, 10], 13, 2); R(3, 7, 10, 6, P.B); R(4, 11, 8, 1, P.L);
        if (back) { R(5, 5, 6, 3, P.B); px(7, 8, P.D); px(8, 9, P.D); px(7, 10, P.D); } else { R(5, 5, 6, 5, P.B); R(6, 8, 4, 2, P.N); px(7, 9, P.D); px(8, 9, P.D); px(6, 6, EYE); px(9, 6, EYE); R(5, 4, 2, 2, P.D); R(9, 4, 2, 2, P.D); }
        break;
      case 'horse':
        legs([5, 6, 9, 10], 11, 4); R(5, 6, 6, 5, P.B);
        if (back) { R(6, 1, 4, 5, P.B); R(7, 1, 2, 5, P.D); R(7, 8, 2, 5 - (f ? 1 : 0), P.D); px(6, 0, P.D); px(9, 0, P.D); }
        else { R(6, 1, 4, 6, P.B); R(6, 5, 4, 2, P.L); px(7, 6, P.N); px(8, 6, P.N); px(6, 3, EYE); px(9, 3, EYE); px(6, 0, P.D); px(9, 0, P.D); R(7, 1, 2, 1, P.D); }
        break;
      case 'camel':
        legs([4, 6, 9, 11], 11, 4); R(4, 7, 8, 4, P.B); R(6, 5, 4, 2, P.B);
        if (back) { R(6, 1, 4, 4, P.B); px(7, 10, P.D); px(8, 10, P.D); } else { R(6, 1, 4, 5, P.B); R(6, 4, 4, 2, P.L); px(7, 5, P.N); px(8, 5, P.N); px(6, 2, EYE); px(9, 2, EYE); px(6, 0, P.D); px(9, 0, P.D); }
        break;
    }
  }

  var cache = {};
  var AnimalArt = {
    COLORS: COLORS, NAMES: NAMES, KINDS: Object.keys(NAMES), parse: parse,
    has: function (sprite) { return !!parse(sprite); },
    isBig: function (sprite) { var p = parse(sprite); return !!(p && BIG[p.kind]); },
    nameOf: function (sprite) { var p = parse(sprite); return p ? NAMES[p.kind] : ''; },
    // 16×16 の格子に描いた結果（テスト用にも使う）：[[x,y,色],…]
    pixels: function (sprite, dir, frame) {
      var p = parse(sprite); if (!p) return []; var out = [];
      var R = function (x, y, w, h, c) { if (!c) return; for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) if (xx >= 0 && yy >= 0 && xx < 16 && yy < 16) out.push([xx, yy, c]); };
      var px = function (x, y, c) { R(x, y, 1, 1, c); };
      var f = frame ? 1 : 0;
      if (dir === 'left' || dir === 'right') sideOf(p.kind, f, R, p.pal, px); else frontOf(p.kind, f, dir === 'up', R, p.pal, px);
      if (dir === 'left') out = out.map(function (q) { return [15 - q[0], q[1], q[2]]; });
      return out;
    },
    frame: function (sprite, dir, frame) {
      var k = sprite + ':' + dir + ':' + (frame ? 1 : 0); if (cache[k]) return cache[k];
      var S = (root.Engine && root.Engine.SCALE) || 2; var c = document.createElement('canvas'); c.width = 16 * S; c.height = 16 * S;
      var g = c.getContext('2d'); if (g) AnimalArt.pixels(sprite, dir, frame).forEach(function (q) { g.fillStyle = q[2]; g.fillRect(q[0] * S, q[1] * S, S, S); });
      cache[k] = c; return c;
    }
  };
  root.AnimalArt = AnimalArt;
})(typeof window !== 'undefined' ? window : globalThis);
