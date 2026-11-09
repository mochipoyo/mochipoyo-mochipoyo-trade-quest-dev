/* =========================================================
   SignalEngine（テクニカルの判定の共通エンジン）：RCI の状態（反転の確認・再逆行・経過本数）・確定ピボット・MACD ダイバージェンス（4種類）・
   時間足の集約（境界・確定／形成中）・履歴の不足の判定
   ・未来を使わない：asOf（判断の時点の足の番号）より後の足は読まない。ピボットは「確定した足の番号」（confirmedAt）が asOf 以下のものだけを根拠にする
     （同じ asOf なら、後ろに足を足しても結果は同じ。tl_p2_test.js で確かめる）
   ・RCI の反転の状態：active（反転を確認し、いまも反転の向き）／stalled（反転のあと逆へ少し）／re_reversed（逆へ再逆行）／expired（古い）／completed（反対の±70まで届いた）
   ・設定（RCI の反転の確認の本数・最小の変化幅・有効な本数、ダイバージェンスの有効な本数など）は「教材の仮設定」。手法の確定したルールではない
     既知の値（RCI 期間 9・±70、MACD 6/13/4、EMA 20/30/40）は js/config.js の値を使う
   ・旧 API（Indicators.divergence・Indicators.analyze の rciState・Market.assess の div）はこのエンジンを呼ぶ形で残す（入力のピボットの作り方は各系統のまま）
   ========================================================= */
