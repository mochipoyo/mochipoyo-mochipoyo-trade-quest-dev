/* =========================================================
   RPG / World76（v7.6）：地上のフィールド（10 地域）と共通の海を、1 枚の世界としてつなぐ（3D 版だけ）
   ・3D 版のページ（3d/index.html）が window.MTQ_JOIN76 = true にしたときだけ動く。2D 版はいままでの地域ごとのマップのまま
     3D設定「世界のつながり」を「地域ごと」にすると止まる（localStorage 'mtq3d-join' = 'off'。ページを読み直す）
   ・世界の座標（グローバル）：1 マス＝地域の地図の 1 マス。gx = 地域の左上の gx ＋ ローカル x、gy = 地域の左上の gy ＋ ローカル y
     （回転・伸縮なし。タイルの中心は +0.5。地域の右端・下端はその地域に含まれない＝となりの地図の 0 列目）
   ・世界は 40×30 マスの「ブロック」に区切る。地域（160×120＝4×4 ブロック）は PLACE のブロックの位置に置く（格子に並べず、ずらして配置）
     地域のないブロックは「共通の海」（sea76_<bx>_<by>。最大 4×4 ブロックの長方形にまとめた海の地図）。地形は世界の座標から決まる（境目で切れない）
   ・ゲームの状態（セーブ・宝箱・出来事・出現表）は今までどおり「地図の ID＋ローカル座標」が正。世界の座標は、地図・3D の並べ方・境目の移動に使うだけ
     （二つを別々に持たない：世界の座標はいつも W76.toGlobal(地図, x, y) で求める）
   ・地図の端の外へ進むと、そこを持つ地図へ「画面を切り替えずに」移る（徒歩・船・飛空艇。乗っている乗り物ごと）。暗転・ワープ・確認なし
   ・進入の条件（GATE）：まだ行けない地域には、どの手段でも入れない（境目で止めて理由を出す）。乗り物の決まり：小型帆船はアルカディア・グラニアの海だけ、
     暗黒大陸は飛空艇だけ（もとの「闇の空路」）。条件はもとの航路・関所・乗り物のフラグ（新しいフラグは作らない）
   ・地形の手直し（つないだときだけ・2D 版は変えない）：
     - 海岸の形：リシア砂漠・忘却の雪原の四角い崖・山の外周、竜炎火山群島の四角い島を、ゆらぎのある海岸に（町・入口・道・宝箱などのまわりは触らない。
       崖・山の壁は 2 マス以上残す＝新しい上陸地点・抜け道を作らない。竜炎火山群島は、削っても行ける場所が変わらないことを確かめてから使う）
     - 灰の峠の山並み：グラニアの峠の南口とカリオンの北口の間の海に山脈（通れない）。峠はダンジョンのまま
     - 陸の橋：時の神殿領 ⇔ マクディア魔導王国（海の上の石の橋。歩いて渡れる。船は橋の下をくぐれる）
   ・天空群島・ゼロメアは別の空間のまま（飛空艇で世界の北の果てから上がる・時の神殿領の転移門）
   ・海路（SEA_ROUTES）：つないだときは「となりどうしの地図」の道に作り直す（次の目的地の案内に使う。端に立っただけでは移らない）
   ・確認：docs/tools/v76/world76_check.js（jsdom）・docs/tools/v76/join76_*.js（3D）。配置と対応表：docs/environment/WORLD76.md
   ========================================================= */
