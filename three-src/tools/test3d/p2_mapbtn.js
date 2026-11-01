// スマホ：全体マップを開いたとき 3D設定のボタンが重ならないか（3Dのマップ・2Dのマップ）、画面全体の拡大を止める・戻すか
const { chromium, devices } = require('playwright');
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 1 })); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('まち', 'warrior'); World.start(); World.enterMap('world', 60, 60, 'down'); });
  await p.waitForTimeout(3000);
  const check = () => p.evaluate(() => {
    const tools = document.getElementById('g3-tools'); const tShown = !!tools && getComputedStyle(tools).display !== 'none';
    const btns = [...document.querySelectorAll('.bigmap button, .bm-ctl button, #mm-big button')].filter((b) => b.getBoundingClientRect().width > 0);
    const blocked = btns.filter((b) => { const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !(el === b || b.contains(el)); }).map((b) => b.textContent.trim());
    return { mode3D: MTQ3D.mode3D(), mapOpen: !!(window.Minimap && Minimap.open), tools: tShown, mapButtons: btns.length, blocked };
  });
  const out = {};
  out.explore3D = await check();
  await p.evaluate(() => Minimap.openBig()); await p.waitForTimeout(1500); out.map3D = await check();
  await p.evaluate(() => Minimap.close()); await p.waitForTimeout(800); out.closed3D = await check();
  await p.evaluate(() => { localStorage.setItem('mtq3d-scope', 'poyo'); }); await p.evaluate(() => { World.enterMap('world', 60, 61, 'down'); }); await p.waitForTimeout(2000); out.explore2D = await check();
  await p.evaluate(() => Minimap.openBig()); await p.waitForTimeout(1500); out.map2D = await check();
  await p.evaluate(() => Minimap.close()); await p.evaluate(() => { localStorage.setItem('mtq3d-scope', 'all'); });
  // 画面全体の拡大：iPhone の拡大の合図（gesturestart）を止めているか・入力欄の文字の大きさ
  out.gesturePrevented = await p.evaluate(() => { const e = new Event('gesturestart', { cancelable: true, bubbles: true }); document.body.dispatchEvent(e); return e.defaultPrevented; });
  out.touchAction = await p.evaluate(() => document.documentElement.style.touchAction);
  out.inputFont = await p.evaluate(() => { const i = document.createElement('input'); document.body.appendChild(i); const f = getComputedStyle(i).fontSize; i.remove(); return f; });
  // 拡大された状態を作る（CDP）→ 戻す処理が動くか
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 }); await p.waitForTimeout(600);
  out.zoomedScale = await p.evaluate(() => window.visualViewport && visualViewport.scale);
  await p.waitForTimeout(2000);
  out.afterReset = await p.evaluate(() => ({ scale: window.visualViewport && visualViewport.scale, meta: document.querySelector('meta[name=viewport]').getAttribute('content') }));
  console.log(JSON.stringify(out, null, 1)); console.log('errors', errs); await br.close();
})();
