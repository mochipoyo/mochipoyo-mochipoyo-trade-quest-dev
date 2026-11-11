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
    else if (Input.consume('prev') && h.prev) h.prev();     // v9.2 Q：前の仲間（js/core/engine.js の入力の表）
    else if (Input.consume('next') && h.next) h.next();     // v9.2 E：次の仲間
  };
  ModalScene.prototype.draw = function () { };

  function open(node, handlers) {
    if (node.setAttribute) { node.setAttribute('role', node.getAttribute('role') || 'dialog'); node.setAttribute('aria-modal', 'true'); }   // v8.8 読み上げ用の役割
    Win.layer.appendChild(node);
    if (root.MobileUI && root.MobileUI.syncTall) root.MobileUI.syncTall();   // v9.2 スマホの縦画面：大きさが一律の窓（.rw-fixed）・ステータス・なかま（.rw-tall）は、開いたその場で操作パネルの上まで広げる
    var scene = new ModalScene(handlers); Engine.push(scene);
    var h = { node: node, scene: scene, closed: false, close: function () { h.closed = true; if (node.parentNode) node.parentNode.removeChild(node); var i = Engine.scenes.indexOf(scene); if (i >= 0) { Engine.scenes.splice(i, 1); } Input.clear(); } };
    return h;
  }
  // v8.8 いちばん上の窓だけがタップ・クリックを受ける（上に別の窓が開いている間、下の窓の行や閉じるボタンが反応しないように）
  function isTop(h) { if (!h || h.closed) return false; var s = Engine.scenes; for (var i = s.length - 1; i >= 0; i--) { if (s[i] instanceof ModalScene) return s[i] === h.scene; } return true; }
  Win.isTop = isTop;
  // タップ・クリックの受け口：一番上の窓のときだけ fn を呼ぶ
  function tap(h, elm, fn) { elm.addEventListener('click', function (e) { e.stopPropagation(); if (!isTop(h)) return; fn(e); }); }

  /* ---------- v9.3 会話の履歴（読み飛ばした会話・説明を読み返す） ----------
     ・メッセージの各行（話す人の名前つき）と、選択肢の問いかけ・選んだ答えを、表示した順に覚える（新しい 300 件まで）
     ・この遊んでいる間だけ（セーブには入れない）。メッセージの窓の［履歴］・↑ キー、メニューの「会話の履歴」で開く */
  Win.LOG_MAX = 300; Win.log = [];
  function placeName() { try { var W = root.World; var m = W && W.map; return (m && (m.name || (m.def && m.def.name))) || ''; } catch (e) { return ''; } }
  Win.logLine = function (name, text, kind) {
    text = String(text == null ? '' : text); if (!text) return; var L = Win.log; var place = placeName();
    var last = L[L.length - 1]; if (last && last.text === text && last.name === (name || '') && last.kind === (kind || 'say')) return;   // 同じ行を続けて覚えない
    L.push({ name: name || '', text: text, kind: kind || 'say', place: place }); if (L.length > Win.LOG_MAX) L.splice(0, L.length - Win.LOG_MAX);
  };
  var logOpen = false;
  Win.backlog = function () {
    if (logOpen) return Promise.resolve(); logOpen = true;
    var L = Win.log; var html = '<div class="rw-title">会話の履歴（新しい ' + Win.LOG_MAX + ' 件まで）</div><div class="bl-list">';
    if (!L.length) html += '<div class="muted">まだ会話がない。</div>';
    var lastPlace = null;
    L.forEach(function (x) {
      if (x.place && x.place !== lastPlace) { html += '<div class="bl-place">― ' + esc(x.place) + ' ―</div>'; lastPlace = x.place; }
      html += '<div class="bl-row bl-' + x.kind + '">' + (x.name ? '<span class="bl-name">' + esc(x.name) + '</span>' : '') + '<span class="bl-text">' + esc(x.text) + '</span></div>';
    });
    html += '</div><div class="bl-foot muted small">↑↓ でスクロール　Enter／Esc で閉じる</div>';
    return Win.panel(html, { cls: 'backlog-panel rw-tall', noClose: true,
      onOk: function () { fin(0); }, onCancel: function () { fin(-1); },
      onKey: function (k) { var b = node && node.querySelector('.bl-list'); if (!b) return; if (k === 'up') b.scrollTop -= 60; else if (k === 'down') b.scrollTop += 60; },
      setup: function (n, close) { node = n; fin = function (v) { logOpen = false; close(v); };
        var x = document.createElement('div'); x.className = 'rw-close'; x.setAttribute('role', 'button'); x.setAttribute('tabindex', '0'); x.setAttribute('aria-label', '閉じる'); x.textContent = '✕'; n.appendChild(x);
        x.addEventListener('click', function (e) { e.stopPropagation(); fin(-1); });
        var b = n.querySelector('.bl-list'); if (b) b.scrollTop = b.scrollHeight; } });
    var node = null, fin = function () { };
  };

  /* ---------- メッセージ ---------- */
  Win.message = function (lines, opts) {
    opts = opts || {};
    if (typeof lines === 'string') lines = [lines];
    return new Promise(function (resolve) {
      var idx = 0, typing = null, full = '', done = false;
      var pt = opts.portrait ? '<img class="rw-portrait" src="' + opts.portrait + '" alt="" draggable="false">' : '';
      var emo = opts.emo && /^[a-z]+$/.test(opts.emo) ? ' emo-' + opts.emo : '';   // v9.4 仲間の絆：気持ち（立ち絵の動き。js/rpg/bonds94.js）
      var node = el('<div class="rw-msg' + (pt ? ' has-portrait' : '') + emo + '">' + pt + '<div class="rw-msg-body"><div class="rw-name' + (opts.name ? '' : ' hidden') + '">' + esc(opts.name || '') + '</div><div class="rw-text"></div></div><div class="rw-next">▼</div><span class="rw-logbtn" role="button" tabindex="0" aria-label="会話の履歴">履歴</span></div>');   // v9.3 会話の履歴のボタン
      var textEl = node.querySelector('.rw-text');
      var speed = (root.State && root.State.data && root.State.data.settings.textSpeed) || 'normal';
      function typeLine() {
        full = lines[idx] || ''; textEl.textContent = ''; clearInterval(typing); done = false; Win.logLine(opts.name, full, 'say');
        if (speed === 'instant') { textEl.textContent = full; done = true; return; }
        var i = 0, ms = speed === 'fast' ? 10 : 24;
        typing = setInterval(function () { i++; textEl.textContent = full.slice(0, i); if (i >= full.length) { clearInterval(typing); done = true; } }, ms);
      }
      function advance() {
        if (!done) { clearInterval(typing); textEl.textContent = full; done = true; return; }
        idx++;
        if (idx >= lines.length) { h.close(); resolve(); } else typeLine();
      }
      function showLog() { if (!isTop(h)) return; Win.backlog(); }
      var h = open(node, { ok: advance, cancel: advance, up: showLog });   // v9.3 ↑ キーで会話の履歴
      var lb = node.querySelector('.rw-logbtn'); if (lb) tap(h, lb, function () { showLog(); });
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
      var IIc = root.ItemIcons; var oIds = opts.itemIds || [];   // v9.5 opts.itemIds[i]：その選択肢の先頭に絵（鍛え直しなど。操作は今までどおり）
      var node = el('<div class="rw-choice"><div class="rw-prompt' + (prompt ? '' : ' hidden') + '">' + esc(prompt || '') + '</div><div class="rw-opts" role="listbox">' + options.map(function (o, i) { var ic = oIds[i] && IIc ? IIc.html(oIds[i], { size: 44 }) : ''; return '<div class="rw-opt' + (ic ? ' has-icon' : '') + '" role="option" tabindex="-1" data-i="' + i + '">' + ic + (ic ? '<span>' + esc(o) + '</span>' : esc(o)) + '</div>'; }).join('') + '</div></div>');
      var optEls = node.querySelectorAll('.rw-opt');
      function render() { optEls.forEach(function (o, i) { o.classList.toggle('cur', i === cur); o.setAttribute('aria-selected', i === cur ? 'true' : 'false'); }); if (node._scroll && optEls[cur] && optEls[cur].scrollIntoView) optEls[cur].scrollIntoView({ block: 'nearest' }); }
      if (prompt) Win.logLine('', prompt, 'ask');   // v9.3 会話の履歴：問いかけと、選んだ答え
      function pick(i) { h.close(); if (i >= 0 && options[i] !== undefined) Win.logLine('', '→ ' + options[i], 'answer'); resolve(i); }
      var h = open(node, {
        ok: function () { pick(cur); },
        cancel: function () { if (opts.cancel === false) return; h.close(); resolve(-1); },
        up: function () { cur = (cur + options.length - 1) % options.length; render(); },
        down: function () { cur = (cur + 1) % options.length; render(); }
      });
      optEls.forEach(function (o) { tap(h, o, function () { cur = parseInt(o.getAttribute('data-i'), 10); pick(cur); }); });
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
  //   ・v9.2 opts.members：仲間を切り替える帯 { list: [{ label, sub, dead }], cur: 今の番号, arrows: true/false }（2 人以上のときだけ出す）
  //     名前のタップ・◀▶・Q／E で { member: 番号, index: 今の行 } を返す。arrows のときは ←→ でも切り替える（タブ・列のない一覧だけ）
  var MEM = {}; Win._listMem = MEM;
  Win.memberBarHtml = function (M) {
    if (!M || !M.list || M.list.length < 2) return '';
    var keys = (M.arrows ? '←→ / ' : '') + 'Q・E';
    return '<div class="rw-members" role="tablist" aria-label="仲間の切り替え"><span class="rw-mem-nav" role="button" tabindex="0" data-mnav="-1" aria-label="前の仲間">◀</span><div class="rw-mem-chips">' +
      M.list.map(function (m, i) { return '<span class="rw-mem' + (i === M.cur ? ' cur' : '') + (m.dead ? ' dead' : '') + '" role="tab" tabindex="-1" aria-selected="' + (i === M.cur ? 'true' : 'false') + '" data-m="' + i + '">' + esc(m.label) + (m.sub ? '<small>' + esc(m.sub) + '</small>' : '') + '</span>'; }).join('') +
      '</div><span class="rw-mem-nav" role="button" tabindex="0" data-mnav="1" aria-label="次の仲間">▶</span><span class="rw-mem-key">' + esc(keys) + '</span></div>';
  };
  // 帯のタップを受ける：go(番号) を呼ぶ。check() が false の間（上に別の窓があるときなど）は何もしない
  Win.bindMemberBar = function (node, M, go, check) {
    if (!M || !M.list || M.list.length < 2) return;
    var n = M.list.length; function ok() { return !check || check(); }
    node.querySelectorAll('.rw-mem').forEach(function (t) { t.addEventListener('click', function (e) { e.stopPropagation(); if (!ok()) return; var i = parseInt(t.getAttribute('data-m'), 10); if (i !== M.cur) go(i); }); });
    node.querySelectorAll('.rw-mem-nav').forEach(function (t) { t.addEventListener('click', function (e) { e.stopPropagation(); if (!ok()) return; go(((M.cur + parseInt(t.getAttribute('data-mnav'), 10)) % n + n) % n); }); });
    var c = node.querySelector('.rw-mem.cur'); if (c && c.scrollIntoView) try { c.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { }
  };
  Win.list = function (items, opts) {
    opts = opts || {};
    var MB = opts.members && opts.members.list && opts.members.list.length > 1 ? opts.members : null;
    if (opts.tabs) {
      var tb = '<div class="rw-tabs" role="tablist">' + opts.tabs.map(function (t, i) { return '<span class="rw-tab' + (i === opts.tab ? ' cur' : '') + (t.count === 0 ? ' empty' : '') + (t.disabled ? ' disabled' : '') + '" role="tab" tabindex="-1" aria-selected="' + (i === opts.tab ? 'true' : 'false') + '" data-tab="' + i + '">' + esc(t.label) + (t.count !== undefined ? '<small>' + t.count + '</small>' : '') + '</span>'; }).join('') + '</div>';
      opts = Object.assign({}, opts, { head: tb + (opts.head || '') });
    }
    var tl = opts.tools ? '<div class="rw-tools">' + opts.tools.map(function (t) { return '<span class="rw-tool' + (t.on ? ' on' : '') + '" role="button" tabindex="0" data-tool="' + esc(t.id) + '">' + esc(t.label) + '</span>'; }).join('') + '</div>' : '';
    if (tl) opts = Object.assign({}, opts, { head: (opts.tabs ? opts.head.replace(/^(<div class="rw-tabs"[\s\S]*?<\/div>)/, '$1' + tl) : tl + (opts.head || '')) });
    if (MB) opts = Object.assign({}, opts, { head: Win.memberBarHtml(MB) + (opts.head || '') });   // 仲間の帯はタイトルのすぐ下（タブ・ボタンより上）
    var preview = opts.preview !== undefined ? !!opts.preview : !!opts.info;
    return new Promise(function (resolve) {
      var mem = opts.key ? MEM[opts.key] : null;
      var cur = opts.initial !== undefined ? opts.initial : (mem ? mem.cur : 0); if (!(cur >= 0)) cur = 0; if (items.length && cur >= items.length) cur = items.length - 1;
      var acts = (opts.actions || []).map(function (a) { return '<span class="rw-act" role="button" tabindex="0" data-act="' + esc(a.id) + '">' + esc(a.label) + '</span>'; }).join('');
      var bar = preview && items.length ? '<div class="rw-actbar"><span class="rw-ok" role="button" tabindex="0">' + esc(opts.okLabel || '決定') + '<small>（Enter）</small></span>' + acts + '<div class="rw-hint">行をタップで詳しく見る → もう一度タップか［' + esc(opts.okLabel || '決定') + '］で決定</div></div>'
        : (acts ? '<div class="rw-actbar">' + acts + '</div>' : '');
      var node = el('<div class="rw-list ' + (opts.cls || '') + (preview ? ' rw-preview' : '') + '">' + (opts.title ? '<div class="rw-title">' + esc(opts.title) + '</div>' : '') + (opts.head ? '<div class="rw-head">' + opts.head + '</div>' : '') + '<div class="rw-items" role="listbox"></div>' + (opts.info ? '<div class="rw-info" aria-live="polite"></div>' : '') + bar + (opts.footer ? '<div class="rw-footer">' + opts.footer + '</div>' : '') + '</div>');
      var itemsEl = node.querySelector('.rw-items'); var infoEl = node.querySelector('.rw-info'); var okEl = node.querySelector('.rw-ok');
      // v9.5 行に itemId（ゲームの正確なアイテム／オーパーツの ID）があれば、その行だけ先頭に絵（js/ui/item-icons.js）。絵は飾り：操作・選択の返り値は今までどおり行全体
      var IIc = root.ItemIcons; var anyIcon = false;
      itemsEl.innerHTML = items.map(function (it, i) { var ic = it.itemId && IIc ? IIc.html(it.itemId, { size: 48 }) : ''; if (ic) anyIcon = true; return '<div class="rw-item' + (ic ? ' has-icon' : '') + (it.disabled ? ' disabled' : '') + (it.cls ? ' ' + it.cls : '') + '" role="option" tabindex="-1"' + (it.disabled ? ' aria-disabled="true"' : '') + ' data-i="' + i + '">' + ic + '<span class="l">' + esc(it.label) + '</span>' + (it.right !== undefined ? '<span class="r">' + esc(it.right) + '</span>' : '') + (it.sub ? '<div class="s">' + esc(it.sub) + '</div>' : '') + '</div>'; }).join('') || '<div class="rw-item disabled" aria-disabled="true">（なし）</div>';
      // 絵のある一覧：詳細つきなら大きさが一律の窓（.rw-fixed）にして、PC は一覧（左）と詳細（右）を並べる（styles/item-icons.css）。絵のない一覧は今までどおり
      if (anyIcon) { itemsEl.classList.add('has-icons'); node.classList.add('rw-has-icons'); if (preview) node.classList.add('rw-fixed'); }
      var itemEls = itemsEl.querySelectorAll('.rw-item'); var armed = -1;
      function remember() { if (opts.key) MEM[opts.key] = { cur: cur, scroll: itemsEl.scrollTop }; }
      function render(noScroll) { itemEls.forEach(function (o, i) { o.classList.toggle('cur', i === cur); o.setAttribute('aria-selected', i === cur ? 'true' : 'false'); }); if (infoEl && items.length) infoEl.innerHTML = opts.info(cur) || ''; if (okEl) okEl.classList.toggle('disabled', !items.length || !!(items[cur] && items[cur].disabled)); var c = itemEls[cur]; if (!noScroll && c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest' }); }
      function finish(v) { remember(); h.close(); resolve(v); }
      function choose() { if (!items.length) return; if (items[cur].disabled) return; finish(cur); }
      function member(i) { var n = MB.list.length; finish({ member: ((i % n) + n) % n, index: cur }); }
      var memArrows = !!(MB && MB.arrows && !opts.tabs && !opts.columns);
      var h = open(node, {
        ok: choose,
        cancel: function () { if (opts.cancel === false) return; finish(-1); },
        up: function () { if (!items.length) return; cur = (cur + items.length - 1) % items.length; armed = cur; render(); },
        down: function () { if (!items.length) return; cur = (cur + 1) % items.length; armed = cur; render(); },
        left: function () { if (opts.tabs) { finish({ tab: (opts.tab + opts.tabs.length - 1) % opts.tabs.length }); return; } if (memArrows) { member(MB.cur - 1); return; } if (opts.columns && items.length) { cur = Math.max(0, cur - opts.columns); render(); } },
        right: function () { if (opts.tabs) { finish({ tab: (opts.tab + 1) % opts.tabs.length }); return; } if (memArrows) { member(MB.cur + 1); return; } if (opts.columns && items.length) { cur = Math.min(items.length - 1, cur + opts.columns); render(); } },
        prev: MB ? function () { member(MB.cur - 1); } : null,
        next: MB ? function () { member(MB.cur + 1); } : null
      });
      if (MB) Win.bindMemberBar(node, MB, member, function () { return isTop(h); });
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
  // opts.onPage（v9.2）：noClose のパネルで Q（-1）／E（+1）を押したときに呼ぶ（onKey には渡さない：既存の画面の動きを変えない）
  Win.panel = function (html, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var foot = opts.noClose ? '' : opts.quit
        ? '<div class="rw-panel-foot"><div class="rw-panel-close">' + esc(opts.closeLabel || '閉じる') + '（Enter）</div><div class="rw-panel-quit">' + esc(opts.quit === true ? '中断する' : opts.quit) + '（Esc）</div></div>'
        : '<div class="rw-panel-close">' + esc(opts.closeLabel || '閉じる') + '（Enter / ✕）</div>';
      var node = el('<div class="rw-panel ' + (opts.cls || '') + '">' + html + foot + '</div>');
      var hd = opts.noClose ? (function () { var o = {}; if (opts.onCancel) o.cancel = function () { opts.onCancel(); }; if (opts.onOk) o.ok = function () { opts.onOk(); }; if (opts.onKey) ['up', 'down', 'left', 'right'].forEach(function (k) { o[k] = function () { opts.onKey(k); }; }); if (opts.onPage) { o.prev = function () { opts.onPage(-1); }; o.next = function () { opts.onPage(1); }; } return o; })() : { ok: function () { h.close(); resolve(0); }, cancel: function () { h.close(); resolve(opts.quit ? 'quit' : -1); } };
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
