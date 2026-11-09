// v8.9 CPU プロファイルの「いちばん長く休まずに動いた区間」（＝画面が止まった時間）の中身（含めた時間の多い関数）
//   node profwin89.js 記録.cpuprofile [区間の数=3]
const fs = require('fs'); const P = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const K = +(process.argv[3] || 3);
const byId = new Map(P.nodes.map((n) => [n.id, n])); const parent = new Map(); P.nodes.forEach((n) => (n.children || []).forEach((c) => parent.set(c, n.id)));
const name = (n) => (n.callFrame.functionName || '(anon)') + ' ' + n.callFrame.url.split('/').pop().replace(/\?.*/, '') + ':' + (n.callFrame.lineNumber + 1);
let t = P.startTime; const ev = []; for (let i = 0; i < P.samples.length; i++) { t += P.timeDeltas[i] || 0; ev.push({ t, id: P.samples[i] }); }
const idle = (id) => { const f = byId.get(id).callFrame.functionName; return f === '(idle)' || f === '(program)'; };
const runs = []; let s = null; for (let i = 0; i < ev.length; i++) { if (!idle(ev[i].id)) { if (s === null) s = i; } else if (s !== null) { runs.push([s, i - 1]); s = null; } } if (s !== null) runs.push([s, ev.length - 1]);
runs.sort((a, b) => (ev[b[1]].t - ev[b[0]].t) - (ev[a[1]].t - ev[a[0]].t));
for (const [a, b] of runs.slice(0, K)) {
  const dur = (ev[b].t - ev[a].t) / 1000; const inc = new Map();
  for (let i = a; i <= b; i++) { const dt = ((ev[i + 1] ? ev[i + 1].t : ev[i].t) - ev[i].t) / 1000; const seen = new Set(); let id = ev[i].id; while (id) { const k = name(byId.get(id)); if (!seen.has(k)) { seen.add(k); inc.set(k, (inc.get(k) || 0) + dt); } id = parent.get(id); } }
  console.log('== 区間 ' + dur.toFixed(0) + ' ms'); [...inc.entries()].sort((x, y) => y[1] - x[1]).filter(([k]) => !/^\(root\)/.test(k)).slice(0, 22).forEach(([k, v]) => console.log(v.toFixed(1).padStart(8), k));
}
