// v8.1 リヴェル城下町・リヴェル城の作り直し（jsdom・2D 版の 1 歩ずつの移動で）：node rivel_test.js [2d]
// ・フィールドから南の楼門へ歩いて入る → 門の内側に北向きで着く。王道をまっすぐ北へ歩くと、内門・城の前庭・跳ね橋を通って城の扉に入る
// ・城の中：門から北へまっすぐ歩くと、検問 → 中庭 → 謁見の間の王の前まで。西の階段から 2 階（→ 戻ると階段の前）、東の階段から地下（→ 戻ると階段の前）
// ・町の 20 棟：着く所から扉の前まで歩いて入り、中に着き、出口まで歩いて出ると扉の前に戻る（城を含む）
// ・東門：小路を東へ歩くと職人通りへ。職人通りから西へ歩くと町の東門の内側に着く
// ・商店通りは王道から門の少し北で分かれる（王道と別の道）。城の前庭へは内門と通用門の 2 か所だけ（内郭の壁）
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
  const ID = 'rivel_town'; const m = W.getMap(ID); const arrive = m.def.remake81 && [35, 56];
  ok(m.def.remake81 && m.w === 72 && m.h === 60, '城下町が作り直した形 ' + m.w + '×' + m.h + '（' + (two ? '2D 版' : '地球の世界') + '）');
  /* ---------- フィールドから南の楼門 → 王道 → 城 ---------- */
  const gw = m.def.warps.filter((q) => q.y >= m.h - 2); const fieldId = gw[0] && gw[0].to; const fm = W.getMap(fieldId);
  const into = (fm.def.warps || []).filter((q) => q.to === ID); ok(into.length > 0, 'フィールド ' + fieldId + ' に城下町への入口 ' + into.length);
  if (into.length) { const e = into[0]; let st = null; for (const [dx, dy, k] of [[0, 1, 'up'], [1, 0, 'left'], [-1, 0, 'right'], [0, -1, 'down']]) { if (passAt(fm, e.x + dx, e.y + dy)) { st = [e.x + dx, e.y + dy, k]; break; } }
    W.enterMap(fieldId, st[0], st[1], st[2], { raw: true }); await flush(); await step(st[2]);
    ok(W.map.id === ID && W.player.dir === 'up' && W.player.y >= m.h - 5, 'フィールドの入口から歩いて入る → 城下町 ' + W.player.x + ',' + W.player.y + '（向き ' + W.player.dir + '）'); }
  W.enterMap(ID, 35, 56, 'up', { raw: true }); await flush();
  const seen = []; let n = 0; while (W.map.id === ID && n++ < 60) { const y0 = W.player.y; seen.push(m.tile(W.player.x, W.player.y)); await step('up'); if (W.map.id === ID && W.player.y !== y0 - 1) break; }
  ok(W.map.id === 'rivel_castle', '南の門の内側から王道をまっすぐ北へ ' + n + ' 歩 → 内門・前庭・跳ね橋を通って城の中へ（' + W.map.id + ' ' + W.player.x + ',' + W.player.y + '）');
  ok(seen.indexOf('bridge') >= 0, '途中で跳ね橋を渡る（' + [...new Set(seen)].join('・') + '）');
  /* ---------- 城：検問 → 中庭 → 謁見の間 ---------- */
  const cm = W.map; const kg = cm.npcs.find((q) => q.id === 'king'); let k = 0;
  while (W.map.id === 'rivel_castle' && k++ < 40) { const y0 = W.player.y; await step('up'); if (W.player.y !== y0 - 1) break; }
  const zones = [cm.tile(16, 26), cm.tile(16, 18), cm.tile(16, 8)];
  ok(W.map.id === 'rivel_castle' && W.player.x === kg.x && W.player.y === kg.y + 1, '城の門から北へまっすぐ ' + k + ' 歩で王の前（' + W.player.x + ',' + W.player.y + '・王 ' + kg.x + ',' + kg.y + '）。通る床：検問 ' + zones[0] + '・中庭 ' + zones[1] + '・謁見の間 ' + zones[2]);
  // 王の両わきの近衛兵、検問の案内係
  ok(['castle_guard_l', 'castle_guard_r'].every((id) => { const g = cm.npcs.find((q) => q.id === id); return g && Math.abs(g.y - kg.y) <= 1 && Math.abs(g.x - kg.x) <= 4; }) && cm.npcs.find((q) => q.id === 'castle_steward').y >= 23, '近衛兵は玉座の両わき・案内係は検問');
  // 階段：西＝2 階、東＝地下。戻ると階段の前
  for (const [to, sx, sy] of [['rivel_castle_2f', 3, 1], ['rivel_castle_b1', 30, 1]]) {
    W.enterMap('rivel_castle', 16, 30, 'up', { raw: true }); await flush(); await walkTo(sx, sy);
    const went = W.map.id === to; const om = W.map; const back = (om.def.warps || []).find((q) => q.to === 'rivel_castle' && Math.abs(q.ty - 24) <= 1) || (om.def.warps || []).find((q) => q.to === 'rivel_castle');
    if (went && back) await walkTo(back.x, back.y);
    ok(went && W.map.id === 'rivel_castle' && Math.abs(W.player.x - sx) + Math.abs(W.player.y - sy) === 1, (sx < 16 ? '西' : '東') + 'の階段 ' + sx + ',' + sy + ' → ' + to + ' → 戻ると ' + W.player.x + ',' + W.player.y + '（階段のとなり）');
  }
  // 2 階の先：王立図書室・3 階・屋上（階段の往復）
  const chain = [['rivel_castle_2f', 'rivel_castle_library'], ['rivel_castle_2f', 'rivel_castle_3f'], ['rivel_castle_3f', 'rivel_castle_4f']];
  for (const [a, b2] of chain) {
    const wa = W.getMap(a); const up = wa.def.warps.find((q) => q.to === b2); const arr = (W.getMap(b2).def.warps || []).find((q) => q.to === a);
    const p = w.MapRemake.pos(a, arr.tx, arr.ty); W.enterMap(a, p.x, p.y, 'up', { raw: true }); await flush(); await walkTo(up.x, up.y); const got = W.map.id === b2;
    if (got) { const r = (W.map.def.warps || []).find((q) => q.to === a); await walkTo(r.x, r.y); }
    ok(got && W.map.id === a, a + ' → ' + b2 + ' → ' + a + '（階段の往復）');
  }
  /* ---------- 町の 20 棟：歩いて入り、歩いて出る ---------- */
  for (const b of m.buildings.filter((q) => q.interior && w.MAP_DEFS[q.interior])) {
    W.enterMap(ID, 35, 56, 'up', { raw: true }); await flush();
    const door = w.Remake81.door(b).door;
    const r1 = route(W.map, W.player.x, W.player.y, b.doorFront.x, b.doorFront.y); if (!r1) { ok(false, b.id + '：扉の前へ行く道がない'); continue; }
    await walkTo(b.doorFront.x, b.doorFront.y); const toDoor = Object.keys(D4).find((k2) => b.doorFront.x + D4[k2][0] === door.x && b.doorFront.y + D4[k2][1] === door.y) || 'up';
    await step(toDoor); const inId = W.map.id; const inside = W.map; const ip = [W.player.x, W.player.y];
    const ex = (inside.def.warps || []).find((q) => q.to === ID);
    let back = false, bp = null; if (inId === b.interior && ex) { const r2 = route(inside, ip[0], ip[1], ex.x, ex.y); if (r2) { await walkTo(ex.x, ex.y); back = W.map.id === ID; bp = [W.player.x, W.player.y]; } }
    ok(inId === b.interior && back && bp[0] === b.doorFront.x && bp[1] === b.doorFront.y, b.id + '（' + (inside.def.name || '') + '）：扉の前から入る → 中 ' + ip.join(',') + ' → 歩いて出る → 扉の前 ' + (bp || []).join(','));
  }
  /* ---------- 東門 ⇄ 職人通り ---------- */
  W.enterMap(ID, 35, 40, 'right', { raw: true }); await flush(); let t = 0; while (W.map.id === ID && t++ < 50) await step('right');
  const am = W.map; ok(am.id === 'rivel_artisan', '小路を東へ歩く → 東門から職人通りへ（' + am.id + ' ' + W.player.x + ',' + W.player.y + '）');
  if (am.id === 'rivel_artisan') { let u = 0; while (W.map.id === 'rivel_artisan' && u++ < 10) await step('left'); ok(W.map.id === ID && W.player.x >= m.w - 4 && W.player.y >= 38 && W.player.y <= 41 && W.player.dir === 'left', '職人通りから西へ → 町の東門の内側 ' + W.player.x + ',' + W.player.y + '（向き ' + W.player.dir + '）');
    const y1 = W.player.y; await step('left'); ok(W.map.id === ID && W.player.y === y1, 'そのまま西へ歩いても出戻りしない'); }
  /* ---------- 商店通りの分かれ・内郭の壁 ---------- */
  const shop = m.tile(20, 50), road = m.tile(35, 50); ok(shop !== road && m.tile(33, 50) === shop, '商店通り（' + shop + '）は門から少し北で王道（' + road + '）から西へ分かれる');
  const gaps = []; for (let x = 2; x < m.w - 2; x++) if (m.passable(x, 26, d)) gaps.push(x); ok(JSON.stringify(gaps) === JSON.stringify([34, 35, 36, 37, 59, 60, 61]), '内郭の壁の通り口は内門（34〜37）と通用門（59〜61）だけ ' + JSON.stringify(gaps));
  console.log('結果：' + (ng.length ? 'NG ' + ng.length : 'すべて OK')); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
