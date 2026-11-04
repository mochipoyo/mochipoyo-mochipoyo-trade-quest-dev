// v7.6 環境リデザイン：マップに入って、決めた場所（主人公の位置）から撮る。?env=off（従来）と ?env=v1（新しい環境）を同じ場所・同じカメラで撮り比べる
// 環境変数：PORT・DEV・TAG・MODES（"off,v1"）・SPOTS（JSON：[{map, x, y, dir, name}]）・SHOTDIR
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8772; const TAG = process.env.TAG || 'pc'; const SHOT = (process.env.SHOTDIR || '/home/claude/work/p3d/shots/v76/') + TAG + '/'; fs.mkdirSync(SHOT, { recursive: true });
const MODES = (process.env.MODES || 'off,v1').split(','); const SPOTS = JSON.parse(process.env.SPOTS || '[]');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const out = [];
  for (const mode of MODES) {
    let ctxOpt = { viewport: { width: 1280, height: 720 } }; if (process.env.DEV) ctxOpt = Object.assign({}, devices[process.env.DEV], { deviceScaleFactor: 1 });
    const bctx = await br.newContext(ctxOpt); if (process.env.QUALITY) await bctx.addInitScript((q) => { try { localStorage.setItem('mtq3d-quality', q); } catch (e) { } }, process.env.QUALITY);
    const p = await bctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/Failed to load resource/.test(t)) errs.push('console: ' + t.slice(0, 200)); if (/\[環境\]/.test(t)) console.log('     ' + t.slice(0, 300)); });
    if (process.env.FLAGS) await bctx.addInitScript((f) => { window.__FLAGS = JSON.parse(f); }, process.env.FLAGS);   // 物語のフラグ（例：{"zeromea_reformed":true}）
    await p.goto(`http://localhost:${PORT}/3d/index.html?env=${mode}`);
    await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
    await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.hero.level = 40; ['lina', 'kyle'].forEach((id) => State.joinCompanion(id)); Object.assign(d.flags, window.__FLAGS || {}); World.start(); World.encounter = () => { }; });
    await p.waitForTimeout(1500);
    for (let s of SPOTS) {
      const t0 = Date.now();
      if (s.x === undefined) { const xy = await p.evaluate((id) => { const m = World.getMap(id); const cx = Math.floor(m.w / 2), cy = Math.floor(m.h / 2); for (let r = 0; r < Math.max(m.w, m.h); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue; if (!Tiles.isSolid(m.tile(x, y)) && !(m.npcAt && m.npcAt(x, y)) && !(m.warpAt && m.warpAt(x, y))) return [x, y]; } return [2, 2]; }, s.map); s = Object.assign({}, s, { x: xy[0], y: xy[1] }); }
      await p.evaluate((s) => { World.busy = false; World.enterMap(s.map, s.x, s.y, s.dir || 'up', { raw: true }); }, s);
      await p.waitForFunction((id) => { const c = MTQ3D.cache && MTQ3D.cache.get(id); return c && MTQ3D.current === c; }, s.map, { timeout: 120000 }).catch(() => { });
      if (s.dist) await p.evaluate((d) => { MTQ3D.camera.wantDist = d; MTQ3D.camera.maxDist = Math.max(MTQ3D.camera.maxDist, d); }, s.dist);
      await p.waitForTimeout(s.dist ? 4000 : 2500);
      const r = await p.evaluate((id) => { const c = MTQ3D.cache.get(id); const q = MTQ3D.quality; const E = window.MTQ3D_ENV; const ri = MTQ3D.renderer && MTQ3D.renderer.renderer ? MTQ3D.renderer.renderer.info : null; return { quality: q, built: !!c, buildMs: c && c.buildMs, recipe: c && c.envRecipe ? c.envRecipe.id : null, env: E ? E.info() : null, calls: ri ? ri.render.calls : null, tris: ri ? ri.render.triangles : null, tex: ri ? ri.memory.textures : null, geo: ri ? ri.memory.geometries : null }; }, s.map);
      const name = s.map + '_' + (s.name || (s.x + '_' + s.y)) + '_' + mode + '.jpg'; await p.screenshot({ path: SHOT + name, type: 'jpeg', quality: 76, timeout: 180000 });
      if (process.env.FRAMES) r.frame = await p.evaluate(() => new Promise((res) => { const t = []; let last = performance.now(); const end = last + 3000; const f = (now) => { t.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else { t.sort((a, b) => a - b); res({ n: t.length, avg: +(t.reduce((a, b) => a + b, 0) / t.length).toFixed(1), p95: +t[Math.floor(t.length * 0.95)].toFixed(1) }); } }; requestAnimationFrame(f); }));   // フレーム時間（ヘッドレスのソフトウェア描画。実機の値ではない）
      out.push(Object.assign({ mode, spot: s, shot: name, ms: Date.now() - t0 }, r));
      console.log(`     ${mode} ${s.map} ${s.name || ''}: q=${r.quality} recipe=${r.recipe} build=${r.buildMs}ms calls=${r.calls} tris=${r.tris} tex=${r.tex} geo=${r.geo}` + (r.frame ? ` frame=${r.frame.avg}ms(p95 ${r.frame.p95})` : ''));
    }
    ok(!errs.length, mode + '：ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
    await p.close();
  }
  fs.writeFileSync(SHOT + 'result.json', JSON.stringify(out, null, 1));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
