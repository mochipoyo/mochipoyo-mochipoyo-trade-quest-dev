// v8.2 動画と漏れの確かめ（ヘッドレス Chromium・ソフトウェア描画）
//  MODE=ticker：証券市場の中で 12 秒（円形ティックテープが流れる）。MODE=ship：アズール大洋で船を北へ進め、リングの下を通る（15 秒）
//  MODE=leak：証券市場（ティックテープ）⇄ 宿屋を 20 往復し、描画の形・画像の数（renderer.info.memory）を記録
const { chromium } = require('playwright'); const fs = require('fs'); const PORT = process.env.PORT || 8792; const MODE = process.env.MODE || 'ticker';
const OUT = process.env.OUT || '/home/claude/work/p3d/shots/v82/video/'; fs.mkdirSync(OUT, { recursive: true }); const VP = (process.env.VP || '960x540').split('x').map(Number);
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: VP[0], height: VP[1] }, recordVideo: MODE === 'leak' ? undefined : { dir: OUT, size: { width: VP[0], height: VP[1] } } });
  await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 0; d.timeOfDay = 0.45; d.steps = 900; World.start(); World.encounter = () => { }; if (window.Vehicle) Vehicle.drift = () => null; /* 確かめの都合：外海の海流で流される（と、はじめての説明の窓）を止める */ if (window.Remake81) Object.keys(Remake81.views || {}).forEach((k) => { d.flags[Remake81.views[k].flag] = true; }); });
  const enter = async (id, x, y, dir) => { await p.evaluate(([id, x, y, dir]) => { World.busy = false; World.enterMap(id, x, y, dir || 'up', { raw: true }); }, [id, x, y, dir]); await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && !MTQ3D.building, id, { timeout: 180000 }); };
  const out = { mode: MODE };
  const rings = () => p.evaluate(() => { let n = 0; MTQ3D.scene.traverse((o) => { if (/^ticker82/.test(o.name || '') && !/_(inner|outer)$/.test(o.name)) n++; }); return n; });
  if (MODE === 'ticker' || MODE === 'ticker_town') {
    if (MODE === 'ticker') await enter('tradia_exchange', 12, 9); else await enter('tradia', 35, 9);   /* 広場：証券市場の扉の前（帯の真ん中のそば。ふつうのカメラで帯が画面に入る） */ const t0 = Date.now(); const samples = [];
    while (Date.now() - t0 < 12500) { await p.waitForTimeout(1500); samples.push(await p.evaluate(() => MTQ3D.current.ticker82 && MTQ3D.current.ticker82.info())); }
    out.samples = samples; out.ms = Date.now() - t0; out.rings = await rings();
  } else if (MODE === 'ship') {
    const at = await p.evaluate(() => { const L = EARTH78_LAYOUT, W = World76, d = State.data; const gx = Math.floor(L.xOf(-145)), gy = Math.floor(L.yOf(5)) + 12; const id = W.mapsIn(gx, gy, gx + 1, gy + 1)[0]; const o = W.origin(id); d.vehicles = d.vehicles || {}; d.vehicles.galleon = Object.assign(d.vehicles.galleon || {}, { owned: true, map: id, x: gx - o.x, y: gy - o.y }); d.aboard = 'galleon'; return { id, x: gx - o.x, y: gy - o.y }; });
    await enter(at.id, at.x, at.y, 'up'); await p.waitForTimeout(2000); const t0 = Date.now(); const track = [];
    await p.keyboard.down('ArrowUp'); while (Date.now() - t0 < 16000) { await p.waitForTimeout(1000); track.push(await p.evaluate(() => ({ map: World.map.id, x: World.player.x, y: World.player.y, aboard: State.data.aboard, ring: MTQ3D.join.oceanInfo() }))); } await p.keyboard.up('ArrowUp');
    out.start = at; out.track = track;
    // 船の高さ（帆柱のいちばん上）と、帯の下の端の高さ
    out.shipTop = await p.evaluate(() => { const o = MTQ3D.scene.getObjectByName('vehicle_galleon'); if (!o) return null; o.updateMatrixWorld(true); let top = -1e9, bot = 1e9;
      o.traverse((m) => { if (!m.geometry) return; const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox; const e = m.matrixWorld.elements;
        for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { const wy = e[1] * x + e[5] * y + e[9] * z + e[13]; top = Math.max(top, wy); bot = Math.min(bot, wy); } });
      return { top: +top.toFixed(2), bottom: +bot.toFixed(2) }; });
    out.bandBottom = 6 - 2.2 / 2;
  } else if (MODE === 'aeria' || MODE === 'ring_shot') {
    // 船の上から：空の城アエリア（経度 −152°・緯度 21°）／大洋のリング（−145°・5°）を、ふつうのカメラで撮る
    const [lon, lat, dy] = MODE === 'aeria' ? [-152, 21, +(process.env.AERIA_DY || 9)] : [-145, 5, 7];
    const at = await p.evaluate(([lon, lat, dy]) => { const L = EARTH78_LAYOUT, W = World76, d = State.data; const gx = Math.floor(L.xOf(lon)), gy = Math.floor(L.yOf(lat)) + dy; const id = W.mapsIn(gx, gy, gx + 1, gy + 1)[0]; const o = W.origin(id); d.vehicles = d.vehicles || {}; d.vehicles.galleon = Object.assign(d.vehicles.galleon || {}, { owned: true, map: id, x: gx - o.x, y: gy - o.y }); d.aboard = 'galleon'; return { id, x: gx - o.x, y: gy - o.y, tile: World.getMap(id).tile(gx - o.x, gy - o.y) }; }, [lon, lat, dy]);
    await enter(at.id, at.x, at.y, 'up');
    if (process.env.AERIA_HOLD) { await p.waitForTimeout(600); const c0 = await p.evaluate(() => { const a = MTQ3D.join.aeria; if (!a) return null; return { x: a.position.x + 10, y: 14, z: a.position.z + 5, dist: 66, pitch: 5 }; }); await p.evaluate((c) => { if (c) { MTQ3D.camera.setCine(c); window.__holdCine = c; } }, c0);
      await p.waitForFunction(() => { const c = window.__holdCine; if (!c) return true; if (!MTQ3D.camera.cine) MTQ3D.camera.setCine(c); const t = MTQ3D.camera.target; return Math.hypot(t.x - c.x, t.z - c.z) < 0.8; }, null, { timeout: 60000 }).catch(() => { });
      console.log('hold', JSON.stringify(c0)); await p.screenshot({ path: OUT + MODE + '_hold.jpg', type: 'jpeg', quality: 85 }); }
    if (process.env.AERIA_SEQ) { for (const ms of [800, 1800, 3000, 4500, 7000]) { await p.waitForTimeout(ms === 800 ? 800 : 1200); const cs = await p.evaluate(() => { const c = MTQ3D.camera; return { cine: c.cine, pitch: +(c.pitchNow || 0).toFixed(3), dist: +(c.distNow || c.dist || 0).toFixed(1), n: MTQ3D.join.aeriaCineN || 0, fx: !!MTQ3D.join.aeriaFx }; }); console.log('t', ms, JSON.stringify(cs)); await p.screenshot({ path: OUT + MODE + '_t' + ms + '.jpg', type: 'jpeg', quality: 80 }); } }
    else await p.waitForTimeout(4000);
    out.at = at; out.info = await p.evaluate(() => { const j = MTQ3D.join; return { aeria: !!j.aeria, aeriaInScene: !!(j.aeria && j.aeria.parent), aeriaDist: j.aeriaDist, ring: j.oceanInfo() }; });
    await p.screenshot({ path: OUT + MODE + '.jpg', type: 'jpeg', quality: 85 });
  } else if (MODE === 'chunks') {
    // 海のチャンク（160×120 の地図）の境を、リングから 150 マス以内で、北・南・東・西（東西の一周の継ぎ目）から越える。越える前と後で、リングの世界の位置・数・速さ
    await p.evaluate(() => { State.data.flags.magicka_arrived = true; State.data.flags.yorn_letter_done = true; });   /* となりの海の物語の鍵（北・南・西＝マクディアに着いてから、東＝断裂群島の用事）を開けた状態で確かめる */
    const WW = 1440; const starts = [['ArrowUp', 96, 363, 'up'], ['ArrowDown', 96, 476, 'down'], ['ArrowRight', 156, 400, 'right'], ['ArrowLeft', 3, 400, 'left']]; out.cross = [];
    const snap = () => p.evaluate((WW) => { const o = World76.origin(World.map.id); const r = MTQ3D.join.oceanInfo(); let n = 0; MTQ3D.scene.traverse((q) => { if (q.name === 'ticker82_ocean') n++; }); const nx = (v) => ((v % WW) + WW) % WW; return { map: World.map.id, px: nx(World.player.x + o.x), py: World.player.y + o.y, ringWX: r.none ? null : +nx(r.x + o.x).toFixed(2), ringWZ: r.none ? null : +(r.z + o.y).toFixed(2), dist: r.dist, built: r.built, inScene: n, speed: r.speed, offset: r.offset }; }, WW);
    for (const [key, gx, gy, dir] of starts) {
      const at = await p.evaluate(([gx, gy]) => { const W = World76, d = State.data; const id = W.mapsIn(gx, gy, gx + 1, gy + 1)[0]; const o = W.origin(id); d.vehicles = d.vehicles || {}; d.vehicles.galleon = Object.assign(d.vehicles.galleon || {}, { owned: true, map: id, x: gx - o.x, y: gy - o.y }); d.aboard = 'galleon'; return { id, x: gx - o.x, y: gy - o.y }; }, [gx, gy]);
      await enter(at.id, at.x, at.y, dir); await p.waitForTimeout(1500);
      const a = await snap(); await p.keyboard.down(key); const t0 = Date.now(); let b = a; while (Date.now() - t0 < 20000) { await p.waitForTimeout(200); b = await snap(); if (b.map !== a.map) break; } await p.keyboard.up(key); await p.waitForTimeout(2500); const c = await snap();
      out.cross.push({ key, before: a, after: c, crossed: c.map !== a.map }); console.log(key, JSON.stringify(a), '->', JSON.stringify(c));
    }
  } else if (MODE === 'leak') {
    const mem = () => p.evaluate(() => { const r = MTQ3D.renderer.renderer; let n = 0, objs = 0; MTQ3D.scene.traverse((o) => { objs++; if (/^ticker82/.test(o.name || '') && !/_(inner|outer)$/.test(o.name)) n++; }); return { geo: r.info.memory.geometries, tex: r.info.memory.textures, prog: r.info.programs ? r.info.programs.length : null, objs, rings: n, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, cache: MTQ3D.cache ? MTQ3D.cache.size : null }; });
    // 証券市場（ティックテープ）と、ほかの 5 つの地図を順に 4 周（汎用の 3D は直近の 3 枚だけ残すので、毎回作り直して捨てる）。証券市場に入るたびに記録
    const seq = process.env.LEAKSEQ ? process.env.LEAKSEQ.split(',').map((a) => { const q = a.split(':'); return [q[0], +q[1], +q[2]]; }) : [['tradia_exchange', 12, 9], ['tradia_inn', 7, 9], ['magicka_inn', 7, 9], ['rivel_castle_approach', 32, 40], ['vol_main_hall', 14, 15], ['ruins_post', 8, 9]];
    const log = []; const NC = +(process.env.LEAKN || 4); for (let i = 0; i < NC; i++) for (const [id, x, y] of seq) { await enter(id, x, y); await p.waitForTimeout(300); const a = await mem(); log.push(Object.assign({ i, id }, a)); console.log(i, id, JSON.stringify(a)); }
    out.log = log;
  }
  out.errs = errs; await p.close(); await ctx.close(); await br.close();
  fs.writeFileSync(OUT + MODE + '_result.json', JSON.stringify(out, null, 1)); console.log(JSON.stringify(out).slice(0, 1500));
})().catch((e) => { console.log(e.stack); process.exit(1); });
