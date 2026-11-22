// v9.11 旧時代の廃墟：3D の見た目を撮る（ヘッドレス Chromium・ソフトウェア描画。実機ではない）
//   PORT=8894 node docs/tools/ruins/ruins_shots.js [残骸の ID,...]   → docs/ruins/shots/ruin_<ID>.jpg と logs/ruins_shots.json
//   それぞれの残骸の南（手前）に主人公を置いて撮る。QUALITY=high|low（既定 high）
const { chromium } = require('playwright'); const fs = require('fs'); const PORT = process.env.PORT || 8894; const OUT = process.env.OUT || '/home/claude/envwork/docs/ruins/';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); const Q = process.env.QUALITY || 'high'; await ctx.addInitScript((q) => { try { localStorage.setItem('mtq3d-quality', q); } catch (e) { } }, Q);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html?nosw`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready', 'kalion_open', 'yorn_letter_done', 'zeromea_choice_done', 'airship_ready'].forEach((f) => { d.flags[f] = true; }); d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true; d.settings.encounter = 'off'; World.start(); });
  await p.waitForTimeout(1500);
  const want = (process.argv[2] || 'liberty,giza,tokyo_tower,eiffel,colosseum,parthenon,big_ben,taj,golden_gate,opera').split(',');
  const rec = {};
  for (const id of want) {
    const e = await p.evaluate((id) => { const R = Ruins3121; let e = R.find(id); if (!e && /^city:/.test(id)) e = R.all().filter((x) => x.city === id.slice(5))[0]; if (!e && /^kind:/.test(id)) e = R.all().filter((x) => x.kind === id.slice(5) && !x.site)[0]; return e; }, id);
    if (!e) { ok(false, id + '：一覧にない'); continue; }
    // 主人公の立つ所：残骸の南（手前）で、歩けるマス（なければ残骸のマス）
    const pos = await p.evaluate((e) => { const m = World.getMap(e.map); const r = Math.ceil(e.r) + 1; const X = Math.floor(e.x), Y = Math.floor(e.y); const okT = (x, y) => x >= 1 && y >= 1 && x < m.w - 1 && y < m.h - 1 && !Tiles.isSolid(m.tile(x, y)) && !Tiles.isWater(m.tile(x, y)); for (const [dx, dy] of [[0, r], [1, r], [-1, r], [0, r + 1], [2, r], [-2, r], [r, 0], [-r, 0], [0, -r], [0, 0]]) if (okT(X + dx, Y + dy)) return [X + dx, Y + dy]; return [Math.min(m.w - 2, Math.max(1, X)), Math.min(m.h - 2, Math.max(1, Y + r))]; }, e);
    await p.evaluate(([map, x, y]) => { World.busy = false; World.enterMap(map, x, y, 'up', { raw: true }); }, [e.map, pos[0], pos[1]]);
    await p.waitForFunction((map) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === map && !MTQ3D.building, e.map, { timeout: 300000 }).catch(() => { });
    await p.waitForTimeout(Q === 'high' ? 6000 : 3500);
    const st = await p.evaluate(() => { const ms = MTQ3D.current; const b = ms && (ms.builder || ms.world || ms.wb); const s = b && b.stats && b.stats.ruins; return s ? { count: s.count, failed: s.failed, tris: s.tris, meshes: s.meshes, sites: s.sites } : null; });
    rec[id] = { e, pos, stats: st };
    ok(st && st.count > 0 && !(st.failed || []).length, `${id}（${e.kind}・${e.map} ${e.x},${e.y}・${e.ground}）：この地図の廃墟 ${st ? st.count : '?'}・三角 ${st ? st.tris : '?'}・形 ${st ? st.meshes : '?'}・失敗 ${st ? (st.failed || []).join(' ') || 'なし' : '?'}`);
    await p.screenshot({ path: `${OUT}shots/ruin_${id.replace(/[^a-z0-9_]/gi, '_')}.jpg`, type: 'jpeg', quality: 80, timeout: 120000 });
  }
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  fs.writeFileSync(OUT + 'logs/ruins_shots.json', JSON.stringify(rec, null, 1));
  console.log('結果 ruins shots：NG ' + fails.length); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
