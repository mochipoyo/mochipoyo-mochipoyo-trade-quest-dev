// v7.8 地球の世界（js/rpg/earth78.js）の確認（jsdom。3D 版と同じく MTQ_JOIN76 ＋ 地形のデータ）：node docs/tools/v78/earth78_check.js
const load = require('./load78.js');
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const A = load(); const w = A.w, W = w.World76, E = w.Earth78, T = w.Tiles; w.State.newGame('t', 'warrior');
ok(A.errors.length === 0, '読み込みエラーなし ' + A.errors.slice(0, 2).join(' / '));
ok(W.earth && W.ready && E.ready, '地球の配置が有効（組み立て ' + E.stats.total + 'ms）');
const S = W.size(); ok(S.w === 1440 && S.h === 840 && W.wrap(), '世界 ' + S.w + '×' + S.h + '・東西が一周');
ok(!(E.stats.placeFail || []).length, '宝箱・人・出来事などを置けた ' + (E.stats.placeFail || []).join(','));
ok(!(E.stats.roadFail || []).length, '同じ区域の入口を道で結べた ' + (E.stats.roadFail || []).join(','));
const walk = (c) => { const n = T.byChar[c]; return !!n && !T.isSolid(n) && !T.isWater(n); };
// ---------- 区域：旧地図で歩いてつながっていた入口どうしは、新しい地図でもつながる。別々だった所はつながらない
for (const id of E.ids) { const o = E.OLD[id], g = E.GEN[id]; if (!o) continue; const lab = g.lab; const at = (x, y) => { for (let r = 0; r <= 1; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= g.W || yy >= g.H) continue; const l = lab[yy * g.W + xx]; if (l >= 0) return l; } return -1; };
  const L = g.locs; let bad = [];
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const same0 = L[i].comp === L[j].comp && L[i].comp >= 0, same1 = at(L[i].x, L[i].y) === at(L[j].x, L[j].y) && at(L[i].x, L[i].y) >= 0; if (same0 !== same1) bad.push(L[i].id + '/' + L[j].id + (same0 ? ' 切れた' : ' つながった')); }
  ok(!bad.length, id + '：入口のつながりが旧地図と同じ（' + L.length + ' か所）' + bad.slice(0, 4).join(' '));
  // 町の出口（旧座標のワープ）→ 新しい座標が、その入口と同じ区域・すぐ近く
  const far = []; Object.keys(w.MAP_DEFS).forEach((mid) => { const d = w.MAP_DEFS[mid]; if (!d || d.kind === 'field') return; (d.warps || []).forEach((wp) => { if (wp.to !== id) return; const p = w.MapRemake.pos(id, wp.tx, wp.ty); const near = L.concat((w.MAP_DEFS[id].events || []).filter((e) => e.type === 'dive').map((e) => ({ x: e.x, y: e.y, id: 'dive' }))).reduce((b, l) => { const dd = Math.abs(l.x - p.x) + Math.abs(l.y - p.y); return dd < b.d ? { d: dd, l } : b; }, { d: 1e9 }); const c = g.rows[p.y][p.x]; if (near.d > 4 || !walk(c) || (near.l.id !== 'dive' && at(p.x, p.y) !== at(near.l.x, near.l.y))) far.push(mid + '→' + wp.tx + ',' + wp.ty + '=' + p.x + ',' + p.y + '(' + c + ' d' + near.d + ')'); }); });
  ok(!far.length, id + '：町・ダンジョンの出口が入口のすぐ横の歩けるマス ' + far.slice(0, 3).join(' '));
}
// ---------- 港：停める海が外の海につながる（湖でない）
const H = w.Harbors.HARBORS; Object.keys(H).forEach((k) => { const h = H[k]; const m = w.World.getMap(h.map); const c = m.tiles[h.moor.y][h.moor.x]; const gl = W.toGlobal(h.map, h.moor.x, h.moor.y); ok(T.isWater(c) && E.dist(gl.x, gl.y) >= 1, '港 ' + h.name + '：停める所が海（' + c + '）・桟橋 ' + h.land.x + ',' + h.land.y); });
Object.keys(w.VEHICLES).forEach((k) => { const hm = w.VEHICLES[k].home; const m = w.World.getMap(hm.map); const c = m.tiles[hm.y][hm.x]; ok(k === 'airship' ? !T.isSolid(c) || T.isWater(c) : T.isWater(c), '乗り物の母港 ' + k + ' ' + hm.map + ' ' + hm.x + ',' + hm.y + '（' + c + '）'); });

