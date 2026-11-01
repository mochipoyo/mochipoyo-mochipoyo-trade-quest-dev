// 実機で戦闘が2Dのままになった件の確認：
//  T1 3Dの素材（GLB）の読み込みが終わる前の戦闘でも3Dになるか（GLB を 90 秒遅らせる）
//  T2 戦闘の WebGL の文脈が失われたとき：その戦闘は2D＋理由のお知らせ → 次の戦闘で3Dに戻るか
//  T3 戦闘の組み立てで例外：2D＋理由 → 次の戦闘で戻るか
//  T4 3D設定の「状態」の文字
const { chromium, devices } = require('playwright');
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 1 })); const p = await ctx.newPage(); const errs = []; const warns = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/2Dで表示|battle stage/.test(m.text())) warns.push(m.text().slice(0, 160)); });
  await p.route('**/*.glb', async (route) => { await new Promise((r) => setTimeout(r, 90000)); route.continue().catch(() => {}); });
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.World && window.BattleUI && window.MTQ3D, null, { timeout: 120000 });
  await p.waitForTimeout(1500);
  const out = {};
  const battle = async (ids) => {
    await p.evaluate((ids) => { window.__done = false; BattleUI.start(ids).then(() => { window.__done = true; }); }, ids);
    await p.waitForTimeout(6000);
    const r = await p.evaluate(() => ({ ready3d: MTQ3D.ready, stageApi: !!window.BattleStage3D, actors: window.BattleStage3D && BattleStage3D.actorsInfo() ? (BattleStage3D.actorsInfo().ready + '/' + BattleStage3D.actorsInfo().want) : null, g3: document.body.classList.contains('g3-actors'), toast: (document.getElementById('toast') || {}).textContent || '', toastShown: !!(document.getElementById('toast') && document.getElementById('toast').classList.contains('show')), why: window.BattleStage3D && BattleStage3D.why ? BattleStage3D.why() : null }));
    await p.evaluate(() => { const sc = BattleUI.scene; if (sc) Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); document.querySelectorAll('.rw-list, .rw-panel, .rw-msg').forEach((n) => n.remove()); ['battle-party', 'battle-msg'].forEach((id) => { const el = document.getElementById(id); if (el) el.classList.remove('on'); }); if (BattleUI.autoButton) BattleUI.autoButton(false); const t = document.getElementById('toast'); if (t) { t.classList.remove('show'); t.textContent = ''; } });
    await p.waitForTimeout(500); return r;
  };
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('確認', 'warrior'); State.data.settings.textSpeed = 'instant'; ['lina'].forEach((id) => State.joinCompanion(id)); World.start(); World.enterMap('poyo_village', 24, 30, 'down'); });
  await p.waitForTimeout(800);
  out.T1_beforeReady = await battle(['wolf', 'harpy']);
  // T2：文脈を失わせる
  await p.evaluate((ids) => { window.__done = false; BattleUI.start(ids); }, ['rabbit']); await p.waitForTimeout(5000);
  await p.evaluate(() => { MTQ3D.battle.renderer.forceContextLoss(); }); await p.waitForTimeout(3000);
  out.T2_lost = await p.evaluate(() => ({ g3: document.body.classList.contains('g3-actors'), toast: document.getElementById('toast').textContent, why: BattleStage3D.why() }));
  await p.evaluate(() => { const sc = BattleUI.scene; if (sc) Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); document.querySelectorAll('.rw-list, .rw-panel, .rw-msg').forEach((n) => n.remove()); const t = document.getElementById('toast'); t.classList.remove('show'); t.textContent = ''; }); await p.waitForTimeout(500);
  out.T2_next = await battle(['slime']);
  // T3：組み立てで例外（1回だけ）
  await p.evaluate(() => { const b = MTQ3D.battle; const orig = b.build.bind(b); let once = true; b.build = function (...a) { if (once) { once = false; throw new Error('テスト用の例外'); } return orig(...a); }; });
  out.T3_throw = await battle(['wolf']);
  out.T3_next = await battle(['wolf']);
  out.T4_diag = await p.evaluate(() => MTQ3D.diagText());
  out.retries = await p.evaluate(() => MTQ3D.battleRetries);
  console.log(JSON.stringify(out, null, 1)); console.log('warns', warns.slice(0, 6)); console.log('errors', errs); await br.close(); process.exit(0);
})();
