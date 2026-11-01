// 画面全体が拡大されたまま（visualViewport.scale > 1）になったとき、元に戻す処理が動くか（拡大できる設定にしてから CDP で拡大）
const { chromium, devices } = require('playwright');
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 1 })); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready && document.body.classList.contains('mobile'), null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelector('meta[name=viewport]').setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover'); });
  const cdp = await ctx.newCDPSession(p); await p.waitForTimeout(300);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 }); await p.waitForTimeout(150);
  const zoomed = await p.evaluate(() => visualViewport.scale);
  await p.waitForTimeout(1500);
  const after = await p.evaluate(() => ({ scale: visualViewport.scale, game: (() => { const r = document.getElementById('game').getBoundingClientRect(); return [r.width, r.height].map(Math.round); })() }));
  console.log(JSON.stringify({ zoomed, after })); console.log('errors', errs); await br.close();
})();
