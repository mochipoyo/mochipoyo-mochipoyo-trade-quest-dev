// v7.6 つないだ世界（3D）：世界を 2 周（12 か所ずつ）して、組み立てた地図の数・GPU の資源・JS のメモリが増え続けないか（ヘッドレス・低画質）
const { chromium } = require('playwright');
const PORT = process.env.PORT || 8772; const Q = process.env.Q || 'low';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch({ args: ['--enable-precise-memory-info'] }); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript((Q) => { try { localStorage.setItem('mtq3d-quality', Q); } catch (e) { } }, Q);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready', 'airship_owned', 'kalion_open', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived', 'dark_route_open'].forEach((f) => d.flags[f] = true); d.hero.level = 30; World.start(); });
  await p.waitForTimeout(1500);
  const ROUTE = process.env.LOCAL ? [['world', 100, 50], ['world_grania', 90, 50], ['world_kalion', 80, 60], ['world_snow', 80, 60], ['world_dark', 80, 60], ['world_magicka', 120, 60], ['world_dragon', 80, 60], ['world_tempus', 80, 60], ['world_islands', 80, 60], ['world_desert', 80, 60], ['world', 60, 80], ['world_tempus', 100, 40]] : [[100, 170], [250, 170], [240, 60], [440, 120], [760, 150], [600, 330], [600, 450], [400, 330], [160, 300], [80, 420], [60, 200], [420, 220]];
  const series = [];
  for (let lap = 0; lap < 2; lap++) for (const pt of ROUTE) {
    const r = await p.evaluate(async (pt) => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const L = typeof pt[0] === 'string' ? { map: pt[0], x: pt[1], y: pt[2] } : World76.toLocal(pt[0], pt[1]); const d = State.data; document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; d.aboard = 'airship'; d.vehicles.airship = { owned: true, map: L.map, x: L.x, y: L.y, port: { map: L.map, x: L.x, y: L.y } }; World.enterMap(L.map, L.x, L.y, 'down', { raw: true });
      const JB = () => MTQ3D.join && MTQ3D.join.building; const t0 = performance.now(); while (performance.now() - t0 < 400000) { await sleep(500); if (MTQ3D.current && MTQ3D.current.map.id === L.map && !MTQ3D.building && !JB() && performance.now() - t0 > 4000) { await sleep(1500); if (!JB()) break; } }
      const R = MTQ3D.renderer.renderer; const mem = R.info.memory; const gen = [...MTQ3D.cache.values()].filter((ms) => ms.coverage === 'generic').length;
      return { map: L.map, ms: Math.round(performance.now() - t0), cache: MTQ3D.cache.size, gen, shown: MTQ3D.join ? MTQ3D.join.shown.size : 0, walls: MTQ3D.join ? MTQ3D.join.walls.size : 0, geo: mem.geometries, tex: mem.textures, prog: R.info.programs ? R.info.programs.length : null, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, scene: MTQ3D.scene.children.length }; }, pt);
    r.lap = lap; series.push(r); console.log(JSON.stringify(r));
  }
  const lap0 = series.filter((s) => s.lap === 0), lap1 = series.filter((s) => s.lap === 1);
  const mx = (a, k) => Math.max(...a.map((s) => s[k] || 0));
  ok(mx(series, 'shown') <= 8, '並べる地図は 8 枚まで（最大 ' + mx(series, 'shown') + '）');
  ok(mx(lap1, 'gen') <= mx(lap0, 'gen') + 2 && mx(series, 'gen') <= 16, '組み立てた地図の数が増え続けない（1 周目 最大 ' + mx(lap0, 'gen') + '・2 周目 最大 ' + mx(lap1, 'gen') + '）');
  ok(mx(lap1, 'geo') <= mx(lap0, 'geo') * 1.25 + 50, 'GPU の形の数（geometries）が増え続けない（1 周目 最大 ' + mx(lap0, 'geo') + '・2 周目 最大 ' + mx(lap1, 'geo') + '）');
  ok(mx(lap1, 'tex') <= mx(lap0, 'tex') * 1.25 + 20, 'GPU の画像の数（textures）が増え続けない（1 周目 最大 ' + mx(lap0, 'tex') + '・2 周目 最大 ' + mx(lap1, 'tex') + '）');
  if (series[0].heap) ok(mx(lap1, 'heap') <= mx(lap0, 'heap') * 1.3 + 50, 'JS のメモリ（1 周目 最大 ' + mx(lap0, 'heap') + 'MB・2 周目 最大 ' + mx(lap1, 'heap') + 'MB）');
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
