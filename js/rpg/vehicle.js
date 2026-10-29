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
    var routes = (root.SEA_ROUTES || []).filter(function (r) { return r.from.map === map.id && r.vehicle.indexOf(id) >= 0; });
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
  Vehicle.encounters = function () { var id = D().aboard; return id ? (Vehicle.def(id).encounters || null) : null; };
  Vehicle.label = function () { var id = D().aboard; return id ? Vehicle.def(id).name + '（航海中）' : ''; };
  root.Vehicle = Vehicle;
})(typeof window !== 'undefined' ? window : globalThis);
