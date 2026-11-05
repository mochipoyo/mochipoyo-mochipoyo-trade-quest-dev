// v7.6 つないだ世界：となりの地域を組み立てるときの重い関数（CPU プロファイル・ヘッドレス）
const { chromium } = require('playwright');
const PORT = process.env.PORT || 8772; const START = process.env.START || 'world'; const NB = process.env.NB || 'world_grania';
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'high'); } catch (e) { } });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready'].forEach((f) => d.flags[f] = true); d.hero.level = 30; World.start(); });
  await p.waitForTimeout(1500);
  // 西の真ん中（端から遠い）に置いて、となりを組み立てない状態にする
  await p.evaluate((START) => { const m = World.getMap(START); let t = null; for (let x = 60; x < 150 && !t; x++) for (let y = 30; y < 90; y++) if (Vehicle.terrainOk('sailboat', m, x, y)) { t = { x, y }; break; } const d = State.data; document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; d.aboard = 'sailboat'; d.vehicles.sailboat = { owned: true, map: START, x: t.x, y: t.y, port: { map: START, x: t.x, y: t.y } }; World.enterMap(START, t.x, t.y, 'right', { raw: true }); window.__t = t; }, START);
  await p.waitForFunction((START) => MTQ3D.current && MTQ3D.current.map.id === START, START, { timeout: 180000 });
  await p.waitForTimeout(2000);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 }); await cdp.send('Profiler.start');
  const t0 = Date.now();
  await p.evaluate(([NB]) => { MTQ3D.join.build(NB); }, [NB]);
  await p.waitForFunction((NB) => MTQ3D.cache.get(NB) && !MTQ3D.join.building, NB, { timeout: 300000, polling: 200 });
  const { profile } = await cdp.send('Profiler.stop'); const ms = Date.now() - t0;
  const byId = new Map(profile.nodes.map((n) => [n.id, n])); const self = new Map(); const dt = profile.timeDeltas; let total = 0;
  profile.samples.forEach((id, i) => { const n = byId.get(id); const f = n.callFrame; const k = (f.functionName || '(anon)') + ' ' + (f.url || '').split('/').pop().split('?')[0] + ':' + (f.lineNumber + 1); const d = dt[i] || 0; total += d; self.set(k, (self.get(k) || 0) + d); });
  // 包含時間（ソース上の関数ごと）
  const parent = new Map(); profile.nodes.forEach((n) => (n.children || []).forEach((c) => parent.set(c, n.id)));
  const incl = new Map(); profile.samples.forEach((id, i) => { const seen = new Set(); let cur = id; while (cur) { const f = byId.get(cur).callFrame; const k = (f.functionName || '(anon)') + ' ' + (f.url || '').split('/').pop().split('?')[0] + ':' + (f.lineNumber + 1); if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + (dt[i] || 0)); } cur = parent.get(cur); } });
  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => Math.round(v / 1000) + 'ms ' + k);
  // 組み立ての JS が続けて動いた長さ（ほかのタスク＝描画のループ・待ちに戻るまで）
  const BF = /^(build|build\$\d+|finalize|buildTrees|runRecipe|prepare|groundMaterial|addChest|addMotes|addSearchPoints|dense|surf|rubble)$/;
  const isB = (id) => { let cur = id; let b = false; while (cur) { const f = byId.get(cur).callFrame; if (/^(loop|frame|render)$/.test(f.functionName) && /main-/.test(f.url)) return false; if (BF.test(f.functionName) && /main-/.test(f.url)) b = true; cur = parent.get(cur); } return b; };
  const runs = []; let run = 0, gap = 0, gapT = 0;
  profile.samples.forEach((id, i) => { const d = (dt[i] || 0) / 1000; const f = byId.get(id).callFrame.functionName; if (isB(id)) { run += gapT + d; gap = 0; gapT = 0; } else if (run > 0 && (f === '(program)' || f === '(garbage collector)') && gap < 3) { gap++; gapT += d; } else { if (run > 0) runs.push(run); run = 0; gap = 0; gapT = 0; } });
  if (run > 0) runs.push(run);
  runs.sort((a, b) => b - a);
  console.log('build-runs', JSON.stringify({ n: runs.length, top: runs.slice(0, 8).map(Math.round), total: Math.round(runs.reduce((a, b) => a + b, 0)) }));
  console.log('wall', ms, 'sampled', Math.round(total / 1000), 'stat', await p.evaluate((NB) => MTQ3D.stats['build_' + NB], NB));
  console.log('--- self'); top(self, 25).forEach((l) => console.log(l));
  console.log('--- inclusive'); top(incl, 40).forEach((l) => console.log(l));
  await br.close();
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
