// v7.9.3 城の門（3D・ヘッドレス）：リヴェル城の城門・城下町の入口の門・フィールドの城下町の目印・王都セントラの宮殿の門の画像。TAG で前／後を分ける
// 使い方：/home/claude/work/p3d で bash withenv.sh node <このファイル>（PORT で配信中の 3d/index.html または index.html を開く）
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v79/'; const TAG = process.env.TAG || 'after';
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.flags.king_quest1 = true; World.start(); World.encounter = () => { }; });
  await p.waitForTimeout(1500);
  const go = async (map, x, y, dir, dist, pitch, name) => {
    await p.evaluate(([map, x, y, dir]) => { World.busy = false; World.enterMap(map, x, y, dir, { raw: true }); }, [map, x, y, dir]);
    await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && !MTQ3D.building, map, { timeout: 240000 });
    await p.evaluate(([dist, pitch]) => { MTQ3D.lighting.preview = 0.45; if (pitch) MTQ3D.camera.setPitch(pitch); MTQ3D.camera.wantDist = dist; }, [dist, pitch]); await p.waitForTimeout(3500);
    await p.screenshot({ path: SHOT + 'gate_' + name + '_' + TAG + '.jpg', type: 'jpeg', quality: 82 }); return p.evaluate(() => ({ map: World.map.id, pos: [World.player.x, World.player.y] }));
  };
  // 1) リヴェル城の城門（城下町の中・城の扉の前）
  const rc = await p.evaluate(() => { const b = MAP_DEFS.rivel_town.buildings.find((q) => q.type === 'castle'); return { x: b.x + b.doorX, y: b.y + b.h }; });
  console.log('castle', JSON.stringify(await go('rivel_town', rc.x + 3, rc.y + 6, 'up', 26, 26, 'rivel_castle')));
  // 2) 王都セントラの宮殿
  const sc = await p.evaluate(() => { const b = MAP_DEFS.sentra_capital.buildings.find((q) => q.type === 'castle'); return { x: b.x + b.doorX, y: b.y + b.h }; });
  console.log('sentra', JSON.stringify(await go('sentra_capital', sc.x + 3, sc.y + 5, 'up', 22, 26, 'sentra_palace')));
  // 3) 城下町の入口の門（南の出口の上）：出口の 3 マス北
  const ex = await p.evaluate(() => { const m = World.getMap('rivel_town'); const ws = (MAP_DEFS.rivel_town.warps || []).filter((w) => w.y >= m.h - 2); const w = ws[Math.floor(ws.length / 2)] || ws[0]; return w ? { x: w.x, y: w.y } : null; });
  if (ex) console.log('towngate', JSON.stringify(await go('rivel_town', ex.x, ex.y - 4, 'down', 15, 32, 'rivel_towngate')));
  // 4) フィールドの城下町の目印（リヴェル城下町）：南へ 3 マス
  const lm = await p.evaluate(() => { const l = MAP_DEFS.world.locations.find((q) => q.id === 'rivel_castle_town'); return { x: l.x, y: l.y }; });
  console.log('landmark', JSON.stringify(await go('world', lm.x + 3, lm.y + 3, 'left', 10, 30, 'rivel_landmark')));
  ok(!errs.length, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); await br.close(); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
