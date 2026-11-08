// v8.3 版：v8.1 の pocket81_check.js に、王都セントラの王宮の門（通行証の鍵）の奥の北の道（32 マス。物語の通行証で開く）を「わけあり」に足しただけ（差分 updated-tests/pocket81_check83.diff）
// v8.1 作り直した町で、着く所から行けない「歩けるマス」（建物・水・人のいるマスでない）の固まりを探す：node pocket81_check.js [2d] [id,id,...]
//   古いセーブの位置を「いちばん近い歩けるマス」へ写したときに、閉じこめられる所がないかの確かめ
//   KNOWN：わけがあって行けない飾りの地面（数が変わったら NG）
const load = require('../v78/load78.js');
const two = process.argv[2] === '2d'; const A = load(two ? { earth: false, join: false } : {}); const w = A.w; w.State.newGame('t', 'warrior'); w.World.start(); const d = w.State.data;
const KNOWN = {
  rivel_town: { n: 83, why: '堀の内側の城の島（城の建物の扉からしか出入りしない。前庭から跳ね橋で城の扉へ）' },
  harbor_town: { n: 3, why: '東の端の岸の 3 マス（海と柵のあいだ）' },
  verum_town: { n: 5, why: '工房の通りの作業台の列のあいだ（両はしに動かない職人がいる）' },
  sentra_capital: { n: 32, why: '王宮の門（通行証の鍵）の奥の、城郭区画へ出る北の道（v8.3。鍵を開けると通れる）' }
};
const ids = (process.argv[3] || '').split(',').filter(Boolean); const all = ids.length ? ids : Object.keys(w.MapRemake.maps).filter((k) => w.MapRemake.maps[k].r81 && w.MAP_DEFS[k] && w.MAP_DEFS[k].kind === 'town');
let ng = 0;
for (const id of all) { w.World.maps = {}; const m = w.World.getMap(id); const spec = w.Remake81.specs[id]; const ar = (spec && spec.arrive) || [m.w >> 1, m.h - 3];
  const seen = new Set([ar[0] + ',' + ar[1]]); const q = [ar];
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, k = X + ',' + Y; if (seen.has(k) || X < 0 || Y < 0 || X >= m.w || Y >= m.h) continue; if (!m.passable(X, Y, d)) continue; seen.add(k); q.push([X, Y]); } }
  const bad = []; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const t = m.tile(x, y); if (seen.has(x + ',' + y) || /^bld/.test(t) || w.Tiles.isWater(t) || !m.passable(x, y, d) || m.npcAt(x, y)) continue; bad.push(x + ',' + y + ':' + t); }
  const kn = KNOWN[id]; const okk = !bad.length || (kn && kn.n === bad.length); if (!okk) ng++;
  console.log((okk ? 'OK  ' : 'NG  ') + id + '：行けない歩けるマス ' + bad.length + (kn && bad.length ? '（わけあり：' + kn.why + '）' : bad.length ? ' ' + bad.slice(0, 8).join(' ') : '')); }
console.log('結果：' + (ng ? 'NG ' + ng : 'すべて OK'));
