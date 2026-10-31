/* =========================================================
   UI / Mobile (v6.1) : スマートフォン向けの画面配置とタッチ操作
   ・タッチ操作は、キーボードと同じ「入力コマンド」（Engine.Input の up/down/left/right/ok/cancel/minimap/map）に変換するだけ。
     ゲームの処理はPCと共通（タッチ専用のゲームロジックは持たない）
   ・画面：ビューポート全面（スクロールなし）・セーフエリアを考慮
       縦画面：上にゲーム画面、下に操作パネル。ゲーム画面は縦のマス数を増やして（Engine.setView）操作パネルの上まで広げる
       横画面：ゲーム画面を画面の高さいっぱいに、左にスティック、右にボタン（画面の左右の余白に置く）
   ・操作：移動スティック（設定で十字キーに切替）、決定・調べる、戻る／メニュー、ミニマップ、全体マップ、操作説明、セーブ、全画面
     探索中／会話・メニュー中／戦闘中で、出すボタンを切り替える（重ならない配置）
   ・ブラウザの仕様で、操作なしの全画面化はできないため「全画面」ボタン（Fullscreen API に対応する端末だけ表示）で切り替える
   ・3D版（/3d/）でも同じ操作パネルを使い、スティックの量を3Dの移動（アナログ）にも渡す
   ========================================================= */
