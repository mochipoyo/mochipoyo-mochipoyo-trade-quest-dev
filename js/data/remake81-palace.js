/* =========================================================
   Data / v8.1 魔導王宮（magicka_palace・2f・3f）：中央の魔導装置を外周の観測廊から巡り、天文の間へ
   ・住む理由：王宮の真ん中を貫く魔導の結晶（中央魔導装置）を守り、星を読む
   ・入口から最初に見える物：入ってすぐ、柵で囲んだ吹き抜けの底に光る結晶。その向こうに玉座
   ・道：1 階＝入口から吹き抜けを囲む観測廊を回り、北西の階段で 2 階へ（北東の階段は地下の装置の間へ）
     2 階＝北の廊下から、吹き抜け（結晶の頭）を囲む観測廊へ。西に評議の間と研究室、東に書庫と大臣の執務室（封印の扉）。北東の階段で 3 階へ
     3 階＝天文の間（円い床・天球儀・望遠鏡・星図）
   ・境界：屋内。地下（magicka_palace_b1）はそのまま
   ・人・出来事・宝箱・ワープはそのまま（位置だけ）。大臣の執務室の封印（minister_defeated）もそのまま
   ========================================================= */
(function (root) {
  'use strict';
  var R = root.Remake81; if (!R) return;
  R.define('magicka_palace', {
    version: 1, arrive: [11, 18],
    rows: function (canvas) {
      var C = canvas(24, 20, ':'); C.frame(0, 0, 24, 20, 'C'); C.set(11, 19, 'D'); C.set(12, 19, 'D');
      C.rect(9, 1, 6, 2, 'p');   // 玉座の段
      C.frame(8, 7, 8, 6, 'x'); C.rect(9, 8, 6, 4, ':'); C.rect(11, 9, 2, 2, 'X');   // 吹き抜けの柵と、底の結晶（中央魔導装置の頭）
      C.rect(11, 13, 2, 6, 'p'); C.rect(11, 3, 2, 4, 'p');   // 入口から吹き抜けへ・吹き抜けから玉座へ（敷物）
      [[5, 4], [18, 4], [5, 15], [18, 15], [5, 9], [18, 9]].forEach(function (p) { C.set(p[0], p[1], 'I'); });
      C.rect(1, 5, 1, 8, 'K'); C.rect(22, 5, 1, 8, 'K'); C.set(1, 1, '<'); C.set(22, 1, '>'); C.set(19, 17, 't'); C.set(4, 17, 'z');
      return C;
    },
    npcs: { mp_king: [11, 1, 'down', 0], mp_volk: [14, 2, 'left', 0], mp_guard: [10, 17, 'right', 0], magicka_palace_a73_0: [6, 11, 'down', 2], magicka_palace_a73_1: [17, 5, 'down', 2], u73_lunaria: [18, 17, 'left', 0] },
    points: { opt_070: [20, 13] },
    warps: [{ x: 11, y: 19, to: 'magicka_city', tx: 21, ty: 8 }, { x: 12, y: 19, to: 'magicka_city', tx: 21, ty: 8 },
      { x: 1, y: 1, to: 'magicka_palace_2f', tx: 2, ty: 7, name: '2階へ' }, { x: 22, y: 1, to: 'magicka_palace_b1', tx: 17, ty: 2, name: '地下へ' }],
    anchors: [[2, 12, 2, 1], [13, 12, 21, 1]]
  });
  R.define('magicka_palace_2f', {
    version: 1, arrive: [2, 1],
    rows: function (canvas) {
      var C = canvas(26, 18, ':'); C.frame(0, 0, 26, 18, 'C');
      C.rect(1, 1, 24, 2, 'p'); C.set(1, 1, '>'); C.set(24, 1, '<');   // 北の廊下（西＝1 階へ・東＝3 階へ）
      C.rect(1, 3, 5, 1, 'C'); C.rect(20, 3, 5, 1, 'C'); C.rect(6, 3, 1, 14, 'C'); C.rect(19, 3, 1, 14, 'C'); C.rect(1, 10, 5, 1, 'C'); C.rect(20, 10, 5, 1, 'C');
      C.set(6, 6, ':'); C.set(6, 13, ':'); C.set(19, 6, ':'); C.set(19, 13, ':');   // 部屋の戸口（大臣の執務室は封印の扉）
      C.frame(10, 6, 6, 5, 'x'); C.rect(11, 7, 4, 3, ':'); C.rect(12, 7, 2, 3, 'X');   // 吹き抜けと結晶の頭
      [[7, 3], [18, 3], [7, 16], [18, 16]].forEach(function (p) { C.set(p[0], p[1], 'I'); });
      // 評議の間（円卓と映像水晶）・研究室（小さな水晶・机）
      C.set(3, 6, 'X'); [[2, 5], [4, 5], [2, 7], [4, 7]].forEach(function (p) { C.set(p[0], p[1], 't'); });
      C.set(3, 13, 'X'); C.set(1, 12, 'K'); C.set(1, 15, 'z'); C.set(5, 15, 'q');
      // 書庫（壁の書架）・大臣の執務室（机）
      C.rect(24, 4, 1, 6, 'K'); C.rect(21, 4, 3, 1, 'K'); C.rect(21, 8, 2, 1, 'K'); C.rect(21, 13, 3, 1, 'T'); C.set(24, 11, 'K');
      return C;
    },
    npcs: { mp2_councilor: [3, 8, 'up', 0], mp2_librarian: [22, 5, 'down', 0], mp2_magus: [4, 14, 'up', 1], mp2_knight: [18, 12, 'left', 0] },
    events: [[6, 3, 3, 6], [17, 9, 19, 13], [17, 11, 22, 13], [8, 11, 3, 13]],
    chests: { mp2_1: [24, 16], mp2_2: [1, 16] },
    warps: [{ x: 1, y: 1, to: 'magicka_palace', tx: 2, ty: 12, name: '玉座の間へ' }, { x: 24, y: 1, to: 'magicka_palace_3f', tx: 9, ty: 2, name: '3階へ' }],
    anchors: [[2, 7, 2, 1], [9, 2, 23, 1]]
  });
  R.define('magicka_palace_3f', {
    version: 1, arrive: [7, 10],
    rows: function (canvas) {
      var C = canvas(15, 13, ':'); C.frame(0, 0, 15, 13, '#'); var cx = 7, cy = 6;
      for (var y = 1; y < 12; y++) for (var x = 1; x < 14; x++) { var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy) * 1.3); if (d > 6.6) C.set(x, y, '#'); else if (d < 2.4 && d > 1.4) C.set(x, y, 'p'); }
      C.path([[cx, 2], [cx, 10]], '-'); C.path([[2, cy], [12, cy]], '-'); C.set(cx, cy, '*');   // 床の子午線と赤道・天球儀
      C.set(7, 1, '?'); C.set(3, 3, 'K'); C.set(11, 3, '}'); C.set(2, 8, 'K'); C.set(12, 8, 't'); C.set(7, 11, '>');
      return C;
    },
    npcs: { x72_magicka_astro: [10, 7, 'left', 0] },
    events: [[5, 4, 7, 6]],
    chests: { x72_magicka_3f: [11, 9] },
    warps: [{ x: 7, y: 11, to: 'magicka_palace_2f', tx: 9, ty: 2, name: '魔導王宮 2階へ' }],
    anchors: [[9, 2, 7, 10]],
    after: function (def) { def.events.forEach(function (e) { if (e.x === 7 && e.y === 6 && typeof e.run !== 'function') { e.solid = true; } }); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
