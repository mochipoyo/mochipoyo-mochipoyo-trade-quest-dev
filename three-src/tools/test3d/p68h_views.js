// v6.8 探索用3Dモデル：主人公＋カイル・リーナ・ガルドが並んで歩くところを、正面・横・背面からカメラを寄せて撮る（報告用の画像）
//   ・カメラは確認用の固定位置（CameraController3D.debug）を毎フレーム主人公に合わせて動かす。ゲームのカメラ設定・セーブは変えない
//   ・左右へ歩く（Shift を押したまま）・走る・止まるで、仲間の動き（Walk／Run／Idle）も記録する
// 作業用のフォルダ（CommonJS）にコピーして実行する。環境変数 MAP（world／harbor_town）・TAG・SHOTDIR・PORT・DEV
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = process.env.SHOTDIR || '/home/claude/work/p3d/shots/v68g/'; fs.mkdirSync(SHOT, { recursive: true });
const MAP = process.env.MAP || 'world'; const TAG = process.env.TAG || 'view'; const START = { world: [27, 44], harbor_town: [5, 19] }[MAP] || [10, 10];   // 木や建物のない開けた場所
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); let o = { viewport: { width: 1280, height: 720 } }; if (process.env.DEV) o = Object.assign({}, devices[process.env.DEV], { deviceScaleFactor: 1 });
  const p = await (await br.newContext(o)).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(({ MAP, START }) => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.hero.level = 20; World.encounter = function () { };   /* このテストのページだけ：歩いているあいだのランダムな戦闘を止める（隊列の確認のじゃまをしない） */ ['kyle', 'lina', 'gald'].forEach((id) => State.joinCompanion(id)); d.party = ['hero', 'kyle', 'lina', 'gald']; World.start(); World.busy = false; World.enterMap(MAP, START[0], START[1], 'right'); }, { MAP, START });
  await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m, MAP, { timeout: 90000 }).catch(() => { });
  await p.waitForFunction(() => ['kyle', 'lina', 'gald'].every((id) => MTQ3D.followers && MTQ3D.followers.get(id) && MTQ3D.followers.get(id).ch), null, { timeout: 60000 }).catch(() => { });
  // 確認用のカメラ：view＝front（進む先から見る）／side（南側から見る）／back（後ろから見る）。主人公から列の中ほど（1.5マス後ろ）を狙う
  await p.evaluate(() => { window.__view = 'side'; window.__dir = 1; const tick = () => { const c = MTQ3D.camera; const h = MTQ3D.pos; const s = window.__dir; if (h && window.__view) { const tx = h.x - s * 1.4, tz = h.z, ty = (h.y || 0) + 0.75; const V = { front: [tx + s * 5.6, ty + 1.3, tz + 1.8], side: [tx, ty + 1.4, tz + 4.8], back: [tx - s * 5.8, ty + 1.5, tz + 1.8] }[window.__view]; c.debug = { pos: V, target: [tx, ty, tz] }; } else c.debug = null; requestAnimationFrame(tick); }; tick(); });
  // 見えている人だけ（隊列は、折り返した直後など仲間どうしが重なる位置では一時的に描かない＝以前からの Follow の仕様）
  const state = () => p.evaluate(() => { const r = {}; MTQ3D.followers.forEach((e, id) => { if (e.ch && e.ch.root.visible) r[id] = e.ch.current ? e.ch.current.getClip().name : null; }); r.hero = MTQ3D.hero && MTQ3D.hero.current ? MTQ3D.hero.current.getClip().name : null; return r; });
  const out = [];
  // 向きごとに、開けた場所の西の端へ戻ってから右へ歩く（折り返すと隊列が一時的に重なって消えるため）
  for (const view of ['front', 'side', 'back']) {
    await p.evaluate(({ MAP, START, v }) => { window.__view = v; window.__dir = 1; World.busy = false; World.enterMap(MAP, START[0], START[1], 'right'); }, { MAP, START, v: view });
    await p.waitForTimeout(1500);
    // 歩きはじめ：3人が並ぶまで待つ（作業環境のソフトウェア描画は1秒に数コマのことがあり、時間では足りないため）
    await p.keyboard.down('Shift'); await p.keyboard.down('ArrowRight');
    await p.waitForFunction(() => Follow.positions().length >= 3 && [...MTQ3D.followers.values()].filter((e) => e.ch && e.ch.root.visible).length >= 3, null, { timeout: 60000 }).catch(() => { });
    await p.waitForTimeout(500); const sWalk = await state(); await p.screenshot({ path: SHOT + TAG + '_' + MAP + '_' + view + '_walk.jpg', type: 'jpeg', quality: 82, timeout: 120000 });
    await p.keyboard.up('Shift'); await p.waitForFunction(() => MTQ3D.running && MTQ3D.speed > 4, null, { timeout: 30000 }).catch(() => { }); await p.waitForTimeout(500); const sRun = await state(); await p.screenshot({ path: SHOT + TAG + '_' + MAP + '_' + view + '_run.jpg', type: 'jpeg', quality: 82, timeout: 120000 });
    await p.keyboard.up('ArrowRight'); await p.waitForTimeout(1400); const sIdle = await state(); await p.screenshot({ path: SHOT + TAG + '_' + MAP + '_' + view + '_idle.jpg', type: 'jpeg', quality: 82, timeout: 120000 });
    const all = (s, c) => Object.keys(s).length >= 2 && Object.values(s).every((k) => k === c);   // 主人公＋見えている仲間（1人以上。重なる位置の仲間は一時的に描かない）
    ok(all(sWalk, 'Walk') && all(sRun, 'Run') && all(sIdle, 'Idle'), MAP + '・' + view + '：歩行 ' + JSON.stringify(sWalk) + '・走行 ' + JSON.stringify(sRun) + '・停止 ' + JSON.stringify(sIdle));
    out.push({ view, walk: sWalk, run: sRun, idle: sIdle });
  }
  await p.evaluate(() => { window.__view = null; MTQ3D.camera.debug = null; });
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  fs.writeFileSync(SHOT + TAG + '_' + MAP + '_views.json', JSON.stringify({ out, fails, errs }, null, 1));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})();
