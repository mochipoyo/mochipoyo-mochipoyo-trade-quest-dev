// v7.8 3D の仕上げ：錆雨市の雨・太平洋の浮天城アエリアの影・オルビスの展望室の地球と星空（ヘッドレス・低画質）
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v78/';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready', 'kalion_open', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; d.hero.level = 45; World.start(); World.encounter = () => { }; Vehicle.drift = () => null; });
  await p.waitForTimeout(1500);
  const go = async (fn, arg) => { await p.evaluate(fn, arg); await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === World.map.id && !MTQ3D.building, null, { timeout: 240000 }).catch(() => { }); await p.waitForTimeout(4000); };
  const fx = () => p.evaluate(() => { const s = MTQ3D.scene; const f = (n) => { const o = s.getObjectByName(n); return !!(o && o.visible); }; return { map: World.map.id, rain: f('fx78_rain'), shadow: f('fx78_aeria_shadow'), globe: f('fx78_globe'), space: !!(MTQ3D.lighting.space) }; });
  await go(() => { World.busy = false; World.enterMap('neon_town', 17, 16, 'down', { raw: true }); });
  const a = await fx(); ok(a.map === 'neon_town' && a.rain && !a.shadow && !a.globe, '錆雨市の町：雨が降る ' + JSON.stringify(a)); await p.screenshot({ path: SHOT + 'fx_rain.jpg', type: 'jpeg', quality: 78, timeout: 120000 });
  await go(() => { World.busy = false; World.enterMap('neon_inn', 5, 7, 'up', { raw: true }); });
  const a2 = await fx(); ok(a2.map === 'neon_inn' && !a2.rain, '錆雨市の宿の中：雨は降らない ' + JSON.stringify(a2));
  await go(() => { const E = Earth78, W = World76; const a = E.aeriaAt(); const id = W.mapAt(a.x, a.y + 6); const r = W.rect(id); const x = W.dxWrap(a.x - r.x), y = a.y + 6 - r.y; const d = State.data; World.busy = false; d.aboard = 'galleon'; d.vehicles.galleon = { owned: true, map: id, x, y, port: { map: id, x, y } }; World.enterMap(id, x, y, 'up', { raw: true }); });
  const b = await fx(); ok(b.shadow && !b.rain, '太平洋の浮天城アエリアの下の海：大きな影 ' + JSON.stringify(b)); await p.evaluate(() => { MTQ3D.lighting.preview = 0.5; }); await p.waitForTimeout(2500); await p.screenshot({ path: SHOT + 'fx_aeria_shadow.jpg', type: 'jpeg', quality: 78, timeout: 120000 });
  await go(() => { const d = State.data; d.aboard = null; World.busy = false; World.enterMap('orbis_lounge', 8, 8, 'up', { raw: true }); });
  const c = await fx(); await p.evaluate(() => { MTQ3D.lighting.preview = null; }); ok(c.map === 'orbis_lounge' && c.globe && c.space, 'オルビスの展望室：窓の外に地球・星空 ' + JSON.stringify(c)); await p.screenshot({ path: SHOT + 'fx_globe.jpg', type: 'jpeg', quality: 78, timeout: 120000 });
  await go(() => { World.busy = false; World.enterMap('poyo_village', 24, 32, 'down'); });
  const e = await fx(); ok(!e.rain && !e.shadow && !e.globe && !e.space, 'ポヨ村：どれも出ない ' + JSON.stringify(e));
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
