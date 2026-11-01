/* =========================================================
   Data / v6.5 Phase B：地域ごとの新しいモンスター（12地域 × 3〜4種）と出現表の見直し
   ・方針（依頼の「地域ごとの難易度設計案」に合わせる）
     序盤（アルカディア）＝基本の攻撃／中盤（グラニア・カリオン・断裂群島・時の神殿領・砂漠）＝状態異常・属性・守り
     後半（ゼロメア・雪原・マクディア・竜炎・天空）＝特殊能力・2回行動／終盤（暗黒大陸）＝高耐久・高火力・2回行動の組み合わせ
   ・強さは「その地域を訪れる時期の出現表（zone.level）」に合わせて固定（主人公のレベルに合わせて強くなることはない）
   ・ステータスは既存の敵と同じ式（enemies.js の statsFor：レベル＋型 arche）。経験値・ゴールドも同じ式。落とす物は地域の店に並ぶ程度の物
   ・見た目は js/core/monsterart65.js の新しい種族の形（色違いではなく形から描き分け）。図鑑・戦闘で使う
   ・既存の敵は出現表から外さない（新しい敵のグループを足す。出現表ごとの新しい敵のグループの割合は13〜56%、中央値33%。隠し区画など同じ出現表を使うマップにも同じく出る）
   ・新しい特殊行動（ENEMY_SPECIALS）：毒の牙・しびれ針（攻撃＋状態異常）、時の重り・絶望の波動（素早さ・攻撃力を下げる）など
     2回行動（acts: 2）は combat.js の行動順に2回目を入れる（2回目は素早さが低い扱い）
   ========================================================= */
