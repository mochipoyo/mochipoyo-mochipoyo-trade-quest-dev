// v6.6 更新のお知らせ：version.json が読み込んだ版と同じなら何も出さない／違えば「新しい版があります」→ 戦闘中は読み込み直さない・探索中は自動セーブして読み込み直す。js の ?v= を確認
const { chromium } = require('playwright');
const PAGE = process.env.PAGE || '2d';
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1100, height: 700 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  let fake = null; await p.route('**/version.json*', async (r) => { if (!fake) return r.continue(); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: fake }) }); });
  const scripts = []; p.on('request', (q) => { if (/\/js\/.*\.js/.test(q.url())) scripts.push(q.url()); });
  const url = `http://localhost:8770/${PAGE === '3d' ? '3d/' : ''}index.html`; await p.goto(url);
  if (PAGE === '3d') await p.waitForFunction(() => window.MTQ3D && (MTQ3D.ready || MTQ3D.disabled), null, { timeout: 240000 }); else await p.waitForFunction(() => window.State && window.World && window.UpdateCheck, null, { timeout: 60000 });
  const r = { page: PAGE, version: await p.evaluate(() => window.MTQ_VERSION), scriptsWithV: scripts.filter((u) => /\?v=[0-9a-f]{10}$/.test(u)).length, scripts: scripts.length };
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; World.start(); });
  await p.evaluate(() => UpdateCheck.check(true)); await p.waitForTimeout(800); r.sameVersionBanner = await p.evaluate(() => !!document.getElementById('mtq-update'));
  fake = 'zzzz000000'; await p.evaluate(() => UpdateCheck.check(true)); await p.waitForTimeout(800); r.newVersionBanner = await p.evaluate(() => !!document.getElementById('mtq-update'));
  await p.evaluate(() => { window.__bp = BattleUI.start(['slime']); }); await p.waitForTimeout(1500);
  const before = p.url(); await p.click('#mtq-update button[data-u="go"]'); await p.waitForTimeout(1200); r.inBattleReloaded = p.url() !== before;
  r.toast = await p.evaluate(() => [...document.querySelectorAll('.toast, #toast, .rw-toast')].map((n) => n.textContent).join('|').slice(0, 80));
  await p.evaluate(() => { const sc = BattleUI.scene; Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); BattleUI.scene = null; World.busy = false; State.data.gold = 4321; });
  await Promise.all([p.waitForNavigation({ timeout: 60000 }).catch(() => null), p.click('#mtq-update button[data-u="go"]')]);
  r.afterUrl = p.url().replace('http://localhost:8770', '');
  await p.waitForTimeout(1500); r.nonV = scripts.filter((u) => !/\?v=/.test(u)).map((u) => u.replace(/^.*\/js\//, 'js/')).slice(0, 6); r.autosavedGold = await p.evaluate(() => { try { const k = Object.keys(localStorage); return k.map((x) => { const v = localStorage.getItem(x); return x + ':' + (/4321/.test(v) ? 'gold4321' : '-'); }).join(','); } catch (e) { return 'err'; } });
  console.log(JSON.stringify(r), 'errors', errs.length, errs.slice(0, 3)); await br.close();
})();
