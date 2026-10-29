/* =========================================================
   Data / World : アルカディア相場大陸のワールドマップ（160×120タイル）
   40×30の設計図を4倍に拡大し、境界をゆらして自然な地形にする。
   町・ダンジョンの入口は locations に定義（タイルと移動先）。
   ========================================================= */
(function (root) {
  'use strict';

  // 設計図（40列×30行）  ~:深海 w:浅瀬 .:草原 F:森 m:山 s:砂漠 n:雪原 h:丘
  var MACRO = [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~nnnnnnn~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~nnnnnnnnnn~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~nnnnmmnnnnw~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~nnnmmmnn~~~~~~~~~~~~~mmmmmm~~~~~~~~',
    '~~~~~~wnnnww~~~~~~~~~~~~~mmmmmmmm~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~mmmFFFFmmm~~~~~~',
    '~~~~~~mmmmm~~~~~~~~~~~~~mmFFFFFFFm~~~~~~',
    '~~~~~mmmmmmmm~~~~~~~~~~~~mmFFFFFmm~~~~~~',
    '~~~~mmhh..hmmmw~~~~~~~~~~~mmmFFmmm~~~~~~',
    '~~~~mh......hmmw~~~~~~~~~~~~mmmm~~~~~~~~',
    '~~~~h........hhmw~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~w..........hhw~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~w....h......FFFw~~~~~~~~~~~~~~~~~~~~~',
    '~~~w....hh....FFFFFw~~~~~~~~~~~~~~~~~~~~',
    '~~~w..........FFFFFFw~~~~~~~~~~~~~~~~~~~',
    '~~~w....h......FFFFw~~~~~~~~~~~~~~~~~~~~',
    '~~~w.....h......FFw~~~~~~~~~~~~~~~~~~~~~',
    '~~~~w.....hh....w~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~w......hmmmw~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~w....hmmw~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~w...hmw~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~w..w~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~ww~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~sssss~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~sssssssss~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~sssssmsssss~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~ssssssss~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~ssss~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'
  ];
  var W = 160, H = 120, SEED = 20261029;

  // 場所の定義（タイル座標）。walk-on で移動先へ
  var LOCATIONS = [
    { id: 'poyo_village', name: 'ポヨ村', icon: 'village', x: 28, y: 58, to: 'poyo_village', tx: 12, ty: 16 },
    { id: 'rivel_castle_town', name: 'リヴェル城下町', icon: 'castle_icon', x: 40, y: 48, to: 'rivel_town', tx: 15, ty: 22 },
    { id: 'lost_forest', name: '迷いの森', icon: 'cave_icon', x: 60, y: 57, to: 'lost_forest', tx: 2, ty: 12 },
    { id: 'dow_village', name: 'ダウの村', icon: 'village', x: 55, y: 70, to: 'dow_village', tx: 10, ty: 15 },
    { id: 'oblivion_cave', name: '忘却の洞窟', icon: 'cave_icon', x: 42, y: 78, to: 'oblivion_cave_1', tx: 2, ty: 10 },
    { id: 'emal_pass', name: 'エマール山道', icon: 'cave_icon', x: 36, y: 40, to: 'emal_pass', tx: 2, ty: 14 },
    { id: 'harbor', name: '港町マリナ', icon: 'village', x: 22, y: 72, to: 'harbor_town', tx: 10, ty: 1 }
  ];

  // 道（町と町をつなぐ）
  var ROADS = [
    [[28, 58], [40, 48]], [[40, 48], [36, 40]], [[28, 58], [42, 78]], [[40, 48], [60, 57]], [[60, 57], [55, 70]], [[28, 58], [22, 72]], [[42, 78], [55, 70]]
  ];

  function hash(x, y) { var h = (x * 374761393 + y * 668265263 + SEED) | 0; h = (h ^ (h >> 13)) * 1274126177; h = h ^ (h >> 16); return ((h >>> 0) % 1000) / 1000; }

  var cache = null;
  function generate() {
    if (cache) return cache;
    var rows = [];
    function macroAt(mx, my) { if (mx < 0 || my < 0 || my >= MACRO.length || mx >= MACRO[0].length) return '~'; return MACRO[my][mx]; }
    for (var y = 0; y < H; y++) {
      var row = '';
      for (var x = 0; x < W; x++) {
        var mx = x >> 2, my = y >> 2;
        var m = macroAt(mx, my);
        // 境界のゆらぎ：セル内の端では隣のセルの種類に置き換わることがある
        var fx = x & 3, fy = y & 3; var n = hash(x, y);
        if (fx === 0 && n < 0.45) m = macroAt(mx - 1, my);
        else if (fx === 3 && n < 0.45) m = macroAt(mx + 1, my);
        else if (fy === 0 && n > 0.55) m = macroAt(mx, my - 1);
        else if (fy === 3 && n > 0.55) m = macroAt(mx, my + 1);
        var ch;
        var n2 = hash(x * 7 + 3, y * 3 + 1);
        switch (m) {
          case '~': ch = '~'; break;
          case 'w': ch = 'w'; break;
          case 'F': ch = n2 < 0.12 ? '.' : 'F'; break;
          case 'm': ch = n2 < 0.15 ? 'h' : 'm'; break;
          case 's': ch = n2 < 0.06 ? 'c' : 's'; break;
          case 'n': ch = n2 < 0.07 ? 'f' : 'n'; break;
          case 'h': ch = n2 < 0.5 ? 'h' : (n2 < 0.6 ? 'f' : '.'); break;
          default: ch = n2 < 0.07 ? 'f' : (n2 < 0.16 ? ',' : '.');
        }
        row += ch;
      }
      rows.push(row.split(''));
    }
    // 深海と陸の間に浅瀬を作る
    for (var y2 = 0; y2 < H; y2++) for (var x2 = 0; x2 < W; x2++) {
      if (rows[y2][x2] !== '~') continue;
      var land = false;
      for (var dy = -1; dy <= 1 && !land; dy++) for (var dx = -1; dx <= 1; dx++) { var yy = y2 + dy, xx = x2 + dx; if (yy < 0 || xx < 0 || yy >= H || xx >= W) continue; var c = rows[yy][xx]; if (c !== '~' && c !== 'w') { land = true; break; } }
      if (land) rows[y2][x2] = 'w';
    }
    // 道を敷く（L字で接続、水上は橋）
    ROADS.forEach(function (r) {
      var x = r[0][0], y = r[0][1], tx = r[1][0], ty = r[1][1];
      function lay(px, py) { var c = rows[py][px]; if (c === '~' || c === 'w') rows[py][px] = 'b'; else if (c !== '1' && c !== '2' && c !== '3') rows[py][px] = 'r'; }
      while (x !== tx) { x += x < tx ? 1 : -1; lay(x, y); }
      while (y !== ty) { y += y < ty ? 1 : -1; lay(x, y); }
    });
    // 場所のアイコンを置き、周囲を歩けるようにする
    LOCATIONS.forEach(function (L) {
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var c = rows[L.y + dy][L.x + dx]; if (c === 'f' || c === 'F' || c === 'm' || c === 'c') rows[L.y + dy][L.x + dx] = '.'; }
      rows[L.y][L.x] = { village: '1', castle_icon: '2', cave_icon: '3', tower_icon: '4' }[L.icon] || '1';
    });
    // 宝箱・NPCの周囲を歩けるようにする
    ((root.WORLD_DEF && root.WORLD_DEF.chests) || []).concat((root.WORLD_DEF && root.WORLD_DEF.npcs) || []).forEach(function (o) {
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var c = rows[o.y + dy][o.x + dx]; if (c === 'f' || c === 'F' || c === 'm' || c === 'c') rows[o.y + dy][o.x + dx] = '.'; }
    });
    cache = rows.map(function (r) { return r.join(''); });
    return cache;
  }

  var WORLD_DEF = {
    id: 'world', name: 'アルカディア相場大陸', kind: 'field', rows: generate, fallback: 'grass', bgm: 'field',
    warps: LOCATIONS.map(function (L) { return { x: L.x, y: L.y, to: L.to, tx: L.tx, ty: L.ty, name: L.name }; }),
    chests: [
      { id: 'w1', x: 33, y: 52, item: 'herb', qty: 3 }, { id: 'w2', x: 47, y: 61, item: 'potion', qty: 2 }, { id: 'w3', x: 30, y: 66, gold: 120 },
      { id: 'w4', x: 52, y: 60, item: 'hunter_bow', qty: 1 }, { id: 'w5', x: 48, y: 84, item: 'ring_guard', qty: 1 }, { id: 'w6', x: 24, y: 44, item: 'tent', qty: 1 },
      { id: 'w7', x: 46, y: 74, item: 'escape_wing', qty: 2 }, { id: 'w8', x: 20, y: 60, item: 'amulet_life', qty: 1 }
    ],
    npcs: [
      { id: 'w_traveler', x: 32, y: 56, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('旅人', ['北のリヴェル城下町には王様がいる。王様に会うなら、まず城下町の宿で休んでからにしな。', '東の森は「迷いの森」だ。高値と安値を見失った者は二度と出てこられないって噂さ。']); } },
      { id: 'w_hermit', x: 45, y: 83, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) { await c.say('老人', ['この先の洞窟は「忘却の洞窟」。奥に欲望の魔物が棲みついてから、村の若者が何人も帰ってこん。', '魔物は「チャートの試練」を仕掛けてくる。上位足を見ずに飛び乗る者から順に食われるそうじゃ。']); } },
      { id: 'w_sign', x: 41, y: 50, sprite: 'guard', dir: 'down', wander: 0, talk: async function (c) { await c.say('衛兵', ['ここから北がリヴェル城下町だ。南の村から来たのか？ 魔物が増えているから気をつけろ。']); } }
    ],
    events: [{ x: 52, y: 74, type: 'learn', solid: false, learnId: 'practice_dow_road' }],
    // ランダムエンカウント（地域ごと）: rate は1歩あたりの確率
    encounters: { rate: 0.035, zones: [
      { name: '始まりの草原', test: function (x, y) { return x < 46 && y < 66 && y > 36; }, groups: [['slime'], ['slime', 'slime'], ['bee'], ['bug'], ['bug', 'slime'], ['slime', 'slime', 'slime'], ['slime_green', 'slime'], ['rabbit'], ['rabbit', 'rabbit'], ['sparrow_hawk'], ['petal', 'slime_green'], ['slime_blue_big'], ['sparrow_hawk', 'bee'], ['petal', 'petal', 'bug']], rare: [['slime_metal']], rareRate: 0.03, level: 1 },
      { name: 'ダウの大森林', test: function (x, y) { return x >= 46 && y < 66; }, groups: [['slime_red', 'slime_red'], ['wolf'], ['snake', 'mushroom'], ['mushroom', 'mushroom', 'slime_red'], ['wolf', 'snake'], ['crow', 'crow'], ['boar'], ['maneater'], ['forest_fairy', 'petal'], ['boar', 'crow'], ['maneater', 'snake'], ['mushroom_king'], ['forest_fairy', 'slime_red', 'slime_red']], rare: [['slime_gold'], ['slime_rainbow']], rareRate: 0.025, level: 3 },
      { name: '南の荒野', test: function (x, y) { return y >= 66; }, groups: [['bat', 'bat'], ['lizard'], ['mole', 'bat'], ['snake', 'snake'], ['bandit'], ['lizard', 'mole'], ['wild_dog', 'wild_dog'], ['scorpion'], ['vulture', 'vulture'], ['sand_lizard', 'scorpion'], ['mimic'], ['wild_dog', 'vulture'], ['sand_lizard', 'sand_lizard', 'wild_dog']], rare: [['slime_metal']], rareRate: 0.02, level: 4 },
      { name: 'エマール山脈', test: function (x, y) { return y <= 36; }, groups: [['bandit', 'bandit'], ['golem'], ['bug_armor'], ['bandit', 'wolf'], ['golem', 'bandit'], ['mountain_hawk', 'mountain_hawk'], ['rock_lizard'], ['mountain_cat'], ['harpy'], ['bandit_archer', 'bandit'], ['rock_golem'], ['mountain_cat', 'mountain_hawk'], ['rock_lizard', 'bandit_archer']], level: 7 }
    ] }
  };

  root.WORLD_DEF = WORLD_DEF; root.WORLD_LOCATIONS = LOCATIONS;
  root.WORLD_GENERATE = generate;
})(typeof window !== 'undefined' ? window : globalThis);
