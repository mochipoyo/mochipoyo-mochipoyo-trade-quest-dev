// v7.8 地球の世界：ダンジョンへフィールドの入口から入り、脱出の羽で入ってきた入口の外へ戻る（入口が2つあるダンジョンは入った側へ）（jsdom）
const load = require('./load78.js'); const A = load(); const w = A.w; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ng = []; const ok = (c, m) => { if (!c) ng.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
(async () => {
  w.MochiQuest.boot(); await sleep(100);
  const clear = () => { w.document.querySelectorAll('#ui > *').forEach((n) => n.remove()); w.Engine.scenes = w.Engine.scenes.filter((x) => !x.overlay); w.World.busy = false; };
  clear(); w.State.newGame('t', 'warrior'); const d = w.State.data; ['s3121_new_prologue', 'ship_ready', 'kalion_open', 'yorn_letter_done', 'magicka_arrived', 'galleon_ready'].forEach((f) => d.flags[f] = true); d.flags.s3121_prologue_phase = 'done'; d.settings.textSpeed = 'instant'; w.World.start(); w.World.encounter = () => { }; await sleep(100); clear();
  const DX = w.DungeonExit;
  const trip = async (field, to, name) => { const wm = w.World.getMap(field); const L = wm.def.locations.find((q) => q.to === to);
    const side = [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']].find(([dx, dy]) => wm.passable(L.x + dx, L.y + dy, d) && !w.Tiles.isWater(wm.tiles[L.y + dy][L.x + dx]));
    w.World.enterMap(field, L.x + side[0], L.y + side[1], side[2], { raw: true }); await sleep(300); clear(); w.World.tryMove(side[2]); await sleep(900); clear();
    const inside = w.World.map.id; const ck = DX.check(w.World.map); let back = null; if (ck.ok) { DX.go(ck.dest); await sleep(1500); clear(); back = [w.World.map.id, w.World.player.x, w.World.player.y]; }
    const dist = back ? Math.abs(back[1] - L.x) + Math.abs(back[2] - L.y) : null; const m = back && w.World.getMap(back[0]);
    ok(inside === to && back && back[0] === field && dist <= 4 && m.passable(back[1], back[2], d), name + '：' + field + ' の入口から入り（' + inside + '）、脱出の羽で同じ入口の外へ（' + JSON.stringify(back) + '・入口から ' + dist + ' マス）'); };
  await trip('world', 'lost_forest', '迷いの森');
  await trip('world_grania', 'grania_pass', '灰の峠（グラニア側）'); await trip('world_kalion', 'grania_pass', '灰の峠（カリオン側）');
  await trip('world_neon', 'neon_works_1', '水没工場'); await trip('world_meridian', 'meridian_highway', '倒壊した高架道路'); await trip('world_meridian', 'meridian_subway_1', '浸水した地下鉄');
  w.World.enterMap('aeria_reactor', 8, 8, 'down', { raw: true }); await sleep(300); clear(); const ca = DX.check(w.World.map); ok(ca.ok && ca.dest.map === 'aeria_dock', '浮天城アエリアの中で使うと、船着き場（アストラ号のそば）へ ' + JSON.stringify(ca.dest && [ca.dest.map, ca.dest.x, ca.dest.y]));
  console.log(ng.length ? '結果：NG ' + ng.length : '結果：すべて OK'); process.exit(ng.length ? 1 : 0);
})().catch((e) => { console.log('例外', e.stack); process.exit(1); });
