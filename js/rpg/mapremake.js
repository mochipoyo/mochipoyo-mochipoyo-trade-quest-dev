/* =========================================================
   MapRemake（v7.1）：ダンジョンの地図の作り直し（広い道）
   ・LIST のダンジョンを、元の地図の1マスを 2×2 マスにした「2倍の細かさ」の地図に作り直す
     → 幅1マスの通路は幅2マス（壁の縁を削った所は3マス）になる。分かれ道・行き止まり・宝箱・仕掛けの順番（道順）は元のまま
   ・作り直しの手順（決まった乱数＝何度読み込んでも同じ地図）
     1) 2倍にする：壁・床・水・岩などは 2×2 に広げる（通れない所は4マスとも通れない＝元の地図で通れなかった所が通れるようにはならない）。
        苔・水たまり・階段・扉・ワープの床・宝箱は1マスだけにし、残りの3マスはまわりの床にする
     2) 壁の縁を削る：床に面した壁を1マスずつ削って、通路の幅を不ぞろいにする（2〜3マス）。削ってよいのは「削ったマスのとなりの床が
        すべて元の床で、元の地図でたがいに4歩以内」のときだけ（削ったマスどうしはつながらない）＝遠回りを省く新しい近道・抜け道はできない。
        関所・鍵の扉・出入口・宝箱のまわりは削らない
     3) 飾る：苔・水たまり（歩ける）・広い所の岩や茂み（まわり8マスが歩ける所だけ＝道をふさがない）・壁の松明・小さな泉（まわりを1マス歩ける所だけ）
   ・中にある物の置き場所：元の (x, y) → 新しい (2x, 2y)
     出入口（ワープ）は1マス。ただし地図の端の出口は、端に面したマスすべて（その出口のマスに着く所があるときは1マスのまま＝着いてすぐ戻らない）
     出来事（落とし穴・関所・鍵の扉・紋章の扉・試練の扉・壁の中の隠し通路・調べる物・石碑・ボス）は 2×2 の4マス全部に置く
       （同じフラグで一緒に開く＝脇をすり抜けられない。どのマスに立っても・どの向きから向き合っても同じ出来事。ボスの姿は1つだけ出す：dup71）
     ずっと通れない物（松明・灯籠・柱）と、宝箱・拾い物は1マス。元の地図でふさいでいた道は、横に岩などを置いて同じようにふさぐ
     人は1マス（目印の WarpMark は、となり合う同じ行き先の出入口を1つにまとめる）
   ・座標の決まり（旧座標のデータをそのまま使えるようにする）
     作り直したマップの中の物（def.warps / events / chests / npcs の x, y・SEARCH_POINTS・QUIZ_MONSTERS）は新しい座標に書きかえる
     作り直したマップ「へ」行く座標（ワープの tx, ty・物語の台本の World.enterMap・ナビの 'ev:マップ:x,y'）は旧座標のまま書き、
     World.enterMap(id, x, y, dir) が新しい座標に直す（新しい座標で入るときは 5番目の引数 { raw: true }）
   ・セーブの互換：State.data.remakeVer[id]（作り直しの版）がないセーブは、World.start で
     いる場所（pos）とミニマップの探索済み（mapDiscovery）を旧座標から新しい座標に直す（元のセーブの中身は、ほかは変えない）
   ・歩く距離が2倍になるので、そのマップの敵の出る確率は半分（同じ道のりで出会う回数は今までと同じくらい）
   ・v7.0 の MapWiden（幅1の通路を広げる）は、作り直したマップには当てない（noWiden）
   ========================================================= */
