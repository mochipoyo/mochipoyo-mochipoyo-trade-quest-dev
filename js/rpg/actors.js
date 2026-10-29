/* =========================================================
   RPG / Actors : キャラクター（主人公・仲間）のステータス・成長・装備
   ========================================================= */
(function (root) {
  'use strict';

  var JOBS = root.JOBS, SKILLS = root.SKILLS, ITEMS = root.ITEMS;

  var Actors = {};

  Actors.expForLevel = function (lv) { return Math.round(12 * Math.pow(lv, 2.1) + 8 * lv); }; // 累積ではなく「次のレベルまで」
  Actors.baseStat = function (job, stat, level) { var j = JOBS[job]; return Math.round(j.stats[stat] + j.growth[stat] * (level - 1)); };

  // 新しいアクターを作る
  Actors.create = function (id, name, job, level, sprite) {
    var a = { id: id, name: name, job: job, level: level || 1, exp: 0, sprite: sprite || JOBS[job].sprite,
      equip: { weapon: null, armor: null, shield: null, head: null, acc: null }, skills: [], status: {}, buffs: {}, hp: 1, mp: 1, dead: false,
      jobLevels: {} };
    a.jobLevels[job] = a.level;
    Actors.refreshSkills(a);
    var s = Actors.stats(a); a.hp = s.maxHp; a.mp = s.maxMp;
    return a;
  };

  // 職業と現在レベルに応じて習得済みスキルを更新（転職後も以前の職の習得済みスキルは保持）
  Actors.refreshSkills = function (a) {
    var j = JOBS[a.job];
    j.skills.forEach(function (s) { if (a.level >= s.lv && a.skills.indexOf(s.id) < 0) a.skills.push(s.id); });
  };

  // 装備込みの最終ステータス
  Actors.stats = function (a) {
    var lv = a.level, job = a.job;
    var s = { maxHp: Actors.baseStat(job, 'hp', lv), maxMp: Actors.baseStat(job, 'mp', lv), atk: Actors.baseStat(job, 'atk', lv), def: Actors.baseStat(job, 'def', lv), agi: Actors.baseStat(job, 'agi', lv), mag: Actors.baseStat(job, 'mag', lv), mdef: 0, immune: [], element: 'none' };
    // 他職で上げたレベルの一部を引き継ぐ（転職の引き継ぎ：HP/MPの10%）
    var bonusHp = 0, bonusMp = 0;
    Object.keys(a.jobLevels || {}).forEach(function (j) { if (j !== job && JOBS[j]) { bonusHp += JOBS[j].growth.hp * (a.jobLevels[j] - 1) * 0.1; bonusMp += JOBS[j].growth.mp * (a.jobLevels[j] - 1) * 0.1; } });
    s.maxHp += Math.round(bonusHp); s.maxMp += Math.round(bonusMp);
    Object.keys(a.equip).forEach(function (slot) {
      var it = a.equip[slot] ? ITEMS[a.equip[slot]] : null; if (!it) return;
      if (it.atk) s.atk += it.atk; if (it.def) s.def += it.def; if (it.agi) s.agi += it.agi; if (it.mag) s.mag += it.mag; if (it.mdef) s.mdef += it.mdef;
      if (it.hp) s.maxHp += it.hp; if (it.mp) s.maxMp += it.mp; if (it.immune) s.immune = s.immune.concat(it.immune);
      if (it.cat === 'weapon' && it.element) s.element = it.element;
    });
    s.mdef += Math.round(s.mag * 0.3);
    // 相場の導師の状態異常耐性は戦闘側で確率処理する
    // バフ（戦闘中のみ）
    Object.keys(a.buffs || {}).forEach(function (k) { var b = a.buffs[k]; if (!b || b.turns <= 0) return; if (s[k] !== undefined) s[k] = Math.round(s[k] * (1 + b.value)); });
    s.atk = Math.max(1, s.atk); s.def = Math.max(0, s.def); s.agi = Math.max(1, s.agi);
    return s;
  };

  Actors.canEquip = function (a, itemId) {
    var it = ITEMS[itemId]; if (!it) return false; var j = JOBS[a.job];
    if (it.cat === 'weapon') return j.weapons.indexOf(it.type) >= 0;
    if (it.cat === 'armor') return j.armors.indexOf(it.type) >= 0;
    return false;
  };
  Actors.slotOf = function (itemId) {
    var it = ITEMS[itemId]; if (!it) return null;
    if (it.cat === 'weapon') return 'weapon';
    if (it.type === 'heavy' || it.type === 'light' || it.type === 'robe') return 'armor';
    if (it.type === 'shield') return 'shield';
    if (it.type === 'helm' || it.type === 'hat') return 'head';
    if (it.type === 'acc') return 'acc';
    return null;
  };

  // 経験値を加算し、レベルアップ情報を返す
  Actors.gainExp = function (a, exp) {
    a.exp += exp; var ups = [];
    while (a.exp >= Actors.expForLevel(a.level)) {
      a.exp -= Actors.expForLevel(a.level); a.level += 1; a.jobLevels[a.job] = a.level;
      var before = a.skills.length; Actors.refreshSkills(a);
      ups.push({ level: a.level, newSkills: a.skills.slice(before) });
      var s = Actors.stats(a); a.hp = Math.min(s.maxHp, a.hp + Math.round(s.maxHp * 0.3)); a.mp = Math.min(s.maxMp, a.mp + Math.round(s.maxMp * 0.3));
    }
    return ups;
  };

  Actors.fullHeal = function (a) { var s = Actors.stats(a); a.hp = s.maxHp; a.mp = s.maxMp; a.dead = false; a.status = {}; a.buffs = {}; };
  Actors.clearBattleState = function (a) { a.buffs = {}; if (a.status.sleep) delete a.status.sleep; if (a.status.confuse) delete a.status.confuse; a.cover = false; a.counter = false; };

  // 転職（レベル1から。以前の職レベルは jobLevels に残る）
  Actors.changeJob = function (a, job) {
    a.jobLevels[a.job] = a.level;
    a.job = job; a.sprite = JOBS[job].sprite;
    a.level = a.jobLevels[job] || 1; a.exp = 0;
    // 装備できないものは外す
    Object.keys(a.equip).forEach(function (slot) { if (a.equip[slot] && !Actors.canEquip(a, a.equip[slot])) { var id = a.equip[slot]; a.equip[slot] = null; a._unequipped = (a._unequipped || []).concat([id]); } });
    Actors.refreshSkills(a);
    var s = Actors.stats(a); a.hp = Math.min(a.hp, s.maxHp); a.mp = Math.min(a.mp, s.maxMp);
  };
  Actors.jobUnlocked = function (a, job, flags) {
    var j = JOBS[job]; if (!j.unlock) return true;
    if (j.unlock.flag && !flags[j.unlock.flag]) return false;
    var maxLv = 0; Object.keys(a.jobLevels).forEach(function (k) { if (!j.unlock.jobsAny || j.unlock.jobsAny.indexOf(k) >= 0) maxLv = Math.max(maxLv, a.jobLevels[k]); });
    if (j.unlock.jobsAny) return maxLv >= j.unlock.level;
    return Math.max(a.level, maxLv) >= j.unlock.level;
  };

  root.Actors = Actors;
})(typeof window !== 'undefined' ? window : globalThis);
