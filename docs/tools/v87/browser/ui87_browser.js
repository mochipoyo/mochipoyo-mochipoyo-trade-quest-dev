// v8.7 ボス固有装備：画面での確かめ（ヘッドレス Chromium・Playwright。実機の GPU・スマホではない）
//  PC（1000×650）の 2D 版・3D 版、スマホ（iPhone 13 縦・横のまね）の 3D 版で
//   1) ボス戦（トレンド迷子。確かめのため HP を 1 にし、オート戦闘）に勝つ → リザルト画面に「ボス固有装備」の欄が出るか
//   2) どうぐの詳細：初回撃破報酬・このボス戦でのみ入手・非売品・固有効果
//   3) そうび：候補の右に基礎値の差、下に固有効果（分けて出る）。自動では装備しない
//   4) 図鑑の「ボス固有装備（x/分母）」：分母が 3D 版 68・2D 版 44
//   5) 分かれ道の魔剣の契約を戦闘の外で選ぶ（3D 版＝地球の世界だけ）
//   スマホ：各画面が横にはみ出さないか・固有装備の欄の文字の大きさ
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8791; const OUT = process.env.OUT || '/home/claude/envwork/docs/arch87/'; fs.mkdirSync(OUT + 'logs', { recursive: true }); fs.mkdirSync(OUT + 'shots', { recursive: true });
const CASES = (process.env.CASES || 'pc2d,pc3d,port3d,land3d').split(',');
(async () => {
  const br = await chromium.launch(); const all = {};
  for (const c of CASES) {
    const is3d = /3d/.test(c); const dev = c === 'port3d' ? devices['iPhone 13'] : c === 'land3d' ? devices['iPhone 13 landscape'] : { viewport: { width: 1000, height: 650 } };
    const ctx = await br.newContext(Object.assign({}, dev)); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
    await p.goto(`http://localhost:${PORT}/${is3d ? '3d/' : ''}index.html`);
    if (is3d) await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); else await p.waitForFunction(() => window.World && window.State && window.Engine && Engine.scenes.length, null, { timeout: 120000 });
    await p.evaluate(() => {
      document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
      State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 0; d.settings.battleSpeed = 'fast'; d.settings.autoBattle = true; World.start(); World.encounter = () => { };
      ENEMIES.boss_lost_trend.hp = 1; ENEMIES.boss_lost_trend.def = 0; ENEMIES.boss_lost_trend.atk = 1; ENEMIES.boss_lost_trend.mag = 1; ENEMIES.boss_lost_trend.agi = 1;   // 確かめのためだけ（全滅で止まらないように）（ページの中の値。ファイルは変えない）
    });
    if (is3d) await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map && !MTQ3D.building, null, { timeout: 240000 });
    const res = { case: c };
    // 画面の箱がはみ出していないか・文字の大きさ
    const fit = (sel) => p.evaluate((sel) => { const n = document.querySelector(sel); if (!n) return null; const r = n.getBoundingClientRect(); const vw = innerWidth, vh = innerHeight; const fs = [...n.querySelectorAll('.bu-detail, .bu-detail *, .bu-result, .bu-result *, .bu-icon')].map((x) => parseFloat(getComputedStyle(x).fontSize)).filter((v) => v > 0);
      return { rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], inside: r.left >= -1 && r.right <= vw + 1, hScroll: n.scrollWidth > n.clientWidth + 2, docScroll: document.documentElement.scrollWidth > vw + 2, minFont: fs.length ? Math.min.apply(null, fs) : null, vw, vh }; }, sel);
    // 1) ボス戦
    await p.evaluate(() => { window.__bt = null; BattleUI.start(['boss_lost_trend'], { boss: true, bossRewardKey: 'boss_lost_trend' }).then((r) => { window.__bt = r; }); });
    await p.waitForSelector('.result-victory', { timeout: 240000 });
    await p.waitForTimeout(1200);
    const rs = await p.evaluate(() => { const n = document.querySelector('.result-victory .bu-result'); const h = [...document.querySelectorAll('.result-victory h3')].map((x) => x.textContent); return { heads: h, text: n ? n.textContent : null, inv: State.data.inventory.bu_trend_compass || 0, equipped: State.data.hero.equip.acc || null }; });
    await p.evaluate(() => { const n = document.querySelector('.result-victory .bu-result'); if (n) n.scrollIntoView({ block: 'center' }); });
    await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}shots/${c}_result.jpg`, type: 'jpeg', quality: 80 });
    res.result = Object.assign(rs, { fit: await fit('.result-victory') }); res.result.ok = rs.heads.indexOf('ボス固有装備') >= 0 && /トレンドの羅針盤|方向確定/.test(rs.text || '') && rs.inv === 1 && rs.equipped !== 'bu_trend_compass';
    await p.keyboard.press('Enter'); await p.waitForFunction(() => window.__bt !== null, null, { timeout: 120000 }).catch(() => { });
    await p.waitForTimeout(is3d ? 1500 : 500);
    // 2) どうぐの詳細
    await p.evaluate(() => { Win.panel(Menu.itemDetail('bu_trend_compass')); }); await p.waitForSelector('.rw-panel .bu-detail'); await p.waitForTimeout(300);
    const det = await p.evaluate(() => document.querySelector('.rw-panel').textContent);
    await p.screenshot({ path: `${OUT}shots/${c}_detail.jpg`, type: 'jpeg', quality: 80 });
    res.detail = { has: ['初回撃破報酬', 'このボス戦でのみ入手', '非売品', '方向確定', '入手先'].filter((k) => det.indexOf(k) >= 0), fit: await fit('.rw-panel') }; res.detail.ok = res.detail.has.length === 5;
    await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    // 3) そうび（主人公 → 装飾 → 候補）
    await p.evaluate(() => { window.__eq = Menu.equip(); }); await p.waitForSelector('.rw-list'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    for (let i = 0; i < 4; i++) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(80); }
    await p.keyboard.press('Enter'); await p.waitForTimeout(500);
    const eq = await p.evaluate(() => { const L = [...document.querySelectorAll('.rw-list')].pop(); const t = L.querySelector('.rw-title'); const item = [...L.querySelectorAll('.rw-item')].find((x) => /羅針盤/.test(x.textContent)); const info = L.querySelector('.rw-info'); return { title: t && t.textContent, item: item ? item.textContent : null, info: info ? info.textContent : null }; });
    await p.screenshot({ path: `${OUT}shots/${c}_equip.jpg`, type: 'jpeg', quality: 80 });
    res.equip = Object.assign(eq, { fit: await fit('#ui .rw-list:last-child') }); res.equip.ok = /装飾を選ぶ/.test(eq.title || '') && /固有効果【方向確定】/.test(eq.item || '') && /\+\d|-\d/.test(eq.item || '') && /ボス固有装備/.test(eq.info || '');
    for (let i = 0; i < 3; i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); }
    await p.evaluate(() => window.__eq);
    // 4) 図鑑の一覧
    await p.evaluate(() => { document.querySelectorAll('#ui .rw-list, #ui .rw-panel').forEach((n) => n.remove()); window.__lp = BossGear.listPanel(); }); await p.waitForSelector('.rw-list .rw-title'); await p.waitForTimeout(400);
    const lp = await p.evaluate(() => { const L = [...document.querySelectorAll('.rw-list')].pop(); return { title: L.querySelector('.rw-title').textContent, rows: L.querySelectorAll('.rw-item').length, got: L.querySelectorAll('.rw-item.bu-got').length, first: (L.querySelector('.rw-item') || {}).textContent, info: (L.querySelector('.rw-info') || {}).textContent }; });
    await p.screenshot({ path: `${OUT}shots/${c}_list.jpg`, type: 'jpeg', quality: 80 });
    const den = is3d ? 68 : 44; res.list = Object.assign(lp, { fit: await fit('#ui .rw-list:last-child') }); res.list.ok = lp.title === 'ボス固有装備（1/' + den + '）' && lp.rows === den && lp.got === 1;
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    // 5) 契約を選ぶ（地球の世界だけ）
    if (is3d) {
      await p.evaluate(() => { const d = State.data; d.inventory.b19_crossroads_blade = 1; window.__cc = BossGear.contractChoose(); }); await p.waitForSelector('.rw-choice, .rw-list'); await p.waitForTimeout(300);
      const m0 = await p.evaluate(() => BossGear.contractMode());
      await p.screenshot({ path: `${OUT}shots/${c}_contract.jpg`, type: 'jpeg', quality: 80 });
      await p.keyboard.press('Enter'); await p.waitForTimeout(400); await p.keyboard.press('Enter'); await p.waitForTimeout(300);   // 1 番目＝攻勢
      const m1 = await p.evaluate(() => BossGear.contractMode());
      await p.evaluate(() => { window.__cc = BossGear.contractChoose(); }); await p.waitForTimeout(400); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(120); await p.keyboard.press('Enter'); await p.waitForTimeout(400); await p.keyboard.press('Enter'); await p.waitForTimeout(300);   // 2 番目＝守勢
      const m2 = await p.evaluate(() => BossGear.contractMode()); res.contract = { before: m0, afterAttack: m1, afterGuard: m2, ok: m0 === 'guard' && m1 === 'attack' && m2 === 'guard' };   // 未設定は守勢（仕様）
    }
    res.errors = errs; res.ok = ['result', 'detail', 'equip', 'list', 'contract'].every((k) => !res[k] || res[k].ok) && !errs.length && (!/port|land/.test(c) || ['result', 'detail', 'equip', 'list'].every((k) => res[k].fit && res[k].fit.inside && !res[k].fit.docScroll));
    all[c] = res; console.log(c, JSON.stringify(res));
    await ctx.close();
  }
  await br.close();
  fs.writeFileSync(OUT + 'logs/ui87_browser.json', JSON.stringify(all, null, 1));
  console.log('結果: ' + Object.keys(all).filter((k) => all[k].ok).length + '/' + Object.keys(all).length + ' OK');
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
