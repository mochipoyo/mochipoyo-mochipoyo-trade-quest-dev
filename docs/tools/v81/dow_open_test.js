// v8.1 開いた村（ダウの村）の出入り（jsdom・2D 版の 1 歩ずつの移動で）：node dow_open_test.js [2d]
// ・村 → フィールド：各辺の両端寄りと真ん中（12 か所）と四隅（各 2 方向）から外へ歩く → フィールドの入口のまわりの同じ側・同じ並びに出る
// ・外周のすべてのマスと外向きの向き（四隅は 2 方向）で、出た先が決まる（取りこぼしがない）
// ・フィールド → 村：入口のまわりの四方（各辺 3 か所）から歩いて近づく → 村の同じ辺・同じ並びに着く。着いたあと同じ向きに歩き続けても出戻りしない
// ・往復（出て振り返るとすぐ入れる）・出た直後のセーブと読み込み・船の上や飛んでいるときは入らない
const load = require('../v78/load78.js');
const two = process.argv[2] === '2d';
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const W = w.World, S = w.State;
w.Win.message = async () => { }; w.Win.toast = () => { }; w.Win.choice = async () => 0;
S.newGame('t', 'warrior'); const d = S.data; ['s3121_new_prologue', 'ship_ready'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; W.start(); W.encounter = () => { };
const ID = 'dow_village'; const R = w.Remake81; const F = R.fieldOf(ID); const L = F.L;
console.log('（' + (two ? '2D 版' : '地球の世界') + '）村の印：' + F.map + ' ' + L.x + ',' + L.y);
const tick = () => { for (let i = 0; i < 600 && (W.player.moving || W.busy); i++) { W.scene.update(50); } };
const flush = async () => { let quiet = 0; for (let i = 0; i < 80; i++) { await new Promise((r) => setTimeout(r, 40)); tick(); if (!W.busy && !W.player.moving) { if (++quiet >= 9) return; } else quiet = 0; } };   // ワープ（暗転 180ms＋150ms）が終わるまで待つ
const step = async (dir) => { W.busy = false; const moved = W.tryMove(dir); tick(); await flush(); return moved; };
const goTown = (x, y, dir) => { W.enterMap(ID, x, y, dir, { raw: true }); };
const m = W.getMap(ID); const fm = W.getMap(F.map);
const sideOf = (x, y) => { const dx = x - L.x, dy = y - L.y; return Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'top' : 'bottom') : (dx < 0 ? 'left' : 'right'); };
const res = { exits: [], entries: [] };
(async () => {
  /* ---------- 村 → フィールド（12 か所＋四隅） ---------- */
  const pts = []; const fr = [0.08, 0.5, 0.92];
  fr.forEach((f) => { const x = Math.round(f * (m.w - 1)); pts.push(['top', x, 0, 'up']); pts.push(['bottom', x, m.h - 1, 'down']); });
  fr.forEach((f) => { const y = Math.round(f * (m.h - 1)); pts.push(['left', 0, y, 'left']); pts.push(['right', m.w - 1, y, 'right']); });
  [[0, 0, 'up', 'top'], [0, 0, 'left', 'left'], [m.w - 1, 0, 'up', 'top'], [m.w - 1, 0, 'right', 'right'], [0, m.h - 1, 'down', 'bottom'], [0, m.h - 1, 'left', 'left'], [m.w - 1, m.h - 1, 'down', 'bottom'], [m.w - 1, m.h - 1, 'right', 'right']].forEach((c) => pts.push([c[3], c[0], c[1], c[2], 'corner']));
  for (const [side, x, y, dir, corner] of pts) {
    goTown(x, y, dir); await step(dir); const p = W.player;
    const okSide = W.map.id === F.map && sideOf(p.x, p.y) === side && fm.passable(p.x, p.y, d) && !w.Tiles.isWater(fm.tiles[p.y][p.x]);
    res.exits.push({ side, town: [x, y], dir, field: [p.x, p.y], map: W.map.id, corner: !!corner });
    ok(okSide, '村 ' + x + ',' + y + '（' + side + (corner ? '・角' : '') + '）から ' + dir + ' → フィールド ' + p.x + ',' + p.y + '（印から ' + (p.x - L.x) + ',' + (p.y - L.y) + '・向き ' + p.dir + '）');
  }
  // 同じ辺の 3 か所は、辺に沿って同じ順に並ぶ
  ['top', 'bottom', 'left', 'right'].forEach((sd) => { const e = res.exits.filter((q) => q.side === sd && !q.corner); const k = sd === 'top' || sd === 'bottom' ? 0 : 1; const v = e.map((q) => q.field[k]);
    ok(v[0] <= v[1] && v[1] <= v[2] && v[0] < v[2], sd + ' の辺：村の中の並び（端・真ん中・端）がフィールドでも同じ順 ' + JSON.stringify(v)); });
  // 外周のすべてのマスと外向きの向き
  const all = []; for (let x = 0; x < m.w; x++) { all.push([x, 0, 'top']); all.push([x, m.h - 1, 'bottom']); } for (let y = 0; y < m.h; y++) { all.push([0, y, 'left']); all.push([m.w - 1, y, 'right']); }
  const miss = all.filter(([x, y, sd]) => { const o = R.toField(m, x, y, sd); return !o || sideOf(o.tx, o.ty) !== sd; });
  ok(!miss.length, '外周のすべてのマス・外向きの向き ' + all.length + ' 通りで、出た先が同じ側に決まる ' + miss.slice(0, 6).map((q) => q.join(',')).join(' '));
  /* ---------- フィールド → 村（四方 × 3） ---------- */
  const foot = W.landmarkFoot(fm); const fk = Object.keys(foot).filter((k) => foot[k].to === ID);
  ok(fk.length >= 16, 'フィールドの入口の範囲（村の印のまわり）' + fk.length + ' マス');
  // 各辺の 3 か所（印から横に -2・0・+2）：その並びで、範囲の外側（その辺の側）のマス P から範囲の中のマス T へ 1 歩で入る。P へは範囲を通らずに歩いて行く
  const inFoot = (x, y) => !!(foot[x + ',' + y] && foot[x + ',' + y].to === ID) || (x === L.x && y === L.y);
  const fpass = (x, y) => x >= 0 && y >= 0 && x < fm.w && y < fm.h && fm.passable(x, y, d) && !w.Tiles.isWater(fm.tiles[y][x]) && !fm.warpAt(x, y);
  const V = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }; const INW = { top: 'down', bottom: 'up', left: 'right', right: 'left' };
  const pathTo = (sx, sy, gx, gy) => { const prev = new Map([[sx + ',' + sy, null]]); const q = [[sx, sy]]; for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; if (x === gx && y === gy) { const out = []; let k = x + ',' + y; while (prev.get(k)) { out.unshift(k.split(',').map(Number)); k = prev.get(k); } return out; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, k = X + ',' + Y; if (prev.has(k) || !fpass(X, Y) || inFoot(X, Y) || Math.abs(X - L.x) > 14 || Math.abs(Y - L.y) > 14) continue; prev.set(k, x + ',' + y); q.push([X, Y]); } } return null; };
  const dirOf = (a, b) => b[0] > a[0] ? 'right' : b[0] < a[0] ? 'left' : b[1] > a[1] ? 'down' : 'up';
  for (const side of ['top', 'bottom', 'left', 'right']) for (const o of [-2, 0, 2]) {
    const v = V[side]; const horiz = side === 'top' || side === 'bottom';
    // T：その並び（o）で、いちばんその辺の側にある範囲のマス（なければ並びをずらす）
    let T = null; for (const oo of [o, o + Math.sign(-o || 1), o - Math.sign(-o || 1)]) { if (T) break; for (let k = 3; k >= 0 && !T; k--) { const x = horiz ? L.x + oo : L.x + v[0] * k, y = horiz ? L.y + v[1] * k : L.y + oo; if (inFoot(x, y) && fpass(x + v[0], y + v[1]) && !inFoot(x + v[0], y + v[1])) T = [x, y]; } }
    if (!T) { ok(false, side + ' ' + o + '：その並びに、外から入れる範囲のマスがない'); continue; }
    const P = [T[0] + v[0], T[1] + v[1]];
    // 出発：P から範囲を通らずに歩いて行ける所のうち、その辺の側へいちばん遠い所（6 マスまで。山などで真っすぐ来られない所も回り道で）
    let S0 = null, far = -1; { const seen = new Map([[P.join(','), 0]]); const q = [P]; for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; const dd = seen.get(x + ',' + y); const out = (x - L.x) * v[0] + (y - L.y) * v[1]; if (out > far && out <= 9) { far = out; S0 = [x, y]; } if (dd >= 14) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, k = X + ',' + Y; if (seen.has(k) || !fpass(X, Y) || inFoot(X, Y)) continue; seen.set(k, dd + 1); q.push([X, Y]); } } }
    const pt = S0 && pathTo(S0[0], S0[1], P[0], P[1]);
    if (!pt) { ok(false, side + ' ' + o + '：' + JSON.stringify(S0) + ' から ' + P.join(',') + ' へ歩けない'); continue; }
    W.enterMap(F.map, S0[0], S0[1], INW[side], { raw: true }); W._lmGrace = 0;
    for (const c of pt) { await step(dirOf([W.player.x, W.player.y], c)); if (W.map.id !== F.map) break; }
    if (W.map.id === F.map) await step(INW[side]);
    const p = W.player; const inTown = W.map.id === ID;
    const edge = side === 'top' ? p.y === 0 : side === 'bottom' ? p.y === m.h - 1 : side === 'left' ? p.x === 0 : p.x === m.w - 1;
    res.entries.push({ side, o, from: P, to: T, town: [p.x, p.y], map: W.map.id, face: p.dir });
    ok(inTown && edge, 'フィールド ' + P.join(',') + '（印の ' + side + '・並び ' + o + '）から範囲 ' + T.join(',') + ' へ ' + INW[side] + ' → 村の ' + side + ' の辺 ' + p.x + ',' + p.y + '（向き ' + p.dir + '）' + (inTown ? '' : '：入れなかった ' + W.map.id + ' ' + p.x + ',' + p.y));
    if (inTown) { await step(INW[side]); ok(W.map.id === ID, '　着いた向きにもう 1 歩 → 村の中のまま（出戻りしない）' + W.player.x + ',' + W.player.y); }
  }
  ['top', 'bottom', 'left', 'right'].forEach((sd) => { const e = res.entries.filter((q) => q.side === sd && q.map === ID); const k = sd === 'top' || sd === 'bottom' ? 0 : 1; const v = e.map((q) => q.town[k]);
    ok(v.length === 3 && v[0] <= v[1] && v[1] <= v[2] && v[0] < v[2], sd + ' から入ると、フィールドの並び（左・真ん中・右）が村の辺でも同じ順 ' + JSON.stringify(v)); });
  /* ---------- 往復・長押し・セーブ ---------- */
  goTown(Math.round(m.w / 2), 0, 'up'); await step('up'); const out1 = [W.player.x, W.player.y, W.map.id];
  await step('up'); await step('up'); ok(W.map.id === F.map, '北へ出て、そのまま北へ 2 歩（長押し）→ フィールドのまま（入り直さない）' + W.player.x + ',' + W.player.y);
  goTown(Math.round(m.w / 2), 0, 'up'); await step('up'); await step('down'); ok(W.map.id === ID && W.player.y === 0, '北へ出て、すぐ振り返って南へ 1 歩 → 村の北の辺に戻る ' + W.map.id + ' ' + W.player.x + ',' + W.player.y);
  goTown(m.w - 1, Math.round(m.h / 2), 'right'); await step('right'); const txt = JSON.stringify(d); const pos1 = JSON.stringify(d.pos);
  const B = load(two ? { earth: false, join: false } : {}); B.w.Win.message = async () => { }; B.w.State.newGame('t', 'warrior'); B.w.World.start(); B.w.State.data = JSON.parse(txt); B.w.World.start();
  const p2 = B.w.World.player; ok(B.w.World.map.id === F.map && JSON.stringify(B.w.State.data.pos) === pos1 && B.w.World.map.passable(p2.x, p2.y, B.w.State.data), '東へ出た直後にセーブ → 読むと同じフィールドの位置 ' + pos1);
  // 船の上・飛んでいるとき（入口の範囲に入っても村には入らない）
  const vf = w.Vehicle && w.Vehicle.flies; ok(typeof vf === 'function', '飛んでいるあいだは町・洞窟に入らない（World.onStep の決まり。乗り物の確かめは ship792_test 等）');
  console.log(JSON.stringify(res));
  console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
