/* =========================================================
   Data / World region : 暗黒大陸（第15〜16章）。40×30 の設計図 → 160×120 タイル
   ・飛空艇で天空群島の北から入る（天空神殿の後に開く空路）
   ・南に虚無の荒野の前線基地、中央に虚無の荒野、北の山に囲まれた魔王城
   ========================================================= */
(function (root) {
  'use strict';
  var MACRO = [
    'oooooooooooooooooooooooooooooooooooooooo',
    'oooooooooooooooooo~~~~~ooooooooooooooooo',
    'oooooooooooo~~~~~~~~~~~~~~~~~ooooooooooo',
    'oooooooooo~~~~~~~~~~m~~~~~~~~~~ooooooooo',
    'oooooooo~~~~~~vmmmmmmmmmmmv~~~~~~ooooooo',
    'ooooooo~~~~~vvmmmmmvvvmmmmmvv~~~~~oooooo',
    'oooooo~~~~vvvvvmmmmvvvmmmmvvvvv~~~~ooooo',
    'ooooo~~~~vvvvvvvvmmmmmmmvvvvvvvv~~~~oooo',
    'oooo~~~~vvvvvvvvvvvvvvvvvvvvvvvvv~~~~ooo',
    'ooo~~~~vvvvvvvvvvvvvvvvvvvvvvvmmmv~~~~oo',
    'ooo~~~vvvmvvvvvvvvvvvvvvvvvvvmmmmmv~~~oo',
    'ooo~~vvmmmmmvvvvvvvvvvvvvvvvvmmmmmvv~~oo',
    'ooo~~vvmmmmmvvvvvvvvvvvvvvvvmmmmmmmv~~oo',
    'oo~~~vmmmmmmmvvvvvvvvvvvvvvvvmmmmmvv~~~o',
    'oo~~~vvmmmmmvvvvvvvvvvvvvvvvvmmmmmvv~~~o',
    'oo~~vvvmmmmmvvvvvvvvvvvvvvvvvvmmmvvvv~~o',
    'oo~~~vvvvmvvvvvvvvvvvvvvvvvvvvvvvvvv~~~o',
    'oo~~~vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv~~~o',
    'ooo~~vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv~~oo',
    'ooo~~vvvvvvvvvvvvvvvvvvvvvlllvvvvvvv~~oo',
    'ooo~~~vvvvvvvvvvvvvvvvvvvlllllvvvvv~~~oo',
    'ooo~~~~vvvvvvvvvvvvvvvvvvvlllvvvvv~~~~oo',
    'oooo~~~~vvvvvvvvvvvv.vvvvvvvvvvvv~~~~ooo',
    'ooooo~~~~vvvvvvvv.......vvvvvvvv~~~~oooo',
    'oooooo~~~~vvvvvv.........vvvvvv~~~~ooooo',
    'ooooooo~~~~~vvvvv.......vvvvv~~~~~oooooo',
    'oooooooo~~~~~~vvvvvv.vvvvvv~~~~~~ooooooo',
    'oooooooooo~~~~~~~~~~v~~~~~~~~~~ooooooooo',
    'oooooooooooo~~~~~~~~~~~~~~~~~ooooooooooo',
    'oooooooooooooooooo~~~~~ooooooooooooooooo'
  ];
  var LOCATIONS = [
    { id: 'dark_camp', name: '虚無の荒野の前線基地', icon: 'village', x: 80, y: 94, to: 'dark_camp', tx: 13, ty: 18 },
    { id: 'void_wasteland', name: '虚無の荒野', icon: 'cave_icon', x: 80, y: 56, to: 'void_wasteland_1', tx: 1, ty: 12 },
    { id: 'demon_castle', name: '魔王城', icon: 'castle_icon', x: 80, y: 22, to: 'demon_castle_gate', tx: 9, ty: 14 }
  ];
  var ROADS = [[[80, 94], [80, 56]], [[80, 56], [80, 22]]];
  var def = root.makeWorldRegion({
    id: 'world_dark', name: '暗黒大陸', MACRO: MACRO, W: 160, H: 120, SEED: 20261227, LOCATIONS: LOCATIONS, ROADS: ROADS, bgm: 'field',
    chests: [{ id: 'dk1', x: 60, y: 70, item: 'elixir', qty: 2 }, { id: 'dk2', x: 100, y: 64, gold: 5000 }, { id: 'dk3', x: 52, y: 90, item: 'phoenix_feather', qty: 3 }],
    npcs: [{ id: 'dw_wanderer', x: 74, y: 76, sprite: 'villager_m', dir: 'down', wander: 1, talk: async function (c) { await c.say('さまよう男', ['……金を、取り返さないと。あと一回。あと一回だけ勝てば……', '（男の目は虚ろだ。足もとに、溶けた金貨がこびりついている）']); await c.remark('lucia', ['取り返したい、という気持ちが、この大陸では形になるのね。', '師匠が言っていた。「連敗のあとの一手が、一番重い」と。'], 'lucia_remark_dark'); } }],
    events: [{ x: 86, y: 88, type: 'learn', solid: false, learnId: 'practice_dark' }],
    encounters: { rate: 0.04, zones: [
      { name: '魔王城の山麓', test: function (x, y) { return y < 40; }, groups: [['control_shade'], ['void_beast'], ['greed_shade', 'fear_shade'], ['control_shade', 'void_beast']], level: 36 },
      { name: '暗黒大陸', test: function () { return true; }, groups: [['greed_shade', 'greed_shade'], ['fear_shade'], ['void_beast'], ['greed_shade', 'fear_shade'], ['fear_shade', 'fear_shade', 'greed_shade']], level: 34 }
    ] }
  });
  root.DARK_DEF = def;
})(typeof window !== 'undefined' ? window : globalThis);
