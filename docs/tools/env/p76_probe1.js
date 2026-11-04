// 1マップの「体の高さに形があるマス」を、当たった形の名前ごとに数える（確認用）
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const ID = process.env.MAP || 'harbor_ship_deck';
(async () => { const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 960, height: 600 } });
  await p.goto(`http://localhost:${PORT}/3d/index.html?env=v1`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('t', 'warrior'); State.data.flags.s3121_new_prologue = true; State.data.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = () => { }; });
  await p.waitForTimeout(1500);
  await p.evaluate((id) => { World.busy = false; World.enterMap(id, 14, 10, 'up', { raw: true }); }, ID);
  await p.waitForFunction((id) => { const c = MTQ3D.cache && MTQ3D.cache.get(id); return c && MTQ3D.current === c; }, ID, { timeout: 120000 }).catch(() => { }); await p.waitForTimeout(1500);
  const r = await p.evaluate((id) => { const c = MTQ3D.cache.get(id); const hits = window.MTQ3D_ENV.probeWalk(c); const by = {}; (hits.list || hits).forEach((h) => { const k = (h.obj || '?') + (h.env ? ' [env]' : ''); by[k] = (by[k] || 0) + 1; }); return { n: (hits.list || hits).length, by, sample: (hits.list || hits).slice(0, 5) }; }, ID);
  console.log(JSON.stringify(r, null, 1)); await br.close(); })().catch((e) => { console.log('例外', e.message); process.exit(1); });
