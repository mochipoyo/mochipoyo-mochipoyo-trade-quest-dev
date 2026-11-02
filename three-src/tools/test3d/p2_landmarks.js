// v6.6 フィールドの目印（町・城・洞窟・塔）：全地域マップに入り、目印ごとに昼・夜の画面を撮る（ソフトウェア描画。実機の見え方・fps ではない）
//   node p2_landmarks.js [fieldId ...]   環境変数 NIGHT=0 で夜を省略、DIST=カメラ距離
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = process.env.SHOTDIR || '/home/claude/work/p3d/shots/lm/'; fs.mkdirSync(SHOT, { recursive: true });
const ONLY = process.argv.slice(2);
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 900, height: 600 } })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 240)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`);
  await p.waitForFunction(() => window.MTQ3D && (window.MTQ3D.ready || window.MTQ3D.disabled), null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; World.start(); });
  const fields = await p.evaluate(() => Object.keys(MAP_DEFS).filter((k) => MAP_DEFS[k].kind === 'field'));
  const out = [];
  for (const fid of fields) {
    if (ONLY.length && !ONLY.includes(fid)) continue;
    const locs = await p.evaluate((fid) => (MAP_DEFS[fid].locations || []).map((L) => ({ id: L.id, x: L.x, y: L.y, icon: L.icon })), fid);
    if (!locs.length) continue;
    const t0 = Date.now();
    await p.evaluate(([fid, L]) => { World.busy = false; World.enterMap(fid, L.x, L.y + 3, 'up'); }, [fid, locs[0]]);
    try { await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map === World.map && MTQ3D.mode3D(), null, { timeout: 300000 }); } catch (e) { out.push({ fid, error: 'build timeout' }); continue; }
    await p.waitForTimeout(1200);
    const st = await p.evaluate(() => ({ stats: MTQ3D.current.world && MTQ3D.current.world.stats, calls: MTQ3D.renderer.renderer.info.render.calls, tri: MTQ3D.renderer.renderer.info.render.triangles, lamps: MTQ3D.current.lampSpots.length }));
    out.push({ fid, buildSec: (Date.now() - t0) / 1000, landmarks3d: st.stats && st.stats.landmarks3d, failed: st.stats && st.stats.landmarkFailed, calls: st.calls, tri: st.tri, lamps: st.lamps });
    for (const L of locs) {
      if (process.env.LOC && L.id !== process.env.LOC) continue;
      for (const [tag, tod] of [['day', 0.42], ['night', 0.0]]) {
        if (tag === 'night' && process.env.NIGHT === '0') continue;
        await p.evaluate(([L, tod, dist]) => { const pl = World.player; pl.x = L.x; pl.y = L.y + 3; pl.px = pl.x * 32; pl.py = pl.y * 32; pl.dir = 'up'; State.data.timeOfDay = tod; MTQ3D.lighting.preview = tod; const c = MTQ3D.camera; if (dist) { c.wantDist = +dist; c.dist = +dist; } c.first = true; }, [L, tod, process.env.DIST || 0]);
        await p.waitForTimeout(900);
        await p.screenshot({ path: SHOT + fid + '__' + L.id + '_' + tag + '.jpg', type: 'jpeg', quality: 80, timeout: 180000 });
      }
    }
    console.log(JSON.stringify(out[out.length - 1]));
  }
  fs.writeFileSync('/home/claude/work/p3d/lm_landmarks.json', JSON.stringify({ out, errors: errs }, null, 1));
  console.log('errors', errs.length, errs.slice(0, 6)); await br.close();
})();
