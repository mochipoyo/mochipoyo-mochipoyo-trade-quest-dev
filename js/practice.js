/* =========================================================
   PracticeEngine（もちぽよ実践トレード道場の計算）：日足・4時間足・15分足・5分足がそろった架空の相場を作り、
   判断の時点（asOf）までの足だけで事実（環境・根拠）を出す。足送り・発注・決済・採点・記録に使う。DOM に依存しない
   ・相場：学習用仮想ペア POYO/MOCHI（架空）。5分足を元にして、上位足は時刻の区切りでまとめる（js/signals.js の SignalEngine.aggregate）
       仮想の時刻：5分足の番号 t × 5分。日足は仮想の 0:00 で区切る。架空の相場なので週末・休場はない
       履歴：ふつうは 60日分（日足 EMA40 が計算できる）。一部の問題は 30日分（日足の EMA40 は「上位足の履歴不足」と出す。作り話の履歴は足さない）
   ・未来を見せない：snapshot / view は asOf より後の足を読まない（呼ぶ前に base を asOf＋1 本で切る）
   ・問題の型（12 カテゴリー）は「判断の開始の時点の状況」から決める（js/data/practice-seeds.js にシードを保存）。
     型の名前・カテゴリー・シードは、振り返りまで画面に出さない。学習用（learn）と未知の問題（exam）のシードは別の範囲で、重ならない
   ========================================================= */
