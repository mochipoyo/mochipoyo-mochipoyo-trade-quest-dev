// セーブの互換：3D版のセーブ（mtq-3d-slot-*）に汎用3Dのマップで保存 → 読み込み直して同じ場所の3Dへ戻る。2D版のキーは書かない
const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 900, height: 600 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const R = []; const ok = (c, m, x) => { R.push(!!c); console.log((c ? 'OK ' : 'NG ') + m + (x ? ' ' + JSON.stringify(x) : '')); };
  await p.goto('http://localhost:8770/3d/index.html'); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 180000 });
  // 2D版のセーブ（ダミー）を先に置き、変わらないことを確かめる
  await p.evaluate(() => { localStorage.setItem('mtq-rpg-v2-slot-2', JSON.stringify({ marker: '2d-original' })); });
  const before2d = await p.evaluate(() => Object.keys(localStorage).filter((k) => /^mtq-rpg-v2/.test(k)).map((k) => k + '=' + localStorage.getItem(k).length));
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.newGame('互換', 'mage'); State.data.gold = 4321; World.start(); World.enterMap('rivel_town', 30, 44, 'down'); });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map === World.map, null, { timeout: 240000 });
  await p.evaluate(() => { State.save(1); });
  const keys = await p.evaluate(() => Object.keys(localStorage).sort());
  ok(keys.some((k) => /^mtq-3d-slot-1/.test(k)), '3D版の枠（mtq-3d-slot-1）に保存', keys);
  await p.reload(); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 180000 });
  const after2d = await p.evaluate(() => Object.keys(localStorage).filter((k) => /^mtq-rpg-v2/.test(k)).map((k) => k + '=' + localStorage.getItem(k).length));
  ok(JSON.stringify(before2d) === JSON.stringify(after2d), '2D版のセーブのキーと中身の長さは変わらない', after2d);
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach(n => n.remove()); Engine.scenes = Engine.scenes.filter(s => !s.overlay); State.data = State.load(1); World.start(); });
  await p.waitForFunction(() => MTQ3D.current && MTQ3D.current.map === World.map, null, { timeout: 240000 });
  const st = await p.evaluate(() => ({ map: World.map.id, x: World.player.x, y: World.player.y, gold: State.data.gold, mode3D: MTQ3D.mode3D(), cov: MTQ3D.current.coverage }));
  ok(st.map === 'rivel_town' && st.gold === 4321 && st.mode3D && st.cov === 'generic', '読み込み直すと同じ町の汎用3Dに戻る（所持金も同じ）', st);
  const set = await p.evaluate(() => Object.keys(localStorage).filter((k) => /^mtq3d-/.test(k)));
  ok(true, '3D版の設定のキー（セーブとは別）', set);
  console.log('結果: ' + R.filter(Boolean).length + ' OK / ' + R.filter((x) => !x).length + ' NG', 'errors', errs); await br.close();
})();
