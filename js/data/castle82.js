/* =========================================================
   Data / v8.2 城郭区画（城下町の北 → 城門・参道・前庭 → 大きな城）
   ・依頼（2026-11-07 14:39）：「リヴェル城・セントラ王宮・魔導王宮は城下町北側の道から別の城郭区画へ → 城門・参道・前庭 → 大きな城」
     「城門前の新地図は新 ID、既存屋内 ID 残す、旧入口・旧セーブの到着先変換」「既存階層・玉座・会話・戦闘・地下・宝箱・フラグ維持」
   ・新しい地図：rivel_castle_approach・sentra_palace_approach・magicka_palace_approach（種類は町。城の中の部屋はこの区画に属する）
   ・城下町の側：これまでの城の建物（北の端）は「城門（楼門）」になる。扉の先は城郭区画の南の門の内側（3D は楼門の形。js/three-src の Castle82.buildGate82）
     城下町の地図（行・座標）は変えない（作り直しの版も変えない）＝城下町のセーブ・物語の台本の座標はそのまま
   ・城の 1 階の出口：城下町ではなく、城郭区画の城の正面の扉の前へ。城郭区画の南の門から城下町へ戻ると、前と同じ城下町の城（楼門）の扉の前（旧座標のまま渡す＝MapRemake が今の座標へ写す。二重に写さない）
   ・城の正面の幅：城下町の城の建物の約 2.5〜4 倍（リヴェル 20→52・セントラ 12→44・マクディア 10→36）。人・扉・家具の大きさは変えない
   ・セーブ：城の中・城下町のセーブはそのまま。城郭区画は新しい地図（前のセーブにはない）
   ========================================================= */
