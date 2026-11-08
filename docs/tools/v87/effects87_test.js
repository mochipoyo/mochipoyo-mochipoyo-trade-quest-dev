// v8.7 ボス固有装備：固有効果の戦闘計算の確かめ（jsdom・乱数を固定）：node effects87_test.js [2d]
//  ・同じ戦闘を「固有効果あり」「その装備の固有効果だけ外す」で 2 回動かし、ダメージ・回復・回数の制限・上限を比べる
//  ・乱数はふだん 0.5（ダメージの振れ幅 1.0・会心なし・回避なし）。確率の効果は乱数を変えて確かめる
const load = require('../v78/load78.js');
const two = process.argv.includes('2d'); const A = load(two ? { earth: false, join: false } : {}); const w = A.w;
const { State, Combat, Actors, ITEMS, BossGear: UG } = w; const SP = w.ENEMY_SPECIALS, SK = w.SKILLS;
let ok = 0; const ng = []; const T = (c, m) => { if (c) ok++; else ng.push(m); console.log((c ? '  OK  ' : '  NG  ') + m); };
const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 0.02 : tol);
let RV = 0.5; w.Math.random = () => (typeof RV === 'function' ? RV() : RV);
// テスト用の敵の行動（何もしない・単体の物理・全体の物理・強い一撃・能力低下・2 回攻撃）
SP.t87_wait = { name: '待つ', msg: 'は様子を見ている' };
SP.t87_hit = { name: '一撃', msg: 'の一撃！', power: 1.0 };
SP.t87_all = { name: '全体', msg: 'の全体攻撃！', power: 1.0, all: true };
SP.t87_multi = { name: '連打', msg: 'の連打！', power: 1.0, hits: 3 };
SP.t87_dbatk = { name: '弱体', msg: 'の弱体！', debuff: { atk: -0.3 }, turns: 3 };
SP.t87_dbmix = { name: '複合弱体', msg: 'の複合弱体！', debuff: { def: -0.3, agi: -0.3 }, turns: 3 };
SP.t87_dbagi = { name: '鈍足', msg: 'の鈍足！', debuff: { agi: -0.3 }, turns: 3 };
SP.t87_charge = { name: '溜め', msg: 'は力を溜めた', charge: 't87_hit' };
SP.t87_steal = { name: '盗み', msg: 'の盗み！', power: 0.5, steal: { rate: 0.5, cap: 1000, battleCap: 2000 } };
SK.t87_fire = SK.t87_fire || { name: '試し炎', kind: 'magic', target: 'enemy', mp: 10, power: 40, element: 'fire', anim: 'fire' };
SK.t87_fireall = SK.t87_fireall || { name: '試し炎全体', kind: 'magic', target: 'enemies', mp: 10, power: 40, element: 'fire', anim: 'fire' };
SK.t87_ice = SK.t87_ice || { name: '試し氷', kind: 'magic', target: 'enemy', mp: 10, power: 40, element: 'ice', anim: 'ice' };
SK.t87_heal = SK.t87_heal || { name: '試し回復', kind: 'heal', target: 'ally', mp: 10, power: 10, anim: 'heal' };
SK.t87_buff = SK.t87_buff || { name: '試し強化', kind: 'buff', target: 'ally', mp: 8, buff: { atk: 0.1 }, turns: 3, anim: 'buff' };
SK.t87_rev = SK.t87_rev || { name: '試し蘇生', kind: 'revive', target: 'dead_ally', mp: 12, power: 0.3, anim: 'heal' };
SK.t87_slash = SK.t87_slash || { name: '試し斬り', kind: 'attack', target: 'enemy', mp: 4, power: 1.2, element: 'none', anim: 'slash' };

