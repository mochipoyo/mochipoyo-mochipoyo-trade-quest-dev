// v8.3 学院（volatilia）を広げる前（r81.1）に主人公が立てたマスを集める：RPG_DIR=<前の版を広げた所>/ node vol83_dump.js out.json [2d]
//   そのあと node vol83_migrate_test.js out.json [2d] [間引き]（r81.1 の座標のセーブを、広げた版 r81.2 で読む）
const load = require(process.env.RPG_DIR + 'docs/tools/v78/load78.js');
const two = process.argv[3] === '2d'; const A = load(two ? { earth: false, join: false } : {}); const w = A.w; w.State.newGame('t', 'warrior'); w.World.start();
const out = {}; const id = 'volatilia'; w.World.maps = {}; const m = w.World.getMap(id); const L = [];
if (w.MapRemake.maps[id].version !== 'r81.1') throw new Error(id + ' は r81.1 でない（' + w.MapRemake.maps[id].version + '）');
for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.passable(x, y, w.State.data) && !/^bld/.test(m.tile(x, y)) && !m.warpAt(x, y)) L.push([x, y]);
out[id] = L; require('fs').writeFileSync(process.argv[2], JSON.stringify(out)); console.log(id, L.length, 'マス');
