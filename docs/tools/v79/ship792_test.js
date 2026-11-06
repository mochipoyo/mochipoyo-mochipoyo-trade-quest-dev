// v7.9.2 港町マリナの船（jsdom）：港へ戻した・降りた船が町の入口のすぐそば（3D 版の町の模型に隠れる所）に停まらない・歩いて行って乗れる
// 使い方：node ship792_test.js（3D 版の地球の世界と、2D 版の配置）
const load = require('../v78/load78.js');
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const V4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function setup(opts) {
  const A = load(opts); const w = A.w; const W = w.World, S = w.State; const log = [];
  w.Win.message = async (l) => { log.push([].concat(l || []).join('／')); }; w.Win.toast = (t) => log.push('toast:' + t);
  S.newGame('t', 'warrior'); const d = S.data; ['s3121_new_prologue', 'ship_ready', 'galleon_ready'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; W.start();
  return { A, w, W, S, d, log };
}
// 歩く・船で進む（1 歩ずつ 2D 版の移動で）
function step(W, dir) { W.busy = false; if (!W.tryMove(dir)) return false; for (let i = 0; i < 400 && W.player.moving; i++) W.scene.update(50); return true; }
function path(m, ok2, sx, sy, goal) {   // goal(x,y) → true
  const prev = new Map(); const k0 = sx + ',' + sy; prev.set(k0, null); const q = [[sx, sy]];
  for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; if (goal(x, y) && h) { const out = []; let k = x + ',' + y; while (k !== k0) { const p = prev.get(k); out.unshift(k); k = p; } return out.map((s) => s.split(',').map(Number)); }
    for (const [dx, dy] of V4) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (prev.has(k) || !ok2(nx, ny)) continue; prev.set(k, x + ',' + y); q.push([nx, ny]); } }
  return null;
}
const dirOf = (a, b) => b[0] > a[0] ? 'right' : b[0] < a[0] ? 'left' : b[1] > a[1] ? 'down' : 'up';
function walkTo(W, d, goal) { const m = W.map, p = W.player; const pass = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.passable(x, y, d) && !m.warpAt(x, y); const pt = path(m, pass, p.x, p.y, goal); if (!pt) return false; for (const q of pt) { if (!step(W, dirOf([p.x, p.y], q))) return false; } return true; }
function cheb(m, x, y) { let b = 1e9; (m.def.locations || []).forEach((l) => { b = Math.min(b, Math.max(Math.abs(l.x - x), Math.abs(l.y - y))); }); return b; }

