/* =========================================================
   UI / TraderDojo：トレーダー師匠の修行場（会話・流派の紹介・初心者向けの説明・チャート修行・初級試験・上級試験・成績・技の一覧）と、
   メニューの「必殺技」（覚えた技・流派と師匠・成績）
   ・修行（練習）は何度でもできるが、報酬はない（記録だけ）。試験の合格で覚える技は1回だけ（何度合格しても増えない）
   ・試験の記録は、全問を終えたときにまとめて書く（途中で中断・再読み込みしても、途中の記録は残らない＝セーブが中途半端にならない）
   ・どの問いにも「正解は一つ」とは言わない。判断した時点に見えていた根拠と、判断の過程・結果・理由を分けて点にする（js/rpg/ultimates.js の Ultimates.score）
   ========================================================= */
(function (root) {
  'use strict';
  var Win = root.Win, State = root.State; var esc = Win.esc;
  var TD = {};
  function U() { return root.Ultimates; }
  function M(mid) { return (root.TRADER_MASTERS || {})[mid]; }
  function CB() { return root.ChartBattleUI; }
  function sayAs(mid) { var m = M(mid); var pt = root.TraderMasterManager ? root.TraderMasterManager.portrait(mid) : null; return function (lines) { return Win.message(lines, { name: m.name, portrait: pt }); }; }
  function unionInd(sid) { var o = []; U().bySchool(sid).forEach(function (id) { U().get(id).ind.forEach(function (k) { if (o.indexOf(k) < 0) o.push(k); }); }); return o; }
  function sideName(s) { return s === 'long' ? 'ロング' : s === 'short' ? 'ショート' : '見送り'; }
  function outName(R) { if (!R || R.outcome === 'skip') return '―'; return R.outcome === 'profit' ? '利益 ' + U().fmtPips(R.pips) : R.outcome === 'loss' ? '損失 ' + U().fmtPips(R.pips) : 'ほぼ同値'; }
  function scoreHtml(sc, advanced) {
    return '<div class="cb-score"><b>この問いの点数：' + sc.score + '点</b>　<span class="muted small">判断の過程 ' + sc.process + '/60・結果 ' + sc.outcome + '/25' + (advanced ? '・理由 ' + sc.reason + '/15' : '（85点満点を100点に換算）') + '</span><br>' + sc.notes.map(esc).join('<br>') + '</div>';
  }
  TD.scoreHtml = scoreHtml;

  TD.open = async function (mid, c) {
    try { await run(mid); }
    catch (e) { if (root.console) console.error(e); try { await Win.message(['（修行場で問題が起きたため、中断しました。記録は変えていません）']); } catch (e2) { } }
  };

  async function run(mid) {
    var m = M(mid); var u = U(); var d = State.data; if (!m || !u || !d) return; u.sync(d);
    var rec = u.master(d, mid); var sch = u.school(m.school); var say = sayAs(mid);
    if (!rec.met) {
      rec.met = Date.now(); await say(m.first); await say(m.intro);
      var nx = u.schools().filter(function (q) { return q.no === sch.no + 1; })[0]; var nm = nx ? M(nx.master) : null;
      await say(['この世界には、10の流派の師匠がいる。必殺技は、レベルを上げて覚えるものと、師匠の試験に合格して覚えるものがある。'].concat(nm ? ['次の流派の師匠は「' + nm.place + '」にいる' + nm.name + 'だと聞く。いずれ訪ねるとよい。'] : ['わしで最後じゃ。九つの流派を修めた者だけが、ここへたどり着く。']));
    }
    else await say([greet(m, rec)]);
    while (true) {
      var rb = u.examReq(d, mid, 'beginner'), ra = u.examReq(d, mid, 'advanced');
      var tb = u.get(u.examTech(m.school, 'beginner')), ta = u.get(u.examTech(m.school, 'advanced'));
      var items = [
        { key: 'talk', label: '流派の話を聞く', right: sch.name },
        { key: 'guide', label: '初心者向けの説明' },
        { key: 'practice', label: 'チャート修行（練習）', right: rec.practice + '回', sub: '何度でもできる（記録だけ残る。報酬はない）' },
        { key: 'beginner', label: '初級試験（5問）', right: rec.beginner.passed ? '合格済み' : rec.beginner.attempts ? '最高' + rec.beginner.best + '点' : rb.ok ? '受けられる' : '条件あり', sub: '合格で「' + tb.name + '」を習得' + (rb.ok ? '' : '（' + rb.why + '）') },
        { key: 'advanced', label: '上級試験（10問）', right: rec.advanced.passed ? '合格済み' : rec.advanced.attempts ? '最高' + rec.advanced.best + '点' : ra.ok ? '受けられる' : '条件あり', sub: '合格で「' + ta.name + '」を習得' + (ra.ok ? '' : '（' + ra.why + '）') },
        { key: 'techs', label: '流派の技（5つ）' },
        { key: 'record', label: '成績を見る' },
        { key: 'bye', label: '立ち去る' }
      ];
      var i = await Win.list(items, { title: m.name + '　' + sch.name, cls: 'dojo-list' });
      if (i < 0 || items[i].key === 'bye') { await say([pick(['また来るがよい。', 'いつでも待っている。', '焦らず、根拠を持って。'], mid)]); return; }
      var k = items[i].key;
      if (k === 'talk') await say(m.intro);
      else if (k === 'guide') await say(m.guide);
      else if (k === 'practice') await practice(mid);
      else if (k === 'beginner' || k === 'advanced') await exam(mid, k);
      else if (k === 'techs') await TD.schoolTechs(m.school);
      else if (k === 'record') await TD.records(mid);
    }
  }
  function greet(m, rec) {
    if (rec.advanced.passed) return '……見事だった。流派の技はすべて伝えた。修行はいつでもできる。';
    if (rec.beginner.passed) return '初級は合格している。次は上級試験だ。';
    return m.short + 'は静かにうなずいた。「今日は何をする？」';
  }
  function pick(arr, mid) { var h = 0; for (var i = 0; i < mid.length; i++) h += mid.charCodeAt(i); return arr[(h + Date.now()) % arr.length]; }

  /* ---------- チャート修行（練習） ---------- */
  async function practice(mid) {
    var m = M(mid), u = U(), d = State.data; var sch = u.school(m.school); var rec = u.master(d, mid); var say = sayAs(mid);
    var lv = await Win.choice('どの難しさで修行する？', ['やさしい（難易度1〜2）', 'ふつう（難易度3）', 'むずかしい（難易度4〜5）', 'やめる']); if (lv < 0 || lv === 3) return;
    var diff = [[1, 2], [3, 3], [4, 5]][lv]; var ind = unionInd(m.school); var tf = u.get(u.bySchool(m.school)[0]).tf; var prompts = (root.ULT_EXAM_PROMPTS || {})[sch.id] || [''];
    var q = 0;
    while (true) {
      var s = u.newScenario({ cats: sch.cats, diff: diff, avoid: d.ultimate.recent });
      var res = await CB().open({ mode: 'practice', title: sch.name + '　修行', sub: '難易度：' + (u.DIFF_NAME[s.def.diff] || s.def.diff), prompt: '観点：' + prompts[q % prompts.length], ind: ind, tf: tf, scenario: s, quitable: true, color: sch.color,
        feedback: function (out) { return scoreHtml(u.score(out, { school: sch.id }), false); } });
      q++;
      if (!res || res.quit) { await say(['修行はここまでにしよう。']); return; }
      rec.practice++; u.recordTrade(d, { mode: 'practice', school: sch.id, scenarioId: res.scenarioId, cat: res.cat, seed: res.seed, side: res.side, auto: res.auto, result: res.result });
      var c = await Win.choice('修行を続ける？', ['もう1回', 'やめる']); if (c !== 0) return;
    }
  }

  /* ---------- 試験 ---------- */
  async function exam(mid, kind) {
    var m = M(mid), u = U(), d = State.data; var sch = u.school(m.school); var say = sayAs(mid);
    var req = u.examReq(d, mid, kind); if (!req.ok) { await say(['まだ早い。' + req.why + '。']); return; }
    var tid = u.examTech(m.school, kind); var tdef = u.get(tid); var n = kind === 'advanced' ? 10 : 5; var adv = kind === 'advanced'; var title = adv ? '上級試験' : '初級試験';
    var need = u.examResult(kind, []).need;
    var c = await Win.choice(title + '：チャート' + n + '問。' + (u.has(d, tid) ? '「' + tdef.name + '」は習得済み（記録だけ更新）' : '合格すると「' + tdef.name + '」を習得') + '。はじめる？', ['はじめる', 'やめる']); if (c !== 0) return;
    await say([title + 'だ。チャートを' + n + '問、見てもらう。', '合格の条件：' + need + '。', 'どの問いにも、正解は一つではない。勝ち負けより、判断した時点に見えていた根拠と合っているかを見る。' + (adv ? '判断のあとに、その理由も選んでもらう。' : '')]);
    var prompts = (root.ULT_EXAM_PROMPTS || {})[sch.id] || ['']; var used = []; var rows = [];
    for (var q = 0; q < n; q++) {
      var s = u.newScenario({ cats: sch.cats, diff: u.examDiff(sch, kind), avoid: (d.ultimate.recent || []).concat(used) }); used.push(s.id);
      var res = await CB().open({ mode: 'exam', title: title + '　第' + (q + 1) + '問／' + n, sub: sch.name + '｜「' + tdef.name + '」', prompt: '観点：' + prompts[q % prompts.length], ind: tdef.ind, tf: tdef.tf, scenario: s, askReason: adv, quitable: true, color: sch.color,
        feedback: function (out) { return scoreHtml(u.score(out, { advanced: adv, school: sch.id }), adv); } });
      if (!res || res.quit) { await say(['……今日はここまでにしておくか。（試験は中断。記録は残らない）']); return; }
      rows.push({ res: res, sc: u.score(res, { advanced: adv, school: sch.id }) });
    }
    var er = u.examResult(kind, rows.map(function (r) { return r.sc; }));
    // ここで初めて記録する（全問を終えたときだけ）
    rows.forEach(function (r) { u.recordTrade(d, { mode: 'exam', school: sch.id, scenarioId: r.res.scenarioId, cat: r.res.cat, seed: r.res.seed, side: r.res.side, auto: r.res.auto, result: r.res.result }); });
    var learned = u.recordExam(d, mid, kind, er);
    var RN = {}; (root.ULT_REASONS || []).forEach(function (r) { RN[r.key] = r.label; });
    var html = '<div class="rw-title">' + esc(title) + 'の結果　' + (er.pass ? '<span class="up">合格</span>' : '<span class="down">不合格</span>') + '</div>' +
      '<div class="ex-sum">平均 <b>' + er.avg + '点</b>　流れに逆らう判断 ' + er.opposite + '問・無謀な判断 ' + er.reckless + '問<br><span class="muted small">合格の条件：' + esc(er.need) + '</span></div>' +
      '<table class="ex-table"><tr><th>問</th><th>相場</th><th>判断</th><th>結果</th><th>点</th></tr>' + rows.map(function (r, i) { var df = root.Market.def(r.res.scenarioId); return '<tr><td>' + (i + 1) + '</td><td>' + esc(df ? df.catName : '') + '</td><td>' + sideName(r.res.side) + (r.res.auto ? '（時間切れ）' : '') + (adv && r.res.reason ? '<br><span class="muted small">' + esc(RN[r.res.reason] || '') + '</span>' : '') + '</td><td>' + esc(outName(r.res.result)) + '</td><td><b>' + r.sc.score + '</b></td></tr>'; }).join('') + '</table>' +
      '<div class="muted small">※ 架空のシミュレーション相場での練習です。結果は実際の取引の成績を示すものではありません。</div>';
    await Win.panel(html, { cls: 'exam-result' });
    if (er.pass) {
      await say(m.pass);
      if (learned) { if (root.Audio) root.Audio.playJingle('levelup'); await Win.message(['必殺技「' + tdef.name + '」を習得した！', tdef.intro, '戦闘の「必殺技」から使える（主人公だけ）。'], { name: '必殺技' }); }
    } else await say(m.fail.concat(['合格の条件：' + need + '。何度でも挑戦できる。']));
    State.autosave();
  }
  TD.exam = exam; TD.practice = practice;

  /* ---------- 技の一覧・成績 ---------- */
  function techLine(id) {
    var u = U(), d = State.data; var x = u.get(id); var has = u.has(d, id);
    return { label: (has ? '' : '（未習得）') + x.name, right: 'MP' + x.mp + '／待' + x.cd + 'T', sub: x.desc + '｜' + u.learnText(x) + (has ? '｜使った回数 ' + (d.ultimate.uses[id] || 0) : '') };
  }
  TD.techDetail = function (id) {
    var u = U(), d = State.data; var x = u.get(id); var sch = u.school(x.school); var has = u.has(d, id); var C = CB();
    var fx = []; var F = x.fx;
    if (F.hits) fx.push(F.hits + '連撃'); if (F.extraOnTp) fx.push('利確で追撃' + F.extraOnTp.hits + '回'); if (F.aoe) fx.push('敵全体（1体あたり×' + F.aoe + '）'); if (F.pierce) fx.push('防御を' + Math.round(F.pierce * 100) + '%無視'); if (F.crit) fx.push('会心率+' + Math.round(F.crit * 100) + '%'); if (F.boss) fx.push('ボスに×' + F.boss);
    if (F.expose) fx.push('敵の守りを崩す'); if (F.debuff) fx.push('敵の能力を下げる'); if (F.status) fx.push('状態異常にすることがある'); if (F.partyBuff) fx.push('味方を強化'); if (F.heal) fx.push('味方のHPを回復'); if (F.mpBack) fx.push('MPが一部戻る'); if (F.charge) fx.push('次の攻撃+'); if (F.cdCut) fx.push('利確でほかの必殺技の待ち時間-' + F.cdCut);
    if (F.guardOnLoss) fx.push('損失のとき味方の被ダメージ-' + Math.round(F.guardOnLoss.value * 100) + '%'); if (F.lossFloor) fx.push('損失でも威力×' + F.lossFloor + '以上'); if (F.skipGuard) fx.push('適切な見送りで守り（1戦闘1回）'); if (F.skipMp) fx.push('適切な見送りで使ったMPが戻る（1戦闘1回）');
    var html = '<div class="rw-title">' + esc(x.name) + '　<span class="muted small">' + esc(x.id) + '</span></div>' +
      '<div class="ult-detail"><div>流派：' + esc(sch.name) + '（' + esc(sch.master ? M(sch.master).name : '') + '）</div><div>習得：' + esc(u.learnText(x)) + (has ? '　<span class="up">習得済み</span>' : '') + '</div>' +
      '<div>MP ' + x.mp + '・待ち時間 ' + x.cd + 'ターン・判断の難しさ ' + '★★★★★'.slice(0, x.difficulty) + '</div><div>時間足：' + esc(C ? C.tfName(x.tf) : x.tf) + '・表示：' + x.ind.map(function (k) { return esc((C && C.IND_NAME[k]) || k); }).join('・') + '</div>' +
      '<div>威力（通常攻撃に対する倍率）：利益 ' + x.profit[0] + '〜' + x.profit[1] + '倍・損失 ' + x.loss[0] + '〜' + x.loss[1] + '倍・ほぼ同値 ' + x.flat + '倍・見送り＝防御</div>' +
      (x.bonus.length ? '<div>追加威力：' + x.bonus.map(function (b) { return esc(b.label) + ' ×' + b.mult; }).join('、') + '（利益のときだけ）</div>' : '') +
      (fx.length ? '<div>追加効果：' + esc(fx.join('、')) + '</div>' : '') +
      '<div>学習テーマ：' + esc(x.theme) + '</div><div class="ult-intro">' + esc(x.intro) + '</div>' + (has ? '<div class="muted small">使った回数：' + (d.ultimate.uses[id] || 0) + '</div>' : '') + '</div>';
    return Win.panel(html, { cls: 'ult-detail-panel' });
  };
  TD.schoolTechs = async function (sid) {
    var u = U(); var ids = u.bySchool(sid); var sch = u.school(sid);
    while (true) { var i = await Win.list(ids.map(techLine), { title: sch.name + 'の技' }); if (i < 0) return; await TD.techDetail(ids[i]); }
  };
  function modeLine(x, name) { if (!x || !x.n) return name + '：まだなし'; var tr = x.n - (x.skips || 0); return name + '：' + x.n + '回（利益 ' + (x.wins || 0) + '・損失 ' + (x.losses || 0) + '・ほぼ同値 ' + (x.flats || 0) + '・見送り ' + (x.skips || 0) + '）' + (tr ? '　勝率 ' + Math.round((x.wins || 0) / tr * 100) + '%' : ''); }
  TD.records = async function (mid) {
    var u = U(), d = State.data; var st = u.ensure(d).stats; var html = '';
    if (mid) { var m = M(mid); var r = u.master(d, mid); html += '<div class="rw-title">' + esc(m.name) + 'の修行の記録</div><div>チャート修行：' + r.practice + '回</div>' + ['beginner', 'advanced'].map(function (k) { var e = r[k]; return '<div>' + (k === 'advanced' ? '上級試験' : '初級試験') + '：' + (e.passed ? '<span class="up">合格</span>' : e.attempts ? '未合格' : 'まだ受けていない') + (e.attempts ? '　受けた回数 ' + e.attempts + '・最高 ' + e.best + '点・前回 ' + (e.last === null ? '―' : e.last + '点') : '') + '</div>'; }).join('') + '<div class="muted small">' + esc(u.school(m.school).name) + 'のチャート：' + esc(modeLine(st.bySchool[m.school], 'この流派')) + '</div><hr>'; }
    var tr = st.trades; var avgR = tr ? (st.sumR / tr) : 0;
    html += '<div class="rw-title">必殺技のチャートの成績（全体）</div><div>エントリー ' + tr + '回（利益 ' + st.wins + '・損失 ' + st.losses + '・ほぼ同値 ' + st.flats + '）　勝率 ' + (tr ? Math.round(st.wins / tr * 100) : 0) + '%</div>' +
      '<div>利確 ' + st.tp + '・損切り ' + st.sl + '・時間切れ ' + st.timeExit + '　合計 ' + u.fmtPips(st.pips) + '　平均（損益÷ATR）' + (avgR >= 0 ? '+' : '') + avgR.toFixed(2) + '</div>' +
      '<div>見送り ' + st.skips + '回（うち時間切れ ' + st.autoSkips + '回）' + (st.bestR !== null ? '　最高 +' + st.bestR.toFixed(2) + '・最低 ' + st.worstR.toFixed(2) : '') + '</div>' +
      '<div class="muted small">' + [['battle', '戦闘'], ['practice', '修行'], ['exam', '試験']].map(function (q) { return esc(modeLine(st.byMode[q[0]], q[1])); }).join('<br>') + '</div>' +
      '<div class="muted small">※ 架空のシミュレーション相場の記録です。</div>';
    await Win.panel(html, { cls: 'ult-records' });
  };

  /* ---------- メニュー「必殺技」 ---------- */
  TD.menu = async function () {
    var u = U(), d = State.data; u.sync(d);
    while (true) {
      var n = u.count(d);
      var i = await Win.list([{ label: '必殺技の一覧（50）', right: n + '/50' }, { label: '流派と師匠（10）' }, { label: '必殺技の成績' }, { label: '必殺技とは？' }], { title: '必殺技' });
      if (i < 0) return;
      if (i === 0) await listAll();
      else if (i === 1) await schools();
      else if (i === 2) await TD.records(null);
      else if (i === 3) await Win.message(['必殺技は主人公だけが使える技。戦闘のコマンド「必殺技」から選ぶ。', '使うと架空のシミュレーション相場のチャートが動き出す。ロング（買い）・ショート（売り）・見送りのどれかを、決められた時間のうちに選ぶ。', '損切りは ATR×1.0、利確は ATR×1.8、最大12本で決済。利益が出れば大ダメージ、損失なら小ダメージ、見送りは防御になる。', 'レベルで覚える技と、各地のトレーダー師匠の試験に合格して覚える技がある（10の流派・各5つ）。判断の時間は「設定」で変えられる。'], { name: '必殺技' });
    }
  };
  async function listAll() {
    var u = U(), d = State.data; var ids = u.list(); var tab = 0; var tabs = u.schools().map(function (s) { var k = u.bySchool(s.id).filter(function (id) { return u.has(d, id); }).length; return { label: s.name.replace(/術$|奥義$/, ''), count: k }; });
    while (true) {
      var sid = u.schools()[tab].id; var list = u.bySchool(sid);
      var r = await Win.list(list.map(techLine), { title: '必殺技の一覧', tabs: tabs, tab: tab });
      if (r === -1 || r === undefined) return; if (typeof r === 'object') { if (r.tab !== undefined) tab = r.tab; continue; }
      await TD.techDetail(list[r]); u.clearNotice(d, list[r]);
    }
  }
  async function schools() {
    var u = U(), d = State.data; var S = u.schools();
    while (true) {
      var items = S.map(function (s, idx) { var m = M(s.master); var rec = u.master(d, s.master); var k = u.bySchool(s.id).filter(function (id) { return u.has(d, id); }).length; var known = rec.met || idx === 0 || (idx > 0 && u.master(d, S[idx - 1].master).met);
        var w = root.TraderMasterManager ? root.TraderMasterManager.where(s.master) : null;
        return { label: s.no + '. ' + s.name, right: k + '/5', sub: (rec.met ? m.name + '（' + (w ? w.place : '') + '）' : known ? '師匠は' + (w ? w.mapName : '？？？') + 'にいるらしい' : '師匠：？？？') + '｜レベル' + s.levels.join('・') + 'で習得、ほか2つは試験' + (rec.beginner.passed ? '｜初級合格' : '') + (rec.advanced.passed ? '・上級合格' : '') }; });
      var i = await Win.list(items, { title: '流派と師匠' }); if (i < 0) return;
      await TD.schoolTechs(S[i].id);
    }
  }

  root.TraderDojo = TD;
})(typeof window !== 'undefined' ? window : globalThis);
