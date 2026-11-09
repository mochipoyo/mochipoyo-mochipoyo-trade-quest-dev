/* =========================================================
   UI / ChartCtl（v9.1）：チャートの操作（十字線・拡大縮小・スクロール・高値安値の指定・損切り／利確の線のドラッグ）
   ・Pointer Events で、マウス・タッチ・ペンを同じ処理で扱う。touch-action はチャートの canvas だけ none（ページの他の所のスクロールは変えない）
     チャートの上で指 1 本を縦に動かしたときは、外側のスクロールできる枠を動かす（チャートの上からでも画面を読み進められる）
   ・指 1 本の横ドラッグ／マウスのドラッグ：過去へスクロール。2 本指のピンチ：2 本の指の真ん中を中心に拡大縮小。ダブルタップ・ダブルクリック：拡大と元に戻す
     長押し（タッチ）：十字線を出して、そのまま指を動かすと十字線が動く。マウス：動かすだけで十字線。ホイール：拡大縮小（Shift＋ホイールで横スクロール）
     キー（チャートを選んだとき）：← → スクロール（十字線があれば 1 本ずつ動かす）・＋ − 拡大縮小・0 元に戻す・Esc 十字線を消す
   ・表示する足は、渡された足（判断の時点までの確定足）だけ。右へスクロールしても、最新の足より先（未来）は出ない（end は最新の足で止まる）
   ・状態：st = { visible（表示する本数）, end（右端の足の番号。null＝最新）, cross（{ index, y } または null） }
   ・ChartCtl.attach(canvas, o)。o：{ count()（足の本数）, st, min, max, defVisible, render()（描き直し）, onCross(info), onTap(x, y, map), lineAt(y)（ドラッグできる線 'sl'|'tp'|null）, onLine(kind, price, phase), pick()（指定の待ち中なら true）, scrollEl }
     返り値：{ detach, reset, zoom(f, x), pan(n), st }。ChartCtl.active＝付いている数（後片付けの確かめ用）
   ========================================================= */
