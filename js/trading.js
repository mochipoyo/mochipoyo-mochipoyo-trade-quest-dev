/* =========================================================
   もちぽよFXクエスト - トレード判定ロジック（旧 battle.js）
   ・判断プロセスを採点する（勝敗だけで評価しない）
   ・エントリー後の値動きは「未来の足」を1本ずつ進めて判定する
   ・UIには依存しない（Node.jsでもテスト可能）
   ========================================================= */
(function (root) {
  'use strict';

  var CONFIG = root.CONFIG || require('./config.js');

  var TradeEval = {};

  var ACTION_LABEL = { buy: '買い', sell: '売り', skip: '見送り' };
  TradeEval.ACTION_LABEL = ACTION_LABEL;

  /* ---------- 損切り・利確の推奨候補（根拠のある位置） ---------- */
  // 直近スイングの少し外側に損切り、リスクリワード2倍の位置に利確（教材の参考値）
  TradeEval.suggestLevels = function (scn, action) {
    var st = scn.states[scn.def.focusTF];
    var pip = CONFIG.market.pip;
    var entry = st.close;
    var buffer = 3 * pip;
    if (action === 'buy') {
      var sl = Math.min(st.lastLow, st.recentLow) - buffer;
      var risk = entry - sl;
      return { entry: entry, sl: r(sl), tp: r(entry + risk * CONFIG.risk.rrGood), riskPips: risk / pip };
    }
    if (action === 'sell') {
      var sl2 = Math.max(st.lastHigh, st.recentHigh) + buffer;
      var risk2 = sl2 - entry;
      return { entry: entry, sl: r(sl2), tp: r(entry - risk2 * CONFIG.risk.rrGood), riskPips: risk2 / pip };
    }
    return { entry: entry, sl: null, tp: null, riskPips: 0 };
  };
  function r(v) { return Math.round(v * 1000) / 1000; }

  /* ---------- ロット計算 ---------- */
  // 1pip = 0.01、1万通貨あたり 1pip = 100円 と仮定（学習用の簡略化）
  TradeEval.lotFor = function (capital, riskPercent, riskPips) {
    if (!riskPips || riskPips <= 0) return 0;
    var riskYen = capital * riskPercent / 100;
    var units10k = riskYen / (riskPips * 100);
    return Math.max(0.01, Math.round(units10k * 100) / 100); // 万通貨単位（小数2桁）
  };

  /* ---------- 判断プロセスの評価 ---------- */
  // decision: { action, sl, tp, riskPercent, checkedHigherTF, checkedIndicators, usedHint }
  TradeEval.evaluate = function (scn, decision) {
    var def = scn.def;
    var st = scn.states[def.focusTF];
    var pip = CONFIG.market.pip;
    var items = [];
    var violations = [];
    var score = 0;
    var action = decision.action;
    var correct = def.correct;
    var entry = st.close;

    function item(name, ok, note, points) { items.push({ name: name, ok: ok, note: note, points: points || 0 }); score += (ok ? (points || 0) : 0); }

    // 1. 上位足の環境認識（確認したかどうか）
    var higher = describeHigher(scn);
    if (decision.checkedHigherTF) item('上位足の環境認識', true, '上位足を確認した：' + higher, 10);
    else {
      item('上位足の環境認識', false, '上位足を確認せずに判断した。実際の上位足：' + higher, 10);
      if (action !== 'skip') violations.push('上位足を無視したエントリー');
    }

    // 2. インジケーター確認
    if (decision.checkedIndicators) item('インジケーター確認', true, 'EMA・RCI・MACDの状態を確認した', 5);
    else item('インジケーター確認', false, 'インジケーターの状態を確認せずに判断した', 5);

    // 3. 行動の妥当性（トレンド方向・波形・見送り判断）
    var actionPoints = 0;
    var actionOk = (action === correct);
    var actionNote = def.explain[action] || '';
    if (actionOk) actionPoints = 50;
    else if (action === 'skip') actionPoints = 25;                // 優位性のある場面の見送り：機会損失だが致命傷ではない
    else if (correct === 'skip') actionPoints = 5;                // 見送るべき場面でのトレード
    else actionPoints = 0;                                         // 逆方向のトレード
    item('方向・波形・見送りの判断', actionOk, actionNote, 50);
    score += actionOk ? 0 : actionPoints;                          // 不正解でも部分点

    // 不正解のトレードはルール違反として分類
    if (!actionOk && action !== 'skip') {
      if (correct !== 'skip') violations.push('根拠のない逆張り');
      else if (def.id === 'range') violations.push('レンジ内での無駄な売買');
      else if (def.id === 'false_breakout' || def.id === 'jump_in') violations.push('飛び乗りエントリー');
      else if (def.id === 'mtf_conflict') violations.push('上位足を無視したエントリー');
      else if (def.id === 'bad_rr') violations.push('リスクリワードの悪いトレード');
      else if (def.id === 'rci_hot_trend') violations.push(action === 'sell' ? 'RCI水準だけの逆張り' : '押し目を待たないエントリー');
      else violations.push('優位性のない場面でのトレード');
    }

    // 4. 損切り・利確・資金管理（トレードした場合のみ）
    var trade = null;
    if (action === 'buy' || action === 'sell') {
      var sl = decision.sl, tp = decision.tp;
      var riskPct = decision.riskPercent === undefined ? CONFIG.risk.defaultRiskPercent : decision.riskPercent;
      var riskPips = 0, rewardPips = 0;
      if (sl === null || sl === undefined || isNaN(sl)) {
        item('損切り位置', false, '損切りが設定されていない。損切りなしは致命傷につながる最も危険な行動', 15);
        violations.push('損切りなし');
      } else {
        riskPips = (action === 'buy' ? entry - sl : sl - entry) / pip;
        var ref = action === 'buy' ? Math.min(st.lastLow, st.recentLow) : Math.max(st.lastHigh, st.recentHigh);
        var beyondSwing = action === 'buy' ? sl <= ref + 0.5 * pip : sl >= ref - 0.5 * pip;
        if (riskPips <= 0) { item('損切り位置', false, '損切りがエントリー価格の反対側にない', 15); violations.push('損切り位置の誤り'); }
        else if (beyondSwing && riskPips <= 120) item('損切り位置', true, '直近スイングの外側（' + riskPips.toFixed(0) + 'pips）に根拠のある損切りを置けた', 15);
        else if (!beyondSwing) item('損切り位置', false, '直近スイング（' + fmt(ref) + '）の内側に損切りがあり、通常の押し戻りで刈られやすい', 15);
        else item('損切り位置', false, '損切りが遠すぎる（' + riskPips.toFixed(0) + 'pips）。ロットが小さくなりすぎるか、リスクが過大になる', 15);
      }
      if (tp === null || tp === undefined || isNaN(tp) || riskPips <= 0) {
        item('リスクリワード', false, '利確目標が設定されていないか、リスクが計算できない', 10);
      } else {
        rewardPips = (action === 'buy' ? tp - entry : entry - tp) / pip;
        var rr = rewardPips / riskPips;
        if (rr >= CONFIG.risk.rrMin) item('リスクリワード', true, '1 : ' + rr.toFixed(2) + '（参考値 1:1.5〜1:3 の範囲）', 10);
        else if (rr >= 1) { item('リスクリワード', false, '1 : ' + rr.toFixed(2) + '。参考値の1:1.5に届いていない', 10); score += 4; }
        else { item('リスクリワード', false, '1 : ' + rr.toFixed(2) + '。利益より損失の方が大きい設定', 10); violations.push('リスクリワードの悪いトレード'); }
      }
      if (riskPct <= CONFIG.risk.maxSafeRiskPercent) item('資金管理（リスク%）', true, '1トレードのリスクを資金の' + riskPct + '%に抑えた', 10);
      else { item('資金管理（リスク%）', false, '1トレードのリスクが資金の' + riskPct + '%。連敗で致命傷になるロット過大', 10); violations.push('ロット過大'); }

      trade = { action: action, entry: entry, sl: sl, tp: tp, riskPips: riskPips, rewardPips: rewardPips, riskPercent: riskPct,
        rr: riskPips > 0 ? rewardPips / riskPips : 0 };
    } else {
      // 見送りの評価
      if (correct === 'skip') { item('見送り判断', true, '優位性が不十分な場面で無理にトレードしなかった', 35); }
      else { item('見送り判断', false, '見送り自体は損失にならないが、根拠が揃った場面だった', 35); score += 10; }
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    // 発動スキル（演出用）
    var skill = pickSkill(def, action, actionOk, trade);

    return { score: score, items: items, violations: violations, actionOk: actionOk, trade: trade, skill: skill,
      correct: correct, correctLabel: ACTION_LABEL[correct], chosenLabel: ACTION_LABEL[action], summary: def.explain[correct] };
  };

  function fmt(v) { return v.toFixed(3); }

  function describeHigher(scn) {
    var d = scn.states['1d'], h = scn.states['4h'];
    function word(a) { return a.emaOrder === 'up' ? '上昇（EMA上昇配列）' : a.emaOrder === 'down' ? '下降（EMA下降配列）' : (a.dow.trend === 'up' ? '上昇' : a.dow.trend === 'down' ? '下降' : 'レンジ・方向感なし'); }
    return '日足＝' + word(d) + '／4時間足＝' + word(h);
  }

  function pickSkill(def, action, ok, trade) {
    if (!ok) {
      if (action === 'skip') return { name: '見送りの構え', effect: 'guard' };
      return { name: '焦りの一撃', effect: 'miss' };
    }
    if (action === 'skip') return { name: '見送りの構え', effect: 'guard' };
    if (def.id.indexOf('hidden') === 0) return { name: 'MACDヒドゥンストライク', effect: 'strike' };
    if (def.id.indexOf('regular') === 0) return { name: 'ダイバージェンスアロー', effect: 'strike' };
    if (def.id === 'up_pullback' || def.id === 'down_rally') return { name: 'RCIリバーサル', effect: 'strike' };
    if (def.id === 'clear_up' || def.id === 'clear_down') return { name: 'ダウブレード', effect: 'strike' };
    return { name: 'EMAスラッシュ', effect: 'strike' };
  }

  /* ---------- エントリー後の値動き再生（未来の足を1本ずつ進める） ---------- */
  // 同一足で利確と損切りの両方に到達した場合は、約定順序が確定できないため「損切り扱い（保守的）」にする
  TradeEval.simulate = function (scn, trade, maxBars) {
    var fut = scn.states[scn.def.focusTF].future;
    maxBars = maxBars || fut.length;
    var pip = CONFIG.market.pip;
    var path = [];
    var result = { outcome: 'open', bars: 0, pips: 0, exitPrice: null, ambiguous: false };
    for (var i = 0; i < Math.min(maxBars, fut.length); i++) {
      var c = fut[i];
      path.push(c);
      var hitTp = false, hitSl = false;
      if (trade.action === 'buy') { hitTp = trade.tp !== null && c.h >= trade.tp; hitSl = trade.sl !== null && c.l <= trade.sl; }
      else { hitTp = trade.tp !== null && c.l <= trade.tp; hitSl = trade.sl !== null && c.h >= trade.sl; }
      if (hitTp && hitSl) { result.outcome = 'sl'; result.ambiguous = true; result.exitPrice = trade.sl; result.bars = i + 1; break; }
      if (hitSl) { result.outcome = 'sl'; result.exitPrice = trade.sl; result.bars = i + 1; break; }
      if (hitTp) { result.outcome = 'tp'; result.exitPrice = trade.tp; result.bars = i + 1; break; }
    }
    if (result.outcome === 'open') {
      // 期間内に決着しなかった場合は最終足の終値で決済
      var last = path[path.length - 1];
      result.exitPrice = last.c; result.bars = path.length; result.outcome = 'time';
    }
    if (trade.sl === null && result.outcome === 'time') {
      // 損切りなしの場合、含み損の最大値も記録（教育用）
      var worst = 0;
      path.forEach(function (c) { var d = trade.action === 'buy' ? (c.l - trade.entry) : (trade.entry - c.h); if (d < worst) worst = d; });
      result.worstPips = worst / pip;
    }
    result.pips = (trade.action === 'buy' ? result.exitPrice - trade.entry : trade.entry - result.exitPrice) / pip;
    result.path = path;
    return result;
  };

  /* ---------- 成績の集計 ---------- */
  TradeEval.emptyStats = function () {
    return { trades: 0, wins: 0, losses: 0, grossProfit: 0, grossLoss: 0, rrSum: 0, skips: 0, correctSkips: 0, violations: 0,
      scoreSum: 0, scoreCount: 0, peakCapital: CONFIG.risk.capital, maxDrawdown: 0, byScenario: {} };
  };

  // 戦闘1ラウンドの結果を成績に反映し、資金を更新する
  TradeEval.applyResult = function (stats, state, evalRes, sim) {
    stats.scoreSum += evalRes.score; stats.scoreCount += 1;
    stats.violations += evalRes.violations.length;
    var sc = evalRes.scenarioId;
    if (sc) { stats.byScenario[sc] = stats.byScenario[sc] || { plays: 0, correct: 0 }; stats.byScenario[sc].plays++; if (evalRes.actionOk) stats.byScenario[sc].correct++; }
    if (!evalRes.trade) {
      stats.skips += 1; if (evalRes.actionOk) stats.correctSkips += 1;
      return { pnl: 0 };
    }
    var t = evalRes.trade;
    stats.trades += 1;
    if (t.rr > 0) stats.rrSum += t.rr;
    var riskYen = state.capital * t.riskPercent / 100;
    var pnl = 0;
    if (t.riskPips > 0) pnl = riskYen * (sim.pips / t.riskPips);
    else pnl = sim.pips * 100 * 0.5; // 損切りなし：0.5万通貨固定扱い（学習用の簡略化）
    pnl = Math.round(pnl);
    if (pnl >= 0) { stats.wins += 1; stats.grossProfit += pnl; } else { stats.losses += 1; stats.grossLoss += -pnl; }
    state.capital = Math.max(0, state.capital + pnl);
    if (state.capital > stats.peakCapital) stats.peakCapital = state.capital;
    var dd = stats.peakCapital > 0 ? (stats.peakCapital - state.capital) / stats.peakCapital : 0;
    if (dd > stats.maxDrawdown) stats.maxDrawdown = dd;
    return { pnl: pnl };
  };

  TradeEval.summarizeStats = function (stats) {
    var total = stats.trades;
    return {
      trades: total,
      winRate: total ? (stats.wins / total * 100) : 0,
      avgProfit: stats.wins ? stats.grossProfit / stats.wins : 0,
      avgLoss: stats.losses ? stats.grossLoss / stats.losses : 0,
      avgRR: total ? stats.rrSum / total : 0,
      maxDrawdown: stats.maxDrawdown * 100,
      skips: stats.skips, correctSkips: stats.correctSkips,
      violations: stats.violations,
      learningScore: stats.scoreCount ? stats.scoreSum / stats.scoreCount : 0
    };
  };

  // 総合トレーダーランク（利益額ではなく判断の質で決める）
  TradeEval.rank = function (stats) {
    var s = TradeEval.summarizeStats(stats);
    if (s.learningScore >= 85 && stats.scoreCount >= 20 && s.violations / Math.max(1, stats.scoreCount) < 0.1) return 'S：相場を生き抜く者';
    if (s.learningScore >= 75 && stats.scoreCount >= 12) return 'A：優位性を選ぶ者';
    if (s.learningScore >= 60 && stats.scoreCount >= 6) return 'B：規律あるトレーダー';
    if (stats.scoreCount >= 3) return 'C：見習いトレーダー';
    return 'D：相場に迷い込んだ新人';
  };

  root.TradeEval = TradeEval; root.Battle = TradeEval; // 旧名との互換
  if (typeof module !== 'undefined' && module.exports) module.exports = TradeEval;
})(typeof window !== 'undefined' ? window : globalThis);
