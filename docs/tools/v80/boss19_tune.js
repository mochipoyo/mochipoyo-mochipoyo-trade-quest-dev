// v8.0 新しいボス19体の強さの調整（作業用の戦闘シミュレーション。jsdom の地球の世界）
// ・条件は v6.4〜v7.9 のボスの調整と同じ：全員同じレベル・その章までの店の最強装備（/home/claude/work/v64/bosswin.js の gearPool・equipBest）・アイテムなし・オート戦闘
//   パーティー：主人公（戦士）＋リーナ・カイル（＋第5章からセリス）。章は、その場所の地帯の level（z）で決める（下の CH）
// ・目標（通常のボスより強め）：その場所の推奨レベルの上の数（＝地帯の想定レベル F2）で勝率 50% ほど（36〜64%）、そこから 6 レベル上で 80% 以上
//   （通常の章のボスは F2 で 88% 以上・少ないレベル F1 で 62% ほど）
// ・攻撃・魔力の倍率を何段か試し、それぞれで HP の倍率を二分探索。条件を満たすもののうち、戦いのターン数が 24 に近いものを選ぶ
// 使い方：node boss19_tune.js [key,...] [N]   結果は boss19_tune.json（同じフォルダ）に書く
//         node boss19_tune.js verify [N] [key,...]   いまのデータのまま勝率を測る（boss19_verify.json）
//         node boss19_tune.js compare [N]   これまでの章のボスを同じ条件で測る（boss19_compare.json）
const load = require('../v78/load78.js'); const fs = require('fs');
const { gearPool, equipBest } = require('/home/claude/work/v64/bosswin.js');
const want = (process.argv[2] || '').split(',').filter(Boolean); const N = +(process.argv[3] || 40);
const A0 = load(); const w = A0.w; const R = w.RecLevel; const B = w.BOSS19.bosses; const E = w.ENEMIES;
const CHB = [[10, 4], [13, 5], [15, 6], [18, 7], [20, 8], [21, 9], [24, 10], [25, 11], [27, 12], [30, 13], [33, 14], [99, 15]];   // 章ボスのレベル → 章
const chOf = (z) => { for (const [lv, ch] of CHB) if (z <= lv) return ch; return 15; };
const POOL = {}; const pool = (ch) => POOL[ch] || (POOL[ch] = gearPool(w, ch));
function lvRound(x) { const f = Math.floor(x); return Math.random() < x - f ? f + 1 : f; }
function fight(ch, id, lv) {
  const S = w.State, Ac = w.Actors, C = w.Combat; S.newGame('t', 'warrior'); const d = S.data; const h = d.hero; const L = lvRound(lv); h.level = L; h.jobLevels.warrior = L; Ac.refreshSkills(h);
  const mates = ch <= 4 ? ['lina', 'kyle'] : ['lina', 'kyle', 'seris']; mates.forEach((m) => { S.joinCompanion(m); const c = d.companions[m]; c.level = L; c.jobLevels[c.job] = L; c.skills = []; Ac.refreshSkills(c); });
  const P = pool(ch); S.partyActors().forEach((a) => { equipBest(w, a, P); Ac.fullHeal(a); });
  const party = S.partyActors(); const b = C.create([id], party, { boss: true }); let t = 0;
  while (b.state === 'command' && t < 80) { C.runTurn(b, party.filter((a) => !a.dead).map((a) => C.autoCommand(b, a))); t++; }
  return { won: b.state === 'won', t };
}
function rate(ch, id, lv, n) { let won = 0, tt = 0; for (let i = 0; i < n; i++) { const r = fight(ch, id, lv); if (r.won) won++; tt += r.t; } return { win: won / n, turns: +(tt / n).toFixed(1) }; }
if (process.argv[2] === 'compare') {   // くらべる相手：これまでの章のボス（v6.7 の調整と同じ章ごとのレベル LV＝[F1, F2, F3]）を同じ条件で
  const LV = { 4: [9.1, 10.8, 12.1], 5: [18.7, 23.4, 26.7], 6: [21.8, 26.2, 29.5], 7: [23.8, 28.1, 31.5], 8: [29.9, 36.0, 40.6], 9: [32.5, 39.4, 44.6], 10: [35.8, 43.7, 49.6], 11: [40.0, 49.1, 55.9], 12: [41.4, 50.5, 57.4], 13: [46.1, 56.7, 64.7], 14: [48.4, 59.6, 67.9], 15: [50.9, 62.7, 71.5] };
  const L = [[4, 'boss_tide_serpent'], [5, 'boss_overseer'], [6, 'boss_ledger_guardian'], [7, 'boss_ledger_core'], [8, 'boss_ruin_memory'], [9, 'boss_library_guardian'], [10, 'boss_time_guardian'], [11, 'boss_drone_swarm'], [12, 'boss_core_defense'], [14, 'boss_sky_guardian'], [15, 'boss_grote_2']];
  const n = +(process.argv[3] || 100); const V = {};
  for (const [ch, id] of L) { if (!E[id]) continue; const lv = LV[ch]; V[id] = { ch, lv, f1: rate(ch, id, lv[0], n), f2: rate(ch, id, lv[1], n) }; console.log(id, JSON.stringify(V[id])); }
  fs.writeFileSync(__dirname + '/boss19_compare.json', JSON.stringify(V, null, 1)); process.exit(0);
}
if (process.argv[2] === 'verify') { const n = +(process.argv[3] || 200); const only = (process.argv[4] || '').split(',').filter(Boolean); const V = fs.existsSync(__dirname + '/boss19_verify.json') ? JSON.parse(fs.readFileSync(__dirname + '/boss19_verify.json', 'utf8')) : {}; for (const b of B) { if (only.length && only.indexOf(b.key) < 0) continue; const ch = chOf(b.z); const F = R.range(b.z); const e = E[b.id];
    V[b.key] = { lv: b.lv, ch, F, rec: b.rec || null, HP: e.hp, ATK: e.atk, MAG: e.mag, DEF: e.def, AGI: e.agi, f1: rate(ch, b.id, F[0], n), f2: rate(ch, b.id, F[1], n), f3: rate(ch, b.id, F[1] + 6, n) }; console.log(b.key, JSON.stringify(V[b.key])); }
  fs.writeFileSync(__dirname + '/boss19_verify.json', JSON.stringify(V, null, 1)); process.exit(0); }
