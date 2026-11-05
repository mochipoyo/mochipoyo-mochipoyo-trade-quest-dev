// v7.6 つないだ世界（3D）：境目を画面を切り替えずに越えるか・となりの地域が並ぶか・霧の壁・世界地図とミニマップ（PORT・SHOT）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v76/join76/'; fs.mkdirSync(SHOT, { recursive: true });
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'high'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  ok(await p.evaluate(() => !!(window.World76 && World76.on())), 'つないだ世界が有効（3D 版）');
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready'].forEach((f) => d.flags[f] = true); d.hero.level = 30; World.start(); });
  await p.waitForTimeout(1500);
  const place = (map, x, y, veh) => p.evaluate(([map, x, y, veh]) => { const d = State.data; document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; d.aboard = veh || null; if (veh) d.vehicles[veh] = { owned: true, map, x, y, port: { map, x, y } }; World.enterMap(map, x, y, 'right', { raw: true }); }, [map, x, y, veh]);
  const waitCur = (id) => p.waitForFunction((id) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === id && World.map.id === id, id, { timeout: 120000 }).then(() => true).catch(() => false);
  const water = (map, x0, y0, veh) => p.evaluate(([map, x0, y0, veh]) => { const m = World.getMap(map); for (let r = 0; r < 40; r++) for (let dy = -r; dy <= r; dy++) { const y = y0 + dy, x = x0; if (y >= 0 && y < m.h && Vehicle.terrainOk(veh, m, x, y)) return { x, y }; } return null; }, [map, x0, y0, veh]);
  // 1) 帆船でアルカディアの東の端へ
  let w = await water('world', 150, 40, 'sailboat'); await place('world', w.x, w.y, 'sailboat'); ok(await waitCur('world'), 'アルカディア（海の上・帆船）');
  await p.evaluate(() => { MTQ3D.lighting.preview = 0.4; MTQ3D.camera.wantDist = 30; });
  const shown = await p.waitForFunction(() => MTQ3D.join && MTQ3D.join.shown.has('world_grania'), null, { timeout: 400000 }).then(() => true).catch(() => false);
  ok(shown, '東の端に近づくと、となりのグラニアを先に組み立てて並べる');
  await p.waitForTimeout(2500); await p.screenshot({ path: SHOT + '1_near_edge.jpg', type: 'jpeg', quality: 80, timeout: 120000 });
  // 端まで進む（1 マスずつ）
  const r = await p.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const log = []; let crossed = null; let prevCam = null; let maxJump = 0;
    for (let i = 0; i < 40 && !crossed; i++) {
      while (World.player.moving) await sleep(16);
      const before = World.map.id; const cam0 = MTQ3D.camera.camera.position.clone(); const o0 = World76.origin(before);
      World.tryMove('right'); const t0 = performance.now();
      for (let k = 0; k < 40; k++) { await sleep(16); const o = World76.origin(MTQ3D.current.map.id); const c = MTQ3D.camera.camera.position; const g = { x: c.x + o.x, z: c.z + o.y }; if (prevCam) maxJump = Math.max(maxJump, Math.hypot(g.x - prevCam.x, g.z - prevCam.z)); prevCam = g; if (!World.player.moving) break; }
      if (World.map.id !== before) crossed = { from: before, to: World.map.id, cur: MTQ3D.current.map.id, x: World.player.x, y: World.player.y, ms: Math.round(performance.now() - t0), aboard: State.data.aboard, veh: State.data.vehicles.sailboat.map, pos: State.data.pos.map };
    }
    return { crossed, maxJump };
  });
  ok(r.crossed && r.crossed.to === 'world_grania' && r.crossed.cur === 'world_grania' && r.crossed.veh === 'world_grania' && r.crossed.pos === 'world_grania', '帆船で境目を越えた（2D・3D ともグラニア、乗り物ごと）' + JSON.stringify(r.crossed));
  ok(r.maxJump < 1.5, 'カメラが飛ばない（1 フレームの動き 最大 ' + r.maxJump.toFixed(2) + '）');
  const sh2 = await p.evaluate(() => [...MTQ3D.join.shown.keys()]); ok(sh2.includes('world'), '越えたあと、来た地域（アルカディア）が西に並んでいる ' + sh2.join(','));
  await p.waitForTimeout(1500); await p.screenshot({ path: SHOT + '2_after_cross.jpg', type: 'jpeg', quality: 80, timeout: 120000 });
  // 2) まだ行けない地域の霧の壁（アルカディアの南＝断裂群島）
  w = await water('world', 120, 112, 'sailboat'); await place('world', w.x, w.y, 'sailboat'); await waitCur('world'); await p.evaluate(() => { MTQ3D.lighting.preview = 0.4; MTQ3D.camera.wantDist = 30; });
  await p.waitForTimeout(3000); const walls = await p.evaluate(() => [...MTQ3D.join.walls.keys()]); ok(walls.includes('L:world_islands:n'), 'まだ行けない断裂群島のまわりに霧の壁 ' + walls.join(','));
  const blocked = await p.evaluate(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); for (let i = 0; i < 20; i++) { while (World.player.moving) await sleep(16); if (!World.tryMove('down')) break; await sleep(200); } return World.map.id; });
  ok(blocked === 'world', '遠洋航海船の前は、南の境目で止まる');
  await p.waitForTimeout(800); await p.screenshot({ path: SHOT + '3_locked_wall.jpg', type: 'jpeg', quality: 80, timeout: 120000 });
  // 3) 徒歩：陸の橋（時の神殿領 → 魔導王国）
  await p.evaluate(() => { const d = State.data; ['galleon_ready', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived'].forEach((f) => d.flags[f] = true); });
  const bat = await p.evaluate(() => World76.BRIDGES[0].at); const by = bat.y; await place('world_tempus', bat.xa, by, null); await waitCur('world_tempus'); await p.evaluate(() => { MTQ3D.lighting.preview = 0.4; MTQ3D.camera.wantDist = 26; });
  await p.waitForFunction(() => MTQ3D.join.shown.has('world_magicka'), null, { timeout: 400000 }).catch(() => { });
  const walk = await p.evaluate(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const k = Engine.Input.keys; k.right = true; let t = 0; while (World.map.id === 'world_tempus' && t < 25000) { await sleep(50); t += 50; } await sleep(1500); k.right = false; return { map: World.map.id, cur: MTQ3D.current.map.id, x: World.player.x, y: World.player.y, t }; });
  ok(walk.map === 'world_magicka' && walk.cur === 'world_magicka', '徒歩で陸の橋を渡って魔導王国へ（画面の切り替えなし）' + JSON.stringify(walk));
  await p.screenshot({ path: SHOT + '4_bridge_walk.jpg', type: 'jpeg', quality: 80, timeout: 120000 });
  // 4) 世界地図（地域の地図＝つながった世界）とミニマップ
  await p.evaluate(() => { Minimap.openBig(); Minimap.setMode('world'); }); await p.waitForTimeout(1500); await p.screenshot({ path: SHOT + '5_worldmap.jpg', type: 'jpeg', quality: 80, timeout: 120000 });
  const title = await p.evaluate(() => document.getElementById('bm-title').textContent); ok(/つながった世界/.test(title), '地域の地図＝つながった世界 「' + title + '」');
  await p.evaluate(() => { Minimap.setMode('globe'); }); await p.waitForTimeout(1500); await p.screenshot({ path: SHOT + '6_globe.jpg', type: 'jpeg', quality: 80, timeout: 120000 });
  await p.evaluate(() => { Minimap.close(); }); await p.waitForTimeout(500);
  w = await water('world', 157, 40, 'sailboat'); await place('world', w.x, w.y, 'sailboat'); await waitCur('world'); await p.waitForTimeout(2500);
  await p.screenshot({ path: SHOT + '7_minimap_edge.jpg', type: 'jpeg', quality: 80, timeout: 120000 });
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log('stats', JSON.stringify(await p.evaluate(() => ({ crossings: World76.crossings, j: MTQ3D.join.crossings, builds: Object.keys(MTQ3D.stats).filter((k) => /^build_world/.test(k)).map((k) => k + '=' + MTQ3D.stats[k]) }))));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})();
