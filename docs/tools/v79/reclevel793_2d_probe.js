// v7.9.3 推奨レベル（2D 版・ヘッドレス）：画面の上の表示と地名のとなりの表示の画像
// 使い方：/home/claude/work/p3d で bash withenv.sh node <このファイル>（PORT で配信中の 3d/index.html または index.html を開く）
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v79/';
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForFunction(() => window.World && window.State && window.Engine, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = () => { }; const m = World.getMap('world'); const L = m.def.locations.find((l) => l.id === 'oblivion_cave'); World.enterMap('world', L.x, L.y + 2, 'down', { raw: true }); });
  await p.waitForTimeout(900); const t = await p.evaluate(() => ({ b: (document.getElementById('rec-banner') || {}).textContent, h: (document.querySelector('#hud .hud-rec') || {}).textContent }));
  await p.screenshot({ path: SHOT + 'reclevel_2d.jpg', type: 'jpeg', quality: 82 }); console.log(JSON.stringify(t), 'errs', errs.slice(0, 2).join(' / ')); await br.close();
})();
