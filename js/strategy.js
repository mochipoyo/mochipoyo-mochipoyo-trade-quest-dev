/* =========================================================
   StrategyProfiles（戦略プロファイル）と ProcessGrade（判断の過程の採点）
   ・プロファイル：mochipoyo（もちぽよ実践トレード道場の既定）と general（一般FX学習。いろいろな手法を認める）
     値ごとに provisional（推奨仮設定・変更可能）か、ユーザーが共有した確定の基準かを持つ。
     確定の基準：上位足＝日足・4時間足／エントリー足＝5分足・15分足／EMA 20・30・40／RCI 9・±70 付近からの反転に注目／MACD 6・13・4（通常・ヒドゥン）／
       確定した高値・安値とダウ／複数の根拠の合致を重視（EMA の並びだけ・RCI の±70 到達だけで機械的に入らない）／損切り必須／RR 1:1.5〜1:3 を目安に検討
     ※ 反転の確認の本数・RCI とダイバージェンスの両方が必須か・上位足が食い違うときの例外・損切りの余裕・リスク%の上限・利確の方法などは
       確定していないので「推奨仮設定」。もちぽよ公式の機械売買ルールとしては扱わない（画面にもそう出す）
   ・判断の過程の採点：環境認識・セットアップ・トリガー・執行と資金管理・規律 を別々に点にし、結果（pips・R・MAE/MFE）は別の欄（点に入れない）
     1回の結果で判断の正誤を決めない。条件がそろっていなければ「待つ」「見送る」も正しい判断
   ========================================================= */
