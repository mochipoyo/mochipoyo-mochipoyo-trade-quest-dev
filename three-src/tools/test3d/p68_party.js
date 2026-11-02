// v6.8 味方の4方向の絵（PartyDirections）の確認：3D版で実際に戦闘を始め、どの人物にどの絵（URL）が使われたかを調べて撮る
//   A：15人×4方向の確認シート（ゲームの中の PartyDirections で読み込み・切り出した絵。足もとの基準線つき）と、URL・切り出し範囲の照合
//   B：4人編成（15人を4組）× 前後／左右の並び：戦闘の始まり・攻撃・被弾・勝利（正面へ振り向く）
//   C：転職（主人公・カイル・エルナ・イオ）と、旧セーブで sprite が別のIDになっている場合
//   D：読み込みの失敗（404）と遅延 → 以前の絵で表示 → 読めたら差し替え
//   E：死亡・蘇生・再戦
// 使い方：node p68_party.js [A B C D E]（省略で全部）。環境変数 DEV（Playwright の端末名）・LAND=1（横向き）・W・H・TAG・SHOTDIR・PORT
const { chromium, devices } = require('playwright'); const fs = require('fs'); const path = require('path');
const PORT = process.env.PORT || 8770; const SHOT = process.env.SHOTDIR || '/home/claude/work/p3d/shots/v68/'; fs.mkdirSync(SHOT, { recursive: true });
const TAG = process.env.TAG || 'pc'; const ONLY = process.argv.slice(2); const want = (k) => !ONLY.length || ONLY.includes(k);
const REPO = process.env.REPO || '/home/claude/mochipoyo-trade-quest'; const MAN = JSON.parse(fs.readFileSync(path.join(REPO, 'assets/characters/party-directions-v3/manifest.json'), 'utf8'));   // ほかの p6x と同じく、作業用のフォルダ（CommonJS）にコピーして実行する
const GROUPS = [['hero', 'lina', 'kyle', 'mina'], ['seris', 'gald', 'lucia', 'elna'], ['nagi', 'iris', 'sophia', 'io'], ['ganes', 'aster', 'ord', 'hero']];
const DEVDIR = (/[?&]partydir=(front|back|left|right)/.exec(process.env.QUERY || '') || [])[1] || null;   // 開発の確認用 ?partydir=（向きの固定）で撮るとき
const fails = []; const ok = (c, msg) => { if (!c) fails.push(msg); console.log((c ? 'OK  ' : 'NG  ') + msg); };
(async () => {
  const br = await chromium.launch();
  let ctxOpt = { viewport: { width: +(process.env.W || 1280), height: +(process.env.H || 720) } };
  if (process.env.DEV) { const d = Object.assign({}, devices[process.env.DEV], { deviceScaleFactor: 1 }); if (process.env.LAND) d.viewport = { width: d.viewport.height, height: d.viewport.width }; ctxOpt = d; }
  const ctx = await br.newContext(ctxOpt); const p = await ctx.newPage();
  const errs = []; const net = []; const warns = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { const t = m.text(); if (m.type() === 'error') errs.push('console: ' + t.slice(0, 200)); if (/味方の4方向の絵|battle party/.test(t)) warns.push(t.slice(0, 240)); });
  p.on('response', (r) => { if (/party-directions-v3/.test(r.url())) net.push({ url: r.url().replace(/^.*party-directions-v3\//, ''), status: r.status() }); });
  await p.goto(`http://localhost:${PORT}/3d/index.html${process.env.QUERY || ''}`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    State.newGame('もち', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.settings.battleSpeed = 'fast';
    Object.keys(COMPANIONS).forEach((id) => { try { State.joinCompanion(id); } catch (e) { } });
    d.hero.level = 20; World.start(); World.busy = false; World.enterMap('oblivion_cave_3', 5, 5, 'down');
  });
  await p.waitForTimeout(1500);
  const actorsReady = () => p.waitForFunction(() => window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo() && BattleStage3D.actorsInfo().ready >= BattleStage3D.actorsInfo().want && BattleStage3D.actorsInfo().want > 0, null, { timeout: 30000 }).catch(() => { });
  const info = () => p.evaluate(() => { const i = BattleStage3D.actorsInfo(); return i ? { partyDir: i.partyDir, party: i.party, dirs: i.dirs ? { ok: i.dirs.ok, loading: i.dirs.loading, error: i.dirs.error, failures: i.dirs.failures } : {}, sync: i.sync, layout: MTQ3D.battle && MTQ3D.battle.layout } : null; });
  const endBattle = () => p.evaluate(() => { try { const sc = BattleUI.scene; if (sc) Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); BattleUI.scene = null; document.querySelectorAll('#battle-party,#battle-msg').forEach((n) => n.classList.remove('on')); document.querySelectorAll('.rw-list, .rw-panel, .rw-msg, #auto-battle').forEach((n) => n.remove()); World.busy = false; } catch (e) { } });
  const start = (party, layout, enemies, auto) => p.evaluate(({ party, layout, enemies, auto }) => {
    localStorage.setItem('mtq3d-battle-layout', layout); const d = State.data; d.party = party.slice(); d.settings.autoBattle = !!auto;
    party.forEach((id) => { const a = State.actor(id); const s = Actors.stats(a); a.hp = s.maxHp; a.mp = s.maxMp; a.dead = false; });
    World.busy = false; window.__bp = BattleUI.start(enemies, {}); return true;
  }, { party, layout, enemies, auto });
  const ENEMY = await p.evaluate(() => { const ks = Object.keys(ENEMIES).filter((k) => !ENEMIES[k].boss && ENEMIES[k].hp >= 120 && ENEMIES[k].hp <= 400 && ENEMIES[k].atk >= 18); return ks.slice(0, 3); });
  const out = { tag: TAG, viewport: ctxOpt.viewport, enemy: ENEMY };

  /* ---------- A：15人×4方向の確認シート ---------- */
  if (want('A')) {
    const r = await p.evaluate(async () => {
      const PD = window.MTQ3D_PartyDirections; const ids = PD.actorIds(); const dirs = ['front', 'back', 'left', 'right'];
      await Promise.all(ids.flatMap((id) => dirs.map((d) => PD.load(State.actor(id) || { id }, d))));
      const CW = 200, CH = 190, LH = 18; const c = document.createElement('canvas'); c.width = 70 + CW * 4; c.height = 22 + (CH + LH) * ids.length; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      g.fillStyle = '#1b2230'; g.fillRect(0, 0, c.width, c.height); g.font = '13px sans-serif'; g.fillStyle = '#dfe6f0'; dirs.forEach((d, k) => g.fillText(d, 70 + CW * k + 60, 15));
      const rows = [];
      ids.forEach((id, r) => {
        const a = State.actor(id) || { id }; const y0 = 22 + (CH + LH) * r; g.fillStyle = '#dfe6f0'; g.fillText(id, 6, y0 + CH / 2);
        dirs.forEach((d, k) => {
          const got = PD.get(a, d); const x0 = 70 + CW * k; g.strokeStyle = '#2c3648'; g.strokeRect(x0 + 0.5, y0 + 0.5, CW - 1, CH + LH - 1);
          const row = { id, dir: d, state: got.state, url: got.info && got.info.url, ref: got.info && got.info.refH, ratio: got.info && got.info.ratio };
          if (got.art) {
            const s = (CH - 16) / 1.1 * got.info.ratio / got.info.refH;   // 同じ人物の4方向は同じ縮尺（いちばん高い絵＝ 158px × 体格の比。3D と同じ考え方）
            const art = got.art, px = x0 + CW / 2, py = y0 + CH - 6;   // 基準点（足もと）
            g.drawImage(art.canvas, px + art.offX * s - art.canvas.width * s / 2, py - art.offY * s - art.canvas.height * s, art.canvas.width * s, art.canvas.height * s);
            g.strokeStyle = 'rgba(255,90,90,0.8)'; g.beginPath(); g.moveTo(x0 + 8, py + 0.5); g.lineTo(x0 + CW - 8, py + 0.5); g.stroke();
            row.bounds = [art.x0, art.y0, art.x1, art.y1]; row.off = [art.offX, art.offY];
          }
          g.fillStyle = '#9fb0c8'; g.font = '10px sans-serif'; g.fillText(row.url ? row.url.replace(/^.*sprites\//, '').replace(/\?.*$/, '') : '(なし)', x0 + 4, y0 + CH + 12); g.font = '13px sans-serif';
          rows.push(row);
        });
      });
      return { rows, png: c.toDataURL('image/png'), root: PD.root() };
    });
    fs.writeFileSync(SHOT + TAG + '_A_sheet.png', Buffer.from(r.png.split(',')[1], 'base64'));
    let bad = 0;
    for (const row of r.rows) {
      const m = MAN.actors[row.id].directions[row.dir];
      const urlOk = row.url && row.url.indexOf('/assets/characters/party-directions-v3/sprites/' + row.id + '/' + row.dir + '.png?v=' + m.sha256.slice(0, 10)) >= 0;
      const bOk = row.bounds && row.bounds.join() === m.opaqueBounds.join();
      if (!(row.state === 'ok' && urlOk && bOk)) { bad++; console.log('NG  A', JSON.stringify(row), m.opaqueBounds); }
    }
    ok(r.rows.length === 60 && bad === 0, 'A：15人×4方向の60枚を、人物ID・向きどおりの URL で読み込み、切り出し範囲が manifest と一致（' + (60 - bad) + '/60）。パックの場所 ' + r.root);
    out.A = { root: r.root, n: r.rows.length, bad };
  }

  /* ---------- B：4人編成 × 前後／左右 ---------- */
  if (want('B')) {
    out.B = [];
    for (const layout of ['front', 'side']) {
      for (let gi = 0; gi < GROUPS.length; gi++) {
        const party = GROUPS[gi]; await start(party, layout, ENEMY.slice(0, 2), true);
        await actorsReady(); await p.waitForTimeout(700);
        const i0 = await info(); const want0 = DEVDIR || (layout === 'front' ? 'back' : 'left');
        await p.screenshot({ path: SHOT + TAG + '_B_' + layout + '_g' + (gi + 1) + '_start.jpg', type: 'jpeg', quality: 72 });
        const bad = i0.party.filter((x) => x.model !== 'pixel:dir:' + want0 || !x.url || x.url.indexOf('/sprites/' + x.id + '/' + want0 + '.png') < 0);
        ok(i0.partyDir === want0 && bad.length === 0, 'B ' + layout + ' ' + party.join(',') + '：全員が本人の ' + want0 + '.png' + (bad.length ? ' NG=' + JSON.stringify(bad) : ''));
        // 戦闘を進める（オート）：攻撃・呪文・被弾 → 勝利
        const t0 = Date.now(); let vic = false, hits = 0;
        while (Date.now() - t0 < 60000) { const v = await p.evaluate(() => { const sc = BattleUI.scene; return { vic: !!(sc && sc.victory >= 0), gone: !sc, pops: sc ? sc.pops.filter((q) => q.side === 'party').length : 0 }; }); hits = Math.max(hits, v.pops); if (v.vic || v.gone) { vic = v.vic; break; } await p.waitForTimeout(120); }
        await p.waitForTimeout(250); if (vic) await p.screenshot({ path: SHOT + TAG + '_B_' + layout + '_g' + (gi + 1) + '_victory.jpg', type: 'jpeg', quality: 72 });
        await p.waitForTimeout(700); const i1 = await info();
        const alive = i1 ? i1.party.filter((x) => !x.dead) : [];
        const vdir = DEVDIR || 'front'; const turned = alive.filter((x) => x.model === 'pixel:dir:' + vdir && x.url && x.url.indexOf('/sprites/' + x.id + '/' + vdir + '.png') >= 0);   // ?partydir= のときは振り向かない
        ok(vic && alive.length > 0 && turned.length === alive.length, 'B ' + layout + ' ' + party.join(',') + '：勝利で正面（front.png）へ振り向く ' + turned.length + '/' + alive.length + '（味方への命中の数字 ' + hits + '）');
        const sync = ((i1 && i1.sync) || []).filter((q) => !q.who || !/^e:/.test(q.who) || true); const errsMs = sync.map((q) => Math.abs(q.errMs)).sort((x, y) => x - y); const worst = errsMs.length ? errsMs[errsMs.length - 1] : 0; const med = errsMs.length ? errsMs[errsMs.length >> 1] : 0; const over = errsMs.filter((x) => x > 120).length;
        out.B.push({ layout, party, start: i0.party.map((x) => ({ id: x.id, model: x.model, url: x.url && x.url.replace(/^.*sprites\//, ''), size: x.size })), victory: vic, turned: turned.length, alive: alive.length, partyHits: hits, syncN: sync.length, syncWorstMs: worst, syncMedMs: med, syncOver120: over, syncRaw: sync.slice(-12) });
        await endBattle(); await p.waitForTimeout(400);
      }
    }
  }

  /* ---------- C：転職・旧セーブ ---------- */
  if (want('C')) {
    const before = {};
    for (const layout of ['front', 'side']) {
      await start(['hero', 'kyle', 'elna', 'io'], layout, ENEMY.slice(0, 1), false); await actorsReady(); await p.waitForTimeout(500);
      before[layout] = (await info()).party.map((x) => ({ id: x.id, job: x.job, sprite: x.sprite, url: x.url })); await endBattle(); await p.waitForTimeout(300);
    }
    await p.evaluate(() => { Actors.changeJob(State.data.hero, 'mage'); Actors.changeJob(State.actor('kyle'), 'thief'); Actors.changeJob(State.actor('elna'), 'priest'); Actors.changeJob(State.actor('io'), 'knight'); });
    const r = {};
    for (const layout of ['front', 'side']) {
      await start(['hero', 'kyle', 'elna', 'io'], layout, ENEMY.slice(0, 1), false); await actorsReady(); await p.waitForTimeout(600);
      r[layout] = (await info()).party.map((x) => ({ id: x.id, job: x.job, sprite: x.sprite, url: x.url }));
      await p.screenshot({ path: SHOT + TAG + '_C_job_' + layout + '.jpg', type: 'jpeg', quality: 72 }); await endBattle(); await p.waitForTimeout(300);
      const same = r[layout].every((x, k) => x.url === before[layout][k].url && x.url.indexOf('/sprites/' + x.id + '/') >= 0);
      ok(same, 'C ' + layout + '：転職（' + r[layout].map((x) => x.id + '→' + x.job + '/' + x.sprite).join('、') + '）のあとも、転職前と同じ本人の絵 ' + JSON.stringify(r[layout].map((x) => x.url && x.url.replace(/^.*sprites\//, '').replace(/\?.*$/, ''))));
    }
    // 旧セーブの再現：保存したデータを読み込み直す（sprite を別のIDにしたセーブ）。普段のセーブ枠は使わない（State.data に直接入れる）
    const r2 = await p.evaluate(() => { const d = JSON.parse(JSON.stringify(State.data)); d.companions.kyle.sprite = 'hero_knight'; d.companions.io.sprite = 'kyle'; d.companions.elna.sprite = 'villager_m'; d.hero.sprite = 'hero_sage'; if (State.migrate) State.migrate(d); State.data = d; return { kyle: d.companions.kyle.sprite, io: d.companions.io.sprite, elna: d.companions.elna.sprite, hero: d.hero.sprite }; });
    await start(['hero', 'kyle', 'elna', 'io'], 'front', ENEMY.slice(0, 1), false); await actorsReady(); await p.waitForTimeout(600);
    const r3 = (await info()).party.map((x) => ({ id: x.id, sprite: x.sprite, url: x.url && x.url.replace(/^.*sprites\//, '').replace(/\?.*$/, '') }));
    await p.screenshot({ path: SHOT + TAG + '_C_oldsave.jpg', type: 'jpeg', quality: 72 }); await endBattle(); await p.waitForTimeout(300);
    ok(r3.every((x) => x.url === x.id + '/back.png'), 'C 旧セーブ（sprite を ' + JSON.stringify(r2) + ' にしたデータ）：本人の絵 ' + JSON.stringify(r3));
    out.C = { before, after: r, oldSave: r3 };
  }

  /* ---------- D：読み込みの失敗（404）と遅延 → 以前の絵 → 差し替え ---------- */
  if (want('D')) {
    await p.evaluate(() => window.MTQ3D_PartyDirections.clearCache());
    let block = true; await p.route('**/party-directions-v3/sprites/lina/back.png*', (route) => (block ? route.fulfill({ status: 404, body: 'nf' }) : route.continue()));
    await p.route('**/party-directions-v3/sprites/mina/back.png*', async (route) => { await new Promise((ok) => setTimeout(ok, 5000)); route.continue(); });
    await start(['hero', 'lina', 'kyle', 'mina'], 'front', ENEMY.slice(0, 1), false); await actorsReady(); await p.waitForTimeout(400);
    const d0 = await info(); await p.screenshot({ path: SHOT + TAG + '_D_fallback.jpg', type: 'jpeg', quality: 72 });
    const lina0 = d0.party.find((x) => x.id === 'lina'), mina0 = d0.party.find((x) => x.id === 'mina');
    ok(lina0.model !== 'pixel:dir:back' && lina0.ready && (lina0.pd === 'error' || lina0.pd === 'loading') && d0.dirs.failures.some((f) => f.id === 'lina'), 'D 404：リーナは以前の絵（' + lina0.model + '）で表示（読み込みの状態 ' + lina0.pd + '：失敗のあと、時間をおいて読み直している）');
    ok(mina0.ready, 'D 遅延：ミナは表示されている（' + mina0.model + '・状態 ' + mina0.pd + '）');
    block = false; await p.waitForTimeout(6500);
    const d1 = await info(); await p.screenshot({ path: SHOT + TAG + '_D_recovered.jpg', type: 'jpeg', quality: 72 });
    const lina1 = d1.party.find((x) => x.id === 'lina'), mina1 = d1.party.find((x) => x.id === 'mina');
    ok(lina1.model === 'pixel:dir:back' && /\/sprites\/lina\/back\.png/.test(lina1.url), 'D 404 が直ったあと：リーナが本人の back.png に差し替わる（' + lina1.model + '）');
    ok(mina1.model === 'pixel:dir:back' && /\/sprites\/mina\/back\.png/.test(mina1.url), 'D 遅延のあと：ミナが本人の back.png に差し替わる（' + mina1.model + '）');
    ok(d1.dirs.failures.some((f) => f.id === 'lina' && f.dir === 'back' && /lina\/back\.png/.test(f.url)), 'D 失敗の記録に人物ID・向き・URL が残る');
    ok(warns.some((w) => /lina/.test(w) && /back\.png/.test(w)), 'D コンソールに失敗のログ');
    await endBattle(); await p.unroute('**/party-directions-v3/sprites/lina/back.png*'); await p.unroute('**/party-directions-v3/sprites/mina/back.png*');
    out.D = { before: d0.party.map((x) => [x.id, x.model, x.pd]), after: d1.party.map((x) => [x.id, x.model, x.pd]), failures: d1.dirs.failures.slice(-3) };
  }

  /* ---------- E：死亡・蘇生・再戦 ---------- */
  if (want('E')) {
    out.E = [];
    for (const layout of ['front', 'side']) {
      await start(['hero', 'gald', 'sophia', 'aster'], layout, ENEMY.slice(0, 1), false); await actorsReady(); await p.waitForTimeout(500);
      await p.evaluate(() => { const sc = BattleUI.scene; const a = sc.b.party[1]; a.hp = 0; a.dead = true; sc.view = Combat.snapshot(sc.b); });   // 2D版と同じく、出来事のあとの画面の状態（view）を作り直す
      await p.waitForTimeout(700); const e1 = await info(); await p.screenshot({ path: SHOT + TAG + '_E_' + layout + '_dead.jpg', type: 'jpeg', quality: 72 });
      await p.evaluate(() => { const sc = BattleUI.scene; const a = sc.b.party[1]; a.hp = 30; a.dead = false; sc.view = Combat.snapshot(sc.b); });
      await p.waitForTimeout(700); const e2 = await info();
      const g1 = e1.party.find((x) => x.id === 'gald'), g2 = e2.party.find((x) => x.id === 'gald');
      ok(g1.dead && g1.vis && /^pixel:dir:/.test(g1.model), 'E ' + layout + '：倒れたガルドは本人の絵のまま倒れて表示（消えない）');
      ok(!g2.dead && g2.vis && g2.model === g1.model, 'E ' + layout + '：蘇生で同じ絵のまま起き上がる');
      await endBattle(); await p.waitForTimeout(300);
      // 再戦：同じ編成でもう一度
      await start(['hero', 'gald', 'sophia', 'aster'], layout, ENEMY.slice(0, 1), false); await actorsReady(); await p.waitForTimeout(500);
      const e3 = await info(); const n3 = await p.evaluate(() => { let n = 0; MTQ3D.battle.scene3.traverse((o) => { if (/^party_/.test(o.name)) n++; }); return n; });
      ok(n3 === 4 && e3.party.every((x) => x.ready && x.vis && /^pixel:dir:/.test(x.model)), 'E ' + layout + '：再戦で味方の板が4人ぶんだけ（前の戦闘の板が残らない・消えない）n=' + n3);
      await endBattle(); await p.waitForTimeout(300);
      out.E.push({ layout, dead: g1, revived: g2, rebattle: n3 });
    }
  }
  /* ---------- F：別のサイトから読む（githack の配信の再現）。8771＝CORS を許可するサイト、8772＝許可しないサイト ---------- */
  if (want('F')) {
    out.F = [];
    for (const [port, acao] of [[8771, true], [8772, false]]) {
      await p.evaluate((b) => { Assets.base = b; window.MTQ3D_PartyDirections.clearCache(); }, 'http://127.0.0.1:' + port + '/');
      await start(['hero', 'lina', 'kyle', 'mina'], 'front', ENEMY.slice(0, 1), false); await actorsReady(); await p.waitForTimeout(acao ? 600 : 3200);
      const f = await info(); await p.screenshot({ path: SHOT + TAG + '_F_' + port + '.jpg', type: 'jpeg', quality: 72 }); await endBattle(); await p.waitForTimeout(300);
      const fromX = f.party.filter((x) => x.url && x.url.indexOf('http://127.0.0.1:' + port + '/assets/characters/party-directions-v3/sprites/' + x.id + '/back.png') === 0 && x.model === 'pixel:dir:back');
      if (acao) ok(fromX.length === 4, 'F 別のサイト（CORS あり）：4人とも本人の back.png を3Dで使える ' + fromX.length + '/4');
      else ok(f.party.every((x) => x.ready && x.model !== 'pixel:dir:back') && f.dirs.error + f.dirs.loading > 0, 'F 別のサイト（CORS なし）：新しい絵は使えない → 4人とも以前の絵で表示（' + f.party.map((x) => x.id + ':' + x.model).join('、') + '）。読めない記録 ' + f.dirs.failures.length + ' 件');
      out.F.push({ port, acao, party: f.party.map((x) => [x.id, x.model, x.url && x.url.replace(/\?.*$/, '')]), failures: f.dirs.failures.length });
    }
    await p.evaluate(() => { Assets.base = new URL('../', document.baseURI).href; window.MTQ3D_PartyDirections.clearCache(); });
  }
  const bad404 = net.filter((x) => x.status >= 400 && !/lina\/back\.png/.test(x.url));
  ok(bad404.length === 0, 'ネットワーク：party-directions-v3 の 404 などなし（わざと止めたものを除く）' + (bad404.length ? JSON.stringify(bad404.slice(0, 5)) : '') + '（読み込み ' + net.length + ' 回）');
  const forced = net.filter((x) => x.status === 404 && /lina\/back\.png/.test(x.url)).length; const is404 = (e) => /Failed to load resource: the server responded with a status of 404/.test(e); const isCors = (e) => want('F') && /127\.0\.0\.1:8772.*(CORS|Access-Control)|(CORS|Access-Control).*127\.0\.0\.1:8772|Failed to load resource: net::ERR_FAILED/.test(e); const errs2 = errs.filter((e) => !is404(e) && !isCors(e)); const n404 = errs.filter(is404).length;   // わざと 404 にした読み込みのブラウザのログは除く（数が合うことを確かめる）
  ok(errs2.length === 0 && n404 <= forced, 'ページのエラーなし（わざと 404 にした ' + forced + ' 回のブラウザのログを除く）' + (errs2.length ? ' ' + JSON.stringify(errs2.slice(0, 5)) : ''));
  out.net = net; out.errors = errs; out.warns = warns.slice(0, 20); out.fails = fails;
  fs.writeFileSync(SHOT + TAG + '_result.json', JSON.stringify(out, null, 1));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})();
