// v9.4.1 仲間の絆：正しい指示書の 11〜15 章の確かめ（jsdom。実機・実ブラウザではない。画面の操作は browser/bonds941_browser.js）
//   node docs/tools/rpg94/bonds941_test.js [2d]
//   K 11A 取り残しの回収（ミナの父・セリスの師の記録と手記・カイルの誓い）  L 11B 星見塔の焚き火  M 11C 控えの仲間  N 11D 年代（イーリス・ミナ）
//   O 12 記録の確定・ID・名前空間・報酬の二重取り  P 13 セーブ 8 状態（旧版のセーブは基準コミットのゲームで作ったもの）
//   Q 14 一覧の並び・キャンセル・多重起動・知らせ  R 2D／3D の同じ進行  S Phase 1（リーナ・M・ポン太 × 3 条件）  T 未加入の人が出ない
const path = require('path'); const fs = require('fs'); const load = require(path.resolve(__dirname, '../v78/load78.js'));
const ROOT = path.resolve(__dirname, '../../..') + '/'; const FIX = path.resolve(__dirname, 'fixtures') + '/';
const BASE = '6b4d2a9856a7ea7beecf654a89d40dd025b97a8d';
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const doc = w.document;
const { Engine: E, State, World, Win, Menu, Events, Bonds: B, BondsUI: UI } = w; const B94 = w.BONDS94;
let okN = 0; const ng = []; const T = (c, m) => { if (c) okN++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const frames = async (n) => { for (let i = 0; i < n; i++) await sleep(17); };
const src = (f) => fs.readFileSync(ROOT + f, 'utf8'); const git = (a) => require('child_process').execSync('git -C ' + ROOT + ' ' + a, { encoding: 'utf8', maxBuffer: 64 << 20 });
let LOG = [], PICK = () => 0, CHOICES = [], TOASTS = [], THROW = null, ONMSG = null;
function stubWin() {
  Win.message = async (lines, opts) => { const L = Array.isArray(lines) ? lines : [lines]; for (const l of L) { if (THROW && THROW(l)) { THROW = null; throw new Error('テスト：途中で止める'); } LOG.push({ name: opts && opts.name || '', text: l }); } if (ONMSG) ONMSG(L); };
  Win.choice = async (q, opts, o3) => { CHOICES.push({ q, opts, o3 }); return PICK(opts, q, o3); };
  Win.list = async () => -1; Win.sleep = async () => { }; Win.toast = (t) => { TOASTS.push(t); };
}
const txt = () => LOG.map((x) => x.text).join('\n');
const IDS = ['lina', 'kyle', 'mina', 'seris', 'gald', 'lucia', 'elna', 'ganes', 'nagi', 'iris', 'sophia', 'io', 'aster', 'ord', 'kazuto', 'mochipoyo'];
const CH = () => w.STORY_CHAPTERS;
function fresh(name) { State.newGame(name || 'テスト', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; B.ensure(); return d; }
function chapters(d, n) { CH().forEach((c) => { if (c.flag && c.id <= n) d.flags[c.flag] = true; }); for (let i = 1; i < n; i++) d.quests['main_' + i] = { state: 'done', at: 1 }; }
function joinAll(d) { IDS.forEach((id) => { if (!d.companions[id]) State.joinCompanion(id); }); d.flags.ponta_joined = true; }
function loadJSON(obj, slot) { w.localStorage.setItem('mtq-rpg-v2-slot-' + slot, JSON.stringify(obj)); const d = State.load(slot); State.data = d; return d; }
const fixture = (n) => JSON.parse(fs.readFileSync(FIX + n + '.json', 'utf8'));
const mapEv = (map, x, y) => w.MAP_DEFS[map].events.filter((e) => e.x === x && e.y === y && e.type === 'script')[0];
const evBy = (map, needle) => w.MAP_DEFS[map].events.filter((e) => e.type === 'script' && String(e.run).indexOf(needle) >= 0)[0];   // 位置は町の作り直しで動くことがあるので、中身で探す
const npcOf = (map, id) => w.MAP_DEFS[map].npcs.filter((n) => n.id === id)[0];
const strip = (d) => { const o = JSON.parse(JSON.stringify(d)); delete o.bonds; delete o.version; delete o.savedAt; return o; };   // savedAt：保存した時刻（話のあとのオートセーブで変わる）
// 地域ごとの町（場所の決まった話を見るため。World.map を差しかえるだけ）
const REG = {}; Object.keys(w.MAP_DEFS).forEach((m) => { const def = w.MAP_DEFS[m]; if (!def || def.kind !== 'town') return; let r = null; try { r = w.Nav.regionOf(m); } catch (e) { } if (r && !REG[r]) REG[r] = m; });
function goRegion(r) { const m = r && REG[r] ? REG[r] : 'poyo_village'; World.map = { id: m, def: { kind: 'town' }, name: m }; }
// 見られる話を、なくなるまで全部見る（rescue：取り残しの回収もするか）
async function watchAll(opts) {
  opts = opts || {}; let n = 0;
  for (let round = 0; round < 12; round++) {
    let prog = 0;
    for (const id of B.joinOrder().concat(['hero'])) {
      if (opts.rescue) for (const r of B.rescuesFor(id, 'talk')) { const x = await B.rescue(r.quest, {}); if (x.done) { prog++; n++; } }
      for (const e of B.episodes(id)) { const s = B.epState(e); if (s === 'away') goRegion(e.place.regions[0]); if (B.epState(e) === 'ready') { const x = await B.play(e, {}); if (x.done) { prog++; n++; } } goRegion(null); }
      if (id !== 'hero') for (const p of B.pairsOf(id)) if (B.pairState(p) === 'ready') { const x = await B.play(p, {}); if (x.done) { prog++; n++; } }
    }
    if (!prog) break;
  }
  return n;
}
(async () => {
  try { E.Input.init(); } catch (e) { }
  if (w.Audio) { w.Audio.sfx = () => { }; w.Audio.playJingle = () => -1; }
  w.MochiQuest && w.MochiQuest.boot && w.MochiQuest.boot(); await frames(5);
  doc.querySelectorAll('#ui > *').forEach((n) => n.remove()); E.scenes = E.scenes.filter((s) => !s.overlay);
  fresh(); World.start(); await frames(4); World.busy = false; stubWin();
  console.log('== ' + (two ? '2D 版' : '3D 版と同じ読み込み') + '　読み込みのエラー ' + A.errors.length);
  T(A.errors.length === 0, '読み込みのエラーなし' + (A.errors.length ? '：' + A.errors.slice(0, 2).join(' / ') : ''));

  console.log('-- K 11A 取り残しの回収');
  let d = loadJSON(fixture('old_ch9_mina_absent'), 1); World.start(); await frames(2); World.busy = false;
  T(d.flags.mina_father_record && d.quests.main_9.state === 'done' && !(d.quests.mina_father && d.quests.mina_father.state === 'done'), '基準コミットのゲームで、ミナを外して父の記録を読むと「ミナの父」が達成されないまま残る（旧版のセーブで確かめ）');
  const stand = evBy('memory_library_seal', 'mina_father_record'); T(!!stand, '記録台のイベントがある');
  T(B.rescuePending('mina_father') && B.hasNew('mina'), '取り残しを見つける：ミナに「新しい話」の印');
  LOG = []; await Events.run(stand); World.busy = false;
  T(/記録台。最後の記録係の記録は/.test(txt()) && !(d.quests.mina_father && d.quests.mina_father.state === 'done'), 'ミナがいないまま記録台を調べても、今までどおりの一文だけ（何も変わらない）');
  const ring0 = d.inventory.ring_speed || 0; const exp0 = JSON.stringify(Object.keys(d.companions).map((k) => d.companions[k].exp));
  // 途中で止まった（エラー）ときは何も変えない
  LOG = []; THROW = (l) => /ダリル/.test(l); let r = await B.rescue('mina_father', {});
  T(r.error && !B.playing && B.rescuePending('mina_father') && (d.inventory.ring_speed || 0) === ring0 && !d.bonds.seen.rescue_mina_father, '回収の途中でエラー：達成・報酬・記録は変わらず、もう一度最初から見られる');
  // 仲間と話す から
  LOG = []; PICK = (opts) => opts.findIndex((o) => /父の記録を、ミナと読む/.test(o)); const act = await UI.actions('mina');
  T(act && act.kind === 'rescue' && CHOICES[CHOICES.length - 1].opts[0] === '父の記録を、ミナと読む', '「仲間と話す」→ミナ：いちばん上に「父の記録を、ミナと読む」');
  await UI.run(act);
  T(/……読む。私が読む。/.test(txt()) && /……父さん。/.test(txt()) && /宝箱、いっぱい開けて/.test(txt()) && /守るために残った/.test(txt()), 'ミナが自分で記録を読み、既存の「最初に読んだときの反応」がそのまま出る');
  T(d.quests.mina_father.state === 'done' && (d.inventory.ring_speed || 0) === ring0 + 1 && JSON.stringify(Object.keys(d.companions).map((k) => d.companions[k].exp)) !== exp0, '「ミナの父」を達成：既存の報酬（素早さの指輪・経験値）を1回');
  r = await B.rescue('mina_father', {}); T(!r.done && (d.inventory.ring_speed || 0) === ring0 + 1 && !B.rescuePending('mina_father'), 'もう一度は起きない（報酬は二重にならない）');
  d.bonds.seen.mina_1 = 1; T(B.epState(B94.EP.mina_2) === 'ready', '回収のあと、ミナ第2話が見られる');
  // 記録台から（ミナを戦闘メンバーに入れて）
  d = loadJSON(fixture('old_ch9_mina_absent'), 1); d.party = ['lina', 'mina', 'seris']; LOG = []; await Events.run(stand); World.busy = false;
  T(/封印区画の記録台の前で、ミナが足を止めた/.test(txt()) && /……父さん。/.test(txt()) && d.quests.mina_father.state === 'done', '記録台から：ミナを連れて調べると、その場でミナが読む（持ち帰った記録の言い方）');
  LOG = []; await Events.run(stand); World.busy = false; T(/記録台。最後の記録係の記録は/.test(txt()) && !/……父さん。/.test(txt()), '2回目からは今までどおりの一文');
  // 既存の支え会話（2052年の円盤）と重ならない
  const disc = w.MAP_DEFS.memory_library.events.filter((e) => e.s3121 && e.type === 'script')[0]; LOG = []; await Events.run(disc); World.busy = false;   // 2052年の円盤（js/data/story3121-world.js。後のクエストが包んでいるので印 s3121 で探す）
  T(/お父さんは、最後まで人を逃がしたんだね/.test(txt()) && d.flags.s3121_mina_support, '既存の支え会話（2052年の円盤の前）は今までどおり1回出る' + (d.flags.s3121_mina_support ? '' : '：' + txt().slice(0, 200).replace(/\n/g, ' / ')));
  const sup = ['お父さんは、最後まで人を逃がしたんだね', '一人じゃないよ。ここにいる', 'あんたに言われると、なんか、泣いていい気がする'];
  const mina2 = JSON.stringify(B94.EP.mina_2.steps) + JSON.stringify(B94.RESCUE.rescue_mina_father.steps);
  T(sup.every((s) => mina2.indexOf(s) < 0), 'ミナ第2話・回収の場面に、既存の支え会話の文をくり返さない');
  // セリス（師の記録・手記）
  d = fresh(); joinAll(d); d.party = ['lina', 'kyle', 'mina']; d.flags.core_2 = true; d.flags.origin_notes = true; d.inventory.theodor_record = 1; d.inventory.theodor_notes = 1;
  T(B.rescuePending('seris_master') && B.rescuePending('seris_origin') && B.rescuesFor('seris', 'talk').length === 2, 'セリスがいないときに師の記録・手記を読んでいたら、2つとも回収を待つ');
  LOG = []; await B.rescue('seris_master', {}); await B.rescue('seris_origin', {});
  T(d.quests.seris_master.state === 'done' && d.flags.seris_master_done && d.quests.seris_origin.state === 'done' && /私は、同じ間違いをしない/.test(txt()) && /両方を、持ちたい/.test(txt()), 'セリスと読む：既存の反応の文・既存のフラグ（seris_master_done）・達成');
  d.party = ['seris', 'lina']; d.quests.seris_master = undefined; delete d.quests.seris_master; LOG = []; await Events.run(evBy('oracle_core_2', 'seris_master')); World.busy = false;
  T(/オラクル中枢の記録の前で、セリスが足を止めた/.test(txt()) && d.quests.seris_master.state === 'done', '元の場所（オラクル中枢 第2層）でセリスを連れて調べても読める');
  // カイル（一騎打ちのあとに加入）
  d = fresh(); State.joinCompanion('lina'); d.flags.kyle_oath_done = true; d.flags.sevran_fallen = true; State.joinCompanion('kyle'); d.party = ['lina'];
  T(B.rescuePending('kyle_oath') && B.rescuesFor('kyle', 'talk').length === 0 && B.rescuesFor('kyle', 'npc').length === 1, 'カイルが一騎打ちのあとに加入：回収はヴァレン団長に会う形（仲間と話す、では出さない）');
  PICK = () => -1; CHOICES = []; await UI.actions('kyle'); T(/騎士団詰所/.test(CHOICES[CHOICES.length - 1].q), '「仲間と話す」→カイル：行き先の案内だけ出る');
  const valen = npcOf('sentra_knights', 'sk_valen'); LOG = []; await valen.talk(Events.ctx(valen));
  T(/カイル、戻ってこいとは言わん/.test(txt()) && !(d.quests.kyle_oath && d.quests.kyle_oath.state === 'done'), 'カイルを連れていないときは、今までどおり');
  const helm0 = d.inventory.knight_helm || 0; d.party = ['kyle', 'lina']; LOG = []; await valen.talk(Events.ctx(valen));
  T(/お前が正しい/.test(txt()) && /民に立てるものだ/.test(txt()) && d.quests.kyle_oath.state === 'done' && (d.inventory.knight_helm || 0) === helm0 + 1, 'カイルを連れて会う：既存の台詞で「カイルの誓い」を達成（騎士の兜を1回）');
  LOG = []; await valen.talk(Events.ctx(valen)); T(!/お前が正しい/.test(txt()) && (d.inventory.knight_helm || 0) === helm0 + 1, '2回目からは今までどおり');

  console.log('-- L 11B 星見塔の焚き火');
  const camp = evBy('star_camp', 'camp_talk');
  d = fresh(); joinAll(d); chapters(d, 14); d.party = ['lina', 'kyle', 'mina']; World.start(); await frames(2); World.busy = false;
  State.partyActors().forEach((a) => { a.hp = 1; });
  LOG = []; await Events.run(camp); World.busy = false;
  const presup = ['やっとそれを口に出せた', '父さんは逃げ遅れたんじゃなかった', '止める勇気を持てなかった', '師匠の言葉を、やっと自分の言葉にできた', '墓に刻めた'];
  const before = ['まだ、それをちゃんと口に出せていない', 'まだ自分の目で読んでない', '全部は読めていない', 'いつか自分の言葉にしたい', '知ってから、槌が少し軽くなった'];
  T(presup.every((s) => txt().indexOf(s) < 0) && before.every((s) => txt().indexOf(s) >= 0), '個人の話（カイル・ミナ・セリス・ルシア）と記憶の墓標（ガネス・第15章）の前は、達成後の前提で話さない（5人とも「まだ」の言い方）');
  T(d.flags.camp_talk && d.flags.camp_bond === 16 && d.flags.s3121_camp_letter && State.partyActors().every((a) => a.hp === w.Actors.stats(a).maxHp), '第14章の進行フラグ（camp_talk・camp_bond・手紙）と回復は今までどおり');
  T(B94.BONFIRE && Object.values(B94.BONFIRE).every((L) => L.every((l) => txt().indexOf(w.Bonds.fmt(l)) < 0)), '第2話を見ていなければ、絆の一言は出ない');
  ['kyle_oath', 'mina_father', 'seris_origin', 'lucia_wave', 'dark_memorial'].forEach((q) => { d.quests[q] = { state: 'done', at: 1 }; });
  ['lina_1', 'lina_2', 'lina_3', 'kyle_1', 'kyle_2', 'mina_1', 'mina_2', 'seris_1', 'seris_2'].forEach((e) => { d.bonds.seen[e] = 1; });
  State.partyActors().forEach((a) => { a.hp = 1; }); LOG = []; await Events.run(camp); World.busy = false;
  T(presup.every((s) => txt().indexOf(s) >= 0), '達成したあとは、今までの文がそのまま出る');
  T(State.partyActors().every((a) => a.hp === 1), '2回目の焚き火で回復しない（今までどおり、回復は最初の1回だけ）');
  const bf = B.bonfireLines(); T(bf.length === 3 && bf[0].id === 'lina' && txt().indexOf(B94.BONFIRE.lina[0]) >= 0 && txt().indexOf(B94.BONFIRE.seris[0]) < 0, '第2話まで見た仲間の一言は最大3人（絆の段階の高い順。リーナが最初）');
  const skyBase = git('show ' + BASE + ':js/data/sky.js'); const keepLines = skyBase.split('\n').filter((l) => /camp_talk|State_heal|s3121_camp_letter|camp_bond/.test(l));
  T(keepLines.length >= 3 && keepLines.every((l) => src('js/data/sky.js').indexOf(l) >= 0), '焚き火の進行フラグ・回復の行は基準コミットと1文字も同じ（' + keepLines.length + '行）');

  console.log('-- M 11C 控えの仲間');
  d = fresh(); ['lina', 'kyle', 'mina', 'gald', 'seris'].forEach((id) => State.joinCompanion(id)); d.party = ['kyle', 'mina', 'gald'];
  T(UI.people().indexOf('lina') >= 0 && UI.people().indexOf('seris') >= 0, '控えのリーナ・セリスも「仲間と話す」の一覧に出る');
  LOG = []; const tp = await B.chat('lina'); T(!!tp && LOG.length > 0 && LOG[0].name === 'リーナ', '控えのリーナとも日常会話ができる');
  const ctx0 = Events.ctx(null); const r1 = await ctx0.remark('lina', ['（確かめ）'], null); const r2 = await ctx0.remark('kyle', ['（確かめ）'], null);
  T(r1 === false && r2 === true, '既存の「戦闘メンバーだけの一言」（remark）は今までどおり：控えのリーナは出ない・カイルは出る');
  const evBase = git('show ' + BASE + ':js/rpg/events.js').split('\n').filter((l) => /remark: async function/.test(l)); T(evBase.length === 1 && src('js/rpg/events.js').indexOf(evBase[0]) >= 0, 'remark の行は基準コミットと同じ（休憩の会話の条件とは別）');

  console.log('-- N 11D 年代');
  const allBond = JSON.stringify([B94.EP, B94.PAIRS, B94.CHAT, B94.PROFILE, B94.KEEP, B94.RESCUE, B94.BONFIRE]).replace(/s3121_[a-z0-9_]+/g, '');   // フラグの名前（s3121_…）は除く
  const years = allBond.match(/十八年|十八|18年|3024|3103|3121|均衡暦[0-9０-９]|[0-9０-９]+歳|六つ|七つ|八つ/g) || [];
  T(years.length === 0, '絆の文に、灰灯島の災害の年・経過年数・年齢を書かない（' + (years.join(' ') || 'なし') + '）');
  const iris2 = JSON.stringify(B94.EP.iris_2.steps);
  T(!/ヨルンの家|わたしの家|二階/.test(iris2) && iris2.indexOf('3番通り 7号 パン屋 ロゼ一家 4人') >= 0 && src('js/data/islands.js').indexOf('3番通り 7号 パン屋 ロゼ一家 4人') >= 0, 'イーリス第2話：決まっていない事（ヨルンの家の二階・イーリスの昔の家）を使わず、既存の壁の地図の文を使う');
  T(/灰灯島の生き残り/.test(B94.PROFILE.iris.intro) && /ヨルン老人の孫/.test(B94.PROFILE.iris.intro) && /灰灯島の生き残り。ヨルン老人の孫/.test(w.COMPANIONS.iris.background), 'イーリスの紹介は既存の設定（灰灯島の生き残り・ヨルン老人の孫）だけ');
  T(!/あの日の、パン屋/.test(JSON.stringify(B94.EP.iris_3.steps)), 'イーリス第3話：灰灯島で「あの日」は災害の日を指すので、パン屋の日は「あのとき」');

  console.log('-- O 12 記録の確定・ID・名前空間');
  const bondIds = Object.keys(B94.EP).concat(Object.keys(B94.PAIRS), Object.keys(B94.RESCUE), Object.keys(B94.KEEP));
  const pools = { クエスト: w.QUESTS, アイテム: w.ITEMS, 仲間: w.COMPANIONS, 職業: w.JOBS || {}, 技: w.SKILLS || {}, 敵: w.ENEMIES || {}, マップ: w.MAP_DEFS };
  const clash = []; bondIds.forEach((id) => Object.keys(pools).forEach((k) => { if (pools[k] && Object.prototype.hasOwnProperty.call(pools[k], id)) clash.push(k + ':' + id); }));
  T(clash.length === 0 && new Set(bondIds).size === bondIds.length, '絆の ID（話 ' + Object.keys(B94.EP).length + '・関係 ' + Object.keys(B94.PAIRS).length + '・回収 ' + Object.keys(B94.RESCUE).length + '・記念品 ' + Object.keys(B94.KEEP).length + '）は、既存のクエスト・アイテム・仲間・職業・技・敵・マップの ID と重ならない' + (clash.length ? '：' + clash.join(' ') : ''));
  d = fresh(); joinAll(d);
  T(JSON.stringify(Object.keys(d.bonds).sort()) === JSON.stringify(B.KEYS.concat(['v', 'camp']).sort()), 'セーブの名前空間は d.bonds だけ（見た話・先送り・選択の記憶・最後に選んだこと・記念品・日常会話の順番・交わした会話・クリア後の会話・テントの場所）');
  // 途中でエラー → 何も書かない
  const b0 = JSON.stringify(d.bonds); PICK = (opts) => Math.max(0, opts.findIndex((o) => /リーナの分/.test(o))); THROW = (l) => /ふふ。いつも忘れちゃうね|忘れちゃう/.test(l);
  LOG = []; r = await B.play(B94.EP.lina_1, {});
  T(r.error && JSON.stringify(d.bonds) === b0 && !B.playing && B.epState(B94.EP.lina_1) === 'ready', '話の途中でエラー：選んだ焼き菓子・最後に選んだこと・見た記録はどれも書かない（もう一度最初から）' + (r.error ? '' : '（エラーが起きなかった）'));
  // 途中で保存された（閉じた）ときのセーブには、途中の選択が入らない
  THROW = null; let midSave = null; ONMSG = () => { if (!midSave && CHOICES.length && LOG.length > 6) midSave = JSON.stringify(State.data.bonds); };
  CHOICES = []; LOG = []; r = await B.play(B94.EP.lina_1, {}); ONMSG = null;
  T(midSave === b0 && r.done && d.bonds.seen.lina_1 && d.bonds.mem.lina_sweet, '話の途中で保存されても、途中の選択は入らない。最後まで見たときにまとめて記録');
  // 先送り：回数だけ
  const b1 = JSON.parse(JSON.stringify(d.bonds)); PICK = (opts) => opts.findIndex((o) => /今日はやめておく/.test(o)); r = await B.play(B94.EP.elna_1, {});
  const b2 = JSON.parse(JSON.stringify(d.bonds)); delete b2.later; const b1x = JSON.parse(JSON.stringify(b1)); delete b1x.later;
  T(r.later && d.bonds.later.elna_1 === 1 && JSON.stringify(b2) === JSON.stringify(b1x), '「今日はやめておく」：先送りの回数のほかは何も書かない');
  // 記念品は二重にならない
  d.quests.main_8 = { state: 'done' }; d.quests.lina_clinic = { state: 'done' }; PICK = () => 0; await B.play(B94.EP.lina_2, {}); await B.play(B94.EP.lina_3, {}); await B.play(B94.EP.lina_3, { replay: true });
  T(d.bonds.keep.lina.filter((k) => k === 'lina_wrapper').length === 1 && B.readyEpisodes('lina').length === 0, '記念品は1つだけ（再生しても増えない）。見た話は二度起きない');
  // 交わした会話・クリア後
  d.bonds.chat = {}; d.bonds.heard = {}; for (let i = 0; i < 14; i++) await B.chat('kyle');
  T(d.bonds.heard.kyle.length >= 5 && d.bonds.heard.kyle.length <= 14 && new Set(d.bonds.heard.kyle.map((h) => h.k)).size === d.bonds.heard.kyle.length, '交わした日常会話を記録（同じ話は1つにまとめる：' + d.bonds.heard.kyle.length + '件）');
  d.flags.game_cleared = true; for (let i = 0; i < 8; i++) await B.chat('kyle'); T(!!d.bonds.post.kyle, 'クリア後の「旅のあとの話」を聞いたことを記録'); d.flags.game_cleared = false;

  console.log('-- P 13 セーブ 8 状態');
  const states = [];
  states.push(['1 ゲーム開始直後', () => fresh('はじまり')]);
  states.push(['2 仲間が一部だけ', () => { const x = fresh('いちぶ'); chapters(x, 3); ['lina', 'kyle', 'mina'].forEach((id) => State.joinCompanion(id)); return x; }]);
  states.push(['3 個人クエストの途中', () => { const x = fresh('とちゅう'); chapters(x, 6); ['lina', 'kyle', 'mina', 'seris', 'gald'].forEach((id) => State.joinCompanion(id)); x.quests.lina_clinic = { state: 'active', at: 1 }; return x; }]);
  states.push(['4 個人クエストを達成済み', () => { const x = fresh('たっせい'); chapters(x, 8); ['lina', 'kyle', 'mina', 'seris', 'gald', 'lucia', 'elna'].forEach((id) => State.joinCompanion(id)); ['lina_clinic', 'kyle_oath', 'elna_audit', 'gald_reunion'].forEach((q) => { x.quests[q] = { state: 'done', at: 1 }; }); x.flags.kyle_oath_done = true; return x; }]);
  states.push(['5 第14章以降', () => { const x = fresh('じゅうよん'); chapters(x, 14); joinAll(x); delete x.companions.kazuto; x.party = x.party.filter((p) => p !== 'kazuto'); ['lina_clinic', 'kyle_oath', 'mina_father', 'seris_master', 'seris_origin', 'gald_reunion', 'lucia_wave', 'elna_audit', 'nagi_chart', 'iris_map', 'io_memory', 'ord_penance', 'ganes_brother'].forEach((q) => { x.quests[q] = { state: 'done', at: 1 }; }); x.flags.s3121_mio_letter = true; return x; }]);
  states.push(['6 全仲間を加入済み', () => { const x = fresh('ぜんいん'); chapters(x, 9); joinAll(x); return x; }]);
  states.push(['7 クリア済み（旧版のセーブ）', () => fixture('old_cleared')]);
  states.push(['8 旧バージョンから引き継いだセーブ（第9章）', () => fixture('old_ch9_mina_absent')]);
  for (const [name, mk] of states) {
    let raw = mk(); raw = JSON.parse(JSON.stringify(raw)); const fromOld = !raw.bonds; delete raw.bonds;
    // 比べる相手：絆の仕組みがないときの読み込み（既存の migrate の補正はそのまま）。違いが bonds だけかを見る
    const keepB = w.Bonds; w.Bonds = undefined; const pre = strip(State.migrate(JSON.parse(JSON.stringify(raw)))); w.Bonds = keepB;
    let dd = null, err = null; try { dd = loadJSON(raw, 2); } catch (e) { err = e; }
    if (!dd || err) { T(false, name + '：読み込めない ' + (err && err.message)); continue; }
    const loadSame = JSON.stringify(strip(dd)) === JSON.stringify(pre); const loadDiff = loadSame ? '' : JSON.stringify(strip(dd));
    World.start(); await frames(1); World.busy = false; LOG = []; PICK = (opts) => { const i = opts.findIndex((o) => !/やめておく|そっとしておく/.test(o)); return i < 0 ? 0 : i; };
    const ok1 = dd.bonds && dd.bonds.v === 1 && B.KEYS.every((k) => dd.bonds[k] && typeof dd.bonds[k] === 'object') && loadSame;
    // 一覧・手帳がつくれる
    const people = UI.people(); const html = UI.bookOrder().map((id) => { try { return w.BondsUI && B.summary(id) && 1; } catch (e) { return 0; } }).every(Boolean);
    const snapNon = JSON.stringify(strip(dd));
    const n = await watchAll({ rescue: false });
    const same = JSON.stringify(strip(State.data)) === snapNon;
    const dk = (x, y) => { x = JSON.parse(x); y = JSON.parse(y); return [...new Set(Object.keys(x).concat(Object.keys(y)))].filter((k) => JSON.stringify(x[k]) !== JSON.stringify(y[k])).join(' '); };
    if (!ok1 || !same) console.log('    違い：読み込み ' + (loadSame ? 'なし' : dk(loadDiff, JSON.stringify(pre))) + '／話のあと ' + dk(JSON.stringify(strip(State.data)), snapNon));
    const seenAll = Object.keys(State.data.bonds.seen).length;
    T(ok1 && html && same, name + '：読み込める・bonds だけを足す（ほかの項目はそのまま）。見られる話を全部見ても（' + n + '話）、能力・装備・職業・持ち物・お金・ランク・クエスト・フラグは1つも変わらない' + (fromOld ? '（旧セーブ）' : ''));
    if (name.startsWith('1')) T(people.length === 0 && n === 0, name + '：仲間がいないので話はない（一覧も空）');
    if (name.startsWith('2')) T(seenAll > 0 && Object.keys(State.data.bonds.seen).every((k) => { const e = B.epById(k); return e && (e.who ? ['lina', 'kyle', 'mina', 'hero'].indexOf(e.who) >= 0 : ['lina', 'kyle', 'mina'].indexOf(e.a) >= 0 && ['lina', 'kyle', 'mina'].indexOf(e.b) >= 0); }), name + '：見た話は、加入した3人（と主人公）の話だけ');
    if (name.startsWith('3')) { T(B.epState(B94.EP.lina_2) === 'locked', name + '：クエストの途中は第2話はまだ'); State.data.quests.lina_clinic = { state: 'done', at: 2 }; T(B.epState(B94.EP.lina_2) === 'ready', name + '：達成すると第2話'); }
    if (name.startsWith('4')) T(State.data.bonds.seen.lina_2 && State.data.bonds.seen.kyle_2 && State.data.bonds.seen.elna_2, name + '：すでに達成したクエストの続き（リーナ・カイル・エルナ第2話）も見られる（救済の道）');
    if (name.startsWith('5')) T(!State.data.bonds.seen.mochipoyo_2 && State.data.bonds.seen.lina_3 && !State.data.bonds.seen.kazuto_1, name + '：第14章の話（M 第2話）は第14章を終えるまで出ない・未加入のカズトの話は出ない');
    if (name.startsWith('7')) T(seenAll === 54 + 21, name + '：クリア後でも、すべての個人の話（54）と関係の話（21）を見られる（' + seenAll + '）');
    if (name.startsWith('8')) { T(B.rescuePending('mina_father'), name + '：取り残し（ミナの父）が見つかる'); const k = await watchAll({ rescue: true }); T(State.data.quests.mina_father.state === 'done' && k >= 1, name + '：回収すると「ミナの父」を達成（既存の報酬）'); }
  }

  fresh(); World.start(); await frames(2); World.busy = false;   // 本物の地図に戻す（watchAll は地域の判定のために World.map を差しかえる）
  console.log('-- Q 14 一覧の並び・キャンセル・多重起動・知らせ');
  d = fresh(); ['lina', 'gald', 'kyle'].forEach((id) => State.joinCompanion(id)); d.flags.ponta_joined = true;
  T(JSON.stringify(UI.people()) === JSON.stringify(['lina', 'gald', 'kyle', 'ponta']), '「仲間と話す」は加入した順（リーナ→ガルド→カイル→ポン太）');
  const bo = UI.bookOrder(); T(bo.length === 18 && JSON.stringify(bo.slice(0, 4)) === JSON.stringify(['lina', 'gald', 'kyle', 'ponta']) && bo[17] === 'hero', '思い出手帳：加入した順 → まだ出会っていない人 → 主人公');
  CHOICES = []; LOG = []; PICK = () => -1; r = await B.play(B94.EP.lina_1, {});
  T(r.later && CHOICES[0].o3 && CHOICES[0].o3.cancel === true, 'キャンセル：「今日はやめておく」がある問いでは、キャンセル＝先送り');
  d.bonds.later = {}; CHOICES = []; PICK = (opts, q, o3) => (o3 && o3.cancel === false ? 0 : -1); r = await B.play(B94.EP.kyle_1, {});
  T(r.done && CHOICES.every((c) => c.o3 && c.o3.cancel === false), 'ほかの問いはキャンセルできない（cancel:false。キャンセルしても閉じたり飛んだりしない）');
  let gate = null, opened = false; Win.message = async () => { if (!opened) await new Promise((res) => { gate = res; }); };
  const p1 = B.play(B94.EP.gald_1, {}); await sleep(5); const busy1 = B.playing; const p2 = await B.play(B94.EP.gald_1, {}); const t2 = await UI.talk({});
  opened = true; if (gate) gate(); const r1x = await p1; stubWin();
  T(busy1 && p2.busy === true && t2 === null && (r1x.done || r1x.later) && !B.playing, '話の再生中は、二つ目の話も「仲間と話す」も始まらない（連続タップ）。一つ目は最後まで進む');
  TOASTS = []; CHOICES = []; d.bonds = B.defaults(); await UI.afterInn();
  T(TOASTS.length === 1 && /話したそう|尻尾|聞きたそう/.test(TOASTS[0]) && CHOICES.length === 0, '宿・テントのあとは小さな知らせ（トースト）を1つだけ。選択の窓は出さない');
  T(!/Win\.message\(\['（焚き火のそばで、仲間と話せる/.test(src('js/ui/menu.js')) && /BondsUI\.afterInn/.test(src('js/ui/menu.js')), 'テントを張ったときの知らせも、窓ではなくトースト');

  console.log('-- R 2D／3D で同じ進行');
  d = fresh('ふたつ'); joinAll(d); d.bonds.seen.lina_1 = 1; d.bonds.mem.lina_sweet = 'りんごのタルト'; d.bonds.last.lina = 'x'; const twoD = JSON.stringify(d);
  const A3 = load({ before: (ww) => { ww.MTQ_SAVE_PREFIX = 'mtq-3d-slot-'; } }); const w3 = A3.w;
  w3.localStorage.setItem('mtq-rpg-v2-slot-2', twoD);
  const d3 = w3.State.loadNormal(2); w3.State.data = d3; w3.State.save(1);
  const in3 = JSON.parse(w3.localStorage.getItem('mtq-3d-slot-1') || '{}');
  T(A3.errors.length === 0 && in3.bonds && in3.bonds.seen.lina_1 && in3.bonds.mem.lina_sweet === 'りんごのタルト' && w3.localStorage.getItem('mtq-rpg-v2-slot-2') === twoD, '3D 版で 2D 版のセーブを取り込むと、絆の記録もそのまま（3D は mtq-3d-slot-、2D のセーブは変わらない）');
  w3.State.data = d3; T(w3.Bonds.epState(w3.BONDS94.EP.lina_1) === 'seen' && w3.Bonds.epState(w3.BONDS94.EP.lina_2) === 'locked', '3D 版でも同じ進み具合（リーナ第1話は見た・第2話はまだ）');

  console.log('-- S Phase 1：リーナ・M・ポン太 × 3 条件');
  const P1 = ['lina', 'mochipoyo', 'ponta'];
  d = fresh('ぷろと'); P1.forEach((id) => { if (id === 'ponta') d.flags.ponta_joined = true; else State.joinCompanion(id); });
  T(P1.every((id) => B.epState(B94.EP[id + '_1']) === 'ready' && B.epState(B94.EP[id + '_2']) === 'locked' && B.epState(B94.EP[id + '_3']) === 'locked'), '条件1（加入した直後）：3人とも第1話だけ');
  PICK = (opts) => { const i = opts.findIndex((o) => !/やめておく|そっとしておく/.test(o)); return i < 0 ? 0 : i; };
  for (const id of P1) await B.play(B94.EP[id + '_1'], {}); chapters(d, 14); d.quests.lina_clinic = { state: 'done' };
  T(B.epState(B94.EP.lina_2) === 'ready' && B.epState(B94.EP.mochipoyo_2) === 'locked' && B.epState(B94.EP.ponta_2) === 'locked', '条件2（第13章まで・診療所のあと）：リーナ第2話は見られる・M とポン太の第2話は第14章のあと');
  d.quests.main_14 = { state: 'done' }; d.quests.main_15 = { state: 'done' }; d.quests.main_16 = { state: 'done' }; d.flags.game_cleared = true; d.quests.main_8 = { state: 'done' };
  for (const id of P1) { await B.play(B94.EP[id + '_2'], {}); await B.play(B94.EP[id + '_3'], {}); }
  const snapP = JSON.stringify(d); for (const id of P1) await B.play(B94.EP[id + '_3'], { replay: true, noCam: true });
  T(P1.every((id) => B.stage(id) === 3) && B.nextChat('lina').topic === 'post' && JSON.stringify(d) === snapP && B.epilogueLines().length >= 3, '条件3（クリア後）：3人とも3話を見られる・旅のあとの話・再生で記録は変わらない・エンディングの一文');

  console.log('-- T 未加入の人が出ない');
  const owners = (sc) => sc.who ? [sc.who] : [sc.a, sc.b];
  const unguarded = [];
  for (const sc of Object.values(B94.EP).concat(Object.values(B94.PAIRS))) {
    (function walk(steps, guard) { (steps || []).forEach((s) => {
      if ((s[0] === 's' || s[0] === 'a') && s[1] !== 'hero' && owners(sc).indexOf(s[1]) < 0 && guard.indexOf(s[1]) < 0) unguarded.push(sc.id + ':' + s[1]);
      if (s[0] === 'if') { const c = s[1] || {}; const g = guard.concat(c.join || [], c.inParty || [], (c.ep || []).map((e) => e.replace(/_\d$/, '')), (c.pair || []).reduce((a, p) => a.concat(p.replace(/^pair_/, '').split('_')), [])); walk(s[2], g); walk(s[3], guard); }
      if (s[0] === 'c') (s[2] || []).forEach((o) => walk(o.then, o.when ? guard.concat(o.when.join || [], o.when.inParty || []) : guard));
    }); })(sc.steps.concat(sc.resume || []), []);
  }
  T(unguarded.length === 0, '話の中で、その話の本人以外の仲間が話す・動く場面は、加入している条件の中だけ' + (unguarded.length ? '：' + unguarded.slice(0, 5).join(' ') : ''));
  d = fresh('みかにゅう'); chapters(d, 16); d.quests.main_16 = { state: 'done' }; ['lina', 'kyle', 'mina'].forEach((id) => State.joinCompanion(id)); IDS.forEach((id) => { });
  ['lina_clinic', 'kyle_oath', 'mina_father'].forEach((q) => { d.quests[q] = { state: 'done' }; }); d.flags.game_cleared = true;
  LOG = []; await watchAll({}); for (const id of ['lina', 'kyle', 'mina']) for (let i = 0; i < 12; i++) await B.chat(id);
  const others = IDS.filter((id) => ['lina', 'kyle', 'mina'].indexOf(id) < 0).map((id) => id === 'mochipoyo' ? '謎のタイムトラベラーM' : B94.PROFILE[id].short).concat(['ポン太']);
  const leak = others.filter((nm) => LOG.some((l) => l.text.indexOf(nm) >= 0 || l.name === nm));
  T(leak.length === 0 && LOG.length > 100, '加入が3人のとき、3人の話・関係の話・日常会話（各12回）を全部見ても、ほかの仲間の名前は出ない（文 ' + LOG.length + '）' + (leak.length ? '：' + leak.join(' ') : ''));

  console.log('\n結果：OK ' + okN + ' / NG ' + ng.length + (ng.length ? '\nNG：' + ng.join('\n    ') : ''));
  process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
