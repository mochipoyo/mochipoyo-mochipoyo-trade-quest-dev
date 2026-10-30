/* =========================================================
   Data / World region : 天空群島（第14章）。40×30 の設計図 → 160×120 タイル
   ・飛空艇でアルカディア相場大陸の北の空から入る（空路）。島のまわりは雲海（歩けない・船も進めない）
   ・南西の星見島（星見塔・野営地）、東の風の島、北の天空神殿の島。島へは飛空艇で着陸して歩く
   ========================================================= */
(function (root) {
  'use strict';
  var MACRO = [
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkkk.....kkkkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkk...hhh...kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkk...hhhhh...kkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkk....hhh....kkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkk...........kkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkk.........kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkkk.....kkkkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkk.kkkkkkkkkkk',
    'kkkkkkkkkkkkkkkkkkkkkkkkk....F..kkkkkkkk',
    'kkkkkkkkkkkkkkkkkkkkkkkk....FFF..kkkkkkk',
    'kkkkkkkkkk.....kkkkkkkkk.....F...kkkkkkk',
    'kkkkkkkk.........kkkkkkk.........kkkkkkk',
    'kkkkkkkk....h....kkkkkkkk.......kkkkkkkk',
    'kkkkkkk....hhh....kkkkkkkkkk.kkkkkkkkkkk',
    'kkkkkkkk....h....kkkkkkkkkkkkkkkkkkkkkkk',
    'kkkkkkkk.........kkkkkkkkkkkkkkkkkkkkkkk',
    'kkkkkkkkkk.....kkkkkkkkkkkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk'
  ];
  var LOCATIONS = [
    { id: 'star_tower', name: '星見塔', icon: 'tower_icon', x: 48, y: 76, to: 'star_tower_1', tx: 7, ty: 12 },
    { id: 'star_camp', name: '星見塔の野営地', icon: 'village', x: 42, y: 86, to: 'star_camp', tx: 9, ty: 12 },
    { id: 'sky_temple', name: '天空神殿', icon: 'castle_icon', x: 76, y: 24, to: 'sky_temple_1', tx: 9, ty: 14, needFlag: 'sky_record' }
  ];
  var ROADS = [[[42, 86], [48, 76]]];
  function stone(id, n, title, lines) { return { x: 0, y: 0, type: 'script', solid: true, _id: id, run: async function (c) { var d = root.State.data; await c.msg(['【' + title + '】'].concat(lines)); if (!d.flags[id]) { d.flags[id] = true; await c.msg(['記録碑を読んだ。（天空の記録 ' + ['sky_1', 'sky_2', 'sky_3'].filter(function (f) { return d.flags[f]; }).length + '/3）']); } } }; }
  var s1 = stone('sky_1', 1, '星見島の記録碑', ['「我らは均衡のクリスタルを作った。富を偏らせず、世界の波を穏やかにするために」', '「波は穏やかになった。だが、人はもっと穏やかな波を、やがて波のない海を望んだ」']); s1.x = 54; s1.y = 82;
  var s2 = stone('sky_2', 2, '風の島の記録碑', ['「未来を一つに固定する機能が、クリスタルには眠っている。我らはそれを『制御装置』として切り離し、天空神殿に封印した」', '「封印の鍵は人の側に置いた。人が自ら望まぬ限り、封印は破れぬように」']); s2.x = 112; s2.y = 64;
  var s3 = stone('sky_3', 3, '神殿島の記録碑', ['「もし封印が破られたなら、それは魔が破ったのではない。人が望んだのだ」', '「そのときは、壊すか、作り変えるかを選べ。我らは選べなかった」']); s3.x = 68; s3.y = 32;
  var def = root.makeWorldRegion({
    id: 'world_sky', name: '天空群島', MACRO: MACRO, W: 160, H: 120, SEED: 20261220, LOCATIONS: LOCATIONS, ROADS: ROADS, bgm: 'field',
    chests: [{ id: 'sk1', x: 38, y: 78, item: 'elixir', qty: 2 }, { id: 'sk2', x: 118, y: 72, item: 'star_bow', qty: 1 }, { id: 'sk3', x: 84, y: 30, gold: 4000 }],
    npcs: [{ id: 'sw_hermit', x: 106, y: 70, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) { await c.say('風の島の隠者', ['飛空艇で来たのか。百年ぶりの客だ。', 'この島々は、クリスタルを作った者たちの最後の居場所だった。彼らは地上に降りなかった。自分たちの作ったものを、見届ける勇気がなかったのだ。']); } }],
    events: [s1, s2, s3, { x: 50, y: 88, type: 'learn', solid: false, learnId: 'practice_sky' }],
    encounters: { rate: 0.035, zones: [
      { name: '天空神殿の島', test: function (x, y) { return y < 50; }, groups: [['star_sentinel'], ['storm_harpy', 'storm_harpy'], ['cloud_slime', 'star_sentinel'], ['storm_harpy', 'cloud_slime', 'cloud_slime']], level: 32 },
      { name: '天空群島', test: function () { return true; }, groups: [['cloud_slime', 'cloud_slime'], ['storm_harpy'], ['cloud_slime', 'storm_harpy'], ['star_sentinel']], level: 31 }
    ] }
  });
  root.SKY_DEF = def;
})(typeof window !== 'undefined' ? window : globalThis);
