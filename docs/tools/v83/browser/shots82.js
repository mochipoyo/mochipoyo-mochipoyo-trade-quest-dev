// v8.2 町・屋内の画像（いつものカメラ）：IDS（地図 ID のリスト。省略で inventory の全部）・VP（1920x1080 など）・TAG・SHOT・Q（low|high）
//   町：フィールドから入った所（なければ remake81.arrive）。屋内：出口のワープのとなりの歩けるマス（入口の内側）に立つ
const { chromium } = require('playwright'); const fs = require('fs'); const PORT = process.env.PORT || 8790;
const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v82/'; fs.mkdirSync(SHOT, { recursive: true });
const TAG = process.env.TAG || 'x'; const VP = (process.env.VP || '1920x1080').split('x').map(Number); const Q = process.env.Q || 'low';
const IDS = (process.env.IDS || '').split(',').filter(Boolean); const CINE = {}; (process.env.CINE || '').split(',').filter(Boolean).forEach((a) => { const q = a.split(':').map((v, i) => i ? +v : v); CINE[q[0]] = { x: q[1], z: q[2], y: 0, dist: q[3], pitch: q[4] }; });
const ATS = {};   // CINE=id:x:z:dist:pitch（見せ場のカメラ）
 (process.env.AT || '').split(',').filter(Boolean).forEach((a) => { const q = a.split(':'); ATS[q[0]] = { mode: 'raw', x: +q[1], y: +q[2], dir: q[3] || 'up' }; });   // AT=id:x:y[:dir]（立つ所を決める）
(async () => { const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: VP[0], height: VP[1] } }); await ctx.addInitScript((q) => { try { localStorage.setItem('mtq3d-quality', q); } catch (e) { } }, Q);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await p.goto(`http://localhost:${PORT}/3d/index.html` + (process.env.QS ? "?" + process.env.QS : "")); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 0; d.timeOfDay = 0.45; World.start(); World.encounter = () => { }; if (window.Remake81) Object.keys(Remake81.views || {}).forEach((k) => { d.flags[Remake81.views[k].flag] = true; }); });
  await p.waitForTimeout(600); const res = [];
  for (const id of IDS) {
    const at = ATS[id] || await p.evaluate((id) => { const D = MAP_DEFS; const d = D[id]; if (!d) return null; const m = World.getMap(id); const S = State.data;
      if (d.kind === 'town') { for (const k of Object.keys(D)) { const f = D[k]; if (!(f.region || f.kind === 'field')) continue; const w = (f.warps || []).find((q) => q.to === id); if (w) return { mode: 'warp', x: w.tx, y: w.ty }; } const a = (d.remake81 && d.remake81.arrive) || [m.w >> 1, m.h - 3]; return { mode: 'raw', x: a[0], y: a[1] }; }
      const ex = (m.warps || []).filter((q) => !(D[q.to] && D[q.to].kind === 'dungeon')); const cands = ex.length ? ex : (m.warps || []);
      for (const q of cands) for (const [dx, dy, dir] of [[0, -1, 'up'], [1, 0, 'right'], [-1, 0, 'left'], [0, 1, 'down']]) { const x = q.x + dx, y = q.y + dy; if (m.passable(x, y, S) && !m.warpAt(x, y)) return { mode: 'raw', x, y, dir }; }
      return { mode: 'raw', x: m.w >> 1, y: m.h >> 1 }; }, id);
    if (!at) { res.push({ id, err: 'no def' }); continue; }
    try {
      await p.evaluate(([id, at]) => { World.busy = false; MTQ3D.camera.debug = null; if (MTQ3D.camera.setCine) MTQ3D.camera.setCine(null); World.enterMap(id, at.x, at.y, at.dir || 'up', at.mode === 'raw' ? { raw: true } : undefined); }, [id, at]);
      await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && !MTQ3D.building, id, { timeout: 180000 }); await p.waitForTimeout(900); await p.waitForFunction(() => !MTQ3D.expo82 || MTQ3D.expo82.done, null, { timeout: 30000 }).catch(() => { }); await p.waitForTimeout(200); if (CINE[id]) { await p.evaluate((c) => MTQ3D.camera.setCine(c), CINE[id]); await p.waitForTimeout(6000); }
      const f = SHOT + TAG + '_' + id + '.jpg'; await p.screenshot({ path: f, type: 'jpeg', quality: 72, timeout: 180000 });
      const info = await p.evaluate(() => { const r = MTQ3D.renderer && MTQ3D.renderer.renderer; const i = r ? r.info.render : {}; const e = window.MTQ3D_ENV ? MTQ3D_ENV.info() : null; const id = World.map.id; return { expo: MTQ3D.expo82 ? { mul: +MTQ3D.expo82.mul.toFixed(2), log: MTQ3D.expo82.log } : null, tris: i.triangles, calls: i.calls, recipe: e && e.built[id] ? e.built[id].recipe : null, err: e && e.errors[id] ? String(e.errors[id]).slice(0, 80) : null, pos: [World.player.x, World.player.y] }; });
      res.push(Object.assign({ id, file: f }, info)); console.log(id, JSON.stringify(info));
    } catch (e) { res.push({ id, err: String(e.message).slice(0, 120) }); console.log(id, 'ERR', String(e.message).slice(0, 120)); }
  }
  fs.writeFileSync(SHOT + TAG + '_result.json', JSON.stringify({ errs, res }, null, 1)); console.log('pageerrors', errs.length); await br.close(); })().catch((e) => { console.log(e.stack); process.exit(1); });
