/* =========================================================
   RPG / World76（v7.6）：地上のフィールド（10 地域）と海を、1 枚の世界としてつなぐ（3D 版だけ）
   ・3D 版のページ（3d/index.html）が window.MTQ_JOIN76 = true にしたときだけ動く。2D 版はいままでの地域ごとのマップのまま
     3D設定「世界のつながり」を「地域ごと」にすると止まる（localStorage 'mtq3d-join' = 'off'。ページを読み直す）
   ・地域のロジック（マップ・宝箱・人・出来事・出現の表）は地域ごとのまま。世界の中の位置（GRID）だけを決め、
     地図の端からとなりの地域へ「画面を切り替えずに」移る（徒歩・船・飛空艇。乗っている乗り物ごと）
   ・セーブは今までどおり「地域ID＋その地域の中の座標」。つないだ世界の座標は持たない（旧セーブ・2D のセーブで続きを遊べる）
   ・まだ行けない地域（GATE のフラグが立っていない）には、どの手段でも入れない（境目で止めて理由を出す）
   ・GRID の空き 2 か所は「外海」（sea76_south・sea76_east。深い海と小島だけ）。つないだときだけ作る
     （つないだ世界の外海にいるセーブを「地域ごと」で読んだときは、となりの地域の端へ移す）
   ・陸の橋：時の神殿領 ⇔ マクディア魔導王国、マクディア魔導王国 ⇔ 暗黒大陸（海の上の石の橋。歩いて渡れる。船は橋の下をくぐれる）
   ・海路（SEA_ROUTES）：つないだときは「となりどうし」の海路に作り直す（次の目的地の案内に使う）。空の道（天空群島）はそのまま
     天空群島へは、飛空艇で世界の北の端（いちばん上の段の地域）から上がる
   ・確認：docs/tools/v76/world76_check.js（jsdom）
   ========================================================= */
