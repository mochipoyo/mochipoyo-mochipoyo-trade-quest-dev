// ドット絵の味方：立ち絵のない職業・NPC の見た目の仲間でも出るか（どの絵を使ったか）
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 1100, height: 700 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 180000 });
  const sp = await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'chronomancer'); ['elna', 'io', 'ord'].forEach((id) => { try { State.joinCompanion(id); } catch (e) {} }); World.start(); World.enterMap('poyo_village', 24, 30, 'down'); MTQ3D.paused = true; return State.partyActors().map((a) => a.id + ':' + a.job + ':' + a.sprite); });
  await p.evaluate(() => { window.__b = BattleUI.start(['wolf']); });
  await p.waitForFunction(() => window.BattleStage3D && BattleStage3D.actorsInfo() && BattleStage3D.actorsInfo().ready >= BattleStage3D.actorsInfo().want, null, { timeout: 240000 }).catch(() => {});
  await p.waitForTimeout(1500); const info = await p.evaluate(() => BattleStage3D.actorsInfo().party.map((x) => x.id + ':' + x.model + ':' + x.ready));
  await p.screenshot({ path: '/home/claude/work/p3d/shots/px_kinds.png', timeout: 120000 });
  console.log(JSON.stringify(sp), JSON.stringify(info), 'errors', errs); await br.close();
})();
