// v6.7 アルカディアのボス（第3・4章）を「主人公＋リーナ＋カイル」の3人で、v6.4 と同じ目標（F=1 85%以上・F=2 95%以上）に合わせる
// 倍率は現在の敵データ（v6.4 で強化した後）に掛ける。下げる方向だけを探す
const T = require('./bosstune67.js');
const ids = (process.argv[2] || 'boss_greed_golem,boss_bandit_chief,boss_tide_serpent').split(','); const n = +(process.env.BT_N || 80);
const TURNS = +(process.env.BT_TURNS || 7);
for (const id of ids) {
  const row = T.LIST.find(r => r[0] === id); const G = T.GOAL[row[3]]; const t0 = Date.now();
  const okAt = (hp, a) => { const m = { [id]: { hp, atk: a, mag: a } }; const r1 = T.rate(row, m, 0, n), r2 = T.rate(row, m, 1, n); return { r1, r2, good: r1.win >= G.f1 && r2.win >= G.f2min }; };
  const search = (hp) => { let lo = 0.3, hi = 1.0, best = null; const top = okAt(hp, 1.0); if (top.good) return { a: 1.0, r: top }; for (let k = 0; k < 7; k++) { const mid = (lo + hi) / 2; const r = okAt(hp, mid); if (r.good) { lo = mid; best = { a: mid, r }; } else hi = mid; } return best || { a: 0.3, r: okAt(hp, 0.3) }; };
  let hp = 1, s = null;
  for (let it = 0; it < 4; it++) { s = search(hp); const t2 = s.r.r2.turns; if (Math.abs(t2 - TURNS) <= 1 || it === 3) break; const nh = Math.max(0.4, Math.min(1, hp * Math.pow(TURNS / t2, 0.85))); if (Math.abs(nh - hp) < 0.04) break; hp = Math.round(nh * 20) / 20; }
  const a = Math.floor(s.a * 20) / 20; const m = { [id]: { hp, atk: a, mag: a } };
  const out = [0, 1, 2].map(fi => T.rate(row, m, fi, n * 3)); const prev = T.rate(row, m, 1, n * 3, Math.max(2, row[1] - 1));
  console.log(JSON.stringify({ id, hp, atk: a, f1: out[0], f2: out[1], f3: out[2], prevGear: prev }), ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
