/* =========================================================
   RPG / TradeDuel90（v9.0）：トレードマスターとの「上級の対戦」（リスクR対戦・規律対戦）。今までの pips 対戦・賞金・400歩は変えない
   ・同じ問題（もちぽよ実践トレード道場と同じ、日足・4H・15分・5分のそろった架空の相場）を、プレイヤーと相手が別々に判断する
   ・相手の戦略（流派ごと）は、判断の時点の事実（PracticeEngine.snapshot：その時点までの足だけ）だけを見る。未来の足は渡さない
       順張り：上位足（4H）・EMA・ダウの向きがそろい、押し目・戻り目（EMA 付近）か RCI の反転がある向き
       逆張り：RCI が±70圏にある（反転は待たない）とき、その逆（一般によく知られた考え方の例。もちぽよの基準とは別）
       ブレイク：直近の高値・安値を抜けた向き
       勢い：MACD がシグナルの上（下）で、直近5本が ATR 以上動いた向き
       万能：もちぽよ実践の推奨仮設定で条件がそろったときだけ（そろわなければ待つ・見送る）
   ・注文：損切り＝確定した山谷の外側（＋3pips。山谷がなければ ATR×1.5）、利確＝RR 1:2、許容損失＝資金の1%（万能は 0.5%）
   ・腕前：トレードマスターの段階の腕前（skill）で、上位足の読み・根拠の印をときどき読み違える（同じ問題・同じ相手なら同じ）。発注の判断（戦略）は変えない
   ・勝敗：リスクR対戦＝実現した R（見送り・時間切れは 0R）の差が 0.1 以上。規律対戦＝判断の過程の点（ProcessGrade）の差が 3 点以上。それ以外は引き分け
   ・賞金はない（記録だけ。pips 対戦の賞金とは別の決まり。賞金の抜け穴を作らない）
   ========================================================= */
