// v9.4.1 旧バージョンのセーブ（仲間の絆を入れる前＝基準コミット 6b4d2a9 のゲーム）を作る（jsdom。基準コミットの JS で作る）
//   git worktree add --detach <dir> 6b4d2a9856a7ea7beecf654a89d40dd025b97a8d
//   RPG_DIR=<dir>/ node docs/tools/rpg94/make_old_saves.js  → docs/tools/rpg94/fixtures/old_*.json
//   ・old_ch9_mina_absent：第9章。ミナを戦闘メンバーから外したまま、記憶の図書館の封印区画で父の記録を読んだ（基準コミットの実際のイベントを実行）
//   ・old_cleared：全員加入・本編クリア済み・既存の個人クエストを達成済み
const path = require('path'); const fs = require('fs'); const load = require(path.resolve(__dirname, '../v78/load78.js'));
const DIR = process.env.RPG_DIR; if (!DIR) { console.error('RPG_DIR（基準コミットを取り出した場所）を指定してください'); process.exit(2); }
const OUT = path.resolve(__dirname, 'fixtures') + '/'; fs.mkdirSync(OUT, { recursive: true });
const A = load({ dir: DIR }); const w = A.w; const { State, World, Win, Events } = w;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  if (w.Bonds) { console.error('この JS には仲間の絆が入っている（基準コミットではない）'); process.exit(2); }
  try { w.Engine.Input.init(); } catch (e) { }
  if (w.Audio) { w.Audio.sfx = () => { }; w.Audio.playJingle = () => -1; }
  w.MochiQuest && w.MochiQuest.boot && w.MochiQuest.boot(); await sleep(100);
  Win.message = async () => { }; Win.choice = async () => 0; Win.sleep = async () => { }; Win.toast = () => { };
  const CH = w.STORY_CHAPTERS;
  function base(name) {
    State.newGame(name, 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant';
    return d;
  }
  function chapters(d, n) { CH.forEach((c) => { if (c.flag && c.id <= n) d.flags[c.flag] = true; }); for (let i = 1; i < n; i++) d.quests['main_' + i] = { state: 'done', at: 1 }; }
  // 1) 第9章：ミナを外して父の記録を読む
  let d = base('きゅうしょう'); ['lina', 'kyle', 'mina', 'seris', 'gald', 'lucia', 'elna', 'nagi', 'iris'].forEach((id) => State.joinCompanion(id));
  d.party = ['lina', 'kyle', 'seris'];   // ミナは待機
  chapters(d, 9); d.quests.lina_clinic = { state: 'done', at: 1 }; d.gold = 4321; d.inventory.herb = 7;
  ['elmina_arrived', 'library_1', 'library_2', 'library_3', 'seal_opened', 'library_guardian_defeated'].forEach((f) => { d.flags[f] = true; });
  World.start(); await sleep(50);
  const ev = w.MAP_DEFS.memory_library_seal.events.filter((e) => e.x === 6 && e.y === 2)[0];
  await Events.run(ev); World.busy = false;
  if (!d.flags.mina_father_record || !(d.quests.main_9 && d.quests.main_9.state === 'done') || (d.quests.mina_father && d.quests.mina_father.state === 'done')) { console.error('想定の状態にならなかった', d.flags.mina_father_record, d.quests.main_9, d.quests.mina_father); process.exit(1); }
  fs.writeFileSync(OUT + 'old_ch9_mina_absent.json', JSON.stringify(d));
  console.log('old_ch9_mina_absent：main_9 達成・mina_father 未達成（ミナがいないときに読んだ）・version ' + d.version + '・bonds ' + ('bonds' in d));
  // 2) クリア済み
  d = base('くりあ'); Object.keys(w.COMPANIONS).forEach((id) => State.joinCompanion(id)); d.flags.ponta_joined = true;
  chapters(d, 16); d.quests.main_16 = { state: 'done', at: 1 }; d.flags.game_cleared = true;
  ['lina_clinic', 'kyle_oath', 'mina_father', 'seris_master', 'seris_origin', 'gald_reunion', 'lucia_wave', 'elna_audit', 'nagi_chart', 'iris_map', 'io_memory', 'ord_penance', 'ganes_brother', 'dark_memorial'].forEach((q) => { d.quests[q] = { state: 'done', at: 1 }; });
  ['mina_father_record', 'core_2', 'origin_notes', 'kyle_oath_done', 'airship_owned', 'sky_arrived', 'camp_talk', 's3121_mio_letter'].forEach((f) => { d.flags[f] = true; }); d.flags.memory_choice = 1;
  d.gold = 98765; d.inventory.elixir = 3;
  fs.writeFileSync(OUT + 'old_cleared.json', JSON.stringify(d));
  console.log('old_cleared：仲間 ' + Object.keys(d.companions).length + '人・クリア済み・version ' + d.version + '・bonds ' + ('bonds' in d));
  console.log('読み込みのエラー ' + A.errors.length);
  process.exit(0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
