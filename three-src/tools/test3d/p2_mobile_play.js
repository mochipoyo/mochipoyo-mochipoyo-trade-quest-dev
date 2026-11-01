// スマホ（縦）で3Dの戦闘をタップで最後まで進める：コマンド欄の項目が押せるか・十字の上下で選べるか・戦闘後に画面部品の位置が元に戻るか・途中で横向きにしたとき
const { chromium, devices } = require('playwright'); const SHOT = '/home/claude/work/p3d/shots/';
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 1 })); const p = await ctx.newPage(); const errs = []; const log = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; State.data.settings.battleSpeed = 'fast'; ['lina', 'kyle', 'gald'].forEach((id) => State.joinCompanion(id)); World.start(); World.enterMap('poyo_village', 24, 30, 'down'); });
  await p.waitForTimeout(2500);
  const before = await p.evaluate(() => ({ msg: document.getElementById('battle-msg').getAttribute('style'), party: document.getElementById('battle-party').getAttribute('style'), v: document.documentElement.style.getPropertyValue('--g3-cmd-top') }));
  await p.evaluate(() => { window.__done = false; BattleUI.start(['slime', 'slime']).then((r) => { window.__res = r; window.__done = true; }); });
  let turns = 0, taps = 0, rotated = false, navOk = null, inFrame = [];
  for (let k = 0; k < 400 && turns < 30; k++) {
    const st = await p.evaluate(() => ({ cmd: !!document.querySelector('.rw-list.cmd-list'), list: !!document.querySelector('.rw-list:not(.cmd-list)'), res: !!document.querySelector('.result-victory'), done: window.__done, inBattle: !!(BattleUI.scene && Engine.scenes.indexOf(BattleUI.scene) >= 0) }));
    if (st.res) { await p.waitForTimeout(800); const btn = await p.$('.result-victory .rw-close, .result-victory button'); if (btn) await btn.tap(); else await p.evaluate(() => Engine.Input.press('ok')); taps++; await p.waitForTimeout(600); continue; }
    if (st.done && !st.inBattle) break;
    if (st.cmd) {
      turns++;
      if (navOk === null) {   // 十字の下→上（操作パネルと同じ入力）でカーソルが動くか
        const c0 = await p.evaluate(() => [...document.querySelectorAll('.rw-list.cmd-list .rw-item')].findIndex((e) => e.classList.contains('cur')));
        await p.evaluate(() => Engine.Input.press('down')); await p.waitForTimeout(150);
        const c1 = await p.evaluate(() => [...document.querySelectorAll('.rw-list.cmd-list .rw-item')].findIndex((e) => e.classList.contains('cur')));
        await p.evaluate(() => Engine.Input.press('up')); await p.waitForTimeout(150);
        const c2 = await p.evaluate(() => [...document.querySelectorAll('.rw-list.cmd-list .rw-item')].findIndex((e) => e.classList.contains('cur')));
        navOk = { c0, c1, c2 };
        await p.screenshot({ path: SHOT + 'mplay_cmd.png' });
      }
      if (turns === 3 && !rotated) { rotated = true; await p.setViewportSize({ width: 750, height: 342 }); await p.waitForTimeout(1500); await p.screenshot({ path: SHOT + 'mplay_rotated.png' }); }
      inFrame.push(await p.evaluate(() => { const g = document.getElementById('game').getBoundingClientRect(); return [...document.querySelectorAll('.rw-list.cmd-list .rw-item')].every((e) => { const r = e.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; const top = document.elementFromPoint(cx, cy); return r.left >= g.left - 1 && r.right <= g.right + 1 && r.top >= g.top - 1 && r.bottom <= g.bottom + 1 && top && (top === e || e.contains(top)); }); }));
      const item = await p.$('.rw-list.cmd-list .rw-item[data-i="0"]'); await item.tap(); taps++; await p.waitForTimeout(250); continue;
    }
    if (st.list) { const it = await p.$('.rw-list:not(.cmd-list) .rw-item:not(.disabled)'); if (it) { await it.tap(); await p.waitForTimeout(80); const still = await p.$('.rw-list:not(.cmd-list) .rw-item.cur:not(.disabled)'); if (still) await still.tap(); taps++; } await p.waitForTimeout(250); continue; }
    await p.waitForTimeout(250);
  }
  await p.waitForTimeout(1500);
  const after = await p.evaluate(() => ({ result: window.__res, inBattle: !!(BattleUI.scene && Engine.scenes.indexOf(BattleUI.scene) >= 0), g3: document.body.classList.contains('g3-actors'), msg: document.getElementById('battle-msg').getAttribute('style'), party: document.getElementById('battle-party').getAttribute('style'), v: document.documentElement.style.getPropertyValue('--g3-cmd-top'), hud: getComputedStyle(document.getElementById('hud')).visibility }));
  console.log(JSON.stringify({ before, turns, taps, navOk, allItemsInFrameAndTappable: inFrame.every(Boolean), inFrameChecks: inFrame.length, rotated, after }));
  console.log('errors', errs); await br.close();
})();
