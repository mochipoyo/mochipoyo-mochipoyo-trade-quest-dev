/* =========================================================
   Data / Skills v6.4（Phase C）：呪文24・特技32 と、職業ごとの習得レベル
   ・既存の SKILLS・JOBS に追加するだけ（既存のIDは変えない）。IDの重複は tests（work/skills64test.js）で確認
   ・強いものほど遅く覚える。回復・蘇生の目安：小回復 Lv1〜3／中回復 Lv12〜15／全体小回復 Lv20〜24／大回復 Lv22〜26／
     蘇生（HP50%）Lv28〜32／全体中回復 Lv30〜35／完全蘇生 Lv40前後／全体大回復 Lv42〜
   ・新しい効果（js/rpg/combat.js で処理）：
     buff の新しい種類 guard（被ダメージ軽減）・evade（回避）・charge（次の物理攻撃の倍率）・endure（倒れるダメージをHP1で耐える）・regen（毎ターンHP回復）
     kind 'mp_heal'（味方のMP回復）／revive の regen（復活後の自然回復）／攻撃後の敵の弱体（targetDebuff）・自分の強化（selfBuff）／
     execute（HPが減った敵に倍率）・fastBonus（素早い敵に倍率）・steady（下振れなし）／special の escapeBonus・cleanse・counterMult
   ========================================================= */
