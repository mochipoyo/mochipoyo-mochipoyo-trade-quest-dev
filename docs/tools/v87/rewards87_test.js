// v8.7 ボス固有装備：表・初回報酬・台帳・旧セーブの補填の確かめ（jsdom）：node rewards87_test.js [2d]
//  画面の部品（Win）は待たずに進むように差し替える。戦闘（BattleUI.start）は「正規の鍵を受け取り、勝ち／負けを決めて、勝ちなら Combat.distribute」に差し替え
//  （実際のイベントの処理＝js/rpg/events.js・会話の台本・js/data/finale.js・js/data/bosslair19.js はそのまま動かす）
const fs = require('fs'), path = require('path');
const load = require('../v78/load78.js');
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w;
const ROOT = path.resolve(__dirname, '../../..');
const { State, Combat, Actors, ITEMS, ENEMIES, BossGear: UG, Events, MAP_DEFS } = w; const G = w.BOSS_UNIQUE_GEAR;
let ok = 0; const ng = []; const T = (c, m) => { if (c) ok++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
// 画面の部品
const W = w.Win; W.message = async () => { }; W.choice = async () => 0; W.toast = () => { }; W.panel = async () => { }; W.list = async () => -1; W.sleep = async () => { };
w.World.applyState = () => { }; w.World.gameOver = async () => { w.__gameOver = (w.__gameOver || 0) + 1; }; w.World.updateHud = () => { };
if (w.BossSymbol) { w.BossSymbol.intro = async () => { }; w.BossSymbol.introIfShown = async () => { }; }
if (w.Story3121) w.Story3121.temptation = async () => { };
if (w.Finale) w.Finale.choice = async () => { w.__ending = true; };
// 戦闘：OUTCOME（'won'|'lost'|'escaped'）で決める。最後の opts と、配った報酬を記録
let OUTCOME = 'won'; const LOG = [];
w.BattleUI.start = async function (ids, opts) {
  opts = opts || {}; const party = State.partyActors(); const b = Combat.create(ids, party, opts); let out = typeof OUTCOME === 'function' ? OUTCOME(ids, opts) : OUTCOME;
  let res = null; if (out === 'won') { b.enemies.forEach((e) => { e.dead = true; e.hp = 0; }); b.state = 'won'; b.result = Combat.rewards(b); res = Combat.distribute(b); res2 = Combat.distribute(b); }
  else b.state = out;
  LOG.push({ ids: ids.slice(), key: opts.bossRewardKey || null, boss: !!opts.boss, out, gear: res && res.bossGear ? res.bossGear : null }); return out;
};
var res2;
function fresh() { State.newGame('テスト', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; d.party = ['hero']; Actors.fullHeal(d.hero); return d; }
const own = (id) => UG.ownedCount(State.data, id);
console.log('== 読み込み：' + (two ? '2D 版' : '3D 版と同じ') + '　errors ' + A.errors.length);

/* ---------- 1・2 表の確かめ ---------- */
console.log('-- 表');
const rows = G.rows; const active = UG.activeRows();
T(rows.length === 74, '全 74 行（A27・B11・C5・D19・E6・F6）');
T(active.length === (two ? 44 : 68), 'いま遊べる行 ' + active.length + '（' + (two ? '2D 版：地球型の追加地域・異界の門を除く 44' : '68') + '）');
const ids = rows.map((r) => r.itemId); T(new Set(ids).size === 74, '装備 ID の重複 0（74 行）');
T(new Set(rows.map((r) => r.key)).size === 74, 'bossKey の重複 0');
T(active.every((r) => ITEMS[r.itemId]), '現役の行の装備の参照切れ 0');
T(rows.filter((r) => r.availability === 'reserved').every((r) => !ITEMS[r.itemId]), '予約 6 行の装備は ITEMS に入れていない（入手できない）');
const newRows = rows.filter((r) => r.availability === 'active' && r.status === 'new'), exRows = rows.filter((r) => r.availability === 'active' && r.status === 'existing');
T(newRows.length === 42 && exRows.length === 26, '新規 42・既存強化 26');
T(exRows.every((r) => { const it = ITEMS[r.itemId]; const b = r.before; return it.name === b.name && it.cat === b.cat && it.type === b.type && (it.atk || 0) === b.atk && (it.def || 0) === b.def && (it.mag || 0) === b.mag && (it.mdef || 0) === b.mdef && (it.agi || 0) === b.agi && (it.hp || 0) === b.hp && (it.mp || 0) === b.mp && (it.element || null) === b.element; }), '既存強化 26 点：ID・名前・装備の種類・基礎値・属性を変えていない');
T(exRows.every((r) => { const b = r.before.fx || {}; const it = ITEMS[r.itemId].fx || {}; return Object.keys(b).every((k) => k === 'counterChance' || JSON.stringify(it[k]) === JSON.stringify(b[k])); }), '既存強化：既存の効果（fx）を残している（笑わぬ大盾の反撃だけ固有効果へ移した）');
T(rows.filter((r) => r.availability === 'active').every((r) => { const it = ITEMS[r.itemId]; return Object.keys(w.JOBS).some((j) => it.cat === 'weapon' ? w.JOBS[j].weapons.indexOf(it.type) >= 0 : w.JOBS[j].armors.indexOf(it.type) >= 0); }), 'すべての装備に、装備できる職業が少なくとも 1 つ');
T(rows.filter((r) => r.availability === 'active').every((r) => ['weapon', 'armor', 'shield', 'head', 'acc'].indexOf(Actors.slotOf(r.itemId)) >= 0), '装備の枠は既存の 5 つ（武器・鎧・盾・頭・アクセサリー）だけ');
T(Actors.slotOf('iron_crown') === 'acc', '鉄の冠はアクセサリーのまま（頭へ移していない）');
T(rows.filter((r) => r.availability === 'active').every((r) => { const it = ITEMS[r.itemId]; return it.bossExclusive && it.sellable === false && it.discardable === false && it.unique && it.price === 0 && it.sourceBossKey === r.key; }), 'すべての固有装備に bossExclusive・売却不可・破棄不可・1 個だけ・値段 0・入手元');
T(!/先手/.test(ITEMS.b19_check_piece.desc) || /先手を取る確率ではない/.test(ITEMS.b19_check_piece.desc), '王手の駒の説明に「先手の確率」と書かない（最初の通常攻撃+30%）');
// 効果の type はすべて BossGear で計算する
const KNOWN = ['afterDefendNormal', 'statusCut', 'bigHitCut', 'afterHurtNormal', 'firstNormal', 'killHeal', 'normalHitDebuff', 'debuffCut', 'scannedCut', 'coverCut', 'aoeCut', 'debuffBlockOnce', 'mpCut', 'halfHpHeal', 'weakSpell', 'weakRefund', 'normalCrit', 'fasterFoePhys', 'firstSingleCut', 'evadeSingle', 'cycleDirect', 'debuffImmune', 'healBoost', 'mpLossGuard', 'sameTargetNormal', 'adaptiveResist', 'silencedSpell', 'spellSilence', 'reflectPhys', 'highHpNormal', 'curedNextPhys', 'healGrantCut', 'healDebuffed', 'lowHpCut', 'lethalSave', 'prevNormalNormal', 'lifesteal', 'switchStyle', 'packAura', 'spellDefendMp', 'scannedWeak', 'reviveBoost', 'stillness', 'everyThirdNormal', 'fixedRoll', 'tides', 'defendHeal', 'defendNextDirect', 'restorePoint', 'orbitFollow', 'doubleHitHeal', 'statusCleanseOnce', 'bigSingleCut', 'silencedPhys', 'onHitOncePerAction', 'rampHeal', 'lowHpDefendNormal', 'firstElementSpell', 'counterOnce', 'afterCounterCut', 'vsCharging', 'lowTargetHeal', 'defendMp', 'vsBuffed', 'forestHeal', 'cleanNormal', 'critPity', 'balance', 'contract', 'stealCut', 'entangle', 'firstKillHeal', 'defendThenHeal', 'periodicDebuffClear', 'killMp'];
const src = fs.readFileSync(path.join(ROOT, 'js/rpg/boss-unique-gear.js'), 'utf8');
const types = new Set(); rows.forEach((r) => r.effects.forEach((e) => types.add(e.type)));
T([...types].every((t) => KNOWN.indexOf(t) >= 0 && src.indexOf("E." + t) >= 0 || src.indexOf("'" + t + "'") >= 0), '効果の種類 ' + types.size + ' 個：すべて BossGear に計算の処理がある');
T(rows.filter((r) => r.availability === 'active').every((r) => r.effects.length || r.fxAdded || r.immuneAdded), 'すべての現役の行に、計算される固有効果がある（説明だけの効果はない）');

/* ---------- 漏れ・重複：ボスの戦闘と表の突き合わせ ---------- */
console.log('-- 漏れ・重複');
const bossDefs = Object.keys(ENEMIES).filter((k) => ENEMIES[k].boss && ENEMIES[k].region !== 'future');
T(bossDefs.every((k) => G.byKey[k] && UG.isActive(G.byKey[k])), '到達できるボスの定義 ' + bossDefs.length + ' 体すべてに行がある');
T(Object.keys(ENEMIES).filter((k) => ENEMIES[k].boss && ENEMIES[k].region === 'future').every((k) => G.byKey[k] && G.byKey[k].availability === 'reserved'), 'future のボス 6 定義は予約（入手できない）');
// マップの type:'boss' のイベントはすべて鍵が決まる・違う行が同じ装備を出さない
const evs = []; Object.keys(MAP_DEFS).forEach((m) => (MAP_DEFS[m].events || []).forEach((ev) => { if (ev.type === 'boss') evs.push({ m, ev }); }));
const evKeys = evs.map((x) => UG.keyForEvent(x.ev)); T(evKeys.every(Boolean), 'マップのボスのイベント ' + evs.length + ' か所すべてで鍵が決まる');
const itemSources = {}; rows.forEach((r) => { itemSources[r.itemId] = (itemSources[r.itemId] || 0) + 1; }); T(Object.values(itemSources).every((n) => n === 1), '同じ装備を出す行は 1 つだけ');
// ほかの入手先がない：ソースの文字（定義と表のファイル以外に装備 ID が出てこない）と、データ（宝箱・店・敵の drops・クエストの報酬）
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); const files = [...html.matchAll(/<script src="(js\/[^"?]+)/g)].map((m) => m[1]);
const ALLOW = ['js/data/items.js', 'js/data/bosses19.js', 'js/data/boss-unique-gear.js', 'js/rpg/boss-unique-gear.js', 'js/ui/menu.js'];
const leaks = []; const MOVED = G.movedDrops.map((m) => String(m).split('→')[1]); rows.filter((r) => r.availability === 'active').forEach((r) => { files.forEach((f) => { if (ALLOW.indexOf(f) >= 0) return; if (f === 'js/data/enemies.js' && MOVED.indexOf(r.itemId) >= 0) return; const s = fs.readFileSync(path.join(ROOT, f), 'utf8'); if (new RegExp("['\"]" + r.itemId + "['\"]").test(s)) leaks.push(r.itemId + '@' + f); }); });
T(leaks.length === 0, 'ソース：定義・表のほかに装備 ID が出てこない（店・宝箱・クエスト・盗み・交換に使われていない。enemies.js の既存の専用ドロップ 7 点は読み込み時に外す＝次の行で確かめる）' + (leaks.length ? JSON.stringify(leaks) : ''));
const dropLeak = []; Object.keys(ENEMIES).forEach((k) => (ENEMIES[k].drops || []).forEach((d) => { if (UG.locked(d.item)) dropLeak.push(k + '→' + d.item); }));
T(dropLeak.length === 0, '敵の drops に固有装備がない（既存の専用ドロップ 7 点は外した：' + G.movedDrops.length + '）' + (dropLeak.length ? JSON.stringify(dropLeak) : ''));
const chestLeak = []; Object.keys(MAP_DEFS).forEach((m) => (MAP_DEFS[m].chests || []).forEach((c) => { if (UG.locked(c.item)) chestLeak.push(m); }));
T(chestLeak.length === 0, '宝箱に固有装備がない');
const shopLeak = []; Object.keys(w.SHOP_ADD || {}).forEach((k) => (w.SHOP_ADD[k] || []).forEach((x) => { if (UG.locked(x.id)) shopLeak.push(k); }));
T(shopLeak.length === 0, '店の追加の品ぞろえに固有装備がない');
const qLeak = []; Object.keys(w.QUESTS || {}).forEach((k) => { const r = (w.QUESTS[k] || {}).reward || {}; [].concat(r.items || [], r.item ? [r.item] : []).forEach((it) => { if (UG.locked(typeof it === 'string' ? it : it.id || it.item)) qLeak.push(k); }); });
T(qLeak.length === 0, 'クエストの報酬に固有装備がない');

