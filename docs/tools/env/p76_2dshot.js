// 2D版で、決めた場所に立って撮る（SPOTS：[{map,x,y,dir,name}]）
const { chromium } = require('playwright'); const fs = require('fs'); const PORT = process.env.PORT || 8772; const OUT = '/home/claude/work/p3d/shots/v76/' + (process.env.TAG || '2d') + '/'; fs.mkdirSync(OUT, { recursive: true });
const SPOTS = JSON.parse(process.env.SPOTS || '[]'); const errs = [];
(async () => { const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1100, height: 760 } }); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForFunction(() => window.World && window.State && window.MAP_DEFS, null, { timeout: 120000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; World.start(); World.encounter = () => { }; });
  await p.waitForTimeout(1200);
  for (const s of SPOTS) { await p.evaluate((s) => { World.busy = false; World.enterMap(s.map, s.x, s.y, s.dir || 'up', { raw: true }); }, s); await p.waitForTimeout(1200); await p.screenshot({ path: OUT + s.map + '_' + (s.name || '') + '.png' }); }
  console.log('ページのエラー', errs.length, JSON.stringify(errs.slice(0, 3))); await br.close(); })().catch((e) => { console.log('例外', e.message); process.exit(1); });
