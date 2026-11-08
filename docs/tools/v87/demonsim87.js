// ch1316test と同じ条件（LV76・TEST_GEAR・主人公/ガルド/ルシア/セリス・オート）で魔王 3 形態の勝率：node demonsim.js <dir> [N]
const load = require('/home/claude/envwork/docs/tools/v78/load78.js');
const dir = process.argv[2]; const N = +(process.argv[3] || 200);
const { w } = load({ dir, earth: false, join: false }); const S = w.State, A = w.Actors, C = w.Combat;
const TEST_GEAR = { weapon: 'rune_blade', armor: 'rune_mail', shield: 'aegis_shield', head: 'star_helm', acc: 'ring_guard' };
function fight(id, ex) {
  S.newGame('t', 'warrior'); const d = S.data; const LV = 76; d.hero.level = LV; A.refreshSkills(d.hero);
  ['gald', 'lucia', 'seris'].forEach((k) => { S.joinCompanion(k); d.companions[k].level = LV; A.refreshSkills(d.companions[k]); });
  d.party = ['hero', 'gald', 'lucia', 'seris']; const party = S.partyActors(); party.forEach((a) => { Object.assign(a.equip, TEST_GEAR); A.fullHeal(a); });
  const b = C.create([id], party, { boss: true, exposeFirst: ex }); let t = 0; while (b.state === 'command' && t < 80) { C.runTurn(b, party.filter((a) => !a.dead).map((a) => C.autoCommand(b, a))); t++; }
  return { won: b.state === 'won', t };
}
const out = {}; [['boss_demon_fear', 1], ['boss_demon_greed', 1], ['boss_demon_fixed', 2]].forEach(([id, ex]) => { let won = 0, tt = 0; for (let i = 0; i < N; i++) { const r = fight(id, ex); if (r.won) won++; tt += r.t; } out[id] = { win: +(won / N).toFixed(3), turns: +(tt / N).toFixed(1) }; });
console.log(dir, JSON.stringify(out));
