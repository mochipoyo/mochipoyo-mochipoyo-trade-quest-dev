// v7.6 環境リデザイン：EnvLayout（町の街路・ダンジョンの空間の流れ）の確認（jsdom でゲームのデータを読む）
//   使い方：RPG_DIR=<リポジトリ>/ node layout_check.js [出力.json]
//   ・町・ダンジョンの全マップで、作り直しなし（EnvLayout.enabled=false）と、ありの GameMap を作って比べる（EnvLayout の中の確認とは別に、ここで数え直す）
//   ・入口（ワープ）から歩いて行ける所（4方向）で、近づける物（ワープ・出来事・宝箱・人・調べる場所・クイズの魔物）の集まりが同じか
//     鍵の扉・関所・レバー・通れない出来事を「閉じた」とき と「開いた」とき の両方で比べる（閉じたときに増える＝抜け道、減る＝行けなくなった）
//   ・建物の表示条件（showIf）が変わる町は、フラグなし と すべてのフラグあり の両方で作る
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
  (w.SEARCH_POINTS || []).forEach((p) => { if (p.map === m.id && near(p.x, p.y)) out.push('search:' + p.x + ',' + p.y); });
  (w.QUIZ_MONSTERS || []).forEach((p) => { if (p.map === m.id && near(p.x, p.y)) out.push('quiz:' + p.x + ',' + p.y); });
  return { tiles: seen.size, list: out.sort() };
}
const res = {}; let ng = 0, changedMaps = 0, totalChanged = 0;
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
    for (const open of [false, true]) {
      const a = reach(m0, open), b = reach(m1, open); const A = new Set(a.list), B = new Set(b.list);
      const lost = a.list.filter((k) => !B.has(k)), gained = b.list.filter((k) => !A.has(k));
      r[open ? 'open' : 'closed'] = { tiles: a.tiles + '→' + b.tiles, lost, gained };
      if (lost.length || gained.length) { r.ng = true; }
    }
    if (r.ng) ng++; if (nChanged) { changedMaps++; totalChanged += nChanged; }
    res[id + (allFlags ? '#flags' : '')] = r;
    if (r.ng) console.log('NG  ' + id + (allFlags ? '（フラグあり）' : '') + ' ' + JSON.stringify(r).slice(0, 500));
  }
}
fs.writeFileSync(process.argv[2] || 'layout_check.json', JSON.stringify(res, null, 1));
const kinds = {}; Object.values(res).forEach((r) => { if (r.changed) kinds[r.kind] = (kinds[r.kind] || 0) + 1; });
console.log(`結果：町・ダンジョン ${Object.keys(res).length}件（フラグ違いを含む）・作り直したマップ ${changedMaps}（${JSON.stringify(kinds)}）・変えたマス ${totalChanged}・NG ${ng}`);
process.exit(ng ? 1 : 0);
