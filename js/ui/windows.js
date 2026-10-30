/* =========================================================
   UI / Windows : レトロRPG風ウィンドウ（メッセージ・選択肢・リスト）
   Promise ベース。キーボード（Enter/Z/Esc/X/矢印）・タップ・マウスに対応。
   ========================================================= */
(function (root) {
  'use strict';

  var Engine = root.Engine, Input = Engine.Input;
  var Win = { layer: null, stack: [] };

  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  Win.esc = esc;
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  Win.init = function (layer) { Win.layer = layer; };

  // モーダル用のシーン（入力を奪う）
  function ModalScene(handlers) { this.overlay = true; this.handlers = handlers; }
  ModalScene.prototype.handleInput = function () {
    var h = this.handlers;
    if (Input.consume('ok') && h.ok) h.ok();
    else if (Input.consume('cancel') && h.cancel) h.cancel();
    else if (Input.consume('up') && h.up) h.up();
    else if (Input.consume('down') && h.down) h.down();
    else if (Input.consume('left') && h.left) h.left();
    else if (Input.consume('right') && h.right) h.right();
  };
  ModalScene.prototype.draw = function () { };

  function open(node, handlers) {
    Win.layer.appendChild(node);
    var scene = new ModalScene(handlers); Engine.push(scene);
    return { node: node, scene: scene, close: function () { if (node.parentNode) node.parentNode.removeChild(node); var i = Engine.scenes.indexOf(scene); if (i >= 0) { Engine.scenes.splice(i, 1); } Input.clear(); } };
  }

  /* ---------- メッセージ ---------- */
  Win.message = function (lines, opts) {
    opts = opts || {};
    if (typeof lines === 'string') lines = [lines];
    return new Promise(function (resolve) {
      var idx = 0, typing = null, full = '', done = false;
      var pt = opts.portrait ? '<img class="rw-portrait" src="' + opts.portrait + '" alt="" draggable="false">' : '';
      var node = el('<div class="rw-msg' + (pt ? ' has-portrait' : '') + '">' + pt + '<div class="rw-msg-body"><div class="rw-name' + (opts.name ? '' : ' hidden') + '">' + esc(opts.name || '') + '</div><div class="rw-text"></div></div><div class="rw-next">▼</div></div>');
      var textEl = node.querySelector('.rw-text');
      var speed = (root.State && root.State.data && root.State.data.settings.textSpeed) || 'normal';
      function typeLine() {
        full = lines[idx] || ''; textEl.textContent = ''; clearInterval(typing); done = false;
        if (speed === 'instant') { textEl.textContent = full; done = true; return; }
        var i = 0, ms = speed === 'fast' ? 10 : 24;
        typing = setInterval(function () { i++; textEl.textContent = full.slice(0, i); if (i >= full.length) { clearInterval(typing); done = true; } }, ms);
      }
      function advance() {
        if (!done) { clearInterval(typing); textEl.textContent = full; done = true; return; }
        idx++;
        if (idx >= lines.length) { h.close(); resolve(); } else typeLine();
      }
      var h = open(node, { ok: advance, cancel: advance });
      node.addEventListener('click', function (e) { e.stopPropagation(); advance(); });
      typeLine();
    });
  };

  /* ---------- 選択肢 ---------- */
  // v5.6 縦長スマホなど画面の高さが足りないとき、選択肢の窓が上にはみ出さないよう下げる（それでも入らなければ窓の中でスクロール）
  function fitChoice(n) {
    try {
      var p = n.offsetParent; if (!p || !root.getComputedStyle) return;
      var top = n.offsetTop; if (top >= 6) return;
      var b = parseFloat(root.getComputedStyle(n).bottom) || 0;
      n.style.bottom = Math.max(8, b + top - 6) + 'px';
      if (n.offsetTop < 6) { n.style.bottom = '8px'; n.style.maxHeight = (p.clientHeight - 16) + 'px'; n.style.overflowY = 'auto'; n._scroll = true; }
    } catch (e) { /* 表示の調整だけなので失敗しても続ける */ }
  }
  Win.choice = function (prompt, options, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var cur = opts.initial || 0;
      var node = el('<div class="rw-choice"><div class="rw-prompt' + (prompt ? '' : ' hidden') + '">' + esc(prompt || '') + '</div><div class="rw-opts">' + options.map(function (o, i) { return '<div class="rw-opt" data-i="' + i + '">' + esc(o) + '</div>'; }).join('') + '</div></div>');
      var optEls = node.querySelectorAll('.rw-opt');
      function render() { optEls.forEach(function (o, i) { o.classList.toggle('cur', i === cur); }); if (node._scroll && optEls[cur] && optEls[cur].scrollIntoView) optEls[cur].scrollIntoView({ block: 'nearest' }); }
      var h = open(node, {
        ok: function () { h.close(); resolve(cur); },
        cancel: function () { if (opts.cancel === false) return; h.close(); resolve(-1); },
        up: function () { cur = (cur + options.length - 1) % options.length; render(); },
        down: function () { cur = (cur + 1) % options.length; render(); }
      });
      optEls.forEach(function (o) { o.addEventListener('click', function (e) { e.stopPropagation(); cur = parseInt(o.getAttribute('data-i'), 10); h.close(); resolve(cur); }); });
      fitChoice(node);
      render();
    });
  };

  /* ---------- リスト（メニュー・ショップなど） ---------- */
  // items: [{label, right, sub, disabled, cls}] ; opts: {title, cancel, info(index)->html, columns}
  Win.list = function (items, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var cur = opts.initial || 0;
      var node = el('<div class="rw-list ' + (opts.cls || '') + '">' + (opts.title ? '<div class="rw-title">' + esc(opts.title) + '</div>' : '') + '<div class="rw-items"></div>' + (opts.info ? '<div class="rw-info"></div>' : '') + (opts.footer ? '<div class="rw-footer">' + opts.footer + '</div>' : '') + '</div>');
      var itemsEl = node.querySelector('.rw-items'); var infoEl = node.querySelector('.rw-info');
      itemsEl.innerHTML = items.map(function (it, i) { return '<div class="rw-item' + (it.disabled ? ' disabled' : '') + (it.cls ? ' ' + it.cls : '') + '" data-i="' + i + '"><span class="l">' + esc(it.label) + '</span>' + (it.right !== undefined ? '<span class="r">' + esc(it.right) + '</span>' : '') + (it.sub ? '<div class="s">' + esc(it.sub) + '</div>' : '') + '</div>'; }).join('') || '<div class="rw-item disabled">（なし）</div>';
      var itemEls = itemsEl.querySelectorAll('.rw-item');
      function render() { itemEls.forEach(function (o, i) { o.classList.toggle('cur', i === cur); }); if (infoEl && items.length) infoEl.innerHTML = opts.info(cur) || ''; var c = itemEls[cur]; if (c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest' }); }
      function choose() { if (!items.length) return; if (items[cur].disabled) return; h.close(); resolve(cur); }
      var h = open(node, {
        ok: choose,
        cancel: function () { if (opts.cancel === false) return; h.close(); resolve(-1); },
        up: function () { if (!items.length) return; cur = (cur + items.length - 1) % items.length; render(); },
        down: function () { if (!items.length) return; cur = (cur + 1) % items.length; render(); },
        left: function () { if (opts.columns && items.length) { cur = Math.max(0, cur - opts.columns); render(); } },
        right: function () { if (opts.columns && items.length) { cur = Math.min(items.length - 1, cur + opts.columns); render(); } }
      });
      itemEls.forEach(function (o) { o.addEventListener('click', function (e) { e.stopPropagation(); var i = parseInt(o.getAttribute('data-i'), 10); if (isNaN(i)) return; if (cur === i) choose(); else { cur = i; render(); } }); });
      if (opts.cancel !== false) { var cb = el('<div class="rw-close">✕</div>'); node.appendChild(cb); cb.addEventListener('click', function (e) { e.stopPropagation(); h.close(); resolve(-1); }); }
      render();
    });
  };

  /* ---------- 情報パネル（静的、閉じるまで表示） ---------- */
  Win.panel = function (html, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var node = el('<div class="rw-panel ' + (opts.cls || '') + '">' + html + (opts.noClose ? '' : '<div class="rw-panel-close">' + esc(opts.closeLabel || '閉じる') + '（Enter / ✕）</div>') + '</div>');
      var h = open(node, opts.noClose ? {} : { ok: function () { h.close(); resolve(0); }, cancel: function () { h.close(); resolve(-1); } });
      var c = node.querySelector('.rw-panel-close'); if (c) c.addEventListener('click', function (e) { e.stopPropagation(); h.close(); resolve(0); });
      if (opts.setup) opts.setup(node, function (v) { h.close(); resolve(v); });
    });
  };

  // 名前入力（HTML input を使う）
  Win.prompt = function (title, placeholder, maxlen) {
    return new Promise(function (resolve) {
      var node = el('<div class="rw-panel"><div class="rw-title">' + esc(title) + '</div><input class="rw-input" maxlength="' + (maxlen || 8) + '" placeholder="' + esc(placeholder || '') + '"><div class="rw-row"><div class="rw-btn ok">決定</div></div></div>');
      var input = node.querySelector('input');
      var h = open(node, { ok: function () { }, cancel: function () { } });
      node.querySelector('.ok').addEventListener('click', function () { var v = input.value.trim(); h.close(); resolve(v); });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); var v = input.value.trim(); h.close(); resolve(v); } e.stopPropagation(); });
      setTimeout(function () { input.focus(); }, 50);
    });
  };

  Win.toast = function (text, ms) {
    var t = document.getElementById('toast'); if (!t) return; t.textContent = text; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, ms || 1600);
  };

  Win.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  root.Win = Win;
})(typeof window !== 'undefined' ? window : globalThis);
