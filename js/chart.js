/* =========================================================
   もちぽよFXクエスト - チャート描画（Canvas 2D）
   ローソク足 / EMA20・30・40 / RCI9 / MACD(6,13,4) / ZigZag /
   直近高値安値 / 損切り・利確ライン
   表示される値はすべて Indicators の計算結果（評価ロジックと同一）
   ========================================================= */
(function (root) {
  'use strict';

  var CONFIG = root.CONFIG;
  var Indicators = root.Indicators;

  var COLORS = {
    bg: '#0b1226', grid: 'rgba(255,255,255,0.06)', text: '#c9d2e8', up: '#4cc38a', down: '#e5484d',
    ema20: '#ffd24a', ema30: '#ff8a3a', ema40: '#c94aff', rci: '#5ab0ff', hot: 'rgba(255,210,74,0.5)',
    macd: '#5ab0ff', signal: '#ff8a3a', histUp: 'rgba(76,195,138,0.7)', histDown: 'rgba(229,72,77,0.7)',
    zig: 'rgba(255,255,255,0.55)', zigUnconfirmed: 'rgba(255,255,255,0.25)', sl: '#e5484d', tp: '#4cc38a', entry: '#ffffff',
    hl: 'rgba(255,210,74,0.35)', future: 'rgba(90,176,255,0.12)'
  };

  var Chart = {};

  // 表示用の解析結果を作る（base + 公開済みの未来足）。未来足はエントリー確定後にのみ追加される。
  Chart.buildView = function (baseCandles, revealedFuture) {
    var candles = revealedFuture && revealedFuture.length ? baseCandles.concat(revealedFuture) : baseCandles;
    var an = Indicators.analyze(candles, CONFIG);
    an.revealedCount = revealedFuture ? revealedFuture.length : 0;
    return an;
  };

  /* opts:
       visibleBars, showZigzag(bool), sl, tp, entry, tfLabel, title, zoomHint
  */
  Chart.render = function (canvas, an, opts) {
    opts = opts || {};
    var dpr = (root.devicePixelRatio || 1);
    var cssW = canvas.clientWidth || 600, cssH = canvas.clientHeight || 380;
    if (cssW < 50) cssW = 600;
    if (cssH < 50) cssH = 380;
    canvas.width = Math.floor(cssW * dpr); canvas.height = Math.floor(cssH * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var W = cssW, H = cssH;
    ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, W, H);

    var candles = an.candles;
    var n = candles.length;
    var vis = Math.min(n, opts.visibleBars || CONFIG.chart.visibleBars);
    var start = n - vis;
    var padR = 54, padL = 6, padT = 18;
    var small = W < 480;
    if (small) padR = 46;
    var plotW = W - padL - padR;
    var hPrice = Math.floor((H - padT) * 0.58), hRci = Math.floor((H - padT) * 0.19), hMacd = (H - padT) - hPrice - hRci;
    var yPrice0 = padT, yRci0 = padT + hPrice, yMacd0 = yRci0 + hRci;
    var slot = plotW / vis;
    var bodyW = Math.max(1, Math.min(14, slot * 0.65));

    function xOf(i) { return padL + (i - start + 0.5) * slot; }

    // ---- 価格レンジ ----
    var pMin = Infinity, pMax = -Infinity;
    for (var i = start; i < n; i++) { if (candles[i].l < pMin) pMin = candles[i].l; if (candles[i].h > pMax) pMax = candles[i].h; }
    an.emas.forEach(function (e) { for (var j = start; j < n; j++) { if (e[j] !== null) { if (e[j] < pMin) pMin = e[j]; if (e[j] > pMax) pMax = e[j]; } } });
    [opts.sl, opts.tp, opts.entry].forEach(function (v) { if (v !== null && v !== undefined && !isNaN(v)) { if (v < pMin) pMin = v; if (v > pMax) pMax = v; } });
    var range = (pMax - pMin) || 1; pMin -= range * 0.06; pMax += range * 0.06; range = pMax - pMin;
    function yP(v) { return yPrice0 + 8 + (hPrice - 16) * (1 - (v - pMin) / range); }

    // ---- 背景（未来足の領域） ----
    if (an.revealedCount) {
      var fx = xOf(n - an.revealedCount) - slot / 2;
      ctx.fillStyle = COLORS.future; ctx.fillRect(fx, yPrice0, W - padR - fx, H - yPrice0);
    }

    // ---- グリッド・価格目盛 ----
    ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1; ctx.fillStyle = COLORS.text;
    ctx.font = (small ? 9 : 10) + 'px monospace'; ctx.textAlign = 'left';
    var ticks = 5;
    for (var t = 0; t <= ticks; t++) {
      var v = pMin + range * t / ticks; var y = yP(v);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillText(v.toFixed(2), W - padR + 4, y + 3);
    }

    // ---- 直近高値・安値（確定済みスイング） ----
    if (opts.showLevels !== false) {
      ctx.setLineDash([3, 3]); ctx.strokeStyle = COLORS.hl;
      [an.lastHigh, an.lastLow].forEach(function (lv) {
        if (lv === undefined || !isFinite(lv)) return;
        var y = yP(lv); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // ---- ZigZag ----
    if (opts.showZigzag) {
      var piv = an.pivots.filter(function (p) { return p.index >= start - 1; });
      if (piv.length > 1) {
        ctx.lineWidth = 1.5;
        for (var z = 1; z < piv.length; z++) {
          ctx.strokeStyle = piv[z].confirmed ? COLORS.zig : COLORS.zigUnconfirmed;
          ctx.setLineDash(piv[z].confirmed ? [] : [4, 3]);
          ctx.beginPath(); ctx.moveTo(xOf(piv[z - 1].index), yP(piv[z - 1].price)); ctx.lineTo(xOf(piv[z].index), yP(piv[z].price)); ctx.stroke();
        }
        ctx.setLineDash([]);
        // ピボットの印
        piv.forEach(function (p) {
          ctx.fillStyle = p.confirmed ? COLORS.zig : COLORS.zigUnconfirmed;
          ctx.beginPath(); ctx.arc(xOf(p.index), yP(p.price), 2.5, 0, Math.PI * 2); ctx.fill();
        });
      }
    }

    // ---- ローソク足 ----
    for (var c = start; c < n; c++) {
      var cd = candles[c];
      var up = cd.c >= cd.o;
      ctx.strokeStyle = ctx.fillStyle = up ? COLORS.up : COLORS.down;
      var x = xOf(c);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, yP(cd.h)); ctx.lineTo(x, yP(cd.l)); ctx.stroke();
      var yo = yP(cd.o), yc = yP(cd.c);
      var top = Math.min(yo, yc), hgt = Math.max(1, Math.abs(yo - yc));
      ctx.fillRect(x - bodyW / 2, top, bodyW, hgt);
    }

    // ---- EMA ----
    var emaCols = [COLORS.ema20, COLORS.ema30, COLORS.ema40];
    an.emas.forEach(function (e, k) {
      ctx.strokeStyle = emaCols[k]; ctx.lineWidth = 1.4; ctx.beginPath(); var started = false;
      for (var j = start; j < n; j++) { if (e[j] === null) continue; var yy = yP(e[j]); if (!started) { ctx.moveTo(xOf(j), yy); started = true; } else ctx.lineTo(xOf(j), yy); }
      ctx.stroke();
    });

    // ---- 損切り・利確・エントリー ----
    function hline(v, col, label) {
      if (v === null || v === undefined || isNaN(v)) return;
      var y = yP(v);
      ctx.setLineDash([6, 4]); ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = col; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(label + ' ' + v.toFixed(3), padL + 4, y - 3);
    }
    hline(opts.sl, COLORS.sl, '損切り');
    hline(opts.tp, COLORS.tp, '利確');
    hline(opts.entry, COLORS.entry, 'エントリー');
    // v6.4 追加の水平線（レバレッジ取引のロスカットの価格など）。表示範囲の外なら、上下の端に矢印と価格だけを出す（縮尺は変えない）
    (opts.lines || []).forEach(function (L) {
      if (!L || L.v === null || L.v === undefined || isNaN(L.v)) return;
      if (L.v >= pMin && L.v <= pMax) { hline(L.v, L.color || '#ff8a3a', L.label || ''); return; }
      ctx.fillStyle = L.color || '#ff8a3a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText((L.label || '') + ' ' + L.v.toFixed(3) + (L.v > pMax ? ' ↑（表示範囲の外）' : ' ↓（表示範囲の外）'), padL + 4, L.v > pMax ? yPrice0 + 10 : yPrice0 + hPrice - 4);
    });

    // ---- v4.3: プレイヤーが指定した高値・安値の印 ----
    (opts.marks || []).forEach(function (m) {
      if (!m || m.index === undefined || m.index < start || m.index >= n) return;
      var mx = xOf(m.index), my = yP(m.price); var isHigh = m.type === 'high'; var col = isHigh ? '#ffd24a' : '#7fd4ff';
      ctx.fillStyle = col; ctx.beginPath();
      if (isHigh) { ctx.moveTo(mx, my - 4); ctx.lineTo(mx - 6, my - 14); ctx.lineTo(mx + 6, my - 14); } else { ctx.moveTo(mx, my + 4); ctx.lineTo(mx - 6, my + 14); ctx.lineTo(mx + 6, my + 14); }
      ctx.closePath(); ctx.fill();
      ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(isHigh ? '高値' : '安値', mx, isHigh ? my - 17 : my + 24);
    });
    if (opts.pickMode) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(padL, yPrice0, plotW, hPrice); ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(opts.pickMode === 'high' ? 'タップして「直近の確定した高値」を指定' : opts.pickMode === 'low' ? 'タップして「直近の確定した安値」を指定' : opts.pickMode === 'sl' ? 'タップして損切り価格を指定' : 'タップして利確価格を指定', padL + plotW / 2, yPrice0 + 14); }
    // 座標 → 足番号・価格（クリック／タップ操作用）
    canvas._map = { start: start, n: n, slot: slot, padL: padL, xToIndex: function (x) { return Math.max(start, Math.min(n - 1, start + Math.floor((x - padL) / slot))); }, yToPrice: function (y) { return pMin + range * (1 - (y - (yPrice0 + 8)) / (hPrice - 16)); }, inPrice: function (y) { return y >= yPrice0 && y <= yPrice0 + hPrice; } };

    // ---- 凡例 ----
    ctx.font = (small ? 9 : 11) + 'px sans-serif'; ctx.textAlign = 'left';
    var lx = padL + 4;
    function legend(txt, col) { ctx.fillStyle = col; ctx.fillText(txt, lx, 12); lx += ctx.measureText(txt).width + 10; }
    legend(opts.tfLabel || '', COLORS.text);
    legend('EMA20', COLORS.ema20); legend('EMA30', COLORS.ema30); legend('EMA40', COLORS.ema40);
    if (!small) legend('※学習用人工データ', 'rgba(201,210,232,0.6)');

    // ---- RCI ----
    ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(padL, yRci0, plotW, hRci);
    function yR(v) { return yRci0 + 6 + (hRci - 12) * (1 - (v + 100) / 200); }
    ctx.setLineDash([3, 3]); ctx.strokeStyle = COLORS.hot; ctx.lineWidth = 1;
    [CONFIG.rci.hot, -CONFIG.rci.hot].forEach(function (lv) { var y = yR(lv); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); });
    ctx.setLineDash([]); ctx.strokeStyle = COLORS.grid; ctx.beginPath(); ctx.moveTo(padL, yR(0)); ctx.lineTo(W - padR, yR(0)); ctx.stroke();
    ctx.fillStyle = COLORS.text; ctx.font = (small ? 9 : 10) + 'px monospace';
    ctx.fillText('+' + CONFIG.rci.hot, W - padR + 4, yR(CONFIG.rci.hot) + 3); ctx.fillText('-' + CONFIG.rci.hot, W - padR + 4, yR(-CONFIG.rci.hot) + 3);
    ctx.strokeStyle = COLORS.rci; ctx.lineWidth = 1.6; ctx.beginPath(); var rs = false;
    for (var q = start; q < n; q++) { if (an.rci[q] === null) continue; var yy2 = yR(an.rci[q]); if (!rs) { ctx.moveTo(xOf(q), yy2); rs = true; } else ctx.lineTo(xOf(q), yy2); }
    ctx.stroke();
    ctx.fillStyle = COLORS.rci; ctx.font = (small ? 9 : 11) + 'px sans-serif';
    ctx.fillText('RCI(' + CONFIG.rci.period + ')' + (an.rciNow !== null && an.rciNow !== undefined ? ' ' + an.rciNow.toFixed(0) : ''), padL + 4, yRci0 + 11);

    // ---- MACD ----
    ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fillRect(padL, yMacd0, plotW, hMacd);
    var mMax = 0;
    for (var m = start; m < n; m++) { ['line', 'signal', 'hist'].forEach(function (k) { var v2 = an.macd[k][m]; if (v2 !== null && Math.abs(v2) > mMax) mMax = Math.abs(v2); }); }
    if (mMax === 0) mMax = 1;
    function yM(v) { return yMacd0 + 6 + (hMacd - 12) * (1 - (v + mMax) / (2 * mMax)); }
    ctx.strokeStyle = COLORS.grid; ctx.beginPath(); ctx.moveTo(padL, yM(0)); ctx.lineTo(W - padR, yM(0)); ctx.stroke();
    for (var hb = start; hb < n; hb++) {
      var hv = an.macd.hist[hb]; if (hv === null) continue;
      ctx.fillStyle = hv >= 0 ? COLORS.histUp : COLORS.histDown;
      var y0 = yM(0), y1 = yM(hv);
      ctx.fillRect(xOf(hb) - bodyW / 2, Math.min(y0, y1), bodyW, Math.max(1, Math.abs(y1 - y0)));
    }
    [['line', COLORS.macd], ['signal', COLORS.signal]].forEach(function (pair) {
      ctx.strokeStyle = pair[1]; ctx.lineWidth = 1.4; ctx.beginPath(); var st2 = false;
      for (var j2 = start; j2 < n; j2++) { var v3 = an.macd[pair[0]][j2]; if (v3 === null) continue; var yy3 = yM(v3); if (!st2) { ctx.moveTo(xOf(j2), yy3); st2 = true; } else ctx.lineTo(xOf(j2), yy3); }
      ctx.stroke();
    });
    ctx.fillStyle = COLORS.macd; ctx.font = (small ? 9 : 11) + 'px sans-serif';
    ctx.fillText('MACD(' + CONFIG.macd.fast + ',' + CONFIG.macd.slow + ',' + CONFIG.macd.signal + ')', padL + 4, yMacd0 + 11);

    // ---- ダイバージェンスの補助線（確定ピボット間） ----
    if (opts.showDivergence && an.div.detail) {
      var dl = an.div.detail.lows, dh = an.div.detail.highs;
      function divLine(a, b, mA, mB, col) {
        if (!a || a.i1 < start) return;
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(xOf(a.i1), yP(a.p1)); ctx.lineTo(xOf(a.i2), yP(a.p2)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(xOf(a.i1), yM(mA)); ctx.lineTo(xOf(a.i2), yM(mB)); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (dl && (an.div.regularBull || an.div.hiddenBull)) divLine(dl, null, dl.m1, dl.m2, an.div.hiddenBull ? '#9fe0a8' : '#4cc38a');
      if (dh && (an.div.regularBear || an.div.hiddenBear)) divLine(dh, null, dh.m1, dh.m2, an.div.hiddenBear ? '#ffb0b0' : '#e5484d');
    }
  };

  Chart.COLORS = COLORS;
  root.Chart = Chart;
})(typeof window !== 'undefined' ? window : globalThis);
