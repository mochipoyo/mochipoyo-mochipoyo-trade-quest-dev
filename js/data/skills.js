/* =========================================================
   Data / Skills : 特技・呪文
   kind: attack(物理) / magic(魔法攻撃) / heal / heal_all / revive / cure / buff / debuff / status / special
   target: enemy / enemies / ally / allies / self / dead_ally
   power: 威力倍率（attack: 攻撃力に対する倍率, magic/heal: 基礎値）
   ========================================================= */
(function (root) {
  'use strict';

  var SKILLS = {
    // ---- 物理特技 ----
    double_slash: { name: '二段斬り', kind: 'attack', target: 'enemy', mp: 3, power: 0.8, hits: 2, element: 'none', desc: '2回連続で斬りつける', anim: 'slash' },
    full_slash: { name: '全力斬り', kind: 'attack', target: 'enemy', mp: 5, power: 2.2, element: 'none', desc: '力を込めた一撃。防御無視率30%', pierce: 0.3, anim: 'slash' },
    spin_slash: { name: '回転斬り', kind: 'attack', target: 'enemies', mp: 8, power: 1.1, element: 'none', desc: '敵全体を薙ぎ払う', anim: 'slash' },
    war_cry: { name: '雄叫び', kind: 'buff', target: 'allies', mp: 6, buff: { atk: 0.25 }, turns: 3, desc: '味方全体の攻撃力を上げる', anim: 'buff' },
    rush: { name: '連続突き', kind: 'attack', target: 'enemy', mp: 3, power: 0.6, hits: 3, element: 'none', desc: '3連続の突き', anim: 'hit' },
    vital_strike: { name: '急所突き', kind: 'attack', target: 'enemy', mp: 5, power: 1.3, crit: 0.5, element: 'none', desc: '会心が出やすい一撃', anim: 'hit' },
    focus: { name: '精神統一', kind: 'buff', target: 'self', mp: 4, buff: { atk: 0.5, agi: 0.2 }, turns: 3, desc: '自分の攻撃力と素早さを上げる', anim: 'buff' },
    hundred_fists: { name: '百裂拳', kind: 'attack', target: 'enemy', mp: 10, power: 0.5, hits: 5, element: 'none', desc: '5連打', anim: 'hit' },
    steal_strike: { name: '盗み打ち', kind: 'attack', target: 'enemy', mp: 2, power: 0.9, steal: true, element: 'none', desc: '攻撃しつつゴールドを奪う', anim: 'hit' },
    smoke: { name: '煙玉', kind: 'special', target: 'self', mp: 3, escape: true, desc: '確実に逃げられる（ボス以外）', anim: 'buff' },
    poison_edge: { name: '毒刃', kind: 'attack', target: 'enemy', mp: 4, power: 1.0, status: { id: 'poison', chance: 0.7 }, element: 'none', desc: '毒を与える斬撃', anim: 'slash' },
    shadow_step: { name: '影走り', kind: 'attack', target: 'enemy', mp: 7, power: 1.8, crit: 0.3, element: 'dark', desc: '影から急襲する', anim: 'slash' },
    coin_toss: { name: '銭投げ', kind: 'special', target: 'enemy', mp: 0, gold: 20, power: 1.5, desc: '20Gを投げて攻撃（ゴールド消費）', anim: 'hit' },
    appraise: { name: '鑑定眼', kind: 'special', target: 'enemy', mp: 2, scan: true, desc: '敵の弱点とドロップを見る', anim: 'buff' },
    gold_rush: { name: '黄金の嵐', kind: 'special', target: 'enemies', mp: 0, gold: 100, power: 1.6, desc: '100Gを撒いて全体攻撃', anim: 'hit' },
    rain_arrow: { name: '矢の雨', kind: 'attack', target: 'enemies', mp: 5, power: 0.8, element: 'none', desc: '敵全体に矢を降らせる', anim: 'arrow' },
    snipe: { name: '狙い撃ち', kind: 'attack', target: 'enemy', mp: 4, power: 1.6, crit: 0.4, element: 'none', desc: '急所を狙う', anim: 'arrow' },
    paralyze_shot: { name: '麻痺矢', kind: 'attack', target: 'enemy', mp: 5, power: 0.9, status: { id: 'paralyze', chance: 0.6 }, element: 'none', desc: '麻痺させる矢', anim: 'arrow' },
    storm_arrow: { name: '嵐の矢', kind: 'attack', target: 'enemies', mp: 10, power: 1.3, element: 'wind', desc: '風をまとった矢の嵐', anim: 'arrow' },
    shield_bash: { name: '盾打ち', kind: 'attack', target: 'enemy', mp: 3, power: 1.0, status: { id: 'paralyze', chance: 0.3 }, element: 'none', desc: '盾で殴り、麻痺させることがある', anim: 'hit' },
    cover: { name: 'かばう', kind: 'special', target: 'self', mp: 2, cover: true, desc: 'このターン仲間への攻撃を引き受ける', anim: 'buff' },
    iron_wall: { name: '鉄壁', kind: 'buff', target: 'allies', mp: 6, buff: { def: 0.35 }, turns: 3, desc: '味方全体の防御力を上げる', anim: 'buff' },
    holy_blade: { name: '聖剣', kind: 'attack', target: 'enemy', mp: 8, power: 2.0, element: 'light', desc: '光の力を宿した斬撃', anim: 'slash' },
    // ---- 攻撃魔法 ----
    fireball: { name: '火球', kind: 'magic', target: 'enemy', mp: 4, power: 18, element: 'fire', desc: '火の玉を放つ', anim: 'fire' },
    ice: { name: '氷結', kind: 'magic', target: 'enemy', mp: 5, power: 22, element: 'ice', desc: '氷の刃で貫く', anim: 'ice' },
    thunder: { name: '雷撃', kind: 'magic', target: 'enemy', mp: 7, power: 30, element: 'thunder', desc: '雷を落とす', anim: 'thunder' },
    wind_blade: { name: '風刃', kind: 'magic', target: 'enemies', mp: 8, power: 16, element: 'wind', desc: '風の刃で全体を切り裂く', anim: 'wind' },
    firestorm: { name: '火炎嵐', kind: 'magic', target: 'enemies', mp: 12, power: 28, element: 'fire', desc: '炎の嵐で全体を焼く', anim: 'fire' },
    blizzard: { name: '吹雪', kind: 'magic', target: 'enemies', mp: 14, power: 32, element: 'ice', desc: '吹雪で全体を凍らせる', anim: 'ice' },
    dark_bolt: { name: '暗黒弾', kind: 'magic', target: 'enemy', mp: 9, power: 36, element: 'dark', desc: '闇の弾丸', anim: 'dark' },
    meteor: { name: '流星', kind: 'magic', target: 'enemies', mp: 20, power: 48, element: 'none', desc: '流星を降らせる最大級の魔法', anim: 'fire' },
    holy_light: { name: '光槍', kind: 'magic', target: 'enemy', mp: 6, power: 24, element: 'light', desc: '光の槍。アンデッドに大ダメージ', anim: 'light' },
    sleep: { name: '眠りの歌', kind: 'status', target: 'enemies', mp: 5, status: { id: 'sleep', chance: 0.65 }, desc: '敵全体を眠らせる', anim: 'dark' },
    confuse: { name: '惑わし', kind: 'status', target: 'enemy', mp: 5, status: { id: 'confuse', chance: 0.6 }, desc: '敵を混乱させる', anim: 'dark' },
    poison_mist: { name: '毒霧', kind: 'status', target: 'enemies', mp: 4, status: { id: 'poison', chance: 0.7 }, desc: '敵全体を毒にする', anim: 'dark' },
    // ---- 回復・補助 ----
    heal: { name: '小回復', kind: 'heal', target: 'ally', mp: 3, power: 25, desc: '味方1人のHPを回復', anim: 'heal' },
    heal_all: { name: '全体回復', kind: 'heal', target: 'allies', mp: 9, power: 22, desc: '味方全体のHPを回復', anim: 'heal' },
    big_heal: { name: '大回復', kind: 'heal', target: 'ally', mp: 7, power: 70, desc: '味方1人のHPを大きく回復', anim: 'heal' },
    cure_poison: { name: '解毒', kind: 'cure', target: 'ally', mp: 2, cures: ['poison'], desc: '毒を治す', anim: 'heal' },
    cure_all: { name: '浄化', kind: 'cure', target: 'ally', mp: 4, cures: ['poison', 'sleep', 'paralyze', 'confuse'], desc: 'すべての状態異常を治す', anim: 'heal' },
    revive: { name: '蘇生', kind: 'revive', target: 'dead_ally', mp: 10, power: 0.5, desc: '戦闘不能の仲間をHP半分で復活', anim: 'light' },
    protect: { name: '守りの光', kind: 'buff', target: 'ally', mp: 3, buff: { def: 0.3 }, turns: 3, desc: '味方1人の防御力を上げる', anim: 'buff' },
    haste: { name: '疾風の加護', kind: 'buff', target: 'allies', mp: 6, buff: { agi: 0.3 }, turns: 3, desc: '味方全体の素早さを上げる', anim: 'buff' },
    magic_barrier: { name: '魔法障壁', kind: 'buff', target: 'allies', mp: 7, buff: { mdef: 0.4 }, turns: 3, desc: '味方全体の魔法防御を上げる', anim: 'buff' },
    weaken: { name: '弱体', kind: 'debuff', target: 'enemy', mp: 4, buff: { atk: -0.25 }, turns: 3, desc: '敵の攻撃力を下げる', anim: 'dark' },
    armor_break: { name: '鎧砕き', kind: 'debuff', target: 'enemy', mp: 4, buff: { def: -0.3 }, turns: 3, desc: '敵の防御力を下げる', anim: 'hit' },
    // ---- 魔法剣 ----
    flame_blade: { name: '炎の剣', kind: 'attack', target: 'enemy', mp: 4, power: 1.4, element: 'fire', desc: '炎をまとった斬撃', anim: 'fire' },
    ice_blade: { name: '氷の剣', kind: 'attack', target: 'enemy', mp: 5, power: 1.5, element: 'ice', desc: '氷をまとった斬撃', anim: 'ice' },
    thunder_blade: { name: '雷の剣', kind: 'attack', target: 'enemy', mp: 6, power: 1.7, element: 'thunder', desc: '雷をまとった斬撃', anim: 'thunder' },
    // ---- トレード由来の特技（世界観になじむ名前・効果） ----
    dow_blade: { name: 'ダウブレード', kind: 'attack', target: 'enemy', mp: 4, power: 1.5, element: 'none', desc: '高値と安値を切り裂く波形の剣技', anim: 'slash', trend: true },
    ema_slash: { name: 'EMAスラッシュ', kind: 'attack', target: 'enemy', mp: 5, power: 0.7, hits: 3, element: 'none', desc: '20・30・40の三連斬', anim: 'slash' },
    wave_slash: { name: '波形斬り', kind: 'attack', target: 'enemies', mp: 8, power: 1.2, element: 'wind', desc: '推進波の勢いで全体を斬る', anim: 'wind' },
    rci_reversal: { name: 'RCIリバーサル', kind: 'attack', target: 'enemy', mp: 7, power: 1.2, element: 'none', desc: '敵の勢いが過熱しているほど威力が上がる（HPが減った敵に大ダメージ）', anim: 'hit', reversal: true },
    macd_strike: { name: 'MACDストライク', kind: 'magic', target: 'enemy', mp: 8, power: 34, element: 'light', desc: '勢いの差を光に変えて放つ', anim: 'light' },
    hidden_burst: { name: 'ヒドゥンバースト', kind: 'attack', target: 'enemy', mp: 10, power: 2.4, element: 'none', desc: '隠れた継続の力を一点に集める', anim: 'slash' },
    stoploss_shield: { name: '損切りシールド', kind: 'buff', target: 'ally', mp: 3, buff: { def: 0.4 }, turns: 2, desc: '味方1人の被ダメージを大きく減らす', anim: 'buff' },
    risk_barrier: { name: '資金管理の結界', kind: 'buff', target: 'allies', mp: 8, buff: { def: 0.25, mdef: 0.25 }, turns: 3, desc: '味方全体を守る結界', anim: 'buff' },
    higher_tf_eye: { name: '上位足の眼', kind: 'special', target: 'enemies', mp: 3, scan: true, desc: '敵全体の弱点を見抜き、味方の命中・会心を上げる', anim: 'buff', buffAll: { agi: 0.15 }, turns: 3 },
    patience_stance: { name: '忍耐の構え', kind: 'special', target: 'self', mp: 2, cover: true, counter: true, desc: 'このターン仲間をかばい、反撃する', anim: 'buff' },
    // ---- 学習で解放される能力（js/data/learning-events.js） ----
    dow_eye: { name: 'ダウの眼', kind: 'special', target: 'enemy', mp: 3, scan: true, expose: true, desc: '敵の行動傾向と弱点を見抜き、3ターン防御を崩す', anim: 'buff' },
    ema_blessing: { name: 'EMAの加護', kind: 'buff', target: 'allies', mp: 5, buff: { def: 0.3 }, turns: 3, desc: '味方全体の防御力を上げる（3本の線が守る）', anim: 'buff' },
    rci_counter: { name: 'RCIリバーサル（反転）', kind: 'debuff', target: 'enemy', mp: 4, buff: { atk: -0.3 }, turns: 3, desc: '過熱した敵の攻撃力を下げる', anim: 'dark' },
    // v5.1 新職業：監査官・誓約騎士
    audit_eye: { name: '監査の眼', kind: 'special', target: 'enemy', mp: 3, scan: true, expose: true, desc: '敵の隠した弱点と行動を見抜き、3ターン防御を崩す', anim: 'buff' },
    contract_break: { name: '契約破り', kind: 'special', target: 'enemies', mp: 5, dispel: true, desc: '敵全体の能力上昇（強化）を打ち消す', anim: 'dark' },
    ledger_bolt: { name: '帳簿の裁き', kind: 'magic', target: 'enemy', mp: 6, power: 1.8, element: 'light', desc: '記録の光で敵を撃つ', anim: 'light' },
    oath_guard: { name: '誓約の盾', kind: 'special', target: 'self', mp: 3, cover: true, counter: true, desc: 'このターン仲間をかばい、反撃する', anim: 'buff' },
    oath_wall: { name: '誓いの壁', kind: 'buff', target: 'allies', mp: 6, buff: { def: 0.25 }, turns: 3, desc: '味方全体の防御力を上げる', anim: 'buff' },
    judgment_blade: { name: '裁きの剣', kind: 'attack', target: 'enemy', mp: 7, power: 2.0, element: 'light', desc: '誓いを込めた一撃', anim: 'light' },
    // v5.2 航海士・測量士
    storm_helm: { name: '嵐の舵', kind: 'buff', target: 'allies', mp: 5, buff: { agi: 0.3 }, turns: 3, desc: '味方全体の素早さ（回避）を上げる', anim: 'buff' },
    tide_slash: { name: '潮目斬り', kind: 'attack', target: 'enemy', mp: 6, power: 1.8, element: 'ice', desc: '潮の流れを読んだ水の一撃', anim: 'ice' },
    chart_sense: { name: '海図の勘', kind: 'special', target: 'enemy', mp: 3, scan: true, desc: '敵の弱点と行動を見抜く', anim: 'buff' },
    terrain_read: { name: '地形読み', kind: 'buff', target: 'allies', mp: 4, buff: { agi: 0.25, def: 0.1 }, turns: 3, desc: '足場を読み、味方全体の素早さと防御を少し上げる', anim: 'buff' },
    range_shot: { name: '測距射撃', kind: 'attack', target: 'enemy', mp: 6, power: 1.9, element: 'none', desc: '距離を測って急所を射抜く', anim: 'arrow' },
    survey_volley: { name: '測量斉射', kind: 'attack', target: 'enemies', mp: 10, power: 1.3, element: 'none', desc: '敵全体に矢を射かける', anim: 'arrow' },
    // v5.3 時詠み師・機巧師
    foresight: { name: '未来視', kind: 'buff', target: 'ally', mp: 4, buff: { agi: 0.6 }, turns: 2, desc: '味方1人の素早さを大きく上げ、先に動けるようにする', anim: 'buff' },
    time_blessing: { name: '時の加護', kind: 'buff', target: 'allies', mp: 7, buff: { agi: 0.3, mdef: 0.15 }, turns: 3, desc: '味方全体の素早さと魔法防御を上げる', anim: 'buff' },
    delay: { name: '遅延', kind: 'debuff', target: 'enemy', mp: 5, buff: { agi: -0.5 }, turns: 2, desc: '敵1体の素早さを大きく下げ、行動を遅らせる', anim: 'dark' },
    chrono_burst: { name: '時間の奔流', kind: 'magic', target: 'enemies', mp: 12, power: 1.4, element: 'light', desc: '時間の奔流で敵全体を押し流す', anim: 'light' },
    gear_shot: { name: '機巧弾', kind: 'attack', target: 'enemy', mp: 3, power: 1.6, element: 'none', desc: '無属性の遠距離弾', anim: 'arrow' },
    analyze: { name: '解析', kind: 'special', target: 'enemy', mp: 3, scan: true, expose: true, desc: '敵を解析し、弱点を暴いて防御を崩す', anim: 'buff' },
    overdrive: { name: '高度な機巧', kind: 'magic', target: 'enemies', mp: 12, power: 1.5, element: 'thunder', desc: '機巧の全出力で敵全体に雷撃', anim: 'thunder' },
    // v5.5 工匠
    quick_repair: { name: '応急修理', kind: 'buff', target: 'ally', mp: 3, buff: { def: 0.3 }, turns: 3, desc: '味方1人の防御の乱れを直し、防御力を上げる（防御低下も上書き）', anim: 'buff' },
    iron_hammer: { name: '鉄槌', kind: 'attack', target: 'enemy', mp: 5, power: 1.5, element: 'none', familyBonus: { families: ['機械系', 'ゴーレム系'], mult: 1.6 }, desc: '機械・ゴーレムに特に効く一撃', anim: 'hit' },
    weapon_tune: { name: '改造', kind: 'buff', target: 'ally', mp: 5, buff: { atk: 0.35 }, turns: 3, desc: '味方1人の武器を調整し、攻撃力を上げる', anim: 'buff' },
    overhaul: { name: '総点検', kind: 'buff', target: 'allies', mp: 10, buff: { atk: 0.15, def: 0.15 }, turns: 3, desc: '味方全体の装備を点検し、攻撃と防御を少し上げる', anim: 'buff' },
    // v5.5 装備で使える特技（ダウの大剣）
    dow_break: { name: '波形崩し', kind: 'attack', target: 'enemy', mp: 5, power: 1.3, element: 'none', exposeTurns: 2, desc: '高値・安値の切り下げを断ち、敵の防御を2ターン崩す', anim: 'slash' },
    // v5.6 精霊守（アステル）
    spirit_shield: { name: '精霊の盾', kind: 'buff', target: 'ally', mp: 4, buff: { mres: 0.35, def: 0.1 }, turns: 3, desc: '味方1人が受ける魔法のダメージを35%減らし、防御を少し上げる（3ターン）', anim: 'buff' },
    healing_wind: { name: '癒しの風', kind: 'heal', target: 'allies', mp: 6, power: 14, desc: '味方全体のHPを少し回復', anim: 'heal' },
    harmony: { name: '調和', kind: 'cure', target: 'allies', mp: 8, cures: ['poison', 'sleep', 'paralyze', 'confuse', 'silence'], desc: '味方全体の状態異常を治す', anim: 'heal' },
    spirit_ward: { name: '精霊の守り', kind: 'buff', target: 'allies', mp: 9, buff: { mres: 0.25, def: 0.15 }, turns: 3, desc: '味方全体が受ける魔法のダメージを25%減らし、防御を上げる（3ターン）', anim: 'buff' },
    aurora: { name: '極光', kind: 'magic', target: 'enemies', mp: 12, power: 1.6, element: 'light', desc: '精霊の光で敵全体を撃つ', anim: 'light' },
    spirit_rebirth: { name: '精霊の息吹', kind: 'revive', target: 'dead_ally', mp: 16, power: 1.0, desc: '戦闘不能の仲間をHP満タンで復活', anim: 'light' },
    // v5.6 新職業の高位スキル（Lv20・Lv25）
    full_audit: { name: '総監査', kind: 'special', target: 'enemies', mp: 10, scan: true, expose: true, desc: '敵全体の弱点と行動を見抜き、3ターン防御を崩す', anim: 'buff' },
    final_ledger: { name: '決算の光', kind: 'magic', target: 'enemies', mp: 14, power: 1.6, element: 'light', desc: '帳簿の最後の一行で、敵全体を裁く', anim: 'light' },
    oath_bastion: { name: '不落の誓い', kind: 'buff', target: 'allies', mp: 10, buff: { def: 0.4 }, turns: 3, desc: '味方全体の防御力を大きく上げる', anim: 'buff' },
    oath_judgment: { name: '審判の剣', kind: 'attack', target: 'enemy', mp: 12, power: 2.6, element: 'light', desc: '誓いのすべてを込めた一撃', anim: 'light' },
    maelstrom: { name: '渦潮', kind: 'magic', target: 'enemies', mp: 12, power: 1.5, element: 'ice', desc: '渦潮で敵全体を巻き込む', anim: 'ice' },
    fair_wind: { name: '順風', kind: 'buff', target: 'allies', mp: 9, buff: { agi: 0.4, atk: 0.15 }, turns: 3, desc: '追い風を読み、味方全体の素早さと攻撃を上げる', anim: 'buff' },
    pinpoint: { name: '精密測距', kind: 'attack', target: 'enemy', mp: 8, power: 2.4, element: 'none', desc: '距離を測りきった一射', anim: 'arrow' },
    triangulate: { name: '三角測量', kind: 'attack', target: 'enemies', mp: 14, power: 1.6, element: 'none', desc: '三点から敵全体を射抜く', anim: 'arrow' },
    time_rewind: { name: '時の巻き戻し', kind: 'heal', target: 'allies', mp: 14, power: 30, desc: '少し前の時間に戻し、味方全体のHPを回復', anim: 'heal' },
    time_stop: { name: '時間停止', kind: 'debuff', target: 'enemies', mp: 14, buff: { agi: -0.6 }, turns: 2, desc: '敵全体の素早さを大きく下げる', anim: 'dark' },
    gear_barrage: { name: '機巧連射', kind: 'attack', target: 'enemy', mp: 9, power: 0.9, hits: 3, element: 'none', desc: '機巧弾を3連射する', anim: 'arrow' },
    overclock: { name: '過負荷', kind: 'buff', target: 'allies', mp: 10, buff: { atk: 0.3 }, turns: 3, desc: '機巧の出力を上げ、味方全体の攻撃力を上げる', anim: 'buff' },
    masterwork: { name: '名工の一撃', kind: 'attack', target: 'enemy', mp: 10, power: 2.2, element: 'none', familyBonus: { families: ['機械系', 'ゴーレム系'], mult: 1.6 }, desc: '名工の一撃。機械・ゴーレムに特に効く', anim: 'hit' },
    field_forge: { name: '野戦工房', kind: 'buff', target: 'allies', mp: 14, buff: { atk: 0.25, def: 0.25 }, turns: 3, desc: '戦場で装備を打ち直し、味方全体の攻撃と防御を上げる', anim: 'buff' },
    macd_hidden_strike: { name: 'MACDヒドゥンストライク', kind: 'attack', target: 'enemy', mp: 9, power: 2.2, element: 'light', desc: '隠れた継続の力を一点に集める特殊攻撃', anim: 'light' }
  };

  Object.keys(SKILLS).forEach(function (k) { SKILLS[k].id = k; });

  root.SKILLS = SKILLS;
  if (typeof module !== 'undefined' && module.exports) module.exports = SKILLS;
})(typeof window !== 'undefined' ? window : globalThis);
