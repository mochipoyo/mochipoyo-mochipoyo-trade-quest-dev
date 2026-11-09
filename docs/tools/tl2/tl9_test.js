// 学習追加 A〜D の確かめ（DOM なし）：3判断比較・思い込みを見抜く・連敗耐性・初見の認定試験 v2
//   node docs/tools/tl2/tl9_test.js [リポジトリ]
const path = require('path'); const R = process.argv[2] || path.resolve(__dirname, '../../..');
globalThis.CONFIG = require(R + '/js/config.js'); globalThis.Indicators = require(R + '/js/indicators.js'); globalThis.SignalEngine = require(R + '/js/signals.js');
const TC = require(R + '/js/tradecore.js'); globalThis.TradeCore = TC; globalThis.Scenarios = require(R + '/js/scenarios.js'); const SP = require(R + '/js/strategy.js'); globalThis.StrategyProfiles = SP;
const PS = require(R + '/js/position.js'); globalThis.PositionEngine = PS; const PE = require(R + '/js/practice.js'); globalThis.PracticeEngine = PE; const S = require(R + '/js/data/practice-seeds.js'); const T = require(R + '/js/trainer91.js');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  NG  ' + m); } };
const J = JSON.stringify; const near = (a, b, e) => Math.abs(a - b) <= e;

