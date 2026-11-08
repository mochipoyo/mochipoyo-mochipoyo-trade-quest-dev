// v8.8 Phase 5：v8.2 の記録で NG だった 8 経路（docs/arch82/logs/route82_palace_open_earth.log）を、いまの版で確かめ直す（jsdom）：node route88_test.js [2d]
//  ・「戻るワープがない」3 件：物語の鍵で開く建物（showIf）と、出来事（古井戸）で入る抜け道。鍵を開けた状態で往復できるか、出来事に歩いて行けるか
//  ・「着いたマスがワープの上」5 件：2D 版・3D 版とも、ワープは「歩いてマスに入ったとき」だけ働く（World.onStep）。着いただけでは跳ね返らないこと、
//    1 歩離れてから戻ると元の部屋へ帰れることを、2D 版の 1 歩ずつの移動で確かめる
const load = require('../v78/load78.js'); const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w;
const W = w.World, S = w.State; const D = w.MAP_DEFS;
w.Win.message = async () => { }; w.Win.toast = () => { }; w.Win.choice = async () => 0;
S.newGame('t', 'warrior'); const d = S.data; ['s3121_new_prologue', 'ship_ready', 'sevran_fallen', 'palace_open', 'verum_liberated', 'zeromea_reformed'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done';
W.start(); W.encounter = () => { };
const L = require('../v81/walk81.js')(w, d); const { flush, step, walkTo, D4, passAt } = L;
let ok = 0; const ng = []; const T = (c, m) => { if (c) ok++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
function reach(m, sx, sy) { const seen = {}; const q = [[sx, sy]]; seen[sx + ',' + sy] = 1; while (q.length) { const [x, y] = q.shift(); for (const k of Object.keys(D4)) { const nx = x + D4[k][0], ny = y + D4[k][1]; const key = nx + ',' + ny; if (seen[key]) continue; if (m.warpAt(nx, ny) || (m.eventAt(nx, ny))) { seen[key] = 1; continue; } if (!passAt(m, nx, ny)) continue; seen[key] = 1; q.push([nx, ny]); } } return seen; }
const enter = (id, x, y) => { W.maps = {}; W.busy = false; W.enterMap(id, x, y, 'down', { raw: true }); };
(async () => {
  console.log('== ' + (two ? '2D 版' : '3D 版と同じ読み込み（地球の世界）'));
  console.log('-- 戻るワープがない（と記録されていた）3 件');
  for (const [room, town] of [['verum_school', 'verum_town'], ['node_market', 'node_city']]) {
    if (!D[room] || !D[town]) { T(true, room + '：この版にない（2D／地球の違い）'); continue; }
    W.maps = {}; const tm = W.getMap(town); const door = tm.warps.find((q) => q.to === room);
    const b = (D[town].buildings || []).find((x) => x.interior === room); T(!!(b && b.showIf), room + '：入口は物語の鍵（' + (b && b.showIf) + '）で開く建物（鍵の前は入れない＝意図どおり）');
    T(!!door, room + '：鍵を開けた状態では ' + town + ' に入口のワープがある');
    W.maps = {}; const rm = W.getMap(room); const out = rm.warps.find((q) => q.to === town);
    if (door && out) { enter(room, out.x, out.y - 1 >= 0 ? out.y - 1 : out.y); W.maps = {}; W.busy = false; W.enterMap(out.to, out.tx, out.ty, 'down'); const a = { x: W.player.x, y: W.player.y }; const R = reach(W.map, a.x, a.y); const back = W.map.warps.filter((q) => q.to === room && Object.keys(D4).some((k) => R[(q.x - D4[k][0]) + ',' + (q.y - D4[k][1])] || (q.x === a.x && q.y === a.y)));
      T(back.length > 0, room + ' → ' + town + '：着いた所から入口へ歩いて行ける'); }
  }
  if (D.rivel_castle_b1) {
    W.maps = {}; const b1 = W.getMap('rivel_castle_b1'); const out = b1.warps.find((q) => q.to === 'rivel_artisan');
    W.busy = false; W.enterMap('rivel_artisan', out.tx, out.ty, 'down'); const m = W.map; const wells = (m.events || []).filter((e) => /oldWell/.test(String(e.run || e.script || '')) || /井戸/.test(JSON.stringify(e)));
    const R = reach(m, W.player.x, W.player.y); const near = wells.filter((e) => Object.keys(D4).some((k) => R[(e.x + D4[k][0]) + ',' + (e.y + D4[k][1])]) || R[e.x + ',' + e.y]);
    T(wells.length > 0 && near.length > 0, 'rivel_castle_b1 → rivel_artisan：地下へは古井戸の出来事で入る（ワープではない＝意図どおり）。出口の先から古井戸へ歩いて行ける（' + wells.length + ' か所）');
  }
  console.log('-- 着いたマスがワープの上（と記録されていた）5 件：歩いて往復');
  const CASES = [['aruna_ruins_1', 'aruna_ruins_2'], ['time_bank', 'time_bank_vault_1'], ['no_failure_school', 'school_roof'], ['sentra_palace_1', 'sentra_palace_2'], ['school_roof', 'no_failure_school']];
  for (const [from, to] of CASES) {
    if (!D[from] || !D[to]) { T(true, from + '：この版にない'); continue; }
    W.maps = {}; const fm = W.getMap(from); const q = fm.warps.find((x) => x.to === to); if (!q) { T(false, from + '→' + to + '：ワープがない'); continue; }
    if (q.needFlag) { d.flags[q.needFlag] = true; console.log('    （' + from + ' のワープは物語の鍵 ' + q.needFlag + ' で開く。鍵を開けた状態で確かめる）'); }
    // ワープのとなりの歩けるマスに立ち、ワープへ 1 歩
    let stood = null; for (const k of Object.keys(D4)) { const sx = q.x - D4[k][0], sy = q.y - D4[k][1]; if (passAt(fm, sx, sy) && !fm.warpAt(sx, sy)) { stood = { x: sx, y: sy, k }; break; } }
    if (!stood) { T(false, from + '：ワープのとなりに立てない'); continue; }
    enter(from, stood.x, stood.y); await flush(); W.player.dir = stood.k; await step(stood.k); await flush();
    const arrived = W.map.id === to; const ax = W.player.x, ay = W.player.y; const onWarp = !!W.map.warpAt(ax, ay);
    await flush(); await flush();
    T(arrived && W.map.id === to, from + ' → ' + to + '：歩いて入ると ' + to + ' に着き' + (onWarp ? '（ワープの上）' : '') + '、そのまま止まっていても跳ね返らない');
    // 1 歩離れて、もう一度ワープへ
    const m2 = W.map; let off = null; for (const k of Object.keys(D4)) { const nx = ax + D4[k][0], ny = ay + D4[k][1]; if (passAt(m2, nx, ny) && !m2.warpAt(nx, ny)) { off = k; break; } }
    if (!off) { T(false, to + '：着いた所から動けない（' + ax + ',' + ay + '）'); continue; }
    await step(off); const back = W.map.warps.find((x) => x.to === from); const R = reach(W.map, W.player.x, W.player.y);
    let canBack = !!back; if (back) { let st2 = null; for (const k of Object.keys(D4)) { const sx = back.x - D4[k][0], sy = back.y - D4[k][1]; if ((W.player.x === sx && W.player.y === sy) || (R[sx + ',' + sy] && passAt(W.map, sx, sy) && !W.map.warpAt(sx, sy))) { st2 = { x: sx, y: sy, k }; break; } }
      if (st2) { if (W.player.x !== st2.x || W.player.y !== st2.y) await walkTo(st2.x, st2.y); if (W.map.id === to) { await step(st2.k); await flush(); } canBack = W.map.id === from; } else canBack = false; }
    T(canBack, to + ' → ' + from + '：1 歩離れてから戻るワープへ歩くと、' + from + ' へ帰れる（' + W.map.id + '）');
  }
  console.log('結果: ' + ok + ' OK / ' + ng.length + ' NG ' + JSON.stringify(ng) + '　読み込みのエラー ' + A.errors.length);
  process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
