// v6.9 旧セーブの互換：変更前のコード（基準コミット 62900a3 の作業コピー）で作ったセーブを、変更後のコードで読み込む
//   1) RPG_DIR=/home/claude/base3121/ node oldsave3121.js make  … 序盤・中盤（第7章のあと）・終盤（第14章）・クリア後の4つのセーブを作る
//   2) RPG_DIR=<基準> node oldsave3121.js snap base.json ／ node oldsave3121.js snap new.json → node cmpsnap.js base.json new.json
//      … 読み込み → World.start のあとの状態が、基準のコードと変更後のコードで同じか（時刻の値を除く全項目）
//   （check は参考：既存の仕様（壁の中の位置の補正・クリア後のアストラ号のクエスト）でも NG になるため、判定には使わない）
const fs = require('fs'); const OUT = '/home/claude/work/s3121/oldsaves.json'; const mode = process.argv[2];
const load = require('../rpgload.js'); const { w, errors } = load(); const State = w.State, World = w.World;
if (mode === 'make') {
  const saves = {};
  const mk = (name, fn) => { State.newGame(name, 'mage'); const d = State.data; fn(d); saves[name] = JSON.parse(JSON.stringify(d)); };
  mk('early', (d) => { d.flags.met_elder = true; d.quests.main_1 = { state: 'active', at: 1 }; d.gold = 100; d.inventory.herb = 3; State.joinCompanion('lina'); d.party = ['hero', 'lina']; d.pos = { map: 'rivel_town', x: 31, y: 40, dir: 'up' }; });
  mk('mid', (d) => { d.hero.level = 24; ['met_elder', 'king_quest1', 'forest_boss', 'cave_boss', 'ship_ready', 'verum_liberated', 'kalion_arrived', 'ledger_3', 'sevran_fallen', 'kalion_reformed'].forEach((k) => d.flags[k] = true); for (let i = 1; i <= 7; i++) d.quests['main_' + i] = { state: 'done', at: 1 }; d.quests.main_8 = { state: 'active', at: 1 }; ['lina', 'kyle', 'gald', 'elna'].forEach((id) => State.joinCompanion(id)); d.party = ['hero', 'lina', 'kyle', 'elna']; d.gold = 12345; d.inventory.hi_potion = 7; d.hero.job = 'priest'; d.pos = { map: 'kalion_city', x: 24, y: 30, dir: 'down' }; d.trade.trials = 31; });
  mk('late', (d) => { d.hero.level = 34; for (let i = 1; i <= 13; i++) d.quests['main_' + i] = { state: 'done', at: 1 }; d.quests.main_14 = { state: 'active', at: 1 }; ['met_elder', 'sevran_fallen', 'kalion_reformed', 'sky_arrived', 'sky_1', 'sky_2', 'sky_3'].forEach((k) => d.flags[k] = true); ['lina', 'kyle', 'mina', 'seris'].forEach((id) => State.joinCompanion(id)); d.party = ['hero', 'lina', 'mina', 'seris']; d.gold = 54321; d.pos = { map: 'star_camp', x: 9, y: 12, dir: 'up' }; d.aboard = null; });
  mk('cleared', (d) => { d.hero.level = 45; for (let i = 1; i <= 16; i++) d.quests['main_' + i] = { state: 'done', at: 1 }; ['met_elder', 'sevran_fallen', 'kalion_reformed', 'game_cleared', 'crystal_choice_done', 'camp_talk'].forEach((k) => d.flags[k] = true); d.flags.ending = 'B'; d.clearedAt = 123; ['lina', 'kyle'].forEach((id) => State.joinCompanion(id)); d.party = ['hero', 'lina', 'kyle']; d.gold = 99999; d.inventory.final_proof = 1; d.pos = { map: 'poyo_village', x: 21, y: 30, dir: 'down' }; });
  fs.writeFileSync(OUT, JSON.stringify(saves)); console.log('作成：' + Object.keys(saves).join(', ') + ' errors ' + JSON.stringify(errors)); process.exit(errors.length ? 1 : 0);
}
if (mode === 'snap') {   // 読み込み → World.start のあとの状態（基準のコードと変更後のコードで同じになるかを比べる）
  w.Win.message = () => Promise.resolve(); w.Win.choice = () => Promise.resolve(0); w.Win.toast = () => { };
  const saves = JSON.parse(fs.readFileSync(OUT, 'utf8')); const res = {};
  for (const [name, raw] of Object.entries(saves)) { const d = State.importJSON(JSON.stringify(raw)); State.data = d; World.encounter = function () { }; World.start(); const dd = JSON.parse(JSON.stringify(State.data)); delete dd.savedAt; delete dd.playTime; delete dd.createdAt; Object.keys(dd.quests || {}).forEach((k) => { if (dd.quests[k]) delete dd.quests[k].at; }); res[name] = { map: World.map.id, x: World.player.x, y: World.player.y, data: dd }; }
  fs.writeFileSync(process.argv[3], JSON.stringify(res)); console.log('snap ' + process.argv[3] + ' errors ' + JSON.stringify(errors)); process.exit(0);
}
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
w.Win.message = () => Promise.resolve(); w.Win.choice = () => Promise.resolve(0); w.Win.toast = () => { };
const saves = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const keyOf = (d) => JSON.stringify({ pos: d.pos, lastInn: d.lastInn, party: d.party, gold: d.gold, inv: d.inventory, quests: d.quests, hero: { lv: d.hero.level, job: d.hero.job, eq: d.hero.equip }, comps: Object.keys(d.companions).sort(), trade: d.trade && d.trade.trials, cleared: d.flags.game_cleared, ending: d.flags.ending, visited: d.visited });
for (const [name, raw] of Object.entries(saves)) {
  const before = keyOf(raw); const flagsBefore = Object.keys(raw.flags).sort().join(',');
  const d = State.importJSON(JSON.stringify(raw)); State.data = d; World.encounter = function () { }; World.start();
  const s31 = Object.keys(d.flags).filter((k) => /^s3121_/.test(k));
  ok(World.map.id === raw.pos.map && World.player.x === raw.pos.x && World.player.y === raw.pos.y, name + '：読み込んだ場所が変わらない（' + World.map.id + ' ' + World.player.x + ',' + World.player.y + '）');
  ok(keyOf(d) === before.replace(/"visited":\{([^}]*)\}/, (m) => m) || keyOf(Object.assign({}, d, { visited: raw.visited })) === before, name + '：章・仲間・職業・持ち物・お金・トレードの記録・クリアの記録が変わらない');
  ok(s31.length === 0 && !w.Story3121.inPrologue() && Object.keys(d.flags).filter((k) => !/^s3121_/.test(k)).sort().join(',') === flagsBefore, name + '：s3121_ のフラグは足されない・プロローグは始まらない');
  ok(!d.quests.s3121_prologue && d.navTrack !== 's3121_prologue', name + '：プロローグのクエストは受注されない');
}
ok(errors.length === 0, 'ページのエラーなし ' + JSON.stringify(errors.slice(0, 3)));
console.log('結果：' + pass + ' OK / ' + fail + ' NG'); process.exit(fail ? 1 : 0);