(function (root) {
  'use strict';
  var D9 = { VERSION: 1 };
  function PE() { return root.PracticeEngine; } function SPF() { return root.StrategyProfiles; } function TC() { return root.TradeCore; }
  D9.STYLES = {
    trend: function (sn) { var e = sn.entry, h = sn.htf['4h']; var d = h && !h.insufficient ? h.dir : null; if (!d || d === 'range' || e.emaOrder !== d || e.dow !== d) return null; if ((e.rci && e.rci.signal === d) || (e.nearEma && !(Math.abs(e.distEmaAtr) > 2.2))) return { side: d === 'up' ? 'buy' : 'sell', why: '上位足・EMA・ダウがそろった押し目・戻り目' }; return null; },
    contra: function (sn) { var r = sn.entry.rci; if (!r) return null; if (r.zone === 'overbought' && r.signal !== 'up') return { side: 'sell', why: 'RCI が +70 圏（行き過ぎの逆）' }; if (r.zone === 'oversold' && r.signal !== 'down') return { side: 'buy', why: 'RCI が −70 圏（行き過ぎの逆）' }; return null; },
    break: function (sn) { var b = sn.entry.breakout; return b ? { side: b === 'up' ? 'buy' : 'sell', why: '直近の' + (b === 'up' ? '高値' : '安値') + 'を抜けた' } : null; },
    momentum: function (sn) { var e = sn.entry; if (e.macdState === 'bull' && e.surgeAtr >= 1) return { side: 'buy', why: 'MACD が上向き・直近の勢い' }; if (e.macdState === 'bear' && e.surgeAtr <= -1) return { side: 'sell', why: 'MACD が下向き・直近の勢い' }; return null; },
    all: function (sn, prof) { var s = ['buy', 'sell'].filter(function (x) { return SPF().evaluateEntry(sn, x, prof).met; }); return s.length === 1 ? { side: s[0], why: '推奨仮設定で条件がそろった' } : null; }
  };
  D9.CHECKS_HTF = { trend: true, all: true };   // 上位足を見る流派（環境認識の答えにだけ使う）
  // 相手の1問：判断の開始から1本ずつ見て、自分の戦略が合図を出した足で発注。最後まで出なければ見送り
  D9.npcRun = function (pick, style, opts) {
    opts = opts || {}; var prof = SPF().values('mochipoyo'); var fn = D9.STYLES[style] || D9.STYLES.all; var cap = opts.capital || 1000000;
    var play = PE().start(pick, { profile: 'mochipoyo', level: 6, hints: false }); PE().markStart(play, prof);
    var sn0 = PE().snap(play); var seesHtf = !!D9.CHECKS_HTF[style];
    // 腕前（skill：トレードマスターの段階。0.35〜0.86。省略時は 1＝読み違いなし）：読み違い（上位足の答え・根拠の印）が起きる。乱数は問題のシードと相手のシードで決まる（同じなら同じ）
    var skill = opts.skill === undefined ? 1 : opts.skill; var rnd = root.Scenarios._internal.mulberry32(((pick.seed >>> 0) ^ ((opts.seed || 0) >>> 0) ^ 0x2545f491) >>> 0); var miss = function () { return rnd() > skill; };
    play.answers = {}; ['1d', '4h'].forEach(function (t) { var h = sn0.htf[t]; var right = h.insufficient ? 'unknown' : h.dir; play.answers[t] = seesHtf && !miss() ? right : (right === 'range' ? 'up' : 'range'); }); if (seesHtf) { play.viewed['1d'] = play.viewed['4h'] = true; }
    play.hypothesis = { bias: 'neutral', asOf: play.asOf }; play.phase = 'waiting'; var entered = null;
    for (var k = 0; k <= play.maxSteps && !entered; k++) {
      var sn = PE().snap(play); var dec = fn(sn, prof);
      if (dec) { var e = sn.entry; var ref = dec.side === 'buy' ? e.swing.low : e.swing.high; var buf = 3 * play.pip;
        var sl = ref !== null ? (dec.side === 'buy' ? Math.min(ref - buf, e.close - 2 * play.pip) : Math.max(ref + buf, e.close + 2 * play.pip)) : (dec.side === 'buy' ? e.close - 1.5 * e.atr : e.close + 1.5 * e.atr);
        var half = TC().COSTS.spreadPips * play.pip / 2; var px = dec.side === 'buy' ? e.close + half : e.close - half; var risk = Math.abs(px - sl); var tp = dec.side === 'buy' ? px + 2 * risk : px - 2 * risk;
        var ch = SPF().evaluateEntry(sn, dec.side, prof); var claims = {}; ch.evidence.forEach(function (x) { claims[x.key] = miss() ? !x.ok : x.ok; });
        var r = PE().enter(play, { side: dec.side, sl: Math.round(sl * 1000) / 1000, tp: Math.round(tp * 1000) / 1000, riskPercent: style === 'all' ? 0.5 : 1 }, cap, claims, prof);
        if (r.ok) { entered = dec; break; } }
      if (!PE().advance(play, prof)) break;
    }
    if (!entered) PE().skip(play, null);   // 相手は、合図が出なければ最後に自分で見送る（時間切れにはしない）
    if (play.phase === 'holding') { var g = 0; while (play.phase === 'holding' && g++ < 1000) PE().holdStep(play); }
    var gr = PE().grade(play, {}, prof); var rec = PE().record(play, gr, cap);
    // v9.1 相手の説明：その時点（入った足・見送った足）のチャートの事実だけから作る（未来の足は使わない）
    var en = play.events.filter(function (e) { return e.kind === 'enter'; })[0]; var atAs = en ? en.asOf : play.asOf; var snA = PE().snapshot(PE().game(play), atAs, play.entryTF); snA.pip0 = play.pip;
    var facts = D9.facts(snA, rec.side || 'buy', prof);
    return { style: style, why: entered ? entered.why : '合図が出なかった（見送り）', record: rec, grade: gr, riskR: rec.riskR === null ? 0 : rec.riskR, process: gr.process, side: rec.side, kind: rec.kind, answers: play.answers, atMin: (atAs - play.S) * 5, facts: facts };
  };
  // その時点の事実（相手の説明・比べる表）：上位足の向き・EMA の並び・ダウ・RCI の状態・ダイバージェンス・いまの価格。どれも判断の時点までの確定足から
  D9.facts = function (sn, side, prof) {
    var e = sn.entry || {}; var tf = function (t) { var h = sn.htf[t]; return !h ? '―' : h.insufficient ? '履歴不足（判定不可）' : ({ up: '上昇', down: '下降', range: 'レンジ・不明瞭' })[h.dir] || h.dir; };
    var ch = SPF().evaluateEntry(sn, side, prof);
    return { d1: tf('1d'), h4: tf('4h'), ema: ({ up: '上昇の並び', down: '下降の並び', mixed: '絡み合い' })[e.emaOrder] || '―', dow: SPF().dirJa(e.dow), rci: e.rci ? ((root.SignalEngine && root.SignalEngine.RCI_STATE_LABEL[e.rci.state]) || e.rci.state) + '（' + (isFinite(e.rci.value) ? Math.round(e.rci.value) : '―') + '）' : '―',
      div: (e.divSignals || []).filter(function (x) { return x.status === 'confirmed'; }).map(function (x) { return x.label; }).join('・') || 'なし', price: sn.price, met: ch.met, ok: ch.evidence.filter(function (x) { return x.ok; }).map(function (x) { return x.label; }), missing: ch.missing.concat(ch.blockers.map(function (b) { return b.msg; })) };
  };
  D9.explain = function (op, info) {
    var f = op.facts || {}; var base = '日足 ' + f.d1 + '・4時間足 ' + f.h4 + '・EMA ' + f.ema + '・ダウ ' + f.dow + '・RCI ' + f.rci + '・ダイバージェンス ' + f.div;
    if (op.kind === 'trade') return ['開始から ' + op.atMin + '分の確定足で' + (op.side === 'buy' ? 'ロング' : 'ショート') + '（' + op.why + '）。', 'その時点の事実：' + base + '。', f.ok && f.ok.length ? 'もちぽよの推奨仮設定で成り立っていた条件：' + f.ok.join('・') + (f.met ? '（条件はそろっていた）' : '（そろってはいない：' + (f.missing || []).slice(0, 2).join('／') + '）') : '', '流派（やり方）が違えば、別の判断も合理的なことがある。結果の R だけでなく、それぞれの決まりに沿っていたかを比べよう。'];
    return ['最後まで ' + ((info && info.styleName) || '自分の流派') + 'の合図が出ず、開始から ' + op.atMin + '分で見送った。', 'その時点の事実：' + base + '。', '流派（やり方）が違えば、別の判断も合理的なことがある。どちらの判断が、それぞれの決まりに沿っていたかを比べよう。'];
  };
  // 判断の過程を並べる表（環境認識・シグナル・見送り／発注・注文・決済管理・判断の点）。賞金・報酬は出さない
  D9.compareRows = function (me, op, pick) {
    var g = PE().game({ seed: pick.seed }); var s0 = PE().snapshot(g, g.S, g.entryTF); var truth = function (t) { var h = s0.htf[t]; return h.insufficient ? 'unknown' : h.dir; }; var J = { up: '上昇', down: '下降', range: 'レンジ', unknown: '判定できない' };
    var ans = function (a, t) { var v = (a || {})[t]; return (J[v] || '未回答') + (v === truth(t) ? '（正）' : '（誤）'); };
    var kind = function (r) { return r.kind === 'trade' ? (r.side === 'buy' ? 'ロング' : 'ショート') : r.kind === 'skip' ? '見送り' : '時間切れ'; };
    var ord = function (r) { return r.kind === 'trade' ? '損切り ' + (r.sl !== null ? r.sl.toFixed(3) : '―') + '・利確 ' + (r.tp !== null ? r.tp.toFixed(3) : '―') + '・RR ' + (r.plannedRR ? '1:' + r.plannedRR.toFixed(2) : '―') + '・許容損失 ' + r.riskPercent + '%' : '―'; };
    var res = function (r) { return r.kind === 'trade' ? ({ tp: '利確', sl: '損切り', time: '時間切れ', end: '足の終わり', early: '早めの決済' })[r.reason] + '・' + (r.riskR > 0 ? '+' : '') + r.riskR.toFixed(2) + 'R・最大逆行 ' + r.mae + 'pips' + (r.advanced ? '・上級の管理 ' + (r.actions || []).length + '回' : '') : '0R（取引なし）'; };
    var cat = function (r, k) { var c = r.cats && r.cats[k]; return c && c[1] ? c[0] + '/' + c[1] : '―'; };
    var mr = me.record, orr = op.record;
    return [['環境認識（日足）', ans(me.answers, '1d'), ans(op.answers, '1d') + '（実際：' + J[truth('1d')] + '）'], ['環境認識（4時間足）', ans(me.answers, '4h'), ans(op.answers, '4h') + '（実際：' + J[truth('4h')] + '）'],
      ['シグナル・決めた時刻', '開始から ' + (mr.steps !== undefined && me.atMin !== undefined ? me.atMin : '―') + '分', '開始から ' + op.atMin + '分'], ['見送り／発注', kind(mr), kind(orr)], ['注文', ord(mr), ord(orr)], ['決済と管理（結果は運にも左右される）', res(mr), res(orr)],
      ['判断の点：環境認識', cat(mr, 'env'), cat(orr, 'env')], ['判断の点：セットアップ・トリガー', cat(mr, 'setup') + '・' + cat(mr, 'trigger'), cat(orr, 'setup') + '・' + cat(orr, 'trigger')], ['判断の点：執行・規律', cat(mr, 'execution') + '・' + cat(mr, 'discipline'), cat(orr, 'execution') + '・' + cat(orr, 'discipline')], ['判断の過程の点（合計）', mr.process + '点', orr.process + '点']];
  };
  // 勝敗：1＝プレイヤーの勝ち、−1＝相手の勝ち、0＝引き分け
  D9.judge = function (rule, me, op) {
    if (rule === 'riskR') { var a = me.riskR === null || me.riskR === undefined ? 0 : me.riskR, b = op.riskR; return a - b >= 0.1 ? 1 : b - a >= 0.1 ? -1 : 0; }
    var x = me.process || 0, y = op.process || 0; return x - y >= 3 ? 1 : y - x >= 3 ? -1 : 0;
  };
  D9.RULE_NAME = { riskR: 'リスクR対戦（実現した R で比べる）', discipline: '規律対戦（判断の過程の点で比べる）' };
  D9.ensure = function (t) { if (!t.adv90 || typeof t.adv90 !== 'object') t.adv90 = { riskR: { w: 0, l: 0, d: 0 }, discipline: { w: 0, l: 0, d: 0 } }; ['riskR', 'discipline'].forEach(function (k) { if (!t.adv90[k]) t.adv90[k] = { w: 0, l: 0, d: 0 }; }); return t.adv90; };
  // 画面：トレードマスターに話しかけたとき（js/rpg/trademaster83.js から呼ぶ）
  D9.talk = async function (npc, info, say) {
    var Win = root.Win, State = root.State, PUI = root.PracticeUI; if (!PUI || !PE()) { await Win.message(['（実践トレード道場が使えない）']); return; }
    var opt = ['リスクR対戦（決めた損切りに対して、いくつ R を取ったか）', '規律対戦（判断の過程の点：環境認識・待つ・注文・規律）']; if (PUI.spot) opt.push('思い込みを見抜く（相手の解説の誤りを探す・記録だけ）'); opt.push('やめる');
    var c = await Win.choice('上級の対戦（賞金なし・記録だけ）：どちらで勝負する？', opt);
    if (PUI.spot && c === 2) { await say(['俺の解説に、チャートの事実と合わないところがあれば言ってみな。正しいことも言うぜ。']); await PUI.spot(); return; }   // v9.1 学習追加 B への入口（報酬なし）
    if (c !== 0 && c !== 1) return;
    var rule = c === 0 ? 'riskR' : 'discipline'; var p = PUI.ensure(); var pick = PUI.pick(p, { lv: 6, cats: null, set: 'learn' }); if (!pick) return;
    var style = (info && info.style) || 'all'; if (!D9.STYLES[style]) style = 'all';
    await say(['同じチャートで勝負だ。俺は' + (info.styleName || '万能') + 'のやり方で、その時点までの足だけを見て決める。', D9.RULE_NAME[rule] + '。']);
    var res = await PUI.play({ level: 6, lvDef: { lv: 6, name: '上級の対戦：' + D9.RULE_NAME[rule], cats: null, set: 'learn' }, pick: pick }); if (!res) return;
    var op = D9.npcRun(pick, style, { skill: info.skill, seed: info.seed }); var me = { riskR: res.record.riskR, process: res.record.process }; var j = D9.judge(rule, me, op);
    var t = root.TradeMaster83 && root.TradeMaster83.ensure(State.data); if (t) { var a = D9.ensure(t)[rule]; if (j > 0) a.w++; else if (j < 0) a.l++; else a.d++; }
    var f = function (r) { return r === null || r === undefined ? '0R（取引なし）' : (r > 0 ? '+' : '') + r.toFixed(2) + 'R'; };
    await Win.message([(j > 0 ? '上級の対戦：あなたの勝ち' : j < 0 ? '上級の対戦：' + info.short + 'の勝ち' : '上級の対戦：引き分け') + '（' + D9.RULE_NAME[rule] + '）',
      'あなた：' + (res.record.kind === 'trade' ? (res.record.side === 'buy' ? 'ロング' : 'ショート') : res.record.kind === 'skip' ? '見送り' : '時間切れ') + '・' + f(res.record.riskR) + '・判断の点 ' + res.record.process,
      info.short + '：' + (op.kind === 'trade' ? (op.side === 'buy' ? 'ロング' : 'ショート') : '見送り') + '（' + op.why + '）・' + f(op.record.riskR) + '・判断の点 ' + op.process,
      '※ 賞金はない（記録だけ）。1回の結果は運にも左右される。'], { name: npc.name });
    // v9.1 判断の過程を並べて比べる（見るかどうかを選べる）。相手の説明はその時点のチャートの事実だけ
    var c2 = await Win.choice('判断の過程を比べる？', ['比べる表を見る（環境認識・シグナル・見送り・発注・決済管理）', '終わる']);
    if (c2 === 0) { var meX = { record: res.record, answers: res.record.answers || {}, atMin: res.record.decidedMin }; var rows = D9.compareRows(meX, op, pick); var esc = Win.esc;
      await Win.panel('<div class="rw-title">判断の過程の比べ（' + esc(D9.RULE_NAME[rule]) + '）</div><table class="tbl small"><tr><th></th><th>あなた</th><th>' + esc(info.short) + '</th></tr>' + rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('') + '</table>' +
        '<div class="an-title">' + esc(info.short) + 'の説明（その時点のチャートの事実から）</div><div class="small">' + D9.explain(op, info).filter(Boolean).map(esc).join('<br>') + '</div><div class="muted small">同じ問題・同じ時刻から、どちらも判断の時点までの足だけを見て決めた。賞金・報酬は出ない（記録だけ）。</div>', { cls: 'pd-review' }); }
  };

  root.TradeDuel90 = D9;
  if (typeof module !== 'undefined' && module.exports) module.exports = D9;
})(typeof window !== 'undefined' ? window : globalThis);
