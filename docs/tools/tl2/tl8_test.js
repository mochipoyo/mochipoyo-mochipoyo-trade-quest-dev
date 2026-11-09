// Phase 8 の確かめ（DOM なし）：上級のポジション管理のエンジン（PositionEngine）・計画と比べる採点・上級の対戦の比べる表と相手の説明
//   node docs/tools/tl2/tl8_test.js [リポジトリ]
const path = require('path'); const R = process.argv[2] || path.resolve(__dirname, '../../..'); const fs = require('fs');
globalThis.CONFIG = require(R + '/js/config.js'); globalThis.Indicators = require(R + '/js/indicators.js'); globalThis.SignalEngine = require(R + '/js/signals.js');
const TC = require(R + '/js/tradecore.js'); globalThis.TradeCore = TC; globalThis.Scenarios = require(R + '/js/scenarios.js'); const SP = require(R + '/js/strategy.js'); globalThis.StrategyProfiles = SP;
const PS = require(R + '/js/position.js'); globalThis.PositionEngine = PS; const PE = require(R + '/js/practice.js'); globalThis.PracticeEngine = PE; const S = require(R + '/js/data/practice-seeds.js'); const D9 = require(R + '/js/rpg/tradeduel90.js');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  NG  ' + m); } };
const near = (a, b, e) => Math.abs(a - b) <= (e === undefined ? 1e-9 : e); const J = JSON.stringify; const pip = 0.01;
const bar = (o, h, l, c) => ({ o, h, l, c }); const flat = (n, p) => Array.from({ length: n }, () => bar(p, p, p, p));
const run = (bars, args, acts) => PS.summary(PS.replay(bars, Object.assign({ entryIndex: 0 }, args), acts || []));

console.log('--- 操作なし：基本のルールの決済（TradeCore.settleBars）と同じ ---');
{ let same = 0, n = 0; const keys = ['exitIndex', 'reason', 'netPips', 'grossPips', 'costPips', 'riskR', 'grossR', 'maePips', 'mfePips', 'gapSlippagePips', 'ambiguous', 'entryPrice', 'exitPrice', 'pnlYen', 'bars'];
  const seeds = Object.keys(S.learn).map((k) => S.learn[k][0]).concat(Object.keys(S.exam).map((k) => S.exam[k][1]));
  for (const sd of seeds) { const g = PE.generate(sd); for (const off of [0, 7, 30]) for (const side of ['buy', 'sell']) for (const [sw, tw] of [[0.15, 0.3], [0.3, 0.9], [0.08, 0.5]]) { const i0 = g.S + off; const px = g.base[i0].c; const sg = side === 'buy' ? 1 : -1;
    const o = { side, entry: px, sl: +(px - sg * sw).toFixed(3), tp: +(px + sg * tw).toFixed(3) }; const a = TC.settleBars(g.base, i0, o, { maxBars: 288, lots: 1.3 }); const b = PS.summary(PS.replay(g.base, { side, entryMid: px, sl: o.sl, tp: o.tp, lots: 1.3, entryIndex: i0, maxBars: 288 }, []));
    const cmp = (k, v) => (k === 'entryPrice' || k === 'exitPrice') ? Math.round(v * 1000) : v;
    n++; const diff = keys.filter((k) => J(cmp(k, a[k])) !== J(cmp(k, b[k]))); if (!diff.length && J((a.ifTpFirst && a.ifTpFirst.netPips) || null) === J((b.ifTpFirst && b.ifTpFirst.netPips) || null)) same++; else if (n - same < 3) console.log('    違い', sd, off, side, diff.map((k) => k + ':' + a[k] + '/' + b[k]).join(' ')); } }
  ok(same === n && n >= 400, '操作なしの上級エンジン＝基本の決済（' + same + '/' + n + '：決済の足・理由・pips・R・コスト・MAE/MFE・窓・先後不明）'); }

