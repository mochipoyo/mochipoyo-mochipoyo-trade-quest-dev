// v8.9 軽くした処理の結果が、以前と同じかの確かめ（jsdom）：node logic89_test.js [2d]
//  1. フィールドの入口のまわり（World.landmarkFoot）：v8.8 の処理をそのまま写した基準（lmfoot_ref88.js）と、全フィールドで同じ結果か
//  2. 次の目的地の案内（Nav）：1 歩ずつ歩きながら、新しい「1 歩だけ動いたときの省略」ありと、毎回道を調べ直したときで、案内の場所がすべて同じか
//  3. クイズモンスターのシンボル（QuizSymbol.list・map.passable）：記録を直接読むようにした結果が、Quiz.rec（記録を整える処理）を通したときと同じか。
//     倒したら消える・形が崩れた記録は今までどおり直されること
//  4. 速さの目安（この環境の CPU。スマホではない）
const load = require('../v78/load78.js'); const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w;
const W = w.World, S = w.State; const D = w.MAP_DEFS;
w.Win.message = async () => { }; w.Win.toast = () => { }; w.Win.choice = async () => 0;
S.newGame('t', 'warrior'); const d = S.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; W.start(); W.encounter = () => { };
let ok = 0; const ng = []; const T = (c, m) => { if (c) ok++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
const ms = (f) => { const t = process.hrtime.bigint(); f(); return Number(process.hrtime.bigint() - t) / 1e6; };
console.log('== ' + (two ? '2D 版' : '3D 版と同じ読み込み（地球の世界）'));
// ---- 1
{
  const ref = require('./lmfoot_ref88.js')(w, W, w.Tiles); let n = 0, same = 0, tRef = 0, tNew = 0; const diff = [];
  for (const id of Object.keys(D)) {
    let m; try { m = W.getMap(id); } catch (e) { continue; } if (!m || m.kind !== 'field' || !m.warps || !m.warps.length) continue; n++;
    let R; tRef += ms(() => { R = ref(m); }); const kRef = m.warps.map((q) => q._lmFootKind || '-').join(',');
    delete m._lmFoot; m.warps.forEach((q) => { delete q._lmFootKind; }); let F; tNew += ms(() => { F = W.landmarkFoot(m); });
    const enc = (f) => Object.keys(f).sort().map((k) => k + '>' + m.warps.indexOf(f[k])).join('|');
    const eq = enc(R.foot) === enc(F) && JSON.stringify(R.stats) === JSON.stringify(m._lmFootStats) && kRef === m.warps.map((q) => q._lmFootKind || '-').join(',');
    if (eq) same++; else diff.push(id);
  }
  T(n > 0 && same === n, '入口のまわり：' + n + ' のフィールドで v8.8 と同じ（違い ' + JSON.stringify(diff) + '）');
  console.log('    時間（この環境）：v8.8 の処理 ' + tRef.toFixed(1) + 'ms → 新しい処理 ' + tNew.toFixed(1) + 'ms（全フィールドの合計）');
}
// ---- 2
{
  let seed = 11; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const maps = ['poyo_village', 'rivel_town', 'tradia', 'kalion_city', 'world', 'rivel_castle_1', 'iron_mine_1', 'marina_port', 'sentra_city'].filter((id) => D[id]);
  let steps = 0, diffs = 0, used = 0, tA = 0, tB = 0; const bad = [];
  for (const id of maps) {
    W.maps = {}; W.busy = false; let at = null; for (const k of Object.keys(D)) { for (const q of (D[k].warps || [])) if (q.to === id && typeof q.tx === 'number') { at = q; break; } if (at) break; }
    W.enterMap(id, at ? at.tx : 1, at ? at.ty : 1, 'down'); const m = W.map; const p = W.player;
    for (let i = 0; i < 300; i++) {
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => m.passable(p.x + dx, p.y + dy, d)); if (!dirs.length) break; const [dx, dy] = dirs[Math.floor(rnd() * dirs.length)]; p.x += dx; p.y += dy;
      if (i === 150) d.flags.logic89_flag = true;
      let a, b; const before89 = w.Nav._reach89 && w.Nav._reach89.x !== undefined ? 1 : 0;
      tA += ms(() => { a = w.Nav.compute(true); }); if (before89 && w.Nav._reach89 && w.Nav._reach89.x === p.x && w.Nav._reach89.y === p.y) used++;
      const keep = w.Nav._reach89; w.Nav._reach89 = null; w.Nav._refKey = '';
      tB += ms(() => { b = w.Nav.compute(true); }); w.Nav._reach89 = keep;
      const s = (c) => (c && c.hop ? [c.hop.x, c.hop.y, c.hop.kind, c.hop.label, c.hop.after ? c.hop.after.x + ',' + c.hop.after.y : ''].join(',') : '-') + '|' + (c && c.text || '');
      steps++; if (s(a) !== s(b)) { diffs++; if (bad.length < 5) bad.push(id + '@' + p.x + ',' + p.y + ' ' + s(a) + ' / ' + s(b)); }
    }
    delete d.flags.logic89_flag;
  }
  T(steps > 1000 && diffs === 0, '案内：' + steps + ' 歩で、省略ありと毎回調べ直しの案内がすべて同じ（違い ' + diffs + ' ' + JSON.stringify(bad) + '）');
  T(used > 0 || two, '案内：1 歩だけ動いたときの省略が実際に使われている（' + used + ' 歩）');
  console.log('    時間（この環境）：省略あり ' + (tA / steps).toFixed(3) + 'ms／歩・毎回調べ直し ' + (tB / steps).toFixed(3) + 'ms／歩');
}
// ---- 3
{
  const QS = w.QuizSymbol, Q = w.Quiz; const L = w.QUIZ_MONSTERS || []; const qmaps = [...new Set(L.map((q) => q.map))].filter((id) => D[id]);
  let cmp = 0, same = 0;
  const refList = (m) => L.filter((q) => q.map === m.id && !QS.away[q.id]).filter((q) => { const r = Q.rec(d, q.id); return r && !r.defeated; }).map((q) => q.id).join(',');
  for (const id of qmaps) { W.maps = {}; const m = W.getMap(id); cmp++; if (QS.list(m).map((s) => s.mon.id).join(',') === refList(m)) same++; }
  T(cmp > 0 && same === cmp, 'クイズのシンボル：' + cmp + ' のマップで、記録を直接読んだ一覧と Quiz.rec を通した一覧が同じ');
  const q0 = L.find((q) => D[q.map]); W.maps = {}; const m0 = W.getMap(q0.map);
  T(!m0.passable(q0.x, q0.y, d) === QS.blocks(m0, q0.x, q0.y), 'クイズのシンボル：通れるかの判定は今までどおり（' + q0.id + '：ふさぐ＝' + QS.blocks(m0, q0.x, q0.y) + '）');
  d.quizMon.mon[q0.id].defeated = true; T(!QS.list(m0).some((s) => s.mon.id === q0.id), 'クイズのシンボル：倒したら一覧から消える'); d.quizMon.mon[q0.id].defeated = false;
  d.quizMon.mon[q0.id].attempts = 'x'; const r1 = QS.tried(q0.id); T(typeof d.quizMon.mon[q0.id].attempts === 'number' && r1 === false, 'クイズのシンボル：形が崩れた記録は今までどおり直される（attempts → ' + d.quizMon.mon[q0.id].attempts + '）');
  delete d.quizMon.mon[q0.id]; QS.list(m0); T(d.quizMon.mon[q0.id] && d.quizMon.mon[q0.id].defeated === false, 'クイズのシンボル：記録がないときは今までどおり作られる');
  // 4. 速さの目安：クイズモンスターのいるフィールドで map.passable を 2 万回
  const f = qmaps.find((id) => W.getMap(id).kind === 'field'); W.maps = {}; const fm = W.getMap(f); let n = 0;
  const t = ms(() => { for (let i = 0; i < 20000; i++) { fm.passable(i % fm.w, (i / fm.w | 0) % fm.h, d); n++; } });
  console.log('    時間（この環境）：' + f + ' で map.passable 1 回 ' + (t * 1000 / n).toFixed(2) + 'µs');
  T(t / n < 0.02, '速さ：クイズモンスターのいるフィールドで map.passable が 1 回 20µs 未満（' + (t * 1000 / n).toFixed(2) + 'µs。v8.8 は約 85µs）');
}
console.log('結果: ' + ok + ' OK / ' + ng.length + ' NG ' + JSON.stringify(ng) + '　読み込みのエラー ' + A.errors.length);
process.exit(ng.length ? 1 : 0);
