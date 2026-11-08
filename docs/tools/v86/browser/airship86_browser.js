// v8.6 飛空艇を呼ぶ：画面での確かめ（ヘッドレス Chromium・Playwright。実機の GPU・スマホではない）
//  PC（1000×650）：3D 版・2D 版で、町の中の F（呼べない通知）→ フィールドの F（呼んで乗る）→ 右へ飛ぶ → Enter で着陸
//    3D 版は、呼んだ直後に飛空艇が空から降りてくるか（3D の飛空艇の高さを時間ごとに記録）・降りる間は主人公が見えていて、そのあと隠れるか
//  スマホ（iPhone 13 縦・横のまね）：3D 版で馬車と飛空艇を持っているとき、操作パネルの「飛空艇」ボタンが出て、押せて（ほかの物に隠れない）、押すと乗るか
//  この作業環境の 3D 版のフィールドの描画は 1 秒に 1〜2 コマなので、記録はまばら
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8791; const OUT = process.env.OUT || '/home/claude/envwork/docs/arch86/'; fs.mkdirSync(OUT + 'logs', { recursive: true }); fs.mkdirSync(OUT + 'shots', { recursive: true });
const CASES = (process.env.CASES || 'pc3d,pc2d,port3d,land3d').split(',');
const setup = (p) => p.evaluate(() => {
  document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
  State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 0; World.start(); World.encounter = () => { };
  d.flags.airship_owned = true; Vehicle.unlockIfReady(); if (window.Carriage) Carriage.give(); if (window.AirshipCall86) AirshipCall86.updateUI();
  const m = World.getMap('world'); const def = VEHICLES.airship; const okT = (x, y) => def.landOn.indexOf(m.tiles[y][x]) >= 0 && m.passable(x, y, d) && !m.warpAt(x, y) && !(m.npcAt && m.npcAt(x, y)) && !(m.eventAt && m.eventAt(x, y));
  for (let y = 6; y < m.h - 6; y++) for (let x = 6; x < m.w - 12; x++) { let n = 0; while (n < 7 && okT(x + n, y) && okT(x + n, y - 1) && okT(x + n, y + 1)) n++; if (n >= 7) return { x, y, home: Object.assign({}, Vehicle.state('airship')) }; }
  return null;
});
(async () => {
  const br = await chromium.launch(); const all = {};
  for (const c of CASES) {
    const is3d = /3d/.test(c); const dev = c === 'port3d' ? devices['iPhone 13'] : c === 'land3d' ? devices['iPhone 13 landscape'] : { viewport: { width: 1000, height: 650 } };
    const ctx = await br.newContext(Object.assign({}, dev)); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
    await p.goto(`http://localhost:${PORT}/${is3d ? '3d/' : ''}index.html`);
    if (is3d) await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); else await p.waitForFunction(() => window.World && window.State && window.Engine && Engine.scenes.length, null, { timeout: 120000 });
    const spot = await setup(p); const res = { case: c, spot };
    const enter = async (id, x, y) => { await p.evaluate(([id, x, y]) => { World.busy = false; World.enterMap(id, x, y, 'right', { raw: true }); }, [id, x, y]); if (is3d) await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && !MTQ3D.building, id, { timeout: 240000 }); await p.waitForTimeout(is3d ? 2500 : 600); };
    const state = () => p.evaluate(() => ({ aboard: State.data.aboard || null, map: World.map.id, x: World.player.x, y: World.player.y, ship: Object.assign({}, Vehicle.state('airship') || {}), toast: (document.getElementById('toast') || {}).textContent || '' }));
    if (c === 'pc3d' || c === 'pc2d') {
      // 町の中の F
      await enter('poyo_village', 16, 7); await p.keyboard.press('f'); await p.waitForTimeout(is3d ? 1500 : 400); const town = await state();
      res.town = { aboard: town.aboard, toast: town.toast, ok: !town.aboard && /外のフィールドでだけ/.test(town.toast) };
      // フィールドの F
      await enter('world', spot.x, spot.y);
      if (is3d) await p.evaluate(() => { window.__h86 = []; const f = () => { if (!window.__h86) return; const o = (MTQ3D.vehicleInfo() || []).find((v) => v.key === 'airship'); window.__h86.push({ t: Date.now(), y: o ? o.y : null, vis: o ? o.visible : null, hero: MTQ3D.hero && MTQ3D.hero.root.visible, k: MTQ3D.callK86 }); requestAnimationFrame(f); }; requestAnimationFrame(f); });
      const tCall = Date.now(); await p.keyboard.press('f');
      if (is3d) { await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}shots/${c}_descending.jpg`, type: 'jpeg', quality: 80 }); }
      await p.waitForTimeout(is3d ? 3500 : 800); const called = await state();
      await p.screenshot({ path: `${OUT}shots/${c}_aboard.jpg`, type: 'jpeg', quality: 80 });
      res.call = { aboard: called.aboard, at: [called.x, called.y], ship: [called.ship.map, called.ship.x, called.ship.y], toast: called.toast, ok: called.aboard === 'airship' && called.ship.map === 'world' && called.ship.x === spot.x && called.ship.y === spot.y };
      if (is3d) { const h = await p.evaluate(() => { const a = window.__h86 || []; window.__h86 = null; return a; }); const rel = h.map((r) => ({ ms: r.t - h[0].t, y: r.y, hero: r.hero, k: r.k !== undefined ? +(+r.k).toFixed(2) : null }));
        res.descent = { samples: rel.filter((r, i) => i % Math.max(1, Math.floor(rel.length / 14)) === 0).slice(0, 16), maxY: Math.max.apply(null, rel.map((r) => r.y || 0)), finalY: rel.length ? rel[rel.length - 1].y : null, heroVisibleDuring: rel.some((r) => r.k > 0 && r.k < 0.85 && r.hero), heroHiddenAfter: rel.length ? rel[rel.length - 1].hero === false : null };
        res.descent.ok = res.descent.maxY > res.descent.finalY + 5 && res.descent.heroHiddenAfter === true; }
      // 右へ飛ぶ → 着陸
      const x0 = called.x; await p.keyboard.down('ArrowRight'); await p.waitForFunction((x0) => World.player.x >= x0 + 2, x0, { timeout: 240000, polling: 200 }).catch(() => { }); await p.keyboard.up('ArrowRight');
      await p.waitForFunction(() => !World.player.moving, null, { timeout: 60000 }).catch(() => { }); await p.waitForTimeout(is3d ? 1500 : 300);
      const flew = await state(); await p.keyboard.press('Enter'); await p.waitForTimeout(is3d ? 2500 : 500); const landed = await state();
      res.fly = { from: x0, to: flew.x, aboardWhileFlying: flew.aboard, landedAboard: landed.aboard, shipAt: [landed.ship.x, landed.ship.y], toast: landed.toast, ok: flew.x >= x0 + 2 && flew.aboard === 'airship' && !landed.aboard && landed.ship.x === landed.x };
      await p.screenshot({ path: `${OUT}shots/${c}_landed.jpg`, type: 'jpeg', quality: 80 });
    } else {
      // スマホ：フィールドで操作パネルの「飛空艇」
      await enter('world', spot.x, spot.y); await p.waitForTimeout(1000);
      const ui = await p.evaluate(() => { const b = document.getElementById('mp-airship'), cb = document.getElementById('mp-carriage'); const r = b.getBoundingClientRect(); const t = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
        const btns = [...document.querySelectorAll('#pad .mp-tools button, #g3-tools button')].filter((o) => o.offsetParent !== null || getComputedStyle(o).position === 'fixed' || o.getClientRects().length).map((o) => ({ l: o.textContent.trim(), r: o.getBoundingClientRect() })).filter((o) => o.r.width > 0);
        const hits = []; for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) { const a = btns[i].r, q = btns[j].r; const ix = Math.min(a.right, q.right) - Math.max(a.left, q.left), iy = Math.min(a.bottom, q.bottom) - Math.max(a.top, q.top); if (ix > 1 && iy > 1) hits.push(btns[i].l + '×' + btns[j].l); }
        return { shown: b.style.display !== 'none' && r.width > 0, carriageShown: cb && cb.style.display !== 'none', rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], top: t === b || b.contains(t), coveredBy: t && t !== b && !b.contains(t) ? String(t.className || t.id || t.tagName) : null, overlaps: hits, buttons: btns.map((o) => o.l + '@' + Math.round(o.r.left) + ',' + Math.round(o.r.top)) }; });
      await p.screenshot({ path: `${OUT}shots/${c}_pad.jpg`, type: 'jpeg', quality: 80 });
      let tapErr = null; try { await p.locator('#mp-airship').tap({ timeout: 30000 }); } catch (e) { tapErr = String(e.message).split('\n').filter((l) => /intercepts/.test(l))[0] || String(e.message).slice(0, 100); }
      await p.waitForTimeout(3500); const after = await state(); const on = await p.evaluate(() => document.getElementById('mp-airship').classList.contains('on78'));
      res.ui = ui; res.tap = { tapErr, aboard: after.aboard, lit: on, ok: !tapErr && after.aboard === 'airship' && on && ui.top && ui.shown };
      await p.screenshot({ path: `${OUT}shots/${c}_aboard.jpg`, type: 'jpeg', quality: 80 });
    }
    res.pageErrors = errs; console.log(JSON.stringify(res)); all[c] = res; await ctx.close();
  }
  fs.writeFileSync(OUT + 'logs/airship86_browser.json', JSON.stringify(all, null, 1)); await br.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
