/* =========================================================
   Core / Tiles : オリジナルのドット絵タイルセット（8x8パターン→16x16ドット）
   すべてコードで生成し、画像ファイルに依存しない。
   ========================================================= */
(function (root) {
  'use strict';

  var Tiles = { defs: {}, byChar: {}, cache: {}, anim: 0 };

  // パターン文字 → 色。'.' は下地色（base）
  function def(name, opts) { opts.name = name; Tiles.defs[name] = opts; if (opts.ch) Tiles.byChar[opts.ch] = name; }

  var G1 = '#3f9a3f', G2 = '#46a84a', G3 = '#357f35', FL1 = '#ffd24a', FL2 = '#ff8ab0', FL3 = '#ffffff';
  var TR1 = '#1f5a28', TR2 = '#2d7a36', TRK = '#5a3a1a', W1 = '#2b6fb8', W2 = '#3d8ad8', W3 = '#7fc0ff', DW1 = '#1a3f80', DW2 = '#224f9a';
  var SA1 = '#e8d49a', SA2 = '#d9c285', MT1 = '#7a7a8a', MT2 = '#9a9aaa', MT3 = '#5a5a6a', MTW = '#ffffff', SN1 = '#eef3ff', SN2 = '#d8e2f5';
  var RD1 = '#b8a070', RD2 = '#a08a5a', ST1 = '#9a9aa8', ST2 = '#7a7a88', WD1 = '#a07040', WD2 = '#8a5a30', WL1 = '#8a8a9a', WL2 = '#6a6a7a', WL3 = '#5a5a6a';
  var RF1 = '#c94a4a', RF2 = '#a83a3a', RB1 = '#3f6fc9', RB2 = '#2f58a3', DR = '#5a3a1a', DR2 = '#3a2a10', CV1 = '#4a4a5a', CV2 = '#3a3a4a', CV3 = '#2a2a3a';
  var CH1 = '#c9a24a', CH2 = '#8a6a2a', CP1 = '#a83a3a', CP2 = '#c94a4a', BK = '#1a1a2a', LV1 = '#ff6a2a', LV2 = '#ffa03a', MG = '#8a5ad0';

  // 地形（歩ける）
  def('grass', { ch: '.', base: G1, pal: { a: G2, b: G3 }, pat: ['........', '..a.....', '......b.', '........', '.b......', '.....a..', '........', '...a....'] });
  def('grass2', { ch: ',', base: G1, pal: { a: G2, b: G3, f: FL1, g: FL2, h: FL3 }, pat: ['........', '.f......', '.....g..', '........', '..b.....', '......h.', '.a......', '........'] });
  def('sand', { ch: 's', base: SA1, pal: { a: SA2 }, pat: ['........', '..a.....', '......a.', '........', '.a......', '.....a..', '........', '...a....'] });
  def('snow', { ch: 'n', base: SN1, pal: { a: SN2 }, pat: ['........', '..a.....', '......a.', '........', '.a......', '.....a..', '........', '...a....'] });
  def('road', { ch: 'r', base: RD1, pal: { a: RD2 }, pat: ['........', '.a....a.', '........', '....a...', '........', '.a......', '.....a..', '........'] });
  def('bridge', { ch: 'b', base: WD1, pal: { a: WD2, w: W1 }, pat: ['w......w', 'wa....aw', 'w......w', 'wa....aw', 'w......w', 'wa....aw', 'w......w', 'wa....aw'] });
  def('shallow', { ch: 'w', base: W2, pal: { a: W3, b: W1 }, solid: true, pat: ['........', '.aa.....', '.....aa.', '........', '...aa...', '........', '.aa...b.', '........'], pat2: ['........', '......aa', '.aa.....', '........', '........', '....aa..', 'b.......', '..aa....'] });
  def('water', { ch: '~', base: DW1, pal: { a: DW2, b: W1 }, solid: true, pat: ['........', '.aa.....', '.....aa.', '........', '...aa...', '........', '.aa...b.', '........'], pat2: ['........', '......aa', '.aa.....', '........', '........', '....aa..', 'b.......', '..aa....'] });
  def('tree', { ch: 'f', base: G1, pal: { a: TR1, b: TR2, k: TRK }, solid: true, pat: ['...bb...', '..bbbb..', '.bbabbb.', '.babbab.', 'bbbbabbb', '.bbabbb.', '...kk...', '...kk...'] });
  def('forest', { ch: 'F', base: TR1, pal: { a: TR2, b: '#1a4a22', k: TRK }, solid: true, pat: ['aa..aa..', 'aaa.aaa.', '.k...k..', '..aa..aa', '.aaa.aaa', '..k...k.', 'aa..aa..', '.k...k..'] });
  def('mountain', { ch: 'm', base: MT1, pal: { a: MT2, b: MT3, w: MTW, g: G3 }, solid: true, pat: ['...w....', '..waa...', '.aaaab..', '.aaabb..', 'aaaabbb.', 'aabbbbb.', 'gbbbbbbg', 'ggbbbbgg'] });
  def('hill', { ch: 'h', base: G1, pal: { a: G3, b: '#2f6f2f' }, pat: ['........', '...aa...', '..aaaa..', '.aaabba.', 'aaabbbba', '........', '........', '........'] });
  def('cliff', { ch: 'c', base: MT3, pal: { a: MT1, b: MT2 }, solid: true, pat: ['bbbbbbbb', 'aaaaaaaa', 'a.aa.aaa', 'aaaaaaaa', 'aa.aaa.a', 'aaaaaaaa', 'a.aaa.aa', 'aaaaaaaa'] });
  def('lava', { ch: 'l', base: LV1, pal: { a: LV2, b: '#c93a1a' }, solid: true, pat: ['........', '.aa.....', '.....aa.', '...b....', '........', 'b....aa.', '.aa.....', '......b.'], pat2: ['..aa....', '......aa', '.b......', '.....aa.', '..aa....', '........', '......b.', 'aa......'] });

  // 町・建物
  def('stone', { ch: '=', base: ST1, pal: { a: ST2 }, pat: ['aaaaaaaa', 'a...a...', 'a...a...', 'aaaaaaaa', '..a...a.', '..a...a.', 'aaaaaaaa', 'a...a...'] });
  def('floor_wood', { ch: '_', base: WD1, pal: { a: WD2 }, pat: ['aaaaaaaa', '........', '........', 'aaaaaaaa', '........', '........', 'aaaaaaaa', '........'] });
  def('floor_stone', { ch: ':', base: '#8a8aa0', pal: { a: '#6a6a80' }, pat: ['aaaaaaaa', 'a...a...', 'a...a...', 'aaaaaaaa', '..a...a.', '..a...a.', 'aaaaaaaa', 'a...a...'] });
  def('carpet', { ch: 'p', base: CP1, pal: { a: CP2, b: CH1 }, pat: ['bbbbbbbb', 'b......b', 'b.aaaa.b', 'b.a..a.b', 'b.a..a.b', 'b.aaaa.b', 'b......b', 'bbbbbbbb'] });
  def('wall', { ch: '#', base: WL1, pal: { a: WL2, b: WL3 }, solid: true, pat: ['aaaaaaaa', '...a...a', '...a...a', 'aaaaaaaa', 'a...a...', 'a...a...', 'aaaaaaaa', 'bbbbbbbb'] });
  def('wall_wood', { ch: 'W', base: WD2, pal: { a: WD1, b: DR2 }, solid: true, pat: ['aaaaaaaa', '...b....', '...b....', 'aaaaaaaa', '.....b..', '.....b..', 'aaaaaaaa', 'bbbbbbbb'] });
  def('roof_red', { ch: 'R', base: RF1, pal: { a: RF2 }, solid: true, pat: ['aaaaaaaa', '.a...a..', '.a...a..', 'aaaaaaaa', '...a...a', '...a...a', 'aaaaaaaa', '.a...a..'] });
  def('roof_blue', { ch: 'B', base: RB1, pal: { a: RB2 }, solid: true, pat: ['aaaaaaaa', '.a...a..', '.a...a..', 'aaaaaaaa', '...a...a', '...a...a', 'aaaaaaaa', '.a...a..'] });
  def('roof_green', { ch: 'V', base: '#3f9a6a', pal: { a: '#2f7a50' }, solid: true, pat: ['aaaaaaaa', '.a...a..', '.a...a..', 'aaaaaaaa', '...a...a', '...a...a', 'aaaaaaaa', '.a...a..'] });
  def('door', { ch: 'D', base: WL1, pal: { a: DR, b: DR2, g: CH1 }, pat: ['aaaaaaaa', 'a.aaaa.a', 'a.aaaa.a', 'a.aaaa.a', 'a.aaagaa', 'a.aaaa.a', 'a.aaaa.a', 'bbbbbbbb'] });
  def('window', { ch: 'o', base: WL1, pal: { a: WL2, b: W3, c: DR2 }, solid: true, pat: ['aaaaaaaa', '..cccc..', '..cbbc..', '..cbbc..', '..cccc..', 'aaaaaaaa', 'a...a...', 'aaaaaaaa'] });
  def('castle_wall', { ch: 'C', base: '#b0b0c0', pal: { a: '#8a8a9a', b: '#6a6a7a' }, solid: true, pat: ['a.a.a.a.', 'aaaaaaaa', '...a...a', 'aaaaaaaa', 'a...a...', 'aaaaaaaa', '...a...a', 'bbbbbbbb'] });
  def('counter', { ch: 'T', base: WD1, pal: { a: WD2, b: '#c9a06a' }, solid: true, pat: ['bbbbbbbb', 'aaaaaaaa', '........', '.a....a.', '........', 'aaaaaaaa', '........', '........'] });
  def('table', { ch: 't', base: WD1, pal: { a: WD2, b: '#c9a06a' }, solid: true, pat: ['........', '.bbbbbb.', '.aaaaaa.', '..a..a..', '..a..a..', '..a..a..', '........', '........'] });
  def('bed', { ch: 'E', base: WD1, pal: { a: '#f0f0f8', b: RF1, c: WD2 }, solid: true, pat: ['cccccccc', 'c.aaaa.c', 'c.aaaa.c', 'cbbbbbbc', 'cbbbbbbc', 'cbbbbbbc', 'cbbbbbbc', 'cccccccc'] });
  def('bookshelf', { ch: 'K', base: WD2, pal: { a: RF1, b: RB1, c: '#3f9a3f', d: CH1 }, solid: true, pat: ['........', '.abcadb.', '.abcadb.', '........', '.cdabac.', '.cdabac.', '........', '........'] });
  def('sign', { ch: 'S', base: G1, pal: { a: WD1, b: WD2, k: TRK }, solid: true, pat: ['........', '.aaaaaa.', '.abbbba.', '.abbbba.', '.aaaaaa.', '...kk...', '...kk...', '........'] });
  def('pillar', { ch: 'I', base: ST1, pal: { a: '#c0c0d0', b: ST2 }, solid: true, pat: ['.aaaaaa.', '..abba..', '..abba..', '..abba..', '..abba..', '..abba..', '.aaaaaa.', 'bbbbbbbb'] });
  def('fountain', { ch: 'Q', base: ST1, pal: { a: W2, b: W3, c: ST2 }, solid: true, pat: ['.cccccc.', 'caaaaaac', 'caabbaac', 'cabbbbac', 'cabbbbac', 'caabbaac', 'caaaaaac', '.cccccc.'] });
  def('torch', { ch: 'i', base: CV1, pal: { a: LV2, b: LV1, k: TRK }, solid: true, pat: ['........', '...a....', '..aba...', '..bbb...', '...k....', '...k....', '...k....', '........'] });
  def('crystal', { ch: 'X', base: ST1, pal: { a: '#9fe0ff', b: '#5ab0ff', c: '#ffffff' }, solid: true, pat: ['...c....', '..cab...', '..abb...', '.aabbb..', '.aabbb..', '..abb...', '..abb...', '...b....'] });

  // ダンジョン
  def('cave_floor', { ch: 'g', base: CV1, pal: { a: CV2 }, pat: ['........', '.a......', '......a.', '........', '...a....', '........', '.a....a.', '........'] });
  def('cave_wall', { ch: 'G', base: CV2, pal: { a: CV3, b: '#5a5a6a' }, solid: true, pat: ['bbbbbbbb', 'b.a...a.', '..aa..aa', 'a..a....', 'aa....a.', '....aa..', 'a.aa...a', 'aaaaaaaa'] });
  def('stairs_down', { ch: '>', base: CV1, pal: { a: BK, b: '#8a8a9a' }, pat: ['bbbbbbbb', 'baaaaaab', 'bbbbbbab', 'baaaaaab', 'babbbbbb', 'baaaaaab', 'bbbbbbab', 'baaaaaab'] });
  def('stairs_up', { ch: '<', base: CV1, pal: { a: '#c0c0d0', b: '#8a8a9a' }, pat: ['bbbbbbbb', 'baaaaaab', 'bbbbbbab', 'baaaaaab', 'babbbbbb', 'baaaaaab', 'bbbbbbab', 'baaaaaab'] });
  def('chest', { ch: '$', base: CV1, pal: { a: CH1, b: CH2, c: WD2 }, solid: true, pat: ['........', '.bbbbbb.', '.baaaab.', '.bbbbbb.', '.bccacb.', '.bccccb.', '.bbbbbb.', '........'] });
  def('chest_open', { ch: '%', base: CV1, pal: { a: CH1, b: CH2, c: BK }, solid: true, pat: ['.bbbbbb.', '.bccccb.', '.bbbbbb.', '.bccccb.', '.bccccb.', '.bccccb.', '.bbbbbb.', '........'] });
  def('door_locked', { ch: 'L', base: CV2, pal: { a: DR, b: CH1, c: DR2 }, solid: true, pat: ['aaaaaaaa', 'a.aaaa.a', 'a.aaaa.a', 'a.abba.a', 'a.abba.a', 'a.aaba.a', 'a.aaaa.a', 'cccccccc'] });
  def('gate', { ch: 'U', base: CV2, pal: { a: MG, b: '#c0a0ff' }, solid: true, pat: ['abbbbbba', 'ba....ab', 'b.a..a.b', 'b..aa..b', 'b..aa..b', 'b.a..a.b', 'ba....ab', 'abbbbbba'] });
  def('hole', { ch: 'O', base: CV1, pal: { a: BK, b: CV3 }, pat: ['........', '..bbbb..', '.baaaab.', '.baaaab.', '.baaaab.', '.baaaab.', '..bbbb..', '........'] });
  def('lever', { ch: 'v', base: CV1, pal: { a: ST2, b: RF1, c: '#c0c0d0' }, solid: true, pat: ['........', '.....b..', '....c...', '...c....', '..aaaa..', '..aaaa..', '........', '........'] });
  def('warp', { ch: '@', base: CV1, pal: { a: MG, b: '#c0a0ff' }, pat: ['........', '..abba..', '.ab..ba.', '.b....b.', '.b....b.', '.ab..ba.', '..abba..', '........'], pat2: ['........', '..baab..', '.ba..ab.', '.a....a.', '.a....a.', '.ba..ab.', '..baab..', '........'] });
  def('village', { ch: '1', base: G1, pal: { a: RF1, b: WL1, c: DR2, g: G3 }, pat: ['...aa...', '..aaaa..', '.aaaaaa.', '.bbbbbb.', '.bbccbb.', '.bbccbb.', 'g......g', 'gg....gg'] });
  def('castle_icon', { ch: '2', base: G1, pal: { a: '#c0c0d0', b: '#8a8a9a', c: DR2 }, pat: ['a.a..a.a', 'aaaaaaaa', '.aaaaaa.', '.abbbba.', '.abccba.', '.abccba.', '.aaaaaa.', 'aaaaaaaa'] });
  def('cave_icon', { ch: '3', base: G1, pal: { a: MT1, b: BK, c: MT3 }, pat: ['........', '..aaaa..', '.aaaaaa.', 'aaabbaaa', 'aabbbbaa', 'aabbbbaa', 'cabbbbac', 'cccccccc'] });
  def('tower_icon', { ch: '4', base: G1, pal: { a: '#b0b0c0', b: '#6a6a7a', c: DR2 }, pat: ['.a.aa.a.', '.aaaaaa.', '.abbbba.', '.abbbba.', '.abccba.', '.abbbba.', '.abccba.', '.aaaaaa.'] });
  def('ship', { ch: '5', base: W2, pal: { a: WD1, b: '#f0f0f0', c: WD2 }, pat: ['....b...', '...bbb..', '...bbbb.', '...c....', 'aaaaaaaa', '.cccccc.', '..aaaa..', '........'] });

  /* ---------- タイル生成（オフスクリーン描画） ---------- */
  Tiles.get = function (name, frame) {
    var d = Tiles.defs[name]; if (!d) d = Tiles.defs.grass;
    var pat = (frame && d.pat2) ? d.pat2 : d.pat;
    var key = d.name + (frame && d.pat2 ? '#2' : '');
    if (Tiles.cache[key]) return Tiles.cache[key];
    var ts = root.Engine.TS; var c = document.createElement('canvas'); c.width = ts; c.height = ts;
    var ctx = c.getContext('2d'); var cell = ts / 8;
    ctx.fillStyle = d.base; ctx.fillRect(0, 0, ts, ts);
    for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) {
      var ch = pat[y][x]; if (ch === '.') continue; var col = d.pal[ch]; if (!col) continue;
      ctx.fillStyle = col; ctx.fillRect(x * cell, y * cell, cell, cell);
    }
    Tiles.cache[key] = c; return c;
  };
  Tiles.isSolid = function (name) { var d = Tiles.defs[name]; return !!(d && d.solid); };
  Tiles.has = function (name) { return !!Tiles.defs[name]; };

  root.Tiles = Tiles;
})(typeof window !== 'undefined' ? window : globalThis);