(function (root) {
  'use strict';
  var D = root.MAP_DEFS; if (!D) return;
  var C82 = root.Castle82 = { list: {}, errors: [] };
  // town：城下町・bid：城の建物の id・castle：城の 1 階・style：3D の形・cw/cd：城の幅・奥行き（マス）・W/H：区画の大きさ
  var LIST = [
    { id: 'rivel_castle_approach', name: 'リヴェル城・城郭（参道と前庭）', town: 'rivel_town', bid: 'castle', castle: 'rivel_castle', style: 'rivel', cw: 52, cd: 16, W: 64, H: 50, moat: true, region: 'arcadia',
      guard: ['リヴェル城の門番', ['ここから先はリヴェル城の城郭だ。参道をまっすぐ行けば、前庭と城の大扉。', '城下町へは、うしろの南の門から戻れる。']] },
    { id: 'sentra_palace_approach', name: 'セントラ王宮・宮苑（大階段の前庭）', town: 'sentra_capital', bid: 'palace', castle: 'sentra_palace_1', style: 'sentra', cw: 44, cd: 16, W: 60, H: 48, terrace: true, region: 'kalion',
      guard: ['王宮の衛兵', ['白い石の段丘の上が王宮だ。列柱の奥の大扉から入れる。', '王都へは南の門から戻れる。']] },
    { id: 'magicka_palace_approach', name: '魔導王宮・旧市街の上の宮殿（参道）', town: 'magicka_city', bid: 'palace', castle: 'magicka_palace', style: 'magicka', cw: 36, cd: 16, W: 56, H: 46, oldtown: true, region: 'magicka',
      guard: ['魔導騎士', ['この坂の上の古い街並みを抜けると、魔導王宮の前庭だ。', '塔の上の輪は、王宮の魔導炉の光。マクディアの町へは南の門から。']] }
  ];
  function grid(W, H, ch) { var g = []; for (var y = 0; y < H; y++) { g.push([]); for (var x = 0; x < W; x++) g[y].push(ch); } return g; }
  function rect(g, x, y, w, h, ch) { for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) if (g[j] && g[j][i] !== undefined) g[j][i] = ch; }
  /* v8.3 城下町から城郭区画へは「町の外へ出る道」で（依頼 2026-11-08：町の中の城の建物に入ると外の道に出る、というおかしな作りをやめる）
     ・城下町の城の建物（v8.2 の楼門）を取り除き、扉の列を中心に 4 マスの道を北の端まで通す。道の両わきは城壁（門へ続く石の通路）
     ・北の端の 4 マスが出口（城郭区画の南の門の内側へ）。城郭区画の南の門からは、この道の北の端へ戻る
     ・建物の跡は庭（芝・木・灯り）。道の入口に鍵の出来事（王宮の門の通行証など）があるときは、道の幅の全部を同じ鍵でふさぐ
     ・町の大きさ・ほかの建物・人・出来事・宝箱の座標は変えない。できないとき（ほかの建物と重なる等）は前の楼門のまま */
  function carveRoad82(town, tb, L, cx, H) {
    var rows = town.rows; if (!rows || typeof rows === 'function' || !rows.length) return null;
    if (tb.doorSide && tb.doorSide !== 'down') return null;
    var TH = rows.length, TW = rows[0].length;
    var doorX = tb.x + (tb.doorX !== undefined ? tb.doorX : Math.floor(tb.w / 2));
    var x0 = doorX - 1, x1 = doorX + 2, yB = tb.y + tb.h - 1;
    if (x0 - 2 < tb.x || x1 + 2 > tb.x + tb.w - 1 || yB + 1 >= TH) return null;
    var inPass = function (x, y) { return y >= 0 && y <= yB && x >= x0 - 1 && x <= x1 + 1; };
    var clash = (town.buildings || []).some(function (b) { return b !== tb && b.x <= x1 + 1 && b.x + (b.w || 5) - 1 >= x0 - 1 && b.y <= yB; });
    if (clash) return null;
    if ((town.chests || []).some(function (c) { return inPass(c.x, c.y); }) || (town.events || []).some(function (e) { return inPass(e.x, e.y); }) || (town.warps || []).some(function (w) { return inPass(w.x, w.y); })) return null;
    var g = rows.map(function (r) { return r.split(''); });
    // 建物の跡：庭（芝・木）
    for (var y = tb.y; y <= yB; y++) for (var x = tb.x; x < tb.x + tb.w; x++) g[y][x] = ',';
    for (var y2 = tb.y + 1; y2 <= yB - 2; y2 += 3) for (var x2 = tb.x + 1; x2 < tb.x + tb.w - 1; x2 += 3) { if (x2 >= x0 - 2 && x2 <= x1 + 2) continue; g[y2][x2] = '6'; }
    // 道（北の端まで）と両わきの城壁
    for (var y3 = 0; y3 <= yB; y3++) { for (var x3 = x0; x3 <= x1; x3++) g[y3][x3] = g[y3][x3] === '~' ? 'b' : 'P'; g[y3][x0 - 1] = 'C'; g[y3][x1 + 1] = 'C'; }
    g[yB][x0 - 2] = 'y'; g[yB][x1 + 2] = 'y';   // 道の入口の両わきの灯り
    // 鍵（王宮の門など）が道の入口にあるとき：両わきの城壁を 1 行のばし、鍵の扉（door_locked）が城壁の切れ目に並ぶようにする
    var lock = (town.events || []).filter(function (e) { return e && e.y === yB + 1 && e.x >= x0 && e.x <= x1 && e.type === 'locked'; })[0];
    var busy = function (x, y) { return (town.npcs || []).some(function (n) { return n && n.x === x && n.y === y; }) || (town.events || []).some(function (e) { return e && e.x === x && e.y === y; }) || (town.chests || []).some(function (c) { return c && c.x === x && c.y === y; }); };
    if (lock) [x0 - 1, x1 + 1].forEach(function (x) { if (!busy(x, yB + 1)) g[yB + 1][x] = 'C'; });
    town.rows = g.map(function (r) { return r.join(''); });
    // 道の入口に立つ人は、道の外のわきへ
    var solid = function (x, y) { var T = root.Tiles; var n = T && T.byChar ? T.byChar[town.rows[y] && town.rows[y][x]] : null; return !n || (T.isSolid && T.isSolid(n)); };
    (town.npcs || []).forEach(function (n) { if (!n || n.y !== yB + 1 || n.x < x0 || n.x > x1) return; var to = n.x - x0 < x1 - n.x ? x0 - 1 : x1 + 1;
      for (var k = 0; k < 4; k++) { var tx = n.x - x0 < x1 - n.x ? to - k : to + k; if (!solid(tx, n.y) && !(town.npcs || []).some(function (o) { return o !== n && o.x === tx && o.y === n.y; })) { n.x = tx; break; } } });
    // 鍵（王宮の門など）：道の入口の全部の幅を同じ鍵でふさぐ
    if (lock) for (var x4 = x0; x4 <= x1; x4++) if (!(town.events || []).some(function (e) { return e.x === x4 && e.y === yB + 1; })) town.events.push(Object.assign({}, lock, { x: x4, _c82lock: lock.x + ',' + lock.y }));
    // 北の端の出口（城郭区画の南の門の内側へ）
    town.warps = (town.warps || []).concat([0, 1, 2, 3].map(function (i) { return { x: x0 + i, y: 0, to: L.id, tx: cx - 2 + i, ty: H - 2, raw: true, face: 'up', name: L.name.split('・')[0] + 'へ', _c82road: true }; }));
    town.buildings = (town.buildings || []).filter(function (b) { return b !== tb; });
    // 紋章（v8.1 の crests81）：城の正面の高い紋章は、道の入口の両わきの城壁の正面へ
    if (town.crests81) { var big = town.crests81.filter(function (c) { return c.x >= x0 - 1 && c.x <= x1 + 2 && Math.abs(c.y - (yB + 1)) < 0.6; });
      if (big.length) { town.crests81 = town.crests81.filter(function (c) { return big.indexOf(c) < 0; }).concat([x0 - 0.5, x1 + 1.5].map(function (x) { return { x: x, y: yB + 1.06, face: 's', kind: big[0].kind, h: 1.6, size: 0.8, banner: true }; })); } }
    town.castleRoad82 = { to: L.id, x0: x0, x1: x1, yB: yB, cx: x0 + 2, style: L.style, removed: { id: tb.id, x: tb.x, y: tb.y, w: tb.w, h: tb.h } };
    return town.castleRoad82;
  }
  LIST.forEach(function (L) {
    try {
      var town = D[L.town], castle = D[L.castle]; if (!town || !castle || D[L.id]) return;
      var tb = (town.buildings || []).filter(function (b) { return b.id === L.bid; })[0]; if (!tb) return;
      var W = L.W, H = L.H, cx = Math.floor(W / 2); var g = grid(W, H, ',');
      // 外の壁（北・東・西・南）。南の門（4 マス）
      rect(g, 0, 0, W, 1, 'C'); rect(g, 0, 0, 1, H, 'C'); rect(g, W - 1, 0, 1, H, 'C'); rect(g, 0, H - 1, W, 1, 'C'); rect(g, cx - 2, H - 1, 4, 1, 'P');
      // 城（建物の足元は建物が塞ぐ）。正面の扉の前から前庭
      var bx = Math.floor((W - L.cw) / 2), by = 2; var doorY = by + L.cd - 1;
      // 前庭（扉の前〜内門）
      var fy0 = doorY + 1, fy1 = fy0 + 9; rect(g, 3, fy0, W - 6, fy1 - fy0 + 1, 'P');
      // 前庭の飾り：花壇・噴水・灯り・像（柱）。参道の 4 マスと扉の前はあける
      [[cx - 12, fy0 + 3], [cx + 10, fy0 + 3], [cx - 12, fy0 + 7], [cx + 10, fy0 + 7]].forEach(function (p) { rect(g, p[0], p[1], 3, 1, 'a'); });
      rect(g, cx - 9, fy0 + 4, 2, 2, 'Q'); rect(g, cx + 7, fy0 + 4, 2, 2, 'Q');
      [[cx - 4, fy0 + 1], [cx + 3, fy0 + 1], [cx - 4, fy0 + 8], [cx + 3, fy0 + 8]].forEach(function (p) { g[p[1]][p[0]] = 'I'; });
      [[cx - 6, fy0 + 2], [cx + 5, fy0 + 2], [6, fy0 + 5], [W - 7, fy0 + 5]].forEach(function (p) { g[p[1]][p[0]] = 'y'; });
      // 内門（前庭の南の壁）
      var iw = fy1 + 1; rect(g, 1, iw, W - 2, 1, 'C'); rect(g, cx - 2, iw, 4, 1, 'P');
      // 参道（内門〜南の門）
      rect(g, cx - 2, iw + 1, 4, H - iw - 2, 'P');
      for (var y = iw + 2; y < H - 4; y += 3) { g[y][cx - 3] = 'y'; g[y][cx + 2] = 'y'; }   // 門のそば（門番の立つ段）には灯りを置かない
      for (var y2 = iw + 3; y2 < H - 2; y2 += 4) { [cx - 7, cx - 11, cx + 6, cx + 10].forEach(function (x, i) { if (g[y2 + (i % 2)] && g[y2 + (i % 2)][x] === ',') g[y2 + (i % 2)][x] = '6'; }); }
      if (L.moat) { var my = iw + 8; rect(g, 1, my, W - 2, 2, '~'); rect(g, cx - 2, my, 4, 2, 'b'); }   // 堀と石橋（リヴェル）
      if (L.terrace) { for (var k = 0; k < 3; k++) { var ty = iw + 3 + k * 4; rect(g, 4, ty, cx - 7, 1, 'a'); rect(g, cx + 3, ty, W - cx - 7, 1, 'a'); } }   // 段丘の植え込み（セントラ）
      if (L.oldtown) { for (var y3 = iw + 2; y3 < H - 3; y3 += 5) { rect(g, 3, y3, cx - 8, 3, '='); rect(g, cx + 5, y3, W - cx - 8, 3, '='); } }   // 古い街並みの石畳（マクディア）
      var rows = g.map(function (r) { return r.join(''); });
      // 城の 1 階の出口（城下町へ）→ 城郭区画の扉の前へ
      var exitBack = null;
      (castle.warps || []).forEach(function (w) { if (w && w.to === L.town) { if (!exitBack) exitBack = { tx: w.tx, ty: w.ty }; w.to = L.id; w.tx = bx + Math.floor(L.cw / 2) + (w.x % 2 ? 1 : 0) - 1; w.ty = doorY + 1; w.raw = true; w._c82 = true; } });
      if (!exitBack) exitBack = { tx: tb.doorAbs ? tb.doorAbs.x : tb.x + tb.doorX, ty: tb.y + tb.h };
      var def = {
        id: L.id, name: L.name, kind: 'town', bgm: town.bgm || 'town', fallback: 'grass', style: 'stone', rows: rows, noLayout: true, noWiden: true,   /* 自動の街路の飾り（茂み）を参道・前庭に置かない */ castle82: { style: L.style, town: L.town, castle: L.castle, cw: L.cw, cd: L.cd, region: L.region },
        buildings: [{ id: 'castle82', type: 'castle', castle82: L.style, name: tb.name, x: bx, y: by, w: L.cw, h: L.cd, doorX: Math.floor(L.cw / 2), interior: L.castle, entry: tb.entry ? { x: tb.entry.x, y: tb.entry.y } : undefined }],
        warps: [0, 1, 2, 3].map(function (i) { return { x: cx - 2 + i, y: H - 1, to: L.town, tx: exitBack.tx, ty: exitBack.ty, name: '城下町へ' }; }),   // v8.3 道を通せたら、下で道の北の端へ直す
        npcs: [{ id: L.id + '_guard_l', x: cx - 4, y: H - 3, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) { await c.say(L.guard[0], L.guard[1]); } },
          { id: L.id + '_guard_r', x: cx + 3, y: H - 3, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) { await c.say(L.guard[0], ['城郭の中では、走らないように。', '……と言っても、旅の方は急いでいるか。気をつけて。']); } }],
        chests: [], events: []
      };
      D[L.id] = def;
      // v8.3 城下町の北の端へ道を通す（上の carveRoad82）。城郭区画の南の門からは、その道の北の端（2 行目）へ（今の座標のまま＝raw）
      var road = null; try { road = carveRoad82(town, tb, L, cx, H); } catch (e) { C82.errors.push(L.id + '：道 ' + (e && e.message)); road = null; }
      if (road) def.warps.forEach(function (w, i) { w.tx = road.x0 + i; w.ty = 1; w.raw = true; w.face = 'down'; });
      // 道を通せないとき（ほかの建物と重なる等）：v8.2 の作り（城下町の城の建物 → 城門（楼門）。扉の先は城郭区画の南の門の内側）
      else { tb.gate82 = L.style; tb.interior = L.id; tb.entry = { x: cx, y: H - 3 }; tb._c82 = { castle: L.castle }; C82.errors.push(L.id + '：道を通せないので楼門のまま'); }
      // 初めて入ったときだけ（3D）：城の全体が見えるカメラ（4.5 秒）
      if (root.Remake81 && root.Remake81.views) { var cine = { x: cx, y: 9, z: by + L.cd + 4, dist: 64, pitch: 15 }; root.Remake81.views[L.id] = { flag: 'c82_view_' + L.id, cine: cine, ms: 4500 };
        (root.MAP_ENTER_HOOKS = root.MAP_ENTER_HOOKS || []).push(function (m) { if (!m || m.id !== L.id) return; var d = root.State && root.State.data; if (!d || !d.flags || d.flags['c82_view_' + L.id]) return; var A3 = root.MTQ3D; if (!A3 || !A3.camera || !A3.camera.setCine) return;
          var t0 = Date.now(); var iv = setInterval(function () { var cur = A3.current && A3.current.map; if (Date.now() - t0 > 20000 || (root.World && root.World.map && root.World.map.id !== L.id)) { clearInterval(iv); return; } if (!cur || cur.id !== L.id || A3.building) return; clearInterval(iv); d.flags['c82_view_' + L.id] = true;
            try { A3.camera.setCine(cine); } catch (e) { /* なし */ } setTimeout(function () { try { A3.camera.setCine(null); } catch (e) { /* なし */ } }, 4500); }, 200); }); }
      // 城下町：初めて城門（楼門）の前（南へ 8 マスまで）に来たときだけ（3D）、門の上に見える城の上の方へカメラを向ける（4 秒）。いつものカメラでは高い所は画面の外のため
      (function (Lc, tbb) { var fl = 'c82_townview_' + Lc.id; var cineT = { x: (tbb.x + tbb.doorX), y: 11, z: tbb.y + tbb.h + 6, dist: 60, pitch: 13 };   // 道を通したときも同じ所（道の入口の南）から北の城の遠景へ
        if (root.Remake81 && root.Remake81.views) root.Remake81.views[Lc.town + ':c82'] = { flag: fl, cine: cineT, ms: 4000 };
        (root.STEP_HOOKS82 = root.STEP_HOOKS82 || []).push(function (m, x, y) { if (!m || m.id !== Lc.town) return; var d = root.State && root.State.data; if (!d || !d.flags || d.flags[fl]) return; var dz = y - (tbb.y + tbb.h), dx = Math.abs(x - (tbb.x + tbb.doorX)); if (dz < 0 || dz > 8 || dx > 8) return;
          var A3 = root.MTQ3D; if (!A3 || !A3.camera || !A3.camera.setCine || A3.building) return; d.flags[fl] = true; try { A3.camera.setCine(cineT); } catch (e) { /* なし */ } setTimeout(function () { try { A3.camera.setCine(null); } catch (e) { /* なし */ } }, 4000); }); })(L, tb);
      C82.list[L.id] = { town: L.town, castle: L.castle, style: L.style, size: [W, H], castle: [bx, by, L.cw, L.cd], door: [bx + Math.floor(L.cw / 2), doorY], exitBack: exitBack, townCastleW: tb.w, road: road };
    } catch (e) { C82.errors.push(L.id + '：' + (e && e.message)); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
