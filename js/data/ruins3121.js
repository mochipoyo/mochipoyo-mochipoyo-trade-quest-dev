/* =========================================================
   Data / Ruins3121（v9.11）：旧時代（2052 年より前）の廃墟（3D 版の地球の世界だけ。見た目だけ）
   ・西暦 3121 年の地球に、千年前の建物・乗り物・記念碑の残骸を置く。場所は実際の地球の経度・緯度（js/data/earth78-layout.js の図法）
   ・SITES：名のある残骸（1 か所に 1 つ。例：自由の女神のあった湾に、砂と水に埋もれて傾いた像）
     [id, 種類, 経度, 緯度, 置き方, 向き（度・省略可）]　置き方 land＝陸／shore＝岸の浅瀬（なければ岸の陸）／sea＝海／any
   ・CITIES：大都市の跡（崩れた高層ビル・高架の道路・骨組みがまとまって立つ）[id, 経度, 緯度, 数]
   ・まばらな残骸（車・鉄塔・戦車・飛行機・座礁した船など）：世界の座標の乱数から決める（同じ場所にはいつも同じ物）
   ・置かない所：町・城・洞窟・塔（入口のまわり）、道・橋、宝箱・人・出来事・港・乗り物の母港のまわり、山・崖・溶岩
   ・当たり判定・出入り・イベント・セーブは変えない（タイルはそのまま。通り抜けられる。主人公の手前の残骸は網目状に抜ける）
   ・ゲームの中の文章は足していない（旧地球のどこが今のどこかを、人々は知らない＝docs/earth3121-lore.md）
   ・描き方：three-src/src/world/Ruins3121.js。確かめ：docs/tools/ruins/ruins_check.js（jsdom）
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Ruins3121 = { VERSION: 'r1' };
  R.SITES = [
    // ---- 北アメリカ
    ['liberty', 'liberty', -74.04, 40.69, 'shore', 200], ['golden_gate', 'suspension', -122.48, 37.82, 'shore', 90], ['capitol', 'dome', -77.01, 38.89, 'land'],
    ['gateway_arch', 'arch', -90.18, 38.62, 'land'], ['launch_pad', 'rocket', -80.6, 28.57, 'land'], ['chichen_itza', 'stepped', -88.57, 20.68, 'land'],
    ['arecibo', 'dish', -66.75, 18.35, 'land'], ['needle', 'needle', -122.35, 47.62, 'land'], ['cn_tower', 'needle', -79.39, 43.64, 'land'], ['mt_heads', 'heads', -103.46, 43.88, 'land'],
    ['gulf_rig', 'rig', -90.5, 27.6, 'sea'], ['vegas', 'sign', -115.17, 36.11, 'land'], ['teotihuacan', 'stepped', -98.84, 19.69, 'land'],
    // ---- 南アメリカ
    ['christ', 'christ', -43.21, -22.95, 'land'], ['machu', 'terraces', -72.55, -13.16, 'land'], ['moai', 'moai', -109.35, -27.11, 'land'], ['panama', 'locks', -79.6, 9.1, 'land'], ['brasilia', 'dome', -47.88, -15.79, 'land'],
    // ---- ヨーロッパ
    ['eiffel', 'lattice', 2.29, 48.86, 'land'], ['big_ben', 'clocktower', -0.12, 51.5, 'land'], ['london_eye', 'ferris', 0.3, 51.35, 'land'], ['stonehenge', 'henge', -1.83, 51.18, 'land'],
    ['colosseum', 'colosseum', 12.49, 41.89, 'land'], ['pisa', 'leaning', 10.4, 43.72, 'land'], ['parthenon', 'parthenon', 23.73, 37.97, 'land'], ['sagrada', 'spires', 2.17, 41.4, 'land'],
    ['brandenburg', 'gate', 13.38, 52.52, 'land'], ['windmills', 'windmill', 4.64, 52.3, 'land'], ['kremlin', 'onion', 37.62, 55.75, 'land'], ['north_sea_rig', 'rig', 2.5, 57.2, 'sea'],
    ['chernobyl', 'cooling', 30.1, 51.39, 'land'], ['hagia', 'mosque', 28.98, 41.01, 'land'], ['arc', 'gate', 3.4, 47.6, 'land'], ['atomium', 'atomium', 4.34, 50.9, 'land'], ['neuschwanstein', 'onion', 10.75, 47.56, 'land'],
    // ---- アフリカ・中東
    ['giza', 'pyramids', 31.13, 29.98, 'land'], ['abu_simbel', 'colossi', 31.63, 22.34, 'land'], ['burj', 'spire', 55.27, 25.2, 'land'], ['petra', 'colossi', 35.44, 30.33, 'land'],
    ['suez_ship', 'tanker', 32.55, 30.4, 'shore'], ['kilwa', 'dish', 28.0, -26.2, 'land'], ['lagos_rig', 'rig', 4.2, 4.4, 'sea'], ['table_mt', 'cooling', 18.6, -33.7, 'land'],
    // ---- アジア
    ['taj', 'taj', 78.04, 27.17, 'land'], ['great_wall_a', 'wall', 116.57, 40.43, 'land', 70], ['great_wall_b', 'wall', 111.0, 39.3, 'land', 100], ['great_wall_c', 'wall', 104.0, 38.3, 'land', 80],
    ['tokyo_tower', 'lattice_red', 139.75, 35.66, 'land'], ['skytree', 'needle', 140.4, 36.4, 'land'], ['daibutsu', 'buddha', 139.0, 35.2, 'land'], ['torii', 'torii', 132.32, 34.3, 'shore'], ['osaka_castle', 'pagoda', 135.53, 34.69, 'land'],
    ['pearl', 'pearl', 121.5, 31.24, 'land'], ['petronas', 'twin', 101.71, 3.16, 'land'], ['angkor', 'angkor', 103.87, 13.41, 'land'], ['marina', 'boat_roof', 103.86, 1.5, 'land'],
    ['seoul_tower', 'needle', 126.99, 37.55, 'land'], ['hk_carrier', 'carrier', 114.3, 22.1, 'shore'], ['baikonur', 'rocket', 63.3, 45.96, 'land'], ['potala', 'terraces', 91.12, 29.66, 'land'], ['borobudur', 'stepped', 110.2, -7.6, 'land'],
    ['taipei', 'pagoda', 121.56, 25.03, 'land'], ['gateway_india', 'gate', 72.83, 18.92, 'land'], ['kaaba_towers', 'clocktower', 39.83, 21.42, 'land'],
    // ---- オセアニア・南極
    ['opera', 'opera', 151.21, -33.86, 'shore', 20], ['harbour_bridge', 'archbridge', 151.0, -33.4, 'shore', 0], ['uluru_dish', 'dish', 133.0, -25.3, 'land'], ['nz_tanker', 'tanker', 174.8, -41.3, 'shore'], ['mcmurdo', 'station', 166.7, -77.8, 'land'], ['antarctic_plane', 'plane', 0.0, -72.0, 'land']
  ];
  R.CITIES = [
    ['new_york', -73.9, 40.9, 16], ['los_angeles', -118.3, 34.1, 12], ['chicago', -87.7, 41.9, 10], ['houston', -95.4, 29.8, 8], ['mexico_city', -99.3, 19.3, 10], ['toronto', -79.6, 43.9, 7], ['vancouver', -123.0, 49.3, 6], ['miami', -80.3, 25.9, 7],
    ['sao_paulo', -46.6, -23.5, 12], ['buenos_aires', -58.4, -34.6, 9], ['lima', -77.0, -12.0, 7], ['bogota', -74.1, 4.7, 7], ['santiago', -70.7, -33.5, 6],
    ['london', -0.5, 51.7, 10], ['paris', 2.7, 48.6, 9], ['berlin', 13.7, 52.4, 8], ['madrid', -3.7, 40.4, 8], ['rome', 12.8, 42.1, 6], ['moscow', 37.2, 55.5, 10], ['istanbul', 29.3, 41.2, 8], ['kyiv', 30.5, 50.4, 6], ['stockholm', 18.0, 59.3, 5],
    ['cairo', 31.4, 30.2, 9], ['lagos', 3.4, 6.6, 9], ['johannesburg', 28.3, -26.0, 8], ['nairobi', 36.8, -1.3, 7], ['kinshasa', 15.3, -4.3, 6], ['casablanca', -7.6, 33.6, 5],
    ['dubai', 55.0, 25.0, 9], ['tehran', 51.4, 35.7, 7], ['riyadh', 46.7, 24.7, 6], ['mumbai', 73.0, 19.2, 11], ['delhi', 77.2, 28.6, 10], ['dhaka', 90.4, 23.8, 7], ['karachi', 67.0, 24.9, 7],
    ['bangkok', 100.5, 13.8, 8], ['singapore', 103.8, 1.9, 8], ['jakarta', 106.8, -6.3, 9], ['manila', 121.0, 14.6, 7], ['hong_kong', 114.0, 22.6, 10], ['shanghai', 121.2, 31.0, 12], ['beijing', 116.3, 39.8, 10],
    ['chongqing', 106.5, 29.6, 7], ['seoul', 127.2, 37.3, 9], ['tokyo', 139.5, 35.9, 14], ['osaka', 135.7, 34.9, 9], ['nagoya', 137.0, 35.3, 5], ['sapporo', 141.4, 43.1, 4],
    ['sydney', 150.8, -33.7, 9], ['melbourne', 145.0, -37.8, 7], ['perth', 115.9, -31.9, 5], ['auckland', 174.8, -36.9, 4], ['novosibirsk', 82.9, 55.0, 5], ['anchorage', -149.9, 61.2, 3]
  ];
  // まばらな残骸：1 マスあたりの確率（陸）。地面の種類ごとの重み
  R.SCATTER = { land: 1 / 260, shallow: 1 / 420, weights: { grass: 1, grass2: 1, sand: 0.8, snow: 0.6, ash: 1.1, darkland: 0.7, hill: 0.5 } };
  R.SCATTER_KINDS = [['car', 22], ['bus', 6], ['pylon', 12], ['lamp', 8], ['billboard', 6], ['container', 6], ['tank', 4], ['overpass', 6], ['house', 9], ['turbine', 5], ['plane', 2], ['antenna', 5], ['pipe', 4], ['truck', 5]];
  R.SEA_KINDS = [['wreck', 10], ['buoy', 3], ['wreck_small', 6]];
  R.CITY_KINDS = [['tower', 30], ['tower_glass', 16], ['tower_lean', 12], ['block', 18], ['overpass', 8], ['frame', 10], ['billboard', 3], ['bus', 3]];
  // 足もとの広さ（マスの半径。木・山・ほかの残骸を重ねない範囲）
  R.RADIUS = { liberty: 2.2, pyramids: 4.2, lattice: 2.2, lattice_red: 2.0, suspension: 4.5, archbridge: 4.5, colosseum: 3.0, opera: 2.6, wall: 5.0, spires: 2.4, taj: 3.0, carrier: 4.0, tanker: 3.5, cooling: 3.0, angkor: 3.0,
    tower: 1.3, tower_glass: 1.3, tower_lean: 1.5, block: 1.3, frame: 1.2, overpass: 1.8, rig: 2.4, plane: 1.6, wreck: 1.6, _site: 2.2, _small: 0.7 };

  function mod(a, n) { return ((a % n) + n) % n; }
  function hash(x, y, s) { var h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2246822519)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h = h ^ (h >>> 16); return ((h >>> 0) % 1000003) / 1000003; }
  R.hash = hash;
  function pick(list, r) { var t = 0, i; for (i = 0; i < list.length; i++) t += list[i][1]; r *= t; for (i = 0; i < list.length; i++) { r -= list[i][1]; if (r < 0) return list[i][0]; } return list[list.length - 1][0]; }
  R.active = function () { var W = root.World76, E = root.Earth78; return !!(W && W.earth && W.ready && E && E.ready && root.EARTH78_LAYOUT); };

  var G = null;   // 世界の一覧（1 回だけ作る）
  function build() {
    var W = root.World76, L = root.EARTH78_LAYOUT, T = root.Tiles, S = W.size(), WW = S.w, WH = S.h;
    var CH = new Uint16Array(WW * WH), busy = new Uint8Array(WW * WH), taken = [];
    var mark = function (gx, gy, r) { for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) { var y = gy + dy; if (y < 0 || y >= WH || dx * dx + dy * dy > r * r + 1) continue; busy[y * WW + mod(gx + dx, WW)] = 1; } };
    W.MAPS.forEach(function (id) {
      var r = W.rect(id), d = root.MAP_DEFS[id]; if (!r || !d) return; var rows = d.rows();
      for (var y = 0; y < r.h; y++) { var row = rows[y] || ''; for (var x = 0; x < r.w; x++) { var c = row.charCodeAt(x) || 48; CH[(r.y + y) * WW + mod(r.x + x, WW)] = c; } }
      (d.locations || []).forEach(function (o) { mark(r.x + o.x, r.y + o.y, 6); });
      ['warps', 'chests', 'npcs', 'events'].forEach(function (k) { (d[k] || []).forEach(function (o) { if (typeof o.x === 'number') mark(r.x + o.x, r.y + o.y, 2); }); });
      ((d.encounters && d.encounters.symbols) || []).forEach(function (o) { if (typeof o.x === 'number') mark(r.x + o.x, r.y + o.y, 2); });
    });
    var H = root.Harbors && root.Harbors.HARBORS; if (H) Object.keys(H).forEach(function (k) { var h = H[k], r = W.rect(h.map); if (!r) return; mark(r.x + h.moor.x, r.y + h.moor.y, 4); if (h.land) mark(r.x + h.land.x, r.y + h.land.y, 3); });
    var V = root.VEHICLES; if (V) Object.keys(V).forEach(function (k) { var h = V[k].home, r = h && W.rect(h.map); if (r) mark(r.x + h.x, r.y + h.y, 4); });
    var name = function (gx, gy) { if (gy < 0 || gy >= WH) return 'deep'; return T.byChar[String.fromCharCode(CH[gy * WW + mod(gx, WW)])] || 'deep'; };
    var isBusy = function (gx, gy) { return gy < 0 || gy >= WH || !!busy[gy * WW + mod(gx, WW)]; };
    var LANDOK = { grass: 1, grass2: 1, sand: 1, snow: 1, ash: 1, darkland: 1, hill: 1, tree: 1, forest: 1 };
    var okLand = function (gx, gy) { return !!LANDOK[name(gx, gy)] && !isBusy(gx, gy); };
    var okShore = function (gx, gy) { if (name(gx, gy) !== 'shallow' || isBusy(gx, gy)) return false; for (var k = 0; k < 4; k++) { var n = name(gx + [1, -1, 0, 0][k], gy + [0, 0, 1, -1][k]); if (n !== 'shallow' && n !== 'water' && n !== 'deep') return true; } return false; };
    var okSea = function (gx, gy) { var n = name(gx, gy); return (n === 'water' || n === 'deep' || n === 'shallow') && !isBusy(gx, gy); };
    var free = function (gx, gy, rad) { for (var i = 0; i < taken.length; i++) { var t = taken[i], dx = W.dxWrap ? W.dxWrap(gx - t.gx) : gx - t.gx, dy = gy - t.gy, rr = rad + t.r; if (dx * dx + dy * dy < rr * rr) return false; } return true; };
    // 足もと（半径 rad）が全部使えるマスか（道・橋・忙しいマス・山が入らない）
    var foot = function (gx, gy, rad, ok) { var q = Math.max(0, Math.round(rad - 0.6)); for (var dy = -q; dy <= q; dy++) for (var dx = -q; dx <= q; dx++) { if (dx * dx + dy * dy > q * q + 1) continue; var n = name(gx + dx, gy + dy); if (isBusy(gx + dx, gy + dy) || n === 'road' || n === 'bridge' || n === 'mountain' || n === 'cliff' || n === 'lava' || n === 'slag') return false; } return ok(gx, gy); };
    var out = [], miss = [];
    var place = function (id, kind, gx, gy, o) {
      var loc = W.toLocal(gx, gy); if (!loc) return false; var rad = R.RADIUS[kind] || (o.site ? R.RADIUS._site : R.RADIUS._small);
      var e = { id: id, kind: kind, map: loc.map, x: loc.x + 0.5, y: loc.y + 0.5, gx: mod(gx, WW), gy: gy, r: rad, rot: o.rot, seed: Math.floor(hash(gx, gy, 7) * 1e6), ground: name(gx, gy), site: !!o.site, city: o.city || null };
      out.push(e); taken.push(e); return true;
    };
    // 近くの置ける場所（らせん状に探す。目当ての場所にいちばん近いマス）
    var seek = function (gx, gy, rad, ok, R0) { for (var r = 0; r <= R0; r++) { var best = null, bd = 1e9; for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; var x = gx + dx, y = gy + dy; if (y < 2 || y >= WH - 2) continue; if (foot(x, y, rad, ok) && free(x, y, rad)) { var d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [x, y]; } } } if (best) return best; } return null; };
    R.SITES.forEach(function (s) {
      var t = L.tile(s[2], s[3]), rad = R.RADIUS[s[1]] || R.RADIUS._site, at = s[4] || 'land', p = null;
      if (at === 'shore') p = seek(t.x, t.y, 1, okShore, 9) || seek(t.x, t.y, rad, okLand, 9);
      else if (at === 'sea') p = seek(t.x, t.y, 1, okSea, 9);
      else p = seek(t.x, t.y, rad, okLand, at === 'any' ? 14 : 10);
      if (p) place(s[0], s[1], p[0], p[1], { site: true, rot: s[5] === undefined ? Math.floor(hash(t.x, t.y, 3) * 360) : s[5] }); else miss.push(s[0]);
    });
    R.CITIES.forEach(function (c) {
      var t = L.tile(c[1], c[2]), n = c[3], got = 0;
      for (var i = 0; i < n * 5 && got < n; i++) {
        var a = hash(t.x + i, t.y, 11) * 6.2832, d = (2 + Math.sqrt(hash(t.x, t.y + i, 12)) * (4 + n * 0.55)) * (1 + i / (n * 2.5)) /* 置けないときは少しずつ外へ広げる */, x = Math.round(t.x + Math.cos(a) * d), y = Math.round(t.y + Math.sin(a) * d * 0.8);
        var kind = pick(R.CITY_KINDS, hash(x, y, 13)), rad = R.RADIUS[kind] || R.RADIUS._small;
        if (y < 2 || y >= WH - 2 || !foot(x, y, rad, okLand) || !free(x, y, rad * 0.9)) continue;
        if (place(c[0] + '_' + got, kind, x, y, { city: c[0], rot: Math.floor(hash(x, y, 14) * 360) })) got++;
      }
      if (!got) miss.push('city:' + c[0]);
    });
    var sc = R.SCATTER;
    for (var gy = 3; gy < WH - 3; gy++) for (var gx = 0; gx < WW; gx++) {
      var n = name(gx, gy), h = hash(gx, gy, 21);
      if (sc.weights[n]) { if (h >= sc.land * sc.weights[n] || isBusy(gx, gy)) continue; var k = pick(R.SCATTER_KINDS, hash(gx, gy, 22)), rad = R.RADIUS[k] || R.RADIUS._small; if (!foot(gx, gy, rad, okLand) || !free(gx, gy, rad)) continue; place('s' + gx + '_' + gy, k, gx, gy, { rot: Math.floor(hash(gx, gy, 23) * 360) }); }
      else if (n === 'shallow') { if (h >= sc.shallow || !okShore(gx, gy)) continue; var k2 = pick(R.SEA_KINDS, hash(gx, gy, 22)), rad2 = R.RADIUS[k2] || R.RADIUS._small; if (!free(gx, gy, rad2)) continue; place('s' + gx + '_' + gy, k2, gx, gy, { rot: Math.floor(hash(gx, gy, 23) * 360) }); }
    }
    var by = {}; out.forEach(function (e) { (by[e.map] || (by[e.map] = [])).push(e); });
    return { all: out, by: by, miss: miss };
  }
  function world() { if (!G) { if (!R.active()) return null; try { G = build(); } catch (e) { R.error = String(e && e.message); G = { all: [], by: {}, miss: ['error'] }; } } return G; }
  R.reset = function () { G = null; };
  R.all = function () { var g = world(); return g ? g.all : []; };
  R.missed = function () { var g = world(); return g ? g.miss : []; };
  R.forMap = function (id) { var g = world(); return (g && g.by[id]) || []; };
  R.find = function (id) { return R.all().filter(function (e) { return e.id === id; })[0] || null; };
})(typeof window !== 'undefined' ? window : globalThis);
