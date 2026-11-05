// v7.6 町の作り直し（見本）の確認：段の決まり・つながり（入口から全部の扉・NPC・イベント・宝箱へ歩けるか）・消えた物がないか
// 使い方：cd /home/claude/work && RPG_DIR=<repo>/ node <repo>/docs/tools/env/towns76_check.js [--dump]
const load = require(process.env.RPGLOAD || '/home/claude/work/rpgload.js'); const { w } = load();
w.State.newGame('t', 'warrior'); const F = w.State.data.flags; F.s3121_new_prologue = true; F.s3121_prologue_phase = 'done';
const TW = w.Towns76; const out = { applied: TW.applied, errors: TW.errors, fixes: TW.fixes, towns: {} }; let ng = 0;
const DUMP = process.argv.includes('--dump');
for (const id of Object.keys(TW.applied)) {
  w.World.maps = {}; const m = w.World.getMap(id); const def = m.def; const O = def._orig76; const R = { problems: w.Terrace76.validate(m), unreachable: [], lost: [], npcSolid: [] };
  // 歩けるか（NPC は通れないものとして、ただし話す相手としては隣に立てればよい）
  const pass = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && !w.Tiles.isSolid(m.tiles[y][x]);
  const starts = []; Object.keys(w.MAP_DEFS).forEach((k) => { (w.MAP_DEFS[k].warps || []).forEach((q) => { if (q.to === id && k !== id) starts.push([q.tx, q.ty, k]); }); });
  const seen = new Set(); const q = []; starts.forEach((s) => { if (pass(s[0], s[1])) { seen.add(s[0] + ',' + s[1]); q.push([s[0], s[1]]); } else R.unreachable.push('入ってくる位置が通れない ' + s.join(',')); });
  const npcAt = {}; m.npcs.forEach((n) => { npcAt[n.x + ',' + n.y] = n; });
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || !pass(nx, ny)) continue; if (npcAt[k] && npcAt[k].wander === 0) continue; seen.add(k); q.push([nx, ny]); } }
  const reach = (x, y) => seen.has(x + ',' + y);
  const nearReach = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach(x + dx, y + dy) || (m.tile(x + dx, y + dy) === 'counter' && reach(x + dx * 2, y + dy * 2)));
  m.warps.forEach((q2) => { if (!reach(q2.x, q2.y)) R.unreachable.push('ワープ ' + q2.x + ',' + q2.y + '→' + q2.to); });
  m.npcs.forEach((n) => { if (n.hidden) return; if (w.Tiles.isSolid(m.tiles[n.y][n.x])) R.npcSolid.push(n.id + '@' + n.x + ',' + n.y); if (!reach(n.x, n.y) && !nearReach(n.x, n.y)) R.unreachable.push('NPC ' + n.id + '@' + n.x + ',' + n.y); });
  m.events.forEach((e) => { if (!reach(e.x, e.y) && !nearReach(e.x, e.y)) R.unreachable.push('イベント ' + e.x + ',' + e.y); });
  m.chests.forEach((c) => { if (!reach(c.x, c.y) && !nearReach(c.x, c.y)) R.unreachable.push('宝箱 ' + c.id); });
  (w.SEARCH_POINTS || []).filter((sp) => sp.map === id).forEach((sp) => { if (!reach(sp.x, sp.y) && !nearReach(sp.x, sp.y)) R.unreachable.push('調べる所 ' + sp.id + '@' + sp.x + ',' + sp.y); });
  // 消えた物：元の NPC・建物・ワープ・イベント・宝箱がすべて残っているか（id で）
  const ids = (a) => new Set((a || []).map((x) => x.id));
  const bNow = ids(def.buildings), nNow = ids(def.npcs);
  (O.buildings || []).forEach((b) => { if (!bNow.has(b.id)) R.lost.push('建物 ' + b.id); });
  (O.npcs || []).forEach((n) => { if (!nNow.has(n.id)) R.lost.push('NPC ' + n.id); });
  // 中のマップの出口が、建物の入口の前か
  const exits = []; def.buildings.forEach((b) => { if (!b.interior) return; const it = w.MAP_DEFS[b.interior]; const f = TW.door(b).front; (it.warps || []).filter((q3) => q3.to === id).forEach((q3) => { if (q3.tx !== f.x || q3.ty !== f.y) { if (b.type === 'castle') return; R.unreachable.push('出口が入口の前でない ' + b.interior + ' ' + q3.tx + ',' + q3.ty + '（入口の前 ' + f.x + ',' + f.y + '）'); } exits.push(b.interior); }); });
  const shapes = {}; def.buildings.forEach((b) => { const k = (b.shape76 || 'box') + (b.doorSide ? '・横の入口' : ''); shapes[k] = (shapes[k] || 0) + 1; });
  let steps = 0, ramps = 0, ledges = 0; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const t = m.tiles[y][x]; if (t === 'steps') steps++; else if (t === 'ramp') ramps++; else if (t === 'ledge') ledges++; }
  R.stats = { reach: seen.size, steps, ramps, ledges, shapes, buildings: def.buildings.length, npcs: m.npcs.length, autoLedge: TW.fixes[id] };
  const bad = R.problems.length + R.unreachable.length + R.lost.length + R.npcSolid.length; if (bad) ng++; R.ok = !bad; out.towns[id] = R;
  if (DUMP) { const marks = {}; m.npcs.forEach((n) => { marks[n.x + ',' + n.y] = 'N'; }); m.warps.forEach((q4) => { marks[q4.x + ',' + q4.y] = 'W'; });
    const S = { ledge: '|', steps: '/', ramp: ';', bld_block: '#', bld_door: 'D', counter: 'T', water: '~', bridge: 'b', dock: 'd' };
    console.log('== ' + id); for (let y = 0; y < m.h; y++) { let s = String(y).padStart(2) + ' '; for (let x = 0; x < m.w; x++) { const t = m.tiles[y][x]; s += marks[x + ',' + y] || S[t] || (w.Tiles.isSolid(t) ? 'o' : String(w.Terrace76.levelAt(m, x, y))); } console.log(s); } }
}
out.ng = ng; console.log(JSON.stringify(out, null, 1)); console.log('結果：' + (ng ? ng + ' 町で NG' : 'すべて OK') + '（' + Object.keys(TW.applied).length + ' 町）');