console.log('--- 建値・損切りの変更 ---');
{ const b = [bar(150, 150, 150, 150), bar(150, 150.3, 149.95, 150.25), bar(150.25, 150.26, 149.9, 149.95)]; const args = { side: 'buy', entryMid: 150, sl: 149.8, tp: 150.6, lots: 1 };
  const pos = PS.open(Object.assign({ entryIndex: 0 }, args)); PS.step(pos, b, 1); const r = PS.act(pos, { type: 'be' }, { bars: b }); ok(r.ok && pos.sl === Math.round(pos.entryFill * 1000) / 1000 && /損益ゼロとは限らない/.test(r.note), '建値：損切りを約定価格（' + pos.sl + '）へ。「損益ゼロとは限らない」と出す');
  PS.step(pos, b, 2); const s = PS.summary(pos); ok(s.reason === 'sl' && near(s.netPips, -0.3 - 0.1 + 0.1, 1e-9) || s.netPips < 0, '建値で止まる：決済の滑りの分だけ損（' + s.netPips + 'pips・' + s.riskR + 'R）。建値＝損益ゼロではない');
  const p2 = PS.open(Object.assign({ entryIndex: 0 }, args)); PS.step(p2, b, 1); ok(!PS.act(p2, { type: 'modifySL', sl: 149.7 }, { bars: b }).ok && /遠ざける/.test(PS.act(p2, { type: 'modifySL', sl: 149.7 }, { bars: b }).error), '損切りを遠ざける（広げる）変更はできない');
  ok(!PS.act(p2, { type: 'modifySL', sl: 150.245 }, { bars: b }).ok, 'いまの価格に近すぎる損切りは受け付けない');
  ok(!PS.act(p2, { type: 'modifySL', sl: 149.9005 }, { bars: b }).ok, '価格の刻みに合わない損切りは受け付けない');
  const p3 = PS.open(Object.assign({ entryIndex: 0 }, args)); ok(!PS.act(p3, { type: 'be' }, { bars: b }).ok, '約定した直後（含み益なし）は建値にできない（いまの価格に近すぎる）'); }

console.log('--- 部分決済（ロットの刻み・最小ロット）と R の分母 ---');
{ // +1R（約 20pips）で半分 → 残りは建値で止まる
  const b = [bar(150, 150, 150, 150), bar(150, 150.25, 149.99, 150.21), bar(150.21, 150.22, 150.2, 150.21), bar(150.21, 150.21, 149.9, 149.95)];
  const args = { side: 'buy', entryMid: 150, sl: 149.8, tp: 151, lots: 1.25 }; const acts = [{ type: 'partialClose', index: 1, fraction: 0.5 }, { type: 'be', index: 2 }];
  const pos = PS.replay(b, Object.assign({ entryIndex: 0 }, args), acts); const s = PS.summary(pos);
  ok(pos.fills.length === 2 && pos.fills[0].kind === 'partialClose' && pos.fills[0].lots === 0.62 && near(pos.fills[1].lots, 0.63) && pos.fills[0].index === 2, '50% の部分決済：0.62 ロット（刻みへ切り下げ）を次の足の始値で・残り 0.63 ロット');
  const ra = pos.fills.reduce((x, f) => x + f.pips * f.lots, 0) / (pos.riskPips0 * 1.25); ok(near(s.riskR, Math.round(s.netPips / pos.riskPips0 * 100) / 100) && near(s.riskR, ra, 0.01) && s.riskR > 0.3, 'R＝実現した損益の合計 ÷ 当初の口座リスク（部分決済の後も分母は当初）：' + s.riskR + 'R');
  ok(near(s.pnlYen, pos.fills.reduce((x, f) => x + f.yen, 0)) && Math.abs(s.pnlYen / (pos.riskYen0) - s.riskR) < 0.02, '円の合計 ÷ 当初の口座リスク（円）でも同じ R');
  const p2 = PS.open({ side: 'buy', entryMid: 150, sl: 149.8, tp: 151, lots: 0.01, entryIndex: 0 }); ok(!PS.act(p2, { type: 'partialClose', fraction: 0.5 }, { bars: b }).ok, '最小ロットより小さくなる部分決済はできない');
  const p3 = PS.open({ side: 'buy', entryMid: 150, sl: 149.8, tp: 151, lots: 0.02, entryIndex: 0 }); ok(PS.act(p3, { type: 'partialClose', fraction: 0.5 }, { bars: b }).ok && !PS.act(p3, { type: 'partialClose', fraction: 0.5 }, { bars: b }).ok, '予約した決済の分を除くと最小ロットを割る部分決済はできない（部分決済を重ねて全部を決済しない）'); }

