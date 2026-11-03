// v6.9 3D 版：第16章の魔王の誘惑 → エンディング → アサナ村の帰郷（両親の墓）→ ポヨ村の「おかえり」、トレード財団本部・波形聖堂の3D
//   戦闘はこのページだけ自動で勝ちにする（BattleUI.start）。会話は自動で進め、決めた台詞のところで止めて画像を撮る
//   作業用のフォルダ（CommonJS）にコピーして実行する。環境変数 PORT・SHOTDIR・ENDING（A／B）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8770; const SHOT = process.env.SHOTDIR || '/home/claude/work/p3d/shots/v69b/'; fs.mkdirSync(SHOT, { recursive: true }); const END = process.env.ENDING || 'B';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate((END) => {
    document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
    window.__LOG = []; window.__HOLD = ['相場魔王〈固定〉の光が、玉座の間を満たした。', 'でもね……それより大切なものを、いっぱい見つけたんだ。', '……おかえり。']; window.__held = null;
    Win.message = (lines, o) => { const L = Array.isArray(lines) ? lines : [lines]; L.forEach((l) => __LOG.push(((o && o.name) ? o.name + '「' : '') + l)); const h = L.find((l) => __HOLD.indexOf(l) >= 0); if (!h) return Promise.resolve(); return new Promise((r) => { window.__held = { line: h, go: () => { window.__held = null; r(); } }; }); };
    Win.choice = (pr, opts) => Promise.resolve(/クリスタル/.test(pr) ? (END === 'B' ? 1 : 0) : 0); Win.toast = () => { };
    Story3121.timeScale = 0.3; World.encounter = function () { }; BattleUI.start = () => Promise.resolve('won'); if (window.BossSymbol) { BossSymbol.intro = () => Promise.resolve(); BossSymbol.introIfShown = () => Promise.resolve(); }
    State.newGame('もち', 'warrior'); const d = State.data; d.hero.level = 45; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; Story3121.giveFamilyItems(); State.addItem('s3121_letter', 1); d.flags.s3121_mio_letter = true;
    ['lina', 'kyle', 'gald'].forEach((id) => State.joinCompanion(id)); d.party = ['hero', 'lina', 'kyle', 'gald'];
    for (let i = 1; i <= 15; i++) d.quests['main_' + i] = { state: 'done', at: 1 }; d.quests.main_16 = { state: 'active', at: 1 };
    ['met_elder', 'castle_seal_1', 'castle_seal_2', 'castle_seal_3', 'verum_liberated', 'kalion_reformed', 'lighthouse_lit'].forEach((k) => d.flags[k] = true); if (END === 'B') d.flags.kalion_choice = 1;
    d.pos = { map: 'demon_castle_5', x: 8, y: 4, dir: 'up' }; World.start(); World.busy = false;
  }, END);
  const built = (id) => p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && World.map.id === m, id, { timeout: 120000 }).then(() => true).catch(() => false);
  ok(await built('demon_castle_5'), '3D：玉座の間');
  await p.evaluate(() => { const e = World.map.eventAt(8, 3); World.busy = false; Events.run(e); });
  const hold = async (line, name, map) => {
    const got = await p.waitForFunction((l) => window.__held && window.__held.line === l, line, { timeout: 180000 }).then(() => true).catch(() => false);
    if (map) await built(map); await p.waitForTimeout(3500); await p.screenshot({ path: SHOT + name + '.jpg', type: 'jpeg', quality: 80, timeout: 120000 });
    const st = await p.evaluate(() => ({ map: World.map.id, veil: (document.getElementById('s3121-veil') || { style: {} }).style.opacity, cine: !!(MTQ3D.camera && MTQ3D.camera.cine) }));
    await p.evaluate(() => window.__held && window.__held.go()); return Object.assign({ got }, st);
  };
  const a = await hold('相場魔王〈固定〉の光が、玉座の間を満たした。', '10_temptation', 'demon_castle_5'); ok(a.got && a.map === 'demon_castle_5', '誘惑の場面（' + JSON.stringify(a) + '）');
  const b = await hold('でもね……それより大切なものを、いっぱい見つけたんだ。', '11_homecoming_grave', 'asana_rebuilt'); ok(b.got && b.map === 'asana_rebuilt' && b.cine && b.veil === '0', '帰郷：復興したアサナ村の両親の墓（カメラが墓へ寄る・幕は上がっている ' + JSON.stringify(b) + '）');
  const c = await hold('……おかえり。', '12_okaeri', 'poyo_elder_house'); ok(c.got && c.map === 'poyo_elder_house' && c.veil === '0', 'ポヨ村の村長「……おかえり」（' + JSON.stringify(c) + '）');
  await p.waitForFunction(() => !World.busy && State.data.flags.game_cleared, null, { timeout: 120000 }).catch(() => { });
  const fin = await p.evaluate(() => ({ ending: State.data.flags.ending, cleared: !!State.data.flags.game_cleared, epi: !!State.data.flags.s3121_epilogue_done, temp: !!State.data.flags.s3121_temptation, main16: State.data.quests.main_16.state, items: ['s3121_ledger', 's3121_letter', 's3121_amulet', 'final_proof'].map((k) => State.data.inventory[k] || 0) }));
  ok(fin.ending === END && fin.cleared && fin.epi && fin.temp && fin.main16 === 'done' && fin.items.every((n) => n >= 1), 'エンディング' + END + '：クリア・帰郷・誘惑・帳簿／手紙／お守り／最後の選択の証が残る（最後の選択の証は既存の処理で2つ：選択時と main_16 の報酬）（' + JSON.stringify(fin) + '）');
  // 財団本部・波形聖堂の3D
  for (const [mid, x, y, name] of [['tradia_foundation', 7, 8, '13_foundation'], ['rivel_wave_temple', 7, 8, '14_wave_temple'], ['tradia', 40, 39, '15_tradia_foundation_outside'], ['rivel_town', 54, 10, '16_rivel_wave_temple_outside']]) {
    await p.evaluate(({ mid, x, y }) => { World.busy = false; World.enterMap(mid, x, y, 'up'); }, { mid, x, y });
    const okb = await built(mid); const n = await p.evaluate(() => MTQ3D.current.npcs.filter((q) => q.root.visible).length); ok(okb, '3D：' + mid + '（人 ' + n + '）'); await p.waitForTimeout(3000); await p.screenshot({ path: SHOT + name + '.jpg', type: 'jpeg', quality: 80, timeout: 120000 });
  }
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  fs.writeFileSync(SHOT + 'p69b_' + END + '.json', JSON.stringify({ fails, errs, log: await p.evaluate(() => __LOG.slice(-60)) }, null, 1));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