console.log('--- A 同じ相場・3判断比較 ---');
{ const seeds = T.CMP3_CATS.map((c) => S.learn[c][0]).concat(T.CMP3_CATS.map((c) => S.learn[c][3])); const P0 = { side: 'buy', entryTF: '15m', rrA: 2, rrB: 2, whyC: 'no_signal', riskPercent: 1 };
  let det = 0, isoB = 0, isoC = 0, isoA = 0, firstMet = 0, nB = 0, luckyOk = 0, nn = 0, fut = 0, differ = 0;
  for (const sd of seeds) for (const side of ['buy', 'sell']) { nn++; const P = Object.assign({}, P0, { side }); const a = T.cmp3Run(sd, P), b = T.cmp3Run(sd, P); if (J(a) === J(b)) det++;
    const c1 = T.cmp3Run(sd, Object.assign({}, P, { rrB: 3 })); if (J(c1.branches[0]) === J(a.branches[0]) && J(c1.branches[2]) === J(a.branches[2])) isoB++;
    const c2 = T.cmp3Run(sd, Object.assign({}, P, { whyC: 'range' })); if (J(c2.branches[0]) === J(a.branches[0]) && J(c2.branches[1]) === J(a.branches[1])) isoC++;
    const c3 = T.cmp3Run(sd, Object.assign({}, P, { rrA: 1.5 })); if (J(c3.branches[1]) === J(a.branches[1]) && J(c3.branches[2]) === J(a.branches[2])) isoA++;
    const B = a.branches[1]; if (B.kind === 'trade') { nB++; const g = PE.generate(sd); let earlier = false; for (let x = g.S; x < B.asOf; x += 3) { const sn = PE.snapshot(g, x, '15m'); sn.pip0 = g.pip; if (sn.entry && !sn.entry.insufficient && SP.evaluateEntry(sn, side, SP.values('mochipoyo')).met) earlier = true; } if (!earlier && B.met) firstMet++; }
    if (a.branches.filter((x) => x.kind === 'trade').every((x) => x.lucky === (!x.met && x.R > 0))) luckyOk++;
    if (a.branches[0].kind === 'trade' && B.kind === 'trade' && a.branches[0].atMin !== B.atMin) differ++;
    // 未来の足を変えても、A・B の入る時刻・向き・損切り・利確は同じ（結果は変わってよい）
    const g = PE.generate(sd); const keep = g.base.map((x) => Object.assign({}, x)); const last = Math.max(a.branches[0].asOf || g.S, B.asOf || g.S);
    for (let i = last + 1; i < g.base.length; i++) { const q = g.base[i]; const f = 1 + 0.02 * Math.cos(i); g.base[i] = { o: q.o * f, h: q.h * f + 0.4, l: q.l * f - 0.4, c: q.c * f, t: q.t }; }
    const z = T.cmp3Run(sd, P); const ent = (r) => r.branches.slice(0, 2).map((x) => [x.kind, x.atMin, x.entry, x.sl, x.tp, x.lots, x.met]); if (J(ent(z)) === J(ent(a))) fut++; keep.forEach((q, i) => { g.base[i] = q; }); }
  ok(det === nn, '同じ相場・同じ計画なら同じ結果（' + det + '/' + nn + '）');
  ok(isoB === nn && isoC === nn && isoA === nn, '3 つの分岐は互いに影響しない：B・C・A の計画を変えても、ほかの分岐の結果は同じ（' + isoB + '・' + isoC + '・' + isoA + '/' + nn + '）');
  ok(nB > 0 && firstMet === nB, 'B は「条件がそろった最初の確定足」で入る（それより前の足ではそろっていない ' + firstMet + '/' + nB + '）');
  ok(luckyOk === nn, '「条件がそろわないまま入って、たまたま勝った」の印は、条件がそろわず R＞0 のときだけ');
  ok(fut === nn, '計画の時刻より後の足を変えても、A・B の入る時刻・価格・損切り・利確・ロットは同じ（' + fut + '/' + nn + '）');
  ok(differ > 0, 'A（いま入る）と B（条件がそろってから）が別の時刻になる問題がある（' + differ + '件。B がいつも儲かるようには作っていない）');
  const a = T.cmp3Run(seeds[0], P0); ok(a.capital === T.CMP3_CAPITAL && a.branches[2].kind === 'skip' && a.branches[2].R === 0 && typeof a.branches[2].afterPips === 'number', 'C（見送り）は 0R・その後の値動きを並べる。資金は道場とは別の仮想資金（' + a.capital + '円）');
  const fields = ['atMin', 'side', 'entry', 'slPips', 'tpPips', 'rr', 'lots', 'netPips', 'R', 'mfePips', 'maePips', 'worstOpenYen', 'met', 'evidence']; const tr = a.branches.find((x) => x.kind === 'trade'); ok(tr && fields.every((k) => tr[k] !== undefined), '結果の表の項目（時刻・方向・エントリー・損切り／利確の距離・RR・ロット・net pips・R・MFE/MAE・最大の含み損・根拠の成否）');
  let Rsum = { A: [], B: [] }; seeds.forEach((sd) => { const r = T.cmp3Run(sd, P0); if (r.branches[0].kind === 'trade') Rsum.A.push(r.branches[0].R); if (r.branches[1].kind === 'trade') Rsum.B.push(r.branches[1].R); });
  ok(Rsum.B.some((x) => x < 0) || Rsum.A.some((x) => x > 0), 'B でも負ける問題・A でも勝つ問題がある（結果は相場しだい。A の R：' + Rsum.A.join(',') + '／B の R：' + Rsum.B.join(',') + '）'); }

