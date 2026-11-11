/* =========================================================
   RPG / BossGear（v8.7）：ボス固有装備の「固有効果」の戦闘計算・初回報酬の台帳・旧セーブの補填・画面の部品
   ・データ：js/data/boss-unique-gear.js（BOSS_UNIQUE_GEAR）。効果は type ごとにここで計算する（装備名で分岐しない）
   ・戦闘：js/rpg/combat.js の決まった場所から呼ばれる（呼び出しはすべて「BossGear があれば」。なければ従来どおり）
     状態は戦闘ごとの b.ug に持つ（戦闘が終われば消える。装備の着脱・控えとの入れ替え・読み込み直しで 1 戦 1 回の効果は戻らない）
   ・上限（CAP）：今回の装備が増やす条件つきの直接ダメージ倍率×1.75、一般の直接被ダメージ軽減 40%、MP 軽減 25%、
     自動の HP 回復＝各自の最大HP 8%／ターン・MP 回復＝最大MP 5%／ターン、追加の属性ダメージ・追撃＝その行動の実ダメージの 50%
   ・報酬：正規のボス戦（js/rpg/events.js の type:'boss' と、会話の c.battle(...,{boss:true})・E 表の encounter ID）だけが bossRewardKey を持つ。
     勝ちが確定した報酬の配分（Combat.distribute）で grantOnce。台帳 State.data.bossUniqueRewards（version・claimed・pending・modes）
   ・旧セーブ：State.migrate では台帳の形を足すだけ（一覧・プレビューの読み込みで何も増やさない）。World.start（遊び始め）で 1 回だけ補填する
   ========================================================= */
