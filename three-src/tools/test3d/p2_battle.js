// Phase 2：3Dのキャラクター同士の戦闘の確認（ソフトウェア描画）
//   node p2_battle.js [敵ID,敵ID ...]  … 例：slime,yosen_slime
const { chromium } = require('playwright'); const fs = require('fs');
const SHOT = '/home/claude/work/p3d/shots/'; const TAG = process.env.TAG || 'p2';
const SETS = process.argv.slice(2).length ? process.argv.slice(2) : ['slime,yosen_slime'];
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 1100, height: 700 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || /3D actors|battle creature|battle party/.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && (window.MTQ3D.ready || window.MTQ3D.disabled), null, { timeout: 180000 });
  await p.evaluate((map) => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; State.data.timeOfDay = 0.42;
    ['lina', 'kyle', 'gald'].forEach((id) => { try { State.joinCompanion(id); } catch (e) {} }); World.start(); World.enterMap(map || 'poyo_village', 24, 30, 'down'); }, process.env.MAP);
  const out = [];
  for (const set of SETS) {
    let mapId = null, ids; if (set.indexOf(':') >= 0) { [mapId, ids] = set.split(':'); ids = ids.split(','); } else ids = set.split(',');
    if (mapId) { await p.evaluate((m) => { const defs = window.MAP_DEFS; let e = null; for (const k in defs) (defs[k].warps || []).forEach((w) => { if (!e && w.to === m && k !== m) e = { x: w.tx, y: w.ty }; }); World.enterMap(m, e ? e.x : 2, e ? e.y : 2, 'down'); }, mapId); await p.waitForTimeout(1500); }
    await p.evaluate((ids) => { window.__b = BattleUI.start(ids); }, ids);
    await p.waitForFunction(() => window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo() && BattleStage3D.actorsInfo().ready >= BattleStage3D.actorsInfo().want, null, { timeout: 240000 }).catch(() => {});
    await p.waitForTimeout(2500);
    const info = await p.evaluate(() => ({ actors: BattleStage3D.actorsInfo(), stage: BattleStage3D.info(), party: State.partyActors().map((a) => a.id + ':' + a.sprite) }));
    info.place = await p.evaluate(() => BattleStage3D.info().place);
    await p.screenshot({ path: SHOT + TAG + '_' + (mapId ? mapId + '_' : '') + ids.join('_') + '_start.png', timeout: 180000 });
    // たたかう（1回）→ 命中の瞬間を撮る
    if (process.env.FIGHT) {
      await p.evaluate(() => { Engine.Input.press && Engine.Input.press('ok'); });
      await p.waitForTimeout(+process.env.FIGHT);
      await p.screenshot({ path: SHOT + TAG + '_' + ids.join('_') + '_fight.png', timeout: 180000 });
      info.after = await p.evaluate(() => BattleStage3D.actorsInfo());
    }
    // 戦闘を閉じる（次の組み合わせのため）
    await p.evaluate(() => { try { const sc = BattleUI.scene; if (sc) { Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); } document.querySelectorAll('.rw-list, .rw-panel, .rw-msg').forEach((n) => n.remove()); } catch (e) {} });
    out.push({ set, info }); console.log(JSON.stringify({ place: info.place, set, actors: info.actors && { want: info.actors.want, ready: info.actors.ready, enemies: info.actors.enemies.map((e) => e.id + '/' + e.source + '/' + (e.size ? e.size.h : '-') + '/' + e.tris), party: info.actors.party.map((q) => q.id + ':' + q.model + ':' + q.anim + ':' + q.ready) }, party: info.party }));
  }
  fs.writeFileSync('/home/claude/work/p3d/' + TAG + '_battle.json', JSON.stringify({ out, errors: errs }, null, 1)); console.log('errors', errs.length, errs.slice(0, 6)); await br.close();
})();
