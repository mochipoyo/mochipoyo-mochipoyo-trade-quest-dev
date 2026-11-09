// Phase 7 の確かめ（DOM なし）：エントリー足の選択（5分足・15分足）・同じ時刻・分で決まる上限・決済は 5分足で・未来の足を使わない・チャートの描く範囲
//   node docs/tools/tl2/tl7_test.js [リポジトリ]
const path = require('path'); const R = process.argv[2] || path.resolve(__dirname, '../../..');
globalThis.CONFIG = require(R + '/js/config.js'); globalThis.Indicators = require(R + '/js/indicators.js'); globalThis.SignalEngine = require(R + '/js/signals.js');
const TC = require(R + '/js/tradecore.js'); globalThis.TradeCore = TC; globalThis.Scenarios = require(R + '/js/scenarios.js'); const SP = require(R + '/js/strategy.js'); globalThis.StrategyProfiles = SP;
const PS = require(R + '/js/position.js'); globalThis.PositionEngine = PS; const PE = require(R + '/js/practice.js'); globalThis.PracticeEngine = PE; const S = require(R + '/js/data/practice-seeds.js'); const D9 = require(R + '/js/rpg/tradeduel90.js');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  NG  ' + m); } };
const J = JSON.stringify; const seeds = Object.keys(S.learn).map((k) => S.learn[k][0]).concat(Object.keys(S.exam).map((k) => S.exam[k][0]));

console.log('--- 7.4 エントリー足の選択：同じ時刻（asOf）で 5分足と 15分足 ---');
let htfSame = 0, entryDiff = 0, nn = 0, notBoundary = 0, priceOk = 0;
for (const sd of seeds) { const g = PE.generate(sd); for (const k of [0, 1, 2, 7]) { const asOf = g.S + k; const a = PE.snapshot(g, asOf, '5m'), b = PE.snapshot(g, asOf, '15m'); nn++;
  if (J(a.htf) === J(b.htf)) htfSame++; if (a.entry && b.entry && (a.entry.n !== b.entry.n || a.entry.close !== b.entry.close || J(a.entry.rci) !== J(b.entry.rci))) entryDiff++;
  if (k % 3) { notBoundary++; if (a.price === g.base[asOf].c && b.price === g.base[asOf].c && b.entry && b.entry.close !== b.price) priceOk++; } } }
ok(htfSame === nn, '日足・4時間足の事実は、エントリー足を変えても同じ（' + htfSame + '/' + nn + '）');
ok(entryDiff >= nn * 0.9, 'エントリー足の事実（本数・終値・RCI）は 5分足と 15分足で違う（' + entryDiff + '/' + nn + '）');
ok(priceOk === notBoundary, '15分足が形成中の時刻：いまの価格は最後の 5分足の終値（15分足の確定した終値とは別。' + priceOk + '/' + notBoundary + '）');
{ const sd = S.learn.early[0]; const play = PE.start({ seed: sd, cat: 'early', set: 'learn' }, {}); const g = PE.game(play);
  ok(play.suggestedTF === g.entryTF && play.entryTF === g.entryTF && play.stepMin === PE.tfMin(play.entryTF), '開始：エントリー足は問題の想定（' + g.entryTF + '）・進める時間はその足の長さ');
  const other = play.entryTF === '15m' ? '5m' : '15m'; ok(PE.setEntryTF(play, other) && play.entryTF === other && play.tfLog.length === 1 && play.events.some((e) => e.kind === 'tf' && e.tf === other), '仮説の前ならエントリー足を変えられる（記録に残す）');
  ok(!PE.setEntryTF(play, '4h') && !PE.setEntryTF(play, '1d'), 'エントリー足に日足・4時間足は選べない');
  play.hypothesis = { bias: 'buy', asOf: play.asOf }; play.phase = 'waiting'; ok(!PE.setEntryTF(play, play.entryTF === '15m' ? '5m' : '15m'), '仮説を登録した後は変えられない');
  ok(PE.setStep(play, 5) && play.step === 1 && PE.setStep(play, 15) && play.step === 3 && !PE.setStep(play, 7), '進める時間（5分・15分）はエントリー足とは別に選べる（ほかの値は受け付けない）');
  PE.skip(play); const rec = PE.record(play, PE.grade(play, {}), 1000000); ok(rec.tf === other && rec.tfSuggested === g.entryTF && J(rec.tfLog) === J([other]) && rec.stepMin === 15, '記録：選んだ足・問題の想定の足・選び直しの記録・進める時間'); }

