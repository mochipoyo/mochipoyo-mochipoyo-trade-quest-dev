/* =========================================================
   Core / space76（v7.6）：異空間（ゼロメア）のフィールドの周りを「宇宙空間」として描く（2D）
   ・マップの定義 def.space76 が true のとき、水のマス（water・deep・shallow）を星空のタイルで描き、
     岸の白波の代わりに「島のふち」（上が陸なら岩肌が下へ落ちる・横は青白い光の縁）を描く
   ・マップのタイル（データ）は変えない＝通れない・乗り物・宝箱・セーブは今までと同じ。ミニマップも暗い色で塗る
   ・3D 版は three-src/src/environment/Space76.js（空と水面に同じ星空）
   ========================================================= */
(function (root) {
  'use strict';
  var Tiles = root.Tiles; if (!Tiles) return;
  var STAR = ['#ffffff', '#cfe0ff', '#ffe6c8', '#d8c8ff'];
  // 星空のタイル（4種類・2フレーム：星がまたたく）
  Tiles.defs.space76 = { name: 'space76', solid: true, anim: true, variants: 4, paint: function (g, v, f) {
    g.fill('#070818'); g.speckle(10, ['#0b0c22', '#0e0a26', '#080a1e']);
    if (v === 1) g.speckle(22, ['rgba(80,36,130,0.32)', 'rgba(60,30,110,0.26)', 'rgba(100,50,150,0.2)']);   // 星雲（紫）
    if (v === 3) g.speckle(18, ['rgba(30,80,140,0.28)', 'rgba(40,60,130,0.22)']);   // 星雲（青）
    for (var i = 0; i < 3; i++) { var x = Math.floor(g.rnd() * 16), y = Math.floor(g.rnd() * 16); g.px(x, y, (f + i) % 2 ? STAR[i % 4] : 'rgba(200,210,255,0.45)'); }
    if (g.rnd() < 0.5) { var bx = 2 + Math.floor(g.rnd() * 12), by = 2 + Math.floor(g.rnd() * 12); var c = STAR[Math.floor(g.rnd() * 4)]; g.px(bx, by, c); if (!f) { g.px(bx - 1, by, 'rgba(220,230,255,0.5)'); g.px(bx + 1, by, 'rgba(220,230,255,0.5)'); g.px(bx, by - 1, 'rgba(220,230,255,0.5)'); g.px(bx, by + 1, 'rgba(220,230,255,0.5)'); } }
  } };
  var cache = {};
  // 島のふち：mask 1=上が陸 2=右 4=下 8=左
  function rim(mask) {
    if (cache[mask]) return cache[mask];
    var ts = root.Engine.TS; var c = document.createElement('canvas'); c.width = ts; c.height = ts; var g = Tiles.painter(c.getContext('2d'), mask * 977 + 5);
    var glow = 'rgba(110,170,255,0.75)', glow2 = 'rgba(150,110,255,0.35)';
    if (mask & 1) {   // 上が陸：岩肌が下へ落ちる（浮かぶ島の側面）
      g.rect(0, 0, 16, 4, '#4a4058'); g.rect(0, 4, 16, 2, '#3a3248'); g.rect(0, 6, 16, 1, 'rgba(40,34,60,0.6)');
      for (var x = 0; x < 16; x += 3) { var d = 6 + Math.floor(g.rnd() * 5); g.rect(x, 6, 2, d - 6, 'rgba(46,40,64,0.75)'); g.px(x, d, 'rgba(46,40,64,0.4)'); }
      g.hline(0, 0, 16, '#6a5e7a'); g.speckle(6, ['#5a4e6a', '#2e2840'], 0, 1, 15, 5);
    }
    if (mask & 4) { g.hline(0, 15, 16, glow); g.hline(0, 14, 16, glow2); }
    if (mask & 8) { g.vline(0, 0, 16, glow); g.vline(1, 0, 16, glow2); }
    if (mask & 2) { g.vline(15, 0, 16, glow); g.vline(14, 0, 16, glow2); }
    cache[mask] = c; return c;
  }
  root.Space76 = { on: function (map) { return !!(map && map.def && map.def.space76); }, rim: rim, color: function (t) { return t === 'deep' ? '#05061a' : t === 'shallow' ? '#14123a' : '#0a0a24'; } };
})(typeof window !== 'undefined' ? window : globalThis);
