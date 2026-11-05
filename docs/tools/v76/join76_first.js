// v7.6 つないだ世界：となりの地域を初めて映すフレームの重さ（ヘッドレス）
const { chromium } = require('playwright');
const PORT = process.env.PORT || 8772; const Q = process.env.Q || 'low';
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript((Q) => { try { localStorage.setItem('mtq3d-quality', Q); } catch (e) { } }, Q);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready'].forEach((f) => d.flags[f] = true); d.hero.level = 30; World.start(); });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const m = World.getMap('world'); let t = null; for (let x = 150; x > 120 && !t; x--) for (let y = 30; y < 90; y++) if (Vehicle.terrainOk('sailboat', m, x, y)) { t = { x, y }; break; }
    const d = State.data; World.busy = false; d.aboard = 'sailboat'; d.vehicles.sailboat = { owned: true, map: 'world', x: t.x, y: t.y, port: { map: 'world', x: t.x, y: t.y } };
    MTQ3D.join.building = '__hold'; World.enterMap('world', t.x, t.y, 'right', { raw: true });
    for (let i = 0; i < 600 && !(MTQ3D.current && MTQ3D.current.map.id === 'world'); i++) await sleep(100);
    await sleep(1500);
    // 組み立てだけ（映さない）：layout を止める
    const J = MTQ3D.join; const lay = J.layout.bind(J); J.layout = () => { }; J.building = null;
    J.build('world_grania'); for (let i = 0; i < 3000 && (J.building || !MTQ3D.cache.get('world_grania')); i++) await sleep(100);
    J.building = '__hold'; await sleep(3000);
    const frames = async (n) => { const f = []; let l = performance.now(); await new Promise((res) => { const rf = () => { const k = performance.now(); f.push(Math.round(k - l)); l = k; if (f.length >= n) res(); else requestAnimationFrame(rf); }; requestAnimationFrame(rf); }); return f.slice(1); };
    const before = await frames(5);
    J.layout = lay; J.layout();
    const after = await frames(6);
    J.building = null;
    const ms = MTQ3D.cache.get('world_grania'); const seen = new Set(); let bytes = 0, meshes = 0, tris = 0, inst = 0; const texs = new Set(); let texPx = 0;
    ms.root.traverse((o) => { if (!o.geometry) return; meshes++; const g = o.geometry; const add = (at) => { if (at && !seen.has(at)) { seen.add(at); bytes += (at.array ? at.array.byteLength : 0); } }; for (const k in g.attributes) add(g.attributes[k]); add(g.index); if (o.instanceMatrix) { add(o.instanceMatrix); inst += o.count; } if (o.instanceColor) add(o.instanceColor); tris += (g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0)) / 3 * (o.isInstancedMesh ? o.count : 1);
      const mm = Array.isArray(o.material) ? o.material : [o.material]; mm.forEach((mt) => { if (!mt) return; for (const k in mt) { const v = mt[k]; if (v && v.isTexture && !texs.has(v)) { texs.add(v); const im = v.image; if (im && im.width) texPx += im.width * im.height; } } }); });
    return { before, after, shown: [...J.shown.keys()], stats: J.sliceStats, geomMB: +(bytes / 1048576).toFixed(1), meshes, trisM: +(tris / 1e6).toFixed(2), instances: inst, textures: texs.size, texMpx: +(texPx / 1e6).toFixed(1) };
  });
  console.log(JSON.stringify(r)); console.log('errors', JSON.stringify(errs.slice(0, 3))); await br.close();
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
