// v6.7 3D版：クイズモンスターのシンボル（3D）と、豆知識おばさん（町のNPC）が出ているか。画面を撮る（ソフトウェア描画）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = process.env.SHOTDIR || '/home/claude/work/p3d/shots/v67/'; fs.mkdirSync(SHOT, { recursive: true });
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 900, height: 600 } })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 240)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`);
  await p.waitForFunction(() => window.MTQ3D && (window.MTQ3D.ready || window.MTQ3D.disabled), null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; World.start(); });
  const cases = (process.env.CASES || 'quiz_monster_006,quiz_monster_009,quiz_monster_022,quiz_monster_042').split(',');
  const out = [];
  for (const mid of cases) {
    const q = await p.evaluate((mid) => { const m = QUIZ_MONSTERS.find((x) => x.id === mid); return { map: m.map, x: m.x, y: m.y }; }, mid);
    await p.evaluate((q) => { World.busy = false; World.enterMap(q.map, q.x, q.y + 3, 'up'); }, q);
    try { await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map === World.map && MTQ3D.mode3D(), null, { timeout: 300000 }); } catch (e) { out.push({ mid, error: 'build timeout' }); continue; }
    await p.evaluate((q) => { const pl = World.player; pl.x = q.x; pl.y = q.y + 3; pl.px = pl.x * 32; pl.py = pl.y * 32; pl.dir = 'up'; State.data.timeOfDay = 0.42; MTQ3D.lighting.preview = 0.42; MTQ3D.camera.first = true; }, q);
    await p.waitForTimeout(1500);
    const info = await p.evaluate(() => MTQ3D.current.quizSymbolInfo ? MTQ3D.current.quizSymbolInfo() : null);
    await p.screenshot({ path: SHOT + 'quiz3d_' + mid + '.jpg', type: 'jpeg', quality: 80, timeout: 180000 });
    out.push({ mid, map: q.map, info }); console.log(JSON.stringify(out[out.length - 1]));
  }
  // 豆知識おばさん（ポヨ村）
  await p.evaluate(() => { World.busy = false; const a = CHATTER67.aunts.poyo_village; World.enterMap('poyo_village', a.x, a.y + 3, 'up'); });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map === World.map && MTQ3D.mode3D(), null, { timeout: 300000 });
  await p.evaluate(() => { const a = CHATTER67.aunts.poyo_village; const pl = World.player; pl.x = a.x; pl.y = a.y + 3; pl.px = pl.x * 32; pl.py = pl.y * 32; pl.dir = 'up'; MTQ3D.camera.first = true; });
  await p.waitForTimeout(1500);
  const aunt = await p.evaluate(() => { const sc = MTQ3D.current; const n = World.map.npcs.find((x) => x.id === 'aunt67_poyo_village'); const ch = sc.npcs && (sc.npcs.find ? sc.npcs.find((c) => c.npc === n || (c.data && c.data === n)) : null); return { npc: !!n, npcs3d: sc.npcs ? sc.npcs.length : -1, has3d: !!ch }; });
  await p.screenshot({ path: SHOT + 'aunt3d_poyo.jpg', type: 'jpeg', quality: 80 });
  console.log('aunt', JSON.stringify(aunt));
  fs.writeFileSync(SHOT + 'p67_quiz3d.json', JSON.stringify({ out, aunt, errors: errs }, null, 1));
  console.log('errors', errs.length, errs.slice(0, 6)); await br.close();
})();
