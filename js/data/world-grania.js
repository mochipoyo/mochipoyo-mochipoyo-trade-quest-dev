/* =========================================================
   Data / World region : グラニア鉱業地方（第5章）。world と同じ 40×30 の設計図 → 160×120 タイル
   ・西の海岸に小型帆船で上陸する（海路：world の東端 ⇄ world_grania の西端）
   ・灰の荒地（8/9）と鉱山地帯。灰鉱町ヴェルムと鉄鎖鉱山が主な目的地
   ・将来の拡張：鉄冠将軍の砦（needFlag で封鎖）、北の氷港シエルへの港（第8章以降）
   ========================================================= */
(function (root) {
  'use strict';
  // ~:深海 w:浅瀬 .:草原 F:森 m:山 h:丘 a:灰の荒地 s:砂浜
  var MACRO = [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~mmmm~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~mmmmmmmm~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~mmmmmmmmmmm~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~hhmmmaaammmmmm~~~~~~~~~~~~~',
    '~~~~~~~~~~~~hhhmmaaaaammmmmmm~~~~~~~~~~~',
    '~~~~~~~~~~~hhh..maaaaaammmmmmm~~~~~~~~~~',
    '~~~~~~~~~~hh....maaaaaaammmmmm~~~~~~~~~~',
    '~~~~~~~~ws.......aaaaaaaammmmm~~~~~~~~~~',
    '~~~~~~~ws........aaaaaaaamm.mm~~~~~~~~~~',
    '~~~~~~ws..........aaaaaaa...F~~~~~~~~~~~',
    '~~~~~ws....FF......aaaaa...FFF~~~~~~~~~~',
    '~~~~~ws...FFFF......aaa...FFFFw~~~~~~~~~',
    '~~~~ws....FFF........a....FFFFFw~~~~~~~~',
    '~~~~ws....hh.............FFFFFw~~~~~~~~~',
    '~~~~ws...hhh...........FFFF..w~~~~~~~~~~',
    '~~~~ws..hhh...........FFF....w~~~~~~~~~~',
    '~~~~ws..hh.............F.....w~~~~~~~~~~',
    '~~~~~ws.......hh.............w~~~~~~~~~~',
    '~~~~~ws......hhhh...........w~~~~~~~~~~~',
    '~~~~~~ws.....hhh...........w~~~~~~~~~~~~',
    '~~~~~~~ws..........hh....ww~~~~~~~~~~~~~',
    '~~~~~~~~ws.........hhh..w~~~~~~~~~~~~~~~',
    '~~~~~~~~~ws.........h..w~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~wss.........w~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~wsss....ww~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~wwwwww~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'
  ];
  var LOCATIONS = [
    { id: 'verum_town', name: '灰鉱町ヴェルム', icon: 'village', x: 56, y: 58, to: 'verum_town', tx: 20, ty: 29 },
    { id: 'iron_mine', name: '鉄鎖鉱山', icon: 'cave_icon', x: 86, y: 34, to: 'iron_mine_1', tx: 1, ty: 14 },
    { id: 'ash_shore', name: '灰の浜の番小屋', icon: 'village', x: 34, y: 52, to: 'ash_shore_hut', tx: 5, ty: 7 },
    { id: 'iron_fort', name: '鉄冠将軍の砦', icon: 'castle_icon', x: 106, y: 26, to: 'iron_fort_gate', tx: 5, ty: 7, needFlag: 'iron_fort_open' },
    { id: 'grania_pass_s', name: '灰の峠（南口）', icon: 'cave_icon', x: 60, y: 24, to: 'grania_pass', tx: 7, ty: 14 },
    // v5.6：隠しダンジョン1（平野の北）・2（南東の海の礁。船でのみ）、海の小島2つ（船でのみ）
    { id: 'ash_cave', name: '灰の洞窟', icon: 'cave_icon', x: 44, y: 38, to: 'ash_cave_1', tx: 1, ty: 12 },
    { id: 'sunken_reef', name: '沈没船の礁', icon: 'cave_icon', x: 134, y: 96, to: 'sunken_reef_1', tx: 2, ty: 12 },
    { id: 'pirate_nest', name: '海賊カモメの巣', icon: 'village', x: 20, y: 100, to: 'pirate_nest', tx: 7, ty: 6 },
    { id: 'ash_cape', name: '灰の岬', icon: 'village', x: 128, y: 20, to: 'ash_cape', tx: 8, ty: 5 }
  ];
  var ROADS = [[[34, 52], [56, 58]], [[56, 58], [86, 34]], [[86, 34], [106, 26]], [[56, 58], [60, 24]]];
  var def = root.makeWorldRegion({
    id: 'world_grania', name: 'グラニア鉱業地方', MACRO: MACRO, W: 160, H: 120, SEED: 20261105, LOCATIONS: LOCATIONS, ROADS: ROADS, bgm: 'field',
    chests: [{ id: 'g1', x: 40, y: 50, item: 'hi_potion', qty: 2 }, { id: 'g2', x: 70, y: 70, gold: 400 }, { id: 'g3', x: 96, y: 46, item: 'iron_armor', qty: 1 }, { id: 'g4', x: 50, y: 84, item: 'hi_ether', qty: 1 }, { id: 'g5', x: 96, y: 70, item: 'tent', qty: 2 }],
    npcs: [
      { id: 'gr_refugee', x: 60, y: 62, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { if (c.flag('verum_liberated')) await c.say('町を出た女', ['町に戻るところよ。監督官がいなくなったって本当？ ……まだ信じられないけど、子どもに会いたい。']); else await c.say('町を出た女', ['ヴェルムから逃げてきたの。働いても働いても、賃金は「魔災税」と借金で消える。', '逃げた者は鎖の猟犬に追われる。あなたも気をつけて。']); } },
      { id: 'gr_miner', x: 82, y: 38, sprite: 'villager_m', dir: 'down', wander: 0, talk: async function (c) { if (c.flag('verum_overseer_defeated')) await c.say('元・坑夫', ['鉱山の奥はまだ崩れやすい。だが監督官がいない今、俺たちは自分の意思で入れる。']); else await c.say('坑夫', ['この先が鉄鎖鉱山だ。中では鎖の看守が見張っている。見つかれば鉱石を運ばされる。', '鉱石は町じゃなく、砦の方へ運ばれていく。何に使うのか、誰も教えてくれない。']); } }
    ],
    events: [{ x: 48, y: 66, type: 'learn', solid: false, learnId: 'practice_grania' }],
    encounters: { rate: 0.035, zones: [
      { name: 'グラニアの灰野', test: function (x, y) { return x < 70 || y > 60; }, groups: [['simple_cultist'], ['simple_cultist', 'smoke_wraith'], ['smoke_wraith'], ['iron_beetle', 'iron_beetle'], ['chain_hound'], ['chain_hound', 'smoke_wraith'], ['iron_beetle', 'chain_hound'], ['ash_golem'], ['smoke_wraith', 'smoke_wraith'], ['gull_pirate', 'gull_pirate']], rare: [['slime_metal']], rareRate: 0.02, level: 10 },
      { name: '鉱山地帯', test: function (x, y) { return x >= 70 && y <= 60; }, groups: [['ash_golem', 'iron_beetle'], ['chain_hound', 'chain_hound'], ['mine_imp', 'mine_imp'], ['ore_bat', 'ore_bat', 'mine_imp'], ['ash_golem'], ['chain_warden'], ['smoke_wraith', 'mine_imp']], level: 12 }
    ] }
  });
  root.GRANIA_DEF = def;
})(typeof window !== 'undefined' ? window : globalThis);
