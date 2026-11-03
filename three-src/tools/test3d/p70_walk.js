// v7.0 歩いているときの主人公のまわりを撮る（謎の半円の光の確認）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = '/home/claude/work/p3d/shots/v70/walk/'; fs.mkdirSync(SHOT, { recursive: true });
const SPOTS = (process.env.SPOTS || 'poyo_village:20:14:0.35,world:60:57:0.35,poyo_village:20:14:0.9,oblivion_cave_1:3:10:0.35').split(',');
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 960, height: 600 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; ['lina', 'kyle'].forEach((id) => { try { State.addMember(id); } catch (e) { } }); World.start(); World.encounter = function () { }; });
  for (const s of SPOTS) {
    const [m, x, y, tod] = s.split(':');
    await p.evaluate(([m, x, y, tod]) => { State.data.timeOfDay = +tod; World.enterMap(m, +x, +y, 'down'); }, [m, x, y, tod]);
    await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m, m, { timeout: 120000 }); await p.waitForTimeout(1500);
    await p.screenshot({ path: SHOT + m + '_' + tod + '_idle.jpg', type: 'jpeg', quality: 70 });
    await p.keyboard.down('ArrowRight'); await p.waitForTimeout(600); await p.screenshot({ path: SHOT + m + '_' + tod + '_walk1.jpg', type: 'jpeg', quality: 70 }); await p.waitForTimeout(250); await p.screenshot({ path: SHOT + m + '_' + tod + '_walk2.jpg', type: 'jpeg', quality: 70 }); await p.keyboard.up('ArrowRight');
    await p.keyboard.down('ArrowDown'); await p.waitForTimeout(500); await p.screenshot({ path: SHOT + m + '_' + tod + '_walk3.jpg', type: 'jpeg', quality: 70 }); await p.keyboard.up('ArrowDown');
  }
  console.log('errors', errs.slice(0, 3)); await br.close();
})();
