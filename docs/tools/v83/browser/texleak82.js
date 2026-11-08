// GPU の画像（WebGL texture）がどこで作られて残っているか：gl.createTexture / deleteTexture を包んで、作られた時の three.js の Texture と、そのとき描いていた物を記録
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8791;
const SEQ = 'tradia_exchange:12:9,tradia_inn:7:9,magicka_inn:7:9,rivel_castle_approach:32:40,vol_main_hall:14:15,ruins_post:8:9'.split(',').map((a) => { const q = a.split(':'); return [q[0], +q[1], +q[2]]; });
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 960, height: 540 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { }
    const P = WebGL2RenderingContext.prototype; const c0 = P.createTexture, d0 = P.deleteTexture; window.__tex = new Map(); window.__phase = 0; let n = 0;
    P.createTexture = function () { const t = c0.apply(this, arguments); const st = (new Error().stack || '').split('\n').slice(2, 9).map((l) => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '')).join(' | '); window.__tex.set(t, { n: n++, phase: window.__phase, st }); return t; };
    P.deleteTexture = function (t) { window.__tex.delete(t); return d0.apply(this, arguments); };
  });
  const p = await ctx.newPage();
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('t', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = () => { }; });
  const enter = async (id, x, y) => { await p.evaluate(([id, x, y]) => { World.busy = false; World.enterMap(id, x, y, 'down', { raw: true }); }, [id, x, y]); await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && !MTQ3D.building, id, { timeout: 180000 }); await p.waitForTimeout(400); };
  await p.waitForFunction(() => MTQ3D.current && !MTQ3D.building, null, { timeout: 180000 });
  await p.evaluate(() => {
    let tx = null; MTQ3D.scene.traverse((o) => { const m = o.material; if (!tx && m && !Array.isArray(m)) for (const k in m) if (m[k] && m[k].isTexture) { tx = m[k]; break; } });
    let TP = Object.getPrototypeOf(tx); while (TP && !Object.prototype.hasOwnProperty.call(TP, 'dispose')) TP = Object.getPrototypeOf(TP);
    window.__T = new Map(); const d0 = TP.dispose; TP.dispose = function () { window.__T.delete(this); return d0.apply(this, arguments); };
    Object.defineProperty(TP, 'onUpdate', { configurable: true, get() { const o = this.__ou; const h = window.__hook; return o ? function (t) { h(t); return o(t); } : h; }, set(v) { this.__ou = v; } });
    const nd = Object.getOwnPropertyDescriptor(TP, 'needsUpdate'); if (nd && nd.set) Object.defineProperty(TP, 'needsUpdate', { configurable: true, get: nd.get, set(v) { if (v && !this.__st) this.__st = (new Error().stack || '').split('\n').slice(2, 7).map((l) => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '')).join(' | '); return nd.set.call(this, v); } });
    window.__hook = function (t) { if (!window.__T.has(t)) window.__T.set(t, { phase: window.__phase, map: MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id }); };
  });
  for (let i = 0; i < 4; i++) { await p.evaluate((i) => { window.__phase = i; }, i); for (const [id, x, y] of SEQ) await enter(id, x, y); }
  const info = await p.evaluate(() => {
    const own = new Map(); const pathOf = (o) => { const n = []; let q = o; for (let i = 0; i < 5 && q; i++) { n.push(q.name || q.type); q = q.parent; } return n.join('<'); };
    const scan = (root, tag) => root && root.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach((m) => { for (const k in m) { const v = m[k]; if (v && v.isTexture && !own.has(v)) own.set(v, tag + ':' + pathOf(o) + '#' + k); } }); });
    scan(MTQ3D.scene, 'scene'); for (const [id, ms] of MTQ3D.cache) scan(ms.root, 'cache ' + id);
    const lastPhase = {}; for (const [, v] of window.__T) lastPhase[v.map] = Math.max(lastPhase[v.map] || 0, v.phase);
    const g = {}; for (const [t, v] of window.__T) { if (v.phase < 1 || v.phase >= lastPhase[v.map]) continue; const img = t.image; const k = (t.name || '') + '|' + (t.constructor && t.constructor.name) + '|' + (img ? (img.width + 'x' + img.height + ' ' + (img.constructor && img.constructor.name)) : 'noimg') + '|map ' + v.map + '|' + (own.get(t) || 'どこからも参照なし') + '|ud ' + JSON.stringify(t.userData).slice(0, 60) + '|st ' + (t.__st || ''); g[k] = (g[k] || 0) + 1; }
    return Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 30);
  });
  info.forEach(([k, n]) => console.log(n, k));
  await br.close();
})().catch((e) => { console.log(e.stack); process.exit(1); });
