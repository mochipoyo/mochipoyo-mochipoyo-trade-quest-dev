// v6.7 トレードクイズモンスター追加の50体：データ・出題範囲・計算の確かめ・報酬・エンジン（共有の問題）・古いセーブ・絵
const load = require('../rpgload.js'); const { w, errors } = load();
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  NG', m); } };
const MONS = w.QUIZ_MONSTERS, QS = w.QUIZ_QUESTIONS, BY = w.QUIZ_BY_MONSTER, C = w.QUIZ_CATS, Quiz = w.Quiz; const A = w.QUIZ_ADDED67;
const NEW = MONS.filter(m => m.no >= 6);
ok(MONS.length === 55 && NEW.length === 50, '55体（追加50体）: ' + MONS.length);
ok(new Set(MONS.map(m => m.id)).size === 55 && NEW.every((m, i) => m.no === i + 6 && m.id === 'quiz_monster_' + String(m.no).padStart(3, '0')), 'ID と番号が 006〜055 で重ならない');
ok(new Set(MONS.map(m => m.name)).size === 55, '名前が重ならない');
const SCH = (w.ULTIMATE_SCHOOLS || []).map(s => s.id);
// 地域（12）すべてにいる
const regs = {}; NEW.forEach(m => { const r = w.BattleBG65.regionOf(m.map); regs[r] = (regs[r] || 0) + 1; }); ok(Object.keys(regs).length === 12, '12の地域すべてにいる ' + JSON.stringify(regs));
// 問題
const added = A.questions; const mp = added.filter(q => /^mp_/.test(q.cat)); ok(added.length >= 100, '追加の問題 ' + added.length + '問'); ok(mp.length >= 45, 'もちぽよ手法の問題 ' + mp.length + '問');
const ids = new Set(); QS.forEach(q => { ok(!ids.has(q.id), 'ID重複 ' + q.id); ids.add(q.id); });
const norm = s => String(s).replace(/[\s　、。？?！!（）()・]/g, ''); const texts = new Map(); QS.forEach(q => { const k = norm(q.q) + (q.chart ? JSON.stringify(q.chart) : ''); ok(!texts.has(k), q.id + ' 問題文が ' + texts.get(k) + ' と重複'); texts.set(k, q.id); });
added.forEach(q => {
  ok(q.choices.length === 4 && new Set(q.choices.map(norm)).size === 4 && q.answer === 0, q.id + ' 選択肢4個・重複なし・正解は元の0番');
  ok(typeof q.exp === 'string' && q.exp.length >= 5, q.id + ' 解説');
  ok(C[q.cat] && C[q.cat].hint && SCH.indexOf(C[q.cat].school) >= 0, q.id + ' 分野・流派・ヒント ' + q.cat);
  ok(q.diff >= 1 && q.diff <= 5, q.id + ' 難しさ');
  ok(!/次に(上が|下が)る|これから(上が|下が)る|上がるでしょう|下がるでしょう/.test(q.q + q.choices[0]), q.id + ' 将来の値動きを正解にしない');
  if (q.check) { const a = String(q.check()); const hit = s => s.indexOf(a) >= 0; ok(hit(q.choices[0]) && !q.choices.slice(1).some(hit), q.id + ' 計算の答え「' + a + '」が正解の文だけに入る'); }
});
console.log('  計算で確かめた追加の問題: ' + added.filter(q => q.check).length + '問');
// 出題範囲
NEW.forEach(m => {
  const L = BY[m.id] || []; ok(L.length >= 8, m.id + ' 出題範囲 ' + L.length + '問（8問以上）');
  ok(L.every(id => w.QUIZ_Q[id] && m.cats.indexOf(w.QUIZ_Q[id].cat) >= 0), m.id + ' 出題範囲の問題はすべてそのモンスターの分野');
  ok(m.cats.every(c => C[c]), m.id + ' 分野がすべてある');
  ok(m.gold >= m.steal.cap && m.steal.rate > 0 && m.steal.rate <= 0.15, m.id + ' ゴールドの報酬が奪われる上限以上・割合15%以下');
  ok(w.ITEMS[m.item.id] && w.ITEMS[m.item.id].cat === 'key', m.id + ' 記念アイテム');
  ok(m.intro.length === 2 && m.win.length === 1 && m.lose.length === 2 && m.lose[0] === '残念だったな！ お前のゴールドはいただいた！' && m.challenge, m.id + ' セリフ');
  ok(w.QuizMonArt.has(m.id), m.id + ' 絵がある（仮）');
});
// 最初の5体の出題範囲は変わらない（各20問・専用）
MONS.filter(m => m.no <= 5).forEach(m => ok((BY[m.id] || []).length === 20 && BY[m.id].every(id => w.QUIZ_Q[id].mon === m.id), m.id + ' は専用の20問のまま'));
// 報酬は地域が進むほど大きい（★ごとの平均）
const byStar = {}; NEW.forEach(m => { (byStar[m.stars] = byStar[m.stars] || []).push(m.exp); }); const avg = a => a.reduce((x, y) => x + y, 0) / a.length; const st = Object.keys(byStar).sort(); ok(st.every((s, i) => i === 0 || avg(byStar[s]) > avg(byStar[st[i - 1]])), '★が多いほど経験値が多い ' + st.map(s => s + ':' + Math.round(avg(byStar[s]))).join(' '));
// エンジン：共有の問題で出題・確定
function newSave(g) { const d = { gold: g, inventory: {}, hero: { id: 'hero', level: 30, exp: 0 } }; Quiz.ensure(d); return d; }
const d = newSave(10000); const m = NEW[20]; const p = Quiz.begin(d, m.id, () => 0.3); ok(p && BY[m.id].indexOf(p.qid) >= 0, '出題：' + m.id + ' の出題範囲から（' + (p && p.qid) + '）');
const qq = w.QUIZ_Q[p.qid]; ok(Quiz.belongs(qq, m.id) && !Quiz.belongs(qq, 'quiz_monster_001') === (BY.quiz_monster_001.indexOf(qq.id) < 0), 'belongs：出題範囲かどうか');
const p2 = Quiz.begin(d, m.id, () => 0.9); ok(p2.qid === p.qid && p2.token === p.token, '出している途中の問題は、もう一度開いても同じ');
const r1 = Quiz.settle(d, { token: 'w1', mid: m.id, qid: p.qid, orig: 2, party: [], gainExp: () => [] }); ok(!r1.ok && r1.stolen === Math.min(m.steal.cap, Math.floor(10000 * m.steal.rate)) && d.gold === 10000 - r1.stolen, '不正解：所持金の' + Math.round(m.steal.rate * 100) + '%（上限' + m.steal.cap + '）を奪う');
const g0 = d.gold; const r2 = Quiz.settle(d, { token: 'c1', mid: m.id, qid: p.qid, orig: 0, party: [], gainExp: () => [] }); ok(r2.ok && r2.first && d.gold === g0 + m.gold && d.quizMon.mon[m.id].defeated && d.inventory[m.item.id] === 1 && d.quizMon.titles.indexOf(m.title) >= 0, '正解：撃破・ゴールド・記念アイテム・称号');
const bad = Quiz.settle(newSave(100), { token: 'b1', mid: m.id, qid: 'qz1_01', orig: 0, party: [], gainExp: () => [] }); ok(bad.error === 'bad' || BY[m.id].indexOf('qz1_01') >= 0, '出題範囲にない問題では確定できない');
// 古いセーブ（5体だけの記録）
const old = { gold: 50, quizMon: { v: 1, mon: { quiz_monster_001: { defeated: true, defeatedAt: 1, attempts: 2, correct: 1, wrong: 1, stolen: 10, firstReward: true, fled: false, lastAt: 1, seen: true } }, asked: {}, history: {}, titles: ['基礎を食べる者'], tokens: [], log: [], pending: { quiz_monster_030: { qid: BY.quiz_monster_030[0], token: 'tt', seed: 5, t: 1 } } } };
Quiz.ensure(old); ok(Object.keys(old.quizMon.mon).length === 55 && old.quizMon.mon.quiz_monster_001.defeated && old.quizMon.mon.quiz_monster_055.defeated === false, '古いセーブ：記録を残したまま、追加の50体の記録を足す');
ok(!!old.quizMon.pending.quiz_monster_030, '出題範囲の問題の「出している途中」は消さない');
ok(errors.length === 0, '読み込みのエラーなし ' + errors.slice(0, 2).join('|'));
console.log('結果: ' + pass + ' OK / ' + fail + ' NG');
