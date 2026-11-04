// v7.6 間取りの作り直し（js/rpg/envlayout.js）：「着く所」が塞がっていないか（jsdom）
//   使い方：RPG_DIR=<リポジトリ>/ node arrival_check.js
//   着く所の集め方（実行時のデータ＋ソースの文字列の両方。envlayout.js の集め方とは別に数え直す）
//     ・MAP_DEFS の warps・events の to/tx/ty、WORLD_LOCATIONS の to/tx/ty
//     ・js/ の中の enterMap('id', x, y) の直書き、js/data/ の { to: 'id', ... tx: N, ty: M } と { id: 'id', ... arrive: [x, y] }
//   作り直したダンジョン（mapremake.js）の旧座標は、ゲームと同じ MapRemake.pos で直す
//   決まり：作り直しなし（EnvLayout.enabled=false）で通れる着く所は、作り直しありでも通れる
const fs = require('fs'); const path = require('path');
const load = require(process.env.RPGLOAD || '/home/claude/work/rpgload.js'); const { w, errors } = load();
const DIR = process.env.RPG_DIR || '/home/claude/mochipoyo-trade-quest/';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'OK  ' : 'NG  ') + m); };
const { State, EnvLayout, MAP_DEFS, GameMap, MapRemake } = w; State.newGame('t', 'warrior');
const cand = []; const push = (src, to, x, y, remake) => { if (!to || !MAP_DEFS[to] || typeof x !== 'number' || typeof y !== 'number') return; cand.push({ src, to, x, y, remake }); };
for (const [id, d] of Object.entries(MAP_DEFS)) { if (Array.isArray(d.warps)) d.warps.forEach((p) => p && push('warp:' + id, p.to, p.tx, p.ty, true)); if (Array.isArray(d.events)) d.events.forEach((e) => e && e.to && push('event:' + id, e.to, e.tx, e.ty, true)); }
(w.WORLD_LOCATIONS || []).forEach((L) => L && push('location:' + L.id, L.to, L.tx, L.ty, true));
const files = []; const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.js$/.test(f)) files.push(p); } }; walk(path.join(DIR, 'js'));
let textN = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8'); const rel = path.relative(DIR, f);
  for (const m of src.matchAll(/enterMap\('([a-z0-9_]+)',\s*(\d+),\s*(\d+)/g)) { push('enterMap:' + rel, m[1], +m[2], +m[3], true); textN++; }
  if (/js[\\/]data[\\/]/.test(rel)) {
    for (const m of src.matchAll(/\{[^{}]*?\bto:\s*'([a-z0-9_]+)'[^{}]*?\btx:\s*(\d+)[^{}]*?\bty:\s*(\d+)[^{}]*\}/g)) { push('data:' + rel, m[1], +m[2], +m[3], true); textN++; }
    for (const m of src.matchAll(/\{[^{}]*?\bid:\s*'([a-z0-9_]+)'[^{}]*?\barrive:\s*\[(\d+),\s*(\d+)\][^{}]*\}/g)) { push('arrive:' + rel, m[1], +m[2], +m[3], false); textN++; }
  }
}
console.log('着く所の候補 ' + cand.length + '（ソースの文字列から ' + textN + '）');
const cache = {}; const maps = (id) => { if (cache[id]) return cache[id]; EnvLayout.enabled = false; const a = new GameMap(MAP_DEFS[id]); EnvLayout.enabled = true; const b = new GameMap(MAP_DEFS[id]); return (cache[id] = { a, b }); };
const bad = []; let checked = 0, changedMaps = new Set();
for (const c of cand) {
  const k = MAP_DEFS[c.to].kind; if (k !== 'town' && k !== 'dungeon') continue;
  let x = c.x, y = c.y; if (c.remake && MapRemake && MapRemake.pos) { const p = MapRemake.pos(c.to, x, y); if (p) { x = p.x; y = p.y; } }
  let mm; try { mm = maps(c.to); } catch (e) { continue; }
  if (!mm.b.envLayout || !mm.b.envLayout.changed || !mm.b.envLayout.changed.length) continue; changedMaps.add(c.to); checked++;
  if (x < 0 || y < 0 || x >= mm.a.w || y >= mm.a.h) continue;
  if (mm.a.passable(x, y, State.data) && !mm.b.passable(x, y, State.data)) bad.push(c.to + '@' + x + ',' + y + '（' + c.src + '・' + mm.b.tile(x, y) + '）');
}
console.log('作り直したマップへの着く所 ' + checked + '（マップ ' + changedMaps.size + '）');
ok(!bad.length, '作り直しで塞がった着く所 ' + bad.length + (bad.length ? '：' + bad.slice(0, 8).join(' / ') : ''));
ok(!errors.length, 'ページのエラーなし ' + JSON.stringify(errors.slice(0, 3)));
console.log('結果：' + (fails.length ? fails.length + ' NG' : 'すべて OK')); process.exit(fails.length ? 1 : 0);
