// スマホでページが縦に動く（ミニマップの上が切れる）か：ページの高さと画面の高さ、ゲーム画面・ミニマップの位置（PAGE=3d|2d）
const { chromium, devices } = require('playwright');
(async () => {
  const br = await chromium.launch(); const out = [];
  for (const page of ['2d', '3d']) for (const name of ['iPhone 13', 'iPhone SE (3rd gen)']) {
    const p = await (await br.newContext(Object.assign({}, devices[name], { deviceScaleFactor: 1 }))).newPage();
    await p.goto(page === '2d' ? 'http://localhost:8770/index.html' : 'http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.World && window.State, null, { timeout: 240000 });
    if (page === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
    await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'warrior'); World.start(); World.enterMap('world', 60, 60, 'down'); });
    await p.waitForTimeout(2500);
    const m = await p.evaluate(() => { const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); };
      const tall = [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return cs.position !== 'fixed' && r.height > 0 && r.bottom > innerHeight + 1; }).slice(0, 6).map((el) => (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + [...el.classList].join('.')) + ':' + Math.round(el.getBoundingClientRect().bottom));
      return { inner: innerWidth + 'x' + innerHeight, docH: document.documentElement.scrollHeight, bodyH: document.body.scrollHeight, scrollY: scrollY, game: R(document.getElementById('game')), minimap: R(document.querySelector('#minimap-layer canvas, #minimap-layer > *')), overflowBelow: tall }; });
    out.push({ page, name, m }); console.log(page, name, JSON.stringify(m));
    await p.context().close();
  }
  await br.close();
})();
