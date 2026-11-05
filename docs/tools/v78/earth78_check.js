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
console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
