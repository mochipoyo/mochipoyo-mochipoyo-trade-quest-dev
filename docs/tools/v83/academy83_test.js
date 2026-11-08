// v8.3 ボラティリティア学院（広げた版 2：84×60）の確かめ（jsdom・2D 版の 1 歩ずつの移動で）：node academy83_test.js [2d]
// ・v8.1 の docs/tools/v81/academy_test.js から、地図の大きさ（60×44 → 84×60）と、門から観測塔の前の広場までの歩数・行（y 32〜34 → y 34〜36）だけを変えた（差分は updated-tests/academy83.diff）
// ・フィールド（時の神殿領）から正門へ歩いて入る → 門の内側に北向きで着く。正面の道（子午線）を北へ歩くと観測塔の前の広場に出る
// ・学院の中の 10 棟：着く所から扉の前まで歩いて入り、中に着き、出口まで歩いて出ると扉の前に戻る
// ・地下実験施設の入口：解放前は守衛のマスを通らないと階段に行けない（両わきは柱）。解放後は守衛が消え、階段から 1 階へ。1 階から上ると入口の守衛より手前に着く
// ・大図書館：断片 3 つ（司書の案内の棚）と統計表（真ん中の机）。天文観測室：天球儀を調べると回る（初めては 2 行・2 回目は 1 行）、望遠鏡などを調べても少し回る
const load = require('../v78/load78.js');
const two = process.argv[2] === '2d';
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const W = w.World, S = w.State;
const msgs = []; w.Win.message = async (lines) => { msgs.push([].concat(lines || [])); }; w.Win.toast = () => { }; w.Win.choice = async () => 0;
S.newGame('t', 'warrior'); const d = S.data; ['s3121_new_prologue', 'ship_ready'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; W.start(); W.encounter = () => { };
const tick = () => { for (let i = 0; i < 600 && (W.player.moving || W.busy); i++) { W.scene.update(50); } };
const flush = async () => { let quiet = 0; for (let i = 0; i < 80; i++) { await new Promise((r) => setTimeout(r, 40)); tick(); if (!W.busy && !W.player.moving) { if (++quiet >= 9) return; } else quiet = 0; } };
const step = async (dir) => { W.busy = false; const moved = W.tryMove(dir); tick(); await flush(); return moved; };
const D4 = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const passAt = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.passable(x, y, d) && !m.npcAt(x, y) && !(m.eventAt(x, y) && m.eventAt(x, y).solid);
// 歩ける道（BFS）。goal はマス（そこへ入る＝扉・階段なども可）
function route(m, sx, sy, gx, gy) {
  const prev = {}; const q = [[sx, sy]]; prev[sx + ',' + sy] = null;
  while (q.length) { const [x, y] = q.shift(); if (x === gx && y === gy) break;
    for (const k of Object.keys(D4)) { const nx = x + D4[k][0], ny = y + D4[k][1]; const key = nx + ',' + ny; if (key in prev) continue; if (!(nx === gx && ny === gy) && (!passAt(m, nx, ny) || m.warpAt(nx, ny))) continue;   /* 出口（ワープ）のマスは通り道にしない */ if (nx === gx && ny === gy && !(m.passable(nx, ny, d) || m.warpAt && m.warpAt(nx, ny))) { /* 扉のマス */ }
      prev[key] = [x, y, k]; q.push([nx, ny]); } }
  if (!((gx + ',' + gy) in prev)) return null; const dirs = []; let c = gx + ',' + gy; while (prev[c]) { dirs.unshift(prev[c][2]); c = prev[c][0] + ',' + prev[c][1]; } return dirs;
}
async function walk(dirs) { for (const k of dirs) { const id0 = W.map.id; await step(k); if (W.map.id !== id0) return true; } return false; }
// 歩き回る人にふさがれたら、道を引き直す
async function walkTo(gx, gy) { const id0 = W.map.id; for (let n = 0; n < 200; n++) { if (W.map.id !== id0) return true; if (W.player.x === gx && W.player.y === gy) return false; const r = route(W.map, W.player.x, W.player.y, gx, gy); if (!r) { await flush(); continue; } await step(r[0]); } return false; }
(async () => {
  const ID = 'volatilia'; const m = W.getMap(ID); const reg = w.MapRemake.maps[ID];
  ok(m.def.remake81 && m.w === 84 && m.h === 60, '学院の地図が作り直した形 ' + m.w + '×' + m.h + '（' + (two ? '2D 版' : '地球の世界') + '）');
  /* ---------- フィールドから正門へ ---------- */
  const gw = m.def.warps.filter((q) => q.y === m.h - 1); const fieldId = gw[0] && gw[0].to; const fm = W.getMap(fieldId);
  const into = (fm.def.warps || []).filter((q) => q.to === ID); ok(into.length > 0, 'フィールド ' + fieldId + ' に学院への入口 ' + into.length);
  if (into.length) { const e = into[0]; let st = null; for (const [dx, dy, k] of [[0, 1, 'up'], [1, 0, 'left'], [-1, 0, 'right'], [0, -1, 'down']]) { if (passAt(fm, e.x + dx, e.y + dy)) { st = [e.x + dx, e.y + dy, k]; break; } }
    W.enterMap(fieldId, st[0], st[1], st[2], { raw: true }); await flush(); await step(st[2]);
    ok(W.map.id === ID && W.player.dir === 'up' && W.player.y >= m.h - 7, 'フィールドの入口から歩いて入る → 学院 ' + W.player.x + ',' + W.player.y + '（向き ' + W.player.dir + '）');
    // 正面の子午線を北へ：観測塔の前の広場（y 34〜36）まで、門・アーチの下をまっすぐ
    let sx = W.player.x, ok2 = true; for (let i = 0; i < 24 && W.player.y > 36; i++) { const y0 = W.player.y; await step('up'); if (W.player.y !== y0 - 1) { ok2 = false; break; } }
    ok(ok2 && W.player.y <= 36 && W.player.x === sx, '門からまっすぐ北へ歩いて、アーチの下を通り観測塔の前の広場へ（' + W.player.x + ',' + W.player.y + '・タイル ' + m.tile(W.player.x, W.player.y) + '）');
    msgs.length = 0;
  }
  /* ---------- 10 棟：歩いて入り、歩いて出る ---------- */
  const arrive = m.def.remake81.arrive || [29, 41];
  for (const b of m.buildings.filter((q) => q.interior && w.MAP_DEFS[q.interior])) {
    W.enterMap(ID, arrive[0], arrive[1], 'up', { raw: true }); await flush();
    const door = w.Remake81.door(b).door;
    const r1 = route(W.map, W.player.x, W.player.y, b.doorFront.x, b.doorFront.y); if (!r1) { ok(false, b.id + '：扉の前へ行く道がない'); continue; }
    await walkTo(b.doorFront.x, b.doorFront.y); const toDoor = Object.keys(D4).find((k) => b.doorFront.x + D4[k][0] === door.x && b.doorFront.y + D4[k][1] === door.y) || 'up';
    await step(toDoor); const inId = W.map.id; const inside = W.map; const ip = [W.player.x, W.player.y];
    const ex = (inside.def.warps || []).find((q) => q.to === ID);
    let back = false, bp = null; if (inId === b.interior && ex) { const r2 = route(inside, ip[0], ip[1], ex.x, ex.y); if (r2) { await walkTo(ex.x, ex.y); back = W.map.id === ID; bp = [W.player.x, W.player.y]; } }
    ok(inId === b.interior && back && bp[0] === b.doorFront.x && bp[1] === b.doorFront.y, b.id + '（' + (inside.def.name || '') + '）：扉の前から入る → 中 ' + ip.join(',') + ' → 出口まで歩いて出る → 扉の前 ' + (bp || []).join(','));
  }
  /* ---------- 地下実験施設の入口：解放前後 ---------- */
  delete d.flags.vol_under_open; W.enterMap('vol_under_gate', 6, 7, 'up', { raw: true }); await flush(); let g = W.map; const stairs = g.def.warps.find((q) => q.to === 'vol_under_1');
  ok(!!g.npcAt(stairs.x, stairs.y + 1) && !route(g, 6, 7, stairs.x, stairs.y), '解放前：階段 ' + stairs.x + ',' + stairs.y + ' の前に守衛。ほかのマスからは階段に行けない（両わき ' + g.tile(stairs.x - 1, stairs.y) + '・' + g.tile(stairs.x + 1, stairs.y) + '）');
  W.player.x = stairs.x - 1; W.player.y = stairs.y + 1; W.player.dir = 'up'; await step('up'); ok(W.map.id === 'vol_under_gate' && W.player.y === stairs.y + 1, '解放前：守衛のとなりから上へ歩いても階段の列に入れない');
  d.flags.vol_under_open = true; W.enterMap('vol_under_gate', 6, 7, 'up', { raw: true }); await flush(); g = W.map;
  const r3 = route(g, 6, 7, stairs.x, stairs.y); ok(!g.npcAt(stairs.x, stairs.y + 1) && !!r3, '解放後：守衛がいなくなり、階段まで歩ける');
  if (r3) await walk(r3); ok(W.map.id === 'vol_under_1', '解放後：階段から地下 1 階へ（' + W.map.id + ' ' + W.player.x + ',' + W.player.y + '）');
  const up = (W.map.def.warps || []).find((q) => q.to === 'vol_under_gate'); if (up) { const r4 = route(W.map, W.player.x, W.player.y, up.x, up.y); if (r4) await walk(r4); }
  ok(W.map.id === 'vol_under_gate' && W.player.y > stairs.y && !!route(W.map, W.player.x, W.player.y, 6, 8), '地下 1 階から上る → 入口 ' + W.player.x + ',' + W.player.y + '（出口へ歩ける）');
  /* ---------- 大図書館：断片と統計表 ---------- */
  W.enterMap('vol_library', 11, 13, 'up', { raw: true }); await flush(); const lb = W.map;
  d.quests.academy_ancient = { state: 'active' }; if (w.Events.ctx) { /* ok */ } d.flags.acad_a_show = true;
  const runAt = async (mm, x, y) => { const e = mm.eventAt(x, y); if (!e) return 'NO EVENT'; msgs.length = 0; await w.Events.run(e); return msgs.map((q) => q.join('／')).join('｜'); };
  const isQ = S.data.quests && S.data.quests.academy_ancient; void isQ;
  const t1 = await runAt(lb, 4, 3), t2 = await runAt(lb, 16, 3), t3 = await runAt(lb, 19, 1);
  ok(d.flags.acad_frag_1 && d.flags.acad_frag_2 && d.flags.acad_frag_3 && d.flags.acad_a_frag, '大図書館：左の低い棚 4,3・右の奥の棚 16,3・一番奥の棚の右端 19,1 から断片 3 つ（' + [t1, t2, t3].map((s) => s.slice(0, 18)).join(' / ') + '）');
  const t4 = await runAt(lb, 10, 7); ok(/統計|曜日/.test(t4), '大図書館：真ん中の机 10,7 で曜日別の統計表 「' + t4.slice(0, 40) + '」');
  ok(['4,3', '16,3', '19,1', '10,7'].every((k) => { const [x, y] = k.split(',').map(Number); return !!route(lb, 11, 13, x, y) || Object.keys(D4).some((q) => route(lb, 11, 13, x + D4[q][0], y + D4[q][1])); }), '大図書館：断片の棚と真ん中の机に、入口から歩いて行ける（となりのマスまで）');
  /* ---------- 天文観測室：天球儀 ---------- */
  W.enterMap('vol_observatory', 9, 13, 'up', { raw: true }); await flush(); const ob = W.map; delete d.flags.v81_armillary; w.Remake81Fx = null;
  const now = () => (w.performance ? w.performance.now() : Date.now());
  const a1 = await runAt(ob, 9, 7); const sp1 = w.Remake81Fx && w.Remake81Fx.spinUntil - now();
  ok(d.flags.v81_armillary && sp1 > 4000 && msgs[0] && msgs[0].length === 2, '天球儀を調べる → 回る（あと ' + Math.round(sp1) + 'ms）・初めては 2 行「' + a1.slice(0, 30) + '」');
  const a2 = await runAt(ob, 9, 7); ok(msgs[0] && msgs[0].length === 1, '2 回目は 1 行で待たせない「' + a2 + '」');
  w.Remake81Fx = null; await runAt(ob, 9, 2); ok(w.Remake81Fx && w.Remake81Fx.spinUntil - now() > 1000, '望遠鏡（観測記録）を調べても天球儀が少し回る');
  ok(!!route(ob, 9, 13, 9, 8) && !!route(ob, 9, 13, 9, 3), '天球儀の前・望遠鏡の前へ入口から歩ける');
  console.log('結果：' + (ng.length ? 'NG ' + ng.length : 'すべて OK')); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
