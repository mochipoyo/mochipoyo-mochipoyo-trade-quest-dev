/* =========================================================
   RPG / Harbors (v6.2) : 港・桟橋・上陸地点・航路（2D/3D 共通。描画は含まない）
   ・HARBORS：船を停められる場所（実在するタイルの座標だけを登録する）
   ・lane()：乗り物で進める海の上の最短経路（地図の実際のタイルから計算。ミニマップの「航路」の線に使う）
   ・landmass()：上陸したマスから歩いて行ける陸地のかたまりと、その中の施設の数（無人島の判定・到達性の検証）
   ・recall()：取り残した船・飛空艇を港（母港）へ戻す。乗り物の解放条件（unlockFlag）や海路の needFlag には触れない
   ========================================================= */
(function (root) {
  'use strict';
  var Harbors = {};
  var SHIPS = ['sailboat', 'galleon'];
  // moor：船を停める海のマス（そこから最も近い「海で、隣に陸があり、外海につながる」マスを実際の停泊位置にする）
  // land：桟橋・船着き場の陸のマス。area：上陸したときに表示する地名
  var HARBORS = {
    marina: { id: 'marina', map: 'world', name: '港町マリナの船着き場', area: 'アルカディア相場大陸・西岸', moor: { x: 18, y: 73 }, land: { x: 19, y: 73 }, near: 'harbor', home: true, vehicles: SHIPS },   // moor＝船が出現する海のマス（VEHICLES.home 19,72 の近くの海）
    grania_west_pier: { id: 'grania_west_pier', map: 'world_grania', name: '灰の浜の桟橋', area: 'グラニア鉱業地方・西岸', moor: { x: 20, y: 52 }, land: { x: 21, y: 52 }, near: 'ash_shore', vehicles: SHIPS }
  };
  Harbors.HARBORS = HARBORS;
  function D() { return root.State.data; }
  Harbors.get = function (id) { return HARBORS[id] || null; };
  Harbors.list = function (mapId) { return Object.keys(HARBORS).map(function (k) { return HARBORS[k]; }).filter(function (h) { return !mapId || h.map === mapId; }); };
  // 乗り物の母港（VEHICLES.home）
  Harbors.homeOf = function (vid) { var def = root.VEHICLES[vid]; return def ? def.home : null; };

  /* ---------- 停泊位置 ---------- */
  // 他の乗り物と重ならない停泊マス
  Harbors.spot = function (h, vid) {
    var map = root.World.getMap(h.map); var V = root.Vehicle; var others = (D().vehicles) || {};
    var taken = {}; Object.keys(others).forEach(function (k) { var s = others[k]; if (k !== vid && s && s.owned && s.map === h.map) taken[s.x + ',' + s.y] = 1; });
    for (var r = 0; r <= 10; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; var x = h.moor.x + dx, y = h.moor.y + dy; if (taken[x + ',' + y]) continue;
      var one = V.findWaterNear(map, x, y, vid); if (one && one.x === x && one.y === y) return one;
    }
    return V.findWaterNear(map, h.moor.x, h.moor.y, vid);
  };
  // その乗り物が、この港（または母港）の近く（4マス以内）にいるか
  Harbors.isAt = function (vid, h) { var s = root.Vehicle.state(vid); if (!s || !s.owned) return false; return s.map === h.map && Math.abs(s.x - h.moor.x) <= 4 && Math.abs(s.y - h.moor.y) <= 4; };
  Harbors.isHome = function (vid) { var s = root.Vehicle.state(vid), home = Harbors.homeOf(vid); if (!s || !s.owned || !home) return false; return s.map === home.map && Math.abs(s.x - home.x) <= 4 && Math.abs(s.y - home.y) <= 4; };
  // 持っているのに、ここ（港）にいない乗り物
  Harbors.away = function (h) { return (h.vehicles || SHIPS).filter(function (vid) { return root.Vehicle.owned(vid) && D().aboard !== vid && !Harbors.isAt(vid, h); }); };
  Harbors.awayFromHome = function () { return Object.keys(root.VEHICLES).filter(function (vid) { return root.Vehicle.owned(vid) && D().aboard !== vid && !Harbors.isHome(vid); }); };
  // 呼び戻す：h は港（HARBORS の項目）または母港（{ map, x, y }）
  Harbors.recall = function (vid, h) {
    var s = root.Vehicle.state(vid); if (!s || !s.owned || D().aboard === vid) return null;
    var target = h.moor ? h : { map: h.map, moor: { x: h.x, y: h.y } };
    var sp = Harbors.spot(target, vid); if (!sp) return null;
    s.map = target.map; s.x = sp.x; s.y = sp.y; s.port = { map: target.map, x: sp.x, y: sp.y };
    if (root.Minimap) root.Minimap.markDirty(target.map);
    return { map: target.map, x: sp.x, y: sp.y };
  };
  Harbors.recallHome = function (vid) { var home = Harbors.homeOf(vid); return home ? Harbors.recall(vid, home) : null; };

  /* ---------- 方角と距離 ---------- */
  var DIR8 = ['東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西', '北', '北北東', '北東', '東北東'];
  Harbors.direction = function (fx, fy, tx, ty) {
    var dx = tx - fx, dy = ty - fy; if (!dx && !dy) return 'すぐそこ';
    var a = Math.atan2(dy, dx); var i = Math.round(a / (Math.PI / 8)); i = ((i % 16) + 16) % 16;
    return DIR8[i] + 'へ約' + Math.max(Math.abs(dx), Math.abs(dy)) + 'マス';
  };

  /* ---------- 航路（海の上の最短経路） ---------- */
  var laneCache = {};
  // 乗り物で進めるマスだけを通る経路。goal は「そのマス」か「そのマスに隣接（上陸）」で到達とみなす（adj=true）
  Harbors.lane = function (map, fx, fy, tx, ty, vid, adj) {
    var V = root.Vehicle; if (!V.def(vid)) return null;
    var key = map.id + ':' + vid + ':' + fx + ',' + fy + '>' + tx + ',' + ty + (adj ? 'a' : '');
    if (laneCache[key] !== undefined) return laneCache[key];
    var W = map.w, H = map.h; var prev = new Int32Array(W * H).fill(-2); var q = [fy * W + fx]; prev[fy * W + fx] = -1; var found = -1; var head = 0;
    var flies = V.flies && V.flies(vid);
    function ok(x, y) { if (x < 0 || y < 0 || x >= W || y >= H) return false; if (flies) return true; var t = map.tiles[y][x]; return V.def(vid).terrain.indexOf(t) >= 0; }
    while (head < q.length) {
      var c = q[head++]; var cx = c % W, cy = (c / W) | 0;
      if ((cx === tx && cy === ty) || (adj && Math.abs(cx - tx) + Math.abs(cy - ty) === 1)) { found = c; break; }
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < 4; i++) { var nx = cx + nb[i][0], ny = cy + nb[i][1]; if (!ok(nx, ny)) continue; var k = ny * W + nx; if (prev[k] !== -2) continue; prev[k] = c; q.push(k); }
    }
    var path = null;
    if (found >= 0) { path = []; for (var k2 = found; k2 >= 0; k2 = prev[k2]) path.push({ x: k2 % W, y: (k2 / W) | 0 }); path.reverse(); }
    if (Object.keys(laneCache).length > 60) laneCache = {};
    laneCache[key] = path; return path;
  };
  Harbors.clearCache = function () { laneCache = {}; massCache = {}; };

  /* ---------- 地域の出口（海路） ---------- */
  // この地図から出られる海路（いまの乗り物で通れて、needFlag を満たすもの）。exit：航路の線の終点（端のマス）
  Harbors.exits = function (map, vid) {
    var d = D(); var out = [];
    (root.SEA_ROUTES || []).forEach(function (r) {
      if (r.from.map !== map.id) return; var usable = !vid || r.vehicle.indexOf(vid) >= 0; var open = !r.needFlag || d.flags[r.needFlag];
      var e = r.from.edge; var dest = Harbors.list(r.to.map)[0];
      var along = dest ? ((e === 'east' || e === 'west') ? dest.moor.y : dest.moor.x) : null;
      out.push({ route: r, edge: e, usable: usable, open: !!open, along: along, toMap: r.to.map, harbor: dest || null });
    });
    return out;
  };
  // 端の上で、along（y または x）に最も近い「乗り物で進めるマス」
  Harbors.edgePoint = function (map, edge, along, vid, fromX, fromY) {
    var V = root.Vehicle; var best = null; var n = (edge === 'east' || edge === 'west') ? map.h : map.w;
    var ref = along !== null && along !== undefined ? along : ((edge === 'east' || edge === 'west') ? fromY : fromX);
    for (var i = 0; i < n; i++) {
      var x = edge === 'east' ? map.w - 1 : edge === 'west' ? 0 : i, y = edge === 'south' ? map.h - 1 : edge === 'north' ? 0 : i;
      if (!(V.flies && V.flies(vid)) && !V.terrainOk(vid, map, x, y)) continue;
      var dist = Math.abs(i - ref); if (!best || dist < best.dist) best = { x: x, y: y, dist: dist };
    }
    return best;
  };

  /* ---------- 陸地のかたまり（無人島の判定・到達性） ---------- */
  var massCache = {};
  var ICONS = { village: 1, castle_icon: 1, cave_icon: 1, tower_icon: 1 };
  function walkable(map, x, y) {
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) return false; var t = map.tiles[y][x];
    if (ICONS[t]) return true; if (root.Tiles.isWater(t)) return false; return !root.Tiles.isSolid(t);
  }
  Harbors.landmass = function (map, x, y) {
    var c = massCache[map.id]; var W = map.w, H = map.h;
    if (!c) {
      c = massCache[map.id] = { comp: new Int32Array(W * H).fill(-1), list: [] };
      for (var sy = 0; sy < H; sy++) for (var sx = 0; sx < W; sx++) {
        if (c.comp[sy * W + sx] >= 0 || !walkable(map, sx, sy)) continue;
        var id = c.list.length; var info = { id: id, size: 0, locations: [], npcs: 0, events: 0, chests: 0, x: sx, y: sy }; c.list.push(info);
        var st = [sy * W + sx]; c.comp[sy * W + sx] = id;
        while (st.length) { var k = st.pop(); info.size++; var kx = k % W, ky = (k / W) | 0; var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]]; for (var i = 0; i < 4; i++) { var nx = kx + nb[i][0], ny = ky + nb[i][1]; if (!walkable(map, nx, ny)) continue; var kk = ny * W + nx; if (c.comp[kk] >= 0) continue; c.comp[kk] = id; st.push(kk); } }
      }
      var at = function (o) { return o.x >= 0 && o.y >= 0 && o.x < W && o.y < H ? c.comp[o.y * W + o.x] : -1; };
      (map.def.locations || []).forEach(function (L) { var i2 = at(L); if (i2 >= 0) c.list[i2].locations.push(L); });
      (map.npcs || []).forEach(function (n) { var i2 = at(n); if (i2 >= 0) c.list[i2].npcs++; });
      (map.events || []).forEach(function (e) { var i2 = at(e); if (i2 >= 0) c.list[i2].events++; });
      (map.chests || []).forEach(function (e) { var i2 = at(e); if (i2 >= 0) c.list[i2].chests++; });
    }
    if (x < 0 || y < 0 || x >= W || y >= H) return null; var ci = c.comp[y * W + x]; return ci >= 0 ? c.list[ci] : null;
  };
  // 見えている施設（隠し場所は数えない）
  Harbors.visibleLocations = function (mass) { var d = D(); return (mass ? mass.locations : []).filter(function (L) { return !L.hidden || d.flags[L.needFlag]; }); };

  /* ---------- 上陸したときの地名 ---------- */
  Harbors.areaName = function (map, x, y) {
    var hs = Harbors.list(map.id); for (var i = 0; i < hs.length; i++) { var h = hs[i]; if (Math.abs(h.moor.x - x) <= 6 && Math.abs(h.moor.y - y) <= 6) return h.area + '（' + h.name + '）'; }
    var mass = Harbors.landmass(map, x, y); var name = map.name || '';
    var dir = (function () { var cx = map.w / 2, cy = map.h / 2; var dx = x - cx, dy = y - cy; var ns = dy < -map.h / 6 ? '北' : dy > map.h / 6 ? '南' : ''; var ew = dx < -map.w / 6 ? '西' : dx > map.w / 6 ? '東' : ''; return (ns + ew) || '中央'; })();
    if (mass && !Harbors.visibleLocations(mass).length && !mass.npcs && mass.size < 2000) return name + '・' + dir + 'の無人島（町や施設はない）';
    // 近くの施設
    var near = null, nd = 1e9; Harbors.visibleLocations(mass).forEach(function (L) { var dd = Math.abs(L.x - x) + Math.abs(L.y - y); if (dd < nd) { nd = dd; near = L; } });
    return name + '・' + dir + 'の海岸' + (near && nd <= 40 ? '（' + near.name + 'が近い）' : '');
  };

  /* ---------- 海域に入ったときの案内 ---------- */
  Harbors.arrivalHint = function (mapId, x, y) {
    var hs = Harbors.list(mapId); if (!hs.length) return null; var h = hs[0];
    return h.name + '（' + h.area + '）は、ここから' + Harbors.direction(x, y, h.moor.x, h.moor.y) + '。ミニマップの点線が航路。';
  };

  /* ---------- 桟橋番・船乗りの会話（取り残し防止） ---------- */
  Harbors.keeperTalk = async function (c, harborId) {
    var h = HARBORS[harborId]; if (!h) return;
    var lines = harborId === 'grania_west_pier'
      ? ['ここは灰の浜の桟橋。グラニア鉱業地方の西岸だ。', '東へすぐ行けば灰の浜の番小屋。そこから東へ続く道を進めば、灰鉱町ヴェルムに着く。', '西の海へ出れば、アルカディア相場大陸に戻れる。']
      : ['ここは' + h.name + 'だ。'];
    await c.say('桟橋番', lines);
    var away = Harbors.away(h);
    if (!away.length) { if (Harbors.list(h.map).length && root.Vehicle.onMap(h.map).length) await c.say('桟橋番', ['船はちゃんと見張っておく。安心して行ってきな。']); return; }
    var names = away.map(function (v) { return root.VEHICLES[v].name; });
    var opts = away.map(function (v) { return root.VEHICLES[v].name + 'をこの桟橋に呼ぶ'; }).concat(['今はいい']);
    var i = await c.choice('船が近くにないな。伝書カモメで呼んでやろうか？', opts);
    if (i < 0 || i >= away.length) return;
    var r = Harbors.recall(away[i], h);
    if (r) { await c.msg([names[i] + 'が' + h.name + 'に着いた。（海の上の位置：' + r.x + ', ' + r.y + '）']); if (root.State.autosave) root.State.autosave(); }
    else await c.msg(['……今は船を停められる場所が空いていないようだ。']);
  };
  // v6.2 古いセーブ：船が今は陸（新しい桟橋など）になったマスに停まっていたら、近くの海へ移す（乗っていなければ）
  Harbors.fixParked = function (map) {
    var d = D(); if (!d || !d.vehicles || !map) return; var V = root.Vehicle;
    Object.keys(d.vehicles).forEach(function (vid) { var s = d.vehicles[vid]; if (!s || !s.owned || s.map !== map.id || d.aboard === vid || V.flies(vid)) return; if (V.terrainOk(vid, map, s.x, s.y)) return; var sp = V.findWaterNear(map, s.x, s.y, vid); if (sp) { s.x = sp.x; s.y = sp.y; } });
  };
  if (root.MAP_ENTER_HOOKS) root.MAP_ENTER_HOOKS.push(function (map) { Harbors.fixParked(map); });
  root.Harbors = Harbors;
})(typeof window !== 'undefined' ? window : globalThis);
