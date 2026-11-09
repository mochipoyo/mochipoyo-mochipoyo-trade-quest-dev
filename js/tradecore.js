/* =========================================================
   TradeCore（トレードの計算の共通部品）：注文の検証・ロット計算・決済（OHLC）・R 倍数・MAE/MFE・口座の最大DD・成績の統計
   ・DOM に依存しない（Node でもテストできる）。js/trading.js（詳細の試練）・js/rpg/tradebattle.js・もちぽよ実践トレード道場が使う
   ・用語（画面と同じ言葉）
       riskPips      … エントリー価格から損切りまでの距離（pips）。初期リスク
       riskR         … 実現した損益 ÷ 初期リスク（R 倍数）。損切りちょうどで −1R、初期リスクの2倍の利益で +2R
       atrMultiple   … 損益 ÷ ATR（値動きの大きさに対する倍数）。R 倍数とは別のもの（損切りが ATR×1 のときだけ数値が同じになる）
       MAE / MFE     … 保有中にいちばん不利／有利に動いた幅（pips）。口座の最大DDとは別
       口座の最大DD … 資金（含み損益を含む）の、それまでの最高値からのいちばん大きな下げ（円・%）
   ・銘柄の仕様：いまのゲームの値動きはすべて架空（学習用仮想ペア POYO/MOCHI）。実在の銘柄の欄は、将来の実データ演習のための設計だけで、
     業者によって違う値（1ロットの通貨量・金属の pip の定義など）は null（未設定）にしてある。実データには接続していない
   ========================================================= */
