// v7.9 地球の世界：町のない大陸の直し（jsdom）
//  A 地球の記録の案内（いま行ける遺跡を近い順・行けないときは条件の文）／B 入れないときの文（大陸・海の名前）／C ニヴェリス（南極）＝暗黒大陸の決まり
//  D 灰の浜の桟橋の陸／外の地図の敵を気候に合わせる／地名の言いかえ／世界の名前
const load = require('../v78/load78.js');
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const A = load(); const w = A.w; const W = w.World, S = w.State, W76 = w.World76, E = w.Earth78, T = w.Tiles;
S.newGame('t', 'warrior'); const d = S.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; W.start();
ok(!A.errors.length, '読み込みのエラーなし ' + A.errors.slice(0, 2).join(' / '));
ok(E.VERSION === 'e78.3', '配置の版 e78.3 ' + E.VERSION);
const V4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const reachMaps = (aboard, flags) => { const keep = Object.assign({}, d.flags); Object.assign(d.flags, flags); const seen = new Set(['world']); const q = ['world']; while (q.length) { const id = q.shift(); W76.neighbors(id).forEach((nb) => { const n = nb.id; if (seen.has(n) || W76.entryBlock(n, aboard, id)) return; seen.add(n); const r = W76.rect(n); if (!(r.region && n !== 'world')) q.push(n); }); } d.flags = keep; S.data.flags = keep; return seen; };
// C：ニヴェリス
const ant = W76.SEAS.filter((id) => E.climate(id).kind === 'antarctic');
const antLand = ant.filter((id) => (W76.rect(id).landRatio || 0) > 0.05);
ok(ant.length >= 8 && ant.every((id) => (W76.gateOf(id) || {}).flag === 'dark_route_open'), 'ニヴェリスの外の地図 ' + ant.length + ' 枚（陸あり ' + antLand.length + '）：条件は暗黒大陸と同じ「闇の空路」');
ok(ant.every((id) => /ニヴェリス/.test(W76.gateText(id)) && /闇の空路/.test(W76.gateText(id))), 'ニヴェリスの入れないときの文：' + W76.gateText(antLand[0]));
const late = reachMaps('galleon', { galleon_ready: true, ship_ready: true, yorn_letter_done: true, zeromea_choice_done: true, magicka_arrived: true, kalion_open: true });
ok(!ant.some((id) => late.has(id)), '闇の空路の前は、遠洋航海船でニヴェリスへ行けない（前はマクディアに着いたあと 6 枚に行けた）');
const air = reachMaps('airship', { galleon_ready: true, ship_ready: true, yorn_letter_done: true, zeromea_choice_done: true, magicka_arrived: true, kalion_open: true, dark_route_open: true, airship_ready: true });
ok(antLand.every((id) => air.has(id)), '闇の空路のあとは、飛空艇でニヴェリスの陸の地図すべてへ行ける');
const darkNb = W76.neighbors('world_dark').map((nb) => nb.id).filter((id) => W76.rect(id).sea && E.climate(id).kind === 'antarctic');
const keepF = Object.assign({}, d.flags); d.flags.dark_route_open = true;
ok(darkNb.length && darkNb.every((id) => !W76.entryBlock('world_dark', null, id) && !W76.entryBlock(id, null, 'world_dark')), '暗黒大陸ととなりのニヴェリスの地図は、歩いて行き来できる（前は暗黒大陸へ歩いて戻れなかった）' + darkNb.join(','));
ok(darkNb.every((id) => !!W76.entryBlock(id, 'galleon', 'w78_0_0')), 'ニヴェリスへ船では入れない（飛空艇だけ）');
d.flags = keepF; S.data.flags = keepF;
// 外の地図の敵（気候）
const kinds = {}; let encBad = []; W76.SEAS.forEach((id) => { const r = W76.rect(id); if ((r.landRatio || 0) < 0.05) return; const def = w.MAP_DEFS[id]; const cl = E.climate(id); kinds[cl.kind] = (kinds[cl.kind] || 0) + 1; const z = def.encounters && def.encounters.zones[0]; if (!z || !z.groups || !z.groups.length || !z.groups.every((g) => g.every((e) => w.ENEMIES[e]))) encBad.push(id); });
ok(!encBad.length, '陸のある外の地図すべてに、実在する敵の出現表 ' + JSON.stringify(kinds) + ' ' + encBad.slice(0, 4).join(','));
const by = (re) => W76.SEAS.filter((id) => (W76.rect(id).landRatio || 0) > 0.3 && re.test(w.MAP_DEFS[id].name));
const fromOf = (id) => w.MAP_DEFS[id].encounters.from78;
ok(by(/ルベラ/).every((id) => /world_desert|world_tempus|world\|/.test(fromOf(id))), 'ルベラ大陸：砂漠・乾いた草原の敵（前は竜炎火山群島の敵） ' + by(/ルベラ/).map((id) => fromOf(id)).join(','));
ok(antLand.every((id) => /^world_dark\|/.test(fromOf(id))), 'ニヴェリス：暗黒大陸の敵（前は竜炎火山群島の敵）');
ok(antLand.every((id) => w.MAP_DEFS[id].theme3d.region === 'snow' && w.MAP_DEFS[id].bgRegion === 'snow'), 'ニヴェリス：3D の見た目と戦闘の背景は雪');
const sib = W76.SEAS.filter((id) => E.climate(id).kind === 'cold' && (W76.rect(id).landRatio || 0) > 0.3); const sibSnow = sib.filter((id) => /^world_snow\|/.test(fromOf(id))); const sibOther = sib.filter((id) => !/^world_snow\|/.test(fromOf(id)));
ok(sibSnow.length >= 4 && sibOther.every((id) => w.MAP_DEFS[id].encounters.level78 + 4 < 25 && fromOf(id).startsWith(W76.rect(id).near + '|')), '寒い森と凍土 ' + sib.length + ' 枚：雪原の敵 ' + sibSnow.length + ' 枚（白樺の凍原など）。となりの地域がずっと弱い時期の所（' + sibOther.map((id) => w.MAP_DEFS[id].name + '←' + W76.rect(id).near).join('・') + '）は、その地域の敵');
// 強さ：出現地帯の level が、いちばん近い地域のその場所の level と大きく離れない（ニヴェリス以外）
const lvOf = (z) => z.level || (() => { let n = 0, t = 0; z.groups.forEach((g) => g.forEach((e) => { if (w.ENEMIES[e] && w.ENEMIES[e].lv) { n++; t += w.ENEMIES[e].lv; } })); return n ? Math.round(t / n) : 1; })();
const far = []; W76.SEAS.forEach((id) => { const r = W76.rect(id); if ((r.landRatio || 0) < 0.05) return; const en = w.MAP_DEFS[id].encounters; if (E.climate(id).kind === 'antarctic') return; const zl = lvOf(en.zones[0]); if (zl > en.level78 + 4) far.push(id + ':' + zl + '>' + en.level78); });
ok(!far.length, '外の地図の敵の強さ（地帯の level）は、となりの地域のその場所より 5 以上強くならない ' + far.slice(0, 4).join(' '));
// B：文
const sam = W76.SEAS.find((id) => /シルヴァーナ大陸/.test(w.MAP_DEFS[id].name)); const st = W76.gateText(sam);
ok(/シルヴァーナ大陸/.test(st) && !/エルドランの東岸/.test(st) && /断裂群島/.test(st), 'シルヴァーナ大陸の入れないときの文：' + st);
const oce = W76.SEAS.find((id) => /北オルディス海/.test(w.MAP_DEFS[id].name) && W76.gateOf(id)); ok(!oce || /北オルディス海/.test(W76.gateText(oce)), '海の入れないときの文：' + (oce ? W76.gateText(oce) : '（条件のある北オルディス海なし）'));
// D：桟橋
const H = w.Harbors.HARBORS; Object.values(H).forEach((h) => { const m = W.getMap(h.map); const la = h.land; const t = m.tiles[la.y][la.x]; const walk = m.passable(la.x, la.y, d) && !T.isWater(t) && !m.eventAt(la.x, la.y); const nearW = V4.some(([dx, dy]) => T.isWater(m.tiles[la.y + dy] && m.tiles[la.y + dy][la.x + dx]));
  const sp = w.Harbors.spot(h, 'galleon'); const adj = sp && V4.some(([dx, dy]) => m.passable(sp.x + dx, sp.y + dy, d) && !T.isWater(m.tiles[sp.y + dy][sp.x + dx]));
  ok(walk && nearW && la.x > 0 && la.x < m.w - 1 && adj, '港「' + h.name + '」：桟橋の陸 ' + la.x + ',' + la.y + ' ' + t + '（歩ける・海のとなり・端でない）・船を停める所のとなりに陸'); });
