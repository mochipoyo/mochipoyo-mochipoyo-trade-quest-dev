// v8.9 となりの地域（つながった世界・Join76）を裏で組み立てるときの、いちばん長い 1 回の処理（slice）と、その中身（CPU プロファイル）を調べる
//   FROM=world NB=world_grania THROTTLE=4 TAG=before|after PROFILE=1
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = process.env.BASE || ('http://localhost:' + (process.env.PORT || 8791)); const OUT = process.env.OUT || '/home/claude/envwork/docs/perf89/';
fs.mkdirSync(OUT + 'logs', { recursive: true });
const FROM = process.env.FROM || 'world'; const NB = (process.env.NB || 'world_grania').split(','); const THROTTLE = +(process.env.THROTTLE || 4); const TAG = process.env.TAG || 'before';
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  const cdp = await ctx.newCDPSession(p);
  await p.goto(BASE + '/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.party = ['hero']; World.start(); World.encounter = () => { }; });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 });
  await p.evaluate((id) => { const D = window.MAP_DEFS; let at = null; for (const k of Object.keys(D)) { for (const w of (D[k].warps || [])) if (w.to === id && typeof w.tx === 'number') { at = w; break; } if (at) break; } World.enterMap(id, at.tx, at.ty, 'down'); }, FROM);
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map === World.map && !MTQ3D.building, null, { timeout: 300000 });
  // 村の屋内の先読み・ほかのとなりの組み立てが終わるのを待つ
  await p.waitForFunction(() => !MTQ3D._pre && !MTQ3D.join.building, null, { timeout: 600000, polling: 500 }); await p.waitForTimeout(1000);
  await p.evaluate(() => { MTQ3D.paused = true; MTQ3D.join.update = function () { }; });   // 自動の組み立てを止め、指定の地域だけ組み立てる
  const res = {};
  for (const nb of NB) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
    if (process.env.PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); }
    const r = await p.evaluate((nb) => new Promise((resolve) => {
      const J = MTQ3D.join; const long = []; let po = null; try { po = new PerformanceObserver((l) => l.getEntries().forEach((e) => long.push(Math.round(e.duration)))); po.observe({ entryTypes: ['longtask'] }); } catch (e) { }
      const old = MTQ3D.cache.get(nb); if (old && old !== MTQ3D.current) { try { old.dispose(); } catch (e) { } MTQ3D.cache.delete(nb); }
      const iv = []; let last = performance.now(); let alive = true; const tick = () => { const n = performance.now(); iv.push(n - last); last = n; if (alive) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
      const t0 = performance.now(); Object.getPrototypeOf(J).build.call(J, nb);
      const wait = () => { if (J.building) return setTimeout(wait, 100); alive = false; if (po) po.disconnect(); const s = iv.slice().sort((a, b) => b - a);
        resolve({ id: nb, total: Math.round(performance.now() - t0), build: MTQ3D.stats['build_' + nb], maxSlice: MTQ3D.stats['slice_' + nb], longTasks: long.length, longMax: long.length ? Math.max.apply(null, long) : 0, longSum: long.reduce((a, b) => a + b, 0), longList: long.slice(0, 20), worstFrames: s.slice(0, 8).map((x) => Math.round(x)), failed: !!MTQ3D.failed[nb], long: (J.sliceStats && J.sliceStats.long) || [], compileSync: J.sliceStats && J.sliceStats.compileSync, textures: J.sliceStats && J.sliceStats.textures }); };
      setTimeout(wait, 100);
    }), nb);
    if (process.env.PROFILE) { const { profile } = await cdp.send('Profiler.stop'); fs.writeFileSync(OUT + 'logs/join89_' + TAG + '_' + nb + '.cpuprofile', JSON.stringify(profile)); }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    console.log(TAG, JSON.stringify(r)); res[nb] = r;
  }
  res.errors = errs; fs.writeFileSync(OUT + 'logs/join89_' + TAG + '.json', JSON.stringify(res, null, 1));
  await br.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
