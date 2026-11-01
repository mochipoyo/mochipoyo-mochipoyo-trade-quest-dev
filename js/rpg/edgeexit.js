/* =========================================================
   RPG / EdgeExit（v6.5）：村・町の「開いている外周」から、そのまま外のフィールドへ出る
   ・マップごとに「出られる外周の区間（辺と範囲）」を登録したところだけが出口になる（全周を出口にはしない）
     登録は下の DEFS か、マップの定義の edgeExits：[{ side: 'top'|'bottom'|'left'|'right', range: [始まり, 終わり] }]
   ・出口になるのは、その区間のうち、主人公が実際に立てる（通れる）外周のマスだけ。壁・建物・水・人の上からは出ない
   ・出た先：町のいつもの出口と同じフィールドの、町の印から「出た向き」の側にある通れるマス
     （いつもの出口の着地点から、歩いて行ける範囲だけを探す → 関所・門・川の向こうなどへ抜けない／埋まらない）
     見つからなければ、いつもの出口の着地点に出る
   ・いつもの出口が物語の条件（needFlag）で閉じているあいだは、外周からも出られない（理由を表示。フラグは変えない）
   ・今あるワープ（出口・建物の扉）はそのまま。外周の出口は「ワープのない外周のマス」から外へ進んだときだけ働く
   ========================================================= */
