// v8.8 で更新した写し（元：作業用フォルダの ftmenu.js）。変えたのはメインメニューの並びの確かめ 1 か所だけ
const load = require(process.env.RPGLOAD || '/home/claude/work/rpgload.js'); const { w, errors } = load(); const doc = w.document; const E = w.Engine, Input = E.Input, State = w.State, World = w.World; w.MochiQuest.boot();
const sleep = ms => new Promise(r => setTimeout(r, ms)); const frames = async n => { for (let i = 0; i < n; i++) await sleep(17); };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
const top = () => doc.getElementById('ui').lastElementChild;
async function drive(p, picks) { let done = false, v; p.then(x => { done = true; v = x; }); for (let i = 0; i < 600 && !done; i++) { const t = top(); if (t && t.classList.contains('rw-msg')) Input.press('ok'); else if (t && (t.classList.contains('rw-choice') || t.classList.contains('rw-list'))) { const k = picks.length ? picks.shift() : -1; if (k === -1) Input.press('cancel'); else { const it = t.querySelectorAll(t.classList.contains('rw-choice') ? '.rw-opt' : '.rw-item')[k]; if (it) { it.click(); if (t.classList.contains('rw-list') && t.parentNode) it.click(); } } } await frames(2); } return done ? v : 'TIMEOUT'; }
(async () => { await frames(5); doc.querySelectorAll('#ui > *').forEach(n => n.remove()); E.scenes = E.scenes.filter(s => !s.overlay);
  State.newGame('t', 'warrior'); State.data.settings.textSpeed = 'instant'; World.start(); await frames(3); doc.querySelectorAll('#ui > *').forEach(n => n.remove()); E.scenes = E.scenes.filter(s => !s.overlay);
  World.enterMap('poyo_village', 24, 30, 'up'); await frames(3);
  // メインメニュー → ファストトラベル（訪問済みはポヨ村だけ → いまいる場所は選べない）
  let seen = null; const p0 = w.Menu.open(); for (let i = 0; i < 40; i++) { const t = top(); if (t && t.classList.contains('main-menu')) { seen = [...t.querySelectorAll('.rw-item .l')].map(x => x.textContent); break; } await frames(2); }
  // v8.8 で更新：メニューが分類のタブ（冒険・パーティ・どうぐ・トレード・システム）になったので、「ファストトラベルの次がセーブ」という並びの確かめを、「冒険の中にファストトラベル・上のボタンにセーブ」に置きかえた
  const tools88 = [...top().querySelectorAll('.rw-tool')].map(x => x.textContent);
  ok(seen && seen.indexOf('ファストトラベル') >= 0 && tools88.indexOf('セーブ') >= 0, 'メインメニュー（冒険）に「ファストトラベル」・上のボタンに「セーブ」（' + (seen || []).join('・') + '｜' + tools88.join('・') + '）'); Input.press('cancel'); await frames(4); await drive(p0, []);
  State.data.visited.rivel_town = true; State.data.visited.harbor_town = true; State.data.visited.luxbell = true;
  let list = null; const p1 = w.Menu.open(); for (let i = 0; i < 60; i++) { const t = top(); if (t && t.classList.contains('main-menu')) { const it = [...t.querySelectorAll('.rw-item')].find(x => x.querySelector('.l').textContent === 'ファストトラベル'); it.click(); it.click(); } else if (t && t.classList.contains('rw-list') && !t.classList.contains('main-menu')) { list = [...t.querySelectorAll('.rw-item')].map(x => x.querySelector('.l').textContent + '|' + (x.querySelector('.r') || {}).textContent + '|' + x.classList.contains('disabled')); break; } await frames(2); }
  ok(list && list.some(x => x.startsWith('リヴェル城下町')) && list.some(x => x.startsWith('娯楽都市ラックスベル')) && list.some(x => x.indexOf('いまいる場所') >= 0 && x.endsWith('true')), '訪れた場所の一覧（地域名つき・いまいる場所は選べない）：' + (list || []).join(' / '));
  ok(top().textContent.indexOf('まだ訪れていない場所') >= 0 && top().textContent.indexOf('鉄冠') < 0, '未訪問は件数だけ（名前は出さない）');
  const idx = list.findIndex(x => x.startsWith('リヴェル城下町')); const r = await drive(p1, [idx, 0]); await frames(10);
  ok(World.map.id === 'rivel_town' && !World.busy && !top(), '選ぶ → 確認 →「移動する」でリヴェル城下町へ移動し、メニューは閉じる（' + World.map.id + '）');
  // ダンジョンの中では使えない
  World.enterMap('oblivion_cave_1', 10, 10, 'down'); await frames(3); const p2 = w.Menu.open(); let msg = null; for (let i = 0; i < 60; i++) { const t = top(); if (t && t.classList.contains('main-menu')) { const it = [...t.querySelectorAll('.rw-item')].find(x => x.querySelector('.l').textContent === 'ファストトラベル'); it.click(); it.click(); } else if (t && t.classList.contains('rw-msg')) { msg = t.textContent; break; } await frames(2); }
  ok(msg && msg.indexOf('ダンジョンの中では使えない') >= 0, 'ダンジョンの中では理由を表示して使えない'); await drive(p2, []);
  // PC のサイドバー
  ok([...doc.querySelectorAll('#side .sb-btn')].some(b => b.textContent === 'ファストトラベル'), 'PC のサイドバーにも「ファストトラベル」');
  console.log('結果: ' + pass + ' OK / ' + fail + ' NG', errors); process.exit(fail ? 1 : 0); })();
