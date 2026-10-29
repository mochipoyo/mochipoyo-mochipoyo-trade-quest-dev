/* =========================================================
   Core / Chars : 4方向・2フレームの歩行キャラクター（オリジナルドット絵）
   テンプレート（正面・横向き）からパレット差し替えで多数のキャラを生成する
   ========================================================= */
(function (root) {
  'use strict';

  var Chars = { cache: {} };

  // 正面（down）: フレーム0 / フレーム1 は脚だけ差し替え
  var DOWN = [
    '......HHHH......',
    '.....HHHHHH.....',
    '.....HFFFFH.....',
    '.....FEFFEF.....',
    '.....FFFFFF.....',
    '......FFFF......',
    '....BBBBBBBB....',
    '...BBBBBBBBBB...',
    '...BBAAAAAABB...',
    '...SBBBBBBBBS...',
    '...S.BBBBBB.S...',
    '.....BBBBBB.....',
    '.....LL..LL.....',
    '.....LL..LL.....',
    '....TTT..TTT....',
    '................'
  ];
  var DOWN_LEGS1 = ['.....LL..LL.....', '....LL....LL....', '...TTT....TTT...', '................'];
  // 背面（up）：顔を髪で覆う
  var UP = DOWN.map(function (r, i) { return (i >= 2 && i <= 5) ? r.replace(/[FE]/g, 'H') : r; });
  // 横向き（right）
  var SIDE = [
    '......HHHH......',
    '.....HHHHHH.....',
    '.....HHHFFF.....',
    '.....HHFFEF.....',
    '.....HHFFFF.....',
    '......FFFF......',
    '.....BBBBBB.....',
    '....BBBBBBBB....',
    '....BBAAAABB....',
    '....BBBBBBBS....',
    '....BBBBBB.S....',
    '.....BBBBB......',
    '.....LLLL.......',
    '.....LL.LL......',
    '....TTT.TTT.....',
    '................'
  ];
  var SIDE_LEGS1 = ['......LLL.......', '....LL..LL......', '...TTT..TTT.....', '................'];

  // 帽子つき（魔法使い・僧侶など）
  var HAT_ROWS = ['.......MM.......', '......MMMM......', '....MMMMMMMM....'];

  var SKIN = '#f3c9a0', EYE = '#1b1b2a';
  var PALS = {
    hero_warrior: { H: '#4a2e1a', F: SKIN, E: EYE, B: '#2b5fb3', A: '#e8c15a', S: SKIN, L: '#2a2d4a', T: '#4a2e1a' },
    hero_mage: { H: '#3b2a7a', F: SKIN, E: EYE, B: '#4b3a9a', A: '#8fb8ff', S: SKIN, L: '#2a2440', T: '#2a2440', M: '#3b2a7a' },
    hero_priest: { H: '#c9a24a', F: SKIN, E: EYE, B: '#f0f0f8', A: '#b04a6a', S: SKIN, L: '#f0f0f8', T: '#8a5a2a' },
    hero_thief: { H: '#1a1a2a', F: SKIN, E: EYE, B: '#2f6b4a', A: '#1a1a2a', S: SKIN, L: '#2a3a2a', T: '#1a1a2a' },
    hero_monk: { H: '#2a1a0a', F: SKIN, E: EYE, B: '#c96b2a', A: '#e8c15a', S: SKIN, L: '#c96b2a', T: '#4a2e1a' },
    hero_merchant: { H: '#8a5a2a', F: SKIN, E: EYE, B: '#e8c15a', A: '#8a1a1a', S: SKIN, L: '#4a2e1a', T: '#2a1a0a' },
    hero_hunter: { H: '#2a5a2a', F: SKIN, E: EYE, B: '#3b7a3b', A: '#8a5a2a', S: SKIN, L: '#2a3a2a', T: '#4a2e1a' },
    hero_knight: { H: '#8a8a9a', F: SKIN, E: EYE, B: '#8a8a9a', A: '#c94a4a', S: SKIN, L: '#5a5a6a', T: '#3a3a4a' },
    hero_sage: { H: '#d9d9d9', F: SKIN, E: EYE, B: '#2f6b4a', A: '#9fe0a8', S: SKIN, L: '#2a3a2a', T: '#4a2e1a', M: '#2f6b4a' },
    hero_magicknight: { H: '#c94a4a', F: SKIN, E: EYE, B: '#5a2a8a', A: '#e8c15a', S: SKIN, L: '#2a1a3a', T: '#3a3a4a' },
    hero_waveblade: { H: '#1a4a8a', F: SKIN, E: EYE, B: '#1f3a66', A: '#5ab0ff', S: SKIN, L: '#1a2e55', T: '#1a1a2a' },
    hero_master: { H: '#e8e8f0', F: SKIN, E: EYE, B: '#1a1a2a', A: '#ffd24a', S: SKIN, L: '#1a1a2a', T: '#4a2e1a', M: '#1a1a2a' },
    // 仲間
    lina: { H: '#f0d08a', F: SKIN, E: '#2b5fb3', B: '#f8f8ff', A: '#b04a6a', S: SKIN, L: '#f8f8ff', T: '#8a5a2a', M: '#f8f8ff' },
    kyle: { H: '#5a3a1a', F: SKIN, E: EYE, B: '#8a8a9a', A: '#2b5fb3', S: SKIN, L: '#5a5a6a', T: '#3a3a4a' },
    mina: { H: '#3a2a5a', F: SKIN, E: EYE, B: '#2a2a3a', A: '#c94a8a', S: SKIN, L: '#2a2a3a', T: '#1a1a2a' },
    seris: { H: '#8a5ad0', F: SKIN, E: EYE, B: '#2a1a5a', A: '#ffd24a', S: SKIN, L: '#2a1a5a', T: '#1a1a2a', M: '#2a1a5a' },
    gald: { H: '#c94a2a', F: SKIN, E: EYE, B: '#6a4a2a', A: '#c94a2a', S: SKIN, L: '#4a3a2a', T: '#2a1a0a' },
    lucia: { H: '#5ab0ff', F: SKIN, E: '#8a5ad0', B: '#1f3a66', A: '#ffd24a', S: SKIN, L: '#1f3a66', T: '#1a1a2a' },
    // NPC
    villager_m: { H: '#4a2e1a', F: SKIN, E: EYE, B: '#8a5a2a', A: '#c9a06a', S: SKIN, L: '#4a3a2a', T: '#2a1a0a' },
    villager_f: { H: '#c94a4a', F: SKIN, E: EYE, B: '#c94a8a', A: '#f0f0f8', S: SKIN, L: '#c94a8a', T: '#4a2e1a' },
    elder: { H: '#d0d0d0', F: SKIN, E: EYE, B: '#6b4a2a', A: '#c9a24a', S: SKIN, L: '#3a2a1a', T: '#2a1a0a' },
    child: { H: '#8a5a2a', F: SKIN, E: EYE, B: '#3f9a6a', A: '#ffd24a', S: SKIN, L: '#2b5fb3', T: '#2a1a0a' },
    merchant: { H: '#2a1a0a', F: SKIN, E: EYE, B: '#e8c15a', A: '#8a1a1a', S: SKIN, L: '#4a2e1a', T: '#2a1a0a' },
    innkeeper: { H: '#8a5a2a', F: SKIN, E: EYE, B: '#3f6fc9', A: '#f0f0f8', S: SKIN, L: '#2a2d4a', T: '#2a1a0a' },
    priest: { H: '#d0d0d0', F: SKIN, E: EYE, B: '#f0f0f8', A: '#ffd24a', S: SKIN, L: '#f0f0f8', T: '#8a5a2a', M: '#f0f0f8' },
    guard: { H: '#8a8a9a', F: SKIN, E: EYE, B: '#5a6a9a', A: '#c94a4a', S: SKIN, L: '#3a3a4a', T: '#1a1a2a' },
    king: { H: '#ffd24a', F: SKIN, E: EYE, B: '#8a1a3a', A: '#ffd24a', S: SKIN, L: '#8a1a3a', T: '#4a2e1a' },
    master: { H: '#2a2a3a', F: SKIN, E: EYE, B: '#1f3a66', A: '#5ab0ff', S: SKIN, L: '#1f3a66', T: '#1a1a2a' },
    scholar: { H: '#5a3a8a', F: SKIN, E: '#2b5fb3', B: '#2a2d4a', A: '#8fb8ff', S: SKIN, L: '#2a2d4a', T: '#1a1a2a' },
    bartender: { H: '#1a1a2a', F: SKIN, E: EYE, B: '#4a2a1a', A: '#f0f0f8', S: SKIN, L: '#2a1a0a', T: '#1a1a2a' },
    sailor: { H: '#1a1a2a', F: SKIN, E: EYE, B: '#f0f0f8', A: '#2b5fb3', S: SKIN, L: '#2b5fb3', T: '#1a1a2a' },
    shadow: { H: '#2a2a3a', F: '#2a2a3a', E: '#ff6a3a', B: '#1a1a2a', A: '#3a3a4a', S: '#2a2a3a', L: '#1a1a2a', T: '#1a1a2a' }
  };
  Chars.PALS = PALS;

  function grid(dir, frame, hat) {
    var base = dir === 'down' ? DOWN : dir === 'up' ? UP : SIDE;
    var g = base.slice();
    if (frame === 1) { var legs = (dir === 'down' || dir === 'up') ? DOWN_LEGS1 : SIDE_LEGS1; for (var i = 0; i < 4; i++) g[12 + i] = legs[i]; }
    if (hat) { g[0] = HAT_ROWS[0]; g[1] = HAT_ROWS[1]; g[2] = HAT_ROWS[2]; }
    return g;
  }

  // 返り値: canvas（32x32相当、SCALE 2）
  Chars.frame = function (key, dir, frame) {
    var k = key + ':' + dir + ':' + frame;
    if (Chars.cache[k]) return Chars.cache[k];
    var pal = PALS[key] || PALS.villager_m;
    var flip = dir === 'left'; var g = grid(flip ? 'right' : dir, frame, !!pal.M);
    var S = root.Engine.SCALE; var c = document.createElement('canvas'); c.width = 16 * S; c.height = 16 * S;
    var ctx = c.getContext('2d');
    for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) {
      var ch = g[y][x]; if (!ch || ch === '.') continue; var col = pal[ch]; if (!col) continue;
      ctx.fillStyle = col; var dx = flip ? 15 - x : x; ctx.fillRect(dx * S, y * S, S, S);
    }
    Chars.cache[k] = c; return c;
  };
  Chars.has = function (key) { return !!PALS[key]; };

  root.Chars = Chars;
})(typeof window !== 'undefined' ? window : globalThis);
