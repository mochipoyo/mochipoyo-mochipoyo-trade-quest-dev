/* =========================================================
   Data / v7.6 町の作り直し（見本）：リヴェル城下町・港町マリナ・砂都サハル
   ・高低差：段（levels76）・擁壁（ledge）・階段（steps）・坂（ramp）。決まりは js/rpg/terrace76.js（3D の形は Terrace76 → Terrace3D.js）
   ・建物の形の作り分け（shape76）：'round'（丸い家）／'tent'（テント）／'stall'（露店。中に入らない・カウンター越しに買う）／'octa'（八角の家・入口が斜め）
     横の入口：doorSide 'left'／'right'（js/core/map.js）。入口を変えた建物は、中の出口（外へ出る先）も同じマスへ直す
   ・パンの露店（js/data/bread76.js の品）。サハルの武器・防具は露店で買える（中の店＝工房も残す）
   ・当てる条件：EnvLayout の切り替えが「新しい間取り」のとき（設定で「元の間取り」にすると、元の町に戻る。立ち位置は World.enterMap が直す）
   ・消さない：NPC・イベント・宝箱・ワープ・建物と中のマップはすべて残す（位置・入口だけ動かす）。元の定義は def._orig76 に控える
   ・最後に Terrace76 の決まりに合わない所を擁壁で埋める（autoLedge）。守るマス（ワープ・入口の前・NPC・イベント・宝箱・入ってくる位置）は埋めない
   ========================================================= */
