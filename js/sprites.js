/* =========================================================
   もちぽよFXクエスト - ドット絵スプライト（すべてオリジナル）
   16x16 の文字グリッドをCanvasに描画する。外部画像に依存しない。
   ========================================================= */
(function (root) {
  'use strict';

  var Sprites = {};

  /* ---------- 基本形状 ---------- */
  var SHAPES = {
    // 剣士（右手に剣）
    sword: [
      '......HHHH......',
      '.....HHHHHH.....',
      '.....HFFFFH.....',
      '.....FEFFEF.....',
      '.....FFFFFF.....',
      '......FFFF....W.',
      '....BBBBBBBB..W.',
      '...BBBBBBBBBB.W.',
      '...BBAAAAAABB.W.',
      '...SBBBBBBBBSSW.',
      '...S.BBBBBB.S.G.',
      '.....BBBBBB.....',
      '.....LL..LL.....',
      '.....LL..LL.....',
      '....TTT..TTT....',
      '................'
    ],
    // 魔法使い（とんがり帽子・杖）
    mage: [
      '.......HH.......',
      '......HHHH......',
      '.....HHHHHH.....',
      '...HHHHHHHHHH...',
      '.....FFFFFF...W.',
      '.....FEFFEF...W.',
      '.....FFFFFF...G.',
      '....BBBBBBBB..W.',
      '...BBBBBBBBBB.W.',
      '...BBAAAAAABB.W.',
      '...SBBBBBBBBSSW.',
      '...S.BBBBBB.S.W.',
      '.....BBBBBB...W.',
      '.....LL..LL.....',
      '....TTT..TTT....',
      '................'
    ],
    // 賢者・老人（ひげ・杖）
    sage: [
      '......HHHH......',
      '.....HHHHHH.....',
      '.....HFFFFH.....',
      '.....FEFFEF.....',
      '.....FFFFFF...W.',
      '.....DDDDDD...W.',
      '....BDDDDDDB..G.',
      '...BBBDDDDBBB.W.',
      '...BBAAAAAABB.W.',
      '...SBBBBBBBBSSW.',
      '...S.BBBBBB.S.W.',
      '.....BBBBBB...W.',
      '.....LL..LL.....',
      '.....LL..LL.....',
      '....TTT..TTT....',
      '................'
    ],
    // 一般人（帽子なし）
    person: [
      '................',
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
      '....TTT..TTT....',
      '................'
    ],
    slime: [
      '................',
      '................',
      '................',
      '................',
      '.....BBBBBB.....',
      '....BBBBBBBB....',
      '...BBBBBBBBBB...',
      '..BBBEEBBBBEEB..',
      '..BBBEEBBBBEEB..',
      '..BBBBBBBBBBBB..',
      '.BBBBBBMMMBBBBB.',
      '.BBBBBBBBBBBBBB.',
      '.BBBBBBBBBBBBBB.',
      '..BBBBBBBBBBBB..',
      '...BBBBBBBBBB...',
      '................'
    ],
    slime_king: [
      '....C..CC..C....',
      '....CCCCCCCC....',
      '....CCCCCCCC....',
      '.....BBBBBB.....',
      '....BBBBBBBB....',
      '...BBBBBBBBBB...',
      '..BBBEEBBBBEEB..',
      '..BBBEEBBBBEEB..',
      '..BBBBBBBBBBBB..',
      '.BBBBBMMMMMBBBB.',
      '.BBBBBBBBBBBBBB.',
      'BBBBBBBBBBBBBBBB',
      'BBBBBBBBBBBBBBBB',
      '.BBBBBBBBBBBBBB.',
      '..BBBBBBBBBBBB..',
      '................'
    ],
    ghost: [
      '.....GGGGGG.....',
      '....GGGGGGGG....',
      '...GGGGGGGGGG...',
      '...GGEEGGGGEE...',
      '...GGEEGGGGEE...',
      '...GGGGGGGGGG...',
      '...GGGGGMMGGG...',
      '...GGGGGGGGGG...',
      '...GGGGGGGGGG...',
      '...GGGGGGGGGG...',
      '...GGGGGGGGGG...',
      '...GGGGGGGGGG...',
      '...GG.GGGG.GG...',
      '...G...GG...G...',
      '................',
      '................'
    ],
    bat: [
      '................',
      '................',
      '................',
      '.....B....B.....',
      '....BB....BB....',
      '...BBBBEEBBBB...',
      '..BBBBBEEBBBBB..',
      '.BBBBBBBBBBBBBB.',
      'BBBBBBBMMBBBBBBB',
      'BB.BBBBBBBBBB.BB',
      '....BBB..BBB....',
      '.....B....B.....',
      '................',
      '................',
      '................',
      '................'
    ],
    golem: [
      '....BBBBBBBB....',
      '...BBBBBBBBBB...',
      '...BBEEBBBBEE...',
      '...BBBBBBBBBB...',
      '....BBBMMBBB....',
      '..BBBBBBBBBBBB..',
      '.BBBBBBBBBBBBBB.',
      '.BBBAAAAAAAABBB.',
      'BBBBAAAAAAAABBBB',
      'BBB.BBBBBBBB.BBB',
      'BBB.BBBBBBBB.BBB',
      '....BBBBBBBB....',
      '....BBB..BBB....',
      '....BBB..BBB....',
      '...BBBB..BBBB...',
      '................'
    ],
    beast: [
      '................',
      '..B...........B.',
      '..BB.........BB.',
      '..BBBBBBBBBBBB..',
      '.BBBEEBBBBBBBBB.',
      '.BBBEEBBBBBBBBB.',
      '.BBBBBBBBBBBBBB.',
      '.BBMMMBBBBBBBBB.',
      '..BBBBBBBBBBBB..',
      '..BBBBBBBBBBBBB.',
      '..BB..BB..BB..B.',
      '..BB..BB..BB..B.',
      '.BBB.BBB.BBB.BB.',
      '................',
      '................',
      '................'
    ],
    mushroom: [
      '................',
      '....CCCCCCCC....',
      '...CCACCCCACC...',
      '..CCCCCCCACCCC..',
      '.CCACCCCCCCCCCC.',
      '.CCCCCCACCCCACC.',
      '.CCCCCCCCCCCCCC.',
      '....BBBBBBBB....',
      '....BEEBBEEB....',
      '....BBBBBBBB....',
      '....BBBMMBBB....',
      '....BBBBBBBB....',
      '....BBBBBBBB....',
      '...BBBBBBBBBB...',
      '................',
      '................'
    ],
    bug: [
      '................',
      '....B......B....',
      '.....B....B.....',
      '....BBBBBBBB....',
      '...BBEEBBBBEEB..',
      '...BBBBBBBBBBB..',
      '..BBAAAABBAAAB..',
      '..BBAAAABBAAAB..',
      '..BBBBBBBBBBBB..',
      '..BBAAAABBAAAB..',
      '..BBBBBBBBBBBB..',
      '.B.BB.B..B.BB.B.',
      'B..B...BB...B..B',
      '................',
      '................',
      '................'
    ],
    knight: [
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '....HHEEEEHH....',
      '....HHHHHHHH....',
      '.....HHHHHH.....',
      '..SSBBBBBBBBSS..',
      '.SSSBBAAAABBSSS.',
      '.SS.BBAAAABB.SS.',
      '.SS.BBBBBBBB.SS.',
      '.SS.BBBBBBBB.SS.',
      '....BBBBBBBB....',
      '....BBB..BBB....',
      '....BBB..BBB....',
      '....BBB..BBB....',
      '...BBBB..BBBB...',
      '................'
    ],
    demon: [
      '.H...........H..',
      '.HH..HHHHHH..HH.',
      '..HHHHHHHHHHHH..',
      '...HHEEHHHHEEH..',
      '...HHEEHHHHEEH..',
      '...HHHHHHHHHHH..',
      '....HHHMMMHHH...',
      '..BBBBBBBBBBBB..',
      '.BBBBAAAAAAABBB.',
      'BBBBBAAAAAAABBBB',
      'BB.BBBBBBBBBB.BB',
      'BB.BBBBBBBBBB.BB',
      '...BBBBBBBBBB...',
      '....BBB..BBB....',
      '....BBB..BBB....',
      '...BBBB..BBBB...'
    ]
  };

  /* ---------- スプライト定義（形状＋パレット） ---------- */
  var SKIN = '#f3c9a0', EYE = '#1b1b2a', MOUTH = '#8a2a3a';
  var DEFS = {
    hero_sword: { shape: 'sword', pal: { H: '#4a2e1a', F: SKIN, E: EYE, B: '#2b5fb3', A: '#e8c15a', S: SKIN, L: '#2a2d4a', T: '#4a2e1a', W: '#d8dde8', G: '#e8c15a' } },
    hero_mage: { shape: 'mage', pal: { H: '#3b2a7a', F: SKIN, E: EYE, B: '#4b3a9a', A: '#8fb8ff', S: SKIN, L: '#2a2440', T: '#2a2440', W: '#8a5a2a', G: '#8fb8ff' } },
    hero_sage: { shape: 'sage', pal: { H: '#d9d9d9', F: SKIN, E: EYE, D: '#e8e8e8', B: '#2f6b4a', A: '#9fe0a8', S: SKIN, L: '#2a3a2a', T: '#4a2e1a', W: '#8a5a2a', G: '#9fe0a8' } },
    npc_elder: { shape: 'sage', pal: { H: '#bdbdbd', F: SKIN, E: EYE, D: '#dcdcdc', B: '#6b4a2a', A: '#c9a24a', S: SKIN, L: '#3a2a1a', T: '#2a1a0a', W: '#8a5a2a', G: '#c9a24a' } },
    npc_ranger: { shape: 'sword', pal: { H: '#2a5a2a', F: SKIN, E: EYE, B: '#3b7a3b', A: '#8a5a2a', S: SKIN, L: '#2a3a2a', T: '#4a2e1a', W: '#8a5a2a', G: '#5a3a1a' } },
    npc_monk: { shape: 'person', pal: { H: '#f3c9a0', F: SKIN, E: EYE, B: '#c96b2a', A: '#e8c15a', S: SKIN, L: '#c96b2a', T: '#4a2e1a' } },
    npc_priestess: { shape: 'mage', pal: { H: '#f2f2f2', F: SKIN, E: EYE, B: '#f2f2f2', A: '#b04a6a', S: SKIN, L: '#f2f2f2', T: '#b04a6a', W: '#e8c15a', G: '#b04a6a' } },
    npc_scholar: { shape: 'person', pal: { H: '#5a3a8a', F: SKIN, E: '#2b5fb3', B: '#2a2d4a', A: '#8fb8ff', S: SKIN, L: '#2a2d4a', T: '#1a1a2a' } },
    npc_wizard: { shape: 'mage', pal: { H: '#1a2e55', F: SKIN, E: EYE, B: '#1f3a66', A: '#e8c15a', S: SKIN, L: '#1a2e55', T: '#1a1a2a', W: '#8a5a2a', G: '#e8c15a' } },
    npc_treasurer: { shape: 'person', pal: { H: '#8a1a1a', F: SKIN, E: EYE, B: '#e8c15a', A: '#8a1a1a', S: SKIN, L: '#4a2e1a', T: '#2a1a0a' } },
    slime: { shape: 'slime', pal: { B: '#5ab0ff', E: '#1b1b2a', M: '#1b3a6a' } },
    slime_king: { shape: 'slime_king', pal: { B: '#d04a8a', E: '#1b1b2a', M: '#5a1a3a', C: '#e8c15a' } },
    mushroom: { shape: 'mushroom', pal: { C: '#c94a4a', A: '#f2e6d0', B: '#e8d9b8', E: '#1b1b2a', M: '#8a2a3a' } },
    bug: { shape: 'bug', pal: { B: '#6a9a2a', A: '#c9e84a', E: '#1b1b2a' } },
    lostghost: { shape: 'ghost', pal: { G: '#9ab0c9', E: '#2a2d4a', M: '#4a5a7a' } },
    bat: { shape: 'bat', pal: { B: '#5a3a8a', E: '#ffd24a', M: '#2a1a3a' } },
    snake: { shape: 'beast', pal: { B: '#3b8a3b', E: '#ffd24a', M: '#c94a4a' } },
    golem: { shape: 'golem', pal: { B: '#7a7a8a', A: '#c96b2a', E: '#ff6a3a', M: '#3a3a4a' } },
    ghost: { shape: 'ghost', pal: { G: '#e8e8f2', E: '#2a2d4a', M: '#8a8aa0' } },
    lizard: { shape: 'beast', pal: { B: '#c9a24a', E: '#1b1b2a', M: '#8a2a3a' } },
    phantom: { shape: 'ghost', pal: { G: '#8a5ad0', E: '#ffd24a', M: '#3a1a5a' } },
    mole: { shape: 'beast', pal: { B: '#6b4a2a', E: '#1b1b2a', M: '#e8a0a0' } },
    beast: { shape: 'beast', pal: { B: '#c94a2a', E: '#ffd24a', M: '#3a0a0a' } },
    sorcerer: { shape: 'mage', pal: { H: '#2a0a3a', F: '#c9b0d0', E: '#ff3a6a', B: '#3a1a5a', A: '#d04a8a', S: '#c9b0d0', L: '#1a0a2a', T: '#1a0a2a', W: '#8a2a3a', G: '#ff3a6a' } },
    knight: { shape: 'knight', pal: { H: '#8a8a9a', E: '#ff3a3a', B: '#5a5a6a', A: '#8a1a1a', S: '#8a8a9a' } },
    shadow: { shape: 'ghost', pal: { G: '#2a2a3a', E: '#ff6a3a', M: '#1a1a2a' } },
    demonlord: { shape: 'demon', pal: { H: '#5a0a2a', E: '#ffd24a', M: '#1a0010', B: '#2a0a3a', A: '#c94a2a' } }
  };

  /* ---------- 描画 ---------- */
  // canvas 要素に key のスプライトを scale 倍で描く。flip=true で左右反転。
  Sprites.draw = function (canvas, key, scale, flip) {
    var def = DEFS[key] || DEFS.slime;
    var grid = SHAPES[def.shape];
    scale = scale || 4;
    canvas.width = 16 * scale; canvas.height = 16 * scale;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var y = 0; y < 16; y++) {
      var row = grid[y] || '';
      for (var x = 0; x < 16; x++) {
        var ch = row[x];
        if (!ch || ch === '.') continue;
        var col = def.pal[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        var dx = flip ? (15 - x) : x;
        ctx.fillRect(dx * scale, y * scale, scale, scale);
      }
    }
    return canvas;
  };

  // <canvas> を生成して返す（HTML文字列ではなく要素）
  Sprites.element = function (key, scale, flip, className) {
    var c = document.createElement('canvas');
    c.className = 'sprite ' + (className || '');
    Sprites.draw(c, key, scale, flip);
    return c;
  };

  Sprites.has = function (key) { return !!DEFS[key]; };
  // 既存の形状にパレット差し替えで亜種を追加する（敵データから利用）
  Sprites.addVariant = function (key, shape, pal) { if (SHAPES[shape]) DEFS[key] = { shape: shape, pal: pal }; };
  Sprites.shapes = function () { return Object.keys(SHAPES); };

  root.Sprites = Sprites;
})(typeof window !== 'undefined' ? window : globalThis);
