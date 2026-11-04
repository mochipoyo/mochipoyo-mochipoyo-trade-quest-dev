// フィールドの目印（field_kit）の近くの歩けるマスに立って撮る。MAPS（カンマ区切り）・N（各マップの枚数）・TAG
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8772; const TAG = process.env.TAG || 'lm'; const SHOT = '/home/claude/work/p3d/shots/v76/' + TAG + '/'; fs.mkdirSync(SHOT, { recursive: true });
const MAPS = (process.env.MAPS || 'world').split(','); const N = +(process.env.N || 2); const errs = [];
(async () => {
  const br = await chromium.launch(); const bctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); const p = await bctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html?env=v1`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.hero.level = 40; World.start(); World.encounter = () => { }; });
  await p.waitForTimeout(1500); const out = [];
  for (const id of MAPS) {
    await p.evaluate((id) => { World.busy = false; World.enterMap(id, 2, 2, 'up', { raw: true }); }, id);
    await p.waitForFunction((id) => { const c = MTQ3D.cache && MTQ3D.cache.get(id); return c && MTQ3D.current === c; }, id, { timeout: 120000 }).catch(() => { });
    await p.waitForTimeout(1500);
    const lms = await p.evaluate((id) => { const c = MTQ3D.cache.get(id); let g = null; c.root.traverse((o) => { if (o.name === 'env_field_kit') g = o; }); if (!g) return []; const m = World.getMap(id);
      return g.children.filter((o) => o.isGroup && o.scale.x > 1).map((o) => { const lx = Math.floor(o.position.x), lz = Math.floor(o.position.z); let best = null;
        for (let r = 2; r <= 6 && !best; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; const x = lx + dx, y = lz + dz; if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue; if (!Tiles.isSolid(m.tile(x, y)) && !best) best = { x, y, dir: Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'left' : 'right') : (dz > 0 ? 'up' : 'down') }; }
        return { lx, lz, best }; }).filter((q) => q.best); }, id);
    console.log(id, '目印', lms.length);
    for (const q of lms.slice(0, N)) {
      await p.evaluate((q) => { World.busy = false; World.enterMap(q.id, q.best.x, q.best.y, q.best.dir, { raw: true }); }, Object.assign({ id }, q));
      await p.waitForTimeout(2200); const name = `${id}_${q.lx}_${q.lz}.jpg`; await p.screenshot({ path: SHOT + name, type: 'jpeg', quality: 72 }); out.push({ id, q, name });
    }
  }
  fs.writeFileSync(SHOT + 'result.json', JSON.stringify(out, null, 1)); console.log('ページのエラー', errs.length, JSON.stringify(errs.slice(0, 3))); await br.close();
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
