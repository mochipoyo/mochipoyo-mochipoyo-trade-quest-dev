// v9.11 旧時代の廃墟（js/data/ruins3121.js）の確かめ（jsdom。3D 版と同じ地球の世界）：node docs/tools/ruins/ruins_check.js
const load = require('../v78/load78.js');
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const A = load(); const w = A.w, W = w.World76, T = w.Tiles, R = w.Ruins3121, L = w.EARTH78_LAYOUT; w.State.newGame('t', 'warrior');
ok(A.errors.length === 0, '読み込みエラーなし ' + A.errors.slice(0, 2).join(' / '));
ok(R && R.active(), '地球の世界で有効');
const t0 = Date.now(); const all = R.all(); const ms = Date.now() - t0;
ok(!R.error, '組み立てのエラーなし ' + (R.error || ''));
const sites = all.filter((e) => e.site), city = all.filter((e) => e.city), sc = all.filter((e) => !e.site && !e.city);
console.log(`    名のある残骸 ${sites.length}／${R.SITES.length}・都市の跡 ${city.length}（${new Set(city.map((e) => e.city)).size}／${R.CITIES.length} 都市）・まばらな残骸 ${sc.length}・合計 ${all.length}（${ms}ms）`);
ok(ms < 4000, '一覧を作る時間 ' + ms + 'ms');
const miss = R.missed(); ok(miss.filter((m) => !/^city:/.test(m)).length <= 4, '置けなかった名のある残骸は 4 つ以下：' + (miss.join(' ') || 'なし'));
// 置いた所：地図の中・歩く邪魔になる物の上でない
const S = W.size(); const name = (e) => { const d = w.MAP_DEFS[e.map]; return T.byChar[d.rows()[Math.floor(e.y)][Math.floor(e.x)]]; };
const bad = []; const near = (e, o, r) => Math.abs(o.x - Math.floor(e.x)) <= r && Math.abs(o.y - Math.floor(e.y)) <= r;
for (const e of all) {
  const r = W.rect(e.map), d = w.MAP_DEFS[e.map]; if (!r || !d || e.x < 0 || e.y < 0 || e.x >= r.w || e.y >= r.h) { bad.push(e.id + ':外'); continue; }
  const n = name(e); if (/^(road|bridge|mountain|cliff|lava|slag|village|castle_icon|cave_icon|tower_icon)$/.test(n)) bad.push(e.id + ':' + n);
  if ((d.locations || []).some((o) => near(e, o, 3))) bad.push(e.id + ':入口の近く');
  for (const k of ['warps', 'chests', 'npcs', 'events']) if ((d[k] || []).some((o) => typeof o.x === 'number' && near(e, o, 1))) bad.push(e.id + ':' + k);
}
ok(!bad.length, '道・橋・山・町の入口・宝箱・人・出来事の上や隣に置いていない ' + bad.slice(0, 6).join(' '));
// 名のある残骸は目当ての場所の近く（10 マス＝経度 2.5° 以内）
const far = sites.filter((e) => { const s = R.SITES.find((q) => q[0] === e.id); const t = L.tile(s[2], s[3]); return Math.abs(W.dxWrap(e.gx - t.x)) > 14 || Math.abs(e.gy - t.y) > 14; });
ok(!far.length, '名のある残骸は目当ての経度・緯度の近く ' + far.map((e) => e.id).join(' '));
const lib = R.find('liberty'), giza = R.find('giza'), tt = R.find('tokyo_tower');
ok(lib && lib.map === 'world_meridian' && giza && tt, `自由の女神＝${lib && lib.map + ' ' + lib.x + ',' + lib.y + '（' + lib.ground + '）'}・ピラミッド＝${giza && giza.map + ' ' + giza.x + ',' + giza.y}・東京の鉄塔＝${tt && tt.map + ' ' + tt.x + ',' + tt.y}`);
// 重なり・同じ結果
let ov = 0; const by = {}; all.forEach((e) => (by[e.map] || (by[e.map] = [])).push(e)); Object.values(by).forEach((l) => { for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) { const dx = l[i].x - l[j].x, dy = l[i].y - l[j].y; if (dx * dx + dy * dy < 0.8) ov++; } });
ok(ov === 0, '同じマスに 2 つ置いていない');
const sig = JSON.stringify(all.map((e) => [e.id, e.kind, e.map, e.x, e.y, e.rot])); R.reset(); ok(JSON.stringify(R.all().map((e) => [e.id, e.kind, e.map, e.x, e.y, e.rot])) === sig, '作り直しても同じ配置（乱数は世界の座標から）');
const per = Object.entries(by).map(([k, l]) => [k, l.length]).sort((a, b) => b[1] - a[1]); console.log('    地図ごとの数（多い順）：' + per.slice(0, 8).map((x) => x.join('=')).join(' ') + ' … 地図 ' + per.length + '／' + W.MAPS.length);
ok(per[0][1] <= 260, '1 つの地図に多すぎない（最大 ' + per[0][1] + '）');
// タイル・セーブは変えない
const before = JSON.stringify(w.State.data); R.reset(); R.all(); ok(JSON.stringify(w.State.data) === before, 'セーブのデータを書き換えない');
const ant = all.filter((e) => !e.site && L.latOf(e.gy + 0.5) < -58); ok(!ant.length, '南極にまばらな残骸を置いていない（名のある残骸だけ）');
// 地球の世界でないとき（2D 版・設定「地域ごと」）は何も置かない
{ const keep = W.earth; W.earth = false; R.reset(); ok(R.all().length === 0 && R.forMap('world').length === 0, '地球の世界でないときは何も置かない（2D 版）'); W.earth = keep; R.reset(); }
// 形の種類：一覧の種類は、3D の形（three-src/src/world/Ruins3121.js）に全部ある
{ const src = require('fs').readFileSync(require('path').join(__dirname, '../../../three-src/src/world/Ruins3121.js'), 'utf8'); const have = new Set([...src.matchAll(/^  ([a-z_]+)\(k\) \{/gm)].map((m) => m[1])); const lack = [...new Set(R.all().map((e) => e.kind))].filter((k) => !have.has(k)); ok(!lack.length, '一覧の種類の形が全部ある ' + lack.join(' ')); }
const kinds = {}; all.forEach((e) => { kinds[e.kind] = (kinds[e.kind] || 0) + 1; }); console.log('    種類：' + Object.entries(kinds).sort((a, b) => b[1] - a[1]).map((x) => x.join('=')).join(' '));
if (process.argv[2] === 'dump') require('fs').writeFileSync(process.argv[3], JSON.stringify({ W: S.w, H: S.h, all }));
console.log(`結果 ruins check：NG ${ng.length}`); process.exit(ng.length ? 1 : 0);
