// v8.1 砂都サハルと宿（港の宿・砂の宿）の作り直し（jsdom・2D 版の 1 歩ずつの移動で）：node sahar_test.js [2d]
// ・フィールドから南の門へ歩いて入る → 門の内側に北向きで着く。抜け道をまっすぐ北へ：広場（井戸のとなり）→ 北の抜け道 → オアシスの岸まで
// ・円い回廊は一続き（回廊のマスどうしが、回廊と抜け道だけでつながる）。抜け道は 7 本（回廊から外へ出る口）
// ・15 棟：歩いて入り、歩いて出ると扉の前。宿（港・砂）：主人に話すと泊まれる（HP が戻り、お金が減る）。2 階への階段の往復
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
  const ID = 'sahar_city'; const m = W.getMap(ID); ok(m.def.remake81 && m.w === 60 && m.h === 44, '砂都が作り直した形 ' + m.w + '×' + m.h + '（' + (two ? '2D 版' : '地球の世界') + '）');
  const gw = m.def.warps.filter((q) => q.y >= m.h - 1); const fieldId = gw[0].to; const fm = W.getMap(fieldId);
  const into = (fm.def.warps || []).filter((q) => q.to === ID); ok(into.length > 0, 'フィールド ' + fieldId + ' に砂都への入口 ' + into.length);
  if (into.length) { const e = into[0]; let st = null; for (const [dx, dy, k] of [[0, 1, 'up'], [1, 0, 'left'], [-1, 0, 'right'], [0, -1, 'down']]) { if (passAt(fm, e.x + dx, e.y + dy)) { st = [e.x + dx, e.y + dy, k]; break; } }
    W.enterMap(fieldId, st[0], st[1], st[2], { raw: true }); await flush(); await step(st[2]);
    ok(W.map.id === ID && W.player.dir === 'up' && W.player.y >= m.h - 4, 'フィールドの入口から歩いて入る → 砂都 ' + W.player.x + ',' + W.player.y + '（向き ' + W.player.dir + '）'); }
  W.enterMap(ID, 29, 41, 'up', { raw: true }); await flush(); const seen = []; let n = 0;
  while (n++ < 50) { const y0 = W.player.y; seen.push(m.tile(W.player.x, W.player.y)); await step('up'); if (W.player.y !== y0 - 1) break; }
  const well = m.tile(30, 22); const shore = [[0, -1]].some(([dx, dy]) => w.Tiles.isWater(m.tile(W.player.x + dx, W.player.y + dy)));
  ok(well === 'well' && seen.indexOf('path_stone') >= 0 && shore && W.player.y <= 9, '門から北へまっすぐ ' + n + ' 歩：井戸（' + well + '）のとなりの広場を抜け、北の抜け道でオアシスの岸へ ' + W.player.x + ',' + W.player.y + '（' + [...new Set(seen)].join('・') + '）');
  // 円い回廊：回廊のマス（中心から 6.5〜8.6）が一続きか（回廊と抜け道のマスだけで）
  const ring = []; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const dd = Math.hypot(x - 30, y - 22); if (dd >= 6.5 && dd < 8.6 && m.passable(x, y, d)) ring.push([x, y]); }
  const inRing = new Set(ring.map((p) => p.join(','))); const sn = new Set([ring[0].join(',')]); const q = [ring[0]];
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (inRing.has(k) && !sn.has(k)) { sn.add(k); q.push([x + dx, y + dy]); } } }
  ok(sn.size === ring.length, '円い回廊を一周できる（回廊のマス ' + sn.size + '/' + ring.length + '）');
  const mouths = new Set(); ring.forEach(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const t = m.tile(x + dx, y + dy); const dd = Math.hypot(x + dx - 30, y + dy - 22); if (dd >= 8.6 && t === 'road') mouths.add(Math.round(Math.atan2(y + dy - 22, x + dx - 30) * 180 / Math.PI / 15) * 15); }));
  ok(mouths.size >= 7, '回廊から外への抜け道 ' + mouths.size + ' 本（向き ' + [...mouths].sort((a, b) => a - b).join('・') + '°）');
  // 15 棟
  for (const b of m.buildings.filter((q2) => q2.interior && w.MAP_DEFS[q2.interior])) {
    W.enterMap(ID, 29, 41, 'up', { raw: true }); await flush();
    const door = w.Remake81.door(b).door; const r1 = route(W.map, W.player.x, W.player.y, b.doorFront.x, b.doorFront.y); if (!r1) { ok(false, b.id + '：扉の前へ行く道がない'); continue; }
    await walkTo(b.doorFront.x, b.doorFront.y); const toDoor = Object.keys(D4).find((k2) => b.doorFront.x + D4[k2][0] === door.x && b.doorFront.y + D4[k2][1] === door.y) || 'up';
    await step(toDoor); const inId = W.map.id; const inside = W.map; const ip = [W.player.x, W.player.y]; const ex = (inside.def.warps || []).find((q2) => q2.to === ID);
    let back = false, bp = null; if (inId === b.interior && ex) { const r2 = route(inside, ip[0], ip[1], ex.x, ex.y); if (r2) { await walkTo(ex.x, ex.y); back = W.map.id === ID; bp = [W.player.x, W.player.y]; } }
    ok(inId === b.interior && back && bp[0] === b.doorFront.x && bp[1] === b.doorFront.y, b.id + '（' + (inside.def.name || '') + '）：入る → 中 ' + ip.join(',') + ' → 出る → 扉の前 ' + (bp || []).join(','));
  }
  // 宿：主人に話して泊まる・2 階への階段の往復
  for (const [inn, town] of [['harbor_inn', 'harbor_town'], ['sahar_inn', 'sahar_city']]) {
    const im = W.getMap(inn); const kp = im.npcs.find((q2) => /_keeper$/.test(q2.id)); W.enterMap(inn, im.def.remake81 ? im.def.warps[0].x : 5, (im.def.warps[0].y || 8) - 1, 'up', { raw: true }); await flush();
    // 主人の前（となり、または帳場の台ごし）まで歩く
    const spots = [[0, 1], [0, -1], [1, 0], [-1, 0], [0, 2]].map(([dx, dy]) => [kp.x + dx, kp.y + dy]).filter(([x, y]) => passAt(W.map, x, y));
    let reached = false; for (const [x, y] of spots) { if (route(W.map, W.player.x, W.player.y, x, y)) { await walkTo(x, y); reached = W.player.x === x && W.player.y === y; break; } }
    const P = S.data.hero; const full = P.hp; P.hp = 1; const g0 = S.data.gold = 500; await w.Events.run({ type: 'script', run: async (c) => kp.talk(c) }).catch(() => {});
    ok(reached && P.hp === full && S.data.gold < g0, inn + '（' + im.def.name + '）：主人の前まで歩ける・話して泊まると HP が戻る（HP ' + P.hp + '/' + full + '・' + g0 + '→' + S.data.gold + 'G）');
    const up = im.def.warps.find((q2) => /_2f$/.test(q2.to)); W.enterMap(inn, im.def.warps[0].x, im.def.warps[0].y - 1, 'up', { raw: true }); await flush(); await walkTo(up.x, up.y); const got = W.map.id === up.to;
    if (got) { const r = W.map.def.warps.find((q2) => q2.to === inn); await walkTo(r.x, r.y); }
    ok(got && W.map.id === inn && Math.abs(W.player.x - up.x) + Math.abs(W.player.y - up.y) === 1, inn + '：2 階への階段 → ' + up.to + ' → 戻ると階段のとなり ' + W.player.x + ',' + W.player.y);
  }
  // 港の宿と砂の宿は違う間取り
  const a = W.getMap('harbor_inn'), b2 = W.getMap('sahar_inn'); const sig = (mm) => mm.w + 'x' + mm.h + ':' + ['bed', 'fountain', 'window', 'pillar', 'grass2', 'wall_wood'].map((t) => { let k = 0; for (let y = 0; y < mm.h; y++) for (let x = 0; x < mm.w; x++) if (mm.tile(x, y) === t) k++; return t + k; }).join(',');
  ok(sig(a) !== sig(b2), '港の宿と砂の宿の間取りが違う（' + sig(a) + ' ／ ' + sig(b2) + '）');
  console.log('結果：' + (ng.length ? 'NG ' + ng.length : 'すべて OK')); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