console.log('--- トレーリング（有利な向きにだけ・足の確定の後・次の足から） ---');
{ const b = [bar(150, 150, 150, 150), bar(150, 150.2, 149.98, 150.15), bar(150.15, 150.35, 150.1, 150.3), bar(150.3, 150.31, 150.05, 150.1), bar(150.1, 150.12, 149.9, 149.95)];
  const pos = PS.open({ side: 'buy', entryMid: 150, sl: 149.8, tp: 151, lots: 1, entryIndex: 0 }); PS.step(pos, b, 1); const r = PS.act(pos, { type: 'trail', mode: 'pips', value: 10 }, { bars: b });
  ok(r.ok && pos.sl === 150.05 && /次の足から有効/.test(r.note), 'トレーリング 10pips を設定：確定した終値 150.15 − 10pips → 損切り 150.05');
  PS.step(pos, b, 2); ok(pos.sl === 150.2, '次の足の確定（終値 150.30）→ 損切り 150.20 へ（有利な向き）');
  PS.step(pos, b, 3); ok(pos.closed && pos.reason === 'sl' && pos.fills[0].fill === Math.round((150.2 - 0.003) * 1000) / 1000, '下げた足で 150.20 の損切りに当たる（決済の滑り込み 150.197）');
  const p2 = PS.open({ side: 'buy', entryMid: 150, sl: 149.8, tp: 151, lots: 1, entryIndex: 0 }); PS.step(p2, b, 1); PS.act(p2, { type: 'trail', mode: 'pips', value: 30 }, { bars: b }); const s0 = p2.sl; PS.step(p2, b, 2); const s1 = p2.sl; PS.step(p2, b, 3); const s2 = p2.sl;
  ok(s1 >= s0 && s2 === s1, 'トレーリングは不利な向きには戻さない（' + s0 + '→' + s1 + '→' + s2 + '）');
  const p3 = PS.open({ side: 'buy', entryMid: 150, sl: 149.8, tp: 151, lots: 1, entryIndex: 0 }); PS.step(p3, b, 1); ok(!PS.act(p3, { type: 'trail', mode: 'atr', value: 1 }, { bars: b, atr: NaN }).ok && PS.act(p3, { type: 'trail', mode: 'atr', value: 1 }, { bars: b, atr: 0.2 }).ok && near(p3.trail.dist, 0.2), 'ATR のトレーリング：その時点の確定足の ATR（分からなければ受け付けない）'); }

console.log('--- 早めの決済・窓・先後不明・時間切れ ---');
{ const b = [bar(150, 150, 150, 150), bar(150, 150.1, 149.95, 150.05), bar(150.12, 150.2, 150.1, 150.15)];
  const s = run(b, { side: 'buy', entryMid: 150, sl: 149.8, tp: 151, lots: 1 }, [{ type: 'fullClose', index: 1 }]); ok(s.reason === 'early' && s.exitIndex === 2 && near(s.exitPrice, Math.round((150.12 - 0.003 - 0.003) * 1000) / 1000), '早めの決済：決めた次の足の始値（売値−滑り＝' + s.exitPrice + '）で約定（決めた足の終値ではない）');
  const g = [bar(150, 150, 150, 150), bar(149.5, 149.6, 149.4, 149.5)]; const s2 = run(g, { side: 'buy', entryMid: 150, sl: 149.8, tp: 151, lots: 1 }, []); ok(s2.gap && s2.gapSlippagePips > 0 && s2.reason === 'sl', '窓で損切りを越えた：始値で約定（越えた分 ' + s2.gapSlippagePips + 'pips）');
  const a = [bar(150, 150, 150, 150), bar(150, 150.7, 149.7, 150)]; const s3 = run(a, { side: 'buy', entryMid: 150, sl: 149.8, tp: 150.6, lots: 1 }, []); ok(s3.ambiguous && s3.reason === 'sl' && s3.ifTpFirst && s3.ifTpFirst.riskR > 0, '同じ足で両方：損切りが先と仮定・利確が先なら ' + s3.ifTpFirst.riskR + 'R');
  const s4 = run(flat(10, 150), { side: 'buy', entryMid: 150, sl: 149.8, tp: 151, lots: 1, maxBars: 4 }, []); ok(s4.reason === 'time' && s4.exitIndex === 4, '保有の上限（4本）で時間切れの決済');
  ok(!PS.open({ side: 'buy', entryMid: 150, sl: 150.2, tp: 151, lots: 1, entryIndex: 0 }).ok && !PS.open({ side: 'buy', entryMid: 150, sl: 149.8, tp: 151, lots: 0, entryIndex: 0 }).ok, '損切りが逆側・ロット 0：建てない'); }

