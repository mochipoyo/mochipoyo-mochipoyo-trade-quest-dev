/* =========================================================
   RPG / Ultimates：必殺技の管理・ダメージの決め方・セーブの名前空間・試験の採点（DOM に依存しない。Node でもテストできる）
   ・役割（指示書の名前）：
       UltimateSkillManager   … 習得（レベル・師匠の試験）・使える条件（主人公だけ・MP・クールダウン・状態異常）・使用回数・成績
       UltimateDamageResolver … 決済の結果（利益・損失・ほぼゼロ・見送り）と、判断した時点の相場の見立てから、威力と追加効果を決める
       UltimateSaveMigration  … セーブの d.ultimate（新しい名前空間）を作る・壊れた値を直す。既存の項目には触れない
       （試験の採点）          … Ultimates.score / Ultimates.examResult（正解は一つではない前提で、判断の過程・結果・理由を分けて点にする）
   ・戦闘での流れ：コマンド入力のときにチャートを開き、ロング・ショート・見送りを決めて決済まで進める（js/ui/battle.js・js/ui/chartbattle.js）
       → 結果はコマンド { type:'ultimate', ultId, target, trade } に入れて戻す（このときはまだ HP も MP も変えない）
       → ターンの実行（Combat.runTurn）で Ultimates.execute が MP を1回だけ使い、ダメージと効果を計算する（HP は演出の再生で減る）
   ・見送りは「防御」と同じ（被ダメージ半減）。見送りが適切だった（根拠がそろっていなかった）ときだけ MP の一部が戻る（使った分まで。増えることはない）
       見送り専門の技の強い守りは1戦闘に1回まで（見送りを繰り返して有利にならない）
   ========================================================= */