(function (root) {
  'use strict';

  var EdgeExit = {};
  // 町ごとの外周の出口（座標は拡大・増築を反映した最終のマップのもの。テスト edgeexittest.js で、区間のマスが外周の通れるマスかを確かめている）
  EdgeExit.DEFS = {
    // 港町マリナ：北・西・東の外周が草地のまま開いている（南は海）。北の真ん中（24〜27）は今までどおりの出口のワープ
    harbor_town: [
      { side: 'top', range: [0, 23] }, { side: 'top', range: [28, 51] },
      { side: 'left', range: [0, 27] }, { side: 'right', range: [0, 27] }
    ],
    // 地図から消えた村：北の端まで道が続いている（出口は南）
    erased_village: [{ side: 'top', range: [11, 12] }]
  };
  var SIDE = { up: 'top', down: 'bottom', left: 'left', right: 'right' };
  var VEC = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };
  var FACE = { top: 'up', bottom: 'down', left: 'left', right: 'right' };
  var MAX_STEPS = 14;   // いつもの出口の着地点から何歩まで探すか

  function defs() { return root.MAP_DEFS || {}; }
  function flags() { return (root.State && root.State.data && root.State.data.flags) || {}; }
  EdgeExit.segments = function (m) { if (!m || !m.def) return []; return m.def.edgeExits || EdgeExit.DEFS[m.id] || []; };
  function onSide(m, x, y, side) { return side === 'top' ? y === 0 : side === 'bottom' ? y === m.h - 1 : side === 'left' ? x === 0 : side === 'right' ? x === m.w - 1 : false; }
  function along(x, y, side) { return (side === 'top' || side === 'bottom') ? x : y; }

  // (x, y) から dir へ進むと外周の出口になるか → その区間（なければ null）
  EdgeExit.find = function (m, x, y, dir) {
    var side = SIDE[dir]; if (!side || !onSide(m, x, y, side)) return null;
    if (m.warpAt(x, y)) return null;   // ワープのあるマスは今までどおり
    var pos = along(x, y, side), segs = EdgeExit.segments(m);
    for (var i = 0; i < segs.length; i++) { var s = segs[i]; if (s.side === side && pos >= s.range[0] && pos <= s.range[1]) return s; }
    return null;
  };

  // 町のいつもの出口（フィールドへのワープ）のうち、(x, y) にいちばん近いもの。区間に dest があればそれを使う
  EdgeExit.baseExit = function (m, seg, x, y) {
    if (seg && seg.dest) return { to: seg.dest.map, tx: seg.dest.x, ty: seg.dest.y, needFlag: seg.needFlag, lockedText: seg.lockedText, name: seg.name || '町の外へ' };
    var D = defs(), best = null, bd = 1e9;
    (m.warps || []).forEach(function (w) { var td = D[w.to]; if (!td || !(td.kind === 'field' || td.region)) return; var dd = Math.abs(w.x - x) + Math.abs(w.y - y); if (dd < bd) { bd = dd; best = w; } });
    if (!best) return null;
    var b = Object.assign({}, best); if (seg && seg.needFlag) { b.needFlag = seg.needFlag; if (seg.lockedText) b.lockedText = seg.lockedText; }
    return b;
  };

  // 出た先のフィールドのマス
  EdgeExit.destination = function (m, seg, x, y, getMap) {
    var base = EdgeExit.baseExit(m, seg, x, y); if (!base) return null;
    getMap = getMap || (root.World && root.World.getMap);
    var F = getMap(base.to); var d = root.State ? root.State.data : null;
    var ok = function (cx, cy) {
      if (cx < 0 || cy < 0 || cx >= F.w || cy >= F.h) return false;
      if (!F.passable(cx, cy, d) || F.warpAt(cx, cy) || F.eventAt(cx, cy) || F.chestAt(cx, cy)) return false;
      if (root.Tiles && root.Tiles.isWater && root.Tiles.isWater(F.tiles[cy][cx])) return false;
      if (root.Vehicle && root.Vehicle.at && root.Vehicle.at(F.id, cx, cy)) return false;
      return true;
    };
    var start = { x: base.tx, y: base.ty };
    if (!ok(start.x, start.y) && root.World && root.World.nearestFree) { var nf = root.World.nearestFree(F, start.x, start.y); if (nf) start = nf; }
    var L = null, ld = 1e9;
    (F.def.locations || []).forEach(function (l) { if (l.to !== m.id) return; var dd = Math.abs(l.x - base.tx) + Math.abs(l.y - base.ty); if (dd < ld) { ld = dd; L = l; } });
    var anchor = L ? { x: L.x, y: L.y } : { x: base.tx, y: base.ty };
    var v = VEC[seg.side], dist = seg.dist || 1;
    var want = { x: anchor.x + v[0] * dist, y: anchor.y + v[1] * dist };
    var rightSide = function (cx, cy) { return seg.side === 'top' ? cy < anchor.y : seg.side === 'bottom' ? cy > anchor.y : seg.side === 'left' ? cx < anchor.x : cx > anchor.x; };
    // いつもの出口の着地点から歩いて行けるマスだけを探す（幅優先）
    var seen = {}, q = [[start.x, start.y, 0]], pick = null, pickScore = 1e9; seen[start.x + ',' + start.y] = 1;
    while (q.length) {
      var c = q.shift(); var cx = c[0], cy = c[1], st = c[2];
      if (ok(cx, cy) && rightSide(cx, cy)) { var sc = (Math.abs(cx - want.x) + Math.abs(cy - want.y)) * 100 + st; if (sc < pickScore) { pickScore = sc; pick = { x: cx, y: cy, steps: st }; } }
      if (st >= MAX_STEPS) continue;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (dv) { var nx = cx + dv[0], ny = cy + dv[1], k = nx + ',' + ny; if (seen[k]) return; seen[k] = 1; if (ok(nx, ny)) q.push([nx, ny, st + 1]); });
    }
    var tgt = pick || { x: start.x, y: start.y, steps: 0, fallback: true };
    return { to: base.to, tx: tgt.x, ty: tgt.y, face: FACE[seg.side], name: base.name || '町の外へ', base: base, anchor: anchor, fallback: !!tgt.fallback, steps: tgt.steps };
  };

  // World.tryMove から：外へ進もうとしたとき。出口なら出る（または閉じている理由を表示）して true
  EdgeExit.tryLeave = function (m, x, y, dir) {
    var W = root.World; if (!W || W.busy) return false;
    var d = root.State && root.State.data; if (d && d.aboard) return false;
    var seg = EdgeExit.find(m, x, y, dir); if (!seg) return false;
    var base = EdgeExit.baseExit(m, seg, x, y); if (!base) return false;
    if (base.needFlag && !flags()[base.needFlag]) { if (!base.hidden) W.lockedWarp(base); return !base.hidden; }
    var dest = EdgeExit.destination(m, seg, x, y); if (!dest) return false;
    if (m.def.onStep) { try { m.def.onStep(m, W.player, true); } catch (e) { console.error(e); } }   // いつもの出口と同じく「マップを出る」処理
    W.doWarp({ to: dest.to, tx: dest.tx, ty: dest.ty, name: dest.name, face: dest.face, edge: true });
    return true;
  };

  // テスト・確認用：マップの外周で、通れるのにワープのないマス（＝外周の出口の候補）
  EdgeExit.openEdges = function (m, state) {
    var out = [];
    var chk = function (x, y, side) { if (m.passable(x, y, state) && !m.warpAt(x, y)) out.push({ x: x, y: y, side: side }); };
    for (var x = 0; x < m.w; x++) { chk(x, 0, 'top'); chk(x, m.h - 1, 'bottom'); }
    for (var y = 0; y < m.h; y++) { chk(0, y, 'left'); chk(m.w - 1, y, 'right'); }
    return out;
  };

  root.EdgeExit = EdgeExit;
})(typeof window !== 'undefined' ? window : globalThis);