(function (root) {
  'use strict';
  var D = root.MAP_DEFS, T76 = root.Terrace76, EL = root.EnvLayout, TL = root.Tiles;
  if (!D || !T76 || !TL) return;
  var T = root.Towns76 = { VERSION: 1, applied: {}, errors: [], fixes: {}, off: false };
  if (EL && EL.enabled === false) { T.off = true; return; }

  var BREAD = root.BREAD76 || {};
  var clone = function (o) { return Object.assign({}, o); };
  var bld = function (def, id) { for (var i = 0; i < def.buildings.length; i++) if (def.buildings[i].id === id) return def.buildings[i]; return null; };
  var foot = function (b) { var out = []; for (var y = b.y; y < b.y + b.h; y++) for (var x = b.x; x < b.x + b.w; x++) out.push([x, y]); return out; };
  // 建物の入口（js/core/map.js と同じ計算）
  var door = function (b) {
    var d = { x: b.x + (b.doorX || 0), y: b.y + b.h - 1 };
    if (b.doorSide === 'left' || b.doorSide === 'right') d = { x: b.doorSide === 'left' ? b.x : b.x + b.w - 1, y: b.y + (b.doorY !== undefined ? b.doorY : b.h - 1) };
    var f = b.doorSide === 'left' ? { x: d.x - 1, y: d.y } : b.doorSide === 'right' ? { x: d.x + 1, y: d.y } : { x: d.x, y: d.y + 1 };
    return { door: d, front: f };
  };
  // 中のマップの「外へ出る」ワープを、新しい入口の前へ
  var setExit = function (town, b) {
    var m = b.interior && D[b.interior]; if (!m || !m.warps) return; var f = door(b).front;
    m.warps = m.warps.map(function (q) { if (q.to !== town) return q; var c = clone(q); c.tx = f.x; c.ty = f.y; return c; });
  };
  var shopNpc = function (id, x, y, sprite, name, lines, kind, stock) {
    return { id: id, x: x, y: y, sprite: sprite, dir: 'down', wander: 0, v76: true,
      talk: async function (c) { if (lines && lines.length) await c.say(name, lines); await c.shop(kind, stock); } };
  };
  var breadLines = function (town) { return town === 'harbor_town' ? ['焼きたてのパンだよ！ 港の魚サンドは船乗りの力の元さ。', '食べると傷が治って、次の戦闘3回まで力が少し湧くよ。'] : town === 'sahar_city' ? ['砂の町のパンは日持ちが命。なつめやしのパンは足が軽くなるよ。', '食べると回復して、次の戦闘3回まで少し強くなれるんだ。'] : ['焼きたてだよ！ 勇者のバゲットは城の兵士にも人気さ。', '食べると回復して、次の戦闘3回まで能力が少し上がるよ。'] };

  /* ---------- 町ごとの計画 ---------- */
  var PLANS = {};
  // 砂都サハル：北の段（上の町）と大通りの石段（ガート）。武器・防具は露店（奥に工房）、テント・丸い家・八角の家
  PLANS.sahar_city = { ground: 's', style: { stone: '#d8c09a', cap: '#efe2c4', step: '#e2cfa8', rail: '#f2e6cc', ledge: 'wall' }, apply: function (def, E) {
    E.level(1, 1, 38, 8, 1);
    for (var x = 2; x <= 37; x++) E.put(x, 9, (x === 13 || x === 14 || x === 25 || x === 26) ? '|' : '/');   // 大通りの石段（途中に花鉢の擁壁）
    E.put(1, 9, '|').put(38, 9, '|');
    var b;
    b = bld(def, 'guild'); if (b) b.shape76 = 'tent';
    b = bld(def, 'inn'); if (b) b.doorSide = 'right';
    b = bld(def, 'weapon'); if (b) Object.assign(b, { x: 34, y: 3, w: 4, h: 4, doorX: 1, shape76: 'round', name: '曲刀の工房' });
    b = bld(def, 'armor'); if (b) Object.assign(b, { x: 34, y: 13, w: 4, h: 4, doorX: 1, shape76: 'tent', name: '布と鎧の工房' });
    b = bld(def, 'item'); if (b) b.shape76 = 'round';
    b = bld(def, 'water'); if (b) Object.assign(b, { doorX: 7, shape76: 'octa' });
    b = bld(def, 'a3_sahar_water'); if (b) b.shape76 = 'round';
    b = bld(def, 'x72_house'); if (b) b.shape76 = 'tent';
    b = bld(def, 'x72_hall'); if (b) b.doorSide = 'left';
    b = bld(def, 'x72_ex0'); if (b) b.shape76 = 'tent';
    var ws = D.sahar_weapon && D.sahar_weapon.shop, as = D.sahar_armor && D.sahar_armor.shop;
    def.buildings.push({ id: 'weapon_stall76', type: 'weapon', shape76: 'stall', name: '曲刀の露店', x: 29, y: 5, w: 4, h: 2, doorX: 1, keeper76: { x: 1, y: 0 }, v76: true });
    def.buildings.push({ id: 'armor_stall76', type: 'armor', shape76: 'stall', name: '布と鎧の露店', x: 29, y: 15, w: 4, h: 2, doorX: 1, keeper76: { x: 1, y: 0 }, v76: true });
    def.buildings.push({ id: 'bread_stall76', type: 'bakery', shape76: 'stall', name: 'パンの露店', x: 22, y: 11, w: 3, h: 2, doorX: 1, keeper76: { x: 1, y: 0 }, v76: true });
    if (ws) def.npcs.push(shopNpc('sahar_weapon_stall76', 30, 5, 'merchant', '曲刀の露店', ['砂漠の曲刀はよく切れるぜ。奥の工房で打ったばかりだ。'], 'weapon', ws.stock.slice()));
    if (as) def.npcs.push(shopNpc('sahar_armor_stall76', 30, 15, 'villager_f', '布と鎧の露店', ['日差しを防ぐ布の鎧なら、うちが一番よ。'], 'armor', as.stock.slice()));
    def.npcs.push(shopNpc('sahar_bread76', 23, 11, 'villager_f', 'パン売り', breadLines('sahar_city'), 'item', (BREAD.sahar_city || []).slice()));
  } };
  // 港町マリナ：上の町（入口・家々）と、浜と桟橋の下の港。大階段・坂・桟橋の先の階段
  PLANS.harbor_town = { ground: '.', style: { stone: '#c8c0b0', cap: '#eeeae0', step: '#d4ccbc', rail: '#f4f0e6', ledge: 'rail' }, apply: function (def, E) {
    E.level(0, 0, 73, 23, 1);
    for (var x = 0; x <= 51; x++) E.put(x, 23, '|');
    E.put(2, 23, ';').put(3, 23, ';');   // 浜への坂
    for (var x2 = 24; x2 <= 27; x2++) E.put(x2, 23, '/');   // 桟橋への大階段
    E.put(44, 23, ';').put(45, 23, ';');   // パン屋の前から浜への坂
    E.put(52, 23, '/');   // 東の入り江への石段
    E.level(56, 24, 57, 25, 1).level(66, 24, 67, 25, 1);   // 東の桟橋（上の高さのまま海へ）
    E.put(56, 26, '/').put(57, 26, '/').put(66, 26, '/').put(67, 26, '/');   // 桟橋の先の石段（下の岸へ）
    E.put(73, 24, '/');
    var b;
    b = bld(def, 'a3_harbor_net'); if (b) b.doorSide = 'right';
    b = bld(def, 'house'); if (b) b.shape76 = 'round';
    b = bld(def, 'x72_house'); if (b) b.shape76 = 'round';
    b = bld(def, 'x72_hall'); if (b) Object.assign(b, { doorX: 0, shape76: 'octa' });
    def.buildings.push({ id: 'bread_stall76', type: 'bakery', shape76: 'stall', name: 'パンの露店', x: 44, y: 20, w: 3, h: 2, doorX: 1, keeper76: { x: 1, y: 0 }, v76: true });
    def.npcs.push(shopNpc('harbor_bread76', 45, 20, 'villager_f', 'パン売り', breadLines('harbor_town'), 'item', (BREAD.harbor_town || []).slice()));
  } };
  // リヴェル城下町：城の段（上）・町の中の段（中）・南の町（下）。城へは堀の橋から大階段。中と下は擁壁と階段・坂
  PLANS.rivel_town = { ground: '=', style: { stone: '#b8b0a0', cap: '#e8e2d4', step: '#d0c8b8', rail: '#efe9dc', ledge: 'rail' }, apply: function (def, E) {
    E.level(0, 0, 61, 14, 2).level(0, 15, 61, 31, 1).level(62, 0, 87, 55, 1);
    E.put(2, 14, '/').put(3, 14, '/').put(16, 14, '|').put(17, 14, '|');
    for (var x = 46; x <= 48; x++) E.put(x, 14, '|');
    for (var x1 = 59; x1 <= 61; x1++) E.put(x1, 14, '/');
    for (var x2 = 30; x2 <= 33; x2++) E.put(x2, 15, '/');   // 城への大階段（堀の橋から）
    for (var x3 = 2; x3 <= 61; x3++) E.put(x3, 32, '|');
    E.put(10, 32, ';').put(11, 32, ';');   // 西の坂
    E.put(30, 32, '/').put(32, 32, '/').put(33, 32, '/');   // 噴水の広場から南の町へ（噴水 31,31 の下は擁壁）
    E.put(50, 32, '/').put(51, 32, '/');
    var b;
    b = bld(def, 'armor'); if (b) b.doorSide = 'left';
    b = bld(def, 'tavern'); if (b) Object.assign(b, { doorX: 9, shape76: 'octa' });
    b = bld(def, 'x72_ex0'); if (b) b.shape76 = 'round';
    b = bld(def, 'x72_ex1'); if (b) b.doorSide = 'left';
    b = bld(def, 'x72_ex2'); if (b) b.shape76 = 'round';
    b = bld(def, 'x72_ex3'); if (b) b.doorSide = 'right';
    b = bld(def, 'x72_ex4'); if (b) Object.assign(b, { doorX: 0, shape76: 'octa' });
    def.buildings.push({ id: 'bread_stall76', type: 'bakery', shape76: 'stall', name: 'パンの露店', x: 38, y: 26, w: 3, h: 2, doorX: 1, keeper76: { x: 1, y: 0 }, v76: true });
    def.npcs.push(shopNpc('rivel_bread76', 39, 26, 'villager_f', 'パン売り', breadLines('rivel_town'), 'item', (BREAD.rivel_town || []).slice()));
    // 東の地区のパン屋（建物の中）にもパン職人
    var bk = D.rivel_town_x72_ex2; if (bk && bk.npcs && !bk.npcs.some(function (n) { return n.id === 'rivel_baker76'; })) { bk.npcs = bk.npcs.concat([shopNpc('rivel_baker76', 5, 2, 'merchant', 'パン職人', ['いらっしゃい！ 朝から焼いたパンが並んでるよ。', '食べると回復して、次の戦闘3回まで能力が少し上がるんだ。'], 'item', (BREAD.rivel_town || []).slice())]); }
  } };

  /* ---------- 当てる ---------- */
  var ROOFISH = function (ch) { var n = TL.byChar[ch]; return !n || /^roof_|^wall/.test(n) || n === 'floor_wood' || n === 'floor_stone'; };
  // 守るマス：ワープ・入口と入口の前・NPC・イベント・宝箱・ほかのマップから入ってくる位置・露店の前
  var anchorsOf = function (id, def) {
    var A = {}; var add = function (x, y, why) { A[x + ',' + y] = why; };
    (def.warps || []).forEach(function (q) { add(q.x, q.y, 'ワープ'); });
    (def.npcs || []).forEach(function (n) { add(n.x, n.y, 'NPC ' + n.id); });
    (def.events || []).forEach(function (e) { add(e.x, e.y, 'イベント'); });
    (def.chests || []).forEach(function (c) { add(c.x, c.y, '宝箱 ' + c.id); });
    (def.buildings || []).forEach(function (b) { var d = door(b); if (b.shape76 === 'stall' && !b.interior) { for (var x = b.x; x < b.x + b.w; x++) add(x, b.y + b.h, '露店の前 ' + b.id); return; } add(d.front.x, d.front.y, '入口の前 ' + b.id); });
    Object.keys(D).forEach(function (k) { var m = D[k]; if (!m || k === id) return; (m.warps || []).forEach(function (q) { if (q.to === id && q.tx !== undefined) add(q.tx, q.ty, '入ってくる位置（' + k + '）'); }); });
    (root.WORLD_LOCATIONS || []).forEach(function (L) { if (L.to === id && L.tx !== undefined) add(L.tx, L.ty, '町の入口'); });
    return A;
  };
  // 決まりに合うまで擁壁で埋める（高い側の平らなマス。階段の横は平らなマス）
  var autoLedge = function (id, def) {
    var A = anchorsOf(id, def); var fixes = 0;
    for (var it = 0; it < 12; it++) {
      var rows = def.rows; var H = rows.length, W = rows[0].length; var tiles = [];
      for (var y = 0; y < H; y++) { var r = []; for (var x = 0; x < W; x++) r.push(TL.byChar[rows[y][x]] || def.fallback || 'grass'); tiles.push(r); }
      (def.buildings || []).forEach(function (b) { foot(b).forEach(function (p) { if (p[1] >= 0 && p[1] < H && p[0] >= 0 && p[0] < W) tiles[p[1]][p[0]] = 'bld_block'; }); if (!(b.shape76 === 'stall' && !b.interior)) { var d = door(b).door; if (tiles[d.y]) tiles[d.y][d.x] = 'bld_door'; } });
      var fake = { w: W, h: H, tiles: tiles, def: def }; var probs = T76.problems(fake); if (!probs.length) break;
      var E = T76.editor(def); var changed = 0;
      // 階段の上り口・下り口のマス（ここは擁壁にしない＝階段が向きを失う）
      var land = {}; for (var ly = 0; ly < H; ly++) for (var lx = 0; lx < W; lx++) { if (!T76.isStair(tiles[ly][lx])) continue; var dd = T76.stepDir(fake, lx, ly); if (dd) { land[(lx + dd[0]) + ',' + (ly + dd[1])] = 1; land[(lx - dd[0]) + ',' + (ly - dd[1])] = 1; } }
      probs.forEach(function (p) {
        if (!p.b) { T.errors.push(id + '：' + p.text); return; }
        var a = p.a, b = p.b; var ta = tiles[a[1]][a[0]], tb = tiles[b[1]][b[0]]; var sa = T76.isStair(ta), sb = T76.isStair(tb);
        var la = T76.levelAt(def, a[0], a[1]), lb = T76.levelAt(def, b[0], b[1]);
        var pick = sa && !sb ? b : sb && !sa ? a : (la >= lb ? a : b); if (sa && sb) { T.errors.push(id + '：' + p.text); return; }
        if (!sa && !sb && land[pick[0] + ',' + pick[1]]) { var oth = pick === a ? b : a; if (!land[oth[0] + ',' + oth[1]]) pick = oth; }
        var k = pick[0] + ',' + pick[1]; if (A[k]) { var other = pick === a ? b : a; var ko = other[0] + ',' + other[1]; if (A[ko] || T76.isStair(tiles[other[1]][other[0]])) { T.errors.push(id + '：守るマスにかかる ' + p.text + '（' + A[k] + '）'); return; } pick = other; k = ko; }
        if (E.ch(pick[0], pick[1]) !== '|') { E.put(pick[0], pick[1], '|'); changed++; fixes++; }
      });
      if (!changed) break;
    }
    T.fixes[id] = fixes;
  };
  var apply = function (id) {
    var P = PLANS[id], def = D[id]; if (!P || !def || typeof def.rows === 'function' || def.plan76) return;
    try {
      def._orig76 = { rows: def.rows, buildings: def.buildings, npcs: def.npcs, noLayout: def.noLayout, exits: {} };
      def.rows = def.rows.slice(); def.buildings = (def.buildings || []).map(clone); def.npcs = (def.npcs || []).slice();
      def.buildings.forEach(function (b) { if (b.interior && D[b.interior]) def._orig76.exits[b.interior] = D[b.interior].warps; });
      var before = {}; def.buildings.forEach(function (b) { before[b.id] = { x: b.x, y: b.y, w: b.w, h: b.h, doorX: b.doorX, doorSide: b.doorSide }; });
      var E = T76.editor(def); P.apply(def, E);
      // 階段・坂のマスの段＝となり（4方向）の平らな通れるマスのうち低いほう（高いほうの段は＋1 になるように計画で置く）
      var walkCh = function (x, y) { var n = TL.byChar[E.ch(x, y)]; return !!n && !TL.isSolid(n); };
      var isSt = function (x, y) { var c = E.ch(x, y); return c === '/' || c === ';'; };
      var stairLv = [];
      for (var sy = 0; sy < E.H; sy++) for (var sx = 0; sx < E.W; sx++) { if (!isSt(sx, sy)) continue; var lo = 99; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { var nx = sx + o[0], ny = sy + o[1]; if (nx < 0 || ny < 0 || nx >= E.W || ny >= E.H || isSt(nx, ny) || !walkCh(nx, ny)) return; lo = Math.min(lo, E.lv(nx, ny)); }); if (lo < 99) stairLv.push([sx, sy, lo]); }
      stairLv.forEach(function (p) { E.levelCells([[p[0], p[1]]], p[2]); });
      // 動かした・小さくした建物の元の足元：屋根の文字のままなら地面へ
      var cover = {}; def.buildings.forEach(function (b) { foot(b).forEach(function (p) { cover[p[0] + ',' + p[1]] = 1; }); });
      Object.keys(before).forEach(function (bid) { var o = before[bid]; foot(o).forEach(function (p) { if (cover[p[0] + ',' + p[1]]) return; if (ROOFISH(E.ch(p[0], p[1]))) E.put(p[0], p[1], P.ground); }); });
      // 建物の足元の段＝入口の段（3D で建物を持ち上げる高さと同じ）
      def.buildings.forEach(function (b) { var d = door(b).door; var L = E.lv(d.x, d.y); foot(b).forEach(function (p) { E.levelCells([p], L); }); });
      // 入口・形を変えた建物は中の出口も直す
      def.buildings.forEach(function (b) { var o = before[b.id]; if (!o || o.x !== b.x || o.y !== b.y || o.w !== b.w || o.h !== b.h || o.doorX !== b.doorX || o.doorSide !== b.doorSide) setExit(id, b); });
      def.terrace76Style = P.style; def.noLayout = true; def.plan76 = true;
      autoLedge(id, def);
      // 擁壁のマスの段＝となり（4方向）の通れるマスのうち高いほう（階段は上の段）＝上の段の縁（手すりは低い側に付く）
      var E2 = T76.editor(def); var ledgeLv = [];
      for (var ly = 0; ly < E2.H; ly++) for (var lx = 0; lx < E2.W; lx++) { if (E2.ch(lx, ly) !== '|') continue; var hi = -1; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { var nx = lx + o[0], ny = ly + o[1]; if (nx < 0 || ny < 0 || nx >= E2.W || ny >= E2.H) return; var c = E2.ch(nx, ny); var n = TL.byChar[c]; if (!n || TL.isSolid(n)) return; hi = Math.max(hi, E2.lv(nx, ny) + (c === '/' || c === ';' ? 1 : 0)); }); if (hi >= 0) ledgeLv.push([lx, ly, hi]); }
      ledgeLv.forEach(function (p) { E2.levelCells([[p[0], p[1]]], p[2]); });
      T.applied[id] = true;
    } catch (e) { T.errors.push(id + '：' + (e && e.message)); }
  };
  T.PLANS = PLANS; T.door = door; T.anchorsOf = anchorsOf;
  Object.keys(PLANS).forEach(apply);
})(typeof window !== 'undefined' ? window : globalThis);
