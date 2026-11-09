const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
  await p.goto('http://localhost:' + process.env.PORT + '/index.html'); await p.waitForFunction(() => window.State && window.PracticeUI && true);
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; World.start(); });
  await p.waitForTimeout(1500);
  const m = async (tag) => { await cdp.send('HeapProfiler.collectGarbage'); await p.waitForTimeout(200); await cdp.send('HeapProfiler.collectGarbage'); const r = await cdp.send('Performance.getMetrics'); const o = {}; r.metrics.forEach((x) => { o[x.name] = x.value; }); console.log(tag, 'listeners', o.JSEventListeners, 'nodes', o.Nodes, 'heap', (o.JSHeapUsedSize / 1048576).toFixed(1)); };
  await m('base');
  for (let k = 0; k < 14; k++) {
    await p.evaluate(() => { window.__r = null; PracticeUI.play({ level: 6, lvDef: PracticeUI.LEVELS[5], pick: { seed: PRACTICE_SEEDS.learn.similar[1], cat: 'similar', set: 'learn' }, advanced: true }).then((r) => { window.__r = r; }); });
    await p.waitForFunction(() => !!document.querySelector('#ui .practice-panel #pd-chart')); await p.waitForTimeout(300);
    await p.evaluate(() => { const pl = PracticeUI.current.play; pl.answers = { '1d': 'up', '4h': 'up' }; pl.bias = 'neutral'; document.querySelector('.practice-panel [data-cmd="hyp"]').click(); document.querySelector('.practice-panel [data-cmd="skip"]').click(); });
    await p.waitForFunction(() => !!document.querySelector('#ui .pd-review')); await p.evaluate(() => document.querySelector('#ui .pd-review [data-cmd="end"]').click()); await p.waitForFunction(() => window.__r); await p.waitForTimeout(300);
    await m('after play ' + (k + 1));
  }
  await p.evaluate(() => { PracticeUI.ensure().seen = true; }); for (let k = 0; k < 3; k++) { await p.evaluate(() => { window.__m = PracticeUI.menu(); }); await p.waitForFunction(() => !!document.querySelector('#ui .pd-menu')); await p.evaluate(() => { [...document.querySelectorAll('#ui .rw-item')].find((x) => /やめる/.test(x.textContent)).click(); }); await p.waitForTimeout(300); await m('after menu ' + (k + 1)); }
  for (let k = 0; k < 2; k++) { await p.evaluate(() => { window.__c = PracticeUI.compare3(); }); await p.waitForFunction(() => !!document.querySelector('#ui .c3-panel')); await p.evaluate(() => document.querySelector('#ui .c3-panel [data-cmd="go"]').click()); await p.waitForFunction(() => !!document.querySelector('#ui .c3-tbl')); await p.evaluate(() => document.querySelector('#ui .pd-review [data-cmd="end"]').click()); await p.waitForTimeout(300); await m('after cmp3 ' + (k + 1)); }
  await br.close();
})();
