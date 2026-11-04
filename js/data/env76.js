/* =========================================================
   Data / v7.6 環境リデザイン：論理のマップ（2D版と3D版が共通で使うタイル）の間取りの変更
   ・3Dの見た目だけを動かすのではなく、歩ける所・柱などの論理のタイルを変える（2D版でも同じ間取りになる）
   ・各変更は「いまの文字が期待どおりのときだけ」書き換える（後段の変更で地図がずれていたら、書き換えずに記録する＝ENV76.skipped）
   ・NPC・宝箱・ワープ・イベント・階段のマスには置かない（ENV76.check で確かめる。docs/tools/env/ のテストも同じ確認をする）
   ・3D版の作り直し（three-src/src/environment/recipes/）が、このタイルに合わせて形を作る
   ========================================================= */
(function (root) {
  'use strict';
  var D = root.MAP_DEFS; if (!D) return;
  var R = root.ENV76 = { version: 1, applied: [], skipped: [] };
  // [マップ, 文字, 期待する今の文字, [x, y]...]
  var PATCH = [
    // リヴェル城 1階：絨毯（儀礼の軸）の両側に列柱。主軸（身廊）は広く、側廊は狭く。柱と柱の間は通れる（1マスおき）
    ['rivel_castle', 'I', ':', [[11, 5], [11, 9], [11, 13], [11, 17], [11, 21], [20, 5], [20, 9], [20, 13], [20, 17], [20, 21]]],
    // ポヨ村：中央の緑地（教会の西）の 2×2 マスを木に（村の大樹。3D版は1本の大樹と石囲い）。まわりは歩ける
    ['poyo_village', 'f', '.', [[27, 12], [28, 12], [27, 13], [28, 13]]]
  ];
  function setCh(row, x, ch) { return row.substring(0, x) + ch + row.substring(x + 1); }
  PATCH.forEach(function (p) {
    var def = D[p[0]]; if (!def || !Array.isArray(def.rows)) { R.skipped.push(p[0] + '：rows がない'); return; }
    var busy = {}; (def.npcs || []).forEach(function (n) { busy[n.x + ',' + n.y] = 'npc ' + n.id; }); (def.chests || []).forEach(function (c) { busy[c.x + ',' + c.y] = 'chest ' + c.id; });
    (def.warps || []).forEach(function (q) { busy[q.x + ',' + q.y] = 'warp'; }); (def.events || []).forEach(function (e) { busy[e.x + ',' + e.y] = 'event'; });
    var ok = 0;
    p[3].forEach(function (xy) {
      var x = xy[0], y = xy[1]; var row = def.rows[y];
      if (!row || row.charAt(x) !== p[2] || busy[x + ',' + y]) { R.skipped.push(p[0] + ' ' + x + ',' + y + '：' + (busy[x + ',' + y] || ('いまの文字 ' + (row ? row.charAt(x) : '?')))); return; }
      def.rows[y] = setCh(row, x, p[1]); ok++;
    });
    R.applied.push(p[0] + '：' + ok + 'マス');
  });
})(typeof window !== 'undefined' ? window : globalThis);