const out = fs.existsSync(__dirname + '/boss19_tune.json') ? JSON.parse(fs.readFileSync(__dirname + '/boss19_tune.json', 'utf8')) : {};
for (const b of B) {
  if (want.length && want.indexOf(b.key) < 0) continue;
  const e = E[b.id]; const base = { hp: e.hp / b.hp, atk: e.atk / b.atk, mag: e.mag / b.mag };   // 倍率を掛ける前の値
  const ch = chOf(b.z); const F = R.range(b.z); const F2 = F[1], F3 = F2 + 6;
  // 攻撃・魔力の倍率を何段か試し、それぞれ HP の倍率を二分探索して F2 で勝率 50% にそろえる。
  // そのうち「6 レベル上で 82% 以上」を満たし、F2 での平均ターン数が 24 に近いものを選ぶ（長すぎる戦いにしない）
  const cand = []; const t0 = Date.now();
  for (const k of [0.8, 0.9, 1.0, 1.15, 1.3, 1.5, 1.75, 2.0, 2.3, 2.6]) {
    const atkM = b.atk * k, magM = b.mag * k; e.atk = Math.round(base.atk * atkM); e.mag = Math.round(base.mag * magM);
    let lo = 0.5, hi = 80; for (let it = 0; it < 9; it++) { const m = Math.sqrt(lo * hi); e.hp = Math.round(base.hp * m); const r = rate(ch, b.id, F2, N); if (r.win > 0.5) lo = m; else hi = m; }
    const hpM = Math.sqrt(lo * hi); e.hp = Math.round(base.hp * hpM);
    const f2 = rate(ch, b.id, F2, N * 2), f3 = rate(ch, b.id, F3, N * 2);
    cand.push({ k, atkM, magM, hpM, f2, f3, HP: e.hp, ATK: e.atk, MAG: e.mag });
    if (hpM < 0.6) break;   // HP をこれ以上下げられない＝攻撃が強すぎる
  }
  const good = cand.filter((c) => c.f3.win >= 0.8 && c.f2.win >= 0.36 && c.f2.win <= 0.64 && c.hpM < 79);
  const pick = (good.length ? good : cand.slice().sort((a, b2) => b2.f3.win - a.f3.win).slice(0, 3)).sort((a, b2) => Math.abs(a.f2.turns - 24) - Math.abs(b2.f2.turns - 24))[0];
  const hpM = pick.hpM, atkM = pick.atkM, magM = pick.magM; e.hp = pick.HP; e.atk = pick.ATK; e.mag = pick.MAG; const res = { f2: pick.f2, f3: pick.f3 };
  const tried = cand.map((c) => [c.k, +c.hpM.toFixed(1), c.f2.win, c.f2.turns, c.f3.win].join('/')).join(' ');
  const r1 = rate(ch, b.id, F[0], N * 2);
  out[b.key] = { id: b.id, z: b.z, lv: b.lv, ch, F, hp: +hpM.toFixed(2), atk: +atkM.toFixed(3), mag: +magM.toFixed(3), HP: e.hp, ATK: e.atk, MAG: e.mag, DEF: e.def, AGI: e.agi, f1: r1, f2: res.f2, f3: res.f3, ok: good.length > 0, tried, ms: Date.now() - t0 };
  console.log(b.key, JSON.stringify(out[b.key]));
  fs.writeFileSync(__dirname + '/boss19_tune.json', JSON.stringify(out, null, 1));
}
