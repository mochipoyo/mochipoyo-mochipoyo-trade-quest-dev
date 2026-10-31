/* =========================================================
   RPG / Vehicle (v5.0) : 乗り物のロジック（描画は含まない。2D/3D 共通）
   ・State.data.vehicles[id] = { owned, map, x, y, port:{map,x,y} }   State.data.aboard = id | null
   ・乗船：陸から乗り物のいるマスへ進む。航行：乗り物の terrain のマスだけ進める。下船：乗ったまま隣の通れる陸へ進む（乗り物はその場に残る）
   ・全滅：乗り物は最後に乗った港（port）へ戻り、プレイヤーは宿へ
   ・海路：地域マップの端に到達すると別の地域の端へ（乗り物ごと）
   ========================================================= */
(function (root) {
  'use strict';
  var Vehicle = {};
  function D() { return root.State.data; }
  function V() { var d = D(); d.vehicles = d.vehicles || {}; return d.vehicles; }
  Vehicle.def = function (id) { return root.VEHICLES[id]; };
  Vehicle.aboard = function () { return D().aboard || null; };
  Vehicle.state = function (id) { return V()[id] || null; };
  Vehicle.owned = function (id) { var s = Vehicle.state(id); return !!(s && s.owned); };
  Vehicle.at = function (mapId, x, y) { var vs = V(); for (var k in vs) { var s = vs[k]; if (s.owned && s.map === mapId && s.x === x && s.y === y && D().aboard !== k) return k; } return null; };
  Vehicle.onMap = function (mapId) { var vs = V(), out = []; for (var k in vs) { var s = vs[k]; if (s.owned && s.map === mapId) out.push({ id: k, x: s.x, y: s.y, aboard: D().aboard === k }); } return out; };
  // 乗り物で進めるマスか
  Vehicle.terrainOk = function (id, map, x, y) {
    var def = Vehicle.def(id); if (!def) return false; if (x < 0 || y < 0 || x >= map.w || y >= map.h) return false;
    var t = map.tiles[y][x]; if (def.terrain[0] === '*') return !map.npcAt(x, y);
    return def.terrain.indexOf(t) >= 0 && !map.npcAt(x, y);
  };
  // 解放：フラグが立っていれば港に出現させる（1回だけ）。home の近くで「海で、隣に通れる陸がある」マスを探す
  Vehicle.unlockIfReady = function () {
    var d = D(); var out = [];
    Object.keys(root.VEHICLES).forEach(function (id) {
      var def = root.VEHICLES[id]; if (def.future) return; if (!d.flags[def.unlockFlag]) return; if (Vehicle.owned(id)) return;
      var map = root.World.getMap(def.home.map); var spot = Vehicle.findWaterNear(map, def.home.x, def.home.y, id);
      if (!spot) return;
      V()[id] = { owned: true, map: def.home.map, x: spot.x, y: spot.y, port: { map: def.home.map, x: spot.x, y: spot.y } };
      out.push(id);
    });
    return out;
  };
  Vehicle.findWaterNear = function (map, x0, y0, id) {
    for (var r = 0; r <= 10; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; var x = x0 + dx, y = y0 + dy;
      if (!Vehicle.terrainOk(id, map, x, y)) continue; if (map.warpAt(x, y)) continue;
      // 隣に通れる陸（乗降できる）
      var land = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { var lx = x + d[0], ly = y + d[1]; return lx >= 0 && ly >= 0 && lx < map.w && ly < map.h && !root.Tiles.isWater(map.tiles[ly][lx]) && map.passable(lx, ly, D()) && !map.warpAt(lx, ly); });
      if (land && Vehicle.openWater(map, x, y, id, 60)) return { x: x, y: y };
    }
    return null;
  };
  // そのマスから乗り物で進める範囲が十分に広いか（孤立した浅瀬に船を置かない）
  Vehicle.openWater = function (map, x, y, id, need) {
    var seen = {}; var q = [[x, y]]; seen[x + ',' + y] = 1; var n = 0;
    while (q.length && n < need) { var c = q.shift(); n++; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = c[0] + d[0], ny = c[1] + d[1]; var k = nx + ',' + ny; if (seen[k]) return; if (!Vehicle.terrainOk(id, map, nx, ny)) return; seen[k] = 1; q.push([nx, ny]); }); }
    return n >= need;
  };
  // 移動判定：戻り値 { ok, board, disembark }
  Vehicle.resolveMove = function (map, nx, ny) {
    var d = D(); var id = d.aboard;
    if (id) {
      if (Vehicle.terrainOk(id, map, nx, ny)) return { ok: true };
      var def = Vehicle.def(id);
      if (def.landing && map.passable(nx, ny, d) && !root.Tiles.isWater(map.tiles[ny][nx])) return { ok: true, disembark: id };
      return { ok: false };
    }
    var vid = Vehicle.at(map.id, nx, ny); if (vid) return { ok: true, board: vid };
    return null;   // 乗り物とは無関係（通常の判定へ）
  };
  Vehicle.board = function (id, map, x, y) { var d = D(); d.aboard = id; var s = V()[id]; s.map = map.id; s.x = x; s.y = y; s.port = { map: map.id, x: x, y: y }; };
  Vehicle.disembark = function () { var d = D(); d.aboard = null; };
  // 乗船中に1歩進んだあと：乗り物の位置を更新
  Vehicle.syncToPlayer = function (map, x, y) { var d = D(); if (!d.aboard) return; var s = V()[d.aboard]; s.map = map.id; s.x = x; s.y = y; };
  // 海路：端に到達したか
  Vehicle.routeAt = function (map, x, y) {
    var d = D(); var id = d.aboard; if (!id) return null;
    var routes = (root.SEA_ROUTES || []).filter(function (r) { return r.from.map === map.id && r.vehicle.indexOf(id) >= 0 && (!r.needFlag || d.flags[r.needFlag]); });
    for (var i = 0; i < routes.length; i++) { var e = routes[i].from.edge; if ((e === 'east' && x >= map.w - 1) || (e === 'west' && x <= 0) || (e === 'north' && y <= 0) || (e === 'south' && y >= map.h - 1)) return routes[i]; }
    return null;
  };
  // 海路の到着位置：反対側の端で、同じ y（または x）に最も近い海のマス
  Vehicle.arrival = function (route, fromX, fromY) {
    var map = root.World.getMap(route.to.map); var id = D().aboard; var e = route.to.edge; var best = null;
    var x = e === 'west' ? 1 : e === 'east' ? map.w - 2 : null, y = e === 'north' ? 1 : e === 'south' ? map.h - 2 : null;
    var n = (x !== null) ? map.h : map.w;
    for (var i = 0; i < n; i++) { var px = x !== null ? x : i, py = y !== null ? y : i; if (!Vehicle.terrainOk(id, map, px, py)) continue; var dist = x !== null ? Math.abs(py - fromY) : Math.abs(px - fromX); if (!best || dist < best.dist) best = { x: px, y: py, dist: dist }; }
    return best ? { map: route.to.map, x: best.x, y: best.y } : null;
  };
  // 全滅時：乗り物を港へ戻し、下船状態にする
  Vehicle.onGameOver = function () { var d = D(); if (d.aboard) { var s = V()[d.aboard]; if (s && s.port) { s.map = s.port.map; s.x = s.port.x; s.y = s.port.y; } d.aboard = null; } };
  Vehicle.encounters = function () { var id = D().aboard; if (!id) return null; var e = Vehicle.def(id).encounters; if (!e) return null;
    // v5.2: 航海士（ナギ／主人公の職業）がパーティーにいると海上エンカウント率が半減（海流読み）
    var mult = Vehicle.hasJob('navigator') ? 0.5 : 1;
    // v6.4 航海星図のコンパス・海図の兜（装備の積・下限 0.4）と潮風の護符（歩数のあいだ -60%）
    var S0 = root.State, C0 = root.Combat; if (S0 && C0 && C0.fx) { var g = 1; S0.partyActors().forEach(function (a) { if (a.dead || !a.equip) return; Object.keys(a.equip).forEach(function (sl) { var it = a.equip[sl] && root.ITEMS[a.equip[sl]]; if (it && it.fx && it.fx.seaEnc) g *= it.fx.seaEnc; }); }); mult *= Math.max((root.FX_CAP && root.FX_CAP.seaEncFloor) || 0.4, g); }
    if ((D().counters || {}).seacharm_steps > 0) mult *= 0.4;
    if (mult !== 1) { var e2 = {}; for (var k in e) e2[k] = e[k]; e2.rate = e.rate * mult; return e2; } return e; };
  Vehicle.hasJob = function (job) { var S = root.State; if (!S || !S.partyActors) return false; return S.partyActors().some(function (a) { return a.job === job && !a.dead; }); };
  // v5.2: 進めない理由（別の乗り物が必要な海路・外海）。tryMove が失敗したときの案内用
  Vehicle.blockReason = function (map, nx, ny) {
    var d = D(); var id = d.aboard; if (!id) return null;
    var out = nx < 0 || ny < 0 || nx >= map.w || ny >= map.h;
    if (out) { var edge = nx < 0 ? 'west' : nx >= map.w ? 'east' : ny < 0 ? 'north' : 'south'; var r = (root.SEA_ROUTES || []).filter(function (rt) { return rt.from.map === map.id && rt.from.edge === edge && rt.vehicle.indexOf(id) < 0; })[0]; if (r) return r.sky ? r.name + 'は空の道。' + Vehicle.def(id).name + 'では進めない（飛空艇が必要）' : r.name + 'は潮流が強く、' + Vehicle.def(id).name + 'では進めない（' + r.vehicle.map(function (v) { return root.VEHICLES[v].name; }).join('・') + 'が必要）'; var r2 = (root.SEA_ROUTES || []).filter(function (rt) { return rt.from.map === map.id && rt.from.edge === edge && rt.vehicle.indexOf(id) >= 0 && rt.needFlag && !D().flags[rt.needFlag]; })[0]; if (r2) return r2.name + 'の先は、まだ見えない。'; return null; }
    if (map.tiles[ny][nx] === 'deep' && Vehicle.def(id).terrain.indexOf('deep') < 0) return '外海の潮流が強く、' + Vehicle.def(id).name + 'では進めない（遠洋航海船が必要）';
    return null;
  };
  // v5.2: 外海の海流と嵐。遠洋航海船で deep の上を進んだとき、ときどき流される。戻り値 { x, y, text } | null
  Vehicle.drift = function (map, x, y, rnd) {
    var d = D(); var id = d.aboard; if (!id || Vehicle.flies(id) || map.tiles[y][x] !== 'deep') return null; rnd = rnd === undefined ? Math.random() : rnd;
    var storm = rnd < 0.025, cur = rnd < 0.14; if (!cur) return null;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    // 海流は場所で決まる一定の向き（x+y で4方向）。嵐はランダムに2〜3マス
    var di = storm ? Math.floor(Math.random() * 4) : (((x >> 3) + (y >> 3)) & 3); var dv = dirs[di]; var n = storm ? 2 + Math.floor(Math.random() * 2) : 1;
    var cx = x, cy = y; for (var i = 0; i < n; i++) { var tx = cx + dv[0], ty = cy + dv[1]; if (!Vehicle.terrainOk(id, map, tx, ty) || map.warpAt(tx, ty)) break; cx = tx; cy = ty; }
    if (cx === x && cy === y) return null;
    if (Vehicle.hasJob('navigator') && !storm && Math.random() < 0.5) return null;   // 航海士は海流を読んで避けることがある
    return { x: cx, y: cy, text: storm ? '嵐！ 船が大きく流された' : '海流に流された', storm: storm };
  };
  Vehicle.label = function () { var id = D().aboard; return id ? Vehicle.def(id).name + (Vehicle.flies(id) ? '（飛行中）' : '（航海中）') : ''; };
  // v5.4 飛空艇
  Vehicle.flies = function (id) { var def = Vehicle.def(id || D().aboard); return !!(def && def.terrain[0] === '*'); };
  Vehicle.canLand = function (map, x, y) { var id = D().aboard; var def = Vehicle.def(id); if (!def || !def.landOn) return false; var t = map.tiles[y][x]; return def.landOn.indexOf(t) >= 0 && map.passable(x, y, D()) && !map.warpAt(x, y); };
  // 決定キーで着陸。飛空艇はその場に残る（乗り込むときは、そのマスに歩いて戻る）。戻り値 true＝着陸した
  Vehicle.land = function (map, x, y) { if (!Vehicle.flies()) return false; if (!Vehicle.canLand(map, x, y)) return false; var s = V()[D().aboard]; s.map = map.id; s.x = x; s.y = y; s.port = { map: map.id, x: x, y: y }; D().aboard = null; return true; };
  root.Vehicle = Vehicle;
})(typeof window !== 'undefined' ? window : globalThis);
