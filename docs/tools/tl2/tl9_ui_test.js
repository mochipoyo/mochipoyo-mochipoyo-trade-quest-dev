// 学習追加 A〜D の画面（jsdom。実機・実ブラウザではない）：node docs/tools/tl2/tl9_ui_test.js [2d]
//   道場のメニューから起動 → 操作 → 結果・振り返り → セーブ（practice の中）。ゲームのお金・道場の成績を汚さない・旧セーブの移行
const path = require('path'); const load = require(path.resolve(__dirname, '../v78/load78.js'));
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const doc = w.document;
const { Engine: E, State, World } = w; const Input = E.Input; const PUI = w.PracticeUI, PE = w.PracticeEngine, TR = w.Trainer91;
let okN = 0; const ng = []; const T = (c, m) => { if (c) okN++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const frames = async (n) => { for (let i = 0; i < n; i++) await sleep(17); };
const click = (n) => n && n.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
function clean() { doc.querySelectorAll('#ui > *').forEach((n) => n.remove()); E.scenes = E.scenes.filter((s) => !s.overlay); World.busy = false; }
const top = () => doc.getElementById('ui').lastElementChild;
const wait = async (f, n) => { for (let i = 0; i < (n || 200); i++) { const v = f(); if (v) return v; await frames(1); } return null; };
const item = (label) => [...doc.querySelectorAll('#ui .rw-item')].find((x) => x.textContent.indexOf(label) >= 0);
const opt = (label) => [...doc.querySelectorAll('#ui .rw-opt')].find((x) => x.textContent.indexOf(label) >= 0);
(async () => {
  try { Input.init(); } catch (e) { }
  w.MochiQuest && w.MochiQuest.boot && w.MochiQuest.boot(); await frames(5); clean();
  State.newGame('テスト', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); await frames(4); clean();
  console.log('== ' + (two ? '2D 版' : '3D 版と同じ読み込み') + '　読み込みのエラー ' + A.errors.length);
  const p = PUI.ensure(d); p.seen = true; const gold0 = d.gold, cap0 = p.capital, hist0 = p.history.length;
  // メニュー
  let menuDone = false; PUI.menu().then(() => { menuDone = true; }); await wait(() => item('同じ相場・3判断比較'));
  const labels = [...doc.querySelectorAll('#ui .rw-item')].map((x) => x.querySelector('.rw-label') ? x.querySelector('.rw-label').textContent : x.textContent);
  T(['コースを選んで練習', '初見チャートの認定試験', '上級ポジション管理の練習', '同じ相場・3判断比較', '思い込みを見抜く', '資金管理・連敗耐性試験', '成績・分析'].every((k) => labels.some((l) => l.indexOf(k) >= 0)), '道場のメニューに Lv1〜Lv8・上級ポジション管理・3判断比較・思い込みを見抜く・資金管理の演習が並ぶ');
  // ---- A ----
  click(item('同じ相場・3判断比較')); const c3 = await wait(() => doc.querySelector('#ui .c3-panel')); T(!!c3 && !!c3.querySelector('#c3-chart.chart-ctl') && /同時に登録/.test(c3.textContent), 'A：3 つの計画を同時に登録する画面（チャートは操作できる）');
  c3.querySelector('#c3-side').value = 'buy'; c3.querySelector('#c3-rrb').value = '3'; c3.querySelector('#c3-why').value = 'range'; click(c3.querySelector('[data-cmd="go"]'));
  const rv = await wait(() => doc.querySelector('#ui .pd-review .c3-tbl')); const rvText = rv ? rv.closest('.pd-review').textContent : '';
  T(!!rv && ['決めた時刻', 'エントリー（約定）', '損切りの距離', '利確の距離', '想定 RR', 'ロット', 'net pips', '実現 R', 'MFE／MAE', '最大の含み損', '根拠（条件の成否）', '見送りの理由'].every((k) => rvText.indexOf(k) >= 0) && /レンジの中ほど/.test(rvText), 'A：結果の表（時刻・方向・価格・距離・RR・ロット・pips・R・MFE/MAE・最大の含み損・根拠・見送りの理由）');
  T(p.cmp3.n === 1 && p.cmp3.log[0].firstSeen === true && p.history.length === hist0 && p.capital === cap0, 'A：初見の記録 1 件（道場の成績・仮想資金は変えない）');
  click(rv.closest('.pd-review').querySelector('[data-cmd="replay"]')); const rp = await wait(() => [...doc.querySelectorAll('#ui .practice-panel')].find((x) => /反実仮想の復習/.test(x.textContent)));
  T(!!rp && p.cmp3.reviews === 1, 'A：分岐ごとの再生（反実仮想の復習。初見の成績には入れない）'); click(rp.querySelector('[data-br="1"]')); click(rp.querySelector('[data-cmd="s10"]')); await frames(1); T(/開始から \d+分/.test(rp.querySelector('#c3r-st').textContent), 'A：再生で足を進める（' + rp.querySelector('#c3r-st').textContent + '）');
  click(rp.querySelector('[data-cmd="back"]')); const rv2 = await wait(() => doc.querySelector('#ui .pd-review .c3-tbl')); click(rv2.closest('.pd-review').querySelector('[data-cmd="end"]'));
  T(p.cmp3.log.length === 1 && p.cmp3.n === 1, 'A：再生しても初見の記録は増えない（' + p.cmp3.n + '回・復習 ' + p.cmp3.reviews + '回）');
  // ---- B ----
  await wait(() => item('思い込みを見抜く')); click(item('思い込みを見抜く')); const sp = await wait(() => doc.querySelector('#ui .sp-panel'));
  const seed = PUI.current && PUI.current.play ? null : null; const claims = [...sp.querySelectorAll('[data-c]')]; T(claims.length >= 4 && /正しい主張もまじっている/.test(sp.textContent), 'B：解説の主張 ' + claims.length + ' 件を選ぶ画面（正しい主張もまじる）');
  // 出題された問題の真偽を、同じ seed から作り直して知る（テストのため）
  const lastSeed = p.recent[p.recent.length - 1]; const set = TR.spotClaims(lastSeed); const wrongIds = set.claims.filter((c) => !c.truth).map((c) => c.id);
  T(set.claims.every((c, i) => claims[i].parentElement.textContent.indexOf(c.text) >= 0), 'B：画面の主張と、asOf の事実から作った主張が同じ');
  claims.forEach((c) => { c.checked = wrongIds.indexOf(c.getAttribute('data-c')) >= 0; }); const rightOne = set.claims.find((c) => c.truth); claims.find((c) => c.getAttribute('data-c') === rightOne.id).checked = true; click(sp.querySelector('[data-cmd="go"]'));
  const sr = await wait(() => [...doc.querySelectorAll('#ui .pd-review')].find((x) => /思い込みを見抜く：結果/.test(x.textContent)));
  T(!!sr && /証拠：/.test(sr.textContent) && /正しい解釈：/.test(sr.textContent) && /誤認率 \d/.test(sr.textContent), 'B：振り返りに 証拠（時間足・指標・値）・正しい解釈・検出率・誤認率');
  T(p.spot.n === 1 && p.spot.hit === wrongIds.length && p.spot.falseAlarm === 1, 'B：記録（見つけた誤り ' + p.spot.hit + '/' + p.spot.falseN + '・言いがかり ' + p.spot.falseAlarm + '）');
  click(sr.querySelector('.rw-panel-close')); await frames(2);
  // ---- C ----
  await wait(() => item('資金管理・連敗耐性試験')); click(item('資金管理・連敗耐性試験')); const sv = await wait(() => doc.querySelector('#ui .sv-panel'));
  click(sv.querySelector('[data-cmd="calc"]')); await frames(1); T(/73\.97%/.test(sv.querySelector('#sv-out').textContent), 'C：1%・30連敗 → 73.97%（' + sv.querySelector('#sv-out').textContent.slice(0, 60) + '…）');
  click(sv.querySelector('[data-cmd="cmp15"]')); await frames(1); T(/73\.97%/.test(sv.querySelector('#sv-out').textContent) && /21\.46%/.test(sv.querySelector('#sv-out').textContent), 'C：1% と 5% の比べ（73.97%・21.46%）');
  sv.querySelector('#sv-r').value = '100'; click(sv.querySelector('[data-cmd="calc"]')); await frames(1); T(/計算できない/.test(sv.querySelector('#sv-err').textContent), 'C：100% のリスクは計算しない（理由を出す）');
  sv.querySelector('#sv-r').value = '0'; click(sv.querySelector('[data-cmd="calc"]')); await frames(1); T(/0 より大きく/.test(sv.querySelector('#sv-err').textContent), 'C：0% も受け付けない');
  sv.querySelector('#sv-r').value = '1'; sv.querySelector('#sv-mode').value = 'yen'; click(sv.querySelector('[data-cmd="calc"]')); await frames(1); T(/70\.00%/.test(sv.querySelector('#sv-out').textContent), 'C：固定の円の額（1%）→ 70.00%');
  click(sv.querySelector('[data-cmd="sizing"]')); await frames(1); T(/マーチンゲール/.test(sv.querySelector('#sv-cmp').textContent) && /勝ったときだけ/.test(sv.querySelector('#sv-cmp').textContent), 'C：資金の決め方の比べ（一定・固定額・マーチンゲール・勝ったときだけ増やす）');
  T(/実際の相場の予測ではない/.test(sv.textContent) && /すすめない/.test(sv.textContent), 'C：理論式は理想的な仮定・マーチンゲールはすすめない と表示');
  click(sv.querySelector('[data-cmd="end"]')); T(p.survival.runs >= 3 && d.gold === gold0, 'C：記録（' + p.survival.runs + '回）・ゲームのお金は変わらない');
  // ---- D（試験の問題数を 3 に縮めて通しで） ----
  const N0 = TR.EXAM_N; TR.EXAM_N = 3; await wait(() => item('初見チャートの認定試験')); click(item('初見チャートの認定試験'));
  const ch = await wait(() => opt('新しいセットで受ける')); click(ch);
  async function answerOne(quitAfter) { await wait(() => doc.querySelector('#ui .practice-panel #pd-chart')); const pl = PUI.current.play; const txt = doc.querySelector('#ui .practice-panel').textContent;
    const noHint = !doc.querySelector('#ui .practice-panel [data-cmd="hint"]') && !doc.querySelector('#ui .practice-panel [data-cmd="slhelp"]'); const noCat = pl.cat ? txt.indexOf(PE.cat(pl.cat).title) < 0 : true;
    const sn = PE.snap(pl); pl.answers = { '1d': sn.htf['1d'].insufficient ? 'unknown' : sn.htf['1d'].dir, '4h': sn.htf['4h'].insufficient ? 'unknown' : sn.htf['4h'].dir }; pl.focus = {}; PE.focusQuestions(8, sn).forEach((q) => { pl.focus[q.key] = q.options[0][0]; }); pl.bias = 'neutral';
    click(doc.querySelector('#ui .practice-panel [data-cmd="hyp"]')); await frames(1); click(doc.querySelector('#ui .practice-panel [data-cmd="skip"]'));
    const af = await wait(() => doc.querySelector('#ui .pd-exam-after')); const afText = af ? af.textContent : ''; click(af && af.querySelector('[data-cmd="' + (quitAfter ? 'quit' : 'again') + '"]')); await frames(2);
    return { pl, noHint, noCat, after: !!af && !/学ぶこと|問題の型：/.test(afText) && /結果・問題の型・模範解答を出さない/.test(afText) }; }
  const q1 = await answerOne(true); T(q1.pl.gen === 'B' && q1.pl.exam && q1.noHint && q1.noCat, 'D：試験の問題は系列 B・ヒントなし・型の名前を出さない');
  T(q1.after, 'D：1 問ごとの画面では、結果・型・模範解答を出さない（試験の終わりにまとめて）');
  T(p.series && p.series.done === 1 && p.series.usedSeeds.length === 1 && p.examSeen[p.series.usedFps[0]] === 1, 'D：中断 → 使った seed・指紋をセーブに残す（' + p.series.done + '/' + p.series.n + '）');
  // 再読み込み（セーブを写して読み直す）→ 続きから
  const saved = JSON.parse(JSON.stringify(d.practice)); d.practice = saved; const p2 = PUI.ensure(d);
  await wait(() => item('初見チャートの認定試験')); click(item('初見チャートの認定試験')); const cont = await wait(() => opt('続きから')); T(!!cont && /1\/3/.test(cont.textContent), 'D：再開すると「続きから（1/3問）」'); click(cont);
  const q2 = await answerOne(false); const q3 = await answerOne(false);
  const fin = await wait(() => [...doc.querySelectorAll('#ui .pd-review')].find((x) => /認定試験（v2）の結果/.test(x.textContent)));
  const used = [q1.pl.seed, q2.pl.seed, q3.pl.seed]; T(new Set(used).size === 3, 'D：中断と再開をまたいでも同じ問題を出さない（' + used.join(',') + '）');
  T(!!fin && /判定保留/.test(fin.textContent) && /問題ごとの振り返り/.test(fin.textContent) && /実際の相場で勝てることの認定ではない/.test(fin.textContent), 'D：終わり：3 問だけなので「判定保留」・問題ごとの振り返り・「勝てる認定ではない」');
  const ex = p2.history.filter((x) => x.set === 'exam' && x.examV === 2); T(ex.length === 3 && ex.every((x) => x.seriesId && x.gen === 'B' && x.familyId), 'D：記録 3 件（試験の版 2・系列 B・群・試験の番号）');
  click(fin.querySelector('.rw-panel-close')); await frames(2); T(p2.series === null && p2.examRuns.length === 1, 'D：試験の結果をまとめて残す（' + p2.examRuns.length + '回）');
  TR.EXAM_N = N0;
  // メニューを閉じる
  const quit = await wait(() => item('やめる')); click(quit); await wait(() => menuDone, 50); T(menuDone, 'メニューを閉じられる');
  T(d.gold === gold0 && p2.capital === cap0, 'どの演習でも、ゲームのお金・道場の仮想資金は変わらない');
  // 旧セーブ（v9.0：practice に cmp3 などがない・連続演習が途中）
  const old = { practice: { v: 1, capital: 900000, history: [{ kind: 'skip', t: 1, capitalAfter: 900000 }], series: { n: 30, done: 4, startedAt: 5 }, recent: [], psych: { answers: {}, log: [] } } };
  const po = PUI.ensure(old); T(po.cmp3 && po.spot && po.survival && po.examSeen && Array.isArray(po.examRuns) && po.series === null && po.seriesLegacy && po.seriesLegacy.done === 4 && po.history.length === 1 && po.capital === 900000, '旧セーブ：新しい演習の記録を足し、v9.0 の途中の連続演習は消さずに seriesLegacy に残す');
  T(A.errors.length === 0, '読み込み・操作のエラーなし ' + JSON.stringify(A.errors.slice(0, 3)));
  console.log('結果: ' + okN + ' OK / ' + ng.length + ' NG'); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
