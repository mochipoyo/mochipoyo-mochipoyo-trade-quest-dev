// v8.9 見た目の比べ（ヘッドレス Chromium・ソフトウェア描画。実機の GPU ではない）：同じ場所・同じ時刻・同じカメラで 3D の画面を写す
//   VIEW=p390|land  TAG=before|after  SCENES=poyo,world,rivel,inn,zoomout  OUT=...
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = process.env.BASE || ('http://localhost:' + (process.env.PORT || 8791)); const OUT = process.env.OUT || '/home/claude/envwork/docs/perf89/';
fs.mkdirSync(OUT + 'shots', { recursive: true });
const VIEW = process.env.VIEW || 'p390'; const TAG = process.env.TAG || 'after';
const VIEWS = { p390: { width: 390, height: 844 }, land: { width: 844, height: 390 } };
const SC = { poyo: { map: 'poyo_village', x: 24, y: 30 }, world: { map: 'world', x: null }, rivel: { map: 'rivel_town', x: null }, inn: { map: 'poyo_inn', x: null }, zoomout: { map: 'poyo_village', x: 30, y: 22, zoom: 36 }, night: { map: 'poyo_village', x: 24, y: 30, tod: 0.95 } };
const SCENES = (process.env.SCENES || 'poyo,world,rivel,inn,zoomout,night').split(',');
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: VIEWS[VIEW], isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); localStorage.setItem('mtq3d-smooth', 'off'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await p.goto(BASE + '/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.party = ['hero']; d.settings.minimap = 'off'; World.start(); World.encounter = () => { }; });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 });
  const info = {};
  for (const name of SCENES) {
    const sc = SC[name];
    await p.evaluate((sc) => {
      document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; MTQ3D.paused = false;
      const D = window.MAP_DEFS; let at = null; if (sc.x === null) { for (const k of Object.keys(D)) { for (const w of (D[k].warps || [])) if (w.to === sc.map && typeof w.tx === 'number') { at = { x: w.tx, y: w.ty }; break; } if (at) break; } } else at = { x: sc.x, y: sc.y };
      World.enterMap(sc.map, at.x, at.y, 'down'); State.data.timeOfDay = sc.tod !== undefined ? sc.tod : 0.42;
    }, sc);
    await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map === World.map && !MTQ3D.building, null, { timeout: 300000 });
    await p.evaluate((sc) => { const c = MTQ3D.camera; if (sc.zoom) { c.wantDist = sc.zoom; c.dist = sc.zoom; } else { c.wantDist = 20; c.dist = 20; } c.first = true; MTQ3D.join && (MTQ3D.join.update = MTQ3D.join.update); }, sc);
    await p.waitForTimeout(2500);   // 数コマ描く（ソフトウェア描画）
    await p.evaluate(() => { MTQ3D.paused = true; MTQ3D.renderer.render(); });
    const r = await p.evaluate(() => { const i = MTQ3D.renderer.renderer.info.render; return { calls: i.calls, tri: i.triangles, half: MTQ3D.lighting.shadowHalf89 || 22, pr: MTQ3D.renderer.pixelRatio }; });
    const el = await p.$('#g3-canvas') || await p.$('canvas');
    await p.screenshot({ path: OUT + 'shots/' + TAG + '_' + VIEW + '_' + name + '.png', clip: await p.evaluate(() => { const c = document.querySelector('#g3-canvas') || MTQ3D.renderer.canvas; const b = c.getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width, height: b.height }; }) });
    info[name] = r; console.log(TAG, VIEW, name, JSON.stringify(r));
  }
  fs.writeFileSync(OUT + 'logs/shots89_' + TAG + '_' + VIEW + '.json', JSON.stringify({ info, errs }, null, 1));
  await br.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
