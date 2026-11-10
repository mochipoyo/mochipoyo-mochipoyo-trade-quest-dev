// v9.3 RPG の快適さの確かめ（jsdom。実機・実ブラウザではない。見た目・音・読み込みの速さは browser/ の確かめ・測り方で）
//   node docs/tools/rpg93/rpg93_test.js [2d]
//   A 戦闘のテンポ（とてもはやい）  B 仲間ごとの作戦  C まんたん  D 効き目の表示  E 会話の履歴  F BGM  G 戦闘の演出  H 読み込み  I セーブの互換  J 音の出だし
const path = require('path'); const fs = require('fs'); const cp = require('child_process'); const load = require(path.resolve(__dirname, '../v78/load78.js'));
const ROOT = path.resolve(__dirname, '../../..') + '/';
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w; const doc = w.document;
const { Engine: E, State, World, Win, Menu, ITEMS, Actors, Combat, SKILLS, ENEMIES } = w; const Input = E.Input;
let okN = 0; const ng = []; const T = (c, m) => { if (c) okN++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const frames = async (n) => { for (let i = 0; i < n; i++) await sleep(17); };
const top = () => doc.getElementById('ui').lastElementChild;
const settle = (p) => { const o = { done: false, v: undefined }; p.then((v) => { o.done = true; o.v = v; }); return o; };
const press = async (k) => { Input.press(k); await frames(2); };
const src = (f) => fs.readFileSync(ROOT + f, 'utf8');
function clean() { doc.querySelectorAll('#ui > *').forEach((n) => n.remove()); E.scenes = E.scenes.filter((s) => !s.overlay); World.busy = false; }
(async () => {
  try { Input.init(); } catch (e) { }
  if (w.Audio) w.Audio.sfx = () => { };   // jsdom には音の部品がない（ゲームの不具合ではない）
  w.MochiQuest && w.MochiQuest.boot && w.MochiQuest.boot(); await frames(5); clean();
  State.newGame('テスト', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start(); await frames(4); clean();
  console.log('== ' + (two ? '2D 版' : '3D 版と同じ読み込み') + '　読み込みのエラー ' + A.errors.length);
  T(A.errors.length === 0, '読み込みのエラーなし' + (A.errors.length ? '：' + A.errors.slice(0, 3).join(' / ') : ''));
  ['lina', 'kyle', 'mina'].forEach((id) => State.joinCompanion(id));
  const P = State.partyActors(); T(P.length === 4, '戦闘メンバー 4 人（' + P.map((a) => a.name).join('・') + '）');
  const keys0 = Object.keys(d).sort().join(); const setKeys0 = Object.keys(d.settings).sort().join();

  console.log('-- A 戦闘のテンポ（とてもはやい）');
  const BU = w.BattleUI, F = w.FX65;
  d.settings.battleSpeed = 'normal'; T(BU.speed() === 'normal' && BU.sp(300, 100) === 300, 'ふつう：待ち時間はそのまま（300ms）');
  d.settings.battleSpeed = 'fast'; T(BU.speed() === 'fast' && BU.sp(300, 100) === 100, 'はやい：今までの「はやい」と同じ（100ms）');
  d.settings.battleSpeed = 'veryfast'; T(BU.speed() === 'veryfast' && BU.sp(300, 100) === 55 && BU.sp(300, 10) === 10, 'とてもはやい：「はやい」の 0.55 倍（55ms。10ms より短くしない）');
  d.settings.battleSpeed = 'turbo'; T(BU.speed() === 'normal', '知らない値は「ふつう」');
  const tlN = F.timeline(F.DEFS.fireball, {}), tlF = F.timeline(F.DEFS.fireball, { fast: true, speed: 'fast' }), tlV = F.timeline(F.DEFS.fireball, { fast: true, speed: 'veryfast' });
  T(tlV.total < tlF.total && tlF.total < tlN.total, '演出の時刻表も短くなる（火の玉：ふつう ' + tlN.total + 'ms → はやい ' + tlF.total + 'ms → とてもはやい ' + tlV.total + 'ms）');
  T(tlV.impacts.every((x) => x <= tlV.total) && tlV.hitAt > 0, 'とてもはやいでも命中の瞬間は時刻表の中');
  T(/battleSpeed[\s\S]{0,200}veryfast[\s\S]{0,40}とてもはやい/.test(src('js/ui/menu.js')), '設定の戦闘速度に「とてもはやい」');
  d.settings.battleSpeed = 'normal';

  console.log('-- B 仲間ごとの作戦');
  T(Combat.TACTICS.map((x) => x.id).join() === 'balance,gangan,heal,nomp' && Combat.TACTICS.map((x) => x.name).join('／') === 'バランスよく／ガンガン行く／回復重視／MPを使わない', '作戦は 4 つ（' + Combat.TACTICS.map((x) => x.name).join('／') + '）');
  T(P.every((a) => Combat.tacticOf(a) === 'balance'), '最初はみんな「バランスよく」（今までのオート戦闘と同じ）');
  const eIds = Object.keys(ENEMIES).filter((k) => !ENEMIES[k].boss && ENEMIES[k].hp >= 200 && ENEMIES[k].hp <= 2000).slice(0, 2);
  const cost = (a, sk) => (Combat.skillCost ? Combat.skillCost(a, sk) : sk.mp) || 0;
  const healer = P.find((a) => Actors.allSkills(a).some((id) => SKILLS[id] && SKILLS[id].kind === 'heal' && SKILLS[id].target === 'ally'));
  const caster = P.find((a) => Actors.allSkills(a).some((id) => SKILLS[id] && (SKILLS[id].kind === 'magic' || SKILLS[id].kind === 'attack') && cost(a, SKILLS[id]) > 0));
  T(!!healer && !!caster, '回復の呪文を持つ仲間（' + (healer && healer.name) + '）・MP を使う攻撃を持つ仲間（' + (caster && caster.name) + '）');
  const fresh = () => { P.forEach((a) => { const s = Actors.stats(a); a.hp = s.maxHp; a.mp = s.maxMp; a.dead = false; a.status = {}; }); const b = Combat.create(eIds, P, {}); return b; };
  const pick = (b, a) => { const c = Combat.autoCommand(b, a); return c; };
  // MPを使わない：何度選んでも MP を使う技を選ばない
  let b = fresh(); caster.tactic = 'nomp'; let mpUsed = 0; for (let i = 0; i < 40; i++) { const c = pick(b, b.party.find((x) => x.id === caster.id)); if (c.type === 'skill' && cost(caster, SKILLS[c.skillId]) > 0) mpUsed++; }
  T(mpUsed === 0, 'MPを使わない：40 回選んで MP を使う技は 0 回（' + caster.name + '）');
  caster.tactic = 'gangan'; b = fresh(); let mpG = 0; for (let i = 0; i < 40; i++) { const c = pick(b, b.party.find((x) => x.id === caster.id)); if (c.type === 'skill' && cost(caster, SKILLS[c.skillId]) > 0) mpG++; }
  T(mpG > 0, 'ガンガン行く：MP を使う攻撃を選ぶ（40 回中 ' + mpG + ' 回）');
  // 回復重視：HP 60% の仲間 → 回復。バランス：回復しない（45% 未満で回復）
  const other = P.find((a) => a !== healer);
  b = fresh(); let bo = b.party.find((x) => x.id === other.id); bo.hp = Math.round(Actors.stats(bo).maxHp * 0.6);
  healer.tactic = 'balance'; let c1 = pick(b, b.party.find((x) => x.id === healer.id)); healer.tactic = 'heal'; let c2 = pick(b, b.party.find((x) => x.id === healer.id));
  T(!(c1.type === 'skill' && SKILLS[c1.skillId].kind === 'heal') && c2.type === 'skill' && SKILLS[c2.skillId].kind === 'heal', '回復重視：HP 60% で回復（バランスよくは回復しない）');
  // ガンガン行く：HP 35% の仲間 → 回復しない（25% 未満で回復）。バランス：回復
  b = fresh(); bo = b.party.find((x) => x.id === other.id); bo.hp = Math.round(Actors.stats(bo).maxHp * 0.35);
  healer.tactic = 'gangan'; c1 = pick(b, b.party.find((x) => x.id === healer.id)); healer.tactic = 'balance'; c2 = pick(b, b.party.find((x) => x.id === healer.id));
  T(!(c1.type === 'skill' && SKILLS[c1.skillId].kind === 'heal') && c2.type === 'skill' && SKILLS[c2.skillId].kind === 'heal', 'ガンガン行く：HP 35% では回復しない（バランスよくは回復）');
  healer.tactic = 'heal'; b = fresh(); let hAtk = 0; for (let i = 0; i < 30; i++) { const c = pick(b, b.party.find((x) => x.id === healer.id)); if (c.type === 'skill' && cost(healer, SKILLS[c.skillId]) > 0 && (SKILLS[c.skillId].target === 'enemy' || SKILLS[c.skillId].target === 'enemies')) hAtk++; }
  T(hAtk === 0, '回復重視：攻撃に MP を使わない（30 回中 0 回）');
  T(/"tactic":"heal"/.test(JSON.stringify(d.companions[healer.id] || d.hero)), '作戦は仲間ごとにセーブに入る（actor.tactic）');
  P.forEach((a) => { delete a.tactic; });
  T(typeof Menu.tactics === 'function' && /さくせん/.test(src('js/ui/menu.js')) && /key: 'tactics'/.test(src('js/ui/battle.js')), 'メニュー（なかま）と戦闘のコマンドに「さくせん」');

  console.log('-- C まんたん');
  P.forEach((a) => { const s = Actors.stats(a); a.hp = Math.max(1, Math.round(s.maxHp * 0.3)); a.mp = s.maxMp; a.dead = false; });
  d.inventory = d.inventory || {}; const herb = Object.keys(ITEMS).find((k) => Menu.fullHealItem(k) && ITEMS[k].effect.hp <= 40) || 'herb'; State.addItem(herb, 5); const inv0 = d.inventory[herb];
  let r = Menu.fullHealRun(false);
  T(r.spells.length > 0 && d.inventory[herb] === inv0, '呪文だけ：回復の呪文を使い、道具は使わない（' + r.lines.join('／') + '）');
  T(P.every((a) => a.hp === Actors.stats(a).maxHp) === !!r.full, '満タンになったかの結果が実際の HP と同じ');
  P.forEach((a) => { const s = Actors.stats(a); a.hp = Math.max(1, Math.round(s.maxHp * 0.5)); a.mp = 0; }); const kyle = P[2]; kyle.dead = true; kyle.hp = 0;
  const hpBefore = P.map((a) => a.hp); r = Menu.fullHealRun(true);
  T(r.spells.length === 0 && r.items.length > 0 && d.inventory[herb] < inv0, 'MP がないとき：道具を使う（' + r.lines.join('／') + '）');
  T(kyle.dead && kyle.hp === 0, '倒れている仲間は回復しない（生き返らせない）');
  T(P.some((a, i) => !a.dead && a.hp > hpBefore[i]), '生きている仲間の HP が増える');
  const mpItem = Object.keys(ITEMS).find((k) => ITEMS[k].effect && ITEMS[k].effect.mp && !ITEMS[k].effect.hp);
  T(!mpItem || !Menu.fullHealItem(mpItem), 'MP を回復する道具は使わない（' + (mpItem || 'なし') + '）');
  kyle.dead = false; kyle.hp = Actors.stats(kyle).maxHp;
  T(/まんたん/.test(src('js/ui/menu.js')) && typeof Menu.fullHeal === 'function', 'メニュー（なかま）に「まんたん」');

  console.log('-- D 効き目の表示');
  const sk = (el) => Object.keys(SKILLS).map((k) => SKILLS[k]).find((s) => s.kind === 'magic' && s.element === el && s.target === 'enemy');
  const ghost = { name: 'テスト', hp: 10, resist: { light: 1.5, dark: 0, fire: 0.5 } };
  T(Combat.effectOn(P[0], sk('light'), ghost) === 'weak' && Combat.effectOn(P[0], sk('fire'), ghost) === 'resist' && Combat.effectOn(P[0], sk('dark'), ghost) === 'immune', '弱点＝ばつぐん・耐性＝いまいち・無効＝きかない（実際のダメージの倍率と同じ）');
  const stSk = Object.keys(SKILLS).map((k) => SKILLS[k]).find((s) => s.kind === 'status' && s.target === 'enemy');
  T(!stSk || (Combat.effectOn(P[0], stSk, Object.assign({}, ghost, { boss: true })) === 'resist' && Combat.effectOn(P[0], stSk, ghost) === 'normal'), '状態異常の技：ボスには「いまいち」');
  const healSk = Object.keys(SKILLS).map((k) => SKILLS[k]).find((s) => s.kind === 'heal');
  T(Combat.effectOn(P[0], healSk, ghost) === null, '敵に使わない技は表示しない');
  T(/effHint/.test(src('js/ui/menu.js')) && /EFF_MARK/.test(src('js/ui/battle.js')), '設定「呪文・特技の効き目の表示」と、技・対象の一覧の印');

  console.log('-- E 会話の履歴');
  Win.log.length = 0; const m1 = settle(Win.message(['こんにちは。', '今日はいい天気だ。'], { name: '村人' })); await frames(3); for (let i = 0; i < 8 && !m1.done; i++) { await press('ok'); await frames(6); }
  T(Win.log.length >= 2 && Win.log[0].name === '村人' && /こんにちは/.test(Win.log[0].text) && /いい天気/.test(Win.log[1].text), '話した言葉が履歴に入る（名前つき・2 行とも）');
  const n0 = Win.log.length; Win.logLine('村人', Win.log[n0 - 1].text, 'say'); T(Win.log.length === n0, '同じ言葉が続くときは 1 回だけ');
  for (let i = 0; i < 320; i++) Win.logLine('テスト', '行 ' + i, 'say'); T(Win.log.length === Win.LOG_MAX && Win.LOG_MAX === 300, '新しい 300 件まで');
  const bl = settle(Win.backlog()); await frames(3); T(top() && top().classList.contains('backlog-panel'), '会話の履歴を開く'); await press('cancel'); await frames(3); T(bl.done || !top() || !top().classList.contains('backlog-panel'), '閉じる');
  T(/会話の履歴/.test(src('js/ui/menu.js')) && /rw-logbtn/.test(src('js/ui/windows.js')), 'メニュー（冒険）と会話の窓の「履歴」ボタン・↑キー');
  clean(); if (!m1.done) clean();

  console.log('-- F BGM');
  const G = w.BGM93; const trackFiles = Object.keys(G.TRACKS).map((k) => G.TRACKS[k].file);
  T(trackFiles.length === 36 && trackFiles.every((f) => fs.existsSync(ROOT + 'assets/music/' + f)), '曲 36 曲のファイルがある（assets/music/）');
  const sizeMB = trackFiles.reduce((t, f) => t + fs.statSync(ROOT + 'assets/music/' + f).size, 0) / 1048576; console.log('     曲の合計 ' + sizeMB.toFixed(1) + 'MB');
  G.state = { outdoor: null, dungeon: null, region: null };
  T(G.pick('title') === G.SCENE.title && G.pick('boss') === G.SCENE.boss && G.pick('church') === G.SCENE.church, 'タイトル・ボス・教会は決まった曲');
  T(G.pick('town', { id: 'poyo_village', kind: 'town' }) === 'the_fledgling_kingdom' && G.pick('town', { id: 'harbor_town', kind: 'town' }) === 'waters_edge', '町ごとの曲');
  const f1 = G.pick('field', { id: 'world', kind: 'field' }); const inn = G.pick('inn', { id: 'x_inn', kind: 'interior' });
  T(inn === f1, '建物の中は外の曲のまま');
  const d1 = G.pick('dungeon', { id: 'cave_b1', kind: 'dungeon' }), d2 = G.pick('dungeon', { id: 'cave_b2', kind: 'dungeon' });
  T(d1 === d2 && G.DUNGEON_POOL.indexOf(d1) >= 0, '同じダンジョンの中（階を移っても）は同じ曲');
  T(G.pick('field', { id: 'world', kind: 'field' }, { aboard: 'ship' }) === G.SCENE.sea && G.pick('field', { id: 'world', kind: 'field' }, { aboard: 'airship' }) === G.SCENE.sky, '船＝海の曲・飛空艇＝空の曲');
  G.pick('field', { id: 'world_dark', kind: 'field' }); T(G.pick('battle') === G.SCENE.battle_late, '後半の地方は通常戦闘の曲が変わる');
  T(/CC BY-SA 3\.0/.test(G.creditsHtml()) && /Wildfire Games/.test(G.creditsHtml()) && /CC BY-SA 3\.0/.test(src('assets/music/CREDITS.md')), 'クレジット（ゲームの中・CREDITS.md）：Wildfire Games・CC BY-SA 3.0');
  T(typeof w.Audio.playFile === 'function' && typeof w.Audio.fileMode === 'function', '曲を鳴らす部品（読めないときはレトロの BGM）');

  console.log('-- G 戦闘の演出');
  const FX2D = w.FX2D, R = FX2D.Rich; delete d.settings.battleFx;
  T(R.level() === 'rich', '初期は「はなやか」'); d.settings.battleFx = 'calm'; T(R.level() === 'calm', '設定「控えめ」'); d.settings.battleFx = 'rich';
  T(R.elementOf(F.DEFS.fireball) === 'fire' && R.elementOf(F.DEFS.heal) === 'heal' && R.elementOf(F.DEFS.flame_blade) === 'fire' && R.elementOf(F.DEFS.thunder) === 'thunder', '演出の種類 → 属性（炎の剣は炎）');
  // 全部の技の演出を、いろいろな時刻で描いても失敗しない（描く命令はダミー。見た目は browser/fx93_browser.js の見本の一覧で）
  const ctxStub = new Proxy({ canvas: { width: 640, height: 416 } }, { get: (t, k) => k in t ? t[k] : (k === 'measureText' ? () => ({ width: 10 }) : (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop() { } }) : () => { }), set: () => true });
  const scene = { t: 0, fx65: [], fxHits: [], screenShake: 0, posOf: (k) => /^e:/.test(k) ? { x: 200 + (+k.slice(2)) * 100, y: 150 } : { x: 160, y: 290 }, footOf: (k) => /^e:/.test(k) ? { x: 200, y: 230 } : { x: 160, y: 320 } };
  const ids = Object.keys(F.DEFS); const err0 = FX2D.errors; let drawn = 0;
  ids.forEach((id) => { const def = F.DEFS[id]; ['normal', 'veryfast'].forEach((spd) => { const tl = F.timeline(def, { fast: spd !== 'normal', speed: spd }); scene.fx65 = []; scene.t = 1000; FX2D.start(scene, def, tl, 'p:hero', def.area === 'all' ? ['e:0', 'e:1', 'e:2'] : ['e:0']); [0, tl.windup, tl.hitAt, tl.hitAt + 40, tl.total, tl.total + 200].forEach((tt) => { scene.t = 1000 + tt; FX2D.draw(ctxStub, scene); drawn++; }); }); });
  T(FX2D.errors === err0, '全部の技（' + ids.length + '）の演出を、ふつう・とてもはやいの 6 つの時刻で描いて失敗 0（' + drawn + ' 回）');
  scene.fx65 = []; scene.t = 0; FX2D.start(scene, F.DEFS.fireball, F.timeline(F.DEFS.fireball, {}), 'p:hero', ['e:0']); scene.t = 5000; FX2D.draw(ctxStub, scene); T(scene.fx65.length === 0, '終わった演出は消える');
  const enemyDefs = Object.keys(ENEMIES).slice(0, 60).map((k) => F.enemy({ defId: k }, {})); scene.fx65 = []; enemyDefs.forEach((def) => { scene.t = 0; FX2D.start(scene, def, F.timeline(def, {}), 'e:0', ['p:hero']); }); [100, 300, 500, 900].forEach((tt) => { scene.t = tt; FX2D.draw(ctxStub, scene); }); T(FX2D.errors === err0, '敵の行動の演出（60 体）も失敗 0');
  const meteor = F.DEFS.meteor; const tlM = F.timeline(meteor, {});
  d.settings.battleFx = 'rich'; scene.fx65 = []; scene.screenShake = 0; scene.t = 0; FX2D.start(scene, meteor, tlM, 'p:hero', ['e:0']); scene.t = tlM.hitAt + 5; FX2D.draw(ctxStub, scene); T(scene.screenShake > 0, 'はなやか：大技の命中で画面が揺れる');
  d.settings.battleFx = 'calm'; scene.fx65 = []; scene.screenShake = 0; scene.t = 0; FX2D.start(scene, meteor, tlM, 'p:hero', ['e:0']); scene.t = tlM.hitAt + 5; FX2D.draw(ctxStub, scene); T(scene.screenShake === 0, '控えめ：揺らさない');
  d.settings.battleFx = 'rich'; scene.screenShake = 0; FX2D.hit(scene, 'e:0', { crit: true }); scene.t += 50; FX2D.draw(ctxStub, scene); T(scene.screenShake >= 220 && FX2D.errors === err0, '会心の一撃：集中線と揺れ');
  delete d.settings.battleFx;
  const css = src('styles.css'); const motions = new Set(ids.map((id) => F.DEFS[id].motion).filter(Boolean)); motions.delete('lunge');
  const miss = [...motions].filter((m) => css.indexOf('.bp.mo-' + m) < 0);
  T(miss.length === 0, '味方の技の動き（' + [...motions].join('・') + '）すべてに欄の動き（CSS）' + (miss.length ? ' 足りない：' + miss.join(',') : ''));
  T(/\.bp\.hurt::before/.test(css) && /\.bp\.healed::before/.test(css) && /prefers-reduced-motion/.test(css), '当たった・回復した光・端末の「動きを減らす」');
  T(/battleFx/.test(src('js/ui/menu.js')), '設定「戦闘の演出」');

  console.log('-- H 読み込み');
  const html = src('index.html'), html3 = src('3d/index.html');
  const tmplSrcs = [...html.matchAll(/src="(js\/[^"?]+)/g)].map((m) => m[1]);
  T(tmplSrcs.length >= 250 && tmplSrcs.every((f) => fs.existsSync(ROOT + f)), 'ファイルの一覧（template）の ' + tmplSrcs.length + ' ファイルがすべてある');
  T(/<script src="dist\/mtq\.min\.js\?v=/.test(html) && /if \(!window\.MochiQuest\) document\.write\(document\.getElementById\('mtq-src'\)\.innerHTML\)/.test(html), '2D：まとめた JS と、読めないときの元のファイルへの切り替え');
  T(/\.\.\/dist\/mtq\.min\.js\?v=/.test(html3) && /mtq-src/.test(html3), '3D：まとめた JS と切り替え');
  const chk = cp.spawnSync(process.execPath, [ROOT + 'tools/stamp-version.js', '--check'], { cwd: ROOT, encoding: 'utf8' });
  T(chk.status === 0, 'まとめた JS・版の印が最新（tools/stamp-version.js --check）');
  const ver = (src('js/core/version.js').match(/'([0-9a-f]{10})'/) || [])[1]; T(!!ver && src('sw.js').indexOf("const VERSION = '" + ver + "'") >= 0, 'Service Worker の版＝ゲームの版（' + ver + '）');
  T(/location\.protocol === 'https:'/.test(html) && /nosw/.test(html) && /nosw/.test(html3), 'Service Worker は https のときだけ・?nosw で止められる');
  const WP = w.ASSET_WEBP || {}; const wps = Object.keys(WP);
  T(wps.length > 100 && wps.every((p) => fs.existsSync(ROOT + p.replace(/\.(png|jpe?g)$/i, '.webp')) && fs.statSync(ROOT + p.replace(/\.(png|jpe?g)$/i, '.webp')).size < fs.statSync(ROOT + p).size), 'WebP（' + wps.length + ' 枚）がすべてあり、元より小さい');
  T(wps.every((p) => fs.existsSync(ROOT + p)), '元の画像（PNG・JPEG）は消していない');
  T(w.Assets.pickPath(wps[0]) === wps[0], 'WebP を使えない環境（jsdom）では元の画像');

  console.log('-- I セーブの互換');
  T(Object.keys(d).sort().join() === keys0, 'セーブのデータの項目は増えない');
  const newSet = Object.keys(d.settings).filter((k) => setKeys0.split(',').indexOf(k) < 0); T(newSet.every((k) => ['battleSpeed', 'battleFx', 'autoBattle'].indexOf(k) >= 0), '設定の項目：選んだものだけ増える（' + (newSet.join(',') || 'なし') + '）');
  // 前の版のセーブ（新しい項目なし）を読み込む
  const old = JSON.parse(JSON.stringify(d)); delete old.settings.battleFx; delete old.settings.effHint; delete old.settings.bgmKind; Object.keys(old.companions || {}).forEach((k) => { delete old.companions[k].tactic; }); delete old.hero.tactic;
  const slotKey = Object.keys(w.localStorage).find((k) => /slot-/.test(k)); State.save(3); const k3 = Object.keys(w.localStorage).find((k) => /slot-3$/.test(k));
  w.localStorage.setItem(k3, JSON.stringify(old)); const okLoad = State.load(3);
  T(!!okLoad && State.data && State.partyActors().every((a) => Combat.tacticOf(a) === 'balance') && w.FX2D.Rich.level() === 'rich' && w.BattleUI.speed() === 'normal', '前の版のセーブ（作戦・新しい設定なし）を読み込める（作戦＝バランスよく・演出＝はなやか）');
  T(!!k3 && (two ? /^mtq-rpg-v2-slot-3$/.test(k3) : /slot-3$/.test(k3)), 'セーブの場所（LocalStorage のキー）は今までどおり（' + k3 + '）');
  T(!Object.keys(w.localStorage).some((k) => /mtq-title-sound/.test(k)), 'タイトルの音の設定は、切り替えたときだけ保存する');

  console.log('-- J 音の出だし（v9.3 修正：「BGM が流れない」）');
  const AU = w.Audio; w.localStorage.removeItem('mtq-title-sound');
  T(AU.titleSound() === true, 'タイトルの音：まだ選んでいないときは ON（最初のクリック・タップから鳴る）');
  w.localStorage.setItem('mtq-title-sound', 'off'); T(AU.titleSound() === false, 'タイトルで OFF にしたら OFF のまま'); w.localStorage.removeItem('mtq-title-sound');
  const sv = State.data; State.data = null; State.newGame('音', 'warrior'); T(State.data.settings.mute === false, '新しいゲームは音あり（タイトルの音が ON のとき）'); State.data = sv;
  T(typeof AU.bgmState === 'function' && typeof AU.bgmLevel === 'function' && typeof AU.bgmEngine === 'function', 'BGM の鳴らし方（読み込んでから／流しながら）と、状態・音の大きさを調べる部品');
  T(typeof AU.retryFiles === 'function' && /A\.retryFiles\(\)/.test(src('js/ui/menu.js')), '読めなかった曲を［もう一度鳴らす］・鳴らし方の切り替えで読み直す');
  T(/key: 'bgmEngine'/.test(src('js/ui/menu.js')) && /action: 'bgmdiag'/.test(src('js/ui/menu.js')) && typeof w.Menu.bgmDiag === 'function', '設定（音）：BGM の鳴らし方・BGM の状態を見る');
  const asrc = src('js/ui/audio.js'); T(/'pointerup', 'touchend', 'click'/.test(asrc), 'スマホ：指を離したとき（pointerup・touchend・click）にも音の許可をもらう');
  // 音を消しているセーブを読んだとき：1 回だけ聞く
  clean(); State.data.settings.mute = true; delete State.data.settings.soundAsk93;
  const q1 = settle(w.Title.soundAsk93()); await frames(3);
  const chTxt = top() ? top().textContent : ''; T(/音を出す/.test(chTxt) && /音なしのまま/.test(chTxt), '音を消しているセーブ：「音を出す／音なしのまま」を聞く');
  await press('ok'); await frames(4); T(q1.done && State.data.settings.mute === false && State.data.settings.soundAsk93 === true, '「音を出す」で音が出る設定になり、聞いたことを覚える');
  State.data.settings.mute = true; const q2 = settle(w.Title.soundAsk93()); await frames(3); T(q2.done && !(top() && /音を出す/.test(top().textContent)), '2 回目は聞かない（音なしのままを選んだ人にくり返し聞かない）');
  State.data.settings.mute = false; delete State.data.settings.soundAsk93; const q3 = settle(w.Title.soundAsk93()); await frames(3); T(q3.done && !State.data.settings.soundAsk93, '音が出る設定のセーブには聞かない');
  clean();

  console.log('\n結果：OK ' + okN + ' / NG ' + ng.length + (ng.length ? '\n' + ng.map((x) => '  - ' + x).join('\n') : ''));
  process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error('CRASH', e && e.stack || e); process.exit(2); });
