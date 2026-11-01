// iPhone の Safari で起きた「The operation is insecure.」の再現：2D版の画像を別のサイト扱いにして（ORIGIN の画像に差し替え）、3Dの戦闘と探索のボスのシンボルが止まらないか
//   ORIGIN=http://127.0.0.1:8771（CORS を許可）／http://127.0.0.1:8772（許可しない）
const { chromium, devices } = require('playwright');
const ORIGIN = process.env.ORIGIN || 'http://127.0.0.1:8771';
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 1 })); const p = await ctx.newPage(); const errs = [], warns = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/insecure|tainted|cross-origin|2Dで表示|battle (party|art)|backdrop/i.test(m.text())) warns.push(m.type() + ': ' + m.text().slice(0, 160)); });
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  // 2D版の画像を、別のサイトから crossOrigin なしで読み直したもの（＝汚れる画像）に差し替える
  await p.evaluate(async (origin) => {
    const A = window.Assets; const keys = Object.keys(A.images); const jobs = [];
    for (const k of keys) { const old = A.images[k]; const url = old.src.replace(/^https?:\/\/[^/]+/, origin); const im = new Image(); jobs.push(new Promise((r) => { im.onload = r; im.onerror = r; })); im.src = url; A.images[k] = im; }
    await Promise.all(jobs);
    const BU = window.BattleUI; const orig = BU.enemyVisual; const memo = new Map();
    BU.enemyVisual = function (e) { const v = orig.call(this, e); if (v && v.img && v.img instanceof HTMLImageElement) { let im = memo.get(v.img.src); if (!im) { im = new Image(); im.src = v.img.src.replace(/^https?:\/\/[^/]+/, origin); memo.set(v.img.src, im); } return Object.assign({}, v, { img: im }); } return v; };
    window.__tainted = (() => { const c = document.createElement('canvas'); const g = c.getContext('2d'); try { g.drawImage(A.images[keys[0]], 0, 0); g.getImageData(0, 0, 1, 1); return false; } catch (e) { return e.name; } })();
  }, ORIGIN);
  const tainted = await p.evaluate(() => window.__tainted);
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('まち', 'warrior'); State.data.settings.textSpeed = 'instant'; ['lina', 'kyle'].forEach((id) => State.joinCompanion(id)); World.start(); World.enterMap('world', 60, 60, 'down'); });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { State.data.settings.autoBattle = true; window.__r = 'pending'; BattleUI.start(['meadow_frog', 'slime']).then((r) => { window.__r = r; }); });
  await p.waitForTimeout(9000);
  const r = await p.evaluate(() => ({ g3: document.body.classList.contains('g3-actors'), why: BattleStage3D.why(), toast: document.getElementById('toast').textContent, info: (() => { const i = BattleStage3D.actorsInfo(); return i && { ready: i.ready + '/' + i.want, failedArt: i.failedArt, party: i.party.map((q) => q.id + ':' + q.model), enemies: i.enemies.map((e) => e.id + ':' + (e.size ? '3D' : '2D')) }; })(), diag: MTQ3D.diagText() }));
  await p.screenshot({ path: '/home/claude/work/p3d/shots/taint_' + ORIGIN.slice(-4) + '.png' });
  for (let k = 0; k < 40 && (await p.evaluate(() => window.__r)) === 'pending'; k++) { await p.waitForTimeout(1000); if (await p.$('.result-victory')) await p.evaluate(() => Engine.Input.press('ok')); }
  r.result = await p.evaluate(() => window.__r);
  console.log('tainted test image:', tainted); console.log(JSON.stringify(r, null, 1)); console.log('warns', warns.slice(0, 6)); console.log('errors', errs.slice(0, 4)); await br.close();
})();
