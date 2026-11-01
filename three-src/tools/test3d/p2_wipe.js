// 実機の報告：味方が全員 HP 0 になっても戦闘が進まない。スマホの画面・オート ON で全滅させ、戦闘が終わって宿へ戻るかを確かめる
//   STYLE=model|sprite  ENEMY=yosen_slime
const { chromium, devices } = require('playwright'); const SHOT = '/home/claude/work/p3d/shots/';
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 1 })); const p = await ctx.newPage(); const errs = [], cons = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') cons.push(m.type() + ': ' + m.text().slice(0, 200)); });
  await p.addInitScript((st) => { try { localStorage.setItem('mtq3d-battle-party', st); } catch (e) {} window.addEventListener('unhandledrejection', (e) => { console.error('UNHANDLED: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)); }); }, process.env.STYLE || 'model');
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('まち', 'warrior'); State.data.settings.textSpeed = 'instant'; ['lina', 'kyle'].forEach((id) => State.joinCompanion(id)); World.start(); World.enterMap('world', 60, 60, 'down'); });
  await p.waitForTimeout(3000);
  await p.evaluate((en) => { State.partyActors().forEach((a) => { a.hp = 1; }); State.data.settings.autoBattle = true; window.__r = 'pending'; World.startBattle([en]).then((r) => { window.__r = r; }).catch((e) => { window.__r = 'error: ' + e.message; }); }, process.env.ENEMY || 'yosen_slime');
  const t0 = Date.now(); let last = '';
  for (let k = 0; k < 120; k++) {
    await p.waitForTimeout(1000);
    const s = await p.evaluate(() => ({ r: window.__r, inBattle: !!(BattleUI.scene && Engine.scenes.indexOf(BattleUI.scene) >= 0), state: BattleUI.battle && BattleUI.battle.state, turn: BattleUI.battle && BattleUI.battle.turn, hp: State.partyActors().map((a) => a.hp).join(','), msg: (document.getElementById('battle-msg') || {}).textContent, dialog: (document.querySelector('.rw-msg .rw-text') || {}).textContent || '', busy: World.busy, map: World.map && World.map.id }));
    const line = JSON.stringify(s); if (line !== last) { console.log(Math.round((Date.now() - t0) / 1000) + 's', line); last = line; }
    if (await p.$('.result-victory')) await p.evaluate(() => Engine.Input.press('ok'));
    if (s.dialog) { await p.screenshot({ path: SHOT + 'wipe_' + (process.env.STYLE || 'model') + '_dialog.png' }); await p.evaluate(() => Engine.Input.press('ok')); }
    if (s.r !== 'pending' && !s.busy) break;
    if (k === 25) await p.screenshot({ path: SHOT + 'wipe_' + (process.env.STYLE || 'model') + '_25s.png' });
  }
  const fin = await p.evaluate(() => ({ r: window.__r, hp: State.partyActors().map((a) => a.hp).join(','), map: World.map && World.map.id, actors: window.BattleStage3D && BattleStage3D.actorsInfo() ? BattleStage3D.actorsInfo().party.map((q) => q.id + ':' + q.anim + ':' + q.dead).join(' ') : null }));
  console.log('final', JSON.stringify(fin)); console.log('console', cons.slice(0, 12)); console.log('errors', errs); await br.close();
})();
