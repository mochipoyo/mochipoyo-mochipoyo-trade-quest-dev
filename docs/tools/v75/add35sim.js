// v7.5 追加の敵：出現表ごとに、新しく足したグループと、もとからあるグループの手ごたえを比べる（v6.7 の zonesim と同じ前提：
//   その地帯に来るころの想定レベル・その章までの店の最強装備・オート戦闘・地帯の強さの倍率）。N 回ずつ
const { zoneRun, interp, PTS, chOf, w } = require('../v67/zonesim.js');
const { gearPool, equipBest } = require('../v64/bosswin.js');
const C = w.Combat, A = w.Actors, S = w.State, D = w.MAP_DEFS, X = w.ENEMY_ADD35;
const N = +(process.env.N || 24);
const pools = {}; const pool = (ch) => pools[ch] || (pools[ch] = gearPool(w, ch));
function party(lv, ch, zl) {
  S.newGame('t', 'warrior'); const d = S.data; const h = d.hero; h.level = lv; h.jobLevels.warrior = lv; A.refreshSkills(h); d.gold = 5000;
  const mates = lv < 4 ? ['lina'] : (zl <= 8) ? ['lina', 'kyle'] : ['lina', 'kyle', 'gald'];
  mates.forEach((id) => { S.joinCompanion(id); const c = d.companions[id]; c.level = lv; c.jobLevels[c.job] = lv; c.skills = []; A.refreshSkills(c); });
  const P = pool(ch); S.partyActors().forEach((a) => { equipBest(w, a, P); A.fullHeal(a); }); return S.partyActors();
}
function run(mapId, z, g, n) {
  const lv = Math.round(interp(PTS, z.level || 1)), ch = chOf(z.level || 1); const scale = w.EnemyScale ? w.EnemyScale.factors(mapId, z) : null;
  let lost = 0, turns = 0, deaths = 0, wins = 0, stolen = 0;
  for (let i = 0; i < n; i++) {
    const ps = party(lv, ch, z.level || 1); const b = C.create(g, ps, { zone: z.name, scale: scale }); const g0 = S.data.gold;
    const maxSum = ps.reduce((s, a) => s + A.stats(a).maxHp, 0); let t = 0;
    while (b.state === 'command' && t < 40) { C.runTurn(b, ps.filter((a) => !a.dead).map((a) => C.autoCommand(b, a))); t++; }
    const hpSum = ps.reduce((s, a) => s + (a.dead ? 0 : a.hp), 0); lost += 1 - hpSum / maxSum; turns += t; deaths += ps.filter((a) => a.dead).length; if (b.state === 'won') wins++;
    stolen += Math.max(0, g0 - S.data.gold - (b.state === 'won' && b.distributed ? -b.distributed.gold : 0));
  }
  return { lv, lost: lost / n, turns: turns / n, deaths: deaths / n, win: wins / n };
}
const NEW = new Set(X.added); const rows = []; const seen = new Set();
for (const mapId of Object.keys(D)) {
  const zs = (D[mapId].encounters && D[mapId].encounters.zones) || [];
  for (const z of zs) {
    const key = z.name + '|' + z.level + '|' + z.groups.length + '|' + JSON.stringify(z.groups.slice(-3)); if (seen.has(key)) continue;
    const newG = z.groups.filter((g) => g.some((id) => NEW.has(id))); if (!newG.length) continue; seen.add(key);
    const oldG = z.groups.filter((g) => !g.some((id) => NEW.has(id)));
    const ro = oldG.map((g) => run(mapId, z, g, N)); const rn = newG.map((g) => ({ g, r: run(mapId, z, g, N) }));
    const avg = (arr, k) => arr.reduce((s, r) => s + r[k], 0) / arr.length; const mx = (arr, k) => Math.max(...arr.map((r) => r[k]));
    const o = { lost: avg(ro, 'lost'), lostMax: mx(ro, 'lost'), turns: avg(ro, 'turns'), turnsMax: mx(ro, 'turns'), deaths: avg(ro, 'deaths'), deathsMax: mx(ro, 'deaths') };
    rn.forEach(({ g, r }) => {
      const flag = (r.win < 1 ? '負けあり ' : '') + (r.lost > Math.max(o.lostMax * 1.25, o.lost + 0.06) ? 'HP減りが多い ' : '') + (r.turns > Math.max(o.turnsMax * 1.3, o.turns + 1.5) ? '長い ' : '') + (r.deaths > Math.max(o.deathsMax, 0.08) ? '倒れる ' : '') + (r.lost < o.lost * 0.4 && r.turns < o.turns * 0.6 ? '弱すぎ ' : '');
      rows.push({ mapId, zone: z.name, zl: z.level, lv: r.lv, g: g.join('+'), new: r, old: o, flag });
      console.log([mapId, z.name, 'zl' + z.level, 'Lv' + r.lv, g.map((id) => w.ENEMIES[id].name).join('+'), '新 lost ' + (r.lost * 100).toFixed(0) + '% turns ' + r.turns.toFixed(1) + ' deaths ' + r.deaths.toFixed(2) + ' win ' + (r.win * 100).toFixed(0) + '%',
        '既存 lost ' + (o.lost * 100).toFixed(0) + '%（最大 ' + (o.lostMax * 100).toFixed(0) + '%） turns ' + o.turns.toFixed(1) + '（最大 ' + o.turnsMax.toFixed(1) + '） deaths ' + o.deaths.toFixed(2) + '（最大 ' + o.deathsMax.toFixed(2) + '）', flag || 'ok'].join('\t'));
    });
  }
}
require('fs').writeFileSync(__dirname + '/add35sim.json', JSON.stringify(rows, null, 1));
const bad = rows.filter((r) => r.flag); console.log('\n新しいグループ ' + rows.length + '・目立つもの ' + bad.length);
