// GPU 資源の漏れの調査：地図の場面を捨てたとき（MapScene3D.dispose）に、捨てられなかった形・画像を、持ち主の名前ごとに数える
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8791;
const SEQ = (process.env.SEQ || 'tradia_exchange:12:9,tradia_inn:7:9,magicka_inn:7:9,rivel_castle_approach:32:40,vol_main_hall:14:15,ruins_post:8:9').split(',').map((a) => { const q = a.split(':'); return [q[0], +q[1], +q[2]]; });
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 960, height: 540 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('t', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = () => { }; });
  await p.waitForFunction(() => MTQ3D.current && !MTQ3D.building, null, { timeout: 180000 }); await p.waitForTimeout(500);
  await p.evaluate(() => {
    // しるし：dispose が呼ばれた形・材質・画像
    const anyMesh = (() => { let m = null; MTQ3D.scene.traverse((o) => { if (!m && o.isMesh && o.geometry) m = o; }); return m; })();
    let GP = Object.getPrototypeOf(anyMesh.geometry); while (GP && !Object.prototype.hasOwnProperty.call(GP, 'dispose')) GP = Object.getPrototypeOf(GP);
    const g0 = GP.dispose; GP.dispose = function () { this.__disp = 1; return g0.apply(this, arguments); };
    let MP = Object.getPrototypeOf(Array.isArray(anyMesh.material) ? anyMesh.material[0] : anyMesh.material); while (MP && !Object.prototype.hasOwnProperty.call(MP, 'dispose')) MP = Object.getPrototypeOf(MP);
    const m0 = MP.dispose; MP.dispose = function () { this.__disp = 1; return m0.apply(this, arguments); };
    window.__TP = null;
    // 場面を捨てるとき：その場面の物を全部記録
    const MSP = Object.getPrototypeOf(MTQ3D.current); const d0 = MSP.dispose; window.__leak = [];
    MSP.dispose = function () {
      const geos = new Map(), texs = new Map(); const pathOf = (o) => { const n = []; let q = o; for (let i = 0; i < 4 && q; i++) { n.push(q.name || q.type); q = q.parent; } return n.join('<'); };
      this.root.traverse((o) => { if (o.geometry) geos.set(o.geometry, pathOf(o)); const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach((m) => { for (const k in m) { const v = m[k]; if (v && v.isTexture) texs.set(v, pathOf(o) + '#' + k); } }); });
      const r = d0.apply(this, arguments); const id = this.map && this.map.id;
      window.__seenG = window.__seenG || new Set(); window.__seenT = window.__seenT || new Set();
      setTimeout(() => { const lg = {}, lt = {}; geos.forEach((path, g) => { if (!g.__disp && !window.__seenG.has(g)) lg[path] = (lg[path] || 0) + 1; window.__seenG.add(g); }); texs.forEach((path, t) => { if (!t.__disp && !window.__seenT.has(t)) { lt[path] = (lt[path] || 0) + 1; } window.__seenT.add(t); }); window.__leak.push({ id, geos: geos.size, undisposedGeo: Object.values(lg).reduce((a, b) => a + b, 0), undisposedTex: Object.values(lt).reduce((a, b) => a + b, 0), lg, lt }); }, 0);
      return r;
    };
    const TPfind = () => { let t = null; MTQ3D.scene.traverse((o) => { const m = o.material; if (!t && m && !Array.isArray(m)) for (const k in m) if (m[k] && m[k].isTexture) { t = m[k]; break; } }); return t; };
    const tx = TPfind(); if (tx) { let TP = Object.getPrototypeOf(tx); while (TP && !Object.prototype.hasOwnProperty.call(TP, 'dispose')) TP = Object.getPrototypeOf(TP); const t0 = TP.dispose; TP.dispose = function () { this.__disp = 1; return t0.apply(this, arguments); }; }
  });
  const enter = async (id, x, y) => { await p.evaluate(([id, x, y]) => { World.busy = false; World.enterMap(id, x, y, 'down', { raw: true }); }, [id, x, y]); await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && !MTQ3D.building, id, { timeout: 180000 }); await p.waitForTimeout(400); };
  const mem = () => p.evaluate(() => { const r = MTQ3D.renderer.renderer; return { geo: r.info.memory.geometries, tex: r.info.memory.textures }; });
  const N = +(process.env.N || 3);
  for (let i = 0; i < N; i++) for (const [id, x, y] of SEQ) { await enter(id, x, y); }
  const m1 = await mem();
  const leak0 = await p.evaluate(() => window.__leak); const leak = leak0.slice(Math.ceil(leak0.length / N));
  const sum = { lg: {}, lt: {} }; leak.forEach((L) => { for (const k in L.lg) sum.lg[k] = (sum.lg[k] || 0) + L.lg[k]; for (const k in L.lt) sum.lt[k] = (sum.lt[k] || 0) + L.lt[k]; });
  console.log('mem', JSON.stringify(m1), 'disposed scenes', leak.length, leak.map((L) => L.id + ':g' + L.undisposedGeo + '/t' + L.undisposedTex).join(' '));
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 25);
  console.log('--- 捨てられなかった形（持ち主）'); top(sum.lg).forEach(([k, v]) => console.log(v, k));
  console.log('--- 捨てられなかった画像'); top(sum.lt).forEach(([k, v]) => console.log(v, k));
  console.log('errs', errs);
  await br.close();
})().catch((e) => { console.log(e.stack); process.exit(1); });