(function (root) {
  'use strict';
  var CONFIG = root.CONFIG || (typeof require === 'function' ? require('./config.js') : null);
  var SE = { VERSION: 1 };

  /* ---------- 設定（仮設定は provisional:true） ---------- */
  SE.RCI_RULES = {
    period: { value: (CONFIG && CONFIG.rci && CONFIG.rci.period) || 9, provisional: false, label: 'RCI の期間' },
    zone: { value: (CONFIG && CONFIG.rci && CONFIG.rci.hot) || 70, provisional: false, label: '注目する水準（±）' },
    lookback: { value: 8, provisional: true, label: '±水準に触れたかを見る本数（直近）' },
    minTurn: { value: 10, provisional: true, label: '反転とみなす最小の戻り幅（ポイント）' },
    confirmBars: { value: 1, provisional: true, label: '反転の確認に必要な、反転方向へ続けて動いた本数' },
    maxAgeBars: { value: 8, provisional: true, label: '反転のシグナルを「新しい」とみなす本数' },
    reReverseTurn: { value: 10, provisional: true, label: '反転のあと、逆へこの幅以上戻ったら「再逆行」' }
  };
  SE.DIV_RULES = {
    maxAgeBars: { value: 24, provisional: true, label: 'ダイバージェンスを「期限内」とみなす本数（2つ目のピボットが確定してから）' },
    macdBefore: { value: 2, provisional: true, label: 'ピボットの前に MACD の山谷を探す本数' },
    macdAfter: { value: 2, provisional: true, label: 'ピボットの後に MACD の山谷を探す本数（確定した足を越えない）' }
  };
  SE.rules = function (base, over) { var o = {}; Object.keys(base).forEach(function (k) { o[k] = base[k].value; }); if (over) Object.keys(over).forEach(function (k) { if (over[k] !== undefined) o[k] = over[k]; }); return o; };

  /* ---------- RCI の状態 ----------
     rci：RCI の値の配列（null は計算前）。i：判断の時点の足（この足までを使う）
     返り値：{ value, prev, delta, slope:'up'|'down'|'flat', zone:'overbought'|'oversold'|null, touchedHigh, touchedLow,
              reversal: null | { dir:'up'|'down', fromIndex, fromValue, confirmedAt, ageBars, peakAfter, status:'active'|'stalled'|'re_reversed'|'expired' },
              state:'neutral'|'overbought'|'oversold'|'turning_up'|'turning_down'|'turn_up_stalled'|'turn_down_stalled'|'re_reversed_down'|'re_reversed_up'|'turn_up_old'|'turn_down_old',
              legacy:（旧 rciState の名前）, signal:'up'|'down'|null（いま有効な反転のシグナル）, rules } */
  SE.rciState = function (rci, i, over) {
    var R = SE.rules(SE.RCI_RULES, over); var v = rci[i]; var out = { value: v, prev: null, delta: null, slope: 'flat', zone: null, touchedHigh: false, touchedLow: false, reversal: null, state: 'neutral', legacy: 'neutral', signal: null, index: i, rules: R };
    if (v === null || v === undefined || !isFinite(v)) { out.state = 'unknown'; out.legacy = 'neutral'; return out; }
    var p = i > 0 ? rci[i - 1] : null; out.prev = p; out.delta = p === null || p === undefined ? null : v - p; out.slope = out.delta === null ? 'flat' : out.delta > 0 ? 'up' : out.delta < 0 ? 'down' : 'flat';
    out.zone = v >= R.zone ? 'overbought' : v <= -R.zone ? 'oversold' : null;
    var lo = null, hi = null;
    for (var k = Math.max(0, i - R.lookback); k <= i; k++) { var x = rci[k]; if (x === null || x === undefined) continue; if (x <= -R.zone && (lo === null || x <= rci[lo])) lo = k; if (x >= R.zone && (hi === null || x >= rci[hi])) hi = k; }
    out.touchedLow = lo !== null; out.touchedHigh = hi !== null;
    var cand = [];
    if (lo !== null) cand.push(revFrom(rci, lo, i, 1, R)); if (hi !== null) cand.push(revFrom(rci, hi, i, -1, R));
    cand = cand.filter(Boolean).sort(function (a, b) { return b.confirmedAt - a.confirmedAt || b.fromIndex - a.fromIndex; });   // いちばん新しく確認した反転
    if (cand.length) out.reversal = cand[0];
    var rv = out.reversal;
    if (rv) {
      var up = rv.dir === 'up';
      if (rv.status === 'active') { out.state = up ? 'turning_up' : 'turning_down'; out.signal = rv.dir; }
      else if (rv.status === 'stalled') out.state = up ? 'turn_up_stalled' : 'turn_down_stalled';
      else if (rv.status === 're_reversed') out.state = up ? 're_reversed_down' : 're_reversed_up';
      else if (rv.status === 'completed') out.state = out.zone || (up ? 'overbought' : 'oversold');
      else out.state = up ? 'turn_up_old' : 'turn_down_old';
    }
    if (!rv && out.zone) out.state = out.zone;   // 反転がなければ、いまの水準（±70）だけ。反転の後の状態（止まった・再逆行・古い）は state に残し、水準は zone で別に返す
    // 旧 rciState への対応：いま有効な反転（active）だけを「反転した」とする。止まった・再逆行・古い反転は、いまの水準（±70）で答える
    out.legacy = out.signal === 'up' ? 'oversold_reversal' : out.signal === 'down' ? 'overbought_reversal' : out.zone || 'neutral';
    return out;
  };
  // 極値 j から、向き sg（+1＝上へ反転）の反転を探す
  function revFrom(rci, j, i, sg, R) {
    var base = rci[j]; var conf = -1; var run = 0;
    for (var k = j + 1; k <= i; k++) { var a = rci[k], b = rci[k - 1]; if (a === null || b === null) { run = 0; continue; } run = sg * (a - b) > 0 ? run + 1 : 0; if (sg * (a - base) >= R.minTurn && run >= R.confirmBars) { conf = k; break; } }
    if (conf < 0) return null;
    var peak = rci[conf], pk = conf; for (var m = conf; m <= i; m++) if (sg * (rci[m] - peak) > 0) { peak = rci[m]; pk = m; }
    var now = rci[i]; var back = sg * (peak - now); var age = i - conf; var d = i > 0 && rci[i - 1] !== null ? now - rci[i - 1] : 0;
    // 反転の向きに進んで、反対の水準（上向きなら +70）まで届いた：反転のシグナルとしては終わり（いまは反対の圏）
    //   いまの値が極値から最小の戻り幅（minTurn）より近くまで戻っている・直近の足が逆向き → 止まっている（stalled。いまの反転のシグナルにしない）
    var status = sg * now >= R.zone ? 'completed' : back >= R.reReverseTurn ? 're_reversed' : age > R.maxAgeBars ? 'expired' : (sg * d < 0 || sg * (now - base) < R.minTurn) ? 'stalled' : 'active';
    return { dir: sg > 0 ? 'up' : 'down', fromIndex: j, fromValue: base, confirmedAt: conf, ageBars: age, peakAfter: peak, peakIndex: pk, backFromPeak: back, status: status };
  }
  SE.RCI_STATE_LABEL = { neutral: '中立（±70に触れていない）', overbought: '+70以上（買われすぎ圏）', oversold: '−70以下（売られすぎ圏）', turning_up: '−70圏から上向きに反転（確認済み・継続中）', turning_down: '+70圏から下向きに反転（確認済み・継続中）',
    turn_up_stalled: '上向きに反転したあと、いまは下向き（再逆行の手前）', turn_down_stalled: '下向きに反転したあと、いまは上向き（再逆行の手前）', re_reversed_down: '上向きに反転したが、いまは下へ再逆行', re_reversed_up: '下向きに反転したが、いまは上へ再逆行',
    turn_up_old: '上向きの反転から時間がたっている（古いシグナル）', turn_down_old: '下向きの反転から時間がたっている（古いシグナル）', unknown: '計算前（足が足りない）' };

  /* ---------- ピボット（左右 depth 本で最も高い／安い足） ----------
     index の足がピボットかどうかは index＋depth の足まで見ないと決まらない → confirmedAt＝index＋depth
     asOf より後の足は読まない。confirmedAt ≤ asOf を「確定」、それ以外を「未確定（形成中）」とする
     返り値：{ confirmed:[{index, price, type, confirmedAt}]（高値・安値が交互になるよう整理）, forming:[…], asOf } */
  SE.pivots = function (bars, depth, asOf) {
    depth = depth || (CONFIG && CONFIG.zigzag && CONFIG.zigzag.depth) || 4; asOf = asOf === undefined ? bars.length - 1 : Math.min(asOf, bars.length - 1);
    var conf = [], forming = [];
    for (var i = depth; i <= asOf; i++) {
      var right = Math.min(asOf, i + depth); var isH = true, isL = true;
      for (var j = i - depth; j <= right; j++) { if (j === i) continue; if (bars[j].h >= bars[i].h) isH = false; if (bars[j].l <= bars[i].l) isL = false; if (!isH && !isL) break; }
      var ok = i + depth <= asOf; var list = ok ? conf : forming;
      if (isH) list.push({ index: i, price: bars[i].h, type: 'high', confirmedAt: i + depth, confirmed: ok });
      if (isL) list.push({ index: i, price: bars[i].l, type: 'low', confirmedAt: i + depth, confirmed: ok });
    }
    return { confirmed: alternate(conf), forming: forming, asOf: asOf, depth: depth };
  };
  function alternate(raw) { var piv = []; raw.forEach(function (p) { var last = piv[piv.length - 1]; if (last && last.type === p.type) { if ((p.type === 'high' && p.price > last.price) || (p.type === 'low' && p.price < last.price)) piv[piv.length - 1] = p; } else piv.push(p); }); return piv; }
  SE.alternate = alternate;

  /* ---------- MACD ダイバージェンス（共通の比べ方） ----------
     o: { pivots:[{index, price, type, confirmedAt?}]（確定したものだけ）, macd:MACD ラインの配列, asOf, before, after, maxAgeBars, forming:[未確定のピボット] }
     ・直近2つの安値（高値）と、その近くの MACD の谷（山）を比べる。MACD を探す範囲は ピボット−before 〜 ピボット＋after。ただし確定した足（confirmedAt）と asOf を越えない
     ・通常の強気：安値の切り下げ＋MACD の谷の切り上げ（転換の候補）／通常の弱気：高値の切り上げ＋MACD の山の切り下げ（転換の候補）
       ヒドゥンの強気：安値の切り上げ＋MACD の谷の切り下げ（上昇の継続の候補）／ヒドゥンの弱気：高値の切り下げ＋MACD の山の切り上げ（下降の継続の候補）
     ・status：confirmed（2つ目のピボットが確定してから maxAgeBars 本以内）／expired（それより古い）／forming（2つ目が未確定のピボット：シグナルにしない）
     返り値：{ signals:[{ type, direction, kind, pivotIndices, prices, macd, confirmedAtBar, ageBars, status, evidence, meaning }], forming:[…], flags:{regularBull,…}, detail:{lows, highs} } */
  SE.DIV_LABEL = { regular_bull: '通常の強気ダイバージェンス', regular_bear: '通常の弱気ダイバージェンス', hidden_bull: 'ヒドゥンの強気ダイバージェンス', hidden_bear: 'ヒドゥンの弱気ダイバージェンス' };
  SE.DIV_MEANING = { regular_bull: '下落の勢いが弱まった（上への転換の候補。単独で逆張りの確定にはしない）', regular_bear: '上昇の勢いが弱まった（下への転換の候補。単独で逆張りの確定にはしない）',
    hidden_bull: '押し目の安値は切り上げたまま MACD が深く下げた（上昇の継続の候補。必ず上がる合図ではない）', hidden_bear: '戻りの高値は切り下げたまま MACD が高く戻った（下降の継続の候補。必ず下がる合図ではない）' };
  SE.divergence = function (o) {
    var R = SE.rules(SE.DIV_RULES, { maxAgeBars: o.maxAgeBars, macdBefore: o.before, macdAfter: o.after }); var macd = o.macd; var asOf = o.asOf === undefined ? macd.length - 1 : o.asOf;
    var piv = (o.pivots || []).filter(function (p) { return p.confirmedAt === undefined || p.confirmedAt <= asOf; });
    var res = { signals: [], forming: [], flags: { regularBull: false, regularBear: false, hiddenBull: false, hiddenBear: false }, detail: {}, asOf: asOf, rules: R };
    function near(p, mode) { var lim = Math.min(asOf, p.confirmedAt === undefined ? p.index + R.macdAfter : p.confirmedAt, macd.length - 1); var best = null; for (var k = Math.max(0, p.index - R.macdBefore); k <= Math.min(lim, p.index + R.macdAfter); k++) { var v = macd[k]; if (v === null || v === undefined) continue; if (best === null || (mode === 'min' ? v < best : v > best)) best = v; } return best; }
    function pair(a, b, type, formingFlag) {
      var low = type === 'low'; var ma = near(a, low ? 'min' : 'max'), mb = near(b, low ? 'min' : 'max'); if (ma === null || mb === null) return null;
      var key = null; if (low) { if (b.price < a.price && mb > ma) key = 'regular_bull'; else if (b.price > a.price && mb < ma) key = 'hidden_bull'; } else { if (b.price > a.price && mb < ma) key = 'regular_bear'; else if (b.price < a.price && mb > ma) key = 'hidden_bear'; }
      var det = { p1: a.price, p2: b.price, m1: ma, m2: mb, i1: a.index, i2: b.index };
      if (!key) return { detail: det };
      var cAt = b.confirmedAt === undefined ? b.index : b.confirmedAt; var age = asOf - cAt;
      var st = formingFlag ? 'forming' : age > R.maxAgeBars ? 'expired' : 'confirmed';
      var pw = low ? (b.price < a.price ? '切り下げ' : '切り上げ') : (b.price > a.price ? '切り上げ' : '切り下げ'); var mw = mb > ma ? '切り上げ' : '切り下げ';
      return { detail: det, sig: { type: key, direction: /bull/.test(key) ? 'bull' : 'bear', kind: /regular/.test(key) ? 'regular' : 'hidden', pivotIndices: [a.index, b.index], prices: [a.price, b.price], macd: [ma, mb], confirmedAtBar: formingFlag ? null : cAt, ageBars: formingFlag ? null : age, status: st,
        evidence: (low ? '安値 ' : '高値 ') + fx(a.price) + '→' + fx(b.price) + '（' + pw + '）／MACD ' + fx(ma, 4) + '→' + fx(mb, 4) + '（' + mw + '）', label: SE.DIV_LABEL[key], meaning: SE.DIV_MEANING[key] } };
    }
    ['low', 'high'].forEach(function (type) {
      var L = piv.filter(function (p) { return p.type === type; }); if (!L.length) return;
      if (L.length >= 2) { var pr = pair(L[L.length - 2], L[L.length - 1], type, false);
        if (pr) { res.detail[type === 'low' ? 'lows' : 'highs'] = pr.detail;
          if (pr.sig) { res.signals.push(pr.sig); if (pr.sig.status === 'confirmed' || o.legacyAll) res.flags[{ regular_bull: 'regularBull', regular_bear: 'regularBear', hidden_bull: 'hiddenBull', hidden_bear: 'hiddenBear' }[pr.sig.type]] = true; } } }
      // 形成中：まだ確定していないピボットと、最後の確定したピボットの組み合わせ（シグナルにはしない。「未確定」の練習に使う）
      var f = (o.forming || []).filter(function (p) { return p.type === type && p.index > L[L.length - 1].index; }).pop();
      if (f) { var pf = pair(L[L.length - 1], f, type, true); if (pf && pf.sig) res.forming.push(pf.sig); }
    });
    res.signals.sort(function (a, b) { return b.pivotIndices[1] - a.pivotIndices[1]; });   // 新しい順（2つ目のピボットが右にあるもの）
    return res;
  };
  function fx(v, d) { return isFinite(v) ? Number(v).toFixed(d === undefined ? 3 : d) : '―'; }
  // いちばん新しい（2つ目のピボットが右にある）有効なダイバージェンスの種類。なければ 'none'。シナリオの名前・テーマは使わない
  SE.latestDivergence = function (div) { var s = (div.signals || []).filter(function (x) { return x.status === 'confirmed'; }); return s.length ? s[0].type : 'none'; };

  /* ---------- 時間足の集約（時刻の境界） ----------
     base：5分足の配列（{o,h,l,c,t}。t は 5分足の通し番号。t×5 分が仮想の時刻。t＝0 は仮想の 0:00）
     tfMin：まとめる時間（分）。asOf：判断の時点（base の番号）。opts.startMinute：t＝0 の時刻（分。既定 0）
     ・足の区切り：仮想の時刻を tfMin で割った商が同じ足を1本にまとめる（日足は 0:00 区切り。架空の相場なので週末・休場はない）
     ・asOf の足で区切りが終わっていない最後の足は partial:true（形成中）。確定足だけを使うときは confirmed() で除く
     返り値：[{ o, h, l, c, from, to, t0（区切りの始まりの分）, partial }] */
  SE.aggregate = function (base, tfMin, asOf, opts) {
    opts = opts || {}; var step = opts.baseMin || 5; var st = opts.startMinute || 0; asOf = asOf === undefined ? base.length - 1 : Math.min(asOf, base.length - 1);
    var out = []; var cur = null;
    for (var i = 0; i <= asOf; i++) { var b = base[i]; var tm = st + (b.t === undefined ? i : b.t) * step; var key = Math.floor(tm / tfMin);
      if (!cur || cur.key !== key) { if (cur) out.push(cur); cur = { key: key, o: b.o, h: b.h, l: b.l, c: b.c, from: i, to: i, t0: key * tfMin }; }
      else { if (b.h > cur.h) cur.h = b.h; if (b.l < cur.l) cur.l = b.l; cur.c = b.c; cur.to = i; } }
    if (cur) out.push(cur);
    out.forEach(function (x) { var endMin = st + ((base[x.to].t === undefined ? x.to : base[x.to].t) + 1) * step; x.partial = endMin < x.t0 + tfMin; delete x.key; });
    return out;
  };
  SE.confirmed = function (agg) { return agg.length && agg[agg.length - 1].partial ? agg.slice(0, -1) : agg; };
  // 履歴が足りるか：EMA40 なら確定足が 40 本以上（さらに傾きを見るなら +10 本）。足りないときは「上位足の履歴不足」
  SE.enough = function (nBars, need) { return { ok: nBars >= need, have: nBars, need: need, msg: nBars >= need ? '' : '上位足の履歴不足（確定した足 ' + nBars + ' 本・必要 ' + need + ' 本）。この時間足の EMA などは判定しない' }; };

  root.SignalEngine = SE;
  if (typeof module !== 'undefined' && module.exports) module.exports = SE;
})(typeof window !== 'undefined' ? window : globalThis);
