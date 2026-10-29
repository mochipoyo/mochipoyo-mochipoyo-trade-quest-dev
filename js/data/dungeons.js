/* =========================================================
   Data / Dungeons : ダンジョンマップ・ギミック・ボス
   events.type: inspect / locked(鍵扉) / trial(チャート試練の扉) / boss / lever / hole
   ========================================================= */
(function (root) {
  'use strict';

  var MAPS = root.MAP_DEFS = root.MAP_DEFS || {};
  function add(def) { MAPS[def.id] = def; return def; }

  /* ---------- 迷いの森（ダウの大森林の奥） ---------- */
  add({ id: 'lost_forest', name: '迷いの森', kind: 'dungeon', bgm: 'dungeon', fallback: 'grass', rows: [
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    'FFF....FFFFF.....FFFFF.....FFF',
    'FF..FF..FFF..FFF..FFF..FFF..FF',
    'FF.FFFF..F..FFFFF..F..FFFFF.FF',
    'FF.FFFFF...FFFFFFF...FFFFFF.FF',
    'FF..FFFFF.FFFFFFFFF.FFFFFFF.FF',
    'FFF..FFF..FFFFFFFF..FFFFF...FF',
    'FFFF..F..FFFF...FF..FFFF..FFFF',
    'FFFFF...FFFF..F..F..FFF..FFFFF',
    'FFFFFF.FFFF..FFF.....F..FFFFFF',
    'FFFFFF.FFF..FFFFF.F....FFFFFFF',
    'FFF....FF..FFFFFFF.FF..FFFFFFF',
    '....FF..FFF..FFFF..FFF..FFFFFF',
    'FF.FFFF..FF...F.FFFFFFF..FFFFF',
    'FF..FFFF..FFF..U..FFFFFF..FFFF',
    'FFF..FFFF..FF.....FFFFFFF..FFF',
    'FFFF..FFFF..F..F..FFFFFFFF.FFF',
    'FFFFF..FFFF....F..FFFFFF...FFF',
    'FFFFFF..FFFFFFFF..FFFF...FFFFF',
    'FFFFFFF..FFFFFFF..FFF..FFFFFFF',
    'FFFFFFFF.....FFF.....FFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
  ],
  warps: [{ x: 0, y: 12, to: 'world', tx: 59, ty: 57, name: '森の外へ' }, { x: 15, y: 13, to: 'lost_forest_shrine', tx: 7, ty: 12 }],
  chests: [{ id: 'lf1', x: 6, y: 1, item: 'potion', qty: 2 }, { id: 'lf2', x: 27, y: 1, item: 'hunter_bow', qty: 1 }, { id: 'lf3', x: 12, y: 20, gold: 180 }, { id: 'lf4', x: 26, y: 17, item: 'antidote_charm', qty: 1 }, { id: 'lf5', x: 20, y: 9, item: 'ether', qty: 2 }],
  npcs: [{ id: 'lf_lost', x: 6, y: 11, sprite: 'villager_m', dir: 'down', wander: 0, talk: async function (c) { await c.say('迷った旅人', ['た、助けてくれ……同じ場所をぐるぐる回っている気がする。', '森の中央の祠に魔物がいる。祠の扉は「相場の試練」を解かないと開かないらしい。']); } }],
  events: [
    { x: 15, y: 14, type: 'trial', solid: true, doneFlag: 'lf_gate', scenarios: ['clear_up', 'clear_down', 'range'], text: ['扉に古い文字が浮かび上がる。\n「高値と安値の向きを読み、正しき行いを示せ。無理に戦う者は通さぬ」'], minScore: 60 }
  ],
  encounters: { rate: 0.08, zones: [{ name: '迷いの森', test: function () { return true; }, groups: [['slime_red', 'slime_red', 'slime_red'], ['wolf', 'wolf'], ['mushroom', 'mushroom'], ['snake', 'bug_poison'], ['wolf', 'mushroom', 'slime_red']], level: 4 }] }
  });

  // 森の祠（ボス部屋）
  add({ id: 'lost_forest_shrine', name: '森の祠', kind: 'dungeon', bgm: 'boss_area', rows: [
    '###############',
    '#:::::::::::::#',
    '#:I:::::::::I:#',
    '#::::ppppp::::#',
    '#::::ppXpp::::#',
    '#::::ppppp::::#',
    '#:::::::::::::#',
    '#:I:::::::::I:#',
    '#:::::::::::::#',
    '#L::::::::::::#',
    '#:::::::::::::#',
    '#:::::::::::::#',
    '#######D#######'
  ],
  warps: [{ x: 7, y: 12, to: 'lost_forest', tx: 15, ty: 13 }, { x: 1, y: 9, to: 'lost_forest_treasure', tx: 4, ty: 7, needFlag: 'lf_lock' }],
  events: [
    { x: 7, y: 5, type: 'boss', solid: false, doneFlag: 'forest_boss', enemy: 'boss_lost_trend', intro: ['祠の中央、淡く光るクリスタルの前に、揺れる影が立っていた。', 'トレンド迷子「うろうろ……どっちへ行けばいいの……？ あなたも一緒に迷いましょう……」'], after: ['影は霧のように消えた。クリスタルの光が少しだけ強くなった気がする。', '祠の奥で、何かが「カチリ」と音を立てた。'], reward: { item: 'forest_key', qty: 1 }, questComplete: null },
    { x: 1, y: 9, type: 'locked', solid: true, doneFlag: 'lf_lock', key: 'forest_key', text: ['鍵のかかった扉だ。'] }
  ] });
  add({ id: 'lost_forest_treasure', name: '祠の宝物庫', kind: 'dungeon', bgm: 'boss_area', rows: [
    '#########',
    '#:::::::#',
    '#:I:::I:#',
    '#:::::::#',
    '#:::::::#',
    '#:I:::I:#',
    '#:::::::#',
    '####D####'
  ], warps: [{ x: 4, y: 7, to: 'lost_forest_shrine', tx: 2, ty: 9 }],
    chests: [{ id: 'lft1', x: 4, y: 1, item: 'wave_sword', qty: 1 }, { id: 'lft2', x: 1, y: 6, gold: 500 }, { id: 'lft3', x: 7, y: 6, item: 'phoenix_feather', qty: 1 }] });

  /* ---------- 忘却の洞窟（3フロア） ---------- */
  add({ id: 'oblivion_cave_1', name: '忘却の洞窟 1階', kind: 'dungeon', bgm: 'dungeon', fallback: 'cave_floor', rows: [
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    'GgggggGGGGGGGGGGGGGGggggggggGG',
    'GgGGggGGGGggggggGGGGgGGGGGggGG',
    'GgGGggggggggGGggGGGGgGGGGGggGG',
    'GgGGGGGGGGGgGGggggggggGGGGggGG',
    'GgggggGGGGGgGGGGGGGGGgGGGGggGG',
    'GGGGGgGGGGGgGGGggggGGgGGGGggGG',
    'GGGGGgggggggGGGgGGgGGggggGggGG',
    'GGGGGGGGGGGgGGGgGGgGGGGGgGggGG',
    'GGGGGGGGGGGgggggGGgggggggGggGG',
    'ggggggggGGGGGGGGGGGGGGGGGGggGG',
    'GGGGGGGgGGGGGGGGGGGGGGGGGGggGG',
    'GGGGGGGggggggggggggggggggLggGG',
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'
  ],
  warps: [{ x: 0, y: 10, to: 'world', tx: 42, ty: 79, name: '洞窟の外へ' }, { x: 27, y: 1, to: 'oblivion_cave_2', tx: 2, ty: 1 }],
  chests: [{ id: 'oc1_1', x: 1, y: 1, item: 'potion', qty: 2 }, { id: 'oc1_2', x: 16, y: 6, item: 'iron_shield', qty: 1 }, { id: 'oc1_3', x: 21, y: 7, gold: 150 }],
  events: [
    { x: 25, y: 12, type: 'locked', solid: true, doneFlag: 'oc_lock', key: 'cave_key', text: ['王家の封印が施された扉だ。「洞窟の鍵」が必要だ。'] },
    { x: 11, y: 7, type: 'inspect', text: ['壁に誰かが刻んだ文字がある。\n「損切りを置かずに潜った者は、ここで全てを失った。引き返すなら今だ」'] }
  ],
  encounters: { rate: 0.075, zones: [{ name: '忘却の洞窟', test: function () { return true; }, groups: [['bat', 'bat'], ['lizard'], ['mole', 'bat'], ['bat', 'bat', 'bat'], ['lizard', 'mole']], level: 5 }] }
  });
  add({ id: 'oblivion_cave_2', name: '忘却の洞窟 2階', kind: 'dungeon', bgm: 'dungeon', fallback: 'cave_floor', rows: [
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
    'GgggggggggGGGGGgggggggggggggGG',
    'GGGGGGGGGgGGGGGgGGGGGGGGGGGgGG',
    'GGgggggggggggggggggGGGggggGgGG',
    'GGgGGGGGGGGGGGGGGGgGGGgGGgGgGG',
    'GGgGGggggggggGGGGGgGGGgGGgggGG',
    'GGgGGgGGGGGGgGGGGGgGGGgGGGGGGG',
    'GGgGGgGGiGGGgGGGGGgggggGGGGGGG',
    'GGgGGggggggggggggggGGGGGGGGGGG',
    'GGgGGGGGGGGGGGGGGgGGGGGGGGGGGG',
    'GGgggggggggOGGGGGgGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGGGGgGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGGGGgggggggggggGG',
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'
  ],
  warps: [{ x: 1, y: 1, to: 'oblivion_cave_1', tx: 26, ty: 1 }, { x: 27, y: 12, to: 'oblivion_cave_3', tx: 1, ty: 1 }],
  chests: [{ id: 'oc2_1', x: 8, y: 6, item: 'ether', qty: 2 }, { id: 'oc2_2', x: 25, y: 3, item: 'iron_sword', qty: 1 }, { id: 'oc2_3', x: 3, y: 9, item: 'tent', qty: 1 }],
  events: [{ x: 11, y: 10, type: 'hole', to: 'oblivion_cave_3', tx: 12, ty: 5, text: ['足元が崩れた！'] }],
  encounters: { rate: 0.08, zones: [{ name: '忘却の洞窟', test: function () { return true; }, groups: [['ghost', 'bat'], ['lizard', 'lizard'], ['imp'], ['mole', 'mole', 'bat'], ['ghost', 'ghost']], level: 6 }] }
  });
  add({ id: 'oblivion_cave_3', name: '忘却の洞窟 最深部', kind: 'dungeon', bgm: 'boss_area', fallback: 'cave_floor', rows: [
    'GGGGGGGGGGGGGGGGGGGGGGGGGG',
    'GgggggGGGGGGGGGGGGGGGGGGGG',
    'GGGGGgGGGGGGGGGGGGGGGGGGGG',
    'GGGGGgGGGGGgggggGGGGGGGGGG',
    'GGGGGgggGGGgGGGgGGGGGGGGGG',
    'GGGGGGGgGGGgggggGGGGGGGGGG',
    'GGGGGGGgGGGGGgGGGGGGGGGGGG',
    'GGGGGGGgggggggGGGGGGGGGGGG',
    'GGGGGGGGGGGGGgGGGGGGGGGGGG',
    'GGGGGGGGiGGGGUGGGGiGGGGGGG',
    'GGGGGGGGGgggggggggGGGGGGGG',
    'GGGGGGGGGgggXgggggGGGGGGGG',
    'GGGGGGGGGgggggggggGGGGGGGG',
    'GGGGGGGGGGGGGGGGGGGGGGGGGG'
  ],
  warps: [{ x: 1, y: 1, to: 'oblivion_cave_2', tx: 26, ty: 12 }],
  chests: [{ id: 'oc3_1', x: 15, y: 3, item: 'hi_potion', qty: 2 }, { id: 'oc3_2', x: 17, y: 12, item: 'ring_power', qty: 1 }],
  events: [
    { x: 13, y: 9, type: 'trial', solid: true, doneFlag: 'oc_gate', scenarios: ['up_pullback', 'mtf_conflict', 'jump_in'], text: ['扉から低い声が響く。\n「上位足を見ぬ者、飛び乗る者は通さぬ。真に優位な場面を示せ」'], minScore: 60 },
    { x: 12, y: 11, type: 'boss', solid: false, doneFlag: 'cave_boss', enemy: 'boss_greed_golem', intro: ['砕けたクリスタルの欠片を抱え、巨大な黄金のゴーレムが立ち上がった。', '欲望のゴーレム「ゴゴゴ……もっと……もっと欲しい……全部つぎ込めば、取り返せる……！」'], after: ['ゴーレムは崩れ落ち、抱えていた欠片だけが静かに光っている。', '均衡のクリスタルの欠片を手に入れた！ リヴェル王に報告しよう。'], reward: { item: 'crystal_shard', qty: 1 } }
  ],
  encounters: { rate: 0.07, zones: [{ name: '忘却の洞窟', test: function () { return true; }, groups: [['fear_shadow'], ['imp', 'ghost'], ['lizard', 'lizard', 'bat'], ['fear_shadow', 'bat']], level: 7 }] }
  });

  /* ---------- エマール山道（山賊のアジト・サブクエスト） ---------- */
  add({ id: 'emal_pass', name: 'エマール山道', kind: 'dungeon', bgm: 'dungeon', fallback: 'grass', rows: [
    'mmmmmmmmmmmmmmmmmmmmmmmmmmmmmm',
    'mm...mmmmmmmmmmmmmmmmmmmmmm.mm',
    'mm..mmmmmmmmmmmmmmmmmmmmmmm.mm',
    'mm.hmmmmmmmmmmmmmmmmmmmmmmm.mm',
    'mm.hmmmmmmmmmmmmhhmmmmmmmmm.mm',
    'mm.hmmmmmmmmmm.........mmmm.mm',
    'mm.mmmmmmmmmmm.mmmmmmm.mmmm.mm',
    'mm.mmmmmmmmmmm.mmmmmmh.mmmm.mm',
    'mm.mmmmmmmmmmm.mmmmmmm.mmmh.mm',
    'mm.............mmmmmmh.mmmm.mm',
    'mmmmmm.mmm.mmm.mmmmmmm.mmmm.mm',
    'mmmmmm.hmm.mmm.mmmmmmm.mmmm.mm',
    'mmmmmm.mmm...h.mmmmmmm......mm',
    'mmmmmm.hmmmmmm.mmmmmmmmmm.mmmm',
    '.......mmmmmmmDmmmmmmmmmmmmmmm',
    'mmmmmmhmmmmmmmmmmmmmmmmmmmmmmm'
  ],
  warps: [{ x: 0, y: 14, to: 'world', tx: 36, ty: 41, name: '山道の外へ' }, { x: 14, y: 14, to: 'bandit_hideout', tx: 5, ty: 8 }],
  chests: [{ id: 'ep1', x: 4, y: 1, item: 'hi_potion', qty: 1 }, { id: 'ep2', x: 27, y: 1, item: 'iron_helm', qty: 1 }, { id: 'ep3', x: 25, y: 13, gold: 300 }],
  npcs: [{ id: 'ep_merchant', x: 3, y: 2, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { await c.say('行商人', ['山賊に荷物を奪われた……頭目のガロンはこの先のアジトにいる。倒してくれたら礼をする。']); if (!c.flag('q_bandit_started')) { c.setFlag('q_bandit_started', true); c.questStart('sub_bandit'); } } }],
  encounters: { rate: 0.08, zones: [{ name: 'エマール山道', test: function () { return true; }, groups: [['bandit'], ['bandit', 'bandit'], ['golem'], ['bug_armor', 'bandit'], ['wolf', 'wolf', 'bandit']], level: 8 }] }
  });
  add({ id: 'bandit_hideout', name: '山賊のアジト', kind: 'dungeon', bgm: 'boss_area', rows: [
    '############',
    '#_t______t_#',
    '#__________#',
    '#__________#',
    '#__________#',
    '#_t______t_#',
    '#__________#',
    '#__________#',
    '#####D######'
  ], warps: [{ x: 5, y: 8, to: 'emal_pass', tx: 14, ty: 14 }],
    chests: [{ id: 'bh1', x: 1, y: 7, gold: 400 }, { id: 'bh2', x: 10, y: 7, item: 'steel_sword', qty: 1 }],
    events: [{ x: 5, y: 2, type: 'boss', solid: false, doneFlag: 'bandit_boss', enemy: 'boss_bandit_chief', intro: ['山賊の頭目ガロン「おいおい、冒険者がのこのこ来やがった。有り金ぜんぶ置いていけ！」'], after: ['ガロン「く、強え……わかった、荷物は返す。もう街道は荒らさねえ……」', '山賊たちは散り散りに逃げていった。'], questComplete: 'sub_bandit' }] });

})(typeof window !== 'undefined' ? window : globalThis);
