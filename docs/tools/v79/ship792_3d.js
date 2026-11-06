// v7.9.2 港町マリナの船（3D・ヘッドレス）：船が町の建物に隠れずに見える・歩いて行って乗れる・入口のそばで降りると沖へ停め直す・前のセーブの船
// 使い方：/home/claude/work/p3d で bash withenv.sh node <このファイル>（PORT で配信中の 3d/index.html を開く）
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v79/';
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = () => { }; });
  await p.waitForTimeout(1500);
  const info = () => p.evaluate(() => { const m = World.map; const cheb = (x, y) => Math.min(...(m.def.locations || []).map((l) => Math.max(Math.abs(l.x - x), Math.abs(l.y - y)))); return { map: m.id, pos: [World.player.x, World.player.y], aboard: State.data.aboard, onMap: Vehicle.onMap(m.id).map((v) => Object.assign(v, { icon: cheb(v.x, v.y) })), objs: MTQ3D.vehicleInfo ? MTQ3D.vehicleInfo() : null, moor: Harbors.HARBORS.marina.moor, land: Harbors.HARBORS.marina.land }; });
  const ready = async () => { await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === World.map.id && !MTQ3D.building, null, { timeout: 240000 }); await p.waitForTimeout(2500); };
  // A：町の出口に立つ（船が見えるか）
  await p.evaluate(() => { World.busy = false; const l = MAP_DEFS.world.locations.find((q) => q.id === 'harbor'); const wp = MAP_DEFS[l.to].warps.find((w) => w.to === 'world'); const ex = MapRemake.pos('world', wp.tx, wp.ty); World.enterMap('world', ex.x, ex.y, 'up', { raw: true }); });
  await ready(); const a = await info(); console.log('A', JSON.stringify(a)); await p.screenshot({ path: SHOT + 'ship792_marina_exit.jpg', type: 'jpeg', quality: 80 });
  ok(a.onMap.length === 2 && a.onMap.every((v) => v.icon >= 3) && (a.objs || []).filter((o) => o.visible).length >= 2, '3D：港町マリナの船 2 そうは町の印から 3 マス以上で、模型が出ている ' + JSON.stringify(a.onMap));
  // 船が画面の中に映っているか（カメラの視野に入るか）
  const onScreen = await p.evaluate(() => { const app = MTQ3D; const cam = app.camera || (app.r && app.r.camera); const out = []; (app.current.vehicles ? [...app.current.vehicles.values()] : []).forEach(() => { }); try { const V = Vehicle.onMap(World.map.id); const THREE = app.THREE; V.forEach((v) => { if (!cam || !THREE) return; const q = new THREE.Vector3(v.x + 0.5, 0, v.y + 0.5).project(cam); out.push({ id: v.id, sx: q.x, sy: q.y, in: Math.abs(q.x) < 1 && Math.abs(q.y) < 1 }); }); } catch (e) { out.push(String(e)); } return out; });
  console.log('onScreen', JSON.stringify(onScreen));
  // B：歩いて船のとなりへ → 船の方へ押すと乗る（3D の自由移動・ぶつかったら 2D 版の tryMove）
  const walk = await p.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const m = World.map, d = State.data; const s = d.vehicles.sailboat;
    const V4 = [[1, 0], [-1, 0], [0, 1], [0, -1]]; const pass = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.passable(x, y, d) && !m.warpAt(x, y) && !Tiles.isWater(m.tiles[y][x]);
    const st = [World.player.x, World.player.y]; const prev = new Map([[st.join(','), null]]); const q = [st]; let goal = null;
    for (let h = 0; h < q.length && !goal; h++) { const [x, y] = q[h]; if (Math.abs(x - s.x) + Math.abs(y - s.y) === 1) { goal = [x, y]; break; } for (const [dx, dy] of V4) { const k = (x + dx) + ',' + (y + dy); if (prev.has(k) || !pass(x + dx, y + dy)) continue; prev.set(k, x + ',' + y); q.push([x + dx, y + dy]); } }
    if (!goal) return { err: 'no path' }; const path = []; let k = goal.join(','); while (k) { path.unshift(k.split(',').map(Number)); k = prev.get(k); }
    const key = { right: 'ArrowRight', left: 'ArrowLeft', down: 'ArrowDown', up: 'ArrowUp' };
    const I = Engine.Input; const press = (dir, on) => { I.keys[dir] = on; };
    for (let i = 1; i < path.length; i++) { const [tx, ty] = path[i]; const dir = tx > World.player.x ? 'right' : tx < World.player.x ? 'left' : ty > World.player.y ? 'down' : 'up'; press(dir, true); for (let t = 0; t < 120 && (World.player.x !== tx || World.player.y !== ty); t++) await sleep(16); press(dir, false); }
    // 船の方へ押し続ける
    const dir = s.x > World.player.x ? 'right' : s.x < World.player.x ? 'left' : s.y > World.player.y ? 'down' : 'up'; press(dir, true); for (let t = 0; t < 200 && !d.aboard; t++) await sleep(16); press(dir, false); await sleep(400);
    return { path: path.length, at: [World.player.x, World.player.y], aboard: d.aboard, ship: [s.x, s.y] };
  });
  console.log('B', JSON.stringify(walk)); await p.screenshot({ path: SHOT + 'ship792_board.jpg', type: 'jpeg', quality: 80 });
  ok(walk.aboard === 'sailboat', '3D：町の出口から歩いて船のとなりへ行き、船の方へ進むと乗れる ' + JSON.stringify(walk));
  // C：船で入口のそば（印から 2 マス以内）の海へ行って降りる → 沖へ停め直す
  const c = await p.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const m = World.map, d = State.data; const id = d.aboard; if (!id) return { err: 'not aboard' };
    const l = m.def.locations.find((q) => q.id === 'harbor'); const cheb = (x, y) => Math.min(...(m.def.locations || []).map((L) => Math.max(Math.abs(L.x - x), Math.abs(L.y - y))));
    const V4 = [[1, 0], [-1, 0], [0, 1], [0, -1]]; const land = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && !Tiles.isWater(m.tiles[y][x]) && m.passable(x, y, d);
    const sea = (x, y) => Vehicle.terrainOk(id, m, x, y); const st = [World.player.x, World.player.y]; const prev = new Map([[st.join(','), null]]); const q = [st]; let goal = null;
    for (let h = 0; h < q.length && !goal; h++) { const [x, y] = q[h]; if (h && cheb(x, y) <= 2 && V4.some(([dx, dy]) => land(x + dx, y + dy))) { goal = [x, y]; break; } for (const [dx, dy] of V4) { const k = (x + dx) + ',' + (y + dy); if (prev.has(k) || !sea(x + dx, y + dy)) continue; prev.set(k, x + ',' + y); q.push([x + dx, y + dy]); } }
    if (!goal) return { err: 'no sea path' }; const path = []; let k = goal.join(','); while (k) { path.unshift(k.split(',').map(Number)); k = prev.get(k); }
    const step = async (dir) => { World.busy = false; World.player.dir = dir; if (!World.tryMove(dir)) return false; for (let t = 0; t < 120 && World.player.moving; t++) await sleep(16); await sleep(30); return true; };
    for (let i = 1; i < path.length; i++) { const [tx, ty] = path[i]; await step(tx > World.player.x ? 'right' : tx < World.player.x ? 'left' : ty > World.player.y ? 'down' : 'up'); }
    const at = [World.player.x, World.player.y]; const L = V4.map(([dx, dy]) => [at[0] + dx, at[1] + dy]).find(([x, y]) => land(x, y) && !m.warpAt(x, y)); let toast = '';
    const t0 = Win.toast; Win.toast = (t, ms) => { toast = t; t0(t, ms); }; await step(L[0] > at[0] ? 'right' : L[0] < at[0] ? 'left' : L[1] > at[1] ? 'down' : 'up'); Win.toast = t0;
    const s = d.vehicles[id]; return { at, atIcon: cheb(at[0], at[1]), landed: [World.player.x, World.player.y], aboard: d.aboard, ship: [s.x, s.y], shipIcon: cheb(s.x, s.y), toast };
  });
  console.log('C', JSON.stringify(c)); await p.waitForTimeout(1200); await p.screenshot({ path: SHOT + 'ship792_redock.jpg', type: 'jpeg', quality: 80 });
  ok(!c.aboard && c.atIcon <= 2 && c.shipIcon >= 3 && /沖に停めた/.test(c.toast), '3D：入口のそば（印から ' + c.atIcon + ' マス）で降りた船は沖（' + c.shipIcon + ' マス）へ停め直し、表示に出る ' + JSON.stringify(c));
  const vis = await info(); ok((vis.objs || []).some((o) => o.key === 'sailboat' && o.visible && Math.abs(o.x - (c.ship[0] + 0.5)) < 0.01 && Math.abs(o.z - (c.ship[1] + 0.5)) < 0.01), '3D：停め直した船の模型がその場所に出る ' + JSON.stringify((vis.objs || []).find((o) => o.key === 'sailboat')));
  // D：前のセーブ：入口のすぐそばに止めてある船 → 地図に入ると沖へ
  const dd = await p.evaluate(() => { const m = World.map, d = State.data; const l = m.def.locations.find((q) => q.id === 'harbor'); let adj = null; for (let r = 1; r <= 2 && !adj; r++) for (let dy = -r; dy <= r && !adj; dy++) for (let dx = -r; dx <= r && !adj; dx++) if (Vehicle.terrainOk('galleon', m, l.x + dx, l.y + dy)) adj = [l.x + dx, l.y + dy];
    const s = d.vehicles.galleon; s.map = 'world'; s.x = adj[0]; s.y = adj[1]; s.port = { map: 'world', x: adj[0], y: adj[1] }; World.enterMap(l.to, 5, 5, 'down', { raw: true }); return adj; });
  await p.waitForTimeout(1500); await p.evaluate(() => { const l = MAP_DEFS.world.locations.find((q) => q.id === 'harbor'); const wp = MAP_DEFS[l.to].warps.find((w) => w.to === 'world'); const ex = MapRemake.pos('world', wp.tx, wp.ty); World.enterMap('world', ex.x, ex.y, 'up', { raw: true }); });
  await ready(); const e = await info(); console.log('D', JSON.stringify(e)); await p.screenshot({ path: SHOT + 'ship792_oldsave.jpg', type: 'jpeg', quality: 80 });
  const g = e.onMap.find((v) => v.id === 'galleon'); ok(g && g.icon >= 3, '3D：前のセーブで入口のそば（' + dd.join(',') + '）にあった遠洋航海船 → 地図に入ると沖へ（' + (g && [g.x, g.y].join(',')) + '）');
  ok(!errs.length, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); await br.close(); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
