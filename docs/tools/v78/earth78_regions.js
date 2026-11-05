// v7.8 新しい地域（3D）：ネオン・メリディアン・ネレイアのフィールドと町、オルビス、アエリアを 3D で開いて、エラーがないか・画面を保存（ヘッドレス・低画質）
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const SHOT = '/home/claude/work/p3d/shots/v78/';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready', 'kalion_open', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; d.hero.level = 45; World.start(); World.encounter = () => { }; });
  await p.waitForTimeout(1200);
  const visit = async (map, x, y, name) => {
    await p.evaluate(([map, x, y]) => { World.busy = false; const def = MAP_DEFS[map]; let X = x, Y = y; if (X === null) { const l = def.locations ? def.locations[0] : null; X = l.x; Y = l.y + 1; } World.enterMap(map, X, Y, 'down', { raw: true }); }, [map, x, y]);
    await p.waitForFunction((map) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === map && !MTQ3D.building, map, { timeout: 240000 }).catch(() => { });
    await p.waitForTimeout(5000);
    const r = await p.evaluate(() => ({ map: World.map.id, cur: MTQ3D.current && MTQ3D.current.map.id, tris: MTQ3D.renderer.renderer.info.render.triangles }));
    ok(r.map === map && r.cur === map, name + '：3D で開いた ' + JSON.stringify(r));
    await p.screenshot({ path: SHOT + 'region_' + map + '.jpg', type: 'jpeg', quality: 72, timeout: 120000 });
  };
  await visit('world_neon', null, null, '錆雨市ネオン・ドックのフィールド');
  await visit('neon_town', 17, 16, '錆雨市ネオン・ドック（町）');
  await visit('neon_works_1', 2, 12, '水没工場');
  await visit('world_meridian', null, null, '灰岸都市メリディアンのフィールド');
  await visit('meridian_shelter', 14, 16, '郊外の避難所');
  await visit('world_nereia', null, null, '環潮大陸ネレイアのフィールド');
  await visit('nereia_city', 15, 16, '環状都市ネレイア');
  await visit('nereia_old_lo', 12, 13, '旧市街（干潮）');
  await visit('orbis_ring', 3, 8, '環星ステーション・オルビス 居住環');
  await visit('aeria_dock', 9, 10, '浮天城アエリア 船着き場');
  await visit('aeria_garden_hi', 9, 12, '浮天城アエリア 庭園（満水）');
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
