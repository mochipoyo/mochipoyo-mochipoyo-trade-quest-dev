/* =========================================================
   UI / VehicleArt (v5.0) : 乗り物の2D描画（ロジックは js/rpg/vehicle.js）。コード生成の簡易ドット絵
   ========================================================= */
(function (root) {
  'use strict';
  var cache = {};
  function boat(id, dir) {
    var key = id + ':' + dir; if (cache[key]) return cache[key];
    var S = 2, c = document.createElement('canvas'); c.width = 16 * S; c.height = 20 * S; var g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    function px(x, y, col, w, h) { g.fillStyle = col; g.fillRect(x * S, y * S, (w || 1) * S, (h || 1) * S); }
    var big = id === 'galleon'; var hull = id === 'airship' ? '#8a6a3a' : '#7a4a22', hull2 = id === 'airship' ? '#c9a06a' : '#a0683a';
    // 船体（横向きの舟。up/down は正面・背面の簡略）
    if (dir === 'left' || dir === 'right') {
      px(2, 13, hull, 12, 3); px(3, 16, hull2, 10, 1); px(1, 12, hull2, 14, 1); px(2, 12, '#e8d8b0', 2, 1); px(12, 12, '#e8d8b0', 2, 1);
      px(8, 4, '#4a3a2a', 1, 9);   // マスト
      if (dir === 'right') { px(9, 5, '#f4f0e6', 5, 6); px(9, 5, '#d8d0c0', 1, 6); px(13, 7, '#c9a24a', 1, 2); } else { px(2, 5, '#f4f0e6', 5, 6); px(6, 5, '#d8d0c0', 1, 6); px(2, 7, '#c9a24a', 1, 2); }
      px(8, 3, '#c9302a', 3, 1);   // 旗
    } else {
      px(4, 12, hull, 8, 4); px(5, 16, hull2, 6, 1); px(3, 11, hull2, 10, 1); px(6, 11, '#e8d8b0', 4, 1);
      px(7, 3, '#4a3a2a', 2, 9);
      px(4, 5, '#f4f0e6', 8, 5); px(4, 9, '#d8d0c0', 8, 1); if (dir === 'up') px(6, 6, '#c9a24a', 4, 1);
      px(7, 2, '#c9302a', 3, 1);
    }
    if (big) { px(2, 12, '#ffd24a', 1, 1); px(13, 12, '#ffd24a', 1, 1); }
    cache[key] = c; return c;
  }
  var VehicleArt = {};
  VehicleArt.draw = function (ctx, id, dir, px, py, moving) {
    var img = boat(id, dir); var bob = Math.round(Math.sin(root.Engine.frame / 9) * 1.5);
    // 水面の揺れ・影
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 30, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.imageSmoothingEnabled = false; ctx.drawImage(img, px, py - 8 + bob);
    if (moving) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(px + 2, py + 28 + bob, 5, 1); ctx.fillRect(px + 25, py + 29 + bob, 5, 1); }
  };
  VehicleArt.image = function (id) { return boat(id, 'right'); };
  root.VehicleArt = VehicleArt;
})(typeof window !== 'undefined' ? window : globalThis);
