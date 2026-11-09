// v8.9 スマホの移動の重さを測る（ヘッドレス Chromium・ソフトウェア描画。実機ではない）
//   使い方：PORT=8792 BASE=http://localhost:8792 node perf89.js
//   環境変数：MAPS=poyo_village,rivel_town,world,...  THROTTLE=4（CPU を何倍遅くするか：スマホ相当の目安）  FRAMES=600（歩くコマ数）
//            QUALITY=auto|low|high  TAG=before|after  PROFILE=1（CPU のプロファイルも取る）
//   測るもの：
//    A. 場面の大きさ：描画の回数（影の分を分けて）・三角形・影を落とす物・光・使っているシェーダーの数・画像・形
//    B. 毎コマの処理（描画は止めて、2D 版の更新＋3D の更新を 1 コマずつ直接動かす。押したキーで歩く）：1 コマの時間・とがり（長いコマ）と、その内訳
//    C. 描画の命令を出す CPU の時間（描画の大きさを小さくして、GPU の代わりのソフトウェア描画の待ちを減らす）
//   ※ GPU（スマホの画面を塗る処理）の時間は、この環境では測れない（ソフトウェア描画のため）
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = process.env.BASE || ('http://localhost:' + (process.env.PORT || 8791)); const OUT = process.env.OUT || '/home/claude/envwork/docs/perf89/';
fs.mkdirSync(OUT + 'logs', { recursive: true });
const MAPS = (process.env.MAPS || 'poyo_village,world,rivel_town,tradia,world_magicka').split(',');
const THROTTLE = +(process.env.THROTTLE || 4); const FRAMES = +(process.env.FRAMES || 600); const QUALITY = process.env.QUALITY || 'auto'; const TAG = process.env.TAG || 'before';
(async () => {
  const VIEWS = { p390: { width: 390, height: 844 }, land: { width: 844, height: 390 } }; const VIEW = process.env.VIEW || 'p390';
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: VIEWS[VIEW], isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await ctx.addInitScript((q) => { try { if (q === 'auto') localStorage.removeItem('mtq3d-quality'); else localStorage.setItem('mtq3d-quality', q); } catch (e) { } }, QUALITY);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200))); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  const cdp = await ctx.newCDPSession(p);
  await p.goto(BASE + '/3d/index.html');
  await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.party = ['hero']; World.start(); World.encounter = () => { }; });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 });
  const env = await p.evaluate(() => ({ quality: MTQ3D.quality, pixelRatio: MTQ3D.renderer.pixelRatio, coarse: matchMedia('(pointer: coarse)').matches, dpr: devicePixelRatio, mobile: document.body.classList.contains('mobile'), build: (typeof __MTQ3D_BUILD__ !== 'undefined') ? __MTQ3D_BUILD__ : null }));
  console.log('環境', JSON.stringify(env));
  const all = { env, throttle: THROTTLE, frames: FRAMES, cases: {} };
  for (const id of MAPS) {
    // 入口：となりのマップからこのマップへのワープの着く所（なければ地図の真ん中あたりの歩けるマス）
    const ok = await p.evaluate((id) => {
      document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false;
      const D = window.MAP_DEFS; if (!D[id]) return null; let at = null;
      for (const k of Object.keys(D)) { const ws = (D[k].warps || []); for (const w of ws) if (w.to === id && typeof w.tx === 'number') { at = { x: w.tx, y: w.ty, from: k }; break; } if (at) break; }
      World.maps = World.maps || {}; World.enterMap(id, at ? at.x : 1, at ? at.y : 1, 'down');
      const m = World.map; if (!at || !m.passable(World.player.x, World.player.y, State.data)) { outer: for (let r = 0; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = (m.w >> 1) + dx, y = (m.h >> 1) + dy; if (x >= 0 && y >= 0 && x < m.w && y < m.h && m.passable(x, y, State.data) && !m.warpAt(x, y)) { World.player.x = x; World.player.y = y; World.player.px = x * Engine.TS; World.player.py = y * Engine.TS; break outer; } } }
      return { id: m.id, w: m.w, h: m.h, kind: m.kind, x: World.player.x, y: World.player.y, from: at && at.from };
    }, id);
    if (!ok) { console.log(id, 'この版にない'); continue; }
    await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map === World.map && !MTQ3D.building, null, { timeout: 300000 });
    await p.waitForTimeout(1500);
    // A. 場面の大きさ
    const A = await p.evaluate(() => {
      const R = MTQ3D.renderer, r = R.renderer, sc = MTQ3D.scene; MTQ3D.paused = true;
      R.render(); const all1 = { calls: r.info.render.calls, tri: r.info.render.triangles };
      r.shadowMap.autoUpdate = false; R.render(); const noSh = { calls: r.info.render.calls, tri: r.info.render.triangles }; r.shadowMap.autoUpdate = true;
      let meshes = 0, vis = 0, cast = 0, castVis = 0, inst = 0, batched = 0, sprites = 0, lights = 0, pts = 0, transp = 0, alphaTest = 0; const mats = new Set();
      sc.traverseVisible((o) => { if (o.isLight) { lights++; if (o.isPointLight) pts++; } if (o.isSprite) sprites++; if (!o.isMesh) return; vis++; if (o.castShadow) castVis++; if (o.isInstancedMesh) inst++; if (o.isBatchedMesh) batched++; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { mats.add(m); if (m.transparent) transp++; if (m.alphaTest > 0) alphaTest++; }); });
      sc.traverse((o) => { if (o.isMesh) { meshes++; if (o.castShadow) cast++; } });
      const gl = r.getContext();
      // 影を落とす物の内訳（影のカメラの範囲に入っているもの）：大きさ（外接球の半径）・三角形の数・名前
      const sun = MTQ3D.lighting.sun; const scam = sun.shadow.camera; scam.updateMatrixWorld();
      const list = [];
      sc.traverseVisible((o) => { if (!o.isMesh || !o.castShadow) return; const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); const s = g.boundingSphere.clone().applyMatrix4(o.matrixWorld); const c = s.center.clone().applyMatrix4(scam.matrixWorldInverse);
        const inside = o.frustumCulled === false || (c.x + s.radius >= scam.left && c.x - s.radius <= scam.right && c.y + s.radius >= scam.bottom && c.y - s.radius <= scam.top); if (!inside) return;
        const tri = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); const nm = o.name || (o.parent && o.parent.name) || g.type; list.push({ nm: nm.replace(/[_-]?\d+$/, '').slice(0, 24), r: +s.radius.toFixed(2), tri: Math.round(tri), inst: o.isInstancedMesh ? o.count : o.isBatchedMesh ? -1 : 0, fc: o.frustumCulled }); });
      const by = {}; list.forEach((x) => { const b = by[x.nm] || (by[x.nm] = { n: 0, tri: 0, rmax: 0 }); b.n++; b.tri += x.tri; b.rmax = Math.max(b.rmax, x.r); });
      const casters = { n: list.length, small035: list.filter((x) => x.r < 0.35).length, small06: list.filter((x) => x.r < 0.6).length, small1: list.filter((x) => x.r < 1).length, triSmall06: list.filter((x) => x.r < 0.6).reduce((a, x) => a + x.tri, 0), noCull: list.filter((x) => x.fc === false).length, top: Object.entries(by).sort((a, b) => b[1].n - a[1].n).slice(0, 16).map(([k, v]) => k + ':' + v.n + '/' + v.tri + 'tri/r' + v.rmax.toFixed(1)), topTri: Object.entries(by).sort((a, b) => b[1].tri - a[1].tri).slice(0, 8).map(([k, v]) => k + ':' + v.n + '/' + v.tri + 'tri') };
      return { casters, calls: all1.calls, shadowCalls: all1.calls - noSh.calls, mainCalls: noSh.calls, tri: all1.tri, mainTri: noSh.tri, meshes, visibleMeshes: vis, castShadowAll: cast, castShadowVisible: castVis, instanced: inst, batched, sprites, lights, pointLights: pts, transparentMatsUses: transp, alphaTestUses: alphaTest, materialsVisible: mats.size, programs: r.info.programs ? r.info.programs.length : null, geometries: r.info.memory.geometries, textures: r.info.memory.textures, buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight], shadowMap: MTQ3D.lighting.sun.shadow.mapSize.x, joinShown: MTQ3D.join ? MTQ3D.join.shown.size : 0, shadowHalf: MTQ3D.lighting.shadowHalf89 || null, camDist: +MTQ3D.camera.dist.toFixed(1), pixelRatio: r.getPixelRatio() };
    });
    console.log(id, 'A', JSON.stringify(A));
    // B. 毎コマの処理（描画なし）。CPU を THROTTLE 倍遅く
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
    if (process.env.PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 250 }); await cdp.send('Profiler.start'); }
    const B = await p.evaluate((FRAMES) => {
      const app = MTQ3D, W = World, E = Engine, K = E.Input.keys; app.paused = true;
      const acc = {}; let cur = null; const wraps = [];
      const wrap = (obj, name, label) => { if (!obj || typeof obj[name] !== 'function') return; const o = obj[name]; const L = label || name; const own = Object.prototype.hasOwnProperty.call(obj, name); wraps.push(() => { if (own) obj[name] = o; else delete obj[name]; }); obj[name] = function () { const t = performance.now(); try { return o.apply(this, arguments); } finally { const d = performance.now() - t; const a = acc[L] || (acc[L] = { n: 0, sum: 0, max: 0 }); a.n++; a.sum += d; if (d > a.max) a.max = d; if (cur) cur[L] = (cur[L] || 0) + d; } }; };
      wrap(app, 'updateLogic'); wrap(app.current, 'update', 'map.update'); wrap(app.join, 'update', 'join.update'); wrap(app.lighting, 'update', 'lighting.update'); wrap(app, 'updateFollowers'); wrap(app, 'findTarget'); wrap(app.ui, 'layout', 'ui.layout'); wrap(app.ui, 'show', 'ui.show'); wrap(app.ui, 'setPrompt', 'ui.setPrompt'); wrap(app, 'updateCutout'); wrap(app.fx78, 'update', 'fx78.update'); wrap(app, 'updateNavRing'); wrap(app.camera, 'follow', 'camera.follow'); wrap(app.hero, 'update', 'hero.update'); wrap(app, 'updateVehicles'); wrap(app.car79, 'update', 'car79.update'); wrap(W, 'onStep', 'World.onStep'); wrap(window.Minimap, 'onStep', 'Minimap.onStep'); wrap(window.Minimap, 'draw', 'Minimap.draw'); wrap(window.Minimap, 'reveal', 'Minimap.reveal'); wrap(W, 'updatePlaceLabel'); wrap(app, 'ensure');
      // ワープ・出来事で別のマップへ行かないように（この確かめの間だけ）
      const m = W.map; const wa = m.warpAt, ea = m.eventAt; m.warpAt = () => null; m.eventAt = () => null;
      const dirs = ['right', 'down', 'left', 'up']; let di = 0, since = 0, lastX = app.pos.x, lastZ = app.pos.z, chk = 0;
      const frames = []; let now = performance.now(); const t0 = performance.now(); const p0 = { x: W.player.x, y: W.player.y }; let steps = 0; const sx0 = W.player.x, sy0 = W.player.y; let tiles = new Set();
      for (let f = 0; f < FRAMES; f++) {
        dirs.forEach((k, i) => K[k] = i === di);
        cur = {}; const a = performance.now();
        const top = E.top(); if (top) { if (top.handleInput) top.handleInput(); if (top.update) top.update(16.667); }
        let drawFrom = E.scenes.length - 1; while (drawFrom > 0 && E.scenes[drawFrom].overlay) drawFrom--; for (let i = drawFrom; i < E.scenes.length; i++) if (E.scenes[i].draw) E.scenes[i].draw(E.ctx);
        E.Input.pressed = {};
        now += 16.667; app.frame(now);
        const d = performance.now() - a; frames.push({ ms: d, parts: cur });
        tiles.add(W.player.x + ',' + W.player.y);
        since++; chk++; if (chk >= 12) { chk = 0; const mv = Math.hypot(app.pos.x - lastX, app.pos.z - lastZ); lastX = app.pos.x; lastZ = app.pos.z; if (mv < 0.15) { di = (di + 1 + (f % 2)) % 4; since = 0; } }
        if (since > 150) { di = (di + 1) % 4; since = 0; }
      }
      dirs.forEach((k) => K[k] = false); m.warpAt = wa; m.eventAt = ea; wraps.reverse().forEach((u) => u()); app._last = performance.now(); E.last = performance.now();
      const ms = frames.map((x) => x.ms).sort((x, y) => x - y); const q = (k) => ms[Math.min(ms.length - 1, Math.floor(ms.length * k))];
      const mean = ms.reduce((s, x) => s + x, 0) / ms.length;
      const spikes = frames.map((x, i) => ({ i, ms: +x.ms.toFixed(2), parts: Object.fromEntries(Object.entries(x.parts).filter(([, v]) => v > 0.5).map(([k, v]) => [k, +v.toFixed(2)])) })).filter((x) => x.ms > Math.max(q(0.5) * 2.5, 8)).slice(0, 25);
      const parts = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, { n: v.n, avg: +(v.sum / FRAMES).toFixed(3), max: +v.max.toFixed(2) }]).sort((x, y) => y[1].avg - x[1].avg));
      return { frames: FRAMES, wall: Math.round(performance.now() - t0), mean: +mean.toFixed(2), p50: +q(0.5).toFixed(2), p90: +q(0.9).toFixed(2), p99: +q(0.99).toFixed(2), max: +ms[ms.length - 1].toFixed(2), over16: ms.filter((x) => x > 16.7).length, over33: ms.filter((x) => x > 33.4).length, tilesVisited: tiles.size, moved: [sx0 + ',' + sy0, W.player.x + ',' + W.player.y], map: W.map.id, parts, spikes };
    }, FRAMES);
    if (process.env.PROFILE) { const { profile } = await cdp.send('Profiler.stop'); fs.writeFileSync(OUT + 'logs/prof89_' + TAG + '_' + id + '.cpuprofile', JSON.stringify(profile)); }
    console.log(id, 'B', JSON.stringify({ mean: B.mean, p50: B.p50, p90: B.p90, p99: B.p99, max: B.max, over16: B.over16, over33: B.over33, tiles: B.tilesVisited, map: B.map }));
    console.log('   parts', JSON.stringify(Object.fromEntries(Object.entries(B.parts).slice(0, 10))));
    console.log('   spikes', JSON.stringify(B.spikes.slice(0, 6)));
    // C. 描画の命令を出す CPU の時間（描く大きさを 1/8 に。影の地図の大きさは同じ）
    const C = await p.evaluate(async () => {
      // gl.finish() で前のコマの GPU（ソフトウェア描画）の仕事を終わらせてから測る＝描画の命令を作って送る CPU の時間だけ（three.js の処理・WebGL の呼び出し）
      const R = MTQ3D.renderer; const r = R.renderer; const gl = r.getContext(); const on = [], off = [];
      for (let i = 0; i < 40; i++) { await new Promise((res) => requestAnimationFrame(res)); const sh = i % 2 === 0; r.shadowMap.autoUpdate = sh; gl.finish(); const a = performance.now(); R.render(); (sh ? on : off).push(performance.now() - a); }
      r.shadowMap.autoUpdate = true; gl.finish();
      const med = (a) => { const s = a.slice(3).sort((x, y) => x - y); return +s[s.length >> 1].toFixed(2); };
      return { renderMed: med(on), renderNoShadowMed: med(off), renderMax: +Math.max.apply(null, on.slice(3)).toFixed(2) };
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    console.log(id, 'C', JSON.stringify(C));
    all.cases[id] = { map: ok, A, B, C };
  }
  all.errors = errs; fs.writeFileSync(OUT + 'logs/perf89_' + TAG + '.json', JSON.stringify(all, null, 1));
  console.log('errors', JSON.stringify(errs.slice(0, 5)));
  await br.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
