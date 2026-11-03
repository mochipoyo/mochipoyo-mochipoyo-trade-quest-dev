// v6.8 道・壁・境界線の丸み（アルカディア）：3D版でアルカディアの町・フィールド・ダンジョンを撮る（変更の前後の比較用）
// 作業用のフォルダ（CommonJS）にコピーして実行する。環境変数 TAG（before/after）・MAPS（カンマ区切り。省略時は下の一覧）・ROUND（off／all）・SHOTDIR・PORT・DEV・LAND
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = process.env.SHOTDIR || '/home/claude/work/p3d/shots/v68e/'; fs.mkdirSync(SHOT, { recursive: true }); const TAG = process.env.TAG || 'after';
// [マップ, x, y, 向き]（x・y を省くと、その町へ入るワープの到着位置）
const SPOTS = (process.env.MAPS ? process.env.MAPS.split(',').map((s) => s.split(':')) : [['world', 0, 0], ['poyo_village'], ['rivel_town'], ['dow_village'], ['harbor_town'], ['rivel_artisan'], ['lost_forest'], ['oblivion_cave_1'], ['emal_pass'], ['bandit_hideout'], ['oblivion_cave_lake']]);
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); let ctxOpt = { viewport: { width: 1280, height: 720 } };
  if (process.env.DEV) { const dv = Object.assign({}, devices[process.env.DEV], { deviceScaleFactor: 1 }); if (process.env.LAND) dv.viewport = { width: dv.viewport.height, height: dv.viewport.width }; ctxOpt = dv; }
  const ctx = await br.newContext(ctxOpt); if (process.env.ROUND) await ctx.addInitScript((v) => { try { localStorage.setItem('mtq3d-round', v); } catch (e) { } }, process.env.ROUND);   // ROUND=off（以前の形）／all（全地域）
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`);
  await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.hero.level = 20; ['lina', 'kyle'].forEach((id) => State.joinCompanion(id)); World.start(); World.busy = false; });
  const out = [];
  for (const sp of SPOTS) {
    const r0 = await p.evaluate((sp) => {
      const id = sp[0]; let x = sp[1] !== undefined && sp[1] !== '' ? +sp[1] : null, y = sp[2] !== undefined && sp[2] !== '' ? +sp[2] : null;
      if (id === 'world' && !x) { const L = (MAP_DEFS.world.locations || []).find((l) => l.id === 'poyo_village' || l.to === 'poyo_village'); if (L) { x = L.x; y = L.y + 2; } }
      if (x === null) { for (const k of Object.keys(MAP_DEFS)) { const w = (MAP_DEFS[k].warps || []).find((w) => w.to === id); if (w) { x = w.tx; y = w.ty; break; } } }
      if (x === null) { x = 2; y = 2; }
      World.busy = false; World.enterMap(id, x, y, sp[3] || 'up'); return { id, x, y };
    }, sp);
    await p.waitForFunction((id) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === id && World.map && World.map.id === id, r0.id, { timeout: 90000 }).catch(() => { });
    await p.waitForTimeout(2500);
    const st = await p.evaluate((id) => {
      // 形の検査：位置・法線に NaN がないか、壁の三角形の数
      let nan = 0, tris = 0; const cur = MTQ3D.current; if (cur) cur.root.traverse((o) => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return; const a = o.geometry.attributes.position.array; for (let i = 0; i < a.length; i++) if (!isFinite(a[i])) { nan++; break; } const nn = o.geometry.attributes.normal; if (nn) for (let i = 0; i < nn.array.length; i++) if (!isFinite(nn.array[i])) { nan++; break; } tris += (o.geometry.index ? o.geometry.index.count : a.length / 3) / 3; });
      return { kind: World.map.kind, cov: cur && cur.coverage, round: cur && cur.world ? !!cur.world.round : null, nan, tris: Math.round(tris), world: MTQ3D.stats['world_' + id] || null, build: MTQ3D.stats['build_' + id] || null };
    }, r0.id);
    await p.screenshot({ path: SHOT + TAG + '_' + r0.id + '.jpg', type: 'jpeg', quality: 78, timeout: 120000 });
    console.log(r0.id, r0.x + ',' + r0.y, JSON.stringify(st).slice(0, 300)); out.push(Object.assign(r0, st));
    if (st.cov === 'generic') {
      const want = process.env.ROUND === 'off' || st.kind === 'interior' ? false : process.env.ROUND === 'all' ? true : (st.kind === 'interior' ? false : st.world && st.world.region ? st.world.region === 'arcadia' : null);
      ok(st.nan === 0, r0.id + '：形に NaN がない');
      if (want !== null) ok(st.round === want, r0.id + '：丸み ' + st.round + '（期待 ' + want + '・地域 ' + (st.world && st.world.region) + '）');
    }
  }
  if (process.env.TOGGLE) {   // 3D設定の「道・壁の丸み」：使わない → 今いるマップを作り直す → アルカディアだけに戻す
    await p.evaluate(() => { World.busy = false; World.enterMap('harbor_town', 20, 4, 'down'); });   // アルカディアのマップで切り替える
    await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === 'harbor_town' && !MTQ3D.building, null, { timeout: 90000 }).catch(() => { });
    const id = await p.evaluate(() => World.map.id);
    for (const v of ['off', 'region']) {
      await p.evaluate((v) => { const b = document.querySelector('[data-rd="' + v + '"]'); b.click(); }, v);
      await p.waitForFunction((v) => MTQ3D.current && MTQ3D.current.world && MTQ3D.current.world.round === (v !== 'off') && !MTQ3D.building, v, { timeout: 60000 }).catch(() => { });
      const r = await p.evaluate(() => ({ round: MTQ3D.current && MTQ3D.current.world && MTQ3D.current.world.round, on: (document.querySelector('[data-rd].on') || {}).dataset, ls: localStorage.getItem('mtq3d-round') }));
      ok(r.round === (v !== 'off') && r.on && r.on.rd === v, '3D設定で丸みを「' + v + '」に → ' + id + ' を作り直した（' + JSON.stringify(r) + '）');
      await p.waitForTimeout(1200); await p.screenshot({ path: SHOT + TAG + '_toggle_' + v + '.jpg', type: 'jpeg', quality: 70 });
    }
  }
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  fs.writeFileSync(SHOT + TAG + '_result.json', JSON.stringify({ out, fails, errs }, null, 1));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})();
