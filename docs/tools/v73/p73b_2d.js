// v7.3 2D 版の見た目の確認：本棚・台所・トイレ・動物・個性的な人・新しい地区。SPOTS="map:x:y,..."
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = '/home/claude/work/v73/shots2d/'; fs.mkdirSync(SHOT, { recursive: true });
const SPOTS = (process.env.SPOTS || 'tradia_house:12:4,harbor_house:12:4,poyo_village:30:20,rivel_town:76:28,tradia_iq73:5:5,sahar_city:52:15,dow_village:55:18').split(',');
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: 1 })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForFunction(() => window.World && window.State && window.Engine, null, { timeout: 120000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = () => {}; });
  for (const s of SPOTS) { const [m, x, y] = s.split(':'); await p.evaluate(([m, x, y]) => { World.busy = false; World.enterMap(m, +x, +y, 'down'); }, [m, x, y]); await p.waitForTimeout(1200); await p.screenshot({ path: SHOT + m + '.png' }); console.log('shot', m); }
  // 動物の絵（拡大）
  await p.evaluate(() => { const c = document.createElement('canvas'); c.id = 'zoo'; c.width = 8 * 4 * 40; c.height = 2 * 40 + 20; c.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#7cb860;image-rendering:pixelated'; document.body.appendChild(c); const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    AnimalArt.KINDS.forEach((k, i) => ['down', 'right', 'up', 'left'].forEach((d, j) => [0, 1].forEach((f) => { const im = AnimalArt.frame('animal_' + k, d, f); g.drawImage(im, (i * 4 + j) * 40, f * 40, 40 * im.width / im.height, 40); }))); });
  await p.screenshot({ path: SHOT + 'animals_zoo.png', clip: { x: 0, y: 0, width: 960, height: 100 } });
  console.log('errors', JSON.stringify(errs.slice(0, 3))); await br.close();
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
