// v6.7 倍率を入れたあとの確認：F=2 と F=1（想定レベルの0.82倍）で、出現地帯ごとのターン・失うHP・倒れる人数・勝率
const Z = require('./zonesim.js'); const w = Z.w; const n = +(process.env.N || 60);
const out = []; const seen = new Set();
for (const id of Object.keys(w.MAP_DEFS)) { const d = w.MAP_DEFS[id]; if (!d.encounters || !d.encounters.zones) continue;
  for (const z of d.encounters.zones) { const key = id + '|' + z.name; if (seen.has(key)) continue; seen.add(key);
    const k = w.EnemyScale.factors(id, z); const lv2 = Math.round(Z.interp(Z.PTS, z.level || 1)); const lv1 = Math.max(1, Math.round(lv2 * ((z.level || 1) > 4 ? 0.82 : 1)));
    const a = Z.zoneRun(z, n, k, lv2), b = Z.zoneRun(z, n, k, lv1);
    out.push({ id, zone: z.name, zl: z.level, k: k ? [k.hp, k.atk] : null, f2: a, f1: b });
    console.log([id.padEnd(20), z.name.padEnd(10), 'zl' + z.level, k ? ('×' + k.hp + '/' + k.atk) : '×1', '| F2 Lv' + a.lv, 't' + a.turns.toFixed(1), 'lost' + (a.lost * 100).toFixed(0) + '%', 'd' + a.deaths.toFixed(2), 'w' + (a.win * 100).toFixed(0), '| F1 Lv' + b.lv, 't' + b.turns.toFixed(1), 'lost' + (b.lost * 100).toFixed(0) + '%', 'd' + b.deaths.toFixed(2), 'w' + (b.win * 100).toFixed(0)].join(' '));
  } }
require('fs').writeFileSync(__dirname + '/zoneverify.json', JSON.stringify(out));
