// v7.8：地球の世界の地図の画像（全体図の「地域の地図」＝地形・「世界」＝絵の地図）。ヘッドレス・低画質
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v78/';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready', 'kalion_open', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived', 'dark_route_open'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = () => { }; });
  await p.waitForTimeout(2500);
  await p.evaluate(() => { Minimap.openBig(); Minimap.setMode('world'); }); await p.waitForTimeout(2500);
  await p.screenshot({ path: SHOT + 'map_terrain.jpg', type: 'jpeg', quality: 82, timeout: 120000 });
  // 全体を見る（「全体」ボタン）
  await p.evaluate(() => { const b = [...document.querySelectorAll('#bigmap button')].find((x) => /全体/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(2000);
  await p.screenshot({ path: SHOT + 'map_terrain_all.jpg', type: 'jpeg', quality: 82, timeout: 120000 });
  await p.evaluate(() => Minimap.setMode('globe')); await p.waitForTimeout(3000);
  await p.screenshot({ path: SHOT + 'map_globe.jpg', type: 'jpeg', quality: 82, timeout: 120000 });
  const info = await p.evaluate(() => ({ title: (document.getElementById('bm-title') || {}).textContent, mode: Minimap.mode }));
  console.log('INFO ' + JSON.stringify(info));
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
