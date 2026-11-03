// v7.0 ボスの名前と戦闘メッセージ欄が重ならないか：全ボスで戦闘を始め、名前の文字の位置（画面の座標）とメッセージ欄の位置を比べる。撮影は SHOTS=1 のとき
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = process.env.SHOTDIR || '/home/claude/work/p3d/shots/v70/'; fs.mkdirSync(SHOT, { recursive: true });
const PAGE = process.env.PAGE || '3d/index.html'; const TAG = process.env.TAG || 'pc'; const ONLY = process.argv.slice(2);
(async () => {
  const br = await chromium.launch(); const ctxOpt = process.env.DEV ? Object.assign({}, devices[process.env.DEV], { deviceScaleFactor: 1 }) : { viewport: { width: 960, height: 600 } };
  const p = await (await br.newContext(ctxOpt)).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/${PAGE}`);
  if (/3d/.test(PAGE)) await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); else await p.waitForFunction(() => window.BattleUI && window.State, null, { timeout: 60000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; ['lina', 'kyle', 'gald'].forEach((id) => { try { State.addMember(id); } catch (e) { } }); if (window.World && World.start) World.start();
    // 名前の文字を描いた位置を記録する
    const C = CanvasRenderingContext2D.prototype; if (!C.__wrapped) { C.__wrapped = true; const f = C.fillText; C.fillText = function (t, x, y) { if (window.__names && window.__names.has(t)) window.__drawn.push({ t, x, y, font: this.font, W: this.canvas.width, H: this.canvas.height }); return f.apply(this, arguments); }; } });
  await p.waitForTimeout(1200);
  const ids = await p.evaluate(() => (window.BossArt && BossArt.ids ? BossArt.ids() : []));
  const out = []; let bad = 0;
  for (const id of ids) {
    if (ONLY.length && !ONLY.includes(id)) continue;
    await p.evaluate((id) => { World.busy = false; window.__bp = BattleUI.start([id], { boss: true }); }, id);
    await p.waitForTimeout(+(process.env.WAIT || 3800));
    const r = await p.evaluate(() => {
      const sc = BattleUI.scene; if (!sc) return null; const e = sc.b.enemies[0]; window.__names = new Set([e.name]); window.__drawn = [];
      return new Promise((ok) => setTimeout(() => {
        const d = window.__drawn[window.__drawn.length - 1]; const cv = Engine.canvas.getBoundingClientRect(); const mw = document.getElementById('battle-msg').getBoundingClientRect();
        if (!d) return ok({ name: e.name, none: true });
        const ky = cv.height / d.H; const px = parseInt(/(\d+)px/.exec(d.font)[1], 10); const top = cv.top + (d.y - px) * ky, bottom = cv.top + d.y * ky;
        ok({ name: e.name, textTop: Math.round(top), textBottom: Math.round(bottom), msgTop: Math.round(mw.top), msgBottom: Math.round(mw.bottom), canvasTop: Math.round(cv.top), overlap: top < mw.bottom && bottom > mw.top && mw.height > 0, offTop: top < cv.top });
      }, 400));
    });
    if (r && (r.overlap || r.offTop)) bad++;
    console.log(id, JSON.stringify(r));
    out.push(Object.assign({ id }, r));
    if (process.env.SHOTS && (r && (r.overlap || r.offTop) || process.env.SHOTS === 'all')) await p.screenshot({ path: SHOT + TAG + '_' + id + '.jpg', type: 'jpeg', quality: 60 });
    await p.evaluate(() => { try { const sc = BattleUI.scene; if (sc) Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); BattleUI.scene = null; document.querySelectorAll('#battle-party,#battle-msg').forEach((n) => n.classList.remove('on')); document.querySelectorAll('#ui > *').forEach((n) => n.remove()); } catch (e) { } });
    await p.waitForTimeout(200);
  }
  fs.writeFileSync(SHOT + TAG + '_bossname.json', JSON.stringify({ out, errs }, null, 1));
  console.log('結果：' + out.length + '体中 ' + bad + '体で名前がメッセージ欄に重なる／画面外'); await br.close(); process.exit(0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
