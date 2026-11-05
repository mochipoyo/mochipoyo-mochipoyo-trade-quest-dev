/* =========================================================
   Data / Region78 kit（v7.8）：新しい5地域（js/data/region78-*.js）の共通の道具
   ・R78.monster：敵（既存の敵と同じ強さの式。絵は既存の種族の色違い）
   ・R78.weapon / armor / acc / item / key：アイテム（js/data/items.js と同じ形）
   ・R78.quest：サブクエスト（js/data/story.js の QUESTS と同じ形。steps＝[フラグ, 説明]）
   ・R78.obj：次の目的地の案内（サブ。js/data/objectives.js と同じ形・side: true＝クエストの画面で「追う」を選んだときだけ）
   ・R78.field：新しい地域のフィールド（地球の配置の長方形の中。町・ダンジョンの入口は経度・緯度で書く）
       3D 版の地球の世界では js/rpg/earth78.js が地形を作る。2D 版（地球なし）では行けない地域（海と小島だけの仮の地図）
   ・R78.add：町・ダンジョンなどの地図（def.region78＝新しい地域の地図。地球を使わないで読んだセーブの救済に使う）
   ========================================================= */
(function (root) {
  'use strict';
  var R78 = root.R78 = { monsters: [], maps: [] };
  var EN = root.ENEMIES, ITEMS = root.ITEMS, Q = root.QUESTS;
  function statsFor(lv, arche) {   // js/data/monsters65.js と同じ式
    var s = { hp: Math.round(18 + lv * 9.5), atk: Math.round(5 + lv * 2.2), def: Math.round(2 + lv * 1.3), agi: Math.round(3 + lv * 0.9), mag: Math.round(lv * 0.8), exp: Math.round(3 + lv * lv * 0.9), gold: Math.round(3 + lv * 1.7) };
    if (arche === 'tank') { s.hp = Math.round(s.hp * 1.5); s.def = Math.round(s.def * 1.8); s.agi = Math.round(s.agi * 0.6); s.exp = Math.round(s.exp * 1.3); }
    if (arche === 'fast') { s.hp = Math.round(s.hp * 0.75); s.agi = Math.round(s.agi * 1.9); s.atk = Math.round(s.atk * 0.9); }
    if (arche === 'mage') { s.hp = Math.round(s.hp * 0.85); s.mag = Math.round(lv * 2.2 + 4); s.mp = 20 + lv * 3; s.exp = Math.round(s.exp * 1.2); }
    if (arche === 'glass') { s.hp = Math.round(s.hp * 0.6); s.atk = Math.round(s.atk * 1.5); }
    return s;
  }
  R78.A = function (type, idOrW, w) { return type === 'attack' ? { type: 'attack', w: idOrW } : { type: type, id: idOrW, w: w }; };
  R78.monster = function (id, o) {
    if (!EN || EN[id]) throw new Error('region78: 敵の ID が重複 ' + id);
    var s = statsFor(o.lv, o.arche); Object.keys(s).forEach(function (k) { if (o[k] === undefined) o[k] = s[k]; });
    if (o.hpMult) o.hp = Math.round(o.hp * o.hpMult); if (o.atkMult) o.atk = Math.round(o.atk * o.atkMult);
    o.id = id; o.mp = o.mp || 0; o.mag = o.mag || 0; o.resist = o.resist || {}; o.drops = o.drops || []; o.actions = o.actions || [R78.A('attack', 1)]; o.region = 'reachable'; o.v78 = true;
    o.weak = Object.keys(o.resist).filter(function (k) { return o.resist[k] > 1; });
    EN[id] = o; R78.monsters.push(id); return o;
  };
  R78.special = function (id, o) { var SP = root.ENEMY_SPECIALS; if (SP && !SP[id]) SP[id] = o; };
  function item(o) { if (ITEMS[o.id]) throw new Error('region78: アイテムの ID が重複 ' + o.id); ITEMS[o.id] = o; return o; }
  R78.weapon = function (id, name, type, atk, price, extra) { return item(Object.assign({ id: id, name: name, cat: 'weapon', type: type, atk: atk, price: price }, extra || {})); };
  R78.armor = function (id, name, type, def, price, extra) { return item(Object.assign({ id: id, name: name, cat: 'armor', type: type, def: def, price: price }, extra || {})); };
  R78.item = function (id, name, price, effect, desc, extra) { return item(Object.assign({ id: id, name: name, cat: 'consumable', price: price, effect: effect, desc: desc }, extra || {})); };
  R78.key = function (id, name, desc) { return item({ id: id, name: name, cat: 'key', price: 0, desc: desc }); };
  R78.quest = function (id, o) { if (Q[id]) throw new Error('region78: クエストの ID が重複 ' + id); o.side = true; Q[id] = o; return o; };
  R78.obj = function (q, done, t, h) { var O = root.OBJECTIVES; if (O) O.push({ q: q, done: done, t: t, h: h || [], side: true }); };
  R78.add = function (def) { def.region78 = true; root.TownKit.add(def); R78.maps.push(def.id); return def; };
  R78.shop = function (id, name, town, exitX, exitY, keeper, kind, stock, lines) { var d = root.TownKit.shopInterior(id, name, town, exitX, exitY, keeper, kind, stock, lines); var def = root.MAP_DEFS[id]; if (def) { def.region78 = true; R78.maps.push(id); } return d; };
  R78.inn = function (id, name, town, exitX, exitY, price) { root.TownKit.innInterior(id, name, town, exitX, exitY, price); var def = root.MAP_DEFS[id]; if (def) { def.region78 = true; R78.maps.push(id); } };
  // 新しい地域のフィールド（地球の配置の長方形の中。経度・緯度 → ローカル座標）
  R78.field = function (o) {
    var L = root.EARTH78_LAYOUT; var r = L.rectOf(o.id);
    var loc = function (p) { var t = L.tile(p.lon, p.lat); return { x: t.x - r.x, y: t.y - r.y }; };
    var locations = o.locations.map(function (l) { var p = loc(l); return { id: l.id, name: l.name, icon: l.icon, x: p.x, y: p.y, to: l.to, tx: l.tx, ty: l.ty, needFlag: l.needFlag, hidden: l.hidden, lockedText: l.lockedText }; });
    var near = function (lid, dx, dy) { var l = locations.filter(function (q) { return q.id === lid; })[0]; return { x: l.x + dx, y: l.y + dy }; };
    var place = function (a) { return (a || []).map(function (q) { var c = Object.assign({}, q); if (q.at) { var p = near(q.at[0], q.at[1], q.at[2]); c.x = p.x; c.y = p.y; delete c.at; } else if (q.lon !== undefined) { var p2 = loc(q); c.x = p2.x; c.y = p2.y; } return c; }); };
    var def = { id: o.id, name: o.name, kind: 'field', fallback: o.fallback || 'grass', bgm: 'field', region: true, region78: true, locations: locations,
      warps: locations.map(function (l) { return { x: l.x, y: l.y, to: l.to, tx: l.tx, ty: l.ty, name: l.name, needFlag: l.needFlag, hidden: l.hidden, lockedText: l.lockedText, locId: l.id }; }),
      chests: place(o.chests), npcs: place(o.npcs), events: place(o.events), encounters: o.encounters || null, theme3d: o.theme3d || null, earth: o.earth || {} };
    // 地球なし（2D 版など）：海と、入口の小島だけ（この地域へは行けない）
    var cache = null; def.rows = function () { if (cache) return cache; var g = []; for (var y = 0; y < r.h; y++) { var s = ''; for (var x = 0; x < r.w; x++) s += '0'; g.push(s.split('')); }
      locations.forEach(function (l) { for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) { var xx = l.x + dx, yy = l.y + dy; if (xx >= 0 && yy >= 0 && xx < r.w && yy < r.h) g[yy][xx] = Math.abs(dx) + Math.abs(dy) <= 2 ? 's' : 'w'; } g[l.y][l.x] = { village: '1', castle_icon: '2', cave_icon: '3', tower_icon: '4' }[l.icon] || '1'; });
      def.chests.concat(def.npcs, def.events).forEach(function (q) { if (q.y >= 0 && q.y < r.h && q.x >= 0 && q.x < r.w && g[q.y][q.x] === '0') g[q.y][q.x] = 's'; });
      cache = g.map(function (rw) { return rw.join(''); }); return cache; };
    root.MAP_DEFS[o.id] = def; R78.maps.push(o.id);
    def.loc = function (lid) { return near(lid, 0, 0); };
    return def;
  };
  // 町・ダンジョンからフィールドへ出る行き先：入口（場所）のすぐ下。地球の地形に合わせて入口が動いても、いつも入口の横に出る
  R78.exit = function (field, locId, dx, dy) {
    var w = {}; var f = function () { var def = root.MAP_DEFS[field]; var l = def && (def.locations || []).filter(function (q) { return q.id === locId; })[0]; return l || { x: 0, y: 0 }; };
    var spot = function () { var l = f(); var def = root.MAP_DEFS[field]; var rows = null; try { rows = def.rows(); } catch (e) { rows = null; } var T = root.Tiles;
      var cand = [[dx || 0, dy === undefined ? 1 : dy], [0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
      for (var i = 0; i < cand.length; i++) { var x = l.x + cand[i][0], y = l.y + cand[i][1]; var ch = rows && rows[y] && rows[y][x]; var nm = ch && T.byChar[ch]; if (nm && !T.isSolid(nm) && !T.isWater(nm) && !/^[1234]$/.test(ch)) return { x: x, y: y }; }
      return { x: l.x, y: l.y + 1 }; };
    Object.defineProperty(w, 'tx', { enumerable: true, get: function () { return spot().x; } }); Object.defineProperty(w, 'ty', { enumerable: true, get: function () { return spot().y; } });
    w.to = field; return w;
  };
  R78.warp = function (x, y, field, locId, name, dx, dy) { var w = R78.exit(field, locId, dx, dy); w.x = x; w.y = y; w.name = name || ''; return w; };
  // 地球の雰囲気の広がり（js/rpg/earth78.js の BLOBS）：新しい地域の入口のまわり
  R78.blob = function (id, sigma, theme, extra) {
    var L = root.EARTH78_LAYOUT; var def = root.MAP_DEFS[id]; var r = L.rectOf(id); if (!def) return;
    var cs = def.locations.map(function (l) { return { x: r.x + l.x, y: r.y + l.y }; }).concat((extra || []).map(function (p) { return L.tile(p[0], p[1]); }));
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; cs.forEach(function (c) { x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x); y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y); });
    (root.EARTH78_BLOBS = root.EARTH78_BLOBS || []).push({ id: id, th: theme, cs: cs, sg: sigma, box: [x0 - sigma * 3, y0 - sigma * 3, x1 + sigma * 3, y1 + sigma * 3] });
  };
  // 地域の見た目（3D 版のテーマ・戦闘の背景の地域・3D の空気）：ids の地図に付ける
  R78.tag = function (ids, region3d, place3d, bgRegion, mood) { ids.forEach(function (id) { var def = root.MAP_DEFS[id]; if (!def) return; def.theme3d = { region: region3d, place: place3d || (def.theme3d && def.theme3d.place) }; if (bgRegion) def.bgRegion = bgRegion; if (mood) def.mood3d = mood; }); };
  R78.MOOD = { neonNight: { sun: 0x8aa0d0, si: 0.7, hemi: 0x6a5a9a, hi: 0.6, fog: 0x1e2440, top: 0x0a0e22, hor: 0x6a2a7a, win: 2.9, exp: 1.14, fogD: 0.016 },
    ashSky: { sun: 0xe8e0d0, si: 1.5, hemi: 0xb8b4a8, hi: 0.85, fog: 0xc0bab0, top: 0x8a8a92, hor: 0xd8d0c0, win: 0.4, exp: 1.0, fogD: 0.014 } };
  // 共通：会話の文字（地域ごとの話し手）
  R78.D = function () { return root.State.data; };
  R78.questDone = function (q) { var d = R78.D(); return !!(d.quests && d.quests[q] && d.quests[q].state === 'done'); };
})(typeof window !== 'undefined' ? window : globalThis);
