/* =========================================================
   Data / World region : カリオン徴収連邦（第6〜7章）。40×30 の設計図 → 160×120 タイル
   ・グラニア鉱業地方の北の山道「灰の峠」（grania_pass）から入る（第5章 ヴェルム解放後に開通）
   ・南に徴収都市カリオン、北に王都セントラ。西の森の奥に「地図から消えた村」（サブ）
   ========================================================= */
(function (root) {
  'use strict';
  var MACRO = [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~mmmmmmmmmmmmm~~~~~~~~~~~~~~~',
    '~~~~~~~~~~mmmmhhhhhhhmmmmmm~~~~~~~~~~~~~',
    '~~~~~~~~~mmhhh.........hhmmm~~~~~~~~~~~~',
    '~~~~~~~~mhh.............hhmm~~~~~~~~~~~~',
    '~~~~~~~wmh...............hmw~~~~~~~~~~~~',
    '~~~~~~wm.......hh.........mw~~~~~~~~~~~~',
    '~~~~~wh.......hhh..........w~~~~~~~~~~~~',
    '~~~~~w..FF.................w~~~~~~~~~~~~',
    '~~~~w..FFFF...............hw~~~~~~~~~~~~',
    '~~~~w.FFFFF...............hw~~~~~~~~~~~~',
    '~~~~w.FFFF.................w~~~~~~~~~~~~',
    '~~~~w..FF...........hh.....w~~~~~~~~~~~~',
    '~~~~w..............hhh....hw~~~~~~~~~~~~',
    '~~~~w....................hhw~~~~~~~~~~~~',
    '~~~~w......................w~~~~~~~~~~~~',
    '~~~~w......h...............w~~~~~~~~~~~~',
    '~~~~w.....hhh..............w~~~~~~~~~~~~',
    '~~~~w......h...............w~~~~~~~~~~~~',
    '~~~~w......................w~~~~~~~~~~~~',
    '~~~~w......................w~~~~~~~~~~~~',
    '~~~~w......................w~~~~~~~~~~~~',
    '~~~~w......................w~~~~~~~~~~~~',
    '~~~~~w.....................w~~~~~~~~~~~~',
    '~~~~~w....................w~~~~~~~~~~~~~',
    '~~~~~~w......mmmm.........w~~~~~~~~~~~~~',
    '~~~~~~~w....mmmmmm.......w~~~~~~~~~~~~~~',
    '~~~~~~~~w..mmmmmmmm.....w~~~~~~~~~~~~~~~',
    '~~~~~~~~~wwmmmmmmmmwwwww~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'
  ];
  var LOCATIONS = [
    { id: 'kalion_city', name: '徴収都市カリオン', icon: 'castle_icon', x: 60, y: 76, to: 'kalion_city', tx: 24, ty: 35 },
    { id: 'sentra_capital', name: '王都セントラ', icon: 'castle_icon', x: 64, y: 26, to: 'sentra_capital', tx: 24, ty: 35 },
    { id: 'grania_pass_n', name: '灰の峠（北口）', icon: 'cave_icon', x: 60, y: 104, to: 'grania_pass', tx: 7, ty: 1 },
    { id: 'erased_village', name: '地図から消えた村', icon: 'village', x: 42, y: 44, to: 'erased_village', tx: 12, ty: 17, needFlag: 'erased_hint', hidden: true },
    { id: 'secret_lab', name: '秘密研究所', icon: 'cave_icon', x: 92, y: 52, to: 'kalion_lab', tx: 5, ty: 9, needFlag: 'lab_known' },
    { id: 'luxbell', name: '娯楽都市ラックスベル', icon: 'castle_icon', x: 96, y: 80, to: 'luxbell', tx: 20, ty: 28 }   // v6.1 カジノの町（js/data/luxbell.js）
  ];
  var ROADS = [[[60, 104], [60, 76]], [[60, 76], [64, 26]], [[60, 76], [92, 52]], [[60, 76], [96, 80]]];
  var def = root.makeWorldRegion({
    id: 'world_kalion', name: 'カリオン徴収連邦', MACRO: MACRO, W: 160, H: 120, SEED: 20261112, LOCATIONS: LOCATIONS, ROADS: ROADS, bgm: 'field',
    chests: [{ id: 'k1', x: 48, y: 70, item: 'hi_potion', qty: 2 }, { id: 'k2', x: 84, y: 40, gold: 600 }, { id: 'k3', x: 36, y: 56, item: 'phoenix_feather', qty: 1 }, { id: 'k4', x: 76, y: 88, item: 'hi_ether', qty: 2 }, { id: 'k5', x: 40, y: 30, item: 'silk_robe', qty: 1 }],
    npcs: [
      { id: 'kw_tax_sign', x: 60, y: 92, sprite: 'guard', dir: 'down', wander: 0, hideIf: 'kalion_reformed', talk: async function (c) { await c.say('連邦兵', ['ここから北はカリオン徴収連邦の領内だ。「魔災復興税」の納付証を持たぬ者は、都市では商いができん。', '……旅人か。税は払え。払えぬなら、財産を記録に差し出せ。']); } },
      { id: 'kw_fugitive', x: 44, y: 62, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { if (c.flag('erased_hint')) await c.say('逃げてきた女', ['西の森の奥……地図にない村。記録から消された人たちが暮らしている。', '誰も助けに来ないけれど、誰も取り立てにも来ない。']); else { await c.say('逃げてきた女', ['徴収都市から逃げてきたの。財産は帳簿で管理されて、異議を言えば「反逆者」。', '西の森の奥に、記録から消された人たちの村があるって噂。……地図には載っていない。']); c.setFlag('erased_hint', true); await c.msg(['「地図から消えた村」の噂を聞いた。西の森の奥に何かがある……']); } } },
      { id: 'kw_farmer', x: 70, y: 60, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { if (c.flag('kalion_reformed')) await c.say('農夫', ['税は残った。だが今度は使い道が帳簿で公開される。……まあ、見張るのは俺たちの仕事だ。']); else await c.say('農夫', ['麦の三割が「復興税」だ。復興なんて、どこで何が復興してるのか誰も知らねえ。', '王都の塔だけが、毎年高くなる。']); } }
    ],
    events: [{ x: 52, y: 84, type: 'learn', solid: false, learnId: 'practice_kalion' }],
    encounters: { rate: 0.035, zones: [
      { name: 'カリオン平野', test: function (x, y) { return y > 48; }, groups: [['fullleva_ogre'], ['tax_hound'], ['tax_hound', 'tax_hound'], ['paper_wraith'], ['coin_golem'], ['federal_soldier', 'tax_hound'], ['paper_wraith', 'paper_wraith'], ['bandit', 'wild_dog'], ['coin_golem', 'paper_wraith']], rare: [['slime_gold']], rareRate: 0.03, level: 13 },
      { name: '王都周辺', test: function (x, y) { return y <= 48; }, groups: [['fullleva_ogre', 'federal_soldier'], ['federal_soldier', 'federal_soldier'], ['royal_guard'], ['coin_golem', 'coin_golem'], ['paper_wraith', 'tax_hound'], ['royal_guard', 'federal_soldier'], ['harpy', 'harpy']], level: 15 }
    ] }
  });
  root.KALION_DEF = def;
})(typeof window !== 'undefined' ? window : globalThis);
