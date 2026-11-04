// v7.5 追加の敵35体：ブラウザ（ヘッドレス Chromium・ソフトウェア描画。実機・GPU ではない）で確かめて撮る
//   ① 35枚の画像を読めるか・加工した絵の四隅と外周が透明か（四角い背景がない）・半透明の白い縁の割合（目安）
//   ② 1体ずつの戦闘：明るい背景（天空神殿）と暗い背景（魔王城）・2D版／3D 前後／3D 横並び。名前・HPバーの位置が画面の中・メッセージ欄や味方の欄に重ならない・3Dでは新しい絵の立体
//   ③ 複数体・大柄・浮遊・半透明の組み合わせ：画面の中・敵どうしの重なり
//   ④ 図鑑の画像（2D版）
// 環境変数：PORT・DEV（スマホの端末名）・TAG・PAGES（"2d,3d"）・LAYOUTS（"front,side"）・BGS（"bright,dark"）・IDS（"id1,id2"）・SINGLES=0・MULTI=0・BOOK=0
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const TAG = process.env.TAG || 'pc'; const SHOT = (process.env.SHOTDIR || '/home/claude/work/p3d/shots/v75/') + TAG + '/'; fs.mkdirSync(SHOT, { recursive: true });
const PAGES = (process.env.PAGES || '2d,3d').split(','); const LAYOUTS = (process.env.LAYOUTS || 'front,side').split(','); const BGS = (process.env.BGS || 'bright,dark').split(',');
const BGMAP = { bright: 'sky_temple_1', dark: 'demon_castle_1' };
const GROUPS = process.env.GSET ? JSON.parse(process.env.GSET) : [['yosen_slime', 'insen_slime', 'yosen_slime'], ['tq_add_robber', 'tq_add_robber', 'bandit'], ['fullleva_ogre', 'tq_add_boredom_imp', 'contrarian_bat'],
  ['tq_add_population_control_drone', 'tq_add_ai_surveillance_drone', 'tq_add_ungrateful_ghost', 'pojipoji_phantom'], ['tq_add_betrayal_troll', 'tq_add_glutton_arienti', 'tq_add_alien_invasion_merchant'], ['tq_add_keyboard_crushers', 'tq_add_wakame_head']];
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const out = { tag: TAG, load: null, singles: [], groups: [], book: null };
  for (const pg of PAGES) {
    const page3d = pg === '3d';
    let ctxOpt = { viewport: { width: 1280, height: 720 } }; if (process.env.DEV) ctxOpt = Object.assign({}, devices[process.env.DEV], { deviceScaleFactor: 1 });
    const p = await (await br.newContext(ctxOpt)).newPage(); const errs = []; const reqs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
    p.on('response', (r) => { if (/enemies_add35\//.test(r.url())) reqs.push({ url: r.url().replace(/^.*enemies_add35\//, ''), status: r.status() }); });
    await p.goto(`http://localhost:${PORT}/${page3d ? '3d/' : ''}index.html`);
    if (page3d) await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); else await p.waitForFunction(() => window.State && window.World && window.BattleUI && window.EnemyArt, null, { timeout: 60000 });
    await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.battleSpeed = 'fast'; d.settings.enemyHpBar = 'on'; d.hero.level = 40; ['lina', 'kyle', 'mina'].forEach((id) => State.joinCompanion(id)); World.start(); World.encounter = () => { }; });
    await p.waitForTimeout(1500);
    // ① 読み込みと加工した絵（ページごと）
    if (!out.load || page3d) {
      const r = await p.evaluate(async () => {
        const L = window.ENEMY_ADD35.list; const res = [];
        for (const e of L) {
          const t0 = performance.now(); const v = await EnemyArt.load(e.id); const ms = Math.round(performance.now() - t0);
          if (!v) { res.push({ id: e.id, ok: false, why: EnemyArt.failed[e.id] || 'null' }); continue; }
          const c = v.img; const x = c.getContext('2d'); const W = c.width, H = c.height; const d = x.getImageData(0, 0, W, H).data; const A = (i, j) => d[(j * W + i) * 4 + 3];
          let border = 0; for (let i = 0; i < W; i++) { border = Math.max(border, A(i, 0), A(i, H - 1)); } for (let j = 0; j < H; j++) { border = Math.max(border, A(0, j), A(W - 1, j)); }
          let semi = 0, whiteSemi = 0, opaque = 0; for (let k = 0; k < W * H; k++) { const a = d[k * 4 + 3]; if (a >= 250) opaque++; if (a > 8 && a < 160) { semi++; if (d[k * 4] > 228 && d[k * 4 + 1] > 228 && d[k * 4 + 2] > 228) whiteSemi++; } }
          res.push({ id: e.id, ok: true, ms, src: v.source, pack: v.pack, w: W, h: H, draw: [v.w, v.h], lift: v.lift, foot: +v.foot.toFixed(4), border, semiPct: +(semi / (W * H) * 100).toFixed(1), whiteSemiPct: semi ? +(whiteSemi / semi * 100).toFixed(1) : 0, opaquePct: +(opaque / (W * H) * 100).toFixed(1) });
        }
        return res;
      });
      out.load = out.load || {}; out.load[pg] = r;
      const bad = r.filter((q) => !q.ok || q.src !== 'enemyart' || q.pack !== 'add35' || q.border > 40);
      ok(r.length === 35 && !bad.length, (page3d ? '3D' : '2D') + '版：35枚すべて読めて、戦闘用に加工できた（外周は透明＝四角い背景なし。外周の最大アルファ ' + Math.max(...r.map((q) => q.border || 0)) + '）' + JSON.stringify(bad.slice(0, 3)));
      const ws = r.filter((q) => q.whiteSemiPct > 10).map((q) => q.id + ' ' + q.whiteSemiPct + '%'); console.log('     半透明の画素のうち白に近いもの（10%超）：' + (ws.join('、') || 'なし'));
      ok(reqs.every((q) => q.status === 200 && /\.webp$/.test(q.url)), (page3d ? '3D' : '2D') + '版：読んだのは WebP だけ（PNG は読まない）・すべて 200（' + reqs.length + '件）');
    }
    // ② 1体ずつ
    const IDS = process.env.IDS ? process.env.IDS.split(',') : await p.evaluate(() => window.ENEMY_ADD35.list.map((r) => r.id));
    const start = async (ids, mapId, layout) => {
      await p.evaluate(([ids, mapId, layout]) => {
        if (layout !== '2d') localStorage.setItem('mtq3d-battle-layout', layout); localStorage.setItem('mtq3d-battle-bg', 'photo');
        const m = World.getMap(mapId); let sx = -1, sy = -1; const d = State.data;
        for (let y = 1; y < m.h - 1 && sx < 0; y++) for (let x = 1; x < m.w - 1; x++) if (m.passable(x, y, d) && !m.warpAt(x, y) && !m.eventAt(x, y)) { sx = x; sy = y; break; }
        World.busy = false; World.enterMap(mapId, sx, sy, 'down', { raw: true }); State.partyActors().forEach((a) => { a.hp = 9999; }); window.__bp = BattleUI.start(ids, {});
      }, [ids, mapId, layout]);
      await p.waitForFunction((ids) => { const sc = BattleUI.scene; return sc && sc.b && ids.every((id) => !EnemyArt.adopted(id) || EnemyArt.ready[id] || EnemyArt.failed[id]); }, ids, { timeout: 30000 }).catch(() => { });
      if (page3d) await p.waitForFunction(() => { const i = window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo(); return i && i.want > 0 && i.ready >= i.want; }, null, { timeout: 30000 }).catch(() => { });
      await p.waitForTimeout(900);
      return p.evaluate((ids) => {
        const sc = BattleUI.scene; if (!sc || !sc.b) return null; const cvs = Engine.canvas; const W = cvs.width, H = cvs.height; const cr = cvs.getBoundingClientRect(); const kx = cr.width / W, ky = cr.height / H;
        const scr = (r) => ({ x0: cr.left + r.x * kx, x1: cr.left + (r.x + r.w) * kx, y0: cr.top + r.y * ky, y1: cr.top + (r.y + r.h) * ky });
        const dom = (sel) => { const n = document.querySelector(sel); if (!n || !n.offsetParent && getComputedStyle(n).position !== 'fixed') return null; const q = n.getBoundingClientRect(); return q.width && q.height ? q : null; };
        const party = dom('#battle-party.on') || dom('#battle-party'); const msg = dom('#battle-msg.on');
        const rects = sc.b.enemies.map((e, i) => { const r = sc.enemyRect(i, W, H); const s = scr(r); return { id: e.defId, name: e.name, r: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) }, s, from3d: !!r.from3d, est: !!r.est, vis: BattleUI.enemyVisual(e).source, pack: BattleUI.enemyVisual(e).pack || null }; });
        const inside = rects.every((q) => q.r.x >= -2 && q.r.x + q.r.w <= W + 2 && q.r.y - 24 >= -2 && q.r.y + q.r.h <= H);
        const ov = (a, b) => a && b && a.x0 < b.right && a.x1 > b.left && a.y0 < b.bottom && a.y1 > b.top;
        const hitParty = rects.filter((q) => ov(q.s, party)).map((q) => q.id); const hitMsg = rects.filter((q) => ov({ x0: q.s.x0, x1: q.s.x1, y0: q.s.y0 - 24 * ky, y1: q.s.y0 }, msg)).map((q) => q.id);
        let overlap = 0; for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { const a = rects[i].r, b = rects[j].r; const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x); if (ox > 0) overlap = Math.max(overlap, ox / Math.min(a.w, b.w)); }
        const B = window.BattleStage3D && BattleStage3D.actorsInfo ? BattleStage3D.actorsInfo() : null;
        return { W, H, rects, inside, hitParty, hitMsg, overlap: +overlap.toFixed(2), a3d: B ? B.enemies.map((e) => ({ id: e.id, source: e.source, ready: e.ready, size: e.size })) : null, failedArt: B ? B.failedArt : null, layout: window.MTQ3D && MTQ3D.battle ? MTQ3D.battle.layout : '2d', bgKey: sc.bg65 ? BattleBG65.photoKey(sc.bg65) : null };
      }, ids);
    };
    const close = () => p.evaluate(() => { try { const sc = BattleUI.scene; if (sc) Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); BattleUI.scene = null; document.querySelectorAll('#battle-party,#battle-msg').forEach((n) => n.classList.remove('on')); document.querySelectorAll('.rw-list, .rw-panel, .rw-msg, #auto-battle').forEach((n) => n.remove()); World.busy = false; } catch (e) { } });
    const layouts = page3d ? LAYOUTS : ['2d'];
    if (process.env.SINGLES !== '0') for (const layout of layouts) for (const bg of BGS) {
      let nBad = 0;
      for (const id of IDS) {
        const r = await start([id], BGMAP[bg], layout); const no = await p.evaluate((id) => window.ENEMY_ADD35.list.find((q) => q.id === id).no, id);
        const name = String(no).padStart(2, '0') + '_' + id + '.jpg'; const dir = SHOT + pg + '_' + layout + '_' + bg + '/'; fs.mkdirSync(dir, { recursive: true }); await p.screenshot({ path: dir + name, type: 'jpeg', quality: 70, timeout: 120000 });
        const good = r && r.inside && !r.hitParty.length && !r.hitMsg.length && r.rects[0].vis === 'enemyart' && r.rects[0].pack === 'add35' && (!page3d || (r.a3d && r.a3d[0] && r.a3d[0].source === 'enemyart' && r.a3d[0].ready && !r.failedArt));
        if (!good) { nBad++; console.log('  NG ' + id + ' ' + JSON.stringify(r)); }
        out.singles.push(Object.assign({ page: pg, layout, bg, id, shot: dir + name }, r || {})); await close(); await p.waitForTimeout(200);
      }
      ok(!nBad, (page3d ? '3D ' + layout : '2D') + '・' + (bg === 'bright' ? '明るい背景（天空神殿）' : '暗い背景（魔王城）') + '：' + IDS.length + '体を1体ずつ。新しい絵' + (page3d ? '（3Dの立体）' : '') + '・名前とHPバーが画面の中・メッセージ欄と味方の欄に重ならない（NG ' + nBad + '）');
    }
    // ③ 複数体
    if (process.env.MULTI !== '0') for (const layout of layouts) {
      let nBad = 0;
      for (const [gi, g] of GROUPS.entries()) {
        const r = await start(g, BGMAP.dark, layout); const dir = SHOT + pg + '_' + layout + '_groups/'; fs.mkdirSync(dir, { recursive: true }); const name = 'g' + gi + '_' + g.map((x) => x.replace('tq_add_', '')).join('+') + '.jpg';
        await p.screenshot({ path: dir + name, type: 'jpeg', quality: 70, timeout: 120000 });
        const good = r && r.inside && !r.hitParty.length && !r.hitMsg.length && r.overlap <= 0.12 && (!page3d || (r.a3d && r.a3d.length === g.length && r.a3d.every((q) => q.ready) && !r.failedArt));
        if (!good) { nBad++; console.log('  NG group ' + g.join('+') + ' ' + JSON.stringify(r)); } else console.log('     ' + g.join('+') + '：重なり ' + Math.round(r.overlap * 100) + '%・幅 ' + r.rects.map((q) => q.r.w).join('/'));
        out.groups.push(Object.assign({ page: pg, layout, g, shot: dir + name }, r || {})); await close(); await p.waitForTimeout(200);
      }
      ok(!nBad, (page3d ? '3D ' + layout : '2D') + '：複数体（スライム3体・強盗2体＋山賊・オーガ＋小悪魔＋コウモリ・ドローン2種＋亡霊＋霊・大柄3体・二人組＋ワカメ頭）が画面の中・敵どうしの重なり12%以下（NG ' + nBad + '）');
    }
    // ④ 図鑑（2D版）
    if (!page3d && process.env.BOOK !== '0') {
      await p.evaluate(() => { const d = State.data; d.bestiary = {}; window.ENEMY_ADD35.list.forEach((r) => { d.bestiary[r.id] = { seen: 1, defeated: 1 }; }); window.__bk = Menu.bestiary(); });
      await p.waitForSelector('.bestiary .bs-list', { timeout: 20000 });
      const n = await p.evaluate(async () => { const ids = window.ENEMY_ADD35.list.map((r) => r.id); const list = document.querySelector('.bestiary .bs-list') || document.querySelector('.bestiary'); for (const id of ids) { const row = document.querySelector('.bestiary .bs-row[data-id="' + id + '"]'); if (row) { row.scrollIntoView(); await new Promise((r) => setTimeout(r, 120)); } } await new Promise((r) => setTimeout(r, 800)); return ids.map((id) => { const box = document.querySelector('.bestiary .bs-img[data-id="' + id + '"]'); const c = box && box.querySelector('canvas.bs-new'); return { id, ok: !!c, w: c ? c.width : 0, h: c ? c.height : 0 }; }); });
      const row = await p.$('.bestiary .bs-row[data-id="tq_add_robber"]'); if (row) await row.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await p.screenshot({ path: SHOT + 'bestiary_2d.jpg', type: 'jpeg', quality: 72 });
      out.book = n; ok(n.every((q) => q.ok && q.w <= 104 && q.h <= 104), '図鑑：35体の新しい絵（縦横比を保って104px以内）' + JSON.stringify(n.filter((q) => !q.ok).slice(0, 3)));
      await p.evaluate(() => { const b = document.querySelector('.bestiary .rw-panel-close') || document.querySelector('.rw-panel-close'); if (b) b.click(); });
    }
    ok(errs.length === 0, (page3d ? '3D' : '2D') + '版：ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
    await p.close();
  }
  fs.writeFileSync(SHOT + 'result.json', JSON.stringify(out, null, 1));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
