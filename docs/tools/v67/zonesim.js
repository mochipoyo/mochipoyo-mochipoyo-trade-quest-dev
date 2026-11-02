// v6.7 通常戦の手ごたえ：出現地帯ごとに、その地帯に来るころの想定レベル・その章までの店の最強装備・オート戦闘で、
// 1戦で失うHPの割合（パーティー全体）・ターン数・倒れた人数を測る。倍率 SCALE を指定すると敵の HP・攻撃・守備・魔力に掛ける
const load = require('../rpgload.js'); const { w } = load();
const { gearPool, equipBest } = require('../v64/bosswin.js');
const C = w.Combat, A = w.Actors, S = w.State;
// 地帯の level（データの値）→ 想定するプレイヤーのレベル（docs/balance-v64.md の 3. の F=2、章の前後の中間）
const PTS = [[1, 2], [4, 6], [7, 10], [10, 12], [12, 17], [13, 22], [15, 26], [19, 33], [21, 38], [23, 42], [25, 47], [26, 50], [29, 54], [32, 58], [36, 63], [38, 66]];
function interp(P, x) { if (x <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const [x0, y0] = P[i - 1], [x1, y1] = P[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return P[P.length - 1][1]; }
const CHP = [[1, 1], [4, 2], [8, 3], [9, 4], [13, 5], [16, 7], [21, 9], [23, 10], [26, 12], [29, 13], [32, 14], [38, 15]];
function chOf(zl) { for (const [z, c] of CHP) if (zl <= z) return c; return 16; }
const pools = {}; function pool(ch) { return pools[ch] || (pools[ch] = gearPool(w, ch)); }
const Z0 = { zl: 0 };
function party(lv, ch) {
  S.newGame('t', 'warrior'); const d = S.data; const h = d.hero; h.level = lv; h.jobLevels.warrior = lv; A.refreshSkills(h);
  const zl0 = (Z0.zl || 0); const mates = lv < 4 ? ['lina'] : (zl0 && zl0 <= 8) || (!zl0 && lv < 15) ? ['lina', 'kyle'] : ['lina', 'kyle', 'gald'];
  mates.forEach(id => { S.joinCompanion(id); const c = d.companions[id]; c.level = lv; c.jobLevels[c.job] = lv; c.skills = []; A.refreshSkills(c); });
  const P = pool(ch); S.partyActors().forEach(a => { equipBest(w, a, P); A.fullHeal(a); }); return S.partyActors();
}
function zoneRun(z, n, scale, lvOverride) {
  const lv = Math.round(lvOverride || interp(PTS, z.level || 1)); const ch = chOf(z.level || 1); Z0.zl = z.level || 1;
  let lost = 0, turns = 0, deaths = 0, wins = 0;
  for (let i = 0; i < n; i++) {
    const ps = party(lv, ch); const g = z.groups[Math.floor(Math.random() * z.groups.length)];
    const b = C.create(g, ps, { zone: z.name, scale: scale });
    const maxSum = ps.reduce((s, a) => s + A.stats(a).maxHp, 0); let t = 0;
    while (b.state === 'command' && t < 40) { C.runTurn(b, ps.filter(a => !a.dead).map(a => C.autoCommand(b, a))); t++; }
    const hpSum = ps.reduce((s, a) => s + (a.dead ? 0 : a.hp), 0); lost += 1 - hpSum / maxSum; turns += t; deaths += ps.filter(a => a.dead).length; if (b.state === 'won') wins++;
  }
  return { lv, ch, lost: lost / n, turns: turns / n, deaths: deaths / n, win: wins / n };
}
module.exports = { zoneRun, interp, PTS, chOf, w };
if (require.main === module) {
  const n = +(process.env.N || 30); const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null; const seen = new Set();
  for (const id of Object.keys(w.MAP_DEFS)) { const d = w.MAP_DEFS[id]; if (!d.encounters || !d.encounters.zones) continue; if (only && !only.test(id)) continue;
    for (const z of d.encounters.zones) { const key = z.name + '|' + JSON.stringify(z.groups); if (seen.has(key)) continue; seen.add(key);
      const r = zoneRun(z, n, null); console.log([id, z.name, 'zl' + z.level, 'Lv' + r.lv, 'ch' + r.ch, 'lost ' + (r.lost * 100).toFixed(0) + '%', 'turns ' + r.turns.toFixed(1), 'deaths ' + r.deaths.toFixed(2), 'win ' + (r.win * 100).toFixed(0) + '%'].join('\t')); } }
}
