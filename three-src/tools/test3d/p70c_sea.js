// v7.0 3D 版：海の底の模様が透けない・海の拾い物（光・泡）が見え、船で近くを通ると拾えて消える
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = '/home/claude/work/p3d/shots/v70/sea/'; fs.mkdirSync(SHOT, { recursive: true });
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 960, height: 600 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = function () { }; d.timeOfDay = 0.35; window.__LOG = []; Win.message = (l) => { [].concat(l).forEach((x) => __LOG.push(x)); return Promise.resolve(); }; Win.toast = () => { }; });
  const built = (m) => p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && World.map.id === m, m, { timeout: 120000, polling: 200 }).then(() => true).catch(() => false);
  // 1) 港町の海（以前は水の下に石の模様が見えていた）
  await p.evaluate(() => { World.enterMap('harbor_town', 22, 31, 'down'); }); ok(await built('harbor_town'), '港町マリナ'); await p.waitForTimeout(1500);
  await p.screenshot({ path: SHOT + 'harbor.jpg', type: 'jpeg', quality: 72 });
  // 2) アルカディアの海：帆船で w1（63,7）の2マス手前へ
  await p.evaluate(() => { const d = State.data; d.vehicles = d.vehicles || {}; d.vehicles.sailboat = { owned: true, map: 'world', x: 60, y: 7, port: { map: 'world', x: 60, y: 7 } }; d.aboard = 'sailboat'; World.enterMap('world', 60, 7, 'right'); });
  ok(await built('world'), 'アルカディア（帆船）'); await p.waitForTimeout(1800);
  const s1 = await p.evaluate(() => ({ info: MTQ3D.current.seaTreasureInfo(), aboard: State.data.aboard, x: World.player.x, y: World.player.y }));
  ok(s1.info.length === 4 && s1.info.every((o) => o.visible), 'アルカディアの海の拾い物 4つが見えている ' + JSON.stringify(s1.info.map((o) => o.id)));
  await p.screenshot({ path: SHOT + 'world_before.jpg', type: 'jpeg', quality: 72 });
  await p.keyboard.down('ArrowRight'); await p.waitForFunction(() => State.data.flags.sea_w1, null, { timeout: 15000, polling: 200 }).catch(() => { }); await p.keyboard.up('ArrowRight');
  await p.waitForTimeout(800);
  const s2 = await p.evaluate(() => ({ taken: !!State.data.flags.sea_w1, potion: State.data.inventory.potion || 0, log: __LOG.slice(), vis: (MTQ3D.current.seaTreasureInfo().find((o) => o.id === 'w1') || {}).visible, aboard: State.data.aboard }));
  ok(s2.taken && s2.potion >= 3 && s2.log.some((l) => /引き上げた/.test(l)) && s2.vis === false && s2.aboard === 'sailboat', '帆船で近くを通ると引き上げ、3Dの光が消える ' + JSON.stringify(s2));
  await p.screenshot({ path: SHOT + 'world_after.jpg', type: 'jpeg', quality: 72 });
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
