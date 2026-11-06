// v8.1 灰鉱町ヴェルムと坑夫の宿の作り直し（jsdom・2D 版の 1 歩ずつの移動で）：node verum_test.js [2d]
// ・フィールドから入る → 南の門の内側。真ん中の坂道をまっすぐ北へ：段 0 → 坂 → 段 1 → 坂 → 段 2 → 北の門から外へ
// ・左右の階段でも段を行き来できる。12 棟（解放のあとの学び舎を含む）：歩いて入り、歩いて出ると扉の前。宿舎から地下の集会所へ
// ・坑夫の宿：主人に話して泊まれる・2 階の往復。港の宿・砂の宿・坑夫の宿は、それぞれ違う間取り
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
  const ID = 'verum_town'; const m = W.getMap(ID); const T76 = w.Terrace76;
  ok(m.def.remake81 && m.w === 64 && m.h === 40 && T76.has(m) && !T76.validate(m).length, 'ヴェルムが作り直した形 ' + m.w + '×' + m.h + '・段の決まり OK（' + (two ? '2D 版' : '地球の世界') + '）');
  const fieldId = m.def.warps[0].to; const fm = W.getMap(fieldId); const into = (fm.def.warps || []).filter((q) => q.to === ID);
  if (into.length) { const e = into[0]; let st = null; for (const [dx, dy, k] of [[0, 1, 'up'], [1, 0, 'left'], [-1, 0, 'right'], [0, -1, 'down']]) { if (passAt(fm, e.x + dx, e.y + dy)) { st = [e.x + dx, e.y + dy, k]; break; } }
    W.enterMap(fieldId, st[0], st[1], st[2], { raw: true }); await flush(); await step(st[2]); ok(W.map.id === ID && W.player.y >= m.h - 4, 'フィールドの入口から歩いて入る → ヴェルム ' + W.player.x + ',' + W.player.y); }
  W.enterMap(ID, 31, 37, 'up', { raw: true }); await flush(); const lv = []; let n = 0;
  while (n++ < 50 && W.map.id === ID) { lv.push(T76.levelAt(m, W.player.x, W.player.y)); await step('up'); }
  const ls = [...new Set(lv)].join('→'); ok(W.map.id !== ID && ls === '0→1→2', '南の門から坂道をまっすぐ北へ ' + n + ' 歩：段 ' + ls + ' → 北の門から ' + W.map.id + ' ' + W.player.x + ',' + W.player.y);
  for (const [sx, sy, label] of [[13, 10, '上の段の西の階段'], [54, 10, '上の段の東の階段'], [13, 20, '中の段の西の階段'], [49, 20, '中の段の東の階段']]) {
    W.enterMap(ID, sx, sy, 'down', { raw: true }); await flush(); const l0 = T76.levelAt(m, sx, sy); let k = 0; while (k++ < 9) { const y0 = W.player.y; await step('down'); if (W.player.y !== y0 + 1) break; }
    ok(T76.levelAt(m, W.player.x, W.player.y) === l0 - 1, label + '：段 ' + l0 + ' → ' + T76.levelAt(m, W.player.x, W.player.y) + '（' + W.player.x + ',' + W.player.y + '）'); }
  d.flags.verum_liberated = true; W.maps = {}; const m2 = W.getMap(ID);
  for (const b of m2.buildings.filter((q) => q.interior && w.MAP_DEFS[q.interior])) {
    W.enterMap(ID, 31, 37, 'up', { raw: true }); await flush();
    const door = w.Remake81.door(b).door; const r1 = route(W.map, W.player.x, W.player.y, b.doorFront.x, b.doorFront.y); if (!r1) { ok(false, b.id + '：扉の前へ行く道がない'); continue; }
    await walkTo(b.doorFront.x, b.doorFront.y); const toDoor = Object.keys(D4).find((k2) => b.doorFront.x + D4[k2][0] === door.x && b.doorFront.y + D4[k2][1] === door.y) || 'up';
    await step(toDoor); const inId = W.map.id; const inside = W.map; const ip = [W.player.x, W.player.y]; const ex = (inside.def.warps || []).find((q) => q.to === ID);
    let back = false, bp = null; if (inId === b.interior && ex) { const r2 = route(inside, ip[0], ip[1], ex.x, ex.y); if (r2) { await walkTo(ex.x, ex.y); back = W.map.id === ID; bp = [W.player.x, W.player.y]; } }
    ok(inId === b.interior && back && bp[0] === b.doorFront.x && bp[1] === b.doorFront.y, b.id + '（' + (inside.def.name || '') + '）：入る → 中 ' + ip.join(',') + ' → 出る → 扉の前 ' + (bp || []).join(','));
  }
  // 宿舎 → 地下の集会所（宿舎の中のワープ。条件があればその条件のまま）
  const dm = W.getMap('verum_dorm'); const hw = (dm.def.warps || []).find((q) => q.to === 'verum_hideout'); ok(!!hw, '労働者の宿舎の中に地下の集会所への道 ' + (hw ? hw.x + ',' + hw.y + (hw.needFlag ? '（条件 ' + hw.needFlag + '）' : '') : 'なし'));
  // 坑夫の宿
  const im = W.getMap('verum_inn'); const kp = im.npcs.find((q) => /_keeper$/.test(q.id)); W.enterMap('verum_inn', 9, 10, 'up', { raw: true }); await flush();
  await walkTo(kp.x, kp.y + 2); const P = S.data.hero; const full = P.hp; P.hp = 1; const g0 = S.data.gold = 500; await w.Events.run({ type: 'script', run: async (c) => kp.talk(c) }).catch(() => {});
  ok(W.player.x === kp.x && W.player.y === kp.y + 2 && P.hp === full && S.data.gold < g0, '坑夫の宿：帳場の前まで歩ける・主人に話して泊まると HP が戻る（' + P.hp + '/' + full + '・' + g0 + '→' + S.data.gold + 'G）');
  const sig = (mm) => mm.w + 'x' + mm.h + ':' + ['bed', 'fountain', 'window', 'pillar', 'hearth', 'wall_wood', 'rack'].map((t) => { let k = 0; for (let y = 0; y < mm.h; y++) for (let x = 0; x < mm.w; x++) if (mm.tile(x, y) === t) k++; return t + k; }).join(',');
  const sg = ['harbor_inn', 'sahar_inn', 'verum_inn'].map((id) => sig(W.getMap(id))); ok(new Set(sg).size === 3, '港の宿・砂の宿・坑夫の宿はそれぞれ違う間取り（' + sg.join(' ／ ') + '）');
  console.log('結果：' + (ng.length ? 'NG ' + ng.length : 'すべて OK')); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
