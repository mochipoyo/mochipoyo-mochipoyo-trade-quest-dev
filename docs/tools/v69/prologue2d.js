// v6.9 新しいプロローグ（アサナ村 → ポヨ村 → リヴェル王）を 2D 版のゲームの処理で通す（jsdom）
//   会話は自動で進める（選択肢は先頭、または ANS に入れた順）。歩く代わりに、主人公をそのマスへ置いて World.onStep() を呼ぶ
const load = require('../rpgload.js'); const { w, errors } = load(); const State = w.State, World = w.World;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
const LOG = []; const ANS = [];
w.Win.message = (lines, o) => { (Array.isArray(lines) ? lines : [lines]).forEach((l) => LOG.push(((o && o.name) ? o.name + '「' : '') + l)); return Promise.resolve(); };
w.Win.choice = (p, opts) => { LOG.push('[選択]' + p + ' → ' + (opts[ANS.length ? ANS[0] : 0])); return Promise.resolve(ANS.length ? ANS.shift() : 0); };
w.Win.prompt = () => Promise.resolve('テスト'); w.Win.list = () => Promise.resolve(0); w.Win.toast = (t) => LOG.push('[通知]' + t);
w.Win.sleep = () => Promise.resolve();
const wait = async () => { for (let k = 0; k < 3; k++) { for (let i = 0; i < 4000 && World.busy; i++) await new Promise((r) => setTimeout(r, 3)); await new Promise((r) => setTimeout(r, 8)); } };
async function talk(id) { const n = World.map.npcs.find((x) => x.id === id && !x.hidden); if (!n) { LOG.push('[NPCなし]' + id); return false; } World.busy = false; World.talk(n); await wait(); return true; }
async function evAt(x, y) { const e = World.map.eventAt(x, y); if (!e) return false; World.busy = false; w.Events.run(e); await wait(); return true; }
async function stepTo(x, y) { const p = World.player; p.x = x; p.y = y; p.px = x * 32; p.py = y * 32; p.moving = false; World.busy = false; State.data.stepsSinceBattle = 0; World.onStep(); await wait(); }
async function warpVia(x, y) { const wp = World.map.warpAt(x, y); if (!wp) return false; World.busy = false; World.enterMap(wp.to, wp.tx, wp.ty, 'down'); await wait(); return true; }
const has = (re) => LOG.some((l) => re.test(l));
(async () => {
  const S = w.Story3121; S.timeScale = 0.01; const F = () => State.data.flags; const ph = () => S.phase();
  World.encounter = function () { };   // 歩数のランダムな戦闘を止める（このテストだけ）
  // ---- 新しいゲーム（アサナ村から）
  ANS.push(0, 0);   // 「始める」→「アサナ村から始める」
  const okNew = await w.Title.newGame(); await wait();
  const d = State.data;
  ok(okNew === true && World.map.id === 'asana_home' && d.flags.s3121_new_prologue && ph() === 'morning', '新規ゲーム：アサナ村の家から始まる（phase=' + ph() + ' map=' + World.map.id + '）');
  ok(has(/2052年/) && has(/西暦3121年/) && has(/失われた天秤/), '導入：2052年の記録の断片 → 失われた天秤（従来の序章）→ 西暦3121年');
  ok(d.quests.s3121_prologue && d.quests.s3121_prologue.state === 'active' && d.navTrack === 's3121_prologue' && !d.quests.main_1, 'プロローグのクエストを案内中・main_1 はまだ');
  ok(d.gold === 0 && !d.flags.met_elder, '村長の100Gはまだ受け取っていない');
  const nav = w.Nav.compute(true); ok(nav && nav.q === 's3121_prologue' && nav.target && nav.target.map === 'asana_village', '次の目的地の案内：市場（' + (nav && nav.target ? nav.target.map + ' ' + nav.target.x + ',' + nav.target.y : '-') + '）');
  // 第1幕
  await talk('as_mio'); ok(!d.flags.s3121_ledger_seen, '買い物の前の母');
  await warpVia(5, 8); ok(World.map.id === 'asana_village', '家の外へ');
  await talk('as_child'); await talk('as_oldman'); await talk('as_peddler');
  ok(has(/トレード財団の巡回/) || has(/相場ごっこ/), '村の子ども：遊びとしての相場（財団の巡回の先生）');
  ok(has(/旧時代/), '物知りのおじいさん：旧時代の金属（遠未来の地球を感じる小物）');
  await talk('as_merchant'); ok(d.flags.s3121_bought, '市場で買い物');
  World.enterMap('asana_home', 5, 7, 'up'); await talk('as_mio');
  ok(d.flags.s3121_ledger_seen && ph() === 'lesson' && has(/誰の笑顔を守れるか/), '母の帳簿の話（お金で誰の笑顔を守れるか）');
  World.enterMap('asana_village', 6, 10, 'down'); await talk('as_raul');
  ok(d.flags.s3121_lesson_done && ph() === 'festival' && Math.abs(d.timeOfDay - 0.73) < 0.01 && has(/守るためのものだ/), '父ラウルの木剣の稽古 → 夕方の祭り');
  World.applyState(World.map); ok(!World.map.npcs.find((n) => n.id === 'as_chief').hidden && !World.map.npcs.find((n) => n.id === 'as_pilgrim').hidden, '祭り：村長・波形教の巡礼者が広場にいる');
  await talk('as_pilgrim'); ok(has(/見送る勇気/) && has(/元は同じ学びの場から分かれた/), '波形教の巡礼者の言葉（財団と同じ根から分かれたと伝わる）');
  await talk('as_chief'); ok(d.flags.s3121_festival_done && ph() === 'night1' && has(/十分に幸せだった/), '祭りの場面');
  World.enterMap('asana_home', 2, 2, 'up'); await evAt(1, 1);
  ok(d.flags.s3121_slept1 && ph() === 'tax', '眠る → 翌朝');
  // 第2幕：徴税官（家を出て通りへ出ると始まる）
  World.enterMap('asana_village', 6, 10, 'down'); await stepTo(6, 11);
  ok(d.flags.s3121_tax_done && ph() === 'after_tax' && has(/魔災復興税を引き上げる/) && has(/顔色を変えた/), '徴税官の場面（魔災復興税・帳簿・顔色を変える）');
  World.applyState(World.map); ok(World.map.npcs.find((n) => n.id === 'as_collector').hidden, '徴税官と兵士は村を出ていく');
  // 途中セーブ → 読み込み（プロローグの途中から続けられる）
  State.save(2); const loaded = State.load(2); ok(loaded && loaded.flags.s3121_prologue_phase === 'after_tax' && loaded.pos.map === 'asana_village', 'プロローグの途中でセーブ・読み込み（' + (loaded && loaded.pos.map) + '）');
  // 第3幕：炎の夜
  World.enterMap('asana_home', 2, 2, 'up'); await evAt(1, 1);
  ok(World.map.id === 'asana_raid' && ph() === 'raid' && d.timeOfDay < 0.05 && World.tint() && /120,30,10/.test(World.tint()), '夜の襲撃：燃える村（2D の赤い夜の色）');
  ok((w.MAP_DEFS.asana_raid.fx3d || []).filter((f) => f.kind === 'fire').length >= 8, '3D の炎・煙の置き場所（マップ定義 fx3d）');
  await stepTo(13, 20); ok(!d.flags.s3121_escaped && World.map.id === 'asana_raid', '父のもとへ行く前は、南の門から出られない');
  await stepTo(18, 15);
  ok(d.flags.s3121_raid_father && ph() === 'escape' && has(/逃げろ！ お前には、まだ未来がある！/) && has(/お願い。生きて/) && has(/ずっと昔から家族が大切にしてきたもの/), '父の「逃げろ」・母の「お願い。生きて」');
  ok(State.hasItem('s3121_ledger') && State.hasItem('s3121_amulet') && w.ITEMS.s3121_ledger.price === 0, '母の帳簿・家族のお守り（重要アイテム・売れない）');
  ok(d.party.length === 1 && !d.flags.met_elder, 'ゲームオーバーにならない（戦闘なし）');
  await stepTo(13, 20);
  ok(d.flags.s3121_escaped && d.flags.s3121_woke && ph() === 'poyo_night' && World.map.id === 'poyo_village' && d.timeOfDay < 0.05, '脱出 → ポヨ村で目を覚ます → 夜のポヨ村');
  ok(has(/アサナ村……？ すまんが、聞いたことのない名じゃ/), '村長はアサナ村を知らない（地図から消されている伏線）');
  // 第4幕：ハケイ
  await stepTo(5, 21);
  ok(d.flags.s3121_hakei_night && has(/負けないことより、負けたあとにどうするかが大切なんじゃよ/) && ph() === 'poyo_day' && World.map.id === 'poyo_elder_house', '夜のハケイ → 翌朝の村長の家');
  ok(d.quests.s3121_prologue.state === 'done' && !d.navTrack, 'プロローグのクエスト達成・案内はメインへ');
  // 既存の村長の報酬（一度だけ）
  LOG.length = 0; await talk('elder_mochizo');
  ok(d.flags.met_elder && d.quests.main_1 && d.quests.main_1.state === 'active' && d.gold === 100 && d.inventory.herb === 3 && d.hero.equip.weapon === 'wooden_sword', '村長：100G・薬草3・職業の武器・met_elder・main_1（' + d.gold + 'G 薬草' + d.inventory.herb + '）');
  ok(has(/顔色が戻ったな/) && !has(/おお……目を覚ましたか/), '村長の最初の一言だけ、新しいプロローグに合わせる');
  await talk('elder_mochizo'); ok(d.gold === 100 && d.inventory.herb === 3, 'もう一度話しても報酬は増えない');
  // リーナ
  World.enterMap('poyo_church', 5, 7, 'up'); LOG.length = 0; await talk('lina');
  ok(d.companions.lina && d.flags.s3121_lina_question && has(/復讐が終わったら、どうするの？/), 'リーナ：「復讐が終わったら、どうするの？」→ 加入');
  World.enterMap('poyo_church', 5, 7, 'up'); ok(!World.map.npcs.find((n) => n.id === 'lina' && !n.hidden), 'リーナは教会から消える（加入は一度だけ）');
  // 門：ハケイの見送り
  World.enterMap('poyo_village', 21, 30, 'down'); LOG.length = 0; await stepTo(21, 35);
  ok(d.flags.s3121_hakei_farewell && ph() === 'done' && has(/自分で考えて選ぶんじゃ/) && has(/第一章　目覚めた旅人/), '門でハケイの見送り → 第一章');
  // リヴェル王
  World.enterMap('rivel_castle', 15, 20, 'up'); const king = World.map.npcs.find((n) => n.id === 'king');
  if (king) { World.player.x = king.x; World.player.y = king.y + 1; } await talk('king');
  ok(d.flags.king_quest1 && d.quests.main_1.state === 'done', 'リヴェル王に会う（main_1 達成）');
  // ベッドで回想（読み返し）
  World.enterMap('poyo_elder_house', 6, 2, 'up'); LOG.length = 0; ANS.push(0, 2); await evAt(6, 1); ok(has(/回想：炎の夜/), '村長の家のベッドで回想を読み返せる');
  // 母の帳簿を読む（第7章の前は最後のページが開かない）
  LOG.length = 0; ANS.push(0); await w.ITEMS.s3121_ledger.read(); ok(has(/貼り合わさっている/) && !State.hasItem('s3121_letter'), '母の帳簿：第7章の前は手紙は出てこない');
  const keep = JSON.parse(JSON.stringify(State.data));

  // ---- 旧セーブ（従来どおり始めたデータ）：プロローグを強制しない・ベッドから任意の回想
  State.newGame('旧', 'mage'); let o = State.data; World.start(); await wait();
  ok(World.map.id === 'poyo_village' && !S.inPrologue() && !o.flags.s3121_new_prologue, '旧セーブ：ポヨ村のまま（プロローグなし）');
  World.enterMap('poyo_elder_house', 5, 5, 'up'); LOG.length = 0; await talk('elder_mochizo');
  ok(has(/おお……目を覚ましたか/) && o.gold === 100 && o.flags.met_elder, '旧セーブ：村長の会話と報酬は従来どおり');
  World.enterMap('poyo_church', 5, 7, 'up'); LOG.length = 0; await talk('lina'); ok(o.companions.lina && !has(/復讐が終わったら/), '旧セーブ：リーナの会話は従来どおり');
  World.enterMap('poyo_elder_house', 6, 2, 'up'); LOG.length = 0; ANS.push(0); await evAt(6, 1);
  ok(o.flags.s3121_recalled && State.hasItem('s3121_ledger') && State.hasItem('s3121_amulet') && has(/回想：最後の平穏/), '旧セーブ：ベッドから任意の回想（帳簿とお守りを受け取る）');
  ANS.push(0); await evAt(6, 1); ok(o.inventory.s3121_ledger === 1, '回想をくり返しても帳簿は1冊のまま');
  // 第7章を終えた旧セーブ：帳簿の最後のページから母の手紙
  o.flags.sevran_fallen = true; o.flags.kalion_reformed = true; LOG.length = 0; ANS.push(0); await w.ITEMS.s3121_ledger.read();
  ok(State.hasItem('s3121_letter') && o.flags.s3121_mio_letter && has(/いつかこの手紙を読むあなたへ。/) && has(/あなたが幸せに生きてくれることが、お母さんの一番の願いです。/), '第7章のあと：帳簿の最後のページから母の手紙（全文）');
  ANS.push(0); await w.ITEMS.s3121_ledger.read(); ok(o.inventory.s3121_letter === 1, '母の手紙は重複しない');
  LOG.length = 0; await w.ITEMS.s3121_letter.read(); ok(has(/人を憎むことだけに人生を使わないでほしい。/), '母の手紙はどうぐから読み返せる');

  // ---- プロローグを飛ばす
  ANS.push(0, 1); await w.Title.newGame(); await wait(); const s = State.data;
  ok(World.map.id === 'poyo_village' && s.flags.s3121_prologue_skipped && S.phase() === 'done' && State.hasItem('s3121_ledger') && has(/あらすじ/), 'プロローグを飛ばす：ポヨ村から（あらすじ・帳簿とお守り）');
  // ---- 途中から飛ばす（家の本棚）
  ANS.push(0, 0); await w.Title.newGame(); await wait(); World.enterMap('asana_home', 4, 2, 'up'); ANS.push(1); await evAt(4, 1);
  ok(World.map.id === 'poyo_elder_house' && State.data.flags.s3121_hakei_night && State.data.quests.s3121_prologue.state === 'done', 'プロローグの途中で飛ばす（家の本棚）→ ポヨ村の村長の家');
  LOG.length = 0; await talk('elder_mochizo'); ok(State.data.gold === 100 && State.data.flags.met_elder, '飛ばしたあとも村長の報酬は一度だけ');

  // ---- 途中で閉じたデータ（脱出のあと、目を覚ます場面の前）→ 読み込むと目覚めの場面から続く
  { const r = State.data; r.flags.s3121_new_prologue = true; r.flags.s3121_prologue_phase = 'poyo_wake'; r.flags.s3121_escaped = true; delete r.flags.s3121_woke; delete r.flags.s3121_hakei_night; r.pos = { map: 'poyo_elder_house', x: 6, y: 2, dir: 'down' }; State.save(3);
    State.data = State.load(3); LOG.length = 0; World.start(); await new Promise((q) => setTimeout(q, 50)); await wait();
    ok(State.data.flags.s3121_woke && S.phase() === 'poyo_night' && World.map.id === 'poyo_village' && has(/聞いたことのない名じゃ/), '途中で閉じたデータ：読み込むと目覚めの場面から続き、夜のポヨ村へ'); }
  // ---- 父の場面のあと（段階が raid のまま）でも南の門から出られる
  { const r = State.data; r.flags.s3121_prologue_phase = 'raid'; r.flags.s3121_raid_father = true; delete r.flags.s3121_escaped; delete r.flags.s3121_woke; World.enterMap('asana_raid', 13, 18, 'down'); await stepTo(13, 20);
    ok(State.data.flags.s3121_escaped && World.map.id === 'poyo_village', '父の場面のあとの読み込みでも、南の門から脱出できる'); }
  ok(errors.length === 0, 'ページのエラーなし ' + JSON.stringify(errors.slice(0, 3)));
  console.log('結果：' + pass + ' OK / ' + fail + ' NG');
  if (fail) console.log(LOG.slice(-40).join('\n'));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
