// v7.9.3 推奨レベル（3D・ヘッドレス）：フィールド・地域に入ると画面の上に推奨レベル、地名のとなりにいつも表示。町の中は出さない
// 使い方：/home/claude/work/p3d で bash withenv.sh node <このファイル>（PORT で配信中の 3d/index.html または index.html を開く）
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v79/';
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = () => { }; });
  await p.waitForTimeout(1200);
  const enter = async (map, locId) => { await p.evaluate(([map, locId]) => { World.busy = false; const m = World.getMap(map); const L = locId ? m.def.locations.find((l) => l.id === locId) : null; let x = 5, y = 5; if (L) { outer: for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = L.x + dx, Y = L.y + dy; if (m.passable(X, Y, State.data) && !m.warpAt(X, Y) && !Tiles.isWater(m.tiles[Y][X])) { x = X; y = Y; break outer; } } } World.enterMap(map, x, y, 'down', { raw: true }); }, [map, locId]);
    await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && !MTQ3D.building, map, { timeout: 240000 }); };
  const shown = async () => { try { await p.waitForFunction(() => { const b = document.getElementById('rec-banner'); return b && b.classList.contains('show'); }, null, { timeout: 5000 }); } catch (e) { /* 出なかった＝下の確認で NG */ } await p.waitForTimeout(450); };
  const ui = () => p.evaluate(() => { const b = document.getElementById('rec-banner'); const h = document.querySelector('#hud .hud-rec'); const r = b ? b.getBoundingClientRect() : null; return { banner: b ? b.textContent : null, show: !!(b && b.classList.contains('show')), op: b ? getComputedStyle(b).opacity : null, rect: r && [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], hud: h ? h.textContent : null }; });
  await enter('world_grania', 'verum_town'); await shown(); const a = await ui(); await p.screenshot({ path: SHOT + 'reclevel_grania.jpg', type: 'jpeg', quality: 82 });
  ok(a.show && /推奨レベル/.test(a.banner) && /グラニア/.test(a.banner) && /^推奨Lv \d/.test(a.hud || '') && a.rect && a.rect[2] > 100, '3D：グラニアに入ると画面の上に「' + a.banner + '」・地名のとなりに「' + a.hud + '」' + JSON.stringify(a.rect));
  await p.waitForTimeout(3600); const a2 = await ui(); ok(!a2.show && /^推奨Lv/.test(a2.hud || ''), '3D：画面の上の表示は数秒で消える・地名のとなりは残る');
  await enter('verum_town'); await p.waitForTimeout(500); const b = await ui(); ok(!b.hud, '3D：町の中では地名のとなりに出さない');
  await enter('world', 'poyo_village'); await shown(); const c = await ui(); await p.screenshot({ path: SHOT + 'reclevel_arcadia.jpg', type: 'jpeg', quality: 82 });
  ok(c.show && /アルカディア/.test(c.banner), '3D：アルカディアに戻ると「' + c.banner + '」');
  ok(!errs.length, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); await br.close(); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
