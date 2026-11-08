// v8.8 画面の写しと、はみ出しの確かめ（ヘッドレス Chromium。実機ではない）
//   CASES=pc,tab,p390,p360,land  SCENES=menu,items,equip,settings,prompt,chart,...  VER=2d|3d
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8791; const OUT = process.env.OUT || '/home/claude/envwork/docs/ux88/'; fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
const VER = process.env.VER || '2d';
const VIEW = { pc: { viewport: { width: 1920, height: 1080 } }, tab: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, p390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }, p360: { viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }, land: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } };
const CASES = (process.env.CASES || 'pc,tab,p390,p360,land').split(','); const SCENES = (process.env.SCENES || 'menu,items,equip,settings,prompt').split(',');
const SETUP = require('./scenes88.js');
(async () => {
  const br = await chromium.launch(); const all = {};
  for (const c of CASES) {
    const ctx = await br.newContext(Object.assign({}, VIEW[c])); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200))); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
    await p.goto(`http://localhost:${PORT}/${VER === '3d' ? '3d/' : ''}index.html`);
    if (VER === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); else await p.waitForFunction(() => window.World && window.State && window.Engine && Engine.scenes.length, null, { timeout: 120000 });
    await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; World.start(); World.encounter = () => { }; });
    if (VER === '3d') await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 240000 });
    await p.waitForTimeout(800); await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; });
    const res = {};
    for (const sc of SCENES) {
      try {
        await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; });
        const sel = await SETUP[sc](p);
        await p.waitForTimeout(400);
        const m = await p.evaluate((sel) => { const n = document.querySelector(sel) || document.querySelector('#ui').lastElementChild; if (!n) return null; const r = n.getBoundingClientRect(); const vw = innerWidth, vh = innerHeight;
          const clipped = [...n.querySelectorAll('.rw-item .l, .rw-item .r, .rw-ok, .rw-tab, .rw-tool, .rw-opt, .cb-btn, .cb-info *, button')].filter((x) => { const q = x.getBoundingClientRect(); if (!q.width) return false; return x.scrollWidth > x.clientWidth + 2 && getComputedStyle(x).textOverflow === 'ellipsis'; }).map((x) => x.textContent.slice(0, 20));
          const small = [...n.querySelectorAll('.rw-item, .rw-opt, .rw-ok, .rw-act, .rw-tool, .rw-close, .rw-btn, .cb-btn')].filter((x) => { const q = x.getBoundingClientRect(); return q.width > 0 && q.height < (document.body.classList.contains('mobile') ? 43.5 : 18); }).map((x) => x.className + ':' + Math.round(x.getBoundingClientRect().height)).slice(0, 6);
          const fonts = [...n.querySelectorAll('*')].filter((x) => x.childNodes.length && [...x.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim())).map((x) => parseFloat(getComputedStyle(x).fontSize));
          const pad = document.getElementById('pad'); const padVisible = !!(pad && getComputedStyle(pad).display !== 'none' && pad.getBoundingClientRect().height > 0); return { padVisible: padVisible, uiH: Math.round(document.getElementById('ui').getBoundingClientRect().height), vh: innerHeight, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], inside: r.left >= -1 && r.right <= vw + 1 && r.top >= -1 && r.bottom <= vh + 1, docScroll: document.documentElement.scrollWidth > vw + 2, clipped, small, minFont: fonts.length ? Math.min.apply(null, fonts) : null, mobile: document.body.classList.contains('mobile') }; }, sel);
        await p.screenshot({ path: `${OUT}shots/${VER}_${c}_${sc}.jpg`, type: 'jpeg', quality: 72 });
        res[sc] = m;
      } catch (e) { res[sc] = { error: String(e.message || e).slice(0, 200) }; }
    }
    res.errors = errs; all[c] = res; console.log(VER, c, JSON.stringify(res));
    await ctx.close();
  }
  await br.close(); fs.writeFileSync(`${OUT}logs/shots88_${VER}_${process.env.TAG || 'p1'}.json`, JSON.stringify(all, null, 1));
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
