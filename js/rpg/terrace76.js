/* =========================================================
   RPG / Terrace76（v7.6 町の作り直し）：町の高低差（段・擁壁・階段・坂）の論理
   ・マップの定義に levels76（rows と同じ大きさの文字列の配列。各マスの段の高さ 0〜9。省略＝0）を持たせる
   ・新しいマス：ledge（|・通れない）＝段の縁の擁壁と手すり／steps（/・通れる）＝階段／ramp（;・通れる）＝坂
     階段・坂のマスは「低い段」の高さを持ち、となりの高い段（＋1）へ上る。向きは、となりのマスの段から決める（stepDir）
   ・決まり（validate）：4方向にとなり合う通れるマスどうしは同じ段。違う段をつなぐのは階段・坂だけ（低い側と高い側が向かい合う）
     斜めにとなり合う通れるマスも同じ段（角で段がずれない）
   ・2D版：段の高さは描かない（擁壁・階段・坂のマスの絵だけ）。3D版：three-src/src/world/Terrace3D.js が高さと形を作る
   ========================================================= */
(function (root) {
  'use strict';
  var T76 = root.Terrace76 = { VERSION: 1, LH: 0.9 };   // 1段の高さ（3D の単位＝1マス）
  var TL = root.Tiles;
  if (TL && TL.defs) {
    var add = function (name, ch, solid, paint) { if (TL.defs[name]) return; TL.defs[name] = { name: name, ch: ch, solid: solid, paint: paint }; if (ch && !TL.byChar[ch]) TL.byChar[ch] = name; };
    // 擁壁（上から見た石積みの縁。下の辺が影）
    add('ledge', '|', true, function (g) { g.fill('#8a8478'); for (var y = 0; y < 16; y += 4) for (var x = ((y / 4) % 2) * 3; x < 16; x += 6) g.rect(x, y, 5, 3, ['#a8a294', '#9e988a', '#b2ac9e'][(x + y) % 3]); g.rect(0, 0, 16, 2, '#c8c2b2'); g.rect(0, 13, 16, 3, '#5e5a52'); });
    // 階段（段の線）
    add('steps', '/', false, function (g) { g.fill('#9a948a'); for (var i = 0; i < 4; i++) { g.rect(0, i * 4, 16, 3, ['#c4beb0', '#b8b2a4', '#aca698', '#a09a8c'][i]); g.hline(0, i * 4 + 3, 16, '#6e6a62'); } g.vline(0, 0, 16, '#7a766c'); g.vline(15, 0, 16, '#7a766c'); });
    // 坂（石畳の斜面）
    add('ramp', ';', false, function (g) { g.fill('#a8a090'); for (var y = 1; y < 16; y += 5) for (var x = (y % 2) * 2; x < 16; x += 5) { g.rect(x, y, 4, 3, '#bcb4a2'); g.hline(x, y + 3, 4, '#8a8272'); } });
  }
  T76.isStair = function (t) { return t === 'steps' || t === 'ramp'; };
  // 2D版：つながった噴水のマス（2×2 など）は、上に1つの大きな噴水の絵を描く（マスの絵は小さな噴水のまま）
  var FCACHE = {};
  var fountainsOf = function (m) {
    if (FCACHE[m.id] && FCACHE[m.id].tiles === m.tiles) return FCACHE[m.id].list; var seen = {}, list = [];
    for (var y = 0; y < m.h; y++) for (var x = 0; x < m.w; x++) { if (m.tiles[y][x] !== 'fountain' || seen[x + ',' + y]) continue; var q = [[x, y]], cells = []; seen[x + ',' + y] = 1;
      while (q.length) { var a = q.pop(); cells.push(a); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = a[0] + d[0], ny = a[1] + d[1]; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || seen[nx + ',' + ny] || m.tiles[ny][nx] !== 'fountain') return; seen[nx + ',' + ny] = 1; q.push([nx, ny]); }); }
      if (cells.length < 2) continue; var x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; cells.forEach(function (c) { x0 = Math.min(x0, c[0]); y0 = Math.min(y0, c[1]); x1 = Math.max(x1, c[0]); y1 = Math.max(y1, c[1]); }); list.push({ x0: x0, y0: y0, x1: x1, y1: y1 }); }
    FCACHE[m.id] = { tiles: m.tiles, list: list }; return list;
  };
  root.MAP_DRAW_LAYERS = root.MAP_DRAW_LAYERS || [];
  root.MAP_DRAW_LAYERS.push(function (m, cam, x0, y0, x1, y1, TS) {
    return fountainsOf(m).filter(function (f) { return f.x1 >= x0 - 1 && f.x0 <= x1 + 1 && f.y1 >= y0 - 1 && f.y0 <= y1 + 1; }).map(function (f) {
      return { y: (f.y1 + 0.5) * TS, draw: function (ctx) {
        var px = f.x0 * TS - cam.x, py = f.y0 * TS - cam.y, w = (f.x1 - f.x0 + 1) * TS, h = (f.y1 - f.y0 + 1) * TS, cx = px + w / 2, cy = py + h / 2, r = Math.min(w, h) / 2 - 1; var t = (root.Engine && root.Engine.frame) || 0;
        ctx.save(); ctx.fillStyle = '#9a9aa8'; ctx.fillRect(px, py, w, h);
        ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.92, 0, 0, Math.PI * 2); ctx.fillStyle = '#d8d4cc'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.82, r * 0.74, 0, 0, Math.PI * 2); ctx.fillStyle = '#3f8ad8'; ctx.fill();
        ctx.strokeStyle = 'rgba(200,235,255,0.7)'; ctx.lineWidth = 1; for (var k = 0; k < 2; k++) { var rr = r * (0.35 + ((t / 40 + k * 0.5) % 1) * 0.45); ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * 0.9, 0, 0, Math.PI * 2); ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.3, r * 0.26, 0, 0, Math.PI * 2); ctx.fillStyle = '#e8e4dc'; ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.2, r * 0.17, 0, 0, Math.PI * 2); ctx.fillStyle = '#6ab4ff'; ctx.fill();
        ctx.fillStyle = '#e8f6ff'; ctx.fillRect(cx - 1, cy - r * 0.7 + Math.sin(t / 6) * 1.5, 2, r * 0.55); ctx.restore(); } };
    });
  });
  var defOf = function (m) { return m && m.def ? m.def : m; };
  // 段の高さ（マップか定義）
  T76.levelAt = function (m, x, y) {
    var d = defOf(m); var L = d && d.levels76; if (!L) return 0; var row = L[y]; if (!row) return 0; var c = row.charAt(x); var v = c >= '0' && c <= '9' ? c.charCodeAt(0) - 48 : 0; return v;
  };
  T76.has = function (m) { var d = defOf(m); return !!(d && d.levels76); };
  var tileOf = function (m, x, y) { if (m.tiles) return (x < 0 || y < 0 || x >= m.w || y >= m.h) ? null : m.tiles[y][x]; return null; };
  var walk = function (t) { return !!t && TL && !TL.isSolid(t); };
  // 階段・坂の向き：高い側の [dx, dy]（なければ null）。高い側＝となりの段が＋1、低い側＝向かいの段が同じ
  T76.stepDir = function (m, x, y) {
    var t = tileOf(m, x, y); if (!T76.isStair(t)) return null; var L = T76.levelAt(m, x, y);
    var N4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (var k = 0; k < 4; k++) {
      var dx = N4[k][0], dy = N4[k][1]; var hx = x + dx, hy = y + dy, lx = x - dx, ly = y - dy; var th = tileOf(m, hx, hy), tl = tileOf(m, lx, ly);
      if (!walk(th) || !walk(tl)) continue;
      var lh = T76.levelAt(m, hx, hy), ll = T76.levelAt(m, lx, ly);
      var hOk = T76.isStair(th) ? lh === L + 1 : lh === L + 1; var lOk = T76.isStair(tl) ? ll === L - 1 : ll === L;
      if (hOk && lOk) return [dx, dy];
    }
    return null;
  };
  // 決まりの確認（GameMap か { w, h, tiles, def }）。problems：{ a:[x,y], b:[x,y], text }（b は無いこともある）。validate：文の一覧（空なら OK）
  T76.problems = function (m) {
    var out = []; if (!T76.has(m)) return out; var W = m.w, H = m.h;
    var dirs = {}; for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (T76.isStair(m.tiles[y][x])) { var d = T76.stepDir(m, x, y); if (!d) out.push({ a: [x, y], text: '向きのない階段 ' + x + ',' + y }); dirs[x + ',' + y] = d; }
    var lvl = function (x, y) { return T76.levelAt(m, x, y); };
    // となりと接する辺の高さ：平らなマス＝段、階段＝高い側の辺は段＋1・低い側の辺は段・横の辺は「横」（同じ向き・同じ段の階段とだけ並べられる）
    var edge = function (x, y, o) { var t = m.tiles[y][x], L = lvl(x, y); if (!T76.isStair(t)) return { h: L }; var d = dirs[x + ',' + y]; if (!d) return { bad: 1 }; if (d[0] === o[0] && d[1] === o[1]) return { h: L + 1 }; if (d[0] === -o[0] && d[1] === -o[1]) return { h: L }; return { side: d[0] + ',' + d[1] + ',' + L }; };
    for (var y2 = 0; y2 < H; y2++) for (var x2 = 0; x2 < W; x2++) {
      var t = m.tiles[y2][x2]; if (!walk(t)) continue;
      [[1, 0], [0, 1], [1, 1], [-1, 1]].forEach(function (o) {
        var nx = x2 + o[0], ny = y2 + o[1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) return; var tn = m.tiles[ny][nx]; if (!walk(tn)) return;
        if (o[0] && o[1]) { if (T76.isStair(t) || T76.isStair(tn)) return; if (lvl(x2, y2) !== lvl(nx, ny)) out.push({ a: [x2, y2], b: [nx, ny], text: '斜めに段がずれる ' + x2 + ',' + y2 + '／' + nx + ',' + ny }); return; }
        var a = edge(x2, y2, o), b = edge(nx, ny, [-o[0], -o[1]]);
        if (a.bad || b.bad) return;
        if (a.h !== undefined && b.h !== undefined && a.h === b.h) return;
        if (a.side && b.side && a.side === b.side) return;
        out.push({ a: [x2, y2], b: [nx, ny], text: '段がずれて歩ける ' + x2 + ',' + y2 + '／' + nx + ',' + ny + '（' + JSON.stringify(a) + '・' + JSON.stringify(b) + '）' });
      });
    }
    return out;
  };
  T76.validate = function (m) { return T76.problems(m).map(function (p) { return p.text; }); };
  // 計画の道具（js/data/towns76.js が使う）：定義の rows と levels76 を書き換える
  T76.editor = function (def) {
    var rows = def.rows; var H = rows.length, W = rows[0].length;
    if (!def.levels76) { def.levels76 = []; for (var y = 0; y < H; y++) def.levels76.push(new Array(W + 1).join('0')); }
    var set = function (arr, x, y, ch) { if (y < 0 || y >= H || x < 0 || x >= W) return; arr[y] = arr[y].substring(0, x) + ch + arr[y].substring(x + 1); };
    var E = {
      W: W, H: H,
      ch: function (x, y) { return (rows[y] || '').charAt(x); },
      put: function (x, y, ch) { set(rows, x, y, ch); return E; },
      lv: function (x, y) { var c = def.levels76[y] ? def.levels76[y].charAt(x) : '0'; return c.charCodeAt(0) - 48; },
      level: function (x0, y0, x1, y1, L) { for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) set(def.levels76, x, y, String(L)); return E; },
      levelCells: function (cells, L) { cells.forEach(function (p) { set(def.levels76, p[0], p[1], String(L)); }); return E; },
      fill: function (x0, y0, x1, y1, ch, only) { for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) { if (only && only.indexOf(E.ch(x, y)) < 0) continue; set(rows, x, y, ch); } return E; }
    };
    return E;
  };
})(typeof window !== 'undefined' ? window : globalThis);
