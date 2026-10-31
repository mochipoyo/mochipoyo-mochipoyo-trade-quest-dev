/* =========================================================
   RPG / Leverage（v6.4 Phase D）：相場都市トレディアの「レバレッジ取引ゲーム」の計算
   ・ゲーム専用の仮想資金「トレディアG（TG）」だけを使う。ゲームのゴールド・現実のお金・暗号資産・ポイントとの交換は一切ない
   ・値動きは既存の人工チャート生成（Scenarios._internal.buildCandles）で作る学習用データ。実在の相場ではない
   ・同じ「相場の種類＋シード」なら同じ値動き（シナリオID：LV-種類-シード）。取引履歴にシナリオIDを残す
   ・将来の足は、進めるまで画面にも計算にも出さない（session.bars の idx より後ろは UI に渡さない）
   ・取引条件（スプレッド・手数料・スリッページ・保有コスト・ロスカット）はこのゲームの架空の取引所のルール。実在の証券会社の共通ルールではない
   計算（概念式）
     必要証拠金 = 建玉想定元本 ÷ レバレッジ
     買いの損益 = 想定元本 ×（決済価格 − 約定価格）÷ 約定価格　／　売りの損益 = 想定元本 ×（約定価格 − 決済価格）÷ 約定価格
     （約定価格・決済価格はスプレッドとスリッページを含む価格。手数料と保有コストは別に引く）
     有効証拠金 = 残高 ＋ 含み損益 − 未払いのコスト　／　使用証拠金 = 必要証拠金　／　余剰証拠金 = 有効証拠金 − 使用証拠金
     証拠金維持率 = 有効証拠金 ÷ 使用証拠金 × 100%。維持率が RULES.losscutLevel% 以下になったら強制ロスカット
     価格が飛んだ（ギャップ）ときは、損切りやロスカットの価格ではなく、飛んだ先の価格で決済される（想定より損が大きくなる）
     残高はマイナスにしない（負債は作らない）。決済後の残高が0以下なら「破産」：取引を終え、残高0。学習用の資金を再び受け取れる
   ========================================================= */
