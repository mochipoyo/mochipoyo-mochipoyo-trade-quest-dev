// v9.8.4 3D の戦闘の勝利の結果の窓：4 人編成で、複数人がレベルアップする勝利を再現して確かめる（ヘッドレス Chromium。実機ではない。GPU なし。スマホ縦は画面の大きさ・タッチのまね）
//   パーティ：主人公（兜・槍）・カイル（兜・槍・盾）・カズト（兜・戦斧）・リーナ（帽子・杖）＝頭の上・武器の先が高い装備
//   場面：two＝2 人がレベルアップ／all＝4 人ともレベルアップ
//   確かめること（結果の窓を出したまま）：
//     ・顔・兜・武器の先（装備の先までの矩形）が、窓に重ならない／画面の外へ見切れない
//     ・詳細の欄をスクロールできる（PC：マウスのホイールと ↓ キー／スマホ縦：タッチのドラッグ（CDP の dispatchTouchEvent で指の動きをまねる））。いちばん下まで行くと「つづきあり」の印が消える
//     ・「次へ」が窓と画面の中に見え、押す（PC：クリック／スマホ縦：タップ）と窓が閉じて、戦闘が終わる
//   VIEW=pc（1280×720）｜phone（iPhone 13 相当 390×664）  PORT=…  OUT=…
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8894; const VIEW = process.env.VIEW || 'pc'; const OUT = process.env.OUT || '/home/claude/envwork/docs/appear/pixel/';
const steps = []; const S = (ok, m) => { steps.push({ ok: !!ok, m }); console.log((ok ? '  OK  ' : '  NG  ') + m); };
const IDS = ['hero', 'kyle', 'kazuto', 'lina']; const NAME = { hero: '主人公', kyle: 'カイル', kazuto: 'カズト', lina: 'リーナ' };
const EQ = { hero: ['iron_armor', 'iron_helm', 'iron_spear'], kyle: ['iron_armor', 'iron_helm', 'iron_spear', 'iron_shield'], kazuto: ['iron_armor', 'iron_helm', 'battle_axe'], lina: ['robe_skip', 'leather_cap', 'oak_staff'] };
const CASES = [{ key: 'two', name: '2 人がレベルアップ（主人公・リーナ）', up: ['hero', 'lina'] }, { key: 'all', name: '4 人ともレベルアップ', up: IDS }];
let PG = null;
(async () => {
  fs.mkdirSync(OUT + 'shots', { recursive: true }); fs.mkdirSync(OUT + 'logs', { recursive: true });
  const br = await chromium.launch();
  const ctx = await br.newContext(VIEW === 'phone' ? Object.assign({}, devices['iPhone 13'], { deviceScaleFactor: 2 }) : { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); PG = p; const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await p.goto(`http://localhost:${PORT}/3d/index.html?nosw`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 300000 }); await p.waitForSelector('#ui .title-menu', { timeout: 300000 });
  const setup = await p.evaluate((EQ) => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.mute = true; d.settings.soundAsk93 = true;
    ['kyle', 'kazuto', 'lina'].forEach((id) => State.joinCompanion(id));
    Object.keys(EQ).forEach((id) => EQ[id].forEach((it) => { State.addItem(it, 1); Services.equipItem(State.actor(id), it); }));
    World.start();
    return { party: d.party.slice(), equip: Object.fromEntries(Object.keys(EQ).map((id) => [id, Object.assign({}, State.actor(id).equip)])) };
  }, EQ);
  S(setup.party.join() === IDS.join() && IDS.every((id) => EQ[id].every((it) => Object.values(setup.equip[id]).indexOf(it) >= 0)), '準備：4 人編成（' + setup.party.join('・') + '）。頭の上・武器の先が高い装備（兜・槍・戦斧・杖）を着けた');
  await p.waitForTimeout(1200);
  const info = () => p.evaluate((IDS) => {
    const n = document.querySelector('#ui .rw-panel.result-victory'); const sc = Engine.scenes.find((s) => s._stage3d); const cv = document.getElementById('game') || document.querySelector('canvas'); if (!n || !sc || !cv) return null;
    const r = n.getBoundingClientRect(); const b = cv.getBoundingClientRect(); const kx = b.width / cv.width, ky = b.height / cv.height; const scr = n.querySelector('.rs-scroll'); const cl = n.querySelector('.rw-panel-close'); const cr = cl.getBoundingClientRect(); const sr = scr && scr.getBoundingClientRect();
    const out = { cls: n.className, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth, vh: innerHeight, canvas: { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) },
      scroll: scr ? { top: scr.scrollTop, h: scr.clientHeight, all: scr.scrollHeight, x: Math.round(sr.left + sr.width / 2), y: Math.round(sr.top + sr.height / 2), yTop: Math.round(sr.top), yBot: Math.round(sr.bottom) } : null,
      close: { x: Math.round(cr.left + cr.width / 2), y: Math.round(cr.top + cr.height / 2), top: Math.round(cr.top), bottom: Math.round(cr.bottom), h: Math.round(cr.height), in: cr.top >= r.top && cr.bottom <= r.bottom + 1 && cr.bottom <= innerHeight && cr.top >= 0 },
      more: /rs-more/.test(n.className), hint: (() => { const h = n.querySelector('.rs-morehint'); return !!h && getComputedStyle(h).display !== 'none'; })(), ups: n.querySelectorAll('.rs-member.up').length, members: n.querySelectorAll('.rs-member').length, who: {} };
    IDS.forEach((id) => {
      const q = BattleStage3D.partyRect(sc, id, cv.width, cv.height, true); const i = BattleStage3D.actorsInfo().party.find((x) => x.id === id); if (!q) return;
      const F = { l: b.left + q.x * kx, t: b.top + q.y * ky, r: b.left + (q.x + q.w) * kx, b: b.top + (q.y + q.h) * ky };
      let nn = 0, c = 0; for (let y = F.t; y < F.b; y += 2) for (let x = F.l; x < F.r; x += 2) { nn++; if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) c++; }
      out.who[id] = { top: Math.round(F.t), bottom: Math.round(F.b), left: Math.round(F.l), right: Math.round(F.r), covered: nn ? +(c / nn).toFixed(3) : null, gap: Math.round(F.t - r.bottom), clip: F.t < b.top || F.l < b.left || F.r > b.right || F.b > b.bottom, front: /dir:front/.test(i.model || ''), ea: !!i.ea };
    });
    return out;
  }, IDS);
  const rec = {};
  for (const cs of CASES) {
    await p.evaluate((up) => { const d = State.data; d.party.forEach((id) => { const a = State.actor(id); a.exp = up.indexOf(id) >= 0 ? Actors.expForLevel(a.level) - 1 : 0; a.hp = Actors.stats(a).maxHp; a.dead = false; }); window.__btRes = null;
      const en = Object.keys(ENEMIES).filter((k) => ENEMIES[k].hp < 40 && !ENEMIES[k].boss && !ENEMIES[k].flee)[0]; State.data.settings.autoBattle = false; World.startBattle([en], {}).then((r) => { window.__btRes = r || 'end'; }); }, cs.up);
    await p.waitForSelector('#ui .cmd-list', { timeout: 120000 }); await p.waitForTimeout(1500);
    await p.evaluate(() => { BattleUI.battle.enemies.forEach((e) => { e.hp = 1; }); State.data.settings.autoBattle = true; }); await p.keyboard.press('Enter');
    // 結果の窓が出るまで（Enter は押さない＝窓を閉じない）
    await p.waitForSelector('#ui .rw-panel.result-victory', { timeout: 120000 });
    await p.waitForFunction((IDS) => { const i = BattleStage3D.actorsInfo(); return IDS.every((id) => { const x = i.party.find((q) => q.id === id); return x && /dir:front/.test(x.model || '') && !x.eaWait; }); }, IDS, { timeout: 30000 }).catch(() => null);
    await p.waitForTimeout(4200);   // 勝利のカメラが止まり、窓の高さ合わせ（約 3.6 秒）が終わってから測る
    const a = await info(); await p.screenshot({ path: `${OUT}shots/result4_${VIEW}_${cs.key}_1.jpg`, type: 'jpeg', quality: 78 });
    const tag = `［${cs.name}］`;
    S(a && /rs-detail/.test(a.cls) && a.members === 4 && a.ups === cs.up.length, `${tag}詳しい結果の窓（${a && a.cls}）。仲間の行 ${a && a.members}・レベルアップ ${a && a.ups} 人`);
    const w = a.who; const worst = IDS.map((id) => w[id]);
    S(worst.every((x) => x && x.front && x.ea && x.covered === 0 && x.gap >= 0), `${tag}顔・兜・武器の先（装備の先までの矩形）が窓に重ならない：窓 ${a.top}〜${a.bottom}px。` + IDS.map((id) => `${NAME[id]} 上端 ${w[id] && w[id].top}px（すき間 ${w[id] && w[id].gap}px・重なり ${w[id] ? Math.round(w[id].covered * 100) : '?'}%）`).join('・'));
    S(worst.every((x) => x && !x.clip), `${tag}人物（装備の先まで）が 3D の画面の外へ見切れない（画面 ${a.canvas.left}〜${a.canvas.right}×${a.canvas.top}〜${a.canvas.bottom}。` + IDS.map((id) => `${NAME[id]} ${w[id].left}〜${w[id].right}×${w[id].top}〜${w[id].bottom}`).join('・') + '）');
    S(a.close.in && a.close.h >= 24 && a.left >= 0 && a.right <= a.vw, `${tag}「次へ」が窓と画面の中に見える（${a.close.top}〜${a.close.bottom}px・高さ ${a.close.h}px。窓の左右 ${a.left}〜${a.right}／画面の幅 ${a.vw}）`);
    // ---- スクロール ----
    const need = a.scroll && a.scroll.all > a.scroll.h + 2; let b1 = a, b2 = a, b3 = a;
    if (need) {
      S(a.more && a.hint, `${tag}詳細が欄に入りきらない（欄 ${a.scroll.h}px／中身 ${a.scroll.all}px）→「つづきあり」の印が出る`);
      if (VIEW === 'phone') { const cdp = await ctx.newCDPSession(p); const y0 = a.scroll.yBot - 12, dist = Math.round(a.scroll.h * 0.6);   // 指を欄の下の方に置いて、上へドラッグ
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.scroll.x, y: y0 }] });
        for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.scroll.x, y: y0 - dist * i / 8 }] }); await p.waitForTimeout(30); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
      else { await p.mouse.move(a.scroll.x, a.scroll.y); await p.mouse.wheel(0, 60); }
      await p.waitForTimeout(500); b1 = await info();
      S(b1.scroll.top > a.scroll.top, `${tag}${VIEW === 'phone' ? 'タッチのドラッグ' : 'マウスのホイール'}で詳細がスクロールする（位置 ${a.scroll.top} → ${b1.scroll.top}）`);
      for (let i = 0; i < 30; i++) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(40); } await p.waitForTimeout(300); b2 = await info();
      S(b2.scroll.top + b2.scroll.h >= b2.scroll.all - 2 && !b2.hint, `${tag}↓ キーでいちばん下まで行ける（位置 ${b2.scroll.top}＋欄 ${b2.scroll.h}＝中身 ${b2.scroll.all}）。いちばん下では「つづきあり」の印が消える`);
      await p.screenshot({ path: `${OUT}shots/result4_${VIEW}_${cs.key}_2.jpg`, type: 'jpeg', quality: 78 });
      for (let i = 0; i < 30; i++) { await p.keyboard.press('ArrowUp'); await p.waitForTimeout(30); } await p.waitForTimeout(200); b3 = await info();
      S(b3.scroll.top === 0 && b3.hint, `${tag}↑ キーでいちばん上へ戻れる（位置 ${b3.scroll.top}）`);
      S(!!(await p.$('#ui .rw-panel.result-victory')) && IDS.every((id) => b3.who[id].covered === 0), `${tag}スクロールしても窓は閉じず、人物に重ならないまま`);
    } else S(!a.hint, `${tag}詳細は欄に全部入る（欄 ${a.scroll && a.scroll.h}px／中身 ${a.scroll && a.scroll.all}px）→ スクロール不要・「つづきあり」の印なし`);
    // ---- 「次へ」 ----
    const c = await info();
    if (VIEW === 'phone') await p.touchscreen.tap(c.close.x, c.close.y); else await p.mouse.click(c.close.x, c.close.y);
    let closed = false, ended = false;
    for (let i = 0; i < 60 && !ended; i++) { await p.waitForTimeout(250); closed = closed || !(await p.$('#ui .rw-panel.result-victory')); ended = await p.evaluate(() => !!window.__btRes && !World.busy); if (closed && !ended && i % 2) await p.keyboard.press('Enter'); }
    S(closed && ended, `${tag}「次へ」を${VIEW === 'phone' ? 'タップ' : 'クリック'}すると窓が閉じ、戦闘が終わってフィールドへ戻る`);
    const lv = await p.evaluate((up) => up.map((id) => State.actor(id).level), cs.up);
    rec[cs.key] = { name: cs.name, first: a, wheel: b1, bottom: b2, back: b3, levels: lv };
    await p.evaluate(() => { State.data.settings.autoBattle = false; }); await p.waitForTimeout(600);
  }
  S(errs.length === 0, 'ページのエラーなし' + (errs.length ? '：' + errs.slice(0, 3).join(' / ') : ''));
  const ng = steps.filter((x) => !x.ok).length;
  fs.writeFileSync(`${OUT}logs/result4_${VIEW}.json`, JSON.stringify({ VIEW, ok: steps.length - ng, ng, steps, rec }, null, 1));
  console.log(`結果 result4 ${VIEW}：OK ${steps.length - ng} / NG ${ng}`); await br.close(); process.exit(ng ? 1 : 0);
})().catch(async (e) => {
  console.error('FAIL', e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e);
  try { await PG.screenshot({ path: `${OUT}shots/result4_${VIEW}_error.jpg`, type: 'jpeg', quality: 70 }); } catch (e2) { }
  process.exit(2);
});