// 帆船でグラニアの桟橋へ（マス単位：アルカディアの港から、帆船で行ける地図だけを通って）
(function () { const keep = Object.assign({}, d.flags); d.flags.ship_ready = true; const g = H.grania_west_pier; const from = H.marina; const ga = W76.toGlobal(from.map, from.moor.x, from.moor.y), gb = W76.toGlobal(g.map, g.moor.x, g.moor.y);
  const size = W76.size(); const ok2 = (gx, gy) => { const id = W76.mapAt(gx, gy); if (!id) return false; if (W76.entryBlock(id, 'sailboat', 'world')) return false; const o = W76.origin(id); const m = W.getMap(id); const x = ((gx - o.x) % size.w + size.w) % size.w, y = gy - o.y; return w.Vehicle.terrainOk('sailboat', m, x, y); };
  const key = (x, y) => y * size.w + x; const seen = new Uint8Array(size.w * size.h); const q = [[ga.x, ga.y]]; seen[key(ga.x, ga.y)] = 1; let found = false;
  for (let h = 0; h < q.length && !found; h++) { const [x, y] = q[h]; for (const [dx, dy] of V4) { const nx = (x + dx + size.w) % size.w, ny = y + dy; if (ny < 0 || ny >= size.h || seen[key(nx, ny)]) continue; if (Math.abs(nx - gb.x) + Math.abs(ny - gb.y) <= 1) { found = true; break; } if (!ok2(nx, ny)) continue; seen[key(nx, ny)] = 1; q.push([nx, ny]); } }
  ok(found, '小型帆船で、港町マリナから灰の浜の桟橋（グラニア）まで海の上を行ける'); d.flags = keep; S.data.flags = keep; })();
