/* =========================================================
   RPG / Interior76（v7.6）：町の建物の中を広げる（床の列・行を差し込む）＋壁ぞいに家具を足す
   ・依頼：「建物の大きさに対して中が狭い建物が多いので修正」「家具やインテリア・道具を配置して賑やかに」
   ・対象：町の建物から入る屋内（kind 'interior'）で、幅 16 以下・高さ 11 以下の部屋。物語の台本が座標を使う部屋・ポヨ村の作り込んだ部屋・
     仕掛けのある部屋（onStep）・作り直したダンジョン（MapRemake.LIST）・行が関数の部屋は対象外（EXCLUDE）
   ・広げ方：列を2か所（2列ずつ）、行を1か所（2行）差し込む。差し込む所の左右（上下）が同じ文字なら同じ物を続け（壁・カウンター・じゅうたん）、
     どちらかが壁なら壁、ほかは部屋の床。人・出来事・宝箱・ワープと、その向かいの家具（カウンター越しの店主など）の間には差し込まない
   ・座標：旧座標→新座標を MapRemake.pos に登録（World.enterMap・ナビ・目印・着く所・セーブの立ち位置が自動で直る）。中の人・出来事・宝箱・ワープ・調べる所は新座標に書きかえる
   ・家具：広げた部屋の壁ぞいの床に、用途ごとの家具（棚・樽・木箱・かまど・柱など）。置くたびに、出口から人・出来事・宝箱・ワープへ行けるか（話せるか）を確かめ、だめなら置かない
   ・2D版・3D版で同じ（タイルの論理）。元の定義は def._i76.old に残す
   ========================================================= */
