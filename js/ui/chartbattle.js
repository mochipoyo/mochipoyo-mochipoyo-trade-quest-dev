/* =========================================================
   UI / ChartBattleUI：必殺技・修行・試験で開く「いま動くチャート」（HTML と Canvas を戦闘画面の上に重ねる。2D 版・3D 版で共通）
   ・相場はすべて架空のシミュレーション（js/rpg/market.js）。画面に「シミュレーション相場」と出す。実在の銘柄・実際の値動きではない
   ・開いた時点で過去の足 40〜60 本（ズームで変えられる）を表示し、判断している間も足ができていく（判断の時間は設定で変えられる。初期は12秒）
   ・ロング（買い）／ショート（売り）／見送りを1回だけ選ぶ。時間切れは見送り。エントリーは選んだ瞬間の価格（スプレッド込み）
     損切り＝ATR×1.0、利確＝ATR×1.8、最大12本で時間切れ決済（Market.settle）。決済まで足を進めて、損益を見せる
   ・未来の足は、その時刻になるまで描かない（描くのは Market.Sim が「いま見えている」と言った足だけ）。選んだあとにチャートを作り直すことはない
   ・操作：PC＝ボタン・キーボード（↑/W/L＝ロング、↓/S＝ショート、X/Esc/K＝見送り、＋/－＝ズーム、Enter＝次へ）・マウスのホイール（ズーム）・ドラッグ（過去へスクロール）
           スマホ＝大きなボタン・＋／－・ドラッグ。縦向き・横向きのどちらでも、ボタンとチャートが重ならない配置（styles.css の .chart-battle）
   ・タブを切り替える・画面を隠すと時計を止める（visibilitychange）。閉じるまで成績は書き込まない（途中で再読み込みしてもセーブは壊れない）
   ・設定：判断の時間（8〜30秒）、チャートの更新（標準／軽量：描画の回数と解像度を下げる）、必殺技の演出（ふつう／控えめ。OS の「視差効果を減らす」でも控えめ）
   ・UltimateBattleEffects（ChartBattleUI.cutin）：戦闘で必殺技を出す瞬間の名前の帯。演出の本体（命中・数字）は既存の FX65（js/data/fx65.js）
   ========================================================= */