(function (root) {
  'use strict';
  var CONFIG = root.CONFIG || (typeof require === 'function' ? require('./config.js') : null);
  var TC = { VERSION: 1 };

  /* ---------- 銘柄の仕様 ---------- */
  // pip：損益を数える単位の値幅。tick：最小の値動き。lotUnits：1ロットの数量。pipValue：1ロットで1pip動いたときの損益（quote 通貨または円）
  TC.INSTRUMENTS = {
    POYO_MOCHI: { id: 'POYO_MOCHI', name: '学習用仮想ペア POYO/MOCHI', fictional: true, connected: false, digits: 3, pip: 0.01, tick: 0.001, lotUnits: 10000, lotLabel: '万通貨', pipValue: 100, pnlCcy: '円',
      minLot: 0.01, lotStep: 0.01, maxLot: 500, note: 'ゲームの中だけの架空の銘柄。1万通貨で1pip＝100円は学習用の仮定（実在の通貨ペアの条件ではない）' },
    // ↓ 将来の実データ演習のための設計（未接続）。null は「業者・口座の条件で決まるので未設定」
    GBPJPY: { id: 'GBPJPY', name: 'ポンド円', fictional: false, connected: false, digits: 3, pip: 0.01, tick: 0.001, lotUnits: null, pipValue: null, pnlCcy: '円', minLot: null, lotStep: null, maxLot: null, note: '1ロットの通貨量・最小数量・スプレッドは口座の条件による（未設定）' },
    GBPUSD: { id: 'GBPUSD', name: 'ポンドドル', fictional: false, connected: false, digits: 5, pip: 0.0001, tick: 0.00001, lotUnits: null, pipValue: null, pnlCcy: 'USD（円への換算が必要）', minLot: null, lotStep: null, maxLot: null, note: '損益は米ドル建て。円に換算するレートが必要（未設定）' },
    USDJPY: { id: 'USDJPY', name: 'ドル円', fictional: false, connected: false, digits: 3, pip: 0.01, tick: 0.001, lotUnits: null, pipValue: null, pnlCcy: '円', minLot: null, lotStep: null, maxLot: null, note: '1ロットの通貨量・最小数量は口座の条件による（未設定）' },
    XAUUSD: { id: 'XAUUSD', name: 'ゴールド（金）', fictional: false, connected: false, digits: 2, pip: null, tick: 0.01, lotUnits: null, pipValue: null, pnlCcy: 'USD（円への換算が必要）', minLot: null, lotStep: null, maxLot: null, note: '金属の「pip」の定義・1ロットの数量（オンス）は業者で異なる（未設定）' },
    XAGUSD: { id: 'XAGUSD', name: '銀', fictional: false, connected: false, digits: 3, pip: null, tick: 0.001, lotUnits: null, pipValue: null, pnlCcy: 'USD（円への換算が必要）', minLot: null, lotStep: null, maxLot: null, note: '金属の「pip」の定義・1ロットの数量（オンス）は業者で異なる（未設定）' }
  };
  TC.spec = function (id) { var s = TC.INSTRUMENTS[id || 'POYO_MOCHI']; return s && s.pip ? s : TC.INSTRUMENTS.POYO_MOCHI; };
  // 計算に使える（数がそろっている）銘柄か
  TC.usable = function (id) { var s = TC.INSTRUMENTS[id]; return !!(s && s.pip && s.pipValue && s.minLot && s.lotStep); };

  // 取引のコスト（実践道場の既定。ゲームの仮定で、実在の業者の数字ではない）
  TC.COSTS = { spreadPips: 0.6, entrySlipPips: 0.1, stopSlipPips: 0.3, note: '架空の相場の仮定（実在の業者・口座の条件ではない）' };

  function num(v) { if (typeof v === 'number') return v; if (typeof v === 'string' && v.trim() !== '') return Number(v); return NaN; }
  function missing(v) { return v === null || v === undefined || (typeof v === 'string' && v.trim() === ''); }
  function sideOf(s) { return s === 'buy' || s === 'long' ? 'buy' : s === 'sell' || s === 'short' ? 'sell' : null; }
  function fmt(v, d) { return isFinite(v) ? Number(v).toFixed(d === undefined ? 3 : d) : String(v); }
  TC.sideOf = sideOf;

  /* ---------- 注文の検証 ----------
     o: { side:'buy'|'sell'（'long'/'short' も可）, entry, sl, tp, requireSL（既定 true）, requireTP（既定 false）, spec, maxPips（既定 1000）, minPips（既定 0.1） }
     比べる基準は entry（呼ぶ側が決める：詳細の試練＝判断した足の終値、実践道場＝約定の予定価格。買いは買値 ask、売りは売値 bid）
     買い：損切り ＜ entry ＜ 利確、売り：利確 ＜ entry ＜ 損切り
     返り値：{ ok, errors:[{code, field, msg}], warnings:[…], side, entry, sl, tp, riskPips, rewardPips, rr, noStop, noTarget } */
  TC.validateOrder = function (o) {
    o = o || {}; var spec = o.spec || TC.spec(); var pip = spec.pip; var errors = [], warnings = [];
    var E = function (code, field, msg) { errors.push({ code: code, field: field, msg: msg }); }, W = function (code, field, msg) { warnings.push({ code: code, field: field, msg: msg }); };
    var side = sideOf(o.side); var requireSL = o.requireSL !== false, requireTP = !!o.requireTP; var maxPips = o.maxPips || 1000, minPips = o.minPips === undefined ? 0.1 : o.minPips;
    if (!side) E('side', 'side', '売買の向き（買い／売り）が決まっていない');
    var entry = num(o.entry); if (!isFinite(entry) || entry <= 0) E('entry', 'entry', 'エントリー価格が正しい数値ではない（' + fmt(o.entry) + '）');
    var sl = missing(o.sl) ? null : num(o.sl), tp = missing(o.tp) ? null : num(o.tp);
    var riskPips = null, rewardPips = null;
    var dirWord = side === 'buy' ? '下' : '上', tpWord = side === 'buy' ? '上' : '下', sideJa = side === 'buy' ? '買い' : '売り';
    if (sl === null) { if (requireSL) E('sl_missing', 'sl', '損切りが入力されていない（損切りは必須）'); else W('no_sl', 'sl', '損切りなしの注文（非推奨。逆行すると損失が限りなく膨らむ）'); }
    else if (!isFinite(sl)) E('sl_nan', 'sl', '損切りの値が数値ではない（' + fmt(o.sl) + '）');
    else if (sl <= 0) E('sl_nonpositive', 'sl', '損切りの価格が0以下（' + fmt(sl) + '）');
    else if (side && isFinite(entry)) {
      riskPips = (side === 'buy' ? entry - sl : sl - entry) / pip;
      if (Math.abs(riskPips) < minPips) E('sl_equal', 'sl', '損切りがエントリー価格（' + fmt(entry) + '）と同じ。損切りの幅が0では注文できない');
      else if (riskPips < 0) E('sl_wrong_side', 'sl', sideJa + 'の損切りはエントリー価格（' + fmt(entry) + '）より' + dirWord + 'に置く（いま ' + fmt(sl) + '・' + Math.abs(riskPips).toFixed(1) + 'pips ' + (side === 'buy' ? '上' : '下') + '）');
      else if (riskPips > maxPips || Math.abs(sl / entry - 1) > 0.5) E('sl_abnormal', 'sl', '損切りが遠すぎる（' + riskPips.toFixed(0) + 'pips）。桁の入力を確かめる（上限 ' + maxPips + 'pips）');
    }
    if (tp === null) { if (requireTP) E('tp_missing', 'tp', '利確が入力されていない'); else W('no_tp', 'tp', '利確なしの注文（時間切れまで保有する）'); }
    else if (!isFinite(tp)) E('tp_nan', 'tp', '利確の値が数値ではない（' + fmt(o.tp) + '）');
    else if (tp <= 0) E('tp_nonpositive', 'tp', '利確の価格が0以下（' + fmt(tp) + '）');
    else if (side && isFinite(entry)) {
      rewardPips = (side === 'buy' ? tp - entry : entry - tp) / pip;
      if (Math.abs(rewardPips) < minPips) E('tp_equal', 'tp', '利確がエントリー価格（' + fmt(entry) + '）と同じ');
      else if (rewardPips < 0) E('tp_wrong_side', 'tp', sideJa + 'の利確はエントリー価格（' + fmt(entry) + '）より' + tpWord + 'に置く（いま ' + fmt(tp) + '）');
      else if (rewardPips > maxPips * 3 || Math.abs(tp / entry - 1) > 0.5) E('tp_abnormal', 'tp', '利確が遠すぎる（' + rewardPips.toFixed(0) + 'pips）。桁の入力を確かめる');
    }
    var okRisk = riskPips !== null && riskPips > 0 && !errors.some(function (e) { return e.field === 'sl'; });
    var okRew = rewardPips !== null && rewardPips > 0 && !errors.some(function (e) { return e.field === 'tp'; });
    var spread = (o.spreadPips === undefined ? 0 : o.spreadPips);
    if (okRisk && spread > 0 && riskPips < spread * 2) W('sl_too_close', 'sl', '損切りが近すぎる（' + riskPips.toFixed(1) + 'pips。スプレッド ' + spread + 'pips の2倍未満）');
    var rr = okRisk && okRew ? rewardPips / riskPips : null;
    return { ok: !errors.length, errors: errors, warnings: warnings, side: side, entry: entry, sl: sl, tp: tp, riskPips: okRisk ? riskPips : null, rewardPips: okRew ? rewardPips : null, rr: rr, noStop: sl === null, noTarget: tp === null, basis: o.basis || 'entry' };
  };
  TC.errorText = function (v) { return (v && v.errors || []).map(function (e) { return e.msg; }).join('／'); };

  /* ---------- ロット計算 ----------
     o: { capital, riskPercent, riskPips, spec }
     ・許容損失（円）＝資金×リスク%。必要なロット＝許容損失 ÷（損切りpips × 1ロットの pip 価値）
     ・ロットは刻み（lotStep）へ「切り下げ」る（切り上げると許容損失を超えるため）。最小ロットに届かなければ注文できない（ok:false・理由つき）
     返り値：{ ok, lots, units, riskAmount, actualRisk, actualRiskPct, rawLots, minLotRisk, minLotRiskPct, errors, warnings } */
  TC.sizePosition = function (o) {
    o = o || {}; var spec = o.spec || TC.spec(); var errors = [], warnings = []; var E = function (c, m) { errors.push({ code: c, msg: m }); };
    var cap = num(o.capital), rp = num(o.riskPercent), rpp = num(o.riskPips);
    if (!isFinite(cap)) E('capital_nan', '資金の値が数値ではない'); else if (cap <= 0) E('capital_zero', '口座の資金が0円以下のため、新しい注文は出せない');
    if (!isFinite(rp)) E('risk_nan', '許容損失（%）が数値ではない'); else if (rp <= 0) E('risk_nonpositive', '許容損失（%）は0より大きくする'); else if (rp > 100) E('risk_over', '許容損失（%）が100%を超えている');
    if (!isFinite(rpp)) E('riskpips_nan', '損切りの幅が計算できない（損切りを正しく入れる）'); else if (rpp <= 0) E('riskpips_nonpositive', '損切りの幅が0以下');
    var out = { ok: false, lots: 0, units: 0, riskAmount: 0, actualRisk: 0, actualRiskPct: 0, rawLots: 0, minLotRisk: null, minLotRiskPct: null, errors: errors, warnings: warnings, spec: spec.id };
    if (errors.length) return out;
    var riskAmount = cap * rp / 100; var perLot = rpp * spec.pipValue; var raw = riskAmount / perLot;
    var steps = Math.floor(raw / spec.lotStep + 1e-9); var lots = Math.round(steps * spec.lotStep * 1e6) / 1e6;
    out.riskAmount = riskAmount; out.rawLots = raw; out.minLotRisk = spec.minLot * perLot; out.minLotRiskPct = out.minLotRisk / cap * 100;
    if (lots > spec.maxLot) { lots = spec.maxLot; warnings.push({ code: 'max_lot', msg: '最大ロット（' + spec.maxLot + '）までに抑えた' }); }
    if (lots + 1e-12 < spec.minLot) { E('below_min_lot', '許容損失 ' + Math.round(riskAmount).toLocaleString() + spec.pnlCcy + ' では、最小ロット（' + spec.minLot + '）でも損切りで ' + Math.round(out.minLotRisk).toLocaleString() + spec.pnlCcy + '（資金の' + out.minLotRiskPct.toFixed(2) + '%）の損失になり、許容を超える。損切りを近くに置ける場面を待つか、許容損失%を見直す'); return out; }
    out.ok = true; out.lots = lots; out.units = lots * spec.lotUnits; out.actualRisk = lots * perLot; out.actualRiskPct = out.actualRisk / cap * 100;
    return out;
  };
  TC.breakevenWinRate = function (rr) { return isFinite(rr) && rr > 0 ? 1 / (1 + rr) : null; };   // 損益分岐の勝率（コストを除く）：1 ÷（1＋RR）
  TC.riskR = function (pnlPips, riskPips) { return isFinite(pnlPips) && isFinite(riskPips) && riskPips > 0 ? pnlPips / riskPips : null; };
  TC.atrMultiple = function (pnl, atr) { return isFinite(pnl) && isFinite(atr) && atr > 0 ? pnl / atr : null; };

  /* ---------- 決済（OHLC の足だけで判定する共通の決済） ----------
     bars：足の配列（{o,h,l,c}）。entryIndex：約定した足（その足の終値で約定したとみなす。判定は次の足から）
     order：{ side, entry（中値）, sl, tp }。opts：{ spreadPips, entrySlipPips, stopSlipPips, maxBars, spec, sameBar:'sl_first' }
     ・約定価格：買い＝中値＋スプレッド/2＋入口のスリッページ、売り＝その逆。決済は売値（買い）／買値（売り）で判定
     ・窓（ギャップ）：足の始値が損切りを越えていたら、始値で約定（損切り価格より不利）。利確を越えていたら利確価格（指値なので有利にはしない）
     ・同じ足で損切りと利確の両方に届いた：OHLC だけでは順序が分からない（先後不明）。既定は「損切りが先」とみなす（保守的な仮定）。ambiguous:true
     ・maxBars 本たっても決まらない、または足がなくなった：その足の終値で決済（time / open）
     返り値：{ ok, side, entryIndex, entryPrice, sl, tp, exitIndex, exitPrice, reason:'sl'|'tp'|'time'|'end', ambiguous, gap, grossPips, costPips, netPips, riskPips, riskR, maePips, mfePips, bars } */
  TC.settleBars = function (bars, entryIndex, order, opts) {
    opts = opts || {}; var spec = opts.spec || TC.spec(); var pip = spec.pip; var side = sideOf(order.side); var sg = side === 'buy' ? 1 : -1;
    var half = (opts.spreadPips === undefined ? TC.COSTS.spreadPips : opts.spreadPips) * pip / 2; var eslip = (opts.entrySlipPips === undefined ? TC.COSTS.entrySlipPips : opts.entrySlipPips) * pip; var sslip = (opts.stopSlipPips === undefined ? TC.COSTS.stopSlipPips : opts.stopSlipPips) * pip;
    var mid0 = num(order.entry); if (!side || !isFinite(mid0)) return { ok: false, reason: 'invalid', errors: ['向きまたはエントリー価格が正しくない'] };
    var fill = mid0 + sg * (half + eslip); var sl = missing(order.sl) ? null : num(order.sl), tp = missing(order.tp) ? null : num(order.tp);
    if (sl !== null && (!isFinite(sl) || sg * (fill - sl) <= 0)) return { ok: false, reason: 'invalid', errors: ['損切りが約定価格の正しい側にない'] };
    if (tp !== null && (!isFinite(tp) || sg * (tp - fill) <= 0)) return { ok: false, reason: 'invalid', errors: ['利確が約定価格の正しい側にない'] };
    var maxBars = opts.maxBars || Infinity; var last = Math.min(bars.length - 1, entryIndex + maxBars); var exit = null; var mae = 0, mfe = 0;
    for (var i = entryIndex + 1; i <= last && !exit; i++) {
      var b = bars[i]; var oPx = b.o - sg * half, hiPx = b.h - sg * half, loPx = b.l - sg * half;   // 決済に使う側の価格
      var adv = sg > 0 ? loPx : hiPx, fav = sg > 0 ? hiPx : loPx;
      // 窓：始値の時点で損切り・利確を越えている
      if (sl !== null && sg * (oPx - sl) <= 0) { exit = { i: i, price: oPx, reason: 'sl', gap: true }; mae = Math.min(mae, sg * (oPx - fill)); break; }
      if (tp !== null && sg * (oPx - tp) >= 0) { exit = { i: i, price: tp, reason: 'tp', gap: true }; mfe = Math.max(mfe, sg * (tp - fill)); break; }
      var hitSl = sl !== null && sg * (adv - sl) <= 0, hitTp = tp !== null && sg * (fav - tp) >= 0;
      if (hitSl && hitTp) { exit = { i: i, price: sl - sg * sslip, reason: 'sl', ambiguous: true }; mae = Math.min(mae, sg * (sl - fill)); mfe = Math.max(mfe, sg * (tp - fill)); break; }
      if (hitSl) { exit = { i: i, price: sl - sg * sslip, reason: 'sl' }; mae = Math.min(mae, sg * (sl - fill)); mfe = Math.max(mfe, sg * (fav - fill)); break; }
      if (hitTp) { exit = { i: i, price: tp, reason: 'tp' }; mfe = Math.max(mfe, sg * (tp - fill)); mae = Math.min(mae, sg * (adv - fill)); break; }
      mae = Math.min(mae, sg * (adv - fill)); mfe = Math.max(mfe, sg * (fav - fill));
    }
    if (!exit) { var li = Math.max(entryIndex, last); exit = { i: li, price: bars[li].c - sg * half, reason: li >= entryIndex + maxBars ? 'time' : 'end' }; }
    var grossPips = sg * (exit.price - mid0) / pip;   // 中値から見た値動き（コストを含まない）
    var netPips = sg * (exit.price - fill) / pip;     // 実際の約定価格どうし（スプレッド・スリッページ込み）
    var riskPips = sl !== null ? sg * (fill - sl) / pip : null;
    return { ok: true, side: side, entryIndex: entryIndex, entryMid: mid0, entryPrice: fill, sl: sl, tp: tp, exitIndex: exit.i, exitPrice: exit.price, reason: exit.reason, ambiguous: !!exit.ambiguous, gap: !!exit.gap,
      grossPips: r1(grossPips), costPips: r1(grossPips - netPips + sg * 0), netPips: r1(netPips), riskPips: riskPips === null ? null : r1(riskPips), riskR: riskPips ? r2(netPips / riskPips) : null,
      maePips: r1(mae / pip), mfePips: r1(mfe / pip), bars: exit.i - entryIndex,
      assumption: exit.ambiguous ? '同じ足で損切りと利確の両方に届いた（OHLC だけでは順序が分からない）。損切りが先とみなした（保守的な仮定）' : null };
  };
  function r1(v) { return Math.round(v * 10) / 10; }
  function r2(v) { return Math.round(v * 100) / 100; }
  TC.r1 = r1; TC.r2 = r2;

  /* ---------- 口座の最大DD ---------- */
  // curve：資金の推移（数の配列）。返り値：{ amount, pct（最高値に対する%）, peakIndex, troughIndex }
  TC.maxDrawdown = function (curve) {
    var peak = -Infinity, pi = 0, best = { amount: 0, pct: 0, peakIndex: 0, troughIndex: 0 };
    (curve || []).forEach(function (v, i) { if (!isFinite(v)) return; if (v > peak) { peak = v; pi = i; } var dd = peak - v; if (dd > best.amount) best = { amount: dd, pct: peak > 0 ? dd / peak * 100 : 0, peakIndex: pi, troughIndex: i }; });
    best.amount = Math.round(best.amount * 100) / 100; best.pct = r2(best.pct); return best;
  };
  // 1回の取引の間の口座の最大DD（含み損込み）：資金 capital、1pip あたりの損益 perPip（円）、保有中の最大逆行 maePips（≤0）、決済の損益 pnlPips
  TC.tradeDrawdown = function (capital, perPip, maePips, pnlPips) {
    if (!(capital > 0) || !isFinite(perPip) || !isFinite(maePips)) return { amount: 0, pct: 0 };
    var worst = Math.min(0, maePips, isFinite(pnlPips) ? pnlPips : 0) * perPip; return { amount: Math.round(-worst), pct: r2(-worst / capital * 100) };
  };

  /* ---------- 成績の統計 ----------
     history：[{ kind:'trade'|'skip'|'wait'|'timeout'|'invalid', riskR, netPips, pnl, plannedRR, compliant, violations:[], evidence:[…], capitalAfter }]
     返り値の各値には分母（n）を付ける。サンプルが少ない（取引 30 回未満）ときは small:true（勝率・期待値は不安定） */
  TC.SMALL_SAMPLE = 30;
  TC.stats = function (history, opts) {
    opts = opts || {}; var H = (history || []).filter(function (x) { return x && x.kind; }); var trades = H.filter(function (x) { return x.kind === 'trade' && isFinite(x.riskR); });
    var wins = trades.filter(function (x) { return x.riskR > 0; }), losses = trades.filter(function (x) { return x.riskR < 0; });
    var sum = function (a, k) { return a.reduce(function (s, x) { return s + (isFinite(x[k]) ? x[k] : 0); }, 0); };
    var n = trades.length; var gw = sum(wins, 'riskR'), gl = -sum(losses, 'riskR');
    var streak = 0, maxStreak = 0; trades.forEach(function (x) { if (x.riskR < 0) { streak++; if (streak > maxStreak) maxStreak = streak; } else streak = 0; });
    var cap0 = opts.capital || (CONFIG && CONFIG.risk && CONFIG.risk.capital) || 1000000; var curve = [cap0]; H.forEach(function (x) { if (x.kind === 'trade' && isFinite(x.capitalAfter)) curve.push(x.capitalAfter); });
    var decisions = H.filter(function (x) { return x.kind === 'trade' || x.kind === 'skip' || x.kind === 'timeout'; });
    var rated = H.filter(function (x) { return typeof x.compliant === 'boolean'; });
    var byEv = {}; trades.forEach(function (x) { (x.evidence || []).forEach(function (k) { var b = byEv[k] || (byEv[k] = { n: 0, wins: 0, sumR: 0 }); b.n++; if (x.riskR > 0) b.wins++; b.sumR += x.riskR; }); });
    Object.keys(byEv).forEach(function (k) { var b = byEv[k]; b.avgR = r2(b.sumR / b.n); b.winRate = r2(b.wins / b.n * 100); b.small = b.n < TC.SMALL_SAMPLE; });
    var rrs = trades.filter(function (x) { return isFinite(x.plannedRR) && x.plannedRR > 0; });
    return {
      trades: n, wins: wins.length, losses: losses.length, small: n < TC.SMALL_SAMPLE,
      winRate: n ? r2(wins.length / n * 100) : null, avgWinR: wins.length ? r2(gw / wins.length) : null, avgLossR: losses.length ? r2(-gl / losses.length) : null,
      expectancyR: n ? r2(sum(trades, 'riskR') / n) : null, profitFactor: gl > 0 ? r2(gw / gl) : (gw > 0 ? null : null), pfInfinite: gl === 0 && gw > 0,
      avgPlannedRR: rrs.length ? r2(sum(rrs, 'plannedRR') / rrs.length) : null, maxLosingStreak: maxStreak, drawdown: TC.maxDrawdown(curve), curve: curve,
      decisions: decisions.length, skips: H.filter(function (x) { return x.kind === 'skip'; }).length, waits: H.reduce(function (a, x) { return a + (x.kind === 'wait' ? 1 : 0) + (isFinite(x.waits) ? x.waits : 0); }, 0), timeouts: H.filter(function (x) { return x.kind === 'timeout'; }).length,
      skipRate: decisions.length ? r2(H.filter(function (x) { return x.kind === 'skip'; }).length / decisions.length * 100) : null,
      complianceRate: rated.length ? r2(rated.filter(function (x) { return x.compliant; }).length / rated.length * 100) : null, rated: rated.length, invalidOrders: H.filter(function (x) { return x.kind === 'invalid'; }).length,
      byEvidence: byEv
    };
  };
  TC.DEFINITIONS = [
    ['勝率', '利益（+0R より大きい）で終わった取引 ÷ 取引の数'], ['平均利益R・平均損失R', '勝ち（負け）の取引の riskR の平均'], ['期待値R', 'すべての取引の riskR の平均（1回あたりに見込める R）'],
    ['プロフィットファクター（PF）', '勝ちの riskR の合計 ÷ 負けの riskR の合計（の絶対値）。負けがないときは計算できない'], ['平均RR', '注文のときに決めた 利確の幅 ÷ 損切りの幅 の平均（計画の値）'],
    ['最大DD', '資金の推移（決済ごと）で、それまでの最高値からいちばん大きく下げた額と%'], ['連敗', '損失で終わった取引が続いた最大の回数'], ['見送り率', '見送り ÷（取引＋見送り＋時間切れ）'],
    ['ルール遵守率', '採点したプレイのうち、選んだ戦略プロファイルのルール違反がなかった割合'], ['R（riskR）', '損益 ÷ 初期リスク（エントリーから損切りまで）。損切りちょうどで −1R']
  ];

  root.TradeCore = TC;
  if (typeof module !== 'undefined' && module.exports) module.exports = TC;
})(typeof window !== 'undefined' ? window : globalThis);
