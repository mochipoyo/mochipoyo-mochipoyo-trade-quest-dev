/* =========================================================
   もちぽよFXクエスト - インジケーター計算
   EMA / RCI / MACD / ZigZag / ダウ理論の波形 / ダイバージェンス
   ここは純粋な計算のみ。描画やUIには依存しない。
   ========================================================= */
(function (root) {
  'use strict';

  var Indicators = {};

  /* ---------- 基本集計 ---------- */

  // 5分足などの基本足を factor 本ずつまとめて上位足を作る（整合性のため同一元データから生成）
  Indicators.aggregate = function (candles, factor) {
    if (factor === 1) return candles.slice();
    var out = [];
    for (var i = 0; i + factor <= candles.length; i += factor) {
      var o = candles[i].o, c = candles[i + factor - 1].c;
      var h = -Infinity, l = Infinity;
      for (var j = i; j < i + factor; j++) {
        if (candles[j].h > h) h = candles[j].h;
        if (candles[j].l < l) l = candles[j].l;
      }
      out.push({ o: o, h: h, l: l, c: c, t: candles[i].t });
    }
    return out;
  };

  /* ---------- EMA ---------- */
  // 最初の period 本の単純平均を初期値とし、以降は指数平滑
  Indicators.ema = function (values, period) {
    var out = new Array(values.length);
    var k = 2 / (period + 1);
    var sum = 0;
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (v === null || v === undefined) { out[i] = null; continue; }
      if (i < period - 1) { sum += v; out[i] = null; }
      else if (i === period - 1) { sum += v; out[i] = sum / period; }
      else { out[i] = v * k + out[i - 1] * (1 - k); }
    }
    return out;
  };

  /* ---------- RCI ---------- */
  // 日付順位（直近=1）と価格順位（高い=1、同値は平均順位）のスピアマン順位相関
  Indicators.rci = function (closes, period) {
    var out = new Array(closes.length).fill(null);
    var n = period;
    for (var i = n - 1; i < closes.length; i++) {
      var window = [];
      for (var j = 0; j < n; j++) {
        // 日付順位: 直近の足を1とする
        window.push({ price: closes[i - j], dateRank: j + 1 });
      }
      // 価格順位: 高い順に1, 同値は平均順位
      var sorted = window.slice().sort(function (a, b) { return b.price - a.price; });
      var k = 0;
      while (k < sorted.length) {
        var m = k;
        while (m + 1 < sorted.length && sorted[m + 1].price === sorted[k].price) m++;
        var avgRank = (k + 1 + m + 1) / 2;
        for (var q = k; q <= m; q++) sorted[q].priceRank = avgRank;
        k = m + 1;
      }
      var d2 = 0;
      for (var w = 0; w < window.length; w++) {
        var d = window[w].dateRank - window[w].priceRank;
        d2 += d * d;
      }
      out[i] = (1 - 6 * d2 / (n * (n * n - 1))) * 100;
    }
    return out;
  };

  /* ---------- MACD ---------- */
  Indicators.macd = function (closes, fast, slow, signal) {
    var ef = Indicators.ema(closes, fast);
    var es = Indicators.ema(closes, slow);
    var line = new Array(closes.length);
    for (var i = 0; i < closes.length; i++) {
      line[i] = (ef[i] === null || es[i] === null) ? null : ef[i] - es[i];
    }
    // シグナルはMACDラインの有効部分に対するEMA
    var start = -1;
    for (var s = 0; s < line.length; s++) if (line[s] !== null) { start = s; break; }
    var sig = new Array(closes.length).fill(null);
    var hist = new Array(closes.length).fill(null);
    if (start >= 0) {
      var valid = line.slice(start);
      var sigValid = Indicators.ema(valid, signal);
      for (var t = 0; t < valid.length; t++) {
        sig[start + t] = sigValid[t];
        hist[start + t] = sigValid[t] === null ? null : valid[t] - sigValid[t];
      }
    }
    return { line: line, signal: sig, hist: hist };
  };

  /* ---------- ZigZag（ピボット） ---------- */
  // depth本の左右で最高値/最安値となる足をピボット候補とする。
  // 右側にdepth本の未来が必要なため、末尾depth本の中の候補は「未確定」として扱う。
  Indicators.zigzag = function (candles, depth) {
    var n = candles.length;
    var raw = [];
    for (var i = depth; i < n; i++) {
      var isHigh = true, isLow = true;
      var right = Math.min(n - 1, i + depth);
      for (var j = i - depth; j <= right; j++) {
        if (j === i) continue;
        if (candles[j].h >= candles[i].h) isHigh = false;
        if (candles[j].l <= candles[i].l) isLow = false;
      }
      var confirmed = (i + depth <= n - 1);
      if (isHigh) raw.push({ index: i, price: candles[i].h, type: 'high', confirmed: confirmed });
      if (isLow) raw.push({ index: i, price: candles[i].l, type: 'low', confirmed: confirmed });
    }
    // 交互になるように整理（同種が続く場合はより極端な方を採用）
    var piv = [];
    for (var r = 0; r < raw.length; r++) {
      var p = raw[r];
      var last = piv[piv.length - 1];
      if (last && last.type === p.type) {
        if ((p.type === 'high' && p.price > last.price) || (p.type === 'low' && p.price < last.price)) piv[piv.length - 1] = p;
      } else {
        piv.push(p);
      }
    }
    return piv;
  };

  /* ---------- ダウ理論（波形の判定） ---------- */
  // 確定済みピボットから直近の高値・安値の切り上げ/切り下げを判定
  Indicators.dowTrend = function (pivots) {
    var highs = pivots.filter(function (p) { return p.type === 'high' && p.confirmed; });
    var lows = pivots.filter(function (p) { return p.type === 'low' && p.confirmed; });
    if (highs.length < 2 || lows.length < 2) return { trend: 'unknown', hh: false, hl: false, lh: false, ll: false };
    var h1 = highs[highs.length - 2].price, h2 = highs[highs.length - 1].price;
    var l1 = lows[lows.length - 2].price, l2 = lows[lows.length - 1].price;
    var hh = h2 > h1, hl = l2 > l1, lh = h2 < h1, ll = l2 < l1;
    var trend = 'range';
    if (hh && hl) trend = 'up';
    else if (lh && ll) trend = 'down';
    return { trend: trend, hh: hh, hl: hl, lh: lh, ll: ll, lastHigh: h2, lastLow: l2, prevHigh: h1, prevLow: l1 };
  };

  /* ---------- ダイバージェンス ---------- */
  // 直近2つの確定済み安値（高値）で価格とMACDラインを比較する。未確定ピボットは使わない。
  Indicators.divergence = function (pivots, macdLine) {
    var res = { regularBull: false, regularBear: false, hiddenBull: false, hiddenBear: false, detail: {} };
    var lows = pivots.filter(function (p) { return p.type === 'low' && p.confirmed; });
    var highs = pivots.filter(function (p) { return p.type === 'high' && p.confirmed; });
    function macdNear(idx, mode) {
      var best = null;
      for (var k = Math.max(0, idx - 2); k <= Math.min(macdLine.length - 1, idx + 2); k++) {
        var v = macdLine[k];
        if (v === null || v === undefined) continue;
        if (best === null || (mode === 'min' ? v < best : v > best)) best = v;
      }
      return best;
    }
    if (lows.length >= 2) {
      var a = lows[lows.length - 2], b = lows[lows.length - 1];
      var ma = macdNear(a.index, 'min'), mb = macdNear(b.index, 'min');
      if (ma !== null && mb !== null) {
        if (b.price < a.price && mb > ma) res.regularBull = true;
        if (b.price > a.price && mb < ma) res.hiddenBull = true;
        res.detail.lows = { p1: a.price, p2: b.price, m1: ma, m2: mb, i1: a.index, i2: b.index };
      }
    }
    if (highs.length >= 2) {
      var c = highs[highs.length - 2], d = highs[highs.length - 1];
      var mc = macdNear(c.index, 'max'), md = macdNear(d.index, 'max');
      if (mc !== null && md !== null) {
        if (d.price > c.price && md < mc) res.regularBear = true;
        if (d.price < c.price && md > mc) res.hiddenBear = true;
        res.detail.highs = { p1: c.price, p2: d.price, m1: mc, m2: md, i1: c.index, i2: d.index };
      }
    }
    return res;
  };

  /* ---------- 総合分析（1つの時間足の状態をまとめる） ---------- */
  Indicators.analyze = function (candles, cfg) {
    var closes = candles.map(function (c) { return c.c; });
    var emas = cfg.ema.periods.map(function (p) { return Indicators.ema(closes, p); });
    var rci = Indicators.rci(closes, cfg.rci.period);
    var macd = Indicators.macd(closes, cfg.macd.fast, cfg.macd.slow, cfg.macd.signal);
    var pivots = Indicators.zigzag(candles, cfg.zigzag.depth);
    var dow = Indicators.dowTrend(pivots);
    var div = Indicators.divergence(pivots, macd.line);
    var n = candles.length - 1;

    var e = emas.map(function (arr) { return arr[n]; });
    var emaOrder = 'mixed';
    if (e[0] !== null && e[0] > e[1] && e[1] > e[2]) emaOrder = 'up';
    else if (e[0] !== null && e[0] < e[1] && e[1] < e[2]) emaOrder = 'down';

    // EMAの傾き（10本前との比較）
    var slopeIdx = Math.max(0, n - 10);
    var emaSlope = 'flat';
    if (emas[0][n] !== null && emas[0][slopeIdx] !== null) {
      var diff = (emas[0][n] - emas[0][slopeIdx]) / cfg.market.pip;
      if (diff > 3) emaSlope = 'up'; else if (diff < -3) emaSlope = 'down';
    }
    var close = closes[n];
    var pricePos = 'between';
    if (e[2] !== null) {
      if (close > e[0] && close > e[1] && close > e[2]) pricePos = 'above';
      else if (close < e[0] && close < e[1] && close < e[2]) pricePos = 'below';
    }

    // RCI状態: 直近8本の最小/最大を見て±70からの反転を判定
    var rciNow = rci[n];
    var rciMin = Infinity, rciMax = -Infinity;
    for (var k = Math.max(0, n - 8); k <= n; k++) { if (rci[k] === null) continue; if (rci[k] < rciMin) rciMin = rci[k]; if (rci[k] > rciMax) rciMax = rci[k]; }
    var rciState = 'neutral';
    if (rciNow !== null) {
      if (rciMin <= -cfg.rci.hot && rciNow > rciMin + 10 && rciNow < cfg.rci.hot) rciState = 'oversold_reversal';
      else if (rciMax >= cfg.rci.hot && rciNow < rciMax - 10 && rciNow > -cfg.rci.hot) rciState = 'overbought_reversal';
      else if (rciNow >= cfg.rci.hot) rciState = 'overbought';
      else if (rciNow <= -cfg.rci.hot) rciState = 'oversold';
    }

    var hist = macd.hist[n];
    var macdState = 'neutral';
    if (hist !== null) {
      if (macd.line[n] > macd.signal[n]) macdState = 'bull'; else macdState = 'bear';
    }

    // 直近のスイング高値安値（確定済み）
    var lastLowPiv = null, lastHighPiv = null;
    for (var q = pivots.length - 1; q >= 0; q--) {
      if (!pivots[q].confirmed) continue;
      if (!lastLowPiv && pivots[q].type === 'low') lastLowPiv = pivots[q];
      if (!lastHighPiv && pivots[q].type === 'high') lastHighPiv = pivots[q];
      if (lastLowPiv && lastHighPiv) break;
    }
    // 直近20本の高安（未確定ピボットの代わりに使える実値）
    var recentHigh = -Infinity, recentLow = Infinity;
    for (var r = Math.max(0, n - 20); r <= n; r++) { if (candles[r].h > recentHigh) recentHigh = candles[r].h; if (candles[r].l < recentLow) recentLow = candles[r].l; }

    // 直近の値動きの勢い（直近5本の変化pips）
    var surge = (close - closes[Math.max(0, n - 5)]) / cfg.market.pip;
    var distFromEma20 = e[0] === null ? 0 : (close - e[0]) / cfg.market.pip;

    return {
      candles: candles, closes: closes, emas: emas, rci: rci, macd: macd, pivots: pivots,
      dow: dow, div: div, emaOrder: emaOrder, emaSlope: emaSlope, pricePos: pricePos,
      emaValues: e, rciNow: rciNow, rciState: rciState, macdState: macdState,
      lastLow: lastLowPiv ? lastLowPiv.price : recentLow, lastHigh: lastHighPiv ? lastHighPiv.price : recentHigh,
      recentHigh: recentHigh, recentLow: recentLow, close: close, surge: surge, distFromEma20: distFromEma20
    };
  };

  root.Indicators = Indicators;
  if (typeof module !== 'undefined' && module.exports) module.exports = Indicators;
})(typeof window !== 'undefined' ? window : globalThis);
