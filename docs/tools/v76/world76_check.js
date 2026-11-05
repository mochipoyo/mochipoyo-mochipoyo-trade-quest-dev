// v7.6 つないだ世界（js/rpg/world76.js）の確認（jsdom。3D 版と同じく MTQ_JOIN76 を立てて読む）：node docs/tools/v76/world76_check.js
// ・配置：10 地域＋外海 2、大きさ 160×120、となりどうしの海路・陸の橋
// ・境目：徒歩（陸の橋）・帆船・遠洋航海船・飛空艇で、端の外へ進むと画面を切り替えずにとなりの地域へ（乗り物ごと）
// ・まだ行けない地域：フラグが立つまで、どの手段でも止まる（理由の表示）
// ・セーブ：地域ID＋座標のまま。外海にいるセーブを「つながない」で読むと、となりの地域の端へ
// ・2D 版（MTQ_JOIN76 なし）は何も変わらない
const { JSDOM } = require(process.env.JSDOM_PATH || (() => { try { return require.resolve('jsdom'); } catch (e) { return '/home/claude/work/node_modules/jsdom'; } })()); const fs = require('fs'); const path = require('path');
const dir = process.env.RPG_DIR || path.resolve(__dirname, '../../..') + '/';
function load(join) {
  const html = fs.readFileSync(dir + 'index.html', 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://mochipoyo.github.io/mochipoyo-trade-quest/' }); const w = dom.window;
  const ctxStub = new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 10 }) : (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  w.HTMLCanvasElement.prototype.getContext = function () { return ctxStub; }; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.URL.createObjectURL = () => 'blob:x'; w.AudioContext = undefined;
  const errors = []; w.addEventListener('error', (e) => errors.push(e.message));
  if (join) w.MTQ_JOIN76 = true;
  const srcs = [...html.matchAll(/src="(js\/[^"]+)"/g)].map((m) => m[1]); for (const f of srcs) w.eval(fs.readFileSync(dir + f.replace(/\?.*$/, ''), 'utf8'));
  return { w, errors };
}
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  // 2D 版
  const B = load(false); const W0 = B.w.World76;
  ok(W0 && !W0.on() && !B.w.MAP_DEFS.sea76_south && B.w.SEA_ROUTES.some((r) => r.from.map === 'world_tempus' && r.to.map === 'world_snow'), '2D 版：つながない（外海の地図なし・海路はもとのまま）');
  const A = load(true); const w = A.w; const W = w.World76;
  ok(A.errors.length === 0, '読み込みエラーなし ' + A.errors.slice(0, 2).join(' / '));
  ok(W && W.on(), 'つないだ世界が有効');
  const S = W.size(); ok(S.w === 640 && S.h === 360, '世界の大きさ ' + S.w + '×' + S.h);
  w.State.newGame('t', 'warrior'); w.World.start(); const d = w.State.data;
  const all = W.GRID.flat(); ok(all.every((id) => { const m = w.World.getMap(id); return m.w === 160 && m.h === 120; }), '12 区画すべて 160×120（外海を含む）');
  ok(W.BRIDGES.every((b) => b.at), '陸の橋 ' + W.BRIDGES.map((b) => b.a + '→' + b.b + (b.at ? ' y=' + b.at.y + '（' + ((159 - b.at.xa) + b.at.xb) + 'マス）' : ' 作れない')).join('・'));
  ok(w.SEA_ROUTES.filter((r) => r.join76).length === 34 && w.SEA_ROUTES.some((r) => r.sky && r.to.map === 'world_sky'), 'となりどうしの海路 34 本（行き帰り）＋天空群島への空の道');
  // 端を越える
  const T = w.Engine.TS; const p = w.World.player;
  function place(map, x, y, aboard) { d.aboard = aboard || null; if (aboard) { d.vehicles[aboard] = { owned: true, map, x, y, port: { map, x, y } }; } w.World.enterMap(map, x, y, 'down', { raw: true }); w.World.busy = false; }
  function step(dir) { const r = w.World.tryMove(dir); if (r) { p.x = p.tx; p.y = p.ty; p.px = p.x * T; p.py = p.y * T; p.moving = false; w.World.onStep(); } return r; }
  function findWater(map, x, y, vid, side) { const m = w.World.getMap(map); for (let k = 0; k < m.h; k++) { const yy = side === 'e' || side === 'w' ? (y + k) % m.h : y, xx = side === 'n' || side === 's' ? (x + k) % m.w : x; if (w.Vehicle.terrainOk(vid, m, xx, yy)) return { x: xx, y: yy }; } return null; }
  const ev = []; W.onSwitch((e) => ev.push(e));
  // 帆船：アルカディアの東の端 → グラニア
  d.flags.ship_ready = true; let s0 = findWater('world', 159, 40, 'sailboat', 'e'); place('world', s0.x, s0.y, 'sailboat');
  let r = step('right'); ok(r === true && w.World.map.id === 'world_grania' && p.x === 0 && p.y === s0.y && d.vehicles.sailboat.map === 'world_grania' && d.pos.map === 'world_grania', '帆船：アルカディアの東の端 → グラニアの西の端（乗り物ごと・画面の切り替えなし）' + ' ' + w.World.map.id + ' ' + p.x + ',' + p.y);
  ok(ev.length === 1 && ev[0].dx === 160 && ev[0].dy === 0, '3D への知らせ（ずれ 160,0）');
  r = step('left'); ok(r === true && w.World.map.id === 'world' && p.x === 159, '帆船：戻る');
  // 帆船：アルカディアの南 → 断裂群島（遠洋航海船の前は止まる）
  s0 = findWater('world', 30, 119, 'sailboat', 's'); place('world', s0.x, s0.y, 'sailboat');
  r = step('down'); ok(r === false && w.World.map.id === 'world', 'まだ行けない：断裂群島（遠洋航海船の前）は止まる');
  d.flags.galleon_ready = true; r = step('down'); ok(r === true && w.World.map.id === 'world_islands' && p.y === 0, 'フラグのあと：断裂群島へ入れる');
  // 飛空艇：時の神殿領 → 魔導王国（結界）
  d.flags.yorn_letter_done = true; d.flags.airship_owned = true; place('world_tempus', 159, 30, 'airship'); r = step('right'); ok(r === false && w.World.map.id === 'world_tempus', '飛空艇でも、まだ行けない魔導王国には入れない');
  d.flags.zeromea_choice_done = true; r = step('right'); ok(r === true && w.World.map.id === 'world_magicka' && d.vehicles.airship.map === 'world_magicka', '飛空艇：フラグのあと魔導王国へ');
  // 徒歩：陸の橋（時の神殿領 → 魔導王国）
  const br = W.BRIDGES[0].at; place('world_tempus', 159, br.y, null); r = step('right'); ok(r === true && w.World.map.id === 'world_magicka' && p.x === 0 && p.y === br.y && !d.aboard, '徒歩：陸の橋を歩いて時の神殿領 → 魔導王国');
  r = step('left'); ok(r === true && w.World.map.id === 'world_tempus' && p.x === 159, '徒歩：戻る');
  delete d.flags.zeromea_choice_done; place('world_tempus', 159, br.y, null); r = step('right'); ok(r === false && w.World.map.id === 'world_tempus', '徒歩でも、まだ行けない地域には入れない');
  ok(W.isBridge76('world_tempus', 159, br.y) && w.Vehicle.terrainOk('galleon', w.World.getMap('world_tempus'), 159, br.y), '船は陸の橋の下をくぐれる');
  // 世界の外
  place('world_snow', 159, 50, 'airship'); r = step('right'); ok(r === false && w.World.map.id === 'world_snow', '世界の東の果ては進めない');
  // 外海
  s0 = findWater('world_tempus', 40, 119, 'galleon', 's'); place('world_tempus', s0.x, s0.y, 'galleon'); r = step('down'); ok(r === true && w.World.map.id === 'sea76_south', '遠洋航海船：時の神殿領 → 南の外海');
  // セーブ：外海にいるセーブを「つながない」で読む
  const save = JSON.parse(JSON.stringify(d)); const C = load(false); C.w.State.newGame('t', 'warrior'); C.w.State.data = save; const moved = C.w.World76.normalizeSave(save);
  ok(moved && C.w.MAP_DEFS[save.pos.map] && !C.w.World76.isFiller(save.pos.map) && save.vehicles.galleon.map === save.pos.map, '外海にいるセーブを「つながない」で読む → となりの地域の端へ（' + save.pos.map + ' ' + save.pos.x + ',' + save.pos.y + '）');
  try { C.w.World.start(); ok(C.w.World.map && C.w.World.map.id === save.pos.map, 'そのセーブで始められる'); } catch (e) { ok(false, 'そのセーブで始められない ' + e.message); }
  // 次の目的地の案内（海路の計画）
  ok(w.Nav && w.Nav.plan && Array.isArray(w.Nav.plan('world', 'world_snow', true) || []), '次の目的地の案内：つないだ海路で計画できる');
  console.log('境目を越えた回数', W.crossings);
  console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
})();
