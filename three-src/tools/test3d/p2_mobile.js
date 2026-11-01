// スマホの画面（横・縦）で、汎用3Dのマップと3Dの戦闘の配置を確認する（ソフトウェア描画）
const { chromium, devices } = require('playwright'); const fs = require('fs');
const SHOT = '/home/claude/work/p3d/shots/';
(async () => {
  const br = await chromium.launch(); const errs = []; const out = [];
  for (const [name, dev] of [['iPhone13横', devices['iPhone 13 landscape']], ['iPhone13縦', devices['iPhone 13']]]) {
    const ctx = await br.newContext(Object.assign({}, dev)); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && (window.MTQ3D.ready || window.MTQ3D.disabled), null, { timeout: 240000 });
    await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; ['lina', 'kyle'].forEach((id) => State.joinCompanion(id)); World.start(); World.enterMap('harbor_town', 20, 12, 'down'); });
    await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map === World.map, null, { timeout: 240000 }); await p.waitForTimeout(2000);
    const q = await p.evaluate(() => ({ quality: MTQ3D.quality, mode3D: MTQ3D.mode3D() }));
    await p.evaluate(() => { MTQ3D.paused = true; MTQ3D.renderer.render(); });
    await p.screenshot({ path: SHOT + 'mob_' + name + '_harbor.png', timeout: 180000 });
    await p.evaluate(() => { window.__b = BattleUI.start(['gull_pirate', 'reef_jelly', 'wolf']); });
    await p.waitForFunction(() => window.BattleStage3D && BattleStage3D.actorsInfo() && BattleStage3D.actorsInfo().ready >= BattleStage3D.actorsInfo().want, null, { timeout: 240000 }).catch(() => {});
    await p.waitForTimeout(2500); await p.screenshot({ path: SHOT + 'mob_' + name + '_battle.png', timeout: 180000 });
    const cmd = await p.evaluate(() => { const el = document.querySelector('.rw-list.cmd-list'); if (!el) return null; const r = el.getBoundingClientRect(); const g = document.getElementById('game').getBoundingClientRect(); return { l: Math.round(r.left - g.left), t: Math.round(r.top - g.top), w: Math.round(r.width), h: Math.round(r.height), gw: Math.round(g.width), gh: Math.round(g.height) }; });
    out.push({ name, q, cmd }); console.log(name, JSON.stringify(q), JSON.stringify(cmd)); await ctx.close();
  }
  console.log('errors', errs); await br.close();
})();
