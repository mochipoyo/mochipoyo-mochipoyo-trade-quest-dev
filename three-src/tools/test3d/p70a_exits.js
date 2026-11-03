// v7.0 3D 版：町・城・村から歩いて外へ出られるか。フィールドへ出る出口ごとに、出口の2マス手前に立って出口の方向へキーを押し続け、マップが変わるかを調べる
//   対象：引数で指定したマップ（なければ、フィールドへ出る出口がある town/castle の全マップ）
const { chromium } = require('playwright');
const PORT = process.env.PORT || 8770; const ONLY = process.argv.slice(2);
(async () => {
  const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 800, height: 500 } })).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/3d/index.html`); await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
  await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('確認', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); World.encounter = function () { }; Win.message = () => Promise.resolve(); Win.toast = () => { }; d.settings.walkSpeed = d.settings.walkSpeed || 'normal'; });
  const cases = await p.evaluate((only) => {
    const out = []; const isField = (id) => /^world/.test(id) || (MAP_DEFS[id] && MAP_DEFS[id].region);
    for (const [id, def] of Object.entries(MAP_DEFS)) {
      if (only.length ? !only.includes(id) : (def.region || !/town|castle|village/.test(def.kind || 'town') || def.s3121)) continue;
      let m; try { m = new GameMap(def); } catch (e) { continue; }
      const ws = m.warps.filter((w) => isField(w.to)); if (!ws.length) continue;
      // 出口の内側の向き：出口のマスから通れるマスの方向（2マス手前までワープのない出口を選ぶ。出口が2列のときは内側の列）
      const dirs = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
      let pick = null, w = ws[0];
      for (const c of ws.slice(Math.floor(ws.length / 2)).concat(ws)) { for (const [dn, dx, dy] of dirs) { const x1 = c.x - dx, y1 = c.y - dy, x2 = c.x - 2 * dx, y2 = c.y - 2 * dy; if (m.passable(x1, y1, State.data) && m.passable(x2, y2, State.data) && !m.warpAt(x1, y1) && !m.warpAt(x2, y2)) { pick = { dir: dn, sx: x2, sy: y2 }; w = c; break; } } if (pick) break; }
      out.push({ id, wx: w.x, wy: w.y, to: w.to, pick });
    }
    return out;
  }, ONLY);
  const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }; const bad = []; let n = 0;
  for (const c of cases) {
    if (!c.pick) { bad.push(c.id + '：出口 (' + c.wx + ',' + c.wy + ') の手前に立てる場所がない'); console.log('NG ', c.id, 'no approach'); continue; }
    await p.evaluate((c) => { World.busy = false; World.enterMap(c.id, c.pick.sx, c.pick.sy, c.pick.dir); }, c);
    const built = await p.waitForFunction((id) => MTQ3D.current && MTQ3D.current.map && MTQ3D.current.map.id === id && World.map.id === id, c.id, { timeout: 120000 }).then(() => true).catch(() => false);
    if (!built) { bad.push(c.id + '：3D が組み立たない'); console.log('NG ', c.id, 'not built'); continue; }
    await p.waitForTimeout(500);
    await p.keyboard.down(KEY[c.pick.dir]);
    const left = await p.waitForFunction((id) => World.map && World.map.id !== id, c.id, { timeout: 20000, polling: 200 }).then(() => true).catch(() => false);
    await p.keyboard.up(KEY[c.pick.dir]);
    const now = await p.evaluate(() => ({ map: World.map.id, x: World.player.x, y: World.player.y }));
    n++; if (!left) bad.push(c.id + '：出口 (' + c.wx + ',' + c.wy + ') へ ' + c.pick.dir + ' に歩いても出られない（いま ' + JSON.stringify(now) + '）');
    console.log((left ? 'OK ' : 'NG ') + c.id + ' → ' + now.map);
    await p.waitForTimeout(300);
  }
  console.log(bad.length ? bad.join('\n') : ''); console.log('ページのエラー', errs.length, errs.slice(0, 3));
  console.log('結果：' + n + 'か所中 ' + bad.length + ' NG'); await br.close(); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
