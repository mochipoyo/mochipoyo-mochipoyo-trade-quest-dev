/* =========================================================
   RPG / Quiz（トレードクイズモンスターの共通エンジン。DOM に依存しない。Node でもテストできる）
   ・出題：そのモンスターの20問から、まだ出していない問題を優先して選ぶ（全部出したら一巡して最初から）。選択肢は画面でまぜるが、
     判定は「元の番号」で行う（表示の順番と正解がずれない）。正解・不正解は固定データ（js/data/quiz-monsters.js）だけで決める
   ・確定は1回だけ（Quiz.settle）。同じ確定の番号（token）を2回送っても、ゴールドも報酬も1回しか動かない
     セーブデータの中で「ゴールドの増減」と「記録」を同じときに書くので、保存の途中で失敗・再読み込みしても、片方だけ反映されることはない
       （保存は1つの JSON をまとめて書く。保存前に再読み込みすれば、どちらも反映されていない状態に戻る）
   ・不正解：所持金×割合 と 上限 の小さい方（端数切り捨て。所持金が1G以上で0になるときは1G。所持金0Gなら0G）を1回だけ奪う。
     HP・MP・仲間の状態は変えない。経験値・報酬なし。討伐済みにはしない。モンスターは逃げる（そのマップに入り直すと同じ場所に戻る）
   ・正解：主人公の強さや敵の HP に関係なく即勝利。経験値（生きている仲間）とゴールド。初回の討伐だけ称号と記念アイテム。討伐後は二度と現れない
   ・師匠の流派と知識の分野を共有：その流派で修行（チャート修行・試験）した主人公は、問題の「師匠の教え」（ヒント）を思い出せる。
     上級試験に合格した流派なら、誤りの選択肢を1つ消せる。修行していなくても問題には答えられる（正解の可能性は同じ）
   ・セーブの名前空間 d.quizMon（討伐・挑戦回数・正解・不正解・奪われた累計・初回報酬・出題履歴・称号・確定の記録・出している途中の問題）。旧セーブは初期値で補う
   ・問題を出した時点で「出している途中の問題」（pending：問題・確定の番号・並びの種）を保存する。答える前に閉じても再読み込みしても、次は同じ問題が出る
   ========================================================= */
