// v6.6 戦闘背景の画像（14種＋山岳）：場所ごとに戦闘を始めて撮る。2D版・3D版、PC・スマホ縦・横（ソフトウェア描画。実機の画質・速さではない）
//   PAGE=2d|3d VIEW=pc|port|land node p2_battlebg.js [ケース名 ...]
//   SLOW=ミリ秒：画像の応答を遅らせる（低速回線の再現）  BLOCK=1：画像を 404 にする（読めないときの代わり）
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PAGE = process.env.PAGE || '2d', VIEW = process.env.VIEW || 'pc', TAG = process.env.TAG || (PAGE + '_' + VIEW);
const SHOT = '/home/claude/work/p3d/shots/bg/'; fs.mkdirSync(SHOT, { recursive: true });
const CASES = [
  ['grassland', 'world', {}], ['grassland_night', 'world', { night: 1 }], ['forest', 'world', { zone: '森' }], ['cave', 'oblivion_cave_1', {}], ['castle', 'temple_of_time_1', {}],
  ['mine', 'iron_mine_1', {}], ['harbor', 'pirate_nest', {}], ['sea', 'world', { aboard: 1 }], ['sea_reef', 'sunken_reef_1', {}], ['desert', 'world_desert', {}], ['desert_sand', 'world_desert', { weather: 'sand' }],
  ['snow', 'world_snow', {}], ['snow_night', 'world_snow', { night: 1, weather: 'snow' }], ['volcano', 'world_dragon', {}], ['magic_city', 'world_magicka', {}], ['machine_city', 'world_machine', {}],
  ['sky', 'world_sky', {}], ['dark', 'world_dark', {}], ['mountain', 'emal_pass', {}], ['grania_pass', 'grania_pass', {}], ['rain', 'world_islands', { weather: 'rain' }],
  ['boss_cave', 'oblivion_cave_1', { boss: 'boss_greed_golem' }], ['boss_castle', 'temple_of_time_1', { boss: 'boss_lost_trend' }], ['grania_field', 'world_grania', {}]
];
const ONLY = process.argv.slice(2);
(async () => {
  const br = await chromium.launch(); const errs = []; const out = [];
  const dev = VIEW === 'pc' ? { viewport: { width: 1280, height: 720 } } : Object.assign({}, devices[VIEW === 'port' ? 'iPhone 13' : 'iPhone 13 landscape'], { deviceScaleFactor: 1 });
  const ctx = await br.newContext(dev); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' || /戦闘背景/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  if (process.env.SLOW || process.env.BLOCK) await p.route('**/battle-backgrounds/*.webp', async (r) => { if (process.env.BLOCK) return r.fulfill({ status: 404, body: 'nf' }); await new Promise((ok) => setTimeout(ok, +process.env.SLOW)); r.continue(); });
  await p.goto(`http://localhost:8770/${PAGE === '3d' ? '3d/' : ''}index.html${process.env.QUERY || ''}`);
  if (PAGE === '3d') await p.waitForFunction(() => window.MTQ3D && (window.MTQ3D.ready || window.MTQ3D.disabled), null, { timeout: 240000 });
  else await p.waitForFunction(() => window.State && window.BattleUI && window.World && window.Engine && Engine.scenes && Engine.scenes.length, null, { timeout: 60000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; ['lina', 'kyle', 'gald'].forEach((id) => { try { State.joinCompanion(id); } catch (e) { } }); World.start(); });
  for (const [name, map, o] of CASES) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    const t0 = Date.now();
    const r = await p.evaluate(async ([map, o]) => {
      const defs = MAP_DEFS; let e = null;
      if (defs[map].kind === 'field') { const L = (defs[map].locations || [])[0]; e = L ? { x: L.x, y: L.y + 3 } : { x: 10, y: 10 }; }
      else for (const k in defs) (defs[k].warps || []).forEach((w) => { if (!e && w.to === map && k !== map) e = { x: w.tx, y: w.ty }; });
      World.busy = false; World.enterMap(map, e ? e.x : 2, e ? e.y : 2, 'down');
      State.data.timeOfDay = o.night ? 0.02 : 0.42; State.data.aboard = o.aboard ? 'sailboat' : null;
      if (o.weather) { for (let s = 0; s < 400; s++) { State.data.steps = s; const inf = BattleBG65.infoFor(null, { zone: o.zone }); if (inf.weather === o.weather) break; } }
      const ids = o.boss ? [o.boss] : ['slime', 'slime'];
      window.__bp = BattleUI.start(ids, { zone: o.zone, boss: !!o.boss });
      await new Promise((ok) => setTimeout(ok, 50)); const sc = BattleUI.scene; return { info: sc && sc.bg65, key: sc && sc.bg65 && BattleBG65.photoKey(sc.bg65) };
    }, [map, o]);
    if (process.env.EARLY) { await p.waitForTimeout(+process.env.EARLY); const ea = await p.evaluate(() => { const sc = BattleUI.scene; return { hasPhoto: !!(sc && sc.bg65 && BattleBG65.hasPhoto(sc.bg65)), bgPhoto: !!(sc && sc.bg && sc.bg._photo), bgDrawn: !!(sc && sc.bg) }; }); await p.screenshot({ path: SHOT + TAG + '_' + name + '_early.jpg', type: 'jpeg', quality: 78, timeout: 180000 }); r.early = ea; }
    let loaded = false; try { await p.waitForFunction(() => { const sc = BattleUI.scene; return sc && sc.bg65 && BattleBG65.hasPhoto(sc.bg65); }, null, { timeout: +(process.env.WAIT || 15000) }); loaded = true; } catch (e) { }
    if (PAGE === '3d') await p.waitForFunction(() => window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo() && BattleStage3D.actorsInfo().ready >= BattleStage3D.actorsInfo().want, null, { timeout: 120000 }).catch(() => { });
    await p.waitForTimeout(o.boss ? 2600 : 1200);
    const st = await p.evaluate(() => { const sc = BattleUI.scene; const k = sc && sc.bg65 && BattleBG65.photoKey(sc.bg65); const s3 = window.BattleStage3D && BattleStage3D.info ? BattleStage3D.info() : null; return { photo: k && BattleBG65.photoState(k), bgPhoto: !!(sc && sc.bg && sc.bg._photo), bgSize: sc && sc.bg && [sc.bg.width, sc.bg.height], canvas: [Engine.canvas.width, Engine.canvas.height], stage3d: s3 && { place: s3.place, failed: s3.failed, why: s3.why }, backKind: window.BattleStage3D && BattleStage3D.stage ? BattleStage3D.stage.backKind : undefined }; });
    await p.screenshot({ path: SHOT + TAG + '_' + name + '.jpg', type: 'jpeg', quality: 78, timeout: 180000 });
    out.push(Object.assign({ name, map, info: r.info, key: r.key, early: r.early, loaded, sec: (Date.now() - t0) / 1000 }, st));
    console.log(JSON.stringify(out[out.length - 1]));
    await p.evaluate(() => { try { const sc = BattleUI.scene; if (sc) Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); BattleUI.scene = null; document.querySelectorAll('#battle-party,#battle-msg').forEach((n) => n.classList.remove('on')); document.querySelectorAll('.rw-list, .rw-panel').forEach((n) => n.remove()); State.data.aboard = null; } catch (e) { } });
  }
  fs.writeFileSync('/home/claude/work/p3d/bg_' + TAG + '.json', JSON.stringify({ out, errors: errs }, null, 1)); console.log('errors', errs.length, errs.slice(0, 8)); await br.close();
})();
