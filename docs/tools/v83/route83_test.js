// v8.3 出入口の往復の確かめ（jsdom）：node route83_test.js [2d] [walk] [id,id,...]
// ・v8.2 の route82_test.js からの変更：城下町から城郭区画へは「北の端へ出る道」（js/data/castle82.js の carveRoad82）。表示の「楼門」を「北の道」に
//   歩く確かめの道探しは、ゲームと同じく「開けた鍵の扉（doneFlag の立った solid の出来事）」を通れるとする（v8.1 の walk81.js は solid の出来事を全部よける。王宮の門の鍵が道の幅の全部に並ぶため）
// ・対象：町に属する全部の部屋（js/rpg/layout82.js の Layout82.owner）＋ v8.2 の新しい地図（城郭区画・学院の本校舎）＋ 城下町の楼門・学院の本館の扉
// ・速い確かめ（既定）：部屋の中の全部のワープについて、ゲームと同じ World.enterMap（tx・ty・raw）で行き先へ → 着いたマスが歩ける・ワープの上でない（着いた直後に出口が再発火しない）・
//   着いた所から、元の部屋へ戻るワープまで歩いて行ける（道がある）→ そのワープで戻ると、元の部屋の歩けるマス（ワープの上でない）で、出たワープのそば（6 マス以内）
// ・walk：主な道だけ、2D 版の 1 歩ずつの移動で本当に歩いて往復する（城下町→楼門→城郭区画→城→城郭区画→城下町、学院の中庭→玄関ホール→大階段→上の回廊→学院長室…）
const load = require('../v78/load78.js');
const args = process.argv.slice(2); const two = args.includes('2d'); const doWalk = args.includes('walk'); const only = (args.find((a) => /,|_/.test(a) && a !== '2d' && a !== 'walk') || '').split(',').filter(Boolean);
const A = load(two ? { earth: false, join: false } : {}); const w = A.w; if (A.errors.length) { console.log('読み込みの失敗（スクリプトの誤り）', A.errors); process.exit(1); } const W = w.World, S = w.State;
w.Win.message = async () => { }; w.Win.toast = () => { }; w.Win.choice = async () => 0; if (w.Win.confirm) w.Win.confirm = async () => true; if (w.Win.ask) w.Win.ask = async () => true;
S.newGame('t', 'warrior'); const d = S.data; ['s3121_new_prologue', 'ship_ready', 'sevran_fallen'].concat((process.env.FLAGS || '').split(',').filter(Boolean)).forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done';   // FLAGS=a,b：物語の鍵（例 palace_open）を開けた状態でも確かめる
W.start(); W.encounter = () => { };
const D = w.MAP_DEFS; const ng = []; let okN = 0, checks = 0;
const NEW = Object.keys(D).filter((k) => D[k].castle82 || D[k].academy82);
const scope = only.length ? only : Array.from(new Set(Object.keys(w.Layout82.owner).concat(NEW).concat(['rivel_town', 'sentra_capital', 'magicka_city', 'volatilia']))).filter((k) => D[k]);
const passAt = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.passable(x, y, d) && !m.npcAt(x, y);   // 通れない出来事（鍵の扉など）は m.passable が見る（開けた印 doneFlag があれば通れる。ゲームと同じ）
function reach(m, sx, sy) { const seen = {}; const q = [[sx, sy]]; seen[sx + ',' + sy] = 1; while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen[k]) continue; const wp = m.warpAt(nx, ny); if (!(wp || passAt(m, nx, ny))) continue; seen[k] = 1; if (!wp) q.push([nx, ny]); } } return seen; }
function go(q) { if (q.needFlag) d.flags[q.needFlag] = true; W.busy = false; W.enterMap(q.to, q.tx, q.ty, q.face || 'down', q.raw ? { raw: true } : undefined); return { id: W.map.id, x: W.player.x, y: W.player.y }; }
const isOutside = (id) => { const t = D[id]; return !!(t && (t.region || t.kind === 'field')); };
for (const id of scope) {
  let m; try { W.maps = {}; m = W.getMap(id); } catch (e) { ng.push(id + '：地図を作れない ' + e.message); continue; }
  const ws = m.warps.filter((q) => q && D[q.to] && !isOutside(q.to) && (m.kind !== 'town' || q.to === (m.buildings.find((b) => b.gate82 || b.academy82 || b.castle82) || {}).interior || NEW.indexOf(q.to) >= 0 || NEW.indexOf(id) >= 0));   // 城下町 → 城郭区画（NEW）の北の道の出口も入る
  for (const q of ws) {
    checks++; let a; try { W.maps = {}; a = go(q); } catch (e) { ng.push(id + '→' + q.to + '：入れない ' + e.message); continue; }
    const tm = W.map; const label = id + '(' + q.x + ',' + q.y + ')→' + q.to;
    if (a.id !== q.to) { ng.push(label + '：別の地図に着いた ' + a.id); continue; }
    if (!tm.passable(a.x, a.y, d)) { ng.push(label + '：着いたマスが歩けない (' + a.x + ',' + a.y + ')'); continue; }
    if (tm.warpAt(a.x, a.y)) { ng.push(label + '：着いたマスがワープの上 (' + a.x + ',' + a.y + ')'); continue; }
    // 戻るワープ
    const R = reach(tm, a.x, a.y); const back = tm.warps.filter((r) => r.to === id && R[r.x + ',' + r.y]);
    if (!back.length) { const any = tm.warps.some((r) => r.to === id); if (any || (D[q.to] && D[q.to].kind !== 'dungeon')) ng.push(label + '：着いた所から戻るワープへ行けない' + (any ? '（ワープはある）' : '（戻るワープがない）')); else okN++; continue; }
    back.sort((p, r) => Math.abs(p.x - a.x) + Math.abs(p.y - a.y) - Math.abs(r.x - a.x) - Math.abs(r.y - a.y));
    let b; try { W.maps = {}; b = go(back[0]); } catch (e) { ng.push(label + '：戻れない ' + e.message); continue; }
    const m2 = W.map; const dist = Math.abs(b.x - q.x) + Math.abs(b.y - q.y);
    if (b.id !== id) ng.push(label + '：戻ると別の地図 ' + b.id);
    else if (!m2.passable(b.x, b.y, d) || m2.warpAt(b.x, b.y)) ng.push(label + '：戻った所が歩けない／ワープの上 (' + b.x + ',' + b.y + ')');
    else if (dist > 6) ng.push(label + '：戻った所が出たワープから遠い（' + dist + ' マス）');
    else okN++;
  }
}
console.log('部屋・地図', scope.length, '確かめ', checks, 'OK', okN, 'NG', ng.length); ng.slice(0, 60).forEach((s) => console.log('NG  ' + s));
(async () => {
  if (!doWalk) return;
  const L = require('../v81/walk81.js')(w, d); const { flush, step, D4 } = L;
  const passW = (m, x, y) => passAt(m, x, y);   // ゲームと同じ（m.passable：開けた鍵の扉は通れる）＋人のいないマス
  function route(m, sx, sy, gx, gy) { const prev = {}; const q = [[sx, sy]]; prev[sx + ',' + sy] = null; while (q.length) { const [x, y] = q.shift(); if (x === gx && y === gy) break; for (const k of Object.keys(D4)) { const nx = x + D4[k][0], ny = y + D4[k][1]; const key = nx + ',' + ny; if (key in prev) continue; if (!(nx === gx && ny === gy) && (!passW(m, nx, ny) || m.warpAt(nx, ny))) continue; prev[key] = [x, y, k]; q.push([nx, ny]); } } if (!((gx + ',' + gy) in prev)) return null; const dirs = []; let c = gx + ',' + gy; while (prev[c]) { dirs.unshift(prev[c][2]); c = prev[c][0] + ',' + prev[c][1]; } return dirs; }
  async function walkTo(gx, gy) { const id0 = W.map.id; for (let n = 0; n < 300; n++) { if (W.map.id !== id0) return true; if (W.player.x === gx && W.player.y === gy) return false; const r = route(W.map, W.player.x, W.player.y, gx, gy); if (!r) { await flush(); continue; } await step(r[0]); } return false; } const wng = []; const log = (c, msg) => { console.log((c ? 'OK  ' : 'NG  ') + msg); if (!c) wng.push(msg); };
  // 歩いてワープに乗る：そのワープのとなりの歩けるマスへ歩き、ワープの方へ 1 歩
  async function take(pred, label) { const m = W.map; const q = m.warps.find(pred); if (!q) { log(false, label + '：ワープがない（' + m.id + '）'); return false; }
    for (const k of Object.keys(D4)) { const sx = q.x - D4[k][0], sy = q.y - D4[k][1]; if (!passAt(m, sx, sy) || m.warpAt(sx, sy)) continue; if (W.player.x !== sx || W.player.y !== sy) await walkTo(sx, sy); if (W.map !== m) break; if (W.player.x === sx && W.player.y === sy) { await step(k); const ok = W.map.id === q.to && W.map.passable(W.player.x, W.player.y, d) && !W.map.warpAt(W.player.x, W.player.y); log(ok, label + ' → ' + W.map.id + ' (' + W.player.x + ',' + W.player.y + ')'); return ok; } }
    log(false, label + '：ワープのとなりへ行けない'); return false; }
  const town = (id) => { W.maps = {}; const m = W.getMap(id); const a = (m.def.remake81 && m.def.remake81.arrive) || [m.w >> 1, m.h - 3]; W.enterMap(id, a[0], a[1], 'up', { raw: true }); };
  for (const [t, ap, castle] of [['rivel_town', 'rivel_castle_approach', 'rivel_castle'], ['sentra_capital', 'sentra_palace_approach', 'sentra_palace_1'], ['magicka_city', 'magicka_palace_approach', 'magicka_palace']]) {
    town(t); await flush(); await take((q) => q.to === ap, t + '：北の道（城郭区画へ）'); await take((q) => q.to === castle, ap + '：城の大扉'); await take((q) => q.to === ap, castle + '：出口'); await take((q) => q.to === t, ap + '：南の門'); log(W.map.id === t, '城下町へ戻った（' + W.map.id + '）');
  }
  town('volatilia'); await flush(); await take((q) => q.to === 'vol_main_hall', '学院：本館の扉'); await take((q) => q.to === 'vol_upper_gallery', '玄関ホール：大階段'); await take((q) => q.to === 'vol_dean', '上の回廊：学院長室');
  await take((q) => q.to === 'vol_upper_gallery', '学院長室：扉'); await take((q) => q.to === 'vol_observatory', '上の回廊：塔の階段'); await take((q) => q.to === 'vol_upper_gallery', '天文観測室：回廊へ戻る扉');
  await take((q) => q.to === 'vol_main_hall', '上の回廊：大階段'); await take((q) => q.to === 'vol_great_hall', '玄関ホール：大食堂'); await take((q) => q.to === 'vol_main_hall', '大食堂：扉');
  await take((q) => q.to === 'vol_west_gallery', '玄関ホール：西翼'); await take((q) => q.to === 'vol_lecture', '西翼：講義室'); await take((q) => q.to === 'vol_west_gallery', '講義室：回廊へ戻る扉'); await take((q) => q.to === 'vol_classroom2', '西翼：第二教室'); await take((q) => q.to === 'vol_west_gallery', '第二教室：扉');
  await take((q) => q.to === 'vol_main_hall', '西翼：ホールへ'); await take((q) => q.to === 'vol_east_gallery', '玄関ホール：東翼'); await take((q) => q.to === 'vol_library', '東翼：大図書館'); await take((q) => q.to === 'vol_east_gallery', '大図書館：回廊へ戻る扉');
  await take((q) => q.to === 'vol_main_hall', '東翼：ホールへ'); await take((q) => q.to === 'volatilia', '玄関ホール：中庭へ'); log(W.map.id === 'volatilia', '学院の中庭へ戻った');
  console.log('歩く確かめ NG', wng.length);
})();
