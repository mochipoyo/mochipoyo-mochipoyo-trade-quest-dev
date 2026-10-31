/* =========================================================
   Data / World region : マクディア魔導王国（第13章）。40×30 の設計図 → 160×120 タイル
   ・時の神殿領の東端から遠洋航路で入る（main_12 達成後）。西の海岸に上陸
   ・中央に魔導都マクディア、北の丘に禁書庫、東の山中に起源の実験室（飛空艇の格納庫）
   ========================================================= */
(function (root) {
  'use strict';
  var MACRO = [
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooo~~~~~ooooooooooooooooo',
    'oooooooooooo~~~~~~~~~~~~~~~~~ooooooooooo',
    'oooooooooo~~~~~~~~~~.~~~~~~~~~~ooooooooo',
    'oooooooo~~~~~~.....hhh.....~~~~~~ooooooo',
    'ooooooo~~~~~.....hhhhhhh.....~~~~~oooooo',
    'oooooo~~~~..F...hhhhhhhhh......~~~~ooooo',
    'ooooo~~~~.FFFFF..hhhhhhh........~~~~oooo',
    'ooooo~~~.FFFFFFF...hhh...........~~~oooo',
    'oooo~~~...FFFFF................m..~~~ooo',
    'oooo~~~.....F................mmmmm~~~ooo',
    'oooo~~......................mmmmmmm~~ooo',
    'ooo~~~......................mmhhhmm~~~oo',
    'ooo~~~.....................mmmhhhmm~~~oo',
    'ooo~~.......................mmhhhmm.~~oo',
    'ooo~~~......................mmmmmmm~~~oo',
    'ooo~~~....F..................mmmmm.~~~oo',
    'oooo~~..FFFFF..................m...~~ooo',
    'oooo~~~FFFFFFF....................~~~ooo',
    'oooo~~~FFFFFFFF...................~~~ooo',
    'ooooo~~~FFFFFF...................~~~oooo',
    'ooooo~~~~FFFF...........hhhhh...~~~~oooo',
    'oooooo~~~~F............hhhhhhh.~~~~ooooo',
    'ooooooo~~~~~............hhhhh~~~~~oooooo',
    'oooooooo~~~~~~.............~~~~~~ooooooo',
    'oooooooooo~~~~~~~~~~.~~~~~~~~~~ooooooooo',
    'oooooooooooo~~~~~~~~~~~~~~~~~ooooooooooo',
    'oooooooooooooooooo~~~~~ooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo'
  ];
  var LOCATIONS = [
    { id: 'magicka_city', name: '魔導都マクディア', icon: 'castle_icon', x: 80, y: 58, to: 'magicka_city', tx: 21, ty: 30 },
    { id: 'forbidden_archive', name: '禁書庫', icon: 'tower_icon', x: 80, y: 30, to: 'forbidden_archive_1', tx: 10, ty: 13, needFlag: 'archive_permit' },
    { id: 'origin_lab', name: '起源の実験室', icon: 'cave_icon', x: 124, y: 56, to: 'origin_lab_1', tx: 1, ty: 12, needFlag: 'minister_defeated' }
  ];
  var ROADS = [[[26, 58], [80, 58]], [[80, 58], [80, 30]], [[80, 58], [124, 56]]];
  var def = root.makeWorldRegion({
    id: 'world_magicka', name: 'マクディア魔導王国', MACRO: MACRO, W: 160, H: 120, SEED: 20261213, LOCATIONS: LOCATIONS, ROADS: ROADS, bgm: 'field',
    chests: [{ id: 'mg1', x: 44, y: 40, item: 'elixir', qty: 1 }, { id: 'mg2', x: 100, y: 90, gold: 3000 }, { id: 'mg3', x: 40, y: 72, item: 'hi_ether', qty: 3 }, { id: 'mg4', x: 104, y: 40, item: 'phoenix_feather', qty: 2 }],
    npcs: [
      { id: 'mw_scholar', x: 60, y: 62, sprite: 'scholar', dir: 'down', wander: 1, talk: async function (c) { if (c.flag('minister_defeated')) await c.say('旅の学者', ['禁書庫の古文書が一部公開されるそうだ。クリスタルもオラクルも、同じ魔導技術から生まれた——学会は大騒ぎだよ。', '技術は悪くない、使う者が悪い、と言う者もいる。……そう簡単に言えればいいんだがね。']); else await c.say('旅の学者', ['マクディアの禁書庫には、クリスタルの起源が記されているという。', 'だが王国は公開を拒んでいる。「技術は国の財産だ」と。……誰のための財産なんだろうね。']); } },
      { id: 'mw_guard', x: 80, y: 40, sprite: 'guard', dir: 'down', wander: 0, hideIf: 'archive_permit', talk: async function (c) { await c.say('王国の衛兵', ['この先は禁書庫。学院長の許可なき者は通せない。', '許可は魔導都の王立学院でもらえる。……もらえた者は、ここ十年いないが。']); } }
    ],
    events: [{ x: 70, y: 60, type: 'learn', solid: false, learnId: 'practice_magicka' }],
    encounters: { rate: 0.035, zones: [
      { name: '実験室の山地', test: function (x, y) { return x >= 104; }, groups: [['mana_golem'], ['arcane_eye', 'arcane_eye'], ['mana_golem', 'grimoire'], ['rune_knight', 'arcane_eye']], level: 29 },
      { name: 'マクディア平原', test: function () { return true; }, groups: [['indicator_mage'], ['indicator_mage', 'grimoire'], ['grimoire', 'grimoire'], ['rune_knight'], ['arcane_eye', 'grimoire'], ['rune_knight', 'arcane_eye'], ['storm_ray']], rare: [['slime_gold']], rareRate: 0.03, level: 28 }
    ] }
  });
  root.MAGICKA_DEF = def;
})(typeof window !== 'undefined' ? window : globalThis);
