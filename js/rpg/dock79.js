/* =========================================================
   RPG / Dock79（v7.9.2）：町の入口のすぐそばに停めた船を、建物に隠れない海へ停め直す（2D/3D 共通。描画は含まない）
   ・3D 版では、町・城・洞窟などの入口（場所の印）のまわり 2 マスほどに町の模型が建つ。その範囲の海に停めた船は建物に隠れて見えず、
     乗れないように見えた（港町マリナ：船を港へ戻すと、入口のすぐ西の海に出て見えなかった）
   ・船を降りたとき（入口へそのまま入ったときも）と、地図に入ったとき：止めてある船（乗っていない帆船・遠洋航海船）が
     場所の印から 2 マス以内にあれば、降りた所（または船のとなりの陸）から歩いて行ける陸のとなりで、印から 3 マス以上離れた海へ移す
     （いまいる海とつながっている海だけ。見つからなければ動かさない）
   ・地図に入ったとき、となりに歩ける陸がない（乗れない）止めてある船も、近くの岸（8 マス以内の陸から歩いて行ける所）へ寄せる
   ・港へ呼び戻す（Harbors.spot）ときも、印から 2 マス以内の海は使わない（ほかに停める所があれば）
   ・飛空艇・アストラ号は対象外。乗り物の解放条件・航路には触れない
   ========================================================= */
