// v7.0 カリオン・セントラに入ったら「次の目的」が進む（2D・jsdom）
const load = require('../rpgload.js'); const { w } = load(); const State = w.State, World = w.World;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
w.Win.message = () => Promise.resolve(); w.Win.toast = () => {}; World.encounter = function () {};
State.newGame('t', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done';
World.start();
['main_1','main_2','main_3','main_4','main_5'].forEach((q) => { d.quests[q] = { state: 'done', step: 0 }; });
d.flags.verum_liberated = true; d.flags.kalion_open = true; d.quests.main_6 = { state: 'active', step: 0 };
w.Nav.resetGraph && w.Nav.resetGraph();
const t = () => { w.Nav._cache = null; w.Nav._key = ''; const c = w.Nav.current(); return c ? (c.text || c.label || JSON.stringify(c).slice(0, 160)) : 'null'; };
const before = t(); console.log('入る前：', before);
World.enterMap('kalion_city', 24, 34, 'up');
ok(d.flags.kalion_arrived, 'カリオンに入ると kalion_arrived が立つ');
const after = t(); console.log('入った後：', after); ok(after !== before, '次の目的が変わる');
d.quests.main_6 = { state: 'done', step: 0 }; d.quests.main_7 = { state: 'active', step: 0 }; d.flags.kalion_capital_open = true;
World.enterMap('sentra_capital', 24, 12, 'up'); ok(d.flags.sentra_arrived, 'セントラに入ると sentra_arrived が立つ');
// 旧セーブ：先のステップ（エルナ救出など）まで進んでいて kalion_arrived がない → 読み込み（migrate）で補う。まだカリオンの前ならつけない
const o1 = JSON.parse(JSON.stringify(d)); o1.quests.main_6 = { state: 'active', step: 0 }; delete o1.flags.kalion_arrived; o1.flags.elna_rescued = true; delete o1.quests.main_7; delete o1.flags.sentra_arrived;
ok(State.migrate(o1).flags.kalion_arrived === true, '旧セーブ：エルナ救出まで進んでいれば、読み込みで kalion_arrived を補う');
const o2 = JSON.parse(JSON.stringify(d)); o2.quests.main_6 = { state: 'active', step: 0 }; delete o2.flags.kalion_arrived; delete o2.flags.elna_rescued; delete o2.quests.main_7; delete o2.flags.sentra_arrived;
ok(!State.migrate(o2).flags.kalion_arrived, '旧セーブ：まだカリオンに入っていなければ、補わない');
console.log('結果：' + pass + ' OK / ' + fail + ' NG');
