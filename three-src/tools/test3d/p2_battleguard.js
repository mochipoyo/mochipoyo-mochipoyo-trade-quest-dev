// (1) 全員倒れたままの戦闘 → すぐ全滅扱い → 宿で回復  (2) 戦闘の計算で例外 → 戦闘を終えて探索へ戻る  (3) 以前の3D設定 'model' が残っていても味方はドット絵（PAGE=3d|2d）
const { chromium, devices } = require('playwright');
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 1 })); const p = await ctx.newPage(); const errs = [], cons = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') cons.push(m.text().slice(0, 160)); });
  await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-battle-party', 'model'); } catch (e) {} });
  const url = process.env.PAGE === '2d' ? 'http://localhost:8770/index.html' : 'http://localhost:8770/3d/index.html';
  await p.goto(url); await p.waitForFunction(() => window.World && window.BattleUI && window.State, null, { timeout: 240000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('まち', 'warrior'); State.data.settings.textSpeed = 'instant'; State.data.settings.battleSpeed = 'fast'; ['lina', 'kyle'].forEach((id) => State.joinCompanion(id)); World.start(); World.enterMap('world', 60, 60, 'down'); });
  await p.waitForTimeout(1500); const out = {};
  // (1)
  await p.evaluate(() => { State.data.gold = 100; State.partyActors().forEach((a) => { a.hp = 0; a.dead = true; }); window.__r = 'pending'; World.startBattle(['yosen_slime']).then((r) => { window.__r = r; }); });
  const t0 = Date.now(); for (let k = 0; k < 20; k++) { await p.waitForTimeout(700); if (await p.$('.rw-msg')) await p.evaluate(() => Engine.Input.press('ok')); if (await p.evaluate(() => window.__r !== 'pending')) break; }
  out.deadStart = await p.evaluate(() => ({ r: window.__r, battleShown: !!(BattleUI.scene && Engine.scenes.indexOf(BattleUI.scene) >= 0), hp: State.partyActors().map((a) => a.hp + (a.dead ? 'd' : '')).join(','), gold: State.data.gold, map: World.map.id, busy: World.busy }));
  out.deadStart.sec = Math.round((Date.now() - t0) / 1000);
  // (2)
  await p.evaluate(() => { World.enterMap('world', 60, 60, 'down'); }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const orig = Combat.runTurn; let once = true; Combat.runTurn = function (...a) { if (once) { once = false; throw new Error('テスト用の例外'); } return orig.apply(this, a); }; State.data.settings.autoBattle = true; window.__r = 'pending'; World.startBattle(['slime']).then((r) => { window.__r = r; }); });
  for (let k = 0; k < 20; k++) { await p.waitForTimeout(700); if (await p.evaluate(() => window.__r !== 'pending')) break; }
  out.exception = await p.evaluate(() => ({ r: window.__r, battleShown: !!(BattleUI.scene && Engine.scenes.indexOf(BattleUI.scene) >= 0), busy: World.busy, toast: document.getElementById('toast').textContent, top: Engine.top() === World.scene }));
  // (3)
  if (process.env.PAGE !== '2d') {
    await p.evaluate(() => { State.data.settings.autoBattle = false; BattleUI.start(['slime']); });
    await p.waitForFunction(() => BattleStage3D.actorsInfo() && BattleStage3D.actorsInfo().ready >= BattleStage3D.actorsInfo().want, null, { timeout: 120000 }).catch(() => {});
    out.partyLook = await p.evaluate(() => BattleStage3D.actorsInfo().party.map((q) => q.id + ':' + q.model));
  }
  console.log(process.env.PAGE || '3d', JSON.stringify(out, null, 1)); console.log('console', cons.slice(0, 4)); console.log('errors', errs.slice(0, 4)); await br.close();
})();
