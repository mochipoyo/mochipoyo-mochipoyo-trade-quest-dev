/* =========================================================
   RPG / Earth78（v7.8）：地球に近い「未来の地球」の世界（3D 版のつないだ世界の配置。js/rpg/world76.js の上で動く）
   ・地形：js/data/earth78-terrain.js（ミラー図法 1440×840 マス・東西は一周）。配置：js/data/earth78-layout.js
   ・地域の地図（フィールド）は、地球の陸の形から作り直す（地域の ID はそのまま。大きさは地域ごとの長方形）
       町・城・港・ダンジョンの入口は layout の pins の場所へ。道は同じ区域（旧地図で歩いてつながっていた所）の入口どうしを結ぶ
       宝箱・人・出来事・調べる場所・クイズの魔物・港・乗り物の母港は、旧座標 → 新座標の変換＋近くの歩けるマス（海の物は海）へ
       旧地図で別々だった所（島・小島・砂嵐の回廊の南）は、新しい地図でも別々（海・崖・山並みで分ける）
   ・旧座標 → 新座標：地域ごとの「伸縮＋平行移動」（pins から最小二乗）に、入口の近くだけの補正を足す（E.fwd）。逆は E.inv
       データに書かれた旧座標（町の出口のワープ・物語の台本の World.enterMap・ナビの 'ev:地図:x,y'）は、MapRemake の仕組み（mapPos）で
       World.enterMap が新しい座標に直す。地図の中の物（入口・宝箱・人…）は、ここで新しい座標に書きかえる
   ・地域のないブロック：「外の地図」（w78_<bx>_<by>。陸も海もある。いちばん近い地域のフラグで開く）
   ・セーブ：形は「地図の ID＋ローカル座標」のまま。古いセーブ（旧座標）は World.start で新しい座標へ（主人公・乗り物・アストラ号・探索済み）
       State.data.remakeVer[地域] = 'e78.2'（版）が「地球の座標」の印（前の版 'e78.1' のセーブは、その版の配置 → 旧座標 → いまの配置へ直す）。地球を使わない（2D 版・設定「地域ごと」）で読むときは旧座標へ戻す
   ========================================================= */
