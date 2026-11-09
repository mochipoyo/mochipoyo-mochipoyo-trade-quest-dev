/* =========================================================
   Trainer91（v9.1 実践学習の追加 A〜D の計算。DOM に依存しない）
   A 同じ相場・3判断比較（cmp3）：同じ seed・同じ歴史・同じ未来・同じコストで、3 つの独立した分岐（ポジション・資金・記録を共有しない）
       A＝RCI の反転などの条件を待たずに いま入る計画／B＝条件（推奨仮設定の evaluateEntry）がそろった最初の確定足で入る計画／C＝最後まで見送る計画
       3 つの計画を同時に登録してから結果を出す（公平な比較）。2 回目以降の再生は「反実仮想の復習」で、初見の成績に入れない
   B 思い込みを見抜く（spot）：NPC の解説（主張）のうち、判断の時点（asOf）のチャートの事実・数値と矛盾するものを選ぶ。主張の真偽は asOf の事実だけで決める
   C 30連敗でも生き残る（survival）：複利（残高の r%）なら final＝initial×(1−r)^n。固定額・マーチンゲール・勝ったときだけ増やす を同じ並びで比べる（仮想口座）
   D 初見チャートの認定試験 v2（exam）：生成系列 B（学習用 A と別のパターン群）・30 問で seed／指紋（checksum）を二度出さない・群（familyId）ごとの上限・
       中断と再開でも重複なし・多面的な評価・「判定保留」の条件・試験の版
   ・どれも架空の相場・仮想の資金。ゲームのお金・報酬は使わず、出さない
   ========================================================= */
