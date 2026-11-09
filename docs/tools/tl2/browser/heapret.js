const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await p.goto('http://localhost:' + process.env.PORT + '/index.html'); await p.waitForFunction(() => window.State && window.PracticeUI);
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; World.start(); });
  await p.waitForTimeout(1000);
  for (let k = 0; k < 3; k++) {
    await p.evaluate(() => { window.__r = null; PracticeUI.play({ level: 6, lvDef: PracticeUI.LEVELS[5], pick: { seed: PRACTICE_SEEDS.learn.similar[1], cat: 'similar', set: 'learn' } }).then((r) => { window.__r = r; }); });
    await p.waitForFunction(() => !!document.querySelector('#ui .practice-panel #pd-chart')); await p.waitForTimeout(300);
    await p.evaluate(() => { if (!window.PanelTag) window.PanelTag = class PanelTag { }; document.querySelector('#ui .practice-panel').__tag = new PanelTag(); });
    await p.evaluate(() => { const pl = PracticeUI.current.play; pl.answers = { '1d': 'up', '4h': 'up' }; pl.bias = 'neutral'; document.querySelector('.practice-panel [data-cmd="hyp"]').click(); document.querySelector('.practice-panel [data-cmd="skip"]').click(); });
    await p.waitForFunction(() => !!document.querySelector('#ui .pd-review')); await p.evaluate(() => document.querySelector('#ui .pd-review [data-cmd="end"]').click()); await p.waitForFunction(() => window.__r); await p.waitForTimeout(300);
  }
  await p.evaluate(() => { window.__r = null; });
  await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.collectGarbage');
  let chunks = []; cdp.on('HeapProfiler.addHeapSnapshotChunk', (e) => chunks.push(e.chunk)); await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  const snap = JSON.parse(chunks.join('')); const m = snap.snapshot.meta; const NF = m.node_fields.length, EF = m.edge_fields.length; const nodes = snap.nodes, edges = snap.edges, strings = snap.strings;
  const nType = m.node_types[0], eType = m.edge_types[0]; const iName = m.node_fields.indexOf('name'), iEC = m.node_fields.indexOf('edge_count'), iDet = m.node_fields.indexOf('detachedness'), iType = m.node_fields.indexOf('type');
  const eT = m.edge_fields.indexOf('type'), eN = m.edge_fields.indexOf('name_or_index'), eTo = m.edge_fields.indexOf('to_node');
  const N = nodes.length / NF; const first = new Int32Array(N); let ei = 0; for (let i = 0; i < N; i++) { first[i] = ei; ei += nodes[i * NF + iEC] * EF; }
  const rev = Array.from({ length: N }, () => []);
  for (let i = 0; i < N; i++) { const s = first[i], c = nodes[i * NF + iEC]; for (let k = 0; k < c; k++) { const e = s + k * EF; const t = edges[e + eTo] / NF; const ty = eType[edges[e + eT]]; if (ty === 'weak') continue; rev[t].push([i, ty, ty === 'element' || ty === 'hidden' ? edges[e + eN] : strings[edges[e + eN]]]); } }
  const name = (i) => strings[nodes[i * NF + iName]]; const tags = []; for (let i = 0; i < N; i++) if (name(i) === 'PanelTag' && nodes[i * NF + iType] === m.node_types[0].indexOf('object')) tags.push(i);
  console.log('tags', tags.length); const canv = tags.map((t) => { const r = rev[t].find((x) => x[2] === '__tag'); return r ? r[0] : null; }).filter((x) => x !== null);
  for (const c of canv.slice(0, 3)) {
    const prev = new Map([[c, null]]); const q = [c]; let root = null;
    for (let h = 0; h < q.length && !root; h++) { const x = q[h]; for (const [f, ty, nm] of rev[x]) { if (prev.has(f)) continue; prev.set(f, [x, ty, nm]); if (name(f) === '(GC roots)' || /^Window /.test(name(f)) || /^system \/ Context/.test('') ) { root = f; break; } q.push(f); } }
    const path = []; let k = root; while (k !== null && k !== undefined && k !== c) { const pr = prev.get(k); path.push(name(k).slice(0, 60) + ' -[' + pr[1] + ':' + String(pr[2]).slice(0, 40) + ']->'); k = pr[0]; }
    console.log('PATH for canvas', c, '\n  ' + path.slice(0, 40).join('\n  '));
  }
  await br.close();
})();