(function (root) {
  'use strict';
  var E = root.Earth78 = { ready: false, stats: {}, VERSION: 'e78.3' };
  var L = root.EARTH78_LAYOUT; if (!L) { var W0 = root.World76; if (W0 && W0.earth && !W0._init) { W0.earth = false; W0.init(); } return; }   // 配置のデータがなければ、前の版の配置でつなぐ
  var W = L.W, H = L.H, BW = L.BW, BH = L.BH, WB = W / BW, HB = H / BH;
  var VER = L.VERSION; E.VERSION = VER;
  function D() { return root.State && root.State.data; }
  function mod(a, n) { return ((a % n) + n) % n; }
  function hash2(x, y, s) { var h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h = h ^ (h >>> 16); return ((h >>> 0) % 100000) / 100000; }
  function vnoise(x, y, sc, s) { var fx = x / sc, fy = y / sc, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy; var u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
    var a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  E.hash2 = hash2; E.vnoise = vnoise;
  function T() { return root.Tiles; }
  var WATER = { '~': 1, 'w': 1, '0': 1 };
  var SOLIDCH = null;   // 文字 → 通れないか
  function solidCh(c) { if (!SOLIDCH) { SOLIDCH = {}; Object.keys(T().byChar).forEach(function (k) { var nm = T().byChar[k]; SOLIDCH[k] = T().isSolid(nm) || T().isWater(nm); }); } return SOLIDCH[c] !== undefined ? SOLIDCH[c] : true; }
  function walkCh(c) { return !solidCh(c) && !WATER[c]; }
  var ICON = { village: '1', castle_icon: '2', cave_icon: '3', tower_icon: '4' };
  var ICONCH = { '1': 1, '2': 1, '3': 1, '4': 1 };

  /* ---------- 地形のデータ（地形の種類） ---------- */
  var BIO = null;
  function decode() {
    if (BIO) return BIO; var TR = root.EARTH78_TERRAIN; BIO = new Uint8Array(W * H);
    for (var y = 0; y < H; y++) { var s = TR.rows[y], i = 0, x = 0;
      while (i < s.length) { var ch = s.charCodeAt(i++); var n = 1; var c2 = s.charCodeAt(i);
        if ((c2 >= 48 && c2 <= 57) || (c2 >= 97 && c2 <= 122)) { var j = s.indexOf('.', i); n = parseInt(s.slice(i, j), 36); i = j + 1; }
        for (var k = 0; k < n && x < W; k++) BIO[y * W + x++] = ch; } }
    return BIO;
  }
  E.bio = function (gx, gy) { if (gy < 0 || gy >= H) return 'W'; return String.fromCharCode(BIO[gy * W + mod(gx, W)]); };

  /* ---------- 旧座標 → 新座標 ---------- */
  var XF = {}; E.XF = XF;
  var SIG = 9;   // 補正の届く範囲（旧座標のマス）
  function oldDef(id) { return OLD[id] || null; }
  // 前の版の配置（L.prev[版][地域].pins）の変換（セーブの引き継ぎだけに使う。いまの XF は変えない）
  var XFP = {};
  function fitXfPrev(id, ver) {
    var key = ver + ':' + id; if (XFP[key]) return XFP[key]; var pv = L.prev && L.prev[ver] && L.prev[ver][id]; if (!pv) return null;
    var spec = L.regions[id], save = spec.pins, saveXf = XF[id]; spec.pins = pv.pins; var xf = fitXf(id); spec.pins = save; if (saveXf) XF[id] = saveXf; else delete XF[id];
    XFP[key] = xf; return xf;
  }
  function fitXf(id) {
    var spec = L.regions[id], o = OLD[id]; if (!spec || !o) return null; var r = L.rectOf(id);
    var xf = { id: id, anchors: [], rect: r };
    if (spec.oldMask) { var m = spec.oldMask; xf.sx = xf.sy = m.s; xf.tx = m.gx - m.s * m.cx; xf.ty = m.gy - m.s * m.cy; XF[id] = xf; return xf; }
    var P = []; o.locations.forEach(function (l) { var p = spec.pins && spec.pins[l.id]; if (!p) return; var t = L.tile(p[0], p[1]); P.push({ id: l.id, ox: l.x, oy: l.y, nx: t.x, ny: t.y }); });
    function fit(a, b) { var n = a.length; if (n < 2) return [0.7, b[0] - 0.7 * a[0]]; var ma = 0, mb = 0; for (var i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n; var sab = 0, saa = 0; for (var j = 0; j < n; j++) { sab += (a[j] - ma) * (b[j] - mb); saa += (a[j] - ma) * (a[j] - ma); } var s = saa > 1 ? sab / saa : 0.7; s = Math.max(0.25, Math.min(1.6, s)); return [s, mb - s * ma]; }
    var fx = fit(P.map(function (p) { return p.ox; }), P.map(function (p) { return p.nx; })), fy = fit(P.map(function (p) { return p.oy; }), P.map(function (p) { return p.ny; }));
    xf.sx = fx[0]; xf.tx = fx[1]; xf.sy = fy[0]; xf.ty = fy[1]; xf.anchors = P; XF[id] = xf; return xf;
  }
  // 旧ローカル → 新グローバル（小数）
  function fwd(xf, x, y) {
    var bx = xf.sx * x + xf.tx, by = xf.sy * y + xf.ty, cx = 0, cy = 0, ws = 0;
    for (var i = 0; i < xf.anchors.length; i++) { var a = xf.anchors[i]; var dx = x - a.ox, dy = y - a.oy, d2 = dx * dx + dy * dy; if (d2 === 0) return { x: a.nx, y: a.ny };
      var w = Math.exp(-d2 / (2 * SIG * SIG)); ws += w; cx += w * (a.nx - (xf.sx * a.ox + xf.tx)); cy += w * (a.ny - (xf.sy * a.oy + xf.ty)); }
    var k = Math.max(1, ws); return { x: bx + cx / k, y: by + cy / k };
  }
  // 新グローバル → 旧ローカル（小数）
  function inv(xf, gx, gy) {
    var bx = (gx - xf.tx) / xf.sx, by = (gy - xf.ty) / xf.sy, cx = 0, cy = 0, ws = 0; var sg = SIG * (xf.sx + xf.sy) / 2;
    for (var i = 0; i < xf.anchors.length; i++) { var a = xf.anchors[i]; var dx = gx - a.nx, dy = gy - a.ny, d2 = dx * dx + dy * dy; if (d2 === 0) return { x: a.ox, y: a.oy };
      var w = Math.exp(-d2 / (2 * sg * sg)); ws += w; cx += w * (a.ox - (a.nx - xf.tx) / xf.sx); cy += w * (a.oy - (a.ny - xf.ty) / xf.sy); }
    var k = Math.max(1, ws); return { x: bx + cx / k, y: by + cy / k };
  }
  E.fwd = function (id, x, y) { var xf = XF[id]; return xf ? fwd(xf, x, y) : null; };
  E.inv = function (id, gx, gy) { var xf = XF[id]; return xf ? inv(xf, gx, gy) : null; };

  /* ---------- 旧地図（地域ごと：旧座標の物・歩いてつながる区域） ---------- */
  var OLD = {}; E.OLD = OLD;
  function snapshotOld(id) {
    var def = root.MAP_DEFS[id]; if (!def || OLD[id]) return OLD[id];
    var rows = typeof def.rows === 'function' ? def.rows() : def.rows; rows = rows.slice();
    var cp = function (a) { return (a || []).map(function (o) { return { ref: o, x: o.x, y: o.y }; }); };
    var o = { rows: rows, W: rows[0].length, H: rows.length, locations: (def.locations || []).map(function (l) { return { id: l.id, x: l.x, y: l.y, icon: l.icon, ref: l }; }),
      warps: cp(def.warps), chests: cp(def.chests), npcs: cp(def.npcs), events: cp(def.events), oldRowsFn: def.rows, encounters: def.encounters };
    // 区域（歩いてつながる所。通れない出来事は壁として数える）
    var Wd = o.W, Hd = o.H; var solidEv = {}; (def.events || []).forEach(function (e) { if (e && e.solid) solidEv[e.x + ',' + e.y] = 1; });
    var pass = function (x, y) { return x >= 0 && y >= 0 && x < Wd && y < Hd && walkCh(rows[y][x]) && !solidEv[x + ',' + y]; };
    var lab = new Int32Array(Wd * Hd).fill(-1), n = 0, q = new Int32Array(Wd * Hd);
    for (var s = 0; s < Wd * Hd; s++) { var sx = s % Wd, sy = (s / Wd) | 0; if (lab[s] >= 0 || !pass(sx, sy)) continue; var h = 0, t = 0; q[t++] = s; lab[s] = n;
      while (h < t) { var c = q[h++], cx = c % Wd, cy = (c / Wd) | 0; for (var k = 0; k < 4; k++) { var xx = cx + [1, -1, 0, 0][k], yy = cy + [0, 0, 1, -1][k]; if (!pass(xx, yy)) continue; var kk = yy * Wd + xx; if (lab[kk] < 0) { lab[kk] = n; q[t++] = kk; } } } n++; }
    o.lab = lab; o.pass = pass;
    o.compAt = function (x, y) { for (var r = 0; r <= 2; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) { var xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= Wd || yy >= Hd) continue; var l = lab[yy * Wd + xx]; if (l >= 0) return l; } return -1; };
    o.isWater = function (x, y) { x = Math.max(0, Math.min(Wd - 1, Math.round(x))); y = Math.max(0, Math.min(Hd - 1, Math.round(y))); return !!WATER[rows[y][x]]; };
    o.locComp = {}; o.locations.forEach(function (l) { l.comp = o.compAt(l.x, l.y); (o.locComp[l.comp] = o.locComp[l.comp] || []).push(l.id); });
    OLD[id] = o; return o;
  }

  /* ---------- 陸の形（地球＋地域ごとの手直し）と、陸からの距離 ---------- */
  var LAND = null, DIST = null, LOCK = null;   // LOCK：地域の作り直しで変えてはいけない陸（小島など）
  var CUSTOM = {};   // 地域 → function(gx, gy) → 1 陸 / 0 海 / -1 地球のまま
  E.registerLand = function (id, fn) { CUSTOM[id] = fn; };
  var ISLETS = {};   // 'gx,gy' → 地域
  function buildLand() {
    LAND = new Uint8Array(W * H); for (var i = 0; i < W * H; i++) LAND[i] = BIO[i] !== 87 ? 1 : 0;
    Object.keys(L.regions).forEach(function (id) {
      var spec = L.regions[id], r = L.rectOf(id); if (!root.MAP_DEFS[id]) return;
      if (spec.oldMask && OLD[id]) { var o = OLD[id], xf = XF[id];
        for (var y = 0; y < r.h; y++) for (var x = 0; x < r.w; x++) { var gx = r.x + x, gy = r.y + y; var p = inv(xf, gx + 0.5, gy + 0.5); var ox = Math.floor(p.x), oy = Math.floor(p.y);
          LAND[gy * W + gx] = (ox >= 0 && oy >= 0 && ox < o.W && oy < o.H && !WATER[o.rows[oy][ox]]) ? 1 : 0; } }
      var fn = CUSTOM[id] || (root.MAP_DEFS[id].earth && root.MAP_DEFS[id].earth.land);
      if (fn) for (var y2 = 0; y2 < r.h; y2++) for (var x2 = 0; x2 < r.w; x2++) { var v = fn(r.x + x2, r.y + y2, x2, y2); if (v === 0 || v === 1) LAND[(r.y + y2) * W + r.x + x2] = v; }
    });
    // 小島の入口（グラニアの沈没船の礁など）
    Object.keys(L.regions).forEach(function (id) { var spec = L.regions[id]; (spec.islets || []).forEach(function (lid) { var p = spec.pins[lid]; if (!p) return; var t = L.tile(p[0], p[1]); ISLETS[t.x + ',' + t.y] = id;
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) { LAND[(t.y + v[1]) * W + mod(t.x + v[0], W)] = 1; }); }); });
  }
  function buildDist() {
    DIST = new Uint16Array(W * H).fill(65535); var q = new Int32Array(W * H), t = 0;
    for (var i = 0; i < W * H; i++) if (LAND[i]) { DIST[i] = 0; q[t++] = i; }
    var D8 = new Uint16Array(DIST); var t0 = t;
    for (var h = 0; h < t; h++) { var c = q[h], cx = c % W, cy = (c / W) | 0, d = DIST[c] + 1; if (d > 40) continue;
      var nb = [cy * W + mod(cx - 1, W), cy * W + mod(cx + 1, W), cy > 0 ? c - W : -1, cy < H - 1 ? c + W : -1];
      for (var k = 0; k < 4; k++) { var n2 = nb[k]; if (n2 >= 0 && DIST[n2] > d) { DIST[n2] = d; q[t++] = n2; } } }
    var t2 = t0; for (var h2 = 0; h2 < t2; h2++) { var c2 = q[h2], cx2 = c2 % W, cy2 = (c2 / W) | 0, d2 = D8[c2] + 1; if (d2 > 40) continue;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; var yy = cy2 + dy; if (yy < 0 || yy >= H) continue; var n3 = yy * W + mod(cx2 + dx, W); if (D8[n3] > d2) { D8[n3] = d2; q[t2++] = n3; } } }
    for (var j = 0; j < W * H; j++) if (DIST[j] !== 65535) DIST[j] = Math.round((DIST[j] + Math.min(D8[j], DIST[j])) / 2);
  }
  E.field = function () { return { land: LAND, dist: DIST }; };
  E.isLand = function (gx, gy) { if (gy < 0 || gy >= H) return false; return !!LAND[gy * W + mod(gx, W)]; };
  E.dist = function (gx, gy) { if (gy < 0 || gy >= H) return 65535; return DIST[gy * W + mod(gx, W)]; };
  function waterChar(gx, gy) { var d = E.dist(gx, gy); if (d <= 1) return 'w'; if (d <= 5) return '~'; return '0'; }

  /* ---------- 地形の種類 → マスの文字 ----------
     v7.9：フィールドの木・森・崖・山・鉱滓の割合を下げた（移動しづらかった）。森は大きな森（vnoise）の芯だけ・散らばる木は少なく・
     山脈は峰のかたまり（vnoise）のあいだを丘（歩ける）にして、山を越える通り道を作る */
  // 地球のまま（外の地図・多くの地域）
  function earthChar(b, gx, gy) {
    var n = hash2(gx, gy, 3), v = vnoise(gx, gy, 6, 17);
    switch (b) {
      case 'I': return n < 0.008 ? 'c' : 'n';
      case 'T': return n < 0.08 ? 'h' : n < 0.78 ? 'n' : ',';
      case 'B': return v > 0.86 ? 'F' : n < 0.045 ? 'f' : n < 0.55 ? 'n' : ',';
      case 'F': return v > 0.86 ? 'F' : n < 0.05 ? 'f' : n < 0.5 ? ',' : '.';
      case 'R': return v > 0.8 ? 'F' : n < 0.08 ? 'f' : ',';
      case 'S': return n < 0.015 ? 'f' : n < 0.1 ? 'h' : n < 0.45 ? ',' : n < 0.62 ? 's' : '.';
      case 'D': return n < 0.012 ? 'c' : n < 0.1 ? 'h' : 's';
      case 'M': return (vnoise(gx, gy, 4, 23) > 0.42 && n > 0.12) ? 'm' : 'h';
      case 'H': return n < 0.55 ? 'h' : n < 0.63 ? 'm' : '.';
      default: return n < 0.03 ? 'f' : n < 0.16 ? ',' : '.';   // G
    }
  }
  // 地域の色（雰囲気）。k＝地域の端からの近さで弱める（となりの地図との境目で急に変わらない）
  var THEME = {
    world_grania: function (b, gx, gy, n) { if (b === 'M') return null; if (vnoise(gx, gy, 9, 31) > 0.6) return n < 0.04 ? '9' : n < 0.2 ? 'h' : '8'; return null; },
    world_tempus: function (b, gx, gy, n) { if (b === 'D') return n < 0.03 ? 'c' : n < 0.55 ? 's' : n < 0.8 ? ',' : '.'; return null; },
    world_snow: function (b, gx, gy, n) { if (b === 'M') return (vnoise(gx, gy, 4, 23) > 0.42 && n > 0.12) ? 'm' : 'h'; if (b === 'T' || b === 'I') return null; var v = vnoise(gx, gy, 6, 41); return v > 0.82 ? 'F' : n < 0.05 ? 'f' : n < 0.16 ? 'h' : n < 0.86 ? 'n' : ','; },
    world_dragon: function (b, gx, gy, n) { if (b === 'M') return (vnoise(gx, gy, 4, 23) > 0.42 && n > 0.12) ? 'm' : 'h'; var v = vnoise(gx, gy, 7, 51); if (v > 0.84) return n < 0.35 ? 'l' : '9'; return n < 0.03 ? '9' : n < 0.14 ? 'h' : n < 0.16 ? 'f' : '8'; },
    world_dark: function (b, gx, gy, n) { if (b === 'M') return (vnoise(gx, gy, 4, 23) > 0.42 && n > 0.12) ? 'm' : 'h'; return n < 0.025 ? '9' : n < 0.09 ? '8' : n < 0.12 ? 'h' : n < 0.13 ? 'l' : '+'; }
  };
  E.THEME = THEME;
  // 雰囲気の広がり：地域の入口（pins）を中心に、ゆらぎのある形（地域の長方形に関係なく、外の地図にも同じように＝四角い境目が出ない）
  var BLOBS = [];
  function buildBlobs() {
    BLOBS = []; (L.themes || []).forEach(function (t) { var id = t[0], sp = L.regions[id]; if (!sp || !root.MAP_DEFS[id]) return; var th = THEME[id] || (root.MAP_DEFS[id].earth && root.MAP_DEFS[id].earth.theme); if (!th) return;
      var cs = Object.keys(sp.pins || {}).map(function (k) { return L.tile(sp.pins[k][0], sp.pins[k][1]); }); if (!cs.length) return;
      var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; cs.forEach(function (c) { x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x); y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y); });
      BLOBS.push({ id: id, th: th, cs: cs, sg: t[1], box: [x0 - t[1] * 3, y0 - t[1] * 3, x1 + t[1] * 3, y1 + t[1] * 3] }); });
    (root.EARTH78_BLOBS || []).forEach(function (b) { BLOBS.push(b); });   // 新しい地域（js/data/region78-*.js）
  }
  function themeAt(gx, gy) {
    var best = null, bk = 0;
    for (var i = 0; i < BLOBS.length; i++) { var B = BLOBS[i]; if (gy < B.box[1] || gy > B.box[3]) continue; var dxw = root.World76.dxWrap(gx - (B.box[0] + B.box[2]) / 2); if (Math.abs(dxw) > (B.box[2] - B.box[0]) / 2) continue;
      var k = 0; for (var j = 0; j < B.cs.length; j++) { var dx = root.World76.dxWrap(gx - B.cs[j].x), dy = gy - B.cs[j].y; var v = Math.exp(-(dx * dx + dy * dy) / (2 * B.sg * B.sg)); if (v > k) k = v; }
      k = k * (0.5 + 0.95 * vnoise(gx, gy, 17, 300 + i)) + 0.18 * (vnoise(gx, gy, 5, 340 + i) - 0.5); if (k > bk) { bk = k; best = B; } }
    return bk > 0.42 ? best : null;
  }
  function regionChar(id, b, gx, gy) {
    var B = themeAt(gx, gy); if (B) { var c = B.th(b, gx, gy, hash2(gx, gy, 7)); if (c) return c; }
    return earthChar(b, gx, gy);
  }

  /* ---------- 山並み（地域の境目の陸） ---------- */
  var WALLSET = null;   // 'gx,gy' → 文字
  function buildWalls() {
    WALLSET = {};
    (L.walls || []).forEach(function (w) {
      var a = L.rectOf(w[0]), b = L.rectOf(w[1]), ch = w[2] || 'm'; if (!a || !b) return;
      var put = function (gx, gy) { if (gy < 0 || gy >= H) return; gx = mod(gx, W); if (LAND[gy * W + gx]) WALLSET[gx + ',' + gy] = ch; };
      if (a.x + a.w === b.x || b.x + b.w === a.x) { var X = a.x + a.w === b.x ? b.x : a.x; var y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h);
        for (var y = y0; y < y1; y++) { var xl = X + Math.round((vnoise(X, y, 9, 61) - 0.5) * 6); for (var dx = -2; dx <= 1; dx++) put(xl + dx, y); } }
      else if (a.y + a.h === b.y || b.y + b.h === a.y) { var Y = a.y + a.h === b.y ? b.y : a.y; var x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w);
        for (var x = x0; x < x1; x++) { var yl = Y + Math.round((vnoise(x, Y, 9, 62) - 0.5) * 6); for (var dy = -2; dy <= 1; dy++) put(x, yl + dy); } }
    });
    // 砂漠の「蜃気楼の盆地」（蜃気楼神殿のある南）：砂嵐の崖の輪（ゆらぎのある楕円）で囲む＝輪の中へは砂嵐の回廊だけ
    var ds = L.regions.world_desert; if (ds && ds.basin && root.MAP_DEFS.world_desert) { var bs = ds.basin; var c0 = L.tile(bs.lon, bs.lat);
      E.basin = { x: c0.x, y: c0.y, rx: bs.rx, ry: bs.ry };
      for (var yb = c0.y - bs.ry - 6; yb <= c0.y + bs.ry + 6; yb++) for (var xb = c0.x - bs.rx - 6; xb <= c0.x + bs.rx + 6; xb++) {
        var ex = (xb - c0.x) / bs.rx, ey = (yb - c0.y) / bs.ry; var e = Math.sqrt(ex * ex + ey * ey); var ang = Math.atan2(ey, ex);
        var wob = (vnoise(Math.cos(ang) * 40 + 100, Math.sin(ang) * 40 + 100, 9, 66) - 0.5) * 0.16; var th = 1.6 / Math.min(bs.rx, bs.ry);
        if (Math.abs(e - 1 - wob) < th && LAND[yb * W + mod(xb, W)]) WALLSET[mod(xb, W) + ',' + yb] = 'c'; } }
  }
  E.inBasin = function (gx, gy) { var b = E.basin; if (!b) return false; var ex = (gx - b.x) / b.rx, ey = (gy - b.y) / b.ry; return ex * ex + ey * ey < 1; };
  E.wallAt = function (gx, gy) { return WALLSET ? WALLSET[mod(gx, W) + ',' + gy] || null : null; };

  /* ---------- 道（A*） ---------- */
  function astar(G, Wd, Hd, sx, sy, tx, ty, cost) {
    var N = Wd * Hd; var g = new Float64Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    var heap = [], hp = function (i, f) { heap.push([f, i]); var c = heap.length - 1; while (c > 0) { var p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; var tmp = heap[p]; heap[p] = heap[c]; heap[c] = tmp; c = p; } };
    var pop = function () { var top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; var c = 0; for (;;) { var l = 2 * c + 1, r = l + 1, m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; var tmp = heap[m]; heap[m] = heap[c]; heap[c] = tmp; c = m; } } return top; };
    var s = sy * Wd + sx, t = ty * Wd + tx; g[s] = 0; hp(s, 0);
    while (heap.length) { var cur = pop()[1]; if (closed[cur]) continue; closed[cur] = 1; if (cur === t) break; var cx = cur % Wd, cy = (cur / Wd) | 0;
      for (var k = 0; k < 4; k++) { var nx = cx + [1, -1, 0, 0][k], ny = cy + [0, 0, 1, -1][k]; if (nx < 0 || ny < 0 || nx >= Wd || ny >= Hd) continue; var ni = ny * Wd + nx; if (closed[ni]) continue;
        var c = (ni === t) ? 1 : cost(G[ny][nx], nx, ny); if (!(c < Infinity)) continue; var ng = g[cur] + c; if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; hp(ni, ng + (Math.abs(nx - tx) + Math.abs(ny - ty)) * 0.8); } } }
    if (!(g[t] < Infinity)) return null; var path = []; for (var p = t; p >= 0; p = from[p]) path.push([p % Wd, (p / Wd) | 0]); path.reverse(); return { path: path, cost: g[t] };
  }
  var ROADCOST = { 'r': 0.5, 'b': 0.6, 'P': 0.6, '.': 1, ',': 1, 's': 1.2, 'n': 1.3, 'h': 1.6, '8': 1.1, '+': 1.1, 'M': 1, 'u': 1, 'H': 1.2, 'f': 3, 'F': 4, 'm': 9, 'c': 9, '9': 4, 'w': 14, '~': 24 };

  /* ---------- 地域の地図を作る ---------- */
  var GEN = {}; E.GEN = GEN;   // 地域 → { rows, pos（旧の物 → 新ローカル）, zones … }
  function edgeK(r, x, y) { var e = Math.min(x, y, r.w - 1 - x, r.h - 1 - y); return Math.max(0, Math.min(1, (e + 2) / 12)); }
  function genRegion(id) {
    var spec = L.regions[id], def = root.MAP_DEFS[id], r = L.rectOf(id), o = OLD[id], xf = XF[id]; var Wd = r.w, Hd = r.h;
    var G = []; var WALLM = new Uint8Array(Wd * Hd);
    var inOld = !!o, mask = spec.oldMask && o;
    for (var y = 0; y < Hd; y++) { var row = []; for (var x = 0; x < Wd; x++) { var gx = r.x + x, gy = r.y + y; var c;
      if (!LAND[gy * W + gx]) c = waterChar(gx, gy);
      else if (WALLSET[gx + ',' + gy]) { c = WALLSET[gx + ',' + gy]; WALLM[y * Wd + x] = 1; }
      else if (mask) { var p = inv(xf, gx + 0.5, gy + 0.5); var ox = Math.max(0, Math.min(o.W - 1, Math.floor(p.x))), oy = Math.max(0, Math.min(o.H - 1, Math.floor(p.y))); var oc = o.rows[oy][ox]; c = (WATER[oc] || ICONCH[oc] || oc === 'r' || oc === 'b' || oc === 'd') ? earthChar('G', gx, gy) : oc; }
      else c = regionChar(id, String.fromCharCode(BIO[gy * W + gx]), gx, gy);
      row.push(c); } G.push(row); }
    // 丘・山（アルカディアのエマール山脈など）
    (spec.hills || []).forEach(function (hl) { var t = L.tile(hl[0], hl[1]); var rr = hl[2] * 4; for (var y2 = -Math.ceil(rr); y2 <= rr; y2++) for (var x2 = -Math.ceil(rr); x2 <= rr; x2++) { var lx = t.x - r.x + x2, ly = t.y - r.y + y2; if (lx < 0 || ly < 0 || lx >= Wd || ly >= Hd) continue; if (!walkCh(G[ly][lx]) && G[ly][lx] !== 'f' && G[ly][lx] !== 'F') continue; var d = Math.sqrt(x2 * x2 + y2 * y2) / rr; if (d > 1) continue; var n = hash2(r.x + lx, r.y + ly, 71); G[ly][lx] = d < 0.55 * hl[3] && n < 0.75 ? 'm' : n < 0.6 ? 'h' : G[ly][lx]; } });
    // 入口の場所
    var pos = {}; var locs = [];   // locs：{ id, x, y, comp（旧の区域）, icon }
    var srcLocs = inOld ? o.locations : (def.locations || []).map(function (l) { return { id: l.id, x: l.x, y: l.y, icon: l.icon, ref: l, comp: 0, fixed: true }; });
    var occupied = {};
    srcLocs.forEach(function (l) {
      var p; if (l.fixed) p = { x: l.x, y: l.y }; else if (spec.pins && spec.pins[l.id]) { var t = L.tile(spec.pins[l.id][0], spec.pins[l.id][1]); p = { x: t.x - r.x, y: t.y - r.y }; } else { var f = fwd(xf, l.x, l.y); p = { x: Math.round(f.x) - r.x, y: Math.round(f.y) - r.y }; }
      p.x = Math.max(1, Math.min(Wd - 2, p.x)); p.y = Math.max(1, Math.min(Hd - 2, p.y));
      if (!(spec.islets && spec.islets.indexOf(l.id) >= 0)) { var q = snap(G, Wd, Hd, p.x, p.y, function (c, xx, yy) { return walkCh(c) && !WALLM[yy * Wd + xx] && !occupied[xx + ',' + yy] && nearWalk(G, Wd, Hd, xx, yy, WALLM) >= 3; }, 14); if (q) p = q; }
      locs.push({ id: l.id, x: p.x, y: p.y, comp: l.comp, icon: l.icon, ref: l.ref }); occupied[p.x + ',' + p.y] = 1; pos['L:' + l.id] = p;
    });
    locs.forEach(function (l) { for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var xx = l.x + dx, yy = l.y + dy; if (xx < 0 || yy < 0 || xx >= Wd || yy >= Hd || WALLM[yy * Wd + xx]) continue; var c = G[yy][xx]; if (WATER[c]) { if (!dx && !dy) G[yy][xx] = 's'; continue; } if (solidCh(c)) G[yy][xx] = c === '9' ? '8' : (id === 'world_dark' ? '+' : id === 'world_snow' ? 'n' : id === 'world_desert' ? 's' : '.'); }
      G[l.y][l.x] = ICON[l.icon] || '1'; });
    // 道：同じ区域の入口どうし（最小全域木）。水の上は橋（船は下をくぐれる）
    var bridges = [];
    var cost = function (c, x, y) { if (WALLM[y * Wd + x]) return Infinity; if (ICONCH[c]) return Infinity; if (c === '0' || c === 'l' || c === '7') return Infinity; var v = ROADCOST[c]; return v === undefined ? (solidCh(c) ? 8 : 1.2) : v; };
    var groups = {}; locs.forEach(function (l) { if (spec.islets && spec.islets.indexOf(l.id) >= 0) return; (groups[l.comp] = groups[l.comp] || []).push(l); });
    var roads = 0;
    Object.keys(groups).forEach(function (k) { var gL = groups[k]; if (gL.length < 2) return; var inT = [gL[0]], rest = gL.slice(1);
      while (rest.length) { var best = null; inT.forEach(function (a) { rest.forEach(function (b) { var dd = Math.abs(a.x - b.x) + Math.abs(a.y - b.y); if (!best || dd < best.d) best = { a: a, b: b, d: dd }; }); });
        var res = astar(G, Wd, Hd, best.a.x, best.a.y, best.b.x, best.b.y, cost);
        if (res) res.path.forEach(function (pt) { var c = G[pt[1]][pt[0]]; if (ICONCH[c]) return; if (WATER[c]) { G[pt[1]][pt[0]] = 'b'; bridges.push([pt[0], pt[1]]); } else if (c !== 'b') G[pt[1]][pt[0]] = 'r'; roads++; });
        else E.stats.roadFail = (E.stats.roadFail || []).concat([id + ':' + best.a.id + '-' + best.b.id]);
        inT.push(best.b); rest.splice(rest.indexOf(best.b), 1); } });
    // 区域（新しい地図で歩いてつながる所）
    var lab = labels(G, Wd, Hd); var zoneOf = {};   // 旧の区域 → 新しい区域の集合
    locs.forEach(function (l) { var c = labNear(lab, Wd, Hd, l.x, l.y); if (c >= 0) (zoneOf[l.comp] = zoneOf[l.comp] || {})[c] = 1; });
    // 宝箱・人・出来事（旧の物 → 新しい場所）
    var place = function (kind, obj, idx) {
      var key = kind + ':' + (obj.ref && obj.ref.id ? obj.ref.id : idx); var oc = inOld ? o.compAt(obj.x, obj.y) : 0; var water = inOld ? o.isWater(obj.x, obj.y) : false;
      var p; if (!inOld) p = { x: obj.x, y: obj.y }; else { var f = fwd(xf, obj.x, obj.y); p = { x: Math.round(f.x) - r.x, y: Math.round(f.y) - r.y }; }
      p.x = Math.max(1, Math.min(Wd - 2, p.x)); p.y = Math.max(1, Math.min(Hd - 2, p.y));
      var zs = zoneOf[oc]; var q;
      if (water) q = snap(G, Wd, Hd, p.x, p.y, function (c) { return c === '~' || c === 'w'; }, 20);
      else if (!inOld && walkCh(G[p.y][p.x]) && !ICONCH[G[p.y][p.x]] && !occupied[p.x + ',' + p.y]) q = p;   // 新しい地域：書いた場所のまま（入口の印・ほかの物の上は除く）
      else { q = snap(G, Wd, Hd, p.x, p.y, function (c, xx, yy) { return walkCh(c) && !ICONCH[c] && c !== 'r' && c !== 'b' && !occupied[xx + ',' + yy] && !WALLM[yy * Wd + xx] && (!zs || zs[lab[yy * Wd + xx]]); }, 30);
        if (!q && !zs && oc >= 0 && inOld && !o.locComp[oc]) {   // 旧地図の小島（入口のない島の宝箱など）：海なら小島を作る
          var qq = snap(G, Wd, Hd, p.x, p.y, function (c, xx, yy) { return (c === '~' || c === 'w') && xx > 2 && yy > 2 && xx < Wd - 3 && yy < Hd - 3; }, 20);
          if (qq) { G[qq.y][qq.x] = '.'; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) { var c2 = G[qq.y + v[1]][qq.x + v[0]]; if (WATER[c2]) G[qq.y + v[1]][qq.x + v[0]] = 's'; }); q = qq; E.stats.isletsMade = (E.stats.isletsMade || 0) + 1; } }
        if (!q) q = snap(G, Wd, Hd, p.x, p.y, function (c, xx, yy) { return walkCh(c) && !ICONCH[c] && !occupied[xx + ',' + yy] && !WALLM[yy * Wd + xx]; }, 40); }
      if (!q) { q = p; E.stats.placeFail = (E.stats.placeFail || []).concat([id + ':' + key]); }
      if (!water) for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var xx = q.x + dx, yy = q.y + dy; if (xx < 0 || yy < 0 || xx >= Wd || yy >= Hd || WALLM[yy * Wd + xx]) continue; var c3 = G[yy][xx]; if (!dx && !dy) continue; if (solidCh(c3) && !WATER[c3] && !ICONCH[c3] && kind !== 'E') G[yy][xx] = c3 === '9' ? '8' : (id === 'world_dark' ? '+' : id === 'world_snow' ? 'n' : '.'); }
      occupied[q.x + ',' + q.y] = 1; pos[key] = q; return q;
    };
    var objs = inOld ? o : { chests: cpLocal(def.chests), npcs: cpLocal(def.npcs), events: cpLocal(def.events) };
    (objs.chests || []).forEach(function (c, i) { place('C', c, i); });
    (objs.npcs || []).forEach(function (c, i) { place('N', c, i); });
    (objs.events || []).forEach(function (c, i) { place('E', c, i); });
    // 調べる場所・クイズの魔物（この地図の物）
    if (inOld) [root.SEARCH_POINTS, root.QUIZ_MONSTERS].forEach(function (Lst, li) { (Lst || []).forEach(function (sp, i) { if (!sp || sp.map !== id || typeof sp.x !== 'number') return; var q = place(li ? 'Q' : 'S', { x: sp.x, y: sp.y, ref: { id: (li ? 'q' : 's') + i } }, i); pos[(li ? 'Q' : 'S') + '#' + i] = q; }); });
    if (def.earth && def.earth.post) def.earth.post(G, { r: r, Wd: Wd, Hd: Hd, set: function (x, y, c) { if (x >= 0 && y >= 0 && x < Wd && y < Hd) G[y][x] = c; } });
    repairPockets(G, Wd, Hd, locs, spec, WALLM, bridges);   // v7.8 入口の横の小さな陸（海と入口の印に囲まれた所）を本土へつなぐ（港町マリナから出ると閉じこめられた）
    var rows = G.map(function (rw) { return rw.join(''); });
    GEN[id] = { rows: rows, pos: pos, locs: locs, bridges: bridges, lab: labels(G, Wd, Hd), zoneOf: zoneOf, W: Wd, H: Hd, roads: roads, rect: r, objs: objs };
    return GEN[id];
  }
  // 入口のまわりの陸のうち、本土（入口のまわりのいちばん大きな陸）とつながらない小さな陸を、橋・道でつなぐ。島の入口（spec.islets）は対象外
  function repairPockets(G, Wd, Hd, locs, spec, WM, bridges) {
    var fixed = []; var V = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var walk = function (x, y) { return x >= 0 && y >= 0 && x < Wd && y < Hd && walkCh(G[y][x]) && !ICONCH[G[y][x]] && !WM[y * Wd + x]; };
    var comp = function (x, y, cap) { var seen = {}; seen[x + ',' + y] = 1; var q = [[x, y]], n = 1; while (q.length && n < cap) { var c = q.shift(); for (var k = 0; k < 4; k++) { var nx = c[0] + V[k][0], ny = c[1] + V[k][1], kk = nx + ',' + ny; if (seen[kk] || !walk(nx, ny)) continue; seen[kk] = 1; n++; q.push([nx, ny]); } } return { n: n, seen: seen }; };
    var cost = function (c, x, y) { if (WM[y * Wd + x] || ICONCH[c] || c === '0' || c === 'l' || c === '7') return Infinity; if (WATER[c]) return 2.5; return solidCh(c) ? 4 : 1; };
    locs.forEach(function (l) {
      if (spec && spec.islets && spec.islets.indexOf(l.id) >= 0) return;
      var nb = []; V.forEach(function (v) { var x = l.x + v[0], y = l.y + v[1]; if (walk(x, y)) nb.push({ x: x, y: y, c: comp(x, y, 400) }); });
      var big = nb.filter(function (q) { return q.c.n >= 60; }); if (!big.length) return;
      nb.forEach(function (q) { if (q.c.n >= 60 || big.some(function (b) { return b.c.seen[q.x + ',' + q.y]; })) return;
        var res = astar(G, Wd, Hd, q.x, q.y, big[0].x, big[0].y, cost); if (!res) return;
        res.path.forEach(function (pt) { var c = G[pt[1]][pt[0]]; if (WATER[c]) { G[pt[1]][pt[0]] = 'b'; bridges.push([pt[0], pt[1]]); } else if (solidCh(c) && !ICONCH[c]) G[pt[1]][pt[0]] = 'r'; });
        fixed.push(l.id + '@' + q.x + ',' + q.y); });
    });
    if (fixed.length) E.stats.pockets = (E.stats.pockets || []).concat(fixed);
  }
  function cpLocal(a) { return (a || []).map(function (o2) { return { ref: o2, x: o2.x, y: o2.y }; }); }
  function nearWalk(G, Wd, Hd, x, y, WM) { var n = 0; for (var k = 0; k < 4; k++) { var xx = x + [1, -1, 0, 0][k], yy = y + [0, 0, 1, -1][k]; if (xx >= 0 && yy >= 0 && xx < Wd && yy < Hd && walkCh(G[yy][xx]) && !WM[yy * Wd + xx]) n++; } return n; }
  function snap(G, Wd, Hd, x, y, ok, R) {
    for (var rr = 0; rr <= R; rr++) { var best = null, bd = 1e9;
      for (var dy = -rr; dy <= rr; dy++) for (var dx = -rr; dx <= rr; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== rr) continue; var xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= Wd || yy >= Hd) continue; if (!ok(G[yy][xx], xx, yy)) continue; var d = dx * dx + dy * dy; if (d < bd) { bd = d; best = { x: xx, y: yy }; } }
      if (best) return best; }
    return null;
  }
  function labels(G, Wd, Hd) {
    var lab = new Int32Array(Wd * Hd).fill(-1), n = 0, q = new Int32Array(Wd * Hd);
    for (var s = 0; s < Wd * Hd; s++) { var sx = s % Wd, sy = (s / Wd) | 0; if (lab[s] >= 0 || !walkCh(G[sy][sx]) && !ICONCH[G[sy][sx]]) continue; var h = 0, t = 0; q[t++] = s; lab[s] = n;
      while (h < t) { var c = q[h++], cx = c % Wd, cy = (c / Wd) | 0; for (var k = 0; k < 4; k++) { var xx = cx + [1, -1, 0, 0][k], yy = cy + [0, 0, 1, -1][k]; if (xx < 0 || yy < 0 || xx >= Wd || yy >= Hd) continue; var kk = yy * Wd + xx; if (lab[kk] >= 0) continue; var c2 = G[yy][xx]; if (!walkCh(c2) && !ICONCH[c2]) continue; lab[kk] = n; q[t++] = kk; } } n++; }
    return lab;
  }
  function labNear(lab, Wd, Hd, x, y) { for (var r = 0; r <= 1; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) { var xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= Wd || yy >= Hd) continue; var l = lab[yy * Wd + xx]; if (l >= 0) return l; } return -1; }
  E.labels = labels;

  // 入口（場所）のそばの着く所：新しい入口から同じ向き・同じ距離の陸。v8.1 となり（距離 1）の同じ向きが海・浅瀬・山なら、入口のとなり（4 方向）の陸のうち元の向きに近い所へ（2〜3 マス離れた所に着かない）
  function exitNear(rows, Wd, Hd, nl, tx0, ty0, d0) {
    var okc = function (c) { return walkCh(c) && !ICONCH[c]; }, land = function (c) { return okc(c) && !WATER[c]; };
    if (d0 === 1 && !(rows[ty0] && land(rows[ty0][tx0]))) { var nb = [[0, -1], [1, 0], [-1, 0], [0, 1]].map(function (v) { return { x: nl.x + v[0], y: nl.y + v[1] }; }).filter(function (q1) { return q1.x >= 0 && q1.y >= 0 && q1.x < Wd && q1.y < Hd && rows[q1.y] && land(rows[q1.y][q1.x]); });
      nb.sort(function (a1, b1) { return (Math.abs(a1.x - tx0) + Math.abs(a1.y - ty0)) - (Math.abs(b1.x - tx0) + Math.abs(b1.y - ty0)); }); if (nb.length) return nb[0]; }
    return snap(rows, Wd, Hd, tx0, ty0, okc, 3);
  }
  /* ---------- 旧座標 → 新座標（MapRemake の mapPos。データに書かれた旧座標を World.enterMap が直す） ---------- */
  var EXACT = {};   // 地域 → { 'x,y' → { x, y } }（入口・宝箱などの旧座標）
  function mapPos(id, x, y) {
    var ex = EXACT[id] && EXACT[id][x + ',' + y]; if (ex) return { x: ex.x, y: ex.y };
    var g = GEN[id], o = OLD[id], r = g.rect; var f = fwd(XF[id], x, y); var p = { x: Math.max(0, Math.min(g.W - 1, Math.round(f.x) - r.x)), y: Math.max(0, Math.min(g.H - 1, Math.round(f.y) - r.y)) };
    var water = o && o.isWater(x, y); var rows = g.rows;
    // v7.9.2 場所（町・洞窟など）の入口のそば（3 マス以内）の陸は、新しい入口から同じ向き・同じ距離へ（町のあいだを広げたので、
    //   直線の対応だけでは入口から 5 マスほどずれることがあった：セーブの位置・入口の記録・旧座標で書いた移動先）
    if (o && !water && o.locations && g.locs) { var best = null; o.locations.forEach(function (ol) { var d0 = Math.abs(ol.x - x) + Math.abs(ol.y - y); if (d0 > 0 && d0 <= 3 && (!best || d0 < best.d)) best = { ol: ol, d: d0 }; });
      if (best) { var nl = null; g.locs.forEach(function (l) { if (l.id === best.ol.id) nl = l; }); if (nl) { var q0 = exitNear(rows, g.W, g.H, nl, nl.x + (x - best.ol.x), nl.y + (y - best.ol.y), best.d); if (q0) return q0; } } }
    var q = snap(rows, g.W, g.H, p.x, p.y, water ? function (c) { return c === '~' || c === 'w'; } : function (c) { return walkCh(c) && !ICONCH[c]; }, 30);
    if (!q && water) q = snap(rows, g.W, g.H, p.x, p.y, function (c) { return !!WATER[c]; }, 30);
    return q || p;
  }
  // 新座標 → 旧座標（探索済みの印・地球を使わないで読むときの戻し）。snapRows を渡すと、旧地図の歩けるマスへ
  function mapBack(id, X, Y, snapRows) {
    var r = L.rectOf(id), o = OLD[id], xf = XF[id]; var p = inv(xf, r.x + X, r.y + Y); var q = { x: Math.max(0, Math.min(o.W - 1, Math.round(p.x))), y: Math.max(0, Math.min(o.H - 1, Math.round(p.y))) };
    if (!snapRows) return q; var s = snap(snapRows, o.W, o.H, q.x, q.y, function (c) { return walkCh(c) && !ICONCH[c]; }, 30); return s || q;
  }
  E.mapPos = mapPos; E.mapBack = mapBack;

  /* ---------- 外の地図（地域のないブロック） ---------- */
  var CONT = [   // 地名（陸）：[名前, 経度0, 経度1, 緯度0, 緯度1]（最初に当たったもの）
    ['弓月列島', 128, 146, 30, 46], ['白鯨島', -75, -10, 59, 84], ['ニヴェリス大陸', -180, 180, -90, -60], ['ルベラ大陸', 112, 155, -45, -10], ['双葉島', 165, 180, -48, -33],
    ['ルピナ島', 42, 51, -26, -11], ['シルヴァーナ大陸', -82, -34, -56, 13], ['エルドラン大陸', -170, -52, 7, 84], ['ソルディア大陸', -18, 52, -36, 38], ['グランメリア大陸', -12, 180, 0, 84], ['グランメリア大陸', -180, -168, 60, 75]];
  var OCEAN = [['凍星の海', -180, 180, 72, 90], ['ニヴェリス海', -180, 180, -90, -58], ['内海セレネ', -6, 37, 30, 46], ['珊瑚の海', -90, -60, 9, 24], ['翠玉海', 20, 120, -58, 25], ['北オルディス海', -80, 0, 0, 72], ['南オルディス海', -70, 20, -58, 0],
    ['北アズール大洋', 120, 180, 0, 72], ['北アズール大洋', -180, -80, 0, 72], ['南アズール大洋', 120, 180, -58, 0], ['南アズール大洋', -180, -70, -58, 0], ['オルディス海', -180, 180, -90, 90]];
  function placeName(list, lon, lat) { for (var i = 0; i < list.length; i++) { var c = list[i]; if (lon >= c[1] && lon <= c[2] && lat >= c[3] && lat <= c[4]) return c[0]; } return null; }
  E.placeName = function (gx, gy) { var lon = L.lonOf(mod(gx, W) + 0.5), lat = L.latOf(gy + 0.5); return E.isLand(gx, gy) ? placeName(CONT, lon, lat) || '名もない陸' : placeName(OCEAN, lon, lat) || '外海'; };
  E.fillerName = function (id) {
    var W76 = root.World76, r = W76.rect(id); var land = 0, n = 0, sx = 0, sy = 0;
    for (var y = r.y; y < r.y + r.h; y += 3) for (var x = r.x; x < r.x + r.w; x += 3) { n++; if (LAND[y * W + x]) { land++; sx += x; sy += y; } }
    var cx = r.x + r.w / 2, cy = r.y + r.h / 2; var nm;
    if (land / n > 0.3) nm = placeName(CONT, L.lonOf(sx / land), L.latOf(sy / land)) || '名もない陸'; else nm = placeName(OCEAN, L.lonOf(cx), L.latOf(cy)) || '外海';
    r.landRatio = land / n; return nm;
  };
  function nearOf(id) {   // いちばん近い地域（地域の長方形までの距離。東西の一周を考える）
    var W76 = root.World76, r = W76.rect(id); var cx = r.x + r.w / 2, cy = r.y + r.h / 2; var best = null;
    W76.REGIONS.forEach(function (rid) { var d = W76.distTo(rid, cx, cy); if (!best || d < best.d) best = { id: rid, d: d }; }); return best ? best.id : 'world';
  }
  E.fillerRows = function (id) {
    var r = root.World76.rect(id); var rows = [];
    for (var y = 0; y < r.h; y++) { var s = ''; for (var x = 0; x < r.w; x++) { var gx = r.x + x, gy = r.y + y; s += LAND[gy * W + gx] ? (WALLSET[gx + ',' + gy] || regionChar(null, String.fromCharCode(BIO[gy * W + gx]), gx, gy)) : waterChar(gx, gy); } rows.push(s); }
    return rows;
  };
  /* ---------- v7.9 外の地図の気候と、入れないときの文 ----------
     ・気候：陸のマスの地形の種類（BIO）でいちばん多いもの。アンタルカ（南極）は暗黒大陸と同じ扱い
     ・出る敵：気候に合う地域の出現地帯のうち、強さ（level）が「いちばん近い地域の、その場所の地帯」にいちばん近いもの（強いほうへは寄せにくく）
       → 地帯の名前と level はそのまま使う（js/data/enemy-scale67.js の倍率が、同じ名前と level の地帯の値になる）
     ・入れないときの文：その大陸・海の名前と、いちばん近い地域の条件（かっこの中）
     ・入れる条件（フラグ）は、いちばん近い地域と同じ（アンタルカだけ暗黒大陸と同じ「闇の空路」・飛空艇） */
  var CLIM_SRC = {
    antarctic: [['world_dark', '暗黒大陸'], ['world_dark', '魔王城の山麓']],
    ice: [['world_snow', '忘却の雪原'], ['world_snow', '北の雪原']],
    cold: [['world_snow', '忘却の雪原'], ['world_snow', '北の雪原']],
    desert: [['world_desert', 'リシア砂漠'], ['world_desert', '南の砂漠']],
    dry: [['world', '南の荒野'], ['world_tempus', '鐘都の平野'], ['world_desert', 'リシア砂漠'], ['world_desert', '南の砂漠']],
    tropical: [['world_islands', '灰灯島の草地'], ['world_islands', '廃墟側の荒地'], ['world_nereia', null]],
    mountain: [['world', 'エマール山脈'], ['world_grania', '鉱山地帯'], ['world_tempus', '神殿の山地'], ['world_magicka', '実験室の山地']],
    temperate: [['world', '始まりの草原'], ['world', 'ダウの大森林'], ['world_grania', 'グラニアの灰野'], ['world_kalion', 'カリオン平野'], ['world_kalion', '王都周辺'], ['world_tempus', '鐘都の平野'], ['world_magicka', 'マクディア平原'], ['world_meridian', null], ['world_neon', null]]
  };
  var CLIM_NAME = { antarctic: '氷の大陸', ice: '氷原', cold: '寒い森と凍土', desert: '砂漠', dry: '乾いた草原', tropical: '熱帯の森', mountain: '山地', temperate: '温かい森と草原', sea: '海' };
  var CLIM_THEME = { antarctic: 'snow', ice: 'snow', cold: 'snow', desert: 'desert', dry: 'tempus', tropical: 'islands' };
  var CLIM_BG = { antarctic: 'snow', ice: 'snow', cold: 'snow', desert: 'desert', dry: 'tempus', tropical: 'islands' };
  var MILD = { arcadia: 1, grania: 1, kalion: 1, tempus: 1, magicka: 1, meridian: 1, neon: 1, nereia: 1, islands: 1 };
  var CLIM = {};
  E.climate = function (id) {
    if (CLIM[id]) return CLIM[id]; var W76 = root.World76, r = W76.rect(id); var nm = E.fillerName(id);
    var cnt = { ice: 0, cold: 0, desert: 0, dry: 0, tropical: 0, mountain: 0, temperate: 0 }, n = 0;
    var K = { 73: 'ice', 84: 'cold', 66: 'cold', 68: 'desert', 83: 'dry', 82: 'tropical', 77: 'mountain', 72: 'mountain', 70: 'temperate', 71: 'temperate' };   // I T B D S R M H F G
    for (var y = r.y; y < r.y + r.h; y += 2) for (var x = r.x; x < r.x + r.w; x += 2) { var i = y * W + mod(x, W); if (!LAND[i]) continue; var k = K[BIO[i]] || 'temperate'; cnt[k] += k === 'mountain' ? 0.6 : 1; n++; }
    var kind = 'sea'; if (n) { kind = 'temperate'; Object.keys(cnt).forEach(function (k) { if (cnt[k] > cnt[kind]) kind = k; }); }
    var lat = L.latOf(r.y + r.h / 2); if (/ニヴェリス/.test(nm) || lat < -58) kind = 'antarctic';
    return (CLIM[id] = { kind: kind, name: CLIM_NAME[kind] || '', land: n });
  };
  function zoneAt(near, gx, gy) { var nd = root.MAP_DEFS[near]; if (!nd || !nd.encounters || !nd.encounters.zones) return null; var p = nearLocal(near, gx, gy); var z = null; try { z = nd.encounters.zones.filter(function (zz) { return zz.test(p.x, p.y, null); })[0] || null; } catch (e) { z = null; } return z || nd.encounters.zones[0]; }
  function zoneLevel(z) { if (!z) return 1; if (z.level) return z.level; var n = 0, t = 0; (z.groups || []).forEach(function (g) { g.forEach(function (e) { var en = root.ENEMIES && root.ENEMIES[e]; if (en && en.lv) { n++; t += en.lv; } }); }); return n ? Math.round(t / n) : 1; }   // 新しい地域の地帯は level がない → 敵の lv の平均
  function climateEnc(id, cl) {
    var W76 = root.World76, r = W76.rect(id), near = r.near; var nd = root.MAP_DEFS[near]; var z0 = zoneAt(near, r.x + r.w / 2, r.y + r.h / 2);
    var lv = zoneLevel(z0); if (cl.kind === 'antarctic') lv = Math.max(lv, 34);
    var cands = []; var add = function (mid, zn, bonus) { var dd = root.MAP_DEFS[mid]; if (!dd || !dd.encounters || !dd.encounters.zones) return; dd.encounters.zones.forEach(function (z) { if (zn && z.name !== zn) return; if (!z.groups || !z.groups.length) return; cands.push({ z: z, map: mid, bonus: bonus || 0 }); }); };
    var kind = cl.kind === 'sea' ? 'temperate' : cl.kind;
    if ((kind === 'temperate' || kind === 'mountain') && MILD[climateTheme({ kind: 'temperate' }, near)] && z0) cands.push({ z: z0, map: near, bonus: -1.5 });   // 穏やかな地域のとなりは、その地域の地帯を先に
    (CLIM_SRC[kind] || CLIM_SRC.temperate).forEach(function (c) { add(c[0], c[1]); });
    if (!cands.length) { if (!nd || !nd.encounters) return null; cands.push({ z: z0 || nd.encounters.zones[0], map: near, bonus: 0 }); }
    var best = null; cands.forEach(function (c) { var zl = zoneLevel(c.z); var cost = Math.abs(zl - lv) + (zl > lv ? 0.5 : 0) + c.bonus; if (!best || cost < best.cost) best = { c: c, cost: cost }; });
    var src = best.c; if (zoneLevel(src.z) > lv + 4 && z0 && cl.kind !== 'antarctic') src = { z: z0, map: near };   /* 気候に合う地帯がどれもずっと強いとき（序盤に船で行けるグレンランドなど）は、となりの地域の地帯のまま */ var zz = Object.assign({}, src.z); zz.test = function () { return true; };
    return { rate: (nd && nd.encounters && nd.encounters.rate) || 0.035, zones: [zz], from78: src.map + '|' + src.z.name, level78: lv };
  }
  function climateTheme(cl, near) { var th = THEME3D[near] || 'islands'; if (cl.kind === 'temperate' || cl.kind === 'sea' || cl.kind === 'mountain') return th === 'dragon' || th === 'dark' || th === 'desert' || th === 'snow' ? 'arcadia' : th; return CLIM_THEME[cl.kind] || th; }
  function climateBG(cl, near) { var BG = root.BattleBG65; var b = null; try { b = BG && BG.regionOf ? BG.regionOf(near) : null; } catch (e) { b = null; } if (cl.kind === 'temperate' || cl.kind === 'sea' || cl.kind === 'mountain') return b === 'dragon' || b === 'dark' || b === 'desert' || b === 'snow' || !b ? 'arcadia' : b; return CLIM_BG[cl.kind] || b || 'arcadia'; }
  // 入れる条件（World76.gateOf から。外の地図だけ）。null＝条件なし
  var GATEFOR = {};
  E.gateFor = function (id) {
    if (!E.ready || !E._GATE) return undefined; if (GATEFOR[id] !== undefined) return GATEFOR[id];
    var W76 = root.World76, r = W76.rect(id); if (!r || !r.sea) return undefined; var nm = E.fillerName(id), cl = E.climate(id); var land = (r.landRatio || 0) >= 0.3;
    if (cl.kind === 'antarctic') { var gd = E._GATE.world_dark || { flag: 'dark_route_open' }; return (GATEFOR[id] = { flag: gd.flag, text: nm + 'は、黒い嵐に包まれていて近づけない。（闇の空路が開いてから）', vehicles: ['airship'], vtext: '黒い嵐が海を荒らしていて、船では' + nm + 'に近づけない。（飛空艇で空から）' }); }
    var g = E._GATE[r.near]; if (!g) return (GATEFOR[id] = null);
    var m = /（[^（）]*）\s*$/.exec(g.text || ''); var cond = m ? m[0] : '（' + (W76.nameOf ? W76.nameOf(r.near) : '') + 'へ行けるようになってから）';
    return (GATEFOR[id] = { flag: g.flag, text: nm + (land ? 'のまわりは、荒れた海と深い霧に閉ざされている。' : 'は、嵐と高波に閉ざされている。') + cond });
  };
  E.fillerDef = function (id) {
    var W76 = root.World76, r = W76.rect(id); var cache = null; var near = r.near;
    var nm = E.fillerName(id); var cl = E.climate(id);   // v7.9 気候（出る敵・戦闘の背景・3D の見た目を大陸の気候に合わせる）
    var enc = climateEnc(id, cl);
    var def = { id: id, name: nm, kind: 'field', rows: function () { return cache || (cache = E.fillerRows(id)); }, fallback: 'deep', bgm: 'field', region: true, sea76: (r.landRatio || 0) < 0.05, filler76: true, earth78: true,
      locations: [], warps: [], chests: [], npcs: [], events: [], encounters: enc, theme3d: { region: climateTheme(cl, near) }, bgRegion: climateBG(cl, near), climate78: cl.kind };
    // 地球の記録（js/data/region78-earth.js）：この地図の中にある遺跡を、いちばん近い歩ける陸に石の柱で置く
    (root.EARTH78_SITES || []).forEach(function (st) { var t = L.tile(st.lon, st.lat); var lx = root.World76.dxWrap(t.x - r.x), ly = t.y - r.y; if (lx < 0 || ly < 0 || lx >= r.w || ly >= r.h) return;
      var rows = def.rows(); var q = snap(rows, r.w, r.h, lx, ly, function (c, xx, yy) { return walkCh(c) && !ICONCH[c] && xx > 1 && yy > 1 && xx < r.w - 2 && yy < r.h - 2 && nearWalk(rows, r.w, r.h, xx, yy, {}) >= 3; }, 12); if (!q) return;
      st.map = id; st.x = q.x; st.y = q.y; def.events.push({ x: q.x, y: q.y, type: 'script', solid: true, tile: 'pillar', site78: st.id, run: st.run }); });
    // v8.0 異界の門（js/data/bosslair19.js）：この地図の中の門を、地形を作ったとき（最初に rows を読んだとき）に、いちばん近い「まわりも歩ける陸」へ魔法陣で置く。
    //   遺跡・ほかの門から 4 マス以上はなす。門の南（なければまわり）の歩けるマスを、ボスの間から戻ったときに立つ所（ox, oy）にする
    var lairs = (root.EARTH78_LAIRS || []).filter(function (lr) { return lr.map === id; });
    if (lairs.length) { var rows0 = def.rows, placed = false; def.rows = function () { var rows = rows0.call(def); if (!placed) { placed = true; lairs.forEach(function (lr) {
      var t = L.tile(lr.lon, lr.lat); var lx = root.World76.dxWrap(t.x - r.x), ly = t.y - r.y; lx = Math.max(2, Math.min(r.w - 3, lx)); ly = Math.max(2, Math.min(r.h - 3, ly));
      var far = function (xx, yy) { return def.events.every(function (e) { return Math.abs(e.x - xx) + Math.abs(e.y - yy) >= 4; }); };
      var q = snap(rows, r.w, r.h, lx, ly, function (c, xx, yy) { return walkCh(c) && !ICONCH[c] && xx > 2 && yy > 2 && xx < r.w - 3 && yy < r.h - 4 && nearWalk(rows, r.w, r.h, xx, yy, {}) >= 3 && walkCh(rows[yy + 1][xx]) && !ICONCH[rows[yy + 1][xx]] && far(xx, yy); }, 24); if (!q) return;
      lr.x = q.x; lr.y = q.y; lr.ox = q.x; lr.oy = q.y + 1; def.events.push({ x: q.x, y: q.y, type: 'script', solid: true, tile: 'warp', lair19: lr.key, run: lr.run }); }); } return rows; }; }
    return def;
  };
  var THEME3D = {};
  // 外の地図の (gx, gy) を、いちばん近い地域のローカル座標（その地域の出現表の判定用。旧座標の地域は旧座標）に
  function nearLocal(near, gx, gy) { var r = L.rectOf(near); var dx = root.World76.dxWrap(gx - (r.x + r.w / 2)); gx = r.x + r.w / 2 + dx; var lx = Math.max(0, Math.min(r.w - 1, gx - r.x)), ly = Math.max(0, Math.min(r.h - 1, gy - r.y)); if (OLD[near] && XF[near]) { var p = inv(XF[near], r.x + lx, r.y + ly); return { x: Math.round(p.x), y: Math.round(p.y) }; } return { x: lx, y: ly }; }

  // 大陸・海の名前（世界の地図に薄く描く）
  var LABELS = [['エルドラン大陸', -102, 47, 0, 1], ['シルヴァーナ大陸', -60, -12, 0, 1], ['ソルディア大陸', 22, -2, 0, 1], ['グランメリア大陸', 92, 56, 0, 1], ['ルベラ大陸', 134, -25, 0, 1], ['ニヴェリス大陸', 120, -74, 0, 1], ['白鯨島', -41, 73, 0, 0], ['弓月列島', 139.5, 35.5, 0, 0],
    ['アズール大洋', -140, 5, 1, 1], ['アズール大洋', 168, 22, 1, 0], ['オルディス海', -40, 30, 1, 1], ['オルディス海', -18, -32, 1, 0], ['翠玉海', 78, -22, 1, 1], ['凍星の海', 40, 78, 1, 0], ['ニヴェリス海', -60, -62, 1, 0]];
  E.aeriaAt = function () { var a = L.aeria; if (!a) return null; var t = L.tile(a.lon, a.lat); return { x: t.x, y: t.y, r: a.r }; };   // 浮天城アエリアの影が落ちる海（世界の座標）
  E.labels = function () { return LABELS.map(function (l) { var t = L.tile(l[1], l[2]); return { name: l[0], x: t.x, y: t.y, sea: !!l[3], big: !!l[4] }; }); };

  /* ---------- 案内の文（地域どうしの方角・航路）：地球の配置に合わせる（地球の世界のときだけ。データの文は書きかえず、表示するときに置きかえる） ---------- */
  var PHRASES = [
    ['南の端から外海へ出る。海流に流されても慌てないで。私が読む。', '港からオルディス海の外海へ出て、南西の沖へ。海流に流されても慌てないで。私が読む。'],
    ['ワールドマップの南端から「南の遠洋航路」で断裂群島へ渡れる。', 'マリナの港からオルディス海へ出て、南西の沖（霧の島々のあたり）の断裂群島へ渡れる。'],
    ['アルカディア相場大陸の北の空の果てから「北の空路」で天空群島へ。', '飛空艇で世界の北の果て（凍星の空）まで飛べば、「北の空路」で天空群島へ。'],
    ['アルカディア相場大陸の南の外海の先、断裂群島。', 'アルカディア相場大陸の南西、オルディス海の沖の断裂群島。'],
    ['遠洋航海船で大陸の南の端の遠洋航路を抜け、灰灯島アルナの村でヨルン老人に会おう。', '遠洋航海船でマリナの港からオルディス海へ出て、南西の沖の灰灯島アルナの村でヨルン老人に会おう。'],
    ['断裂群島の東の遠洋航路の先、時の神殿領。', '断裂群島から東へ。双柱の海峡を抜けて内海セレネの東の端、時の神殿領。'],
    ['時の神殿領の東の遠洋航路の先、マクディア魔導王国。', '時の神殿領から東へ。砂の湾の先（陸づたいにも行ける）、マクディア魔導王国。'],
    ['飛空艇でアルカディア相場大陸へ行き、大陸の北の端の空路を抜けて天空群島へ向かおう。', '飛空艇で世界の北の果て（凍星の空）まで飛び、北の空路を抜けて天空群島へ向かおう。'],
    ['海路を東へ進み、グラニア鉱業地方の灰鉱町ヴェルムへ。', '小型帆船で双柱の海峡を抜け、内海セレネを東へ進み、グラニア鉱業地方の灰鉱町ヴェルムへ。'],
    ['遠洋航海船で南の遠洋航路を抜け、灰灯島アルナの村でヨルン老人に会う', '遠洋航海船でオルディス海の南西の沖へ出て、灰灯島アルナの村でヨルン老人に会う'],
    ['断裂群島の東の遠洋航路で時の神殿領へ。', '断裂群島から東へ、内海セレネを抜けて時の神殿領へ。'],
    ['時の神殿領の東の遠洋航路でマクディア魔導王国へ。', '時の神殿領から東へ、マクディア魔導王国へ。'],
    ['北の空路で天空群島へ渡り、', '世界の北の果て（凍星の空）から「北の空路」で天空群島へ渡り、'],
    ['飛空艇でアルカディア大陸の北の空へ抜け、天空群島に着く', '飛空艇で世界の北の果て（凍星の空）へ抜け、天空群島に着く'],
    ['沿岸づたいに大陸を回って東の端の海路を抜ければ、グラニア鉱業地方の西の海に出る。', '沿岸づたいに夕陽の半島を南へ回り、双柱の海峡から内海セレネを東へ抜ければ、グラニア鉱業地方の西の海に出る。'],
    ['海路を東へ抜ければグラニア鉱業地方——ガルドの故郷だ。', '南へ回って双柱の海峡を抜け、内海セレネを東へ行けばグラニア鉱業地方——ガルドの故郷だ。'],
    ['断裂群島の東の遠洋航路の先へ向かう', '断裂群島から東へ、内海セレネの東の端へ向かう'],
    ['時の神殿領の東の遠洋航路の先へ向かう', '時の神殿領から東へ向かう']
  ];
  E.PHRASES = PHRASES;
  function fixText(t) { if (typeof t !== 'string' || !E.active()) return t; for (var i = 0; i < PHRASES.length; i++) if (t.indexOf(PHRASES[i][0]) >= 0) t = t.split(PHRASES[i][0]).join(PHRASES[i][1]); return t; }
  E.fixText = fixText;
  function applyTexts() {
    var Q = root.QUESTS || {}; Object.keys(Q).forEach(function (k) { var q = Q[k]; q.desc = fixText(q.desc); (q.steps || []).forEach(function (st) { st[1] = fixText(st[1]); }); });
    (root.OBJECTIVES || []).forEach(function (o) { if (o.h) o.h = o.h.map(fixText); if (o.text) o.text = fixText(o.text); });
    var N = root.Nav; if (N && N.START_TEXT) Object.keys(N.START_TEXT).forEach(function (k) { N.START_TEXT[k] = fixText(N.START_TEXT[k]); });
    var Win = root.Win; if (Win && Win.message && !Win._e78) { Win._e78 = true; var m0 = Win.message; Win.message = function (lines) { var a = Array.prototype.slice.call(arguments); a[0] = Array.isArray(lines) ? lines.map(fixText) : fixText(lines); return m0.apply(this, a); }; }   // 会話（町の人・仲間の言葉）
  }

  /* ---------- 組み立て（World76.init から：地球の配置のとき） ---------- */
  E.active = function () { var W76 = root.World76; return !!(W76 && W76.earth); };
  E.setup = function (W76) {
    var t0 = Date.now(); decode();
    var ids = Object.keys(L.regions).filter(function (id) { return !!root.MAP_DEFS[id]; });
    // 噂を話す人（地球の世界だけ。旧座標で置き、ほかの物と同じく新しい場所へ）：新しい地域への道しるべ
    var wd = root.MAP_DEFS.world; if (wd && !(wd.npcs || []).some(function (n) { return n.id === 'w_mapseller78'; })) wd.npcs.push({ id: 'w_mapseller78', x: 25, y: 70, sprite: 'sailor', dir: 'down', wander: 0, talk: async function (c) {
      var ER = root.R78 && root.R78.earthRecords; var ch = await c.choice('大洋の地図売り「海の噂を聞くかい？」', ['オルディス海の噂', 'アズール大洋の噂', '町のない大陸の記録', 'やめる']);
      if (ch === 2) { if (ER) await ER.talk(c); return; }
      if (ch === 0) await c.say('大洋の地図売り', ['港からオルディス海へ出て南西へ行けば、断裂群島。そのずっと南、赤道のあたりに、輪の形をした大陸があるそうだ。環潮大陸ネレイア。外礁の切れ目は、遠洋航海船でないと抜けられない。', 'オルディス海をまっすぐ西へ渡ると、エルドランの東岸。灰に覆われた港町の廃墟がある。灰岸都市メリディアンだ。……断裂群島の霧が晴れてから行ってみな。']);
      else if (ch === 1) await c.say('大洋の地図売り', ['地球の反対側、東方の沿岸には、雨がやまない街がある。錆雨市ネオン・ドック。マクディア魔導王国まで行けたら、さらに東の海へ。', 'それと、アズール大洋のど真ん中——常夏の島々のあたりで、雲の上から城の影が落ちてくるって話だ。空を飛ぶ船でもなけりゃ、確かめようがないがね。', '世界は東西にぐるっとつながってる。アズール大洋を東へ渡れば、エルドランの西の海に出るよ。']);
    } });
    // 旧地図の控え（作り直す前）と、旧座標 → 新座標の変換
    ids.forEach(function (id) { if (!L.regions[id].isNew) { snapshotOld(id); fitXf(id); } });
    // 配置を World76 へ
    var PLACE = {}, SZ = {}, GATE = {}, SAIL = {};
    ids.forEach(function (id) { var rc = L.regions[id].rect; PLACE[id] = [rc[0], rc[1]]; SZ[id] = [rc[2], rc[3]]; var sp = L.regions[id]; var old = W76.GATE[id];
      if (sp.gate) GATE[id] = { flag: sp.gate, text: sp.gateText || (old && old.text) || (sp.name + 'へは、まだ行けない。'), vehicles: sp.vehicles || (old && old.vehicles), vtext: sp.vtext || (old && old.vtext) }; });
    (L.sail || []).forEach(function (id) { SAIL[id] = true; });
    W76.useLayout({ BW: BW, BH: BH, WB: WB, HB: HB, PLACE: PLACE, SZ: SZ, GATE: GATE, SAIL_MAPS: SAIL, fill: 'w78_', wrap: true, BRIDGES: [] });
    E._GATE = GATE; GATEFOR = {}; CLIM = {};   // v7.9 外の地図の入れる条件・気候（E.gateFor・E.climate）
    // 外の地図のいちばん近い地域
    W76.SEAS.forEach(function (sid) { W76.rect(sid).near = nearOf(sid); });
    ids.forEach(function (id) { var th = null; try { var dd = root.MAP_DEFS[id]; th = dd.theme3d && dd.theme3d.region; } catch (e) { th = null; } THEME3D[id] = th || ({ world_desert: 'desert', world_snow: 'snow', world_dragon: 'dragon', world_dark: 'dark' })[id] || null; });
    buildLand(); buildWalls(); buildDist(); buildBlobs();
    E.stats.prep = Date.now() - t0;
    // 地域の地図を作り直す
    ids.forEach(function (id) { var t1 = Date.now(); genRegion(id); E.stats['gen_' + id] = Date.now() - t1; });
    ids.forEach(function (id) { applyRegion(id); });
    rewriteGlobals(ids); applyTexts();
    E.ids = ids; E.ready = true; E.stats.total = Date.now() - t0;
  };
  // 地図の定義を新しいものに（旧の物は新しい座標へ）
  function applyRegion(id) {
    var def = root.MAP_DEFS[id], g = GEN[id], o = OLD[id]; var rows = g.rows;
    def.rows = function () { return rows; }; def.earth78 = { version: VER, w: g.W, h: g.H };
    var ex = EXACT[id] = {};
    g.locs.forEach(function (l) { if (l.ref) { if (o) ex[l.ref.x + ',' + l.ref.y] = { x: l.x, y: l.y }; l.ref.x = l.x; l.ref.y = l.y; } });
    // 町・ダンジョンから出る先（旧座標で書いたワープの着地点）：入口（場所）のそばなら、新しい入口から同じ向き・同じ距離へ（入口を地形に合わせて寄せても、いつも入口のすぐ横に出る）
    if (o) Object.keys(root.MAP_DEFS).forEach(function (mid) { var dd = root.MAP_DEFS[mid]; if (mid === id || !dd || dd.region) return; (dd.warps || []).forEach(function (wp) {
      if (!wp || wp.to !== id || typeof wp.tx !== 'number') return; var key = wp.tx + ',' + wp.ty; if (ex[key]) return;
      var best = null; o.locations.forEach(function (ol) { var d0 = Math.abs(ol.x - wp.tx) + Math.abs(ol.y - wp.ty); if (d0 > 0 && d0 <= 3 && (!best || d0 < best.d)) best = { ol: ol, d: d0 }; }); if (!best) return;
      var nl = null; g.locs.forEach(function (l) { if (l.id === best.ol.id) nl = l; }); if (!nl) return;
      var q = exitNear(g.rows, g.W, g.H, nl, nl.x + (wp.tx - best.ol.x), nl.y + (wp.ty - best.ol.y), best.d); if (q) ex[key] = q; }); });
    (def.warps || []).forEach(function (wp) { var p = g.pos['L:' + wp.locId]; if (p) { wp.x = p.x; wp.y = p.y; } });
    ['chests', 'npcs', 'events'].forEach(function (k, ki) { ((g.objs || {})[k] || []).forEach(function (it, i) { var key = 'CNE'[ki] + ':' + (it.ref && it.ref.id ? it.ref.id : i); var p = g.pos[key]; if (!p || !it.ref) return; if (o) ex[it.x + ',' + it.y] = ex[it.x + ',' + it.y] || { x: p.x, y: p.y }; it.ref.x = p.x; it.ref.y = p.y; }); });
    if (o) {
      [root.SEARCH_POINTS, root.QUIZ_MONSTERS].forEach(function (Lst, li) { (Lst || []).forEach(function (sp, i) { if (!sp || sp.map !== id) return; var p = g.pos[(li ? 'Q' : 'S') + '#' + i]; if (!p) return; sp._e78o = [sp.x, sp.y]; sp.x = p.x; sp.y = p.y; }); });
      // 出現表：新しい座標 → 旧座標で、前と同じ区分（始まりの草原・森など）
      if (def.encounters && def.encounters.zones && !def.encounters._e78) { def.encounters = Object.assign({}, def.encounters, { _e78: true, zones: def.encounters.zones.map(function (z) { var z2 = Object.assign({}, z); z2.test = function (x, y, m) { var b = mapBack(id, x, y); return z.test(b.x, b.y, m); }; return z2; }) }); }
      // World.enterMap・ナビ・ワープの印が旧座標を新座標に直す（js/rpg/mapremake.js の仕組み）
      var MR = root.MapRemake; if (MR) MR.maps[id] = { version: VER, earth78: true, oldW: o.W, oldH: o.H, newW: g.W, newH: g.H, mapPos: function (x, y) { return mapPos(id, x, y); }, mapBack: function (X, Y) { return mapBack(id, X, Y); } };
    }
    // 橋：船は下をくぐれる（World76 の橋の決まり）
    g.bridges.forEach(function (b) { root.World76.addBridge && root.World76.addBridge(id, b[0], b[1]); });
    if (root.World && root.World.maps && root.World.maps[id]) delete root.World.maps[id];   // 作り直す前の地図を作っていたら捨てる
  }
  function convPt(map, x, y, water) { if (!GEN[map] || !OLD[map]) return null; var p = mapPos(map, x, y); if (water) { var g = GEN[map]; var q = snap(g.rows, g.W, g.H, p.x, p.y, function (c) { return c === '~' || c === 'w'; }, 30); if (q) p = q; } return p; }
  // v7.9 桟橋の陸：変換した点が歩けない（看板・入口）か地図の端なら、停める海のそばの「海のとなりの歩ける陸」へ（灰の浜の桟橋が看板のマスになっていた）
  function pierLand(map, la, mo) {
    var g = GEN[map]; if (!g) return la; var ev = {}; ((g.objs || {}).events || []).forEach(function (it, i) { var p = g.pos ? g.pos['E:' + (it.ref && it.ref.id ? it.ref.id : i)] : null; if (p) ev[p.x + ',' + p.y] = 1; });
    var good = function (c, x, y) { if (!walkCh(c) || ICONCH[c] || x < 1 || y < 1 || x >= g.W - 1 || y >= g.H - 1 || ev[x + ',' + y]) return false; for (var k = 0; k < 4; k++) { var xx = x + [1, -1, 0, 0][k], yy = y + [0, 0, 1, -1][k]; var c2 = g.rows[yy] && g.rows[yy][xx]; if (c2 === '~' || c2 === 'w') return true; } return false; };
    if (good(g.rows[la.y] && g.rows[la.y][la.x], la.x, la.y)) return la; var q = snap(g.rows, g.W, g.H, mo ? mo.x : la.x, mo ? mo.y : la.y, good, 8); return q || la;
  }
  // v7.9.2 港の停泊位置：町・洞窟などの入口（場所の印）から 3 マス以上離れた海へ（3D 版では町の模型が入口のまわり 2 マスほどに建つので、
  //   入口のすぐ横の海に停めた船が建物に隠れて見えず、乗れないように見えた：港町マリナ）。桟橋の陸は入口から 2 マス以上離れた「海のとなりの歩けるマス」で、
  //   その港の町（near）から歩いて行けるところのうち、いちばん近いもの。帆船で進める海（浅瀬・海）が 60 マス以上つながっているところだけ
  function dockAway(map, h) {
    var g = GEN[map]; if (!g || !h || !h.moor || !h.land) return null; var locs = g.locs || [];
    var cheb = function (x, y) { var m = 1e9; locs.forEach(function (l) { var d = Math.max(Math.abs(l.x - x), Math.abs(l.y - y)); if (d < m) m = d; }); return m; };
    if (cheb(h.moor.x, h.moor.y) >= 3 && cheb(h.land.x, h.land.y) >= 2) return null;
    var at = function (x, y) { return x >= 0 && y >= 0 && x < g.W && y < g.H ? g.rows[y][x] : null; };
    var sea = function (c) { return c === '~' || c === 'w'; };
    var ev = {}; ((g.objs || {}).events || []).forEach(function (it, i) { var p = g.pos ? g.pos['E:' + (it.ref && it.ref.id ? it.ref.id : i)] : null; if (p) ev[p.x + ',' + p.y] = 1; });
    var openCache = {}; var open = function (x, y) { var k0 = x + ',' + y; if (openCache[k0] !== undefined) return openCache[k0]; var seen = {}; seen[k0] = 1; var q = [[x, y]], n = 0;
      while (q.length && n < 60) { var c = q.shift(); n++; for (var k = 0; k < 4; k++) { var nx = c[0] + [1, -1, 0, 0][k], ny = c[1] + [0, 0, 1, -1][k], kk = nx + ',' + ny; if (seen[kk] || !sea(at(nx, ny))) continue; seen[kk] = 1; q.push([nx, ny]); } }
      return (openCache[k0] = n >= 60); };
    var near = null; locs.forEach(function (l) { if (l.id === h.near) near = l; }); var st = near || h.land;
    var dist = {}; dist[st.x + ',' + st.y] = 0; var Q = [st], head = 0;
    while (head < Q.length && head < 4000) { var p = Q[head++]; var d0 = dist[p.x + ',' + p.y];
      var c0 = at(p.x, p.y); if (d0 > 0 && !ICONCH[c0] && !ev[p.x + ',' + p.y] && p.x > 0 && p.y > 0 && p.x < g.W - 1 && p.y < g.H - 1 && cheb(p.x, p.y) >= 2) {
        for (var k = 0; k < 4; k++) { var wx = p.x + [1, -1, 0, 0][k], wy = p.y + [0, 0, 1, -1][k]; if (sea(at(wx, wy)) && cheb(wx, wy) >= 3 && open(wx, wy)) return { moor: { x: wx, y: wy }, land: { x: p.x, y: p.y } }; } }
      if (d0 >= 40) continue;
      for (var k2 = 0; k2 < 4; k2++) { var nx2 = p.x + [1, -1, 0, 0][k2], ny2 = p.y + [0, 0, 1, -1][k2], kk2 = nx2 + ',' + ny2; var c2 = at(nx2, ny2); if (dist[kk2] !== undefined || !c2 || !walkCh(c2) || ICONCH[c2]) continue; dist[kk2] = d0 + 1; Q.push({ x: nx2, y: ny2 }); } }
    return null;
  }
  E.dockAway = function (map, h) { return dockAway(map, h); };
  function rewriteGlobals(ids) {
    // 港（停める海・桟橋の陸）
    var H0 = root.Harbors && root.Harbors.HARBORS; if (H0) Object.keys(H0).forEach(function (k) { var h = H0[k]; if (!OLD[h.map] || h._e78) return; var mo = convPt(h.map, h.moor.x, h.moor.y, true), la = convPt(h.map, h.land.x, h.land.y, false); h._e78 = { moor: h.moor, land: h.land }; if (mo) h.moor = mo; if (la) h.land = pierLand(h.map, la, mo);
      var dk = dockAway(h.map, h); if (dk) { h._e79 = { moor: h.moor, land: h.land }; h.moor = dk.moor; h.land = dk.land; } });   // v7.9.2 入口から離れた海へ
    // 乗り物の母港
    var VV = root.VEHICLES; if (VV) Object.keys(VV).forEach(function (k) { var hm = VV[k].home; if (!hm || !OLD[hm.map] || VV[k]._e78) return; var p = convPt(hm.map, hm.x, hm.y, k !== 'airship'); VV[k]._e78 = { home: hm }; if (p) VV[k].home = { map: hm.map, x: p.x, y: p.y };
      // v7.9.2 船の母港が港（母港の印のある港）のそばなら、その港の停泊位置（入口から離れた海）にそろえる
      if (k !== 'airship' && H0) Object.keys(H0).forEach(function (hk) { var h = H0[hk]; var o0 = h._e78 && h._e78.moor; if (!h.home || h.map !== hm.map || !o0 || Math.abs(o0.x - hm.x) > 6 || Math.abs(o0.y - hm.y) > 6) return; VV[k].home = { map: hm.map, x: h.moor.x, y: h.moor.y }; }); });
    // 海の宝（js/rpg/seatreasure.js）
    var ST = root.SeaTreasure; var spots = ST && (ST.SPOTS || ST.spots || ST.LIST); if (spots && spots.forEach) spots.forEach(function (s) { var m = s.map || s[1]; if (!OLD[m]) return; var x = typeof s.x === 'number' ? s.x : s[2], y = typeof s.y === 'number' ? s.y : s[3]; var p = convPt(m, x, y, true); if (!p) return; if (typeof s.x === 'number') { s.x = p.x; s.y = p.y; } else { s[2] = p.x; s[3] = p.y; } });
    if (root.Harbors && root.Harbors.clearCache) root.Harbors.clearCache();
  }

  /* ---------- セーブ（地球の座標へ／旧座標へ戻す） ---------- */
  // 前の版（e78.1）の地球の座標のセーブ：配置を変えた地域（L.prev）は、その版の配置 → 旧座標へ戻して印を消す（このあと migrateOn がいまの配置へ）。
  //   配置を変えていない地域は印だけ新しい版へ
  function upgradePrev(d, same) {
    if (!d || !d.remakeVer) return; same = same || function () { return false; };
    Object.keys(d.remakeVer).forEach(function (id) { var ver = d.remakeVer[id]; if (ver === VER || !L.prev || !L.prev[ver] || !L.regions[id] || L.regions[id].isNew) return;
      if (!L.prev[ver][id]) { d.remakeVer[id] = VER; return; }
      snapshotOld(id); var o = OLD[id]; var xf = fitXfPrev(id, ver); if (!o || !xf) return; var r = L.rectOf(id);
      // v7.9.2 その版の場所の入口（ピンのマス）のそば（3 マス以内）の陸は、旧座標の入口から同じ向き・同じ距離へ（直線の対応だけでは入口から数マスずれた）
      var pins = (L.prev[ver][id] || {}).pins || {}; var pinT = {}; Object.keys(pins).forEach(function (k) { var t = L.tile(pins[k][0], pins[k][1]); pinT[k] = { x: t.x - r.x, y: t.y - r.y }; });
      var back = function (x, y, water) {
        if (!water) { var nb = null; (o.locations || []).forEach(function (ol) { var t = pinT[ol.id]; if (!t) return; var d0 = Math.abs(t.x - x) + Math.abs(t.y - y); if (d0 <= 3 && (!nb || d0 < nb.d)) nb = { ol: ol, t: t, d: d0 }; });
          if (nb) { var q0 = snap(o.rows, o.W, o.H, nb.ol.x + (x - nb.t.x), nb.ol.y + (y - nb.t.y), function (c) { return walkCh(c) && !ICONCH[c]; }, 3); if (q0) return q0; } }
        var p = inv(xf, r.x + x, r.y + y); var q = { x: Math.max(0, Math.min(o.W - 1, Math.round(p.x))), y: Math.max(0, Math.min(o.H - 1, Math.round(p.y))) };
        return snap(o.rows, o.W, o.H, q.x, q.y, water ? function (c) { return c === '~' || c === 'w'; } : function (c) { return walkCh(c) && !ICONCH[c]; }, 30) || q; };
      var on = function (m) { return m === id; };
      if (d.pos && on(d.pos.map) && !same(d.pos)) { var p = back(d.pos.x, d.pos.y, d.aboard && d.aboard !== 'airship'); d.pos.x = p.x; d.pos.y = p.y; }
      Object.keys(d.vehicles || {}).forEach(function (k) { var s = d.vehicles[k]; if (!s) return; var ship = k !== 'airship';
        if (s.map && on(s.map) && typeof s.x === 'number' && !same(s)) { var p2 = d.aboard === k && d.pos && d.pos.map === s.map ? { x: d.pos.x, y: d.pos.y } : back(s.x, s.y, ship); s.x = p2.x; s.y = p2.y; }
        if (s.port && on(s.port.map)) { var p3 = back(s.port.x, s.port.y, ship); s.port.x = p3.x; s.port.y = p3.y; } });
      var A = d.astra; if (A && on(A.map) && typeof A.x === 'number') { var p4 = back(A.x, A.y, false); A.x = p4.x; A.y = p4.y; }
      if (A && A.from && on(A.from.map)) { var p6 = back(A.from.x, A.from.y, false); A.from.x = p6.x; A.from.y = p6.y; }
      if (d.dungeonEntry && on(d.dungeonEntry.map)) { var p5 = back(d.dungeonEntry.x, d.dungeonEntry.y, false); d.dungeonEntry.x = p5.x; d.dungeonEntry.y = p5.y; }
      var disc = d.mapDiscovery && d.mapDiscovery[id]; if (disc && disc.length) { var has = function (x, y) { var row = disc[y]; return !!(row && ((row[(x / 30) | 0] || 0) & (1 << (x % 30)))); }; var out = [];
        for (var y = 0; y < o.H; y++) { out[y] = []; for (var x = 0; x < o.W; x++) { var f = fwd(xf, x, y); var X = Math.round(f.x) - r.x, Y = Math.round(f.y) - r.y; if (X >= 0 && Y >= 0 && X < r.w && Y < r.h && has(X, Y)) { var ii = (x / 30) | 0; out[y][ii] = (out[y][ii] || 0) | (1 << (x % 30)); } } }
        d.mapDiscovery[id] = out; }
      delete d.remakeVer[id]; (d.e78up = d.e78up || []).push(id + ':' + ver); });
  }
  E.upgradePrev = upgradePrev;
  function migrateOn(d) {
    if (!d) return false; upgradePrev(d); d.remakeVer = d.remakeVer || {}; var changed = false;
    var need = E.ids.filter(function (id) { return OLD[id] && d.remakeVer[id] !== VER; }); if (!need.length) return false;
    var isNeed = function (m) { return need.indexOf(m) >= 0; };
    if (d.pos && isNeed(d.pos.map)) { var p = mapPos(d.pos.map, d.pos.x, d.pos.y); if (d.aboard && d.aboard !== 'airship') { var g = GEN[d.pos.map]; var q = snap(g.rows, g.W, g.H, p.x, p.y, function (c) { return c === '~' || c === 'w' || (d.aboard === 'galleon' && c === '0'); }, 30); if (q) p = q; } d.pos.x = p.x; d.pos.y = p.y; changed = true; }
    Object.keys(d.vehicles || {}).forEach(function (k) { var s = d.vehicles[k]; if (!s) return; var ship = k !== 'airship';
      if (s.map && isNeed(s.map) && typeof s.x === 'number') { var p2 = d.aboard === k && d.pos && d.pos.map === s.map ? { x: d.pos.x, y: d.pos.y } : convPt(s.map, s.x, s.y, ship); if (p2) { s.x = p2.x; s.y = p2.y; } changed = true; }
      if (s.port && s.port.map && isNeed(s.port.map)) { var p3 = convPt(s.port.map, s.port.x, s.port.y, ship); if (p3) { s.port.x = p3.x; s.port.y = p3.y; } } });
    var A = d.astra; if (A && A.map && isNeed(A.map) && typeof A.x === 'number') { var p4 = convPt(A.map, A.x, A.y, false); if (p4) { A.x = p4.x; A.y = p4.y; } changed = true; }
    if (A && A.from && isNeed(A.from.map)) { var p6 = convPt(A.from.map, A.from.x, A.from.y, false); if (p6) { A.from.x = p6.x; A.from.y = p6.y; } }
    if (d.dungeonEntry && isNeed(d.dungeonEntry.map)) { var p5 = mapPos(d.dungeonEntry.map, d.dungeonEntry.x, d.dungeonEntry.y); d.dungeonEntry.x = p5.x; d.dungeonEntry.y = p5.y; }
    // 探索済みの印（ミニマップ）：新しいマスの元の旧マスが探索済みなら
    need.forEach(function (id) { var disc = d.mapDiscovery && d.mapDiscovery[id]; if (disc && disc.length) { var g2 = GEN[id]; var has = function (x, y) { var row = disc[y]; return !!(row && ((row[(x / 30) | 0] || 0) & (1 << (x % 30)))); }; var out = [];
      for (var Y = 0; Y < g2.H; Y++) { out[Y] = []; for (var X = 0; X < g2.W; X++) { var b = mapBack(id, X, Y); if (has(b.x, b.y)) { var ii = (X / 30) | 0; out[Y][ii] = (out[Y][ii] || 0) | (1 << (X % 30)); } } }
      d.mapDiscovery[id] = out; }
      d.remakeVer[id] = VER; });
    d.e78moved = { at: Date.now(), maps: need.length };   // 引き継いだ記録（確認用）
    return changed;
  }
  E.migrateOn = migrateOn;
  // 地球を使わない（2D 版・設定「地域ごと」）：地球の座標のセーブを旧座標へ戻す（陸・海のマスへ）
  function migrateOff(d) {
    var skip = d && d.e78skip; if (d) delete d.e78skip;   // World76.normalizeSave が旧座標で決めた位置（外の地図・新しい地域にいたセーブ）
    var same = function (o) { return !!skip && !!o && o.map === skip.map && o.x === skip.x && o.y === skip.y; };
    if (!d || !d.remakeVer) return false; upgradePrev(d, same); var ids = Object.keys(L.regions).filter(function (id) { return d.remakeVer[id] === VER && root.MAP_DEFS[id] && !L.regions[id].isNew; }); if (!ids.length) return false;
    ids.forEach(function (id) { snapshotOld(id); fitXf(id); });
    var back = function (m, x, y, water) { var o = OLD[m];
      // v7.9.2 入口のそば（3 マス以内）の陸は、旧座標の入口から同じ向き・同じ距離へ（mapPos の逆）
      var g = GEN[m]; if (!water && g && g.locs && o.locations) { var nb = null; g.locs.forEach(function (l) { var d0 = Math.abs(l.x - x) + Math.abs(l.y - y); if (d0 <= 3 && (!nb || d0 < nb.d)) nb = { l: l, d: d0 }; });
        if (nb) { var ol = null; o.locations.forEach(function (q1) { if (q1.id === nb.l.id) ol = q1; }); if (ol) { var q0 = snap(o.rows, o.W, o.H, ol.x + (x - nb.l.x), ol.y + (y - nb.l.y), function (c) { return walkCh(c) && !ICONCH[c]; }, 3); if (q0) return q0; } } }
      var q = mapBack(m, x, y, null); var s = snap(o.rows, o.W, o.H, q.x, q.y, water ? function (c) { return c === '~' || c === 'w'; } : function (c) { return walkCh(c) && !ICONCH[c]; }, 30); return s || q; };
    var isB = function (m) { return ids.indexOf(m) >= 0; };
    if (d.pos && isB(d.pos.map) && !same(d.pos)) { var p = back(d.pos.map, d.pos.x, d.pos.y, d.aboard && d.aboard !== 'airship'); d.pos.x = p.x; d.pos.y = p.y; }
    Object.keys(d.vehicles || {}).forEach(function (k) { var s = d.vehicles[k]; if (!s) return; if (s.map && isB(s.map) && !same(s)) { var p2 = back(s.map, s.x, s.y, k !== 'airship'); s.x = p2.x; s.y = p2.y; } if (s.port && isB(s.port.map)) { var p3 = back(s.port.map, s.port.x, s.port.y, k !== 'airship'); s.port.x = p3.x; s.port.y = p3.y; } });
    if (d.astra && isB(d.astra.map)) { var p4 = back(d.astra.map, d.astra.x, d.astra.y, false); d.astra.x = p4.x; d.astra.y = p4.y; }
    ids.forEach(function (id) { if (d.mapDiscovery) delete d.mapDiscovery[id]; delete d.remakeVer[id]; });
    d.e78back = { at: Date.now(), maps: ids.length }; return true;
  }
  E.migrateOff = migrateOff;
  // 地球を使わないで読むとき：外の地図（w78_*）・新しい地域にいるセーブ → 旧座標の地域へ（World76.normalizeSave から）
  E.legacyPos = function (d) {
    var id = d.pos && d.pos.map; if (!id) return null;
    var m = /^w78_(\d+)_(\d+)$/.exec(id); var gx, gy;
    if (m) { gx = +m[1] * BW + d.pos.x; gy = +m[2] * BH + d.pos.y; }
    else if (L.regions[id] && L.regions[id].isNew) { var r0 = L.rectOf(id); gx = r0.x + d.pos.x; gy = r0.y + d.pos.y; }
    else if (newRegionOf(id)) { var inn = d.lastInn && !newRegionOf(d.lastInn.map) && root.MAP_DEFS[d.lastInn.map] ? d.lastInn : null; return inn ? { map: inn.map, x: inn.x, y: inn.y, dist: 0, inn: true } : { map: 'poyo_village', x: 24, y: 32, dist: 0, inn: true }; }
    else return null;
    var best = null; Object.keys(L.regions).forEach(function (rid) { if (L.regions[rid].isNew || !root.MAP_DEFS[rid]) return; var r = L.rectOf(rid); var dx = Math.max(r.x - gx, 0, gx - (r.x + r.w - 1)), dy = Math.max(r.y - gy, 0, gy - (r.y + r.h - 1)); var dd = dx + dy; if (!best || dd < best.d) best = { id: rid, d: dd, x: Math.max(0, Math.min(r.w - 1, gx - r.x)), y: Math.max(0, Math.min(r.h - 1, gy - r.y)) }; });
    if (!best) return null; snapshotOld(best.id); fitXf(best.id); var o = OLD[best.id]; var q = mapBack(best.id, best.x, best.y, null);
    var s = snap(o.rows, o.W, o.H, q.x, q.y, d.aboard && d.aboard !== 'airship' ? function (c) { return c === '~' || c === 'w'; } : function (c) { return walkCh(c) && !ICONCH[c]; }, 40) || q;
    return { map: best.id, x: s.x, y: s.y, dist: best.d, old: true };
  };
  // その地図が新しい地域（v7.8）のものか（町・ダンジョンも。def.region78）
  function newRegionOf(mapId) { var def = root.MAP_DEFS && root.MAP_DEFS[mapId]; return !!(def && def.region78) || !!(root.R78 && root.R78.offMaps && root.R78.offMaps.indexOf(mapId) >= 0); }
  E.newRegionOf = newRegionOf;

  /* ---------- 読み込みの最後：地球の配置で World76 を組み立てる・セーブの引き継ぎ ---------- */
  function patchStart() {
    var World = root.World; if (!World || World._e78) return; World._e78 = true;
    var st = World.start; World.start = function () {
      var d = root.State && root.State.data;
      try { if (root.World76 && root.World76.normalizeSave) root.World76.normalizeSave(d); if (E.active() && E.ready) migrateOn(d); else { migrateOff(d); if (root.Astra && root.Astra.offNormalize) root.Astra.offNormalize(d); offFix(d); } } catch (e) { console.error('Earth78 セーブ', e); }
      return st.apply(this, arguments);
    };
  }
  // 地球を使わないで読むとき：ない地図（新しい地域・地球の外の地図）を指している記録を、ある所へ（宿・入口の記録・乗り物）
  function offFix(d) {
    if (!d) return; var MD = root.MAP_DEFS || {}; var gone = function (m) { return !!m && (!MD[m] || newRegionOf(m)); };
    if (d.lastInn && gone(d.lastInn.map)) d.lastInn = { map: 'poyo_village', x: 24, y: 32 };
    if (d.dungeonEntry && gone(d.dungeonEntry.map)) delete d.dungeonEntry;
    var posKind = d.pos && MD[d.pos.map] ? (MD[d.pos.map].kind || 'town') : null;
    if (d.aboard && posKind !== 'field') d.aboard = null;   // 宿などへ移したとき：乗り物から降りる
    Object.keys(d.vehicles || {}).forEach(function (k) { var s = d.vehicles[k]; if (!s || !s.map) return; var onIt = d.aboard === k;
      if (onIt && !gone(s.map) && d.pos && s.map === d.pos.map) return;
      if (!gone(s.map) && (MD[s.map].kind || 'town') === 'field') return;
      if (onIt) { s.map = d.pos.map; s.x = d.pos.x; s.y = d.pos.y; return; }
      if (s.port && !gone(s.port.map)) { s.map = s.port.map; s.x = s.port.x; s.y = s.port.y; return; }
      var hm = root.VEHICLES && root.VEHICLES[k] && root.VEHICLES[k].home; if (hm) { s.map = hm.map; s.x = hm.x; s.y = hm.y; } });
  }
  E.offFix = offFix;
  E.after = function () { /* World76 の組み立てのあと（js/rpg/world76.js から） */ };
  if (root.R78 && root.R78.finish) root.R78.finish(!!(root.World76 && root.World76.earth));   // 新しい地域：地球の世界でないときは外す
  patchStart();
  var W76 = root.World76; if (W76 && W76.earth && !W76._init && root.World && root.Vehicle && root.MAP_DEFS) { try { W76.init(); } catch (e) { console.error('Earth78', e); } }
})(typeof window !== 'undefined' ? window : globalThis);
