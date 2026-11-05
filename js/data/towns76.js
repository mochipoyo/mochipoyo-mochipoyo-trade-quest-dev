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
    E.put(0, 23, ';');   // 町の西の端（外へ出られるマス）は坂にして通れるまま
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
    E.put(31, 31, 'r'); for (var x5 = 30; x5 <= 34; x5++) E.put(x5, 32, '/');   // 広場から南の町へ（幅4の階段。噴水は中の段の十字路へ移した）
    E.put(31, 20, 'Q').put(32, 20, 'Q').put(31, 21, 'Q').put(32, 21, 'Q');   // 大きな噴水（2×2）：中の段の大通りの十字路の真ん中
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

  /* =========================================================
     見本の作り方を残りの町へ（自動の計画）
     ・読み込み時（定義）：建物の形（地域の飾りのテーマで選ぶ）・横の入口・角の入口・パンの露店と売り子
     ・マップを作るとき（EnvLayout の街路のあと）：段の境（擁壁・階段・坂）。行ける所・話せる人が変わる段は付けない（T.terraceMap）
     ・対象外：専用レシピの町（ポヨ村・ノード・第7居住区・トレディア）・物語のアサナの4町・空のテラス（近未来）
     ========================================================= */
  var AUTO = ['dow_village', 'verum_town', 'kalion_city', 'erased_village', 'sentra_capital', 'aruna_village', 'aruna_ruins', 'tempus_city', 'magicka_city', 'star_camp', 'dark_camp', 'mirror_market', 'ignas_town', 'ciel_port', 'frost_town', 'luxbell', 'volatilia', 'rivel_artisan'];
  var hashS = function (s, k) { var h = 2166136261 ^ (k || 0); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; };
  var THEME = function (id) { var PD = root.PLACE_DECOR; try { return PD && PD.forMap ? PD.forMap(id) : null; } catch (e) { return null; } };
  var BREADS = { forest: ['bread_round', 'bread_milk', 'bread_honey'], harbor: ['bread_round', 'bread_milk', 'bread_fish'], desert: ['bread_round', 'bread_honey', 'bread_date'], ruins: ['bread_round', 'bread_herb'], dark: ['bread_round', 'bread_herb', 'bread_baguette'], frost: ['bread_round', 'bread_milk', 'bread_honey', 'bread_baguette'], sky: ['bread_round', 'bread_honey'] };
  var breadFor = function (theme) { return (BREADS[theme] || ['bread_round', 'bread_milk', 'bread_honey', 'bread_herb', 'bread_baguette']).filter(function (x) { return root.ITEMS && root.ITEMS[x]; }); };
  // 定義の上での歩ける（建物の足元は通れない）
  var defGrid = function (def) { var rows = def.rows; var H = rows.length, W = rows[0].length; var g = []; for (var y = 0; y < H; y++) { var r = []; for (var x = 0; x < W; x++) { var n = TL.byChar[rows[y][x]] || def.fallback || 'grass'; r.push(!TL.isSolid(n)); } g.push(r); }
    (def.buildings || []).forEach(function (b) { foot(b).forEach(function (p) { if (g[p[1]]) g[p[1]][p[0]] = false; }); if (!(b.shape76 === 'stall' && !b.interior)) { var d0 = door(b).door; if (g[d0.y]) g[d0.y][d0.x] = true; } }); return g; };
  var reachAll = function (id, def, grid) {   // 町に入る位置から、守るマスへ（隣でもよい）
    var H = grid.length, W = grid[0].length; var A = anchorsOf(id, def); var starts = []; Object.keys(D).forEach(function (k) { (D[k].warps || []).forEach(function (q) { if (q.to === id && k !== id) starts.push([q.tx, q.ty]); }); });
    var seen = {}; var qq = []; starts.forEach(function (s0) { if (grid[s0[1]] && grid[s0[1]][s0[0]] && !seen[s0[0] + ',' + s0[1]]) { seen[s0[0] + ',' + s0[1]] = 1; qq.push(s0); } }); if (!qq.length) return false;
    while (qq.length) { var a = qq.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { var nx = a[0] + o[0], ny = a[1] + o[1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[nx + ',' + ny] || !grid[ny][nx]) return; seen[nx + ',' + ny] = 1; qq.push([nx, ny]); }); }
    return Object.keys(A).every(function (k) { var p = k.split(',').map(Number); if (seen[k]) return true; return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (o) { return seen[(p[0] + o[0]) + ',' + (p[1] + o[1])]; }); });
  };
  var autoBuildings = function (id, def) {
    var theme = THEME(id) || ''; var log = []; if (theme === 'casino' || theme === 'tech' || theme === 'machine') return log;
    var grid0 = defGrid(def); var free = function (x, y) { return grid0[y] && grid0[y][x]; };
    var A0 = anchorsOf(id, def);
    var setSafe = function (b, props, why) {   // 入口を変える：新しい入口の前が歩けて、ほかの守るマスでなく、全部に行けるときだけ
      var keep = {}; Object.keys(props).forEach(function (k2) { keep[k2] = b[k2]; }); Object.assign(b, props); var f = door(b).front;
      var ok = free(f.x, f.y) && !A0[f.x + ',' + f.y] && reachAll(id, def, defGrid(def));
      if (!ok) { Object.keys(keep).forEach(function (k2) { if (keep[k2] === undefined) delete b[k2]; else b[k2] = keep[k2]; }); return false; } log.push(b.id + '：' + why); return true;
    };
    var sides = 0;
    def.buildings.forEach(function (b) {
      if (b.v76 || /^(castle|elevator|watchtower|windmill|ship)$/.test(b.type || '') || b.s3121) return;
      var h = hashS(id + ':' + b.id, 7); var t = b.type || 'house';
      if (theme === 'desert') { if (t === 'house' || t === 'guild' || t === 'elder') b.shape76 = h < 0.55 ? 'tent' : 'round'; else if (t === 'item' && h < 0.5) b.shape76 = 'round'; }
      else if (theme === 'harbor' || theme === 'sky') { if (t === 'house' && h < 0.45) b.shape76 = 'round'; else if ((t === 'tavern' || t === 'guild') && h < 0.6) { if (!setSafe(b, { doorX: h < 0.3 ? 0 : b.w - 1, shape76: 'octa' }, '八角（角の入口）')) b.shape76 = 'octa'; } }
      else { if (t === 'house' && h < 0.3) b.shape76 = 'round'; else if ((t === 'tavern' || t === 'elder' || t === 'guild' || t === 'church') && h < 0.5 && t !== 'church') { if (!setSafe(b, { doorX: h < 0.25 ? 0 : b.w - 1, shape76: 'octa' }, '八角（角の入口）')) b.shape76 = 'octa'; } }
      if (!b.shape76 && sides < 2 && (t === 'house' || t === 'item' || t === 'armor' || t === 'bank') && h > 0.55) { if (setSafe(b, { doorSide: h > 0.78 ? 'right' : 'left' }, '横の入口')) sides++; }
      if (b.shape76) log.push(b.id + '：' + b.shape76);
    });
    return log;
  };
  // パンの露店：町の真ん中に近い、歩ける 3×2 と手前の 3 マス（守るマス・建物でない）。置いたあとも全部に行けるときだけ
  // 人・調べる所が立ったときにだけ行けなくなるマス（行き止まり）が、露店を置いて新しくできないか
  var pocketNew = function (id, def, g0, g1) {
    var H = g0.length, W = g0[0].length; var blk = {}; (def.npcs || []).forEach(function (n) { blk[n.x + ',' + n.y] = 1; }); (root.SEARCH_POINTS || []).forEach(function (sp) { if (sp && sp.map === id) blk[sp.x + ',' + sp.y] = 1; });
    var starts = []; Object.keys(D).forEach(function (k) { (D[k].warps || []).forEach(function (q) { if (q.to === id && k !== id) starts.push([q.tx, q.ty]); }); });
    var reach = function (g, b) { var seen = {}; var q = starts.filter(function (s0) { return g[s0[1]] && g[s0[1]][s0[0]]; }); q.forEach(function (s0) { seen[s0[0] + ',' + s0[1]] = 1; }); for (var i = 0; i < q.length; i++) { var a = q[i]; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { var nx = a[0] + o[0], ny = a[1] + o[1], k = nx + ',' + ny; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[k] || !g[ny][nx] || (b && b[k])) return; seen[k] = 1; q.push([nx, ny]); }); } return seen; };
    var pk = function (g) { var a = reach(g, null), b = reach(g, blk); var o = {}; Object.keys(a).forEach(function (k) { if (!b[k] && !blk[k]) o[k] = 1; }); return o; };
    var p0 = pk(g0), p1 = pk(g1); return Object.keys(p1).some(function (k) { return !p0[k]; });
  };
  var autoBread = function (id, def) {
    var grid = defGrid(def); var H = grid.length, W = grid[0].length; var A = anchorsOf(id, def); var rows = def.rows;
    var cands = [];
    for (var y = 2; y < H - 3; y++) for (var x = 2; x < W - 4; x++) {
      var ok = true; for (var dy = 0; dy < 3 && ok; dy++) for (var dx = 0; dx < 3 && ok; dx++) { var X = x + dx, Y = y + dy; if (!grid[Y][X] || A[X + ',' + Y]) ok = false; var n = TL.byChar[rows[Y][X]]; if (n === 'bridge' || n === 'dock' || n === 'stairs_up' || n === 'stairs_down') ok = false; }
      if (!ok) continue; var d = Math.abs(x + 1 - W / 2) / W + Math.abs(y + 1 - H / 2) / H; cands.push({ x: x, y: y, s: d + hashS(id + x + ',' + y, 3) * 0.05 });
    }
    cands.sort(function (a, b) { return a.s - b.s; });
    for (var i = 0; i < Math.min(cands.length, 40); i++) {
      var c = cands[i]; var bld = { id: 'bread_stall76', type: 'bakery', shape76: 'stall', name: 'パンの露店', x: c.x, y: c.y, w: 3, h: 2, doorX: 1, keeper76: { x: 1, y: 0 }, v76: true };
      def.buildings.push(bld); var g2 = defGrid(def); g2[c.y][c.x + 1] = false;   // 店主のマス（動かない）
      if (reachAll(id, def, g2) && !pocketNew(id, def, grid, g2)) { def.npcs.push(shopNpc(id + '_bread76', c.x + 1, c.y, 'villager_f', 'パン売り', breadLines(id), 'item', breadFor(THEME(id)))); if (root.EnvLayout && root.EnvLayout.EXTRA_ARRIVALS) for (var k = 0; k < 3; k++) root.EnvLayout.EXTRA_ARRIVALS.push([id, c.x + k, c.y + 2]); return c; }
      def.buildings.pop();
    }
    return null;
  };
  T.auto = {};
  AUTO.forEach(function (id) {
    var def = D[id]; if (!def || typeof def.rows === 'function' || def.plan76 || def.s3121) return;
    try {
      def._orig76 = { rows: def.rows, buildings: def.buildings, npcs: def.npcs, noLayout: def.noLayout, exits: {} };
      def.buildings = (def.buildings || []).map(clone); def.npcs = (def.npcs || []).slice();
      var before = {}; def.buildings.forEach(function (b) { before[b.id] = { doorX: b.doorX, doorSide: b.doorSide }; if (b.interior && D[b.interior]) def._orig76.exits[b.interior] = D[b.interior].warps; });
      var log = autoBuildings(id, def); var br = autoBread(id, def);
      def.buildings.forEach(function (b) { var o = before[b.id]; if (o && (o.doorX !== b.doorX || o.doorSide !== b.doorSide)) setExit(id, b); });
      def.auto76 = true; T.auto[id] = { buildings: log, bread: br ? br.x + ',' + br.y : null };
    } catch (e) { T.errors.push(id + '：' + (e && e.message)); }
  });

  /* ---------- 段（マップを作るとき・EnvLayout の街路のあと） ---------- */
  var ROADY = { road: 1, path_stone: 1, stone: 1, path: 1, bridge: 0 };
  T.DETOUR = { add: 8, ratio: 0.2 };   // 段のある町の大回りの許し：元の道のり＋8歩＋2割まで（擁壁を回って階段へ行く分。段のない作り直しは EnvLayout の＋4歩＋1割）
  T.terraceMap = function (m) {
    var def = m.def; if (!def || !def.auto76 || def.levels76 && !def._auto76lv) return; if (root.EnvLayout && root.EnvLayout.enabled === false) return;   // 元の間取りでは段を付けない
    if (def._auto76lv) { applyLv(m, def._auto76lv); return; }
    var W = m.w, H = m.h; var id = m.id; var A = anchorsOf(id, def);
    (m.buildings || []).forEach(function (b) { if (b.doorFront) A[b.doorFront.x + ',' + b.doorFront.y] = 1; if (b.doorAbs) A[b.doorAbs.x + ',' + b.doorAbs.y] = 1; });
    var WARP = {}; (m.warps || []).forEach(function (q) { A[q.x + ',' + q.y] = 1; WARP[q.x + ',' + q.y] = 1; });
    var BLK = {}; (def.chests || []).forEach(function (c) { BLK[c.x + ',' + c.y] = 1; }); (def.events || []).forEach(function (e) { if (e && e.solid) BLK[e.x + ',' + e.y] = 1; }); (root.SEARCH_POINTS || []).forEach(function (sp) { if (sp && sp.map === id && root.Search && root.Search.solidAt && root.Search.solidAt(m, sp.x, sp.y)) BLK[sp.x + ',' + sp.y] = 1; });   // あとで通れなくなる物（宝箱・壺・閉じた扉）
    var walk = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && !TL.isSolid(m.tiles[y][x]) && !BLK[x + ',' + y]; };
    var cands76 = [];
    var castle = (m.buildings || []).filter(function (b) { return b.type === 'castle'; })[0];
    var stallRows = {}; (m.buildings || []).forEach(function (b) { if (b.shape76 === 'stall') for (var sy = b.y - 1; sy <= b.y + b.h; sy++) stallRows[sy] = 1; });   // 露店は1つの段の上に（境の行・その上下にかけない）
    for (var r = Math.ceil(H * 0.3); r <= Math.floor(H * 0.7); r++) {
      if (stallRows[r] || stallRows[r - 1]) continue;
      if ((m.npcs || []).some(function (n) { return /^aunt67_/.test(n.id) && Math.abs(n.y - r) <= 2; })) continue;   // 豆知識おばさんのまわり（5×5）は空けておく（chatter67）
      var cells = []; var bad = false; var canS = {}; var stairs = []; var ledges = []; var roads = 0;
      for (var x = 0; x < W; x++) { if (!walk(x, r)) continue; var t = m.tiles[r][x]; if (t === 'bridge' || t === 'dock' || t === 'bld_door' || WARP[x + ',' + r] || /^stairs/.test(t)) { bad = true; break; }
        var canStair = walk(x, r - 1) && walk(x, r + 1) && !/^stairs|bridge|dock/.test(m.tiles[r - 1][x]) && !/^stairs|bridge|dock/.test(m.tiles[r + 1][x]);
        if (canStair) canS[x] = 1;
        var isRoad = ROADY[t] && ROADY[m.tiles[r - 1][x]] && ROADY[m.tiles[r + 1][x]];
        if (A[x + ',' + r]) { if (!canStair) { bad = true; break; } stairs.push(x); continue; }
        if (castle && x >= castle.doorAbs.x - 1 && x <= castle.doorAbs.x + 2 && castle.doorAbs.y < r && canStair) { stairs.push(x); continue; }
        if (isRoad && canStair) { roads++; stairs.push(x); continue; }
        ledges.push(x); }
      if (bad || !stairs.length) continue;
      // 階段は道の幅ごと（続いた列）。広すぎる道は 4 まで（残りは擁壁）
      var runs = []; stairs.sort(function (a, b) { return a - b; }).forEach(function (x) { var L = runs[runs.length - 1]; if (L && x === L[L.length - 1] + 1) L.push(x); else runs.push([x]); });
      var st2 = []; runs.forEach(function (R) { var keep = R.filter(function (x) { return A[x + ',' + r]; }); var mid = Math.floor(R.length / 2); var take = R.slice(Math.max(0, mid - 2), Math.max(0, mid - 2) + Math.min(4, R.length)); keep.forEach(function (x) { if (take.indexOf(x) < 0) take.push(x); }); R.forEach(function (x) { if (take.indexOf(x) >= 0) st2.push(x); else ledges.push(x); }); });
      // 長い擁壁には 6 マスごとに幅2の階段（大回りを減らす）
      ledges.sort(function (a, b) { return a - b; }); var lr = []; ledges.forEach(function (x) { var L = lr[lr.length - 1]; if (L && x === L[L.length - 1] + 1) L.push(x); else lr.push([x]); });
      lr.forEach(function (R) { for (var i = 3; i + 1 < R.length - 2; i += 7) { var x1 = R[i], x2 = R[i + 1]; if (canS[x1] && canS[x2] && !A[x1 + ',' + r] && !A[x2 + ',' + r]) { st2.push(x1, x2); ledges.splice(ledges.indexOf(x1), 1); ledges.splice(ledges.indexOf(x2), 1); } } });
      var score = Math.abs(r - H / 2) * 0.4 - roads * 0.5 + ledges.length * 0.02 + (castle && castle.doorAbs.y < r ? -3 : 0);
      cands76.push({ r: r, stairs: st2, ledges: ledges, score: score });
    }
    if (!cands76.length) { def._auto76lv = { none: true }; return; }
    cands76.sort(function (p, q) { return p.score - q.score; });
    var tilesSave = m.tiles.map(function (row) { return row.slice(); });
    // 道のり（出入口から守るマスまで）：元の道のり＋4歩＋1割より遠くしない（EnvLayout の決まりと同じ）
    var NPCO = {}; (m.npcs || []).forEach(function (n) { NPCO[(n.ox !== undefined ? n.ox : n.x) + ',' + (n.oy !== undefined ? n.oy : n.y)] = 1; });
    var NPCALL = {}; (m.npcs || []).forEach(function (n) { NPCALL[n.x + ',' + n.y] = 1; }); (root.SEARCH_POINTS || []).forEach(function (sp) { if (sp && sp.map === id) NPCALL[sp.x + ',' + sp.y] = 1; });
    var srcs = (m.warps || []).map(function (q) { return [q.x, q.y]; }); var tgts = Object.keys(A).map(function (k) { return k.split(',').map(Number); }); [root.SEARCH_POINTS, root.QUIZ_MONSTERS].forEach(function (L2) { (L2 || []).forEach(function (sp) { if (sp && sp.map === id && typeof sp.x === 'number') tgts.push([sp.x, sp.y]); }); });   // 調べる所・クイズの魔物も
    var dists = function (tiles, block) {
      var pass = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && (!TL.isSolid(tiles[y][x]) || tiles[y][x] === 'bld_door') && !BLK[x + ',' + y] && !NPCO[x + ',' + y] && !(block && block[x + ',' + y]); };   // 人の立ち位置も通れない（layout_check と同じ）
      return srcs.map(function (s0) { var Dd = new Int32Array(W * H).fill(-1); var q = []; [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { var a = s0[0] + o[0], b = s0[1] + o[1]; if (pass(a, b) && Dd[b * W + a] < 0) { Dd[b * W + a] = 0; q.push([a, b]); } }); for (var i = 0; i < q.length; i++) { var c = q[i]; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { var nx = c[0] + o[0], ny = c[1] + o[1]; if (!pass(nx, ny) || Dd[ny * W + nx] >= 0) return; Dd[ny * W + nx] = Dd[c[1] * W + c[0]] + 1; q.push([nx, ny]); }); } return Dd; });
    };
    var near = function (Dd, x, y) { var b2 = -1; [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { var nx = x + o[0], ny = y + o[1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) return; var v = Dd[ny * W + nx]; if (v >= 0 && (b2 < 0 || v < b2)) b2 = v; }); return b2; };
    var base0 = tilesSave; try { var ELr = root.EnvLayout; if (ELr) { var sv = ELr.enabled; ELr.enabled = false; base0 = new root.GameMap(def).tiles; ELr.enabled = sv; } } catch (e0) { if (root.EnvLayout) root.EnvLayout.enabled = true; }   // 道のりは街路の作り直しの前（元の町）と比べる（layout_check と同じ）
    var D0 = dists(base0, null);
    var countReach = function (tiles, block) { var Dd = dists(tiles, block); var set = {}; Dd.forEach(function (arr) { for (var i = 0; i < arr.length; i++) if (arr[i] >= 0) set[i] = 1; }); return set; };
    var P0 = {}; (function () { var a1 = countReach(tilesSave, null), a2 = countReach(tilesSave, NPCALL); Object.keys(a1).forEach(function (i) { if (!a2[i]) P0[i] = 1; }); })();
    var best = null, why = '候補なし', tries = 0;
    for (var ci = 0; ci < cands76.length && !best && tries < 8; ci++) {
      var cand = cands76[ci]; tries++; m.tiles = tilesSave.map(function (row) { return row.slice(); });
      var lv = []; for (var y = 0; y < H; y++) lv.push(new Array(W + 1).join(y < cand.r ? '1' : '0'));
      cand.stairs.forEach(function (x) { m.tiles[cand.r][x] = 'steps'; }); cand.ledges.forEach(function (x) { m.tiles[cand.r][x] = 'ledge'; });
      var fake = { w: W, h: H, tiles: m.tiles, def: { levels76: lv } };
      for (var it = 0; it < 10; it++) {
        var probs = T76.problems(fake); if (!probs.length) break; var ch = 0;
        var land = {}; for (var ly = 0; ly < H; ly++) for (var lx = 0; lx < W; lx++) { if (!T76.isStair(m.tiles[ly][lx])) continue; var dd = T76.stepDir(fake, lx, ly); if (dd) { land[(lx + dd[0]) + ',' + (ly + dd[1])] = 1; land[(lx - dd[0]) + ',' + (ly - dd[1])] = 1; } }
        probs.forEach(function (p) { if (!p.b) return; var a = p.a, b = p.b; var ta = m.tiles[a[1]][a[0]], tb = m.tiles[b[1]][b[0]]; var sa = T76.isStair(ta), sb = T76.isStair(tb); if (sa && sb) return; var la = +lv[a[1]][a[0]], lb = +lv[b[1]][b[0]];
          var pick = sa ? b : sb ? a : (la >= lb ? a : b); if (!sa && !sb && land[pick[0] + ',' + pick[1]]) { var oth = pick === a ? b : a; if (!land[oth[0] + ',' + oth[1]]) pick = oth; } var k = pick[0] + ',' + pick[1]; if (A[k]) return; if (m.tiles[pick[1]][pick[0]] !== 'ledge') { m.tiles[pick[1]][pick[0]] = 'ledge'; ch++; } });
        if (!ch) break;
      }
      if (T76.problems(fake).length) { why = '段の決まり'; continue; }
      // 行ける所と道のり：出入口から守るマスへ（元の道のり＋4歩＋1割まで）
      var D1 = dists(m.tiles, null); var bad = false;
      for (var si = 0; si < srcs.length && !bad; si++) for (var ti = 0; ti < tgts.length && !bad; ti++) { var t0 = tgts[ti]; var a0 = near(D0[si], t0[0], t0[1]), b0 = near(D1[si], t0[0], t0[1]); if (a0 < 0) continue; if (b0 < 0) { bad = true; why = '行ける所が変わる'; } else if (b0 > a0 + T.DETOUR.add + Math.floor(a0 * T.DETOUR.ratio)) { bad = true; why = '大回り'; } }
      if (bad) continue;
      // 人や調べる所が立っても、ほかのマスへは今までどおり行ける（人の立ち位置で行き止まりを作らない）
      var R1 = countReach(m.tiles, null), R2 = countReach(m.tiles, NPCALL); var pocket = Object.keys(R1).some(function (i) { var x = i % W, y2 = Math.floor(i / W); return !R2[i] && !NPCALL[x + ',' + y2] && !P0[i]; });   // もとからの行き止まり（P0）は数えない
      if (pocket) { why = '人の立ち位置で行き止まり'; continue; }
      best = cand; best.lv = lv;
    }
    if (!best) { m.tiles = tilesSave; def._auto76lv = { none: true, why: why }; return; }
    var lv = best.lv;
    // 決まった：変えたマスと段を覚える（次に作るときは同じに当てる）
    var changes = []; for (var y2 = 0; y2 < H; y2++) for (var x2 = 0; x2 < W; x2++) if (m.tiles[y2][x2] !== tilesSave[y2][x2]) changes.push([x2, y2, m.tiles[y2][x2]]);
    // 擁壁は上の段の高さ、階段は下の段
    var lv2 = lv.map(function (s2) { return s2.split(''); }); changes.forEach(function (c) { if (c[2] === 'steps') lv2[c[1]][c[0]] = '0'; else { var hi = 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { var nx = c[0] + o[0], ny = c[1] + o[1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) return; var tn = m.tiles[ny][nx]; if (TL.isSolid(tn)) return; hi = Math.max(hi, +lv[ny][nx] + (T76.isStair(tn) ? 1 : 0)); }); lv2[c[1]][c[0]] = String(hi); } });
    // 建物の足元＝入口の段
    (m.buildings || []).forEach(function (b) { if (!b.doorAbs) return; var L = lv2[b.doorAbs.y] ? lv2[b.doorAbs.y][b.doorAbs.x] : '0'; foot(b).forEach(function (p) { if (lv2[p[1]]) lv2[p[1]][p[0]] = L; }); });
    def._auto76lv = { r: best.r, tries: tries, changes: changes, levels: lv2.map(function (a3) { return a3.join(''); }) };
    def.levels76 = def._auto76lv.levels; def.terrace76Style = def.terrace76Style || { ledge: 'rail' };
  };
  var applyLv = function (m, L) { if (L.none) return; L.changes.forEach(function (c) { m.tiles[c[1]][c[0]] = c[2]; }); m.def.levels76 = L.levels; };
})(typeof window !== 'undefined' ? window : globalThis);
