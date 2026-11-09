const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
  await p.goto('http://localhost:' + process.env.PORT + '/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; World.start(); });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 }); await p.evaluate(() => { MTQ3D.paused = true; }); await p.waitForTimeout(1500);
  const m = async (tag) => { await cdp.send('HeapProfiler.collectGarbage'); await p.waitForTimeout(200); await cdp.send('HeapProfiler.collectGarbage'); const r = await cdp.send('Performance.getMetrics'); const o = {}; r.metrics.forEach((x) => { o[x.name] = x.value; }); console.log(tag, 'listeners', o.JSEventListeners, 'nodes', o.Nodes); };
  await m('base');
  for (let k = 0; k < 14; k++) {
    await p.evaluate(() => { window.__r = null; PracticeUI.play({ level: 6, lvDef: PracticeUI.LEVELS[5], pick: { seed: PRACTICE_SEEDS.learn.similar[1], cat: 'similar', set: 'learn' } }).then((r) => { window.__r = r; }); });
    await p.waitForFunction(() => !!document.querySelector('#ui .practice-panel #pd-chart')); await p.waitForTimeout(200);
    await p.evaluate(() => { const pl = PracticeUI.current.play; pl.answers = { '1d': 'up', '4h': 'up' }; pl.bias = 'neutral'; document.querySelector('.practice-panel [data-cmd="hyp"]').click(); document.querySelector('.practice-panel [data-cmd="skip"]').click(); });
    await p.waitForFunction(() => !!document.querySelector('#ui .pd-review')); await p.evaluate(() => document.querySelector('#ui .pd-review [data-cmd="end"]').click()); await p.waitForFunction(() => window.__r); await p.waitForTimeout(200);
    await m('after play ' + (k + 1));
  }
  await br.close();
})();
