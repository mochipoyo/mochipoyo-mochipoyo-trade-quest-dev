/* =========================================================
   Data / World region (v5.5 Phase 7-1) : リシア砂漠。40×30 の設計図 → 160×120 タイル
   ・断裂群島の南端から「南の遠洋航路」（遠洋航海船／飛空艇。main_8 達成後）で北の海へ着く
   ・北の砂漠：砂都サハル・鏡の市場。中央の断崖は「砂嵐の回廊」でしか越えられない（飛空艇なら越えられる）
   ・南の砂漠：蜃気楼神殿（隊商護衛の達成後）、涸れかけた泉
   ========================================================= */
(function (root) {
  'use strict';
  var MACRO = [
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo',
    'o~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~o',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    'cc~~~~~sssssss~~~~sssssssss~~~ssss~~~scc',
    'ccsssssssssssssssssssssssssssssssssssscc',
    'ccssmmsssssssssssssssssssssssssssssssscc',
    'ccssmmssssssssssssssssssssssssmmmssssscc',
    'ccssssssssssssssssssssssssssssmmmssssscc',
    'ccsssss~~sssssssssmmsssssssssssssssssscc',
    'ccsssss~~sssssssssmmsssssssssssssssssscc',
    'ccsssssssssssssssssssssssssssssssssssscc',
    'cccccccccccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccccccccccc',
    'ccsssssssssssssssssssssssssssssssssssscc',
    'ccsssssssssssssssssssssssssssssssssssscc',
    'ccsssssssssssssssssssssssssssssssssssscc',
    'ccssssmmmssssssssssssssssssssssssmmmsscc',
    'ccssssmmmsss~~sssssssssssssssssssmmmsscc',
    'ccssssmmmssssssssssssssssssssssssssssscc',
    'ccsssssssssssssssssssssssssssssssssssscc',
    'ccssssssssssssssmmmssssssssssssssssssscc',
    'ccssssssssssssssmmmssssssssssssssssssscc',
    'ccsssssssssssssssssssssssssssssssssssscc',
    'ccssssssssssssssssssssmmmssssssssssssscc',
    'ccssssssssssssssssssssmmmssssssssssssscc',
    'ccsssssssssssssssssssssssssssssssssssscc',
    'cccccccccccccccccccccccccccccccccccccccc',
    'cccccccccccccccccccccccccccccccccccccccc'
  ];
  var LOCATIONS = [
    { id: 'sahar_city', name: '砂都サハル', icon: 'village', x: 50, y: 34, to: 'sahar_city', tx: 19, ty: 28 },
    { id: 'mirror_market', name: '鏡の市場', icon: 'village', x: 86, y: 34, to: 'mirror_market', tx: 15, ty: 20 },
    { id: 'storm_north', name: '砂嵐の回廊（北口）', icon: 'cave_icon', x: 98, y: 49, to: 'sandstorm_corridor_1', tx: 2, ty: 9 },
    { id: 'storm_south', name: '砂嵐の回廊（南口）', icon: 'cave_icon', x: 98, y: 62, to: 'sandstorm_corridor_2', tx: 27, ty: 9 },
    { id: 'mirage_temple', name: '蜃気楼神殿', icon: 'castle_icon', x: 122, y: 98, to: 'mirage_temple_1', tx: 9, ty: 12, needFlag: 'caravan_done' }
  ];
  var ROADS = [[[50, 34], [86, 34]], [[86, 34], [98, 49]], [[50, 34], [50, 22]], [[98, 62], [122, 98]]];
  var def = root.makeWorldRegion({
    id: 'world_desert', name: 'リシア砂漠', MACRO: MACRO, W: 160, H: 120, SEED: 20261030, LOCATIONS: LOCATIONS, ROADS: ROADS, bgm: 'field', fallback: 'sand',
    chests: [{ id: 'ds1', x: 26, y: 30, item: 'hi_potion', qty: 3 }, { id: 'ds2', x: 140, y: 44, gold: 1800 }, { id: 'ds3', x: 40, y: 86, item: 'scimitar', qty: 1 }, { id: 'ds4', x: 140, y: 104, item: 'elixir', qty: 1 }, { id: 'ds5', x: 66, y: 100, item: 'hi_ether', qty: 2 }],
    npcs: [
      { id: 'ds_lost', x: 120, y: 40, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { await c.say('迷った行商人', ['昨日、東に水場が見えたんだ。歩いても歩いても近づかない。……蜃気楼だった。', '遠くに見えるものほど、確かめてから向かうべきだったよ。']); await c.remark('iris', ['地図には、見えたものじゃなくて、確かめたものだけ描くの。', '蜃気楼は、地図には描かない。'], 'iris_remark_desert'); } },
      { id: 'ds_hermit', x: 56, y: 80, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) { await c.say('泉の番人', ['この泉は、四十年前は湖だった。毎年少しずつ減っていく。', '雨の年には増える。そのたびに町の者は「水が戻った」と喜ぶ。……減っていく流れは、変わっておらんのにな。']); } }
    ],
    events: [{ x: 66, y: 42, type: 'learn', solid: false, learnId: 'practice_desert' }],
    encounters: { rate: 0.035, zones: [
      { name: '南の砂漠', test: function (x, y) { return y >= 58; }, groups: [['sand_worm'], ['dune_scorpion', 'dune_scorpion'], ['mirage_fox', 'dust_djinn'], ['rumor_mimic'], ['sand_worm', 'mirage_fox'], ['dune_scorpion', 'dust_djinn', 'mirage_fox']], level: 24 },
      { name: 'リシア砂漠', test: function () { return true; }, groups: [['mirage_fox', 'mirage_fox'], ['dune_scorpion'], ['sand_worm'], ['mirage_fox', 'dune_scorpion'], ['caravan_raider', 'caravan_raider'], ['dust_djinn']], level: 22 }
    ] }
  });
  root.DESERT_DEF = def;
})(typeof window !== 'undefined' ? window : globalThis);
