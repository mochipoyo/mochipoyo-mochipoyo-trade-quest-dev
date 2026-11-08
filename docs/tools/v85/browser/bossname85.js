// v8.5 ボスの名前：最初だけ表示して、戦闘中は表示しないことの確かめ（ヘッドレス Chromium。2D 版＝index.html・3D 版＝3d/index.html）
//  ・ボス（裏切りの大臣ヴォルク boss_minister）＋ふつうの敵 1 体で戦闘を始め、画面のキャンバスに描かれた文字（fillText）を、実際の時計（Date.now）と一緒に記録する
//    （戦闘画面の時計 scene.t は、コマンドを選ぶメニューが上にある間は止まるため、ボスの名前も実際の時計で数える作り）
//  ・確かめ：①登場の演出のあと 0.5〜3.5 秒はボスの名前が描かれる ②4.6 秒より後は描かれない ③ふつうの敵の名前はずっと描かれる
//          ④ボスに状態異常（毒）・弱点露出があるときは、その短い表示（「弱点露出［毒］」）だけ描かれる ⑤ボスの名前が変わったら、また描かれる
//  ・この作業環境の描画は遅い（3D 版は 1 秒に 1〜2 コマ）ので、区間ごとに描かれた文字をまとめて見る
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8791; const OUT = process.env.OUT || '/home/claude/envwork/docs/arch85/'; fs.mkdirSync(OUT + 'logs', { recursive: true }); fs.mkdirSync(OUT + 'shots', { recursive: true });
const PAGES = (process.env.PAGES || '2d,3d').split(',');
(async () => {
  const br = await chromium.launch(); const all = {};
  for (const pg of PAGES) {
    const ctx = await br.newContext({ viewport: { width: 1000, height: 650 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
    await p.goto(`http://localhost:${PORT}/${pg === '3d' ? '3d/' : ''}index.html`);
    if (pg === '3d') await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); else await p.waitForFunction(() => window.World && window.State && window.BattleUI, null, { timeout: 120000 });
    const info = await p.evaluate(() => {
      document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
      State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 0; World.start(); World.encounter = () => { };
      const minion = Object.keys(ENEMIES).find((k) => !ENEMIES[k].boss && ENEMIES[k].name && !/boss/.test(k) && ENEMIES[k].hp > 5);
      // 描いた文字の記録（戦闘の画面のキャンバスだけ。戦闘の時計と、そのときの濃さ）
      window.__tx = []; const of = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t, x, y) { const S = BattleUI.scene; if (S && Engine.scenes.indexOf(S) >= 0) window.__tx.push({ t: Date.now(), s: String(t), a: +this.globalAlpha.toFixed(2) }); return of.apply(this, arguments); };
      BattleUI.start(['boss_minister', minion], { boss: true }); return { minion, minionName: ENEMIES[minion].name, bossName: ENEMIES.boss_minister.name };
    });
    console.log(pg, 'start', JSON.stringify(info));
    await p.waitForFunction(() => BattleUI.scene && Engine.top() === BattleUI.scene, null, { timeout: 120000 }).catch(async (e) => { console.log('no-scene', JSON.stringify(await p.evaluate(() => ({ scene: !!BattleUI.scene, top: Engine.top() && Engine.top().constructor.name, n: Engine.scenes.length, ui: document.getElementById('ui').children.length, errs: 0 })))); throw e; });
    console.log(pg, 'scene');
    const tick = async (until) => { await p.waitForFunction((u) => Date.now() >= u, until, { timeout: 600000, polling: 200 }); };
    const ent = await p.evaluate(() => { const S = BattleUI.scene; return { entranceDur: S.entrance ? S.entrance.dur + (S.entrance.delay || 0) : 0, cutin: !!S.cutin }; });
    // 登場の演出が終わった時計（t0）を待つ
    await p.waitForFunction(() => { const S = BattleUI.scene; return S && !S.entrance && !S.cutin; }, null, { timeout: 600000, polling: 100 });
    const t0 = await p.evaluate(() => Date.now()); console.log(pg, 't0', t0, Date.now());
    await tick(t0 + 1200); await p.screenshot({ path: `${OUT}shots/bossname_${pg}_start.jpg`, type: 'jpeg', quality: 80 });
    await tick(t0 + 3500);
    await tick(t0 + 6000); await p.screenshot({ path: `${OUT}shots/bossname_${pg}_later.jpg`, type: 'jpeg', quality: 80 });
    const win = (a, b) => p.evaluate(([a, b]) => window.__tx.filter((r) => r.t >= a && r.t <= b), [a, b]);
    const has = (rows, s) => rows.some((r) => r.s.indexOf(s) >= 0);
    const frames = (rows) => new Set(rows.map((r) => r.t)).size;
    const early = await win(t0 + 500, t0 + 3500), late = await win(t0 + 4700, t0 + 6000);
    const res = { page: pg, info, ent, t0 };
    res.c1_bossNameEarly = has(early, info.bossName); res.c2_bossNameLateHidden = !has(late, info.bossName); res.c3_minionAlways = has(early, info.minionName) && has(late, info.minionName);
    res.lateTexts = [...new Set(late.map((r) => r.s))].slice(0, 12); res.framesEarly = frames(early); res.framesLate = frames(late);
    // ④ 状態異常・弱点露出
    const tS = await p.evaluate(() => { const S = BattleUI.scene; S.view.e[0].st = ['poison']; S.view.e[0].ex = true; return Date.now(); });
    await tick(tS + 2500); const st = await win(tS + 100, tS + 2500);
    res.c4_statusOnly = has(st, '弱点露出［毒］') && !has(st, info.bossName); res.statusTexts = [...new Set(st.map((r) => r.s))].filter((s) => /毒|弱点/.test(s));
    await p.screenshot({ path: `${OUT}shots/bossname_${pg}_status.jpg`, type: 'jpeg', quality: 80 });
    await p.evaluate(() => { const S = BattleUI.scene; S.view.e[0].st = []; S.view.e[0].ex = false; });
    // ⑤ 名前が変わる（変身など）
    const tN = await p.evaluate(() => { const S = BattleUI.scene; S.b.enemies[0].name = '真・テスト大臣'; return Date.now(); });
    await tick(tN + 1500); const nn = await win(tN + 100, tN + 1500); await tick(tN + 5600); const nn2 = await win(tN + 4900, tN + 5600);
    res.c5_renamedShownAgain = has(nn, '真・テスト大臣') && !has(nn2, '真・テスト大臣');
    res.ok = !!(res.c1_bossNameEarly && res.c2_bossNameLateHidden && res.c3_minionAlways && res.c4_statusOnly && res.c5_renamedShownAgain);
    res.pageErrors = errs; console.log(JSON.stringify(res)); all[pg] = res; await ctx.close();
  }
  fs.writeFileSync(OUT + 'logs/bossname85.json', JSON.stringify(all, null, 1)); await br.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
