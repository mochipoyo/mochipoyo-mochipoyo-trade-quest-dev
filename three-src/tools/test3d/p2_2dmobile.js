// 2D版（index.html）のスマホの戦闘画面：3D版だけの小さい画面部品が入っていないこと（コマンド欄・パーティ欄の大きさ・位置）
const { chromium, devices } = require('playwright');
(async () => {
  const br = await chromium.launch(); const errs = []; const out = [];
  for (const name of ['iPhone 13', 'iPhone 13 landscape']) {
    const p = await (await br.newContext(Object.assign({}, devices[name], { deviceScaleFactor: 1 }))).newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8770/index.html'); await p.waitForFunction(() => window.World && window.BattleUI, null, { timeout: 60000 });
    await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; ['lina', 'kyle', 'gald'].forEach((id) => State.joinCompanion(id)); World.start(); World.enterMap('poyo_village', 24, 30, 'down'); });
    await p.waitForTimeout(800); await p.evaluate(() => { BattleUI.start(['wolf', 'harpy']); });
    await p.waitForFunction(() => document.querySelector('.rw-list.cmd-list'), null, { timeout: 60000 }); await p.waitForTimeout(800);
    const m = await p.evaluate(() => { const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); }; return { stage3d: !!window.BattleStage3D, g3: document.body.classList.contains('g3-actors'), cmd: R(document.querySelector('.rw-list.cmd-list')), party: R(document.getElementById('battle-party')), msg: R(document.getElementById('battle-msg')), itemH: R(document.querySelector('.rw-list.cmd-list .rw-item'))[3], hud: getComputedStyle(document.getElementById('hud')).visibility, cssVar: document.documentElement.style.getPropertyValue('--g3-cmd-top') }; });
    await p.screenshot({ path: '/home/claude/work/p3d/shots/check2d_mobile_' + name.replace(/\W+/g, '_') + '.png' });
    out.push(m); console.log(name, JSON.stringify(m));
  }
  console.log('errors', errs); await br.close();
})();
