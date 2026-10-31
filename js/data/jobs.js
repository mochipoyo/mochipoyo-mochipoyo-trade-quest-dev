/* =========================================================
   Data / Jobs : 職業（12種）
   stats: Lv1の基礎値 / growth: 1レベルあたりの成長
   weapons / armors: 装備できる種類
   skills: 習得レベルとスキルID
   ========================================================= */
(function (root) {
  'use strict';

  var JOBS = {
    warrior: { name: '戦士', sprite: 'hero_warrior', desc: '高いHPと攻撃力で前線を支える。物理特技が得意。', role: '物理アタッカー',
      stats: { hp: 34, mp: 4, atk: 9, def: 8, agi: 5, mag: 2 }, growth: { hp: 7.5, mp: 0.8, atk: 2.4, def: 2.0, agi: 1.0, mag: 0.4 },
      weapons: ['sword', 'axe', 'spear'], armors: ['heavy', 'light', 'shield', 'helm', 'acc'],
      skills: [{ lv: 3, id: 'double_slash' }, { lv: 7, id: 'full_slash' }, { lv: 12, id: 'spin_slash' }, { lv: 18, id: 'war_cry' }], trait: '被ダメージを5%軽減' },
    mage: { name: '魔法使い', sprite: 'hero_mage', desc: '強力な攻撃魔法を操る。HPは低い。', role: '魔法アタッカー',
      stats: { hp: 24, mp: 16, atk: 3, def: 4, agi: 6, mag: 10 }, growth: { hp: 4.0, mp: 3.2, atk: 0.8, def: 0.9, agi: 1.3, mag: 2.6 },
      weapons: ['staff', 'dagger'], armors: ['robe', 'hat', 'acc'],
      skills: [{ lv: 1, id: 'fireball' }, { lv: 4, id: 'ice' }, { lv: 7, id: 'thunder' }, { lv: 10, id: 'sleep' }, { lv: 14, id: 'firestorm' }, { lv: 18, id: 'blizzard' }], trait: '魔法ダメージ+10%' },
    priest: { name: '僧侶', sprite: 'hero_priest', desc: '回復と補助で仲間を守る。', role: '回復・補助',
      stats: { hp: 24, mp: 14, atk: 4, def: 5, agi: 5, mag: 8 }, growth: { hp: 5.0, mp: 2.8, atk: 1.0, def: 1.4, agi: 1.0, mag: 2.0 },
      weapons: ['staff', 'club'], armors: ['robe', 'light', 'hat', 'shield', 'acc'],
      skills: [{ lv: 1, id: 'heal' }, { lv: 3, id: 'cure_poison' }, { lv: 6, id: 'protect' }, { lv: 9, id: 'holy_light' }, { lv: 12, id: 'heal_all' }, { lv: 16, id: 'revive' }], trait: '回復量+15%' },
    monk: { name: '武闘家', sprite: 'hero_monk', desc: '素早く手数が多い。会心が出やすい。', role: '高速アタッカー',
      stats: { hp: 28, mp: 6, atk: 8, def: 5, agi: 10, mag: 3 }, growth: { hp: 6.0, mp: 1.0, atk: 2.2, def: 1.3, agi: 2.4, mag: 0.6 },
      weapons: ['claw', 'club'], armors: ['light', 'hat', 'acc'],
      skills: [{ lv: 2, id: 'rush' }, { lv: 6, id: 'vital_strike' }, { lv: 11, id: 'focus' }, { lv: 16, id: 'hundred_fists' }], trait: '会心率2倍' },
    thief: { name: '盗賊', sprite: 'hero_thief', desc: '素早さと探索に優れる。宝箱から追加アイテムを見つけることがある。', role: '速攻・探索',
      stats: { hp: 26, mp: 6, atk: 7, def: 4, agi: 11, mag: 4 }, growth: { hp: 5.5, mp: 1.0, atk: 1.9, def: 1.1, agi: 2.6, mag: 0.8 },
      weapons: ['dagger', 'sword', 'bow'], armors: ['light', 'hat', 'acc'],
      skills: [{ lv: 2, id: 'steal_strike' }, { lv: 5, id: 'smoke' }, { lv: 9, id: 'poison_edge' }, { lv: 14, id: 'shadow_step' }], trait: '宝箱で追加アイテム／逃走成功率アップ' },
    merchant: { name: '商人', sprite: 'hero_merchant', desc: '戦闘後のゴールドが増える。買い物が少し安くなる。', role: '支援・経済',
      stats: { hp: 27, mp: 8, atk: 6, def: 6, agi: 6, mag: 5 }, growth: { hp: 5.8, mp: 1.4, atk: 1.6, def: 1.6, agi: 1.2, mag: 1.0 },
      weapons: ['club', 'dagger', 'axe'], armors: ['light', 'shield', 'hat', 'acc'],
      skills: [{ lv: 2, id: 'coin_toss' }, { lv: 6, id: 'appraise' }, { lv: 10, id: 'gold_rush' }], trait: '獲得ゴールド+25%／店の価格-10%' },
    hunter: { name: '狩人', sprite: 'hero_hunter', desc: '弓で遠くから敵を射抜く。全体攻撃が得意。', role: '範囲アタッカー',
      stats: { hp: 27, mp: 8, atk: 8, def: 5, agi: 9, mag: 4 }, growth: { hp: 5.8, mp: 1.3, atk: 2.1, def: 1.3, agi: 2.0, mag: 0.8 },
      weapons: ['bow', 'dagger', 'spear'], armors: ['light', 'hat', 'acc'],
      skills: [{ lv: 2, id: 'rain_arrow' }, { lv: 6, id: 'snipe' }, { lv: 11, id: 'paralyze_shot' }, { lv: 15, id: 'storm_arrow' }], trait: '先制攻撃が出やすい' },
    knight: { name: '騎士', sprite: 'hero_knight', desc: '鉄壁の守り手。仲間をかばう。', role: '盾役',
      stats: { hp: 36, mp: 6, atk: 8, def: 11, agi: 4, mag: 3 }, growth: { hp: 8.0, mp: 1.0, atk: 2.0, def: 2.6, agi: 0.8, mag: 0.5 },
      weapons: ['sword', 'spear'], armors: ['heavy', 'light', 'shield', 'helm', 'acc'],
      skills: [{ lv: 3, id: 'shield_bash' }, { lv: 6, id: 'cover' }, { lv: 10, id: 'iron_wall' }, { lv: 15, id: 'holy_blade' }], trait: '仲間を自動でかばうことがある' },
    sage: { name: '賢者', sprite: 'hero_sage', desc: '攻撃魔法と回復魔法の両方を扱う。転職で開放。', role: '万能魔法',
      stats: { hp: 24, mp: 18, atk: 4, def: 5, agi: 6, mag: 11 }, growth: { hp: 5.0, mp: 3.4, atk: 1.0, def: 1.2, agi: 1.2, mag: 2.8 }, unlock: { level: 15, jobsAny: ['mage', 'priest'] },
      weapons: ['staff', 'club'], armors: ['robe', 'light', 'hat', 'acc'],
      skills: [{ lv: 1, id: 'fireball' }, { lv: 1, id: 'heal' }, { lv: 5, id: 'thunder' }, { lv: 8, id: 'heal_all' }, { lv: 12, id: 'firestorm' }, { lv: 16, id: 'revive' }, { lv: 20, id: 'meteor' }], trait: 'MP消費-20%' },
    magicknight: { name: '魔法戦士', sprite: 'hero_magicknight', desc: '剣に魔法をまとわせる。転職で開放。', role: '属性物理',
      stats: { hp: 30, mp: 12, atk: 8, def: 7, agi: 7, mag: 7 }, growth: { hp: 6.5, mp: 2.0, atk: 2.1, def: 1.7, agi: 1.5, mag: 1.8 }, unlock: { level: 15, jobsAny: ['warrior', 'mage', 'knight'] },
      weapons: ['sword', 'spear', 'staff'], armors: ['light', 'heavy', 'shield', 'helm', 'acc'],
      skills: [{ lv: 1, id: 'flame_blade' }, { lv: 5, id: 'ice_blade' }, { lv: 9, id: 'thunder_blade' }, { lv: 14, id: 'magic_barrier' }], trait: '属性攻撃+15%' },
    waveblade: { name: '波形剣士', sprite: 'hero_waveblade', desc: '相場の波を読み、トレンドに乗る剣士。転職で開放。', role: '波形アタッカー',
      stats: { hp: 32, mp: 10, atk: 9, def: 7, agi: 8, mag: 6 }, growth: { hp: 7.0, mp: 1.8, atk: 2.4, def: 1.7, agi: 1.8, mag: 1.4 }, unlock: { level: 12, flag: 'learned_dow' },
      weapons: ['sword', 'dagger', 'spear'], armors: ['light', 'heavy', 'shield', 'helm', 'acc'],
      skills: [{ lv: 1, id: 'dow_blade' }, { lv: 4, id: 'ema_slash' }, { lv: 8, id: 'wave_slash' }, { lv: 12, id: 'rci_reversal' }, { lv: 16, id: 'hidden_burst' }], trait: '防御中の反撃' },
    master: { name: '相場の導師', sprite: 'hero_master', desc: '規律と忍耐で仲間を守る。転職で開放。', role: '補助・結界',
      stats: { hp: 28, mp: 16, atk: 5, def: 8, agi: 6, mag: 10 }, growth: { hp: 6.0, mp: 3.0, atk: 1.2, def: 2.0, agi: 1.3, mag: 2.4 }, unlock: { level: 12, flag: 'learned_risk' },
      weapons: ['staff', 'club'], armors: ['robe', 'light', 'hat', 'shield', 'acc'],
      skills: [{ lv: 1, id: 'stoploss_shield' }, { lv: 4, id: 'higher_tf_eye' }, { lv: 8, id: 'patience_stance' }, { lv: 12, id: 'risk_barrier' }, { lv: 16, id: 'macd_strike' }], trait: '状態異常耐性' }
  };

  // v5.1 新職業（第6〜7章で解放）。sprite は既存の歩行スプライトを流用
  JOBS.auditor = { name: '監査官', sprite: 'scholar', desc: '帳簿と契約を見抜く専門家。敵の弱点と強化を暴く。', role: '支援・魔法',
    stats: { hp: 25, mp: 14, atk: 4, def: 5, agi: 7, mag: 9 }, growth: { hp: 5.0, mp: 2.6, atk: 1.1, def: 1.4, agi: 1.5, mag: 2.2 },
    weapons: ['staff', 'dagger', 'club'], armors: ['robe', 'light', 'hat', 'acc'],
    skills: [{ lv: 1, id: 'audit_eye' }, { lv: 5, id: 'ledger_bolt' }, { lv: 9, id: 'contract_break' }, { lv: 14, id: 'weaken' }], trait: '宝箱のゴールド+20%／敵の弱点を見抜きやすい', unlock: { level: 10, flag: 'elna_joined' } };
  JOBS.oath_knight = { name: '誓約騎士', sprite: 'hero_knight', desc: '仲間を守る誓いを立てた騎士。かばって反撃し、全員の守りを固める。', role: '守りの盾役',
    stats: { hp: 38, mp: 8, atk: 8, def: 12, agi: 4, mag: 4 }, growth: { hp: 8.5, mp: 1.2, atk: 2.0, def: 2.8, agi: 0.8, mag: 0.7 },
    weapons: ['sword', 'spear', 'club'], armors: ['heavy', 'light', 'shield', 'helm', 'acc'],
    skills: [{ lv: 1, id: 'oath_guard' }, { lv: 6, id: 'shield_bash' }, { lv: 10, id: 'oath_wall' }, { lv: 15, id: 'judgment_blade' }], trait: 'かばった時の被ダメージ-20%', unlock: { level: 10, flag: 'ord_joined' } };
  // v5.2 新職業（第8章で解放）
  JOBS.navigator = { name: '航海士', sprite: 'sailor', desc: '海流を読み、嵐を越える船乗り。航海中のエンカウントが減る。', role: '素早い支援・水属性',
    stats: { hp: 30, mp: 10, atk: 7, def: 6, agi: 10, mag: 6 }, growth: { hp: 6.2, mp: 1.8, atk: 1.7, def: 1.5, agi: 2.4, mag: 1.3 },
    weapons: ['dagger', 'bow', 'sword'], armors: ['light', 'hat', 'acc'],
    skills: [{ lv: 1, id: 'chart_sense' }, { lv: 4, id: 'storm_helm' }, { lv: 8, id: 'tide_slash' }, { lv: 13, id: 'haste' }], trait: '海流読み：航海中のエンカウント率半減・海流を避けやすい（パッシブ）', unlock: { level: 10, flag: 'nagi_joined' } };
  JOBS.surveyor = { name: '測量士', sprite: 'hero_hunter', desc: '地形と距離を測る探索の専門家。ダンジョンの宝箱の位置が見える。', role: '探索・遠距離攻撃',
    stats: { hp: 30, mp: 9, atk: 8, def: 6, agi: 9, mag: 5 }, growth: { hp: 6.4, mp: 1.5, atk: 2.0, def: 1.5, agi: 2.2, mag: 1.0 },
    weapons: ['bow', 'dagger'], armors: ['light', 'hat', 'acc'],
    skills: [{ lv: 1, id: 'terrain_read' }, { lv: 5, id: 'range_shot' }, { lv: 9, id: 'survey_volley' }, { lv: 14, id: 'paralyze_shot' }], trait: '測量：ダンジョンの宝箱の位置がミニマップに見える（パッシブ）', unlock: { level: 10, flag: 'iris_joined' } };
  // v5.3 新職業（第10・12章で解放）
  JOBS.chronomancer = { name: '時詠み師', sprite: 'hero_priest', desc: '未来の可能性を読む神殿の魔法使い。行動順と補助に長ける。', role: '補助魔法・行動順',
    stats: { hp: 24, mp: 16, atk: 4, def: 5, agi: 8, mag: 10 }, growth: { hp: 4.8, mp: 2.9, atk: 1.0, def: 1.3, agi: 1.8, mag: 2.4 },
    weapons: ['staff'], armors: ['robe', 'hat', 'acc'],
    skills: [{ lv: 1, id: 'foresight' }, { lv: 5, id: 'time_blessing' }, { lv: 10, id: 'delay' }, { lv: 16, id: 'chrono_burst' }], trait: '未来視：味方の行動順を操る', unlock: { level: 10, flag: 'sophia_joined' } };
  JOBS.mechanist = { name: '機巧師', sprite: 'hero_hunter', desc: '機械を扱う技師。解析と機巧弾で戦う。', role: '遠距離・解析',
    stats: { hp: 30, mp: 11, atk: 8, def: 7, agi: 7, mag: 8 }, growth: { hp: 6.0, mp: 2.0, atk: 1.9, def: 1.6, agi: 1.5, mag: 1.8 },
    weapons: ['bow', 'staff', 'dagger'], armors: ['light', 'hat', 'acc'],
    skills: [{ lv: 1, id: 'gear_shot' }, { lv: 5, id: 'analyze' }, { lv: 12, id: 'overdrive' }, { lv: 16, id: 'thunder' }], trait: '解析：機械系の敵の弱点を見抜きやすい', unlock: { level: 10, flag: 'io_joined' } };
  // v5.5 新職業（ガネス加入で解放）
  JOBS.artisan = { name: '工匠', sprite: 'hero_warrior', desc: '装備を直し、機械を扱う職人。前衛で味方の装備を整える。', role: '前衛・支援',
    stats: { hp: 36, mp: 8, atk: 9, def: 11, agi: 5, mag: 4 }, growth: { hp: 8.0, mp: 1.2, atk: 2.3, def: 2.5, agi: 1.0, mag: 0.8 },
    weapons: ['axe', 'club', 'spear'], armors: ['heavy', 'light', 'helm', 'shield', 'acc'],
    skills: [{ lv: 1, id: 'quick_repair' }, { lv: 5, id: 'iron_hammer' }, { lv: 10, id: 'weapon_tune' }, { lv: 15, id: 'overhaul' }], trait: '鉄槌：機械・ゴーレム系に特効', unlock: { level: 10, flag: 'ganes_joined' } };
  // v5.6 新職業（アステル加入で解放）
  JOBS.spirit_warden = { name: '精霊守', sprite: 'hero_sage', desc: '精霊の名を呼び、自然の力で仲間を守る。属性の守りと回復に長ける。', role: '補助・回復',
    stats: { hp: 27, mp: 15, atk: 5, def: 7, agi: 6, mag: 10 }, growth: { hp: 5.6, mp: 2.7, atk: 1.2, def: 1.7, agi: 1.4, mag: 2.3 },
    weapons: ['staff', 'spear'], armors: ['robe', 'shield', 'hat', 'acc'],
    skills: [{ lv: 1, id: 'spirit_shield' }, { lv: 5, id: 'healing_wind' }, { lv: 10, id: 'harmony' }, { lv: 15, id: 'spirit_ward' }, { lv: 20, id: 'aurora' }, { lv: 25, id: 'spirit_rebirth' }], trait: '精霊の加護：敵の氷・炎・雷の魔法のダメージ−15%', unlock: { level: 10, flag: 'aster_joined' } };
  // v5.6 新職業の高位スキル（Lv20・Lv25）
  [['auditor', 'full_audit', 'final_ledger'], ['oath_knight', 'oath_bastion', 'oath_judgment'], ['navigator', 'maelstrom', 'fair_wind'], ['surveyor', 'pinpoint', 'triangulate'],
   ['chronomancer', 'time_rewind', 'time_stop'], ['mechanist', 'gear_barrage', 'overclock'], ['artisan', 'masterwork', 'field_forge']].forEach(function (r) { JOBS[r[0]].skills.push({ lv: 20, id: r[1] }, { lv: 25, id: r[2] }); });
  var JOB_LIST = Object.keys(JOBS);
  var STARTER_JOBS = ['warrior', 'mage', 'priest', 'monk', 'thief', 'merchant', 'hunter', 'knight'];

  // v5.8 冒険の初めに村長からもらう武器（職業に合うもの。もらった時点で装備する）
  var STARTER_WEAPON = { warrior: 'wooden_sword', knight: 'wooden_sword', thief: 'dagger', mage: 'oak_staff', priest: 'oak_staff', monk: 'leather_claw', merchant: 'club', hunter: 'short_bow' };

  root.JOBS = JOBS; root.JOB_LIST = JOB_LIST; root.STARTER_JOBS = STARTER_JOBS; root.STARTER_WEAPON = STARTER_WEAPON;
  if (typeof module !== 'undefined' && module.exports) module.exports = JOBS;
})(typeof window !== 'undefined' ? window : globalThis);
