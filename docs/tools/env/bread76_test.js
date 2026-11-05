// v7.6 パン（回復しつつ次の戦闘3回まで能力アップ）の確認：品物・露店の品ぞろえ・食べた効果・戦闘での反映・3回で切れる・セーブに残る・古いセーブ
// 使い方：cd /home/claude/work && RPG_DIR=<repo>/ node <repo>/docs/tools/env/bread76_test.js
const load = require(process.env.RPGLOAD || '/home/claude/work/rpgload.js'); const { w } = load();
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
w.State.newGame('t', 'warrior'); const d = w.State.data;
const B = w.BREAD76; const ids = ['bread_round', 'bread_milk', 'bread_honey', 'bread_herb', 'bread_date', 'bread_fish', 'bread_baguette'];
ids.forEach((id) => { const it = w.ITEMS[id]; ok(!!it && it.cat === 'consumable' && it.price > 0 && it.effect.meal && it.effect.meal.battles === 3 && (it.effect.hp > 0), '品物 ' + id + '（' + (it && it.name) + '・' + (it && it.price) + 'G）'); });
Object.keys(B).forEach((town) => ok(B[town].every((id) => w.ITEMS[id]), '品ぞろえ ' + town + '：' + B[town].map((id) => w.ITEMS[id].name).join('・')));
// 露店の売り子（町の定義）：話すと c.shop('item', パン) を呼ぶ
(async () => {
  for (const [town, npcId] of [['rivel_town', 'rivel_bread76'], ['harbor_town', 'harbor_bread76'], ['sahar_city', 'sahar_bread76'], ['rivel_town_x72_ex2', 'rivel_baker76'], ['sahar_city', 'sahar_weapon_stall76'], ['sahar_city', 'sahar_armor_stall76']]) {
    const n = (w.MAP_DEFS[town].npcs || []).find((x) => x.id === npcId); let got = null; const said = [];
    if (n) await n.talk({ say: async (who, lines) => { said.push(who); }, shop: async (kind, stock) => { got = { kind, stock }; } });
    ok(!!n && !!got && got.stock.length > 0 && got.stock.every((id) => w.ITEMS[id]), '売り子 ' + town + ' ' + npcId + '：' + (got ? got.kind + ' ' + got.stock.length + '品' : 'なし'));
  }
  const exp = w.MAP_DEFS.sahar_weapon.shop.stock.join(','); const st = (w.MAP_DEFS.sahar_city.npcs.find((x) => x.id === 'sahar_weapon_stall76'));
  let got2 = null; await st.talk({ say: async () => { }, shop: async (k, s) => { got2 = s.join(','); } }); ok(got2 === exp, 'サハルの曲刀の露店＝中の店と同じ品ぞろえ');
  // 食べる（フィールド）→ meal76 が付く。HP の回復は道具の effect.hp（Menu.useItem と同じ値）
  const hero = w.State.partyActors()[0]; const lines = w.Meal76.eat(hero, w.ITEMS.bread_round, false);
  ok(hero.meal76 && hero.meal76.battles === 3 && hero.meal76.buff.atk === 0.06, '食べた：' + lines.join(' '));
  ok(/丸パン：攻撃力\+6%（あと3戦）/.test(w.Meal76.status(hero)), 'ステータスの表示：' + w.Meal76.status(hero));
  // セーブに残る（State.data の仲間の中）
  const js = JSON.parse(JSON.stringify(d)); const h2 = (js.party || js.actors || []).find ? null : null;
  ok(JSON.stringify(d).indexOf('"meal76"') >= 0, 'セーブの中身に meal76 が入る');
  // 戦闘：始めに buffs へ（turns 999）。終わりに残りが減り、3回で消える
  const party = w.State.partyActors(); const enemy = Object.keys(w.ENEMIES || {}).find((k) => w.ENEMIES[k] && !w.ENEMIES[k].boss) || 'slime';
  for (let i = 1; i <= 3; i++) {
    const b = w.Combat.create([enemy], party, {});
    ok(hero.buffs && hero.buffs.atk && hero.buffs.atk.value === 0.06 && hero.buffs.atk.turns >= 900, i + '回目の戦闘の始め：攻撃力+6% が入る');
    const ended = w.Meal76.afterBattle(b.party, 'win'); w.Actors.clearBattleState && b.party.forEach(w.Actors.clearBattleState);
    if (i < 3) ok(hero.meal76 && hero.meal76.battles === 3 - i && ended.length === 0, i + '回目の戦闘の後：あと' + (hero.meal76 && hero.meal76.battles) + '回');
    else ok(!hero.meal76 && ended.indexOf(hero.name) >= 0, '3回目の戦闘の後：効果が切れた（' + ended.join('・') + '）');
  }
  const b4 = w.Combat.create([enemy], party, {}); ok(!(hero.buffs && hero.buffs.atk), '4回目の戦闘：効果なし'); w.Meal76.afterBattle(b4.party, 'win');
  // 戦闘中に食べる：その戦闘から数える（3回目の終わりで消える）
  const b5 = w.Combat.create([enemy], party, {}); w.Meal76.eat(hero, w.ITEMS.bread_milk, true); ok(hero.buffs.def && hero.buffs.def.value === 0.08 && hero.meal76.battles === 3, '戦闘中に食べた：守備力+8% がすぐ入る');
  w.Meal76.afterBattle(b5.party, 'win'); ok(hero.meal76 && hero.meal76.battles === 2, '戦闘中に食べた戦闘も1回に数える（あと2回）');
  // 別のパンで入れ替わる
  const l2 = w.Meal76.eat(hero, w.ITEMS.bread_honey, false); ok(hero.meal76.id === 'bread_honey' && hero.meal76.battles === 3 && l2.some((s) => /入れ替わった/.test(s)), '別のパンで入れ替わる');
  // 古いセーブ（meal76 なし）でも戦闘の始め・終わりが動く
  const p0 = party.map((a) => { const c = Object.assign({}, a); delete c.meal76; c.buffs = {}; return c; });
  let err = null; try { w.Meal76.beforeBattle(p0); w.Meal76.afterBattle(p0, 'win'); } catch (e) { err = e; } ok(!err && p0.every((a) => !a.meal76), '古いセーブの仲間（meal76 なし）でもエラーなし');
  console.log('結果：' + (fails.length ? fails.length + ' 件 NG' : 'すべて OK'));
  process.exit(fails.length ? 1 : 0);
})();
