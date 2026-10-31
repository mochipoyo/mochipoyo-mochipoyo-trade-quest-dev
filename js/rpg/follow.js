/* =========================================================
   RPG / Follow : 仲間が主人公の後ろをついて歩く隊列（v6.4 Phase F。2D版・3D版で同じ処理）
   ・主人公の位置の履歴（足跡）を残し、仲間 i は「足跡に沿って i マスぶん後ろ」に立つ
     → 曲がり角は主人公と同じ所で曲がり、細い通路では自然に一列。主人公が止まれば仲間も止まる
   ・座標は「マスの中心」単位（マス x の中心が x+0.5）。2D版は px/TS+0.5、3D版はワールド座標（同じ単位）を渡す
   ・足跡は主人公が実際に立った位置だけ → 仲間が壁に埋まる・マップの外へ出ることはない
   ・ワープ・別のマップ・大きな瞬間移動では足跡を作り直す（主人公の向きの反対側へ、通れるマスにだけ並べる）
   ・当たり判定はない（表示だけ）。主人公の進路をふさがず、会話・調べる・イベントの対象にもならない
   ・船・飛空艇に乗っている間と、設定で「表示しない」のときは出さない。セーブには何も書かない（設定 followers だけ）
   ========================================================= */
(function (root) {
  'use strict';
  var Follow = { SPACING: 1, MAX: 3, trail: [], mapId: null };
  var BACK = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] };
  function D() { return root.State && root.State.data; }
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

  Follow.enabled = function () { var d = D(); if (!d) return false; if (d.settings && d.settings.followers === 'off') return false; if (d.aboard) return false; return true; };
  // 隊列に並ぶ仲間：戦闘メンバーの2人目以降（並び順どおり。最大3人。待機メンバーは出さない）
  Follow.members = function () { var d = D(); if (!d || !d.party) return []; var S = root.State; return d.party.slice(1, 1 + Follow.MAX).map(function (id) { return S.actor(id); }).filter(Boolean); };
  Follow.walkable = function (map, x, y) {
    if (!map || x < 0 || y < 0 || x >= map.w || y >= map.h) return false;
    try { if (!map.passable(x, y, D())) return false; } catch (e) { return false; }
    if (map.warpAt && map.warpAt(x, y)) return false; if (map.eventAt && map.eventAt(x, y)) return false;
    return true;
  };
  Follow.reset = function (map, cx, cy, dir) {
    Follow.mapId = map ? map.id : null; Follow.trail = [{ x: cx, y: cy }];
    var bk = BACK[dir]; if (!map || !bk) return;
    var tx = Math.floor(cx), ty = Math.floor(cy);
    for (var k = 1; k <= Follow.MAX; k++) { var nx = tx + bk[0] * k, ny = ty + bk[1] * k; if (!Follow.walkable(map, nx, ny)) break; Follow.trail.push({ x: nx + 0.5, y: ny + 0.5 }); }
  };
  // 毎フレーム：主人公の位置（マスの中心単位）を渡す
  Follow.update = function (map, cx, cy, dir) {
    if (!map) return;
    var d = D(); if (d && d.aboard) { Follow.mapId = null; Follow.trail = []; return; }   // 乗船中は足跡を残さない（降りたときに作り直す）
    if (map.id !== Follow.mapId || !Follow.trail.length) { Follow.reset(map, cx, cy, dir); return; }
    var h = Follow.trail[0]; var dd = dist(h, { x: cx, y: cy });
    if (dd > 1.6) { Follow.reset(map, cx, cy, dir); return; }   // ワープ・瞬間移動
    if (dd < 0.04) return;
    Follow.trail.unshift({ x: cx, y: cy });
    var len = 0, need = Follow.MAX * Follow.SPACING + 0.6;
    for (var i = 1; i < Follow.trail.length; i++) { len += dist(Follow.trail[i - 1], Follow.trail[i]); if (len > need) { Follow.trail.length = i + 1; break; } }
  };
  // 足跡に沿って s マス後ろの点と、そこでの進む向き（vx, vy）。足跡が足りなければ null（＝まだ並べない）
  Follow.sample = function (s) {
    var t = Follow.trail; if (t.length < 2) return null; var acc = 0;
    for (var i = 1; i < t.length; i++) { var a = t[i - 1], b = t[i]; var L = dist(a, b); if (L <= 0) continue; if (acc + L >= s - 1e-6) { var f = Math.min(1, (s - acc) / L); return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, vx: a.x - b.x, vy: a.y - b.y }; } acc += L; }
    return null;
  };
  Follow.dirOf = function (vx, vy) { return Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up'); };
  // いま表示する仲間の位置（主人公や前の仲間と重なる者は出さない：来た道を引き返した直後など）
  Follow.positions = function () {
    if (!Follow.enabled() || !Follow.trail.length) return [];
    var head = Follow.trail[0]; var placed = [head]; var out = [];
    Follow.members().forEach(function (a, i) {
      var p = Follow.sample((i + 1) * Follow.SPACING); if (!p) return;
      if (placed.some(function (q) { return dist(q, p) < 0.45; })) return;
      placed.push(p); out.push({ id: a.id, actor: a, sprite: a.sprite, x: p.x, y: p.y, vx: p.vx, vy: p.vy, dir: Follow.dirOf(p.vx, p.vy), dead: !!a.dead, index: i });
    });
    return out;
  };
  // 2D版の描画用（ピクセル座標。歩きの足は主人公と同じ周期）
  Follow.drawList = function (TS, player) {
    return Follow.positions().map(function (f) { var mv = !!(player && player.moving); return { id: f.id, sprite: f.sprite, dir: f.dir, px: (f.x - 0.5) * TS, py: (f.y - 0.5) * TS, frame: mv ? player.frame : 0, phase: mv ? player.phase : 0, alpha: f.dead ? 0.45 : 1 }; });
  };
  // NPC が歩くとき、仲間の立っているマスへは入らない（見た目の重なりを防ぐ。仲間側は当たり判定なし）
  Follow.occupies = function (x, y) { return Follow.positions().some(function (f) { return Math.floor(f.x) === x && Math.floor(f.y) === y; }); };

  root.Follow = Follow;
})(typeof window !== 'undefined' ? window : globalThis);
