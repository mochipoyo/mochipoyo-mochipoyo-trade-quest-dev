// v7.0 2D 版：階段・出入口の目印、海の拾い物のきらめきを撮る
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = '/home/claude/work/p3d/shots/v70/2d/'; fs.mkdirSync(SHOT, { recursive: true });
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 960, height: 640 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForFunction(() => window.World && window.State && window.Engine, null, { timeout: 60000 });
  await p.waitForTimeout(800);
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = function () { }; d.timeOfDay = 0.35; });
  for (const [m, x, y, aboard] of [['kalion_archive_1', 22, 10], ['oblivion_cave_1', 24, 2], ['rivel_castle', 4, 23], ['world', 61, 7, 'sailboat']]) {
    await p.evaluate(([m, x, y, aboard]) => { const d = State.data; if (aboard) { d.vehicles = d.vehicles || {}; d.vehicles[aboard] = { owned: true, map: m, x, y, port: { map: m, x, y } }; d.aboard = aboard; } else d.aboard = null; World.busy = false; World.enterMap(m, x, y, 'down'); }, [m, x, y, aboard]);
    await p.waitForTimeout(900); await p.screenshot({ path: SHOT + m + '.png' });
  }
  console.log('errors', errs.slice(0, 3)); await br.close();
})();
