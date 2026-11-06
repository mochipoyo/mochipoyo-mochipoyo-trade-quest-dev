// v7.8：3D設定の「世界のつながり」に 3 つの選び方（未来の地球・v7.6 の配置・地域ごと）が出る（ヘッドレス・低画質）
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v78/';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); });
  await p.waitForTimeout(1500);
  const opened = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /3D設定/.test(x.textContent)); if (b) b.click(); return !!b; }); await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const bs = [...document.querySelectorAll('[data-join]')]; const vis = bs.filter((b) => b.offsetParent !== null); return { n: bs.length, vis: vis.length, labels: bs.map((b) => b.dataset.join + ':' + b.textContent.slice(0, 18) + (b.classList.contains('on') ? '（選択中）' : '')), setting: World76.setting(), earth: World76.earth }; });
  ok(opened && r.n === 3 && r.vis === 3 && r.labels.some((l) => /^on:.*（選択中）/.test(l)), '3D設定の「世界のつながり」に 3 つ（今は「未来の地球」） ' + JSON.stringify(r));
  const el = await p.$('[data-join="v76"]'); if (el) { await el.scrollIntoViewIfNeeded(); } await p.waitForTimeout(300);
  await p.screenshot({ path: SHOT + 'settings_join.jpg', type: 'jpeg', quality: 80, timeout: 120000 });
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
