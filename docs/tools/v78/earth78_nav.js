// v7.8 地球の世界：次の目的地（メインと新しい地域のサブ）の参照がすべて実在し、フィールドの目的地は入口と同じ区域の歩けるマスのとなり（jsdom）
const load = require('./load78.js');
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const A = load(); const w = A.w; w.State.newGame('t', 'warrior'); w.World.start(); const N = w.Nav, E = w.Earth78, T = w.Tiles;
const O = w.OBJECTIVES; let bad = [], fieldN = 0, fieldBad = [];
const refs = []; O.forEach((e) => { refs.push(e.t); if (e.pre) refs.push(e.pre.t || e.pre); (e.any || []).forEach((a) => refs.push(a.t)); });
refs.filter((r) => typeof r === 'string').forEach((ref) => { let r = null; try { r = N.resolve(ref); } catch (e) { r = null; }
  if (!r) { bad.push(ref); return; }
  const m = w.World.getMap(r.map); if (!m || m.kind !== 'field' || !E.GEN[r.map] || r.x === null || r.x === undefined) return; fieldN++;
  const g = E.GEN[r.map]; let near = false; for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = r.x + dx, y = r.y + dy; if (x < 0 || y < 0 || x >= g.W || y >= g.H) continue; const l = g.lab[y * g.W + x]; if (l >= 0 && g.locs.some((L) => { const ll = g.lab[(L.y + 1) * g.W + L.x] >= 0 ? g.lab[(L.y + 1) * g.W + L.x] : g.lab[L.y * g.W + L.x]; return ll === l; })) near = true; }
  if (!near) fieldBad.push(ref + '→' + r.map + ' ' + r.x + ',' + r.y); });
ok(!bad.length, '次の目的地の参照 ' + refs.length + ' 件がすべて実在（地球の世界で解決）' + bad.slice(0, 5).join(' '));
ok(!fieldBad.length, 'フィールドの目的地 ' + fieldN + ' 件が、その地域の入口と同じ区域の歩けるマスのとなり ' + fieldBad.slice(0, 5).join(' '));
// メインの章ごと：その章の目的のフラグにして、案内が目的地を出す
const mains = Object.keys(w.QUESTS).filter((k) => w.QUESTS[k].main);
let mOK = 0, mBad = [];
O.filter((e) => mains.includes(e.q) && e.done !== '_start').forEach((e) => { const d = w.State.data; d.quests = {}; d.quests[e.q] = { state: 'active' }; mains.filter((q) => +q.split('_')[1] < +e.q.split('_')[1]).forEach((q) => d.quests[q] = { state: 'done' });
  try { const c = N.compute(true); if (c && (c.primary || c.target || c.marker || c.region)) mOK++; else mBad.push(e.q + ':' + e.done); } catch (er) { mBad.push(e.q + ':' + e.done + ' ' + er.message); } });
ok(!mBad.length, 'メインの目的 ' + mOK + ' 件で、案内が目的地を出す ' + mBad.slice(0, 4).join(' '));
console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
