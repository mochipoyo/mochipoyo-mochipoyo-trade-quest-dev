/* =========================================================
   Data / v7.2 町・城を広げる・2階3階を足す（ポヨ村のあとの、すべての町・城）
   ・町（24）：東に新しい地区（22列）を足す。元の地図の座標は変えない（東の外周の2マスを道にして、つなぐだけ）
     新しい地区：南北の大通り・噴水の広場（街灯・ベンチ・花壇）・塔（3階まで）・家（2階まで）・集会所や工房（1階）・露店・庭・木
     リヴェル城下町は、東の出口（職人通りへ）を新しい地区の東の端へ移し、城の前に堀と跳ね橋・赤い絨毯の道・柱を足す
     港町マリナは、東の外周が「歩いて出られる」区間（EdgeExit）なので、新しい地区の東も開けたまま。南は海のまま
   ・2階：それぞれの町の宿屋などの屋内（2つまで）に上り階段を1マス足し、新しい2階の部屋をつなぐ
     （階段を置くのは、上の壁ぎわの空いた床。置いても部屋の中の行ける所が減らないことを確かめてから）
   ・城：リヴェル城 3階 → 4階の屋上（物見台）／リヴェル城 2階 → 王立図書室／魔導王宮 2階 → 3階（天文の間）／王宮 西棟（2階）→ 3階
   ・どれも 2D・3D 共通（3D は汎用の町・屋内の組み立て。塔は 3D でも塔の形）
   ・作る前の中身は def._pre71 に控える（テストで元と比べるため。ゲームでは使わない）
   ========================================================= */
