// 使い方：git archive 5e6833b（r81.1 の版）を広げた所を RPG_DIR に → node r811_walk_dump.js out.json [2d]（そのあと node r812_migrate_test.js out.json [2d] [間引き]）
// 前の版（r81.1）の 6 町で、主人公が立てたマス（歩ける・建物でない・出口でない）を集める（RPG_DIR に前の版）
const load = require(process.env.RPG_DIR + 'docs/tools/v78/load78.js');
const two = process.argv[3] === '2d'; const A = load(two ? { earth: false, join: false } : {}); const w = A.w; w.State.newGame('t', 'warrior'); w.World.start();
const out = {};
for (const id of ['node_city', 'luxbell', 'frost_town', 'ignas_town', 'tempus_city', 'dark_camp']) { w.World.maps = {}; const m = w.World.getMap(id); const L = [];
  if (w.MapRemake.maps[id].version !== 'r81.1') throw new Error(id + ' は r81.1 でない');
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.passable(x, y, w.State.data) && !/^bld/.test(m.tile(x, y)) && !m.warpAt(x, y)) L.push([x, y]); out[id] = L; }
require('fs').writeFileSync(process.argv[2], JSON.stringify(out)); console.log('ok', Object.keys(out).map((k) => k + ':' + out[k].length).join(' '));
