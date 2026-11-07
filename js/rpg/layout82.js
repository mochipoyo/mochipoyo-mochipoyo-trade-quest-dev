/* =========================================================
   RPG / Layout82（v8.2）：町の建物の中の「間取り」を、用途（宿・酒場・店・銀行・民家・研究室…）と町ごとに作り直す
   ・依頼（2026-11-07 14:39）：「宿・酒場・道具屋・武器屋・銀行・民家・研究室で役割が分かる間取り」「同じ小部屋に NPC だけ変えて完成としない」
   ・前（v7.6 の Interior76 まで）は、同じ型の部屋（12×9 を広げた 16×11 など）の壁ぞいに家具を散らしただけで、町が違っても同じ並びだった
   ・やること：部屋の大きさ・外の壁・扉・ワープは変えない。動かしてよい家具（樽・木箱・机・棚・寝台・腰かけ・柱など）をいったん床に戻し、
     用途の「区画」（宿＝玄関の受付と客室、酒場＝カウンターとブース席と暖炉、民家＝居間と寝室と台所…）を、間仕切りの壁と家具で置き直す。
     町ごとの違い（暖炉の有無・低い座卓・共同の寝床・二重の玄関・同じ形の区画のくり返し…）は FLAVOR
   ・変えない物：人の立つマス・出来事・宝箱・調べる所・クイズの魔物・ワープ・階段・ほかの地図から着くマス（と、その前のマス）・扉。店のカウンター
   ・確かめ：置くたびに、出口から全部の人と話せるか（カウンター越しでもよい）・出来事・宝箱・ワープ・階段へ行けるか・行けた床が置いたマス以外に減らないか。だめなら置かない
   ・座標は変えない（部屋の大きさは同じ）。セーブの立ち位置が家具の上になったときは、MapRemake.migrate が近くの歩けるマスへ（freeNear）
   ・対象外：物語の台本が座標を使う部屋（Interior76 と同じ一覧＋）・ポヨ村の作り込んだ部屋・城・仕掛けのある部屋・作り直したダンジョン
   ・3D 版は Layout82.info(id)（町・用途・区画）で、町ごとの作り方と家具を選ぶ（three-src/src/environment/theme82.js）
   ・2D 版・3D 版で同じ（タイルの論理）。元の行は def._l82.old に残す
   ========================================================= */
