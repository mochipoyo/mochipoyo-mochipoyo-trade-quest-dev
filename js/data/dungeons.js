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
    'FFFFFFFFFFFFFFFFFFFFFFFJFFFFFF',
    'FFF....FFFFF.M..MFFFFF...M.FFF',
    'FF..FF..ZFF..FFZ.MFFF..FFJM.ZF',
    'FFMFFFF..F..FFFFJ.MFM.FFFFF.FF',
    'FF.FFFFF...FFFFFFF...FFFFFF.FF',
    'FF..FFFFF.FFFFFFFFF.FFFFFFF.ZF',
    'FFF..FFF..FFFFFFFF..ZFFFF.M.FF',
    'FFFJ..F..FFFF...ZF..NFFF..FFFF',
    'FFFFN.M.FFFF..F..F..FFF..FFFFF',
    'FFFFFF.FFFF..FFF..M..F..FFFFFF',
    'FFFFJF.FFF..FFFFF.F....FFFFFFF',
    'FFF...MFF..FFFFFFF.FF..FFFFFFF',
    '.M..FF..FFF..FFFZ..FFF..FFFFFF',
    'FJ.ZFFF..FF...F.FFFFFFF..FFFFF',
    'FF..FFFF..FFF..U..FFFFFF..FFFF',
    'FFF..FFFF..ZFM....FFFFFFF..FFF',
    'FFFF..FFFF..F..F..FFFFFFFF.FFF',
    'FFFFF..ZFFFM...F..NFFFFF...FFF',
    'FFFFFF..FFFFFJFF..ZFFFM..FNFFF',
    'FFFFFFF..FFFNFFF..FFF..FFFFFFF',
    'FFFFFFFF.....FFF.....FJFFFFFFF',
    'FFFFFFFFFFFFFFFFNFFFNFFFFFFFFF'
  ],
  warps: [{ x: 0, y: 12, to: 'world', tx: 59, ty: 57, name: '森の外へ' }, { x: 15, y: 13, to: 'lost_forest_shrine', tx: 7, ty: 12 }],
  chests: [{ id: 'lf1', x: 6, y: 1, item: 'potion', qty: 2 }, { id: 'lf2', x: 27, y: 1, item: 'hunter_bow', qty: 1 }, { id: 'lf3', x: 12, y: 20, gold: 180 }, { id: 'lf4', x: 26, y: 17, item: 'antidote_charm', qty: 1 }, { id: 'lf5', x: 20, y: 9, item: 'ether', qty: 2 }],
  npcs: [{ id: 'lf_lost', x: 6, y: 11, sprite: 'villager_m', dir: 'down', wander: 0, talk: async function (c) { await c.say('迷った旅人', ['た、助けてくれ……同じ場所をぐるぐる回っている気がする。', '森の中央の祠に魔物がいる。祠の扉は「相場の試練」を解かないと開かないらしい。']); } }],
  events: [
    { x: 19, y: 6, type: 'learn', solid: false, learnId: 'practice_forest' },
    { x: 15, y: 14, type: 'trial', solid: true, doneFlag: 'lf_gate', learnId: 'learn_dow', scenarios: ['clear_up', 'clear_down', 'range'], text: ['扉に古い文字が浮かび上がる。\n「高値と安値の向きを読み、正しき行いを示せ。無理に戦う者は通さぬ」'], minScore: 60 }
  ],
  encounters: { rate: 0.045, zones: [{ name: '迷いの森', test: function () { return true; }, groups: [['slime_red', 'slime_red', 'slime_red'], ['wolf', 'wolf'], ['mushroom', 'mushroom'], ['snake', 'bug_poison'], ['wolf', 'mushroom', 'slime_red'], ['treant'], ['maneater', 'maneater'], ['forest_fairy', 'crow', 'crow'], ['mushroom_king', 'mushroom'], ['boar', 'wolf'], ['treant', 'forest_fairy']], rare: [['slime_rainbow']], rareRate: 0.02, level: 4 }] }
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
  warps: [{ x: 7, y: 12, to: 'lost_forest', tx: 15, ty: 13 }, { x: 1, y: 9, to: 'lost_forest_treasure', tx: 4, ty: 7, needFlag: 'lf_lock' }, { x: 14, y: 9, to: 'forest_hidden_room', tx: 1, ty: 4, needFlag: 'hidden_forest_open' }],
  events: [
    { x: 14, y: 9, type: 'rank_door', solid: true, doneFlag: 'hidden_forest_open', rank: 2, text: ['東の壁に、波形の紋章が刻まれた小さな扉がある。'] },
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
    chests: [{ id: 'lft1', x: 4, y: 1, item: 'wave_sword', qty: 1 }, { id: 'lft2', x: 1, y: 6, gold: 500 }, { id: 'lft3', x: 7, y: 6, item: 'phoenix_feather', qty: 1 }],
    events: [{ x: 4, y: 4, type: 'boss', optional: true, solid: false, doneFlag: 'forest_hidden_boss', requireFlag: 'forest_boss', enemies: ['wolf_king', 'wolf'], intro: ['宝物庫の奥から、白銀の毛並みの巨大な狼が現れた。', '森の狼王は低く唸り、群れを呼ぶように遠吠えした。'], after: ['狼王は深く一礼するように頭を下げ、森の奥へと去っていった。'], lockedText: ['宝物庫の奥で何かが眠っている気配がする。祠の魔物を倒してから来るべきだ。'] }] });

  // v4.2: 祠の隠し書庫（トレーダーランクDで開く扉の先。寄り道。メインストーリーには不要）
  add({ id: 'forest_hidden_room', name: '祠の隠し書庫', kind: 'dungeon', bgm: 'boss_area', rows: [
    '###########',
    '#KKK:::KKK#',
    '#:::::::::#',
    '#:I:::::I:#',
    'D:::::::::#',
    '#:I:::::I:#',
    '#:::::::::#',
    '#KKK:::KKK#',
    '###########'
  ],
    warps: [{ x: 0, y: 4, to: 'lost_forest_shrine', tx: 13, ty: 9 }],
    chests: [{ id: 'fh1', x: 9, y: 2, item: 'amulet_life', qty: 1 }, { id: 'fh2', x: 9, y: 6, gold: 600 }, { id: 'fh3', x: 5, y: 1, item: 'hi_ether', qty: 2 }],
    events: [
      { x: 5, y: 4, type: 'inspect', solid: false, text: ['師匠ハケイの古い手記が置かれている。', '「押し目とは、上位足の流れに対する一時的な逆行だ。逆行の『終わり』を、高値・安値の切り上げとEMAへの反発で確かめてから入る。終わりを待てぬ者は、押し目ではなく転換を買ってしまう」', '「見送った場面を悔やむな。入らなかった損は、ゼロだ」'] },
      { x: 5, y: 7, type: 'inspect', solid: false, text: ['棚の本：『波形研究者の心得』', '「同じ場面を百回解いても、眼は育たない。異なる場面を、ヒントなしで、自分の言葉で説明できるか——それが研究者の証だ」'] }
    ] });

  /* ---------- 忘却の洞窟（3フロア） ---------- */
  add({ id: 'oblivion_cave_1', name: '忘却の洞窟 1階', kind: 'dungeon', bgm: 'dungeon', fallback: 'cave_floor', rows: [
    'GGGGGkGGGGGGGGGGGGGGGGGGGiGGGG',
    'GgugggGGGGGYGGGGGGGGggggggggGG',
    'GgGGggGGYGggggggGGGGgGGkYGggGG',
    'igkkggggggggGGggGGGGgGGGGGggGG',
    'GgkGGkGGGiGgGGggggugggGGGGggGG',
    'GgggggGGGGGgGGGGGGGGGgGGGGguGG',
    'GGGGGgGGkGGgGGGggggGkgGGkGggGG',
    'GGGGGgggguggYGkgGGgGGggggGggGG',
    'GGGGGYGGGGGgYGGgGGgGGGGGgkggGG',
    'GGGGGGGGGGGgggggGGgggggguGggGG',
    'ggggguggGGGGGGGYGGGGGYGGGGggGG',
    'GGGGGGGgGGGGGGGGGGYGGGGiGGggGG',
    'GGGGGGGugggggggggggugggggLggGG',
    'GGGGGGGGGGGGGGGGGGGGkGGGGGGGGG'
  ],
  warps: [{ x: 0, y: 10, to: 'world', tx: 42, ty: 79, name: '洞窟の外へ' }, { x: 27, y: 1, to: 'oblivion_cave_2', tx: 2, ty: 1 }],
  chests: [{ id: 'oc1_1', x: 1, y: 1, item: 'potion', qty: 2 }, { id: 'oc1_2', x: 16, y: 6, item: 'iron_shield', qty: 1 }, { id: 'oc1_3', x: 21, y: 7, gold: 150 }],
  events: [
    { x: 11, y: 2, type: 'learn', solid: false, learnId: 'practice_cave' },
    { x: 25, y: 12, type: 'locked', solid: true, doneFlag: 'oc_lock', key: 'cave_key', text: ['王家の封印が施された扉だ。「洞窟の鍵」が必要だ。'] },
    { x: 11, y: 7, type: 'inspect', text: ['壁に誰かが刻んだ文字がある。\n「損切りを置かずに潜った者は、ここで全てを失った。引き返すなら今だ」'] }
  ],
  encounters: { rate: 0.045, zones: [{ name: '忘却の洞窟', test: function () { return true; }, groups: [['bat', 'bat'], ['lizard'], ['mole', 'bat'], ['bat', 'bat', 'bat'], ['lizard', 'mole'], ['cave_crab'], ['ore_slime', 'ore_slime'], ['zombie'], ['cave_crab', 'bat', 'bat'], ['zombie', 'mole']], level: 5 }] }
  });
  add({ id: 'oblivion_cave_2', name: '忘却の洞窟 2階', kind: 'dungeon', bgm: 'dungeon', fallback: 'cave_floor', rows: [
    'GGGGGGGGGGGGGGGGGGGGGGkGkGGGGG',
    'GgggggggggiGGGGgggggggggggggGG',
    'GGGGGGGiGgkGYGGgGGGGGGGGGGGgGG',
    'GGgugggggggguggggggGGGggggGuGG',
    'GGgGGGGGiGGGGGGGGGgGGGgGGuGuGG',
    'GGgGGggggggggGGGGYgGGGgGGgguGG',
    'GGgGYgGkkGGGgGGGGGgGGGgGGYGGGG',
    'GGgGGgGGiGGigGGGGGgggggGGGGGGG',
    'GGgGGguggggggggggggGGGGGGGGGGG',
    'GGgYGGGYGGGGGGGGGgiGGGGGGGGGGG',
    'GGgguggggggOGGGGkgGGGGGGGGGGGG',
    'GGGGGGGGGkGGGGGGGgGGGGGGGGGiGG',
    'GGGGGGGGGGGGGGGGGgugggggggggGG',
    'GGGGGGGGGGGGGGGGGGGGGGkGGGiGGG'
  ],
  warps: [{ x: 1, y: 1, to: 'oblivion_cave_1', tx: 26, ty: 1 }, { x: 27, y: 12, to: 'oblivion_cave_3', tx: 1, ty: 1 }, { x: 13, y: 5, to: 'cave_hidden_room', tx: 1, ty: 3, needFlag: 'hidden_cave_open' }],
  chests: [{ id: 'oc2_1', x: 8, y: 6, item: 'ether', qty: 2 }, { id: 'oc2_2', x: 25, y: 3, item: 'iron_sword', qty: 1 }, { id: 'oc2_3', x: 3, y: 9, item: 'tent', qty: 1 }],
  events: [
    { x: 13, y: 5, type: 'rank_door', solid: true, doneFlag: 'hidden_cave_open', rank: 3, text: ['岩壁に、波形の紋章が刻まれた扉が埋まっている。'] },
    { x: 15, y: 3, type: 'learn', solid: false, learnId: 'practice_cave2' },{ x: 11, y: 10, type: 'hole', to: 'oblivion_cave_3', tx: 12, ty: 5, text: ['足元が崩れた！'] }],
  encounters: { rate: 0.045, zones: [{ name: '忘却の洞窟', test: function () { return true; }, groups: [['ghost', 'bat'], ['lizard', 'lizard'], ['imp'], ['mole', 'mole', 'bat'], ['ghost', 'ghost'], ['floating_eye'], ['stalactite_golem'], ['zombie', 'zombie', 'ghost'], ['skeleton'], ['skeleton', 'zombie'], ['floating_eye', 'imp'], ['ore_slime', 'cave_crab'], ['mimic']], level: 6 }] }
  });
  // v4.2: 洞窟の隠し工房（トレーダーランクCで開く扉の先。寄り道）
  add({ id: 'cave_hidden_room', name: '洞窟の隠し工房', kind: 'dungeon', bgm: 'boss_area', fallback: 'cave_floor', rows: [
    'GGGGGGGGGGGG',
    'GkggggggggkG',
    'GggggYggggGG',
    'DggggggggggG',
    'GggggYggggGG',
    'GkggggggggkG',
    'GGGGGGGGGGGG'
  ],
    warps: [{ x: 0, y: 3, to: 'oblivion_cave_2', tx: 12, ty: 5 }],
    chests: [{ id: 'ch1', x: 10, y: 3, item: 'knight_helm', qty: 1 }, { id: 'ch2', x: 2, y: 2, gold: 900 }, { id: 'ch3', x: 2, y: 4, item: 'elixir', qty: 1 }],
    events: [
      { x: 6, y: 3, type: 'inspect', solid: false, text: ['作業台に、師匠ハケイの手記が広げられている。', '「RCIが+70に届いた。それだけで売る者は、強い上昇トレンドの中で何度も刈られる。+70は『買われすぎ』ではなく『勢いが強い』の印でもある」', '「使うなら、上位足の方向と同じ向きに、±70圏から反転し始めたことを確かめてからだ。逆張りは、根拠が重なったときだけ」'] },
      { x: 6, y: 1, type: 'inspect', solid: false, text: ['壁の刻印：『環境認識の修行者へ』', '「日足と4時間足で流れを知り、15分足と5分足で入口を探す。入口だけを見て流れを忘れる者は、川に逆らって泳ぐ」'] }
    ] });

  add({ id: 'oblivion_cave_3', name: '忘却の洞窟 最深部', kind: 'dungeon', bgm: 'boss_area', fallback: 'cave_floor', rows: [
    'GkGGGGGGGGGGGGGGGGGGGGGGGG',
    'GgggggGGGGGGGGGGGGGGGGGGGG',
    'GGGGGgGGGGGGGGGGGGGGGGGGGG',
    'GGGGkgGGGGGgggggGGGGGGGGGG',
    'GGGGGgggGGGgGGGgGGGGGGGGGG',
    'GGGGGGkgYGGgggggGGGGGGGGGG',
    'GGGGGGGgGGGGGgGGGGGGGGGGGG',
    'GGGGGGGgguggggGGGGGGGGGGGG',
    'GGGGGGGGGGGiYgGGGGGGGGGGGG',
    'GGGGGGGGiGGGkUGiGGiGGGGGGG',
    'GGGGGGGGGgggggggggGGGGGGGG',
    'GGGGGGGGGgggXgggggGGGGGGGG',
    'GGGGGGGGGgggggggggGGGGGGGG',
    'GGGGGGGGGGGGGGGGGGGGGGGGGG'
  ],
  warps: [{ x: 1, y: 1, to: 'oblivion_cave_2', tx: 26, ty: 12 }],
  chests: [{ id: 'oc3_1', x: 15, y: 3, item: 'hi_potion', qty: 2 }, { id: 'oc3_2', x: 17, y: 12, item: 'ring_power', qty: 1 }],
  events: [
    { x: 13, y: 9, type: 'trial', solid: true, doneFlag: 'oc_gate', learnId: 'learn_rci', scenarios: ['up_pullback', 'mtf_conflict', 'jump_in'], text: ['扉から低い声が響く。\n「上位足を見ぬ者、飛び乗る者は通さぬ。真に優位な場面を示せ」'], minScore: 60 },
    { x: 16, y: 10, type: 'boss', optional: true, solid: false, doneFlag: 'cave_hidden_boss', requireFlag: 'cave_boss', enemy: 'crystal_golem', intro: ['壁の中のクリスタルが輝き、透き通った巨人が姿を現した。', 'クリスタルゴーレム「……欲望ノ主ヲ倒シタ者ヨ。我ノ力ヲ試セ」'], after: ['ゴーレムは静かに砕け、光る杖だけが残った。'], lockedText: ['クリスタルの壁が淡く光っている。今はまだ何も起こらない。'] },
    { x: 12, y: 11, type: 'boss', solid: false, doneFlag: 'cave_boss', enemy: 'boss_greed_golem', intro: ['砕けたクリスタルの欠片を抱え、巨大な黄金のゴーレムが立ち上がった。', '欲望のゴーレム「ゴゴゴ……もっと……もっと欲しい……全部つぎ込めば、取り返せる……！」'], after: ['ゴーレムは崩れ落ち、抱えていた欠片だけが静かに光っている。', '均衡のクリスタルの欠片を手に入れた！ リヴェル王に報告しよう。'], reward: { item: 'crystal_shard', qty: 1 } }
  ],
  encounters: { rate: 0.04, zones: [{ name: '忘却の洞窟', test: function () { return true; }, groups: [['fear_shadow'], ['imp', 'ghost'], ['lizard', 'lizard', 'bat'], ['fear_shadow', 'bat'], ['candle_golem'], ['bear_shadow'], ['candle_golem', 'floating_eye'], ['stalactite_golem', 'ore_slime'], ['bear_shadow', 'ghost', 'ghost']], level: 7 }] }
  });

  /* ---------- エマール山道（山賊のアジト・サブクエスト） ---------- */
  add({ id: 'emal_pass', name: 'エマール山道', kind: 'dungeon', bgm: 'dungeon', fallback: 'grass', rows: [
    'mmm6cmmmmmmmmmmmmmmmmmmmmmm6mm',
    'mm...mmmmmmmmmmmmmmmmmmmmmm.mm',
    'mm..mmmmmmmmmmmmmmmmmmmmmmm.mm',
    'mm.hmmmmmmmmmmmmmmmmmmmmmmm.mm',
    'mm.hmmmmmmmmmmmmhhmmcmmmmmm.mm',
    'm6.hmmmmmmmmmm..P......mmmc.mm',
    'mm.mmmmmmmmmmm.mmmmcmc.mmmmPmm',
    'mm.mmmmmmmmmmm.cmmmmmh.cmmm.mm',
    'mm.m6mm6mmmcmmPmmmmmmm.cmmh.mm',
    'mm.......P.....mmmmmmh.mmmm.mm',
    'mmmmmm.mcm.mmm.mmmmmmm.mmmm.mm',
    'mmmmmm.hmm.mmm.cmmmmmm.m6mmPmm',
    'mmmmmm.mmm...h.mmmmmmc......mm',
    'mmmcmm.hmmmcmmPmmmmmmmmmc.mmmm',
    '.......mmmmmmmDmmmmmmmmmmmmmmm',
    'mmcmmmhmmmmmmmmmmmmmmmmmmmmmmm'
  ],
  warps: [{ x: 0, y: 14, to: 'world', tx: 36, ty: 41, name: '山道の外へ' }, { x: 14, y: 14, to: 'bandit_hideout', tx: 5, ty: 8 }],
  events: [{ x: 6, y: 9, type: 'learn', solid: false, learnId: 'learn_ema' }, { x: 14, y: 9, type: 'learn', solid: false, learnId: 'practice_mountain' }],
  chests: [{ id: 'ep1', x: 4, y: 1, item: 'hi_potion', qty: 1 }, { id: 'ep2', x: 27, y: 1, item: 'iron_helm', qty: 1 }, { id: 'ep3', x: 25, y: 13, gold: 300 }],
  npcs: [{ id: 'ep_merchant', x: 3, y: 2, sprite: 'merchant', dir: 'down', wander: 0, talk: async function (c) { await c.say('行商人', ['山賊に荷物を奪われた……頭目のガロンはこの先のアジトにいる。倒してくれたら礼をする。']); if (!c.flag('q_bandit_started')) { c.setFlag('q_bandit_started', true); c.questStart('sub_bandit'); } } }],
  encounters: { rate: 0.045, zones: [{ name: 'エマール山道', test: function () { return true; }, groups: [['bandit'], ['bandit', 'bandit'], ['golem'], ['bug_armor', 'bandit'], ['wolf', 'wolf', 'bandit'], ['bandit_archer', 'bandit_archer'], ['rock_lizard', 'rock_lizard'], ['mountain_hawk', 'mountain_hawk', 'mountain_hawk'], ['harpy', 'bandit_archer'], ['rock_golem'], ['mountain_cat', 'mountain_cat'], ['rock_golem', 'bug_armor']], level: 8 }] }
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
