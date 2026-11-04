// v7.4 39ダンジョンの戦闘背景：画像が読めない（404）・背景品質「軽量」・WebGL が使えないときに、従来の背景で戦闘が進むか（3D版のページ）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = '/home/claude/work/p3d/shots/v74/fallback/'; fs.mkdirSync(SHOT, { recursive: true });
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const setup = async (p, wait3d) => {
  await p.goto(`http://localhost:${PORT}/3d/index.html`);
  if (wait3d) await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); else await p.waitForFunction(() => window.State && window.World && window.BattleUI && window.MochiQuest, null, { timeout: 120000 });
  await p.waitForTimeout(wait3d ? 0 : 4000);
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; d.settings.battleSpeed = 'fast'; d.hero.level = 40; World.start(); World.encounter = () => { }; });
  await p.waitForTimeout(1200);
};
const fight = async (p, mapId) => {
  await p.evaluate((mapId) => { localStorage.setItem('mtq3d-battle-layout', 'side'); const m = World.getMap(mapId); let sx = -1, sy = -1; for (let y = 1; y < m.h - 1 && sx < 0; y++) for (let x = 1; x < m.w - 1; x++) if (m.passable(x, y, State.data) && !m.warpAt(x, y) && !m.eventAt(x, y)) { sx = x; sy = y; break; } World.busy = false; World.enterMap(mapId, sx, sy, 'down', { raw: true }); window.__bp = BattleUI.start(['slime'], {}); }, mapId);
  await p.waitForTimeout(6000);
  return p.evaluate(() => { const sc = BattleUI.scene; const BG = BattleBG65; const k = sc && sc.bg65 && BG.photoKey(sc.bg65); const st = k && BG.photoState(k); const B = window.MTQ3D && MTQ3D.battle; return { key: k, state: st && st.state, bg: !!(sc && sc.bg), photo2d: sc && sc.bg && sc.bg._photo || null, back3d: B ? B.backKind || null : null, enabled3d: B && B.enabled ? B.enabled() : null, why: B && B.whyOff ? B.whyOff() : null }; });
};
(async () => {
  const br = await chromium.launch();
  { // ① 404
    const p = await (await br.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.route('**/dungeons39/05_iron_mine.webp', (r) => r.fulfill({ status: 404, body: 'not found' }));
    await setup(p, true); const r = await fight(p, 'iron_mine_1'); await p.screenshot({ path: SHOT + '404_iron_mine_3d_side.jpg', type: 'jpeg', quality: 72 });
    ok(r.key === 'd39_iron_mine' && r.state === 'error' && r.bg && !r.photo2d && r.back3d === 'proc' && !errs.length, '画像が404：従来の手描きの背景・3Dの景色で戦闘が進む（ページのエラーなし）' + JSON.stringify(r) + errs.slice(0, 2).join(','));
  }
  { // ② 品質「軽量」
    const p = await (await br.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); const req = []; p.on('request', (q) => { if (/dungeons39\//.test(q.url())) req.push(q.url()); });
    await setup(p, true); await p.evaluate(() => { State.data.settings.battleBg = 'low'; }); const r = await fight(p, 'sky_temple_1'); await p.screenshot({ path: SHOT + 'low_sky_temple.jpg', type: 'jpeg', quality: 72 });
    ok(r.key === 'd39_sky_temple' && r.bg && !r.photo2d && r.enabled3d === false && !req.length && !errs.length, '品質「軽量」：画像を読まず、従来の軽い2Dの背景（3Dの舞台も使わない）' + JSON.stringify(r) + ' 読んだ画像 ' + req.length);
  }
  { // ③ WebGL が使えない
    const p = await (await br.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, o) { if (/webgl/i.test(String(t))) return null; return g.call(this, t, o); }; });
    await setup(p, false); const r = await fight(p, 'demon_castle_1'); await p.screenshot({ path: SHOT + 'nowebgl_demon_castle.jpg', type: 'jpeg', quality: 72 });
    ok(r.key === 'd39_demon_castle' && r.bg && r.photo2d === 'd39_demon_castle' && !errs.length, 'WebGL が使えない：2Dの戦闘画面で、魔王城の絵（ページのエラーなし）' + JSON.stringify(r) + errs.slice(0, 2).join(','));
  }
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
