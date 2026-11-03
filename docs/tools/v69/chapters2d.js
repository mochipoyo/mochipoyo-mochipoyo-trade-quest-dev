// v6.9 第1〜16章の新しい出来事・財団と波形教・任意クエスト5本・母の手紙・幻・焚き火・誘惑・帰郷（A/B）を 2D 版の処理で確かめる（jsdom）
const load = require('../rpgload.js'); const { w, errors } = load(); const State = w.State, World = w.World;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
const LOG = []; const ANS = [];
w.Win.message = (lines, o) => { (Array.isArray(lines) ? lines : [lines]).forEach((l) => LOG.push(((o && o.name) ? o.name + '「' : '') + l)); return Promise.resolve(); };
w.Win.choice = (p, opts) => Promise.resolve(ANS.length ? ANS.shift() : 0);
w.Win.prompt = () => Promise.resolve('テスト'); w.Win.list = () => Promise.resolve(0); w.Win.toast = () => { }; w.Win.sleep = () => Promise.resolve();
w.Story3121.timeScale = 0.01; World.encounter = function () { };
const wait = async () => { for (let k = 0; k < 3; k++) { for (let i = 0; i < 4000 && World.busy; i++) await new Promise((r) => setTimeout(r, 3)); await new Promise((r) => setTimeout(r, 8)); } };
async function talk(id) { const n = World.map.npcs.find((x) => x.id === id && !x.hidden); if (!n) { LOG.push('[NPCなし]' + id); return false; } World.busy = false; World.talk(n); await wait(); return true; }
async function evAt(x, y) { const e = World.map.eventAt(x, y); if (!e) { LOG.push('[イベントなし]' + x + ',' + y); return false; } World.busy = false; w.Events.run(e); await wait(); return true; }
const has = (s) => LOG.some((l) => l.indexOf(s) >= 0);
function fresh(n) { State.newGame(n || 't', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; w.Story3121.giveFamilyItems(); World.start(); return d; }
(async () => {
  let d = fresh();
  // ---- 施設が歩いて行ける場所にある（建物の入口・中の人）
  const tr = w.MAP_DEFS.tradia.buildings.find((b) => b.interior === 'tradia_foundation'); const rv = w.MAP_DEFS.rivel_town.buildings.find((b) => b.interior === 'rivel_wave_temple');
  ok(tr && rv, '建物：トレディアに「トレード財団 本部」・リヴェル城下町に「波形聖堂」');
  World.enterMap('rivel_town', 54, 9, 'up'); const wp = World.map.warps.find((x) => x.to === 'rivel_wave_temple'); ok(wp && World.map.passable(wp.x, wp.y + 1, d), '波形聖堂の入口の前に立てる（' + (wp && wp.x + ',' + wp.y) + '）');
  World.enterMap('tradia', 40, 38, 'up'); const wf = World.map.warps.find((x) => x.to === 'tradia_foundation'); ok(wf && World.map.passable(40, 38, d) && World.map.warps.some((x) => x.to === 'tradia_inn'), '財団本部の入口・宿屋の入口もふさがない');
  // ---- 波形聖堂：断片その一・試練（学習用のチャート）
  World.enterMap('rivel_wave_temple', 7, 9, 'up'); LOG.length = 0; ANS.push(1); await talk('wt_abbess');
  ok(d.quests.s3121_origin_fragments && d.quests.s3121_wave_temple && has('伝承です。確かめられたことではありません'), '聖堂長：伝承は「とされる」で語る・任意クエスト2本');
  await evAt(1, 8); ok(d.flags.s3121_frag_1 && State.hasItem('s3121_chronicle'), '聖堂の書棚：創設伝承の断片その一・千年の記録帳');
  w.TradeUI.trial = () => Promise.resolve({ score: 40 }); ANS.push(0); await talk('wt_abbess'); ok(!State.hasItem('s3121_canon') && d.quests.s3121_wave_temple.state === 'active', '試練：60点未満では授からない');
  w.TradeUI.trial = () => Promise.resolve({ score: 82 }); ANS.push(0); await talk('wt_abbess'); ok(State.hasItem('s3121_canon') && d.quests.s3121_wave_temple.state === 'done' && d.flags.s3121_wave_order_lore, '試練：合格で原典（写し）・クエスト達成');
  await talk('wt_radical'); ok(has('それは私たちの教えではない'), '急進派の若い修行僧（教団全体を敵にしない）');
  // ---- 第1章：ポヨ村の相場盤・旧時代の品
  World.enterMap('poyo_village', 17, 19, 'up'); await talk('s3121_poyo_board'); ok(d.flags.s3121_c1_board, '第1章：ポヨ村の相場盤');
  World.enterMap('poyo_house', 8, 4, 'up'); await evAt(8, 3); ok(d.flags.s3121_c1_relic, '第1章：旧時代の壊れた板（鍋敷き）');
  // ---- 第2章：森の祠の碑文（お守りと紋章）
  d.flags.forest_boss = true; World.enterMap('lost_forest_shrine', 7, 10, 'up'); LOG.length = 0; await evAt(7, 9);
  ok(d.flags.s3121_c2_stele && d.flags.s3121_c2_crest && has('引くことは、逃げることではない'), '第2章：波形教の碑文・お守りと勇者の紋章');
  // ---- 第3章
  d.flags.cave_boss = true; d.flags.s3121_tax_done = true; World.enterMap('oblivion_cave_3', 10, 10, 'down'); LOG.length = 0; await evAt(10, 11); ok(d.flags.s3121_c3_crest && has('徴税官の腕章と、同じだ'), '第3章：欠片の紋章と徴税官の腕章');
  // ---- 第4章
  State.joinCompanion('gald'); d.party = ['hero', 'gald']; World.enterMap('harbor_town', 26, 19, 'up'); LOG.length = 0; await talk('s3121_harbor_board'); ok(d.flags.s3121_c4_board && has('運び屋の目'), '第4章：港の相場読み（物流を支えるトレーダー）');
  // ---- 第5章
  World.enterMap('verum_hideout', 9, 5, 'up'); await evAt(9, 4); ok(d.flags.s3121_c5_plaque, '第5章：財団の昔の復興支援の銘板');
  d.flags.verum_liberated = true; World.enterMap('verum_town', 24, 17, 'up'); LOG.length = 0; await talk('s3121_verum_girl');
  ok(d.flags.s3121_c5_girl && has('明日はお家に帰ってくるんだよね') && has('誰かの家族は帰ってこられる'), '第5章：解放のあとの少女（復讐から救済へ）');
  // ---- 第6章：抹消記録 → アサナ村跡
  World.enterMap('kalion_archive_2', 13, 4, 'up'); LOG.length = 0; await evAt(13, 3);
  ok(d.flags.s3121_asana_located && d.flags.s3121_c6_erasure && has('アサナ村　均衡暦97年　魔物被害により全滅'), '第6章：アサナ村の抹消記録（場所が分かる）');
  const wk = new w.GameMap(w.MAP_DEFS.world_kalion); const loc = wk.warps.find((x) => x.to === 'asana_ruins'); ok(loc && loc.x === 24 && loc.y === 66 && loc.needFlag === 's3121_asana_located' && !w.Tiles.isSolid(wk.tile(24, 67)), 'カリオン地方の地図に「アサナ村跡」（(24,66)、出口の先 (24,67) は歩ける）');
  World.enterMap('kalion_city', 27, 20, 'up'); await talk('s3121_kc_foundation'); ok(d.flags.s3121_c6_foundation, '第6章：財団のカリオン出張所の監査員');
  World.enterMap('asana_ruins', 13, 19, 'up'); LOG.length = 0; await evAt(20, 16); ok(d.flags.s3121_grave_visited && has('ラウル。ミオ。'), 'アサナ村跡：両親の墓');
  // ---- 第7章：地図から消えた村の生存者・リーヴの返還のあと母の手紙
  World.enterMap('erased_village', 12, 9, 'up'); LOG.length = 0; await talk('s3121_ev_survivor'); ok(d.flags.s3121_survivor_met && has('一人ひとりの暮らし'), '第7章：アサナ村の生存者（母が子どもたちを逃がした）');
  d.flags.sevran_fallen = true; State.addItem('restitution_order', 1); World.enterMap('kalion_finance', 8, 9, 'up'); LOG.length = 0; await talk('kf_riev');
  ok(d.flags.kalion_reformed && d.flags.s3121_mio_letter && State.hasItem('s3121_letter') && has('それから、たまには自分のためにも使うのよ。'), '第7章：リーヴの財産返還 → 帳簿の最後のページ → 母の手紙');
  // ---- 第8〜9章
  World.enterMap('aruna_underground_2', 10, 5, 'up'); await evAt(10, 4); ok(d.flags.s3121_rec_strata && d.quests.s3121_earth_record, '第8章：3024年の層の下の古い街（消えた地球の記録が始まる）');
  d.flags.library_1 = true; d.flags.mina_father_record = true; State.joinCompanion('mina'); d.party = ['hero', 'mina']; World.enterMap('memory_library', 8, 8, 'up'); LOG.length = 0; await evAt(8, 7);
  ok(d.flags.s3121_old_earth_discovered && d.flags.s3121_rec_2052 && has('西暦2052年') && d.flags.s3121_mina_support, '第9章：2052年の最後の記録・ミナを支える');
  // ---- 第10章：選ばれなかった未来
  World.enterMap('temple_of_time_3', 7, 11, 'up'); LOG.length = 0; await evAt(7, 10);
  ok(d.flags.s3121_vision_seen && has('それは、あり得たかもしれない未来。') && has('白い衣の女性'), '第10章：両親が生きている村の幻（ソフィア加入前は「白い衣の女性」）');
  World.enterMap('tempus_city', 20, 14, 'up'); await talk('s3121_tc_wave'); ok(d.flags.s3121_c10_prophecy, '第10章：鐘都の波形教の老司祭（千年前の教団伝承）');
  // ---- 第11〜12章
  World.enterMap('old_city_2', 8, 9, 'up'); await evAt(8, 8); ok(d.flags.s3121_rec_shelter, '第11章：地下居住区の末裔の記録');
  World.enterMap('node_city', 19, 15, 'up'); await talk('s3121_nc_robot'); ok(d.flags.s3121_c11_robot, '第11章：契約で働く配達ロボット');
  World.enterMap('oracle_core_2', 8, 9, 'up'); LOG.length = 0; await evAt(8, 8); ok(d.flags.s3121_rec_oracle && has('2052年の戦争の記憶はない'), '第12章：旧文明のAIとオラクルは別');
  World.enterMap('memory_library', 8, 8, 'up'); await evAt(8, 7); ok(d.quests.s3121_earth_record.state === 'done', '任意：消えた地球の記録（4つの記録を照らし合わせて達成）');
  // ---- 第13章・財団本部
  d.flags.archive_permit = true; World.enterMap('forbidden_archive_1', 10, 6, 'up'); await evAt(10, 5); ok(d.flags.s3121_frag_3, '第13章：禁書庫の年代記（断片その三）');
  World.enterMap('tradia_foundation', 7, 9, 'up'); State.joinCompanion('mochipoyo'); d.party = ['hero', 'mochipoyo']; LOG.length = 0; await evAt(7, 2);
  ok(has('伝えられる') && has('昔、似たようなことを教えた気もする。でも、あの時代だったかな。') && !has('同一人物'), '財団本部の展示：創設伝承は「伝えられる」・もちぽよは曖昧な一言だけ');
  await talk('fd_librarian'); ok(d.flags.s3121_frag_2, '財団文庫：断片その二');
  ANS.push(0); await talk('fd_director'); ok(d.quests.s3121_foundation_audit && d.quests.s3121_foundation_audit.state === 'active', '本部長ベルナ：財団の古い帳簿（任意）');
  await evAt(1, 8); ok(d.flags.s3121_audit_1, '監査：財団の帳簿');
  World.enterMap('verum_hideout', 9, 5, 'up'); await evAt(9, 4); World.enterMap('kalion_archive_2', 13, 4, 'up'); await evAt(13, 3);
  ok(d.flags.s3121_audit_2 && d.flags.s3121_audit_3, '監査：ヴェルム・カリオンの記録');
  World.enterMap('tradia_foundation', 7, 9, 'up'); ANS.push(0); await talk('fd_director'); ok(d.quests.s3121_foundation_audit.state === 'done' && d.flags.s3121_audit_choice === 0, '任意：財団の古い帳簿（公表を選ぶ）');
  World.enterMap('rivel_wave_temple', 7, 9, 'up'); await talk('wt_abbess'); ok(d.quests.s3121_origin_fragments.state === 'done', '任意：千年の断片（3つの写本）');
  World.enterMap('magicka_academy', 6, 6, 'up'); await talk('s3121_ma_worlds'); ok(d.quests.s3121_many_worlds, '任意：異なる空の来訪者（受注）');
  World.enterMap('magicka_city', 24, 17, 'up'); await talk('s3121_mc_visitor'); World.enterMap('star_camp', 13, 7, 'up'); await talk('s3121_sc_visitor');
  World.enterMap('magicka_academy', 6, 6, 'up'); ANS.push(1); await talk('s3121_ma_worlds'); ok(d.quests.s3121_many_worlds.state === 'done' && d.flags.s3121_mw_choice === 1, '任意：異なる空の来訪者（達成）');
  // ---- 第14章：焚き火（加入済みだけ）・古い地球の地図
  ['lina', 'ganes', 'kazuto'].forEach((id) => State.joinCompanion(id)); d.flags.ponta_joined = true; d.party = ['hero', 'lina', 'mochipoyo', 'kazuto'];
  World.enterMap('star_camp', 9, 7, 'up'); LOG.length = 0; await evAt(9, 6);
  ok(has('カズト「仲間を守るための魔力が欲しかった') && has('ガネス「弟の名前を') && has('もちぽよ「2035年から') && has('神聖犬ポン太が、焚き火のそばで') && !has('アステル「') && has('どれほど強くなっても、誰かに助けを求めてよいのじゃよ。') && has('最初から一人じゃなかったよ。'), '第14章：焚き火（加入済みの仲間だけ・ハケイの手紙）');
  World.enterMap('star_tower_2', 5, 7, 'up'); await evAt(5, 6); ok(d.flags.s3121_old_earth_map, '第14章：古い地球の地図');
  // ---- 第15章
  World.enterMap('dark_camp', 14, 11, 'up'); await evAt(14, 10); ok(d.flags.s3121_c15_stele, '第15章：繰り返しの碑（2052 3024 3121）');
  // ---- 記録帳
  LOG.length = 0; ANS.push(0); await w.ITEMS.s3121_chronicle.read(); ok(has('均衡暦0年／西暦3024年') && has('西暦2052年：') && has('西暦2121年：'), '千年の記録帳：年表（見つけた記録だけ・均衡暦と西暦）');
  const keep = JSON.parse(JSON.stringify(d));
  // ---- 第16章：誘惑 → エンディングA（帰郷 → おかえり）
  w.BattleUI.start = () => Promise.resolve('won'); if (w.BossSymbol) { w.BossSymbol.intro = () => Promise.resolve(); w.BossSymbol.introIfShown = () => Promise.resolve(); }
  const runEnding = async (choice) => { World.enterMap('demon_castle_5', 8, 4, 'up'); LOG.length = 0; ANS.push(choice); await evAt(8, 3); };
  await runEnding(0);
  ok(d.flags.s3121_temptation && has('ご飯できてるわよ。') && has('でも……誰かの未来を奪ってまで、自分の願いを叶えたくない。') && has('失敗するかもしれない未来を選ぶ。'), '第16章：魔王の誘惑（家族が生きている未来を拒む）');
  ok(d.flags.ending === 'A' && d.flags.game_cleared && d.flags.s3121_epilogue_done && d.flags.s3121_asana_rebuilt && has('それより大切なものを、いっぱい見つけたんだ。') && has('……おかえり。') && World.map.id === 'poyo_elder_house', 'エンディングA：アサナ村の帰郷 → 両親の墓 → ポヨ村の「おかえり」');
  ok(LOG.indexOf('【エンディングA：解放の夜明け】') >= 0 && State.hasItem('final_proof') && State.hasItem('s3121_ledger') && State.hasItem('s3121_letter'), '既存のエンディングA・最後の選択の証は残る・帳簿と手紙は消えない');
  const veil = w.document.getElementById('s3121-veil'); ok(!veil || veil.style.opacity === '0', '帰郷のあと幕が上がっている（' + (veil && veil.style.opacity) + '）');
  World.enterMap('world_kalion', 24, 67, 'up'); const toR = World.map.warps.find((x) => x.to === 'asana_ruins'); World.busy = false; World.doWarp(toR); await new Promise((r) => setTimeout(r, 450)); await wait();
  ok(World.map.id === 'asana_rebuilt', 'エンディングのあとは「アサナ村跡」へ入ると復興した村');
  // ---- エンディングB
  State.data = JSON.parse(JSON.stringify(keep)); d = State.data; d.flags.kalion_choice = 1; World.start(); await runEnding(1);
  ok(d.flags.ending === 'B' && d.flags.s3121_epilogue_done && has('七つの鍵の監査の印') && has('……おかえり。'), 'エンディングB：帰郷 → おかえり');
  // ---- クリア済みの旧セーブ：あとから帰郷の場面を見る（報酬・クリアの記録は変えない）
  State.newGame('旧', 'mage'); d = State.data; d.flags.game_cleared = true; d.flags.ending = 'A'; d.quests.main_16 = { state: 'done' }; d.gold = 777; World.start();
  World.enterMap('poyo_elder_house', 6, 2, 'up'); ANS.push(0); await evAt(6, 1); ok(d.flags.s3121_recalled && State.hasItem('s3121_ledger'), 'クリア済みの旧セーブ：ベッドで回想');
  d.flags.s3121_asana_located = true; World.enterMap('asana_ruins', 13, 19, 'up'); LOG.length = 0; ANS.push(0); await evAt(20, 16);
  ok(d.flags.s3121_epilogue_done && has('……おかえり。') && d.gold === 777 && d.quests.main_16.state === 'done', 'クリア済みの旧セーブ：墓から帰郷の場面（お金・クリアの記録は変わらない）');
  ok(errors.length === 0, 'ページのエラーなし ' + JSON.stringify(errors.slice(0, 3)));
  console.log('結果：' + pass + ' OK / ' + fail + ' NG'); if (fail) console.log(LOG.slice(-30).join('\n'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
