// v7.6 環境リデザイン：論理（2D版と3D版が共通で使うタイル・ワープ・NPC・宝箱・イベント・建物）のスナップショットと比較
//   使い方：RPG_DIR=<リポジトリ>/ node logic_snapshot.js <出力.json>            … スナップショットを書く（jsdom でゲームのデータを読む）
//           node logic_snapshot.js --diff <前.json> <後.json>                    … 比べる（タイルが変わったマス・ワープの行き先の変化・未登録のプロファイル）
//   ・タイルは1マスずつ比べる（js/data/env76.js の書き換えだけが出るはず）。ワープ・NPC・宝箱・イベント・建物の位置は全マップで同じであること
//   ・プロファイル（three-src/public/environment-v1/data/profiles.json）に、ゲームの全マップIDがあること（未登録のIDの検出）
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const args = process.argv.slice(2);
if (args[0] === '--diff') {
  const A = JSON.parse(fs.readFileSync(args[1], 'utf8')), B = JSON.parse(fs.readFileSync(args[2], 'utf8'));
  const ids = new Set([...Object.keys(A.maps), ...Object.keys(B.maps)]); const out = { added: [], removed: [], tiles: {}, anchors: [], graph: [] };
  for (const id of ids) {
    const a = A.maps[id], b = B.maps[id]; if (!a) { out.added.push(id); continue; } if (!b) { out.removed.push(id); continue; }
    if (a.rowsHash !== b.rowsHash) { const d = []; for (let y = 0; y < Math.max(a.rows.length, b.rows.length); y++) for (let x = 0; x < Math.max((a.rows[y] || '').length, (b.rows[y] || '').length); x++) { const ca = (a.rows[y] || '')[x], cb = (b.rows[y] || '')[x]; if (ca !== cb) d.push(`${x},${y} ${ca}→${cb}`); } out.tiles[id] = d; }
    for (const k of ['warps', 'npcs', 'chests', 'events', 'buildings']) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.anchors.push(id + '：' + k);
  }
  const g = (S) => Object.entries(S.maps).flatMap(([id, m]) => m.warps.map((w) => id + '→' + w[2])).sort().join('\n'); if (g(A) !== g(B)) out.graph.push('ワープのつながりが違う');
  out.profilesMissing = B.profilesMissing; out.profilesExtra = (B.profilesExtra || []).length;
  console.log(JSON.stringify(out, null, 1));
  const tileMaps = Object.keys(out.tiles); console.log(`結果：マップ ${ids.size}・タイルが変わったマップ ${tileMaps.length}（${tileMaps.join(', ')}）・ワープ等の位置の変化 ${out.anchors.length}・ワープのつながり ${out.graph.length ? '違う' : '同じ'}・プロファイル未登録 ${B.profilesMissing.length}`);
  process.exit(out.anchors.length || out.graph.length || out.removed.length || out.added.length || B.profilesMissing.length ? 1 : 0);
}
const ROOT = (process.env.RPG_DIR || '/home/claude/mochipoyo-trade-quest/').replace(/\/?$/, '/');
const load = require(process.env.RPGLOAD || '/home/claude/work/rpgload.js'); const { w } = load();
const D = w.MAP_DEFS; const maps = {};
for (const id of Object.keys(D).sort()) {
  const d = D[id]; const rows = Array.isArray(d.rows) ? d.rows.slice() : [];
  maps[id] = { kind: d.kind || (d.encounters ? 'field' : '?'), w: (rows[0] || '').length, h: rows.length, rowsHash: crypto.createHash('sha1').update(rows.join('\n')).digest('hex').slice(0, 16), rows,
    warps: (d.warps || []).map((q) => [q.x, q.y, q.to, q.tx, q.ty]), npcs: (d.npcs || []).map((n) => [n.id, n.x, n.y]), chests: (d.chests || []).map((c) => [c.id, c.x, c.y]),
    events: (d.events || []).map((e) => [e.type, e.x, e.y, !!e.solid]), buildings: (d.buildings || []).map((b) => [b.id, b.type, b.x, b.y, b.w, b.h, b.doorX, b.interior || null, b.showIf || null]) };
}
let profilesMissing = [], profilesExtra = [];
try { const P = JSON.parse(fs.readFileSync(ROOT + 'three-src/public/environment-v1/data/profiles.json', 'utf8')).profiles; profilesMissing = Object.keys(D).filter((id) => !P[id]); profilesExtra = Object.keys(P).filter((id) => !D[id]); } catch (e) { profilesMissing = ['（profiles.json を読めない：' + e.message + '）']; }
fs.writeFileSync(args[0] || 'logic_snapshot.json', JSON.stringify({ root: ROOT, env76: w.ENV76 || null, count: Object.keys(maps).length, profilesMissing, profilesExtra, maps }));
console.log('書き出し：' + Object.keys(maps).length + 'マップ' + (w.ENV76 ? '・ENV76 ' + JSON.stringify(w.ENV76.applied) + ' 書き換えなし ' + w.ENV76.skipped.length : '・ENV76 なし') + '・プロファイル未登録 ' + profilesMissing.length);