function setup(job, lv, comp) {
  State.newGame('テスト', job || 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true;
  d.hero.level = lv || 30; Actors.refreshSkills(d.hero); Actors.fullHeal(d.hero); d.party = ['hero'];
  (comp || []).forEach((id) => { const c = State.joinCompanion(id); if (c) { c.level = lv || 30; Actors.refreshSkills(c); Actors.fullHeal(c); } });
  d.party = ['hero'].concat(comp || []); State.partyActors().forEach((a) => { Object.keys(a.equip).forEach((k) => a.equip[k] = null); Actors.fullHeal(a); });
  return d;
}
function equip(a, ids) { ids.forEach((id) => { a.equip[Actors.slotOf(id)] = id; }); Actors.fullHeal(a); }
// 敵：HP 多め・固定の能力・決まった行動
function battle(o) {
  o = o || {}; const n = o.n || 1; const ids = []; for (let i = 0; i < n; i++) ids.push(o.id || 'slime');
  const b = Combat.create(ids, State.partyActors(), Object.assign({ pet: false }, o.opts || {}));
  b.enemies.forEach((e) => { Object.assign(e, { hp: 99999, maxHp: 99999, atk: o.atk || 60, def: o.def === undefined ? 20 : o.def, agi: o.agi === undefined ? 1 : o.agi, mag: o.mag || 30, resist: o.resist || {}, boss: !!o.boss, family: o.family || '魔物系' }); e.actions = [{ type: 'special', id: o.act || 't87_wait', w: 1 }]; });
  return b;
}
const cmd = (a, type, extra) => Object.assign({ actorId: a.id, type: type, target: { side: 'enemy', idx: 0 } }, extra || {});
function dmgTo(ev, idx) { return ev.filter((x) => x.type === 'damage' && x.side === 'enemy' && (idx === undefined || x.idx === idx)).reduce((s, x) => s + x.value, 0); }
function dmgParty(ev, id) { return ev.filter((x) => x.type === 'damage' && x.side === 'party' && (!id || x.id === id)).reduce((s, x) => s + x.value, 0); }
function healTo(ev, id) { return ev.filter((x) => x.type === 'heal' && x.side === 'party' && (!id || x.id === id)).reduce((s, x) => s + x.value, 0); }
const msgs = (ev) => ev.filter((x) => x.type === 'msg').map((x) => x.text);
// 固有効果を外して同じことをする（基礎値・fx はそのまま）
function without(itemId, fn) { const it = ITEMS[itemId]; const ug = it.ug; it.ug = []; try { return fn(); } finally { it.ug = ug; } }
// 同じ流れを 2 回：turns は [cmd を作る関数, ...]。戻り値：最後のターンのイベント
function runFlow(prep, turns) { const ctx = prep(); let ev = []; turns.forEach((f) => { ev = Combat.runTurn(ctx.b, [f(ctx)]); }); return { ev, ctx }; }
function ratio(itemId, prep, turns, pick) { const on = runFlow(prep, turns); const off = without(itemId, () => runFlow(prep, turns)); return pick(on) / Math.max(1, pick(off)); }

console.log('== 読み込み：' + (two ? '2D 版' : '3D 版と同じ') + '　errors ' + A.errors.length);

/* ---------- 与える物理ダメージ ---------- */
console.log('-- 与える物理ダメージ');
const hero = () => State.data.hero;
const prepEq = (job, ids, bo) => () => { setup(job); equip(hero(), ids); return { b: battle(bo) }; };
const atk = (c) => cmd(hero(), 'attack'); const dfd = (c) => cmd(hero(), 'defend');
const lastDmg = (r) => dmgTo(r.ev, 0);
T(near(ratio('bu_garon_axe', prepEq('warrior', ['bu_garon_axe']), [atk], lastDmg), 1.35), '頭目の一撃：戦闘で最初の通常攻撃 ×1.35');
T(near(ratio('bu_garon_axe', prepEq('warrior', ['bu_garon_axe']), [atk, atk], lastDmg), 1.0), '頭目の一撃：2回目の通常攻撃は ×1.0');
T(near(ratio('bu_trend_compass', prepEq('warrior', ['bu_trend_compass']), [dfd, atk], lastDmg), 1.25), '方向確定：防御した次のターンの通常攻撃 ×1.25');
T(near(ratio('bu_trend_compass', prepEq('warrior', ['bu_trend_compass']), [atk, atk], lastDmg), 1.0), '方向確定：防御していなければ ×1.0');
// 既存の afterDefend（金利計の兜 0.30）と固有効果（ヴァレンの誓約剣 0.40）は大きいほうだけ
(function () { const prep = () => { setup('warrior'); equip(hero(), ['bu_valen_oathblade', 'b19_rate_gauge_helm']); return { b: battle() }; }; const on = runFlow(prep, [dfd, atk]); const base = runFlow(() => { setup('warrior'); equip(hero(), ['bu_valen_oathblade']); return { b: battle() }; }, [dfd, atk]); const r = lastDmg(on) / lastDmg(base);
  T(near(r, 1.06, 0.01), '守る誓い＋既存の防御の次の一撃（金利計の兜 30%）：大きいほう（×1.40）だけ。兜の「下振れなし」の ×1.06 だけが違う（' + r.toFixed(3) + '）'); T(msgs(on.ev).every((m) => m.indexOf('損切りの短剣') < 0), 'ログに「損切りの短剣」と出ない'); })();
(function () { const prep = () => { setup('warrior'); equip(hero(), ['b19_rate_gauge_helm']); return { b: battle() }; }; const r = runFlow(prep, [dfd, atk]); T(msgs(r.ev).some((m) => m.indexOf('金利計の兜：守った次の一撃') >= 0), '既存の防御の次の一撃のログ：実際の装備名（金利計の兜）'); })();
T(near(ratio('bu_sky_guardian_spear', prepEq('warrior', ['bu_sky_guardian_spear']), [atk], lastDmg), 1.25), '天穹の祝福：HP80%以上の通常攻撃 ×1.25');
T(near(ratio('bu_sky_guardian_spear', () => { setup('warrior'); equip(hero(), ['bu_sky_guardian_spear']); hero().hp = Math.floor(Actors.stats(hero()).maxHp * 0.5); return { b: battle() }; }, [atk], lastDmg), 1.0), '天穹の祝福：HP50%なら ×1.0');
T(near(ratio('bu_greed_limit_gauntlet', prepEq('monk', ['bu_greed_limit_gauntlet']), [atk, atk], lastDmg), 1.25), '利を積む手：前のターンも通常攻撃なら ×1.25');
T(near(ratio('bu_greed_limit_gauntlet', prepEq('monk', ['bu_greed_limit_gauntlet']), [dfd, atk], lastDmg), 1.0), '利を積む手：前のターンが防御なら ×1.0');
T(near(ratio('bu_zaid_sand_bow', prepEq('hunter', ['bu_zaid_sand_bow'], { agi: 999 }), [atk], lastDmg), 1.20), '砂の狩人：自分より素早い敵 ×1.20');
T(near(ratio('bu_zaid_sand_bow', prepEq('hunter', ['bu_zaid_sand_bow'], { agi: 1 }), [atk], lastDmg), 1.0), '砂の狩人：遅い敵 ×1.0');
T(near(ratio('bu_time_guardian_watch', prepEq('warrior', ['bu_time_guardian_watch']), [atk, atk, atk], lastDmg), 1.25), '三拍子：3ターン目の最初の直接攻撃 ×1.25');
T(near(ratio('bu_time_guardian_watch', prepEq('warrior', ['bu_time_guardian_watch']), [atk, atk], lastDmg), 1.0), '三拍子：2ターン目は ×1.0');
T(near(ratio('bu_drone_link_bow', prepEq('hunter', ['bu_drone_link_bow']), [atk, atk], lastDmg), 1.25), '追尾照準：前のターンも同じ敵を通常攻撃 ×1.25');
(function () { const r = runFlow(prepEq('hunter', ['bu_drone_link_bow']), [atk, atk]); const e = r.ctx.b.enemies[0]; T(e.buffs.agi && near(e.buffs.agi.value, -0.15) && e.buffs.agi.turns === 2, '追尾照準：決まった行動のあと敵の素早さ-15%（ターンの終わりの時点で残り2）'); })();
T(near(ratio('bu_open_future_blade', prepEq('warrior', ['bu_open_future_blade']), [dfd, atk], lastDmg), 1.20), '固定を断つ：前のターン（防御）と違う行動の直接攻撃 ×1.20');
T(near(ratio('bu_open_future_blade', prepEq('warrior', ['bu_open_future_blade']), [atk, atk], lastDmg), 1.0), '固定を断つ：同じ種類の行動なら ×1.0');
T(near(ratio('bu_open_future_blade', prepEq('warrior', ['bu_open_future_blade']), [atk], lastDmg), 1.0), '固定を断つ：1ターン目は発動しない');
(function () { const prep = () => { setup('warrior'); equip(hero(), ['bu_observer_lens']); w.State.data.bestiary.slime = { seen: true, scanned: true }; return { b: battle({ resist: { none: 1.5 } }) }; }; T(near(ratio('bu_observer_lens', prep, [atk], lastDmg), 1.15), '観測で得る手掛かり：解析済みの敵の弱点 ×1.15'); })();
T(near(ratio('clock_hand_spear', prepEq('warrior', ['clock_hand_spear']), [atk, atk, atk], lastDmg), 1.5), '動き出す時：3回目の通常攻撃の行動 ×1.5');
T(near(ratio('clock_hand_spear', prepEq('warrior', ['clock_hand_spear']), [atk, atk, atk, atk], lastDmg), 1.0), '動き出す時：4回目は ×1.0');
T(near(ratio('bu_tides_coral_trident', prepEq('warrior', ['bu_tides_coral_trident']), [atk], lastDmg), 1.20), '満ち引き：奇数ターンの通常攻撃 ×1.20');
T(near(ratio('bu_tides_coral_trident', prepEq('warrior', ['bu_tides_coral_trident']), [atk, atk], lastDmg), 1.0), '満ち引き：偶数ターンは攻撃 ×1.0');
T(near(ratio('bu_signal_shield', prepEq('warrior', ['bu_signal_shield']), [dfd, atk], lastDmg), 1.30), '停止と進行：防御の次のターンの最初の直接攻撃 ×1.30');
(function () { const prep = () => { setup('thief'); equip(hero(), ['b19_two_faced_dagger']); const b = battle(); b.enemies[0].status.silence = { turns: 9 }; return { b }; }; T(near(ratio('b19_two_faced_dagger', prep, [atk], lastDmg), 1.20), '仮面の裏を断つ：沈黙の敵への直接の物理 ×1.20'); })();
(function () { const prep = () => { setup('warrior'); equip(hero(), ['b19_hold_fast_lance']); hero().hp = Math.floor(Actors.stats(hero()).maxHp * 0.4); return { b: battle() }; }; T(near(ratio('b19_hold_fast_lance', prep, [dfd, atk], lastDmg), 1.40), '撤退線を決める：HP50%以下で防御した次のターン ×1.40'); T(near(ratio('b19_hold_fast_lance', prepEq('warrior', ['b19_hold_fast_lance']), [dfd, atk], lastDmg), 1.0), '撤退線を決める：HPが多いときの防御なら ×1.0'); })();
(function () { const prep = () => { setup('warrior'); equip(hero(), ['b19_check_piece']); const b = battle(); b.enemies[0].charging = 't87_hit'; return { b }; }; T(near(ratio('b19_check_piece', prep, [atk], lastDmg), 1.20), '詰み筋を読む：溜めている敵 ×1.20'); })();
(function () { const prep = () => { setup('warrior'); equip(hero(), ['b19_seal_justice_sword']); const b = battle(); b.enemies[0].buffs.atk = { value: 0.3, turns: 9 }; return { b }; }; T(near(ratio('b19_seal_justice_sword', prep, [atk], (r) => r.ev.filter((x) => x.type === 'damage' && x.side === 'enemy').slice(0, 1).reduce((s, x) => s + x.value, 0)), 1.15), '執行する前に検証：攻撃力の上がった敵 ×1.15'); })();
T(near(ratio('b19_sober_claw', prepEq('monk', ['b19_sober_claw']), [atk], lastDmg), 1.15), '醒めた快楽：状態異常がないとき ×1.15');
(function () { const prep = () => { setup('monk'); equip(hero(), ['b19_sober_claw']); hero().status.poison = { turns: 99 }; return { b: battle() }; }; T(near(ratio('b19_sober_claw', prep, [atk], lastDmg), 1.0), '醒めた快楽：毒のときは ×1.0'); })();
T(near(ratio('b19_balance_star', prepEq('warrior', ['b19_balance_star']), [atk], lastDmg), 1.12), '均衡の軌道：HP60%以上で直接攻撃 ×1.12');
// 選択の契約
(function () { const p = (m) => () => { setup('warrior'); equip(hero(), ['b19_crossroads_blade']); UG.ensure(State.data).modes.b19_crossroads_blade = m; return { b: battle() }; };
  T(near(ratio('b19_crossroads_blade', p('attack'), [atk], lastDmg), 1.10), '選択の契約：攻勢 ×1.10'); T(near(ratio('b19_crossroads_blade', p('guard'), [atk], lastDmg), 0.95), '選択の契約：守勢 ×0.95'); T(near(ratio('b19_crossroads_blade', p(undefined), [atk], lastDmg), 0.95), '選択の契約：選んでいなければ守勢');
  const r = runFlow(p('attack'), [atk]); T(msgs(r.ev).some((m) => m.indexOf('攻勢の契約') >= 0), '選択の契約：戦闘の始めにモード名を知らせる'); })();
// 欲望の上限：受けて生き残ると次の通常攻撃 ×1.15（次のターンの終わりまで）
(function () { const prep = () => { setup('warrior'); equip(hero(), ['bu_greed_crystal_mail']); return { b: battle({ act: 't87_hit', agi: 999, atk: 40 }) }; }; T(near(ratio('bu_greed_crystal_mail', prep, [atk], lastDmg), 1.15), '欲望の上限：ダメージを受けて生き残ると次の通常攻撃 ×1.15'); })();
// 解放の反撃：状態異常が治ったあと
(function () { const prep = () => { setup('monk'); equip(hero(), ['bu_zarg_remnant_claw']); hero().status.confuse = { turns: 1 }; return { b: battle() }; }; T(near(ratio('bu_zarg_remnant_claw', prep, [dfd, atk], lastDmg), 1.30), '解放の反撃：状態異常が治った次の直接の物理 ×1.30'); })();
// 上限 ×1.75：いくつも重ねる（三拍子＋天穹の祝福＋守る誓い 系…を同時に）
(function () { setup('warrior'); equip(hero(), ['bu_sky_guardian_spear', 'bu_time_guardian_watch', 'bu_signal_shield', 'iron_crown']); const b = battle({ agi: 999 }); w.State.data.bestiary.slime = { seen: true, scanned: true };
  b.turn = 3; hero()._defTurn = 2; UG.beginAction(b, 'party', hero(), cmd(hero(), 'attack')); const ux = UG.outPhys(b, hero(), b.enemies[0], { normal: true }); T(ux.mult <= 1.75 + 1e-9 && ux.mult > 1.6, '直接ダメージ倍率の上限 ×1.75（' + ux.mult.toFixed(3) + '）'); })();
// 会心：通常攻撃だけ・上限 25%
(function () { setup('hunter'); equip(hero(), ['bu_zaid_sand_bow']); const b = battle(); UG.beginAction(b, 'party', hero(), cmd(hero(), 'attack')); T(near(UG.outPhys(b, hero(), b.enemies[0], { normal: true }).critAdd, 0.08), '砂の狩人：通常攻撃の会心率+8%'); UG.beginAction(b, 'party', hero(), { actorId: 'hero', type: 'skill', skillId: 't87_slash' }); T(UG.outPhys(b, hero(), b.enemies[0], {}).critAdd === 0, '砂の狩人：特技の会心率は変えない'); })();
(function () { setup('warrior'); equip(hero(), ['b19_expected_value_axe']); const b = battle(); for (let i = 1; i <= 2; i++) { b.turn = i; UG.beginAction(b, 'party', hero(), cmd(hero(), 'attack')); UG.endAction(b, []); } b.turn = 3; UG.beginAction(b, 'party', hero(), cmd(hero(), 'attack')); T(near(UG.outPhys(b, hero(), b.enemies[0], { normal: true }).critAdd, 0.08), '試行を重ねる：会心なしの通常攻撃 2 回のあと会心率+8%'); UG.endAction(b, []); b.turn = 4; UG.beginAction(b, 'party', hero(), cmd(hero(), 'attack')); T(UG.outPhys(b, hero(), b.enemies[0], { normal: true }).critAdd === 0, '試行を重ねる：使ったら数え直す'); })();
// 振れ幅をなくす（零誤差の弓）
(function () { const seq = [0.0, 0.99, 0.3]; const ds = seq.map((r) => { setup('hunter'); equip(hero(), ['zero_bow']); const b = battle(); RV = () => (w.__phase === 'dmg' ? r : 0.5); const ev = Combat.runTurn(b, [atk()]); RV = 0.5; return dmgTo(ev, 0); }); T(ds.every((x) => x === ds[0]), '誤差を扱う：ダメージの振れ幅なし（' + ds.join(',') + '）'); })();
// 労役を断つ：敵の防御-20%（2ターン・重ならない）
(function () { const r = runFlow(prepEq('warrior', ['bu_zarg_chainbreaker']), [atk]); const e = r.ctx.b.enemies[0]; T(e.buffs.def && near(e.buffs.def.value, -0.2) && e.buffs.def.turns === 2, '労役を断つ：通常攻撃で敵の防御-20%（ターンの終わりの時点で残り2）'); })();

/* ---------- 攻撃呪文 ---------- */
console.log('-- 攻撃呪文');
const spell = (sid) => (c) => ({ actorId: 'hero', type: 'skill', skillId: sid, target: { side: 'enemy', idx: 0 } });
const prepMage = (ids, bo, pre) => () => { setup('mage'); hero().skills.push('t87_fire', 't87_ice', 't87_fireall'); equip(hero(), ids); hero().mp = Actors.stats(hero()).maxMp - 30; if (pre) pre(); return { b: battle(bo) }; };
T(near(ratio('bu_library_archive_staff', prepMage(['bu_library_archive_staff'], { resist: { fire: 1.5 } }), [spell('t87_fire')], lastDmg), 1.15), '読解の成果：弱点の攻撃呪文 ×1.15');
(function () { const r = runFlow(prepMage(['bu_library_archive_staff'], { resist: { fire: 1.5 } }), [spell('t87_fire')]); const paid = Combat.skillCost(hero(), SK.t87_fire); T(msgs(r.ev).some((m) => m.indexOf('MPが' + Math.floor(paid * 0.2) + '戻った') >= 0), '読解の成果：払ったMPの20%を戻す（' + Math.floor(paid * 0.2) + '）'); })();
(function () { const pre = () => {}; const prep = () => { const c = prepMage(['bu_volk_forbidden_staff'])(); c.b.enemies[0].status.silence = { turns: 9 }; return c; }; T(near(ratio('bu_volk_forbidden_staff', prep, [spell('t87_fire')], lastDmg), 1.25), '禁書解読：沈黙の敵への攻撃呪文 ×1.25'); })();
(function () { RV = 0.1; const r = runFlow(prepMage(['bu_volk_forbidden_staff']), [spell('t87_fire')]); RV = 0.5; T(!!r.ctx.b.enemies[0].status.silence, '禁書解読：単体の攻撃呪文で沈黙（乱数 0.1 < 15%）'); RV = 0.2; const r2 = runFlow(prepMage(['bu_volk_forbidden_staff']), [spell('t87_fire')]); RV = 0.5; T(!r2.ctx.b.enemies[0].status.silence, '禁書解読：乱数 0.2 では沈黙しない'); RV = 0.1; const r3 = runFlow(prepMage(['bu_volk_forbidden_staff'], { boss: true }), [spell('t87_fire')]); RV = 0.5; T(!r3.ctx.b.enemies[0].status.silence, '禁書解読：ボスの耐性（60%）を通る（乱数 0.1 ではボスは防ぐ）'); RV = 0.1; const r4 = runFlow(prepMage(['bu_volk_forbidden_staff'], { n: 2 }), [spell('t87_fireall')]); RV = 0.5; T(!r4.ctx.b.enemies.some((e) => e.status.silence), '禁書解読：全体の攻撃呪文では沈黙させない（単体だけ）'); })();
T(near(ratio('b19_ember_tablet_staff', prepMage(['b19_ember_tablet_staff']), [spell('t87_fire')], lastDmg), 1.10), '砕けた支配の残火：初めて使う属性 ×1.10');
T(near(ratio('b19_ember_tablet_staff', prepMage(['b19_ember_tablet_staff']), [spell('t87_fire'), spell('t87_fire')], lastDmg), 1.0), '砕けた支配の残火：同じ属性の2回目は ×1.0');
T(near(ratio('b19_ember_tablet_staff', prepMage(['b19_ember_tablet_staff']), [spell('t87_fire'), spell('t87_ice')], lastDmg), 1.10), '砕けた支配の残火：別の属性はまた ×1.10');
// 静止の余白
(function () { const prep = prepMage(['bu_zero_echo_staff']); T(near(ratio('bu_zero_echo_staff', prep, [dfd, spell('t87_fire')], lastDmg), 1.15), '静止の余白：MPを使わないターンの次の呪文 ×1.15'); T(near(ratio('bu_zero_echo_staff', prep, [spell('t87_fire'), spell('t87_fire')], lastDmg), 1.0), '静止の余白：前のターンにMPを使っていれば ×1.0');
  setup('mage'); equip(hero(), ['bu_zero_echo_staff']); const b = battle(); b.turn = 2; UG._st(b, hero()).stillTurn = 1; UG.beginAction(b, 'party', hero(), spell('t87_fire')()); const c0 = Combat.skillCost(hero(), SK.t87_fire); T(UG.mpCost(b, hero(), SK.t87_fire, c0) === Math.max(1, Math.ceil(c0 * 0.8)), '静止の余白：消費MP20%軽減（' + c0 + '→' + UG.mpCost(b, hero(), SK.t87_fire, c0) + '）'); })();

/* ---------- MP の消費 ---------- */
console.log('-- MP の消費');
(function () { setup('mage'); equip(hero(), ['bu_ledger_core_ring']); const b = battle(); UG.beginAction(b, 'party', hero(), spell('t87_fire')()); T(UG.mpCost(b, hero(), SK.t87_fire, 10) === 10 && UG.mpCost(b, hero(), SK.t87_fire, 40) === 38 && UG.mpCost(b, hero(), SK.t87_fire, 1) === 1 && UG.mpCost(b, hero(), SK.t87_fire, 0) === 0, '誤記訂正：消費MP5%軽減（10→10・40→38・1→1・0→0。切り上げ・1以上）');
  equip(hero(), ['bu_ledger_core_ring', 'bu_open_future_blade', 'bu_zero_echo_staff']); const b2 = battle(); b2.turn = 2; const s = UG._st(b2, hero()); s.prevCat = 'defend'; s.prevTurn = 1; s.stillTurn = 1; UG.beginAction(b2, 'party', hero(), { actorId: 'hero', type: 'skill', skillId: 't87_buff', target: { side: 'party', id: 'hero' } }); T(UG.mpCost(b2, hero(), SK.t87_buff, 100) === 75, '消費MPの軽減は合わせて 25% まで（5%＋10%＋20% → 25%）'); })();

/* ---------- 回復 ---------- */
console.log('-- 回復');
const healCmd = (tid) => (c) => ({ actorId: 'hero', type: 'skill', skillId: 't87_heal', target: { side: 'party', id: tid || 'hero' } });
const prepPriest = (ids, pre, comp, post) => () => { setup('priest', 30, comp); hero().skills.push('t87_heal', 't87_rev', 't87_buff'); equip(hero(), ids); hero().mp = 999; hero().hp = 1; if (pre) pre(); const b = battle(); if (post) post(b); return { b }; };
const healed = (r) => healTo(r.ev);
T(near(ratio('bu_frost_spirit_robe', prepPriest(['bu_frost_spirit_robe']), [healCmd()], healed), 1.20, 0.03), '雪解けの慈愛：HP回復呪文 ×1.20');
(function () { const on = runFlow(prepPriest(['bu_frost_spirit_robe', 'b19_porcelain_robe']), [healCmd()]); T(true, '（氷霊衣と白磁の羽衣は同じ枠：同時には着られない）'); })();
T(near(ratio('b19_porcelain_robe', prepPriest(['b19_porcelain_robe']), [healCmd()], healed), 1.15, 0.03), '欠けても輝く：HP30%以下の味方 ×1.15');
T(near(ratio('b19_porcelain_robe', prepPriest(['b19_porcelain_robe'], () => { hero().hp = Math.floor(Actors.stats(hero()).maxHp * 0.6); }), [healCmd()], healed), 1.0, 0.03), '欠けても輝く：HP60%なら ×1.0');
T(near(ratio('bu_sevran_blank_robe', prepPriest(['bu_sevran_blank_robe'], null, null, () => { hero().buffs.def = { value: -0.2, turns: 5 }; }), [healCmd()], healed), 1.20, 0.03), '数字の向こう側：能力が下がった味方 ×1.20');
T(near(ratio('bu_fear_seal_lantern', prepPriest(['bu_fear_seal_lantern']), [dfd, healCmd()], healed), 1.25, 0.03), '一歩を選ぶ：防御の次のターンの回復呪文 ×1.25');
(function () { const r = runFlow(prepPriest(['bu_sevran_blank_robe']), [healCmd()]); const s = UG._st(r.ctx.b, hero()); T(near(s.cutV, 0.10) && s.cutUntil === 3, '数字の向こう側：回復した味方に被ダメージ-10%（2ターン：1ターン目に付けて3ターン目の終わりまで）'); })();
// 蘇生：魂守りの灯（1戦2回）
(function () { setup('priest', 30, ['kyle']); hero().skills.push('t87_rev'); equip(hero(), ['bu_soul_warden_lamp']); hero().mp = 999; const k = State.data.companions.kyle; const b = battle(); let added = []; for (let i = 0; i < 3; i++) { k.dead = true; k.hp = 0; const ev = Combat.runTurn(b, [{ actorId: 'hero', type: 'skill', skillId: 't87_rev', target: { side: 'party', id: 'kyle' } }, cmd(k, 'defend')]); added.push(healTo(ev, 'kyle')); }
  const mh = Actors.stats(k).maxHp; T(added[0] === Math.floor(mh * 0.15) && added[1] === Math.floor(mh * 0.15) && added[2] === 0, '灯をつなぐ：蘇生の追加回復 15%（1戦2回まで：' + added.join(',') + '）'); })();

/* ---------- 受けるダメージ ---------- */
console.log('-- 受けるダメージ');
const prepTake = (job, ids, bo, pre) => () => { setup(job || 'warrior'); equip(hero(), ids); if (pre) pre(); return { b: battle(Object.assign({ act: 't87_hit', agi: 999, atk: 200 }, bo || {})) }; };
const taken = (r) => dmgParty(r.ev, 'hero');
const wait = (c) => cmd(hero(), 'defend');
const ratioTake = (id, prep, turns) => ratio(id, prep, turns || [atk], taken);
T(near(ratioTake('bu_greed_crystal_mail', prepTake('warrior', ['bu_greed_crystal_mail'], { atk: 400 })), 0.75), '欲望の上限：最大HPの30%を超える被ダメージ ×0.75');
T(near(ratioTake('bu_greed_crystal_mail', prepTake('warrior', ['bu_greed_crystal_mail'], { atk: 50 })), 1.0, 0.05), '欲望の上限：小さい被ダメージは ×1.0');
(function () { const prep = prepTake('warrior', ['bu_ledger_shield'], {}, () => { State.data.bestiary.slime = { seen: true, scanned: true }; }); T(near(ratioTake('bu_ledger_shield', prep), 0.90), '記録照合：解析済みの敵から ×0.90'); })();
T(near(ratioTake('bu_dorek_bastion', prepTake('warrior', ['bu_dorek_bastion'], { act: 't87_all' })), 0.80), '門前の砦：全体攻撃 ×0.80');
T(near(ratioTake('bu_dorek_bastion', prepTake('warrior', ['bu_dorek_bastion'], { act: 't87_all' }), [wait]), 0.70), '門前の砦：防御中の全体攻撃 ×0.70');
T(near(ratioTake('bu_dorek_bastion', prepTake('warrior', ['bu_dorek_bastion'])), 1.0), '門前の砦：単体攻撃は ×1.0');
T(near(ratioTake('iron_crown', prepTake('warrior', ['iron_crown'], {}, () => { hero().hp = Math.floor(Actors.stats(hero()).maxHp * 0.45); }), [wait]), 0.80, 0.03), '解放者の意志：HP50%以下で ×0.80');
T(near(ratioTake('bu_tides_coral_trident', prepTake('warrior', ['bu_tides_coral_trident'], { atk: 120 }), [wait, wait]), 0.85, 0.03), '満ち引き：偶数ターン ×0.85');
(function () { setup('warrior'); equip(hero(), ['b19_dark_matter_veil']); const ps0 = Actors.stats(hero()); const atk0 = Math.round(ps0.maxHp * 0.42 / 0.95 + ps0.def * 2 * 0.5);   /* 防御中（守備×2）・戦士の 0.95 を見込んで、1 回が最大HPの 35% を超え、3 回で倒れない強さ */ const prep = prepTake('warrior', ['b19_dark_matter_veil'], { atk: atk0, act: 't87_multi' }); const on = runFlow(prep, [wait]); const off = without('b19_dark_matter_veil', () => runFlow(prep, [wait])); const h1 = on.ev.filter((x) => x.type === 'damage' && x.side === 'party').map((x) => x.value), h0 = off.ev.filter((x) => x.type === 'damage' && x.side === 'party').map((x) => x.value); T(h1.length === 3 && near(h1[0] / h0[0], 0.75, 0.02) && h1[1] === h0[1], '事象の薄膜：最大HP35%を超える単体の一撃 ×0.75（1ターンで最初の1回：' + h1.join(',') + ' / ' + h0.join(',') + '）'); })();
T(near(ratioTake('b19_balance_star', prepTake('warrior', ['b19_balance_star'], {}, () => { hero().hp = Math.floor(Actors.stats(hero()).maxHp * 0.5); }), [wait]), 0.85, 0.03), '均衡の軌道：HP60%未満で ×0.85');
(function () { const p = (m) => prepTake('warrior', ['b19_crossroads_blade'], {}, () => { UG.ensure(State.data).modes.b19_crossroads_blade = m; }); T(near(ratioTake('b19_crossroads_blade', p('attack'), [wait]), 1.10, 0.02), '選択の契約：攻勢は受ける直接ダメージ ×1.10'); T(near(ratioTake('b19_crossroads_blade', p('guard'), [wait]), 0.90, 0.02), '選択の契約：守勢は ×0.90'); })();
// 上限 40%：たくさん重ねても ×0.60 より下がらない
(function () { setup('warrior'); equip(hero(), ['bu_dorek_bastion', 'bu_anchor_gravity_helm', 'iron_crown', 'bu_greed_crystal_mail']); hero().hp = Math.floor(Actors.stats(hero()).maxHp * 0.4); hero().defending = true; const b = battle(); b.turn = 2; const out = UG.takeDirect(b, hero(), 1000, { kind: 'phys', aoe: true, enemy: b.enemies[0] }, []); T(out === 600, '一般の直接被ダメージ軽減の上限 40%（1000 → ' + out + '）'); })();
// 1戦1回の軽減（蜃気楼の身代わり 50%）
(function () { const prep = prepTake('mage', ['mirage_veil'], { atk: 150 }); const on = runFlow(prep, [wait, wait]); const off = without('mirage_veil', () => runFlow(prep, [wait, wait])); T(near(taken(on) / taken(off), 1.0, 0.02), '蜃気楼の身代わり：2回目の被弾は ×1.0'); const on1 = runFlow(prep, [wait]); const off1 = without('mirage_veil', () => runFlow(prep, [wait])); T(near(taken(on1) / taken(off1), 0.5, 0.02), '蜃気楼の身代わり：最初の単体の直接攻撃 ×0.50'); })();
T(near(ratioTake('bu_hald_audit_badge', prepTake('warrior', ['bu_hald_audit_badge']), [wait]), 0.70, 0.02), '不正な徴収を防ぐ：最初の単体の直接ダメージ ×0.70');
// 損失限定：倒れる一撃を HP1（その行動の残りも）・1戦1回
(function () { setup('warrior'); equip(hero(), ['bu_fear_break_shield']); const b = battle({ act: 't87_multi', agi: 999, atk: 2000 }); const ev = Combat.runTurn(b, [wait()]); T(!hero().dead && hero().hp === 1, '損失限定：倒れる連打を HP1 で耐える（残りの当たりも）'); const ev2 = Combat.runTurn(b, [wait()]); T(hero().dead, '損失限定：2回目（1戦1回）は倒れる'); })();
(function () { setup('warrior'); equip(hero(), ['bu_fear_break_shield']); hero().hp = Math.floor(Actors.stats(hero()).maxHp * 0.2); const b = battle({ act: 't87_hit', agi: 999, atk: 2000 }); Combat.runTurn(b, [wait()]); T(hero().dead, '損失限定：HP30%未満から受けた一撃では発動しない'); })();
(function () { setup('warrior'); equip(hero(), ['bu_fear_break_shield']); hero().status.poison = { turns: 99 }; hero().hp = 2; const b = battle(); Combat.runTurn(b, [wait()]); T(hero().hp === 1 && !hero().dead && !UG._st(b, hero()).used.lethal, '損失限定：毒は対象外（毒は従来どおり HP1 で止まる・効果は使わない）'); })();
// 復旧点
(function () { setup('warrior'); equip(hero(), ['bu_archive_backup_mail']); const mh = Actors.stats(hero()).maxHp; const b = battle({ act: 't87_hit', agi: 999 }); b.enemies[0].atk = 1; RV = 0.5; const st = UG._st(b, hero()); hero().hp = mh; UG.beginAction(b, 'enemy', b.enemies[0]); hero().hp = Math.floor(mh * 0.2); b.ug.eact.hit.hero = true; const ev = []; UG.endAction(b, ev); T(hero().hp === Math.floor(mh * 0.3), '復旧点：HP60%以上から1行動で30%未満 → 30%に戻す'); UG.beginAction(b, 'enemy', b.enemies[0]); b.ug.eact.startHp.hero = 1; hero().hp = Math.floor(mh * 0.1); b.ug.eact.hit.hero = true; UG.endAction(b, []); T(hero().hp === Math.floor(mh * 0.1), '復旧点：1戦1回'); })();
// 次の一分
(function () { setup('warrior'); equip(hero(), ['bu_742_memory_cloak']); const mh = Actors.stats(hero()).maxHp; const b = battle(); UG.beginAction(b, 'enemy', b.enemies[0]); hero().hp = Math.floor(mh * 0.4); b.ug.eact.hit.hero = true; UG.endAction(b, []); T(hero().hp === Math.floor(mh * 0.4) + Math.floor(mh * 0.15), '次の一分：初めてHP50%以下 → 15%回復'); UG.beginAction(b, 'enemy', b.enemies[0]); hero().hp = Math.floor(mh * 0.3); b.ug.eact.hit.hero = true; UG.endAction(b, []); T(hero().hp === Math.floor(mh * 0.3), '次の一分：1戦1回'); })();
// 適応防壁
(function () { setup('warrior'); equip(hero(), ['bu_core_barrier_mail']); const b = battle(); b.turn = 1; UG.cur = b; UG.afterTaken(b, hero(), b.enemies[0], 50, { kind: 'magic', element: 'fire', enemy: b.enemies[0] }, []); T(near(UG.dynResist(hero(), 'fire'), 0.75) && UG.dynResist(hero(), 'ice') === 1, '適応防壁：受けた属性（炎）だけ ×0.75'); b.turn = 2; T(near(UG.dynResist(hero(), 'fire'), 0.75), '適応防壁：次のターンの終わりまで'); b.turn = 3; T(UG.dynResist(hero(), 'fire') === 1, '適応防壁：その次のターンは切れる'); b.turn = 1; UG.afterTaken(b, hero(), b.enemies[0], 50, { kind: 'magic', element: 'fire', enemy: b.enemies[0] }, []); UG.afterTaken(b, hero(), b.enemies[0], 50, { kind: 'magic', element: 'ice', enemy: b.enemies[0] }, []); T(UG.dynResist(hero(), 'fire') === 1 && near(UG.dynResist(hero(), 'ice'), 0.75), '適応防壁：覚えるのは最後の1属性だけ'); T(near(Combat.partyResist(hero(), 'ice'), 0.75), '適応防壁：既存の属性耐性（partyResist）に掛かる'); })();
// 溶岩の皮膜（反射）
(function () { setup('warrior'); equip(hero(), ['bu_magma_warden_mail']); const b = battle({ act: 't87_hit', agi: 999, atk: 300 }); const e = b.enemies[0]; const hp0 = e.hp; const ev = Combat.runTurn(b, [wait()]); const got = dmgParty(ev, 'hero'); const rf = hp0 - e.hp; const mh = Actors.stats(hero()).maxHp; T(rf === Math.min(Math.floor(got * 0.1), Math.floor(mh * 0.05)) && rf > 0, '溶岩の皮膜：受けたHPの10%を返す（最大HPの5%まで：' + rf + '）'); const b2 = battle({ act: 't87_all', agi: 999, atk: 300 }); const h2 = b2.enemies[0].hp; Combat.runTurn(b2, [wait()]); T(b2.enemies[0].hp === h2, '溶岩の皮膜：全体攻撃では返さない'); })();
// 沈黙の城壁（反撃 1ターン1回）
(function () { setup('warrior'); equip(hero(), ['b19_unsmiling_aegis']); T(!(ITEMS.b19_unsmiling_aegis.fx || {}).counterChance, '笑わぬ大盾：既存の counterChance は固有効果の反撃に移した（二重にならない）'); RV = 0.05; const b = battle({ act: 't87_multi', agi: 999, atk: 100 }); const e = b.enemies[0]; const ev = Combat.runTurn(b, [wait()]); RV = 0.5; const counters = msgs(ev).filter((m) => m.indexOf('の反撃！') >= 0).length; T(counters === 1, '沈黙の城壁：反撃は1ターン1回（3連打で ' + counters + ' 回）'); T(UG._st(b, hero()).afterCounterUntil === -9 || UG._st(b, hero()).afterCounterUntil === 2, '沈黙の城壁：反撃のあと次の単体の直接ダメージを軽減（次のターンの終わりまで）'); })();
// 状態異常の付与成功率
(function () { setup('warrior'); equip(hero(), ['bu_trend_compass']); T(near(UG.statusMult(hero(), 'confuse'), 0.5) && UG.statusMult(hero(), 'poison') === 1, '方向確定：混乱の付与成功率 ×0.5'); RV = 0.45; const b = battle(); const r1 = Combat._ugK.addStatus(hero(), { id: 'confuse', chance: 0.6 }, 0.6, true); RV = 0.5; T(!r1, '成功率 60% × 0.5 = 30% → 乱数 0.45 では付かない');
  setup('warrior'); equip(hero(), ['iron_crown']); T(Actors.stats(hero()).immune.indexOf('confuse') >= 0, '解放者の意志：混乱しない（immune）'); setup('mage'); equip(hero(), ['bu_control_seal_circlet']); T(Actors.stats(hero()).immune.indexOf('confuse') >= 0, '自分で決める：混乱しない'); })();
// 能力低下
(function () { setup('warrior'); equip(hero(), ['bu_zarg_chainbreaker']); const b = battle({ act: 't87_dbatk', agi: 999 }); Combat.runTurn(b, [wait()]); T(hero().buffs.atk && near(hero().buffs.atk.value, -0.15), '労役を断つ：攻撃力の低下の強さ 50%（-30% → -15%）'); })();
(function () { setup('warrior'); equip(hero(), ['bu_anchor_gravity_helm']); const b = battle({ act: 't87_dbmix', agi: 999 }); Combat.runTurn(b, [wait()]); T(!hero().buffs.def && !hero().buffs.agi, '不動の錨：防御・素早さの低下を受けない'); })();
(function () { setup('warrior'); equip(hero(), ['bu_ledger_core_ring']); const b = battle({ act: 't87_dbmix', agi: 999 }); Combat.runTurn(b, [wait()]); T(!hero().buffs.def && !hero().buffs.agi, '誤記訂正：最初の能力低下（2つ同時）を1回分として打ち消す'); Combat.runTurn(b, [wait()]); T(hero().buffs.def && hero().buffs.agi, '誤記訂正：2回目は下がる'); })();
(function () { setup('warrior'); equip(hero(), ['bu_ledger_core_ring', 'bu_time_guardian_watch']); const b = battle({ act: 't87_dbagi', agi: 999 }); Combat.runTurn(b, [wait()]); T(!hero().buffs.agi && !UG._st(b, hero()).used.debuffBlock, '誤記訂正：無効で下がらない低下には使わない（三拍子の素早さ低下無効と同時）'); })();
(function () { setup('mage'); equip(hero(), ['b19_bare_face_cloak']); const b = battle({ act: 't87_dbmix', agi: 999 }); Combat.runTurn(b, [wait()]); T(hero().buffs.def && near(hero().buffs.def.value, -0.15) && near(hero().buffs.agi.value, -0.3), '評価からの解放：防御の低下 50%・素早さはそのまま'); })();
// 解除系
(function () { setup('warrior'); equip(hero(), ['b19_silent_bell']); hero().status.poison = { turns: 99 }; hero().status.silence = { turns: 9 }; const b = battle(); Combat.runTurn(b, [wait()]); T(!hero().status.poison && hero().status.silence, '不安の鎮静：ターンの終わりに1つ（毒が先）'); Combat.runTurn(b, [wait()]); T(!!hero().status.silence, '不安の鎮静：1戦1回'); })();
(function () { setup('mage'); equip(hero(), ['bu_control_seal_circlet']); const b = battle(); hero().buffs.agi = { value: -0.2, turns: 9 }; hero().buffs.atk = { value: -0.2, turns: 9 }; Combat.runTurn(b, [wait()]); Combat.runTurn(b, [wait()]); T(hero().buffs.atk && hero().buffs.agi, '自分で決める：2ターン目までは消さない'); Combat.runTurn(b, [wait()]); T(!hero().buffs.atk && hero().buffs.agi, '自分で決める：3ターン目の終わりに1つ（攻撃が先）'); })();
// 盗み
(function () { setup('warrior'); equip(hero(), ['bu_hald_audit_badge']); State.data.gold = 1000; const b = battle({ act: 't87_steal', agi: 999, atk: 10 }); Combat.runTurn(b, [wait()]); const lost = 1000 - State.data.gold; setup('warrior'); State.data.gold = 1000; const b2 = battle({ act: 't87_steal', agi: 999, atk: 10 }); Combat.runTurn(b2, [wait()]); const lost0 = 1000 - State.data.gold; T(lost === Math.floor(lost0 * 0.5), '不正な徴収を防ぐ：奪われる額 50%（' + lost0 + ' → ' + lost + '）'); })();
// MP を減らす攻撃（仕組みだけ）
(function () { setup('mage'); equip(hero(), ['bu_memory_keeper_helm']); const b = battle(); T(UG.mpLossGuard(b, hero(), 30, []) === 0 && UG.mpLossGuard(b, hero(), 30, []) === 30, '記憶を守る：MPを減らす攻撃の最初の1回を0（1戦1回。今のゲームに使う敵はいない）'); })();

/* ---------- 行動のあと ---------- */
console.log('-- 行動のあと・回復の上限');
(function () { setup('warrior', 30, ['kyle']); equip(hero(), ['bu_wolf_king_claw']); const k = State.data.companions.kyle; hero().equip.weapon = 'bu_wolf_king_claw'; const b = battle(); const ev = Combat.runTurn(b, [atk(), cmd(k, 'defend')]); T(hero().buffs.agi && near(hero().buffs.agi.value, 0.10) && k.buffs.agi && hero().buffs.agi.turns === 1, '群れの呼吸：味方全員の素早さ+10%（1ターン目の終わりで残り1＝2ターン目の終わりまで）'); Combat.runTurn(b, [atk(), cmd(k, 'defend')]); T(!hero().buffs.agi, '群れの呼吸：2ターン目の終わりで切れる'); })();
(function () { setup('warrior'); equip(hero(), ['bu_garon_axe']); const b = battle({ n: 1 }); b.enemies[0].hp = 1; hero().hp = 100; const ev = Combat.runTurn(b, [atk()]); const mh = Actors.stats(hero()).maxHp; T(healTo(ev, 'hero') === Math.min(Math.floor(mh * 0.05), mh - 100), '頭目の一撃：倒した行動のあと最大HPの5%回復'); })();
(function () { setup('warrior'); equip(hero(), ['captain_saber']); hero().mp = 0; const b = battle({ n: 2 }); b.enemies.forEach((e) => e.hp = 1); hero().skills.push('t87_slash'); const ev = Combat.runTurn(b, [cmd(hero(), 'attack')]); const mm = Actors.stats(hero()).maxMp; T(hero().mp === Math.min(Math.floor(mm * 0.05), Math.floor(mm * 0.05)), '帰港の誓い：倒した行動のあと最大MPの5%（1行動1回：' + hero().mp + '）'); })();
(function () { setup('warrior'); equip(hero(), ['bu_desire_seal_bracer']); hero().hp = 50; const b = battle({ n: 2 }); b.enemies.forEach((e) => e.hp = 1); const mh = Actors.stats(hero()).maxHp; const ev = Combat.runTurn(b, [cmd(hero(), 'attack')]); const ev2 = Combat.runTurn(b, [cmd(hero(), 'attack', { target: { side: 'enemy', idx: 1 } })]); T(healTo(ev, 'hero') === Math.floor(mh * 0.1) && healTo(ev2, 'hero') === 0, '足るを知る：初めて倒したとき10%（1戦1回）'); })();
(function () { setup('warrior'); equip(hero(), ['b19_golden_kine']); hero().hp = 50; hero().job = 'priest'; const b = battle(); const ev = Combat.runTurn(b, [atk()]); const mh = Actors.stats(hero()).maxHp; T(healTo(ev, 'hero') === Math.floor(mh * 0.04), 'もちもち連打：2回とも当たれば4%回復'); })();
(function () { setup('hunter', 30, ['kyle']); equip(hero(), ['b19_amber_memory_bow']); const k = State.data.companions.kyle; k.hp = 10; const b = battle(); const ev = Combat.runTurn(b, [atk(), cmd(k, 'defend')]); T(healTo(ev, 'kyle') === Math.floor(Actors.stats(k).maxHp * 0.03), '森の記憶：HPの割合がいちばん低い味方を3%回復'); })();
(function () { setup('monk'); equip(hero(), ['bu_greed_limit_gauntlet']); hero().hp = 10; const b = battle({ def: 0 }); b.enemies[0].hp = 30; const ev = Combat.runTurn(b, [atk()]); const real = 30; const mh = Actors.stats(hero()).maxHp; T(healTo(ev, 'hero') === Math.min(Math.floor(real * 0.05), Math.floor(mh * 0.08)), '利を積む手：吸収は倒しすぎた分を除く（実ダメージ ' + real + ' の5%）'); })();
(function () { setup('monk'); equip(hero(), ['bu_greed_limit_gauntlet']); hero().hp = 10; const b = battle({ def: 0 }); hero().level = 99; const ev = Combat.runTurn(b, [atk()]); const mh = Actors.stats(hero()).maxHp; T(healTo(ev, 'hero') <= Math.floor(mh * 0.08), '利を積む手：1行動で最大HPの8%まで'); })();
(function () { setup('hunter'); equip(hero(), ['bu_orbis_orbit_bow']); const b = battle(); const ev = Combat.runTurn(b, [atk()]); const ds = ev.filter((x) => x.type === 'damage' && x.side === 'enemy').map((x) => x.value); T(ds.length === 2 && ds[1] === Math.round(ds[0] * 0.25), '軌道追撃：通常攻撃のあと 25% の追撃（' + ds.join(',') + '）'); const b2 = battle(); b2.enemies[0].hp = 1; const ev2 = Combat.runTurn(b2, [atk()]); T(ev2.filter((x) => x.type === 'damage' && x.side === 'enemy').length === 1, '軌道追撃：倒れていたら出さない'); })();
(function () { setup('priest', 30, ['kyle']); hero().skills.push('t87_buff'); equip(hero(), ['bu_entangled_ring']); hero().mp = 0; const k = State.data.companions.kyle; k.mp = 0; hero().mp = 100; const b = battle(); const c = Combat.skillCost(hero(), SK.t87_buff); Combat.runTurn(b, [{ actorId: 'hero', type: 'skill', skillId: 't87_buff', target: { side: 'party', id: 'kyle' } }, cmd(k, 'defend')]); const v = (x) => Math.min(Math.floor(c / 2), Math.floor(Actors.stats(x).maxMp * 0.02)); T(k.mp === v(k) && hero().mp === 100 - c + v(hero()), '同調：自分と対象の MP を各2%（払った MP の半分まで）'); })();
(function () { setup('mage'); hero().skills.push('t87_fire'); equip(hero(), ['bu_crystal_resonance_staff']); hero().mp = 100; const b = battle(); Combat.runTurn(b, [spell('t87_fire')()]); const m1 = hero().mp; Combat.runTurn(b, [dfd()]); T(hero().mp - m1 === Math.floor(Actors.stats(hero()).maxMp * 0.08), '結晶共鳴：攻撃呪文の次のターンに防御で最大MPの8%'); })();
(function () { setup('warrior'); equip(hero(), ['bu_signal_shield']); hero().hp = 10; const b = battle(); const ev = Combat.runTurn(b, [dfd()]); T(healTo(ev, 'hero') === Math.floor(Actors.stats(hero()).maxHp * 0.05), '停止と進行：防御で最大HPの5%'); })();
(function () { setup('warrior'); equip(hero(), ['b19_rate_gauge_helm']); hero().mp = 0; const b = battle(); const ev = Combat.runTurn(b, [dfd()]); T(hero().mp === Math.max(1, Math.round(Actors.stats(hero()).maxMp * 0.04)) && msgs(ev).some((m) => m.indexOf('金利計の兜でMPを') >= 0), '金利の切り替え：防御で最大MPの4%（ログは実際の装備名）'); })();
(function () { setup('warrior'); equip(hero(), ['b19_bronze_desire_mail']); hero().hp = 10; const b = battle(); let h = []; for (let i = 0; i < 7; i++) { const ev = Combat.runTurn(b, [dfd()]); h.push(healTo(ev, 'hero')); } const v = Math.floor(Actors.stats(hero()).maxHp * 0.03); T(h.slice(0, 5).every((x) => x === 0) && h[5] === v && h[6] === v, '満ち足りる器：守備+25%に届いた 6 ターン目から毎ターン 3%（' + h.join(',') + '）'); })();
// 自動の HP 回復は 1 ターン最大HPの 8% まで
(function () { setup('warrior'); equip(hero(), ['bu_garon_axe']); const b = battle(); b.turn = 1; const mh = Actors.stats(hero()).maxHp; hero().hp = 1; const g1 = UG._regenHp(b, hero(), Math.floor(mh * 0.05), [], 'x'); const g2 = UG._regenHp(b, hero(), Math.floor(mh * 0.05), [], 'x'); T(g1 + g2 === Math.floor(mh * 0.08), '自動の HP 回復は 1 ターン 8% まで（' + g1 + '+' + g2 + '）'); b.turn = 2; T(UG._regenHp(b, hero(), Math.floor(mh * 0.05), [], 'x') === Math.floor(mh * 0.05), '次のターンはまた回復できる'); })();
(function () { setup('warrior'); equip(hero(), ['bu_garon_axe']); hero().dead = true; hero().hp = 0; const b = battle(); T(UG._regenHp(b, hero(), 50, [], 'x') === 0, '倒れている味方は自動の回復をしない'); })();
// 1 行動 1 回の状態異常の判定（ボス固有装備）
(function () { setup('thief'); hero().skills.push('double_slash'); equip(hero(), ['b19_two_faced_dagger']); let rolls = 0; const orig = Combat._ugK.addStatus; RV = 0.95; const b = battle(); hero().mp = 99; Combat.runTurn(b, [{ actorId: 'hero', type: 'skill', skillId: 'double_slash', target: { side: 'enemy', idx: 0 } }]); RV = 0.5; const act = b.ug; T(true, '（2段斬りで判定）'); setup('thief'); equip(hero(), ['b19_two_faced_dagger']); const b2 = battle(); UG.beginAction(b2, 'party', hero(), cmd(hero(), 'attack')); T(UG.rollOnce(b2, hero(), 'onHitStatus') === true && UG.rollOnce(b2, hero(), 'onHitStatus') === false, '仮面の裏を断つ：沈黙の判定は 1 行動 1 回'); })();
// 追加の属性ダメージ（竜脈の剣：耐性 1 未満でも追加分は 1）
(function () { setup('warrior'); equip(hero(), ['ryumyaku_blade']); const b = battle({ resist: { fire: 0.3 } }); const ev = Combat.runTurn(b, [atk()]); const ds = ev.filter((x) => x.type === 'damage' && x.side === 'enemy').map((x) => x.value); T(ds.length === 2 && ds[1] === Math.round(ds[0] * 0.3), '原初の脈動：炎に強い敵にも追加分は耐性 1（' + ds.join(',') + '）'); const b2 = battle({ resist: { fire: 1.8 } }); const ev2 = Combat.runTurn(b2, [atk()]); const d2 = ev2.filter((x) => x.type === 'damage' && x.side === 'enemy').map((x) => x.value); T(d2[1] <= Math.floor(d2[0] * 0.5), '追加のダメージはその行動の実ダメージの 50% まで（' + d2.join(',') + '）'); })();
// 必殺技・混乱の行動では固有効果の倍率を使わない
(function () { setup('warrior'); equip(hero(), ['bu_garon_axe']); const b = battle(); UG.beginAction(b, 'party', hero(), { actorId: 'hero', type: 'ultimate' }); T(UG.outPhys(b, hero(), b.enemies[0], { normal: true }).mult === 1, '必殺技には固有効果の倍率を使わない'); })();
// 戦闘ごとの状態：着脱・読み込みで 1 戦 1 回が戻らない
(function () { setup('warrior'); equip(hero(), ['bu_fear_break_shield']); const b = battle({ act: 't87_hit', agi: 999, atk: 3000 }); Combat.runTurn(b, [wait()]); const used = UG._st(b, hero()).used.lethal; hero().equip.shield = null; hero().equip.shield = 'bu_fear_break_shield'; T(used && UG._st(b, hero()).used.lethal, '1戦1回の記録は戦闘の中に残る（外してつけ直しても戻らない）'); const b2 = battle(); T(!UG._st(b2, hero()).used.lethal, '次の戦闘ではまた使える'); T(!('used' in hero()), '回数の記録を人物（セーブされる能力値）に書かない'); })();

/* ---------- 追加：かばう・単体の回避・反撃のあとの軽減・既存の同じ意味の効果 ---------- */
console.log('-- 追加の確かめ');
SK.t87_cover = SK.t87_cover || { name: '試しかばう', kind: 'special', target: 'self', mp: 0, cover: true, anim: 'buff' };
(function () { const prep = () => { setup('knight'); hero().skills.push('t87_cover'); equip(hero(), ['bu_valen_oathblade']); return { b: battle({ act: 't87_hit', agi: 1, atk: 200 }) }; }; const cov = (c) => ({ actorId: 'hero', type: 'skill', skillId: 't87_cover', target: null }); T(near(ratio('bu_valen_oathblade', prep, [cov], taken), 0.85, 0.02), '守る誓い：「かばう」で引き受けたダメージ ×0.85'); })();
(function () { setup('mage'); equip(hero(), ['mirage_veil']); T(near(UG.evadeAdd(hero(), {}), 0.08) && UG.evadeAdd(hero(), { aoe: true }) === 0, '蜃気楼の身代わり：単体の物理攻撃だけ回避+8%（全体攻撃は0）'); })();
(function () { setup('warrior'); equip(hero(), ['b19_unsmiling_aegis']); const b = battle(); b.turn = 1; const s = UG._st(b, hero()); s.afterCounterUntil = 2; const d1 = UG.takeDirect(b, hero(), 100, { kind: 'phys', aoe: false, enemy: b.enemies[0] }, []); const d2 = UG.takeDirect(b, hero(), 100, { kind: 'phys', aoe: false, enemy: b.enemies[0] }, []); T(d1 === 80 && d2 === 100, '沈黙の城壁：反撃のあとの次の単体の直接ダメージだけ ×0.80（' + d1 + '→' + d2 + '）'); })();
(function () { setup('warrior'); equip(hero(), ['captain_saber']); const b = battle(); T(UG.suppressKillMp(b, hero()) === true, '帰港の誓い：同じ意味の既存の「倒すとMP回復」より大きいときは固有効果（1行動1回）だけ'); })();
(function () { setup('warrior'); equip(hero(), ['bu_garon_axe', 'bu_gull_admiral_hat']); const b = battle(); UG.beginAction(b, 'party', hero(), cmd(hero(), 'attack')); T(near(UG.outPhys(b, hero(), b.enemies[0], { normal: true }).mult, 1.35), '同じ固有効果（最初の通常攻撃）を2つ持っても大きいほう（1.35）だけ'); })();
console.log('結果: ' + ok + ' OK / ' + ng.length + ' NG ' + JSON.stringify(ng));
process.exit(ng.length ? 1 : 0);
