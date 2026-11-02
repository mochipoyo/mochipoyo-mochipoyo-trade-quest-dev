// v6.6 夜の町の街灯のチラつき：歩きながら毎フレーム、街灯ごとの「点光源の明るさの合計」を記録し、1フレームでの急な変化（＝チラつき）を数える（ソフトウェア描画）
//   PORT=8770（新）／8775（以前の版）  node p2_lampflicker.js [マップ] [x] [y] [キー]
const { chromium } = require('playwright');
const PORT = process.env.PORT || 8770; const [MAP, X, Y, KEY] = [process.argv[2] || 'rivel_town', +(process.argv[3] || 0), +(process.argv[4] || 0), process.argv[5] || 'up'];
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 800, height: 520 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(([m, x, y]) => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); World.start();
    let e = null; if (!x) for (const k in MAP_DEFS) (MAP_DEFS[k].warps || []).forEach((w) => { if (!e && w.to === m && k !== m) e = { x: w.tx, y: w.ty }; }); World.enterMap(m, x || e.x, y || e.y, 'up'); }, [MAP, X, Y]);
  await p.waitForFunction((m) => World.map.id === m && MTQ3D.current && MTQ3D.current.map === World.map && MTQ3D.mode3D(), MAP, { timeout: 240000 });
  const r = await p.evaluate(async (key) => {
    const L = MTQ3D.lighting; window.__dur = 9000; L.preview = 0.0; State.data.timeOfDay = 0.0; await new Promise((ok) => setTimeout(ok, 800));
    const spots = MTQ3D.current.lampSpots; const key3 = (v) => v.x.toFixed(2) + ',' + v.z.toFixed(2); const idx = {}; spots.forEach((s, i) => { idx[key3(s.pos)] = i; });
    const frames = []; Engine.Input.keys[key] = true; const t0 = performance.now();
    await new Promise((done) => { const tick = () => { const per = new Float32Array(spots.length); L.lampLights.forEach((l) => { if (l.intensity <= 0) return; const i = idx[key3(l.position)]; if (i !== undefined) per[i] += l.intensity; }); frames.push({ t: performance.now() - t0, per }); if (performance.now() - t0 < (+window.__dur || 4000)) requestAnimationFrame(tick); else done(); }; requestAnimationFrame(tick); });
    Engine.Input.keys[key] = false;
    let maxJump = 0, jumps = 0, peak = 0; for (let f = 1; f < frames.length; f++) for (let i = 0; i < spots.length; i++) { const d = Math.abs(frames[f].per[i] - frames[f - 1].per[i]); peak = Math.max(peak, frames[f].per[i]); maxJump = Math.max(maxJump, d); }
    for (let f = 1; f < frames.length; f++) for (let i = 0; i < spots.length; i++) if (Math.abs(frames[f].per[i] - frames[f - 1].per[i]) > peak * 0.5) jumps++;
    const dts = frames.slice(1).map((fr, i) => fr.t - frames[i].t); const avgDt = dts.reduce((a, b) => a + b, 0) / Math.max(1, dts.length);
    return { spots: spots.length, lights: L.lampLights.length, frames: frames.length, avgFrameMs: +avgDt.toFixed(1), peak: +peak.toFixed(2), maxJumpPerFrame: +maxJump.toFixed(2), maxJumpRatio: +(maxJump / Math.max(1e-6, peak)).toFixed(2), bigJumps: jumps, moved: [World.player.x, World.player.y] };
  }, KEY);
  console.log(JSON.stringify(Object.assign({ port: PORT, map: MAP }, r)), 'errors', errs.length); await br.close();
})();