(function (root) {
  'use strict';
  var CC = { active: 0, LONG_MS: 380, TAP_MS: 320, DBL_MS: 320, MOVE_PX: 7 };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function scrollParent(el) { var p = el && el.parentElement; while (p && p !== document.body) { var cs = root.getComputedStyle ? root.getComputedStyle(p) : null; if (cs && /(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 2) return p; p = p.parentElement; } return document.scrollingElement || document.documentElement; }
  CC.attach = function (canvas, o) {
    var st = o.st; var MIN = o.min || 20, MAX = o.max || 200, DEF = o.defVisible || st.visible || 72;
    var ptrs = {}; var mode = null; var g = null; var lastTap = null; var longT = null; var dead = false;
    function n() { return Math.max(1, o.count()); }
    function endIdx() { var N = n(); return st.end === null || st.end === undefined ? N - 1 : clamp(st.end, Math.min(N - 1, Math.max(0, Math.min(st.visible, N) - 1)), N - 1); }
    function norm() { var N = n(); st.visible = clamp(Math.round(st.visible), Math.min(MIN, N), Math.max(Math.min(MAX, N), Math.min(MIN, N))); if (st.end !== null && st.end !== undefined) { st.end = clamp(Math.round(st.end), Math.min(N - 1, st.visible - 1), N - 1); if (st.end >= N - 1) st.end = null; } }
    function map() { return canvas._map || null; }
    function pos(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    // v9.1 描き直しは 12ms に 1 回まで（ピンチの 2 本の指・速いマウスの動きで、同じ画面を何度も描かない）。間に合わなかった分は最後の状態で 1 回描く
    var lastR = 0, pendR = null;
    function redraw() { norm(); var now = Date.now(); if (!pendR && now - lastR >= 12) { lastR = now; o.render(); return; }
      if (!pendR) pendR = setTimeout(function () { pendR = null; if (dead) return; lastR = Date.now(); norm(); o.render(); }, 16); }
    function setCross(x, y) { var mp = map(); if (!mp) return; var i = mp.xToIndex(x); st.cross = { index: i, y: y }; redraw(); if (o.onCross) o.onCross(CC.info(mp, st.cross)); }
    function clearCross() { if (!st.cross) return; st.cross = null; redraw(); if (o.onCross) o.onCross(null); }
    // 拡大縮小：ax（canvas の x）の下の足が、拡大のあとも同じ x に来るように
    function zoom(f, ax) { var mp = map(); var N = n(); var E = endIdx(); var vis0 = Math.min(st.visible, N); var s0 = E - vis0 + 1; var nv = clamp(Math.round(vis0 * f), Math.min(MIN, N), Math.min(MAX, N));
      if (mp && ax !== undefined) { var plotW = mp.plotW; var rel = clamp((ax - mp.padL) / plotW, 0, 1); var anchor = s0 + rel * vis0; var ns = anchor - rel * nv; st.end = Math.round(ns + nv - 1); } else st.end = E;
      st.visible = nv; redraw(); }
    function pan(bars) { var E = endIdx(); st.end = E + bars; redraw(); }
    function reset() { st.visible = DEF; st.end = null; st.cross = null; redraw(); if (o.onCross) o.onCross(null); }
    function down(e) {
      if (dead) return; var p = pos(e); ptrs[e.pointerId] = { x: p.x, y: p.y, x0: p.x, y0: p.y, t: Date.now(), type: e.pointerType };
      try { canvas.setPointerCapture(e.pointerId); } catch (er) { }
      var ids = Object.keys(ptrs);
      if (ids.length === 2) { clearTimeout(longT); var a = ptrs[ids[0]], b = ptrs[ids[1]]; mode = 'pinch'; g = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, vis: st.visible, cx: (a.x + b.x) / 2, end: endIdx() }; return; }
      if (ids.length > 2) return;
      g = { x: p.x, y: p.y, end: endIdx(), t: Date.now(), type: e.pointerType, scroll: null };
      if (o.pick && o.pick()) { mode = 'pick'; return; }
      var ln = o.lineAt ? o.lineAt(p.y, e.pointerType) : null; if (ln) { mode = 'line'; g.kind = ln; e.preventDefault(); return; }
      mode = 'pending';
      if (e.pointerType === 'touch' || e.pointerType === 'pen') { clearTimeout(longT); longT = setTimeout(function () { if (mode === 'pending') { mode = 'cross'; setCross(g.x, g.y); } }, CC.LONG_MS); }
    }
    function move(e) {
      if (dead) return; var p = pos(e); var q = ptrs[e.pointerId];
      if (!q) { if (e.pointerType === 'mouse' && !e.buttons && !(o.pick && o.pick())) { var mp0 = map(); if (mp0 && p.x >= mp0.padL && p.x <= mp0.padL + mp0.plotW) setCross(p.x, p.y); } return; }
      q.x = p.x; q.y = p.y;
      if (mode === 'pinch') { var ids = Object.keys(ptrs); if (ids.length < 2) return; var a = ptrs[ids[0]], b = ptrs[ids[1]]; var d = Math.hypot(a.x - b.x, a.y - b.y) || 1; st.visible = g.vis; st.end = g.end; zoom(g.d / d, g.cx); return; }
      var dx = p.x - g.x, dy = p.y - g.y;
      if (mode === 'pending' && Math.hypot(dx, dy) >= CC.MOVE_PX) { clearTimeout(longT); mode = (g.type === 'mouse' || Math.abs(dx) >= Math.abs(dy)) ? 'pan' : 'scroll'; if (mode === 'scroll') { g.scroll = o.scrollEl ? o.scrollEl() : scrollParent(canvas); g.st = g.scroll ? g.scroll.scrollTop : 0; } }
      if (mode === 'pan') { var mp = map(); var slot = mp ? mp.slot : 8; st.end = g.end - Math.round(dx / slot); redraw(); if (e.pointerType === 'mouse') setCross(p.x, p.y); }
      else if (mode === 'scroll') { if (g.scroll) g.scroll.scrollTop = g.st - dy; }
      else if (mode === 'cross') setCross(p.x, p.y);
      else if (mode === 'line') { var mp2 = map(); if (mp2 && o.onLine) o.onLine(g.kind, mp2.yToPrice(p.y), 'move'); }
      if (mode && mode !== 'scroll') e.preventDefault();
    }
    function up(e) {
      if (dead) return; var q = ptrs[e.pointerId]; delete ptrs[e.pointerId]; clearTimeout(longT); var p = pos(e);
      if (mode === 'pinch') { if (!Object.keys(ptrs).length) mode = null; return; }
      if (!q) return; var quick = Date.now() - q.t <= CC.TAP_MS && Math.hypot(p.x - q.x0, p.y - q.y0) < CC.MOVE_PX;
      if (mode === 'line') { var mp2 = map(); if (mp2 && o.onLine) o.onLine(g.kind, mp2.yToPrice(p.y), 'end'); mode = null; return; }
      if (mode === 'pick') { mode = null; if (quick || q.type === 'mouse') { var mp3 = map(); if (o.onTap && mp3) o.onTap(p.x, p.y, mp3); } return; }
      if (mode === 'pending' && quick) {
        var now = Date.now(); if (lastTap && now - lastTap.t <= CC.DBL_MS && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30) { lastTap = null; if (q.type !== 'mouse') { st.cross = null; if (o.onCross) o.onCross(null); } if (st.visible < DEF || st.end !== null) reset(); else zoom(0.5, p.x); mode = null; return; }
        lastTap = { t: now, x: p.x, y: p.y };
        if (q.type !== 'mouse') { if (st.cross) clearCross(); else setCross(p.x, p.y); }   // タップ：十字線を出す・消す
        if (o.onTap) { var mp4 = map(); if (mp4) o.onTap(p.x, p.y, mp4); }
      }
      if (mode !== 'cross') mode = null; else if (!Object.keys(ptrs).length) mode = null;
    }
    function cancel(e) { delete ptrs[e.pointerId]; clearTimeout(longT); if (!Object.keys(ptrs).length) mode = null; }
    function resetPtrs() { ptrs = {}; clearTimeout(longT); mode = null; g = null; }   // 画面の切り替え・ほかの窓へ移ったとき：指・ボタンの状態を残さない
    function leave(e) { if (e.pointerType === 'mouse' && !Object.keys(ptrs).length) clearCross(); }
    function wheel(e) { if (dead) return; e.preventDefault(); var p = pos(e); if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { var mp = map(); var dd = e.shiftKey ? e.deltaY : e.deltaX; pan(Math.round(dd / ((mp && mp.slot) || 8))); return; } zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, p.x); }
    function dbl(e) { e.preventDefault(); }   // ダブルクリックは pointerup の 2 回で扱う（拡大・元に戻す）
    function key(e) {
      var k = e.key; var mp = map(); var handled = true;
      if (k === 'ArrowLeft' || k === 'ArrowRight') { var dir = k === 'ArrowLeft' ? -1 : 1; if (st.cross && mp) { var i = clamp(st.cross.index + dir, 0, n() - 1); var E = endIdx(); if (i > E) pan(1); if (i < E - Math.min(st.visible, n()) + 1) pan(-1); st.cross.index = i; redraw(); if (o.onCross) o.onCross(CC.info(map(), st.cross)); } else pan(dir * (e.shiftKey ? 10 : 2)); }
      else if (k === '+' || k === '=' || k === ';') zoom(1 / 1.25, mp ? mp.padL + mp.plotW / 2 : undefined);
      else if (k === '-' || k === '_') zoom(1.25, mp ? mp.padL + mp.plotW / 2 : undefined);
      else if (k === '0' || k === 'Home') reset();
      else if (k === 'Escape') clearCross();
      else if (k === 'Enter' && !st.cross && mp) setCross(mp.padL + mp.plotW - mp.slot / 2, mp.yPrice0 + mp.hPrice / 2);
      else handled = false;
      if (handled) { e.preventDefault(); e.stopPropagation(); }
    }
    function ctx(e) { e.preventDefault(); }
    canvas.classList.add('chart-ctl'); if (!canvas.hasAttribute('tabindex')) canvas.setAttribute('tabindex', '0'); canvas.setAttribute('aria-label', 'チャート（ドラッグ：スクロール・ピンチ／ホイール：拡大縮小・長押し／マウス：十字線・キー：← → ＋ − 0 Esc）');
    function lost(e) { if (ptrs[e.pointerId] && mode !== 'pinch' && mode !== 'cross') { delete ptrs[e.pointerId]; if (!Object.keys(ptrs).length) mode = null; } }
    var L = [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', cancel], ['pointerleave', leave], ['lostpointercapture', lost], ['wheel', wheel, { passive: false }], ['dblclick', dbl], ['keydown', key], ['contextmenu', ctx]];
    L.forEach(function (x) { canvas.addEventListener(x[0], x[1], x[2] || false); }); CC.active++;
    // （resize では消さない：スマホはアドレスバーの出入りでドラッグ中にも resize が来る）
    var W2 = [['blur', resetPtrs]]; W2.forEach(function (x) { root.addEventListener(x[0], x[1]); }); var vis = function () { if (document.hidden) resetPtrs(); }; document.addEventListener('visibilitychange', vis);
    var api = { st: st, zoom: zoom, pan: pan, reset: reset, clearCross: clearCross, setCrossAt: setCross,
      detach: function () { if (dead) return; dead = true; clearTimeout(longT); clearTimeout(pendR); L.forEach(function (x) { canvas.removeEventListener(x[0], x[1], x[2] || false); }); W2.forEach(function (x) { root.removeEventListener(x[0], x[1]); }); document.removeEventListener('visibilitychange', vis); CC.active = Math.max(0, CC.active - 1); } };
    return api;
  };
  // 十字線の位置の値（足の OHLC・指標）。an は描いた解析結果（判断の時点までの確定足だけ）
  // 架空の相場の時刻（分）→「N日目 HH:MM」。足の t は相場の始まりからの分
  CC.clock = function (min) { if (!isFinite(min)) return ''; var d = Math.floor(min / 1440), m = Math.round(min - d * 1440); var hh = Math.floor(m / 60), mm = m % 60; return (d + 1) + '日目 ' + (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; };
  CC.info = function (mp, cr) {
    if (!mp || !cr || !mp.an) return null; var an = mp.an; var i = clamp(cr.index, 0, an.candles.length - 1); var c = an.candles[i]; var e = function (k) { var v = an.emas[k][i]; return v === null || v === undefined ? null : v; };
    var piv = (mp.pivots || []).filter(function (p) { return p.index === i; })[0] || null;
    return { index: i, fromEnd: an.candles.length - 1 - i, o: c.o, h: c.h, l: c.l, c: c.c, t: c.t, ema: [e(0), e(1), e(2)], rci: an.rci[i], macd: an.macd.line[i], signal: an.macd.signal[i], hist: an.macd.hist[i], price: mp.inPrice(cr.y) ? mp.yToPrice(cr.y) : null, pivot: piv, future: !!(an.revealedCount && i >= an.candles.length - an.revealedCount) };
  };
  root.ChartCtl = CC;
  if (typeof module !== 'undefined' && module.exports) module.exports = CC;
})(typeof window !== 'undefined' ? window : globalThis);
