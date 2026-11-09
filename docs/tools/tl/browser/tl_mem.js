// v9.0 読み込みの重さとメモリ（ヘッドレス Chromium・ソフトウェア描画。実機ではない）：BASE=… TAG=before|after node tl_mem.js
//   3D 版（スマホ相当 390×844・軽量）を開いて、準備ができるまでの時間・JS のメモリ（使っている量）・スクリプトの数を 3 回測る
//   実践道場を 1 問開いて閉じたあとのメモリも測る（道場のスクリプトが増えたぶん）
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:8792'; const TAG = process.env.TAG || 'after'; const OUT = process.env.OUT || '/home/claude/envwork/docs/trading-learning/';
(async () => {
  const runs = [];
  for (let k = 0; k < 3; k++) {
    const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
    const t0 = Date.now(); await p.goto(BASE + '/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); const tReady = Date.now() - t0;
    await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; World.start(); World.encounter = () => { }; });
    await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 300000 }); await p.waitForTimeout(3000);
    const m = async () => { const r = await cdp.send('Performance.getMetrics'); const o = {}; r.metrics.forEach((x) => { o[x.name] = x.value; }); return { heapMB: +(o.JSHeapUsedSize / 1048576).toFixed(1), nodes: o.Nodes, scriptMs: Math.round(o.ScriptDuration * 1000) }; };
    const atField = await m(); const scripts = await p.evaluate(() => document.querySelectorAll('script[src]').length);
    let afterDojo = null;
    if (await p.evaluate(() => !!window.PracticeUI)) { await p.evaluate(() => { MTQ3D.paused = true; const sd = PRACTICE_SEEDS.learn.similar[1]; PracticeUI.play({ level: 6, lvDef: PracticeUI.LEVELS[5], pick: { seed: sd, cat: 'similar', set: 'learn' } }); }); await p.waitForSelector('#ui .practice-panel'); await p.waitForTimeout(800);
      await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); MTQ3D.paused = false; }); await p.waitForTimeout(1500); await cdp.send('HeapProfiler.collectGarbage').catch(() => { }); afterDojo = await m(); }
    runs.push({ tReady, scripts, atField, afterDojo }); await br.close();
  }
  const med = (f) => { const a = runs.map(f).filter((x) => x !== null && x !== undefined).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
  const out = { tag: TAG, base: BASE, runs, median: { tReady: med((r) => r.tReady), heapMB: med((r) => r.atField.heapMB), scripts: med((r) => r.scripts), heapAfterDojoMB: med((r) => r.afterDojo && r.afterDojo.heapMB) }, note: 'ヘッドレス Chromium（ソフトウェア描画）。実機の数ではない' };
  fs.mkdirSync(OUT + 'logs', { recursive: true }); fs.writeFileSync(`${OUT}logs/tl_mem_${TAG}.json`, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out.median));
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
