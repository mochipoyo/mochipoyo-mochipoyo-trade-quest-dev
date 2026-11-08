// v8.4 3D 版「歩く／走る」の確かめ（ヘッドレス Chromium・SwiftShader。実機の GPU ではない）
//  ・フィールドの横に長く歩けるマスの列で、→ キーを押し続けたときの 1 秒あたりの進み（マス）と、主人公の動き（クリップ名・再生の速さ）を測る
//  ・PHASE=before：変更前の版（走りの切り替えなし）。キーだけ・Shift を押したまま
//  ・PHASE=after：変更後の版。歩く（最初）・R で走る・もう一度 R で歩く・Shift・3D 設定の「走る」ボタン・再読み込みで覚えているか・
//                 2D の保存（mtq-rpg-v2-*）を書き換えていないか・馬車では速さが変わらないか・隊列の仲間が遅れないか・地域の境目を走って越える
//  ・速さ：この作業環境の描画は 1 秒に 1〜2 コマで実時間では測れないため、measure() の中で移動の処理を 1/60 秒ずつ 60 回動かして出す（ゲーム内の 1 秒の進み）
//  ・注意：この中の follow（隊列）と cross（境目）は実時間で動かす確かめで、この環境では仲間のモデルが出る前・1〜2 マスしか進まないので使えない
//          → 隊列・町の出口・馬車・地域の境目・保存は run84b.js（移動の処理を直接動かす）で確かめた
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8791; const PHASE = process.env.PHASE || 'after';
const OUT = process.env.OUT || '/home/claude/envwork/docs/arch84/logs/'; fs.mkdirSync(OUT, { recursive: true });
const SHOT = process.env.SHOT || ''; if (SHOT) fs.mkdirSync(SHOT, { recursive: true });
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 640, height: 360 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  const boot = async () => { await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); };
  await boot();
  const setup = () => p.evaluate(() => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 0;
    ['kyle', 'mina'].forEach((id) => { try { State.joinCompanion(id); } catch (e) { } });
    World.start(); World.encounter = () => { };
  });
  await setup();
  // 横に 18 マス続けて歩ける列（ワープ・人・イベントなし）を探す
  const findRow = (id) => p.evaluate((id) => {
    const map = World.getMap(id); const d = State.data; const ok = (x, y) => x >= 0 && y >= 0 && x < map.w && y < map.h && map.passable(x, y, d) && !map.warpAt(x, y) && !(map.npcAt && map.npcAt(x, y)) && !(map.eventAt && map.eventAt(x, y)) && !(Tiles.isWater && Tiles.isWater(map.tiles[y][x]));
    for (let y = 4; y < map.h - 4; y++) for (let x = 2; x < map.w - 15; x++) { let n = 0; while (n < 14 && ok(x + n, y) && ok(x + n, y - 1) && ok(x + n, y + 1)) n++; if (n >= 14) return { id, x, y }; }
    return null;
  }, id);
  const enter = async (id, x, y, dir) => { await p.evaluate(([id, x, y, dir]) => { World.busy = false; World.enterMap(id, x, y, dir || 'right', { raw: true }); }, [id, x, y, dir]); await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && !MTQ3D.building, id, { timeout: 180000 }); await p.waitForTimeout(1200); };
  // 押し続けて測る。mods：同時に押すキー（Shift など）
  // この作業環境の描画は 1 秒に 1〜2 コマ（SwiftShader）で、実際の時間では測れない（1 コマの進みは 0.05 秒分までの作り）
  // → ページの中で、押したキーの状態のまま移動の処理（GameBridge.updateLogic）を 1/60 秒ずつ 60 回動かし、ゲーム内の 1 秒の進み（マス）を出す
  //   主人公の動きのクリップ・再生の速さは、そのあと押したまま描画を 2 コマ以上待って読む（描画の処理が speed・running から決める）
  const measure = async (label, ms, mods, key) => {
    key = key || 'ArrowRight'; mods = mods || [];
    for (const m of mods) await p.keyboard.down(m);
    await p.keyboard.down(key); await p.waitForTimeout(150);
    const r = await p.evaluate(() => {
      const B = MTQ3D; const x0 = B.pos.x, z0 = B.pos.z; const N = 60; let sp = 0;
      for (let i = 0; i < N; i++) { B.updateLogic(1 / 60); sp = B.speed; }
      return { v: Math.hypot(B.pos.x - x0, B.pos.z - z0) / (N / 60), sp, running: !!B.running, dash: !!B.dash84, shift: !!B.shift };
    });
    await p.waitForFunction(() => { const h = MTQ3D.hero; window.__f84 = (window.__f84 || 0) + 1; return h && h.currentName !== 'Idle'; }, null, { timeout: 20000, polling: 'raf' }).catch(() => { });
    await p.waitForTimeout(Math.max(1500, ms));
    const an = await p.evaluate(() => { const h = MTQ3D.hero; return { clip: h && h.currentName, ts: h && h.current ? +h.current.getEffectiveTimeScale().toFixed(3) : null }; });
    await p.keyboard.up(key); for (const m of mods.slice().reverse()) await p.keyboard.up(m);
    await p.waitForTimeout(400);
    const rec = { label, tilesPerGameSec: +r.v.toFixed(3), designSpeed: +r.sp.toFixed(3), running: r.running, dash: r.dash, shift: r.shift, clip: an.clip, timeScale: an.ts };
    console.log(JSON.stringify(rec)); return rec;
  };
  const out = { phase: PHASE, build: await p.evaluate(() => window.MTQ3D_BUILD), cases: [] };
  const startId = await p.evaluate(() => World.map.id); console.log('start', startId); const row = (await findRow(process.env.MAP || startId)); out.row = row; console.log('row', JSON.stringify(row));
  const goRow = () => enter(row.id, row.x, row.y, 'right');
  await goRow();
  const settings = await p.evaluate(() => State.data.settings.walkSpeed); out.walkSetting = settings;
  out.cases.push(await measure('キーだけ（最初）', 1600));
  await goRow(); out.cases.push(await measure('Shift を押したまま', 1600, ['Shift']));
  if (SHOT) { await goRow(); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(700); await p.screenshot({ path: SHOT + PHASE + '_key.jpg', type: 'jpeg', quality: 80 }); await p.keyboard.up('ArrowRight'); await p.waitForTimeout(300); }
  if (PHASE === 'after') {
    const ls2d = () => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^mtq-rpg/.test(k)) o[k] = (localStorage.getItem(k) || '').length; } return o; });
    const before2d = await ls2d();
    // R で走る
    await goRow(); await p.keyboard.press('r'); await p.waitForTimeout(300);
    const t1 = await p.evaluate(() => ({ dash: MTQ3D.dash84, ls: localStorage.getItem('mtq3d-run'), toast: (document.getElementById('toast') || {}).textContent || '', btn: (document.querySelector('#g3-tools [data-a="run"]') || {}).className || null }));
    out.toggleR = t1; console.log('R', JSON.stringify(t1));
    out.cases.push(await measure('R を押したあと（走る）', 1600));
    if (SHOT) { await goRow(); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(700); await p.screenshot({ path: SHOT + 'after_dash.jpg', type: 'jpeg', quality: 80 }); await p.keyboard.up('ArrowRight'); await p.waitForTimeout(300); }
    await goRow(); out.cases.push(await measure('走る＋Shift を押したまま', 1600, ['Shift']));
    // 隊列の仲間：走っている間の主人公との距離（足跡に沿う作り＝遅れない）
    await goRow();
    out.follow = await (async () => { await p.evaluate(() => { window.__fd = []; const f = () => { if (!window.__fd) return; const fi = MTQ3D.followerInfo ? MTQ3D.followerInfo() : []; const B = MTQ3D; window.__fd.push(fi.filter((q) => q.visible).map((q) => +Math.hypot(q.x - B.pos.x, q.z - B.pos.z).toFixed(2))); requestAnimationFrame(f); }; requestAnimationFrame(f); }); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(1600); await p.keyboard.up('ArrowRight'); const fd = await p.evaluate(() => { const a = window.__fd; window.__fd = null; return a; }); const mid = fd.slice(Math.floor(fd.length * 0.4)); const n = mid.length ? mid[0].length : 0; const mx = []; for (let i = 0; i < n; i++) mx.push(Math.max.apply(null, mid.map((r) => r[i] || 0))); return { followers: n, maxDistEach: mx }; })();
    console.log('follow', JSON.stringify(out.follow));
    // もう一度 R で歩く
    await p.keyboard.press('r'); await p.waitForTimeout(300); out.toggleR2 = await p.evaluate(() => ({ dash: MTQ3D.dash84, ls: localStorage.getItem('mtq3d-run') }));
    await goRow(); out.cases.push(await measure('もう一度 R（歩く）', 1600));
    // 3D 設定の「走る」ボタン（スマホ・マウス用）
    await p.evaluate(() => { const b = document.querySelector('#g3-tools [data-a="run"]'); if (b) b.click(); }); await p.waitForTimeout(200);
    out.button = await p.evaluate(() => ({ dash: MTQ3D.dash84, on: !!(document.querySelector('#g3-tools [data-a="run"]') || { classList: { contains: () => false } }).classList.contains('on'), label: (document.querySelector('#g3-tools [data-a="run"]') || {}).textContent }));
    console.log('button', JSON.stringify(out.button));
    // PC の操作方法（右の欄）に R の行が入ったか
    out.guide = await p.evaluate(() => { const r = document.querySelector('#guide .gd-run84'); return r ? r.textContent : null; });
    // 会話中・メニュー中は切り替えない
    out.busy = await p.evaluate(() => { World.busy = true; const d0 = MTQ3D.dash84; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' })); const d1 = MTQ3D.dash84; World.busy = false; return { before: d0, after: d1, unchanged: d0 === d1 }; });
    // 入力欄での R は切り替えない
    out.input = await p.evaluate(() => { const i = document.createElement('input'); document.body.appendChild(i); i.focus(); const d0 = MTQ3D.dash84; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true })); const d1 = MTQ3D.dash84; i.remove(); return { unchanged: d0 === d1 }; });
    // 馬車：走るにしていても馬車の速さは変わらない
    await goRow();
    const carr = await p.evaluate(() => { if (!window.Carriage) return null; Carriage.give(); State.data.carriage.on = true; Carriage.apply(); return Carriage.riding(); });
    if (carr) { await goRow(); out.cases.push(await measure('馬車（走る）', 1600)); await p.evaluate(() => { MTQ3D.setDash84(false); }); await goRow(); out.cases.push(await measure('馬車（歩く）', 1600)); await p.evaluate(() => { State.data.carriage.on = false; Carriage.apply(); }); }
    // 再読み込みで覚えているか（3D 版だけの保存 mtq3d-run）
    await p.evaluate(() => MTQ3D.setDash84(true)); await boot();
    out.reload = await p.evaluate(() => ({ dash: MTQ3D.dash84, ls: localStorage.getItem('mtq3d-run') }));
    console.log('reload', JSON.stringify(out.reload));
    await setup(); await goRow(); out.cases.push(await measure('再読み込みのあと（走る のまま）', 1600));
    // 地域の境目を走って越える（世界のつながり＝つなぐ のとき）
    out.cross = await (async () => {
      const r = await p.evaluate(() => { const W = World; const m = W.map; return { id: m.id, w: m.w, h: m.h, join: window.World76 ? World76.setting() : null }; });
      const t0 = await p.evaluate(() => ({ map: World.map.id, x: World.player.x, y: World.player.y }));
      await p.keyboard.down('ArrowRight'); await p.waitForTimeout(5000); await p.keyboard.up('ArrowRight'); await p.waitForTimeout(800);
      const t1 = await p.evaluate(() => ({ map: World.map.id, x: World.player.x, y: World.player.y, building: !!MTQ3D.building }));
      return { join: r.join, from: t0, to: t1 };
    })();
    console.log('cross', JSON.stringify(out.cross));
    out.ls2dBefore = before2d; out.ls2dAfter = await ls2d();
    await p.evaluate(() => MTQ3D.setDash84(false));
  }
  out.pageErrors = errs; fs.writeFileSync(OUT + 'run84_' + PHASE + '.json', JSON.stringify(out, null, 1)); console.log('errors', errs.length, JSON.stringify(errs.slice(0, 5)));
  await br.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
