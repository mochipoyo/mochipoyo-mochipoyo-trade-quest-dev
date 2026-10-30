/* =========================================================
   Data / World region : 断裂群島（第8〜9章）。40×30 の設計図 → 160×120 タイル
   ・遠洋航海船で world の南端から入る（遠洋航路）。周囲は外海（o → deep：海流。遠洋航海船のみ航行可）
   ・中央の大きな島が灰灯島アルナ：西側に生存者の村、東側は崩れた廃墟の街、北の岬に灯台。南岸に海底都市への潜航地点
   ・東の小島（漂流者）、南西の砂の小島、南東の「霧の島」（イーリス加入後に地図に現れる）
   ========================================================= */
(function (root) {
  'use strict';
  var MACRO = [
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo',
    'ooooooooooooo~~~~~~~oooooooooooooooooooo',
    'ooooooooooo~~~~~~~~~~~oooooooooooooooooo',
    'ooooooooo~~~~~~hhh~~~~~~ooo~~~~~~~~~oooo',
    'oooooooo~~~~~.hhhhhh~~~~~oo~~~~~~~~~oooo',
    'ooooooo~~~~...hhhhhhhh~~~~~~~.....~~~ooo',
    'ooooooo~~~FFF..hhhhhhhh~~~~~~..F..~~~ooo',
    'oooooo~~~FFFFF...hhhhhhh~~~~..FFF..~~ooo',
    'oooooo~~~.FFF....hhhhhhh~~~~~..F..~~~ooo',
    'oooooo~~......mmmmhhhhhhh~~~~.....~~~ooo',
    'oooooo~~......mmmmhhhhhhh~~~~~~~~~~~oooo',
    'oooooo~~......mmmmhhhhhhh~~~~~~~~~~~oooo',
    'oooooo~~~........hhhhhhh~~~ooooooooooooo',
    'oooooo~~~.FFFFF..hhhhchh~~~ooooooooooooo',
    'ooooooo~~~FFFFF..hhhccc~~~oooooooooooooo',
    'ooooooo~~~~......hhhhc~~~~oooooooooooooo',
    'oooo~~~~~~~~~....hhh~~~~~ooooo~~~~~~~ooo',
    'ooo~~~~~~~~~~~~~~~~~~~~~ooooo~~~~~~~~~oo',
    'ooo~~~sss~~~~~~~~~~~~~ooooooo~~~hhh~~~oo',
    'ooo~~sssss~~ooooooooooooooooo~~hhhhh~~oo',
    'ooo~~~sss~~~ooooooooooooooooo~~~hhh~~~oo',
    'ooo~~~~~~~~~ooooooooooooooooo~~~~~~~~~oo',
    'oooo~~~~~~~ooooooooooooooooooo~~~~~~~ooo',
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo'
  ];
  var LOCATIONS = [
    { id: 'aruna_village', name: '灰灯島アルナ・生存者の村', icon: 'village', x: 46, y: 62, to: 'aruna_village', tx: 13, ty: 22 },
    { id: 'aruna_ruins', name: '廃墟の街（東側）', icon: 'castle_icon', x: 86, y: 62, to: 'aruna_ruins', tx: 19, ty: 28 },
    { id: 'aruna_lighthouse', name: '灰灯島の灯台', icon: 'tower_icon', x: 66, y: 34, to: 'aruna_lighthouse', tx: 5, ty: 9 },
    { id: 'mist_isle', name: '霧の島', icon: 'cave_icon', x: 134, y: 98, to: 'mist_isle', tx: 5, ty: 10, needFlag: 'iris_joined', hidden: true }
  ];
  var ROADS = [[[46, 62], [86, 62]], [[46, 62], [66, 34]]];
  var def = root.makeWorldRegion({
    id: 'world_islands', name: '断裂群島', MACRO: MACRO, W: 160, H: 120, SEED: 20261120, LOCATIONS: LOCATIONS, ROADS: ROADS, bgm: 'field',
    chests: [{ id: 'is1', x: 28, y: 96, item: 'elixir', qty: 1 }, { id: 'is2', x: 40, y: 50, item: 'hi_potion', qty: 3 }, { id: 'is3', x: 90, y: 78, gold: 1500 }, { id: 'is4', x: 124, y: 44, item: 'phoenix_feather', qty: 1 }, { id: 'is5', x: 70, y: 52, item: 'hi_ether', qty: 2 }],
    npcs: [
      { id: 'is_castaway', x: 126, y: 54, sprite: 'villager_m', dir: 'down', wander: 0, hideIf: 'castaway_saved', talk: async function (c) {
        await c.say('漂流者', ['……人だ！ 船か？ 頼む、アルナの村まで乗せてくれ。', '交易船が嵐で割れて、ここに流れ着いた。三週間、貝と雨水で生きてきた。']);
        var a = await c.choice('漂流者を船に乗せる？', ['乗せる', 'あとで']); if (a !== 0) return;
        c.setFlag('castaway_saved', true); await c.msg(['漂流者を遠洋航海船に乗せた。アルナの村で降ろそう。']);
        if (!c.questActive('castaway') && !c.questDone('castaway')) c.questStart('castaway');
      } },
      { id: 'is_fisher', x: 44, y: 70, sprite: 'villager_f', dir: 'down', wander: 1, talk: async function (c) { if (c.flag('lighthouse_lit')) await c.say('島の漁師', ['灯台が点いた夜、沖に船の灯りが見えた。十八年ぶりだ。', '東の廃墟には行くな……と言いたいが、あんたたちはもう行ったんだろう。']); else await c.say('島の漁師', ['西半分で暮らしているのは、生き残った者だけだ。東側は……行くな。', '灯台は消えたまま。船は来ない。来たのはあんたたちが最初だ。']); } }
    ],
    events: [
      { x: 70, y: 82, type: 'dive', needFlag: 'submarine_owned', to: 'elmina_undersea', tx: 10, ty: 18, text: ['南岸の岩場。古代の潜航装置を据える台座がある。', '装置の記録：「沈んだ都エルミナへ。記憶を求める者のみ」'], lockedText: ['南岸の岩場。古びた台座があるが、何かを据える場所のようだ。', '（地下施設で見つかるものが要るのかもしれない）'] },
      { x: 60, y: 66, type: 'learn', solid: false, learnId: 'practice_islands' }
    ],
    encounters: { rate: 0.035, zones: [
      { name: '廃墟側の荒地', test: function (x, y) { return x >= 72; }, groups: [['ruin_shade'], ['ruin_shade', 'ruin_shade'], ['lantern_wisp', 'ruin_shade'], ['drift_golem'], ['rust_crab', 'rust_crab'], ['lantern_wisp', 'lantern_wisp']], level: 19 },
      { name: '灰灯島の草地', test: function () { return true; }, groups: [['salt_wolf', 'salt_wolf'], ['rust_crab'], ['gull_pirate', 'gull_pirate'], ['salt_wolf', 'rust_crab'], ['lantern_wisp']], rare: [['slime_gold']], rareRate: 0.03, level: 18 }
    ] }
  });
  root.ISLANDS_DEF = def;
})(typeof window !== 'undefined' ? window : globalThis);
