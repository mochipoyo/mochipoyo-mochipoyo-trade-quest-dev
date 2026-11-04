// v7.6 環境リデザイン：全マップの「当てるレシピ」の一覧と、レシピを当てるマップを1つずつ組み立てて確かめる
//   ・組み立てで失敗しない（Env.errors に記録されない・ページのエラーがない）
//   ・レシピ・建物の形が、歩けるマスの体の高さ（0.15〜1.8）に入っていない（Env.probeWalk のうち、レシピ・建物の形に当たったもの）
//   ・建物（まとめた形 'buildings'）に当たるマスは数だけ記録（扉の前の石段など、従来の建物と同じ形。前後の比較は p76_walk.js）
// 環境変数：PORT・ONLY（"id1,id2"）・KINDS（"town,dungeon,interior"）・LIMIT・PROBE=0（歩けるマスの確認をしない）・OUT
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8772; const KINDS = (process.env.KINDS || 'town,dungeon,interior,field').split(','); const LIMIT = +(process.env.LIMIT || 9999); const PROBE = process.env.PROBE !== '0';
const OUT = process.env.OUT || '/home/claude/work/p3d/shots/v76/all_v1.json';
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 640, height: 400 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html?env=v1`);
  await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; World.start(); World.encounter = () => { }; });
  const plan = await p.evaluate(async () => { await window.MTQ3D_ENV.catalog(MTQ3D.renderer && MTQ3D.renderer.renderer); return window.MTQ3D_ENV.plan(Object.keys(MAP_DEFS), (id) => World.getMap(id)); });
  const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null; const ids = Object.keys(plan).filter((id) => plan[id].recipe && KINDS.includes(plan[id].kind) && (!ONLY || ONLY.includes(id))).slice(0, LIMIT);
  console.log('マップ ' + Object.keys(plan).length + '・レシピを当てる ' + Object.values(plan).filter((v) => v.recipe).length + '・この回で組み立てる ' + ids.length);
  const res = {}; let ng = 0, i = 0; const t0 = Date.now();
  for (const id of ids) {
    i++; const e0 = errs.length;
    const xy = await p.evaluate((id) => { const m = World.getMap(id); const cx = Math.floor(m.w / 2), cy = Math.floor(m.h / 2); for (let r = 0; r < Math.max(m.w, m.h); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue; if (!Tiles.isSolid(m.tile(x, y)) && !(m.npcAt && m.npcAt(x, y)) && !(m.warpAt && m.warpAt(x, y))) return [x, y]; } return [1, 1]; }, id).catch((e) => null);
    if (!xy) { res[id] = { error: 'getMap' }; ng++; continue; }
    await p.evaluate(([id, x, y]) => { World.busy = false; World.enterMap(id, x, y, 'down', { raw: true }); }, [id, xy[0], xy[1]]).catch((e) => errs.push('enter ' + id + ' ' + e.message));
    const okBuilt = await p.waitForFunction((id) => { const c = MTQ3D.cache && MTQ3D.cache.get(id); return c && MTQ3D.current === c; }, id, { timeout: 90000 }).then(() => true).catch(() => false);
    const r = await p.evaluate(([id, probe]) => { const E = window.MTQ3D_ENV; const c = MTQ3D.cache.get(id); const all = probe && c ? (E.probeWalk(c) || []) : []; const hits = all.filter((h) => h.env && !/@ buildings$/.test(h.obj)); const bhits = all.filter((h) => /@ buildings$/.test(h.obj)); return { recipe: c && c.envRecipe ? c.envRecipe.id : null, ms: c && c.buildMs, built: E.built[id] || null, error: E.errors[id] || null, envHits: hits.length, sample: hits.slice(0, 4), buildingHits: bhits.length, bsample: bhits.slice(0, 3) }; }, [id, PROBE]).catch((e) => ({ error: 'eval ' + e.message }));
    r.pageErrors = errs.slice(e0); r.ok = okBuilt && !r.error && r.recipe === plan[id].recipe && !r.pageErrors.length && !r.envHits;
    if (!r.ok) { ng++; console.log('NG  ' + id + ' ' + JSON.stringify(r).slice(0, 400)); }
    res[id] = Object.assign({ kind: plan[id].kind, plan: plan[id].recipe }, r);
    if (i % 25 === 0) console.log(`     ${i}/${ids.length}（${Math.round((Date.now() - t0) / 1000)}秒）NG ${ng}`);
  }
  fs.writeFileSync(OUT, JSON.stringify({ plan, res }, null, 1));
  console.log('結果：' + ids.length + 'マップ中 ' + ng + ' NG'); await br.close(); process.exit(ng ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
