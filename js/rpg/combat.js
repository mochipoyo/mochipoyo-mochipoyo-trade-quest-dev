/* =========================================================
   RPG / Combat : ターン制パーティーバトルのロジック（DOMに依存しない）
   runTurn() は演出用のイベント配列を返し、UIが順番に再生する。
   ========================================================= */
(function (root) {
  'use strict';

  var ENEMIES = root.ENEMIES, SKILLS = root.SKILLS, ITEMS = root.ITEMS, Actors = root.Actors, SPECIALS = root.ENEMY_SPECIALS, JOBS = root.JOBS;

  var Combat = {};
  var STATUS_NAME = { poison: '毒', sleep: '眠り', paralyze: '麻痺', confuse: '混乱', silence: '沈黙' };
  var MAX_ENEMIES = 5;
  Combat.STATUS_NAME = STATUS_NAME;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function makeEnemy(id, i) {
    var def = ENEMIES[id]; var e = clone(def); e.defId = id; e.idx = i; e.maxHp = def.hp; e.hp = def.hp; e.maxMp = def.mp || 0; e.mp = def.mp || 0; e.buffs = {}; e.status = {}; e.dead = false; e.exposed = 0; e.phase = 0;
    return e;
  }
  Combat.makeEnemy = makeEnemy;
  Combat.create = function (enemyIds, party, opts) {
    opts = opts || {};
    var enemies = enemyIds.map(function (id, i) {
      var e = makeEnemy(id, i);
      // 同名の敵にA/Bをつける
      var same = enemyIds.filter(function (x) { return x === id; }).length; if (same > 1) { var n = enemyIds.slice(0, i).filter(function (x) { return x === id; }).length; e.name += String.fromCharCode(65 + n); }
      return e;
    });
    party.forEach(function (a) { a.buffs = {}; a.cover = false; a.counter = false; a.defending = false; a._gutsUsed = false; a._atkTurn = -9; a._defTurn = -9; a._supTurn = -9; });
    return { enemies: enemies, party: party, turn: 0, state: 'command', boss: !!opts.boss, canEscape: opts.canEscape !== false && !opts.boss, log: [], trialCount: 0, result: null };
  };

  /* ---------- 計算 ---------- */
  function estats(e) { // 敵の装備込み相当（バフ反映）
    var s = { atk: e.atk, def: e.def, agi: e.agi, mag: e.mag || 0, mdef: Math.round((e.mag || 0) * 0.3) + Math.round(e.def * 0.3) };
    Object.keys(e.buffs).forEach(function (k) { var b = e.buffs[k]; if (b && b.turns > 0 && s[k] !== undefined) s[k] = Math.round(s[k] * (1 + b.value)); });
    if (e.exposed > 0) s.def = Math.round(s.def * 0.5);
    return s;
  }
  // v5.5 トレード装備の効果（items.js の fx）。味方のみ。複数あれば最後に見つかった値
  function fx(a, key) { var v; if (!a || !a.equip) return v; Object.keys(a.equip).forEach(function (sl) { var it = a.equip[sl] && ITEMS[a.equip[sl]]; if (it && it.fx && it.fx[key] !== undefined) v = it.fx[key]; }); return v; }
  Combat.fx = fx;
  function pstats(a) { var s = Actors.stats(a); if (a.defending) { s.def = Math.round(s.def * 2); s.mdef = Math.round(s.mdef * 1.5); } var lh = fx(a, 'lowHpDef'); if (lh && a.hp <= s.maxHp * lh.below) s.def = Math.round(s.def * (1 + lh.mult)); return s; }
  // v5.5 味方が受けるダメージの最終調整：大きな一撃の軽減（資金管理の鎧）、防御中の追加軽減（見送りの首飾り）、くいしばり（損切りのお守り）
  function partyTakes(b, t, dmg, ev) {
    var st = Actors.stats(t);
    var bh = fx(t, 'bigHitCut'); if (bh && dmg > st.maxHp * bh.over) { dmg = Math.round(dmg * (1 - bh.cut)); ev.push({ type: 'msg', text: t.name + 'の資金管理の鎧が大きな損失を抑えた' }); }
    var dc = fx(t, 'defendCut'); if (dc && t.defending) dmg = Math.round(dmg * (1 - dc));
    if (dmg > 0 && b) b.partyDamaged = true;
    var g = fx(t, 'guts'); if (g && t.hp - dmg <= 0 && t.hp > 1 && !t._gutsUsed && Math.random() < g) { t._gutsUsed = true; ev.push({ type: 'msg', text: t.name + 'は損切りのお守りで踏みとどまった！' }); return t.hp - 1; }
    return dmg;
  }
  function cureBonus(t, ev) { var cb = fx(t, 'cureAtk'); if (cb && !t.dead) { t.buffs.atk = { value: cb.atk, turns: cb.turns }; ev.push({ type: 'msg', text: t.name + 'は反転の腕輪で攻撃力が上がった' }); } }
  function resistOf(e, element) { if (!element || element === 'none') return (e.resist && e.resist.none !== undefined) ? e.resist.none : 1; var r = e.resist ? e.resist[element] : undefined; return r === undefined ? 1 : r; }

  function physDamage(atk, def, power, opts) {
    opts = opts || {};
    var effDef = def * (1 - (opts.pierce || 0));
    var base = atk * power - effDef * 0.5;
    var v = base * rnd(0.88, 1.12);
    if (opts.crit) v = atk * power * 1.5;
    v *= (opts.mult || 1);
    return Math.max(1, Math.round(v));
  }
  function magDamage(mag, mdef, power, mult) { var base = power + mag * 1.2 - mdef * 0.5; return Math.max(1, Math.round(base * rnd(0.9, 1.1) * (mult || 1))); }

  /* ---------- 対象選択ヘルパー ---------- */
  function aliveEnemies(b) { return b.enemies.filter(function (e) { return !e.dead; }); }
  function aliveParty(b) { return b.party.filter(function (a) { return !a.dead; }); }
  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function addStatus(target, status, chance, isActor) {
    if (!status) return false;
    var id = status.id;
    if (target.dead) return false;
    if (isActor) { var s = Actors.stats(target); if (s.immune.indexOf(id) >= 0) return false; if (target.job === 'master' && Math.random() < 0.5) return false; }
    else if (target.boss && Math.random() < 0.6) return false;
    if (Math.random() > (chance === undefined ? status.chance : chance)) return false;
    if (target.status[id]) return false;
    target.status[id] = { turns: id === 'poison' ? 99 : (id === 'silence' ? 4 : 3) };
    return true;
  }

  /* ---------- ターン処理 ---------- */
  // commands: [{ actorId, type:'attack'|'skill'|'item'|'defend'|'escape', skillId, itemId, target:{side:'enemy'|'party', idx} }]
  Combat.runTurn = function (b, commands) {
    var ev = []; b.turn += 1;
    function msg(t) { ev.push({ type: 'msg', text: t }); }
    // 行動順
    var acts = [];
    b.party.forEach(function (a) { a.defending = false; a.cover = false; a.counter = false; });
    commands.forEach(function (c) { var a = b.party.filter(function (x) { return x.id === c.actorId; })[0]; if (a && !a.dead) acts.push({ side: 'party', actor: a, cmd: c, agi: Actors.stats(a).agi }); });
    aliveEnemies(b).forEach(function (e) { acts.push({ side: 'enemy', actor: e, agi: estats(e).agi }); });
    acts.forEach(function (x) { x.order = x.agi * rnd(0.8, 1.2); if (x.side === 'party' && (x.cmd.type === 'defend' || x.cmd.type === 'escape' || (x.cmd.type === 'skill' && SKILLS[x.cmd.skillId] && SKILLS[x.cmd.skillId].cover))) x.order += 1000; });
    acts.sort(function (p, q) { return q.order - p.order; });

    // 逃走は最優先で判定
    var escCmd = acts.filter(function (x) { return x.side === 'party' && x.cmd.type === 'escape'; })[0];
    if (escCmd) {
      var pAgi = aliveParty(b).reduce(function (s, a) { return s + Actors.stats(a).agi; }, 0) / aliveParty(b).length;
      var eAgi = aliveEnemies(b).reduce(function (s, e) { return s + estats(e).agi; }, 0) / aliveEnemies(b).length;
      var chance = b.canEscape ? Math.min(0.95, 0.45 + (pAgi - eAgi) * 0.03 + (b.party.some(function (a) { return a.job === 'thief' && !a.dead; }) ? 0.2 : 0)) : 0;
      if (Math.random() < chance) { msg(escCmd.actor.name + 'たちは逃げ出した！'); b.state = 'escaped'; ev.push({ type: 'end', result: 'escaped' }); return ev; }
      msg(escCmd.actor.name + 'たちは逃げ出した！ ……しかし回り込まれてしまった！');
    }

    for (var i = 0; i < acts.length; i++) {
      var x = acts[i]; var a = x.actor;
      if (a.dead) continue;
      if (b.state !== 'command') break;
      if (x.side === 'party' && x.cmd.type === 'escape') continue;
      // 状態異常による行動制限
      if (a.status.sleep) { if (Math.random() < 0.4) { delete a.status.sleep; msg(a.name + 'は目を覚ました！'); } else { msg(a.name + 'は眠っている……'); continue; } }
      if (a.status.paralyze && Math.random() < 0.5) { msg(a.name + 'は体がしびれて動けない！'); continue; }
      if (x.side === 'party') execParty(b, x, ev); else execEnemy(b, a, ev);
      checkEnd(b, ev);
      if (b.state !== 'command') break;
    }
    if (b.state === 'command') endOfTurn(b, ev);
    return ev;
  };

  function execParty(b, x, ev) {
    var a = x.actor, cmd = x.cmd; var s = pstats(a);
    function msg(t) { ev.push({ type: 'msg', text: t }); }
    // 混乱：ランダム行動
    if (a.status.confuse && Math.random() < 0.6) {
      var all = aliveParty(b).concat(aliveEnemies(b)); var t = pickRandom(all); msg(a.name + 'は混乱している！');
      if (b.party.indexOf(t) >= 0) { var dmg = physDamage(s.atk, pstats(t).def, 1.0); t.hp = Math.max(0, t.hp - dmg); ev.push({ type: 'damage', side: 'party', id: t.id, value: dmg, anim: 'hit' }); msg(a.name + 'は' + t.name + 'を攻撃！ ' + dmg + 'のダメージ'); if (t.hp <= 0) killActor(t, ev); }
      else attackEnemy(b, a, t, 1.0, {}, ev);
      return;
    }
    if (cmd.type === 'defend') { a.defending = true; a._defTurn = b.turn; msg(a.name + 'は身を守っている'); ev.push({ type: 'anim', side: 'party', id: a.id, anim: 'buff' }); var dm = fx(a, 'defendMp'); if (dm) { var mx = Actors.stats(a).maxMp; var g0 = a.mp; a.mp = Math.min(mx, a.mp + Math.max(1, Math.round(mx * dm))); if (a.mp > g0) msg(a.name + 'は見送りの法衣でMPを' + (a.mp - g0) + '回復した'); } return; }
    if (cmd.type === 'attack') {
      var target = b.enemies[cmd.target.idx]; if (!target || target.dead) target = pickRandom(aliveEnemies(b)); if (!target) return;
      msg(a.name + 'の攻撃！');
      var pw = 1.0; var ad = fx(a, 'afterDefend'); if (ad && a._defTurn === b.turn - 1) { pw *= 1 + ad; msg('損切りの短剣：守った次の一撃！'); }
      var mh = fx(a, 'multiHit');
      if (mh) { for (var hi = 0; hi < mh.n; hi++) { if (target.dead) { target = pickRandom(aliveEnemies(b)); if (!target) break; } attackEnemy(b, a, target, pw * mh.mult, { element: s.element }, ev); } }
      else attackEnemy(b, a, target, pw, { element: s.element }, ev);
      var fu = fx(a, 'followUp'); if (fu && a._atkTurn === b.turn - 1) { var t2 = target && !target.dead ? target : pickRandom(aliveEnemies(b)); if (t2) { msg('MACD双剣の追撃！'); attackEnemy(b, a, t2, fu, { element: s.element }, ev); } }
      a._atkTurn = b.turn;
      return;
    }
    if (cmd.type === 'item') { useItemInBattle(b, a, cmd, ev); return; }
    if (cmd.type === 'skill') {
      var sk = SKILLS[cmd.skillId]; if (!sk) return;
      if (a.status.silence && sk.mp > 0) { msg(a.name + 'は沈黙していて' + sk.name + 'が使えない！'); return; }
      var mpCost = sk.mp; if (a.job === 'sage') mpCost = Math.ceil(mpCost * 0.8);
      if (a.mp < mpCost) { msg(a.name + 'はMPが足りない！'); return; }
      if (sk.gold) { if (root.State.data.gold < sk.gold) { msg('ゴールドが足りない！'); return; } root.State.data.gold -= sk.gold; }
      a.mp -= mpCost;
      msg(a.name + 'は' + sk.name + 'を使った！');
      ev.push({ type: 'anim', side: 'party', id: a.id, anim: sk.anim || 'buff', target: sk.target });
      applySkill(b, a, sk, cmd.target, ev);
    }
  }

  function attackEnemy(b, a, target, power, opts, ev) {
    var s = pstats(a); var es = estats(target);
    var critRate = (a.job === 'monk' ? 2 : 1) / 16 + (opts.crit || 0);
    var crit = Math.random() < critRate;
    var mult = resistOf(target, opts.element);
    if (a.job === 'magicknight' && opts.element && opts.element !== 'none') mult *= 1.15;
    if (opts.reversal) mult *= 1 + (1 - target.hp / target.maxHp) * 1.5;
    if (opts.familyBonus && opts.familyBonus.families.indexOf(target.family) >= 0) mult *= opts.familyBonus.mult;   // v5.5 鉄槌：機械・ゴーレム特効
    var dmg = physDamage(s.atk, es.def, power, { crit: crit, pierce: opts.pierce, mult: mult });
    if (mult === 0) dmg = 0;
    target.hp = Math.max(0, target.hp - dmg);
    ev.push({ type: 'damage', side: 'enemy', idx: target.idx, value: dmg, crit: crit, anim: opts.anim || 'slash', weak: mult > 1, resist: mult < 1 });
    ev.push({ type: 'msg', text: (crit ? '会心の一撃！ ' : '') + target.name + 'に' + dmg + 'のダメージ' + (mult > 1 ? '（効果は抜群だ）' : mult === 0 ? '（効かない）' : mult < 1 ? '（効果はいまひとつ）' : '') });
    if (target.status.sleep && dmg > 0 && Math.random() < 0.7) { delete target.status.sleep; ev.push({ type: 'msg', text: target.name + 'は目を覚ました' }); }
    if (opts.steal && dmg > 0 && Math.random() < 0.5) { var g = Math.max(1, Math.round(target.gold * 0.3)); root.State.data.gold += g; ev.push({ type: 'msg', text: g + 'Gを奪った！' }); }
    if (opts.status && !target.dead && addStatus(target, opts.status)) ev.push({ type: 'msg', text: target.name + 'は' + STATUS_NAME[opts.status.id] + '状態になった' });
    var oh = fx(a, 'onHit'); if (oh && dmg > 0 && target.hp > 0) { target.buffs.agi = { value: oh.agi, turns: oh.turns }; ev.push({ type: 'msg', text: target.name + 'の素早さが下がった（RCI転輪弓）' }); }
    if (target.hp <= 0) killEnemy(b, target, ev);
  }

  function applySkill(b, a, sk, tgt, ev) {
    function msg(t) { ev.push({ type: 'msg', text: t }); }
    var s = pstats(a);
    if (['heal', 'heal_all', 'cure', 'revive', 'buff', 'debuff', 'status'].indexOf(sk.kind) >= 0 || (sk.kind === 'special' && !sk.escape)) a._supTurn = b.turn;   // v5.5 ヒドゥンの魔杖：補助の次のターン、攻撃魔法1.5倍
    var targets = [];
    if (sk.target === 'enemy') { var e = b.enemies[tgt ? tgt.idx : 0]; if (!e || e.dead) e = pickRandom(aliveEnemies(b)); if (e) targets = [e]; }
    else if (sk.target === 'enemies') targets = aliveEnemies(b);
    else if (sk.target === 'ally') { var p = b.party.filter(function (q) { return tgt && q.id === tgt.id; })[0]; targets = [p && !p.dead ? p : a]; }
    else if (sk.target === 'allies') targets = aliveParty(b);
    else if (sk.target === 'self') targets = [a];
    else if (sk.target === 'dead_ally') { var dp = b.party.filter(function (q) { return tgt && q.id === tgt.id && q.dead; })[0]; targets = dp ? [dp] : []; if (!dp) { msg('しかし効果がなかった'); return; } }

    if (sk.kind === 'attack') {
      a._atkTurn = b.turn;
      var hits = sk.hits || 1;
      for (var h = 0; h < hits; h++) {
        targets.forEach(function (t) { if (t.dead) return; attackEnemy(b, a, t, sk.power, { element: sk.element, crit: sk.crit, pierce: sk.pierce, status: sk.status, steal: sk.steal, reversal: sk.reversal, anim: sk.anim, familyBonus: sk.familyBonus }, ev); if (sk.exposeTurns && !t.dead) { t.exposed = Math.max(t.exposed || 0, sk.exposeTurns); ev.push({ type: 'msg', text: t.name + 'の防御が崩れた！（' + sk.exposeTurns + 'ターン）' }); } });
        if (hits > 1 && targets.every(function (t) { return t.dead; })) break;
      }
    } else if (sk.kind === 'magic') {
      targets.forEach(function (t) {
        var es = estats(t); var mult = resistOf(t, sk.element); if (a.job === 'mage') mult *= 1.1; var sb = fx(a, 'supportBoost'); if (sb && a._supTurn === b.turn - 1) mult *= sb;
        if (sk.element === 'light' && t.family === 'アンデッド系') mult *= 1.5;
        var dmg = mult === 0 ? 0 : magDamage(s.mag, es.mdef, sk.power, mult);
        t.hp = Math.max(0, t.hp - dmg);
        ev.push({ type: 'damage', side: 'enemy', idx: t.idx, value: dmg, anim: sk.anim, weak: mult > 1, resist: mult < 1 });
        msg(t.name + 'に' + dmg + 'のダメージ' + (mult > 1 ? '（効果は抜群だ）' : mult === 0 ? '（効かない）' : mult < 1 ? '（効果はいまひとつ）' : ''));
        if (t.hp <= 0) killEnemy(b, t, ev);
      });
    } else if (sk.kind === 'heal') {
      targets.forEach(function (t) { var st = Actors.stats(t); var v = Math.round((sk.power + s.mag * 0.8) * (a.job === 'priest' ? 1.15 : 1) * rnd(0.9, 1.1)); var before = t.hp; t.hp = Math.min(st.maxHp, t.hp + v); ev.push({ type: 'heal', side: 'party', id: t.id, value: t.hp - before }); msg(t.name + 'のHPが' + (t.hp - before) + '回復した'); });
    } else if (sk.kind === 'cure') {
      targets.forEach(function (t) { var cured = []; sk.cures.forEach(function (c) { if (t.status[c]) { delete t.status[c]; cured.push(STATUS_NAME[c]); } }); msg(cured.length ? t.name + 'の' + cured.join('・') + 'が治った' : 'しかし何も起こらなかった'); if (cured.length) cureBonus(t, ev); });
    } else if (sk.kind === 'revive') {
      targets.forEach(function (t) { var st = Actors.stats(t); t.dead = false; t.hp = Math.max(1, Math.round(st.maxHp * sk.power)); t.status = {}; ev.push({ type: 'revive', id: t.id }); msg(t.name + 'が復活した！'); });
    } else if (sk.kind === 'buff' || sk.kind === 'debuff') {
      targets.forEach(function (t) { Object.keys(sk.buff).forEach(function (k) { t.buffs[k] = { value: sk.buff[k], turns: sk.turns || 3 }; }); var what = Object.keys(sk.buff).map(function (k) { return ({ atk: '攻撃力', def: '防御力', agi: '素早さ', mdef: '魔法防御', mag: '魔力', mres: '魔法への耐性' })[k] + (sk.buff[k] > 0 ? 'が上がった' : 'が下がった'); }).join('、'); msg(t.name + 'の' + what); });
    } else if (sk.kind === 'status') {
      targets.forEach(function (t) { if (addStatus(t, sk.status)) msg(t.name + 'は' + STATUS_NAME[sk.status.id] + '状態になった'); else msg(t.name + 'には効かなかった'); });
    } else if (sk.kind === 'special') {
      if (sk.escape) { if (b.canEscape) { msg('煙に紛れて逃げ出した！'); b.state = 'escaped'; ev.push({ type: 'end', result: 'escaped' }); } else msg('しかし逃げられない！'); return; }
      if (sk.cover) { a.cover = true; a.counter = !!sk.counter; msg(a.name + 'は仲間をかばう構えをとった'); }
      if (sk.scan) { targets.forEach(function (t) { var weak = Object.keys(t.resist || {}).filter(function (k) { return t.resist[k] > 1; }); var drop = (t.drops || []).map(function (d) { return ITEMS[d.item] ? ITEMS[d.item].name : d.item; }); msg(t.name + '：HP ' + t.hp + '/' + t.maxHp + '、弱点：' + (weak.length ? weak.map(elName).join('・') : 'なし') + (drop.length ? '、落とす：' + drop.join('・') : '')); root.State.data.bestiary[t.defId] = Object.assign(root.State.data.bestiary[t.defId] || {}, { scanned: true }); }); }
      if (sk.expose) { targets.forEach(function (t) { t.exposed = 3; var tend = (t.actions || []).map(function (a) { return a.type === 'attack' ? '通常攻撃' : a.type === 'skill' ? (SKILLS[a.id] ? SKILLS[a.id].name : a.id) : (root.ENEMY_SPECIALS[a.id] ? root.ENEMY_SPECIALS[a.id].name : a.id); }).filter(function (v, i, arr) { return arr.indexOf(v) === i; }); msg(t.name + 'の行動傾向：' + tend.join('・') + '。防御の隙を見抜いた（弱点露出）'); ev.push({ type: 'anim', side: 'enemy', idx: t.idx, anim: 'light' }); }); }
      if (sk.dispel) { targets.forEach(function (t) { var had = Object.keys(t.buffs || {}).length; t.buffs = {}; msg(t.name + 'の' + (had ? '強化を打ち消した' : '強化はない')); }); }
      if (sk.buffAll) { aliveParty(b).forEach(function (t) { Object.keys(sk.buffAll).forEach(function (k) { t.buffs[k] = { value: sk.buffAll[k], turns: sk.turns || 3 }; }); }); msg('味方全体の素早さが上がった'); }
      if (sk.gold && sk.power) { targets.forEach(function (t) { var dmg = Math.max(1, Math.round(sk.gold * sk.power * rnd(0.9, 1.1) - estats(t).def * 0.2)); t.hp = Math.max(0, t.hp - dmg); ev.push({ type: 'damage', side: 'enemy', idx: t.idx, value: dmg, anim: 'hit' }); msg(t.name + 'に' + dmg + 'のダメージ'); if (t.hp <= 0) killEnemy(b, t, ev); }); }
    }
  }
  function elName(k) { return ({ fire: '炎', ice: '氷', thunder: '雷', wind: '風', light: '光', dark: '闇', none: '物理' })[k] || k; }

  function useItemInBattle(b, a, cmd, ev) {
    var it = ITEMS[cmd.itemId]; var inv = root.State.data.inventory;
    function msg(t) { ev.push({ type: 'msg', text: t }); }
    if (!it || !inv[cmd.itemId]) { msg('アイテムがない！'); return; }
    msg(a.name + 'は' + it.name + 'を使った！');
    var ef = it.effect;
    if (ef.damage) {
      root.State.addItem(cmd.itemId, -1);
      aliveEnemies(b).forEach(function (t) { var mult = resistOf(t, ef.element); var dmg = Math.max(0, Math.round(ef.damage * mult * rnd(0.9, 1.1))); t.hp = Math.max(0, t.hp - dmg); ev.push({ type: 'damage', side: 'enemy', idx: t.idx, value: dmg, anim: 'fire' }); msg(t.name + 'に' + dmg + 'のダメージ'); if (t.hp <= 0) killEnemy(b, t, ev); });
      return;
    }
    var t = b.party.filter(function (q) { return cmd.target && q.id === cmd.target.id; })[0] || a;
    if (ef.revive) { if (!t.dead) { msg('しかし効果がなかった'); return; } root.State.addItem(cmd.itemId, -1); var st = Actors.stats(t); t.dead = false; t.hp = Math.max(1, Math.round(st.maxHp * ef.revive)); t.status = {}; ev.push({ type: 'revive', id: t.id }); msg(t.name + 'が復活した！'); return; }
    if (t.dead) { msg('しかし効果がなかった'); return; }
    root.State.addItem(cmd.itemId, -1);
    var s = Actors.stats(t);
    if (ef.hp) { var bh = t.hp; t.hp = Math.min(s.maxHp, t.hp + ef.hp); ev.push({ type: 'heal', side: 'party', id: t.id, value: t.hp - bh }); msg(t.name + 'のHPが' + (t.hp - bh) + '回復した'); }
    if (ef.mp) { var bm = t.mp; t.mp = Math.min(s.maxMp, t.mp + ef.mp); msg(t.name + 'のMPが' + (t.mp - bm) + '回復した'); }
    if (ef.cure) { var cured = []; ef.cure.forEach(function (c) { if (t.status[c]) { delete t.status[c]; cured.push(STATUS_NAME[c]); } }); if (cured.length) { msg(t.name + 'の' + cured.join('・') + 'が治った'); cureBonus(t, ev); } }
  }

  function execEnemy(b, e, ev) {
    function msg(t) { ev.push({ type: 'msg', text: t }); }
    var es = estats(e);
    if (e.status.confuse && Math.random() < 0.5) { var other = pickRandom(aliveEnemies(b)); msg(e.name + 'は混乱している！'); if (other) { var d0 = physDamage(es.atk, estats(other).def, 1.0); other.hp = Math.max(0, other.hp - d0); ev.push({ type: 'damage', side: 'enemy', idx: other.idx, value: d0, anim: 'hit' }); msg(other.name + 'に' + d0 + 'のダメージ'); if (other.hp <= 0) killEnemy(b, other, ev); } return; }
    // 行動選択（重み付き）
    var ratio = e.hp / e.maxHp;
    // ボスのフェーズ移行（HP割合で行動が変わる）
    if (e.boss) { var ph = ratio <= 0.3 ? 2 : ratio <= 0.6 ? 1 : 0; if (ph > e.phase) { e.phase = ph; msg(ph === 2 ? e.name + 'は最後の力を振り絞っている……！' : e.name + 'の様子が変わった！'); ev.push({ type: 'phase', idx: e.idx, phase: ph }); } }
    var acts = e.actions.filter(function (x) { if (x.hpBelow !== undefined && ratio > x.hpBelow) return false; if (x.hpAbove !== undefined && ratio < x.hpAbove) return false; if (x.id === 'call' && aliveEnemies(b).length >= MAX_ENEMIES) return false; if (x.id === 'heal_self' && ratio > 0.8) return false; return true; });
    if (!acts.length) acts = [{ type: 'attack', w: 1 }];
    var total = acts.reduce(function (s, x) { return s + x.w; }, 0); var r = Math.random() * total; var chosen = acts[0];
    for (var i = 0; i < acts.length; i++) { r -= acts[i].w; if (r <= 0) { chosen = acts[i]; break; } }
    if (chosen.type === 'skill' && SKILLS[chosen.id] && e.mp < SKILLS[chosen.id].mp) chosen = { type: 'attack' };
    if (chosen.type === 'skill' && e.status.silence && SKILLS[chosen.id] && SKILLS[chosen.id].mp > 0) { msg(e.name + 'は沈黙していて呪文が使えない！'); chosen = { type: 'attack' }; }
    if (chosen.type === 'special' && chosen.id === 'trial' && b.trialCount >= 2) chosen = { type: 'attack' };
    if (chosen.type === 'special' && chosen.id === 'flee' && b.boss) chosen = { type: 'attack' };
    var living = aliveParty(b);
    function pickTarget() { var cov = living.filter(function (a) { return a.cover; })[0]; if (cov) return cov; var kn = living.filter(function (a) { return a.job === 'knight' && Math.random() < 0.35; })[0]; return kn || pickRandom(living); }
    if (chosen.type === 'attack') { var t = pickTarget(); msg(e.name + 'の攻撃！'); ev.push({ type: 'anim', side: 'enemy', idx: e.idx, anim: 'lunge' }); hitActor(b, e, t, 1.0, {}, ev); return; }
    if (chosen.type === 'skill') {
      var sk = SKILLS[chosen.id]; e.mp -= sk.mp; msg(e.name + 'は' + sk.name + 'を使った！'); ev.push({ type: 'anim', side: 'enemy', idx: e.idx, anim: sk.anim });
      if (sk.kind === 'attack') { var tgs = sk.target === 'enemies' ? living : [pickTarget()]; var hits = sk.hits || 1; for (var h = 0; h < hits; h++) tgs.forEach(function (t2) { if (!t2.dead) hitActor(b, e, t2, sk.power, { element: sk.element, status: sk.status }, ev); }); }
      else if (sk.kind === 'magic') { var tg2 = sk.target === 'enemies' ? living : [pickTarget()]; tg2.forEach(function (t3) { var ps = pstats(t3); var dmg = magDamage(es.mag, ps.mdef, sk.power); if (t3.job === 'spirit_warden' && ['ice', 'fire', 'thunder'].indexOf(sk.element) >= 0) dmg = Math.round(dmg * 0.85); /* v5.6 精霊守の加護 */ if (t3.buffs && t3.buffs.mres && t3.buffs.mres.turns > 0) dmg = Math.max(1, Math.round(dmg * (1 - t3.buffs.mres.value))); /* v5.6 精霊の盾・精霊の守り */ dmg = partyTakes(b, t3, dmg, ev); t3.hp = Math.max(0, t3.hp - dmg); ev.push({ type: 'damage', side: 'party', id: t3.id, value: dmg, anim: sk.anim }); msg(t3.name + 'に' + dmg + 'のダメージ'); if (t3.hp <= 0) killActor(t3, ev); }); }
      else if (sk.kind === 'status') { var tg3 = sk.target === 'enemies' ? living : [pickTarget()]; tg3.forEach(function (t4) { if (addStatus(t4, sk.status, undefined, true)) msg(t4.name + 'は' + STATUS_NAME[sk.status.id] + '状態になった'); else msg(t4.name + 'には効かなかった'); }); }
      else if (sk.kind === 'buff') { Object.keys(sk.buff).forEach(function (k) { e.buffs[k] = { value: sk.buff[k], turns: sk.turns || 3 }; }); msg(e.name + 'の能力が上がった'); }
      return;
    }
    if (chosen.type === 'special') {
      var sp = SPECIALS[chosen.id]; if (!sp) return;
      msg(e.name + sp.msg); ev.push({ type: 'anim', side: 'enemy', idx: e.idx, anim: sp.power ? 'lunge' : 'buff' });
      if (sp.flee) { e.dead = true; e.fled = true; ev.push({ type: 'flee', idx: e.idx }); return; }
      if (sp.trial) { b.trialCount++; ev.push({ type: 'trial', idx: e.idx }); return; }
      if (sp.call) { var sid = chosen.summon || e.defId; if (!ENEMIES[sid] || b.enemies.length >= 8 || aliveEnemies(b).length >= MAX_ENEMIES) { msg('しかし誰も来なかった'); return; } var ne = makeEnemy(sid, b.enemies.length); var cnt = b.enemies.filter(function (x) { return x.defId === sid; }).length; if (cnt > 0) ne.name += String.fromCharCode(65 + cnt); ne.summoned = true; b.enemies.push(ne); ev.push({ type: 'summon', idx: ne.idx }); msg(ne.name + 'が現れた！'); return; }
      if (sp.heal) { var hv = Math.max(1, Math.round(e.maxHp * sp.heal)); e.hp = Math.min(e.maxHp, e.hp + hv); ev.push({ type: 'heal', side: 'enemy', idx: e.idx, value: hv }); msg(e.name + 'のHPが' + hv + '回復した'); return; }
      if (sp.buff && sp.self) { Object.keys(sp.buff).forEach(function (k) { e.buffs[k] = { value: sp.buff[k], turns: sp.turns || 2 }; }); return; }
      if (sp.power) {
        if (sp.all) { living.forEach(function (t7) { if (!t7.dead) hitActor(b, e, t7, sp.power, {}, ev); }); return; }
        var hits2 = sp.hits || 1;
        for (var h2 = 0; h2 < hits2; h2++) { if (!aliveParty(b).length) break; var t5 = pickTarget(); if (!t5 || t5.dead) t5 = pickRandom(aliveParty(b)); var dm = hitActor(b, e, t5, sp.power, {}, ev); if (sp.drain && dm > 0) { e.hp = Math.min(e.maxHp, e.hp + Math.round(dm * 0.5)); msg(e.name + 'は体力を吸い取った'); } }
        return;
      }
      if (sp.status) { var tg4 = sp.target === 'allies' ? living : [pickTarget()]; tg4.forEach(function (t6) { if (addStatus(t6, sp.status, undefined, true)) msg(t6.name + 'は' + STATUS_NAME[sp.status.id] + '状態になった'); }); }
    }
  }

  function hitActor(b, e, t, power, opts, ev) {
    var es = estats(e); var ps = pstats(t);
    var evd = fx(t, 'evade'); if (evd && !opts.all && Math.random() < evd) { ev.push({ type: 'msg', text: t.name + 'はひらりとかわした！（変動相場のマント）' }); return 0; }
    var dmg = physDamage(es.atk, ps.def, power, { crit: Math.random() < 1 / 24 });
    if (t.job === 'warrior') dmg = Math.round(dmg * 0.95);
    if (opts.element && opts.element !== 'none' && Actors.stats(t).mdef) dmg = Math.round(dmg * 0.9);
    // v5.1 装備の受動効果：dmgReduce（単体攻撃の軽減）、cover 中の誓約騎士は -20%
    var red = 0; Object.keys(t.equip || {}).forEach(function (sl) { var it = t.equip[sl] && ITEMS[t.equip[sl]]; if (it && it.dmgReduce && !opts.all) red = Math.max(red, it.dmgReduce); }); if (t.cover && t.job === 'oath_knight') red = Math.max(red, 0.2); if (red) dmg = Math.round(dmg * (1 - red));
    dmg = partyTakes(b, t, dmg, ev);
    t.hp = Math.max(0, t.hp - dmg);
    ev.push({ type: 'damage', side: 'party', id: t.id, value: dmg, anim: 'hit' });
    ev.push({ type: 'msg', text: t.name + 'に' + dmg + 'のダメージ' });
    if (t.status.sleep && Math.random() < 0.7) { delete t.status.sleep; ev.push({ type: 'msg', text: t.name + 'は目を覚ました' }); }
    if (opts.status && addStatus(t, opts.status, undefined, true)) ev.push({ type: 'msg', text: t.name + 'は' + STATUS_NAME[opts.status.id] + '状態になった' });
    if (t.hp <= 0) killActor(t, ev);
    else if (t.counter && !e.dead) { var cd = physDamage(pstats(t).atk, es.def, 1.0); e.hp = Math.max(0, e.hp - cd); ev.push({ type: 'damage', side: 'enemy', idx: e.idx, value: cd, anim: 'slash' }); ev.push({ type: 'msg', text: t.name + 'の反撃！ ' + e.name + 'に' + cd + 'のダメージ' }); if (e.hp <= 0) killEnemy(b, e, ev); }
    return dmg;
  }

  function killEnemy(b, e, ev) { e.dead = true; ev.push({ type: 'enemy_dead', idx: e.idx }); ev.push({ type: 'msg', text: e.name + 'を倒した！' }); }
  function killActor(t, ev) { t.dead = true; t.status = {}; t.buffs = {}; ev.push({ type: 'actor_dead', id: t.id }); ev.push({ type: 'msg', text: t.name + 'は倒れた……' }); }

  function endOfTurn(b, ev) {
    function msg(t) { ev.push({ type: 'msg', text: t }); }
    b.party.forEach(function (a) {
      if (a.dead) return;
      if (a.status.poison) { var s = Actors.stats(a); var d = Math.max(1, Math.round(s.maxHp / 12)); a.hp = Math.max(1, a.hp - d); b.partyDamaged = true; ev.push({ type: 'damage', side: 'party', id: a.id, value: d, anim: 'poison' }); msg(a.name + 'は毒で' + d + 'のダメージ'); }
      ['paralyze', 'confuse', 'sleep', 'silence'].forEach(function (k) { if (a.status[k]) { a.status[k].turns--; if (a.status[k].turns <= 0) { delete a.status[k]; msg(a.name + 'の' + STATUS_NAME[k] + 'が治った'); cureBonus(a, ev); } } });
      Object.keys(a.buffs).forEach(function (k) { if (a.buffs[k]) { a.buffs[k].turns--; if (a.buffs[k].turns <= 0) delete a.buffs[k]; } });
    });
    b.enemies.forEach(function (e) {
      if (e.dead) return;
      if (e.status.poison) { var d = Math.max(1, Math.round(e.maxHp / 10)); e.hp = Math.max(0, e.hp - d); ev.push({ type: 'damage', side: 'enemy', idx: e.idx, value: d, anim: 'poison' }); msg(e.name + 'は毒で' + d + 'のダメージ'); if (e.hp <= 0) killEnemy(b, e, ev); }
      ['paralyze', 'confuse', 'sleep', 'silence'].forEach(function (k) { if (e.status[k]) { e.status[k].turns--; if (e.status[k].turns <= 0) delete e.status[k]; } });
      Object.keys(e.buffs).forEach(function (k) { if (e.buffs[k]) { e.buffs[k].turns--; if (e.buffs[k].turns <= 0) delete e.buffs[k]; } });
      if (e.exposed > 0) e.exposed--;
    });
    checkEnd(b, ev);
  }

  function checkEnd(b, ev) {
    if (b.state !== 'command') return;
    if (aliveEnemies(b).length === 0) { if (b.enemies.every(function (e) { return e.fled; })) { b.state = 'fled'; ev.push({ type: 'end', result: 'fled' }); return; } b.state = 'won'; b.result = Combat.rewards(b); if (b.result.rrNote) ev.push({ type: 'msg', text: b.result.rrNote }); ev.push({ type: 'end', result: 'won' }); }
    else if (aliveParty(b).length === 0) { b.state = 'lost'; ev.push({ type: 'end', result: 'lost' }); }
  }

  // 相場の試練の結果を戦闘に反映（成功：敵の弱点露出＋味方強化／失敗：混乱の囁き）
  Combat.applyTrialResult = function (b, idx, score) {
    var e = b.enemies[idx]; var ev = []; function msg(t) { ev.push({ type: 'msg', text: t }); }
    if (score >= 60) { e.exposed = 3; aliveParty(b).forEach(function (a) { a.buffs.atk = { value: 0.25, turns: 3 }; }); msg('正しい判断が魔物の核心を暴いた！ ' + e.name + 'の防御が崩れ、味方の攻撃力が上がった！'); if (score >= 90) { var d = Math.round(e.maxHp * 0.1); e.hp = Math.max(1, e.hp - d); ev.push({ type: 'damage', side: 'enemy', idx: e.idx, value: d, anim: 'light' }); msg('見事な分析！ ' + e.name + 'に' + d + 'のダメージ'); } }
    else { msg('魔物の誘惑に惑わされた……！'); aliveParty(b).forEach(function (a) { if (Math.random() < 0.5 && addStatus(a, { id: 'confuse', chance: 1 }, 1, true)) msg(a.name + 'は混乱した'); }); }
    return ev;
  };

  Combat.rewards = function (b) {
    var exp = 0, gold = 0, drops = [];
    b.enemies.forEach(function (e) { if (e.fled) return; exp += Math.round(e.exp * 1.5); gold += e.gold; (e.drops || []).forEach(function (d) { if (Math.random() < d.rate) drops.push(d.item); }); root.State.data.bestiary[e.defId] = Object.assign(root.State.data.bestiary[e.defId] || {}, { seen: true, defeated: (root.State.data.bestiary[e.defId] && root.State.data.bestiary[e.defId].defeated || 0) + 1 }); });
    gold = Math.round(gold * rnd(0.85, 1.15));
    var goldBase = gold, bonus = 0;
    if (b.party.some(function (a) { return a.job === 'merchant' && !a.dead; })) { bonus = Math.round(gold * 0.25); gold += bonus; }
    var rr = null, rrNote = ''; b.party.forEach(function (a) { if (!a.dead && fx(a, 'rrScale')) rr = fx(a, 'rrScale'); });
    if (rr) { if (b.party.some(function (a) { return a.dead; })) { var lo = Math.round(gold * rr.loss); gold -= lo; rrNote = 'リスクリワードの天秤：戦闘不能者が出たので報酬 −' + lo + 'G'; } else if (!b.partyDamaged) { var up = Math.round(gold * rr.win); gold += up; rrNote = 'リスクリワードの天秤：HPを失わずに勝ったので報酬 +' + up + 'G'; } }
    return { exp: exp, gold: gold, goldBase: goldBase, merchantBonus: bonus, drops: drops, rrNote: rrNote };
  };

  // 勝利報酬の配分（1回だけ実行する。戻り値はリザルト画面用の詳細）
  Combat.distribute = function (b) {
    if (b.distributed) return b.distributed;
    var r = b.result; var alive = aliveParty(b);
    var share = Math.max(1, r.exp);   // v3.4: 分配せず、生存メンバー全員が全額を得る
    var members = b.party.map(function (a) {
      var before = { level: a.level, exp: a.exp, stats: Actors.stats(a), skills: a.skills.slice() };
      var gained = 0, ups = [];
      if (!a.dead) { gained = share; ups = Actors.gainExp(a, share); }
      var after = { level: a.level, exp: a.exp, stats: Actors.stats(a) };
      return { actor: a, dead: a.dead, gained: gained, before: before, after: after, levelUp: a.level > before.level, levels: ups,
        newSkills: a.skills.filter(function (k) { return before.skills.indexOf(k) < 0; }), toNext: Actors.expForLevel(a.level) - a.exp };
    });
    var goldBase = r.goldBase !== undefined ? r.goldBase : r.gold;
    root.State.data.gold += r.gold;
    var dropCounts = {};
    r.drops.forEach(function (d) { root.State.addItem(d, 1); dropCounts[d] = (dropCounts[d] || 0) + 1; });
    b.party.forEach(Actors.clearBattleState);
    // 倒した敵の集計
    var killed = {}; b.enemies.forEach(function (e) { if (e.fled) return; var nm = e.name.replace(/[A-H]$/, ''); killed[nm] = (killed[nm] || 0) + 1; });
    b.distributed = { exp: r.exp, gold: r.gold, goldBase: goldBase, merchantBonus: r.merchantBonus || 0, drops: dropCounts, killed: killed, members: members };
    return b.distributed;
  };

  root.Combat = Combat;
})(typeof window !== 'undefined' ? window : globalThis);
