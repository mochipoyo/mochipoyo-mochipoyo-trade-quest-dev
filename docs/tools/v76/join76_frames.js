// フィールド（アルカディア 28,62）での 1 フレームの時間を測る（高画質・ヘッドレス）。PORT
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const MAPX = (process.env.MAPX || 'world,28,62').split(',').map((v, i) => i ? +v : v);
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); });
  await p.waitForTimeout(1500);
  await p.evaluate((MAPX) => { World.busy = false; World.enterMap(MAPX[0], MAPX[1], MAPX[2], 'up'); }, MAPX);
  await p.waitForFunction((MAPX) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === MAPX[0], MAPX, { timeout: 240000 });
  await p.waitForTimeout(8000);
  const r = await p.evaluate(async () => { const f = []; let l = performance.now(); await new Promise((res) => { const rf = () => { const k = performance.now(); f.push(Math.round(k - l)); l = k; if (f.length >= 6) res(); else requestAnimationFrame(rf); }; requestAnimationFrame(rf); });
    const R = MTQ3D.renderer.renderer; return { frames: f.slice(1), shown: MTQ3D.join ? [...MTQ3D.join.shown.keys()] : null, walls: MTQ3D.join ? [...MTQ3D.join.walls.keys()] : null, building: MTQ3D.join ? MTQ3D.join.building : null, calls: R.info.render.calls, tris: R.info.render.triangles, geo: R.info.memory.geometries, scene: MTQ3D.scene.children.length }; });
  const t0 = Date.now(); await p.screenshot({ path: '/tmp/claude-0/-home-claude/d54f6bea-9e8c-5772-8b37-e04c4e3687a5/scratchpad/frames_' + PORT + '.jpg', type: 'jpeg', quality: 70, timeout: 300000 }); r.shotMs = Date.now() - t0;
  console.log(JSON.stringify(r), JSON.stringify(errs.slice(0, 2))); await br.close();
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
