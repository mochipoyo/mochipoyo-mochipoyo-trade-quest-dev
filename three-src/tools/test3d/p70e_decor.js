// v7.0 3D 版：場所ごとの個性の飾り（壁の飾り・遠景・床の小物・フィールドの飾り）を撮る・数を調べる
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = '/home/claude/work/p3d/shots/v70/decor/'; fs.mkdirSync(SHOT, { recursive: true });
const SPOTS = (process.env.SPOTS || 'tradia:40:30,node_city:20:14,magicka_city:24:16,rivel_town:30:20,harbor_town:20:20,kalion_city:24:28,tempus_city:20:14,oblivion_cave_1:4:10,kalion_archive_1:20:5,world_machine:42:84').split(',');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 960, height: 600 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' || /decor70/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = function () { }; d.timeOfDay = +(window.__TOD || 0.35); });
  if (process.env.TOD) await p.evaluate((t) => { State.data.timeOfDay = +t; }, process.env.TOD);
  for (const s of SPOTS) {
    const [m, x, y] = s.split(':');
    await p.evaluate(([m, x, y]) => { World.busy = false; const mm = World.getMap ? World.getMap(m) : null; let px = +x, py = +y; if (mm && !mm.passable(px, py, State.data)) { const f = World.nearestFree(mm, px, py); if (f) { px = f.x; py = f.y; } } World.enterMap(m, px, py, 'down'); }, [m, x, y]);
    const built = await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && World.map.id === m, m, { timeout: 120000, polling: 200 }).then(() => true).catch(() => false);
    if (!built) { ok(false, m + '：3D が組み立たない'); continue; }
    await p.waitForTimeout(1600);
    const r = await p.evaluate(() => ({ decor: MTQ3D.current.decor || null, theme: window.PLACE_DECOR ? PLACE_DECOR.forMap(World.map.id) : null }));
    ok(r.decor && r.decor.key === r.theme && !r.decor.error, m + '：テーマ ' + r.theme + ' ' + JSON.stringify(r.decor && r.decor.stats));
    await p.screenshot({ path: SHOT + (process.env.TOD ? 'n_' : '') + m + '.jpg', type: 'jpeg', quality: 72 });
  }
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
