// v6.7 仲間の加入場所：アルカディアで仲間になるのはカイルまで。ミナ・セリス・ガルド・ルシアは後の地域で仲間になる
const load = require('./rpgload.js'); const { w, errors } = load(); const State = w.State, World = w.World;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
w.Win.message = () => Promise.resolve(); w.Win.choice = () => Promise.resolve(0);
async function talk(id) { const n = World.map.npcs.find(x => x.id === id && !x.hidden); if (!n) return false; World.busy = false; World.talk(n); for (let i = 0; i < 50 && World.busy; i++) await new Promise(r => setTimeout(r, 2)); return true; }
(async () => {
  State.newGame('t', 'warrior'); const d = State.data; const BG = w.BattleBG65; const C = w.COMPANIONS;
  // アルカディアの地図にいる「仲間にする」NPC は リーナとカイルだけ
  const arc = {}; for (const [id, def] of Object.entries(w.MAP_DEFS)) { if (BG.regionOf(id) !== 'arcadia') continue; (def.npcs || []).forEach(n => { if (C[n.id]) arc[n.id] = id; }); }
  ok(JSON.stringify(Object.keys(arc).sort()) === JSON.stringify(['kyle', 'lina']), 'アルカディアで仲間になるのはリーナとカイルだけ（' + Object.keys(arc).join('・') + '）');
  const TO = { gald: ['ash_shore_hut', 'grania'], seris: ['verum_factory', 'grania'], mina: ['kalion_tavern', 'kalion'], lucia: ['sentra_tavern', 'kalion'] };
  for (const [cid, [map, reg]] of Object.entries(TO)) {
    const where = Object.entries(w.MAP_DEFS).filter(([id, def]) => (def.npcs || []).some(n => n.id === cid)).map(([id]) => id);
    ok(where.length === 1 && where[0] === map && BG.regionOf(map) === reg, cid + ' は ' + map + '（' + reg + '）だけにいる');
  }
  // 話すと仲間になる（ルシアはダウ理論とEMAの教えのあと）
  d.flags.cave_boss = true; d.flags.learned_dow = true; d.flags.learned_ema = true;
  for (const [cid, [map]] of Object.entries(TO)) { World.enterMap(map, 5, 7, 'up'); const okTalk = await talk(cid); ok(okTalk && !!d.companions[cid], cid + ' と話して仲間になる'); World.applyState(World.map); ok(World.map.npcs.find(n => n.id === cid).hidden, cid + ' は仲間になったあと、その場所から消える'); }
  ok(d.party.length === 4 && Object.keys(d.companions).length === 4, '戦闘メンバーは4人まで、あとは待機（' + d.party.join(',') + '）');
  // ルシア：教えの前は仲間にならない
  State.newGame('t', 'warrior'); const d2 = State.data; World.enterMap('sentra_tavern', 5, 7, 'up'); await talk('lucia'); ok(!d2.companions.lucia, 'ルシア：ダウ理論とEMAの教えの前は仲間にならない');
  // 古いセーブ：アルカディアですでに仲間にしていたミナは、新しい場所に出ない
  State.newGame('t', 'warrior'); State.joinCompanion('mina'); World.enterMap('kalion_tavern', 5, 7, 'up'); ok(World.map.npcs.find(n => n.id === 'mina').hidden, '古いセーブ：すでに仲間のミナは、カリオンの酒場に出ない');
  // ダウの村の見た目（建物・出入口）は前の版と同じ（仲間の NPC は配置が決まったあとで外す）
  const m = new w.GameMap(w.MAP_DEFS.dow_village); ok(m.warps.some(x => x.x === 10 && x.y === 23) && !m.warps.some(x => x.x === 10 && x.y === 22), 'ダウの村の建物の出入口は前の版と同じ位置（10,23）');
  ok(errors.length === 0, 'エラーなし ' + errors.slice(0, 2).join('|'));
  console.log('結果: ' + pass + ' OK / ' + fail + ' NG'); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('EXC', e && e.stack); process.exit(1); });
