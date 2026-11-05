// v7.6 つないだ世界：となりの地域ができる前に境目を越えたとき（速い乗り物・遅い端末）
//   A) まだ組み立てていない → ふだんの読み込み（GameBridge.ensure）で作って、位置をずらして続ける
//   B) 裏で組み立て中 → 同じ地域を2つ作らず、できたら切り替える
const { chromium } = require('playwright');
const PORT = process.env.PORT || 8772; const Q = process.env.Q || 'low';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript((Q) => { try { localStorage.setItem('mtq3d-quality', Q); } catch (e) { } }, Q);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready'].forEach((f) => d.flags[f] = true); d.hero.level = 30; World.start(); });
  await p.waitForTimeout(1500);
  const run = (mode) => p.evaluate(async (mode) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const J = MTQ3D.join;
    // グラニアを捨てる
    J.clear(); const old = MTQ3D.cache.get('world_grania'); if (old && old !== MTQ3D.current) { try { old.dispose(); } catch (e) { } MTQ3D.cache.delete('world_grania'); }
    const m = World.getMap('world'); let t = null; for (let y = 40; y < 80 && !t; y++) if (Vehicle.terrainOk('sailboat', m, 157, y) && Vehicle.terrainOk('sailboat', m, 159, y)) t = { x: 157, y };
    const d = State.data; World.busy = false; d.aboard = 'sailboat'; d.vehicles.sailboat = { owned: true, map: 'world', x: t.x, y: t.y, port: { map: 'world', x: t.x, y: t.y } };
    J.building = '__hold'; World.enterMap('world', t.x, t.y, 'right', { raw: true });
    for (let i = 0; i < 1200 && !(MTQ3D.current && MTQ3D.current.map.id === 'world'); i++) await sleep(100);
    await sleep(1500);
    if (mode === 'B') { J.building = null; J.build('world_grania'); await sleep(300); } else J.building = '__hold';
    const buildsBefore = Object.keys(MTQ3D.stats).filter((k) => k === 'build_world_grania').length;
    let ensureCalls = 0; const en = MTQ3D.ensure.bind(MTQ3D); let ensureBuilt = 0; MTQ3D.ensure = function (map) { if (map.id === 'world_grania') { ensureCalls++; if (!MTQ3D.building && !(J.building === map.id && J.buildingMap === map) && !(MTQ3D.cache.get(map.id) && MTQ3D.cache.get(map.id).map === map)) ensureBuilt++; } return en(map); };
    // 端を越える
    for (let i = 0; i < 10 && World.map.id === 'world'; i++) { while (World.player.moving) await sleep(16); World.tryMove('right'); await sleep(30); for (let k = 0; k < 60 && World.player.moving; k++) await sleep(16); }
    const crossed = World.map.id;
    for (let i = 0; i < 3000 && !(MTQ3D.current && MTQ3D.current.map.id === 'world_grania'); i++) await sleep(100);
    if (mode === 'A') J.building = null;
    await sleep(2500);
    const P = World.player; const pos = MTQ3D.pos; const roots = MTQ3D.scene.children.filter((c) => c.name === 'map3d_world_grania').length;
    MTQ3D.ensure = en;
    return { mode, crossed, cur: MTQ3D.current && MTQ3D.current.map.id, player: { x: P.x, y: P.y }, pos3d: { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2) }, dist: +Math.hypot(pos.x - (P.x + 0.5), pos.z - (P.y + 0.5)).toFixed(2), roots, ensureCalls, ensureBuilt, rootPos: MTQ3D.current.root.position.toArray(), westShown: J.shown.has('world') };
  }, mode);
  const a = await run('A'); console.log(JSON.stringify(a));
  ok(a.crossed === 'world_grania' && a.cur === 'world_grania' && a.dist < 1.5 && a.roots === 1 && a.rootPos.every((v) => v === 0), 'A：まだ組み立てていない地域へ越えた → 読み込んでから続く（位置のずれ ' + a.dist + '・地域の3Dは1つ）');
  const b = await run('B'); console.log(JSON.stringify(b));
  ok(b.crossed === 'world_grania' && b.cur === 'world_grania' && b.dist < 1.5 && b.roots === 1 && b.ensureBuilt === 0, 'B：裏で組み立て中の地域へ越えた → 同じ地域を2つ作らず、できたら切り替わる（位置のずれ ' + b.dist + '・ensure の新しい組み立て ' + b.ensureBuilt + '）');
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
