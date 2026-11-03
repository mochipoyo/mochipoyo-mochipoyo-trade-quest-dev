// v7.1 3D 版：トレディアのエレベーター（乗る → 上昇の演出 → 空の区画 → 地上へ）と空の区画の見た目
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = '/home/claude/work/p3d/shots/v71/'; fs.mkdirSync(SHOT, { recursive: true });
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 960, height: 600 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = function () { }; d.timeOfDay = 0.4; Win.choice = () => Promise.resolve(0); Win.message = () => Promise.resolve(); });
  const built = (m) => p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && World.map.id === m, m, { timeout: 120000, polling: 200 }).then(() => true).catch(() => false);
  await p.evaluate(() => World.enterMap('tradia', 16, 36, 'up')); ok(await built('tradia'), 'トレディア'); await p.waitForTimeout(1500);
  await p.screenshot({ path: SHOT + 'tradia_elevator.jpg', type: 'jpeg', quality: 74 });
  await p.evaluate(() => { window.__rideMax = 0; const o = MTQ3D.updateRide.bind(MTQ3D); MTQ3D.updateRide = function () { o(); window.__rideMax = Math.max(window.__rideMax, MTQ3D.rideY || 0); }; });   // ヘッドレスの描画は1コマが遅いので、一番高く上がった値を記録して確かめる
  await p.keyboard.down('ArrowUp'); await p.waitForFunction(() => World.busy, null, { timeout: 15000, polling: 100 }).catch(() => { }); await p.keyboard.up('ArrowUp');
  const mid = await p.waitForFunction(() => (window.__rideMax || 0) > 6, null, { timeout: 15000, polling: 50 }).then(() => true).catch(() => false);
  await p.screenshot({ path: SHOT + 'ride_up.jpg', type: 'jpeg', quality: 74 }); ok(mid, '上昇の演出：主人公（かご）が上へ動く');
  ok(await built('tradia_sky'), '空の区画に着く'); await p.waitForFunction(() => !World.busy && !(MTQ3D.rideY), null, { timeout: 15000, polling: 100 }).catch(() => { });
  const at = await p.evaluate(() => ({ x: World.player.x, y: World.player.y, rideY: MTQ3D.rideY || 0, cab: !!(MTQ3D.rideCab && MTQ3D.rideCab.visible) }));
  ok(at.x === 19 && at.y === 19 && at.rideY === 0 && !at.cab, '着いたあと：位置（19,19）・高さは元どおり・かごは消える ' + JSON.stringify(at));
  await p.waitForTimeout(1200); await p.screenshot({ path: SHOT + 'sky_plaza.jpg', type: 'jpeg', quality: 74 });
  for (const [x, y, n] of [[28, 16, 'sky_garden'], [19, 25, 'sky_deck'], [9, 10, 'sky_exchange_front']]) { await p.evaluate(([x, y]) => { World.busy = false; World.enterMap('tradia_sky', x, y, 'down'); }, [x, y]); await p.waitForTimeout(1500); await p.screenshot({ path: SHOT + n + '.jpg', type: 'jpeg', quality: 74 }); }
  await p.evaluate(() => { World.busy = false; World.enterMap('tradia_sky', 19, 19, 'up'); }); await p.waitForTimeout(800);
  await p.keyboard.down('ArrowUp'); await p.waitForFunction(() => World.busy, null, { timeout: 15000, polling: 100 }).catch(() => { }); await p.keyboard.up('ArrowUp');
  ok(await built('tradia'), '空の区画のエレベーター → 地上へ'); await p.waitForFunction(() => !World.busy, null, { timeout: 15000, polling: 100 }).catch(() => { });
  ok((await p.evaluate(() => World.player.x === 16 && World.player.y === 36 && !(MTQ3D.rideY))), '地上のエレベーターの前に着く');
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
