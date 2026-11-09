// Phase 7・8 の画面の確かめ（jsdom。実機・実ブラウザではない）：node docs/tools/tl2/tl7_ui_test.js [2d]
//   チャートの操作（ドラッグ・ホイール・ピンチ・ダブルタップ・長押しの十字線・キー）・エントリー足の選択・高値安値の指定・損切り／利確の線のドラッグ・
//   上級のポジション管理（建値・部分決済・トレーリング・早めの決済）・後片付け（イベントの数が戻る）
const path = require('path'); const load = require(path.resolve(__dirname, '../v78/load78.js'));
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const doc = w.document;
const { Engine: E, State, World } = w; const Input = E.Input; const PUI = w.PracticeUI, PE = w.PracticeEngine, CC = w.ChartCtl;
let okN = 0; const ng = []; const T = (c, m) => { if (c) okN++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const frames = async (n) => { for (let i = 0; i < n; i++) await sleep(17); };
const click = (n) => n && n.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
function clean() { doc.querySelectorAll('#ui > *').forEach((n) => n.remove()); E.scenes = E.scenes.filter((s) => !s.overlay); World.busy = false; }
const q = (s) => doc.querySelector('#ui .practice-panel ' + s);
// Pointer Events（jsdom に PointerEvent がないので MouseEvent に pointerId・pointerType を足す）
function ptr(el, type, x, y, id, kind, buttons) { const e = new w.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, buttons: buttons === undefined ? (type === 'pointerup' ? 0 : 1) : buttons }); Object.defineProperty(e, 'pointerId', { value: id || 1 }); Object.defineProperty(e, 'pointerType', { value: kind || 'mouse' }); el.dispatchEvent(e); return e; }
function wheel(el, x, y, dy, shift) { const e = new w.WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: x, clientY: y, deltaY: dy, shiftKey: !!shift }); el.dispatchEvent(e); return e; }
function key(el, k, shift) { el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, shiftKey: !!shift, bubbles: true, cancelable: true })); }
(async () => {
  try { Input.init(); } catch (e) { }
  w.MochiQuest && w.MochiQuest.boot && w.MochiQuest.boot(); await frames(5); clean();
  State.newGame('テスト', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); await frames(4); clean();
  console.log('== ' + (two ? '2D 版' : '3D 版と同じ読み込み') + '　読み込みのエラー ' + A.errors.length);
  const S = w.PRACTICE_SEEDS; const L0 = w.ChartCtl.active;
  // ---- 1問目：チャートの操作・エントリー足・高値安値の指定・損切り／利確の線（基本のルール） ----
  let res = null; const pr = PUI.play({ level: 1, lvDef: PUI.LEVELS[0], pick: { seed: S.learn.early[2], cat: 'early', set: 'learn' }, advanced: false }); pr.then((r) => { res = r; }); await frames(4);
  const cv = q('#pd-chart'); const V = PUI.current.view; const play = PUI.current.play;
  T(cv && cv.classList.contains('chart-ctl') && w.ChartCtl.active === L0 + 1 && doc.body.classList.contains('pd-chart-open'), 'チャートに操作を付けた（touch-action はチャートだけ）・RPG の十字キーを隠す印');
  T(/touch-action: none/.test(require('fs').readFileSync(path.resolve(__dirname, '../../../styles.css'), 'utf8').match(/canvas\.chart\.chart-ctl \{[^}]*\}/)[0]) && /body\.pd-chart-open #pad \{ display: none/.test(require('fs').readFileSync(path.resolve(__dirname, '../../../styles.css'), 'utf8')), 'CSS：チャートの canvas だけ touch-action: none・十字キーは隠す');
  const mp = () => cv._map; const N = V.count;
  // マウスのドラッグ → 過去へ
  ptr(cv, 'pointerdown', 300, 80, 1, 'mouse'); ptr(cv, 'pointermove', 360, 80, 1, 'mouse'); ptr(cv, 'pointermove', 420, 80, 1, 'mouse'); ptr(cv, 'pointerup', 420, 80, 1, 'mouse'); await frames(1);
  T(V.end !== null && V.end < N - 1 && mp().end === V.end, 'マウスで右へドラッグ → 過去の足を表示（右端 ' + V.end + '／最新 ' + (N - 1) + '）');
  ptr(cv, 'pointerdown', 300, 80, 1, 'mouse'); ptr(cv, 'pointermove', 100, 80, 1, 'mouse'); ptr(cv, 'pointermove', -800, 80, 1, 'mouse'); ptr(cv, 'pointerup', -800, 80, 1, 'mouse'); await frames(1);
  T(V.end === null && mp().end === N - 1, '左へドラッグしても最新の足より先（未来）は出ない（最新で止まる）');
  // ホイール
  const v0 = V.visible; wheel(cv, 300, 80, -100); await frames(1); T(V.visible < v0, 'ホイール（上）→ 拡大（' + v0 + '→' + V.visible + '本）'); wheel(cv, 300, 80, 100); wheel(cv, 300, 80, 100); await frames(1); T(V.visible > v0 - 1, 'ホイール（下）→ 縮小（' + V.visible + '本）');
  wheel(cv, 300, 80, -200, true); await frames(1); T(V.end !== null, 'Shift＋ホイール → 横スクロール');
  // ピンチ（2 本指）
  click(q('[data-cmd="vreset"]')); await frames(1); T(V.end === null && V.visible === 72, '「最新へ」で元に戻す（72本・最新）');
  ptr(cv, 'pointerdown', 250, 100, 11, 'touch'); ptr(cv, 'pointerdown', 350, 100, 12, 'touch'); ptr(cv, 'pointermove', 200, 100, 11, 'touch'); ptr(cv, 'pointermove', 400, 100, 12, 'touch'); ptr(cv, 'pointerup', 200, 100, 11, 'touch'); ptr(cv, 'pointerup', 400, 100, 12, 'touch'); await frames(1);
  T(V.visible === 36, 'ピンチアウト（指の間 100→200px）→ 拡大（72→' + V.visible + '本）');
  ptr(cv, 'pointerdown', 200, 100, 13, 'touch'); ptr(cv, 'pointerdown', 400, 100, 14, 'touch'); ptr(cv, 'pointermove', 280, 100, 13, 'touch'); ptr(cv, 'pointermove', 320, 100, 14, 'touch'); ptr(cv, 'pointerup', 280, 100, 13, 'touch'); ptr(cv, 'pointerup', 320, 100, 14, 'touch'); await frames(1);
  T(V.visible > 36, 'ピンチイン → 縮小（' + V.visible + '本）');
  // ダブルタップ
  click(q('[data-cmd="vreset"]')); await frames(1);
  for (let k = 0; k < 2; k++) { ptr(cv, 'pointerdown', 300, 90, 20 + k, 'touch'); ptr(cv, 'pointerup', 300, 90, 20 + k, 'touch'); await sleep(40); } await frames(1);
  T(V.visible === 36 && !V.cross, 'ダブルタップ → 拡大（十字線は残さない）'); for (let k = 0; k < 2; k++) { ptr(cv, 'pointerdown', 300, 90, 30 + k, 'touch'); ptr(cv, 'pointerup', 300, 90, 30 + k, 'touch'); await sleep(40); } await frames(1); T(V.visible === 72 && V.end === null, 'もう一度ダブルタップ → 元に戻す');
  // 長押しの十字線（タッチ）→ 指を動かすと十字線が動く
  ptr(cv, 'pointerdown', 300, 60, 40, 'touch'); await sleep(450); const c1 = V.cross && V.cross.index; ptr(cv, 'pointermove', 360, 60, 40, 'touch'); const c2 = V.cross && V.cross.index; ptr(cv, 'pointerup', 360, 60, 40, 'touch'); await frames(1);
  T(c1 !== null && c1 !== undefined && c2 > c1 && /本前|最新/.test(q('#pd-cross').textContent) && /EMA20/.test(q('#pd-cross').textContent) && /RCI/.test(q('#pd-cross').textContent), '長押し → 十字線・指を動かすと動く（' + c1 + '→' + c2 + '）・OHLC と指標の値を出す');
  T(V.cross.index <= N - 1, '十字線は判断の時点までの足の上だけ');
  // マウス：動かすだけで十字線・外へ出ると消える
  ptr(cv, 'pointermove', 200, 70, 50, 'mouse', 0); T(V.cross && V.cross.index === mp().xToIndex(200), 'マウスを動かす → 十字線'); const le = new w.MouseEvent('pointerleave', { bubbles: false }); Object.defineProperty(le, 'pointerType', { value: 'mouse' }); Object.defineProperty(le, 'pointerId', { value: 50 }); cv.dispatchEvent(le); T(!V.cross && q('#pd-cross').textContent === '', 'チャートの外へ → 十字線を消す');
  // キー
  key(cv, 'Enter'); T(V.cross && V.cross.index === N - 1, 'Enter → 最新の足に十字線'); key(cv, 'ArrowLeft'); key(cv, 'ArrowLeft'); T(V.cross.index === N - 3, '← で十字線を 1 本ずつ過去へ'); key(cv, 'Escape'); T(!V.cross, 'Esc で十字線を消す');
  key(cv, 'ArrowLeft', true); T(V.end !== null, 'Shift＋← でスクロール'); key(cv, '+'); T(V.visible < 72, '＋ で拡大'); key(cv, '0'); T(V.visible === 72 && V.end === null, '0 で元に戻す');
  // エントリー足の選択（5分足）
  const tf0 = play.entryTF; const other = tf0 === '15m' ? '5m' : '15m'; click(q('.aopt[data-etf="' + other + '"]')); await frames(1);
  T(play.entryTF === other && V.tf === other && q('.aopt[data-etf="' + other + '"]').classList.contains('on') && q('.tf[data-tf="' + other + '"]').textContent.indexOf('★') >= 0, 'B：エントリー足を ' + PE.tfLabel(other) + ' に変える（★の印も移る・同じ時刻のまま）');
  // 高値・安値の指定（確定した山谷に吸い付く）
  click(q('.aopt[data-pick="high"]')); await frames(1); T(V.pick === 'high', '「高値をタップで指定」→ 指定の待ち');
  const v = PE.view(PE.game(play), V.tf, play.asOf); const pv = w.SignalEngine.pivots(v.candles, w.CONFIG.zigzag.depth, v.candles.length - 1); const lastH = pv.confirmed.filter((x) => x.type === 'high').slice(-1)[0];
  const M = mp(); ptr(cv, 'pointerdown', M.xOf(lastH.index) + 4, M.yOf(lastH.price) + 6, 60, 'mouse'); ptr(cv, 'pointerup', M.xOf(lastH.index) + 4, M.yOf(lastH.price) + 6, 60, 'mouse'); await frames(1);
  T(play.picks && play.picks.high && play.picks.high.ok && play.picks.high.price === lastH.price && /合っている/.test(q('#pd-pickres').textContent), '直近の確定した高値の近くをタップ → 吸い付いて「合っている」（' + lastH.price + '）');
  const lastL = pv.confirmed.filter((x) => x.type === 'low').slice(-2)[0]; click(q('.aopt[data-pick="low"]')); await frames(1); const M2 = mp();
  if (lastL && lastL.index >= M2.start) { ptr(cv, 'pointerdown', M2.xOf(lastL.index), M2.yOf(lastL.price) + 3, 61, 'mouse'); ptr(cv, 'pointerup', M2.xOf(lastL.index), M2.yOf(lastL.price) + 3, 61, 'mouse'); await frames(1);
    T(play.picks.low && (play.picks.low.ok === (lastL === pv.confirmed.filter((x) => x.type === 'low').slice(-1)[0])), '古い方の安値を選ぶと「もっと新しい確定した安値がある」：' + q('#pd-pickres').textContent.slice(0, 40)); } else T(true, '（表示の範囲に 2 つ前の安値がない）');
  // A に答えて仮説 → 条件の確認 → ロング → 線のドラッグ
  const sn0 = PE.snap(play); ['1d', '4h'].forEach((t) => click(q('.aopt[data-q="' + t + '"][data-v="' + (sn0.htf[t].insufficient ? 'unknown' : sn0.htf[t].dir) + '"]'))); PE.focusQuestions(1, sn0).forEach((qq) => click(q('.aopt[data-fq="' + qq.key + '"]'))); click(q('.aopt[data-bias="buy"]')); click(q('[data-cmd="hyp"]')); await frames(2);
  T(play.phase === 'waiting' && !PE.setEntryTF(play, tf0), '仮説を登録 → エントリー足は変えられなくなる');
  const stSel = q('#pd-stepmin'); stSel.value = '15'; stSel.dispatchEvent(new w.Event('change', { bubbles: true })); const a0 = play.asOf; click(q('[data-cmd="step"]')); await frames(1); T(play.stepMin === 15 && play.asOf === a0 + 3, '進める時間を 15分に → 1回で 5分足 3本（エントリー足は ' + PE.tfLabel(play.entryTF) + ' のまま）');
  click(q('[data-cmd="check"]')); await frames(1); click(q('[data-cmd="long"]')); await frames(1); click(q('[data-cmd="slhelp"]')); click(q('[data-cmd="tphelp"]')); await frames(1);
  const sl0 = parseFloat(q('#pd-sl').value); const M3 = mp(); const ySl = M3.yOf(sl0);
  ptr(cv, 'pointerdown', 300, ySl + 2, 70, 'mouse'); ptr(cv, 'pointermove', 300, ySl + 20, 70, 'mouse'); T(V.line === 'sl', '損切りの線をつかむ（太く表示）'); ptr(cv, 'pointerup', 300, ySl + 20, 70, 'mouse'); await frames(1);
  const sl1 = parseFloat(q('#pd-sl').value); T(sl1 < sl0 && Math.abs(sl1 * 1000 - Math.round(sl1 * 1000)) < 1e-6 && V.line === null && /損切り幅/.test(q('#pd-calc').textContent), '線を下へドラッグ → 入力欄の損切りが下がる（' + sl0 + '→' + sl1 + '・0.001 刻み）・計算も更新');
  const tpv = parseFloat(q('#pd-tp').value); const yTp = mp().yOf(tpv); ptr(cv, 'pointerdown', 300, yTp, 71, 'touch'); ptr(cv, 'pointermove', 300, mp().yOf(sl1) + 10, 71, 'touch'); ptr(cv, 'pointerup', 300, mp().yOf(sl1) + 10, 71, 'touch'); await frames(1);
  T(/発注できない/.test(q('#pd-err').textContent), '利確の線を損切りより下へ動かす → 入力欄と同じ検証で「発注できない」');
  click(q('[data-cmd="tphelp"]')); click(q('[data-cmd="slpick"]')); await frames(1); T(V.pick === 'sl', '「チャートで損切りを指定」→ 指定の待ち'); const M4 = mp(); const yy = M4.yOf(sl1) + 5; ptr(cv, 'pointerdown', 200, yy, 72, 'mouse'); ptr(cv, 'pointerup', 200, yy, 72, 'mouse'); await frames(1);
  T(!V.pick && q('#pd-sl').value !== '', 'チャートをタップ → 損切りの価格が入る（' + q('#pd-sl').value + '）');
  click(q('[data-cmd="slhelp"]')); click(q('[data-cmd="tphelp"]')); await frames(1); click(q('[data-cmd="order"]')); await frames(1);
  T(play.phase === 'holding' && !q('.pd-adv') && /上級のポジション管理」を ON/.test(q('#pd-F').textContent), '基本のルールで発注 → 上級の管理のボタンは出ない（設定で ON にすると使える、と案内）');
  T(PE.manage(play, { type: 'be' }).ok === false, '基本のルールでは、管理の操作を受け付けない');
  click(q('[data-cmd="hplay"]')); for (let i = 0; i < 400 && !doc.querySelector('#ui .pd-review'); i++) await frames(2);
  const rv = doc.querySelector('#ui .pd-review'); T(rv && /エントリー足：/.test(rv.textContent) && /進める時間 15分/.test(rv.textContent) && /高値・安値の指定/.test(rv.textContent), '振り返り：選んだエントリー足・進める時間・高値安値の指定の結果');
  click(rv && rv.querySelector('[data-cmd="end"]')); for (let i = 0; i < 100 && !res; i++) await frames(2);
  T(res && res.record.tf === other && res.record.tfLog.length === 1 && res.record.picks && res.record.picks.high === true && res.record.engineVersion === 3, '記録：エントリー足（' + (res && res.record.tf) + '）・選び直し・指定の結果・engineVersion 3');
  T(w.ChartCtl.active === L0 && PUI.listeners === 0 && !doc.body.classList.contains('pd-chart-open'), '閉じた後：チャートの操作のイベントを外した（' + w.ChartCtl.active + '）・十字キーの印を戻した');
  // ---- 2問目：上級のポジション管理 ----
  clean(); res = null; const pr2 = PUI.play({ level: 6, lvDef: PUI.LEVELS[5], pick: { seed: S.learn.similar[3], cat: 'similar', set: 'learn' }, advanced: true }); pr2.then((r) => { res = r; }); await frames(4);
  const pl2 = PUI.current.play; T(pl2.advanced && /上級のポジション管理 ON/.test(doc.querySelector('#ui .practice-panel').textContent), '上級のポジション管理 ON の問題（画面に表示）');
  const s2 = PE.snap(pl2); ['1d', '4h'].forEach((t) => click(q('.aopt[data-q="' + t + '"][data-v="' + (s2.htf[t].insufficient ? 'unknown' : s2.htf[t].dir) + '"]'))); click(q('.aopt[data-bias="buy"]')); click(q('[data-cmd="hyp"]')); await frames(2);
  click(q('[data-cmd="check"]')); await frames(1); click(q('[data-cmd="long"]')); await frames(1);
  T(!!q('#pd-plan'), '上級：注文のときに「決済管理の計画」を選ぶ'); const px = PE.snap(pl2).price; q('#pd-sl').value = (px - 0.12).toFixed(3); q('#pd-tp').value = (px + 0.6).toFixed(3); q('#pd-plan').value = 'be1r'; q('#pd-sl').dispatchEvent(new w.Event('input', { bubbles: true })); await frames(1);
  click(q('[data-cmd="order"]')); await frames(1); T(pl2.phase === 'holding' && pl2.pos && pl2.entry.plan === 'be1r' && !!q('.pd-adv'), '上級で発注 → 保有中に 建値・部分決済・トレーリング・早めの決済のボタン');
  // 建値：含み益がないうちは「近すぎる・越えている」になることがある → 進めてから
  let beOk = false; for (let i = 0; i < 40 && pl2.phase === 'holding' && !beOk; i++) { click(q('[data-cmd="hstep"]')); await frames(1); if (pl2.phase !== 'holding') break; const r = PE.manage(pl2, { type: 'be' }); if (r.ok) beOk = true; else if (i === 0) T(/近すぎる|越えている|建値以上/.test(r.error), '建値にできないとき、理由を出す（' + r.error + '）'); }
  if (pl2.phase === 'holding') { T(beOk && pl2.pos.sl === Math.round(pl2.pos.entryFill * 1000) / 1000, '損切りを建値（約定価格）へ'); click(q('[data-cmd="m-p50"]')); await frames(1); T(/✓|✗/.test(q('#pd-mmsg').textContent), '50%決済の結果を出す：' + q('#pd-mmsg').textContent.slice(0, 40));
    const tsel = q('#pd-trail'); tsel.value = 'atr:1.5'; tsel.dispatchEvent(new w.Event('change', { bubbles: true })); await frames(1); T(/トレーリング|✗/.test(q('#pd-mmsg').textContent), 'トレーリング（ATR×1.5）：' + q('#pd-mmsg').textContent.slice(0, 50));
    click(q('[data-cmd="m-close"]')); await frames(1); T(/理由を選ぼう/.test(q('#pd-mmsg').textContent), '早めの決済は理由を選んでから');
    q('#pd-cwhy').value = 'rci'; click(q('[data-cmd="m-close"]')); await frames(1); click(q('[data-cmd="hstep"]')); for (let i = 0; i < 100 && !doc.querySelector('#ui .pd-review'); i++) await frames(2); }
  else { T(true, '（建値の前に決済まで進んだ）'); for (let i = 0; i < 100 && !doc.querySelector('#ui .pd-review'); i++) await frames(2); }
  const rv2 = doc.querySelector('#ui .pd-review'); T(rv2 && /上級のポジション管理の記録/.test(rv2.textContent) && /決済管理の計画/.test(rv2.textContent) && /計画と実際の管理/.test(rv2.textContent), '振り返り：管理の記録（約定ごと）・計画と実際の管理の採点');
  click(rv2 && rv2.querySelector('[data-cmd="end"]')); for (let i = 0; i < 100 && !res; i++) await frames(2);
  T(res && res.record.advanced && Array.isArray(res.record.actions) && res.record.fills.length >= 1 && isFinite(res.record.riskR), '記録：上級の管理の操作と約定（' + (res && res.record.fills.length) + '件）・R');
  // 操作の記録から同じ結果を作り直せる
  if (res) { const g = PE.game(pl2); const rp = w.PositionEngine.replay(g.base, { side: 'buy', entryMid: pl2.pos.entryMid, sl: pl2.pos.sl0, tp: pl2.pos.tp0, lots: pl2.pos.lots0, entryIndex: pl2.pos.entryIndex, maxBars: pl2.pos.maxBars }, pl2.pos.actions, (i) => PE.snapshot(g, i, pl2.entryTF).entry.atr);
    const s1 = w.PositionEngine.summary(rp); T(s1.netPips === res.record.netPips && s1.riskR === res.record.riskR && s1.exitIndex === pl2.pos.exitIndex && rp.replayErrors.length === 0, '操作の記録から作り直すと同じ結果（' + s1.netPips + 'pips・' + s1.riskR + 'R）'); }
  T(w.ChartCtl.active === L0 && PUI.listeners === 0, '2問目を閉じた後もイベントは残らない');
  T(A.errors.length === 0, '読み込み・操作のエラーなし ' + JSON.stringify(A.errors.slice(0, 3)));
  console.log('結果: ' + okN + ' OK / ' + ng.length + ' NG'); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
