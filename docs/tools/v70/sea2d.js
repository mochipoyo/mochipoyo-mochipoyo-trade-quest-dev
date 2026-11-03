// v7.0 海の底の拾い物（2D・jsdom）：船で近くを通ると拾える／飛空艇・徒歩では拾えない／1回だけ／場所が海（船で行ける水）の上
const load = require('../rpgload.js'); const { w, errors } = load(); const State = w.State, World = w.World;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
const LOG = []; w.Win.message = (lines) => { (Array.isArray(lines) ? lines : [lines]).forEach((l) => LOG.push(l)); return Promise.resolve(); }; w.Win.toast = () => {}; World.encounter = function () {};
State.newGame('t', 'warrior'); const d = State.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; World.start();
const S = w.SeaTreasure; const WET = { water: 1, shallow: 1, deep: 1 };
// 場所の確認：すべて海のマス・帆船（w=world）は water/shallow・ワープや出来事と重ならない・同じ ID がない
const ids = new Set(); let badPos = [];
S.LIST.forEach((t) => { const m = World.getMap ? World.getMap(t.map) : new w.GameMap(w.MAP_DEFS[t.map]); const tile = m.tiles[t.y] && m.tiles[t.y][t.x]; if (!WET[tile] || m.warpAt(t.x, t.y) || m.eventAt(t.x, t.y) || ids.has(t.id)) badPos.push(t.id + ' ' + tile); ids.add(t.id); if (t.loot.item && !w.ITEMS[t.loot.item]) badPos.push(t.id + ' 道具なし ' + t.loot.item); if (t.map === 'world' && !w.Vehicle.terrainOk('sailboat', m, t.x, t.y)) badPos.push(t.id + ' 帆船で行けない'); });
ok(S.LIST.length >= 28 && !badPos.length, '拾い物 ' + S.LIST.length + 'か所：すべて海のマス・道具は実在・帆船の海（アルカディア）は帆船で行ける ' + badPos.join(','));
const run = async (t, aboard, dx) => {
  World.enterMap(t.map, t.x + (dx || 0), t.y, 'down'); const p = World.player; p.x = t.x + (dx || 0); p.y = t.y; p.px = p.x * 32; p.py = p.y * 32;
  d.vehicles = d.vehicles || {}; d.aboard = null; if (aboard) { d.vehicles[aboard] = { owned: true, map: t.map, x: p.x, y: p.y, port: { map: t.map, x: p.x, y: p.y } }; d.aboard = aboard; }
  LOG.length = 0; World.busy = false; World.onStep(); for (let i = 0; i < 50 && World.busy; i++) await new Promise((r) => setTimeout(r, 5));
};
(async () => {
  const t = S.LIST.find((x) => x.id === 'w1'); const before = d.inventory.potion || 0;
  await run(t, null, 1); ok(!S.taken(t), '徒歩（船に乗っていない）では拾わない');
  await run(t, 'airship', 1); ok(!S.taken(t), '飛空艇では拾わない');
  await run(t, 'sailboat', 3); ok(!S.taken(t), '2マス以上離れていると拾わない');
  await run(t, 'sailboat', 1); ok(S.taken(t) && (d.inventory.potion || 0) === before + 3 && LOG.some((l) => /引き上げた/.test(l)) && LOG.some((l) => /ポーション×3を手に入れた/.test(l)), '帆船で隣のマスを通ると引き上げる（ポーション×3）');
  await run(t, 'sailboat', 0); ok((d.inventory.potion || 0) === before + 3 && !LOG.length, '同じ物は2回拾えない');
  const g = S.LIST.find((x) => x.id === 'i3'); const g0 = d.gold; await run(g, 'galleon', 0); ok(S.taken(g) && d.gold === g0 + 2000, '遠洋航海船：お金（2000G）');
  // 旧セーブ：フラグがないので拾っていない扱い。拾った記録はセーブの flags に残る
  const old = JSON.parse(JSON.stringify(d)); Object.keys(old.flags).filter((k) => /^sea_/.test(k)).forEach((k) => delete old.flags[k]); const mg = State.migrate(old);
  ok(S.count(mg).taken === 0 && S.count(d).taken === 2, '旧セーブはまだ拾っていない扱い・拾った記録は flags（sea_*）');
  console.log('エラー', errors.slice(0, 3)); console.log('結果：' + pass + ' OK / ' + fail + ' NG');
})();
