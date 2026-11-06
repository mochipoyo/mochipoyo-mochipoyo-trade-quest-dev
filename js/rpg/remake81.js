/* =========================================================
   RPG / Remake81（v8.1）：町・村・城・学院を「手で設計した地図」に作り直す仕組み（2D 版・3D 版・ミニマップ・人の移動が同じ地図を使う）
   ・作り直す地図ごとに、データ（js/data/remake81-*.js）で 新しい地形（行）・建物の位置・人・出来事・宝箱の位置 を決める
     建物の id・中の地図・名前・人の id・会話・出来事の中身はそのまま（位置だけ動かす）。消さない
   ・当てる条件：EnvLayout の切り替えが「新しい間取り」のとき（設定で「元の間取り」にすると、前の地図のまま。towns76 と同じ決まり）
   ・座標：旧座標（これまでの最終の地図）→ 新しい座標を MapRemake.maps に登録する（World.enterMap・ナビ・目印・着く所・
     セーブの立ち位置と探索済みの印が自動で直る）。旧座標の決め方：
       建物の扉の前 → 新しい扉の前／出来事・人・宝箱 → 新しい位置／中の地図・ほかの地図から着く所 → その建物の新しい扉の前
       それ以外 → 縦横の比で写して、いちばん近い歩けるマス
     前に MapRemake に登録されていた地図（広げた屋内など）は、その変換のあとに重ねる。古いセーブ（前の版の座標）も直す（MapRemake.migrate の prev）
   ・作り直した地図には、自動の作り直し（EnvLayout の街路・towns76 の段・MapWiden）を当てない（専用の設計を共通の配置に戻さない）
   ・人：決めた人はその位置。決めていない人（町の動物など）は、旧位置を写した所の近くの、まわりも歩ける空いたマスへ
   ・開いた村（open）：外周のどこからでも外のフィールドへ出られ、フィールドの四方から入ると入った側に着く（js/rpg/edgeexit.js・js/rpg/world.js）
   ・作る前の中身は def._pre81 に控える（確認ツールで比べるため。ゲームでは使わない）
   ========================================================= */
