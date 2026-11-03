// v7.1 ダンジョンの作り直し（2D・jsdom）：道順が元のまま（行ける所・行けない所が同じ・新しい近道がない）、中の物の置き場所、旧座標での出入り、古いセーブの互換
// 子プロセス（LEGACY=1、RPG_DIR=作り直し前の版）で元の地図の道のりを数え、親で作り直した地図と比べる
const path = require('path');
const IDS_ENV = process.env.IDS || '';
function measure(w, ids, legacy) {
  const out = {}; const S = w.State, World = w.World, T = w.Tiles;
  if (legacy && w.MapWiden) w.MapWiden.enabled = false;   // 元の地図（v7.0 の自動の広げ方も入れない、作者が描いたままの地図）
  for (const id of ids) {
    const def = w.MAP_DEFS[id];
    const rr = (!legacy && def.remake71) ? def.remake71 : null; const K = rr ? rr.scale : 1;
    // 置き場所：元の座標で書いた POI（旧座標）。作り直した版は、旧座標 → 新しい座標のブロック
    let pois = [];
    if (legacy) {
      (def.warps || []).forEach((q, i) => pois.push({ k: 'w' + i + ':' + q.to + '@' + q.x + ',' + q.y, x: q.x, y: q.y }));
      (def.events || []).forEach((e, i) => pois.push({ k: 'e' + i + ':' + e.type + '@' + e.x + ',' + e.y, x: e.x, y: e.y }));
      (def.chests || []).forEach((c) => pois.push({ k: 'c:' + c.id, x: c.x, y: c.y }));
      (def.npcs || []).forEach((n) => pois.push({ k: 'n:' + n.id, x: n.x, y: n.y }));
      (w.SEARCH_POINTS || []).filter((p) => p.map === id).forEach((p) => pois.push({ k: 'sp:' + p.id, x: p.x, y: p.y }));
      (w.QUIZ_MONSTERS || []).filter((p) => p.map === id).forEach((p) => pois.push({ k: 'qm:' + p.id, x: p.x, y: p.y }));
      Object.keys(w.MAP_DEFS).forEach((k) => { const d2 = w.MAP_DEFS[k]; [].concat(d2.warps || [], (d2.events || []).filter((e) => e.to), d2.locations || []).forEach((q) => { if (q && q.to === id && typeof q.tx === 'number') pois.push({ k: 'in:' + k + '>' + q.tx + ',' + q.ty, x: q.tx, y: q.ty, arrive: true }); }); });
      const seen = {}; pois = pois.filter((p) => { if (seen[p.k]) return false; seen[p.k] = 1; return true; });
    } else pois = ids._pois[id];
    const flagsOf = () => { const f = {}; (def.events || []).forEach((e) => ['doneFlag', 'needFlag', 'tileFlag', 'requireFlag'].forEach((k) => { if (e[k]) f[e[k]] = 1; })); (def.warps || []).forEach((q) => { if (q.needFlag) f[q.needFlag] = 1; }); return Object.keys(f); };
    const res = { pois: pois, dist: {} };
    for (const sc of ['closed', 'open']) {
      S.newGame('t', 'warrior'); const d = S.data; if (sc === 'open') flagsOf().forEach((f) => { d.flags[f] = true; });
      World.maps = {}; const m = World.getMap(id);
      const W = m.w, H = m.h;
      const walk = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H || T.isSolid(m.tiles[y][x])) return false; const ev = m.events.filter((e) => e.x === x && e.y === y)[0]; return !(ev && ev.solid && !(ev.doneFlag && d.flags[ev.doneFlag])); };
      const inB = (q, p) => q.x >= p.x * K && q.x < p.x * K + K && q.y >= p.y * K && q.y < p.y * K + K;
      const cellsOf = (p) => { if (K === 1) return [[p.x, p.y]]; const k = p.k; let L = [];
        if (k[0] === 'w') { const to = k.split(':')[1].split('@')[0]; L = m.warps.filter((q) => q.to === to && inB(q, p)); }
        else if (k[0] === 'e') { const ty = k.split(':')[1].split('@')[0]; L = m.events.filter((q) => q.type === ty && inB(q, p)); }
        else if (k.startsWith('c:')) L = m.chests.filter((q) => 'c:' + q.id === k); else if (k.startsWith('n:')) L = m.npcs.filter((q) => 'n:' + q.id === k);
        else if (k.startsWith('sp:')) L = (w.SEARCH_POINTS || []).filter((q) => 'sp:' + q.id === k); else if (k.startsWith('qm:')) L = (w.QUIZ_MONSTERS || []).filter((q) => 'qm:' + q.id === k);
        else { const q = w.MapRemake.pos(id, p.x, p.y); L = [q]; }
        return L.map((q) => [q.x, q.y]); };
      const acc = (p) => { const C = cellsOf(p); const inC = (x, y) => C.some((c) => c[0] === x && c[1] === y); const A = []; C.forEach(([x, y]) => { if (walk(x, y)) A.push([x, y]); else [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { if (!inC(x + dx, y + dy) && walk(x + dx, y + dy)) A.push([x + dx, y + dy]); }); }); return A; };
      const A = pois.map(acc);
      const D = pois.map((p, i) => { const dist = new Int32Array(W * H).fill(-1); const q = []; A[i].forEach(([x, y]) => { if (dist[y * W + x] < 0) { dist[y * W + x] = 0; q.push(x, y); } }); for (let h = 0; h < q.length; h += 2) { const x = q[h], y = q[h + 1], dv = dist[y * W + x]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (walk(nx, ny) && dist[ny * W + nx] < 0) { dist[ny * W + nx] = dv + 1; q.push(nx, ny); } } } return pois.map((p2, j) => { let b = -1; A[j].forEach(([x, y]) => { const v = dist[y * W + x]; if (v >= 0 && (b < 0 || v < b)) b = v; }); return b; }); });
      res.dist[sc] = D;
    }
    out[id] = res;
  }
  return out;
}
function loadAt(dir) {
  process.env.RPG_DIR = dir; delete require.cache[require.resolve('../rpgload.js')];
  return require('../rpgload.js')();
}
if (process.env.LEGACY) {
  const { w } = loadAt(process.env.RPG_DIR);
  const ids = process.env.IDS.split(',');
  w.Win.message = () => Promise.resolve(); w.Win.toast = () => {};
  process.stdout.write(JSON.stringify(measure(w, ids, true)));
  return;
}
// ---------- 親：作り直した版 ----------
const { w, errors } = loadAt(process.env.NEW_DIR || '/home/claude/mochipoyo-trade-quest/');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
const MR = w.MapRemake; const ids = IDS_ENV ? IDS_ENV.split(',') : MR.LIST.filter((id) => MR.isRemade(id));
ok(ids.length > 0 && ids.every((id) => MR.isRemade(id)), '作り直したダンジョン：' + ids.join(', '));
const LEG = JSON.parse(require('child_process').execFileSync('node', [__filename], { cwd: path.join(__dirname, '..'), env: Object.assign({}, process.env, { LEGACY: '1', RPG_DIR: process.env.BASE_DIR || '/home/claude/base71/', IDS: ids.join(',') }), maxBuffer: 256 * 1024 * 1024 }).toString());
ids._pois = {}; ids.forEach((id) => { ids._pois[id] = LEG[id].pois; });
w.Win.message = () => Promise.resolve(); w.Win.toast = () => {}; w.World.encounter = () => {};
const NEW = measure(w, ids, false);
function LEGACY_RATE(id) { return LEGR[id]; }
var LEGR; { const s = require('child_process').execFileSync('node', ['-e', "const load=require('./rpgload.js');const A=load();const o={};" + JSON.stringify(ids) + ".forEach(id=>{o[id]=A.w.MAP_DEFS[id].encounters&&A.w.MAP_DEFS[id].encounters.rate});process.stdout.write(JSON.stringify(o))"], { cwd: path.join(__dirname, '..'), env: Object.assign({}, process.env, { RPG_DIR: process.env.BASE_DIR || '/home/claude/base71/' }) }).toString(); LEGR = JSON.parse(s); }
for (const id of ids) {
  const L = LEG[id], N = NEW[id], P = L.pois; const def = w.MAP_DEFS[id]; const r = def.remake71;
  ok(def.rows.length === r.oldH * 2 && def.rows.every((row) => row.length === r.oldW * 2), id + '：大きさ ' + r.oldW + '×' + r.oldH + ' → ' + r.oldW * 2 + '×' + r.oldH * 2 + '（削った壁 ' + r.stats.carved + '・苔など ' + r.stats.moss + '・岩 ' + r.stats.rocks + '・松明 ' + r.stats.torches + '・泉 ' + r.stats.pools + '）');
  for (const sc of ['closed', 'open']) {
    const bad = [], short = [], longp = []; let worst = 0, minr = 9;
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const a = L.dist[sc][i][j], b = N.dist[sc][i][j];
      if ((a < 0) !== (b < 0)) { bad.push(P[i].k + ' ⇔ ' + P[j].k + ' 元' + a + '/今' + b); continue; }
      if (a < 0) continue;
      if (b < 1.88 * a - 4) short.push(P[i].k + '⇔' + P[j].k + ' 元' + a + '→今' + b);
      if (b > 2 * a + 12) longp.push(P[i].k + '⇔' + P[j].k + ' 元' + a + '→今' + b);
      if (a > 3) { worst = Math.max(worst, b / (2 * a)); minr = Math.min(minr, b / (2 * a)); }
    }
    ok(!bad.length, id + '（' + (sc === 'closed' ? '仕掛けが閉じている' : '仕掛けがすべて開いた') + '）：行ける所・行けない所が元と同じ（' + P.length + 'か所の組み合わせ）' + bad.slice(0, 4).join(' | '));
    ok(!short.length, id + '（' + sc + '）：新しい近道がない（道のりは元の2倍の94%以上 − 4歩。壁の角を削った分だけ少し短くなるのは許す）最短 ' + minr.toFixed(2) + ' 倍 ' + short.slice(0, 3).join(' | '));
    ok(!longp.length, id + '（' + sc + '）：ひどい遠回りもない（2倍 + 12 歩まで。最大 ' + worst.toFixed(2) + ' 倍）' + longp.slice(0, 3).join(' | '));
  }
  // 中の物：旧座標の物が、新しい座標にある
  const m = new w.GameMap(def); const lost = [];
  P.forEach((p) => {
    const nx = p.x * 2, ny = p.y * 2;
    if (p.k[0] === 'w') { const to = p.k.split(':')[1].split('@')[0]; if (!m.warps.some((q) => q.x === nx && q.y === ny && q.to === to)) lost.push(p.k); }
    else if (p.k[0] === 'e') { const ty = p.k.split(':')[1].split('@')[0]; if (!m.events.some((e) => e.x >= nx && e.x <= nx + 1 && e.y >= ny && e.y <= ny + 1 && e.type === ty)) lost.push(p.k); }
    else if (p.k.startsWith('c:')) { if (!m.chests.some((c) => 'c:' + c.id === p.k && c.x >= nx && c.x <= nx + 1 && c.y >= ny && c.y <= ny + 1)) lost.push(p.k); }
    else if (p.k.startsWith('n:')) { if (!m.npcs.some((n) => 'n:' + n.id === p.k && n.x === nx && n.y === ny)) lost.push(p.k); }
    else if (p.k.startsWith('sp:')) { if (!(w.SEARCH_POINTS || []).some((s) => 'sp:' + s.id === p.k && s.x === nx && s.y === ny)) lost.push(p.k); }
    else if (p.k.startsWith('qm:')) { if (!(w.QUIZ_MONSTERS || []).some((s) => 'qm:' + s.id === p.k && s.x === nx && s.y === ny)) lost.push(p.k); }
  });
  ok(!lost.length, id + '：出入口・出来事・宝箱・人・調べる所・クイズの魔物が、新しい座標（2倍）にある ' + lost.slice(0, 4).join(' | '));
  // 着く場所（ほかのマップから来る所）：歩けるマスで、出入口の上ではない
  const arr = P.filter((p) => p.arrive); const badA = [];
  const legWarpAt = (x, y) => P.some((p2) => p2.k[0] === 'w' && p2.x === x && p2.y === y);
  arr.forEach((p) => { [undefined, 'right', 'down'].forEach((dir) => { const q = MR.pos(id, p.x, p.y, dir); const t = m.tiles[q.y][q.x]; if (w.Tiles.isSolid(t) || (m.warpAt(q.x, q.y) && !legWarpAt(p.x, p.y))) badA.push(p.k + (dir || '') + '→' + q.x + ',' + q.y + ' ' + t); }); });
  ok(arr.length > 0 && !badA.length, id + '：ほかの所から着く ' + arr.length + 'か所（旧座標の行き先を直した場所）が歩けるマス（元から出入口の上に着く所は、新しい地図でも出入口の1マスだけ＝まわりのマスへ歩いても戻らない）' + badA.join(' | '));
  // 知らない文字がない（作り直しで使う文字はすべて Tiles にある）
  const unk = []; def.rows.forEach((row) => row.split('').forEach((c) => { if (!w.Tiles.byChar[c] && unk.indexOf(c) < 0) unk.push(c); }));
  ok(!unk.length, id + '：地図の文字はすべて既存のタイル ' + unk.join(''));
  ok(def.noWiden && (LEGACY_RATE(id) == null ? !def.encounters || def.encounters.rate == null : Math.abs(def.encounters.rate - LEGACY_RATE(id) / 2) < 1e-9), id + '：v7.0 の自動の広げ方は当てない・敵の出る確率は半分（' + LEGACY_RATE(id) + ' → ' + (def.encounters && def.encounters.rate) + '）');
  const marks = w.WarpMark.list(m, { flags: {} }); const legW = P.filter((p) => p.k[0] === 'w').length;
  ok(marks.length <= legW && marks.every((o) => o.n >= 1), id + '：出入口の目印は、元の出入口ごとに1つ（4マスをまとめる）目印 ' + marks.length + '・元の出入口 ' + legW + '（隠し・閉じたものは出さない）');
}
// 旧座標で入る（物語の台本・ワープの行き先は旧座標のまま）
(async () => {
  const S = w.State, World = w.World;
  S.newGame('t', 'warrior'); const d = S.data; World.start();
  World.enterMap('lost_forest', 15, 15, 'up'); ok(World.map.id === 'lost_forest' && World.player.x === 30 && World.player.y === 30, '旧座標で入る：迷いの森 (15,15) 上向き → (30,30)');
  World.enterMap('oblivion_cave_2', 12, 5, 'right'); ok(World.player.x === 25 && World.player.y === 10 && World.map.eventAt(26, 10) && World.map.eventAt(26, 10).type === 'rank_door', '旧座標で入る：右向きなら 2×2 の右のマス（洞窟2階 (12,5) 右向き → (25,10)、目の前が紋章の扉）');
  World.enterMap('lost_forest', 15, 15, 'up');
  const ev = World.map.eventAt(World.player.x, World.player.y - 1); ok(ev && ev.type === 'trial', '目の前（上）が試練の扉（元の (15,14) → 2×2）');
  ok(!World.map.passable(31, 29, d) && !World.map.passable(30, 29, d), '試練の扉の脇をすり抜けられない（2マスとも扉）');
  World.enterMap('lost_forest', 30, 30, 'up', { raw: true }); ok(World.player.x === 30 && World.player.y === 30, '新しい座標で入る（raw）');
  // ワープの行き先（旧座標）→ 新しい座標に着く
  World.enterMap('lost_forest_shrine', 7, 11, 'down'); const wq = World.map.warpAt(7, 12); World.doWarp(wq); for (let i = 0; i < 100 && World.busy; i++) await new Promise((r) => setTimeout(r, 20));
  ok(World.map.id === 'lost_forest' && World.player.x === 30 && (World.player.y === 26 || World.player.y === 27), '祠から出る：旧座標 (15,13) → 迷いの森 (30,26〜27)（' + World.player.x + ',' + World.player.y + '）');
  // 古いセーブ（作り直し前）：迷いの森の (12,20) にいる・探索済みが旧座標
  S.newGame('t', 'warrior'); const d2 = S.data; d2.pos = { map: 'lost_forest', x: 10, y: 20, dir: 'down' }; d2.mapDiscovery = { lost_forest: [] }; d2.mapDiscovery.lost_forest[19] = [1 << 12]; delete d2.remakeVer;
  World.start(); ok(World.map.id === 'lost_forest' && World.player.x === 20 && World.player.y === 40, '古いセーブ：いる場所 (10,20) → (20,40)');
  const md = d2.mapDiscovery.lost_forest; const bit = (x, y) => !!(md[y] && ((md[y][(x / 30) | 0] || 0) & (1 << (x % 30))));
  ok(bit(24, 38) && bit(25, 38) && bit(24, 39) && bit(25, 39) && !bit(12, 19), '古いセーブ：ミニマップの探索済みも2倍の場所へ');
  ok(d2.remakeVer && d2.remakeVer.lost_forest === MR.VERSION, 'セーブに作り直しの版を記録（次に読み込んでも、もう一度は直さない）');
  const px = World.player.x, py = World.player.y; World.start(); ok(World.player.x === px && World.player.y === py, '新しいセーブ：もう一度読み込んでも場所は同じ');
  // ナビの参照（旧座標）
  const t = w.Nav.resolve('ev:oblivion_cave_3:12,11'); ok(t && t.ev && t.ev.type === 'boss' && t.x === 24 && t.y === 22, 'ナビ「ev:oblivion_cave_3:12,11」→ 欲望のゴーレム（新しい座標 24,22）');
  console.log('errors', errors.slice(0, 3)); ok(!errors.length, 'ページのエラーなし');
  console.log('結果：' + pass + ' OK / ' + fail + ' NG');
})();
