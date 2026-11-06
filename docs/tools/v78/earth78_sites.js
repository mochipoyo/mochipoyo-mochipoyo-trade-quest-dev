// v7.8 地球の記録（町のない大陸の 8 か所の遺跡）とサブクエスト「失われた地球の記録」（jsdom・地球の世界／2D 版）
const load = require('./load78.js');
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const A = load(); const w = A.w; const W = w.World, S = w.State; S.newGame('t', 'warrior'); W.start(); const d = S.data;
ok(A.errors.length === 0, '読み込みエラーなし ' + A.errors.slice(0, 2).join(' / '));
const log = []; let picks = []; w.Win.message = async (l) => { log.push([].concat(l || []).join('／')); }; w.Win.choice = async () => (picks.length ? picks.shift() : 0); w.Win.list = async () => 0; w.Win.toast = () => {};
const ctx = () => w.Events.ctx(null); const ER = w.R78.earthRecords; const sites = ER.sites;
ok(sites.length === 8 && sites.every((s) => s.map && /^w78_/.test(s.map)), '遺跡 8 か所が外の地図に置かれた ' + sites.map((s) => s.id + '@' + s.map + ':' + s.x + ',' + s.y).join(' '));
const bad = sites.filter((s) => { const m = W.getMap(s.map); const e = (m.events || []).find((q) => q.x === s.x && q.y === s.y); const t = m.tiles[s.y][s.x];
  const around = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => m.passable(s.x + dx, s.y + dy, d)).length; return !e || t !== 'pillar' || around < 2; });
ok(!bad.length, '遺跡は石の柱で、まわりに歩けるマスがある（調べられる） ' + bad.map((s) => s.id).join(' '));
// 遺跡から陸づたいに海岸へ出られる（地図の境目をまたいで歩く。船で上陸して歩いて行ける）
const W76 = w.World76; const SZ = W76.size(); const WW = SZ.w, WH = SZ.h; const CH = new Array(WW * WH); for (const id of W76.MAPS) { const r = W76.rect(id); const rows = w.MAP_DEFS[id].rows(); for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) CH[(r.y + y) * WW + r.x + x] = rows[y][x]; }
const walkC = (c) => { const n = w.Tiles.byChar[c]; return !!n && !w.Tiles.isSolid(n) && !w.Tiles.isWater(n); }; const waterC = (c) => { const n = w.Tiles.byChar[c]; return !!n && w.Tiles.isWater(n); };
const coast = {}; sites.forEach((s) => { const g = W76.toGlobal(s.map, s.x, s.y); const seen = new Uint8Array(WW * WH); const q = [g.y * WW + g.x]; seen[q[0]] = 1; let found = 0;
  for (let h = 0; h < q.length && !found; h++) { const c = q[h], cx = c % WW, cy = (c / WW) | 0; for (let k = 0; k < 4; k++) { const nx = W76.wrapX(cx + [1, -1, 0, 0][k]), ny = cy + [0, 0, 1, -1][k]; if (ny < 0 || ny >= WH) continue; const n = ny * WW + nx; if (seen[n]) continue; seen[n] = 1; if (waterC(CH[n])) { found = h + 1; break; } if (walkC(CH[n])) q.push(n); } }
  coast[s.id] = found; });
const noCoast = sites.filter((s) => !coast[s.id]); ok(!noCoast.length, 'どの遺跡も、陸づたいに海岸まで歩いて行ける（上陸して歩く。調べたマスの数 ' + sites.map((s) => s.id + ' ' + coast[s.id]).join('・') + '）' + noCoast.map((s) => s.id).join(' '));
(async () => {
  const seller = w.MAP_DEFS.world.npcs.find((n) => n.id === 'w_mapseller78'); ok(!!seller, '大洋の地図売りがアルカディアにいる');
  // 引き受ける前に 1 か所調べておく
  await sites[0].run(ctx()); ok(d.flags[sites[0].flag] && (d.inventory[sites[0].item] || 0) > 0, '引き受ける前でも遺跡を調べると記録になる（' + sites[0].name + '・' + sites[0].item + '）');
  picks = [2, 0]; await seller.talk(ctx()); ok(d.quests.earth78_records && d.quests.earth78_records.state === 'active', '地図売りから「失われた地球の記録」を引き受けた');
  const objs = w.OBJECTIVES.filter((e) => e.q === 'earth78_records'); const unres = objs.filter((e) => !w.Nav.resolve(e.t)); ok(objs.length === 9 && !unres.length, '案内の目的地 9 件がすべて解決する ' + unres.map((e) => e.done).join(' '));
  picks = [2]; await seller.talk(ctx()); ok(!d.flags.erec_done && log.some((l) => /1\/8/.test(l)), '途中で話すと、残りの場所を教えてくれる');
  for (const s of sites.slice(1)) await s.run(ctx()); ok(ER.found() === 8, '8 か所すべて調べた');
  picks = [2]; await seller.talk(ctx()); ok(d.flags.erec_done && d.quests.earth78_records.state === 'done' && (d.inventory.earth_globe || 0) > 0, '報告して完了・地球儀のブローチ');
  await sites[3].run(ctx()); ok(ER.found() === 8, 'もう一度調べても数は増えない');
  // 2D 版：クエストは掲示しない・案内なし・アイテムの定義はある
  const B = load({ join: false }); const w2 = B.w; ok(w2.QUESTS.earth78_records && w2.QUESTS.earth78_records.future && !w2.OBJECTIVES.some((e) => e.q === 'earth78_records') && w2.ITEMS.earth_globe, '2D 版：クエストは掲示しない・案内なし・ブローチの定義はある');
  console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
