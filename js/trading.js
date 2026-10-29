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
      var why = REASON_OF[def.id] || 'align';
      if (correct !== 'skip') violations.push('根拠のない逆張り');
      else if (why === 'range' || why === 'whipsaw') violations.push('レンジ内での無駄な売買');
      else if (why === 'fake' || why === 'jump') violations.push('飛び乗りエントリー');
      else if (why === 'conflict' || why === 'div_alone') violations.push('上位足を無視したエントリー');
      else if (why === 'rr') violations.push('リスクリワードの悪いトレード');
      else if (why === 'rcihot') violations.push(((action === 'sell' && truth.htf === 'up') || (action === 'buy' && truth.htf === 'down')) ? 'RCI水準だけの逆張り' : '押し目・戻り目を待たないエントリー');
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
  TradeEval.rankLegacy = function (stats) {   // v4 で TradeEval.rank（分野別評価）に置き換え。互換のため残す
    var s = TradeEval.summarizeStats(stats);
    if (s.learningScore >= 85 && stats.scoreCount >= 20 && s.violations / Math.max(1, stats.scoreCount) < 0.1) return 'S：相場を生き抜く者';
    if (s.learningScore >= 75 && stats.scoreCount >= 12) return 'A：優位性を選ぶ者';
    if (s.learningScore >= 60 && stats.scoreCount >= 6) return 'B：規律あるトレーダー';
    if (stats.scoreCount >= 3) return 'C：見習いトレーダー';
    return 'D：相場に迷い込んだ新人';
  };


  /* =========================================================
     v4.0 学習強化：分析プロセスの採点（真の状態・設問・理由・分野別記録・ランク）
     ========================================================= */
  // チャートから計算した「真の状態」（採点根拠は常に表示チャートと同じ計算結果）
  TradeEval.truth = function (scn) {
    var def = scn.def; var h4 = scn.states['4h'], d1 = scn.states['1d'], f = scn.states[def.focusTF];
    function dir(a) { if (a.emaOrder === 'up' || a.emaOrder === 'down') return a.emaOrder; if (a.dow.trend === 'up' || a.dow.trend === 'down') return a.dow.trend; return 'range'; }
    // ダイバージェンスが複数検出される場合は、その場面のテーマ（def.id）に合うものを優先し、なければ検出順
    var flags = { hidden_bull: f.div.hiddenBull, hidden_bear: f.div.hiddenBear, regular_bull: f.div.regularBull, regular_bear: f.div.regularBear };
    var order = (def.id.indexOf('regular') === 0 ? ['regular_bull', 'regular_bear', 'hidden_bull', 'hidden_bear'] : ['hidden_bull', 'hidden_bear', 'regular_bull', 'regular_bear']);
    var div = 'none'; for (var i = 0; i < order.length; i++) if (flags[order[i]]) { div = order[i]; break; }
    // 上位足の方向：4時間足が明確ならそれ、不明瞭なら日足
    var htf = dir(h4) !== 'range' ? dir(h4) : dir(d1);
    var swing = TradeEval.swingTruth(f);
    return { swing: swing, htf: htf, d1: dir(d1), trend: (f.dow.trend === 'up' || f.dow.trend === 'down') ? f.dow.trend : 'range', ema: f.emaOrder, rci: f.rciState, macd: div, macdSide: f.macdState, action: def.correct, reason: REASON_OF[def.id] || 'align' };
  };
  // 直近の「確定した」高値・安値（ZigZag の未確定ピボットは採点根拠にしない）
  TradeEval.swingTruth = function (f) { var hi = null, lo = null; for (var q = f.pivots.length - 1; q >= 0; q--) { var p = f.pivots[q]; if (!p.confirmed) continue; if (!hi && p.type === 'high') hi = p; if (!lo && p.type === 'low') lo = p; if (hi && lo) break; } return { high: hi ? { index: hi.index, price: hi.price } : null, low: lo ? { index: lo.index, price: lo.price } : null }; };
  TradeEval.SWING_TOL = 2;   // 指定した足が確定ピボットから±2本以内なら正解
  TradeEval.swingCheck = function (truthSwing, picked) { var r = {}; ['high', 'low'].forEach(function (k) { var t = truthSwing && truthSwing[k], p = picked && picked[k]; r[k] = !!(t && p && Math.abs(p.index - t.index) <= TradeEval.SWING_TOL); }); r.ok = r.high && r.low; r.count = (r.high ? 1 : 0) + (r.low ? 1 : 0); return r; };
  // 分析の設問（答えは truth のキーと一致）
  TradeEval.ANALYSIS = [
    { key: 'htf', topic: 'mtf', title: '上位足（4時間足）の方向は？', points: 9, options: [['up', '上昇'], ['down', '下降'], ['range', 'レンジ・不明瞭']], hint: '4時間足に切り替えて、高値・安値の切り上げ／切り下げと、EMAの並びを見よう。' },
    { key: 'trend', topic: 'dow', title: '{tf}の波形（ダウ理論）は？', points: 6, options: [['up', '高値・安値の切り上げ（上昇）'], ['down', '高値・安値の切り下げ（下降）'], ['range', '揃っていない（レンジ）']], hint: '直近の確定した高値と安値が、前の高値・安値より上か下かを比べよう。ZigZagの最後の未確定の波は根拠にしない。' },
    { key: 'ema', topic: 'ema', title: 'EMA20/30/40の並びは？', points: 6, options: [['up', '20＞30＞40（上昇配列）'], ['down', '20＜30＜40（下降配列）'], ['mixed', '絡み合っている']], hint: '3本の線が上から20・30・40の順なら上昇配列、逆なら下降配列。交差して絡んでいれば方向感なし。' },
    { key: 'rci', topic: 'rci', title: 'RCI(9)の状態は？', points: 7, options: [['overbought', '+70以上（買われすぎ圏）'], ['oversold', '−70以下（売られすぎ圏）'], ['overbought_reversal', '+70圏から反転して下がり始めた'], ['oversold_reversal', '−70圏から反転して上がり始めた'], ['neutral', '中立（±70に達していない）']], hint: 'RCIは±70到達「だけ」では根拠にならない。到達後に反転したか、トレンド方向と合っているかを見る。' },
    { key: 'macd', topic: 'macd', title: 'MACD(6,13,4)のダイバージェンスは？', points: 7, options: [['none', 'なし'], ['regular_bull', '通常ダイバージェンス（強気：安値切り下げ／MACD切り上げ）'], ['regular_bear', '通常ダイバージェンス（弱気：高値切り上げ／MACD切り下げ）'], ['hidden_bull', 'ヒドゥン（強気：安値切り上げ／MACD切り下げ）'], ['hidden_bear', 'ヒドゥン（弱気：高値切り下げ／MACD切り上げ）']], hint: '確定した直近2つの安値（または高値）とMACDラインの山谷を比べる。価格とMACDの向きが逆ならダイバージェンス。' }
  ];
  TradeEval.qTitle = function (q, scn) { var tf = CONFIG.timeframes.filter(function (t) { return t.id === scn.def.focusTF; })[0]; return q.title.replace('{tf}', tf ? tf.label : '15分足'); };
  TradeEval.ANALYSIS_LABEL = {};
  TradeEval.ANALYSIS.forEach(function (q) { q.options.forEach(function (o) { TradeEval.ANALYSIS_LABEL[q.key + ':' + o[0]] = o[1]; }); });
  // 判断の理由（正解は1つ。誤った理由も混ぜる）
  TradeEval.REASONS = [
    ['align', '上位足と下位足の方向が一致した順張り'], ['pullback', '上位足の方向へ戻る押し目・戻り目で反発し始めた'], ['hidden', 'ヒドゥンダイバージェンスでトレンド継続が示唆された'], ['regular', '上位足方向の押し目で通常ダイバージェンスが出た'],
    ['range', '高値・安値が揃わないレンジで方向感がない'], ['fake', 'ブレイクがダマシで、根拠が確定していない'], ['conflict', '上位足と下位足の方向が不一致'], ['rr', '損切りが遠く利確が近い（リスクリワードが悪い）'], ['jump', '急騰・急落直後の飛び乗りになる'], ['rcihot', 'RCI±70に張り付く強いトレンドが続いており、逆張りせず押し目・戻り目を待つ'],
    ['reversal', '高値・安値の切り上げ／切り下げが崩れ、転換が確定した後の順張り'], ['div_alone', 'ダイバージェンスが出ているが上位足の方向と整合していない'], ['tight_sl', '押し目・戻り目の安値／高値が近く、損切りを小さく置けてリスクリワードが良い'], ['whipsaw', '乱高下で方向感がなく、どちらに入っても損切りが遠い'],
    ['rci_only', 'RCIが±70に達したので逆張りする'], ['feel', '勢いがあるので乗る']
  ];
  var REASON_OF = { clear_up: 'align', clear_down: 'align', up_pullback: 'pullback', down_rally: 'pullback', hidden_bull: 'hidden', hidden_bear: 'hidden', regular_bull: 'regular', regular_bear: 'regular', range: 'range', false_breakout: 'fake', mtf_conflict: 'conflict', bad_rr: 'rr', jump_in: 'jump', rci_hot_trend: 'rcihot',
    // v4.3 追加シナリオ
    up_ema_bounce: 'pullback', down_ema_reject: 'pullback', range_high: 'range', clear_up_5m: 'align', clear_down_5m: 'align', mtf_conflict_up: 'conflict', up_pullback_5m: 'pullback', down_rally_5m: 'pullback', rci_cold_trend: 'rcihot', false_breakdown: 'fake', breakout_retest: 'pullback', reversal_confirmed_down: 'reversal', reversal_confirmed_up: 'reversal', up_pullback_1h: 'pullback',
    div_against_htf: 'div_alone', div_bear_against_htf: 'div_alone', bad_rr_sell: 'rr', jump_in_down: 'jump', pullback_tight_sl: 'tight_sl', whipsaw: 'whipsaw' };
  TradeEval.REASON_OF = REASON_OF;
  TradeEval.reasonLabel = function (key) { for (var i = 0; i < TradeEval.REASONS.length; i++) if (TradeEval.REASONS[i][0] === key) return TradeEval.REASONS[i][1]; return key; };
  // 出題する理由の選択肢（正解＋5つ、シナリオごとに固定の並び）
  TradeEval.reasonOptions = function (scn) {
    var correct = REASON_OF[scn.def.id] || 'align'; var pool = TradeEval.REASONS.filter(function (r) { return r[0] !== correct; });
    var seed = scn.def.seed; var picked = []; var idx = seed % pool.length;
    while (picked.length < 5) { picked.push(pool[idx % pool.length]); idx += 5; }
    picked.push(TradeEval.REASONS.filter(function (r) { return r[0] === correct; })[0]);
    picked.sort(function (a, b) { return ((a[0].charCodeAt(0) * 31 + seed) % 97) - ((b[0].charCodeAt(0) * 31 + seed) % 97); });
    return picked;
  };
  // 分析付きの採点（decision.analysis = {htf,trend,ema,rci,macd}, decision.reason, decision.hintLevel）
  TradeEval.evaluateFull = function (scn, decision) {
    var def = scn.def; var st = scn.states[def.focusTF]; var pip = CONFIG.market.pip; var truth = TradeEval.truth(scn);
    var items = [], violations = [], score = 0, topics = {};
    function item(name, ok, note, points, topic, partial) { items.push({ name: name, ok: ok, note: note, points: points, topic: topic }); score += ok ? points : (partial || 0); if (topic) topics[topic] = { ok: ok }; }
    var an = decision.analysis || {};
    // 1. 分析プロセス（40点）
    TradeEval.ANALYSIS.forEach(function (q) {
      var ans = an[q.key]; var t = truth[q.key]; var ok = ans === t;
      var note = ok ? '正解：' + TradeEval.ANALYSIS_LABEL[q.key + ':' + t] : (ans ? 'あなた：' + TradeEval.ANALYSIS_LABEL[q.key + ':' + ans] + ' → 実際：' + TradeEval.ANALYSIS_LABEL[q.key + ':' + t] : '未判断 → 実際：' + TradeEval.ANALYSIS_LABEL[q.key + ':' + t]);
      item(TradeEval.qTitle(q, scn).replace('は？', ''), ok, note, q.points, q.topic);
    });
    // 1b. 重要な高値・安値の指定（5点。片方だけ正解は2点）
    var sw = TradeEval.swingCheck(truth.swing, decision.swing); var swT = truth.swing || {};
    var swNote = sw.ok ? '直近の確定した高値（' + (swT.high ? fmt(swT.high.price) : '―') + '）と安値（' + (swT.low ? fmt(swT.low.price) : '―') + '）を正しく指定した' : (!decision.swing || (!decision.swing.high && !decision.swing.low)) ? '未指定 → 確定した高値 ' + (swT.high ? fmt(swT.high.price) : '―') + '・安値 ' + (swT.low ? fmt(swT.low.price) : '―') : (sw.high ? '高値は正解。安値は' : sw.low ? '安値は正解。高値は' : '高値・安値とも') + '確定したピボット（高値 ' + (swT.high ? fmt(swT.high.price) : '―') + '／安値 ' + (swT.low ? fmt(swT.low.price) : '―') + '）とずれている。最後の未確定の波ではなく、左右' + CONFIG.zigzag.depth + '本より高い／低い点を探そう';
    item('重要な高値・安値の指定', sw.ok, swNote, 5, 'swing', sw.count === 1 ? 2 : 0);
    // 2. 行動（30点）
    var action = decision.action, correct = def.correct; var actionOk = action === correct;
    var partial = actionOk ? 0 : (action === 'skip' ? 12 : (correct === 'skip' ? 3 : 0));
    item('方向・波形・見送りの判断', actionOk, def.explain[action] || '', 30, 'action', partial);
    if (!actionOk && action !== 'skip') {
      if (correct !== 'skip') violations.push('根拠のない逆張り');
      else if (def.id === 'range') violations.push('レンジ内での無駄な売買');
      else if (def.id === 'false_breakout' || def.id === 'jump_in') violations.push('飛び乗りエントリー');
      else if (def.id === 'mtf_conflict') violations.push('上位足を無視したエントリー');
      else if (def.id === 'bad_rr') violations.push('リスクリワードの悪いトレード');
      else if (def.id === 'rci_hot_trend') violations.push(action === 'sell' ? 'RCI水準だけの逆張り' : '押し目を待たないエントリー');
      else violations.push('優位性のない場面でのトレード');
    }
    if (action !== 'skip' && an.htf && an.htf !== 'range' && ((action === 'buy' && truth.htf === 'down') || (action === 'sell' && truth.htf === 'up'))) violations.push('上位足に逆らったエントリー');
    // 3. 理由（10点）
    var reasonOk = decision.reason === truth.reason && actionOk;   // 行動が誤りなら、理由だけ合っていても採点しない（行動と理由の整合を重視）
    item('判断の理由', reasonOk, reasonOk ? TradeEval.reasonLabel(truth.reason) : (decision.reason === truth.reason ? '理由は合っているが行動と矛盾している' : 'あなた：' + (decision.reason ? TradeEval.reasonLabel(decision.reason) : '未選択') + ' → 適切な理由：' + TradeEval.reasonLabel(truth.reason)), 10, 'reason');
    if (decision.reason === 'rci_only') violations.push('RCI水準だけの逆張り');
    // 4. 損切り・リスクリワード・資金管理（20点）／見送り判断（20点）
    var trade = null, entry = st.close;
    if (action === 'buy' || action === 'sell') {
      var sl = decision.sl, tp = decision.tp; var riskPct = decision.riskPercent === undefined ? CONFIG.risk.defaultRiskPercent : decision.riskPercent; var riskPips = 0, rewardPips = 0;
      if (sl === null || sl === undefined || isNaN(sl)) { item('損切り位置', false, '損切りが設定されていない。損切りなしは致命傷につながる最も危険な行動', 10, 'risk'); violations.push('損切りなし'); }
      else {
        riskPips = (action === 'buy' ? entry - sl : sl - entry) / pip;
        var ref = action === 'buy' ? Math.min(st.lastLow, st.recentLow) : Math.max(st.lastHigh, st.recentHigh);
        var beyondSwing = action === 'buy' ? sl <= ref + 0.5 * pip : sl >= ref - 0.5 * pip;
        if (riskPips <= 0) { item('損切り位置', false, '損切りがエントリー価格の反対側にない', 10, 'risk'); violations.push('損切り位置の誤り'); }
        else if (beyondSwing && riskPips <= 120) item('損切り位置', true, '直近スイングの外側（' + riskPips.toFixed(0) + 'pips）に根拠のある損切りを置けた', 10, 'risk');
        else if (!beyondSwing) item('損切り位置', false, '直近スイング（' + fmt(ref) + '）の内側に損切りがあり、通常の押し戻りで刈られやすい', 10, 'risk');
        else item('損切り位置', false, '損切りが遠すぎる（' + riskPips.toFixed(0) + 'pips）。ロットが小さくなりすぎるか、リスクが過大になる', 10, 'risk');
      }
      if (tp === null || tp === undefined || isNaN(tp) || riskPips <= 0) item('リスクリワード', false, '利確目標が設定されていないか、リスクが計算できない', 6, 'risk');
      else { rewardPips = (action === 'buy' ? tp - entry : entry - tp) / pip; var rr = rewardPips / riskPips;
        if (rr >= CONFIG.risk.rrMin) item('リスクリワード', true, '1 : ' + rr.toFixed(2) + '（参考値 1:1.5〜1:3 の範囲）', 6, 'risk');
        else if (rr >= 1) item('リスクリワード', false, '1 : ' + rr.toFixed(2) + '。参考値の1:1.5に届いていない', 6, 'risk', 2);
        else { item('リスクリワード', false, '1 : ' + rr.toFixed(2) + '。利益より損失の方が大きい設定', 6, 'risk'); violations.push('リスクリワードの悪いトレード'); } }
      if (riskPct <= CONFIG.risk.maxSafeRiskPercent) item('資金管理（リスク%）', true, '1トレードのリスクを資金の' + riskPct + '%に抑えた', 4, 'risk');
      else { item('資金管理（リスク%）', false, '1トレードのリスクが資金の' + riskPct + '%。連敗で致命傷になるロット過大', 4, 'risk'); violations.push('ロット過大'); }
      trade = { action: action, entry: entry, sl: sl, tp: tp, riskPips: riskPips, rewardPips: rewardPips, riskPercent: riskPct, rr: riskPips > 0 ? rewardPips / riskPips : 0 };
      if (!actionOk) { var mgmt = items.filter(function (it) { return it.topic === 'risk' && it.ok; }).reduce(function (a, it) { return a + it.points; }, 0); score -= Math.round(mgmt / 2); }   // 方向が誤りのトレードは、注文管理の点を半分に
    } else {
      if (correct === 'skip') item('見送り判断', true, '優位性が不十分な場面で無理にトレードしなかった', 20, 'skip');
      else item('見送り判断', false, '見送り自体は損失にならないが、根拠が揃った場面だった', 20, 'skip', 6);
    }
    score = Math.max(0, Math.min(100, Math.round(score)));
    var summary = TradeEval.explainTruth(scn, truth, an);
    return { score: score, items: items, violations: violations, actionOk: actionOk, trade: trade, skill: pickSkill(def, action, actionOk, trade), correct: correct, correctLabel: ACTION_LABEL[correct], chosenLabel: ACTION_LABEL[action], summary: summary, truth: truth, topics: topics, hintLevel: decision.hintLevel || 0, reasonOk: reasonOk, swingOk: sw.ok, analysisOk: TradeEval.ANALYSIS.filter(function (q) { return an[q.key] === truth[q.key]; }).length, analysisTotal: TradeEval.ANALYSIS.length, full: true };
  };
  // 解説文（実際のチャート状態から組み立て、間違えた項目を指摘）
  TradeEval.explainTruth = function (scn, truth, an) {
    var tfL = { '15m': '15分足', '5m': '5分足', '1h': '1時間足' }[scn.def.focusTF] || scn.def.focusTF;
    var D = { up: '上昇', down: '下降', range: 'レンジ', mixed: '絡み合い' };
    var s = '4時間足は' + D[truth.htf] + '方向（日足は' + D[truth.d1] + '）。' + tfL + 'の波形は' + D[truth.trend] + '、EMAは' + (truth.ema === 'mixed' ? '絡み合い' : D[truth.ema] + '配列') + '。RCIは' + TradeEval.ANALYSIS_LABEL['rci:' + truth.rci] + '、MACDは' + (truth.macd === 'none' ? 'ダイバージェンスなし' : TradeEval.ANALYSIS_LABEL['macd:' + truth.macd]) + '。';
    var miss = TradeEval.ANALYSIS.filter(function (q) { return an[q.key] !== truth[q.key]; }).map(function (q) { return TradeEval.qTitle(q, scn).replace('は？', ''); });
    s += miss.length ? '確認が不足していた項目：' + miss.join('・') + '。' : '分析はすべて正確でした。';
    s += ' ' + (scn.def.explain[truth.action] || '');
    return s;
  };
  // 分野別の記録（挑戦数・正解・ヒント利用・最終挑戦・未見問題での正解）
  TradeEval.TOPICS = [['mtf', '上位足の環境認識'], ['dow', 'ダウ理論・波形'], ['ema', 'EMAの並び'], ['rci', 'RCIの状態'], ['macd', 'MACD・ダイバージェンス'], ['swing', '重要な高値・安値の指定'], ['action', 'エントリー／見送り判断'], ['reason', '判断の理由'], ['risk', '損切りと資金管理'], ['skip', '見送りの規律']];
  TradeEval.topicLabel = function (k) { for (var i = 0; i < TradeEval.TOPICS.length; i++) if (TradeEval.TOPICS[i][0] === k) return TradeEval.TOPICS[i][1]; return k; };
  TradeEval.recordTopics = function (tradeState, ev) {
    if (!ev.full) return; var T = tradeState.topics = tradeState.topics || {}; var hinted = ev.hintLevel > 0; var first = !(tradeState.stats.byScenario[ev.scenarioId] && tradeState.stats.byScenario[ev.scenarioId].plays > 1);
    Object.keys(ev.topics).forEach(function (k) { var t = T[k] = T[k] || { plays: 0, correct: 0, hinted: 0, noHintCorrect: 0, firstSeenCorrect: 0, last: 0, lastOk: false, history: [] };
      t.plays++; if (ev.topics[k].ok) t.correct++; if (hinted) t.hinted++; if (ev.topics[k].ok && !hinted) t.noHintCorrect++; if (ev.topics[k].ok && first) t.firstSeenCorrect++; t.last = Date.now(); t.lastOk = ev.topics[k].ok; t.history.push(ev.topics[k].ok ? 1 : 0); if (t.history.length > 20) t.history.shift(); });
    var S = tradeState.stats; S.noHintPlays = (S.noHintPlays || 0) + (hinted ? 0 : 1); S.noHintCorrect = (S.noHintCorrect || 0) + (!hinted && ev.actionOk ? 1 : 0);
    S.uniqueCorrect = S.uniqueCorrect || {}; if (ev.actionOk && ev.analysisOk >= 3) S.uniqueCorrect[ev.scenarioId] = true;
  };
  TradeEval.topicSummary = function (tradeState) {
    var T = tradeState.topics || {};
    return TradeEval.TOPICS.map(function (p) { var t = T[p[0]] || { plays: 0, correct: 0, hinted: 0, noHintCorrect: 0, history: [] }; var acc = t.plays ? t.correct / t.plays : null; var recent = t.history.slice(-5); var recAcc = recent.length ? recent.reduce(function (a, b) { return a + b; }, 0) / recent.length : null;
      var level = t.plays < 3 ? '未習熟' : (recAcc >= 0.8 && acc >= 0.7) ? '理解' : recAcc >= 0.5 ? '練習中' : '苦手';
      return { key: p[0], label: p[1], plays: t.plays, correct: t.correct, acc: acc, hintRate: t.plays ? t.hinted / t.plays : 0, recentAcc: recAcc, level: level, last: t.last, lastOk: t.lastOk }; });
  };
  // 苦手分野（挑戦3回以上で正解率が低い順。未挑戦の分野も「未習熟」として候補に）
  TradeEval.weakTopics = function (tradeState) {
    return TradeEval.topicSummary(tradeState).filter(function (t) { return t.plays === 0 || t.acc < 0.7 || t.level === '苦手'; }).sort(function (a, b) { return (a.acc === null ? 0.5 : a.acc) - (b.acc === null ? 0.5 : b.acc); });
  };
  // 分野 → 練習に向くシナリオ
  TradeEval.scenariosForTopic = function (topic) {
    var m = { mtf: ['mtf_conflict', 'mtf_conflict_up', 'clear_up', 'clear_down', 'regular_bull', 'regular_bear', 'up_pullback_1h', 'div_against_htf'], dow: ['clear_up', 'clear_down', 'range', 'range_high', 'false_breakout', 'up_pullback', 'reversal_confirmed_down', 'reversal_confirmed_up', 'breakout_retest'], swing: ['clear_up', 'clear_down', 'up_pullback', 'down_rally', 'reversal_confirmed_down', 'reversal_confirmed_up', 'pullback_tight_sl'], ema: ['clear_up', 'clear_down', 'up_pullback', 'down_rally', 'range', 'up_ema_bounce', 'down_ema_reject', 'whipsaw'], rci: ['up_pullback', 'down_rally', 'rci_hot_trend', 'rci_cold_trend', 'regular_bull', 'regular_bear', 'up_pullback_5m', 'down_rally_5m'], macd: ['hidden_bull', 'hidden_bear', 'regular_bull', 'regular_bear', 'div_against_htf', 'div_bear_against_htf'], action: ['range', 'false_breakout', 'false_breakdown', 'jump_in', 'up_pullback', 'clear_down', 'clear_up_5m', 'clear_down_5m'], reason: ['mtf_conflict', 'bad_rr', 'rci_hot_trend', 'hidden_bull', 'range', 'div_against_htf', 'pullback_tight_sl', 'reversal_confirmed_down'], risk: ['clear_up', 'clear_down', 'up_pullback', 'down_rally', 'bad_rr', 'bad_rr_sell', 'pullback_tight_sl'], skip: ['range', 'false_breakout', 'mtf_conflict', 'bad_rr', 'jump_in', 'rci_hot_trend', 'rci_cold_trend', 'whipsaw', 'jump_in_down', 'div_bear_against_htf'] };
    return m[topic] || root.Scenarios.ids();
  };
  // トレーダーランク：分野別の正解率・上位足認識・ヒントなし正解率・未見問題の対応力（異なるシナリオ数）を総合。回数だけでは上がらない
  TradeEval.RANKS = [['F', '見習いトレーダー'], ['E', 'チャート初心者'], ['D', '波形研究者'], ['C', '環境認識の修行者'], ['B', '規律あるトレーダー'], ['A', '相場分析の達人'], ['S', '波形の導師']];
  TradeEval.rank = function (tradeState) {
    var ts = TradeEval.topicSummary(tradeState); var S = tradeState.stats;
    var plays = S.scoreCount || 0; var uniq = Object.keys(S.uniqueCorrect || {}).length; var noHint = S.noHintPlays ? S.noHintCorrect / S.noHintPlays : 0;
    var acc = function (k) { var t = ts.filter(function (x) { return x.key === k; })[0]; return t && t.plays >= 3 ? t.acc : 0; };
    var core = ['mtf', 'dow', 'ema', 'rci', 'macd'].map(acc); var coreAvg = core.reduce(function (a, b) { return a + b; }, 0) / core.length;
    var crit = { analysis: coreAvg, mtf: acc('mtf'), action: acc('action'), risk: Math.max(acc('risk'), acc('skip')), noHint: noHint, variety: uniq, plays: plays, avgScore: plays ? S.scoreSum / plays : 0 };
    var r = 0;
    if (plays >= 3 && crit.avgScore >= 40) r = 1;                                                                    // E
    if (r >= 1 && plays >= 5 && uniq >= 4 && crit.action >= 0.5 && crit.analysis >= 0.45) r = 2;   // v4.2: ランクに報酬・解放が付いたため D は5回以上・異なる4場面に                                   // D
    if (r >= 2 && uniq >= 6 && crit.mtf >= 0.7 && crit.action >= 0.6 && crit.analysis >= 0.6) r = 3;                // C
    if (r >= 3 && uniq >= 9 && crit.risk >= 0.7 && crit.action >= 0.7 && noHint >= 0.6 && crit.analysis >= 0.7) r = 4;   // B
    if (r >= 4 && uniq >= 12 && crit.analysis >= 0.8 && crit.action >= 0.8 && noHint >= 0.75 && crit.avgScore >= 75) r = 5; // A
    if (r >= 5 && uniq >= 14 && crit.analysis >= 0.9 && crit.action >= 0.9 && noHint >= 0.85 && crit.avgScore >= 85) r = 6; // S
    var next = TradeEval.RANKS[Math.min(6, r + 1)];
    var need = r >= 6 ? [] : [[1, '3回以上の挑戦と平均40点以上'], [2, '5回以上の挑戦・異なる4場面で正解・判断5割・分析45%'], [3, '異なる6場面・上位足認識7割・分析6割'], [4, '異なる9場面・損切り/見送り7割・ヒントなし正解6割'], [5, '異なる12場面・分析8割・ヒントなし75%・平均75点'], [6, '異なる14場面・分析9割・ヒントなし85%・平均85点']].filter(function (x) { return x[0] === r + 1; }).map(function (x) { return x[1]; });
    return { index: r, letter: TradeEval.RANKS[r][0], title: TradeEval.RANKS[r][1], next: next, needText: need[0] || '', crit: crit };
  };

  root.TradeEval = TradeEval; root.Battle = TradeEval; // 旧名との互換
  if (typeof module !== 'undefined' && module.exports) module.exports = TradeEval;
})(typeof window !== 'undefined' ? window : globalThis);
