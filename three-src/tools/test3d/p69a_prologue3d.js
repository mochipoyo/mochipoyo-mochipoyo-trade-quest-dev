// v6.9 西暦3121年の新しいプロローグを 3D 版で通す：新規ゲーム → アサナ村（平和・祭り・徴税官）→ 夜の襲撃（炎・煙・黒い影）→ ポヨ村（夜のハケイ）→ 村長 → リーナ → 門 → リヴェル王
//   会話は自動で進める（2D 版と同じ処理を 3D のページで動かす）。場面ごとに 3D の場面ができていること（マップID・炎の数・NPC のモデル）と、
//   場面の画像（SHOTDIR）を残す。作業用のフォルダ（CommonJS）にコピーして実行する。環境変数 PORT・SHOTDIR・DEV
const { chromium, devices } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = process.env.SHOTDIR || '/home/claude/work/p3d/shots/v69a/'; fs.mkdirSync(SHOT, { recursive: true });
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); let o = { viewport: { width: 1280, height: 720 } }; if (process.env.DEV) o = Object.assign({}, devices[process.env.DEV], { deviceScaleFactor: 1 });
  const p = await (await br.newContext(o)).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  // 会話は自動（選択肢は ANS の順、なければ先頭）。演出の待ち時間は短く
  await p.evaluate(() => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    window.__LOG = []; window.__ANS = [];
    Win.message = (lines, o) => { (Array.isArray(lines) ? lines : [lines]).forEach((l) => __LOG.push(((o && o.name) ? o.name + '「' : '') + l)); return Promise.resolve(); };
    Win.choice = (pr, opts) => Promise.resolve(__ANS.length ? __ANS.shift() : 0); Win.prompt = () => Promise.resolve('もち'); Win.list = () => Promise.resolve(0); Win.toast = () => { };
    Story3121.timeScale = 0.05; World.encounter = function () { };
    window.__wait = async () => { for (let k = 0; k < 3; k++) { for (let i = 0; i < 6000 && World.busy; i++) await new Promise((r) => setTimeout(r, 5)); await new Promise((r) => setTimeout(r, 20)); } };
    window.__talk = async (id) => { const n = World.map.npcs.find((x) => x.id === id && !x.hidden); if (!n) return false; World.busy = false; World.talk(n); await __wait(); return true; };
    window.__ev = async (x, y) => { const e = World.map.eventAt(x, y); if (!e) return false; World.busy = false; Events.run(e); await __wait(); return true; };
    window.__step = async (x, y) => { const pl = World.player; pl.x = x; pl.y = y; pl.px = x * 32; pl.py = y * 32; pl.moving = false; World.busy = false; World.onStep(); await __wait(); };
    window.__has = (s) => __LOG.some((l) => l.indexOf(s) >= 0);
  });
  const built = (id) => p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && World.map.id === m, id, { timeout: 120000 }).then(() => true).catch(() => false);
  const info = () => p.evaluate(() => { const c = MTQ3D.current; return { map: c && c.map.id, cov: c && c.coverage, fires: (c && c.fxFires) || 0, smokes: c ? c.smokes.length : 0, npcs: c ? c.npcs.filter((n) => n.root.visible).map((n) => n.npc.id + ':' + n.def.modelId).join(' ') : '', time: State.data.timeOfDay, phase: Story3121.phase(), veil: (document.getElementById('s3121-veil') || {}).style ? document.getElementById('s3121-veil').style.opacity : null }; });
  const shot = async (name, settle) => { await p.waitForTimeout(settle || 2500); await p.screenshot({ path: SHOT + name + '.jpg', type: 'jpeg', quality: 80, timeout: 120000 }); };
  const out = {};
  // 新規ゲーム → アサナ村の家
  await p.evaluate(async () => { __ANS.push(0, 0); await Title.newGame(); await __wait(); });
  ok(await built('asana_home'), '3D：新規ゲームでアサナ村の家の3D（' + JSON.stringify(await info()) + '）');
  out.home = await info(); await shot('01_home');
  await p.evaluate(async () => { World.enterMap('asana_village', 6, 10, 'down'); });
  ok(await built('asana_village'), '3D：平和なアサナ村'); out.village = await info(); ok(out.village.cov === 'generic' && /as_merchant:merchant/.test(out.village.npcs), '平和な村：汎用3D・市場のおじさんのモデル（' + out.village.npcs.slice(0, 120) + '）');
  await p.evaluate(() => { const pl = World.player; pl.x = 15; pl.y = 10; MTQ3D.snap && MTQ3D.snap(); }); await shot('02_village_morning', 3000);
  await p.evaluate(async () => { await __talk('as_merchant'); World.enterMap('asana_home', 5, 7, 'up'); await __wait(); await __talk('as_mio'); World.enterMap('asana_village', 20, 13, 'down'); await __wait(); await __talk('as_raul'); });
  ok(await built('asana_village'), '祭りの夕方'); out.festival = await info(); ok(out.festival.phase === 'festival' && Math.abs(out.festival.time - 0.73) < 0.01, '父の稽古のあと夕方の祭り（' + out.festival.phase + ' ' + out.festival.time + '）');
  await shot('03_festival_evening', 3500);
  await p.evaluate(async () => { await __talk('as_chief'); World.enterMap('asana_home', 2, 2, 'up'); await __wait(); await __ev(1, 1); World.enterMap('asana_village', 6, 10, 'down'); await __wait(); });
  // 徴税官の場面：カメラが広場へ寄る（Story3121.cine）
  await built('asana_village');
  await p.evaluate(() => { World.applyState(World.map); Story3121.cine({ x: 20, y: 13, dist: 11, pitch: 36 }); });
  out.taxBefore = await info(); ok(/as_collector:scholar/.test(out.taxBefore.npcs) && /as_soldier1:guard/.test(out.taxBefore.npcs), '翌朝：広場に徴税官と兵士（' + out.taxBefore.npcs.slice(0, 160) + '）');
  await shot('04_tax_collector', 3500);
  await p.evaluate(() => Story3121.cine(null));
  await p.evaluate(async () => { await __step(6, 11); });
  ok(await p.evaluate(() => State.data.flags.s3121_tax_done && Story3121.phase() === 'after_tax' && __has('顔色を変えた')), '徴税官の場面（3D のページで実行）');
  // 夜の襲撃
  await p.evaluate(async () => { World.enterMap('asana_home', 2, 2, 'up'); await __wait(); await __ev(1, 1); });
  ok(await built('asana_raid'), '3D：夜の襲撃のアサナ村'); out.raid = await info();
  ok(out.raid.fires >= 8 && out.raid.smokes >= 6 && out.raid.time < 0.05, '炎 ' + out.raid.fires + '・煙 ' + out.raid.smokes + '・夜（' + out.raid.time + '）');
  ok(/ar_beast:mon_demon/.test(out.raid.npcs) && /ar_shadow1:mon_beast/.test(out.raid.npcs) && /ar_raul:guard/.test(out.raid.npcs), '黒い影の魔物は魔物のモデル・父ラウル（' + out.raid.npcs.slice(0, 200) + '）');
  await p.evaluate(() => { const pl = World.player; pl.x = 13; pl.y = 12; }); await shot('05_raid_fire', 4000);
  await p.evaluate(() => Story3121.cine({ x: 21, y: 16, dist: 10, pitch: 34 })); await shot('06_raid_father', 3500); await p.evaluate(() => Story3121.cine(null));
  await p.evaluate(async () => { await __step(18, 15); });
  ok(await p.evaluate(() => State.data.flags.s3121_raid_father && State.hasItem('s3121_ledger') && __has('お願い。生きて')), '父と母の別れ（帳簿とお守り）');
  await p.evaluate(async () => { await __step(13, 20); });
  ok(await built('poyo_village'), '3D：脱出 → ポヨ村（夜）'); out.poyoNight = await info();
  ok(out.poyoNight.phase === 'poyo_night' && out.poyoNight.time < 0.05 && out.poyoNight.veil === '0', '夜のポヨ村・幕は上がっている（' + JSON.stringify(out.poyoNight).slice(0, 160) + '）');
  await p.evaluate(async () => { await __step(5, 21); });
  ok(await p.evaluate(() => State.data.flags.s3121_hakei_night && __has('負けたあとにどうするかが大切なんじゃよ')), '夜のハケイ');
  // 夜のハケイの場面の画像（台本のあとの状態から、場面だけ作り直して撮る）
  await p.evaluate(() => { State.data.timeOfDay = 0.02; World.enterMap('poyo_village', 5, 21, 'left'); const n = World.map.npcs.find((x) => x.id === 'poyo_hakei_night'); n.hidden = false; n.x = n.ox = 4; n.y = n.oy = 21; n.dir = 'right'; World.player.x = 6; World.player.y = 21; World.player.dir = 'left'; Story3121.cine({ x: 5, y: 21, dist: 11, pitch: 48 }); });
  await built('poyo_village'); await shot('07_poyo_hakei_night', 4000);
  await p.evaluate(() => { Story3121.cine(null); State.data.timeOfDay = 0.3; World.enterMap('poyo_elder_house', 6, 2, 'down'); });
  await built('poyo_elder_house');
  await p.evaluate(async () => { await __talk('elder_mochizo'); World.enterMap('poyo_church', 5, 7, 'up'); await __wait(); await __talk('lina'); World.enterMap('poyo_village', 21, 30, 'down'); await __wait(); await __step(21, 35); });
  ok(await p.evaluate(() => State.data.gold === 100 && State.data.companions.lina && State.data.flags.s3121_hakei_farewell && Story3121.phase() === 'done'), '村長（100G）・リーナ加入・門の見送り');
  await p.evaluate(async () => { World.enterMap('rivel_castle', 15, 20, 'up'); await __wait(); const k = World.map.npcs.find((n) => n.id === 'king'); World.player.x = k.x; World.player.y = k.y + 1; await __talk('king'); });
  ok(await built('rivel_castle') && await p.evaluate(() => State.data.quests.main_1.state === 'done'), '3D：リヴェル王に会う（main_1 達成）');
  // 廃墟・復興の村（状態ごとの3D）
  await p.evaluate(() => { State.data.flags.s3121_asana_located = true; World.enterMap('asana_ruins', 13, 19, 'up'); });
  ok(await built('asana_ruins'), '3D：アサナ村跡（廃墟）'); out.ruins = await info(); await p.evaluate(() => Story3121.cine({ x: 14, y: 12, dist: 22, pitch: 52 })); await shot('08_ruins', 4000);
  await p.evaluate(() => { State.data.flags.s3121_asana_rebuilt = true; World.enterMap('asana_rebuilt', 13, 19, 'up'); });
  ok(await built('asana_rebuilt'), '3D：アサナ村（復興）'); out.rebuilt = await info(); await shot('09_rebuilt', 4000); await p.evaluate(() => Story3121.cine(null));
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  fs.writeFileSync(SHOT + 'p69a.json', JSON.stringify({ out, fails, errs }, null, 1));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
