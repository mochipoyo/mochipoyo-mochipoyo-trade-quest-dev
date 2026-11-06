// v8.0 新しいボス 19 体（3D・ヘッドレス Chromium のソフトウェア描画。実機・GPU ではない）
//   ① 19 枚の画像を読めるか・戦闘用に加工した絵の外周が透明か（四角い背景がない）・絵の中身が画像の端に触れていないか（翼・杖・角・天秤の皿が欠けない）
//   ② そのボスのボスの間で戦闘（前後・横並び）：名前がパックの display_name のまま・名前と HP バーが画面の中・メッセージ欄や味方の欄に重ならない・3D の立体が新しい絵
//   ③ 外の地図の門（ワープの床）・ボスの間の奥のボスの姿（シンボル）を撮る
// 環境変数：PORT・SHOT・LAYOUTS（"front,side"）・KEYS（"mochiko,..."）・GATES=0・BATTLE=0
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v80/'; fs.mkdirSync(SHOT, { recursive: true });
const LAYOUTS = (process.env.LAYOUTS || 'front,side').split(',');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'low'); } catch (e) { } });
  const p = await ctx.newPage(); const errs = []; const reqs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  p.on('response', (r) => { if (/bosses_19\//.test(r.url())) reqs.push({ url: r.url().replace(/^.*bosses_19\//, ''), status: r.status() }); });
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 0; World.start(); World.encounter = () => { }; });
  await p.waitForTimeout(1500);
  const out = { load: null, battles: [], gates: [] };
  const KEYS = process.env.KEYS ? process.env.KEYS.split(',') : await p.evaluate(() => BOSS19.bosses.map((b) => b.key));
  const man = JSON.parse(fs.readFileSync('/home/claude/envwork/docs/tools/v80/boss19_manifest.json', 'utf8')).bosses;
  // ① 画像
  const L = await p.evaluate(async () => {
    const res = [];
    for (const e of BOSS19.list) {
      const v = await EnemyArt.load(e.id); if (!v) { res.push({ id: e.id, ok: false, why: EnemyArt.failed[e.id] || 'null' }); continue; }
      const c = v.img; const x = c.getContext('2d'); const W = c.width, H = c.height; const d = x.getImageData(0, 0, W, H).data; const A = (i, j) => d[(j * W + i) * 4 + 3];
      let border = 0; for (let i = 0; i < W; i++) border = Math.max(border, A(i, 0), A(i, H - 1)); for (let j = 0; j < H; j++) border = Math.max(border, A(0, j), A(W - 1, j));
      let x0 = W, y0 = H, x1 = -1, y1 = -1; for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (A(i, j) > 40) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
      res.push({ id: e.id, ok: true, src: v.source, pack: v.pack, w: W, h: H, draw: [v.w, v.h], lift: v.lift, border, margin: Math.min(x0, y0, W - 1 - x1, H - 1 - y1) });
    }
    return res;
  });
  out.load = L; const bad = L.filter((q) => !q.ok || q.src !== 'enemyart' || q.pack !== 'boss19' || q.border > 40 || q.margin < 2);
  ok(L.length === 19 && !bad.length, '19 枚すべて読めて戦闘用に加工できた・外周は透明（最大アルファ ' + Math.max(...L.map((q) => q.border || 0)) + '）・絵の中身は端から ' + Math.min(...L.map((q) => q.margin || 0)) + 'px 以上離れている（欠けない）' + JSON.stringify(bad.slice(0, 3)));
  ok(reqs.length >= 19 && reqs.every((q) => q.status === 200 && /\.webp(\?|$)/.test(q.url)), '読んだのは WebP だけ・すべて 200（' + reqs.length + '件）');
  // ② 戦闘
  const start = async (key, layout) => {
    await p.evaluate(([key, layout]) => {
      localStorage.setItem('mtq3d-battle-layout', layout); localStorage.setItem('mtq3d-battle-bg', 'photo');
      const Lr = EARTH78_LAIRS.find((q) => q.key === key.split(':')[0]); World.busy = false; World.enterMap(Lr.id, 10, 13, 'up', { raw: true }); State.partyActors().forEach((a) => { a.hp = 9999; });
      window.__bp = BattleUI.start([key.indexOf(':') > 0 ? key.split(':')[1] : Lr.boss], { boss: true });
    }, [key, layout]);
    await p.waitForFunction(() => { const sc = BattleUI.scene; return sc && sc.b && sc.b.enemies.every((e) => !EnemyArt.adopted(e.defId) || EnemyArt.ready[e.defId] || EnemyArt.failed[e.defId]); }, null, { timeout: 30000 }).catch(() => { });
    await p.waitForFunction(() => { const i = window.BattleStage3D && BattleStage3D.actorsInfo && BattleStage3D.actorsInfo(); return i && i.want > 0 && i.ready >= i.want; }, null, { timeout: 30000 }).catch(() => { });
    await p.waitForTimeout(+(process.env.WAIT || 4200));   // 「― 名前 ―」の帯が消えるまで（WAIT で長くできる）
    return p.evaluate(() => {
      const sc = BattleUI.scene; if (!sc || !sc.b) return null; const cvs = Engine.canvas; const W = cvs.width, H = cvs.height; const cr = cvs.getBoundingClientRect(); const kx = cr.width / W, ky = cr.height / H;
      const scr = (r) => ({ x0: cr.left + r.x * kx, x1: cr.left + (r.x + r.w) * kx, y0: cr.top + r.y * ky, y1: cr.top + (r.y + r.h) * ky });
      const dom = (sel) => { const n = document.querySelector(sel); if (!n || !n.offsetParent && getComputedStyle(n).position !== 'fixed') return null; const q = n.getBoundingClientRect(); return q.width && q.height ? q : null; };
      const party = dom('#battle-party.on') || dom('#battle-party'); const msg = dom('#battle-msg.on');
      const e = sc.b.enemies[0]; const r = sc.enemyRect(0, W, H); const s = scr(r); const vis = BattleUI.enemyVisual(e);
      const inside = r.x >= -2 && r.x + r.w <= W + 2 && r.y - 24 >= -2 && r.y + r.h <= H;
      const ov = (a, b) => a && b && a.x0 < b.right && a.x1 > b.left && a.y0 < b.bottom && a.y1 > b.top;
      const B = window.BattleStage3D && BattleStage3D.actorsInfo ? BattleStage3D.actorsInfo() : null;
      return { id: e.defId, name: e.name, W, H, r: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) }, s: { x0: Math.round(s.x0), y0: Math.round(s.y0), x1: Math.round(s.x1), y1: Math.round(s.y1) }, from3d: !!r.from3d, inside, hitParty: ov(s, party), hitMsg: ov({ x0: s.x0, x1: s.x1, y0: s.y0 - 24 * ky, y1: s.y0 }, msg), vis: vis.source, pack: vis.pack,
        a3d: B ? B.enemies.map((q) => ({ id: q.id, source: q.source, ready: q.ready, size: q.size })) : null, failedArt: B ? B.failedArt : null, layout: window.MTQ3D && MTQ3D.battle ? MTQ3D.battle.layout : '?', bg: sc.bgKey || null };
    });
  };
  const close = () => p.evaluate(() => { try { const sc = BattleUI.scene; if (sc) Engine.scenes = Engine.scenes.filter((x) => x !== sc && !x.overlay); BattleUI.scene = null; document.querySelectorAll('#battle-party,#battle-msg').forEach((n) => n.classList.remove('on')); document.querySelectorAll('.rw-list, .rw-panel, .rw-msg, #auto-battle').forEach((n) => n.remove()); World.busy = false; } catch (e) { /* 次へ */ } });
  if (process.env.BATTLE !== '0') for (const layout of LAYOUTS) {
    let nBad = 0; const dir = SHOT + 'battle_' + layout + '/'; fs.mkdirSync(dir, { recursive: true });
    // くらべる相手：これまでのボス（中枢防衛機構）を同じボスの間・同じ並びで
    const base = await start('nanpin:boss_core_defense', layout); await p.screenshot({ path: dir + '00_base_boss_core_defense.jpg', type: 'jpeg', quality: 72 }); await close(); await p.waitForTimeout(250);
    console.log('     くらべる相手（中枢防衛機構）：枠 ' + JSON.stringify(base && base.r) + '・メッセージ欄に名前が重なる ' + (base && base.hitMsg));
    for (const key of KEYS) {
      const r = await start(key, layout); const mm = r && (man.find((q) => q.asset_id === r.id) || (key.indexOf(':') > 0 ? { pack_number: 99, display_name: r.name } : null)); const name = String(mm ? mm.pack_number : 0).padStart(2, '0') + '_' + key + '.jpg';
      await p.screenshot({ path: dir + name, type: 'jpeg', quality: 72, timeout: 120000 });
      const good = r && mm && r.name === mm.display_name && r.inside && !r.hitParty && (!r.hitMsg || (base && base.hitMsg)) && r.vis === 'enemyart' && r.pack === 'boss19' && r.a3d && r.a3d[0] && r.a3d[0].source === 'enemyart' && r.a3d[0].ready && !r.failedArt;
      if (!good) { nBad++; console.log('  NG ' + key + ' ' + JSON.stringify(r)); } else console.log('     ' + key + '：' + r.name + '・枠 ' + JSON.stringify(r.r) + '・背景 ' + r.bg);
      out.battles.push(Object.assign({ layout, key, shot: dir + name }, r || {})); await close(); await p.waitForTimeout(250);
    }
    ok(!nBad, '3D ' + layout + '：' + KEYS.length + '体をそれぞれのボスの間で。名前は display_name のまま・新しい絵の立体・名前と HP バーが画面の中・味方の欄に重ならない・メッセージ欄には重ならない' + (base && base.hitMsg ? '（ただし「〜が現れた！」の欄が名前の帯にかかるのは、これまでのボスも同じ）' : '') + '（NG ' + nBad + '）');
  }
  // ③ 門・ボスの姿
  if (process.env.GATES !== '0') {
    const dir = SHOT + 'gates/'; fs.mkdirSync(dir, { recursive: true });
    for (const key of (process.env.GKEYS || 'nanpin,mesaki,anxiety,ubud,gamemaster,balance').split(',')) {
      const g = await p.evaluate((key) => { const Lr = EARTH78_LAIRS.find((q) => q.key === key); World.busy = false; World.getMap(Lr.map); World.enterMap(Lr.map, Lr.ox, Lr.oy + 1, 'up', { raw: true }); return { map: Lr.map, x: Lr.x, y: Lr.y, ox: Lr.ox, oy: Lr.oy, id: Lr.id }; }, key);
      await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && !MTQ3D.building, g.map, { timeout: 240000 }); await p.waitForTimeout(1200);
      const t = await p.evaluate((g) => { const m = World.map, P = World.player; const cur = MTQ3D.current; let vort = 0; if (cur && cur.root) cur.root.traverse((o) => { if (o.name && o.name.indexOf('lair_vortex_') === 0) vort++; }); return { tile: m.tiles[g.y] && m.tiles[g.y][g.x], pass: m.passable(P.x, P.y, State.data), at: [P.x, P.y], lairGates: cur && cur.lairGates, vortex: vort }; }, g);
      await p.screenshot({ path: dir + key + '_gate.jpg', type: 'jpeg', quality: 78 });
      await p.evaluate((id) => { World.busy = false; World.enterMap(id, 10, 7, 'up', { raw: true }); }, g.id);   /* ボスの姿が見える所（入口は 10,13） */
      await p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && !MTQ3D.building, g.id, { timeout: 240000 });
      await p.waitForFunction(() => { const s = window.BossSymbol && BossSymbol.list ? BossSymbol.list() : null; return !s || s.every((q) => !EnemyArt.adopted(q.enemy) || EnemyArt.ready[q.enemy]); }, null, { timeout: 30000 }).catch(() => { });
      await p.waitForTimeout(2200);
      const sym = await p.evaluate(() => { const S = MTQ3D.current && MTQ3D.current.bossSymbols; const n = S ? (S.children ? S.children.length : (S.length || 0)) : null; const ev = World.map.events.find((e) => e.type === 'boss'); const rc = window.RecLevel && RecLevel.at(World.map); return { n, ev: ev && [ev.x, ev.y], rec: rc && RecLevel.text(rc), hud: (document.querySelector('#hud .hud-rec') || {}).textContent || null }; });
      await p.screenshot({ path: dir + key + '_lair.jpg', type: 'jpeg', quality: 78 });
      out.gates.push({ key, g, t, sym }); console.log('     門 ' + key + ' ' + JSON.stringify({ g, t, sym }));
    }
    ok(out.gates.every((q) => q.t.pass && q.t.lairGates >= 1 && q.t.vortex >= 1 && q.sym.ev && /推奨Lv/.test(q.sym.rec || '')), '門の 3D の形（石の輪と渦）がある・門の前は歩ける・ボスの間（奥にボス・推奨レベル）を ' + out.gates.length + ' か所撮った');
  }
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  fs.writeFileSync(SHOT + 'result.json', JSON.stringify(out, null, 1));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
