// v7.8 地球の世界（3D）：太平洋の東西の継ぎ目を遠洋航海船で越える（画面の切り替えなし）・アストラ号で地球の上を飛び、浮天城アエリアに接舷（ヘッドレス・低画質）
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const SHOT = '/home/claude/work/p3d/shots/v78/';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready', 'kalion_open', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; d.hero.level = 45; World.start(); World.encounter = () => { }; Vehicle.drift = () => null; });
  await p.waitForTimeout(1200);
  // 世界の右端（経度 191°＝西経 169°の手前）の海に遠洋航海船を置く
  const st = await p.evaluate(() => { const W = World76; const S = W.size(); let t = null; for (let gy = 360; gy < 600 && !t; gy++) { const L1 = W.toLocal(S.w - 3, gy), L2 = W.toLocal(1, gy); if (!L1 || !L2) continue; const m1 = World.getMap(L1.map), m2 = World.getMap(L2.map); let okk = true; for (let gx = S.w - 3; gx < S.w + 3; gx++) { const L = W.toLocal(gx, gy); const m = World.getMap(L.map); if (!Vehicle.terrainOk('galleon', m, L.x, L.y)) okk = false; } if (okk) t = { L: L1, gy }; }
    const d = State.data; World.busy = false; d.aboard = 'galleon'; d.vehicles.galleon = { owned: true, map: t.L.map, x: t.L.x, y: t.L.y, port: { map: t.L.map, x: t.L.x, y: t.L.y } }; World.enterMap(t.L.map, t.L.x, t.L.y, 'right', { raw: true }); return { map: t.L.map, gy: t.gy, origin: W.origin(t.L.map) }; });
  await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map.id === m, st.map, { timeout: 240000 });
  await p.waitForTimeout(3000);
  const r = await p.evaluate(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const k = Engine.Input.keys; const from = World.map.id; k.right = true; const t0 = Date.now(); while (World.map.id === from && Date.now() - t0 < 120000) await sleep(100); await sleep(1500); k.right = false; await sleep(1500);
    const P = World.player, pos = MTQ3D.pos; return { from, map: World.map.id, cur: MTQ3D.current.map.id, x: P.x, origin: World76.origin(World.map.id), dist: +Math.hypot(pos.x - (P.x + 0.5), pos.z - (P.y + 0.5)).toFixed(2), veh: State.data.vehicles.galleon.map, crossings: World76.crossings }; });
  ok(r.map !== r.from && r.origin.x === 0 && r.cur === r.map && r.dist < 1.6 && r.veh === r.map, '遠洋航海船：世界の右端（' + r.from + '）→ 左端（' + r.map + '）へ、東西の継ぎ目を画面の切り替えなしで越えた（3D のずれ ' + r.dist + '）');
  await p.screenshot({ path: SHOT + 'pacific_seam.jpg', type: 'jpeg', quality: 72, timeout: 120000 });
  // アストラ号：地球の上を飛ぶ → 浮天城アエリアに接舷
  const a1 = await p.evaluate(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const d = State.data; d.aboard = null; d.flags.game_cleared = true; Astra.grant(); d.flags.astra_owned = true; World76.REGIONS.forEach((id) => d.visited[id] = true); d.visited.world_sky = true; d.visited.world_machine = true;
    World.enterMap('world', MAP_DEFS.world.locations[0].x, MAP_DEFS.world.locations[0].y + 2, 'down', { raw: true }); World.busy = false; await sleep(2500);
    const s = Astra.state(); Astra.takeOff(World.map, World.player.x, World.player.y); await sleep(2500); return { flying: s.flying, e78: s.e78, wx: Math.round(s.wx), wy: Math.round(s.wy), open: AstraView.isOpen() }; });
  ok(a1.flying && a1.e78 && a1.open, 'アストラ号：地球の座標で飛び立った ' + JSON.stringify(a1));
  await p.screenshot({ path: SHOT + 'astra_earth.jpg', type: 'jpeg', quality: 72, timeout: 120000 });
  const a2 = await p.evaluate(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const s = Astra.state(); const ap = Astra.aeriaPoint(); s.wx = ap.wx + 4; s.wy = ap.wy + 2; await sleep(1500); const lp = Astra.nearestLanding(s.wx, s.wy, 14); return { lp: lp && lp.id, name: lp && lp.name }; });
  await p.screenshot({ path: SHOT + 'astra_aeria.jpg', type: 'jpeg', quality: 72, timeout: 120000 });
  ok(a2.lp === 'aeria', 'アストラ号：太平洋の上空で浮天城アエリアの船着き場が着陸先になる ' + JSON.stringify(a2));
  await p.evaluate(() => { Engine.Input.press('ok'); });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === 'aeria_dock', null, { timeout: 240000 }).catch(() => { });
  await p.waitForTimeout(3000);
  const a3 = await p.evaluate(() => ({ map: World.map.id, cur: MTQ3D.current && MTQ3D.current.map.id, docked: State.data.flags.aer_docked, open: AstraView.isOpen() }));
  ok(a3.map === 'aeria_dock' && a3.cur === 'aeria_dock' && a3.docked && !a3.open, 'アストラ号：決定で船着き場に接舷し、3D で浮天城アエリアに入った ' + JSON.stringify(a3));
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
