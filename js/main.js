/* =========================================================
   main : 起動
   ========================================================= */
(function (root) {
  'use strict';

  root.MochiQuest = {
    boot: function () {
      var canvas = document.getElementById('game');
      root.Engine.init(canvas);
      root.Win.init(document.getElementById('ui'));
      root.Engine.Input.bindPad(document.getElementById('pad'));
      root.Audio.init();
      if (root.Assets) root.Assets.preload();   // 新画像（assets/）を先読み。未読込・失敗時は従来描画にフォールバック
      // 画面サイズに合わせてキャンバスを拡大縮小（CSS）
      function fit() {
        var wrap = document.getElementById('stage'); var w = wrap.clientWidth; var aspect = canvas.width / canvas.height;
        var maxH = root.innerHeight - (root.innerWidth < 720 ? 170 : 40);
        var h = Math.min(w / aspect, maxH); canvas.style.width = Math.round(h * aspect) + 'px'; canvas.style.height = Math.round(h) + 'px';
        var ui = document.getElementById('ui'); ui.style.width = canvas.style.width; ui.style.height = canvas.style.height;
        var ml = document.getElementById('minimap-layer'); if (ml) { ml.style.width = canvas.style.width; ml.style.height = canvas.style.height; }
        if (root.Minimap && root.Minimap.resize) root.Minimap.resize();
      }
      if (root.Minimap) root.Minimap.init();
      root.addEventListener('resize', fit); fit();
      root.Engine.start();
      root.Title.show();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