(function (root) {
  'use strict';
  var W76 = { CW: 160, CH: 120, listeners: [] };
  var GRID = [
    ['world', 'world_grania', 'world_kalion', 'world_snow'],
    ['world_islands', 'world_tempus', 'world_magicka', 'world_dark'],
    ['world_desert', 'sea76_south', 'world_dragon', 'sea76_east']
  ];
  var FILLERS = { sea76_south: { name: '南の外海', seed: 76201 }, sea76_east: { name: '南東の外海', seed: 76202 } };
  // まだ行けない地域：そのフラグが立つまでは、徒歩・船・飛空艇のどれでも入れない（text：境目で出す理由）
  var GATE = {
    world_kalion: { flag: 'kalion_open', text: 'カリオン徴収連邦の海域。灰の峠の関所を通るまでは、連邦の巡視船に追い返される。' },
    world_islands: { flag: 'galleon_ready', text: '南の外海は波が高い。遠洋航海船を手に入れるまでは渡れない。' },
    world_tempus: { flag: 'yorn_letter_done', text: '時の神殿領の海は深い霧に閉ざされている。（断裂群島での用事を済ませると霧が晴れる）' },
    world_desert: { flag: 'yorn_letter_done', text: 'リシア砂漠の沖は砂嵐で何も見えない。（断裂群島での用事を済ませると通れる）' },
    world_snow: { flag: 'yorn_letter_done', text: '忘却の雪原の海は流氷に閉ざされている。（断裂群島での用事を済ませると通れる）' },
    world_magicka: { flag: 'zeromea_choice_done', text: 'マクディア魔導王国の結界が、海も陸も閉ざしている。（ゼロメアでの出来事のあとで開く）' },
    world_dragon: { flag: 'magicka_arrived', text: '竜炎火山群島の噴煙で先が見えない。（マクディア魔導王国に着いてから）' },
    world_dark: { flag: 'dark_route_open', text: '暗黒大陸は黒い嵐に包まれていて近づけない。（闇の空路が開いてから）' }
  };
  var BRIDGES = [   // 陸の橋（a の東の端 ⇔ b の西の端。y は目安。実際の列は生成した地形から決める）
    { a: 'world_tempus', b: 'world_magicka', y: 60 },
    { a: 'world_magicka', b: 'world_dark', y: 62 }
  ];
  W76.GRID = GRID; W76.GATE = GATE; W76.FILLERS = FILLERS; W76.BRIDGES = BRIDGES;
  var CELL = {}; GRID.forEach(function (row, r) { row.forEach(function (id, c) { CELL[id] = { c: c, r: r }; }); });
  W76.isFiller = function (id) { return !!FILLERS[id]; };
  W76.inGrid = function (id) { return !!CELL[id]; };
  W76.setting = function () { try { return root.localStorage && root.localStorage.getItem('mtq3d-join') === 'off' ? 'off' : 'on'; } catch (e) { return 'on'; } };
  var ON = !!root.MTQ_JOIN76 && W76.setting() !== 'off';
  W76.on = function () { return ON && W76.ready; };
  W76.ready = false;
  W76.cellOf = function (id) { return CELL[id] || null; };
  W76.origin = function (id) { var c = CELL[id]; return c ? { x: c.c * W76.CW, y: c.r * W76.CH } : null; };
  W76.size = function () { return { w: GRID[0].length * W76.CW, h: GRID.length * W76.CH, cols: GRID[0].length, rows: GRID.length }; };
  W76.regionAt = function (gx, gy) { var c = Math.floor(gx / W76.CW), r = Math.floor(gy / W76.CH); if (r < 0 || r >= GRID.length || c < 0 || c >= GRID[0].length) return null; return GRID[r][c] || null; };
  W76.toGlobal = function (id, x, y) { var o = W76.origin(id); return o ? { x: o.x + x, y: o.y + y } : null; };
  W76.toLocal = function (gx, gy) { var id = W76.regionAt(gx, gy); if (!id) return null; var o = W76.origin(id); return { map: id, x: gx - o.x, y: gy - o.y }; };
  // 地図 id の (nx, ny)（端の外）が、となりの地域のどこか
  W76.neighbor = function (id, nx, ny) { var g = W76.toGlobal(id, nx, ny); if (!g) return null; var L = W76.toLocal(g.x, g.y); return L && L.map !== id ? L : null; };
  W76.sides = function (id) { var c = CELL[id]; if (!c) return null; var at = function (cc, rr) { return rr >= 0 && rr < GRID.length && cc >= 0 && cc < GRID[0].length && !!GRID[rr][cc]; }; return { n: at(c.c, c.r - 1), e: at(c.c + 1, c.r), s: at(c.c, c.r + 1), w: at(c.c - 1, c.r) }; };
  W76.neighbors = function (id) { var c = CELL[id]; if (!c) return []; var out = []; [[0, -1, 'n'], [1, 0, 'e'], [0, 1, 's'], [-1, 0, 'w']].forEach(function (v) { var rr = c.r + v[1], cc = c.c + v[0]; if (rr >= 0 && rr < GRID.length && cc >= 0 && cc < GRID[0].length && GRID[rr][cc]) { var o = W76.origin(GRID[rr][cc]), o0 = W76.origin(id); out.push({ id: GRID[rr][cc], side: v[2], dx: o.x - o0.x, dy: o.y - o0.y }); } }); return out; };
  function D() { return root.State && root.State.data; }
  W76.unlocked = function (id) { var g = GATE[id]; var d = D(); return !g || !!(d && d.flags && d.flags[g.flag]); };
  W76.gateText = function (id) { var g = GATE[id]; return g ? g.text : ''; };
  W76.onSwitch = function (fn) { W76.listeners.push(fn); };

  /* ---------- つないだときだけ：外海の地図・陸の橋・海路 ---------- */
  function fillerMacro(seed) {
    var rows = []; var s = seed; var rnd = function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (var y = 0; y < 30; y++) { var row = ''; for (var x = 0; x < 40; x++) row += (x < 2 || y < 2 || x > 37 || y > 27) ? '~' : 'o'; rows.push(row.split('')); }
    for (var k = 0; k < 3; k++) { var cx = 8 + Math.floor(rnd() * 24), cy = 7 + Math.floor(rnd() * 16); for (var dy = -2; dy <= 2; dy++) for (var dx = -3; dx <= 3; dx++) { var d2 = dx * dx / 9 + dy * dy / 4; if (d2 <= 1.1) rows[cy + dy][cx + dx] = d2 < 0.35 ? (k === 1 ? 'F' : '.') : (d2 < 0.8 ? '.' : '~'); else if (d2 <= 2.2 && rows[cy + dy] && rows[cy + dy][cx + dx] === 'o') rows[cy + dy][cx + dx] = '~'; } }
    return rows.map(function (r) { return r.join(''); });
  }
  function defineFillers() {
    if (!root.makeWorldRegion) return;
    Object.keys(FILLERS).forEach(function (id) { if (root.MAP_DEFS && root.MAP_DEFS[id]) return; var f = FILLERS[id];
      var def = root.makeWorldRegion({ id: id, name: f.name, MACRO: fillerMacro(f.seed), W: W76.CW, H: W76.CH, SEED: f.seed, LOCATIONS: [], ROADS: [], bgm: 'field', chests: [], npcs: [], events: [], encounters: null });
      def.filler76 = true; def.theme3d = { region: 'islands' }; });
  }
  var bridgeSet = {};   // 'map:x,y' → true（船が下をくぐれる橋のマス）
  W76.isBridge76 = function (mapId, x, y) { return !!bridgeSet[mapId + ':' + x + ',' + y]; };
  function rowsOf(id) { var def = root.MAP_DEFS && root.MAP_DEFS[id]; if (!def || typeof def.rows !== 'function') return null; return def.rows(); }
  var WATERC = { '~': 1, 'w': 1, '0': 1 };
  function passableChar(ch) { var T = root.Tiles; var name = T && T.byChar[ch]; return !!name && !T.isSolid(name) && !T.isWater(name); }
  function makeBridges() {
    BRIDGES.forEach(function (b) {
      var A = rowsOf(b.a), B = rowsOf(b.b); if (!A || !B) return;
      var best = null;
      for (var dy = 0; dy <= 14; dy++) [b.y - dy, b.y + dy].forEach(function (y) {
        if (best || y < 2 || y >= Math.min(A.length, B.length) - 2) return;
        var ra = A[y], rb = B[y]; var xa = ra.length - 1; while (xa >= 0 && WATERC[ra[xa]]) xa--; var xb = 0; while (xb < rb.length && WATERC[rb[xb]]) xb++;
        if (xa < 0 || xb >= rb.length) return; if (!passableChar(ra[xa]) || !passableChar(rb[xb])) return;
        var len = (ra.length - 1 - xa) + xb; if (len > 60) return; best = { y: y, xa: xa, xb: xb };
      });
      if (!best) return;
      var put = function (rows, id, x0, x1) { var y = best.y; var r = rows[y].split(''); for (var x = x0; x <= x1; x++) { r[x] = 'b'; bridgeSet[id + ':' + x + ',' + y] = true; } rows[y] = r.join(''); };
      put(A, b.a, best.xa + 1, A[best.y].length - 1); put(B, b.b, 0, best.xb - 1);
      b.at = best;
    });
  }
  function rebuildRoutes() {
    var old = root.SEA_ROUTES || []; W76.oldRoutes = old.slice();
    var keep = old.filter(function (r) { if (!r.sky) return false; var s = W76.sides(r.from.map); var e = { north: 'n', east: 'e', south: 's', west: 'w' }[r.from.edge]; return !(s && s[e]); });
    var EDGE = { n: 'north', e: 'east', s: 'south', w: 'west' }, OPP = { n: 'south', e: 'west', s: 'north', w: 'east' };
    Object.keys(CELL).forEach(function (id) { W76.neighbors(id).forEach(function (nb) {
      var sail = (id === 'world' && nb.id === 'world_grania') || (id === 'world_grania' && nb.id === 'world');
      keep.push({ vehicle: sail ? ['sailboat', 'galleon', 'airship'] : ['galleon', 'airship'], from: { map: id, edge: EDGE[nb.side] }, to: { map: nb.id, edge: OPP[nb.side] }, name: (root.MAP_DEFS[nb.id] || {}).name + 'へ', needFlag: GATE[nb.id] ? GATE[nb.id].flag : undefined, join76: true });
    }); });
    root.SEA_ROUTES = keep; if (root.Nav && root.Nav.resetGraph) root.Nav.resetGraph();
  }
  // 乗り物：橋の下をくぐれる・つないだ海路は端に立っただけでは移らない（端の外へ進んだときに W76.tryCross が移す）
  function patchVehicle() {
    var V = root.Vehicle; if (!V || V._w76) return; V._w76 = true;
    var ok0 = V.terrainOk; V.terrainOk = function (id, map, x, y) { if (W76.on() && map && W76.isBridge76(map.id, x, y)) { var def = V.def(id); return !!def && !map.npcAt(x, y) && def.terrain.indexOf('water') >= 0; } return ok0.apply(this, arguments); };
    var ra = V.routeAt; V.routeAt = function (map, x, y) { var r = ra.apply(this, arguments); if (r && r.join76) return null; return r; };
  }
  // 世界の北の端（いちばん上の段）から飛空艇で上へ：天空群島へ（もとの「北の空路」を使う）
  function skyRoute() { var rs = root.SEA_ROUTES || []; for (var i = 0; i < rs.length; i++) if (rs[i].sky && rs[i].to.map === 'world_sky' && rs[i].from.edge === 'north') return rs[i]; return null; }

  /* ---------- 境目を越える ---------- */
  var toastAt = 0;
  function say(t) { var now = Date.now(); if (now - toastAt < 1500) return; toastAt = now; if (root.Win && root.Win.toast) root.Win.toast(t); }
  // World.tryMove から（端の外へ進もうとしたとき）。戻り値：true＝移った（1歩の移動を始めた）／false＝止めた／null＝関係なし（従来の処理へ）
  W76.tryCross = function (m, p, dir, nx, ny) {
    if (!W76.on() || !m || !CELL[m.id]) return null;
    var d = D(); var aboard = d.aboard; var V = root.Vehicle; var World = root.World;
    var L = W76.neighbor(m.id, nx, ny);
    if (!L) {   // 世界の外：飛空艇で北の端なら天空群島へ。それ以外は進めない
      if (aboard && V.flies(aboard) && ny < 0) { var sr = skyRoute(); if (sr && (!sr.needFlag || d.flags[sr.needFlag])) { var arr = V.arrival(sr, p.x, p.y); if (arr) { World.busy = true; root.Win.message([sr.name + '。雲の上へ上がった。']).then(function () { World.enterMap(arr.map, arr.x, arr.y, 'up', { raw: true }); World.busy = false; }); return false; } } }
      say(aboard ? 'ここが世界の果て。これより先へは進めない' : 'これより先へは進めない'); return false;
    }
    if (!W76.unlocked(L.map)) { say(W76.gateText(L.map)); return false; }
    var m2 = World.getMap(L.map); var dd = World.delta(dir);
    if (aboard) {
      if (!V.terrainOk(aboard, m2, L.x, L.y)) { if (m2.tiles[L.y] && m2.tiles[L.y][L.x] === 'deep' && V.def(aboard).terrain.indexOf('deep') < 0) say('外海の潮流が強く、' + V.def(aboard).name + 'では進めない（遠洋航海船が必要）'); return false; }
    } else if (!m2.passable(L.x, L.y, d)) return false;
    W76.switchTo(L.map, L.x, L.y, dir, m.id);
    p.x = L.x - dd[0]; p.y = L.y - dd[1]; p.px = p.x * root.Engine.TS; p.py = p.y * root.Engine.TS;
    p.vehicleAction = null; p.moving = true; p.tx = L.x; p.ty = L.y; p.progress = 0;
    return true;
  };
  // 画面を切り替えずに地域を移る（enterMap の、場所を置き直さない版）
  W76.switchTo = function (id, x, y, dir, fromId) {
    var World = root.World, d = D(); var m = World.getMap(id); var o0 = W76.origin(fromId), o1 = W76.origin(id);
    World.map = m; World._lmAt = null; World._lmGrace = 2;
    World.enterHooks.forEach(function (fn) { try { fn(m); } catch (e) { console.error(e); } });
    World.applyState(m);
    if (d.aboard && root.Vehicle) root.Vehicle.syncToPlayer(m, x, y);
    d.visited[id] = true;
    if (root.Minimap) root.Minimap.onEnterMap(m, World.player);
    var bgm = m.def.bgm || 'field'; if (root.Audio && root.Audio.playBgm) root.Audio.playBgm(bgm);
    World.updateHud(); World.updatePlaceLabel();
    if (root.Win && root.Win.toast) root.Win.toast((d.aboard ? m.def.name + 'の海域に入った' : m.def.name + 'に入った'));
    W76.crossings = (W76.crossings || 0) + 1;
    var ev = { from: fromId, to: id, dx: o1.x - o0.x, dy: o1.y - o0.y };
    W76.listeners.forEach(function (fn) { try { fn(ev); } catch (e) { console.error(e); } });
  };

  /* ---------- セーブ：つないでいないときに外海にいたら、となりの地域の端へ ---------- */
  W76.normalizeSave = function (d) {
    if (!d || !d.pos || !FILLERS[d.pos.map] || (W76.on() && root.MAP_DEFS[d.pos.map])) return false;
    var g = W76.toGlobal(d.pos.map, d.pos.x, d.pos.y); var best = null;
    W76.neighbors(d.pos.map).forEach(function (nb) { if (FILLERS[nb.id] || !root.MAP_DEFS[nb.id]) return; var o = W76.origin(nb.id); var lx = Math.max(0, Math.min(W76.CW - 1, g.x - o.x)), ly = Math.max(0, Math.min(W76.CH - 1, g.y - o.y)); var dist = Math.abs(g.x - o.x - lx) + Math.abs(g.y - o.y - ly); if (!best || dist < best.dist) best = { map: nb.id, x: lx, y: ly, dist: dist }; });
    if (!best) return false;
    d.pos = { map: best.map, x: best.x, y: best.y, dir: d.pos.dir || 'down' };
    Object.keys(d.vehicles || {}).forEach(function (k) { var s = d.vehicles[k]; if (s && FILLERS[s.map]) { if (d.aboard === k) { s.map = best.map; s.x = best.x; s.y = best.y; } else if (s.port && !FILLERS[s.port.map]) { s.map = s.port.map; s.x = s.port.x; s.y = s.port.y; } else { var h = root.VEHICLES && root.VEHICLES[k] && root.VEHICLES[k].home; if (h) { s.map = h.map; s.x = h.x; s.y = h.y; } } } });
    return true;
  };
  function patchWorld() {
    var World = root.World; if (!World || World._w76) return; World._w76 = true;
    var st = World.start; World.start = function () { try { W76.normalizeSave(root.State.data); } catch (e) { console.error(e); } return st.apply(this, arguments); };
    var tm = World.tryMove; World.tryMove = function (dir) {
      var p = World.player, m = World.map; var dd = World.delta(dir); var nx = p.x + dd[0], ny = p.y + dd[1];
      if (W76.on() && m && (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h)) { p.dir = dir; var r = W76.tryCross(m, p, dir, nx, ny); if (r !== null) return r; }
      return tm.apply(this, arguments);
    };
  }

  W76.init = function () {
    if (W76._init) return; W76._init = true;
    patchWorld();
    if (!ON) return;
    // 地域の大きさが 160×120 でなければ、つながない（安全のため）
    var ok = Object.keys(CELL).every(function (id) { if (FILLERS[id]) return true; var r = rowsOf(id); return r && r.length === W76.CH && r[0].length === W76.CW; });
    if (!ok) { console.warn('World76: 地域の大きさが合わないため、つながない'); return; }
    defineFillers(); makeBridges(); rebuildRoutes(); patchVehicle();
    W76.ready = true;
  };
  root.World76 = W76;
  if (root.World && root.Vehicle && root.MAP_DEFS) W76.init();
})(typeof window !== 'undefined' ? window : globalThis);
