// v9.4 仲間の絆の確かめ（jsdom。実機・実ブラウザではない。見た目・3D のカメラは browser/ の確かめで）
//   node docs/tools/rpg94/bonds94_test.js [2d]
//   A データ（18人×3話・21組・ID・記念品・記憶のキー・気持ち・話し手）  B 守る設定（M・カズト・ポン太・主人公・既存の ID）
//   C セーブ（新しいゲーム・旧セーブ・壊れた値）  D 解放の順番・条件・場所・関係の話の保留  E 再生（選択の記録・先送り・二度起きない）
//   F 思い出の再生は何も変えない  G 日常会話（順番・関係の話のあと・地域・クリア後）  H 話せる場所・メニュー・宿・酒場・エンディング
//   I すべての話を、すべての選び方で最後まで（文の差し込みの残り・エラーなし）  J 文の点検（主人公の一人称・M の正体を決めない・ポン太は話さない）
const path = require('path'); const fs = require('fs'); const load = require(path.resolve(__dirname, '../v78/load78.js'));
const ROOT = path.resolve(__dirname, '../../..') + '/';
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const doc = w.document;
const { Engine: E, State, World, Win, Menu, Bonds: B, BondsUI: UI } = w; const B94 = w.BONDS94;
let okN = 0; const ng = []; const T = (c, m) => { if (c) okN++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const frames = async (n) => { for (let i = 0; i < n; i++) await sleep(17); };
const src = (f) => fs.readFileSync(ROOT + f, 'utf8');
function clean() { doc.querySelectorAll('#ui > *').forEach((n) => n.remove()); E.scenes = E.scenes.filter((s) => !s.overlay); World.busy = false; }
// 会話の窓の代わり：表示した文を記録し、選択肢は pick で選ぶ（実際の窓の動きは browser/ で確かめる）
let LOG = [], PICK = () => 0, CHOICES = [];
const realWin = { message: Win.message, choice: Win.choice, sleep: Win.sleep, toast: Win.toast, list: Win.list };
function stubWin() {
  Win.message = async (lines, opts) => { (Array.isArray(lines) ? lines : [lines]).forEach((l) => LOG.push({ name: opts && opts.name || '', text: l, emo: opts && opts.emo || null, portrait: !!(opts && opts.portrait) })); };
  Win.choice = async (q, opts) => { CHOICES.push({ q, opts }); const i = PICK(opts, q); return i; };
  Win.sleep = async () => { }; Win.toast = () => { };
}
function restoreWin() { Object.assign(Win, realWin); }
const allText = () => LOG.map((x) => x.text).join('\n');
const IDS = ['lina', 'kyle', 'mina', 'seris', 'gald', 'lucia', 'elna', 'ganes', 'nagi', 'iris', 'sophia', 'io', 'aster', 'ord', 'kazuto', 'mochipoyo'];
function joinAll(d) { IDS.forEach((id) => { if (!d.companions[id]) State.joinCompanion(id); }); d.flags.ponta_joined = true; }
function walk(steps, f) { (steps || []).forEach((s) => { f(s); if (s[0] === 'if') { walk(s[2], f); walk(s[3], f); } if (s[0] === 'c') (s[2] || []).forEach((o) => { f(['opt', o]); walk(o.then, f); }); }); }
function scenes() { return Object.values(B94.EP).concat(Object.values(B94.PAIRS)); }
(async () => {
  try { E.Input.init(); } catch (e) { }
  if (w.Audio) { w.Audio.sfx = () => { }; w.Audio.playJingle = () => -1; }
  w.MochiQuest && w.MochiQuest.boot && w.MochiQuest.boot(); await frames(5); clean();
  State.newGame('テスト', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); await frames(4); clean();
  console.log('== ' + (two ? '2D 版' : '3D 版と同じ読み込み') + '　読み込みのエラー ' + A.errors.length);
  T(A.errors.length === 0, '読み込みのエラーなし' + (A.errors.length ? '：' + A.errors.slice(0, 2).join(' / ') : ''));

  console.log('-- A データ');
  T(B && UI && B94, '仕組み（Bonds・BondsUI・BONDS94）がある');
  T(B.check().length === 0, 'Bonds.check：形の食い違いなし' + (B.check().length ? '：' + B.check().slice(0, 3).join(' / ') : ''));
  const EIDS = Object.keys(B94.EP); T(EIDS.length === 54 && B.IDS.length === 18 && B.IDS.every((id) => [1, 2, 3].every((n) => B94.EP[id + '_' + n])), '個人の話：18対象×3話＝54話（ID は「人_番号」）');
  const PAIRS = Object.values(B94.PAIRS); const want = [['lina', 'kazuto'], ['kyle', 'mina'], ['mina', 'iris'], ['gald', 'ganes'], ['seris', 'io'], ['lucia', 'sophia'], ['nagi', 'iris'], ['sophia', 'mochipoyo'], ['ponta', 'io'], ['lina', 'gald'], ['kyle', 'ord'], ['lina', 'aster'], ['kyle', 'elna'], ['ganes', 'io'], ['lucia', 'mochipoyo'], ['ord', 'kazuto'], ['nagi', 'ponta'], ['aster', 'ponta'], ['seris', 'mochipoyo'], ['elna', 'ord'], ['aster', 'elna']];
  T(PAIRS.length === 21 && want.every((p) => PAIRS.some((q) => (q.a === p[0] && q.b === p[1]) || (q.a === p[1] && q.b === p[0]))), '関係の話：指示書の21組がすべてある');
  const pc = {}; PAIRS.forEach((p) => { pc[p.a] = (pc[p.a] || 0) + 1; pc[p.b] = (pc[p.b] || 0) + 1; }); T(IDS.concat(['ponta']).every((id) => pc[id] >= 2), '全仲間（ポン太を含む17）に関係の話が2つ以上（' + IDS.concat(['ponta']).map((id) => id + ':' + (pc[id] || 0)).join(' ') + '）');
  const keeps = new Set(), memSet = new Set(), memUse = new Set(), speakers = new Set(), emos = new Set(), quests = new Set(), regions = new Set(), badKind = [];
  const KINDS = ['n', 's', 'a', 'h', 'x', 'c', 'if', 'p', 'cam', 'fade', 'sfx', 'mem', 'keep', 'opt'];   // v9.4.1 x（仲間以外の人）・fade・sfx
  const scanText = (t) => String(t).replace(/\{m:([a-z0-9_]+)/g, (_, k) => { memUse.add(k); return ''; });
  scenes().forEach((sc) => {
    [sc.cond].concat([]).forEach(function q(c) { if (!c) return; if (c.q) c.q.forEach((x) => quests.add(x)); if (c.any) c.any.forEach(q); if (c.not) q(c.not); });
    if (sc.place) sc.place.regions.forEach((r) => regions.add(r));
    walk(sc.steps.concat(sc.resume || []), (s) => {
      if (KINDS.indexOf(s[0]) < 0) badKind.push(sc.id + ':' + s[0]);
      if (s[0] === 'keep') keeps.add(s[1]);
      if (s[0] === 's' || s[0] === 'a') { speakers.add(s[1]); if (s[3]) emos.add(s[3]); }
      if (s[0] === 'h' && s[2]) emos.add(s[2]);
      if (s[0] === 'opt') { if (s[1].keep) keeps.add(s[1].keep); if (s[1].mem) Object.keys(s[1].mem).forEach((k) => memSet.add(k)); scanText(s[1].t); if (s[1].last) scanText(s[1].last); }
      if (s[0] === 'mem') Object.keys(s[1]).forEach((k) => memSet.add(k));
      if (s[0] === 'if') { const c = s[1]; (function q(c) { if (!c) return; if (c.mem) Object.keys(c.mem).forEach((k) => memUse.add(k)); if (c.memHas) c.memHas.forEach((k) => memUse.add(k)); if (c.not) q(c.not); if (c.any) c.any.forEach(q); })(c); }
      if (s[0] === 'n' || s[0] === 's' || s[0] === 'a' || s[0] === 'h') [].concat(s[0] === 's' || s[0] === 'a' ? s[2] : s[1]).forEach(scanText);
    });
  });
  Object.values(B94.KEEP).forEach((k) => scanText(k.desc)); Object.values(B94.PROFILE).forEach((p) => { scanText(p.epilogue || ''); scanText(p.likes || ''); });
  Object.values(B94.CHAT).forEach((c) => JSON.stringify(c).replace(/\{m:([a-z0-9_]+)/g, (_, k) => { memUse.add(k); }));
  T(badKind.length === 0, '手順の種類はすべて Bonds.play が知っているもの' + (badKind.length ? '：' + badKind.slice(0, 3).join(' ') : ''));
  T([...keeps].every((k) => B94.KEEP[k]), '記念品の ID はすべて KEEP にある（' + keeps.size + '種）');
  T([...memUse].every((k) => memSet.has(k)), '話の中で使う「選択の記憶」のキーは、どこかの選択で必ず記録される（' + memUse.size + '種）' + ([...memUse].filter((k) => !memSet.has(k)).join(' ')));
  T([...speakers].every((id) => B.IDS.indexOf(id) >= 0), '話し手はすべて仲間の ID（' + speakers.size + '人）');
  T([...emos].every((e) => B.EMOS.indexOf(e) >= 0) && B.EMOS.every((e) => emos.has(e)), '気持ちの10種（喜び・悲しみ・怒り・驚き・戸惑い・照れ・不安・安心・決意・親しみ）をすべて使い、それ以外はない');
  T([...quests].every((q) => w.QUESTS[q]), '条件に使うクエストはすべて既存のもの（' + [...quests].join(' ') + '）');
  const regAll = new Set(Object.keys(w.MAP_DEFS).map((m) => { try { return w.Nav.regionOf(m); } catch (e) { return null; } })); T([...regions].every((r) => regAll.has(r)), '場所の決まった話の地域は、実在する地域（' + [...regions].join(' ') + '）');
  T(IDS.concat(['ponta', 'hero']).every((id) => B94.PROFILE[id] && B94.PROFILE[id].stages.length === 4 && B94.PROFILE[id].epilogue), '人物の記録：18人とも、絆の呼び名4段階とエンディングの一文がある');
  T(IDS.concat(['ponta']).every((id) => { const c = B94.CHAT[id]; return c && ['daily', 'food', 'region', 'battle', 'others', 'post'].every((k) => c[k]) && c.daily.length >= 3 && c.food.length >= 2 && c.battle.length >= 2; }), '日常会話：17人とも7種類の話題（雑談3・食べ物と趣味2・地域・戦い2・ほかの仲間・クリア後）');

  console.log('-- B 守る設定');
  T(w.COMPANIONS.mochipoyo.name === '謎のタイムトラベラーM' && w.COMPANIONS.kazuto.job === 'warrior' && w.COMPANIONS.kazuto.statBonus && w.COMPANIONS.kazuto.statBonus.mp, 'M の表示名・カズトの職業（戦士）と MP の上乗せは変えていない');
  T(IDS.every((id) => w.COMPANIONS[id]) && w.Combat.PET && w.Combat.PET.id === 'ponta', '仲間の ID 16 とポン太（別枠）はそのまま');
  const mText = scenes().filter((s) => s.who === 'mochipoyo' || s.a === 'mochipoyo' || s.b === 'mochipoyo').map((s) => JSON.stringify(s.steps)).join('') + JSON.stringify(B94.CHAT.mochipoyo) + JSON.stringify(B94.PROFILE.mochipoyo);
  T(!/もちぽよ|創設|ギルド|伝承|門下|千年前/.test(mText), 'M の話に「伝承のもちぽよ・創設者」と同じ人だと決める言葉がない');
  T(/金色の短い髪/.test(B94.PROFILE.mochipoyo.intro) && /PC/.test(B94.PROFILE.mochipoyo.intro) && /ドローン/.test(B94.PROFILE.mochipoyo.intro), 'M の紹介：2035年・金髪のショート・PC・ドローン');
  const pontaSays = []; scenes().forEach((sc) => walk(sc.steps, (s) => { if ((s[0] === 's') && s[1] === 'ponta') pontaSays.push(sc.id); })); T(pontaSays.length === 0, 'ポン太は人の言葉で話さない（台詞 s が一つもない。しぐさ a だけ）');
  T(!/二本足|立ち上が|しゃべっ|言った。「/.test(JSON.stringify(B94.EP.ponta_1.steps) + JSON.stringify(B94.EP.ponta_2.steps) + JSON.stringify(B94.EP.ponta_3.steps)), 'ポン太の話に、二本足で立つ・話すなどの描写がない');
  const heroLines = []; scenes().forEach((sc) => walk(sc.steps, (s) => { if (s[0] === 'h') heroLines.push(...[].concat(s[1])); if (s[0] === 'opt' && /^「/.test(s[1].t)) heroLines.push(s[1].t); }));
  T(heroLines.length > 50 && heroLines.every((t) => !/僕|俺|私|わたし|あたし|ぼく|おれ|わし|うち/.test(t)), '主人公の台詞（' + heroLines.length + '）に一人称がない（性別を決めない）');
  T(heroLines.every((t) => !/だぜ|だわ|かしら|わよ|のよ/.test(t)), '主人公の台詞に、性別を感じさせる語尾がない');
  T(B94.EP.hero_2.cond.any.length === 2 && JSON.stringify(B94.EP.hero_2.steps).indexOf('s3121_mio_letter') >= 0, '主人公の第2話：母の手紙のあと（手紙のない旧い旅は別の文）');

  console.log('-- C セーブ');
  T(d.bonds && d.bonds.v === 1 && typeof d.bonds.seen === 'object', '新しいゲーム：d.bonds の初期値');
  const old = JSON.parse(JSON.stringify(d)); delete old.bonds; const before = JSON.stringify(old); const mg = State.migrate(JSON.parse(before)); const after = JSON.parse(JSON.stringify(mg)); delete after.bonds; delete after.version;
  const b0 = JSON.parse(before); delete b0.version;
  T(mg.bonds && mg.bonds.v === 1 && JSON.stringify(after) === JSON.stringify(b0), '旧セーブ（bonds なし）：bonds だけ足し、ほかの項目は変えない');
  const broken = JSON.parse(before); broken.bonds = { seen: 'x', mem: null, hist: { lina: 'x' }, keep: [], camp: 5 }; const mb = State.migrate(broken); T(typeof mb.bonds.seen === 'object' && typeof mb.bonds.mem === 'object' && Array.isArray(mb.bonds.hist.lina) && !Array.isArray(mb.bonds.keep) && mb.bonds.camp === null, '壊れた bonds：形を直して読み込める');
  const headState = require('child_process').execSync('git -C ' + ROOT + ' show 6b4d2a9856a7ea7beecf654a89d40dd025b97a8d:js/rpg/state.js', { encoding: 'utf8' });
  const keyLines = headState.split('\n').filter((l) => /KEY_PREFIX|LEGACY_KEY|NORMAL_PREFIX|mtq-3d|mtq-rpg/.test(l));
  T(keyLines.length > 0 && keyLines.every((l) => src('js/rpg/state.js').indexOf(l) >= 0), 'セーブの置き場所（LocalStorage のキー）の行は基準コミットと同じ（' + keyLines.length + '行）');
  T(src('js/rpg/state.js').indexOf("bonds: { v: 1, seen: {}, later: {}, mem: {}, last: {}, hist: {}, keep: {}, chat: {}, heard: {}, post: {}, camp: null }") >= 0 && !/KEY_PREFIX\s*=.*bonds/.test(src('js/rpg/state.js')), 'state.js の変更は初期値と ensure だけ');

  console.log('-- D 解放の順番・条件・場所');
  stubWin(); joinAll(d); B.ensure();
  T(B.epState(B94.EP.lina_1) === 'ready' && B.epState(B94.EP.lina_2) === 'locked' && B.epState(B94.EP.lina_3) === 'locked', 'リーナ：加入直後は第1話だけ（第2話は第1話のあと）');
  d.bonds.seen.lina_1 = 1; T(B.epState(B94.EP.lina_2) === 'locked', '第1話を見ても、診療所のクエスト（lina_clinic）の前は第2話はまだ');
  d.quests.lina_clinic = { state: 'done' }; T(B.epState(B94.EP.lina_2) === 'ready', '診療所のクエストのあと、第2話が見られる');
  d.quests.gald_reunion = { state: 'done' }; d.bonds.seen.gald_1 = 1; World.map = { id: 'poyo_village', def: { kind: 'town' }, name: 'ポヨ村' };
  T(B.epState(B94.EP.gald_2) === 'away' && B.readyEpisodes('gald').length === 0 && B.awayEpisodes('gald').length === 1, '場所の決まった話（ガルド第2話）は、ヴェルムの外では「その場所で見られる」（away）');
  World.map = { id: 'verum_town', def: { kind: 'town' }, name: 'ヴェルム' }; T(B.epState(B94.EP.gald_2) === 'ready', 'ヴェルム（グラニア）に行くと見られる');
  const p1 = B94.PAIRS.pair_gald_ganes; const g = d.companions.ganes; delete d.companions.ganes; T(B.pairState(p1) === 'locked' && B.epState(B94.EP.gald_2) === 'ready', 'ガネスが未加入なら「ガルド×ガネス」は保留。ガルドの個人の話は止まらない'); d.companions.ganes = g;
  T(B.pairState(p1) === 'ready', '二人とも加入していれば関係の話が見られる');
  T(scenes().filter((s) => s.who).every((ep) => !JSON.stringify(ep.cond || {}).match(/pair_/)), '個人の話の条件に、関係の話を使っていない');
  T(B.stage('lina') === 1 && /お茶を淹れ合う/.test(B.stageLabel('lina')), '絆の段階は見た話の数（リーナ：1段階＝「' + B.stageLabel('lina') + '」）');

  console.log('-- E 再生（記録・先送り・二度起きない）');
  d.bonds = B.defaults(); B.ensure(); LOG = []; CHOICES = [];
  PICK = (opts) => opts.findIndex((o) => /今日はやめておく/.test(o)); let r = await B.play(B94.EP.lina_1, {});
  T(r.later && !d.bonds.seen.lina_1 && d.bonds.later.lina_1 === 1 && B.epState(B94.EP.lina_1) === 'ready', '「今日はやめておく」：話は見たことにならず、あとでまた見られる');
  LOG = []; PICK = (opts) => Math.max(0, opts.findIndex((o) => /リーナの分/.test(o))); r = await B.play(B94.EP.lina_1, {});
  T(r.done && d.bonds.seen.lina_1 && !d.bonds.later.lina_1 && /この前は、話の途中だった/.test(allText()), '次に話すと「この前は途中だった」から始まり、最後まで見ると記録される');
  T(d.bonds.mem.lina_sweet === 'りんごのタルト' && d.bonds.last.lina === 'りんごのタルトの話をした' && d.bonds.hist.lina.length === 1, '小さな選択（焼き菓子）と「最後に選んだこと」を記録');
  T(B.readyEpisodes('lina').every((e) => e.id !== 'lina_1'), '見た話は、もう「新しい話」に出ない（二度起きない）');
  T(LOG.some((l) => l.emo === 'surprise') && LOG.some((l) => l.portrait), '台詞に気持ち（emo）と立ち絵がつく');
  d.quests.main_8 = { state: 'done' }; d.bonds.seen.lina_2 = 1; LOG = []; PICK = () => 0; r = await B.play(B94.EP.lina_3, {});
  T(/りんごのタルト/.test(allText()) && d.bonds.keep.lina && d.bonds.keep.lina.indexOf('lina_wrapper') >= 0, '第1話で選んだ焼き菓子が第3話に戻ってくる・記念品を記録');
  T(B.keepsakes('lina')[0].desc.indexOf('りんごのタルト') >= 0, '記念品の説明にも、選んだ焼き菓子が入る');

  console.log('-- F 思い出の再生は何も変えない');
  d.gold = 1234; d.inventory.herb = 3; const snap = JSON.stringify(d); LOG = []; PICK = (opts) => opts.length - 1;
  r = await B.play(B94.EP.lina_3, { replay: true, noCam: true }); await B.play(B94.EP.lina_1, { replay: true, noCam: true });
  T(JSON.stringify(d) === snap, '再生（リーナ第3話・第1話を別の選択で）のあと、セーブの中身は1文字も変わらない（アイテム・経験値・フラグ・絆の記録）');
  T(/りんごのタルト/.test(allText()), '再生でも、記録してある選択（焼き菓子）が話に出る');

  console.log('-- G 日常会話');
  d.bonds.chat = {}; const seenTopics = []; for (let i = 0; i < 7; i++) { LOG = []; const t = await B.chat('kyle'); seenTopics.push(t); }
  T(new Set(seenTopics).size >= 4 && seenTopics[0] !== seenTopics[1], '話しかけるたびに話題が変わる（' + seenTopics.join('→') + '）');
  T(B.nextChat('kyle') && LOG.length > 0 && LOG.every((l) => !/\{/.test(l.text)), '日常会話の文に差し込みの残りがない');
  d.bonds.chat = {}; const before2 = JSON.stringify(B.chatCandidates('kyle').others); d.bonds.seen.pair_kyle_mina = 1; const after2 = B.chatCandidates('kyle').others;
  T(JSON.stringify(after2) !== before2 && /正直すぎる/.test(JSON.stringify(after2[0])), '関係の話（カイル×ミナ）のあと、カイルの「ほかの仲間の話」の先頭が変わる');
  World.map = { id: 'kalion_city', def: { kind: 'town' }, name: 'カリオン' }; T(/トビ/.test(JSON.stringify(B.chatCandidates('elna').region)), '地域の話：カリオンではエルナがトビの話をする');
  T(!B.chatCandidates('lina').post, 'クリア前は「旅のあとの話」は出ない'); d.flags.game_cleared = true; T(B.chatCandidates('lina').post && B.nextChat('lina').topic === 'post', 'クリア後は「旅のあとの話」が最初に出る'); d.flags.game_cleared = false;

  console.log('-- H 話せる場所・メニュー・宿・酒場・エンディング');
  World.map = { id: 'iron_mine_1', def: { kind: 'dungeon' }, name: '鉱山' }; d.bonds.camp = null; T(!B.safeHere(), 'ダンジョンでは話せない'); B.markCamp(); T(B.safeHere(), 'テントを張った直後は、その場で話せる'); d.steps = (d.steps || 0) + 100; T(!B.safeHere(), '歩いて離れると、また話せない');
  World.map = { id: 'verum_inn', def: { kind: 'interior' }, name: '宿' }; T(B.safeHere(), '宿・建物の中では話せる');
  d.flags.s3121_prologue_phase = 'raid'; T(!B.safeHere(), 'プロローグ（導入）の最中は話せない（本編に割り込まない）'); d.flags.s3121_prologue_phase = 'done';
  const ent = Menu.entries(); T(ent.party.some((e) => e.label === '仲間と話す') && ent.party.some((e) => e.label === '仲間の思い出'), 'メニュー（パーティ）に「仲間と話す」「仲間の思い出」');
  T(/BondsUI\.afterInn/.test(src('js/ui/services.js')) && /tool === 'talk'/.test(src('js/ui/services.js')), '宿に泊まったあと・酒場の編成画面から話せる');
  T(/Bonds\.epilogueLines/.test(src('js/data/finale.js')), 'エンディング（それぞれの未来）のあとに、絆の一文を足す');
  ['lina', 'kyle', 'mina'].forEach((id) => [1, 2, 3].forEach((n) => { d.bonds.seen[id + '_' + n] = 1; })); d.bonds.mem.mina_name = '値段のない展示室';
  const ep = B.epilogueLines(); T(ep.length === 3 && ep.some((l) => /値段のない展示室/.test(l)) && ep.some((l) => /りんごのタルト/.test(l)), 'エンディングの一文は、3話すべて見た仲間だけ（選択が戻ってくる）');
  T(Menu.open.toString().indexOf('_afterClose') >= 0, '「仲間と話す」の話は、メニューを閉じてから再生（3D のカメラが見えるように）');

  console.log('-- I すべての話を、すべての選び方で最後まで');
  let runs = 0, errs = [], leftovers = [];
  for (const sc of scenes()) {
    for (const strat of [0, 1, 2, 'last']) {
      d.bonds = B.defaults(); B.ensure(); LOG = []; PICK = (opts) => { const nn = opts.length; if (strat === 'last') return nn - 1; const i = Math.min(strat, nn - 1); return /今日はやめておく|今日はそっとしておく/.test(opts[i]) && nn > 1 ? 0 : i; };
      try { await B.play(sc, {}); runs++; } catch (e) { errs.push(sc.id + ':' + e.message); }
      const bad = LOG.filter((l) => /\{|undefined|null|NaN/.test(l.text)); if (bad.length) leftovers.push(sc.id + '：' + bad[0].text);
    }
  }
  T(errs.length === 0 && runs === scenes().length * 4, 'すべての話（' + scenes().length + '）× 4通りの選び方で最後まで再生できる（' + runs + '回）' + (errs.length ? '：' + errs.slice(0, 2).join(' / ') : ''));
  T(leftovers.length === 0, '表示した文に {…}・undefined などの残りがない' + (leftovers.length ? '：' + leftovers.slice(0, 2).join(' / ') : ''));

  console.log('-- J 文の点検');
  const choiceCount = scenes().reduce((n, sc) => { let c = 0; walk(sc.steps, (s) => { if (s[0] === 'c') c++; }); return n + c; }, 0);
  T(scenes().every((sc) => { let c = 0; walk(sc.steps, (s) => { if (s[0] === 'c') c++; }); return c >= 1; }), 'どの話にも、主人公が選ぶ場面が1つ以上ある（合計 ' + choiceCount + '）');
  const lineCount = scenes().reduce((n, sc) => { let c = 0; walk(sc.steps, (s) => { if (s[0] === 's' || s[0] === 'n' || s[0] === 'a' || s[0] === 'h') c += [].concat(s[0] === 's' || s[0] === 'a' ? s[2] : s[1]).length; }); return n + c; }, 0);
  console.log('    文の数（話と関係の話）：' + lineCount);
  const thin = scenes().filter((sc) => { let c = 0; walk(sc.steps, (s) => { if (s[0] === 's' || s[0] === 'n' || s[0] === 'a' || s[0] === 'h') c++; }); return c < 8; });
  T(thin.length === 0, 'どの話も、場面（地の文・台詞・しぐさ）が8つ以上ある' + (thin.length ? '：' + thin.map((x) => x.id).join(' ') : ''));
  restoreWin();
  console.log('\n結果：OK ' + okN + ' / NG ' + ng.length + (ng.length ? '\nNG：' + ng.join('\n    ') : ''));
  process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
