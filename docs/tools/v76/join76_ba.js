// v7.6 つないだ世界：前後の画像（同じ場所・同じカメラ）。PORT・TAG（before/after）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8772; const TAG = process.env.TAG || 'after'; const SHOT = '/home/claude/work/p3d/shots/v76/join76_ba/'; fs.mkdirSync(SHOT, { recursive: true });
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'high'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived', 'kalion_open'].forEach((f) => d.flags[f] = true); d.hero.level = 30; World.start(); });
  await p.waitForTimeout(1500);
  const place = (map, x, y, veh, dir) => p.evaluate(([map, x, y, veh, dir]) => { const d = State.data; document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; d.aboard = veh || null; if (veh) d.vehicles[veh] = { owned: true, map, x, y, port: { map, x, y } }; World.enterMap(map, x, y, dir || 'right', { raw: true }); }, [map, x, y, veh, dir]);
  const waitCur = (id) => p.waitForFunction((id) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === id && World.map.id === id, id, { timeout: 180000 }).then(() => true).catch(() => false);
  const water = (map, x0, y0, veh) => p.evaluate(([map, x0, y0, veh]) => { const m = World.getMap(map); for (let r = 0; r < 40; r++) for (let dy = -r; dy <= r; dy++) { const y = y0 + dy, x = x0; if (y >= 0 && y < m.h && Vehicle.terrainOk(veh, m, x, y)) return { x, y }; } return null; }, [map, x0, y0, veh]);
  // a) アルカディアの東の端（帆船）
  const w = await water('world', 152, 40, 'sailboat'); await place('world', w.x, w.y, 'sailboat'); await waitCur('world');
  await p.evaluate(() => { MTQ3D.lighting.preview = 0.4; MTQ3D.camera.wantDist = 34; });
  if (TAG === 'after') await p.waitForFunction(() => MTQ3D.join && MTQ3D.join.shown.has('world_grania'), null, { timeout: 180000 }).catch(() => { });
  await p.waitForTimeout(3500); await p.screenshot({ path: SHOT + TAG + '_a_edge.jpg', type: 'jpeg', quality: 82 });
  // b) 時の神殿領の東の端（陸）
  const b = await p.evaluate(() => { const m = World.getMap('world_tempus'); for (let x = 150; x > 100; x--) for (let y = 55; y < 66; y++) if (m.passable(x, y, State.data)) return { x, y }; return { x: 120, y: 60 }; });
  await place('world_tempus', b.x, b.y, null); await waitCur('world_tempus'); await p.evaluate(() => { MTQ3D.lighting.preview = 0.4; MTQ3D.camera.wantDist = 34; });
  if (TAG === 'after') await p.waitForFunction(() => MTQ3D.join && MTQ3D.join.shown.has('world_magicka'), null, { timeout: 180000 }).catch(() => { });
  await p.waitForTimeout(3500); await p.screenshot({ path: SHOT + TAG + '_b_tempus_east.jpg', type: 'jpeg', quality: 82 });
  // c) 地域の地図
  await p.evaluate(() => { Minimap.openBig(); Minimap.setMode('world'); }); await p.waitForTimeout(1500); await p.screenshot({ path: SHOT + TAG + '_c_map.jpg', type: 'jpeg', quality: 82 });
  await p.evaluate(() => { const b = document.querySelector('.bm-ctl [data-act="fit"]'); if (b) b.click(); }); await p.waitForTimeout(1200); await p.screenshot({ path: SHOT + TAG + '_d_map_all.jpg', type: 'jpeg', quality: 82 });
  await p.evaluate(() => { Minimap.setMode('globe'); }); await p.waitForTimeout(1500); await p.screenshot({ path: SHOT + TAG + '_e_globe.jpg', type: 'jpeg', quality: 82 });
  console.log(TAG, 'errors', JSON.stringify(errs.slice(0, 3))); await br.close();
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