(function (root) {
  'use strict';
  var BW = 40, BH = 30;            // ブロック（共通の海の区切り）
  var WB = 21, HB = 17;            // 世界の大きさ（ブロック）＝ 840×510 マス
  var W76 = { CW: 160, CH: 120, BW: BW, BH: BH, listeners: [] };
  // 地域の置き場所（左上のブロック）。もとの航路の向き（東の航路＝東どなり など）と、灰の峠の南口・北口（x=60）がそろうように決めた
  var PLACE = {
    world_kalion: [4, 0], world: [0, 4], world_grania: [4, 4], world_snow: [9, 2], world_dark: [17, 3],
    world_islands: [2, 8], world_tempus: [8, 9], world_magicka: [12, 9], world_desert: [0, 12], world_dragon: [13, 13]
  };
  var REGIONS = Object.keys(PLACE);
  // まだ行けない地域：そのフラグが立つまでは、徒歩・船・飛空艇のどれでも入れない（text：境目で出す理由）
  var GATE = {
    world_kalion: { flag: 'kalion_open', text: 'カリオン徴収連邦の海域。灰の峠の関所を通るまでは、連邦の巡視船に追い返される。' },
    world_islands: { flag: 'galleon_ready', text: '断裂群島のまわりは波が高い。遠洋航海船を手に入れるまでは渡れない。' },
    world_tempus: { flag: 'yorn_letter_done', text: '時の神殿領の海は深い霧に閉ざされている。（断裂群島での用事を済ませると霧が晴れる）' },
    world_desert: { flag: 'yorn_letter_done', text: 'リシア砂漠の沖は砂嵐で何も見えない。（断裂群島での用事を済ませると通れる）' },
    world_snow: { flag: 'yorn_letter_done', text: '忘却の雪原の海は流氷に閉ざされている。（断裂群島での用事を済ませると通れる）' },
    world_magicka: { flag: 'zeromea_choice_done', text: 'マクディア魔導王国の結界が、海も陸も閉ざしている。（ゼロメアでの出来事のあとで開く）' },
    world_dragon: { flag: 'magicka_arrived', text: '竜炎火山群島の噴煙で先が見えない。（マクディア魔導王国に着いてから）' },
    world_dark: { flag: 'dark_route_open', text: '暗黒大陸は黒い嵐に包まれていて近づけない。（闇の空路が開いてから）', vehicles: ['airship'], vtext: '黒い嵐が海を荒らしていて、船では近づけない。（飛空艇で空から）' }
  };
  var SAIL_MAPS = { world: true, world_grania: true };   // 小型帆船の海（もとの「アルカディア⇔グラニア」の航路だけ）
  var BRIDGES = [{ a: 'world_tempus', b: 'world_magicka', y: 60 }];   // 陸の橋（a の東の端 ⇔ b の西の端。y は目安）
  // 前の版（4×3 の並び）の外海：セーブの救済用（その版の世界の座標と、となりの地域）
  var LEGACY = { sea76_south: { o: [160, 240], nb: { world_tempus: [160, 120], world_desert: [0, 240], world_dragon: [320, 240] } },
    sea76_east: { o: [480, 240], nb: { world_dark: [480, 120], world_dragon: [320, 240] } } };
  W76.PLACE = PLACE; W76.REGIONS = REGIONS; W76.GATE = GATE; W76.BRIDGES = BRIDGES; W76.SAIL_MAPS = SAIL_MAPS; W76.LEGACY = LEGACY;

  /* ---------- 配置（ブロック → 地図） ---------- */
  var RECT = {}, OWN = new Array(WB * HB), SEAS = [];
  REGIONS.forEach(function (id) { var p = PLACE[id]; RECT[id] = { x: p[0] * BW, y: p[1] * BH, w: W76.CW, h: W76.CH, region: true };
    for (var by = p[1]; by < p[1] + 4; by++) for (var bx = p[0]; bx < p[0] + 4; bx++) { if (OWN[by * WB + bx]) throw new Error('World76: 地域が重なっている ' + id); OWN[by * WB + bx] = id; } });
  (function makeSeas() {   // 地域のないブロックを、長方形（最大 4×4）にまとめる
    for (var by = 0; by < HB; by++) for (var bx = 0; bx < WB; bx++) {
      if (OWN[by * WB + bx]) continue;
      var w = 1; while (w < 4 && bx + w < WB && !OWN[by * WB + bx + w]) w++;
      var h = 1; while (h < 4 && by + h < HB) { var ok = true; for (var k = 0; k < w; k++) if (OWN[(by + h) * WB + bx + k]) ok = false; if (!ok) break; h++; }
      var id = 'sea76_' + bx + '_' + by; RECT[id] = { x: bx * BW, y: by * BH, w: w * BW, h: h * BH, sea: true }; SEAS.push(id);
      for (var yy = by; yy < by + h; yy++) for (var xx = bx; xx < bx + w; xx++) OWN[yy * WB + xx] = id;
    }
  })();
  W76.SEAS = SEAS; W76.RECT = RECT;
  W76.MAPS = REGIONS.concat(SEAS);
  W76.isFiller = function (id) { return !!(RECT[id] && RECT[id].sea) || !!LEGACY[id]; };
  W76.isSea = function (id) { return !!(RECT[id] && RECT[id].sea); };
  W76.isRegion = function (id) { return !!(RECT[id] && RECT[id].region); };
  W76.inGrid = function (id) { return !!RECT[id]; };   // つないだ世界の地図か（地域・共通の海）
  W76.setting = function () { try { return root.localStorage && root.localStorage.getItem('mtq3d-join') === 'off' ? 'off' : 'on'; } catch (e) { return 'on'; } };
  var ON = !!root.MTQ_JOIN76 && W76.setting() !== 'off';
  W76.on = function () { return ON && W76.ready; };
  W76.ready = false;
  W76.rect = function (id) { return RECT[id] || null; };
  W76.origin = function (id) { var r = RECT[id]; return r ? { x: r.x, y: r.y } : null; };
  W76.size = function () { return { w: WB * BW, h: HB * BH, bw: WB, bh: HB }; };
  W76.mapAt = function (gx, gy) { if (gx < 0 || gy < 0 || gx >= WB * BW || gy >= HB * BH) return null; return OWN[Math.floor(gy / BH) * WB + Math.floor(gx / BW)] || null; };
  W76.regionAt = W76.mapAt;
  W76.toGlobal = function (id, x, y) { var r = RECT[id]; return r ? { x: r.x + x, y: r.y + y } : null; };
  W76.toLocal = function (gx, gy) { var id = W76.mapAt(gx, gy); if (!id) return null; var r = RECT[id]; return { map: id, x: gx - r.x, y: gy - r.y }; };
  // 地図 id の (nx, ny)（端の外）が、どの地図のどこか
  W76.neighbor = function (id, nx, ny) { var g = W76.toGlobal(id, nx, ny); if (!g) return null; var L = W76.toLocal(g.x, g.y); return L && L.map !== id ? L : null; };
  // 端の外に何かあるか（世界の果てでないか）：3D の地図の外の海・木・山を作るかどうか
  W76.sides = function (id) { var r = RECT[id]; if (!r) return null; return { n: r.y > 0, s: r.y + r.h < HB * BH, w: r.x > 0, e: r.x + r.w < WB * BW }; };
  // となりの地図（境目を接するもの）：[{ id, side, dx, dy, a, b }]（a〜b：その辺のローカルの範囲）
  W76.neighbors = function (id) {
    var r = RECT[id]; if (!r) return []; var out = {}; var push = function (nid, side, a) { if (!nid || nid === id) return; var k = nid + side; var o = RECT[nid]; if (!out[k]) out[k] = { id: nid, side: side, dx: o.x - r.x, dy: o.y - r.y, a: a, b: a }; else { out[k].a = Math.min(out[k].a, a); out[k].b = Math.max(out[k].b, a); } };
    for (var x = 0; x < r.w; x += 1) { push(W76.mapAt(r.x + x, r.y - 1), 'n', x); push(W76.mapAt(r.x + x, r.y + r.h), 's', x); }
    for (var y = 0; y < r.h; y += 1) { push(W76.mapAt(r.x - 1, r.y + y), 'w', y); push(W76.mapAt(r.x + r.w, r.y + y), 'e', y); }
    return Object.keys(out).map(function (k) { return out[k]; });
  };
  // 世界の座標の窓（x0..x1, y0..y1）に重なる地図
  W76.mapsIn = function (x0, y0, x1, y1) { return W76.MAPS.filter(function (id) { var r = RECT[id]; return r.x < x1 && r.x + r.w > x0 && r.y < y1 && r.y + r.h > y0; }); };
  // 点と地図の長方形の距離（中なら 0）
  W76.distTo = function (id, gx, gy) { var r = RECT[id]; if (!r) return Infinity; var dx = Math.max(r.x - gx, 0, gx - (r.x + r.w)), dy = Math.max(r.y - gy, 0, gy - (r.y + r.h)); return Math.sqrt(dx * dx + dy * dy); };
  function D() { return root.State && root.State.data; }
  W76.unlocked = function (id) { var g = GATE[id]; var d = D(); return !g || !!(d && d.flags && d.flags[g.flag]); };
  W76.gateText = function (id) { var g = GATE[id]; return g ? g.text : ''; };
  W76.onSwitch = function (fn) { W76.listeners.push(fn); };
  // 進入の判定（境目の移動・到着先の確かめ・地図の案内が同じ決まりを使う）。戻り値：null＝入れる／{ text }＝入れない理由
  W76.entryBlock = function (toId, aboard, fromId) {
    if (!RECT[toId]) return null; var g = GATE[toId];
    if (g && !W76.unlocked(toId)) return { text: g.text, kind: 'flag' };
    if (g && g.vehicles && fromId !== toId && g.vehicles.indexOf(aboard || 'walk') < 0) return { text: g.vtext || g.text, kind: 'vehicle' };
    if (aboard === 'sailboat' && !SAIL_MAPS[toId]) return { text: '小型帆船では外海へ出られない。（遠洋航海船が必要）', kind: 'vehicle' };
    return null;
  };
  W76.regionName = function (id) { var d = D(); var def = root.MAP_DEFS && root.MAP_DEFS[id]; if (!def) return id; if (RECT[id] && RECT[id].sea) return def.name; return d && d.visited && d.visited[id] ? def.name : '？？？'; };

  /* ---------- 地形（つないだときだけ） ---------- */
  function rowsOf(id) { var def = root.MAP_DEFS && root.MAP_DEFS[id]; if (!def || typeof def.rows !== 'function') return null; return def.rows(); }
  var WATERC = { '~': 1, 'w': 1, '0': 1 };
  var NATURAL = { '.': 1, ',': 1, 'f': 1, 'F': 1, 'm': 1, 'h': 1, 's': 1, 'c': 1, 'n': 1, 'a': 1, '8': 1, '9': 1, '+': 1, 'l': 1, '~': 1, 'w': 1, '0': 1 };
  function passableChar(ch) { var T = root.Tiles; var name = T && T.byChar[ch]; return !!name && !T.isSolid(name) && !T.isWater(name); }
  function hash2(x, y, s) { var h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0; h = (h ^ (h >> 13)) * 1274126177; h = h ^ (h >> 16); return ((h >>> 0) % 100000) / 100000; }
  function vnoise(x, y, sc, s) {   // なめらかな値のノイズ（0〜1）。世界の座標から決まる
    var fx = x / sc, fy = y / sc, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy; var u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
    var a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  W76.noise = vnoise;
  // 守る場所（町・入口・宝箱・人・出来事・道・橋・桟橋など）のまわり r マス
  function protectedMask(id, rows, r) {
    var def = root.MAP_DEFS[id]; var H = rows.length, W = rows[0].length; var P = new Uint8Array(W * H);
    var mark = function (x0, y0, rr) { for (var y = Math.max(0, y0 - rr); y <= Math.min(H - 1, y0 + rr); y++) for (var x = Math.max(0, x0 - rr); x <= Math.min(W - 1, x0 + rr); x++) P[y * W + x] = 1; };
    (def.locations || []).concat(def.warps || [], def.chests || [], def.npcs || [], def.events || []).forEach(function (o) { if (o && typeof o.x === 'number') mark(o.x, o.y, r); });
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (!NATURAL[rows[y][x]]) mark(x, y, Math.min(r, 3));
    return P;
  }
  function anchorsOf(id) { var def = root.MAP_DEFS[id]; return (def.locations || []).concat(def.chests || [], def.npcs || [], def.events || []).filter(function (o) { return o && typeof o.x === 'number'; }).map(function (o) { return [o.x, o.y]; }); }
  // 歩けるマスのつながり（4 方向）。ラベルの配列
  function components(rows) {
    var H = rows.length, W = rows[0].length; var lab = new Int32Array(W * H).fill(-1); var n = 0; var q = new Int32Array(W * H);
    for (var s = 0; s < W * H; s++) { if (lab[s] >= 0 || !passableChar(rows[(s / W) | 0][s % W])) continue; var h = 0, t = 0; q[t++] = s; lab[s] = n;
      while (h < t) { var c = q[h++]; var cx = c % W, cy = (c / W) | 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) { var x = cx + v[0], y = cy + v[1]; if (x < 0 || y < 0 || x >= W || y >= H) return; var k = y * W + x; if (lab[k] >= 0 || !passableChar(rows[y][x])) return; lab[k] = n; q[t++] = k; }); }
      n++; }
    return lab;
  }
  // 入口・宝箱などの場所どうしのつながりが変わっていないか（前にいっしょだったものは、後もいっしょ）
  function sameReach(before, after, rows0, rows1, anchors) {
    var W = rows0[0].length; var near = function (lab, rows, x, y) { for (var r = 0; r <= 1; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) { var xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || yy >= rows.length || xx >= W) continue; var l = lab[yy * W + xx]; if (l >= 0) return l; } return -1; };
    var A = anchors.map(function (a) { return near(before, rows0, a[0], a[1]); }), B = anchors.map(function (a) { return near(after, rows1, a[0], a[1]); });
    for (var i = 0; i < anchors.length; i++) { if ((A[i] >= 0) !== (B[i] >= 0)) return false; for (var j = i + 1; j < anchors.length; j++) if (A[i] >= 0 && A[j] >= 0 && (A[i] === A[j]) !== (B[i] === B[j])) return false; }
    return true;
  }
  function relaxShallow(rows) {   // 陸のとなりの深い海・海を浅瀬に、陸から離れた浅瀬を海に
    var H = rows.length, W = rows[0].length; var g = rows.map(function (r) { return r.split(''); });
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var c = g[y][x]; if (!WATERC[c]) continue; var land = false;
      for (var dy = -1; dy <= 1 && !land; dy++) for (var dx = -1; dx <= 1; dx++) { var yy = y + dy, xx = x + dx; if (yy < 0 || xx < 0 || yy >= H || xx >= W) continue; if (!WATERC[rows[yy][xx]]) { land = true; break; } }
      if (land && c !== 'w') g[y][x] = 'w'; }
    return g.map(function (r) { return r.join(''); });
  }
  // 海岸の形：岸から depth(gx,gy) マス以内の陸を海にする（ゆらぎのある海岸線。depth は世界の座標のノイズ）
  //   mode 'wall'：新しい岸から 2 マスの歩けるマスは崖・山（wall）にする＝新しい上陸地点・抜け道を作らない。もとの砂浜（上陸できた岸）は削らない
  //   mode 'walk'：歩ける陸も削る（竜炎火山群島の四角い島）
  //   どちらも、入口・宝箱・人などのつながりが変わらないことを確かめる（変わるなら削る深さを浅くしてやり直し、だめなら何もしない）
  var SHAPE = { world_desert: { max: 14, mode: 'wall', wall: 'c', sc: 13, round: 30 }, world_snow: { max: 18, mode: 'wall', wall: 'm', sc: 12, round: 40 }, world_dragon: { max: 10, mode: 'walk', sc: 8, round: 20 } };
  W76.shapeStats = {};
  function shapeCoast(id) {
    var cfg = SHAPE[id]; var rows = rowsOf(id); if (!cfg || !rows) return;
    var H = rows.length, W = rows[0].length, o = RECT[id]; var P = protectedMask(id, rows, cfg.mode === 'wall' ? 7 : 5);
    var isW = function (r, x, y) { return x < 0 || y < 0 || x >= W || y >= H || !!WATERC[r[y][x]]; };
    // 外の海（地図の端につながる水。内陸の湖・泉は入れない）
    var ocean = new Uint8Array(W * H); var qo = []; for (var yo = 0; yo < H; yo++) for (var xo = 0; xo < W; xo++) if ((xo === 0 || yo === 0 || xo === W - 1 || yo === H - 1) && WATERC[rows[yo][xo]]) { ocean[yo * W + xo] = 1; qo.push(yo * W + xo); }
    for (var ho = 0; ho < qo.length; ho++) { var co = qo[ho], cxo = co % W, cyo = (co / W) | 0; for (var ko = 0; ko < 4; ko++) { var xq = cxo + [1, -1, 0, 0][ko], yq = cyo + [0, 0, 1, -1][ko]; if (xq < 0 || yq < 0 || xq >= W || yq >= H) continue; var nq = yq * W + xq; if (!ocean[nq] && WATERC[rows[yq][xq]]) { ocean[nq] = 1; qo.push(nq); } } }
    // 岸からの距離（外の海・地図の外から）
    var dist = new Int16Array(W * H).fill(999); var q = []; for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (ocean[y * W + x] || (!WATERC[rows[y][x]] && (x === 0 || y === 0 || x === W - 1 || y === H - 1))) { dist[y * W + x] = ocean[y * W + x] ? 0 : 1; q.push(y * W + x); }
    for (var h = 0; h < q.length; h++) { var c = q[h], cx = c % W, cy = (c / W) | 0; for (var k = 0; k < 4; k++) { var x2 = cx + [1, -1, 0, 0][k], y2 = cy + [0, 0, 1, -1][k]; if (x2 < 0 || y2 < 0 || x2 >= W || y2 >= H) continue; var n2 = y2 * W + x2; if (dist[n2] > dist[c] + 1) { dist[n2] = dist[c] + 1; q.push(n2); } } }
    // もとの砂浜（歩けて、となりが海）
    var beach = new Uint8Array(W * H); for (var yb = 0; yb < H; yb++) for (var xb = 0; xb < W; xb++) if (passableChar(rows[yb][xb]) && (isW(rows, xb + 1, yb) || isW(rows, xb - 1, yb) || isW(rows, xb, yb + 1) || isW(rows, xb, yb - 1))) beach[yb * W + xb] = 1;
    var nearBeach = function (x, y) { for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && beach[yy * W + xx]) return true; } return false; };
    var lab0 = components(rows); var anchors = anchorsOf(id);
    for (var max = cfg.max; max >= 2; max -= 3) {
      var out = rows.map(function (r) { return r.split(''); }); var cut = new Uint8Array(W * H); var changed = 0;
      for (var y4 = 0; y4 < H; y4++) for (var x4 = 0; x4 < W; x4++) {
        var ch = rows[y4][x4]; if (WATERC[ch] || !NATURAL[ch] || P[y4 * W + x4]) continue;
        var ex = Math.min(x4, W - 1 - x4), ey = Math.min(y4, H - 1 - y4), boost = 0, R = cfg.round || 0;   // 四角の角を丸める（半径 R）
        if (ex < R && ey < R) { var dd = Math.sqrt((R - ex) * (R - ex) + (R - ey) * (R - ey)); if (dd > R) boost = Math.round(dd - R) + 2; }
        var d0 = dist[y4 * W + x4]; if (d0 > max + boost) continue;
        var depth = boost + Math.round(0.6 + vnoise(o.x + x4, o.y + y4, cfg.sc, 76) * max + (vnoise(o.x + x4, o.y + y4, 3, 77) - 0.5) * 1.6);
        if (d0 > depth) continue;
        if (cfg.mode === 'wall' && nearBeach(x4, y4)) continue;
        out[y4][x4] = '~'; cut[y4 * W + x4] = 1; changed++;
      }
      if (cfg.mode === 'wall') {   // 新しい岸の 2 マスは壁に
        for (var y6 = 0; y6 < H; y6++) for (var x6 = 0; x6 < W; x6++) { if (!passableChar(out[y6][x6]) || beach[y6 * W + x6] || P[y6 * W + x6] && !NATURAL[out[y6][x6]]) continue; var near = false;
          for (var dy6 = -2; dy6 <= 2 && !near; dy6++) for (var dx6 = -2; dx6 <= 2; dx6++) { var xx6 = x6 + dx6, yy6 = y6 + dy6; if (xx6 >= 0 && yy6 >= 0 && xx6 < W && yy6 < H && cut[yy6 * W + xx6]) { near = true; break; } }
          if (near && NATURAL[out[y6][x6]]) out[y6][x6] = cfg.wall; }
      }
      var next = relaxShallow(out.map(function (r) { return r.join(''); }));
      var ok = sameReach(lab0, components(next), rows, next, anchors);
      if (ok && cfg.mode === 'wall') {   // 新しい上陸地点がない（となりが海の歩けるマスは、もとの砂浜だけ）
        for (var y7 = 0; y7 < H && ok; y7++) for (var x7 = 0; x7 < W; x7++) { if (!passableChar(next[y7][x7]) || beach[y7 * W + x7]) continue; if (isW(next, x7 + 1, y7) || isW(next, x7 - 1, y7) || isW(next, x7, y7 + 1) || isW(next, x7, y7 - 1)) { ok = false; break; } }
      }
      if (!ok) continue;
      for (var y5 = 0; y5 < H; y5++) rows[y5] = next[y5];
      W76.shapeStats[id] = { changed: changed, max: max }; return;
    }
    W76.shapeStats[id] = { changed: 0, reverted: true };
  }
  // 灰の峠の山並み：グラニア（南口 60,24）とカリオン（北口 60,104）の間の海を山脈に（通れない。峠はダンジョンのまま）
  function makeRidge() {
    var G = rowsOf('world_grania'), K = rowsOf('world_kalion'); if (!G || !K) return; var og = RECT.world_grania, ok = RECT.world_kalion;
    if (og.x !== ok.x || ok.y + ok.h !== og.y) return;   // 南北にそろって接しているときだけ
    var put = function (rows, id, o, y0, y1) { var P = protectedMask(id, rows, 3); var W = rows[0].length; var n = 0;
      for (var y = y0; y <= y1; y++) { var r = rows[y].split(''); var gy = o.y + y; var half = 5 + Math.round(vnoise(60, gy, 7, 81) * 4); var cx = 60 + Math.round((vnoise(0, gy, 9, 82) - 0.5) * 6);
        for (var x = cx - half; x <= cx + half; x++) { if (x < 0 || x >= W || P[y * W + x]) continue; if (WATERC[r[x]]) { r[x] = 'm'; n++; } /* 山だけ（丘は歩けるので使わない＝峠を通らずに越えられないように） */ }
        rows[y] = r.join(''); }
      return n; };
    var n1 = put(K, 'world_kalion', ok, 100, K.length - 1), n2 = put(G, 'world_grania', og, 0, 26);
    var a = relaxShallow(K), b = relaxShallow(G); for (var i = 0; i < K.length; i++) K[i] = a[i]; for (var j = 0; j < G.length; j++) G[j] = b[j];
    W76.ridge = { kalion: n1, grania: n2 };
  }
  var bridgeSet = {};   // 'map:x,y' → true（船が下をくぐれる橋のマス）
  W76.isBridge76 = function (mapId, x, y) { return !!bridgeSet[mapId + ':' + x + ',' + y]; };
  function makeBridges() {
    BRIDGES.forEach(function (b) {
      var A = rowsOf(b.a), B = rowsOf(b.b); if (!A || !B) return; var ra0 = RECT[b.a], rb0 = RECT[b.b]; if (ra0.x + ra0.w !== rb0.x || ra0.y !== rb0.y) return;
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
  // 共通の海：世界の座標から決まる地形。陸からの距離 1 以内＝浅瀬、5 以内＝海、それより遠く＝深い海（遠洋航海船）。沖に小さな岩礁（崖・上陸できない）
  var LAND = null, DIST = null;
  function buildWorldField() {
    var WW = WB * BW, WH = HB * BH; LAND = new Uint8Array(WW * WH); DIST = new Uint16Array(WW * WH).fill(65535); var q = new Int32Array(WW * WH); var t = 0;
    REGIONS.forEach(function (id) { var rows = rowsOf(id); var r = RECT[id]; for (var y = 0; y < r.h; y++) { var row = rows[y]; for (var x = 0; x < r.w; x++) if (!WATERC[row[x]]) { var k = (r.y + y) * WW + r.x + x; LAND[k] = 1; DIST[k] = 0; q[t++] = k; } } });
    var t0 = t; var D8 = new Uint16Array(DIST);   // 4 方向と 8 方向の距離の平均（八角形に近い＝ひし形・四角の縁にならない）
    for (var h = 0; h < t; h++) { var c = q[h], cx = c % WW, cy = (c / WW) | 0, d = DIST[c] + 1; if (d > 40) continue;
      if (cx > 0 && DIST[c - 1] > d) { DIST[c - 1] = d; q[t++] = c - 1; } if (cx < WW - 1 && DIST[c + 1] > d) { DIST[c + 1] = d; q[t++] = c + 1; }
      if (cy > 0 && DIST[c - WW] > d) { DIST[c - WW] = d; q[t++] = c - WW; } if (cy < WH - 1 && DIST[c + WW] > d) { DIST[c + WW] = d; q[t++] = c + WW; } }
    var t2 = t0; for (var h2 = 0; h2 < t2; h2++) { var c2 = q[h2], cx2 = c2 % WW, cy2 = (c2 / WW) | 0, d2 = D8[c2] + 1; if (d2 > 40) continue;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; var xx = cx2 + dx, yy = cy2 + dy; if (xx < 0 || yy < 0 || xx >= WW || yy >= WH) continue; var n2 = yy * WW + xx; if (D8[n2] > d2) { D8[n2] = d2; q[t2++] = n2; } } }
    for (var i = 0; i < WW * WH; i++) if (DIST[i] !== 65535) DIST[i] = Math.round((DIST[i] + Math.min(D8[i], DIST[i])) / 2);
  }
  W76.landDist = function (gx, gy) { var WW = WB * BW; if (!DIST || gx < 0 || gy < 0 || gx >= WW || gy >= HB * BH) return 65535; return DIST[gy * WW + gx]; };
  function seaChar(gx, gy) {
    var WW = WB * BW, WH = HB * BH; var d = W76.landDist(gx, gy);
    if (d <= 1) return 'w'; if (d <= 5) return '~';
    var edge = Math.min(gx, gy, WW - 1 - gx, WH - 1 - gy); if (edge < 3) return '0';
    if (d > 16 && edge > 8) { var n = vnoise(gx, gy, 11, 91); if (n > 0.91 && hash2(gx, gy, 92) < (n - 0.91) * 8) return 'c'; }   // 沖の岩礁
    return '0';
  }
  function seaRows(id) { var r = RECT[id]; var rows = []; for (var y = 0; y < r.h; y++) { var s = ''; for (var x = 0; x < r.w; x++) s += seaChar(r.x + x, r.y + y); rows.push(s); }
    // 岩礁のまわりは浅瀬
    var g = rows.map(function (s) { return s.split(''); }); for (var y2 = 0; y2 < r.h; y2++) for (var x2 = 0; x2 < r.w; x2++) { if (g[y2][x2] !== '0') continue; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var gy = r.y + y2 + dy, gx = r.x + x2 + dx; if ((dx || dy) && seaChar(gx, gy) === 'c') { g[y2][x2] = 'w'; dy = 2; break; } } }
    return g.map(function (s) { return s.join(''); }); }
  function seaName(id) {   // いちばん近い地域の沖（遠ければ「外海」）
    var r = RECT[id]; var cx = r.x + r.w / 2, cy = r.y + r.h / 2; var best = null;
    REGIONS.forEach(function (rid) { var dd = W76.distTo(rid, cx, cy); if (!best || dd < best.d) best = { id: rid, d: dd }; });
    var def = best && root.MAP_DEFS[best.id]; return best && best.d < 70 && def ? def.name + 'の沖' : '外海';
  }
  function defineSeas() {
    SEAS.forEach(function (id) { if (root.MAP_DEFS[id]) return; var cache = null;
      root.MAP_DEFS[id] = { id: id, name: seaName(id), kind: 'field', rows: function () { return cache || (cache = seaRows(id)); }, fallback: 'deep', bgm: 'field', region: true, sea76: true, filler76: true,
        locations: [], warps: [], chests: [], npcs: [], events: [], encounters: null, theme3d: { region: 'islands' } }; });
  }
  /* ---------- 道（次の目的地の案内・地図の線） ---------- */
  var skyRoutes = [];
  W76.skyRoutes = function () { return skyRoutes; };
  function rebuildRoutes() {
    var old = root.SEA_ROUTES || []; W76.oldRoutes = old.slice(); skyRoutes = old.filter(function (r) { return r.sky; });
    // 空の道：別の空間（天空群島）側から出る道と、端の外に何もない辺から出る道だけ残す
    var keep = old.filter(function (r) { if (!r.sky) return false; if (!RECT[r.from.map]) return true; var s = W76.sides(r.from.map); var e = { north: 'n', east: 'e', south: 's', west: 'w' }[r.from.edge]; return !(s && s[e]); });
    var EDGE = { n: 'north', e: 'east', s: 'south', w: 'west' }, OPP = { n: 'south', e: 'west', s: 'north', w: 'east' };
    W76.MAPS.forEach(function (id) { W76.neighbors(id).forEach(function (nb) {
      var veh = (SAIL_MAPS[id] && SAIL_MAPS[nb.id]) ? ['sailboat', 'galleon', 'airship'] : (GATE[nb.id] && GATE[nb.id].vehicles) ? GATE[nb.id].vehicles.slice() : ['galleon', 'airship'];
      var nm = RECT[nb.id].sea ? (root.MAP_DEFS[nb.id] || {}).name : (root.MAP_DEFS[nb.id] || {}).name + 'へ';
      keep.push({ vehicle: veh, from: { map: id, edge: EDGE[nb.side] }, to: { map: nb.id, edge: OPP[nb.side] }, name: nm, needFlag: GATE[nb.id] ? GATE[nb.id].flag : undefined, join76: true, seg: [nb.a, nb.b] });
    }); });
    // 世界の北の果てから天空群島へ（飛空艇）：北の端が世界の果ての地図ごとに
    var up = skyRoutes.filter(function (r) { return r.to.map === 'world_sky' && r.from.edge === 'north' && RECT[r.from.map]; })[0];
    if (up) W76.MAPS.forEach(function (id) { if (RECT[id].y === 0) keep.push({ vehicle: ['airship'], from: { map: id, edge: 'north' }, to: { map: 'world_sky', edge: 'south' }, name: up.name, needFlag: up.needFlag, sky: true, join76: true }); });
    root.SEA_ROUTES = keep; if (root.Nav && root.Nav.resetGraph) root.Nav.resetGraph();
  }
  // 乗り物：橋の下をくぐれる・つないだ道は端に立っただけでは移らない（端の外へ進んだときに W76.tryCross が移す）
  function patchVehicle() {
    var V = root.Vehicle; if (!V || V._w76) return; V._w76 = true;
    var ok0 = V.terrainOk; V.terrainOk = function (id, map, x, y) { if (W76.on() && map && W76.isBridge76(map.id, x, y)) { var def = V.def(id); return !!def && !map.npcAt(x, y) && def.terrain.indexOf('water') >= 0; } return ok0.apply(this, arguments); };
    var ra = V.routeAt; V.routeAt = function (map, x, y) { var r = ra.apply(this, arguments); if (r && r.join76) return null; return r; };
    // 案内の出口：道の範囲（seg）の中から選ぶ
    var H = root.Harbors; if (H && H.edgePoint && !H._w76) { H._w76 = true; var ep0 = H.edgePoint; H.edgePoint = function (map, edge, along, vid, fx, fy) { var r = W76._segRoute; if (r && r.seg && r.from.map === map.id && r.from.edge === edge) { var ref = along !== null && along !== undefined ? along : ((edge === 'east' || edge === 'west') ? fy : fx); along = Math.max(r.seg[0], Math.min(r.seg[1], ref)); } return ep0.call(this, map, edge, along, vid, fx, fy); }; }
  }

  /* ---------- 境目を越える ---------- */
  var toastAt = {}, lastSea = null;
  function say(t) { var now = Date.now(); if (toastAt[t] && now - toastAt[t] < 4000) return; toastAt[t] = now; if (root.Win && root.Win.toast) root.Win.toast(t); }
  W76.say = say;
  function skyUp() { return skyRoutes.filter(function (r) { return r.to.map === 'world_sky' && r.from.edge === 'north'; })[0] || null; }
  // World.tryMove から（端の外へ進もうとしたとき）。戻り値：true＝移った（1歩の移動を始めた）／false＝止めた／null＝関係なし（従来の処理へ）
  W76.tryCross = function (m, p, dir, nx, ny) {
    if (!W76.on() || !m || !RECT[m.id]) return null;
    var d = D(); var aboard = d.aboard; var V = root.Vehicle; var World = root.World;
    var L = W76.neighbor(m.id, nx, ny);
    if (!L) {   // 世界の外：飛空艇で北の果てなら天空群島へ（もとの「北の空路」）。それ以外は進めない
      var g0 = W76.toGlobal(m.id, nx, ny);
      if (aboard && V.flies(aboard) && g0 && g0.y < 0) { var sr = skyUp(); if (sr && (!sr.needFlag || d.flags[sr.needFlag])) { var sky = World.getMap(sr.to.map); var arr = V.arrival(sr, Math.round(g0.x / (WB * BW) * (sky ? sky.w : 160)), p.y); /* 世界の東西の位置に合わせて、天空群島の南の端へ */ if (arr) { World.busy = true; root.Win.message([sr.name + '。雲の上へ上がった。']).then(function () { World.enterMap(arr.map, arr.x, arr.y, arr.dir || 'up'); World.busy = false; }); return true; } } }
      say(aboard ? 'この先は荒れ狂う外洋の嵐。これより先へは進めない' : 'これより先へは進めない'); return false;
    }
    var blk = W76.entryBlock(L.map, aboard, m.id); if (blk) { say(blk.text); return false; }
    var m2 = World.getMap(L.map); var dd = World.delta(dir);
    if (aboard) {
      if (!V.terrainOk(aboard, m2, L.x, L.y)) { if (m2.tiles[L.y] && m2.tiles[L.y][L.x] === 'deep' && V.def(aboard).terrain.indexOf('deep') < 0) say('外海の潮流が強く、' + V.def(aboard).name + 'では進めない（遠洋航海船が必要）'); return false; }
    } else if (!m2.passable(L.x, L.y, d)) return false;
    W76.switchTo(L.map, L.x, L.y, dir, m.id);
    p.x = L.x - dd[0]; p.y = L.y - dd[1]; p.px = p.x * root.Engine.TS; p.py = p.y * root.Engine.TS;
    p.vehicleAction = null; p.moving = true; p.tx = L.x; p.ty = L.y; p.progress = 0;
    return true;
  };
  // 画面を切り替えずに地図を移る（enterMap の、場所を置き直さない版。歩数・戦闘の猶予・状態異常は変えない。訪問済みは本当に入ったときだけ）
  W76.switchTo = function (id, x, y, dir, fromId) {
    var World = root.World, d = D(); var m = World.getMap(id); var o0 = W76.origin(fromId), o1 = W76.origin(id);
    World.map = m; World._lmAt = null; World._lmGrace = 2;
    World.enterHooks.forEach(function (fn) { try { fn(m); } catch (e) { console.error(e); } });
    World.applyState(m);
    if (d.aboard && root.Vehicle) root.Vehicle.syncToPlayer(m, x, y);
    var first = !d.visited[id]; d.visited[id] = true;
    if (root.Minimap) root.Minimap.onEnterMap(m, World.player);
    var bgm = m.def.bgm || 'field'; if (root.Audio && root.Audio.playBgm) root.Audio.playBgm(bgm);
    World.updateHud(); World.updatePlaceLabel();
    var nm = m.def.name;
    if (RECT[id].sea) { if (nm !== lastSea && !(RECT[fromId] && RECT[fromId].sea && root.MAP_DEFS[fromId] && root.MAP_DEFS[fromId].name === nm)) say(nm + 'に出た'); lastSea = nm; }
    else { lastSea = null; say((d.aboard ? nm + 'の海域に入った' : nm + 'に入った') + (first ? '（はじめて）' : '')); }
    W76.crossings = (W76.crossings || 0) + 1;
    var ev = { from: fromId, to: id, dx: o1.x - o0.x, dy: o1.y - o0.y };
    W76.listeners.forEach(function (fn) { try { fn(ev); } catch (e) { console.error(e); } });
  };

  /* ---------- セーブ：つながない（2D 版・設定「地域ごと」）ときに共通の海にいたら、いちばん近い地域の端へ（乗り物ごと） ---------- */
  function nearestRegionEdge(gx, gy, avoid) {
    var best = null; REGIONS.forEach(function (id) { if (avoid && avoid[id]) return; if (!root.MAP_DEFS[id]) return; var r = RECT[id]; var lx = Math.max(0, Math.min(r.w - 1, gx - r.x)), ly = Math.max(0, Math.min(r.h - 1, gy - r.y)); var dd = Math.abs(gx - r.x - lx) + Math.abs(gy - r.y - ly); if (!best || dd < best.dist) best = { map: id, x: lx, y: ly, dist: dd }; }); return best;
  }
  W76.normalizeSave = function (d) {
    if (!d || !d.pos) return false; var id = d.pos.map; var best = null;
    if (LEGACY[id]) {   // 前の版の外海：その版の並びで、いちばん近いとなりの地域の端へ（地域の ID とローカル座標は今の版でも同じ）
      var L0 = LEGACY[id]; var gx = L0.o[0] + d.pos.x, gy = L0.o[1] + d.pos.y; Object.keys(L0.nb).forEach(function (nid) { var o = L0.nb[nid]; var lx = Math.max(0, Math.min(159, gx - o[0])), ly = Math.max(0, Math.min(119, gy - o[1])); var dd = Math.abs(gx - o[0] - lx) + Math.abs(gy - o[1] - ly); if (!best || dd < best.dist) best = { map: nid, x: lx, y: ly, dist: dd }; });
    } else if (RECT[id] && RECT[id].sea && !(W76.on() && root.MAP_DEFS[id])) { var g = W76.toGlobal(id, d.pos.x, d.pos.y); best = nearestRegionEdge(g.x, g.y); }
    if (!best) return false;
    var from = id; d.pos = { map: best.map, x: best.x, y: best.y, dir: d.pos.dir || 'down' };
    var isOld = function (mid) { return mid === from || !!LEGACY[mid] || (RECT[mid] && RECT[mid].sea && !(W76.on() && root.MAP_DEFS[mid])); };
    Object.keys(d.vehicles || {}).forEach(function (k) { var s = d.vehicles[k]; if (!s || !isOld(s.map)) return; if (d.aboard === k) { s.map = best.map; s.x = best.x; s.y = best.y; } else if (s.port && !isOld(s.port.map)) { s.map = s.port.map; s.x = s.port.x; s.y = s.port.y; } else { var hm = root.VEHICLES && root.VEHICLES[k] && root.VEHICLES[k].home; if (hm) { s.map = hm.map; s.x = hm.x; s.y = hm.y; } } });
    d.w76moved = { from: from, to: best.map, at: Date.now() };   // 救済した記録（確認用。ゲームの進行には使わない）
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
    // 到着先の確かめ（ファストトラベル・脱出・全滅・イベントの移動・セーブの読み込みも同じ決まり）：まだ行けない地域・乗り物で入れない地域には着かない
    var em = World.enterMap; World.enterMap = function (id, x, y, dir, opt) {
      if (W76.on() && RECT[id] && !(opt && (opt.raw || opt.w76ok))) { /* raw（セーブの読み込み・確認用の置き直し）は対象外 */ var d = D(); var b = W76.entryBlock(id, d && d.aboard, null); if (b && b.kind === 'flag') { console.warn('World76: まだ行けない地域への到着を止めた', id); W76.blockedArrivals = (W76.blockedArrivals || 0) + 1; var safe = d.lastInn && root.MAP_DEFS[d.lastInn.map] && !(RECT[d.lastInn.map] && W76.entryBlock(d.lastInn.map, null, null)) ? d.lastInn : { map: 'poyo_village', x: 24, y: 32 }; say(b.text); return em.call(this, safe.map, safe.x, safe.y, 'down', opt); } }
      return em.apply(this, arguments);
    };
  }

  W76.init = function () {
    if (W76._init) return; W76._init = true;
    patchWorld();
    if (!ON) return;
    // 地域の大きさが 160×120 でなければ、つながない（安全のため）
    var ok = REGIONS.every(function (id) { var r = rowsOf(id); return r && r.length === W76.CH && r[0].length === W76.CW; });
    if (!ok) { console.warn('World76: 地域の大きさが合わないため、つながない'); return; }
    Object.keys(SHAPE).forEach(shapeCoast); makeRidge(); makeBridges(); buildWorldField(); defineSeas(); rebuildRoutes(); patchVehicle();
    W76.ready = true;
  };
  root.World76 = W76;
  if (root.World && root.Vehicle && root.MAP_DEFS) W76.init();
})(typeof window !== 'undefined' ? window : globalThis);
