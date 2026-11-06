// v8.1 作り直した町の歩く確かめ（汎用・jsdom・2D 版の 1 歩ずつの移動で）：node town81_test.js id,id,... [2d] [flag=値,...]
// ・フィールドから歩いて入る → 町の中（歩けるマス）に着く
// ・建物（中の地図がある物）：着く所から扉の前まで歩いて入り、中で着いた所が出口の上でなく、出口まで歩いて出ると扉の前に戻る
// ・建物以外のワープ（エレベーター・地下・ほかの地図へ）：歩いて乗る → 行き先の地図に着き、そこから戻るワープで戻ると、乗った所のそばに着く（ask は「はい」）
// ・町の出口（フィールドへ）：歩いて出る → フィールドに出て、振り返ると町に戻る
const load = require('../v78/load78.js');
const two = process.argv[3] === '2d'; const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const W = w.World, S = w.State;
w.Win.message = async () => { }; w.Win.toast = () => { }; w.Win.choice = async () => 0; if (w.Win.confirm) w.Win.confirm = async () => true; if (w.Win.ask) w.Win.ask = async () => true;
S.newGame('t', 'warrior'); const d = S.data; ['s3121_new_prologue', 'ship_ready'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done';
(process.argv[4] || '').split(',').filter(Boolean).forEach((kv) => { const [k, v] = kv.split('='); d.flags[k] = v === undefined ? true : v === 'true' ? true : v; });
W.start(); W.encounter = () => { };
const L = require('./walk81.js')(w, d); const { flush, step, D4, passAt, route, walkTo } = L;
const isField = (id) => { const t = w.MAP_DEFS[id]; return !!(t && (t.region || t.kind === 'field')); };
(async () => {
  for (const ID of process.argv[2].split(',')) {
    W.maps = {}; const m = W.getMap(ID); const def = m.def; const arr = (def.remake81 && def.remake81.arrive) || [m.w >> 1, m.h - 3];
    ok(!!def.remake81, ID + '（' + def.name + '）：作り直した地図 ' + m.w + '×' + m.h + '（' + (two ? '2D 版' : '地球の世界') + '）');
    // フィールドから入る
    let fieldIn = null; for (const k of Object.keys(w.MAP_DEFS)) { if (!isField(k)) continue; const q = (w.MAP_DEFS[k].warps || []).find((z) => z.to === ID); if (q) { fieldIn = [k, q]; break; } }
    if (fieldIn) { const fm = W.getMap(fieldIn[0]); const e = fieldIn[1]; let st = null; for (const [dx, dy, k] of [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']]) { if (passAt(fm, e.x + dx, e.y + dy) && !fm.warpAt(e.x + dx, e.y + dy)) { st = [e.x + dx, e.y + dy, k]; break; } }
      if (st) { W.enterMap(fieldIn[0], st[0], st[1], st[2], { raw: true }); await flush(); await step(st[2]); }
      ok(W.map.id === ID && m.passable(W.player.x, W.player.y, d) && !m.warpAt(W.player.x, W.player.y), ID + '：フィールド（' + fieldIn[0] + '）から歩いて入る → ' + W.map.id + ' ' + W.player.x + ',' + W.player.y); }
    // 建物
    const locked = (b) => { const e = m.eventAt(b.doorFront.x, b.doorFront.y); return !!(e && e.type === 'locked'); };
    m.buildings.filter((q) => q.interior && locked(q)).forEach((b) => console.log('    （' + ID + '／' + b.id + ' は閉じた門：物語で入る建物なので歩いては入らない）'));
    for (const b of m.buildings.filter((q) => q.interior && w.MAP_DEFS[q.interior] && !locked(q))) {
      W.enterMap(ID, arr[0], arr[1], 'up', { raw: true }); await flush();
      const door = w.Remake81.door(b).door; if (!route(W.map, W.player.x, W.player.y, b.doorFront.x, b.doorFront.y)) { ok(false, ID + '／' + b.id + '：扉の前へ行く道がない'); continue; }
      await walkTo(b.doorFront.x, b.doorFront.y); const toDoor = Object.keys(D4).find((k2) => b.doorFront.x + D4[k2][0] === door.x && b.doorFront.y + D4[k2][1] === door.y) || 'up';
      await step(toDoor); const inId = W.map.id; const inside = W.map; const ip = [W.player.x, W.player.y]; const onExit = !!inside.warpAt(ip[0], ip[1]);
      const ex = (inside.def.warps || []).find((q) => q.to === ID); let back = false, bp = null;
      if (inId === b.interior && ex) { if (route(inside, ip[0], ip[1], ex.x, ex.y)) { await walkTo(ex.x, ex.y); back = W.map.id === ID; bp = [W.player.x, W.player.y]; } }
      ok(inId === b.interior && !onExit && back && bp[0] === b.doorFront.x && bp[1] === b.doorFront.y, ID + '／' + b.id + '（' + (inside.def.name || '') + '）：入る → 中 ' + ip.join(',') + (onExit ? '（出口の上）' : '') + ' → 出る → 扉の前 ' + (bp || []).join(','));
    }
    // 建物以外のワープ（フィールド以外）
    const bdoor = new Set(m.buildings.filter((b) => b.interior).map((b) => b.doorAbs && b.doorAbs.x + ',' + b.doorAbs.y));
    const parent = (to) => (w.MAP_DEFS[to] && (w.MAP_DEFS[to].buildings || []).some((b) => b.interior === ID));   /* 建物の中から外の町へ戻る出口は、町の側の確かめ（建物の出入り）で見る */
    const others = (m.warps || []).filter((q) => !isField(q.to) && !bdoor.has(q.x + ',' + q.y) && !parent(q.to)); const seenTo = new Set();
    for (const q of others) { if (seenTo.has(q.to)) continue; seenTo.add(q.to); if (q.needFlag && !d.flags[q.needFlag]) { console.log('    （' + ID + ' → ' + q.to + ' は条件 ' + q.needFlag + '：調べない）'); continue; }
      W.enterMap(ID, arr[0], arr[1], 'up', { raw: true }); await flush(); if (!route(W.map, W.player.x, W.player.y, q.x, q.y)) { ok(false, ID + '：' + (q.name || q.to) + '（' + q.x + ',' + q.y + '）へ歩いて行けない'); continue; }
      await walkTo(q.x, q.y); for (let i = 0; i < 40 && W.busy; i++) await flush(); const got = W.map.id === q.to; const om = W.map; const gp = [W.player.x, W.player.y];
      const bk = (om.def.warps || []).filter((z) => z.to === ID).sort((a, b) => (Math.abs(a.x - gp[0]) + Math.abs(a.y - gp[1])) - (Math.abs(b.x - gp[0]) + Math.abs(b.y - gp[1])))[0];
      if (got && bk) { await walkTo(bk.x, bk.y); for (let i = 0; i < 40 && W.busy; i++) await flush(); }
      const near = W.map.id === ID && Math.abs(W.player.x - q.x) + Math.abs(W.player.y - q.y) <= 2;
      ok(got && near, ID + '：' + (q.name || q.to) + '（' + q.x + ',' + q.y + '）に乗る → ' + om.id + ' ' + gp.join(',') + ' → 戻る → ' + W.map.id + ' ' + W.player.x + ',' + W.player.y); }
    // 町の出口（フィールドへ）
    const outs = (m.warps || []).filter((q) => isField(q.to)); const groups = []; outs.forEach((q) => { if (!groups.some((g) => Math.abs(g.x - q.x) + Math.abs(g.y - q.y) <= 2)) groups.push(q); });
    for (const q of groups) { let st = null; for (const [dx, dy, k] of [[0, -1, 'down'], [0, 1, 'up'], [-1, 0, 'right'], [1, 0, 'left']]) { if (passAt(m, q.x + dx, q.y + dy) && !m.warpAt(q.x + dx, q.y + dy)) { st = [q.x + dx, q.y + dy, k]; break; } }
      if (!st) { ok(false, ID + '：出口 ' + q.x + ',' + q.y + ' のとなりに立てる所がない'); continue; }
      W.enterMap(ID, st[0], st[1], st[2], { raw: true }); await flush(); await step(st[2]); const fo = [W.map.id, W.player.x, W.player.y];
      const back = { up: 'down', down: 'up', left: 'right', right: 'left' }[st[2]]; await step(back); if (W.map.id !== ID) await step(back);
      ok(fo[0] !== ID && isField(fo[0]) && W.map.id === ID, ID + '：出口 ' + q.x + ',' + q.y + ' → ' + fo.join(',') + ' → 振り返って戻る → ' + W.map.id + ' ' + W.player.x + ',' + W.player.y); }
  }
  console.log('結果：' + (ng.length ? 'NG ' + ng.length : 'すべて OK')); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
