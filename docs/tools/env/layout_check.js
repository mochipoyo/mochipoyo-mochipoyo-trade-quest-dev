// v7.6 環境リデザイン：EnvLayout（町の街路・ダンジョンの空間の流れ）の確認（jsdom でゲームのデータを読む）
//   使い方：RPG_DIR=<リポジトリ>/ node layout_check.js [出力.json]
//   ・町・ダンジョンの全マップで、作り直しなし（EnvLayout.enabled=false）と、ありの GameMap を作って比べる（EnvLayout の中の確認とは別に、ここで数え直す）
//   ・入口（ワープ）から歩いて行ける所（4方向）で、近づける物（ワープ・出来事・宝箱・人・調べる場所・クイズの魔物・建物の扉）の集まりが同じか
//     鍵の扉・関所・レバー・通れない出来事を「閉じた」とき と「開いた」とき の両方で比べる（閉じたときに増える＝抜け道、減る＝行けなくなった）
//   ・建物の表示条件（showIf）が変わる町は、フラグなし と すべてのフラグあり の両方で作る
//   ・道のり：各ワープから近づける物までの最短の歩数が、短くならない（近道なし）・＋4歩＋1割を超えて長くならない（閉じた・開いたの両方）
const fs = require('fs');
const load = require(process.env.RPGLOAD || '/home/claude/work/rpgload.js'); const { w } = load();
const S = w.State, EL = w.EnvLayout, TL = w.Tiles, D = w.MAP_DEFS;
S.newGame('t', 'warrior');
const BAR = { door_locked: 1, gate: 1, lever: 1 };
function reach(m, open) {
  const W = m.w, H = m.h; const solidEv = {}; m.events.forEach((e) => { if (e.solid) solidEv[e.x + ',' + e.y] = 1; });
  const ok = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (!TL.isSolid(m.tiles[y][x]) || (open && BAR[m.tiles[y][x]])) && (open || !solidEv[x + ',' + y]);
  const seen = new Set(); const q = []; m.warps.forEach((p) => { if (ok(p.x, p.y)) { const k = p.x + ',' + p.y; if (!seen.has(k)) { seen.add(k); q.push([p.x, p.y]); } } });
  for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (!seen.has(k) && ok(nx, ny)) { seen.add(k); q.push([nx, ny]); } } }
  const near = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((x + dx) + ',' + (y + dy)));
  const out = [];
  m.warps.forEach((p) => { if (near(p.x, p.y)) out.push('warp:' + p.x + ',' + p.y + '>' + p.to); });
  m.events.forEach((e) => { if (near(e.x, e.y)) out.push('ev:' + e.type + ':' + e.x + ',' + e.y); });
  m.chests.forEach((c) => { if (near(c.x, c.y)) out.push('chest:' + c.id); });
  m.npcs.forEach((n) => { if (near(n.ox, n.oy)) out.push('npc:' + n.id); });
  (m.buildings || []).forEach((b) => { if (b.doorAbs && near(b.doorAbs.x, b.doorAbs.y)) out.push('door:' + b.id + '@' + b.doorAbs.x + ',' + b.doorAbs.y); });
  (w.SEARCH_POINTS || []).forEach((p) => { if (p.map === m.id && near(p.x, p.y)) out.push('search:' + p.x + ',' + p.y); });
  (w.QUIZ_MONSTERS || []).forEach((p) => { if (p.map === m.id && near(p.x, p.y)) out.push('quiz:' + p.x + ',' + p.y); });
  return { tiles: seen.size, list: out.sort() };
}
// 道のり：各ワープから、近づける物（ワープ・出来事・宝箱・人・調べる所・クイズの魔物）までの最短の歩数。作り直しで短くなった＝近道、大きく長くなった＝大回り
function dists(m, open) {
  const W = m.w, H = m.h; const solidEv = {}; m.events.forEach((e) => { if (e.solid) solidEv[e.x + ',' + e.y] = 1; }); const npc = {}; m.npcs.forEach((n) => { npc[n.ox + ',' + n.oy] = 1; });
  const ok = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (!TL.isSolid(m.tiles[y][x]) || (open && BAR[m.tiles[y][x]])) && (open || !solidEv[x + ',' + y]) && !npc[x + ',' + y];
  const objs = []; m.warps.forEach((p) => objs.push(['warp:' + p.x + ',' + p.y, p.x, p.y])); m.events.forEach((e) => objs.push(['ev:' + e.type + ':' + e.x + ',' + e.y, e.x, e.y])); m.chests.forEach((c) => objs.push(['chest:' + c.id, c.x, c.y])); m.npcs.forEach((n) => objs.push(['npc:' + n.id, n.ox, n.oy])); (m.buildings || []).forEach((b) => { if (b.doorAbs) objs.push(['door:' + b.id, b.doorAbs.x, b.doorAbs.y]); });
  (w.SEARCH_POINTS || []).forEach((p) => { if (p.map === m.id) objs.push(['search:' + p.x + ',' + p.y, p.x, p.y]); }); (w.QUIZ_MONSTERS || []).forEach((p) => { if (p.map === m.id) objs.push(['quiz:' + p.x + ',' + p.y, p.x, p.y]); });
  const stand = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => ok(a, b));
  const out = {};
  m.warps.forEach((p) => { const D = new Int32Array(W * H).fill(-1); const q = []; stand(p.x, p.y).forEach(([a, b]) => { D[b * W + a] = 0; q.push([a, b]); });
    for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!ok(nx, ny) || D[ny * W + nx] >= 0) continue; D[ny * W + nx] = D[y * W + x] + 1; q.push([nx, ny]); } }
    objs.forEach(([k, x, y]) => { let best = -1; stand(x, y).forEach(([a, b]) => { const d = D[b * W + a]; if (d >= 0 && (best < 0 || d < best)) best = d; }); if (best >= 0) out['warp:' + p.x + ',' + p.y + '>' + k] = best; }); });
  return out;
}
const res = {}; let ng = 0, changedMaps = 0, totalChanged = 0; let shortcutN = 0, detourN = 0, maxDetour = 0;
const flagSets = [{}, null];
for (const id of Object.keys(D)) {
  const def = D[id]; const kind = def.kind || 'town'; if (kind !== 'town' && kind !== 'dungeon') continue;
  const hasShow = (def.buildings || []).some((b) => b.showIf); const sets = hasShow ? [false, true] : [false];
  for (const allFlags of sets) {
    const saved = Object.assign({}, S.data.flags); if (allFlags) (def.buildings || []).forEach((b) => { if (b.showIf) S.data.flags[b.showIf] = true; });
    let m0, m1; try { EL.enabled = false; m0 = new w.GameMap(def); EL.enabled = true; m1 = new w.GameMap(def); } catch (e) { res[id] = { error: e.message }; ng++; S.data.flags = saved; continue; }
    S.data.flags = saved;
    const L = m1.envLayout; const nChanged = L ? L.changed.length : 0;
    const r = { kind, flags: allFlags ? 'all' : 'none', skip: L && L.skip || null, changed: nChanged, rejected: L ? L.rejected : 0, error: L && L.error || null, landmark: L && L.landmark || null, sections: L && L.sections ? L.sections.map((s) => s.kind + (s.carved ? '+' + s.carved : '') + (s.pillars ? '/p' + s.pillars : '') + (s.placed ? '/n' + s.placed : '')) : null };
    const TR76 = !!(m1.def && m1.def.levels76);
    for (const open of [false, true]) {
      const a = reach(m0, open), b = reach(m1, open); const A = new Set(a.list), B = new Set(b.list);
      const lost = a.list.filter((k) => !B.has(k)), gained = b.list.filter((k) => !A.has(k));
      r[open ? 'open' : 'closed'] = { tiles: a.tiles + '→' + b.tiles, lost, gained };
      if (lost.length || gained.length) { r.ng = true; }
      const d0 = dists(m0, open), d1 = dists(m1, open); const sc = [], dt = [];
      for (const k of Object.keys(d0)) { if (d1[k] === undefined) continue; if (d1[k] < d0[k]) sc.push(k + ' ' + d0[k] + '→' + d1[k]); else if (d1[k] > d0[k] + (TR76 ? 8 : 4) + Math.floor(d0[k] * (TR76 ? 0.2 : 0.1))) dt.push(k + ' ' + d0[k] + '→' + d1[k]);   /* v7.6 段のある町（towns76）は擁壁を回る分＋8歩＋2割まで */ if (d1[k] - d0[k] > maxDetour) maxDetour = d1[k] - d0[k]; }
      r[open ? 'open' : 'closed'].shortcut = sc.slice(0, 5); r[open ? 'open' : 'closed'].detour = dt.slice(0, 5); if (sc.length) { r.ng = true; shortcutN++; } if (dt.length) { r.ng = true; detourN++; }
    }
    if (r.ng) ng++; if (nChanged) { changedMaps++; totalChanged += nChanged; }
    res[id + (allFlags ? '#flags' : '')] = r;
    if (r.ng) console.log('NG  ' + id + (allFlags ? '（フラグあり）' : '') + ' ' + JSON.stringify(r).slice(0, 500));
  }
}
fs.writeFileSync(process.argv[2] || 'layout_check.json', JSON.stringify(res, null, 1));
const kinds = {}; Object.values(res).forEach((r) => { if (r.changed) kinds[r.kind] = (kinds[r.kind] || 0) + 1; });
console.log(`道のり：近道 ${shortcutN}件・大回り（＋4歩＋1割を超える）${detourN}件・いちばん長くなった歩数 ${maxDetour}`);
console.log(`結果：町・ダンジョン ${Object.keys(res).length}件（フラグ違いを含む）・作り直したマップ ${changedMaps}（${JSON.stringify(kinds)}）・変えたマス ${totalChanged}・NG ${ng}`);
process.exit(ng ? 1 : 0);
