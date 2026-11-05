// v7.8：新しい地域の 3D の見た目の設定（テーマ・空気・レシピ）を調べて画像を撮る（ヘッドレス・低画質）
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v78/';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; const warns = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); if (m.type() === 'warning' && /プロファイルが未登録/.test(m.text())) warns.push(m.text().slice(0, 80)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready', 'kalion_open', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; d.hero.level = 45; World.start(); World.encounter = () => { }; });
  await p.waitForTimeout(1200);
  const list = (process.env.MAPS || 'world_neon,neon_town:17:16,world_meridian,meridian_shelter:14:16,world_nereia,nereia_city:15:16').split(',');
  for (const it of list) { const [map, xs, ys] = it.split(':');
    await p.evaluate(([map, x, y]) => { World.busy = false; const def = MAP_DEFS[map]; let X = x, Y = y; if (X === null) { const l = def.locations ? def.locations[0] : null; X = l.x; Y = l.y + 1; } World.enterMap(map, X, Y, 'down', { raw: true }); }, [map, xs ? +xs : null, ys ? +ys : null]);
    await p.waitForFunction((map) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === map && !MTQ3D.building, map, { timeout: 240000 }).catch(() => { });
    await p.waitForTimeout(4000);
    const r = await p.evaluate(() => { const ms = MTQ3D.current, L = MTQ3D.lighting; return { map: ms.map.id, theme: ms.theme && ms.theme.region, place: ms.theme && ms.theme.place, mood: !!L.mood, recipe: ms.envRecipe && ms.envRecipe.id, want: (() => { try { const r = MTQ3D_ENV.recipeFor(ms.map); return r ? r.id : null; } catch (e) { return 'ERR ' + e.message; } })(), err: MTQ3D_ENV.errors[ms.map.id] ? String(MTQ3D_ENV.errors[ms.map.id]).slice(0, 160) : null, cov: ms.coverage, sun: +L.sun.intensity.toFixed(2) }; });
    console.log('INFO ' + JSON.stringify(r));
    await p.screenshot({ path: SHOT + 'look_' + map + '.jpg', type: 'jpeg', quality: 72, timeout: 120000 });
  }
  console.log('WARN ' + warns.length + ' ' + warns.slice(0, 4).join(' / '));
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
