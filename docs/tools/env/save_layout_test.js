// v7.6 環境リデザイン：間取りの作り直し（js/rpg/envlayout.js）と古いセーブ（jsdom）
//   使い方：RPG_DIR=<リポジトリ>/ node save_layout_test.js
//   ・作り直しで「通れなくなったマス」に立っている古いセーブ（layoutVer76 なし）を読むと：
//       1) 読む前に、全スロットの控え（Saves.backup・理由「間取りの作り直し（v7.6）の前」）が1回だけできる。控えの中身は元のセーブと同じ
//       2) 立ち位置が近くの通れるマスへ移る（8マス以内）。マップは同じ
//       3) 2回目に読んでも、控えは増えない
//   ・元の間取りに戻す（EnvLayout.setEnabled(false)）と、元の立ち位置のまま読める（そのマスは元の間取りでは通れる）
//   ・2D版のスロットのキー（mtq-rpg-v2-slot-*）以外には書かない（3D版と同じキーを使うのは 2D版そのもの）
const load = require(process.env.RPGLOAD || '/home/claude/work/rpgload.js');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const { w, errors } = load();
const { State, World, EnvLayout, Saves } = w;
ok(!!EnvLayout && EnvLayout.enabled, '間取りの作り直しが有効（既定）');
// 通れなくなったマスを探す（元の間取りで通れる・新しい間取りで通れない）
State.newGame('もち', 'warrior'); const d0 = State.data; d0.flags.s3121_new_prologue = true; d0.flags.s3121_prologue_phase = 'done';
let found = null;
function mk(id, on) { EnvLayout.enabled = on; World.maps = {}; const m = World.getMap(id); EnvLayout.enabled = true; return m; }
const cand = Object.keys(w.MAP_DEFS || {}).filter((id) => new RegExp(process.env.KIND || 'dungeon|town').test(w.MAP_DEFS[id].kind || ''));   // KIND=dungeon でダンジョンだけ
console.log('マップ数', cand.length);
for (const id of cand) {
  let a, b; try { a = mk(id, false); b = mk(id, true); } catch (e) { continue; }
  if (!b.envLayout || !b.envLayout.changed) continue;
  let c = null; for (let y = 0; y < a.h && !c; y++) for (let x = 0; x < a.w && !c; x++) {
    if (a.passable(x, y, State.data) && !a.warpAt(x, y) && !b.passable(x, y, State.data)) c = { id, x, y };
  }
  if (!c) continue;
  // 元の間取りで読んで、その場所のまま再開できるマップだけ（迷いの森のように、入ると入口へ戻すマップは除く）
  const keep = JSON.stringify(State.data); State.data.pos = { map: c.id, x: c.x, y: c.y, dir: 'up' }; EnvLayout.enabled = false; World.start(); EnvLayout.enabled = true;
  const same = World.map.id === c.id && World.player.x === c.x && World.player.y === c.y; State.data = JSON.parse(keep);
  if (!same) { console.log('     除外（元の間取りでも立ち位置が変わる）：' + JSON.stringify(c)); continue; }
  found = c; break;
}
ok(!!found, '通れなくなったマスがあるマップ：' + JSON.stringify(found));
if (found) {
  // 古いセーブ（layoutVer76 なし）をスロット1に書く
  const d = State.data; d.pos = { map: found.id, x: found.x, y: found.y, dir: 'up' }; delete d.layoutVer76; State.save(1);
  const raw1 = w.localStorage.getItem('mtq-rpg-v2-slot-1'); ok(!!raw1, 'スロット1に古いセーブを書いた');
  w.localStorage.removeItem('mtq-rpg-v2-layout-backup76'); const before = (Saves.backups() || []).length;
  // 読む
  State.data = State.load(1); World.start();
  const p = World.player; const m = World.map;
  ok(m && m.id === found.id, '同じマップで再開：' + (m && m.id));
  ok(m.passable(p.x, p.y, State.data), `立ち位置が通れるマスへ移った：(${found.x},${found.y})→(${p.x},${p.y})`);
  ok(Math.max(Math.abs(p.x - found.x), Math.abs(p.y - found.y)) <= 8, '移った距離が8マス以内');
  const bl = Saves.backups() || []; ok(bl.length === before + 1, '控えが1つできた（' + before + '→' + bl.length + '）');
  const e = bl[0]; ok(e && /間取りの作り直し/.test(e.reason), '控えの理由：' + (e && e.reason));
  const bd = e && Saves.backupData(e.id); ok(!!bd && bd[1] === raw1, '控えの中のスロット1は、元のセーブと同じ文字列');
  ok(State.data.layoutVer76 === EnvLayout.VERSION, 'セーブに間取りの版を記録：' + State.data.layoutVer76);
  ok(!!w.localStorage.getItem('mtq-rpg-v2-layout-backup76') && !w.localStorage.getItem('mtq-layout-backup76'), '控えの印は 2D版の名前空間（mtq-rpg-v2-layout-backup76）');
  // 2回目（同じ元のセーブを、もう一度読む）
  State.data = State.load(1); World.start(); ok((Saves.backups() || []).length === before + 1, '2回目に読んでも控えは増えない');
  // 元の間取りに戻す
  EnvLayout.setEnabled(false); State.data = State.load(1); World.start();
  ok(World.player.x === found.x && World.player.y === found.y, `元の間取りでは元の立ち位置のまま：(${World.player.x},${World.player.y})`);
  ok(w.localStorage.getItem('mtq-layout') === 'off', '切り替えの保存：mtq-layout=off'); EnvLayout.setEnabled(true);
  const keys = []; for (let i = 0; i < w.localStorage.length; i++) keys.push(w.localStorage.key(i)); console.log('     localStorage のキー：' + keys.join(', '));
}
ok(!errors.length, 'ページのエラーなし ' + JSON.stringify(errors.slice(0, 3)));
console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); process.exit(fails.length ? 1 : 0);
