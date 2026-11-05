/* =========================================================
   Data / mob76（v7.6）：同じ絵の町の人（村人・子ども・老人・商人）に、地域ごとのかぶり物・装いを足す（見た目だけ）
   ・対象：スプライトが villager_m / villager_f / child / elder / merchant の NPC（町・村・城・建物の中・フィールド）
   ・地域（BattleBG65.regionOf）ごとに似合う物の組から、NPC の ID で決まった1つ（または「なし」）を選ぶ
     例：雪国＝毛皮の帽子・ニット帽／砂漠＝ターバン・ベール／魔導王国＝とんがり帽子／機械の島＝バイザー帽／鉱山＝ヘルメット／
         火山の鍛冶街＝ゴーグル／鐘の都＝シルクハット・ベレー帽／港・島＝バンダナ・麦わら帽子
   ・2D：歩く絵（assets/characters/overworld の 16×24 の絵）の上に、ドットでかぶり物を描く（js/core/map.js の drawChar から）
   ・3D：three-src/src/entities/MobDress76.js が頭の骨に小さな立体を付ける（MapScene3D から）
   ・NPC のデータ（ID・スプライト・会話・位置）とセーブは変えない。設定の「建物の作り込み」を「なし」にすると 3D は付けない（2D は付ける）
   ・コードで描いた仮の装い（画像素材ではない）。素材の仕様は docs/v76/ENEMY_ART76.md の「町の人の装い」
   ========================================================= */
