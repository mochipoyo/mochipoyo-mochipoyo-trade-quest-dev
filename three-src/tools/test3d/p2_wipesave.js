// 全滅のあと（宿へ戻る前のメッセージの間）に自動セーブされている中身：味方の HP。続けて「つづきから」で読み込み、次の戦闘がどうなるか（PAGE=3d|2d）
const { chromium, devices } = require('playwright');
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 1 })); let p = await ctx.newPage(); const errs = [], cons = [];
  const hook = (pg) => { pg.on('pageerror', e => errs.push('pageerror: ' + e.message)); pg.on('console', m => { if (m.type() === 'error') cons.push(m.text().slice(0, 300)); }); };
  hook(p); await ctx.addInitScript(() => { window.addEventListener('unhandledrejection', (e) => { console.error('UNHANDLED: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)); }); });
  const url = process.env.PAGE === '2d' ? 'http://localhost:8770/index.html' : 'http://localhost:8770/3d/index.html';
  await p.goto(url); await p.waitForFunction(() => window.World && window.BattleUI && window.State, null, { timeout: 240000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('まち', 'warrior'); State.data.settings.textSpeed = 'instant'; State.data.settings.battleSpeed = 'fast'; ['lina', 'kyle'].forEach((id) => State.joinCompanion(id)); World.start(); World.enterMap('world', 60, 60, 'down'); });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { State.partyActors().forEach((a) => { a.hp = 1; }); State.data.settings.autoBattle = true; World.startBattle(['boss_valen']); });
  await p.waitForFunction(() => document.querySelector('.rw-msg'), null, { timeout: 120000 });   // 全滅のメッセージ（宿へ戻る前）
  const saved = await p.evaluate(() => { const d = State.load(0); return d ? { map: d.pos && d.pos.map, party: d.party.map((id) => { const a = id === 'hero' ? d.hero : (d.companions && d.companions[id]) || {}; return id + ':' + a.hp + (a.dead ? '(dead)' : ''); }) } : null; });
  console.log('全滅のメッセージの間の自動セーブ', JSON.stringify(saved));
  // ここでページを読み込み直す（スマホのブラウザがタブを読み込み直したのと同じ）→ つづきから
  await p.reload(); await p.waitForFunction(() => window.World && window.BattleUI && window.State, null, { timeout: 240000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.data = State.load(0); State.data.settings.textSpeed = 'instant'; State.data.settings.autoBattle = true; World.start(); const q = State.data.pos; World.enterMap(q.map, q.x, q.y, q.dir || 'down'); });
  await p.waitForTimeout(1500);
  const hp = await p.evaluate(() => State.partyActors().map((a) => a.id + ':' + a.hp + (a.dead ? '(dead)' : '')));
  await p.evaluate(() => { window.__r = 'pending'; World.startBattle(['yosen_slime']).then((r) => { window.__r = r; }).catch((e) => { window.__r = 'error ' + e.message; }); });
  for (let k = 0; k < 25; k++) { await p.waitForTimeout(1000); if (await p.$('.rw-msg')) await p.evaluate(() => Engine.Input.press('ok')); }
  const s = await p.evaluate(() => ({ r: window.__r, inBattle: !!(BattleUI.scene && Engine.scenes.indexOf(BattleUI.scene) >= 0), msg: document.getElementById('battle-msg').textContent, hp: State.partyActors().map((a) => a.hp).join(','), map: World.map && World.map.id }));
  console.log('読み込み直した後の味方', JSON.stringify(hp)); console.log('次の戦闘', JSON.stringify(s)); console.log('console', cons.slice(0, 4)); console.log('errors', errs.slice(0, 4)); await br.close();
})();
