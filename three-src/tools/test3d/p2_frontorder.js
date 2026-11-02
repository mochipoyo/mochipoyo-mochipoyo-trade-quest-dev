// 前後の並び（スマホ）：味方が敵より手前（画面の下）に見えるか。戦闘中に何度か、敵・味方の足もとの画面の位置を測って撮る
const { chromium, devices } = require('playwright');
const DEV = process.env.DEV || 'iPhone 13'; const TAG = process.env.TAG || 'fo';
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext(Object.assign({}, devices[DEV], { deviceScaleFactor: 1 }))).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:' + (process.env.PORT || 8770) + '/3d/index.html' + (process.env.QUERY || '')); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; ['lina', 'kyle', 'gald'].forEach((id) => { try { State.joinCompanion(id); } catch (e) { } }); World.start(); World.enterMap('world_desert', 50, 37, 'down'); State.data.timeOfDay = 0.42; });
  // ORIGIN：敵の絵を別のサイト（CORS なし）から読んだものに差し替える＝iPhone の Safari で3Dに使えない状態の再現。HOLD=1：敵の絵を読み込み中のまま（応答しない）にする
  if (process.env.ORIGIN || process.env.HOLD) await p.evaluate(async ([origin, hold]) => {
    const BU = window.BattleUI; const orig = BU.enemyVisual; const memo = new Map();
    // 別のサイト（CORS なし）の画像から描いたキャンバス＝汚れたキャンバス（iPhone の Safari で、敵の新しい絵が別のサイト扱いになったときと同じ）
    const xo = new Image(); xo.src = origin + '/assets/enemies_redesign/044_sand_lizard.png'; await new Promise((ok) => { xo.onload = ok; xo.onerror = ok; });
    const dirty = document.createElement('canvas'); dirty.width = 200; dirty.height = 200; if (!hold) dirty.getContext('2d').drawImage(xo, 0, 0, 200, 200);
    BU.enemyVisual = function (e) { const v = orig.call(this, e); if (!v || !v.img) return v; if (!(v.img instanceof HTMLImageElement)) return hold ? v : Object.assign({}, v, { img: dirty }); let im = memo.get(v.img.src);
      if (!im) { im = new Image(); if (!hold) im.src = v.img.src.replace(/^https?:\/\/[^/]+/, origin); memo.set(v.img.src, im); }
      return Object.assign({}, v, { img: im }); };
    if (!hold) { const ims = []; ['sand_lizard'].forEach(() => {}); }
  }, [process.env.ORIGIN || '', !!process.env.HOLD]);
  if (process.env.CLEAN === 'fail') await p.evaluate(() => { if (window.EnemyArt) EnemyArt.cleanVisual = () => Promise.resolve(null); });
  if (process.env.CLEAN === 'hang') await p.evaluate(() => { if (window.EnemyArt) EnemyArt.cleanVisual = () => new Promise(() => { }); });
  await p.evaluate(() => { window.__bp = BattleUI.start(['sand_lizard', 'sand_lizard']); });
  await p.waitForFunction(() => window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo() && BattleStage3D.actorsInfo().ready >= BattleStage3D.actorsInfo().want, null, { timeout: 120000 }).catch(() => { });
  await p.waitForTimeout(2500);
  if (process.env.AUTO) await p.evaluate(() => { const b = document.getElementById('auto-battle'); if (b) b.click(); });
  for (let i = 0; i < (+process.env.N || 4); i++) {
    const r = await p.evaluate(() => { const st = MTQ3D.battle; const a = st && st.actors; const cam = st.camera; const W = Engine.canvas.width, H = Engine.canvas.height;
      const proj = (o) => { const v = o.position.clone(); v.project(cam); return [Math.round((v.x + 1) / 2 * W), Math.round((1 - v.y) / 2 * H), +o.position.z.toFixed(2)]; };
      const ens = (a.enemies || []).filter(Boolean).map((e) => e.group).filter(Boolean).map(proj), pts = [...a.party.values()].map((e) => e.group || (e.ch && e.ch.root)).filter(Boolean).map(proj);
      return { dbg: { wrap: String(BattleUI.enemyVisual).slice(0, 60), srcs: (a.enemies || []).filter(Boolean).map((e) => (e.visImg && e.visImg.src || '').slice(-40) + '|alt=' + !!e.alt) }, info: BattleStage3D.actorsInfo() && { ready: BattleStage3D.actorsInfo().ready, want: BattleStage3D.actorsInfo().want, failedArt: BattleStage3D.actorsInfo().failedArt, altArt: BattleStage3D.actorsInfo().altArt }, why: BattleStage3D.why && BattleStage3D.why(), layout: st.layout, photo: !!st.photoSrc, viewK: st.viewK, view: cam.view && cam.view.enabled ? [Math.round(cam.view.offsetX), Math.round(cam.view.offsetY), Math.round(cam.view.width), Math.round(cam.view.height)] : null, camZ: +cam.position.z.toFixed(2), camY: +cam.position.y.toFixed(2), enemies: ens, party: pts, W, H, band: st.band }; });
    console.log(JSON.stringify(r));
    await p.screenshot({ path: '/home/claude/work/p3d/shots/' + TAG + '_' + i + '.jpg', type: 'jpeg', quality: 75 });
    await p.waitForTimeout(1500);
  }
  console.log('errors', errs.length, errs.slice(0, 3)); await br.close();
})();
