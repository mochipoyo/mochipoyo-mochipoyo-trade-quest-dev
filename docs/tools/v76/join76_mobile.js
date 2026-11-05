// v7.6 つないだ世界（3D）：スマホの画面（iPhone 13 横向きの大きさ・タッチ）で、移動スティックを押して境目を越える（ヘッドレス・低画質）
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v76/join76/'; fs.mkdirSync(SHOT, { recursive: true });
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ ...devices['iPhone 13 landscape'] }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready'].forEach((f) => d.flags[f] = true); d.hero.level = 30; d.settings.pad = 'stick'; World.start(); });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const m = World.getMap('world'); let t = null; for (let y = 30; y < 90 && !t; y++) if (Vehicle.terrainOk('sailboat', m, 155, y) && Vehicle.terrainOk('sailboat', m, 159, y) && Vehicle.terrainOk('sailboat', World.getMap('world_grania'), 2, y)) t = { x: 155, y }; const d = State.data; World.busy = false; d.aboard = 'sailboat'; d.vehicles.sailboat = { owned: true, map: 'world', x: t.x, y: t.y, port: { map: 'world', x: t.x, y: t.y } }; World.enterMap('world', t.x, t.y, 'right', { raw: true }); if (window.MobileUI && MobileUI.setCtx) try { MobileUI.setCtx('world'); } catch (e) { } });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map.id === 'world', null, { timeout: 240000 });
  await p.waitForTimeout(2000);
  const box = await p.evaluate(() => { const el = document.querySelector('.mp-stick'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, vis: getComputedStyle(el).display !== 'none' && r.width > 0 }; });
  ok(box && box.vis, 'スマホの移動スティックが出ている ' + JSON.stringify(box));
  if (box && box.vis) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y }] });
    for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + i * 8, y: box.y }] }); await p.waitForTimeout(60); }
    const t0 = Date.now(); while (Date.now() - t0 < 300000) { const id = await p.evaluate(() => World.map.id); if (id !== 'world') break; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + 48 + ((Date.now() / 300) % 2), y: box.y }] }); await p.waitForTimeout(250); }
    await p.waitForTimeout(800); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => { const P = World.player, pos = MTQ3D.pos; return { map: World.map.id, cur: MTQ3D.current.map.id, dist: +Math.hypot(pos.x - (P.x + 0.5), pos.z - (P.y + 0.5)).toFixed(2) }; });
    ok(r.map === 'world_grania' && r.cur === 'world_grania' && r.dist < 1.6, 'スティックを右へ倒したまま、帆船で境目を越えた（画面の切り替えなし）' + JSON.stringify(r));
    await p.screenshot({ path: SHOT + 'mobile_crossed.jpg', type: 'jpeg', quality: 80, timeout: 240000 });
  }
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
