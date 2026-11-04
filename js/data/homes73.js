/* =========================================================
   Data / v7.3 家の台所とトイレ（町ごとのテーマに合わせる）
   ・各町の「家」の屋内（家・長老の家・寮・新しい地区の家）に、東の壁の向こうへ3列の小部屋（台所とトイレ）を足す＝家の中を広くする
     元の部屋の座標は変えない（東の外壁の2マスを通り口にするだけ）。台所：食器棚・かまど・流し（上の壁ぎわ）。トイレ：下の隅（仕切りの壁つき）
   ・2D の見た目は js/core/tiles.js（stove / sink / cupboard / toilet）、3D は three-src/src/world/Furniture73.js（テーマで材料と色が変わる）
   ・かまど・流し・トイレは「調べる」と、町のテーマに合わせた一言
   ・作る前の中身は def._pre71 に控える（テストで元と比べるため。ゲームでは使わない）
   ========================================================= */
(function (root) {
  'use strict';
  var MAPS = root.MAP_DEFS; if (!MAPS || root.HOMES73) return;
  var X = root.HOMES73 = { homes: [], skipped: [] };
  var TL = function () { return root.Tiles; };
  var cl = function (L) { return (L || []).map(function (o) { return o && typeof o === 'object' ? Object.assign({}, o) : o; }); };
  function pre(d) { if (!d._pre71) d._pre71 = { rows: d.rows.slice(), warps: cl(d.warps), events: cl(d.events), chests: cl(d.chests), npcs: cl(d.npcs), buildings: cl(d.buildings) }; }
  function solidCh(def, c) { var n = TL().byChar[c] || def.fallback || 'grass'; return TL().isSolid(n); }
  function busyAt(def, x, y) { return (def.events || []).some(function (e) { return e.x === x && e.y === y; }) || (def.warps || []).some(function (w) { return w.x === x && w.y === y; }) || (def.chests || []).some(function (c) { return c.x === x && c.y === y; }) || (def.npcs || []).some(function (n) { return n.x === x && n.y === y; }); }
  var FOOD = { royal: '野菜と肉のシチュー', forest: 'きのこのスープ', harbor: '魚のあら汁', mine: '豆と芋の煮込み', bureau: '野菜のスープ', ruins: '薄いおかゆ', clock: 'ポトフ', machine: '缶詰のスープ', arcane: '香草のスープ', sky: '星見だんご', dark: '干し肉の煮込み', desert: '香辛料の煮込み', forge: '鉄鍋の焼き飯', frost: '熱いボルシチ', casino: 'チーズの鍋', academy: '学生カレー', tech: '温めるだけの総菜', pastoral: '野菜たっぷりのポトフ', temple: '麦のおかゆ', library: '野菜のスープ', sea: '海藻のスープ', cave: 'きのこのスープ' };
  var TOILET = { tech: '自動で流れるトイレだ。ボタンがたくさんあって、どれを押せばいいか迷う。', machine: '配管がむき出しのトイレだ。ゴボゴボと元気な音がする。', casino: '金色の便座のトイレだ。……落ち着かない。', desert: '素焼きのつぼのような便器だ。水を大切に使うように、と張り紙がある。', frost: '便座に毛皮のカバーがついている。冬でも冷たくない工夫だ。', royal: '白い陶器のトイレだ。ていねいに磨かれている。' };
  function themeOf(id) { var P = root.PLACE_DECOR; return (P && P.forMap && P.forMap(id)) || 'pastoral'; }
  function addWing(id) {
    var d = MAPS[id]; if (!d || typeof d.rows === 'function' || d.s3121 || d.v73home) return null;
    var rows = d.rows, H = rows.length, W = rows[0].length; if (H < 7) return null;
    var wallCh = rows[0][W - 1]; for (var y = 0; y < H; y++) { var c = rows[y][W - 1]; if (!solidCh(d, c) || c === 'D' || busyAt(d, W - 1, y)) return null; }
    // 通り口（2マス）：東の壁のすぐ内側が歩けて、何も置いていない行。部屋の真ん中に近い所
    var cands = []; for (y = 2; y < H - 3; y++) cands.push(y); var mid = Math.floor(H / 2); cands.sort(function (a, b) { return Math.abs(a - mid) - Math.abs(b - mid); });
    var open = cands.filter(function (yy) { return [yy, yy + 1].every(function (r) { return !solidCh(d, rows[r][W - 2]) && !busyAt(d, W - 2, r) && '<>@D'.indexOf(rows[r][W - 2]) < 0; }); })[0];
    if (open === undefined) return null;
    var fl = rows[open][W - 2]; if (solidCh(d, fl)) fl = '_';
    pre(d);
    var out = rows.map(function (r, yy) {
      var a = r.slice(0, W - 1).split('');
      var part = (yy === open || yy === open + 1) ? fl : wallCh;                // 元の東の壁（通り口だけ開ける）
      var w3 = [fl, fl, fl];
      if (yy === 0 || yy === H - 1) w3 = [wallCh, wallCh, wallCh];
      else if (yy === 1) w3 = ['{', '^', ']'];                                   // 食器棚・かまど・流し
      else if (yy === H - 3) w3 = [fl, fl, 'W'];                                 // トイレの仕切り
      else if (yy === H - 2) w3 = [fl, fl, '['];                                 // トイレ
      return a.concat([part], w3, [wallCh]).join('');
    });
    d.rows = out; d.v73home = true;
    var k = themeOf(id); var food = FOOD[k] || FOOD.pastoral;
    if (/空き家|荒れ/.test(d.name || '') || k === 'ruins') {   // 人の住んでいない家・廃墟の家
      d.events = (d.events || []).concat([
        { x: W + 1, y: 1, type: 'inspect', solid: true, v73: true, text: ['かまどは冷えきっている。灰の上に、ほこりが積もっている。'] },
        { x: W + 2, y: 1, type: 'inspect', solid: true, v73: true, text: ['流しだ。蛇口をひねっても、水は出ない。'] },
        { x: W, y: 1, type: 'inspect', solid: true, v73: true, text: ['食器棚だ。欠けたお皿が一枚だけ残っている。'] },
        { x: W + 2, y: H - 2, type: 'inspect', solid: true, v73: true, text: ['古いトイレだ。……使わないでおこう。'] }
      ]);
      X.homes.push({ id: id, oldW: W, open: open, empty: true }); return true;
    }
    d.events = (d.events || []).concat([
      { x: W + 1, y: 1, type: 'inspect', solid: true, v73: true, text: ['かまどで鍋がことこと煮えている。', food + 'のいい匂いがする。'] },
      { x: W + 2, y: 1, type: 'inspect', solid: true, v73: true, text: ['流しだ。洗ったお皿が、きちんと伏せて並べてある。'] },
      { x: W, y: 1, type: 'inspect', solid: true, v73: true, text: ['食器棚だ。家族の人数分のお皿と、少しのお酒のびんが並んでいる。'] },
      { x: W + 2, y: H - 2, type: 'inspect', solid: true, v73: true, text: [TOILET[k] || 'トイレだ。きれいに掃除されている。'] }
    ]);
    X.homes.push({ id: id, oldW: W, open: open }); return true;
  }
  // 家を選ぶ：町の建物の種類が house・elder の屋内、名前・ID が家・寮・住まいのもの、v7.2 の新しい地区の家と2階つきの店（1階）
  var seen = {};
  Object.keys(MAPS).forEach(function (tid) {
    var t = MAPS[tid]; if (!t || (t.kind || 'town') !== 'town' || t.region || t.s3121) return;
    (t.buildings || []).forEach(function (b) {
      if (!b.interior || seen[b.interior]) return; var dd = MAPS[b.interior]; if (!dd || dd.kind !== 'interior') return;
      // 名前で決める（建物の type はどの建物も house のことがあるので使わない）。店・工房・アトリエ・事務所・天幕などは入れない
      var nm = dd.name || '';
      var isHome = /家$|家（|寮$|宿舎$|長屋$|屋敷$|の館$|居住|下宿$|小屋$|号棟$/.test(nm) && !/水車小屋|アトリエ|天幕/.test(nm) && !/_2f$|_3f$|_inn$/.test(b.interior);
      if (!isHome) return; seen[b.interior] = 1;
      try { if (!addWing(b.interior)) X.skipped.push(b.interior); } catch (e) { X.skipped.push(b.interior); if (root.console) console.error('homes73', b.interior, e); }
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
