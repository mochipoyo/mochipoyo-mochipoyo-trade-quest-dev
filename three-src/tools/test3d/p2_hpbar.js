// v6.6 敵のHPバー：初期値は表示しない・設定で表示する（2D版の戦闘）。メニューの「設定」に項目があるか
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8770/index.html'); await p.waitForFunction(() => window.State && window.BattleUI && window.World && Engine.scenes && Engine.scenes.length, null, { timeout: 60000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; World.start(); World.enterMap('oblivion_cave_1', 5, 5, 'down'); });
  const res = {};
  for (const mode of ['default', 'on', 'off']) {
    await p.evaluate((mode) => { if (mode === 'default') delete State.data.settings.enemyHpBar; else State.data.settings.enemyHpBar = mode; window.__bp = BattleUI.start(['slime', 'slime']); }, mode);
    await p.waitForTimeout(2500);
    // 敵の絵の下（HPバーの位置）の緑色の画素を数える
    res[mode] = await p.evaluate(() => { const c = Engine.canvas; const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 0x4c && d[i + 1] === 0xc3 && d[i + 2] === 0x8a) n++; return n; });
    await p.screenshot({ path: '/home/claude/work/p3d/shots/hpbar_' + mode + '.jpg', type: 'jpeg', quality: 75 });
    await p.evaluate(() => { const sc = BattleUI.scene; Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); BattleUI.scene = null; document.querySelectorAll('#battle-party,#battle-msg').forEach((n) => n.classList.remove('on')); document.querySelectorAll('.rw-list, .rw-panel').forEach((n) => n.remove()); });
  }
  // 設定の画面に項目があるか（メニューを開いて設定を選ぶ代わりに、Menu の設定の一覧の文字を探す）
  const hasItem = await p.evaluate(() => { const src = String(Menu.settings || Menu.openSettings || ''); return /敵のHPバー/.test(src) || Object.keys(Menu).some((k) => /敵のHPバー/.test(String(Menu[k]))); });
  console.log(JSON.stringify({ greenPixels: res, hasItem, errors: errs })); await br.close();
})();
