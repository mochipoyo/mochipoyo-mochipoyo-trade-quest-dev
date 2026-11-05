// v7.6 つないだ世界（3D）：飛空艇で境目を越える・まだ行けない地域では止まる
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v76/join76/'; fs.mkdirSync(SHOT, { recursive: true });
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready', 'airship_owned', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived', 'kalion_open'].forEach((f) => d.flags[f] = true); d.hero.level = 30; World.start(); });
  await p.waitForTimeout(1500);
  const place = (map, x, y) => p.evaluate(([map, x, y]) => { const d = State.data; document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; d.aboard = 'airship'; d.vehicles.airship = { owned: true, map, x, y, port: { map, x, y } }; World.enterMap(map, x, y, 'right', { raw: true }); }, [map, x, y]);
  const waitCur = (id) => p.waitForFunction((id) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === id && World.map.id === id, id, { timeout: 240000 }).then(() => true).catch(() => false);
  const go = (dir, n, stopAt) => p.evaluate(async ([dir, n, stopAt]) => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const from = World.map.id; let maxJump = 0, prev = null;
    for (let i = 0; i < n && World.map.id === from; i++) { while (World.player.moving) await sleep(16); const r = World.tryMove(dir); for (let k = 0; k < 60; k++) { await sleep(16); const o = World76.origin(MTQ3D.current.map.id); const c = MTQ3D.camera.camera.position; const g = { x: c.x + o.x, z: c.z + o.y }; if (prev) maxJump = Math.max(maxJump, Math.hypot(g.x - prev.x, g.z - prev.z)); prev = g; if (!World.player.moving) break; } if (!r && stopAt) break; }
    return { map: World.map.id, cur: MTQ3D.current.map.id, x: World.player.x, y: World.player.y, veh: State.data.vehicles.airship.map, aboard: State.data.aboard, maxJump: +maxJump.toFixed(2) }; }, [dir, n, stopAt]);
  // 1) アルカディア → グラニア（陸の上を飛んで越える）
  await place('world', 150, 60); ok(await waitCur('world'), 'アルカディア（飛空艇）');
  await p.waitForFunction(() => MTQ3D.join.shown.has('world_grania'), null, { timeout: 300000 }).catch(() => { });
  const r1 = await go('right', 20); console.log(JSON.stringify(r1));
  ok(r1.map === 'world_grania' && r1.cur === 'world_grania' && r1.veh === 'world_grania' && r1.aboard === 'airship' && r1.maxJump < 1.5, '飛空艇で東の境目を越えてグラニアへ（2D・3D とも・カメラは飛ばない ' + r1.maxJump + '）');
  await p.waitForTimeout(1500); await p.screenshot({ path: SHOT + 'air_1_crossed.jpg', type: 'jpeg', quality: 80, timeout: 240000 });
  // 2) 魔導王国 → 暗黒大陸（まだ行けない）
  await p.evaluate(() => { window.__toasts = []; const t = Win.toast; Win.toast = function (m) { window.__toasts.push(String(m)); return t.apply(this, arguments); }; });
  const L2 = await p.evaluate(() => World76.toLocal(World76.rect('world_dark').x - 6, 150)); await place(L2.map, L2.x, L2.y); ok(await waitCur(L2.map), '暗黒大陸の西の海（' + L2.map + '・飛空艇）');
  const W2 = await p.evaluate((id) => World76.rect(id).w, L2.map); const r2 = await go('right', 20, true); console.log(JSON.stringify(r2));
  ok(r2.map === L2.map && r2.x === W2 - 1, '飛空艇でも、まだ行けない暗黒大陸の境目で止まる（' + r2.map + ' x=' + r2.x + '）');
  const msg = await p.evaluate(() => (window.__toasts || []).join(' / '));
  ok(/黒い嵐/.test(msg), '止まった理由が出る「' + msg.slice(0, 80) + '」');
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