// A：地球の記録の案内
const pl = w.MAP_DEFS.world.locations.find((l) => l.id === 'poyo_village');
const nav = (flags, veh) => { const keep = Object.assign({}, d.flags); Object.assign(d.flags, flags); d.quests = { earth78_records: { state: 'active' } }; d.navTrack = 'earth78_records'; if (veh) d.vehicles = veh; W.enterMap('world', pl.x, pl.y + 1, 'down', { raw: true }); const c = w.Nav.compute(true); d.flags = keep; S.data.flags = keep; return c; };
const SH = { sailboat: { owned: true, map: 'world', x: 70, y: 81 }, galleon: { owned: true, map: 'world', x: 70, y: 81, port: { map: 'world', x: 70, y: 81 } } };
let c0 = nav({}); ok(c0 && !c0.target && /行ける遺跡がない/.test(c0.text) && /遠洋航海船/.test(c0.text), '船なし：目的地の印は出さず、条件を文で「' + (c0 && c0.text) + '」');
let c1 = nav({ ship_ready: true, galleon_ready: true }, SH); ok(c1 && c1.target && c1.target.map === w.R78.earthRecords.sites.find((s) => s.id === 'cape').map && /岬の灯台跡/.test(c1.text), '遠洋航海船だけ：行ける「岬の灯台跡」を案内 ' + (c1 && c1.text));
let c2 = nav({ ship_ready: true, galleon_ready: true, yorn_letter_done: true }, SH); const keep2 = Object.assign({}, d.flags); Object.assign(d.flags, { ship_ready: true, galleon_ready: true, yorn_letter_done: true }); const o2 = w.R78.earthRecords.order(); const pg = W76.toGlobal('world', pl.x, pl.y + 1); const dist = (s) => { const t = w.EARTH78_LAYOUT.tile(s.lon, s.lat); return Math.abs(W76.dxWrap(t.x - pg.x)) + Math.abs(t.y - pg.y); }; const sorted = o2.every((s, i) => !i || dist(o2[i - 1]) <= dist(s)); d.flags = keep2; S.data.flags = keep2;
ok(c2 && c2.target && o2.length >= 5 && sorted && c2.target.map === o2[0].map, '断裂群島の用事のあと：行ける ' + o2.length + ' か所を近い順に（' + o2.map((s) => s.name).join('→') + '）、いちばん近い「' + (o2[0] && o2[0].name) + '」を案内');
// 地名と名前
const txt = JSON.stringify(Object.values(w.MAP_DEFS).filter((m) => /^w78_/.test(m.id)).map((m) => m.name)) + W76.SEAS.map((id) => W76.gateText(id)).join('');
ok(!/アメリカ|ユーラシア|アフリカ|オーストラリア|南極|太平洋|大西洋|インド洋|日本|メリカ|ユーラシオ|アフリア|ルベラス|泰平洋|大西海|インデア/.test(txt), '外の地図の名前・文に実在の大陸・海の名前（と、v7.9 の最初の少し変えた名前）を使わない（例：' + w.MAP_DEFS[sam].name + '）');
console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
