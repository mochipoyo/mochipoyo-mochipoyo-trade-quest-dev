// Phase 1：汎用3Dワールドの確認。指定のマップへ入り、3Dの組み立て・描画の負荷・画面を記録する（ソフトウェア描画。実機の fps ではない）
//   node p1_maps.js [mapId ...]
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = '/home/claude/work/p3d/shots/'; const TAG = process.env.TAG || 'p1';
const MAPS = process.argv.slice(2).length ? process.argv.slice(2) : ['world', 'rivel_town', 'rivel_castle', 'lost_forest', 'oblivion_cave_1', 'harbor_town'];
(async () => {
  const br = await chromium.launch();
  const p = await (await br.newContext({ viewport: { width: 1100, height: 700 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`);
  await p.waitForFunction(() => window.MTQ3D && (window.MTQ3D.ready || window.MTQ3D.disabled), null, { timeout: 180000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; State.data.timeOfDay = 0.42; World.start(); });
  const out = [];
  for (const id of MAPS) {
    const r = await p.evaluate((id) => {
      const defs = window.MAP_DEFS; let e = null;
      if (id === 'world') e = { x: 0, y: 0 };
      for (const k in defs) { (defs[k].warps || []).forEach((w) => { if (!e && w.to === id && k !== id) e = { x: w.tx, y: w.ty }; }); }
      if (id === 'world') { const pv = (defs.world.warps || []).find((w) => w.to === 'poyo_village'); const back = (defs.poyo_village.warps || []).find((w) => w.to === 'world'); e = back ? { x: back.tx, y: back.ty } : { x: 30, y: 40 }; }
      if (!e) return { error: 'no entry' };
      World.enterMap(id, e.x, e.y, 'down'); window.__t0 = performance.now(); return { x: e.x, y: e.y };
    }, id);
    if (r.error) { out.push({ id, error: r.error }); continue; }
    try { await p.waitForFunction(() => window.MTQ3D.current && window.MTQ3D.current.map === World.map, null, { timeout: 240000 }); }
    catch (e) { out.push({ id, error: 'timeout building', failed: await p.evaluate(() => Object.keys(MTQ3D.failed)) }); continue; }
    await p.waitForTimeout(2500);
    if (process.env.ZOOM) await p.evaluate((z) => { const c = MTQ3D.camera; c.maxDist = Math.max(c.maxDist, +z); c.wantDist = +z; c.dist = +z; c.first = true; MTQ3D.frame(performance.now()); }, process.env.ZOOM);
    const m = await p.evaluate(() => {
      const a = window.MTQ3D; a.paused = true; const info = a.renderer.renderer.info; const ts = [];
      for (let i = 0; i < 2; i++) { const t = performance.now(); a.renderer.render(); a.renderer.renderer.getContext().finish(); ts.push(Math.round(performance.now() - t)); }
      const ms = a.current; return { map: World.map.id, kind: World.map.kind, coverage: ms.coverage, theme: ms.theme ? ms.theme.region + '/' + ms.theme.place : null, dark: !!ms.dark,
        buildMs: a.stats['build_' + World.map.id], world: a.stats['world_' + World.map.id] || null, calls: info.render.calls, tri: info.render.triangles, geo: info.memory.geometries, tex: info.memory.textures, frameMsSoftware: ts,
        heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null, npcs: ms.npcs.length, chests: ms.chests.length, pos: [World.player.x, World.player.y], failedModels: a.models.failed.slice(0, 5) };
    });
    await p.screenshot({ path: SHOT + TAG + '_' + id + '.png', timeout: 180000 });
    await p.evaluate(() => { window.MTQ3D.paused = false; });
    out.push(m); console.log(JSON.stringify(m));
  }
  fs.writeFileSync('/home/claude/work/p3d/' + TAG + '_maps.json', JSON.stringify({ out, errors: errs }, null, 1));
  console.log('errors', errs.length, errs.slice(0, 8));
  await br.close();
})();