console.log('--- 同じ操作なら同じ結果（作り直し） ---');
{ const g = PE.generate(S.learn.similar[0]); let same = 0, n = 0; let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let k = 0; k < 40; k++) { const i0 = g.S + Math.floor(rnd() * 60); const px = g.base[i0].c; const side = rnd() < 0.5 ? 'buy' : 'sell'; const sg = side === 'buy' ? 1 : -1; const args = { side, entryMid: px, sl: +(px - sg * 0.2).toFixed(3), tp: +(px + sg * 0.6).toFixed(3), lots: 2, entryIndex: i0, maxBars: 288 };
    const pos = PS.open(args); const atrAt = (i) => PE.snapshot(g, i, '15m').entry.atr; let i = i0;
    while (!pos.closed && i < g.base.length - 1) { const t = rnd(); const ctx = { bars: g.base, atr: atrAt(pos.idx) }; if (t < 0.05) PS.act(pos, { type: 'be' }, ctx); else if (t < 0.08) PS.act(pos, { type: 'partialClose', fraction: 0.5 }, ctx); else if (t < 0.1) PS.act(pos, { type: 'trail', mode: rnd() < 0.5 ? 'pips' : 'atr', value: 1 + Math.floor(rnd() * 20) }, ctx); else if (t < 0.11) PS.act(pos, { type: 'fullClose' }, ctx); i++; PS.step(pos, g.base, i); }
    PS.finish(pos, g.base); const a = PS.summary(pos); const b = PS.summary(PS.replay(g.base, args, pos.actions, atrAt)); n++; if (J([a.netPips, a.riskR, a.exitIndex, a.fills]) === J([b.netPips, b.riskR, b.exitIndex, b.fills])) same++; }
  ok(same === n, 'いろいろな操作の並び 40 通り：記録した操作から作り直すと同じ約定・同じ R（' + same + '/' + n + '）'); }

console.log('--- 計画と比べる採点（結果の良し悪しでは点を決めない） ---');
{ const mk = (plan, acts, mfePips) => { const play = { advanced: true, pip: 0.01, entry: { plan, side: 'buy' }, pos: { riskPips0: 20, mfe: (mfePips || 0) * 0.01 }, events: acts.map((a) => Object.assign({ kind: 'manage' }, a)) }; const it = PE.mgmtItems(play); const o = {}; it.forEach((x) => { o[x.name] = (o[x.name] || []).concat([x.got + '/' + x.max]); }); return o; };
  ok(J(mk('hold', [], 10)) === J({ '決済管理の計画': ['3/3'], '計画と実際の管理': ['6/6'] }), '当初のまま・操作なし：計画どおり（損切りで終わっても減点しない）');
  ok(mk('be1r', [{ type: 'be', mfeR: 0.4 }], 30)['計画と実際の管理'][0] === '4/6', '+1R で建値の計画なのに 0.4R で建値：減点');
  ok(mk('be1r', [], 30)['計画と実際の管理'][0] === '3/6', '+1R（1.5R）に届いたのに建値にしなかった：減点');
  ok(mk('be1r', [{ type: 'be', mfeR: 1.2 }], 30)['計画と実際の管理'][0] === '6/6', '+1R で建値（計画どおり）：満点（その後に損切りで終わっても）');
  ok(mk(null, [], 0)['決済管理の計画'][0] === '0/3', '計画を決めずに発注：計画の点なし');
  ok(mk('hold', [{ type: 'fullClose', why: 'rci', facts: { rciAgainst: true } }], 10)['早めの決済の理由'][0] === '6/6' && mk('hold', [{ type: 'fullClose', why: 'rci', facts: { rciAgainst: false } }], 10)['早めの決済の理由'][0] === '0/6', '早めの決済の理由：その時点のチャートの事実と合えば 6 点・合わなければ 0 点');
  ok(mk('hold', [{ type: 'fullClose', why: 'emotion', facts: {} }], 10)['早めの決済の理由'][0] === '1/6', '気持ちによる決済：正直に選べば 1 点（計画で決めておくよう案内）');
  ok(PE.mgmtItems({ advanced: false, entry: {}, pos: null, events: [] }).length === 0, '基本のルールの問題には、管理の採点を足さない（今までの採点は変えない）'); }

