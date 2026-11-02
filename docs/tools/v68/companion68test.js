// v6.8 追加の仲間：カズト（マクディア）・もちぽよ（トレディア）・神聖犬ポン太（天空群島・4人とは別枠）
const load = require('./rpgload.js'); const { w, errors } = load(); const State = w.State, World = w.World, Combat = w.Combat, Actors = w.Actors;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
w.Win.message = () => Promise.resolve(); w.Win.choice = () => Promise.resolve(0);
async function talk(id) { const n = World.map.npcs.find(x => x.id === id && !x.hidden); if (!n) return false; World.busy = false; World.talk(n); for (let i = 0; i < 80 && World.busy; i++) await new Promise(r => setTimeout(r, 2)); return true; }
function where(id) { return Object.entries(w.MAP_DEFS).filter(([mid, def]) => (def.npcs || []).some(n => n.id === id)).map(([mid]) => mid); }
(async () => {
  const C = w.COMPANIONS, J = w.JOBS, SK = w.SKILLS, IT = w.ITEMS, F = w.FX65;
  // ---- データ
  ok(C.kazuto && C.kazuto.job === 'warrior' && C.mochipoyo && C.mochipoyo.job === 'loop_trader' && !C.ponta, '仲間のデータ：カズト（戦士）・もちぽよ（時渡りのトレーダー）。ポン太は4人の仲間の一覧には入らない');
  ok(/2035年/.test(C.mochipoyo.background) && /タイムループ/.test(C.mochipoyo.background), 'もちぽよの設定：2035年からのタイムループ');
  const TS = J.loop_trader.skills.map(s => s.id); ok(TS.length === 7 && TS.every(id => SK[id] && SK[id].trade && F.DEFS[id] && F.KINDS[F.DEFS[id].fx]), 'トレード呪文7種と演出 ' + TS.join(','));
  ok(w.JOB_LIST.includes('loop_trader') && J.loop_trader.unlock.flag === 'mochipoyo_joined', '職業の一覧に「時渡りのトレーダー」（もちぽよ加入後に転職できる）');
  ok(IT.porkbits_don && IT.porkbits_don.effect.hp === 80 && w.SHOP_EXTRAS.tradia_item.includes('porkbits_don') && w.FOOD_STANDS.tradia_tavern.includes('porkbits_don'), 'ポークビッツ丼：トレディアの道具屋・損切り亭で買える');
  ok(F.DEFS.ponta_tackle && F.DEFS.ponta_heal && !SK.ponta_tackle, 'ポン太の行動の演出（スキルの一覧には入れない）');
  // ---- 置き場所（1か所だけ・歩ける場所・ほかの NPC と重ならない）
  for (const [id, map] of [['kazuto', 'magicka_tavern'], ['mochipoyo', 'tradia_tavern'], ['ponta', 'star_camp']]) {
    const ws = where(id); const def0 = w.MAP_DEFS[map]; const n = def0.npcs.find(x => x.id === id); const gm = new w.GameMap(Object.assign({}, def0, { npcs: def0.npcs.filter(x => x !== n) }));   // その NPC を除いた地図で、立つ場所が歩ける場所か
    const st = (def0.warps || [])[0] || { x: 1, y: 1 }; const seen = new Set([st.x + ',' + st.y]); const q = [[st.x, st.y]]; let reach = false;   // 出入口から歩いて、となりのマスまで行けるか（話しかけられるか）
    while (q.length) { const [x, y] = q.shift(); if (Math.abs(x - n.x) + Math.abs(y - n.y) === 1) { reach = true; break; } for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || (nx === n.x && ny === n.y)) continue; seen.add(k); if (gm.tiles[ny] && gm.tiles[ny][nx] !== undefined && gm.passable(nx, ny, State.data || {})) q.push([nx, ny]); } }
    const others = w.MAP_DEFS[map].npcs.filter(x => x !== n && x.x === n.x && x.y === n.y).length; const ev = (w.MAP_DEFS[map].events || []).filter(e => e.x === n.x && e.y === n.y).length;
    ok(ws.length === 1 && ws[0] === map && others === 0 && ev === 0 && gm.passable(n.x, n.y, State.data || {}) && reach, id + ' は ' + map + ' の (' + n.x + ',' + n.y + ') だけにいる（歩ける ' + gm.tiles[n.y][n.x] + '・出入口から話しかけに行ける）');
  }
  // ---- カズト：禁書庫の許可の前は仲間にならない → 許可のあと仲間になる
  State.newGame('t', 'warrior'); let d = State.data; d.hero.level = 28;
  World.enterMap('magicka_tavern', 5, 7, 'up'); await talk('kazuto'); ok(!d.companions.kazuto, 'カズト：禁書庫の入館許可の前は仲間にならない');
  d.flags.archive_permit = true; await talk('kazuto'); ok(!!d.companions.kazuto && d.flags.kazuto_joined, 'カズト：許可のあと話すと仲間になる');
  World.applyState(World.map); ok(World.map.npcs.find(n => n.id === 'kazuto').hidden, 'カズト：仲間になったら酒場から消える');
  const k = d.companions.kazuto; const ks = Actors.stats(k); const base = Actors.baseStat('warrior', 'mp', k.level);
  ok(k.job === 'warrior' && ks.maxMp >= base + 60, 'カズト：戦士で最大MPが高い（Lv' + k.level + ' 最大MP ' + ks.maxMp + '／ふつうの戦士 ' + base + '）');
  const hs = Actors.stats(Object.assign({}, k, { id: 'hero' })); ok(hs.maxMp === ks.maxMp - Math.round(12 + 1.9 * (k.level - 1)), 'MPの上乗せはカズト本人だけ（同じ能力の主人公は上乗せなし）');
  // ---- もちぽよ：トレードバトルに勝つ ＋ ポークビッツ丼3つ
  State.newGame('t', 'warrior'); d = State.data; d.hero.level = 20; World.enterMap('tradia_tavern', 6, 8, 'up');
  await talk('mochipoyo'); ok(!d.companions.mochipoyo && d.flags.mochipoyo_met, 'もちぽよ：トレードバトルに勝つ前は仲間にならない');
  d.tradia.wins = { ren: 1 }; State.addItem('porkbits_don', 2); await talk('mochipoyo'); ok(!d.companions.mochipoyo && d.inventory.porkbits_don === 2, 'もちぽよ：ポークビッツ丼が2つでは仲間にならない（丼は減らない）');
  State.addItem('porkbits_don', 2); await talk('mochipoyo'); ok(!!d.companions.mochipoyo && d.flags.mochipoyo_joined && d.inventory.porkbits_don === 1, 'もちぽよ：勝利＋丼3つで仲間になる（丼が3つ減る）');
  const m = d.companions.mochipoyo; ok(m.level >= 19 && ['trend_ray', 'rci_storm', 'dow_thunder', 'stoploss_aegis', 'macd_cross_burst'].every(s => m.skills.includes(s)), 'もちぽよ：加入のレベル（' + m.level + '）までのトレード呪文を覚えている');
  ok(Combat.skillCost(m, SK.trend_ray) === 3 && Combat.skillCost(m, SK.time_loop_wave) === 18, 'もちぽよ：トレード呪文の消費MP -40%（トレンドレイ 5→3・時渡りの波形砲 30→18）');
  ok(Combat.skillCost(Object.assign({}, m, { id: 'hero' }), SK.trend_ray) === 4 && Combat.skillCost(m, SK.heal || { mp: 3 }) === (SK.heal ? SK.heal.mp : 3), 'ほかの人が時渡りのトレーダーなら -20%。トレード呪文でない呪文は変わらない');
  const ms = Actors.stats(m); ok(ms.maxMp > Actors.stats(Object.assign({}, m, { job: 'mage' })).maxMp, 'もちぽよ：最大MPは魔法使いより多い（' + ms.maxMp + '）');
  // 戦闘で使う：MP の減りが軽くなった値
  { const b = Combat.create(['mana_golem'], [d.hero, m]); const mp0 = m.mp; Combat.runTurn(b, [{ actorId: m.id, type: 'skill', skillId: 'dow_thunder', target: { side: 'enemy', idx: 0 } }]); ok(mp0 - m.mp === Combat.skillCost(m, SK.dow_thunder), '戦闘でダウ理論の雷を使うと、MPが ' + (mp0 - m.mp) + ' 減る（12 の -40%）'); }
  // ---- ポン太：ランク A 未満は仲間にならない → A で仲間になる
  State.newGame('t', 'warrior'); d = State.data; const TE = w.TradeEval; const rank0 = TE.rank;
  World.enterMap('star_camp', 9, 12, 'up'); TE.rank = () => ({ index: 4, letter: 'B' }); await talk('ponta'); ok(!d.flags.ponta_joined, 'ポン太：トレーダーランク B では仲間にならない');
  TE.rank = () => ({ index: 5, letter: 'A' }); await talk('ponta'); ok(d.flags.ponta_joined && !d.companions.ponta && d.party.length === 1, 'ポン太：ランク A で仲間になる（4人のパーティには入らない）');
  World.applyState(World.map); ok(World.map.npcs.find(n => n.id === 'ponta').hidden, 'ポン太：仲間になったら野営地から消える'); TE.rank = rank0;
  // ---- ポン太の戦闘：別枠で、ときどき攻撃。敵に狙われない。仲間が危ないときは回復も
  ['lina', 'kyle', 'mina'].forEach(id => State.joinCompanion(id)); const party = State.partyActors(); party.forEach(a => { a.level = 20; Actors.fullHeal(a); });
  let acts = 0, turns = 0, hitsOnPet = 0, petDmg = 0, heals = 0, wins = 0;
  for (let n = 0; n < 40; n++) {
    party.forEach(a => Actors.fullHeal(a)); const b = Combat.create(['mana_golem', 'mana_golem'], party); if (n === 0) ok(b.pet && b.pet.id === 'ponta' && b.party.length === 4 && !b.party.includes(b.pet), '戦闘：ポン太は b.pet（パーティの4人とは別）');
    for (let t = 0; t < 12 && b.state === 'command'; t++) {
      if (n % 4 === 0) party[1].hp = Math.max(1, Math.round(Actors.stats(party[1]).maxHp * 0.2));   // 回復の確かめ
      const ev = Combat.runTurn(b, party.filter(a => !a.dead).map(a => ({ actorId: a.id, type: 'defend' }))); turns++;
      ev.forEach((e, i) => { if (e.type === 'act' && e.side === 'pet') { acts++; const nx = ev.slice(i + 1).find(x => x.type === 'damage' || x.type === 'heal'); if (nx && nx.type === 'damage' && nx.side === 'enemy') petDmg += nx.value; if (nx && nx.type === 'heal') heals++; } if (e.type === 'damage' && e.side === 'party' && e.id === 'ponta') hitsOnPet++; });
    }
    if (b.state === 'won') wins++;
  }
  ok(acts > turns * 0.25 && acts < turns * 0.55, 'ポン太はときどき行動する（' + acts + '／' + turns + 'ターン）');
  ok(petDmg > 0 && heals > 0 && hitsOnPet === 0, 'ポン太：敵にダメージ（合計 ' + petDmg + '）・仲間を回復（' + heals + '回）・敵からは狙われない');
  const b0 = Combat.create(['slime'], party, { pet: false }); ok(!b0.pet, 'opts.pet=false の戦闘ではポン太は出ない');
  State.newGame('t2', 'warrior'); const b1 = Combat.create(['slime'], State.partyActors()); ok(!b1.pet, '加入前（フラグなし）の戦闘ではポン太は出ない');
  // ---- 既存のセーブ：何も足されない／保存して読み込み直しても加入の状態が残る
  State.newGame('t', 'warrior'); d = State.data; const old = JSON.parse(JSON.stringify(d)); delete old.flags.ponta_joined; if (State.migrate) State.migrate(old);
  ok(!old.flags.ponta_joined && !old.companions.kazuto && !old.companions.mochipoyo && Object.keys(old.companions).length === 0, '古いセーブ：新しい仲間は加入していない状態のまま');
  d.flags.ponta_joined = true; State.joinCompanion('mochipoyo'); const rt = JSON.parse(JSON.stringify(d)); if (State.migrate) State.migrate(rt);
  ok(rt.flags.ponta_joined && rt.companions.mochipoyo && rt.companions.mochipoyo.job === 'loop_trader', 'セーブの形のまま保存・読み込みできる（ポン太はフラグ、もちぽよは仲間の記録）');
  // ---- 画像の登録
  const AM = w.ASSET_MANIFEST; ok(['kazuto', 'mochipoyo', 'ponta'].every(id => AM.companions[id] && AM.overworld[id]), '立ち絵・歩行の絵を登録');
  ok(errors.length === 0, 'エラーなし ' + errors.slice(0, 2).join('|'));
  console.log('結果: ' + pass + ' OK / ' + fail + ' NG'); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('EXC', e && e.stack); process.exit(1); });
