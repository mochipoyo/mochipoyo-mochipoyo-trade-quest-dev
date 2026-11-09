// もちぽよ実践トレード道場の画面の流れ（jsdom。実機・実ブラウザではない）：node tl_ui_test.js [2d]
//   入口（メニュー「トレード」）→ A 環境認識 → B 仮説 → C 足送り → D 条件確認 → E 不正な注文は発注できない → 正しい注文 → F 保有 → G 振り返り → 記録
//   見送り・時間切れの区別、答え（型・シード）を振り返りまで出さない、旧セーブの互換
const path = require('path'); const load = require(path.resolve(__dirname, '../v78/load78.js'));
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const doc = w.document;
const { Engine: E, State, World, Menu } = w; const Input = E.Input; const PUI = w.PracticeUI, PE = w.PracticeEngine;
let okN = 0; const ng = []; const T = (c, m) => { if (c) okN++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const frames = async (n) => { for (let i = 0; i < n; i++) await sleep(17); };
const top = () => doc.getElementById('ui').lastElementChild; const click = (n) => n && n.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
function clean() { doc.querySelectorAll('#ui > *').forEach((n) => n.remove()); E.scenes = E.scenes.filter((s) => !s.overlay); World.busy = false; }
const q = (s) => doc.querySelector('#ui .practice-panel ' + s);
(async () => {
  try { Input.init(); } catch (e) { }
  w.MochiQuest && w.MochiQuest.boot && w.MochiQuest.boot(); await frames(5); clean();
  State.newGame('テスト', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); await frames(4); clean();
  console.log('== ' + (two ? '2D 版' : '3D 版と同じ読み込み') + '　読み込みのエラー ' + A.errors.length);
  const E0 = Menu.entries(); T(E0.trade.some((x) => x.label === 'もちぽよ実践トレード道場'), 'メニュー「トレード」に「もちぽよ実践トレード道場」');
  T(E0.trade.some((x) => x.label === 'トレード修行') && E0.trade.some((x) => x.label === 'トレード成績・振り返り'), '今までのトレードの項目はそのまま');
  T(/key: 'mochipoyo'/.test(require('fs').readFileSync(path.resolve(__dirname, '../../../js/ui/dojo.js'), 'utf8')) && /PracticeUI\.menu/.test(require('fs').readFileSync(path.resolve(__dirname, '../../../js/data/academy.js'), 'utf8')), '師匠の修行場・学院（聴講生）からも開ける');
  const p = PUI.ensure(d); T(p && p.capital === 1000000 && Array.isArray(p.history), 'セーブに practice（仮想資金 100万円・記録）');
  const S = w.PRACTICE_SEEDS; const sd = S.learn.similar[1]; const cat = PE.cat('similar');
  // ---- 1問目：発注まで ----
  let res = null; const pr = PUI.play({ level: 6, lvDef: PUI.LEVELS[5], pick: { seed: sd, cat: 'similar', set: 'learn' } }); pr.then((r) => { res = r; }); await frames(4);
  const panel = doc.querySelector('#ui .practice-panel'); T(!!panel && !!q('#pd-chart'), '道場の画面が開く（チャート・時間足のボタン）');
  T(/環境認識/.test(q('#pd-phase').textContent), '最初は［環境認識］');
  const txt0 = panel.textContent; T(txt0.indexOf(cat.title) < 0 && txt0.indexOf(String(sd)) < 0 && !/similar|似た見た目/.test(txt0), '問題の型の名前・シードは、振り返りまで出さない');
  T(/架空の相場/.test(txt0) && !/勝てる|利益を保証|必ず成功/.test(txt0), '架空の相場と書く。「勝てる・利益を保証・必ず成功」とは書かない');
  click(q('[data-cmd="hyp"]')); await frames(1); T(/A の設問/.test(q('#pd-msg').textContent), 'A の設問に答える前は仮説を登録できない（案内が出る）');
  click(q('.tf[data-tf="1d"]')); await frames(1); T(PUI.current.view.tf === '1d' && PUI.current.play.viewed['1d'] && /日足/.test(q('#pd-forming').textContent), '日足を開く（「上位足を見た」と記録・確定足の本数を表示）'); click(q('.tf[data-tf="4h"]')); await frames(1);
  const sn0 = PE.snap(PUI.current.play);
  const ans = (t) => (sn0.htf[t].insufficient ? 'unknown' : sn0.htf[t].dir);
  click(q('.aopt[data-q="1d"][data-v="' + ans('1d') + '"]')); click(q('.aopt[data-q="4h"][data-v="' + ans('4h') + '"]')); click(q('.aopt[data-bias="buy"]')); await frames(1);
  click(q('[data-cmd="hyp"]')); await frames(2); T(!q('#pd-C').classList.contains('hidden') && /条件待ち/.test(q('#pd-phase').textContent) && PUI.current.play.hypothesis, '仮説を登録 → ［条件待ち］・足送りのボタン');
  const as0 = PUI.current.play.asOf; click(q('[data-cmd="step"]')); await frames(1); T(PUI.current.play.asOf === as0 + PUI.current.play.step && PUI.current.play.steps === 1, '1本進める（' + PE.tfLabel(PUI.current.play.entryTF) + '1本＝5分足 ' + PUI.current.play.step + '本）');
  const v1 = PE.view(PE.game(PUI.current.play), PUI.current.play.entryTF, PUI.current.play.asOf); T(v1.candles.length && v1.asOf === PUI.current.play.asOf, '見えている足は判断の時点まで（それより先は渡さない）');
  click(q('[data-cmd="check"]')); await frames(1); T(!q('#pd-D').classList.contains('hidden') && /条件の確認/.test(q('#pd-phase').textContent), 'エントリーを検討 → D 条件の確認');
  click(q('[data-cmd="hint"]')); await frames(1); T(/RCI\(9\)/.test(q('#pd-hint').textContent) && PUI.current.play.hintsUsed === 1, 'ヒント（初心者）：いまの足の数値。使った回数は記録');
  q('[data-ev="htf"]').checked = true; click(q('[data-cmd="long"]')); await frames(1); T(!q('#pd-E').classList.contains('hidden') && /発注可能候補/.test(q('#pd-phase').textContent), 'ロング → E 注文［発注可能候補：注文の確認］');
  const sn1 = PE.snap(PUI.current.play); const ref = sn1.entry.swing.low; const e = sn1.entry.close;
  q('#pd-sl').value = (e + 0.2).toFixed(3); q('#pd-tp').value = (e + 0.6).toFixed(3); q('#pd-sl').dispatchEvent(new w.Event('input', { bubbles: true })); await frames(1);
  T(/発注できない/.test(q('#pd-err').textContent) && /下に置く/.test(q('#pd-err').textContent), '損切りがエントリーより上：どの値が不正かを具体的に出す（' + q('#pd-err').textContent.slice(0, 50) + '…）');
  click(q('[data-cmd="order"]')); await frames(1); T(!PUI.current.play.entry && PUI.current.play.phase !== 'holding', '不正な注文は発注しない（入れ直し）');
  q('#pd-sl').value = ''; q('#pd-sl').dispatchEvent(new w.Event('input', { bubbles: true })); await frames(1); T(/損切りが入力されていない/.test(q('#pd-err').textContent), '損切りが空欄：損切りは必須');
  click(q('[data-cmd="slhelp"]')); await frames(1); click(q('[data-cmd="tphelp"]')); await frames(1);
  T(!q('#pd-err').textContent.match(/発注できない/) && /予想最大損失/.test(q('#pd-calc').textContent) && /損益分岐の勝率/.test(q('#pd-calc').textContent), '損切り（確定した安値の外側）・利確（RR 1:2）：予想最大損失・RR・損益分岐の勝率を出す');
  click(q('[data-cmd="order"]')); await frames(1); const pl = PUI.current.play; T(pl.phase === 'holding' && pl.entry && pl.entry.order.sl < pl.entry.order.entry && /保有中/.test(q('#pd-phase').textContent), '発注 → ［保有中］（損切りはエントリーより下）');
  click(q('[data-cmd="hplay"]')); for (let i = 0; i < 400 && !res; i++) await frames(2);
  const rv = doc.querySelector('#ui .pd-review'); T(!!rv && /判断の過程/.test(rv.textContent) && /結果（判断の点とは別）/.test(rv.textContent), '決済まで進む → G 振り返り（判断の過程の点と、結果は別の欄）');
  T(rv && rv.textContent.indexOf(cat.title) >= 0 && /学習用の問題/.test(rv.textContent), '振り返りで問題の型と「学習用の問題」を出す');
  T(rv && /あなたの仮説（開始の時点で登録）：買い目線/.test(rv.textContent), '振り返りに、登録した仮説（目線）と実際の判断を並べる');
  T(rv && ['環境認識', 'セットアップ', 'トリガー', '執行・資金管理', '規律'].every((k) => rv.textContent.indexOf(k) >= 0), '採点の内訳：環境認識・セットアップ・トリガー・執行・資金管理・規律');
  click(rv && rv.querySelector('[data-cmd="end"]')); for (let i = 0; i < 100 && !res; i++) await frames(2);
  T(res && res.record && res.record.kind === 'trade' && d.practice.history.length === 1 && isFinite(res.record.riskR) && res.next === 'quit', '記録：取引 1（riskR ' + (res && res.record.riskR) + '・判断 ' + (res && res.record.process) + '点）');
  T(d.practice.capital === res.record.capitalAfter, '仮想資金に損益を反映（' + d.practice.capital.toLocaleString() + '円）');
  // ---- 2問目：見送り ----
  clean(); res = null; const pr2 = PUI.play({ level: 2, lvDef: PUI.LEVELS[1], pick: { seed: S.learn.rci_touch[0], cat: 'rci_touch', set: 'learn' } }); pr2.then((r) => { res = r; }); await frames(4);
  const sn2 = PE.snap(PUI.current.play); ['1d', '4h'].forEach((t) => click(q('.aopt[data-q="' + t + '"][data-v="' + (sn2.htf[t].insufficient ? 'unknown' : sn2.htf[t].dir) + '"]')));
  T(!!q('.aopt[data-fq="rci"]'), 'Lv2：RCI の状態の読み取りの設問'); click(q('.aopt[data-fq="rci"]')); click(q('.aopt[data-bias="neutral"]')); await frames(1); click(q('[data-cmd="hyp"]')); await frames(1);
  click(q('[data-cmd="step"]')); await frames(1); click(q('[data-cmd="skip"]')); for (let i = 0; i < 60 && !doc.querySelector('#ui .pd-review'); i++) await frames(2);
  const rv2 = doc.querySelector('#ui .pd-review'); T(rv2 && /自分で見送った/.test(rv2.textContent) && /読み取り/.test(rv2.textContent), '見送り：振り返りに「自分で見送った」と読み取りの採点');
  click(rv2 && rv2.querySelector('[data-cmd="again"]')); for (let i = 0; i < 60 && !res; i++) await frames(2); T(res && res.next === 'again' && res.record.kind === 'skip', '「次の問題」を選べる（見送りの記録）');
  // ---- 3問目：時間切れ ----
  clean(); res = null; const pr3 = PUI.play({ level: 1, lvDef: PUI.LEVELS[0], pick: { seed: S.learn.early[0], cat: 'early', set: 'learn' } }); pr3.then((r) => { res = r; }); await frames(4);
  const pl3 = PUI.current.play; pl3.answers = { '1d': 'up', '4h': 'up' }; pl3.focus = { ema: 'up', dow: 'up' }; pl3.bias = 'buy'; click(q('[data-cmd="hyp"]')); await frames(1);
  for (let i = 0; i < 60 && !doc.querySelector('#ui .pd-review'); i++) { PUI.current.ctl.step(); await frames(1); }
  const rv3 = doc.querySelector('#ui .pd-review'); T(rv3 && /時間切れ/.test(rv3.textContent) && pl3.steps === pl3.maxSteps, '待てる本数（' + pl3.maxSteps + '本）を過ぎると時間切れ（自分の見送りと区別）');
  click(rv3 && rv3.querySelector('[data-cmd="end"]')); for (let i = 0; i < 60 && !res; i++) await frames(2); T(res && res.record.kind === 'timeout', '時間切れの記録');
  // ---- 中断 ----
  clean(); res = 'x'; const pr4 = PUI.play({ level: 1, lvDef: PUI.LEVELS[0] }); pr4.then((r) => { res = r; }); await frames(4); click(q('[data-cmd="quit"]')); await frames(3);
  const qb = [...doc.querySelectorAll('#ui .rw-choice .rw-opt')].find((x) => /中断|やめる/.test(x.textContent)); click(qb); await frames(1); click(qb); for (let i = 0; i < 60 && res === 'x'; i++) await frames(2);
  T(res === null && d.practice.history.length === 3, '中断：採点・記録しない（記録は 3 件のまま）');
  // ---- 成績・心理・設定 ----
  clean(); const sp = PUI.stats(); await frames(3); const stp = doc.querySelector('#ui .pd-stats-panel'); T(stp && /サンプル|回数が少ない/.test(stp.textContent) && /定義/.test(stp.textContent) && /未知の問題/.test(stp.textContent) && /上位足を見ずに/.test(stp.textContent), '成績：少ないサンプルの注意・定義・学習用／未知の問題・上位足を見た／見ないを分ける');
  click(stp && stp.querySelector('.rw-panel-close')); await sp;
  T(Array.isArray(w.PRACTICE_PSYCH) && w.PRACTICE_PSYCH.length >= 9 && w.PRACTICE_PSYCH.every((x) => x.options[x.best].tag === 'rule'), 'トレード心理の演習：' + w.PRACTICE_PSYCH.length + '問（ルールに沿った行動が答え。利益を取ることが答えではない）');
  T(/医療的/.test(require('fs').readFileSync(path.resolve(__dirname, '../../../js/ui/practiceui.js'), 'utf8')), '心理の結果は医療的な診断として扱わないと書く');
  // ---- 上級の対戦（トレードマスター）：リスクR対戦を 1 回（見送りで終える） ----
  if (w.TradeDuel90) { clean(); const msgs = []; const om = w.Win.message, oc = w.Win.choice; let ci = 0; w.Win.message = async (L) => { msgs.push([].concat(L).join(' ')); }; w.Win.choice = async () => (ci++ === 0 ? 0 : 1);
    const info = { short: 'テスト', styleName: '万能', style: 'all', skill: 0.6, seed: 99 }; let fin = false; const gold0 = d.gold; const pt = w.TradeDuel90.talk({ name: 'トレードマスター・テスト' }, info, async (L) => { msgs.push([].concat(L).join(' ')); }); pt.then(() => { fin = true; });
    for (let i = 0; i < 60 && !doc.querySelector('#ui .practice-panel'); i++) await frames(2);
    const pl5 = PUI.current.play; pl5.answers = { '1d': 'up', '4h': 'up' }; pl5.bias = 'neutral'; click(q('[data-cmd="hyp"]')); await frames(1); click(q('[data-cmd="skip"]'));
    for (let i = 0; i < 60 && !doc.querySelector('#ui .pd-review'); i++) await frames(2); click(doc.querySelector('#ui .pd-review [data-cmd="end"]')); for (let i = 0; i < 120 && !fin; i++) await frames(2);
    w.Win.message = om; w.Win.choice = oc; const t = w.TradeMaster83.ensure(d);
    T(fin && msgs.some((m) => /上級の対戦：/.test(m) && /賞金はない/.test(m)) && d.gold === gold0 && (t.adv90.riskR.w + t.adv90.riskR.l + t.adv90.riskR.d) === 1, '上級の対戦（リスクR対戦）：同じ問題で相手と比べ、記録だけ残る（賞金なし。ゴールドは変わらない）'); }
  State.data = State.migrate(JSON.parse(JSON.stringify(d))); T(State.data.practice.history.length >= 3, 'セーブとして書き出して読み込んでも道場の記録が残る（' + State.data.practice.history.length + '件）');
  T(!A.errors.length, '読み込みのエラーなし ' + JSON.stringify(A.errors.slice(0, 3)));
  console.log('結果: ' + okN + ' OK / ' + ng.length + ' NG'); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
