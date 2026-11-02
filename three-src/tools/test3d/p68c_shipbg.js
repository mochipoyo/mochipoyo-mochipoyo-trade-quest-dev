// v6.8 船に乗っているときの戦闘背景（船の甲板の画像）：3D版（前後＝画像を画面いっぱい／左右＝遠景の板）と2D版で撮る
// 作業用のフォルダ（CommonJS）にコピーして実行する。環境変数 DEV（Playwright の端末名）・LAND=1・TAG・SHOTDIR・PORT
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = process.env.SHOTDIR || '/home/claude/work/p3d/shots/v68c/'; fs.mkdirSync(SHOT, { recursive: true }); const TAG = process.env.TAG || 'pc';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const out = { tag: TAG, runs: [] };
  for (const page3d of [true, false]) {
    let ctxOpt = { viewport: { width: 1280, height: 720 } };
    if (process.env.DEV) { const dv = Object.assign({}, devices[process.env.DEV], { deviceScaleFactor: 1 }); if (process.env.LAND) dv.viewport = { width: dv.viewport.height, height: dv.viewport.width }; ctxOpt = dv; }
    const p = await (await br.newContext(ctxOpt)).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
    await p.goto(`http://localhost:${PORT}/${page3d ? '3d/' : ''}index.html`);
    if (page3d) await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); else await p.waitForFunction(() => window.State && window.World && window.BattleUI, null, { timeout: 60000 });
    await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.settings.battleSpeed = 'fast'; d.hero.level = 20; ['lina', 'kyle', 'mina'].forEach((id) => State.joinCompanion(id)); World.start(); World.busy = false; World.enterMap('world', 19, 72, 'down'); State.data.aboard = 'sailboat'; });
    await p.waitForTimeout(1500);
    for (const layout of page3d ? ['front', 'side'] : ['2d']) {
      await p.evaluate((layout) => { if (layout !== '2d') localStorage.setItem('mtq3d-battle-layout', layout); World.busy = false; window.__bp = BattleUI.start(['jelly_float', 'reef_crab'], { zone: '沿岸の海' }); }, layout);
      await p.waitForFunction(() => { const sc = BattleUI.scene; return sc && sc.bg && sc.bg._photo; }, null, { timeout: 30000 }).catch(() => { });
      if (page3d) await p.waitForFunction(() => window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo() && BattleStage3D.actorsInfo().ready >= BattleStage3D.actorsInfo().want && BattleStage3D.actorsInfo().want > 0, null, { timeout: 30000 }).catch(() => { });
      await p.waitForTimeout(1500);
      const r = await p.evaluate(() => { const sc = BattleUI.scene; const BG = BattleBG65; const k = BG.photoKey(sc.bg65); const st = BG.photoState(k); const B = window.MTQ3D && MTQ3D.battle; return { key: k, url: st && st.url && st.url.replace(/^.*battle-backgrounds\//, ''), state: st && st.state, photo2d: !!(sc.bg && sc.bg._photo), photo3d: B ? !!B.photoSrc : null, back3d: B ? B.backKind || null : null, layout: B ? B.layout : '2d' }; });
      await p.screenshot({ path: SHOT + TAG + '_' + (page3d ? '3d_' : '') + layout + '.jpg', type: 'jpeg', quality: 76, timeout: 120000 });
      ok(r.key === 'ship_deck' && r.state === 'ok' && r.url === '16_battle_ship_deck.webp' && r.photo2d, (page3d ? '3D ' : '') + layout + '：船の上の戦闘は甲板の画像（' + JSON.stringify(r) + '）');
      if (page3d && layout === 'front') ok(r.photo3d === true, '3D 前後：甲板の画像を画面いっぱいに使う');
      if (page3d && layout === 'side') ok(r.back3d === 'photo', '3D 左右：遠景の板に甲板の画像（海と島）');
      out.runs.push(r);
      await p.evaluate(() => { try { const sc = BattleUI.scene; if (sc) Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); BattleUI.scene = null; document.querySelectorAll('#battle-party,#battle-msg').forEach((n) => n.classList.remove('on')); document.querySelectorAll('.rw-list, .rw-panel, .rw-msg, #auto-battle').forEach((n) => n.remove()); World.busy = false; } catch (e) { } });
      await p.waitForTimeout(400);
    }
    // 船を降りたら従来どおり（草原）
    await p.evaluate(() => { State.data.aboard = null; World.busy = false; window.__bp = BattleUI.start(['slime'], {}); }); await p.waitForTimeout(1500);
    const r2 = await p.evaluate(() => BattleBG65.photoKey(BattleUI.scene.bg65)); ok(r2 !== 'ship_deck', (page3d ? '3D' : '2D') + '：船を降りたあとの戦闘は甲板の画像ではない（' + r2 + '）');
    ok(errs.length === 0, (page3d ? '3D' : '2D') + '版：ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  }
  out.fails = fails; fs.writeFileSync(SHOT + TAG + '_result.json', JSON.stringify(out, null, 1));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})();