(function (root) {
  'use strict';
  var GENERIC = { villager_m: 1, villager_f: 1, child: 1, elder: 1, merchant: 1 };
  var REGION = {
    arcadia: ['straw', 'kerchief', null, null], grania: ['helmet', 'helmet', 'kerchief', null], kalion: ['beret', 'kerchief', 'beret', null], islands: ['bandana', 'straw', 'bandana', null],
    desert: ['turban', 'veil', 'turban', 'veil'], tempus: ['tophat', 'beret', 'tophat', null], machine: ['visor', 'visor', null], magicka: ['wizard', 'wizard', 'beret', null],
    snow: ['furhat', 'beanie', 'furhat', 'beanie'], dragon: ['goggles', 'goggles', 'kerchief', null], sky: ['feather', 'feather', null], dark: ['hood', 'hood', 'helmet']
  };
  var COLS = ['#c83a3a', '#3a6ac8', '#3a9a5a', '#c89a2a', '#8a4ab8', '#e07a3a'];
  var regionCache = {};
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function regionOf(map) { var id = map && (map.id || (map.def && map.def.id)); if (!id) return null; if (regionCache[id] !== undefined) return regionCache[id]; var r = null; try { r = root.BattleBG65 && root.BattleBG65.regionOf ? root.BattleBG65.regionOf(id) : null; } catch (e) { r = null; } regionCache[id] = r; return r; }
  // その NPC のかぶり物：{ kind, col, seed } または null
  function kindFor(map, n) {
    if (!n || !GENERIC[n.sprite] || n.noDress76) return null; var reg = regionOf(map); var list = REGION[reg]; if (!list) return null;
    var h = hash((n.id || '') + ':' + n.sprite); var kind = list[h % list.length]; if (!kind) return null;
    if (n.sprite === 'child' && (kind === 'tophat' || kind === 'helmet')) kind = 'beanie';
    return { kind: kind, col: COLS[(h >>> 4) % COLS.length], seed: h };
  }
  // ---- 2D：16×24 の歩く絵の上にドットで描く（ox, oy：絵の左上。S：1ドットの大きさ）
  function draw2d(ctx, k, dir, ox, oy, S) {
    if (!k) return; var front = dir === 'down';
    var R = function (x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(ox + x * S, oy + y * S, w * S, h * S); };
    var c = k.col;
    switch (k.kind) {
      case 'straw': R(4, 0, 8, 3, '#d8b060'); R(4, 2, 8, 1, '#a8483a'); R(1, 3, 14, 1, '#e8c878'); R(2, 4, 12, 1, 'rgba(120,90,40,0.35)'); break;
      case 'kerchief': R(3, 1, 10, 3, c); R(4, 1, 8, 1, 'rgba(255,255,255,0.25)'); R(dir === 'left' ? 2 : 12, 3, 2, 2, c); break;
      case 'helmet': R(3, 0, 10, 3, '#e8c15a'); R(4, 0, 8, 1, '#fff0a0'); R(2, 3, 12, 1, '#b8913a'); if (front) { R(7, 1, 2, 2, '#fff8c0'); } break;
      case 'beret': R(3, 1, 10, 2, c); R(2, 2, 12, 1, c); R(4, 1, 8, 1, 'rgba(255,255,255,0.2)'); R(7, 0, 2, 1, c); break;
      case 'bandana': R(3, 1, 10, 3, '#c83a3a'); for (var i = 0; i < 4; i++) R(4 + i * 2, 1 + (i % 2), 1, 1, '#ffffff'); R(dir === 'left' ? 1 : 13, 3, 2, 1, '#c83a3a'); R(dir === 'left' ? 1 : 13, 4, 1, 2, '#a82a2a'); break;
      case 'turban': R(2, -1, 12, 5, '#f0e6d0'); R(3, -2, 10, 1, '#f0e6d0'); R(2, 0, 12, 1, '#d8c8a8'); R(2, 2, 12, 1, '#d8c8a8'); if (front) { R(7, 1, 2, 2, '#c83a3a'); } break;
      case 'veil': R(2, 0, 12, 4, '#d8b888'); R(3, 0, 10, 1, '#e8cca0'); if (dir !== 'right') R(2, 4, 2, 7, '#c8a878'); if (dir !== 'left') R(12, 4, 2, 7, '#c8a878'); if (dir === 'up') R(4, 4, 8, 6, '#c8a878'); break;
      case 'tophat': R(4, -6, 8, 7, '#26262e'); R(5, -6, 2, 6, '#3a3a46'); R(4, -1, 8, 1, '#a8483a'); R(2, 1, 12, 1, '#26262e'); break;
      case 'visor': R(3, 0, 10, 3, '#6a7078'); R(4, 0, 8, 1, '#8a9098'); if (front) R(3, 6, 10, 1, '#5ad8ff'); else if (dir === 'left') R(2, 6, 5, 1, '#5ad8ff'); else if (dir === 'right') R(9, 6, 5, 1, '#5ad8ff'); break;
      case 'wizard': var rows = [[7, 2], [7, 2], [6, 4], [6, 4], [5, 6], [5, 6], [4, 8], [4, 8]]; rows.forEach(function (r, i) { R(r[0], -7 + i, r[1], 1, '#5a3a9a'); }); R(1, 1, 14, 1, '#4a2a8a'); R(4, 0, 8, 1, '#ffd24a'); if (front) R(7, -3, 1, 1, '#ffd24a'); break;
      case 'furhat': R(3, -1, 10, 4, '#6a4a32'); R(4, -1, 8, 1, '#8a6a4a'); R(2, 2, 12, 2, '#f0f0ec'); R(3, 3, 10, 1, '#d8d8d4'); break;
      case 'beanie': R(3, 0, 10, 3, c); R(3, 2, 10, 1, 'rgba(0,0,0,0.2)'); for (var j = 0; j < 5; j++) R(4 + j * 2, 2, 1, 1, 'rgba(255,255,255,0.25)'); R(7, -2, 2, 2, '#f4f4f4'); break;
      case 'goggles': R(3, 3, 10, 1, '#5a3a24'); if (front) { R(4, 2, 3, 3, '#2a2a2a'); R(9, 2, 3, 3, '#2a2a2a'); R(5, 3, 1, 1, '#ffb84a'); R(10, 3, 1, 1, '#ffb84a'); } else if (dir !== 'up') R(dir === 'left' ? 3 : 10, 2, 3, 3, '#2a2a2a'); break;
      case 'feather': R(3, 3, 10, 1, '#c8a050'); R(12, -3, 1, 6, '#f4f4f4'); R(13, -4, 1, 4, '#bfe0ff'); R(11, -1, 1, 2, '#bfe0ff'); break;
      case 'hood': R(3, 0, 10, 3, '#3a3448'); if (dir !== 'right') R(2, 2, 2, 9, '#3a3448'); if (dir !== 'left') R(12, 2, 2, 9, '#3a3448'); if (dir === 'up') R(3, 3, 10, 8, '#3a3448'); break;
    }
  }
  root.Mob76 = { GENERIC: GENERIC, REGION: REGION, kindFor: kindFor, draw2d: draw2d, regionOf: regionOf };
})(typeof window !== 'undefined' ? window : globalThis);