(function (root) {
  'use strict';
  var LV = {};
  LV.RULES = {
    start: 100000,            // 最初の仮想資金（TG）
    losscutLevel: 50,         // 強制ロスカット：証拠金維持率がこの%以下
    warnLevel: 100,           // 注意：維持率がこの%以下
    spreadPips: 0.6,          // スプレッド（買値と売値の差）
    commissionRate: 0.00002,  // 取引手数料：想定元本の0.002%（新規・決済のそれぞれ）
    slippageMaxPips: 0.4,     // 成行・逆指値（損切り・ロスカット）のすべり：0〜0.4pips（不利な方向。シードで決まる）
    financingRate: 0.000003,  // 保有コスト：1本（15分）ごとに想定元本の0.0003%
    leverages: [1, 5, 10, 25, 50, 100, 200, 400, 500, 888], maxLeverage: 888,
    minNotional: 1000,
    pip: 0.01, basePrice: 150, histBars: 120, playBars: 64, factor: 3,   // 15分足（5分足3本）で表示。開始前に120本、取引中に64本
    historyMax: 200
  };
  LV.TYPES = [
    { id: 'up', name: '上昇トレンド', desc: '高値・安値を切り上げながら上がっていく相場' },
    { id: 'down', name: '下降トレンド', desc: '高値・安値を切り下げながら下がっていく相場' },
    { id: 'range', name: 'レンジ相場', desc: '一定の幅の中を上下する相場' },
    { id: 'surge', name: '急騰', desc: 'ある時点から短時間で大きく上がる相場' },
    { id: 'crash', name: '急落', desc: 'ある時点から短時間で大きく下がる相場' },
    { id: 'fakeout', name: 'ダマシのブレイク', desc: 'レンジを上に抜けたように見えて、すぐに戻ってくる相場' },
    { id: 'highvol', name: '高ボラティリティ', desc: '値動きの幅がとても大きい相場' },
    { id: 'lowvol', name: '低ボラティリティ', desc: '値動きの幅が小さい相場' },
    { id: 'gap', name: '重要イベントの価格ギャップ', desc: '途中で価格が飛ぶ（窓をあける）相場。損切りの価格で決済できないことがある' }
  ];
  LV.typeName = function (id) { var t = LV.TYPES.filter(function (x) { return x.id === id; })[0]; return t ? t.name : id; };

  function mulberry32(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  LV.rng = mulberry32;
  function r3(v) { return Math.round(v * 1000) / 1000; }
  function money(v) { return Math.round(v); }

  // 相場の設計図（5分足の本数・ドリフト[pips]・波・ノイズ）。過去 360本＋将来 192本
  function segs(type, rnd) {
    var S = function (bars, drift, amp, period, noise) { return { bars: bars, drift: drift, wave: amp ? { amp: amp, period: period } : null, noise: noise }; };
    var sgn = rnd() < 0.5 ? 1 : -1;
    switch (type) {
      case 'up': return { hist: [S(240, 50, 22, 60, 2.2), S(120, 35, 18, 45, 2.2)], fut: [S(192, 80, 20, 45, 2.2)] };
      case 'down': return { hist: [S(240, -50, 22, 60, 2.2), S(120, -35, 18, 45, 2.2)], fut: [S(192, -80, 20, 45, 2.2)] };
      case 'range': return { hist: [S(360, 0, 38, 70, 2.0)], fut: [S(192, 0, 34, 60, 2.0)] };
      case 'surge': return { hist: [S(360, 10, 25, 60, 2.0)], fut: [S(54, 5, 15, 40, 2.0), S(18, 140, 0, 0, 4.0), S(120, 15, 25, 50, 2.6)] };
      case 'crash': return { hist: [S(360, -10, 25, 60, 2.0)], fut: [S(54, -5, 15, 40, 2.0), S(18, -140, 0, 0, 4.0), S(120, -15, 25, 50, 2.6)] };
      case 'fakeout': return { hist: [S(360, 0, 30, 70, 1.8)], fut: [S(24, 45, 0, 0, 2.4), S(30, -85, 0, 0, 2.6), S(138, -15, 20, 50, 2.0)] };
      case 'highvol': return { hist: [S(360, 20 * sgn, 60, 50, 6.0)], fut: [S(192, 30 * sgn, 60, 45, 6.5)] };
      case 'lowvol': return { hist: [S(360, 6 * sgn, 7, 60, 0.7)], fut: [S(192, 8 * sgn, 7, 50, 0.7)] };
      case 'gap': return { hist: [S(360, 25 * sgn, 22, 60, 2.2)], fut: [S(192, 10 * sgn, 22, 50, 2.2)] };
    }
    return { hist: [S(360, 0, 30, 60, 2.0)], fut: [S(192, 0, 30, 60, 2.0)] };
  }
  LV.scenarioId = function (type, seed) { return 'LV-' + type + '-' + seed; };
  LV.parseScenarioId = function (id) { var m = /^LV-([a-z]+)-(\d+)$/.exec(id || ''); return m ? { type: m[1], seed: +m[2] } : null; };
  // 値動きを作る（同じ type・seed なら必ず同じ）。返り値の bars は15分足（過去 histBars 本＋将来 playBars 本）
  LV.market = function (type, seed) {
    var R = LV.RULES; seed = (seed >>> 0) || 1;
    var rnd = mulberry32(seed ^ 0x5bd1e995); var sg = segs(type, rnd);
    var I = root.Scenarios && root.Scenarios._internal; var IND = root.Indicators;
    var m5 = I.buildCandles(sg.hist.concat(sg.fut), seed, R.basePrice, R.pip);
    var bars = IND.aggregate(m5, R.factor).map(function (c, i) { return { o: c.o, h: c.h, l: c.l, c: c.c, t: i }; });
    bars = bars.slice(0, R.histBars + R.playBars);
    var gap = null;
    if (type === 'gap') {   // 将来の 16〜30 本目のどこかで、80〜160pips 価格が飛ぶ
      var at = R.histBars + 16 + Math.floor(rnd() * 15); var size = (80 + Math.floor(rnd() * 81)) * (rnd() < 0.5 ? 1 : -1) * R.pip;
      for (var i = at; i < bars.length; i++) { var b = bars[i]; b.o = r3(b.o + size); b.h = r3(b.h + size); b.l = r3(b.l + size); b.c = r3(b.c + size); }
      gap = { bar: at, size: r3(size) };
    }
    return { id: LV.scenarioId(type, seed), type: type, seed: seed, bars: bars, start: R.histBars - 1, gap: gap };
  };

  /* ---------- 口座 ---------- */
  LV.blank = function () { return { balance: LV.RULES.start, epoch: 1, grants: 1, bankrupt: 0, history: [], seq: 0, peak: LV.RULES.start, maxDD: 0 }; };
  LV.account = function () { var d = root.State.data; d.tradia = d.tradia || {}; if (!d.tradia.lev) d.tradia.lev = LV.blank(); return d.tradia.lev; };
  // 破産後（または残高が最低取引額を下回ったとき）に、学習用の資金を受け取り直す（新しい口座の番号 epoch を進める）
  LV.regrant = function () { var a = LV.account(); a.balance = LV.RULES.start; a.epoch += 1; a.grants += 1; a.peak = a.balance; a.maxDD = 0; return a; };
  LV.canRegrant = function () { var a = LV.account(); return a.balance < LV.RULES.start * 0.1; };   // 破産したか、残高が最初の10%未満になったら受け取り直せる

  /* ---------- 取引の場（セッション） ---------- */
  LV.newSession = function (type, seed) {
    var a = LV.account(); var mk = LV.market(type, seed);
    return { scenarioId: mk.id, type: type, seed: mk.seed, market: mk, idx: mk.start, pos: null, pending: null, ended: false, endReason: null, log: [], slipRnd: mulberry32((mk.seed * 2654435761) >>> 0), startBalance: a.balance };
  };
  LV.visibleBars = function (s) { return s.market.bars.slice(0, s.idx + 1); };   // 画面に出してよいのは現在の足まで
  LV.price = function (s) { return s.market.bars[s.idx].c; };
  LV.remaining = function (s) { return s.market.bars.length - 1 - s.idx; };
  function half() { return LV.RULES.spreadPips * LV.RULES.pip / 2; }
  function slip(s) { return s.slipRnd() * LV.RULES.slippageMaxPips * LV.RULES.pip; }
  // その価格（仲値）で決済したときの損益（スプレッド込み。手数料・保有コストは含まない）
  LV.pnlAt = function (pos, mid) { var exit = pos.side === 'buy' ? mid - half() : mid + half(); return pos.side === 'buy' ? pos.notional * (exit - pos.entry) / pos.entry : pos.notional * (pos.entry - exit) / pos.entry; };
  LV.costsOpen = function (pos) { return pos.commission + pos.financing; };
  // 口座の状態（有効証拠金・使用証拠金・余剰証拠金・維持率・含み損益）
  LV.status = function (s, mid) {
    var a = LV.account(); var pos = s && s.pos; if (mid === undefined && s) mid = LV.price(s);
    var upl = pos ? LV.pnlAt(pos, mid) - LV.costsOpen(pos) : 0; var used = pos ? pos.margin : 0; var eq = a.balance + upl;
    return { balance: a.balance, unrealized: upl, equity: eq, used: used, free: eq - used, level: used > 0 ? eq / used * 100 : null };
  };
  // 維持率がロスカット水準になる仲値（その価格まで逆行するとロスカット）
  LV.losscutPrice = function (pos, balance) {
    var R = LV.RULES; var target = pos.margin * R.losscutLevel / 100 - balance + LV.costsOpen(pos);   // 損益がこの値以下でロスカット
    if (pos.side === 'buy') return r3(pos.entry * (1 + target / pos.notional) + half());
    return r3(pos.entry * (1 - target / pos.notional) - half());
  };
  // 注文の確認（画面に出す数字と警告）。order = { side, leverage, notional, entry(null=成行), sl, tp }
  LV.preview = function (s, order) {
    var R = LV.RULES; var a = LV.account(); var mid = LV.price(s); var errs = [], warns = [];
    var lev = Math.round(+order.leverage); if (!(lev >= 1 && lev <= R.maxLeverage)) errs.push('レバレッジは1〜' + R.maxLeverage + '倍');
    var notional = Math.round(+order.notional); if (!(notional >= R.minNotional)) errs.push('建玉の想定元本は ' + R.minNotional.toLocaleString() + 'TG 以上');
    var side = order.side === 'sell' ? 'sell' : 'buy';
    var market = order.entry === null || order.entry === undefined || order.entry === '' || isNaN(+order.entry);
    var ref = market ? (side === 'buy' ? mid + half() : mid - half()) : +order.entry;
    var margin = lev >= 1 ? notional / lev : Infinity; var commission = notional * R.commissionRate;
    if (margin > a.balance - commission) errs.push('必要証拠金（' + money(margin).toLocaleString() + 'TG）が残高を超えている');
    var sl = order.sl === null || order.sl === undefined || order.sl === '' || isNaN(+order.sl) ? null : +order.sl;
    var tp = order.tp === null || order.tp === undefined || order.tp === '' || isNaN(+order.tp) ? null : +order.tp;
    if (sl !== null && (side === 'buy' ? sl >= ref : sl <= ref)) errs.push('損切りは' + (side === 'buy' ? '約定価格より下' : '約定価格より上') + 'に置く');
    if (tp !== null && (side === 'buy' ? tp <= ref : tp >= ref)) errs.push('利確は' + (side === 'buy' ? '約定価格より上' : '約定価格より下') + 'に置く');
    var pos = { side: side, entry: ref, notional: notional, margin: margin, commission: commission, financing: 0 };
    var lc = isFinite(margin) ? LV.losscutPrice(pos, a.balance) : null;
    var lcPips = lc !== null ? Math.abs(ref - lc) / R.pip : null; var lcPct = lc !== null ? Math.abs(ref - lc) / ref * 100 : null;
    var eq0 = a.balance - commission - (notional * R.spreadPips * R.pip / ref); var level0 = margin > 0 ? eq0 / margin * 100 : null;
    var slLoss = sl !== null ? notional * Math.abs(ref - sl) / ref + notional * half() / ref + commission * 2 : null;
    var slPct = slLoss !== null ? slLoss / a.balance * 100 : null;
    var slBeyondLc = sl !== null && lc !== null && (side === 'buy' ? sl <= lc : sl >= lc);
    var rr = (sl !== null && tp !== null) ? Math.abs(tp - ref) / Math.abs(ref - sl) : null;
    if (sl === null) warns.push('損切りが設定されていない。逆行すると、ロスカットか破産まで損失が膨らむ');
    else if (slBeyondLc) warns.push('損切りがロスカットの価格より遠い。損切りより先にロスカットされる');
    if (slPct !== null && slPct > 2) warns.push('損切りに当たったときの損失が残高の' + slPct.toFixed(1) + '%（目安の2%を超える）');
    if (lev >= 100) warns.push('高レバレッジ（' + lev + '倍）：約' + (lcPips !== null ? lcPips.toFixed(1) : '―') + 'pips（' + (lcPct !== null ? lcPct.toFixed(3) : '―') + '%）の逆行で強制ロスカット');
    if (level0 !== null && level0 < 300) warns.push('取引直後の証拠金維持率が約' + Math.round(level0) + '%。少しの逆行でロスカット水準（' + R.losscutLevel + '%）に近づく');
    if (rr !== null && rr < 1) warns.push('リスクリワードが1未満（1:' + rr.toFixed(2) + '）');
    return { ok: !errs.length, errs: errs, warns: warns, side: side, market: market, entry: r3(ref), leverage: lev, notional: notional, margin: margin, commission: commission, losscut: lc, losscutPips: lcPips, losscutPct: lcPct, levelAtEntry: level0, sl: sl, tp: tp, slLoss: slLoss, slPct: slPct, rr: rr, spreadCost: notional * R.spreadPips * R.pip / ref };
  };
  // 注文を出す（成行はこの足の終値で約定。指値・逆指値は次の足以降で価格に触れたら約定）
  LV.place = function (s, order) {
    if (s.ended || s.pos || s.pending) return { ok: false, errs: ['いまは新しい注文を出せない'] };
    var pv = LV.preview(s, order); if (!pv.ok) return pv;
    if (pv.market) open(s, pv, LV.price(s), 'market'); else s.pending = { side: pv.side, leverage: pv.leverage, notional: pv.notional, entry: pv.entry, sl: pv.sl, tp: pv.tp, placedIdx: s.idx, warns: pv.warns };
    return pv;
  };
  LV.cancelPending = function (s) { if (s.pending) { s.log.push({ idx: s.idx, msg: '待機中の注文を取り消した' }); s.pending = null; } };
  function open(s, pv, fillMid, how) {
    var R = LV.RULES; var a = LV.account(); var sl = how === 'market' ? slip(s) : 0;
    var entry = how === 'market' ? (pv.side === 'buy' ? fillMid + half() + sl : fillMid - half() - sl) : pv.entry;
    var margin = pv.notional / pv.leverage;
    s.pos = { side: pv.side, leverage: pv.leverage, notional: pv.notional, entry: r3(entry), sl: pv.sl, tp: pv.tp, margin: margin, commission: pv.notional * R.commissionRate, financing: 0, openIdx: s.idx, mae: 0, maxLevelDrop: null, warns: (pv.warns || []).slice(), how: how, balanceAtOpen: a.balance, slippage: Math.abs(sl) };
    s.log.push({ idx: s.idx, msg: (pv.side === 'buy' ? '買い' : '売り') + ' ' + pv.notional.toLocaleString() + 'TG（' + pv.leverage + '倍）を ' + s.pos.entry.toFixed(3) + ' で約定' });
  }
  // 決済。reason：tp / sl / sl_gap / losscut / losscut_gap / manual / time
  function close(s, exitMid, reason, exitPrice) {
    var R = LV.RULES; var a = LV.account(); var pos = s.pos;
    var px = exitPrice !== undefined ? exitPrice : (pos.side === 'buy' ? exitMid - half() : exitMid + half());
    var gross = pos.side === 'buy' ? pos.notional * (px - pos.entry) / pos.entry : pos.notional * (pos.entry - px) / pos.entry;
    var commission = pos.commission + pos.notional * R.commissionRate; var costs = commission + pos.financing; var pnl = gross - costs;
    var before = a.balance; var after = before + pnl; var bankrupt = after <= 0;
    if (bankrupt) after = 0;   // 負債は作らない（残高0で破産）
    a.balance = money(after); var realized = a.balance - before;
    if (a.balance > a.peak) a.peak = a.balance; var dd = a.peak > 0 ? (a.peak - a.balance) / a.peak : 0; if (dd > a.maxDD) a.maxDD = dd;
    a.seq += 1;
    var slLoss = pos.sl !== null ? pos.notional * Math.abs(pos.entry - pos.sl) / pos.entry : null;
    var rec = { n: a.seq, epoch: a.epoch, scenarioId: s.scenarioId, type: s.type, seed: s.seed, side: pos.side, leverage: pos.leverage, notional: pos.notional, entry: pos.entry, exit: r3(px), sl: pos.sl, tp: pos.tp,
      pnl: money(realized), gross: money(gross), costs: money(costs), commission: money(commission), financing: money(pos.financing), spreadPips: R.spreadPips, slippage: r3(pos.slippage / R.pip),
      reason: reason, bars: s.idx - pos.openIdx, mae: money(pos.mae), balanceBefore: before, balanceAfter: a.balance, riskPct: slLoss !== null ? +(slLoss / pos.balanceAtOpen * 100).toFixed(2) : null, warns: pos.warns, bankrupt: bankrupt, at: Date.now() };
    a.history.push(rec); if (a.history.length > R.historyMax) a.history.splice(0, a.history.length - R.historyMax);
    s.pos = null; s.lastTrade = rec;
    s.log.push({ idx: s.idx, msg: ({ tp: '利確', sl: '損切り', sl_gap: '価格が飛んで損切り（損切りの価格より不利）', losscut: '強制ロスカット', losscut_gap: '価格が飛んで強制ロスカット（ロスカットの価格より不利）', manual: '手動で決済', time: '時間切れで決済' })[reason] + '：' + (rec.pnl >= 0 ? '+' : '') + rec.pnl.toLocaleString() + 'TG' });
    if (bankrupt) { a.bankrupt += 1; s.ended = true; s.endReason = 'bankrupt'; s.log.push({ idx: s.idx, msg: '残高が0になった：破産。取引を終了する' }); }
    else if (a.balance < 10) { s.ended = true; s.endReason = 'nofunds'; }
    return rec;
  }
  LV.closeNow = function (s) { if (!s.pos || s.ended) return null; return close(s, LV.price(s), 'manual'); };
  // 1本進める（将来の足を1本だけ見せる）。戻り値：この足で起きたこと
  LV.step = function (s) {
    var R = LV.RULES; if (s.ended) return { ended: true };
    if (s.idx >= s.market.bars.length - 1) { if (s.pos) close(s, LV.price(s), 'time'); s.ended = true; s.endReason = s.endReason || 'end'; return { ended: true }; }
    s.idx += 1; var c = s.market.bars[s.idx]; var ev = { idx: s.idx, events: [] };
    var gapNow = s.market.gap && s.market.gap.bar === s.idx; if (gapNow) ev.events.push('gap');
    // 待機中の注文
    if (s.pending) { var o = s.pending; var buyLimit = o.side === 'buy' && o.entry < s.market.bars[o.placedIdx].c, sellLimit = o.side === 'sell' && o.entry > s.market.bars[o.placedIdx].c;
      var touched = c.l <= o.entry + (o.side === 'buy' ? -half() : half()) && c.h >= o.entry + (o.side === 'buy' ? -half() : half());
      var gapped = o.side === 'buy' ? (buyLimit ? c.o + half() <= o.entry : c.o + half() >= o.entry) : (sellLimit ? c.o - half() >= o.entry : c.o - half() <= o.entry);
      if (touched || gapped) { var px = gapped ? (o.side === 'buy' ? c.o + half() : c.o - half()) : o.entry; s.pending = null; open(s, { side: o.side, leverage: o.leverage, notional: o.notional, entry: r3(px), sl: o.sl, tp: o.tp, warns: o.warns }, null, 'limit'); s.pos.openIdx = s.idx; ev.events.push('filled'); return finishBar(s, c, ev, true); } }
    return finishBar(s, c, ev, false);
  };
  function finishBar(s, c, ev, justOpened) {
    var R = LV.RULES; var a = LV.account(); var pos = s.pos;
    if (pos && !justOpened) {
      var lc = LV.losscutPrice(pos, a.balance); var buy = pos.side === 'buy';
      // 足の始値で、すでに損切り・ロスカットを越えていたら（ギャップ）、始値で決済
      var openBid = c.o - half(), openAsk = c.o + half(); var advOpen = buy ? openBid : openAsk;
      var beyond = function (lvl, p) { return buy ? p <= lvl : p >= lvl; };
      if (beyond(lc, buy ? c.o : c.o) && (pos.sl === null || (buy ? lc >= pos.sl : lc <= pos.sl))) { trackMae(pos, advOpen); ev.events.push('losscut'); close(s, c.o, 'losscut_gap', advOpen); return endCheck(s, ev); }
      if (pos.sl !== null && beyond(pos.sl, advOpen)) { trackMae(pos, advOpen); ev.events.push('sl'); close(s, c.o, 'sl_gap', advOpen); return endCheck(s, ev); }
      // 足の中：不利な方向の端を先に見る（保守的）
      var adv = buy ? c.l - half() : c.h + half(); trackMae(pos, adv);
      var slHit = pos.sl !== null && beyond(pos.sl, adv); var lcHit = beyond(lc, buy ? c.l : c.h);
      if (slHit || lcHit) {
        var slFirst = slHit && (!lcHit || (buy ? pos.sl >= lc : pos.sl <= lc));
        var sp = slip(s);
        if (slFirst) { ev.events.push('sl'); close(s, null, 'sl', r3(buy ? pos.sl - sp : pos.sl + sp)); }
        else { ev.events.push('losscut'); var lcFill = buy ? lc - half() - sp : lc + half() + sp; close(s, null, 'losscut', r3(lcFill)); }
        return endCheck(s, ev);
      }
      var fav = buy ? c.h - half() : c.l + half();
      if (pos.tp !== null && (buy ? fav >= pos.tp : fav <= pos.tp)) { ev.events.push('tp'); close(s, null, 'tp', pos.tp); return endCheck(s, ev); }
    }
    if (s.pos) { s.pos.financing += s.pos.notional * R.financingRate; var st = LV.status(s, c.c); if (st.level !== null && st.level <= R.warnLevel) ev.events.push('warn'); }
    if (s.idx >= s.market.bars.length - 1) { if (s.pos) { close(s, c.c, 'time'); ev.events.push('time'); } s.ended = true; s.endReason = s.endReason || 'end'; }
    return endCheck(s, ev);
  }
  function trackMae(pos, advPrice) { var u = (pos.side === 'buy' ? pos.notional * (advPrice - pos.entry) / pos.entry : pos.notional * (pos.entry - advPrice) / pos.entry) - LV.costsOpen(pos); if (u < pos.mae) pos.mae = u; }
  function endCheck(s, ev) { ev.ended = s.ended; ev.endReason = s.endReason; ev.trade = s.lastTrade && s.lastTrade.n && ev.events.some(function (e) { return e === 'tp' || e === 'sl' || e === 'losscut' || e === 'time'; }) ? s.lastTrade : null; return ev; }
  LV.endSession = function (s) { if (s.ended) return; if (s.pos) close(s, LV.price(s), 'manual'); s.pending = null; s.ended = true; s.endReason = s.endReason || 'quit'; };

  /* ---------- 成績（データが足りない指標は null ＝「算出不可」） ---------- */
  LV.MIN_TRADES = 5;
  LV.stats = function (list) {
    var R = LV.RULES; var n = list.length; var wins = list.filter(function (t) { return t.pnl > 0; }), losses = list.filter(function (t) { return t.pnl < 0; });
    var gp = wins.reduce(function (s, t) { return s + t.pnl; }, 0), gl = -losses.reduce(function (s, t) { return s + t.pnl; }, 0); var total = list.reduce(function (s, t) { return s + t.pnl; }, 0);
    var enough = n >= LV.MIN_TRADES;
    // 最大ドローダウン：取引ごとの残高の推移から（口座が変わったら山をリセット）
    var peak = null, ep = null, mdd = null; list.forEach(function (t) { if (t.epoch !== ep) { ep = t.epoch; peak = t.balanceBefore; } if (t.balanceBefore > peak) peak = t.balanceBefore; var dd = peak > 0 ? Math.max(0, (peak - t.balanceAfter) / peak) : 0; if (mdd === null || dd > mdd) mdd = dd; if (t.balanceAfter > peak) peak = t.balanceAfter; });
    var avgW = wins.length ? gp / wins.length : null, avgL = losses.length ? gl / losses.length : null;
    return { trades: n, wins: wins.length, losses: losses.length, pnl: n ? total : null, pnlPct: n ? total / R.start * 100 : null,
      maxAdverse: n ? Math.min.apply(null, list.map(function (t) { return t.mae; })) : null, maxDD: mdd,
      winRate: enough ? wins.length / n * 100 : null, avgWin: avgW, avgLoss: avgL, rr: (enough && avgW !== null && avgL !== null && avgL > 0) ? avgW / avgL : null,
      expectancy: enough ? total / n : null, pf: (enough && gl > 0) ? gp / gl : null, bankrupt: LV.account().bankrupt, losscuts: list.filter(function (t) { return /losscut/.test(t.reason); }).length, gaps: list.filter(function (t) { return /_gap$/.test(t.reason); }).length };
  };
  LV.fmtStat = function (v, kind) { if (v === null || v === undefined || (typeof v === 'number' && !isFinite(v))) return '算出不可'; if (kind === 'pct') return v.toFixed(1) + '%'; if (kind === 'ratio') return v.toFixed(2); if (kind === 'tg') return (v >= 0 ? '+' : '') + Math.round(v).toLocaleString() + 'TG'; if (kind === 'dd') return (v * 100).toFixed(1) + '%'; return String(v); };
  // 1回の取引の振り返り（教育用。高レバレッジに加点はしない）
  LV.reflect = function (t) {
    var R = LV.RULES; var out = [];
    if (t.bankrupt) out.push('破産：損失が残高を上回った。このゲームでは残高0で止まるが、「残高を超える損」が起こりうる取引だったということ');
    if (/_gap$/.test(t.reason)) out.push('価格が飛んだ（ギャップ）ため、' + (t.reason === 'sl_gap' ? '損切り' : 'ロスカット') + 'の価格より不利な ' + t.exit.toFixed(3) + ' で決済された。損切りは「その価格で必ず止まる」約束ではない');
    if (/losscut/.test(t.reason)) out.push('強制ロスカット：証拠金維持率が' + R.losscutLevel + '%を下回った。' + (t.sl === null ? '損切りを決めていなかった' : '損切りよりロスカットの価格のほうが近かった') + '。レバレッジと建玉の大きさを見直そう');
    if (t.sl === null) out.push('損切りなし：どこで間違いを認めるかを決めずに入った');
    if (t.leverage >= 100) out.push(t.leverage + '倍：レバレッジが高いほど、同じ値動きで残高が大きく増減する。このゲームでは高レバレッジに得点やボーナスはない');
    if (t.riskPct !== null && t.riskPct > 2) out.push('損切りに当たったときの損失が残高の' + t.riskPct + '%：目安の2%を超えていた');
    if (!out.length) out.push(t.pnl >= 0 ? '損切りを決め、残高に対する損失を目安の範囲に抑えた取引。結果の損益より、この手順を続けられるかが大事' : '負けたが、損切りを決めて目安の範囲で止めた取引。負けを小さく止めるのも手順どおりの結果');
    out.push('コスト：手数料 ' + t.commission + 'TG・保有コスト ' + t.financing + 'TG（スプレッド ' + t.spreadPips + 'pips とすべり ' + t.slippage + 'pips は約定価格に含まれる）');
    return out;
  };

  root.Leverage = LV;
})(typeof window !== 'undefined' ? window : globalThis);
