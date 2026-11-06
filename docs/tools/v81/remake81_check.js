// v8.1 作り直した地図の確かめ（jsdom）：node remake81_check.js [mapId,...] [2d]
// ・行の長さ・建物どうし／建物と人・出来事・宝箱の重なり・扉の前が歩ける
// ・開いた村：外周（四辺・四隅）がすべて歩けて、一続き。外周のどのマスからも、全部の扉の前・人（となり）・出来事・宝箱・調べる所へ行ける
// ・開いていない地図：外から着く所（ほかの地図のワープの着地点）から全部へ行ける
// ・中の地図の出口（建物の中から外へ）の着く所が、その建物の扉の前（MapRemake.pos で写した結果）
// ・旧座標の人・出来事の位置を MapRemake.pos で写すと、新しい位置になる（物語の台本・ナビ）
const load = require('../v78/load78.js');
const ids0 = (process.argv[2] || '').split(',').filter(Boolean); const two = process.argv[3] === '2d';
const A = load(two ? { earth: false, join: false } : {}); const w = A.w; w.State.newGame('t', 'warrior'); w.World.start(); const d = w.State.data;
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const R = w.Remake81; ok(R && !R.off && !R.errors.length, '作り直しの読み込み（' + (two ? '2D 版' : '地球の世界') + '）エラーなし ' + JSON.stringify(R && R.errors));
const ids = ids0.length ? ids0 : Object.keys(R.applied);
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
for (const id of ids) {
  const m = w.World.getMap(id); const def = m.def; const log = R.log[id] || {};
  ok(def.remake81 && def.rows.every((r) => r.length === m.w), id + '：作り直した地図 ' + m.w + '×' + m.h + '（人の自動配置 ' + (log.auto || []).length + '・写せなかった物 ' + (log.unmapped || []).length + '）' + (log.unmapped || []).join(' '));
  // 重なり
  const occ = {}; const bad = [];
  m.buildings.forEach((b) => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { const k = x + ',' + y; if (occ[k]) bad.push(b.id + '×' + occ[k] + '@' + k); occ[k] = b.id; } if (b.x < 0 || b.y < 0 || b.x + b.w > m.w || b.y + b.h > m.h) bad.push(b.id + '：地図の外'); });
  const thing = []; m.npcs.forEach((n) => thing.push(['人 ' + n.id, n.x, n.y])); m.events.forEach((e) => thing.push(['出来事 ' + e.x + ',' + e.y, e.x, e.y])); (m.chests || []).forEach((c) => thing.push(['宝箱 ' + c.id, c.x, c.y]));
  const keeper = {}; m.buildings.forEach((b) => { if (b.shape76 === 'stall' && b.keeper76) keeper[(b.x + b.keeper76.x) + ',' + (b.y + b.keeper76.y)] = 1; });   // 露店の店主のマス
  thing.forEach((t) => { const k = t[1] + ',' + t[2]; if (occ[k] && !(keeper[k] && /^人 /.test(t[0]))) bad.push(t[0] + ' が建物 ' + occ[k] + ' の上'); });
  const fronts = m.buildings.filter((b) => b.interior).map((b) => [b.id, b.doorFront.x, b.doorFront.y]);
  fronts.forEach((f) => { if (!m.passable(f[1], f[2], d)) bad.push(f[0] + ' の扉の前 ' + f[1] + ',' + f[2] + ' が歩けない'); if (m.npcAt(f[1], f[2])) bad.push(f[0] + ' の扉の前に人'); });
  ok(!bad.length, id + '：建物 ' + m.buildings.length + '（重なり・扉の前）' + bad.slice(0, 6).join(' / '));
  if (def.levels76) { const pr = w.Terrace76.validate(m); ok(!pr.length, id + '：段（擁壁・階段・坂）の決まり ' + pr.slice(0, 4).join(' / ')); }
  // 歩ける（人は通れない扱い：ふさいでいないか）
  m.npcs.forEach((n) => { if (n.hideIf) n.hidden = true; });   /* 条件で消える人（守衛など）は、消えたあとで道を確かめる */
  const pass = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.passable(x, y, d) && !m.npcAt(x, y) && !(m.eventAt(x, y) && m.eventAt(x, y).solid);
  let starts = [];
  if (def.open81) {
    const ring = []; for (let x = 0; x < m.w; x++) { ring.push([x, 0]); ring.push([x, m.h - 1]); } for (let y = 1; y < m.h - 1; y++) { ring.push([0, y]); ring.push([m.w - 1, y]); }
    const closed = ring.filter((p) => !pass(p[0], p[1]));
    ok(!closed.length, id + '：開いた村の外周 ' + ring.length + ' マスがすべて歩ける（人・出来事でふさいでいない）' + closed.slice(0, 8).map((p) => p.join(',')).join(' '));
    // 外周が一続き（外周のマスだけを通って一周できる）
    const ringSet = new Set(ring.map((p) => p.join(','))); const seen0 = new Set([ring[0].join(',')]); const q0 = [ring[0]];
    while (q0.length) { const [x, y] = q0.pop(); for (const [dx, dy] of N4) { const k = (x + dx) + ',' + (y + dy); if (ringSet.has(k) && !seen0.has(k) && pass(x + dx, y + dy)) { seen0.add(k); q0.push([x + dx, y + dy]); } } }
    ok(seen0.size === ring.length, id + '：外周を歩いて一周できる（' + seen0.size + '/' + ring.length + '）');
    starts = ring;
  } else {
    Object.keys(w.MAP_DEFS).forEach((k) => { if (k === id) return; (w.MAP_DEFS[k].warps || []).forEach((q) => { if (q.to === id && typeof q.tx === 'number') { const p = w.MapRemake.pos(id, q.tx, q.ty); starts.push([p.x, p.y]); } }); (w.MAP_DEFS[k].buildings || []).forEach((b) => { if (b.interior === id) { const e = b.entry || { x: 5, y: 7 }; const p = w.MapRemake.pos(id, e.x, e.y); starts.push([p.x, p.y]); } }); });
    (w.MAP_DEFS[id].warps || []).forEach(() => { });
  }
  // 1 つの出発点から（開いた村は外周の 1 マスから）全部へ。さらに開いた村は外周のすべてのマスが同じつながり
  const seen = new Set(); const q = []; const s0 = starts.filter((p) => pass(p[0], p[1])); s0.slice(0, 1).forEach((p) => { seen.add(p.join(',')); q.push(p); });
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of N4) { const X = x + dx, Y = y + dy, k = X + ',' + Y; if (seen.has(k) || !pass(X, Y)) continue; seen.add(k); if (m.warpAt(X, Y)) continue; q.push([X, Y]); } }
  const reach = (x, y) => seen.has(x + ',' + y) || N4.some(([dx, dy]) => seen.has((x + dx) + ',' + (y + dy)));
  const talk = (n) => reach(n.x, n.y) || N4.some(([dx, dy]) => { const X = n.x + dx, Y = n.y + dy; return m.tile(X, Y) === 'counter' && seen.has((X + dx) + ',' + (Y + dy)); });
  const miss = [];
  fronts.forEach((f) => { if (!seen.has(f[1] + ',' + f[2])) miss.push('扉の前 ' + f[0]); });
  m.npcs.forEach((n) => { if (!n.hidden && !talk(n)) miss.push('人 ' + n.id); });
  m.events.forEach((e) => { if (!reach(e.x, e.y)) miss.push('出来事 ' + e.x + ',' + e.y); }); (m.chests || []).forEach((c) => { if (!reach(c.x, c.y)) miss.push('宝箱 ' + c.id); });
  (w.SEARCH_POINTS || []).forEach((sp) => { if (sp.map === id && !reach(sp.x, sp.y)) miss.push('調べる所 ' + sp.id); });
  (m.warps || []).forEach((q2) => { if (!reach(q2.x, q2.y)) miss.push('出口 ' + q2.to); });
  if (def.open81) starts.forEach((p) => { if (pass(p[0], p[1]) && !seen.has(p.join(','))) miss.push('外周 ' + p.join(',')); });
  ok(!miss.length, id + '：' + (def.open81 ? '外周のどこからでも' : '着く所から') + '、扉の前 ' + fronts.length + '・人 ' + m.npcs.length + '・出来事 ' + m.events.length + '・宝箱 ' + (m.chests || []).length + ' へ行ける ' + miss.slice(0, 8).join(' / '));
  // 中の地図から出たときの着く所 = 扉の前
  const exitBad = []; m.buildings.forEach((b) => { if (!b.interior || !w.MAP_DEFS[b.interior]) return; (w.MAP_DEFS[b.interior].warps || []).forEach((q2) => { if (q2.to !== id) return; const p = w.MapRemake.pos(id, q2.tx, q2.ty); if (p.x !== b.doorFront.x || p.y !== b.doorFront.y) exitBad.push(b.interior + '→' + p.x + ',' + p.y + '（扉の前 ' + b.doorFront.x + ',' + b.doorFront.y + '）'); }); });
  ok(!exitBad.length, id + '：建物から出ると扉の前に着く ' + exitBad.join(' / '));
  // 旧座標 → 新しい位置（人・出来事）
  const pre = def._pre81; const mapBad = []; const reg = w.MapRemake.maps[id]; const P0 = (x, y) => (reg && reg.prev ? reg.fromPrev(x, y) : w.MapRemake.pos(id, x, y));   // _pre81 は前の作り直しのあとの座標
  const oldFront = {}; (pre.buildings || []).forEach((b) => { const f = w.Remake81.door(b).front; oldFront[f.x + ',' + f.y] = 1; });   /* 旧い扉の前に立っていた人は、その座標が扉の前へ写る（扉の前が先） */
  pre.npcs.forEach((n) => { const nn = m.npcs.find((x) => x.id === n.id); if (!nn) { mapBad.push('人がいない ' + n.id); return; } if (oldFront[n.x + ',' + n.y]) return; const p = P0(n.x, n.y); if (p.x !== nn.x || p.y !== nn.y) mapBad.push(n.id); });
  pre.events.forEach((e) => { const p = P0(e.x, e.y); if (!m.eventAt(p.x, p.y)) mapBad.push('出来事 ' + e.x + ',' + e.y); });
  ok(!mapBad.length && pre.npcs.length === m.npcs.length && pre.events.length === m.events.filter((e) => !e.v81).length && (pre.chests || []).length === (m.chests || []).length && pre.buildings.length <= def.buildings.length, id + '：人 ' + pre.npcs.length + '・出来事 ' + pre.events.length + '・宝箱・建物 ' + pre.buildings.length + ' を消さずに、旧座標から新しい位置へ写せる ' + mapBad.join(' '));
}
console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
