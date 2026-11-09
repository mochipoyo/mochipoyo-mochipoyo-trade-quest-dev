/* =========================================================
   PositionEngine（v9.1）：上級のポジション管理のための、足 1 本ずつ進む決済のエンジン（出来事で動く・同じ操作なら同じ結果）
   ・基本のルール（当初の損切り・利確を動かさない）は TradeCore.settleBars のまま。このエンジンは「上級のポジション管理」を ON にしたときだけ使う
   ・出来事（events）：entry（約定）／modifySL（損切りの変更）／partialClose（部分決済）／trail（トレーリングの設定・更新）／fullClose（全部の決済）／
                    stopFill（損切りの約定）／targetFill（利確の約定）／timeExit（保有時間の上限）
   ・約定の決まり（TradeCore.settleBars と同じ）：買いは買値（中値＋スプレッド/2）で入り売値で出る。入口の滑り・損切り（逆指値）と成行の決済の滑りを足す。利確（指値）は利確の価格ちょうど
     窓で損切りを越えたら始値（出口の側の価格）で約定（滑りは足さない。越えた分は gapPips）。同じ足で損切りと利確の両方に届いたら、損切りが先と仮定（先後は分からない）
   ・プレイヤーの操作は「その足が確定した後」に決めたもの。成行（早めの決済・部分決済）は次の足の始値（出口の側の価格−滑り）で約定する
     損切りの変更・建値・トレーリングの更新は次の足から有効（同じ足の中で、変更の前後どちらの値動きが先かは分からないため）
   ・損切りを遠ざける（広げる）・ナンピン（買い増し・売り増し）はできない（心理の演習でだけ扱う）
   ・R：実現した損益の合計（円）÷ 当初の口座リスク（当初のロット × 約定価格から当初の損切りまでの pips × pip の価値）。部分決済の後も分母は当初のリスクのまま
   ・建値（損切りを約定価格へ）は「損益ゼロ」の保証ではない：損切りの約定には決済の滑りがあり、窓ならもっと不利になる
   ========================================================= */
