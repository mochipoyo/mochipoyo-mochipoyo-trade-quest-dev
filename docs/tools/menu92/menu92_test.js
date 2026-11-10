// v9.2 メニューの使い勝手の確かめ（jsdom。実機・実ブラウザではない。見た目の大きさはブラウザの menu92_browser.js で測る）
//   node docs/tools/menu92/menu92_test.js [2d]
//   A 入力（Q／E）  B 一覧の「仲間の帯」  C そうび（枠の一覧・候補の一覧で仲間を切り替え）  D ステータス  E じゅもん・とくぎ
//   F なかま（そうびを変える）  G どうぐの窓（一律の大きさ・詳細の欄）  H スマホ縦画面の窓の高さ  I セーブ・既存の動き
const path = require('path'); const fs = require('fs'); const load = require(path.resolve(__dirname, '../v78/load78.js'));
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const doc = w.document;
const { Engine: E, State, World, Win, Menu, ITEMS, Actors } = w; const Input = E.Input;
let okN = 0; const ng = []; const T = (c, m) => { if (c) okN++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const frames = async (n) => { for (let i = 0; i < n; i++) await sleep(17); };
const top = () => doc.getElementById('ui').lastElementChild;
const click = (n) => n && n.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const settle = (p) => { const o = { done: false, v: undefined }; p.then((v) => { o.done = true; o.v = v; }); return o; };
const key = (k, mod) => doc.dispatchEvent(new w.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, mod || {})));
const keyup = (k) => doc.dispatchEvent(new w.KeyboardEvent('keyup', { key: k, bubbles: true }));
const press = async (k) => { Input.press(k); await frames(2); };
const chips = (n) => [...(n || top()).querySelectorAll('.rw-mem')].map((x) => x.firstChild.textContent);
const curChip = (n) => { const c = (n || top()).querySelector('.rw-mem.cur'); return c ? c.firstChild.textContent : null; };
const curRow = (n) => { const c = (n || top()).querySelector('.rw-item.cur'); return c ? c.textContent : null; };
function clean() { doc.querySelectorAll('#ui > *').forEach((n) => n.remove()); E.scenes = E.scenes.filter((s) => !s.overlay); World.busy = false; }
(async () => {
  try { Input.init(); } catch (e) { }
  w.MochiQuest && w.MochiQuest.boot && w.MochiQuest.boot(); await frames(5); clean();
  State.newGame('テスト', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); await frames(4); clean();
  console.log('== ' + (two ? '2D 版' : '3D 版と同じ読み込み') + '　読み込みのエラー ' + A.errors.length);
  T(A.errors.length === 0, '読み込みのエラーなし');
  ['lina', 'kyle', 'mina'].forEach((id) => State.joinCompanion(id));
  const P = State.partyActors(); const names = P.map((a) => a.name);
  T(P.length === 4 && d.party.join() === 'hero,lina,kyle,mina', '戦闘メンバー 4 人（' + names.join('・') + '）');
  const dataKeys0 = Object.keys(d).sort().join();

  console.log('-- A 入力：Q／E');
  Input.clear(); key('e'); keyup('e'); T(Input.pressed.next === true, 'E キー → next'); Input.clear();
  key('Q'); keyup('Q'); T(Input.pressed.prev === true, 'Q（大文字）→ prev'); Input.clear();
  key('e', { ctrlKey: true }); T(!Input.pressed.next, 'Ctrl＋E はゲームで使わない（ブラウザの操作のまま）'); Input.clear();
  if (w.Audio) w.Audio.sfx = () => { };   // jsdom：キーを押すと音の準備（Audio.unlock）が動くが、jsdom には音の部品がない（ゲームの不具合ではない）
  const src = fs.readFileSync(path.resolve(__dirname, '../../../js/core/engine.js'), 'utf8');
  T(!/PageUp|PageDown/.test(src.split('\n').find((l) => /var map = \{/.test(l)) || ''), 'PageUp／PageDown は割り当てない（ページのスクロールを変えない）');

  console.log('-- B 一覧の「仲間の帯」');
  const ML = { list: [{ label: 'あ', sub: 'Lv1' }, { label: 'い', sub: 'Lv2', dead: true }, { label: 'う' }], cur: 1, arrows: true };
  let s = settle(Win.list([{ label: '1' }, { label: '2' }, { label: '3' }], { title: 'て', members: { list: [{ label: 'ひとり' }], cur: 0, arrows: true } })); await frames(1);
  T(!top().querySelector('.rw-members'), '1 人のときは帯を出さない'); await press('cancel');
  s = settle(Win.list([{ label: '1' }, { label: '2' }, { label: '3' }], { title: 'て', members: ML, initial: 2 })); await frames(1); let L = top();
  T(chips(L).join() === 'あ,い,う' && curChip(L) === 'い' && L.querySelector('.rw-mem.dead') && L.querySelectorAll('.rw-mem-nav').length === 2, '帯：名前・今の仲間・戦闘不能の印・◀▶');
  T(/←→ \/ Q・E/.test(L.querySelector('.rw-mem-key').textContent), '帯にキーの説明（←→ / Q・E）');
  T(L.querySelector('.rw-head').firstElementChild.classList.contains('rw-members'), '帯はタイトルのすぐ下');
  click(L.querySelectorAll('.rw-mem')[2]); await frames(1); T(s.done && s.v.member === 2 && s.v.index === 2, '名前のタップ → { member: 2, index: 今の行 }');
  s = settle(Win.list([{ label: '1' }, { label: '2' }], { title: 'て', members: Object.assign({}, ML, { cur: 0 }) })); await frames(1);
  click(top().querySelector('[data-mnav="-1"]')); await frames(1); T(s.done && s.v.member === 2, '◀ で前へ（先頭から最後へ回る）');
  s = settle(Win.list([{ label: '1' }, { label: '2' }], { title: 'て', members: ML })); await frames(1); await press('next'); T(s.done && s.v.member === 2, 'E（next）で次の仲間');
  s = settle(Win.list([{ label: '1' }, { label: '2' }], { title: 'て', members: ML })); await frames(1); await press('prev'); T(s.done && s.v.member === 0, 'Q（prev）で前の仲間');
  s = settle(Win.list([{ label: '1' }, { label: '2' }], { title: 'て', members: ML })); await frames(1); await press('right'); T(s.done && s.v.member === 2, 'arrows：→ でも次の仲間（タブのない一覧）');
  s = settle(Win.list([{ label: '1' }, { label: '2' }], { title: 'て', members: ML, tabs: [{ label: 'a' }, { label: 'b' }], tab: 0 })); await frames(1); await press('right'); T(s.done && s.v.tab === 1 && s.v.member === undefined, 'タブのある一覧の → はタブのまま（仲間は Q／E）');
  s = settle(Win.list([{ label: '1' }, { label: '2' }], { title: 'て', members: Object.assign({}, ML, { arrows: false }) })); await frames(1); await press('right'); T(!s.done, 'arrows なし：→ では切り替えない'); await press('cancel');
  s = settle(Win.list([{ label: '1' }, { label: '2' }], { title: 'て', members: ML })); await frames(1); L = top();
  const c2 = settle(Win.choice('上の窓', ['はい', 'いいえ'])); await frames(1); click(L.querySelectorAll('.rw-mem')[0]); await frames(1);
  T(!s.done, '上に別の窓があるときは、下の一覧の帯を押しても動かない'); await press('cancel'); await press('cancel'); T(s.done && s.v === -1, 'Esc で -1（今までどおり）');
  s = settle(Win.list([{ label: '1' }, { label: '2' }], { title: 'て' })); await frames(1); await press('next'); T(!s.done, '帯のない一覧では Q／E は何もしない'); await press('cancel');

  console.log('-- C そうび');
  ['iron_sword', 'club', 'leather_armor'].forEach((id) => State.addItem(id, 2));
  let eq = settle(Menu.equip()); await frames(2); L = top();
  T(/装備を変える/.test(L.querySelector('.rw-title').textContent) && L.querySelectorAll('.rw-item').length === 4, '最初に仲間を選ぶ（今までどおり）');
  click(L.querySelectorAll('.rw-item')[0]); await frames(2); L = top();
  T(L.classList.contains('equip-menu') && chips(L).join() === names.join() && curChip(L) === names[0], '枠の一覧の上に仲間の帯（4 人・今は ' + names[0] + '）');
  T(/おすすめ候補を見る/.test(L.textContent), '「おすすめ候補を見る」はそのまま');
  await press('down'); T(/^鎧/.test(curRow()), 'カーソルを「鎧」へ');
  await press('right'); L = top(); T(curChip(L) === names[1] && /リーナの装備/.test(L.querySelector('.rw-title').textContent) && /^鎧/.test(curRow(L)), '→ で次の仲間（' + names[1] + '）。枠のカーソルは「鎧」のまま');
  await press('next'); T(curChip() === names[2] && /^鎧/.test(curRow()), 'E でさらに次（' + names[2] + '）');
  await press('prev'); await press('left'); T(curChip() === names[0], 'Q・← で戻る（' + names[0] + '）');
  click(top().querySelectorAll('.rw-mem')[2]); await frames(2); T(curChip() === names[2] && Menu._member === 'kyle', '名前のタップで ' + names[2] + '（最後に見ていた仲間を覚える）');
  await press('up'); click(top().querySelector('.rw-item.cur')); await frames(2); L = top();
  T(L.classList.contains('eq-list') && L.classList.contains('rw-fixed') && /カイルの武器を選ぶ/.test(L.querySelector('.rw-title').textContent) && curChip(L) === names[2], '候補の一覧：一律の大きさの窓・「カイルの武器を選ぶ」・帯つき');
  const swI = [...L.querySelectorAll('.rw-item')].findIndex((x) => /鉄の剣/.test(x.textContent)); click(L.querySelectorAll('.rw-item')[swI]); await frames(1);
  T(/カイル/.test(L.querySelector('.rw-info').textContent) && /装備後/.test(L.querySelector('.rw-info').textContent), '鉄の剣を選ぶ → カイルの比較');
  await press('right'); L = top();
  T(curChip(L) === names[3] && /ミナの武器を選ぶ/.test(L.querySelector('.rw-title').textContent) && /鉄の剣/.test(curRow(L)) && /ミナ/.test(L.querySelector('.rw-info').textContent), '→ で ' + names[3] + '：同じ枠（武器）・同じ鉄の剣にカーソル・ミナの比較');
  await press('right'); await press('right'); L = top();
  const rowsL = [...L.querySelectorAll('.rw-item')].map((x) => x.textContent); if (!rowsL.some((x) => /棍棒/.test(x)) || rowsL.some((x) => /鉄の剣/.test(x))) console.log('    行：' + rowsL.join(' / '));
  T(curChip(L) === names[1] && /リーナの武器を選ぶ/.test(L.querySelector('.rw-title').textContent) && !rowsL.some((x) => /鉄の剣/.test(x)) && rowsL.some((x) => /棍棒/.test(x)), names[1] + '（僧侶）：鉄の剣は出ない・棍棒が出る（装備できるものだけ）');
  await press('left'); L = top(); T(curChip(L) === names[0] && /鉄の剣/.test(curRow(L)), names[0] + 'へ戻る：リーナで選んでいた棍棒は出ないので、先頭（鉄の剣）にカーソル');
  Input.press('ok'); await frames(3); L = top();
  T(d.hero.equip.weapon === 'iron_sword' && L.classList.contains('equip-menu') && curChip(L) === names[0], 'Enter で ' + names[0] + 'が鉄の剣を装備 → 枠の一覧（' + names[0] + 'のまま）');
  // 装備できるものがない枠：先頭の行は押せない。帯で切り替えはできる
  const inv0 = Object.assign({}, d.inventory); Object.keys(d.inventory).forEach((id) => { if (Actors.slotOf(id) === 'shield') delete d.inventory[id]; });
  const shI = [...L.querySelectorAll('.rw-item')].findIndex((x) => /^盾/.test(x.textContent)); click(L.querySelectorAll('.rw-item')[shI]); await frames(2); L = top();
  const shieldNone = !d.hero.equip.shield;
  T(!shieldNone || (L.classList.contains('eq-list') && L.querySelector('.rw-item.disabled') && /持っていない/.test(L.textContent) && L.querySelector('.rw-ok').classList.contains('disabled') && /切り替えられる/.test(L.querySelector('.rw-info').textContent)), '装備できるものがない：メッセージで戻らず、押せない行と説明（帯で切り替えられる）');
  Input.press('ok'); await frames(2); T(top() === L, '押せない行で Enter でも何も起きない');
  await press('next'); T(top().classList.contains('eq-list') && curChip() === names[1], 'その画面からも仲間を切り替えられる');
  await press('cancel'); L = top(); T(L.classList.contains('equip-menu') && curChip(L) === names[1], 'Esc → 枠の一覧（切り替えた ' + names[1] + 'のまま）');
  Object.assign(d.inventory, inv0);
  await press('cancel'); await frames(2); T(eq.done && Menu._member === 'lina', 'Esc でそうびを閉じる（最後は ' + names[1] + '）');
  eq = settle(Menu.equip()); await frames(2); L = top(); T(/リーナ/.test(curRow(L)), '次にそうびを開くと、仲間を選ぶ一覧のカーソルは最後に見ていた ' + names[1]);
  Input.press('ok'); await frames(2); T(curChip() === names[1], 'Enter で ' + names[1] + 'の枠の一覧'); await press('cancel'); await frames(2); T(eq.done, '閉じる');
  // おすすめ候補（今までどおり）
  eq = settle(Menu.equip(P[0])); await frames(2); L = top(); T(L.classList.contains('equip-menu') && curChip(L) === names[0], 'Menu.equip(仲間)：仲間を選ぶ一覧を飛ばして、その仲間の枠の一覧');
  await press('cancel'); await frames(2); T(eq.done, '閉じる');

  console.log('-- D ステータス');
  let st = settle(Menu.status()); await frames(2); L = top(); T(/ステータスを見る/.test(L.querySelector('.rw-title').textContent) && L.querySelector('.rw-item.cur') && curRow(L).indexOf(State.actor(Menu._member).name) === 0, '最初に仲間を選ぶ（カーソルは最後に見ていた仲間：' + State.actor(Menu._member).name + '）');
  click(L.querySelectorAll('.rw-item')[0]); await frames(2); L = top();
  T(L.classList.contains('status-panel') && curChip(L) === names[0] && /次のレベルまで/.test(L.textContent) && L.querySelector('.stat-grid') && /装備/.test(L.textContent), 'ステータスの画面（帯・能力・次のレベルまで・装備）');
  await press('right'); L = top(); T(L.classList.contains('status-panel') && curChip(L) === names[1] && /リーナ/.test(L.querySelector('.st-body .rw-title').textContent), '→ で ' + names[1] + '（画面を閉じずに）');
  await press('next'); T(curChip() === names[2] && /カイル/.test(top().querySelector('.st-body .rw-title').textContent), 'E で ' + names[2]);
  click(top().querySelectorAll('.rw-mem')[3]); await frames(1); T(curChip() === names[3], '名前のタップで ' + names[3]);
  click(top().querySelector('[data-mnav="1"]')); await frames(1); T(curChip() === names[0], '▶ で最初へ回る');
  await press('left'); await press('left'); T(curChip() === names[2], '← ← で ' + names[2]);
  click(top().querySelector('[data-go="equip"]')); await frames(3); L = top();
  T(L.classList.contains('equip-menu') && curChip(L) === names[2], '［そうびを変える］→ ' + names[2] + 'の枠の一覧（仲間を選び直さない）');
  await press('next'); await press('cancel'); await frames(2); L = top();
  T(L.classList.contains('status-panel') && curChip(L) === names[3], 'そうびで ' + names[3] + 'へ切り替えて閉じる → ステータスへ戻る（' + names[3] + 'のまま）');
  click(L.querySelector('[data-go="skills"]')); await frames(3); L = top();
  T(L.classList.contains('skills-menu') && curChip(L) === names[3] && /ミナの特技/.test(L.querySelector('.rw-title').textContent), '［じゅもん・とくぎ］→ ' + names[3] + 'の特技');
  await press('cancel'); await frames(2); T(top().classList.contains('status-panel'), 'Esc → ステータスへ戻る');
  await press('ok'); await frames(2); T(st.done && !doc.querySelector('#ui .status-panel'), 'Enter でステータスを閉じる（今までどおり）');
  st = settle(Menu.status(P[1])); await frames(2); click(top().querySelector('.rw-close')); await frames(2); T(st.done, '✕ で閉じる');
  st = settle(Menu.status(P[1])); await frames(2); click(top().querySelector('.rw-panel-close')); await frames(2); T(st.done, '［閉じる］で閉じる');

  console.log('-- E じゅもん・とくぎ');
  let sk = settle(Menu.skills(P[0])); await frames(2); L = top();
  T(L.classList.contains('skills-menu') && L.classList.contains('rw-fixed') && L.querySelector('.rw-item.disabled') && /まだ呪文・特技を覚えていない/.test(L.textContent), names[0] + '（特技なし）：メッセージで戻らず「まだ覚えていない」の行（帯で切り替えられる）');
  T(/Q・E/.test(L.querySelector('.rw-mem-key').textContent) && !/←→/.test(L.querySelector('.rw-mem-key').textContent), 'じゅもんの帯のキーは Q・E（←→ は分類のタブ）');
  await press('next'); L = top(); T(curChip(L) === names[1] && L.querySelectorAll('.rw-item:not(.disabled)').length > 0, 'E で ' + names[1] + 'の特技');
  await press('right'); L = top(); const tab1 = L.querySelector('.rw-tab.cur').firstChild.textContent; T(curChip(L) === names[1] && tab1 === '攻撃魔法', '→ は分類のタブ（攻撃魔法）・仲間はそのまま');
  await press('next'); L = top(); T(curChip(L) === names[2] && L.querySelector('.rw-tab.cur').firstChild.textContent === '攻撃魔法', 'E で ' + names[2] + '：分類のタブはそのまま');
  await press('cancel'); await frames(2); T(sk.done, 'Esc で閉じる');

  console.log('-- F なかま');
  let pt = settle(Menu.party()); await frames(2); L = top();
  T(L.classList.contains('party-screen') && L.querySelector('.pt-go') && /そうびを変える/.test(L.querySelector('.pt-go').textContent), 'なかまの画面に［そうびを変える］');
  await press('next'); T(top().querySelector('.pt-row.cur').getAttribute('data-id') === 'lina', 'E（Q／E）でも仲間を切り替え');
  click(top().querySelector('.pt-go')); await frames(3); L = top();
  T(L.classList.contains('equip-menu') && curChip(L) === names[1], '［そうびを変える］→ ' + names[1] + 'の枠の一覧');
  await press('next'); await press('cancel'); await frames(3); L = top();
  T(L.classList.contains('party-screen') && L.querySelector('.pt-row.cur').getAttribute('data-id') === 'kyle', 'そうびで ' + names[2] + 'に切り替えて閉じる → なかまの画面（' + names[2] + 'を選んだまま）');
  Input.press('ok'); await frames(2); T(top().classList.contains('rw-choice'), 'Enter：隊列の変更の窓');
  const rows = [...doc.querySelectorAll('#ui .party-screen .pt-row')]; click(rows.find((r) => r.getAttribute('data-id') === 'mina')); await frames(1);
  T(doc.querySelector('#ui .party-screen .pt-row.cur').getAttribute('data-id') === 'kyle', '隊列の窓を開いている間は、後ろの一覧を押しても選び直さない');
  await press('cancel'); await frames(1); await press('cancel'); await frames(2); T(pt.done, 'Esc で閉じる');

  console.log('-- G どうぐの窓');
  let mi = settle(Menu.items()); await frames(2); L = top();
  T(L.classList.contains('items-menu') && L.classList.contains('rw-fixed') && L.classList.contains('rw-preview') && L.querySelector('.rw-info'), 'どうぐ：一律の大きさの窓（rw-fixed）・詳細の欄');
  await press('cancel'); await frames(2);
  const css = fs.readFileSync(path.resolve(__dirname, '../../../styles.css'), 'utf8');
  T(/\.rw-list\.rw-fixed \{ height: min\(92%, 760px\); \}/.test(css), 'CSS：窓の高さは項目の数によらない（min(92%, 760px)）');
  T(/\.rw-list\.rw-fixed\.rw-preview > \.rw-info \{ flex: 9 1 0; min-height: 0; max-height: none; \}/.test(css) && /\.rw-list\.rw-fixed\.rw-preview > \.rw-items \{ flex: 11 1 0; \}/.test(css), 'CSS：詳細の欄は一覧と高さを分け合う（11：9。以前は 120〜170px までの高さ）');
  T(/body\.m-land \.rw-list\.rw-fixed\.rw-preview \{ display: grid;/.test(css), 'CSS：スマホの横画面は一覧と詳細を横に並べる');

  console.log('-- H スマホ縦画面の窓の高さ（MobileUI.syncTall。jsdom の上で値だけ確かめる）');
  const MU = w.MobileUI; const ui = doc.getElementById('ui'); const act0 = MU.active, lay0 = MU._lay, h0 = ui.style.height;
  MU.active = true; MU._lay = { h: 400, tallH: 600, land: false, fullUi: false }; MU._tall = undefined; ui.style.height = '400px';
  mi = settle(Menu.items()); await frames(2);
  T(ui.style.height === '600px' && doc.body.classList.contains('m-tallui'), 'どうぐを開いたその場で、窓を置ける高さを操作パネルの上まで（400 → 600px）');
  await press('cancel'); await frames(1); MU.syncTall(); T(ui.style.height === '400px' && !doc.body.classList.contains('m-tallui'), '閉じると元の高さ（400px）');
  st = settle(Menu.status(P[0])); await frames(2); T(top().classList.contains('rw-tall') && ui.style.height === '600px', 'ステータスの画面も同じく広げる（rw-tall）'); await press('cancel'); await frames(2); MU.syncTall();
  pt = settle(Menu.party()); await frames(2); T(top().classList.contains('party-screen') && top().classList.contains('rw-tall') && ui.style.height === '600px', 'なかまの画面も同じく広げる（rw-tall）'); await press('cancel'); await frames(2); MU.syncTall(); T(ui.style.height === '400px' && pt.done && st.done, '閉じると元の高さ');
  MU._lay = { h: 390, tallH: 900, land: true, fullUi: false }; MU._tall = undefined; ui.style.height = '390px'; mi = settle(Menu.items()); await frames(2);
  T(ui.style.height === '390px' && !doc.body.classList.contains('m-tallui'), '横画面では高さを変えない（左右の操作パネルのまま）'); await press('cancel'); await frames(1);
  MU.active = act0; MU._lay = lay0; MU._tall = undefined; ui.style.height = h0; doc.body.classList.remove('m-tallui');

  console.log('-- I セーブ・既存の動き');
  T(Object.keys(d).sort().join() === dataKeys0, 'セーブのデータの項目は増えない（最後に見ていた仲間は Menu._member＝遊んでいる間だけ）');
  T(!/_member/.test(JSON.stringify(d)), 'セーブに _member を入れない');
  Input.press('next'); await frames(3); const mo = settle(Menu.open()); await frames(3); T(top() && top().classList.contains('main-menu') && !mo.done, '探索中に押した E が残っていても、メインメニューは普通に開く');
  await press('cancel'); await frames(2); T(mo.done, 'メインメニューを閉じる');
  // ショートカット［そうび］から（仲間を選ぶ → 枠の一覧）
  const mo2 = settle(Menu.open()); await frames(3); click([...top().querySelectorAll('.rw-tool')].find((x) => /そうび/.test(x.textContent))); await frames(2);
  T(/装備を変える/.test(top().querySelector('.rw-title').textContent), 'メインメニューの［そうび］→ 仲間を選ぶ（今までどおり）'); await press('cancel'); await frames(2);
  T(top().classList.contains('main-menu'), 'Esc でメインメニューへ'); await press('cancel'); await frames(2); T(mo2.done, '閉じる');
  const pa = d.party.slice(); d.party = ['hero']; eq = settle(Menu.equip(d.hero)); await frames(2); T(!top().querySelector('.rw-members'), '1 人のときは帯を出さない（そうび）'); await press('cancel'); await frames(2); d.party = pa;

  console.log('\n結果：OK ' + okN + ' / NG ' + ng.length + (ng.length ? '\n' + ng.map((x) => '  - ' + x).join('\n') : ''));
  process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error('CRASH', e && e.stack || e); process.exit(2); });
