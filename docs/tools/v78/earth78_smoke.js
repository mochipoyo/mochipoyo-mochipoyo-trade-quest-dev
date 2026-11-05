// v7.8 地球の世界（3D）：起動・地球の配置・ポヨ村の外のフィールド・境目の移動・ミニマップ／世界地図（ヘッドレス・低画質）
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const SHOT = '/home/claude/work/p3d/shots/v78/';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  const t0 = Date.now(); await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  const info = await p.evaluate(() => ({ earth: World76.earth, on: World76.on(), size: World76.size(), maps: World76.MAPS.length, stats: Earth78.stats.total }));
  ok(info.earth && info.on && info.size.w === 1440, '3D 版で地球の配置が有効 ' + JSON.stringify(info) + '（起動 ' + (Date.now() - t0) + 'ms）');
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; d.hero.level = 30; World.start(); World.encounter = () => { }; });
  await p.waitForTimeout(1500);
  // ポヨ村の出口（旧座標のワープ）からフィールドへ
  await p.evaluate(() => { World.busy = false; const w = MAP_DEFS.poyo_village.warps.find((x) => x.to === 'world'); World.enterMap(w.to, w.tx, w.ty, 'down'); });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === 'world', null, { timeout: 240000 });
  const r1 = await p.evaluate(() => { const L = MAP_DEFS.world.locations.find((l) => l.id === 'poyo_village'); const P = World.player; return { x: P.x, y: P.y, poyo: [L.x, L.y], tile: World.map.tiles[P.y][P.x] }; });
  ok(Math.abs(r1.x - r1.poyo[0]) + Math.abs(r1.y - r1.poyo[1]) <= 3, 'ポヨ村の出口 → 新しい場所のポヨ村のすぐ横に出た ' + JSON.stringify(r1));
  await p.waitForTimeout(6000); await p.screenshot({ path: SHOT + 'poyo_field.jpg', type: 'jpeg', quality: 75, timeout: 120000 });
  // 東へ歩いて、カリオンの国境（関所の前は止まる）
  const r2 = await p.evaluate(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const m = World.getMap('world'); let y0 = null; for (let y = 30; y < 80 && y0 === null; y++) { let okk = true; for (let x = 112; x < 120; x++) if (!m.passable(x, y, State.data)) okk = false; if (okk) y0 = y; }
    World.enterMap('world', 116, y0, 'right', { raw: true }); World.busy = false; await sleep(2500); const k = Engine.Input.keys; k.right = true; const t0 = Date.now(); while (Date.now() - t0 < 8000) await sleep(100); k.right = false; await sleep(500); return { map: World.map.id, x: World.player.x, y0 }; });
  ok(r2.map === 'world' && r2.x >= 117, '関所の前：アルカディアの東の端（ドイツ）で止まる（カリオンへ入らない）' + JSON.stringify(r2));
  const r3 = await p.evaluate(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); State.data.flags.kalion_open = true; const k = Engine.Input.keys; k.right = true; const t0 = Date.now(); while (World.map.id === 'world' && Date.now() - t0 < 30000) await sleep(100); await sleep(1200); k.right = false; await sleep(1500); const P = World.player, pos = MTQ3D.pos; return { map: World.map.id, cur: MTQ3D.current.map.id, x: P.x, dist: +Math.hypot(pos.x - (P.x + 0.5), pos.z - (P.y + 0.5)).toFixed(2) }; });
  ok(r3.map === 'world_kalion' && r3.cur === 'world_kalion' && r3.dist < 1.6, '関所のあと：歩いてカリオンへ（画面の切り替えなし）' + JSON.stringify(r3));
  // ミニマップ・世界の地図
  const r4 = await p.evaluate(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const t = Date.now(); Minimap.openBig ? Minimap.openBig('world') : (Minimap.setMode && Minimap.setMode('world')); await sleep(1500); return { ms: Date.now() - t, shown: !!document.querySelector('#bigmap') }; });
  await p.screenshot({ path: SHOT + 'bigmap_world.jpg', type: 'jpeg', quality: 80, timeout: 120000 });
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
