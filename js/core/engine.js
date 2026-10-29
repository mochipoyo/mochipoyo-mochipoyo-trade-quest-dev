/* =========================================================
   Core / Engine : ゲームループ・入力・シーン管理・キャンバス
   ========================================================= */
(function (root) {
  'use strict';

  var Engine = {
    TILE: 16,            // タイルの元サイズ（ドット）
    SCALE: 2,            // 画面上の拡大率
    VIEW_W: 20,          // 表示タイル数（横）
    VIEW_H: 13,          // 表示タイル数（縦）
    canvas: null, ctx: null, scenes: [], running: false, last: 0, frame: 0, fps: 0, _fpsAcc: 0, _fpsCount: 0,
    debug: false
  };
  Engine.TS = Engine.TILE * Engine.SCALE; // 32px

  /* ---------- 入力 ---------- */
  var Input = {
    keys: {}, pressed: {}, dirHeld: null, _queue: [],
    init: function () {
      var map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
        Enter: 'ok', z: 'ok', Z: 'ok', ' ': 'ok', Escape: 'cancel', x: 'cancel', X: 'cancel', Backspace: 'cancel' };
      document.addEventListener('keydown', function (e) {
        var k = map[e.key]; if (!k) return;
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        if (!Input.keys[k]) Input.press(k);
        Input.keys[k] = true;
      });
      document.addEventListener('keyup', function (e) { var k = map[e.key]; if (k) Input.keys[k] = false; });
      root.addEventListener('blur', function () { Input.keys = {}; });
    },
    press: function (k) { Input.pressed[k] = true; Input._queue.push(k); },
    // 「押した瞬間」を1回だけ取得
    consume: function (k) { if (Input.pressed[k]) { Input.pressed[k] = false; return true; } return false; },
    clear: function () { Input.pressed = {}; Input._queue = []; },
    held: function (k) { return !!Input.keys[k]; },
    direction: function () { if (Input.keys.up) return 'up'; if (Input.keys.down) return 'down'; if (Input.keys.left) return 'left'; if (Input.keys.right) return 'right'; return null; },
    // 仮想パッド（タッチ）
    bindPad: function (el) {
      if (!el) return;
      var active = {};
      function set(k, on) { if (on && !Input.keys[k]) Input.press(k); Input.keys[k] = on; }
      el.querySelectorAll('[data-key]').forEach(function (b) {
        var k = b.getAttribute('data-key');
        var down = function (e) { e.preventDefault(); active[k] = true; set(k, true); b.classList.add('on'); };
        var up = function (e) { if (e) e.preventDefault(); active[k] = false; set(k, false); b.classList.remove('on'); };
        b.addEventListener('touchstart', down, { passive: false }); b.addEventListener('touchend', up, { passive: false }); b.addEventListener('touchcancel', up, { passive: false });
        b.addEventListener('mousedown', down); b.addEventListener('mouseup', up); b.addEventListener('mouseleave', function () { if (active[k]) up(); });
      });
    }
  };
  Engine.Input = Input;

  /* ---------- シーン ---------- */
  // scene: { enter(), exit(), update(dt), draw(ctx), handleInput(), overlay(bool) }
  Engine.push = function (scene) { Input.clear(); if (scene.enter) scene.enter(); Engine.scenes.push(scene); };
  Engine.pop = function () { var s = Engine.scenes.pop(); if (s && s.exit) s.exit(); Input.clear(); return s; };
  Engine.replace = function (scene) { while (Engine.scenes.length) Engine.pop(); Engine.push(scene); };
  Engine.top = function () { return Engine.scenes[Engine.scenes.length - 1]; };

  /* ---------- ループ ---------- */
  Engine.init = function (canvas) {
    Engine.canvas = canvas;
    canvas.width = Engine.VIEW_W * Engine.TS; canvas.height = Engine.VIEW_H * Engine.TS;
    Engine.ctx = canvas.getContext('2d');
    Engine.ctx.imageSmoothingEnabled = false;
    Input.init();
  };
  Engine.start = function () {
    if (Engine.running) return; Engine.running = true; Engine.last = performance.now();
    function loop(now) {
      if (!Engine.running) return;
      var dt = Math.min(50, now - Engine.last); Engine.last = now; Engine.frame++;
      Engine._fpsAcc += dt; Engine._fpsCount++; if (Engine._fpsAcc >= 1000) { Engine.fps = Math.round(Engine._fpsCount * 1000 / Engine._fpsAcc); Engine._fpsAcc = 0; Engine._fpsCount = 0; }
      try {
        var top = Engine.top();
        if (top) { if (top.handleInput) top.handleInput(); if (top.update) top.update(dt); }
        // 描画：オーバーレイシーンは下のシーンも描く
        var ctx = Engine.ctx; var drawFrom = Engine.scenes.length - 1;
        while (drawFrom > 0 && Engine.scenes[drawFrom].overlay) drawFrom--;
        for (var i = drawFrom; i < Engine.scenes.length; i++) if (Engine.scenes[i].draw) Engine.scenes[i].draw(ctx);
      } catch (e) { Engine.onError(e); }
      Input.pressed = {};
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  };
  Engine.onError = function (e) {
    Engine.running = false;
    if (root.console) console.error(e);
    var box = document.getElementById('fatal');
    if (box) { box.style.display = 'block'; box.querySelector('.msg').textContent = (e && e.stack) ? e.stack.split('\n').slice(0, 3).join('\n') : String(e); }
  };

  /* ---------- ユーティリティ ---------- */
  Engine.rng = function (seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  Engine.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  Engine.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  Engine.chance = function (p) { return Math.random() < p; };

  root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
