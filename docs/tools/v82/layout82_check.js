// v8.2 Layout82 の確かめ：node layout82_check.js [2d] [id,id,...]（id を渡すと前と後の行を並べて表示）
const load = require('../v78/load78.js');
const mode2d = process.argv.includes('2d'); const show = (process.argv.slice(2).find((a) => a !== '2d') || '').split(',').filter(Boolean);
const { w, errors } = load(mode2d ? { earth: false, join: false } : {});
const L = w.Layout82; if (!L) { console.log('Layout82 なし', errors); process.exit(1); }
const own = Object.keys(L.owner); const done = Object.keys(L.maps); const sk = L.skipped;
const why = {}; Object.keys(sk).forEach((k) => { why[sk[k]] = (why[sk[k]] || 0) + 1; });
console.log('部屋', own.length, '作り直し', done.length, '対象外', Object.keys(sk).length, 'エラー', L.errors.length, 'load errors', errors.length);
console.log(why); if (L.errors.length) console.log(L.errors.slice(0, 10));
const roles = {}; own.forEach((id) => { const r = (L.role[id] || {}).role; roles[r] = (roles[r] || 0) + 1; }); console.log(roles);
for (const id of show) { const d = w.MAP_DEFS[id]; const l = d._l82; console.log('== ' + id + ' ' + d.name + ' town=' + L.owner[id] + ' role=' + JSON.stringify(L.role[id]) + (l ? ' placed=' + l.placed + ' pieces=' + l.pieces : ' skipped=' + sk[id]));
  const old = l ? l.old : d.rows; old.forEach((r, i) => console.log('  ' + r + '   ' + d.rows[i])); if (l) console.log('  ' + l.log.join(', ')); }
