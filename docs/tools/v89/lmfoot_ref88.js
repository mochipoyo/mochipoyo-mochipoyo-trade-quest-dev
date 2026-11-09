// v8.9 回帰の確かめ用：v8.8（358ff60）の World.landmarkFoot をそのまま写したもの（速くした新しい版と結果が同じかを比べる基準）。ゲームでは使わない
module.exports = function (root, World, Tiles) {
  return function landmarkFootRef(m) {
    if (!m || m.kind !== 'field' || !m.warps || !m.tiles) return null;
    
    var foot = {}, stats = { full: 0, part: 0, none: 0 }, W = m.w, H = m.h;
    var walk = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && !Tiles.isSolid(m.tiles[y][x]); };
    // 窓（入口から半径 R）の中で、block を通らずにつながる成分の番号
    var R = 12;
    var label = function (w, block) {   // lab：マス→成分の番号、info：成分ごとの広さ・窓の端に届くか・中に出入口などがあるか
      var lab = {}, info = {}, id = 0;
      for (var y0 = w.y - R; y0 <= w.y + R; y0++) for (var x0 = w.x - R; x0 <= w.x + R; x0++) {
        var k0 = x0 + ',' + y0; if (lab[k0] !== undefined || !walk(x0, y0) || block[k0]) continue;
        id++; lab[k0] = id; var q = [[x0, y0]]; var inf = info[id] = { n: 0, open: false, thing: false };
        while (q.length) { var c = q.pop(); var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]]; inf.n++;
          if (Math.abs(c[0] - w.x) >= R || Math.abs(c[1] - w.y) >= R) inf.open = true;
          if (m.warpAt(c[0], c[1]) || m.eventAt(c[0], c[1]) || (m.chestAt && m.chestAt(c[0], c[1]))) inf.thing = true;
          for (var i = 0; i < 4; i++) { var nx = c[0] + nb[i][0], ny = c[1] + nb[i][1]; if (Math.abs(nx - w.x) > R || Math.abs(ny - w.y) > R) continue; var k = nx + ',' + ny; if (lab[k] !== undefined || !walk(nx, ny) || block[k]) continue; lab[k] = id; q.push([nx, ny]); } }
      }
      return { lab: lab, info: info };
    };
    var cuts = function (w, cand) {   // true＝道をふさぐ（行き止まりの小さなすき間（10マス以下・何もない）が切り離されるだけなら気にしない）
      var b0 = {}; b0[w.x + ',' + w.y] = 1; var b1 = { }; b1[w.x + ',' + w.y] = 1; cand.forEach(function (c) { b1[c[0] + ',' + c[1]] = 1; });
      var L0 = label(w, b0), L1 = label(w, b1), l0 = L0.lab, l1 = L1.lab; var edge = [];
      var minor = function (k) { var f = L1.info[l1[k]]; return f && !f.open && !f.thing && f.n <= 10; };
      for (var y = w.y - 3; y <= w.y + 3; y++) for (var x = w.x - 3; x <= w.x + 3; x++) { var k = x + ',' + y; if (b1[k] || !walk(x, y)) continue; var near = b1[(x + 1) + ',' + y] || b1[(x - 1) + ',' + y] || b1[x + ',' + (y + 1)] || b1[x + ',' + (y - 1)]; if (near && !minor(k)) edge.push(k); }
      for (var i = 0; i < edge.length; i++) for (var j = i + 1; j < edge.length; j++) if (l0[edge[i]] === l0[edge[j]] && l1[edge[i]] !== l1[edge[j]]) return true;
      return false;
    };
    m.warps.forEach(function (w) {
      if (!World.LM_TOUCH[m.tile(w.x, w.y)]) return;
      var cand = []; var f = World.landmarkFace(m, w); var half = m.tile(w.x, w.y) === 'tower_icon' ? 1 : 2;
      var open81 = !!(root.MAP_DEFS[w.to] && root.MAP_DEFS[w.to].open81);   // v8.1 開いた村：四方とも同じ広さ（±2・四隅を除く）。どの側から近づいても入れる
      for (var v = -2; v <= (open81 ? 2 : 1); v++) for (var u = -half; u <= half; u++) {   // u：横、v：正面方向（+1＝出てくる側）
        if (!u && !v) continue; if (half === 2 && Math.abs(u) === 2 && (open81 ? Math.abs(v) === 2 : (v === -2 || v === 1))) continue;
        var dx = f[0] * v - f[1] * u, dy = f[1] * v + f[0] * u; var x = w.x + dx, y = w.y + dy;
        if (!walk(x, y) || m.warpAt(x, y) || m.eventAt(x, y) || (m.chestAt && m.chestAt(x, y)) || foot[x + ',' + y]) continue;
        cand.push([x, y]);
      }
      var use = cand, kind = 'full';
      if (cuts(w, use)) {   // 1マスずつ、道をふさがないものだけ足す（入口の正面 → 横 → 奥の順）
        use = []; kind = 'part';
        var rank = function (c) { var vv = (c[0] - w.x) * f[0] + (c[1] - w.y) * f[1], uu = Math.abs((c[0] - w.x) * f[1] - (c[1] - w.y) * f[0]); return vv === 1 && !uu ? 0 : vv === 0 ? uu : vv === 1 ? 2 + uu : 4 + uu - vv; };
        cand.slice().sort(function (a, b) { return rank(a) - rank(b); })
          .forEach(function (c) { if (!cuts(w, use.concat([c]))) use.push(c); });
        if (!use.length) kind = 'none';
      }
      stats[kind]++; w._lmFootKind = kind; use.forEach(function (c) { foot[c[0] + ',' + c[1]] = w; });
    });
    return { foot: foot, stats: stats, kinds: m.warps.map(function (w) { return w._lmFootKind || "-"; }) };
  };
};