(function (root) {
  'use strict';
  var D = root.MAP_DEFS, TL = root.Tiles, MR = root.MapRemake, EL = root.EnvLayout;
  if (!D || !TL || !MR) return;
  var R = root.Remake81 = { VERSION: 1, specs: {}, applied: {}, errors: [], log: {}, off: !!(EL && EL.enabled === false) };
  var N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var cl = function (L) { return (L || []).map(function (o) { return o && typeof o === 'object' ? Object.assign({}, o) : o; }); };
  var nameOf = function (def, c) { return TL.byChar[c] || def.fallback || 'grass'; };
  // 建物の扉と扉の前（js/core/map.js と同じ計算）
  // 初めて入ったときだけ（3D）：カメラを少しのあいだ目印へ向ける（入口から最初に見える物）。フラグで 2 回目からは待たせない。2D 版・元の間取りでは何もしない
  R.firstView = function (id, flag, cine, ms) {
    (root.MAP_ENTER_HOOKS = root.MAP_ENTER_HOOKS || []).push(function (m) {
      if (!m || m.id !== id || !R.applied[id]) return; var d = root.State && root.State.data; if (!d || !d.flags || d.flags[flag]) return;
      var A3 = root.MTQ3D; if (!A3 || !A3.camera || !A3.camera.setCine || (A3.mode3D && !A3.mode3D())) return;
      var t0 = Date.now(); var iv = setInterval(function () {
        var cur = A3.current && A3.current.map; if (Date.now() - t0 > 20000 || (root.World && root.World.map && root.World.map.id !== id)) { clearInterval(iv); return; }
        if (!cur || cur.id !== id || A3.building) return; clearInterval(iv); d.flags[flag] = true;
        try { A3.camera.setCine(cine); } catch (e) { /* カメラがなくても続ける */ }
        setTimeout(function () { try { A3.camera.setCine(null); } catch (e) { /* なし */ } }, ms || 4000);
      }, 200);
    });
  };
  R.door = function (b) {
    var bb = Object.assign({ w: 5, h: 3, doorX: 2 }, b); var d = { x: bb.x + bb.doorX, y: bb.y + bb.h - 1 };
    if (bb.doorSide === 'left' || bb.doorSide === 'right') d = { x: bb.doorSide === 'left' ? bb.x : bb.x + bb.w - 1, y: bb.y + (bb.doorY !== undefined ? bb.doorY : bb.h - 1) };
    var f = bb.doorSide === 'left' ? { x: d.x - 1, y: d.y } : bb.doorSide === 'right' ? { x: d.x + 1, y: d.y } : { x: d.x, y: d.y + 1 };
    return { door: d, front: f };
  };

  /* ---------- 地形を描く道具（データのファイルで使う。決まった結果） ---------- */
  R.canvas = function (W, H, fill) {
    var g = []; for (var y = 0; y < H; y++) { g.push([]); for (var x = 0; x < W; x++) g[y].push(fill || '.'); }
    var C = { W: W, H: H, g: g };
    C.in = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H; };
    C.get = function (x, y) { return C.in(x, y) ? g[y][x] : null; };
    C.set = function (x, y, c) { if (C.in(x, y)) g[y][x] = c; return C; };
    C.rect = function (x, y, w, h, c) { for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) C.set(i, j, c); return C; };
    C.frame = function (x, y, w, h, c) { for (var i = x; i < x + w; i++) { C.set(i, y, c); C.set(i, y + h - 1, c); } for (var j = y; j < y + h; j++) { C.set(x, j, c); C.set(x + w - 1, j, c); } return C; };
    // 折れ線（点のあいだを横→縦の順にまっすぐ）。width は道の幅（右・下へ広げる）
    C.path = function (pts, c, width) { width = width || 1; for (var k = 1; k < pts.length; k++) { var a = pts[k - 1], b = pts[k]; var x = a[0], y = a[1];
      var put = function (px, py) { for (var dy = 0; dy < width; dy++) for (var dx = 0; dx < width; dx++) C.set(px + dx, py + dy, c); };
      put(x, y); while (x !== b[0]) { x += x < b[0] ? 1 : -1; put(x, y); } while (y !== b[1]) { y += y < b[1] ? 1 : -1; put(x, y); } } return C; };
    // 点の並び（[dx, dy] の組）を (x, y) を起点に置く
    C.blob = function (x, y, offs, c) { offs.forEach(function (o) { C.set(x + o[0], y + o[1], c); }); return C; };
    // 文字の絵（行の配列）を (x, y) に置く。' ' は置かない
    C.stamp = function (x, y, art) { art.forEach(function (row, j) { for (var i = 0; i < row.length; i++) if (row[i] !== ' ') C.set(x + i, y + j, row[i]); }); return C; };
    // 条件に合うマスだけ置きかえる
    C.replace = function (from, to, area) { var a = area || [0, 0, W, H]; for (var j = a[1]; j < a[1] + a[3]; j++) for (var i = a[0]; i < a[0] + a[2]; i++) if (C.in(i, j) && from.indexOf(g[j][i]) >= 0) g[j][i] = to; return C; };
    C.rows = function () { return g.map(function (r) { return r.join(''); }); };
    return C;
  };

  /* ---------- 作り直し ---------- */
  function gridOf(def, rows, buildings) {
    var H = rows.length, W = rows[0].length; var walk = []; var bld = [];
    for (var y = 0; y < H; y++) { walk.push([]); bld.push([]); for (var x = 0; x < W; x++) { walk[y].push(!TL.isSolid(nameOf(def, rows[y][x]))); bld[y].push(null); } }
    (buildings || []).forEach(function (b) { var bb = Object.assign({ w: 5, h: 3, doorX: 2 }, b); var dd = R.door(bb).door;
      for (var yy = bb.y; yy < bb.y + bb.h; yy++) for (var xx = bb.x; xx < bb.x + bb.w; xx++) { if (!walk[yy] || walk[yy][xx] === undefined) continue; bld[yy][xx] = b.id; walk[yy][xx] = (b.shape76 === 'stall' && !b.interior) ? false : (xx === dd.x && yy === dd.y); } });
    return { W: W, H: H, walk: walk, bld: bld };
  }
  function nearestWalk(G, x, y, busy, maxR) {
    x = Math.max(0, Math.min(G.W - 1, x)); y = Math.max(0, Math.min(G.H - 1, y));
    for (var r = 0; r <= (maxR || 40); r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; var X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= G.W || Y >= G.H || !G.walk[Y][X] || G.bld[Y][X] || (busy && busy[X + ',' + Y])) continue; return { x: X, y: Y }; }
    return { x: x, y: y };
  }

  R.define = function (id, spec) {
    R.specs[id] = spec; if (R.off) return null;
    try { return apply(id, spec); } catch (e) { R.errors.push(id + '：' + (e && e.message)); if (root.console) console.error('Remake81', id, e); return null; }
  };

  function apply(id, spec) {
    var def = D[id]; if (!def) throw new Error('地図がない');
    if (typeof def.rows === 'function') throw new Error('行が関数の地図は対象外');
    var log = R.log[id] = { auto: [], unmapped: [], notes: [] };
    var oldRows = def.rows.slice(); var oldH = oldRows.length, oldW = oldRows[0].length;
    def._pre81 = { rows: oldRows, warps: cl(def.warps), events: cl(def.events), chests: cl(def.chests), npcs: cl(def.npcs), buildings: cl(def.buildings), edgeExits: def.edgeExits };
    var rows = typeof spec.rows === 'function' ? spec.rows(R.canvas) : spec.rows; if (rows && rows.rows) rows = rows.rows();
    var H = rows.length, W = rows[0].length; rows.forEach(function (r, i) { if (r.length !== W) throw new Error('行の長さがそろっていない（' + i + '行目 ' + r.length + '／' + W + '）'); });
    var A = {};   // 旧座標（最終） → 新座標（決まった物）
    var anchor = function (ox, oy, nx, ny) { var k = ox + ',' + oy; if (!A[k]) A[k] = { x: nx, y: ny }; };

    // 建物
    var oldB = {}; (def.buildings || []).forEach(function (b) { oldB[b.id] = b; });
    var SB = spec.buildings || {}; var newBs = [];
    Object.keys(oldB).forEach(function (bid) {
      var b = oldB[bid]; var s = SB[bid];
      if (s === false) { log.notes.push('建物 ' + bid + ' を置かない（中の地図はほかから入れる）'); return; }
      if (!s) throw new Error('建物 ' + bid + ' の新しい位置がない');
      var nb = Object.assign({}, b, s); ['doorSide', 'doorY'].forEach(function (k) { if (s[k] === undefined || s[k] === null) delete nb[k]; }); if (s.shape76 === null) delete nb.shape76;   // 入口の向きは新しい設計で決める（書かなければ下の辺）
      newBs.push(nb);
      var od = R.door(b), nd = R.door(nb);
      anchor(od.front.x, od.front.y, nd.front.x, nd.front.y); anchor(od.door.x, od.door.y, nd.front.x, nd.front.y);
    });
    (spec.addBuildings || []).forEach(function (b) { newBs.push(Object.assign({ v81: true }, b)); });
    var G = gridOf(def, rows, newBs);
    var busy = {}; var mark = function (x, y) { busy[x + ',' + y] = 1; };
    newBs.forEach(function (b) { var f = R.door(b).front; mark(f.x, f.y); });

    // 出来事（旧座標の一致で）
    var SE = spec.events || []; var evMap = {}; SE.forEach(function (e) { evMap[e[0] + ',' + e[1]] = { x: e[2], y: e[3] }; });
    var evs = (def.events || []).map(function (e) { var k = e.x + ',' + e.y; var p = evMap[k];
      if (!p) { log.unmapped.push('出来事 ' + k + ' ' + (e.type || '')); p = nearestWalk(G, Math.round(e.x * W / oldW), Math.round(e.y * H / oldH), busy); }
      anchor(e.x, e.y, p.x, p.y); mark(p.x, p.y); return Object.assign({}, e, { x: p.x, y: p.y }); });
    // 宝箱
    var SC = spec.chests || {};
    var chests = (def.chests || []).map(function (c) { var p = SC[c.id]; if (!p) { log.unmapped.push('宝箱 ' + c.id); var q = nearestWalk(G, Math.round(c.x * W / oldW), Math.round(c.y * H / oldH), busy); p = [q.x, q.y]; }
      anchor(c.x, c.y, p[0], p[1]); mark(p[0], p[1]); return Object.assign({}, c, { x: p[0], y: p[1] }); });
    // ワープ（建物の扉以外：外への出口・階段など）
    var warps = (spec.warps || []).map(function (w) { mark(w.x, w.y); return Object.assign({}, w); });
    var keepOld = (def.warps || []).filter(function (w) { return spec.keepWarp && spec.keepWarp(w); });
    if (keepOld.length) log.notes.push('残したワープ ' + keepOld.length);
    // 外のフィールドへの出口以外のワープ（階段・通路など）を、新しい定義に書かずに落としていないか
    (def.warps || []).forEach(function (w) { var td = D[w.to]; var field = td && (td.region || td.kind === 'field'); if (field || keepOld.indexOf(w) >= 0) return;
      var has = warps.some(function (n) { return n.to === w.to; }); if (!has) throw new Error('ワープ ' + w.x + ',' + w.y + '→' + w.to + ' の新しい位置がない'); });
    // 人（決めた人 → 決めていない人の順）
    var SN = spec.npcs || {};
    var npcs0 = def.npcs || []; var placed = {};
    npcs0.forEach(function (n) { var s = SN[n.id]; if (!s) return; placed[n.id] = { x: s[0], y: s[1], dir: s[2], wander: s[3] }; mark(s[0], s[1]); });
    var free8 = function (x, y) { for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H || !G.walk[Y][X] || G.bld[Y][X]) return false; } return true; };
    var farFromBusy = function (x, y, r) { for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) if (busy[(x + dx) + ',' + (y + dy)]) return false; return true; };
    var paths = spec.pathChars || 'rP=';
    npcs0.forEach(function (n) {
      if (placed[n.id]) return;
      var tx = Math.round(n.x * W / oldW), ty = Math.round(n.y * H / oldH); var pick = null;
      for (var r = 0; r <= 30 && !pick; r++) for (var dy = -r; dy <= r && !pick; dy++) for (var dx = -r; dx <= r && !pick; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; var X = tx + dx, Y = ty + dy;
        if (X < 1 || Y < 1 || X >= W - 1 || Y >= H - 1 || !free8(X, Y) || !farFromBusy(X, Y, 2) || paths.indexOf(rows[Y][X]) >= 0) continue; pick = { x: X, y: Y }; }
      if (!pick) pick = nearestWalk(G, tx, ty, busy);
      placed[n.id] = { x: pick.x, y: pick.y }; mark(pick.x, pick.y); log.auto.push(n.id + '→' + pick.x + ',' + pick.y);
    });
    var npcs = npcs0.map(function (n) { var p = placed[n.id]; anchor(n.x, n.y, p.x, p.y); var o = Object.assign({}, n, { x: p.x, y: p.y }); if (p.dir) o.dir = p.dir; if (p.wander !== undefined) o.wander = p.wander; return o; });
    (spec.anchors || []).forEach(function (a) { anchor(a[0], a[1], a[2], a[3]); });

    // 前の登録（広げた屋内など）
    var prev = MR.maps[id] || null;
    var prevPos = function (x, y) { if (!prev) return { x: x, y: y }; if (prev.mapPos) return prev.mapPos(Math.min(x, prev.oldW - 1), Math.min(y, prev.oldH - 1)); var S = MR.SCALE; return { x: Math.min(x * S, prev.oldW * S - 1), y: Math.min(y * S, prev.oldH * S - 1) }; };
    // ほかの地図から着く所：中の地図の出口 → その建物の新しい扉の前／外のフィールドから → spec.arrive
    var byInterior = {}; newBs.forEach(function (b) { if (b.interior) byInterior[b.interior] = b; });
    Object.keys(D).forEach(function (k) { if (k === id) return; var dd = D[k]; (dd.warps || []).forEach(function (w) {
      if (!w || w.to !== id || typeof w.tx !== 'number') return; var p0 = prevPos(w.tx, w.ty); var key = p0.x + ',' + p0.y; if (A[key]) return;
      var b = byInterior[k]; if (b) { var f = R.door(b).front; anchor(p0.x, p0.y, f.x, f.y); return; }
      var near = null; Object.keys(oldB).forEach(function (bid) { var od = R.door(oldB[bid]); var dd0 = Math.abs(od.front.x - p0.x) + Math.abs(od.front.y - p0.y); if (dd0 <= 2 && (!near || dd0 < near.d)) near = { d: dd0, id: bid }; });
      if (near) { var nb2 = newBs.filter(function (x) { return x.id === near.id; })[0]; if (nb2) { var f2 = R.door(nb2).front; anchor(p0.x, p0.y, f2.x, f2.y); return; } }
      if ((dd.region || dd.kind === 'field') && spec.arrive) { anchor(p0.x, p0.y, spec.arrive[0], spec.arrive[1]); return; }
    }); });
    (root.WORLD_LOCATIONS || []).forEach(function (L) { if (L && L.to === id && typeof L.tx === 'number' && spec.arrive) { var p0 = prevPos(L.tx, L.ty); anchor(p0.x, p0.y, spec.arrive[0], spec.arrive[1]); } });
    // ほかの町の建物からこの屋内へ入るとき（建物の entry。書いていなければ 5,7）→ spec.arrive（屋内の入口の内側）
    if (spec.arrive) Object.keys(D).forEach(function (k) { (D[k].buildings || []).forEach(function (b) { if (!b || b.interior !== id) return; var e = b.entry || { x: 5, y: 7 }; var p0 = prevPos(e.x, e.y); anchor(p0.x, p0.y, spec.arrive[0], spec.arrive[1]); }); });

    // 旧座標（最終）→ 新座標
    var mine = function (x, y) { var a = A[x + ',' + y]; if (a) return { x: a.x, y: a.y }; return nearestWalk(G, Math.round(x * W / oldW), Math.round(y * H / oldH), null); };
    // 探索済みの印・逆向き（新 → 旧（最終））：比で戻す
    var back = function (x, y) { return { x: Math.max(0, Math.min(oldW - 1, Math.round(x * oldW / W))), y: Math.max(0, Math.min(oldH - 1, Math.round(y * oldH / H))) }; };

    // 調べる所・クイズの魔物（その地図の中の座標を新しく）
    [root.SEARCH_POINTS, root.QUIZ_MONSTERS].forEach(function (Lst) { (Lst || []).forEach(function (p) { if (!p || p.map !== id || typeof p.x !== 'number' || p._r81) return; var q = (spec.points && spec.points[p.id]) ? { x: spec.points[p.id][0], y: spec.points[p.id][1] } : mine(p.x, p.y); p._o81 = [p.x, p.y]; p.x = q.x; p.y = q.y; p._r81 = true; }); });

    // 定義を書きかえる
    def.rows = rows; def.buildings = newBs; def.events = evs; def.chests = chests; def.npcs = npcs;
    def.warps = keepOld.concat(warps);   // 建物の扉のワープは GameMap が作る（定義には書かない）。外への出口は spec.warps（開いた村は外周から出る）
    def.noLayout = true; def.noWiden = true; delete def.auto76; delete def._auto76lv; delete def.levels76; delete def.plan76; delete def.edgeExits;
    if (spec.edgeExits) def.edgeExits = spec.edgeExits;
    if (spec.levels) def.levels76 = spec.levels(W, H, rows);   // 段（js/rpg/terrace76.js の levels76。3D の高さ。段の縁は擁壁 |、つなぎは階段 /・坂 ;）
    if (spec.open) def.open81 = spec.open === true ? { all: true } : spec.open;
    if (spec.after) spec.after(def, { W: W, H: H, G: G, anchor: anchor });
    // 豆知識おばさん（js/data/chatter67.js の置き場所）も、作り直した位置にそろえる
    var C67 = root.CHATTER67 && root.CHATTER67.aunts && root.CHATTER67.aunts[id]; if (C67) { var an = (def.npcs || []).filter(function (n) { return n.id === 'aunt67_' + id; })[0]; if (an) { C67.x = an.x; C67.y = an.y; } }
    var ver = 'r81.' + (spec.version || 1);
    var reg = { version: ver, oldW: oldW, oldH: oldH, newW: W, newH: H, r81: true,
      mapPos: function (x, y) { var p = prevPos(x, y); return mine(p.x, p.y); },
      mapBack: function (x, y) { return back(x, y); },
      prev: prev, fromPrev: function (x, y) { return mine(x, y); }, backPrev: function (x, y) { return back(x, y); } };
    if (prev && prev.mapBack) { reg.mapBack = function (x, y) { var b = back(x, y); return prev.mapBack(b.x, b.y); }; }
    MR.maps[id] = reg; def.remake81 = { version: ver, oldW: oldW, oldH: oldH, w: W, h: H, anchors: A };
    R.applied[id] = true;
    return def;
  }

  /* ---------- 開いた村（open81）：フィールドの入口のまわりと村の外周の対応 ---------- */
  // その村を指すフィールドの場所（いま使っている世界で）。{ map, L }
  R.fieldOf = function (townId) {
    var out = null; Object.keys(D).forEach(function (k) { var dd = D[k]; if (out || !dd || !(dd.region || dd.kind === 'field')) return; (dd.locations || []).forEach(function (L) { if (!out && L && L.to === townId) out = { map: k, L: L }; }); });
    return out;
  };
  R.RAD = 2;   // フィールドの入口の範囲（村の印のまわり。横・縦とも ±2）
  // 村の外周の (x, y) と向き → フィールドのマス
  R.toField = function (m, x, y, side) {
    var F = R.fieldOf(m.id); if (!F) return null; var W0 = root.World; var fm = W0 && W0.getMap ? W0.getMap(F.map) : null; if (!fm) return null;
    var L = F.L; var Lx = L.x, Ly = L.y; var horiz = side === 'top' || side === 'bottom';
    var f = horiz ? (m.w > 1 ? x / (m.w - 1) : 0.5) : (m.h > 1 ? y / (m.h - 1) : 0.5); var off = Math.round(f * R.RAD * 2) - R.RAD;
    var out = R.RAD + 1; var want = side === 'top' ? { x: Lx + off, y: Ly - out } : side === 'bottom' ? { x: Lx + off, y: Ly + out } : side === 'left' ? { x: Lx - out, y: Ly + off } : { x: Lx + out, y: Ly + off };
    var d = root.State && root.State.data;
    var foot = W0.landmarkFoot ? W0.landmarkFoot(fm) : null;
    var ok = function (cx, cy) {
      if (cx < 0 || cy < 0 || cx >= fm.w || cy >= fm.h) return false; if (!fm.passable(cx, cy, d) || fm.warpAt(cx, cy) || fm.eventAt(cx, cy) || (fm.chestAt && fm.chestAt(cx, cy))) return false;
      if (TL.isWater && TL.isWater(fm.tiles[cy][cx])) return false; if (root.Vehicle && root.Vehicle.at && root.Vehicle.at(fm.id, cx, cy)) return false;
      if (foot && foot[cx + ',' + cy] && foot[cx + ',' + cy].to === m.id) return false;   // 入口の範囲の中には出さない（出てすぐ入り直さない）
      return true;
    };
    var outward = function (cx, cy) { return side === 'top' ? cy < Ly - R.RAD + 1 : side === 'bottom' ? cy > Ly + R.RAD - 1 : side === 'left' ? cx < Lx - R.RAD + 1 : cx > Lx + R.RAD - 1; };
    // 小さく閉じた所（まわりから行けない）でないか：外向きに 40 マス以上つながる
    var roomy = function (cx, cy) { var seen = {}; var q = [[cx, cy]]; seen[cx + ',' + cy] = 1; var n = 0; while (q.length && n < 40) { var c = q.shift(); n++; N4.forEach(function (v) { var nx = c[0] + v[0], ny = c[1] + v[1], k = nx + ',' + ny; if (seen[k] || !ok(nx, ny)) return; seen[k] = 1; q.push([nx, ny]); }); } return n >= 40; };
    var best = null, bs = 1e9;
    for (var dy = -5; dy <= 5; dy++) for (var dx = -5; dx <= 5; dx++) { var cx = want.x + dx, cy = want.y + dy; if (!ok(cx, cy) || !outward(cx, cy)) continue; var s = Math.abs(dx) + Math.abs(dy) * 1.0 + (horiz ? Math.abs(dx) * 0.5 : Math.abs(dy) * 0.5); if (s < bs && roomy(cx, cy)) { bs = s; best = { x: cx, y: cy }; } }
    if (!best) return null;
    return { to: F.map, tx: best.x, ty: best.y, side: side, off: off, want: want };
  };
  // フィールドで、(px, py)（範囲に入る前のマス）から村の入口の範囲へ入った → 村の中の着く所
  R.fromField = function (fm, w, px, py) {
    var def = D[w.to]; if (!def || !def.open81) return null; var W0 = root.World; var tm = W0.getMap(w.to); if (!tm) return null;
    var F = null; (fm.def.locations || []).forEach(function (L) { if (!F && L.to === w.to) F = L; }); var Lx = F ? F.x : w.x, Ly = F ? F.y : w.y;
    var dx = px - Lx, dy = py - Ly; var side;
    if (Math.abs(dy) >= Math.abs(dx)) side = dy < 0 ? 'top' : 'bottom'; else side = dx < 0 ? 'left' : 'right';
    var off = side === 'top' || side === 'bottom' ? dx : dy; off = Math.max(-R.RAD, Math.min(R.RAD, off)); var f = (off + R.RAD) / (R.RAD * 2);
    var d = root.State && root.State.data;
    var cand = []; var horiz = side === 'top' || side === 'bottom'; var n = horiz ? tm.w : tm.h;
    for (var i = 0; i < n; i++) { var x = horiz ? i : (side === 'left' ? 0 : tm.w - 1), y = horiz ? (side === 'top' ? 0 : tm.h - 1) : i; if (tm.passable(x, y, d) && !tm.warpAt(x, y) && !tm.eventAt(x, y) && !tm.npcAt(x, y)) cand.push({ x: x, y: y, i: i }); }
    if (!cand.length) return null; var want = f * (n - 1); cand.sort(function (a, b) { return Math.abs(a.i - want) - Math.abs(b.i - want); });
    var face = { top: 'down', bottom: 'up', left: 'right', right: 'left' }[side];
    return { to: w.to, tx: cand[0].x, ty: cand[0].y, face: face, raw: true, side: side, f: f, name: w.name, needFlag: w.needFlag, lockedText: w.lockedText, hidden: w.hidden, open81: true };
  };
})(typeof window !== 'undefined' ? window : globalThis);