(function (root) {
  'use strict';
  var Quiz = { VERSION: 1 };
  function MONS() { return root.QUIZ_MONSTERS || []; }
  function QS() { return root.QUIZ_Q || {}; }
  Quiz.monster = function (id) { var L = MONS(); for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; };
  Quiz.question = function (qid) { return QS()[qid] || null; };
  Quiz.questionsFor = function (mid) { return ((root.QUIZ_BY_MONSTER || {})[mid] || []).slice(); };

  /* ---------- セーブ ---------- */
  function emptyMon() { return { defeated: false, defeatedAt: 0, attempts: 0, correct: 0, wrong: 0, stolen: 0, firstReward: false, fled: false, lastAt: 0, seen: false }; }
  Quiz.defaults = function () { return { v: 1, mon: {}, asked: {}, history: {}, titles: [], tokens: [], log: [], pending: {} }; };
  Quiz.ensure = function (d) {
    if (!d || typeof d !== 'object') return null;
    var q = d.quizMon; if (!q || typeof q !== 'object' || Array.isArray(q)) q = d.quizMon = Quiz.defaults();
    var def = Quiz.defaults(); Object.keys(def).forEach(function (k) { var a = q[k], b = def[k]; if (a === undefined || a === null || typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) q[k] = b; });
    MONS().forEach(function (m) { var r = q.mon[m.id]; if (!r || typeof r !== 'object' || Array.isArray(r)) r = q.mon[m.id] = emptyMon(); var e = emptyMon(); Object.keys(e).forEach(function (k) { if (typeof r[k] !== typeof e[k] || (typeof r[k] === 'number' && !isFinite(r[k]))) r[k] = e[k]; }); });
    Object.keys(q.history).forEach(function (k) { if (!Array.isArray(q.history[k])) q.history[k] = []; });
    Object.keys(q.pending).forEach(function (k) { var p = q.pending[k], qq = p && Quiz.question(p.qid); if (!p || typeof p !== 'object' || !qq || qq.mon !== k || typeof p.token !== 'string' || !(p.seed > 0)) delete q.pending[k]; });
    q.titles = q.titles.filter(function (t) { return typeof t === 'string'; }); q.tokens = q.tokens.filter(function (t) { return typeof t === 'string'; }).slice(-50); q.log = q.log.slice(-50);
    return q;
  };
  Quiz.rec = function (d, mid) { var q = Quiz.ensure(d); return q ? q.mon[mid] : null; };

  /* ---------- 出題 ---------- */
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  Quiz.rng = rng;
  Quiz.pick = function (d, mid, rnd) {
    rnd = rnd || Math.random; var q = Quiz.ensure(d); var all = Quiz.questionsFor(mid); if (!all.length) return null;
    var hist = q.history[mid] || (q.history[mid] = []);
    var fresh = all.filter(function (id) { return hist.indexOf(id) < 0; });
    if (!fresh.length) { var last = hist[hist.length - 1]; hist.length = 0; fresh = all.filter(function (id) { return id !== last; }); }   // 一巡したら最初から（直前の問題は避ける）
    return fresh[Math.floor(rnd() * fresh.length)];
  };
  // 表示する順番：[{ text, orig }]（orig＝データでの番号。正解は orig === question.answer）
  Quiz.shuffle = function (qq, rnd) {
    rnd = rnd || Math.random; var a = qq.choices.map(function (t, i) { return { text: t, orig: i }; });
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };
  // 問題を出す：出している途中の問題（pending）があれば同じ問題・同じ並びを返す（再読み込みや中断で、別の問題に引き直せないように）。
  // 新しく出すときは pending に書く（呼んだ側がすぐ保存する）。討伐済みなら null
  Quiz.begin = function (d, mid, rnd) {
    var q = Quiz.ensure(d); var r = q && q.mon[mid]; if (!r || r.defeated) return null;
    var p = q.pending[mid]; var qq = p && Quiz.question(p.qid);
    if (p && qq && qq.mon === mid && q.tokens.indexOf(p.token) < 0) return p;
    rnd = rnd || Math.random; var qid = Quiz.pick(d, mid, rnd); if (!qid) return null;
    p = q.pending[mid] = { qid: qid, token: Quiz.newToken(), seed: 1 + Math.floor(rnd() * 2147483646), t: Date.now() };
    return p;
  };
  Quiz.isCorrect = function (qq, orig) { return !!qq && typeof orig === 'number' && orig === qq.answer; };
  Quiz.newToken = function () { return 'qz' + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36); };

  /* ---------- 奪う金額 ---------- */
  Quiz.stealAmount = function (gold, steal) {
    gold = Math.max(0, Math.floor(gold || 0)); if (gold <= 0) return 0;
    var v = Math.floor(Math.min(gold * steal.rate, steal.cap)); if (v <= 0) v = 1;
    return Math.min(gold, v);
  };

  /* ---------- 師匠の流派との連携 ---------- */
  Quiz.trained = function (d, school) {
    var U = root.Ultimates, MS = root.TRADER_MASTERS || {}; if (!U || !d || !d.ultimate) return { hint: false, remove: false, master: null };
    var mid = null; Object.keys(MS).forEach(function (k) { if (MS[k].school === school) mid = k; }); if (!mid) return { hint: false, remove: false, master: null };
    var r = d.ultimate.masters && d.ultimate.masters[mid]; if (!r || typeof r !== 'object') return { hint: false, remove: false, master: MS[mid] };
    var hint = (r.practice || 0) > 0 || !!(r.beginner && r.beginner.attempts > 0) || !!(r.advanced && r.advanced.attempts > 0);
    return { hint: hint, remove: !!(r.advanced && r.advanced.passed), master: MS[mid] };
  };
  Quiz.help = function (d, qq) {
    var cat = (root.QUIZ_CATS || {})[qq.cat] || {}; var t = Quiz.trained(d, cat.school);
    var sch = root.Ultimates && cat.school ? root.Ultimates.school(cat.school) : null;
    return { cat: cat, school: sch, master: t.master, hint: t.hint ? cat.hint : null, remove: t.remove, locked: !t.hint };
  };
  // 消す誤りの選択肢（上級試験に合格した流派）：問題ごとに決まった1つ（何度開いても同じ）
  Quiz.removable = function (qq) { var h = 0; for (var i = 0; i < qq.id.length; i++) h = (h * 31 + qq.id.charCodeAt(i)) >>> 0; return 1 + (h % 3); };

  /* ---------- 確定（1回だけ） ---------- */
  // ctx: { token, mid, qid, orig, party: [actor], gainExp(actor, n)→[levels] }。返り値：結果（同じ token なら前の結果を返し、何も変えない）
  Quiz.settle = function (d, ctx) {
    var q = Quiz.ensure(d); var m = Quiz.monster(ctx.mid); var qq = Quiz.question(ctx.qid);
    if (!q || !m || !qq || qq.mon !== m.id) return { error: 'bad' };
    var done = q.log.filter(function (x) { return x.token === ctx.token; })[0]; if (done || q.tokens.indexOf(ctx.token) >= 0) return Object.assign({ repeated: true }, done || {});
    var r = q.mon[m.id]; if (r.defeated) return { error: 'defeated' };
    var ok = Quiz.isCorrect(qq, ctx.orig); var res = { token: ctx.token, mid: m.id, qid: qq.id, ok: ok, t: Date.now(), stolen: 0, exp: 0, gold: 0, first: false, title: null, item: null, ups: [] };
    r.attempts++; r.lastAt = res.t;
    var hist = q.history[m.id] || (q.history[m.id] = []); if (hist.indexOf(qq.id) < 0) hist.push(qq.id);
    var a = q.asked[qq.id] || (q.asked[qq.id] = { n: 0, ok: 0 }); a.n++; if (ok) a.ok++;
    if (ok) {
      r.correct++; r.defeated = true; r.defeatedAt = res.t; r.fled = false;
      res.exp = m.exp; res.gold = m.gold; d.gold = (d.gold || 0) + m.gold;
      (ctx.party || []).forEach(function (actor) { if (!actor.dead && ctx.gainExp) { var ups = ctx.gainExp(actor, m.exp) || []; if (ups.length) res.ups.push({ id: actor.id, name: actor.name, levels: ups.length }); } });
      if (!r.firstReward) { r.firstReward = true; res.first = true; res.title = m.title; res.item = m.item.id; if (q.titles.indexOf(m.title) < 0) q.titles.push(m.title); d.inventory = d.inventory || {}; d.inventory[m.item.id] = (d.inventory[m.item.id] || 0) + 1; }
      d.flags = d.flags || {}; d.flags['quiz_defeated_' + m.no] = true;
    } else {
      r.wrong++; r.fled = true; var st = Quiz.stealAmount(d.gold, m.steal); d.gold = Math.max(0, (d.gold || 0) - st); r.stolen += st; res.stolen = st;
    }
    if (q.pending[m.id] && q.pending[m.id].token === ctx.token) delete q.pending[m.id];
    q.tokens.push(ctx.token); if (q.tokens.length > 50) q.tokens = q.tokens.slice(-50);
    q.log.push({ token: res.token, mid: res.mid, qid: res.qid, ok: ok, t: res.t, stolen: res.stolen, exp: res.exp, gold: res.gold, first: res.first }); if (q.log.length > 50) q.log = q.log.slice(-50);
    return res;
  };

  /* ---------- 将来の図鑑・習熟度のための集計 ---------- */
  Quiz.mastery = function (d) {
    var q = Quiz.ensure(d); var out = {}; var C = root.QUIZ_CATS || {};
    Object.keys(q.asked).forEach(function (qid) { var qq = Quiz.question(qid); if (!qq) return; var k = qq.cat; var o = out[k] || (out[k] = { name: (C[k] || {}).name || k, n: 0, ok: 0 }); o.n += q.asked[qid].n; o.ok += q.asked[qid].ok; });
    return out;
  };

  root.Quiz = Quiz; root.QuizEngine = Quiz;
  if (typeof module !== 'undefined' && module.exports) module.exports = Quiz;
})(typeof window !== 'undefined' ? window : globalThis);
