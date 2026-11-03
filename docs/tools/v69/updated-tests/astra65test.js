// v6.5 Phase E：星界航行船アストラ号とつながった世界（世界座標・連続移動・未踏の空域・着陸・離陸・呼ぶ・セーブ・解放イベント・観測記録・既存の乗り物と地図）
const load = require('../rpgload.js'); const { w, errors } = load(); w.requestAnimationFrame = (f) => setTimeout(() => f(w.performance.now()), 16);
const doc = w.document; const S = w.State, A = w.Astra, AV = w.AstraView, E = w.Engine, Win = w.Win, D = w.MAP_DEFS;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  OK ', m); } else { fail++; console.log('  NG ', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ctxStub = new Proxy({ canvas: { width: 640, height: 416 } }, { get: (t, k) => k in t ? t[k] : (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => ({ addColorStop() { } }) : (k === 'measureText' ? () => ({ width: 10 }) : () => { }), set: (t, k, v) => { t[k] = v; return true; } });
(async () => {
  w.MochiQuest.boot(); await sleep(60); E.running = false; await sleep(40);   // 自動のループは止めて、場面の update を手で進める
  doc.querySelectorAll('#ui > *').forEach(n => n.remove()); E.scenes = E.scenes.filter(s => !s.overlay);
  const fresh = (cleared) => { S.newGame('t', 'warrior'); S.data.settings.textSpeed = 'instant'; w.World.start(); if (cleared) { S.data.flags.game_cleared = true; } };
  const visitAll = (except) => A.ids().forEach(id => { if (id !== except) S.data.visited[id] = true; });
  console.log('--- 1. 世界座標 ---');
  fresh(true);
  const ids = A.ids(); const rects = ids.map(id => A.rect(id));
  let overlap = 0, minGap = 1e9; rects.forEach((a, i) => rects.forEach((b, j) => { if (j <= i) return; const gx = Math.max(a.x0 - b.x1, b.x0 - a.x1), gy = Math.max(a.y0 - b.y1, b.y0 - a.y1); const g = Math.max(gx, gy); if (g < 0) overlap++; else minGap = Math.min(minGap, g); }));
  ok(ids.length === 12 && overlap === 0 && minGap >= 40 && rects.every(r => r.x1 <= A.WORLD.w && r.y1 <= A.WORLD.h), '12の地域を1枚の世界座標に置く（重ならない・あいだは外洋 ' + minGap + 'マス・世界 ' + A.WORLD.w + '×' + A.WORLD.h + 'マス）');
  const L = w.WorldMap.LAYOUT; const sameOrder = ids.every(a => ids.every(b => { const la = L[a], lb = L[b]; const ra = A.rect(a), rb = A.rect(b); return Math.sign(Math.round((la.x - lb.x) / 100)) === Math.sign(ra.x0 - rb.x0) && Math.sign(Math.round((la.y - lb.y) / 100)) === Math.sign(ra.y0 - rb.y0); }));
  ok(sameOrder, '地域の並びは世界地図（WorldMap.LAYOUT）と同じ（東西南北の関係が地図と一致）');
  let rt = 0; ids.forEach(id => { const m = w.World.getMap(id); for (let k = 0; k < 40; k++) { const x = Math.floor(Math.random() * m.w), y = Math.floor(Math.random() * m.h); const p = A.toWorld(id, x, y); const b = A.toLocal(p.wx, p.wy); if (b && b.map === id && b.x === x && b.y === y) rt++; } });
  ok(rt === 480 && A.regionAt(A.rect('world').x1 + 10, A.rect('world').y0 + 10) === null && ids.every(id => w.World.getMap(id).w === 160 && w.World.getMap(id).h === 120), '地域のマス ⇔ 世界座標は行き来しても同じマス（480/480）。地域のあいだ（外洋）はどの地域でもない');
  console.log('--- 2. 連続して飛ぶ（地域の境目で暗転・読み込みの画面なし） ---');
  fresh(true); visitAll(); A.grant(); S.data.flags.astra_owned = true; let st = A.state(); w.World.enterMap(st.map, st.x, st.y + 1, 'up');
  let enters = 0; const oe = w.World.enterMap; w.World.enterMap = function () { enters++; return oe.apply(this, arguments); };
  const fade = doc.getElementById('fade'); let fades = 0; const mo = new w.MutationObserver(() => { if (fade && fade.classList.contains('on')) fades++; }); if (fade) mo.observe(fade, { attributes: true });
  ok(A.takeOff(w.World.map, st.x, st.y) && AV.isOpen() && E.top() === AV.scene, '止めてある船から飛び立つ → 飛ぶ画面');
  const sc = AV.scene; sc.anim = null; const I = E.Input; const steps0 = S.data.steps; let battles = 0; const bs = w.BattleUI.start; w.BattleUI.start = async function () { battles++; return 'won'; };
  // 天空群島 → 東へ（カリオン → 忘却の雪原）→ 南へ（マクディア → 竜炎火山）と、地域の境目を越えて飛ぶ
  const path = []; let maxJump = 0, last = null; const regionsSeen = new Set();
  const fly = (keys, ms) => { Object.assign(I.keys, keys); for (let t = 0; t < ms; t += 16) { sc.update(16); const s = A.state(); if (last) maxJump = Math.max(maxJump, Math.hypot(s.wx - last.wx, s.wy - last.wy)); last = { wx: s.wx, wy: s.wy }; const r = A.regionAt(s.wx, s.wy); regionsSeen.add(r || '外洋'); path.push(r); } I.keys = {}; };
  const s0 = Object.assign({}, A.state());
  fly({ right: true }, 1000); const s1a = Object.assign({}, A.state()); fly({ right: true }, 1000); const moved1 = Math.hypot(A.state().wx - s1a.wx, A.state().wy - s1a.wy);
  ok(moved1 >= 20 && A.SPEED.low > w.World.walkSpeed() * 1000 / 16 * 1.0, '低空で1秒に約' + Math.round(moved1) + 'マス（加速したあと）（飛空艇は歩く速さと同じ：設定「はやい」で約' + Math.round(w.World.walkSpeed() * 1000 / 16) + 'マス／秒）。高空はさらに速い（' + A.SPEED.high + 'マス／秒）');
  fly({ right: true }, 14000); fly({ down: true }, 22000); fly({ right: true, down: true }, 3000);
  const changes = path.filter((r, i) => i && r !== path[i - 1]).length;
  ok(regionsSeen.size >= 6 && changes >= 6 && maxJump < 1.2, '地域の境目を ' + changes + ' 回越えた（' + [...regionsSeen].join('・') + '）。1フレームの移動は最大 ' + maxJump.toFixed(2) + 'マス（とびがない＝連続）');
  ok(enters === 0 && fades === 0 && E.top() === sc, '飛んでいるあいだは、マップの切り替え（enterMap）も暗転も一度もない（同じ画面のまま）');
  ok(battles === 0 && S.data.steps === steps0, '飛んでいるあいだは敵が出ない（戦闘 0 回・歩数も増えない）');
  // 段階的な読み込み：近い地域の絵から1フレームに1つずつ
  ok(Object.keys(AV.chunks).length >= 6, '地形の絵は、近づいた地域から1つずつ作る（今 ' + Object.keys(AV.chunks).length + '/12 地域。できるまでは地域の色で仮に描く）');
  let drawErr = null; try { sc.draw(ctxStub); sc.alt = 'high'; sc.draw(ctxStub); sc.openMap(); sc.draw(ctxStub); sc.mode = 'fly'; } catch (e) { drawErr = e; } ok(!drawErr, '低空・高空・世界地図を描ける' + (drawErr ? ' ' + drawErr.message : ''));
  console.log('--- 3. 未踏の空域・世界の端 ---');
  fresh(true); visitAll('world_dragon'); A.grant(); st = A.state(); w.World.enterMap(st.map, st.x, st.y + 1, 'up'); A.takeOff(w.World.map, st.x, st.y); const sc2 = AV.scene; sc2.anim = null;
  const dr = A.rect('world_dragon'); ok(A.blockAt((dr.x0 + dr.x1) / 2, (dr.y0 + dr.y1) / 2) && A.blockAt(dr.x0 - 5, dr.y0 + 10) && !A.blockAt(dr.x0 - 20, dr.y0 + 10), '訪れていない地域（竜炎火山群島）とそのまわり10マスは進めない。少し離れた外洋は進める');
  A.state().wx = dr.x0 - 14; A.state().wy = (dr.y0 + dr.y1) / 2; Object.assign(E.Input.keys, { right: true }); for (let t = 0; t < 4000; t += 16) sc2.update(16); E.Input.keys = {};
  ok(A.state().wx < dr.x0 - A.LOCK_MARGIN + 0.5 && sc2.banner && /未踏/.test(sc2.banner.text), '未踏の空域へ向かって飛び続けても、手前で止まり、理由を出す（' + (sc2.banner && sc2.banner.text) + '）');
  ok(A.landingPoints('world_dragon').length === 0 && A.allLandingPoints().every(p => p.region !== 'world_dragon'), '未踏の地域には着陸地点がない');
  ok(A.blockAt(1, 1) && A.blockAt(A.WORLD.w - 1, 10), '世界の端より外へは出られない');
  console.log('--- 4. 着陸地点（町・村・城・ダンジョンの近くの安全なマス） ---');
  fresh(true); visitAll(); Object.keys(D).forEach(id => { (D[id].locations || []).forEach(l => { if (l.needFlag) S.data.flags[l.needFlag] = true; if (l.to) S.data.visited[l.to] = true; }); });
  A._lpCache = {}; const pts = A.allLandingPoints(); const travel = w.Travel.points();
  const badLand = pts.filter(p => { const m = w.World.getMap(p.region); return !(m.kind === 'field' && A.landOk(m, p.x, p.y) && !w.Tiles.isWater(m.tiles[p.y][p.x])); });
  ok(pts.length >= 40 && badLand.length === 0, '着陸地点 ' + pts.length + 'か所（12地域）：すべて地域のフィールドの、歩いて通れる陸（海・壁・出入口・イベント・宝箱・人の上ではない）。屋内・ダンジョンへは直接降りない');
  const reach = (m, sx, sy, tx, ty) => { const seen = new Set([sx + ',' + sy]); const q = [[sx, sy]]; while (q.length) { const [x, y] = q.shift(); if (Math.abs(x - tx) + Math.abs(y - ty) === 1) return true; for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; if (!m.passable(nx, ny, S.data) || w.Tiles.isWater(m.tiles[ny][nx])) continue; seen.add(k); q.push([nx, ny]); } } return false; };
  const noWalk = pts.filter(p => !reach(w.World.getMap(p.region), p.x, p.y, p.ex, p.ey));
  ok(noWalk.length === 0, '着陸地点から、その町・ダンジョンの入口まで歩いて行ける（' + (pts.length - noWalk.length) + '/' + pts.length + '）' + (noWalk.length ? ' NG ' + noWalk.map(p => p.region + ':' + p.name) : ''));
  const blockEntr = pts.filter(p => { const m = w.World.getMap(p.region); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (m.warpAt(p.x + dx, p.y + dy)) return true; return A.chokeAt(m, p.x, p.y); });
  ok(blockEntr.length === 0, '船は入口のすぐ隣や細い道には置かない（入口・道をふさがない）');
  const landish = (t) => { const m = w.World.getMap(t.region); for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const x = t.wx + dx, y = t.wy + dy; if (m.tiles[y] && m.tiles[y][x] && !w.Tiles.isWater(m.tiles[y][x]) && m.passable(x, y, S.data) && !m.warpAt(x, y)) return true; } return false; };
  const regT = travel.filter(t => D[t.region] && D[t.region].region); const seaOnly = regT.filter(t => !landish(t)); const landT = regT.filter(t => landish(t));
  const tmiss = landT.filter(t => !pts.some(p => p.id === t.id && p.region === t.region));
  ok(tmiss.length === 0, '陸から入る町・村・城・ダンジョン ' + landT.length + 'か所すべての近くに着陸地点がある（物語の条件を満たしたとき）。海の上の入口 ' + seaOnly.length + 'か所（' + seaOnly.map(t => t.name).join('・') + '）は船で行く場所なので降りない' + (tmiss.length ? ' NG ' + tmiss.map(t => t.name) : ''));
  // 物語の条件：needFlag がまだなら、その場所の近くには降りられない
  fresh(true); visitAll(); A._lpCache = {}; const locked = travel.filter(t => t.needFlag && !S.data.flags[t.needFlag]); const lp2 = A.allLandingPoints();
  ok(locked.length > 0 && locked.every(t => !lp2.some(p => p.id === t.id)), '物語の条件（needFlag）がまだの場所 ' + locked.length + 'か所の近くには降りられない（例：' + locked.slice(0, 2).map(t => t.name).join('・') + '）');
  console.log('--- 5. 着陸・離陸・呼ぶ ---');
  fresh(true); visitAll(); A.grant(); st = A.state(); w.World.enterMap(st.map, st.x, st.y + 1, 'up'); A.takeOff(w.World.map, st.x, st.y); const sc3 = AV.scene; sc3.anim = null; w.World.enterMap = oe;
  const target = A.allLandingPoints().find(p => p.region === 'world' && /ポヨ/.test(p.name)) || A.allLandingPoints().find(p => p.region === 'world');
  sc3.auto = target; for (let t = 0; t < 60000 && AV.isOpen(); t += 16) sc3.update(16);
  const pl = w.World.player; const m5 = w.World.map; st = A.state();
  ok(!AV.isOpen() && !st.flying && m5.id === 'world' && st.map === 'world' && st.x === target.x && st.y === target.y, '世界地図で選んだ着陸地点（' + target.name + '）へ自動で飛び、着陸した（船は着陸地点に止まる）');
  ok(m5.kind === 'field' && m5.passable(pl.x, pl.y, S.data) && !w.Tiles.isWater(m5.tiles[pl.y][pl.x]) && Math.abs(pl.x - st.x) + Math.abs(pl.y - st.y) === 1, '降りた主人公は船の隣の歩けるマス（壁・海に埋まらない）');
  // 地上で船へ進む → 飛び立つか聞く
  const dirTo = st.x > pl.x ? 'right' : st.x < pl.x ? 'left' : st.y > pl.y ? 'down' : 'up'; let asked = null; const oc = Win.choice; Win.choice = async (q, o) => { asked = q; return 1; };
  const moved = w.World.tryMove(dirTo); await sleep(20); Win.choice = oc; w.World.busy = false;
  ok(!moved && /アストラ号/.test(asked || '') && !A.flying(), '船へ歩いて進むと「飛び立つ？」と聞く（やめると、その場に止まったまま）');
  // 呼ぶ：別の地域へ歩いて行っても、メニューから今いる地域へ呼べる
  w.World.enterMap('world_grania', 80, 60, 'down'); const f0 = w.World.nearestFree(w.World.map, 80, 60); if (f0) w.World.enterMap('world_grania', f0.x, f0.y, 'down');
  const spot = A.recallSpot(); const rc = A.recall(); st = A.state();
  ok(rc && st.map === 'world_grania' && A.landOk(w.World.map, st.x, st.y) && Math.abs(st.x - w.World.player.x) + Math.abs(st.y - w.World.player.y) <= 8, '別の地域にいても、メニュー「アストラ号」→「ここへ呼ぶ」で今いる地域の近くへ呼べる（置き去りにならない）');
  w.World.enterMap('oblivion_cave_1', D.oblivion_cave_1.start ? D.oblivion_cave_1.start[0] : 2, 2, 'down'); ok(A.recallSpot() === null, 'ダンジョン・町の中には呼べない（外のフィールドで呼ぶ）');
  console.log('--- 6. セーブ・読み込み ---');
  fresh(true); visitAll(); A.grant(); st = A.state(); w.World.enterMap('world_sky', st.x, st.y + 1, 'up'); A.park('world_sky', st.x, st.y); S.save(1);
  const back1 = S.load(1); S.data = back1; w.World.start(); const s1 = A.state();
  ok(back1 && s1.owned && !s1.flying && s1.map === 'world_sky' && s1.x === st.x && s1.y === st.y && !AV.isOpen(), '止めてある場所はセーブ・読み込みのあとも同じ');
  A.takeOff(w.World.map, s1.x, s1.y); const sc4 = AV.scene; sc4.anim = null; Object.assign(E.Input.keys, { right: true }); for (let t = 0; t < 2500; t += 16) sc4.update(16); E.Input.keys = {}; for (let t = 0; t < 1000; t += 16) sc4.update(16);
  const wx = A.state().wx, wy = A.state().wy; S.save(2); E.scenes = E.scenes.filter(s => s !== sc4); AV.scene = null;
  S.newGame('別', 'mage'); w.World.start(); ok(!AV.isOpen(), '（別のデータで始めると飛ぶ画面は出ない）');
  const back2 = S.load(2); S.data = back2; w.World.start(); const s2 = A.state();
  ok(back2 && s2.flying && Math.abs(s2.wx - wx) < 0.01 && Math.abs(s2.wy - wy) < 0.01 && AV.isOpen() && E.top() === AV.scene, '飛んでいる途中でセーブしたデータは、読み込むと同じ場所（世界 ' + Math.round(wx) + ', ' + Math.round(wy) + '）から飛び続ける');
  // 壊れた置き場所を直す
  E.scenes = E.scenes.filter(s => s !== AV.scene); AV.scene = null; s2.flying = false; s2.map = 'world'; const mw = w.World.getMap('world'); let wxp = null; for (let y = 0; y < mw.h && !wxp; y++) for (let x = 0; x < mw.w; x++) if (w.Tiles.isWater(mw.tiles[y][x]) && x > 20 && y > 20) { wxp = [x, y]; break; } s2.x = wxp[0]; s2.y = wxp[1]; A.validate();
  ok(A.landOk(mw, s2.x, s2.y), '置き場所が海などの通れないマスになっていたら、読み込みのときに近くの安全なマスへ直す');
  s2.flying = true; s2.wx = -50; A.validate(); ok(!s2.flying, '飛んでいる位置が世界の外なら、止めてある状態に戻す（壊れたデータで閉じこめられない）');
  console.log('--- 7. 解放のイベント・クエスト・観測記録 ---');
  fresh(false); const rec = D.star_tower_2.npcs.find(n => n.id === 'st_recorder'); const said = []; const ctx = { say: async (n, l) => said.push(...l), msg: async (l) => said.push(...l), remark: async () => { }, flag: (f) => !!S.data.flags[f] };
  S.data.flags.sky_1 = S.data.flags.sky_2 = S.data.flags.sky_3 = S.data.flags.camp_talk = true; await rec.talk(ctx);
  ok(!A.owned() && said.some(l => /私は記録者/.test(l)) && S.data.flags.sky_record, 'クリア前の記録者の会話は今までどおり（天空神殿への道を開く）。アストラ号は出てこない');
  S.data.flags.game_cleared = true; visitAll(); said.length = 0; await rec.talk(ctx); st = A.state(); const msky = w.World.getMap('world_sky');
  ok(A.owned() && S.data.flags.astra_owned && S.data.quests.astra_voyage && S.data.quests.astra_voyage.state === 'active' && st.map === 'world_sky' && A.landOk(msky, st.x, st.y) && said.some(l => /星界航行船アストラ号を手に入れた/.test(l)), 'クリア後に話すと、アストラ号を手に入れ、星見塔の前の安全なマスに降りてくる。クエスト受注');
  said.length = 0; await rec.talk(ctx); ok(A.owned() && said.some(l => /観測記録は 0\/12/.test(l)), 'もう一度話すと、観測記録の進み具合を教える（二度は渡さない）');
  fresh(false); S.data.flags.game_cleared = true; w.World.enterMap('poyo_village', 20, 20, 'down'); ok(S.data.quests.astra_voyage && S.data.quests.astra_voyage.state === 'active', 'クリアのあと、マップに入るとクエスト「星界航行船アストラ号」を受注（記録者のところへ案内）');
  const nav = w.Nav.resolve('astra:ship'); A.grant(); const nav2 = w.Nav.resolve('astra:ship'), nav3 = w.Nav.resolve('astra:log');
  ok(nav && nav2 && nav2.map === A.state().map && nav2.x === A.state().x && nav3 && nav3.kind === 'map', '次の目的地：船の場所・まだ観測していない地域を案内する');
  // 観測記録：12の地域の上空を飛ぶと1つずつ。そろうと完了のイベント（報酬は1回だけ）
  visitAll(); st = A.state(); w.World.enterMap('world_sky', st.x, st.y + 1, 'up'); A.takeOff(w.World.map, st.x, st.y); const sc5 = AV.scene; sc5.anim = null;
  const omsg = Win.message; Win.message = async () => { };
  for (const id of A.ids()) { const r = A.rect(id); A.state().wx = (r.x0 + r.x1) / 2; A.state().wy = (r.y0 + r.y1) / 2; sc5.update(16); await sleep(5); }
  await sleep(50); const items1 = JSON.stringify(S.data.inventory); const gold1 = S.data.gold;
  ok(A.logCount() === 12 && S.data.flags.astra_log_done && S.data.quests.astra_voyage.state === 'done' && S.data.inventory.astra_log === 1, '12の地域の上空を飛ぶと観測記録がそろい、完了のイベント → クエスト達成（報酬：経験値3000・5000G・星界の観測記録）');
  for (const id of A.ids()) { const r = A.rect(id); A.state().wx = (r.x0 + r.x1) / 2 + 3; A.state().wy = (r.y0 + r.y1) / 2; sc5.update(16); } sc5.region = undefined; sc5.update(16); await sleep(30); Win.message = omsg;
  ok(S.data.gold === gold1 && JSON.stringify(S.data.inventory) === items1 && A.logCount() === 12, 'もう一度飛んでも、記録・報酬は増えない（重ねて渡さない）');
  console.log('--- 8. 既存の乗り物・地図・ワープ ---');
  const base = (() => { const prev = process.env.RPG_DIR; process.env.RPG_DIR = process.env.BASE_DIR || '/home/claude/baseline-phaseA/'; delete require.cache[require.resolve('../rpgload.js')]; const r = require('../rpgload.js')(); process.env.RPG_DIR = prev || ''; return r.w; })();
  ok(JSON.stringify(Object.keys(base.VEHICLES)) === JSON.stringify(Object.keys(w.VEHICLES)) && JSON.stringify(base.SEA_ROUTES) === JSON.stringify(w.SEA_ROUTES), '既存の船・遠洋航海船・飛空艇と海路・空路はそのまま（アストラ号は別の仕組み）');
  base.State.newGame('t', 'warrior'); S.newGame('t', 'warrior');
  const sameTiles = A.ids().every(id => { const a = base.World.getMap(id), b = w.World.getMap(id); const V68 = require('../v68tradia.js'); const ok69 = (x, y) => id === 'world_kalion' && Math.abs(x - 24) <= 6 && Math.abs(y - 66) <= 6 && ['village', 'crops'].includes(b.tiles[y][x]);   /* v6.9 アサナ村跡（カリオン地方 (24,66)）の入口のマスと、村のまわりに第5段階の作り方で生まれる畑（村の近くに畑を置く既存の仕組み） */
    const tilesOk = a.tiles.length === b.tiles.length && a.tiles.every((row, y) => row.length === b.tiles[y].length && row.every((t, x) => t === b.tiles[y][x] || V68.allowedCell(id, x, y, t, b.tiles[y][x]) || ok69(x, y)));
    const w69 = (ws) => (ws || []).filter((x) => !(w.MAP_DEFS[x.to] && w.MAP_DEFS[x.to].s3121));   /* v6.9 アサナ村跡への入口（印 s3121）は除く */
    return tilesOk && JSON.stringify(w69(V68.stripWarps(id, D[id].warps))) === JSON.stringify(V68.stripWarps(id, base.MAP_DEFS[id].warps)); });   // v6.8 トレディアの移動の分だけは違ってよい（v68tradia.js）
  ok(sameTiles, '12の地域の地形・出入口（ワープ）は Phase A の公開版と同じ（世界座標は表示と飛ぶための計算だけ）');
  ok(errors.length === 0, 'スクリプトのエラーなし' + (errors.length ? ' ' + errors.slice(0, 3) : ''));
  console.log('\n結果: ' + pass + ' OK / ' + fail + ' NG'); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('例外', e.stack); process.exit(1); });
