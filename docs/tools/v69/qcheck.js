// v6.9 で足した人・調べる所（印 s3121）が、トレードクイズモンスター（QUIZ_MONSTERS）・ボスのシンボルと近すぎないか（周囲1マス）
const load = require('../rpgload.js'); const { w } = load(); w.State.newGame('t', 'warrior');
const Q = w.QUIZ_MONSTERS || []; const bad = [];
for (const [id, d] of Object.entries(w.MAP_DEFS)) {
  const mine = [].concat((d.npcs || []).filter((n) => n.s3121), (d.events || []).filter((e) => e.s3121));
  for (const o of mine) {
    Q.filter((q) => q.map === id).forEach((q) => { if (Math.abs(q.x - o.x) <= 1 && Math.abs(q.y - o.y) <= 1) bad.push(id + ' ' + (o.id || 'event') + '@' + o.x + ',' + o.y + ' ↔ ' + q.id + '@' + q.x + ',' + q.y); });
    const bs = w.BossSymbol && w.BossSymbol.list ? (w.BossSymbol.list(new w.GameMap(d)) || []) : [];
    bs.forEach((b) => { if (Math.abs(b.x - o.x) <= 1 && Math.abs(b.y - o.y) <= 1) bad.push(id + ' ' + (o.id || 'event') + '@' + o.x + ',' + o.y + ' ↔ ボス ' + b.enemy + '@' + b.x + ',' + b.y); });
  }
}
console.log(bad.length ? bad.join('\n') : 'なし'); console.log('結果：' + (bad.length ? bad.length + ' NG' : '0 NG'));