(function (root) {
  'use strict';
  var SP = { VERSION: 1 };
  function P(value, provisional, label, extra) { var o = { value: value, provisional: !!provisional, label: label }; if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; }); return o; }

  SP.EVIDENCE = [
    { key: 'htf', label: '上位足の向きと一致' }, { key: 'ema', label: 'EMA20/30/40 の並びが同じ向き' }, { key: 'dow', label: '確定した高値・安値（ダウ）が同じ向き' },
    { key: 'rci', label: 'RCI(9) が±70圏から反転（確認済み・継続中）' }, { key: 'div', label: 'MACD のダイバージェンス（同じ向き・期限内）' },
    { key: 'pullback', label: '押し目・戻り目（EMA 付近まで戻った）', general: true }, { key: 'breakout', label: '直近の高値・安値の突破', general: true }, { key: 'rangeEdge', label: 'レンジの端からの反発', general: true }
  ];
  SP.evidenceLabel = function (k) { for (var i = 0; i < SP.EVIDENCE.length; i++) if (SP.EVIDENCE[i].key === k) return SP.EVIDENCE[i].label; return k; };

  SP.PROFILES = {
    mochipoyo: { id: 'mochipoyo', name: 'もちぽよ実践トレード道場（推奨仮設定）',
      note: '時間足・EMA・RCI・MACD の設定と「複数の根拠」「損切り必須」「RR の目安」は共有された基準。細かな条件（※印）は教材の推奨仮設定で、変更できる。もちぽよ公式の機械売買ルールではない',
      params: {
        htfTFs: P(['1d', '4h'], false, '上位足（環境認識）'), entryTFs: P(['15m', '5m'], false, 'エントリー足'),
        evidence: P(['htf', 'ema', 'dow', 'rci', 'div'], false, '数える根拠'),
        requireRci: P(true, true, 'RCI(9) の反転（確認済み）を必須にする'), requireDiv: P(false, true, 'MACD ダイバージェンスを必須にする（必須にしないときも根拠として数える）'),
        minEvidence: P(2, true, 'エントリーに必要な条件の項目数（独立した証拠の数ではない）'), htfAgainst: P('block', true, 'エントリーの向きが上位足と逆のとき', { options: ['block', 'warn'] }),
        htfMode: P('all_known', true, '上位足の向きの見方', { options: ['all_known', 'h4_priority', 'both_required'] }),
        htfConflict: P('block', true, '日足と4時間足の向きが食い違うとき', { options: ['block', 'warn'] }),
        emaAlone: P(false, false, 'EMA の並びだけで入らない'), rciTouchAlone: P(false, false, 'RCI の±70 到達だけで入らない'),
        slRequired: P(true, false, '損切りは必須'), tpRequired: P(true, true, '利確を必ず決める'),
        rrMin: P(1.5, false, 'RR の目安（下限）'), rrMax: P(3, false, 'RR の目安（上限の目安）'),
        maxRiskPercent: P(2, true, '1回の許容損失の上限（資金の%）'), slBufferPips: P(3, true, '損切りの余裕（確定した高値・安値の外側。pips）'),
        chaseAtr: P(2.2, true, '飛び乗りとみなす EMA20 からの距離（ATR の倍数）'), avoidRangeMiddle: P(true, false, 'レンジの中ほどで無理に入らない')
      } },
    general: { id: 'general', name: '一般FX学習（いろいろな手法を認める）',
      note: '順張り・押し目・ブレイク・レンジの端など、よく知られた考え方を広く認める練習用の設定。どれか1つを正解として押しつけない',
      params: {
        htfTFs: P(['4h'], true, '上位足（環境認識）'), entryTFs: P(['15m', '5m'], true, 'エントリー足'),
        evidence: P(['htf', 'ema', 'dow', 'rci', 'div', 'pullback', 'breakout', 'rangeEdge'], true, '数える根拠'),
        requireRci: P(false, true, 'RCI の反転を必須にする'), requireDiv: P(false, true, 'ダイバージェンスを必須にする'),
        minEvidence: P(2, true, 'エントリーに必要な条件の項目数'), htfMode: P('h4_priority', true, '上位足の向きの見方', { options: ['all_known', 'h4_priority', 'both_required'] }), htfAgainst: P('warn', true, '上位足と逆のとき', { options: ['block', 'warn'] }), htfConflict: P('warn', true, '上位足どうしが食い違うとき', { options: ['block', 'warn'] }),
        emaAlone: P(false, true, 'EMA の並びだけで入らない'), rciTouchAlone: P(false, true, 'RCI の水準だけで入らない'),
        slRequired: P(true, true, '損切りは必須'), tpRequired: P(true, true, '利確を必ず決める'), rrMin: P(1.5, true, 'RR の目安（下限）'), rrMax: P(3, true, 'RR の目安（上限）'),
        maxRiskPercent: P(2, true, '1回の許容損失の上限（%）'), slBufferPips: P(3, true, '損切りの余裕（pips）'), chaseAtr: P(2.2, true, '飛び乗りの距離（ATR）'), avoidRangeMiddle: P(true, true, 'レンジの中ほどで入らない')
      } }
  };
  // 値だけの形（上書きを反映）。over：{ key: value }（ユーザーの変更。セーブの practice.profileOverrides）
  SP.values = function (id, over) {
    var pr = SP.PROFILES[id] || SP.PROFILES.mochipoyo; var o = { id: pr.id, name: pr.name };
    Object.keys(pr.params).forEach(function (k) { o[k] = pr.params[k].value; });
    if (over && typeof over === 'object') Object.keys(over).forEach(function (k) { if (pr.params[k] && over[k] !== undefined && over[k] !== null && typeof over[k] === typeof pr.params[k].value) o[k] = over[k]; });
    return o;
  };
  SP.describe = function (id, over) { var pr = SP.PROFILES[id] || SP.PROFILES.mochipoyo; var v = SP.values(id, over);
    return Object.keys(pr.params).map(function (k) { var p = pr.params[k]; var val = v[k]; var s = Array.isArray(val) ? val.join('・') : typeof val === 'boolean' ? (val ? 'する' : 'しない') : String(val); return { key: k, label: p.label, value: s, provisional: p.provisional, changed: !!(over && over[k] !== undefined && over[k] !== p.value) }; }); };

  /* ---------- エントリーの条件の確認（見えている事実だけ） ----------
     snap：PracticeEngine.snapshot の結果（判断した時点まで）。side：'buy'|'sell'
     返り値：{ side, evidence:[{key,label,ok,detail}], count, met, blockers:[{code,msg}], warnings:[…], missing:[…] }
     ・met（発注できる候補）は「根拠の数」ではない：必須の条件・妨げ（上位足と逆・飛び乗り・レンジの中ほど）も見る */
  function dirOfSide(side) { return side === 'buy' ? 'up' : side === 'sell' ? 'down' : null; }
  SP.evaluateEntry = function (snap, side, prof) {
    prof = prof && prof.id ? prof : SP.values(prof || 'mochipoyo'); var d = dirOfSide(side); var e = snap.entry || {}; var out = { side: side, evidence: [], count: 0, met: false, blockers: [], warnings: [], missing: [], profile: prof.id };
    if (!d) return out;
    var chaseDir = isFinite(e.distEmaAtr) && Math.abs(e.distEmaAtr) > prof.chaseAtr ? (e.distEmaAtr > 0 ? 'up' : 'down') : null;   // 飛び乗り：EMA20 から ATR の chaseAtr 倍より離れている（仮設定）
    // v9.1 上位足：時間足ごとに 上昇／下降／レンジ・不明瞭／履歴不足（判定不可）を分けて持つ。履歴不足はレンジと同じ扱いにしない
    var H = prof.htfTFs.map(function (t) { var h = (snap.htf || {})[t]; return { tf: t, state: !h ? 'none' : h.insufficient ? 'insufficient' : h.dir }; });
    var known = H.filter(function (x) { return x.state === 'up' || x.state === 'down'; }).map(function (x) { return x.state; }); var unknownTf = H.filter(function (x) { return x.state === 'insufficient' || x.state === 'none'; });
    var mode = prof.htfMode || 'all_known';   // 仮設定：all_known＝判定できる上位足がすべて同じ向き／h4_priority＝4時間足を優先（4H が判定できなければ日足）／both_required＝日足・4H の両方が同じ向き
    var htfOk;
    if (mode === 'both_required') htfOk = H.length >= 2 && H.every(function (x) { return x.state === d; });
    else if (mode === 'h4_priority') { var h4s = H.filter(function (x) { return x.tf === '4h'; })[0], d1s = H.filter(function (x) { return x.tf === '1d'; })[0]; var lead = h4s && (h4s.state === 'up' || h4s.state === 'down') ? h4s : d1s; htfOk = !!lead && lead.state === d; }
    else htfOk = known.length > 0 && known.every(function (x) { return x === d; });
    var against = known.some(function (x) { return x !== d; }); var conflict = known.length >= 2 && known.some(function (x) { return x !== known[0]; });   // 逆行と食い違いは別々に判定（両方当てはまることもある）
    var ev = {
      htf: { ok: htfOk, detail: prof.htfTFs.map(function (t) { var h = (snap.htf || {})[t]; return tfJa(t) + '：' + (h ? (h.insufficient ? '履歴不足' : dirJa(h.dir)) : '―'); }).join('・') },
      ema: { ok: e.emaOrder === d, detail: 'EMA ' + ({ up: '上昇の並び', down: '下降の並び', mixed: '絡み合い' })[e.emaOrder] },
      dow: { ok: e.dow === d, detail: '波形 ' + dirJa(e.dow) },
      rci: { ok: !!(e.rci && e.rci.signal === d), detail: e.rci ? (root.SignalEngine ? root.SignalEngine.RCI_STATE_LABEL[e.rci.state] || e.rci.state : e.rci.state) + '（' + (isFinite(e.rci.value) ? Math.round(e.rci.value) : '―') + '）' : '―' },
      div: { ok: (e.divs || []).some(function (s) { return s.status === 'confirmed' && s.direction === (d === 'up' ? 'bull' : 'bear'); }), detail: (e.divs || []).filter(function (s) { return s.status !== 'forming'; }).map(function (s) { return s.label + '（' + ({ confirmed: '期限内', expired: '期限切れ' })[s.status] + '）'; }).join('・') || 'なし' },
      pullback: { ok: !!e.trendDir && e.trendDir === d && !!e.nearEma && !chaseDir, detail: e.nearEma ? 'EMA 付近' : 'EMA から離れている' },
      breakout: { ok: e.breakout === d, detail: e.breakout ? '直近の' + (e.breakout === 'up' ? '高値' : '安値') + 'を抜けた' : '突破なし' },
      rangeEdge: { ok: !!e.inRange && ((d === 'up' && e.rangePos <= 0.25) || (d === 'down' && e.rangePos >= 0.75)), detail: e.inRange ? 'レンジの' + (e.rangePos <= 0.25 ? '下限付近' : e.rangePos >= 0.75 ? '上限付近' : '中ほど') : 'レンジではない' }
    };
    prof.evidence.forEach(function (k) { var x = ev[k]; if (!x) return; out.evidence.push({ key: k, label: SP.evidenceLabel(k), ok: x.ok, detail: x.detail }); if (x.ok) out.count++; });
    if (prof.requireRci && !ev.rci.ok) out.missing.push('RCI(9) の反転（' + (d === 'up' ? '−70圏から上向き' : '+70圏から下向き') + '・確認済み）がまだない');
    if (prof.requireDiv && !ev.div.ok) out.missing.push('同じ向きの MACD ダイバージェンス（期限内）がない');
    if (out.count < prof.minEvidence) out.missing.push('成り立った条件が ' + out.count + ' 項目（この設定では ' + prof.minEvidence + ' 項目以上）。EMA の並びとダウの向きのように互いに関係の深い項目もあり、独立した証拠の数ではない');
    if (mode === 'both_required' && unknownTf.length) out.missing.push(unknownTf.map(function (x) { return tfJa(x.tf); }).join('・') + 'は履歴不足で判定不可（この設定では日足・4H の両方が必要）');
    unknownTf.forEach(function (x) { out.warnings.push(tfJa(x.tf) + '：履歴不足のため判定不可（レンジとは別）'); });
    if (!prof.emaAlone && out.count === 1 && ev.ema.ok) out.missing.push('EMA の並びだけでは入らない');
    if (!prof.rciTouchAlone && e.rci && ((d === 'down' && e.rci.zone === 'overbought') || (d === 'up' && e.rci.zone === 'oversold')) && !ev.rci.ok) out.warnings.push('RCI が' + (d === 'down' ? '+70' : '−70') + 'に届いただけ（反転は確認できていない）。水準だけでは逆張りの根拠にならない');
    var B = function (code, msg, soft) { if (soft) out.warnings.push(msg); else out.blockers.push({ code: code, msg: msg }); };
    if (against) B('htf_against', '上位足（' + prof.htfTFs.map(tfJa).join('・') + '）の向きと逆のエントリー', prof.htfAgainst === 'warn');
    if (conflict) B('htf_conflict', '日足と4時間足の向きが食い違っている', prof.htfConflict === 'warn');   // v9.1 else を外した（逆行が「注意だけ」の設定でも、食い違いの妨げが抜けないように）
    if (chaseDir === d) B('chase', '価格が EMA20 から ATR の ' + (e.distEmaAtr !== undefined ? Math.abs(e.distEmaAtr).toFixed(1) : '?') + ' 倍離れている（飛び乗り）');
    if (prof.avoidRangeMiddle && e.inRange && e.rangePos > 0.25 && e.rangePos < 0.75 && !ev.breakout.ok) B('range_middle', 'レンジの中ほど（方向感がない）');
    out.met = !out.missing.length && !out.blockers.length;
    out.htfKnown = known.length; out.htfAgainst = against; out.htfConflict = conflict; out.htfMode = mode; out.htfStates = H;
    return out;
  };
  function tfJa(t) { return ({ '1d': '日足', '4h': '4時間足', '1h': '1時間足', '15m': '15分足', '5m': '5分足' })[t] || t; }
  function dirJa(x) { return ({ up: '上昇', down: '下降', range: 'レンジ・不明瞭', unknown: '判定できない' })[x] || '―'; }
  SP.tfJa = tfJa; SP.dirJa = dirJa;

  /* ---------- 判断の過程の採点 ----------
     play：{ profile（値）, facts（判断の開始時の事実 snap0）, answers:{ d1, h4, ema, dow, rci, div }（環境認識の答え）, viewedHtf:bool,
             claims:{ htf, ema, dow, rci, div …: true/false }（条件確認で「ある」と選んだ根拠）, claimSnap（その時点の snap）,
             outcomeKind:'trade'|'skip'|'timeout', entry:{ side, check:evaluateEntry の結果, order:validateOrder, sizing, riskPercent, snap, swing }, metAt:[条件がそろった足の番号],
             settle:決済の結果, context:{ prevLoss:bool, prevRiskPercent } }
     返り値：{ items:[{cat,name,ok,got,max,note}], cats:{ env, setup, trigger, execution, discipline }:{got,max}, process（0〜100）, result:{…}, violations:[…], compliant } */
  SP.CATS = [['env', '環境認識'], ['setup', 'セットアップ'], ['trigger', 'トリガー'], ['execution', '執行・資金管理'], ['discipline', '規律']];
  SP.grade = function (play) {
    var prof = play.profile && play.profile.id ? play.profile : SP.values('mochipoyo'); var f = play.facts || {}; var items = [], violations = [];
    var add = function (cat, name, got, max, note) { items.push({ cat: cat, name: name, ok: got >= max, got: Math.max(0, Math.min(max, Math.round(got))), max: max, note: note }); };
    // 1. 環境認識（日足・4時間足をそれぞれ。履歴不足は「判定できない」が正解）
    var an = play.answers || {};
    prof.htfTFs.forEach(function (t) { var h = (f.htf || {})[t] || {}; var truth = h.insufficient ? 'unknown' : h.dir; var a = an[t]; var okA = a === truth;
      add('env', tfJa(t) + 'の方向', okA ? 10 : 0, 10, (okA ? '正解：' : (a ? 'あなた：' + dirJa(a) + ' → 実際：' : '未回答 → 実際：')) + dirJa(truth) + (h.insufficient ? '（' + h.msg + '）' : h.basis ? '（' + h.basis + '）' : '')); });
    if (!play.viewedHtf) add('env', '上位足のチャートを確認', 0, 4, '日足・4時間足のチャートを開かずに判断した（成績では「上位足を見ていない判断」として分けて数える）'); else add('env', '上位足のチャートを確認', 4, 4, '日足・4時間足のチャートを開いて確かめた');
    // 2. セットアップ（「ある」と選んだ根拠が、その時点の事実と合っているか。矛盾は減点）
    var cs = play.claimCheck; var claims = play.claims || {};
    if (cs) { var right = 0, wrong = 0, tot = 0; var bad = [];
      cs.evidence.forEach(function (x) { tot++; var said = !!claims[x.key]; if (said === x.ok) right++; else { wrong++; bad.push((said ? '「ある」と選んだが実際はない：' : '見落とし：') + x.label + '（' + x.detail + '）'); } });
      add('setup', '根拠の確認', tot ? 20 * right / tot : 0, 20, wrong ? bad.join('／') : 'その時点の根拠を正しく読み取れた'); }
    // 3. トリガー
    var met = play.metAt || []; var k = play.outcomeKind;
    if (k === 'trade') { var ch = play.entry.check; if (ch.met) add('trigger', 'エントリーの条件', 20, 20, '条件がそろった足で発注した（' + ch.evidence.filter(function (x) { return x.ok; }).map(function (x) { return x.label; }).join('・') + '）');
      else { add('trigger', 'エントリーの条件', ch.count >= 2 && !ch.blockers.length ? 6 : 0, 20, '条件がそろう前の発注：' + ch.missing.concat(ch.blockers.map(function (b) { return b.msg; })).join('／')); violations.push('条件がそろう前のエントリー'); } }
    else if (k === 'skip' || k === 'end') { if (!met.length) add('trigger', '待つ・見送る', 20, 20, '見ていた間、条件がそろった足はなかった。待って見送ったのは正しい判断');
      else add('trigger', '待つ・見送る', 14, 20, '条件がそろった足があった（' + met.map(function (m) { return m.label; }).slice(0, 3).join('・') + '）。見送りも誤りではないが、計画に合うなら発注の候補だった'); }
    else { if (!met.length) add('trigger', '時間切れ', 16, 20, '時間切れまで決めなかった（条件はそろわなかった）。自分で「見送る」と決められるとなお良い'); else add('trigger', '時間切れ', 8, 20, '条件がそろった足があったのに、決めないまま時間切れになった'); }
    // 4. 執行・資金管理（発注したときだけ）
    if (k === 'trade') { var en = play.entry; var o = en.order; var side = en.side; var sw = en.swing || {}; var buf = prof.slBufferPips * (en.pip || 0.01);
      var ref = side === 'buy' ? sw.low : sw.high; var slOk = ref !== null && ref !== undefined && o.sl !== null && (side === 'buy' ? o.sl <= ref - buf + 1e-9 : o.sl >= ref + buf - 1e-9);
      add('execution', '損切りの位置', slOk ? 8 : 0, 8, ref === null || ref === undefined ? '確定した' + (side === 'buy' ? '安値' : '高値') + 'がまだない' : slOk ? '確定した' + (side === 'buy' ? '安値' : '高値') + '（' + ref.toFixed(3) + '）の外側に余裕をもって置いた' : '確定した' + (side === 'buy' ? '安値' : '高値') + '（' + ref.toFixed(3) + '）の外側（余裕 ' + prof.slBufferPips + 'pips）より内側。ふつうの押し戻りで刈られやすい');
      var rr = o.rr; add('execution', 'リスクリワード', rr >= prof.rrMin ? 6 : rr >= 1 ? 3 : 0, 6, rr ? '1:' + rr.toFixed(2) + (rr >= prof.rrMin ? (rr > prof.rrMax ? '（目安の上限 1:' + prof.rrMax + ' より遠い。届きにくいこともある）' : '（目安 1:' + prof.rrMin + '〜1:' + prof.rrMax + '）') : '（目安の 1:' + prof.rrMin + ' に届かない）') : '計算できない');
      var rp = en.riskPercent; add('execution', '許容損失（%）', rp <= prof.maxRiskPercent ? 4 : 0, 4, '資金の' + rp + '%' + (rp <= prof.maxRiskPercent ? '' : '（上限 ' + prof.maxRiskPercent + '% を超える）'));
      add('execution', 'ロット', en.sizing && en.sizing.ok ? 2 : 0, 2, en.sizing && en.sizing.ok ? en.sizing.lots + 'ロット（実際の損失の予定 ' + Math.round(en.sizing.actualRisk).toLocaleString() + '円）' : '計算できない');
      if (rp > prof.maxRiskPercent) violations.push('ロット過大（許容損失の上限超え）'); }
    // 5. 規律
    var disc = 20, dn = [];
    if (k === 'trade') { var c2 = play.entry.check; c2.blockers.forEach(function (b) { if (b.code === 'chase') { disc -= 10; dn.push('飛び乗り'); violations.push('飛び乗りエントリー'); } else if (b.code === 'htf_against') { disc -= 10; dn.push('上位足に逆らった'); violations.push('上位足に逆らったエントリー'); } else if (b.code === 'htf_conflict') { disc -= 5; dn.push('上位足が食い違う中で入った'); } else if (b.code === 'range_middle') { disc -= 6; dn.push('レンジの中ほどで入った'); violations.push('レンジでの無理なエントリー'); } });
      if (play.context && play.context.prevLoss && play.entry.riskPercent > (play.context.prevRiskPercent || 0)) { disc -= 8; dn.push('負けの直後にリスクを増やした（取り返そうとする行動）'); violations.push('負けの直後のロット増加'); } }
    add('discipline', '規律', disc, 20, dn.length ? dn.join('／') : (k === 'trade' ? 'ルールに沿って発注した' : '無理に入らなかった'));
    // 問題ごとの読み取りの設問（レベルごと。PracticeEngine.focusQuestions）など、呼ぶ側が足す項目
    (play.extraItems || []).forEach(function (x) { add(x.cat || 'setup', x.name, x.got, x.max, x.note); });
    // 集計（当てはまる項目だけで 100 点に換算）
    var cats = {}; SP.CATS.forEach(function (c) { cats[c[0]] = { got: 0, max: 0, label: c[1] }; }); items.forEach(function (it) { cats[it.cat].got += it.got; cats[it.cat].max += it.max; });
    var got = 0, max = 0; Object.keys(cats).forEach(function (c) { got += cats[c].got; max += cats[c].max; });
    var res = null; var st = play.settle;
    if (k === 'trade' && st && st.ok) res = { reason: st.reason, netPips: st.netPips, grossPips: st.grossPips, costPips: st.costPips, riskR: st.riskR, maePips: st.maePips, mfePips: st.mfePips, ambiguous: st.ambiguous, gap: st.gap, bars: st.bars, pnl: play.pnl, note: '結果は値動きの運にも左右される。1回の結果で判断の良し悪しを決めない（判断の点には入れていない）' };
    return { items: items, cats: cats, process: max ? Math.round(got / max * 100) : 0, result: res, violations: violations, compliant: !violations.length, profile: prof.id };
  };

  root.StrategyProfiles = SP; root.ProcessGrade = { grade: SP.grade, CATS: SP.CATS };
  if (typeof module !== 'undefined' && module.exports) module.exports = SP;
})(typeof window !== 'undefined' ? window : globalThis);
