// v7.9.3 城壁の町の楼門（3D・ヘッドレス）：対象の町をまわって、楼門の数とエラーを見る。いくつかは画像
// 使い方：/home/claude/work/p3d で bash withenv.sh node <このファイル>（PORT で配信中の 3d/index.html または index.html を開く）
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v79/';
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const TOWNS = ['rivel_town', 'sentra_capital', 'node_city', 'scheduled_district', 'magicka_city', 'sahar_city', 'mirror_market', 'ignas_town', 'neon_town', 'nereia_city'];
const SHOTS = { sahar_city: 1, magicka_city: 1, ignas_town: 1 };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); const warns = []; p.on('console', (m) => { if (/wallgate/.test(m.text())) warns.push(m.text()); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = () => { }; });
  await p.waitForTimeout(1200); const res = {};
  for (const id of TOWNS) {
    const pos = await p.evaluate((id) => { const m = World.getMap(id); const ws = (MAP_DEFS[id].warps || []).filter((w) => w.y >= m.h - 2 && MAP_DEFS[w.to] && (MAP_DEFS[w.to].kind === 'field' || MAP_DEFS[w.to].region)); const w = ws[Math.floor(ws.length / 2)]; if (!w) return null; for (let k = 3; k < 8; k++) { if (m.passable(w.x, w.y - k, State.data)) return [w.x, w.y - k]; } return [w.x, w.y - 3]; }, id);
    if (!pos) { res[id] = 'no exit'; continue; }
    await p.evaluate(([id, x, y]) => { World.busy = false; World.enterMap(id, x, y, 'down', { raw: true }); }, [id, pos[0], pos[1]]);
    await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && !MTQ3D.building, id, { timeout: 240000 });
    const n = await p.evaluate(() => (MTQ3D.current.wallGates || []).length); res[id] = n;
    if (SHOTS[id]) { await p.evaluate(() => { MTQ3D.lighting.preview = 0.45; MTQ3D.camera.setPitch(30); MTQ3D.camera.wantDist = 16; }); await p.waitForTimeout(3000); await p.screenshot({ path: SHOT + 'gate_town_' + id + '.jpg', type: 'jpeg', quality: 80 }); }
  }
  console.log('wallGates', JSON.stringify(res));
  ok(res.rivel_town === 1 && res.sentra_capital === 1 && res.sahar_city === 1, '中世・砂漠の城壁の町に楼門がある ' + JSON.stringify(res));
  ok(!warns.length, '楼門の組み立ての警告なし ' + warns.slice(0, 2).join(' / '));
  ok(!errs.length, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); await br.close(); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
