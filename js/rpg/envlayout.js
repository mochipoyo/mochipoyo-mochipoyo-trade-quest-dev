/* =========================================================
   EnvLayout（v7.6 環境リデザイン）：町の街路と、ダンジョンの空間の流れの作り直し（論理のタイル。2D版・3D版・ミニマップが同じ結果）
   ・GameMap を作るときに当てる（js/core/map.js。MapWiden の後）。マップの定義 def.rows は変えない＝切れば元の間取りに戻る
     切り替え：localStorage 'mtq-layout'＝'off' で元の間取り（2D版・3D版で共通。設定の画面で人が切り替えたときだけ書く）。URL の ?layout=off|on でも同じ（URL が優先・保存はしない）
   ・動かさない物：ワープ（出入口・階段）・NPC・宝箱・イベント・建物（入口）・調べる場所・クイズの魔物。そのまわりのマスも変えない
     → 物語の台本・ほかのマップからのワープ・セーブの座標はそのまま使える
   ・守る決まり（マップごとに、作り直す前と後で比べる。1つでも破れたら、その変更を取り消す）
     1) 歩けるマスのつながり：前に別々だった所がつながらない（近道・抜け道ができない）。前につながっていた所が切れない
        （鍵の扉・関所・レバー・通れない出来事・人の立つマスは「通れない」として数える＝鍵の向こうへの抜け道もできない）
     2) 出入口・階段・出来事のマスは歩けるまま。宝箱・人・通れない出来事は、前と同じつながりの所から近づける
   ・町：門から中心の建物までの大通り（舗装）・建物の入口への小道・広場を残し、残りの広い所に並木・花壇・生け垣などを置いて、
     大通り／裏道／広場の区別をつける。町ごとの目印のマス（噴水・塔・大樹など。3D版が形を作る）を広場に置く
   ・ダンジョン：入口から奥（下り階段・ボス・いちばん遠い宝箱）までの道順に沿って
     入口の見通し（小さな前室）→ 狭まる通路（広い所に岩・柱を置いて幅2に）→ 主要な空間（壁を削って広い部屋＋柱）→ 見せ場（奥の手前の前室と左右の柱）
     壁を削ってよいのは、削ったマスのとなりの床がすべて「部屋の中心から元の地図で決まった歩数以内」のときだけ（遠い所どうしをつながない）
   ・対象外：時限の仕掛け（def.onStep）・氷の床・落とし穴のあるマップ・行が関数のマップ・物語の特別なマップ（s3121）・def.noLayout、
     旗艦の5地点（専用レシピの間取り）と第7居住区
   ・作った結果：m.envLayout（版・変えたマス・区間＝3D版の光と見せ場に使う）
   ========================================================= */