console.log('--- 7.4 待ち・保有の上限は分で（エントリー足・進める時間で変わらない） ---');
{ const sd = S.learn.similar[1]; const ends = {}; for (const [tf, sm] of [['5m', 5], ['5m', 15], ['15m', 15], ['15m', 5]]) { const play = PE.start({ seed: sd, set: 'learn' }, { entryTF: tf, stepMin: sm }); play.phase = 'waiting'; let n = 0; while (PE.advance(play) && n < 1000) n++; ends[tf + '/' + sm] = [play.asOf - play.S, play.phase, n]; }
  ok(Object.values(ends).every((x) => x[0] === PE.WAIT_MIN / 5 && x[1] === 'timeout'), '時間切れはどれも 開始から ' + PE.WAIT_MIN + '分（' + J(ends) + '）');
  ok(ends['5m/5'][2] === 108 && ends['15m/15'][2] === 36, '5分ずつなら 108 回・15分ずつなら 36 回（15分足 36 本は v9.0 と同じ長さ）'); }

console.log('--- 7.4 決済は 5分足で（15分足で判断しても、同じ時刻・同じ注文なら同じ決済） ---');
{ let same = 0, n = 0; for (const sd of seeds.slice(0, 16)) { const res = []; for (const tf of ['5m', '15m']) { const play = PE.start({ seed: sd, set: 'learn' }, { entryTF: tf }); play.phase = 'waiting'; const sn = PE.snap(play); if (!sn.entry || sn.entry.insufficient) break;
      const px = sn.price; const o = { side: 'buy', sl: +(px - 0.25).toFixed(3), tp: +(px + 0.5).toFixed(3), riskPercent: 1 }; const en = PE.enter(play, o, 1000000); if (!en.ok) break; res.push(play.settle); }
    if (res.length === 2) { n++; const a = res[0], b = res[1]; if (a.exitIndex === b.exitIndex && a.netPips === b.netPips && a.reason === b.reason && a.riskR === b.riskR) same++; } }
  ok(n >= 12 && same === n, '同じ時刻の同じ注文：5分足で判断しても 15分足で判断しても決済は同じ（' + same + '/' + n + '）'); }
{ const sd = S.learn.early[1]; const play = PE.start({ seed: sd, set: 'learn' }, { entryTF: '15m' }); play.phase = 'waiting'; const g = PE.game(play); const px = PE.snap(play).price;
  PE.enter(play, { side: 'buy', sl: +(px - 0.25).toFixed(3), tp: +(px + 0.5).toFixed(3), riskPercent: 1 }, 1000000); const st = play.settle;
  const ref = TC.settleBars(g.base, play.asOf, { side: 'buy', entry: px, sl: +(px - 0.25).toFixed(3), tp: +(px + 0.5).toFixed(3) }, { maxBars: PE.HOLD_MIN / 5 });
  ok(st.exitIndex === ref.exitIndex && st.netPips === ref.netPips && play.entry.exitAsOf === st.exitIndex && st.bars <= PE.HOLD_MIN / 5, '決済は 5分足（もとの足）の settleBars と同じ・保有の上限 ' + PE.HOLD_MIN + '分（' + st.bars + '本）'); }