console.log('--- B 思い込みを見抜く ---');
{ const pool = [].concat(...Object.keys(S.learn).map((k) => S.learn[k].slice(0, 6))); let sets = 0, verified = 0, total = 0, mixed = 0, fut = 0; const types = {};
  for (const sd of pool) { const set = T.spotClaims(sd); if (!set) continue; sets++; const v = T.spotVerify(sd, set); total += v.length; verified += v.filter(Boolean).length;
    const nf = set.claims.filter((c) => !c.truth).length; if (nf >= 1 && nf < set.claims.length) mixed++; set.claims.forEach((c) => { types[c.type + (c.truth ? 't' : 'f')] = (types[c.type + (c.truth ? 't' : 'f')] || 0) + 1; });
    const g = PE.generate(sd); const keep = g.base.map((x) => Object.assign({}, x)); for (let i = g.S + 1; i < g.base.length; i++) g.base[i] = Object.assign({}, g.base[i], { h: g.base[i].h + 2, l: g.base[i].l - 2 }); const sc = (x) => J(Object.assign({}, x, { checksum: null })); if (sc(T.spotClaims(sd)) === sc(set)) fut++; keep.forEach((q, i) => { g.base[i] = q; }); }
  ok(sets >= 60, '出題できた問題 ' + sets + '件');
  ok(verified === total, '出題とは別の計算で、すべての主張の真偽を判断の時点の事実から確かめた（' + verified + '/' + total + '：誤りの主張は、チャートの事実・数値と矛盾している）');
  ok(mixed === sets, 'どの問題にも誤りと正しい主張がまじる（全部が誤り・全部が正しいはない ' + mixed + '/' + sets + '）');
  ok([1, 2, 3, 4, 5, 6, 7, 8].every((k) => types[k + 'f'] > 0), '誤りの 8 種類（①上位足 ②RCI の到達と反転 ③通常／ヒドゥン ④未確定の山谷 ⑤損切りの幅と口座リスク ⑥過去の成績の保証 ⑦見送り ⑧未来の断定）がすべて出る：' + J(types));
  ok(fut === sets, '判断の時点より後の足を変えても、主張と真偽は同じ（相場全体の checksum は除く。' + fut + '/' + sets + '）');
  const set = T.spotClaims(pool[0]); const wrong = set.claims.filter((c) => !c.truth).map((c) => c.id), right = set.claims.filter((c) => c.truth).map((c) => c.id);
  let gr = T.spotGrade(set, wrong); ok(gr.hit === wrong.length && gr.falseAlarm === 0 && gr.detectRate === 100 && gr.falseAlarmRate === 0 && gr.score === gr.max, 'すべての誤りを指摘・言いがかりなし：満点・検出率 100%・誤認率 0%');
  gr = T.spotGrade(set, wrong.concat(right.slice(0, 1))); ok(gr.falseAlarm === 1 && gr.score === gr.max - 5 && gr.falseAlarmRate > 0, '正しい主張を誤りと言う（根拠のない指摘）：減点（' + gr.score + '/' + gr.max + '）・誤認率 ' + gr.falseAlarmRate + '%');
  gr = T.spotGrade(set, []); ok(gr.hit === 0 && gr.score === 0 && gr.detectRate === 0, '何も指摘しない：0 点（検出率 0%）'); }