(function (root) {
  'use strict';
  var REG = root.ULTIMATES || {}, LIST = root.ULTIMATE_LIST || [], SCHOOLS = root.ULTIMATE_SCHOOLS || [], MASTERS = root.TRADER_MASTERS || {};

  var U = {};
  U.SAVE_VERSION = 1;
  U.PROFIT_CAP = 4.5;      // 利益のときの威力（主の一撃）の上限：通常攻撃の4.5倍
  U.RECENT_MAX = 30;       // 最近使ったシナリオ（続けて同じものが出にくいように）
  U.STATUS_BLOCK = ['sleep', 'paralyze', 'confuse'];   // この状態のときは選べない（チャートを開いたあとに動けず、判断が無駄になるのを防ぐ）

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function sgn(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }
  function dirOf(side) { return side === 'long' ? 1 : side === 'short' ? -1 : 0; }

  /* ---------- 登録データ（UltimateSkillRegistry） ---------- */
  U.get = function (id) { return REG[id] || null; };
  U.list = function () { return LIST.slice(); };
  U.school = function (sid) { for (var i = 0; i < SCHOOLS.length; i++) if (SCHOOLS[i].id === sid) return SCHOOLS[i]; return null; };
  U.schools = function () { return SCHOOLS.slice(); };
  U.bySchool = function (sid) { return LIST.filter(function (id) { return REG[id].school === sid; }); };
  U.masterOf = function (sid) { var s = U.school(sid); return s ? MASTERS[s.master] || null : null; };
  U.examTech = function (sid, kind) { var ids = U.bySchool(sid); return kind === 'advanced' ? ids[3] : ids[1]; };
  U.learnText = function (def) {
    if (def.learn.type === 'level') return 'レベル' + def.learn.level + 'で習得';
    var m = MASTERS[def.learn.master]; return (m ? m.name : '師匠') + 'の' + (def.learn.exam === 'advanced' ? '上級試験（10問）' : '初級試験（5問）') + 'に合格';
  };
  U.DIFF_NAME = ['', 'やさしい', 'ふつう', 'むずかしい', 'とてもむずかしい', '最高難度'];

  /* ---------- セーブの名前空間（UltimateSaveMigration） ---------- */
  function emptyMode() { return { n: 0, wins: 0, losses: 0, flats: 0, skips: 0 }; }
  U.emptyStats = function () { return { trades: 0, wins: 0, losses: 0, flats: 0, skips: 0, autoSkips: 0, tp: 0, sl: 0, timeExit: 0, pips: 0, sumR: 0, bestR: null, worstR: null, byMode: {}, byCat: {}, bySchool: {} }; };
  U.defaults = function () { return { v: U.SAVE_VERSION, learned: {}, uses: {}, seen: {}, masters: {}, stats: U.emptyStats(), recent: [], notice: [] }; };
  // 足りない項目を補い、型の違う値（壊れた値）を初期値に戻す。知らない ID の記録は消さずに残す（新しい版で増えた技を古い版で読み込んでも失わない）
  U.ensure = function (d) {
    if (!d || typeof d !== 'object') return null;
    var u = d.ultimate;
    if (!u || typeof u !== 'object' || Array.isArray(u)) u = d.ultimate = U.defaults();
    var def = U.defaults();
    Object.keys(def).forEach(function (k) { var a = u[k], b = def[k]; if (a === undefined || a === null || typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) u[k] = b; });
    var st = u.stats, es = U.emptyStats();
    Object.keys(es).forEach(function (k) { if (k === 'bestR' || k === 'worstR') { if (typeof st[k] !== 'number' || !isFinite(st[k])) st[k] = null; return; } var a = st[k]; if (a === undefined || a === null || typeof a !== typeof es[k] || (typeof a === 'number' && !isFinite(a)) || Array.isArray(a)) st[k] = es[k]; });
    Object.keys(u.learned).forEach(function (id) { var e = u.learned[id]; if (!e || typeof e !== 'object') u.learned[id] = { by: 'unknown', t: 0 }; });
    Object.keys(u.uses).forEach(function (id) { if (typeof u.uses[id] !== 'number' || !(u.uses[id] >= 0)) u.uses[id] = 0; });
    u.recent = u.recent.filter(function (x) { return typeof x === 'string'; }).slice(-U.RECENT_MAX);
    u.notice = u.notice.filter(function (x) { return typeof x === 'string' && REG[x]; });
    Object.keys(u.masters).forEach(function (mid) { if (!u.masters[mid] || typeof u.masters[mid] !== 'object' || Array.isArray(u.masters[mid])) delete u.masters[mid]; });
    if (!(u.v >= 1)) u.v = U.SAVE_VERSION;
    return u;
  };
  U.heroLevel = function (d) { var h = d && d.hero; if (!h) return 0; var lv = h.level || 1; var jl = h.jobLevels || {}; Object.keys(jl).forEach(function (j) { var v = jl[j]; if (typeof v === 'number' && v > lv) lv = v; }); return lv; };

  /* ---------- 習得（UltimateSkillManager） ---------- */
  // レベルで覚える技をそろえる（何度呼んでも同じ。レベルを一気に上げた・職業を変えた・古いセーブを読み込んだときも取りこぼさない）
  //   職業ごとのレベルのうち一番高いものを使う（職業を変えても、一度覚えた技は消えない）。返り値：新しく覚えた ID
  U.sync = function (d, opts) {
    var u = U.ensure(d); if (!u) return [];
    var lv = U.heroLevel(d); var got = [];
    LIST.forEach(function (id) { var x = REG[id]; if (x.learn.type === 'level' && lv >= x.learn.level && !u.learned[id]) { u.learned[id] = { by: 'level', t: Date.now(), lv: x.learn.level }; got.push(id); } });
    if (got.length && (!opts || opts.notice !== false)) got.forEach(function (id) { if (u.notice.indexOf(id) < 0) u.notice.push(id); });
    return got;
  };
  U.learn = function (d, id, by) { var u = U.ensure(d); if (!u || !REG[id] || u.learned[id]) return false; u.learned[id] = { by: by || 'master', t: Date.now() }; if (u.notice.indexOf(id) < 0) u.notice.push(id); return true; };
  U.has = function (d, id) { var u = d && d.ultimate; return !!(u && u.learned && u.learned[id] && REG[id]); };
  U.learnedList = function (d) { var u = U.ensure(d); if (!u) return []; return LIST.filter(function (id) { return u.learned[id]; }); };
  U.count = function (d) { return U.learnedList(d).length; };
  U.isHero = function (a) { return !!a && a.id === 'hero'; };
  U.recordUse = function (d, id) { var u = U.ensure(d); if (!u) return; u.uses[id] = (u.uses[id] || 0) + 1; };
  U.markSeen = function (d, id) { var u = U.ensure(d); if (!u) return false; var first = !u.seen[id]; if (first) u.seen[id] = Date.now(); return first; };
  U.clearNotice = function (d, id) { var u = U.ensure(d); if (!u) return; if (id) u.notice = u.notice.filter(function (x) { return x !== id; }); else u.notice = []; };

  /* ---------- 使える条件（主人公だけ・MP・クールダウン・状態異常） ----------
     クールダウン：ターン T に使った技（待ち時間 C）は、ターン T+C+1 から使える。b.ultReady[ID]＝使えるようになるターン（戦闘ごと。セーブしない） */
  U.readyIn = function (b, id) { var r = b && b.ultReady && b.ultReady[id]; if (!r) return 0; return Math.max(0, r - ((b.turn || 0) + 1)); };
  U.usable = function (b, a, id) {
    var def = REG[id]; if (!def) return { ok: false, why: '不明な技' };
    if (!U.isHero(a)) return { ok: false, why: '必殺技は主人公だけが使える' };
    if (a.dead) return { ok: false, why: '戦闘不能' };
    var st = a.status || {}; for (var i = 0; i < U.STATUS_BLOCK.length; i++) if (st[U.STATUS_BLOCK[i]]) return { ok: false, why: '眠り・麻痺・混乱のときは使えない' };
    if (a.mp < def.mp) return { ok: false, why: 'MPが足りない' };
    var cd = U.readyIn(b, id); if (cd > 0) return { ok: false, why: 'あと' + cd + 'ターン', cd: cd };
    return { ok: true };
  };
  U.lock = function (b, id) { var def = REG[id]; if (!b || !def) return; b.ultReady = b.ultReady || {}; b.ultReady[id] = ((b.turn || 0) + 1) + def.cd + 1; };

  /* ---------- シナリオを選ぶ ----------
     技（または流派）の出やすい相場を多めにしつつ、ほかの相場も混ぜる（Market.pick）。最近使ったシナリオは避ける。シードは毎回変える（同じ ID・同じシードなら同じチャート） */
  U.diffFor = function (def) { var d = def.difficulty || 1; return [Math.max(1, d - 1), Math.min(5, d)]; };
  U.examDiff = function (sch, kind) { var base = Math.max(1, Math.min(5, Math.round(1 + (sch.no - 1) * 4 / 9))); return kind === 'advanced' ? [base, Math.min(5, base + 1)] : [Math.max(1, base - 1), base]; };
  U.newSeed = function () { var a = Math.floor(Math.random() * 0x7fffffff); var b = (Date.now() * 2654435761) >>> 0; return (a ^ b) >>> 0; };
  U.newScenario = function (opts) {
    var M = root.Market; opts = opts || {};
    var pick = opts.id ? M.def(opts.id) : M.pick({ cats: opts.cats, diff: opts.diff, avoid: opts.avoid, rnd: opts.rnd });
    var seed = opts.seed !== undefined ? opts.seed >>> 0 : U.newSeed();
    return M.build(pick.id, seed);
  };
  U.scenarioForUlt = function (d, def) { var u = U.ensure(d); return U.newScenario({ cats: def.cats, diff: U.diffFor(def), avoid: u ? u.recent : [] }); };

  /* ---------- 判断した時点の相場の状態（追加威力・採点に使う。見えていた足だけで計算した Market.assess の結果から） ---------- */
  U.conditions = function (as, side) {
    var dir = dirOf(side); if (!as || !dir) return { agree: 0, trendDir: 0, chaseDir: 0 };
    var s40 = Math.abs(as.slope40) >= 0.5 ? sgn(as.slope40) : 0;
    var trendDir = 0; if (!as.inRange) { if (as.order !== 0 && (as.dow === as.order || s40 === as.order)) trendDir = as.order; else if (as.dow !== 0 && s40 === as.dow) trendDir = as.dow; }
    var edge = !!as.inRange && ((as.rangePos <= 0.25 && dir > 0) || (as.rangePos >= 0.75 && dir < 0));
    var div = as.div || {}; var divDir = div.bull && !div.bear ? 1 : div.bear && !div.bull ? -1 : 0;
    var rciDir = as.rciTurnUp ? 1 : as.rciTurnDown ? -1 : 0;
    var evid = [as.order, as.dow, as.upperDir, s40, as.breakout, divDir, rciDir, edge ? dir : 0];
    var agree = evid.filter(function (v) { return v === dir; }).length;
    var chaseDir = as.chase ? sgn(as.distEma) : 0;
    return {
      trend: trendDir === dir, strongTrend: trendDir === dir && Math.abs(as.slope40) >= 1.5 && as.order === dir && as.dow === dir,
      emaAlign: as.order === dir, pullback: trendDir === dir && !!as.nearEma && !as.chase, rangeEdge: edge, breakout: as.breakout === dir,
      fade: (as.breakout !== 0 && as.breakout === -dir) || chaseDir === -dir, divergence: divDir === dir, rciTurn: rciDir === dir,
      mtf: as.upperDir === dir, mtfAll: as.upperDir === dir && as.order === dir && as.dow !== -dir, highVol: as.volRatio >= 1.6, dow: as.dow === dir,
      structureBreak: (as.dow === dir && as.order === -dir) || (as.breakout === dir && s40 === -dir), multi: agree >= 3,
      notChase: chaseDir !== dir && as.volRatio < 2.2, agree: agree, trendDir: trendDir, chaseDir: chaseDir
    };
  };
  // 見送りが適切だったか：根拠がそろっていない・はっきりしない・飛び乗りになる・急変動の最中
  U.appropriateSkip = function (as) { return !!as && (as.bias === 'none' || as.clarity < 0.25 || !!as.chase || as.volRatio >= 2.2); };

  /* ---------- 威力（UltimateDamageResolver） ----------
     利益：利確に近いほど大きい（損益÷ATR が 0.15 で最小、1.8＝利確で最大）× 追加威力（判断した時点の相場の状態が条件に合えば）。上限は通常攻撃の4.5倍
     損失：小さな損ほど大きい（損切りまで行くと最小）。ほぼゼロ：flat（0.6〜0.75）。見送り：ダメージなし（防御） */
  U.resolve = function (def, trade) {
    var R = (trade && trade.result) || {}; var out = { kind: R.outcome || 'skip', mult: 0, base: 0, bonusMult: 1, bonuses: [], hits: 1, extra: null, aoe: 0, appropriateSkip: false };
    if (out.kind === 'skip') { out.appropriateSkip = U.appropriateSkip(trade && trade.assessment); return out; }
    if (out.kind === 'profit') {
      var t = clamp01((R.r - 0.15) / (1.8 - 0.15)); var base = lerp(def.profit[0], def.profit[1], t); var bm = 1;
      var cond = U.conditions(trade.assessment, R.side);
      (def.bonus || []).forEach(function (bn) { if (cond[bn.when]) { bm *= bn.mult; out.bonuses.push({ label: bn.label, mult: bn.mult }); } });
      out.base = r2(base); out.bonusMult = r2(bm); out.mult = r2(Math.min(U.PROFIT_CAP, base * bm));
      out.hits = def.fx.hits || 1; out.aoe = def.fx.aoe || 0;
      if (def.fx.extraOnTp && R.exit && R.exit.reason === 'tp') out.extra = { hits: def.fx.extraOnTp.hits, mult: def.fx.extraOnTp.mult };
    } else if (out.kind === 'loss') {
      var t2 = clamp01(Math.abs(R.r) / 1.0); var m = lerp(def.loss[1], def.loss[0], t2); if (def.fx.lossFloor) m = Math.max(m, def.fx.lossFloor);
      out.mult = r2(m); out.base = out.mult;
    } else { out.kind = 'flat'; out.mult = def.flat; out.base = def.flat; }
    return out;
  };
  // 演出の種類（js/data/fx65.js の FX65.DEFS）。利益は技の固有の演出、損失・ほぼゼロは弱い一撃、見送りは守り
  U.fxKey = function (cmd) { var o = cmd && cmd.trade && cmd.trade.result ? cmd.trade.result.outcome : 'skip'; return cmd.ultId + (o === 'profit' ? '' : o === 'skip' ? ':skip' : ':weak'); };
  var PHYS = { slash: 'swing', slash_multi: 'swing', pierce: 'thrust', heavy: 'chop', wind_blade: 'swing', trend_break: 'dash', resistance_break: 'chop', wave: 'swing', candles: 'swing', ema_line: 'swing' };
  U.registerFx = function () {
    var F = root.FX65; if (!F || !F.DEFS) return 0; var n = 0;
    LIST.forEach(function (id) {
      var x = REG[id]; var an = x.anim;
      F.DEFS[id] = { id: id, fx: F.KINDS[an.fx] ? an.fx : 'slash', motion: PHYS[an.fx] || 'cast', color: an.color, color2: an.color2, area: an.area || 'single', hits: an.hits || 1, unique: true, ultimate: true, big: x.order === 5 };
      F.DEFS[id + ':weak'] = { id: id + ':weak', fx: 'slash', motion: 'swing', color: '#9aa6c4', color2: '#ffffff', area: 'single', hits: 1, ultimate: true };
      F.DEFS[id + ':skip'] = { id: id + ':skip', fx: 'barrier', motion: 'guard', color: '#9fd0ff', color2: '#ffffff', area: 'single', hits: 1, ultimate: true };
      n++;
    });
    return n;
  };

  /* ---------- 戦闘での実行（Combat.runTurn から呼ぶ。K は combat.js の内部の関数） ---------- */
  function fmtPips(p) { return (p > 0 ? '+' : '') + (Math.round(p * 10) / 10).toFixed(1) + 'pips'; }
  U.fmtPips = fmtPips;
  var BUFF_NAME = { atk: '攻撃力', def: '防御力', agi: '素早さ', guard: '守り（被ダメージ軽減）' };
  U.execute = function (b, a, cmd, ev, K) {
    function msg(t) { ev.push({ type: 'msg', text: t }); }
    var def = REG[cmd.ultId]; var trade = cmd.trade;
    if (!def || !trade || !trade.result || !U.isHero(a)) { msg('しかし何も起こらなかった'); return; }
    if (b._ultTurn === b.turn) { msg('しかし何も起こらなかった'); return; }   // 念のため：同じターンに2回は出ない
    b._ultTurn = b.turn;
    var cost = def.mp; if (a.mp < cost) { msg(a.name + 'はMPが足りない！'); return; }
    a.mp -= cost;   // MP はここで1回だけ使う
    var d = root.State && root.State.data; if (d) U.recordUse(d, def.id);
    var res = U.resolve(def, trade); var R = trade.result; var maxMp = K.maxMp(a);
    msg(a.name + 'の必殺技「' + def.name + '」！');
    if (res.kind === 'skip') {
      a.defending = true; a._defTurn = b.turn;
      msg((trade.auto ? '判断の時間が過ぎた――見送り。' : '見送り。') + a.name + 'は身を守っている');
      ev.push({ type: 'anim', side: 'party', id: a.id, anim: 'buff' });
      if (res.appropriateSkip) {
        var refund = Math.ceil(cost / 2); var special = !!(def.fx.skipGuard || def.fx.skipMp);
        if (special && !b.ultSkipBonus) {
          b.ultSkipBonus = true;
          if (def.fx.skipGuard) { K.aliveParty(b).forEach(function (t) { t.buffs.guard = { value: def.fx.skipGuard.value, turns: def.fx.skipGuard.turns + 1 }; }); msg('適切な見送り！ 味方全体の守りが固まった（被ダメージ -' + Math.round(def.fx.skipGuard.value * 100) + '%・' + def.fx.skipGuard.turns + 'ターン）'); }
          if (def.fx.skipMp) refund = cost;   // 見送り専門の技：使った MP が全部戻る（1戦闘に1回）
        }
        var m0 = a.mp; a.mp = Math.min(maxMp, a.mp + Math.min(cost, refund));   // 戻るのは使った分まで（見送りで MP が増えることはない）
        if (a.mp > m0) msg('見送りが適切だった（根拠がそろっていなかった）。MPが' + (a.mp - m0) + '戻った');
      }
      return;
    }
    var label = res.kind === 'profit' ? (R.exit.reason === 'tp' ? '利確' : '時間切れで利益') : res.kind === 'loss' ? (R.exit.reason === 'sl' ? '損切り' : '時間切れで損失') : 'ほぼ同値で決済';
    msg(label + '（' + fmtPips(R.pips) + '）――威力 ×' + res.mult.toFixed(2));
    res.bonuses.forEach(function (bn) { msg('追加威力 ×' + bn.mult + '：' + bn.label); });
    var alive = K.aliveEnemies(b); if (!alive.length) return;
    var aoe = res.kind === 'profit' && res.aoe > 0;
    var first = b.enemies[cmd.target ? cmd.target.idx : -1]; if (!first || first.dead) first = alive[0];
    var targets = aoe ? alive : [first];
    var hits = res.kind === 'profit' ? Math.max(1, res.hits) : 1;
    var pierce = res.kind === 'profit' ? (def.fx.pierce || 0) : 0, crit = res.kind === 'profit' ? (def.fx.crit || 0) : 0;
    var atk = K.atkOf(a);
    // 1回あたりの威力：連撃でも合計が1回で当てたときと同じくらいになるように（1回ごとに引かれる防御の分を足す）
    function perHit(t, total, n) { var dfn = K.defOf(t) * (1 - pierce); return n <= 1 ? total : total / n + (n - 1) * 0.5 * dfn / (n * Math.max(1, atk)); }
    function powerFor(t) { var p = res.mult * (aoe ? res.aoe : 1); if (res.kind === 'profit' && def.fx.boss && t.boss) p *= def.fx.boss; return p; }
    for (var h = 0; h < hits; h++) {
      if (targets.length > 1) K.beginGroup('enemy');
      targets.forEach(function (t) { if (t.dead) return; K.attackEnemy(b, a, t, perHit(t, powerFor(t), hits), { element: 'none', pierce: pierce, crit: crit, anim: 'slash' }, ev); });
      K.endGroup();
      if (!aoe && targets[0].dead) { var nx = K.aliveEnemies(b)[0]; if (!nx || h === hits - 1) break; targets = [nx]; }
      if (aoe && targets.every(function (t) { return t.dead; })) break;
    }
    if (res.extra) {   // 利確まで伸びたときの追撃
      msg('利確まで伸びた！ 追撃！');
      for (var x = 0; x < res.extra.hits; x++) { var tx = !aoe && targets[0] && !targets[0].dead ? targets[0] : K.aliveEnemies(b)[0]; if (!tx) break; K.attackEnemy(b, a, tx, res.extra.mult, { element: 'none', pierce: pierce, anim: 'slash' }, ev); }   // 追撃1回＝通常攻撃の mult 倍
    }
    a._atkTurn = b.turn; a._firstHit = true;
    var fx = def.fx; var main = targets.filter(function (t) { return !t.dead; });
    if (res.kind === 'profit') {
      if (fx.expose) main.forEach(function (t) { t.exposed = Math.max(t.exposed || 0, fx.expose); msg(t.name + 'の守りが崩れた！（' + fx.expose + 'ターン）'); });
      if (fx.debuff) main.forEach(function (t) { Object.keys(fx.debuff).forEach(function (k) { if (k !== 'turns') t.buffs[k] = { value: fx.debuff[k], turns: fx.debuff.turns || 2 }; }); msg(t.name + 'の' + Object.keys(fx.debuff).filter(function (k) { return k !== 'turns'; }).map(function (k) { return BUFF_NAME[k] || k; }).join('・') + 'が下がった'); });
      if (fx.status) main.forEach(function (t) { if (K.addStatus(t, { id: fx.status.id, chance: fx.status.chance })) msg(t.name + 'は' + K.statusName(fx.status.id) + '状態になった'); });
      if (fx.partyBuff) { var pb = fx.partyBuff; K.aliveParty(b).forEach(function (t) { Object.keys(pb).forEach(function (k) { if (k !== 'turns') t.buffs[k] = { value: pb[k], turns: (pb.turns || 2) + 1 }; }); }); msg('味方全体の' + Object.keys(pb).filter(function (k) { return k !== 'turns'; }).map(function (k) { return BUFF_NAME[k] || k; }).join('・') + 'が上がった（' + (pb.turns || 2) + 'ターン）'); }
      if (fx.heal) { var hl = K.aliveParty(b); if (hl.length > 1) K.beginGroup('party'); hl.forEach(function (t) { var mh = K.maxHp(t); var h0 = t.hp; t.hp = Math.min(mh, t.hp + Math.max(1, Math.round(mh * fx.heal))); if (t.hp > h0) ev.push({ type: 'heal', side: 'party', id: t.id, value: t.hp - h0 }); }); K.endGroup(); msg('味方全体のHPが回復した'); }
      if (fx.mpBack) { var mb0 = a.mp; a.mp = Math.min(maxMp, a.mp + Math.max(1, Math.round(cost * fx.mpBack))); if (a.mp > mb0) msg(a.name + 'のMPが' + (a.mp - mb0) + '戻った'); }
      if (fx.charge) { a.buffs.charge = { value: fx.charge, turns: 3 }; msg(a.name + 'の次の攻撃に力がこもった（+' + Math.round(fx.charge * 100) + '%）'); }
      if (fx.cdCut && R.exit && R.exit.reason === 'tp' && b.ultReady) { var cut = 0; Object.keys(b.ultReady).forEach(function (k) { if (k !== def.id && b.ultReady[k] > b.turn + 1) { b.ultReady[k] = Math.max(b.turn + 1, b.ultReady[k] - fx.cdCut); cut++; } }); if (cut) msg('ほかの必殺技の待ち時間が' + fx.cdCut + 'ターン短くなった'); }
    } else if (res.kind === 'loss' && fx.guardOnLoss) {
      K.aliveParty(b).forEach(function (t) { t.buffs.guard = { value: fx.guardOnLoss.value, turns: fx.guardOnLoss.turns + 1 }; });
      msg('損失を受け止めた。味方全体の守りが固まった（被ダメージ -' + Math.round(fx.guardOnLoss.value * 100) + '%・' + fx.guardOnLoss.turns + 'ターン）');
    }
  };

  /* ---------- 成績の記録 ---------- */
  // info: { mode:'battle'|'practice'|'exam', ultId, school, scenarioId, cat, seed, side, auto, result }
  U.recordTrade = function (d, info) {
    var u = U.ensure(d); if (!u) return; var st = u.stats; var R = info.result || {}; var o = R.outcome || 'skip';
    var m = st.byMode[info.mode]; if (!m || typeof m !== 'object') m = st.byMode[info.mode] = emptyMode();
    var c = info.cat ? (st.byCat[info.cat] && typeof st.byCat[info.cat] === 'object' ? st.byCat[info.cat] : (st.byCat[info.cat] = emptyMode())) : null;
    var s = info.school ? (st.bySchool[info.school] && typeof st.bySchool[info.school] === 'object' ? st.bySchool[info.school] : (st.bySchool[info.school] = emptyMode())) : null;
    [m, c, s].forEach(function (x) { if (!x) return; x.n = (x.n || 0) + 1; var k = o === 'profit' ? 'wins' : o === 'loss' ? 'losses' : o === 'flat' ? 'flats' : 'skips'; x[k] = (x[k] || 0) + 1; });
    if (o === 'skip') { st.skips++; if (info.auto) st.autoSkips++; }
    else {
      st.trades++; if (o === 'profit') st.wins++; else if (o === 'loss') st.losses++; else st.flats++;
      var rs = R.exit && R.exit.reason; if (rs === 'tp') st.tp++; else if (rs === 'sl') st.sl++; else st.timeExit++;
      if (typeof R.pips === 'number' && isFinite(R.pips)) st.pips = Math.round((st.pips + R.pips) * 10) / 10;
      if (typeof R.r === 'number' && isFinite(R.r)) { st.sumR = r2(st.sumR + R.r); st.bestR = st.bestR === null ? R.r : Math.max(st.bestR, R.r); st.worstR = st.worstR === null ? R.r : Math.min(st.worstR, R.r); }
    }
    if (info.scenarioId) { u.recent.push(info.scenarioId); if (u.recent.length > U.RECENT_MAX) u.recent = u.recent.slice(-U.RECENT_MAX); }
    u.last = { t: Date.now(), mode: info.mode, ult: info.ultId || null, scenario: info.scenarioId || null, seed: info.seed >>> 0, side: info.side, outcome: o, pips: R.pips || 0 };
  };

  /* ---------- 師匠の記録・試験（TraderMasterManager の記録の部分） ---------- */
  function emptyExam() { return { passed: false, best: 0, last: null, attempts: 0 }; }
  U.master = function (d, mid) {
    var u = U.ensure(d); if (!u) return null; var m = u.masters[mid];
    if (!m || typeof m !== 'object') m = u.masters[mid] = {};
    ['beginner', 'advanced'].forEach(function (k) { if (!m[k] || typeof m[k] !== 'object' || Array.isArray(m[k])) m[k] = emptyExam(); var e = m[k]; if (typeof e.best !== 'number') e.best = 0; if (typeof e.attempts !== 'number') e.attempts = 0; e.passed = !!e.passed; });
    if (typeof m.practice !== 'number') m.practice = 0; if (typeof m.met !== 'number') m.met = 0;
    return m;
  };
  U.examReq = function (d, mid, kind) {
    var M = MASTERS[mid]; if (!M) return { ok: false, why: '不明な師匠' }; var sch = U.school(M.school); var m = U.master(d, mid); var lv = U.heroLevel(d);
    if (kind === 'beginner') { if (lv < sch.levels[0]) return { ok: false, why: 'レベル' + sch.levels[0] + '以上で受けられる（いまレベル' + lv + '）' }; return { ok: true }; }
    if (!m.beginner.passed) return { ok: false, why: '先に初級試験に合格する' };
    if (lv < sch.levels[1]) return { ok: false, why: 'レベル' + sch.levels[1] + '以上で受けられる（いまレベル' + lv + '）' };
    return { ok: true };
  };
  // 試験の結果を記録する。合格して、まだ覚えていなければ技を覚える（何度合格しても1回だけ）。返り値：新しく覚えた ID（なければ null）
  U.recordExam = function (d, mid, kind, result) {
    var M = MASTERS[mid]; var m = U.master(d, mid); if (!M || !m) return null; var e = m[kind]; if (!e) return null;
    e.attempts++; e.last = result.avg; e.best = Math.max(e.best || 0, result.avg); e.lastAt = Date.now();
    var learned = null;
    if (result.pass) { if (!e.passed) { e.passed = true; e.passedAt = Date.now(); } var tid = U.examTech(M.school, kind); if (tid && U.learn(d, tid, 'master')) learned = tid; }
    return learned;
  };

  /* ---------- 採点（正解は一つではない。判断の過程・結果・理由を分ける） ----------
     dec: { side, auto, result, assessment, reason }。過程 0〜60（判断した時点に見えていた根拠と合っているか）、結果 0〜25（負けても過程が良ければ合格できる）、
     理由 0〜15（上級試験だけ。選んだ理由が、判断した時点の相場の状態と合っているか）。初級は過程＋結果の85点満点を100点に換算 */
  var REASON_NAME = { fade: '行き過ぎ・抜けかけの逆', divergence: '逆行', rangeEdge: 'レンジの端', rciTurn: 'RCI の反転', trend: 'トレンドの向き', emaAlign: 'EMA の並び', dow: '高値・安値の並び', pullback: '押し目・戻り', breakout: '高値・安値の突破', mtf: '上位足の向き', mtfAll: '上位足と下位足の一致', structureBreak: '波形の転換', multi: '3つ以上の根拠', strongTrend: '強いトレンド' };
  // 流派ごとの「テーマの根拠」：見立て全体とは逆向きでも、その流派が学ぶ根拠に沿った判断なら、過程の点を高くする（テーマどおりの判断が減点されないように）
  //   どちらの向きにも当てはまりやすい根拠（抜けかけの逆・飛び乗りでない など）はテーマに入れない（どちらに入っても高い点になってしまうため）
  U.THEME = { trend: ['trend', 'emaAlign', 'strongTrend'], pullback: ['pullback', 'trend'], breakout: ['breakout'], range: ['rangeEdge'], divergence: ['divergence', 'rciTurn', 'structureBreak'],
    mtf: ['mtf', 'mtfAll'], volatility: [], risk: ['multi'], structure: ['dow', 'structureBreak'], apex: ['multi'] };
  U.score = function (dec, opts) {
    opts = opts || {}; var as = dec.assessment || {}; var side = dec.side; var dir = dirOf(side); var notes = []; var process = 0; var flags = { opposite: false, chase: false, reckless: false };
    var bdir = dirOf(as.bias); var clear = bdir !== 0 && as.clarity >= 0.25; var c = U.conditions(as, side);
    if (!dir) {
      if (!clear) { process = 60; notes.push('根拠がそろっていない場面での見送り。無理をしない良い判断'); }
      else { process = 32; notes.push('判断した時点では' + (bdir > 0 ? '上' : '下') + '向きの根拠がそろっていた。見送りも間違いではないが、機会を逃したかもしれない'); }
      if (dec.auto) { process = Math.max(0, process - 12); notes.push('時間切れの見送り（自分で決められるとさらに良い）'); }
    } else {
      var theme = (U.THEME[opts.school] || []).filter(function (k) { return c[k]; });
      if (clear && dir === bdir) { process = 60; notes.push('判断した時点の根拠と同じ向きに入った'); }
      else if (clear && dir === -bdir) {
        var why = ['fade', 'divergence', 'rangeEdge', 'rciTurn'].filter(function (k) { return c[k]; });
        if (theme.length) { process = 50; notes.push('全体の流れとは逆だが、この流派の根拠（' + theme.map(function (k) { return REASON_NAME[k] || k; }).join('・') + '）に沿った判断'); }
        else if (why.length) { process = 30; notes.push('根拠のそろった向きとは逆だが、逆張りの根拠（' + why.map(function (k) { return REASON_NAME[k]; }).join('・') + '）はあった'); }
        else { process = 5; flags.opposite = true; notes.push('根拠のそろった向きと逆に入った（流れに逆らう判断）'); }
      } else if (theme.length) { process = 48; notes.push('全体の根拠ははっきりしないが、この流派の根拠（' + theme.map(function (k) { return REASON_NAME[k] || k; }).join('・') + '）に沿った判断'); }
      else { process = c.agree >= 2 ? 34 : 22; notes.push('根拠がそろっていない場面でのエントリー' + (c.agree >= 2 ? '（いくつかの根拠はあった）' : '（見送りも有力だった）')); }
      if (c.chaseDir === dir) { process -= 20; flags.chase = true; notes.push('価格が EMA から大きく離れた所での飛び乗り'); }
      if (as.volRatio >= 2.2) { process -= 10; notes.push('急変動の最中のエントリー（値幅が普段の' + as.volRatio.toFixed(1) + '倍）'); }
      process = Math.max(0, process);
    }
    flags.reckless = flags.opposite || flags.chase;
    var R = dec.result || {}; var outcome;
    if (R.outcome === 'profit') outcome = Math.round(25 * (0.6 + 0.4 * clamp01((R.r - 0.15) / 1.65)));
    else if (R.outcome === 'flat') outcome = 12; else if (R.outcome === 'loss') outcome = 5; else outcome = 12;
    if (R.outcome === 'loss' && process >= 50) notes.push('結果は損失。でも根拠のある判断なら、負けることもある（損切りで損失を小さくできた）');
    var reason = 0;
    if (opts.advanced) { var okR = U.reasonMatch(dec.reason, as, side); reason = okR ? 15 : dec.reason ? 4 : 0; notes.push(okR ? '判断の理由が、その時点の相場の状態と合っていた' : dec.reason ? '選んだ理由は、その時点の相場の状態とは合っていなかった' : '理由を選ばなかった'); }
    var total = opts.advanced ? process + outcome + reason : Math.round((process + outcome) / 85 * 100);
    return { score: Math.max(0, Math.min(100, Math.round(total))), process: process, outcome: outcome, reason: reason, flags: flags, notes: notes };
  };
  U.reasonMatch = function (key, as, side) {
    if (!key || !as) return false; var dir = dirOf(side); var c = U.conditions(as, side);
    switch (key) {
      case 'trend': return !!dir && (c.trend || (c.emaAlign && c.dow));
      case 'pullback': return !!dir && c.pullback;
      case 'breakout': return !!dir && (c.breakout || c.fade);
      case 'range': return !!dir && c.rangeEdge;
      case 'divergence': return !!dir && (c.divergence || c.rciTurn);
      case 'mtf': return !!dir && c.mtf;
      case 'unclear': return !dir && U.appropriateSkip(as);
    }
    return false;
  };
  U.examResult = function (kind, scores) {
    var n = scores.length; var avg = n ? scores.reduce(function (s, x) { return s + x.score; }, 0) / n : 0;
    var opposite = scores.filter(function (x) { return x.flags.opposite; }).length, reckless = scores.filter(function (x) { return x.flags.reckless; }).length;
    var pass = kind === 'advanced' ? (avg >= 65 && reckless <= 2) : (avg >= 60 && opposite <= 1);
    return { avg: Math.round(avg), pass: pass, opposite: opposite, reckless: reckless, n: n, need: kind === 'advanced' ? '平均65点以上・無謀な判断（流れに逆らう・飛び乗り）2問まで' : '平均60点以上・流れに逆らう判断1問まで' };
  };

  // 役割の名前（指示書）でも参照できるように
  root.Ultimates = U;
  root.UltimateSkillRegistry = { list: U.list, get: U.get, schools: U.schools, bySchool: U.bySchool, masters: MASTERS };
  root.UltimateSkillManager = U; root.UltimateDamageResolver = { resolve: U.resolve, conditions: U.conditions, appropriateSkip: U.appropriateSkip };
  root.UltimateSaveMigration = { ensure: U.ensure, defaults: U.defaults, sync: U.sync };
  if (root.Market) { root.MarketScenarioGenerator = root.Market; root.ChartSimulationEngine = root.Market.Sim; root.TradeSettlementEngine = { settle: root.Market.settle, settleOHLC: root.Market.settleOHLC }; root.TradingDecisionEngine = { assess: root.Market.assess }; }
  U.registerFx();
  if (typeof module !== 'undefined' && module.exports) module.exports = U;
})(typeof window !== 'undefined' ? window : globalThis);
