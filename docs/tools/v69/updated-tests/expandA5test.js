// v6.4 Phase A 第5段階（フィールド）：道の形・畑・遺跡 の jsdom テスト
// 通れる／通れないは全マスで1つも変わらないこと、海・浅瀬・深海・橋・桟橋・場所の入口・宝箱・人・イベント・ワープ・探索ポイント・乗り物の位置に触れないこと
const { execFileSync } = require('child_process');
const SNAP = process.env.SNAP_DIR || '/home/claude/snapA4/';
const oldDump = JSON.parse(execFileSync('node', ['dumpmaps.js'], { cwd: __dirname, env: Object.assign({}, process.env, { RPG_DIR: SNAP }), maxBuffer: 1 << 28 }).toString());
const load = require('./rpgload.js'); const { w, errors } = load(); w.MochiQuest.boot();
const State = w.State, World = w.World, Events = w.Events, Win = w.Win, Tiles = w.Tiles;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK  ' + m); } else { fail++; console.log('  NG  ' + m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(50); State.newGame('テスト', 'warrior'); const d = State.data; World.start(); await sleep(40);
  const S5 = w.EXPAND_A.stage5; const defs = S5.fields.map(id => (w.MAP_DEFS[id] || (w.WORLD_DEF.id === id ? w.WORLD_DEF : null)));
  ok(S5.fields.length === 12 && defs.every(Boolean), 'フィールド12地域すべてを処理：' + S5.fields.join(','));
  const name = ch => w.Tiles.byChar[ch] || null; const solid = ch => Tiles.isSolid(name(ch) || 'grass');
  const KEEP = new Set(['~', 'w', '0', 'b', 'd', '1', '2', '3', '4', '7']);
  let bad = [], stat = { road: 0, farm: 0, ruin: 0, other: 0 }, landLoss = 0;
  const land = w.VEHICLES.airship.landOn;
  defs.forEach(def => { const A = def.a5Base, B = def.rows(); for (let y = 0; y < A.length; y++) for (let x = 0; x < A[y].length; x++) { const a = A[y][x], b = B[y][x]; if (a === b) continue;
    if (solid(a) !== solid(b)) bad.push(def.id + ' ' + x + ',' + y + ' 通れる/通れないが変わった ' + a + '>' + b);
    if (KEEP.has(a) || KEEP.has(b)) bad.push(def.id + ' ' + x + ',' + y + ' 海・橋・入口などが変わった ' + a + '>' + b);
    const PL = '.,sn8+'; if (a === 'r' || b === 'r') stat.road++; else if (b === 'H') stat.farm++; else if (b === ':' || b === '=') stat.ruin++; else if (PL.includes(a) && PL.includes(b)) stat.land = (stat.land || 0) + 1; else stat.other++;
    if (land.includes(name(a)) && !land.includes(name(b))) landLoss++; } });
  ok(!bad.length, '全マスで、通れる／通れないは1つも変わらず、海・浅瀬・深海・雲海・橋・桟橋・場所の入口も変わらない ' + bad.slice(0, 5).join(' / '));
  ok(stat.other === 0 && stat.road > 0 && stat.farm > 0 && stat.ruin > 0, '変わったマスは「道⇔地面」「地面→畑」「地面→古い石畳」「地面の草の種類（道を2回動かした所）」だけ（道 ' + stat.road + '・畑 ' + stat.farm + '・石畳 ' + stat.ruin + '・草 ' + (stat.land || 0) + 'マス）');
  ok(S5.bends > 0 && S5.meanders > 0 && S5.farms > 0 && S5.ruins.length >= 20, '道の角を丸めた所 ' + S5.bends + '・直線をずらした所 ' + S5.meanders + '・畑 ' + S5.farms + 'か所・遺跡 ' + S5.ruins.length + 'か所');
  // 触れてはいけない所
  let touch = [];
  defs.forEach(def => { const A = def.a5Base, B = def.rows(); const pts = [].concat((def.warps || []).map(o => [o.x, o.y, 'warp']), (def.chests || []).map(o => [o.x, o.y, 'chest']), (def.npcs || []).map(o => [o.x, o.y, 'npc']), (def.events || []).filter(e => !e.a5ruin).map(o => [o.x, o.y, 'event']), (w.SEARCH_POINTS || []).filter(p => p.map === def.id).map(p => [p.x, p.y, 'sp']), Object.values(w.VEHICLES).filter(v => v.home && v.home.map === def.id).map(v => [v.home.x, v.home.y, 'vehicle']));
    pts.forEach(([x, y, k]) => { if (A[y] && A[y][x] !== B[y][x]) touch.push(def.id + ' ' + k + '@' + x + ',' + y); }); });
  ok(!touch.length, '入口・宝箱・人・既存のイベント・探索ポイント・乗り物の初期位置のマスは変えていない ' + touch.join(','));
  ok(landLoss === stat.farm + S5.ruins.length, '飛空艇の着陸できるマスが減ったのは畑と遺跡の中心のマスだけ（' + landLoss + 'マス＝畑 ' + stat.farm + '＋遺跡 ' + S5.ruins.length + '。道・まわりの石畳は着陸できる）');
  // 既存のイベント・ワープ・宝箱・人はそのまま、増えたのは遺跡の調べる所だけ
  { const changed = []; S5.fields.forEach(id => { const o = oldDump.maps[id]; const def = w.MAP_DEFS[id] || w.WORLD_DEF; if (!o) return; const ev = (def.events || []).filter(e => !e.a5ruin).map(e => ({ x: e.x, y: e.y, type: e.type, doneFlag: e.doneFlag || null }));
      if (JSON.stringify(o.events) !== JSON.stringify(ev) || JSON.stringify(o.warps) !== JSON.stringify(require('./v68tradia.js').stripWarps(id, def.warps).filter(x => !(w.MAP_DEFS[x.to] && w.MAP_DEFS[x.to].s3121)).map(x => ({ x: x.x, y: x.y, to: x.to, tx: x.tx, ty: x.ty, needFlag: x.needFlag || null })))   /* v6.9 アサナ村跡の入口（印 s3121）は除く */ || o.chests.length !== (def.chests || []).length) changed.push(id); });
    ok(!changed.length && S5.ruins.every(r => { const def = w.MAP_DEFS[r.map] || w.WORLD_DEF; const e = def.events.find(e => e.x === r.x && e.y === r.y); return e && e.type === 'inspect' && e.solid === false && e.a5ruin; }), '既存のイベント・ワープ・宝箱は前の版と同じで、増えたのは遺跡の調べる所（通れる）だけ ' + changed.join(',')); }
  // 遺跡を調べる（地域の話が出る）
  { const log = []; const om = Win.message; Win.message = async (l) => { log.push([].concat(l).join(' / ')); }; const r = S5.ruins[0]; World.enterMap(r.map, r.x, r.y, 'down'); await sleep(20); const ev = World.map.eventAt(r.x, r.y); await Events.run(ev); Win.message = om;
    ok(log.length === 1 && log[0].length > 10 && World.map.passable(r.x, r.y, d), '遺跡（' + r.map + ' ' + r.x + ',' + r.y + '）：上に立って調べると地域の昔の話が読める「' + log[0].slice(0, 30) + '…」'); }
  // 地図を作り直しても同じ（同じ結果を返す）
  ok(defs.every(def => def.rows() === def.rows() && def.rows().length === def.a5Base.length), '地域の地図は何度作っても同じ');
  ok(errors.length === 0, 'エラーなし ' + JSON.stringify(errors).slice(0, 200));
  console.log('結果: ' + pass + ' OK / ' + fail + ' NG'); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('EXC', e.stack); process.exit(1); });
