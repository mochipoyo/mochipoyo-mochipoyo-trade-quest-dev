// v6.5 村・町の「開いている外周」から外へ出る（EdgeExit）の確認：登録データ・行き先・実際の移動・閉じた出口・今のワープ
const load = require('../rpgload.js'); const { w, errors } = load(); const doc = w.document; const E = w.Engine, State = w.State, World = w.World, EX = w.EdgeExit; w.MochiQuest.boot();
const sleep = ms => new Promise(r => setTimeout(r, ms)); const frames = async n => { for (let i = 0; i < n; i++) await sleep(17); };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
const clearUi = () => { doc.querySelectorAll('#ui > *').forEach(n => n.remove()); E.scenes = E.scenes.filter(s => !s.overlay); };
const D = w.MAP_DEFS;
const reachFrom = (m, sx, sy, d) => { const seen = new Set([sx + ',' + sy]); const q = [[sx, sy]]; while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || !m.passable(nx, ny, d)) continue; seen.add(k); if (!m.warpAt(nx, ny)) q.push([nx, ny]); } } return seen; };
const waitIdle = async (ms) => { const t0 = Date.now(); await frames(2); while ((World.busy || World.player.moving) && Date.now() - t0 < (ms || 3000)) await sleep(20); await frames(2); };
(async () => {
  await frames(5); clearUi();
  State.newGame('t', 'warrior'); const d = State.data; d.settings.textSpeed = 'instant'; World.start(); await frames(3); clearUi();
  ok(!!EX, 'EdgeExit が読み込まれている（2D・3D 共通の js/rpg/edgeexit.js）');

  console.log('--- 1. 登録データ：区間のマスは外周の通れるマス・町の中から歩いて行ける ---');
  const towns = Object.values(D).filter(x => (x.kind || 'town') === 'town');
  let segTiles = 0, badSeg = [];
  Object.keys(EX.DEFS).forEach(id => {
    const def = D[id]; ok(!!def && (def.kind || 'town') === 'town', id + '：町・村のマップに登録');
    const m = World.getMap(id); const main = m.warps.filter(x => D[x.to] && (D[x.to].kind === 'field' || D[x.to].region));
    const inside = new Set(); main.forEach(x => { const r = reachFrom(m, x.x, x.y + (x.y === 0 ? 1 : x.y === m.h - 1 ? -1 : 0), d); r.forEach(k => inside.add(k)); });
    EX.segments(m).forEach(s => { for (let i = s.range[0]; i <= s.range[1]; i++) { const x = s.side === 'left' ? 0 : s.side === 'right' ? m.w - 1 : i, y = s.side === 'top' ? 0 : s.side === 'bottom' ? m.h - 1 : i; if (!m.passable(x, y, d) || m.warpAt(x, y) || !inside.has(x + ',' + y)) badSeg.push(id + '@' + x + ',' + y + ':' + m.tiles[y][x]); else segTiles++; } });
  });
  ok(badSeg.length === 0, '区間のマスはすべて「通れる・ワープなし・町の中から行ける」外周（出口になるマス ' + segTiles + '）' + (badSeg.length ? ' NG: ' + badSeg.slice(0, 8).join(' ') : ''));

  console.log('--- 2. 取りこぼし：町・村で、通れるのに出口がない外周のマス ---');
  const uncovered = [];
  towns.forEach(def => { const m = World.getMap(def.id); EX.openEdges(m, d).forEach(t => { const dir = { top: 'up', bottom: 'down', left: 'left', right: 'right' }[t.side]; if (!EX.find(m, t.x, t.y, dir)) uncovered.push(def.id + '@' + t.x + ',' + t.y + '(' + t.side + ')'); }); });
  ok(uncovered.length === 0, '25の町・村：外周の開いたマスはすべて「今のワープ」か「外周の出口」（残り ' + uncovered.length + '）' + (uncovered.length ? ' ' + uncovered.slice(0, 10).join(' ') : ''));
  const closedEdge = towns.filter(def => !EX.DEFS[def.id] && !def.edgeExits && !def.s3121).length;   // v6.9 アサナ村の4枚（印 s3121）は数に入れない（外周の開いたマスは上の確認で見る）
  ok(closedEdge === 23, 'ほかの23の町・村は外周が壁・木・建物・水で閉じている（全周を出口にはしていない）');

  console.log('--- 3. 行き先：出た向きの側・通れる・ワープや宝箱やイベントでない・いつもの出口から歩いて行ける ---');
  const sum = {};
  let badDest = [];
  Object.keys(EX.DEFS).forEach(id => { const m = World.getMap(id); EX.segments(m).forEach(s => { for (let i = s.range[0]; i <= s.range[1]; i++) { const x = s.side === 'left' ? 0 : s.side === 'right' ? m.w - 1 : i, y = s.side === 'top' ? 0 : s.side === 'bottom' ? m.h - 1 : i;
    const dest = EX.destination(m, s, x, y); const F = World.getMap(dest.to);
    const good = F.passable(dest.tx, dest.ty, d) && !F.warpAt(dest.tx, dest.ty) && !F.eventAt(dest.tx, dest.ty) && !F.chestAt(dest.tx, dest.ty) && !dest.fallback && dest.steps <= 14;
    const reach = reachFrom(F, dest.base.tx, dest.base.ty, d).has(dest.tx + ',' + dest.ty) || (dest.tx === dest.base.tx && dest.ty === dest.base.ty);
    const side = s.side === 'top' ? dest.ty < dest.anchor.y : s.side === 'bottom' ? dest.ty > dest.anchor.y : s.side === 'left' ? dest.tx < dest.anchor.x : dest.tx > dest.anchor.x;
    const exitsAround = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => F.passable(dest.tx + dx, dest.ty + dy, d)).length;
    if (!good || !reach || !side || exitsAround === 0) badDest.push(id + '@' + x + ',' + y + '→' + dest.to + '@' + dest.tx + ',' + dest.ty);
    const k = id + ' ' + s.side; sum[k] = sum[k] || new Set(); sum[k].add(dest.to + '@' + dest.tx + ',' + dest.ty); } }); });
  Object.entries(sum).forEach(([k, v]) => console.log('     ' + k + ' → ' + [...v].join(' ')));
  ok(badDest.length === 0, 'すべての出口のマスで、行き先が条件を満たす（埋まらない・関所などを越えない）' + (badDest.length ? ' NG: ' + badDest.slice(0, 6).join(' ') : ''));

  console.log('--- 4. 実際に歩いて出る（World.tryMove → 暗転 → フィールド） ---');
  const walkOut = async (id, x, y, dir) => { World.enterMap(id, x, y, dir); await waitIdle(); clearUi(); World.busy = false; World.tryMove(dir); await waitIdle(); return { map: World.map.id, x: World.player.x, y: World.player.y, dir: World.player.dir }; };
  let r = await walkOut('harbor_town', 0, 12, 'left');
  ok(r.map === 'world' && r.x < 22 && Math.abs(r.y - 72) <= 2 && r.dir === 'left', '港町マリナの西の外周 → 町の印の西（' + JSON.stringify(r) + '）');
  r = await walkOut('harbor_town', 51, 20, 'right');
  ok(r.map === 'world' && r.x > 22 && Math.abs(r.y - 72) <= 2 && r.dir === 'right', '港町マリナの東の外周 → 町の印の東（' + JSON.stringify(r) + '）');
  r = await walkOut('harbor_town', 6, 0, 'up');
  ok(r.map === 'world' && r.y < 72 && r.dir === 'up', '港町マリナの北の外周（出口でないところ）→ 町の印の北（' + JSON.stringify(r) + '）');
  // 出たあと、歩いて町へ戻れる（印のマスへ）
  const back = World.getMap('world'); const L = back.def.locations.find(l => l.to === 'harbor_town');
  ok(reachFrom(back, r.x, r.y, d).has(L.x + ',' + L.y), '出たところから、歩いて港町マリナの印（' + L.x + ',' + L.y + '）へ戻れる');
  // フィールドから入り直すと、いつもの入口の位置（不自然な場所に出ない）
  World.enterMap('world', L.x, L.y - 1, 'down'); await waitIdle(); clearUi(); World.busy = false; World.tryMove('down'); await waitIdle(); clearUi();
  ok(World.map.id === 'harbor_town' && World.player.x === L.tx && World.player.y === L.ty && World.map.passable(L.tx, L.ty, d), '外周から出たあと、印から入り直すと、いつもの入口（' + L.tx + ',' + L.ty + '）に出る（' + World.map.id + '@' + World.player.x + ',' + World.player.y + '）');
  d.flags.erased_hint = true;
  r = await walkOut('erased_village', 11, 0, 'up');
  ok(r.map === 'world_kalion' && r.y < 44 && Math.abs(r.x - 42) <= 3, '地図から消えた村の北の道の端 → 村の印の北（' + JSON.stringify(r) + '）');
  // 外周でも、区間に入っていない向きや、外周でないマスからは出ない
  World.enterMap('harbor_town', 0, 12, 'up'); await waitIdle(); clearUi(); World.busy = false; World.tryMove('up'); await waitIdle();
  ok(World.map.id === 'harbor_town', '西の外周で「上」へ進んでも出ない（外へ向かったときだけ）');
  World.enterMap('harbor_town', 1, 12, 'left'); await waitIdle(); clearUi(); World.busy = false; World.tryMove('left'); await waitIdle();
  ok(World.map.id === 'harbor_town' && World.player.x === 0, '外周の1つ内側から左へ進むと、ふつうに外周のマスへ歩く（まだ出ない）');
  World.tryMove('left'); await waitIdle();
  ok(World.map.id === 'world', '続けて左へ進むと外へ出る');

  console.log('--- 5. 今の出口のワープ・閉じた出口・船の上 ---');
  World.enterMap('harbor_town', 24, 2, 'up'); await waitIdle(); clearUi(); World.busy = false; World.tryMove('up'); await waitIdle();
  ok(World.map.id === 'world' && World.player.x === 22 && World.player.y === 71, '今までの北の出口（24〜27,0〜1）は今までどおり world@22,71（' + World.map.id + '@' + World.player.x + ',' + World.player.y + '）');
  // 試験用の町：いつもの出口が物語の条件で閉じている
  D.__edge_test = { id: '__edge_test', name: '試験の村', kind: 'town', fallback: 'grass', rows: ['......', '......', '......', '......', '##EE##'.replace(/E/g, '.')], warps: [{ x: 2, y: 4, to: 'world', tx: 22, ty: 71, needFlag: '__edge_open', lockedText: ['門は閉ざされている。'] }, { x: 3, y: 4, to: 'world', tx: 22, ty: 71, needFlag: '__edge_open', lockedText: ['門は閉ざされている。'] }], edgeExits: [{ side: 'left', range: [0, 1] }] };
  const msgs = []; const oldMsg = w.Win.message; w.Win.message = (lines, o) => { msgs.push([].concat(lines).join('')); return Promise.resolve(); };
  World.enterMap('__edge_test', 0, 1, 'left'); await waitIdle(); World.busy = false; World.tryMove('left'); await waitIdle();
  ok(World.map.id === '__edge_test' && msgs.some(t => t.indexOf('門は閉ざされている') >= 0) && !d.flags.__edge_open, 'いつもの出口が閉じている町は、外周からも出られない（理由を表示・フラグは変えない）');
  World.enterMap('__edge_test', 0, 3, 'left'); await waitIdle(); World.busy = false; msgs.length = 0; World.tryMove('left'); await waitIdle();
  ok(World.map.id === '__edge_test' && msgs.length === 0, '区間の外（西の3行目）は出口でない（何も起きない）');
  d.flags.__edge_open = true; World.enterMap('__edge_test', 0, 0, 'left'); await waitIdle(); World.busy = false; World.tryMove('left'); await waitIdle();
  ok(World.map.id === 'world', '条件を満たすと、外周からも出られる');
  w.Win.message = oldMsg; delete D.__edge_test; delete World.maps.__edge_test; delete d.flags.__edge_open;
  World.enterMap('harbor_town', 0, 12, 'left'); await waitIdle(); d.aboard = 'sailboat'; World.busy = false; ok(w.EdgeExit.tryLeave(World.map, 0, 12, 'left') === false, '船に乗っている扱いのときは外周の出口は働かない'); d.aboard = null;
  World.busy = true; ok(w.EdgeExit.tryLeave(World.map, 0, 12, 'left') === false, '会話・イベント中（World.busy）は働かない'); World.busy = false;

  console.log('--- 6. 3D版のページも同じ仕組み（スクリプトの一覧） ---');
  const fs = require('fs'); const h3 = fs.readFileSync('/home/claude/mochipoyo-trade-quest/3d/index.html', 'utf8');
  ok(h3.indexOf('../js/rpg/edgeexit.js') >= 0, '3d/index.html も edgeexit.js を読み込む');
  ok(errors.length === 0, 'スクリプトのエラーなし' + (errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('\n結果: ' + pass + ' OK / ' + fail + ' NG'); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('例外', e.stack); process.exit(1); });
