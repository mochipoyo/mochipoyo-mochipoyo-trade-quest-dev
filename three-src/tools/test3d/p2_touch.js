// v6.6 「触れたら入る」：3D版のフィールドで、町・城・洞窟の建物に向かって歩き、どこで入るかを測る（ソフトウェア描画）
const { chromium } = require('playwright'); const fs = require('fs');
const SHOT = '/home/claude/work/p3d/shots/'; const out = [];
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 1000, height: 640 } })).newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; World.start(); World.encounter = function () { };   // 歩く途中の戦闘（ランダム）で止まらないように
  });
  // [名前, フィールド, 開始x, 開始y, 押すキー, 期待：入る先 or 'locked' or null]
  const CASES = [
    ['poyo_south', 'world', 28, 63, 'up', 'poyo_village'], ['poyo_west', 'world', 23, 58, 'right', 'poyo_village'], ['poyo_north', 'world', 28, 53, 'down', 'poyo_village'],
    ['rivel_south', 'world', 40, 53, 'up', 'rivel_town'], ['cave_south', 'world', 42, 83, 'up', 'oblivion_cave_1'],
    ['lab_locked', 'world_kalion', 92, 57, 'up', 'locked'], ['harbor_north', 'world', 22, 67, 'down', 'harbor_town']
  ];
  for (const [name, fid, x, y, key, want] of CASES) {
    await p.evaluate(([fid, x, y]) => { World.busy = false; State.data.aboard = null; World.enterMap(fid, x, y, 'up'); }, [fid, x, y]);
    await p.waitForFunction((fid) => World.map.id === fid && MTQ3D.current && MTQ3D.current.map === World.map && MTQ3D.mode3D(), fid, { timeout: 240000 });
    await p.waitForTimeout(600);
    const r = await p.evaluate(async ([key, fid]) => {
      const lw = World.lockedWarp; let locked = null; World.lockedWarp = function (w) { locked = w.to; World.busy = false; };
      const start = [MTQ3D.pos.x, MTQ3D.pos.z]; let at = null; Engine.Input.keys[key] = true;
      for (let i = 0; i < 160 && World.map.id === fid && !locked; i++) { at = [+MTQ3D.pos.x.toFixed(2), +MTQ3D.pos.z.toFixed(2), World.player.x, World.player.y]; await new Promise((ok) => setTimeout(ok, 40)); }
      Engine.Input.keys[key] = false; World.lockedWarp = lw;
      return { entered: World.map.id !== fid ? World.map.id : null, locked, lastPos: at, start };
    }, [key, fid]);
    // 入口からの距離（入ったときの位置）
    const lm = await p.evaluate(([fid, x, y]) => { const ws = MAP_DEFS[fid].warps || []; let best = null; ws.forEach((w) => { const d = Math.hypot(w.x - x, w.y - y); if (!best || d < best.d) best = { d, x: w.x, y: w.y, to: w.to }; }); return best; }, [fid, x, y]);
    const dist = r.lastPos ? +Math.hypot(r.lastPos[0] - (lm.x + 0.5), r.lastPos[1] - (lm.y + 0.5)).toFixed(2) : null;
    const ok = want === 'locked' ? r.locked === lm.to : r.entered === want;
    out.push({ name, want, entered: r.entered, locked: r.locked, distFromEntryTile: dist, lastTile: r.lastPos && r.lastPos.slice(2), ok }); console.log(JSON.stringify(out[out.length - 1]));
    if (r.entered) await p.waitForTimeout(800);
  }
  // 町から出た直後：出口のマス（入口の1つ下）から横へ歩いても、すぐには入り直さない
  await p.evaluate(() => { World.busy = false; World.enterMap('poyo_village', 24, 30, 'down'); });
  await p.waitForFunction(() => World.map.id === 'poyo_village' && MTQ3D.current && MTQ3D.current.map === World.map, null, { timeout: 240000 });
  const ex = await p.evaluate(() => { const w = (MAP_DEFS.poyo_village.warps || []).find((q) => q.to === 'world'); return w; });
  await p.evaluate((ex) => { World.busy = false; World.enterMap('world', ex.tx, ex.ty, 'down'); }, ex);
  await p.waitForFunction(() => World.map.id === 'world' && MTQ3D.current && MTQ3D.current.map === World.map && MTQ3D.mode3D(), null, { timeout: 240000 }); await p.waitForTimeout(600);
  const side = await p.evaluate(async () => { Engine.Input.keys.right = true; for (let i = 0; i < 20; i++) await new Promise((ok) => setTimeout(ok, 40)); Engine.Input.keys.right = false; await new Promise((ok) => setTimeout(ok, 300)); return { map: World.map.id, tile: [World.player.x, World.player.y] }; });
  out.push({ name: 'exit_then_side', arrived: [ex.tx, ex.ty], after: side, ok: side.map === 'world' }); console.log(JSON.stringify(out[out.length - 1]));
  await p.screenshot({ path: SHOT + 'touch_exit_side.jpg', type: 'jpeg', quality: 80 });
  fs.writeFileSync('/home/claude/work/p3d/touch.json', JSON.stringify({ out, errors: errs }, null, 1)); console.log('errors', errs.length, errs.slice(0, 5)); await br.close();
})();
