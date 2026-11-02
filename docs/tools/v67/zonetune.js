// v6.7 出現地帯ごとの倍率を探す：目標（ターン数 T・1戦で失うHPの割合 L）は地帯の level で決める
const Z = require('./zonesim.js'); const w = Z.w;
const TT = [[4, 1.9], [8, 2.3], [12, 2.6], [20, 2.8], [26, 3.0], [32, 3.1], [38, 3.2]];
const LL = [[4, 0.04], [8, 0.055], [12, 0.075], [20, 0.09], [26, 0.10], [32, 0.11], [38, 0.12]];
const DMAX = +(process.env.DMAX || 0.05);
const n = +(process.env.N || 40);
function K(kH, kA) { return { hp: kH, atk: kA, mag: kA, def: Math.sqrt(kA) }; }
function evalZ(z, kH, kA, nn) { return Z.zoneRun(z, nn || n, K(kH, kA)); }
function tune(z) {
  const T = Z.interp(TT, z.level || 1), L = Z.interp(LL, z.level || 1); let kH = 1, kA = 1, r = null; if ((z.level || 1) <= 4) return { kH: 1, kA: 1, T, L, r: evalZ(z, 1, 1, n) };
  for (let it = 0; it < 3; it++) {
    // HP：ターン数がほぼ比例するとして直接合わせ、2回補正
    for (let j = 0; j < 3; j++) { r = evalZ(z, kH, kA); const f = T / Math.max(1, r.turns); if (Math.abs(f - 1) < 0.06) break; kH = Math.max(1, Math.min(10, kH * Math.pow(f, 1.1))); }
    // 攻撃：二分探索（失うHPの割合）
    let lo = 1, hi = 6; r = evalZ(z, kH, lo); if (r.lost >= L) { kA = 1; } else { for (let j = 0; j < 7; j++) { const mid = (lo + hi) / 2; const q = evalZ(z, kH, mid); if (q.lost < L) lo = mid; else hi = mid; } kA = (lo + hi) / 2; }
  }
  // 倒れる人が多すぎるときは攻撃を下げる（1戦あたり DMAX 人まで）
  r = evalZ(z, kH, kA, n * 2); let g = 0; while (r.deaths > DMAX && kA > 1 && g++ < 8) { kA = Math.max(1, kA * 0.9); r = evalZ(z, kH, kA, n * 2); }
  return { kH: Math.round(kH * 100) / 100, kA: Math.round(kA * 100) / 100, T, L, r };
}
module.exports = { tune, TT, LL, K };
if (require.main === module) {
  const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null; const seen = new Set(); const out = {};
  for (const id of Object.keys(w.MAP_DEFS)) { const d = w.MAP_DEFS[id]; if (!d.encounters || !d.encounters.zones) continue; if (only && !only.test(id)) continue;
    for (const z of d.encounters.zones) { const key = z.name + '|' + JSON.stringify(z.groups); if (seen.has(key)) continue; seen.add(key); const t0 = Date.now();
      const t = tune(z); out[id + '|' + z.name] = { zl: z.level, kH: t.kH, kA: t.kA };
      console.log(JSON.stringify({ map: id, zone: z.name, zl: z.level, kH: t.kH, kA: t.kA, T: t.T.toFixed(2), L: t.L.toFixed(3), lv: t.r.lv, turns: t.r.turns.toFixed(2), lost: t.r.lost.toFixed(3), deaths: t.r.deaths.toFixed(2), win: t.r.win }), ((Date.now() - t0) / 1000).toFixed(1) + 's'); } }
  require('fs').writeFileSync(__dirname + '/zonetune_' + (process.env.TAG || 'out') + '.json', JSON.stringify(out, null, 1));
}