(function (root) {
  'use strict';
  var EN = root.ENEMIES, SP = root.ENEMY_SPECIALS, MAPS = root.MAP_DEFS;
  if (!EN || !SP) return;
  // enemies.js の statsFor と同じ式（同じレベルの既存の敵と強さをそろえる）
  function statsFor(lv, arche) {
    var s = { hp: Math.round(18 + lv * 9.5), atk: Math.round(5 + lv * 2.2), def: Math.round(2 + lv * 1.3), agi: Math.round(3 + lv * 0.9), mag: Math.round(lv * 0.8), exp: Math.round(3 + lv * lv * 0.9), gold: Math.round(3 + lv * 1.7) };
    if (arche === 'tank') { s.hp = Math.round(s.hp * 1.5); s.def = Math.round(s.def * 1.8); s.agi = Math.round(s.agi * 0.6); s.exp = Math.round(s.exp * 1.3); }
    if (arche === 'fast') { s.hp = Math.round(s.hp * 0.75); s.agi = Math.round(s.agi * 1.9); s.atk = Math.round(s.atk * 0.9); }
    if (arche === 'mage') { s.hp = Math.round(s.hp * 0.85); s.mag = Math.round(lv * 2.2 + 4); s.mp = 20 + lv * 3; s.exp = Math.round(s.exp * 1.2); }
    if (arche === 'glass') { s.hp = Math.round(s.hp * 0.6); s.atk = Math.round(s.atk * 1.5); }
    return s;
  }
  var A = function (type, idOrW, w) { return type === 'attack' ? { type: 'attack', w: idOrW } : { type: type, id: idOrW, w: w }; };
  var ADDED = [];
  function M(id, o) {
    if (EN[id]) throw new Error('monsters65: ID が重複しています ' + id);
    var s = statsFor(o.lv, o.arche); Object.keys(s).forEach(function (k) { if (o[k] === undefined) o[k] = s[k]; });
    if (o.hpMult) { o.hp = Math.round(o.hp * o.hpMult); } if (o.atkMult) { o.atk = Math.round(o.atk * o.atkMult); }
    o.id = id; o.mp = o.mp || 0; o.mag = o.mag || 0; o.resist = o.resist || {}; o.drops = o.drops || []; o.actions = o.actions || [A('attack', 1)]; o.region = 'reachable'; o.v65 = true;
    o.weak = Object.keys(o.resist).filter(function (k) { return o.resist[k] > 1; });
    EN[id] = o; ADDED.push(id);
  }

  /* ---------- 新しい特殊行動（データだけで表す。処理は combat.js） ---------- */
  var NEWSP = {
    tongue_lash: { name: '長い舌', msg: 'は長い舌で打ちつけた！', power: 1.25 },
    charge: { name: '突進', msg: 'は土煙を上げて突進してきた！', power: 1.5 },
    night_hoot: { name: '夜鳴き', msg: 'は低く鳴いた。まぶたが重くなる……', status: { id: 'sleep', chance: 0.3 }, target: 'allies' },
    toxic_bite: { name: '毒の牙', msg: 'は毒の牙でかみついた！', power: 0.9, status: { id: 'poison', chance: 0.5 } },
    sting: { name: 'しびれ針', msg: 'の触手が刺さった！', power: 0.8, status: { id: 'paralyze', chance: 0.35 } },
    binding_clause: { name: '拘束条項', msg: 'は「本条項により、行動を制限する」と読み上げた！', status: { id: 'paralyze', chance: 0.35 }, target: 'ally' },
    toll_volley: { name: '徴税の一斉射', msg: 'は全員に請求書を撃ち込んだ！', power: 0.7, all: true },
    echo_chime: { name: '残響の音', msg: 'は眠りを誘う音を響かせた！', status: { id: 'sleep', chance: 0.4 }, target: 'allies' },
    time_weight: { name: '時の重り', msg: 'は時間を重くした！ 体が思うように動かない', debuff: { agi: -0.3 }, turns: 3, target: 'allies' },
    glitch: { name: '表示のずれ', msg: 'の姿がずれて見えた！ 判断が狂う……', status: { id: 'confuse', chance: 0.4 }, target: 'ally' },
    mirror_trick: { name: '鏡写し', msg: 'は相手の姿を映して惑わせた！', status: { id: 'confuse', chance: 0.45 }, target: 'ally' },
    needle_storm: { name: '針の嵐', msg: 'は全身の針を飛ばした！', power: 0.6, all: true, status: { id: 'poison', chance: 0.25 } },
    forget_snow: { name: '忘却の雪', msg: 'は記憶をかすめる雪を降らせた！ 呪文の言葉が思い出せない……', status: { id: 'silence', chance: 0.4 }, target: 'allies' },
    devour: { name: '丸のみ', msg: 'は大きな口で食らいついた！', power: 1.3, drain: true },
    despair_wave: { name: '絶望の波動', msg: 'は絶望の波動を放った！ 力が抜けていく……', power: 0.8, all: true, debuff: { atk: -0.25 }, turns: 3 },
    hydra_breath: { name: '多頭の息', msg: 'の首がそれぞれ息を吐いた！', power: 0.55, hits: 3 },
    prism_split: { name: '分光', msg: 'は光を七色に分けて浴びせた！', power: 0.65, all: true, status: { id: 'confuse', chance: 0.2 } },
    overfit: { name: '過学習', msg: 'は同じ動きを覚え込んだ！ 守りが固くなった', buff: { def: 0.6 }, turns: 3, self: true }
  };
  Object.keys(NEWSP).forEach(function (k) { if (SP[k]) throw new Error('monsters65: 特殊行動が重複 ' + k); SP[k] = NEWSP[k]; });

  /* ====== アルカディア（序盤：基本の攻撃。草原 lv1〜3・森 2〜6・荒野 4〜7・山脈 8〜10） ====== */
  M('meadow_frog', { name: 'ノハラガエル', lv: 2, art: { family: 'frog', size: 'small', sac: true, spots: true, c: { base: '#6ab04a', accent: '#e8d05a', eye: '#1a1a2a' } }, family: '両生類系', area: '始まりの草原', resist: { ice: 1.5, thunder: 0.8 },
    actions: [A('attack', 3), A('special', 'tongue_lash', 1)], drops: [{ item: 'herb', rate: 0.2 }], desc: '草原の水たまりにすむ大きなカエル。長い舌で打ってくるが、見かけほど強くはない。' });
  M('acorn_turtle', { name: 'ドングリガメ', lv: 4, arche: 'tank', art: { family: 'turtle', size: 'small', shell: 'acorn', c: { base: '#8a5a2a', accent: '#e8c15a', light: '#c9a06a' } }, family: '爬虫類系', area: 'ダウの大森林', resist: { fire: 1.5, wind: 0.7 },
    actions: [A('attack', 3), A('special', 'harden', 1)], drops: [{ item: 'antidote', rate: 0.15 }, { item: 'onigiri', rate: 0.1 }], desc: '背中にどんぐりを背負った森のカメ。甲羅にこもると固い。火に弱い。' });
  M('dust_boar', { name: '荒野イノシシ', lv: 6, art: { family: 'beast', tusks: true, stripes: true, c: { base: '#8a6a4a', accent: '#f2ead8', eye: '#1a1a2a' } }, family: '獣系', area: '南の荒野', resist: { fire: 0.8 },
    actions: [A('attack', 3), A('special', 'charge', 1)], drops: [{ item: 'potion', rate: 0.12 }], desc: '荒野を走り回るイノシシ。まっすぐ突進してくる。' });
  M('ridge_owl', { name: '尾根フクロウ', lv: 9, arche: 'fast', art: { family: 'owl', c: { base: '#7a6a5a', accent: '#e8c15a', eye: '#1a1a2a', light: '#c9b8a0' } }, family: '鳥系', area: 'エマール山脈', resist: { wind: 0.6, thunder: 1.5 },
    actions: [A('attack', 3), A('special', 'night_hoot', 1)], drops: [{ item: 'wake_bell', rate: 0.15 }], desc: '山の尾根に住むフクロウ。夜鳴きで眠りに誘う。眠りを覚ます鐘があると安心。' });

  /* ====== グラニア（鉄・鎖・鉱山。物理攻撃と防御力。lv10〜13） ====== */
  M('chain_cart', { name: '鎖つきトロッコ', lv: 11, arche: 'tank', art: { family: 'cart', chain: true, c: { base: '#5a5a6a', accent: '#c96b2a', eye: '#ff3a3a' } }, family: '機械系', area: '鉄鎖鉱山', resist: { thunder: 1.5, ice: 0.7 },
    actions: [A('attack', 2), A('special', 'crush', 2), A('special', 'harden', 1)], drops: [{ item: 'ether', rate: 0.1 }, { item: 'ore_chunk', rate: 0.15 }], desc: '鉱石を運ぶうちに、坑道の怨みを吸って動き出したトロッコ。体当たりが重い。' });
  M('rail_spider', { name: '坑道グモ', lv: 11, arche: 'fast', art: { family: 'spider', mark: 'sand', c: { base: '#4a3a2a', accent: '#c9a24a', eye: '#ff3a3a' } }, family: '虫系', area: 'グラニアの灰野', resist: { fire: 1.5 },
    actions: [A('attack', 3), A('special', 'toxic_bite', 2)], drops: [{ item: 'antidote', rate: 0.25 }], desc: '坑道の梁に巣を張るクモ。毒の牙を持つ。毒消し草を持っていこう。' });
  M('ingot_sentry', { name: '鉄塊の番兵', lv: 13, arche: 'tank', art: { family: 'knight', helm: 'visor', weapon: 'axe', c: { base: '#6a6a7a', accent: '#c96b2a', eye: '#ffd24a' } }, family: '人形系', area: '鉱山地帯', resist: { thunder: 1.5, fire: 0.8, ice: 0.8 },
    actions: [A('attack', 3), A('skill', 'shield_bash', 1), A('special', 'harden', 1)], drops: [{ item: 'hi_potion', rate: 0.06 }, { item: 'ore_chunk', rate: 0.2 }], desc: '溶かした鉄で作られた番兵の人形。監督官の命令を今も守っている。雷が通りやすい。' });

  /* ====== カリオン（兵士・監査・機械・契約。lv13〜16） ====== */
  M('audit_owl', { name: '監査フクロウ', lv: 14, arche: 'mage', art: { family: 'owl', monocle: true, c: { base: '#3a3a5a', accent: '#e8c15a', eye: '#1a1a2a', light: '#8a8ab0' } }, family: '鳥系', area: 'カリオン平野', resist: { dark: 0.6, light: 1.5 },
    actions: [A('attack', 2), A('skill', 'weaken', 1), A('special', 'silence', 1)], drops: [{ item: 'ether', rate: 0.12 }], desc: '片眼鏡をかけたフクロウ。帳簿の数字を一つずつ数え、呪文を封じる。' });
  M('seal_guard', { name: '印章の衛士', lv: 15, arche: 'tank', art: { family: 'knight', helm: 'plume', weapon: 'lance', cape: true, c: { base: '#4a5a8a', accent: '#c94a4a', eye: '#ffd24a' } }, family: '人形系', area: '王都周辺', resist: { thunder: 1.5 },
    actions: [A('attack', 3), A('skill', 'shield_bash', 1), A('special', 'harden', 1)], drops: [{ item: 'hi_potion', rate: 0.08 }], desc: '印章で動く儀礼の衛士。命令がなくても門を守り続ける。' });
  M('contract_tome', { name: '契約の書', lv: 14, arche: 'mage', art: { family: 'tome', glyph: 'seal', c: { base: '#6a2a2a', accent: '#e8c15a', eye: '#1a1a2a' } }, family: '魔法生物系', area: '地下記録庫', resist: { fire: 1.5, dark: 0.5 },
    actions: [A('attack', 1), A('special', 'binding_clause', 2), A('skill', 'dark_bolt', 1)], drops: [{ item: 'calm_water', rate: 0.15 }], desc: '読んだ者を縛る条文が書かれた本。「拘束条項」で体の自由を奪う。火に弱い。' });
  M('toll_turret', { name: '徴税砲台', lv: 16, arche: 'tank', art: { family: 'turret', kind: 'tax', c: { base: '#5a5a3a', accent: '#e8c15a', eye: '#ff3a3a' } }, family: '機械系', area: '王都周辺', resist: { thunder: 1.5, fire: 0.8 },
    actions: [A('attack', 2), A('special', 'toll_volley', 2)], drops: [{ item: 'ether', rate: 0.1 }], gold: 60, desc: '関所に据えられた砲台。通る者すべてに請求書を撃ち込む。' });

  /* ====== 断裂群島（海賊・水棲・幽霊。lv18〜21） ====== */
  M('reef_jelly', { name: '礁クラゲ', lv: 19, art: { family: 'jelly', c: { base: '#8ac0e8', accent: '#ff8ac0', eye: '#1a1a2a', light: '#e0f4ff' } }, family: '水棲系', area: '断裂群島', resist: { thunder: 2, ice: 0.6, fire: 0.8 },
    actions: [A('attack', 2), A('special', 'sting', 2)], drops: [{ item: 'muscle_relaxant', rate: 0.15 }], desc: '礁の近くに漂うクラゲ。しびれ針で動きを止める。雷がよく効く。' });
  M('reef_shark', { name: '礁ザメ', lv: 20, arche: 'fast', art: { family: 'shark', c: { base: '#5a7a9a', accent: '#e8f0ff', eye: '#1a1a2a' } }, family: '水棲系', area: '断裂群島', resist: { thunder: 1.5, ice: 0.7 },
    actions: [A('attack', 3), A('special', 'double_attack', 1)], drops: [{ item: 'hi_potion', rate: 0.1 }], desc: '浅瀬まで追ってくるサメ。2回続けてかみつく。' });
  M('barnacle_tortoise', { name: 'フジツボ大亀', lv: 21, arche: 'tank', art: { family: 'turtle', size: 'big', shell: 'barnacle', c: { base: '#4a6a5a', accent: '#d8d0c0', light: '#8ab0a0' } }, family: '水棲系', area: '断裂群島', resist: { thunder: 1.5, ice: 0.6, fire: 0.8 },
    actions: [A('attack', 2), A('special', 'harden', 1), A('special', 'heal_self', 1)], drops: [{ item: 'hi_potion', rate: 0.12 }, { item: 'seafood_hotpot', rate: 0.05 }], desc: '背中に島ができそうなほどフジツボをつけた大亀。傷を癒やしながら居座る。' });

  /* ====== 時の神殿領（時間・速さの変化・状態異常。lv22〜23） ====== */
  M('echo_bell', { name: '残響の鐘', lv: 22, arche: 'mage', art: { family: 'bell', c: { base: '#c9a24a', accent: '#9fe0ff', eye: '#1a1a2a', light: '#f2e0a0' } }, family: '魔法生物系', area: '時の神殿領', resist: { thunder: 1.5, dark: 0.6 },
    actions: [A('attack', 1), A('special', 'echo_chime', 2), A('skill', 'confuse', 1)], drops: [{ item: 'wake_bell', rate: 0.2 }], desc: '鳴らす者のいない鐘。残響を聞いた者は眠りに落ちる。' });
  M('pendulum_knight', { name: '振り子の騎士', lv: 23, arche: 'tank', acts: 2, art: { family: 'knight', helm: 'crown', weapon: 'pendulum', c: { base: '#8a7a5a', accent: '#c9a24a', eye: '#9fe0ff' } }, family: '人形系', area: '時の神殿', resist: { thunder: 1.5, ice: 0.8 },
    actions: [A('attack', 3), A('special', 'time_weight', 1)], drops: [{ item: 'hi_ether', rate: 0.06 }], desc: '振り子を武器にする時計仕掛けの騎士。1ターンに2回動く。時の重りで素早さを奪う。' });
  M('hourglass_spider', { name: '砂時計グモ', lv: 22, arche: 'fast', art: { family: 'spider', mark: 'hourglass', c: { base: '#2a2a3a', accent: '#e8c15a', eye: '#ff3a3a' } }, family: '虫系', area: '鐘都の平野', resist: { fire: 1.5 },
    actions: [A('attack', 3), A('special', 'time_weight', 1), A('special', 'toxic_bite', 1)], drops: [{ item: 'antidote', rate: 0.2 }], desc: '背中に砂時計の模様があるクモ。かまれると時間がゆっくり流れる。' });

  /* ====== ゼロメア（AI・ドローン・機械。lv23〜26） ====== */
  M('glitch_cat', { name: 'バグ猫', lv: 24, arche: 'fast', art: { family: 'cat', glitch: true, c: { base: '#3a4a5a', accent: '#6fd0ff', eye: '#ffd24a' } }, family: '獣系', area: 'ゼロメア', resist: { thunder: 1.3, dark: 0.7 },
    actions: [A('attack', 3), A('special', 'glitch', 1), A('special', 'feint', 1)], drops: [{ item: 'calm_water', rate: 0.15 }], desc: '表示が乱れた猫。どこにいるのか正しく見えない。' });
  M('firewall_turret', { name: '防壁砲台', lv: 25, arche: 'tank', art: { family: 'turret', kind: 'firewall', c: { base: '#4a4a5a', accent: '#ff6a3a', eye: '#ff3a3a' } }, family: '機械系', area: '旧都市の崖', resist: { thunder: 1.5, fire: 0.5 },
    actions: [A('attack', 2), A('special', 'sweep', 1), A('special', 'overfit', 1)], drops: [{ item: 'hi_ether', rate: 0.05 }], desc: '旧都市の通路をふさぐ防壁砲台。同じ攻撃を覚え込んで守りを固める。' });
  M('swarm_drones', { name: '群体ドローン', lv: 24, art: { family: 'swarm', count: 4, c: { base: '#8a8a9a', accent: '#ff3a3a', eye: '#ffd24a' } }, family: '機械系', area: 'ゼロメアの平野', resist: { thunder: 2, wind: 1.3 },
    actions: [A('attack', 2), A('special', 'double_attack', 1), { type: 'special', id: 'call', w: 1, hpBelow: 0.6 }], drops: [{ item: 'ether', rate: 0.15 }], desc: '小さなドローンが群れで動く。傷つくと仲間を呼ぶ。雷が弱点。' });
  M('logic_spider', { name: '論理グモ', lv: 26, arche: 'fast', acts: 2, art: { family: 'spider', size: 'big', mark: 'circuit', c: { base: '#2a3a4a', accent: '#9fe0ff', eye: '#ff3a3a' } }, family: '機械系', area: '中枢', resist: { thunder: 1.5, ice: 0.8 },
    actions: [A('attack', 3), A('skill', 'paralyze_shot', 1)], drops: [{ item: 'muscle_relaxant', rate: 0.2 }], desc: '回路の模様を持つ機械グモ。1ターンに2回動き、しびれ弾を撃つ。' });

  /* ====== リシア砂漠（砂・毒・幻覚・耐性。lv22〜24） ====== */
  M('dune_shark', { name: '砂ザメ', lv: 23, arche: 'fast', art: { family: 'shark', sand: true, c: { base: '#c9a870', accent: '#f2ead8', eye: '#1a1a2a' } }, family: '獣系', area: 'リシア砂漠', resist: { ice: 1.5, fire: 0.6, wind: 0.8 },
    actions: [A('attack', 3), A('special', 'dig', 1), A('special', 'double_attack', 1)], drops: [{ item: 'hi_potion', rate: 0.1 }], desc: '砂の中を泳ぐサメ。潜ったあとの一撃に注意。' });
  M('needle_cactus', { name: '針サボテン', lv: 22, arche: 'tank', art: { family: 'cactus', c: { base: '#4a8a4a', accent: '#e05a8a', eye: '#1a1a2a', light: '#7ab07a' } }, family: '植物系', area: '南の砂漠', resist: { fire: 1.5, ice: 0.8 },
    actions: [A('attack', 2), A('special', 'needle_storm', 2)], drops: [{ item: 'antidote', rate: 0.25 }, { item: 'fruit_juice', rate: 0.05 }], desc: '砂漠の針サボテン。全身の針を飛ばす。針には毒がある。' });
  M('mirage_mirror', { name: '蜃気楼の鏡', lv: 24, arche: 'mage', art: { family: 'mirror', frame: 'sand', c: { base: '#a0c0e0', accent: '#ffd24a', eye: '#1a1a2a', light: '#e8f4ff' } }, family: '魔法生物系', area: '蜃気楼神殿', resist: { light: 0.5, dark: 1.5 },
    actions: [A('attack', 1), A('special', 'mirror_trick', 2), A('skill', 'ice', 1)], drops: [{ item: 'calm_water', rate: 0.2 }], desc: '蜃気楼が形になった鏡。見る者に自分の思い込みを映して惑わせる。' });

  /* ====== 忘却の雪原（氷・精神・記憶。雪原 lv25〜27・凍結時計塔 lv36） ====== */
  M('blank_snowman', { name: '顔のない雪だるま', lv: 25, arche: 'tank', art: { family: 'snowman', blank: true, c: { base: '#e8eef8', accent: '#3a4a6a', eye: '#1a1a2a' } }, family: '精霊系', area: '忘却の雪原', resist: { fire: 1.5, ice: 0, wind: 0.8 },
    actions: [A('attack', 2), A('special', 'forget_snow', 1), A('special', 'harden', 1)], drops: [{ item: 'hot_milk', rate: 0.1 }], desc: '作った人に顔を忘れられた雪だるま。呪文の言葉を忘れさせる雪を降らせる。' });
  M('frost_crystal', { name: '氷晶体', lv: 26, arche: 'mage', art: { family: 'crystal', facets: 3, c: { base: '#9fd0ff', accent: '#ffffff', light: '#e0f4ff', eye: '#1a1a2a' } }, family: '精霊系', area: '北の雪原', resist: { fire: 1.5, ice: 0, thunder: 0.8 },
    actions: [A('attack', 1), A('skill', 'blizzard', 1), A('skill', 'ice', 2)], drops: [{ item: 'ether', rate: 0.15 }], desc: '空中で育った氷の結晶。吹雪を呼ぶ。' });
  M('memory_fox', { name: '忘れ狐', lv: 34, arche: 'fast', acts: 2, art: { family: 'fox', tails: 3, breath: true, c: { base: '#e8e0f0', accent: '#9fd0ff', light: '#ffffff', eye: '#3a4a8a' } }, family: '獣系', area: '凍結時計塔', resist: { fire: 1.5, ice: 0.3 },
    actions: [A('attack', 3), A('special', 'forget_snow', 1), A('special', 'feint', 1)], drops: [{ item: 'hi_potion', rate: 0.12 }], desc: '三本の尾を持つ雪狐。1ターンに2回動く。息を浴びると呪文を忘れる。' });

  /* ====== マクディア（高威力の魔法・属性。lv28〜29） ====== */
  M('flame_grimoire', { name: '炎の魔導書', lv: 28, arche: 'mage', art: { family: 'tome', glyph: 'flame', c: { base: '#8a2a1a', accent: '#ff8a3a', eye: '#1a1a2a' } }, family: '魔法生物系', area: 'マクディア平原', resist: { fire: 0, ice: 1.5 },
    actions: [A('attack', 1), A('skill', 'fireball', 2), A('skill', 'firestorm', 1)], drops: [{ item: 'hi_ether', rate: 0.06 }], desc: '炎の呪文だけが書かれた魔導書。ページをめくるたびに火が噴く。氷に弱い。' });
  M('prism_crystal', { name: 'プリズム結晶', lv: 29, arche: 'mage', art: { family: 'crystal', facets: 4, c: { base: '#c0a0ff', accent: '#ffffff', light: '#f0e0ff', eye: '#1a1a2a' } }, family: '魔法生物系', area: '実験室の山地', resist: { fire: 0.7, ice: 0.7, thunder: 0.7, wind: 0.7, light: 0.5, dark: 1.8 },
    actions: [A('attack', 1), A('special', 'prism_split', 2), A('skill', 'thunder', 1)], drops: [{ item: 'mana_tea', rate: 0.08 }], desc: '光を七色に分ける結晶。たいていの属性を和らげるが、闇には弱い。' });
  M('spell_mirror', { name: '呪文鏡', lv: 29, arche: 'mage', art: { family: 'mirror', frame: 'gold', c: { base: '#5a4a8a', accent: '#c9a2ff', eye: '#ffd24a', light: '#a090d0' } }, family: '魔法生物系', area: '禁書庫', resist: { light: 0.6, dark: 0.6, thunder: 1.5 },
    actions: [A('attack', 1), A('special', 'silence', 2), A('skill', 'dark_bolt', 1), A('special', 'mirror_trick', 1)], drops: [{ item: 'calm_water', rate: 0.2 }], desc: '禁書庫の壁にかけられた鏡。呪文を封じ、唱えた者を映し返す。' });

  /* ====== 竜炎火山群島（炎・竜・溶岩。lv29〜32） ====== */
  M('lava_tortoise', { name: '溶岩ガメ', lv: 30, arche: 'tank', art: { family: 'turtle', size: 'big', shell: 'lava', c: { base: '#3a2a2a', accent: '#ff6a2a', light: '#6a4a3a' } }, family: '爬虫類系', area: '竜炎火山群島', resist: { fire: 0, ice: 1.8, thunder: 0.8 },
    actions: [A('attack', 2), A('special', 'harden', 1), A('skill', 'firestorm', 1)], drops: [{ item: 'dragon_scale', rate: 0.05 }, { item: 'hi_potion', rate: 0.1 }], desc: '甲羅の割れ目から溶岩がのぞく大亀。炎を吐き、甲羅は熱でさらに固くなる。氷に弱い。' });
  M('flame_salamander', { name: '炎のサラマンダー', lv: 31, arche: 'fast', art: { family: 'salamander', c: { base: '#c94a2a', accent: '#ffd24a', eye: '#1a1a2a', light: '#ff8a5a' } }, family: '爬虫類系', area: '竜脈の島', resist: { fire: 0, ice: 1.5 },
    actions: [A('attack', 3), A('skill', 'fireball', 1), { type: 'special', id: 'rage', w: 2, hpBelow: 0.5 }], drops: [{ item: 'hi_potion', rate: 0.1 }], desc: '炎のトサカを持つトカゲ。傷つくと怒り狂う。' });
  M('scale_knight', { name: '竜鱗の騎士', lv: 32, arche: 'tank', acts: 2, art: { family: 'knight', helm: 'horn', weapon: 'claymore', cape: true, c: { base: '#6a2a2a', accent: '#ffb02a', eye: '#ffd24a' } }, family: '人形系', area: '竜脈洞窟', resist: { fire: 0.4, ice: 1.4, thunder: 0.8 },
    actions: [A('attack', 3), A('skill', 'full_slash', 1), A('special', 'harden', 1)], drops: [{ item: 'dragon_scale', rate: 0.08 }], desc: '竜の鱗の鎧をまとった騎士の亡霊。1ターンに2回、大剣を振る。' });

  /* ====== 天空群島（光・風・飛行。lv30〜32） ====== */
  M('cloud_ram', { name: '雲ヒツジ', lv: 30, arche: 'tank', art: { family: 'ram', bolt: true, c: { base: '#f0f4ff', accent: '#c9a24a', light: '#ffffff', dark: '#8a9ab0', eye: '#1a1a2a' } }, family: '獣系', area: '天空群島', resist: { wind: 0.5, thunder: 0.7, fire: 1.4 },
    actions: [A('attack', 2), A('special', 'charge', 1), A('special', 'night_hoot', 1)], drops: [{ item: 'hot_milk', rate: 0.15 }], desc: '雲の毛を持つヒツジ。ふかふかの毛で眠りに誘い、角で突く。' });
  M('aurora_crystal', { name: '極光結晶', lv: 31, arche: 'mage', art: { family: 'crystal', facets: 5, c: { base: '#a0ffd8', accent: '#ffe08a', light: '#e8fff4', eye: '#1a1a2a' } }, family: '精霊系', area: '天空神殿の島', resist: { light: 0, dark: 1.8, wind: 0.7 },
    actions: [A('attack', 1), A('skill', 'thunder', 1), A('special', 'prism_split', 1), A('special', 'heal_self', 1)], drops: [{ item: 'mana_tea', rate: 0.1 }], desc: '空の光が固まった結晶。七色の光で目をくらませる。闇に弱い。' });
  M('gale_ray', { name: '天風エイ', lv: 31, arche: 'fast', art: { family: 'ray', spark: true, c: { base: '#5a8ad0', accent: '#ffe08a', light: '#a0c8ff', eye: '#1a1a2a' } }, family: '鳥系', area: '天空群島', resist: { wind: 0.3, thunder: 1.5 },
    actions: [A('attack', 2), A('skill', 'wind_blade', 2), A('special', 'double_attack', 1)], drops: [{ item: 'hi_potion', rate: 0.1 }], desc: '雲の上を泳ぐエイ。翼で風の刃を作る。' });

  /* ====== 暗黒大陸（終盤：高耐久・高火力・2回行動。lv34〜37） ====== */
  M('abyss_maw', { name: '深淵の口', lv: 35, arche: 'tank', art: { family: 'maw', size: 'big', c: { base: '#2a0a1a', accent: '#ff3a6a', eye: '#ffd24a' } }, family: '悪魔系', area: '暗黒大陸', resist: { light: 1.6, dark: 0.3, fire: 0.8 },
    actions: [A('attack', 2), A('special', 'devour', 2), A('special', 'crush', 1)], drops: [{ item: 'elixir', rate: 0.03 }, { item: 'hi_potion', rate: 0.15 }], gold: 160, desc: '地面に開いた大きな口。食らいつき、体力を吸い取る。光に弱い。' });
  M('despair_knight', { name: '絶望の騎士', lv: 36, arche: 'tank', acts: 2, atkMult: 1.1, art: { family: 'knight', size: 'big', helm: 'horn', weapon: 'claymore', cape: true, c: { base: '#1a1a2a', accent: '#8a2a5a', eye: '#ff3a3a' } }, family: '人形系', area: '魔王城の山麓', resist: { light: 1.5, dark: 0.3 },
    actions: [A('attack', 3), A('special', 'despair_wave', 1), A('skill', 'full_slash', 1)], drops: [{ item: 'phoenix_feather', rate: 0.08 }], gold: 180, desc: '負けを認められずに戦い続けた騎士の鎧。1ターンに2回動き、絶望の波動で力を奪う。' });
  M('chaos_hydra', { name: '混沌のヒドラ', lv: 37, arche: 'tank', acts: 2, art: { family: 'hydra', size: 'big', heads: 3, c: { base: '#3a2a4a', accent: '#ff6a3a', eye: '#ffd24a', light: '#6a5a8a' } }, family: '竜系', area: '暗黒大陸', resist: { light: 1.4, dark: 0.5, fire: 0.7, ice: 0.7, thunder: 0.7 },
    actions: [A('attack', 2), A('special', 'hydra_breath', 2), A('skill', 'fireball', 1), A('skill', 'blizzard', 1)], drops: [{ item: 'elixir', rate: 0.04 }], gold: 200, desc: '三つの首がばらばらの判断をする竜。1ターンに2回動く。炎・氷・雷を和らげるが光に弱い。' });
  M('void_mirror', { name: '虚無の鏡', lv: 35, arche: 'mage', art: { family: 'mirror', frame: 'obsidian', c: { base: '#1a1a3a', accent: '#c9a2ff', eye: '#ff3a3a', light: '#4a4a7a' } }, family: '魔法生物系', area: '虚無の荒野', resist: { dark: 0, light: 1.6 },
    actions: [A('attack', 1), A('special', 'mirror_trick', 2), A('skill', 'dark_bolt', 2)], drops: [{ item: 'mystic_water', rate: 0.04 }], desc: '何も映さない鏡。見つめた者は自分を見失う。' });

  /* ---------- 出現表：既存のグループはそのまま、新しい敵のグループを足す ---------- */
  // [地図, 出現表の名前（zone.name）, 足すグループ...]。同じ表に何度も出るのは「出やすさ」の調整
  var ADD = [
    ['world', '始まりの草原', ['meadow_frog'], ['meadow_frog', 'slime'], ['meadow_frog', 'meadow_frog'], ['meadow_frog', 'bug']],
    ['world', 'ダウの大森林', ['acorn_turtle'], ['acorn_turtle', 'slime_red'], ['acorn_turtle', 'wolf'], ['meadow_frog', 'acorn_turtle']],
    ['world', '南の荒野', ['dust_boar'], ['dust_boar', 'lizard'], ['dust_boar', 'dust_boar']],
    ['world', 'エマール山脈', ['ridge_owl'], ['ridge_owl', 'bandit'], ['ridge_owl', 'golem']],
    ['lost_forest', '迷いの森', ['acorn_turtle', 'mushroom'], ['acorn_turtle']],
    ['emal_pass', 'エマール山道', ['ridge_owl', 'nanpin_goblin'], ['ridge_owl']],
    ['world_grania', 'グラニアの灰野', ['rail_spider'], ['rail_spider', 'chain_hound'], ['rail_spider', 'rail_spider']],
    ['world_grania', '鉱山地帯', ['ingot_sentry'], ['chain_cart'], ['ingot_sentry', 'mine_imp']],
    ['iron_mine_1', '鉄鎖鉱山', ['chain_cart'], ['rail_spider', 'ore_bat']],
    ['iron_mine_2', '鉄鎖鉱山', ['chain_cart', 'mine_imp'], ['rail_spider', 'rail_spider']],
    ['iron_mine_3', '鉄鎖鉱山', ['ingot_sentry'], ['chain_cart', 'chain_warden']],
    ['world_kalion', 'カリオン平野', ['audit_owl'], ['audit_owl', 'tax_hound'], ['audit_owl', 'federal_soldier']],
    ['world_kalion', '王都周辺', ['seal_guard'], ['toll_turret'], ['seal_guard', 'royal_guard']],
    ['kalion_archive_1', '地下記録庫', ['contract_tome'], ['contract_tome', 'paper_wraith']],
    ['kalion_archive_2', '地下記録庫', ['contract_tome', 'ledger_mimic'], ['contract_tome']],
    ['sentra_palace_1', '王宮', ['seal_guard', 'royal_guard'], ['toll_turret']],
    ['world_islands', '廃墟側の荒地', ['reef_jelly', 'rust_crab'], ['barnacle_tortoise']],
    ['world_islands', '灰灯島の草地', ['reef_shark'], ['reef_jelly'], ['reef_shark', 'salt_wolf']],
    ['mist_isle', '霧の島', ['reef_jelly', 'lantern_wisp'], ['barnacle_tortoise']],
    ['elmina_undersea', '海底都市', ['reef_shark', 'reef_jelly'], ['barnacle_tortoise']],
    ['world_tempus', '神殿の山地', ['echo_bell'], ['echo_bell', 'chrono_moth']],
    ['world_tempus', '鐘都の平野', ['hourglass_spider'], ['hourglass_spider', 'bell_wraith'], ['echo_bell']],
    ['temple_of_time_1', '時の神殿', ['pendulum_knight'], ['echo_bell', 'hourglass_golem']],
    ['temple_of_time_2', '時の神殿', ['pendulum_knight'], ['hourglass_spider', 'echo_bell']],
    ['world_machine', '旧都市の崖', ['firewall_turret'], ['glitch_cat', 'rust_sentinel']],
    ['world_machine', 'ゼロメアの平野', ['swarm_drones'], ['glitch_cat'], ['glitch_cat', 'patrol_drone']],
    ['old_city_1', '旧都市', ['firewall_turret'], ['glitch_cat', 'data_leech']],
    ['auto_factory_1', '自動工場', ['swarm_drones'], ['swarm_drones', 'repair_bot']],
    ['auto_factory_2', '自動工場', ['firewall_turret'], ['swarm_drones']],
    ['oracle_core_1', '中枢', ['logic_spider'], ['glitch_cat', 'core_defender']],
    ['oracle_core_2', '中枢', ['logic_spider'], ['logic_spider', 'sentry_unit']],
    ['world_desert', 'リシア砂漠', ['dune_shark'], ['dune_shark', 'mirage_fox'], ['needle_cactus']],
    ['world_desert', '南の砂漠', ['needle_cactus'], ['needle_cactus', 'dune_scorpion'], ['dune_shark']],
    ['sandstorm_corridor_1', '砂嵐の回廊', ['dune_shark'], ['needle_cactus', 'dust_djinn']],
    ['sandstorm_corridor_2', '砂嵐の回廊', ['dune_shark', 'caravan_raider']],
    ['mirage_temple_1', '蜃気楼神殿', ['mirage_mirror'], ['mirage_mirror', 'temple_sentinel']],
    ['mirage_temple_2', '蜃気楼神殿', ['mirage_mirror'], ['mirage_mirror', 'rumor_mimic']],
    ['mirage_temple_3', '蜃気楼神殿', ['mirage_mirror', 'mirage_mirror']],
    ['world_snow', '忘却の雪原', ['blank_snowman'], ['blank_snowman', 'frost_wolf'], ['frost_crystal']],
    ['world_snow', '北の雪原', ['frost_crystal'], ['frost_crystal', 'ice_wraith'], ['blank_snowman']],
    ['spirit_forest_1', '精霊の森', ['frost_crystal'], ['blank_snowman', 'frost_harpy']],
    ['frozen_tower_1', '凍結時計塔', ['memory_fox'], ['memory_fox', 'clock_soldier']],
    ['frozen_tower_2', '凍結時計塔', ['memory_fox'], ['memory_fox', 'clock_soldier']],
    ['frozen_tower_3', '凍結時計塔', ['memory_fox', 'memory_fox']],
    ['world_magicka', 'マクディア平原', ['flame_grimoire'], ['flame_grimoire', 'indicator_mage'], ['prism_crystal']],
    ['world_magicka', '実験室の山地', ['prism_crystal'], ['prism_crystal', 'mana_golem']],
    ['forbidden_archive_1', '禁書庫', ['spell_mirror'], ['flame_grimoire', 'grimoire']],
    ['forbidden_archive_2', '禁書庫', ['spell_mirror', 'grimoire'], ['spell_mirror']],
    ['origin_lab_1', '起源の実験室', ['prism_crystal'], ['flame_grimoire', 'arcane_eye']],
    ['world_dragon', '竜炎火山群島', ['lava_tortoise'], ['flame_salamander'], ['lava_tortoise', 'magma_slime']],
    ['world_dragon', '竜脈の島', ['flame_salamander'], ['flame_salamander', 'fire_drake'], ['lava_tortoise']],
    ['crater_altar', '火口の祭壇', ['lava_tortoise'], ['flame_salamander', 'flame_spirit']],
    ['dragon_vein_1', '竜脈洞窟', ['scale_knight'], ['flame_salamander', 'vein_wyrmling']],
    ['dragon_vein_2', '竜脈洞窟', ['scale_knight'], ['lava_tortoise', 'obsidian_golem']],
    ['world_sky', '天空群島', ['cloud_ram'], ['gale_ray'], ['cloud_ram', 'storm_harpy']],
    ['world_sky', '天空神殿の島', ['aurora_crystal'], ['gale_ray', 'star_sentinel']],
    ['star_tower_1', '星見塔', ['aurora_crystal'], ['gale_ray', 'cloud_slime']],
    ['sky_temple_1', '天空神殿', ['aurora_crystal', 'star_sentinel'], ['gale_ray']],
    ['world_dark', '暗黒大陸', ['abyss_maw'], ['chaos_hydra'], ['abyss_maw', 'void_beast']],
    ['world_dark', '魔王城の山麓', ['despair_knight'], ['despair_knight', 'control_shade'], ['chaos_hydra']],
    ['void_wasteland_1', '虚無の荒野', ['void_mirror'], ['void_mirror', 'fear_shade'], ['abyss_maw']],
    ['demon_castle_1', '魔王城', ['despair_knight'], ['void_mirror', 'greed_shade']],
    ['demon_castle_2', '魔王城', ['despair_knight'], ['chaos_hydra']],
    ['demon_castle_3', '魔王城', ['void_mirror', 'despair_knight']],
    ['demon_castle_4', '魔王城', ['chaos_hydra'], ['despair_knight', 'control_shade']]
  ];
  var applied = [], missing = [];
  ADD.forEach(function (r) {
    var def = MAPS[r[0]]; var zones = def && def.encounters && def.encounters.zones; var z = zones && zones.filter(function (q) { return q.name === r[1]; })[0];
    if (!z) { missing.push(r[0] + ':' + r[1]); return; }
    r.slice(2).forEach(function (g) { g.forEach(function (id) { if (!EN[id]) throw new Error('monsters65: 出現表に未定義の敵 ' + id); }); z.groups.push(g.slice()); });
    applied.push(r[0] + ':' + r[1]);
  });
  root.MONSTERS65 = { added: ADDED.slice(), specials: Object.keys(NEWSP), zones: applied, missing: missing };
  if (root.ENEMY_LIST) ADDED.forEach(function (id) { if (root.ENEMY_LIST.indexOf(id) < 0) root.ENEMY_LIST.push(id); });
})(typeof window !== 'undefined' ? window : globalThis);