(function (root) {
  'use strict';
  var Dock = root.Dock79 = { NEAR: 2, FAR: 3, MAXWALK: 14 };
  function D() { return root.State && root.State.data; }
  var V4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function icons(map) { return ((map && map.def && map.def.locations) || []).filter(function (l) { return l && typeof l.x === 'number' && typeof l.y === 'number'; }); }
  // 場所の印までの距離（チェビシェフ：斜めも 1）
  Dock.iconDist = function (map, x, y) { var m = 1e9; icons(map).forEach(function (l) { var d = Math.max(Math.abs(l.x - x), Math.abs(l.y - y)); if (d < m) m = d; }); return m; };
  Dock.hidden = function (map, x, y) { return Dock.iconDist(map, x, y) <= Dock.NEAR; };
  function isShip(vid) { var V = root.Vehicle; return !!(V && V.def(vid) && !(V.flies && V.flies(vid))); }
  function landOk(map, x, y) { if (x < 0 || y < 0 || x >= map.w || y >= map.h) return false; return !root.Tiles.isWater(map.tiles[y][x]) && map.passable(x, y, D()); }
  // ほかの乗り物がいるマス
  function taken(map, vid) { var t = {}; var vs = (D() && D().vehicles) || {}; Object.keys(vs).forEach(function (k) { var s = vs[k]; if (k !== vid && s && s.owned && s.map === map.id) t[s.x + ',' + s.y] = 1; }); return t; }
  // その乗り物で、(sx,sy) から海づたいに行けるマス（近くだけ）
  function seaReach(map, vid, sx, sy, R) {
    var V = root.Vehicle, seen = {}; var k0 = sx + ',' + sy; seen[k0] = 1; var q = [[sx, sy]];
    for (var i = 0; i < q.length && i < 4000; i++) { var c = q[i]; V4.forEach(function (d) { var nx = c[0] + d[0], ny = c[1] + d[1], k = nx + ',' + ny; if (seen[k] || Math.abs(nx - sx) > R || Math.abs(ny - sy) > R) return; if (!V.terrainOk(vid, map, nx, ny)) return; seen[k] = 1; q.push([nx, ny]); }); }
    return seen;
  }
  // 停め直す場所：from（陸のマス）から歩いて行ける陸のとなりで、印から FAR 以上離れた海。reach（海のマスの集まり）があれば、その中だけ
  Dock.find = function (map, vid, from, reach) {
    var V = root.Vehicle; if (!map || !V || !V.def(vid)) return null; var tk = taken(map, vid);
    var dist = {}, Q = []; (from || []).forEach(function (p) { if (!p) return; var k = p.x + ',' + p.y; if (dist[k] === undefined) { dist[k] = 0; Q.push({ x: p.x, y: p.y }); } });
    for (var h = 0; h < Q.length && h < 3000; h++) {
      var p = Q[h], d0 = dist[p.x + ',' + p.y];
      if (landOk(map, p.x, p.y) && !map.warpAt(p.x, p.y) && Dock.iconDist(map, p.x, p.y) >= Dock.NEAR) {
        for (var i = 0; i < 4; i++) { var wx = p.x + V4[i][0], wy = p.y + V4[i][1]; var key = wx + ',' + wy;
          if (tk[key] || (reach && !reach[key]) || !V.terrainOk(vid, map, wx, wy) || map.warpAt(wx, wy) || Dock.iconDist(map, wx, wy) < Dock.FAR) continue;
          if (V.openWater && !V.openWater(map, wx, wy, vid, 60)) continue;
          return { x: wx, y: wy, land: { x: p.x, y: p.y }, walk: d0 }; } }
      if (d0 >= Dock.MAXWALK) continue;
      for (var j = 0; j < 4; j++) { var nx = p.x + V4[j][0], ny = p.y + V4[j][1], kk = nx + ',' + ny; if (dist[kk] !== undefined || !landOk(map, nx, ny) || map.warpAt(nx, ny)) continue; dist[kk] = d0 + 1; Q.push({ x: nx, y: ny }); }
    }
    return null;
  };
  // 止めてある船 vid が印のそばなら停め直す。from：歩いて行ける所の起点（省略時は船のとなりの陸）。戻り値：移した先 または null
  Dock.fixShip = function (map, vid, from) {
    var d = D(); var s = d && d.vehicles && d.vehicles[vid]; if (!map || !s || !s.owned || s.map !== map.id || d.aboard === vid || !isShip(vid)) return null;
    if (typeof s.x !== 'number') return null;
    var side = V4.map(function (v) { return { x: s.x + v[0], y: s.y + v[1] }; }).filter(function (p) { return landOk(map, p.x, p.y) && !map.warpAt(p.x, p.y); });
    var hid = Dock.hidden(map, s.x, s.y); if (!hid && side.length) return null;   // 見えていて、となりの陸から乗れる
    // となりに歩ける陸がない（乗れない）船：前の版の地球のセーブを新しい配置へ直したとき、海のまん中になることがあった → 近くの岸へ
    var st = from && from.length ? from : side;
    if (!st.length) { for (var r = 1; r <= 8 && !st.length; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; var lx = s.x + dx, ly = s.y + dy; if (landOk(map, lx, ly) && !map.warpAt(lx, ly)) st.push({ x: lx, y: ly }); } }
    if (!st.length) return null;
    var reach = seaReach(map, vid, s.x, s.y, 16);
    var q = Dock.find(map, vid, st, reach); if (!q) return null;
    var was = { x: s.x, y: s.y }; s.x = q.x; s.y = q.y;
    if (s.port && s.port.map === map.id && s.port.x === was.x && s.port.y === was.y) s.port = { map: map.id, x: q.x, y: q.y };
    if (root.Minimap && root.Minimap.markDirty) root.Minimap.markDirty(map.id);
    return q;
  };
  // 地図に入ったとき：その地図の止めてある船をすべて見る（古いセーブ・2D 版で入口のそばに停めた船）
  Dock.fixAll = function (map) { var d = D(); if (!map || !d || !d.vehicles || (map.kind && map.kind !== 'field')) return []; var out = []; Object.keys(d.vehicles).forEach(function (vid) { var r = Dock.fixShip(map, vid); if (r) out.push(vid); }); return out; };

  /* ---------- つなぐ ---------- */
  Dock.install = function () {
    var V = root.Vehicle, H = root.Harbors; if (!V || V._dock79) return; V._dock79 = true;
    // 船を降りたとき：降りた所（入口へそのまま入ったときは入口）から歩いて行ける所へ
    var dis0 = V.disembark; V.disembark = function () {
      var id = D() && D().aboard; var r = dis0.apply(this, arguments);
      try { var W = root.World, s0 = id && D().vehicles && D().vehicles[id]; if (id && W && W.map && W.player && isShip(id) && s0 && s0.map === W.map.id && Math.abs(W.player.x - s0.x) + Math.abs(W.player.y - s0.y) === 1) {   /* 船からとなりの陸へ降りたときだけ（地図を移るときの強制の下船は対象外） */
        var p = W.player; var q = Dock.fixShip(W.map, id, [{ x: p.x, y: p.y }]); if (q) Dock._note = id; } } catch (e) { /* 停め直しに失敗しても降りる */ }
      return r;
    };
    // 上陸したときの地名の表示に、停め直したことを添える（World.onStep が Vehicle.disembark のすぐあとに呼ぶ）
    if (H && H.areaName) { var an0 = H.areaName; H.areaName = function () { var t = an0.apply(this, arguments); if (Dock._note) { var nm = (root.VEHICLES[Dock._note] || {}).name || '船'; Dock._note = null; t += '（' + nm + 'は町の建物に隠れない沖に停めた）'; } return t; }; }
    // 港へ呼び戻すとき：印のそばの海は使わない（ほかに停める所があれば）
    if (H && H.spot) { var sp0 = H.spot; H.spot = function (h, vid) {
      var r = sp0.apply(this, arguments);
      try { var map = root.World.getMap(h.map); if (r && map && isShip(vid) && Dock.hidden(map, r.x, r.y)) { var from = h.land ? [h.land] : []; var q = Dock.find(map, vid, from, seaReach(map, vid, r.x, r.y, 16)); if (q) return { x: q.x, y: q.y }; } } catch (e) { /* もとの場所のまま */ }
      return r; }; }
    if (root.MAP_ENTER_HOOKS) root.MAP_ENTER_HOOKS.push(function (map) { try { Dock.fixAll(map); } catch (e) { /* なし */ } });
  };
  Dock.install();
})(typeof window !== 'undefined' ? window : globalThis);
