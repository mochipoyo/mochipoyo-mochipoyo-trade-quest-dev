/* =========================================================
   WarpMark（v7.0）：階段・ダンジョンの出入口の目印（2D・3D 共通のデータ）
   ・階段のマス（stairs_down／stairs_up）：どのマップでも「▼ 下り階段」「▲ 上り階段」
   ・ダンジョン（kind 'dungeon'）の出入口：床・扉・壁の穴の上にあっても目印を出す
       ▼ 下へ／▲ 上へ（行き先の戻りの出入口が上り／下り階段のとき）・出口（フィールド・町へ）・▶ 先へ／◀ 戻る（入口から遠くなるか近くなるか）
   ・屋内（kind 'interior'）：扉（家の出口）以外で、屋内・ダンジョンへつながる出入口だけ（城の階など）
   ・町・フィールド：階段のマスだけ。建物の扉（bld_door）には出さない
   ・隠し部屋の出入口（hidden）は条件のフラグが立つまで出さない。閉ざされた出入口（needFlag・隠しでない）は灰色で「（閉）」
   ・となり合う同じ行き先の出入口（2〜4マスの出口）は1つにまとめる（中心に1つ）
   3D 版は three-src/src/world/MapScene3D.js の updateWarpMarks が同じ WarpMark.list を毎フレーム写す
   ========================================================= */