console.log('--- 未来の足を使わない（その時刻より後の足を変えても、表示・事実・相手の判断・採点の事実は同じ） ---');
{ let same = 0, n = 0, npcSame = 0, npcN = 0;
  for (const sd of seeds.slice(0, 12)) { const g = PE.generate(sd); const keep = g.base.map((b) => Object.assign({}, b));
    const before = {}; for (const k of [0, 5, 20]) for (const tf of ['5m', '15m', '4h', '1d']) { const v = PE.view(g, tf, g.S + k); before[k + tf] = J([v.candles, v.forming, v.an && v.an.rci, v.an && v.an.macd]); }
    const sb = [0, 5, 20].map((k) => J(PE.snapshot(g, g.S + k, '15m')));
    const npc0 = D9.npcRun({ seed: sd, set: 'learn' }, 'all', {}); const enter0 = npc0.record.kind === 'trade' ? npc0.record : null;
    // 未来（S＋20 より後）の足を大きく変える
    for (let i = g.S + 21; i < g.base.length; i++) { const b = g.base[i]; const f = 1 + 0.03 * Math.sin(i); g.base[i] = { o: b.o * f, h: b.h * f + 0.5, l: b.l * f - 0.5, c: b.c * f, t: b.t }; }
    for (const k of [0, 5, 20]) for (const tf of ['5m', '15m', '4h', '1d']) { n++; const v = PE.view(g, tf, g.S + k); if (before[k + tf] === J([v.candles, v.forming, v.an && v.an.rci, v.an && v.an.macd])) same++; }
    [0, 5, 20].forEach((k, i) => { n++; if (sb[i] === J(PE.snapshot(g, g.S + k, '15m'))) same++; });
    const npc1 = D9.npcRun({ seed: sd, set: 'learn' }, 'all', {}); npcN++;
    const ea = (r) => r.record.kind === 'trade' ? J([r.side, r.record.sl, r.record.tp, r.record.steps]) : 'skip';
    // 相手が S＋20 までに入ったなら、入る時刻・向き・損切り・利確は同じ（決済の結果は未来の足なので変わってよい）
    if (!enter0 || enter0.steps * 3 > 20 || ea(npc0) === ea(npc1)) npcSame++;
    keep.forEach((b, i) => { g.base[i] = b; }); }
  ok(same === n, '表示する足・形成中の足・RCI・MACD・判断の時点の事実：未来の足を変えても同じ（' + same + '/' + n + '）');
  ok(npcSame === npcN, '相手（トレードマスター）の入る時刻・向き・損切り・利確：未来の足を変えても同じ（' + npcSame + '/' + npcN + '）'); }

console.log('--- チャートの描く範囲（スクロール・十字線）：渡した足より先は描かない ---');
{ const ctx = new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 10 }) : () => { } , set: () => true }); const cv = { clientWidth: 640, clientHeight: 300, getContext: () => ctx }; globalThis.devicePixelRatio = 1;
  const Chart = (require(R + '/js/chart.js'), globalThis.Chart); const g = PE.generate(seeds[0]); const v = PE.view(g, '15m', g.S); const n = v.candles.length;
  Chart.render(cv, v.an, { visibleBars: 60 }); ok(cv._map.end === n - 1 && cv._map.start === n - 60, '既定：右端は判断の時点の最新の確定足（' + cv._map.end + '）');
  Chart.render(cv, v.an, { visibleBars: 60, endIndex: n + 50 }); ok(cv._map.end === n - 1, '右へスクロールしても、最新の足より先は描かない（endIndex を大きくしても ' + cv._map.end + '）');
  Chart.render(cv, v.an, { visibleBars: 60, endIndex: 100 }); ok(cv._map.end === 100 && cv._map.start === 41, '過去へスクロール：41〜100 本目を描く');
  Chart.render(cv, v.an, { visibleBars: 60, endIndex: 10 }); ok(cv._map.start === 0 && cv._map.end === 59, 'いちばん古い所より前には行かない（0〜59）');
  Chart.render(cv, v.an, { visibleBars: 60, endIndex: 100 }); const x = cv._map.xOf(80); ok(cv._map.xToIndex(x) === 80 && Math.abs(cv._map.yToPrice(cv._map.yOf(150.123)) - 150.123) < 1e-9, '座標と足の番号・価格の対応（x→80 本目・y→価格）');
  Chart.render(cv, v.an, { visibleBars: 60, crosshair: { index: n - 3, y: 100 } }); ok(true, '十字線を描ける（例外なし）');
  const CC = require(R + '/js/ui/chartctl.js'); const inf = CC.info(cv._map, { index: n - 3, y: 100 }); ok(inf && inf.fromEnd === 2 && inf.c === v.candles[n - 3].c && inf.ema[0] === v.an.emas[0][n - 3] && !inf.future, '十字線の値：その足の OHLC・EMA・RCI・MACD（判断の時点までの足）');
  const pv = SignalEngine.pivots(v.candles, CONFIG.zigzag.depth, n - 1); ok(pv.confirmed.every((p) => p.confirmedAt <= n - 1) && pv.forming.every((p) => p.index + CONFIG.zigzag.depth > n - 1), 'ZigZag：確定した山谷は右に ' + CONFIG.zigzag.depth + ' 本そろったもの・未確定は区別して描く（採点と同じ計算）'); }

console.log('\n結果: ' + pass + ' OK / ' + fail + ' NG'); process.exit(fail ? 1 : 0);
