// v8.4 走る：画面の確かめ（PC 1280×720・スマホの縦／横＝Playwright の端末のまね。実機ではない）
//  ・3D の探索中に「走る」ボタンが出るか・押すと色が付くか・ほかのボタンに重ならないか（ボタンの四角の重なりを数える）
//  ・PC の右の欄「操作方法」に R の行が入るか
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8791; const SHOT = process.env.SHOT || '/home/claude/envwork/docs/arch84/shots/'; const OUT = process.env.OUT || '/home/claude/envwork/docs/arch84/logs/';
fs.mkdirSync(SHOT, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const CASES = [
  { name: 'pc', ctx: { viewport: { width: 1280, height: 720 } } },
  { name: 'phone_port', ctx: Object.assign({}, devices['iPhone 13']) },
  { name: 'phone_land', ctx: Object.assign({}, devices['iPhone 13 landscape']) }
];
(async () => {
  const br = await chromium.launch(); const res = [];
  for (const c of CASES) {
    const ctx = await br.newContext(c.ctx); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
    await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
    await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 0; World.start(); World.encounter = () => { }; World.busy = false; World.enterMap('poyo_village', 20, 30, 'down', { raw: true }); });
    await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === 'poyo_village' && !MTQ3D.building, null, { timeout: 180000 }); await p.waitForTimeout(3000);
    const btn = () => p.evaluate(() => { const b = document.querySelector('#g3-tools [data-a="run"]'); if (!b) return null; const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); const tools = document.getElementById('g3-tools'); return { shown: tools.style.display !== 'none' && cs.display !== 'none' && r.width > 0, on: b.classList.contains('on'), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] }; });
    const b0 = await btn();
    // 押す（タッチの端末はタップ）
    const loc = p.locator('#g3-tools [data-a="run"]'); let tapErr = null; try { if (c.ctx.hasTouch) await loc.tap({ timeout: 30000 }); else await loc.click({ timeout: 30000 }); } catch (e) { tapErr = String(e.message).split('\n').filter((l) => /intercepts/.test(l))[0] || String(e.message).slice(0, 80); }
    // 3D 設定の並びの各ボタンが、押した所でいちばん上にあるか（ほかの物に隠れていないか）
    const toolsTop = await p.evaluate(() => [...document.querySelectorAll('#g3-tools > div:first-child button')].filter((b) => b.offsetParent !== null).map((b) => { const r = b.getBoundingClientRect(); const t = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2); return { label: b.textContent, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], top: t === b || b.contains(t), coveredBy: t && t !== b && !b.contains(t) ? (t.className || t.id || t.tagName) + '' : null }; }));
    await p.waitForTimeout(600); const b1 = await btn(); const dash = await p.evaluate(() => MTQ3D.dash84);
    // 重なり：走るボタンと、ほかの見えているボタン（操作パネル・3D 設定の並び）
    const overlap = await p.evaluate(() => {
      const b = document.querySelector('#g3-tools [data-a="run"]'); const r = b.getBoundingClientRect(); const hits = [];
      document.querySelectorAll('button').forEach((o) => { if (o === b) return; const q = o.getBoundingClientRect(); if (!q.width || getComputedStyle(o).visibility === 'hidden' || o.offsetParent === null) return; const ix = Math.min(r.right, q.right) - Math.max(r.left, q.left), iy = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top); if (ix > 1 && iy > 1) hits.push((o.textContent || o.id || '').trim().slice(0, 16)); });
      // 押した所の一番上の要素が走るボタンか（ほかの物に隠れていないか）
      const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2; const top = document.elementFromPoint(cx, cy); return { hits, topIsButton: top === b || b.contains(top) };
    });
    const guide = await p.evaluate(() => { const r = document.querySelector('#guide .gd-run84'); return r ? { text: r.textContent, visible: r.offsetParent !== null } : null; });
    await p.screenshot({ path: SHOT + 'ui_' + c.name + '.jpg', type: 'jpeg', quality: 80 });
    const rec = { case: c.name, before: b0, after: b1, dash84: dash, tapErr, toolsTop, overlap, guide, errors: errs };
    console.log(JSON.stringify(rec)); res.push(rec);
    await p.evaluate(() => MTQ3D.setDash84(false, true)); await ctx.close();
  }
  fs.writeFileSync(OUT + 'run84_ui.json', JSON.stringify(res, null, 1)); await br.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
