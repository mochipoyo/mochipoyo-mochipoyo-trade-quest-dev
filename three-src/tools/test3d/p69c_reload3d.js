// v6.9 3D 版：プロローグの途中でページを更新しても続きから遊べること・3D 版のセーブ枠（mtq-3d-slot-*）だけに書くこと
//   1) 新規ゲーム → 徴税官の場面のあとまで進める → オートセーブ → ページを更新 → つづきから（オート）→ 同じ場所・同じ段階 → 夜の襲撃へ進める
//   2) 「脱出のあと、村長の家で目を覚ます前」に保存されたデータ → つづきから → 目覚めの場面が自動で始まり、夜のポヨ村へ
//   作業用のフォルダ（CommonJS）にコピーして実行する。環境変数 PORT
const { chromium } = require('playwright');
const PORT = process.env.PORT || 8770; const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const STUB = () => {
  document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay);
  window.__LOG = []; window.__ANS = [];
  Win.message = (lines, o) => { (Array.isArray(lines) ? lines : [lines]).forEach((l) => __LOG.push(l)); return Promise.resolve(); };
  Win.choice = () => Promise.resolve(__ANS.length ? __ANS.shift() : 0); Win.prompt = () => Promise.resolve('もち'); Win.list = () => Promise.resolve(0); Win.toast = () => { };
  Story3121.timeScale = 0.05; World.encounter = function () { };
  window.__wait = async () => { for (let k = 0; k < 3; k++) { for (let i = 0; i < 6000 && World.busy; i++) await new Promise((r) => setTimeout(r, 5)); await new Promise((r) => setTimeout(r, 20)); } };
  window.__talk = async (id) => { const n = World.map.npcs.find((x) => x.id === id && !x.hidden); if (!n) return false; World.busy = false; World.talk(n); await __wait(); return true; };
  window.__ev = async (x, y) => { const e = World.map.eventAt(x, y); if (!e) return false; World.busy = false; Events.run(e); await __wait(); return true; };
  window.__step = async (x, y) => { const pl = World.player; pl.x = x; pl.y = y; pl.px = x * 32; pl.py = y * 32; pl.moving = false; World.busy = false; World.onStep(); await __wait(); };
};
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 720 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const open = async () => { await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 }); await p.evaluate(STUB); };
  const built = (id) => p.waitForFunction((m) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === m && World.map.id === m, id, { timeout: 120000 }).then(() => true).catch(() => false);
  await open();
  await p.evaluate(() => { try { Object.keys(localStorage).filter((k) => /^mtq-/.test(k)).forEach((k) => localStorage.removeItem(k)); } catch (e) { } });
  await p.evaluate(async () => {
    __ANS.push(0, 0); await Title.newGame(); await __wait();
    World.enterMap('asana_village', 18, 10, 'up'); await __wait(); await __talk('as_merchant'); World.enterMap('asana_home', 5, 7, 'up'); await __wait(); await __talk('as_mio');
    World.enterMap('asana_village', 20, 15, 'down'); await __wait(); await __talk('as_raul'); await __talk('as_chief');
    World.enterMap('asana_home', 2, 2, 'up'); await __wait(); await __ev(1, 1); World.enterMap('asana_village', 6, 10, 'down'); await __wait(); await __step(6, 11); State.autosave();
  });
  const before = await p.evaluate(() => ({ phase: Story3121.phase(), map: World.map.id, x: World.player.x, y: World.player.y, keys: Object.keys(localStorage).filter((k) => /^mtq-/.test(k)) }));
  ok(before.phase === 'after_tax' && before.keys.every((k) => /^mtq-3d-/.test(k)) && before.keys.indexOf('mtq-3d-slot-0') >= 0, '3D 版のセーブは mtq-3d-slot-* だけ（2D 版の mtq-rpg-v2-slot-* に書かない）：' + before.keys.join(','));
  await open();
  await p.evaluate(async () => { const ok = await Title.load(); window.__loaded = ok; });
  ok(await built(before.map), 'ページを更新 → つづきから（オート）：' + before.map);
  const after = await p.evaluate(() => ({ phase: Story3121.phase(), map: World.map.id, x: World.player.x, y: World.player.y, items: State.hasItem('s3121_ledger') }));
  ok(after.phase === before.phase && after.map === before.map && after.x === before.x && after.y === before.y, '同じ場所・同じ段階から続く（' + JSON.stringify(after) + '）');
  await p.evaluate(async () => { World.enterMap('asana_home', 2, 2, 'up'); await __wait(); await __ev(1, 1); });
  ok(await built('asana_raid'), '続きから夜の襲撃へ進める');
  // 2) 目を覚ます場面の前に保存されたデータ
  await p.evaluate(() => { const d = State.data; d.flags.s3121_raid_father = true; d.flags.s3121_escaped = true; d.flags.s3121_prologue_phase = 'poyo_wake'; Story3121.giveFamilyItems(); d.pos = { map: 'poyo_elder_house', x: 6, y: 2, dir: 'down' }; State.save(0); });
  await open(); await p.evaluate(async () => { await Title.load(); });
  const woke = await p.waitForFunction(() => window.State && State.data && State.data.flags.s3121_woke && Story3121.phase() === 'poyo_night' && World.map.id === 'poyo_village', null, { timeout: 120000 }).then(() => true).catch(() => false);
  ok(woke && await built('poyo_village'), '目を覚ます前のデータ：読み込むと目覚めの場面から続き、夜のポヨ村へ');
  ok(errs.length === 0, 'ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
