// v9.1 道場のチャートの描画の時間と、タイマー・リスナーの数（ヘッドレス Chromium・ソフトウェア描画。実機の数ではない）
//   KIND=2d|3d VIEW=m390|pc1280 PORT=… node perf91.js
//   ・1 回の描き直しの時間（相場の集計・指標・山谷の計算＋Chart.render）：時間足の切り替え（日足↔15分足を 20 回）・ピンチ中（2 本指の移動 40 回）・十字線（マウスの移動 60 回）
//   ・タイマー：setTimeout・setInterval・requestAnimationFrame を数える（開いている間・閉じた後に残っている数）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8820, KIND = process.env.KIND || '2d', VIEW = process.env.VIEW || 'm390', OUT = process.env.OUT || '';
const VPS = { m390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }, pc1280: { viewport: { width: 1280, height: 720 } } };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(VPS[VIEW]); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
  await p.addInitScript(() => { const A = { t: new Map(), i: new Map(), raf: new Map() }; window.__timers = A; let id0 = 0;
    const st = window.setTimeout, ct = window.clearTimeout, si = window.setInterval, ci = window.clearInterval, ra = window.requestAnimationFrame, ca = window.cancelAnimationFrame;
    window.setTimeout = function (f, ms) { const id = st(function () { A.t.delete(id); if (typeof f === 'function') f.apply(this, arguments); }, ms); A.t.set(id, (new Error().stack || '').split('\n')[2] || ''); return id; };
    window.clearTimeout = function (id) { A.t.delete(id); return ct(id); };
    window.setInterval = function (f, ms) { const id = si(f, ms); A.i.set(id, (new Error().stack || '').split('\n')[2] || ''); return id; };
    window.clearInterval = function (id) { A.i.delete(id); return ci(id); };
    window.requestAnimationFrame = function (f) { const id = ra(function (t) { A.raf.delete(id); f(t); }); A.raf.set(id, 1); return id; };
    window.cancelAnimationFrame = function (id) { A.raf.delete(id); return ca(id); }; });
  await p.goto(`http://localhost:${PORT}/` + (KIND === '3d' ? '3d/index.html' : 'index.html'));
  if (KIND === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); else await p.waitForFunction(() => window.State && window.PracticeUI);
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; World.start(); });
  if (KIND === '3d') { await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 }); }
  await p.waitForTimeout(1500);
  const timers = () => p.evaluate(() => ({ timeouts: window.__timers.t.size, intervals: window.__timers.i.size, intervalSrc: [...window.__timers.i.values()].map((s) => s.trim().slice(0, 90)) }));
  const T0 = await timers();
  // 描画の時間を測る（Chart.render を包む）
  // 1 回の描き直しの時間＝相場の集計と指標（PracticeEngine.view）＋山谷（SignalEngine.pivots）＋描画（Chart.render）。Chart.render を呼んだ回数ごとに、その前の計算の時間も足す
  await p.evaluate(() => { window.__rt = []; window.__acc = 0; const wrap = (o, k) => { const f = o[k]; o[k] = function () { const t = performance.now(); const r = f.apply(this, arguments); window.__acc += performance.now() - t; return r; }; };
    wrap(PracticeEngine, 'view'); wrap(SignalEngine, 'pivots'); const R = Chart.render; Chart.render = function () { const t = performance.now(); const r = R.apply(this, arguments); window.__rt.push(performance.now() - t + window.__acc); window.__acc = 0; return r; }; });
  await p.evaluate(() => { window.__r = null; PracticeUI.play({ level: 6, lvDef: PracticeUI.LEVELS[5], pick: { seed: PRACTICE_SEEDS.learn.similar[1], cat: 'similar', set: 'learn' } }).then((r) => { window.__r = r; }); });
  await p.waitForFunction(() => !!document.querySelector('#ui .practice-panel #pd-chart')); await p.waitForTimeout(500);
  const T1 = await timers();
  const stat = async () => p.evaluate(() => { const a = window.__rt.slice(); window.__rt = []; a.sort((x, y) => x - y); const n = a.length; return { n, avg: n ? +(a.reduce((s, x) => s + x, 0) / n).toFixed(2) : null, p95: n ? +a[Math.min(n - 1, Math.floor(n * 0.95))].toFixed(2) : null, max: n ? +a[n - 1].toFixed(2) : null }; });
  await stat();
  for (let k = 0; k < 20; k++) await p.evaluate((k) => { document.querySelector('.practice-panel .tf[data-tf="' + (k % 2 ? '15m' : '1d') + '"]').click(); }, k);
  const tfSw = await stat();
  const box = await p.evaluate(() => { const r = document.getElementById('pd-chart').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }); const cx = box.x + box.w / 2, cy = box.y + box.h * 0.3;
  let pinch = null, cross = null; const t0 = Date.now();
  if (VIEW === 'm390') { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - 30, y: cy, id: 1 }, { x: cx + 30, y: cy, id: 2 }] });
    for (let k = 0; k < 40; k++) { const d = 30 + (k % 20) * 4; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }] }); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); pinch = await stat(); }
  for (let k = 0; k < 60; k++) await p.mouse.move(box.x + 20 + k * (box.w - 40) / 60, cy); cross = await stat();
  const wall = Date.now() - t0;
  await p.evaluate(() => { const pl = PracticeUI.current.play; pl.answers = { '1d': 'up', '4h': 'up' }; pl.bias = 'neutral'; document.querySelector('.practice-panel [data-cmd="hyp"]').click(); document.querySelector('.practice-panel [data-cmd="play"]').click(); });
  await p.waitForTimeout(1500); const T2 = await timers();
  await p.evaluate(() => { document.querySelector('.practice-panel [data-cmd="skip"]').click(); }); await p.waitForFunction(() => !!document.querySelector('#ui .pd-review'));
  await p.evaluate(() => document.querySelector('#ui .pd-review [data-cmd="end"]').click()); await p.waitForFunction(() => !!window.__r); await p.waitForTimeout(800);
  const T3 = await timers(); const js = await p.evaluate(() => ({ cc: window.ChartCtl ? ChartCtl.active : null, pl: PracticeUI.listeners || 0 }));
  const res = { kind: KIND, view: VIEW, dpr: VPS[VIEW].deviceScaleFactor || 1, canvas: box, renderMs: { tfSwitch: tfSw, pinch, crosshair: cross }, timers: { before: T0, open: T1, playing: T2, after: T3 }, chartCtlActive: js.cc, practiceListeners: js.pl };
  console.log(JSON.stringify(res, null, 1)); if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  await br.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
