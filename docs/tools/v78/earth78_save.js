// v7.8 地球の世界のセーブの引き継ぎ・戻しの確認（jsdom）：node docs/tools/v78/earth78_save.js
// ・前の版（地域ごとの旧座標）のセーブ → 地球：主人公・乗り物・アストラ号・探索済みを、新しい地形の対応する安全な地点へ（1 回だけ）
// ・地球のセーブ → 地球なし（2D 版・設定「地域ごと」）：旧座標へ戻す。外の地図・新しい地域にいたら、旧座標の地域へ
// ・前の版（v7.6 のつないだ世界）の共通の海にいたセーブ → 地球
const load = require('./load78.js');
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const E2 = load({ join: false }); const E3 = load();
const w2 = E2.w, w3 = E3.w; ok(!w2.World76.earth && w3.World76.earth, '2D 版（地球なし）と 3D 版（地球）を読み込んだ');
const walk = (w, map, x, y) => { const m = w.World.getMap(map); const t = m.tiles[y] && m.tiles[y][x]; return !!t && !w.Tiles.isSolid(t) && !w.Tiles.isWater(t); };
const water = (w, map, x, y) => { const m = w.World.getMap(map); const t = m.tiles[y] && m.tiles[y][x]; return !!t && w.Tiles.isWater(t); };
// ---------- 1) 前の版のセーブ（2D 版で作る：ポヨ村の出口の前・帆船はマリナの西の海・アストラ号は飛空中でない）
w2.State.newGame('t', 'warrior'); const d2 = w2.State.data; const exit = w2.MAP_DEFS.poyo_village.warps.find((q) => q.to === 'world');
d2.pos = { map: 'world', x: exit.tx, y: exit.ty, dir: 'down' }; d2.flags.ship_ready = true; d2.vehicles.sailboat = { owned: true, map: 'world', x: 19, y: 72, port: { map: 'world', x: 19, y: 72 } }; const sb0 = JSON.parse(JSON.stringify(d2.vehicles.sailboat));
d2.mapDiscovery = { world: [] }; for (let y = 50; y < 70; y++) { d2.mapDiscovery.world[y] = []; for (let x = 20; x < 40; x++) { const i = (x / 30) | 0; d2.mapDiscovery.world[y][i] = (d2.mapDiscovery.world[y][i] || 0) | (1 << (x % 30)); } }
d2.astra = { owned: true, map: 'world', x: exit.tx + 2, y: exit.ty, flying: false, alt: 'low', log: {} };
const save1 = JSON.stringify(d2);
// 地球で読む
w3.State.data = JSON.parse(save1); w3.World.start(); const d3 = w3.State.data;
const poyo = w3.MAP_DEFS.world.locations.find((l) => l.id === 'poyo_village');
ok(d3.pos.map === 'world' && Math.abs(d3.pos.x - poyo.x) + Math.abs(d3.pos.y - poyo.y) <= 3 && walk(w3, 'world', d3.pos.x, d3.pos.y), '前の版のセーブ → 地球：主人公はポヨ村（新しい場所）のすぐ横の歩けるマス ' + JSON.stringify(d3.pos) + ' 村 ' + poyo.x + ',' + poyo.y);
const sb = d3.vehicles.sailboat; ok(sb && sb.map === 'world' && water(w3, 'world', sb.x, sb.y), '帆船は新しい地形の海のマス（マリナの近く） ' + JSON.stringify(sb) + '（前 ' + JSON.stringify(sb0) + '）');
ok(d3.astra && walk(w3, d3.astra.map, d3.astra.x, d3.astra.y), 'アストラ号は陸の歩けるマス ' + JSON.stringify({ map: d3.astra.map, x: d3.astra.x, y: d3.astra.y }));
let bits = 0; (d3.mapDiscovery.world || []).forEach((row) => (row || []).forEach((v) => { for (let b = 0; b < 30; b++) if (v & (1 << b)) bits++; }));
ok(bits > 50 && d3.remakeVer.world === w3.Earth78.VERSION, '探索済みの印も新しい座標へ（' + bits + ' マス）・地球の座標の印 ' + d3.remakeVer.world);
const p1 = JSON.stringify(d3.pos); w3.World.start(); ok(JSON.stringify(w3.State.data.pos) === p1, 'もう一度読んでも二重に変換しない');
// ---------- 2) 地球のセーブ → 地球なし（2D 版）で読む
const save2 = JSON.stringify(w3.State.data); w2.State.data = JSON.parse(save2); w2.World.start(); const e2 = w2.State.data;
ok(e2.pos.map === 'world' && Math.abs(e2.pos.x - exit.tx) + Math.abs(e2.pos.y - exit.ty) <= 3 && walk(w2, 'world', e2.pos.x, e2.pos.y) && !e2.remakeVer.world, '地球のセーブ → 2D 版：旧座標のポヨ村の出口の近くへ戻る ' + JSON.stringify(e2.pos));
ok(e2.vehicles.sailboat && water(w2, 'world', e2.vehicles.sailboat.x, e2.vehicles.sailboat.y), '帆船も旧座標の海へ ' + JSON.stringify(e2.vehicles.sailboat));
// ---------- 3) 地球の外の地図（w78_*）・新しい地域にいたセーブ → 2D 版
w3.State.newGame('t', 'warrior'); w3.World.start(); const f3 = w3.World76.SEAS.find((id) => /^w78_/.test(id) && w3.World76.rect(id).near === 'world_grania'); const r3 = w3.World76.rect(f3);
const dd = w3.State.data; dd.pos = { map: f3, x: 5, y: 5, dir: 'down' }; let s3 = JSON.parse(JSON.stringify(dd)); w2.State.data = s3; w2.World.start();
ok(w2.World76.REGIONS.includes(w2.State.data.pos.map) && walk(w2, w2.State.data.pos.map, w2.State.data.pos.x, w2.State.data.pos.y), '地球の外の地図（' + f3 + '）のセーブ → 2D 版：近い地域（' + w2.State.data.pos.map + '）へ');
dd.pos = { map: 'neon_town', x: 17, y: 16, dir: 'down' }; dd.lastInn = { map: 'harbor_town', x: 10, y: 5 }; s3 = JSON.parse(JSON.stringify(dd)); w2.State.data = s3; w2.World.start();
ok(w2.State.data.pos.map === 'harbor_town', '新しい地域の町（錆雨市）にいたセーブ → 2D 版：最後に泊まった宿へ ' + JSON.stringify(w2.State.data.pos));
// ---------- 4) 前の版（v7.6 のつないだ世界）の共通の海にいたセーブ → 地球
const old76 = load({ earth: false }); const W76o = old76.w.World76; ok(W76o.on() && !W76o.earth, 'v7.6 のつないだ世界（地球なし）を読み込んだ');
const sea = W76o.SEAS.find((id) => W76o.rect(id).near === 'world'); old76.w.State.newGame('t', 'warrior'); const o4 = old76.w.State.data; o4.pos = { map: sea, x: 3, y: 3, dir: 'down' }; o4.aboard = 'galleon'; o4.flags.galleon_ready = true; o4.vehicles.galleon = { owned: true, map: sea, x: 3, y: 3, port: { map: 'world', x: 19, y: 72 } };
w3.State.data = JSON.parse(JSON.stringify(o4)); w3.World.start(); const q4 = w3.State.data; const gv = q4.vehicles.galleon;
ok(w3.World76.inGrid(q4.pos.map) && q4.pos.map === gv.map && q4.pos.x === gv.x && q4.pos.y === gv.y && water(w3, gv.map, gv.x, gv.y), 'v7.6 の共通の海（' + sea + '）で遠洋航海船に乗ったセーブ → 地球：近い地域の海へ、船ごと ' + JSON.stringify(q4.pos));
// ---------- 5) 地球のセーブ → 3D 版の設定「つなぐ（v7.6 の配置）」で読む：旧座標へ戻す（外の地図にいたら近い地域へ）
old76.w.State.data = JSON.parse(save2); old76.w.World.start(); const v5 = old76.w.State.data;
ok(v5.pos.map === 'world' && Math.abs(v5.pos.x - exit.tx) + Math.abs(v5.pos.y - exit.ty) <= 3 && walk(old76.w, 'world', v5.pos.x, v5.pos.y) && !(v5.remakeVer || {}).world, '地球のセーブ → v7.6 の配置：旧座標のポヨ村の出口の近くへ ' + JSON.stringify(v5.pos));
dd.pos = { map: f3, x: 5, y: 5, dir: 'down' }; old76.w.State.data = JSON.parse(JSON.stringify(dd)); old76.w.World.start(); const v6 = old76.w.State.data;
ok(W76o.inGrid(v6.pos.map) && !/^w78_/.test(v6.pos.map) && walk(old76.w, v6.pos.map, v6.pos.x, v6.pos.y), '地球の外の地図のセーブ → v7.6 の配置：その配置の地図の歩けるマスへ ' + JSON.stringify(v6.pos));
// ---------- 6) 2D 版には新しい地域の地図・敵・案内がない（行けないので外す）。アイテム・クエストの定義は残す（クエストは掲示しない）
const R2 = w2.R78; ok(R2.offMaps.length === R2.maps.length && R2.maps.every((id) => !w2.MAP_DEFS[id]) && R2.monsters.every((id) => !w2.ENEMIES[id]) && !w2.OBJECTIVES.some((e) => /78_/.test(e.q)), '2D 版：新しい地域の地図 ' + R2.offMaps.length + '・敵 ' + R2.monsters.length + '・案内を外した');
ok(w2.ITEMS.neon_umbrella && w2.QUESTS.neon78_water && w2.QUESTS.neon78_water.future && w3.MAP_DEFS.neon_town && w3.ENEMIES.rust_drone && !w3.QUESTS.neon78_water.future, '2D 版：アイテム・クエストの定義は残す（クエストは掲示しない）／3D 版の地球の世界ではすべてある');
// 地球の世界で、新しい地域で遠洋航海船に乗り・アストラ号を置き・錆雨市の宿に泊まったセーブ → 2D 版
w3.State.newGame('t', 'warrior'); w3.World.start(); const g6 = w3.State.data; g6.flags.galleon_ready = true;
g6.pos = { map: 'world_nereia', x: 10, y: 10, dir: 'down' }; g6.aboard = 'galleon'; g6.vehicles.galleon = { owned: true, map: 'world_nereia', x: 10, y: 10, port: { map: 'world_nereia', x: 12, y: 12 } };
g6.astra = { owned: true, map: 'world_neon', x: 20, y: 20, flying: false, e78: true, log: {} }; g6.lastInn = { map: 'neon_inn', x: 5, y: 6 }; g6.dungeonEntry = { group: 'x', map: 'world_meridian', x: 3, y: 3 };
w2.State.data = JSON.parse(JSON.stringify(g6)); w2.World.start(); const h6 = w2.State.data; const gv6 = h6.vehicles.galleon;
ok(w2.World76.REGIONS.includes(h6.pos.map) && h6.aboard === 'galleon' && gv6.map === h6.pos.map && gv6.x === h6.pos.x && gv6.y === h6.pos.y && water(w2, gv6.map, gv6.x, gv6.y), '2D 版：新しい地域の海（環潮大陸）で船に乗っていた → 近い地域（' + h6.pos.map + '）の海へ、船ごと ' + JSON.stringify(h6.pos));
g6.pos = { map: 'neon_town', x: 17, y: 16, dir: 'down' }; g6.aboard = null; w2.State.data = JSON.parse(JSON.stringify(g6)); w2.World.start(); const k6 = w2.State.data;
ok(k6.pos.map === 'poyo_village' && !k6.aboard && w2.MAP_DEFS[k6.vehicles.galleon.map] && !/nereia/.test(k6.vehicles.galleon.map), '2D 版：錆雨市の町にいた（最後の宿も錆雨市）→ ポヨ村・新しい地域に置いた船は置き場へ（' + k6.vehicles.galleon.map + '）');
ok(h6.astra.map === 'world_sky' && h6.lastInn.map === 'poyo_village' && !h6.dungeonEntry, '2D 版：アストラ号は空の区画・最後の宿はポヨ村・新しい地域の入口の記録は消す ' + JSON.stringify({ astra: h6.astra.map, inn: h6.lastInn.map }));
// ---------- 7) 前の版（e78.1）の地球のセーブ → いまの配置（e78.2：町の配置を広げた）／2D 版。前の版のスナップショットで作る（OLD78、なければ飛ばす）
const OLD78 = process.env.OLD78 || '/home/claude/envsnap_t88/';
if (require('fs').existsSync(OLD78 + 'js/data/earth78-layout.js') && /e78\.1/.test(require('fs').readFileSync(OLD78 + 'js/data/earth78-layout.js', 'utf8'))) {
  const V1 = load({ dir: OLD78 }); const w1 = V1.w; w1.State.newGame('t', 'warrior'); const g1 = w1.State.data; g1.flags.ship_ready = true; g1.flags.s3121_new_prologue = true; w1.World.start();
  const m1 = w1.World.getMap('world'); const poyo1 = m1.def.locations.find((l) => l.id === 'poyo_village'); const mar1 = m1.def.locations.find((l) => l.id === 'harbor');
  g1.pos = { map: 'world', x: poyo1.x, y: poyo1.y + 1, dir: 'down' }; const sbw = [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1]].map(([dx, dy]) => [mar1.x + dx, mar1.y + dy]).find(([x, y]) => w1.Tiles.isWater(m1.tiles[y][x]));
  g1.vehicles.sailboat = { owned: true, map: 'world', x: sbw[0], y: sbw[1], port: { map: 'world', x: sbw[0], y: sbw[1] } };
  g1.astra = { owned: true, map: 'world_kalion', x: 40, y: 45, flying: false, e78: true, log: {} }; const v1txt = JSON.stringify(g1);
  ok(g1.remakeVer.world === 'e78.1', '前の版（e78.1）の地球のセーブを作った（ポヨ村の前・帆船はマリナのそば・アストラ号はカリオン）');
  w3.State.data = JSON.parse(v1txt); w3.World.start(); const u = w3.State.data; const mw = w3.World.getMap('world'); const poyo2 = mw.def.locations.find((l) => l.id === 'poyo_village'); const mar2 = mw.def.locations.find((l) => l.id === 'harbor');
  ok(u.remakeVer.world === w3.Earth78.VERSION && u.pos.map === 'world' && Math.abs(u.pos.x - poyo2.x) + Math.abs(u.pos.y - poyo2.y) <= 5 && walk(w3, 'world', u.pos.x, u.pos.y), '→ いまの配置：主人公はポヨ村（広げた配置の場所）のそば（5 マス以内）の歩けるマス ' + JSON.stringify({ pos: u.pos, poyo: [poyo2.x, poyo2.y], ver: u.remakeVer.world }));
  ok(water(w3, 'world', u.vehicles.sailboat.x, u.vehicles.sailboat.y) && Math.abs(u.vehicles.sailboat.x - mar2.x) + Math.abs(u.vehicles.sailboat.y - mar2.y) <= 8, '→ 帆船は港町マリナ（広げた配置）のそばの海 ' + JSON.stringify({ sb: [u.vehicles.sailboat.x, u.vehicles.sailboat.y], marina: [mar2.x, mar2.y] }));
  ok(u.astra.map === 'world_kalion' && walk(w3, 'world_kalion', u.astra.x, u.astra.y) && u.remakeVer.world_kalion === w3.Earth78.VERSION && u.remakeVer.world_grania === w3.Earth78.VERSION, '→ アストラ号（カリオン）も直し、配置を変えていない地域は印だけ新しい版 ' + JSON.stringify({ astra: [u.astra.x, u.astra.y], up: u.e78up }));
  const p7 = JSON.stringify(u.pos); w3.World.start(); ok(JSON.stringify(w3.State.data.pos) === p7, '→ もう一度読んでも動かない');
  w2.State.data = JSON.parse(v1txt); w2.World.start(); const u2 = w2.State.data;
  ok(u2.pos.map === 'world' && Math.abs(u2.pos.x - exit.tx) + Math.abs(u2.pos.y - exit.ty) <= 4 && walk(w2, 'world', u2.pos.x, u2.pos.y) && !u2.remakeVer.world, '前の版（e78.1）の地球のセーブ → 2D 版：旧座標のポヨ村の出口の近く ' + JSON.stringify(u2.pos));
} else console.log('（前の版のスナップショットがないので 7 は飛ばした）');
console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
