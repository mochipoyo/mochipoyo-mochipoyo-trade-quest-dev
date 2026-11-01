// Phase 2：3Dの動きと2D版の命中の同期をまとめて測る（オート戦闘で何戦か。画面は撮らない＝描画の詰まりを減らす）
// 注意：ソフトウェア描画（SwiftShader）なのでフレームが粗く、測った「ずれ」にはフレームの間隔が含まれる（実機の値ではない）
const { chromium } = require('playwright'); const fs = require('fs');
const SETS = (process.argv[2] || 'wolf;slime,yosen_slime;harpy,rabbit').split(';');
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 900, height: 600 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || /3D actors/.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && (window.MTQ3D.ready || window.MTQ3D.disabled), null, { timeout: 180000 });
  await p.evaluate((LV) => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; State.data.hero.level = +LV; ['lina', 'kyle'].forEach((id) => State.joinCompanion(id)); MTQ3D.paused = true; State.data.settings.autoBattle = true; World.start(); World.enterMap('poyo_village', 24, 30, 'down'); }, process.env.LV || 8);
  const all = []; const frames = [];
  for (const set of SETS) {
    await p.evaluate((ids) => { window.__done = false; BattleUI.start(ids).then(() => { window.__done = true; }); }, set.split(','));
    const tStart = Date.now(); while (!(await p.evaluate(() => window.__done)) && Date.now() - tStart < 420000) { await p.waitForTimeout(1500); const v = await p.evaluate(() => { const s = BattleUI.scene; return !!(s && s.victory >= 0) || !!document.querySelector('.result-victory'); }); if (v) await p.evaluate(() => Engine.Input.press('ok')); }
    if (!(await p.evaluate(() => window.__done))) errs.push('battle timeout ' + set);
    const r = await p.evaluate(() => { const a = BattleStage3D.actorsInfo(); return { sync: a ? a.sync : [], party: a ? a.party.map((x) => x.id + ':' + x.anim) : [], fps: MTQ3D.fps }; });
    all.push({ set, n: r.sync.length, sync: r.sync, party: r.party }); frames.push(r.fps);
    // 戦闘のあと：探索に戻れているか
    await p.waitForTimeout(800); const back = await p.evaluate(() => ({ top: Engine.top() === World.scene, map: World.map.id })); all[all.length - 1].back = back;
  }
  const errsMs = all.flatMap((x) => x.sync.map((s) => s.errMs)); const abs = errsMs.map(Math.abs).sort((a, b) => a - b);
  const sum = { battles: all.length, hits: errsMs.length, medianAbsMs: abs[Math.floor(abs.length / 2)] || null, p90AbsMs: abs[Math.floor(abs.length * 0.9)] || null, maxAbsMs: abs[abs.length - 1] || null, softwareFps: frames };
  fs.writeFileSync('/home/claude/work/p3d/p2_sync.json', JSON.stringify({ sum, all, errors: errs }, null, 1));
  console.log(JSON.stringify(sum), '\n', JSON.stringify(all.map((x) => ({ set: x.set, n: x.n, back: x.back, sample: x.sync.slice(0, 6) })))); console.log('errors', errs.length, errs.slice(0, 5)); await br.close();
})();