(function (root) {
  'use strict';
  var T = { VERSION: 1, EXAM_VERSION: 2 };
  function PE() { return root.PracticeEngine; } function SPF() { return root.StrategyProfiles; } function TC() { return root.TradeCore; } function PS() { return root.PositionEngine; }
  function r1(v) { return Math.round(v * 10) / 10; } function r2(v) { return Math.round(v * 100) / 100; } function r3(v) { return Math.round(v * 1000) / 1000; }

  /* ================= A 同じ相場・3判断比較 ================= */
  T.CMP3_CATS = ['early', 'ema_no_rci', 'rci_touch', 'similar', 'hidden_aligned', 'regdiv_vs_htf'];
  T.CMP3_CAPITAL = 1000000;   // 比べるための仮想資金（道場の資金とは別。どの分岐も同じ資金から）
  // 注文を作る（その時点の事実だけ）：損切り＝確定した山谷の外側（＋余裕）。山谷がない・近すぎるときは ATR×1.5。利確＝RR の倍数
  T.makeOrder = function (sn, side, rr, prof, pip) {
    var e = sn.entry; if (!e || e.insufficient) return { ok: false, why: '足が足りない' }; var px = sn.price; var sg = side === 'buy' ? 1 : -1; var half = TC().COSTS.spreadPips * pip / 2; var fill = px + sg * half;
    var ref = side === 'buy' ? e.swing.low : e.swing.high; var buf = prof.slBufferPips * pip; var sl = ref !== null && ref !== undefined ? ref - sg * buf : null;
    if (sl === null || sg * (fill - sl) < 3 * pip) sl = fill - sg * 1.5 * e.atr; sl = r3(sl); var risk = sg * (fill - sl); var tp = r3(fill + sg * rr * risk);
    return { ok: true, side: side, mid: px, sl: sl, tp: tp, ref: ref };
  };
  function branchResult(g, asOf, side, rr, prof, cap, riskPct, tf, hold) {
    var sn = PE().snapshot(g, asOf, tf); sn.pip0 = g.pip; var o = T.makeOrder(sn, side, rr, prof, g.pip); if (!o.ok) return { kind: 'none', why: o.why };
    var v = TC().validateOrder({ side: side, entry: o.mid + (side === 'buy' ? 1 : -1) * TC().COSTS.spreadPips * g.pip / 2, sl: o.sl, tp: o.tp }); if (!v.ok) return { kind: 'none', why: TC().errorText(v) };
    var lossPips = v.riskPips + TC().COSTS.entrySlipPips + TC().COSTS.stopSlipPips; var sz = TC().sizePosition({ capital: cap, riskPercent: riskPct, riskPips: lossPips }); if (!sz.ok) return { kind: 'none', why: TC().errorText(sz) };
    var pos = PS().replay(g.base, { side: side, entryMid: o.mid, sl: o.sl, tp: o.tp, lots: sz.lots, entryIndex: asOf, maxBars: hold }, []); var st = PS().summary(pos);
    var ch = SPF().evaluateEntry(sn, side, prof);
    return { kind: 'trade', atMin: (asOf - g.S) * 5, asOf: asOf, side: side, entry: st.entryPrice, sl: o.sl, tp: o.tp, slPips: r1(v.riskPips), tpPips: r1(v.rewardPips), rr: v.rr, lots: sz.lots, estLoss: Math.round(sz.actualRisk),
      netPips: st.netPips, R: st.riskR, pnlYen: st.pnlYenAfterCommission, mfePips: st.mfePips, maePips: st.maePips, worstOpenYen: st.worstOpenYen, reason: st.reason, ambiguous: st.ambiguous, exitMin: (st.exitIndex - g.S) * 5,
      met: ch.met, evidence: ch.evidence.map(function (x) { return { label: x.label, ok: x.ok, detail: x.detail }; }), missing: ch.missing.concat(ch.blockers.map(function (b) { return b.msg; })) };
  }
  // plans：{ side, entryTF, rrA, rrB, whyC, riskPercent }。3 つの分岐を別々に計算する（ほかの分岐の結果・状態を使わない）
  T.cmp3Run = function (seed, plans, opts) {
    opts = opts || {}; var g = PE().generate(seed, { gen: opts.gen }); var prof = SPF().values(opts.profile || 'mochipoyo', opts.overrides); var tf = plans.entryTF === '5m' ? '5m' : '15m'; var side = plans.side === 'sell' ? 'sell' : 'buy';
    var cap = T.CMP3_CAPITAL, rp = isFinite(plans.riskPercent) && plans.riskPercent > 0 && plans.riskPercent <= 5 ? plans.riskPercent : 1; var hold = PE().HOLD_MIN / 5, wait = PE().WAIT_MIN / 5, step = PE().tfMin(tf) / 5;
    var A = branchResult(g, g.S, side, plans.rrA || 2, prof, cap, rp, tf, hold); A.key = 'A'; A.label = 'A：いま入る（RCI の反転などの条件を待たない）';
    var B = null; for (var a = g.S; a <= g.S + wait && a < g.base.length - 1; a += step) { var sn = PE().snapshot(g, a, tf); sn.pip0 = g.pip; if (sn.entry && !sn.entry.insufficient && SPF().evaluateEntry(sn, side, prof).met) { B = branchResult(g, a, side, plans.rrB || 2, prof, cap, rp, tf, hold); break; } }
    if (!B) B = { kind: 'none', why: '待てる ' + PE().WAIT_MIN + '分のあいだ、条件がそろった確定足がなかった（入らずに終わった）', atMin: PE().WAIT_MIN };
    B.key = 'B'; B.label = 'B：条件（RCI の反転など・推奨仮設定）がそろってから入る';
    var endI = Math.min(g.base.length - 1, g.S + wait); var mv = (side === 'buy' ? 1 : -1) * (g.base[endI].c - g.base[g.S].c) / g.pip;
    var C = { key: 'C', label: 'C：最後まで見送る', kind: 'skip', why: plans.whyC || null, atMin: 0, R: 0, netPips: 0, afterPips: r1(mv), afterMin: (endI - g.S) * 5 };
    [A, B].forEach(function (x) { x.lucky = x.kind === 'trade' && !x.met && x.R > 0; x.unlucky = x.kind === 'trade' && x.met && x.R < 0; });
    return { seed: seed >>> 0, gen: g.gen, familyId: g.familyId, checksum: PE().checksum(g), side: side, entryTF: tf, riskPercent: rp, capital: cap, branches: [A, B, C], fair: true, engineVersion: PE().ENGINE_VERSION };
  };

  /* ================= B 思い込みを見抜く ================= */
  // 主張：{ id, type（1〜8・ほか）, text, truth（正しい主張なら true）, evidence（どの足・どの指標・その値）, explain（正しい解釈） }。真偽は asOf の事実（snapshot）だけで決める
  T.SPOT_TYPES = { 1: '上位足の向きと一致か', 2: 'RCI の±70 到達と反転', 3: '通常／ヒドゥンのダイバージェンス', 4: '山谷の確定・未確定', 5: '損切りの幅と口座のリスク', 6: '過去の成績と保証', 7: '見送りの評価', 8: '未来の断定', 9: 'EMA の並び' };
  var JA = { up: '上昇', down: '下降', range: 'レンジ・不明瞭' };
  T.spotClaims = function (seed, opts) {
    opts = opts || {}; var g = PE().generate(seed, { gen: opts.gen }); var asOf = g.S + (opts.offset || 0); var tf = opts.entryTF || g.entryTF; var sn = PE().snapshot(g, asOf, tf); sn.pip0 = g.pip; var e = sn.entry; if (!e || e.insufficient) return null;
    var prof = SPF().values('mochipoyo'); var R = root.Scenarios._internal.mulberry32(((seed >>> 0) ^ 0x7f4a7c15) >>> 0); var pickBool = function () { return R() < 0.5; }; var out = []; var tfj = PE().tfLabel(tf);
    var h4 = sn.htf['4h'], d1 = sn.htf['1d']; var hd = h4 && !h4.insufficient && (h4.dir === 'up' || h4.dir === 'down') ? h4.dir : null;
    // 1 上位足：その向きのエントリーが上位足（4時間足）と同じか
    if (hd) { var wantTrue = pickBool(); var side = wantTrue ? (hd === 'up' ? 'buy' : 'sell') : (hd === 'up' ? 'sell' : 'buy'); var same = (side === 'buy' ? 'up' : 'down') === hd;
      out.push({ type: 1, text: 'ここで' + (side === 'buy' ? 'ロング' : 'ショート') + 'するのは、4時間足の向きと同じ（順張り）だ。', truth: same, evidence: { tf: '4h', what: '4時間足の向き', value: JA[hd] + '（' + h4.basis + '）' }, explain: '4時間足は' + JA[hd] + '。' + (side === 'buy' ? 'ロング' : 'ショート') + 'は' + (same ? '同じ向き' : '逆の向き') + '。' }); }
    // 2 RCI：±70 の到達と、確認済みの反転
    var rc = e.rci; if (rc) {
      if (rc.zone && !rc.signal) out.push({ type: 2, text: 'RCI が' + (rc.zone === 'overbought' ? '+70' : '−70') + 'に届いたので、' + (rc.zone === 'overbought' ? '下' : '上') + '向きの反転はもう確定した。', truth: false, evidence: { tf: tf, what: 'RCI(9)', value: Math.round(rc.value) + '・' + (root.SignalEngine.RCI_STATE_LABEL[rc.state] || rc.state) }, explain: '±70 に届いた「だけ」で、反転は確認できていない（状態：' + (root.SignalEngine.RCI_STATE_LABEL[rc.state] || rc.state) + '）。水準と反転は別。' });
      else if (rc.signal) out.push({ type: 2, text: 'RCI は' + (rc.signal === 'up' ? '−70圏から上' : '+70圏から下') + '向きに反転したことが、確定した足で確認できる。', truth: true, evidence: { tf: tf, what: 'RCI(9)', value: Math.round(rc.value) + '・' + (root.SignalEngine.RCI_STATE_LABEL[rc.state] || rc.state) }, explain: '確認済みの反転（継続中）。' });
      else if (rc.state === 'neutral' && !rc.reversal && Math.abs(rc.value) < 70) out.push({ type: 2, text: 'RCI は' + (rc.value >= 0 ? '+70' : '−70') + 'に届いて反転した。', truth: false, evidence: { tf: tf, what: 'RCI(9)', value: Math.round(rc.value) + '・' + (root.SignalEngine.RCI_STATE_LABEL[rc.state] || rc.state) }, explain: 'いまの RCI は ' + Math.round(rc.value) + '。±70 圏からの確認済みの反転はない。' }); }
    // 3 ダイバージェンスの種類
    var conf = (e.divSignals || []).filter(function (x) { return x.status === 'confirmed'; });
    if (conf.length) { var dv = conf[conf.length - 1]; var swap = { regular_bull: 'hidden_bull', hidden_bull: 'regular_bull', regular_bear: 'hidden_bear', hidden_bear: 'regular_bear' }; var t3 = pickBool(); var said = t3 ? dv.type : swap[dv.type];
      out.push({ type: 3, text: 'いま出ているのは「' + root.SignalEngine.DIV_LABEL[said] + '」だ。', truth: said === dv.type, evidence: { tf: tf, what: 'MACD と山谷', value: dv.label + '（' + dv.evidence + '）' }, explain: '実際は ' + dv.label + '。' + root.SignalEngine.DIV_MEANING[dv.type] }); }
    // 4 山谷の確定・未確定
    var pv = e.pivots || { confirmed: [], forming: [] }; var lc = pv.confirmed[pv.confirmed.length - 1]; var lf = pv.forming.filter(function (x) { return !lc || x.index > lc.index; }).slice(-1)[0];
    if (lf) out.push({ type: 4, text: '直近の' + (lf.type === 'high' ? '高値' : '安値') + '（' + (e.n - lf.index) + '本前の ' + lf.price.toFixed(3) + '）は、もう確定した山谷だ。', truth: false, evidence: { tf: tf, what: 'ZigZag の山谷', value: (e.n - lf.index) + '本前の' + (lf.type === 'high' ? '高値' : '安値') + '（右側の足 ' + (e.n - lf.index) + '本／必要 ' + root.CONFIG.zigzag.depth + '本）' }, explain: '右側に ' + root.CONFIG.zigzag.depth + ' 本の足がそろうまで確定しない。未確定の山谷はシグナルに数えない。' });
    else if (lc) out.push({ type: 4, text: '直近の' + (lc.type === 'high' ? '高値' : '安値') + '（' + (e.n - lc.index) + '本前の ' + lc.price.toFixed(3) + '）は確定した山谷だ。', truth: true, evidence: { tf: tf, what: 'ZigZag の山谷', value: (e.n - lc.index) + '本前（右側に ' + root.CONFIG.zigzag.depth + ' 本以上）' }, explain: '確定している。' });
    // 9 EMA の並び
    out.push({ type: 9, text: tfj + 'の EMA20・30・40 は' + (pickBool() ? JA[e.emaOrder === 'mixed' ? 'up' : e.emaOrder] || '上昇' : (e.emaOrder === 'up' ? '下降' : '上昇')) + 'の並びだ。', truth: null, evidence: { tf: tf, what: 'EMA20/30/40', value: e.emaValues ? e.emaValues.map(function (v) { return v.toFixed(3); }).join('・') : ({ up: '上昇の並び', down: '下降の並び', mixed: '絡み合い' })[e.emaOrder] }, explain: '実際は' + ({ up: '上昇の並び（20＞30＞40）', down: '下降の並び（20＜30＜40）', mixed: '絡み合い（並んでいない）' })[e.emaOrder] + '。' });
    var last = out[out.length - 1]; last.truth = (e.emaOrder === 'up' && /上昇の並び/.test(last.text)) || (e.emaOrder === 'down' && /下降の並び/.test(last.text));
    // 5 損切りの幅と口座のリスク（その時点の注文の例で計算）
    var od = T.makeOrder(sn, (e.emaOrder === 'down' ? 'sell' : 'buy'), 2, prof, g.pip); if (od.ok) { var rp = Math.abs(od.mid - od.sl) / g.pip; var sz = TC().sizePosition({ capital: 1000000, riskPercent: 1, riskPips: rp + TC().COSTS.entrySlipPips + TC().COSTS.stopSlipPips });
      if (sz.ok) { var t5 = pickBool(); out.push({ type: 5, text: t5 ? '損切りまで ' + rp.toFixed(1) + 'pips でも、ロットを ' + sz.lots + ' にすれば、損切りで終わったときの口座の損失は約 1% だ。' : '損切りまで ' + rp.toFixed(1) + 'pips だから、損切りで終わると口座の ' + rp.toFixed(1) + '% を失う。', truth: t5, evidence: { tf: tf, what: '損切りの幅とロット', value: rp.toFixed(1) + 'pips・資金 100万円・' + sz.lots + 'ロット → 損切りで約 ' + Math.round(sz.actualRisk).toLocaleString() + '円（' + sz.actualRiskPct.toFixed(2) + '%）' }, explain: '損切りの幅（pips）と口座の損失（%）は別。口座の損失はロットで決まる（窓では推定より大きくなることがある）。' }); } }
    // 6〜8 考え方（いつでも成り立つ・成り立たない主張）
    var C6 = pickBool(); out.push({ type: 6, text: C6 ? 'この形で過去に勝てたことがあっても、次も勝てる保証にはならない。' : 'この形は過去に 5 回続けて勝ったから、勝率 100% で次も勝てる。', truth: C6, evidence: { tf: '-', what: '考え方', value: '過去の結果' }, explain: '過去の成績は、これからの結果を保証しない（回数が少ないとなおさら）。' });
    var C7 = pickBool(); out.push({ type: 7, text: C7 ? '条件がそろっていないなら、見送るのも正しい判断だ。' : '見送ると、利益の機会を逃すので、見送りはいつも失敗だ。', truth: C7, evidence: { tf: '-', what: '考え方', value: '見送り' }, explain: '条件がそろわない場面の見送りは、ルールに沿った判断。結果だけで良し悪しを決めない。' });
    var C8 = pickBool(); out.push({ type: 8, text: C8 ? 'このあと上がるか下がるかは、いまの足だけでは分からない。' : 'このあと必ず' + (e.emaOrder === 'down' ? '下がる' : '上がる') + '。もう結果は分かっている。', truth: C8, evidence: { tf: '-', what: '考え方', value: '判断の時点（asOf）までの足だけ' }, explain: 'いまの足から、この先の値動きを確実に知ることはできない。' });
    // 出題：チャートの事実の主張から 3〜4・考え方から 1〜2。誤りは 2〜3（全部が誤りにはしない）
    var chartC = out.filter(function (x) { return x.type <= 5 || x.type === 9; }), ideaC = out.filter(function (x) { return x.type >= 6 && x.type <= 8; });
    var sh = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    var sel = sh(chartC.slice()).slice(0, 4).concat(sh(ideaC.slice()).slice(0, 2)); var nf = sel.filter(function (x) { return !x.truth; }).length;
    if (nf === 0) { var alt = out.filter(function (x) { return !x.truth && sel.indexOf(x) < 0; })[0]; if (alt) sel[sel.length - 1] = alt; }
    if (sel.filter(function (x) { return !x.truth; }).length === sel.length) { var tr = out.filter(function (x) { return x.truth && sel.indexOf(x) < 0; })[0]; if (tr) sel[0] = tr; }
    sel = sh(sel); sel.forEach(function (x, i) { x.id = 'c' + (i + 1); });
    return { seed: seed >>> 0, gen: g.gen, asOf: asOf, entryTF: tf, claims: sel, checksum: PE().checksum(g) };
  };
  // 主張の真偽を、出題とは別の計算で確かめる（テスト・振り返り用。asOf の事実だけ）
  T.spotVerify = function (seed, set) {
    var g = PE().generate(seed, { gen: set.gen }); var sn = PE().snapshot(g, set.asOf, set.entryTF); var e = sn.entry; var h4 = sn.htf['4h'];
    return set.claims.map(function (c) { var m;
      if (c.type === 1) { var side = /ロング/.test(c.text) ? 'up' : 'down'; return (h4.dir === side) === c.truth; }
      if (c.type === 2) { if (/もう確定した/.test(c.text)) return c.truth === false && !!e.rci.zone && !e.rci.signal; if (/確定した足で確認できる/.test(c.text)) return c.truth === !!e.rci.signal; return c.truth === false && !e.rci.signal; }
      if (c.type === 3) { var conf = e.divSignals.filter(function (x) { return x.status === 'confirmed'; }); var dv = conf[conf.length - 1]; return !!dv && ((c.text.indexOf(dv.label) >= 0) === c.truth); }
      if (c.type === 4) { m = c.text.match(/(高値|安値)（(\d+)本前の ([0-9.]+)）/); var idx = e.n - (+m[2]), px = +m[3], ty = m[1] === '高値' ? 'high' : 'low'; var isConf = e.pivots.confirmed.some(function (p) { return p.index === idx && p.type === ty && Math.abs(p.price - px) < 1e-9; }); return isConf === c.truth; }
      if (c.type === 9) { var said = /上昇の並び/.test(c.text) ? 'up' : 'down'; return (e.emaOrder === said) === c.truth; }
      if (c.type === 5) { m = c.text.match(/口座の ([0-9.]+)% を失う/); if (m) return c.truth === false && Math.abs(+m[1] - 1) > 0.3; return c.truth === true && /約 1%/.test(c.text); }
      if (c.type === 6) return c.truth === !/100%/.test(c.text);
      if (c.type === 7) return c.truth === !/いつも失敗/.test(c.text);
      if (c.type === 8) return c.truth === !/必ず/.test(c.text);
      return false; });
  };
  // 採点：選んだ（誤りだと指摘した）主張。検出率＝見つけた誤り ÷ 誤りの数・誤認率＝正しい主張を誤りと言った数 ÷ 正しい主張の数。点＝見つけた誤り×10 − 言いがかり×5（0 点より下にしない）
  T.spotGrade = function (set, picked) {
    var P = {}; (picked || []).forEach(function (id) { P[id] = true; }); var fN = 0, tN = 0, hit = 0, fa = 0;
    var rows = set.claims.map(function (c) { var said = !!P[c.id]; if (!c.truth) { fN++; if (said) hit++; } else { tN++; if (said) fa++; } return { id: c.id, text: c.text, truth: c.truth, said: said, ok: said === !c.truth, type: c.type, evidence: c.evidence, explain: c.explain }; });
    return { rows: rows, falseN: fN, trueN: tN, hit: hit, falseAlarm: fa, detectRate: fN ? r2(hit / fN * 100) : null, falseAlarmRate: tN ? r2(fa / tN * 100) : null, score: Math.max(0, hit * 10 - fa * 5), max: fN * 10 };
  };

  /* ================= C 30連敗でも生き残る ================= */
  // o：{ capital, riskPercent, n（連敗の数）, mode:'pct'（残高の r%）|'yen'（最初の資金の r% の固定額）, stressEvery（k 回に 1 回、予定の 2 倍の損失）, exitPct（資金がこの % を下回ったら「退場の目安」） }
  T.survivalCheck = function (o) {
    var E = []; var cap = Number(o.capital), rp = Number(o.riskPercent), n = Number(o.n);
    if (!isFinite(cap) || cap <= 0) E.push('最初の資金は 0 より大きい数にする'); if (!isFinite(rp) || rp <= 0) E.push('1回のリスク（%）は 0 より大きくする'); else if (rp >= 100) E.push('1回のリスクが 100% 以上：1 回の損失で資金がなくなる（計算しない）');
    if (!isFinite(n) || n < 1 || n > 200 || Math.floor(n) !== n) E.push('連敗の数は 1〜200 の整数にする'); if (o.exitPct !== undefined && !(isFinite(o.exitPct) && o.exitPct >= 0 && o.exitPct < 100)) E.push('退場の目安（%）は 0 以上 100 未満');
    if (o.stressEvery !== undefined && o.stressEvery !== 0 && !(Number.isInteger(o.stressEvery) && o.stressEvery >= 1)) E.push('ストレスの間隔は 1 以上の整数（0 でなし）'); return E;
  };
  T.survival = function (o) {
    var E = T.survivalCheck(o); if (E.length) return { ok: false, errors: E }; var cap0 = Number(o.capital), r = Number(o.riskPercent) / 100, n = Number(o.n), mode = o.mode === 'yen' ? 'yen' : 'pct', se = o.stressEvery || 0, exitPct = o.exitPct === undefined ? 50 : o.exitPct;
    var curve = [cap0], cur = cap0, losses = [], exitAt = null, ruinAt = null;
    for (var k = 1; k <= n; k++) { var risk = mode === 'pct' ? cur * r : cap0 * r; if (se && k % se === 0) risk *= 2; risk = Math.min(risk, cur); cur = cur - risk; losses.push(risk); curve.push(cur); if (exitAt === null && cur < cap0 * exitPct / 100) exitAt = k; if (ruinAt === null && cur <= 1e-9) { ruinAt = k; } }
    var fin = cur; var formula = mode === 'pct' && !se ? cap0 * Math.pow(1 - r, n) : null;
    return { ok: true, mode: mode, capital: cap0, riskPercent: o.riskPercent, n: n, stressEvery: se, curve: curve, final: fin, finalPct: fin / cap0 * 100, formula: formula, totalLoss: cap0 - fin, maxDDPct: (1 - fin / cap0) * 100, recoverPct: fin > 0 ? (cap0 / fin - 1) * 100 : null, losses: losses, exitAt: exitAt, exitPct: exitPct, ruinAt: ruinAt,
      note: mode === 'pct' ? '残高の ' + o.riskPercent + '% を毎回リスクにする（複利）：final＝initial×(1−r)^n' + (se ? '。ストレス：' + se + ' 回に 1 回、予定の 2 倍の損失（窓・滑りの仮定）' : '') : '最初の資金の ' + o.riskPercent + '%（固定の円の額）を毎回リスクにする：final＝initial×(1−n×r)（0 で止まる）' };
  };
  // 勝ち負けの並びで、資金の決め方を比べる。seq：'L'・'W' の並び。rr：勝ちの R 倍。strategies：const（一定 %）・yen（固定額）・martingale（負けたら 2 倍・勝ったら元に）・upAfterWin（勝ったら 1.5 倍・負けたら元に）
  T.SEQ_SAMPLE = 'LLWLLLWLLWLLLLWLLWLLLWLLLLLWLL';   // 例の並び（30 回：勝ち 7・負け 23）。決まった並びなので、毎回同じ結果
  T.compareSizing = function (o) {
    var E = T.survivalCheck({ capital: o.capital, riskPercent: o.riskPercent, n: (o.seq || '').length || 1 }); if (!/^[WL]+$/.test(o.seq || '')) E.push('並びは W と L だけ'); if (!(isFinite(o.rr) && o.rr > 0 && o.rr <= 10)) E.push('勝ちの RR は 0〜10'); if (E.length) return { ok: false, errors: E };
    var cap0 = Number(o.capital), base = Number(o.riskPercent) / 100; var S = {};
    ['const', 'yen', 'martingale', 'upAfterWin'].forEach(function (k) { var cur = cap0, m = 1, curve = [cap0], ruin = null, peak = cap0, mdd = 0;
      for (var i = 0; i < o.seq.length; i++) { if (cur <= 1e-9) { curve.push(0); continue; } var rr = Math.min(0.99, k === 'martingale' || k === 'upAfterWin' ? base * m : base); var risk = k === 'yen' ? Math.min(cur, cap0 * base) : cur * rr;
        if (o.seq[i] === 'W') { cur += risk * o.rr; if (k === 'martingale') m = 1; if (k === 'upAfterWin') m = Math.min(m * 1.5, 0.99 / base); } else { cur -= risk; if (k === 'martingale') m = Math.min(m * 2, 0.99 / base); if (k === 'upAfterWin') m = 1; }
        if (cur < 1e-9) { cur = 0; if (ruin === null) ruin = i + 1; } curve.push(cur); peak = Math.max(peak, cur); mdd = Math.max(mdd, peak > 0 ? (peak - cur) / peak * 100 : 0); }
      S[k] = { final: cur, finalPct: cur / cap0 * 100, maxDDPct: mdd, ruinAt: ruin, curve: curve }; });
    return { ok: true, seq: o.seq, rr: o.rr, capital: cap0, riskPercent: o.riskPercent, wins: (o.seq.match(/W/g) || []).length, losses: (o.seq.match(/L/g) || []).length, s: S };
  };

  /* ================= D 初見チャートの認定試験 v2 ================= */
  T.EXAM_N = 30; T.EXAM_FAMILY_MAX = 5; T.EXAM_SEED_BASE = 7000001;
  // 次の問題を選ぶ：生成系列 B の seed を、試験ごとの salt と通し番号から順に作り、使った seed・指紋（checksum）・群の上限・これまでに見た指紋（seen）を避ける。見つからなければ null（重複を出さない）
  T.examNext = function (series, seen) {
    seen = seen || {}; var used = {}; (series.usedSeeds || []).forEach(function (s) { used[s] = 1; }); var fps = {}; (series.usedFps || []).forEach(function (f) { fps[f] = 1; }); var fam = {}; (series.usedFamilies || []).forEach(function (f) { fam[f] = (fam[f] || 0) + 1; });
    for (var k = 0; k < 400; k++) { var c = series.cursor + k; var seed = (T.EXAM_SEED_BASE + ((series.salt + c * 7919) % 2000000)) >>> 0; if (used[seed]) continue;
      var g = PE().generate(seed, { gen: 'B' }); var fp = g.familyId + '#' + PE().checksum(g); if (fps[fp] || seen[fp]) continue; if ((fam[g.familyId] || 0) >= T.EXAM_FAMILY_MAX) continue;
      var sn = PE().snapshot(g, g.S, g.entryTF); if (!sn.entry || sn.entry.insufficient) continue;
      return { seed: seed, gen: 'B', familyId: g.familyId, fp: fp, cursor: c + 1, set: 'exam', cat: (PE().classify(Object.assign(sn, { pip0: g.pip })) || [])[0] || null }; }
    return null;
  };
  T.examNew = function (seenCount, now) { var t = now || Date.now(); return { v: T.EXAM_VERSION, n: T.EXAM_N, done: 0, startedAt: t, salt: Math.floor((t % 1000003) * 13 + (seenCount || 0) * 101) % 2000000, cursor: 0, usedSeeds: [], usedFps: [], usedFamilies: [], items: [], retake: false }; };
  T.examMark = function (series, it) { series.usedSeeds.push(it.seed); series.usedFps.push(it.fp); series.usedFamilies.push(it.familyId); series.cursor = it.cursor; series.items.push({ seed: it.seed, fp: it.fp, familyId: it.familyId }); };
  // 評価：多面的に（判断の過程・規律・見送り・過大リスク・上位足の正答・ダイバージェンスの理解・コスト込みの期待値R・群ごと）。最低の問題数・分野を満たさなければ「判定保留」
  T.examEvaluate = function (recs, prevRuns) {
    var n = recs.length; var avg = function (a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; };
    var trades = recs.filter(function (x) { return x.kind === 'trade' && isFinite(x.riskR); }); var rated = recs.filter(function (x) { return typeof x.compliant === 'boolean'; });
    var htfR = recs.reduce(function (s2, x) { return s2 + (x.htfRight || 0); }, 0), htfN = recs.reduce(function (s2, x) { return s2 + (x.htfN || 0); }, 0);
    var div = recs.filter(function (x) { return x.divOk !== undefined && x.divOk !== null; }); var over = trades.filter(function (x) { return x.riskPercent > (x.profileSnap && x.profileSnap.maxRiskPercent || 2); });
    var skips = recs.filter(function (x) { return x.kind === 'skip'; }); var goodSkip = skips.filter(function (x) { return x.cats && x.cats.trigger && x.cats.trigger[0] >= 20; });
    var fam = {}; recs.forEach(function (x) { var f = x.familyId || '?'; var b = fam[f] || (fam[f] = { n: 0, proc: 0 }); b.n++; b.proc += x.process || 0; }); Object.keys(fam).forEach(function (k) { fam[k].avgProcess = Math.round(fam[k].proc / fam[k].n); });
    var famAvg = avg(Object.keys(fam).map(function (k) { return fam[k].avgProcess; }));
    var M = { n: n, process: avg(recs.map(function (x) { return x.process || 0; })), processByFamily: famAvg, compliance: rated.length ? rated.filter(function (x) { return x.compliant; }).length / rated.length * 100 : null, trades: trades.length,
      expectancyR: trades.length ? avg(trades.map(function (x) { return x.riskR; })) : null, overRiskRate: trades.length ? over.length / trades.length * 100 : null, skipRate: n ? skips.length / n * 100 : null, goodSkipRate: skips.length ? goodSkip.length / skips.length * 100 : null,
      htfAcc: htfN ? htfR / htfN * 100 : null, htfN: htfN, divAcc: div.length ? div.filter(function (x) { return x.divOk; }).length / div.length * 100 : null, divN: div.length, families: fam };
    var hold = []; if (n < T.EXAM_N) hold.push('解いた問題が ' + n + ' 問（' + T.EXAM_N + ' 問そろっていない）'); if (Object.keys(fam).length < 4) hold.push('型の群が ' + Object.keys(fam).length + ' 種類だけ（4 種類以上が必要）'); if (M.divN < 5) hold.push('ダイバージェンスの設問が ' + M.divN + ' 問だけ（5 問以上が必要）');
    var level = null; if (!hold.length) { var p = M.processByFamily; level = p >= 80 && M.compliance >= 80 && (M.overRiskRate || 0) <= 10 ? 'A' : p >= 65 && M.compliance >= 60 ? 'B' : 'C'; }
    var rep = null; if (prevRuns && prevRuns.length) { var ps = prevRuns.map(function (x) { return x.processByFamily; }).concat([M.processByFamily]).filter(function (x) { return isFinite(x); }); if (ps.length >= 2) rep = { runs: ps.length, min: Math.min.apply(null, ps), max: Math.max.apply(null, ps), spread: Math.max.apply(null, ps) - Math.min.apply(null, ps) }; }
    return { version: T.EXAM_VERSION, metrics: M, hold: hold, level: level, reproducibility: rep,
      note: '架空の相場の初見の問題での「判断の過程」の目安。実際の相場で勝てることの認定ではない。別の日・別のセットで、もう一度受けて同じくらいの結果になるかを確かめよう（端末の時計は変えられるので、日付は学習の記録の目安）。' };
  };

  root.Trainer91 = T;
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
})(typeof window !== 'undefined' ? window : globalThis);