console.log('--- C 30連敗でも生き残る ---');
{ let r = T.survival({ capital: 1000000, riskPercent: 1, n: 30 }); ok(r.ok && near(r.finalPct, 73.97, 0.005) && near(r.final, 1000000 * Math.pow(0.99, 30), 1e-6) && near(r.formula, r.final, 1e-6), '1% で 30連敗：残る資金 ' + r.finalPct.toFixed(2) + '%（式 initial×(1−r)^n と一致）');
  r = T.survival({ capital: 1000000, riskPercent: 5, n: 30 }); ok(near(r.finalPct, 21.46, 0.005), '5% で 30連敗：' + r.finalPct.toFixed(2) + '%');
  ok(near(r.recoverPct, (1 / 0.2146 - 1) * 100, 1) && near(r.maxDDPct, 100 - r.finalPct, 1e-9) && r.exitAt === 14, '回復に必要な上昇 ' + r.recoverPct.toFixed(1) + '%・最大DD ' + r.maxDDPct.toFixed(2) + '%・退場の目安（50%）に 14連敗目で届く');
  r = T.survival({ capital: 1000000, riskPercent: 1, n: 30, mode: 'yen' }); ok(near(r.finalPct, 70, 1e-9) && /固定の円/.test(r.note), '固定の円の額（最初の資金の 1%）：30連敗で 70%（複利の 73.97% とは別の計算）');
  r = T.survival({ capital: 1000000, riskPercent: 5, n: 30, mode: 'yen' }); ok(r.final === 0 && r.ruinAt === 20, '固定額 5%：20連敗目で資金がなくなる');
  const st = T.survival({ capital: 1000000, riskPercent: 1, n: 30, stressEvery: 5 }); ok(st.finalPct < 73.97 && st.formula === null && /2 倍/.test(st.note), 'ストレス（5 回に 1 回、予定の 2 倍の損失）：' + st.finalPct.toFixed(2) + '%（理論式より少ない）');
  const bad = [{ capital: 0, riskPercent: 1, n: 30 }, { capital: -5, riskPercent: 1, n: 30 }, { capital: NaN, riskPercent: 1, n: 30 }, { capital: 1e6, riskPercent: 100, n: 30 }, { capital: 1e6, riskPercent: 0, n: 30 }, { capital: 1e6, riskPercent: 1, n: 0 }, { capital: 1e6, riskPercent: 1, n: 1.5 }, { capital: 1e6, riskPercent: 1, n: 30, exitPct: 120 }];
  ok(bad.every((o) => !T.survival(o).ok && T.survival(o).errors.length), '0・負・NaN の資金、100%・0% のリスク、0・小数の連敗数、変な退場の目安：計算しない（理由つき）');
  const c1 = T.compareSizing({ capital: 1e6, riskPercent: 1, rr: 1.5, seq: T.SEQ_SAMPLE }), c2 = T.compareSizing({ capital: 1e6, riskPercent: 1, rr: 1.5, seq: T.SEQ_SAMPLE });
  ok(c1.ok && J(c1) === J(c2) && c1.wins + c1.losses === T.SEQ_SAMPLE.length, '資金の決め方の比べ：同じ並びなら同じ結果（勝ち ' + c1.wins + '・負け ' + c1.losses + '）');
  ok(c1.s.martingale.maxDDPct > c1.s.const.maxDDPct && c1.s.const.final > 0, 'マーチンゲール（負けたら 2 倍）は最大DD が大きい（' + c1.s.martingale.maxDDPct.toFixed(1) + '% ＞ 一定 ' + c1.s.const.maxDDPct.toFixed(1) + '%）');
  const c3 = T.compareSizing({ capital: 1e6, riskPercent: 5, rr: 1, seq: 'LLLLLLLLLLLLLLLLLLLL' }); ok(c3.s.martingale.ruinAt !== null && c3.s.const.final > 0, '20連敗：マーチンゲールは資金がなくなる（' + c3.s.martingale.ruinAt + '回目）・一定 % は残る');
  ok(!T.compareSizing({ capital: 1e6, riskPercent: 1, rr: 1.5, seq: 'LLX' }).ok && !T.compareSizing({ capital: 1e6, riskPercent: 1, rr: 0, seq: 'LW' }).ok, '並び・RR の入力の守り'); }

