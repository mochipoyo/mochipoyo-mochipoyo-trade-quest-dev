/* =========================================================
   RPG / TradeBattle（v6.4 Phase D）：相場都市トレディアのトレーダーとの「トレードバトル」
   ・既存の学習シナリオ（Scenarios）・分析（Indicators）・採点（TradeEval.evaluateFull / simulate）をそのまま使う
   ・プレイヤーと NPC は同じ場面（同じシナリオ・同じシード）で、買い／売り／見送りと注文を決める
   ・NPC は「判断の時点までの足（scn.base）」だけから自分の分析を作って決める。将来の足（scn.future・states[].future）は渡さない
     → TradeBattle.npcView(scn) が base だけで分析を作り、NPC の戦略関数はその view だけを受け取る
   ・勝敗は損益だけで決めない：判断の質（分析・方向・理由・損切り・RR・リスク%）＋結果（損益をリスク単位で）＋規律（違反の数）。
     リスクを取りすぎた取引（リスク%が2%超、損切りなし）は合計の上限を40点にする（大きく勝っても高評価にしない）
   ========================================================= */
(function (root) {
  'use strict';
  var TB = {};
  var CONFIG = root.CONFIG, IND = root.Indicators;

  /* ---------- NPC が見てよいもの（判断の時点まで） ---------- */
  TB.npcView = function (scn) {
    var base = scn.base; var out = { focusTF: scn.def.focusTF, tf: {} };
    CONFIG.timeframes.forEach(function (t) { out.tf[t.id] = IND.analyze(IND.aggregate(base, t.factor), CONFIG); });
    out.f = out.tf[scn.def.focusTF]; out.h4 = out.tf['4h']; out.d1 = out.tf['1d'];
    return out;
  };
  function dir(a) { if (a.emaOrder === 'up' || a.emaOrder === 'down') return a.emaOrder; if (a.dow.trend === 'up' || a.dow.trend === 'down') return a.dow.trend; return 'range'; }
  function htfOf(v) { return dir(v.h4) !== 'range' ? dir(v.h4) : dir(v.d1); }
  function divOf(f) { return f.div.hiddenBull ? 'hidden_bull' : f.div.hiddenBear ? 'hidden_bear' : f.div.regularBull ? 'regular_bull' : f.div.regularBear ? 'regular_bear' : 'none'; }
  function swingOf(f) { var hi = null, lo = null; for (var q = f.pivots.length - 1; q >= 0; q--) { var p = f.pivots[q]; if (!p.confirmed) continue; if (!hi && p.type === 'high') hi = { index: p.index, price: p.price }; if (!lo && p.type === 'low') lo = { index: p.index, price: p.price }; if (hi && lo) break; } return { high: hi, low: lo }; }
  // 自分が見る項目は読んだとおりに答え、見ない項目は決めつけ（default）で答える
  function readAll(v) { var f = v.f; return { htf: htfOf(v), trend: (f.dow.trend === 'up' || f.dow.trend === 'down') ? f.dow.trend : 'range', ema: f.emaOrder, rci: f.rciState, macd: divOf(f) }; }
  function answers(v, checks, defaults) { var r = readAll(v); var out = {}; ['htf', 'trend', 'ema', 'rci', 'macd'].forEach(function (k) { out[k] = checks.indexOf(k) >= 0 ? r[k] : (defaults && defaults[k]) || ({ htf: 'range', trend: 'range', ema: 'mixed', rci: 'neutral', macd: 'none' })[k]; }); return out; }
  // 注文：損切りは直近スイングの外側（＋余裕 pad pips）、利確はリスクの rr 倍
  function order(v, action, rr, pad, tight) {
    var f = v.f, pip = CONFIG.market.pip, e = f.close; if (action === 'skip') return { sl: null, tp: null };
    var sl;
    if (tight) sl = action === 'buy' ? e - tight * pip : e + tight * pip;
    else sl = action === 'buy' ? Math.min(f.lastLow, f.recentLow) - (pad || 3) * pip : Math.max(f.lastHigh, f.recentHigh) + (pad || 3) * pip;
    var risk = Math.abs(e - sl); var tp = rr ? (action === 'buy' ? e + risk * rr : e - risk * rr) : null;
    return { sl: Math.round(sl * 1000) / 1000, tp: tp === null ? null : Math.round(tp * 1000) / 1000 };
  }
  function pack(v, action, reason, an, rr, risk, opt) { opt = opt || {}; var o = opt.noSL ? { sl: null, tp: action === 'skip' ? null : order(v, action, rr, opt.pad).tp } : order(v, action, rr, opt.pad, opt.tight); return { action: action, reason: reason, analysis: an, sl: o.sl, tp: o.tp, riskPercent: risk, swing: opt.swing ? swingOf(v.f) : { high: null, low: null }, hintLevel: 0, checkedHigherTF: an.htf !== 'range' || opt.checkedHigherTF, note: opt.note || '' }; }

  /* ---------- 12人の考え方（入力は npcView だけ） ---------- */
  TB.STRATEGY = {
    // 短期売買：直近5本の勢いとEMAの傾きだけで入る。損切りは近い（12pips）、利確も近い（1:1）
    ren: function (v) { var f = v.f, an = answers(v, ['trend', 'ema']); var a = f.surge > 8 && f.emaSlope === 'up' ? 'buy' : f.surge < -8 && f.emaSlope === 'down' ? 'sell' : 'skip'; return pack(v, a, a === 'skip' ? 'range' : 'feel', an, 1.0, 1, { tight: 12, note: '直近の勢いに乗って、近い損切り・近い利確' }); },
    // 日中のトレンド：15分足の波形とEMAが同じ向きで、価格がEMAの外側なら順張り
    kai: function (v) { var f = v.f, an = answers(v, ['trend', 'ema', 'rci']); var d = dir(f); var a = (d === 'up' && f.pricePos !== 'below') ? 'buy' : (d === 'down' && f.pricePos !== 'above') ? 'sell' : 'skip'; return pack(v, a, a === 'skip' ? 'range' : 'align', an, 1.5, 1, { swing: true, note: '15分足のトレンドに沿って入る' }); },
    // 上位足重視：4時間足（不明瞭なら日足）と15分足が一致したときだけ。食い違いは見送り
    leo: function (v) { var f = v.f, an = answers(v, ['htf', 'trend', 'ema', 'rci']); var h = htfOf(v), d = dir(f); var a = 'skip', why = 'conflict';
      if (h === 'range') why = 'range'; else if (d === h) { a = h === 'up' ? 'buy' : 'sell'; why = (f.rciState === 'oversold_reversal' || f.rciState === 'overbought_reversal') ? 'pullback' : 'align'; }
      return pack(v, a, why, an, 2, 1, { swing: true, note: '上位足の向きが先、下位足はタイミング' }); },
    // 逆張り：RCI が ±70 に届いたら反対へ
    mira: function (v) { var f = v.f, an = answers(v, ['rci', 'trend']); var s = f.rciState; var a = (s === 'overbought' || s === 'overbought_reversal') ? 'sell' : (s === 'oversold' || s === 'oversold_reversal') ? 'buy' : 'skip'; return pack(v, a, a === 'skip' ? 'range' : 'rci_only', an, 1.5, 1, { note: '行き過ぎた価格は戻る、と考えて反対に入る' }); },
    // ブレイクアウト：直近の高値（安値）を終値で越えたら、その方向へ
    jin: function (v) { var f = v.f, an = answers(v, ['trend', 'ema']); var a = f.close >= f.lastHigh ? 'buy' : f.close <= f.lastLow ? 'sell' : 'skip'; return pack(v, a, a === 'skip' ? 'range' : 'feel', an, 1.5, 1.5, { swing: true, note: '節目を抜けた方向に飛び乗る' }); },
    // ダウ理論：確定した高値・安値の切り上げ／切り下げ。上位足と逆なら見送り
    dow: function (v) { var f = v.f, an = answers(v, ['htf', 'trend', 'ema']); var t = f.dow.trend, h = htfOf(v); var a = 'skip', why = 'range';
      if (t === 'up' || t === 'down') { if (h !== 'range' && h !== t) why = 'conflict'; else { a = t === 'up' ? 'buy' : 'sell'; why = 'align'; } }
      return pack(v, a, why, an, 2, 1, { swing: true, note: '高値と安値の並びが変わるまで、トレンドは続くと見る' }); },
    // EMA：20>30>40 の上昇配列で価格が上なら買い、逆なら売り。絡み合いは見送り
    emma: function (v) { var f = v.f, an = answers(v, ['ema', 'trend']); var a = (f.emaOrder === 'up' && f.emaSlope !== 'down' && f.pricePos !== 'below') ? 'buy' : (f.emaOrder === 'down' && f.emaSlope !== 'up' && f.pricePos !== 'above') ? 'sell' : 'skip'; return pack(v, a, a === 'skip' ? 'range' : (f.pricePos === 'between' ? 'pullback' : 'align'), an, 1.5, 1, { note: '3本のEMAの並びと傾きを見る' }); },
    // RCI：トレンド方向の押し目・戻りで ±70 から反転したとき。トレンド中の過熱は見送り
    lisia: function (v) { var f = v.f, an = answers(v, ['rci', 'ema', 'trend', 'htf']); var e = f.emaOrder, s = f.rciState; var a = 'skip', why = 'range';
      if (e === 'up' && s === 'oversold_reversal') { a = 'buy'; why = 'pullback'; } else if (e === 'down' && s === 'overbought_reversal') { a = 'sell'; why = 'pullback'; }
      else if ((e === 'up' && s === 'overbought') || (e === 'down' && s === 'oversold')) why = 'rcihot';
      else if (e !== 'mixed' && dir(f) === e) { a = e === 'up' ? 'buy' : 'sell'; why = 'align'; }
      return pack(v, a, why, an, 2, 1, { swing: true, note: 'RCIは「どこで入るか」。向きはEMAとトレンドで決める' }); },
    // MACD：ダイバージェンス。上位足と同じ向きのものだけ使う
    max: function (v) { var f = v.f, an = answers(v, ['macd', 'htf', 'trend']); var dv = divOf(f), h = htfOf(v); var a = 'skip', why = 'range';
      if ((dv === 'hidden_bull' || dv === 'regular_bull') && h === 'up') { a = 'buy'; why = dv === 'hidden_bull' ? 'hidden' : 'regular'; }
      else if ((dv === 'hidden_bear' || dv === 'regular_bear') && h === 'down') { a = 'sell'; why = dv === 'hidden_bear' ? 'hidden' : 'regular'; }
      else if (dv !== 'none') why = 'div_alone';
      else if (h !== 'range' && dir(f) === h && ((h === 'up' && f.macdState === 'bull') || (h === 'down' && f.macdState === 'bear'))) { a = h === 'up' ? 'buy' : 'sell'; why = 'align'; }
      return pack(v, a, why, an, 2, 1, { swing: true, note: 'ダイバージェンスは上位足と同じ向きのときだけ信じる' }); },
    // ナンピン：下がったら買い、上がったら売る。損切りは置かず、資金の5%を賭ける（このゲームでは過剰リスクとして上限がかかる）
    galva: function (v) { var f = v.f, an = answers(v, [], { htf: 'range', trend: 'range', ema: 'mixed', rci: f.rciNow > 0 ? 'overbought' : 'oversold', macd: 'none' }); var a = f.surge < 0 ? 'buy' : 'sell'; return pack(v, a, 'feel', an, 1.5, 5, { noSL: true, note: '下がったら買い増せばいい（損切りはしない）' }); },
    // 資金管理：根拠が3つ以上そろい、リスクリワード1.5以上を取れるときだけ。急変の直後は入らない。リスクは0.5%
    seil: function (v) { var f = v.f, an = answers(v, ['htf', 'trend', 'ema', 'rci', 'macd']); var h = htfOf(v), d = dir(f); var side = h !== 'range' ? h : d;
      var votes = 0; if (side !== 'range') { if (h === side) votes++; if (d === side) votes++; if (f.emaOrder === side) votes++; if ((side === 'up' && f.macdState === 'bull') || (side === 'down' && f.macdState === 'bear')) votes++; if (!((side === 'up' && f.rciState === 'overbought') || (side === 'down' && f.rciState === 'oversold'))) votes++; }
      var a = 'skip', why = 'range';
      if (Math.abs(f.surge) > 25) why = 'jump';
      else if (side !== 'range' && h !== 'range' && d !== 'range' && h !== d) why = 'conflict';
      else if (side !== 'range' && votes >= 4) { a = side === 'up' ? 'buy' : 'sell'; var o = order(v, a, 2); var room = side === 'up' ? (f.recentHigh - f.close) : (f.close - f.recentLow); var risk = Math.abs(f.close - o.sl); why = (risk > 0 && room / risk < 0.5 && Math.abs(f.close - (side === 'up' ? f.lastLow : f.lastHigh)) / CONFIG.market.pip > 60) ? 'rr' : 'align'; if (why === 'rr') a = 'skip'; }
      return pack(v, a, why, an, 2, 0.5, { swing: true, note: '入る理由より先に、間違いを認める場所と損失の大きさを決める' }); },
    // 伝説の相場師：上位足・波形・EMA・RCI・MACD・急変・RRを全部見る
    zeno: function (v) { var f = v.f, an = answers(v, ['htf', 'trend', 'ema', 'rci', 'macd']); var h = htfOf(v), d = dir(f), dv = divOf(f); var a = 'skip', why = 'range';
      var hotUp = f.rciState === 'overbought', hotDown = f.rciState === 'oversold';   // 上位足と同じ向きのダイバージェンスを先に見る（急変の直後でも継続の合図なら入る）。ただしRCIが過熱していれば待つ
      if ((dv === 'hidden_bull' || dv === 'regular_bull') && h === 'up') { if (hotUp) why = 'rcihot'; else { a = 'buy'; why = dv === 'hidden_bull' ? 'hidden' : 'regular'; } }
      else if ((dv === 'hidden_bear' || dv === 'regular_bear') && h === 'down') { if (hotDown) why = 'rcihot'; else { a = 'sell'; why = dv === 'hidden_bear' ? 'hidden' : 'regular'; } }
      else if (Math.abs(f.surge) > 25) why = 'jump';
      else if (dv !== 'none' && h !== 'range') why = 'div_alone';
      else if (h !== 'range' && d !== 'range' && h !== d) why = 'conflict';
      else if (h !== 'range' && (d === h || d === 'range')) {
        var hot = h === 'up' ? (f.rciState === 'overbought' || (f.rciState === 'overbought_reversal' && f.distFromEma20 > 15)) : (f.rciState === 'oversold' || (f.rciState === 'oversold_reversal' && f.distFromEma20 < -15));
        if (hot) why = 'rcihot';
        else { a = h === 'up' ? 'buy' : 'sell'; why = (f.rciState === 'oversold_reversal' || f.rciState === 'overbought_reversal' || f.pricePos === 'between') ? 'pullback' : 'align';
          var o = order(v, a, 2); var room = h === 'up' ? (f.recentHigh - f.close) : (f.close - f.recentLow); var risk = Math.abs(f.close - o.sl);   // 損切りが遠く、利確の余地が近いなら見送る（セイルと同じ考え）
          if (risk > 0 && room / risk < 0.5 && Math.abs(f.close - (h === 'up' ? f.lastLow : f.lastHigh)) / CONFIG.market.pip > 60) { a = 'skip'; why = 'rr'; } } }
      else if (h === 'range' && d !== 'range' && f.emaOrder === d) { a = d === 'up' ? 'buy' : 'sell'; why = 'align'; }
      return pack(v, a, why, an, 2, 1, { swing: true, note: '一つの道具に頼らず、そろったときだけ。そろわなければ待つ' }); }
  };
  TB.decide = function (npcId, scn) { var fn = TB.STRATEGY[npcId]; if (!fn) throw new Error('unknown trader ' + npcId); return fn(TB.npcView(scn)); };

  /* ---------- 採点（プレイヤーも NPC も同じ式） ---------- */
  TB.MAX_SAFE = function () { return CONFIG.risk.maxSafeRiskPercent; };
  // 取引中に最も不利だった値動き（pips）。損切りのない取引は、判断した期間（96本）の最悪値
  function maeOf(trade, sim) { var w = 0; (sim.path || []).forEach(function (c) { var d = trade.action === 'buy' ? (c.l - trade.entry) : (trade.entry - c.h); if (d < w) w = d; }); return w / CONFIG.market.pip; }
  TB.score = function (ev, sim) {
    var t = ev.trade; var judgment = Math.round(ev.score * 0.6); var outcome, R = null, mae = null, pips = null, overRisk = false;
    if (t) {
      pips = sim.pips; var unit = t.riskPips > 0 ? t.riskPips : 30;   // 損切りなしは30pipsを1単位として扱う
      R = pips / unit; outcome = Math.round((Math.max(-1.5, Math.min(3, R)) + 1.5) / 4.5 * 25);
      mae = maeOf(t, sim); overRisk = t.riskPercent > TB.MAX_SAFE() || t.sl === null || t.sl === undefined || isNaN(t.sl);
    } else outcome = ev.actionOk ? 15 : 8;
    var discipline = Math.max(0, 15 - 5 * ev.violations.length);
    var total = judgment + outcome + discipline; var capped = false;
    if (overRisk && total > 40) { total = 40; capped = true; }
    return { judgment: judgment, outcome: outcome, discipline: discipline, total: total, capped: capped, overRisk: overRisk, R: R, pips: pips, mae: mae };
  };
  // 1人分の採点（evaluateFull → simulate → score）
  TB.judge = function (scn, decision) {
    var ev = root.TradeEval.evaluateFull(scn, decision); var sim = ev.trade ? root.TradeEval.simulate(scn, ev.trade, 96) : null;
    return { ev: ev, sim: sim, sc: TB.score(ev, sim) };
  };
  // 表で並べる11項目（指示の評価項目）
  TB.ITEMS = ['上位足の環境認識', '高値・安値の分析', 'EMAの並び', 'RCIの状態', 'MACDの状態', 'エントリータイミング', '損切り位置', 'リスクリワード', '許容損失率', '最終損益', '最大ドローダウン'];
  TB.rows = function (j) {
    var ev = j.ev, sc = j.sc; function it(re) { return ev.items.filter(function (x) { return re.test(x.name); })[0]; }
    function okv(x) { return x ? (x.ok ? '○' : '×') : '―'; }
    var trend = it(/波形/), sw = it(/高値・安値の指定/);
    var hl = (trend && sw) ? ((trend.ok ? 1 : 0) + (sw.ok ? 1 : 0)) + '/2' : okv(trend || sw);
    var t = ev.trade;
    return [okv(it(/上位足/)), hl, okv(it(/EMA/)), okv(it(/RCI/)), okv(it(/MACD/)), okv(it(/方向・波形・見送り/)),
      t ? okv(it(/損切り位置/)) : '見送り', t ? okv(it(/リスクリワード/)) : '―', t ? (t.riskPercent + '%' + (t.riskPercent > TB.MAX_SAFE() ? '（過大）' : '')) : '―',
      t ? ((sc.pips >= 0 ? '+' : '') + sc.pips.toFixed(0) + 'pips（' + (sc.R >= 0 ? '+' : '') + sc.R.toFixed(2) + 'R）') : '取引なし',
      t ? (sc.mae.toFixed(0) + 'pips') : '―'];
  };
  TB.verdict = function (p, n) { return p.sc.total > n.sc.total ? 'win' : p.sc.total < n.sc.total ? 'lose' : 'draw'; };

  root.TradeBattle = TB;
})(typeof window !== 'undefined' ? window : globalThis);
