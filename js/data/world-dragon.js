/* =========================================================
   Data / World region (v5.5 Phase 7-1) : 竜炎火山群島。40×30 の設計図 → 160×120 タイル
   ・マクディア魔導王国の南端から「南の遠洋航路」（遠洋航海船／飛空艇。魔導都に入ったあと）で北の海へ着く
   ・西の主島：鍛冶街イグナス、火山の中腹に火口の祭壇。東の島：竜脈洞窟（奥に古竜、さらに奥に隠しダンジョン）
   ・島と島の間は船で渡る（飛空艇なら直接）
   ========================================================= */
(function (root) {
  'use strict';
  var MACRO = [
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooooooooooooooooooooooooo',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~aa~~~~~~~~~~~~~~~~',
    '~~~~aaaaaaaaaaaaaa~~~~aa~~~~~~~~~~~~~~~~',
    '~~~aaaaaaaaaaaaaaaaa~~~~~~~~~~~~~~~~~~~~',
    '~~~aaaaaammmmmmmaaaa~~~~~~~~~~~~~~~~~~~~',
    '~~~aaaaaammlllmmaaaa~~~~~~~~~~~~~~~~~~~~',
    '~~~aaaaaammlllmmaaaa~~~~~~~~~~~~~~~~~~~~',
    '~~~aaaaaammmmmmmaaaa~~~~~~aaaaaaaa~~~~~~',
    '~~~aaaaaammmmmmmaaaa~~~~aaaaaaaaaaaa~~~~',
    '~~~aaaaaaaaaaaaaaaaa~~~~aaaaaaaaaaaa~~~~',
    '~~~aaaaaaaaaaaaaaaaa~~~~aaaammmmmaaa~~~~',
    '~~~aaaaaaaaaaaaallll~~~~aaaammmmmaaa~~~~',
    '~~~aaaaaaaaaaaaallll~~~~aaaammmmmaaa~~~~',
    '~~~aaaaaaaaaaaaaaaaa~~~~aaaaaaaaaaaa~~~~',
    '~~~ammmaaaaaaaaaaaaa~~~~aaaaaaaaaaaa~~~~',
    '~~~ammmaaaaaaaaaaaaa~~~~aaaaaaaaaaaa~~~~',
    '~~~ammmaaaaaaaaaaaaa~~~~llaaaaaaaaaa~~~~',
    '~~~aaaaaaaaaaaaaaaaa~~~~llaaaaaaammm~~~~',
    '~~~aaaaaaaaaaaaaaaaa~~~~aaaaaaaaammm~~~~',
    '~~~aaaaaaaaaaaaaaaaa~~~~aaaaaaaaammm~~~~',
    '~~~~~aaaaaaaaaaaa~~~~~~~aaaaaaaaaaaa~~~~',
    '~~~~~aaaaaaaaaaaa~~~~~~~aaaaaaaaaaaa~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~aaaaaaaaa~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~aa~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~aa~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~'
  ];
  var LOCATIONS = [
    { id: 'ignas_town', name: '鍛冶街イグナス', icon: 'village', x: 30, y: 62, to: 'ignas_town', tx: 17, ty: 24 },
    { id: 'crater_altar', name: '火口の祭壇', icon: 'tower_icon', x: 50, y: 46, to: 'crater_altar', tx: 9, ty: 12 },
    { id: 'dragon_vein', name: '竜脈洞窟', icon: 'cave_icon', x: 118, y: 70, to: 'dragon_vein_1', tx: 1, ty: 14 }
  ];
  var ROADS = [[[30, 62], [50, 46]], [[30, 62], [30, 88]]];
  var def = root.makeWorldRegion({
    id: 'world_dragon', name: '竜炎火山群島', MACRO: MACRO, W: 160, H: 120, SEED: 20261031, LOCATIONS: LOCATIONS, ROADS: ROADS, bgm: 'field', fallback: 'ash',
    chests: [{ id: 'dr1', x: 90, y: 18, item: 'phoenix_feather', qty: 1 }, { id: 'dr2', x: 150, y: 110, item: 'dragon_scale', qty: 1 }, { id: 'dr3', x: 20, y: 30, gold: 3000 }, { id: 'dr4', x: 136, y: 48, item: 'elixir', qty: 2 }],
    npcs: [
      { id: 'dr_hermit', x: 126, y: 92, sprite: 'elder', dir: 'down', wander: 0, talk: async function (c) { await c.say('島の老人', ['竜脈洞窟の奥には、古い竜が眠っておる。人が竜の鱗を剥いで売っていた頃、竜は怒って山を焼いた。', '今は鍛冶屋が、落ちた鱗だけを拾う。剥がずに、待つ。……それで、この島は百年もっておる。']); } },
      { id: 'dr_smith', x: 34, y: 80, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('見習い鍛冶', ['イグナスの鍛冶長は、一度に一本しか打たない。急ぎの客にも、高値の客にも。', '「同じ鉄でも、焦って打てば割れる」ってさ。']); await c.remark('ganes', ['……いい言葉だ。工場では、一日に千本打たされた。'], 'ganes_remark_ignas'); } }
    ],
    events: [{ x: 24, y: 40, type: 'learn', solid: false, learnId: 'practice_dragon' }],
    encounters: { rate: 0.035, zones: [
      { name: '竜脈の島', test: function (x, y) { return x >= 92; }, groups: [['vein_wyrmling'], ['fire_drake', 'magma_slime'], ['obsidian_golem'], ['cinder_bird', 'cinder_bird'], ['fire_drake', 'cinder_bird']], level: 31 },
      { name: '竜炎火山群島', test: function () { return true; }, groups: [['magma_slime', 'magma_slime'], ['fire_drake'], ['cinder_bird', 'magma_slime'], ['flame_spirit'], ['cinder_bird', 'cinder_bird', 'magma_slime']], level: 30 }
    ] }
  });
  root.DRAGON_DEF = def;
})(typeof window !== 'undefined' ? window : globalThis);
