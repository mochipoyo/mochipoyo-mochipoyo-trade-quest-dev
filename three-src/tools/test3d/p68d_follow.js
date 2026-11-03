// v6.8 フィールド・町を歩くときの仲間（ついて歩く仲間）と、仲間になる前の仲間の NPC：3D版で本人の歩行用GLBで表示されるか
// 作業用のフォルダ（CommonJS）にコピーして実行する。環境変数 DEV・LAND・TAG・SHOTDIR・PORT
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = process.env.SHOTDIR || '/home/claude/work/p3d/shots/v68d/'; fs.mkdirSync(SHOT, { recursive: true }); const TAG = process.env.TAG || 'pc';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); let ctxOpt = { viewport: { width: 1280, height: 720 } };
  if (process.env.DEV) { const dv = Object.assign({}, devices[process.env.DEV], { deviceScaleFactor: 1 }); if (process.env.LAND) dv.viewport = { width: dv.viewport.height, height: dv.viewport.width }; ctxOpt = dv; }
  const p = await (await br.newContext(ctxOpt)).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  const bad = []; p.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().replace(/^.*\/assets\//, 'assets/')); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`);
  await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  const party = ['lina', 'kazuto', 'mochipoyo'];
  await p.evaluate((party) => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.hero.level = 30; party.forEach((id) => State.joinCompanion(id)); World.start(); World.busy = false; World.enterMap('harbor_town', 20, 4, 'down'); }, party);
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === 'harbor_town', null, { timeout: 90000 }).catch(() => { });
  // 数歩あるく（ついて歩く仲間が並ぶ）
  for (let i = 0; i < 4; i++) { await p.evaluate(() => { World.busy = false; World.tryMove('down'); }); await p.waitForTimeout(450); }
  await p.waitForTimeout(1500);
  const fi = await p.evaluate(() => ({ party: State.data.party.slice(), f: MTQ3D.followerInfo(), names: MTQ3D.followers ? [...MTQ3D.followers.values()].map((e) => e.ch && e.ch.root && e.ch.root.name) : [] }));
  console.log(JSON.stringify(fi));
  const inParty = fi.party.filter((id) => id !== 'hero');
  ok(inParty.length >= 1 && inParty.every((id) => fi.f.some((x) => x.id === id && x.model === 'field_' + id)), 'ついて歩く仲間はすべて本人の3Dモデル（field_ID）：' + fi.f.map((x) => x.id + '=' + x.model).join(' '));
  ok(fi.f.filter((x) => x.visible).length >= 1, '仲間が画面に出ている（visible）：' + fi.f.filter((x) => x.visible).map((x) => x.id).join(','));
  const verifiedMeshes = await p.evaluate(() => Array.from(MTQ3D.followers.values()).filter(e => e.ch && e.ch.root.visible).every(e => {
    let skin = false, sprite = false;
    e.ch.model.traverse(o => { skin ||= !!o.isSkinnedMesh; sprite ||= !!o.isSprite; });
    return skin && !sprite && ['Idle', 'Walk', 'Run'].every(k => e.ch.has(k));
  }));
  ok(verifiedMeshes, '表示中の仲間は待機・歩行・走行付きの立体モデル');
  ok(fi.names.every((n) => /^char_field_/.test(n)), '移動用GLBのルート ' + fi.names.join(','));
  await p.screenshot({ path: SHOT + TAG + '_follow_harbor.jpg', type: 'jpeg', quality: 78 });
  // フィールド
  await p.evaluate(() => { World.busy = false; World.enterMap('world', 28, 62, 'up'); });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === 'world', null, { timeout: 90000 }).catch(() => { });
  for (let i = 0; i < 4; i++) { await p.evaluate(() => { World.busy = false; World.tryMove('right'); }); await p.waitForTimeout(450); }
  await p.waitForTimeout(1500);
  const fw = await p.evaluate(() => MTQ3D.followerInfo());
  ok(fw.length >= 1 && fw.every((x) => x.model === 'field_' + x.id), 'フィールドでも本人の3Dモデル：' + fw.map((x) => x.id + '=' + x.model + (x.visible ? '' : '(非表示)')).join(' '));
  await p.screenshot({ path: SHOT + TAG + '_follow_world.jpg', type: 'jpeg', quality: 78 });
  // 仲間になる前の仲間の NPC（リヴェルの酒場のカイル）
  await p.evaluate(() => { World.busy = false; World.enterMap('rivel_tavern', 5, 7, 'up'); });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === 'rivel_tavern', null, { timeout: 90000 }).catch(() => { });
  await p.waitForTimeout(2500);
  const nk = await p.evaluate(() => { const names = []; MTQ3D.current.root.traverse((o) => { if (/^char_field_/.test(o.name)) names.push(o.name); }); const n = World.map.npcs.find((x) => x.id === 'kyle'); return { names, actorArt: n && n.actorArt, hidden: n && n.hidden }; });
  ok(nk.names.includes('char_field_kyle'), 'リヴェルの酒場のカイル（仲間になる前）も本人の3Dモデル ' + JSON.stringify(nk));
  await p.screenshot({ path: SHOT + TAG + '_npc_kyle.jpg', type: 'jpeg', quality: 78 });
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  ok(bad.length === 0, '読み込みの失敗なし ' + JSON.stringify(bad.slice(0, 5)));
  fs.writeFileSync(SHOT + TAG + '_result.json', JSON.stringify({ fi, fw, nk, fails, errs, bad }, null, 1));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})();
