// v9.1 ブラウザでの通しの確かめ（ヘッドレス Chromium・ソフトウェア描画。自動の操作で、実機ではない）
//   KIND=2d|3d  VIEW=pc1920|pc1280|m360|m390|land  MODE=full|layout  PORT=…  OUT=docs/trade-advanced/
//   full：タイトル → つづきから（v9.0 形式の旧セーブ）→ 道場 → チャートの操作（マウス：ドラッグ・ホイール・十字線・ダブルクリック／タッチ：タップ・長押し・ピンチ）→
//         上級ポジション管理（発注 → 建値 → 部分決済 → 早めの決済 → 振り返り）→ A 3判断比較 → B 思い込み → C 連敗耐性 → D 認定試験（1問で中断）→
//         再読み込み → つづきから → D 続きから → トレードマスターとの上級の対戦（比べる表）→ イベントの数・セーブのキー
//   layout：道場・各演習の画面を開いて、横のはみ出し・チャートの高さ・ボタンが押せるか・スクリーンショット
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8793; const OUT = process.env.OUT || '/home/claude/envwork/docs/trade-advanced/'; const VIEW = process.env.VIEW || 'm390'; const KIND = process.env.KIND || '3d'; const MODE = process.env.MODE || 'full';
const VPS = { pc1920: { viewport: { width: 1920, height: 1080 } }, pc1280: { viewport: { width: 1280, height: 720 } }, m360: { viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, m390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, land: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
const VP = VPS[VIEW]; const touch = !!VP.hasTouch; const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
const URL = `http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html'); const PREFIX = KIND === '3d' ? 'mtq-3d-slot-' : 'mtq-rpg-v2-slot-';
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(VP); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable'); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200))); p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push('console: ' + m.text().slice(0, 160)); });
  const shot = async (name) => { await p.screenshot({ path: `${OUT}shots/${KIND}_${VIEW}_${name}.png` }); };
  const ready = async () => { if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); else await p.waitForFunction(() => window.State && window.World && window.PracticeUI && window.Trainer91, null, { timeout: 120000 }); };
  const inField = async () => { if (KIND === '3d') { await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 }); await p.evaluate(() => { MTQ3D.paused = true; }); } await p.waitForTimeout(500); };
  const geo = async (sel) => p.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { t: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height), w: Math.round(r.width), l: Math.round(r.left), inView: r.top >= -1 && r.bottom <= innerHeight + 1, tappable: !!hit && (hit === el || el.contains(hit)), vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth, minSide: Math.min(r.width, r.height) }; }, sel);
  const tap = async (sel) => { const el = await p.waitForSelector(sel, { timeout: 30000 }); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(60); if (touch) await el.tap(); else await el.click(); await p.waitForTimeout(120); };
  const item = async (label) => { const h = await p.waitForFunction((l) => [...document.querySelectorAll('#ui .rw-item')].find((x) => x.textContent.indexOf(l) >= 0) || null, label, { timeout: 30000 }); const el = h.asElement(); await el.scrollIntoViewIfNeeded(); if (touch) await el.tap(); else await el.click(); await p.waitForTimeout(200); };
  const opt = async (label) => { const h = await p.waitForFunction((l) => [...document.querySelectorAll('#ui .rw-opt')].find((x) => x.textContent.indexOf(l) >= 0) || null, label, { timeout: 30000 }); const el = h.asElement(); if (touch) await el.tap(); else await el.click(); await p.waitForTimeout(200); };
  const metrics = async () => { await cdp.send('HeapProfiler.collectGarbage').catch(() => { }); const r = await cdp.send('Performance.getMetrics'); const o = {}; r.metrics.forEach((x) => { o[x.name] = x.value; }); return { listeners: o.JSEventListeners, nodes: o.Nodes, heapMB: +(o.JSHeapUsedSize / 1048576).toFixed(1) }; };
  const noOverflow = async (name) => { const g = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: innerWidth })); S(g.sw <= g.vw + 1, name + '：横のはみ出しなし（' + g.sw + ' ≤ ' + g.vw + '）'); };
  // CDP のタッチ（長押し・ピンチ）
  const touchSeq = async (pts, moves, holdMs) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i + 1 })) }); if (holdMs) await p.waitForTimeout(holdMs);
    for (const m of moves) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: m.map((q, i) => ({ x: q[0], y: q[1], id: i + 1 })) }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(150); };

  await p.goto(URL); await ready();
  // ---- 旧セーブ（v9.0 の形）を作って、タイトルから読む ----
  await p.evaluate((pre) => { localStorage.setItem(pre === 'mtq-3d-slot-' ? 'mtq-rpg-v2-slot-2' : 'mtq-3d-slot-2', JSON.stringify({ marker: 'other-kind' }));
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant';
    d.practice = { v: 1, capital: 987000, history: [{ kind: 'skip', t: 1700000000000, seed: 3, set: 'learn', process: 70, capitalAfter: 987000, compliant: true }, { kind: 'trade', t: 1700000001000, seed: 18, set: 'learn', process: 60, riskR: -1, pnl: -13000, capitalAfter: 987000, compliant: false, mae: -20, lots: 1 }], profile: 'mochipoyo', overrides: {}, hints: true, level: 2, recent: [3, 18], series: { n: 30, done: 3, startedAt: 1700000000500 }, last: null, psych: { answers: {}, log: [] }, seen: true };
    State.save(1); localStorage.removeItem(pre + '0'); }, PREFIX);
  await p.reload(); await ready();
  const titleOk = await p.waitForSelector('#ui .title-menu', { timeout: 120000 }).then(() => true).catch(() => false); S(titleOk, 'タイトルの画面'); await shot('00_title');
  if (!titleOk) await p.evaluate(() => { if (window.Title) Title.menu(); });
  await item('つづきから'); await item('スロット1').catch(async () => { const it = await p.$$('#ui .rw-list .rw-item'); if (it[1]) await it[1].click(); }); await inField();
  const ld = await p.evaluate(() => { const pr = PracticeUI.ensure(State.data); return { name: State.data.hero.name, n: pr.history.length, cap: pr.capital, legacy: pr.seriesLegacy && pr.seriesLegacy.done, series: pr.series, cmp3: !!pr.cmp3, prefix: State.keyPrefix }; });
  S(ld.name === 'もち' && ld.n === 2 && ld.cap === 987000 && ld.legacy === 3 && ld.series === null && ld.cmp3 && ld.prefix === PREFIX, 'つづきから：v9.0 形式のセーブを読めた（記録 2 件・資金 ' + ld.cap + '・途中の連続演習は seriesLegacy に残る・新しい演習の記録を追加）');
  const m0 = await metrics();
  // ---- 道場：メニューから（上級ポジション管理の練習） ----
  await p.evaluate(() => { State.data.settings.textSpeed = 'instant'; window.__menu = PracticeUI.menu(); });
  await p.waitForSelector('#ui .pd-menu'); await shot('01_menu'); await noOverflow('道場のメニュー');
  const menuTxt = await p.evaluate(() => document.querySelector('#ui .pd-menu').textContent); S(['コースを選んで練習', '初見チャートの認定試験', '上級ポジション管理の練習', '同じ相場・3判断比較', '思い込みを見抜く', '資金管理・連敗耐性試験'].every((k) => menuTxt.indexOf(k) >= 0), '道場のメニューに Lv1〜8・上級ポジション管理・A・B・C の演習');
  if (MODE === 'layout') { await item('上級ポジション管理の練習'); await p.waitForSelector('#ui .practice-panel #pd-chart'); await p.waitForTimeout(400); const g = await geo('#pd-chart'); S(g && g.h >= (VIEW === 'land' ? 150 : 200), 'チャートの高さ ' + (g && g.h) + 'px'); await noOverflow('道場の 1 問'); await shot('02_play');
    const tb = await p.evaluate(() => [...document.querySelectorAll('#ui .practice-panel .tf, #ui .practice-panel .aopt, #ui .practice-panel .mini')].map((b) => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); }).filter((x) => x > 0));
    if (touch) S(Math.min.apply(null, tb) >= 43.5, 'タッチの対象は 44px 以上（いちばん小さい ' + Math.min.apply(null, tb).toFixed(1) + 'px）');
    const padHidden = await p.evaluate(() => { const pd = document.getElementById('pad'); return !pd || getComputedStyle(pd).display === 'none'; }); S(padHidden, 'チャートの操作のあいだ、RPG の十字キーを隠す');
    await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); }); }
  else {
    await item('上級ポジション管理の練習'); await p.waitForSelector('#ui .practice-panel #pd-chart'); await p.waitForTimeout(400); await shot('02_play'); await noOverflow('道場の 1 問');
    const cv = await geo('#pd-chart'); S(cv && cv.h >= (VIEW === 'land' ? 150 : 200), 'チャートの高さ ' + (cv && cv.h) + 'px');
    S(await p.evaluate(() => { const pd = document.getElementById('pad'); return !pd || getComputedStyle(pd).display === 'none'; }), 'チャートの操作のあいだ、RPG の十字キーを隠す');
    const V = () => p.evaluate(() => { const v = PracticeUI.current.view; return { vis: v.visible, end: v.end, cross: v.cross ? v.cross.index : null, n: v.count }; });
    const box = await (await p.$('#pd-chart')).boundingBox(); const cx = box.x + box.width / 2, cy = box.y + box.height * 0.3;
    if (!touch) {
      await p.mouse.move(cx, cy); await p.waitForTimeout(100); let v = await V(); S(v.cross !== null && /EMA20/.test(await p.evaluate(() => document.querySelector('#pd-cross').textContent)), 'マウス：動かすだけで十字線と OHLC・指標の値');
      await p.mouse.down(); await p.mouse.move(cx + 120, cy, { steps: 6 }); await p.mouse.up(); v = await V(); S(v.end !== null && v.end < v.n - 1, 'マウス：ドラッグで過去へ（右端 ' + v.end + '／最新 ' + (v.n - 1) + '）');
      await p.mouse.wheel(0, -300); await p.waitForTimeout(150); const v2 = await V(); S(v2.vis < 72, 'ホイールで拡大（' + v2.vis + '本）');
      await p.mouse.dblclick(cx, cy); await p.waitForTimeout(150); const v3 = await V(); S(v3.vis === 72 && v3.end === null, 'ダブルクリックで元に戻す');
      await p.focus('#pd-chart'); await p.keyboard.press('Enter'); await p.keyboard.press('ArrowLeft'); const v4 = await V(); await p.keyboard.press('Escape'); S(v4.cross === v4.n - 2, 'キー：Enter で十字線・← で 1 本前');
    } else {
      await touchSeq([[cx, cy]], [], 0); let v = await V(); S(v.cross !== null, 'タッチ：タップで十字線');
      await touchSeq([[cx, cy]], [], 0); await p.waitForTimeout(400);
      await touchSeq([[cx, cy]], [[[cx + 40, cy]], [[cx + 80, cy]]], 550); v = await V(); S(v.cross !== null, 'タッチ：長押しで十字線を出して、指を動かすと動く（' + v.cross + '）');
      await touchSeq([[cx, cy]], [], 0);
      await touchSeq([[cx - 40, cy], [cx + 40, cy]], [[[cx - 70, cy], [cx + 70, cy]], [[cx - 100, cy], [cx + 100, cy]]], 0); v = await V(); S(v.vis < 72, 'タッチ：ピンチアウトで拡大（' + v.vis + '本）');
      await touchSeq([[cx, cy]], [[[cx + 60, cy]], [[cx + 120, cy]]], 0); v = await V(); S(v.end !== null, 'タッチ：横にスワイプで過去へ');
      const st0 = await p.evaluate(() => { const el = document.querySelector('#ui .practice-panel'); return el.scrollTop; }); await touchSeq([[cx, cy + 40]], [[[cx, cy - 20]], [[cx, cy - 80]]], 0); const st1 = await p.evaluate(() => document.querySelector('#ui .practice-panel').scrollTop);
      S(st1 > st0 || (await p.evaluate(() => { const el = document.querySelector('#ui .practice-panel'); return el.scrollHeight <= el.clientHeight + 2; })), 'タッチ：チャートの上を縦にスワイプ → 画面をスクロール（' + st0 + '→' + st1 + '）');
      await tap('.practice-panel [data-cmd="vreset"]');
    }
    await shot('03_chart_ops');
    // A・B → 条件の確認 → 発注（上級）→ 建値 → 部分決済 → 早めの決済。損切りで終わったら次の問題で
    let did = { be: false, part: false, close: false }; let tries = 0;
    while (tries++ < 8 && !(did.be && did.part && did.close)) {
      if (tries > 1) { await p.waitForSelector('#ui .practice-panel #pd-chart'); await p.waitForTimeout(300); }
      const sn = await p.evaluate(() => { const s = PracticeEngine.snap(PracticeUI.current.play); return { d1: s.htf['1d'].insufficient ? 'unknown' : s.htf['1d'].dir, h4: s.htf['4h'].insufficient ? 'unknown' : s.htf['4h'].dir, side: s.entry.emaOrder === 'down' ? 'sell' : 'buy' }; });
      await tap(`.practice-panel .aopt[data-q="1d"][data-v="${sn.d1}"]`); await tap(`.practice-panel .aopt[data-q="4h"][data-v="${sn.h4}"]`);
      await p.evaluate(() => { const pl = PracticeUI.current.play; PracticeEngine.focusQuestions(pl.level, PracticeEngine.snap(pl)).forEach((q) => { const b = document.querySelector('.practice-panel .aopt[data-fq="' + q.key + '"]'); if (b) b.click(); }); });
      await tap(`.practice-panel .aopt[data-bias="${sn.side}"]`); await tap('.practice-panel [data-cmd="hyp"]'); await tap('.practice-panel [data-cmd="check"]'); await tap(`.practice-panel [data-cmd="${sn.side === 'buy' ? 'long' : 'short'}"]`);
      await tap('.practice-panel [data-cmd="slhelp"]'); await tap('.practice-panel [data-cmd="tphelp"]'); await p.selectOption('#pd-plan', 'be1r'); if (tries === 1) await shot('04_order');
      // 損切りの線をドラッグ（マウス・タッチ）
      if (tries === 1) { const sl0 = await p.inputValue('#pd-sl'); const yy = await p.evaluate(() => { const c = document.getElementById('pd-chart'); const r = c.getBoundingClientRect(); return r.top + c._map.yOf(parseFloat(document.getElementById('pd-sl').value)); }); const xx = box.x + box.width * 0.6;
        if (touch) await touchSeq([[xx, yy]], [[[xx, yy + 10]], [[xx, yy + 20]]], 0); else { await p.mouse.move(xx, yy); await p.mouse.down(); await p.mouse.move(xx, yy + 20, { steps: 4 }); await p.mouse.up(); }
        const sl1 = await p.inputValue('#pd-sl'); S(parseFloat(sl1) !== parseFloat(sl0), '損切りの線をドラッグ → 入力欄が変わる（' + sl0 + '→' + sl1 + '）'); await tap('.practice-panel [data-cmd="slhelp"]'); }
      await tap('.practice-panel [data-cmd="order"]'); const ph = await p.evaluate(() => PracticeUI.current.play.phase); if (ph !== 'holding') { S(false, '発注できなかった：' + await p.evaluate(() => document.querySelector('#pd-err').textContent.slice(0, 60))); break; }
      for (let i = 0; i < 60 && (await p.evaluate(() => PracticeUI.current.play.phase)) === 'holding'; i++) {
        await tap('.practice-panel [data-cmd="hstep"]');
        const st = await p.evaluate(() => { const ps = PracticeUI.current.play.pos; return { phase: PracticeUI.current.play.phase, mfeR: ps ? ps.mfe / PracticeUI.current.play.pip / ps.riskPips0 : 0 }; }); if (st.phase !== 'holding') break;
        if (!did.be && st.mfeR >= 0.6) { await tap('.practice-panel [data-cmd="m-be"]'); const m = await p.evaluate(() => document.querySelector('#pd-mmsg').textContent); if (/^✓/.test(m)) { did.be = true; S(/損益ゼロとは限らない/.test(m), '建値へ：' + m.slice(0, 60)); await shot('05_be'); } }
        else if (did.be && !did.part) { await tap('.practice-panel [data-cmd="m-p50"]'); const m = await p.evaluate(() => document.querySelector('#pd-mmsg').textContent); if (/^✓/.test(m)) { did.part = true; S(true, '50% の部分決済：' + m.slice(0, 50)); } }
        else if (did.part && !did.close) { await tap('.practice-panel [data-cmd="hstep"]'); if ((await p.evaluate(() => PracticeUI.current.play.phase)) !== 'holding') break; await p.selectOption('#pd-cwhy', 'time'); await tap('.practice-panel [data-cmd="m-close"]'); const m = await p.evaluate(() => document.querySelector('#pd-mmsg').textContent); if (/^✓/.test(m)) { did.close = true; S(true, '早めの決済：' + m.slice(0, 50)); await shot('06_close'); await tap('.practice-panel [data-cmd="hstep"]'); } }
      }
      await p.waitForSelector('#ui .pd-review', { timeout: 60000 }); await p.waitForTimeout(300);
      if (did.be && did.part && did.close) { const rt = await p.evaluate(() => document.querySelector('#ui .pd-review').textContent); S(/上級のポジション管理の記録/.test(rt) && /部分決済/.test(rt) && /早めの決済/.test(rt) && /計画と実際の管理/.test(rt), '振り返り：約定ごとの記録（部分決済・早めの決済）・計画と実際の管理の採点'); await shot('07_review'); await noOverflow('振り返り'); await tap('#ui .pd-review [data-cmd="end"]'); break; }
      await tap('#ui .pd-review [data-cmd="again"]');
    }
    S(did.be && did.part && did.close, '建値・部分決済・早めの決済を 1 回の取引で操作できた（' + tries + '問目）');
    // ---- A ----
    await item('同じ相場・3判断比較'); await p.waitForSelector('#ui .c3-panel'); await shot('08_cmp3'); await noOverflow('3判断比較'); await tap('#ui .c3-panel [data-cmd="go"]'); await p.waitForSelector('#ui .c3-tbl'); await shot('09_cmp3_result'); await noOverflow('3判断比較の結果');
    S(await p.evaluate(() => /net pips/.test(document.querySelector('#ui .c3-tbl').textContent) && State.data.practice.cmp3.n === 1), 'A：3 つの計画を登録 → 結果の表'); await tap('#ui .pd-review [data-cmd="end"]');
    // ---- B ----
    await item('思い込みを見抜く'); await p.waitForSelector('#ui .sp-panel'); await shot('10_spot'); await noOverflow('思い込みを見抜く');
    await p.evaluate(() => { const b = document.querySelector('#ui .sp-panel [data-c]'); b.checked = true; }); await tap('#ui .sp-panel [data-cmd="go"]'); await p.waitForFunction(() => [...document.querySelectorAll('#ui .pd-review')].some((x) => /思い込みを見抜く：結果/.test(x.textContent)));
    S(await p.evaluate(() => State.data.practice.spot.n === 1), 'B：指摘 → 結果（証拠・正しい解釈）'); await shot('11_spot_result'); await p.evaluate(() => { const c = [...document.querySelectorAll('#ui .pd-review .rw-panel-close')].pop(); c.click(); }); await p.waitForTimeout(200);
    // ---- C ----
    await item('資金管理・連敗耐性試験'); await p.waitForSelector('#ui .sv-panel'); await tap('#ui .sv-panel [data-cmd="cmp15"]'); await shot('12_survival'); await noOverflow('連敗耐性試験');
    S(await p.evaluate(() => /73\.97%/.test(document.querySelector('#sv-out').textContent) && /21\.46%/.test(document.querySelector('#sv-out').textContent)), 'C：1%・5% の 30連敗（73.97%・21.46%）'); await tap('#ui .sv-panel [data-cmd="end"]');
    // ---- D：1 問で中断 ----
    await item('初見チャートの認定試験'); await opt('新しいセットで受ける'); await p.waitForSelector('#ui .practice-panel #pd-chart'); await shot('13_exam');
    S(await p.evaluate(() => PracticeUI.current.play.gen === 'B' && !document.querySelector('#ui .practice-panel [data-cmd="hint"]')), 'D：系列 B の問題・ヒントなし');
    await p.evaluate(() => { const pl = PracticeUI.current.play; const sn = PracticeEngine.snap(pl); pl.answers = { '1d': 'up', '4h': 'up' }; pl.focus = {}; PracticeEngine.focusQuestions(8, sn).forEach((q) => { pl.focus[q.key] = q.options[0][0]; }); pl.bias = 'neutral'; });
    await tap('.practice-panel [data-cmd="hyp"]'); await tap('.practice-panel [data-cmd="skip"]'); await p.waitForSelector('#ui .pd-exam-after'); await shot('14_exam_after'); await tap('#ui .pd-exam-after [data-cmd="quit"]');
    const ex1 = await p.evaluate(() => { const s = State.data.practice.series; return s && { done: s.done, seeds: s.usedSeeds.slice() }; }); S(ex1 && ex1.done === 1, 'D：1 問で中断（使った seed を記録 ' + (ex1 && ex1.seeds.join(',')) + '）');
    await item('やめる'); await p.waitForTimeout(300);
    const m1 = await metrics(); const leak = await p.evaluate(() => ({ cc: window.ChartCtl ? ChartCtl.active : -1, pl: PracticeUI.listeners || 0 }));
    S(leak.cc === 0 && leak.pl === 0, '道場を閉じた後：チャートの操作・画面の大きさのイベントは残らない（ChartCtl ' + leak.cc + '・道場 ' + leak.pl + '）');
    // 道場の 1 問を、要素の handle を使わない操作で繰り返して、イベントリスナー・DOM の数が増え続けないか（CDP の数。ヘッドレス Chromium）
    //   ※ Chromium のレイアウトの一時保存（MeasureCache）が、閉じた画面を最大 4 つ分まで持つことを確かめてある（4 問で頭打ち）。増え続けるかを 4 問目と 8 問目で比べる
    const loopPlays = async (n) => { for (let k = 0; k < n; k++) { await p.evaluate(() => { window.__lr = null; PracticeUI.play({ level: 6, lvDef: PracticeUI.LEVELS[5], pick: { seed: PRACTICE_SEEDS.learn.similar[1], cat: 'similar', set: 'learn' } }).then((r) => { window.__lr = r; }); });
      await p.waitForFunction(() => !!document.querySelector('#ui .practice-panel #pd-chart')); await p.evaluate(() => { const pl = PracticeUI.current.play; pl.answers = { '1d': 'up', '4h': 'up' }; pl.bias = 'neutral'; document.querySelector('.practice-panel [data-cmd="hyp"]').click(); document.querySelector('.practice-panel [data-cmd="skip"]').click(); });
      await p.waitForFunction(() => !!document.querySelector('#ui .pd-review')); await p.evaluate(() => document.querySelector('#ui .pd-review [data-cmd="end"]').click()); await p.waitForFunction(() => !!window.__lr); } };
    await loopPlays(4); const mA = await metrics(); await loopPlays(4); const mB = await metrics();
    S(mB.listeners <= mA.listeners + 2 && mB.nodes <= mA.nodes + 60, 'イベントリスナー・DOM の数（CDP）：同じ問題を 4 問 → さらに 4 問で増え続けない（リスナー ' + mA.listeners + '→' + mB.listeners + '・DOM ' + mA.nodes + '→' + mB.nodes + '。道場の前 ' + m0.listeners + '・ヘッドレスの数）');
    // ---- 再読み込み → つづきから → D の続き ----
    await p.evaluate(() => { State.save(1); }); await p.reload(); await ready(); await p.waitForSelector('#ui .title-menu', { timeout: 120000 }).catch(() => { }); await item('つづきから'); await item('スロット1'); await inField();
    await p.evaluate(() => { State.data.settings.textSpeed = 'instant'; window.__menu = PracticeUI.menu(); }); await item('初見チャートの認定試験'); await opt('続きから');
    await p.waitForSelector('#ui .practice-panel #pd-chart'); const s2 = await p.evaluate(() => PracticeUI.current.play.seed); S(ex1 && ex1.seeds.indexOf(s2) < 0 && (await p.evaluate(() => State.data.practice.series.done)) === 1, '再読み込み → つづきから → D「続きから」：2 問目は別の問題（' + s2 + '）');
    await p.evaluate(() => { document.querySelector('#ui .practice-panel [data-cmd="quit"]').click(); }); await opt('中断する'); await p.waitForTimeout(300); await item('やめる');
    // ---- トレードマスターとの上級の対戦（比べる表） ----
    await p.evaluate(() => { window.__duel = TradeDuel90.talk({ name: 'トレードマスター・テスト' }, { short: 'テスト', styleName: '順張り', style: 'trend', skill: 0.7, seed: 5 }, (L) => Win.message(L)); });
    await opt('リスクR対戦'); await p.waitForFunction(() => document.querySelector('#ui .rw-message, #ui .msg, #ui .rw-msg') || document.querySelector('#ui .practice-panel'), null, { timeout: 30000 });
    for (let i = 0; i < 20 && !(await p.$('#ui .practice-panel #pd-chart')); i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(250); }
    await p.evaluate(() => { const pl = PracticeUI.current.play; pl.answers = { '1d': 'up', '4h': 'up' }; pl.bias = 'neutral'; }); await tap('.practice-panel [data-cmd="hyp"]'); await tap('.practice-panel [data-cmd="skip"]'); await p.waitForSelector('#ui .pd-review'); await tap('#ui .pd-review [data-cmd="end"]');
    for (let i = 0; i < 30 && !(await p.$('#ui .rw-opt')); i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(250); }
    await opt('比べる表を見る'); await p.waitForFunction(() => [...document.querySelectorAll('#ui .pd-review')].some((x) => /判断の過程の比べ/.test(x.textContent)), null, { timeout: 30000 }); await shot('15_duel_compare'); await noOverflow('上級の対戦の比べる表');
    S(await p.evaluate(() => { const t = [...document.querySelectorAll('#ui .pd-review')].pop().textContent; return /環境認識（日足）/.test(t) && /シグナル・決めた時刻/.test(t) && /その時点のチャートの事実/.test(t); }), 'トレードマスター：判断の過程の比べる表と、その時点の事実からの説明');
    await p.evaluate(() => { const c = [...document.querySelectorAll('#ui .pd-review .rw-panel-close')].pop(); c.click(); }); await p.waitForTimeout(300);
  }
  // セーブのキー（3D と 2D は別）
  const keys = await p.evaluate((pre) => { State.save(1); return { prefix: State.keyPrefix, other: localStorage.getItem(pre === 'mtq-3d-slot-' ? 'mtq-rpg-v2-slot-2' : 'mtq-3d-slot-2'), mine: Object.keys(localStorage).filter((k) => /slot-1$/.test(k)) }; }, PREFIX);
  S(keys.prefix === PREFIX && keys.other === JSON.stringify({ marker: 'other-kind' }) && keys.mine.indexOf(PREFIX + '1') >= 0, 'セーブのキー：' + PREFIX + '1（もう一方の版のセーブは変わらない）');
  S(!errs.length, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  await br.close(); fs.writeFileSync(`${OUT}logs/e2e_${KIND}_${VIEW}_${MODE}.json`, JSON.stringify({ steps, errs }, null, 1));
  console.log('結果: ' + steps.filter((x) => x.ok).length + ' OK / ' + steps.filter((x) => !x.ok).length + ' NG');
})().catch((e) => { console.error('FAIL', e); fs.writeFileSync(`${OUT}logs/e2e_${KIND}_${VIEW}_${MODE}.json`, JSON.stringify({ steps, fail: String(e && e.stack || e) }, null, 1)); process.exit(1); });
