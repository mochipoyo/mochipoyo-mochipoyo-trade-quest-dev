// 味方が全員 HP 0 のまま戦闘が始まったらどうなるか（3D版／2D版）。PAGE=3d|2d
const { chromium, devices } = require('playwright');
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext(Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 1 }))).newPage(); const errs = [], cons = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') cons.push(m.text().slice(0, 300)); });
  await p.addInitScript(() => { window.addEventListener('unhandledrejection', (e) => { console.error('UNHANDLED: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)); }); });
  const url = process.env.PAGE === '2d' ? 'http://localhost:8770/index.html' : 'http://localhost:8770/3d/index.html';
  await p.goto(url); await p.waitForFunction(() => window.World && window.BattleUI && window.State, null, { timeout: 240000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('まち', 'warrior'); State.data.settings.textSpeed = 'instant'; ['lina', 'kyle'].forEach((id) => State.joinCompanion(id)); World.start(); World.enterMap('world', 60, 60, 'down'); });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { State.partyActors().forEach((a) => { a.hp = 0; a.dead = true; }); State.data.settings.autoBattle = true; window.__r = 'pending'; World.startBattle(['yosen_slime']).then((r) => { window.__r = r; }).catch((e) => { window.__r = 'error: ' + e.message; }); });
  for (let k = 0; k < 20; k++) { await p.waitForTimeout(1000); const d = await p.$('.rw-msg'); if (d) await p.evaluate(() => Engine.Input.press('ok')); }
  const s = await p.evaluate(() => ({ r: window.__r, inBattle: !!(BattleUI.scene && Engine.scenes.indexOf(BattleUI.scene) >= 0), state: BattleUI.battle && BattleUI.battle.state, turn: BattleUI.battle && BattleUI.battle.turn, hp: State.partyActors().map((a) => a.hp).join(','), msg: (document.getElementById('battle-msg') || {}).textContent, busy: World.busy, map: World.map && World.map.id }));
  console.log(process.env.PAGE || '3d', JSON.stringify(s)); console.log('console', cons.slice(0, 5)); console.log('errors', errs.slice(0, 5)); await br.close();
})();
