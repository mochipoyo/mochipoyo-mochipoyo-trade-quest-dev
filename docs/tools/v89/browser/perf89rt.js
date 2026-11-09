// v8.9 実時間で歩く確かめ（ヘッドレス Chromium。実機ではない）：描画は止め（ソフトウェア描画のため）、ゲームの毎コマの処理・となりの地域の組み立て・歩くたびの処理を実時間で動かす
//   CPU を THROTTLE 倍遅くして、コマの間隔（requestAnimationFrame）と長い処理（50ms 以上の long task）を数える
//   MAP=world SECS=40 THROTTLE=4 TAG=before|after
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = process.env.BASE || ('http://localhost:' + (process.env.PORT || 8791)); const OUT = process.env.OUT || '/home/claude/envwork/docs/perf89/';
fs.mkdirSync(OUT + 'logs', { recursive: true });
const MAP = process.env.MAP || 'world'; const SECS = +(process.env.SECS || 40); const THROTTLE = +(process.env.THROTTLE || 4); const TAG = process.env.TAG || 'before';
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  const cdp = await ctx.newCDPSession(p);
  await p.goto(BASE + '/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.party = ['hero']; World.start(); World.encounter = () => { }; });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 });
  const start = await p.evaluate((id) => { const D = window.MAP_DEFS; let at = null; for (const k of Object.keys(D)) { for (const w of (D[k].warps || [])) if (w.to === id && typeof w.tx === 'number') { at = w; break; } if (at) break; } World.enterMap(id, at.tx, at.ty, 'down'); return { x: World.player.x, y: World.player.y }; }, MAP);
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map === World.map && !MTQ3D.building, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { MTQ3D.paused = true; });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  const R = await p.evaluate((SECS) => new Promise((res) => {
    const app = MTQ3D, W = World, K = Engine.Input.keys; const iv = []; const long = []; let last = 0; const maps = new Set(); const stats0 = Object.assign({}, app.stats || {});
    let po = null; try { po = new PerformanceObserver((l) => l.getEntries().forEach((e) => long.push(Math.round(e.duration)))); po.observe({ entryTypes: ['longtask'] }); } catch (e) { }
    const of = app.frame; app.frame = function (now) { if (last) iv.push(now - last); last = now; return of.call(this, now); };
    // ワープ・出来事で別の地図へ行かない（地域の境目をまたぐ「つながった世界」の移動はそのまま）
    const m0 = W.map; const keep = new Map(); const guard = () => { const m = W.map; if (!keep.has(m)) { keep.set(m, [m.warpAt, m.eventAt]); m.warpAt = () => null; m.eventAt = () => null; } maps.add(m.id); };
    const dirs = ['right', 'up', 'left', 'down']; let di = 0, t0 = performance.now(), lastX = app.pos.x, lastZ = app.pos.z, lastChk = t0, seg = t0;
    const tick = () => {
      guard(); const now = performance.now(); dirs.forEach((k, i) => K[k] = i === di);
      if (now - lastChk > 500) { const mv = Math.hypot(app.pos.x - lastX, app.pos.z - lastZ); lastX = app.pos.x; lastZ = app.pos.z; lastChk = now; if (mv < 0.3) { di = (di + 1) % 4; seg = now; } }
      if (now - seg > 9000) { di = (di + 1) % 4; seg = now; }
      if (now - t0 < SECS * 1000) requestAnimationFrame(tick);
      else { dirs.forEach((k) => K[k] = false); app.frame = of; if (po) po.disconnect(); for (const [m, [wa, ea]] of keep) { m.warpAt = wa; m.eventAt = ea; }
        const s = iv.slice(30).sort((a, b) => a - b); const q = (k) => +s[Math.min(s.length - 1, Math.floor(s.length * k))].toFixed(1);
        const st = {}; Object.keys(app.stats || {}).forEach((k) => { if (stats0[k] !== app.stats[k] && /^(build|slice)_/.test(k)) st[k] = app.stats[k]; });
        res({ frames: iv.length, fps: +(iv.length / SECS).toFixed(1), p50: q(0.5), p90: q(0.9), p99: q(0.99), max: +s[s.length - 1].toFixed(1), over33: s.filter((x) => x > 33.4).length, over50: s.filter((x) => x > 50).length, over100: s.filter((x) => x > 100).length, longTasks: long.length, longMax: long.length ? Math.max.apply(null, long) : 0, longList: long.slice(0, 30), maps: [...maps], built: st, pos: [W.player.x, W.player.y, W.map.id] }); }
    };
    requestAnimationFrame(tick);
  }), SECS);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  console.log(MAP, TAG, JSON.stringify(R)); R.errors = errs; R.start = start;
  fs.writeFileSync(OUT + 'logs/perf89rt_' + TAG + '_' + MAP + '.json', JSON.stringify(R, null, 1));
  await br.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