(function (root) {
  'use strict';
  var UG = {};
  var CAP = { outMult: 1.75, cut: 0.40, mpCut: 0.25, hpRegen: 0.08, mpRegen: 0.05, extra: 0.5, healMult: 1.75 };
  UG.CAP = CAP;
  function DATA() { return root.BOSS_UNIQUE_GEAR || { rows: [], byKey: {}, byItem: {}, byDoneFlag: {} }; }
  function IT() { return root.ITEMS || {}; }
  function D() { return root.State && root.State.data; }
  function K() { return (root.Combat && root.Combat._ugK) || null; }
  function maxHp(a) { return root.Actors.stats(a).maxHp; }
  function maxMp(a) { return root.Actors.stats(a).maxMp; }
  function msg(ev, t) { if (ev) ev.push({ type: 'msg', text: t }); }

  /* ---------- 装備から固有効果を集める（同じ type は大きいほう。名前は大きい値を出した装備） ---------- */
  function num(e) { return typeof e.v === 'number' ? e.v : (e.direct || e.chance || e.hp || 0); }
  function mergeEff(cur, e, name) {
    var out = Object.assign({}, cur);
    Object.keys(e).forEach(function (k) {
      var a = cur[k], b = e[k];
      if (typeof b === 'number' && typeof a === 'number') out[k] = Math.max(a, b);
      else if (Array.isArray(b)) out[k] = (Array.isArray(a) ? a : []).concat(b.filter(function (x) { return !Array.isArray(a) || a.indexOf(x) < 0; }));
      else if (b && typeof b === 'object' && a && typeof a === 'object') { var o = Object.assign({}, a); Object.keys(b).forEach(function (q) { o[q] = typeof b[q] === 'number' && typeof a[q] === 'number' ? Math.max(a[q], b[q]) : b[q]; }); out[k] = o; }
      else if (a === undefined) out[k] = b;
    });
    if (num(e) > num(cur)) out.src = name;
    return out;
  }
  function effectsOf(a) {
    var out = {}; if (!a || !a.equip) return out; var I = IT();
    Object.keys(a.equip).forEach(function (sl) {
      var id = a.equip[sl]; var it = id && I[id]; if (!it || !it.bossExclusive || !it.ug) return;
      it.ug.forEach(function (e) { out[e.type] = out[e.type] ? mergeEff(out[e.type], e, it.name) : Object.assign({ src: it.name }, e); });
    });
    return out;
  }
  UG.effectsOf = effectsOf;
  function has(a, type) { return effectsOf(a)[type] || null; }
  // 既存の fx（Combat.fx と同じ。ただし同じ key は装備の中で大きいほう）
  function fxMax(a, key) { var v; if (!a || !a.equip) return v; var I = IT(); Object.keys(a.equip).forEach(function (sl) { var it = a.equip[sl] && I[a.equip[sl]]; if (it && it.fx && it.fx[key] !== undefined) { var x = it.fx[key]; if (v === undefined || (typeof x === 'number' && x > v)) v = x; else if (typeof x === 'object' && x && typeof v === 'object' && (x.mult || 0) > (v.mult || 0)) v = x; } }); return v; }
  UG.fxMax = fxMax;
  function fxSrc(a, key) { var I = IT(); var name = null; Object.keys(a.equip || {}).forEach(function (sl) { var it = a.equip[sl] && I[a.equip[sl]]; if (it && it.fx && it.fx[key] !== undefined) name = it.name; }); return name; }
  UG.fxSrc = fxSrc;
  UG.isBossItemFx = function (a, key) { var I = IT(); return Object.keys(a.equip || {}).some(function (sl) { var it = a.equip[sl] && I[a.equip[sl]]; return it && it.bossExclusive && it.fx && it.fx[key] !== undefined; }); };

  /* ---------- 戦闘ごとの状態 ---------- */
  UG.initBattle = function (b, opts) {
    b.ug = { a: {}, act: null, eact: null, turn: 0 }; b.bossRewardKey = (opts && opts.bossRewardKey) || null;
  };
  function st(b, a) {
    if (!b.ug) UG.initBattle(b, {}); var s = b.ug.a[a.id];
    if (!s) s = b.ug.a[a.id] = { used: {}, lastNormalTurn: -9, lastNormalTarget: null, prevCat: null, prevTurn: -9, normalActs: 0, noCrit: 0, lastSpellTurn: -9, stillTurn: -9, stillUsed: -9,
      hurtUntil: -9, curedUntil: -9, cutUntil: -9, cutV: 0, adaptive: null, counterTurn: -9, afterCounterUntil: -9, bigSingleTurn: -9, defendHealTurn: -9, defendLow: -9, elements: {}, firstDirectTurn: -9, everHalf: false, reviveUses: 0, healHp: {}, healMp: {} };
    return s;
  }
  UG._st = st;
  function contractMode() { var d = D(); var m = d && d.bossUniqueRewards && d.bossUniqueRewards.modes && d.bossUniqueRewards.modes.b19_crossroads_blade; return m === 'attack' ? 'attack' : 'guard'; }
  UG.contractMode = contractMode;

  // ターンの始め（runTurn の b.turn を進めた直後）
  UG.turnStart = function (b, ev) {
    if (!b.ug) UG.initBattle(b, {}); b.ug.turn = b.turn; UG.cur = b;
    if (b.turn !== 1) return;
    // 群れの呼吸：戦闘の始めに、生きている味方全員の素早さ+10%（第1・第2ラウンドのあいだ。重ならない）
    var pack = null; b.party.forEach(function (a) { if (a.dead) return; var e = has(a, 'packAura'); if (e && (!pack || e.v > pack.v)) pack = e; });
    if (pack) { b.party.forEach(function (t) { if (t.dead) return; var cur = t.buffs.agi; var v = cur && cur.turns > 0 && cur.value > pack.v ? cur.value : pack.v; t.buffs.agi = { value: v, turns: Math.max(pack.turns, cur && cur.value > 0 ? cur.turns : 0) }; }); msg(ev, pack.src + '【群れの呼吸】：味方全員の素早さが上がった（2ターン）'); }
    // 選択の契約：戦闘の前に選んだ契約を知らせる（戦闘中は変えない）
    b.party.forEach(function (a) { if (!a.dead && has(a, 'contract')) { b.ug.contract = contractMode(); msg(ev, a.name + 'の' + has(a, 'contract').src + '【選択の契約】：' + (b.ug.contract === 'attack' ? '攻勢の契約（与える直接ダメージ+10%・受ける直接ダメージ+10%）' : '守勢の契約（与える直接ダメージ-5%・受ける直接ダメージ-10%）')); } });
  };

  /* ---------- 行動の始め・終わり ---------- */
  var SUPPORT = ['heal', 'heal_all', 'cure', 'revive', 'buff', 'debuff', 'status', 'mp_heal', 'special'];
  function catOf(cmd) {
    var S = root.SKILLS || {};
    if (!cmd) return 'other';
    if (cmd.type === 'attack') return 'normal'; if (cmd.type === 'defend') return 'defend'; if (cmd.type === 'item') return 'item'; if (cmd.type === 'ultimate') return 'ult'; if (cmd.type === 'escape') return 'escape';
    if (cmd.type === 'skill') { var sk = S[cmd.skillId]; if (!sk) return 'other'; if (sk.kind === 'attack') return 'skill'; if (sk.kind === 'magic') return 'spell'; if (SUPPORT.indexOf(sk.kind) >= 0) return (sk.kind === 'special' && (sk.gold && sk.power)) ? 'skill' : 'support'; }
    return 'other';
  }
  UG.catOf = catOf;
  UG.beginAction = function (b, side, a, cmd) {
    if (!b.ug) UG.initBattle(b, {}); UG.cur = b;
    if (side === 'enemy') { var sh = {}; b.party.forEach(function (t) { if (!t.dead) sh[t.id] = t.hp / Math.max(1, maxHp(t)); }); b.ug.eact = { e: a, startHp: sh, saved: {}, hit: {} }; b.ug.act = null; return; }
    if (side !== 'party') { b.ug.act = null; b.ug.eact = null; return; }
    var s = st(b, a); var cat = catOf(cmd);
    var act = b.ug.act = { a: a, cmd: cmd, cat: cat, E: effectsOf(a), hpStart: a.hp / Math.max(1, maxHp(a)), hits: [], normalDmg: 0, dmg: 0, crit: false, kills: 0, weak: false, primary: null, paid: 0, spellTargets: {}, rolled: {}, over: {}, extra: 0, consume: {}, firstDirect: null };
    b.ug.eact = null;
    act.switched = b.turn > 1 && s.prevTurn === b.turn - 1 && !!s.prevCat && s.prevCat !== cat && ['normal', 'skill', 'spell', 'support', 'defend'].indexOf(cat) >= 0;
    if (cat === 'normal' || cat === 'skill' || cat === 'spell') { act.firstDirect = s.firstDirectTurn !== b.turn; if (act.firstDirect) s.firstDirectTurn = b.turn; }
    if (cat === 'normal') { act.third = !!act.E.everyThirdNormal && (s.normalActs + 1) % 3 === 0; act.pity = !!act.E.critPity && s.noCrit >= act.E.critPity.after; }
    act.still = !!act.E.stillness && s.stillTurn === b.turn - 1 && s.stillUsed !== b.turn;
  };
  // 行動の終わり（execParty・execEnemy の直後）
  UG.endAction = function (b, ev) {
    if (!b.ug) return; var act = b.ug.act, eact = b.ug.eact;
    if (eact) { endEnemyAction(b, eact, ev); b.ug.eact = null; return; }
    if (!act) return; b.ug.act = null; var a = act.a, s = st(b, a), E = act.E;
    if (act.cat === 'normal') {
      // 軌道追撃：最初に狙った敵へ、その通常攻撃の実ダメージの合計の 25%（無属性・1行動1回・倒れていたら出さない）
      if (E.orbitFollow && act.primary && !act.primary.dead && act.normalDmg > 0 && !a.dead) {
        var room = Math.max(0, Math.floor(act.normalDmg * CAP.extra) - act.extra); var fd = Math.min(room, Math.round(act.normalDmg * E.orbitFollow.v * (K().resistOf(act.primary, 'none'))));
        if (fd > 0) { var t = act.primary; var h0 = t.hp; t.hp = Math.max(0, t.hp - fd); act.extra += fd; ev.push({ type: 'damage', side: 'enemy', idx: t.idx, value: fd, anim: 'arrow' }); msg(ev, E.orbitFollow.src + '【軌道追撃】！ ' + t.name + 'に' + fd + 'のダメージ'); if (t.hp <= 0 && h0 > 0) { K().killEnemy(b, t, ev); act.kills++; } }
      }
      if (E.doubleHitHeal && act.hits.filter(function (h) { return h.normal && h.dmg > 0; }).length >= 2 && !a.dead) regenHp(b, a, Math.floor(maxHp(a) * E.doubleHitHeal.v), ev, E.doubleHitHeal.src + '【もちもち連打】');
      if (E.forestHeal && !a.dead) { var al = b.party.filter(function (x) { return !x.dead; }); al.sort(function (p, q) { return p.hp / maxHp(p) - q.hp / maxHp(q); }); var low = al[0]; if (low) regenHp(b, low, Math.floor(maxHp(low) * E.forestHeal.v), ev, E.forestHeal.src + '【森の記憶】'); }
      if (E.lifesteal && act.normalDmg > 0 && !a.dead) { var ls = Math.min(Math.floor(act.normalDmg * E.lifesteal.v), Math.floor(maxHp(a) * E.lifesteal.cap)); if (ls > 0) regenHp(b, a, ls, ev, E.lifesteal.src + '【利を積む手】'); }
      if (E.sameTargetNormal && act.chained && !act.chained.dead) { var ct = act.chained; var cur = ct.buffs.agi; if (!(cur && cur.turns > 0 && cur.value <= E.sameTargetNormal.slow)) { ct.buffs.agi = { value: E.sameTargetNormal.slow, turns: E.sameTargetNormal.turns + 1 }; msg(ev, E.sameTargetNormal.src + '【追尾照準】：' + ct.name + 'の素早さが下がった（2ターン）'); } }
      s.normalActs++; if (E.critPity) { if (act.crit || act.pity) s.noCrit = 0; else s.noCrit++; }
      s.lastNormalTurn = b.turn; s.lastNormalTarget = act.primary ? act.primary.idx : null;
    }
    if (act.cat === 'normal' || act.cat === 'skill' || act.cat === 'spell') {
      if (act.kills > 0 && !a.dead) {
        if (E.killHeal) regenHp(b, a, Math.floor(maxHp(a) * E.killHeal.v), ev, E.killHeal.src + '【頭目の一撃】');
        if (E.killMp) regenMp(b, a, Math.floor(maxMp(a) * E.killMp.v), ev, E.killMp.src + '【帰港の誓い】');
        if (E.firstKillHeal && !s.used.firstKill) { s.used.firstKill = true; var fk = Math.floor(maxHp(a) * E.firstKillHeal.v); heal(b, a, fk, ev, E.firstKillHeal.src + '【足るを知る】'); }
      }
      if (act.consume.hurt) s.hurtUntil = -9; if (act.consume.cured) s.curedUntil = -9;
    }
    if (act.cat === 'spell') { s.lastSpellTurn = b.turn; Object.keys(act.spellElems || {}).forEach(function (k) { s.elements[k] = true; }); }
    // 読解の成果：弱点に当てた行動のあと、払った MP の 20% を戻す（払った MP まで・1行動1回）
    if (E.weakRefund && act.cat === 'spell' && act.weak && act.paid > 0 && !a.dead) { var rf = Math.min(act.paid, Math.floor(act.paid * E.weakRefund.v)); if (rf > 0) { var m0 = a.mp; a.mp = Math.max(a.mp, Math.min(maxMp(a), a.mp + rf)); if (a.mp > m0) msg(ev, a.name + 'の' + E.weakRefund.src + '【読解の成果】：MPが' + (a.mp - m0) + '戻った'); } }   // 増やすだけ（最大MPを超えない）
    // 同調：味方に支援の呪文を使った行動のあと、自分と主な対象の MP を各 2%（それぞれ払った MP の半分まで）
    if (E.entangle && act.cat === 'support' && act.paid > 0 && act.supportTarget && !a.dead) {
      var cap1 = Math.floor(act.paid / 2); var who = [a]; if (act.supportTarget !== a && !act.supportTarget.dead) who.push(act.supportTarget);
      who.forEach(function (x) { var v = Math.min(cap1, Math.floor(maxMp(x) * E.entangle.v)); if (v > 0) regenMp(b, x, v, ev, E.entangle.src + '【同調】'); });
    }
    if (act.still) s.stillUsed = b.turn;
    // 静止の余白：このターン MP を使わずに行動を終えた
    if (act.paid === 0 && act.cat !== 'escape') s.stillTurn = b.turn;
    if (['normal', 'skill', 'spell', 'support', 'defend'].indexOf(act.cat) >= 0 || act.cat === 'item') { s.prevCat = act.cat; s.prevTurn = b.turn; }
  };
  function endEnemyAction(b, eact, ev) {
    b.party.forEach(function (t) {
      if (t.dead) return; var E = effectsOf(t); var s = st(b, t); var mh = maxHp(t); var r0 = eact.startHp[t.id]; var r1 = t.hp / mh;
      if (!eact.hit[t.id]) { if (r1 <= 0.5) s.everHalf = true; return; }
      // 復旧点：HP60%以上から敵の直接攻撃の行動を受け、行動の終わりに HP30% 未満で生きていれば 30% まで戻す（1戦1回）
      if (E.restorePoint && !s.used.restore && r0 !== undefined && r0 >= E.restorePoint.from && r1 < E.restorePoint.below) { s.used.restore = true; var to = Math.floor(mh * E.restorePoint.to); if (to > t.hp) heal(b, t, to - t.hp, ev, E.restorePoint.src + '【復旧点】'); }
      // 次の一分：敵の行動で初めて HP50% 以下になったとき、その行動の終わりに 15% 回復（1戦1回）
      if (E.halfHpHeal && !s.used.half && !s.everHalf && r0 !== undefined && r0 > 0.5 && t.hp / mh <= 0.5) { s.used.half = true; heal(b, t, Math.floor(mh * E.halfHpHeal.v), ev, E.halfHpHeal.src + '【次の一分】'); }
      if (t.hp / mh <= 0.5) s.everHalf = true;
    });
  }

  /* ---------- 回復（自動の回復は各自 1 ターンに最大HP 8%・最大MP 5% まで） ---------- */
  function heal(b, t, v, ev, label) { if (t.dead || !(v > 0)) return 0; var mh = maxHp(t); var h0 = t.hp; t.hp = Math.min(mh, t.hp + v); var g = t.hp - h0; if (g > 0) { ev.push({ type: 'heal', side: 'party', id: t.id, value: g }); msg(ev, label + '：' + t.name + 'のHPが' + g + '回復した'); } return g; }
  function regenHp(b, t, v, ev, label) { if (t.dead || !(v > 0)) return 0; var s = st(b, t); var mh = maxHp(t); var used = s.healHp[b.turn] || 0; var room = Math.floor(mh * CAP.hpRegen) - used; var g0 = Math.min(v, room); if (g0 <= 0) return 0; var g = heal(b, t, g0, ev, label); s.healHp[b.turn] = used + g; return g; }
  function regenMp(b, t, v, ev, label) { if (t.dead || !(v > 0)) return 0; var s = st(b, t); var mm = maxMp(t); var used = s.healMp[b.turn] || 0; var room = Math.floor(mm * CAP.mpRegen) - used; var g0 = Math.min(v, room); if (g0 <= 0) return 0; var m0 = t.mp; t.mp = Math.min(mm, t.mp + g0); var g = t.mp - m0; if (g > 0) { s.healMp[b.turn] = used + g; msg(ev, label + '：' + t.name + 'のMPが' + g + '回復した'); } return g; }
  UG._regenHp = regenHp; UG._regenMp = regenMp;

  /* ---------- 与えるダメージ（物理：Combat の attackEnemy の中） ---------- */
  function scanned(t) { var d = D(); return !!(d && d.bestiary && d.bestiary[t.defId] && d.bestiary[t.defId].scanned); }
  function buffedFoe(t) { var bf = t.buffs || {}; return (bf.atk && bf.atk.turns > 0 && bf.atk.value > 0) || (bf.mag && bf.mag.turns > 0 && bf.mag.value > 0); }
  // 戻り値：{ mult, critAdd, fixed, suppress: { firstStrike, afterDefend, highHp, momentum } }
  UG.outPhys = function (b, a, target, opts, el) {
    var act = b && b.ug && b.ug.act; var none = { mult: 1, critAdd: 0, fixed: false, suppress: {} };
    if (!act || act.a !== a || act.cat === 'ult' || !a.equip) return none;
    var E = act.E; if (!Object.keys(E).length) return none;
    var normal = !!opts.normal && act.cat === 'normal'; var direct = normal || act.cat === 'skill';
    if (!direct) return none;
    var s = st(b, a); var K0 = K(); var ps = K0.pstats(a); var es = K0.estats(target); var mh = maxHp(a); var m = 1; var sup = {}; var w;
    function add(v) { m *= 1 + v; }
    if (normal) {
      if ((w = E.firstNormal) && !a._firstHit) { var ex = fxMax(a, 'firstStrike') || 0; if (w.v > ex) { add(w.v); sup.firstStrike = true; } }
      if (a._defTurn === b.turn - 1) { var exd = fxMax(a, 'afterDefend') || 0; var u = 0; if (E.afterDefendNormal) u = E.afterDefendNormal.v; if (E.lowHpDefendNormal && s.defendLow === b.turn - 1) u = Math.max(u, E.lowHpDefendNormal.v); if (u > exd) { add(u); sup.afterDefend = true; } }
      if ((w = E.highHpNormal) && a.hp >= mh * w.above) { var eh = fxMax(a, 'highHp'); var ev0 = eh && a.hp >= mh * eh.above ? eh.mult : 0; if (w.v > ev0) { add(w.v); sup.highHp = true; } }
      if ((w = E.prevNormalNormal) && s.lastNormalTurn === b.turn - 1) { var em = fxMax(a, 'momentum'); var emv = em && a._atkTurn === b.turn - 1 ? em : 0; if (w.v > emv) { add(w.v); sup.momentum = true; } }
      if ((w = E.afterHurtNormal) && s.hurtUntil >= b.turn) { add(w.v); act.consume.hurt = true; }
      if ((w = E.sameTargetNormal) && s.lastNormalTurn === b.turn - 1 && s.lastNormalTarget === target.idx) { add(w.v); act.chained = target; }
      if ((w = E.everyThirdNormal) && act.third) add(w.v);
      if ((w = E.tides) && b.turn % 2 === 1) add(w.odd);
      if ((w = E.cleanNormal) && !Object.keys(a.status || {}).length) add(w.v);
    }
    if ((w = E.fasterFoePhys) && es.agi > ps.agi) add(w.v);
    if ((w = E.curedNextPhys) && s.curedUntil >= b.turn) { add(w.v); act.consume.cured = true; }
    if ((w = E.silencedPhys) && target.status && target.status.silence) add(w.v);
    commonDirect(b, a, target, act, E, s, add, K0.resistOf(target, el));
    m = Math.min(m, CAP.outMult);
    var critAdd = 0; if (normal) { if (E.normalCrit) critAdd += E.normalCrit.v; if (E.critPity && act.pity) critAdd += E.critPity.v; }
    return { mult: m, critAdd: critAdd, fixed: normal && !!E.fixedRoll, suppress: sup };
  };
  function commonDirect(b, a, target, act, E, s, add, resist) {
    var w;
    if ((w = E.cycleDirect) && b.turn % w.n === 0 && act.firstDirect) add(w.v);
    if ((w = E.defendNextDirect) && a._defTurn === b.turn - 1 && act.firstDirect) add(w.v);
    if ((w = E.switchStyle) && act.switched) add(w.direct);
    if ((w = E.scannedWeak) && resist > 1 && scanned(target)) add(w.v);
    if ((w = E.vsCharging) && target.charging) add(w.v);
    if ((w = E.vsBuffed) && buffedFoe(target)) add(w.v);
    if ((w = E.balance) && act.hpStart >= w.above) add(w.dmg);
    if ((w = E.contract)) add((contractMode() === 'attack' ? w.attack : w.guard).dmg);
  }
  // 物理が当たったあと（ダメージは確定）：hp0 は当たる前の HP（倒しすぎた分を除くため）
  UG.afterPhysHit = function (b, a, target, dmg, crit, opts, hp0, ev) {
    var act = b && b.ug && b.ug.act; if (!act || act.a !== a) return;
    var real = Math.max(0, Math.min(dmg, hp0)); act.dmg += real; if (crit) act.crit = true;
    var normal = !!opts.normal && act.cat === 'normal';
    act.hits.push({ t: target, dmg: real, normal: normal });
    if (normal) { act.normalDmg += real; if (!act.primary) act.primary = target; }
    var E = act.E, w;
    // 労役を断つ：通常攻撃が当たると敵の防御を 2 ターン 20% 下げる（重ならない・1行動1回）
    if ((w = E.normalHitDebuff) && normal && real > 0 && target.hp > 0 && !act.rolled.nhd) { act.rolled.nhd = true; var cur = target.buffs[w.stat]; if (!(cur && cur.turns > 0 && cur.value <= w.v)) { target.buffs[w.stat] = { value: w.v, turns: w.turns + 1 }; msg(ev, w.src + '【労役を断つ】：' + target.name + 'の防御が下がった（2ターン）'); } }
  };
  // 既存の「当たると○%で状態異常」（onHitStatus）を 1 行動 1 回の判定にする（その効果を持つボス固有装備のとき）
  UG.rollOnce = function (b, a, key) {
    var act = b && b.ug && b.ug.act; if (!act || act.a !== a || !act.E.onHitOncePerAction) return true;
    if (act.rolled[key]) return false; act.rolled[key] = true; return true;
  };
  // 防御した次のターンの通常攻撃（既存の afterDefend と同じ意味）：固有効果のほうが大きいとき true（そのときは既存の分を足さない）
  UG.afterDefendOver = function (b, a, ex) {
    var act = b && b.ug && b.ug.act; var E = act && act.a === a ? act.E : effectsOf(a); var s = st(b, a); var u = 0;
    if (E.afterDefendNormal) u = E.afterDefendNormal.v; if (E.lowHpDefendNormal && s.defendLow === b.turn - 1) u = Math.max(u, E.lowHpDefendNormal.v);
    return u > (ex || 0);
  };
  UG.noteExtra = function (b, a, v) { var act = b && b.ug && b.ug.act; if (act && act.a === a) act.extra += v; };
  UG.extraRoom = function (b, a, base) { var act = b && b.ug && b.ug.act; if (!act || act.a !== a) return Infinity; return Math.max(0, Math.floor(Math.max(base, act.normalDmg || base) * CAP.extra) - act.extra); };
  UG.onKill = function (b, a) { var act = b && b.ug && b.ug.act; if (act && act.a === a) act.kills++; };
  UG.suppressKillMp = function (b, a) { var E = effectsOf(a); var ex = fxMax(a, 'killMp') || 0; return !!(E.killMp && E.killMp.v >= ex); };

  /* ---------- 与えるダメージ（攻撃呪文：applySkill の magic） ---------- */
  UG.outSpell = function (b, a, t, sk, resist) {
    var act = b && b.ug && b.ug.act; if (!act || act.a !== a || act.cat !== 'spell') return 1;
    var E = act.E; if (!Object.keys(E).length) return 1; var s = st(b, a); var m = 1; var w;
    function add(v) { m *= 1 + v; }
    if ((w = E.weakSpell) && resist > 1) add(w.v);
    if ((w = E.silencedSpell) && t.status && t.status.silence) add(w.v);
    if ((w = E.stillness) && act.still) add(w.v);
    if ((w = E.firstElementSpell) && sk.element && sk.element !== 'none' && !s.elements[sk.element]) { add(w.v); act.spellElems = act.spellElems || {}; act.spellElems[sk.element] = true; }
    commonDirect(b, a, t, act, E, s, add, resist);
    return Math.min(m, CAP.outMult);
  };
  UG.afterSpellHit = function (b, a, t, dmg, sk, resist, nTargets, ev) {
    var act = b && b.ug && b.ug.act; if (!act || act.a !== a) return; var real = Math.max(0, dmg); act.dmg += real; if (resist > 1 && real > 0) act.weak = true;
    var E = act.E; var w;
    // 禁書解読：単体の攻撃呪文でダメージを与えた敵に 15% で沈黙（1行動・1対象 1 回。敵の耐性あり）
    if ((w = E.spellSilence) && nTargets === 1 && real > 0 && !t.dead && !act.spellTargets[t.idx]) { act.spellTargets[t.idx] = true; if (K().addStatus(t, { id: 'silence', chance: w.chance }, w.chance, false)) msg(ev, w.src + '【禁書解読】：' + t.name + 'は沈黙状態になった'); }
  };

  /* ---------- MP の消費 ---------- */
  UG.mpCost = function (b, a, sk, cost) {
    if (!(cost > 0)) return cost; var act = b && b.ug && b.ug.act; var E = act && act.a === a ? act.E : effectsOf(a); if (!Object.keys(E).length) return cost;
    var cut = 0; if (E.mpCut) cut += E.mpCut.v;
    if (act && act.a === a) { if (E.switchStyle && act.switched && act.cat === 'support') cut += E.switchStyle.mp; if (E.stillness && act.still && ['spell', 'support'].indexOf(act.cat) >= 0) cut += E.stillness.mp; }
    cut = Math.min(CAP.mpCut, cut); if (cut <= 0) return cost;
    return Math.max(1, Math.ceil(cost * (1 - cut)));
  };
  UG.paidMp = function (b, a, paid, sk, tgt) { var act = b && b.ug && b.ug.act; if (!act || act.a !== a) return; act.paid += paid; if (act.cat === 'support' && sk && (sk.target === 'ally' || sk.target === 'dead_ally') && tgt) { var p = b.party.filter(function (q) { return q.id === tgt.id; })[0]; act.supportTarget = p || a; } else if (act.cat === 'support' && sk && sk.target === 'self') act.supportTarget = a; else if (act.cat === 'support' && sk && sk.target === 'allies') act.supportTarget = a; };

  /* ---------- 回復の呪文 ---------- */
  UG.healBase = function (a, hm) { var E = effectsOf(a); if (E.healBoost) return Math.max(hm || 1, 1 + E.healBoost.v); return hm; };
  UG.healTarget = function (b, a, t, sk) {
    var act = b && b.ug && b.ug.act; var E = act && act.a === a ? act.E : effectsOf(a); var m = 1; var w;
    if ((w = E.healDebuffed) && Object.keys(t.buffs || {}).some(function (k) { var x = t.buffs[k]; return x && x.turns > 0 && x.value < 0; })) m *= 1 + w.v;
    if ((w = E.lowTargetHeal) && t.hp <= maxHp(t) * w.below) m *= 1 + w.v;
    if ((w = E.defendThenHeal) && a._defTurn === b.turn - 1) m *= 1 + w.v;
    if ((w = E.stillness) && act && act.a === a && act.still) m *= 1 + w.v;
    return Math.min(m, CAP.healMult);
  };
  // 2 ターンの被ダメージ軽減（同じ仕組み：重ねず、大きいほう。期限は新しく付けた日から）
  function grantCut(b, t, v, turns) { var s = st(b, t); var live = s.cutUntil >= b.turn ? s.cutV : 0; s.cutV = Math.max(live, v); s.cutUntil = Math.max(live >= v ? s.cutUntil : -9, b.turn + turns); }
  UG._grantCut = grantCut;
  UG.afterHeal = function (b, a, t, healed, sk, ev) {
    if (!(healed > 0)) return; var E = effectsOf(a); var w;
    if ((w = E.healGrantCut) && !t.dead) { grantCut(b, t, w.v, w.turns); msg(ev, w.src + '【数字の向こう側】：' + t.name + 'の受けるダメージ-' + Math.round(w.v * 100) + '%（2ターン）'); }
  };
  UG.afterRevive = function (b, a, t, sk, ev) {
    var E = effectsOf(a); var w = E.reviveBoost; if (!w || t.dead) return; var s = st(b, a); if (s.reviveUses >= w.max) return; s.reviveUses++;
    heal(b, t, Math.floor(maxHp(t) * w.hp), ev, w.src + '【灯をつなぐ】');
    grantCut(b, t, w.cut, w.turns); msg(ev, t.name + 'の受けるダメージ-' + Math.round(w.cut * 100) + '%（2ターン）');
  };

  /* ---------- 防御 ---------- */
  UG.defendMp = function (a, existing) { var E = effectsOf(a); if (E.defendMp && E.defendMp.v > (existing || 0)) return { v: E.defendMp.v, src: E.defendMp.src }; return existing ? { v: existing, src: fxSrc(a, 'defendMp') } : null; };
  UG.onDefend = function (b, a, ev) {
    var E = effectsOf(a); if (!Object.keys(E).length) return; var s = st(b, a); var w;
    if (E.lowHpDefendNormal && a.hp <= maxHp(a) * E.lowHpDefendNormal.below) s.defendLow = b.turn;
    if ((w = E.defendHeal) && s.defendHealTurn !== b.turn) { s.defendHealTurn = b.turn; heal(b, a, Math.floor(maxHp(a) * w.v), ev, w.src + '【停止と進行】'); }
    if ((w = E.spellDefendMp) && s.lastSpellTurn === b.turn - 1) { var mm = maxMp(a); var m0 = a.mp; a.mp = Math.min(mm, a.mp + Math.floor(mm * w.v)); if (a.mp > m0) msg(ev, w.src + '【結晶共鳴】：' + a.name + 'のMPが' + (a.mp - m0) + '回復した'); }
  };

  /* ---------- 受けるダメージ ---------- */
  // 単体の物理攻撃をかわす率（装備の回避の上限 25% の内側）
  UG.evadeAdd = function (t, opts) { if (opts && (opts.aoe || opts.proc)) return 0; var E = effectsOf(t); return E.evadeSingle ? E.evadeSingle.v : 0; };
  // 属性の被ダメージ（既存の partyResist の積に掛ける。下限は partyResist の 0.4）
  UG.dynResist = function (a, element) {
    var b = UG.cur; if (!b || !b.ug || !element || element === 'none') return 1; var s = b.ug.a[a.id]; if (!s || !s.adaptive) return 1;
    return s.adaptive.el === element && s.adaptive.until >= b.turn ? 1 - s.adaptive.v : 1;
  };
  // partyTakes の中：一般の直接被ダメージ軽減（合わせて 40% まで）→ 攻勢の契約の増加 → 1 戦 1 回の軽減
  UG.takeDirect = function (b, t, dmg, hit, ev) {
    if (!(dmg > 0) || !b || !hit) return dmg; var E = effectsOf(t); if (!Object.keys(E).length) return dmg;
    var s = st(b, t); var mh = maxHp(t); var cuts = []; var w; var single = !hit.aoe; var names = [];
    function cut(v, src) { if (v > 0) { cuts.push(v); names.push(src); } }
    if ((w = E.bigHitCut) && dmg > mh * w.over) cut(w.v, w.src + '【欲望の上限】');
    if ((w = E.scannedCut) && hit.enemy && scanned(hit.enemy)) cut(w.v, w.src + '【記録照合】');
    if ((w = E.aoeCut) && hit.aoe) cut(t.defending && w.defending ? w.defending : w.v, w.src);
    if ((w = E.coverCut) && t.cover && single) cut(w.v, w.src + '【守る誓い】');
    if ((w = E.lowHpCut) && t.hp <= mh * w.below) cut(w.v, w.src + '【解放者の意志】');
    if ((w = E.tides) && b.turn % 2 === 0) cut(w.even, w.src + '【満ち引き】');
    if ((w = E.bigSingleCut) && single && dmg > mh * w.over && s.bigSingleTurn !== b.turn) { s.bigSingleTurn = b.turn; cut(w.v, w.src + '【事象の薄膜】'); }
    if ((w = E.afterCounterCut) && single && s.afterCounterUntil >= b.turn) { s.afterCounterUntil = -9; cut(w.v, w.src + '【沈黙の城壁】'); }
    if ((w = E.balance)) { var r0 = b.ug.eact && b.ug.eact.startHp[t.id]; if (r0 === undefined) r0 = t.hp / mh; if (r0 < w.above) cut(w.cut, w.src + '【均衡の軌道】'); }
    if ((w = E.contract) && contractMode() === 'guard') cut(-w.guard.taken, w.src);
    if (s.cutUntil >= b.turn && s.cutV > 0) cut(s.cutV, '軽減の加護');
    var f = 1; cuts.forEach(function (c) { f *= 1 - c; }); f = Math.max(f, 1 - CAP.cut);
    var out = dmg * f;
    if ((w = E.contract) && contractMode() === 'attack') out *= 1 + w.attack.taken;
    if ((w = E.firstSingleCut) && single && !s.used.firstSingle) { s.used.firstSingle = true; out *= 1 - w.v; msg(ev, w.src + '【' + (w.v >= 0.5 ? '蜃気楼の身代わり' : '不正な徴収を防ぐ') + '】：最初の一撃を' + Math.round(w.v * 100) + '%軽減した'); }
    return Math.max(1, Math.round(out));
  };
  // 倒れるとき：損失限定（HP30%以上で受けた敵の 1 回の直接攻撃の行動で倒れるなら、その行動の残りも含め HP1。1戦1回）
  UG.lethalSave = function (b, t, dmg, hit, ev) {
    if (!b || !b.ug || !hit) return null; var eact = b.ug.eact; if (!eact) return null;
    if (eact.saved[t.id]) return Math.max(0, Math.min(dmg, t.hp - 1));
    if (t.hp - dmg > 0) return null; var E = effectsOf(t); var w = E.lethalSave; if (!w) return null; var s = st(b, t);
    var r0 = eact.startHp[t.id]; if (s.used.lethal || r0 === undefined || r0 < w.from || t.hp <= 1) return null;
    s.used.lethal = true; eact.saved[t.id] = true; msg(ev, t.name + 'は' + w.src + '【損失限定】で踏みとどまった！'); return t.hp - 1;
  };
  // 受けたあと（HP は確定）
  UG.afterTaken = function (b, t, e, dmg, hit, ev) {
    if (!b || !b.ug || !hit) return; if (b.ug.eact) b.ug.eact.hit[t.id] = true;
    var E = effectsOf(t); if (!Object.keys(E).length) return; var s = st(b, t); var w;
    if ((w = E.adaptiveResist) && hit.element && hit.element !== 'none' && dmg > 0) { s.adaptive = { el: hit.element, until: b.turn + 1, v: w.v }; }
    if (t.dead || t.hp <= 0) return;
    if ((w = E.afterHurtNormal) && dmg > 0) s.hurtUntil = b.turn + 1;
    if (!hit.aoe && hit.kind === 'phys' && !hit.proc && e && !e.dead && e.hp > 0 && dmg > 0) {
      if ((w = E.reflectPhys)) { var rd = Math.min(Math.floor(dmg * w.v), Math.floor(maxHp(t) * w.cap)); if (rd > 0) { e.hp = Math.max(0, e.hp - rd); ev.push({ type: 'damage', side: 'enemy', idx: e.idx, value: rd, anim: 'fire' }); msg(ev, t.name + 'の' + w.src + '【溶岩の皮膜】！ ' + e.name + 'に' + rd + 'のダメージ'); if (e.hp <= 0) K().killEnemy(b, e, ev); } }
      if ((w = E.counterOnce) && !e.dead && e.hp > 0 && s.counterTurn !== b.turn && Math.random() < w.chance) {
        s.counterTurn = b.turn; var K0 = K(); var cd = K0.early(t, 'deal', K0.physDamage(K0.pstats(t).atk, K0.estats(e).def, 1.0)); e.hp = Math.max(0, e.hp - cd);
        ev.push({ type: 'damage', side: 'enemy', idx: e.idx, value: cd, anim: 'slash' }); msg(ev, t.name + 'の' + w.src + 'の反撃！ ' + e.name + 'に' + cd + 'のダメージ'); if (e.hp <= 0) K0.killEnemy(b, e, ev);
        if (E.afterCounterCut) s.afterCounterUntil = b.turn + 1;
      }
    }
  };
  UG.stealAdjust = function (b, amt, ev) {
    if (!(amt > 0) || !b) return amt; var best = null; b.party.forEach(function (a) { if (a.dead) return; var e = has(a, 'stealCut'); if (e && (!best || e.v > best.v)) best = e; });
    if (!best) return amt; var out = Math.floor(amt * (1 - best.v)); if (out < amt) msg(ev, best.src + '【不正な徴収を防ぐ】：奪われる額を' + (amt - out) + 'G抑えた'); return out;
  };
  // MP を減らす攻撃（今のゲームには使う敵がいない。仕組みだけ）：最初の 1 回を 0 にする
  UG.mpLossGuard = function (b, t, amount, ev) { var E = effectsOf(t); if (!E.mpLossGuard || !b) return amount; var s = st(b, t); if (s.used.mpGuard) return amount; s.used.mpGuard = true; msg(ev, t.name + 'の' + E.mpLossGuard.src + '【記憶を守る】：MPは減らなかった'); return 0; };

  /* ---------- 状態異常・能力低下 ---------- */
  UG.statusMult = function (t, id) { var E = effectsOf(t); var w = E.statusCut; if (!w || !w.v || !w.v[id]) return 1; return 1 - w.v[id]; };
  // 能力低下（敵の特殊行動 sp.debuff）：無効・強さの軽減・最初の 1 回を打ち消す。戻り値 { block: true } または { mult: { k: 倍率 } }
  UG.debuffFilter = function (t, sp, say) {
    var E = effectsOf(t); if (!Object.keys(E).length) return null; var b = UG.cur; var mult = {}; var any = false; var real = false;
    Object.keys(sp.debuff || {}).forEach(function (k) {
      var m = 1; if (E.debuffImmune && E.debuffImmune.keys.indexOf(k) >= 0) m = 0; else if (E.debuffCut && E.debuffCut.v && E.debuffCut.v[k]) m = 1 - E.debuffCut.v[k];
      mult[k] = m; if (m !== 1) any = true; if (m > 0 && sp.debuff[k] < 0) real = true;
    });
    // 誤記訂正：実際に下がる能力があるときだけ、最初の 1 回（いくつかの能力が一度に下がる技は 1 回分）を打ち消す
    if (real && E.debuffBlockOnce && b) { var s = st(b, t); if (!s.used.debuffBlock) { s.used.debuffBlock = true; if (say) say(t.name + 'の' + E.debuffBlockOnce.src + '【誤記訂正】：能力の低下を打ち消した'); return { block: true }; } }
    return any ? { mult: mult } : null;
  };
  UG.onCured = function (t, ev) { var b = UG.cur; if (!b || t.dead) return; var E = effectsOf(t); if (E.curedNextPhys) { st(b, t).curedUntil = b.turn + 1; msg(ev, t.name + 'の' + E.curedNextPhys.src + '【解放の反撃】：次の物理攻撃に力がこもった'); } };

  /* ---------- ターンの終わり（味方の毒・状態の残りを減らしたあと） ---------- */
  var CLEANSE = ['poison', 'paralyze', 'silence', 'confuse', 'sleep'];
  var CLEAR = ['atk', 'def', 'mag', 'mdef', 'agi'];
  UG.endTurn = function (b, ev) {
    if (!b || !b.ug) return;
    b.party.forEach(function (a) {
      if (a.dead) return; var E = effectsOf(a); if (!Object.keys(E).length) return; var s = st(b, a); var w;
      if ((w = E.statusCleanseOnce) && !s.used.cleanse) { var k = CLEANSE.filter(function (x) { return a.status && a.status[x]; })[0]; if (k) { s.used.cleanse = true; delete a.status[k]; msg(ev, a.name + 'の' + w.src + '【不安の鎮静】：' + root.Combat.STATUS_NAME[k] + 'が治った'); } }
      if ((w = E.periodicDebuffClear) && b.turn % w.n === 0) { var dk = CLEAR.filter(function (x) { var bf = a.buffs && a.buffs[x]; return bf && bf.turns > 0 && bf.value < 0; })[0]; if (dk) { delete a.buffs[dk]; msg(ev, a.name + 'の' + w.src + '【自分で決める】：' + ({ atk: '攻撃力', def: '守備力', mag: '魔力', mdef: '魔法防御', agi: '素早さ' })[dk] + 'の低下を消した'); } }
      if ((w = E.rampHeal)) { var rd = root.Combat.fx(a, 'rampDef'); if (rd && Math.min(rd.max, rd.per * (b.turn - 1)) >= rd.max - 1e-9) regenHp(b, a, Math.floor(maxHp(a) * w.v), ev, w.src + '【満ち足りる器】'); }
    });
  };

  /* =========================================================
     報酬：台帳・正規の勝利だけに 1 個
     ========================================================= */
  UG.ensure = function (d) {
    if (!d) return null; var L = d.bossUniqueRewards;
    if (!L || typeof L !== 'object') L = d.bossUniqueRewards = {};
    if (!L.version) L.version = 1; if (!L.claimed || typeof L.claimed !== 'object') L.claimed = {}; if (!L.pending || typeof L.pending !== 'object') L.pending = {}; if (!L.modes || typeof L.modes !== 'object') L.modes = {};
    return L;
  };
  UG.rows = function () { return DATA().rows; };
  UG.row = function (key) { return DATA().byKey[key] || null; };
  UG.rowOfItem = function (id) { return DATA().byItem[id] || null; };
  UG.locked = function (id) { var it = IT()[id]; return !!(it && it.bossExclusive); };
  // いま遊べる行（2D 版・地球の世界なしでは、外した地域・異界の門のボスの行は数えない）
  UG.isActive = function (row) {
    if (!row || row.availability !== 'active') return false; if (!IT()[row.itemId]) return false;
    var EN = root.ENEMIES || {}; if (!row.enemyIds.every(function (id) { return EN[id]; })) return false;
    var MD = root.MAP_DEFS || {}; if (row.sourceMapIds.length && !row.sourceMapIds.some(function (m) { return MD[m]; })) return false;
    return true;
  };
  UG.activeRows = function () { return DATA().rows.filter(UG.isActive); };
  // 持っている数（持ち物＋主人公と全員の仲間の装備。控えも含む）
  UG.ownedCount = function (d, id) {
    if (!d) return 0; var n = (d.inventory && d.inventory[id]) || 0;
    [d.hero].concat(Object.keys(d.companions || {}).map(function (k) { return d.companions[k]; })).forEach(function (a) { if (a && a.equip) Object.keys(a.equip).forEach(function (sl) { if (a.equip[sl] === id) n++; }); });
    return n;
  };
  // 正規の戦闘の鍵：マップの type:'boss' のイベント（doneFlag で決まる。設計表の撃破の根拠と同じフラグ）
  UG.keyForEvent = function (ev) {
    if (!ev) return null; if (ev.bossRewardKey) return ev.bossRewardKey;
    var row = DATA().byDoneFlag[ev.doneFlag]; if (!row || row.availability !== 'active') return null;
    var ids = ev.enemies || [ev.enemy]; if (!row.enemyIds.every(function (id) { return ids.indexOf(id) >= 0; })) return null;
    return row.key;
  };
  // 会話の c.battle(ids, { boss: true })：ボスの敵 ID で決まる（E 表のイベント中ボスは、呼ぶ場所で encounter ID を渡す）
  UG.keyForScript = function (ids, opts) {
    if (opts && opts.bossRewardKey) return opts.bossRewardKey; if (!opts || !opts.boss || !ids) return null;
    for (var i = 0; i < ids.length; i++) { var row = DATA().byKey[ids[i]]; if (row && row.availability === 'active' && row.group !== 'E') return row.key; }
    return null;
  };
  // その戦闘が、その行の正規の戦闘か（敵の顔ぶれ）
  function battleMatches(b, row) {
    var ids = b.enemies.filter(function (e) { return !e.summoned; }).map(function (e) { return e.defId; });
    var need = {}; row.enemyIds.forEach(function (id) { need[id] = (need[id] || 0) + 1; });
    return Object.keys(need).every(function (id) { return ids.filter(function (x) { return x === id; }).length >= need[id]; });
  }
  UG.grantOnce = function (key, ctx) {
    ctx = ctx || {}; var d = D(); var row = UG.row(key); var res = { key: key, itemId: row ? row.itemId : null, granted: false, reason: '' };
    if (!d || !row) { res.reason = 'unknown'; return res; }
    if (row.availability !== 'active') { res.reason = 'reserved'; return res; }
    if (!UG.isActive(row)) { res.reason = 'inactive'; return res; }
    if (ctx.battle) { var b = ctx.battle; if (b.state !== 'won' || b.bossRewardKey !== key || !battleMatches(b, row)) { res.reason = 'not-legit'; return res; } }
    var L = UG.ensure(d);
    if (L.claimed[key]) { res.reason = 'claimed'; return res; }
    var n = UG.ownedCount(d, row.itemId);
    if (n >= 1) { L.claimed[key] = { item: row.itemId, at: Date.now(), via: ctx.via || 'battle', note: n > 1 ? 'duplicate-owned' : 'already-owned' }; if (n > 1) { L.dupes = L.dupes || {}; L.dupes[row.itemId] = n; } res.reason = 'owned'; return res; }
    root.State.addItem(row.itemId, 1);
    L.claimed[key] = { item: row.itemId, at: Date.now(), via: ctx.via || 'battle' };
    if (d.flags) d.flags['seen_item_' + row.itemId] = true;
    res.granted = true; return res;
  };
  // Combat.distribute から：勝ちが確定した戦闘の固有報酬（1 戦に 1 回）
  UG.grantForBattle = function (b) {
    if (!b || !b.bossRewardKey || b.ugGrant) return b && b.ugGrant || null;
    var r = UG.grantOnce(b.bossRewardKey, { battle: b, via: 'battle' }); b.ugGrant = r; return r;
  };

  /* ---------- 旧セーブの補填（遊び始めに 1 回） ---------- */
  // 根拠：設計表の撃破フラグ（そのボス戦の勝利でだけ立つ）。図鑑の撃破数は、敵が正規のボス戦以外で出ないことを確かめたボス（A〜D）にだけ使う（E は使わない）
  function summonedSomewhere(id) { var EN = root.ENEMIES || {}; return Object.keys(EN).some(function (k) { return (EN[k].actions || []).some(function (x) { return x.summon === id; }); }); }
  UG.evidence = function (d, row) {
    if (row.defeatFlags.some(function (f) { return d.flags && d.flags[f]; })) return 'flag';
    if (UG.bestiaryEligible(row)) { var be = d.bestiary && d.bestiary[row.enemyIds[0]]; if (be && be.defeated > 0) return 'bestiary'; }
    return null;
  };
  // 図鑑の撃破数を根拠にしてよい行（A〜D・敵 1 体の行・ボスの定義・どの敵にも呼び出されない）
  UG.bestiaryEligible = function (row) { return !!(row && row.group !== 'E' && row.enemyIds.length === 1 && root.ENEMIES[row.enemyIds[0]] && root.ENEMIES[row.enemyIds[0]].boss && !summonedSomewhere(row.enemyIds[0])); };
  UG.reconcile = function (d) {
    var out = { granted: [], ledgerOnly: [], dupes: [] }; if (!d) return out; var L = UG.ensure(d);
    UG.activeRows().forEach(function (row) {
      var n = UG.ownedCount(d, row.itemId); if (n > 1) out.dupes.push({ item: row.itemId, n: n });
      if (L.claimed[row.key]) return; var ev = UG.evidence(d, row); if (!ev) return;
      if (n >= 1) { L.claimed[row.key] = { item: row.itemId, at: Date.now(), via: 'migrate-' + ev, note: 'already-owned' }; out.ledgerOnly.push(row.itemId); return; }
      d.inventory[row.itemId] = (d.inventory[row.itemId] || 0) + 1; L.claimed[row.key] = { item: row.itemId, at: Date.now(), via: 'migrate-' + ev }; out.granted.push(row.itemId);
    });
    if (out.dupes.length) { L.dupes = L.dupes || {}; out.dupes.forEach(function (x) { L.dupes[x.item] = x.n; }); if (root.console) console.warn('BossGear: 同じ固有装備を複数持っている（消さずに残す）', out.dupes); }
    return out;
  };
  UG.afterStart = function () {
    var d = D(); if (!d) return; var r = UG.reconcile(d); UG.lastReconcile = r;
    if (!r.granted.length) return;
    var saved = root.State.autosave();
    var names = r.granted.map(function (id) { return IT()[id].name; });
    var lines = ['過去の討伐記録から固有装備を受け取りました：' + r.granted.length + '点', names.join('・')];
    if (saved === false) lines.push('（保存に失敗しました。メニューの「セーブ」でもう一度保存してください）');
    var tries = 0; (function show() { var W = root.World, Win = root.Win; if (!W || !Win || !Win.message) return; if (W.busy && tries++ < 40) { setTimeout(show, 250); return; } W.busy = true; Promise.resolve(Win.message(lines)).then(function () { W.busy = false; }, function () { W.busy = false; }); })();
  };

  /* =========================================================
     画面の部品（アイコン・詳細・リザルト・図鑑）
     ========================================================= */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  var GLYPH = { sword: '剣', axe: '斧', spear: '槍', staff: '杖', bow: '弓', claw: '爪', club: '槌', dagger: '短', heavy: '鎧', light: '衣', robe: '衣', shield: '盾', helm: '兜', hat: '冠', acc: '飾' };
  function colorsOf(row) { if (row.col) return row.col; var e = root.ENEMIES && root.ENEMIES[row.enemyIds[0]]; var c = e && e.art && e.art.c; return c ? [c.base || '#6a6a8a', c.accent || c.eye || '#ffd24a'] : ['#6a6a8a', '#ffd24a']; }
  // アイコン：画像ではなく文字と色（読めない画像で一覧が崩れない）
  UG.iconHtml = function (id) { var row = UG.rowOfItem(id); var it = IT()[id]; if (!row || !it) return ''; var c = colorsOf(row); return '<span class="bu-icon" style="background:' + esc(c[0]) + ';border-color:' + esc(c[1]) + ';color:' + esc(c[1]) + '" aria-hidden="true">' + esc(GLYPH[it.type] || '◆') + '</span>'; };
  UG.sourceText = function (row, reveal) {
    if (!row) return ''; var EN = root.ENEMIES || {}; var e = EN[row.enemyIds[0]];
    if (row.encounter) return reveal ? row.encSource : '？？？（イベントの戦い）';
    return reveal && e ? e.name + '（' + (e.area || '') + '）' : '？？？';
  };
  UG.statLine = function (it) { if (root.Services && root.Services.statLine) return root.Services.statLine(it); var p = []; [['atk', '攻撃'], ['def', '防御'], ['mag', '魔力'], ['mdef', '魔法防御'], ['agi', '素早さ'], ['hp', '最大HP'], ['mp', '最大MP']].forEach(function (k) { if (it[k[0]]) p.push(k[1] + '+' + it[k[0]]); }); return p.join(' '); };
  // 装備できる職業：ほとんどの職業で使えるときは「すべての職業（〜を除く）」と短く出す（スマホで長くならないように）
  UG.jobsText = function (it) {
    if (!(root.Services && root.Services.equipJobs)) return ''; var can = root.Services.equipJobs(it); var J = root.JOBS || {}; var all = (root.JOB_LIST || Object.keys(J)).map(function (j) { return J[j] && J[j].name; }).filter(Boolean);
    var no = all.filter(function (n) { return can.indexOf(n) < 0; });
    if (all.length >= 8 && can.length === all.length) return 'すべての職業'; if (all.length >= 8 && no.length && no.length <= 4) return 'すべての職業（' + no.join('・') + 'を除く）';
    return can.join('・');
  };
  UG.whoCanEquip = function (id) { var d = D(); if (!d) return []; return [d.hero].concat(Object.keys(d.companions || {}).map(function (k) { return d.companions[k]; })).filter(function (a) { return a && root.Actors.canEquip(a, id); }).map(function (a) { return a.name; }); };
  // どうぐ・図鑑の詳細に足す行（基礎値の比較とは別の欄）
  UG.detailHtml = function (id) {
    var it = IT()[id]; var row = UG.rowOfItem(id); if (!it || !row || !it.bossExclusive) return '';
    var d = D(); var L = d ? UG.ensure(d) : null; var claimed = L && L.claimed[row.key];
    var h = '<div class="bu-detail"><div class="bu-tag">' + UG.iconHtml(id) + '<b>ボス固有装備</b>　初回撃破報酬・このボス戦でのみ入手・非売品（売る・捨てることはできない）</div>';
    h += '<div class="bu-eff"><b>【' + esc(it.uniqueName) + '】</b>' + esc(it.uniqueText) + '</div>';
    h += '<div class="muted small">入手先：' + esc(UG.sourceText(row, true)) + (claimed ? '　（受け取り済み）' : '') + '</div>';
    if (id === 'b19_crossroads_blade') h += '<div class="small">いまの契約：<b>' + (contractMode() === 'attack' ? '攻勢の契約' : '守勢の契約') + '</b>（図鑑の「ボス固有装備」・どうぐで切り替え。戦闘中は変わらない）</div>';
    return h + '</div>';
  };
  // 撃破のリザルト画面に出す欄
  UG.resultHtml = function (grant) {
    if (!grant || !grant.granted) return ''; var id = grant.itemId; var it = IT()[id]; var row = UG.rowOfItem(id); if (!it || !row) return '';
    var kind = (root.ItemCat && root.ItemCat.GENRES.filter(function (g) { return g.id === root.ItemCat.of(id); })[0] || {}).name || '';
    var who = UG.whoCanEquip(id);
    return '<h3>ボス固有装備</h3><div class="bu-result">' + (root.ItemIcons ? root.ItemIcons.detailHtml(id, { size: 64 }) : '') + UG.iconHtml(id) + '<div class="bu-r-body"><div class="bu-r-name">' + esc(it.name) + ' <span class="muted small">' + esc(kind) + '</span></div>' +
      '<div class="small">' + esc(UG.statLine(it)) + '</div><div class="small"><b>【' + esc(it.uniqueName) + '】</b>' + esc(it.uniqueText) + '</div>' +
      '<div class="muted small">装備できる：' + esc(who.length ? who.join('・') : 'いまの仲間にはいない') + '（職業：' + esc(UG.jobsText(it)) + '）　入手先：' + esc(UG.sourceText(row, true)) + '</div></div></div>';
  };
  // 図鑑：ボス固有装備の一覧（分母はいま遊べる行だけ）
  UG.collection = function () {
    var d = D(); var L = d ? UG.ensure(d) : { claimed: {} }; var EN = root.ENEMIES || {};
    return UG.activeRows().map(function (row) {
      var it = IT()[row.itemId]; var owned = d ? UG.ownedCount(d, row.itemId) > 0 : false; var claimed = !!L.claimed[row.key];
      var defeated = d && UG.evidence(d, row); var seen = row.group === 'E' ? !!defeated : !!(d && d.bestiary && d.bestiary[row.enemyIds[0]] && d.bestiary[row.enemyIds[0]].seen);
      return { row: row, item: it, owned: owned, claimed: claimed, defeated: !!defeated, seen: seen || claimed || owned, state: claimed || owned ? '受け取り済み' : defeated ? '討伐済み・未受け取り' : seen ? '未討伐' : '未発見' };
    });
  };
  UG.contractChoose = async function () {
    var Win = root.Win; var d = D(); if (!Win || !d) return; var L = UG.ensure(d); var cur = contractMode();
    var i = await Win.choice('分かれ道の魔剣【選択の契約】：いまは「' + (cur === 'attack' ? '攻勢' : '守勢') + 'の契約」。戦闘の前に選ぶ（戦闘中は変わらない）', ['攻勢の契約（与える直接ダメージ+10%・受ける直接ダメージ+10%）', '守勢の契約（与える直接ダメージ-5%・受ける直接ダメージ-10%）', 'やめる']);
    if (i === 0) L.modes.b19_crossroads_blade = 'attack'; else if (i === 1) L.modes.b19_crossroads_blade = 'guard'; else return;
    await Win.message(['契約を「' + (i === 0 ? '攻勢' : '守勢') + 'の契約」にした。']);
  };
  UG.listPanel = async function () {
    var Win = root.Win; var list = UG.collection(); var got = list.filter(function (x) { return x.claimed || x.owned; }).length;
    var rows = list.map(function (x) {
      var known = x.seen; var it = x.item;
      return { label: known ? it.name : '？？？', right: x.state, sub: known ? ('【' + it.uniqueName + '】' + it.uniqueText) : (x.row.group === 'E' ? 'イベントの戦い' : 'まだ会っていないボス'), disabled: !known, cls: x.claimed || x.owned ? 'bu-got' : '', itemId: known ? it.id : undefined };   // v9.5 知っている行だけ絵
    });
    while (true) {
      var r = await Win.list(rows, { title: 'ボス固有装備（' + got + '/' + list.length + '）', info: function (k) { var x = list[k]; return x && x.seen ? '<div class="it-detail' + (root.ItemIcons ? ' has-art">' + root.ItemIcons.detailHtml(x.item.id) : '">') + '<div class="it-text"><div class="it-name">' + UG.iconHtml(x.item.id) + esc(x.item.name) + '</div><div class="small">' + esc(UG.statLine(x.item)) + '</div><div class="muted small">' + esc(x.item.lore || '') + '</div>' + UG.detailHtml(x.item.id) + '<div class="muted small">装備できる職業：' + esc(UG.jobsText(x.item)) + '</div><div class="muted small">状態：' + esc(x.state) + '</div></div></div>' : '<div class="muted">？？？</div>'; } });
      if (r === -1 || r === undefined || r === null || typeof r === 'object') return;
      var x = list[r]; if (x && x.item.id === 'b19_crossroads_blade' && (x.owned || x.claimed)) await UG.contractChoose();
    }
  };

  /* ---------- 組み込み：新しいゲーム・読み込み・遊び始め ---------- */
  (function install() {
    var S = root.State; if (S && S.newGame && !S._ug87) { S._ug87 = true; var ng = S.newGame; S.newGame = function () { var d = ng.apply(this, arguments); UG.ensure(d); return d; }; }
    if (S && S.migrate && !S._ugm87) { S._ugm87 = true; var mg = S.migrate; S.migrate = function (d) { var r = mg.apply(this, arguments); UG.ensure(r); return r; }; }   // 形だけ（補填はしない）
    var W = root.World; if (W && W.start && !W._ug87) { W._ug87 = true; var ws = W.start; W.start = function () { var r = ws.apply(this, arguments); try { UG.afterStart(); } catch (e) { if (root.console) console.error('BossGear.afterStart', e); } return r; }; }
  })();

  root.BossGear = UG;
})(typeof window !== 'undefined' ? window : globalThis);
