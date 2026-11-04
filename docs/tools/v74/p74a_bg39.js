// v7.4 39ダンジョンの戦闘背景：3D版（前後＋写真背景／3Dの景色・横並び）と2D版で、エリアごとに戦闘を始めて背景を確かめて撮る
// 環境変数：PORT・DEV（Playwright の端末名。スマホ縦）・TAG・AREAS（"1,5,9" のようにエリア番号。なければ39すべて）・PAGES（"3d,2d"）・LAYOUTS（"front,side"）・BOSS=1・NO404=1
const { chromium, devices } = require('playwright'); const fs = require('fs'); const path = require('path');
const PORT = process.env.PORT || 8770; const TAG = process.env.TAG || 'pc'; const SHOT = (process.env.SHOTDIR || '/home/claude/work/p3d/shots/v74/') + TAG + '/'; fs.mkdirSync(SHOT, { recursive: true });
const pack = JSON.parse(fs.readFileSync('/home/claude/mochipoyo-trade-quest/docs/battle-backgrounds-dungeons39.json', 'utf8'));
const AREAS = process.env.AREAS ? process.env.AREAS.split(',').map(Number) : pack.assets.map((a) => a.number);
const PAGES = (process.env.PAGES || '3d,2d').split(','); const LAYOUTS = (process.env.LAYOUTS || 'front,side').split(',');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const out = { tag: TAG, runs: [] };
  for (const pg of PAGES) {
    const page3d = pg === '3d';
    let ctxOpt = { viewport: { width: 1280, height: 720 } };
    if (process.env.DEV) { ctxOpt = Object.assign({}, devices[process.env.DEV], { deviceScaleFactor: 1 }); }
    const p = await (await br.newContext(ctxOpt)).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
    await p.goto(`http://localhost:${PORT}/${page3d ? '3d/' : ''}index.html`);
    if (page3d) await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); else await p.waitForFunction(() => window.State && window.World && window.BattleUI, null, { timeout: 60000 });
    await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.battleSpeed = 'fast'; d.hero.level = 40; ['lina', 'kyle', 'mina'].forEach((id) => State.joinCompanion(id)); World.start(); World.encounter = () => { }; });
    await p.waitForTimeout(1500);
    for (const num of AREAS) {
      const a = pack.assets.find((x) => x.number === num); const mm = a.maps.find((m) => process.env.HIDDEN ? m.hidden : !m.hidden) || a.maps[0]; const mapId = mm.mapId;
      for (const layout of page3d ? LAYOUTS : ['2d']) {
        const t0 = Date.now();
        const info0 = await p.evaluate(([mapId, layout, boss]) => {
          if (layout !== '2d') localStorage.setItem('mtq3d-battle-layout', layout); localStorage.setItem('mtq3d-battle-bg', 'photo');
          const m = World.getMap(mapId); let sx = -1, sy = -1; const d = State.data;
          for (let y = 1; y < m.h - 1 && sx < 0; y++) for (let x = 1; x < m.w - 1; x++) if (m.passable(x, y, d) && !m.warpAt(x, y) && !m.eventAt(x, y)) { sx = x; sy = y; break; }
          World.busy = false; World.enterMap(mapId, sx, sy, 'down', { raw: true });
          const z = m.def && m.def.encounters && m.def.encounters.zones && m.def.encounters.zones[0]; const g = z && z.groups && z.groups[0]; const ids = (g && g.length ? g.slice(0, 3) : ['slime']).filter((id) => window.ENEMIES[id]);
          const bossId = boss ? (Object.keys(window.ENEMIES).find((k) => /^boss_/.test(k)) || ids[0]) : null;
          window.__bp = BattleUI.start(boss ? [bossId] : (ids.length ? ids : ['slime']), boss ? { boss: true } : {}); return { at: [sx, sy], ids, mapId: World.map.id };
        }, [mapId, layout, !!process.env.BOSS]);
        await p.waitForFunction(() => { const sc = BattleUI.scene; return sc && sc.bg && sc.bg._photo; }, null, { timeout: 30000 }).catch(() => { });
        if (page3d) await p.waitForFunction(() => window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo() && BattleStage3D.actorsInfo().ready >= BattleStage3D.actorsInfo().want && BattleStage3D.actorsInfo().want > 0, null, { timeout: 30000 }).catch(() => { });
        await p.waitForTimeout(1200);
        const r = await p.evaluate(() => { const sc = BattleUI.scene; if (!sc || !sc.bg65) return null; const BG = BattleBG65; const k = BG.photoKey(sc.bg65); const st = BG.photoState(k); const B = window.MTQ3D && MTQ3D.battle; return { key: k, mapId: sc.bg65.mapId, place: sc.bg65.place, boss: sc.bg65.boss, url: st && st.url && st.url.replace(/^.*battle-backgrounds\//, ''), state: st && st.state, w: st && st.w, h: st && st.h, photo2d: sc.bg && sc.bg._photo || null, photo3d: B ? !!B.photoSrc : null, back3d: B ? B.backKind || null : null, layout: B ? B.layout : '2d' }; });
        const name = String(num).padStart(2, '0') + '_' + a.assetId + '_' + (page3d ? '3d_' : '') + layout + '.jpg';
        await p.screenshot({ path: SHOT + name, type: 'jpeg', quality: 72, timeout: 120000 });
        const good = r && r.key === a.variant && r.state === 'ok' && r.url === a.file.replace('assets/battle-backgrounds/', '') && r.w === 1672 && r.h === 941 && r.photo2d === a.variant && r.mapId === mapId && (layout !== 'front' || r.photo3d === true) && (layout !== 'side' || r.back3d === 'photo');
        ok(good, `${num} ${a.name}（${mapId}）${page3d ? '3D ' + layout : '2D'}：${a.variant}・${Date.now() - t0}ms ${good ? '' : JSON.stringify(r)}`);
        out.runs.push(Object.assign({ num, mapId, page: pg, layout, shot: name }, r || {}));
        await p.evaluate(() => { try { const sc = BattleUI.scene; if (sc) Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); BattleUI.scene = null; document.querySelectorAll('#battle-party,#battle-msg').forEach((n) => n.classList.remove('on')); document.querySelectorAll('.rw-list, .rw-panel, .rw-msg, #auto-battle').forEach((n) => n.remove()); World.busy = false; } catch (e) { } });
        await p.waitForTimeout(300);
      }
    }
    ok(errs.length === 0, (page3d ? '3D' : '2D') + '版：ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  }
  out.fails = fails; fs.writeFileSync(SHOT + 'result.json', JSON.stringify(out, null, 1));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