(function (root) {
  'use strict';
  var PS = { VERSION: 1 };
  function TC() { return root.TradeCore; }
  function r1(v) { return Math.round(v * 10) / 10; } function r2(v) { return Math.round(v * 100) / 100; } function r3(v) { return Math.round(v * 1000) / 1000; }
  function lotsFloor(x, spec) { var k = Math.floor(x / spec.lotStep + 1e-9); return Math.round(k * spec.lotStep * 1e6) / 1e6; }
  // 建てる。o：{ side, entryMid, sl, tp, lots, entryIndex, costs:{ spreadPips, entrySlipPips, exitSlipPips, commissionPerLotYen }, spec, maxBars }
  PS.open = function (o) {
    var spec = o.spec || TC().spec(); var C = TC().COSTS; var c = o.costs || {}; var side = TC().sideOf(o.side); var sg = side === 'buy' ? 1 : -1; var pip = spec.pip;
    var costs = { spreadPips: c.spreadPips !== undefined ? c.spreadPips : C.spreadPips, entrySlipPips: c.entrySlipPips !== undefined ? c.entrySlipPips : C.entrySlipPips, exitSlipPips: c.exitSlipPips !== undefined ? c.exitSlipPips : C.stopSlipPips, commissionPerLotYen: c.commissionPerLotYen !== undefined ? c.commissionPerLotYen : (C.commissionPerLotYen || 0) };
    var errors = []; if (!side) errors.push('向きが正しくない'); if (!isFinite(o.entryMid)) errors.push('エントリーの価格が正しくない'); if (!(o.lots > 0)) errors.push('ロットが正しくない');
    ['spreadPips', 'entrySlipPips', 'exitSlipPips', 'commissionPerLotYen'].forEach(function (k) { if (!(isFinite(costs[k]) && costs[k] >= 0)) errors.push('コストの値が正しくない（' + k + '）'); });
    if (errors.length) return { ok: false, errors: errors };
    var half = costs.spreadPips * pip / 2; var fill = o.entryMid + sg * (half + costs.entrySlipPips * pip);
    if (!(isFinite(o.sl) && sg * (fill - o.sl) > 0)) return { ok: false, errors: ['損切りが約定価格の正しい側にない'] };
    if (o.tp !== null && o.tp !== undefined && !(isFinite(o.tp) && sg * (o.tp - fill) > 0)) return { ok: false, errors: ['利確が約定価格の正しい側にない'] };
    var riskPips = sg * (fill - o.sl) / pip;
    var pos = { ok: true, v: 1, side: side, sg: sg, spec: spec.id, pip: pip, pipValue: spec.pipValue, minLot: spec.minLot, lotStep: spec.lotStep, costs: costs, entryIndex: o.entryIndex, idx: o.entryIndex, maxBars: o.maxBars || Infinity,
      entryMid: o.entryMid, entryFill: fill, sl0: o.sl, tp0: o.tp === undefined ? null : o.tp, sl: o.sl, tp: o.tp === undefined ? null : o.tp, lots0: o.lots, lots: o.lots, riskPips0: riskPips, riskYen0: riskPips * o.lots * spec.pipValue,
      fills: [], events: [{ kind: 'entry', index: o.entryIndex, price: fill, mid: o.entryMid, lots: o.lots, sl: o.sl, tp: o.tp === undefined ? null : o.tp }], pending: [], trail: null, mae: 0, mfe: 0, worstOpenYen: 0, bestClose: null,
      closed: false, reason: null, ambiguous: false, ambiguousIdx: [], gapPips: 0, commissionYen: r2(costs.commissionPerLotYen * o.lots), actions: [] };
    return pos;
  };
  function exitPx(pos, mid) { return mid - pos.sg * pos.costs.spreadPips * pos.pip / 2; }   // 出口の側の価格（買いなら売値）
  function fillOut(pos, index, lots, fill, mid, kind, reason, extra) {
    var pips = pos.sg * (fill - pos.entryFill) / pos.pip; var gpips = pos.sg * (mid - pos.entryMid) / pos.pip; var comm = pos.costs.commissionPerLotYen * lots;
    var f = { kind: kind, reason: reason, index: index, lots: lots, fill: r3(fill), mid: mid, pips: r1(pips), grossPips: r1(gpips), yen: Math.round(pips * lots * pos.pipValue), commissionYen: r2(comm) };
    if (extra) Object.keys(extra).forEach(function (k) { f[k] = extra[k]; });
    pos.fills.push(f); pos.commissionYen = r2(pos.commissionYen + comm); pos.lots = Math.round((pos.lots - lots) * 1e6) / 1e6; pos.events.push({ kind: kind, index: index, price: f.fill, lots: lots, reason: reason, pips: f.pips });
    if (pos.lots <= 1e-9) { pos.lots = 0; pos.closed = true; pos.reason = reason; pos.exitIndex = index; }
    return f;
  }
  // 足 1 本を進める（bars[i]：中値の OHLC）。返り値：その足で起きた出来事
  PS.step = function (pos, bars, i) {
    if (!pos || pos.closed) return []; if (i !== pos.idx + 1) throw new Error('PositionEngine.step：足の番号が飛んだ（' + pos.idx + ' → ' + i + '）');
    var b = bars[i]; var sg = pos.sg, pip = pos.pip, xS = pos.costs.exitSlipPips * pip; var before = pos.events.length; pos.idx = i;
    // 1. 予約した成行（早めの決済・部分決済）：この足の始値で約定
    var pend = pos.pending; pos.pending = [];
    pend.forEach(function (p) { if (pos.closed) return; var lots = Math.min(p.lots, pos.lots); var px = exitPx(pos, b.o) - sg * xS; fillOut(pos, i, lots, px, b.o, p.kind, p.reason); });
    if (!pos.closed) {
      var oPx = exitPx(pos, b.o), hiPx = exitPx(pos, b.h), loPx = exitPx(pos, b.l); var adv = sg > 0 ? loPx : hiPx, fav = sg > 0 ? hiPx : loPx;
      var sl = pos.sl, tp = pos.tp; var all = pos.lots;
      if (sg * (oPx - sl) <= 0) { pos.gapPips = r1(sg * (sl - oPx) / pip); fillOut(pos, i, all, oPx, b.o, 'stopFill', 'sl', { gap: true }); pos.mae = Math.min(pos.mae, sg * (oPx - pos.entryFill)); }
      else if (tp !== null && sg * (oPx - tp) >= 0) { fillOut(pos, i, all, tp, tp + sg * pos.costs.spreadPips * pip / 2, 'targetFill', 'tp', { gap: true }); pos.mfe = Math.max(pos.mfe, sg * (tp - pos.entryFill)); }
      else {
        var hitSl = sg * (adv - sl) <= 0, hitTp = tp !== null && sg * (fav - tp) >= 0;
        if (hitSl && hitTp) { pos.ambiguous = true; pos.ambiguousIdx.push(i); pos.altTp = { index: i, pips: r1(sg * (tp - pos.entryFill) / pip), lots: all }; fillOut(pos, i, all, sl - sg * xS, sl + sg * pos.costs.spreadPips * pip / 2, 'stopFill', 'sl', { ambiguous: true }); pos.mae = Math.min(pos.mae, sg * (sl - pos.entryFill)); pos.mfe = Math.max(pos.mfe, sg * (tp - pos.entryFill)); }
        else if (hitSl) { fillOut(pos, i, all, sl - sg * xS, sl + sg * pos.costs.spreadPips * pip / 2, 'stopFill', 'sl'); pos.mae = Math.min(pos.mae, sg * (sl - pos.entryFill)); pos.mfe = Math.max(pos.mfe, sg * (fav - pos.entryFill)); }
        else if (hitTp) { fillOut(pos, i, all, tp, tp + sg * pos.costs.spreadPips * pip / 2, 'targetFill', 'tp'); pos.mfe = Math.max(pos.mfe, sg * (tp - pos.entryFill)); pos.mae = Math.min(pos.mae, sg * (adv - pos.entryFill)); }
        else { pos.mae = Math.min(pos.mae, sg * (adv - pos.entryFill)); pos.mfe = Math.max(pos.mfe, sg * (fav - pos.entryFill)); }
      }
      // 保有中の最悪（実現した分＋残りの含み損。足の高安から。ティックの順序は分からない目安）
      var real = pos.fills.reduce(function (s, f) { return s + f.yen; }, 0); var openWorst = pos.closed ? 0 : sg * (adv - pos.entryFill) / pip * pos.lots * pos.pipValue; pos.worstOpenYen = Math.min(pos.worstOpenYen, Math.round(real + Math.min(0, openWorst)));
    }
    // 2. 足が確定した後：保有時間の上限・トレーリングの更新（次の足から有効）
    if (!pos.closed && i - pos.entryIndex >= pos.maxBars) fillOut(pos, i, pos.lots, exitPx(pos, b.c) - sg * xS, b.c, 'timeExit', 'time');
    if (!pos.closed && pos.trail) { var bc = pos.bestClose === null ? b.c : (sg > 0 ? Math.max(pos.bestClose, b.c) : Math.min(pos.bestClose, b.c)); pos.bestClose = bc;
      var cand = r3(bc - sg * pos.trail.dist); if (sg * (cand - pos.sl) > 1e-9 && sg * (exitPx(pos, b.c) - cand) >= pip) { var old = pos.sl; pos.sl = cand; pos.events.push({ kind: 'trail', index: i, from: old, to: cand, auto: true }); } }
    return pos.events.slice(before);
  };
  // 操作（その足の確定の後に決めた）。ctx：{ bars, index（いまの足＝pos.idx）, atr（いまの時点の確定足の ATR・価格） }。返り値：{ ok, error?, note? }
  PS.act = function (pos, a, ctx) {
    if (!pos || pos.closed) return { ok: false, error: 'ポジションはもう決済した' }; ctx = ctx || {}; var sg = pos.sg, pip = pos.pip; var b = ctx.bars[pos.idx]; var nowExit = exitPx(pos, b.c);
    var rec = function (extra) { var x = { type: a.type, index: pos.idx }; Object.keys(a).forEach(function (k) { if (k !== 'type') x[k] = a[k]; }); if (extra) Object.keys(extra).forEach(function (k) { x[k] = extra[k]; }); pos.actions.push(x); };
    var slCheck = function (v) { if (!isFinite(v)) return '損切りの値が数値ではない'; if (Math.abs(Math.round(v * 1000) - v * 1000) > 1e-6) return '損切りの価格が刻み（0.001）に合わない'; if (sg * (v - pos.sl) < -1e-9) return '損切りを遠ざける（広げる）変更はできない（上級の管理でも、当初より不利にはしない）'; if (sg * (nowExit - v) < pip) return 'いまの決済の価格（' + nowExit.toFixed(3) + '）に近すぎる・越えている（1pips 以上離す）'; return null; };
    if (a.type === 'modifySL' || a.type === 'be') {
      var v = a.type === 'be' ? r3(pos.entryFill) : (typeof a.sl === 'string' ? parseFloat(a.sl) : a.sl); if (a.type === 'be' && sg * (v - pos.sl) <= 1e-9) return { ok: false, error: '損切りはもう建値以上（有利な側）にある' };
      var er = slCheck(v); if (er) return { ok: false, error: er };
      var old = pos.sl; pos.sl = v; pos.events.push({ kind: 'modifySL', index: pos.idx, from: old, to: v, be: a.type === 'be' }); rec({ sl: v });
      return { ok: true, note: a.type === 'be' ? '建値（約定価格 ' + v.toFixed(3) + '）へ。次の足から有効。建値で止まっても損益ゼロとは限らない（決済の滑り ' + pos.costs.exitSlipPips + 'pips・窓ならもっと不利）' : '次の足から有効' };
    }
    if (a.type === 'partialClose') {
      var f = a.fraction; if (!(f > 0 && f < 1)) return { ok: false, error: '部分決済の割合が正しくない' }; var spec = { lotStep: pos.lotStep, minLot: pos.minLot };
      var pend = pos.pending.reduce(function (s, p) { return s + p.lots; }, 0); var avail = Math.round((pos.lots - pend) * 1e6) / 1e6;
      var lots = lotsFloor(avail * f, spec); var rest = Math.round((avail - lots) * 1e6) / 1e6;
      if (pos.pending.some(function (p) { return p.kind === 'fullClose'; })) return { ok: false, error: 'すでに全部の決済を予約している' };
      if (lots + 1e-12 < pos.minLot) return { ok: false, error: '決済するロット（' + lots + '）が最小ロット（' + pos.minLot + '）より小さい' + (pend ? '（予約した決済の分を除いて計算）' : '') };
      if (rest + 1e-12 < pos.minLot) return { ok: false, error: '残るロット（' + rest + '）が最小ロット（' + pos.minLot + '）より小さい。全部を決済する' + (pend ? '（予約した決済の分を除いて計算）' : '') };
      pos.pending.push({ kind: 'partialClose', lots: lots, reason: 'partial' }); rec({ lots: lots }); return { ok: true, note: lots + 'ロットを次の足の始値で決済（残り ' + rest + 'ロット）' };
    }
    if (a.type === 'fullClose') { pos.pending = [{ kind: 'fullClose', lots: pos.lots, reason: 'early' }]; rec({ reason: a.reason || null }); return { ok: true, note: '次の足の始値（' + (sg > 0 ? '売値' : '買値') + '−滑り）で決済' }; }
    if (a.type === 'trail') {
      var dist = a.mode === 'atr' ? (isFinite(ctx.atr) && ctx.atr > 0 ? a.value * ctx.atr : NaN) : a.value * pip; if (!(isFinite(dist) && dist >= pip)) return { ok: false, error: 'トレーリングの幅が正しくない（ATR が分からない・1pips 未満）' };
      pos.trail = { mode: a.mode, value: a.value, dist: dist, from: pos.idx }; pos.bestClose = b.c; var cand = r3(b.c - sg * dist); var moved = false;
      if (sg * (cand - pos.sl) > 1e-9 && sg * (nowExit - cand) >= pip) { var old2 = pos.sl; pos.sl = cand; moved = true; pos.events.push({ kind: 'trail', index: pos.idx, from: old2, to: cand }); }
      else pos.events.push({ kind: 'trail', index: pos.idx, from: pos.sl, to: pos.sl, set: true });
      rec({ dist: r3(dist) }); return { ok: true, note: 'トレーリング：確定した足の終値の最も有利な値から ' + (a.mode === 'atr' ? 'ATR×' + a.value : a.value + 'pips') + '（' + (dist / pip).toFixed(1) + 'pips）。有利な向きにだけ動かす。足の確定ごとに更新し、次の足から有効（足の中の値動きの順序は分からない）' + (moved ? '' : '。いまの損切りの方が有利なので、まだ動かさない') };
    }
    return { ok: false, error: '知らない操作' };
  };
  // まとめ（TradeCore.settleBars と同じ名前の値も返す：記録・振り返り・統計でそのまま使う）
  PS.summary = function (pos) {
    var lots0 = pos.lots0; var w = function (k) { return pos.fills.reduce(function (s, f) { return s + f[k] * f.lots; }, 0) / lots0; };
    var yen = pos.fills.reduce(function (s, f) { return s + f.yen; }, 0); var net = r1(w('pips')), gross = r1(w('grossPips'));
    var last = pos.fills[pos.fills.length - 1] || {}; var R = pos.riskPips0 > 0 ? r2(net / pos.riskPips0) : null;   // ＝実現した損益（pips×ロット）の合計 ÷（当初の損切りの pips × 当初のロット）＝ 円の合計 ÷ 当初の口座リスク（円）
    return { ok: true, advanced: true, side: pos.side, entryIndex: pos.entryIndex, entryMid: pos.entryMid, entryPrice: pos.entryFill, sl: pos.sl0, tp: pos.tp0, finalSl: pos.sl, exitIndex: pos.closed ? pos.exitIndex : pos.idx, exitPrice: last.fill, reason: pos.reason || 'open',
      ambiguous: pos.ambiguous, gap: pos.fills.some(function (f) { return f.gap && f.kind === 'stopFill'; }), gapSlippagePips: pos.gapPips, grossPips: gross, netPips: net, costPips: r1(gross - net), riskPips: r1(pos.riskPips0), riskR: R, grossR: pos.riskPips0 ? r2(gross / pos.riskPips0) : null,
      plannedRR: pos.tp0 !== null ? r2(pos.sg * (pos.tp0 - pos.entryFill) / pos.pip / pos.riskPips0) : null, lots: lots0, pnlYen: yen, commissionYen: Math.round(pos.commissionYen), pnlYenAfterCommission: Math.round(yen - pos.commissionYen),
      maePips: r1(pos.mae / pos.pip), mfePips: r1(pos.mfe / pos.pip), maeR: pos.riskPips0 ? r2(pos.mae / pos.pip / pos.riskPips0) : null, mfeR: pos.riskPips0 ? r2(pos.mfe / pos.pip / pos.riskPips0) : null, worstOpenYen: pos.worstOpenYen,
      bars: (pos.closed ? pos.exitIndex : pos.idx) - pos.entryIndex, fills: pos.fills.slice(), events: pos.events.slice(), actions: pos.actions.slice(),
      ifTpFirst: pos.altTp ? (function () { var np = r1((pos.fills.slice(0, -1).reduce(function (s, f) { return s + f.pips * f.lots; }, 0) + pos.altTp.pips * pos.altTp.lots) / lots0); return { reason: 'tp', netPips: np, riskR: pos.riskPips0 ? r2(np / pos.riskPips0) : null }; })() : null,
      assumption: pos.ambiguous ? '同じ足で損切りと利確の両方に届いた（OHLC だけでは順序が分からない）。損切りが先と仮定した' : '操作は足の確定の後。成行は次の足の始値で約定。損切りの変更は次の足から有効' };
  };
  // 足が尽きた（相場の終わり）：残りを最後の足の終値で決済（reason 'end'）
  PS.finish = function (pos, bars) { if (!pos || pos.closed) return; var b = bars[pos.idx]; fillOut(pos, pos.idx, pos.lots, exitPx(pos, b.c) - pos.sg * pos.costs.exitSlipPips * pos.pip, b.c, 'timeExit', 'end'); };
  // 同じ操作の並びから、同じ結果を作り直す（決まった結果になるかの確かめ・振り返り）。actions：[{ type, index, ...}]（PS.act に渡したもの）
  PS.replay = function (bars, openArgs, actions, atrAt) {
    var pos = PS.open(openArgs); if (!pos.ok) return pos; var A = (actions || []).slice().sort(function (a, b) { return a.index - b.index; }); var k = 0; var errs = [];
    var doActs = function () { while (k < A.length && A[k].index === pos.idx) { var a = A[k++]; var r = PS.act(pos, a, { bars: bars, atr: atrAt ? atrAt(pos.idx) : NaN }); if (!r.ok) errs.push(a.type + '@' + a.index + '：' + r.error); } };
    doActs(); for (var i = pos.entryIndex + 1; i < bars.length && !pos.closed; i++) { PS.step(pos, bars, i); doActs(); }
    PS.finish(pos, bars); pos.replayErrors = errs; return pos;
  };
  root.PositionEngine = PS;
  if (typeof module !== 'undefined' && module.exports) module.exports = PS;
})(typeof window !== 'undefined' ? window : globalThis);