console.log('--- D 初見チャートの認定試験 v2 ---');
{ ok(PE.FAM_A.every((f) => PE.FAM_B.indexOf(f) < 0), '学習用（系列 A）と試験（系列 B）の型の群は重ならない（A：' + PE.FAM_A.join('・') + '／B：' + PE.FAM_B.join('・') + '）');
  const learnSeeds = new Set([].concat(...Object.keys(S.learn).map((k) => S.learn[k]))); const examA = new Set([].concat(...Object.keys(S.exam).map((k) => S.exam[k])));
  const run = (series, seen) => { const out = []; while (series.done < series.n) { const it = T.examNext(series, seen); if (!it) break; T.examMark(series, it); seen[it.fp] = 1; series.done++; out.push(it); } return out; };
  const seen = {}; const s1 = T.examNew(0, 1789000000000); const a = run(s1, seen);
  const seedsU = new Set(a.map((x) => x.seed)), fpsU = new Set(a.map((x) => x.fp)); const fam = {}; a.forEach((x) => { fam[x.familyId] = (fam[x.familyId] || 0) + 1; });
  ok(a.length === 30 && seedsU.size === 30 && fpsU.size === 30, '1 回の試験 30 問：seed・指紋（群＋checksum）の重複 0');
  ok(Object.values(fam).every((n) => n <= T.EXAM_FAMILY_MAX) && Object.keys(fam).length >= 4, '同じ群は ' + T.EXAM_FAMILY_MAX + ' 問まで（' + Object.keys(fam).length + ' 群：' + J(fam) + '）');
  ok(a.every((x) => x.gen === 'B' && /^B:/.test(x.familyId) && !learnSeeds.has(x.seed) && !examA.has(x.seed)), 'すべて系列 B・学習用の seed とも v9.0 の未知の問題の seed とも重ならない（学習データの漏れ 0）');
  // 中断と再開：途中の状態をセーブ（JSON）して読み直しても重複しない
  const s2 = T.examNew(30, 1789000555555); const seen2 = Object.assign({}, seen); const half = []; while (s2.done < 12) { const it = T.examNext(s2, seen2); T.examMark(s2, it); seen2[it.fp] = 1; s2.done++; half.push(it); }
  const s2b = JSON.parse(J(s2)); const seen2b = JSON.parse(J(seen2)); const rest = run(s2b, seen2b); const all2 = half.concat(rest);
  ok(all2.length === 30 && new Set(all2.map((x) => x.seed)).size === 30 && new Set(all2.map((x) => x.fp)).size === 30, '12 問で中断 → セーブを読み直して再開：30 問で重複 0');
  ok(all2.every((x) => !a.some((y) => y.fp === x.fp)), '2 回目の試験は、1 回目で見た問題（指紋）を初見として出さない');
  const keep = T.EXAM_FAMILY_MAX; T.EXAM_FAMILY_MAX = 0; ok(T.examNext(T.examNew(0, 1), {}) === null, '出せる問題が足りないときは null（重複をこっそり出さない）'); T.EXAM_FAMILY_MAX = keep;
  // 評価
  const mk = (i, o) => Object.assign({ kind: i % 3 ? 'trade' : 'skip', riskR: i % 2 ? 1.2 : -1, process: 70 + (i % 5), compliant: i % 4 !== 0, riskPercent: 1, profileSnap: { maxRiskPercent: 2 }, familyId: 'B:f' + (i % 6), htfRight: 2, htfN: 2, divOk: i % 3 !== 0, cats: { trigger: [20, 20] } }, o || {});
  let ev = T.examEvaluate(Array.from({ length: 30 }, (_, i) => mk(i)), []); ok(ev.level && !ev.hold.length && ev.version === 2 && /認定ではない/.test(ev.note) && /別の日/.test(ev.note), '30 問・群 6・ダイバの設問 30：判定（' + ev.level + '）・版 v2・「実際の相場で勝てる認定ではない」「別の日に」');
  ev = T.examEvaluate(Array.from({ length: 12 }, (_, i) => mk(i)), []); ok(!ev.level && ev.hold.some((h) => /12 問/.test(h)), '12 問だけ：判定保留（' + ev.hold.join('／') + '）');
  ev = T.examEvaluate(Array.from({ length: 30 }, (_, i) => mk(i, { familyId: 'B:x' })), []); ok(!ev.level && ev.hold.some((h) => /群が 1 種類/.test(h)), '群が 1 種類だけ：判定保留');
  ev = T.examEvaluate(Array.from({ length: 30 }, (_, i) => mk(i, { divOk: null })), []); ok(!ev.level && ev.hold.some((h) => /ダイバージェンス/.test(h)), 'ダイバージェンスの設問が足りない：判定保留');
  ev = T.examEvaluate(Array.from({ length: 30 }, (_, i) => mk(i)), [{ processByFamily: 60 }, { processByFamily: 78 }]); ok(ev.reproducibility && ev.reproducibility.runs === 3 && ev.reproducibility.spread > 0, '前の試験と並べた再現性（' + ev.reproducibility.runs + '回・幅 ' + ev.reproducibility.spread.toFixed(1) + '）');
  const m = ev.metrics; ok(['process', 'processByFamily', 'compliance', 'expectancyR', 'overRiskRate', 'skipRate', 'goodSkipRate', 'htfAcc', 'divAcc'].every((k) => m[k] !== undefined), '多面的な評価：判断の過程（群ごと）・規律・コスト込みの期待値R・過大リスク・見送り・上位足の正答・ダイバージェンス');
  ok(PE.focusQuestions(8, PE.snapshot(PE.generate(a[0].seed, { gen: 'B' }), PE.generate(a[0].seed, { gen: 'B' }).S)).some((q) => q.key === 'div'), '試験の問題にダイバージェンスの読み取りの設問がある（理解度の評価に使う）'); }

console.log('\n結果: ' + pass + ' OK / ' + fail + ' NG'); process.exit(fail ? 1 : 0);
