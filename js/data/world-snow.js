/* =========================================================
   Data / World region (v5.6 Phase 7-2) : 忘却の雪原。40×30 の設計図 → 160×120 タイル
   ・時の神殿領の北端から「北の遠洋航路」（遠洋航海船／飛空艇）で南の海へ着く
   ・南岸：氷港シエル。中央：記憶を売る町フロスト（記憶市場・記憶庫）。北西：精霊の森（アステル）。北東：凍結時計塔（隠し3・アステル加入後）
   ========================================================= */
(function (root) {
  'use strict';
  var MACRO = [
    'mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm',
    'mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm',
    'mmnnnnnnnnnnnnnnnnnnnnnnnnnmmmmmmmmmmmmm',
    'mmnFFFFFFFFFFFFnnnnnnnnnnnnmmmmmmmmmmmmm',
    'mmnFFFFFFFFFFFFnmmmmmmmmmnnmmmmmmmmmmmmm',
    'mmnFFFFFFFFFFFFnmmmmmmmmmnnmmmmmmmmmmmmm',
    'mmnFFFFFFFFFFFFnmmmmmmmmmnnmmmmmmmmmmmmm',
    'mmnFFFFFFFFFFFFnnnnnnnnnnnnmmmmmmmmmmmmm',
    'mmnFFFFFFFFFFFFnnnnnnnnnnnnmmmmmmmmmmmmm',
    'mmnFFFFFFFFFFFFnnnnnnnnnnnnnnnmmmmmmnnmm',
    'mmnFFFFFFFFFFFFnnnnnnnnnnnnnnnmmmmmmnnmm',
    'mmnFFFFFFFFFFFFnnnnnnnnnnnnnnnnnnnnnnnmm',
    'mmnFFFFFFFFFFFFnnnnnnnnnnnnnnnnnnnnnnnmm',
    'mmnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnmm',
    'mmnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnmm',
    'mmnnnnnnnnnnnnnnnnnnnnnnnnnnnnFFFFFFnnmm',
    'mmnnnnnnnnnnnnnnnnnnnnnnnnnnnnFFFFFFnnmm',
    'mmnnFFFFFnnnnnnnnnnnnn~~~nnnnnFFFFFFnnmm',
    'mmnnFFFFFnnnnnnnnnnnnn~~~nnnnnFFFFFFnnmm',
    'mmnnFFFFFnnnnnnnnnnnnnnnnnnnnnFFFFFFnnmm',
    'mmnnFFFFFnnnnnnnnnnnnnnnnnnnnnnnnnnnnnmm',
    'mmnnFFFFFnnnnnnnnnnnnnnnnnnnnnnnnnnnnnmm',
    'mmnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnmm',
    'mmnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnmm',
    'mmnnnnnn~~~nnnnnnn~~~~~nnnnnnn~~nnnnnnmm',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo'
  ];
  var LOCATIONS = [
    { id: 'ciel_port', name: '氷港シエル', icon: 'village', x: 58, y: 94, to: 'ciel_port', tx: 14, ty: 1 },
    { id: 'frost_town', name: '記憶を売る町フロスト', icon: 'village', x: 82, y: 54, to: 'frost_town', tx: 19, ty: 28 },
    { id: 'spirit_forest', name: '精霊の森', icon: 'cave_icon', x: 34, y: 30, to: 'spirit_forest_1', tx: 1, ty: 15 },
    { id: 'frozen_tower', name: '凍結時計塔', icon: 'tower_icon', x: 146, y: 38, to: 'frozen_tower_1', tx: 2, ty: 13, needFlag: 'aster_joined', lockedText: ['塔の扉は、厚い氷に閉ざされている。', 'ふつうの火では溶けない。……精霊の力が要りそうだ。'] }
  ];
  var ROADS = [[[58, 94], [82, 54]], [[82, 54], [34, 30]], [[82, 54], [146, 38]]];
  var def = root.makeWorldRegion({
    id: 'world_snow', name: '忘却の雪原', MACRO: MACRO, W: 160, H: 120, SEED: 20261101, LOCATIONS: LOCATIONS, ROADS: ROADS, bgm: 'field', fallback: 'snow',
    chests: [{ id: 'sn1', x: 20, y: 60, item: 'hi_potion', qty: 3 }, { id: 'sn2', x: 150, y: 60, gold: 2500 }, { id: 'sn3', x: 102, y: 20, item: 'fur_coat', qty: 1 }, { id: 'sn4', x: 44, y: 98, item: 'hi_ether', qty: 2 }],
    npcs: [
      { id: 'sn_hermit', x: 96, y: 66, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) { await c.say('凍った湖の老人', ['この湖は、昔は冬でも凍らなかった。町の者が記憶を売りはじめてから、精霊が眠ってしまってな。', '名前を覚えている者がいなくなると、精霊は凍る。……記憶を手放すというのは、そういうことじゃ。']); } },
      { id: 'sn_trader', x: 120, y: 48, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { await c.say('北の行商人', ['北東の時計塔？ 扉ごと凍りついて誰も入れねえよ。', '精霊の火なら溶かせるって話だが、精霊守なんて、もう森にしかいねえ。']); } }
    ],
    events: [{ x: 66, y: 86, type: 'learn', solid: false, learnId: 'practice_snow' }],
    encounters: { rate: 0.035, zones: [
      { name: '北の雪原', test: function (x, y) { return y < 50; }, groups: [['frost_wolf', 'frost_wolf'], ['ice_wraith'], ['snow_golem'], ['frost_harpy', 'frost_wolf'], ['memory_eater', 'ice_wraith']], level: 27 },
      { name: '忘却の雪原', test: function () { return true; }, groups: [['frost_wolf'], ['frost_harpy', 'frost_harpy'], ['ice_wraith', 'frost_wolf'], ['memory_eater'], ['snow_golem']], level: 25 }
    ] }
  });
  root.SNOW_DEF = def;
})(typeof window !== 'undefined' ? window : globalThis);
