// Phase 2：1ターンの流れ（行動 → 動き → 命中 → 数字・HP → のけぞり・撃破）を撮る。主人公1人
const { chromium } = require('playwright'); const fs = require('fs');
const SHOT = '/home/claude/work/p3d/shots/'; const TAG = process.env.TAG || 'p2t'; const ENEMY = process.argv[2] || 'wolf';
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 1100, height: 700 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || /3D actors/.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && (window.MTQ3D.ready || window.MTQ3D.disabled), null, { timeout: 180000 });
  await p.evaluate((LV) => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; State.data.hero.level = +LV; State.data.timeOfDay = 0.42; World.start(); World.enterMap('poyo_village', 24, 30, 'down'); BattleUI.timeline = []; }, process.env.LV || 1);
  await p.evaluate((id) => { window.__b = BattleUI.start(ENEMY_IDS = [id]); }, ENEMY);
  await p.waitForFunction(() => window.BattleStage3D && BattleStage3D.actorsInfo() && BattleStage3D.actorsInfo().ready >= BattleStage3D.actorsInfo().want, null, { timeout: 240000 });
  await p.waitForTimeout(1500);
  const press = (k) => p.evaluate((k) => Engine.Input.press(k), k);
  await press('ok'); await p.waitForTimeout(500); await press('ok');   // たたかう → 対象
  const shots = []; const t0 = Date.now();
  for (let i = 0; i < 4; i++) { await p.waitForTimeout(i === 0 ? 60 : 120); const f = SHOT + TAG + '_' + ENEMY + '_' + i + '.png'; await p.screenshot({ path: f, timeout: 120000 }); shots.push({ f, ms: Date.now() - t0, info: await p.evaluate(() => { const a = BattleStage3D.actorsInfo(); return { enemies: a.enemies.map((e) => e.anim + (e.vis ? '' : '(hidden)')), party: a.party.map((x) => x.anim) }; }) }); }
  await p.waitForTimeout(4000);
  const res = await p.evaluate(() => ({ log: BattleStage3D.actorsInfo().log, sync: BattleStage3D.actorsInfo().sync, timeline: (BattleUI.timeline || []).slice(0, 20), fxlog: BattleStage3D.log().slice(-10) }));
  fs.writeFileSync('/home/claude/work/p3d/' + TAG + '_' + ENEMY + '.json', JSON.stringify({ shots, res, errors: errs }, null, 1));
  console.log(JSON.stringify(shots.map((s) => [s.ms, s.info])), "\nlog", JSON.stringify(res.log), "\nsync", JSON.stringify(res.sync), '\nerrors', errs.length, errs.slice(0, 5)); await br.close();
})();