async function earth() {
  console.log('--- 3D 版の地球の世界');
  const { A, w, W, d, log } = setup({}); const H = w.Harbors, V = w.Vehicle;
  ok(!A.errors.length && !!w.Dock79, '読み込みのエラーなし・Dock79 がある ' + A.errors.slice(0, 2).join(' / '));
  const m = W.getMap('world'); const mar = m.def.locations.find((l) => l.id === 'harbor'); const h = H.HARBORS.marina;
  ok(cheb(m, h.moor.x, h.moor.y) >= 3 && V.terrainOk('sailboat', m, h.moor.x, h.moor.y) && V.terrainOk('galleon', m, h.moor.x, h.moor.y), '港町マリナの停泊位置は海で、場所の印から 3 マス以上（町の模型に隠れない）' + JSON.stringify({ moor: h.moor, marina: [mar.x, mar.y], d: cheb(m, h.moor.x, h.moor.y) }));
  ok(cheb(m, h.land.x, h.land.y) >= 2 && m.passable(h.land.x, h.land.y, d) && Math.abs(h.land.x - h.moor.x) + Math.abs(h.land.y - h.moor.y) === 1, '桟橋の陸は停泊位置のとなりの歩けるマス（印から 2 マス以上）' + JSON.stringify(h.land));
  ['sailboat', 'galleon'].forEach((k) => { const hm = w.VEHICLES[k].home; ok(hm.map === 'world' && cheb(m, hm.x, hm.y) >= 3, w.VEHICLES[k].name + 'の母港は停泊位置と同じ（印から 3 マス以上）' + JSON.stringify(hm)); });
  ['sailboat', 'galleon'].forEach((k) => { const s = d.vehicles[k]; ok(s && s.map === 'world' && cheb(m, s.x, s.y) >= 3, '船を直したあとの' + w.VEHICLES[k].name + 'は印から 3 マス以上の海 ' + JSON.stringify(s && [s.x, s.y])); });
  // 町から出て、歩いて船に乗る
  const hdef = w.MAP_DEFS[mar.to]; const wp = (hdef.warps || []).find((q) => q.to === 'world'); const ex = w.MapRemake.pos('world', wp.tx, wp.ty);
  W.enterMap('world', ex.x, ex.y, 'up', { raw: true }); const sb = d.vehicles.sailboat;
  const reached = walkTo(W, d, (x, y) => Math.abs(x - sb.x) + Math.abs(y - sb.y) === 1); const p = W.player;
  ok(reached, '町の出口（' + ex.x + ',' + ex.y + '）から船のとなりへ歩いて行ける（' + p.x + ',' + p.y + '）');
  step(W, dirOf([p.x, p.y], [sb.x, sb.y])); ok(d.aboard === 'sailboat' || d.aboard === 'galleon', '船の方へ進むと乗れる（' + d.aboard + '）');
  // 船で入口のそば（印から 2 マス以内＝3D 版の町の模型の中）の海まで行って降りる → 建物に隠れない沖へ停め直す
  const myShip = d.aboard; const sea = (x, y) => V.terrainOk(myShip, m, x, y); const landAt = (X, Y) => X >= 0 && Y >= 0 && X < m.w && Y < m.h && !w.Tiles.isWater(m.tiles[Y][X]) && m.passable(X, Y, d);
  const nearIcon = path(m, sea, p.x, p.y, (x, y) => cheb(m, x, y) <= 2 && V4.some(([dx, dy]) => landAt(x + dx, y + dy)));
  ok(!!nearIcon, '船で町の入口のそば（印から 2 マス以内）の海へ行ける');
  if (nearIcon) { for (const q of nearIcon) step(W, dirOf([p.x, p.y], q)); log.length = 0; const at = [p.x, p.y]; const L = V4.map(([dx, dy]) => [at[0] + dx, at[1] + dy]).sort((u, v) => (m.warpAt(v[0], v[1]) ? 1 : 0) - (m.warpAt(u[0], u[1]) ? 1 : 0)).find(([X, Y]) => landAt(X, Y)); const intoTown = !!m.warpAt(L[0], L[1]);
    step(W, dirOf(at, L)); const s = d.vehicles[myShip]; ok(!d.aboard, (intoTown ? 'そのまま町に入った（' + W.map.id + '）' : '入口のそばで降りた（' + L.join(',') + '）'));
    ok(cheb(m, s.x, s.y) >= 3 && !(s.x === at[0] && s.y === at[1]), '残した船は印から 3 マス以上の沖へ（' + at.join(',') + '［印から ' + cheb(m, at[0], at[1]) + '］ → ' + s.x + ',' + s.y + '）');
    ok(log.some((t) => /沖に停めた/.test(t)), '上陸の表示に「沖に停めた」 ' + (log.find((t) => /toast/.test(t)) || ''));
    // 歩いて乗れる
    if (W.map.id !== 'world') W.enterMap('world', ex.x, ex.y, 'up', { raw: true }); const r2 = walkTo(W, d, (x, y) => Math.abs(x - s.x) + Math.abs(y - s.y) === 1); step(W, dirOf([p.x, p.y], [s.x, s.y]));
    ok(r2 && d.aboard === myShip, '停め直した船に歩いて乗れる'); }
  // 降りる（入口から離れた所）→ 動かさない
  if (d.aboard) { const shore = path(m, sea, p.x, p.y, (x, y) => cheb(m, x, y) >= 8 && V4.some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < m.w && Y < m.h && !w.Tiles.isWater(m.tiles[Y][X]) && m.passable(X, Y, d) && !m.warpAt(X, Y); }));
    if (shore) { for (const q of shore) step(W, dirOf([p.x, p.y], q)); const at = [p.x, p.y]; const L = V4.map(([dx, dy]) => [at[0] + dx, at[1] + dy]).find(([X, Y]) => !w.Tiles.isWater(m.tiles[Y][X]) && m.passable(X, Y, d) && !m.warpAt(X, Y)); step(W, dirOf(at, L)); const s = d.vehicles[myShip]; ok(!d.aboard && s.x === at[0] && s.y === at[1], '町から離れた所で降りた船は、その場で待つ（' + at.join(',') + '）'); } }
  // 港へ呼び戻す（町の船乗り）
  const r = H.recall('galleon', h) || {}; ok(cheb(m, r.x, r.y) >= 3 && H.isAt('galleon', h), '港へ呼び戻した遠洋航海船は印から 3 マス以上（' + r.x + ',' + r.y + '）で、港にいる扱い');
  const r3 = H.recall('sailboat', h) || {}; ok(cheb(m, r3.x, r3.y) >= 3 && !(r3.x === r.x && r3.y === r.y), '帆船も呼び戻せる（重ならない ' + r3.x + ',' + r3.y + '）');
  // 前のセーブ：入口のすぐ横（1 マス）に止めてある船 → 地図に入ると停め直す
  let adj = null; for (let r = 1; r <= 2 && !adj; r++) for (let dy = -r; dy <= r && !adj; dy++) for (let dx = -r; dx <= r && !adj; dx++) { const X = mar.x + dx, Y = mar.y + dy; if (V.terrainOk('sailboat', m, X, Y)) adj = [X, Y]; }
  if (adj) { d.aboard = null; d.vehicles.sailboat.map = 'world'; d.vehicles.sailboat.x = adj[0]; d.vehicles.sailboat.y = adj[1]; d.vehicles.sailboat.port = { map: 'world', x: adj[0], y: adj[1] }; d.pos = { map: mar.to, x: 5, y: 5, dir: 'down' }; const txt = JSON.stringify(d);
    const B = setup({}); B.w.State.data = JSON.parse(txt); B.W.start(); B.W.enterMap('world', ex.x, ex.y, 'up', { raw: true }); const s = B.d && B.w.State.data.vehicles.sailboat; const m2 = B.W.getMap('world');
    ok(cheb(m2, s.x, s.y) >= 3 && s.port.x === s.x && s.port.y === s.y, '前のセーブで入口のそば（' + adj.join(',') + '）にあった帆船 → 外に出ると沖へ（' + s.x + ',' + s.y + '）');
  } else ok(true, '（入口のとなりに海がない：前のセーブの確認は飛ばした）');
}

async function flat() {
  console.log('--- 2D 版の配置');
  const { A, w, W, d } = setup({ earth: false, join: false }); const H = w.Harbors;
  ok(!A.errors.length, '読み込みのエラーなし ' + A.errors.slice(0, 2).join(' / '));
  ok(JSON.stringify(H.HARBORS.marina.moor) === '{"x":18,"y":73}' && JSON.stringify(w.VEHICLES.sailboat.home) === '{"map":"world","x":19,"y":72}', '港町マリナの停泊位置・母港は前と同じ（18,73 / 19,72）');
  const s = d.vehicles.sailboat; ok(s.x === 18 && s.y === 73, '船を直したあとの帆船は前と同じ場所（18,73。v7.9.1 と同じ）');
  const r = H.recall('galleon', H.HARBORS.marina) || {}; const m = W.getMap('world'); ok(cheb(m, r.x, r.y) >= 3, '呼び戻した遠洋航海船（' + r.x + ',' + r.y + '）');
}
(async () => { await earth(); await flat(); console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0); })().catch((e) => { console.error(e); process.exit(1); });
