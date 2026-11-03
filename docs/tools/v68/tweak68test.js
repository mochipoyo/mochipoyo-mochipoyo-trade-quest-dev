// v6.8 の調整：ミニマップの宝箱・全滅のお金・安いワイン・伝説のポークビッツ丼・もちぽよの条件・トレディアの移動・装備の段階づけ
const load = require('./rpgload.js'); const { w, errors } = load(); const State = w.State, World = w.World, Combat = w.Combat, Actors = w.Actors, IT = w.ITEMS;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
w.Win.message = () => Promise.resolve(); w.Win.choice = () => Promise.resolve(0);
async function talk(id) { const n = World.map.npcs.find(x => x.id === id && !x.hidden); if (!n) return false; World.busy = false; World.talk(n); for (let i = 0; i < 80 && World.busy; i++) await new Promise(r => setTimeout(r, 2)); return true; }
(async () => {
  State.newGame('t', 'warrior'); let d = State.data;
  // ---- ミニマップ：宝箱の場所を出さない（測量士がいるときだけ出す）
  const MM = w.Minimap; ok(typeof MM.showChests === 'function' && MM.showChests() === false, 'ミニマップ：ふだんは宝箱の場所を出さない');
  State.joinCompanion('iris'); const ir = d.companions.iris; ok(ir.job === 'surveyor' && MM.showChests() === true, 'ミニマップ：測量士（イーリス）がパーティにいるときだけ出す（職業の能力のまま）');
  d.party = ['hero']; ok(MM.showChests() === false, '測量士がパーティにいなければ出さない');
  // ---- 全滅：所持金の3分の1を失う
  d.gold = 9000; d.lastInn = { map: 'poyo_village', x: 5, y: 5 }; await World.gameOver(); ok(d.gold === 6000, '全滅：所持金の3分の1を失う（9000G → ' + d.gold + 'G）');
  d.gold = 1; await World.gameOver(); ok(d.gold === 1, '全滅：1Gのときは減らない（3分の1は0G）');
  // ---- 安いワイン：すべての酒場（序盤のリヴェル・マリナを含む）
  const FS = w.FOOD_STANDS; ok(['rivel_tavern', 'harbor_tavern', 'kalion_tavern', 'sentra_tavern', 'magicka_tavern', 'tradia_tavern'].every(k => FS[k].includes('cheap_wine')), '安いワイン：すべての酒場の品書き（リヴェル・マリナも）');
  ok(!FS.luxbell_dining || !FS.luxbell_dining.includes('cheap_wine'), '安いワイン：酒場でない食堂（ラックスベル食堂）には足さない');
  ok(IT.cheap_wine.battleOnly && IT.cheap_wine.effect.buff.atk === 0.08 && IT.cheap_wine.effect.buff.def === -0.05 && IT.cheap_wine.effect.turns === 2, '安いワイン：戦闘中だけ・攻撃+8%・守備-5%・2ターン');
  { State.newGame('t', 'warrior'); d = State.data; const h = d.hero; State.addItem('cheap_wine', 1); const s0 = Actors.stats(h); const b = Combat.create(['slime'], [h]); Combat.runTurn(b, [{ actorId: 'hero', type: 'item', itemId: 'cheap_wine', target: { side: 'party', id: 'hero' } }]); const s1 = Actors.stats(h);
    ok(h.buffs.atk && h.buffs.atk.value === 0.08 && h.buffs.def.value === -0.05 && s1.atk === Math.round(s0.atk * 1.08) && s1.def === Math.round(s0.def * 0.95) && !d.inventory.cheap_wine, '安いワイン：戦闘で飲むと攻撃力 ' + s0.atk + '→' + s1.atk + '・守備力 ' + s0.def + '→' + s1.def); }
  // ---- 伝説のポークビッツ丼
  const P = IT.porkbits_don; ok(P.name === '伝説のポークビッツ丼' && P.price === 20000 && P.effect.fullHp && P.effect.fullMp && P.effect.buff.atk === 1.0 && P.effect.turns === 3, '伝説のポークビッツ丼：20000G・HP/MP全回復・攻撃2倍3ターン');
  ok(FS.tradia_tavern.includes('porkbits_don') && !Object.keys(FS).some(k => k !== 'tradia_tavern' && FS[k].includes('porkbits_don')) && !Object.values(w.SHOP_EXTRAS).some(l => l.includes('porkbits_don')), '伝説のポークビッツ丼：トレディアの酒場だけで売る（道具屋では売らない）');
  { State.newGame('t', 'warrior'); d = State.data; const h = d.hero; h.level = 10; const st = Actors.stats(h); h.hp = 5; h.mp = 0; State.addItem('porkbits_don', 1); const b = Combat.create(['slime'], [h]); const a0 = Actors.stats(h).atk; Combat.runTurn(b, [{ actorId: 'hero', type: 'item', itemId: 'porkbits_don', target: { side: 'party', id: 'hero' } }]);
    ok(h.mp === st.maxMp && h.buffs.atk && h.buffs.atk.value === 1 && Actors.stats(h).atk === a0 * 2, '伝説のポークビッツ丼：戦闘でHP・MP全回復、攻撃力 ' + a0 + '→' + Actors.stats(h).atk); }
  // ---- もちぽよ：12人中7人に勝つ
  State.newGame('t', 'warrior'); d = State.data; World.enterMap('tradia_tavern', 6, 8, 'up'); const ids = w.TRADER_IDS; ok(ids && ids.length === 12, 'トレーダーは12人');
  ids.slice(0, 6).forEach(k => d.tradia.wins[k] = 2); State.addItem('porkbits_don', 3); await talk('mochipoyo'); ok(!d.companions.mochipoyo && d.inventory.porkbits_don === 3, 'もちぽよ：6人に勝っただけでは仲間にならない（丼は減らない）');
  d.tradia.wins[ids[6]] = 1; await talk('mochipoyo'); ok(!!d.companions.mochipoyo && !d.inventory.porkbits_don, 'もちぽよ：7人に勝って丼3つで仲間になる');
  ok(w.COMPANIONS.mochipoyo.joinLevel === 28, 'もちぽよの加入レベルはマクディアの地方に合わせて28');
  // ---- トレディアの移動
  const BG = w.BattleBG65; ok(BG.regionOf('tradia') === 'magicka' && BG.regionOf('tradia_tavern') === 'magicka', 'トレディアはマクディア地方（戦闘背景・地域の判定）');
  const wm = w.MAP_DEFS.world_magicka.locations.find(L => L.id === 'tradia'), wk = (w.MAP_DEFS.world_kalion.locations || []).find(L => L.id === 'tradia');
  ok(wm && !wk, '入口：マクディア地方にあり、カリオン徴収連邦からはなくなった');
  const gm = new w.GameMap(w.MAP_DEFS.world_magicka); ok(gm.warps.some(x => x.to === 'tradia' && x.x === 60 && x.y === 80), 'マクディア地方の (60,80) からトレディアに入れる');
  const ex = w.MAP_DEFS.tradia.warps.filter(x => x.to === 'world_magicka'); ok(ex.length === 4 && ex.every(x => x.tx === 60 && x.ty === 81), 'トレディアの出口はマクディア地方へ');
  State.newGame('t', 'warrior'); d = State.data; World.enterMap('tradia', 23, 38, 'down'); const rw = w.redirectWarp(ex[0], World.map, d);
  ok(rw && rw.to === 'world_kalion' && rw.tx === 36, '古いセーブ（マクディアに着く前にトレディアにいる）：出口はカリオンの以前の入口の前');
  { const km = World.getMap('world_kalion'); ok(km.passable(36, 89, d) && km.tile(36, 88) === 'road' && !km.warpAt(36, 88), '古いセーブの出口 (36,89) は歩ける草地で、カリオンへ戻る道が (36,88) まで残っている（入口のワープはない）'); }
  d.visited.world_magicka = true; ok(w.redirectWarp(ex[0], World.map, d) === null, 'マクディアに着いたことがあれば、ふつうにマクディア地方へ出る');
  // ---- 装備の段階づけ
  const T = w.EQUIP_TIER68; ok(T && T.items.length >= 70 && T.items.every(id => IT[id] && IT[id].price > 0 && (IT[id].atk || IT[id].def)), '地域の新しい装備 ' + T.items.length + '個');
  const names = Object.values(IT).map(x => x.name); ok(names.length === new Set(names).size, '装備・アイテムの名前の重複なし');
  const order = ['kalion', 'islands', 'tempus', 'machine', 'magicka', 'dragon', 'dark']; const tb = {}; T.tiers.forEach(t => tb[t[0]] = t[2]); const sw = { kalion: 30, magicka: 46 };
  const seq = order.map(r => tb[r] || sw[r]); ok(seq.every((v, i) => i === 0 || v > seq[i - 1]), '地域が進むほど剣の目安が上がる ' + seq.join('→'));
  const SA = w.SHOP_ADD; ok(T.items.every(id => Object.keys(SA).some(k => SA[k].some(e => e.id === id))), '新しい装備は、その地域の店に並ぶ');
  { const byName = (n) => Object.values(IT).find(x => x.name === n) || {}; const ks = byName('騎士の剣'), rb = byName('ルーンブレード'), ka = byName('騎士の鎧'), rm = byName('ルーンメイル');
    ok(ks.atk === 30 && ks.price === 3200 && rb.atk === 46 && rb.price === 6000 && ka.def === 26 && ka.price === 3800 && rm.def === 36 && rm.price === 6000, '既存の装備の値・値段は変えていない（騎士の剣30/3200G・ルーンブレード46/6000G・騎士の鎧26/3800G・ルーンメイル36/6000G）');
    ok(['tempus_weapon', 'magicka_weapon', 'dark_armory', 'kalion_weapon'].every(k => w.MAP_DEFS[k].shop.stock.every(id => !/^t68_/.test(id))), '既存の店の品ぞろえ（stock）はそのまま。新しい装備は SHOP_ADD で足すだけ'); }
  State.newGame('t', 'warrior'); d = State.data; World.enterMap('tempus_weapon', 5, 7, 'up'); const st2 = w.Services.addedStock(['knight_sword']); ok(st2.includes('t68_tempus_sword') && !st2.includes('t68_islands_sword'), '鐘都テンプスの武器屋に刻針の剣（ほかの地域の装備は並ばない）');
  ok(errors.length === 0, 'エラーなし ' + errors.slice(0, 2).join('|'));
  console.log('結果: ' + pass + ' OK / ' + fail + ' NG'); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('EXC', e && e.stack); process.exit(1); });