(function (root) {
  'use strict';
  var CONFIG = root.CONFIG, IND = root.Indicators, SE = root.SignalEngine; function SPFn() { return root.StrategyProfiles; }   // 戦略プロファイル（js/strategy.js）は使うときに読む
  var PE = { VERSION: 1 };
  var DAY = 288, H4 = 48, H1 = 12, M15 = 3;
  PE.TFS = [{ id: '1d', min: 1440, label: '日足' }, { id: '4h', min: 240, label: '4時間足' }, { id: '15m', min: 15, label: '15分足' }, { id: '5m', min: 5, label: '5分足' }];
  PE.tfMin = function (id) { for (var i = 0; i < PE.TFS.length; i++) if (PE.TFS[i].id === id) return PE.TFS[i].min; return 15; };
  PE.tfLabel = function (id) { for (var i = 0; i < PE.TFS.length; i++) if (PE.TFS[i].id === id) return PE.TFS[i].label; return id; };
  PE.WINDOW = 420;         // エントリー足の指標を計算する本数（決まった本数なので、同じ asOf なら同じ値）
  PE.HTF_NEED = 45;        // 上位足の向きを判定するのに必要な確定足の本数（EMA40 ＋ 傾き 5本）
  PE.MAX_STEPS = 36;       // （v9.0 の名前を残す）15分足で待てる本数。v9.1 からは分で決める：PE.WAIT_MIN
  PE.HOLD_MAX = 96;        // （v9.0 の名前を残す）15分足で保有できる本数。v9.1 からは分で決める：PE.HOLD_MIN
  PE.WAIT_MIN = 540;       // v9.1 判断を待てる時間（分）。エントリー足が 5分足でも 15分足でも同じ（9時間）
  PE.HOLD_MIN = 1440;      // v9.1 保有できる時間（分）。過ぎたら時間切れの決済（24時間）
  PE.STEP_MINS = [5, 15];  // v9.1 1回に進める時間（分）。エントリー足とは別に選べる
  PE.FUT_DAYS = 2;         // 判断の開始より後に作る足（5分足で 2日分）
  PE.PAIR = '学習用仮想ペア POYO/MOCHI（架空の相場）';
  // v9.1 記録の版：計算の決まり（ENGINE_VERSION）と相場の作り方（SCENARIO_VERSION）。振り返りで作り直すときに、記録した checksum と比べて違えば「再現できない」と出す
  // ENGINE_VERSION 3：決済を 5分足（もとの足）で判定・待ち／保有の上限を分で（v9.1 Phase 7）。2：コストの定義（Phase 6）
  PE.ENGINE_VERSION = 3; PE.SCENARIO_VERSION = 1; PE.STRESS_ATR = [1, 2]; PE.LOW_CAPITAL = 0.7;   // LOW_CAPITAL：資金が初期のこの割合を下回ったら注意（教材の仮設定）
  PE.checksum = function (g) { var b = g.base; var pick = [0, g.S, Math.min(b.length - 1, g.S + 1), b.length - 1]; var str = pick.map(function (i) { return b[i].o + ',' + b[i].h + ',' + b[i].l + ',' + b[i].c; }).join('|') + '|' + b.length;
    var h = 2166136261 >>> 0; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); };

  function rng(seed) { return root.Scenarios._internal.mulberry32(seed >>> 0); }
  function seg(bars, drift, wave, noise) { return { bars: Math.max(1, Math.round(bars)), drift: drift, wave: wave || null, noise: noise }; }
  function U(r, a, b) { return a + (b - a) * r(); }

  /* ---------- 相場の型（判断の開始までの最後の部分の形）：乱数で幅を持たせる ---------- */
  var FAM = ['pullback', 'pullback', 'deep_pullback', 'spike', 'range', 'div_regular', 'div_hidden', 'div_stale', 'mixed', 'wide'];
  function tail(fam, r, dir) {
    var t = [];
    if (fam === 'pullback') { t.push(seg(H4 * U(r, 4, 8), dir * U(r, 140, 300), { amp: U(r, 18, 32), period: H1 * U(r, 2, 4) })); t.push(seg(H1 * U(r, 1.5, 4), -dir * U(r, 25, 70), null, 1.7)); if (r() < 0.6) t.push(seg(M15 * U(r, 1, 6), dir * U(r, 4, 26), null, 1.6)); }
    else if (fam === 'deep_pullback') { t.push(seg(H4 * U(r, 4, 7), dir * U(r, 180, 300), { amp: 22, period: H1 * 3 })); t.push(seg(H1 * U(r, 3, 6), -dir * U(r, 70, 120), null, 2)); t.push(seg(M15 * U(r, 2, 8), dir * U(r, 0, 30), null, 1.8)); }
    else if (fam === 'spike') { t.push(seg(H4 * U(r, 3, 6), dir * U(r, 80, 200), { amp: 20, period: H1 * 3 })); t.push(seg(M15 * U(r, 2, 6), dir * U(r, 60, 130), null, 3.4)); }
    else if (fam === 'range') { t.push(seg(DAY * U(r, 1, 2.2), dir * U(r, -20, 20), { amp: U(r, 25, 40), period: H1 * U(r, 3, 6) })); t.push(seg(H1 * U(r, 1, 3), dir * U(r, 10, 40), null, 1.8)); }
    else if (fam === 'div_regular') { t.push(seg(H4 * U(r, 3, 5), -dir * U(r, 120, 220), { amp: 18, period: H1 * 3 })); t.push(seg(H1 * U(r, 2, 4), dir * U(r, 40, 70), null, 1.8)); t.push(seg(H1 * U(r, 3, 5), -dir * U(r, 55, 95), null, 1.4)); t.push(seg(M15 * U(r, 4, 9), dir * U(r, 10, 30), null, 1.6)); }
    else if (fam === 'div_hidden') { t.push(seg(H4 * U(r, 4, 7), dir * U(r, 200, 320), { amp: 20, period: H1 * 3 })); t.push(seg(H1 * U(r, 1, 2), -dir * U(r, 60, 90), null, 2.2)); t.push(seg(H1 * U(r, 2, 4), dir * U(r, 50, 80), null, 1.8)); t.push(seg(H1 * U(r, 3, 5), -dir * U(r, 35, 55), null, 1.3)); t.push(seg(M15 * U(r, 4, 9), dir * U(r, 8, 28), null, 1.6)); }
    else if (fam === 'div_stale') { t.push(seg(H4 * U(r, 3, 5), -dir * U(r, 120, 200), { amp: 18, period: H1 * 3 })); t.push(seg(H1 * U(r, 2, 4), dir * U(r, 40, 70), null, 1.8)); t.push(seg(H1 * U(r, 3, 5), -dir * U(r, 55, 90), null, 1.4)); t.push(seg(H1 * U(r, 8, 14), dir * U(r, -10, 30), { amp: 10, period: H1 * 2 }, 1.5)); }
    else if (fam === 'wide') { t.push(seg(H4 * U(r, 3, 5), dir * U(r, 150, 260), { amp: 30, period: H1 * 4 }, 2.6)); t.push(seg(H1 * U(r, 2, 4), -dir * U(r, 80, 130), null, 2.8)); t.push(seg(M15 * U(r, 3, 6), dir * U(r, 30, 60), null, 2.4)); }
    else { t.push(seg(H4 * U(r, 2, 4), dir * U(r, 60, 160), { amp: 25, period: H1 * 3 })); t.push(seg(H4 * U(r, 1, 3), -dir * U(r, 60, 160), { amp: 25, period: H1 * 3 })); t.push(seg(H1 * U(r, 1, 4), dir * U(r, -30, 30), null, 1.8)); }
    return t;
  }
  function future(r, dir) { var f = []; var k = Math.floor(r() * 4); var d1 = k === 0 ? dir : k === 1 ? -dir : k === 2 ? dir : 0;
    f.push(seg(H1 * U(r, 2, 6), d1 * U(r, 20, 90) + U(r, -20, 20), { amp: U(r, 12, 25), period: H1 * U(r, 2, 4) })); f.push(seg(DAY * PE.FUT_DAYS, U(r, -150, 150), { amp: U(r, 15, 30), period: H1 * U(r, 3, 5) })); return f; }

  /* ---------- 相場を作る ---------- */
  // seed から決まる（同じ seed なら同じチャート）。返り値：{ seed, base（5分足）, S（判断の開始の足の番号）, entryTF, days, fam, dir }
  var cache = {}, order = [];
  PE.generate = function (seed) {
    seed = seed >>> 0; if (cache[seed]) return cache[seed];
    var r = rng(seed ^ 0x5bd1e995); var dir = r() < 0.5 ? 1 : -1; var fam = FAM[Math.floor(r() * FAM.length)]; var days = r() < 0.1 ? 30 : 60; var entryTF = r() < 0.7 ? '15m' : '5m';
    var tl = tail(fam, r, dir); var tb = tl.reduce(function (a, s) { return a + s.bars; }, 0); var total = days * DAY;
    var bgDrift = U(r, -1, 1) * U(r, 300, 2600); var bg = seg(total - tb, bgDrift, { amp: U(r, 90, 220), period: DAY * U(r, 5, 9) });
    var fu = future(r, dir); var segs = [bg].concat(tl, fu);
    var all = root.Scenarios._internal.buildCandles(segs, seed, CONFIG.market.basePrice, CONFIG.market.pip);
    var g = { seed: seed, base: all, S: total - 1, entryTF: entryTF, days: days, fam: fam, dir: dir, pip: CONFIG.market.pip };
    cache[seed] = g; order.push(seed); while (order.length > 6) delete cache[order.shift()];
    return g;
  };

  /* ---------- 見えている足（asOf まで） ---------- */
  // 時間足 tf の足（形成中の最後の足は partial:true）
  PE.bars = function (g, tf, asOf) { return SE.aggregate(g.base, PE.tfMin(tf), asOf); };
  // 表示と事実の計算に使う：確定足だけの指標（includeForming なら形成中の足も描く。指標は確定足までで計算した値を使う）
  PE.view = function (g, tf, asOf, opts) {
    opts = opts || {}; var all = PE.bars(g, tf, asOf); var conf = SE.confirmed(all); var w = tf === '1d' || tf === '4h' ? conf.length : PE.WINDOW; var off = Math.max(0, conf.length - w);
    var cw = conf.slice(off).map(function (b) { return { o: b.o, h: b.h, l: b.l, c: b.c, t: b.t0 }; });
    var an = cw.length ? IND.analyze(cw, CONFIG) : null; var forming = all.length > conf.length ? all[all.length - 1] : null;
    return { tf: tf, candles: cw, an: an, offset: off, confirmedCount: conf.length, forming: forming ? { o: forming.o, h: forming.h, l: forming.l, c: forming.c, from: forming.from, to: forming.to } : null, asOf: asOf };
  };
  function atrOf(c, n) { n = n || 14; var tr = []; for (var i = 1; i < c.length; i++) tr.push(Math.max(c[i].h - c[i].l, Math.abs(c[i].h - c[i - 1].c), Math.abs(c[i].l - c[i - 1].c))); var a = null; for (var k = 0; k < tr.length; k++) { if (k === n - 1) { var s = 0; for (var j = 0; j < n; j++) s += tr[j]; a = s / n; } else if (k >= n) a = (a * (n - 1) + tr[k]) / n; } return a || (c.length ? (c[c.length - 1].h - c[c.length - 1].l) || CONFIG.market.pip : CONFIG.market.pip); }
  function dirJa(x) { return ({ up: '上昇', down: '下降', range: 'レンジ・不明瞭', unknown: '判定できない' })[x] || '―'; }
  function dirOf(an) { if (an.emaOrder === 'up' || an.emaOrder === 'down') return an.emaOrder; if (an.dow.trend === 'up' || an.dow.trend === 'down') return an.dow.trend; return 'range'; }
  PE.dirOf = dirOf;

  /* ---------- 判断の時点の事実（asOf まで） ---------- */
  PE.snapshot = function (g, asOf, entryTF) {
    entryTF = entryTF || g.entryTF; var cut = { seed: g.seed, base: g.base.slice(0, asOf + 1), entryTF: g.entryTF, pip: g.pip };   // 未来の足を渡さない
    var lb = g.base[asOf]; var out = { asOf: asOf, entryTF: entryTF, htf: {}, entry: null, price: lb ? lb.c : null, last: lb ? { o: lb.o, h: lb.h, l: lb.l, c: lb.c } : null };   // price：いまの価格（最後の 5分足の終値。エントリー足が形成中でも、いま分かる価格）
    ['1d', '4h'].forEach(function (tf) { var v = PE.view(cut, tf, asOf); var en = SE.enough(v.confirmedCount, PE.HTF_NEED);
      if (!en.ok || !v.an) { out.htf[tf] = { insufficient: true, msg: en.msg, dir: null, have: v.confirmedCount, forming: !!v.forming }; return; }
      var a = v.an; var d = dirOf(a); out.htf[tf] = { insufficient: false, dir: d, emaOrder: a.emaOrder, dow: a.dow.trend, have: v.confirmedCount, forming: !!v.forming,
        basis: '確定した' + PE.tfLabel(tf) + ' ' + v.confirmedCount + ' 本で判定（EMA ' + ({ up: '上昇の並び', down: '下降の並び', mixed: '絡み合い' })[a.emaOrder] + '・波形 ' + dirJa(a.dow.trend) + '）' + (v.forming ? '。形成中の足は使っていない' : '') }; });
    var v = PE.view(cut, entryTF, asOf); var a = v.an; var c = v.candles; var n = c.length - 1;
    if (!a || n < 60) { out.entry = { insufficient: true }; return out; }
    var rciS = SE.rciState(a.rci, n); var piv = SE.pivots(c, CONFIG.zigzag.depth, n);
    var dv = SE.divergence({ pivots: piv.confirmed, forming: piv.forming, macd: a.macd.line, asOf: n });
    var atr = atrOf(c.slice(Math.max(0, n - 60))); var e = a.emaValues; var close = a.close;
    var dist = (close - e[0]) / atr; var dow = a.dow.trend === 'unknown' ? 'unknown' : a.dow.trend;
    var hi60 = -Infinity, lo60 = Infinity, hi40 = -Infinity, lo40 = Infinity, cross = 0;
    for (var k = Math.max(1, n - 60); k < n; k++) { hi60 = Math.max(hi60, c[k].h); lo60 = Math.min(lo60, c[k].l); var x1 = a.emas[2][k], x0 = a.emas[2][k - 1]; if (x1 !== null && x0 !== null && (c[k].c - x1) * (c[k - 1].c - x0) < 0) cross++; }
    for (var k2 = Math.max(0, n - 40); k2 < n; k2++) { hi40 = Math.max(hi40, c[k2].h); lo40 = Math.min(lo40, c[k2].l); }
    var s40 = a.emas[2][Math.max(0, n - 30)] !== null ? (e[2] - a.emas[2][Math.max(0, n - 30)]) / atr : 0; var width = (hi60 - lo60) / atr;
    var inRange = width <= 7.5 && Math.abs(s40) < 1.2 && cross >= 3; var rangePos = (close - lo60) / Math.max(1e-9, hi60 - lo60);
    var sw = { high: null, low: null }; for (var q = piv.confirmed.length - 1; q >= 0; q--) { var p = piv.confirmed[q]; if (sw.high === null && p.type === 'high') sw.high = p.price; if (sw.low === null && p.type === 'low') sw.low = p.price; if (sw.high !== null && sw.low !== null) break; }
    var trendDir = a.emaOrder !== 'mixed' && a.emaOrder === dow ? a.emaOrder : null;
    out.entry = { emaOrder: a.emaOrder, emaSlope: a.emaSlope, dow: dow, rci: rciS, divs: dv.signals.concat(dv.forming), divSignals: dv.signals, divForming: dv.forming, macdState: a.macdState, close: close, atr: atr, atrPips: atr / g.pip,
      distEmaAtr: dist, chaseDir: Math.abs(dist) > 2.2 ? (dist > 0 ? 'up' : 'down') : null, nearEma: Math.abs(close - e[1]) <= atr || (trendDir && Math.abs(close - e[0]) <= 0.8 * atr), trendDir: trendDir,
      inRange: inRange, rangePos: rangePos, breakout: close > hi40 + 0.3 * atr ? 'up' : close < lo40 - 0.3 * atr ? 'down' : null, swing: sw, recentHigh: a.recentHigh, recentLow: a.recentLow,
      surgeAtr: (close - c[Math.max(0, n - 5)].c) / atr, n: n, pivots: piv };
    return out;
  };

  /* ---------- 問題の型（12 カテゴリー）：判断の開始の時点の状況だけで決める ---------- */
  PE.CATEGORIES = [
    { id: 'early', level: 5, title: '上位足と短期足は同じ向き。でもエントリーが早すぎる', lesson: '向きがそろっても、押し目・戻り目の反転（RCI の反転など）を確かめるまで待つ' },
    { id: 'ema_no_rci', level: 2, title: 'EMA は上昇（下降）の並び。でも RCI はまだ反転していない', lesson: 'EMA の並びだけで入らない。RCI が±70圏から反転するのを待つ' },
    { id: 'rci_touch', level: 2, title: 'RCI が±70に届いた。逆張りしたくなる場面', lesson: '±70 に届いた「だけ」では売買の合図にならない。強いトレンドでは張り付くこともある' },
    { id: 'rci_rereversal', level: 2, title: 'RCI は一度反転したが、いまは逆へ再び向きを変えている', lesson: '過去に反転した事実と、いまの向きを分けて見る。再逆行中は反転のシグナルとして使わない' },
    { id: 'regdiv_vs_htf', level: 3, title: '通常のダイバージェンスが確定。でも上位足とは向きが逆', lesson: '通常ダイバージェンスは転換の「候補」。上位足と逆なら単独で逆張りしない' },
    { id: 'hidden_aligned', level: 3, title: 'ヒドゥンダイバージェンスと上位足・EMA の向きがそろう', lesson: 'ヒドゥンは継続の「候補」。ほかの根拠（RCI の反転など）と合わせて判断する' },
    { id: 'reg_vs_hidden', level: 3, title: '通常とヒドゥン、どちらのダイバージェンス？', lesson: '安値（高値）の切り上げ・切り下げと、MACD の山谷の向きを分けて比べる' },
    { id: 'unconfirmed_pivot', level: 4, title: 'まだ確定していない山・谷をシグナルと思いやすい場面', lesson: '右側に足がそろうまで、その山・谷は確定していない。確定前のダイバージェンスは数えない' },
    { id: 'stale_div', level: 4, title: '前に出たダイバージェンスが、もう古くなっている', lesson: 'シグナルには鮮度がある。時間がたったダイバージェンスは根拠として弱い（この教材では期限切れ）' },
    { id: 'wide_stop', level: 6, title: '損切りを置く場所が遠く、無理のない RR が取れない', lesson: '根拠があっても、損切りが遠く利確の余地が小さいなら見送る' },
    { id: 'spike', level: 7, title: '急騰・急落。飛び乗りたくなるが待つのが合理的な場面', lesson: 'EMA から大きく離れた所で追いかけない。戻りを待つ' },
    { id: 'similar', level: 7, title: '似た見た目でも、利確・損切り・見送りと結果が分かれる相場', lesson: '同じ根拠でも結果はばらつく。1回の結果ではなく、ルールどおりに判断できたかを見る' }
  ];
  PE.cat = function (id) { for (var i = 0; i < PE.CATEGORIES.length; i++) if (PE.CATEGORIES[i].id === id) return PE.CATEGORIES[i]; return null; };
  PE.classify = function (snap, prof) {
    var e = snap.entry; if (!e || e.insufficient) return []; prof = prof || SPFn().values('mochipoyo'); var out = [];
    var h4 = snap.htf['4h'] || {}; var hd = h4.insufficient ? null : h4.dir; var d1 = snap.htf['1d'] || {}; var dd = d1.insufficient ? null : d1.dir;
    var d = e.emaOrder !== 'mixed' ? e.emaOrder : null; var sideOf = function (x) { return x === 'up' ? 'buy' : 'sell'; };
    var conf = e.divSignals.filter(function (s) { return s.status === 'confirmed'; }), exp = e.divSignals.filter(function (s) { return s.status === 'expired'; });
    var rs = e.rci;
    if (d && hd === d && e.dow === d && !rs.signal && !e.chaseDir && !rs.zone && ((d === 'up' && rs.slope === 'down') || (d === 'down' && rs.slope === 'up'))) out.push('early');
    if (d && !rs.signal && ((d === 'up' && rs.zone === 'oversold') || (d === 'down' && rs.zone === 'overbought'))) out.push('ema_no_rci');
    if (d && ((d === 'up' && rs.zone === 'overbought') || (d === 'down' && rs.zone === 'oversold')) && !rs.signal) out.push('rci_touch');
    if (/re_reversed/.test(rs.state)) out.push('rci_rereversal');
    if (conf.some(function (s) { return s.kind === 'regular' && ((s.direction === 'bull' && (hd === 'down' || dd === 'down')) || (s.direction === 'bear' && (hd === 'up' || dd === 'up'))); })) out.push('regdiv_vs_htf');
    if (conf.some(function (s) { return s.kind === 'hidden' && ((s.direction === 'bull' && hd === 'up' && d === 'up') || (s.direction === 'bear' && hd === 'down' && d === 'down')); })) out.push('hidden_aligned');
    if (conf.length) out.push('reg_vs_hidden');
    if (e.divForming.length && !conf.some(function (s) { return e.divForming.some(function (f) { return f.type === s.type; }); })) out.push('unconfirmed_pivot');
    if (exp.length && !conf.length) out.push('stale_div');
    if (d && hd === d && rs.signal === d) { var ref = d === 'up' ? e.swing.low : e.swing.high; if (ref !== null) { var risk = Math.abs(e.close - ref) + prof.slBufferPips * snap.pip0; var room = d === 'up' ? e.recentHigh - e.close : e.close - e.recentLow; if (risk >= 2.5 * e.atr && room < 1.5 * risk) out.push('wide_stop'); } }
    if (e.chaseDir && Math.abs(e.surgeAtr) >= 2.5) out.push('spike');
    if (['buy', 'sell'].some(function (s) { return SPFn().evaluateEntry(snap, s, prof).met; })) out.push('similar');
    return out;
  };

  /* ---------- 1回のプレイ（問題）：公開してよい情報だけを持つ ---------- */
  // pick：{ seed, cat, set }（js/data/practice-seeds.js から）。cat・set はプレイの記録（振り返り）まで画面に出さない
  PE.start = function (pick, opts) {
    opts = opts || {}; var g = PE.generate(pick.seed); var tf = opts.entryTF || g.entryTF; var sm = PE.STEP_MINS.indexOf(opts.stepMin) >= 0 ? opts.stepMin : PE.tfMin(tf);
    return { seed: g.seed, set: pick.set || 'learn', cat: pick.cat || null, entryTF: tf, suggestedTF: g.entryTF, stepMin: sm, step: sm / 5, S: g.S, asOf: g.S, steps: 0, maxSteps: Math.round(PE.WAIT_MIN / sm), waitBars: PE.WAIT_MIN / 5, holdBars: PE.HOLD_MIN / 5, pip: g.pip, days: g.days,
      profile: opts.profile || 'mochipoyo', level: opts.level || 1, hints: opts.hints !== false, advanced: !!opts.advanced, phase: 'analysis', events: [], viewed: {}, answers: {}, hypothesis: null, claims: null, entry: null, settle: null, metAt: [], tfLog: [], startedAt: Date.now() };
  };
  // v9.1 エントリー足の選択（5分足・15分足）：同じ問題・同じ時刻（asOf は 5分足の番号）のまま、どちらの足で判断するかを選ぶ。仮説を登録する前だけ変えられる。記録に残す
  PE.setEntryTF = function (play, tf) { if (play.phase !== 'analysis' || play.hypothesis || (tf !== '5m' && tf !== '15m')) return false; if (play.entryTF === tf) return true; play.entryTF = tf; play.tfLog.push({ tf: tf, asOf: play.asOf, at: Date.now() }); play.events.push({ kind: 'tf', tf: tf, asOf: play.asOf, at: Date.now() }); return true; };
  // v9.1 1回に進める時間（5分・15分）：エントリー足とは別。待ち・保有の上限は分で決まっているので、進め方を変えても上限は同じ
  PE.setStep = function (play, min) { if (PE.STEP_MINS.indexOf(min) < 0 || (play.phase !== 'analysis' && play.phase !== 'waiting' && play.phase !== 'holding')) return false; play.stepMin = min; play.step = min / 5; play.maxSteps = play.steps + Math.ceil(Math.max(0, play.S + play.waitBars - play.asOf) / play.step); play.events.push({ kind: 'stepMin', min: min, asOf: play.asOf, at: Date.now() }); return true; };
  PE.waitLeftMin = function (play) { return Math.max(0, (play.S + play.waitBars - play.asOf) * 5); };
  PE.game = function (play) { return PE.generate(play.seed); };
  PE.snap = function (play) { var s = PE.snapshot(PE.game(play), play.asOf, play.entryTF); s.pip0 = play.pip; return s; };
  // 足を1本（エントリー足で）進める。進めたら、その時点で条件がそろったか（両方の向き）を記録する（採点の「条件がそろった足」）
  PE.advance = function (play, prof) {
    var g = PE.game(play); if (play.phase !== 'waiting' && play.phase !== 'analysis') return false;
    var limit = play.S + (play.waitBars || PE.WAIT_MIN / 5);
    if (play.asOf >= limit || play.asOf + 1 >= g.base.length) { play.phase = 'timeout'; play.events.push({ kind: 'timeout', asOf: play.asOf, at: Date.now() }); return false; }
    play.asOf = Math.min(play.asOf + play.step, limit, g.base.length - 1); play.steps++; play.phase = 'waiting';
    var sn = PE.snap(play); prof = prof || SPFn().values(play.profile, play.overrides);
    ['buy', 'sell'].forEach(function (s) { var ch = SPFn().evaluateEntry(sn, s, prof); if (ch.met) play.metAt.push({ asOf: play.asOf, side: s, label: play.steps + '本目（' + (s === 'buy' ? '買い' : '売り') + '）' }); });
    play.events.push({ kind: 'step', asOf: play.asOf, at: Date.now() });
    return true;
  };
  // 開始の時点（0本目）の条件も記録
  PE.markStart = function (play, prof) { var sn = PE.snap(play); prof = prof || SPFn().values(play.profile, play.overrides); ['buy', 'sell'].forEach(function (s) { if (SPFn().evaluateEntry(sn, s, prof).met) play.metAt.push({ asOf: play.asOf, side: s, label: '開始の時点（' + (s === 'buy' ? '買い' : '売り') + '）' }); }); return sn; };

  /* ---------- 注文の確認（発注の前） ----------
     o：{ side, sl, tp, riskPercent }。約定の予定価格：買い＝いまの終値＋スプレッド/2、売り＝終値−スプレッド/2（入口のスリッページは決済で足す）
     返り値：{ ok, validation, sizing, entryMid, entryPx, maxLoss, rr, breakeven, errors（画面に出す文） } */
  PE.preview = function (play, o, capital, prof) {
    var TC = root.TradeCore; prof = prof || SPFn().values(play.profile, play.overrides); var sn = PE.snap(play); var mid = isFinite(sn.price) ? sn.price : sn.entry.close; var side = TC.sideOf(o.side);   // v9.1 約定の予定はいまの価格（最後の 5分足の終値）から
    var half = TC.COSTS.spreadPips * play.pip / 2; var px = side === 'buy' ? mid + half : mid - half;
    var v = TC.validateOrder({ side: side, entry: px, sl: o.sl, tp: o.tp, requireSL: prof.slRequired, requireTP: prof.tpRequired, spreadPips: TC.COSTS.spreadPips, basis: '約定の予定価格（' + (side === 'buy' ? '買値' : '売値') + '）' });
    // ロット：損切りで終わったときの損失（約定の予定価格→損切り＋入口の滑り＋損切りの滑り）が許容損失を超えないように
    var lossPips = v.ok ? v.riskPips + TC.COSTS.stopSlipPips + TC.COSTS.entrySlipPips : null;
    var sz = v.ok ? TC.sizePosition({ capital: capital, riskPercent: o.riskPercent, riskPips: lossPips }) : null;
    var errs = v.errors.map(function (e) { return e.msg; }); if (sz && !sz.ok) errs = errs.concat(sz.errors.map(function (e) { return e.msg; }));
    if (!(isFinite(capital) && capital > 0)) errs.push('仮想資金が0円以下のため、新しい注文は出せない（成績・設定から資金を戻せる）');
    if (v.ok && o.riskPercent > prof.maxRiskPercent) v.warnings.push({ code: 'risk_over', msg: '許容損失 ' + o.riskPercent + '% はこのプロファイルの上限（' + prof.maxRiskPercent + '%）を超える' });
    var init = (root.CONFIG && root.CONFIG.risk && root.CONFIG.risk.capital) || 1000000; if (isFinite(capital) && capital > 0 && capital < init * PE.LOW_CAPITAL) v.warnings.push({ code: 'low_capital', msg: '仮想資金が初期の' + Math.round(PE.LOW_CAPITAL * 100) + '%を下回っている（連敗の後など）。許容損失%を下げる・いったん休むことも考える（教材の仮設定の目安）' });
    var ok = v.ok && !!sz && sz.ok && isFinite(capital) && capital > 0; var pv = TC.spec().pipValue;
    // 通常約定時の推定損失（損切りで終わったとき）と、窓で損切りを越えたときのストレス例（仮定。保証・予測ではない）
    var est = ok ? sz.actualRisk : null; var atrPips = sn.entry.atrPips;
    var stress = ok ? PE.STRESS_ATR.map(function (k) { var loss = sz.lots * pv * (v.riskPips + TC.COSTS.entrySlipPips + k * atrPips); return { atr: k, pips: Math.round((v.riskPips + TC.COSTS.entrySlipPips + k * atrPips) * 10) / 10, loss: Math.round(loss), pct: Math.round(loss / capital * 10000) / 100 }; }) : [];
    return { ok: ok, validation: v, sizing: sz, entryMid: mid, entryPx: px, estLoss: est, maxLoss: est, estLossPct: est !== null ? Math.round(est / capital * 10000) / 100 : null, lossPips: lossPips, stress: stress, rr: v.rr, breakeven: v.rr ? TC.breakevenWinRate(v.rr) : null, errors: errs, warnings: v.warnings.map(function (w) { return w.msg; }), snap: sn };
  };
  // 発注（検証に通ったときだけ）。決済は、エントリー足の確定足で TradeCore.settleBars（未来の足は、足送りで1本ずつ見せる）
  PE.enter = function (play, o, capital, claims, prof) {
    if (play.entry || (play.phase !== 'waiting' && play.phase !== 'analysis')) return { ok: false, duplicate: true, preview: { errors: ['この問題ではもう発注・決定している（二重の発注はしない）'] } };   // v9.1 二重発注の防止
    prof = prof || SPFn().values(play.profile, play.overrides); var pv = PE.preview(play, o, capital, prof); if (!pv.ok) return { ok: false, preview: pv };
    var sn = pv.snap; var side = root.TradeCore.sideOf(o.side); var check = SPFn().evaluateEntry(sn, side, prof);
    // v9.1 決済は 5分足（もとの足）で判定する（エントリー足が 15分足でも、同じ時刻の同じ値動きで決まる）。約定はいまの 5分足の終値（＋スプレッド・滑り）、判定は次の 5分足から
    var g = PE.game(play); var ei = play.asOf; var hold = play.holdBars || PE.HOLD_MIN / 5; var st = null, pos = null;
    if (play.advanced && root.PositionEngine) { pos = root.PositionEngine.open({ side: side, entryMid: pv.entryMid, sl: pv.validation.sl, tp: pv.validation.tp, lots: pv.sizing.lots, entryIndex: ei, maxBars: hold });
      if (!pos.ok) return { ok: false, preview: { errors: pos.errors } }; }
    else st = root.TradeCore.settleBars(g.base, ei, { side: side, entry: pv.entryMid, sl: pv.validation.sl, tp: pv.validation.tp }, { maxBars: hold, atr: sn.entry.atr, lots: pv.sizing.lots });
    play.entry = { side: side, asOf: play.asOf, order: pv.validation, sizing: pv.sizing, riskPercent: o.riskPercent, check: check, swing: sn.entry.swing, pip: play.pip, snap: { htf: sn.htf }, entryIndex: ei, entryPrice: pos ? pos.entryFill : st.entryPrice, exitAsOf: st && st.ok ? st.exitIndex : null, plan: o.plan || null, atr: sn.entry.atr };
    play.settle = st; play.pos = pos; play.claims = claims || play.claims || {}; play.claimCheck = check; play.phase = 'holding'; play.holdShown = 0; play.events.push({ kind: 'enter', asOf: play.asOf, side: side, at: Date.now() });
    return { ok: true, preview: pv, check: check };
  };
  // 保有中の足送り（当初の損切り・利確は動かさない）。決済の足まで来たら終わり
  PE.holdStep = function (play) {
    if (play.phase !== 'holding') return false; var g = PE.game(play);
    if (play.pos) {   // 上級の管理：5分足を 1 本ずつ、出来事で進める（見えている足より先は使わない）
      var PS = root.PositionEngine; var tgt = Math.min(g.base.length - 1, play.asOf + play.step);
      while (play.asOf < tgt && !play.pos.closed) { play.asOf++; PS.step(play.pos, g.base, play.asOf); }
      if (!play.pos.closed && play.asOf >= g.base.length - 1) PS.finish(play.pos, g.base);
      play.holdShown++; if (play.pos.closed) { play.settle = PS.summary(play.pos); play.entry.exitAsOf = play.pos.exitIndex; play.phase = 'closed'; play.events.push({ kind: 'exit', asOf: play.asOf, reason: play.settle.reason, at: Date.now() }); }
      return true; }
    var next = Math.min(play.entry.exitAsOf, play.asOf + play.step); if (next >= g.base.length) next = g.base.length - 1; play.asOf = next; play.holdShown++; if (play.asOf >= play.entry.exitAsOf) { play.phase = 'closed'; play.events.push({ kind: 'exit', asOf: play.asOf, reason: play.settle.reason, at: Date.now() }); } return true; };
  // v9.1 上級のポジション管理（play.advanced のときだけ）：a＝{ type:'fullClose'|'be'|'modifySL'|'partialClose'|'trail', … , why（早めの決済の理由） }。いまの足（asOf）が確定した後の判断
  PE.manage = function (play, a) {
    if (play.phase !== 'holding' || !play.pos) return { ok: false, error: '上級の管理は、上級のポジション管理を ON にして保有しているときだけ' };
    var sn = PE.snap(play); var r = root.PositionEngine.act(play.pos, a, { bars: PE.game(play).base, atr: sn.entry && sn.entry.atr });
    if (r.ok) { var ev = { kind: 'manage', type: a.type, asOf: play.asOf, at: Date.now() }; if (a.why) ev.why = a.why; if (a.fraction) ev.fraction = a.fraction; ev.facts = PE.mgmtFacts(sn, play.entry.side); ev.mfeR = play.pos.riskPips0 ? Math.round(play.pos.mfe / play.pip / play.pos.riskPips0 * 100) / 100 : null; play.events.push(ev); }
    return r;
  };
  // その時点の事実（早めの決済などの理由が、チャートの事実と合っているかを振り返りで比べる）
  PE.mgmtFacts = function (sn, side) { var d = side === 'buy' ? 'up' : 'down', o = d === 'up' ? 'down' : 'up'; var e = sn.entry || {}; var h4 = sn.htf && sn.htf['4h'];
    return { rciAgainst: !!(e.rci && e.rci.signal === o), emaAgainst: e.emaOrder === o, dowAgainst: e.dow === o, h4Against: !!(h4 && !h4.insufficient && h4.dir === o), divAgainst: (e.divSignals || []).some(function (s) { return s.status === 'confirmed' && s.direction === (o === 'up' ? 'bull' : 'bear'); }) }; };
  PE.skip = function (play, claims) { if (play.entry || (play.phase !== 'waiting' && play.phase !== 'analysis')) return false; play.phase = 'skipped'; play.claims = claims || play.claims || null; play.events.push({ kind: 'skip', asOf: play.asOf, at: Date.now() }); return true; };

  /* ---------- レベルごとの読み取りの設問（判断の開始の時点の事実で採点。答えは振り返りまで出さない） ---------- */
  var RCI_OPT = [['neutral', '中立（±70圏の外・有効な反転なし）'], ['overbought', '+70以上（買われすぎ圏）'], ['oversold', '−70以下（売られすぎ圏）'], ['turning_up', '−70圏から上向きに反転（継続中）'], ['turning_down', '+70圏から下向きに反転（継続中）'], ['after', '反転のあと止まった・逆へ再逆行・古い反転']];
  var DIV_OPT = [['none', 'なし'], ['regular_bull', '通常の強気'], ['regular_bear', '通常の弱気'], ['hidden_bull', 'ヒドゥンの強気'], ['hidden_bear', 'ヒドゥンの弱気'], ['forming', '形成中のものだけ（まだ数えない）'], ['expired', '期限切れのものだけ']];
  PE.focusQuestions = function (level, snap) {
    var e = snap.entry || {}; var Q = [];
    if (level === 1) { Q.push({ key: 'ema', title: 'エントリー足の EMA20/30/40 の並びは？', options: [['up', '上昇の並び（20＞30＞40）'], ['down', '下降の並び（20＜30＜40）'], ['mixed', '絡み合っている']], truth: [e.emaOrder] });
      Q.push({ key: 'dow', title: 'エントリー足の確定した高値・安値（ダウ）は？', options: [['up', '切り上げ（上昇）'], ['down', '切り下げ（下降）'], ['range', 'そろっていない（レンジ）'], ['unknown', '確定した山谷が足りない']], truth: [e.dow] }); }
    if (level === 2 && e.rci) { var st = e.rci.state; var t = /^(neutral|overbought|oversold|turning_up|turning_down)$/.test(st) ? st : 'after'; Q.push({ key: 'rci', title: 'RCI(9) の状態は？（いまの足で確認できること）', options: RCI_OPT, truth: [t] }); }
    if (level === 3) { var conf = (e.divSignals || []).filter(function (x) { return x.status === 'confirmed'; }).map(function (x) { return x.type; }); var tr = conf.length ? conf : (e.divForming || []).length ? ['forming'] : (e.divSignals || []).some(function (x) { return x.status === 'expired'; }) ? ['expired'] : ['none'];
      Q.push({ key: 'div', title: 'MACD のダイバージェンス（確定した山谷・期限内）は？', options: DIV_OPT, truth: tr }); }
    if (level === 4) { var h = snap.htf || {}; var a = h['1d'] && !h['1d'].insufficient ? h['1d'].dir : null, b = h['4h'] && !h['4h'].insufficient ? h['4h'].dir : null;
      var m = !a || !b || a === 'range' || b === 'range' ? 'unclear' : a === b ? 'same' : 'diff'; Q.push({ key: 'mtf', title: '日足と4時間足の向きは？', options: [['same', '一致している'], ['diff', '食い違っている'], ['unclear', 'どちらかがレンジ・不明瞭・履歴不足']], truth: [m] });
      var pv = e.pivots || { confirmed: [], forming: [] }; var lc = pv.confirmed.length ? pv.confirmed[pv.confirmed.length - 1].index : -1; var lf = pv.forming.length ? pv.forming[pv.forming.length - 1].index : -1;
      Q.push({ key: 'pivot', title: 'エントリー足の最後の山・谷（ZigZag の最後の点）は確定している？', options: [['confirmed', '確定している（右に4本以上の足がある）'], ['forming', 'まだ確定していない（右の足が足りない）']], truth: [lf > lc ? 'forming' : 'confirmed'] }); }
    return Q;
  };
  PE.focusItems = function (play, snap) {
    return PE.focusQuestions(play.level, snap).map(function (q) { var a = (play.focus || {})[q.key]; var okA = q.truth.indexOf(a) >= 0; var lab = function (k) { for (var i = 0; i < q.options.length; i++) if (q.options[i][0] === k) return q.options[i][1]; return k; };
      return { cat: 'setup', name: '読み取り：' + q.title.replace(/は？.*$/, ''), got: okA ? 6 : 0, max: 6, note: (okA ? '正解：' : (a ? 'あなた：' + lab(a) + ' → 実際：' : '未回答 → 実際：')) + q.truth.map(lab).join('／') }; });
  };
  PE.wait = function (play) { play.waits = (play.waits || 0) + 1; play.events.push({ kind: 'wait', asOf: play.asOf, at: Date.now() }); };

  /* ---------- 上級のポジション管理の採点（計画と実際の管理を比べる。利確・損切りという結果では点を決めない） ----------
     plan：hold（当初のまま）／be1r（+1R で建値）／partial1r（+1R で半分）／trail（トレーリング）
     ・計画を決めたか（執行 3 点）・計画に沿った管理か（規律 6 点）・早めの決済の理由が、その時点のチャートの事実と合っているか（規律 6 点。早めの決済をしたときだけ） */
  PE.REASON_FACT = { rci: 'rciAgainst', ema: 'emaAgainst', dow: 'dowAgainst', h4: 'h4Against', div: 'divAgainst' };
  PE.REASON_LABEL = { rci: 'RCI が逆向きに反転', ema: 'EMA の並びが逆', dow: 'ダウが逆', h4: '4時間足の向きが逆', div: '逆向きのダイバージェンスの確定', time: '予定した時間・区切り', emotion: '怖くなった・利益を早く確保したくなった' };
  PE.mgmtItems = function (play) {
    if (!play.advanced || !play.entry || !play.pos) return []; var out = []; var plan = play.entry.plan; var M = play.events.filter(function (e) { return e.kind === 'manage'; });
    var PL = { hold: '当初の損切り・利確のまま', be1r: '+1R で建値へ', partial1r: '+1R で半分を決済', trail: 'トレーリング' };
    out.push({ cat: 'execution', name: '決済管理の計画', got: plan && PL[plan] ? 3 : 0, max: 3, note: plan && PL[plan] ? '発注の前に決めた：' + PL[plan] : '計画を決めずに発注した' });
    var be = M.filter(function (e) { return e.type === 'be'; }), part = M.filter(function (e) { return e.type === 'partialClose'; }), tr = M.filter(function (e) { return e.type === 'trail'; }), cl = M.filter(function (e) { return e.type === 'fullClose'; }), mod = M.filter(function (e) { return e.type === 'modifySL'; });
    var mfeR = play.pos.riskPips0 ? play.pos.mfe / play.pip / play.pos.riskPips0 : 0; var got = 6, notes = [];
    if (plan === 'hold') { if (be.length || part.length || tr.length || mod.length) { got -= 3; notes.push('計画は「当初のまま」だったが、途中で損切り・ロットを変えた'); } }
    else if (plan === 'be1r') { var early = be.filter(function (e) { return e.mfeR !== null && e.mfeR < 1; }); if (early.length) { got -= 2; notes.push('+1R に届く前（その時点の最大順行 ' + early[0].mfeR.toFixed(2) + 'R）に建値へ動かした（ふつうの押し戻りで止まりやすい）'); } if (!be.length && mfeR >= 1) { got -= 3; notes.push('+1R（最大順行 ' + mfeR.toFixed(2) + 'R）に届いたのに、計画した建値への移動をしなかった'); } if (part.length || tr.length) { got -= 1; notes.push('計画にない管理（部分決済・トレーリング）もした'); } }
    else if (plan === 'partial1r') { var ep = part.filter(function (e) { return e.mfeR !== null && e.mfeR < 1; }); if (ep.length) { got -= 2; notes.push('+1R に届く前に部分決済した'); } if (!part.length && mfeR >= 1) { got -= 3; notes.push('+1R（最大順行 ' + mfeR.toFixed(2) + 'R）に届いたのに、計画した部分決済をしなかった'); } }
    else if (plan === 'trail') { if (!tr.length) { got -= 3; notes.push('計画したトレーリングを設定しなかった'); } }
    out.push({ cat: 'discipline', name: '計画と実際の管理', got: Math.max(0, got), max: 6, note: notes.length ? notes.join('／') : (M.length ? '計画どおりに管理した' : '計画どおり、当初の注文のまま見届けた') + '（結果の良し悪しでは点を決めない）' });
    cl.forEach(function (e) { var k = PE.REASON_FACT[e.why]; var lab = PE.REASON_LABEL[e.why] || '理由なし';
      if (k) out.push({ cat: 'discipline', name: '早めの決済の理由', got: e.facts && e.facts[k] ? 6 : 0, max: 6, note: '理由「' + lab + '」：' + (e.facts && e.facts[k] ? 'その時点のチャートで確認できた（計画の外でも、根拠のある判断）' : 'その時点のチャートでは起きていなかった（事実と合わない理由での決済）') });
      else if (e.why === 'time') out.push({ cat: 'discipline', name: '早めの決済の理由', got: 4, max: 6, note: '理由「予定した時間・区切り」：計画に書いておくと、なお良い' });
      else out.push({ cat: 'discipline', name: '早めの決済の理由', got: 1, max: 6, note: '理由「' + lab + '」：計画にない、気持ちによる決済。正直に選べたのは良い。次は発注の前の計画で決めておく' }); });
    return out;
  };

  /* ---------- 採点・記録 ---------- */
  PE.grade = function (play, context, prof) {
    prof = prof || SPFn().values(play.profile, play.overrides); var g = PE.game(play); var start = PE.snapshot(g, play.S, play.entryTF); start.pip0 = play.pip;
    var kind = play.phase === 'holding' || play.phase === 'closed' ? 'trade' : play.phase === 'skipped' ? 'skip' : 'timeout';
    var claimSide = play.entry ? play.entry.side : (play.hypothesis && play.hypothesis.bias === 'sell' ? 'sell' : 'buy');
    var claimCheck = play.entry ? play.entry.check : SPFn().evaluateEntry(PE.snap(play), claimSide, prof);
    var pnl = null; if (kind === 'trade' && play.settle && play.settle.ok && play.entry.sizing) pnl = isFinite(play.settle.pnlYenAfterCommission) ? play.settle.pnlYenAfterCommission : Math.round(play.settle.netPips * play.entry.sizing.lots * root.TradeCore.spec().pipValue);
    var res = SPFn().grade({ profile: prof, facts: start, extraItems: PE.focusItems(play, start).concat(PE.mgmtItems(play)), answers: play.answers, viewedHtf: !!(play.viewed['1d'] && play.viewed['4h']), claims: play.claims || {}, claimCheck: play.claims ? claimCheck : null, outcomeKind: kind, entry: play.entry, metAt: play.metAt, settle: play.settle, pnl: pnl, context: context || {} });
    res.kind = kind; res.pnl = pnl; return res;
  };
  // 記録の1行（セーブの practice.history に入れる。チャートは保存しない：seed から作り直せる）
  PE.record = function (play, grade, capitalBefore) {
    var st = play.settle; var tr = grade.kind === 'trade' && st && st.ok;
    var ev = play.entry ? play.entry.check.evidence.filter(function (x) { return x.ok; }).map(function (x) { return x.key; }) : [];
    var prof = SPFn().values(play.profile, play.overrides); var snapP = {}; Object.keys(prof).forEach(function (k) { if (k !== 'name') snapP[k] = prof[k]; });
    var st2 = play.settle; var adv = !!(play.pos && st2 && st2.advanced);
    var decided = play.entry ? play.entry.asOf : play.asOf;
    return { v: 3, answers: { '1d': play.answers['1d'] || null, '4h': play.answers['4h'] || null }, decidedMin: (decided - play.S) * 5, tfSuggested: play.suggestedTF || null, tfLog: (play.tfLog || []).map(function (x) { return x.tf; }), stepMin: play.stepMin || null, advanced: adv, plan: play.entry ? play.entry.plan : null, actions: adv ? st2.actions : null, fills: adv ? st2.fills.map(function (f) { return [f.kind, f.index, f.lots, f.pips]; }) : null, maeR: adv ? st2.maeR : null, mfeR: adv ? st2.mfeR : null, worstOpenYen: adv ? st2.worstOpenYen : null,
      engineVersion: PE.ENGINE_VERSION, scenarioVersion: play.scenarioVersion || PE.SCENARIO_VERSION, gen: play.gen || 'A', checksum: PE.checksum(PE.game(play)), profileSnap: snapP, grossR: tr ? st.grossR : null, grossPips: tr ? st.grossPips : null, commissionYen: tr ? st.commissionYen : null, ifTpFirstR: tr && st.ifTpFirst ? st.ifTpFirst.riskR : null,
      t: Date.now(), seed: play.seed, set: play.set, cat: play.cat, tf: play.entryTF, profile: play.profile, level: play.level, kind: grade.kind, process: grade.process,
      side: play.entry ? play.entry.side : null, sl: play.entry ? play.entry.order.sl : null, tp: play.entry ? play.entry.order.tp : null, lots: play.entry && play.entry.sizing ? play.entry.sizing.lots : null,
      riskPercent: play.entry ? play.entry.riskPercent : null, maxLoss: play.entry && play.entry.sizing ? Math.round(play.entry.sizing.actualRisk) : null, plannedRR: play.entry ? play.entry.order.rr : null,
      netPips: tr ? st.netPips : null, riskR: tr ? st.riskR : null, costPips: tr ? st.costPips : null, mae: tr ? st.maePips : null, mfe: tr ? st.mfePips : null, reason: tr ? st.reason : null, ambiguous: tr ? st.ambiguous : false,
      pnl: grade.pnl, capitalAfter: tr && isFinite(grade.pnl) ? Math.max(0, capitalBefore + grade.pnl) : capitalBefore, evidence: ev, compliant: grade.compliant, violations: grade.violations, viewedHtf: !!(play.viewed['1d'] && play.viewed['4h']), steps: play.steps, waits: play.waits || 0, hints: play.hintsUsed || 0, cats: (function () { var o = {}; Object.keys(grade.cats).forEach(function (k) { o[k] = [grade.cats[k].got, grade.cats[k].max]; }); return o; })() };
  };

  root.PracticeEngine = PE;
  if (typeof module !== 'undefined' && module.exports) module.exports = PE;
})(typeof window !== 'undefined' ? window : globalThis);
