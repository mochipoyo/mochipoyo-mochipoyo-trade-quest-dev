/* =========================================================
   RPG / Astra78（v7.8）：星界航行船アストラ号を「未来の地球」の上で飛ばす（地球の世界のときだけ。2D 版・ほかの配置はそのまま）
   ・飛ぶ座標＝地球の世界の座標（東西は一周する）。y は地球の座標＋180（地球の北の果ての上に「空の帯」：天空群島・ゼロメア）
   ・地域：地球の地域（既存＋新しい地域）と、空の帯の天空群島・ゼロメア。行ける空域は今までどおり「訪れたことのある地域」
   ・観測記録：今までの 12 の地域のまま（新しい地域で記録の数は変わらない）
   ・浮天城アエリア：太平洋の上空（EARTH78_LAYOUT.aeria）。アストラ号でそこへ飛ぶと「上空の船着き場」に接舷できる（js/data/region78-aeria.js）
   ・船で太平洋のその海を通ると、雲の上から城の影が落ちる（知らせ）
   ・セーブ：State.data.astra.e78＝地球の座標で飛んでいる印。前の座標で飛んでいたセーブは、近い地域の上空へ置き直す
   ========================================================= */
(function (root) {
  'use strict';
  var A = root.Astra, W76 = root.World76; if (!A || !W76) return;
  var OFF = 180; var BAND = { world_sky: { x0: 560, y0: 24, w: 160, h: 120 }, world_machine: { x0: 820, y0: 24, w: 160, h: 120 } };
  function on() { return !!(W76.earth && W76.on && W76.on()); }
  function D() { return root.State && root.State.data; }
  function MD() { return root.MAP_DEFS || {}; }
  var O = { ids: A.ids, rect: A.rect, toWorld: A.toWorld, regionAt: A.regionAt, toLocal: A.toLocal, nearestRegion: A.nearestRegion, blockAt: A.blockAt, allLandingPoints: A.allLandingPoints, land: A.land, recallSpot: A.recallSpot, validate: A.validate, WORLD: A.WORLD };
  A.LOG_IDS = Object.keys(A.GRID);
  A.logIds = function () { return A.LOG_IDS.filter(function (id) { return !!MD()[id]; }); };
  A.earth = on; A.OFF = OFF; A.BAND = BAND;
  var SZ = function () { return W76.size(); };
  A.wrapW = 0;   // 地球のとき 1440（AstraView が東西の一周に使う）
  A.dxw = function (d) { var w = A.wrapW; if (!w) return d; d = ((d % w) + w) % w; return d > w / 2 ? d - w : d; };
  A.ids = function () { if (!on()) return O.ids(); return W76.REGIONS.filter(function (id) { return !!MD()[id]; }).concat(Object.keys(BAND).filter(function (id) { return !!MD()[id]; })); };
  A.rect = function (id) { if (!on()) return O.rect(id); var b = BAND[id]; if (b) return { id: id, x0: b.x0, y0: b.y0, x1: b.x0 + b.w, y1: b.y0 + b.h }; var r = W76.rect(id); if (!r || !r.region) return null; return { id: id, x0: r.x, y0: r.y + OFF, x1: r.x + r.w, y1: r.y + r.h + OFF }; };
  A.toWorld = function (mapId, x, y) { if (!on()) return O.toWorld(mapId, x, y); var b = BAND[mapId]; if (b) return { wx: b.x0 + x + 0.5, wy: b.y0 + y + 0.5 }; var g = W76.inGrid(mapId) ? W76.toGlobal(mapId, x, y) : null; return g ? { wx: g.x + 0.5, wy: g.y + OFF + 0.5 } : null; };
  A.regionAt = function (wx, wy) {
    if (!on()) return O.regionAt(wx, wy);
    for (var k in BAND) { var b = BAND[k]; if (MD()[k] && wx >= b.x0 && wx < b.x0 + b.w && wy >= b.y0 && wy < b.y0 + b.h) return k; }
    if (wy < OFF || wy >= OFF + SZ().h) return null; var id = W76.mapAt(Math.floor(wx), Math.floor(wy - OFF)); return id && W76.isRegion(id) ? id : null;
  };
  A.toLocal = function (wx, wy) {
    if (!on()) return O.toLocal(wx, wy); var id = A.regionAt(wx, wy); if (!id) return null;
    var b = BAND[id]; if (b) return { map: id, x: Math.floor(wx - b.x0), y: Math.floor(wy - b.y0) };
    var L = W76.toLocal(Math.floor(wx), Math.floor(wy - OFF)); return L && L.map === id ? L : null;
  };
  // 地域の長方形までの距離（東西の一周を考える）
  function rectDist(id, wx, wy) { var r = A.rect(id); if (!r) return Infinity; var cx = (r.x0 + r.x1) / 2; var x = BAND[id] ? wx : cx + A.dxw(wx - cx); var dx = Math.max(r.x0 - x, 0, x - r.x1), dy = Math.max(r.y0 - wy, 0, wy - r.y1); return Math.sqrt(dx * dx + dy * dy); }
  A.rectDist = rectDist;
  A.nearestRegion = function (wx, wy) { if (!on()) return O.nearestRegion(wx, wy); var best = null; A.ids().forEach(function (id) { var d = rectDist(id, wx, wy); if (!best || d < best.d) best = { id: id, d: d }; }); return best; };
  A.blockAt = function (wx, wy) {
    if (!on()) return O.blockAt(wx, wy);
    if (wy < 6) return { region: null, reason: 'これより先は星の海。……今はまだ、地球の空を飛ぼう。' };
    if (wy > OFF + SZ().h - 3) return { region: null, reason: '南の果て。極の嵐の向こうへは進めない。' };
    if (wy < OFF - 8 && !Object.keys(BAND).some(function (k) { return rectDist(k, wx, wy) < 34; }) && wy > 4) { /* 空の帯：雲の上は自由に飛べる */ }
    var ids = A.ids(); for (var i = 0; i < ids.length; i++) { var id = ids[i]; if (A.unlocked(id)) continue; if (rectDist(id, wx, wy) < A.LOCK_MARGIN) return { region: id, reason: '未踏の空域。厚い雲と乱気流で近づけない。（まだ訪れていない地域。物語を進めて、先に地上・海から訪れよう）' }; }
    return null;
  };
  // 観測記録：今までの 12 の地域
  A.logCount = function () { var s = A.state(); return s && s.log ? Object.keys(s.log).filter(function (k) { return A.GRID[k]; }).length : 0; };
  A.record = function (id) {
    var s = A.state(); if (!s || !s.owned || !id || !A.GRID[id] || !A.unlocked(id)) return null; s.log = s.log || {};
    if (s.log[id]) return null; s.log[id] = Date.now(); var n = A.logCount(); return { id: id, text: A.LOG_TEXT[id] || '', n: n, all: n >= A.logIds().length };
  };
  A.showLog = async function () { var s = A.state(), Win = root.Win; var lines = A.logIds().map(function (id) { var n = (MD()[id] || {}).name || id; return (s.log && s.log[id] ? '★ ' + A.LOG_TEXT[id] : '・' + n + '：まだ記録していない'); }); await Win.message(['観測記録 ' + A.logCount() + '/' + A.logIds().length].concat(lines)); };
  // 浮天城アエリアの船着き場（太平洋の上空）
  A.aeriaPoint = function () { var E = root.Earth78; var a = E && E.aeriaAt && E.aeriaAt(); return a ? { wx: a.x + 0.5, wy: a.y + OFF + 0.5, r: a.r } : null; };
  A.allLandingPoints = function () {
    var out = O.allLandingPoints.apply(this, arguments); if (!on() || !MD().aeria_dock) return out;
    var a = A.aeriaPoint(); if (a) out = out.concat([{ id: 'aeria', name: '浮天城アエリア（上空の船着き場）', region: 'aeria_dock', special: 'aeria', x: 9, y: 11, wx: a.wx, wy: a.wy, to: 'aeria_dock', kind: 'castle' }]);
    return out;
  };
  A.nearestLanding = function (wx, wy, maxDist) { var best = null; A.allLandingPoints().forEach(function (p) { var dd = Math.hypot(A.dxw(p.wx - wx), p.wy - wy); if ((maxDist === undefined || dd <= maxDist) && (!best || dd < best.d)) best = { p: p, d: dd }; }); return best ? best.p : null; };
  A.land = function (p) {
    if (p && p.special === 'aeria') { var s = A.state(); if (!s || !s.flying) return false; s.flying = false; s.map = 'aeria_dock'; s.x = 9; s.y = 11; var d = D(); d.flags.aer_docked = true; root.World.enterMap('aeria_dock', p.x, p.y, 'up', { raw: true }); return { map: 'aeria_dock', x: p.x, y: p.y }; }
    return O.land.apply(this, arguments);
  };
  // アエリアの船着き場から飛び立つ（js/data/region78-aeria.js）
  A.takeOffAeria = function () { var s = A.state(); var a = A.aeriaPoint(); if (!s || !s.owned || !a) return false; s.flying = true; s.wx = a.wx; s.wy = a.wy + 3; s.e78 = true; s.from = { map: 'aeria_dock', x: 9, y: 11 }; if (root.AstraView) root.AstraView.open({ takeoff: true }); root.State.autosave(); return true; };
  A.recallSpot = function () { if (!on()) return O.recallSpot(); var W = root.World, m = W.map, p = W.player; if (!m || m.kind !== 'field' || !(W76.inGrid(m.id) || BAND[m.id])) return null; return A.safeNear(m, p.x, p.y, 6); };
  A.validate = function () {
    if (!on()) return O.validate();
    var s = A.state(); if (!s || !s.owned) return;
    if (s.flying) { if (!s.e78) { var nr = s.from && MD()[s.from.map] ? A.toWorld(s.from.map, s.from.x, s.from.y) : null; if (nr) { s.wx = nr.wx; s.wy = nr.wy; } else { s.flying = false; } s.e78 = true; } if (!(s.wy > 0 && s.wy < SZ().h + OFF)) s.flying = false; if (s.flying) return; }
    if (s.map === 'aeria_dock' && MD().aeria_dock) return;
    if (!(W76.inGrid(s.map) || BAND[s.map])) { s.map = 'world_sky'; s.x = 48; s.y = 78; }
    var m; try { m = root.World.getMap(s.map); } catch (e) { return; }
    if (!A.landOk(m, s.x, s.y)) { var n = A.safeNear(m, s.x, s.y, 20) || A.nearestSafe(m, s.x, s.y, 60); if (n) { s.x = n.x; s.y = n.y; } }
  };
  // 飛び立つとき：地球の座標の印
  var tk = A.takeOff; A.takeOff = function (m, x, y) { var r = tk.apply(this, arguments); var s = A.state(); if (r && s && on()) s.e78 = true; return r; };
  // 地球を使わないで読むとき：地球の座標で飛んでいたら、飛び立った場所に降ろしておく
  A.offNormalize = function (d) { var s = d && d.astra; if (!s || !s.e78 || on()) return; if (s.flying) { s.flying = false; if (s.from && MD()[s.from.map] && !MD()[s.from.map].region78) { s.map = s.from.map; s.x = s.from.x; s.y = s.from.y; } else { s.map = 'world_sky'; s.x = 48; s.y = 78; } } if (s.map === 'aeria_dock') { s.map = 'world_sky'; s.x = 48; s.y = 78; } delete s.e78; };
  A.setupEarth = function () { if (!on()) return; A.WORLD = { w: SZ().w, h: SZ().h + OFF }; A.wrapW = SZ().w; A._lpCache = {}; };

  /* ---------- 船で太平洋を行くと、雲の上から城の影 ---------- */
  var lastShadow = 0;
  (function () { var W = root.World; if (!W || W._astra78) return; W._astra78 = true; var os = W.onStep;
    W.onStep = function () { var r = os.apply(this, arguments); try { if (on() && D().aboard && D().aboard !== 'airship' && W76.inGrid(W.map.id) && !W.busy) { var a = A.aeriaPoint(); if (a) { var g = W76.toGlobal(W.map.id, W.player.x, W.player.y); var dd = Math.hypot(A.dxw(g.x + 0.5 - a.wx), g.y + OFF + 0.5 - a.wy); var now = Date.now();
      if (dd < a.r + 5 && now - lastShadow > 60000) { lastShadow = now; W.busy = true; var owned = A.owned(); D().flags.aer_shadow_seen = true;
        root.Win.message(['空が、急に暗くなった。……雲の上から、巨大な影が海に落ちている。', '見上げると、雲の切れ間に、城の底のようなものが見えた。', owned ? '（アストラ号なら、あの高さまで届くかもしれない）' : '（船では、あの高さまでは届かない。空を飛ぶ船が要る）']).then(function () { W.busy = false; }, function () { W.busy = false; }); } } } } catch (e) { if (root.console) console.error(e); } return r; };
  })();
  root.Astra78 = { OFF: OFF, BAND: BAND };
  if (on()) A.setupEarth();
})(typeof window !== 'undefined' ? window : globalThis);