(function (root) {
  'use strict';
  var MobileUI = { active: false, ctx: '' };
  var Input = root.Engine.Input;
  function touchCapable() { return ('ontouchstart' in root) || (root.navigator && root.navigator.maxTouchPoints > 0) || (root.matchMedia && root.matchMedia('(pointer: coarse)').matches); }
  // スマホ（タッチ中心）の画面か：PC版（Sidebar.isPC）でなく、タッチ操作できるか幅が狭い
  MobileUI.detect = function () { var pc = root.Sidebar && root.Sidebar.isPC(); if (pc) return false; return touchCapable() || root.innerWidth <= 720; };
  function S() { return root.State && root.State.data ? root.State.data.settings : null; }
  function padMode() { var s = S(); return s && s.pad === 'dpad' ? 'dpad' : 'stick'; }
  function fsSupported() { var d = document.documentElement; return !!(document.fullscreenEnabled && d.requestFullscreen); }
  // セーフエリア（ノッチ・ホームバー）の大きさ：env() は直接読めないので、測定用の要素の余白から読む
  var probe = null; function safe(side) {
    if (!probe) { probe = document.createElement('div'); probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'; document.body.appendChild(probe); }
    var cs = getComputedStyle(probe); return parseFloat(cs[{ t: 'paddingTop', r: 'paddingRight', b: 'paddingBottom', l: 'paddingLeft' }[side]]) || 0;
  }

  /* ---------- 操作パネルの組み立て ---------- */
  MobileUI.build = function () {
    var pad = document.getElementById('pad'); if (!pad) return;
    pad.className = 'mpad'; pad.innerHTML =
      '<div class="mp-move"><div class="mp-stick" aria-label="移動スティック"><i></i></div>' +
      '<div class="dpad"><button data-key="up" aria-label="上">▲</button><button data-key="left" aria-label="左">◀</button><button data-key="right" aria-label="右">▶</button><button data-key="down" aria-label="下">▼</button></div></div>' +
      '<div class="mp-tools">' +
        '<button data-cmd="minimap" class="mp-t w">ミニマップ</button><button data-cmd="map" class="mp-t w">全体マップ</button>' +
        '<button data-cmd="help" class="mp-t w">操作説明</button><button data-cmd="save" class="mp-t w">セーブ</button>' +
        (fsSupported() ? '<button data-cmd="fullscreen" class="mp-t">全画面</button>' : '') +
      '</div>' +
      '<div class="mp-act"><button data-key="cancel" class="mp-b cancel"><span class="lb-menu">メニュー</span><span class="lb-back">戻る</span></button><button data-key="ok" class="mp-b ok">決定<small>調べる・話す</small></button></div>';
    Input.bindPad(pad);   // 十字キー・決定・戻る：キーボードと同じコマンド
    pad.querySelectorAll('[data-cmd]').forEach(function (b) {
      var go = function (e) { e.preventDefault(); e.stopPropagation(); MobileUI.command(b.getAttribute('data-cmd')); };
      b.addEventListener('touchstart', go, { passive: false }); b.addEventListener('click', function (e) { if (MobileUI._touchAt && Date.now() - MobileUI._touchAt < 600) return; go(e); });
      b.addEventListener('touchend', function () { MobileUI._touchAt = Date.now(); });
    });
    MobileUI.bindStick(pad.querySelector('.mp-stick'));
    MobileUI.pad = pad;
  };
  // 補助ボタンのコマンド
  MobileUI.command = function (cmd) {
    var W = root.World;
    if (cmd === 'minimap') { Input.press('minimap'); return; }
    if (cmd === 'map') { Input.press('map'); return; }
    if (cmd === 'fullscreen') { MobileUI.toggleFullscreen(); return; }
    if (cmd === 'help' || cmd === 'save') {
      if (!(root.Sidebar && root.Sidebar.canOpen())) { if (root.Win) root.Win.toast('今は開けません（会話・戦闘・画面を閉じてから）'); return; }
      root.Sidebar.run(['', cmd === 'help' ? MobileUI.help : function () { return root.Menu.save(); }]);
    }
  };
  MobileUI.toggleFullscreen = function () {
    try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(function () { if (root.Win) root.Win.toast('この端末では全画面にできませんでした'); }); } catch (e) { /* 非対応 */ }
  };
  MobileUI.help = function () {
    return root.Win.panel('<div class="rw-title">操作説明（スマートフォン）</div><div class="lesson">' +
      '・左下のスティック（設定で十字キーに変更可）：移動。メニューや選択肢では上下の選択\n・決定：話す・調べる・宝箱を開ける・メッセージ送り・決定\n・メニュー／戻る：探索中はメニュー、会話や画面の中では戻る\n' +
      '・ミニマップ：表示・非表示の切り替え（全体マップとは別）\n・全体マップ：世界の地図。訪れた町へファストトラベル\n・セーブ：その場でセーブ（オートセーブも常に動いています）\n' +
      (fsSupported() ? '・全画面：ブラウザの枠を隠して画面いっぱいに表示\n' : '') + '・選択肢やリストは、項目を直接タップしても選べます（もう一度タップで決定）\n・横画面にすると、ゲーム画面を大きく表示できます</div>', {});
  };

  /* ---------- 移動スティック（4方向のキー入力に変換。3D版にはアナログ量も渡す） ---------- */
  MobileUI.bindStick = function (el) {
    if (!el) return; var knob = el.firstChild; var id = null, cx = 0, cy = 0, R = 44; var cur = null;
    function setDir(d) { ['up', 'down', 'left', 'right'].forEach(function (k) { var on = k === d; if (on && !Input.keys[k]) Input.press(k); Input.keys[k] = on; }); cur = d; }
    function analog(x, z, mag) { var B = root.MTQ3D; if (B && B.ui && B.ui.stick && B.mode3D && B.mode3D()) { B.ui.stick.x = x; B.ui.stick.z = z; B.ui.stick.mag = mag; B.ui.stick.active = mag > 0; } }
    function move(px, py) {
      var dx = px - cx, dy = py - cy; var L = Math.hypot(dx, dy); var k = L > R ? R / L : 1; knob.style.transform = 'translate(' + (dx * k) + 'px,' + (dy * k) + 'px)';
      var mag = Math.min(1, L / R); if (mag < 0.28) { setDir(null); analog(0, 0, 0); return; }
      var d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (root.MTQ3D && root.MTQ3D.mode3D && root.MTQ3D.mode3D() && root.Engine.top() === root.World.scene) { setDir(null); analog(dx / Math.max(L, 1), dy / Math.max(L, 1), mag); }   // 3D探索中は自由移動
      else setDir(d);
    }
    function end() { id = null; knob.style.transform = ''; setDir(null); analog(0, 0, 0); el.classList.remove('on'); }
    el.addEventListener('touchstart', function (e) { e.preventDefault(); var t = e.changedTouches[0]; id = t.identifier; var r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; R = r.width * 0.36; el.classList.add('on'); move(t.clientX, t.clientY); }, { passive: false });
    el.addEventListener('touchmove', function (e) { e.preventDefault(); for (var i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === id) move(e.changedTouches[i].clientX, e.changedTouches[i].clientY); }, { passive: false });
    var te = function (e) { for (var i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === id) end(); };
    el.addEventListener('touchend', te); el.addEventListener('touchcancel', te);
    // マウス（PCの幅の狭い画面での確認用）
    var md = false; el.addEventListener('mousedown', function (e) { md = true; var r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; R = r.width * 0.36; el.classList.add('on'); move(e.clientX, e.clientY); });
    root.addEventListener('mousemove', function (e) { if (md) move(e.clientX, e.clientY); }); root.addEventListener('mouseup', function () { if (md) { md = false; end(); } });
    MobileUI.stickEnd = end;
  };

  /* ---------- 画面の大きさ（main.js の fit から呼ばれる） ---------- */
  MobileUI.fit = function (canvas) {
    var vw = root.innerWidth, vh = root.innerHeight; var land = vw > vh; document.body.classList.toggle('m-land', land); document.body.classList.toggle('m-port', !land);
    var sl = safe('l'), sr = safe('r'), st = safe('t'), sb = safe('b'); var E = root.Engine;
    var w, h, padH = 0;
    if (land) { E.setView(E.VIEW_W0, E.VIEW_H0); var aspect = canvas.width / canvas.height; h = vh - st - sb; w = Math.min(vw - sl - sr, h * aspect); h = w / aspect; }
    else {
      // 縦画面：横は20マスのまま、縦のマス数を増やしてゲーム画面を下へ広げる（操作パネルの上まで）
      padH = 186; w = vw - sl - sr; var tile = w / E.VIEW_W0; var rows = Math.max(E.VIEW_H0, Math.min(26, Math.floor((vh - st - sb - padH - 4) / tile)));
      E.setView(E.VIEW_W0, rows); h = rows * tile;
    }
    canvas.style.width = Math.round(w) + 'px'; canvas.style.height = Math.round(h) + 'px';
    document.body.classList.toggle('m-wide', land && (vw - w) / 2 - Math.max(sl, sr) >= 112);   // 横画面で左右の余白に操作パネルが収まるか
    var ui = document.getElementById('ui'); ui.style.width = canvas.style.width; ui.style.height = canvas.style.height;
    document.documentElement.style.setProperty('--m-pad-h', Math.round(padH) + 'px');
    document.documentElement.style.setProperty('--m-game-w', Math.round(w) + 'px');
    var ml = document.getElementById('minimap-layer'); if (ml) { ml.style.width = canvas.style.width; ml.style.height = canvas.style.height; }
    return { w: w, h: h };
  };

  /* ---------- 状況に応じたボタンの切り替え ---------- */
  MobileUI.context = function () {
    var W = root.World, E = root.Engine; if (!W || !W.scene || !root.State.data) return 'title';
    var top = E.top(); var uiOpen = document.getElementById('ui').children.length > 0;
    var B = root.BattleUI; if (B && B.scene && E.scenes.indexOf(B.scene) >= 0) return 'battle';
    if (top === W.scene && !W.busy && !uiOpen && !(root.Minimap && root.Minimap.open)) return 'world';
    return 'dialog';
  };
  MobileUI.refresh = function () {
    if (!MobileUI.active) return; var c = MobileUI.context(); var mode = padMode();
    if (c !== MobileUI.ctx) { document.body.classList.remove('mctx-world', 'mctx-dialog', 'mctx-battle', 'mctx-title'); document.body.classList.add('mctx-' + c); MobileUI.ctx = c; if (MobileUI.stickEnd && c !== 'world') MobileUI.stickEnd(); }
    if (mode !== MobileUI.mode) { document.body.classList.toggle('m-dpad', mode === 'dpad'); MobileUI.mode = mode; }
    var mm = MobileUI.pad && MobileUI.pad.querySelector('[data-cmd="minimap"]'); if (mm) mm.classList.toggle('off', !!(root.Minimap && !root.Minimap.isVisible()));
    var fs = MobileUI.pad && MobileUI.pad.querySelector('[data-cmd="fullscreen"]'); if (fs) fs.textContent = document.fullscreenElement ? '全画面を解除' : '全画面';
  };
  MobileUI.init = function () {
    MobileUI.active = MobileUI.detect(); document.body.classList.toggle('mobile', MobileUI.active);
    if (!MobileUI.active) return;
    MobileUI.build();
    var tick = function () { MobileUI.refresh(); root.requestAnimationFrame(tick); }; root.requestAnimationFrame(tick);
    document.addEventListener('fullscreenchange', function () { setTimeout(function () { root.dispatchEvent(new Event('resize')); }, 120); });
    // ページ全体のスクロール・ダブルタップ拡大を抑える（ゲーム画面の外のスワイプでページが動かないように）
    document.addEventListener('touchmove', function (e) { if (!e.target.closest('.rw-items, .rw-panel, .rw-info, .op-list, .bigmap, .wm-wrap, .rw-list, .rw-choice, .trade-panel, .bestiary')) e.preventDefault(); }, { passive: false });
  };
  root.MobileUI = MobileUI;
})(typeof window !== 'undefined' ? window : globalThis);
