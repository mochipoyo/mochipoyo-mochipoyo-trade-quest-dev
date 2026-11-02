// v6.7 ボスの絵の確認（3D版の前後の並び）：全ボスで戦闘を始め、3Dの敵がどの絵から作られたか（新しいボス画像か、簡易の絵か）を調べて撮る
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = process.env.SHOTDIR || '/home/claude/work/p3d/shots/v67/boss/'; fs.mkdirSync(SHOT, { recursive: true });
const ONLY = process.argv.slice(2); const TAG = process.env.TAG || 'b';
(async () => {
  const br = await chromium.launch(); const ctxOpt = process.env.DEV ? Object.assign({}, devices[process.env.DEV], { deviceScaleFactor: 1 }) : { viewport: { width: 960, height: 600 } };
  const p = await (await br.newContext(ctxOpt)).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' || /battle art|WebGL|3D/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto(`http://localhost:${PORT}/3d/index.html${process.env.QUERY || ''}`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; ['lina', 'kyle', 'gald'].forEach((id) => { try { State.joinCompanion(id); } catch (e) { } }); World.start(); World.busy = false; World.enterMap('oblivion_cave_3', 5, 5, 'down'); });
  await p.waitForTimeout(1500);
  // BASE：ボスの画像を別のサイトから読む（8771＝CORS あり／8772＝CORS なし）。TAINT=1：読み込み済みのボスの絵を「汚れた」キャンバスに差し替える（iPhone の Safari の再現）
  if (process.env.BASE) await p.evaluate((b) => { Assets.base = b; }, process.env.BASE);
  if (process.env.TAINT) await p.evaluate(async () => { const xo = new Image(); xo.src = 'http://127.0.0.1:8772/assets/enemies_redesign/044_sand_lizard.png'; await new Promise((ok) => { xo.onload = ok; xo.onerror = ok; }); window.__xo = xo; });
  const ids = await p.evaluate(() => BossArt.ids());
  const out = [];
  for (const id of ids) {
    if (ONLY.length && !ONLY.includes(id)) continue;
    const t0 = Date.now();
    if (process.env.TAINT) await p.evaluate(async (id) => { await BossArt.load(id); const v = BossArt.get(id); if (!v) return; const c = document.createElement('canvas'); c.width = v.img.width; c.height = v.img.height; const g = c.getContext('2d'); g.drawImage(v.img, 0, 0); g.drawImage(window.__xo, 0, 0, 1, 1); v.img = c; v.stat = Object.assign({}, v.stat, { tainted: true }); delete BossArt.cleanJobs[id]; }, id);
    await p.evaluate((id) => { World.busy = false; window.__bp = BattleUI.start([id], { boss: true }); }, id);
    await p.waitForFunction(() => window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo() && BattleStage3D.actorsInfo().ready >= BattleStage3D.actorsInfo().want && BattleStage3D.actorsInfo().want > 0, null, { timeout: 30000 }).catch(() => { });
    await p.waitForTimeout(+(process.env.WAIT || 2500));
    const r = await p.evaluate((id) => { const sc = BattleUI.scene; const e = sc && sc.b && sc.b.enemies[0]; const v = e ? BattleUI.enemyVisual(e) : null; const a = MTQ3D.battle && MTQ3D.battle.actors; const en = a && a.enemies && a.enemies[0];
      return { name: e && e.name, vis2d: v && (v.source || (v.img && v.img.src ? 'img:' + v.img.src.split('/').slice(-2).join('/') : v.img && v.img.tagName)), bossReady: !!(BossArt.get && BossArt.get(id)), wants: BossArt.wants(id), mode: BossArt.mode(),
        en3d: en ? { source: en.source, alt: !!en.alt, cors: !!en.cors, failed: !!en.failed, art: !!en.art, sameImg: v ? en.visImg === v.img : null } : null, rect: (function () { try { const r = BattleStage3D.rect(sc, 0, Engine.canvas.width, Engine.canvas.height); return r && [r.x, r.y, r.w, r.h, !!r.est]; } catch (e) { return null; } })(), drawn3d: BattleStage3D.drawn(sc, 0), layout: MTQ3D.battle && MTQ3D.battle.layout }; }, id);
    await p.screenshot({ path: SHOT + TAG + '_' + id + '.jpg', type: 'jpeg', quality: 70 });
    out.push(Object.assign({ id, sec: (Date.now() - t0) / 1000 }, r)); console.log(JSON.stringify(out[out.length - 1]));
    await p.evaluate(() => { try { const sc = BattleUI.scene; if (sc) Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); BattleUI.scene = null; document.querySelectorAll('#battle-party,#battle-msg').forEach((n) => n.classList.remove('on')); document.querySelectorAll('.rw-list, .rw-panel, .rw-msg').forEach((n) => n.remove()); World.busy = false; } catch (e) { } });
    await p.waitForTimeout(300);
  }
  fs.writeFileSync(SHOT + TAG + '_bosses.json', JSON.stringify({ out, errors: errs }, null, 1)); console.log('errors', errs.length, errs.slice(0, 6)); await br.close();
})();
