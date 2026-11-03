/* =========================================================
   MapWiden（v7.0）：ダンジョンの「広い道」
   ・ダンジョン（kind 'dungeon'）の幅1マスのまっすぐな通路（4マス以上）を、片側の壁へ1マス広げて幅2マスにする
   ・広げたマスがつながる床は、元の通路か、元から3歩以内で行ける床だけ（奥・両端の先が別の通路なら広げない）＝遠回りを省く新しい近道・抜け道はできない
     道のりは固定の出来事（関所・鍵の扉など。フラグに関係なく）を壁として数えるので、鍵の扉・関所の向こうへの抜け道もできない
   ・出入口・出来事・宝箱・人・調べる場所・外周のマスは広げない。時限の扉などの仕掛けがあるマップ（def.onStep）・氷の床のあるマップ・def.noWiden は広げない
   ・2D 版の GameMap を作るときに当てる（マップの定義 def.rows は変えない。2D・3D・ミニマップは同じ結果になる）
   ========================================================= */
(function (root) {
  'use strict';
  var MapWiden = {};
  var WALL = { wall: 1, castle_wall: 1, cave_wall: 1, wall_wood: 1 };
  var FLOOR = { puddle: 1, cave_floor: 1, floor_stone: 1, floor_wood: 1, carpet: 1, ash: 1, sand: 1, darkland: 1, moss: 1, snow: 1, dirt: 1, stone: 1, path_stone: 1, road: 1, grass: 1, slag: 1 };
  MapWiden.MIN_RUN = 4;
  MapWiden.enabled = true;
  MapWiden.apply = function (m) {
    var d = m && m.def; if (!MapWiden.enabled || !d || d.kind !== 'dungeon' || d.noWiden || d.s3121 || d.onStep) return 0;
    var W = m.w, H = m.h, t = m.tiles; var T = root.Tiles;
    for (var yy = 0; yy < H; yy++) for (var xx = 0; xx < W; xx++) if (/ice/.test(t[yy][xx])) return 0;   // 氷の床（滑る仕掛け）のあるマップは広げない
    var sp = {}; (root.SEARCH_POINTS || []).forEach(function (p) { if (p.map === m.id) sp[p.x + ',' + p.y] = 1; });
    (root.QUIZ_MONSTERS || []).forEach(function (q) { if (q.map === m.id) sp[q.x + ',' + q.y] = 1; });
    var walk = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && !T.isSolid(t[y][x]); };
    var wallIn = function (x, y) { return x >= 1 && y >= 1 && x < W - 1 && y < H - 1 && !!WALL[t[y][x]]; };   // 外周は広げない
    var busy = function (x, y) { return !!(m.warpAt(x, y) || m.eventAt(x, y) || m.chestAt(x, y) || m.npcAt(x, y) || sp[x + ',' + y]); };
    var carved = []; var used = {};
    var solidEv = {}; (m.events || []).forEach(function (e) { if (e && e.solid) solidEv[e.x + ',' + e.y] = 1; });
    var pass = function (x, y) { return walk(x, y) && !solidEv[x + ',' + y]; };
    // (x,y) から run（通路のマスの集まり）まで、3歩以内で行けるか
    var near = function (x, y, run) { var seen = {}; seen[x + ',' + y] = 0; var q = [[x, y, 0]]; while (q.length) { var c = q.shift(); if (run[c[0] + ',' + c[1]]) return true; if (c[2] >= 3) continue; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) { var nx = c[0] + v[0], ny = c[1] + v[1], k = nx + ',' + ny; if (seen[k] !== undefined || !pass(nx, ny)) return; seen[k] = c[2] + 1; q.push([nx, ny, c[2] + 1]); }); } return false; };
    // 広げてよいマスの外側（奥・両端）：壁などの通れないマス、または通路から3歩以内の床
    var okSide = function (x, y, run) { if (x < 0 || y < 0 || x >= W || y >= H) return true; if (!walk(x, y)) return true; return !solidEv[x + ',' + y] && near(x, y, run); };
    function tryRuns(horiz) {
      var A = horiz ? H : W, B = horiz ? W : H;
      var P = function (a, b) { return horiz ? [b, a] : [a, b]; };   // a＝通路の列（行）、b＝通路に沿った位置
      for (var a = 1; a < A - 1; a++) {
        var b = 0;
        while (b < B) {
          var start = b; var ok = function (bb) { var p = P(a, bb); var q1 = P(a - 1, bb), q2 = P(a + 1, bb); var pa = P(a, bb - 1), pb = P(a, bb + 1);
            return walk(p[0], p[1]) && !!FLOOR[t[p[1]][p[0]]] && !walk(q1[0], q1[1]) && !walk(q2[0], q2[1]) && (walk(pa[0], pa[1]) || walk(pb[0], pb[1])) && !used[p[0] + ',' + p[1]]; };
          while (b < B && ok(b)) b++;
          var len = b - start;
          if (len >= MapWiden.MIN_RUN) {
            var run = {}; var base = null, bc = {}; for (var kr = start; kr < b; kr++) { var pr = P(a, kr); run[pr[0] + ',' + pr[1]] = 1; var tt = t[pr[1]][pr[0]]; bc[tt] = (bc[tt] || 0) + 1; if (!base || bc[tt] > bc[base]) base = tt; }
            if (base === 'puddle') base = Object.keys(bc).filter(function (k0) { return k0 !== 'puddle'; })[0] || base;
            var can = function (k, s) { var c = P(a + s, k), c2 = P(a + 2 * s, k); return wallIn(c[0], c[1]) && !busy(c[0], c[1]) && !used[c[0] + ',' + c[1]] && okSide(c2[0], c2[1], run); };
            for (var s = -1; s <= 1; s += 2) {
              var did = 0; var k = start;
              while (k < b) {   // 広げられるマスが3マス以上続く区間ごとに（岩の柱などで区切る）
                if (!can(k, s)) { k++; continue; }
                var k0 = k; while (k < b && can(k, s)) k++;
                if (k - k0 < 3) continue;
                var e1 = P(a + s, k0 - 1), e2 = P(a + s, k); if (!okSide(e1[0], e1[1], run) || !okSide(e2[0], e2[1], run)) continue;
                for (var k2 = k0; k2 < k; k2++) { var c3 = P(a + s, k2), src = P(a, k2); var st = t[src[1]][src[0]]; t[c3[1]][c3[0]] = st === 'puddle' ? base : st; carved.push([c3[0], c3[1]]); used[c3[0] + ',' + c3[1]] = 1; used[src[0] + ',' + src[1]] = 1; did++; }
              }
              if (did) break;
            }
          }
          if (b === start) b++;
        }
      }
    }
    tryRuns(true); tryRuns(false);
    m.widened = carved; return carved.length;
  };
  root.MapWiden = MapWiden;
})(typeof window !== 'undefined' ? window : globalThis);
