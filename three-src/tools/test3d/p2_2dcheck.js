// 2D版（index.html）の戦闘が変わっていないか：敵の位置（enemyRect）・名前・数字・1ターン
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 1100, height: 700 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8770/index.html'); await p.waitForFunction(() => window.World && window.BattleUI, null, { timeout: 60000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; State.data.hero.level = 5; World.start(); World.enterMap('poyo_village', 24, 30, 'down'); });
  await p.evaluate(() => { window.__b = BattleUI.start(['wolf', 'harpy', 'rabbit']); }); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => { const s = BattleUI.scene; return { stage3d: !!window.BattleStage3D, flag: !!s._stage3d, rects: [0, 1, 2].map((i) => { const q = s.enemyRect(i, 640, 416); return [q.x, q.y, q.w, q.h, !!q.from3d]; }) }; });
  await p.screenshot({ path: '/home/claude/work/p3d/shots/check2d_battle.png' });
  await p.evaluate(() => Engine.Input.press('ok')); await p.waitForTimeout(500); await p.evaluate(() => Engine.Input.press('ok')); await p.waitForTimeout(4000);
  const after = await p.evaluate(() => ({ pops: BattleUI.scene ? BattleUI.scene.pops.length : -1 }));
  console.log(JSON.stringify(r), JSON.stringify(after), 'errors', errs); await br.close();
})();
