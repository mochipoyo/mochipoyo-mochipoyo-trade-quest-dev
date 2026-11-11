// v9.5 参照コミット 483fd5f（絵を入れる前）のゲームで、ふつうに遊んでいる途中のセーブを作る（jsdom。参照コミットの JS で作る）
//   git worktree add --detach <dir> 483fd5f5553c60f770b8f9efb4413258daba7285
//   RPG_DIR=<dir>/ node docs/tools/icons/make_save483.js  → docs/tools/icons/fixtures/save_483fd5f.json
//   ・仲間 2 人・持ち物（道具・武器・装飾品・大事なもの）・装備あり。icons_test.js の「旧セーブ」で読み込み、売買・使用・装備の前後を比べる
const path = require('path'); const fs = require('fs'); const load = require(path.resolve(__dirname, '../v78/load78.js'));
const DIR = process.env.RPG_DIR; if (!DIR) { console.error('RPG_DIR（参照コミットを取り出した場所）を指定してください'); process.exit(2); }
const OUT = path.resolve(__dirname, 'fixtures') + '/'; fs.mkdirSync(OUT, { recursive: true });
const A = load({ dir: DIR }); const w = A.w; const { State, World, Win } = w;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  if (w.ItemIcons) { console.error('この JS には絵の仕組みが入っている（参照コミットではない）'); process.exit(2); }
  try { w.Engine.Input.init(); } catch (e) { }
  if (w.Audio) { w.Audio.sfx = () => { }; w.Audio.playJingle = () => -1; }
  w.MochiQuest && w.MochiQuest.boot && w.MochiQuest.boot(); await sleep(100);
  Win.message = async () => { }; Win.choice = async () => 0; Win.sleep = async () => { }; Win.toast = () => { };
  State.newGame('さんかく', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant';
  ['lina', 'kyle'].forEach((id) => State.joinCompanion(id));
  [['potion', 3], ['bread_baguette', 2], ['ether', 1], ['steel_sword', 1], ['copper_sword', 1], ['ring_power', 1], ['leather_cap', 1], ['forest_key', 1]].forEach((x) => State.addItem(x[0], x[1]));
  const hero = State.partyActors()[0]; w.Services.equipItem(hero, 'copper_sword'); w.Services.equipItem(hero, 'ring_power'); w.Services.equipItem(hero, 'leather_cap');
  d.gold = 800; World.start(); await sleep(50); World.busy = false;
  fs.writeFileSync(OUT + 'save_483fd5f.json', JSON.stringify(d));
  console.log('save_483fd5f：持ち物 ' + Object.keys(d.inventory).length + ' 種・装備 ' + JSON.stringify(hero.equip) + '・version ' + d.version + '・読み込みのエラー ' + A.errors.length);
  process.exit(0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
