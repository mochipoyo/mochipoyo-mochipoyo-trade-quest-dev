// v7.6 つないだ世界（3D）：斜め入力で境目を越える・境目のそばで戦闘して再開・往復（キー入力。ヘッドレス・低画質）
const { chromium } = require('playwright');
const PORT = process.env.PORT || 8772; const Q = process.env.Q || 'low';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript((Q) => { try { localStorage.setItem('mtq3d-quality', Q); } catch (e) { } }, Q);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready'].forEach((f) => d.flags[f] = true); d.hero.level = 40; d.settings.textSpeed = 'instant'; d.settings.battleSpeed = 'fast'; d.settings.autoBattle = true; World.start(); World.encounter = () => { }; });   // 歩いている間のランダムな戦闘は止める（境目のそばの戦闘は下で決まった時に起こす）
  await p.waitForTimeout(1500);
  // アルカディアの東の端の近く（帆船）
  await p.evaluate(() => { const m = World.getMap('world'); let t = null; for (let y = 30; y < 90 && !t; y++) { let okk = true; for (let k = 0; k < 7; k++) if (!Vehicle.terrainOk('galleon', m, 153 + k, y - k)) okk = false; if (okk) t = { x: 153, y }; } const d = State.data; World.busy = false; d.aboard = 'galleon'; d.vehicles.galleon = { owned: true, map: 'world', x: t.x, y: t.y, port: { map: 'world', x: t.x, y: t.y } }; World.enterMap('world', t.x, t.y, 'right', { raw: true }); window.__t = t; });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map.id === 'world', null, { timeout: 240000 });
  await p.waitForFunction(() => MTQ3D.join.shown.has('world_grania'), null, { timeout: 400000 }).catch(() => { });
  // 斜め（右上）を押し続ける
  const r1 = await p.evaluate(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const k = Engine.Input.keys; const st = State.data.steps; k.right = true; k.up = true; const t0 = Date.now(); while (World.map.id === 'world' && Date.now() - t0 < 240000) await sleep(100); await sleep(1500); k.right = false; k.up = false; await sleep(800);
    const P = World.player, pos = MTQ3D.pos; return { map: World.map.id, cur: MTQ3D.current.map.id, x: P.x, y: P.y, dist: +Math.hypot(pos.x - (P.x + 0.5), pos.z - (P.y + 0.5)).toFixed(2), steps: State.data.steps - st, veh: State.data.vehicles.galleon.map, o: World76.origin(World.map.id) }; });
  ok(r1.map !== 'world' && r1.cur === r1.map && r1.dist < 1.6 && r1.veh === r1.map, '斜め（右上）の入力のまま境目を越えた（' + r1.map + '・3D の位置と 2D のマスのずれ ' + r1.dist + '・歩数 ' + r1.steps + '）' + JSON.stringify(r1));
  // 境目のそばで戦闘 → 勝って再開
  const before = await p.evaluate(() => ({ map: World.map.id, x: World.player.x, y: World.player.y, steps: State.data.steps, aboard: State.data.aboard }));
  await p.evaluate(() => { State.partyActors().forEach((a) => { a.hp = 9999; }); window.__pr = World.startBattle(['slime'], {}); });
  const t0 = Date.now(); let res = null;
  while (Date.now() - t0 < 180000) { res = await p.evaluate(async () => { const top = document.getElementById('ui').lastElementChild; if (top) { if (top.classList.contains('rw-panel')) { const bt = top.querySelector('.rw-panel-close'); if (bt) bt.click(); else Engine.Input.press('ok'); } else if (top.classList.contains('rw-msg')) Engine.Input.press('ok'); } return await Promise.race([window.__pr, new Promise((r) => setTimeout(() => r(null), 300))]); }); if (res) break; }
  await p.waitForTimeout(2500);
  const after = await p.evaluate(() => { const P = World.player, pos = MTQ3D.pos; return { map: World.map.id, cur: MTQ3D.current && MTQ3D.current.map.id, x: P.x, y: P.y, steps: State.data.steps, aboard: State.data.aboard, dist: +Math.hypot(pos.x - (P.x + 0.5), pos.z - (P.y + 0.5)).toFixed(2), shown: [...MTQ3D.join.shown.keys()] }; });
  ok(res === 'won' && after.map === before.map && after.x === before.x && after.y === before.y && after.aboard === before.aboard && after.cur === after.map && after.dist < 1.6, '境目のそばの戦闘のあと、同じ場所・同じ地図・乗ったままで再開（3D も同じ地図・ずれ ' + after.dist + '・並べた地図 ' + after.shown.join(',') + '）');
  // 左へ戻る（往復）
  const r2 = await p.evaluate(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const k = Engine.Input.keys; const from = World.map.id; const o1 = World76.origin(from), o0 = World76.origin('world'); const key = o1.x > o0.x + 100 ? 'left' : 'down'; k[key] = true; const t0 = Date.now(); while (World.map.id === from && Date.now() - t0 < 240000) await sleep(100); await sleep(1200); k[key] = false; await sleep(800); const P = World.player, pos = MTQ3D.pos; return { map: World.map.id, cur: MTQ3D.current.map.id, dist: +Math.hypot(pos.x - (P.x + 0.5), pos.z - (P.y + 0.5)).toFixed(2) }; });
  ok(r2.map === 'world' && r2.cur === 'world' && r2.dist < 1.6, '反対へ押して戻る（往復）' + JSON.stringify(r2));
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