(function (root) {
  'use strict';
  var SKILLS = root.SKILLS, JOBS = root.JOBS; var NEW = [];
  function S(id, o) { if (SKILLS[id]) throw new Error('skills64: ID が重複しています ' + id); o.id = id; o.v64 = true; SKILLS[id] = o; NEW.push(id); }

  /* ---------- 呪文 24 ---------- */
  // 回復・蘇生（8）
  S('drop_heal', { name: '癒しの滴', kind: 'heal', target: 'ally', mp: 2, power: 16, desc: '味方1人のHPを少し回復（消費MPが少ない）', anim: 'heal', school: 'spell' });
  S('torrent_heal', { name: '癒しの奔流', kind: 'heal', target: 'ally', mp: 6, power: 58, desc: '味方1人のHPを中〜大量に回復', anim: 'heal', school: 'spell' });
  S('gentle_rain', { name: '慈雨', kind: 'heal', target: 'allies', mp: 9, power: 20, desc: '味方全体のHPを少し回復', anim: 'heal', school: 'spell' });
  S('great_rain', { name: '大慈雨', kind: 'heal', target: 'allies', mp: 26, power: 80, desc: '味方全体のHPを大きく回復', anim: 'heal', school: 'spell' });
  S('life_lamp', { name: '生命の灯', kind: 'revive', target: 'dead_ally', mp: 8, power: 0.25, desc: '戦闘不能の仲間をHP25%で復活', anim: 'light', school: 'spell' });
  S('rebirth_prayer', { name: '再生の祈り', kind: 'revive', target: 'dead_ally', mp: 14, power: 0.5, regen: { value: 0.06, turns: 3 }, desc: '戦闘不能の仲間をHP50%で復活し、3ターンのあいだ毎ターン最大HPの6%を回復', anim: 'light', school: 'spell' });
  S('soul_return', { name: '魂返し', kind: 'revive', target: 'dead_ally', mp: 26, power: 1.0, desc: '戦闘不能の仲間をHP100%で復活', anim: 'light', school: 'spell' });
  S('purify_ring', { name: '浄化の輪', kind: 'cure', target: 'allies', mp: 9, cures: ['poison', 'sleep', 'paralyze', 'confuse', 'silence'], desc: '味方全体の状態異常（毒・眠り・麻痺・混乱・沈黙）を治す', anim: 'heal', school: 'spell' });
  // 攻撃（8）
  S('flame_lance', { name: '焔槍', kind: 'magic', target: 'enemy', mp: 9, power: 42, element: 'fire', desc: '炎の槍で敵1体を貫く', anim: 'fire', school: 'spell' });
  S('freezing_rain', { name: '凍雨', kind: 'magic', target: 'enemies', mp: 12, power: 24, element: 'ice', targetDebuff: { agi: -0.2, turns: 2 }, desc: '凍える雨で敵全体を攻撃し、素早さを2ターン20%下げる', anim: 'ice', school: 'spell' });
  S('thunder_array', { name: '轟雷陣', kind: 'magic', target: 'enemies', mp: 16, power: 36, element: 'thunder', desc: '雷の陣で敵全体を撃つ', anim: 'thunder', school: 'spell' });
  S('gale_fault', { name: '旋風断層', kind: 'magic', target: 'enemies', mp: 16, power: 34, element: 'wind', desc: '風の断層で敵全体を切り裂く', anim: 'wind', school: 'spell' });
  S('stardust_rain', { name: '星屑の雨', kind: 'magic', target: 'enemies', mp: 20, power: 40, element: 'none', desc: '星屑を降らせる無属性の全体攻撃', anim: 'light', school: 'spell' });
  S('imaginary_bolt', { name: '虚数雷', kind: 'magic', target: 'enemy', mp: 18, power: 78, element: 'dark', desc: '虚数の雷。闇属性の高威力な単体攻撃', anim: 'dark', school: 'spell' });
  S('pale_flame', { name: '蒼白の焔', kind: 'magic', target: 'enemies', mp: 28, power: 62, element: 'fire', desc: '青白い炎で敵全体を焼く高威力の魔法', anim: 'fire', school: 'spell' });
  S('celestial_impact', { name: '天体衝突', kind: 'magic', target: 'enemies', mp: 44, power: 170, element: 'none', desc: '天体を落とす。終盤の超高威力の全体攻撃', anim: 'fire', school: 'spell' });
  // 補助・妨害（8）
  S('future_shield', { name: '未来の盾', kind: 'buff', target: 'ally', mp: 4, buff: { def: 0.35, mdef: 0.2 }, turns: 3, desc: '味方1人の防御力（+35%）と魔法防御（+20%）を上げる', anim: 'buff', school: 'spell' });
  S('loss_limit_ward', { name: '損失限定結界', kind: 'buff', target: 'allies', mp: 12, buff: { guard: 0.2 }, turns: 3, desc: '味方全体の受けるダメージを3ターン20%減らす', anim: 'buff', school: 'spell' });
  S('focus_blessing', { name: '集中の加護', kind: 'buff', target: 'ally', mp: 4, buff: { mag: 0.3 }, turns: 3, desc: '味方1人の魔力を3ターン30%上げる', anim: 'buff', school: 'spell' });
  S('mana_cycle', { name: '魔力循環', kind: 'mp_heal', target: 'ally', mp: 3, power: 10, desc: '自分の魔力を分け、ほかの味方1人のMPを回復（10＋魔力の30%）', anim: 'heal', school: 'spell' });
  S('calm_light', { name: '沈静の光', kind: 'cure', target: 'ally', mp: 4, cures: ['poison', 'sleep', 'paralyze', 'confuse', 'silence'], desc: '味方1人の状態異常をすべて治す', anim: 'heal', school: 'spell' });
  S('slow_mist', { name: '鈍化の霧', kind: 'debuff', target: 'enemies', mp: 7, buff: { agi: -0.3 }, turns: 3, desc: '敵全体の素早さを3ターン30%下げる', anim: 'dark', school: 'spell' });
  S('unyielding_prayer', { name: '不屈の祈り', kind: 'buff', target: 'allies', mp: 9, buff: { def: 0.2, mdef: 0.2 }, turns: 3, desc: '味方全体の防御力と魔法防御を3ターン20%上げる', anim: 'buff', school: 'spell' });
  S('insight_flash', { name: '洞察の閃き', kind: 'special', target: 'enemies', mp: 3, scan: true, desc: '敵全体の弱点・耐性とHPを見抜く', anim: 'buff', school: 'spell' });

  /* ---------- 特技 32 ---------- */
  // 戦士系
  S('trend_breakthrough', { name: 'トレンド突破', kind: 'attack', target: 'enemy', mp: 8, power: 2.5, element: 'none', desc: '敵1体に強烈な一撃', anim: 'slash', school: 'skill' });
  S('resistance_crush', { name: '抵抗線砕き', kind: 'attack', target: 'enemy', mp: 5, power: 1.0, targetDebuff: { def: -0.3, turns: 3 }, desc: '攻撃し、敵の防御力を3ターン30%下げる', anim: 'hit', school: 'skill' });
  S('pierce_slash', { name: '防御貫通斬', kind: 'attack', target: 'enemy', mp: 6, power: 1.6, pierce: 0.5, desc: '敵の防御力の半分を無視して斬る', anim: 'slash', school: 'skill' });
  S('rising_triple', { name: '上昇三連撃', kind: 'attack', target: 'enemy', mp: 10, power: 0.78, hits: 3, desc: '敵1体に3連続攻撃', anim: 'slash', school: 'skill' });
  // 武闘家系
  S('rebound_palm', { name: '反発掌', kind: 'attack', target: 'enemy', mp: 4, power: 1.4, crit: 0.4, desc: '会心が出やすい掌打', anim: 'hit', school: 'skill' });
  S('pivot_kick', { name: '転換脚', kind: 'attack', target: 'enemy', mp: 5, power: 1.3, selfBuff: { agi: 0.3, turns: 2 }, desc: '蹴りのあと、自分の素早さが2ターン30%上がる', anim: 'hit', school: 'skill' });
  S('wave_combo', { name: '波動連拳', kind: 'attack', target: 'enemy', mp: 10, power: 0.58, hits: 4, desc: '4連打', anim: 'hit', school: 'skill' });
  S('instant_reversal', { name: '瞬間逆転', kind: 'special', target: 'self', mp: 4, counter: true, counterMult: 1.5, desc: 'このターン攻撃を受けると、1.5倍で反撃する（かばいはしない）', anim: 'buff', school: 'skill' });
  // 盗賊系
  S('fakeout_read', { name: 'ダマシ見切り', kind: 'buff', target: 'self', mp: 3, buff: { evade: 0.4 }, turns: 2, desc: '2ターン、敵の単体攻撃を40%でかわす', anim: 'buff', school: 'skill' });
  S('escape_route', { name: '逃走経路確保', kind: 'special', target: 'self', mp: 2, escapeBonus: 0.4, desc: 'この戦闘の「にげる」の成功率+40%（ボス戦では逃げられない）', anim: 'buff', school: 'skill' });
  S('spread_tear', { name: 'スプレッド裂き', kind: 'attack', target: 'enemy', mp: 5, power: 1.1, exposeTurns: 2, desc: '攻撃し、敵の防御を2ターン崩す（防御半減）', anim: 'slash', school: 'skill' });
  S('stop_ambush', { name: '逆指値奇襲', kind: 'attack', target: 'enemy', mp: 9, power: 2.2, crit: 0.35, desc: '急所を狙う高威力の奇襲', anim: 'slash', school: 'skill' });
  // 狩人系
  S('range_snipe', { name: 'レンジ狙撃', kind: 'attack', target: 'enemy', mp: 4, power: 1.5, steady: true, crit: 0.1, desc: '狙いすました一射（ダメージの下振れなし・会心+10%）', anim: 'arrow', school: 'skill' });
  S('lowcut_arrow', { name: '安値刈り矢', kind: 'attack', target: 'enemy', mp: 5, power: 1.3, fastBonus: 1.6, desc: '素早い敵（自分の素早さの8割以上）に1.6倍', anim: 'arrow', school: 'skill' });
  S('htf_aim', { name: '上位足照準', kind: 'buff', target: 'self', mp: 4, buff: { charge: 0.8 }, turns: 3, desc: '次の物理攻撃の威力+80%（3ターン以内）', anim: 'buff', school: 'skill' });
  S('meteor_arrows', { name: '隕石雨', kind: 'attack', target: 'enemies', mp: 14, power: 0.85, hits: 2, desc: '敵全体に2回ずつ矢を降らせる', anim: 'arrow', school: 'skill' });
  // 騎士系
  S('evidence_shield', { name: '証拠の盾', kind: 'buff', target: 'self', mp: 4, buff: { def: 0.6 }, turns: 3, desc: '自分の防御力を3ターン60%上げる', anim: 'buff', school: 'skill' });
  S('all_cover', { name: '全員庇護', kind: 'special', target: 'self', mp: 6, cover: true, selfBuff: { def: 0.3, turns: 1 }, desc: 'このターン仲間への攻撃を引き受け、自分の防御力を上げる', anim: 'buff', school: 'skill' });
  S('discipline_wall', { name: '規律の防壁', kind: 'buff', target: 'allies', mp: 10, buff: { guard: 0.2 }, turns: 3, desc: '味方全体の受けるダメージを3ターン20%減らす', anim: 'buff', school: 'skill' });
  S('collapse_guard', { name: '崩壊阻止', kind: 'buff', target: 'self', mp: 6, buff: { endure: 1 }, turns: 3, desc: '3ターンのあいだ、倒れるダメージを1度だけHP1で耐える', anim: 'buff', school: 'skill' });
  // 商人・投資系
  S('ev_appraise', { name: '期待値鑑定', kind: 'special', target: 'enemy', mp: 3, scan: true, expose: true, desc: '敵の弱点と行動を見抜き、3ターン防御を崩す', anim: 'buff', school: 'skill' });
  S('fund_allocation', { name: '資金配分', kind: 'buff', target: 'allies', mp: 6, buff: { def: 0.15, mdef: 0.15 }, turns: 3, desc: '味方全体の防御と魔法防御を3ターン15%上げる', anim: 'buff', school: 'skill' });
  S('diversify_formation', { name: 'リスク分散陣', kind: 'buff', target: 'allies', mp: 9, buff: { def: 0.25, guard: 0.1 }, turns: 3, desc: '味方全体の防御力+25%、受けるダメージ-10%（3ターン）', anim: 'buff', school: 'skill' });
  S('profit_lock', { name: '損益確定', kind: 'attack', target: 'enemy', mp: 6, power: 1.2, execute: { below: 0.5, mult: 2.0 }, desc: 'HPが半分以下の敵には2倍のダメージ', anim: 'hit', school: 'skill' });
  // 波形剣士系
  S('pullback_flash', { name: '押し目一閃', kind: 'attack', target: 'enemy', mp: 8, power: 2.3, desc: '押し目で放つ強力な一閃', anim: 'slash', school: 'skill' });
  S('retrace_blade', { name: '戻り売りの刃', kind: 'attack', target: 'enemy', mp: 6, power: 1.2, element: 'wind', targetDebuff: { def: -0.3, turns: 2 }, desc: '風の刃で斬り、敵の防御を2ターン30%下げる', anim: 'wind', school: 'skill' });
  S('macd_cross', { name: 'MACD交差剣', kind: 'attack', target: 'enemy', mp: 9, power: 0.95, hits: 2, element: 'light', desc: '2本の線が交わる、光の2連撃', anim: 'light', school: 'skill' });
  S('triple_wave_finale', { name: '三波動終撃', kind: 'attack', target: 'enemy', mp: 22, power: 3.3, desc: '三つの波を一撃にまとめる奥義（高MP消費）', anim: 'slash', school: 'skill' });
  // 機巧師・工匠系
  S('gear_crush', { name: '歯車破砕', kind: 'attack', target: 'enemy', mp: 6, power: 1.5, familyBonus: { families: ['機械系', 'ゴーレム系'], mult: 1.8 }, desc: '機械・ゴーレムに1.8倍', anim: 'hit', school: 'skill' });
  S('armor_analysis', { name: '装甲解析', kind: 'debuff', target: 'enemy', mp: 5, buff: { def: -0.35 }, turns: 3, desc: '敵1体の防御力を3ターン35%下げる', anim: 'dark', school: 'skill' });
  S('mana_circuit', { name: '魔力回路接続', kind: 'buff', target: 'ally', mp: 5, buff: { mag: 0.35 }, turns: 3, desc: '味方1人の魔力を3ターン35%上げる', anim: 'buff', school: 'skill' });
  S('star_clock_reboot', { name: '星時計再起動', kind: 'special', target: 'allies', mp: 16, cleanse: true, buffAll: { agi: 0.25 }, turns: 3, desc: '味方全体の状態異常と能力低下を消し、素早さを3ターン25%上げる', anim: 'light', school: 'skill' });

  /* ---------- 職業ごとの習得レベル（新しいもの） ---------- */
  var LEARN = {
    priest: [[1, 'drop_heal'], [8, 'calm_light'], [13, 'torrent_heal'], [16, 'unyielding_prayer'], [18, 'purify_ring'], [21, 'gentle_rain'], [25, 'life_lamp'], [26, 'loss_limit_ward'], [40, 'soul_return'], [43, 'great_rain']],   // Phase E：慈雨 22→21・生命の灯 24→25
    sage: [[6, 'insight_flash'], [10, 'focus_blessing'], [15, 'torrent_heal'], [18, 'mana_cycle'], [20, 'purify_ring'], [23, 'gentle_rain'], [26, 'stardust_rain'], [32, 'thunder_array'], [34, 'pale_flame'], [44, 'soul_return'], [46, 'great_rain'], [48, 'celestial_impact']],
    mage: [[5, 'insight_flash'], [12, 'flame_lance'], [13, 'slow_mist'], [16, 'freezing_rain'], [20, 'thunder_array'], [23, 'gale_fault'], [28, 'imaginary_bolt'], [32, 'pale_flame'], [45, 'celestial_impact']],
    spirit_warden: [[3, 'drop_heal'], [14, 'torrent_heal'], [16, 'mana_cycle'], [24, 'life_lamp'], [30, 'rebirth_prayer']],   // Phase E：生命の灯 22→24
    chronomancer: [[3, 'insight_flash'], [7, 'future_shield'], [8, 'slow_mist'], [12, 'focus_blessing'], [22, 'stardust_rain'], [32, 'rebirth_prayer']],   // Phase E：再生の祈り 30→32
    master: [[3, 'drop_heal'], [6, 'future_shield'], [8, 'calm_light'], [16, 'purify_ring'], [18, 'loss_limit_ward'], [20, 'mana_cycle']],
    auditor: [[10, 'focus_blessing'], [24, 'imaginary_bolt']],
    navigator: [[16, 'gale_fault']],
    warrior: [[8, 'resistance_crush'], [14, 'pierce_slash'], [20, 'trend_breakthrough'], [24, 'rising_triple']],
    magicknight: [[10, 'resistance_crush'], [18, 'pierce_slash']],
    monk: [[5, 'rebound_palm'], [9, 'pivot_kick'], [13, 'instant_reversal'], [20, 'wave_combo']],
    thief: [[3, 'escape_route'], [6, 'fakeout_read'], [11, 'spread_tear'], [19, 'stop_ambush']],
    hunter: [[8, 'range_snipe'], [10, 'htf_aim'], [12, 'lowcut_arrow'], [24, 'meteor_arrows']],
    surveyor: [[11, 'htf_aim'], [17, 'lowcut_arrow']],
    knight: [[5, 'evidence_shield'], [12, 'all_cover'], [18, 'discipline_wall'], [22, 'collapse_guard']],
    oath_knight: [[8, 'evidence_shield'], [18, 'discipline_wall'], [28, 'collapse_guard']],
    merchant: [[4, 'ev_appraise'], [13, 'fund_allocation'], [15, 'profit_lock'], [18, 'diversify_formation']],
    waveblade: [[14, 'retrace_blade'], [18, 'macd_cross'], [20, 'pullback_flash'], [30, 'triple_wave_finale']],
    mechanist: [[8, 'gear_crush'], [10, 'armor_analysis'], [14, 'mana_circuit'], [28, 'star_clock_reboot']],
    artisan: [[8, 'gear_crush'], [18, 'mana_circuit'], [30, 'star_clock_reboot']]
  };
  Object.keys(LEARN).forEach(function (j) { if (!JOBS[j]) return; LEARN[j].forEach(function (r) { if (!SKILLS[r[1]]) throw new Error('skills64: 未定義の特技 ' + r[1]); if (!JOBS[j].skills.some(function (s) { return s.id === r[1]; })) JOBS[j].skills.push({ lv: r[0], id: r[1], v64: true }); }); JOBS[j].skills.sort(function (a, b) { return a.lv - b.lv; }); });
  root.SKILLS64 = { NEW: NEW, LEARN: LEARN };
})(typeof window !== 'undefined' ? window : globalThis);
