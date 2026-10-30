/* =========================================================
   Data / World region : 時の神殿領（第10章）。40×30 の設計図 → 160×120 タイル
   ・断裂群島の東端から遠洋航路で入る（設計の「忘却の雪原から東の道」は雪原未実装のため、遠洋航路で代替）
   ・西岸の港から鐘都テンプス（時間銀行）、北東の山地に時の神殿、南東の高地に転移門（神殿の試練後に開く）
   ========================================================= */
(function (root) {
  'use strict';
  var MACRO = [
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo',
    'ooooooooooooooooooo~~~~~oooooooooooooooo',
    'ooooooooooooo~~~~~~~~~~~~~~~~~oooooooooo',
    'oooooooooo~~~~~~~~~~~~~~~~~~~~~~~ooooooo',
    'ooooooooo~~~~~~.............~~~~~~oooooo',
    'ooooooo~~~~~...............mmmm~~~~~oooo',
    'oooooo~~~~~F...............mmhhh~~~~~ooo',
    'ooooo~~~~FFFF.............mmmhhhhh~~~~oo',
    'ooooo~~~FFFFFF.............mmhhhhhm~~~oo',
    'oooo~~~.FFFFF..............mmmmhmmmm~~~o',
    'oooo~~~..FFF................mmmmmmm.~~~o',
    'oooo~~.........................m.....~~o',
    'ooo~~~s..............................~~~',
    'ooo~~~s.............hhh..............~~~',
    'ooo~~..............hhhhh..............~~',
    'ooo~~~s.............hhh..............~~~',
    'ooo~~~s..............................~~~',
    'oooo~~...............................~~o',
    'oooo~~~.FFF......................h..~~~o',
    'oooo~~~FFFFFF..................hhhhh~~~o',
    'ooooo~~~FFFFF.................hhhhh~~~oo',
    'ooooo~~~~FFFF................hhhhh~~~~oo',
    'oooooo~~~~~.........nnn.......hh~~~~~ooo',
    'ooooooo~~~~~.......nnnnn.......~~~~~oooo',
    'ooooooooo~~~~~~.....nnn.....~~~~~~oooooo',
    'oooooooooo~~~~~~~~~~~~~~~~~~~~~~~ooooooo',
    'ooooooooooooo~~~~~~~~~~~~~~~~~oooooooooo',
    'ooooooooooooooooooo~~~~~oooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo'
  ];
  var LOCATIONS = [
    { id: 'tempus_city', name: '鐘都テンプス', icon: 'castle_icon', x: 58, y: 62, to: 'tempus_city', tx: 19, ty: 28 },
    { id: 'temple_of_time', name: '時の神殿', icon: 'tower_icon', x: 126, y: 38, to: 'temple_of_time_1', tx: 9, ty: 14 },
    { id: 'dimension_gate', name: '転移門', icon: 'cave_icon', x: 134, y: 90, to: 'world_machine', tx: 82, ty: 100, needFlag: 'dimension_gate' }
  ];
  var ROADS = [[[58, 62], [126, 38]], [[58, 62], [134, 90]], [[26, 60], [58, 62]]];
  var def = root.makeWorldRegion({
    id: 'world_tempus', name: '時の神殿領', MACRO: MACRO, W: 160, H: 120, SEED: 20261128, LOCATIONS: LOCATIONS, ROADS: ROADS, bgm: 'field',
    chests: [{ id: 't1', x: 41, y: 47, item: 'hi_potion', qty: 3 }, { id: 't2', x: 100, y: 80, gold: 1800 }, { id: 't3', x: 45, y: 80, item: 'elixir', qty: 1 }, { id: 't4', x: 118, y: 52, item: 'hi_ether', qty: 2 }, { id: 't5', x: 86, y: 96, item: 'sage_robe', qty: 1 }],
    npcs: [
      { id: 'tw_bell', x: 62, y: 70, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { if (c.flag('time_bank_freed')) await c.say('鐘都の男', ['時間銀行の契約が無効になった。……返ってきた時間で、何をすればいいんだろうな。', '決めるのは自分か。慣れてないんだ。']); else await c.say('鐘都の男', ['鐘都テンプスへようこそ。ここの鐘は、一日に一度しか鳴らない。鳴ったときが「確定した未来」だ。', '時間銀行に時間を預けると、確定した未来を教えてもらえる。……預けた時間は、返ってこないが。']); } },
      { id: 'tw_pilgrim', x: 110, y: 46, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { await c.say('巡礼者', ['時の神殿に登れば、自分の未来が見えるという。栄える未来も、滅ぶ未来も。', '私は「確実な未来」が欲しい。不安なまま生きるのは、もう嫌。']); await c.remark('lucia', ['確実な未来……。相場に「確実」があると言う者を、師匠は信じなかった。'], 'lucia_remark_pilgrim'); } }
    ],
    events: [{ x: 70, y: 56, type: 'learn', solid: false, learnId: 'practice_tempus' }],
    encounters: { rate: 0.035, zones: [
      { name: '神殿の山地', test: function (x, y) { return x >= 100 && y <= 60; }, groups: [['hourglass_golem'], ['chrono_moth', 'chrono_moth'], ['bell_wraith', 'chrono_moth'], ['hourglass_golem', 'bell_wraith']], level: 23 },
      { name: '鐘都の平野', test: function () { return true; }, groups: [['chrono_moth', 'chrono_moth'], ['debt_collector'], ['bell_wraith'], ['debt_collector', 'chrono_moth'], ['salt_wolf', 'salt_wolf', 'chrono_moth']], rare: [['slime_gold']], rareRate: 0.03, level: 22 }
    ] }
  });
  root.TEMPUS_DEF = def;
})(typeof window !== 'undefined' ? window : globalThis);