(function (root) {
  'use strict';
  var EL = root.EnvLayout = { VERSION: 1, enabled: true, stats: {} };
  try { var q = /[?&]layout=(off|on)\b/.exec((root.location && root.location.search) || ''); if (q) EL.enabled = q[1] === 'on'; else if (root.localStorage && root.localStorage.getItem('mtq-layout') === 'off') EL.enabled = false; } catch (e) { /* 既定（オン） */ }
  EL.setEnabled = function (on) { try { root.localStorage.setItem('mtq-layout', on ? 'on' : 'off'); } catch (e) { /* なし */ } EL.enabled = !!on; };
  var SKIP = { poyo_village: 1, node_city: 1, tradia: 1, scheduled_district: 1, iron_mine_1: 1 };
  EL.SKIP = SKIP;
  function hash(x, y, s) { var v = Math.sin(x * 127.1 + y * 311.7 + (s || 0) * 74.7) * 43758.5453; return v - Math.floor(v); }
  function strSeed(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100003; return h; }
  var WALL = { wall: 1, castle_wall: 1, cave_wall: 1, wall_wood: 1 };
  var BARRIER_T = { door_locked: 1, gate: 1, lever: 1 };
  var TOWN_PLAIN = { stone: 1, grass: 1, grass2: 1, path_stone: 1, snow: 1, sand: 1, darkland: 1, ash: 1, dirt: 1 };
  var N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], N8 = N4.concat([[1, 1], [-1, 1], [1, -1], [-1, -1]]);

  // ほかのマップ・世界地図・出来事から「着く所」（ワープの行き先 tx,ty・世界地図の入口・落とし穴の先・台本の enterMap）。着く所は柱・木にしない
  EL.EXTRA_ARRIVALS = [['a6_dd_vents', 9, 10], ['a6_ft_ice', 9, 10], ['a6_mt_mirage', 9, 10], ['a6_sk_clouds', 9, 10], ['oblivion_cave_lake', 2, 8], ['poyo_elder_house', 5, 5], ['rivel_castle_b1', 2, 2]];   // js/ の中の enterMap('id', x, y) の直書き
  var ARR = null, ARR_MR = false;
  function arrivals(id) {
    if (!ARR || (!ARR_MR && root.MapRemake)) {   // 作り直したダンジョンの座標の直し（mapremake.js）が読み込まれたら作り直す
      ARR = {}; ARR_MR = !!root.MapRemake; var add = function (to, x, y) { if (!to || typeof x !== 'number' || typeof y !== 'number') return; var p = { x: x, y: y }; try { if (root.MapRemake && root.MapRemake.pos) p = root.MapRemake.pos(to, x, y) || p; } catch (e) { /* そのまま */ } (ARR[to] = ARR[to] || []).push([p.x, p.y]); };
      var D = root.MAP_DEFS || {}; Object.keys(D).forEach(function (k) { var d = D[k]; if (Array.isArray(d.warps)) d.warps.forEach(function (w) { if (w) add(w.to, w.tx, w.ty); }); if (Array.isArray(d.events)) d.events.forEach(function (e) { if (e && e.to) add(e.to, e.tx, e.ty); }); });
      (root.WORLD_LOCATIONS || []).forEach(function (L) { if (L) add(L.to, L.tx, L.ty); });
      EL.EXTRA_ARRIVALS.forEach(function (a) { add(a[0], a[1], a[2]); });
    }
    return ARR[id] || [];
  }
  EL.arrivals = arrivals;
  // ---------- 解析：守るマス・通れるか・つながり
  function analyze(m) {
    var W = m.w, H = m.h, T = root.Tiles; var A = { m: m, W: W, H: H };
    var solidEv = new Uint8Array(W * H), npcAt = new Uint8Array(W * H); var inb = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H; };
    (m.events || []).forEach(function (e) { if (e && e.solid && inb(e.x, e.y)) solidEv[e.y * W + e.x] = 1; });
    (m.npcs || []).forEach(function (n) { var x = n.ox !== undefined ? n.ox : n.x, y = n.oy !== undefined ? n.oy : n.y; if (inb(x, y)) npcAt[y * W + x] = 1; });
    A.blockAt = function (x, y) { var i = y * W + x; return !!(solidEv[i] || npcAt[i] || BARRIER_T[m.tiles[y][x]]); };
    A.walkOpen = function (x, y) { if (x < 0 || y < 0 || x >= W || y >= H) return false; var t = m.tiles[y][x]; if (T.isSolid(t) && !BARRIER_T[t]) return false; return !npcAt[y * W + x]; };   // 鍵の扉・関所・レバー・通れない出来事を「開いた」とき
    A.walk = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && !T.isSolid(m.tiles[y][x]) && !A.blockAt(x, y); };
    // 守るマス：動かさない物からの距離（チェビシェフ）。prot[i] = 距離（遠いほど大きい・最大9）
    var prot = new Uint8Array(W * H).fill(9);
    var mark = function (x, y, r) { for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) { var nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; var d = Math.max(Math.abs(dx), Math.abs(dy)); var i = ny * W + nx; if (d < prot[i]) prot[i] = d; } };
    var anchors = [];
    (m.warps || []).forEach(function (w) { mark(w.x, w.y, 3); anchors.push([w.x, w.y, 'warp']); });
    (m.events || []).forEach(function (e) { mark(e.x, e.y, 2); anchors.push([e.x, e.y, e.solid ? 'solidev' : 'event']); });
    (m.chests || []).forEach(function (c) { mark(c.x, c.y, 2); anchors.push([c.x, c.y, 'chest']); });
    (m.npcs || []).forEach(function (n) { var x = n.ox !== undefined ? n.ox : n.x, y = n.oy !== undefined ? n.oy : n.y; mark(x, y, 2 + Math.min(2, n.wander || 0)); anchors.push([x, y, 'npc']); });
    (m.buildings || []).forEach(function (b) { if (b.doorAbs) { var fr = b.doorFront || { x: b.doorAbs.x, y: b.doorAbs.y + 1 }; mark(fr.x, fr.y, 2); mark(b.doorAbs.x, b.doorAbs.y, 1); anchors.push([b.doorAbs.x, b.doorAbs.y, 'door']); } });
    arrivals(m.id).forEach(function (p) { if (p[0] >= 0 && p[1] >= 0 && p[0] < W && p[1] < H) { mark(p[0], p[1], 2); anchors.push([p[0], p[1], 'arrive']); } });   // 着く所   // 建物の扉も「近づける物」（行けなくならない・遠くならない）
    (root.SEARCH_POINTS || []).forEach(function (p) { if (p.map === m.id) { mark(p.x, p.y, 2); anchors.push([p.x, p.y, 'search']); } });
    (root.QUIZ_MONSTERS || []).forEach(function (p) { if (p.map === m.id) { mark(p.x, p.y, 2); anchors.push([p.x, p.y, 'quiz']); } });
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var t = m.tiles[y][x]; if (t === 'stairs_down' || t === 'stairs_up' || t === 'warp' || t === 'hole' || t === 'bld_door' || t === 'door' || BARRIER_T[t]) mark(x, y, 2); if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) { var i0 = y * W + x; prot[i0] = Math.min(prot[i0], 0); } }
    A.prot = prot; A.anchors = anchors;
    return A;
  }
  function label(A) {
    var W = A.W, H = A.H, L = new Int32Array(W * H).fill(-1), n = 0, q = new Int32Array(W * H);
    var G = new Uint8Array(W * H); for (var gy = 0; gy < H; gy++) for (var gx = 0; gx < W; gx++) G[gy * W + gx] = A.walk(gx, gy) ? 1 : 0;
    for (var s = 0; s < W * H; s++) {
      if (L[s] >= 0 || G[s] !== 1) continue;
      var h = 0, t = 0; q[t++] = s; L[s] = n;
      while (h < t) { var c = q[h++], cx = c % W, cy = (c / W) | 0; for (var k = 0; k < 4; k++) { var nx = cx + N4[k][0], ny = cy + N4[k][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; var ni = ny * W + nx; if (L[ni] < 0 && G[ni] === 1) { L[ni] = n; q[t++] = ni; } } }
      n++;
    }
    return L;
  }
  // 出入口などに近づけるつながり（そのマス、または4方向のとなりの歩けるマスの つながりの番号の集まり）
  function touch(A, L, x, y) { var s = []; var W = A.W; if (A.walk(x, y)) s.push(L[y * W + x]); for (var k = 0; k < 4; k++) { var nx = x + N4[k][0], ny = y + N4[k][1]; if (nx >= 0 && ny >= 0 && nx < W && ny < A.H && A.walk(nx, ny)) s.push(L[ny * W + nx]); } return s; }
  function snapshot(A) { var L = label(A); var tch = A.anchors.map(function (a) { return touch(A, L, a[0], a[1]); }); var walk0 = new Uint8Array(A.W * A.H); for (var i = 0; i < walk0.length; i++) walk0[i] = L[i] >= 0 ? 1 : 0; return { L: L, tch: tch, walk0: walk0 }; }
  // 物（出入口・人・宝箱・出来事・調べる所・クイズの魔物）どうしの歩く道のり（閉じた／開いたの両方）。近道ができない・大回りにならない、を確かめる
  function pairDist(A, walkF) {   // A.srcIdx：道のりを測る起点（町は出入口だけ＝軽く。ダンジョンはすべての物）
    var W = A.W, H = A.H, N = W * H, an = A.anchors, out = []; var D = new Int32Array(N), q = new Int32Array(N); var src = A.srcIdx || an.map(function (_, i) { return i; });
    var G = new Uint8Array(N); for (var gy = 0; gy < H; gy++) for (var gx = 0; gx < W; gx++) G[gy * W + gx] = walkF(gx, gy) ? 1 : 0;   // 歩けるか（一度だけ調べる）
    var gw = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && G[y * W + x] === 1; };
    var stand = an.map(function (a) { var s = []; if (gw(a[0], a[1])) s.push(a[1] * W + a[0]); for (var k = 0; k < 4; k++) { var nx = a[0] + N4[k][0], ny = a[1] + N4[k][1]; if (gw(nx, ny)) s.push(ny * W + nx); } return s; });
    for (var si = 0; si < src.length; si++) { var i = src[si];
      D.fill(-1); var h = 0, t = 0; stand[i].forEach(function (c) { if (D[c] < 0) { D[c] = 0; q[t++] = c; } });
      while (h < t) { var c = q[h++], cx = c % W, cy = (c / W) | 0; for (var k = 0; k < 4; k++) { var nx = cx + N4[k][0], ny = cy + N4[k][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; var ni = ny * W + nx; if (D[ni] >= 0 || G[ni] !== 1) continue; D[ni] = D[c] + 1; q[t++] = ni; } }
      var row = []; for (var j = 0; j < an.length; j++) { var best = -1; stand[j].forEach(function (c) { if (D[c] >= 0 && (best < 0 || D[c] < best)) best = D[c]; }); row.push(best); } out.push(row);
    }
    return out;
  }
  EL.DETOUR = { add: 4, ratio: 0.1 };   // 大回りの許し：元の道のり＋4歩＋1割まで
  function distOk(A, B0) {
    if (!B0.dist) return null;
    var modes = [['closed', A.walk], ['open', A.walkOpen]];
    for (var mi = 0; mi < modes.length; mi++) {
      var d1 = pairDist(A, modes[mi][1]), d0 = B0.dist[modes[mi][0]];
      for (var i = 0; i < d0.length; i++) for (var j = 0; j < d0[i].length; j++) {
        var a = d0[i][j], b = d1[i][j]; if (a < 0 || b < 0) continue;
        if (b < a) return 'shortcut ' + modes[mi][0] + ' ' + a + '→' + b;
        if (b > a + EL.DETOUR.add + Math.floor(a * EL.DETOUR.ratio)) return 'detour ' + modes[mi][0] + ' ' + a + '→' + b;
      }
    }
    return null;
  }
  // 守る決まりの確認（前 B0 と、いまの地図）
  function invariantOk(A, B0) {
    var L1 = label(A), W = A.W, N = W * A.H; var map01 = {}, map10 = {};
    for (var i = 0; i < N; i++) {
      if (!B0.walk0[i]) continue; if (L1[i] < 0) continue;   // 埋めたマス
      var a = B0.L[i], b = L1[i];
      if (map01[a] === undefined) map01[a] = b; else if (map01[a] !== b) return 'split';   // 前につながっていた所が切れた
      if (map10[b] === undefined) map10[b] = a; else if (map10[b] !== a) return 'merge';   // 前に別々だった所がつながった
    }
    for (var j = 0; j < A.anchors.length; j++) {
      var an = A.anchors[j]; var before = B0.tch[j].map(function (l) { return l; }), after = touch(A, L1, an[0], an[1]).map(function (l) { return map10[l]; });
      var sb = {}, sa = {}; before.forEach(function (l) { sb[l] = 1; }); after.forEach(function (l) { if (l !== undefined) sa[l] = 1; });
      for (var k in sb) if (!sa[k]) return 'anchor ' + an.join(',');
      for (var k2 in sa) if (!sb[k2]) return 'anchor+ ' + an.join(',');
      if ((an[2] === 'warp' || an[2] === 'event' || an[2] === 'arrive') && B0.walk0[an[1] * W + an[0]] && !A.walk(an[0], an[1])) return 'anchor tile ' + an.join(',');
    }
    return distOk(A, B0);
  }
  // 変更をまとめて試す：守る決まりが破れたら元に戻す
  function tryOps(A, B0, ops, res) {
    var m = A.m, prev = ops.map(function (o) { return m.tiles[o[1]][o[0]]; });
    ops.forEach(function (o) { m.tiles[o[1]][o[0]] = o[2]; });
    var why = invariantOk(A, B0);
    if (why) { ops.forEach(function (o, i) { m.tiles[o[1]][o[0]] = prev[i]; }); res.rejected++; res.why[why.split(' ')[0]] = (res.why[why.split(' ')[0]] || 0) + 1; return false; }
    ops.forEach(function (o, i) { res.changed.push([o[0], o[1], prev[i], o[2]]); }); return true;
  }
  // まとめて試す：全部を一度に試し、だめなら半分ずつに分けて試す（1つずつ試すより確認の回数がずっと少ない。採るものは、その時の地図で決まりを守るものだけ）
  function tryGroups(A, B0, groups, res) {
    if (!groups.length) return 0; var all = []; groups.forEach(function (g) { all = all.concat(g); });
    var r0 = res.rejected; if (tryOps(A, B0, all, res)) return groups.length; res.rejected = r0;
    if (groups.length === 1) { res.rejected++; return 0; }
    var h = groups.length >> 1; return tryGroups(A, B0, groups.slice(0, h), res) + tryGroups(A, B0, groups.slice(h), res);
  }
  function bfsPath(A, sx, sy, goal) {   // goal(x,y)→true のマスまでの最短の道（歩けるマスだけ）
    var W = A.W, H = A.H, prev = new Int32Array(W * H).fill(-2), q = [sy * W + sx], qh = 0; prev[sy * W + sx] = -1;
    while (qh < q.length) { var c = q[qh++], cx = c % W, cy = (c / W) | 0; if (goal(cx, cy) && c !== sy * W + sx) { var p = []; for (var k = c; k >= 0; k = prev[k]) p.push([k % W, (k / W) | 0]); return p.reverse(); }
      for (var d = 0; d < 4; d++) { var nx = cx + N4[d][0], ny = cy + N4[d][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; var ni = ny * W + nx; if (prev[ni] !== -2 || !A.walk(nx, ny)) continue; prev[ni] = c; q.push(ni); } }
    return null;
  }
  function distFrom(A, sx, sy, maxD) { var W = A.W, H = A.H, D = new Int16Array(W * H).fill(-1), q = [sy * W + sx], qh = 0; D[sy * W + sx] = 0; while (qh < q.length) { var c = q[qh++], cx = c % W, cy = (c / W) | 0; if (D[c] >= maxD) continue; for (var d = 0; d < 4; d++) { var nx = cx + N4[d][0], ny = cy + N4[d][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; var ni = ny * W + nx; if (D[ni] >= 0 || !A.walk(nx, ny)) continue; D[ni] = D[c] + 1; q.push(ni); } } return D; }

  // ---------- 町：大通り・小道・広場・並木と花壇・目印
  var HUB_ORDER = ['castle', 'elder', 'church', 'guild', 'hall', 'bank', 'exchange', 'inn', 'tavern'];
  var TOWN_FEATURE = {   // 地域 → [並木, 花壇の中心, 花壇のまわり]
    arcadia: ['tree_small', 'tree_small', 'flowerbed'], grania: ['tree_small', 'crate', 'barrel'], kalion: ['tree_small', 'bush', 'bush'], islands: ['tree_small', 'tree_small', 'flowerbed'],
    tempus: ['tree_small', 'flowerbed', 'bush'], magicka: ['tree_small', 'flowerbed', 'bush'], sky: ['tree_small', 'flowerbed', 'bush'], dark: ['tree_small', 'crate', 'barrel'],
    desert: ['tree_small', 'stall', 'crate'], dragon: ['tree_small', 'barrel', 'crate'], snow: ['tree_small', 'bush', 'bush'], machine: ['tree_small', 'crate', 'crate']
  };
  // 町ごとの目印（広場に置くマスの形と文字）。3D 版（three-src/src/environment/recipes/town_kit.js）が同じ表で形を作る
  EL.LANDMARK = {
    rivel_town: { kind: 'fountain', w: 2, h: 2 }, dow_village: { kind: 'bigtree', w: 2, h: 2 }, harbor_town: { kind: 'crane', w: 2, h: 2 }, verum_town: { kind: 'headframe', w: 2, h: 2 },
    kalion_city: { kind: 'colonnade', w: 3, h: 1 }, erased_village: { kind: 'well', w: 1, h: 1 }, sentra_capital: { kind: 'pool', w: 3, h: 2 }, aruna_village: { kind: 'lighthouse', w: 2, h: 2 },
    aruna_ruins: { kind: 'clocktower', w: 2, h: 2 }, tempus_city: { kind: 'belltower', w: 2, h: 2 }, frost_town: { kind: 'glasslamps', w: 2, h: 2 }, ciel_port: { kind: 'crane', w: 2, h: 2 },
    dark_camp: { kind: 'banner', w: 1, h: 1 }, ignas_town: { kind: 'forge', w: 2, h: 2 }, magicka_city: { kind: 'armillary', w: 2, h: 2 }, mirror_market: { kind: 'mirrors', w: 2, h: 2 },
    sahar_city: { kind: 'cistern', w: 3, h: 2 }, star_camp: { kind: 'armillary', w: 2, h: 2 }, volatilia: { kind: 'dome', w: 2, h: 2 }, rivel_artisan: { kind: 'forge', w: 2, h: 2 },
    asana_village: { kind: 'well', w: 1, h: 1 }, asana_raid: { kind: 'banner', w: 1, h: 1 }, asana_rebuilt: { kind: 'well', w: 1, h: 1 }, asana_ruins: { kind: 'well', w: 1, h: 1 },
    luxbell: { kind: 'bell', w: 2, h: 2 }, tradia_sky: { kind: 'armillary', w: 2, h: 2 }
  };
  var LM_TILE = { fountain: 'fountain', pool: 'fountain', cistern: 'fountain', well: 'well', bigtree: 'tree', glasslamps: 'lamp' };
  function regionOf(m) { try { return (root.BattleBG65 && root.BattleBG65.regionOf && root.BattleBG65.regionOf(m.id)) || 'arcadia'; } catch (e) { return 'arcadia'; } }
  function town(m, A, B0, res) {
    var W = A.W, H = A.H, t = m.tiles; var region = regionOf(m); var F = TOWN_FEATURE[region] || TOWN_FEATURE.arcadia; var seed = strSeed(m.id);
    var keep = new Uint8Array(W * H); var main = new Uint8Array(W * H); var band = new Uint8Array(W * H);
    // 中心の建物（入口の前のマス）と、門（町の外へのワープ・地図の端の出口）
    var bs = (m.buildings || []).filter(function (b) { return b.doorAbs; }); var hub = null;
    for (var o = 0; o < HUB_ORDER.length && !hub; o++) hub = bs.filter(function (b) { return b.type === HUB_ORDER[o]; }).sort(function (a, b) { return b.w * b.h - a.w * a.h; })[0] || null;
    if (!hub) hub = bs.slice().sort(function (a, b) { return b.w * b.h - a.w * a.h; })[0] || null;
    var gates = (m.warps || []).filter(function (w) { var d = root.MAP_DEFS && root.MAP_DEFS[w.to]; return (w.to === 'world' || /^world/.test(w.to) || (d && d.kind === 'field')) && A.walk(w.x, w.y); });
    var hubFront = hub ? (hub.doorFront ? [hub.doorFront.x, hub.doorFront.y] : [hub.doorAbs.x, hub.doorAbs.y + 1]) : [W >> 1, H >> 1];
    var markPath = function (p, width, into, bandArr) { p.forEach(function (c) { for (var dy = -width; dy <= width; dy++) for (var dx = -width; dx <= width; dx++) { var nx = c[0] + dx, ny = c[1] + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) { keep[ny * W + nx] = 1; if (bandArr) bandArr[ny * W + nx] = 1; if (into && !dx && !dy) into[ny * W + nx] = 1; } } }); };
    var paveOps = [];
    gates.slice(0, 2).forEach(function (g) { var p = bfsPath(A, g.x, g.y, function (x, y) { return x === hubFront[0] && y === hubFront[1]; }); if (!p) return; markPath(p, 1, main, band); p.forEach(function (c) { var tt = t[c[1]][c[0]]; if (TOWN_PLAIN[tt] && tt !== 'road') paveOps.push([c[0], c[1], 'road']); }); });
    if (paveOps.length) tryOps(A, B0, paveOps, res); res.mainStreet = paveOps.length;
    // 建物の入口・人への小道（大通りへ）
    var lanes = 0; var isMain = function (x, y) { return main[y * W + x] === 1; }; var hasMain = main.some(function (v) { return v; });
    bs.forEach(function (b) { var fx = b.doorFront ? b.doorFront.x : b.doorAbs.x, fy = b.doorFront ? b.doorFront.y : b.doorAbs.y + 1; if (fy >= H || !A.walk(fx, fy)) return; var p = hasMain ? bfsPath(A, fx, fy, isMain) : null; if (!p) return; markPath(p, 0, null); var ops = []; p.forEach(function (c) { var tt = t[c[1]][c[0]]; if (TOWN_PLAIN[tt] && tt !== 'path_stone' && !isMain(c[0], c[1])) ops.push([c[0], c[1], 'path_stone']); }); if (ops.length && tryOps(A, B0, ops, res)) lanes++; });
    (m.npcs || []).forEach(function (n) { var x = n.ox !== undefined ? n.ox : n.x, y = n.oy !== undefined ? n.oy : n.y; for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) { var nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) keep[ny * W + nx] = 1; } });
    res.lanes = lanes;
    // 目印（広場）：大通りのそばの、まわりを1マス歩ける空き地。まわり2マスは広場として残す
    var LM = EL.LANDMARK[m.id]; res.landmark = null;
    if (LM) {
      var best = null, bestD = 1e9, ctr = hubFront;
      for (var y0 = 3; y0 < H - 3 - LM.h; y0++) for (var x0 = 3; x0 < W - 3 - LM.w; x0++) {
        var ok = true; for (var yy = y0 - 1; yy <= y0 + LM.h && ok; yy++) for (var xx = x0 - 1; xx <= x0 + LM.w && ok; xx++) { var i = yy * W + xx; if (!TOWN_PLAIN[t[yy][xx]] && t[yy][xx] !== 'road') ok = false; else if (A.prot[i] < 2) ok = false; else if (!A.walk(xx, yy)) ok = false; }
        if (!ok) continue; var nearMain = false; for (var yy2 = y0 - 2; yy2 <= y0 + LM.h + 1 && !nearMain; yy2++) for (var xx2 = x0 - 2; xx2 <= x0 + LM.w + 1 && !nearMain; xx2++) if (yy2 >= 0 && xx2 >= 0 && yy2 < H && xx2 < W && main[yy2 * W + xx2]) nearMain = true;
        var inMain = false; for (var yy3 = y0; yy3 < y0 + LM.h; yy3++) for (var xx3 = x0; xx3 < x0 + LM.w; xx3++) if (main[yy3 * W + xx3]) inMain = true;
        if (inMain) continue;
        var d = Math.abs(x0 - ctr[0]) + Math.abs(y0 - ctr[1]) + (nearMain ? 0 : 12); if (d < bestD) { bestD = d; best = [x0, y0]; }
      }
      if (best) { var tile = LM_TILE[LM.kind] || 'pillar'; var ops = []; for (var ly = 0; ly < LM.h; ly++) for (var lx = 0; lx < LM.w; lx++) ops.push([best[0] + lx, best[1] + ly, tile]);
        if (tryOps(A, B0, ops, res)) { res.landmark = { kind: LM.kind, x: best[0], y: best[1], w: LM.w, h: LM.h, tile: tile }; for (var ky = best[1] - 2; ky < best[1] + LM.h + 2; ky++) for (var kx = best[0] - 2; kx < best[0] + LM.w + 2; kx++) if (kx >= 0 && ky >= 0 && kx < W && ky < H) keep[ky * W + kx] = 1; } }
    }
    // 並木：大通りの縁（大通りのとなりの空き地）に3マスおき
    var treeOps = []; for (var y = 1; y < H - 1; y++) for (var x = 1; x < W - 1; x++) {
      var i2 = y * W + x; if (keep[i2] || A.prot[i2] < 2 || !TOWN_PLAIN[t[y][x]] || !A.walk(x, y)) continue;
      var adjMain = N4.some(function (d) { return band[(y + d[1]) * W + x + d[0]] === 1; }); if (!adjMain) continue;
      if ((x + y + seed) % 3 !== 0) continue; treeOps.push([[x, y, F[0]]]);
    }
    res.avenue = tryGroups(A, B0, treeOps, res);
    // 花壇・生け垣：大通り・小道・広場の外の広い空き地の内側（まわり8マスが空き地のマス）に、模様で置く。歩ける縁は残る
    var plots = 0; var free = function (x, y) { var i = y * W + x; return x > 2 && y > 2 && x < W - 3 && y < H - 3 && !keep[i] && A.prot[i] >= 2 && TOWN_PLAIN[t[y][x]] && A.walk(x, y); };
    // 2×2 の区画（花壇・生け垣・荷）：区画の4マスが空き地で、まわりの1マスの輪が歩けるときだけ。区画どうしは2マス以上あける
    var used = new Uint8Array(W * H); var budget = 0; for (var yb = 3; yb < H - 3; yb++) for (var xb = 3; xb < W - 3; xb++) if (free(xb, yb)) budget++;
    var cap = Math.floor(budget * 0.3); var plotGroups = [];
    for (var y2 = 3; y2 < H - 4 && plots < cap; y2++) for (var x2 = 3; x2 < W - 4 && plots < cap; x2++) {
      if ((x2 + seed) % 2 || (y2 + seed) % 2) continue; var blk = [[x2, y2], [x2 + 1, y2], [x2, y2 + 1], [x2 + 1, y2 + 1]];
      if (!blk.every(function (b) { return free(b[0], b[1]); })) continue;
      var ringOk = true, nearUsed = false; for (var ry = y2 - 2; ry <= y2 + 3; ry++) for (var rx = x2 - 2; rx <= x2 + 3; rx++) { var inner = rx >= x2 && rx <= x2 + 1 && ry >= y2 && ry <= y2 + 1; if (inner) continue; var ring = rx >= x2 - 1 && rx <= x2 + 2 && ry >= y2 - 1 && ry <= y2 + 2; if (ring && !A.walk(rx, ry)) ringOk = false; if (used[ry * W + rx]) nearUsed = true; }
      if (!ringOk || nearUsed || hash(x2, y2, seed) < 0.35) continue;
      var ops = blk.map(function (b, k) { return [b[0], b[1], k === 0 && hash(x2, y2, seed + 1) < 0.5 ? F[1] : F[2]]; });
      plotGroups.push(ops); plots += 4; blk.forEach(function (b) { used[b[1] * W + b[0]] = 1; });   // 候補（区画どうしの間あけは、候補のうちに決める）
    }
    res.plots = tryGroups(A, B0, plotGroups, res) * 4;
  }

  // ---------- ダンジョン：入口の見通し → 狭まる通路 → 主要な空間 → 見せ場
  function themeFeature(m) {
    var place = 'cave'; try { place = (root.BattleBG65 && root.BattleBG65.placeOf && root.BattleBG65.placeOf(m.id, m.kind)) || 'cave'; } catch (e) { /* 既定 */ }
    if (/cave|mine|volcano|snow|sea|grassland/.test(place)) return 'stalactite';
    if (/forest/.test(place)) return 'tree';
    return 'pillar';
  }
  function floorNear(m, x, y) { var cnt = {}, best = null, bn = 0; for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) { var nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; var tt = m.tiles[ny][nx]; if (root.Tiles.isSolid(tt) || /stairs|warp|door|hole|bridge/.test(tt)) continue; cnt[tt] = (cnt[tt] || 0) + 1; if (cnt[tt] > bn) { bn = cnt[tt]; best = tt; } } return best || 'cave_floor'; }
  function carveRoom(A, B0, res, cx, cy, R, Dmax, wallSet) {   // (cx,cy) のまわりの壁を削って部屋にする
    var m = A.m, W = A.W, H = A.H; var D0 = distFrom(A, cx, cy, Dmax); var fl = floorNear(m, cx, cy); var ops = [];
    for (var y = cy - R; y <= cy + R; y++) for (var x = cx - R; x <= cx + R; x++) {
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) continue; if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > R * R + 0.5) continue;
      if (!wallSet[m.tiles[y][x]] || A.prot[y * W + x] < 3) continue;
      var ok = true; for (var k = 0; k < 8 && ok; k++) { var nx = x + N8[k][0], ny = y + N8[k][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; var ni = ny * W + nx; if (B0.walk0[ni] && D0[ni] < 0) ok = false; if (A.prot[ni] < 2 && B0.walk0[ni]) ok = false; }
      if (ok) ops.push([x, y, fl]);
    }
    // 削るマスは、床に（削ったマスを含めて）つながるものだけ
    var keepOps = []; var set = {}; ops.forEach(function (o) { set[o[0] + ',' + o[1]] = 1; }); var grown = true; var acc = {};
    while (grown) { grown = false; ops.forEach(function (o) { var k = o[0] + ',' + o[1]; if (acc[k]) return; var touches = N4.some(function (d) { var nx = o[0] + d[0], ny = o[1] + d[1]; return (nx >= 0 && ny >= 0 && nx < W && ny < H && B0.walk0[ny * W + nx]) || acc[nx + ',' + ny]; }); if (touches) { acc[k] = 1; keepOps.push(o); grown = true; } }); }
    if (keepOps.length < 3) return 0;
    return tryOps(A, B0, keepOps, res) ? keepOps.length : 0;
  }
  function placePillars(A, B0, res, cx, cy, R, tile, max, pathSet) {   // 広い所（まわり8マスが歩ける）に柱・岩
    var m = A.m, W = A.W, n = 0;
    for (var y = cy - R; y <= cy + R && n < max; y++) for (var x = cx - R; x <= cx + R && n < max; x++) {
      if (x < 2 || y < 2 || x >= W - 2 || y >= A.H - 2 || pathSet[y * W + x] || A.prot[y * W + x] < 3 || !A.walk(x, y) || root.Tiles.isSolid(m.tiles[y][x])) continue;
      if (!N8.every(function (d) { return A.walk(x + d[0], y + d[1]); })) continue;
      if (((x + y) & 1) !== 0) continue;
      if (tryOps(A, B0, [[x, y, tile]], res)) n++;
    }
    return n;
  }
  function dungeon(m, A, B0, res) {
    var W = A.W, H = A.H; var feat = themeFeature(m); var wallSet = WALL;
    // 入口：階段（上り）・最初のワープ。奥：下り階段・ボス・奥へのワープ・いちばん遠い宝箱
    var warps = (m.warps || []).filter(function (w) { return A.walk(w.x, w.y); }); if (!warps.length) { res.skip = 'ワープなし'; return; }
    var entry = warps[0]; var ups = []; for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (m.tiles[y][x] === 'stairs_up') ups.push([x, y]);
    if (ups.length) { var wu = warps.find(function (w) { return ups.some(function (u) { return u[0] === w.x && u[1] === w.y; }); }); if (wu) entry = wu; }
    var D = distFrom(A, entry.x, entry.y, 4000); var goal = null, gd = -1;
    var consider = function (x, y) { var best = -1; for (var k = 0; k < 4; k++) { var nx = x + N4[k][0], ny = y + N4[k][1]; if (nx >= 0 && ny >= 0 && nx < W && ny < H && D[ny * W + nx] > best) best = D[ny * W + nx]; } if (A.walk(x, y) && D[y * W + x] > best) best = D[y * W + x]; return best; };
    (m.events || []).forEach(function (e) { if (e.type === 'boss') { var d = consider(e.x, e.y); if (d > gd) { gd = d; goal = [e.x, e.y]; } } });
    if (!goal) warps.forEach(function (w) { if (w === entry) return; var d = consider(w.x, w.y); if (d > gd) { gd = d; goal = [w.x, w.y]; } });
    if (!goal) (m.chests || []).forEach(function (c) { var d = consider(c.x, c.y); if (d > gd) { gd = d; goal = [c.x, c.y]; } });
    if (!goal || gd < 12) {   // 奥の目印が近い・行けない：入口からいちばん遠い歩けるマスを奥にする
      var far = -1; for (var gi = 0; gi < W * H; gi++) if (D[gi] > far) { far = D[gi]; goal = [gi % W, (gi / W) | 0]; } gd = far;
    }
    if (!goal || gd < 12) { res.skip = '奥が近い（' + gd + '）'; return; }
    var path = bfsPath(A, entry.x, entry.y, function (x, y) { return Math.abs(x - goal[0]) + Math.abs(y - goal[1]) <= 1; }); if (!path || path.length < 12) { res.skip = '道が短い'; return; }
    var pathSet = new Uint8Array(W * H); path.forEach(function (c) { pathSet[c[1] * W + c[0]] = 1; });
    var at = function (f) { return path[Math.min(path.length - 1, Math.max(0, Math.round(path.length * f)))]; };
    var sections = []; res.sections = sections;
    // 1) 入口の見通し：入口から少し入った所の小さな前室
    var carve = function (p, R, Dm) { for (var r = R; r >= 2; r--) { var n = carveRoom(A, B0, res, p[0], p[1], r, Dm, wallSet); if (n) return n; } return 0; };
    var p1 = at(0.12); var c1 = carve(p1, 2, 5); sections.push({ kind: 'entry', x: p1[0], y: p1[1], r: 2, carved: c1 });
    // 2) 狭まる通路：幅の広い所の脇に岩・柱を置いて、幅2に
    var narrowed = 0; for (var i = Math.round(path.length * 0.25); i < Math.round(path.length * 0.45); i += 2) {
      var c = path[i], prev = path[Math.max(0, i - 1)]; var horiz = prev[1] === c[1]; var side = horiz ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]];
      side.forEach(function (sd) { var x1 = c[0] + sd[0], y1 = c[1] + sd[1], x2 = c[0] + 2 * sd[0], y2 = c[1] + 2 * sd[1]; if (x2 < 2 || y2 < 2 || x2 >= W - 2 || y2 >= H - 2) return;
        if (A.walk(x1, y1) && A.walk(x2, y2) && !pathSet[y2 * W + x2] && A.prot[y2 * W + x2] >= 3 && !root.Tiles.isSolid(A.m.tiles[y2][x2])) { if (tryOps(A, B0, [[x2, y2, feat]], res)) narrowed++; } });
    }
    var pn = at(0.35); sections.push({ kind: 'narrow', x: pn[0], y: pn[1], r: 3, placed: narrowed });
    // 3) 主要な空間：壁を削って広い部屋（＋柱）
    var p3 = at(0.62); var c3 = carve(p3, 4, 9); var pil3 = placePillars(A, B0, res, p3[0], p3[1], 4, feat, 4, pathSet); sections.push({ kind: 'main', x: p3[0], y: p3[1], r: 4, carved: c3, pillars: pil3 });
    // 4) 見せ場：奥の手前の前室と、道の左右の柱
    var p4 = at(0.88); var c4 = carve(p4, 3, 6); var pil4 = placePillars(A, B0, res, p4[0], p4[1], 3, feat, 4, pathSet); sections.push({ kind: 'climax', x: p4[0], y: p4[1], r: 3, carved: c4, pillars: pil4, goal: goal });
  }

  EL.apply = function (m) {
    var d = m && m.def; if (!EL.enabled || !d) return null;
    var skip = function (why) { EL.stats[m.id] = { skip: why }; m.envLayout = { version: EL.VERSION, kind: m.kind, changed: [], skip: why }; return null; };
    if (m.kind !== 'town' && m.kind !== 'dungeon') return null;
    if (SKIP[m.id]) return skip('専用レシピ'); if (d.noLayout) return skip('noLayout'); if (d.s3121) return skip('s3121'); if (d.onStep) return skip('onStep'); if (typeof d.rows === 'function') return skip('rows関数');
    for (var y = 0; y < m.h; y++) for (var x = 0; x < m.w; x++) { var tt = m.tiles[y][x]; if (/ice/.test(tt)) return skip('氷'); }   // 落とし穴は、まわり2マスを守るマスにして扱う
    // 同じ地図（タイル・物の位置・着く所が同じ）は、前に決めた変更をそのまま当てる（このページの中だけの覚え。決め方は毎回同じなので結果も同じ）
    var sig = signature(m); var memo = MEMO[m.id];
    if (memo && memo.sig === sig) { memo.res.changed.forEach(function (c) { m.tiles[c[1]][c[0]] = c[3]; }); m.envLayout = memo.res; return memo.res; }
    // 近道・大回りの確認の起点：ダンジョンはすべての物どうし、町は出入口（ワープ）から各物まで
    var A = analyze(m), B0 = snapshot(A);
    if (m.kind === 'town') A.srcIdx = A.anchors.map(function (a, i) { return a[2] === 'warp' ? i : -1; }).filter(function (i) { return i >= 0; });
    B0.dist = { closed: pairDist(A, A.walk), open: pairDist(A, A.walkOpen) };
    var res = { version: EL.VERSION, kind: m.kind, changed: [], rejected: 0, why: {} };
    try { if (m.kind === 'town') town(m, A, B0, res); else dungeon(m, A, B0, res); }
    catch (e) { res.changed.forEach(function (c) { m.tiles[c[1]][c[0]] = c[2]; }); res.changed = []; res.error = String(e && e.message || e); }
    var fin = invariantOk(A, B0); if (fin) { res.changed.slice().reverse().forEach(function (c) { m.tiles[c[1]][c[0]] = c[2]; }); res.error = '最後の確認で NG（' + fin + '）。元に戻した'; res.changed = []; }
    m.envLayout = res; EL.stats[m.id] = { changed: res.changed.length, rejected: res.rejected, error: res.error || null };
    MEMO[m.id] = { sig: sig, res: res };
    return res;
  };
  var MEMO = {}; EL.clearMemo = function () { MEMO = {}; };
  function signature(m) {   // タイル全部・物の位置・着く所・版（短い数に）
    var parts = [EL.VERSION, m.w, m.h, m.tiles.map(function (r) { return r.join(','); }).join(';')];
    (m.warps || []).forEach(function (w) { parts.push('w' + w.x + ',' + w.y); }); (m.events || []).forEach(function (e) { parts.push('e' + e.x + ',' + e.y + (e.solid ? 's' : '')); });
    (m.chests || []).forEach(function (c) { parts.push('c' + c.x + ',' + c.y); }); (m.npcs || []).forEach(function (n) { parts.push('n' + (n.ox !== undefined ? n.ox : n.x) + ',' + (n.oy !== undefined ? n.oy : n.y) + ',' + (n.wander || 0)); });
    (m.buildings || []).forEach(function (b) { if (b.doorAbs) parts.push('b' + b.doorAbs.x + ',' + b.doorAbs.y); });
    arrivals(m.id).forEach(function (a) { parts.push('a' + a[0] + ',' + a[1]); });
    var str = parts.join('|'), h1 = 5381, h2 = 52711; for (var i = 0; i < str.length; i++) { var ch = str.charCodeAt(i); h1 = (h1 * 33) ^ ch; h2 = (h2 * 33) ^ ch; h1 |= 0; h2 |= 0; }
    return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + ':' + str.length;
  }
  // セーブを読むとき：新しい間取りで初めて読むセーブは、読む前にスロットを控えに残す（端末ごとに1回）。立ち位置が塞がっていれば World.enterMap が近くの通れるマスへ移す
  EL.beforeStart = function (d) {
    if (!EL.enabled || !d) return; if (d.layoutVer76) return;
    // 控えを取ったかの印は、その版のセーブの名前空間に置く（2D版＝mtq-rpg-v2-layout-backup76／3D版＝mtq-3d-layout-backup76。3D版は 2D版のキーに書かない）
    var bk = ((root.Saves && root.Saves.NS) || 'mtq-rpg-v2-') + 'layout-backup76';
    try { if (root.localStorage && !root.localStorage.getItem(bk) && root.Saves && root.Saves.backup) { root.Saves.backup('間取りの作り直し（v7.6）の前'); root.localStorage.setItem(bk, String(Date.now())); } } catch (e) { /* 控えが取れなくても続ける */ }
    d.layoutVer76 = EL.VERSION;
  };
})(typeof window !== 'undefined' ? window : globalThis);
