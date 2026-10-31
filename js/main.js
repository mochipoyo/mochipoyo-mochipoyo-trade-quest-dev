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
        var wrap = document.getElementById('stage'); var aspect = canvas.width / canvas.height;
        var pc = root.Sidebar && root.Sidebar.isPC(); document.body.classList.toggle('pc', !!pc);
        if (root.MobileUI && root.MobileUI.active && !pc) { root.MobileUI.fit(canvas); if (root.Minimap && root.Minimap.resize) root.Minimap.resize(); return; }   // v6.1 スマホ：ビューポート全面・縦横・セーフエリア（js/ui/mobile.js）
        var w = wrap.clientWidth;
        if (pc) w = Math.min(w, Math.round(canvas.width * 1.8));   // PC版：メイン画面は内部解像度の1.8倍（1152×749）まで
        var guide = document.getElementById('guide'); var guideH = pc && guide ? guide.offsetHeight + 12 : 0;
        var maxH = root.innerHeight - (root.innerWidth < 720 ? 170 : 40) - guideH;
        var h = Math.min(w / aspect, maxH); canvas.style.width = Math.round(h * aspect) + 'px'; canvas.style.height = Math.round(h) + 'px';
        var ui = document.getElementById('ui'); ui.style.width = canvas.style.width; ui.style.height = canvas.style.height;
        var ml = document.getElementById('minimap-layer'); if (ml) { ml.style.width = canvas.style.width; ml.style.height = canvas.style.height; }
        if (root.Minimap && root.Minimap.resize) root.Minimap.resize();
      }
      if (root.Minimap) root.Minimap.init();
      if (root.Sidebar) root.Sidebar.init();
      if (root.MobileUI) root.MobileUI.init();   // v6.1 スマホの操作パネル（タッチ → 共通の入力コマンド）
      root.addEventListener('resize', fit); fit();
      root.Engine.start();
      root.Title.show();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
