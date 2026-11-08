// v8.4 走る：run84.js の続き（ヘッドレス Chromium・SwiftShader。実機の GPU ではない）
//  この作業環境の描画は 1 秒に 1〜2 コマなので、移動は GameBridge.updateLogic をページの中で直接動かして確かめる
//  1) 隊列の仲間：走っている間、仲間の位置（js/rpg/follow.js の Follow.positions＝3D の仲間もこの位置に立つ）と主人公の距離が、歩くときより開かないか
//  2) 馬車（フィールド）：走るにしていても馬車の速さは変わらないか
//  3) 町の出口：走ったまま（1 コマ 0.05 秒＝いちばん大きく進むとき）出口のマスへ → 地図が変わるか・とばして先へ抜けないか
//  4) 地域の境目（世界のつながり＝つなぐ）：歩いて越えられる陸の境目があれば、走ったまま越えられるか
//  5) 2D 版の保存（mtq-rpg-v2-*）・3D 版のセーブ（mtq-3d-*）を、走るの切り替えで書き換えないか（目印の値を置いて比べる）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8791; const OUT = process.env.OUT || '/home/claude/envwork/docs/arch84/logs/'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 640, height: 360 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); if (!localStorage.getItem('mtq-rpg-v2-slot-9')) localStorage.setItem('mtq-rpg-v2-slot-9', 'SENTINEL-2D'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 0;
    ['kyle', 'mina', 'seris'].forEach((id) => { try { State.joinCompanion(id); } catch (e) { } });
    World.start(); World.encounter = () => { };
  });
  const enter = async (id, x, y, dir) => { await p.evaluate(([id, x, y, dir]) => { World.busy = false; World.enterMap(id, x, y, dir || 'right', { raw: true }); }, [id, x, y, dir]); await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && !MTQ3D.building && !World.busy, id, { timeout: 240000 }); await p.waitForTimeout(800); };
  const findRow = (id, len) => p.evaluate(([id, len]) => {
    const map = World.getMap(id); const d = State.data; const ok = (x, y) => x >= 0 && y >= 0 && x < map.w && y < map.h && map.passable(x, y, d) && !map.warpAt(x, y) && !(map.npcAt && map.npcAt(x, y)) && !(map.eventAt && map.eventAt(x, y)) && !(Tiles.isWater && Tiles.isWater(map.tiles[y][x]));
    for (let y = 4; y < map.h - 4; y++) for (let x = 2; x < map.w - len - 1; x++) { let n = 0; while (n < len && ok(x + n, y) && ok(x + n, y - 1) && ok(x + n, y + 1)) n++; if (n >= len) return { id, x, y }; }
    return null;
  }, [id, len]);
  // 押したキー（向き）のまま updateLogic を n 回（1 回 dt 秒）。止まったら（地図が変わった・会話）抜ける
  const step = (dir, n, dt) => p.evaluate(([dir, n, dt]) => {
    const B = MTQ3D, K = Engine.Input.keys; ['up', 'down', 'left', 'right'].forEach((k) => K[k] = k === dir); const m0 = World.map.id; const log = [];
    for (let i = 0; i < n; i++) { if (World.map.id !== m0 || World.busy) break; B.updateLogic(dt); log.push({ x: +B.pos.x.toFixed(3), z: +B.pos.z.toFixed(3), sp: +B.speed.toFixed(3), f: (window.Follow && Follow.positions ? Follow.positions() : []).map((q) => +Math.hypot(q.x - B.pos.x, q.y - B.pos.z).toFixed(3)) }); }
    ['up', 'down', 'left', 'right'].forEach((k) => K[k] = false);
    return { log, map: World.map.id, x: World.player.x, y: World.player.y, busy: World.busy };
  }, [dir, n, dt]);
  const out = { build: await p.evaluate(() => window.MTQ3D_BUILD), cases: {} };
  const keys0 = await p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
  // 1) 隊列の仲間（ポヨ村）
  const row = await findRow('poyo_village', 14); await enter(row.id, row.x, row.y, 'right');
  const fol = {};
  for (const dash of [false, true]) {
    await enter(row.id, row.x, row.y, 'right'); await p.evaluate((d) => MTQ3D.setDash84(d, true), dash);
    const r = await step('right', 60, 1 / 60); const fl = r.log.filter((q) => q.f.length); const n = fl.length ? fl[fl.length - 1].f.length : 0; const mx = []; for (let i = 0; i < n; i++) mx.push(Math.max.apply(null, fl.slice(20).filter((q) => q.f.length === n).map((q) => q.f[i]))); const last = fl.length ? fl[fl.length - 1].f : [];
    fol[dash ? 'dash' : 'walk'] = { members: await p.evaluate(() => Follow.members().length), enabled: await p.evaluate(() => Follow.enabled()), followers: n, maxDistAfter20Frames: mx, last, moved: +Math.hypot(r.log[r.log.length - 1].x - r.log[0].x, r.log[r.log.length - 1].z - r.log[0].z).toFixed(2) };
  }
  fol.ok = !!(fol.walk.followers && fol.dash.followers === fol.walk.followers && fol.dash.maxDistAfter20Frames.every((v, i) => v <= fol.walk.maxDistAfter20Frames[i] + 0.35));
  out.cases.follow = fol; console.log('follow', JSON.stringify(fol));
  // 3) ポヨ村の出入口（フィールドへの出口を先に。なければ建物の扉）：まっすぐ 5 マス歩ける向きから
  const ex = await p.evaluate(() => {
    const map = World.getMap('poyo_village'); const d = State.data; const ok = (x, y) => x >= 0 && y >= 0 && x < map.w && y < map.h && map.passable(x, y, d) && !map.warpAt(x, y) && !(map.npcAt && map.npcAt(x, y)) && !(map.eventAt && map.eventAt(x, y));
    const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const ws = (map.warps && map.warps.length ? map.warps : map.def.warps) || []; window.__ws84 = ws.length; for (const w of ws.slice().sort((a, b) => (a.to === 'world' ? -1 : 0) - (b.to === 'world' ? -1 : 0))) { if (!w.to) continue; for (const k of Object.keys(D)) { const [dx, dy] = D[k]; let n = 0; while (n < 6 && ok(w.x - dx * (n + 1), w.y - dy * (n + 1))) n++; if (n >= 5) return { warp: { x: w.x, y: w.y, to: w.to }, dir: k, sx: w.x - dx * 5, sy: w.y - dy * 5 }; } }
    return null;
  });
  if (ex) {
    const res = {};
    for (const dash of [false, true]) { await enter('poyo_village', ex.sx, ex.sy, ex.dir); await p.evaluate((d) => MTQ3D.setDash84(d, true), dash); const r = await step(ex.dir, 80, 0.05); await p.waitForTimeout(2500); const after = await p.evaluate(() => ({ map: World.map.id, x: World.player.x, y: World.player.y })); res[dash ? 'dash' : 'walk'] = { stepsUntilLeave: r.log.length, mapAfter: after.map, at: [after.x, after.y] }; }
    res.ok = res.dash.mapAfter === ex.warp.to && res.walk.mapAfter === ex.warp.to && res.dash.stepsUntilLeave <= res.walk.stepsUntilLeave;
    out.cases.townExit = Object.assign({ exit: ex }, res); console.log('townExit', JSON.stringify(out.cases.townExit));
  } else { out.cases.townExit = { note: '出口が見つからない' }; console.log('townExit none'); }
  // 2) 馬車（フィールド world）
  const frow = await findRow('world', 14);
  if (frow) {
    const car = {};
    await enter(frow.id, frow.x, frow.y, 'right');
    await p.evaluate(() => { Carriage.give(); State.data.carriage.on = true; Carriage.apply(); });
    car.riding = await p.evaluate(() => Carriage.riding());
    for (const dash of [false, true]) { await enter(frow.id, frow.x, frow.y, 'right'); await p.evaluate((d) => MTQ3D.setDash84(d, true), dash); const r = await step('right', 30, 1 / 60); car[dash ? 'dash' : 'walk'] = { speed: r.log.length ? r.log[r.log.length - 1].sp : null }; }
    await p.evaluate(() => { State.data.carriage.on = false; Carriage.apply(); });
    for (const dash of [false, true]) { await enter(frow.id, frow.x, frow.y, 'right'); await p.evaluate((d) => MTQ3D.setDash84(d, true), dash); const r = await step('right', 30, 1 / 60); car[dash ? 'footDash' : 'footWalk'] = { speed: r.log.length ? r.log[r.log.length - 1].sp : null }; }
    car.ok = car.riding && car.dash.speed === car.walk.speed && Math.abs(car.footDash.speed / car.footWalk.speed - 1.6) < 0.01;
    out.cases.carriage = car; console.log('carriage', JSON.stringify(car));
  }
  // 4) 地域の境目：歩いて越えられる陸の境目（端のマスと、となりの地図の最初のマスがどちらも陸で通れる）を探す
  const border = await p.evaluate(() => {
    const W76 = window.World76; if (!W76 || !W76.on || !W76.on()) return { join: false };
    const d = State.data; const ids = ['world', 'world_grania', 'world_kalion', 'world_lithia', 'world_magicka', 'world_tempus', 'world_frost', 'world_dragon', 'world_dark', 'world_arcadia'].filter((id) => window.MAP_DEFS && MAP_DEFS[id]);
    const land = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.passable(x, y, d) && !(Tiles.isWater && Tiles.isWater(m.tiles[y][x])) && !m.warpAt(x, y) && !(m.eventAt && m.eventAt(x, y)) && !(m.npcAt && m.npcAt(x, y));
    for (const id of ids) {
      const m = World.getMap(id);
      const sides = [['right', (k) => [m.w - 1, k], [1, 0], m.h], ['left', (k) => [0, k], [-1, 0], m.h], ['down', (k) => [k, m.h - 1], [0, 1], m.w], ['up', (k) => [k, 0], [0, -1], m.w]];
      for (const [dir, at, [dx, dy], len] of sides) for (let k = 3; k < len - 3; k++) {
        const [x, y] = at(k); let ok = true; for (let s = 0; s < 6 && ok; s++) ok = land(m, x - dx * s, y - dy * s); if (!ok) continue;
        const nb = W76.neighbor(id, x + dx, y + dy); if (!nb) continue; const m2 = World.getMap(nb.map); let ok2 = true; for (let s = 0; s < 3 && ok2; s++) ok2 = land(m2, nb.x + dx * s, nb.y + dy * s); if (!ok2) continue;
        if (W76.unlocked && !W76.unlocked(nb.map)) continue;
        return { join: true, from: id, dir, sx: x - dx * 5, sy: y - dy * 5, to: nb.map };
      }
    }
    return { join: true, none: true };
  });
  if (border && border.from) {
    await enter(border.from, border.sx, border.sy, border.dir); await p.evaluate(() => MTQ3D.setDash84(true, true));
    const r = await step(border.dir, 80, 0.05); await p.waitForTimeout(3000);
    const after = await p.evaluate(() => ({ map: World.map.id, x: World.player.x, y: World.player.y, cur3d: MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id }));
    out.cases.border = Object.assign({}, border, { after, ok: after.map === border.to }); console.log('border', JSON.stringify(out.cases.border));
  } else { out.cases.border = border; console.log('border', JSON.stringify(border)); }
  // 5) 保存：走るの切り替えで変わる保存は mtq3d-run だけか
  await p.evaluate(() => MTQ3D.setDash84(false, true));
  const keys1 = await p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
  const tog = await p.evaluate(() => { const snap = () => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; }; const a = snap(); MTQ3D.setDash84(true, true); const b = snap(); MTQ3D.setDash84(false, true); const c = snap(); const diff = (x, y) => Object.keys(Object.assign({}, x, y)).filter((k) => x[k] !== y[k]); return { changedOn: diff(a, b), changedOff: diff(b, c), valueOn: b['mtq3d-run'], valueOff: c['mtq3d-run'], sentinel2D: localStorage.getItem('mtq-rpg-v2-slot-9') }; });
  out.cases.storage = Object.assign(tog, { keysAddedDuringTest: Object.keys(keys1).filter((k) => !(k in keys0)), ok: tog.changedOn.join() === 'mtq3d-run' && tog.changedOff.join() === 'mtq3d-run' && tog.valueOn === 'on' && tog.valueOff === 'off' && tog.sentinel2D === 'SENTINEL-2D' });
  console.log('storage', JSON.stringify(out.cases.storage));
  out.pageErrors = errs; fs.writeFileSync(OUT + 'run84b.json', JSON.stringify(out, null, 1)); console.log('errors', errs.length, JSON.stringify(errs.slice(0, 5)));
  await br.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
