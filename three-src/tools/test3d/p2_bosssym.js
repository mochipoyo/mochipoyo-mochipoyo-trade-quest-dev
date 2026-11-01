// 探索中のボスのシンボル：ボスの絵から作った立体（2.5D）で出るか
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 1100, height: 700 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 180000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'warrior'); World.start(); });
  const found = await p.evaluate(() => { for (const id of Object.keys(MAP_DEFS)) { let L = []; try { L = BossSymbol.list(World.getMap(id)) || []; } catch (e) {} const s = L.find((x) => x.kind !== 'npc'); if (s) return { id, x: s.x, y: s.y, enemy: s.enemy }; } return null; });
  console.log('symbol', JSON.stringify(found)); if (!found) { await br.close(); return; }
  await p.evaluate((f) => { const m = World.getMap(f.id); let best = null; for (let r = 1; r < 6 && !best; r++) for (const [dx, dy] of [[0, r], [r, 0], [-r, 0], [0, -r]]) { if (!best && m.passable(f.x + dx, f.y + dy, State.data)) best = [f.x + dx, f.y + dy]; } World.enterMap(f.id, best[0], best[1], 'up'); }, found);
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map === World.map, null, { timeout: 240000 }); await p.waitForTimeout(2500);
  const info = await p.evaluate(() => MTQ3D.current.bossSymbolInfo()); console.log(JSON.stringify(info));
  await p.evaluate(() => { MTQ3D.paused = true; MTQ3D.renderer.render(); }); await p.screenshot({ path: '/home/claude/work/p3d/shots/bosssym_3d.png', timeout: 120000 });
  console.log('errors', errs); await br.close();
})();
