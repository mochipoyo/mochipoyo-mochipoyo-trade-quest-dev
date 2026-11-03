// v7.0 3D 版：階段（下り・上り）とダンジョンの出入口の目印を撮る・数を調べる。SPOTS="map:x:y,..."（x,y は立つ場所）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = '/home/claude/work/p3d/shots/v70/marks/'; fs.mkdirSync(SHOT, { recursive: true });
const SPOTS = (process.env.SPOTS || 'kalion_archive_1:23:10,kalion_archive_1:3:2,oblivion_cave_1:25:3,oblivion_cave_2:3:2,temple_of_time_1:5:10,rivel_castle:5:22').split(',');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 960, height: 600 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = function () { }; d.timeOfDay = 0.35; });
  for (const s of SPOTS) {
    const [m, x, y] = s.split(':');
    await p.evaluate(([m, x, y]) => { World.busy = false; World.enterMap(m, +x, +y, 'down'); }, [m, x, y]);
    const built = await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && World.map.id === m, m, { timeout: 120000, polling: 200 }).then(() => true).catch(() => false);
    if (!built) { ok(false, m + '：3D が組み立たない'); continue; }
    await p.waitForTimeout(1800);
    const r = await p.evaluate(() => ({ list: WarpMark.list(World.map).map((o) => o.label + '@' + o.x + ',' + o.y), info: MTQ3D.current.warpMarkInfo ? MTQ3D.current.warpMarkInfo() : null }));
    ok(r.info && r.info.length === r.list.length, m + '：3D の目印 ' + (r.info ? r.info.length : '-') + ' 個＝2D の一覧 ' + r.list.length + ' 個（' + r.list.join(' / ') + '）');
    await p.screenshot({ path: SHOT + m + '_' + x + '_' + y + '.jpg', type: 'jpeg', quality: 72 });
  }
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
