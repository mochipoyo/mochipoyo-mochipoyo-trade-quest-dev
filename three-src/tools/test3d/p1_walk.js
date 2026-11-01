// Phase 1：汎用3Dのマップで歩く（自由移動）・出入り・外周からの退出・乗り物・歩数（エンカウントの元）・当たり判定
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 900, height: 600 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && (window.MTQ3D.ready || window.MTQ3D.disabled), null, { timeout: 180000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; State.data.flags.prologue_done = true; World.start(); MTQ3D.paused = true; State.data.counters = State.data.counters || {}; State.data.counters.repel_steps = 9999; });
  const R = []; const ok = (c, m, extra) => { R.push({ ok: !!c, m, extra }); console.log((c ? 'OK ' : 'NG ') + m + (extra ? ' ' + JSON.stringify(extra) : '')); };
  const enter = async (id, x, y, dir) => { await p.evaluate(([id, x, y, dir]) => { World.enterMap(id, x, y, dir || 'down'); }, [id, x, y, dir]); await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map === World.map, null, { timeout: 240000 }); await p.waitForTimeout(600); };
  const hold = async (dir, ms) => { await p.evaluate((d) => { Engine.Input.keys[d] = true; }, dir); await p.waitForTimeout(ms); await p.evaluate((d) => { Engine.Input.keys[d] = false; }, dir); await p.waitForTimeout(400); };
  const st = () => p.evaluate(() => ({ map: World.map.id, x: World.player.x, y: World.player.y, steps: State.data.steps, aboard: State.data.aboard, mode3D: MTQ3D.mode3D(), top: Engine.top() === World.scene, busy: World.busy, pos: [+MTQ3D.pos.x.toFixed(2), +MTQ3D.pos.z.toFixed(2)] }));
  const closeMsgs = async () => { for (let i = 0; i < 12; i++) { const top = await p.evaluate(() => Engine.top() === World.scene && !World.busy); if (top) return; await p.evaluate(() => Engine.Input.press('ok')); await p.waitForTimeout(300); } };

  // 1) 歩く・歩数・当たり判定（リヴェル城：入口から上へ歩き続けても壁を抜けない）
  const ce = await p.evaluate(() => { for (const k in MAP_DEFS) for (const w of (MAP_DEFS[k].warps || [])) if (w.to === 'rivel_castle' && k !== 'rivel_castle') return { x: w.tx, y: w.ty }; return null; });
  await enter('rivel_castle', ce.x, ce.y, 'up'); const s0 = await st(); await hold('up', 2500); const s1 = await st();
  const solidAt = await p.evaluate(() => { const m = World.map, p = World.player; return Tiles.isSolid(m.tiles[p.y][p.x]); });
  ok(s1.steps > s0.steps && (s1.y < s0.y), '自由移動で歩き、マスをまたぐたびに歩数が増える（2D版の World.onStep）', { s0, s1 });
  ok(!solidAt, '壁・柱のマスに入らない（当たり判定は2D版のタイルのまま）');
  await hold('right', 1500); await hold('up', 2500); const s2 = await st(); ok(s2.map === 'rivel_castle' && s2.mode3D, 'リヴェル城の中を3Dのまま歩ける', s2);
  // 2) 建物の入口（リヴェル城下町 → 建物の中）
  const door = await p.evaluate(() => { const m = World.getMap('rivel_town'); for (const w of m.warps) { if (w.y < 2 || w.x < 2 || w.y > m.h - 3 || w.x > m.w - 3) continue; if (m.passable(w.x, w.y + 1, State.data) && !m.warpAt(w.x, w.y + 1)) return { x: w.x, y: w.y, to: w.to }; } return null; });
  await enter('rivel_town', door.x, door.y + 1, 'up'); await hold('up', 1500); await closeMsgs(); const s3 = await st();
  ok(s3.map === door.to, '町の建物の入口へ歩くと、2D版と同じワープで中へ入る（' + door.to + '）', s3);
  // 3) 外周からの退出（港町マリナの西の外周）
  const edge = await p.evaluate(() => { const m = World.getMap('harbor_town'); for (let y = 2; y < 27; y++) if (m.passable(0, y, State.data) && m.passable(1, y, State.data) && !m.warpAt(0, y)) return { y }; return null; });
  await enter('harbor_town', 1, edge.y, 'left'); await hold('left', 2500); await closeMsgs(); const s4 = await st();
  ok(s4.map !== 'harbor_town', '開いている外周から外へ歩くと、2D版の EdgeExit で外のフィールドへ出る', s4);
  // 4) 乗り物（遠洋航海船）：隣の陸から船へ進む → 乗る → 海を進む → 3Dの船が表示される
  const ship = await p.evaluate(() => { State.data.flags.galleon_ready = true; if (Vehicle.unlockIfReady) Vehicle.unlockIfReady(); const s = State.data.vehicles && State.data.vehicles.galleon; if (!s) return null; const m = World.getMap(s.map); for (const [dx, dy, dir] of [[1, 0, 'left'], [-1, 0, 'right'], [0, 1, 'up'], [0, -1, 'down']]) { const x = s.x + dx, y = s.y + dy; if (m.passable(x, y, State.data) && !Tiles.isWater(m.tiles[y][x])) return { map: s.map, x, y, dir, sx: s.x, sy: s.y, owned: s.owned }; } return { map: s.map, sx: s.x, sy: s.y, none: true }; });
  if (ship && !ship.none) {
    await enter(ship.map, ship.x, ship.y, ship.dir); await hold(ship.dir, 450); await closeMsgs(); const s5 = await st();
    ok(s5.aboard === 'galleon', '船の隣から船の方へ進むと乗る（2D版の World.tryMove・Vehicle と同じ）', { ship, s5 });
    const before = await st(); await hold('down', 380); await closeMsgs(); const s6 = await st();
    await p.evaluate(() => { MTQ3D.paused = false; }); await p.waitForTimeout(800); const vi = await p.evaluate(() => MTQ3D.vehicleInfo()); await p.evaluate(() => { MTQ3D.paused = true; });
    const pos3 = await p.evaluate(() => [+MTQ3D.pos.x.toFixed(2), +MTQ3D.pos.z.toFixed(2), World.player.x + 0.5, World.player.y + 0.5]);
    ok(Math.abs(pos3[0] - pos3[2]) < 0.6 && Math.abs(pos3[1] - pos3[3]) < 0.6, '乗船中の3Dの位置が2D版のマスの位置と一致する', pos3);
    ok(s6.aboard === 'galleon' && (s6.x !== before.x || s6.y !== before.y), '乗ったまま海を進める（マス単位の移動・gridMode）', { before, s6 });
    ok(vi.some((v) => v.key === 'galleon' && v.visible), '乗っている船を3Dで表示する（仮モデル veh_galleon）', vi);
  } else ok(false, '乗り物のテストの準備（船の位置）', ship);
  fs.writeFileSync('/home/claude/work/p3d/p1_walk.json', JSON.stringify({ R, errors: errs }, null, 1));
  console.log('結果: ' + R.filter((r) => r.ok).length + ' OK / ' + R.filter((r) => !r.ok).length + ' NG', 'errors', errs.length, errs.slice(0, 5)); await br.close();
})();
