// v8.1 港町マリナの作り直し（jsdom・2D 版の 1 歩ずつの移動で）：node marina_test.js [2d]
// ・北の街道（フィールド）から入る → 高台。街道をまっすぐ南へ：坂で段 1 → 段 0 の埠頭へ下り、長い桟橋の先まで（桟橋の先からは外へ出ない）
// ・西・東の階段でも高台と埠頭を行き来できる。11 棟：歩いて入り、歩いて出ると扉の前
// ・西の浜の端 → 船着き場（自分の船の泊まる所）。北・東・西の陸の外周から外へ。陸の出口と船着き場の行き先が別
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
  const ID = 'harbor_town'; const m = W.getMap(ID); const T76 = w.Terrace76;
  ok(m.def.remake81 && m.w === 76 && m.h === 40 && T76.has(m) && !T76.validate(m).length, '港町が作り直した形 ' + m.w + '×' + m.h + '・段の決まり OK（' + (two ? '2D 版' : '地球の世界') + '）');
  const gw = m.def.warps.filter((q) => q.y <= 1); const fieldId = gw[0].to; const fm = W.getMap(fieldId);
  const into = (fm.def.warps || []).filter((q) => q.to === ID); ok(into.length > 0, 'フィールド ' + fieldId + ' に港町への入口 ' + into.length);
  if (into.length) { const e = into[0]; let st = null; for (const [dx, dy, k] of [[0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right'], [0, 1, 'up']]) { if (passAt(fm, e.x + dx, e.y + dy)) { st = [e.x + dx, e.y + dy, k]; break; } }
    W.enterMap(fieldId, st[0], st[1], st[2], { raw: true }); await flush(); await step(st[2]);
    ok(W.map.id === ID && W.player.y <= 3, 'フィールドの入口から歩いて入る → 港町 ' + W.player.x + ',' + W.player.y + '（向き ' + W.player.dir + '）'); }
  // 街道をまっすぐ南へ：坂 → 埠頭 → 桟橋の先
  W.enterMap(ID, 37, 2, 'down', { raw: true }); await flush(); const lv = []; let n = 0;
  while (n++ < 60) { const y0 = W.player.y; lv.push(T76.levelAt(m, W.player.x, W.player.y) + ':' + m.tile(W.player.x, W.player.y)); await step('down'); if (W.map.id !== ID || W.player.y !== y0 + 1) break; }
  const ls = [...new Set(lv)]; ok(W.map.id === ID && W.player.y >= 33 && ls.some((s) => /^1:/.test(s)) && ls.some((s) => /ramp/.test(s)) && ls.some((s) => /^0:dock/.test(s)), '北の街道から南へまっすぐ ' + n + ' 歩：高台（段 1）→ 坂 → 埠頭（段 0）→ 桟橋の先 ' + W.player.x + ',' + W.player.y + '（' + ls.join('・') + '）');
  const y1 = W.player.y; await step('down'); ok(W.map.id === ID && W.player.y === y1, '桟橋の先からは海へ出ない（' + W.map.id + ' ' + W.player.x + ',' + W.player.y + '）');
  // 西・東の階段
  for (const sx of [12, 43]) { W.enterMap(ID, sx, 10, 'down', { raw: true }); await flush(); let k = 0; while (k++ < 10) { const y0 = W.player.y; await step('down'); if (W.player.y !== y0 + 1) break; }
    ok(W.player.y >= 18 && T76.levelAt(m, W.player.x, W.player.y) === 0, (sx < 30 ? '西' : '東') + 'の階段：高い生活道から下りて埠頭へ ' + W.player.x + ',' + W.player.y); }
  // 11 棟
  for (const b of m.buildings.filter((q) => q.interior && w.MAP_DEFS[q.interior])) {
    W.enterMap(ID, 37, 2, 'down', { raw: true }); await flush();
    const door = w.Remake81.door(b).door; const r1 = route(W.map, W.player.x, W.player.y, b.doorFront.x, b.doorFront.y); if (!r1) { ok(false, b.id + '：扉の前へ行く道がない'); continue; }
    await walkTo(b.doorFront.x, b.doorFront.y); const toDoor = Object.keys(D4).find((k2) => b.doorFront.x + D4[k2][0] === door.x && b.doorFront.y + D4[k2][1] === door.y) || 'up';
    await step(toDoor); const inId = W.map.id; const inside = W.map; const ip = [W.player.x, W.player.y]; const ex = (inside.def.warps || []).find((q) => q.to === ID);
    let back = false, bp = null; if (inId === b.interior && ex) { const r2 = route(inside, ip[0], ip[1], ex.x, ex.y); if (r2) { await walkTo(ex.x, ex.y); back = W.map.id === ID; bp = [W.player.x, W.player.y]; } }
    ok(inId === b.interior && back && bp[0] === b.doorFront.x && bp[1] === b.doorFront.y, b.id + '（' + (inside.def.name || '') + '）：入る → 中 ' + ip.join(',') + ' → 出る → 扉の前 ' + (bp || []).join(','));
  }
  // 西の浜の端 → 船着き場
  W.enterMap(ID, 3, 25, 'left', { raw: true }); await flush(); let s = 0; while (W.map.id === ID && s++ < 6) await step('left');
  const hb = w.Harbors && w.Harbors.get('marina'); const pb = [W.map.id, W.player.x, W.player.y];
  const nearSea = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => w.Tiles.isWater(W.map.tile(W.player.x + dx, W.player.y + dy)));
  ok(W.map.id !== ID && nearSea, '西の浜の端から → 船着き場 ' + pb.join(',') + '（となりが海' + (hb ? '・港の登録 ' + hb.map + ' ' + hb.land.x + ',' + hb.land.y : '') + '）');
  // 陸の出口（北の街道・北の外周・東・西の高台）と、その行き先
  const outs = [];
  for (const [x, y, dir] of [[37, 1, 'up'], [10, 0, 'up'], [60, 0, 'up'], [0, 6, 'left'], [75, 6, 'right'], [75, 22, 'right']]) {
    W.enterMap(ID, x, y, dir, { raw: true }); await flush(); await step(dir); outs.push([x + ',' + y + dir, W.map.id, W.player.x, W.player.y]); }
  ok(outs.every((o) => o[1] !== ID), '陸の外周から外へ：' + outs.map((o) => o[0] + '→' + o[1] + ' ' + o[2] + ',' + o[3]).join(' / '));
  ok(outs.every((o) => o[2] !== pb[1] || o[3] !== pb[2]), '陸の出口と船着き場は別の所に出る');
  console.log('結果：' + (ng.length ? 'NG ' + ng.length : 'すべて OK')); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
