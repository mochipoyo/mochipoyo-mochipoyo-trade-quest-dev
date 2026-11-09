// v8.9 CPU プロファイル（.cpuprofile）のまとめ：自分の時間の多い関数・指定した関数の中の内訳
//   node profsum89.js 記録.cpuprofile [関数名（その関数の中で時間を使った関数の一覧）]
const fs = require('fs'); const P = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const focus = process.argv[3];
const byId = new Map(P.nodes.map((n) => [n.id, n])); const self = new Map(); P.nodes.forEach((n) => self.set(n.id, 0));
for (let i = 0; i < P.samples.length; i++) self.set(P.samples[i], self.get(P.samples[i]) + (P.timeDeltas[i + 1] || 0) / 1000);
const parent = new Map(); P.nodes.forEach((n) => (n.children || []).forEach((c) => parent.set(c, n.id)));
const name = (n) => (n.callFrame.functionName || '(anon)') + ' ' + n.callFrame.url.split('/').pop() + ':' + (n.callFrame.lineNumber + 1);
const incl = new Map(); const calc = (id) => { if (incl.has(id)) return incl.get(id); const n = byId.get(id); let s = self.get(id); (n.children || []).forEach((c) => s += calc(c)); incl.set(id, s); return s; };
P.nodes.forEach((n) => calc(n.id));
const total = [...self.values()].reduce((a, b) => a + b, 0);
const agg = (ids, f) => { const m = new Map(); ids.forEach((id) => { const k = name(byId.get(id)); m.set(k, (m.get(k) || 0) + f(id)); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
console.log('合計', total.toFixed(0), 'ms');
console.log('-- 自分の時間（上位 30）'); agg(P.nodes.map((n) => n.id), (id) => self.get(id)).slice(0, 30).forEach(([k, v]) => console.log(v.toFixed(1).padStart(8), k));
if (focus) {
  const roots = P.nodes.filter((n) => n.callFrame.functionName === focus).filter((n) => { let p = parent.get(n.id); while (p) { if (byId.get(p).callFrame.functionName === focus) return false; p = parent.get(p); } return true; });
  const sub = []; const walk = (id) => { sub.push(id); (byId.get(id).children || []).forEach(walk); }; roots.forEach((r) => walk(r.id));
  console.log('-- ' + focus + ' の中（合計 ' + roots.reduce((a, r) => a + incl.get(r.id), 0).toFixed(1) + ' ms）：含めた時間（上位 25）'); agg(sub, (id) => incl.get(id)).slice(0, 25).forEach(([k, v]) => console.log(v.toFixed(1).padStart(8), k));
}
