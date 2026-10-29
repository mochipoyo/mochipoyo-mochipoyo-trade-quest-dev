/* =========================================================
   Data / Enemies : モンスター
   actions: 行動パターン（重み付き）。type: attack / skill / special
   resist: 属性倍率（1=通常、0.5=半減、2=弱点、0=無効）
   drops: [{ item, rate }]
   area: 出現地域の目安（図鑑表示用）
   ========================================================= */
(function (root) {
  'use strict';

  var Sprites = root.Sprites;
  // 亜種グラフィック（既存の形状＋パレット）
  if (Sprites && Sprites.addVariant) {
    Sprites.addVariant('slime_red', 'slime', { B: '#e05a5a', E: '#1b1b2a', M: '#6a1a1a' });
    Sprites.addVariant('slime_metal', 'slime', { B: '#a0a0b8', E: '#1b1b2a', M: '#4a4a5a' });
    Sprites.addVariant('slime_gold', 'slime', { B: '#e8c15a', E: '#1b1b2a', M: '#8a6a1a' });
    Sprites.addVariant('bat_fire', 'bat', { B: '#c94a2a', E: '#ffd24a', M: '#3a1a0a' });
    Sprites.addVariant('bat_ice', 'bat', { B: '#9ab0e0', E: '#ffffff', M: '#2a3a6a' });
    Sprites.addVariant('bug_poison', 'bug', { B: '#8a5ad0', A: '#c9e84a', E: '#ff3a3a' });
    Sprites.addVariant('bug_armor', 'bug', { B: '#5a5a6a', A: '#9a9aaa', E: '#ffd24a' });
    Sprites.addVariant('mushroom_dark', 'mushroom', { C: '#5a2a8a', A: '#c9a0ff', B: '#d0c0e0', E: '#ff3a3a', M: '#3a1a5a' });
    Sprites.addVariant('snake_ice', 'beast', { B: '#9ab0e0', E: '#ffffff', M: '#c94a4a' });
    Sprites.addVariant('wolf', 'beast', { B: '#7a7a8a', E: '#ffd24a', M: '#c94a4a' });
    Sprites.addVariant('wolf_dark', 'beast', { B: '#2a2a3a', E: '#ff3a3a', M: '#8a1a1a' });
    Sprites.addVariant('lizard_fire', 'beast', { B: '#e05a2a', E: '#ffd24a', M: '#3a0a0a' });
    Sprites.addVariant('golem_iron', 'golem', { B: '#5a5a6a', A: '#9a9aaa', E: '#5ab0ff', M: '#2a2a3a' });
    Sprites.addVariant('golem_greed', 'golem', { B: '#c9a24a', A: '#8a1a1a', E: '#ff3a3a', M: '#3a2a0a' });
    Sprites.addVariant('ghost_dark', 'ghost', { G: '#3a2a5a', E: '#ff6a3a', M: '#1a0a2a' });
    Sprites.addVariant('skeleton', 'knight', { H: '#e8e8e8', E: '#ff3a3a', B: '#d0d0d0', A: '#8a8a8a', S: '#e8e8e8' });
    Sprites.addVariant('bandit', 'sword', { H: '#2a1a0a', F: '#e0b080', E: '#1b1b2a', B: '#5a3a1a', A: '#8a1a1a', S: '#e0b080', L: '#2a2a2a', T: '#1a1a1a', W: '#9a9aaa', G: '#5a3a1a' });
    Sprites.addVariant('dark_mage', 'mage', { H: '#1a0a2a', F: '#c0a0c0', E: '#ff3a6a', B: '#2a0a3a', A: '#8a5ad0', S: '#c0a0c0', L: '#1a0a2a', T: '#1a0a2a', W: '#5a2a8a', G: '#ff3a6a' });
    Sprites.addVariant('sand_mole', 'beast', { B: '#c9a870', E: '#1b1b2a', M: '#8a5a2a' });
    Sprites.addVariant('bee', 'bat', { B: '#e8c15a', E: '#1b1b2a', M: '#3a2a0a' });
    Sprites.addVariant('crab', 'bug', { B: '#e05a3a', A: '#ffa07a', E: '#1b1b2a' });
    Sprites.addVariant('imp', 'demon', { H: '#c94a4a', E: '#ffd24a', M: '#1a0010', B: '#8a2a2a', A: '#ffd24a' });
    Sprites.addVariant('greed_demon', 'demon', { H: '#c9a24a', E: '#ff3a3a', M: '#1a0010', B: '#5a3a0a', A: '#ff3a3a' });
    Sprites.addVariant('fear_shadow', 'ghost', { G: '#1a1a2a', E: '#8fb8ff', M: '#0a0a1a' });
  }

  var ENEMIES = {};
  function E(id, o) { o.id = id; o.mp = o.mp || 0; o.mag = o.mag || 0; o.resist = o.resist || {}; o.drops = o.drops || []; o.actions = o.actions || [{ type: 'attack', w: 1 }]; o.family = o.family || 'other'; ENEMIES[id] = o; }

  // ---- 始まりの王国周辺（Lv1〜5） ----
  E('slime', { name: 'スライム', sprite: 'slime', family: 'スライム系', hp: 26, atk: 7, def: 3, agi: 3, exp: 3, gold: 4, area: '始まりの草原', drops: [{ item: 'herb', rate: 0.2 }] });
  E('slime_red', { name: 'レッドスライム', sprite: 'slime_red', family: 'スライム系', hp: 40, atk: 9, def: 4, agi: 4, exp: 5, gold: 6, area: 'ダウの大森林', resist: { fire: 0.5, ice: 1.5 }, drops: [{ item: 'herb', rate: 0.2 }] });
  E('bee', { name: 'キラービー', sprite: 'bee', family: '昆虫系', hp: 22, atk: 9, def: 1, agi: 9, exp: 4, gold: 3, area: '始まりの草原', actions: [{ type: 'attack', w: 3 }, { type: 'skill', id: 'poison_edge', w: 1 }], drops: [{ item: 'antidote', rate: 0.25 }] });
  E('mushroom', { name: 'まよいキノコ', sprite: 'mushroom', family: '植物系', hp: 35, atk: 8, def: 5, agi: 2, exp: 5, gold: 5, area: 'ダウの大森林', resist: { fire: 2 }, actions: [{ type: 'attack', w: 2 }, { type: 'special', id: 'spore', w: 1 }], drops: [{ item: 'wake_bell', rate: 0.2 }] });
  E('bug', { name: 'レンジバッタ', sprite: 'bug', family: '昆虫系', hp: 31, atk: 8, def: 4, agi: 8, exp: 4, gold: 4, area: '始まりの草原', drops: [{ item: 'herb', rate: 0.15 }] });
  E('bat', { name: '乖離コウモリ', sprite: 'bat', family: '獣系', hp: 29, atk: 8, def: 3, agi: 10, exp: 4, gold: 4, area: '忘却の洞窟', resist: { light: 1.5 }, actions: [{ type: 'attack', w: 3 }, { type: 'special', id: 'drain', w: 1 }] });
  E('wolf', { name: 'グレイウルフ', sprite: 'wolf', family: '獣系', hp: 57, atk: 15, def: 5, agi: 9, exp: 9, gold: 8, area: 'ダウの大森林', actions: [{ type: 'attack', w: 3 }, { type: 'special', id: 'howl', w: 1 }], drops: [{ item: 'leather_cap', rate: 0.08 }] });
  E('snake', { name: 'ならびヘビ', sprite: 'snake', family: '獣系', hp: 44, atk: 11, def: 4, agi: 7, exp: 6, gold: 6, area: 'ダウの大森林', actions: [{ type: 'attack', w: 2 }, { type: 'skill', id: 'poison_edge', w: 1 }], drops: [{ item: 'antidote', rate: 0.2 }] });
  E('bandit', { name: '山賊', sprite: 'bandit', family: '人間系', hp: 66, atk: 14, def: 6, agi: 6, exp: 10, gold: 18, area: 'エマール山脈', actions: [{ type: 'attack', w: 3 }, { type: 'skill', id: 'steal_strike', w: 1 }], drops: [{ item: 'dagger', rate: 0.1 }, { item: 'potion', rate: 0.15 }] });
  E('ghost', { name: '5分足ゴースト', sprite: 'ghost', family: 'アンデッド系', hp: 48, atk: 11, def: 8, agi: 6, mag: 6, exp: 8, gold: 7, area: '忘却の洞窟', resist: { light: 2, dark: 0, none: 0.7 }, actions: [{ type: 'attack', w: 2 }, { type: 'special', id: 'scare', w: 1 }] });
  E('skeleton', { name: 'スケルトン', sprite: 'skeleton', family: 'アンデッド系', hp: 75, atk: 16, def: 10, agi: 5, exp: 12, gold: 10, area: '地下墓地', resist: { light: 2, fire: 1.5, dark: 0 }, drops: [{ item: 'copper_sword', rate: 0.05 }] });
  E('lizard', { name: 'ダマシトカゲ', sprite: 'lizard', family: '獣系', hp: 62, atk: 14, def: 8, agi: 6, exp: 9, gold: 9, area: '忘却の洞窟', actions: [{ type: 'attack', w: 3 }, { type: 'special', id: 'feint', w: 1 }], drops: [{ item: 'scale_armor', rate: 0.04 }] });
  E('mole', { name: '反転モグラ', sprite: 'mole', family: '獣系', hp: 53, atk: 12, def: 9, agi: 4, exp: 8, gold: 8, area: '忘却の洞窟', actions: [{ type: 'attack', w: 2 }, { type: 'special', id: 'dig', w: 1 }] });
  E('golem', { name: 'ストーンゴーレム', sprite: 'golem', family: 'ゴーレム系', hp: 132, atk: 19, def: 18, agi: 2, exp: 22, gold: 20, area: 'エマール山脈', resist: { thunder: 1.5, fire: 0.5, wind: 0.5 }, actions: [{ type: 'attack', w: 2 }, { type: 'special', id: 'crush', w: 1 }] });
  E('imp', { name: 'インプ', sprite: 'imp', family: '悪魔系', hp: 55, atk: 12, def: 6, agi: 9, mag: 8, exp: 11, gold: 12, area: '忘却の洞窟', resist: { fire: 0.5, light: 1.5 }, actions: [{ type: 'attack', w: 2 }, { type: 'skill', id: 'fireball', w: 2 }] });
  E('dark_mage', { name: '闇の魔道士', sprite: 'dark_mage', family: '人間系', hp: 70, atk: 9, def: 6, agi: 7, mag: 12, mp: 30, exp: 16, gold: 20, area: 'マクディア魔導王国', actions: [{ type: 'skill', id: 'fireball', w: 2 }, { type: 'skill', id: 'sleep', w: 1 }, { type: 'attack', w: 1 }], drops: [{ item: 'ether', rate: 0.2 }] });
  E('slime_metal', { name: 'メタルスライム', sprite: 'slime_metal', family: 'スライム系', hp: 18, atk: 8, def: 52, agi: 20, exp: 60, gold: 10, area: 'どこかの草原（レア）', resist: { fire: 0.3, ice: 0.3, thunder: 0.3, wind: 0.3, light: 0.3, dark: 0.3 }, actions: [{ type: 'attack', w: 2 }, { type: 'special', id: 'flee', w: 2 }], rare: true });
  E('bug_poison', { name: 'ポイズンビートル', sprite: 'bug_poison', family: '昆虫系', hp: 66, atk: 15, def: 12, agi: 6, exp: 12, gold: 9, area: 'ダウの大森林（奥）', resist: { fire: 1.5 }, actions: [{ type: 'attack', w: 2 }, { type: 'skill', id: 'poison_mist', w: 1 }], drops: [{ item: 'antidote', rate: 0.3 }] });
  E('fear_shadow', { name: '恐怖の影', sprite: 'fear_shadow', family: '相場の魔物系', hp: 79, atk: 15, def: 8, agi: 8, mag: 9, exp: 18, gold: 15, area: '忘却の洞窟（深部）', resist: { light: 2, dark: 0 }, actions: [{ type: 'attack', w: 2 }, { type: 'special', id: 'scare', w: 1 }, { type: 'special', id: 'trial', w: 1 }], trial: true });
  E('crab', { name: '岩ガニ', sprite: 'crab', family: '昆虫系', hp: 88, atk: 16, def: 20, agi: 3, exp: 15, gold: 12, area: '波形の海洋群島', resist: { thunder: 1.5 }, actions: [{ type: 'attack', w: 2 }, { type: 'special', id: 'crush', w: 1 }] });
  E('bat_fire', { name: 'ファイアバット', sprite: 'bat_fire', family: '獣系', hp: 66, atk: 16, def: 6, agi: 12, mag: 8, exp: 14, gold: 10, area: 'リシア砂漠', resist: { fire: 0, ice: 2 }, actions: [{ type: 'attack', w: 2 }, { type: 'skill', id: 'fireball', w: 1 }] });
  E('sand_mole', { name: '砂モグラ', sprite: 'sand_mole', family: '獣系', hp: 84, atk: 18, def: 12, agi: 5, exp: 15, gold: 13, area: 'リシア砂漠', actions: [{ type: 'attack', w: 2 }, { type: 'special', id: 'dig', w: 1 }] });
  E('snake_ice', { name: 'フロストサーペント', sprite: 'snake_ice', family: '獣系', hp: 97, atk: 20, def: 10, agi: 8, mag: 10, exp: 20, gold: 16, area: '忘却の雪原', resist: { ice: 0, fire: 2 }, actions: [{ type: 'attack', w: 2 }, { type: 'skill', id: 'ice', w: 1 }] });
  E('wolf_dark', { name: 'シャドウウルフ', sprite: 'wolf_dark', family: '獣系', hp: 121, atk: 24, def: 12, agi: 13, exp: 28, gold: 22, area: '暗黒大陸', resist: { dark: 0.5, light: 1.5 }, actions: [{ type: 'attack', w: 3 }, { type: 'special', id: 'howl', w: 1 }] });
  E('golem_iron', { name: 'アイアンゴーレム', sprite: 'golem_iron', family: 'ゴーレム系', hp: 242, atk: 30, def: 31, agi: 3, exp: 55, gold: 45, area: '資金管理の鉄壁王国', resist: { thunder: 2, fire: 0.5, wind: 0.3 }, actions: [{ type: 'attack', w: 2 }, { type: 'special', id: 'crush', w: 1 }] });
  E('ghost_dark', { name: 'ダークレイス', sprite: 'ghost_dark', family: 'アンデッド系', hp: 106, atk: 19, def: 10, agi: 9, mag: 14, mp: 30, exp: 26, gold: 18, area: '地下墓地', resist: { light: 2, dark: 0, none: 0.7 }, actions: [{ type: 'skill', id: 'dark_bolt', w: 2 }, { type: 'special', id: 'scare', w: 1 }] });
  E('bug_armor', { name: 'アーマービートル', sprite: 'bug_armor', family: '昆虫系', hp: 114, atk: 20, def: 26, agi: 4, exp: 24, gold: 18, area: 'エマール山脈', resist: { fire: 1.5, thunder: 1.5 }, actions: [{ type: 'attack', w: 2 }, { type: 'special', id: 'harden', w: 1 }] });
  E('slime_gold', { name: 'ゴールドスライム', sprite: 'slime_gold', family: 'スライム系', hp: 66, atk: 11, def: 16, agi: 10, exp: 20, gold: 150, area: 'どこかの森（レア）', actions: [{ type: 'attack', w: 1 }, { type: 'special', id: 'flee', w: 2 }], rare: true });

  // ---- ボス ----
  E('boss_lost_trend', { name: 'トレンド迷子', sprite: 'lostghost', family: '相場の魔物系', boss: true, hp: 480, atk: 19, def: 8, agi: 6, mag: 8, exp: 80, gold: 120, area: '迷いの森',
    resist: { light: 1.5, dark: 0.5 }, actions: [{ type: 'attack', w: 2 }, { type: 'special', id: 'scare', w: 1 }, { type: 'skill', id: 'confuse', w: 1 }, { type: 'special', id: 'trial', w: 1 }], trial: true, trialScenarios: ['clear_up', 'clear_down', 'range'] });
  E('boss_greed_golem', { name: '欲望のゴーレム', sprite: 'golem_greed', family: '相場の魔物系', boss: true, hp: 880, atk: 29, def: 18, agi: 3, mag: 6, exp: 200, gold: 300, area: '忘却の洞窟',
    resist: { thunder: 1.5, fire: 0.5, wind: 0.5 }, actions: [{ type: 'attack', w: 2 }, { type: 'special', id: 'crush', w: 2 }, { type: 'special', id: 'greed', w: 1 }, { type: 'special', id: 'trial', w: 1 }], trial: true, trialScenarios: ['up_pullback', 'jump_in', 'mtf_conflict'] });
  E('boss_bandit_chief', { name: '山賊の頭目ガロン', sprite: 'bandit', family: '人間系', boss: true, hp: 640, atk: 26, def: 12, agi: 8, exp: 140, gold: 250, area: 'エマール山脈',
    actions: [{ type: 'attack', w: 3 }, { type: 'skill', id: 'full_slash', w: 1 }, { type: 'skill', id: 'war_cry', w: 1 }], drops: [{ item: 'battle_axe', rate: 1 }] });
  E('boss_greed_demon', { name: '欲望の魔人', sprite: 'greed_demon', family: '相場の魔物系', boss: true, hp: 1280, atk: 36, def: 18, agi: 9, mag: 16, mp: 60, exp: 400, gold: 500, area: '王家の地下通路',
    resist: { light: 1.5, dark: 0 }, actions: [{ type: 'attack', w: 2 }, { type: 'skill', id: 'dark_bolt', w: 2 }, { type: 'special', id: 'greed', w: 1 }, { type: 'special', id: 'trial', w: 1 }], trial: true, trialScenarios: ['hidden_bull', 'regular_bear', 'bad_rr', 'false_breakout'] });

  // 敵の特殊行動の説明（戦闘ロジックが参照）
  var ENEMY_SPECIALS = {
    spore: { name: '眠りの胞子', msg: 'は眠りの胞子をまき散らした！', status: { id: 'sleep', chance: 0.5 }, target: 'allies' },
    drain: { name: '吸血', msg: 'は血を吸った！', power: 0.8, drain: true },
    howl: { name: '遠吠え', msg: 'は遠吠えした！ 攻撃力が上がった', buff: { atk: 0.3 }, turns: 3, self: true },
    scare: { name: '恐怖の囁き', msg: 'は「損切りなんて要らない…」と囁いた！', status: { id: 'confuse', chance: 0.35 }, target: 'ally' },
    feint: { name: 'ダマシの動き', msg: 'はダマシの動きで翻弄した！', buff: { agi: 0.5 }, turns: 2, self: true },
    dig: { name: '潜る', msg: 'は地面に潜った！（次の攻撃が強力になる）', buff: { atk: 0.6 }, turns: 1, self: true },
    crush: { name: '押しつぶし', msg: 'は体当たりしてきた！', power: 1.6 },
    greed: { name: '欲望の誘惑', msg: 'は「全部つぎ込めば一発逆転だ」と誘惑した！', status: { id: 'confuse', chance: 0.5 }, target: 'allies' },
    harden: { name: '硬化', msg: 'は体を硬くした！', buff: { def: 0.5 }, turns: 3, self: true },
    flee: { name: '逃走', msg: 'は逃げ出した！', flee: true },
    trial: { name: '相場の試練', msg: 'はチャートを突きつけてきた！', trial: true }
  };

  var ENEMY_LIST = Object.keys(ENEMIES);
  root.ENEMIES = ENEMIES; root.ENEMY_LIST = ENEMY_LIST; root.ENEMY_SPECIALS = ENEMY_SPECIALS;
  if (typeof module !== 'undefined' && module.exports) module.exports = ENEMIES;
})(typeof window !== 'undefined' ? window : globalThis);
