// 2Dのマップ（3Dの範囲＝ポヨ村だけ）でも 3D設定のボタンが出るか・状態の表示・スマホでページがずれたら戻るか
const { chromium, devices } = require('playwright');
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext(Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 1 }))).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('まち', 'warrior'); World.start(); World.enterMap('world', 60, 60, 'down'); });
  await p.waitForTimeout(2500);
  const st = () => p.evaluate(() => { const t = document.getElementById('g3-tools'); const btn = t && t.querySelector('[data-a="panel"]'); const zin = t && t.querySelector('[data-a="zin"]'); const r = btn ? btn.getBoundingClientRect() : null; return { mode3D: MTQ3D.mode3D(), tools: t ? getComputedStyle(t).display : null, zoomShown: zin ? getComputedStyle(zin).display !== 'none' : null, btnRect: r && [r.left, r.top, r.width, r.height].map(Math.round), hit: r ? (document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === btn) : null }; });
  const a = await st();
  // 3D設定 → 3Dの範囲「ポヨ村だけ」→ フィールドは2D
  await p.click('#g3-tools [data-a="panel"]'); await p.click('#g3-panel [data-sc="poyo"]'); await p.waitForTimeout(1500);
  const b = await st();
  const diag = await p.evaluate(() => document.getElementById('g3-diag').textContent);
  // 2Dのまま、3Dの範囲を「全マップ」に戻せるか
  await p.click('#g3-panel [data-sc="all"]'); await p.waitForTimeout(3000); const c = await st();
  await p.click('#g3-tools [data-a="panel"]');
  // 戦闘中・会話中は出さない
  await p.evaluate(() => { BattleUI.start(['slime']); }); await p.waitForTimeout(2500); const d = await st();
  await p.evaluate(() => { const sc = BattleUI.scene; if (sc) Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); document.querySelectorAll('.rw-list, .rw-panel, .rw-msg').forEach((n) => n.remove()); ['battle-party', 'battle-msg'].forEach((id) => document.getElementById(id).classList.remove('on')); BattleUI.autoButton(false); }); await p.waitForTimeout(800);
  // ページがずれたら戻る（ページを一時的に縦長にしてずらす）
  const sc = await p.evaluate(async () => { const pad = document.createElement('div'); pad.style.height = '900px'; document.body.appendChild(pad); window.scrollTo(0, 120); const y0 = scrollY; await new Promise((r) => setTimeout(r, 300)); const y1 = scrollY; pad.remove(); return { y0, y1 }; });
  console.log(JSON.stringify({ start3D: a, after2D: b, diag2D: diag, back3D: c, inBattle: d, scroll: sc })); console.log('errors', errs); await br.close();
})();
