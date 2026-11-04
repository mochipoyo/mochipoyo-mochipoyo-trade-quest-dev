// v7.4 39ダンジョンの戦闘背景（2D・jsdom）：116マップの選び方（マップIDの完全一致）・ボス戦・隠し区画・船の上・対象外のマップ・画像のURL・
//   入ったときの先読み・品質「軽量」・画像が読めないとき・戦闘の画面につなぐ・前の版（v7.3）と同じ結果になる所
const path = require('path'); const fs = require('fs');
const load = require('../rpgload.js'); const { w, errors } = load(); w.requestAnimationFrame = (f) => setTimeout(() => f(w.performance.now()), 16);
const doc = w.document; const S = w.State, B = w.BattleUI, BG = w.BattleBG65, D = w.MAP_DEFS, W = w.World;
const ROOT = (process.env.RPG_DIR || '/home/claude/mochipoyo-trade-quest/').replace(/\/?$/, '/');
const BASE = process.env.BASE_DIR || '/home/claude/base74/';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/battle-backgrounds-dungeons39.json'), 'utf8'));
const ctxStub = new Proxy({ canvas: { width: 640, height: 416 } }, { get: (t, k) => k in t ? t[k] : (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => ({ addColorStop() { } }) : (k === 'measureText' ? () => ({ width: 10 }) : () => { }), set: (t, k, v) => { t[k] = v; return true; } });
(async () => {
  w.MochiQuest.boot(); await sleep(50); doc.querySelectorAll('#ui > *').forEach((n) => n.remove()); w.Engine.scenes = w.Engine.scenes.filter((s) => !s.overlay);
  S.newGame('t', 'warrior'); const d = S.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; W.start(); await sleep(30);
  const enemy = { enemies: [{ defId: 'slime' }] }; const bossB = (id) => ({ enemies: [{ defId: id, boss: true }] });
  const at = (id) => { W.map = W.getMap(id); };   // 戦闘の背景は、戦闘を始めた時の World.map から決まる
  // ① 116マップ・39枚
  const expect = {}; pack.assets.forEach((a) => a.maps.forEach((m) => { expect[m.mapId] = a; }));
  ok(Object.keys(expect).length === 116 && pack.assets.length === 39, 'ご提供の対応表：39枚・116マップ');
  const missing = Object.keys(expect).filter((id) => !D[id]), notDungeon = Object.keys(expect).filter((id) => D[id] && D[id].kind !== 'dungeon');
  ok(!missing.length && !notDungeon.length, 'いまのゲームのマップに116すべてがあり、どれもダンジョン（無くなった・名前の変わったマップなし）' + missing.concat(notDungeon).join(','));
  const bad = [];
  for (const id of Object.keys(expect)) {
    const a = expect[id]; at(id); const i1 = BG.infoFor(enemy, {}); const i2 = BG.infoFor(bossB('boss_bandit_chief'), { boss: true });
    if (i1.variant !== a.variant || i2.variant !== a.variant) bad.push(id + ' 絵 ' + i1.variant);
    if (i1.mapId !== id) bad.push(id + ' mapId');
    if (i1.place !== BG.placeOf(id, 'dungeon', null, null)) bad.push(id + ' 場所');
    if (!(i2.boss && i2.bossColor)) bad.push(id + ' ボスの色');
    const url = BG.photoUrl(BG.photoKey(i1)); if (url !== ((w.Assets && w.Assets.base) || '') + a.file) bad.push(id + ' URL ' + url);
    if (!fs.existsSync(path.join(ROOT, a.file))) bad.push(id + ' ファイルがない');
  }
  ok(!bad.length, '116マップ：通常の戦闘もボス戦も、そのエリアの絵（同じエリアの階・隠し区画は同じ1枚）・場所（粒や霧の種類）は前と同じ・ボスの色つき・画像のURLとファイル ' + bad.slice(0, 5).join(' | '));
  const hidden = pack.assets.reduce((n, a) => n + a.maps.filter((m) => m.hidden).length, 0); ok(hidden > 0, '隠し区画 ' + hidden + ' マップも主エリアの絵');
  ok(pack.assets.every((a) => typeof BG.PHOTO_HORIZON[a.variant] === 'number' && BG.PHOTO_HORIZON[a.variant] >= 0.35 && BG.PHOTO_HORIZON[a.variant] <= 0.65), '39枚それぞれの地平線の値（3Dの景色の遠景の板）');
  // ② 対象外は前の版（v7.3）と同じ
  const ids = Object.keys(D).filter((id) => !expect[id] && typeof D[id].rows !== 'function' && ['dungeon', 'field', 'town', 'interior'].includes(D[id].kind || 'town'));
  const old = JSON.parse(require('child_process').execFileSync('node', ['-e', `const load=require('./rpgload.js');const A=load();const w=A.w;w.State.newGame('t','warrior');const o={};${JSON.stringify(ids)}.forEach(id=>{try{w.World.map=w.World.getMap(id);const i=w.BattleBG65.infoFor({enemies:[{defId:'slime'}]},{});o[id]=[i.place,i.region,i.variant];}catch(e){o[id]=['ERR',String(e.message)];}});process.stdout.write(JSON.stringify(o));`], { cwd: path.join(__dirname, '..'), env: Object.assign({}, process.env, { RPG_DIR: BASE }), maxBuffer: 1 << 26 }).toString());
  const diff = []; ids.forEach((id) => { at(id); const i = BG.infoFor(enemy, {}); const o = old[id]; if (!o || o[0] !== i.place || o[1] !== i.region || o[2] !== i.variant) diff.push(id + ' ' + JSON.stringify(o) + '→' + [i.place, i.region, i.variant]); });
  ok(ids.length > 400 && !diff.length, '対象外のマップ ' + ids.length + '（迷いの森・忘却の洞窟・フィールド・町・屋内など）は前の版と同じ場所・地域・絵 ' + diff.slice(0, 4).join(' | '));
  at('lost_forest'); ok(!/^d39_/.test(BG.infoFor(enemy, {}).variant || ''), '迷いの森は今回の対象外（従来の背景）');
  // ③ 船の上・乗り物
  at('sunken_reef_1'); d.aboard = 'ship'; const sh = BG.infoFor(enemy, {}); d.aboard = null; ok(!/^d39_/.test(sh.variant || ''), '乗り物に乗っているとき（船の上の戦闘など）は、ダンジョンの絵にしない');
  W.map = W.getMap('world'); d.aboard = 'ship'; const sea = BG.infoFor(enemy, {}); d.aboard = null; ok(sea.place === 'sea' && (BG.onShip('ship') ? sea.variant === 'ship_deck' : true), '海の上の船の戦闘は従来どおり船の甲板');
  // ④ 入ったときの先読み（その絵だけ）
  d.settings.battleBg = 'high'; const s0 = pack.assets[4]; W.enterMap(s0.maps[0].mapId, 2, 2, 'down'); const st = BG.photoState(s0.variant);
  ok(st && /dungeons39\//.test(st.url) && st.url.endsWith(s0.file.split('/').pop()), '対象のダンジョンに入ると、その絵を先に読み始める（' + (st && st.url) + '）');
  // ⑤ 品質「軽量」・画像が読めないとき
  d.settings.battleBg = 'low'; at('iron_mine_1'); const li = BG.infoFor(enemy, {}); const lc = BG.render(li, 640, 416); ok(li.variant === 'd39_iron_mine' && lc && !lc._photo && !BG.usePhoto(), '品質「軽量」：画像を使わず、従来の軽い背景');
  delete d.settings.battleBg; at('demon_castle_5'); const ni = BG.infoFor(bossB('boss_bandit_chief'), { boss: true }); const nc = BG.render(ni, 640, 416); ok(nc && !nc._photo && BG.photoKey(ni) === 'd39_demon_castle', '画像がまだ・読めない（jsdom は画像を読めない＝404と同じ）ときは、従来の手描きの背景（例外なし）');
  // ⑥ 戦闘の画面につなぐ（実際の戦闘）
  const driver = setInterval(() => { const top = doc.getElementById('ui').lastElementChild; if (!top) return; if (top.classList.contains('rw-panel')) { const bt = top.querySelector('.rw-panel-close'); if (bt) bt.click(); else w.Engine.Input.press('ok'); } else if (top.classList.contains('rw-msg')) w.Engine.Input.press('ok'); }, 30);
  w.TradeUI.trial = async () => ({ score: 55 });
  const party = () => { S.newGame('t', 'warrior'); const dd = S.data; dd.flags.s3121_new_prologue = true; dd.flags.s3121_prologue_phase = 'done'; dd.hero.level = 40; dd.hero.jobLevels.warrior = 40; w.Actors.refreshSkills(dd.hero); const s = w.Actors.stats(dd.hero); dd.hero.hp = s.maxHp; dd.settings.autoBattle = true; dd.settings.battleSpeed = 'fast'; dd.settings.textSpeed = 'instant'; W.start(); };
  const fight = async (mapId, ids, opts) => { party(); await sleep(30); const m = W.getMap(mapId); let sx = 1, sy = 1; for (let y = 1; y < m.h - 1 && sx === 1; y++) for (let x = 1; x < m.w - 1; x++) if (m.passable(x, y, S.data)) { sx = x; sy = y; break; } W.enterMap(mapId, sx, sy, 'down');
    const sc0 = B.scene; const pr = B.start(ids, opts || {}); await sleep(200); for (let i = 0; i < 150 && B.scene === sc0; i++) await sleep(20); const sc = B.scene; const seen = sc && sc.bg65 ? { variant: sc.bg65.variant, mapId: sc.bg65.mapId, boss: sc.bg65.boss, place: sc.bg65.place } : null; if (sc) { sc.bg = null; sc.draw(ctxStub); seen.bg = !!sc.bg; }
    const r = await pr; return { seen, r }; };
  const f1 = await fight('iron_mine_2', ['slime']); ok(f1.seen && f1.seen.variant === 'd39_iron_mine' && f1.seen.mapId === 'iron_mine_2' && f1.seen.bg && f1.r === 'won', '鉄鎖鉱山 2階の戦闘：鉄鎖鉱山の絵・背景を描く・戦闘は最後まで進む');
  const f2 = await fight('a6_dc_statues', ['slime'], { boss: true }); ok(f2.seen && f2.seen.variant === 'd39_demon_castle' && f2.seen.boss && f2.r === 'won', '魔王城の隠し区画のボス戦：魔王城の絵（ボスの光はそのまま）');
  const f3 = await fight('sky_temple_1', ['slime']); ok(f3.seen && f3.seen.variant === 'd39_sky_temple' && f3.r === 'won', '別のエリアへ移ってからの戦闘：天空神殿の絵に切り替わる');
  const f4 = await fight('lost_forest', ['slime']); ok(f4.seen && !/^d39_/.test(f4.seen.variant || '') && f4.r === 'won', '対象外のダンジョン（迷いの森）の戦闘：従来の背景');
  clearInterval(driver);
  console.log('errors', errors.slice(0, 3)); ok(!errors.length, 'スクリプトのエラーなし');
  console.log('\n結果: ' + pass + ' OK / ' + fail + ' NG'); process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
