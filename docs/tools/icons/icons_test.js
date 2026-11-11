// v9.5 装備・道具・オーパーツの絵の確かめ（jsdom。実機・実ブラウザではない。画像の読み込みと見た目は browser/icons_browser.js）
//   node docs/tools/icons/icons_test.js [2d]
//   A ID の照合  B 絵の URL（2D／3D・一覧／詳細・PNG・版）  C 起動時に絵を読まない  D Win.list・Win.choice（行の操作・エスケープ・絵のない一覧は今までと同じ）
//   E 画面ごと（どうぐ・詳細・そうび・候補・比較・パーティ・図鑑・店・カジノ・戦闘・結果・オーパーツ・ボス固有・鍛え直し・供え物）
//   F 表示だけ（セーブ・ITEMS を変えない）  G 売買・使用・装備の前後  H 旧セーブ（v9.4 より前の版 6b4d2a9 のゲームで作ったクリア済みのセーブ。docs/tools/rpg94/fixtures/old_cleared.json）
const path = require('path'); const fs = require('fs'); const vm = require('vm'); const load = require(path.resolve(__dirname, '../v78/load78.js'));
const ROOT = path.resolve(__dirname, '../../..') + '/'; const FIX = path.resolve(__dirname, '../rpg94/fixtures') + '/';
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const doc = w.document;
const { Engine: E, State, World, Win, Menu, Services, ItemIcons: II } = w; const ITEMS = w.ITEMS;
let okN = 0; const ng = []; const T = (c, m) => { if (c) okN++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAN = w.ITEM_ICON_MANIFEST.entries;
let LISTS = [], CHOICES = [], PANELS = [], LISTQ = [], CHOICEQ = [];
const realList = Win.list, realChoice = Win.choice, realPanel = Win.panel;
function stub() {
  Win.list = async (rows, opts) => { LISTS.push({ rows, opts }); const f = LISTQ.shift(); return f === undefined ? -1 : (typeof f === 'function' ? f(rows, opts) : f); };
  Win.choice = async (q, o, x) => { CHOICES.push({ q, o, x }); const f = CHOICEQ.shift(); return f === undefined ? o.length - 1 : (typeof f === 'function' ? f(o, q) : f); };
  Win.panel = async (html, opts) => { PANELS.push({ html, opts }); return 0; };
  Win.message = async () => { }; Win.sleep = async () => { }; Win.toast = () => { };
}
function real() { Win.list = realList; Win.choice = realChoice; Win.panel = realPanel; }
function fresh() { State.newGame('テスト', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; return d; }
const icoIn = (html) => [...String(html).matchAll(/data-item-icon="([^"]+)"/g)].map((m) => m[1]);
(async () => {
  try { E.Input.init(); } catch (e) { }
  if (w.Audio) { w.Audio.sfx = () => { }; w.Audio.playJingle = () => -1; }
  w.MochiQuest && w.MochiQuest.boot && w.MochiQuest.boot(); await sleep(200);
  console.log('== ' + (two ? '2D 版' : '3D 版と同じ読み込み') + '　読み込みのエラー ' + A.errors.length);
  T(A.errors.length === 0, '読み込みのエラーなし');

  console.log('-- A ID の照合');
  const cov = II.coverage(w.ITEMS, w.OOPARTS);
  const nItems = Object.keys(ITEMS).length, nOo = (w.OOPARTS || []).length;
  T(cov.expected === nItems + nOo, 'ItemIcons.coverage(ITEMS, OOPARTS)：対象 ' + cov.expected + '（ITEMS ' + nItems + '・OOPARTS ' + nOo + '）・一致 ' + cov.matched + '・絵なし ' + cov.missing.length);
  console.log('    絵のない ID：' + (cov.missing.join(', ') || 'なし'));
  T(cov.missing.every((id) => ITEMS[id] && !MAN[id]) && cov.missing.every((id) => /\bOoparts\.REWARDS\b|eq\(/.test(fs.readFileSync(ROOT + 'js/rpg/ooparts.js', 'utf8')) && fs.readFileSync(ROOT + 'js/rpg/ooparts.js', 'utf8').indexOf("'" + id + "'") >= 0), '絵のない ID は、js/rpg/ooparts.js が起動時に足すオーパーツの礼の品だけ（素材の一覧にない）');
  const nameDiff = Object.keys(ITEMS).filter((id) => MAN[id] && MAN[id].name !== ITEMS[id].name).concat((w.OOPARTS || []).filter((o) => MAN[o.id] && MAN[o.id].name !== o.name).map((o) => o.id));
  T(nameDiff.length === 0, '名前が違う ID はない' + (nameDiff.length ? '：' + nameDiff.join(' ') : ''));
  const reserved = Object.keys(MAN).filter((k) => MAN[k].namespace === 'reserved');
  T(reserved.length === 6 && reserved.every((id) => !ITEMS[id]), '予約の 6 件（' + reserved.join(' ') + '）は ITEMS に作っていない（店・戦闘・図鑑に出ない）');
  T(Object.keys(MAN).filter((k) => MAN[k].namespace === 'items').every((id) => ITEMS[id]) && Object.keys(MAN).filter((k) => MAN[k].namespace === 'ooparts').every((id) => (w.OOPARTS || []).some((o) => o.id === id)), '素材の 559＋100 件は、すべていまのゲームにある（削除された ID はない）');
  const acc = Object.keys(ITEMS).filter((id) => ITEMS[id].type === 'acc');
  T(acc.length > 0 && acc.every((id) => ITEMS[id].cat === 'armor'), '装飾品はゲーム上 cat=armor・type=acc のまま（' + acc.length + '件）');

  console.log('-- B 絵の URL');
  function ctxAt(href) { const c = { URL, location: { href } }; c.window = c; vm.createContext(c); for (const p of ['js/data/item-icon-manifest.js', 'js/ui/item-icons.js']) vm.runInContext(fs.readFileSync(ROOT + p, 'utf8'), c, { filename: p }); return c; }
  const v = encodeURIComponent(w.ITEM_ICON_MANIFEST.artVersion);
  const cases = [['https://ex.invalid/repo/index.html', 'https://ex.invalid/repo/'], ['https://ex.invalid/repo/', 'https://ex.invalid/repo/'], ['https://ex.invalid/repo/3d/index.html', 'https://ex.invalid/repo/'], ['https://ex.invalid/repo/3d/', 'https://ex.invalid/repo/'], ['https://ex.invalid/repo/3d', 'https://ex.invalid/repo/'], ['https://raw.githack.com/o/r/483fd5f/3d/index.html?nosw', 'https://raw.githack.com/o/r/483fd5f/']];
  const bad = cases.filter(([href, root]) => ctxAt(href).ItemIcons.url('wooden_sword', 48, false) !== root + 'assets/item-icons/webp128/wooden_sword.webp?v=' + v);
  T(bad.length === 0, '2D は ./assets/item-icons/、3D（3d/ の直下のページ）は ../assets/item-icons/。サブディレクトリのまま・先頭のスラッシュなし（' + cases.length + ' 通り）' + (bad.length ? '：' + bad.map((b) => b[0]).join(' ') : ''));
  const c3 = ctxAt('https://ex.invalid/repo/3d/index.html');
  T(/webp256\/potion\.webp/.test(c3.ItemIcons.url('potion', 160, false)) && /png256\/potion\.png/.test(c3.ItemIcons.url('potion', 48, true)) && c3.ItemIcons.url('constructor', 48) === null && c3.ItemIcons.url('nope', 48) === null, '一覧（48px）は webp128、詳細（160px）は webp256、代わりは png256。対応表にない ID・constructor は null');
  const h48 = II.html('wooden_sword', { size: 48 }), hd = II.detailHtml('wooden_sword');
  T(/loading="lazy"/.test(h48) && !/fetchpriority/.test(h48) && /webp128/.test(h48) && /loading="eager"/.test(hd) && /fetchpriority="high"/.test(hd) && /webp256/.test(hd) && /data-png-fallback="[^"]*png256\/wooden_sword\.png/.test(hd), '一覧の絵は遅延読み込み、選んだ詳細の絵だけ先に読む（fetchpriority）。どちらも PNG の代わりを持つ');
  T(/aria-hidden="true"/.test(h48) && !/tabindex|onclick/.test(h48 + hd) && /tqi--missing/.test(II.html('nope')) && /<span class="tqi-fallback"><\/span>/.test(II.html('nope')) && /\.tqi-fallback::before\s*\{\s*content:\s*"\?"/.test(fs.readFileSync(ROOT + 'styles/item-icons.css', 'utf8')), '絵は飾り（aria-hidden・tabindex やクリックなし）。対応表にない ID は「？」の枠（印は CSS の ::before）');

  console.log('-- C 起動時');
  fresh(); World.start(); await sleep(50); World.busy = false;
  T(doc.querySelectorAll('img.tqi-img').length === 0, '起動して地図に出た時点で、絵の img は 1 つもない（全 665 点を最初に読まない）');
  const swSrc = fs.readFileSync(ROOT + 'sw.js', 'utf8'); T(!/item-icons/.test(swSrc), 'Service Worker に絵の一括の事前保存を足していない');

  console.log('-- D Win.list・Win.choice');
  real(); doc.querySelectorAll('#ui > *').forEach((n) => n.remove());
  let p = Win.list([{ label: '<b>名</b>', right: '×1', sub: '説明&', itemId: 'potion' }, { label: 'はずす' }, { label: '無効', disabled: true, itemId: 'wooden_sword' }], { title: 't' });
  await sleep(5); let L = doc.querySelector('#ui .rw-list:last-child') || [...doc.querySelectorAll('.rw-list')].pop(); let rows = L.querySelectorAll('.rw-item');
  T(rows[0].classList.contains('has-icon') && rows[0].firstElementChild.classList.contains('tqi') && rows[0].querySelector('.l').innerHTML === '&lt;b&gt;名&lt;/b&gt;' && rows[0].querySelector('.s').innerHTML === '説明&amp;' && !rows[1].querySelector('.tqi') && rows[2].getAttribute('aria-disabled') === 'true' && rows[2].querySelector('.tqi'), 'itemId の行だけ先頭に絵。ラベル・説明のエスケープ、無効の行はそのまま');
  T([...rows].every((r, i) => r.getAttribute('data-i') === String(i) && r.getAttribute('role') === 'option') && rows[0].getAttribute('aria-selected') === 'true' && L.querySelector('.rw-items').classList.contains('has-icons'), 'data-i・role・aria-selected はそのまま');
  T(rows[0].textContent === '<b>名</b>×1説明&' && rows[2].textContent === '無効', '絵を足しても、行の文字（textContent）は名前・右の値・説明だけ（「?」などを混ぜない）');
  rows[1].click(); T(await p === 1, '行をクリックすると、今までどおりその番号を返す（絵を含む行全体が操作の対象）');
  const plain = [{ label: 'a', right: 'b', sub: 'c' }, { label: 'd' }]; const keepII = w.ItemIcons;
  p = Win.list(plain, { title: 'x' }); await sleep(5); const h1 = [...doc.querySelectorAll('.rw-list')].pop().querySelector('.rw-items').outerHTML; [...doc.querySelectorAll('.rw-close')].pop().click(); await p;
  w.ItemIcons = undefined; p = Win.list(plain, { title: 'x' }); await sleep(5); const h2 = [...doc.querySelectorAll('.rw-list')].pop().querySelector('.rw-items').outerHTML; [...doc.querySelectorAll('.rw-close')].pop().click(); await p; w.ItemIcons = keepII;
  T(h1 === h2 && !/tqi|has-icon/.test(h1), 'itemId のない一覧は、絵の仕組みがないときと 1 文字も同じ（関係のない一覧の作り・高さは変わらない）');
  p = Win.choice('どれ？', ['A → A2', 'やめる'], { itemIds: ['dow_greatsword_2'] }); await sleep(5); const opts = [...doc.querySelectorAll('.rw-choice')].pop().querySelectorAll('.rw-opt');
  T(opts[0].querySelector('.tqi[data-item-icon="dow_greatsword_2"]') && !opts[1].querySelector('.tqi') && opts[0].textContent.indexOf('A → A2') >= 0, 'Win.choice の opts.itemIds：その選択肢だけ絵'); opts[1].click(); T(await p === 1, '選択肢の返り値はそのまま');

  console.log('-- E 画面ごと');
  stub(); let d = fresh(); ['potion', 'bread_baguette', 'porkbits_don', 'forest_key', 'steel_sword', 'stoploss_shield', 'qm_trophy_001'].forEach((id) => State.addItem(id, 2)); State.joinCompanion('lina');
  LISTS = []; await Menu.items({}); let r0 = LISTS[0];
  const invIds = Object.keys(d.inventory).filter((id) => ITEMS[id]);
  T(r0.rows.length === invIds.length && r0.rows.every((x) => x.itemId && invIds.indexOf(x.itemId) >= 0) && r0.rows.every((x) => x.right === '×' + d.inventory[x.itemId]), 'どうぐ：すべての行に、その品の ID（所持数の表示は今までどおり）');
  const det = Menu.itemDetail('porkbits_don');
  T(icoIn(det)[0] === 'porkbits_don' && /tqi--detail/.test(det) && /伝説のポークビッツ丼/.test(det) && /所持 2/.test(det) && /it-detail has-art/.test(det), 'どうぐの詳細：大きい絵の隣に名前・所持数・効果');
  const detS = Menu.itemDetail('steel_sword'); T(/攻撃\+/.test(detS) && /装備できる職業/.test(detS) && icoIn(detS)[0] === 'steel_sword' && (detS.match(/tqi--detail/g) || []).length === 1, '装備の詳細：性能・装備できる職業・比較はそのまま、大きい絵は 1 つだけ');
  d.inventory = {}; LISTS = []; await Menu.items({}); T(LISTS[0].rows.length === 1 && LISTS[0].rows[0].disabled && !LISTS[0].rows[0].itemId, '所持品なし：「持ち物はない」の行（絵なし）');
  d = fresh(); State.joinCompanion('lina'); ['steel_sword', 'wooden_sword', 'stoploss_shield'].forEach((id) => State.addItem(id, 1)); const hero = State.partyActors()[0]; Services.equipItem(hero, 'wooden_sword');
  LISTS = []; LISTQ = [-1]; await Menu.equip(hero); const eqRows = LISTS[0].rows;
  T(eqRows[0].itemId === 'wooden_sword' && eqRows.slice(1, 5).every((x) => !x.itemId) && !eqRows[5].itemId, 'そうび：装備している枠だけ絵（空き枠・おすすめ候補の行は絵なし）');
  LISTS = []; LISTQ = [-1]; await Menu.equipSlot(hero, 'weapon', null); const cand = LISTS[0].rows;
  T(cand.filter((x) => x.label === 'はずす').length === 1 && !cand.filter((x) => x.label === 'はずす')[0].itemId && cand.filter((x) => x.itemId).every((x) => Actors_slot(x.itemId) === 'weapon'), '候補：武器の行に絵、「はずす」は絵なし');
  function Actors_slot(id) { return w.Actors.slotOf(id); }
  const cmp = Menu.equipCompareHtml(hero, 'weapon', 'steel_sword'), cmp0 = Menu.equipCompareHtml(hero, 'weapon', null);
  T(icoIn(cmp).join() === 'steel_sword,wooden_sword' && /eq-tbl/.test(cmp) && /class="eq-chg"><span class="eq-up">攻撃 ▲\+/.test(cmp) && icoIn(cmp0).join() === 'wooden_sword' && /eq-none">はずす/.test(cmp0), '比較：変更先の大きい絵の隣に、名前・いまの装備（小さい絵）・変わる能力（はずすは絵なし）。能力の表はそのまま');
  const pe = Menu.partyHtml.equip(hero); T(icoIn(pe).join() === 'wooden_sword' && (pe.match(/pt-eq/g) || []).length === 5, 'パーティの装備：装備している品だけ絵');
  // 図鑑
  LISTS = []; CHOICEQ = [1, -1]; await Menu.encyclopedia();
  const enc = LISTS.filter((x) => x.opts && x.opts.title === 'アイテム図鑑')[0];
  T(enc && enc.rows.filter((x) => x.label === '？？？').every((x) => !x.itemId) && enc.rows.filter((x) => x.label !== '？？？').every((x) => x.itemId && ITEMS[x.itemId].name === x.label) && enc.rows.some((x) => x.itemId === 'steel_sword'), 'アイテム図鑑：知っている行だけ絵。「？？？」の行は名前も絵も出さない');
  // 店
  d = fresh(); d.gold = 100; World.map = World.map || {}; LISTS = []; CHOICEQ = [0, 2]; await Services.shop('item', ['potion', 'porkbits_don']);
  const buy = LISTS[0]; T(buy.rows.map((x) => x.itemId).join() === 'potion,porkbits_don' && buy.rows[1].disabled === (d.gold < ITEMS.porkbits_don.price) && /G$/.test(buy.rows[0].right), '店（買う）：品の行に絵。値段・買えない行はそのまま');
  const bi = buy.opts.info(0); T(icoIn(bi)[0] === 'potion' && /ia-pair/.test(bi), '買う画面の詳細（compareInfo）に大きい絵');
  T(Services.compareInfo(ITEMS.steel_sword) === Services.compareInfo(ITEMS.steel_sword, null) && !/tqi/.test(Services.compareInfo(ITEMS.steel_sword)), 'compareInfo を 1 つの引数で呼ぶところ（どうぐの詳細など）は今までどおり');
  State.addItem('potion', 3); LISTS = []; CHOICEQ = [1, 2]; await Services.shop('item', ['potion']); const sell = LISTS[0];
  T(sell && sell.rows.every((x) => x.itemId && ITEMS[x.itemId].price > 0), '店（売る）：品の行に絵');
  // カジノ
  if (w.CasinoUI && w.CasinoUI.prizes) { LISTS = []; await w.CasinoUI.prizes([{ item: 'potion', cost: 10 }, { item: 'steel_sword', cost: 100 }]); const cz = LISTS[0]; T(cz.rows.map((x) => x.itemId).join() === 'potion,steel_sword' && icoIn(cz.opts.info(1))[0] === 'steel_sword', '景品交換所：景品の行と詳細に絵'); }
  // 戦闘：どうぐ・結果
  const bsrc = fs.readFileSync(ROOT + 'js/ui/battle.js', 'utf8');
  T(/ITEMS\[id\]\.cat === 'consumable' && !ITEMS\[id\]\.fieldOnly && !ITEMS\[id\]\.growItem/.test(bsrc) && /desc, itemId: id \}/.test(bsrc), '戦闘の「どうぐ」：使える道具の絞り込みはそのまま、行に絵（ソースで点検）');
  // オーパーツ
  if (w.OopartsUI) {
    const O = w.Ooparts; const all = O.list().filter(O.placed); d = fresh(); const st = O.state(); const first = all[0];
    st.found = st.found || {}; if (O.mark) O.mark(first.id); else st.found[first.id] = 1;
    PANELS = []; await w.OopartsUI.list(); const ph = PANELS[0].html; const shown = icoIn(ph);
    T(O.has(first.id) && shown.indexOf(first.id) >= 0 && shown.filter((id) => /^op_/.test(id)).every((id) => O.has(id)), 'オーパーツ：見つけた遺物だけ絵（' + shown.filter((id) => /^op_/.test(id)).length + '）');
    T(all.filter((e) => !O.has(e.id)).every((e) => ph.indexOf(e.name) < 0) && O.REWARDS.every((R) => shown.indexOf(R.item) < 0), 'まだの遺物は名前も絵も出さない。礼の品も、名前が見えるまで絵を出さない');
  }
  // ボス固有装備の一覧
  if (w.BossGear && w.BossGear.listPanel) { LISTS = []; await w.BossGear.listPanel(); const bl = LISTS[0]; T(bl && bl.rows.every((x) => x.label === '？？？' ? !x.itemId : !!x.itemId), 'ボス固有装備の一覧：知っている行だけ絵'); }
  // 鍛え直し・供え物（ソースで点検：既存の選択肢にだけ itemIds を渡す）
  T(/itemIds: owned\.map\(function \(id\) \{ return id \+ '_2'; \}\)/.test(fs.readFileSync(ROOT + 'js/data/dragon.js', 'utf8')) && /\{ itemIds: inv \}/.test(fs.readFileSync(ROOT + 'js/data/expand-a6.js', 'utf8')), '鍛え直し（鍛えたあとの武器）・供え物（持ち物）の選択肢に絵');
  const res = { drops: { potion: 2 } }; const rsrc = bsrc.match(/var dropHtml = [\s\S]*?\.join\(''\)/); T(!!rsrc && /has-icon/.test(rsrc[0]), '戦闘の結果：落とした品の行に絵（res.drops のキー＝ID）');

  console.log('-- F 表示だけ');
  const itemsSnap = JSON.stringify(ITEMS); d = fresh(); ['potion', 'steel_sword'].forEach((id) => State.addItem(id, 2)); const saveSnap = JSON.stringify(State.data);
  LISTS = []; await Menu.items({}); Menu.itemDetail('potion'); Menu.equipCompareHtml(State.partyActors()[0], 'weapon', 'steel_sword'); Menu.partyHtml.equip(State.partyActors()[0]);
  T(JSON.stringify(State.data) === saveSnap && !/tqi|item-icons|webp/.test(JSON.stringify(State.data)) && JSON.stringify(ITEMS) === itemsSnap, '画面を開いても、セーブ（State.data）と ITEMS は 1 文字も変わらない（絵の URL・読み込みの状態を書かない）');
  const keys = []; for (let i = 0; i < w.localStorage.length; i++) keys.push(w.localStorage.key(i)); T(!keys.some((k) => /icon/i.test(k)), 'LocalStorage に絵のためのキーを足していない（' + keys.length + '個）');

  console.log('-- G 売買・使用・装備の前後');
  d = fresh(); d.gold = 1000; const pp = ITEMS.potion.price; const merch = State.partyActors().some((a) => a.job === 'merchant');
  LISTS = []; CHOICEQ = [0, 1, 2]; LISTQ = [0]; await Services.shop('item', ['potion']);   // 買う → ポーション → 2つ → やめる
  T(d.inventory.potion === 2 && d.gold === 1000 - (merch ? Math.round(pp * 0.9) : pp) * 2, 'ポーションを2つ買う：所持 2・お金 −' + pp * 2 + 'G（今までどおり）');
  CHOICEQ = [1, 0, 2]; LISTQ = [0]; await Services.shop('item', ['potion']);   // 売る → 1つ売る
  T(d.inventory.potion === 1 && d.gold === 1000 - pp * 2 + Math.floor(pp / 2), '1つ売る：所持 1・お金 +' + Math.floor(pp / 2) + 'G');
  const a0 = State.partyActors()[0]; const s0 = w.Actors.stats(a0); a0.hp = 1; LISTQ = [0]; await Menu.useItem('potion');
  T((d.inventory.potion || 0) === 0 && a0.hp === Math.min(s0.maxHp, 1 + (ITEMS.potion.effect.hp || 0)), '使う：所持 0・HP が ' + (ITEMS.potion.effect.hp || 0) + ' 回復');
  State.addItem('steel_sword', 1); const atk0 = w.Actors.stats(a0).atk; const cur0 = a0.equip.weapon; Services.equipItem(a0, 'steel_sword');
  T(a0.equip.weapon === 'steel_sword' && w.Actors.stats(a0).atk === atk0 - (cur0 ? ITEMS[cur0].atk || 0 : 0) + ITEMS.steel_sword.atk && !d.inventory.steel_sword, '装備を変える：攻撃力が鋼の剣の分だけ変わり、持ち物から減る');

  console.log('-- H 旧セーブ（2 つ：参照コミット 483fd5f のゲームで作った遊んでいる途中のセーブ／v9.4 より前の版 6b4d2a9 のゲームで作ったクリア済みのセーブ）');
  const OLDS = [[path.resolve(__dirname, 'fixtures') + '/save_483fd5f.json', '483fd5f のセーブ（docs/tools/icons/fixtures/save_483fd5f.json）'], [FIX + 'old_cleared.json', '6b4d2a9 のクリア済みのセーブ（docs/tools/rpg94/fixtures/old_cleared.json）']];
  for (const [file, lab] of OLDS) {
    // jsdom の中の LocalStorage だけで読み込む（元のファイルは書き換えない）
    const old = JSON.parse(fs.readFileSync(file, 'utf8')); w.localStorage.setItem('mtq-rpg-v2-slot-3', JSON.stringify(old)); d = State.load(3); State.data = d; World.start(); await sleep(20); World.busy = false;
    const before = JSON.stringify(d); LISTS = []; await Menu.items({}); const oi = Object.keys(d.inventory).filter((id) => ITEMS[id]);
    T(LISTS[0].rows.length === oi.length && LISTS[0].rows.every((x) => x.right === '×' + d.inventory[x.itemId] && w.ItemIcons.has(x.itemId)), '旧セーブ ' + lab + '：持ち物 ' + oi.length + ' 種がそのまま並び、所持数も同じ・すべてに絵');
    const hh = State.partyActors()[0]; LISTS = []; LISTQ = [-1]; await Menu.equip(hh); const er = LISTS[0].rows;
    T(['weapon', 'armor', 'shield', 'head', 'acc'].every((sl, k) => (hh.equip[sl] ? er[k].right === ITEMS[hh.equip[sl]].name && er[k].itemId === hh.equip[sl] : er[k].right === '―' && !er[k].itemId)), '旧セーブ：装備の枠も同じ（装備している枠だけ絵：' + ['weapon', 'armor', 'shield', 'head', 'acc'].map((sl) => hh.equip[sl] || '-').join(',') + '）');
    T(JSON.stringify(State.data) === before, '旧セーブ：見ただけでは中身は変わらない');
    // そのセーブのまま、買う・売る・使う・装備の前後を比べる
    const om = State.partyActors().some((a) => a.job === 'merchant'), buyP = om ? Math.round(pp * 0.9) : pp, sellP = Math.floor(pp / 2);
    d.gold = Math.max(d.gold, 1000); const og = d.gold, op0 = d.inventory.potion || 0;
    LISTS = []; CHOICEQ = [0, 1, 2]; LISTQ = [0]; await Services.shop('item', ['potion']);   // 買う → ポーション → 2つ → やめる
    T((d.inventory.potion || 0) === op0 + 2 && d.gold === og - buyP * 2, '旧セーブ：ポーションを2つ買う（所持 ' + op0 + '→' + (d.inventory.potion || 0) + '・お金 −' + buyP * 2 + 'G）');
    CHOICEQ = [1, 0, 2]; LISTQ = [(rows) => rows.findIndex((r) => r.itemId === 'potion')]; await Services.shop('item', ['potion']);   // 売る → ポーションを 1つ
    T((d.inventory.potion || 0) === op0 + 1 && d.gold === og - buyP * 2 + sellP, '旧セーブ：1つ売る（所持 ' + (d.inventory.potion || 0) + '・お金 +' + sellP + 'G）');
    const oa = State.partyActors()[0], os = w.Actors.stats(oa); oa.hp = 1; LISTQ = [0]; await Menu.useItem('potion');
    T((d.inventory.potion || 0) === op0 && oa.hp === Math.min(os.maxHp, 1 + (ITEMS.potion.effect.hp || 0)), '旧セーブ：使う（所持 ' + op0 + '・HP 1→' + oa.hp + '）');
    State.addItem('steel_sword', 1); const ow = oa.equip.weapon, owN = ow ? (d.inventory[ow] || 0) : 0, oss = d.inventory.steel_sword || 0;
    const prev = Menu.equipCompareHtml(oa, 'weapon', 'steel_sword').match(/<td>攻撃<\/td><td>(\d+)<\/td><td>→<\/td><td><b>(\d+)<\/b>/);
    Services.equipItem(oa, 'steel_sword');
    T(prev && oa.equip.weapon === 'steel_sword' && w.Actors.stats(oa).atk === +prev[2] && (d.inventory.steel_sword || 0) === oss - 1 && (!ow || (d.inventory[ow] || 0) === owN + 1), '旧セーブ：装備を変える（攻撃 ' + (prev ? prev[1] + '→' + prev[2] : '?') + '＝変える前の比較の表と同じ。鋼の剣は持ち物から減り、' + (ow ? ITEMS[ow].name + 'は持ち物に戻る' : '前は素手') + '）');
    T(!/tqi|item-icons|webp/.test(JSON.stringify(State.data)), '旧セーブ：売買・使用・装備のあとも、セーブに絵の URL・読み込みの状態は入らない');
  }

  console.log('\n結果：OK ' + okN + ' / NG ' + ng.length + (ng.length ? '\nNG：' + ng.join('\n    ') : ''));
  process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