(function (root) {
  'use strict';
  var MAPS = root.MAP_DEFS; if (!MAPS || root.EXPAND72) return;
  var X = root.EXPAND72 = { towns: {}, maps: [], stairs: [], skipped: [] };
  var TL = function () { return root.Tiles; };
  var cl = function (L) { return (L || []).map(function (o) { return o && typeof o === 'object' ? Object.assign({}, o) : o; }); };
  function pre(d) { if (!d._pre71) d._pre71 = { rows: d.rows.slice(), warps: cl(d.warps), events: cl(d.events), chests: cl(d.chests), npcs: cl(d.npcs), buildings: cl(d.buildings) }; }
  function solidCh(def, c) { var n = TL().byChar[c] || def.fallback || 'grass'; return TL().isSolid(n); }
  function add(def) { def.v72 = true; MAPS[def.id] = def; X.maps.push(def.id); return def; }
  function say(name, lines) { return async function (c) { await c.say(name, lines); }; }
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o[k] !== undefined ? o[k] : m; }); }

  /* ---------- テーマごとの言葉と形 ---------- */
  var TH = {
    royal: { dist: '東の新市街', tower: '見張りの塔', sight: '城の尖塔と、城壁の外に広がる畑と森が見える', house: '騎士の家', craft: '剣の手入れ', hall: ['guild', '騎士の詰所'], hallLine: '詰所では、毎朝その日の見回りの道を決める。決めた道を、決めたとおりに歩く。それが守りの基本だ。', stall: '焼きたてのパン', fl: '_' },
    forest: { dist: '東の森のはずれ', tower: '樹上の見張り台', sight: '森の木々の海と、遠くの山なみが見える', house: '木こりの家', craft: '薪割り', hall: ['tavern', '狩人の小屋'], hallLine: '獣の通り道は、足あとを3つ見つけてから信じる。1つだけでは、たまたまかもしれんからな。', stall: '木の実と干し肉', fl: '_' },
    harbor: { dist: '東の桟橋通り', tower: '小さな灯台', sight: '水平線と、行き交う船の帆が見える', house: '網元の家', craft: '網のつくろい', hall: ['tavern', '船乗りの酒場'], hallLine: '風が変わったら、帆を張りかえる。昨日の風のまま進もうとする船は、沖で立ち往生するのさ。', stall: '朝とれの魚', fl: '_' },
    mine: { dist: '東の坑夫通り', tower: '立坑のやぐら', sight: '掘り出された岩山と、坑道へ続くトロッコの線路が見える', house: '坑夫の長屋', craft: '鉱石の選り分け', hall: ['tavern', '坑夫の休み処'], hallLine: '鉱脈は、深く掘るほど当たるわけじゃない。外れたと分かったら、早めに別の場所を掘るのが坑夫の知恵だ。', stall: 'ランプ油と弁当', fl: '_' },
    bureau: { dist: '東の官庁街', tower: '記録の塔', sight: '整然と並んだ役所の屋根と、まっすぐな大通りが見える', house: '書記官の家', craft: '帳簿の書き写し', hall: ['bank', '公文書館'], hallLine: '記録は、うまくいったことより、うまくいかなかったことを残す方が役に立つ。', stall: 'インクと紙', fl: ':' },
    ruins: { dist: '東の焼け跡', tower: '崩れかけた塔', sight: '灰に埋もれた町並みと、静かな海が見える', house: '空き家', craft: 'がれきの片づけ', hall: ['tavern', '寄り合い所'], hallLine: '壊れたものを数えるより、残ったものを数える方が、明日のためになる。', stall: '拾い集めた古道具', fl: '_' },
    clock: { dist: '東の歯車通り', tower: '小さな時計塔', sight: '鐘楼と、時を刻む大小の歯車の屋根が見える', house: '時計職人の家', craft: '歯車の調整', hall: ['dojo', '時計工房'], hallLine: '時計は、速すぎても遅すぎてもいけない。決まった刻みで、同じように進む。それがいちばん難しい。', stall: 'ぜんまいと歯車', fl: ':' },
    machine: { dist: '東の工区', tower: '観測塔', sight: '煙突とパイプの森、遠くの演算塔が見える', house: '技師の家', craft: '配管の点検', hall: ['dojo', '整備工場'], hallLine: '機械は、壊れる前に小さな音を出す。その音を聞きのがさないことが、いちばんの整備だ。', stall: 'ねじと部品', fl: ':' },
    arcane: { dist: '東の魔導小路', tower: '魔導の塔', sight: '魔力の灯が並ぶ街路と、王宮の青い屋根が見える', house: '魔導士の家', craft: '魔法陣の描き直し', hall: ['bank', '魔導書の書庫'], hallLine: '呪文は、唱える順番を一つまちがえるだけで別のものになる。手順を守ることが、いちばんの魔力だ。', stall: '魔力の結晶', fl: ':' },
    sky: { dist: '東の星見広場', tower: '星見台', sight: '雲の切れ間と、満天の星が見える', house: '天文家の家', craft: '星図の書き写し', hall: ['tavern', '旅人の天幕'], hallLine: '星は毎晩少しずつ位置を変える。一晩だけ見て決めつけると、道をまちがえる。', stall: '星砂のお守り', fl: '_' },
    dark: { dist: '東の陣地', tower: '物見やぐら', sight: '黒い荒野と、遠くにそびえる魔王城の影が見える', house: '兵士の宿舎', craft: '武具の手入れ', hall: ['dojo', '作戦室'], hallLine: '退くことを決めておかない作戦は、作戦とは呼ばない。', stall: '携帯食', fl: '_' },
    desert: { dist: '東の隊商宿通り', tower: '物見やぐら', sight: 'どこまでも続く砂の海と、オアシスの緑が見える', house: '隊商の家', craft: '水袋の修理', hall: ['tavern', '隊商宿'], hallLine: '砂漠では、水を半分使ったら引き返す。行きと同じだけ、帰りにも水がいるからね。', stall: 'なつめやしと香辛料', fl: ':' },
    forge: { dist: '東の鍛冶通り', tower: '火の見やぐら', sight: '赤く光る火山と、立ちのぼる炉の煙が見える', house: '鍛冶師の家', craft: '刃の焼き入れ', hall: ['dojo', '鍛冶の工房'], hallLine: '鉄は熱いうちに打て、というが、熱すぎても割れる。ちょうどいい色を待つのが職人だ。', stall: '炭と砥石', fl: ':' },
    frost: { dist: '東の雪見通り', tower: '氷の見張り塔', sight: '白く凍った港と、雪をかぶった山なみが見える', house: '漁師の家', craft: '氷切り', hall: ['tavern', '暖炉の集会所'], hallLine: '氷の上を歩くときは、一歩ずつ確かめる。急いだ者から落ちていくんだ。', stall: '熱いスープ', fl: '_' },
    casino: { dist: '東の歓楽通り', tower: '展望タワー', sight: 'きらめく看板と、夜通し灯る劇場の明かりが見える', house: '踊り子の家', craft: '衣装のつくろい', hall: ['tavern', '小さな劇場'], hallLine: '舞台では、勝ち続ける役より、負けても笑って退場できる役の方がむずかしい。', stall: '甘い菓子', fl: ':' },
    academy: { dist: '東の学生街', tower: '天文塔', sight: '学院の尖塔と、図書館の大きな屋根が見える', house: '学生寮', craft: 'レポートの清書', hall: ['bank', '学生の自習室'], hallLine: '分からない問題に印をつけておく。印の数が減っていくのが、いちばんの成績表さ。', stall: '古本', fl: '_' },
    tech: { dist: '東のテック街', tower: '展望塔', sight: '高層ビルの谷間と、相場の大画面が見える', house: 'エンジニアの家', craft: 'プログラムの修正', hall: ['bank', 'トレーダーの研究室'], hallLine: '検証していない手法は、ただの思いつきだ。過去の値動きで試してから、少しだけ本番で使う。', stall: '携帯食と充電器', fl: ':' }
  };
  // 町（物語のおおよその順）。宝箱の中身の強さに使う
  var LIST = ['rivel_town', 'rivel_artisan', 'dow_village', 'harbor_town', 'verum_town', 'kalion_city', 'erased_village', 'sentra_capital', 'aruna_village', 'aruna_ruins', 'tempus_city', 'node_city', 'scheduled_district',
    'magicka_city', 'tradia', 'luxbell', 'volatilia', 'star_camp', 'dark_camp', 'sahar_city', 'mirror_market', 'ignas_town', 'ciel_port', 'frost_town'];
  X.LIST = LIST;
  var TIER = [['potion', 2, 200], ['ether', 2, 400], ['hi_potion', 2, 700], ['hi_ether', 2, 1000], ['phoenix_feather', 1, 1500]];
  function tier(i) { return TIER[Math.min(TIER.length - 1, Math.floor(i / 5))]; }

  /* ---------- 屋内の部屋（12×9。出入口は下の真ん中 (5,8)、町から入ると (5,7)） ---------- */
  function room(fl, lines) { return lines.map(function (r) { return r.replace(/_/g, fl); }); }
  var R = {
    house1: ['############', '#KK__t____<#', '#__________#', '#_tt_______#', '#__________#', '#q________z#', '#__________#', '#__________#', '#####D######'],
    house2: ['############', '#E_E______>#', '#__________#', '#_______KK_#', '#__________#', '#_tt_______#', '#__________#', '#q_______E_#', '############'],
    tower1: ['############', '#K____t___<#', '#__________#', '#_t____zz__#', '#__________#', '#q________q#', '#__________#', '#__________#', '#####D######'],
    tower2: ['############', '#_________>#', '#__________#', '#_KK____KK_#', '#__________#', '#____tt____#', '#__________#', '#<_________#', '############'],
    tower3: ['############', '#__________#', '#__________#', '#__________#', '#____tt____#', '#__________#', '#__________#', '#>_________#', '############'],
    hall: ['############', '#KK_KK_KK__#', '#__________#', '#_tt____tt_#', '#__________#', '#_tt____tt_#', '#__________#', '#__________#', '#####D######'],
    up_inn: ['############', '#__________#', '#E__E__E__E#', '#__________#', '#__________#', '#E__E__E__E#', '#__________#', '#__________#', '############'],
    up_store: ['############', '#zz__qq__zz#', '#__________#', '#_zz____qq_#', '#__________#', '#__________#', '#q________z#', '#__________#', '############'],
    up_study: ['############', '#KKKK__KKKK#', '#__________#', '#_tt____tt_#', '#__________#', '#__________#', '#_KK____KK_#', '#__________#', '############'],
    roof: ['############', '#__________#', '#_a______a_#', '#__________#', '#____tt____#', '#__________#', '#_a______a_#', '#__________#', '############']
  };
  function setCh(rows, x, y, ch) { var r = rows[y].split(''); r[x] = ch; rows[y] = r.join(''); }

  /* ---------- 2階を足す（既存の屋内・城）：上の壁ぎわの空いた床に「上り階段」を置き、新しい部屋をつなぐ ---------- */
  function reachCount(def, rows, from, block) {
    var H = rows.length, W = rows[0].length, seen = {}, q = [from], n = 0; seen[from[0] + ',' + from[1]] = 1;
    var bad = {}; (def.events || []).forEach(function (e) { if (e && e.solid) bad[e.x + ',' + e.y] = 1; }); (def.chests || []).forEach(function (c) { bad[c.x + ',' + c.y] = 1; }); if (block) bad[block] = 1;
    while (q.length) { var p = q.shift(); n++; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var x = p[0] + d[0], y = p[1] + d[1], k = x + ',' + y; if (seen[k] || x < 0 || y < 0 || x >= W || y >= H || bad[k] || solidCh(def, rows[y][x])) return; seen[k] = 1; q.push([x, y]); }); }
    return { n: n, seen: seen };
  }
  function busyAt(def, x, y) { return (def.events || []).some(function (e) { return e.x === x && e.y === y; }) || (def.warps || []).some(function (w) { return w.x === x && w.y === y; }) || (def.chests || []).some(function (c) { return c.x === x && c.y === y; }) || (def.npcs || []).some(function (n) { return n.x === x && n.y === y; }); }
  // 戻り値：{ x, y }（階段のマス）または null
  function placeStairs(def, multi) {
    if (!def || typeof def.rows === 'function' || def.onStep || def.s3121 || def.v72 || def.v71) return null;
    var rows = def.rows; if (!multi && rows.join('').indexOf('<') >= 0) return null;
    var H = rows.length, W = rows[0].length;
    var entry = null; (def.warps || []).some(function (w) { var ys = [w.y - 1, w.y + 1], xs = [w.x]; return ys.some(function (y) { if (y >= 0 && y < H && !solidCh(def, rows[y][w.x])) { entry = [w.x, y]; return true; } return false; }); });
    if (!entry) return null;
    var base = reachCount(def, rows, entry);
    for (var yy0 = 1; yy0 <= 3; yy0++) for (var x = W - 2; x >= 1; x--) {
      var y = yy0, ch = rows[y][x]; if (solidCh(def, ch) || '<>@D'.indexOf(ch) >= 0 || busyAt(def, x, y) || busyAt(def, x, y + 1) || !solidCh(def, rows[y - 1][x])) continue;
      if (solidCh(def, rows[y + 1][x]) || !base.seen[x + ',' + y]) continue;
      var r2 = reachCount(def, rows, entry, x + ',' + y); if (r2.n !== base.n - 1 || !r2.seen[x + ',' + (y + 1)]) continue;
      return { x: x, y: y };
    }
    return null;
  }
  function addUpstairs(id, up, name, opt) {
    var d = MAPS[id]; var s = placeStairs(d, opt && opt.multi); if (!s) { X.skipped.push(id); return null; }
    pre(d); setCh(d.rows, s.x, s.y, '<'); d.warps = (d.warps || []).concat([{ x: s.x, y: s.y, to: up.id, tx: Math.min(s.x, 10), ty: 2, name: name || '上の階へ', v72: true }]);
    var rows = room(opt.fl || '_', R[opt.room] || R.up_store); var ux = Math.min(s.x, 10); setCh(rows, ux, 1, '>');
    up.rows = rows; up.kind = 'interior'; up.bgm = d.bgm || 'town'; up.warps = [{ x: ux, y: 1, to: id, tx: s.x, ty: s.y + 1, name: (d.name || '') + 'へ' }].concat(up.warps || []);
    add(up); X.stairs.push({ from: id, to: up.id, x: s.x, y: s.y }); return s;
  }

  /* ---------- 町の東に新しい地区を足す ---------- */
  function mostWalkable(def, rows, pref) {
    var cnt = {}; rows.forEach(function (r) { for (var i = 0; i < r.length; i++) { var c = r[i]; if (!solidCh(def, c) && '<>@DObdw'.indexOf(c) < 0) cnt[c] = (cnt[c] || 0) + 1; } });
    var best = null, bn = -1; Object.keys(cnt).forEach(function (c) { if (pref && pref.indexOf(c) < 0) return; if (cnt[c] > bn) { bn = cnt[c]; best = c; } }); return best;
  }
  function expandTown(id, idx, opt) {
    var d = MAPS[id]; if (!d || typeof d.rows === 'function' || d.s3121) return null; opt = opt || {};
    var P = root.PLACE_DECOR; var key = (P && P.forMap(id)) || 'royal'; var th = TH[key] || TH.royal;
    var rows = d.rows, H = rows.length, W = rows[0].length, ADD = 22, A0 = 10;   // 大通りは新しい地区の 10・11 列
    var hEff = opt.hEff || H;
    pre(d);
    var G = mostWalkable(d, rows) || '.'; var ROAD = mostWalkable(d, rows, 'rP'.replace(G, '')) || (G === 'P' ? 'r' : 'P');
    var east = {}; rows.forEach(function (r) { var c = r[W - 1]; east[c] = (east[c] || 0) + 1; }); var B = opt.B || Object.keys(east).filter(function (c) { return solidCh(d, c); }).sort(function (a, b) { return east[b] - east[a]; })[0] || 'f';
    var g = rows.map(function (r) { return (r + new Array(ADD + 1).join(G)).split(''); });
    var NW = W + ADD;
    function set(x, y, ch) { if (x >= 0 && y >= 0 && x < NW && y < H) g[y][x] = ch; }
    function fill(x0, y0, x1, y1, ch) { for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) set(x, y, ch); }
    var L = function (c) { return W + c; };
    // 外周
    for (var c = 0; c < ADD; c++) { set(L(c), 0, B); set(L(c), H - 1, B); }
    for (var y = 0; y < H; y++) set(L(ADD - 1), y, B);
    if (opt.openEast) for (y = opt.openEast[0]; y <= opt.openEast[1]; y++) set(L(ADD - 1), y, G);
    if (hEff < H) { fill(L(0), hEff, L(ADD - 1), H - 1, '~'); }
    // 元の町とつなぐ所（2マス）：元の東の外周のひとつ内側が歩けて、元の町の中で行ける所
    var bl = {}; (d.buildings || []).forEach(function (b) { for (var yy = b.y; yy < b.y + (b.h || 3); yy++) for (var xx = b.x; xx < b.x + (b.w || 5); xx++) bl[xx + ',' + yy] = 1; });
    var gm = null; try { gm = new root.GameMap(d); } catch (e) { gm = null; }
    var startP = null; if (gm) { (d.warps || []).some(function (w) { var cand = [[w.x, w.y - 1], [w.x, w.y + 1], [w.x - 1, w.y], [w.x + 1, w.y]]; return cand.some(function (p) { if (p[0] >= 0 && p[1] >= 0 && p[0] < W && p[1] < H && !TL().isSolid(gm.tiles[p[1]][p[0]])) { startP = p; return true; } return false; }); }); }
    var reach = {}; if (gm && startP) { var q = [startP]; reach[startP[0] + ',' + startP[1]] = 1; while (q.length) { var p = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (dd) { var nx = p[0] + dd[0], ny = p[1] + dd[1], k = nx + ',' + ny; if (reach[k] || nx < 0 || ny < 0 || nx >= W || ny >= H || TL().isSolid(gm.tiles[ny][nx])) return; reach[k] = 1; q.push([nx, ny]); }); } }
    var small = hEff < 18; var PH = small ? 1 : 2;   // 小さな町（星見塔の野営地など）は広場を低く
    var yc = small ? hEff - 4 : Math.max(12, Math.floor(hEff / 2)); if (!small && yc + 2 > hEff - 3) yc = hEff - 5;
    var lotRows = {}; [2, 3, 4, 5, 6, 7].forEach(function (r) { lotRows[r] = 1; });
    var open = opt.open || null;
    if (!open) {
      var cands = []; for (y = 8; y < hEff - 3; y++) cands.push(y); cands.sort(function (a, b) { return Math.abs(a - yc) - Math.abs(b - yc); });
      open = cands.filter(function (yy) { return [yy, yy + 1].every(function (r) { return reach[(W - 2) + ',' + r] && !bl[(W - 2) + ',' + r] && !bl[(W - 1) + ',' + r]; }); })[0];
    }
    var carve = [];
    if (open === undefined || open === null) {   // 東の外周の内側が森などで厚いとき：森・木・茂み・柵を西へ掘って、元の町の歩ける所までつなぐ（建物は掘らない。8マスまで）
      cands.some(function (yy) { var ok = [yy, yy + 1].every(function (r) { for (var k = 2; k <= 9; k++) { var xx = W - k; if (bl[xx + ',' + r]) return false; if (reach[xx + ',' + r]) return true; if (!/[Ff6Zx]/.test(rows[r][xx])) return false; } return false; });
        if (!ok) return false; open = yy; [yy, yy + 1].forEach(function (r) { for (var k = 2; k <= 9 && !reach[(W - k) + ',' + r]; k++) { g[r][W - k] = ROAD; carve.push([W - k, r]); } }); return true; });
    }
    if (open === undefined || open === null) { X.skipped.push(id); return null; }
    [open, open + 1].forEach(function (r) { set(W - 1, r, ROAD); });
    // 道：つなぐ道（元の町 → 大通り）・南北の大通り
    [open, open + 1].forEach(function (r) { fill(L(0), r, L(opt.throughEast ? ADD - 1 : A0), r, ROAD); });
    fill(L(A0), 2, L(A0 + 1), hEff - 3, ROAD);
    // 広場と噴水
    fill(L(A0 - 3), yc - PH, L(A0 + 4), yc + PH, 'P'); set(L(A0), yc, 'Q'); set(L(A0 + 1), yc, 'Q');
    [[A0 - 3, yc - PH], [A0 + 4, yc - PH], [A0 - 3, yc + PH], [A0 + 4, yc + PH]].forEach(function (p) { set(L(p[0]), p[1], 'e'); });
    [[A0 - 4, yc - PH - 1], [A0 + 5, yc - PH - 1], [A0 - 4, yc + PH + 1], [A0 + 5, yc + PH + 1]].forEach(function (p) { if (p[1] > 0 && p[1] < hEff - 1) set(L(p[0]), p[1], 'y'); });
    // 区画（建物）。扉は下向き。扉の下から大通りまで小道
    var lots = []; var nb = (d.buildings || []).length;
    function lot(b, laneRow, laneTo) {
      var ok = true; for (var yy = b.y; yy < b.y + b.h; yy++) for (var xx = b.x; xx < b.x + b.w; xx++) { if (g[yy][xx] !== G) ok = false; }
      if (!ok || laneRow >= hEff - 1) return false;
      var dx = b.x + b.doorX; for (var xx2 = Math.min(dx, laneTo); xx2 <= Math.max(dx, laneTo); xx2++) set(xx2, laneRow, ROAD);
      for (var yy2 = b.y; yy2 < b.y + b.h; yy2++) for (var xx3 = b.x; xx3 < b.x + b.w; xx3++) g[yy2][xx3] = '_';   // 建物の下（描画は建物）
      lots.push(b); return true;
    }
    var tid = id.replace(/[^a-z0-9]/g, '');
    var tw = { id: 'x72_tower', type: 'watchtower', name: th.tower, x: L(14), y: 2, w: 6, h: 6, doorX: 2, interior: id + '_x72_tower', entry: { x: 5, y: 7 }, v72: true };
    var hs = { id: 'x72_house', type: 'house', name: th.house, x: L(1), y: 2, w: 7, h: 5, doorX: 3, interior: id + '_x72_house', entry: { x: 5, y: 7 }, v72: true };
    var hl = { id: 'x72_hall', type: th.hall[0], name: th.hall[1], x: L(1), y: yc + 4, w: 8, h: 5, doorX: 3, interior: id + '_x72_hall', entry: { x: 5, y: 7 }, v72: true };
    var okT = lot(tw, 8, L(A0 + 1)), okH = lot(hs, 7, L(A0 - 1)), okL = (yc + 9 <= hEff - 2) && lot(hl, yc + 9, L(A0 - 1));
    // 大きな町は、さらに建物（空いている区画だけ）：花屋・仕立て屋・パン屋・古道具屋・画家のアトリエ・学者の家（2階つきもある）
    var EX = [
      { name: '花屋', sprite: 'villager_f', two: false, line: '花は、咲く時期を待つしかない。水をやりすぎても、早くは咲かないのよ。' },
      { name: '仕立て屋', sprite: 'villager_f', two: true, line: '布は、はさみを入れる前に二度測る。切ってしまったら、もう元には戻らないからね。' },
      { name: 'パン屋', sprite: 'villager_m', two: false, line: '生地は寝かせる時間が大事なんだ。待てない日は、たいていうまく焼けない。' },
      { name: '古道具屋', sprite: 'merchant', two: true, line: '古い道具には、使った人のくせが残っている。うまくいった使い方も、失敗した使い方もね。' },
      { name: '画家のアトリエ', sprite: 'scholar', two: true, line: '絵は、近くで描いて、遠くから見る。近くだけ見ていると、全体の形がゆがんでしまうんだ。' },
      { name: '学者の家', sprite: 'scholar', two: false, line: '同じ実験を何度もくり返して、同じ結果が出たときだけ、それを「分かった」と呼ぶのだよ。' }
    ];
    var exLots = [[13, 10, 15], [1, 9, 14], [13, yc + 4, yc + 9], [1, yc + 12, yc + 17], [13, yc + 12, yc + 17], [1, yc + 20, yc + 25], [13, yc + 20, yc + 25]];
    var exOk = [];
    if (hEff >= 30) exLots.forEach(function (q, i) {
      if (exOk.length >= EX.length || q[2] > hEff - 2 || q[1] < 9) return; var ex = EX[(exOk.length + idx) % EX.length];
      var bx = { id: 'x72_ex' + i, type: 'house', name: ex.name, x: L(q[0]), y: q[1], w: 7, h: 5, doorX: 3, interior: id + '_x72_ex' + i, entry: { x: 5, y: 7 }, v72: true };
      if (lot(bx, q[2], q[0] < A0 ? L(A0 - 1) : L(A0 + 1))) exOk.push([bx, ex]);
    });
    // 東南の庭（花壇・木・井戸・露店）
    var RURAL = { forest: 1, ruins: 1, frost: 1, sky: 1, dark: 1, harbor: 1, mine: 1, desert: 1 };
    for (y = yc + 4; y <= hEff - 3; y++) for (c = 13; c <= 20; c++) { if (g[y][L(c)] !== G) continue; var hh = ((c * 7 + y * 13) % 11); if (hh === 0) set(L(c), y, RURAL[key] ? 'f' : '6'); else if ((hh === 3 || hh === 6) && c > 13) set(L(c), y, 'a'); }
    if (yc + 6 < hEff - 2 && g[yc + 6][L(16)] === G) { set(L(16), yc + 6, 'j'); }
    // 大通り沿いの街灯・露店・樽・木箱
    for (y = 3; y < hEff - 3; y += 6) { if (g[y][L(A0 - 1)] === G) set(L(A0 - 1), y, 'y'); if (g[y + 3] && g[y + 3][L(A0 + 2)] === G) set(L(A0 + 2), y + 3, 'y'); }
    [[A0 - 2, yc - 4], [A0 - 2, yc + 4]].forEach(function (p) { if (g[p[1]] && g[p[1]][L(p[0])] === G) set(L(p[0]), p[1], 'A'); });
    [[8, 2], [9, 2], [20, 9], [20, 10]].forEach(function (p) { if (g[p[1]] && g[p[1]][L(p[0])] === G) set(L(p[0]), p[1], (p[0] + p[1]) % 2 ? 'q' : 'z'); });
    // 木（外周の内側。道・建物のそばは避ける）
    for (y = 1; y < hEff - 1; y++) for (c = 1; c < ADD - 1; c++) { if (g[y][L(c)] !== G) continue; var near = false; for (var dy = -1; dy <= 1 && !near; dy++) for (var dx2 = -1; dx2 <= 1 && !near; dx2++) { var ch2 = g[y + dy] && g[y + dy][L(c) + dx2]; if (ch2 === ROAD || ch2 === 'P' || ch2 === '_') near = true; } if (near) continue; var hz = (c * 5 + y * 3) % 23; if (RURAL[key]) { if (hz % 3 === 0) set(L(c), y, 'f'); } else if (hz === 0) set(L(c), y, '6'); else if (hz === 7 || hz === 15) set(L(c), y, 'a'); }   // 町なかは小さな木と花壇、村・森は木
    d.rows = g.map(function (r) { return r.join(''); });
    // 出口（リヴェル：東の出口を新しい地区の東の端へ）
    if (opt.moveEastExits) {
      var moved = d.warps.filter(function (w) { return w.x === W - 1; });
      d.warps = d.warps.filter(function (w) { return w.x !== W - 1; }).concat(moved.map(function (w) { return Object.assign({}, w, { x: NW - 1, v72: true }); }));
      moved.forEach(function (w) { set(NW - 1, w.y, ROAD); }); d.rows = g.map(function (r) { return r.join(''); });
    }
    d.buildings = (d.buildings || []).concat(lots);
    // 人
    var o = { town: d.name, dist: th.dist, tower: th.tower, sight: th.sight, house: th.house, craft: th.craft, stall: th.stall, hall: th.hall[1] };
    var np = [
      { id: tid + '_x72_kid', x: L(A0 - 2), y: yc + 1, sprite: 'child', dir: 'right', wander: 1, talk: say('子ども', [fmt('{dist}の{tower}、てっぺんまで登ったことある？　{town}がぜんぶ見えるんだよ！', o), '下から見ると大きな建物も、上から見ると小さな四角なんだって。']) },
      { id: tid + '_x72_vendor', x: L(A0 - 2), y: yc - 3, sprite: 'merchant', dir: 'down', wander: 0, talk: say('露店の主人', [fmt('{stall}はいかが。……と言いたいところだけど、今日は品出しの日でね。', o), '値段は毎日ちがう。きのうの値段だけ見て決めると、たいてい損をするのさ。']) },
      { id: tid + '_x72_elder', x: L(A0 + 3), y: yc + 1, sprite: 'elder', dir: 'left', wander: 0, talk: say('町の古老', [fmt('この{dist}も、昔はただの空き地だった。少しずつ家が建って、今の形になった。', o), '町も相場も、一日では変わらん。けれど一年たてば、見ちがえるほど変わる。']) }
    ];
    np.forEach(function (n) { n.v72 = true; }); d.npcs = (d.npcs || []).concat(np.filter(function (n) { return !solidCh(d, d.rows[n.y][n.x]); }));
    d.events = (d.events || []).concat([{ x: L(A0 - 1), y: yc, type: 'inspect', solid: false, v72: true, text: [fmt('【{dist}】', o), fmt('{town}の東に新しくできた地区。噴水の広場を中心に、{tower}・{house}・{hall}がある。', o)] }]);
    // 屋内
    var tr = tier(idx); var fl = th.fl;
    if (okT) {
      add({ id: tw.interior, name: th.tower + ' 1階', rows: room(fl, R.tower1), kind: 'interior', bgm: 'town', warps: [{ x: 5, y: 8, to: id, tx: tw.x + tw.doorX, ty: tw.y + tw.h }, { x: 10, y: 1, to: tw.interior + '_2f', tx: 10, ty: 2, name: '2階へ' }],
        npcs: [{ id: tid + '_x72_tkeeper', x: 3, y: 4, sprite: 'guard', dir: 'down', wander: 0, talk: say('塔の番人', [fmt('{tower}は3階まであるぞ。上の階からは{sight}。', o), '高い所から見ると、道の先がよく分かる。相場でいえば「上位足」を見るのと同じだな。']) }] });
      add({ id: tw.interior + '_2f', name: th.tower + ' 2階', rows: room(fl, R.tower2), kind: 'interior', bgm: 'town', warps: [{ x: 10, y: 1, to: tw.interior, tx: 9, ty: 1, name: '1階へ' }, { x: 1, y: 7, to: tw.interior + '_3f', tx: 2, ty: 7, name: '3階へ' }],
        events: [{ x: 5, y: 5, type: 'inspect', solid: true, text: [fmt('{tower}の記録帳だ。', o), '「晴れ。風は西。町に異常なし」――毎日同じことが、ていねいに書かれている。'] }] });
      add({ id: tw.interior + '_3f', name: th.tower + ' 3階（てっぺん）', rows: room(fl, R.tower3), kind: 'interior', bgm: 'town', warps: [{ x: 1, y: 7, to: tw.interior + '_2f', tx: 2, ty: 7, name: '2階へ' }],
        chests: [{ id: 'x72_' + tid + '_t', x: 10, y: 1, item: tr[0], qty: tr[1] }],
        npcs: [{ id: tid + '_x72_lookout', x: 8, y: 3, sprite: 'scholar', dir: 'left', wander: 0, talk: say('見晴らし番', [fmt('ここからは{sight}。', o), '近くで見るとばらばらの道も、上から見ると一本の流れになっている。']) }],
        events: [{ x: 5, y: 4, type: 'inspect', solid: true, text: ['望遠鏡をのぞいた。', fmt('{sight}。', o), '高い所から見ると、どの道がどこへつながっているか、ひと目で分かる。'] }] });
    }
    if (okH) {
      add({ id: hs.interior, name: th.house, rows: room(fl, R.house1), kind: 'interior', bgm: 'town', warps: [{ x: 5, y: 8, to: id, tx: hs.x + hs.doorX, ty: hs.y + hs.h }, { x: 10, y: 1, to: hs.interior + '_2f', tx: 10, ty: 2, name: '2階へ' }],
        npcs: [{ id: tid + '_x72_resident', x: 4, y: 4, sprite: 'villager_f', dir: 'down', wander: 1, talk: say(th.house + 'の人', [fmt('{house}へようこそ。2階は家族の寝室よ。', o), fmt('{craft}の仕事は、毎日同じことの繰り返し。でも、その繰り返しが腕になるの。', o)]) }] });
      add({ id: hs.interior + '_2f', name: th.house + ' 2階', rows: room(fl, R.house2), kind: 'interior', bgm: 'town', warps: [{ x: 10, y: 1, to: hs.interior, tx: 9, ty: 1, name: '1階へ' }],
        chests: [{ id: 'x72_' + tid + '_h', x: 1, y: 3, gold: tr[2] }],
        events: [{ x: 8, y: 3, type: 'inspect', solid: true, text: ['本棚に、使いこんだ日記が並んでいる。', '「今日うまくいったこと」「今日うまくいかなかったこと」――毎日、2行ずつだけ書いてある。'] }] });
    }
    if (okL) {
      add({ id: hl.interior, name: th.hall[1], rows: room(fl, R.hall), kind: 'interior', bgm: 'town', warps: [{ x: 5, y: 8, to: id, tx: hl.x + hl.doorX, ty: hl.y + hl.h }],
        npcs: [{ id: tid + '_x72_host', x: 5, y: 2, sprite: key === 'harbor' || key === 'casino' || key === 'forest' || key === 'mine' ? 'bartender' : 'scholar', dir: 'down', wander: 0, talk: say(th.hall[1] + 'の人', [fmt('{hall}へようこそ。', o), th.hallLine]) }],
        events: [{ x: 1, y: 1, type: 'inspect', solid: true, text: ['棚の古い記録を読んだ。', th.hallLine] }] });
    }
    exOk.forEach(function (pr, k) {
      var bx = pr[0], ex = pr[1]; var nid = tid + '_x72_ex' + k;
      add({ id: bx.interior, name: ex.name, rows: room(fl, ex.two ? R.house1 : R.hall), kind: 'interior', bgm: 'town', warps: [{ x: 5, y: 8, to: id, tx: bx.x + bx.doorX, ty: bx.y + bx.h }].concat(ex.two ? [{ x: 10, y: 1, to: bx.interior + '_2f', tx: 10, ty: 2, name: '2階へ' }] : []),
        npcs: [{ id: nid, x: 4, y: 4, sprite: ex.sprite, dir: 'down', wander: 0, talk: say(ex.name + 'の人', [fmt('{town}の' + ex.name + 'へようこそ。', o), ex.line]) }] });
      if (ex.two) add({ id: bx.interior + '_2f', name: ex.name + ' 2階', rows: room(fl, R.house2), kind: 'interior', bgm: 'town', warps: [{ x: 10, y: 1, to: bx.interior, tx: 9, ty: 1, name: '1階へ' }],
        events: [{ x: 8, y: 3, type: 'inspect', solid: true, text: [ex.name + 'の2階の本棚。', '仕事の記録が、日付の順にきちんと並んでいる。'] }] });
    });
    X.towns[id] = { oldW: W, w: NW, open: open, carve: carve, extra: exOk.length, tower: okT, house: okH, hall: okL, theme: key };
    return X.towns[id];
  }

  /* ---------- リヴェル城下町：城の前の堀と跳ね橋・赤い絨毯の道・柱 ---------- */
  function rivelFront() {
    var d = MAPS.rivel_town; if (!d) return; pre(d);
    var g = d.rows.map(function (r) { return r.split(''); }); var changed = [];
    var busy = function (x, y) { return busyAt(d, x, y); };
    for (var y = 13; y <= 14; y++) for (var x = 18; x <= 45; x++) { if (busy(x, y)) continue; g[y][x] = (x >= 30 && x <= 33) ? 'b' : '~'; changed.push([x, y]); }
    [[29, 15], [34, 15], [29, 12], [34, 12]].forEach(function (p) { if (!busy(p[0], p[1]) && g[p[1]][p[0]] === '=') { g[p[1]][p[0]] = 'I'; changed.push(p); } });
    for (y = 15; y <= 19; y++) for (x = 30; x <= 33; x++) { if (g[y][x] === 'r' && !busy(x, y)) { g[y][x] = 'p'; changed.push([x, y]); } }
    [[27, 16], [36, 16]].forEach(function (p) { if (!busy(p[0], p[1]) && g[p[1]][p[0]] === '=') { g[p[1]][p[0]] = 'y'; changed.push(p); } });
    d.rows = g.map(function (r) { return r.join(''); }); X.rivelFront = changed;
  }

  // ---- 実行：リヴェルの城の前 → 町の東の地区 → 2階 → 城
  try { rivelFront(); } catch (e) { if (root.console) console.error('expand72 rivel', e); }
  LIST.forEach(function (id, i) {
    var opt = {};
    if (id === 'rivel_town') opt = { open: 20, throughEast: true, moveEastExits: true };
    if (id === 'harbor_town') opt = { hEff: 28, openEast: [1, 27], B: 'f' };   // 東の外周（1〜27行）は歩いて出られる区間（js/rpg/edgeexit.js）
    try { expandTown(id, i, opt); } catch (e) { X.skipped.push(id); if (root.console) console.error('expand72', id, e); }
  });
  // リヴェルの職人通りから戻る所：新しい東の端のとなりへ
  (function () { var a = MAPS.rivel_artisan, t = X.towns.rivel_town; if (!a || !t) return; pre(a); a.warps = a.warps.map(function (w) { return (w.to === 'rivel_town' && w.tx === t.oldW - 2) ? Object.assign({}, w, { tx: t.w - 2, v72: true }) : w; }); })();
  // 既存の屋内に2階（町ごとに2つまで：宿屋・酒場・家・教会・ギルドの順）
  var KIND = { inn: ['up_inn', '客室'], tavern: ['up_store', '倉庫'], house: ['up_study', '2階'], elder: ['up_study', '2階'], church: ['up_study', '鐘楼の下の部屋'], guild: ['up_study', '資料室'], bank: ['up_study', '金庫番の部屋'], item: ['up_store', '倉庫'] };
  var ORDER = ['inn', 'tavern', 'house', 'elder', 'church', 'guild', 'bank', 'item'];
  LIST.forEach(function (tid) {
    var t = MAPS[tid]; if (!t) return; var th = TH[(root.PLACE_DECOR && root.PLACE_DECOR.forMap(tid)) || 'royal'] || TH.royal; var n = 0;
    var bs = (t.buildings || []).filter(function (b) { return b.interior && !b.v72 && MAPS[b.interior] && KIND[b.type || 'house']; });
    bs.sort(function (a, b) { return ORDER.indexOf(a.type || 'house') - ORDER.indexOf(b.type || 'house'); });
    bs.forEach(function (b) {
      if (n >= 2) return; var k = KIND[b.type || 'house']; var base = MAPS[b.interior];
      var s = addUpstairs(b.interior, { id: b.interior + '_x72_2f', name: (base.name || b.name) + ' 2階', npcs: [], events: [{ x: 5, y: 4, type: 'inspect', solid: false, text: [(base.name || b.name) + 'の2階。' + k[1] + 'になっている。', '窓から、' + t.name + 'の通りが見える。'] }] }, '2階へ', { fl: th.fl, room: k[0] });
      if (s) n++;
    });
  });
  // 城
  addUpstairs('rivel_castle_3f', { id: 'rivel_castle_4f', name: 'リヴェル城 屋上（物見台）', npcs: [{ id: 'x72_rivel_roof_guard', x: 3, y: 4, sprite: 'royal_guard', dir: 'down', wander: 0, talk: say('物見台の兵士', ['ここはリヴェル城でいちばん高い所だ。', '城下町の東に新しい市街ができたのが、ここからよく見えるぞ。']) }],
    events: [{ x: 5, y: 4, type: 'inspect', solid: true, text: ['望遠鏡をのぞいた。', '城の堀と跳ね橋、碁盤の目のような城下町、その先に広がる平原と森が見える。'] }], chests: [{ id: 'x72_rivel_roof', x: 10, y: 7, item: 'ether', qty: 2 }] }, '屋上へ', { fl: ':', room: 'roof' });
  addUpstairs('rivel_castle_2f', { id: 'rivel_castle_library', name: 'リヴェル城 王立図書室', npcs: [{ id: 'x72_rivel_librarian', x: 3, y: 4, sprite: 'scholar', dir: 'down', wander: 0, talk: say('王立図書室の司書', ['ここには、リヴェル王国の歴代の記録がそろっている。', '豊作の年も、不作の年も、同じ厚さで書かれている。良い年だけ覚えている王は、国をあやうくするからな。']) }],
    events: [{ x: 8, y: 1, type: 'inspect', solid: true, text: ['『リヴェル王国 年代記』', '「均衡のクリスタルが曇った年、王は城の倉を開き、民と同じ量の麦を食べた」'] }] }, '王立図書室へ', { fl: ':', room: 'up_study', multi: true });
  addUpstairs('magicka_palace_2f', { id: 'magicka_palace_3f', name: '魔導王宮 3階（天文の間）', npcs: [{ id: 'x72_magicka_astro', x: 3, y: 4, sprite: 'scholar', dir: 'down', wander: 0, talk: say('宮廷の天文官', ['星の動きにも、相場の動きにも、くり返す形がある。', 'ただし、まったく同じ形は二度と来ない。だから形を覚えるのではなく、形の「読み方」を覚えるのだ。']) }],
    events: [{ x: 5, y: 4, type: 'inspect', solid: true, text: ['天球儀だ。星の通り道が、細い金の線で刻まれている。'] }], chests: [{ id: 'x72_magicka_3f', x: 10, y: 7, item: 'hi_ether', qty: 1 }] }, '3階へ', { fl: ':', room: 'up_study' });
  addUpstairs('sentra_palace_west', { id: 'sentra_palace_west_3f', name: '王宮 西棟 3階', npcs: [{ id: 'x72_sentra_clerk', x: 3, y: 4, sprite: 'scholar', dir: 'down', wander: 0, talk: say('王宮の記録係', ['この階には、税の記録の写しが保管されている。', '数字は正直だ。ただし、どの数字を見せるかを選ぶのは人間だ。']) }],
    events: [{ x: 8, y: 1, type: 'inspect', solid: true, text: ['古い税の台帳の写しが並んでいる。', '豊かな地区と貧しい地区の欄が、同じ大きさで並んでいる。'] }] }, '3階へ', { fl: ':', room: 'up_study' });
})(typeof window !== 'undefined' ? window : globalThis);
