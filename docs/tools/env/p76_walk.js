// v7.6 環境リデザイン：歩けるマスの「体の高さ」に形が入っていないか（env=off と v1 で比べ、v1 で増えたマスを NG）
//   ・Env.probeWalk（three-src/src/environment/Env.js）：歩けるマスごとに下向きの光線5本。0.15〜1.8 の高さで当たる形があるマス
//   ・NPC・宝箱・人・床・水・草は除く。off でも当たるマス（既存の建物の飾りなど）は既存の状態として数だけ出す
// 環境変数：PORT・MAPS（"poyo_village,rivel_castle,..."）・QUALITY（high/low）
const { chromium } = require('playwright'); const fs = require('fs');
const PORT = process.env.PORT || 8772; const MAPS = (process.env.MAPS || 'poyo_village,rivel_castle,iron_mine_1,node_city,tradia').split(',');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  const br = await chromium.launch(); const res = {};
  for (const mode of ['off', 'v1']) {
    const ctx = await br.newContext({ viewport: { width: 960, height: 600 } });
    if (process.env.QUALITY) await ctx.addInitScript((q) => { try { localStorage.setItem('mtq3d-quality', q); } catch (e) { } }, process.env.QUALITY);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`http://localhost:${PORT}/3d/index.html?env=${mode}`);
    await p.waitForFunction(() => window.MTQ3D && MTQ3D.ready, null, { timeout: 240000 });
    await p.evaluate(() => { document.querySelectorAll('#ui > *').forEach((n) => n.remove()); Engine.scenes = Engine.scenes.filter((s) => !s.overlay); State.newGame('もち', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; World.start(); World.encounter = () => { }; });
    for (const id of MAPS) {
      const xy = await p.evaluate((id) => { const m = World.getMap(id); const cx = Math.floor(m.w / 2), cy = Math.floor(m.h / 2); for (let r = 0; r < Math.max(m.w, m.h); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue; if (!Tiles.isSolid(m.tile(x, y)) && !(m.npcAt && m.npcAt(x, y)) && !(m.warpAt && m.warpAt(x, y))) return [x, y]; } return [2, 2]; }, id);
      await p.evaluate(([id, x, y]) => { World.busy = false; World.enterMap(id, x, y, 'up', { raw: true }); }, [id, xy[0], xy[1]]);
      await p.waitForFunction((id) => { const c = MTQ3D.cache && MTQ3D.cache.get(id); return c && MTQ3D.current === c; }, id, { timeout: 120000 }).catch(() => { });
      const r = await p.evaluate((id) => { const c = MTQ3D.cache.get(id); return { recipe: c && c.envRecipe ? c.envRecipe.id : null, hits: window.MTQ3D_ENV.probeWalk(c) }; }, id);
      res[id] = res[id] || {}; res[id][mode] = r; console.log(`     ${mode} ${id}: recipe=${r.recipe} 体の高さに形があるマス ${r.hits ? r.hits.length : '?'}`);
    }
    ok(!errs.length, mode + '：ページのエラーなし ' + JSON.stringify(errs.slice(0, 3)));
    await ctx.close();
  }
  for (const id of MAPS) {
    const a = res[id].off.hits || [], b = res[id].v1.hits || []; const key = (h) => h.x + ',' + h.z; const A = new Set(a.map(key));
    const extra = b.filter((h) => !A.has(key(h))); const mine = extra.filter((h) => h.env), base = extra.filter((h) => !h.env);
    ok(mine.length === 0, `${id}：v1 のレシピ・建物の形が体の高さに入った歩けるマス ${mine.length}（off で既にある ${a.length}・v1 全体 ${b.length}）` + (mine.length ? ' ' + JSON.stringify(mine.slice(0, 12)) : ''));
    if (base.length) console.log(`     （参考）${id}：汎用の小物・木の位置が変わって当たるマス ${base.length} ` + JSON.stringify(base.slice(0, 6)));
  }
  fs.writeFileSync('/home/claude/work/p3d/shots/v76/walk_' + (process.env.QUALITY || 'auto') + '.json', JSON.stringify(res, null, 1));
  console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); await br.close(); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
