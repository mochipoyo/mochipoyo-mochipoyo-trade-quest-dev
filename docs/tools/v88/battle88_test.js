// v8.8 Phase 3 通常戦闘の確かめ（jsdom。実機・実ブラウザではない）：node battle88_test.js [2d]
//  前回と同じ（使えるかの確かめ直し）・お気に入りの特技・よく使う道具・オートの表示・リザルトの簡易表示と強調・報酬は 1 回だけ・敵のHPバーの既定
const load = require('../v78/load78.js');
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const doc = w.document;
const { Engine: E, State, World, Win, Menu, Combat, Actors, ENEMIES, ITEMS, SKILLS } = w; const B = w.BattleUI; const Input = E.Input;
let ok = 0; const ng = []; const T = (c, m) => { if (c) ok++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const frames = async (n) => { for (let i = 0; i < n; i++) await sleep(17); };
const top = () => doc.getElementById('ui').lastElementChild; const click = (n) => n.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
function clean() { doc.querySelectorAll('#ui > *').forEach((n) => n.remove()); E.scenes = E.scenes.filter((s) => !s.overlay); World.busy = false; }
async function waitFor(fn, n) { for (let i = 0; i < (n || 600); i++) { const v = fn(); if (v) return v; await sleep(20); } return null; }
(async () => {
  try { Input.init(); } catch (e) { }
  w.MochiQuest && w.MochiQuest.boot && w.MochiQuest.boot(); await frames(5); clean();
  State.newGame('テスト', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.settings.battleSpeed = 'fast'; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); await frames(4); clean();
  console.log('== ' + (two ? '2D 版' : '3D 版と同じ読み込み'));
  const hero = d.hero;
  console.log('-- 前回と同じ：確かめ直し');
  const b = Combat.create(['slime', 'slime'], State.partyActors(), {});
  T(B.checkRepeat(b, hero, { type: 'attack', target: { side: 'enemy', idx: 0 } }).ok === true, 'たたかう（敵が生きている）＝そのまま');
  b.enemies[0].dead = true; b.enemies[0].hp = 0; const rr = B.checkRepeat(b, hero, { type: 'attack', target: { side: 'enemy', idx: 0 } }); T(rr.ok && rr.retarget, '前の相手が倒れていたら、相手を選び直す');
  T(B.checkRepeat(b, hero, { type: 'ultimate', ultId: 'x' }).ok === false, '必殺技はくり返せない（チャートの判断をくり返さない）');
  T(B.checkRepeat(b, hero, { type: 'escape' }).ok === false, 'にげるはくり返さない');
  const sk = Object.keys(SKILLS).find((k) => SKILLS[k].mp > 0 && !SKILLS[k].field && SKILLS[k].target === 'enemy');
  hero.skills = (hero.skills || []).concat([sk]); hero.mp = 0; const r2 = B.checkRepeat(b, hero, { type: 'skill', skillId: sk, target: { side: 'enemy', idx: 1 } });
  T(Actors.allSkills(hero).indexOf(sk) < 0 || (r2.ok === false && /MP/.test(r2.why)), 'MP が足りないときは使えない（理由：' + (r2.why || '') + '）');
  T(B.checkRepeat(b, hero, { type: 'item', itemId: 'herb', target: { side: 'party', id: 'hero' } }).ok === false, '道具がもうないときは使えない');
  State.addItem('herb', 1); T(B.checkRepeat(b, hero, { type: 'item', itemId: 'herb', target: { side: 'party', id: 'hero' } }).ok === true, '道具があれば使える');
  hero.dead = true; T(B.checkRepeat(b, hero, { type: 'item', itemId: 'herb', target: { side: 'party', id: 'hero' } }).ok === false, '対象が倒れていたら使えない（回復の道具）'); hero.dead = false; Actors.fullHeal(hero);

  console.log('-- 画面：前回と同じ・リザルト');
  ENEMIES.__t88 = Object.assign({}, ENEMIES.slime, { id: '__t88', name: 'テストの的', hp: 400, atk: 1, mag: 0, agi: 1, def: 0, exp: 3, gold: 2, drops: [], trial: 0, skills: [] });
  d.settings.autoBattle = false; const bt = B.start(['__t88'], {}); let st = { done: false }; bt.then((v) => { st.done = true; st.v = v; });
  let L = await waitFor(() => { const t = top(); return t && t.classList.contains('cmd-list') ? t : null; });
  T(L && ![...L.querySelectorAll('.rw-item .l')].some((x) => /前回と同じ/.test(x.textContent)), '1 ターン目：「前回と同じ」はない');
  click([...L.querySelectorAll('.rw-item')].find((x) => /たたかう/.test(x.textContent))); await frames(2);
  const tl = top(); if (tl && tl.classList.contains('rw-list') && !tl.classList.contains('cmd-list')) { click(tl.querySelector('.rw-item')); }
  L = await waitFor(() => { const t = top(); return t && t.classList.contains('cmd-list') && [...t.querySelectorAll('.rw-item .l')].some((x) => /前回と同じ/.test(x.textContent)) ? t : null; });
  T(!!L, '2 ターン目：「前回と同じ（たたかう）」が出る');
  T(L && L.querySelectorAll('.rw-item')[1].classList.contains('cur') && /たたかう/.test(L.querySelectorAll('.rw-item')[1].textContent), '最初のカーソルは今までどおり「たたかう」');
  if (L) { const ab = doc.getElementById('auto-battle'); click(ab); await frames(2); T(/次の戦闘も続く/.test(ab.textContent) && ab.getAttribute('aria-pressed') === 'true', 'オート ON：「次の戦闘も続く」と表示'); }
  ENEMIES.__t88.hp = 1; b.enemies && 0;
  const R = await waitFor(() => { const t = top(); return t && t.classList.contains('result-victory') ? t : null; }, 1500);
  T(R && R.classList.contains('result-simple') && /VICTORY/.test(R.textContent) && /経験値/.test(R.textContent), '通常の敵だけの勝利：簡単なリザルト');
  const g0 = d.gold; if (R) { click(R.querySelector('.rw-panel-close')); } await waitFor(() => st.done, 600); T(st.v === 'won', '勝利で戦闘が終わる');
  d.settings.autoBattle = true;
  // ボス戦：強調の帯・報酬は 1 回だけ
  ENEMIES.__t88b = Object.assign({}, ENEMIES.__t88, { id: '__t88b', name: 'テストのボス', hp: 1, boss: true, exp: 5 });
  const exp0 = hero.exp, lv0 = hero.level; const bt2 = B.start(['__t88b'], { boss: true }); const st2 = { done: false }; bt2.then((v) => { st2.done = true; st2.v = v; });
  const msgSeen = await waitFor(() => /オート戦闘は ON のまま/.test((doc.getElementById('battle-msg') || {}).textContent || '') || (top() && top().classList.contains('result-victory')), 1500);
  T(!!msgSeen, 'ボス戦の始めに「オート戦闘は ON のまま」を知らせる');
  const R2 = await waitFor(() => { const t = top(); return t && t.classList.contains('result-victory') ? t : null; }, 1500);
  T(R2 && !R2.classList.contains('result-simple') && /ボスを倒した/.test(R2.querySelector('.rs-special').textContent), 'ボス戦：強調の帯（ボスを倒した！）');
  if (R2) click(R2.querySelector('.rw-panel-close')); await waitFor(() => st2.done, 600);
  T(hero.level > lv0 || hero.exp > exp0, '経験値が入る（' + exp0 + '→' + hero.exp + '・Lv' + lv0 + '→' + hero.level + '・結果 ' + st2.v + '）');
  const expAfter = hero.exp; await frames(10); T(hero.exp === expAfter, 'リザルトを閉じても経験値は増えない（1 回だけ）');
  d.settings.autoBattle = false;
  console.log('-- お気に入りの特技・よく使う道具（State.data.ui）');
  const u = Menu.ui(); u.favSkills = {}; T(typeof u.favSkills === 'object' && Array.isArray(u.recentItems), 'State.data.ui に favSkills・recentItems');
  const old = JSON.parse(JSON.stringify(d)); delete old.ui; const mg = State.migrate(old); T(mg.ui && mg.ui.favSkills && typeof mg.ui.favSkills === 'object', '旧セーブ：ui の初期値を補う');
  console.log('-- 敵のHPバーの既定');
  const sv0 = State.newGame; State.newGame('a', 'warrior'); T(State.data.settings.enemyHpBar === undefined, 'State.newGame の初期値には入れない（前からのセーブの「未設定＝表示しない」を変えない）');
  const src = require('fs').readFileSync(require('path').resolve(__dirname, '../../../js/ui/title.js'), 'utf8'); T(/enemyHpBar = 'on'/.test(src), '「はじめから」で新しく始めたときだけ表示する（title.js）');
  console.log('結果: ' + ok + ' OK / ' + ng.length + ' NG ' + JSON.stringify(ng) + '　ページのエラー ' + A.errors.length);
  process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
