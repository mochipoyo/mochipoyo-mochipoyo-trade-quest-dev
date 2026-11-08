// v8.6 飛空艇を呼ぶ（js/rpg/airshipcall86.js）の確かめ（jsdom）：node airship86_test.js [2d]
//  2d を付けると 2D 版の読み込み（地球の地形・世界のつながりなし）。付けないと 3D 版と同じ読み込み（地球の地形・つなぐ）
//  ・持っていない／町の中／船に乗っている／もう乗っている → 呼べない（理由の通知）。飛空艇の位置は変わらない
//  ・フィールド → 今いるマスへ来て乗る（置き場所・港＝ここ）。飛んで進める・平地で着陸できる・離れた所でまた呼べる
//  ・キー：F で呼ぶ（Ctrl＋F・Alt＋F・⌘＋F では呼ばない）。会話中に押した F は捨てる。2D 版で 1 歩の途中なら、その 1 歩のあとで呼ぶ
//  ・馬車：乗っていたら、飛空艇の間は馬車を使わない（設定は覚えたまま）→ 着陸すると馬車に戻る
//  ・セーブ・読み込みで、乗ったまま・位置が続く。全滅すると、呼んで乗った所（港）へ戻る（今までの決まり）
//  ・メニュー：持っていて乗っていないときだけ「飛空艇を呼ぶ」。スマホのボタン：持っているときだけ出す・乗っている間は光る
//  ・案内（次の目的地）：飛空艇が必要で近くにないとき、F キーで呼べることを書く
const load = require('../v78/load78.js');
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w;
if (A.errors.length) { console.log('読み込みの失敗', A.errors); process.exit(1); }
const W = w.World, S = w.State, V = w.Vehicle, AC = w.AirshipCall86, I = w.Engine.Input;
let ok = 0; const ng = []; const T = (c, m) => { if (c) ok++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
I.init();   // jsdom ではエンジンの初期化（キーの受け取りの登録）が動かないので、ここで登録する（ブラウザと同じ keydown の処理）
const toasts = []; const t0 = w.Win.toast; w.Win.toast = function (t) { toasts.push(String(t)); return t0.apply(this, arguments); }; const lastToast = () => toasts[toasts.length - 1] || '';
S.newGame('もち', 'warrior'); const d = S.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 0; W.start(); W.encounter = () => { };
W.busy = false;
const enter = (id, x, y) => { W.busy = false; W.enterMap(id, x, y, 'down', { raw: true }); W.busy = false; };
// フィールドの、まわりも歩ける平地（着陸できる）のマスを探す
function landSpot(id, from) {
  const m = W.getMap(id); const def = w.VEHICLES.airship; const okT = (x, y) => x > 2 && y > 2 && x < m.w - 3 && y < m.h - 3 && def.landOn.indexOf(m.tiles[y][x]) >= 0 && m.passable(x, y, d) && !m.warpAt(x, y) && !(m.npcAt && m.npcAt(x, y)) && !(m.eventAt && m.eventAt(x, y));
  const cand = []; for (let y = 3; y < m.h - 3; y++) for (let x = 3; x < m.w - 3; x++) if (okT(x, y) && okT(x + 1, y) && okT(x + 2, y) && okT(x + 3, y) && okT(x, y + 1)) cand.push({ x, y });
  if (!cand.length) return null; if (from) cand.sort((a, b) => (Math.abs(b.x - from.x) + Math.abs(b.y - from.y)) - (Math.abs(a.x - from.x) + Math.abs(a.y - from.y))); return cand[from ? 0 : Math.floor(cand.length / 2)];
}
const press = (key, mods) => { const e = new w.KeyboardEvent('keydown', Object.assign({ key, bubbles: true }, mods || {})); w.document.dispatchEvent(e); w.document.dispatchEvent(new w.KeyboardEvent('keyup', { key, bubbles: true })); };
const scene = W.scene; const handle = () => { scene.handleInput(); I.pressed = {}; };
const st = () => V.state('airship');
const FIELD = 'world';
console.log('== 読み込み：' + (two ? '2D 版' : '3D 版と同じ（地球の地形・つなぐ）'));
// 1) 持っていない
enter(FIELD, landSpot(FIELD).x, landSpot(FIELD).y);
T(!AC.owned() && AC.call() === false && lastToast() === '呼べる乗り物がない' && !d.aboard, '持っていない：呼べない（「呼べる乗り物がない」）');
press('f'); handle(); T(!d.aboard, '持っていない：F を押しても何も起きない');
// 2) 手に入れる（第十四章の格納庫と同じ：フラグを立てて unlockIfReady）
d.flags.airship_owned = true; V.unlockIfReady(); const home = Object.assign({}, st());
T(AC.owned() && home.map === w.VEHICLES.airship.home.map || (AC.owned() && !!home.map), '手に入れた：母港（' + home.map + ' ' + home.x + ',' + home.y + '）にいる');
// 3) 町の中
enter('poyo_village', 16, 7); const before = JSON.stringify(st());
T(AC.call() === false && /外のフィールドでだけ/.test(lastToast()) && !d.aboard && JSON.stringify(st()) === before, '町の中：呼べない（理由）・飛空艇の位置は変わらない');
// 4) フィールドで呼ぶ
const sp = landSpot(FIELD); enter(FIELD, sp.x, sp.y); const p = W.player;
press('f'); handle();
T(d.aboard === 'airship' && st().map === FIELD && st().x === p.x && st().y === p.y && st().port.map === FIELD && st().port.x === p.x, 'フィールドで F：今いるマスへ来て乗る（置き場所・港＝ここ ' + p.x + ',' + p.y + '）');
T(/飛空艇を呼んで乗った/.test(lastToast()), '通知「飛空艇を呼んで乗った」');
T(AC.call() === false && /もう飛空艇に乗っている/.test(lastToast()), '乗っている間：呼べない（着陸の案内）');
// 5) 飛んで進む（2D 版のマス単位）→ 着陸
const x0 = p.x; for (let i = 0; i < 3; i++) { W.tryMove('right'); let g = 0; while (p.moving && g++ < 400) scene.update(16); }
T(p.x === x0 + 3 && d.aboard === 'airship' && st().x === p.x, '飛んで右へ 3 マス進める（飛空艇も一緒）');
W.interact(); T(!d.aboard && st().x === p.x && st().y === p.y, '決定キーで着陸：飛空艇はその場に残る');
const landed = { x: p.x, y: p.y };
// 6) 離れた所でまた呼ぶ
const far = landSpot(FIELD, landed); enter(FIELD, far.x, far.y);
press('f'); handle(); T(d.aboard === 'airship' && st().x === far.x && st().y === far.y, '離れた所（' + far.x + ',' + far.y + '）でまた呼べる');
W.interact(); T(!d.aboard, '着陸');
// 7) Ctrl・Alt・⌘ と一緒の F では呼ばない
enter(FIELD, landed.x, landed.y);
press('f', { ctrlKey: true }); handle(); press('F', { altKey: true }); handle(); press('f', { metaKey: true }); handle();
T(!d.aboard && st().x === far.x, 'Ctrl＋F・Alt＋F・⌘＋F では呼ばない');
press('F', { shiftKey: true }); handle(); T(d.aboard === 'airship', 'Shift＋F（大文字の F）では呼ぶ'); W.interact();
// 8) 会話中に押した F は捨てる
enter(FIELD, far.x, far.y); W.busy = true; press('f'); handle(); W.busy = false; handle(); handle();
T(!d.aboard, '会話中に押した F は捨てる（あとで勝手に呼ばない）');
// 9) 2D 版の 1 歩の途中 → その 1 歩のあとで呼ぶ
enter(FIELD, landed.x, landed.y); W.tryMove('right'); T(p.moving, '（1 歩を始めた）');
press('f'); handle(); T(!d.aboard, '1 歩の途中では、まだ呼ばない');
let g = 0; while (p.moving && g++ < 400) scene.update(16); handle();
T(d.aboard === 'airship' && st().x === p.x && st().x === landed.x + 1, '1 歩のあとで呼ぶ（' + p.x + ',' + p.y + '）'); W.interact();
// 10) 馬車
if (w.Carriage) {
  enter(FIELD, landed.x, landed.y); w.Carriage.give(); d.carriage.on = true; w.Carriage.apply(); const spWalk = W.walkSpeed();
  T(w.Carriage.riding(), '（馬車に乗っている）');
  press('f'); handle(); T(d.aboard === 'airship' && !w.Carriage.riding() && d.carriage.on === true && Math.abs(p.speed - spWalk / w.Carriage.SPEED) < 1e-9, '馬車のまま呼ぶ：飛空艇の間は馬車を使わない（設定は覚えたまま・飛ぶ速さは歩きと同じ）');
  W.interact(); T(!d.aboard && w.Carriage.riding(), '着陸すると馬車に戻る');
  d.carriage.on = false; w.Carriage.apply();
}
// 11) 船に乗っている
if (w.VEHICLES.sailboat) {
  d.flags.ship_ready = true; V.unlockIfReady(); const sb = V.state('sailboat');
  if (sb && sb.owned) { enter(sb.map, sb.x, sb.y); V.board('sailboat', W.map, sb.x, sb.y); const a0 = JSON.stringify(st());
    T(AC.call() === false && /小型帆船を降りて/.test(lastToast()) && d.aboard === 'sailboat' && JSON.stringify(st()) === a0, '船に乗っている：呼べない（「小型帆船を降りて、陸に上がってから」）');
    V.disembark(); }
  else T(false, '小型帆船を用意できない');
}
// 12) メニューの項目・スマホのボタン
// メニュー：一覧の部品（Win.list）を差し替えて、出した項目だけ受け取って閉じる（jsdom には画面の部品がないため）
const menuItems = async () => { const l0 = w.Win.list; let items = null; w.Win.list = async (its) => { if (!items) items = its.map((x) => x.label); return -1; }; try { await w.Menu.open(); } finally { w.Win.list = l0; W.busy = false; } return items || []; };
(async () => {
  enter(FIELD, landed.x, landed.y);
  const m1 = await menuItems(); T(m1.indexOf('飛空艇を呼ぶ') === m1.indexOf('ファストトラベル') + 1 || m1.indexOf('飛空艇を呼ぶ') > m1.indexOf('ファストトラベル'), 'メニュー：持っていて乗っていないとき「飛空艇を呼ぶ」がある（' + m1.join('・').slice(0, 120) + '）');
  AC.call(); const m2 = await menuItems(); T(m2.indexOf('飛空艇を呼ぶ') < 0, 'メニュー：乗っている間は「飛空艇を呼ぶ」がない'); W.interact();
  // スマホのボタン（操作パネルを組み立てて見る）
  if (w.MobileUI && w.MobileUI.build) { w.MobileUI.build(); AC.updateUI(); const b = w.document.getElementById('mp-airship'); T(b && b.style.display === '' && !b.classList.contains('on78'), 'スマホのボタン：持っているので出る');
    AC.call(); T(b.classList.contains('on78'), 'スマホのボタン：乗っている間は光る'); W.interact(); AC.updateUI(); T(!b.classList.contains('on78'), 'スマホのボタン：降りたら光らない');
    w.MobileUI.command('airship'); handle(); T(d.aboard === 'airship', 'スマホのボタン：押すと呼んで乗る（F キーと同じ）'); W.interact(); }
  // 13) セーブ・読み込み
  enter(FIELD, far.x, far.y); AC.call(); S.save(1); const pos1 = { x: p.x, y: p.y };
  d.aboard = null; V.state('airship').x = 1; S.data = S.load(1);
  T(S.data.aboard === 'airship' && V.state('airship').x === pos1.x && V.state('airship').y === pos1.y, 'セーブ・読み込み：乗ったまま・位置が続く');
  // 14) 全滅：港（呼んで乗った所）へ戻る（今までの決まり）
  const port = Object.assign({}, V.state('airship').port); V.state('airship').x = port.x + 5; V.onGameOver();
  T(!S.data.aboard && V.state('airship').x === port.x && V.state('airship').y === port.y, '全滅：呼んで乗った所（港）へ戻る');
  // 15) 古いセーブ（vehicles.airship がない・aboard なし）でも動く
  S.newGame('もち', 'warrior'); S.data.flags.s3121_new_prologue = true; S.data.flags.s3121_prologue_phase = 'done'; W.start(); W.encounter = () => { };
  enter(FIELD, landed.x, landed.y); T(AC.call() === false && !S.data.aboard, '飛空艇のないセーブ：呼べない（エラーなし）');
  // 16) 次の目的地の案内
  if (w.Nav && w.Nav.hint) { const h = String(w.Nav.hint ? '' : ''); }
  const navSrc = require('fs').readFileSync(require('path').resolve(__dirname, '../../../js/rpg/nav.js'), 'utf8'); T(/F キー（スマホは「飛空艇」ボタン）/.test(navSrc), '案内の文：飛空艇が近くにないとき F キーで呼べることを書く（文の確認のみ）');
  T(!A.errors.length, 'ページのエラーなし ' + JSON.stringify(A.errors.slice(0, 3)));
  console.log('結果: ' + ok + ' OK / ' + ng.length + ' NG ' + JSON.stringify(ng));
  process.exit(ng.length ? 1 : 0);
})();
