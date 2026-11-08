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
    if (node.setAttribute) { node.setAttribute('role', node.getAttribute('role') || 'dialog'); node.setAttribute('aria-modal', 'true'); }   // v8.8 読み上げ用の役割
    Win.layer.appendChild(node);
    var scene = new ModalScene(handlers); Engine.push(scene);
    var h = { node: node, scene: scene, closed: false, close: function () { h.closed = true; if (node.parentNode) node.parentNode.removeChild(node); var i = Engine.scenes.indexOf(scene); if (i >= 0) { Engine.scenes.splice(i, 1); } Input.clear(); } };
    return h;
  }
  // v8.8 いちばん上の窓だけがタップ・クリックを受ける（上に別の窓が開いている間、下の窓の行や閉じるボタンが反応しないように）
  function isTop(h) { if (!h || h.closed) return false; var s = Engine.scenes; for (var i = s.length - 1; i >= 0; i--) { if (s[i] instanceof ModalScene) return s[i] === h.scene; } return true; }
  Win.isTop = isTop;
  // タップ・クリックの受け口：一番上の窓のときだけ fn を呼ぶ
  function tap(h, elm, fn) { elm.addEventListener('click', function (e) { e.stopPropagation(); if (!isTop(h)) return; fn(e); }); }

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
      tap(h, node, function () { advance(); });
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
      var node = el('<div class="rw-choice"><div class="rw-prompt' + (prompt ? '' : ' hidden') + '">' + esc(prompt || '') + '</div><div class="rw-opts" role="listbox">' + options.map(function (o, i) { return '<div class="rw-opt" role="option" tabindex="-1" data-i="' + i + '">' + esc(o) + '</div>'; }).join('') + '</div></div>');
      var optEls = node.querySelectorAll('.rw-opt');
      function render() { optEls.forEach(function (o, i) { o.classList.toggle('cur', i === cur); o.setAttribute('aria-selected', i === cur ? 'true' : 'false'); }); if (node._scroll && optEls[cur] && optEls[cur].scrollIntoView) optEls[cur].scrollIntoView({ block: 'nearest' }); }
      var h = open(node, {
        ok: function () { h.close(); resolve(cur); },
        cancel: function () { if (opts.cancel === false) return; h.close(); resolve(-1); },
        up: function () { cur = (cur + options.length - 1) % options.length; render(); },
        down: function () { cur = (cur + 1) % options.length; render(); }
      });
      optEls.forEach(function (o) { tap(h, o, function () { cur = parseInt(o.getAttribute('data-i'), 10); h.close(); resolve(cur); }); });
      tap(h, node, function () { });   // 窓の余白のタップで下の窓が反応しないように
      fitChoice(node);
      render();
    });
  };

  /* ---------- リスト（メニュー・ショップなど） ---------- */
  // items: [{label, right, sub, disabled, cls}] ; opts: {title, cancel, info(index)->html, columns}
  // v6.4 opts.tabs（見出しのタブ）：[{label, count}] と opts.tab（今のタブ）。タブを押す・左右キーで { tab: 番号 } を返す（それ以外は従来どおり番号）
  //      opts.tools：タブの下に並べるボタン [{ id, label, on }]。押すと { tool: id } を返す
  // v8.8 タップの決まり（マウス・タッチ・キーボードで同じ結果）
  //   ・ふつうの一覧（opts.info なし）：行を 1 回タップすると、その行を選んで実行する（Enter と同じ）
  //   ・詳しく見てから決める一覧（opts.info あり、または opts.preview:true）：1 回目のタップは選ぶだけ（下に詳細）。
  //     下の［opts.okLabel（既定「決定」）］か、同じ行をもう一度タップ／Enter で実行する。opts.preview:false で 1 回タップに戻せる
  //   ・disabled の行はタップ・Enter でも実行しない（選んで理由を読むことはできる）
  //   ・opts.actions：[{ id, label }] 下に並べるボタン。押すと { action: id, index: 今の行 } を返す（例：お気に入り）
  //   ・opts.key：同じ key の一覧を次に開いたとき、カーソル位置とスクロール位置を戻す（opts.initial があればそちらが先）
  var MEM = {}; Win._listMem = MEM;
  Win.list = function (items, opts) {
    opts = opts || {};
    if (opts.tabs) {
      var tb = '<div class="rw-tabs" role="tablist">' + opts.tabs.map(function (t, i) { return '<span class="rw-tab' + (i === opts.tab ? ' cur' : '') + (t.count === 0 ? ' empty' : '') + (t.disabled ? ' disabled' : '') + '" role="tab" tabindex="-1" aria-selected="' + (i === opts.tab ? 'true' : 'false') + '" data-tab="' + i + '">' + esc(t.label) + (t.count !== undefined ? '<small>' + t.count + '</small>' : '') + '</span>'; }).join('') + '</div>';
      opts = Object.assign({}, opts, { head: tb + (opts.head || '') });
    }
    var tl = opts.tools ? '<div class="rw-tools">' + opts.tools.map(function (t) { return '<span class="rw-tool' + (t.on ? ' on' : '') + '" role="button" tabindex="0" data-tool="' + esc(t.id) + '">' + esc(t.label) + '</span>'; }).join('') + '</div>' : '';
    if (tl) opts = Object.assign({}, opts, { head: (opts.tabs ? opts.head.replace(/^(<div class="rw-tabs"[\s\S]*?<\/div>)/, '$1' + tl) : tl + (opts.head || '')) });
    var preview = opts.preview !== undefined ? !!opts.preview : !!opts.info;
    return new Promise(function (resolve) {
      var mem = opts.key ? MEM[opts.key] : null;
      var cur = opts.initial !== undefined ? opts.initial : (mem ? mem.cur : 0); if (!(cur >= 0)) cur = 0; if (items.length && cur >= items.length) cur = items.length - 1;
      var acts = (opts.actions || []).map(function (a) { return '<span class="rw-act" role="button" tabindex="0" data-act="' + esc(a.id) + '">' + esc(a.label) + '</span>'; }).join('');
      var bar = preview && items.length ? '<div class="rw-actbar"><span class="rw-ok" role="button" tabindex="0">' + esc(opts.okLabel || '決定') + '<small>（Enter）</small></span>' + acts + '<div class="rw-hint">行をタップで詳しく見る → もう一度タップか［' + esc(opts.okLabel || '決定') + '］で決定</div></div>'
        : (acts ? '<div class="rw-actbar">' + acts + '</div>' : '');
      var node = el('<div class="rw-list ' + (opts.cls || '') + (preview ? ' rw-preview' : '') + '">' + (opts.title ? '<div class="rw-title">' + esc(opts.title) + '</div>' : '') + (opts.head ? '<div class="rw-head">' + opts.head + '</div>' : '') + '<div class="rw-items" role="listbox"></div>' + (opts.info ? '<div class="rw-info" aria-live="polite"></div>' : '') + bar + (opts.footer ? '<div class="rw-footer">' + opts.footer + '</div>' : '') + '</div>');
      var itemsEl = node.querySelector('.rw-items'); var infoEl = node.querySelector('.rw-info'); var okEl = node.querySelector('.rw-ok');
      itemsEl.innerHTML = items.map(function (it, i) { return '<div class="rw-item' + (it.disabled ? ' disabled' : '') + (it.cls ? ' ' + it.cls : '') + '" role="option" tabindex="-1"' + (it.disabled ? ' aria-disabled="true"' : '') + ' data-i="' + i + '"><span class="l">' + esc(it.label) + '</span>' + (it.right !== undefined ? '<span class="r">' + esc(it.right) + '</span>' : '') + (it.sub ? '<div class="s">' + esc(it.sub) + '</div>' : '') + '</div>'; }).join('') || '<div class="rw-item disabled" aria-disabled="true">（なし）</div>';
      var itemEls = itemsEl.querySelectorAll('.rw-item'); var armed = -1;
      function remember() { if (opts.key) MEM[opts.key] = { cur: cur, scroll: itemsEl.scrollTop }; }
      function render(noScroll) { itemEls.forEach(function (o, i) { o.classList.toggle('cur', i === cur); o.setAttribute('aria-selected', i === cur ? 'true' : 'false'); }); if (infoEl && items.length) infoEl.innerHTML = opts.info(cur) || ''; if (okEl) okEl.classList.toggle('disabled', !items.length || !!(items[cur] && items[cur].disabled)); var c = itemEls[cur]; if (!noScroll && c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest' }); }
      function finish(v) { remember(); h.close(); resolve(v); }
      function choose() { if (!items.length) return; if (items[cur].disabled) return; finish(cur); }
      var h = open(node, {
        ok: choose,
        cancel: function () { if (opts.cancel === false) return; finish(-1); },
        up: function () { if (!items.length) return; cur = (cur + items.length - 1) % items.length; armed = cur; render(); },
        down: function () { if (!items.length) return; cur = (cur + 1) % items.length; armed = cur; render(); },
        left: function () { if (opts.tabs) { finish({ tab: (opts.tab + opts.tabs.length - 1) % opts.tabs.length }); return; } if (opts.columns && items.length) { cur = Math.max(0, cur - opts.columns); render(); } },
        right: function () { if (opts.tabs) { finish({ tab: (opts.tab + 1) % opts.tabs.length }); return; } if (opts.columns && items.length) { cur = Math.min(items.length - 1, cur + opts.columns); render(); } }
      });
      if (opts.tabs) {
        node.querySelectorAll('.rw-tab').forEach(function (t) { tap(h, t, function () { var ti = parseInt(t.getAttribute('data-tab'), 10); if (t.classList.contains('disabled')) return; finish({ tab: ti }); }); });
        var ct = node.querySelector('.rw-tab.cur'); if (ct && ct.scrollIntoView) try { ct.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { }
      }
      node.querySelectorAll('.rw-tool').forEach(function (t) { tap(h, t, function () { finish({ tool: t.getAttribute('data-tool') }); }); });
      node.querySelectorAll('.rw-act').forEach(function (t) { tap(h, t, function () { if (!items.length) return; finish({ action: t.getAttribute('data-act'), index: cur }); }); });
      if (okEl) tap(h, okEl, function () { choose(); });
      // 詳細つきの一覧：最初から選ばれている行も、1 回目のタップは「選ぶだけ」（タップかキーで選んだあとの行をもう一度タップしたら実行）
      itemEls.forEach(function (o) { tap(h, o, function () { var i = parseInt(o.getAttribute('data-i'), 10); if (isNaN(i)) return; if (!preview || armed === i) { cur = i; render(true); choose(); } else { cur = i; armed = i; render(true); } }); });
      if (opts.cancel !== false) { var cb = el('<div class="rw-close" role="button" tabindex="0" aria-label="閉じる">✕</div>'); node.appendChild(cb); tap(h, cb, function () { finish(-1); }); }
      tap(h, node, function () { });
      render();
      if (mem && opts.initial === undefined && mem.scroll) itemsEl.scrollTop = mem.scroll;
    });
  };

  /* ---------- 情報パネル（静的、閉じるまで表示） ---------- */
  // opts.quit（v5.8）：「中断」ボタンを付ける（true なら「中断する」、文字列ならその表記）。押すか Esc で 'quit' を返す
  // opts.onCancel（v5.8）：noClose のパネルで Esc を押したときに呼ぶ
  Win.panel = function (html, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var foot = opts.noClose ? '' : opts.quit
        ? '<div class="rw-panel-foot"><div class="rw-panel-close">' + esc(opts.closeLabel || '閉じる') + '（Enter）</div><div class="rw-panel-quit">' + esc(opts.quit === true ? '中断する' : opts.quit) + '（Esc）</div></div>'
        : '<div class="rw-panel-close">' + esc(opts.closeLabel || '閉じる') + '（Enter / ✕）</div>';
      var node = el('<div class="rw-panel ' + (opts.cls || '') + '">' + html + foot + '</div>');
      var hd = opts.noClose ? (function () { var o = {}; if (opts.onCancel) o.cancel = function () { opts.onCancel(); }; if (opts.onOk) o.ok = function () { opts.onOk(); }; if (opts.onKey) ['up', 'down', 'left', 'right'].forEach(function (k) { o[k] = function () { opts.onKey(k); }; }); return o; })() : { ok: function () { h.close(); resolve(0); }, cancel: function () { h.close(); resolve(opts.quit ? 'quit' : -1); } };
      var h = open(node, hd);
      var c = node.querySelector('.rw-panel-close'); if (c) { c.setAttribute('role', 'button'); c.setAttribute('tabindex', '0'); tap(h, c, function () { h.close(); resolve(0); }); }
      var q = node.querySelector('.rw-panel-quit'); if (q) { q.setAttribute('role', 'button'); q.setAttribute('tabindex', '0'); tap(h, q, function () { h.close(); resolve('quit'); }); }
      if (opts.setup) opts.setup(node, function (v) { h.close(); resolve(v); });
    });
  };
  // v5.8 中断の確認（「中断する」で true）。Esc は「続ける」扱い
  // v8.8 最初のカーソルは安全な「続ける」（Enter の押しすぎで中断しないように）
  Win.confirmQuit = function (what, note) {
    return Win.choice(what + 'を中断しますか？' + (note ? '（' + note + '）' : ''), ['中断する', '続ける'], { initial: 1 }).then(function (a) { return a === 0; });
  };

  // 名前入力（HTML input を使う）
  // v8.8 戻り値：決定＝入力した文字（空なら ""）、やめる／Esc／✕＝null（呼び出し側で「中止」と「空で決定」を分ける）
  Win.prompt = function (title, placeholder, maxlen, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var node = el('<div class="rw-panel rw-prompt-panel"><div class="rw-title">' + esc(title) + '</div><input class="rw-input" aria-label="' + esc(title) + '" maxlength="' + (maxlen || 8) + '" placeholder="' + esc(placeholder || '') + '"' + (opts.value !== undefined ? ' value="' + esc(opts.value) + '"' : '') + '><div class="rw-row"><div class="rw-btn ok" role="button" tabindex="0">決定</div><div class="rw-btn cancel" role="button" tabindex="0">やめる</div></div></div>');
      var input = node.querySelector('input'); var done = false;
      function fin(v) { if (done) return; done = true; h.close(); resolve(v); }
      var h = open(node, { ok: function () { fin(input.value.trim()); }, cancel: function () { fin(null); } });
      tap(h, node.querySelector('.ok'), function () { fin(input.value.trim()); });
      tap(h, node.querySelector('.cancel'), function () { fin(null); });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); fin(input.value.trim()); return; } if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fin(null); return; } e.stopPropagation(); });
      input.addEventListener('click', function (e) { e.stopPropagation(); });
      setTimeout(function () { try { input.focus(); } catch (e) { } }, 50);
    });
  };

  Win.toast = function (text, ms) {
    var t = document.getElementById('toast'); if (!t) return; t.textContent = text; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('show'); }, ms || 1600);
  };

  Win.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  root.Win = Win;
})(typeof window !== 'undefined' ? window : globalThis);