console.log('--- 8.2 上級の対戦：判断の過程の比べ・相手の説明はその時点の事実 ---');
{ const pick = { seed: S.learn.hidden_aligned ? S.learn.hidden_aligned[0] : S.learn.similar[2], set: 'learn' }; const op = D9.npcRun(pick, 'trend', { skill: 0.8, seed: 3 });
  ok(op.facts && typeof op.facts.d1 === 'string' && typeof op.atMin === 'number' && op.answers, '相手の結果に、決めた時刻（開始から ' + op.atMin + '分）・その時点の事実・環境認識の答え');
  const ex = D9.explain(op, { styleName: '順張り' }).join(' '); ok(/その時点の事実：日足/.test(ex) && /RCI/.test(ex), '相手の説明はその時点の確定足の事実から：' + ex.slice(0, 70) + '…');
  const g = PE.generate(pick.seed); const keep = g.base.map((b) => Object.assign({}, b)); for (let i = g.S + op.atMin / 5 + 1; i < g.base.length; i++) g.base[i] = Object.assign({}, g.base[i], { h: g.base[i].h + 1, l: g.base[i].l - 1 });
  const f2 = D9.facts(Object.assign(PE.snapshot(g, g.S + op.atMin / 5, op.record.tf), { pip0: g.pip }), op.record.side || 'buy', SP.values('mochipoyo')); keep.forEach((b, i) => { g.base[i] = b; });
  ok(J(f2) === J(op.facts), '決めた時刻より後の足を変えても、相手の説明の事実は同じ');
  const me = { record: Object.assign({}, op.record, { process: 70 }), answers: { '1d': 'up', '4h': 'down' }, atMin: 15 }; const rows = D9.compareRows(me, op, pick);
  ok(rows.length === 10 && ['環境認識（日足）', 'シグナル・決めた時刻', '見送り／発注', '注文', '決済と管理（結果は運にも左右される）', '判断の過程の点（合計）'].every((k) => rows.some((r) => r[0] === k)), '比べる表：環境認識・シグナル（時刻）・見送り／発注・注文・決済と管理・判断の点');
  { let nTO = 0, nn = 0; const sds = Object.keys(S.learn).map((k) => S.learn[k][1]); for (const sd of sds) for (const st of ['trend', 'break', 'all']) { nn++; const r = D9.npcRun({ seed: sd, set: 'learn' }, st, { skill: 1, seed: 1 }); if (r.kind === 'timeout') nTO++; }
    ok(nTO === 0, '相手は合図が出なければ、待てる時間の終わりに自分から見送る（時間切れにしない。v9.0 と同じ ' + (nn - nTO) + '/' + nn + '）'); }
  const src = fs.readFileSync(R + '/js/rpg/tradeduel90.js', 'utf8'); ok(!/d\.gold|gold\s*[+-]?=|addGold|prize/i.test(src.replace(/賞金/g, '')), '上級の対戦は賞金・ゴールドを出さない（新しい報酬の抜け穴なし）'); }

console.log('\n結果: ' + pass + ' OK / ' + fail + ' NG'); process.exit(fail ? 1 : 0);