(function (root) {
  'use strict';
  var MapRemake = { VERSION: 1, SCALE: 2, maps: {} };
  // 作り直すダンジョン（物語の順）。onStep（時限の仕掛け）・氷の床・rows が関数のマップは対象にしない
  MapRemake.LIST = ['lost_forest', 'oblivion_cave_1', 'oblivion_cave_2', 'oblivion_cave_3', 'emal_pass', 'iron_mine_2', 'grania_pass', 'kalion_archive_1', 'kalion_archive_2',
    'aruna_ruins_1', 'aruna_underground_1', 'memory_library', 'temple_of_time_2', 'old_city_1', 'old_city_2', 'auto_factory_1', 'oracle_core_2', 'forbidden_archive_1', 'forbidden_archive_2',
    'origin_lab_1', 'star_tower_1', 'sky_temple_1', 'sandstorm_corridor_1', 'sandstorm_corridor_2', 'crater_altar', 'dragon_vein_1', 'spirit_forest_1', 'spirit_forest_2', 'ash_cave_1', 'demon_castle_1'];
  var S = MapRemake.SCALE;

  function hash(x, y, s) { var v = Math.sin(x * 127.1 + y * 311.7 + (s || 0) * 74.7) * 43758.5453; return v - Math.floor(v); }
  var DECOR = 'Mu';                               // 歩ける小物（苔・水たまり）
  var SINGLE = 'Mu<>@D$%';                        // 1マスだけにする文字（残りの3マスはまわりの床）
  var WALLNAME = { forest: 1, cave_wall: 1, wall: 1, castle_wall: 1, wall_wood: 1, mountain: 1, cliff: 1, tree: 1 };
  var GATE = { trial: 1, locked: 1, rank_door: 1, gate: 1 };
  // 飾りの組み合わせ（壁の種類で決める）
  var STYLE = {
    forest: { moss: 'M', puddle: '', solid: 'ZJN', torch: '', pool: '~' },
    cave_wall: { moss: 'Mu', puddle: 'u', solid: 'Yk', torch: 'i', pool: '~' },
    mountain: { moss: '', puddle: '', solid: 'Z', torch: '', pool: '' },
    wall: { moss: '', puddle: '', solid: '', torch: '', pool: '' },
    castle_wall: { moss: '', puddle: '', solid: 'I', torch: '', pool: '' }
  };

  function T() { return root.Tiles; }
  function nameOf(def, ch) { var n = T().byChar[ch]; return n || def.fallback || 'grass'; }
  function solidCh(def, ch) { return T().isSolid(nameOf(def, ch)); }

  /* ---------- 1) 2倍にする ---------- */
  function upscale(def, rows) {
    var H = rows.length, W = rows[0].length;
    var cnt = {}; for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var c = rows[y][x]; cnt[c] = (cnt[c] || 0) + 1; }
    var wallCh = null, floorCh = null, wb = -1, fb = -1;
    Object.keys(cnt).forEach(function (c) {
      var nm = nameOf(def, c);
      if (WALLNAME[nm] && cnt[c] > wb) { wb = cnt[c]; wallCh = c; }
      if (!T().isSolid(nm) && DECOR.indexOf(c) < 0 && '<>@DO'.indexOf(c) < 0 && cnt[c] > fb) { fb = cnt[c]; floorCh = c; }
    });
    wallCh = wallCh || '#'; floorCh = floorCh || '.';
    var at = function (x, y) { return (x < 0 || y < 0 || x >= W || y >= H) ? null : rows[y][x]; };
    var N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    function baseFloor(x, y) {
      var best = null, bn = 0, c2 = {};
      N4.forEach(function (d) { var c = at(x + d[0], y + d[1]); if (c === null || solidCh(def, c) || DECOR.indexOf(c) >= 0 || '<>@DO'.indexOf(c) >= 0) return; c2[c] = (c2[c] || 0) + 1; if (c2[c] > bn) { bn = c2[c]; best = c; } });
      return best || floorCh;
    }
    var G = []; for (var yy = 0; yy < H * S; yy++) G.push(new Array(W * S));
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var ch = rows[y][x], fill = ch;
      if (SINGLE.indexOf(ch) >= 0) fill = baseFloor(x, y);
      for (var dy = 0; dy < S; dy++) for (var dx = 0; dx < S; dx++) G[y * S + dy][x * S + dx] = (dx === 0 && dy === 0) ? ch : fill;
    }
    return { G: G, W: W * S, H: H * S, wallCh: wallCh, floorCh: floorCh, oldW: W, oldH: H };
  }

  /* ---------- 中の物を新しい座標へ ---------- */
  function block(x, y) { var out = []; for (var dy = 0; dy < S; dy++) for (var dx = 0; dx < S; dx++) out.push([x * S + dx, y * S + dy]); return out; }
  function moveContents(def, rows) {
    var H = rows.length, W = rows[0].length;
    var walkOld = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && !solidCh(def, rows[y][x]); };
    var narrowOld = function (x, y) { return (!walkOld(x - 1, y) && !walkOld(x + 1, y)) || (!walkOld(x, y - 1) && !walkOld(x, y + 1)); };
    // ほかの所から、このマップのどのマスに着くか（旧座標）
    var arrive = {}; var M = root.MAP_DEFS || {};
    Object.keys(M).forEach(function (k) { var d2 = M[k]; [].concat(d2.warps || [], (d2.events || []).filter(function (e) { return e && e.to; }), d2.locations || []).forEach(function (q) { if (q && q.to === def.id && typeof q.tx === 'number') arrive[q.tx + ',' + q.ty] = 1; }); });
    def._arrive71 = arrive;
    var warps = []; (def.warps || []).forEach(function (w) {
      if (!w || typeof w.x !== 'number') { warps.push(w); return; }
      var edge = (w.x === 0 || w.y === 0 || w.x === W - 1 || w.y === H - 1) && !arrive[w.x + ',' + w.y];
      var inWall = !walkOld(w.x, w.y) && !arrive[w.x + ',' + w.y];   // 壁の中の隠し通路（開くと4マスとも通路になる）：4マス全部
      block(w.x, w.y).forEach(function (p, i) {
        if (i && !inWall && !(edge && (p[0] === 0 || p[1] === 0 || p[0] === W * S - 1 || p[1] === H * S - 1 || (w.x === 0 && p[0] === 0) || (w.y === 0 && p[1] === 0) || (w.x === W - 1 && p[0] === W * S - 1) || (w.y === H - 1 && p[1] === H * S - 1)))) return;
        var c = Object.assign({}, w, { x: p[0], y: p[1] }); if (i) c.dup71 = true; warps.push(c);
      });
    });
    def.warps = warps;
    var events = []; (def.events || []).forEach(function (e) {
      if (!e || typeof e.x !== 'number') { events.push(e); return; }
      var wallTile = !walkOld(e.x, e.y);
      // ずっと通れない物（松明・灯籠・柱など：見た目のタイルが通れず、仕掛けが済んでも通れないまま）は1マスに置く（あとで宝箱と同じやり方で道をふさぐ）
      var permanent = !GATE[e.type] && e.type !== 'hole' && (e.tile ? (T().isSolid(e.tile) && (!e.doneTile || T().isSolid(e.doneTile))) : (wallTile && !e.doneFlag));
      if (permanent) e._perm71 = true;
      var dup = !permanent && e.type !== 'pickup';   // 調べる物・ボス・仕掛け・落とし穴：4マス全部（どのマスに立っても・どの向きから向き合っても同じ出来事）
      if (dup) block(e.x, e.y).forEach(function (p, i) { var c = i ? Object.assign({}, e, { x: p[0], y: p[1], dup71: true }) : e; if (!i) { e.x = p[0]; e.y = p[1]; } events.push(c); });
      else { e.x *= S; e.y *= S; events.push(e); }
    });
    def.events = events;
    (def.chests || []).forEach(function (c) { c.x *= S; c.y *= S; });
    (def.npcs || []).forEach(function (n) { n.x *= S; n.y *= S; if (n.wander) n.wander = n.wander * S; });
    [root.SEARCH_POINTS, root.QUIZ_MONSTERS].forEach(function (L) { (L || []).forEach(function (p) { if (p && p.map === def.id && typeof p.x === 'number' && !p._rm71) { p._ox = p.x; p._oy = p.y; p.x *= S; p.y *= S; p._rm71 = true; } }); });
  }

  /* ---------- 2) 壁の縁を削る・3) 飾る ---------- */
  function carveAndDecorate(def, U) {
    var G = U.G, W = U.W, H = U.H;
    var nm = function (c) { return nameOf(def, c); };
    var solidAt = {}; var prot = {}; var near = {};
    var key = function (x, y) { return x + ',' + y; };
    (def.events || []).forEach(function (e) { if (e && e.solid) solidAt[key(e.x, e.y)] = 1; prot[key(e.x, e.y)] = 1; });
    (def.warps || []).forEach(function (w) { if (w) prot[key(w.x, w.y)] = 1; });
    (def.chests || []).forEach(function (c) { prot[key(c.x, c.y)] = 1; });
    (def.npcs || []).forEach(function (n) { prot[key(n.x, n.y)] = 1; });
    [root.SEARCH_POINTS, root.QUIZ_MONSTERS].forEach(function (L) { (L || []).forEach(function (p) { if (p && p.map === def.id) prot[key(p.x, p.y)] = 1; }); });
    Object.keys(def._arrive71 || {}).forEach(function (k) { var a = k.split(','); for (var dy = 0; dy < S; dy++) for (var dx = 0; dx < S; dx++) prot[key(+a[0] * S + dx, +a[1] * S + dy)] = 1; });   // ほかの所から着くマス
    delete def._arrive71;
    // 関所・出入口・仕掛けのまわり（8方向・2マス）は削らない・飾らない
    Object.keys(prot).forEach(function (k) { var a = k.split(','); var x = +a[0], y = +a[1]; for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) near[key(x + dx, y + dy)] = 1; });
    var walk = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && !T().isSolid(nm(G[y][x])) && !solidAt[key(x, y)]; };
    var N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    // 削る前に歩けたマス（元の床）
    var W0 = {}; for (var y0 = 0; y0 < H; y0++) for (var x0 = 0; x0 < W; x0++) if (walk(x0, y0)) W0[key(x0, y0)] = 1;
    function within0(a, b, lim) {   // 削る前の地図で、a から b まで lim 歩以内で行けるか
      var seen = {}; seen[key(a[0], a[1])] = 1; var q = [[a[0], a[1], 0]];
      while (q.length) { var c = q.shift(); if (c[0] === b[0] && c[1] === b[1]) return true; if (c[2] >= lim) continue; N4.forEach(function (d) { var nx = c[0] + d[0], ny = c[1] + d[1]; var k = key(nx, ny); if (seen[k] || !W0[k]) return; seen[k] = 1; q.push([nx, ny, c[2] + 1]); }); }
      return false;
    }
    var stats = { carved: 0, moss: 0, rocks: 0, torches: 0, pools: 0 };
    // 壁の縁を1マスだけ削る：となりの歩けるマスがすべて「元の床」で、元の地図でたがいに4歩以内のときだけ
    // （削ったマスどうしはつながらない＝削ったマスをいくつ通っても、1か所で縮むのは2歩まで。壁を奥へ掘り進めることはない）
    for (var y = 1; y < H - 1; y++) for (var x = 1; x < W - 1; x++) {
      var c = G[y][x]; if (!WALLNAME[nm(c)] || near[key(x, y)] || hash(x, y, 11) > 0.5) continue;
      var ns = N4.map(function (d) { return [x + d[0], y + d[1]]; }).filter(function (p) { return walk(p[0], p[1]); });
      if (!ns.length || !ns.every(function (p) { return W0[key(p[0], p[1])]; })) continue;
      var ok = true; for (var i = 1; i < ns.length && ok; i++) ok = within0(ns[0], ns[i], 4);
      if (!ok) continue;
      var fc = null; ns.some(function (p) { var cc = G[p[1]][p[0]]; if (DECOR.indexOf(cc) < 0 && '<>@DO'.indexOf(cc) < 0) { fc = cc; return true; } return false; });
      G[y][x] = fc || U.floorCh; stats.carved++;
    }
    var st = STYLE[nm(U.wallCh)] || STYLE.wall;
    var isFloor = function (x, y) { return walk(x, y) && G[y][x] === U.floorCh && !near[key(x, y)]; };
    var allOpen = function (x, y, r) { for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) if (!isFloor(x + dx, y + dy)) return false; return true; };
    // 小さな泉（2×2 の水。まわり1マスはすべて歩ける床のときだけ）
    if (st.pool) {
      var pools = 0;
      for (var py = 2; py < H - 3 && pools < 3; py++) for (var px = 2; px < W - 3 && pools < 3; px++) {
        if (hash(px, py, 31) > 0.05) continue; var ok2 = true;
        for (var yy = py - 1; yy <= py + 2 && ok2; yy++) for (var xx = px - 1; xx <= px + 2 && ok2; xx++) ok2 = isFloor(xx, yy);
        if (!ok2) continue;
        for (yy = py; yy <= py + 1; yy++) for (xx = px; xx <= px + 1; xx++) { G[yy][xx] = st.pool; near[key(xx, yy)] = 1; }
        for (yy = py - 1; yy <= py + 2; yy++) for (xx = px - 1; xx <= px + 2; xx++) near[key(xx, yy)] = 1;   // 泉のまわりには岩を置かない
        pools++;
      }
      stats.pools = pools;
    }
    // 広い所の岩・茂み（まわり8マスが歩ける床の所だけ。となりに続けて置かない）
    if (st.solid) for (var ry = 1; ry < H - 1; ry++) for (var rx = 1; rx < W - 1; rx++) {
      if (hash(rx, ry, 41) > 0.07 || !allOpen(rx, ry, 1)) continue;
      G[ry][rx] = st.solid[Math.floor(hash(rx, ry, 43) * st.solid.length)]; stats.rocks++;
      for (var dy2 = -1; dy2 <= 1; dy2++) for (var dx2 = -1; dx2 <= 1; dx2++) near[key(rx + dx2, ry + dy2)] = 1;
    }
    // 苔・水たまり（歩ける）
    if (st.moss) for (var my = 0; my < H; my++) for (var mx = 0; mx < W; mx++) { if (!isFloor(mx, my) || hash(mx, my, 51) > 0.07) continue; G[my][mx] = st.moss[Math.floor(hash(mx, my, 53) * st.moss.length)]; stats.moss++; }
    // 壁の松明（床に面した壁。どちらも通れないので道は変わらない）
    if (st.torch) for (var ty = 0; ty < H; ty++) for (var tx = 0; tx < W; tx++) {
      if (!WALLNAME[nm(G[ty][tx])] || hash(tx, ty, 61) > 0.035) continue;
      if (!N4.some(function (d) { return walk(tx + d[0], ty + d[1]); })) continue;
      G[ty][tx] = st.torch; stats.torches++;
    }
    return stats;
  }

  MapRemake.remake = function (id) {
    var M = root.MAP_DEFS || {}; var def = M[id];
    if (!def || def.remake71 || typeof def.rows === 'function' || def.onStep || !def.rows || !def.rows.length) return null;
    if (def.rows.some(function (r) { return /[\u0000]/.test(r); })) return null;
    var rows = def.rows.slice();
    // 作り直す前の中身（旧座標）を残す（テスト・調べもの用。ゲームでは使わない）
    var cl = function (L) { return (L || []).map(function (o) { return o && typeof o === 'object' ? Object.assign({}, o) : o; }); };
    var old = { rows: rows, warps: cl(def.warps), events: cl(def.events), chests: cl(def.chests), npcs: cl(def.npcs) };
    var U = upscale(def, rows);
    moveContents(def, rows);
    // 通れない1マスの物（宝箱・通れない出来事のうち4マスにしなかったもの）：元の地図でその物がふさいでいた道を、新しい地図でもふさぐ
    //   まわり4方向がすべて歩ける（部屋の中）→ 左上の1マスに置き、残りは床のまま
    //   まっすぐな通路の途中 → 物と、通路を横切る向きの1マスでふさぎ、反対側にも1マスの床を残す（両側から開けられる）
    //   それ以外（曲がり角・行き止まり・T字）→ 歩ける側に面したマスに置き、残りの3マスは通れない物（岩・茂みなど）にする
    var walkOld = function (x, y) { return x >= 0 && y >= 0 && x < U.oldW && y < U.oldH && !solidCh(def, rows[y][x]); };
    var blockCh = (STYLE[nameOf(def, U.wallCh)] || STYLE.wall).solid.charAt(0) || U.wallCh;
    var CELL = [[0, 0, 'UL'], [1, 0, 'UR'], [0, 1, 'DL'], [1, 1, 'DR']];
    var solidTileOf = function (e) { var t = e.tile || (e.type === 'pickup' ? 'chest' : null); return !!(t && T().isSolid(t)); };
    var objs = (def.chests || []).map(function (c) { return { o: c }; }).concat((def.events || []).filter(function (e) { return e && !e.dup71 && (e.solid || solidTileOf(e) || e._perm71) && !((def.events || []).some(function (e2) { return e2 !== e && e2.dup71 && e2.doneFlag === e.doneFlag && e2.type === e.type && Math.abs(e2.x - e.x) <= 1 && Math.abs(e2.y - e.y) <= 1; })); }).map(function (e) { return { o: e }; }));
    // 元の地図で、物をすべて通れないものとしたときのつながり（どの側が広い場所につながっているか）
    var objAt = {}; objs.forEach(function (it) { objAt[(it.o.x / S) + ',' + (it.o.y / S)] = 1; });
    var comp = {}, csize = [];
    for (var cy = 0; cy < U.oldH; cy++) for (var cx = 0; cx < U.oldW; cx++) {
      if (comp[cx + ',' + cy] !== undefined || !walkOld(cx, cy) || objAt[cx + ',' + cy]) continue;
      var cid = csize.length, n = 0, q = [[cx, cy]]; comp[cx + ',' + cy] = cid;
      while (q.length) { var a = q.pop(); n++; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = a[0] + d[0], ny = a[1] + d[1], k = nx + ',' + ny; if (comp[k] !== undefined || !walkOld(nx, ny) || objAt[k]) return; comp[k] = cid; q.push([nx, ny]); }); }
      csize.push(n);
    }
    objs.forEach(function (it) {
      var c = it.o; var ox = c.x / S, oy = c.y / S; if (ox !== Math.floor(ox) || oy !== Math.floor(oy)) return;
      var side = function (dx, dy) { var k = (ox + dx) + ',' + (oy + dy); return walkOld(ox + dx, oy + dy) && !objAt[k] ? comp[k] : undefined; };
      var O = { U: side(0, -1), D: side(0, 1), L: side(-1, 0), R: side(1, 0) };
      var has = function (k) { return O[k] !== undefined; };
      if (has('U') && has('D') && has('L') && has('R')) return;
      var X = c.x, Y = c.y;
      var fl = null; [[0, -1], [0, 1], [-1, 0], [1, 0]].some(function (d) { var ch = walkOld(ox + d[0], oy + d[1]) ? rows[oy + d[1]][ox + d[0]] : null; if (ch && DECOR.indexOf(ch) < 0 && '<>@DO'.indexOf(ch) < 0) { fl = ch; return true; } return false; });
      fl = fl || U.floorCh; var put = function (dx, dy, ch) { U.G[Y + dy][X + dx] = ch; };
      var oc = (it.o._perm71 && !it.o.tile) ? rows[oy][ox] : fl;   // 見た目が地図の文字の物（松明など）はその文字のまま。宝箱などは床（上に宝箱の絵）
      if (has('L') && has('R') && !has('U') && !has('D')) { put(0, 0, oc); put(1, 0, fl); put(0, 1, blockCh); put(1, 1, fl); return; }   // 横の通路：左の列をふさぐ（右上・右下は床）
      if (has('U') && has('D') && !has('L') && !has('R')) { put(0, 0, oc); put(0, 1, fl); put(1, 0, blockCh); put(1, 1, fl); return; }   // 縦の通路：上の行をふさぐ（左下・右下は床）
      var best = CELL[0], bn = -1;
      CELL.forEach(function (cc) {   // 面している側の広さ（同じつながりは1回だけ数える）がいちばん大きいマス。同じなら、面している歩ける側が多いマス
        var seen = {}, sc = 0, ns = 0; cc[2].match(/[UDLR]/g).forEach(function (k) { if (!has(k)) return; ns++; if (seen[O[k]]) return; seen[O[k]] = 1; sc += csize[O[k]]; });
        sc = sc * 10 + ns; if (sc > bn) { bn = sc; best = cc; }
      });
      CELL.forEach(function (cc) { put(cc[0], cc[1], cc === best ? oc : blockCh); });
      c.x = X + best[0]; c.y = Y + best[1];
    });
    // ずっと通れない物の「調べる」出来事（本棚の古文書・松明・灯籠など）：2×2 のほかのマスにも写しを置く（どの向きから向き合っても調べられる）。
    //   写しを置くのは、2×2 の外に歩けるマスが接しているマスだけ。歩けるマスに置く写しは通れる（道は変わらない）
    var walkG = function (x, y) { return x >= 0 && y >= 0 && x < U.W && y < U.H && !solidCh(def, U.G[y][x]); };
    objs.forEach(function (it) {
      var e = it.o; if (!e._perm71 || (def.chests || []).indexOf(e) >= 0) return;
      var X = Math.floor(e.x / S) * S, Y = Math.floor(e.y / S) * S;
      CELL.forEach(function (cc) {
        var x = X + cc[0], y = Y + cc[1]; if (x === e.x && y === e.y) return;
        var out = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { var nx = x + d[0], ny = y + d[1]; return (nx < X || nx >= X + S || ny < Y || ny >= Y + S) && walkG(nx, ny); });
        if (!out) return;
        def.events.push(Object.assign({}, e, { x: x, y: y, dup71: true, solid: walkG(x, y) ? false : e.solid, tile: walkG(x, y) ? undefined : e.tile }));
      });
    });
    var stats = carveAndDecorate(def, U);
    def.rows = U.G.map(function (r) { return r.join(''); });
    def.noWiden = true;
    if (def.encounters && typeof def.encounters.rate === 'number') def.encounters = Object.assign({}, def.encounters, { rate: def.encounters.rate / S });
    def.remake71 = { version: MapRemake.VERSION, scale: S, oldW: U.oldW, oldH: U.oldH, oldRows: rows, old: old, stats: stats };
    MapRemake.maps[id] = def.remake71;
    return def.remake71;
  };
  MapRemake.applyAll = function () { MapRemake.LIST.forEach(function (id) { try { MapRemake.remake(id); } catch (e) { if (root.console) console.error('MapRemake', id, e); } }); };
  MapRemake.isRemade = function (id) { return !!MapRemake.maps[id]; };
  // 旧座標 → 新しい座標（作り直していないマップはそのまま）
  // dir（向き）を渡すと、2×2 のうち「その向きの先のマスに面した」マスにする（右向きなら右上、下向きなら左下）
  //   ＝旧座標で「となりの物の方を向いて立つ」書き方（物語の台本・テスト）が、新しい地図でもそのまま「となりの物の方を向いて立つ」になる
  MapRemake.pos = function (id, x, y, dir) {
    var r = MapRemake.maps[id]; if (!r || typeof x !== 'number' || typeof y !== 'number') return { x: x, y: y };
    if (r.mapPos) return r.mapPos(Math.min(x, r.oldW - 1), Math.min(y, r.oldH - 1));   // v7.6 広げた屋内（js/rpg/interior76.js）：列・行を差し込んだ分だけずらす
    var ox = dir === 'right' ? 1 : 0, oy = dir === 'down' ? 1 : 0;
    return { x: Math.min(x * S + ox, r.oldW * S - 1), y: Math.min(y * S + oy, r.oldH * S - 1) };
  };

  /* ---------- セーブの互換（World.start から呼ぶ） ---------- */
  MapRemake.migrate = function (d) {
    if (!d) return; d.remakeVer = d.remakeVer || {};
    Object.keys(MapRemake.maps).forEach(function (id) {
      var r = MapRemake.maps[id]; if (d.remakeVer[id] === r.version) return;
      var fromPrev = !!(r.prev && r.fromPrev && d.remakeVer[id] === r.prev.version);   // v8.1 前の作り直し（広げた屋内など）の座標で書かれたセーブ → その上に重ねた作り直し（js/rpg/remake81.js）の分だけ直す
      if (d.pos && d.pos.map === id) { var p = fromPrev ? r.fromPrev(d.pos.x, d.pos.y) : MapRemake.pos(id, d.pos.x, d.pos.y); if (r.freeNear) p = r.freeNear(p.x, p.y); d.pos.x = p.x; d.pos.y = p.y; }   // v8.1 人の立つマスに着かない
      var disc = d.mapDiscovery && d.mapDiscovery[id];
      var mapBack = fromPrev ? r.backPrev : r.mapBack;
      if (disc && disc.length && mapBack) {   // v7.6 広げた屋内：探索済みの印を新しい座標へ（差し込んだマスは、元になったマスの印を写す）
        var o2 = []; var has = function (x, y) { var row = disc[y]; return !!(row && ((row[(x / 30) | 0] || 0) & (1 << (x % 30)))); };
        var nw = r.newW || r.oldW, nh = r.newH || r.oldH;
        for (var Y = 0; Y < nh; Y++) { o2[Y] = []; for (var X = 0; X < nw; X++) { var b = mapBack(X, Y); if (has(b.x, b.y)) { var ii = (X / 30) | 0; o2[Y][ii] = (o2[Y][ii] || 0) | (1 << (X % 30)); } } }
        d.mapDiscovery[id] = o2;
      }
      else if (disc && disc.length) {
        var out = [];
        var bit = function (x, y) { out[y] = out[y] || []; var i = (x / 30) | 0; out[y][i] = (out[y][i] || 0) | (1 << (x % 30)); };
        for (var y = 0; y < disc.length; y++) { var row = disc[y]; if (!row) continue; for (var i = 0; i < row.length; i++) { var v = row[i] || 0; if (!v) continue; for (var b = 0; b < 30; b++) if (v & (1 << b)) { var x = i * 30 + b; for (var dy = 0; dy < S; dy++) for (var dx = 0; dx < S; dx++) bit(x * S + dx, y * S + dy); } } }
        for (var k = 0; k < out.length; k++) if (!out[k]) out[k] = [];
        d.mapDiscovery[id] = out;
      }
      d.remakeVer[id] = r.version;
    });
  };

  root.MapRemake = MapRemake;
  MapRemake.applyAll();
})(typeof window !== 'undefined' ? window : globalThis);