(function (root) {
  'use strict';
  var D = root.MAP_DEFS, TL = root.Tiles, MR = root.MapRemake;
  if (!D || !TL || !MR) return;
  var L = root.Layout82 = { VERSION: 1, maps: {}, skipped: {}, errors: [], owner: {}, role: {}, via: {} };
  var EXCLUDE = { poyo_elder_house: 1, poyo_inn: 1, poyo_church: 1, kalion_finance: 1, sentra_palace_1: 1, ruins_store: 1, aruna_ruins_1: 1, oracle_core_1: 1, memory_vault: 1, rivel_wave_temple: 1, tradia_foundation: 1, asana_home: 1,
    tradia_exchange: 1, tradia_arena: 1, tradia_levex: 1, luxbell_casino: 1 };
  var nameOf = function (def, c) { return TL.byChar[c] || def.fallback || 'grass'; };
  var solidCh = function (def, c) { return TL.isSolid(nameOf(def, c)); };
  var WALLN = { wall: 1, wall_wood: 1, castle_wall: 1, cave_wall: 1 };
  var wallCh = function (def, c) { return !!WALLN[nameOf(def, c)]; };
  // 動かしてよい家具（いったん床に戻す）。カウンター・扉・階段・窓・暖炉などの作り付けは動かさない
  var MOVABLE = { barrel: 1, crate: 1, table: 1, bookshelf: 1, cupboard: 1, bed: 1, bench: 1, pillar: 1, rack: 1, stove: 1, sink: 1, instrument: 1, carpet: 1 };

  /* ---------- 町に属する部屋（建物の入口 → 中のワープでつながる上の階・奥の部屋） ---------- */
  function owners() {
    var own = {}, via = {}; var q = [];
    Object.keys(D).forEach(function (k) {
      var d = D[k]; if (!d || d.kind !== 'town') return;
      (d.buildings || []).forEach(function (b) { if (b && b.interior && D[b.interior] && !own[b.interior]) { own[b.interior] = k; via[b.interior] = { b: b, depth: 0 }; q.push(b.interior); } });
    });
    Object.keys(D).forEach(function (k) {
      var d = D[k]; if (!d || d.kind !== 'town') return;
      (d.warps || []).forEach(function (w) { var t = w && D[w.to]; if (t && t.kind === 'interior' && !own[w.to]) { own[w.to] = k; via[w.to] = { b: null, depth: 0 }; q.push(w.to); } });
    });
    while (q.length) {
      var id = q.shift(); var d = D[id];
      (d.warps || []).forEach(function (w) { var t = w && D[w.to]; if (!t || own[w.to] || t.kind !== 'interior') return; own[w.to] = own[id]; via[w.to] = { from: id, depth: via[id].depth + 1, b: null }; q.push(w.to); });
    }
    return { own: own, via: via };
  }

  /* ---------- 用途 ---------- */
  // 名前から細かい用途（民家の中の仕立て屋・パン屋…）
  var SUBS = [[/仕立/, 'tailor'], [/パン/, 'bakery'], [/アトリエ|画家/, 'atelier'], [/学者|研究生|書斎/, 'scholar'], [/花屋/, 'florist'], [/古道具|骨董/, 'antique'], [/魔導士|魔導具職人|魔法/, 'mage'], [/エンジニア|技師|整備/, 'engineer'],
    [/漁師|網/, 'fisher'], [/鍛冶|工房|職人/, 'smith'], [/時計/, 'clock'], [/郵便/, 'post'], [/倉庫/, 'store'], [/書庫|図書|資料/, 'library'], [/寮|下宿|居住区|宿舎/, 'dorm'], [/自習|研究室|研究所/, 'study'], [/長老|古老|村長/, 'elder'], [/集会|寄り合い|会所/, 'hall']];
  function roleOf(id, def, b, parentRole) {
    var t = (b && b.type) || ''; var n = def.name || ''; var sub = null;
    SUBS.some(function (s) { if (s[0].test(n)) { sub = s[1]; return true; } return false; });
    var r;
    if (/時計塔/.test(n)) return { role: 'clock', sub: 'clock' };
    if (t === 'exchange' || t === 'levex') return { role: 'exchange', sub: sub }; if (t === 'arena') return { role: 'arena', sub: sub }; if (t === 'casino') return { role: 'casino', sub: sub }; if (t === 'mansion') return { role: 'mansion', sub: sub };   // type:'castle' の時計塔（廃墟の街）を城と取り違えない
    if (def.shop && def.shop.kind) r = def.shop.kind === 'weapon' || def.shop.kind === 'armor' ? def.shop.kind : 'item';
    else if (/酒場|バー|隊商宿の食堂/.test(n) || t === 'tavern') r = 'tavern';
    else if (t === 'inn' || /宿/.test(n) && !/宿舎|下宿/.test(n)) r = 'inn';
    else if (t === 'church' || /教会|祠|聖堂|神殿|礼拝/.test(n)) r = 'church';
    else if (t === 'bank' || /銀行|金庫/.test(n)) r = sub === 'library' ? 'library' : sub === 'study' ? 'study' : 'bank';
    else if (t === 'guild' || /ギルド/.test(n)) r = 'guild';
    else if (t === 'academy' || /学院|学校|教室|講義/.test(n)) r = 'academy';
    else if (t === 'lab' || /研究/.test(n)) r = 'study';
    else if (t === 'watchtower' || /塔|やぐら|灯台|見張り/.test(n)) r = 'tower';
    else if (t === 'warehouse' || sub === 'store') r = 'store';
    else if (t === 'dojo' || /道場|修行/.test(n)) r = 'dojo';
    else if (t === 'elder' || sub === 'elder') r = 'elder';
    else if (t === 'castle') r = 'castle';
    else if (sub === 'post') r = 'post';
    else r = parentRole && !b ? parentRole + '_up' : 'house';
    if (!b && parentRole && /[0-9２-９]階|上階|屋根裏|てっぺん/.test(n)) r = (parentRole.replace(/_up$/, '')) + '_up';
    return { role: r, sub: sub };
  }

  /* ---------- 町ごとの違い（間取りの決まり） ---------- */
  // hearth：居間・酒場・宿の受付に暖炉／booth：酒場のブース席／low：低い座卓と敷物（椅子の代わり）／communal：共同の寝床（寝台を並べる）／
  // vestibule：二重の玄関（扉の内側に風よけの間仕切り）／units：同じ形の区画のくり返し（寝台の区画を等間隔）／rugs：敷物を多く／work：作業台を多く（工房の町）
  var FLAVOR = {
    poyo_village: { hearth: 1, rugs: 1, inn: 'lodge', tav: 'long', house: 'two' }, rivel_town: { hearth: 1, rugs: 1, booth: 1, inn: 'back', tav: 'booth', house: 'two' }, rivel_artisan: { work: 1, hearth: 1, inn: 'side', tav: 'long', house: 'work' }, dow_village: { hearth: 1, low: 1, inn: 'lodge', tav: 'long', house: 'hearth' }, harbor_town: { rugs: 0, booth: 0, nets: 1, inn: 'side', tav: 'round', house: 'two' },
    verum_town: { communal: 1, work: 1, inn: 'dorm', tav: 'long', house: 'work' }, kalion_city: { units: 1, inn: 'capsule', tav: 'stand', house: 'unit' }, sentra_capital: { rugs: 1, inn: 'back', tav: 'lounge', house: 'two' }, aruna_village: { communal: 1, hearth: 1, nets: 1, inn: 'dorm', tav: 'long', house: 'hearth' }, aruna_ruins: { ruin: 1, inn: 'back', tav: 'round', house: 'two' },
    tempus_city: { booth: 1, hearth: 1, inn: 'side', tav: 'booth', house: 'two' }, volatilia: { study: 1, inn: 'side', tav: 'long', house: 'two' }, node_city: { units: 1, inn: 'capsule', tav: 'stand', house: 'unit' }, scheduled_district: { units: 1, inn: 'capsule', tav: 'stand', house: 'unit' }, magicka_city: { booth: 1, hearth: 1, rugs: 1, inn: 'back', tav: 'booth', house: 'two' },
    tradia: { booth: 0, work: 0, inn: 'side', tav: 'lounge', house: 'two' }, tradia_sky: { rugs: 1, inn: 'back', tav: 'lounge', house: 'two' }, luxbell: { booth: 1, rugs: 1, inn: 'back', tav: 'lounge', house: 'two' }, sahar_city: { low: 1, rugs: 1, inn: 'court', tav: 'cushion', house: 'court' }, mirror_market: { low: 1, rugs: 1, inn: 'court', tav: 'cushion', house: 'court' },
    ciel_port: { hearth: 1, vestibule: 1, inn: 'lodge', tav: 'round', house: 'hearth' }, frost_town: { hearth: 1, vestibule: 1, rugs: 1, inn: 'lodge', tav: 'booth', house: 'hearth' }, ignas_town: { work: 1, hearth: 1, inn: 'dorm', tav: 'long', house: 'work' }, erased_village: { low: 1, inn: 'side', tav: 'cushion', house: 'hearth' }, star_camp: { communal: 1, inn: 'dorm', tav: 'long', house: 'cot' },
    dark_camp: { communal: 1, inn: 'dorm', tav: 'long', house: 'cot' }, asana_village: { hearth: 1, inn: 'lodge', tav: 'long', house: 'hearth' }, asana_rebuilt: { hearth: 1, inn: 'lodge', tav: 'long', house: 'hearth' }, asana_raid: { ruin: 1 }, asana_ruins: { ruin: 1 }, neon_town: { units: 1, work: 1, inn: 'capsule', tav: 'stand', house: 'work' }, meridian_shelter: { communal: 1, units: 1, inn: 'dorm', tav: 'long', house: 'cot' },
    nereia_city: { low: 1, nets: 1, inn: 'court', tav: 'round', house: 'court' }, nereia_old_hi: {  }, nereia_old_lo: {  }
  };

  /* ---------- 確かめ（Interior76 と同じ：出口から歩いて、全部の人・出来事・宝箱・ワープへ） ---------- */
  function analyze(def, rows, id, fixedSolid) {
    var H = rows.length, W = rows[0].length;
    var walk = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && !solidCh(def, rows[y][x]) && !fixedSolid[x + ',' + y]; };
    var npcAt = {}; (def.npcs || []).forEach(function (n) { if (!n.hidden) npcAt[n.x + ',' + n.y] = 1; });
    var starts = (def.warps || []).filter(function (q) { return q && walk(q.x, q.y); }); if (!starts.length) return null;
    var seen = {}; var st = [[starts[0].x, starts[0].y]]; seen[starts[0].x + ',' + starts[0].y] = 1;
    while (st.length) { var a = st.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = a[0] + d[0], ny = a[1] + d[1], k = nx + ',' + ny; if (seen[k] || !walk(nx, ny) || npcAt[k]) return; seen[k] = 1; st.push([nx, ny]); }); }
    var near = function (x, y) { return seen[x + ',' + y] || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { var nx = x + d[0], ny = y + d[1]; if (seen[nx + ',' + ny]) return true; return ny >= 0 && ny < H && nx >= 0 && nx < W && nameOf(def, rows[ny][nx]) === 'counter' && seen[(nx + d[0]) + ',' + (ny + d[1])]; }); };
    var bad = [];
    (def.warps || []).forEach(function (w) { if (w && walk(w.x, w.y) && !seen[w.x + ',' + w.y]) bad.push('warp'); });
    (def.npcs || []).forEach(function (n) { if (!n.hidden && !near(n.x, n.y)) bad.push('npc ' + n.id); });
    (def.events || []).forEach(function (e) { if (e && typeof e.x === 'number' && !near(e.x, e.y)) bad.push('event'); });
    (def.chests || []).forEach(function (c) { if (!near(c.x, c.y)) bad.push('chest'); });
    return { seen: seen, bad: bad };
  }

  /* ---------- 1 部屋 ---------- */
  function arrivals(id) {
    var A = {}; Object.keys(D).forEach(function (k) { var d = D[k]; if (!d) return; [].concat(d.warps || [], (d.events || []).filter(function (e) { return e && e.to; }), d.locations || []).forEach(function (q) { if (q && q.to === id && typeof q.tx === 'number') A[q.tx + ',' + q.ty] = 1; }); });
    return A;
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function plan(id, def, info, flav) {
    var rows0 = def.rows; var H = rows0.length, W = rows0[0].length;
    var G = rows0.map(function (r) { return r.split(''); });
    var at = function (x, y) { return (x < 0 || y < 0 || x >= W || y >= H) ? '#' : G[y][x]; };
    // 動かせないマス
    var fixed = {}; var fix = function (x, y) { if (typeof x === 'number' && typeof y === 'number') fixed[x + ',' + y] = 1; };
    var fixedSolid = {};
    (def.npcs || []).forEach(function (n) { fix(n.x, n.y); var r = n.wander || 0; for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) fix(n.x + dx, n.y + dy); });
    (def.events || []).forEach(function (e) { if (e) { fix(e.x, e.y); if (e.solid) fixedSolid[e.x + ',' + e.y] = 1; } });
    (def.chests || []).forEach(function (c) { fix(c.x, c.y); });
    (def.warps || []).forEach(function (w) { if (w) { fix(w.x, w.y); [[0, -1], [0, 1], [1, 0], [-1, 0]].forEach(function (d) { fix(w.x + d[0], w.y + d[1]); }); } });
    [root.SEARCH_POINTS, root.QUIZ_MONSTERS].forEach(function (Lst) { (Lst || []).forEach(function (p) { if (p && p.map === id) { fix(p.x, p.y); fixedSolid[p.x + ',' + p.y] = 1; } }); });
    var A = arrivals(id); Object.keys(A).forEach(function (k) { var a = k.split(','); var x = +a[0], y = +a[1]; fix(x, y); [[0, -1], [0, 1], [1, 0], [-1, 0]].forEach(function (d) { fix(x + d[0], y + d[1]); }); });
    // 部屋の内側（外の壁の内側の箱）と、床の文字
    var ix0 = W, iy0 = H, ix1 = -1, iy1 = -1; var cnt = {};
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { var c = G[y][x]; if (wallCh(def, c) || c === 'D') continue; if (x < ix0) ix0 = x; if (y < iy0) iy0 = y; if (x > ix1) ix1 = x; if (y > iy1) iy1 = y; if (!solidCh(def, c) && 'pD<>@'.indexOf(c) < 0) cnt[c] = (cnt[c] || 0) + 1; }
    if (ix1 - ix0 < 5 || iy1 - iy0 < 4) return null;
    var floor = '_', bn = -1; Object.keys(cnt).forEach(function (c) { if (cnt[c] > bn) { bn = cnt[c]; floor = c; } });
    // 出口（下の壁の扉）
    var door = (def.warps || []).filter(function (w) { return w && w.y >= iy1; })[0] || (def.warps || [])[0]; if (!door) return null;
    var dX = door.x;
    // 入口の通り道（扉の上 3 マス）は空ける
    for (var k = 0; k <= 3; k++) { fix(dX, iy1 - k); }
    fix(dX - 1, iy1); fix(dX + 1, iy1);
    // 動かせる家具を床に戻す（動かせないマス・カウンターのとなりの店の物は残す）
    var keep = function (x, y) { if (fixed[x + ',' + y]) return true; var n = nameOf(def, G[y][x]); if (!MOVABLE[n]) return true; if (def.shop && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { return nameOf(def, at(x + d[0], y + d[1])) === 'counter'; }) && n !== 'carpet') return true; return false; };
    var cleared = 0;
    for (var y2 = iy0; y2 <= iy1; y2++) for (var x2 = ix0; x2 <= ix1; x2++) { if (!keep(x2, y2)) { if (G[y2][x2] !== floor) cleared++; G[y2][x2] = floor; } }
    var str = function () { return G.map(function (r) { return r.join(''); }); };
    var base = analyze(def, str(), id, fixedSolid); if (!base || base.bad.length) return { fail: 'base ' + (base ? base.bad.join(',') : 'no start') };
    var placed = 0, pieces = 0, log = [];
    var free = function (x, y) { return x >= ix0 && y >= iy0 && x <= ix1 && y <= iy1 && !fixed[x + ',' + y] && G[y][x] === floor; };
    // 1 つの物（複数のマス）を置く。全部が空いた床で、置いたあとも全部へ行けて、行ける床が置いたマス以外に減らないときだけ
    var put = function (tiles, tag) {
      if (!tiles.length) return false;
      for (var i = 0; i < tiles.length; i++) if (!free(tiles[i][0], tiles[i][1])) return false;
      var prev = tiles.map(function (t) { return G[t[1]][t[0]]; }); tiles.forEach(function (t) { G[t[1]][t[0]] = t[2]; });
      var r = analyze(def, str(), id, fixedSolid); var ok = !!r && !r.bad.length;
      if (ok) { var mine = {}; tiles.forEach(function (t) { mine[t[0] + ',' + t[1]] = 1; }); Object.keys(base.seen).forEach(function (kk) { if (!ok) return; if (!r.seen[kk] && !(mine[kk] && solidCh(def, G[+kk.split(',')[1]][+kk.split(',')[0]]))) ok = false; }); }
      if (!ok) { tiles.forEach(function (t, i) { G[t[1]][t[0]] = prev[i]; }); return false; }
      base = r; placed += tiles.filter(function (t) { return solidCh(def, t[2]); }).length; pieces++; if (tag) log.push(tag); return true;
    };
    var tryAll = function (list, tag) { for (var i = 0; i < list.length; i++) if (put(list[i], tag)) return true; return false; };
    var hz = hash(id);
    var Wn = ix1 - ix0 + 1, Hn = iy1 - iy0 + 1;
    var row = function (x0, x1, y, ch) { var o = []; for (var x = x0; x <= x1; x++) o.push([x, y, ch]); return o; };
    var col = function (x, y0, y1, ch) { var o = []; for (var y = y0; y <= y1; y++) o.push([x, y, ch]); return o; };
    var rug = function (x0, y0, w, h) { var o = []; for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) if (free(x, y)) o.push([x, y, 'p']); return o; };
    // 壁ぞいの棚（奥の壁＝上の行）。spans：空いた所を左から
    var backWall = function (y, ch, from, to, every) { var n = 0; for (var x = from; x <= to; x++) { if ((x - from) % (every || 1)) continue; if (put([[x, y, ch]], 'back')) n++; } return n; };
    var sideWall = function (x, ch, from, to, every) { var n = 0; for (var y = from; y <= to; y++) { if ((y - from) % (every || 1)) continue; if (put([[x, y, ch]], 'side')) n++; } return n; };
    // 間仕切り（縦）：x の列に y0..y1、doorY だけ空ける
    var wallV = function (x, y0, y1, doorY) { var o = []; for (var y = y0; y <= y1; y++) if (y !== doorY) o.push([x, y, '#']); return o; };
    var wallH = function (y, x0, x1, doors) { var o = []; for (var x = x0; x <= x1; x++) if (doors.indexOf(x) < 0) o.push([x, y, '#']); return o; };
    var left = dX - ix0 > ix1 - dX;   // 扉より左が広い
    var roleBase = info.role.replace(/_up$/, ''); var up = /_up$/.test(info.role);
    var sub = info.sub;

    // ---- 二重の玄関（寒い町）：扉の内側に、両わきの短い間仕切り（風よけ）
    if (flav.vestibule && !up && Hn >= 7) { put([[dX - 2, iy1 - 1, '#'], [dX - 2, iy1, '#']], 'vestibule'); put([[dX + 2, iy1 - 1, '#'], [dX + 2, iy1, '#']], 'vestibule'); }

    if (up) {
      // ---- 上の階：親の用途で、客室（宿）・寝室（民家）・物置（店・酒場）・見張り台（塔）
      if (roleBase === 'inn' || roleBase === 'dorm' || sub === 'dorm') {
        var cw = flav.units ? 3 : 4; for (var cx0 = ix0; cx0 + cw - 1 <= ix1; cx0 += cw) { put([[cx0, iy0, 'E']], 'bed'); put([[cx0 + 1, iy0, '{']], 'nightstand'); if (cx0 + cw <= ix1 && Hn >= 6) put(wallV(cx0 + cw - 1, iy0, iy0 + 2, -1), 'cell'); }
        put(rug(ix0 + 1, iy1 - 2, 3, 2), 'rug');
      } else if (roleBase === 'tower') {
        backWall(iy0, 'z', ix0, ix0 + 2); put([[ix1, iy1 - 1, 'q']], 'barrel'); put([[(ix0 + ix1) >> 1, (iy0 + iy1) >> 1, '?']], 'telescope'); put([[ix0, iy1, 't']], 'map table');
      } else if (roleBase === 'house' || roleBase === 'elder') {
        put([[ix0, iy0, 'E']], 'bed'); put([[ix0 + 2, iy0, 'E']], 'bed'); put([[ix0 + 1, iy0, '{']], 'nightstand'); put([[ix1, iy0, '{']], 'wardrobe'); put([[ix1 - 1, iy0, '{']], 'wardrobe');
        put(rug(ix0, iy0 + 2, 3, 2), 'rug'); put([[ix1, iy1, 'z']], 'chest'); put([[ix1 - 2, iy0 + 3, 't']], 'desk');
        if (Wn >= 9) put(wallV(ix0 + 4, iy0, iy0 + 2, -1), 'room');
      } else {
        backWall(iy0, 'z', ix0, ix0 + 3); backWall(iy0, 'q', ix1 - 2, ix1); sideWall(ix0, 'z', iy0 + 2, iy1 - 1, 2); sideWall(ix1, 'K', iy0 + 2, iy1 - 1, 2); put([[ix0 + 3, iy1 - 2, 't']], 'table');
      }
      return finish();
    }

    // 民家の別の形（町ごと）：hearth＝真ん中の炉を囲む一間／court＝敷物の中庭を寝台の小部屋が囲む／work＝扉の側が仕事場、奥が住まい／unit＝同じ形の部屋（寝台・机・物入れ・時計）／cot＝折りたたみの寝台の列
    function planHouseVariant(HV) {
      var mxh = (ix0 + ix1) >> 1;
      if (HV === 'hearth') {
        tryAll([[[mxh, iy0 + 3, '(']], [[mxh + 1, iy0 + 3, '(']], [[mxh, iy0 + 2, '(']]], 'central hearth'); put(rug(mxh - 1, iy0 + 4, 3, 2), 'hearth rug');
        put([[ix0, iy0, 'E']], 'bed'); put([[ix0, iy0 + 2, 'E']], 'bed'); put([[ix0 + 1, iy0, '{']], 'chest'); put([[ix1, iy0, '^']], 'stove'); put([[ix1 - 1, iy0, '{']], 'cupboard'); put([[ix1, iy0 + 2, 'z']], 'firewood');
        tryAll([row(mxh - 1, mxh, iy0 + 1, 't'), [[mxh, iy0 + 1, 't']]], 'table'); put([[ix1, iy1 - 1, 'q']], 'water barrel');
      } else if (HV === 'court') {
        put(rug(mxh - 2, iy0 + 2, 5, 3), 'court rug'); tryAll([[[mxh, iy0 + 3, 'a']], [[mxh, iy0 + 2, 'a']]], 'court planter');
        put([[ix0, iy0, 'E']], 'bed'); tryAll([wallV(ix0 + 2, iy0, iy0 + 1, -1)], 'alcove wall'); put([[ix1, iy0, 'E']], 'bed'); tryAll([wallV(ix1 - 2, iy0, iy0 + 1, -1)], 'alcove wall');
        put([[ix0, iy1 - 1, 'q']], 'water jar'); put([[ix0, iy1 - 2, 'q']], 'water jar'); put([[ix1, iy1 - 1, '^']], 'clay oven'); put([[mxh - 1, iy0, 't']], 'low table');
      } else if (HV === 'work') {
        var wy = iy1 - 3; put([[ix0, iy1 - 1, '(']], 'forge'); put([[ix0 + 1, iy1 - 1, 'z']], 'anvil'); put(row(ix1 - 2, ix1, iy1 - 1, 't'), 'workbench'); put([[ix0, iy1 - 3, ')']], 'tool rack');
        var gap = []; for (var xg = ix0; xg <= ix1; xg++) if (Math.abs(xg - dX) > 1) gap.push([xg, wy - 1, '#']); tryAll([gap.filter(function (t) { return t[0] < ix0 + 4 || t[0] > ix1 - 4; })], 'shop partition');
        put([[ix0, iy0, 'E']], 'bed'); put([[ix0 + 1, iy0, '{']], 'wardrobe'); put([[ix1, iy0, '^']], 'stove'); put([[ix1 - 1, iy0, ']']], 'sink'); put(row(mxh - 1, mxh, iy0 + 1, 't'), 'table');
      } else if (HV === 'unit') {
        put([[ix0, iy0, 'E']], 'bed'); put([[ix0 + 1, iy0, '{']], 'locker'); put([[ix0 + 2, iy0, 't']], 'desk'); tryAll([wallV(ix0 + 3, iy0, iy0 + 2, -1)], 'unit wall');
        put([[ix1, iy0, 'E']], 'bed'); put([[ix1 - 1, iy0, '{']], 'locker'); put([[ix1 - 2, iy0, 't']], 'desk'); tryAll([wallV(ix1 - 3, iy0, iy0 + 2, -1)], 'unit wall');
        put([[mxh, iy0, '}']], 'schedule board'); put([[ix0, iy1 - 1, ']']], 'sink'); put([[ix1, iy1 - 1, '^']], 'heater');
      } else if (HV === 'cot') {
        for (var xc = ix0; xc <= ix1; xc += 3) put([[xc, iy0, 'E']], 'cot'); put(row(mxh - 1, mxh + 1, iy0 + 3, 't'), 'field table'); put([[ix0, iy1 - 1, 'z']], 'supply crate'); put([[ix1, iy1 - 1, 'z']], 'supply crate'); put([[ix1, iy0 + 3, 'q']], 'water');
      }
      if (flav.hearth && HV !== 'hearth') tryAll([[[ix1, iy0 + 3, '(']], [[ix0, iy0 + 3, '(']]], 'hearth');
    }

    switch (roleBase) {
      case 'inn': {
        // 宿：玄関の受付（店主のそばのカウンター）と客室。客室の形は町ごと（FLAVOR.inn）
        //   back＝奥の壁ぞいの区画（入口はカーテン）／side＝横の壁ぞいに区画を縦に／dorm＝共同の寝床の列／capsule＝同じ形の小さな区画のくり返し／
        //   court＝敷物の真ん中の間を寝台が囲む／lodge＝真ん中の大きな炉を腰かけが囲み、寝台は奥のすみ
        var kp = (def.npcs || [])[0]; var hasDesk = kp && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { return nameOf(def, at(kp.x + d[0], kp.y + d[1])) === 'counter'; });
        var IV = flav.inn || 'back';
        if (IV === 'back') {
          for (var cx = ix0; cx + 2 <= ix1; cx += 4) { put([[cx, iy0, 'E']], 'bed'); put([[cx + 1, iy0, '{']], 'nightstand'); if (cx + 3 <= ix1) tryAll([wallV(cx + 3, iy0, iy0 + 2, -1), wallV(cx + 3, iy0, iy0 + 1, -1)], 'cell wall'); }
        } else if (IV === 'side') {
          var sx0 = left ? ix1 - 2 : ix0; for (var cy0 = iy0; cy0 + 1 <= iy1 - 3; cy0 += 3) { put([[left ? ix1 : ix0, cy0, 'E']], 'bed'); put([[left ? ix1 : ix0, cy0 + 1, '{']], 'nightstand'); tryAll([row(sx0, sx0 + 2, cy0 + 2, '#'), row(left ? ix1 - 1 : ix0, left ? ix1 : ix0 + 1, cy0 + 2, '#')], 'cell wall'); }
        } else if (IV === 'dorm') {
          for (var dx2 = ix0; dx2 <= ix1; dx2 += 2) put([[dx2, iy0, 'E']], 'bunk'); for (var dx3 = ix0 + 1; dx3 <= ix1 - 1; dx3 += 2) { if (Math.abs(dx3 - dX) <= 1) continue; put([[dx3, iy0 + 3, 'E']], 'bunk'); }
          put(row(ix0, ix0 + 1, iy0 + 5, 'z'), 'lockers');
        } else if (IV === 'capsule') {
          for (var kx2 = ix0; kx2 + 1 <= ix1; kx2 += 2) { put([[kx2, iy0, 'E']], 'capsule'); put([[kx2 + 1, iy0, '#']], 'capsule wall'); }
          for (var kx3 = ix0; kx3 + 1 <= ix1; kx3 += 2) { if (Math.abs(kx3 - dX) <= 2) continue; put([[kx3, iy0 + 3, 'E']], 'capsule'); put([[kx3 + 1, iy0 + 3, '#']], 'capsule wall'); }
        } else if (IV === 'court') {
          put([[ix0, iy0, 'E']], 'bed'); put([[ix1, iy0, 'E']], 'bed'); put([[ix0, iy0 + 3, 'E']], 'bed'); put([[ix1, iy0 + 3, 'E']], 'bed');
          var cmx = (ix0 + ix1) >> 1; put(rug(cmx - 2, iy0 + 1, 5, 3), 'court rug'); tryAll([[[cmx, iy0 + 2, 'j']], [[cmx, iy0 + 2, 'a']]], 'court basin'); put([[cmx - 3, iy0, 'a']], 'planter'); put([[cmx + 3, iy0, 'a']], 'planter');
        } else if (IV === 'lodge') {
          var lmx0 = (ix0 + ix1) >> 1; tryAll([[[lmx0, iy0 + 3, '('], [lmx0 + 1, iy0 + 3, '(']], [[lmx0, iy0 + 3, '(']]], 'central hearth');
          put(row(lmx0 - 1, lmx0 + 2, iy0 + 5, 'e'), 'hearth bench'); put([[ix0, iy0, 'E']], 'bed'); put([[ix0 + 1, iy0, '{']], 'chest'); put([[ix1, iy0, 'E']], 'bed'); put([[ix1 - 1, iy0, '{']], 'chest'); put(rug(lmx0 - 1, iy0 + 1, 4, 1), 'fur rug');
        }
        // 受付：店主のそばにカウンターがなければ、扉から見て広い側に
        if (!hasDesk) { var rx = left ? ix0 : ix1 - 2; var ry = iy1 - 2; tryAll([row(rx, rx + 2, ry, 'T'), row(rx, rx + 2, ry - 1, 'T'), row(rx, rx + 1, ry, 'T'), [[rx + 1, ry, 'T']]], 'reception'); }
        tryAll([[[left ? ix0 : ix1, iy1, 'K']], [[left ? ix0 : ix1, iy1 - 1, 'K']], [[left ? ix1 : ix0, iy1, 'K']]], 'ledger shelf');
        if (flav.hearth && IV !== 'lodge') tryAll([iy1 - 2, iy1 - 3, iy1 - 1, iy0 + 4].map(function (yy) { return [[left ? ix1 : ix0, yy, '(']]; }), 'hearth');
        tryAll([[[left ? ix1 - 2 : ix0 + 2, iy1, 'e'], [left ? ix1 - 3 : ix0 + 3, iy1, 'e']], [[left ? ix1 - 2 : ix0 + 2, iy1, 'e']]], 'waiting bench'); put([[left ? ix1 : ix0, iy1, 'q']], 'luggage');
        if (IV !== 'court') put(rug(dX - 1, iy1 - 3, 3, 2), 'entry rug');
        break;
      }
      case 'tavern': {
        // 酒場：カウンター（バーテンのそば）・奥の酒棚・樽。客の席は町ごと（FLAVOR.tav）
        //   booth＝背の高い腰かけのブース席と暖炉／long＝長い食卓（共同の食堂）／round＝丸い机と樽／cushion＝敷物の上の低い座卓／lounge＝ソファが囲む席／stand＝立ち飲みの台の列
        var bt = (def.npcs || [])[0]; var bx = bt ? bt.x : ix0 + 1, by = bt ? bt.y : iy0 + 1; var barLeft = bx <= (ix0 + ix1) / 2;
        var hasBar = false; for (var yq = iy0; yq <= iy0 + 2; yq++) for (var xq = ix0; xq <= ix1; xq++) if (nameOf(def, G[yq][xq]) === 'counter') hasBar = true;
        backWall(iy0, 'K', barLeft ? ix0 : ix1 - 4, barLeft ? ix0 + 4 : ix1); put([[barLeft ? ix0 + 5 : ix1 - 5, iy0, 'q']], 'keg'); put([[barLeft ? ix0 + 6 : ix1 - 6, iy0, 'q']], 'keg');
        if (!hasBar) { var ctrY = Math.min(by + 1, iy0 + 2); tryAll([row(barLeft ? ix0 : ix1 - 4, barLeft ? ix0 + 4 : ix1, ctrY, 'T'), row(barLeft ? ix0 : ix1 - 3, barLeft ? ix0 + 3 : ix1, ctrY, 'T')], 'bar counter'); }
        var bsX = barLeft ? ix1 : ix0, bsX2 = barLeft ? ix0 : ix1; var mx = (ix0 + ix1) >> 1; var TV = flav.tav || 'round';
        if (TV === 'booth') {
          var nb = 0; for (var yb = iy0 + 2; yb + 2 <= iy1 - 1 && nb < 3; yb++) { if (tryAll([[[bsX, yb, 'e'], [bsX, yb + 1, 't'], [bsX, yb + 2, 'e']]], 'booth')) { nb++; put([[bsX, yb + 3, '#']], 'booth back'); yb += 3; } }
          for (var xb = ix0 + 2; xb + 2 <= ix1 - 2 && nb < 5; xb++) { if (Math.abs(xb + 1 - dX) <= 2) continue; if (tryAll([[[xb, iy1, 'e'], [xb + 1, iy1, 't'], [xb + 2, iy1, 'e']]], 'booth')) { nb++; xb += 3; } }
          [[mx - 2, iy0 + 5], [mx + 2, iy0 + 5]].forEach(function (p) { tryAll([[[p[0], p[1], 't']], [[p[0], p[1] - 1, 't']]], 'round table'); });
        } else if (TV === 'long') {
          [iy0 + 4, iy0 + 7].forEach(function (yy) { put(row(ix0 + 2, dX - 2, yy, 't'), 'long table'); put(row(dX + 2, ix1 - 2, yy, 't'), 'long table'); });
          put([[bsX, iy1, 'q']], 'water barrel');
        } else if (TV === 'cushion') {
          [[ix0 + 1, iy0 + 3], [ix1 - 3, iy0 + 3], [ix0 + 1, iy1 - 2], [ix1 - 3, iy1 - 2]].forEach(function (p) { var rg = rug(p[0], p[1], 3, 2); if (put(rg, 'cushion rug')) put([[p[0] + 1, p[1], 't']], 'low table'); });
        } else if (TV === 'lounge') {
          [[ix0 + 1, iy0 + 4], [ix1 - 3, iy0 + 4]].forEach(function (p) { tryAll([[[p[0], p[1], 'e'], [p[0] + 1, p[1], 'e'], [p[0] + 2, p[1], 'e'], [p[0], p[1] + 1, 'e'], [p[0] + 1, p[1] + 1, 't'], [p[0] + 2, p[1] + 1, 'e']], [[p[0], p[1], 'e'], [p[0] + 1, p[1], 'e'], [p[0] + 1, p[1] + 1, 't']]], 'sofa set'); });
          put(rug(dX - 1, iy1 - 2, 3, 2), 'carpet');
        } else if (TV === 'stand') {
          for (var xs = ix0 + 2; xs + 2 <= ix1 - 1; xs += 4) { if (Math.abs(xs + 1 - dX) <= 2) continue; put(row(xs, xs + 1, iy0 + 4, 'T'), 'standing table'); put(row(xs, xs + 1, iy0 + 7, 'T'), 'standing table'); }
        } else {
          [[mx - 4, iy0 + 4], [mx + 3, iy0 + 4], [mx - 1, iy0 + 6], [mx - 4, iy0 + 8], [mx + 3, iy0 + 8]].forEach(function (p) { tryAll([[[p[0], p[1], 't']], [[p[0], p[1] - 1, 't']], [[p[0] + 1, p[1], 't']]], 'round table'); });
          sideWall(bsX, 'q', iy0 + 3, iy1 - 1, 2);
        }
        if (flav.hearth) { var hl = []; for (var yh = iy0 + 2; yh <= iy1 - 2; yh++) hl.push([[bsX2, yh, '(']], [[bsX, yh, '(']]); for (var xh = ix0 + 1; xh < ix1; xh++) hl.push([[xh, iy0, '(']]); tryAll(hl, 'fireplace'); }
        put([[barLeft ? ix0 : ix1, iy1, 'q']], 'barrel'); put([[barLeft ? ix0 : ix1, iy1 - 1, 'z']], 'crate');
        break;
      }
      case 'item': case 'weapon': case 'armor': {
        // 店：カウンターの奥の壁に商品の棚（道具屋＝薬の引き出し棚、武器屋＝武器かけ、防具屋＝武器かけと鎧の台）。客の側に陳列台・樽
        var ctr = []; for (var y3 = iy0; y3 <= iy1; y3++) for (var x3 = ix0; x3 <= ix1; x3++) if (nameOf(def, G[y3][x3]) === 'counter') ctr.push([x3, y3]);
        var cy = ctr.length ? ctr[0][1] : iy0 + 2;
        var shelf = roleBase === 'item' ? (sub === 'mage' || info.town === 'magicka_city' ? '{' : 'K') : ')';
        backWall(iy0, shelf, ix0, ix1);
        if (roleBase === 'item') { sideWall(ix0, '{', cy + 2, iy1 - 2, 2); sideWall(ix1, 'K', cy + 2, iy1 - 2, 2); }
        if (roleBase === 'weapon') { sideWall(ix0, ')', cy + 2, iy1 - 2, 2); tryAll([[[ix1, cy + 2, '(']], [[ix1, cy + 3, '(']]], 'forge'); put([[ix1 - 1, cy + 3, 'z']], 'anvil'); sideWall(ix1, 'q', cy + 5, iy1 - 1, 2); }
        if (roleBase === 'armor') { for (var xa = ix0 + 2; xa <= ix1 - 2; xa += 3) put([[xa, cy + 3, 'I']], 'armor stand'); sideWall(ix0, ')', cy + 2, iy1 - 2, 2); sideWall(ix1, ')', cy + 2, iy1 - 2, 2); }
        if (roleBase === 'item') { var mx2 = (ix0 + ix1) >> 1; [[mx2 - 3, cy + 3], [mx2 + 2, cy + 3]].forEach(function (p) { tryAll([row(p[0], p[0] + 1, p[1], 't'), [[p[0], p[1], 't']]], 'display'); }); put([[ix0, iy1, 'q']], 'barrel'); put([[ix1, iy1, 'z']], 'crate'); }
        break;
      }
      case 'bank': {
        // 窓口：カウンターの列に、等間隔の仕切り（柱）。奥に金庫の棚・帳簿の棚。手前に待合の腰かけの列
        var ctr2 = []; for (var y4 = iy0; y4 <= iy1; y4++) for (var x4 = ix0; x4 <= ix1; x4++) if (nameOf(def, G[y4][x4]) === 'counter') ctr2.push([x4, y4]);
        var cy2 = ctr2.length ? ctr2[0][1] : iy0 + 1;
        if (!ctr2.length) { tryAll([row(ix0, ix1 - 2, iy0 + 2, 'T'), row(ix0 + 2, ix1, iy0 + 2, 'T')], 'teller counter'); cy2 = iy0 + 2; }
        backWall(iy0, '{', ix0, ix0 + 2); backWall(iy0, 'K', ix1 - 3, ix1);
        for (var yb3 = cy2 + 3; yb3 <= iy1 - 2; yb3 += 2) { put(row(ix0 + 1, ix0 + 3, yb3, 'e'), 'waiting bench'); put(row(ix1 - 3, ix1 - 1, yb3, 'e'), 'waiting bench'); }
        put([[ix0, iy1, 'I']], 'post'); put([[ix1, iy1, 'I']], 'post');
        break;
      }
      case 'church': {
        // 祭壇（奥）・長椅子の列（真ん中に通路）・脇の柱
        var mid = dX; put([[mid - 1, iy0, 'T'], [mid, iy0, 'T'], [mid + 1, iy0, 'T']].filter(function (t) { return free(t[0], t[1]); }), 'altar');
        for (var yp = iy0 + 3; yp <= iy1 - 2; yp += 2) { put(row(ix0 + 1, mid - 2, yp, 'e'), 'pew'); put(row(mid + 2, ix1 - 1, yp, 'e'), 'pew'); }
        for (var yc = iy0 + 1; yc <= iy1 - 1; yc += 3) { put([[ix0, yc, 'I']], 'column'); put([[ix1, yc, 'I']], 'column'); }
        put(col(mid, iy0 + 1, iy1 - 1, 'p').filter(function (t) { return free(t[0], t[1]); }), 'aisle');
        break;
      }
      case 'guild': case 'academy': case 'study': case 'library': {
        // 研究・学び：奥に黒板・本棚、長机の列、計器・天球儀
        if (roleBase === 'library') { for (var yl = iy0 + 1; yl <= iy1 - 2; yl += 2) { put(row(ix0, ix0 + 3, yl, 'K'), 'stack'); put(row(ix1 - 3, ix1, yl, 'K'), 'stack'); } backWall(iy0, 'K', ix0, ix1); put(row(dX - 1, dX + 1, iy0 + 3, 't'), 'reading desk'); break; }
        backWall(iy0, roleBase === 'guild' ? 'K' : 'K', ix0, ix1, 1); tryAll([row(dX - 1, dX + 1, iy0, '}'), [[dX, iy0, '}']]], 'board');
        for (var yd = iy0 + 3; yd <= iy1 - 2; yd += 2) { put(row(ix0 + 1, ix0 + 4, yd, 't'), 'long desk'); put(row(ix1 - 4, ix1 - 1, yd, 't'), 'long desk'); }
        put([[ix1, iy0 + 2, roleBase === 'guild' ? '{' : '*']], 'globe'); put([[ix0, iy0 + 2, '?']], 'instrument'); put([[ix0, iy1, '{']], 'locker'); put([[ix1, iy1, 'K']], 'shelf');
        break;
      }
      case 'tower': {
        // 塔：らせん階段のまわりの物置・見張りの道具
        backWall(iy0, 'z', ix0, ix0 + 3); sideWall(ix0, 'q', iy0 + 2, iy1 - 1, 2); sideWall(ix1, 'z', iy0 + 3, iy1 - 1, 3); put(row(dX - 1, dX + 1, iy0 + 3, 't'), 'map table'); put([[ix0 + 3, iy0 + 4, 'I']], 'post');
        break;
      }
      case 'store': case 'post': {
        // 倉庫・郵便：奥と脇に棚・木箱の山。郵便は仕分け棚と受付の机
        if (roleBase === 'post') { backWall(iy0, 'K', ix0, ix1); put(row(ix0 + 2, ix0 + 5, iy0 + 3, 'T'), 'sorting counter'); put(row(ix1 - 5, ix1 - 2, iy0 + 3, 'K'), 'sorting rack'); sideWall(ix0, 'z', iy0 + 5, iy1 - 1, 2); }
        else { for (var ys = iy0; ys <= iy1 - 2; ys += 3) { put(row(ix0, ix0 + 2, ys, 'z'), 'crates'); put(row(ix1 - 2, ix1, ys, 'q'), 'barrels'); } }
        break;
      }
      case 'dojo': {
        put([[ix0, iy0, ')'], [ix0 + 1, iy0, ')']], 'weapon rack'); put([[ix1, iy0, ')'], [ix1 - 1, iy0, ')']], 'weapon rack'); put(rug(ix0 + 2, iy0 + 2, Wn - 4, Hn - 4), 'mat'); put([[ix0, iy1, 'q']], 'water'); sideWall(ix1, 'I', iy0 + 2, iy1 - 1, 3);
        break;
      }
      case 'elder': case 'house': default: {
        // 民家：居間（暖炉・敷物・食卓）と寝室（寝台・衣装戸棚）を間仕切りで分ける。台所（かまど・流し・戸棚）。仕事の家は仕事の道具
        var HV = flav.house || 'two';
        if (HV !== 'two' && roleBase === 'house' && !sub) { planHouseVariant(HV); break; }
        var bedLeft = !left; var px = bedLeft ? ix0 + Math.max(4, Math.round(Wn * 0.32)) : ix1 - Math.max(4, Math.round(Wn * 0.32));
        var pDoor = iy0 + Math.max(2, Hn - 3);
        // 寝室の間仕切り（縦）：扉の列とぶつかるなら作らない
        var room2 = false; if (Hn >= 7) { var vs = []; [0, 1, -1, 2, -2].forEach(function (o) { var xx = px + (bedLeft ? o : -o); if (Math.abs(xx - dX) < 2 || xx <= ix0 + 2 || xx >= ix1 - 2) return; [pDoor, pDoor - 1, pDoor - 2, iy0 + 2].forEach(function (dy) { vs.push({ x: xx, t: wallV(xx, iy0, iy1 - 1, dy) }); vs.push({ x: xx, t: wallV(xx, iy0, iy1 - 2, dy) }); }); });
          for (var vi = 0; vi < vs.length && !room2; vi++) if (put(vs[vi].t, 'bedroom wall')) { room2 = true; px = vs[vi].x; } }
        var bx0 = bedLeft ? ix0 : px + 1, bx1 = bedLeft ? px - 1 : ix1;
        var lx0 = bedLeft ? px + 1 : ix0, lx1 = bedLeft ? ix1 : px - 1;
        if (!room2) { bx0 = bedLeft ? ix0 : ix1 - 3; bx1 = bedLeft ? ix0 + 3 : ix1; lx0 = bedLeft ? ix0 + 4 : ix0; lx1 = bedLeft ? ix1 : ix1 - 4; }
        // 寝室
        put([[bx0, iy0, 'E']], 'bed'); if (flav.communal || roleBase === 'elder') put([[bx0 + 2, iy0, 'E']], 'bed'); else put([[bx0 + 1, iy0, '{']], 'nightstand');
        put([[bx1, iy0, '{']], 'wardrobe'); put(rug(bx0, iy0 + 2, Math.min(3, bx1 - bx0 + 1), 2), 'bedroom rug');
        // 台所（居間の奥のすみ）
        var kx = bedLeft ? lx1 : lx0; var ks = bedLeft ? -1 : 1;
        put([[kx, iy0, '^']], 'stove'); put([[kx + ks, iy0, ']']], 'sink'); put([[kx + 2 * ks, iy0, '{']], 'cupboard');
        // 居間：暖炉・食卓・敷物・腰かけ
        var lmx = (lx0 + lx1) >> 1;
        if (flav.hearth) tryAll([[[bedLeft ? lx1 : lx0, iy0 + 3, '(']], [[bedLeft ? lx1 : lx0, iy0 + 4, '(']], [[lmx + 2, iy0, '(']]], 'hearth');
        if (flav.low) put(rug(lmx - 2, iy0 + 3, 4, 3), 'floor rug'); else put(rug(lmx - 1, iy0 + 3, 3, 2), 'rug');
        tryAll([row(lmx - 1, lmx, iy0 + 2, 't'), [[lmx, iy0 + 2, 't']]], 'dining table');
        // 仕事の家（名前から）
        var w0 = bedLeft ? lx1 : lx0, wd = bedLeft ? -1 : 1;
        if (sub === 'tailor') { put([[lmx, iy1 - 1, 't'], [lmx + 1, iy1 - 1, 't']], 'cutting table'); put([[w0, iy1 - 2, 'I']], 'dress form'); put([[w0, iy1 - 4, ')']], 'cloth rack'); }
        else if (sub === 'bakery') { put([[kx + 3 * ks, iy0, '^']], 'oven'); put(row(lmx - 1, lmx + 1, iy1 - 2, 'T'), 'bread counter'); put([[w0, iy1 - 1, 'K']], 'bread shelf'); }
        else if (sub === 'atelier') { put([[w0, iy0 + 5, '}']], 'canvas'); put([[w0 + wd * 2, iy1 - 1, '}']], 'easel'); put([[lmx + 2, iy1 - 2, 't']], 'paint table'); }
        else if (sub === 'scholar' || sub === 'mage' || sub === 'study') { put([[w0, iy0 + 4, 'K']], 'books'); put([[w0, iy0 + 5, 'K']], 'books'); put([[lmx + 2, iy1 - 2, sub === 'mage' ? '*' : 't']], sub === 'mage' ? 'armillary' : 'desk'); put([[w0, iy1 - 1, '?']], 'instrument'); }
        else if (sub === 'florist') { put([[w0, iy1 - 1, 'a']], 'planter'); put([[w0, iy1 - 3, 'a']], 'planter'); put(row(lmx - 1, lmx, iy1 - 2, 'T'), 'flower counter'); }
        else if (sub === 'antique') { sideWall(w0, 'K', iy0 + 3, iy1 - 1, 2); put([[lmx + 2, iy1 - 2, 'z']], 'curio'); put([[lmx - 2, iy1 - 2, 'q']], 'urn'); }
        else if (sub === 'smith' || flav.work) { put([[w0, iy1 - 2, '(']], 'forge'); put([[w0 + wd, iy1 - 2, 'z']], 'anvil'); put([[w0, iy1 - 4, ')']], 'tool rack'); }
        else if (sub === 'engineer') { put([[w0, iy1 - 2, '?']], 'workbench'); put([[w0, iy1 - 3, 'z']], 'parts'); }
        else if (sub === 'fisher' || flav.nets) { put([[w0, iy1 - 2, ')']], 'net rack'); put([[w0, iy1 - 1, 'q']], 'fish barrel'); }
        else { put([[w0, iy1 - 1, 'q']], 'barrel'); put([[w0, iy1 - 3, 'K']], 'shelf'); }
        if (roleBase === 'elder') { put([[lmx + 2, iy0 + 2, 'K']], 'records'); put([[lmx + 3, iy0 + 2, 'K']], 'records'); }
        break;
      }
    }
    if (flav.ruin) {
      // 廃墟：崩れた所（通れない段差）と瓦礫（木箱の山）。床の穴は落ちない（通れないマス）
      var rr = hz; var nr = 0; for (var t = 0; t < 40 && nr < Math.round(Wn * Hn / 14); t++) { rr = (Math.imul(rr, 1103515245) + 12345) >>> 0; var x5 = ix0 + rr % Wn; rr = (Math.imul(rr, 1103515245) + 12345) >>> 0; var y5 = iy0 + rr % Hn; if (put([[x5, y5, t % 3 ? 'z' : '|']], t % 3 ? 'rubble' : 'collapsed floor')) nr++; }
    }
    return finish();

    function finish() {
      var out = str(); var changed = out.some(function (r, i) { return r !== rows0[i]; });
      return { rows: out, changed: changed, placed: placed, pieces: pieces, cleared: cleared, log: log, floor: floor, box: [ix0, iy0, ix1, iy1] };
    }
  }

  function freeNearFor(id) {
    // セーブの立ち位置が、今は家具・壁・人の上のとき：近くの歩けるマスへ。出口から歩いて行けるマスを先に選ぶ（カウンターの奥などに閉じこめない）
    return function (x, y) {
      var def = D[id]; var rows = def.rows; var H = rows.length, W = rows[0].length;
      var busy = {}; [def.npcs, def.chests, def.warps].forEach(function (Lst) { (Lst || []).forEach(function (n) { if (n) busy[n.x + ',' + n.y] = 1; }); });
      var walkT = function (X, Y) { return X >= 0 && Y >= 0 && X < W && Y < H && !solidCh(def, rows[Y][X]); };
      var ok = function (X, Y) { return walkT(X, Y) && !busy[X + ',' + Y]; };
      var reach = {}; var st = []; (def.warps || []).forEach(function (q) { if (q && walkT(q.x, q.y)) { reach[q.x + ',' + q.y] = 1; st.push([q.x, q.y]); } });
      while (st.length) { var c = st.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = c[0] + d[0], ny = c[1] + d[1], k = nx + ',' + ny; if (reach[k] || !walkT(nx, ny)) return; reach[k] = 1; st.push([nx, ny]); }); }
      var hasReach = Object.keys(reach).length > 0;
      if (ok(x, y) && (!hasReach || reach[x + ',' + y])) return { x: x, y: y };
      var seen = {}; var q = [[Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(H - 1, y))]]; seen[q[0][0] + ',' + q[0][1]] = 1; var fallback = null;
      while (q.length) { var a = q.shift(); if (ok(a[0], a[1])) { if (!hasReach || reach[a[0] + ',' + a[1]]) return { x: a[0], y: a[1] }; if (!fallback) fallback = { x: a[0], y: a[1] }; } [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = a[0] + d[0], ny = a[1] + d[1], k = nx + ',' + ny; if (seen[k] || nx < 0 || ny < 0 || nx >= W || ny >= H) return; seen[k] = 1; q.push([nx, ny]); }); }
      return fallback || { x: x, y: y };
    };
  }

  L.info = function (id) { return L.owner[id] ? { town: L.owner[id], role: (L.role[id] || {}).role || null, sub: (L.role[id] || {}).sub || null, layout: L.maps[id] || null, via: L.via[id] || null } : null; };
  L.apply = function () {
    var O = owners(); L.owner = O.own;
    var ids = Object.keys(O.own).sort(function (a, b) { return (O.via[a].depth || 0) - (O.via[b].depth || 0); });
    ids.forEach(function (id) {
      var def = D[id]; var v = O.via[id]; L.via[id] = v.b ? 'building:' + (v.b.id || v.b.type || '') : v.from ? 'from:' + v.from : 'warp';
      var parentRole = v.from && L.role[v.from] ? L.role[v.from].role : null;
      L.role[id] = roleOf(id, def, v.b, parentRole && parentRole.replace(/_up$/, ''));
      var why = null;
      if (EXCLUDE[id]) why = '台本が座標を使う・作り込み済み・専用の部屋'; else if (!def || def.kind !== 'interior') why = '屋内でない'; else if (typeof def.rows === 'function' || !(def.rows && def.rows.length)) why = '行がない・行が関数';
      else if (def.onStep || def.s3121 || def.remake71) why = '仕掛け・物語・作り直し済み'; else if (def.noLayout82) why = 'v8.2 で専用に作った部屋（学院の本校舎など）'; else if (MR.LIST && MR.LIST.indexOf(id) >= 0) why = '作り直したダンジョン'; else if (/^poyo_/.test(id)) why = 'ポヨ村の作り込んだ部屋';
      else if (/^castle/.test(L.role[id].role)) why = '城（別の作り方）'; else if (MR.maps[id] && MR.maps[id].kind !== 'interior76') why = 'ほかの作り直しの地図';
      else if (def.rows[0].length > 30 || def.rows.length > 20) why = '大きい部屋（専用の作り方）';
      if (why) { L.skipped[id] = why; return; }
      try {
        var flav = FLAVOR[O.own[id]] || {};
        var r = plan(id, def, { role: L.role[id].role, sub: L.role[id].sub, town: O.own[id] }, flav);
        if (!r) { L.skipped[id] = '部屋の形が合わない'; return; }
        if (r.fail) { L.skipped[id] = '元の部屋で行けない所がある（' + r.fail + '）'; return; }
        if (!r.changed) { L.skipped[id] = '変わらない'; return; }
        var old = def.rows; def.rows = r.rows;
        def._l82 = { version: L.VERSION, town: O.own[id], role: L.role[id].role, sub: L.role[id].sub, placed: r.placed, pieces: r.pieces, cleared: r.cleared, log: r.log, old: old };
        L.maps[id] = def._l82;
        var prev = MR.maps[id]; var Wd = r.rows[0].length, Hd = r.rows.length; var ident = function (x, y) { return { x: x, y: y }; };
        MR.maps[id] = { version: (prev ? prev.version + '+' : '') + 'l82.' + L.VERSION, oldW: prev ? prev.oldW : Wd, oldH: prev ? prev.oldH : Hd, newW: Wd, newH: Hd,
          mapPos: prev ? prev.mapPos : ident, mapBack: prev ? prev.mapBack : ident, prev: prev || { version: undefined }, fromPrev: ident, backPrev: ident, freeNear: freeNearFor(id), kind: prev ? prev.kind : 'layout82', layout82: true };
      } catch (e) { L.errors.push(id + '：' + (e && e.message)); }
    });
  };
  L.apply();
})(typeof window !== 'undefined' ? window : globalThis);
