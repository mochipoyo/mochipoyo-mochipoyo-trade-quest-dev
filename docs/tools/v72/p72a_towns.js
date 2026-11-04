// v7.2 3D 版：広げた町（新しい地区の塔・噴水の広場・リヴェルの堀と跳ね橋）と、足した上の階が組み立つか。SPOTS="map:x:y,..."
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = '/home/claude/work/p3d/shots/v72/'; fs.mkdirSync(SHOT, { recursive: true });
const SPOTS = (process.env.SPOTS || 'rivel_town:31:17,rivel_town:74:30,rivel_town:80:9,harbor_town:63:16,sentra_capital:59:20,frost_town:51:17,tradia:59:22,rivel_town_x72_tower_3f:3:5,rivel_castle_4f:3:5,rivel_inn_x72_2f:5:4,magicka_palace_3f:3:5').split(',');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 960, height: 600 } })).newPage(); const errs = [], warns = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'warning' && /tower72|decor|modern|Error/.test(m.text())) warns.push(m.text()); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = () => {}; });
  for (const s of SPOTS) {
    const [m, x, y] = s.split(':'); const t0 = Date.now();
    await p.evaluate(([m, x, y]) => { World.busy = false; World.enterMap(m, +x, +y, 'up'); }, [m, x, y]);
    const built = await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && World.map.id === m, m, { timeout: 180000, polling: 200 }).then(() => true).catch(() => false);
    if (!built) { ok(false, m + '：3D が組み立たない'); continue; }
    await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { let towers = 0; const sc = MTQ3D.current.scene || (MTQ3D.renderer && MTQ3D.scene); const root = MTQ3D.current.root || MTQ3D.current.group || sc; if (root && root.traverse) root.traverse((o) => { if (/^tower72_/.test(o.name)) towers++; }); return { w: World.map.w, h: World.map.h, towers, nb: World.map.buildings.filter((b) => b.v72).length }; });
    ok(true, m + '：組み立て ' + (Date.now() - t0) + 'ms・' + r.w + '×' + r.h + (r.nb ? '・新しい地区の建物 ' + r.nb + '・3D の塔 ' + r.towers : ''));
    await p.screenshot({ path: SHOT + m + '_' + x + '_' + y + '.jpg', type: 'jpeg', quality: 72 });
  }
  ok(errs.length === 0 && warns.length === 0, 'ページのエラー・組み立ての警告なし ' + JSON.stringify(errs.concat(warns).slice(0, 3)));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
