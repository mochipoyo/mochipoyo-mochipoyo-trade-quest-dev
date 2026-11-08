// 新しい地図（城郭区画・学院の本校舎）を通る目的地ナビ：赤い輪（hop）をたどって目的地まで行けるか（jsdom）
const load = require('/home/claude/envwork/docs/tools/v78/load78.js');
const two = process.argv.includes('2d');
const { w } = load(two ? { earth: false, join: false } : {}); const W = w.World, S = w.State, N = w.Nav;
w.Win.message = async () => { }; w.Win.toast = () => { };
function run(label, setup, startMap, sx, sy, want) {
  S.newGame('t', 'warrior'); const d = S.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; W.start(); W.encounter = () => { };
  setup(d); W.busy = false; W.enterMap(startMap, sx, sy, 'down', { raw: true });
  const trail = []; let ok = false;
  for (let i = 0; i < 12; i++) {
    const c = N.compute(true); const hop = c && c.hop; if (!hop) { trail.push('hop なし'); break; }
    trail.push(W.map.id + '@' + hop.x + ',' + hop.y + ':' + hop.kind + (hop.label ? '(' + hop.label + ')' : ''));
    if (hop.kind === 'target' || hop.kind === 'here') { ok = W.map.id === want; break; }
    if (hop.kind === 'blocker') { d.flags[hop.ev.doneFlag] = true; W.applyState(W.map); continue; }
    if (hop.kind === 'exit') { const wp = W.map.warpAt(hop.x, hop.y); if (!wp) { trail.push('出口にワープがない'); break; } if (wp.needFlag && !d.flags[wp.needFlag]) { trail.push('鍵のワープ ' + wp.needFlag); break; } W.busy = false; W.enterMap(wp.to, wp.tx, wp.ty, 'down', wp.raw ? { raw: true } : undefined); continue; }
    trail.push('想定外の種類'); break;
  }
  console.log((ok ? 'OK  ' : 'NG  ') + label + '：' + trail.join(' → '));
  return ok;
}
const done = (d, upto) => { Object.keys(w.QUESTS).filter((k) => w.QUESTS[k].main).forEach((q) => { const n = +q.split('_')[1]; if (n < upto) d.quests[q] = { state: 'done', at: 1 }; }); d.quests['main_' + upto] = { state: 'active', at: 1 }; };
const res = [];
res.push(run('リヴェル王に会う（第1章）：城下町 → 楼門 → 城郭区画 → 城', (d) => { d.quests.main_1 = { state: 'active', at: 1 }; w.OBJECTIVES.filter((o) => o.q === 'main_1' && o.done !== 'king_quest1' && o.done !== '_start').forEach((o) => { d.flags[o.done] = true; }); }, 'rivel_town', 35, 52, 'rivel_castle'));
res.push(run('親衛隊長（第7章）：王都 → 楼門 → 宮苑 → 王宮', (d) => { done(d, 7); w.OBJECTIVES.filter((o) => o.q === 'main_7' && o.done !== 'royal_captain_defeated' && o.done !== '_start').forEach((o) => { d.flags[o.done] = true; }); d.flags.palace_open = true; }, 'sentra_capital', 33, 36, 'sentra_palace_1'));
res.push(run('魔導王（第13章）：マクディア → 楼門 → 城郭区画 → 魔導王宮', (d) => { done(d, 13); w.OBJECTIVES.filter((o) => o.q === 'main_13' && o.done !== 'magicka_choice_done' && o.done !== '_start').forEach((o) => { d.flags[o.done] = true; }); }, 'magicka_city', 32, 33, 'magicka_palace'));
console.log('結果：' + res.filter(Boolean).length + '/' + res.length + ' OK');