// ---------- 移動と進入の条件（世界の座標で、地図の境目をまたいで調べる）
w.World.start(); const d = w.State.data; const WW = S.w, WH = S.h;
const CH = new Array(WW * WH); for (const id of W.MAPS) { const r = W.rect(id); const rows = w.MAP_DEFS[id].rows(); for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) CH[(r.y + y) * WW + r.x + x] = rows[y][x]; }
const MID = new Array(WW * WH); for (let gy = 0; gy < WH; gy++) for (let gx = 0; gx < WW; gx++) MID[gy * WW + gx] = W.mapAt(gx, gy);
const tname = (c) => T.byChar[c];
const passBy = { walk: (c) => { const n = tname(c); return !!n && !T.isSolid(n) && !T.isWater(n); },
  sailboat: (c, i) => c === '~' || c === 'w' || (c === 'b' && W.isBridge76(MID[i], (i % WW) - W.rect(MID[i]).x, ((i / WW) | 0) - W.rect(MID[i]).y)),
  galleon: (c, i) => c === '~' || c === 'w' || c === '0' || (c === 'b' && W.isBridge76(MID[i], (i % WW) - W.rect(MID[i]).x, ((i / WW) | 0) - W.rect(MID[i]).y)),
  airship: () => true };
const setF = (fs) => { Object.keys(W.GATE).forEach((id) => delete d.flags[W.GATE[id].flag]); ['ship_ready', 'galleon_ready', 'airship_owned', 'dark_route_open'].forEach((f) => delete d.flags[f]); fs.forEach((f) => d.flags[f] = true); };
// 1 つの乗り物（または徒歩）で行ける所（start: 世界の座標の配列）
function flood(mode, starts) {
  const seen = new Uint8Array(WW * WH); const q = []; starts.forEach((s) => { const i = s[1] * WW + w.World76.wrapX(s[0]); if (!seen[i]) { seen[i] = 1; q.push(i); } });
  const ok = passBy[mode]; const veh = mode === 'walk' ? null : mode;
  for (let h = 0; h < q.length; h++) { const c = q[h], cx = c % WW, cy = (c / WW) | 0; const from = MID[c];
    for (let k = 0; k < 4; k++) { const nx = W.wrapX(cx + [1, -1, 0, 0][k]), ny = cy + [0, 0, 1, -1][k]; if (ny < 0 || ny >= WH) continue; const n = ny * WW + nx; if (seen[n]) continue; const to = MID[n];
      if (!ok(CH[n], n)) continue; if (to !== from && W.entryBlock(to, veh, from)) continue; seen[n] = 1; q.push(n); } }
  return seen;
}
function regionsIn(seen) { const set = new Set(); for (let i = 0; i < seen.length; i++) if (seen[i]) { const m = MID[i]; if (W.isRegion(m)) set.add(m); } return set; }
// 物語の段階ごと：ポヨ村から歩いて＋持っている船で（上陸して歩く）行ける地域
const poyo = W.toGlobal('world', w.MAP_DEFS.world.locations.find((l) => l.id === 'poyo_village').x, w.MAP_DEFS.world.locations.find((l) => l.id === 'poyo_village').y + 1);
const harbor = w.Harbors.HARBORS.marina; const hg = W.toGlobal('world', harbor.moor.x, harbor.moor.y);
function reach(flags) {
  setF(flags); let land = flood('walk', [[poyo.x, poyo.y]]); const ship = flags.includes('galleon_ready') ? 'galleon' : flags.includes('ship_ready') ? 'sailboat' : null;
  if (ship) { const sea = flood(ship, [[hg.x, hg.y]]); const st = []; for (let i = 0; i < sea.length; i++) if (sea[i]) { const cx = i % WW, cy = (i / WW) | 0; for (let k = 0; k < 4; k++) { const nx = W.wrapX(cx + [1, -1, 0, 0][k]), ny = cy + [0, 0, 1, -1][k]; if (ny < 0 || ny >= WH) continue; const n = ny * WW + nx; if (passBy.walk(CH[n]) && !W.entryBlock(MID[n], null, MID[i]) ) st.push([nx, ny]); } }
    const land2 = flood('walk', st.concat([[poyo.x, poyo.y]])); for (let i = 0; i < land.length; i++) land[i] |= land2[i] | sea[i]; }
  return regionsIn(land);
}
const STAGES = [['はじめ', [], ['world']], ['船を直した（ship_ready）', ['ship_ready'], ['world', 'world_grania']], ['灰の峠の関所（kalion_open）', ['ship_ready', 'kalion_open'], ['world', 'world_grania', 'world_kalion']],
  ['遠洋航海船（galleon_ready）', ['ship_ready', 'kalion_open', 'galleon_ready'], ['world', 'world_grania', 'world_kalion', 'world_islands', 'world_nereia']],
  ['断裂群島の用事（yorn_letter_done）', ['ship_ready', 'kalion_open', 'galleon_ready', 'yorn_letter_done'], ['world', 'world_grania', 'world_kalion', 'world_islands', 'world_nereia', 'world_tempus', 'world_desert', 'world_snow', 'world_meridian']],
  ['ゼロメアの選択（zeromea_choice_done）', ['ship_ready', 'kalion_open', 'galleon_ready', 'yorn_letter_done', 'zeromea_choice_done'], ['world', 'world_grania', 'world_kalion', 'world_islands', 'world_nereia', 'world_tempus', 'world_desert', 'world_snow', 'world_meridian', 'world_magicka']],
  ['魔導王国に着いた（magicka_arrived）', ['ship_ready', 'kalion_open', 'galleon_ready', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived'], ['world', 'world_grania', 'world_kalion', 'world_islands', 'world_nereia', 'world_tempus', 'world_desert', 'world_snow', 'world_meridian', 'world_magicka', 'world_dragon', 'world_neon']]];
for (const [nm, fl, exp] of STAGES) { const got = [...reach(fl)].filter((id) => w.MAP_DEFS[id]); const e = exp.filter((id) => w.MAP_DEFS[id]); const miss = e.filter((x) => !got.includes(x)), extra = got.filter((x) => !e.includes(x)); ok(!miss.length && !extra.length, '物語の段階「' + nm + '」：歩き＋船で行ける地域 ' + got.length + (miss.length ? ' 足りない ' + miss.join(',') : '') + (extra.length ? ' 早すぎる ' + extra.join(',') : '')); }
// 暗黒大陸（南極）：闇の空路のあと、飛空艇だけ
setF(['ship_ready', 'kalion_open', 'galleon_ready', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived', 'dark_route_open', 'airship_owned']);
ok([...reach(['ship_ready', 'kalion_open', 'galleon_ready', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived', 'dark_route_open'])].indexOf('world_dark') < 0, '暗黒大陸：闇の空路が開いても、船・徒歩では入れない');
const ALL = ['ship_ready', 'kalion_open', 'galleon_ready', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived', 'airship_owned'];
setF(ALL.concat(['dark_route_open'])); const air = regionsIn(flood('airship', [[poyo.x, poyo.y]])); ok(air.has('world_dark'), '暗黒大陸：飛空艇で入れる（闇の空路のあと）');
setF(ALL); ok(!regionsIn(flood('airship', [[poyo.x, poyo.y]])).has('world_dark'), '暗黒大陸：闇の空路の前は飛空艇でも入れない');
// 東西の一周：遠洋航海船で太平洋を東西に横断（右端 → 左端）
setF(['galleon_ready', 'yorn_letter_done', 'magicka_arrived', 'zeromea_choice_done']);
const pac = flood('galleon', [[1300, 330]]); let wrapOK = false; for (let y = 200; y < 600; y++) if (pac[y * WW + 0] && pac[y * WW + WW - 1]) { wrapOK = true; break; }
ok(wrapOK && pac[330 * WW + 300], '遠洋航海船：日本の東（経度 156°E）から太平洋を東へ、世界の右端 → 左端をまたいで北アメリカの西（経度 94°W）まで');
// 町・ダンジョンから出たところから本土へ歩ける（入口の横の小さな陸に閉じこめられない。港町マリナで起きた）。島の入口（船で行く所）は対象外
{ const d = w.State.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready', 'kalion_open', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived', 'dark_route_open'].forEach((f) => d.flags[f] = true); d.aboard = null; w.World.start();
  const pockets = [], traps = []; let nExit = 0; const V = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const reach = (m, x, y, cap) => { const seen = new Set([x + ',' + y]); const q = [[x, y]]; while (q.length && seen.size < cap) { const [cx, cy] = q.shift(); for (const [dx, dy] of V) { const nx = cx + dx, ny = cy + dy, k = nx + ',' + ny; if (seen.has(k) || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || m.warpAt(nx, ny) || !m.passable(nx, ny, d)) continue; seen.add(k); q.push([nx, ny]); } } return seen.size; };
  const mainland = {}; W.REGIONS.forEach((rid) => { const m = w.World.getMap(rid); (m.def.locations || []).forEach((L) => { const sz = V.map(([dx, dy]) => (m.passable(L.x + dx, L.y + dy, d) && !m.warpAt(L.x + dx, L.y + dy)) ? reach(m, L.x + dx, L.y + dy, 200) : 0).filter((n) => n > 0);
    if (sz.some((n) => n >= 60)) { mainland[L.to] = true; if (sz.some((n) => n < 60)) pockets.push(rid + ':' + L.id + '(' + sz.join(',') + ')'); } }); });
  Object.keys(w.MAP_DEFS).forEach((id) => { if (W.REGIONS.includes(id) || W.SEAS.includes(id)) return; (w.MAP_DEFS[id].warps || []).forEach((wp) => { if (!wp || !W.REGIONS.includes(wp.to) || !mainland[id]) return; nExit++;
    w.World.enterMap(wp.to, wp.tx, wp.ty, 'down'); const m = w.World.map; const n = reach(m, w.World.player.x, w.World.player.y, 200); if (n < 60) traps.push(id + '→' + m.id + '@' + w.World.player.x + ',' + w.World.player.y + '(' + n + ')'); }); });
  ok(!pockets.length, '本土にある入口のまわりに、本土とつながらない小さな陸がない ' + pockets.join(' '));
  ok(nExit > 30 && !traps.length, '本土にある町・ダンジョン ' + nExit + ' の出口から出ると、本土へ歩いて行ける（閉じこめられない） ' + traps.slice(0, 5).join(' ')); }
console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
