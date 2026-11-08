// v8.8 Phase 1 共通UI の確かめ（jsdom。実機・実ブラウザではない）：node ui88_test.js [2d]
//  1-A タップの決まり・上の窓だけが反応・名前入力のやめる・中断の確認の初期カーソル・一覧の位置の記憶
//  1-B メインメニューの分類とよく使うボタン  1-C どうぐ（お気に入り・最近）・使う相手・そうびの比較とおすすめ  1-D 設定
const load = require('../v78/load78.js');
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const doc = w.document;
const { Engine: E, State, World, Win, Menu, ITEMS, Actors } = w; const Input = E.Input;
let ok = 0; const ng = []; const T = (c, m) => { if (c) ok++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const frames = async (n) => { for (let i = 0; i < n; i++) await sleep(17); };
const top = () => doc.getElementById('ui').lastElementChild;
const click = (n) => n.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const settle = (p) => { const o = { done: false, v: undefined }; p.then((v) => { o.done = true; o.v = v; }); return o; };
function clean() { doc.querySelectorAll('#ui > *').forEach((n) => n.remove()); E.scenes = E.scenes.filter((s) => !s.overlay); World.busy = false; }
(async () => {
  try { Input.init(); } catch (e) { }
  w.MochiQuest && w.MochiQuest.boot && w.MochiQuest.boot(); await frames(5); clean();
  State.newGame('テスト', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); await frames(4); clean();
  console.log('== ' + (two ? '2D 版' : '3D 版と同じ読み込み') + '　読み込みのエラー ' + A.errors.length);

  console.log('-- 1-A タップの決まり');
  let s = settle(Win.list([{ label: 'あ' }, { label: 'い' }, { label: 'う' }], { title: 'ふつう' })); await frames(1);
  click(top().querySelectorAll('.rw-item')[1]); await frames(1); T(s.done && s.v === 1, 'ふつうの一覧：未選択の行を 1 回タップで実行（1）');
  s = settle(Win.list([{ label: 'あ' }, { label: 'い', disabled: true }, { label: 'う' }], { title: 'ふつう' })); await frames(1);
  click(top().querySelectorAll('.rw-item')[1]); await frames(1); T(!s.done && top().querySelectorAll('.rw-item')[1].classList.contains('cur'), '使えない行はタップしても実行しない（選ぶだけ）');
  Input.press('ok'); await frames(2); T(!s.done, '使えない行で Enter でも実行しない'); Input.press('cancel'); await frames(2); T(s.done && s.v === -1, 'Esc で -1');
  s = settle(Win.list([{ label: 'あ' }, { label: 'い' }], { title: '詳細', info: (k) => '<b class="inf">詳細' + k + '</b>', okLabel: '使う' })); await frames(1);
  let L = top(); click(L.querySelectorAll('.rw-item')[1]); await frames(1);
  T(!s.done && L.querySelector('.rw-info').textContent === '詳細1', '詳細つきの一覧：1 回目のタップは選んで詳細を出すだけ');
  T(L.querySelector('.rw-ok') && /使う/.test(L.querySelector('.rw-ok').textContent) && /もう一度タップ/.test(L.querySelector('.rw-hint').textContent), '［使う］ボタンと「もう一度タップか［使う］で決定」の説明が出る');
  click(L.querySelector('.rw-ok')); await frames(1); T(s.done && s.v === 1, '［使う］で実行（1）');
  s = settle(Win.list([{ label: 'あ' }, { label: 'い' }], { info: () => 'x' })); await frames(1); L = top(); click(L.querySelectorAll('.rw-item')[1]); click(L.querySelectorAll('.rw-item')[1]); await frames(1); T(s.done && s.v === 1, '同じ行をもう一度タップでも実行（今までどおり）');
  s = settle(Win.list([{ label: 'あ' }, { label: 'い' }], { info: () => 'x' })); await frames(1); L = top(); click(L.querySelectorAll('.rw-item')[0]); await frames(1); T(!s.done, '詳細つきの一覧：最初から選ばれている行でも、1 回目のタップは選ぶだけ'); click(L.querySelectorAll('.rw-item')[0]); await frames(1); T(s.done && s.v === 0, '2 回目のタップで実行');
  s = settle(Win.list([{ label: 'あ', disabled: true }], { info: () => 'x' })); await frames(1); L = top(); T(L.querySelector('.rw-ok').classList.contains('disabled'), '使えない行では［決定］ボタンが押せない見た目'); click(L.querySelector('.rw-ok')); await frames(1); T(!s.done, '使えない行では［決定］ボタンでも実行しない'); Input.press('cancel'); await frames(2);
  // 上の窓だけ反応
  s = settle(Win.list([{ label: 'あ' }, { label: 'い' }], { title: '下の窓' })); await frames(1); const below = top();
  const c2 = settle(Win.choice('上の窓', ['はい', 'いいえ'])); await frames(1);
  click(below.querySelectorAll('.rw-item')[1]); click(below.querySelector('.rw-close')); await frames(1); T(!s.done && !c2.done, '上に選択肢の窓があるあいだ、下の一覧の行・✕は反応しない');
  click(top().querySelectorAll('.rw-opt')[0]); await frames(1); T(c2.done && c2.v === 0, '上の窓は 1 回タップで決まる');
  click(below.querySelectorAll('.rw-item')[1]); await frames(1); T(s.done && s.v === 1, '上の窓が閉じたら下の一覧が反応する');
  T(below.getAttribute('role') === 'dialog' && below.querySelector('.rw-items').getAttribute('role') === 'listbox', '窓に読み上げ用の役割（dialog・listbox）');
  // 名前入力
  let p = settle(Win.prompt('名前', '勇者', 8)); await frames(1); click(top().querySelector('.rw-btn.cancel')); await frames(1); T(p.done && p.v === null, '名前入力：［やめる］で null（中止）');
  p = settle(Win.prompt('名前', '勇者', 8)); await frames(1); Input.press('cancel'); await frames(2); T(p.done && p.v === null, '名前入力：Esc（窓の外）で null');
  p = settle(Win.prompt('名前', '勇者', 8)); await frames(1); top().querySelector('input').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await frames(1); T(p.done && p.v === null, '名前入力：入力欄で Esc でも null');
  p = settle(Win.prompt('名前', '勇者', 8)); await frames(1); click(top().querySelector('.rw-btn.ok')); await frames(1); T(p.done && p.v === '', '名前入力：空のまま決定は ""（中止と区別）');
  p = settle(Win.prompt('名前', '勇者', 8)); await frames(1); top().querySelector('input').value = 'もち'; top().querySelector('input').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await frames(1); T(p.done && p.v === 'もち', '名前入力：Enter で入力した名前');
  const ng0 = State.newGame; let made = 0; State.newGame = function () { made++; return ng0.apply(this, arguments); };
  const tn = settle(w.Title.newGame()); await frames(2); click(top().querySelector('.rw-btn.cancel')); await frames(2); T(tn.done && tn.v === false && made === 0, 'はじめから → 名前入力で［やめる］：ゲームを作らずにタイトルへ戻る（「勇者」を勝手に作らない）'); State.newGame = ng0; clean();
  State.data = d;
  // 中断の確認
  let q = settle(Win.confirmQuit('修行')); await frames(1); T(top().querySelectorAll('.rw-opt')[1].classList.contains('cur'), '中断の確認：最初のカーソルは「続ける」'); Input.press('ok'); await frames(2); T(q.done && q.v === false, '中断の確認：そのまま Enter は「続ける」');
  q = settle(Win.confirmQuit('修行')); await frames(1); Input.press('cancel'); await frames(2); T(q.done && q.v === false, '中断の確認：Esc は「続ける」');
  q = settle(Win.confirmQuit('修行')); await frames(1); click(top().querySelectorAll('.rw-opt')[0]); await frames(1); T(q.done && q.v === true, '中断の確認：「中断する」を選ぶと中断');
  // 位置の記憶
  const many = Array.from({ length: 30 }, (_, k) => ({ label: '行' + k }));
  s = settle(Win.list(many, { key: 't:mem' })); await frames(1); for (let k = 0; k < 7; k++) { Input.press('down'); await frames(1); } Input.press('cancel'); await frames(2);
  s = settle(Win.list(many, { key: 't:mem' })); await frames(1); T(top().querySelectorAll('.rw-item')[7].classList.contains('cur'), '同じ key の一覧を開き直すとカーソル位置が戻る（7）'); Input.press('cancel'); await frames(2);
  s = settle(Win.list(many, { key: 't:mem', initial: 2 })); await frames(1); T(top().querySelectorAll('.rw-item')[2].classList.contains('cur'), 'initial を渡したときはそちらが先'); Input.press('cancel'); await frames(2);

  console.log('-- 1-B メインメニュー');
  clean(); World.enterMap('poyo_village', 24, 30, 'up'); await frames(3); clean();
  const mo = settle(Menu.open()); await frames(3); L = top();
  T(L.classList.contains('main-menu') && [...L.querySelectorAll('.rw-tab')].map((x) => x.firstChild.textContent).join('/') === '冒険/パーティ/どうぐ/トレード/システム', 'メインメニュー：分類のタブ 冒険／パーティ／どうぐ／トレード／システム');
  T([...L.querySelectorAll('.rw-tool')].map((x) => x.textContent).join('/') === 'どうぐ/そうび/目的地/セーブ', 'よく使う 4 つ（どうぐ・そうび・目的地・セーブ）のボタン＝1 回で開く');
  const advLabels = [...L.querySelectorAll('.rw-item .l')].map((x) => x.textContent); T(['クエスト', '次の目的地', 'ファストトラベル', '図鑑'].every((x) => advLabels.includes(x)), '冒険：クエスト・次の目的地・ファストトラベル・図鑑（' + advLabels.join('・') + '）');
  click([...L.querySelectorAll('.rw-tab')][1]); await frames(3); L = top(); const pl = [...L.querySelectorAll('.rw-item .l')].map((x) => x.textContent); T(['ステータス', 'なかま', 'そうび', 'じゅもん・とくぎ'].every((x) => pl.includes(x)), 'パーティ：ステータス・なかま・そうび・じゅもん・とくぎ');
  click([...L.querySelectorAll('.rw-tab')][4]); await frames(3); L = top(); const sl = [...L.querySelectorAll('.rw-item .l')].map((x) => x.textContent); T(['セーブ', '設定', 'データ管理', 'タイトルに戻る'].every((x) => sl.includes(x)), 'システム：セーブ・設定・データ管理・タイトルに戻る');
  click([...L.querySelectorAll('.rw-tab')][2]); await frames(3); L = top(); const il = [...L.querySelectorAll('.rw-item .l')].map((x) => x.textContent); T(['どうぐ', '回復の道具', '最近使った・お気に入り', '重要アイテム'].every((x) => il.includes(x)), 'どうぐ：どうぐ・回復の道具・最近使った・お気に入り・重要アイテム');
  click([...L.querySelectorAll('.rw-tab')][3]); await frames(3); L = top(); const tl = [...L.querySelectorAll('.rw-item .l')].map((x) => x.textContent); T(['トレード修行', 'トレード成績・振り返り'].every((x) => tl.includes(x)), 'トレード：トレード修行・トレード成績・振り返り');
  // ショートカット：どうぐ
  click([...L.querySelectorAll('.rw-tool')][0]); await frames(3); T(top().classList.contains('items-menu'), '［どうぐ］ボタン 1 回でどうぐの一覧'); Input.press('cancel'); await frames(3);
  T(top().classList.contains('main-menu') && top().querySelector('.rw-tab.cur').firstChild.textContent === 'トレード', 'どうぐを閉じるとメニューへ戻り、前の分類（トレード）のまま');
  Input.press('cancel'); await frames(3); T(mo.done && !World.busy, 'Esc でメニューを閉じる');

  console.log('-- 1-C どうぐ・そうび');
  State.addItem('herb', 3); State.addItem('magic_water', 1); const hero = d.hero; const hs = Actors.stats(hero); hero.hp = 1;
  let mi = settle(Menu.items()); await frames(2); L = top(); const herbRow = [...L.querySelectorAll('.rw-item')].findIndex((x) => /薬草/.test(x.textContent));
  click(L.querySelectorAll('.rw-item')[herbRow]); await frames(1); click(L.querySelector('.rw-act[data-act="fav"]')); await frames(3);
  T(Menu.ui().favItems.herb === true, '［★お気に入り］で State.data.ui.favItems に印');
  L = top(); T([...L.querySelectorAll('.rw-item .l')].some((x) => /★ 薬草/.test(x.textContent)), '一覧の名前に ★');
  const row2 = [...L.querySelectorAll('.rw-item')].findIndex((x) => /薬草/.test(x.textContent)); click(L.querySelectorAll('.rw-item')[row2]); await frames(1); click(L.querySelector('.rw-ok')); await frames(3);
  L = top(); T(/誰に使う/.test(L.querySelector('.rw-title').textContent) && /HP あと/.test(L.textContent), '使う相手の一覧に「HP あと○」（足りない量）');
  click(L.querySelector('.rw-item.cur')); await frames(3); if (top() && top().classList.contains('rw-msg')) { Input.press('ok'); await frames(2); }
  T(hero.hp > 1 && Menu.ui().recentItems[0] === 'herb', '使ったら「最近使った」に入る（実際に使えたときだけ）');
  Input.press('cancel'); await frames(3); clean();
  mi = settle(Menu.items({ fav: true })); await frames(2); L = top(); T(/薬草/.test(L.querySelector('.rw-item').textContent) && L.querySelector('.rw-tool.on') && /最近/.test(L.querySelector('.rw-item').textContent), '「最近使った・お気に入り」：最近使った薬草が先頭'); Input.press('cancel'); await frames(2); clean();
  // 回復の相手：いちばん減っている人にカーソル
  State.joinCompanion && State.joinCompanion('lina'); d.party = Object.keys(d.companions).length ? ['hero', Object.keys(d.companions)[0]] : ['hero']; const pa = State.partyActors(); pa.forEach((a) => Actors.fullHeal(a)); if (pa[1]) { pa[1].hp = 1; }
  const pk = settle(Menu.pickActor('テスト', false, 'hp')); await frames(1); T(!pa[1] || top().querySelectorAll('.rw-item')[1].classList.contains('cur'), '使う相手：いちばん HP が減っている仲間に最初のカーソル'); Input.press('cancel'); await frames(2);
  // そうびの比較
  State.addItem('iron_sword', 1); const before = JSON.stringify(hero.equip);
  const rec = Menu.recommend(hero, 'atk'); T(JSON.stringify(hero.equip) === before && rec.length === 5, 'おすすめ候補の計算は装備を変えない（5 枠）');
  T(rec[0].best === 'iron_sword' || rec[0].better === false, '攻撃重視の武器の候補：' + (rec[0].best || 'なし'));
  const html = Menu.equipCompareHtml(hero, 'weapon', 'iron_sword'); T(/いま/.test(html) && /装備後/.test(html) && /攻撃/.test(html) && /素早さ/.test(html) && /魔力/.test(html) && /HP/.test(html), '比較：HP・MP・攻撃・防御・素早さ・魔力の「いま → 装備後」');
  T(/装備できる職業/.test(html), '比較：装備できる職業を数値と分けて出す');
  if (ITEMS.bu_trend_compass) { const hb = Menu.equipCompareHtml(hero, 'acc', 'bu_trend_compass'); T(/bu-detail/.test(hb) && /初回撃破報酬/.test(hb), 'ボス固有装備は固有効果の欄（初回撃破報酬・入手先）も出す'); }
  const eq = settle(Menu.equip()); await frames(2); click(top().querySelector('.rw-item')); await frames(2); L = top();
  T(/おすすめ候補を見る/.test(L.textContent), 'そうびの枠の一覧に「おすすめ候補を見る」'); click(L.querySelectorAll('.rw-item')[0]); await frames(2); L = top();
  T(L.classList.contains('eq-list') && L.querySelector('.rw-ok') && /装備する/.test(L.querySelector('.rw-ok').textContent), '候補の一覧：詳細つき・［装備する］ボタン');
  const swRow = [...L.querySelectorAll('.rw-item')].findIndex((x) => /鉄の剣/.test(x.textContent)); click(L.querySelectorAll('.rw-item')[swRow]); await frames(1);
  T(hero.equip.weapon !== 'iron_sword' && /装備後/.test(L.querySelector('.rw-info').textContent), '候補を 1 回タップ：比較を見るだけで、まだ装備しない');
  click(L.querySelector('.rw-ok')); await frames(2); T(hero.equip.weapon === 'iron_sword', '［装備する］で装備');
  Input.press('cancel'); await frames(2); Input.press('cancel'); await frames(2); clean();

  console.log('-- 1-D 設定');
  d.settings.bgm = 0.25; const ms = settle(Menu.settings()); await frames(2); L = top();
  T([...L.querySelectorAll('.rw-tab')].map((x) => x.firstChild.textContent).join('/') === '音/表示/操作/戦闘・トレード/データ管理', '設定の分類：音／表示／操作／戦闘・トレード／データ管理');
  const bgmRow = [...L.querySelectorAll('.rw-item')].findIndex((x) => /BGM音量/.test(x.textContent)); T(/25%/.test(L.querySelectorAll('.rw-item')[bgmRow].textContent), '古い値（BGM 25%）をそのまま表示');
  click(L.querySelectorAll('.rw-item')[bgmRow]); await frames(2); const C = top(); const optsT = [...C.querySelectorAll('.rw-opt')].map((x) => x.textContent);
  T(C.classList.contains('rw-choice') && optsT.some((x) => /● 25%/.test(x)) && optsT.length >= 11, '値の一覧から選ぶ（いまの値に●、0〜100%＋古い 25%）');
  click(C.querySelectorAll('.rw-opt')[optsT.findIndex((x) => /70%/.test(x))]); await frames(2); T(Math.abs(d.settings.bgm - 0.7) < 1e-9, 'BGM音量を 70% に（押すたびに回らない）');
  L = top(); click([...L.querySelectorAll('.rw-tab')][1]); await frames(2); L = top(); const fsRow = [...L.querySelectorAll('.rw-item')].findIndex((x) => /文字の大きさ/.test(x.textContent)); T(fsRow >= 0 && /標準/.test(L.querySelectorAll('.rw-item')[fsRow].textContent), '表示：文字の大きさ（標準）');
  click(L.querySelectorAll('.rw-item')[fsRow]); await frames(2); click([...top().querySelectorAll('.rw-opt')].find((x) => /大きい/.test(x.textContent))); await frames(2);
  T(d.settings.uiScale === 'large' && doc.documentElement.classList.contains('ui-large'), '文字の大きさ「大きい」：html に ui-large');
  L = top(); const bgRow = [...L.querySelectorAll('.rw-item')].findIndex((x) => /戦闘背景/.test(x.textContent)); click(L.querySelectorAll('.rw-item')[bgRow]); await frames(2); click([...top().querySelectorAll('.rw-opt')].find((x) => /自動/.test(x.textContent))); await frames(2); T(d.settings.battleBg === undefined, '戦闘背景「自動」は今までどおり値を消す');
  Input.press('cancel'); await frames(2); T(ms.done, '設定を閉じる');
  // 旧セーブ：ui がなくても動く
  const old = JSON.parse(JSON.stringify(d)); delete old.ui; delete old.settings.uiScale; const mg = State.migrate(old); T(mg.ui && Array.isArray(mg.ui.recentItems) && mg.settings.uiScale === undefined, '旧セーブ：ui の初期値を補う／文字の大きさは未設定のまま（標準として扱う）');
  d.settings.uiScale = 'normal'; Menu.applyUiScale();
  console.log('結果: ' + ok + ' OK / ' + ng.length + ' NG ' + JSON.stringify(ng) + '　ページのエラー ' + A.errors.length);
  process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
