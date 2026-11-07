/* =========================================================
   Data / v8.2 ボラティリティア学院の本校舎（玄関ホール・大階段・上下の回廊・大食堂・教室・実習室・大図書館・寮の談話室・学院長室・観測室へ、建物の中を歩いて行ける）
   ・依頼（2026-11-07 14:39）：「重複せず巨大学校の本校舎を増設・再構築：中庭を囲む本校舎・左右翼棟・塔・渡り廊下；玄関ホール・大階段・上下回廊・大食堂・
     複数教室・実習室・大図書館・寮/談話室・学院長室・観測室へ到達可能。既存 vol_*・講義・研究・NPC・クエスト・地下維持；新ホール・食堂は新 ID；実際に移動できる階段」
   ・新しい地図（新 ID）：vol_main_hall（玄関ホールと大階段）・vol_west_gallery（西翼の回廊）・vol_east_gallery（東翼の回廊）・vol_upper_gallery（上の回廊。ホールを見下ろす）・
     vol_great_hall（大食堂）・vol_classroom2（第二教室）
   ・本館（va_main）の扉 → 玄関ホール。学院長室（vol_dean）は上の回廊の奥（学院長室の扉は上の回廊へ）
   ・これまでの部屋（講義室・古代文明研究室・大図書館・量子物理研究室・意識研究所・研究者の居住区・天文観測室）は、町への扉はそのまま。回廊へ戻る扉を横の壁に 1 つ足す
     （中の人・出来事・宝箱・地下への階段は変えない。足す扉は、人・出来事のないマスの横の壁）
   ・階段：玄関ホールの大階段（2 マス）⇄ 上の回廊の下り階段。上の回廊の塔の階段 → 天文観測室（観測室からも戻れる）
   ・学院の町の地図（行・座標）は変えない（本校舎の大きさは 3D の外観で見せる：three-src/src/world/Academy82.js）
   ・ほかの作品の校章・寮名・人物は持ち込まない（学院の徽章は天球の目盛りと子午線）
   ========================================================= */
