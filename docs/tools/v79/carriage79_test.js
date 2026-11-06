// v7.9 馬車（jsdom）：リヴェル城の厩舎番でもらう・C キーで乗り降り・フィールドだけ・速さ ×1.6・出会い ×0.8・仲間は馬車の中・町／船では歩く・セーブ
// 使い方：node carriage79_test.js（2D 版の配置と、3D 版の地球の世界の両方）
const load = require('../v78/load78.js');
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
async function run(label, opts) {
  console.log('--- ' + label);
  const A = load(opts); const w = A.w; const W = w.World, S = w.State, I = w.Engine.Input;
  ok(!A.errors.length, label + '：読み込みのエラーなし ' + A.errors.slice(0, 2).join(' / '));
  const log = []; w.Win.message = async (l) => { log.push([].concat(l || []).join('／')); }; w.Win.say = undefined; w.Win.choice = async () => 0; w.Win.toast = (t) => log.push('toast:' + t);
  S.newGame('t', 'warrior'); const d = S.data; d.flags.s3121_new_prologue = true; d.flags.s3121_prologue_phase = 'done'; W.start();
  ok(!w.Carriage.owned() && !d.carriage, label + '：はじめは馬車を持っていない（前のセーブも同じ）');
  // 厩舎番
  W.enterMap('rivel_castle', 7, 12, 'up', { raw: true }); const m = W.map; const n = m.npcs.find((q) => q.id === 'castle_stable79');
  const V4 = [[1, 0], [-1, 0], [0, 1], [0, -1]]; const door = (m.def.warps || [])[0]; const dp = door ? { x: door.x, y: door.y } : { x: 7, y: 13 };
  const seen = new Set(); const q = []; V4.forEach(([dx, dy]) => { const x = dp.x + dx, y = dp.y + dy; if (m.passable(x, y, d) && !m.npcAt(x, y)) { seen.add(x + ',' + y); q.push([x, y]); } }); for (let h = 0; h < q.length; h++) { const [x, y] = q[h]; V4.forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || !m.passable(nx, ny, d) || m.npcAt(nx, ny)) return; seen.add(k); q.push([nx, ny]); }); }
  ok(n && w.Tiles.isSolid(m.tiles[n.y][n.x]) === false && V4.some(([dx, dy]) => seen.has((n.x + dx) + ',' + (n.y + dy))), label + '：リヴェル城の入口から厩舎番（' + (n && n.x + ',' + n.y) + '）のとなりへ歩いて行ける');
  const ctx = () => w.Events.ctx(n);
  await n.talk(ctx()); ok(!w.Carriage.owned() && log.some((l) => /王に会って/.test(l)), label + '：王に会う前は、もらえない');
  d.flags.king_quest1 = true; log.length = 0; await n.talk(ctx()); ok(w.Carriage.owned() && log.some((l) => /馬車を手に入れた/.test(l)), label + '：王に会ったあとは、馬車がもらえる');
  // 町の中では乗れない
  log.length = 0; ok(!w.Carriage.toggle() && log.some((l) => /フィールドでだけ/.test(l)), label + '：城（建物の中）では乗れない');
  // フィールド
  const L = w.MAP_DEFS.world.locations.find((l) => l.id === 'poyo_village'); W.enterMap('world', L.x, L.y + 1, 'down', { raw: true }); const p = W.player; const base = W.walkSpeed();
  I.clear(); I.press('carriage'); W.scene.handleInput(); ok(w.Carriage.riding() && d.carriage.on, label + '：フィールドで C キー → 馬車に乗る');
  ok(Math.abs(p.speed / base - 1.6) < 1e-6, label + '：移動の速さ ×1.6（' + base.toFixed(3) + ' → ' + p.speed.toFixed(3) + '）');
  ok(!w.Follow.enabled() && w.Follow.positions().length === 0, label + '：仲間は馬車の中（隊列を出さない）');
  // 出会い ×0.8：乱数を固定して、歩いた 1 歩ごとの判定を比べる
  const enc = m2rate(w, W, d); const r = (enc * 0.9);   // 歩いたときの率の 0.9 倍の乱数 → 歩きなら出会う・馬車なら（0.8 倍で）出会わない
  const stepOnce = () => { let hit = 0; const e0 = W.encounter; W.encounter = () => { hit++; }; const mr = w.Math.random; w.Math.random = () => r; d.stepsSinceBattle = 60; W.busy = false; W.onStep(); w.Math.random = mr; W.encounter = e0; return hit; };
  const withC = stepOnce(); d.carriage.on = false; w.Carriage.apply(); const walk = stepOnce(); d.carriage.on = true; w.Carriage.apply();
  ok(walk === 1 && withC === 0, label + '：出会いの率 ×0.8（同じ乱数で、歩きは出会い・馬車は出会わない。歩きの率 ' + enc.toFixed(4) + '）');
  // 2D の絵
  W.scene.draw && (function () { try { W.scene.draw(w.document.createElement('canvas').getContext('2d')); } catch (e) { /* 描画の stub */ } })(); ok(p.vehicle === 'carriage' && !!w.VehicleArt.image('carriage'), label + '：絵は馬車（主人公の位置に馬と幌馬車）');
  // 押しっぱなしの入力が会話のあとで勝手に効かない
  W.busy = true; I.press('carriage'); W.scene.handleInput(); W.busy = false; W.scene.handleInput(); ok(w.Carriage.riding(), label + '：会話・戦闘中に押した C は捨てる（あとで勝手に降りない）');
  // 町に入ると歩き、出るとまた馬車
  W.enterMap('poyo_village', 5, 5, 'down', { raw: true }); try { W.scene.draw(w.document.createElement('canvas').getContext('2d')); } catch (e) { /* 描画の stub */ } ok(!w.Carriage.riding() && d.carriage.on && Math.abs(W.player.speed - base) < 1e-6 && W.player.vehicle !== 'carriage', label + '：町に入ると歩く（速さも元どおり）');
  W.enterMap('world', L.x, L.y + 1, 'down', { raw: true }); ok(w.Carriage.riding() && Math.abs(W.player.speed / base - 1.6) < 1e-6, label + '：町から出ると、また馬車');
  // 船に乗っているあいだは使えない
  d.aboard = 'sailboat'; ok(!w.Carriage.riding(), label + '：船に乗っているあいだは馬車ではない'); log.length = 0; ok(!w.Carriage.toggle() && log.some((l) => /船・飛空艇/.test(l)), label + '：船の上では乗り降りできない'); d.aboard = null;
  // メニュー
  const MENU = []; const wl = w.Win.list; w.Win.list = async (items) => { MENU.push(items.map((i) => i.label)); return -1; }; await w.Menu.open(); w.Win.list = wl; ok(MENU[0] && MENU[0].includes('馬車を降りる'), label + '：メニューに「馬車を降りる」');
  // セーブ
  const json = JSON.stringify(d); const d2 = JSON.parse(json); ok(d2.carriage && d2.carriage.owned === true && d2.carriage.on === true, label + '：セーブに残る（carriage: { owned, on }）');
  return w;
}
function m2rate(w, W, d) { const m = W.map; const e = m.encounters; return e.rate * Math.min(1.5, 0.5 + (60 - 8) / 25); }
(async () => {
  await run('2D 版', { join: false, earth: false });
  await run('3D 版の地球の世界', {});
  console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
