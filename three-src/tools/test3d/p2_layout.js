// 敵・味方の並びの確認：画面に写した敵の矩形の重なり（敵どうし）と、味方の位置
//   node p2_layout.js 敵,敵 ...   （TAG を付けると画面も保存）
const { chromium } = require('playwright'); const SHOT = '/home/claude/work/p3d/shots/';
const SETS = process.argv.slice(2);
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 1100, height: 700 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && (window.MTQ3D.ready || window.MTQ3D.disabled), null, { timeout: 180000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; State.data.timeOfDay = 0.42;
    ['lina', 'kyle', 'gald'].forEach((id) => { try { State.joinCompanion(id); } catch (e) {} }); World.start(); World.enterMap('poyo_village', 24, 30, 'down'); });
  for (const set of SETS) {
    const ids = set.split(',');
    await p.evaluate((ids) => { BattleUI.start(ids); }, ids);
    await p.waitForFunction(() => BattleStage3D.actorsInfo() && BattleStage3D.actorsInfo().ready >= BattleStage3D.actorsInfo().want, null, { timeout: 240000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const sc = BattleUI.scene; const W = 800, H = 416; const n = sc.b.enemies.length; const rs = []; for (let i = 0; i < n; i++) rs.push(BattleStage3D.rect(sc, i, W, H));
      const ov = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = rs[i], b = rs[j]; if (!a || !b) continue; const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); ov.push(i + '-' + j + ':' + Math.round(100 * ix * iy / Math.min(a.w * a.h, b.w * b.h)) + '%'); }
      const pp = sc.b.party.map((a) => { const q = BattleStage3D.partyPos(sc, a.id, W, H); return q ? Math.round(q.x) + ',' + Math.round(q.y) : '-'; });
      return { rects: rs.map((q) => q ? [q.x, q.y, q.w, q.h].join(',') : '-'), ov, party: pp }; });
    console.log(set, JSON.stringify(r));
    if (process.env.TAG) await p.screenshot({ path: SHOT + process.env.TAG + '_' + ids.length + '.png', clip: { x: 20, y: 10, width: 800, height: 420 }, timeout: 180000 });
    await p.evaluate(() => { const sc = BattleUI.scene; if (sc) Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); document.querySelectorAll('.rw-list, .rw-panel, .rw-msg').forEach((n) => n.remove()); });
  }
  console.log('errors', errs); await br.close();
})();