(function (root) {
  'use strict';
  var Win = root.Win, Market = root.Market;
  var CB = { isOpen: false, last: null };
  var COL = { bg: '#0b1226', grid: 'rgba(255,255,255,0.06)', text: '#c9d2e8', up: '#4cc38a', down: '#e5484d', ema: ['#ffd24a', '#ff8a3a', '#c94aff'], rci: '#5ab0ff', macd: '#5ab0ff', signal: '#ff8a3a',
    histUp: 'rgba(76,195,138,0.7)', histDown: 'rgba(229,72,77,0.7)', sl: '#e5484d', tp: '#4cc38a', entry: '#ffffff', level: 'rgba(255,176,74,0.9)', band: 'rgba(201,160,255,0.10)', bandEdge: 'rgba(201,160,255,0.22)', swingH: '#ffd24a', swingL: '#7fd4ff' };
  var IND_NAME = { ema: 'EMA20・30・40', rci: 'RCI(9)', macd: 'MACD(6,13,4)', levels: '直近の高値・安値', range: 'レンジの帯', swings: '高値・安値の印', mtf: '上位足の小窓', atr: 'ATR（平均の値幅）', rr: '損切り・利確の幅' };
  CB.IND_NAME = IND_NAME;
  var SUB = Market ? Market.SUB : 8;
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function now() { return (root.performance && root.performance.now) ? root.performance.now() : Date.now(); }
  function reducedMotion() { try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  CB.settings = function () {
    var st = (root.State && root.State.data && root.State.data.settings) || {};
    var sec = +st.ultTime; if (!(sec >= 5 && sec <= 60)) sec = 12;
    return { decideMs: sec * 1000, light: st.ultChart === 'light', calm: st.ultFx === 'calm' || reducedMotion() };
  };
  CB.TIME_OPTIONS = [8, 12, 16, 20, 30];
  function tfName(m) { return m >= 60 ? (m / 60) + '時間足' : m + '分足'; }
  CB.tfName = tfName;
  function fmtPx(v) { return (Math.round(v * 1000) / 1000).toFixed(3); }
  function fmtPips(p) { return (p > 0 ? '+' : '') + (Math.round(p * 10) / 10).toFixed(1) + 'pips'; }

  // ある時点（bar 本目の tick 番目）までに見えている足（最後は形成中）。Market.Sim.visibleBars と同じ作り方
  function barsAt(s, bar, tick) {
    var out = s.bars.slice(0, bar); var tk = s.ticks[bar].slice(0, tick + 1); var o = bar > 0 ? s.bars[bar - 1].c : tk[0];
    out.push({ o: o, h: Math.max(o, Math.max.apply(null, tk)), l: Math.min(o, Math.min.apply(null, tk)), c: tk[tk.length - 1], partial: tick < SUB - 1 });
    return out;
  }
  CB.barsAt = barsAt;
  function swingsOf(bars, from, to, depth) {
    var hs = [], ls = [];
    for (var i = Math.max(from, depth); i <= to - depth; i++) { var isH = true, isL = true; for (var k = 1; k <= depth; k++) { if (bars[i - k].h > bars[i].h || bars[i + k].h > bars[i].h) isH = false; if (bars[i - k].l < bars[i].l || bars[i + k].l < bars[i].l) isL = false; } if (isH) hs.push(i); if (isL) ls.push(i); }
    return { hs: hs, ls: ls };
  }

  /* ---------- 描画 ---------- */
  // v: { bars, ind, show, zoom, off, tf, pip, entry:{bar, price, sl, tp, side}, exit:{bar, price, reason}, atr }
  function draw(ctx, W, H, v) {
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
    var bars = v.bars, ind = v.ind, show = v.show; var N = bars.length; if (N < 2) return;
    var n = v.zoom; var end = Math.max(Market.WARM, N - 1 - v.off); var start = Math.max(Market.WARM, end - n + 1);
    var padR = W < 420 ? 48 : 58, padL = 4, padT = 4;
    var subs = []; if (show.rci) subs.push('rci'); if (show.macd) subs.push('macd');
    var subH = subs.length ? Math.max(36, Math.round(H * (subs.length === 2 ? 0.17 : 0.22))) : 0;
    var mainH = H - subs.length * subH - padT; var plotW = W - padR - padL; var bw = plotW / n;
    function xOf(i) { return padL + (i - start + 0.5) * bw; }
    // 価格の範囲
    var lo = Infinity, hi = -Infinity, i, k;
    for (i = start; i <= end; i++) { if (bars[i].l < lo) lo = bars[i].l; if (bars[i].h > hi) hi = bars[i].h; if (show.ema) for (k = 0; k < 3; k++) { var ev0 = ind.ema[k][i]; if (ev0 !== null && ev0 !== undefined) { lo = Math.min(lo, ev0); hi = Math.max(hi, ev0); } } }
    if (v.entry) { [v.entry.sl, v.entry.tp, v.entry.price].forEach(function (p) { lo = Math.min(lo, p); hi = Math.max(hi, p); }); }
    // レンジの帯（直近60本）・直近の高値安値（直近40本）は、いまの時点の確定した足から。表示の範囲に入れる（線が画面の外に出ないように）
    var rh = -Infinity, rl = Infinity, lh = -Infinity, ll = Infinity;
    if (show.range) { for (i = Math.max(Market.WARM, N - 61); i < N - 1; i++) { rh = Math.max(rh, bars[i].h); rl = Math.min(rl, bars[i].l); } if (isFinite(rh) && v.off === 0) { lo = Math.min(lo, rl); hi = Math.max(hi, rh); } }
    if (show.levels) { for (i = Math.max(Market.WARM, N - 41); i < N - 1; i++) { lh = Math.max(lh, bars[i].h); ll = Math.min(ll, bars[i].l); } if (isFinite(lh) && v.off === 0) { lo = Math.min(lo, ll); hi = Math.max(hi, lh); } }
    var cur = bars[N - 1].c; var A = v.atr || ((hi - lo) / 10);
    if (show.rr && !v.entry) { lo = Math.min(lo, cur - 1.85 * A); hi = Math.max(hi, cur + 1.85 * A); }
    var pad = (hi - lo) * 0.06 || 0.01; lo -= pad; hi += pad;
    function yP(p) { return padT + 4 + (hi - p) / (hi - lo) * (mainH - 8); }
    // 目盛り
    ctx.font = (W < 420 ? 9 : 10) + 'px sans-serif'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = COL.grid; ctx.lineWidth = 1; ctx.fillStyle = COL.text; ctx.textAlign = 'left';
    for (k = 0; k <= 4; k++) { var gp = lo + (hi - lo) * k / 4; var gy = yP(gp); ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(W - padR, gy); ctx.stroke(); ctx.fillText(fmtPx(gp), W - padR + 4, gy); }
    // レンジの帯（直近60本の高値・安値。上下20%を濃く）
    if (show.range) {
      if (isFinite(rh)) { var y1 = yP(rh), y2 = yP(rl), z = (y2 - y1) * 0.2; ctx.fillStyle = COL.band; ctx.fillRect(padL, y1, plotW, y2 - y1); ctx.fillStyle = COL.bandEdge; ctx.fillRect(padL, y1, plotW, z); ctx.fillRect(padL, y2 - z, plotW, z);
        ctx.fillStyle = '#c9a0ff'; ctx.textAlign = 'left'; ctx.fillText('上限', padL + 3, y1 + 8); ctx.fillText('下限', padL + 3, y2 - 8); }
    }
    // 直近の高値・安値（確定した足の直近40本）
    if (show.levels) {
      if (isFinite(lh)) { ctx.setLineDash([5, 4]); ctx.strokeStyle = COL.level; ctx.lineWidth = 1.2; [[lh, '直近の高値'], [ll, '直近の安値']].forEach(function (q) { var yy = yP(q[0]); ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(W - padR, yy); ctx.stroke(); ctx.fillStyle = COL.level; ctx.textAlign = 'right'; ctx.fillText(q[1], W - padR - 4, yy + (q[1] === '直近の高値' ? -7 : 7)); }); ctx.setLineDash([]); }
    }
    // ローソク足
    var cw = Math.max(1, Math.min(14, bw * 0.66));
    for (i = start; i <= end; i++) {
      var b = bars[i]; var up = b.c >= b.o; var x = xOf(i); ctx.strokeStyle = up ? COL.up : COL.down; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, yP(b.h)); ctx.lineTo(Math.round(x) + 0.5, yP(b.l)); ctx.stroke();
      var yo = yP(b.o), yc = yP(b.c); var top = Math.min(yo, yc), hh = Math.max(1, Math.abs(yc - yo));
      if (b.partial) { ctx.globalAlpha = 0.85; ctx.fillRect(x - cw / 2, top, cw, hh); ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.strokeRect(x - cw / 2 - 1.5, top - 1.5, cw + 3, hh + 3); }
      else ctx.fillRect(x - cw / 2, top, cw, hh);
    }
    // EMA
    if (show.ema) for (k = 0; k < 3; k++) { var e = ind.ema[k]; ctx.strokeStyle = COL.ema[k]; ctx.lineWidth = 1.4; ctx.beginPath(); var st0 = false; for (i = start; i <= end; i++) { if (e[i] === null || e[i] === undefined) continue; var ex = xOf(i), ey = yP(e[i]); if (!st0) { ctx.moveTo(ex, ey); st0 = true; } else ctx.lineTo(ex, ey); } ctx.stroke(); }
    // 高値・安値の印（確定したものだけ：左右3本ずつより高い・低い足。最新の3本はまだ確定しない）
    if (show.swings) {
      var sw = swingsOf(bars, Math.max(Market.WARM, start - 3), N - 2, 3);
      sw.hs.forEach(function (j) { if (j < start || j > end) return; var xx = xOf(j), yy = yP(bars[j].h) - 6; ctx.fillStyle = COL.swingH; ctx.beginPath(); ctx.moveTo(xx - 4, yy - 6); ctx.lineTo(xx + 4, yy - 6); ctx.lineTo(xx, yy); ctx.fill(); });
      sw.ls.forEach(function (j) { if (j < start || j > end) return; var xx = xOf(j), yy = yP(bars[j].l) + 6; ctx.fillStyle = COL.swingL; ctx.beginPath(); ctx.moveTo(xx - 4, yy + 6); ctx.lineTo(xx + 4, yy + 6); ctx.lineTo(xx, yy); ctx.fill(); });
    }
    // 損切り・利確の幅（エントリー前：上下どちらにも同じ幅を出す。向きのヒントにはしない）
    if (show.rr && !v.entry && A > 0) {
      var rx = W - padR - 10; ctx.lineWidth = 2;
      [[1.0, 'rgba(229,72,77,0.8)', '損切り幅 ATR×1.0'], [1.8, 'rgba(76,195,138,0.8)', '利確幅 ATR×1.8']].forEach(function (q, qi) {
        ctx.strokeStyle = q[1]; var xq = rx - qi * 8; ctx.beginPath(); ctx.moveTo(xq, yP(cur + q[0] * A)); ctx.lineTo(xq, yP(cur - q[0] * A)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(xq - 4, yP(cur + q[0] * A)); ctx.lineTo(xq + 4, yP(cur + q[0] * A)); ctx.moveTo(xq - 4, yP(cur - q[0] * A)); ctx.lineTo(xq + 4, yP(cur - q[0] * A)); ctx.stroke();
      });
      ctx.fillStyle = COL.text; ctx.textAlign = 'right'; ctx.fillText('±ATR×1.0／×1.8', rx - 14, yP(cur + 1.8 * A) + 2);
    }
    // ポジション
    if (v.entry) {
      var en = v.entry; var x0 = xOf(Math.max(start, en.bar)); var xe = v.exit ? xOf(Math.min(end, v.exit.bar)) : W - padR;
      if (en.bar <= end) {
        ctx.fillStyle = en.side === 'long' ? 'rgba(76,195,138,0.08)' : 'rgba(229,72,77,0.08)'; ctx.fillRect(x0, padT, Math.max(2, xe - x0), mainH);
        [[en.tp, COL.tp, '利確 '], [en.sl, COL.sl, '損切り ']].forEach(function (q) { var yy = yP(q[0]); ctx.setLineDash([6, 4]); ctx.strokeStyle = q[1]; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(W - padR, yy); ctx.stroke(); ctx.setLineDash([]); var tx = q[2] + fmtPx(q[0]); var tw = ctx.measureText(tx).width || 60; ctx.fillStyle = q[1]; ctx.textAlign = 'left'; ctx.fillText(tx, Math.max(padL + 2, Math.min(x0 + 3, W - padR - tw - 4)), yy + (q[0] > en.price ? -7 : 7)); });
        var ye = yP(en.price); ctx.strokeStyle = COL.entry; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, ye); ctx.lineTo(W - padR, ye); ctx.stroke();
        ctx.fillStyle = en.side === 'long' ? COL.up : COL.down; ctx.beginPath(); if (en.side === 'long') { ctx.moveTo(x0, ye + 2); ctx.lineTo(x0 - 6, ye + 11); ctx.lineTo(x0 + 6, ye + 11); } else { ctx.moveTo(x0, ye - 2); ctx.lineTo(x0 - 6, ye - 11); ctx.lineTo(x0 + 6, ye - 11); } ctx.fill();
        if (v.exit && v.exit.bar <= end) { var xx2 = xOf(v.exit.bar), yy2 = yP(v.exit.price); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(xx2, yy2, 5, 0, Math.PI * 2); ctx.stroke(); }
      }
    }
    // 印（振り返り：判断した時点など）
    (v.marks || []).forEach(function (mk) { if (mk.bar < start || mk.bar > end) return; var xm = xOf(mk.bar); ctx.setLineDash([4, 3]); ctx.strokeStyle = mk.color || '#ffd24a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(xm, padT); ctx.lineTo(xm, mainH); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = mk.color || '#ffd24a'; ctx.textAlign = xm > W * 0.6 ? 'right' : 'left'; ctx.fillText(mk.label, xm + (xm > W * 0.6 ? -4 : 4), padT + 9 + (mk.row || 0) * 12); });
    // いまの価格
    if (v.off === 0) { var yc0 = yP(cur); ctx.setLineDash([2, 3]); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(padL, yc0); ctx.lineTo(W - padR, yc0); ctx.stroke(); ctx.setLineDash([]); }
    var ycl = Math.max(padT + 7, Math.min(mainH - 4, yP(cur))); ctx.fillStyle = '#e8c15a'; ctx.fillRect(W - padR + 1, ycl - 7, padR - 2, 14); ctx.fillStyle = '#1a1407'; ctx.textAlign = 'left'; ctx.fillText(fmtPx(cur), W - padR + 4, ycl);
    // 凡例
    if (show.ema) { ctx.textAlign = 'left'; var lx = padL + 4, ly = mainH - 6; ['EMA20', 'EMA30', 'EMA40'].forEach(function (t, j) { ctx.fillStyle = COL.ema[j]; ctx.fillText(t, lx, ly); lx += ctx.measureText(t).width + 8; }); }
    // 上位足の小窓
    if (show.mtf) drawUpper(ctx, v, padL + 4, padT + 4, Math.min(plotW * 0.36, 200), Math.min(mainH * 0.36, 110));
    // 下の窓
    subs.forEach(function (kind, si) { var y0 = padT + mainH + si * subH; drawSub(ctx, kind, ind, start, end, xOf, padL, y0, W - padR, subH, bw); });
    // 過去を見ているとき
    if (v.off > 0) { ctx.fillStyle = 'rgba(232,193,90,0.9)'; ctx.textAlign = 'right'; ctx.fillText('過去を表示中（' + v.off + '本前まで）', W - padR - 4, padT + 10); }
  }
  function drawSub(ctx, kind, ind, start, end, xOf, x0, y0, x1, h, bw) {
    ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(x0, y0, x1 - x0, h); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(x0, y0 + 0.5); ctx.lineTo(x1, y0 + 0.5); ctx.stroke();
    var i, v;
    if (kind === 'rci') {
      var yR = function (r) { return y0 + 3 + (100 - r) / 200 * (h - 6); };
      ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(255,210,74,0.45)'; [70, -70].forEach(function (r) { ctx.beginPath(); ctx.moveTo(x0, yR(r)); ctx.lineTo(x1, yR(r)); ctx.stroke(); }); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.moveTo(x0, yR(0)); ctx.lineTo(x1, yR(0)); ctx.stroke();
      ctx.strokeStyle = COL.rci; ctx.lineWidth = 1.4; ctx.beginPath(); var s0 = false; for (i = start; i <= end; i++) { v = ind.rci[i]; if (v === null || v === undefined) continue; if (!s0) { ctx.moveTo(xOf(i), yR(v)); s0 = true; } else ctx.lineTo(xOf(i), yR(v)); } ctx.stroke();
      ctx.fillStyle = COL.text; ctx.textAlign = 'left'; ctx.fillText('RCI(9)　±70', x0 + 4, y0 + 9);
    } else {
      var M = ind.macd; var lo = Infinity, hi = -Infinity; for (i = start; i <= end; i++) { [M.line[i], M.signal[i], M.hist[i]].forEach(function (q) { if (q !== null && q !== undefined) { lo = Math.min(lo, q); hi = Math.max(hi, q); } }); }
      if (!isFinite(lo)) return; var m = Math.max(Math.abs(lo), Math.abs(hi)) || 1e-6; var yM = function (q) { return y0 + h / 2 - q / m * (h / 2 - 4); };
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.moveTo(x0, yM(0)); ctx.lineTo(x1, yM(0)); ctx.stroke();
      var hw = Math.max(1, bw * 0.6); for (i = start; i <= end; i++) { v = M.hist[i]; if (v === null || v === undefined) continue; ctx.fillStyle = v >= 0 ? COL.histUp : COL.histDown; var yy = yM(v), yz = yM(0); ctx.fillRect(xOf(i) - hw / 2, Math.min(yy, yz), hw, Math.max(1, Math.abs(yy - yz))); }
      [[M.line, COL.macd], [M.signal, COL.signal]].forEach(function (q) { ctx.strokeStyle = q[1]; ctx.lineWidth = 1.3; ctx.beginPath(); var s1 = false; for (i = start; i <= end; i++) { v = q[0][i]; if (v === null || v === undefined) continue; if (!s1) { ctx.moveTo(xOf(i), yM(v)); s1 = true; } else ctx.lineTo(xOf(i), yM(v)); } ctx.stroke(); });
      ctx.fillStyle = COL.text; ctx.textAlign = 'left'; ctx.fillText('MACD(6,13,4)', x0 + 4, y0 + 9);
    }
  }
  // 上位足：基本の足 f 本ずつ（形成中の上位足は見えている足だけ）。区切りは足の番号で固定（f の倍数から）
  function upperOf(v) { var f = v.tf >= 15 ? 4 : 3; var off = Math.ceil(Market.WARM / f) * f; var up = Market.aggregate(v.bars, f, off); var closes = up.map(function (b) { return b.c; }); return { f: f, bars: up, ema: root.Indicators.ema(closes, 20), name: tfName(v.tf * f) }; }
  CB.upperOf = upperOf;
  function drawUpper(ctx, v, x, y, w, h) {
    var U = v.upper || upperOf(v); var n = Math.min(24, U.bars.length); if (n < 2) return; var s = U.bars.length - n;
    ctx.fillStyle = 'rgba(8,12,30,0.88)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = 'rgba(90,176,255,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    var lo = Infinity, hi = -Infinity, i; for (i = s; i < U.bars.length; i++) { lo = Math.min(lo, U.bars[i].l); hi = Math.max(hi, U.bars[i].h); if (U.ema[i] !== null) { lo = Math.min(lo, U.ema[i]); hi = Math.max(hi, U.ema[i]); } }
    var top = y + 14, bh = h - 18; var yy = function (p) { return top + (hi - p) / ((hi - lo) || 1e-6) * bh; }; var bw = (w - 8) / n;
    for (i = s; i < U.bars.length; i++) { var b = U.bars[i]; var xx = x + 4 + (i - s + 0.5) * bw; ctx.strokeStyle = b.c >= b.o ? COL.up : COL.down; ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(xx, yy(b.h)); ctx.lineTo(xx, yy(b.l)); ctx.stroke(); var t = Math.min(yy(b.o), yy(b.c)); ctx.globalAlpha = b.partial ? 0.6 : 1; ctx.fillRect(xx - Math.max(1, bw * 0.3), t, Math.max(2, bw * 0.6), Math.max(1, Math.abs(yy(b.o) - yy(b.c)))); ctx.globalAlpha = 1; }
    ctx.strokeStyle = COL.ema[0]; ctx.lineWidth = 1.2; ctx.beginPath(); var st = false; for (i = s; i < U.bars.length; i++) { if (U.ema[i] === null) continue; var ex = x + 4 + (i - s + 0.5) * bw; if (!st) { ctx.moveTo(ex, yy(U.ema[i])); st = true; } else ctx.lineTo(ex, yy(U.ema[i])); } ctx.stroke();
    ctx.fillStyle = '#9fd0ff'; ctx.textAlign = 'left'; ctx.fillText('上位足（' + U.name + '）・EMA20', x + 4, y + 8);
  }
  CB.draw = draw;

  /* ---------- 画面 ---------- */
  // opts: { mode:'battle'|'practice'|'exam', ult, school, ind, tf, scenario, title, sub, prompt, askReason, quitable, decideMs, preview(res)→html, feedback(res)→html, color }
  CB.open = function (opts) {
    opts = opts || {}; var S = CB.settings(); var s = opts.scenario; var mode = opts.mode || 'battle';
    var decideMs = opts.decideMs || S.decideMs; var barMs = Math.max(850, Math.round(decideMs / 16));
    var sim = new Market.Sim(s, { decideMs: decideMs, barMs: barMs, postBarMs: S.calm ? 200 : 260 });
    var ind = {}; (opts.ind || ['ema']).forEach(function (k) { ind[k] = true; }); ind.ema = true;
    var tf = opts.tf || s.tf || 15; var color = opts.color || '#e8c15a';
    var reasons = root.ULT_REASONS || [];
    var head = '<div class="cb-head"><div class="cb-title"><b style="color:' + esc(color) + '">' + esc(opts.title || '') + '</b>' + (opts.sub ? '<span class="cb-sub">' + esc(opts.sub) + '</span>' : '') + '</div>' +
      '<div class="cb-sim">シミュレーション相場｜架空ペア POYO/MOCHI・' + esc(tfName(tf)) + (opts.quitable ? '<button type="button" class="cb-quit">中断</button>' : '') + '</div></div>' +
      (opts.prompt ? '<div class="cb-prompt">' + esc(opts.prompt) + '</div>' : '') +
      '<div class="cb-timer"><span class="cb-tbar"><i></i></span><b class="cb-sec"></b></div>' +
      '<div class="cb-chartbox"><canvas class="cb-canvas"></canvas><div class="cb-flash"></div><div class="cb-banner"></div></div>' +
      '<div class="cb-row"><div class="cb-info"></div><div class="cb-zoom"><button type="button" data-z="-1" aria-label="縮小">－</button><button type="button" data-z="1" aria-label="拡大">＋</button><button type="button" class="cb-latest" data-latest="1" aria-label="最新の足へ">▶最新</button></div></div>' +
      '<div class="cb-cmds"><button type="button" class="cb-btn long" data-act="long">ロング（買い）<small>↑ / L</small></button><button type="button" class="cb-btn skip" data-act="skip">見送り<small>X / K</small></button><button type="button" class="cb-btn short" data-act="short">ショート（売り）<small>↓ / S</small></button></div>' +
      (opts.askReason ? '<div class="cb-reasons hidden"><div class="cb-rq">判断の理由は？（数字キーでも選べる）</div>' + reasons.map(function (r, i) { return '<button type="button" class="cb-rs" data-reason="' + esc(r.key) + '">' + (i + 1) + '. ' + esc(r.label) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="cb-result hidden"></div><div class="cb-nextbox hidden"><button type="button" class="cb-review">振り返り（R）</button><button type="button" class="cb-next">次へ（Enter）</button></div>';
    return new Promise(function (resolve) {
      var node = null, canvas = null, ctx = null, closeFn = null, closed = false, raf = null, timer = null, ro = null;
      var view = { zoom: 48, off: 0 }; var dirty = true, lastDraw = 0, lastKey = '';
      var decided = false, reason = null, resultShown = false, skipPlay = null, out = null, review = null;
      var cache = { key: '', bars: null, ind: null, upper: null };
      function setDecided() { decided = true; node.classList.add('decided'); }
      function curBars() {
        var p = skipPlay ? skipPlay.pos : sim.pos; var key = p.bar + ':' + p.tick;
        if (cache.key !== key) { var bars = skipPlay ? barsAt(s, p.bar, p.tick) : sim.visibleBars(true); cache = { key: key, bars: bars, ind: Market.indicators(bars), upper: null }; if (ind.mtf) cache.upper = upperOf({ bars: bars, tf: tf }); }
        return cache;
      }
      function resize() {
        if (!canvas) return; var r = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: 600, height: 260 }; var dpr = S.light ? 1 : Math.min(2, root.devicePixelRatio || 1);
        var w = Math.max(200, Math.round(r.width || 600)), h = Math.max(120, Math.round(r.height || 260));
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
        view.W = w; view.H = h; view.dpr = dpr; dirty = true;
      }
      function render() {
        if (!ctx) return; var c = curBars(); var R = sim.result && sim.result.entry ? sim.result : null;
        var exitShown = R && (sim.state === 'settled' || sim.state === 'done');
        var v = { bars: c.bars, ind: c.ind, upper: c.upper, show: ind, zoom: view.zoom, off: Math.min(view.off, Math.max(0, c.bars.length - Market.WARM - view.zoom)), tf: tf, atr: c.ind.atr[c.bars.length - 2] || c.ind.atr[c.bars.length - 1],
          entry: R ? { bar: R.entry.bar, price: R.entry.price, sl: R.sl, tp: R.tp, side: R.side } : null, exit: exitShown ? { bar: R.exit.bar, price: R.exit.price, reason: R.exit.reason } : null };
        try { ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0); draw(ctx, view.W, view.H, v); } catch (e) { if (root.console) console.warn('chart', e); }
        lastDraw = now(); dirty = false;
      }
      function info() {
        var c = curBars(); var b = c.bars; var px = b[b.length - 1].c; var A = c.ind.atr[b.length - 2] || 0; var P = s.pip;
        var t = '価格 <b>' + fmtPx(px) + '</b>｜ATR <b>' + (A / P).toFixed(1) + 'pips</b>' + (ind.atr ? '（普段の' + (function () { var as = c.ind.atr.slice(Math.max(0, b.length - 60), b.length - 10).filter(function (x) { return x; }).sort(function (x, y) { return x - y; }); var md = as.length ? as[Math.floor(as.length / 2)] : A; return (A / md).toFixed(1); })() + '倍）' : '') + '｜損切り ATR×1.0・利確 ATR×1.8・最大12本';
        var R = sim.result;
        if (R && R.entry) { var sg = R.side === 'long' ? 1 : -1; var bid = px - sg * R.rules.spreadPips * P / 2; var live = sim.state === 'running' ? sg * (bid - R.entry.price) / P : R.pips; var held = Math.min(12, (sim.state === 'running' ? sim.pos.bar : R.exit.bar) - R.entry.bar);
          t = '<b class="' + (R.side === 'long' ? 'up' : 'down') + '">' + (R.side === 'long' ? 'ロング' : 'ショート') + '</b> ' + fmtPx(R.entry.price) + '｜損益 <b class="' + (live >= 0 ? 'up' : 'down') + '">' + fmtPips(live) + '</b>｜保有 ' + held + '/12本'; }
        else if (decided) t = '見送り' + (sim.decision && sim.decision.auto ? '（時間切れ）' : '') + '｜その後の値動きを表示中（参考）';
        var el = node.querySelector('.cb-info'); if (el && el._t !== t) { el.innerHTML = t; el._t = t; }
      }
      function timerUi(tn) {
        var left = sim.timeLeft(tn); var el = node.querySelector('.cb-sec'); var bar = node.querySelector('.cb-tbar i');
        if (sim.state === 'deciding') { var txt = (left / 1000).toFixed(1) + '秒'; if (el._t !== txt) { el.textContent = txt; el._t = txt; } bar.style.width = (left / decideMs * 100).toFixed(1) + '%'; node.classList.toggle('hurry', left < 3000); }
        else { if (el._t !== '済') { el.textContent = sim.decision ? (sim.decision.side === 'skip' ? '見送り' : '決済まで進行中') : ''; el._t = '済'; } bar.style.width = '0%'; node.classList.remove('hurry'); }
      }
      function flash(cls) { if (S.calm) return; var f = node.querySelector('.cb-flash'); if (!f) return; f.className = 'cb-flash ' + cls; void f.offsetWidth; f.classList.add('on'); }
      function banner(text, cls) { var bn = node.querySelector('.cb-banner'); if (!bn) return; bn.className = 'cb-banner ' + (cls || '') + (S.calm ? ' calm' : ''); bn.textContent = text; void bn.offsetWidth; bn.classList.add('on'); }
      function decide(side) {
        if (decided || closed || sim.state !== 'deciding') return false;
        var ok = sim.decide(side, now(), false); if (!ok) return false;
        setDecided(); flash(side); afterDecide(); dirty = true; return true;
      }
      function afterDecide() {
        if (sim.decision.side === 'skip') { var p = sim.decision.pos; var abs0 = p.bar * SUB + p.tick; var maxAbs = (s.bars.length - 1) * SUB + SUB - 1; skipPlay = { t0: now(), abs0: abs0, end: Math.min(maxAbs, abs0 + 12 * SUB), pos: { bar: p.bar, tick: p.tick } }; }
        if (opts.askReason) node.querySelector('.cb-reasons').classList.remove('hidden');
      }
      function maybeFinish() {
        if (resultShown || !decided) return; var finished = sim.state === 'settled' || (sim.state === 'done' && (!skipPlay || skipPlay.done));
        if (!finished) return; if (opts.askReason && !reason) return;
        showResult();
      }
      function showResult() {
        resultShown = true; sim.finish(); var R = sim.result || { outcome: 'skip' }; var dec = sim.decision;
        out = { mode: mode, side: dec.side, auto: !!dec.auto, decisionMs: Math.round(dec.ms || 0), result: R, assessment: sim.assessment, scenarioId: s.id, cat: s.def.cat, diff: s.def.diff, seed: s.seed, verified: !!s.verified, reason: reason, entryBar: dec.pos.bar, tf: tf };
        var html = '';
        if (R.outcome === 'skip') {
          var p0 = s.ticks[dec.pos.bar][dec.pos.tick]; var pe = skipPlay ? s.ticks[skipPlay.pos.bar][skipPlay.pos.tick] : p0; var mv = (pe - p0) / s.pip;
          html += '<div class="cb-res skip"><b>' + (dec.auto ? '時間切れ：見送り' : '見送り') + '</b>　その後の12本で ' + fmtPips(mv) + ' 動いた（参考）</div>';
          banner(dec.auto ? '時間切れ…見送り' : '見送り', 'skip');
        } else {
          var lab = R.outcome === 'profit' ? (R.exit.reason === 'tp' ? '利確！' : '時間切れ決済（利益）') : R.outcome === 'loss' ? (R.exit.reason === 'sl' ? '損切り' : '時間切れ決済（損失）') : 'ほぼ同値で決済';
          html += '<div class="cb-res ' + R.outcome + '"><b>' + lab + '</b>　' + (R.side === 'long' ? 'ロング' : 'ショート') + ' ' + fmtPx(R.entry.price) + ' → ' + fmtPx(R.exit.price) + '　<b>' + fmtPips(R.pips) + '</b>（損益÷ATR ' + (R.r > 0 ? '+' : '') + R.r.toFixed(2) + '・' + R.bars + '本）<span class="muted small">スプレッド・スリッページ込み</span></div>';
          banner(lab + ' ' + fmtPips(R.pips), R.outcome);
        }
        if (opts.preview) { try { html += opts.preview(out) || ''; } catch (e) { } }
        if (opts.feedback) { try { html += opts.feedback(out) || ''; } catch (e) { } }
        var as = sim.assessment; if (as && opts.showView !== false) html += '<div class="cb-view"><b>判断した瞬間に見えていた状態（簡易的な見立て。正解ではありません）</b>：' + (as.bias === 'long' ? '上向きの根拠が多め' : as.bias === 'short' ? '下向きの根拠が多め' : 'はっきりしない') + '<br>' + as.reasons.slice(0, 4).map(esc).join('／') + '</div>';
        var el = node.querySelector('.cb-result'); el.innerHTML = html; el.classList.remove('hidden'); node.classList.add('result');
        review = CB.reviewRecord(s, sim, { mode: mode, title: opts.title, tf: tf, ind: Object.keys(ind), reason: reason, skipEnd: skipPlay ? skipPlay.pos : null });
        var nb = node.querySelector('.cb-nextbox'); nb.classList.remove('hidden'); var nx = nb.querySelector('.cb-next'); if (nx && !nx._on) { nx._on = true; nx.addEventListener('click', function (e) { e.stopPropagation(); finish(); }); }
        var rv = nb.querySelector('.cb-review'); if (rv && !rv._on) { rv._on = true; rv.addEventListener('click', function (e) { e.stopPropagation(); openReview(); }); }
        info(); dirty = true;
      }
      function openReview() { if (!review || closed || CB._reviewOpen) return; CB._reviewOpen = true; CB.review(review, s).then(function () { CB._reviewOpen = false; }); }
      function finish(quit) {
        if (closed) return; if (!quit && review && root.Ultimates && root.State && root.State.data) { try { root.Ultimates.addReview(root.State.data, review); } catch (e) { } }   // 振り返りの記録（最近10回。メニュー「必殺技」から見られる）
        closed = true; CB.isOpen = false; if (raf && root.cancelAnimationFrame) root.cancelAnimationFrame(raf); if (timer) clearInterval(timer); if (ro) { try { ro.disconnect(); } catch (e) { } }
        document.removeEventListener('keydown', onKeyDoc, true); document.removeEventListener('visibilitychange', onVis); root.removeEventListener('resize', resize); root.removeEventListener('mousemove', move); root.removeEventListener('mouseup', up);
        var st = document.getElementById('stage'); if (st) st.classList.remove('ult-open');
        var r = quit ? { quit: true, mode: mode, scenarioId: s.id } : out; CB.last = r; if (closeFn) closeFn(r); resolve(r);
      }
      function tick() {
        if (closed) return; var tn = now(); var before = sim.state;
        sim.update(tn);
        if (before === 'deciding' && sim.state !== 'deciding' && !decided) { setDecided(); flash('skip'); afterDecide(); }   // 時間切れ（見送り）
        if (skipPlay && !skipPlay.done) { var abs = Math.min(skipPlay.end, skipPlay.abs0 + Math.floor((tn - skipPlay.t0) / ((S.calm ? 200 : 260) / SUB))); skipPlay.pos = { bar: Math.floor(abs / SUB), tick: abs % SUB }; if (abs >= skipPlay.end) skipPlay.done = true; }
        var p = skipPlay ? skipPlay.pos : sim.pos; var key = p.bar + ':' + p.tick + ':' + sim.state;
        if (key !== lastKey) { lastKey = key; dirty = true; }
        var minGap = S.light ? 125 : 33;
        if (dirty && tn - lastDraw >= minGap) { render(); info(); }
        timerUi(tn); maybeFinish();
      }
      function loop() { if (closed) return; tick(); raf = (root.requestAnimationFrame || function (f) { return setTimeout(f, 33); })(loop); }
      var drag = null; function px(e) { return e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX; }
      function down(e) { drag = { x: px(e), off: view.off }; }
      function move(e) { if (!drag || closed) return; var w = view.W || 600; var dx = px(e) - drag.x; var per = (w - 58) / view.zoom; var c = curBars(); var maxOff = Math.max(0, c.bars.length - Market.WARM - view.zoom); var nOff = Math.max(0, Math.min(maxOff, Math.round(drag.off + dx / per))); if (nOff !== view.off) { view.off = nOff; dirty = true; } if (e.cancelable && e.touches) e.preventDefault(); }
      function up() { drag = null; }
      function onVis() { var tn = now(); if (document.hidden) sim.pause(tn); else { sim.resume(tn); if (skipPlay && !skipPlay.done) skipPlay.t0 = tn - ((skipPlay.pos.bar * SUB + skipPlay.pos.tick) - skipPlay.abs0) * ((S.calm ? 200 : 260) / SUB); } }
      function zoom(dz) { var z = [30, 40, 48, 60, 80, 100, 120]; var i = z.indexOf(view.zoom); if (i < 0) i = 2; i = Math.max(0, Math.min(z.length - 1, i - dz)); view.zoom = z[i]; dirty = true; }
      function onKeyDoc(e) {
        if (closed) return; var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
        if (Win.layer && Win.layer.lastElementChild !== node) return;   // 上に別の窓（中断の確認など）があるときは何もしない
        var k = e.key; var used = true;
        if (k === 'l' || k === 'L') decide('long'); else if (k === 'k' || k === 'K') decide('skip'); else if ((k === 'r' || k === 'R') && resultShown) openReview();
        else if (k === '+' || k === '=' || k === ';') zoom(1); else if (k === '-' || k === '_') zoom(-1);
        else if (/^[1-9]$/.test(k) && opts.askReason && decided && !reason) { var rr = reasons[+k - 1]; if (rr) pickReason(rr.key); }
        else used = false;
        if (used) { e.preventDefault(); e.stopPropagation(); }
      }
      function pickReason(key) { if (reason) return; reason = key; node.querySelectorAll('.cb-rs').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-reason') === key); b.disabled = true; }); maybeFinish(); }
      async function quit() {
        if (!opts.quitable || resultShown) return; var tn = now(); sim.pause(tn);
        var yes = await Win.confirmQuit(mode === 'exam' ? '試験' : '修行', mode === 'exam' ? '記録は残りません' : null);
        if (yes) { finish(true); return; } sim.resume(now());
      }
      var st = document.getElementById('stage'); if (st) st.classList.add('ult-open');
      CB.isOpen = true;
      Win.panel(head, { cls: 'chart-battle mode-' + mode + (S.light ? ' light' : '') + (S.calm ? ' calm' : ''), noClose: true,
        onCancel: function () { if (resultShown) finish(); else if (!decided) decide('skip'); },
        onOk: function () { if (resultShown) finish(); },
        onKey: function (k) { if (k === 'up') decide('long'); else if (k === 'down') decide('short'); else if (k === 'left' || k === 'right') { var c0 = curBars(); view.off = Math.max(0, Math.min(Math.max(0, c0.bars.length - Market.WARM - view.zoom), view.off + (k === 'left' ? 6 : -6))); dirty = true; } },
        setup: function (n, close) {
          node = n; closeFn = close; canvas = n.querySelector('.cb-canvas'); try { ctx = canvas.getContext('2d'); } catch (e) { ctx = null; }
          n.querySelectorAll('[data-act]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); decide(b.getAttribute('data-act')); }); });
          n.querySelectorAll('[data-z]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); zoom(+b.getAttribute('data-z')); }); });
          var lt = n.querySelector('[data-latest]'); if (lt) lt.addEventListener('click', function (e) { e.stopPropagation(); view.off = 0; dirty = true; });
          n.querySelectorAll('.cb-rs').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); pickReason(b.getAttribute('data-reason')); }); });
          var q = n.querySelector('.cb-quit'); if (q) q.addEventListener('click', function (e) { e.stopPropagation(); quit(); });
          n.addEventListener('click', function (e) { e.stopPropagation(); });
          // ホイール＝ズーム、ドラッグ＝過去へスクロール（未来へは最新の足まで）
          canvas.addEventListener('wheel', function (e) { e.preventDefault(); zoom(e.deltaY < 0 ? 1 : -1); }, { passive: false });
          canvas.addEventListener('mousedown', down); root.addEventListener('mousemove', move); root.addEventListener('mouseup', up);
          canvas.addEventListener('touchstart', down, { passive: true }); canvas.addEventListener('touchmove', move, { passive: false }); canvas.addEventListener('touchend', up);
          document.addEventListener('keydown', onKeyDoc, true); document.addEventListener('visibilitychange', onVis); root.addEventListener('resize', resize);
          resize(); sim.start(now()); render(); info(); timerUi(now());
          if (root.ResizeObserver) { try { ro = new root.ResizeObserver(function () { if (!closed) resize(); }); ro.observe(canvas); } catch (e) { ro = null; } }
          timer = setInterval(function () { if (!closed && (document.hidden || !root.requestAnimationFrame)) tick(); }, 250);   // 描画が止まる環境でも時計と判定だけは進める
          loop();
        } });
      // テスト・自動操作用（画面のボタンと同じ処理）
      CB.ctl = { decide: decide, reason: pickReason, next: function () { if (resultShown) finish(); }, review: function () { openReview(); }, reviewRecord: function () { return review; }, sim: sim, state: function () { return { sim: sim.state, decided: decided, result: resultShown, reason: reason, zoom: view.zoom, off: view.off }; }, quit: function () { finish(true); } };
    });
  };

  /* ---------- 振り返り：エントリーした時点に見えていたチャートと、実際の値動き（決済まで）を並べる ---------- */
  // 記録：シナリオの ID・シード（Market.generate で同じ値動きを作り直せる）・判断した位置・結果の要点。チャートのデータそのものは保存しない
  CB.reviewRecord = function (s, sim, o) {
    var dec = sim.decision; if (!dec || !dec.pos) return null; var R = sim.result && sim.result.entry ? sim.result : null; var as = sim.assessment;
    var rec = { t: Date.now(), mode: o.mode, title: o.title || '', id: s.id, seed: s.seed >>> 0, tf: o.tf, ind: o.ind || ['ema'], eb: dec.pos.bar, et: dec.pos.tick, side: dec.side, auto: !!dec.auto, reason: o.reason || null,
      chk: Math.round(s.ticks[dec.pos.bar][dec.pos.tick] * 1e5), view: as ? { bias: as.bias, reasons: (as.reasons || []).slice(0, 4) } : null };
    if (R) rec.R = { side: R.side, entry: { bar: R.entry.bar, tick: R.entry.tick, price: R.entry.price }, sl: R.sl, tp: R.tp, exit: { bar: R.exit.bar, tick: R.exit.tick, price: R.exit.price, reason: R.exit.reason }, pips: R.pips, r: R.r, bars: R.bars, outcome: R.outcome };
    else rec.R = { outcome: 'skip' };
    if (o.skipEnd) rec.se = { bar: o.skipEnd.bar, tick: o.skipEnd.tick };
    return rec;
  };
  // 最大の含み益・含み損（スプレッドを除いた中値での目安。エントリーから決済まで）
  CB.excursion = function (s, rec) {
    var R = rec.R; if (!R || !R.entry) return null; var sg = R.side === 'long' ? 1 : -1; var best = 0, worst = 0;
    for (var b = R.entry.bar; b <= R.exit.bar; b++) { var t0 = b === R.entry.bar ? R.entry.tick : 0, t1 = b === R.exit.bar ? R.exit.tick : SUB - 1; for (var k = t0; k <= t1; k++) { var v = sg * (s.ticks[b][k] - R.entry.price) / s.pip; if (v > best) best = v; if (v < worst) worst = v; } }
    return { best: Math.round(best * 10) / 10, worst: Math.round(worst * 10) / 10 };
  };
  // 記録からシナリオを作り直す（同じ値動きか、判断した位置の価格で確かめる）
  CB.rebuild = function (rec) {
    try { var def = Market.def(rec.id); if (!def) return null; var s = Market.generate(def, rec.seed >>> 0); if (!s.ticks[rec.eb] || Math.round(s.ticks[rec.eb][rec.et] * 1e5) !== rec.chk) return null; return s; } catch (e) { return null; }
  };
  CB.review = function (rec, s) {
    s = s || CB.rebuild(rec);
    if (!s) return Win.panel('<div class="rw-title">振り返り</div><div>この記録の値動きを作り直せませんでした（シナリオのデータが変わった可能性があります）。</div>');
    var R = rec.R || { outcome: 'skip' }; var show = {}; (rec.ind || ['ema']).forEach(function (k) { show[k] = true; }); show.ema = true; delete show.mtf; delete show.rr;
    var ex = CB.excursion(s, rec); var tf = rec.tf || s.tf || 15;
    var sum;
    if (R.entry) { var lab = R.outcome === 'profit' ? (R.exit.reason === 'tp' ? '利確' : '時間切れ決済（利益）') : R.outcome === 'loss' ? (R.exit.reason === 'sl' ? '損切り' : '時間切れ決済（損失）') : 'ほぼ同値で決済';
      sum = '<b class="' + (R.side === 'long' ? 'up' : 'down') + '">' + (R.side === 'long' ? 'ロング' : 'ショート') + '</b> ' + fmtPx(R.entry.price) + ' → ' + fmtPx(R.exit.price) + '　<b class="' + (R.pips >= 0 ? 'up' : 'down') + '">' + fmtPips(R.pips) + '</b>（' + lab + '・' + R.bars + '本）' +
        (ex ? '<br>保有中の最大の含み益 <b class="up">' + fmtPips(ex.best) + '</b>／最大の含み損 <b class="down">' + fmtPips(ex.worst) + '</b><span class="muted small">（中値での目安。スプレッドを除く）</span>' : ''); }
    else { var p0 = s.ticks[rec.eb][rec.et]; var se = rec.se || { bar: Math.min(s.bars.length - 1, rec.eb + 12), tick: SUB - 1 }; var mv = (s.ticks[se.bar][se.tick] - p0) / s.pip; sum = '<b>' + (rec.auto ? '時間切れ：見送り' : '見送り') + '</b>　その後の値動き ' + fmtPips(mv) + '（参考）'; }
    var view = rec.view ? '<div class="rv-note"><b>判断した瞬間に見えていた状態</b>（簡易的な見立て。正解ではありません）：' + (rec.view.bias === 'long' ? '上向きの根拠が多め' : rec.view.bias === 'short' ? '下向きの根拠が多め' : 'はっきりしない') + (rec.view.reasons && rec.view.reasons.length ? '<br>' + rec.view.reasons.map(esc).join('／') : '') + '</div>' : '';
    var rs = rec.reason && root.ULT_REASONS ? (root.ULT_REASONS.filter(function (x) { return x.key === rec.reason; })[0] || {}).label : null;
    var html = '<div class="rw-title">振り返り' + (rec.title ? '：' + esc(rec.title) : '') + '</div>' +
      '<div class="rv-sum">' + sum + (rs ? '<br><span class="muted small">選んだ理由：' + esc(rs) + '</span>' : '') + '</div>' +
      '<div class="rv-grid"><figure class="rv-fig"><figcaption>① 判断した時点で見えていたチャート</figcaption><div class="rv-box"><canvas class="rv-c0"></canvas></div></figure>' +
      '<figure class="rv-fig"><figcaption>② 実際の値動き（' + (R.entry ? '決済まで' : 'その後12本') + '）</figcaption><div class="rv-box"><canvas class="rv-c1"></canvas></div></figure></div>' + view +
      '<div class="rv-note muted small">シミュレーション相場（架空ペア・' + esc(tfName(tf)) + '）。結果には運の要素があります。根拠のある判断でも負けることがあり、根拠の弱い判断でも勝つことがあります。①の根拠と、②のエントリー後の値動き（含み益・含み損・決済の理由）を比べてみましょう。</div>';
    function paint(node) {
      var c0 = node.querySelector('.rv-c0'), c1 = node.querySelector('.rv-c1'); if (!c0 || !c1) return;
      var b0 = barsAt(s, rec.eb, rec.et); var i0 = Market.indicators(b0);
      var endBar = R.entry ? R.exit.bar : (rec.se ? rec.se.bar : Math.min(s.bars.length - 1, rec.eb + 12)); var endTick = R.entry ? R.exit.tick : (rec.se ? rec.se.tick : SUB - 1);
      var b1 = barsAt(s, endBar, endTick); var i1 = Market.indicators(b1);
      var en = R.entry ? { bar: R.entry.bar, price: R.entry.price, sl: R.sl, tp: R.tp, side: R.side } : null;
      var span = Math.max(36, endBar - rec.eb + 30);
      [[c0, { bars: b0, ind: i0, show: show, zoom: 36, off: 0, tf: tf, atr: i0.atr[b0.length - 2], entry: en, exit: null, marks: [] }],
       [c1, { bars: b1, ind: i1, show: show, zoom: Math.min(span, 80), off: 0, tf: tf, atr: i1.atr[b1.length - 2], entry: en, exit: R.entry ? { bar: R.exit.bar, price: R.exit.price, reason: R.exit.reason } : null,
         marks: [{ bar: rec.eb, label: '判断した時点', color: '#ffd24a' }].concat(R.entry ? [{ bar: R.exit.bar, label: R.exit.reason === 'tp' ? '利確' : R.exit.reason === 'sl' ? '損切り' : '時間切れ', color: R.exit.reason === 'tp' ? COL.tp : R.exit.reason === 'sl' ? COL.sl : '#9fb4ff', row: 1 }] : []) }]].forEach(function (q) {
        var cv = q[0], v = q[1]; var r = cv.getBoundingClientRect(); var dpr = Math.min(2, root.devicePixelRatio || 1); var w = Math.max(200, Math.round(r.width || 300)), h = Math.max(120, Math.round(r.height || 200));
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); var g = null; try { g = cv.getContext('2d'); } catch (e) { } if (!g) return; g.setTransform(dpr, 0, 0, dpr, 0, 0); try { draw(g, w, h, v); } catch (e) { if (root.console) console.warn('review', e); }
      });
    }
    return Win.panel(html, { cls: 'rv-panel', setup: function (n) { paint(n); var t = null; var onR = function () { clearTimeout(t); t = setTimeout(function () { if (n.parentNode) paint(n); }, 120); }; root.addEventListener('resize', onR); var mo = setInterval(function () { if (!n.parentNode) { root.removeEventListener('resize', onR); clearInterval(mo); } }, 1000); } });
  };

  /* ---------- UltimateBattleEffects：戦闘で必殺技を出す瞬間の名前の帯 ---------- */
  CB.cutin = function (def, outcome) {
    var S = CB.settings(); var st = document.getElementById('stage'); if (!st || !def) return Promise.resolve();
    var el = document.createElement('div'); var sch = root.Ultimates ? root.Ultimates.school(def.school) : null;
    el.className = 'ult-cutin ' + (outcome || '') + (S.calm ? ' calm' : '');
    el.innerHTML = '<span class="uc-school">' + esc(sch ? sch.name : '必殺技') + '</span><b style="color:' + esc(def.color || '#fff') + '">' + esc(def.name) + '</b><span class="uc-out">' + (outcome === 'profit' ? '利益の一撃' : outcome === 'loss' ? '損失…威力は小さい' : outcome === 'flat' ? 'ほぼ同値' : '見送り（防御）') + '</span>';
    st.appendChild(el); var fast = root.State && root.State.data && root.State.data.settings.battleSpeed === 'fast'; var ms = S.calm ? 450 : fast ? 650 : 1000;
    return new Promise(function (r) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); r(); }, ms); });
  };

  root.ChartBattleUI = CB; root.UltimateBattleEffects = { cutin: CB.cutin };
})(typeof window !== 'undefined' ? window : globalThis);
