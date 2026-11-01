// Phase 1：全330マップを、表示せずに3Dで組み立てられるか（例外・組み立て時間・三角形のおよその数）
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 800, height: 600 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && (window.MTQ3D.ready || window.MTQ3D.disabled), null, { timeout: 180000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'warrior'); World.start(); MTQ3D.paused = true; });
  const ids = await p.evaluate(() => Object.keys(MAP_DEFS)); const out = []; const t0 = Date.now();
  for (let k = 0; k < ids.length; k += 10) {
    const part = await p.evaluate(async (list) => { const r = []; for (const id of list) r.push(await MTQ3D.testBuild(id)); return r; }, ids.slice(k, k + 10));
    out.push(...part); if (k % 50 === 0) console.log(k, Math.round((Date.now() - t0) / 1000) + 's', part.filter((x) => !x.ok).map((x) => x.id + ':' + x.error).slice(0, 2));
  }
  const heap = await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null);
  const sum = { total: out.length, ok: out.filter((x) => x.ok).length, failed: out.filter((x) => !x.ok).map((x) => ({ id: x.id, error: x.error })), byKind: {}, byCoverage: {}, slowest: out.filter((x) => x.ok).sort((a, b) => b.ms - a.ms).slice(0, 5).map((x) => x.id + ' ' + x.ms + 'ms'), maxTris: out.filter((x) => x.ok).sort((a, b) => b.trisApprox - a.trisApprox).slice(0, 5).map((x) => x.id + ' ' + x.trisApprox), heapAfterMB: heap, seconds: Math.round((Date.now() - t0) / 1000) };
  out.forEach((x) => { sum.byKind[x.kind] = (sum.byKind[x.kind] || 0) + 1; if (x.ok) sum.byCoverage[x.coverage] = (sum.byCoverage[x.coverage] || 0) + 1; });
  fs.writeFileSync('/home/claude/work/p3d/p1_allmaps.json', JSON.stringify({ sum, out, errors: errs }, null, 1));
  console.log(JSON.stringify(sum, null, 1)); console.log('errors', errs.length, errs.slice(0, 5)); await br.close();
})();