/* ---------- 3 初回報酬：正規の勝利で 1 個・2 回目 0 個 ---------- */
console.log('-- 初回報酬');
async function runEvent(mapId, pred) { const ev = (MAP_DEFS[mapId].events || []).find(pred); return Events.run(ev); }
(async () => {
  fresh(); OUTCOME = 'won'; LOG.length = 0;
  await runEvent('lost_forest_shrine', (e) => e.type === 'boss');
  T(LOG[0] && LOG[0].key === 'boss_lost_trend' && own('bu_trend_compass') === 1, 'マップのボス（トレンド迷子）：鍵 boss_lost_trend・勝つと 1 個');
  T(LOG[0].gear && LOG[0].gear.granted === true && res2.bossGear === LOG[0].gear, 'distribute を 2 回呼んでも 1 回分（同じ結果を返す）');
  State.data.flags.forest_boss = false; await runEvent('lost_forest_shrine', (e) => e.type === 'boss'); T(own('bu_trend_compass') === 1, '2 回目の勝利（フラグを戻して再戦）でも増えない');
  const d0 = State.data; T(d0.bossUniqueRewards.claimed.boss_lost_trend && d0.bossUniqueRewards.claimed.boss_lost_trend.item === 'bu_trend_compass', '台帳に記録（claimed）');
  // 負け・逃げ
  fresh(); OUTCOME = 'lost'; await runEvent('oblivion_cave_3', (e) => e.type === 'boss' && e.doneFlag === 'cave_boss'); T(own('bu_greed_crystal_mail') === 0 && !State.data.bossUniqueRewards.claimed.boss_greed_golem, '負けたら 0 個（台帳にも書かない）');
  OUTCOME = 'escaped'; await runEvent('oblivion_cave_3', (e) => e.type === 'boss' && e.doneFlag === 'cave_boss'); T(own('bu_greed_crystal_mail') === 0, '逃げた・中断も 0 個');
  // 敵が逃げた（全員 fled）：distribute は呼ばれない
  fresh(); const bf = Combat.create(['boss_greed_golem'], State.partyActors(), { boss: true, bossRewardKey: 'boss_greed_golem' }); bf.enemies[0].dead = true; bf.enemies[0].fled = true; bf.state = 'fled'; T(UG.grantForBattle(bf) && own('bu_greed_crystal_mail') === 0, '敵が撤退した戦闘では 0 個');
  // 鍵のない戦闘（デバッグ・通常の出現）
  fresh(); const bd = Combat.create(['boss_greed_golem'], State.partyActors(), { boss: true }); bd.enemies[0].dead = true; bd.state = 'won'; bd.result = Combat.rewards(bd); Combat.distribute(bd); T(own('bu_greed_crystal_mail') === 0, '鍵のない戦闘（デバッグで呼んだボス・模擬戦）では 0 個');
  // 鍵はあるが顔ぶれが違う
  fresh(); const bw = Combat.create(['slime'], State.partyActors(), { boss: true, bossRewardKey: 'boss_greed_golem' }); bw.enemies[0].dead = true; bw.state = 'won'; bw.result = Combat.rewards(bw); Combat.distribute(bw); T(own('bu_greed_crystal_mail') === 0 && bw.ugGrant && bw.ugGrant.reason === 'not-legit', '鍵と敵の顔ぶれが合わない戦闘では 0 個');
  // E 表：通常の出現の chain_warden などでは出ない／イベントでだけ
  fresh(); const ids0 = { chain_warden: 'bu_mine_captain_helm', federal_captain: 'bu_hald_audit_badge', quantum_shade: 'bu_entangled_ring', greed_shade: 'bu_desire_seal_bracer', fear_shade: 'bu_fear_seal_lantern', control_shade: 'bu_control_seal_circlet' };
  Object.keys(ids0).forEach((eid) => { if (!ENEMIES[eid]) return; const b = Combat.create([eid, eid], State.partyActors(), {}); b.enemies.forEach((e) => e.dead = true); b.state = 'won'; b.result = Combat.rewards(b); Combat.distribute(b); });
  T(Object.values(ids0).every((it) => own(it) === 0), '通常の chain_warden・federal_captain・quantum_shade・greed_shade・fear_shade・control_shade を倒しても E の装備は出ない');
  fresh(); OUTCOME = 'won'; LOG.length = 0; await runEvent('iron_mine_2', (e) => e.type === 'boss'); T(LOG[0].key === 'enc_mine_captain' && own('bu_mine_captain_helm') === 1, '鉄鎖鉱山の看守長戦（ボスのイベント）：鍵 enc_mine_captain・1 個');
  // 会話の台本：ボスの敵 ID で鍵が決まる／E は呼ぶ場所で encounter ID
  fresh(); LOG.length = 0; const c = Events.ctx(null); await c.battle(['boss_valen'], { boss: true }); T(LOG[0].key === 'boss_valen' && own('bu_valen_oathblade') === 1, '会話の戦い（騎士団長ヴァレン）：鍵 boss_valen・1 個');
  await c.battle(['federal_captain', 'federal_soldier', 'federal_soldier'], { boss: true }); T(LOG[1].key === null && own('bu_hald_audit_badge') === 0, '会話の戦いでも、通常の敵の組み合わせだけでは E の鍵にならない');
  // 実際の台本：財務局のハルド（kalion.js）・もつれ測定装置（academy.js）・魔王城の封印（finale.js）
  fresh(); LOG.length = 0; State.data.inventory.ledger_record = 3; const hald = (MAP_DEFS.kalion_finance.npcs || []).find((n) => n.id === 'kf_hald'); await hald.talk(Events.ctx(hald)); T(LOG.some((x) => x.key === 'enc_hald_guards') && own('bu_hald_audit_badge') === 1, '財務局のハルドの守備隊（台本）：鍵 enc_hald_guards・1 個');
  fresh(); LOG.length = 0; const dq = State.data; dq.quests.academy_entangle = { state: 'active' }; dq.flags.acad_e_lecture = true; dq.flags.acad_e_puzzle = true;
  const qev = (MAP_DEFS.vol_quantum.events || []).find((e) => e.type === 'script' && String(e.run).indexOf('quantum_shade') >= 0) || (MAP_DEFS.vol_quantum.events || []).find((e) => String(e.run || '').indexOf('acad_e_shade') >= 0);
  if (qev) { await Events.run(qev); T(LOG.some((x) => x.key === 'enc_quantum_shades') && own('bu_entangled_ring') === 1, 'もつれ測定装置の影 2 体（台本）：鍵 enc_quantum_shades・1 個'); } else T(false, 'もつれ測定装置のイベントが見つからない');
  for (let n = 1; n <= 3; n++) { fresh(); LOG.length = 0; const ev = MAP_DEFS['demon_castle_' + (n + 1)].events.find((e) => e.type === 'script' && e.x === 9 && e.y === 4); await Events.run(ev); T(LOG[0] && LOG[0].key === 'enc_castle_seal_' + n && own(G.byKey['enc_castle_seal_' + n].itemId) === 1, '魔王城の封印 ' + n + '（台本）：鍵 enc_castle_seal_' + n + '・1 個'); }
  // 異界の門（地球の世界だけ）：onWin と固有報酬の二重取得がない・能力の道具 2 個・G・十九の契約印はそのまま
  if (!two) {
    fresh(); LOG.length = 0; const d1 = State.data; const g0 = d1.gold; const B = w.BOSS19; const b0 = B.bosses[0];
    const lev = MAP_DEFS['lair19_' + b0.key].events.find((e) => e.type === 'boss'); await Events.run(lev);
    T(own(B.reward[b0.key]) === 1, '異界の門（' + b0.id + '）：装備は 1 個（戦闘の報酬で渡し、onWin では増やさない）');
    T((d1.inventory[b0.grow] || 0) === 2 && d1.gold >= g0 + b0.lv * 150, '異界の門：能力の最大値を上げる道具 2 個・追加の G はそのまま');
    // 19 体すべて → 十九の契約印
    for (const bb of B.bosses.slice(1)) { const ev = MAP_DEFS['lair19_' + bb.key].events.find((e) => e.type === 'boss'); await Events.run(ev); }
    T(B.bosses.every((bb) => own(B.reward[bb.key]) === 1) && own('b19_all_seal') === 1, '19 体：装備は各 1 個・十九の契約印 1 個（そのまま）');
    T(!ITEMS.b19_all_seal.bossExclusive, '十九の契約印はボス固有装備の数に入れない');
  }
  // 魔王の 3 形態：段階ごとに 1 品・負けても消えない・読み込み直しで重ならない
  fresh(); const dF = State.data; dF.party = ['hero']; LOG.length = 0;
  OUTCOME = (ids) => ids[0] === 'boss_demon_greed' ? 'lost' : 'won';
  await w.Finale.throne(Events.ctx(null));
  T(dF.flags.demon_fear && !dF.flags.demon_greed && own('bu_fear_break_shield') === 1 && own('bu_greed_limit_gauntlet') === 0, '恐怖に勝ち → 欲望で負け：恐怖の盾は 1 個残る');
  const saved = JSON.stringify(dF); State.data = State.importJSON(saved); OUTCOME = (ids) => ids[0] === 'boss_demon_fixed' ? 'lost' : 'won'; LOG.length = 0;
  await w.Finale.throne(Events.ctx(null));
  T(own('bu_fear_break_shield') === 1 && own('bu_greed_limit_gauntlet') === 1 && own('bu_open_future_blade') === 0 && !LOG.some((x) => x.ids[0] === 'boss_demon_fear'), '読み込み直し → 欲望に勝ち → 固定で負け：恐怖は戦い直さず、欲望 1 個');
  OUTCOME = 'won'; w.__ending = false; await w.Finale.throne(Events.ctx(null));
  T(own('bu_open_future_blade') === 1 && w.__ending && [own('bu_fear_break_shield'), own('bu_greed_limit_gauntlet')].every((n) => n === 1), '固定に勝つ → エンディングへ進む・3 品とも 1 個');

  /* ---------- 7 旧セーブの補填 ---------- */
  console.log('-- 旧セーブの補填');
  function oldSave(f) { fresh(); const d = State.data; delete d.bossUniqueRewards; if (f) f(d); return JSON.parse(JSON.stringify(d)); }
  let d = State.migrate(oldSave()); T(d.bossUniqueRewards && d.bossUniqueRewards.version === 1 && Object.keys(d.bossUniqueRewards.claimed).length === 0, '台帳のない旧セーブ：読み込みで台帳の形だけ足す（何も増やさない）');
  d = State.migrate(oldSave((x) => { x.flags.forest_boss = true; })); T(UG.ownedCount(d, 'bu_trend_compass') === 0, 'State.migrate（一覧・プレビューの読み込み）では補填しない');
  let r = UG.reconcile(d); T(r.granted.indexOf('bu_trend_compass') >= 0 && UG.ownedCount(d, 'bu_trend_compass') === 1, '討伐済み（forest_boss）・未所持 → 1 個補填');
  r = UG.reconcile(d); T(r.granted.length === 0 && UG.ownedCount(d, 'bu_trend_compass') === 1, '補填を 2 回しても増えない');
  d = State.migrate(oldSave()); r = UG.reconcile(d); T(r.granted.length === 0, '未討伐 → 補填なし');
  d = State.migrate(oldSave((x) => { x.flags.mirage_lord = true; x.inventory.mirage_veil = 1; })); r = UG.reconcile(d); T(UG.ownedCount(d, 'mirage_veil') === 1 && d.bossUniqueRewards.claimed.boss_mirage_lord, '討伐済み・持ち物にある → 増やさず台帳だけ');
  d = State.migrate(oldSave((x) => { x.flags.ash_lord_defeated = true; x.hero.equip.weapon = 'ash_hammer'; })); r = UG.reconcile(d); T(UG.ownedCount(d, 'ash_hammer') === 1 && d.inventory.ash_hammer === undefined, '主人公が装備中 → 増やさない');
  d = State.migrate(oldSave((x) => { x.flags.grote_rematch = true; State.data = x; const k = State.joinCompanion('kyle'); k.equip.acc = 'iron_crown'; x.party = ['hero']; })); r = UG.reconcile(d); T(UG.ownedCount(d, 'iron_crown') === 1 && !d.inventory.iron_crown, '控えの仲間が装備中 → 増やさない');
  d = State.migrate(oldSave((x) => { x.flags.ghost_captain_defeated = true; })); r = UG.reconcile(d); T(UG.ownedCount(d, 'captain_saber') === 1, '討伐済みで今は持っていない（昔の手放し）→ 1 回だけ補填');
  d = State.migrate(oldSave((x) => { x.flags.b19_mochiko = true; x.inventory.b19_golden_kine = 2; })); r = UG.reconcile(d); T(two || (d.inventory.b19_golden_kine === 2 && r.dupes.some((q) => q.item === 'b19_golden_kine')), '古いデータで 2 個持っている → 消さずに報告・追加しない');
  d = State.migrate(oldSave((x) => { x.bestiary.boss_storm_chief = { seen: true, defeated: 1 }; })); r = UG.reconcile(d); T(UG.ownedCount(d, 'bu_zaid_sand_bow') === 1 && /bestiary/.test(d.bossUniqueRewards.claimed.boss_storm_chief.via), 'フラグがなくても図鑑の撃破数（正規のボス戦にしか出ないボス）で補填');
  d = State.migrate(oldSave((x) => { x.bestiary.boss_storm_chief = { seen: true, scanned: true }; })); r = UG.reconcile(d); T(UG.ownedCount(d, 'bu_zaid_sand_bow') === 0, '図鑑で見た・解析しただけでは補填しない');
  d = State.migrate(oldSave((x) => { x.bestiary.chain_warden = { seen: true, defeated: 5 }; })); r = UG.reconcile(d); T(UG.ownedCount(d, 'bu_mine_captain_helm') === 0, 'E（通常の敵を使うイベント）は図鑑の撃破数を根拠にしない');
  d = State.migrate(oldSave((x) => { x.flags.forest_boss = true; x.flags.cave_boss = true; })); UG.reconcile(d); const j = State.importJSON(JSON.stringify(d)); const r3 = UG.reconcile(j); T(r3.granted.length === 0 && UG.ownedCount(j, 'bu_trend_compass') === 1, 'JSON の書き出し → 読み込み → 補填：増えない');
  // 遊び始め（World.start）で 1 回だけ・知らせは 1 回
  const msgs = []; W.message = async (lines) => { msgs.push(lines); }; fresh(); State.data.flags.forest_boss = true; State.data.flags.cave_boss = true; delete State.data.bossUniqueRewards.claimed.boss_lost_trend; UG.afterStart(); await new Promise((r) => setTimeout(r, 30)); UG.afterStart(); await new Promise((r) => setTimeout(r, 30));
  T(msgs.length === 1 && /過去の討伐記録から固有装備を受け取りました：2点/.test(msgs[0][0]), '遊び始めの補填の知らせは 1 回だけ（「過去の討伐記録から固有装備を受け取りました：2点」）');
  T(!msgs[0].join('').match(/グロート|ヴァレン|魔王/), '知らせに未討伐のボスの名前を出さない');
  // 保存に失敗したとき：黙らずに知らせる・持ち物の補填は残る
  { const sv = State.autosave; State.autosave = () => false; msgs.length = 0; fresh(); State.data.flags.cave_boss = true; UG.afterStart(); await new Promise((r) => setTimeout(r, 30)); State.autosave = sv;
    T(msgs.length === 1 && msgs[0].some((l) => /保存に失敗しました/.test(l)) && own('bu_greed_crystal_mail') === 1, '補填のあと保存に失敗：知らせに「保存に失敗しました…もう一度保存」を出す・持ち物の補填は消えない'); }
  // 戦闘のあとの保存に失敗したとき（js/ui/battle.js）：ボス固有装備を受け取った戦闘だけ通知を出す処理がある
  T(/sv87 === false && b\.ugGrant && b\.ugGrant\.granted && Win\.toast/.test(fs.readFileSync(path.join(ROOT, 'js/ui/battle.js'), 'utf8')), '戦闘のあとの保存に失敗したら通知する処理がある（ソースの確認。画面では未確認）');
  W.message = async () => { };

  /* ---------- 売却・取り上げ・転職 ---------- */
  console.log('-- 売れない・取り上げない・転職');
  fresh(); State.addItem('bu_trend_compass', 1); const sellable = Object.keys(State.data.inventory).filter((id) => ITEMS[id] && ITEMS[id].price > 0 && !UG.locked(id)); T(sellable.indexOf('bu_trend_compass') < 0, '売る一覧に出ない');
  Events.ctx(null).take('bu_trend_compass', 1); T(own('bu_trend_compass') === 1, 'イベントの take でも取り上げない');
  fresh(); const hh = State.data.hero; State.addItem('bu_valen_oathblade', 1); w.Services.equipItem(hh, 'bu_valen_oathblade'); T(own('bu_valen_oathblade') === 1 && hh.equip.weapon === 'bu_valen_oathblade', '装備しても 1 個のまま');
  Actors.changeJob(hh, 'mage'); (hh._unequipped || []).forEach((id) => State.addItem(id, 1)); hh._unequipped = []; T(own('bu_valen_oathblade') === 1 && State.data.inventory.bu_valen_oathblade === 1, '装備できない職業へ転職 → 外れて持ち物へ（なくならない）');

  console.log('結果: ' + ok + ' OK / ' + ng.length + ' NG ' + JSON.stringify(ng));
  process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
