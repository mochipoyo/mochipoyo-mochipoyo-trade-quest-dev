// 1ターンの流れを、ゲームの画面（#game の canvas）から短い間隔で写す（Playwright の撮影より速い）
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = '/home/claude/work/p3d/shots/'; const TAG = process.env.TAG || 'frames';
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 1100, height: 700 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 180000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; State.data.hero.level = 3; ['lina'].forEach((id) => State.joinCompanion(id)); World.start(); World.enterMap('poyo_village', 24, 30, 'down'); MTQ3D.paused = true; });
  await p.evaluate(() => { window.__b = BattleUI.start(['wolf']); });
  await p.waitForFunction(() => window.BattleStage3D && BattleStage3D.actorsInfo() && BattleStage3D.actorsInfo().ready >= BattleStage3D.actorsInfo().want, null, { timeout: 240000 });
  await p.waitForTimeout(1500);
  // 主人公：たたかう → 対象、リーナ：たたかう → 対象
  for (let k = 0; k < 2; k++) { await p.evaluate(() => Engine.Input.press('ok')); await p.waitForTimeout(500); await p.evaluate(() => Engine.Input.press('ok')); await p.waitForTimeout(500); }
  const shots = await p.evaluate(async () => { const out = []; const c = document.getElementById('game'); const t0 = performance.now(); while (performance.now() - t0 < 5000) { await new Promise((r) => setTimeout(r, 140)); out.push({ t: Math.round(performance.now() - t0), url: c.toDataURL('image/jpeg', 0.7), info: BattleStage3D.actorsInfo().party.map((x) => x.anim).join(',') }); } return out; });
  shots.forEach((s, i) => fs.writeFileSync(OUT + TAG + '_' + String(i).padStart(2, '0') + '.jpg', Buffer.from(s.url.split(',')[1], 'base64')));
  console.log(shots.map((s, i) => i + ':' + s.t + ':' + s.info).join(' | ')); console.log('errors', errs); await br.close();
})();