(function (root) {
  'use strict';
  var D = root.MAP_DEFS, TL = root.Tiles, MR = root.MapRemake;
  if (!D || !TL || !MR) return;
  var I = root.Interior76 = { VERSION: 1, maps: {}, errors: [], skipped: {} };
  // 物語の台本などが座標で直接さわる部屋（js/data の検索で見つけた）・ポヨ村の作り込んだ部屋
  var EXCLUDE = { poyo_elder_house: 1, poyo_inn: 1, poyo_church: 1, kalion_finance: 1, sentra_palace_1: 1, ruins_store: 1, aruna_ruins_1: 1, oracle_core_1: 1, memory_vault: 1, rivel_wave_temple: 1, tradia_foundation: 1, asana_home: 1 };
  var nameOf = function (def, c) { return TL.byChar[c] || def.fallback || 'grass'; };
  var solidCh = function (def, c) { return TL.isSolid(nameOf(def, c)); };
  var WALLN = { wall: 1, wall_wood: 1, castle_wall: 1 };
  var wallCh = function (def, c) { return !!WALLN[nameOf(def, c)]; };

  // 用途（家具の選び方）
  var usageOf = function (def, b) {
    var t = (b && b.type) || ''; var n = def.name || '';
    if (def.shop && def.shop.kind) return def.shop.kind === 'weapon' || def.shop.kind === 'armor' ? def.shop.kind : 'item';
    if (/酒場|隊商宿|バー/.test(n) || def.bgm === 'tavern' || t === 'tavern') return 'tavern';
    if (t === 'inn' || /宿/.test(n)) return 'inn'; if (t === 'church' || /教会|祠|聖堂|神殿/.test(n)) return 'church';
    if (t === 'guild' || t === 'bank' || t === 'academy' || t === 'exchange' || /ギルド|銀行|学院|取引所/.test(n)) return 'office';
    if (t === 'warehouse' || /倉庫/.test(n)) return 'storage'; if (t === 'watchtower' || /塔|やぐら|灯台/.test(n)) return 'tower';
    if (t === 'dojo' || /修行/.test(n)) return 'dojo'; if (/パン/.test(n)) return 'bakery'; if (/工房|鍛冶/.test(n)) return 'weapon';
    return 'house';
  };
  var FURN = { item: '{Kqz', weapon: 'qzKq', armor: 'IzKz', tavern: 'qqz{', inn: '{Kq{', church: 'IK', office: 'K{zK', storage: 'zqzq', tower: 'zqK', dojo: 'qzK', bakery: '^q{z', house: '{K^qz' };

  // 差し込む所を選ぶ（列：axis 'x'、行：axis 'y'）。cut は「k の前に差し込む」位置（1..N-1）
  function chooseCuts(def, rows, axis, want, anchors) {
    var H = rows.length, W = rows[0].length; var N = axis === 'x' ? W : H; var L = axis === 'x' ? H : W;
    var at = function (i, j) { return axis === 'x' ? rows[j][i] : rows[i][j]; };   // i：差し込む向き・j：それに沿う向き
    var anc = function (i, j) { return axis === 'x' ? anchors[i + ',' + j] : anchors[j + ',' + i]; };
    var score = function (k) {   // k-1 と k の間
      if (k < 2 || k > N - 2) return -1;
      var s = 0;
      for (var j = 0; j < L; j++) {
        var a = at(k - 1, j), b = at(k, j); var aa = anc(k - 1, j), ab = anc(k, j);
        var sa = solidCh(def, a), sb = solidCh(def, b);
        if ((aa && (sb || ab)) || (ab && (sa || aa))) return -1;   // 人・出来事と、その向かいの物（カウンター越し・机の前）の間は切らない
        if ((a === '<' || a === '>' || b === '<' || b === '>')) return -1;   // 階段の前後
        if (!sa && !sb) s += 2; else if (a === b) s += 1;   // 床どうし・同じ物どうしが多い所がよい
      }
      return s;
    };
    var cands = []; for (var k = 2; k <= N - 2; k++) { var sc = score(k); if (sc >= 0) cands.push({ k: k, s: sc }); }
    if (!cands.length) return [];
    if (want === 1) { cands.sort(function (p, q) { return (q.s - Math.abs(q.k - N / 2) * 0.6) - (p.s - Math.abs(p.k - N / 2) * 0.6); }); return [cands[0].k]; }
    // 2か所：1/3 と 2/3 に近い所
    var pick = function (target, not) { var best = null, bs = -1e9; cands.forEach(function (c) { if (not && Math.abs(c.k - not) < 2) return; var v = c.s - Math.abs(c.k - target) * 1.2; if (v > bs) { bs = v; best = c.k; } }); return best; };
    var c1 = pick(N / 3, null); var c2 = pick(2 * N / 3, c1); return [c1, c2].filter(function (v) { return v !== null; }).sort(function (a, b) { return a - b; });
  }

  // 床の文字（部屋でいちばん多い歩ける文字。じゅうたん・扉・階段は除く）
  function floorOf(def, rows) { var cnt = {}; rows.forEach(function (r) { for (var i = 0; i < r.length; i++) { var c = r[i]; if (solidCh(def, c) || 'pD<>@'.indexOf(c) >= 0) continue; cnt[c] = (cnt[c] || 0) + 1; } }); var best = '_', bn = -1; Object.keys(cnt).forEach(function (c) { if (cnt[c] > bn) { bn = cnt[c]; best = c; } }); return best; }

  function stretch(id, def, b) {
    var rows = def.rows.slice(); var H = rows.length, W = rows[0].length; var floor = floorOf(def, rows);
    var anchors = {}; var mark = function (x, y) { if (typeof x === 'number' && typeof y === 'number') anchors[x + ',' + y] = 1; };
    (def.npcs || []).forEach(function (n) { mark(n.x, n.y); }); (def.events || []).forEach(function (e) { if (e) mark(e.x, e.y); }); (def.chests || []).forEach(function (c) { mark(c.x, c.y); }); (def.warps || []).forEach(function (q) { if (q) mark(q.x, q.y); });
    (root.SEARCH_POINTS || []).forEach(function (p) { if (p && p.map === id) mark(p.x, p.y); }); (root.QUIZ_MONSTERS || []).forEach(function (p) { if (p && p.map === id) mark(p.x, p.y); });
    var addX = W <= 12 ? 2 : 1, addY = H <= 9 ? 2 : 1;   // 差し込む数（1か所あたり）
    var cx = chooseCuts(def, rows, 'x', W <= 12 ? 2 : 1, anchors); var cy = chooseCuts(def, rows, 'y', 1, anchors);
    if (!cx.length && !cy.length) return null;
    var shift = function (v, cuts, n) { var s = 0; cuts.forEach(function (k) { if (v >= k) s += n; }); return v + s; };
    var mapPos = function (x, y) { return { x: shift(x, cx, addX), y: shift(y, cy, addY) }; };
    var mapBack = function (X, Y) { return { x: Math.max(0, Math.min(W - 1, backX(X))), y: Math.max(0, Math.min(H - 1, backY(Y))) }; };
    var backX = function (X) { var o = X; for (var i = cx.length - 1; i >= 0; i--) { var nk = cx[i] + addX * (i + 1); if (o >= nk) o -= addX; else if (o >= nk - addX) { o = cx[i]; break; } } return o; };
    var backY = function (Y) { var o = Y; for (var i = cy.length - 1; i >= 0; i--) { var nk = cy[i] + addY * (i + 1); if (o >= nk) o -= addY; else if (o >= nk - addY) { o = cy[i]; break; } } return o; };
    // 新しい行の組み立て：まず列、つぎに行
    var fillCh = function (a, bch) { if (a === bch) return a; if (wallCh(def, a) || wallCh(def, bch)) return wallCh(def, a) ? a : bch; return floor; };
    var R1 = rows.map(function (r) { var out = ''; for (var x = 0; x < W; x++) { if (cx.indexOf(x) >= 0) { var f = fillCh(r[x - 1], r[x]); for (var k = 0; k < addX; k++) out += f; } out += r[x]; } return out; });
    var R2 = []; for (var y = 0; y < H; y++) { if (cy.indexOf(y) >= 0) { var up = R1[y - 1], dn = R1[y]; var line = ''; for (var x2 = 0; x2 < up.length; x2++) line += fillCh(up[x2], dn[x2]); for (var k2 = 0; k2 < addY; k2++) R2.push(line); } R2.push(R1[y]); }
    // 中の物を新座標へ
    var cl = function (L) { return (L || []).map(function (o) { return o && typeof o === 'object' ? Object.assign({}, o) : o; }); };
    var old = { rows: rows, warps: cl(def.warps), events: cl(def.events), chests: cl(def.chests), npcs: cl(def.npcs) };
    var mv = function (o) { if (!o || typeof o.x !== 'number' || typeof o.y !== 'number') return o; var p = mapPos(o.x, o.y); var c = Object.assign({}, o, { x: p.x, y: p.y }); if (typeof o.ox === 'number') { var q = mapPos(o.ox, o.oy); c.ox = q.x; c.oy = q.y; } return c; };
    def.npcs = (def.npcs || []).map(mv); def.events = (def.events || []).map(mv); def.chests = (def.chests || []).map(mv); def.warps = (def.warps || []).map(mv);
    [root.SEARCH_POINTS, root.QUIZ_MONSTERS].forEach(function (L) { (L || []).forEach(function (p) { if (p && p.map === id && typeof p.x === 'number' && !p._i76) { var q = mapPos(p.x, p.y); p._i76 = { x: p.x, y: p.y }; p.x = q.x; p.y = q.y; } }); });
    def.rows = R2;
    return { cx: cx, cy: cy, addX: addX, addY: addY, oldW: W, oldH: H, newW: R2[0].length, newH: R2.length, mapPos: mapPos, mapBack: mapBack, old: old, floor: floor };
  }

  // 出口から歩いて行けるか（人・出来事・宝箱は隣に立てる・カウンター越しでもよい）
  function reachOK(def, rows, id) {
    var H = rows.length, W = rows[0].length; var POT = {}; (root.SEARCH_POINTS || []).forEach(function (p) { if (p && p.map === id) POT[p.x + ',' + p.y] = 1; });   // 調べる所（壺など）は通れないものとして数える
    var walk = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && !solidCh(def, rows[y][x]) && !POT[x + ',' + y]; };
    var npcAt = {}; (def.npcs || []).forEach(function (n) { if (n.wander === 0) npcAt[n.x + ',' + n.y] = 1; });
    var starts = (def.warps || []).filter(function (q) { return q && walk(q.x, q.y); }); if (!starts.length) return true;
    var seen = {}; var q = [[starts[0].x, starts[0].y]]; seen[starts[0].x + ',' + starts[0].y] = 1;
    while (q.length) { var a = q.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = a[0] + d[0], ny = a[1] + d[1], k = nx + ',' + ny; if (seen[k] || !walk(nx, ny) || npcAt[k]) return; seen[k] = 1; q.push([nx, ny]); }); }
    var near = function (x, y) { return seen[x + ',' + y] || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { var nx = x + d[0], ny = y + d[1]; if (seen[nx + ',' + ny]) return true; return ny >= 0 && ny < H && nx >= 0 && nx < W && nameOf(def, rows[ny][nx]) === 'counter' && seen[(nx + d[0]) + ',' + (ny + d[1])]; }); };
    var ok = true;
    (def.warps || []).forEach(function (w) { if (w && walk(w.x, w.y) && !seen[w.x + ',' + w.y]) ok = false; });
    (def.npcs || []).forEach(function (n) { if (!n.hidden && !near(n.x, n.y)) ok = false; });
    (def.events || []).forEach(function (e) { if (e && typeof e.x === 'number' && !near(e.x, e.y)) ok = false; });
    (def.chests || []).forEach(function (c) { if (!near(c.x, c.y)) ok = false; });
    return { ok: ok, count: Object.keys(seen).length };
  }

  function furnish(id, def, use, S) {
    var rows = def.rows.map(function (r) { return r.split(''); }); var H = rows.length, W = rows[0].length;
    var str = function () { return rows.map(function (r) { return r.join(''); }); };
    var base = reachOK(def, str(), id); if (!base.ok) return 0;
    var anchors = {}; var mark = function (x, y) { anchors[x + ',' + y] = 1; };
    (def.npcs || []).forEach(function (n) { mark(n.x, n.y); }); (def.events || []).forEach(function (e) { if (e) mark(e.x, e.y); }); (def.chests || []).forEach(function (c) { mark(c.x, c.y); }); (def.warps || []).forEach(function (q) { if (q) mark(q.x, q.y); });
    (root.SEARCH_POINTS || []).forEach(function (p) { if (p && p.map === id) mark(p.x, p.y); });
    var exits = (def.warps || []).filter(function (q) { return q; });
    var pal = FURN[use] || FURN.house; var placed = 0, limit = Math.round((W * H) / 22) + 2; var k = 0;
    var near = function (x, y, r, f) { for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) { var nx = x + dx, ny = y + dy; if (ny < 0 || nx < 0 || ny >= H || nx >= W) continue; if (f(nx, ny)) return true; } return false; };
    // 候補：壁に面した床（新しく差し込んだ所を先に）。出口のまわり・人や物の前・カウンターの前・扉の列はさける
    var cands = [];
    for (var y = 1; y < H - 1; y++) for (var x = 1; x < W - 1; x++) {
      var c = rows[y][x]; if (c !== S.floor) continue; if (anchors[x + ',' + y]) continue;
      var wallN = [[0, -1], [-1, 0], [1, 0]].filter(function (d) { return wallCh(def, rows[y + d[1]][x + d[0]]); }).length; if (!wallN) continue;
      if (wallCh(def, rows[y + 1][x])) continue;   // 手前（南）の壁ぎわは置かない（出口の列・見通し）
      if (exits.some(function (q) { return Math.abs(q.x - x) <= 1 && Math.abs(q.y - y) <= 2; })) continue;
      if (near(x, y, 1, function (nx, ny) { return anchors[nx + ',' + ny] && !(nx === x && ny === y); })) continue;   // 人・出来事のとなりは空ける
      if (near(x, y, 1, function (nx, ny) { var n = nameOf(def, rows[ny][nx]); return n === 'counter' || n === 'bed' || n === 'stairs_up' || n === 'stairs_down' || n === 'door'; })) continue;
      var isNew = S.cx.some(function (cc) { return x >= S.mapPos(cc, 0).x - S.addX && x < S.mapPos(cc, 0).x; }) || S.cy.some(function (cc) { return y >= S.mapPos(0, cc).y - S.addY && y < S.mapPos(0, cc).y; });
      cands.push({ x: x, y: y, s: (isNew ? 3 : 0) + (wallN >= 2 ? 2 : 0) + ((x * 7 + y * 3) % 5) * 0.1 });
    }
    cands.sort(function (a, b) { return b.s - a.s; });
    for (var i = 0; i < cands.length && placed < limit; i++) {
      var p = cands[i]; if (rows[p.y][p.x] !== S.floor) continue;
      // となりに置いた家具とくっつけすぎない（2つまで続けてよい）
      var run = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(function (d) { var ch = rows[p.y + d[1]][p.x + d[0]]; return !wallCh(def, ch) && solidCh(def, ch); }).length; if (run >= 2) continue;
      var ch = pal.charAt(k % pal.length); if (!TL.byChar[ch]) continue;
      rows[p.y][p.x] = ch; var r2 = reachOK(def, str(), id);
      if (!r2.ok || r2.count !== base.count - (placed + 1)) { rows[p.y][p.x] = S.floor; continue; }   // 置いたマスのほかに行けなくなるマスがあれば置かない
      placed++; k++;
    }
    def.rows = str(); return placed;
  }

  function candidates() {
    var list = {}; Object.keys(D).forEach(function (k) { var d = D[k]; if (!d || d.kind !== 'town') return; (d.buildings || []).forEach(function (b) { if (b.interior && D[b.interior] && !list[b.interior]) list[b.interior] = { town: k, b: b }; }); });
    return list;
  }
  I.apply = function () {
    var C = candidates();
    Object.keys(C).forEach(function (id) {
      var def = D[id]; var why = null;
      if (EXCLUDE[id]) why = '台本が座標を使う・作り込み済み'; else if (!def || def.kind !== 'interior') why = '屋内でない'; else if (typeof def.rows !== 'function' && !(def.rows && def.rows.length)) why = '行がない';
      else if (typeof def.rows === 'function') why = '行が関数'; else if (def.onStep || def.s3121 || def.remake71 || def._i76) why = '仕掛け・物語・作り直し済み';
      else if (MR.LIST && MR.LIST.indexOf(id) >= 0) why = '作り直したダンジョン'; else if (/^poyo_/.test(id)) why = 'ポヨ村の作り込んだ部屋';
      else if (def.rows[0].length > 16 || def.rows.length > 11) why = 'もともと広い';
      if (why) { I.skipped[id] = why; return; }
      try {
        var S = stretch(id, def, C[id].b); if (!S) { I.skipped[id] = '差し込める所がない'; return; }
        var use = usageOf(def, C[id].b); var nf = furnish(id, def, use, S);
        def._i76 = { version: I.VERSION, use: use, cuts: { x: S.cx, y: S.cy, addX: S.addX, addY: S.addY }, oldW: S.oldW, oldH: S.oldH, furniture: nf, old: S.old };
        // MapRemake の座標の直しに登録（World.enterMap・ナビ・目印・セーブの立ち位置）
        MR.maps[id] = { version: 'i76.' + I.VERSION, oldW: S.oldW, oldH: S.oldH, newW: S.newW, newH: S.newH, mapPos: S.mapPos, mapBack: S.mapBack, kind: 'interior76' };
        I.maps[id] = def._i76;
      } catch (e) { I.errors.push(id + '：' + (e && e.message)); }
    });
  };
  I.apply();
})(typeof window !== 'undefined' ? window : globalThis);
