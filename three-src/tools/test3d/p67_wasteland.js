// v6.7 南の荒野の戦闘背景（2D版）：砂漠ではなく、岩場と山の差分画像になること
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 960, height: 600 } })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8770/index.html'); await p.waitForTimeout(2500);
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; World.start(); World.busy = false; World.enterMap('world', 45, 72, 'up'); });
  await p.waitForTimeout(800);
  await p.evaluate(() => { World.busy = false; World.encounter(); });
  await p.waitForTimeout(3500);
  const info = await p.evaluate(() => { const s = window.BattleUI && BattleUI.scene; return s && s.bg65 ? { place: s.bg65.place, variant: s.bg65.variant, key: BattleBG65.photoKey(s.bg65), zone: s.opts && s.opts.zone } : null; });
  await p.screenshot({ path: '/home/claude/work/p3d/shots/v67/battle2d_wasteland.jpg', type: 'jpeg', quality: 80 });
  console.log(JSON.stringify(info), 'errors', errs.length, errs.slice(0, 3)); await br.close();
})();