(function (root) {
  'use strict';
  var WarpMark = {};
  WarpMark.COLORS = { down: '#58b0ff', up: '#ffb84a', exit: '#5ce08a', next: '#46e0ff', back: '#c4c4d4', locked: '#8a8a8a' };
  var maps = {};
  function defOf(id) { return root.MAP_DEFS && root.MAP_DEFS[id]; }
  function isField(id) { var d = defOf(id); return /^world/.test(id) || !!(d && d.region) || !!(d && d.kind === 'field'); }
  function kindOf(id) { var d = defOf(id); return d ? (d.kind || 'town') : null; }
  function gm(id) {
    if (Object.prototype.hasOwnProperty.call(maps, id)) return maps[id];
    var d = defOf(id); var m = null; if (d && root.GameMap) { try { m = new root.GameMap(d); } catch (e) { m = null; } }
    maps[id] = m; return m;
  }
  // 入口（フィールド）から何回の出入りでその場所に着くか（ダンジョンの「先へ／戻る」に使う）。最初に使うときに1回だけ数える
  var DEPTH = null;
  function depth(id) {
    if (!DEPTH) {
      DEPTH = {}; var q = []; var D = root.MAP_DEFS || {};
      Object.keys(D).forEach(function (k) { if (isField(k)) { DEPTH[k] = 0; q.push(k); } });
      while (q.length) {
        var a = q.shift(); var ma = isField(a) ? null : gm(a); var ws = ma ? ma.warps : ((D[a] && D[a].warps) || []);
        if (isField(a)) { var L = (D[a] && D[a].locations) || root.WORLD_LOCATIONS || []; ws = ws.concat((L || []).filter(function (x) { return x && x.to; })); }
        ws = ws.concat(((D[a] && D[a].events) || []).filter(function (e) { return e && e.to; }));   // 潜る・乗るなどの出来事で行く場所（海底都市など）
        ws.forEach(function (w) { if (!w || !w.to || DEPTH[w.to] !== undefined || !D[w.to]) return; DEPTH[w.to] = DEPTH[a] + 1; q.push(w.to); });
      }
    }
    return DEPTH[id] === undefined ? null : DEPTH[id];
  }
  WarpMark.reset = function () { maps = {}; DEPTH = null; };
  WarpMark.depth = depth;

  function classify(m, w, t) {
    if (t === 'stairs_down') return 'down';
    if (t === 'stairs_up') return 'up';
    if (isField(w.to)) return 'exit';
    var tm = gm(w.to);
    if (tm) {   // 行き先にある「ここへ戻る出入口」が上り階段なら、ここからは下りる（逆も同じ）
      var best = null, bd = 1e9;
      tm.warps.forEach(function (r) { if (r.to !== m.id) return; var dd = Math.abs(r.x - w.tx) + Math.abs(r.y - w.ty); if (dd < bd) { bd = dd; best = r; } });
      if (best && bd <= 3) { var rt = tm.tiles[best.y] && tm.tiles[best.y][best.x]; if (rt === 'stairs_up') return 'down'; if (rt === 'stairs_down') return 'up'; }
    }
    var tk = kindOf(w.to); if (tk === 'town' || tk === 'village' || tk === 'castle') return 'exit';
    var a = depth(m.id), b = depth(w.to);
    if (a !== null && b !== null && b < a) return 'back';
    return 'next';
  }
  WarpMark.classify = classify;
  var LABEL = { down: ['▼ 下り階段', '▼ 下へ'], up: ['▲ 上り階段', '▲ 上へ'], exit: ['出口', '出口'], next: ['▶ 先へ', '▶ 先へ'], back: ['◀ 戻る', '◀ 戻る'] };

  // マップ m の目印の一覧 [{ x, y（中心。まとめたときは小数）, w（まとめたマス数）, kind, stairs, locked, label, color, to }]
  WarpMark.list = function (m, st) {
    st = st || (root.State && root.State.data); var flags = (st && st.flags) || {};
    if (!m || !m.warps || !m.tiles) return [];
    var mk = m.kind || 'town'; var raw = [];
    m.warps.forEach(function (w) {
      if (!w || w.x < 0 || w.y < 0 || w.x >= m.w || w.y >= m.h || !defOf(w.to)) return;
      var open = !w.needFlag || !!flags[w.needFlag];
      if (!open && w.hidden) return;   // 隠し部屋：見つけるまで出さない
      var t = m.tiles[w.y][w.x]; var stairs = t === 'stairs_down' || t === 'stairs_up';
      if (!open && root.Tiles && root.Tiles.isSolid(t)) return;   // 壁の中の隠し通路（開くまで壁のまま）も出さない
      if (!stairs) {
        if (mk !== 'dungeon' && mk !== 'interior') return;
        if (t === 'bld_door') return;
        if (mk === 'interior' && (t === 'door' || isField(w.to) || kindOf(w.to) === 'town' || kindOf(w.to) === 'village')) return;   // 家の出口
      }
      raw.push({ x: w.x, y: w.y, to: w.to, kind: classify(m, w, t), stairs: stairs, locked: !open });
    });
    // となり合う同じ行き先・同じ種類はまとめる
    var used = {}; var out = [];
    raw.forEach(function (r, i) {
      if (used[i]) return; var grp = [r]; used[i] = true;
      for (var k = 0; k < grp.length; k++) raw.forEach(function (s, j) { if (used[j] || s.to !== r.to || s.kind !== r.kind || s.locked !== r.locked) return; if (Math.abs(s.x - grp[k].x) <= 1 && Math.abs(s.y - grp[k].y) <= 1) { used[j] = true; grp.push(s); } });
      var cx = 0, cy = 0; grp.forEach(function (g) { cx += g.x; cy += g.y; }); cx /= grp.length; cy /= grp.length;
      var lab = LABEL[r.kind][r.stairs ? 0 : 1] + (r.locked ? '（閉）' : '');
      out.push({ x: cx, y: cy, n: grp.length, kind: r.kind, stairs: r.stairs, locked: r.locked, label: lab, color: r.locked ? WarpMark.COLORS.locked : WarpMark.COLORS[r.kind], to: r.to, tiles: grp.map(function (g) { return [g.x, g.y]; }) });
    });
    return out;
  };
  // 目印の一覧が変わったか（フラグで隠し部屋が開いたなど）を調べるための文字列
  WarpMark.key = function (list) { return list.map(function (o) { return o.kind + (o.locked ? 'L' : '') + '@' + o.x + ',' + o.y; }).join('|'); };

  /* ---------- 2D 版の表示：目印の上に、色つきの矢印（ゆっくり上下）と、近くにいるときは文字 ---------- */
  var cache2d = { m: null, key: '', list: [] , t: 0 };
  WarpMark.draw2D = function (ctx, m, cam, player, TS) {
    if (!ctx || !m) return; var now = Date.now();
    if (cache2d.m !== m || now - cache2d.t > 600) { cache2d.m = m; cache2d.t = now; try { cache2d.list = WarpMark.list(m); } catch (e) { cache2d.list = []; } }
    var L = cache2d.list; if (!L.length) return;
    var W = ctx.canvas.width, H = ctx.canvas.height;
    L.forEach(function (o, i) {
      var sx = (o.x + 0.5) * TS - cam.x, sy = (o.y + 0.5) * TS - cam.y; if (sx < -TS * 2 || sy < -TS * 2 || sx > W + TS * 2 || sy > H + TS * 2) return;
      var ph = Math.sin(now / 380 + i), bob = ph * TS * 0.06; var c = o.color;
      ctx.save();
      // 足もとの光（塗りの楕円）
      ctx.globalAlpha = o.locked ? 0.25 : 0.32 + 0.12 * ph; ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(sx, sy + TS * 0.18, TS * (0.42 + 0.5 * (o.n - 1) * (o.tiles.length > 1 && o.tiles[0][1] === o.tiles[1][1] ? 1 : 0.3)), TS * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      // 矢印（下り＝下向き・上り＝上向き・ほか＝下向きの目印）
      ctx.globalAlpha = o.locked ? 0.55 : 0.95; var ay = sy - TS * 0.62 + bob, s = TS * 0.2; var up = o.kind === 'up';
      ctx.fillStyle = c; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = Math.max(1, TS / 16);
      ctx.beginPath(); if (up) { ctx.moveTo(sx, ay - s); ctx.lineTo(sx + s, ay + s * 0.4); ctx.lineTo(sx + s * 0.38, ay + s * 0.4); ctx.lineTo(sx + s * 0.38, ay + s * 1.1); ctx.lineTo(sx - s * 0.38, ay + s * 1.1); ctx.lineTo(sx - s * 0.38, ay + s * 0.4); ctx.lineTo(sx - s, ay + s * 0.4); }
      else { ctx.moveTo(sx, ay + s * 1.1); ctx.lineTo(sx + s, ay - s * 0.3); ctx.lineTo(sx + s * 0.38, ay - s * 0.3); ctx.lineTo(sx + s * 0.38, ay - s); ctx.lineTo(sx - s * 0.38, ay - s); ctx.lineTo(sx - s * 0.38, ay - s * 0.3); ctx.lineTo(sx - s, ay - s * 0.3); }
      ctx.closePath(); ctx.stroke(); ctx.fill();
      // 文字：主人公から7マス以内
      var near = player ? Math.hypot(player.x - o.x, player.y - o.y) : 0;
      if (near <= 7) {
        ctx.globalAlpha = Math.min(1, (7.5 - near) / 2); ctx.font = 'bold ' + Math.max(10, Math.round(TS * 0.36)) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = Math.max(2, TS / 10); ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(o.label, sx, ay - s - 2); ctx.fillStyle = '#ffffff'; ctx.fillText(o.label, sx, ay - s - 2);
      }
      ctx.restore();
    });
  };

  root.WarpMark = WarpMark;
})(typeof window !== 'undefined' ? window : globalThis);
