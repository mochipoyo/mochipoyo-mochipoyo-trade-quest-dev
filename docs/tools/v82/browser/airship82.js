// 飛空艇に乗れるかの確かめ（3D 版・ヘッドレス Chromium）
//  1) 止めてある飛空艇（陸のマス）へ、歩いて（自由移動のキー入力で）近づく → 乗れるか
//  2) 馬車に乗ったまま近づく → 乗れるか
//  3) 乗ったあと決定キーで着陸 → 降りて 1 歩離れ → また飛空艇のマスへ歩いて戻る → 乗れるか
//  4) アストラ号（止めてある星界航行船）へ歩いて近づく → 「飛び立つ？」が出るか（持っているセーブのときだけ）
const { chromium } = require('playwright'); const fs = require('fs'); const PORT = process.env.PORT || 8791;
const OUT = process.env.OUT || '/home/claude/work/p3d/shots/v82/airship/'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 960, height: 540 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  const setup = (opt) => p.evaluate((opt) => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready', 'airship_owned', 'magicka_arrived'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 0;
    World.start(); World.encounter = () => { };
    // 飛空艇を、プレイヤーの 2 マス南（陸）に止める。場所は飛空艇の家（world_magicka 94,72 の近く）
    const id = World.map.id; return { start: id };
  }, opt);
  const enter = async (id, x, y, dir) => { await p.evaluate(([id, x, y, dir]) => { World.busy = false; World.enterMap(id, x, y, dir || 'down', { raw: true }); }, [id, x, y, dir]); await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && !MTQ3D.building, id, { timeout: 180000 }); await p.waitForTimeout(800); };
  const st = () => p.evaluate(() => ({ map: World.map.id, x: World.player.x, y: World.player.y, aboard: State.data.aboard || null, air: State.data.vehicles && State.data.vehicles.airship ? { map: State.data.vehicles.airship.map, x: State.data.vehicles.airship.x, y: State.data.vehicles.airship.y } : null, carriage: !!(window.Carriage && Carriage.riding()), busy: World.busy }));
  const hold = async (key, ms) => { await p.keyboard.down(key); await p.waitForTimeout(ms); await p.keyboard.up(key); await p.waitForTimeout(500); };
  const out = { cases: [] };
  await setup({});
  // 飛空艇の家の近くで、陸の歩けるマスが南北に 3 つ並ぶ所を探す（北：主人公、南：飛空艇）
  const spot = await p.evaluate(() => {
    const V = VEHICLES.airship; const W = World; const map = W.getMap(V.home.map); const d = State.data;
    const ok = (x, y) => x >= 0 && y >= 0 && x < map.w && y < map.h && map.passable(x, y, d) && !Tiles.isWater(map.tiles[y][x]) && !map.warpAt(x, y) && !map.npcAt(x, y) && !map.eventAt(x, y) && V.landOn.indexOf(map.tiles[y][x]) >= 0;
    for (let r = 0; r < 20; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = V.home.x + dx, y = V.home.y + dy; if (ok(x, y) && ok(x, y + 1) && ok(x, y + 2) && ok(x - 1, y + 1) && ok(x + 1, y + 1)) return { map: map.id, x, y }; }
    return null;
  });
  out.spot = spot; console.log('spot', JSON.stringify(spot));
  const settle = async () => { await p.waitForFunction(() => !World.player.moving && !World.busy, null, { timeout: 30000 }).catch(() => { }); await p.waitForTimeout(300); };   // 前の場合の 1 歩（飛行中の移動）が終わるまで待つ
  const park = (x, y) => p.evaluate(([m, x, y]) => { const d = State.data; d.vehicles = d.vehicles || {}; d.vehicles.airship = { owned: true, map: m, x, y, port: { map: m, x, y } }; d.aboard = null; }, [spot.map, x, y]);
  // 1) 歩いて
  await park(spot.x, spot.y + 2); await enter(spot.map, spot.x, spot.y, 'down');
  const a0 = await st(); await hold('ArrowDown', 3500); const a1 = await st();
  await p.screenshot({ path: OUT + 'walk.jpg', type: 'jpeg', quality: 80 });
  out.cases.push({ case: '歩いて飛空艇へ', before: a0, after: a1, ok: a1.aboard === 'airship' }); console.log('walk', JSON.stringify(a0), '->', JSON.stringify(a1));
  // 2) 馬車で
  await settle(); await p.evaluate(() => { State.data.aboard = null; if (window.Carriage) { Carriage.give(); State.data.carriage.on = true; Carriage.apply(); } });
  await park(spot.x, spot.y + 2); await enter(spot.map, spot.x, spot.y, 'down');
  const b0 = await st(); await hold('ArrowDown', 3500); const b1 = await st();
  await p.screenshot({ path: OUT + 'carriage.jpg', type: 'jpeg', quality: 80 });
  out.cases.push({ case: '馬車で飛空艇へ', before: b0, after: b1, ok: b1.aboard === 'airship' }); console.log('carriage', JSON.stringify(b0), '->', JSON.stringify(b1));
  // 3) 着陸 → 離れる → 戻る
  let c = { case: '着陸して降り、1 歩離れてから戻る' };
  if (b1.aboard === 'airship') {
    await settle(); await p.keyboard.press('Enter'); await p.waitForTimeout(800); const c0 = await st();
    await hold('ArrowUp', 500); const c1 = await st(); await hold('ArrowDown', 2500); const c2 = await st();
    c = Object.assign(c, { landed: c0, away: c1, back: c2, ok: !c0.aboard && c1.aboard === null && (c1.x !== c0.x || c1.y !== c0.y) && c2.aboard === 'airship' });
  } else c.ok = false, c.note = '2) で乗れなかったので試せない';
  out.cases.push(c); console.log('land/back', JSON.stringify(c));
  // 4) アストラ号：陸に止めて、歩いてぶつかる → 「飛び立つ？」の選択が出る（やめる）
  await settle(); const d0 = await p.evaluate(([m, x, y]) => { const d = State.data; d.aboard = null; if (d.carriage) d.carriage.on = false; d.vehicles.airship.map = 'world'; if (!window.Astra || !Astra.park) return { none: true }; d.astra = d.astra || {}; d.astra.owned = true; d.astra.flying = false; Astra.park(m, x, y); return { parked: Astra.parkedOn(m) }; }, [spot.map, spot.x, spot.y + 2]);
  let e = { case: 'アストラ号へ歩いてぶつかる' };
  if (d0.none) { e.ok = null; e.note = 'Astra なし'; }
  else {
    await p.evaluate(() => { window.__astraAsk = 0; const c0 = Win.choice; Win.choice = function (q) { if (/アストラ/.test(q)) { window.__astraAsk++; return Promise.resolve(1); } return c0.apply(this, arguments); }; });
    await enter(spot.map, spot.x, spot.y, 'down'); const e0 = await st(); await hold('ArrowDown', 3500); const e1 = await st(); const asked = await p.evaluate(() => window.__astraAsk);
    e = Object.assign(e, { parked: d0.parked, before: e0, after: e1, asked, ok: asked > 0 && !(e1.x === spot.x && e1.y === spot.y + 2) });
  }
  out.cases.push(e); console.log('astra', JSON.stringify(e));
  // 5) 船（水の上）は前と同じく乗れる：遠洋航海船を海に置き、岸から海へ進む
  const shore = await p.evaluate(() => { const map = World.getMap('world_magicka'); const d = State.data; for (let y = 60; y < 100; y++) for (let x = 80; x < 120; x++) { if (map.passable(x, y, d) && !Tiles.isWater(map.tiles[y][x]) && !map.warpAt(x, y) && Vehicle.terrainOk('galleon', map, x + 1, y) && Vehicle.terrainOk('galleon', map, x + 2, y) && !map.warpAt(x + 1, y)) return { x, y }; } return null; });
  let f = { case: '岸から船（水の上）へ' };
  if (shore) { await settle(); await p.evaluate(([x, y]) => { const d = State.data; d.aboard = null; d.vehicles.galleon = { owned: true, map: 'world_magicka', x: x + 1, y, port: { map: 'world_magicka', x: x + 1, y } }; }, [shore.x, shore.y]); await enter('world_magicka', shore.x, shore.y, 'right'); await hold('ArrowRight', 3000); const f1 = await st(); f = Object.assign(f, { shore, after: f1, ok: f1.aboard === 'galleon' }); } else f.note = '岸が見つからない';
  out.cases.push(f); console.log('ship', JSON.stringify(f));
  out.errs = errs; await br.close();
  fs.writeFileSync(OUT + 'result.json', JSON.stringify(out, null, 1));
  console.log('RESULT', out.cases.map((q) => q.case + ':' + (q.ok ? 'OK' : 'NG')).join(' / '), 'pageerrors', errs.length);
})().catch((e) => { console.log(e.stack); process.exit(1); });
