// v8.9 歩いている間に、毎コマ書き換わっている画面の部品（DOM）を数える（レイアウトのやり直しの原因さがし）
const { chromium } = require('playwright');
const BASE = process.env.BASE || ('http://localhost:' + (process.env.PORT || 8791)); const MAP = process.env.MAP || 'poyo_village';
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const p = await ctx.newPage(); await p.goto(BASE + '/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; World.start(); World.encounter = () => { }; });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 }); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => new Promise((res) => {
    MTQ3D.paused = true; const K = Engine.Input.keys; K.left = true; const rec = {}; let frames = 0;
    const mo = new MutationObserver((list) => { list.forEach((m) => { const t = m.target.nodeType === 3 ? m.target.parentNode : m.target; const k = m.type + ':' + (t.id ? '#' + t.id : (t.className && t.className.baseVal === undefined ? '.' + String(t.className).split(' ')[0] : t.nodeName)) + (m.attributeName ? '@' + m.attributeName : ''); rec[k] = (rec[k] || 0) + 1; }); });
    mo.observe(document.body, { subtree: true, attributes: true, childList: true, characterData: true });
    const lay = []; const step = () => { frames++; const a = performance.now(); MTQ3D.ui.layout(); const b = performance.now(); MTQ3D.ui.layout(); const c = performance.now(); lay.push([b - a, c - b]); if (frames < 120) requestAnimationFrame(step); else { mo.disconnect(); K.left = false; res({ frames, rec, layout1: lay.reduce((s, x) => s + x[0], 0) / lay.length, layout2: lay.reduce((s, x) => s + x[1], 0) / lay.length }); } };
    requestAnimationFrame(step);
  }));
  console.log(JSON.stringify(r, null, 1)); await br.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
