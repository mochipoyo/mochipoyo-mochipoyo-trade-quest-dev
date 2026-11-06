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
    var big = id === 'galleon'; var hull = id === 'airship' ? '#8a6a3a' : big ? '#4a2a14' : '#7a4a22', hull2 = id === 'airship' ? '#c9a06a' : big ? '#7a4a22' : '#a0683a';
    if (id === 'airship') {   // v5.4 飛空艇：気嚢（ふくらみ）＋ゴンドラ＋プロペラ
      px(2, 2, '#c9a24a', 12, 6); px(1, 3, '#c9a24a', 14, 4); px(3, 2, '#e8d090', 9, 1); px(2, 7, '#8a6a2a', 12, 1); px(5, 4, '#7a1a1a', 6, 1);
      px(4, 8, '#5a4a3a', 1, 3); px(11, 8, '#5a4a3a', 1, 3);
      px(3, 11, '#7a4a22', 10, 3); px(4, 14, '#a0683a', 8, 1); px(4, 12, '#9fe0ff', 1, 1); px(7, 12, '#9fe0ff', 1, 1); px(10, 12, '#9fe0ff', 1, 1);
      if (dir === 'left') { px(14, 11, '#d0d0d8', 1, 3); px(15, 10, '#8a8a9a', 1, 5); } else if (dir === 'right') { px(1, 11, '#d0d0d8', 1, 3); px(0, 10, '#8a8a9a', 1, 5); } else { px(7, 15, '#8a8a9a', 2, 1); }
      cache[key] = c; return c;
    }
    if (big) {   // v5.2 遠洋航海船：大きく濃い船体・2本マスト・3枚の帆
      if (dir === 'left' || dir === 'right') {
        px(1, 12, hull, 14, 5); px(2, 17, hull2, 12, 1); px(0, 11, hull2, 16, 1); px(1, 11, '#e8d8b0', 3, 1); px(12, 11, '#e8d8b0', 3, 1); px(3, 14, '#ffd24a', 1, 1); px(6, 14, '#ffd24a', 1, 1); px(9, 14, '#ffd24a', 1, 1); px(12, 14, '#ffd24a', 1, 1);
        px(5, 2, '#3a2a1a', 1, 10); px(10, 1, '#3a2a1a', 1, 11);
        if (dir === 'right') { px(6, 3, '#f4f0e6', 4, 5); px(11, 2, '#f4f0e6', 4, 6); px(6, 8, '#d8d0c0', 4, 1); px(11, 8, '#d8d0c0', 4, 1); px(14, 4, '#1f4f9a', 1, 2); } else { px(1, 3, '#f4f0e6', 4, 5); px(6, 2, '#f4f0e6', 4, 6); px(1, 8, '#d8d0c0', 4, 1); px(6, 8, '#d8d0c0', 4, 1); px(1, 4, '#1f4f9a', 1, 2); }
        px(10, 0, '#1f4f9a', 3, 1); px(5, 1, '#c9302a', 3, 1);
      } else {
        px(3, 11, hull, 10, 6); px(4, 17, hull2, 8, 1); px(2, 10, hull2, 12, 1); px(5, 10, '#e8d8b0', 6, 1); px(4, 13, '#ffd24a', 1, 1); px(11, 13, '#ffd24a', 1, 1);
        px(7, 1, '#3a2a1a', 2, 10); px(3, 3, '#f4f0e6', 10, 6); px(3, 8, '#d8d0c0', 10, 1); if (dir === 'up') px(5, 4, '#1f4f9a', 6, 1);
        px(7, 0, '#1f4f9a', 3, 1);
      }
      cache[key] = c; return c;
    }
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
  // v7.9 馬車（馬と幌馬車）。横向きは 24×20 ドット（ほかの乗り物より横に長い）、上下は 16×20。frame：脚の動き（0/1）
  function carriage(dir, frame) {
    var key = 'carriage:' + dir + ':' + frame; if (cache[key]) return cache[key];
    var side = dir === 'left' || dir === 'right'; var S = 2, c = document.createElement('canvas'); c.width = (side ? 24 : 16) * S; c.height = 20 * S; var g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    var flip = dir === 'left'; var Wd = side ? 24 : 16;
    function px(x, y, col, w, h) { w = w || 1; h = h || 1; g.fillStyle = col; g.fillRect((flip ? Wd - x - w : x) * S, y * S, w * S, h * S); }
    var wood = '#8a5a2e', wood2 = '#5e3a1c', cloth = '#f2ead6', cloth2 = '#d6c8a6', horse = '#8a5428', horse2 = '#5e3418', mane = '#2e1c10', wheel = '#3a2a1a', hub = '#c9a24a';
    if (side) {   // 右向き：右に馬、左に幌馬車
      px(1, 3, cloth2, 11, 1); px(0, 4, cloth, 13, 6); px(1, 3, cloth, 11, 1); px(2, 2, cloth, 9, 1); px(3, 5, cloth2, 1, 5); px(7, 5, cloth2, 1, 5); px(11, 5, cloth2, 1, 5);   // 幌（布の張り骨）
      px(0, 10, wood, 13, 3); px(0, 12, wood2, 13, 1); px(12, 11, wood2, 4, 1);   // 荷台・長柄
      px(1, 13, wheel, 4, 4); px(2, 14, hub, 2, 2); px(8, 13, wheel, 4, 4); px(9, 14, hub, 2, 2);   // 車輪
      px(13, 8, '#3a5aa8', 2, 3); px(13, 7, '#f0c8a0', 2, 1);   // 御者台の主人公（小さく）
      px(15, 9, horse, 6, 4); px(20, 6, horse, 2, 4); px(21, 5, horse, 3, 2); px(23, 6, horse2, 1, 1); px(19, 6, mane, 2, 3); px(15, 9, horse2, 1, 2);   // 馬の胴・首・頭・たてがみ・尾
      var a = frame ? 1 : 0; px(15 + a, 13, horse2, 1, 4); px(17 - a, 13, horse2, 1, 4); px(19 + a, 13, horse2, 1, 4); px(20 - a, 13, horse2, 1, 4); px(14, 10, mane, 1, 3);
    } else if (dir === 'down') {   // こちら向き：手前に馬の正面、奥に幌
      px(2, 1, cloth2, 12, 1); px(1, 2, cloth, 14, 7); px(3, 3, cloth2, 10, 4); px(4, 4, '#3a2a20', 8, 3); px(7, 5, '#3a5aa8', 2, 2); px(7, 4, '#f0c8a0', 2, 1);   // 幌の口と中の主人公
      px(1, 9, wood, 14, 2); px(0, 11, wheel, 2, 5); px(14, 11, wheel, 2, 5);
      px(6, 9, horse, 4, 6); px(6, 7, horse, 4, 3); px(7, 6, mane, 2, 2); px(6, 15, horse2, 1, 3 + (frame ? 0 : 1)); px(9, 15, horse2, 1, 3 + (frame ? 1 : 0)); px(7, 10, '#ffffff', 2, 1);
    } else {   // 向こう向き：手前に幌の後ろ、奥に馬
      px(6, 0, horse, 4, 3); px(7, 0, mane, 2, 2);
      px(2, 3, cloth2, 12, 1); px(1, 4, cloth, 14, 8); px(3, 6, cloth2, 10, 1); px(5, 8, '#3a2a20', 6, 3);
      px(1, 12, wood, 14, 3); px(1, 14, wood2, 14, 1); px(0, 13, wheel, 2, 5); px(14, 13, wheel, 2, 5); px(6, 12, '#c9302a', 4, 1);
    }
    cache[key] = c; return c;
  }
  var VehicleArt = {};
  VehicleArt.draw = function (ctx, id, dir, px, py, moving) {
    if (id === 'astra') { if (root.AstraView) root.AstraView.drawParked(ctx, dir, px, py); return; }   // v6.5 Phase E 星界航行船アストラ号
    if (id === 'carriage') { var fr = moving ? (Math.floor(root.Engine.frame / 6) % 2) : 0; var im = carriage(dir, fr); var side = dir === 'left' || dir === 'right'; ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 29, side ? 22 : 14, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.imageSmoothingEnabled = false; ctx.drawImage(im, px + 16 - im.width / 2, py - 8 + (moving && fr ? -1 : 0)); return; }   // v7.9 馬車
    var img = boat(id, dir); var bob = Math.round(Math.sin(root.Engine.frame / 9) * 1.5);
    if (id === 'airship') { var lift = moving !== undefined && root.State && root.State.data && root.State.data.aboard === 'airship' ? 14 : 4; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 28, 12, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.imageSmoothingEnabled = false; ctx.drawImage(img, px, py - 8 - lift + bob); return; }
    // 水面の揺れ・影
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 30, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.imageSmoothingEnabled = false; ctx.drawImage(img, px, py - 8 + bob);
    if (moving) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(px + 2, py + 28 + bob, 5, 1); ctx.fillRect(px + 25, py + 29 + bob, 5, 1); }
  };
  VehicleArt.image = function (id) { return id === 'carriage' ? carriage('right', 0) : boat(id, 'right'); };
  root.VehicleArt = VehicleArt;
})(typeof window !== 'undefined' ? window : globalThis);
