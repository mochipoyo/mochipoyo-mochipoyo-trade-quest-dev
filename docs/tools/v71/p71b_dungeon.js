// v7.1 3D 版：作り直したダンジョン（2倍の地図）が組み立つか・目印の数・立つ場所・組み立ての時間。SPOTS="map:旧x:旧y,..."（旧座標で入る）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = '/home/claude/work/p3d/shots/v71/dungeon/'; fs.mkdirSync(SHOT, { recursive: true });
const SPOTS = (process.env.SPOTS || 'lost_forest:15:15,oblivion_cave_1:24:12,oblivion_cave_2:12:5,oblivion_cave_3:12:10,emal_pass:3:5,iron_mine_2:10:8,kalion_archive_1:6:6,spirit_forest_1:3:15,dragon_vein_1:3:14,demon_castle_1:9:12').split(',');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 960, height: 600 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = () => {}; });
  for (const s of SPOTS) {
    const [m, x, y] = s.split(':');
    const t0 = Date.now();
    await p.evaluate(([m, x, y]) => { World.busy = false; World.enterMap(m, +x, +y, 'up'); }, [m, x, y]);
    const built = await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && World.map.id === m, m, { timeout: 180000, polling: 200 }).then(() => true).catch(() => false);
    if (!built) { ok(false, m + '：3D が組み立たない'); continue; }
    const ms = Date.now() - t0; await p.waitForTimeout(1500);
    const r = await p.evaluate(([x0, y0]) => ({ w: World.map.w, h: World.map.h, px: World.player.x, py: World.player.y, rm: !!(World.map.def.remake71), solid0: (() => { const R = World.map.def.remake71; const ch = R && R.oldRows[+y0] && R.oldRows[+y0][+x0]; return !!(ch && Tiles.isSolid(Tiles.byChar[ch] || 'grass')); })(), list: WarpMark.list(World.map).length, info: MTQ3D.current.warpMarkInfo ? MTQ3D.current.warpMarkInfo().length : -1, decor: MTQ3D.current.decor ? MTQ3D.current.decor.stats : null }), [x, y]);
    ok(r.rm && Math.abs(r.px - x * 2) + Math.abs(r.py - y * 2) <= (r.solid0 ? 8 : 0), m + '：作り直した地図 ' + r.w + '×' + r.h + '・旧 (' + x + ',' + y + ') → (' + r.px + ',' + r.py + ')' + (r.solid0 ? '（元の地図でも通れないマスなので、近くの歩けるマスへ）' : ''));
    ok(r.info === r.list, m + '：3D の目印 ' + r.info + '＝2D の一覧 ' + r.list + '・組み立て ' + ms + 'ms（ヘッドレス・ソフトウェア描画）' + (r.decor ? '・飾り ' + JSON.stringify(r.decor) : ''));
    await p.screenshot({ path: SHOT + m + '.jpg', type: 'jpeg', quality: 72 });
  }
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