(function (root) {
  'use strict';
  var D = root.MAP_DEFS, TL = root.Tiles; if (!D || !TL || !D.volatilia || !D.vol_dean) return;
  var A82 = root.Academy82 = { maps: {}, returns: {}, errors: [] };
  function grid(W, H, fill) { var g = []; for (var y = 0; y < H; y++) { g.push([]); for (var x = 0; x < W; x++) g[y].push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '#' : fill); } return g; }
  function rows(g) { return g.map(function (r) { return r.join(''); }); }
  var say = function (name, lines) { return async function (c) { await c.say(name, lines); }; };
  try {
    var deanExit = (D.vol_dean.warps || []).filter(function (q) { return q.to === 'volatilia'; })[0] || { tx: 20, ty: 9 };   // 本館の扉の前（町の旧座標。MapRemake が今の座標へ写す）
    // ---------- 玄関ホール（30×18）：南の大扉、真ん中の大階段（上の回廊へ）、北の扉（大食堂）、西・東の扉（翼の回廊）
    var H1 = grid(30, 18, ':'); H1[17][14] = 'D'; H1[17][15] = 'D'; H1[0][14] = 'D'; H1[0][15] = 'D'; H1[9][0] = 'D'; H1[9][29] = 'D';
    for (var y = 8; y < 17; y++) { H1[y][14] = 'p'; H1[y][15] = 'p'; }
    H1[6][14] = '<'; H1[6][15] = '<'; for (var y1 = 4; y1 <= 7; y1++) { H1[y1][12] = 'I'; H1[y1][17] = 'I'; } H1[7][13] = ':'; H1[7][16] = ':';   // 大階段と両わきの手すりの柱
    [3, 6, 12, 15].forEach(function (yy) { H1[yy][5] = 'I'; H1[yy][24] = 'I'; });
    H1[1][3] = '}'; H1[1][26] = '}'; H1[1][1] = 'K'; H1[1][28] = 'K'; H1[1][2] = 'K'; H1[1][27] = 'K'; H1[4][9] = '*'; H1[4][20] = '*';
    H1[14][2] = 'e'; H1[14][3] = 'e'; H1[14][26] = 'e'; H1[14][27] = 'e'; H1[16][1] = 'a'; H1[16][28] = 'a'; H1[11][9] = 't'; H1[11][20] = 't';
    D.vol_main_hall = { id: 'vol_main_hall', name: '学院本校舎・玄関ホール', kind: 'interior', bgm: 'town', rows: rows(H1), noLayout82: true, academy82: 'hall',
      warps: [{ x: 14, y: 17, to: 'volatilia', tx: deanExit.tx, ty: deanExit.ty, name: '中庭へ' }, { x: 15, y: 17, to: 'volatilia', tx: deanExit.tx, ty: deanExit.ty, name: '中庭へ' },
        { x: 14, y: 6, to: 'vol_upper_gallery', tx: 14, ty: 9, raw: true, name: '大階段（上の回廊へ）' }, { x: 15, y: 6, to: 'vol_upper_gallery', tx: 15, ty: 9, raw: true, name: '大階段（上の回廊へ）' },
        { x: 14, y: 0, to: 'vol_great_hall', tx: 13, ty: 14, raw: true, name: '大食堂へ' }, { x: 15, y: 0, to: 'vol_great_hall', tx: 14, ty: 14, raw: true, name: '大食堂へ' },
        { x: 0, y: 9, to: 'vol_west_gallery', tx: 30, ty: 4, raw: true, name: '西翼の回廊へ' }, { x: 29, y: 9, to: 'vol_east_gallery', tx: 1, ty: 4, raw: true, name: '東翼の回廊へ' }],
      npcs: [{ id: 'va82_porter', x: 10, y: 13, sprite: 'scholar', dir: 'down', wander: 0, talk: say('玄関ホールの案内係', ['ようこそ、ボラティリティア学院の本校舎へ。', '大階段を上がると上の回廊。奥が学院長室、塔の階段の先が天文観測室。', '西翼は講義室・第二教室・古代文明研究室、東翼は大図書館・量子物理研究室・意識研究所。北の扉は大食堂だ。']) },
        { id: 'va82_student_h', x: 22, y: 10, sprite: 'scholar', dir: 'left', wander: 1, talk: say('学院生', ['この大階段、毎朝ここで遅刻しそうな人が一段飛ばしするんだ。', '天井の光は、浮かせた灯り。星の観測の邪魔にならない色なんだって。']) }],
      chests: [], events: [{ x: 9, y: 4, type: 'inspect', solid: true, text: ['小さな天球儀。輪の目盛りは天の赤道・黄道・子午線――学院の徽章と同じ形だ。'] }, { x: 26, y: 1, type: 'inspect', solid: true, text: ['星図の掲示。「今月の観測：月の出は東翼の窓から」と書いてある。'] }] };
    // ---------- 西翼・東翼の回廊（32×9）：北の壁の扉が 3 つ。ホール側の扉
    function gallery(id, name, hallSide, rooms, npc) {
      var G = grid(32, 9, ':'); var hx = hallSide === 'east' ? 31 : 0; G[4][hx] = 'D';
      rooms.forEach(function (r) { G[0][r.x] = 'D'; }); for (var x = 3; x < 29; x += 4) { G[7][x] = 'I'; } G[1][1] = 'K'; G[1][30] = 'K'; G[3][hallSide === 'east' ? 1 : 30] = 'a';
      [10, 21].forEach(function (x) { G[1][x] = '}'; }); G[6][9] = 'e'; G[6][10] = 'e'; G[6][21] = 'e'; G[6][22] = 'e';
      D[id] = { id: id, name: name, kind: 'interior', bgm: 'town', rows: rows(G), noLayout82: true, academy82: 'gallery',
        warps: [{ x: hx, y: 4, to: 'vol_main_hall', tx: hallSide === 'east' ? 1 : 28, ty: 9, raw: true, name: '玄関ホールへ' }].concat(rooms.map(function (r) { return { x: r.x, y: 0, to: r.to, tx: r.tx, ty: r.ty, raw: true, name: r.name }; })),
        npcs: npc ? [npc] : [], chests: [], events: [] };
    }
    // 回廊から部屋へ：着く所は、部屋に足す「回廊へ戻る扉」の内側（下で決める）。いったん仮の値
    gallery('vol_west_gallery', '学院本校舎・西翼の回廊', 'east', [{ x: 6, to: 'vol_lecture', name: '講義室' }, { x: 16, to: 'vol_classroom2', name: '第二教室' }, { x: 26, to: 'vol_ancient', name: '古代文明研究室（実習室）' }],
      { id: 'va82_student_w', x: 13, y: 5, sprite: 'scholar', dir: 'down', wander: 1, talk: say('学院生', ['西翼は授業の棟。講義室と第二教室、いちばん奥が古代文明研究室の実習。', '次の授業の板書、もう消されてた……。']) });
    gallery('vol_east_gallery', '学院本校舎・東翼の回廊', 'west', [{ x: 6, to: 'vol_library', name: '大図書館' }, { x: 16, to: 'vol_quantum', name: '量子物理研究室（実習室）' }, { x: 26, to: 'vol_mind', name: '意識研究所' }],
      { id: 'va82_student_e', x: 18, y: 5, sprite: 'scholar', dir: 'down', wander: 1, talk: say('研究生', ['東翼は研究の棟。大図書館の書庫は、この回廊からも入れる。', '量子物理研究室の実習は、器具の片付けまでが授業だよ。']) });
    // ---------- 上の回廊（30×12）：ホールを見下ろす欄干（柱の列）、下り階段、学院長室・塔の階段（観測室）・研究者の居住区（寮の談話室）
    var U = grid(30, 12, ':'); U[10][14] = '>'; U[10][15] = '>'; U[0][5] = 'D'; U[0][24] = 'D'; U[1][14] = '<'; U[1][15] = '<';
    for (var x2 = 2; x2 <= 27; x2++) if (x2 < 12 || x2 > 17) U[7][x2] = 'I';   // 欄干（ホールの吹き抜けを見下ろす）
    U[1][1] = 'K'; U[1][28] = 'K'; U[1][9] = '}'; U[1][20] = '}'; U[3][2] = 'e'; U[3][27] = 'e'; U[4][12] = '*';
    D.vol_upper_gallery = { id: 'vol_upper_gallery', name: '学院本校舎・上の回廊', kind: 'interior', bgm: 'town', rows: rows(U), noLayout82: true, academy82: 'upper',
      warps: [{ x: 14, y: 10, to: 'vol_main_hall', tx: 14, ty: 7, raw: true, name: '大階段（玄関ホールへ）' }, { x: 15, y: 10, to: 'vol_main_hall', tx: 15, ty: 7, raw: true, name: '大階段（玄関ホールへ）' },
        { x: 5, y: 0, to: 'vol_dean', name: '学院長室' }, { x: 24, y: 0, to: 'vol_dorm', name: '研究者の居住区（談話室）' }, { x: 14, y: 1, to: 'vol_observatory', name: '塔の階段（天文観測室へ）' }, { x: 15, y: 1, to: 'vol_observatory', name: '塔の階段（天文観測室へ）' }],
      npcs: [{ id: 'va82_tutor', x: 22, y: 4, sprite: 'scholar', dir: 'down', wander: 0, talk: say('学院の講師', ['この欄干から、玄関ホールの大階段が見下ろせる。', '学院長室は西の奥。塔の階段を上れば天文観測室。東の扉は研究者の居住区――談話室で議論が絶えない場所さ。']) }], chests: [], events: [] };
    // ---------- 大食堂（28×16）：長机の列・配膳台・暖炉・南の扉（玄関ホールへ）
    var Gh = grid(28, 16, ':'); Gh[15][13] = 'D'; Gh[15][14] = 'D';
    [4, 7, 10].forEach(function (yy) { for (var x = 3; x <= 11; x++) Gh[yy][x] = 't'; for (var x3 = 16; x3 <= 24; x3++) Gh[yy][x3] = 't'; });
    for (var x4 = 9; x4 <= 18; x4++) Gh[1][x4] = 'T'; Gh[1][2] = '{'; Gh[1][25] = '{'; Gh[7][0] = '#'; Gh[6][1] = '('; Gh[6][26] = '('; Gh[13][1] = 'q'; Gh[13][26] = 'q'; Gh[1][1] = 'K'; Gh[1][26] = 'K';
    for (var y5 = 12; y5 < 15; y5++) { Gh[y5][13] = 'p'; Gh[y5][14] = 'p'; }
    D.vol_great_hall = { id: 'vol_great_hall', name: '学院本校舎・大食堂', kind: 'interior', bgm: 'town', rows: rows(Gh), noLayout82: true, academy82: 'dining',
      warps: [{ x: 13, y: 15, to: 'vol_main_hall', tx: 14, ty: 1, raw: true, name: '玄関ホールへ' }, { x: 14, y: 15, to: 'vol_main_hall', tx: 15, ty: 1, raw: true, name: '玄関ホールへ' }],
      npcs: [{ id: 'va82_cook', x: 13, y: 0 + 2, sprite: 'merchant', dir: 'down', wander: 0, talk: say('食堂の料理人', ['今日の献立は、豆の煮込みと黒パン。観測当番の分は、夜まで取っておくよ。', '長机は学年ごとじゃない。ここでは誰とでも同じ机で食べる決まりさ。']) },
        { id: 'va82_diner1', x: 7, y: 5, sprite: 'scholar', dir: 'up', wander: 0, talk: say('学院生', ['統計の課題、食べながらだと頭に入らない……でも食べないと頭が回らない。']) },
        { id: 'va82_diner2', x: 20, y: 8, sprite: 'scholar', dir: 'up', wander: 0, talk: say('研究生', ['相場の授業で、勝ち負けより「なぜそう判断したか」を書けって言われたんだ。']) }], chests: [], events: [] };
    // ---------- 第二教室（16×11）：机の列・黒板・教壇
    var Cl = grid(16, 11, '_'); Cl[10][7] = 'D'; for (var x5 = 5; x5 <= 10; x5++) Cl[1][x5] = '}'; Cl[2][7] = 'T'; Cl[2][8] = 'T';
    [4, 6, 8].forEach(function (yy) { [2, 3, 5, 6, 9, 10, 12, 13].forEach(function (x) { Cl[yy][x] = 't'; }); }); Cl[1][1] = 'K'; Cl[1][14] = 'K'; Cl[5][14] = '*';
    D.vol_classroom2 = { id: 'vol_classroom2', name: '学院本校舎・第二教室', kind: 'interior', bgm: 'town', rows: rows(Cl), noLayout82: true, academy82: 'class',
      warps: [{ x: 7, y: 10, to: 'vol_west_gallery', tx: 16, ty: 1, raw: true, name: '西翼の回廊へ' }],
      npcs: [{ id: 'va82_teacher', x: 8, y: 1 + 1, sprite: 'scholar', dir: 'down', wander: 0, talk: say('統計の講師', ['今日は「平均」と「ばらつき」。一回の勝ちより、何回もくり返したときの形を見るんだ。', '黒板の点の散らばりを、目で数えてごらん。']) }], chests: [], events: [] };
    D.vol_classroom2.npcs[0].y = 3;
    // ---------- 回廊へ戻る扉を、これまでの部屋の横の壁に足す（人・出来事・宝箱・ワープのないマスのとなり）
    function addReturn(roomId, galleryId, gx, gy) {
      var d = D[roomId]; if (!d || !Array.isArray(d.rows)) return null; var R = d.rows.map(function (r) { return r.split(''); }); var Hh = R.length, Ww = R[0].length;
      var busy = {}; [d.npcs, d.events, d.chests, d.warps].forEach(function (L) { (L || []).forEach(function (o) { if (o && typeof o.x === 'number') busy[o.x + ',' + o.y] = 1; }); });
      var floor = function (x, y) { var n = TL.byChar[R[y][x]]; return n && !TL.isSolid(n) && !busy[x + ',' + y] && 'D<>'.indexOf(R[y][x]) < 0; };
      var best = null;
      for (var y = 2; y < Hh - 2; y++) [[0, 1], [Ww - 1, Ww - 2]].forEach(function (s) { if (R[y][s[0]] !== '#' || !floor(s[1], y)) return; var sc = Math.abs(y - Hh / 2) - ((floor(s[1], y - 1) && floor(s[1], y + 1)) ? 100 : 0); if (!best || sc < best.sc) best = { x: s[0], y: y, ix: s[1], sc: sc }; });
      if (!best) return null;
      R[best.y][best.x] = 'D'; d.rows = R.map(function (r) { return r.join(''); });
      d.warps = (d.warps || []).concat([{ x: best.x, y: best.y, to: galleryId, tx: gx, ty: gy || 1, raw: true, name: '本校舎の回廊へ', a82: true }]);
      A82.returns[roomId] = { door: [best.x, best.y], inside: [best.ix, best.y], to: galleryId };
      return { x: best.ix, y: best.y };
    }
    var link = function (galleryId, roomId) { var g = D[galleryId]; var ws = g.warps.filter(function (q) { return q.to === roomId; }); if (!ws.length) return; var at = addReturn(roomId, galleryId, ws[0].x, ws[0].y + 1); if (at) ws.forEach(function (w) { w.tx = at.x; w.ty = at.y; }); else A82.errors.push(roomId + '：戻る扉を置けない'); };
    link('vol_west_gallery', 'vol_lecture'); link('vol_west_gallery', 'vol_ancient'); link('vol_east_gallery', 'vol_library'); link('vol_east_gallery', 'vol_quantum'); link('vol_east_gallery', 'vol_mind');
    link('vol_upper_gallery', 'vol_dorm'); link('vol_upper_gallery', 'vol_observatory');
    // 第二教室（新しい部屋）：回廊の扉の内側
    (function () { var w = D.vol_west_gallery.warps.filter(function (q) { return q.to === 'vol_classroom2'; })[0]; w.tx = 7; w.ty = 9; })();
    // 学院長室：扉は上の回廊へ（町へは出ない）。上の回廊から入ると、学院長室の扉の内側
    (function () { var d = D.vol_dean; var ex = (d.warps || []).filter(function (q) { return q.to === 'volatilia'; }); ex.forEach(function (q) { q.to = 'vol_upper_gallery'; q.tx = 5; q.ty = 1; q.raw = true; q.name = '上の回廊へ'; q.a82 = true; });
      var w = D.vol_upper_gallery.warps.filter(function (q) { return q.to === 'vol_dean'; })[0]; if (ex[0]) { w.tx = ex[0].x; w.ty = ex[0].y - 1; w.raw = true; } })();
    // 本館（va_main）の扉 → 玄関ホール（南の大扉の内側）
    (D.volatilia.buildings || []).forEach(function (b) { if (b.id === 'va_main') { A82.mainOld = { interior: b.interior, entry: b.entry }; b.interior = 'vol_main_hall'; b.entry = { x: 14, y: 15 }; b.name = '学院本校舎（玄関ホール）'; b.academy82 = 'main'; } });
    ['vol_main_hall', 'vol_west_gallery', 'vol_east_gallery', 'vol_upper_gallery', 'vol_great_hall', 'vol_classroom2'].forEach(function (id) { A82.maps[id] = { w: D[id].rows[0].length, h: D[id].rows.length }; });
  } catch (e) { A82.errors.push(String(e && e.message || e)); }
})(typeof window !== 'undefined' ? window : globalThis);
