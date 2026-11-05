// v7.6 広げた屋内（js/rpg/interior76.js）の確認：出口から人・出来事・宝箱・ワープへ行けるか、カウンター越しの関係、入る位置、元の家具が残っているか、町へ出る位置
// 使い方：cd /home/claude/work && RPG_DIR=<repo>/ node <repo>/docs/tools/env/interior76_check.js
const load = require(process.env.RPGLOAD || '/home/claude/work/rpgload.js'); const { w } = load();
w.State.newGame('t', 'warrior'); const F = w.State.data.flags; F.s3121_new_prologue = true; F.s3121_prologue_phase = 'done';
const I = w.Interior76, MR = w.MapRemake, D = w.MAP_DEFS, TL = w.Tiles; const ng = []; let n = 0, furn = 0;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
for (const id of Object.keys(I.maps)) {
  n++; const def = D[id]; const meta = def._i76; const old = meta.old; furn += meta.furniture;
  w.World.maps = {}; const m = w.World.getMap(id); const bad = (s) => ng.push(id + '：' + s);
  const walk = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && !TL.isSolid(m.tiles[y][x]);
  // 出口から（動かない人は通れない）
  const fixed = {}; m.npcs.forEach((q) => { if (q.wander === 0) fixed[q.x + ',' + q.y] = 1; });
  const ex = m.warps.find((q) => walk(q.x, q.y)); if (!ex) { bad('歩ける出口がない'); continue; }
  const seen = new Set([ex.x + ',' + ex.y]); const qu = [[ex.x, ex.y]];
  while (qu.length) { const [a, b] = qu.pop(); for (const [dx, dy] of N4) { const k = (a + dx) + ',' + (b + dy); if (seen.has(k) || !walk(a + dx, b + dy) || fixed[k]) continue; seen.add(k); qu.push([a + dx, b + dy]); } }
  const near = (x, y) => seen.has(x + ',' + y) || N4.some(([dx, dy]) => seen.has((x + dx) + ',' + (y + dy)) || (m.tile(x + dx, y + dy) === 'counter' && seen.has((x + dx * 2) + ',' + (y + dy * 2))));
  m.warps.forEach((q) => { if (walk(q.x, q.y) && !seen.has(q.x + ',' + q.y)) bad('ワープに行けない ' + q.x + ',' + q.y); });
  m.npcs.forEach((q) => { if (!q.hidden && !near(q.x, q.y)) bad('話せない ' + q.id); if (TL.isSolid(m.tiles[q.y][q.x])) bad('人が通れないマスに ' + q.id); });
  m.events.forEach((e) => { if (typeof e.x === 'number' && !near(e.x, e.y)) bad('出来事に行けない ' + e.x + ',' + e.y); });
  m.chests.forEach((c) => { if (!near(c.x, c.y)) bad('宝箱に行けない ' + c.id); });
  // カウンター越し：元の部屋で、動かない人の隣がカウンターだった向きは、新しい部屋でも同じ
  (old.npcs || []).forEach((q0) => { if (q0.wander !== 0) return; const q1 = def.npcs.find((x) => x.id === q0.id); if (!q1) { bad('人が消えた ' + q0.id); return; }
    N4.forEach(([dx, dy]) => { const c0 = old.rows[q0.y + dy] && old.rows[q0.y + dy][q0.x + dx]; if (c0 !== 'T') return; const c1 = def.rows[q1.y + dy] && def.rows[q1.y + dy][q1.x + dx]; if (c1 !== 'T') bad('カウンター越しが切れた ' + q0.id); }); });
  // 元の家具（通れない物）の数が減っていない
  const cnt = (rows) => { const o = {}; rows.join('').split('').forEach((c) => { const t = TL.byChar[c]; if (t && TL.isSolid(t)) o[c] = (o[c] || 0) + 1; }); return o; };
  const c0 = cnt(old.rows), c1 = cnt(def.rows); Object.keys(c0).forEach((c) => { if ((c1[c] || 0) < c0[c]) bad('家具が減った ' + c + ' ' + c0[c] + '→' + (c1[c] || 0)); });
  // ほかのマップからここへ入る位置（旧座標で書かれている）が、新しい部屋で通れる
  Object.keys(D).forEach((k) => { (D[k].warps || []).concat((D[k].buildings || []).filter((b) => b.interior === id).map((b) => ({ to: id, tx: b.entry ? b.entry.x : 5, ty: b.entry ? b.entry.y : 7 }))).forEach((q) => { if (!q || q.to !== id || typeof q.tx !== 'number') return; const p = MR.pos(id, q.tx, q.ty); if (!walk(p.x, p.y)) bad('入る位置が通れない（' + k + '）' + q.tx + ',' + q.ty + '→' + p.x + ',' + p.y); }); });
  // 大きさ
  if (m.w <= meta.oldW && m.h <= meta.oldH) bad('広がっていない');
}
// セーブの互換：広げた部屋にいる古いセーブ（旧座標）→ 新しい座標で通れるマス。2回目は変わらない。探索済みの印も新しい座標へ
{ const id = 'rivel_inn'; const def = D[id]; if (def && def._i76) { const d = { pos: { map: id, x: 5, y: 7 }, mapDiscovery: { [id]: [[], [], [], [], [], [], [], [(1 << 5)]] } };
  MR.migrate(d); w.World.maps = {}; const m = w.World.getMap(id); const okPos = !TL.isSolid(m.tiles[d.pos.y][d.pos.x]); const p1 = Object.assign({}, d.pos); MR.migrate(d); const same = d.pos.x === p1.x && d.pos.y === p1.y;
  const np = MR.pos(id, 5, 7); const disc = d.mapDiscovery[id]; const bit = disc && disc[np.y] && ((disc[np.y][(np.x / 30) | 0] || 0) & (1 << (np.x % 30)));
  if (!okPos) ng.push('セーブ：立ち位置が通れない ' + JSON.stringify(d.pos)); if (!same) ng.push('セーブ：2回目の直しで動いた'); if (!bit) ng.push('セーブ：探索済みの印が移らない');
  console.log('セーブの互換：旧 5,7 → ' + p1.x + ',' + p1.y + (okPos && same && bit ? '（OK）' : '（NG）')); } }
console.log(JSON.stringify({ stretched: n, furniture: furn, skipped: I.skipped, errors: I.errors, ng: ng.slice(0, 60), ngCount: ng.length }, null, 1));
console.log('結果：' + (ng.length || I.errors.length ? ng.length + ' 件 NG（広げた ' + n + ' 部屋）' : 'すべて OK（広げた ' + n + ' 部屋・足した家具 ' + furn + '）'));
process.exit(ng.length ? 1 : 0);
