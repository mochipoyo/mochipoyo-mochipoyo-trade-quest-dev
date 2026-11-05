// v7.6 つないだ世界：となりの地域を組み立てている間、画面が止まる長さ（longtask）を測る（ヘッドレス・ソフトウェア描画）
const { chromium } = require('playwright');
const PORT = process.env.PORT || 8772; const START = process.env.START || 'world'; const Q = process.env.Q || 'high'; const NB = process.env.NB || 'world_grania';
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript((Q) => { try { localStorage.setItem('mtq3d-quality', Q); } catch (e) { } }, Q);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived', 'kalion_open'].forEach((f) => d.flags[f] = true); d.hero.level = 30; World.start(); });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(async ([START, NB]) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const m = World.getMap(START); let t = null; for (let x = 150; x > 120 && !t; x--) for (let y = 30; y < 90; y++) if (Vehicle.terrainOk('sailboat', m, x, y)) { t = { x, y }; break; }
    const d = State.data; document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; d.aboard = 'sailboat'; d.vehicles.sailboat = { owned: true, map: START, x: t.x, y: t.y, port: { map: START, x: t.x, y: t.y } };
    // となりを捨てておく（測るため）
    if (MTQ3D.cache.get(NB) && MTQ3D.cache.get(NB) !== MTQ3D.current) { MTQ3D.join.clear(); try { MTQ3D.cache.get(NB).dispose(); } catch (e) { } MTQ3D.cache.delete(NB); }
    MTQ3D.join.building = '__hold';   // となりを組み立て始めないよう止めておく（ふだんの重さを先に測る）
    World.enterMap(START, t.x, t.y, 'right', { raw: true });
    for (let i = 0; i < 600 && !(MTQ3D.current && MTQ3D.current.map.id === START); i++) await sleep(100);
    await sleep(2000);
    const base = async (ms) => { const f = []; let l = performance.now(); let on = true; const rf = () => { const n = performance.now(); f.push(n - l); l = n; if (on) requestAnimationFrame(rf); }; requestAnimationFrame(rf); await sleep(ms); on = false; const s = f.slice(2).sort((a, b) => a - b); return { n: s.length, med: Math.round(s[s.length >> 1] || 0), max: Math.round(s[s.length - 1] || 0) }; };
    const base0 = await base(6000);
    MTQ3D.join.building = null;
    const longs = []; const obs = new PerformanceObserver((l) => l.getEntries().forEach((e) => longs.push(Math.round(e.duration)))); obs.observe({ entryTypes: ['longtask'] });
    const frames = []; let last = performance.now(); let run = true; const raf = () => { const n = performance.now(); frames.push(n - last); last = n; if (run) requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    const t0 = performance.now(); for (let i = 0; i < 1200 && !MTQ3D.join.shown.has(NB); i++) await sleep(100);
    await sleep(3000); run = false; obs.disconnect(); const base1 = await base(6000);
    const fr = frames.slice(2).sort((a, b) => b - a);
    return { base0, base1, start: START, nb: NB, at: t, built: MTQ3D.join.shown.has(NB), ms: Math.round(performance.now() - t0), buildStat: MTQ3D.stats['build_' + NB], slice: MTQ3D.join.sliceStats ? { n: MTQ3D.join.sliceStats.n, max: Math.round(MTQ3D.join.sliceStats.max), sum: Math.round(MTQ3D.join.sliceStats.sum), compileSync: MTQ3D.join.sliceStats.compileSync, compileMs: MTQ3D.join.sliceStats.compileMs, textures: MTQ3D.join.sliceStats.textures } : null, longest: longs.slice().sort((a, b) => b - a).slice(0, 8), nLong: longs.length, sumLong: longs.reduce((a, b) => a + b, 0), worstFrames: fr.slice(0, 6).map(Math.round) };
  }, [START, NB]);
  console.log(JSON.stringify(r)); console.log('errors', JSON.stringify(errs.slice(0, 3))); await br.close();
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
