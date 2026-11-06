// v7.8 建物の中の 3D：宿屋・店・家に入ると「建物の中」として組み立てる（近いカメラ・屋内の明かり。外の森や空にならない）（ヘッドレス・低画質）
//   ポヨ村の宿屋（作り込んだ 3D）・港町マリナの宿屋（汎用の 3D）・錆雨市の宿（新しい地域）
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v78/';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready', 'magicka_arrived'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = () => { }; });
  await p.waitForTimeout(1500);
  for (const [town, inner, name] of [['poyo_village', 'poyo_inn', 'ポヨ村の宿屋（作り込んだ 3D）'], ['harbor_town', 'harbor_inn', '港町マリナの宿屋（汎用の 3D）'], ['neon_town', 'neon_inn', '錆雨市の宿（新しい地域）']]) {
    await p.evaluate(([town, inner]) => { World.busy = false; const m = World.getMap(town); const wp = (m.warps || []).find((q) => q.to === inner); World.enterMap(wp.to, wp.tx, wp.ty, 'up'); }, [town, inner]);
    await p.waitForFunction((inner) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === inner && !MTQ3D.building, inner, { timeout: 240000 }).catch(() => { }); await p.waitForTimeout(3000);
    const r = await p.evaluate(() => { const ms = MTQ3D.current; const L = MTQ3D.lighting; return { map: ms.map.id, kind: ms.map.kind, interior: !!ms.interior, cov: ms.coverage, lightInterior: !!L.interior, sky: L.sky ? !!L.sky.visible : null, camDist: +(MTQ3D.camera.wantDist || 0).toFixed(1) }; });
    ok(r.map === inner && r.interior && r.lightInterior && r.sky === false, name + '：建物の中として組み立てた ' + JSON.stringify(r));
    await p.screenshot({ path: SHOT + 'interior_' + inner + '.jpg', type: 'jpeg', quality: 72, timeout: 120000 });
  }
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
