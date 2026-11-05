// v7.6 つないだ世界（js/rpg/world76.js）の確認（jsdom。3D 版と同じく MTQ_JOIN76 を立てて読む）：node docs/tools/v76/world76_check.js
// ・配置：10 地域を世界の座標（840×510）にずらして配置、残りは共通の海。座標の変換（世界 ⇔ 地図＋ローカル）が往復で一致
// ・地形：海岸の手直しで、入口・宝箱などのつながりが変わらない／新しい上陸地点ができない（崖・山の外周）／2D 版の地形は変わらない
// ・境目：徒歩（陸の橋）・小型帆船・遠洋航海船・飛空艇で、端の外へ進むと画面を切り替えずにとなりの地図へ（乗り物ごと）。遠洋の長い航海を実際に 1 歩ずつ
// ・進入の条件：すべての地域のすべての境目で、条件の前は止まる（徒歩・帆船・遠洋航海船・飛空艇）。小型帆船は外海へ出られない。暗黒大陸は飛空艇だけ
// ・物語の段階ごとに、地上の移動だけで行ける地域を数えて、前の版の航路の条件と同じか
// ・セーブ：形は「地図の ID＋ローカル座標」のまま。共通の海・前の版の外海にいるセーブを「つながない」で読むと、近い地域の端へ（乗り物ごと）
// ・2D 版（MTQ_JOIN76 なし）は何も変わらない
const { JSDOM } = require(process.env.JSDOM_PATH || (() => { try { return require.resolve('jsdom'); } catch (e) { return '/home/claude/work/node_modules/jsdom'; } })()); const fs = require('fs'); const path = require('path');
const dir = process.env.RPG_DIR || path.resolve(__dirname, '../../..') + '/';
function load(join) {
  const html = fs.readFileSync(dir + 'index.html', 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://mochipoyo.github.io/mochipoyo-trade-quest/' }); const w = dom.window;
  const ctxStub = new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 10 }) : (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') ? () => ({ addColorStop() {} }) : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : () => {} });
  w.HTMLCanvasElement.prototype.getContext = function () { return ctxStub; }; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.URL.createObjectURL = () => 'blob:x'; w.AudioContext = function () { return { createGain: () => ({ connect() {}, gain: {} }), destination: {} }; };
  const errors = []; w.addEventListener('error', (e) => errors.push(e.message));
  if (join) w.MTQ_JOIN76 = true;
  const srcs = [...html.matchAll(/src="(js\/[^"]+)"/g)].map((m) => m[1]); for (const f of srcs) w.eval(fs.readFileSync(dir + f.replace(/\?.*$/, ''), 'utf8'));
  return { w, errors };
}
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  // ---------- 2D 版
  const B = load(false); const W0 = B.w.World76; B.w.State.newGame('t', 'warrior'); B.w.World.start();
  ok(W0 && !W0.on() && !B.w.MAP_DEFS.sea76_0_0 && B.w.SEA_ROUTES.some((r) => r.from.map === 'world_tempus' && r.to.map === 'world_snow' && !r.join76), '2D 版：つながない（共通の海の地図なし・前の航路のまま）');
  const A = load(true); const w = A.w; const W = w.World76;
  ok(A.errors.length === 0, '読み込みエラーなし ' + A.errors.slice(0, 2).join(' / '));
  ok(W && W.on(), 'つないだ世界が有効');
  // ---------- 配置と座標
  const S = W.size(); ok(S.w === 840 && S.h === 510, '世界の大きさ ' + S.w + '×' + S.h + '（40×30 のブロック ' + S.bw + '×' + S.bh + '）');
  w.State.newGame('t', 'warrior'); w.World.start(); const d = w.State.data;
  ok(W.REGIONS.length === 10 && W.REGIONS.every((id) => { const m = w.World.getMap(id); const r = W.rect(id); return m.w === 160 && m.h === 120 && r.w === 160 && r.h === 120; }), '10 地域すべて 160×120 で配置');
  let cover = 0; for (let gy = 0; gy < S.h; gy += 5) for (let gx = 0; gx < S.w; gx += 5) { const L = W.toLocal(gx, gy); if (L && W.toGlobal(L.map, L.x, L.y).x === gx && W.toGlobal(L.map, L.x, L.y).y === gy) cover++; }
  ok(cover === (S.w / 5) * (S.h / 5), '世界のすべての点が、ちょうど 1 つの地図に入り、座標の変換が往復で一致（' + cover + ' 点）');
  ok(W.SEAS.length > 0 && W.SEAS.every((id) => { const m = w.World.getMap(id); const r = W.rect(id); return m.w === r.w && m.h === r.h && m.kind === 'field' && !(m.def.encounters); }), '共通の海 ' + W.SEAS.length + ' 枚（地図の大きさ＝配置の大きさ・陸の出現表なし。船の上は乗り物の出現表）');
  const pl = W.PLACE; const adj = (a, side, b) => { const ra = W.rect(a), rb = W.rect(b); if (side === 'e') return ra.x + ra.w <= rb.x && ra.y < rb.y + rb.h && rb.y < ra.y + ra.h; if (side === 's') return ra.y + ra.h <= rb.y && ra.x < rb.x + rb.w && rb.x < ra.x + ra.w; if (side === 'n') return rb.y + rb.h <= ra.y && ra.x < rb.x + rb.w && rb.x < ra.x + ra.w; return false; };
  ok(adj('world', 'e', 'world_grania') && adj('world', 's', 'world_islands') && adj('world_islands', 'e', 'world_tempus') && adj('world_tempus', 'e', 'world_magicka') && adj('world_islands', 's', 'world_desert') && adj('world_magicka', 's', 'world_dragon') && adj('world_tempus', 'n', 'world_snow') && adj('world_grania', 'n', 'world_kalion'),
    '前の航路の向き（東の航路＝東どなり など）と同じ並び：アルカディア→東グラニア・南断裂群島、群島→東時の神殿領・南リシア砂漠、神殿領→東魔導王国・北雪原、魔導王国→南竜炎火山群島、グラニア→北カリオン（灰の峠）');
  const gp = W.toGlobal('world_grania', 60, 24), kp = W.toGlobal('world_kalion', 60, 104); ok(gp.x === kp.x && kp.y < gp.y, '灰の峠の南口（グラニア）と北口（カリオン）が南北にそろう（x=' + gp.x + '）');
  // ---------- 地形
  const anchorsOf = (wd, id) => { const def = wd.MAP_DEFS[id]; return (def.locations || []).concat(def.chests || [], def.npcs || [], def.events || []).filter((o) => o && typeof o.x === 'number').map((o) => [o.x, o.y]); };
  const comps = (wd, m) => { const lab = new Int32Array(m.w * m.h).fill(-1); let n = 0; const q = []; for (let s = 0; s < m.w * m.h; s++) { const x = s % m.w, y = (s / m.w) | 0; if (lab[s] >= 0 || !m.passable(x, y, null)) continue; lab[s] = n; q.length = 0; q.push(s); while (q.length) { const c = q.pop(); const cx = c % m.w, cy = (c / m.w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = cx + dx, yy = cy + dy; if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) continue; const k = yy * m.w + xx; if (lab[k] >= 0 || !m.passable(xx, yy, null)) continue; lab[k] = n; q.push(k); } } n++; } return lab; };
  const labNear = (lab, m, x, y) => { for (let r = 0; r <= 1; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) continue; if (lab[yy * m.w + xx] >= 0) return lab[yy * m.w + xx]; } return -1; };
  let reachOk = true, reachMsg = []; let landOk = true, landMsg = [];
  const isWater = (wd, m, x, y) => x < 0 || y < 0 || x >= m.w || y >= m.h || wd.Tiles.isWater(m.tiles[y][x]) && !(W.isBridge76 && W.isBridge76(m.id, x, y));
  for (const id of W.REGIONS) {
    const m0 = B.w.World.getMap(id), m1 = w.World.getMap(id); const L0 = comps(B.w, m0), L1 = comps(w, m1); const an = anchorsOf(w, id);
    const A0 = an.map((a) => labNear(L0, m0, a[0], a[1])), A1 = an.map((a) => labNear(L1, m1, a[0], a[1]));
    for (let i = 0; i < an.length; i++) { if ((A0[i] >= 0) !== (A1[i] >= 0)) { reachOk = false; reachMsg.push(id + ' ' + an[i]); } for (let j = i + 1; j < an.length; j++) if (A0[i] >= 0 && A0[j] >= 0 && (A0[i] === A0[j]) !== (A1[i] === A1[j])) { reachOk = false; reachMsg.push(id + ' ' + an[i] + '-' + an[j]); } }
    if (id === 'world_desert' || id === 'world_snow') for (let y = 0; y < 120; y++) for (let x = 0; x < 160; x++) { if (!m1.passable(x, y, null)) continue; const coast1 = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isWater(w, m1, x + dx, y + dy)); if (!coast1) continue; const coast0 = m0.passable(x, y, null) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isWater(B.w, m0, x + dx, y + dy)); if (!coast0) { landOk = false; if (landMsg.length < 5) landMsg.push(id + ' ' + x + ',' + y); } }
  }
  ok(reachOk, '海岸の手直し・山並み・橋のあとも、どの地域でも入口・宝箱・人・出来事どうしのつながりは 2D 版と同じ ' + reachMsg.slice(0, 5).join(' / '));
  ok(landOk, 'リシア砂漠・忘却の雪原：新しい上陸地点なし（海に面した歩けるマスは、もとから海に面していたものだけ＝砂嵐の回廊などを船で回りこめない）' + landMsg.join(' / '));
  const changed = {}; W.REGIONS.forEach((id) => { const a = B.w.MAP_DEFS[id].rows(), b = w.MAP_DEFS[id].rows(); let n = 0; for (let y = 0; y < a.length; y++) for (let x = 0; x < a[y].length; x++) if (a[y][x] !== b[y][x]) n++; changed[id] = n; });
  ok(Object.keys(changed).every((id) => ['world_desert', 'world_snow', 'world_dragon', 'world_grania', 'world_kalion', 'world_tempus', 'world_magicka'].includes(id) || changed[id] === 0), 'つないだときに地形を変えた地域（ほかは 2D 版と同じ）' + JSON.stringify(changed));
  ok(JSON.stringify(B.w.MAP_DEFS.world_desert.rows()) !== JSON.stringify(w.MAP_DEFS.world_desert.rows()) && !B.w.World76.on(), '2D 版の地形は手直しの前のまま（同じページに 2 つ読み込んで比べた）');
  // 境目：地図どうしの境目で、海の深さの種類が急に変わらない（共通の海は陸からの距離で決まる）
  let seam = 0, seamN = 0; for (const id of W.MAPS) { const r = W.rect(id); const m = w.World.getMap(id); for (let x = 0; x < r.w; x++) { const g = { x: r.x + x, y: r.y + r.h }; const L = W.toLocal(g.x, g.y); if (!L) continue; const t0 = m.tiles[r.h - 1][x], t1 = w.World.getMap(L.map).tiles[L.y][L.x]; seamN++; if ((t0 === 'shallow') !== (t1 === 'shallow') && !w.Tiles.isWater(t0) === !w.Tiles.isWater(t1)) seam++; } }
  ok(seamN > 0, '境目の地形を比べた（南北の境目 ' + seamN + ' マス。浅瀬の有無が食い違う所 ' + seam + '：地域の中の浅瀬は地域の地形のまま）');
  // ---------- 境目を越える
  const T = w.Engine.TS; const p = w.World.player;
  function place(map, x, y, aboard) { d.aboard = aboard || null; if (aboard) { d.vehicles[aboard] = { owned: true, map, x, y, port: { map, x, y } }; } w.World.enterMap(map, x, y, 'down', { raw: true }); w.World.busy = false; }
  function step(dir) { const r = w.World.tryMove(dir); if (r) { p.x = p.tx; p.y = p.ty; p.px = p.x * T; p.py = p.y * T; p.moving = false; w.World.onStep(); w.World.busy = false; } return r; }
  function findWater(map, x, y, vid, side) { const m = w.World.getMap(map); for (let k = 0; k < m.h; k++) { const yy = side === 'e' || side === 'w' ? (y + k) % m.h : y, xx = side === 'n' || side === 's' ? (x + k) % m.w : x; if (w.Vehicle.terrainOk(vid, m, xx, yy)) return { x: xx, y: yy }; } return null; }
  const ev = []; W.onSwitch((e) => ev.push(e)); const setF = (fs) => { Object.keys(W.GATE).forEach((id) => delete d.flags[W.GATE[id].flag]); ['ship_ready', 'galleon_ready', 'airship_owned'].forEach((f) => delete d.flags[f]); fs.forEach((f) => d.flags[f] = true); };
  setF(['ship_ready']); d.stepsSinceBattle = 5; d.steps = 100;
  let s0 = findWater('world', 159, 40, 'sailboat', 'e'); place('world', s0.x, s0.y, 'sailboat'); const st0 = { steps: d.steps };
  let r = step('right'); ok(r === true && w.World.map.id === 'world_grania' && p.x === 0 && p.y === s0.y && d.vehicles.sailboat.map === 'world_grania' && d.pos.map === 'world_grania', '帆船：アルカディアの東の端 → グラニアの西の端（乗り物ごと・画面の切り替えなし）' + ' ' + w.World.map.id + ' ' + p.x + ',' + p.y);
  ok(ev.length === 1 && ev[0].dx === 160 && ev[0].dy === 0 && d.steps === st0.steps + 1, '3D への知らせ（ずれ 160,0）・歩数はふつうに 1 つ進む（境目で初期化しない）');
  r = step('left'); ok(r === true && w.World.map.id === 'world' && p.x === 159, '帆船：戻る（両方向）');
  // 帆船は外海へ出られない（遠洋航海船のあとも）
  setF(['ship_ready', 'galleon_ready']); s0 = findWater('world', 30, 119, 'sailboat', 's'); place('world', s0.x, s0.y, 'sailboat'); r = step('down');
  ok(r === false && w.World.map.id === 'world', '小型帆船は、遠洋航海船を手に入れたあとも、アルカディアの南（共通の海・断裂群島）へ出られない（' + (W.toLocal(W.toGlobal('world', s0.x, 120).x, W.toGlobal('world', s0.x, 120).y) || {}).map + '）');
  // 遠洋航海船：アルカディア → 共通の海 → 断裂群島（1 歩ずつ）
  const drift0 = w.Vehicle.drift; w.Vehicle.drift = () => null;   // 航海の確認の間は海流を止める（海流は同じ地図の中だけで動かす＝境目は越えない。vehicle.js）
  const voyage = (from, fx, fy, toMap, vid, maxSteps) => {   // 世界の座標で通れる道を探して、1 歩ずつ tryMove で進む
    const WW = S.w, WH = S.h; const g0 = W.toGlobal(from, fx, fy); const prev = new Int32Array(WW * WH).fill(-2); const q = [g0.y * WW + g0.x]; prev[q[0]] = -1; let goal = -1;
    const okAt = (gx, gy, fromId) => { const L = W.toLocal(gx, gy); if (!L) return false; if (L.map !== fromId && W.entryBlock(L.map, vid, fromId)) return false; const m = w.World.getMap(L.map); return w.Vehicle.terrainOk(vid, m, L.x, L.y); };
    for (let h = 0; h < q.length && goal < 0; h++) { const c = q[h]; const cx = c % WW, cy = (c / WW) | 0; const fromId = W.mapAt(cx, cy); if (fromId === toMap) { goal = c; break; } for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= WW || ny >= WH) continue; const k = ny * WW + nx; if (prev[k] !== -2 || !okAt(nx, ny, fromId)) continue; prev[k] = c; q.push(k); } }
    if (goal < 0) return { found: false };
    const pathC = []; for (let c = goal; c >= 0; c = prev[c]) pathC.push(c); pathC.reverse();
    place(from, fx, fy, vid); const maps = new Set([from]); let ok2 = true, n = 0;
    let why = '';
    for (let i = 1; i < pathC.length && n < maxSteps; i++, n++) { const a = pathC[i - 1], b = pathC[i]; const dir = b - a === 1 ? 'right' : b - a === -1 ? 'left' : b > a ? 'down' : 'up'; d.stepsSinceBattle = 0; const rr = step(dir); if (!rr) { ok2 = false; why = '止まった ' + w.World.map.id + ' ' + p.x + ',' + p.y + ' ' + dir; break; } const g = W.toGlobal(w.World.map.id, p.x, p.y); if (g.x !== b % WW || g.y !== ((b / WW) | 0)) { ok2 = false; why = '位置 ' + JSON.stringify(g) + ' 期待 ' + (b % WW) + ',' + ((b / WW) | 0); break; } maps.add(w.World.map.id); }
    return { found: true, ok: ok2, steps: n, end: w.World.map.id, maps: [...maps], veh: d.vehicles[vid] && d.vehicles[vid].map, why };
  };
  const g1 = findWater('world', 40, 100, 'galleon', 's'); const v1 = voyage('world', g1.x, g1.y, 'world_islands', 'galleon', 3000);
  ok(v1.found && v1.ok && v1.end === 'world_islands' && v1.veh === 'world_islands', '遠洋航海船：アルカディア → 断裂群島（' + v1.steps + ' 歩・通った地図 ' + (v1.maps || []).join('→') + '）。ワープなし（毎歩、世界の座標が 1 マスだけ動く）');
  setF(['ship_ready', 'galleon_ready', 'yorn_letter_done']); const v2 = voyage('world_islands', 80, 2, 'world_tempus', 'galleon', 4000);
  ok(v2.found && v2.ok && v2.end === 'world_tempus', '遠洋航海船：断裂群島 → 共通の海 → 時の神殿領（' + v2.steps + ' 歩・' + (v2.maps || []).length + ' 枚の地図）' + (v2.why || ''));
  // 着いた地域で上陸 → 歩く → 船に戻って乗る
  const landTest = (mapId, vid) => { const m = w.World.getMap(mapId); const sx = p.x, sy = p.y; const prev = {}; const q = [[sx, sy]]; prev[sx + ',' + sy] = null; let goal = null;
    while (q.length && !goal) { const [cx, cy] = q.shift(); for (const [dx, dy, dn] of [[1, 0, 'right'], [-1, 0, 'left'], [0, 1, 'down'], [0, -1, 'up']]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; if (m.passable(nx, ny, d) && !w.Tiles.isWater(m.tiles[ny][nx]) && !m.warpAt(nx, ny)) { goal = { x: cx, y: cy, land: [nx, ny], dir: dn }; break; } const k = nx + ',' + ny; if (k in prev || !w.Vehicle.terrainOk(vid, m, nx, ny)) continue; prev[k] = [cx, cy, dn]; q.push([nx, ny]); } }
    if (!goal) return { ok: false, why: '上陸できる岸が見つからない' }; const dirs = []; for (let c = [goal.x, goal.y]; prev[c[0] + ',' + c[1]]; ) { const pv = prev[c[0] + ',' + c[1]]; dirs.unshift(pv[2]); c = [pv[0], pv[1]]; }
    for (const dn of dirs) { d.stepsSinceBattle = 0; if (!step(dn)) return { ok: false, why: '岸まで進めない' }; }
    const shipAt = { x: p.x, y: p.y }; d.stepsSinceBattle = 0; if (!step(goal.dir) || d.aboard) return { ok: false, why: '上陸できない' }; const ashore = { x: p.x, y: p.y, aboard: d.aboard, veh: { ...d.vehicles[vid] } };
    const back = { right: 'left', left: 'right', up: 'down', down: 'up' }[goal.dir]; d.stepsSinceBattle = 0; const rb = step(back);
    return { ok: !!rb && d.aboard === vid && p.x === shipAt.x && p.y === shipAt.y && ashore.veh.map === mapId && ashore.veh.x === shipAt.x && ashore.veh.y === shipAt.y, ship: shipAt, ashore, again: d.aboard };
  };
  const lt = landTest('world_tempus', 'galleon'); ok(lt.ok, '時の神殿領に着いたあと：岸で上陸 → 船は岸に残る → 戻って乗る（' + JSON.stringify(lt).slice(0, 160) + '）');
  const v3 = voyage('world_tempus', 80, 2, 'world_snow', 'galleon', 4000); ok(v3.found && v3.ok && v3.end === 'world_snow', '遠洋航海船：時の神殿領 → 北の忘却の雪原（' + v3.steps + ' 歩・' + (v3.maps || []).length + ' 枚の地図）' + (v3.why || ''));
  w.Vehicle.drift = drift0;
  // 飛空艇：時の神殿領 → 魔導王国（結界）
  setF(['ship_ready', 'galleon_ready', 'yorn_letter_done', 'airship_owned']); place('world_tempus', 159, 30, 'airship'); r = step('right'); ok(r === false && w.World.map.id === 'world_tempus', '飛空艇でも、まだ行けない魔導王国には入れない');
  d.flags.zeromea_choice_done = true; r = step('right'); ok(r === true && w.World.map.id === 'world_magicka' && d.vehicles.airship.map === 'world_magicka', '飛空艇：フラグのあと魔導王国へ');
  // 徒歩：陸の橋（時の神殿領 → 魔導王国）
  const br = W.BRIDGES[0].at; place('world_tempus', 159, br.y, null); r = step('right'); ok(r === true && w.World.map.id === 'world_magicka' && p.x === 0 && p.y === br.y && !d.aboard, '徒歩：陸の橋を歩いて時の神殿領 → 魔導王国');
  r = step('left'); ok(r === true && w.World.map.id === 'world_tempus' && p.x === 159, '徒歩：戻る');
  delete d.flags.zeromea_choice_done; place('world_tempus', 159, br.y, null); r = step('right'); ok(r === false && w.World.map.id === 'world_tempus', '徒歩でも、まだ行けない地域には入れない');
  ok(W.isBridge76('world_tempus', 159, br.y) && w.Vehicle.terrainOk('galleon', w.World.getMap('world_tempus'), 159, br.y), '船は陸の橋の下をくぐれる');
  // 暗黒大陸：船では入れない・飛空艇だけ
  setF(['ship_ready', 'galleon_ready', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived', 'airship_owned', 'dark_route_open']);
  const darkNb = W.neighbors('world_dark'); let shipBlocked = true, airOk = false;
  for (const nb of darkNb) { const r0 = W.rect(nb.id), rd = W.rect('world_dark'); const side = { n: 's', s: 'n', e: 'w', w: 'e' }[nb.side]; const dir = { n: 'down', s: 'up', e: 'left', w: 'right' }[nb.side];
    for (let k = nb.a; k <= nb.b; k += 7) { const gx = nb.side === 'n' || nb.side === 's' ? rd.x + k : (nb.side === 'w' ? rd.x - 1 : rd.x + rd.w), gy = nb.side === 'e' || nb.side === 'w' ? rd.y + k : (nb.side === 'n' ? rd.y - 1 : rd.y + rd.h); const L = W.toLocal(gx, gy); if (!L) continue;
      const m = w.World.getMap(L.map); if (w.Vehicle.terrainOk('galleon', m, L.x, L.y)) { place(L.map, L.x, L.y, 'galleon'); if (step(dir)) shipBlocked = false; }
      if (!airOk) { place(L.map, L.x, L.y, 'airship'); if (step(dir) && w.World.map.id === 'world_dark') airOk = true; } } }
  ok(shipBlocked && airOk, '暗黒大陸：闇の空路のあとも、船ではどの境目からも入れない・飛空艇なら入れる（もとの「闇の空路」と同じ乗り物）');
  // 世界の果て
  const edgeMap = W.mapAt(S.w - 1, 200); const er = W.rect(edgeMap); place(edgeMap, er.w - 1, 200 - er.y, 'airship'); r = step('right'); ok(r === false && w.World.map.id === edgeMap, '世界の東の果ては進めない（' + edgeMap + '）');
  // ---------- 進入の条件：すべての地域・すべての境目・すべての手段
  let gateNG = []; let gateTried = 0;
  for (const id of Object.keys(W.GATE)) { setF(['ship_ready', 'galleon_ready', 'airship_owned']); delete d.flags[W.GATE[id].flag]; if (W.GATE[id].flag === 'galleon_ready') delete d.flags.galleon_ready;
    const rd = W.rect(id); for (const nb of W.neighbors(id)) { const dir = { n: 'down', s: 'up', e: 'left', w: 'right' }[nb.side];
      for (let k = nb.a; k <= nb.b; k += 3) { const gx = nb.side === 'n' || nb.side === 's' ? rd.x + k : (nb.side === 'w' ? rd.x - 1 : rd.x + rd.w), gy = nb.side === 'e' || nb.side === 'w' ? rd.y + k : (nb.side === 'n' ? rd.y - 1 : rd.y + rd.h); const L = W.toLocal(gx, gy); if (!L || L.map === id) continue; const m = w.World.getMap(L.map);
        for (const vid of [null, 'sailboat', 'galleon', 'airship']) { const okT = vid ? (vid === 'airship' || w.Vehicle.terrainOk(vid, m, L.x, L.y)) : m.passable(L.x, L.y, d); if (!okT) continue; place(L.map, L.x, L.y, vid); gateTried++; if (step(dir) && w.World.map.id === id) gateNG.push(id + ' ' + (vid || '徒歩') + ' ' + L.map); } } } }
  ok(gateNG.length === 0 && gateTried > 300, '条件の前は、どの地域のどの境目からも、徒歩・帆船・遠洋航海船・飛空艇のどれでも入れない（' + gateTried + ' 回ためした）' + gateNG.slice(0, 4).join(' / '));
  // ---------- 物語の段階ごとに、地上の移動だけで行ける地域（徒歩・持っている乗り物。町やダンジョンを通る道は数えない）
  function reachable(flags) {
    setF(flags); const WW = S.w, WH = S.h; const vehs = ['sailboat', 'galleon', 'airship'].filter((v) => d.flags[w.VEHICLES[v].unlockFlag]);
    const seen = { walk: new Uint8Array(WW * WH) }; vehs.forEach((v) => seen[v] = new Uint8Array(WW * WH)); const regs = new Set();
    const st = W.toGlobal('world', 46, 66); const q = [['walk', st.y * WW + st.x]]; seen.walk[q[0][1]] = 1;
    const can = (mode, gx, gy, fromId) => { const L = W.toLocal(gx, gy); if (!L) return null; if (L.map !== fromId && W.entryBlock(L.map, mode === 'walk' ? null : mode, fromId)) return null; const m = w.World.getMap(L.map); if (mode === 'walk') return m.passable(L.x, L.y, d) ? L : null; if (mode === 'airship') return L; return w.Vehicle.terrainOk(mode, m, L.x, L.y) ? L : null; };
    while (q.length) { const [mode, c] = q.pop(); const cx = c % WW, cy = (c / WW) | 0; const id = W.mapAt(cx, cy); if (W.isRegion(id)) { const L = W.toLocal(cx, cy); const m = w.World.getMap(id); if (m.passable(L.x, L.y, d) || mode !== 'walk') regs.add(id); }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= WW || ny >= WH) continue; const k = ny * WW + nx;
        if (!seen[mode][k] && can(mode, nx, ny, id)) { seen[mode][k] = 1; q.push([mode, k]); }
        if (mode === 'walk') vehs.forEach((v) => { if (v !== 'airship' && !seen[v][k] && can(v, nx, ny, id)) { seen[v][k] = 1; q.push([v, k]); } });   // 岸から船へ（船は港へ呼べる・乗れる）
        else if (!seen.walk[k] && can('walk', nx, ny, id)) { seen.walk[k] = 1; q.push(['walk', k]); } }   // 船・飛空艇から陸へ降りる
      if (mode === 'walk' && vehs.includes('airship') && !seen.airship[c]) { seen.airship[c] = 1; q.push(['airship', c]); } }
    return [...regs].filter((id) => W.isRegion(id)).sort();
  }
  const stages = [
    [['ship_ready'], ['world', 'world_grania']],
    [['ship_ready', 'kalion_open'], ['world', 'world_grania']],
    [['ship_ready', 'kalion_open', 'galleon_ready'], ['world', 'world_grania', 'world_islands', 'world_kalion']],
    [['ship_ready', 'kalion_open', 'galleon_ready', 'yorn_letter_done'], ['world', 'world_desert', 'world_grania', 'world_islands', 'world_kalion', 'world_snow', 'world_tempus']],
    [['ship_ready', 'kalion_open', 'galleon_ready', 'yorn_letter_done', 'zeromea_choice_done'], ['world', 'world_desert', 'world_grania', 'world_islands', 'world_kalion', 'world_magicka', 'world_snow', 'world_tempus']],
    [['ship_ready', 'kalion_open', 'galleon_ready', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived', 'airship_owned'], ['world', 'world_desert', 'world_dragon', 'world_grania', 'world_islands', 'world_kalion', 'world_magicka', 'world_snow', 'world_tempus']],
    [['ship_ready', 'kalion_open', 'galleon_ready', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived', 'airship_owned', 'dark_route_open'], ['world', 'world_dark', 'world_desert', 'world_dragon', 'world_grania', 'world_islands', 'world_kalion', 'world_magicka', 'world_snow', 'world_tempus']]
  ];
  for (const [fl, want] of stages) { const got = reachable(fl); ok(JSON.stringify(got) === JSON.stringify(want.slice().sort()), '段階 [' + fl.join(',') + ']：地上の移動で行ける地域 ' + got.map((id) => id.replace('world_', '')).join('・') + (JSON.stringify(got) === JSON.stringify(want.slice().sort()) ? '' : '（期待 ' + want.join('・') + '）')); }
  // ---------- 天空群島へ（世界の北の果てから飛空艇で）
  setF(['ship_ready', 'galleon_ready', 'airship_owned']); const topMap = W.mapAt(300, 0); place(topMap, 300 - W.rect(topMap).x, 0, 'airship'); r = w.World.tryMove('up');
  ok(r === true && w.World.busy === true, '飛空艇：世界の北の果てから上へ → 天空群島へ上がる（' + topMap + '・別の空間への入口）');
  w.World.busy = false;
  // ---------- 到着先の確かめ（ワープ・イベントの移動）
  setF(['ship_ready']); d.lastInn = { map: 'poyo_village', x: 24, y: 32 }; place('world', 40, 60, null); w.World.enterMap('world_magicka', 80, 60, 'down');
  const g1m = w.World.map.id; place('magicka_city', 10, 10, null); w.World.enterMap('world_magicka', 80, 60, 'down'); const g2m = w.World.map.id;
  ok(g1m !== 'world_magicka' && g2m === 'world_magicka', 'まだ行けない地域へ、ほかの地域からワープで着こうとすると止める（' + g1m + '）／その地域の町から出るときは止めない（' + g2m + '）');
  // ---------- セーブ
  setF(['ship_ready', 'galleon_ready', 'yorn_letter_done']); const sea = W.SEAS.find((id) => { const m = w.World.getMap(id); return w.Vehicle.terrainOk('galleon', m, 5, 5); }); place(sea, 5, 5, 'galleon');
  const save = JSON.parse(JSON.stringify(d)); ok(save.pos.map === sea && save.vehicles.galleon.map === sea, '共通の海でのセーブ：形は「地図の ID＋ローカル座標」（' + sea + ' 5,5）');
  const C = load(false); C.w.State.newGame('t', 'warrior'); C.w.State.data = save; const moved = C.w.World76.normalizeSave(save);
  ok(moved && C.w.MAP_DEFS[save.pos.map] && C.w.World76.isRegion(save.pos.map) && save.vehicles.galleon.map === save.pos.map, '共通の海のセーブを「つながない」で読む → いちばん近い地域の端へ（' + save.pos.map + ' ' + save.pos.x + ',' + save.pos.y + '・遠洋航海船ごと）');
  try { C.w.World.start(); ok(C.w.World.map && C.w.World.map.id === save.pos.map, 'そのセーブで始められる'); } catch (e) { ok(false, 'そのセーブで始められない ' + e.message); }
  const again = C.w.World76.normalizeSave(save); ok(!again, 'もう一度読んでも二重に動かさない');
  const legacy = JSON.parse(JSON.stringify(d)); legacy.pos = { map: 'sea76_south', x: 80, y: 3, dir: 'up' }; legacy.vehicles.galleon = { owned: true, map: 'sea76_south', x: 80, y: 3, port: { map: 'world', x: 19, y: 72 } }; legacy.aboard = 'galleon';
  const mv2 = W.normalizeSave(legacy); ok(mv2 && legacy.pos.map === 'world_tempus' && legacy.vehicles.galleon.map === 'world_tempus', '前の版の外海（sea76_south）にいるセーブ → その版の並びで近い地域（時の神殿領）の端へ ' + JSON.stringify(legacy.pos));
  // ---------- 案内
  setF(['ship_ready', 'kalion_open', 'galleon_ready', 'yorn_letter_done', 'zeromea_choice_done', 'magicka_arrived']); d.vehicles.galleon = { owned: true, map: 'world', x: 19, y: 72, port: { map: 'world', x: 19, y: 72 } }; place('world', 40, 60, null);
  const plan = w.Nav && w.Nav.plan ? w.Nav.plan('world', 'world_snow') : null; ok(Array.isArray(plan) && plan.some((mv) => mv.type === 'edge'), '次の目的地の案内：アルカディア → 忘却の雪原を、となりどうしの地図の道で計画できる（' + (plan || []).filter((mv) => mv.type === 'edge').map((mv) => mv.e.to).join('→') + '）');
  console.log('境目を越えた回数', W.crossings);
  console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
})();
