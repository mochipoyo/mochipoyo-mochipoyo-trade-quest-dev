// v6.4 ボス強化：倍率を変えながら、章の想定レベルでのオート戦闘の勝率を測る
// ・条件は bosswin.js と同じ（全員同じレベル・その章までの店の最強装備・アイテムなし・オート戦闘）
// ・地図のボス（events の type:'boss'）は「ダウの眼」なし（exposeFirst 0）で測る＝控えめな条件。最終戦は最低の expose 1
// 使い方：node v64/bosstune.js tune [id,...]   … 倍率を探す
//        node v64/bosstune.js check '{"id":{"hp":1.5,"atk":1.3}}' [N] … 指定の倍率で各レベルの勝率
const load = require('../rpgload.js'); const fs = require('fs');
const { gearPool, equipBest } = require('../v64/bosswin.js');
// 章ごとの想定レベル（docs/balance-v64.md の 3. 変更後）
const LV = { 2: [5.1, 6.4, 7.4], 3: [8.1, 10.1, 11.5], 4: [9.1, 10.8, 12.1], 5: [18.7, 23.4, 26.7], 6: [21.8, 26.2, 29.5], 7: [23.8, 28.1, 31.5], 8: [29.9, 36.0, 40.6], 9: [32.5, 39.4, 44.6], 10: [35.8, 43.7, 49.6], 11: [40.0, 49.1, 55.9], 12: [41.4, 50.5, 57.4], 13: [46.1, 56.7, 64.7], 14: [48.4, 59.6, 67.9], 15: [50.9, 62.7, 71.5], 16: [53.6, 65.4, 74.2] };
// [id, 章, 敵の組, 区分, exposeFirst]
const LIST = [
  ['boss_lost_trend', 2, ['boss_lost_trend'], 'early', 0],
  ['boss_greed_golem', 3, ['boss_greed_golem'], 'early', 0],
  ['boss_bandit_chief', 3, ['boss_bandit_chief'], 'early', 0],
  ['boss_tide_serpent', 4, ['boss_tide_serpent'], 'early', 0],
  ['boss_overseer', 5, ['boss_overseer'], 'mid', 0],
  ['boss_ledger_guardian', 6, ['boss_ledger_guardian'], 'mid', 0],
  ['boss_valen', 7, ['boss_valen'], 'mid', 0],
  ['boss_royal_captain', 7, ['boss_royal_captain', 'royal_guard'], 'mid', 0],
  ['boss_ledger_core', 7, ['boss_ledger_core'], 'mid', 0],
  ['boss_ruin_memory', 8, ['boss_ruin_memory'], 'mid', 0],
  ['boss_library_guardian', 9, ['boss_library_guardian'], 'mid', 0],
  ['boss_storm_chief', 9, ['boss_storm_chief', 'caravan_raider'], 'side', 0],
  ['boss_mirage_lord', 9, ['boss_mirage_lord'], 'side', 0],
  ['boss_time_guardian', 10, ['boss_time_guardian'], 'mid', 0],
  ['boss_frost_spirit', 10, ['boss_frost_spirit'], 'side', 0],
  ['boss_memory_keeper', 10, ['boss_memory_keeper'], 'side', 0],
  ['boss_drone_swarm', 11, ['boss_drone_swarm'], 'mid', 0],
  ['boss_core_defense', 12, ['boss_core_defense'], 'mid', 0],
  ['boss_minister', 13, ['boss_minister', 'summoned_chimera'], 'late', 0],
  ['boss_magma_wyrm', 13, ['boss_magma_wyrm'], 'side', 0],
  ['boss_sky_guardian', 14, ['boss_sky_guardian'], 'late', 0],
  ['boss_zarg_remnant', 15, ['boss_zarg_remnant'], 'late', 0],
  ['boss_sevran_shadow', 15, ['boss_sevran_shadow'], 'late', 0],
  ['boss_grote_2', 15, ['boss_grote_2'], 'late', 0],
  ['boss_demon_fear', 16, ['boss_demon_fear'], 'final', 1],
  ['boss_demon_greed', 16, ['boss_demon_greed'], 'final', 1],
  ['boss_demon_fixed', 16, ['boss_demon_fixed'], 'final', 1],
];
// 目標（F=1 の勝率・F=2 の下限・F=3 の下限・F=2 の平均ターン）
const GOAL = { early: { f1: 0.85, f2min: 0.95, turns: 6 }, mid: { f1: 0.62, f2min: 0.88, turns: 10 }, side: { f1: 0.62, f2min: 0.88, turns: 10 }, late: { f1: 0.62, f2min: 0.88, turns: 11 }, final: { f1: 0.70, f2min: 0.92, turns: 10 } };
let W = null, POOLS = {};
function world() { if (!W) { W = load().w; } return W; }
function pool(ch) { if (!POOLS[ch]) POOLS[ch] = gearPool(world(), ch); return POOLS[ch]; }
function withMul(mul, fn) { // mul: {id:{hp,atk,mag}}（倍率は敵データの元の値に掛ける）
  const E = world().ENEMIES; const saved = {};
  Object.keys(mul || {}).forEach(id => { const e = E[id]; if (!e) return; saved[id] = { hp: e.hp, atk: e.atk, mag: e.mag }; const m = mul[id]; if (m.hp) e.hp = Math.round(e.hp * m.hp); if (m.atk) e.atk = Math.round(e.atk * m.atk); if (m.mag && e.mag) e.mag = Math.round(e.mag * m.mag); });
  try { return fn(); } finally { Object.keys(saved).forEach(id => Object.assign(E[id], saved[id])); }
}
function lvRound(x) { const f = Math.floor(x); return Math.random() < x - f ? f + 1 : f; }   // 小数のレベルは確率で丸める
function fight(ch, ids, lv, expose, gearCh) {
  const w = world(); const S = w.State, A = w.Actors, C = w.Combat; S.newGame('t', 'warrior'); const d = S.data; const h = d.hero; const L = lvRound(lv); h.level = L; h.jobLevels.warrior = L; A.refreshSkills(h);
  const mates = ch <= 2 ? ['lina'] : ch <= 4 ? ['lina', 'kyle'] : (process.env.BT_M5 ? process.env.BT_M5.split(',') : ['lina', 'kyle', 'seris']); mates.forEach(id => { S.joinCompanion(id); const c = d.companions[id]; c.level = L; c.jobLevels[c.job] = L; c.skills = []; A.refreshSkills(c); });
  const P = pool(gearCh || ch); S.partyActors().forEach(a => { equipBest(w, a, P); A.fullHeal(a); });
  const party = S.partyActors(); const b = C.create(ids, party, { boss: true }); if (expose) b.enemies.forEach(e => { e.exposed = expose; });
  let t = 0; while (b.state === 'command' && t < 80) { C.runTurn(b, party.filter(a => !a.dead).map(a => C.autoCommand(b, a))); t++; }
  return { won: b.state === 'won', t };
}
const SCRIPTED = { boss_tide_serpent: 1, boss_valen: 1, boss_demon_fear: 1, boss_demon_greed: 1, boss_demon_fixed: 1 };   // 地図のボスではない戦い（ダウの眼の効果なし）
function rate(row, mul, fi, n, gearCh) { const id0 = row[0]; const ex0 = row[4]; const ex = (process.env.BT_EXPOSE && !SCRIPTED[id0]) ? +process.env.BT_EXPOSE : ex0; const [id, ch, ids] = row; return withMul(mul, () => { let won = 0, tt = 0; for (let i = 0; i < n; i++) { const r = fight(ch, ids, LV[ch][fi], ex, gearCh); if (r.won) won++; tt += r.t; } return { win: won / n, turns: tt / n }; }); }
function tuneOne(row, n) {
  const [id, ch, , cls] = row; const G = GOAL[cls];
  const base2 = rate(row, {}, 1, n);
  // 攻撃・魔力の倍率を二分探索：F=1 の勝率が目標以上、F=2 が下限以上を満たす最大の倍率
  const okAt = (hp, a) => { const m = { [id]: { hp, atk: a, mag: a } }; const r1 = rate(row, m, 0, n), r2 = rate(row, m, 1, n); return { r1, r2, good: r1.win >= G.f1 && r2.win >= G.f2min }; };
  const searchAtk = (hp) => { let lo = 1, hi = 5, best = null; if (!okAt(hp, 1).good) return { a: 1, r: okAt(hp, 1) }; for (let k = 0; k < 8; k++) { const mid = (lo + hi) / 2; const r = okAt(hp, mid); if (r.good) { lo = mid; best = { a: mid, r }; } else hi = mid; } return best || { a: 1, r: okAt(hp, 1) }; };
  // HP の倍率：攻撃を上げたあとの F=2 の平均ターンが目標に近づくように調整（3回まで）
  let hp = 1, s = null;
  for (let it = 0; it < 4; it++) { s = searchAtk(hp); const t2 = s.r.r2.turns; if (Math.abs(t2 - G.turns) <= 1 || it === 3) break; const nh = Math.max(1, Math.min(4, hp * Math.pow(G.turns / t2, 0.85))); if (Math.abs(nh - hp) < 0.05) break; hp = Math.round(nh * 20) / 20; }
  const a = Math.round(s.a * 20) / 20; const m = { [id]: { hp, atk: a, mag: a } };
  const r1 = rate(row, m, 0, n * 3), r2 = rate(row, m, 1, n * 3), r3 = rate(row, m, 2, n * 3);
  return { id, ch, cls, hp, atk: a, base2, f1: r1, f2: r2, f3: r3 };
}
module.exports = { LIST, LV, GOAL, rate, fight, withMul, world };
if (require.main === module) {
  const mode = process.argv[2];
  if (mode === 'tune') {
    const only = process.argv[3] ? process.argv[3].split(',') : null; const n = +(process.env.BT_N || 60);
    LIST.filter(r => !only || only.includes(r[0])).forEach(row => { const t0 = Date.now(); const r = tuneOne(row, n); console.log(JSON.stringify(r) + ' ' + ((Date.now() - t0) / 1000).toFixed(0) + 's'); });
  } else if (mode === 'check') {
    const mul = JSON.parse(process.argv[3] || '{}'); const n = +(process.argv[4] || 100); const only = process.env.BT_ONLY ? process.env.BT_ONLY.split(',') : null;
    LIST.filter(r => !only || only.includes(r[0])).forEach(row => { const out = [0, 1, 2].map(fi => rate(row, mul, fi, n)); const prev = rate(row, mul, 1, n, Math.max(2, row[1] - 1)); console.log(row[0].padEnd(22), 'ch' + row[1], out.map((r, i) => 'F' + (i + 1) + ' ' + (r.win * 100).toFixed(0) + '% ' + r.turns.toFixed(1) + 't').join(' | '), '| F2前章装備 ' + (prev.win * 100).toFixed(0) + '%'); });
  }
}
// node v64/bosstune.js refine id hp … HP を固定して攻撃の倍率だけ探す
if (require.main === module && process.argv[2] === 'refine') {
  const id = process.argv[3], hp = +process.argv[4]; const n = +(process.env.BT_N || 100); const row = LIST.find(r => r[0] === id); const G = GOAL[row[3]];
  const okAt = (a) => { const m = { [id]: { hp, atk: a, mag: a } }; const r1 = rate(row, m, 0, n), r2 = rate(row, m, 1, n); return { r1, r2, good: r1.win >= G.f1 && r2.win >= G.f2min }; };
  let lo = 1, hi = 5, best = 1; for (let k = 0; k < 8; k++) { const mid = (lo + hi) / 2; if (okAt(mid).good) { lo = mid; best = mid; } else hi = mid; }
  const a = Math.round(best * 20) / 20; const m = { [id]: { hp, atk: a, mag: a } };
  const out = [0, 1, 2].map(fi => rate(row, m, fi, n * 3));
  console.log(JSON.stringify({ id, ch: row[1], cls: row[3], hp, atk: a, f1: out[0], f2: out[1], f3: out[2] }));
}
