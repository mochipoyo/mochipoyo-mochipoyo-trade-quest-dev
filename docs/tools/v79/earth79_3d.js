// v7.9 3D（ヘッドレス・低画質）：世界の名前・砂漠の砂の色・馬車（模型・速さ・仲間は中）・雨の波紋と雨音・アエリアの影・遺跡の印
// 使い方：/home/claude/work/p3d で bash withenv.sh node <このファイル>（PORT で配信中の 3d/index.html を開く）
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v79/';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  require('fs').mkdirSync(SHOT, { recursive: true });
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  const ui = await p.evaluate(() => { const b = document.querySelector('[data-join="on"]'); return b ? b.textContent : ''; }); ok(/3121年の地球/.test(ui), '3D設定：世界のつながり「' + ui + '」');
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready', 'kalion_open', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived', 'king_quest1'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; d.hero.level = 45; d.party = ['hero', 'lina', 'kyle']; World.start(); World.encounter = () => { }; });
  await p.waitForTimeout(1500);
  const go = async (fn, arg) => { await p.evaluate(fn, arg); await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === World.map.id && !MTQ3D.building, null, { timeout: 240000 }).catch(() => { }); await p.waitForTimeout(3500); };
  // 砂漠の砂
  await go(() => { World.busy = false; const l = MAP_DEFS.world_desert.locations.find((q) => q.id === 'sahar_city'); World.enterMap('world_desert', l.x, l.y + 2, 'down', { raw: true }); });
  const ds = await p.evaluate(() => ({ map: World.map.id, region: MTQ3D.current.theme && MTQ3D.current.theme.region, sand: MTQ3D.current.theme && MTQ3D.current.theme.ground && MTQ3D.current.theme.ground.sand }));
  ok(ds.map === 'world_desert' && ds.region === 'desert' && ds.sand === '#d2a45a', 'リシア砂漠：3D の砂の色を濃い砂色に ' + JSON.stringify(ds)); await p.screenshot({ path: SHOT + 'desert_sand.jpg', type: 'jpeg', quality: 78, timeout: 120000 });
  // 馬車
  await go(() => { World.busy = false; const l = MAP_DEFS.world.locations.find((q) => q.id === 'poyo_village'); World.enterMap('world', l.x, l.y + 2, 'down', { raw: true }); Carriage.give(); });
  const sp = async () => { await p.evaluate(() => { Engine.Input.keys.down = true; }); await p.waitForTimeout(700); const v = await p.evaluate(() => MTQ3D.speed); await p.evaluate(() => { Engine.Input.keys.down = false; }); await p.waitForTimeout(300); return v; };
  const v0 = await sp();
  await p.evaluate(() => { Engine.Input.press('carriage'); }); await p.waitForTimeout(1500);
  const c1 = await p.evaluate(() => { const g = MTQ3D.car79 && MTQ3D.car79.g; const fol = MTQ3D.followers ? [...MTQ3D.followers.values()].filter((e) => e.ch && e.ch.root.visible).length : 0; const h = MTQ3D.hero.root.position; return { riding: Carriage.riding(), vis: !!(g && g.visible), dy: g ? +(h.y - g.position.y).toFixed(2) : null, fol, tris: (() => { let n = 0; if (g) g.traverse((o) => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return Math.round(n); })() }; });
  ok(c1.riding && c1.vis && c1.fol === 0 && c1.dy > 0.2, '馬車：C キーで乗る → 馬と幌馬車の模型・主人公は御者台・仲間は出さない ' + JSON.stringify(c1));
  const v1 = await sp(); ok(v0 > 0 && Math.abs(v1 / v0 - 1.6) < 0.05, '馬車：3D の移動の速さ ×1.6（' + (v0 && v0.toFixed(2)) + ' → ' + (v1 && v1.toFixed(2)) + '）');
  await p.evaluate(() => { Engine.Input.keys.down = true; }); await p.waitForTimeout(400); await p.screenshot({ path: SHOT + 'carriage_field.jpg', type: 'jpeg', quality: 80, timeout: 120000 }); await p.evaluate(() => { Engine.Input.keys.down = false; });
  await go(() => { World.busy = false; World.enterMap('poyo_village', 24, 32, 'down'); });
  const c2 = await p.evaluate(() => ({ riding: Carriage.riding(), vis: !!(MTQ3D.car79.g && MTQ3D.car79.g.visible), heroVis: MTQ3D.hero.root.visible })); ok(!c2.riding && !c2.vis && c2.heroVis, '馬車：村に入ると模型は消え、歩く ' + JSON.stringify(c2));
  // 雨の波紋と雨音
  await go(() => { World.busy = false; try { Audio.unlock(); } catch (e) { } const l = MAP_DEFS.world_neon.locations[0]; World.enterMap('world_neon', l.x, l.y + 2, 'down', { raw: true }); });
  const r1 = await p.evaluate(() => { const f = MTQ3D.fx78; const R = f.ripples; return { rain: !!(f.rain && f.rain.visible), ripples: !!(R && R.grp.visible), shown: R ? R.list.filter((x) => x.m.visible && x.m.material.opacity > 0.01).length : 0, sound: !!f.rainAudio, ctx: !!(Audio.ctx) }; });
  ok(r1.rain && r1.ripples && r1.shown > 3 && (r1.sound || !r1.ctx), '錆雨市の野外：雨・水たまりの波紋' + (r1.ctx ? '・雨音' : '（音はこの環境で出せない）') + ' ' + JSON.stringify(r1));
  await p.evaluate(() => { MTQ3D.lighting.preview = 0.5; }); await p.waitForTimeout(1500); await p.screenshot({ path: SHOT + 'rain_ripples.jpg', type: 'jpeg', quality: 80, timeout: 120000 }); await p.evaluate(() => { MTQ3D.lighting.preview = null; });
  await go(() => { World.busy = false; World.enterMap('neon_inn', 5, 7, 'up', { raw: true }); });
  const r2 = await p.evaluate(() => { const f = MTQ3D.fx78; return { ripples: !!(f.ripples && f.ripples.grp.visible), sound: !!f.rainAudio }; }); ok(!r2.ripples && !r2.sound, '宿の中：波紋も雨音もなし ' + JSON.stringify(r2));
  // アエリアの影（陸の上も：影の下の地面のいちばん高い所の少し上）
  await go(() => { const E = Earth78, W = World76; const a = E.aeriaAt(); const id = W.mapAt(a.x, a.y + 6); const r = W.rect(id); const x = W.dxWrap(a.x - r.x), y = a.y + 6 - r.y; const d = State.data; World.busy = false; d.aboard = 'galleon'; d.vehicles.galleon = { owned: true, map: id, x, y, port: { map: id, x, y } }; World.enterMap(id, x, y, 'up', { raw: true }); });
  const sh = await p.evaluate(() => { const s = MTQ3D.fx78.shadow; const cur = MTQ3D.current; const orig = cur.heightAt; cur.heightAt = () => 1.2; MTQ3D.fx78._shT = -99; MTQ3D.fx78.update(0.016, 100, MTQ3D.pos, cur); const yLand = MTQ3D.fx78.shadow.position.y; cur.heightAt = orig; MTQ3D.fx78._shT = -99; MTQ3D.fx78.update(0.016, 101, MTQ3D.pos, cur); return { vis: !!(s && s.visible), ySea: +MTQ3D.fx78.shadow.position.y.toFixed(2), yLand: +yLand.toFixed(2) }; });
  ok(sh.vis && sh.ySea < 0.5 && sh.yLand > 1.2, 'アエリアの影：海の上は海面に、陸（高さ 1.2 の地面）の上は地面の上に ' + JSON.stringify(sh));
  // 遺跡の印（全体の地図）
  await go(() => { const d = State.data; d.aboard = null; World.busy = false; d.quests.earth78_records = { state: 'active' }; d.flags.erec_rift = true; const l = MAP_DEFS.world.locations.find((q) => q.id === 'harbor'); World.enterMap('world', l.x, l.y + 2, 'down', { raw: true }); });
  await p.evaluate(() => { Minimap.openBig(); Minimap.setMode('world'); const b = [...document.querySelectorAll('#bigmap button')].find((x) => /全体/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(2500);
  const mk = await p.evaluate(() => ({ n: Minimap.sites78().length, done: Minimap.sites78().filter((x) => x.done).length, legend: (document.getElementById('bm-legend') || {}).textContent || '' }));
  ok(mk.n === 8 && mk.done === 1 && /地球の記録の遺跡/.test(mk.legend), '全体の地図：遺跡 8 か所の印（調べた 1 か所は金色）・凡例 ' + JSON.stringify(mk));
  await p.screenshot({ path: SHOT + 'map_sites.jpg', type: 'jpeg', quality: 80, timeout: 120000 });
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
