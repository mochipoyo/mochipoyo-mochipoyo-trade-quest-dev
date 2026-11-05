// v7.6 つないだ世界：セーブの互換（3D 版・2D 版）
//   ① この変更の前の版（envsnap_t84 ＝ 818d133）で作ったセーブ（アルカディアの東の海で帆船に乗っている）を 3D 版で読み込み、
//      そのまま東の境目を越えてグラニアへ。セーブして読み直す・ページを読み直して続きから
//   ② 共通の海（時の神殿領の北の海）でセーブ → 「つながない」設定の 3D 版・2D 版で読むと、近い地域の端へ（乗り物ごと）
//   ③ 2D 版の通常のセーブ（mtq-rpg-v2-slot-*）は、3D 版の操作で書き換わらない
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8772; const SHOT = process.env.SHOT || '/home/claude/work/p3d/shots/v76/join76/'; fs.mkdirSync(SHOT, { recursive: true });
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const OLD = process.env.OLD || '/home/claude/envsnap_t84/';
const oldSave = require('child_process').execFileSync('node', ['-e', `const load=require('./rpgload.js');const A=load();const w=A.w;const S=w.State;S.newGame('ふるい','warrior');const d=S.data;
d.flags.s3121_new_prologue=true;d.flags.s3121_prologue_phase='done';d.flags.ship_ready=true;d.hero.level=30;d.hero.jobLevels.warrior=30;w.Actors.refreshSkills(d.hero);['lina','kyle'].forEach(id=>S.joinCompanion(id));d.gold=7654;
const m=w.World.getMap('world');let t=null;for(let x=157;x>=140&&!t;x--)for(let dy=0;dy<30&&!t;dy++)for(const y of [40+dy,40-dy])if(y>=0&&y<m.h&&w.Vehicle.terrainOk('sailboat',m,x,y)){t={x,y};break;}
d.vehicles.sailboat={owned:true,map:'world',x:t.x,y:t.y,port:{map:'world',x:t.x,y:t.y}};d.aboard='sailboat';d.pos={map:'world',x:t.x,y:t.y,dir:'right'};d.visited.world=true;process.stdout.write(S.exportJSON());`], { cwd: '/home/claude/work', env: Object.assign({}, process.env, { RPG_DIR: OLD }), maxBuffer: 1 << 26 }).toString();
const old = JSON.parse(oldSave);
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('mtq3d-quality', 'high'); } catch (e) { } });
  const errs = []; const hook = (p) => { p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); }); };
  let p = await ctx.newPage(); hook(p);
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  // 2D 版の通常のセーブ（利用者のセーブの代わり）を置いておく
  await p.evaluate((txt) => { localStorage.setItem('mtq-rpg-v2-slot-2', txt); }, oldSave);
  const norm0 = await p.evaluate(() => Object.keys(localStorage).filter((k) => /^mtq-rpg-v2-/.test(k)).sort().map((k) => k + ':' + localStorage.getItem(k).length + ':' + localStorage.getItem(k).slice(-40)).join('|'));
  const clean = () => p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); World.busy = false; });
  const waitCur = (id) => p.waitForFunction((id) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === id && World.map.id === id, id, { timeout: 180000 }).then(() => true).catch(() => false);
  // ① 前の版のセーブを読む
  await clean();
  const r1 = await p.evaluate((txt) => { const d = State.importJSON(txt); State.data = d; World.start(); return { map: World.map.id, x: World.player.x, y: World.player.y, aboard: State.data.aboard, gold: d.gold, on: World76.on() }; }, oldSave);
  ok(r1.on && r1.map === 'world' && r1.x === old.pos.x && r1.y === old.pos.y && r1.aboard === 'sailboat' && r1.gold === 7654, '前の版のセーブを 3D 版（つないだ世界）で読めた：同じ場所・帆船に乗ったまま ' + JSON.stringify(r1));
  ok(await waitCur('world'), '3D：アルカディアを表示');
  await clean();
  const cr = await p.evaluate(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); for (let i = 0; i < 40 && World.map.id === 'world'; i++) { while (World.player.moving) await sleep(16); World.tryMove('right'); await sleep(20); for (let k = 0; k < 40 && World.player.moving; k++) await sleep(16); } return { map: World.map.id, x: World.player.x, y: World.player.y, veh: State.data.vehicles.sailboat.map, aboard: State.data.aboard }; });
  ok(cr.map === 'world_grania' && cr.veh === 'world_grania' && cr.aboard === 'sailboat', '前の版のセーブのまま、東の境目を越えてグラニアへ（帆船ごと）' + JSON.stringify(cr));
  await waitCur('world_grania'); await p.waitForTimeout(800);
  const s1 = await p.evaluate(() => { const saved = State.save(3); const d2 = State.load(3); return { saved, map: d2.pos.map, x: d2.pos.x, y: d2.pos.y, veh: d2.vehicles.sailboat.map, aboard: d2.aboard, gold: d2.gold, key: State.keyPrefix }; });
  ok(s1.saved && s1.map === 'world_grania' && s1.x === cr.x && s1.y === cr.y && s1.veh === 'world_grania' && s1.aboard === 'sailboat' && s1.gold === 7654 && s1.key === 'mtq-3d-slot-', '越えた先でセーブして読み直せる（3D 版の保存先 ' + s1.key + '）' + JSON.stringify(s1));
  // ページを読み直して続きから
  await p.reload(); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); await clean();
  const r2 = await p.evaluate(() => { State.data = State.load(3); World.start(); return { map: World.map.id, x: World.player.x, y: World.player.y, aboard: State.data.aboard }; });
  ok(r2.map === 'world_grania' && r2.x === cr.x && r2.y === cr.y && r2.aboard === 'sailboat', 'ページを読み直しても、グラニアの同じ場所（帆船）から続けられる ' + JSON.stringify(r2));
  ok(await waitCur('world_grania'), '3D：読み直したあとグラニアを表示');
  await p.waitForTimeout(1500); await p.screenshot({ path: SHOT + '8_oldsave_continue.jpg', type: 'jpeg', quality: 80, timeout: 120000 });
  // ② 共通の海でセーブ（世界の座標 400,220 の地図）
  await clean();
  const r3 = await p.evaluate(() => { const d = State.data; ['galleon_ready', 'yorn_letter_done'].forEach((f) => d.flags[f] = true); const SEA = World76.mapAt(400, 220); window.__sea = SEA; const m = World.getMap(SEA); let t = null; for (let y = 40; y < 80 && !t; y++) for (let x = 60; x < 100; x++) if (Vehicle.terrainOk('galleon', m, x, y)) { t = { x, y }; break; }
    d.vehicles.galleon = { owned: true, map: SEA, x: t.x, y: t.y, port: { map: 'world_tempus', x: 80, y: 60 } }; d.aboard = 'galleon'; World.enterMap(SEA, t.x, t.y, 'down', { raw: true }); const saved = State.save(3); return { saved, map: World.map.id, sea: SEA, name: World.map.name, t, place: Saves.placeName(SEA), txt: State.exportJSON() }; });
  ok(r3.saved && r3.map === r3.sea && /の沖|外海/.test(r3.place) && r3.place === r3.name, 'つないだ世界：共通の海「' + r3.name + '」（' + r3.sea + '）でセーブできた ' + JSON.stringify(r3.t));
  await waitCur(r3.sea);
  // 「つながない」設定にして読み直す
  await p.evaluate(() => localStorage.setItem('mtq3d-join', 'off')); await p.reload(); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); await clean();
  const r4 = await p.evaluate((SEA) => { const info = Saves.placeName(SEA); State.data = State.load(3); World.start(); return { on: World76.on(), map: World.map.id, x: World.player.x, y: World.player.y, aboard: State.data.aboard, veh: State.data.vehicles.galleon.map, defs: !!MAP_DEFS[World.map.id], info }; }, r3.sea);
  ok(!r4.on && r4.map !== 'sea76_south' && r4.defs && r4.aboard === 'galleon' && r4.veh === r4.map && r4.info === r3.name, '「つながない」3D 版で共通の海のセーブを読むと、となりの地域の端へ（遠洋航海船に乗ったまま）' + JSON.stringify(r4));
  ok(await waitCur(r4.map), '3D：移した先の地域を表示（' + r4.map + '）');
  await p.evaluate(() => localStorage.removeItem('mtq3d-join'));
  const norm1 = await p.evaluate(() => Object.keys(localStorage).filter((k) => /^mtq-rpg-v2-/.test(k)).sort().map((k) => k + ':' + localStorage.getItem(k).length + ':' + localStorage.getItem(k).slice(-40)).join('|'));
  ok(norm0 === norm1 && /slot-2/.test(norm1), '2D 版の通常のセーブ（mtq-rpg-v2-slot-*）は 3D 版の操作で変わらない');
  await p.close();
  // 2D 版で外海のセーブを読む
  p = await ctx.newPage(); hook(p); await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForFunction(() => window.State && window.World && window.World76, null, { timeout: 60000 });
  const r5 = await p.evaluate((txt) => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); const d = State.importJSON(txt); State.data = d; World.start(); return { on: World76.on(), map: World.map.id, x: World.player.x, y: World.player.y, aboard: State.data.aboard, veh: State.data.vehicles.galleon.map, w: World.map.w, h: World.map.h }; }, r3.txt);
  ok(!r5.on && r5.map !== r3.sea && r5.aboard === 'galleon' && r5.veh === r5.map && r5.w === 160 && r5.h === 120, '2D 版で共通の海のセーブを読むと、近い地域の端へ（2D はつながない・地図は 160×120 のまま）' + JSON.stringify(r5));
  await p.waitForTimeout(800); await p.screenshot({ path: SHOT + '9_2d_from_filler.jpg', type: 'jpeg', quality: 80, timeout: 120000 });
  await p.evaluate(() => { localStorage.removeItem('mtq-rpg-v2-slot-2'); localStorage.removeItem('mtq-3d-slot-3'); });
  ok(errs.length === 0, 'ページのエラーなし ' + errs.slice(0, 3).join(' / '));
  console.log(fails.length ? '結果：NG ' + fails.length : '結果：すべて OK'); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
